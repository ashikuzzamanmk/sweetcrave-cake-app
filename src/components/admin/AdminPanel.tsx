import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Lock,
  CakeSlice,
  Image as ImageIcon,
  Truck,
  Plus,
  Trash2,
  Edit3,
  Star,
  Check,
  RotateCcw,
  Sparkles,
  Save,
  Copy,
  RefreshCw,
  ShieldCheck,
  LayoutGrid,
  Tag,
  Eye,
  EyeOff,
  LogOut,
  ShoppingBag,
  FolderKanban,
  BarChart3,
  AlertTriangle,
  Search,
  Mail,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  CakeItem,
  DEFAULT_JOURNEY_STEPS,
  CAKES_DATA,
} from '../../data/cakesData';
import {
  SiteContent,
  PromoOfferItem,
  HomeFoodSection,
} from '../../config/siteContent';
import {
  supabase,
  DatabaseOrder,
  fetchAdminOrders,
  subscribeToAdminOrdersRealtime,
} from '../../lib/supabase';
import { normalizeImageUrl } from '../../utils/cacheEngine';
import {
  AdminSessionInfo,
  verifyCurrentAdminSession,
  signInAdminWithSupabase,
  signOutAdmin,
} from '../../utils/adminSecurity';
import { ImageResizerStudio } from './ImageResizerStudio';
import { FoodThemeBuilder } from './FoodThemeBuilder';
import { IngredientManager } from './IngredientManager';
import { StorageImageUploader } from './StorageImageUploader';
import { OptionGroupBuilder } from './OptionGroupBuilder';
import { AdminOverview } from './AdminOverview';
import { AdminOrders } from './AdminOrders';
import { AdminCategories } from './AdminCategories';

export interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerToast: (msg: string) => void;
}

type AdminTab =
  | 'overview'
  | 'orders'
  | 'cakes'
  | 'categories'
  | 'home'
  | 'images'
  | 'settings';

type ProductEditorSection =
  | 'basic'
  | 'images'
  | 'pricing'
  | 'details'
  | 'options'
  | 'theme';

const DIETARY_PRESET_TAGS = [
  '100% Halal',
  'Freshly Baked',
  'No Preservatives',
  'Zero Added Sugar',
  'Eggless Option',
  'Real Fruit Puree',
  'Gift Ready',
];

