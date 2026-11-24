import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Sparkles, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { CakeItem } from '../data/cakesData';
import { storeConfig } from '../config/storeConfig';
import { SiteContent } from '../config/siteContent';
import { getAdaptiveImageUrl } from '../utils/cacheEngine';

export interface ChromaticWaveHeroProps {
  siteContent: SiteContent;
  heroCakes: CakeItem[];
  activeCake: CakeItem;
  onSelectCake: (cake: CakeItem) => void;
  onCustomizeCake: (cake: CakeItem) => void;
  onQuickAdd: (cake: CakeItem) => void;
  isMobileLocked?: boolean;
}

const WAVE_PATHS = [
  'M 0,0 L 340,0 C 375,65 445,110 430,195 C 415,280 315,305 345,385 C 370,450 325,500 245,500 L 0,500 Z',
  'M 0,0 L 355,0 C 405,70 420,135 395,210 C 370,285 335,320 365,395 C 390,455 310,500 230,500 L 0,500 Z',
  'M 0,0 L 330,0 C 390,55 450,125 425,205 C 400,285 305,315 340,390 C 365,445 330,500 255,500 L 0,500 Z',
  'M 0,0 L 350,0 C 380,80 440,120 415,200 C 390,280 320,310 355,385 C 380,450 315,500 240,500 L 0,500 Z',
];

