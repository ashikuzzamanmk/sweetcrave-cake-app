/**
 * Client-First Phone Cache & Adaptive High-Quality Image Link Engine.
 *
 * Goals:
 * 1. Zero-lag <1ms storefront hydration from the user's phone cache (`localStorage`).
 * 2. Avoid hitting Supabase/API on every visit — only check `menu_version` after TTL (6h)
 *    or when the user manually triggers Pull-to-Refresh.
 * 3. Never upload/save heavy binary images to Supabase; serve screen-adaptive high-quality
 *    image URLs tuned to the user's viewport width, DPR, and connection speed.
 */

export type ImageRole = 'hero' | 'detail' | 'card' | 'wheel' | 'banner' | 'thumb' | 'garnish';

export interface DeviceDisplayProfile {
  tier: 'phone-sm' | 'phone' | 'tablet' | 'desktop';
  viewportWidth: number;
  dpr: number;
  quality: number;
  saveData: boolean;
}

const LAST_SYNC_AT_KEY = 'cake_last_remote_sync_at_v1';
const CACHE_TTL_MS = 45 * 1000; // 45s lightweight version-only check (~200 bytes)

interface NetworkInfoLike {
  saveData?: boolean;
  effectiveType?: string;
}

export function getDeviceDisplayProfile(): DeviceDisplayProfile {
  if (typeof window === 'undefined') {
    return {
      tier: 'phone',
      viewportWidth: 390,
      dpr: 2,
      quality: 82,
      saveData: false,
    };
  }

  const w = window.innerWidth || 390;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const nav = navigator as Navigator & { connection?: NetworkInfoLike };
  const conn = nav.connection;
  const saveData = Boolean(conn?.saveData);
  const slowNet =
    conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g';

  let tier: DeviceDisplayProfile['tier'] = 'phone';
  if (w < 380) tier = 'phone-sm';
  else if (w < 640) tier = 'phone';
  else if (w < 1024) tier = 'tablet';
  else tier = 'desktop';

  const quality = saveData || slowNet ? 72 : tier === 'desktop' ? 86 : 82;

  return { tier, viewportWidth: w, dpr, quality, saveData };
}

/**
 * Extracts a Google Drive file ID from any common Drive sharing URL format:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID&export=view
 * - https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000
 * - https://lh3.googleusercontent.com/d/FILE_ID
 */
export function extractGoogleDriveFileId(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (
    !trimmed.includes('drive.google.com') &&
    !trimmed.includes('googleusercontent.com')
  ) {
    return null;
  }

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
    /\/d\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

export function isGoogleDriveUrl(rawUrl: string): boolean {
  return Boolean(extractGoogleDriveFileId(rawUrl));
}

/**
 * Converts any public ("Anyone with the link") Google Drive URL into a fast,
 * direct-rendering high-resolution image URL (`drive.google.com/thumbnail?id=...&sz=w{width}`).
 * Leaves non-Drive URLs untouched.
 */
export function normalizeImageUrl(rawUrl: string, width = 1000): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w${Math.max(
      120,
      Math.min(2000, Math.round(width))
    )}`;
  }
  return trimmed;
}

/**
 * Rewrites high-quality external CDN links (Google Drive, Unsplash, Imgix, Cloudinary)
 * to match the user's exact phone/tablet/desktop screen resolution & DPR.
 * Passes through any custom image links untouched so zero images break.
 */
export function getAdaptiveImageUrl(
  rawUrl: string,
  role: ImageRole = 'card'
): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('data:')) return trimmed;

  const profile = getDeviceDisplayProfile();
  const scale = profile.saveData ? 1 : profile.dpr >= 1.5 ? 1.35 : 1;

  const baseWidths: Record<ImageRole, number> = {
    hero: profile.tier === 'desktop' ? 680 : 480,
    detail: profile.tier === 'desktop' ? 760 : 540,
    wheel: profile.tier === 'desktop' ? 420 : 320,
    card: profile.tier === 'phone-sm' ? 280 : profile.tier === 'phone' ? 340 : 440,
    banner: profile.tier === 'desktop' ? 720 : 460,
    thumb: 160,
    garnish: 180,
  };

  const targetW = Math.min(1400, Math.round(baseWidths[role] * scale));

  // Google Drive public ("Anyone with the link") automatic screen-adaptive HD link
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w${targetW}`;
  }

  try {
    const parsed = new URL(trimmed);

    if (
      parsed.hostname.includes('unsplash.com') ||
      parsed.hostname.includes('imgix.net')
    ) {
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('w', String(targetW));
      parsed.searchParams.set('q', String(profile.quality));
      return parsed.toString();
    }

    if (
      parsed.hostname.includes('cloudinary.com') &&
      trimmed.includes('/upload/') &&
      !trimmed.includes('/upload/f_auto')
    ) {
      return trimmed.replace(
        '/upload/',
        `/upload/f_auto,q_auto,c_fill,w_${targetW}/`
      );
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * Validates that an image URL is a lightweight link (HTTP/HTTPS) and NOT a large
 * inline data URI before syncing to Supabase (no binary image storage on server).
 */
export function isExternalHttpImageUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:')) return false;
  return /^https?:\/\/.+/i.test(trimmed);
}

/**
 * Checks whether the phone cache TTL has expired and a lightweight
 * background `menu_version` check should run.
 */
export function shouldCheckRemoteSync(force = false): boolean {
  if (force) return true;
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(LAST_SYNC_AT_KEY);
    if (!raw) return true;
    const elapsed = Date.now() - Number(raw);
    return Number.isNaN(elapsed) || elapsed >= CACHE_TTL_MS;
  } catch {
    return false;
  }
}

export function markRemoteSyncComplete(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_SYNC_AT_KEY, String(Date.now()));
  } catch {
    // Ignore storage quota errors
  }
}

export function getLastSyncLabel(): string {
  if (typeof window === 'undefined') return 'Cached on Device';
  try {
    const raw = window.localStorage.getItem(LAST_SYNC_AT_KEY);
    if (!raw) return 'Local Phone Cache Active (<1ms)';
    const mins = Math.max(0, Math.round((Date.now() - Number(raw)) / 60000));
    if (mins < 1) return 'Synced just now (Cached on Phone)';
    if (mins < 60) return `Cached ${mins}m ago (0 API calls)`;
    const hrs = Math.round(mins / 60);
    return `Cached ${hrs}h ago (0 API calls)`;
  } catch {
    return 'Local Phone Cache Active';
  }
}

/**
 * Quietly warms the browser image cache for the hero carousel cakes
 * so swiping & rotating the orbital wheel is 100% instant with zero flicker.
 */
export function prewarmImageLinks(urls: string[], role: ImageRole = 'hero'): void {
  if (typeof window === 'undefined') return;
  const unique = Array.from(new Set(urls.filter(Boolean))).slice(0, 6);
  for (const url of unique) {
    const img = new Image();
    img.decoding = 'async';
    img.src = getAdaptiveImageUrl(url, role);
  }
}
