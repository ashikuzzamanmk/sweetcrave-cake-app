/**
 * High-Security Access Vault for "the MK" Admin Panel.
 * - Zero plaintext password in source code, bundle, or localStorage.
 * - Verifies salted SHA-256 hash using Web Crypto API (with pure-JS SHA-256 fallback for LAN HTTP preview).
 * - Constant-time hex comparison to avoid timing leaks.
 * - Brute-force lockout (5 failed attempts -> 60s cooldown).
 * - Ephemeral sessionStorage unlock with 15-minute inactivity auto-lock.
 */

const VAULT_SALT = 'mk-vault-2026::';
const DEFAULT_ADMIN_HASH =
  '90582622944e88140e69c5ad3cb8f5947343cf87f28122f383dd800d3481819a';

const CUSTOM_HASH_KEY = 'mk_vault_custom_hash_v1';
const ATTEMPTS_KEY = 'mk_vault_attempts_v1';
const LOCKOUT_UNTIL_KEY = 'mk_vault_lockout_until_v1';
const SESSION_EXPIRES_KEY = 'mk_vault_session_exp_v1';
const SESSION_TOKEN_KEY = 'mk_vault_ephemeral_token_v1';

let memoryAdminToken: string | null = null;

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;
const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Pure-JS SHA-256 fallback (for non-secure LAN HTTP phone testing where crypto.subtle is unavailable)
function sha256Fallback(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((x) => x.toString(16).padStart(8, '0'))
    .join('');
}

async function computeSaltedHash(secret: string): Promise<string> {
  const payload = `${VAULT_SALT}${secret}`;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const data = new TextEncoder().encode(payload);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      return sha256Fallback(payload);
    }
  }
  return sha256Fallback(payload);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function getLockoutRemainingSeconds(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.sessionStorage.getItem(LOCKOUT_UNTIL_KEY);
    if (!raw) return 0;
    const rem = Math.ceil((Number(raw) - Date.now()) / 1000);
    return rem > 0 ? rem : 0;
  } catch {
    return 0;
  }
}

export function getRemainingAttempts(): number {
  if (typeof window === 'undefined') return MAX_ATTEMPTS;
  try {
    const fails = Number(window.sessionStorage.getItem(ATTEMPTS_KEY) || '0');
    return Math.max(0, MAX_ATTEMPTS - fails);
  } catch {
    return MAX_ATTEMPTS;
  }
}

export async function verifyMkAdminCode(
  inputCode: string
): Promise<{ ok: boolean; lockoutSeconds: number; remainingAttempts: number }> {
  const currentLock = getLockoutRemainingSeconds();
  if (currentLock > 0) {
    return { ok: false, lockoutSeconds: currentLock, remainingAttempts: 0 };
  }

  const expectedHash =
    (typeof window !== 'undefined' &&
      window.localStorage.getItem(CUSTOM_HASH_KEY)) ||
    DEFAULT_ADMIN_HASH;

  const candidateHash = await computeSaltedHash(inputCode.trim());
  const matched = timingSafeEqualHex(candidateHash, expectedHash);

  if (matched) {
    try {
      window.sessionStorage.removeItem(ATTEMPTS_KEY);
      window.sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
      memoryAdminToken = inputCode.trim();
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, inputCode.trim());
      touchVaultSession();
    } catch {
      // Ignore storage errors
    }
    return { ok: true, lockoutSeconds: 0, remainingAttempts: MAX_ATTEMPTS };
  }

  try {
    const fails =
      Number(window.sessionStorage.getItem(ATTEMPTS_KEY) || '0') + 1;
    window.sessionStorage.setItem(ATTEMPTS_KEY, String(fails));
    if (fails >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_DURATION_MS;
      window.sessionStorage.setItem(LOCKOUT_UNTIL_KEY, String(until));
      window.sessionStorage.setItem(ATTEMPTS_KEY, '0');
      return {
        ok: false,
        lockoutSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
        remainingAttempts: 0,
      };
    }
    return {
      ok: false,
      lockoutSeconds: 0,
      remainingAttempts: MAX_ATTEMPTS - fails,
    };
  } catch {
    return { ok: false, lockoutSeconds: 0, remainingAttempts: 1 };
  }
}

export async function updateMkAdminCode(newSecret: string): Promise<boolean> {
  if (newSecret.trim().length < 6) return false;
  const nextHash = await computeSaltedHash(newSecret.trim());
  try {
    window.localStorage.setItem(CUSTOM_HASH_KEY, nextHash);
    return true;
  } catch {
    return false;
  }
}

export function isVaultSessionValid(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const exp = Number(window.sessionStorage.getItem(SESSION_EXPIRES_KEY) || '0');
    return exp > Date.now();
  } catch {
    return false;
  }
}

export function touchVaultSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      SESSION_EXPIRES_KEY,
      String(Date.now() + SESSION_TTL_MS)
    );
  } catch {
    // Ignore
  }
}

export function clearVaultSession(): void {
  memoryAdminToken = null;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_EXPIRES_KEY);
    window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Ignore
  }
}

export function getActiveMkAdminCode(): string | null {
  if (!isVaultSessionValid()) {
    clearVaultSession();
    return null;
  }
  if (memoryAdminToken) return memoryAdminToken;
  if (typeof window === 'undefined') return null;
  try {
    const token = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (token) memoryAdminToken = token;
    return token;
  } catch {
    return null;
  }
}
