import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CAKES_DATA, CakeItem } from '../data/cakesData';
import { storeConfig } from '../config/storeConfig';
import {
  SiteContent,
  DEFAULT_SITE_CONTENT,
  saveSiteContentSync,
} from '../config/siteContent';
import {
  isExternalHttpImageUrl,
  normalizeImageUrl,
  shouldCheckRemoteSync,
  markRemoteSyncComplete,
} from '../utils/cacheEngine';
import { getActiveMkAdminCode } from '../utils/adminSecurity';

export const MENU_STORAGE_KEY = 'cake_store_menu_v1';
export const MENU_VERSION_STORAGE_KEY = 'cake_store_menu_version_v1';
export const CART_STORAGE_KEY = 'cake_store_cart_v1';
export const WISHLIST_STORAGE_KEY = 'cake_store_wishlist_v1';
export const ORDERS_STORAGE_KEY = 'cake_store_orders_v1';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey.length > 10
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export interface CartItem {
  cartItemId: string;
  cakeId: string;
  name: string;
  image_url: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  weight: string;
  selectedOptionIds: string[];
  selectedOptionNames: string[];
  cakeMessage: string;
}

export interface OrderPayload {
  store_slug: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  cake_inscription: string;
  promo_code?: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total_amount: number;
  items: CartItem[];
}

export interface OrderReceipt extends OrderPayload {
  order_id: string;
  created_at: string;
  synced_to_cloud: boolean;
}

export interface RemoteStoreSnapshot {
  cakes: CakeItem[] | null;
  siteContent: SiteContent | null;
  menuVersion: string | null;
}

/**
 * Synchronous <1ms phone-first cache loader from localStorage (`cake_store_menu_v1`).
 * Users get instant zero-lag loading directly from their phone cache.
 */
export function loadLocalMenuSync(): CakeItem[] {
  if (typeof window === 'undefined') return CAKES_DATA;
  try {
    const cachedRaw = window.localStorage.getItem(MENU_STORAGE_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw) as CakeItem[];
      if (Array.isArray(parsed) && parsed.length >= 1) {
        return parsed;
      }
    }

    window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(CAKES_DATA));
    window.localStorage.setItem(
      MENU_VERSION_STORAGE_KEY,
      storeConfig.menuVersion
    );
    return CAKES_DATA;
  } catch {
    return CAKES_DATA;
  }
}

/**
 * Live Stale-While-Revalidate (SWR) check against Supabase.
 * 1. Queries ONLY the tiny `store_metadata.menu_version` string (~200 bytes).
 * 2. If `menu_version` changed on the server (e.g., Admin added a new cake or offer),
 *    fetches BOTH `cakes_menu` AND `site_content` in parallel and updates the phone cache!
 */
export async function revalidateStoreWithSupabase(
  force = false
): Promise<RemoteStoreSnapshot | null> {
  if (!supabase) return null;
  if (!shouldCheckRemoteSync(force)) return null;

  try {
    const { data: metaData, error: metaError } = await supabase
      .from('store_metadata')
      .select('menu_version')
      .eq('store_slug', storeConfig.storeSlug)
      .maybeSingle();

    markRemoteSyncComplete();

    if (metaError || !metaData?.menu_version) {
      return null;
    }

    const remoteVersion = String(metaData.menu_version);
    const localVersion = window.localStorage.getItem(MENU_VERSION_STORAGE_KEY);
    if (!force && localVersion === remoteVersion) {
      return null; // Phone cache already matches live server
    }

    const [cakesRes, contentRes] = await Promise.all([
      supabase
        .from('cakes_menu')
        .select('payload_json')
        .eq('store_slug', storeConfig.storeSlug)
        .order('sort_order', { ascending: true }),
      supabase
        .from('site_content')
        .select('content_json')
        .eq('store_slug', storeConfig.storeSlug)
        .maybeSingle(),
    ]);

    let nextCakes: CakeItem[] | null = null;
    if (!cakesRes.error && Array.isArray(cakesRes.data) && cakesRes.data.length > 0) {
      const normalized = cakesRes.data
        .map((row: { payload_json: CakeItem }) => row.payload_json)
        .filter(Boolean);
      if (normalized.length > 0) {
        nextCakes = normalized;
        window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(normalized));
      }
    }

    let nextSiteContent: SiteContent | null = null;
    if (!contentRes.error && contentRes.data?.content_json) {
      nextSiteContent = {
        ...DEFAULT_SITE_CONTENT,
        ...(contentRes.data.content_json as Partial<SiteContent>),
      };
      saveSiteContentSync(nextSiteContent);
    }

    window.localStorage.setItem(MENU_VERSION_STORAGE_KEY, remoteVersion);

    if (!nextCakes && !nextSiteContent) {
      return null;
    }

    return {
      cakes: nextCakes,
      siteContent: nextSiteContent,
      menuVersion: remoteVersion,
    };
  } catch {
    return null;
  }
}

