'use client';

import { useState, useCallback } from 'react';
import {
  IconMap,
  IconTree,
  IconPlus,
  IconStar,
  IconAward,
  IconChart,
  IconBook,
} from '@/components/Icons';

interface OnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  {
    title: 'Explore the Map',
    description:
      'Discover trees tagged by citizen scientists in your area. Tap any marker to see species, health, and observations.',
    icons: [IconMap],
  },
  {
    title: 'Tag a Tree',
    description:
      'Found a tree? Tag it on the map with species, health, and photos. Works offline too.',
    icons: [IconPlus, IconTree],
  },
  {
    title: 'Earn Points & Badges',
    description:
      'Every tree tagged, observation made, and photo uploaded earns XP. Level up and unlock achievements.',
    icons: [IconStar, IconAward],
  },
  {
    title: 'Track Your Progress',
    description:
      'Watch your species journal fill up. Keep your streak going. Climb the leaderboard.',
    icons: [IconChart, IconBook],
  },
] as const;

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animKey, setAnimKey] = useState(0);

  const advance = useCallback(() => {
    if (step < STEPS.length - 1) {
      setDirection('forward');
      setAnimKey((k) => k + 1);
      setStep((s) => s + 1);
    } else {
      onComplete();
    }
  }, [step, onComplete]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in"
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div
        key={animKey}
        className="relative w-full max-w-sm mx-4 rounded-2xl p-8 animate-bounce-in"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Icon area */}
        <div
          className="flex items-center justify-center gap-3 mb-6"
          style={{ minHeight: 72 }}
        >
          {current.icons.map((Icon, i) => (
            <div
              key={i}
              className="animate-bounce-in"
              style={{
                animationDelay: `${i * 100 + 80}ms`,
                animationFillMode: 'both',
              }}
            >
              <Icon size={current.icons.length > 1 ? 48 : 56} color="var(--accent)" />
            </div>
          ))}
        </div>

        {/* Title */}
        <h2
          className="text-xl font-bold text-center mb-3 animate-fade-in"
          style={{ color: 'var(--fg)', animationDelay: '120ms', animationFillMode: 'both' }}
        >
          {current.title}
        </h2>

        {/* Description */}
        <p
          className="text-center text-sm leading-relaxed mb-8 animate-fade-in"
          style={{ color: 'var(--muted)', animationDelay: '180ms', animationFillMode: 'both' }}
        >
          {current.description}
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onComplete}
            className="px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
            style={{ color: 'var(--muted)', background: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          >
            Skip
          </button>

          <button
            type="button"
            onClick={advance}
            className="px-6 py-2.5 text-sm font-semibold rounded-xl transition-all"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg)',
              boxShadow: '0 2px 12px var(--accent-glow)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-dim)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i === step ? 'var(--accent)' : 'var(--border)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
