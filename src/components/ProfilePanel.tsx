'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface UserStats {
  total_points: number;
  trees_tagged: number;
  observations_made: number;
  photos_uploaded: number;
}

interface LedgerEntry {
  points: number;
  reason: string;
  created_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  name: string;
  email: string;
  total_points: number;
}

function getLevel(points: number): { level: number; title: string; next: number; progress: number } {
  const tiers = [
    { threshold: 0, title: 'Seedling' },
    { threshold: 50, title: 'Sprout' },
    { threshold: 150, title: 'Sapling' },
    { threshold: 400, title: 'Understory' },
    { threshold: 800, title: 'Canopy' },
    { threshold: 1500, title: 'Old Growth' },
    { threshold: 3000, title: 'Ancient' },
  ];
  let current = tiers[0];
  let nextThreshold = tiers[1]?.threshold ?? Infinity;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (points >= tiers[i].threshold) {
      current = tiers[i];
      nextThreshold = tiers[i + 1]?.threshold ?? Infinity;
      break;
    }
  }
  const level = tiers.indexOf(current) + 1;
  const progress = nextThreshold === Infinity
    ? 1
    : (points - current.threshold) / (nextThreshold - current.threshold);
  return { level, title: current.title, next: nextThreshold, progress };
}

function formatReason(reason: string): string {
  switch (reason) {
    case 'tree_tagged': return 'Tagged a tree';
    case 'observation': return 'Recorded observation';
    case 'photo_uploaded': return 'Uploaded photo';
    case 'bonus': return 'Bonus';
    default: return reason;
  }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const reasonIcons: Record<string, string> = {
  tree_tagged: '\u{1F333}',
  observation: '\u{1F50D}',
  photo_uploaded: '\u{1F4F7}',
  bonus: '\u{2B50}',
};

export function ProfilePanel() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recent, setRecent] = useState<LedgerEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;

    fetch('/api/user/stats')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setStats(json.data.stats);
          setRecent(json.data.recent || []);
        }
      })
      .catch(() => {});

    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setLeaderboard(json.data || []);
          const rank = json.data?.findIndex((e: LeaderboardEntry) => e.user_id === session.user.id);
          if (rank !== undefined && rank >= 0) setUserRank(rank + 1);
        }
      })
      .catch(() => {});
  }, [session]);

  if (!session) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center mx-auto">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <p className="text-[var(--muted)] text-sm">Sign in to track your contributions</p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-[var(--accent)] text-black rounded-lg font-medium text-sm"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const initial = (session.user.name || session.user.email || '?')[0].toUpperCase();
  const level = getLevel(stats?.total_points ?? 0);

  const statCards = [
    { label: 'Trees', value: stats?.trees_tagged ?? 0, icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 14l3-6H4l3 6" /><path d="M15 18l2-4H7l2 4" /><line x1="12" y1="18" x2="12" y2="22" />
      </svg>
    ), color: '#22c55e' },
    { label: 'Observations', value: stats?.observations_made ?? 0, icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ), color: '#3b82f6' },
    { label: 'Photos', value: stats?.photos_uploaded ?? 0, icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
      </svg>
    ), color: '#a855f7' },
    { label: 'Points', value: stats?.total_points ?? 0, icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ), color: '#eab308' },
  ];

  return (
    <div className="pb-8 space-y-5 overflow-y-auto max-h-[80dvh]">
      {/* User header with level */}
      <div className="p-5 pb-4" style={{ background: 'linear-gradient(180deg, rgba(34,197,94,0.08) 0%, transparent 100%)' }}>
        <div className="flex items-start gap-3.5">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-[var(--accent)] text-black flex items-center justify-center text-xl font-bold">
              {initial}
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--surface)] border-2 border-[var(--accent)] flex items-center justify-center"
            >
              <span className="text-[10px] font-bold text-[var(--accent)]">{level.level}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="font-bold text-base truncate">{session.user.name || 'User'}</p>
            <p className="text-xs text-[var(--muted)] truncate">{session.user.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-medium text-[var(--accent)]">{level.title}</span>
              {userRank && (
                <span className="text-[10px] text-[var(--muted)] px-1.5 py-0.5 bg-[var(--bg)] rounded-full">
                  #{userRank} overall
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="mt-1 p-2 text-[var(--muted)] hover:text-red-400 rounded-lg transition-colors"
            aria-label="Sign out"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

        {/* XP progress bar */}
        {level.next !== Infinity && (
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-[var(--muted)] mb-1">
              <span>{stats?.total_points ?? 0} XP</span>
              <span>{level.next} XP</span>
            </div>
            <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(level.progress * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="px-4 grid grid-cols-4 gap-2">
        {statCards.map(s => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl"
          >
            <div className="opacity-60" style={{ color: s.color }}>{s.icon}</div>
            <span className="text-lg font-bold" style={{ color: s.color }}>{s.value}</span>
            <span className="text-[10px] text-[var(--muted)]">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      {recent.length > 0 && (
        <div className="px-4">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Recent Activity</h3>
          <div className="space-y-1">
            {recent.slice(0, 8).map((entry, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2 px-3 bg-[var(--surface)] rounded-lg">
                <span className="text-base">{reasonIcons[entry.reason] || '\u{1F4CC}'}</span>
                <span className="flex-1 text-sm truncate">{formatReason(entry.reason)}</span>
                <span className="text-xs font-medium text-[var(--accent)]">+{entry.points}</span>
                <span className="text-[10px] text-[var(--muted)] w-12 text-right">{formatTimeAgo(entry.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="px-4">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Leaderboard</h3>
          <div className="space-y-1">
            {leaderboard.slice(0, 10).map((entry, i) => {
              const isMe = entry.user_id === session.user.id;
              const medals = ['#eab308', '#94a3b8', '#cd7f32'];
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm ${
                    isMe ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/20' : 'bg-[var(--surface)]'
                  }`}
                >
                  <span
                    className="w-6 text-center font-bold text-xs"
                    style={{ color: medals[i] || 'var(--muted)' }}
                  >
                    {i + 1}
                  </span>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: isMe ? 'var(--accent)' : 'var(--border)',
                      color: isMe ? 'black' : 'var(--muted)',
                    }}
                  >
                    {(entry.name || entry.email || '?')[0].toUpperCase()}
                  </div>
                  <span className={`flex-1 truncate ${isMe ? 'font-medium' : ''}`}>
                    {entry.name || entry.email?.split('@')[0] || 'User'}
                    {isMe && <span className="text-[10px] text-[var(--muted)] ml-1">(you)</span>}
                  </span>
                  <span className="text-xs font-medium text-[var(--accent)]">{entry.total_points}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
