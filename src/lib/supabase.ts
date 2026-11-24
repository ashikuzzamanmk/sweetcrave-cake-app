import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { CAKES_DATA, CakeItem, CategoryItem } from '../data/cakesData';
import { storeConfig } from '../config/storeConfig';
import {
  SiteContent,
  DEFAULT_SITE_CONTENT,
  saveSiteContentSync,
} from '../config/siteContent';
import {
  isExternalHttpImageUrl,
  normalizeImageUrl,
  markRemoteSyncComplete,
} from '../utils/cacheEngine';

export const MENU_STORAGE_KEY = 'cake_store_menu_v1';
export const CATEGORIES_STORAGE_KEY = 'cake_store_categories_v1';
export const MENU_VERSION_STORAGE_KEY = 'cake_store_menu_version_v1';
export const CART_STORAGE_KEY = 'cake_store_cart_v1';
export const WISHLIST_STORAGE_KEY = 'cake_store_wishlist_v1';

export const PRODUCT_IMAGES_BUCKET = 'product-images';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey.length > 10
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export interface CartItem {
  cartItemId: string;
  cakeId: string;
  name: string;
  image_url: string;
  basePrice: number;
  addonsUnitPrice?: number;
  unitPrice: number;
  quantity: number;
  weight: string;
  selectedOptionIds: string[];
  selectedOptionNames: string[];
  cakeMessage: string;
  specialInstructions?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';
export type OrderType = 'delivery' | 'pickup';

export interface OrderStatusHistoryEntry {
  status: string;
  payment_status?: string;
  at: string;
  note?: string;
}

export interface OrderPayload {
  store_slug: string;
  idempotency_key: string;
  order_type: OrderType;
  customer_name: string;
  customer_phone: string;
  customer_alt_phone?: string;
  customer_email?: string;
  delivery_address: string;
  delivery_city?: string;
  delivery_area?: string;
  delivery_postal_code?: string;
  delivery_date?: string;
  delivery_time_window?: string;
  delivery_instructions?: string;
  cake_inscription: string;
  promo_code?: string;
  payment_method: string;
  items: CartItem[];
}

export interface DatabaseOrder {
  id: string;
  order_code: string;
  store_slug: string;
  status: OrderStatus;
  order_type: OrderType;
  customer_name: string;
  customer_phone: string;
  customer_alt_phone?: string | null;
  customer_email?: string | null;
  delivery_address: string;
  delivery_city?: string | null;
  delivery_area?: string | null;
  delivery_postal_code?: string | null;
  delivery_date?: string | null;
  delivery_time_window?: string | null;
  delivery_instructions?: string | null;
  cake_inscription?: string | null;
  promo_code?: string | null;
  subtotal: number;
  addons_total: number;
  discount: number;
  delivery_fee: number;
  total_amount: number;
  payment_method: string;
  payment_status: PaymentStatus;
  items_json: CartItem[];
  status_history: OrderStatusHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface OrderReceipt {
  order_id: string;
  db_id: string;
  status: OrderStatus;
  order_type: OrderType;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_date?: string | null;
  delivery_time_window?: string | null;
  cake_inscription: string;
  subtotal: number;
  addons_total: number;
  discount: number;
  delivery_fee: number;
  total_amount: number;
  payment_method: string;
  items: CartItem[];
  created_at: string;
  synced_to_cloud: boolean;
}

export interface OrderTrackingResult {
  order_code: string;
  status: OrderStatus;
  order_type: OrderType;
  delivery_date?: string | null;
  delivery_time_window?: string | null;
  total_amount: number;
  payment_status: PaymentStatus;
  status_history: OrderStatusHistoryEntry[];
  created_at: string;
}

export interface RemoteStoreSnapshot {
  cakes: CakeItem[] | null;
  categories: CategoryItem[] | null;
  siteContent: SiteContent | null;
  menuVersion: string | null;
}

export const DEFAULT_CATEGORIES: CategoryItem[] = storeConfig.categories
  .filter((c) => c.id !== 'সব কেক')
  .map((c, idx) => ({
    id: `cat-${idx + 1}`,
    name: c.label,
    slug: c.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: '',
    image_url: c.image_url,
    isVisible: true,
    sortOrder: idx + 1,
  }));

// ----------------------------------------------------------------------------
// LOCAL CACHE HYDRATION (FAST INITIAL PAINT — SUPABASE IS SOURCE OF TRUTH)
// ----------------------------------------------------------------------------
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
    return CAKES_DATA;
  } catch {
    return CAKES_DATA;
  }
}

