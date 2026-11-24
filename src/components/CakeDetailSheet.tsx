import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  Share2,
  MoreVertical,
  Clock,
  Flame,
  Star,
  Plus,
  Minus,
  Check,
  Sparkles,
  Users,
  ShieldCheck,
  Snowflake,
  ChefHat,
  AlertCircle,
} from 'lucide-react';
import {
  CakeItem,
  ProductOptionGroup,
  ProductOptionChoice,
  getEffectiveOptionGroups,
} from '../data/cakesData';
import { storeConfig } from '../config/storeConfig';
import { SiteContent } from '../config/siteContent';
import { getAdaptiveImageUrl } from '../utils/cacheEngine';
import { getRatingExpression } from './HomeFeed';

export interface CakeDetailSheetProps {
  siteContent: SiteContent;
  cake: CakeItem | null;
  isOpen: boolean;
  onClose: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (cakeId: string) => void;
  onAddCustomizedToCart: (
    cake: CakeItem,
    selectedOptionIds: string[],
    selectedOptionNames: string[],
    unitPrice: number,
    cakeMessage: string,
    quantity?: number,
    specialInstructions?: string,
    addonsUnitPrice?: number
  ) => void;
  isMobileLocked?: boolean;
}

export const CakeDetailSheet: React.FC<CakeDetailSheetProps> = ({
  siteContent,
  cake,
  isOpen,
  onClose,
  isWishlisted,
  onToggleWishlist,
  onAddCustomizedToCart,
  isMobileLocked = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [cakeNote, setCakeNote] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [showNoteInput, setShowNoteInput] = useState<boolean>(false);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  const optionGroups = useMemo(
    () => (cake ? getEffectiveOptionGroups(cake) : []),
    [cake]
  );

  const allImages = useMemo(() => {
    if (!cake) return [];
    const extras = (cake.galleryImages || []).filter(
      (u) => u && u !== cake.image_url
    );
    return [cake.image_url, ...extras];
  }, [cake]);

  useEffect(() => {
    if (cake) {
      const defaults: string[] = [];
      for (const grp of getEffectiveOptionGroups(cake)) {
        const defaultChoices = grp.choices.filter((c) => c.defaultSelected);
        if (defaultChoices.length > 0) {
          defaults.push(
            ...(grp.selectionType === 'single'
              ? [defaultChoices[0].id]
              : defaultChoices.map((c) => c.id))
          );
        } else if (grp.required && grp.choices.length > 0) {
          defaults.push(grp.choices[0].id);
        }
      }
      setSelectedIds(defaults);
      setQuantity(1);
      setCakeNote('');
      setSpecialInstructions('');
      setShowNoteInput(false);
      setActiveImageIdx(0);
      setValidationError(null);
    }
  }, [cake]);

  const { addonsUnitPrice, unitPrice } = useMemo(() => {
    if (!cake) return { addonsUnitPrice: 0, unitPrice: 0 };
    let addonsSum = 0;
    for (const grp of optionGroups) {
      for (const ch of grp.choices) {
        if (selectedIds.includes(ch.id)) {
          addonsSum += Math.max(0, ch.priceDelta);
        }
      }
    }
    return {
      addonsUnitPrice: addonsSum,
      unitPrice: cake.basePrice + addonsSum,
    };
  }, [cake, optionGroups, selectedIds]);

  const totalPrice = unitPrice * quantity;

  if (!cake) return null;

  const isUnavailable = cake.isAvailable === false;
  const maxQty = Math.max(
    1,
    Math.min(
      cake.maxOrderQty || 20,
      cake.stockLimit !== null && cake.stockLimit !== undefined && cake.stockLimit > 0
        ? cake.stockLimit
        : 20
    )
  );
  const currency = siteContent.currency || storeConfig.currency;
  const mood = getRatingExpression(cake.rating);
  const sweetness = Math.min(5, Math.max(1, cake.sweetnessLevel ?? 3));
  const activeImageUrl = allImages[activeImageIdx] || cake.image_url;

  const toggleChoice = (
    group: ProductOptionGroup,
    choice: ProductOptionChoice
  ) => {
    setValidationError(null);
    setSelectedIds((prev) => {
      const groupIds = group.choices.map((c) => c.id);
      if (group.selectionType === 'single') {
        const withoutGroup = prev.filter((id) => !groupIds.includes(id));
        if (prev.includes(choice.id) && !group.required) {
          return withoutGroup;
        }
        return [...withoutGroup, choice.id];
      }

      if (prev.includes(choice.id)) {
        return prev.filter((id) => id !== choice.id);
      }

      if (group.maxSelections && group.maxSelections > 0) {
        const currentInGroup = prev.filter((id) => groupIds.includes(id));
        if (currentInGroup.length >= group.maxSelections) {
          return prev;
        }
      }
      return [...prev, choice.id];
    });
  };

  const handleResetDefaults = () => {
    const defaults: string[] = [];
    for (const grp of optionGroups) {
      const d = grp.choices.filter((c) => c.defaultSelected);
      if (d.length > 0) {
        defaults.push(
          ...(grp.selectionType === 'single' ? [d[0].id] : d.map((c) => c.id))
        );
      } else if (grp.required && grp.choices.length > 0) {
        defaults.push(grp.choices[0].id);
      }
    }
    setSelectedIds(defaults);
    setValidationError(null);
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 1800);
      }
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleAddToCartClick = () => {
    if (isUnavailable) return;

    // Validate all required option groups
    for (const grp of optionGroups) {
      if (grp.required) {
        const hasChoice = grp.choices.some((c) => selectedIds.includes(c.id));
        if (!hasChoice) {
          setValidationError(`Please select an option for "${grp.name}".`);
          return;
        }
      }
    }

    const selectedNames: string[] = [];
    for (const grp of optionGroups) {
      for (const ch of grp.choices) {
        if (selectedIds.includes(ch.id)) {
          selectedNames.push(ch.name);
        }
      }
    }

    onAddCustomizedToCart(
      cake,
      selectedIds,
      selectedNames,
      unitPrice,
      cakeNote.trim(),
      quantity,
      specialInstructions.trim(),
      addonsUnitPrice
    );
    onClose();
  };

  const handleDragDismiss = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.y > 110 || info.velocity.y > 420) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          {/* Food-Tinted Ambient Backdrop with Floating Edge Garnish Cutouts */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{ backgroundColor: cake.theme.surface }}
            className="fixed inset-0/95 backdrop-blur-xl transition-colors duration-450"
          >
            <div
              style={{ backgroundColor: cake.theme.wave }}
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full blur-3xl opacity-35 pointer-events-none"
            />

            <motion.img
              src={getAdaptiveImageUrl(
                cake.garnishes[1]?.image_url || cake.garnishes[0].image_url,
                'garnish'
              )}
              alt=""
              loading="lazy"
              decoding="async"
              animate={{ y: [0, -10, 0], rotate: [12, 18, 12] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="fixed top-20 -left-5 w-16 h-16 md:w-24 md:h-24 rounded-full object-cover border-[4px] border-white/80 shadow-xl pointer-events-none opacity-90"
            />

            <motion.img
              src={getAdaptiveImageUrl(cake.garnishes[0].image_url, 'garnish')}
              alt=""
              loading="lazy"
              decoding="async"
              animate={{ y: [0, 10, 0], rotate: [-14, -8, -14] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="fixed top-44 -right-5 w-16 h-16 md:w-24 md:h-24 rounded-full object-cover border-[4px] border-white/80 shadow-xl pointer-events-none opacity-90"
            />
          </motion.div>

          {/* Native Bottom Sheet on Phone (<1024px) / 2-Column Floating Modal on Desktop */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 320,
            }}
            className={`relative z-10 w-full ${
              isMobileLocked
                ? 'max-w-[430px] inset-x-0 bottom-0 rounded-t-[32px] max-h-[94dvh] overflow-y-auto overscroll-contain'
                : 'inset-x-0 bottom-0 rounded-t-[32px] max-h-[94dvh] overflow-y-auto overscroll-contain lg:inset-auto lg:rounded-[36px] lg:max-w-[1040px] lg:max-h-[92dvh]'
            } no-scrollbar px-3 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:p-6`}
          >
            {/* Native Drag-to-Dismiss Handle Pill */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.45 }}
              onDragEnd={handleDragDismiss}
              className={`${
                isMobileLocked ? 'flex' : 'flex lg:hidden'
              } justify-center pt-1 pb-2.5 cursor-grab active:cursor-grabbing touch-none`}
            >
              <span className="w-12 h-1.5 rounded-full bg-stone-900/25" />
            </motion.div>

            <div
              className={`grid grid-cols-1 ${
                isMobileLocked ? '' : 'lg:grid-cols-12'
              } gap-3.5 lg:gap-5 items-start`}
            >
              {/* TIER 1: CURVED DARK-ARCH HERO + INGREDIENTS STORY + QUANTITY CTA */}
              <div
                className={`${
                  isMobileLocked ? '' : 'lg:col-span-5'
                } bg-[#FAF6F0] rounded-[28px] sm:rounded-[32px] shadow-xl border-[1px] border-white/90 relative overflow-hidden`}
              >
                <div
                  style={{
                    background: `linear-gradient(145deg, #141414 0%, ${cake.theme.darkBtn} 100%)`,
                  }}
                  className="relative px-4 pt-3 pb-8 text-white overflow-hidden"
                >
                  <div
                    style={{ backgroundColor: cake.theme.wave }}
                    className="absolute -right-8 -top-8 w-36 h-36 rounded-full blur-3xl opacity-35 pointer-events-none"
                  />

                  {/* Top Row: Back, Wishlist & Share */}
                  <div className="flex items-center justify-between relative z-10 mb-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      aria-label="Back"
                      className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border-[1px] border-white/20 flex items-center justify-center text-white cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
                    </motion.button>

                    <div className="flex items-center gap-1.5">
                      {isUnavailable ? (
                        <span className="rounded-full bg-rose-500 text-white px-2.5 py-0.5 text-[0.62rem] font-bold">
                          Unavailable
                        </span>
                      ) : (
                        cake.badge && (
                          <span className="rounded-full bg-amber-300/95 text-stone-950 px-2 py-0.5 text-[0.62rem] font-semibold shadow-xs">
                            {cake.badge}
                          </span>
                        )
                      )}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onToggleWishlist(cake.id)}
                        aria-label="Save to Wishlist"
                        className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border-[1px] border-white/20 flex items-center justify-center text-white cursor-pointer"
                      >
                        <Heart
                          className={`w-4 h-4 transition-colors ${
                            isWishlisted
                              ? 'fill-rose-400 text-rose-400'
                              : 'text-white'
                          }`}
                        />
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleShare}
                        aria-label="Share"
                        className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border-[1px] border-white/20 flex items-center justify-center text-white cursor-pointer"
                      >
                        {copiedShare ? (
                          <Check className="w-4 h-4 text-emerald-300" />
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 hidden sm:block" />
                            <MoreVertical className="w-3.5 h-3.5 sm:hidden" />
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Split Showcase */}
                  <div className="relative z-10 grid grid-cols-12 items-center gap-2">
                    <div className="col-span-7 space-y-1">
                      <span className="text-[0.62rem] font-semibold uppercase tracking-wider text-amber-300/90 block">
                        {cake.category}
                      </span>
                      <h2 className="font-display text-[1.08rem] sm:text-[1.2rem] font-bold text-white leading-[1.22] tracking-tight">
                        {cake.name}
                      </h2>
                      <p className="text-[0.7rem] text-white/80 font-normal leading-snug line-clamp-2">
                        {cake.shortDescription}
                      </p>

                      <div className="pt-0.5 flex items-baseline gap-1.5">
                        <span className="font-bold text-[1.05rem] text-white tabular-nums">
                          {currency} {unitPrice.toLocaleString('en-US')}
                        </span>
                        {cake.originalPrice &&
                          cake.originalPrice > cake.basePrice && (
                            <span className="text-[0.72rem] font-normal text-white/50 line-through tabular-nums">
                              {currency}
                              {cake.originalPrice.toLocaleString('en-US')}
                            </span>
                          )}
                      </div>
                    </div>

                    <div className="col-span-5 flex flex-col items-center justify-center gap-1.5">
                      <motion.div
                        key={activeImageUrl}
                        initial={{ rotate: -14, scale: 0.88, opacity: 0.6 }}
                        animate={{ rotate: 0, scale: 1, opacity: 1, y: [0, -4, 0] }}
                        transition={{
                          rotate: { type: 'spring', stiffness: 220, damping: 20 },
                          scale: { type: 'spring', stiffness: 220, damping: 20 },
                          opacity: { duration: 0.2 },
                          y: { duration: 3.8, repeat: Infinity, ease: 'easeInOut' },
                        }}
                        className="w-[6.5rem] h-[6.5rem] sm:w-[7.25rem] sm:h-[7.25rem] rounded-full bg-white p-1.5 shadow-[0_16px_28px_rgba(0,0,0,0.42)] border-[3px] border-white overflow-hidden shrink-0"
                      >
                        <img
                          src={getAdaptiveImageUrl(activeImageUrl, 'detail')}
                          alt={cake.name}
                          decoding="async"
                          className="w-full h-full object-cover rounded-full"
                        />
                      </motion.div>

                      {/* Multi-image gallery switcher when product has additional photos */}
                      {allImages.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          {allImages.map((imgUrl, idx) => (
                            <button
                              key={`${imgUrl}-${idx}`}
                              type="button"
                              onClick={() => setActiveImageIdx(idx)}
                              aria-label={`View image ${idx + 1}`}
                              className={`w-6 h-6 rounded-full overflow-hidden border-[1.5px] cursor-pointer transition-all ${
                                activeImageIdx === idx
                                  ? 'border-amber-300 scale-110'
                                  : 'border-white/40 opacity-70'
                              }`}
                            >
                              <img
                                src={getAdaptiveImageUrl(imgUrl, 'thumb')}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Curved Cream Organic Arch Wave */}
                  <svg
                    viewBox="0 0 400 44"
                    preserveAspectRatio="none"
                    className="absolute bottom-0 left-0 w-full h-6 pointer-events-none"
                    aria-hidden="true"
                  >
                    <path
                      d="M 0,44 L 0,24 Q 200,-12 400,24 L 400,44 Z"
                      fill="#FAF6F0"
                    />
                  </svg>
                </div>

                {/* LOWER CREAM SHEET: INGREDIENTS, TASTE PROFILE & QUANTITY CTA */}
                <div className="px-3.5 sm:px-4 pb-3.5 pt-1 space-y-2.5">
                  <div className="text-center space-y-1.5">
                    <h3 className="font-display text-[0.98rem] font-bold text-stone-900 tracking-tight">
                      Ingredients & Taste Profile
                    </h3>

                    <div className="grid grid-cols-3 gap-1.5 bg-white rounded-[14px] p-1.5 border-[1px] border-black/6 shadow-2xs">
                      <div className="flex items-center justify-center gap-1 text-[0.7rem] font-semibold text-stone-800">
                        <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="tabular-nums">{cake.prepMins} min</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[0.7rem] font-semibold text-stone-800 border-x-[1px] border-stone-200/80">
                        <Flame className="w-3 h-3 text-orange-500 shrink-0" />
                        <span className="tabular-nums">{cake.calories}</span>
                      </div>
                      <div className="flex items-center justify-center gap-0.5 text-[0.7rem] font-semibold text-stone-800">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        <span className="tabular-nums">{cake.rating.toFixed(1)}</span>
                        <span className="text-[0.78rem] leading-none">{mood.emoji}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[0.78rem] text-stone-600 font-medium leading-[1.6]">
                    {cake.ingredientsStory || cake.fullDescription}
                  </p>

                  {cake.chefNote && (
                    <div
                      style={{ backgroundColor: cake.theme.surface }}
                      className="rounded-[18px] p-3 border-[1px] border-white flex items-start gap-2.5"
                    >
                      <span
                        style={{ backgroundColor: cake.theme.darkBtn }}
                        className="w-7 h-7 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5"
                      >
                        <ChefHat className="w-3.5 h-3.5 text-amber-300" />
                      </span>
                      <div className="min-w-0">
                        <span className="text-[0.65rem] font-extrabold uppercase tracking-wide text-stone-500 block">
                          Crafted For You • Chef&apos;s Note
                        </span>
                        <p className="text-[0.75rem] font-semibold text-stone-800 leading-relaxed mt-0.5">
                          {cake.chefNote}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Big-Brand Details Strip */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[0.7rem]">
                      <div className="bg-white rounded-[14px] px-3 py-2 border-[1px] border-black/5 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[0.62rem] text-stone-400 font-bold block">
                            Servings & Weight
                          </span>
                          <span className="font-extrabold text-stone-800 truncate block">
                            {cake.servings || cake.weight}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white rounded-[14px] px-3 py-2 border-[1px] border-black/5 flex flex-col justify-center">
                        <span className="text-[0.62rem] text-stone-400 font-bold block">
                          Sweetness • {cake.textureProfile || 'Velvety Soft'}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <span
                              key={lvl}
                              style={{
                                backgroundColor:
                                  lvl <= sweetness
                                    ? cake.theme.accent
                                    : '#E7E5E4',
                              }}
                              className="h-1.5 flex-1 rounded-full"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {cake.dietaryTags && cake.dietaryTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cake.dietaryTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border-[1px] border-emerald-200/80 px-2.5 py-0.5 text-[0.66rem] font-extrabold"
                          >
                            <ShieldCheck className="w-3 h-3 shrink-0" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {(cake.storageTip || cake.allergens) && (
                      <div className="rounded-[14px] bg-white/80 border-[1px] border-stone-200/70 px-3 py-2 text-[0.68rem] text-stone-600 space-y-1">
                        {cake.storageTip && (
                          <div className="flex items-start gap-1.5">
                            <Snowflake className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                            <span>
                              <strong className="text-stone-800">Care:</strong>{' '}
                              {cake.storageTip}
                            </span>
                          </div>
                        )}
                        {cake.allergens && (
                          <div className="text-[0.65rem] text-stone-500">
                            <strong className="text-stone-700">Allergens:</strong>{' '}
                            {cake.allergens}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Optional Cake Message & Special Instructions */}
                  <AnimatePresence>
                    {showNoteInput && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-2"
                      >
                        {cake.allowCustomMessage !== false && (
                          <input
                            type="text"
                            maxLength={50}
                            value={cakeNote}
                            onChange={(e) => setCakeNote(e.target.value)}
                            placeholder={siteContent.cakeNotePlaceholder}
                            className="w-full rounded-[14px] bg-white border-[1px] border-stone-200 px-3 py-2 text-[16px] font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-800/20"
                          />
                        )}
                        <input
                          type="text"
                          maxLength={120}
                          value={specialInstructions}
                          onChange={(e) => setSpecialInstructions(e.target.value)}
                          placeholder="Special instructions (e.g. less sugar, eggless, pastel pink)"
                          className="w-full rounded-[14px] bg-white border-[1px] border-stone-200 px-3 py-2 text-[16px] font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-800/20"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {validationError && (
                    <div className="rounded-[12px] bg-rose-50 border-[1px] border-rose-200 px-3 py-2 text-[0.72rem] font-bold text-rose-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  {/* Bottom Action Row: Quantity Stepper (− 01 +) + Total Price + Add to Cart */}
                  <div className="pt-3 border-t-[1px] border-stone-200/80 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[0.68rem] font-bold text-stone-400 block">
                          {siteContent.totalPriceLabel} ({quantity}×)
                        </span>
                        <motion.span
                          key={totalPrice}
                          initial={{ scale: 0.92, opacity: 0.7 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="font-extrabold text-[1.3rem] sm:text-[1.45rem] text-stone-900 tabular-nums tracking-tight whitespace-nowrap"
                        >
                          {currency} {totalPrice.toLocaleString('en-US')}
                        </motion.span>
                      </div>

                      <div className="inline-flex items-center gap-2.5 rounded-full bg-white border-[1px] border-stone-200/90 px-2 py-1 shadow-2xs">
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          type="button"
                          disabled={isUnavailable}
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          aria-label="Decrease quantity"
                          className="w-8 h-8 rounded-full bg-[#FAF6F0] hover:bg-stone-200 text-stone-800 flex items-center justify-center cursor-pointer disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </motion.button>
                        <span className="font-extrabold text-[0.9rem] text-stone-900 min-w-[1.5rem] text-center tabular-nums">
                          {String(quantity).padStart(2, '0')}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          type="button"
                          disabled={isUnavailable || quantity >= maxQty}
                          onClick={() =>
                            setQuantity((q) => Math.min(maxQty, q + 1))
                          }
                          aria-label="Increase quantity"
                          style={{ backgroundColor: cake.theme.darkBtn }}
                          className="w-8 h-8 rounded-full text-white flex items-center justify-center cursor-pointer chromatic-transition disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => onToggleWishlist(cake.id)}
                        aria-label="Save to Wishlist"
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white border-[1px] border-stone-200 shadow-xs flex items-center justify-center text-stone-800 hover:bg-stone-50 cursor-pointer shrink-0"
                      >
                        <Heart
                          className={`w-5 h-5 transition-colors ${
                            isWishlisted
                              ? 'fill-rose-500 text-rose-500'
                              : 'text-stone-700'
                          }`}
                        />
                      </motion.button>

                      <motion.button
                        whileHover={isUnavailable ? undefined : { scale: 1.015 }}
                        whileTap={isUnavailable ? undefined : { scale: 0.96 }}
                        disabled={isUnavailable}
                        onClick={handleAddToCartClick}
                        style={{
                          backgroundColor: isUnavailable
                            ? '#78716C'
                            : cake.theme.darkBtn,
                        }}
                        className="flex-1 text-white rounded-full pl-5 pr-2 py-2 flex items-center justify-between gap-2.5 shadow-lg cursor-pointer chromatic-transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <span className="font-display text-[0.875rem] font-extrabold tracking-tight whitespace-nowrap py-0.5">
                          {isUnavailable
                            ? 'Currently Unavailable'
                            : `${siteContent.addToCartBtn} • ${currency} ${totalPrice.toLocaleString(
                                'en-US'
                              )}`}
                        </span>
                        <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-xs shrink-0">
                          <Plus className="w-4 h-4 stroke-[2.8]" />
                        </span>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>

              {/* TIER 2 & 3: DYNAMIC PER-PRODUCT CUSTOMIZATION GROUPS + 5-STEP TIMELINE */}
              <div
                className={`${
                  isMobileLocked ? '' : 'lg:col-span-7'
                } space-y-3.5 lg:space-y-5`}
              >
                <div className="bg-[#FAF6F0] rounded-[26px] sm:rounded-[28px] p-3.5 sm:p-5 shadow-lg border-[1px] border-white/90 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-[0.9rem] sm:text-[1rem] font-extrabold text-stone-900 leading-[1.4] truncate">
                      {siteContent.customizeTitle}
                    </h3>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowNoteInput((prev) => !prev)}
                        className="text-[0.7rem] sm:text-[0.75rem] font-bold text-stone-600 hover:text-stone-900 inline-flex items-center gap-1 cursor-pointer py-0.5"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>
                          {cakeNote || specialInstructions
                            ? 'Note Added ✓'
                            : siteContent.cakeNoteBtn}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetDefaults}
                        className="text-[0.7rem] sm:text-[0.75rem] font-extrabold text-stone-800 underline underline-offset-4 hover:opacity-75 cursor-pointer py-0.5"
                      >
                        {siteContent.editBtn}
                      </button>
                    </div>
                  </div>

                  {/* Render Every Configurable Option Group Dynamically */}
                  {optionGroups.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[0.74rem] font-extrabold text-stone-800">
                          {group.name}
                        </span>
                        <span className="text-[0.62rem] font-bold rounded-full px-2 py-0.5 bg-white border-[1px] border-black/5 text-stone-500">
                          {group.required ? 'Required' : 'Optional'} •{' '}
                          {group.selectionType === 'single'
                            ? 'Choose 1'
                            : group.maxSelections
                            ? `Up to ${group.maxSelections}`
                            : 'Multi-select'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                        {group.choices.map((choice) => {
                          const isSelected = selectedIds.includes(choice.id);
                          return (
                            <motion.button
                              key={choice.id}
                              type="button"
                              whileTap={{ scale: 0.94 }}
                              onClick={() => toggleChoice(group, choice)}
                              className={`rounded-[16px] p-2 sm:p-2.5 relative flex flex-col items-center text-center transition-all cursor-pointer select-none border-[1px] ${
                                isSelected
                                  ? 'bg-[#EFE9E0] border-stone-900/20 shadow-xs'
                                  : 'bg-[#EFE9E0]/55 border-transparent opacity-75 hover:opacity-95'
                              }`}
                            >
                              <span
                                style={{
                                  backgroundColor: isSelected
                                    ? cake.theme.darkBtn
                                    : 'rgba(255,255,255,0.85)',
                                }}
                                className={`absolute top-1.5 left-1.5 w-4 h-4 rounded-full flex items-center justify-center transition-transform ${
                                  isSelected
                                    ? 'text-white scale-100 shadow-2xs'
                                    : 'text-transparent border-[1px] border-stone-300 scale-90'
                                }`}
                              >
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>

                              {choice.image_url ? (
                                <div className="w-10 h-10 sm:w-11 sm:h-11 mt-1 mb-1 rounded-full bg-white p-1 shadow-xs overflow-hidden shrink-0">
                                  <img
                                    src={getAdaptiveImageUrl(
                                      choice.image_url,
                                      'thumb'
                                    )}
                                    alt={choice.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                </div>
                              ) : (
                                <div className="h-3" />
                              )}

                              <span className="text-[0.68rem] font-bold text-stone-800 leading-[1.28] line-clamp-2 min-h-[26px] flex items-center justify-center">
                                {choice.name}
                              </span>
                              <span className="text-[0.62rem] font-bold text-stone-500 mt-0.5 tabular-nums">
                                {choice.priceDelta === 0
                                  ? 'Included'
                                  : `+${currency}${choice.priceDelta.toLocaleString(
                                      'en-US'
                                    )}`}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* TIER 3: 5-STEP ORDER JOURNEY TIMELINE */}
                <div className="bg-[#FAF6F0] rounded-[26px] sm:rounded-[28px] p-3.5 sm:p-5 shadow-lg border-[1px] border-white/90">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-[0.9rem] sm:text-[1rem] font-extrabold text-stone-900 leading-[1.4]">
                      {siteContent.stepsTitle}
                    </h3>
                    <span className="text-[0.65rem] sm:text-[0.72rem] font-bold text-stone-400">
                      {siteContent.stepsSubtitle}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1 sm:gap-2.5 items-start relative">
                    {cake.steps.map((step, idx) => {
                      const isLast = idx === cake.steps.length - 1;
                      return (
                        <div
                          key={step.stepNumber}
                          className="flex flex-col items-center relative min-w-0"
                        >
                          {!isLast && (
                            <div
                              aria-hidden="true"
                              className="absolute top-5 sm:top-6 left-[58%] w-[82%] border-b-[2px] border-dotted border-stone-400/70 z-0 pointer-events-none"
                            />
                          )}

                          <div className="relative z-10 w-11 h-11 sm:w-14 sm:h-14 rounded-[14px] sm:rounded-[16px] bg-[#EFE9E0] p-1 shadow-xs border-[1px] border-white">
                            <span
                              style={{ backgroundColor: cake.theme.darkBtn }}
                              className="absolute -top-1.5 -left-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full text-white text-[0.6rem] font-extrabold flex items-center justify-center shadow-xs"
                            >
                              {step.stepNumber}
                            </span>
                            <img
                              src={getAdaptiveImageUrl(step.image_url, 'thumb')}
                              alt={step.shortLabel}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover rounded-[10px] sm:rounded-[12px]"
                            />
                          </div>

                          <span className="mt-1.5 text-[0.6rem] sm:text-[0.68rem] font-bold text-stone-800 text-center leading-[1.35] line-clamp-2 max-w-full">
                            {step.shortLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CakeDetailSheet;
