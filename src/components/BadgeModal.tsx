'use client';

import { IconAward, IconCheck } from './Icons';

interface BadgeModalProps {
  badge: {
    title: string;
    description: string;
    icon: string;
  } | null;
  onClose: () => void;
  onViewAll: () => void;
}

export function BadgeModal({ badge, onClose, onViewAll }: BadgeModalProps) {
  if (!badge) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />
      <div
        className="relative bg-[var(--surface)] rounded-2xl p-6 mx-4 max-w-sm w-full text-center animate-bounce-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ring */}
        <div className="mx-auto w-20 h-20 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mb-4 ring-4 ring-[var(--accent)]/20">
          <IconAward size={40} color="var(--accent)" />
        </div>

        <p className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold mb-1">
          Badge Earned
        </p>
        <h2 className="text-xl font-bold mb-1">{badge.title}</h2>
        <p className="text-sm text-[var(--muted)] mb-6">{badge.description}</p>

        <div className="flex gap-2">
          <button
            onClick={onViewAll}
            className="flex-1 py-2.5 border border-[var(--border)] rounded-lg text-sm text-[var(--muted)]"
          >
            View All Badges
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-[var(--accent)] text-black rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <IconCheck size={14} color="#000" />
            Nice!
          </button>
        </div>
      </div>
    </div>
  );
}
