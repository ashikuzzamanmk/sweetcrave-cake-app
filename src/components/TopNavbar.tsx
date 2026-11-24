import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Heart,
  ShoppingBag,
  MapPin,
  CakeSlice,
  Smartphone,
  User,
} from 'lucide-react';
import { SiteContent } from '../config/siteContent';
import { SMART_SEARCH_SUGGESTIONS } from '../utils/smartSearch';

export interface TopNavbarProps {
  siteContent: SiteContent;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cartCount: number;
  cartTotal: number;
  wishlistCount: number;
  showWishlistOnly: boolean;
  onToggleWishlistFilter: () => void;
  onOpenCart: () => void;
  onOpenAdmin?: () => void;
  isMobileLocked?: boolean;
  onToggleMobileLock?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  siteContent,
  searchQuery,
  onSearchChange,
  cartCount,
  cartTotal,
  wishlistCount,
  showWishlistOnly,
  onToggleWishlistFilter,
  onOpenCart,
  onOpenAdmin,
  isMobileLocked = false,
  onToggleMobileLock,
}) => {
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [desktopSearchFocused, setDesktopSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchExpanded) {
      const t = window.setTimeout(() => searchInputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [searchExpanded]);

  const showSuggestionBar =
    searchExpanded || desktopSearchFocused || Boolean(searchQuery.trim());

  const handleCloseSearch = () => {
    setSearchExpanded(false);
    onSearchChange('');
  };

  return (
    <header className="sticky top-0 z-30 w-full pt-[calc(0.35rem+env(safe-area-inset-top))] pb-1.5 transition-colors duration-450">
      <div
        className={`mx-auto w-full ${
          isMobileLocked
            ? 'px-3'
            : 'px-3 sm:px-4 md:max-w-[920px] md:px-6 lg:max-w-[1280px] lg:px-8'
        }`}
      >
        {/* Ultra-Slim Native App Top Pill Bar */}
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className={`bg-white/88 backdrop-blur-xl border-[1px] border-white/90 rounded-full px-1.5 md:px-3.5 bento-shadow flex items-center justify-between gap-1.5 ${
            searchExpanded ? 'h-11' : isMobileLocked ? 'h-10' : 'h-10 md:h-12'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {searchExpanded ? (
              /* EXPANDED BIG SEARCH BAR (Smoothly expands when corner search icon is clicked) */
              <motion.div
                key="expanded-search"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="w-full flex items-center gap-2 px-1.5"
              >
                <span
                  style={{ backgroundColor: 'var(--dark-btn)' }}
                  className="w-7 h-7 rounded-full text-white flex items-center justify-center shrink-0 chromatic-transition"
                >
                  <Search className="w-3.5 h-3.5 stroke-[2.3]" />
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={siteContent.searchPlaceholder}
                  className="flex-1 min-w-0 bg-transparent text-[16px] font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="Clear search text"
                    className="text-[0.68rem] font-bold text-stone-500 hover:text-stone-900 px-1.5 cursor-pointer shrink-0"
                  >
                    Clear
                  </button>
                )}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  type="button"
                  onClick={handleCloseSearch}
                  aria-label="Close search"
                  className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.4]" />
                </motion.button>
              </motion.div>
            ) : (
              /* DEFAULT COMPACT HEADER BAR */
              <motion.div
                key="compact-bar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full flex items-center justify-between gap-1"
              >
                {/* LEFT CORNER: Cool Expanding Search Icon */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setSearchExpanded(true)}
                    aria-label="Open search"
                    title="Search Cakes & Flavors"
                    style={{ backgroundColor: 'var(--dark-btn)' }}
                    className={`${
                      isMobileLocked ? 'flex' : 'flex md:hidden'
                    } w-8 h-8 rounded-full text-white items-center justify-center shadow-xs cursor-pointer chromatic-transition`}
                  >
                    <Search className="w-3.5 h-3.5 stroke-[2.3]" />
                  </motion.button>

                  {/* Desktop Brand Pill + Location */}
                  <div
                    className={`${
                      isMobileLocked ? 'hidden' : 'hidden md:flex'
                    } items-center gap-2.5`}
                  >
                    <a
                      href="#top"
                      className="flex items-center gap-2 bg-[var(--dark-btn)] text-white rounded-full pl-2 pr-3 py-1 shadow-xs transition-colors duration-450"
                    >
                      <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
                        <CakeSlice className="w-3.5 h-3.5 text-white" />
                      </span>
                      <span className="font-display font-bold text-[0.8rem] leading-[1.3] tracking-tight">
                        {siteContent.brandName}
                      </span>
                    </a>

                    <div className="flex items-center gap-1.5 bg-[#FAF7F2] border-[1px] border-black/5 rounded-full px-2.5 py-1">
                      <MapPin
                        className="w-3 h-3 shrink-0"
                        style={{ color: 'var(--accent-primary)' }}
                      />
                      <span className="text-[0.7rem] font-semibold text-stone-800">
                        {siteContent.city}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CENTER: Compact Location Label OR Desktop Search */}
                <div className="flex-1 flex items-center justify-center min-w-0">
                  <div
                    className={`${
                      isMobileLocked ? 'flex' : 'flex md:hidden'
                    } flex-col items-center justify-center text-center select-none max-w-[140px]`}
                  >
                    <span className="text-[0.54rem] font-medium text-stone-400 leading-none">
                      {siteContent.locationLabel}
                    </span>
                    <span className="font-display text-[0.72rem] font-bold text-stone-900 leading-[1.2] truncate max-w-full mt-0.5">
                      {siteContent.city}
                    </span>
                  </div>

                  {/* Desktop Wide Search Bar */}
                  <div
                    className={`${
                      isMobileLocked ? 'hidden' : 'hidden md:flex'
                    } relative w-60 lg:w-80 items-center`}
                  >
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onFocus={() => setDesktopSearchFocused(true)}
                      onBlur={() =>
                        setTimeout(() => setDesktopSearchFocused(false), 180)
                      }
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder={siteContent.searchPlaceholder}
                      className="w-full rounded-full bg-[#FAF7F2] border-[1px] border-black/6 pl-9 pr-8 py-1.5 text-[0.75rem] font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:bg-white transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-2.5 w-4 h-4 rounded-full bg-stone-200/80 hover:bg-stone-300 flex items-center justify-center text-stone-600 cursor-pointer"
                        aria-label="Clear search"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* RIGHT CORNER: Wishlist + Order Bag + Cool Man Icon for "The MK" Admin */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {onToggleMobileLock && !isMobileLocked && (
                    <button
                      onClick={onToggleMobileLock}
                      title="Mobile App View (430px)"
                      className="hidden lg:flex items-center gap-1 rounded-full bg-[#FAF7F2] hover:bg-white border-[1px] border-black/6 px-2.5 h-7 text-[0.68rem] font-semibold text-stone-700 cursor-pointer transition-all"
                    >
                      <Smartphone className="w-3 h-3 text-stone-700" />
                      <span>Mobile</span>
                    </button>
                  )}

                  {/* Compact Wishlist Button */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onToggleWishlistFilter}
                    aria-label="Wishlist"
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center border-[1px] transition-all cursor-pointer shrink-0 ${
                      showWishlistOnly
                        ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                        : 'bg-[#FAF7F2] text-stone-700 border-black/6 hover:bg-white'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        showWishlistOnly ? 'fill-white text-white' : 'text-stone-700'
                      }`}
                    />
                    {wishlistCount > 0 && (
                      <span
                        className={`absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full text-[0.54rem] font-bold flex items-center justify-center ${
                          showWishlistOnly
                            ? 'bg-white text-rose-600'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {wishlistCount}
                      </span>
                    )}
                  </motion.button>

                  {/* Mobile Compact Cart Bag Button */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onOpenCart}
                    aria-label="Open Order Bag"
                    style={{ backgroundColor: 'var(--dark-btn)' }}
                    className={`${
                      isMobileLocked ? 'flex' : 'flex md:hidden'
                    } relative w-8 h-8 rounded-full text-white shadow-xs items-center justify-center cursor-pointer shrink-0 chromatic-transition`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                      className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#E11D48] text-white text-[0.54rem] font-bold flex items-center justify-center border-[1px] border-white"
                    >
                      {cartCount}
                    </motion.span>
                  </motion.button>

                  {/* Desktop Capsule Cart Button */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={onOpenCart}
                    className={`${
                      isMobileLocked ? 'hidden' : 'hidden md:flex'
                    } items-center gap-2 bg-[var(--dark-btn)] text-white rounded-full pl-3 pr-1.5 h-8 shadow-sm hover:opacity-95 cursor-pointer transition-colors duration-450`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span className="text-[0.72rem] font-bold tracking-tight tabular-nums">
                      {siteContent.currency} {cartTotal.toLocaleString('en-US')}
                    </span>
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0.6 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 16 }}
                      className="w-5 h-5 rounded-full bg-white text-stone-900 text-[0.68rem] font-extrabold flex items-center justify-center tabular-nums"
                    >
                      {cartCount}
                    </motion.span>
                  </motion.button>

                  {/* RIGHT CORNER: Cool Man Icon for "The MK" Admin Vault */}
                  {onOpenAdmin && (
                    <motion.button
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.88 }}
                      onClick={onOpenAdmin}
                      aria-label="The MK Admin"
                      title="The MK"
                      className="w-8 h-8 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-300 border-[1px] border-amber-300/30 flex items-center justify-center shadow-xs cursor-pointer shrink-0 transition-colors"
                    >
                      <User className="w-4 h-4 stroke-[2.2]" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Smart Bilingual Quick-Search Pills when search is expanded or active */}
        <AnimatePresence>
          {showSuggestionBar && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden mt-1.5"
            >
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
                <span className="text-[0.62rem] font-bold text-stone-500 shrink-0">
                  Quick:
                </span>
                {SMART_SEARCH_SUGGESTIONS.map((sug) => {
                  const isActive =
                    searchQuery.toLowerCase().trim() ===
                    sug.query.toLowerCase();
                  return (
                    <button
                      key={sug.id}
                      type="button"
                      onClick={() =>
                        onSearchChange(isActive ? '' : sug.query)
                      }
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold border-[1px] transition-all cursor-pointer ${
                        isActive
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white/90 hover:bg-white text-stone-800 border-stone-200/80 shadow-2xs'
                      }`}
                    >
                      {sug.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default TopNavbar;
