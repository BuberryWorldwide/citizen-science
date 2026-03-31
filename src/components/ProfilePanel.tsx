'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface UserStats {
  points: number;
  trees_tagged: number;
  observations_made: number;
  photos_uploaded: number;
}

interface LeaderboardEntry {
  user_id: string;
  name: string;
  points: number;
}

export function ProfilePanel() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!session) return;

    fetch('/api/user/stats')
      .then(r => r.json())
      .then(json => { if (json.success) setStats(json.data); })
      .catch(() => {});

    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(json => { if (json.success) setLeaderboard(json.data?.slice(0, 5) || []); })
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

  return (
    <div className="p-4 pb-8 space-y-5">
      {/* User header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[var(--accent)] text-black flex items-center justify-center text-lg font-bold">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{session.user.name || 'User'}</p>
          <p className="text-xs text-[var(--muted)] truncate">{session.user.email}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="px-3 py-2 text-sm text-red-400 border border-red-400/30 rounded-lg min-h-[44px]"
        >
          Sign Out
        </button>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Points', value: stats.points },
            { label: 'Trees Tagged', value: stats.trees_tagged },
            { label: 'Observations', value: stats.observations_made },
            { label: 'Photos', value: stats.photos_uploaded },
          ].map(s => (
            <div key={s.label} className="p-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-center">
              <p className="text-xl font-bold text-[var(--accent)]">{s.value}</p>
              <p className="text-xs text-[var(--muted)]">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[var(--accent)] mb-2">Top Contributors</h3>
          <div className="space-y-1">
            {leaderboard.map((entry, i) => (
              <div key={entry.user_id} className="flex items-center gap-2 py-2 px-3 bg-[var(--bg)] rounded-lg text-sm">
                <span className="text-[var(--muted)] w-5 text-center font-mono">{i + 1}</span>
                <span className="flex-1 truncate">{entry.name}</span>
                <span className="text-[var(--accent)] font-medium">{entry.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
