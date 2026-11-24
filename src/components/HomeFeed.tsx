import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Star, Sparkles, Check, Tag, ArrowUpRight, Disc3 } from 'lucide-react';
import { CakeItem, CategoryItem } from '../data/cakesData';
import { storeConfig } from '../config/storeConfig';
import { SiteContent } from '../config/siteContent';
import { getAdaptiveImageUrl } from '../utils/cacheEngine';

/**
 * Pure client-side rating-to-emoji expression engine (zero API calls).
 * Maps any rating score to an expressive animated emoji & Bangla mood label.
 */
export function getRatingExpression(rating: number) {
  if (rating >= 4.9) {
    return {
      emoji: '🤩',
      label: 'দারুণ পছন্দ',
      animate: { scale: [1, 1.18, 1], rotate: [-5, 5, -5] },
    };
  }
  if (rating >= 4.6) {
    return {
      emoji: '😍',
      label: 'অসাধারণ',
      animate: { scale: [1, 1.14, 1], y: [0, -2, 0] },
    };
  }
  if (rating >= 4.0) {
    return {
      emoji: '😋',
      label: 'খুবই মজার',
      animate: { rotate: [-7, 7, -7], scale: [1, 1.1, 1] },
    };
  }
  if (rating >= 3.0) {
    return {
      emoji: '😊',
      label: 'ভালো',
      animate: { y: [0, -2, 0] },
    };
  }
  return {
    emoji: '🙂',
    label: 'মোটামুটি',
    animate: { opacity: [0.85, 1, 0.85] },
  };
}

