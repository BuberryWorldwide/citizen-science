'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { IconStar, IconAward, IconTarget, IconFlame } from '@/components/Icons';

interface RewardToastProps {
  rewards: {
    xpAwarded: number;
    newAchievements: { key: string; title: string; icon?: string; emoji?: string; description: string }[];
    completedChallenges: string[];
    currentStreak: number;
  } | null;
  onDismiss: () => void;
}

type ToastType = 'xp' | 'achievement' | 'challenge' | 'streak';

interface Toast {
  id: string;
  type: ToastType;
  content: {
    xp?: number;
    title?: string;
    icon?: string;
    description?: string;
    streak?: number;
    challenge?: string;
  };
  visible: boolean;
  exiting: boolean;
}

export function RewardToast({ rewards, onDismiss }: RewardToastProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const prevStreakRef = useRef<number>(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
    const timer = dismissTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimers.current.delete(id);
    }
  }, []);

  const scheduleAutoDismiss = useCallback(
    (id: string) => {
      const timer = setTimeout(() => {
        removeToast(id);
        dismissTimers.current.delete(id);
      }, 3000);
      dismissTimers.current.set(id, timer);
    },
    [removeToast]
  );

  useEffect(() => {
    if (!rewards) return;

    const newToasts: Toast[] = [];
    const delay = 0;
    const STAGGER = 150;

    // XP toast — always shown
    if (rewards.xpAwarded > 0) {
      newToasts.push({
        id: `xp-${Date.now()}`,
        type: 'xp',
        content: { xp: rewards.xpAwarded },
        visible: false,
        exiting: false,
      });
    }

    // Achievement toasts
    for (const ach of rewards.newAchievements) {
      newToasts.push({
        id: `ach-${ach.key}-${Date.now()}`,
        type: 'achievement',
        content: { title: ach.title, icon: ach.icon, description: ach.description },
        visible: false,
        exiting: false,
      });
    }

    // Challenge complete toasts
    for (const ch of rewards.completedChallenges) {
      newToasts.push({
        id: `ch-${ch}-${Date.now()}`,
        type: 'challenge',
        content: { challenge: ch },
        visible: false,
        exiting: false,
      });
    }

    // Streak toast — only when streak increases
    if (rewards.currentStreak > 0 && rewards.currentStreak > prevStreakRef.current) {
      newToasts.push({
        id: `streak-${Date.now()}`,
        type: 'streak',
        content: { streak: rewards.currentStreak },
        visible: false,
        exiting: false,
      });
    }
    prevStreakRef.current = rewards.currentStreak;

    if (newToasts.length === 0) return;

    // Stagger each toast's entrance
    newToasts.forEach((toast, i) => {
      setTimeout(() => {
        setToasts((prev) => [...prev, { ...toast, visible: true }]);
        scheduleAutoDismiss(toast.id);
      }, delay + i * STAGGER);
    });
  }, [rewards, scheduleAutoDismiss]);

  // When all toasts are gone, call onDismiss
  useEffect(() => {
    if (toasts.length === 0 && rewards) {
      onDismiss();
    }
  }, [toasts.length, rewards, onDismiss]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = dismissTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[950] flex flex-col-reverse items-center gap-2 px-4 pointer-events-none"
      style={{ bottom: '4.5rem' }}
      aria-live="polite"
      role="status"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto max-w-sm w-full ${
            toast.exiting ? 'rt-exit' : 'rt-enter'
          }`}
          onClick={() => removeToast(toast.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') removeToast(toast.id);
          }}
        >
          {toast.type === 'xp' && <XpToast xp={toast.content.xp!} />}
          {toast.type === 'achievement' && (
            <AchievementToast
              title={toast.content.title!}
              description={toast.content.description!}
            />
          )}
          {toast.type === 'challenge' && <ChallengeToast title={toast.content.challenge!} />}
          {toast.type === 'streak' && <StreakToast streak={toast.content.streak!} />}
        </div>
      ))}
    </div>
  );
}

/* -- XP Toast --------------------------------------------------------- */

function XpToast({ xp }: { xp: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div className="rt-star-burst relative flex items-center justify-center w-10 h-10 shrink-0">
        <span className="relative z-10">
          <IconStar size={24} color="var(--warn)" />
        </span>
        <div className="rt-star-rays absolute inset-0 rounded-full" />
      </div>
      <div className="flex flex-col">
        <span
          className="text-lg font-bold tracking-tight"
          style={{ color: 'var(--warn)' }}
        >
          +{xp} XP
        </span>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          Keep it up!
        </span>
      </div>
      <div className="rt-shimmer absolute inset-0 pointer-events-none" />
    </div>
  );
}

/* -- Achievement Toast ------------------------------------------------ */

function AchievementToast({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="rt-achievement relative overflow-hidden rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
      style={{
        background: 'var(--surface-raised)',
        border: '1.5px solid var(--warn)',
        boxShadow:
          '0 4px 20px rgba(0,0,0,0.3), 0 0 15px rgba(251,191,36,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div
        className="rt-ach-emoji flex items-center justify-center w-11 h-11 rounded-lg shrink-0"
        style={{ background: 'rgba(251, 191, 36, 0.1)' }}
      >
        <IconAward size={24} color="var(--warn)" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--warn)' }}>
          Achievement Unlocked
        </span>
        <span className="text-sm font-bold truncate" style={{ color: 'var(--fg)' }}>
          {title}
        </span>
        <span className="text-xs truncate" style={{ color: 'var(--muted)' }}>
          {description}
        </span>
      </div>
      <div className="rt-ach-glow absolute inset-0 pointer-events-none" />
    </div>
  );
}

/* -- Challenge Complete Toast ----------------------------------------- */

function ChallengeToast({ title }: { title: string }) {
  // Pre-compute confetti particle styles to avoid CSS custom properties issues
  const particles = Array.from({ length: 12 }).map((_, i) => {
    const left = 10 + (i * 7) % 80;
    const delay = i * 0.08;
    const drift = (i % 2 === 0 ? 1 : -1) * (8 + (i * 3) % 20);
    const hue = (i * 35) % 360;
    return { left, delay, drift, hue };
  });

  return (
    <div
      className="relative overflow-hidden rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
      style={{
        background: 'var(--surface-raised)',
        border: '1.5px solid var(--accent)',
        boxShadow:
          '0 4px 20px rgba(0,0,0,0.3), 0 0 12px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div
        className="rt-trophy flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
        style={{ background: 'rgba(52, 211, 153, 0.12)' }}
      >
        <IconTarget size={22} color="var(--accent)" />
      </div>
      <div className="flex flex-col min-w-0">
        <span
          className="text-[10px] uppercase tracking-widest font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          Challenge Complete!
        </span>
        <span className="text-sm font-bold truncate" style={{ color: 'var(--fg)' }}>
          {title}
        </span>
      </div>

      {/* Confetti particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p, i) => (
          <span
            key={i}
            className="rt-confetti absolute"
            style={{
              left: `${p.left}%`,
              top: '50%',
              animationDelay: `${p.delay}s`,
              background: `hsl(${p.hue}, 85%, 60%)`,
              // Encode drift into a CSS custom property via inline style
              ['--rt-drift' as string]: `${p.drift}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* -- Streak Toast ----------------------------------------------------- */

function StreakToast({ streak }: { streak: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div className="rt-fire flex items-center justify-center w-10 h-10 shrink-0">
        <IconFlame size={24} color="#f97316" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>
          {streak}-day streak!
        </span>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {streak >= 7
            ? 'Unstoppable!'
            : streak >= 3
              ? 'On fire!'
              : 'Getting started!'}
        </span>
      </div>

      {/* Animated fire gradient bar */}
      <div
        className="rt-streak-bar absolute bottom-0 left-0 right-0 h-[3px]"
        style={{
          background: 'linear-gradient(90deg, #f97316, #ef4444, #fbbf24, #f97316)',
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  );
}