const BADGE_PRESETS = [
  'Bestseller',
  "Chef's Pick",
  'Signature 5.0★',
  'New Arrival',
  'Guilt-Free',
  'Trending',
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  onTriggerToast,
}) => {
  const {
    siteContent,
    updateSiteContent,
    cakes,
    categories,
    isLiveConnected,
    upsertCake,
    duplicateCake,
    deleteCake,
    upsertCategory,
    deleteCategory,
    publishAllToServer,
    refreshFromServer,
    previousIngredients,
    recordIngredientInHistory,
    resetToFactoryDefaults,
  } = useStore();

  // Supabase Auth Session State
  const [adminSession, setAdminSession] = useState<AdminSessionInfo | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Navigation & Orders State
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<DatabaseOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<DatabaseOrder | null>(null);

  // Product Management State
  const [productSearch, setProductSearch] = useState<string>('');
  const [editingCake, setEditingCake] = useState<CakeItem | null>(null);
  const [editorSection, setEditorSection] = useState<ProductEditorSection>('basic');
  const [isSavingCake, setIsSavingCake] = useState<boolean>(false);
  const [confirmDeleteCake, setConfirmDeleteCake] = useState<CakeItem | null>(null);

  // Draft Site Content State
  const [draftContent, setDraftContent] = useState<SiteContent>(siteContent);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // New Offer Draft State
  const [newOfferBadge, setNewOfferBadge] = useState<string>('Flash Offer');
  const [newOfferTitle, setNewOfferTitle] = useState<string>('');
  const [newOfferSubtitle, setNewOfferSubtitle] = useState<string>('');
  const [newOfferCode, setNewOfferCode] = useState<string>('');
  const [newOfferDiscount, setNewOfferDiscount] = useState<number>(20);
  const [newOfferCta, setNewOfferCta] = useState<string>('Claim Offer');
  const [newOfferImg, setNewOfferImg] = useState<string>(
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80'
  );

  // New Home Section Draft State
  const [newSectionTitle, setNewSectionTitle] = useState<string>('');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState<string>('');
  const [newSectionCakeIds, setNewSectionCakeIds] = useState<string[]>([]);

  useEffect(() => {
    setDraftContent(siteContent);
  }, [siteContent]);

  // Verify Supabase Admin Session on Open & Listen to Auth State Changes
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsCheckingSession(true);
    verifyCurrentAdminSession()
      .then((session) => {
        if (active) setAdminSession(session);
      })
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });

    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAdminSession(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isOpen]);

  const loadOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    setOrdersError(null);
    try {
      const res = await fetchAdminOrders();
      if (res.ok) {
        setOrders(res.orders);
      } else {
        setOrdersError(res.error || 'Could not load orders from Supabase.');
      }
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  // Load Orders + Subscribe to Supabase Realtime when authenticated
  useEffect(() => {
    if (!isOpen || !adminSession) return;
    void loadOrders();
    const unsub = subscribeToAdminOrdersRealtime(() => {
      void loadOrders();
    });
    return unsub;
  }, [isOpen, adminSession, loadOrders]);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSigningIn) return;
    setAuthError('');
    setIsSigningIn(true);
    try {
      const res = await signInAdminWithSupabase(emailInput, passwordInput);
      if (res.ok && res.session) {
        setAdminSession(res.session);
        setPasswordInput('');
        setAuthError('');
        onTriggerToast(`Signed in as ${res.session.email} ✓`);
      } else {
        setAuthError(res.error || 'Authentication failed.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOutAdmin();
    setAdminSession(null);
    setOrders([]);
    setSelectedOrder(null);
    onTriggerToast('Signed out of Admin Dashboard');
  };

  const handleRefreshAll = async () => {
    await Promise.all([refreshFromServer(), loadOrders()]);
    onTriggerToast('Synced live data from Supabase ✓');
  };

  const handlePublishCatalog = async () => {
    const res = await publishAllToServer();
    if (res.ok) {
      onTriggerToast('Full catalog, categories & settings published to Supabase ✓');
    } else {
      onTriggerToast(res.error || 'Sync failed — check admin permissions');
    }
  };

  const handleCreateNewCake = () => {
    const template = CAKES_DATA[0];
    const defaultCategory =
      categories.find((c) => c.slug !== 'all' && c.name !== 'সব কেক')?.name ||
      'Birthday Cake';
    const newCake: CakeItem = {
      ...template,
      id: `cake-${Date.now()}`,
      slug: `cake-${Date.now()}`,
      name: 'New Special Cake',
      heroTitleLines: ['New Special', 'Cake'],
      category: defaultCategory,
      badge: 'New Arrival',
      tags: ['fresh', 'celebration'],
      shortDescription:
        'Fresh Sponge ও Premium Whipped Cream-এ তৈরি Special Celebration Cake।',
      fullDescription:
        'আমাদের Patisserie Chef-এর বিশেষ Recipe-তে তৈরি নরম Sponge, Fresh Cream ও আকর্ষণীয় Garnish।',
      ingredientsStory:
        'Crafted with farm-fresh whipping cream, organic Madagascar vanilla sponge, and seasonal hand-selected toppings — baked fresh for every order.',
      chefNote:
        'আপনার স্পেশাল সেলিব্রেশনের জন্য হাতে Finish করা — প্রতিটি স্লাইস একদম তাজা ও নরম।',
      servings: '4–6 জন (6 Slices)',
      sweetnessLevel: 3,
      textureProfile: 'Cloud-Soft & Velvety',
      dietaryTags: ['100% Halal', 'Freshly Baked', 'No Preservatives'],
      allergens: 'Dairy, Eggs, Wheat',
      storageTip: 'ফ্রিজে (4°C) রাখুন এবং কাটার 15 মিনিট আগে বের করে পরিবেশন করুন।',
      basePrice: 850,
      originalPrice: 1050,
      rating: 4.9,
      reviewsCount: 1,
      prepMins: 35,
      prepTime: '35 mins prep',
      weight: '0.5 kg',
      calories: '290 kcal',
      isHeroFlavor: false,
      isVisible: true,
      isAvailable: true,
      isFeatured: false,
      displayPriority: cakes.length,
      deliveryAvailable: true,
      pickupAvailable: true,
      allowCustomMessage: true,
      maxOrderQty: 10,
      galleryImages: [],
      optionGroups: [],
      steps: DEFAULT_JOURNEY_STEPS,
    };
    setEditorSection('basic');
    setEditingCake(newCake);
  };

  const handleSaveCake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCake || isSavingCake) return;
    setIsSavingCake(true);
    try {
      const res = await upsertCake(editingCake);
      if (res.ok) {
        onTriggerToast(`"${editingCake.name}" saved & LIVE for all users ✓`);
        setEditingCake(null);
      } else {
        onTriggerToast(res.error || 'Failed to save product to Supabase');
      }
    } finally {
      setIsSavingCake(false);
    }
  };

  const handleQuickToggleCake = async (
    cake: CakeItem,
    patch: Partial<CakeItem>,
    label: string
  ) => {
    const res = await upsertCake({ ...cake, ...patch });
    if (res.ok) {
      onTriggerToast(`"${cake.name}" ${label} ✓`);
    } else {
      onTriggerToast(res.error || 'Update failed');
    }
  };

  const handleConfirmDeleteCake = async () => {
    if (!confirmDeleteCake) return;
    const target = confirmDeleteCake;
    setConfirmDeleteCake(null);
    const res = await deleteCake(target.id);
    if (res.ok) {
      onTriggerToast(`Deleted "${target.name}" permanently ✓`);
    } else {
      onTriggerToast(res.error || 'Could not delete product');
    }
  };

  const toggleDietaryTag = (tag: string) => {
    if (!editingCake) return;
    const current = editingCake.dietaryTags || [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    setEditingCake({ ...editingCake, dietaryTags: next });
  };

  const handleSaveSiteContent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await updateSiteContent(draftContent);
      if (res.ok) {
        onTriggerToast('Store settings & content saved live ✓');
      } else {
        onTriggerToast(res.error || 'Could not save settings');
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddOffer = async () => {
    if (!newOfferTitle.trim() || !newOfferCode.trim()) return;
    const nextOffer: PromoOfferItem = {
      id: `offer-${Date.now()}`,
      badge: newOfferBadge.trim() || 'Special Offer',
      title: newOfferTitle.trim(),
      subtitle: newOfferSubtitle.trim(),
      description: newOfferSubtitle.trim() || newOfferTitle.trim(),
      promoCode: newOfferCode.trim().toUpperCase(),
      discountPercent: Math.max(1, Math.min(90, newOfferDiscount)),
      ctaText: newOfferCta.trim() || 'Claim Offer',
      imageUrl: normalizeImageUrl(newOfferImg),
      isActive: true,
    };
    const updatedOffers = [...(draftContent.offers || []), nextOffer];
    const nextDraft = { ...draftContent, offers: updatedOffers };
    setDraftContent(nextDraft);
    const res = await updateSiteContent({ offers: updatedOffers });
    if (res.ok) {
      setNewOfferTitle('');
      setNewOfferSubtitle('');
      setNewOfferCode('');
      onTriggerToast(`Offer "${nextOffer.promoCode}" published ✓`);
    } else {
      onTriggerToast(res.error || 'Failed to publish offer');
    }
  };

  const handleDeleteOffer = async (id: string) => {
    const updatedOffers = (draftContent.offers || []).filter((o) => o.id !== id);
    setDraftContent({ ...draftContent, offers: updatedOffers });
    const res = await updateSiteContent({ offers: updatedOffers });
    if (res.ok) onTriggerToast('Offer removed ✓');
  };

  const handleAddHomeSection = async () => {
    if (!newSectionTitle.trim() || newSectionCakeIds.length === 0) return;
    const nextSection: HomeFoodSection = {
      id: `sec-${Date.now()}`,
      title: newSectionTitle.trim(),
      subtitle: newSectionSubtitle.trim(),
      cakeIds: newSectionCakeIds,
      isVisible: true,
    };
    const updatedSections = [...(draftContent.homeSections || []), nextSection];
    setDraftContent({ ...draftContent, homeSections: updatedSections });
    const res = await updateSiteContent({ homeSections: updatedSections });
    if (res.ok) {
      setNewSectionTitle('');
      setNewSectionSubtitle('');
      setNewSectionCakeIds([]);
      onTriggerToast(`Section "${nextSection.title}" added ✓`);
    } else {
      onTriggerToast(res.error || 'Failed to save section');
    }
  };

  const handleDeleteHomeSection = async (id: string) => {
    const updatedSections = (draftContent.homeSections || []).filter(
      (s) => s.id !== id
    );
    setDraftContent({ ...draftContent, homeSections: updatedSections });
    const res = await updateSiteContent({ homeSections: updatedSections });
    if (res.ok) onTriggerToast('Homepage section deleted ✓');
  };

  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;

  const filteredProducts = cakes.filter((c) => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const categoryChoices = Array.from(
    new Set([
      ...categories.filter((c) => c.slug !== 'all').map((c) => c.name),
      ...siteContent.categories.filter((c) => c !== 'সব কেক'),
      'Birthday Cake',
      'Chocolate',
      'Fruit Cake',
      'Sugar-Free',
      'Cupcake & Box',
    ])
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/60 backdrop-blur-md p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-[1040px] max-h-[94dvh] bg-[#FAF6F0] rounded-[28px] shadow-2xl border border-white/80 flex flex-col overflow-hidden"
        >
          {/* AUTHENTICATION GATE ("The MK" via Supabase Auth) */}
          {isCheckingSession ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-stone-600">
              <Loader2 className="w-7 h-7 animate-spin text-stone-900" />
              <p className="text-xs font-extrabold">Verifying Admin Session...</p>
            </div>
          ) : !adminSession ? (
            <div className="p-6 sm:p-10 max-w-md w-full mx-auto space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-full bg-stone-900 text-amber-300 flex items-center justify-center shadow-md">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-extrabold text-stone-900 leading-tight">
                      the MK Admin
                    </h2>
                    <p className="text-[11px] font-semibold text-stone-500">
                      Authorized Store Administrators Only
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close Admin Login"
                  className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={handleSignInSubmit}
                className="bg-white rounded-[24px] p-5 border border-stone-200/80 shadow-sm space-y-3.5"
              >
                <div>
                  <label className="text-[11px] font-extrabold text-stone-600 block mb-1">
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoComplete="username"
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        if (authError) setAuthError('');
                      }}
                      placeholder="admin@eshucakes.com"
                      className="w-full rounded-2xl bg-[#FAF6F0] border border-stone-200 pl-10 pr-3.5 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-stone-600 block mb-1">
                    Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        if (authError) setAuthError('');
                      }}
                      placeholder="Enter your Supabase Admin password"
                      className="w-full rounded-2xl bg-[#FAF6F0] border border-stone-200 pl-10 pr-10 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {authError && (
                  <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSigningIn}
                  className="w-full rounded-full bg-stone-900 hover:bg-stone-800 text-white py-3 px-5 text-xs font-extrabold flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isSigningIn ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                  )}
                  <span>
                    {isSigningIn ? 'Authenticating...' : 'Sign In to Admin Dashboard'}
                  </span>
                </button>
              </form>

              <p className="text-[11px] text-center text-stone-500">
                Protected by Supabase Auth &amp; Server-Side Row Level Security (`admin_roles`).
              </p>
            </div>
          ) : (
            /* AUTHENTICATED PRODUCTION ADMIN DASHBOARD */
            <>
              {/* Top Header */}
              <div className="px-4 sm:px-6 py-3 bg-white border-b border-stone-200/80 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-full bg-stone-900 text-amber-300 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-sm sm:text-base font-extrabold text-stone-900 truncate">
                      {siteContent.brandName} — Admin Dashboard
                    </h2>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-stone-500 truncate">
                      {adminSession.email} •{' '}
                      <span className="uppercase text-emerald-700 font-extrabold">
                        {adminSession.role}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    title="Sign Out"
                    className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 px-3 py-1.5 text-xs font-bold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close Admin Panel"
                    className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Structured Module Navigation Bar */}
              <div className="px-4 sm:px-6 py-2 bg-white/80 border-b border-stone-200/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {(
                  [
                    { id: 'overview', label: 'Overview', icon: BarChart3 },
                    {
                      id: 'orders',
                      label: 'Orders',
                      icon: ShoppingBag,
                      badge: pendingOrdersCount,
                    },
                    {
                      id: 'cakes',
                      label: `Products (${cakes.length})`,
                      icon: CakeSlice,
                    },
                    {
                      id: 'categories',
                      label: 'Categories',
                      icon: FolderKanban,
                    },
                    { id: 'home', label: 'Homepage & Offers', icon: LayoutGrid },
                    { id: 'images', label: 'Image Studio', icon: ImageIcon },
                    { id: 'settings', label: 'Settings', icon: Truck },
                  ] as Array<{
                    id: AdminTab;
                    label: string;
                    icon: React.FC<{ className?: string }>;
                    badge?: number;
                  }>
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setEditingCake(null);
                      }}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-extrabold transition-all cursor-pointer ${
                        active
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'bg-[#FAF6F0] text-stone-700 hover:bg-stone-200/70'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      {typeof tab.badge === 'number' && tab.badge > 0 && (
                        <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.5 text-[10px] font-black leading-none">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Main Scrollable Module Body */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                {/* 1. OVERVIEW */}
                {activeTab === 'overview' && (
                  <AdminOverview
                    orders={orders}
                    cakes={cakes}
                    currency={siteContent.currency}
                    isLiveConnected={isLiveConnected}
                    isLoadingOrders={isLoadingOrders}
                    onRefreshAll={handleRefreshAll}
                    onPublishCatalog={handlePublishCatalog}
                    onOpenOrder={(order) => {
                      setSelectedOrder(order);
                      setActiveTab('orders');
                    }}
                    onNavigateTab={(t) => setActiveTab(t)}
                  />
                )}

                {/* 2. ORDERS CRM */}
                {activeTab === 'orders' && (
                  <AdminOrders
                    orders={orders}
                    currency={siteContent.currency}
                    isLoading={isLoadingOrders}
                    error={ordersError}
                    selectedOrder={selectedOrder}
                    onSelectOrder={setSelectedOrder}
                    onOrderUpdated={(updated) =>
                      setOrders((prev) =>
                        prev.map((o) => (o.id === updated.id ? updated : o))
                      )
                    }
                    onRefresh={loadOrders}
                    onTriggerToast={onTriggerToast}
                  />
                )}

                {/* 3. PRODUCTS CRUD */}
                {activeTab === 'cakes' && (
                  <>
                    {editingCake ? (
                      <form onSubmit={handleSaveCake} className="space-y-4">
                        {/* Editor Header */}
                        <div className="bg-white rounded-2xl p-3.5 border border-stone-200 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="font-display text-sm font-extrabold text-stone-900">
                              {cakes.some((c) => c.id === editingCake.id)
                                ? `Editing: ${editingCake.name}`
                                : 'Add New Product'}
                            </h3>
                            <p className="text-[11px] text-stone-500">
                              Changes publish immediately to Supabase Realtime.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingCake(null)}
                              className="rounded-full bg-stone-100 hover:bg-stone-200 px-3.5 py-2 text-xs font-bold text-stone-700 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingCake}
                              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 text-xs font-extrabold cursor-pointer disabled:opacity-60"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>
                                {isSavingCake ? 'Saving...' : 'Save & Publish Live'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Product Editor Sub-Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                          {(
                            [
                              { id: 'basic', label: '1. Basic Info' },
                              { id: 'images', label: '2. Images & Gallery' },
                              { id: 'pricing', label: '3. Pricing & Availability' },
                              { id: 'details', label: '4. Ingredients & Allergens' },
                              {
                                id: 'options',
                                label: `5. Custom Options (${(editingCake.optionGroups || []).length})`,
                              },
                              { id: 'theme', label: '6. Theme Colors' },
                            ] as Array<{ id: ProductEditorSection; label: string }>
                          ).map((sec) => (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => setEditorSection(sec.id)}
                              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold border cursor-pointer ${
                                editorSection === sec.id
                                  ? 'bg-stone-900 text-white border-stone-900'
                                  : 'bg-white text-stone-700 border-stone-200'
                              }`}
                            >
                              {sec.label}
                            </button>
                          ))}
                        </div>

                        {/* Section 1: Basic Info */}
                        {editorSection === 'basic' && (
                          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                  Product Name *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={editingCake.name}
                                  onChange={(e) => {
                                    const words = e.target.value.trim().split(/\s+/).filter(Boolean);
                                    const line1 = words.slice(0, Math.max(1, Math.ceil(words.length / 2))).join(' ') || e.target.value;
                                    const line2 = words.slice(Math.max(1, Math.ceil(words.length / 2))).join(' ') || '';
                                    setEditingCake({
                                      ...editingCake,
                                      name: e.target.value,
                                      heroTitleLines: [line1, line2],
                                    });
                                  }}
                                  className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                  Category
                                </label>
                                <select
                                  value={editingCake.category}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      category: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                                >
                                  {categoryChoices.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                  Badge Label
                                </label>
                                <input
                                  type="text"
                                  value={editingCake.badge}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      badge: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                                />
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {BADGE_PRESETS.map((b) => (
                                    <button
                                      key={b}
                                      type="button"
                                      onClick={() =>
                                        setEditingCake({ ...editingCake, badge: b })
                                      }
                                      className="rounded-full bg-stone-100 hover:bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-700 cursor-pointer"
                                    >
                                      {b}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                  Product Tags (comma-separated)
                                </label>
                                <input
                                  type="text"
                                  value={(editingCake.tags || []).join(', ')}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      tags: e.target.value
                                        .split(',')
                                        .map((t) => t.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                  placeholder="chocolate, birthday, truffle"
                                  className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                Short Description
                              </label>
                              <textarea
                                rows={2}
                                value={editingCake.shortDescription}
                                onChange={(e) =>
                                  setEditingCake({
                                    ...editingCake,
                                    shortDescription: e.target.value,
                                  })
                                }
                                className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                Full Product Description
                              </label>
                              <textarea
                                rows={3}
                                value={editingCake.fullDescription}
                                onChange={(e) =>
                                  setEditingCake({
                                    ...editingCake,
                                    fullDescription: e.target.value,
                                  })
                                }
                                className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                Chef Note
                              </label>
                              <input
                                type="text"
                                value={editingCake.chefNote}
                                onChange={(e) =>
                                  setEditingCake({
                                    ...editingCake,
                                    chefNote: e.target.value,
                                  })
                                }
                                className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                              />
                            </div>
                          </div>
                        )}

                        {/* Section 2: Images & Multi-Image Gallery */}
                        {editorSection === 'images' && (
                          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-4">
                            <StorageImageUploader
                              label="Primary Product Image (Supabase Storage or Public / Google Drive Link)"
                              value={editingCake.image_url}
                              onChange={(url) =>
                                setEditingCake({ ...editingCake, image_url: url })
                              }
                              folder="products"
                              onNotify={onTriggerToast}
                            />

                            <div className="pt-3 border-t border-stone-100 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-xs font-extrabold text-stone-900">
                                    Additional Gallery Images ({(editingCake.galleryImages || []).length})
                                  </h4>
                                  <p className="text-[11px] text-stone-500">
                                    Customers can swipe or tap thumbnails on the product detail view.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingCake({
                                      ...editingCake,
                                      galleryImages: [
                                        ...(editingCake.galleryImages || []),
                                        '',
                                      ],
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-full bg-stone-900 text-white px-3 py-1.5 text-[11px] font-extrabold cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add Gallery Image</span>
                                </button>
                              </div>

                              {(editingCake.galleryImages || []).map((gUrl, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-2xl bg-[#FAF6F0] border border-stone-200/70 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-extrabold text-stone-700">
                                      Gallery Image #{idx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingCake({
                                          ...editingCake,
                                          galleryImages: (
                                            editingCake.galleryImages || []
                                          ).filter((_, i) => i !== idx),
                                        })
                                      }
                                      className="text-rose-600 text-[11px] font-bold hover:underline cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <StorageImageUploader
                                    label=""
                                    value={gUrl}
                                    onChange={(nextUrl) => {
                                      const arr = [...(editingCake.galleryImages || [])];
                                      arr[idx] = nextUrl;
                                      setEditingCake({
                                        ...editingCake,
                                        galleryImages: arr,
                                      });
                                    }}
                                    folder="products"
                                    compact
                                    showInspector={false}
                                    onNotify={onTriggerToast}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Section 3: Pricing, Lead Time & Availability */}
                        {editorSection === 'pricing' && (
                          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                  Sale Price ({siteContent.currency}) *
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  required
                                  value={editingCake.basePrice}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      basePrice: Math.max(0, Number(e.target.value) || 0),
                                    })
                                  }
                                  className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold text-stone-900 tabular-nums"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                  Original Price (Promo Strike)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={editingCake.originalPrice || ''}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      originalPrice: e.target.value
                                        ? Number(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  placeholder="Optional"
                                  className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-800 tabular-nums"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                  Default Weight
                                </label>
                                <input
                                  type="text"
                                  value={editingCake.weight}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      weight: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., 1 lb / 0.5 kg"
                                  className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-800"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                  Prep / Lead Time
                                </label>
                                <input
                                  type="text"
                                  value={editingCake.prepTime}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      prepTime: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., 45 mins / 4 hrs"
                                  className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-800"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                  Servings
                                </label>
                                <input
                                  type="text"
                                  value={editingCake.servings}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      servings: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                  Max Order Qty
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={editingCake.maxOrderQty ?? 10}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      maxOrderQty: Math.max(1, Number(e.target.value) || 1),
                                    })
                                  }
                                  className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                  Stock Limit (blank = ∞)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={editingCake.stockLimit ?? ''}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      stockLimit:
                                        e.target.value === ''
                                          ? null
                                          : Math.max(0, Number(e.target.value)),
                                    })
                                  }
                                  placeholder="Unlimited"
                                  className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                  Display Priority
                                </label>
                                <input
                                  type="number"
                                  value={editingCake.displayPriority ?? 10}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      displayPriority: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                                />
                              </div>
                            </div>

                            {/* Availability & Display Flags */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-stone-100 text-xs">
                              {[
                                { key: 'isVisible', label: 'Visible on Storefront' },
                                { key: 'isAvailable', label: 'Available to Order' },
                                { key: 'isFeatured', label: 'Featured Product' },
                                { key: 'isHeroFlavor', label: 'Show in Hero Carousel' },
                                { key: 'deliveryAvailable', label: 'Delivery Available' },
                                { key: 'pickupAvailable', label: 'Pickup Available' },
                                {
                                  key: 'allowCustomMessage',
                                  label: 'Allow Cake Message',
                                },
                              ].map((flag) => (
                                <label
                                  key={flag.key}
                                  className="flex items-center gap-2 bg-[#FAF6F0] border border-stone-200/70 rounded-xl px-3 py-2 font-bold text-stone-800 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      (editingCake[flag.key as keyof CakeItem] as
                                        | boolean
                                        | undefined) !== false
                                    }
                                    onChange={(e) =>
                                      setEditingCake({
                                        ...editingCake,
                                        [flag.key]: e.target.checked,
                                      })
                                    }
                                    className="accent-stone-900"
                                  />
                                  <span>{flag.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Section 4: Ingredients & Allergens */}
                        {editorSection === 'details' && (
                          <div className="space-y-4">
                            <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-3">
                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                  Ingredients & Crafting Story
                                </label>
                                <textarea
                                  rows={3}
                                  value={editingCake.ingredientsStory}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      ingredientsStory: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                    Allergen Information
                                  </label>
                                  <input
                                    type="text"
                                    value={editingCake.allergens}
                                    onChange={(e) =>
                                      setEditingCake({
                                        ...editingCake,
                                        allergens: e.target.value,
                                      })
                                    }
                                    placeholder="Dairy, Eggs, Wheat, Nuts"
                                    className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                    Texture Profile
                                  </label>
                                  <input
                                    type="text"
                                    value={editingCake.textureProfile}
                                    onChange={(e) =>
                                      setEditingCake({
                                        ...editingCake,
                                        textureProfile: e.target.value,
                                      })
                                    }
                                    className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-stone-600 block mb-1">
                                    Storage / Serving Tip
                                  </label>
                                  <input
                                    type="text"
                                    value={editingCake.storageTip}
                                    onChange={(e) =>
                                      setEditingCake({
                                        ...editingCake,
                                        storageTip: e.target.value,
                                      })
                                    }
                                    className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                                  />
                                </div>
                              </div>

                              <div>
                                <span className="text-[11px] font-bold text-stone-600 block mb-1.5">
                                  Dietary & Quality Badges
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {DIETARY_PRESET_TAGS.map((tag) => {
                                    const active = (
                                      editingCake.dietaryTags || []
                                    ).includes(tag);
                                    return (
                                      <button
                                        key={tag}
                                        type="button"
                                        onClick={() => toggleDietaryTag(tag)}
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border cursor-pointer ${
                                          active
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-[#FAF6F0] text-stone-700 border-stone-200'
                                        }`}
                                      >
                                        {active && <Check className="w-3 h-3" />}
                                        <span>{tag}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-stone-200/80">
                              <IngredientManager
                                options={editingCake.customizerOptions}
                                previousIngredients={previousIngredients}
                                darkBtnColor={editingCake.theme.darkBtn}
                                onChange={(nextOpts) =>
                                  setEditingCake({
                                    ...editingCake,
                                    customizerOptions: nextOpts,
                                  })
                                }
                                onRecordHistory={recordIngredientInHistory}
                              />
                            </div>
                          </div>
                        )}

                        {/* Section 5: Dynamic Per-Product Option Groups */}
                        {editorSection === 'options' && (
                          <div className="bg-white rounded-2xl p-4 border border-stone-200/80">
                            <OptionGroupBuilder
                              groups={editingCake.optionGroups || []}
                              currency={siteContent.currency}
                              onChange={(nextGroups) =>
                                setEditingCake({
                                  ...editingCake,
                                  optionGroups: nextGroups,
                                })
                              }
                            />
                          </div>
                        )}

                        {/* Section 6: Chromatic Theme Colors */}
                        {editorSection === 'theme' && (
                          <div className="bg-white rounded-2xl p-4 border border-stone-200/80">
                            <FoodThemeBuilder
                              theme={editingCake.theme}
                              cakeName={editingCake.name}
                              cakePrice={editingCake.basePrice}
                              cakeImageUrl={editingCake.image_url}
                              onChange={(nextTheme) =>
                                setEditingCake({ ...editingCake, theme: nextTheme })
                              }
                            />
                          </div>
                        )}
                      </form>
                    ) : (
                      /* PRODUCTS LIST */
                      <div className="space-y-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              placeholder="Search products by name, category, tag..."
                              className="w-full rounded-full bg-white border border-stone-200 pl-9 pr-4 py-2 text-xs font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleCreateNewCake}
                            className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 text-xs font-extrabold cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add New Product</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredProducts.map((cake) => {
                            const visible = cake.isVisible !== false;
                            const available = cake.isAvailable !== false;
                            const featured = Boolean(cake.isFeatured || cake.isHeroFlavor);
                            return (
                              <div
                                key={cake.id}
                                className={`bg-white rounded-2xl p-3.5 border shadow-2xs flex items-start gap-3 ${
                                  !visible
                                    ? 'border-stone-300 opacity-70'
                                    : 'border-stone-200/80'
                                }`}
                              >
                                <img
                                  src={normalizeImageUrl(cake.image_url)}
                                  alt={cake.name}
                                  className="w-16 h-16 rounded-2xl object-cover border border-stone-200 shrink-0"
                                />

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <h4 className="font-display text-sm font-extrabold text-stone-900 truncate">
                                        {cake.name}
                                      </h4>
                                      <p className="text-[11px] font-semibold text-stone-500 truncate">
                                        {cake.category} • {siteContent.currency}{' '}
                                        {cake.basePrice.toLocaleString('en-US')}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Quick Status Badges */}
                                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                    {!visible && (
                                      <span className="rounded-full bg-stone-200 text-stone-700 px-2 py-0.5 text-[10px] font-bold">
                                        Hidden
                                      </span>
                                    )}
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                        available
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : 'bg-rose-50 text-rose-700'
                                      }`}
                                    >
                                      {available ? 'In Stock' : 'Sold Out'}
                                    </span>
                                    {featured && (
                                      <span className="rounded-full bg-amber-50 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                                        Featured
                                      </span>
                                    )}
                                    {(cake.optionGroups || []).length > 0 && (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 text-[10px] font-bold">
                                        <SlidersHorizontal className="w-2.5 h-2.5" />
                                        {(cake.optionGroups || []).length} groups
                                      </span>
                                    )}
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditorSection('basic');
                                        setEditingCake(cake);
                                      }}
                                      className="inline-flex items-center gap-1 rounded-full bg-stone-900 text-white px-2.5 py-1 text-[10px] font-extrabold cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleQuickToggleCake(
                                          cake,
                                          { isVisible: !visible },
                                          visible ? 'hidden from store' : 'shown on store'
                                        )
                                      }
                                      title={visible ? 'Hide product' : 'Show product'}
                                      className="rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 p-1.5 cursor-pointer"
                                    >
                                      {visible ? (
                                        <Eye className="w-3.5 h-3.5" />
                                      ) : (
                                        <EyeOff className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleQuickToggleCake(
                                          cake,
                                          { isAvailable: !available },
                                          available ? 'marked Sold Out' : 'marked Available'
                                        )
                                      }
                                      className="rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-1 text-[10px] font-bold cursor-pointer"
                                    >
                                      {available ? 'Set Out' : 'Set In Stock'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleQuickToggleCake(
                                          cake,
                                          {
                                            isFeatured: !featured,
                                            isHeroFlavor: !featured,
                                          },
                                          !featured ? 'featured' : 'unfeatured'
                                        )
                                      }
                                      title="Toggle Featured"
                                      className={`rounded-full p-1.5 cursor-pointer ${
                                        featured
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-stone-100 text-stone-500'
                                      }`}
                                    >
                                      <Star className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const { result } = await duplicateCake(cake);
                                        onTriggerToast(
                                          result.ok
                                            ? `Duplicated "${cake.name}" ✓`
                                            : result.error || 'Duplicate failed'
                                        );
                                      }}
                                      title="Duplicate"
                                      className="rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 p-1.5 cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteCake(cake)}
                                      title="Delete Product"
                                      className="rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 4. CATEGORIES CRUD */}
                {activeTab === 'categories' && (
                  <AdminCategories
                    categories={categories}
                    onUpsertCategory={upsertCategory}
                    onDeleteCategory={deleteCategory}
                    onTriggerToast={onTriggerToast}
                  />
                )}

                {/* 5. HOMEPAGE & OFFERS */}
                {activeTab === 'home' && (
                  <div className="space-y-4">
                    {/* Auto-Wave Speed */}
                    <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-sm font-extrabold text-stone-900">
                          Hero Carousel Auto-Rotation Speed
                        </h3>
                        <span className="rounded-full bg-stone-900 text-white px-2.5 py-0.5 text-xs font-extrabold tabular-nums">
                          {draftContent.heroAutoRotateSeconds ?? 2}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={8}
                        step={0.5}
                        value={draftContent.heroAutoRotateSeconds ?? 2}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setDraftContent({
                            ...draftContent,
                            heroAutoRotate: val > 0,
                            heroAutoRotateSeconds: val,
                          });
                        }}
                        className="w-full accent-stone-900"
                      />
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span>0s = Paused • 2–3s recommended</span>
                        <button
                          type="button"
                          onClick={() => handleSaveSiteContent()}
                          className="rounded-full bg-stone-900 text-white px-3.5 py-1.5 text-xs font-extrabold cursor-pointer"
                        >
                          Save Speed
                        </button>
                      </div>
                    </div>

                    {/* Promotional Offers */}
                    <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-3">
                      <h3 className="font-display text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                        <Tag className="w-4 h-4" />
                        <span>Special Offers & Promo Codes ({(draftContent.offers || []).length})</span>
                      </h3>

                      <div className="space-y-2">
                        {(draftContent.offers || []).map((offer) => (
                          <div
                            key={offer.id}
                            className="flex items-center justify-between gap-3 bg-[#FAF6F0] rounded-xl p-3 border border-stone-200/70"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-stone-900 truncate">
                                {offer.title}{' '}
                                <span className="text-emerald-700">
                                  ({offer.promoCode} • {offer.discountPercent}% OFF)
                                </span>
                              </p>
                              <p className="text-[11px] text-stone-500 truncate">
                                {offer.subtitle}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteOffer(offer.id)}
                              className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={newOfferTitle}
                          onChange={(e) => setNewOfferTitle(e.target.value)}
                          placeholder="Offer Title (e.g., Weekend Cake Sale)"
                          className="rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={newOfferSubtitle}
                          onChange={(e) => setNewOfferSubtitle(e.target.value)}
                          placeholder="Short Subtitle"
                          className="rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs"
                        />
                        <input
                          type="text"
                          value={newOfferCode}
                          onChange={(e) => setNewOfferCode(e.target.value.toUpperCase())}
                          placeholder="PROMO CODE (e.g., ESHU20)"
                          className="rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold uppercase"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={1}
                            max={90}
                            value={newOfferDiscount}
                            onChange={(e) =>
                              setNewOfferDiscount(Number(e.target.value) || 10)
                            }
                            placeholder="% Off"
                            className="w-24 rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold"
                          />
                          <input
                            type="text"
                            value={newOfferBadge}
                            onChange={(e) => setNewOfferBadge(e.target.value)}
                            placeholder="Badge"
                            className="flex-1 rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <StorageImageUploader
                            label="Offer Banner Image"
                            value={newOfferImg}
                            onChange={setNewOfferImg}
                            folder="banners"
                            compact
                            showInspector={false}
                            onNotify={onTriggerToast}
                          />
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={handleAddOffer}
                            className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 text-white px-4 py-2 text-xs font-extrabold cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Publish Offer</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Homepage Curated Food Sections */}
                    <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-3">
                      <h3 className="font-display text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        <span>Homepage Curated Sections</span>
                      </h3>

                      {(draftContent.homeSections || []).map((sec) => (
                        <div
                          key={sec.id}
                          className="flex items-center justify-between gap-2 bg-[#FAF6F0] rounded-xl p-3 border border-stone-200/70"
                        >
                          <div>
                            <p className="text-xs font-extrabold text-stone-900">
                              {sec.title} ({sec.cakeIds.length} products)
                            </p>
                            <p className="text-[11px] text-stone-500">{sec.subtitle}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteHomeSection(sec.id)}
                            className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <div className="pt-2 border-t border-stone-100 space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={newSectionTitle}
                            onChange={(e) => setNewSectionTitle(e.target.value)}
                            placeholder="Section Title (e.g., Eid & Birthday Specials)"
                            className="rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold"
                          />
                          <input
                            type="text"
                            value={newSectionSubtitle}
                            onChange={(e) => setNewSectionSubtitle(e.target.value)}
                            placeholder="Section Subtitle"
                            className="rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cakes.map((c) => {
                            const picked = newSectionCakeIds.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() =>
                                  setNewSectionCakeIds((prev) =>
                                    picked
                                      ? prev.filter((id) => id !== c.id)
                                      : [...prev, c.id]
                                  )
                                }
                                className={`rounded-full px-2.5 py-1 text-[11px] font-bold border cursor-pointer ${
                                  picked
                                    ? 'bg-stone-900 text-white border-stone-900'
                                    : 'bg-[#FAF6F0] text-stone-700 border-stone-200'
                                }`}
                              >
                                {c.name}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddHomeSection}
                          className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 text-white px-4 py-2 text-xs font-extrabold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Homepage Section</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. IMAGE STUDIO */}
                {activeTab === 'images' && (
                  <ImageResizerStudio
                    onApplyUrl={(url: string) => {
                      navigator.clipboard?.writeText(url);
                      onTriggerToast('Optimized image URL copied ✓');
                    }}
                  />
                )}

                {/* 7. STORE SETTINGS */}
                {activeTab === 'settings' && (
                  <form onSubmit={handleSaveSiteContent} className="space-y-4">
                    <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-3">
                      <h3 className="font-display text-sm font-extrabold text-stone-900">
                        Store Identity, Contact & Delivery Configuration
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-stone-600 block mb-1">
                            Brand Name
                          </label>
                          <input
                            type="text"
                            value={draftContent.brandName}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                brandName: e.target.value,
                              })
                            }
                            className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-600 block mb-1">
                            Tagline
                          </label>
                          <input
                            type="text"
                            value={draftContent.tagline}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                tagline: e.target.value,
                              })
                            }
                            className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-600 block mb-1">
                            Delivery City / Areas
                          </label>
                          <input
                            type="text"
                            value={draftContent.city}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                city: e.target.value,
                              })
                            }
                            className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-600 block mb-1">
                            WhatsApp Order Phone
                          </label>
                          <input
                            type="text"
                            value={draftContent.whatsappNumber}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                whatsappNumber: e.target.value,
                              })
                            }
                            className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-600 block mb-1">
                            Store Contact Email
                          </label>
                          <input
                            type="email"
                            value={draftContent.contactEmail || ''}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                contactEmail: e.target.value,
                              })
                            }
                            className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-600 block mb-1">
                            Business Hours
                          </label>
                          <input
                            type="text"
                            value={draftContent.businessHours || ''}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                businessHours: e.target.value,
                              })
                            }
                            className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-bold text-stone-600 block mb-1">
                            Store / Pickup Address
                          </label>
                          <input
                            type="text"
                            value={draftContent.storeAddress || ''}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                storeAddress: e.target.value,
                              })
                            }
                            className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
                        <div>
                          <label className="text-[11px] font-bold text-stone-600 block mb-1">
                            Delivery Charge ({draftContent.currency})
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={draftContent.deliveryFee}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                deliveryFee: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-600 block mb-1">
                            Free Delivery Above ({draftContent.currency})
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={draftContent.freeDeliveryMin}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                freeDeliveryMin: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-600 block mb-1">
                            Default Promo Code
                          </label>
                          <input
                            type="text"
                            value={draftContent.promoCode}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                promoCode: e.target.value.toUpperCase(),
                              })
                            }
                            className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold uppercase"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-600 block mb-1">
                            Promo Discount (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={90}
                            value={draftContent.promoDiscountPercent}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                promoDiscountPercent: Math.max(
                                  0,
                                  Math.min(90, Number(e.target.value) || 0)
                                ),
                              })
                            }
                            className="w-full rounded-xl bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold"
                          />
                        </div>
                      </div>

                      {/* Order Channel Toggles */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-stone-100 text-xs">
                        <label className="flex items-center gap-2 bg-[#FAF6F0] border border-stone-200 rounded-xl px-3 py-2.5 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draftContent.acceptingOrders !== false}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                acceptingOrders: e.target.checked,
                              })
                            }
                            className="accent-stone-900"
                          />
                          <span>Accepting New Orders</span>
                        </label>
                        <label className="flex items-center gap-2 bg-[#FAF6F0] border border-stone-200 rounded-xl px-3 py-2.5 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draftContent.deliveryEnabled !== false}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                deliveryEnabled: e.target.checked,
                              })
                            }
                            className="accent-stone-900"
                          />
                          <span>Home Delivery Enabled</span>
                        </label>
                        <label className="flex items-center gap-2 bg-[#FAF6F0] border border-stone-200 rounded-xl px-3 py-2.5 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draftContent.pickupEnabled !== false}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                pickupEnabled: e.target.checked,
                              })
                            }
                            className="accent-stone-900"
                          />
                          <span>Store Pickup Enabled</span>
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              window.confirm(
                                'Reset catalog & store settings back to default seed values in Supabase?'
                              )
                            ) {
                              const res = await resetToFactoryDefaults();
                              onTriggerToast(
                                res.ok
                                  ? 'Restored default catalog in Supabase ✓'
                                  : res.error || 'Reset failed'
                              );
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 px-3.5 py-2 text-xs font-bold cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Catalog Defaults</span>
                        </button>

                        <button
                          type="submit"
                          disabled={isSavingSettings}
                          className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 text-xs font-extrabold cursor-pointer disabled:opacity-60"
                        >
                          {isSavingSettings ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isSavingSettings ? 'Saving...' : 'Save Store Settings'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </motion.div>

        {/* Product Delete Confirmation Modal */}
        {confirmDeleteCake && (
          <div className="fixed inset-0 z-[80] bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-display font-extrabold text-sm">
                  Delete &ldquo;{confirmDeleteCake.name}&rdquo;?
                </h4>
              </div>
              <p className="text-xs text-stone-600">
                This permanently removes the product from Supabase and hides it immediately for all storefront visitors. Historical orders containing this product are preserved.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCake(null)}
                  className="rounded-full bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCake}
                  className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-extrabold cursor-pointer"
                >
                  Delete Product
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default AdminPanel;