export interface HomeFeedProps {
  siteContent: SiteContent;
  cakes: CakeItem[];
  allCakes?: CakeItem[];
  categories?: CategoryItem[];
  matchedBadgesMap?: Record<string, string[]>;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  wishlistIds: string[];
  onToggleWishlist: (cakeId: string, e: React.MouseEvent) => void;
  onSelectCakeForDetail: (cake: CakeItem) => void;
  onQuickAddToCart: (cake: CakeItem, e: React.MouseEvent) => void;
  onApplyPromoCode: (code: string, discountPercent?: number) => void;
  onOpenWheel?: () => void;
  activePromoCode: string;
  isMobileLocked?: boolean;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  siteContent,
  cakes,
  allCakes,
  categories,
  matchedBadgesMap = {},
  selectedCategory,
  onSelectCategory,
  wishlistIds,
  onToggleWishlist,
  onSelectCakeForDetail,
  onApplyPromoCode,
  onOpenWheel,
  activePromoCode,
  isMobileLocked = false,
}) => {
  const [promoExpanded, setPromoExpanded] = useState(false);

  const visibleCategoryPills = [
    {
      id: 'সব কেক',
      label: 'সব কেক',
      shortLabel: 'সব কেক',
      image_url: storeConfig.categories[0]?.image_url || '',
    },
    ...(categories && categories.length > 0
      ? categories
          .filter((c) => c.isVisible !== false)
          .map((c) => ({
            id: c.name,
            label: c.name,
            shortLabel: c.name,
            image_url: c.image_url || storeConfig.categories[0]?.image_url || '',
          }))
      : storeConfig.categories.slice(1)),
  ];

  const activeOffers = (siteContent.offers || []).filter((o) => o.isActive);
  const displayOffers =
    activeOffers.length > 0
      ? activeOffers
      : [
          {
            id: 'default-offer',
            badge: siteContent.bannerBadge,
            title: siteContent.bannerTitle,
            subtitle: siteContent.bannerSubtitle,
            description: siteContent.bannerDescription,
            ctaText: siteContent.bannerCta,
            promoCode: siteContent.promoCode,
            discountPercent: siteContent.promoDiscountPercent,
            imageUrl:
              siteContent.bannerImageUrl || storeConfig.promoBanner.image_url,
            isActive: true,
          },
        ];

  const matchedActiveOffer = displayOffers.find(
    (o) => o.promoCode.toUpperCase() === activePromoCode.toUpperCase()
  );
  const isPromoApplied = Boolean(matchedActiveOffer);
  const activeDiscountPercent = matchedActiveOffer
    ? matchedActiveOffer.discountPercent
    : siteContent.promoDiscountPercent;

  const catalogSource = allCakes && allCakes.length > 0 ? allCakes : cakes;
  const visibleHomeSections = (siteContent.homeSections || []).filter(
    (sec) => sec.isVisible && sec.cakeIds.length > 0
  );

  return (
    <div className="w-full space-y-2.5 pb-6">
      {/* SECTION 1: Header + Horizontal Momentum Snap Category Scroller */}
      <section>
        <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
          <h2 className="font-display text-[1.08rem] sm:text-[1.15rem] font-bold text-stone-900 tracking-tight leading-[1.35]">
            {siteContent.popularTitle}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenWheel && (
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={onOpenWheel}
                className="inline-flex items-center gap-1 rounded-full bg-stone-900 text-white px-2.5 py-1 text-[0.66rem] font-semibold shadow-2xs hover:opacity-90 cursor-pointer"
              >
                <Disc3 className="w-3 h-3 text-amber-300 animate-spin [animation-duration:6s]" />
                <span>Taste Wheel</span>
              </motion.button>
            )}
            <button
              onClick={() => onSelectCategory(siteContent.categories[0] || 'সব কেক')}
              className="text-[0.72rem] font-medium text-stone-500 hover:text-stone-900 transition-colors cursor-pointer py-0.5 px-1"
            >
              {siteContent.viewAllText}
            </button>
          </div>
        </div>

        {/* Momentum Horizontal Pill Bar (Synced Live with Supabase Categories) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory py-0.5 px-0.5">
          {visibleCategoryPills.map((cat) => {
            const isActive = selectedCategory === cat.id;

            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => onSelectCategory(cat.id)}
                className={`relative shrink-0 snap-start min-h-[34px] rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-2xs border-[1px] transition-colors cursor-pointer ${
                  isActive
                    ? 'text-white border-transparent'
                    : 'bg-white/90 hover:bg-white text-stone-800 border-black/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryPill"
                    style={{ backgroundColor: 'var(--dark-btn)' }}
                    className="absolute inset-0 rounded-full shadow-sm chromatic-transition"
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  />
                )}
                <span className="relative z-10 w-5 h-5 rounded-full overflow-hidden bg-stone-100 border-[1px] border-black/10 shrink-0">
                  <img
                    src={getAdaptiveImageUrl(cat.image_url, 'thumb')}
                    alt={cat.label}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </span>
                <span className="relative z-10 text-[0.72rem] font-semibold tracking-tight whitespace-nowrap py-0.5 leading-[1.3]">
                  {isMobileLocked ? cat.shortLabel : cat.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: Slim Obsidian Contrast Promo Offers (Supports 1 or Multiple Admin Offers) */}
      <section>
        <div
          className={
            displayOffers.length > 1
              ? 'flex items-stretch gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory'
              : 'w-full'
          }
        >
          {displayOffers.map((offer) => {
            const offerApplied =
              activePromoCode.toUpperCase() === offer.promoCode.toUpperCase();
            return (
              <motion.div
                key={offer.id}
                whileHover={{ scale: 1.006 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  onApplyPromoCode(offer.promoCode, offer.discountPercent);
                  setPromoExpanded((prev) => !prev);
                }}
                className={`${
                  displayOffers.length > 1 ? 'w-[92%] shrink-0 snap-center' : 'w-full'
                } relative bg-[#111111] text-white rounded-[20px] min-h-[76px] overflow-hidden flex items-center justify-between px-3.5 py-2 shadow-lg cursor-pointer select-none group border-[1px] border-white/10`}
              >
                <div
                  style={{ backgroundColor: 'var(--theme-wave)' }}
                  className="absolute -left-8 -bottom-10 w-36 h-36 rounded-full blur-3xl opacity-30 pointer-events-none chromatic-transition"
                />
                <div
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                  className="absolute right-12 -top-12 w-32 h-32 rounded-full blur-3xl opacity-25 pointer-events-none chromatic-transition"
                />

                {/* Left: Angled Cake Cutout */}
                <div className="relative z-10 flex items-center gap-2.5 shrink-0">
                  <motion.div
                    animate={{ rotate: [-6, -3, -6], y: [0, -1.5, 0] }}
                    transition={{
                      duration: 4.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="w-13 h-13 rounded-[14px] overflow-hidden shadow-xl border-[1px] border-white/15 shrink-0"
                  >
                    <img
                      src={getAdaptiveImageUrl(
                        offer.imageUrl || storeConfig.promoBanner.image_url,
                        'banner'
                      )}
                      alt={offer.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    />
                  </motion.div>
                </div>

                {/* Right: Promo Text + CTA */}
                <div className="relative z-10 flex-1 pl-3 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[0.6rem] font-semibold tracking-wide text-amber-300 mb-0.5 whitespace-nowrap">
                      <Sparkles className="w-2.5 h-2.5 shrink-0" />
                      <span>{offer.badge}</span>
                    </div>
                    <h3 className="font-display text-[1rem] sm:text-[1.1rem] font-bold text-white tracking-tight leading-[1.2] truncate">
                      {offer.title}
                    </h3>
                    <p className="text-[0.65rem] text-stone-300 font-normal mt-0.5 truncate">
                      {offerApplied
                        ? `✓ ${offer.promoCode} Promo Code চালু হয়েছে!`
                        : offer.subtitle}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold inline-flex items-center gap-1 whitespace-nowrap transition-all ${
                        offerApplied
                          ? 'bg-emerald-400 text-stone-950'
                          : 'bg-[#FAF7F2] text-stone-900 group-hover:bg-white'
                      }`}
                    >
                      {offerApplied ? (
                        <>
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>{siteContent.bannerAppliedCta}</span>
                        </>
                      ) : (
                        <>
                          <Tag className="w-2.5 h-2.5" />
                          <span>{offer.ctaText}</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {promoExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-[18px] bg-stone-900 text-stone-100 px-3.5 py-2.5 text-[0.7rem] flex items-center justify-between gap-2.5">
                <span>
                  {matchedActiveOffer?.description ||
                    displayOffers[0]?.description ||
                    storeConfig.promoBanner.description}
                </span>
                <span className="shrink-0 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 font-bold">
                  {matchedActiveOffer?.promoCode ||
                    displayOffers[0]?.promoCode ||
                    siteContent.promoCode}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* SECTION 3: 2-Column Phone / Multi-Column Desktop Squircle Grid */}
      <section>
        {cakes.length === 0 ? (
          <div className="bg-[#FAF7F2] rounded-[28px] p-10 text-center bento-shadow">
            <p className="font-display text-lg font-extrabold text-stone-800 leading-[1.45]">
              {siteContent.emptySearchText}
            </p>
            <button
              onClick={() =>
                onSelectCategory(siteContent.categories[0] || 'সব কেক')
              }
              style={{ backgroundColor: 'var(--dark-btn)' }}
              className="mt-4 rounded-full px-5 py-2.5 text-xs font-bold text-white cursor-pointer"
            >
              {siteContent.resetFilterBtn}
            </button>
          </div>
        ) : (
          <motion.div
            layout
            className={`grid ${
              isMobileLocked
                ? 'grid-cols-2 gap-2.5'
                : 'grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-4 md:gap-5'
            }`}
          >
            <AnimatePresence mode="popLayout">
              {cakes.map((cake, idx) => {
                const isWishlisted = wishlistIds.includes(cake.id);
                const expression = getRatingExpression(cake.rating);
                const regularPrice = cake.originalPrice ?? cake.basePrice;
                const displayPrice = isPromoApplied
                  ? Math.round(
                      cake.basePrice *
                        (1 - activeDiscountPercent / 100)
                    )
                  : cake.basePrice;
                const hasOffer =
                  isPromoApplied ||
                  Boolean(
                    cake.originalPrice && cake.originalPrice > cake.basePrice
                  );

                return (
                  <motion.article
                    layout
                    key={cake.id}
                    initial={{ opacity: 0, scale: 0.92, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      type: 'spring',
                      stiffness: 340,
                      damping: 26,
                      delay: Math.min(idx * 0.04, 0.2),
                    }}
                    onClick={() => onSelectCakeForDetail(cake)}
                    className="bg-[#FAF7F2] rounded-[20px] p-2.5 bento-shadow bento-card-hover flex flex-col justify-between cursor-pointer select-none group relative overflow-hidden border-[1px] border-white/85 gpu-smooth"
                  >
                    <div
                      style={{ backgroundColor: cake.theme.wave }}
                      className="absolute -right-8 -top-8 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-25 transition-opacity duration-300 pointer-events-none"
                    />

                    {/* Top Row: Compact Heart Button + Offer/Weight Pill */}
                    <div className="flex items-center justify-between z-10">
                      <motion.button
                        whileTap={{ scale: 0.82 }}
                        onClick={(e) => onToggleWishlist(cake.id, e)}
                        aria-label={`Save to Wishlist: ${cake.name}`}
                        className="w-8 h-8 rounded-full bg-white/85 hover:bg-white flex items-center justify-center shadow-2xs border-[1px] border-black/5 cursor-pointer"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 transition-colors ${
                            isWishlisted
                              ? 'fill-rose-500 text-rose-500'
                              : 'text-stone-400 hover:text-stone-700'
                          }`}
                        />
                      </motion.button>

                      <div className="flex items-center gap-1">
                        {cake.isAvailable === false ? (
                          <span className="text-[0.58rem] font-semibold text-stone-600 bg-stone-200 rounded-full px-1.5 py-0.5">
                            Sold Out
                          </span>
                        ) : (
                          hasOffer && (
                            <span className="text-[0.58rem] font-semibold text-rose-600 bg-rose-100/90 rounded-full px-1.5 py-0.5">
                              Offer
                            </span>
                          )
                        )}
                        <span className="text-[0.6rem] font-medium text-stone-500 bg-stone-200/55 rounded-full px-1.5 py-0.5">
                          {cake.weight}
                        </span>
                      </div>
                    </div>

                    {/* Center: Compact Overhead Cake Cutout */}
                    <div className="my-1.5 flex items-center justify-center relative">
                      <motion.div
                        whileHover={{ scale: 1.06, rotate: -2 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                        className="w-[5.25rem] h-[5.25rem] rounded-full bg-white p-1 shadow-[0_10px_18px_rgba(28,25,23,0.12)] border-[2px] border-white overflow-hidden"
                      >
                        <img
                          src={getAdaptiveImageUrl(cake.image_url, 'card')}
                          alt={cake.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover rounded-full"
                        />
                      </motion.div>

                      {cake.badge && (
                        <span
                          style={{ backgroundColor: cake.theme.surface, color: cake.theme.accent }}
                          className="absolute -bottom-1 left-0.5 rounded-full px-1.5 py-0.5 text-[0.56rem] font-semibold border-[1px] border-white shadow-2xs"
                        >
                          {cake.badge}
                        </span>
                      )}

                      <span
                        style={{ backgroundColor: cake.theme.darkBtn }}
                        className="absolute bottom-0 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold text-white flex items-center gap-0.5 shadow-md"
                      >
                        <span>View</span>
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </span>
                    </div>

                    {/* Bottom Info: Refined Title + Price + Animated Rating Mood Emoji */}
                    <div className="z-10 pt-0.5">
                      {matchedBadgesMap[cake.id] &&
                        matchedBadgesMap[cake.id].length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-0.5">
                            {matchedBadgesMap[cake.id].map((badge) => (
                              <span
                                key={badge}
                                className="rounded-full bg-amber-100/90 text-amber-900 px-1.5 py-0.5 text-[0.58rem] font-semibold"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      <h3 className="font-display font-semibold text-[0.8rem] text-stone-900 tracking-tight leading-[1.3] truncate">
                        {cake.name}
                      </h3>

                      <div className="mt-1 flex items-center justify-between gap-1">
                        <div className="flex items-baseline gap-1 min-w-0">
                          <span className="font-bold text-[0.8rem] text-stone-900 tabular-nums whitespace-nowrap">
                            {siteContent.currency}{' '}
                            {displayPrice.toLocaleString('en-US')}
                          </span>
                          {hasOffer && (
                            <span className="text-[0.62rem] font-medium text-stone-400 line-through tabular-nums whitespace-nowrap">
                              {siteContent.currency}
                              {regularPrice.toLocaleString('en-US')}
                            </span>
                          )}
                        </div>

                        <div
                          title={`${cake.rating.toFixed(1)} (${cake.reviewsCount}) — ${expression.label}`}
                          className="flex items-center gap-0.5 text-[0.65rem] font-semibold text-stone-600 shrink-0 bg-white/85 rounded-full px-1.5 py-0.5 border-[1px] border-black/5 shadow-2xs"
                        >
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span className="tabular-nums">
                            {cake.rating.toFixed(1)}
                          </span>
                          <motion.span
                            aria-label={expression.label}
                            animate={expression.animate}
                            transition={{
                              duration: 2.6 + (idx % 3) * 0.4,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                            className="inline-block text-[0.75rem] leading-none origin-center select-none"
                          >
                            {expression.emoji}
                          </motion.span>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* SECTION 4: Dynamic Admin-Curated Home Page Food Sections */}
      {visibleHomeSections.map((sec) => {
        const sectionCakes = sec.cakeIds
          .map((id) => catalogSource.find((c) => c.id === id))
          .filter((c): c is CakeItem => Boolean(c));
        if (sectionCakes.length === 0) return null;

        return (
          <section key={sec.id} className="pt-1 space-y-2">
            <div className="flex items-baseline justify-between gap-2 px-0.5">
              <div className="min-w-0">
                <h3 className="font-display text-[1rem] font-bold text-stone-900 leading-tight truncate">
                  {sec.title}
                </h3>
                {sec.subtitle && (
                  <p className="text-[0.68rem] text-stone-500 font-medium truncate">
                    {sec.subtitle}
                  </p>
                )}
              </div>
              <span className="text-[0.65rem] font-semibold text-stone-400 shrink-0">
                {sectionCakes.length} items
              </span>
            </div>

            <div className="flex items-stretch gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 px-0.5">
              {sectionCakes.map((cake) => {
                const mood = getRatingExpression(cake.rating);
                return (
                  <motion.button
                    key={`${sec.id}-${cake.id}`}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onSelectCakeForDetail(cake)}
                    className="shrink-0 snap-start w-[142px] bg-[#FAF7F2] rounded-[20px] p-2.5 border-[1px] border-white/85 bento-shadow text-left flex flex-col justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      {cake.badge ? (
                        <span
                          style={{
                            backgroundColor: cake.theme.surface,
                            color: cake.theme.accent,
                          }}
                          className="rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold truncate max-w-[82px]"
                        >
                          {cake.badge}
                        </span>
                      ) : (
                        <span className="text-[0.55rem] font-medium text-stone-400">
                          {cake.weight}
                        </span>
                      )}
                      <span className="text-[0.62rem] font-semibold text-stone-600 inline-flex items-center gap-0.5">
                        ★ {cake.rating.toFixed(1)}
                        <span>{mood.emoji}</span>
                      </span>
                    </div>

                    <div className="w-[4.5rem] h-[4.5rem] mx-auto rounded-full bg-white p-1 shadow-sm border-[2px] border-white overflow-hidden">
                      <img
                        src={getAdaptiveImageUrl(cake.image_url, 'card')}
                        alt={cake.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>

                    <div>
                      <p className="font-display text-[0.76rem] font-semibold text-stone-900 truncate">
                        {cake.name}
                      </p>
                      <div className="flex items-baseline justify-between mt-0.5">
                        <span className="text-[0.76rem] font-bold text-stone-900 tabular-nums">
                          {siteContent.currency} {cake.basePrice.toLocaleString('en-US')}
                        </span>
                        <span className="text-[0.6rem] font-medium text-stone-500">
                          {cake.prepMins}m
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default HomeFeed;