export const ChromaticWaveHero: React.FC<ChromaticWaveHeroProps> = ({
  siteContent,
  heroCakes,
  activeCake,
  onSelectCake,
  onCustomizeCake,
  onQuickAdd,
  isMobileLocked = false,
}) => {
  const [direction, setDirection] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const activeIndex = Math.max(
    0,
    heroCakes.findIndex((c) => c.id === activeCake.id)
  );
  const currentCake = heroCakes[activeIndex] || activeCake;
  const wavePath = WAVE_PATHS[activeIndex % WAVE_PATHS.length];

  const autoRotateEnabled = siteContent.heroAutoRotate !== false;
  const autoRotateSeconds = Math.max(
    1.8,
    Math.min(12, siteContent.heroAutoRotateSeconds || 2)
  );

  const handleStepFlavor = useCallback(
    (delta: number) => {
      if (heroCakes.length <= 1) return;
      const nextIndex = (activeIndex + delta + heroCakes.length) % heroCakes.length;
      setDirection(delta >= 0 ? 1 : -1);
      onSelectCake(heroCakes[nextIndex]);
    },
    [activeIndex, heroCakes, onSelectCake]
  );

  // Automatic smooth wave & flavor rotation every few seconds
  useEffect(() => {
    if (!autoRotateEnabled || heroCakes.length <= 1 || isPaused) return;
    const timer = window.setInterval(() => {
      handleStepFlavor(1);
    }, autoRotateSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [autoRotateEnabled, autoRotateSeconds, heroCakes.length, isPaused, handleStepFlavor]);

  const handleThumbnailClick = (cake: CakeItem, idx: number) => {
    setDirection(idx >= activeIndex ? 1 : -1);
    onSelectCake(cake);
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const swipeThreshold = 36;
    if (info.offset.x < -swipeThreshold || info.velocity.x < -300) {
      handleStepFlavor(1);
    } else if (info.offset.x > swipeThreshold || info.velocity.x > 300) {
      handleStepFlavor(-1);
    }
  };

  return (
    <section className="w-full pt-0.5 pb-2">
      <div
        style={{ backgroundColor: 'var(--bg-surface)' }}
        className="rounded-[24px] p-3 md:p-5 relative overflow-hidden bento-shadow chromatic-transition select-none border-[1px] border-white/70"
      >
        {/* Animated Curved SVG Split Wave Background */}
        <svg
          viewBox="0 0 800 500"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--theme-wave)" />
              <stop
                offset="100%"
                stopColor="var(--accent-primary)"
                stopOpacity="0.88"
              />
            </linearGradient>
          </defs>

          <motion.path
            initial={false}
            animate={{ d: wavePath }}
            transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
            fill="url(#waveGrad)"
            style={{ fill: 'var(--theme-wave)' }}
            className="chromatic-transition"
          />

          <motion.path
            initial={false}
            animate={{ d: wavePath }}
            transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
            fill="var(--dark-btn)"
            fillOpacity="0.28"
            className="chromatic-transition"
          />

          <motion.path
            initial={false}
            animate={{
              d:
                activeIndex % 2 === 0
                  ? 'M 540,500 C 545,380 650,335 800,340 L 800,500 Z'
                  : 'M 515,500 C 535,365 660,320 800,330 L 800,500 Z',
            }}
            transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
            fill="var(--theme-wave)"
            fillOpacity="0.45"
            className="chromatic-transition"
          />
        </svg>

        {/* Responsive 2-Column Hero Grid */}
        <div
          className={`relative z-10 grid ${
            isMobileLocked
              ? 'grid-cols-12 items-center gap-2'
              : 'grid-cols-12 md:grid-cols-2 items-center gap-2 md:gap-8'
          }`}
        >
          {/* LEFT COLUMN: Brand Mini-Badge, Bangla Title (leading-[1.45]), Short Description & CTA */}
          <div
            className={`${
              isMobileLocked ? 'col-span-7' : 'col-span-7 md:col-span-1'
            } flex flex-col justify-between text-white pr-1 md:pr-4`}
          >
            <div className="inline-flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-md border-[1px] border-white/40 flex items-center justify-center shadow-xs shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-[0.68rem] font-semibold tracking-wide text-white/95 drop-shadow-xs truncate">
                {siteContent.brandName || storeConfig.brandName}
              </span>
            </div>

            <div className="relative min-h-[44px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCake.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/90" />
                    <span className="text-[0.65rem] font-semibold text-white/90">
                      {currentCake.category} • {siteContent.currency || storeConfig.currency}{' '}
                      {currentCake.basePrice.toLocaleString('en-US')}
                    </span>
                  </div>
                  <h1 className="font-display font-bold tracking-tight text-white drop-shadow-sm text-[clamp(1.02rem,4.1vw,1.35rem)] leading-[1.22]">
                    <span className="block">{currentCake.heroTitleLines[0]}</span>
                    <span className="block text-white/95">
                      {currentCake.heroTitleLines[1]}
                    </span>
                  </h1>
                </motion.div>
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={`${currentCake.id}-desc`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-1 text-white/90 font-normal line-clamp-1 drop-shadow-xs text-[0.7rem] leading-snug max-w-md"
              >
                {currentCake.shortDescription}
              </motion.p>
            </AnimatePresence>

            {/* Quick CTA */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => onCustomizeCake(currentCake)}
                style={{ backgroundColor: 'var(--dark-btn)' }}
                className="rounded-full pl-3 pr-1.5 py-1 text-white text-[0.72rem] font-semibold tracking-wide flex items-center gap-1.5 shadow-md cursor-pointer chromatic-transition min-h-[32px]"
              >
                <span className="py-0.5 leading-[1.2]">
                  {siteContent.orderNowBtn}
                </span>
                <span className="w-5 h-5 rounded-full bg-white text-stone-900 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => onQuickAdd(currentCake)}
                className={`${
                  isMobileLocked ? 'hidden' : 'hidden sm:inline-flex'
                } rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 px-3.5 py-1.5 text-white text-xs font-bold cursor-pointer transition-all`}
              >
                <span className="py-0.5">{siteContent.quickAddBtn}</span>
              </motion.button>
            </div>

            {/* Desktop Flavor Switcher Thumbnails */}
            <div
              className={`${
                isMobileLocked ? 'hidden' : 'hidden md:flex'
              } mt-4 items-center gap-3`}
            >
              {heroCakes.map((cake, idx) => {
                const isSelected = cake.id === currentCake.id;
                return (
                  <div key={cake.id} className="flex flex-col items-center">
                    <motion.button
                      whileHover={{ scale: 1.08, y: -2 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleThumbnailClick(cake, idx)}
                      aria-label={`ফ্লেভার পরিবর্তন: ${cake.name}`}
                      title={cake.name}
                      className={`relative w-11 h-11 rounded-full border-2 overflow-hidden shadow-md transition-all cursor-pointer ${
                        isSelected
                          ? 'border-white ring-2 ring-white/50 scale-105'
                          : 'border-white/60 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={getAdaptiveImageUrl(cake.image_url, 'thumb')}
                        alt={cake.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </motion.button>

                    <div className="h-1.5 mt-1.5 w-full flex items-center justify-center">
                      {isSelected && (
                        <div className="w-7 h-1 rounded-full bg-white/35 overflow-hidden shadow-xs">
                          {autoRotateEnabled && heroCakes.length > 1 && !isPaused ? (
                            <motion.div
                              key={`prog-desk-${currentCake.id}`}
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{
                                duration: autoRotateSeconds,
                                ease: 'linear',
                              }}
                              className="w-full h-full bg-white origin-left rounded-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-white rounded-full" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Finger-Velocity Orbital Cake Stage */}
          <div
            className={`${
              isMobileLocked ? 'col-span-5' : 'col-span-5 md:col-span-1'
            } relative flex items-center justify-center min-h-[112px] sm:min-h-[126px] touch-pan-y`}
          >
            <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full border-[1px] border-dashed border-stone-900/10 pointer-events-none" />

            <AnimatePresence mode="popLayout">
              {currentCake.garnishes.map((garnish, gIdx) => {
                const posClasses =
                  gIdx === 0
                    ? '-top-1 left-1 sm:top-0 sm:left-3 md:top-2 md:left-6'
                    : gIdx === 1
                    ? 'bottom-2 -left-1 sm:bottom-3 sm:left-2 md:bottom-4 md:left-4'
                    : 'top-0 right-0 sm:top-1 sm:right-2 md:top-3 md:right-6';

                return (
                  <motion.div
                    key={`${currentCake.id}-${garnish.id}`}
                    initial={{
                      opacity: 0,
                      scale: 0.3,
                      rotate: direction * -45,
                      x: direction * 26,
                      y: -16,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      rotate: garnish.rotate,
                      x: 0,
                      y: [0, gIdx % 2 === 0 ? -5 : 5, 0],
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.3,
                      rotate: direction * 45,
                    }}
                    transition={{
                      opacity: { duration: 0.25 },
                      scale: { type: 'spring', stiffness: 280, damping: 20 },
                      rotate: { type: 'spring', stiffness: 220, damping: 20 },
                      y: {
                        duration: 3.2 + gIdx * 0.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      },
                    }}
                    className={`absolute z-20 ${posClasses} pointer-events-none`}
                  >
                    <div className="w-7 h-7 sm:w-9 sm:h-9 md:w-12 md:h-12 rounded-full bg-white/90 p-0.5 sm:p-1 shadow-lg border border-white overflow-hidden">
                      <img
                        src={getAdaptiveImageUrl(garnish.image_url, 'garnish')}
                        alt={garnish.label}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentCake.id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragStart={() => setIsPaused(true)}
                onDragEnd={(e, info) => {
                  setIsPaused(false);
                  handleDragEnd(e, info);
                }}
                onClick={() => onCustomizeCake(currentCake)}
                initial={{
                  opacity: 0,
                  scale: 0.74,
                  rotate: direction * 36,
                  x: direction * 64,
                  y: 22,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: 0,
                  x: 0,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.74,
                  rotate: direction * -36,
                  x: direction * -64,
                  y: 20,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 240,
                  damping: 22,
                }}
                whileHover={{ scale: 1.03, rotate: -2 }}
                className="relative z-10 cursor-grab active:cursor-grabbing touch-pan-y"
              >
                <div className="w-[clamp(98px,28vw,132px)] h-[clamp(98px,28vw,132px)] rounded-full bg-white p-1.5 shadow-[0_14px_26px_rgba(0,0,0,0.2)] border-[3px] border-white/95 overflow-hidden flex items-center justify-center">
                  <img
                    src={getAdaptiveImageUrl(currentCake.image_url, 'hero')}
                    alt={currentCake.name}
                    decoding="async"
                    fetchPriority="high"
                    className="w-full h-full object-cover rounded-full pointer-events-none select-none"
                  />
                </div>

                {/* Floating Price Pill */}
                <div
                  style={{ backgroundColor: 'var(--dark-btn)' }}
                  className="absolute -bottom-1 right-0 rounded-full px-2 py-0.5 text-white text-[0.68rem] font-bold shadow-md border-[1px] border-white/30 tabular-nums chromatic-transition"
                >
                  {siteContent.currency || storeConfig.currency}{' '}
                  {currentCake.basePrice.toLocaleString('en-US')}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Subtle Desktop Prev/Next Orbital Arrows */}
            <div
              className={`${
                isMobileLocked ? 'hidden' : 'hidden md:flex'
              } absolute -bottom-2 left-1/2 -translate-x-1/2 items-center gap-2 z-20`}
            >
              <button
                onClick={() => handleStepFlavor(-1)}
                aria-label="আগের ফ্লেভার"
                className="w-8 h-8 rounded-full bg-white/85 hover:bg-white shadow-sm flex items-center justify-center text-stone-800 cursor-pointer transition-transform active:scale-90"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-stone-700/80 px-1.5">
                সোয়াইপ বা ট্যাপ করুন
              </span>
              <button
                onClick={() => handleStepFlavor(1)}
                aria-label="পরের ফ্লেভার"
                className="w-8 h-8 rounded-full bg-white/85 hover:bg-white shadow-sm flex items-center justify-center text-stone-800 cursor-pointer transition-transform active:scale-90"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE THUMB-ZONE: Centered Row of Flavor Switcher Circles */}
        <div
          className={`${
            isMobileLocked ? 'flex' : 'flex md:hidden'
          } relative z-30 mt-2 pt-1.5 border-t-[1px] border-white/25 items-center justify-center gap-2`}
        >
          {heroCakes.map((cake, idx) => {
            const isSelected = cake.id === currentCake.id;
            return (
              <div key={cake.id} className="flex flex-col items-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleThumbnailClick(cake, idx)}
                  aria-label={`Change flavor: ${cake.name}`}
                  className={`w-8 h-8 rounded-full border-[2px] overflow-hidden shadow-sm transition-all cursor-pointer ${
                    isSelected
                      ? 'border-white ring-2 ring-white/55 scale-105'
                      : 'border-white/60 opacity-80'
                  }`}
                >
                  <img
                    src={getAdaptiveImageUrl(cake.image_url, 'thumb')}
                    alt={cake.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover rounded-full"
                  />
                </motion.button>
                <div className="h-1.5 mt-1 w-full flex items-center justify-center">
                  {isSelected && (
                    <div className="w-6 h-1 rounded-full bg-white/35 overflow-hidden shadow-xs">
                      {autoRotateEnabled && heroCakes.length > 1 && !isPaused ? (
                        <motion.div
                          key={`prog-mob-${currentCake.id}`}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{
                            duration: autoRotateSeconds,
                            ease: 'linear',
                          }}
                          className="w-full h-full bg-white origin-left rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-white rounded-full" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ChromaticWaveHero;
