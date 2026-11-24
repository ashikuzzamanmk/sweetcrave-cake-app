import React from 'react';
import { PhoneCall, RefreshCw } from 'lucide-react';
import { storeConfig } from '../config/storeConfig';

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * High-Security Global Error Boundary.
 * Never reveals stack traces, API endpoints, database names, or technical error details.
 * Shows only a calm "Please Call Admin" screen.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Intentionally silent in browser console so zero internal details are exposed
  }

  render() {
    if (this.state.hasError) {
      const cleanPhone = storeConfig.whatsappNumber.replace(/[^0-9+]/g, '');
      return (
        <div className="min-h-[100dvh] w-full bg-[#FAF6F0] flex items-center justify-center p-4">
          <div className="w-full max-w-[360px] bg-white rounded-[28px] p-6 shadow-xl border-[1px] border-stone-200/80 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-stone-900 text-white mx-auto flex items-center justify-center">
              <PhoneCall className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-stone-900">
                Please Call Admin
              </h2>
              <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                দুঃখিত, এই মুহূর্তে একটি সমস্যা হয়েছে। অনুগ্রহ করে Admin-কে কল করুন।
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <a
                href={`tel:${cleanPhone}`}
                className="w-full rounded-full bg-stone-900 hover:bg-stone-800 text-white py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Admin</span>
              </a>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
