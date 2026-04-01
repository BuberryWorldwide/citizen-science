'use client';

import { IconMap, IconSearch, IconFolder, IconUser } from '@/components/Icons';

export type NavTab = 'map' | 'search' | 'projects' | 'profile';

interface BottomNavProps {
  active: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingCount?: number;
}

const tabs: { id: NavTab; label: string; icon: typeof IconMap }[] = [
  { id: 'map', label: 'Explore', icon: IconMap },
  { id: 'search', label: 'Search', icon: IconSearch },
  { id: 'projects', label: 'Projects', icon: IconFolder },
  { id: 'profile', label: 'Profile', icon: IconUser },
];

export function BottomNav({ active, onTabChange, pendingCount }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[900] bg-[var(--surface)] border-t border-[var(--border)] safe-area-bottom">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] relative transition-transform ${
                isActive ? 'scale-110' : ''
              }`}
            >
              <span className={`transition-all ${isActive ? 'opacity-100' : 'opacity-50'}`}>
                <Icon
                  size={20}
                  color={isActive ? 'var(--accent)' : 'var(--muted)'}
                />
              </span>
              <span className={`text-[10px] font-medium ${
                isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
              }`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-5 h-0.5 bg-[var(--accent)] rounded-full" />
              )}
              {tab.id === 'map' && pendingCount && pendingCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[16px] h-4 bg-[var(--warn)] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