export function loadLocalCategoriesSync(): CategoryItem[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const cachedRaw = window.localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw) as CategoryItem[];
      if (Array.isArray(parsed) && parsed.length >= 1) {
        return parsed;
      }
    }
    return DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

// ----------------------------------------------------------------------------
// PUBLIC LIVE FETCH FROM SUPABASE (SOURCE OF TRUTH)
// ----------------------------------------------------------------------------
export async function fetchLiveStoreFromSupabase(): Promise<RemoteStoreSnapshot | null> {
  if (!supabase) return null;

  try {
    const [cakesRes, categoriesRes, contentRes, metaRes] = await Promise.all([
      supabase
        .from('cakes_menu')
        .select('*')
        .eq('store_slug', storeConfig.storeSlug)
        .order('sort_order', { ascending: true }),
      supabase
        .from('categories')
        .select('*')
        .eq('store_slug', storeConfig.storeSlug)
        .order('sort_order', { ascending: true }),
      supabase
        .from('site_content')
        .select('content_json')
        .eq('store_slug', storeConfig.storeSlug)
        .maybeSingle(),
      supabase
        .from('store_metadata')
        .select('menu_version')
        .eq('store_slug', storeConfig.storeSlug)
        .maybeSingle(),
    ]);

    markRemoteSyncComplete();

    let nextCakes: CakeItem[] | null = null;
    if (!cakesRes.error && Array.isArray(cakesRes.data) && cakesRes.data.length > 0) {
      nextCakes = cakesRes.data
        .map((row: Record<string, unknown>) => {
          const payload = (row.payload_json || {}) as Partial<CakeItem>;
          if (!payload.id && !row.id) return null;
          return {
            ...payload,
            id: String(row.id ?? payload.id),
            name: String(row.name ?? payload.name ?? ''),
            category: String(row.category ?? payload.category ?? 'Birthday Cake'),
            basePrice: Number(row.base_price ?? payload.basePrice ?? 0),
            image_url: String(row.image_url ?? payload.image_url ?? ''),
            slug: (row.slug as string) || payload.slug,
            isVisible:
              typeof row.is_visible === 'boolean'
                ? row.is_visible
                : payload.isVisible !== false,
            isAvailable:
              typeof row.is_available === 'boolean'
                ? row.is_available
                : payload.isAvailable !== false,
            isFeatured:
              typeof row.is_featured === 'boolean'
                ? row.is_featured
                : Boolean(payload.isFeatured ?? payload.isHeroFlavor),
            displayPriority: Number(row.sort_order ?? payload.displayPriority ?? 0),
            stockLimit:
              row.stock_limit === null || row.stock_limit === undefined
                ? payload.stockLimit ?? null
                : Number(row.stock_limit),
            deliveryAvailable:
              typeof row.delivery_available === 'boolean'
                ? row.delivery_available
                : payload.deliveryAvailable !== false,
            pickupAvailable:
              typeof row.pickup_available === 'boolean'
                ? row.pickup_available
                : payload.pickupAvailable !== false,
          } as CakeItem;
        })
        .filter((c): c is CakeItem => Boolean(c));

      if (nextCakes.length > 0) {
        try {
          window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(nextCakes));
        } catch {
          // Ignore quota errors
        }
      }
    }

    let nextCategories: CategoryItem[] | null = null;
    if (
      !categoriesRes.error &&
      Array.isArray(categoriesRes.data) &&
      categoriesRes.data.length > 0
    ) {
      nextCategories = categoriesRes.data.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        name: String(row.name),
        slug: String(row.slug || ''),
        description: String(row.description || ''),
        image_url: String(row.image_url || ''),
        isVisible: row.is_visible !== false,
        sortOrder: Number(row.sort_order ?? 0),
      }));
      try {
        window.localStorage.setItem(
          CATEGORIES_STORAGE_KEY,
          JSON.stringify(nextCategories)
        );
      } catch {
        // Ignore
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

    const menuVersion = metaRes.data?.menu_version
      ? String(metaRes.data.menu_version)
      : null;
    if (menuVersion) {
      try {
        window.localStorage.setItem(MENU_VERSION_STORAGE_KEY, menuVersion);
      } catch {
        // Ignore
      }
    }

    if (!nextCakes && !nextCategories && !nextSiteContent) {
      return null;
    }

    return {
      cakes: nextCakes,
      categories: nextCategories,
      siteContent: nextSiteContent,
      menuVersion,
    };
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// ADMIN CRUD OPERATIONS (REQUIRES AUTHENTICATED SUPABASE ADMIN SESSION)
// ----------------------------------------------------------------------------
function sanitizeCakeForStorage(cake: CakeItem): CakeItem {
  const fallbackImg = CAKES_DATA[0].image_url;
  const cleanUrl = (u: string, w: number) =>
    isExternalHttpImageUrl(u) ? normalizeImageUrl(u, w) : fallbackImg;

  return {
    ...cake,
    slug:
      cake.slug ||
      cake.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') ||
      cake.id,
    isVisible: cake.isVisible !== false,
    isAvailable: cake.isAvailable !== false,
    isFeatured: Boolean(cake.isFeatured ?? cake.isHeroFlavor),
    image_url: cleanUrl(cake.image_url, 1000),
    galleryImages: (cake.galleryImages || [])
      .filter((u) => isExternalHttpImageUrl(u))
      .map((u) => normalizeImageUrl(u, 1000)),
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

async function bumpStoreMetadataVersion(): Promise<void> {
  if (!supabase) return;
  const nextVer = `v-${Date.now()}`;
  await supabase.from('store_metadata').upsert(
    {
      store_slug: storeConfig.storeSlug,
      menu_version: nextVer,
    },
    { onConflict: 'store_slug' }
  );
  try {
    window.localStorage.setItem(MENU_VERSION_STORAGE_KEY, nextVer);
  } catch {
    // Ignore
  }
}

export async function upsertCakeToSupabase(
  cake: CakeItem,
  sortOrder?: number
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Database not configured.' };
  try {
    const clean = sanitizeCakeForStorage(cake);
    const { error } = await supabase.from('cakes_menu').upsert(
      {
        id: clean.id,
        store_slug: storeConfig.storeSlug,
        slug: clean.slug,
        name: clean.name,
        category: clean.category,
        base_price: Math.max(0, Math.round(clean.basePrice)),
        promo_price: clean.originalPrice ? Math.round(clean.originalPrice) : null,
        image_url: clean.image_url,
        sort_order: sortOrder ?? clean.displayPriority ?? 0,
        is_visible: clean.isVisible !== false,
        is_available: clean.isAvailable !== false,
        is_featured: Boolean(clean.isFeatured ?? clean.isHeroFlavor),
        stock_limit: clean.stockLimit ?? null,
        delivery_available: clean.deliveryAvailable !== false,
        pickup_available: clean.pickupAvailable !== false,
        payload_json: clean,
      },
      { onConflict: 'id' }
    );
    if (error) {
      return { ok: false, error: error.message };
    }
    await bumpStoreMetadataVersion();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Failed to save product to database.' };
  }
}

export async function deleteCakeFromSupabase(
  cakeId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Database not configured.' };
  try {
    const { error } = await supabase
      .from('cakes_menu')
      .delete()
      .eq('id', cakeId)
      .eq('store_slug', storeConfig.storeSlug);
    if (error) return { ok: false, error: error.message };
    await bumpStoreMetadataVersion();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Failed to delete product.' };
  }
}

export async function seedFullCatalogToSupabase(
  cakes: CakeItem[],
  categories: CategoryItem[],
  siteContent: SiteContent
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Database not configured.' };
  try {
    const cakeRows = cakes.map((c, idx) => {
      const clean = sanitizeCakeForStorage(c);
      return {
        id: clean.id,
        store_slug: storeConfig.storeSlug,
        slug: clean.slug,
        name: clean.name,
        category: clean.category,
        base_price: Math.max(0, Math.round(clean.basePrice)),
        promo_price: clean.originalPrice ? Math.round(clean.originalPrice) : null,
        image_url: clean.image_url,
        sort_order: idx,
        is_visible: clean.isVisible !== false,
        is_available: clean.isAvailable !== false,
        is_featured: Boolean(clean.isFeatured ?? clean.isHeroFlavor),
        stock_limit: clean.stockLimit ?? null,
        delivery_available: clean.deliveryAvailable !== false,
        pickup_available: clean.pickupAvailable !== false,
        payload_json: clean,
      };
    });

    const catRows = categories.map((cat, idx) => ({
      id: cat.id,
      store_slug: storeConfig.storeSlug,
      name: cat.name,
      slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: cat.description || '',
      image_url: normalizeImageUrl(cat.image_url, 300),
      is_visible: cat.isVisible !== false,
      sort_order: cat.sortOrder ?? idx,
    }));

    const [r1, r2, r3] = await Promise.all([
      supabase.from('cakes_menu').upsert(cakeRows, { onConflict: 'id' }),
      supabase.from('categories').upsert(catRows, { onConflict: 'id' }),
      supabase.from('site_content').upsert(
        {
          store_slug: storeConfig.storeSlug,
          content_json: { ...siteContent, adminPin: undefined },
        },
        { onConflict: 'store_slug' }
      ),
    ]);

    if (r1.error) return { ok: false, error: r1.error.message };
    if (r2.error) return { ok: false, error: r2.error.message };
    if (r3.error) return { ok: false, error: r3.error.message };

    await bumpStoreMetadataVersion();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Failed to publish catalog to Supabase.' };
  }
}

export async function upsertCategoryToSupabase(
  category: CategoryItem
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Database not configured.' };
  try {
    const { error } = await supabase.from('categories').upsert(
      {
        id: category.id,
        store_slug: storeConfig.storeSlug,
        name: category.name.trim(),
        slug:
          category.slug ||
          category.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
        description: category.description || '',
        image_url: normalizeImageUrl(category.image_url, 300),
        is_visible: category.isVisible !== false,
        sort_order: category.sortOrder ?? 0,
      },
      { onConflict: 'id' }
    );
    if (error) return { ok: false, error: error.message };
    await bumpStoreMetadataVersion();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Failed to save category.' };
  }
}

export async function deleteCategoryFromSupabase(
  categoryId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Database not configured.' };
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('store_slug', storeConfig.storeSlug);
    if (error) return { ok: false, error: error.message };
    await bumpStoreMetadataVersion();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Failed to delete category.' };
  }
}

export async function saveSiteContentToSupabase(
  content: SiteContent
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Database not configured.' };
  try {
    const safeContent = { ...content, adminPin: undefined };
    const { error } = await supabase.from('site_content').upsert(
      {
        store_slug: storeConfig.storeSlug,
        content_json: safeContent,
      },
      { onConflict: 'store_slug' }
    );
    if (error) return { ok: false, error: error.message };
    await bumpStoreMetadataVersion();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Failed to save store settings.' };
  }
}

// ----------------------------------------------------------------------------
// SUPABASE STORAGE IMAGE UPLOAD & REMOVAL (ADMIN-ONLY)
// ----------------------------------------------------------------------------
export async function uploadProductImageToStorage(
  file: File,
  folder: 'products' | 'categories' | 'banners' | 'options' = 'products'
): Promise<{ ok: boolean; publicUrl?: string; error?: string }> {
  if (!supabase) return { ok: false, error: 'Database storage not configured.' };

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      error: 'Unsupported image format. Please upload JPG, PNG, WebP, or GIF.',
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: 'Image file is too large. Maximum allowed size is 5 MB.',
    };
  }

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)
      ? ext
      : 'webp';
    const path = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${safeExt}`;

    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return { ok: false, error: error.message };
    }

    const { data } = supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(path);

    return { ok: true, publicUrl: data.publicUrl };
  } catch {
    return { ok: false, error: 'Image upload failed. Please try again.' };
  }
}

export async function deleteProductImageFromStorage(
  publicUrl: string
): Promise<boolean> {
  if (!supabase || !publicUrl) return false;
  try {
    const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return false;
    const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([path]);
    return !error;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// SERVER-VALIDATED ORDER SUBMISSION (NO FAKE SUCCESS!)
// ----------------------------------------------------------------------------
export async function submitValidatedOrderToSupabase(
  payload: OrderPayload
): Promise<{ ok: boolean; receipt?: OrderReceipt; error?: string }> {
  if (!supabase) {
    return {
      ok: false,
      error:
        'Ordering service is currently unavailable. Please contact the store directly.',
    };
  }

  try {
    const { data, error } = await supabase.rpc('create_validated_order', {
      p_payload: payload,
    });

    if (error || !data) {
      const msg = error?.message || '';
      if (msg.includes('store_closed')) {
        return {
          ok: false,
          error: 'The bakery is currently not accepting new orders. Please check back soon.',
        };
      }
      if (msg.includes('product_unavailable')) {
        return {
          ok: false,
          error:
            'One or more items in your cart are currently unavailable. Please refresh your cart.',
        };
      }
      if (msg.includes('invalid_delivery_date')) {
        return {
          ok: false,
          error: 'Please choose today or a future delivery date.',
        };
      }
      if (msg.includes('invalid_phone')) {
        return {
          ok: false,
          error: 'Please enter a valid mobile number.',
        };
      }
      return {
        ok: false,
        error:
          'Unable to confirm your order right now. Please try again or call the store.',
      };
    }

    const row = data as DatabaseOrder;
    const receipt: OrderReceipt = {
      order_id: row.order_code,
      db_id: row.id,
      status: row.status,
      order_type: row.order_type,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      delivery_address: row.delivery_address,
      delivery_date: row.delivery_date,
      delivery_time_window: row.delivery_time_window,
      cake_inscription: row.cake_inscription || '',
      subtotal: row.subtotal,
      addons_total: row.addons_total || 0,
      discount: row.discount,
      delivery_fee: row.delivery_fee,
      total_amount: row.total_amount,
      payment_method: row.payment_method,
      items: Array.isArray(row.items_json) ? row.items_json : payload.items,
      created_at: row.created_at,
      synced_to_cloud: true,
    };

    return { ok: true, receipt };
  } catch {
    return {
      ok: false,
      error: 'Network error while submitting order. Please check your connection and retry.',
    };
  }
}

export async function trackOrderByCode(
  orderCode: string,
  customerPhone: string
): Promise<OrderTrackingResult | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('track_order_by_code', {
      p_order_code: orderCode.trim(),
      p_customer_phone: customerPhone.trim(),
    });
    if (error || !data) return null;
    return data as OrderTrackingResult;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// ADMIN ORDERS CRM QUERIES & STATUS LIFECYCLE UPDATES
// ----------------------------------------------------------------------------
export async function fetchAdminOrders(): Promise<{
  ok: boolean;
  orders: DatabaseOrder[];
  error?: string;
}> {
  if (!supabase) return { ok: false, orders: [], error: 'Database not configured.' };
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('store_slug', storeConfig.storeSlug)
      .order('created_at', { ascending: false })
      .limit(250);

    if (error) {
      return { ok: false, orders: [], error: error.message };
    }
    return { ok: true, orders: (data || []) as DatabaseOrder[] };
  } catch {
    return { ok: false, orders: [], error: 'Could not load orders.' };
  }
}

export async function updateAdminOrderStatus(
  orderId: string,
  status: OrderStatus,
  paymentStatus?: PaymentStatus,
  note?: string
): Promise<{ ok: boolean; order?: DatabaseOrder; error?: string }> {
  if (!supabase) return { ok: false, error: 'Database not configured.' };
  try {
    const { data, error } = await supabase.rpc('admin_update_order_status', {
      p_order_id: orderId,
      p_status: status,
      p_payment_status: paymentStatus ?? null,
      p_note: note ?? null,
    });
    if (error || !data) {
      return { ok: false, error: error?.message || 'Status update failed.' };
    }
    return { ok: true, order: data as DatabaseOrder };
  } catch {
    return { ok: false, error: 'Network error while updating order status.' };
  }
}

// ----------------------------------------------------------------------------
// SUPABASE REALTIME SUBSCRIPTIONS (AUTO-CLEANUP)
// ----------------------------------------------------------------------------
export function subscribeToStoreRealtime(
  onStoreChange: () => void
): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  let debounceTimer: number | null = null;

  const scheduleRefresh = () => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      onStoreChange();
    }, 250);
  };

  const channel: RealtimeChannel = client
    .channel(`storefront-live-${storeConfig.storeSlug}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cakes_menu' },
      scheduleRefresh
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'categories' },
      scheduleRefresh
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'site_content' },
      scheduleRefresh
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'store_metadata' },
      scheduleRefresh
    )
    .subscribe();

  return () => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    void client.removeChannel(channel);
  };
}

export function subscribeToAdminOrdersRealtime(
  onOrdersChange: () => void
): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel: RealtimeChannel = client
    .channel(`admin-orders-live-${storeConfig.storeSlug}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      () => onOrdersChange()
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

// ----------------------------------------------------------------------------
// CART & WISHLIST BROWSER PERSISTENCE (CLIENT SESSION CONVENIENCE ONLY)
// ----------------------------------------------------------------------------
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