export async function revalidateMenuWithSupabase(
  force = false
): Promise<CakeItem[] | null> {
  const snap = await revalidateStoreWithSupabase(force);
  return snap?.cakes || null;
}

/**
 * Strips any accidental inline base64 data URLs before syncing to Supabase so
 * ONLY high-quality external image links (`https://...`) are ever stored on the server.
 */
function sanitizeCakeForLinkOnlyStorage(cake: CakeItem): CakeItem {
  const fallbackImg = CAKES_DATA[0].image_url;
  const cleanUrl = (u: string, w: number) =>
    isExternalHttpImageUrl(u) ? normalizeImageUrl(u, w) : fallbackImg;

  return {
    ...cake,
    image_url: cleanUrl(cake.image_url, 1000),
    garnishes: cake.garnishes.map((g) => ({
      ...g,
      image_url: cleanUrl(g.image_url, 300),
    })) as CakeItem['garnishes'],
    customizerOptions: cake.customizerOptions.map((opt) => ({
      ...opt,
      image_url: cleanUrl(opt.image_url, 300),
    })),
    steps: cake.steps.map((s) => ({
      ...s,
      image_url: cleanUrl(s.image_url, 300),
    })),
  };
}

/**
 * Secure Admin RPC: syncs the entire live cake catalog to Supabase using server-side
 * SHA-256 secret verification (`mk_sync_cakes`), bumping `menu_version` so all users see changes immediately.
 */
export async function syncAllCakesToSupabase(
  cakes: CakeItem[]
): Promise<boolean> {
  if (!supabase || cakes.length === 0) return false;
  const adminCode = getActiveMkAdminCode();
  if (!adminCode) return false;

  try {
    const cleanCakes = cakes.map(sanitizeCakeForLinkOnlyStorage);
    const { data, error } = await supabase.rpc('mk_sync_cakes', {
      p_admin_code: adminCode,
      p_store_slug: storeConfig.storeSlug,
      p_cakes: cleanCakes,
    });
    if (error) return false;

    if (typeof data === 'string' && data) {
      window.localStorage.setItem(MENU_VERSION_STORAGE_KEY, data);
      markRemoteSyncComplete();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Secure Admin RPC: syncs live website text, offers, auto-wave speed & home sections
 * to Supabase (`mk_sync_site_content`) so all users see changes immediately.
 */
export async function syncSiteContentToSupabase(
  content: SiteContent
): Promise<boolean> {
  if (!supabase) return false;
  const adminCode = getActiveMkAdminCode();
  if (!adminCode) return false;

  try {
    // Strip legacy adminPin field before sending to cloud
    const safeContent = { ...content, adminPin: '' };
    const { data, error } = await supabase.rpc('mk_sync_site_content', {
      p_admin_code: adminCode,
      p_store_slug: storeConfig.storeSlug,
      p_content: safeContent,
    });
    if (error) return false;

    if (typeof data === 'string' && data) {
      window.localStorage.setItem(MENU_VERSION_STORAGE_KEY, data);
      markRemoteSyncComplete();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Inserts an order into Supabase `orders` table on checkout with instant local receipt fallback.
 */
export async function submitOrderToSupabase(
  payload: OrderPayload
): Promise<OrderReceipt> {
  const generatedId = `SC-${Math.floor(100000 + Math.random() * 900000)}`;
  const createdAt = new Date().toISOString();
  let syncedToCloud = false;

  if (supabase) {
    try {
      const { error } = await supabase.from('orders').insert([
        {
          order_code: generatedId,
          store_slug: payload.store_slug,
          status: 'pending',
          customer_name: payload.customer_name,
          customer_phone: payload.customer_phone,
          delivery_address: payload.delivery_address,
          cake_inscription: payload.cake_inscription,
          promo_code: payload.promo_code || null,
          subtotal: payload.subtotal,
          discount: payload.discount,
          delivery_fee: payload.delivery_fee,
          total_amount: payload.total_amount,
          items_json: payload.items,
          created_at: createdAt,
        },
      ]);
      if (!error) {
        syncedToCloud = true;
      }
    } catch {
      syncedToCloud = false;
    }
  }

  const receipt: OrderReceipt = {
    ...payload,
    order_id: generatedId,
    created_at: createdAt,
    synced_to_cloud: syncedToCloud,
  };

  try {
    const existingRaw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    const existingOrders: OrderReceipt[] = existingRaw
      ? JSON.parse(existingRaw)
      : [];
    const updated = [receipt, ...existingOrders].slice(0, 25);
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }

  return receipt;
}

export function loadLocalCartSync(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalCartSync(items: CartItem[]): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore
  }
}

export function loadLocalWishlistSync(): string[] {
  if (typeof window === 'undefined') return ['strawberry-velvet-crown'];
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : ['strawberry-velvet-crown'];
  } catch {
    return ['strawberry-velvet-crown'];
  }
}

export function saveLocalWishlistSync(ids: string[]): void {
  try {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore
  }
}
