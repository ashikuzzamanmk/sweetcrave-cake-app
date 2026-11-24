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
  CategoryItem,
  CakeCustomizerOption,
} from '../data/cakesData';
import {
  SiteContent,
  DEFAULT_SITE_CONTENT,
  loadSiteContentSync,
  saveSiteContentSync,
} from '../config/siteContent';
import {
  MENU_STORAGE_KEY,
  CATEGORIES_STORAGE_KEY,
  DEFAULT_CATEGORIES,
  loadLocalMenuSync,
  loadLocalCategoriesSync,
  fetchLiveStoreFromSupabase,
  upsertCakeToSupabase,
  deleteCakeFromSupabase,
  upsertCategoryToSupabase,
  deleteCategoryFromSupabase,
  saveSiteContentToSupabase,
  seedFullCatalogToSupabase,
  subscribeToStoreRealtime,
} from '../lib/supabase';
import { prewarmImageLinks } from '../utils/cacheEngine';

const CUSTOM_INGREDIENTS_HISTORY_KEY = 'cake_custom_ingredients_v1';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface StoreContextValue {
  siteContent: SiteContent;
  updateSiteContent: (updates: Partial<SiteContent>) => Promise<ActionResult>;
  cakes: CakeItem[];
  categories: CategoryItem[];
  isLiveConnected: boolean;
  upsertCake: (cake: CakeItem) => Promise<ActionResult>;
  duplicateCake: (cake: CakeItem) => Promise<{ cake: CakeItem; result: ActionResult }>;
  deleteCake: (cakeId: string) => Promise<ActionResult>;
  upsertCategory: (category: CategoryItem) => Promise<ActionResult>;
  deleteCategory: (categoryId: string) => Promise<ActionResult>;
  publishAllToServer: () => Promise<ActionResult>;
  refreshFromServer: () => Promise<boolean>;
  previousIngredients: CakeCustomizerOption[];
  recordIngredientInHistory: (ingredient: CakeCustomizerOption) => void;
  resetToFactoryDefaults: () => Promise<ActionResult>;
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
  const [categories, setCategories] = useState<CategoryItem[]>(() =>
    loadLocalCategoriesSync()
  );
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [savedHistoryIngredients, setSavedHistoryIngredients] = useState<
    CakeCustomizerOption[]
  >(() => loadCustomIngredientHistorySync());

  const cakesRef = useRef<CakeItem[]>(cakes);
  const categoriesRef = useRef<CategoryItem[]>(categories);
  const siteContentRef = useRef<SiteContent>(siteContent);

  useEffect(() => {
    cakesRef.current = cakes;
  }, [cakes]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    siteContentRef.current = siteContent;
  }, [siteContent]);

  useEffect(() => {
    prewarmImageLinks(
      cakes.map((c) => c.image_url),
      'hero'
    );
  }, [cakes]);

  const refreshFromServer = useCallback(async (): Promise<boolean> => {
    const snap = await fetchLiveStoreFromSupabase();
    if (!snap) return false;
    setIsLiveConnected(true);
    if (snap.cakes && snap.cakes.length > 0) {
      cakesRef.current = snap.cakes;
      setCakes(snap.cakes);
    }
    if (snap.categories && snap.categories.length > 0) {
      categoriesRef.current = snap.categories;
      setCategories(snap.categories);
    }
    if (snap.siteContent) {
      siteContentRef.current = snap.siteContent;
      setSiteContent(snap.siteContent);
    }
    return true;
  }, []);

  // Live Supabase fetch on mount + Realtime subscription + visibility refresh
  useEffect(() => {
    void refreshFromServer();

    const unsubscribe = subscribeToStoreRealtime(() => {
      void refreshFromServer();
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshFromServer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshFromServer]);

  const updateSiteContent = useCallback(
    async (updates: Partial<SiteContent>): Promise<ActionResult> => {
      const next = { ...siteContentRef.current, ...updates };
      const res = await saveSiteContentToSupabase(next);
      if (res.ok) {
        siteContentRef.current = next;
        setSiteContent(next);
        saveSiteContentSync(next);
      }
      return res;
    },
    []
  );

  const upsertCake = useCallback(
    async (cake: CakeItem): Promise<ActionResult> => {
      const prev = cakesRef.current;
      const exists = prev.some((c) => c.id === cake.id);
      const sortOrder = exists
        ? cake.displayPriority ?? prev.findIndex((c) => c.id === cake.id)
        : 0;

      const res = await upsertCakeToSupabase(cake, sortOrder);
      if (res.ok) {
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
      }
      return res;
    },
    []
  );

  const duplicateCake = useCallback(
    async (cake: CakeItem): Promise<{ cake: CakeItem; result: ActionResult }> => {
      const copy: CakeItem = {
        ...cake,
        id: `cake-${Date.now()}`,
        slug: `${cake.slug || cake.id}-copy-${Date.now().toString().slice(-4)}`,
        name: `${cake.name} (Copy)`,
        heroTitleLines: [cake.heroTitleLines[0], `${cake.heroTitleLines[1]} ✨`],
      };
      const result = await upsertCake(copy);
      return { cake: copy, result };
    },
    [upsertCake]
  );

  const deleteCake = useCallback(
    async (cakeId: string): Promise<ActionResult> => {
      const prev = cakesRef.current;
      if (prev.length <= 1) {
        return { ok: false, error: 'At least 1 product must remain in the catalog.' };
      }
      const res = await deleteCakeFromSupabase(cakeId);
      if (res.ok) {
        const next = prev.filter((c) => c.id !== cakeId);
        cakesRef.current = next;
        setCakes(next);
        try {
          window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
      }
      return res;
    },
    []
  );

  const upsertCategory = useCallback(
    async (category: CategoryItem): Promise<ActionResult> => {
      const res = await upsertCategoryToSupabase(category);
      if (res.ok) {
        const prev = categoriesRef.current;
        const exists = prev.some((c) => c.id === category.id);
        const next = exists
          ? prev.map((c) => (c.id === category.id ? category : c))
          : [...prev, category];
        next.sort((a, b) => a.sortOrder - b.sortOrder);
        categoriesRef.current = next;
        setCategories(next);
        try {
          window.localStorage.setItem(
            CATEGORIES_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch {
          // Ignore
        }
      }
      return res;
    },
    []
  );

  const deleteCategory = useCallback(
    async (categoryId: string): Promise<ActionResult> => {
      const res = await deleteCategoryFromSupabase(categoryId);
      if (res.ok) {
        const next = categoriesRef.current.filter((c) => c.id !== categoryId);
        categoriesRef.current = next;
        setCategories(next);
        try {
          window.localStorage.setItem(
            CATEGORIES_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch {
          // Ignore
        }
      }
      return res;
    },
    []
  );

  const publishAllToServer = useCallback(async (): Promise<ActionResult> => {
    const res = await seedFullCatalogToSupabase(
      cakesRef.current,
      categoriesRef.current,
      siteContentRef.current
    );
    if (res.ok) {
      await refreshFromServer();
    }
    return res;
  }, [refreshFromServer]);

  const resetToFactoryDefaults = useCallback(async (): Promise<ActionResult> => {
    const res = await seedFullCatalogToSupabase(
      CAKES_DATA,
      DEFAULT_CATEGORIES,
      DEFAULT_SITE_CONTENT
    );
    if (res.ok) {
      siteContentRef.current = DEFAULT_SITE_CONTENT;
      cakesRef.current = CAKES_DATA;
      categoriesRef.current = DEFAULT_CATEGORIES;
      setSiteContent(DEFAULT_SITE_CONTENT);
      setCakes(CAKES_DATA);
      setCategories(DEFAULT_CATEGORIES);
      saveSiteContentSync(DEFAULT_SITE_CONTENT);
      try {
        window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(CAKES_DATA));
        window.localStorage.setItem(
          CATEGORIES_STORAGE_KEY,
          JSON.stringify(DEFAULT_CATEGORIES)
        );
      } catch {
        // Ignore
      }
    }
    return res;
  }, []);

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

  const previousIngredients = useMemo(() => {
    const map = new Map<string, CakeCustomizerOption>();
    for (const item of savedHistoryIngredients) {
      const key = `${item.category}::${item.name.trim().toLowerCase()}`;
      if (!map.has(key)) map.set(key, item);
    }
    for (const cake of cakes) {
      for (const opt of cake.customizerOptions) {
        const key = `${opt.category}::${opt.name.trim().toLowerCase()}`;
        if (!map.has(key)) map.set(key, opt);
      }
    }
    return Array.from(map.values());
  }, [cakes, savedHistoryIngredients]);

  const value = useMemo<StoreContextValue>(
    () => ({
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
    }),
    [
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
