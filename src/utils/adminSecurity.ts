/**
 * Production Admin Authentication — Supabase Auth + DB Role Verification (`public.is_admin()`).
 *
 * Security Guarantees:
 * - ZERO hardcoded passwords, PINs, or hashes in frontend code, bundles, or storage.
 * - Authenticates via Supabase Auth JWT (`signInWithPassword`).
 * - Verifies authorization server-side via `public.is_admin()` against `public.admin_roles`.
 * - Signs out immediately if an authenticated user does not hold an admin role.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AdminSessionInfo {
  userId: string;
  email: string;
  role: 'admin' | 'super_admin';
}

export async function verifyCurrentAdminSession(): Promise<AdminSessionInfo | null> {
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr || !session?.user) {
      return null;
    }

    const { data: isAdminFlag, error: rpcErr } = await supabase.rpc('is_admin');
    if (rpcErr || isAdminFlag !== true) {
      return null;
    }

    const { data: roleRow } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();

    return {
      userId: session.user.id,
      email: session.user.email || 'admin',
      role:
        roleRow?.role === 'super_admin' ? 'super_admin' : 'admin',
    };
  } catch {
    return null;
  }
}

export async function signInAdminWithSupabase(
  email: string,
  password: string
): Promise<{
  ok: boolean;
  session?: AdminSessionInfo;
  error?: string;
}> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      error:
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables.',
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { ok: false, error: 'Please enter both admin email and password.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error || !data?.user) {
      return {
        ok: false,
        error: 'Invalid admin credentials. Please verify your email and password.',
      };
    }

    const { data: isAdminFlag, error: roleErr } = await supabase.rpc('is_admin');
    if (roleErr || isAdminFlag !== true) {
      await supabase.auth.signOut();
      return {
        ok: false,
        error:
          'Access denied. This account is not registered in admin_roles.',
      };
    }

    const { data: roleRow } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle();

    return {
      ok: true,
      session: {
        userId: data.user.id,
        email: data.user.email || cleanEmail,
        role: roleRow?.role === 'super_admin' ? 'super_admin' : 'admin',
      },
    };
  } catch {
    return {
      ok: false,
      error: 'Authentication failed due to a network or server error. Please try again.',
    };
  }
}

export async function signOutAdmin(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore sign-out errors
  }
}
