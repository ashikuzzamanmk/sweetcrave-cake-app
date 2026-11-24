import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Sparkles, Check, Monitor } from 'lucide-react';
import { CakeItem, getEffectiveOptionGroups } from './data/cakesData';
import { storeConfig } from './config/storeConfig';
import { StoreProvider, useStore } from './context/StoreContext';
import { smartSearchCakes } from './utils/smartSearch';
import {
  CartItem,
  loadLocalCartSync,
  saveLocalCartSync,
  loadLocalWishlistSync,
  saveLocalWishlistSync,
} from './lib/supabase';
import { TopNavbar } from './components/TopNavbar';
import { ChromaticWaveHero } from './components/ChromaticWaveHero';
import { HomeFeed } from './components/HomeFeed';
import { CakeDetailSheet } from './components/CakeDetailSheet';
import { CartDrawer } from './components/CartDrawer';
import { PullToRefreshCurtain } from './components/PullToRefreshCurtain';
import { OrbitalCakeWheel } from './components/OrbitalCakeWheel';

// Lazy-load AdminPanel so shoppers on mobile never download admin code until needed
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));

function StorefrontApp() {
  // 1. Reactive Store Context (`siteContent` + `cakes` + `categories` live from Supabase)
  const {
    siteContent,
    cakes: allMenuCakes,
    categories,
    refreshFromServer,
  } = useStore();

  // Only display visible products on the public storefront (ordered by displayPriority)
  const menuCakes = useMemo(() => {
    return allMenuCakes
      .filter((c) => c.isVisible !== false)
      .sort((a, b) => (a.displayPriority ?? 999) - (b.displayPriority ?? 999));
  }, [allMenuCakes]);

  // 2. Active Hero Flavor & Chromatic Theme Engine State
  const heroFlavors = useMemo(() => {
    const flagged = menuCakes.filter((c) => c.isHeroFlavor || c.isFeatured);
    return flagged.length > 0 ? flagged : menuCakes.slice(0, 4);
  }, [menuCakes]);

  const [activeHeroCakeId, setActiveHeroCakeId] = useState<string>(
    () => heroFlavors[0]?.id || menuCakes[0]?.id || ''
  );

  const activeHeroCake = useMemo(
    () =>
      menuCakes.find((c) => c.id === activeHeroCakeId) ||
      heroFlavors[0] ||
      menuCakes[0],
    [menuCakes, activeHeroCakeId, heroFlavors]
  );

  // 3. Discovery Filters (100% Local Client Memory + Smart Bilingual Search)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => siteContent.categories[0] || 'সব কেক'
  );
  const [showWishlistOnly, setShowWishlistOnly] = useState<boolean>(false);

  // Keep selectedCategory valid if live categories change in Admin
  const activeCategoryNames = useMemo(() => {
    const liveVisible = categories
      .filter((c) => c.isVisible !== false)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => c.name);
    if (liveVisible.length > 0) return liveVisible;
    return siteContent.categories;
  }, [categories, siteContent.categories]);

  useEffect(() => {
    if (
      activeCategoryNames.length > 0 &&
      !activeCategoryNames.includes(selectedCategory)
    ) {
      setSelectedCategory(activeCategoryNames[0]);
    }
  }, [activeCategoryNames, selectedCategory]);

  // 4. Local-First Phone-Cached Wishlist & Cart State
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    loadLocalWishlistSync()
  );
  const [cartItems, setCartItems] = useState<CartItem[]>(() =>
    loadLocalCartSync()
  );
  const [promoCode, setPromoCode] = useState<string>('');

  // 5. Modals, Fullscreen Taste Wheel, Admin Panel & Viewport Shell Mode
  const [detailCakeId, setDetailCakeId] = useState<string | null>(null);
  const detailCake = useMemo(
    () =>
      detailCakeId
        ? menuCakes.find((c) => c.id === detailCakeId) || null
        : null,
    [detailCakeId, menuCakes]
  );

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isWheelFullscreen, setIsWheelFullscreen] = useState<boolean>(false);
  const [isMobileLocked, setIsMobileLocked] = useState<boolean>(true);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(
    () => typeof window !== 'undefined' && window.location.hash === '#admin'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2400);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Listen for `#admin` URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenAdmin = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.hash !== '#admin') {
      window.history.replaceState(null, '', '#admin');
    }
    setIsAdminOpen(true);
  }, []);

  const handleCloseAdmin = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#admin') {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
    }
    setIsAdminOpen(false);
  }, []);

  // Chromatic Adaptive Theme Engine
  const currentTheme = (detailCake || activeHeroCake)?.theme;
  useEffect(() => {
    if (!currentTheme) return;
    const root = document.documentElement;
    root.style.setProperty('--bg-canvas', currentTheme.canvas);
    root.style.setProperty('--bg-surface', currentTheme.surface);
    root.style.setProperty('--bg-card', currentTheme.card);
    root.style.setProperty('--theme-wave', currentTheme.wave);
    root.style.setProperty('--accent-primary', currentTheme.accent);
    root.style.setProperty('--dark-btn', currentTheme.darkBtn);
    root.style.setProperty('--text-ink', currentTheme.textInk);
  }, [currentTheme]);

  // Persist Cart & Wishlist in LocalStorage
  useEffect(() => {
    saveLocalCartSync(cartItems);
  }, [cartItems]);

  useEffect(() => {
    saveLocalWishlistSync(wishlistIds);
  }, [wishlistIds]);

  // Smart Bilingual Search + Category & Wishlist Filtering
  const { filteredCakes, matchedBadgesMap } = useMemo(() => {
    const allCategory = activeCategoryNames[0] || 'সব কেক';

    const baseList = menuCakes.filter((cake) => {
      if (showWishlistOnly && !wishlistIds.includes(cake.id)) {
        return false;
      }
      if (
        searchQuery.trim() === '' &&
        selectedCategory !== allCategory &&
        cake.category !== selectedCategory
      ) {
        return false;
      }
      return true;
    });

    if (searchQuery.trim() === '') {
      return {
        filteredCakes: baseList,
        matchedBadgesMap: {} as Record<string, string[]>,
      };
    }

    const searchResults = smartSearchCakes(baseList, searchQuery);
    const badges: Record<string, string[]> = {};
    for (const res of searchResults) {
      if (res.matchedBadges.length > 0) {
        badges[res.cake.id] = res.matchedBadges;
      }
    }

    return {
      filteredCakes: searchResults.map((r) => r.cake),
      matchedBadgesMap: badges,
    };
  }, [
    menuCakes,
    showWishlistOnly,
    wishlistIds,
    selectedCategory,
    searchQuery,
    activeCategoryNames,
  ]);

  const handleToggleWishlist = useCallback(
    (cakeId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setWishlistIds((prev) => {
        const exists = prev.includes(cakeId);
        return exists ? prev.filter((id) => id !== cakeId) : [...prev, cakeId];
      });
    },
    []
  );

  const handleAddCustomizedToCart = useCallback(
    (
      cake: CakeItem,
      selectedOptionIds: string[],
      selectedOptionNames: string[],
      unitPrice: number,
      cakeMessage: string,
      quantity = 1,
      specialInstructions = '',
      addonsUnitPrice?: number
    ) => {
      if (cake.isAvailable === false) {
        triggerToast(`"${cake.name}" is currently sold out.`);
        return;
      }
      const addQty = Math.max(1, quantity);
      const computedAddons =
        typeof addonsUnitPrice === 'number'
          ? addonsUnitPrice
          : Math.max(0, unitPrice - cake.basePrice);
      const signatureKey = `${cake.id}::${[...selectedOptionIds]
        .sort()
        .join('|')}::${cakeMessage}::${specialInstructions}`;

      setCartItems((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.cartItemId === signatureKey
        );
        if (existingIndex > -1) {
          const clone = [...prev];
          clone[existingIndex] = {
            ...clone[existingIndex],
            quantity: clone[existingIndex].quantity + addQty,
          };
          return clone;
        }
        return [
          ...prev,
          {
            cartItemId: signatureKey,
            cakeId: cake.id,
            name: cake.name,
            image_url: cake.image_url,
            basePrice: cake.basePrice,
            addonsUnitPrice: computedAddons,
            unitPrice,
            quantity: addQty,
            weight: cake.weight,
            selectedOptionIds,
            selectedOptionNames,
            cakeMessage,
            specialInstructions: specialInstructions || undefined,
          },
        ];
      });

      triggerToast(
        `${addQty > 1 ? `${addQty}× ` : ''}${cake.name} আপনার Order Bag-এ যোগ হয়েছে`
      );
    },
    [triggerToast]
  );

  const handleQuickAdd = useCallback(
    (cake: CakeItem, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (cake.isAvailable === false) {
        triggerToast(`"${cake.name}" is currently unavailable.`);
        return;
      }
      setActiveHeroCakeId(cake.id);
      const groups = getEffectiveOptionGroups(cake);
      const defaultChoices = groups.flatMap((g) => {
        const flagged = g.choices.filter((c) => c.defaultSelected);
        if (flagged.length > 0) return flagged;
        return g.required && g.choices[0] ? [g.choices[0]] : [];
      });
      const addonsSum = defaultChoices.reduce(
        (sum, ch) => sum + (ch.priceDelta || 0),
        0
      );
      handleAddCustomizedToCart(
        cake,
        defaultChoices.map((o) => o.id),
        defaultChoices.map((o) => o.name),
        cake.basePrice + addonsSum,
        '',
        1,
        '',
        addonsSum
      );
    },
    [handleAddCustomizedToCart, triggerToast]
  );

  const handleSelectCakeForDetail = useCallback((cake: CakeItem) => {
    setActiveHeroCakeId(cake.id);
    setIsWheelFullscreen(false);
    setDetailCakeId(cake.id);
  }, []);

  const handleUpdateQuantity = useCallback(
    (cartItemId: string, delta: number) => {
      setCartItems((prev) =>
        prev
          .map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, quantity: item.quantity + delta }
              : item
          )
          .filter((item) => item.quantity > 0)
      );
    },
    []
  );

  const handleUpdateItemMessage = useCallback(
    (cartItemId: string, msg: string) => {
      setCartItems((prev) =>
        prev.map((item) =>
          item.cartItemId === cartItemId ? { ...item, cakeMessage: msg } : item
        )
      );
    },
    []
  );

  const handleRemoveCartItem = useCallback((cartItemId: string) => {
    setCartItems((prev) =>
      prev.filter((item) => item.cartItemId !== cartItemId)
    );
  }, []);

  const handleClearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const handleApplyPromoCode = useCallback(
    (code: string, discountPercent?: number) => {
      setPromoCode(code);
      const pct = discountPercent ?? siteContent.promoDiscountPercent;
      triggerToast(`Promo Code ${code} (${pct}% Discount) চালু হয়েছে!`);
    },
    [triggerToast, siteContent.promoDiscountPercent]
  );

  const totalCartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const totalCartAmount = useMemo(
    () =>
      cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cartItems]
  );

  const currency = siteContent.currency || storeConfig.currency;
  const brandName = siteContent.brandName || storeConfig.brandName;
  const tagline = siteContent.tagline || storeConfig.tagline;
  const city = siteContent.city || storeConfig.city;
  const freeDeliveryMin =
    siteContent.freeDeliveryMin ?? storeConfig.freeDeliveryMin;

  return (
    <div
      id="top"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-ink)' }}
      className="w-full min-h-[100dvh] overflow-x-clip chromatic-transition relative"
    >
      {/* Desktop-only subtle floating toggle to switch between Mobile App Frame & Full Web View */}
      {isMobileLocked && (
        <button
          type="button"
          onClick={() => setIsMobileLocked(false)}
          className="hidden lg:inline-flex fixed top-4 right-5 z-40 items-center gap-1.5 rounded-full bg-white/90 hover:bg-white border-[1px] border-black/8 px-3 py-1.5 text-[0.72rem] font-semibold text-stone-700 shadow-sm cursor-pointer backdrop-blur-md"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Web View</span>
        </button>
      )}

      <div
        className={
          isMobileLocked
            ? 'w-full max-w-[430px] mx-auto min-h-[100dvh] relative overflow-x-clip shadow-2xl sm:border-x-[1px] sm:border-white/70 bg-[var(--bg-canvas)] chromatic-transition'
            : 'w-full min-h-[100dvh] relative'
        }
      >
        {/* Video 1 Reference: Animated 3D-Shaded Hand + Draped Silk Curtain Above Header */}
        <PullToRefreshCurtain onRefresh={refreshFromServer}>
          {/* 1. Compact Native Mobile App Header */}
          <TopNavbar
            siteContent={siteContent}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            cartCount={totalCartCount}
            cartTotal={totalCartAmount}
            wishlistCount={wishlistIds.length}
            showWishlistOnly={showWishlistOnly}
            onToggleWishlistFilter={() => setShowWishlistOnly((p) => !p)}
            onOpenCart={() => setIsCartOpen(true)}
            isMobileLocked={isMobileLocked}
            onToggleMobileLock={() => setIsMobileLocked((p) => !p)}
            onOpenAdmin={handleOpenAdmin}
          />

          {/* Main Responsive Content Container (% widths) */}
          <main
            className={`mx-auto w-full ${
              isMobileLocked
                ? 'px-3'
                : 'px-3 sm:px-4 md:max-w-[920px] md:px-6 lg:max-w-[1280px] lg:px-8'
            }`}
          >
            {/* 2. Compact Chromatic Flavor Wave Stage Hero */}
            {activeHeroCake && (
              <ChromaticWaveHero
                siteContent={siteContent}
                heroCakes={heroFlavors}
                activeCake={activeHeroCake}
                onSelectCake={(cake) => setActiveHeroCakeId(cake.id)}
                onCustomizeCake={(cake) => handleSelectCakeForDetail(cake)}
                onQuickAdd={(cake) => handleQuickAdd(cake)}
                isMobileLocked={isMobileLocked}
              />
            )}

            {/* 3. Responsive Bento Discovery Feed */}
            <HomeFeed
              siteContent={siteContent}
              categories={categories}
              cakes={filteredCakes}
              allCakes={menuCakes}
              matchedBadgesMap={matchedBadgesMap}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              wishlistIds={wishlistIds}
              onToggleWishlist={handleToggleWishlist}
              onSelectCakeForDetail={handleSelectCakeForDetail}
              onQuickAddToCart={handleQuickAdd}
              onApplyPromoCode={handleApplyPromoCode}
              onOpenWheel={() => setIsWheelFullscreen(true)}
              activePromoCode={promoCode}
              isMobileLocked={isMobileLocked}
            />

            {/* 4. Video 2 Reference: Compact Orbital Cake Wheel Showcase */}
            {menuCakes.length > 0 && (
              <section className="w-full pb-5">
                <OrbitalCakeWheel
                  cakes={menuCakes}
                  siteContent={siteContent}
                  activeCakeId={activeHeroCake?.id}
                  onActiveCakeChange={(cake) => setActiveHeroCakeId(cake.id)}
                  onSelectCakeForDetail={handleSelectCakeForDetail}
                  mode="inline"
                />
              </section>
            )}
          </main>

          {/* Compact White-Label Patisserie Footer */}
          <footer
            className={`mx-auto w-full pb-20 ${
              isMobileLocked
                ? 'px-3'
                : 'px-3 sm:px-4 md:max-w-[920px] md:px-6 lg:max-w-[1280px] lg:px-8'
            }`}
          >
            <div className="bg-white/65 backdrop-blur-md rounded-[22px] p-3.5 border-[1px] border-white/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[0.7rem] text-stone-500">
              <div className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: 'var(--dark-btn)' }}
                  className="w-5 h-5 rounded-full text-white flex items-center justify-center font-display font-bold text-[0.6rem] chromatic-transition"
                >
                  SC
                </span>
                <span className="font-semibold text-stone-800">
                  {brandName} — {tagline}
                </span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span>{city}</span>
                <span>•</span>
                <span>
                  Free Delivery: {currency}
                  {freeDeliveryMin}+
                </span>
              </div>
            </div>
          </footer>
        </PullToRefreshCurtain>

        {/* Floating Mobile Bottom Cart Bar with Safe-Area Inset */}
        <AnimatePresence>
          {totalCartCount > 0 &&
            !isCartOpen &&
            !detailCake &&
            !isAdminOpen &&
            !isWheelFullscreen && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className={`fixed bottom-[calc(0.85rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 w-full ${
                  isMobileLocked ? 'max-w-[400px]' : 'max-w-[400px] md:hidden'
                } px-3.5`}
              >
                <button
                  onClick={() => setIsCartOpen(true)}
                  style={{ backgroundColor: 'var(--dark-btn)' }}
                  className="w-full rounded-full pl-5 pr-2.5 py-2.5 text-white shadow-2xl border-[1px] border-white/20 flex items-center justify-between cursor-pointer chromatic-transition"
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="font-display text-[0.75rem] font-extrabold py-0.5">
                      {siteContent.cartTitle} ({totalCartCount})
                    </span>
                  </div>
                  <span className="rounded-full bg-white text-stone-900 px-3.5 py-1.5 text-[0.75rem] font-black tabular-nums">
                    {currency} {totalCartAmount.toLocaleString('en-US')}
                  </span>
                </button>
              </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Fullscreen 100dvh Video-2 Orbital Taste Wheel Modal */}
      <AnimatePresence>
        {isWheelFullscreen && menuCakes.length > 0 && (
          <OrbitalCakeWheel
            cakes={menuCakes}
            siteContent={siteContent}
            activeCakeId={activeHeroCake?.id}
            onActiveCakeChange={(cake) => setActiveHeroCakeId(cake.id)}
            onSelectCakeForDetail={handleSelectCakeForDetail}
            mode="fullscreen"
            onCloseFullscreen={() => setIsWheelFullscreen(false)}
          />
        )}
      </AnimatePresence>

      {/* 5. Upgraded Curved-Arch Ingredients + 3-Tier Bento Customizer Modal / Sheet */}
      <CakeDetailSheet
        siteContent={siteContent}
        cake={detailCake}
        isOpen={Boolean(detailCake)}
        onClose={() => setDetailCakeId(null)}
        isWishlisted={
          detailCake ? wishlistIds.includes(detailCake.id) : false
        }
        onToggleWishlist={(id) => handleToggleWishlist(id)}
        onAddCustomizedToCart={handleAddCustomizedToCart}
        isMobileLocked={isMobileLocked}
      />

      {/* 6. Adaptive Glassmorphic Cart Drawer / Sheet with Fireworks Celebration */}
      <CartDrawer
        siteContent={siteContent}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onUpdateItemMessage={handleUpdateItemMessage}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        promoCode={promoCode}
        onChangePromoCode={setPromoCode}
        isMobileLocked={isMobileLocked}
      />

      {/* 7. Lazy-Loaded "The MK" High-Security Admin Panel (`#admin` or Man icon) */}
      {isAdminOpen && (
        <Suspense fallback={null}>
          <AdminPanel
            isOpen={isAdminOpen}
            onClose={handleCloseAdmin}
            onTriggerToast={triggerToast}
          />
        </Suspense>
      )}

      {/* Tactile Capsule Toast Notification (hidden when Order Bag is open so header stays clear) */}
      <AnimatePresence>
        {toastMessage && !isCartOpen && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.9 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] rounded-full bg-stone-900/95 text-white px-3.5 py-1.5 text-[0.72rem] font-semibold shadow-xl flex items-center gap-2 border-[1px] border-white/15 pointer-events-none max-w-[90vw]"
          >
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
            <span className="truncate py-0.5">{toastMessage}</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function App() {
  return (
    <StoreProvider>
      <StorefrontApp />
    </StoreProvider>
  );
}

export default App;
