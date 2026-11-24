import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface GoogleUserProfile {
  id: string;
  name: string;
  avatarUrl: string;
  provider: 'google';
}

export const GOOGLE_USER_STORAGE_KEY = 'cake_google_user_v1';

export function loadLocalGoogleUser(): GoogleUserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(GOOGLE_USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GoogleUserProfile) : null;
  } catch {
    return null;
  }
}

export function saveLocalGoogleUser(user: GoogleUserProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!user) {
      window.localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(user));
    }
  } catch {
    // Ignore storage errors
  }
}

export interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: GoogleUserProfile | null;
  onUserChange: (user: GoogleUserProfile | null) => void;
  brandName: string;
  onNotify: (msg: string) => void;
}

/**
 * Google-Only Sign In / Sign Up Modal (No Email/Password inputs).
 * - Uses live Supabase Google OAuth when configured.
 * - Falls back cleanly to a local Google preview session when testing offline before Netlify/Supabase OAuth setup.
 */
export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserChange,
  brandName,
  onNotify,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleContinue = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) {
          setErrorMsg('Something went wrong. Please call Admin.');
          setLoading(false);
        }
        return;
      }

      // Clean local preview session before Supabase Google OAuth is connected
      const previewUser: GoogleUserProfile = {
        id: `google-${Date.now()}`,
        name: 'Google Guest',
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
        provider: 'google',
      };
      saveLocalGoogleUser(previewUser);
      onUserChange(previewUser);
      onNotify('Signed in with Google ✓');
      onClose();
    } catch {
      setErrorMsg('Something went wrong. Please call Admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      if (supabase && isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      saveLocalGoogleUser(null);
      onUserChange(null);
      onNotify('Signed out cleanly');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-950/50 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="relative z-10 w-full max-w-[380px] bg-[#FAF6F0] rounded-[28px] p-5 shadow-2xl border-[1px] border-white/90 text-center space-y-4"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white border-[1px] border-black/6 flex items-center justify-center text-stone-700 hover:bg-stone-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {user ? (
              /* SIGNED IN PROFILE VIEW */
              <div className="space-y-4 pt-2">
                <div className="relative w-16 h-16 mx-auto">
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover border-[3px] border-white shadow-md"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-[2px] border-white">
                    <CheckCircle2 className="w-3 h-3" />
                  </span>
                </div>

                <div>
                  <h3 className="font-display text-[1.05rem] font-bold text-stone-900">
                    {user.name}
                  </h3>
                  <p className="text-[0.72rem] font-medium text-emerald-700 mt-0.5">
                    Connected with Google Account
                  </p>
                </div>

                <div className="rounded-[18px] bg-white p-3 border-[1px] border-black/5 text-[0.72rem] text-stone-600 flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Fast 1-Tap Checkout & Wishlist synced on your phone</span>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSignOut}
                  className="w-full rounded-full bg-stone-900 hover:bg-stone-800 text-white py-2.5 px-4 text-[0.8rem] font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              /* GOOGLE-ONLY SIGN IN / SIGN UP VIEW (NO EMAIL FORM) */
              <div className="space-y-4 pt-2">
                <div
                  style={{ backgroundColor: 'var(--dark-btn)' }}
                  className="w-12 h-12 rounded-full text-white mx-auto flex items-center justify-center shadow-md"
                >
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>

                <div>
                  <h3 className="font-display text-[1.1rem] font-bold text-stone-900">
                    Welcome to {brandName}
                  </h3>
                  <p className="text-[0.74rem] text-stone-500 mt-1 leading-relaxed">
                    Sign in or Sign up instantly with Google — no email forms or passwords needed.
                  </p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleContinue}
                  className="w-full rounded-full bg-white hover:bg-stone-50 border-[1px] border-stone-300 py-3 px-4 shadow-sm flex items-center justify-center gap-2.5 text-[0.84rem] font-bold text-stone-800 cursor-pointer disabled:opacity-60"
                >
                  {/* Official Multi-Color Google G Mark */}
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                    />
                    <path
                      fill="#34A853"
                      d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                    />
                  </svg>
                  <span>
                    {loading ? 'Connecting to Google...' : 'Continue with Google'}
                  </span>
                </motion.button>

                {errorMsg && (
                  <p className="text-[0.72rem] font-semibold text-rose-600 bg-rose-50 rounded-[12px] px-3 py-1.5">
                    {errorMsg}
                  </p>
                )}

                <div className="flex items-center justify-center gap-1.5 text-[0.66rem] text-stone-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {isSupabaseConfigured
                      ? 'Secured by Google OAuth via Supabase'
                      : 'Google-Only Sign In • Ready for Supabase OAuth'}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GoogleAuthModal;
