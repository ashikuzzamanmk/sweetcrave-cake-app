import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  Sparkles,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  Clock,
  Flame,
  Star,
  X,
} from 'lucide-react';
import { CakeItem } from '../data/cakesData';
import { SiteContent } from '../config/siteContent';
import { getAdaptiveImageUrl } from '../utils/cacheEngine';
import { getRatingExpression } from './HomeFeed';

export interface OrbitalCakeWheelProps {
  cakes: CakeItem[];
  siteContent: SiteContent;
  activeCakeId?: string;
  onSelectCakeForDetail: (cake: CakeItem) => void;
  onActiveCakeChange?: (cake: CakeItem) => void;
  mode?: 'inline' | 'fullscreen';
  onCloseFullscreen?: () => void;
}

/**
 * Video 2 Reference — Signature Orbital Rotating Cake Wheel ("Select Cake").
 * - Curved dark obsidian semicircular wheel anchored on the left with orbiting circular cake plates.
 * - Drag vertically (or tap any orbiting cake / arrow) to revolve plates along the orbital arc
 *   with silky spring physics.
 * - Active centered cake scales prominently, morphs the food-color glow, and lets the user
 *   tap straight into the curved-arch Ingredients & Customizer Slide!
 * - Built with REM typography, % fluid layout, DVH fullscreen height, and crisp 1px–3px borders.
 */
