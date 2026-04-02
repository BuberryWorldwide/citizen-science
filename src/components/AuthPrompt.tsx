'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconTree, IconStar, IconAward } from '@/components/Icons';

interface AuthPromptProps {
  /** Inline banner above bottom nav — dismissible, for browse mode */
  variant: 'banner' | 'gate';
  onDismiss?: () => void;
}

export function AuthPrompt({ variant, onDismiss }: AuthPromptProps) {
  const [dismissed, setDismissed] = useState(false);

  if (variant === 'banner' && dismissed) return null;

  if (variant === 'gate') {
    return (
      <div className="p-6 pb-8 text-center space-y-4">
        <div className="flex justify-center gap-3">
          <IconTree size={32} color="var(--accent)" />
          <IconStar size={32} color="var(--warn, #fbbf24)" />
          <IconAward size={32} color="var(--secondary)" />
        </div>
        <h3 className="text-lg font-bold">Sign in to contribute</h3>
        <p className="text-sm text-[var(--muted)] max-w-xs mx-auto">
          Create an account to tag trees, record observations, earn points, and climb the leaderboard.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-[var(--accent)] text-black rounded-xl font-medium text-sm"
        >
          Sign In or Create Account
        </Link>
      </div>
    );
  }

  // Banner variant
  return (
    <div
      className="fixed z-[850] left-3 right-3 flex items-center gap-3 px-4 py-3 backdrop-blur rounded-2xl border border-[var(--border)] shadow-lg animate-slide-up"
      style={{
        bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 4rem)',
        background: 'var(--pill-bg)',
      }}
    >
      <IconTree size={24} color="var(--accent)" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Join the community</p>
        <p className="text-[10px] text-[var(--muted)]">Sign in to tag trees and earn points</p>
      </div>
      <Link
        href="/login"
        className="px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-xs font-bold shrink-0"
      >
        Sign In
      </Link>
      <button
        onClick={() => { setDismissed(true); onDismiss?.(); }}
        className="p-1 text-[var(--muted)] shrink-0"
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
