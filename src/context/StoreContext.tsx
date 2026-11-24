import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  CAKES_DATA,
  CakeItem,
  CakeCustomizerOption,
} from '../data/cakesData';
import {
  SiteContent,
  DEFAULT_SITE_CONTENT,
  loadSiteContentSync,
  saveSiteContentSync,
  SITE_CONTENT_STORAGE_KEY,
} from '../config/siteContent';
import { storeConfig } from '../config/storeConfig';
import {
  MENU_STORAGE_KEY,
  MENU_VERSION_STORAGE_KEY,
  loadLocalMenuSync,
  revalidateStoreWithSupabase,
  syncAllCakesToSupabase,
  syncSiteContentToSupabase,
} from '../lib/supabase';
import { prewarmImageLinks } from '../utils/cacheEngine';

const CUSTOM_INGREDIENTS_HISTORY_KEY = 'cake_custom_ingredients_v1';

export interface StoreContextValue {
  siteContent: SiteContent;
  updateSiteContent: (updates: Partial<SiteContent>) => Promise<boolean>;
  cakes: CakeItem[];
  updateCakes: (nextCakes: CakeItem[]) => Promise<boolean>;
  upsertCake: (cake: CakeItem) => Promise<boolean>;
  duplicateCake: (cake: CakeItem) => CakeItem;
  deleteCake: (cakeId: string) => Promise<boolean>;
  publishAllToServer: () => Promise<boolean>;
  refreshFromServer: () => Promise<boolean>;
  previousIngredients: CakeCustomizerOption[];
  recordIngredientInHistory: (ingredient: CakeCustomizerOption) => void;
  resetToFactoryDefaults: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function loadCustomIngredientHistorySync(): CakeCustomizerOption[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_INGREDIENTS_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as CakeCustomizerOption[]) : [];
  } catch {
    return [];
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [siteContent, setSiteContent] = useState<SiteContent>(() =>
    loadSiteContentSync()
  );
  const [cakes, setCakes] = useState<CakeItem[]>(() => loadLocalMenuSync());
  const [savedHistoryIngredients, setSavedHistoryIngredients] = useState<
    CakeCustomizerOption[]
  >(() => loadCustomIngredientHistorySync());

  const cakesRef = useRef<CakeItem[]>(cakes);
  const siteContentRef = useRef<SiteContent>(siteContent);

  useEffect(() => {
    cakesRef.current = cakes;
  }, [cakes]);

  useEffect(() => {
    siteContentRef.current = siteContent;
  }, [siteContent]);

  // Quietly prewarm active hero/wheel image links for 60fps transitions
  useEffect(() => {
    prewarmImageLinks(
      cakes.map((c) => c.image_url),
      'hero'
    );
  }, [cakes]);

  // Live SWR sync on initial mount AND whenever user returns to the browser tab
  useEffect(() => {
    let active = true;

    const checkLiveUpdates = async (forceCheck: boolean) => {
      const snap = await revalidateStoreWithSupabase(forceCheck);
      if (!active || !snap) return;
      if (snap.cakes && snap.cakes.length > 0) {
        setCakes(snap.cakes);
      }
      if (snap.siteContent) {
        setSiteContent(snap.siteContent);
      }
    };

    // Always run 1 lightweight version check on load so other users immediately get live Admin additions
    void checkLiveUpdates(true);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkLiveUpdates(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const refreshFromServer = useCallback(async () => {
    const snap = await revalidateStoreWithSupabase(true);
    let updated = false;
    if (snap?.cakes && snap.cakes.length > 0) {
      setCakes(snap.cakes);
      updated = true;
    }
    if (snap?.siteContent) {
      setSiteContent(snap.siteContent);
      updated = true;
    }
    return updated;
  }, []);

  const updateSiteContent = useCallback(
    async (updates: Partial<SiteContent>): Promise<boolean> => {
      const next = { ...siteContentRef.current, ...updates };
      siteContentRef.current = next;
      setSiteContent(next);
      saveSiteContentSync(next);
      return await syncSiteContentToSupabase(next);
    },
    []
  );

  const updateCakes = useCallback(
    async (nextCakes: CakeItem[]): Promise<boolean> => {
      cakesRef.current = nextCakes;
      setCakes(nextCakes);
      try {
        window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(nextCakes));
      } catch {
        // Ignore storage quota errors
      }
      return await syncAllCakesToSupabase(nextCakes);
    },
    []
  );

  const recordIngredientInHistory = useCallback(
    (ingredient: CakeCustomizerOption) => {
      setSavedHistoryIngredients((prev) => {
        const filtered = prev.filter(
          (item) =>
            item.name.trim().toLowerCase() !==
            ingredient.name.trim().toLowerCase()
        );
        const next = [ingredient, ...filtered].slice(0, 36);
        try {
          window.localStorage.setItem(
            CUSTOM_INGREDIENTS_HISTORY_KEY,
            JSON.stringify(next)
          );
        } catch {
          // Ignore
        }
        return next;
      });
    },
    []
  );

  const upsertCake = useCallback(async (cake: CakeItem): Promise<boolean> => {
    const prev = cakesRef.current;
    const exists = prev.some((c) => c.id === cake.id);
    const next = exists
      ? prev.map((c) => (c.id === cake.id ? cake : c))
      : [cake, ...prev];

    cakesRef.current = next;
    setCakes(next);
    try {
      window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
    return await syncAllCakesToSupabase(next);
  }, []);

  const duplicateCake = useCallback(
    (cake: CakeItem): CakeItem => {
      const copy: CakeItem = {
        ...cake,
        id: `cake-${Date.now()}`,
        name: `${cake.name} (Copy)`,
        heroTitleLines: [cake.heroTitleLines[0], `${cake.heroTitleLines[1]} ✨`],
      };
      void upsertCake(copy);
      return copy;
    },
    [upsertCake]
  );

  const deleteCake = useCallback(async (cakeId: string): Promise<boolean> => {
    const prev = cakesRef.current;
    if (prev.length <= 1) return false;
    const next = prev.filter((c) => c.id !== cakeId);
    cakesRef.current = next;
    setCakes(next);
    try {
      window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
    return await syncAllCakesToSupabase(next);
  }, []);

  const publishAllToServer = useCallback(async (): Promise<boolean> => {
    const [cakesOk, contentOk] = await Promise.all([
      syncAllCakesToSupabase(cakesRef.current),
      syncSiteContentToSupabase(siteContentRef.current),
    ]);
    return cakesOk && contentOk;
  }, []);

  const resetToFactoryDefaults = useCallback(() => {
    siteContentRef.current = DEFAULT_SITE_CONTENT;
    cakesRef.current = CAKES_DATA;
    setSiteContent(DEFAULT_SITE_CONTENT);
    setCakes(CAKES_DATA);
    setSavedHistoryIngredients([]);
    try {
      window.localStorage.setItem(
        SITE_CONTENT_STORAGE_KEY,
        JSON.stringify(DEFAULT_SITE_CONTENT)
      );
      window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(CAKES_DATA));
      window.localStorage.setItem(
        MENU_VERSION_STORAGE_KEY,
        storeConfig.menuVersion
      );
      window.localStorage.removeItem(CUSTOM_INGREDIENTS_HISTORY_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Deduplicated gallery of all previously added customizer ingredients across all cakes
  const previousIngredients = useMemo(() => {
    const map = new Map<string, CakeCustomizerOption>();
    for (const item of savedHistoryIngredients) {
      const key = `${item.category}::${item.name.trim().toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    }
    for (const cake of cakes) {
      for (const opt of cake.customizerOptions) {
        const key = `${opt.category}::${opt.name.trim().toLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, opt);
        }
      }
    }
    return Array.from(map.values());
  }, [cakes, savedHistoryIngredients]);

  const value = useMemo<StoreContextValue>(
    () => ({
      siteContent,
      updateSiteContent,
      cakes,
      updateCakes,
      upsertCake,
      duplicateCake,
      deleteCake,
      publishAllToServer,
      refreshFromServer,
      previousIngredients,
      recordIngredientInHistory,
      resetToFactoryDefaults,
    }),
    [
      siteContent,
      updateSiteContent,
      cakes,
      updateCakes,
      upsertCake,
      duplicateCake,
      deleteCake,
      publishAllToServer,
      refreshFromServer,
      previousIngredients,
      recordIngredientInHistory,
      resetToFactoryDefaults,
    ]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return ctx;
}
