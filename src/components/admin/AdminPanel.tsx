import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Lock,
  CakeSlice,
  Image as ImageIcon,
  FileText,
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
  Cloud,
  RefreshCw,
  ChefHat,
  ShieldCheck,
  LayoutGrid,
  Tag,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
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
import { isSupabaseConfigured } from '../../lib/supabase';
import { getLastSyncLabel, normalizeImageUrl } from '../../utils/cacheEngine';
import {
  verifyMkAdminCode,
  updateMkAdminCode,
  getLockoutRemainingSeconds,
  isVaultSessionValid,
  clearVaultSession,
} from '../../utils/adminSecurity';
import {
  ImageResizerStudio,
  ImageInspectorBadge,
} from './ImageResizerStudio';
import { FoodThemeBuilder } from './FoodThemeBuilder';
import { IngredientManager } from './IngredientManager';

export interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerToast: (msg: string) => void;
}

type AdminTab = 'cakes' | 'home' | 'images' | 'texts' | 'settings';

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
    upsertCake,
    duplicateCake,
    deleteCake,
    publishAllToServer,
    refreshFromServer,
    previousIngredients,
    recordIngredientInHistory,
    resetToFactoryDefaults,
  } = useStore();

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() =>
    isVaultSessionValid()
  );
  const [pinInput, setPinInput] = useState<string>('');
  const [showCode, setShowCode] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>('');
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(() =>
    getLockoutRemainingSeconds()
  );
  const [newSecretCode, setNewSecretCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<AdminTab>('cakes');

  // Cake Editor State
  const [editingCake, setEditingCake] = useState<CakeItem | null>(null);

  // Draft Site Content State for Home/Offers, Text & Settings
  const [draftContent, setDraftContent] = useState<SiteContent>(siteContent);

  // New Offer Draft State (Tab: Home & Offers)
  const [newOfferBadge, setNewOfferBadge] = useState<string>('Flash Offer');
  const [newOfferTitle, setNewOfferTitle] = useState<string>('');
  const [newOfferSubtitle, setNewOfferSubtitle] = useState<string>('');
  const [newOfferCode, setNewOfferCode] = useState<string>('');
  const [newOfferDiscount, setNewOfferDiscount] = useState<number>(20);
  const [newOfferCta, setNewOfferCta] = useState<string>('Claim Offer');
  const [newOfferImg, setNewOfferImg] = useState<string>(
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80'
  );

  // New Home Section Draft State (Tab: Home & Offers)
  const [newSectionTitle, setNewSectionTitle] = useState<string>('');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState<string>('');
  const [newSectionCakeIds, setNewSectionCakeIds] = useState<string[]>([]);

  useEffect(() => {
    setDraftContent(siteContent);
  }, [siteContent]);

  // Live lockout cooldown ticker
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const id = window.setInterval(() => {
      const rem = getLockoutRemainingSeconds();
      setLockoutSeconds(rem);
      if (rem <= 0) setPinError('');
    }, 1000);
    return () => window.clearInterval(id);
  }, [lockoutSeconds]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0 || isVerifying) return;
    setIsVerifying(true);
    try {
      const res = await verifyMkAdminCode(pinInput);
      if (res.ok) {
        setIsUnlocked(true);
        setPinInput('');
        setPinError('');
        setLockoutSeconds(0);
      } else if (res.lockoutSeconds > 0) {
        setLockoutSeconds(res.lockoutSeconds);
        setPinInput('');
        setPinError(
          `Too many failed attempts. Vault locked for ${res.lockoutSeconds}s.`
        );
      } else {
        setPinError(
          `Access Denied • ${res.remainingAttempts} attempts remaining`
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLockVault = () => {
    clearVaultSession();
    setIsUnlocked(false);
    setPinInput('');
    onTriggerToast('the MK Vault locked');
  };

  const handleCreateNewCake = () => {
    const template = CAKES_DATA[0];
    const newCake: CakeItem = {
      ...template,
      id: `cake-${Date.now()}`,
      name: 'New Special Cake',
      heroTitleLines: ['New Special', 'Cake'],
      category: 'Birthday Cake',
      badge: 'New Arrival',
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
      reviewsCount: 45,
      prepMins: 35,
      prepTime: '35 mins prep',
      weight: '0.5 kg',
      calories: '290 kcal',
      isHeroFlavor: true,
      steps: DEFAULT_JOURNEY_STEPS,
    };
    setEditingCake(newCake);
  };

  const handleSaveCake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCake) return;
    const synced = await upsertCake(editingCake);
    if (synced) {
      onTriggerToast(`"${editingCake.name}" saved & LIVE for all users ✓`);
    } else if (isSupabaseConfigured) {
      onTriggerToast(
        `"${editingCake.name}" saved locally — run updated SQL in Supabase to go live`
      );
    } else {
      onTriggerToast(`"${editingCake.name}" সফলভাবে Save হয়েছে!`);
    }
    setEditingCake(null);
  };

  const toggleDietaryTag = (tag: string) => {
    if (!editingCake) return;
    const current = editingCake.dietaryTags || [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    setEditingCake({ ...editingCake, dietaryTags: next });
  };

  const handleSaveSiteContent = async (e: React.FormEvent) => {
    e.preventDefault();
    const synced = await updateSiteContent(draftContent);
    if (synced) {
      onTriggerToast('Website updates saved & LIVE for all users ✓');
    } else if (isSupabaseConfigured) {
      onTriggerToast('Saved locally — run updated SQL in Supabase to go live');
    } else {
      onTriggerToast('Website-এর সকল তথ্য সফলভাবে Update হয়েছে!');
    }
  };

  const handleResetDefaults = () => {
    resetToFactoryDefaults();
    onTriggerToast('Default Data Restore করা হয়েছে!');
    setEditingCake(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/60 backdrop-blur-md p-2 sm:p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-[1140px] max-h-[94dvh] bg-[#FAF6F0] rounded-[32px] shadow-2xl border border-white flex flex-col overflow-hidden"
          >
            {/* Top Bar */}
            <div className="px-4 sm:px-5 py-3 bg-white border-b border-stone-200/80 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center shrink-0">
                  <Lock className="w-3.5 h-3.5 text-amber-300" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-sm sm:text-base font-extrabold text-stone-900 leading-[1.25] truncate">
                    the MK — Secure Control Vault
                  </h2>
                  <p className="text-[10.5px] font-semibold text-stone-500 truncate">
                    SHA-256 Protected • Cakes, Home, Offers & Settings
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isUnlocked && (
                  <button
                    type="button"
                    onClick={handleLockVault}
                    className="whitespace-nowrap rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1.5 text-[0.68rem] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Lock</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 whitespace-nowrap rounded-full bg-[#FAF6F0] hover:bg-stone-200 px-3 py-1.5 text-[0.72rem] font-bold text-stone-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Back to Store</span>
                  <X className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </div>

            {!isUnlocked ? (
              /* COOL LUXURY DARK OBSIDIAN "The MK" ACCESS PAGE */
              <div className="flex-1 relative overflow-hidden bg-[#0E0E10] text-white flex flex-col items-center justify-center p-6 sm:p-10">
                {/* Animated subtle ambient gold/rose vault glow */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.22, 0.34, 0.22] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-amber-400/30 blur-3xl pointer-events-none"
                />
                <div className="absolute -bottom-24 right-0 w-64 h-64 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

                <motion.form
                  onSubmit={handlePinSubmit}
                  autoComplete="off"
                  initial={{ opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                  className="relative z-10 w-full max-w-[350px] bg-white/[0.06] backdrop-blur-2xl rounded-[30px] p-6 sm:p-7 shadow-2xl border-[1px] border-white/15 text-center space-y-5"
                >
                  {/* Monogram Crest */}
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 via-amber-200 to-white opacity-25 blur-md" />
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-stone-900 to-black border-[1.5px] border-amber-300/60 flex items-center justify-center shadow-lg">
                      <span className="font-display text-lg font-extrabold tracking-widest text-amber-300">
                        MK
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/15 text-amber-200 border-[1px] border-amber-300/25 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.18em]">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Private Access</span>
                    </span>
                    <h3 className="font-display text-[1.65rem] font-extrabold tracking-tight text-white leading-tight pt-0.5">
                      The MK
                    </h3>
                    <p className="text-[0.72rem] text-stone-400 font-medium">
                      Enter admin password to open control panel
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type={showCode ? 'text' : 'password'}
                      autoComplete="new-password"
                      spellCheck={false}
                      autoFocus
                      disabled={lockoutSeconds > 0 || isVerifying}
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setPinError('');
                      }}
                      placeholder="Enter Admin Password"
                      className="w-full rounded-[16px] bg-black/45 border-[1px] border-white/15 pl-4 pr-11 py-3 text-center text-[16px] font-semibold tracking-wider text-white placeholder:text-stone-500 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/20 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCode((s) => !s)}
                      aria-label={showCode ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-stone-400 hover:text-white cursor-pointer"
                    >
                      {showCode ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {pinError && (
                    <p className="text-[0.72rem] font-semibold text-rose-300 bg-rose-500/15 border-[1px] border-rose-400/25 rounded-[12px] px-3 py-1.5">
                      {pinError}
                    </p>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={lockoutSeconds > 0 || isVerifying || !pinInput.trim()}
                    className="w-full rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 hover:brightness-105 text-stone-950 py-3 text-[0.84rem] font-extrabold tracking-wide cursor-pointer shadow-lg disabled:opacity-45"
                  >
                    {lockoutSeconds > 0
                      ? `Locked (${lockoutSeconds}s)`
                      : isVerifying
                      ? 'Verifying...'
                      : 'Enter The MK'}
                  </motion.button>

                  <p className="text-[0.62rem] text-stone-500 font-medium">
                    SHA-256 Encrypted Vault • Auto-locks after 15m
                  </p>
                </motion.form>
              </div>
            ) : (
              /* UNLOCKED 4-TAB ADMIN WORKBENCH */
              <>
                {/* Navigation Tabs */}
                <div className="px-4 sm:px-6 py-2.5 bg-white/75 border-b border-stone-200/70 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                  {[
                    {
                      id: 'cakes' as AdminTab,
                      label: 'Cakes & Theme',
                      icon: CakeSlice,
                    },
                    {
                      id: 'home' as AdminTab,
                      label: 'Home & Offers',
                      icon: LayoutGrid,
                    },
                    {
                      id: 'images' as AdminTab,
                      label: 'Image Resizer',
                      icon: ImageIcon,
                    },
                    {
                      id: 'texts' as AdminTab,
                      label: 'Website Text',
                      icon: FileText,
                    },
                    {
                      id: 'settings' as AdminTab,
                      label: 'Delivery & Settings',
                      icon: Truck,
                    },
                  ].map((tab) => {
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
                        className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                          active
                            ? 'bg-stone-900 text-white shadow-sm'
                            : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="py-0.5">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Body */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-5">
                  {/* =========================================================
                      TAB 1: Cakes & Theme (Products, Food Themes & Ingredients)
                  ========================================================== */}
                  {activeTab === 'cakes' && (
                    <div className="space-y-5">
                      {!editingCake ? (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="font-display text-lg font-extrabold text-stone-900">
                                Cake Catalog & Food-Color Theme ({cakes.length} Cakes)
                              </h3>
                              <p className="text-xs text-stone-500">
                                যেকোনো Cake Edit করে Price, Image, Color Theme এবং Toppings পরিবর্তন করুন
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={handleCreateNewCake}
                              className="rounded-full bg-stone-900 hover:bg-stone-800 text-white px-4 py-2.5 text-xs font-extrabold flex items-center gap-2 shadow-sm cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>+ Add New Cake</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {cakes.map((cake) => (
                              <div
                                key={cake.id}
                                style={{ backgroundColor: cake.theme.surface }}
                                className="rounded-[24px] p-4 border border-white shadow-sm flex flex-col justify-between gap-3"
                              >
                                <div className="flex items-center gap-3.5">
                                  <img
                                    src={cake.image_url}
                                    alt={cake.name}
                                    loading="lazy"
                                    className="w-16 h-16 rounded-full object-cover bg-white p-1 border-2 border-white shadow-sm shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-extrabold bg-white/80 text-stone-800 rounded-full px-2 py-0.5">
                                        {cake.category}
                                      </span>
                                      {cake.isHeroFlavor && (
                                        <span className="text-[10px] font-extrabold bg-amber-300/90 text-stone-950 rounded-full px-2 py-0.5">
                                          Hero Wave
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-display font-extrabold text-base text-stone-900 mt-1 truncate">
                                      {cake.name}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs font-bold text-stone-700 mt-0.5">
                                      <span>
                                        {siteContent.currency} {cake.basePrice}
                                      </span>
                                      {cake.originalPrice && (
                                        <span className="line-through text-stone-400">
                                          {siteContent.currency}
                                          {cake.originalPrice}
                                        </span>
                                      )}
                                      <span>• ★ {cake.rating.toFixed(1)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5">
                                  <div className="flex items-center gap-1">
                                    {[
                                      cake.theme.canvas,
                                      cake.theme.wave,
                                      cake.theme.accent,
                                      cake.theme.darkBtn,
                                    ].map((hex, i) => (
                                      <span
                                        key={i}
                                        style={{ backgroundColor: hex }}
                                        className="w-4 h-4 rounded-full border border-white shadow-2xs"
                                      />
                                    ))}
                                    <span className="text-[10px] font-bold text-stone-600 ml-1">
                                      {cake.customizerOptions.length} Toppings
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditingCake(cake)}
                                      className="rounded-full bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      type="button"
                                      title="Duplicate Cake"
                                      onClick={() => {
                                        const cloned = duplicateCake(cake);
                                        setEditingCake(cloned);
                                        onTriggerToast(
                                          `"${cake.name}" Duplicate করা হয়েছে — এখন Edit করুন!`
                                        );
                                      }}
                                      className="w-8 h-8 rounded-full bg-white/85 hover:bg-stone-100 text-stone-700 flex items-center justify-center cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    {cakes.length > 1 && (
                                      <button
                                        type="button"
                                        title="Delete Cake"
                                        onClick={() => {
                                          deleteCake(cake.id);
                                          onTriggerToast(
                                            `"${cake.name}" Delete করা হয়েছে`
                                          );
                                        }}
                                        className="w-8 h-8 rounded-full bg-white/80 hover:bg-rose-50 text-rose-600 flex items-center justify-center cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        /* SINGLE CAKE FULL EDITOR */
                        <form onSubmit={handleSaveCake} className="space-y-5">
                          <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-[22px] p-4 border border-stone-200/80">
                            <div>
                              <h3 className="font-display text-lg font-extrabold text-stone-900">
                                Cake Editor: {editingCake.name}
                              </h3>
                              <p className="text-xs text-stone-500">
                                তথ্য পরিবর্তন করে নিচে &ldquo;Save Cake&rdquo; বাটনে ক্লিক করুন
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingCake(null)}
                                className="rounded-full bg-stone-100 hover:bg-stone-200 px-4 py-2 text-xs font-bold text-stone-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="rounded-full bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save Cake</span>
                              </button>
                            </div>
                          </div>

                          {/* Basic Info & Image Inspector */}
                          <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Cake Name (কেকের নাম)
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={editingCake.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const words = val.split(' ');
                                    const line1 =
                                      words.slice(0, -1).join(' ') || val;
                                    const line2 =
                                      words.length > 1
                                        ? words[words.length - 1]
                                        : 'Cake';
                                    setEditingCake({
                                      ...editingCake,
                                      name: val,
                                      heroTitleLines: [line1, line2],
                                    });
                                  }}
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
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
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                                >
                                  <option value="Birthday Cake">Birthday Cake</option>
                                  <option value="Bento Cake">Bento Cake</option>
                                  <option value="Cupcake">Cupcake</option>
                                  <option value="Sugar-Free">Sugar-Free</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Offer / Selling Price ({siteContent.currency})
                                </label>
                                <input
                                  type="number"
                                  required
                                  value={editingCake.basePrice}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      basePrice: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold text-stone-900 tabular-nums"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Regular Price (অফার থাকলে)
                                </label>
                                <input
                                  type="number"
                                  value={editingCake.originalPrice || ''}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      originalPrice: e.target.value
                                        ? Number(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  placeholder="যেমন: 1200"
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold text-stone-900 tabular-nums"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Rating (1.0 – 5.0)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="1"
                                  max="5"
                                  value={editingCake.rating}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      rating: Math.min(
                                        5,
                                        Math.max(1, Number(e.target.value) || 4.9)
                                      ),
                                    })
                                  }
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold text-stone-900 tabular-nums"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Prep Time (Minutes)
                                </label>
                                <input
                                  type="number"
                                  value={editingCake.prepMins}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      prepMins: Number(e.target.value) || 35,
                                    })
                                  }
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold text-stone-900 tabular-nums"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Weight Tag (যেমন: 0.5 kg)
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
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                                />
                              </div>

                              <div className="flex items-end pb-1">
                                <label className="inline-flex items-center gap-2 text-xs font-extrabold text-stone-800 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editingCake.isHeroFlavor}
                                    onChange={(e) =>
                                      setEditingCake({
                                        ...editingCake,
                                        isHeroFlavor: e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4 accent-stone-900 rounded"
                                  />
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                  <span>Hero Wave Slider-এ দেখান</span>
                                </label>
                              </div>
                            </div>

                            {/* Cake Image URL (Supports Google Drive "Anyone with the link" & Direct URLs) */}
                            <div>
                              <label className="text-xs font-bold text-stone-600 block mb-1">
                                Cake Image Link — Public URL or Google Drive (&ldquo;Anyone with the link&rdquo;)
                              </label>
                              <input
                                type="text"
                                required
                                value={editingCake.image_url}
                                onChange={(e) =>
                                  setEditingCake({
                                    ...editingCake,
                                    image_url: normalizeImageUrl(e.target.value, 1000),
                                  })
                                }
                                placeholder="Paste Google Drive share link (Anyone with the link) or https://... image URL"
                                className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3.5 py-2 text-xs font-medium text-stone-800"
                              />
                              <ImageInspectorBadge
                                url={editingCake.image_url}
                                onQuickOptimize={(optUrl) =>
                                  setEditingCake({
                                    ...editingCake,
                                    image_url: optUrl,
                                  })
                                }
                                targetSize={{
                                  w: 800,
                                  h: 800,
                                  label: '800×800',
                                }}
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Short Description (Hero Slider)
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
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 resize-none"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Full Description (Detail Sheet)
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
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 resize-y"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Brand-Grade Food Details, Taste Profile & Crafted-For-You Story */}
                          <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                              <div className="flex items-center gap-2">
                                <ChefHat className="w-4 h-4 text-amber-600" />
                                <h4 className="font-display text-sm sm:text-base font-extrabold text-stone-900">
                                  Brand-Grade Food Details & Taste Profile
                                </h4>
                              </div>
                              <span className="text-[11px] font-bold text-stone-500">
                                Big Brand স্টাইলে Ingredients, Servings, Sweetness ও Care Guide
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Highlight Badge
                                </label>
                                <input
                                  type="text"
                                  value={editingCake.badge || ''}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      badge: e.target.value || undefined,
                                    })
                                  }
                                  placeholder="যেমন: Bestseller"
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                                />
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {BADGE_PRESETS.slice(0, 3).map((b) => (
                                    <button
                                      key={b}
                                      type="button"
                                      onClick={() =>
                                        setEditingCake({
                                          ...editingCake,
                                          badge: b,
                                        })
                                      }
                                      className="rounded-full bg-stone-100 hover:bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-700 cursor-pointer"
                                    >
                                      {b}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Servings (পরিবেশন)
                                </label>
                                <input
                                  type="text"
                                  value={editingCake.servings || ''}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      servings: e.target.value,
                                    })
                                  }
                                  placeholder="যেমন: 4–6 জন (6 Slices)"
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Calories (ক্যালরি)
                                </label>
                                <input
                                  type="text"
                                  value={editingCake.calories}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      calories: e.target.value,
                                    })
                                  }
                                  placeholder="যেমন: 310 kcal"
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Texture & Sweetness ({editingCake.sweetnessLevel ?? 3}/5)
                                </label>
                                <input
                                  type="text"
                                  value={editingCake.textureProfile || ''}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      textureProfile: e.target.value,
                                    })
                                  }
                                  placeholder="Cloud-Soft & Velvety"
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-900"
                                />
                                <div className="flex items-center gap-1 mt-1.5">
                                  {[1, 2, 3, 4, 5].map((lvl) => (
                                    <button
                                      key={lvl}
                                      type="button"
                                      onClick={() =>
                                        setEditingCake({
                                          ...editingCake,
                                          sweetnessLevel: lvl,
                                        })
                                      }
                                      className={`flex-1 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer ${
                                        lvl <= (editingCake.sweetnessLevel ?? 3)
                                          ? 'bg-amber-500 text-white'
                                          : 'bg-stone-100 text-stone-500'
                                      }`}
                                    >
                                      {lvl}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Ingredients Story (Inside Ingredients Slide)
                                </label>
                                <textarea
                                  rows={3}
                                  value={editingCake.ingredientsStory || ''}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      ingredientsStory: e.target.value,
                                    })
                                  }
                                  placeholder="Hand-selected strawberries, French mascarpone cream..."
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 resize-y"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Chef&apos;s Personal Note (Crafted For You)
                                </label>
                                <textarea
                                  rows={3}
                                  value={editingCake.chefNote || ''}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      chefNote: e.target.value,
                                    })
                                  }
                                  placeholder="আপনার বিশেষ দিনের জন্য প্রতিটি Layer হাতে Finish করা হয়..."
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 resize-y"
                                />
                              </div>
                            </div>

                            {/* Dietary & Quality Badges */}
                            <div>
                              <label className="text-xs font-bold text-stone-600 block mb-1.5">
                                Dietary & Quality Badges (1-Tap Toggle)
                              </label>
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
                                      className={`rounded-full px-3 py-1 text-[11px] font-extrabold inline-flex items-center gap-1 border cursor-pointer transition-all ${
                                        active
                                          ? 'bg-emerald-700 text-white border-emerald-700'
                                          : 'bg-[#FAF6F0] text-stone-700 border-stone-200 hover:bg-stone-100'
                                      }`}
                                    >
                                      <ShieldCheck className="w-3 h-3" />
                                      <span>{tag}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Allergen Info
                                </label>
                                <input
                                  type="text"
                                  value={editingCake.allergens || ''}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      allergens: e.target.value,
                                    })
                                  }
                                  placeholder="Dairy, Eggs, Wheat, Nuts"
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-stone-600 block mb-1">
                                  Storage & Serving Care Tip
                                </label>
                                <input
                                  type="text"
                                  value={editingCake.storageTip || ''}
                                  onChange={(e) =>
                                    setEditingCake({
                                      ...editingCake,
                                      storageTip: e.target.value,
                                    })
                                  }
                                  placeholder="Keep chilled at 4°C; slice 15 mins after taking out"
                                  className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Live Food-Color Theme & Wave Builder */}
                          <FoodThemeBuilder
                            theme={editingCake.theme}
                            cakeName={editingCake.name}
                            cakePrice={editingCake.basePrice}
                            cakeImageUrl={editingCake.image_url}
                            onChange={(nextTheme) =>
                              setEditingCake({
                                ...editingCake,
                                theme: nextTheme,
                              })
                            }
                          />

                          {/* Ingredient Manager with Previously Added Items History */}
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

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingCake(null)}
                              className="rounded-full bg-stone-200 px-5 py-2.5 text-xs font-bold text-stone-800 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="rounded-full bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2.5 text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer"
                            >
                              <Save className="w-4 h-4" />
                              <span>Save Cake</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* =========================================================
                      TAB 2: Home & Offers (Front Hero Picker, Auto-Wave, Offers & Sections)
                  ========================================================== */}
                  {activeTab === 'home' && (
                    <div className="space-y-5">
                      {/* 1. FRONT HERO SHOWCASE PICKER & AUTO-WAVE TIMER */}
                      <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                          <div>
                            <h3 className="font-display text-base sm:text-lg font-extrabold text-stone-900 flex items-center gap-2">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              <span>Front App Showcase & Auto-Wave</span>
                            </h3>
                            <p className="text-xs text-stone-500">
                              Select which foods appear in front of the app — the wave & theme automatically rotate smoothly every few seconds.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const next = !draftContent.heroAutoRotate;
                                setDraftContent({
                                  ...draftContent,
                                  heroAutoRotate: next,
                                });
                                updateSiteContent({ heroAutoRotate: next });
                                onTriggerToast(
                                  next
                                    ? 'Auto-Wave Rotation চালু হয়েছে!'
                                    : 'Auto-Wave Rotation বন্ধ করা হয়েছে'
                                );
                              }}
                              className={`rounded-full px-3 py-1.5 text-xs font-extrabold cursor-pointer border ${
                                draftContent.heroAutoRotate
                                  ? 'bg-emerald-700 text-white border-emerald-700'
                                  : 'bg-stone-100 text-stone-700 border-stone-200'
                              }`}
                            >
                              Auto-Wave: {draftContent.heroAutoRotate ? 'ON' : 'OFF'}
                            </button>

                            <div className="flex items-center gap-1 bg-[#FAF6F0] rounded-full p-1 border border-stone-200">
                              {[2, 2.5, 3, 4].map((sec) => (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() => {
                                    setDraftContent({
                                      ...draftContent,
                                      heroAutoRotateSeconds: sec,
                                    });
                                    updateSiteContent({
                                      heroAutoRotateSeconds: sec,
                                    });
                                    onTriggerToast(`Wave speed set to ${sec}s`);
                                  }}
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold cursor-pointer ${
                                    draftContent.heroAutoRotateSeconds === sec
                                      ? 'bg-stone-900 text-white'
                                      : 'text-stone-600 hover:bg-white'
                                  }`}
                                >
                                  {sec}s
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                          {cakes.map((cake) => {
                            const selectedCount = cakes.filter(
                              (c) => c.isHeroFlavor
                            ).length;
                            return (
                              <button
                                key={cake.id}
                                type="button"
                                onClick={() => {
                                  if (cake.isHeroFlavor && selectedCount <= 1) {
                                    onTriggerToast(
                                      'At least 1 food must remain in Front Hero!'
                                    );
                                    return;
                                  }
                                  upsertCake({
                                    ...cake,
                                    isHeroFlavor: !cake.isHeroFlavor,
                                  });
                                  onTriggerToast(
                                    !cake.isHeroFlavor
                                      ? `"${cake.name}" added to Front Showcase!`
                                      : `"${cake.name}" removed from Front Showcase`
                                  );
                                }}
                                style={{
                                  backgroundColor: cake.isHeroFlavor
                                    ? cake.theme.surface
                                    : '#FAF6F0',
                                }}
                                className={`rounded-[18px] p-2.5 border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                                  cake.isHeroFlavor
                                    ? 'border-stone-900/25 shadow-sm'
                                    : 'border-stone-200/80 opacity-75 hover:opacity-100'
                                }`}
                              >
                                <img
                                  src={cake.image_url}
                                  alt={cake.name}
                                  className="w-11 h-11 rounded-full object-cover bg-white p-0.5 border border-white shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-extrabold text-stone-900 truncate">
                                    {cake.name}
                                  </p>
                                  <span
                                    className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                      cake.isHeroFlavor
                                        ? 'bg-stone-900 text-white'
                                        : 'bg-white text-stone-500 border border-stone-200'
                                    }`}
                                  >
                                    {cake.isHeroFlavor ? 'Front ON ✓' : 'Add to Front'}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. SPECIAL OFFERS & PROMO BANNERS MANAGER */}
                      <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                          <div>
                            <h3 className="font-display text-base sm:text-lg font-extrabold text-stone-900 flex items-center gap-2">
                              <Tag className="w-4 h-4 text-rose-600" />
                              <span>Offers & Discount Banners ({(draftContent.offers || []).length})</span>
                            </h3>
                            <p className="text-xs text-stone-500">
                              Add multiple Special Offers — active offers appear on the Home screen and apply automatically at Checkout.
                            </p>
                          </div>
                        </div>

                        {/* Existing Offers List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(draftContent.offers || []).map((offer) => (
                            <div
                              key={offer.id}
                              className="rounded-[20px] bg-[#111111] text-white p-3.5 flex items-center justify-between gap-3 border border-white/10"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={offer.imageUrl}
                                  alt={offer.title}
                                  className="w-12 h-12 rounded-[12px] object-cover border border-white/20 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-amber-300">
                                      {offer.badge}
                                    </span>
                                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold">
                                      {offer.promoCode} ({offer.discountPercent}%)
                                    </span>
                                  </div>
                                  <p className="text-sm font-extrabold truncate">
                                    {offer.title}
                                  </p>
                                  <p className="text-[11px] text-stone-300 truncate">
                                    {offer.subtitle}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextOffers = (draftContent.offers || []).map(
                                      (o) =>
                                        o.id === offer.id
                                          ? { ...o, isActive: !o.isActive }
                                          : o
                                    );
                                    const updated = {
                                      ...draftContent,
                                      offers: nextOffers,
                                    };
                                    setDraftContent(updated);
                                    updateSiteContent({ offers: nextOffers });
                                  }}
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold cursor-pointer ${
                                    offer.isActive
                                      ? 'bg-emerald-400 text-stone-950'
                                      : 'bg-white/15 text-white/70'
                                  }`}
                                >
                                  {offer.isActive ? 'Active' : 'Paused'}
                                </button>
                                {(draftContent.offers || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextOffers = (
                                        draftContent.offers || []
                                      ).filter((o) => o.id !== offer.id);
                                      setDraftContent({
                                        ...draftContent,
                                        offers: nextOffers,
                                      });
                                      updateSiteContent({ offers: nextOffers });
                                      onTriggerToast('Offer removed');
                                    }}
                                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-rose-500 text-white flex items-center justify-center cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add New Offer Form */}
                        <div className="bg-[#FAF6F0] rounded-[20px] p-4 border border-stone-200/80 space-y-3">
                          <h4 className="text-xs font-extrabold text-stone-800">
                            + Add New Offer Banner
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            <input
                              type="text"
                              value={newOfferBadge}
                              onChange={(e) => setNewOfferBadge(e.target.value)}
                              placeholder="Badge (e.g. Weekend Deal)"
                              className="rounded-[12px] bg-white border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                            <input
                              type="text"
                              value={newOfferTitle}
                              onChange={(e) => setNewOfferTitle(e.target.value)}
                              placeholder="Offer Title (e.g. 25% Eid Discount!)"
                              className="rounded-[12px] bg-white border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                            <input
                              type="text"
                              value={newOfferSubtitle}
                              onChange={(e) => setNewOfferSubtitle(e.target.value)}
                              placeholder="Subtitle (e.g. All Bento Cakes)"
                              className="rounded-[12px] bg-white border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newOfferCode}
                                onChange={(e) =>
                                  setNewOfferCode(e.target.value.toUpperCase())
                                }
                                placeholder="CODE (EID25)"
                                className="w-1/2 rounded-[12px] bg-white border border-stone-200 px-2.5 py-2 text-xs font-extrabold uppercase text-stone-900"
                              />
                              <input
                                type="number"
                                min={1}
                                max={90}
                                value={newOfferDiscount}
                                onChange={(e) =>
                                  setNewOfferDiscount(Number(e.target.value) || 10)
                                }
                                placeholder="%"
                                className="w-1/2 rounded-[12px] bg-white border border-stone-200 px-2.5 py-2 text-xs font-extrabold text-stone-900 tabular-nums"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2.5">
                            <input
                              type="text"
                              value={newOfferImg}
                              onChange={(e) =>
                                setNewOfferImg(normalizeImageUrl(e.target.value, 800))
                              }
                              placeholder="Google Drive ('Anyone with the link') or Image URL"
                              className="flex-1 rounded-[12px] bg-white border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                            />
                            <input
                              type="text"
                              value={newOfferCta}
                              onChange={(e) => setNewOfferCta(e.target.value)}
                              placeholder="CTA (Claim Offer)"
                              className="sm:w-36 rounded-[12px] bg-white border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newOfferTitle.trim() || !newOfferCode.trim()) {
                                  onTriggerToast(
                                    'Please enter Offer Title & Promo Code'
                                  );
                                  return;
                                }
                                const created: PromoOfferItem = {
                                  id: `offer-${Date.now()}`,
                                  badge: newOfferBadge.trim() || 'Special Offer',
                                  title: newOfferTitle.trim(),
                                  subtitle:
                                    newOfferSubtitle.trim() ||
                                    'Limited-time Bakery Deal',
                                  description: `Checkout-এ ${newOfferCode.trim()} Promo Code ব্যবহার করলেই পাচ্ছেন ${newOfferDiscount}% Discount!`,
                                  ctaText: newOfferCta.trim() || 'Claim Offer',
                                  promoCode: newOfferCode.trim().toUpperCase(),
                                  discountPercent: newOfferDiscount,
                                  imageUrl: newOfferImg.trim(),
                                  isActive: true,
                                };
                                const nextOffers = [
                                  created,
                                  ...(draftContent.offers || []),
                                ];
                                setDraftContent({
                                  ...draftContent,
                                  offers: nextOffers,
                                });
                                updateSiteContent({ offers: nextOffers });
                                setNewOfferTitle('');
                                setNewOfferSubtitle('');
                                setNewOfferCode('');
                                onTriggerToast(
                                  `Offer "${created.title}" added to Home!`
                                );
                              }}
                              className="rounded-full bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Offer</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 3. HOME PAGE FOOD SECTIONS MANAGER */}
                      <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-4">
                        <div className="border-b border-stone-100 pb-3">
                          <h3 className="font-display text-base sm:text-lg font-extrabold text-stone-900 flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4 text-emerald-700" />
                            <span>Home Page Cakes & Foods Sections ({(draftContent.homeSections || []).length})</span>
                          </h3>
                          <p className="text-xs text-stone-500">
                            Create custom curated food rows on the Home Page (e.g. Eid Specials, Gift Boxes, Bestsellers).
                          </p>
                        </div>

                        {/* Existing Sections */}
                        <div className="space-y-2.5">
                          {(draftContent.homeSections || []).map((sec, sIdx) => (
                            <div
                              key={sec.id}
                              className="rounded-[18px] bg-[#FAF6F0] p-3 border border-stone-200/80 flex flex-wrap items-center justify-between gap-2.5"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-extrabold text-stone-900">
                                    {sec.title}
                                  </span>
                                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-stone-600 border border-stone-200">
                                    {sec.cakeIds.length} foods
                                  </span>
                                </div>
                                {sec.subtitle && (
                                  <p className="text-xs text-stone-500 truncate">
                                    {sec.subtitle}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextSections = (
                                      draftContent.homeSections || []
                                    ).map((s) =>
                                      s.id === sec.id
                                        ? { ...s, isVisible: !s.isVisible }
                                        : s
                                    );
                                    setDraftContent({
                                      ...draftContent,
                                      homeSections: nextSections,
                                    });
                                    updateSiteContent({
                                      homeSections: nextSections,
                                    });
                                  }}
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer ${
                                    sec.isVisible
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-stone-200 text-stone-600'
                                  }`}
                                >
                                  {sec.isVisible ? (
                                    <Eye className="w-3 h-3" />
                                  ) : (
                                    <EyeOff className="w-3 h-3" />
                                  )}
                                  <span>{sec.isVisible ? 'Visible' : 'Hidden'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const arr = [
                                      ...(draftContent.homeSections || []),
                                    ];
                                    if (sIdx <= 0) return;
                                    [arr[sIdx - 1], arr[sIdx]] = [
                                      arr[sIdx],
                                      arr[sIdx - 1],
                                    ];
                                    setDraftContent({
                                      ...draftContent,
                                      homeSections: arr,
                                    });
                                    updateSiteContent({ homeSections: arr });
                                  }}
                                  className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-700 cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const arr = [
                                      ...(draftContent.homeSections || []),
                                    ];
                                    if (sIdx >= arr.length - 1) return;
                                    [arr[sIdx + 1], arr[sIdx]] = [
                                      arr[sIdx],
                                      arr[sIdx + 1],
                                    ];
                                    setDraftContent({
                                      ...draftContent,
                                      homeSections: arr,
                                    });
                                    updateSiteContent({ homeSections: arr });
                                  }}
                                  className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-700 cursor-pointer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextSections = (
                                      draftContent.homeSections || []
                                    ).filter((s) => s.id !== sec.id);
                                    setDraftContent({
                                      ...draftContent,
                                      homeSections: nextSections,
                                    });
                                    updateSiteContent({
                                      homeSections: nextSections,
                                    });
                                    onTriggerToast('Section removed');
                                  }}
                                  className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add New Home Section Builder */}
                        <div className="bg-[#FAF6F0] rounded-[20px] p-4 border border-stone-200/80 space-y-3">
                          <h4 className="text-xs font-extrabold text-stone-800">
                            + Add New Home Page Food Section
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <input
                              type="text"
                              value={newSectionTitle}
                              onChange={(e) => setNewSectionTitle(e.target.value)}
                              placeholder="Section Title (e.g. Eid Party Specials)"
                              className="rounded-[12px] bg-white border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                            <input
                              type="text"
                              value={newSectionSubtitle}
                              onChange={(e) =>
                                setNewSectionSubtitle(e.target.value)
                              }
                              placeholder="Subtitle (e.g. Handcrafted celebration cakes)"
                              className="rounded-[12px] bg-white border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                            />
                          </div>

                          <div>
                            <span className="text-[11px] font-bold text-stone-600 block mb-1.5">
                              Select Foods for this Section ({newSectionCakeIds.length} selected):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {cakes.map((c) => {
                                const picked = newSectionCakeIds.includes(c.id);
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() =>
                                      setNewSectionCakeIds((prev) =>
                                        prev.includes(c.id)
                                          ? prev.filter((id) => id !== c.id)
                                          : [...prev, c.id]
                                      )
                                    }
                                    className={`rounded-full px-3 py-1 text-[11px] font-bold border cursor-pointer transition-all ${
                                      picked
                                        ? 'bg-stone-900 text-white border-stone-900'
                                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                                    }`}
                                  >
                                    {picked ? '✓ ' : '+ '}
                                    {c.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  !newSectionTitle.trim() ||
                                  newSectionCakeIds.length === 0
                                ) {
                                  onTriggerToast(
                                    'Enter a Section Title and select at least 1 food'
                                  );
                                  return;
                                }
                                const created: HomeFoodSection = {
                                  id: `sec-${Date.now()}`,
                                  title: newSectionTitle.trim(),
                                  subtitle: newSectionSubtitle.trim(),
                                  cakeIds: newSectionCakeIds,
                                  isVisible: true,
                                };
                                const nextSections = [
                                  ...(draftContent.homeSections || []),
                                  created,
                                ];
                                setDraftContent({
                                  ...draftContent,
                                  homeSections: nextSections,
                                });
                                updateSiteContent({ homeSections: nextSections });
                                setNewSectionTitle('');
                                setNewSectionSubtitle('');
                                setNewSectionCakeIds([]);
                                onTriggerToast(
                                  `Section "${created.title}" added to Home Page!`
                                );
                              }}
                              className="rounded-full bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Home Section</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =========================================================
                      TAB 3: Image Resizer (Standalone Image Studio)
                  ========================================================== */}
                  {activeTab === 'images' && <ImageResizerStudio />}

                  {/* =========================================================
                      TAB 3: Website Text (All Site Texts Live Editor)
                  ========================================================== */}
                  {activeTab === 'texts' && (
                    <form
                      onSubmit={handleSaveSiteContent}
                      className="space-y-5"
                    >
                      <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-display text-lg font-extrabold text-stone-900">
                            Website-এর সকল Text পরিবর্তন করুন
                          </h3>
                          <p className="text-xs text-stone-500">
                            যেকোনো লেখা পরিবর্তন করে Save বাটনে ক্লিক করলেই সাথে সাথে Storefront-এ Update হবে
                          </p>
                        </div>
                        <button
                          type="submit"
                          className="rounded-full bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 text-xs font-extrabold flex items-center gap-2 shadow-sm cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Website Text</span>
                        </button>
                      </div>

                      {/* Promo Banner Copy */}
                      <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-3">
                        <h4 className="font-display text-sm font-extrabold text-stone-900">
                          1. Promo Discount Banner
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Banner Badge
                            </label>
                            <input
                              type="text"
                              value={draftContent.bannerBadge}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  bannerBadge: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Banner Title (মূল শিরোনাম)
                            </label>
                            <input
                              type="text"
                              value={draftContent.bannerTitle}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  bannerTitle: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Banner Subtitle
                            </label>
                            <input
                              type="text"
                              value={draftContent.bannerSubtitle}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  bannerSubtitle: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Banner CTA Button
                            </label>
                            <input
                              type="text"
                              value={draftContent.bannerCta}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  bannerCta: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-stone-500 block mb-1">
                            Banner Image Link (Image URL)
                          </label>
                          <input
                            type="text"
                            value={draftContent.bannerImageUrl}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                bannerImageUrl: e.target.value,
                              })
                            }
                            className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800"
                          />
                          <ImageInspectorBadge
                            url={draftContent.bannerImageUrl}
                            onQuickOptimize={(optUrl) =>
                              setDraftContent({
                                ...draftContent,
                                bannerImageUrl: optUrl,
                              })
                            }
                            targetSize={{
                              w: 600,
                              h: 600,
                              label: '600×600',
                            }}
                          />
                        </div>
                      </div>

                      {/* Header, Hero & Discovery Labels */}
                      <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-3">
                        <h4 className="font-display text-sm font-extrabold text-stone-900">
                          2. Header, Search ও Homepage Titles
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Location Label
                            </label>
                            <input
                              type="text"
                              value={draftContent.locationLabel}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  locationLabel: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Search Placeholder
                            </label>
                            <input
                              type="text"
                              value={draftContent.searchPlaceholder}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  searchPlaceholder: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Hero Order Button
                            </label>
                            <input
                              type="text"
                              value={draftContent.orderNowBtn}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  orderNowBtn: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Popular Cakes Title
                            </label>
                            <input
                              type="text"
                              value={draftContent.popularTitle}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  popularTitle: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              View All Button
                            </label>
                            <input
                              type="text"
                              value={draftContent.viewAllText}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  viewAllText: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Empty Search Message
                            </label>
                            <input
                              type="text"
                              value={draftContent.emptySearchText}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  emptySearchText: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Detail Sheet & Checkout Labels */}
                      <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-3">
                        <h4 className="font-display text-sm font-extrabold text-stone-900">
                          3. Customizer Sheet ও Checkout Drawer Text
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Add to Cart Button
                            </label>
                            <input
                              type="text"
                              value={draftContent.addToCartBtn}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  addToCartBtn: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Customize Title
                            </label>
                            <input
                              type="text"
                              value={draftContent.customizeTitle}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  customizeTitle: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              5 Steps Title
                            </label>
                            <input
                              type="text"
                              value={draftContent.stepsTitle}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  stepsTitle: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Order Bag Title
                            </label>
                            <input
                              type="text"
                              value={draftContent.cartTitle}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  cartTitle: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Cake Name Writing Label
                            </label>
                            <input
                              type="text"
                              value={draftContent.cakeMessageLabel}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  cakeMessageLabel: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-500 block mb-1">
                              Confirm Order Button
                            </label>
                            <input
                              type="text"
                              value={draftContent.confirmOrderBtn}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  confirmOrderBtn: e.target.value,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* =========================================================
                      TAB 4: Offers & Delivery (Store, Offers, Delivery & Reset)
                  ========================================================== */}
                  {activeTab === 'settings' && (
                    <form
                      onSubmit={handleSaveSiteContent}
                      className="space-y-5"
                    >
                      <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                          <div>
                            <h3 className="font-display text-lg font-extrabold text-stone-900">
                              Store, Discount Offer & Delivery Settings
                            </h3>
                            <p className="text-xs text-stone-500">
                              Delivery Charge, Free Delivery Limit, WhatsApp Number ও Promo Code নিয়ন্ত্রণ করুন
                            </p>
                          </div>
                          <button
                            type="submit"
                            className="rounded-full bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 text-xs font-extrabold flex items-center gap-2 shadow-sm cursor-pointer"
                          >
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Save Settings</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          <div>
                            <label className="text-xs font-bold text-stone-600 block mb-1">
                              Bakery Brand Name
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
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-stone-600 block mb-1">
                              Delivery City / Area
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
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-900"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-stone-600 block mb-1">
                              WhatsApp Order Number
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
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-900 tabular-nums"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-stone-600 block mb-1">
                              Home Delivery Charge ({draftContent.currency})
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={draftContent.deliveryFee}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  deliveryFee: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3.5 py-2 text-xs font-extrabold text-stone-900 tabular-nums"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-stone-600 block mb-1">
                              Free Delivery Minimum Order ({draftContent.currency})
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={draftContent.freeDeliveryMin}
                              onChange={(e) =>
                                setDraftContent({
                                  ...draftContent,
                                  freeDeliveryMin:
                                    Number(e.target.value) || 1200,
                                })
                              }
                              className="w-full rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3.5 py-2 text-xs font-extrabold text-stone-900 tabular-nums"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-stone-600 block mb-1">
                              Promo Code & Discount (%)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={draftContent.promoCode}
                                onChange={(e) =>
                                  setDraftContent({
                                    ...draftContent,
                                    promoCode: e.target.value.toUpperCase(),
                                  })
                                }
                                className="w-1/2 rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold text-stone-900 uppercase"
                              />
                              <input
                                type="number"
                                min={0}
                                max={90}
                                value={draftContent.promoDiscountPercent}
                                onChange={(e) =>
                                  setDraftContent({
                                    ...draftContent,
                                    promoDiscountPercent:
                                      Number(e.target.value) || 0,
                                  })
                                }
                                className="w-1/2 rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-extrabold text-stone-900 tabular-nums"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-stone-600 block mb-1">
                              Update &ldquo;the MK&rdquo; Secret Code (SHA-256)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                autoComplete="new-password"
                                value={newSecretCode}
                                onChange={(e) => setNewSecretCode(e.target.value)}
                                placeholder="New code (min 6 chars)"
                                className="flex-1 rounded-[14px] bg-[#FAF6F0] border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await updateMkAdminCode(newSecretCode);
                                  if (ok) {
                                    setNewSecretCode('');
                                    onTriggerToast(
                                      '"the MK" access code updated (SHA-256 encrypted)!'
                                    );
                                  } else {
                                    onTriggerToast(
                                      'Code must be at least 6 characters'
                                    );
                                  }
                                }}
                                className="rounded-[14px] bg-stone-900 hover:bg-stone-800 text-white px-3 py-2 text-xs font-extrabold cursor-pointer shrink-0"
                              >
                                Update
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Phone Cache & Supabase Link-Only Sync Status */}
                      <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              isSupabaseConfigured
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            <Cloud className="w-5 h-5" />
                          </span>
                          <div>
                            <h4 className="font-display text-sm font-extrabold text-stone-900">
                              {isSupabaseConfigured
                                ? 'Supabase Cloud Connected (Link-Only Image Mode)'
                                : 'Phone Cache Active • Ready for Supabase + Netlify'}
                            </h4>
                            <p className="text-xs text-stone-500 mt-0.5">
                              {getLastSyncLabel()} • No binary images stored on server — only fast screen-adaptive image URLs.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await publishAllToServer();
                              onTriggerToast(
                                ok
                                  ? 'All cakes, offers & settings are now LIVE for all users ✓'
                                  : 'Could not publish — please run updated supabase-schema.sql in Supabase first'
                              );
                            }}
                            className="rounded-full bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Cloud className="w-3.5 h-3.5" />
                            <span>Publish All Live</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = await refreshFromServer();
                              onTriggerToast(
                                updated
                                  ? 'Latest Menu synced from Supabase!'
                                  : isSupabaseConfigured
                                  ? 'Menu is already up-to-date on phone cache!'
                                  : 'Local Phone Cache Active — Add VITE_SUPABASE_URL in Netlify env when ready.'
                              );
                            }}
                            className="rounded-full bg-[#FAF6F0] hover:bg-stone-200 border border-stone-300 px-4 py-2 text-xs font-extrabold text-stone-800 flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Check Server Sync</span>
                          </button>
                        </div>
                      </div>

                      {/* Factory Reset Card */}
                      <div className="bg-rose-50/80 rounded-[24px] p-4 sm:p-5 border border-rose-200 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="font-display text-sm font-extrabold text-rose-950">
                            Factory Reset (Default Data Restore)
                          </h4>
                          <p className="text-xs text-rose-700">
                            সকল Custom পরিবর্তন মুছে ফেলে অ্যাপের মূল 6টি Cake ও Default Text-এ ফিরে যান
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleResetDefaults}
                          className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset to Default Data</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AdminPanel;