export const OrbitalCakeWheel: React.FC<OrbitalCakeWheelProps> = ({
  cakes,
  siteContent,
  activeCakeId,
  onSelectCakeForDetail,
  onActiveCakeChange,
  mode = 'inline',
  onCloseFullscreen,
}) => {
  const initialIndex = Math.max(
    0,
    cakes.findIndex((c) => c.id === activeCakeId)
  );
  const [activeIndex, setActiveIndex] = useState<number>(initialIndex);

  const safeCakes = cakes.length > 0 ? cakes : [];
  const total = safeCakes.length;
  const activeCake = safeCakes[activeIndex % Math.max(1, total)];

  const stepWheel = useCallback(
    (delta: number) => {
      if (total <= 1) return;
      const next = (activeIndex + delta + total) % total;
      setActiveIndex(next);
      if (onActiveCakeChange && safeCakes[next]) {
        onActiveCakeChange(safeCakes[next]);
      }
    },
    [activeIndex, total, onActiveCakeChange, safeCakes]
  );

  const handleSelectIndex = (idx: number) => {
    if (idx === activeIndex) {
      if (activeCake) onSelectCakeForDetail(activeCake);
      return;
    }
    setActiveIndex(idx);
    if (onActiveCakeChange && safeCakes[idx]) {
      onActiveCakeChange(safeCakes[idx]);
    }
  };

  const handleDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.y < -28 || info.velocity.y < -220) {
      stepWheel(1);
    } else if (info.offset.y > 28 || info.velocity.y > 220) {
      stepWheel(-1);
    }
  };

  if (!activeCake) return null;

  const mood = getRatingExpression(activeCake.rating);
  const isFullscreen = mode === 'fullscreen';

  // Compute relative circular slots (-2, -1, 0, +1, +2) around activeIndex
  const getSignedOffset = (idx: number) => {
    let diff = idx - activeIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  };

  const wheelRadius = isFullscreen ? 142 : 96;
  const wheelHeight = isFullscreen ? 'min-h-[68dvh]' : 'min-h-[250px]';

  const content = (
    <div
      className={`relative w-full overflow-hidden select-none border-[1px] border-black/8 bento-shadow chromatic-transition ${
        isFullscreen
          ? 'h-[100dvh] max-w-[430px] mx-auto rounded-none sm:rounded-[28px] bg-[#FAF6F0] flex flex-col shadow-2xl'
          : 'rounded-[24px] bg-[#FAF6F0]'
      }`}
    >
      {/* Top Bar (Fullscreen or Inline Header) */}
      <div className="relative z-30 flex items-center justify-between px-3.5 pt-3 pb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            style={{ backgroundColor: activeCake.theme.darkBtn }}
            className="w-6 h-6 rounded-full text-white flex items-center justify-center shadow-xs shrink-0 chromatic-transition"
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-[0.95rem] font-bold text-stone-900 leading-tight truncate">
              Taste Wheel • স্পেশাল Showcase
            </h3>
            <p className="text-[0.65rem] font-medium text-stone-500 truncate">
              উপরে-নিচে Swipe বা Tap করে পছন্দের Cake ঘোরান
            </p>
          </div>
        </div>

        {isFullscreen && onCloseFullscreen ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onCloseFullscreen}
            aria-label="Close Taste Wheel"
            className="w-9 h-9 rounded-full bg-white border-[1px] border-black/8 shadow-xs flex items-center justify-center text-stone-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </motion.button>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <motion.button
              whileTap={{ scale: 0.88 }}
              type="button"
              onClick={() => stepWheel(-1)}
              aria-label="Previous Cake"
              className="w-7 h-7 rounded-full bg-white border-[1px] border-black/8 shadow-2xs flex items-center justify-center text-stone-800 hover:bg-stone-100 cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              type="button"
              onClick={() => stepWheel(1)}
              aria-label="Next Cake"
              className="w-7 h-7 rounded-full bg-white border-[1px] border-black/8 shadow-2xs flex items-center justify-center text-stone-800 hover:bg-stone-100 cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        )}
      </div>

      {/* Main Orbital Stage */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.14}
        onDragEnd={handleDragEnd}
        className={`relative w-full flex-1 ${wheelHeight} flex items-center overflow-hidden touch-pan-x cursor-grab active:cursor-grabbing`}
      >
        {/* Ambient Food-Tinted Soft Glow */}
        <div
          style={{ backgroundColor: activeCake.theme.wave }}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[55%] h-[80%] rounded-full blur-3xl opacity-20 pointer-events-none chromatic-transition"
        />

        {/* LEFT SEMICIRCULAR OBSIDIAN ORBITAL ARC (Exact signature look from Video 2) */}
        <div
          style={{ backgroundColor: '#111111' }}
          className="absolute -left-[48%] top-1/2 -translate-y-1/2 w-[78%] aspect-square rounded-full shadow-[10px_0_28px_rgba(0,0,0,0.2)] border-[2px] border-white/15 pointer-events-none"
        >
          <div className="absolute inset-3.5 rounded-full border-[1px] border-dashed border-white/15" />
        </div>

        {/* Left Center "Select Cake" Pill (Exact Video 2 anchor pill) */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          type="button"
          onClick={() => onSelectCakeForDetail(activeCake)}
          className="relative z-20 ml-2.5 bg-white text-stone-900 rounded-[12px] px-2.5 py-1.5 text-[0.68rem] font-bold shadow-md border-[1px] border-black/8 flex items-center gap-1 cursor-pointer hover:bg-stone-50"
        >
          <span>Select</span>
          <ArrowUpRight className="w-3 h-3" />
        </motion.button>

        {/* ORBITING CIRCULAR CAKE PLATES */}
        <div
          className="absolute left-[13%] top-1/2 -translate-y-1/2 w-0 h-0 z-20"
          aria-label="Orbiting Cake Wheel"
        >
          {safeCakes.map((cake, idx) => {
            const offset = getSignedOffset(idx);
            const isVisible = Math.abs(offset) <= 2;
            const angleDeg = offset * 44;
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = Math.cos(angleRad) * wheelRadius - (isFullscreen ? 44 : 36);
            const y = Math.sin(angleRad) * wheelRadius;
            const isCenter = offset === 0;
            const scale = isCenter ? 1.08 : Math.abs(offset) === 1 ? 0.74 : 0.52;
            const opacity = isVisible ? (isCenter ? 1 : Math.abs(offset) === 1 ? 0.88 : 0.5) : 0;

            return (
              <motion.button
                key={cake.id}
                type="button"
                onClick={() => handleSelectIndex(idx)}
                animate={{
                  x,
                  y,
                  scale,
                  opacity,
                  rotate: offset * -14,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 240,
                  damping: 24,
                  mass: 0.85,
                }}
                style={{
                  zIndex: isCenter ? 30 : 20 - Math.abs(offset),
                  pointerEvents: isVisible ? 'auto' : 'none',
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer focus:outline-none group"
                aria-label={`Select ${cake.name}`}
              >
                <div
                  className={`rounded-full p-1 transition-shadow duration-300 ${
                    isCenter
                      ? isFullscreen
                        ? 'w-[6.25rem] h-[6.25rem] bg-white shadow-[0_18px_30px_rgba(0,0,0,0.26)] border-[3px] border-white'
                        : 'w-[4.75rem] h-[4.75rem] bg-white shadow-[0_16px_26px_rgba(0,0,0,0.24)] border-[3px] border-white'
                      : isFullscreen
                      ? 'w-[4.85rem] h-[4.85rem] bg-[#1A1A1A] shadow-[0_10px_18px_rgba(0,0,0,0.2)] border-[2px] border-white/80'
                      : 'w-[3.85rem] h-[3.85rem] bg-[#1A1A1A] shadow-[0_10px_18px_rgba(0,0,0,0.2)] border-[2px] border-white/80'
                  }`}
                >
                  <img
                    src={getAdaptiveImageUrl(cake.image_url, 'wheel')}
                    alt={cake.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover rounded-full pointer-events-none"
                  />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* RIGHT SIDE: COMPACT SENSORY SPOTLIGHT CARD */}
        <div className="relative z-20 ml-auto w-[52%] pr-2.5 pl-1.5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCake.id}
              initial={{ opacity: 0, x: 14, y: 4 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -10, y: -4 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white/92 backdrop-blur-md rounded-[18px] p-2.5 border-[1px] border-black/6 shadow-sm space-y-1.5"
            >
              <div className="flex flex-wrap items-center gap-1">
                {activeCake.badge && (
                  <span
                    style={{ backgroundColor: activeCake.theme.surface, color: activeCake.theme.accent }}
                    className="rounded-full px-1.5 py-0.5 text-[0.58rem] font-semibold"
                  >
                    {activeCake.badge}
                  </span>
                )}
                <span className="text-[0.6rem] font-medium text-stone-500 truncate">
                  {activeCake.category}
                </span>
              </div>

              <h4 className="font-display text-[0.84rem] font-bold text-stone-900 leading-[1.25] line-clamp-2">
                {activeCake.name}
              </h4>

              <p className="text-[0.66rem] text-stone-600 font-normal line-clamp-2 leading-snug">
                {activeCake.chefNote || activeCake.shortDescription}
              </p>

              {/* Compact 3-Stat Taste Row */}
              <div className="flex items-center gap-1.5 text-[0.62rem] font-semibold text-stone-700">
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5 text-emerald-600" />
                  {activeCake.prepMins}m
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5 text-amber-500" />
                  {activeCake.calories}
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  {activeCake.rating.toFixed(1)}{mood.emoji}
                </span>
              </div>

              <div className="pt-1.5 border-t-[1px] border-stone-200/70 flex items-center justify-between gap-1.5">
                <span className="font-bold text-[0.84rem] text-stone-900 tabular-nums">
                  {siteContent.currency}{' '}
                  {activeCake.basePrice.toLocaleString('en-US')}
                </span>

                <motion.button
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => onSelectCakeForDetail(activeCake)}
                  style={{ backgroundColor: activeCake.theme.darkBtn }}
                  className="rounded-full px-2.5 py-1 text-white text-[0.65rem] font-semibold shadow-xs cursor-pointer shrink-0 flex items-center gap-0.5 chromatic-transition"
                >
                  <span>Order</span>
                  <ArrowUpRight className="w-3 h-3" />
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bottom Wheel Dot Progress */}
      <div className="relative z-20 pb-2.5 pt-0.5 flex items-center justify-center gap-1.5">
        {safeCakes.map((cake, idx) => {
          const active = idx === activeIndex;
          return (
            <button
              key={cake.id}
              type="button"
              onClick={() => handleSelectIndex(idx)}
              aria-label={`Jump to ${cake.name}`}
              style={{
                backgroundColor: active ? activeCake.theme.darkBtn : '#D6D3D1',
              }}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                active ? 'w-6' : 'w-1.5 hover:bg-stone-400'
              }`}
            />
          );
        })}
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="fixed inset-0 z-50 w-full h-[100dvh] bg-stone-950/60 backdrop-blur-md flex items-center justify-center"
      >
        {content}
      </motion.div>
    );
  }

  return content;
};

export default OrbitalCakeWheel;
