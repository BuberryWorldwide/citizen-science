'use client';

export type NavTab = 'map' | 'search' | 'projects' | 'profile';

interface BottomNavProps {
  active: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingCount?: number;
}

const tabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'map',
    label: 'Map',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Search',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function BottomNav({ active, onTabChange, pendingCount }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[900] h-14 bg-[var(--surface)] border-t border-[var(--border)] safe-area-bottom">
      <div className="flex items-center justify-around h-full max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] relative ${
              active === tab.id ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
            }`}
          >
            {tab.icon}
            <span className="text-[10px]">{tab.label}</span>
            {tab.id === 'map' && pendingCount && pendingCount > 0 ? (
              <span className="absolute top-0 right-2 px-1 min-w-[16px] h-4 bg-yellow-600 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </nav>
  );
}
