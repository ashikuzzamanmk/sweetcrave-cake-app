import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Check } from 'lucide-react';
import { getLastSyncLabel } from '../utils/cacheEngine';

export interface PullToRefreshCurtainProps {
  onRefresh: () => Promise<boolean>;
  children: React.ReactNode;
}

/**
 * Clean, lightweight mobile Pull-to-Refresh wrapper (no intro hand animation).
 * Only appears when the user manually pulls down at scrollY === 0.
 */
export const PullToRefreshCurtain: React.FC<PullToRefreshCurtainProps> = ({
  onRefresh,
  children,
}) => {
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [justRefreshed, setJustRefreshed] = useState<boolean>(false);

  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef<boolean>(false);

  const MAX_PULL = 84;
  const TRIGGER_THRESHOLD = 52;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isRefreshing) return;
    if (typeof window !== 'undefined' && window.scrollY <= 2) {
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    } else {
      startYRef.current = null;
      pullingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!pullingRef.current || startYRef.current === null || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - startYRef.current;

    if (delta > 8 && (typeof window === 'undefined' || window.scrollY <= 2)) {
      const damped = Math.min(MAX_PULL, Math.pow(delta - 8, 0.8) * 1.9);
      setPullDistance(damped);
    } else if (delta <= 0) {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    startYRef.current = null;

    if (pullDistance >= TRIGGER_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(48);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setJustRefreshed(true);
          setPullDistance(0);
          setTimeout(() => setJustRefreshed(false), 1600);
        }, 380);
      }
    } else {
      setPullDistance(0);
    }
  };

  const isVisible = pullDistance > 6 || isRefreshing;
  const progress = Math.min(1, pullDistance / TRIGGER_THRESHOLD);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full"
    >
      {/* Minimal Pull-to-Refresh Indicator (only when manually pulling) */}
      <motion.div
        aria-hidden={!isVisible}
        animate={{
          height: isVisible ? pullDistance : 0,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 320,
          damping: 28,
        }}
        className="w-full overflow-hidden flex items-center justify-center pointer-events-none select-none"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md border-[1px] border-black/8 px-3 py-1 shadow-xs text-[0.65rem] font-semibold text-stone-700">
          <RefreshCw
            className={`w-3 h-3 text-stone-700 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
          <span>
            {isRefreshing
              ? 'Refreshing Fresh Menu...'
              : progress >= 1
              ? 'Release to Refresh'
              : getLastSyncLabel()}
          </span>
        </div>
      </motion.div>

      <AnimatePresence>
        {justRefreshed && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.92 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-40 rounded-full bg-white/95 backdrop-blur-md border-[1px] border-black/8 px-3 py-1 shadow-md flex items-center gap-1.5 text-[0.68rem] font-semibold text-stone-800 pointer-events-none"
          >
            <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
            <span>Fresh Menu Ready (Cached)</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full">{children}</div>
    </div>
  );
};

export default PullToRefreshCurtain;
