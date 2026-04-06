'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { SpeciesJournal } from './SpeciesJournal';
import {
  IconTree, IconEye, IconCamera, IconStar, IconFlame, IconCheck,
  IconChart, IconBook, IconAward, IconLogOut, IconTrophy, IconTarget,
  IconSearch, IconLock, IconFolder,
} from '@/components/Icons';

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
  display_name: string;
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

const REASON_ICONS: Record<string, React.FC<{ size?: number; color?: string }>> = {
  tree_tagged: IconTree,
  observation: IconSearch,
  photo_uploaded: IconCamera,
  bonus: IconStar,
};

/** Map icon name strings (from achievements.ts) to icon components */
const ACHIEVEMENT_ICON_MAP: Record<string, React.FC<{ size?: number; color?: string; className?: string }>> = {
  tree: IconTree,
  eye: IconEye,
  camera: IconCamera,
  star: IconStar,
  flame: IconFlame,
  award: IconAward,
  trophy: IconTrophy,
  target: IconTarget,
  book: IconBook,
  search: IconSearch,
  lock: IconLock,
  folder: IconFolder,
  check: IconCheck,
};

interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  earned: boolean;
  earned_at: string | null;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  reward_points: number;
  progress: number;
  completed: boolean;
}

type ProfileTab = 'stats' | 'journal' | 'achievements';

export function ProfilePanel() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recent, setRecent] = useState<LedgerEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [foundSpecies, setFoundSpecies] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>('stats');

  useEffect(() => {
    if (!session) return;

    fetch('/api/user/stats')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setStats(json.data.stats);
          setRecent(json.data.recent || []);
          setFoundSpecies(json.data.foundSpecies || []);
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

    fetch('/api/achievements')
      .then(r => r.json())
      .then(json => { if (json.success) setAchievements(json.data || []); })
      .catch(() => {});

    fetch('/api/challenges')
      .then(r => r.json())
      .then(json => { if (json.success) setChallenges(json.data || []); })
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

  const statCards: { label: string; value: number; icon: React.FC<{ size?: number; color?: string }>; color: string }[] = [
    { label: 'Trees', value: stats?.trees_tagged ?? 0, icon: IconTree, color: 'var(--accent)' },
    { label: 'Observations', value: stats?.observations_made ?? 0, icon: IconEye, color: '#3b82f6' },
    { label: 'Photos', value: stats?.photos_uploaded ?? 0, icon: IconCamera, color: 'var(--secondary)' },
    { label: 'Points', value: stats?.total_points ?? 0, icon: IconStar, color: 'var(--warn, #eab308)' },
  ];

  const profileTabs: { id: ProfileTab; label: string; icon: React.FC<{ size?: number; color?: string }> }[] = [
    { id: 'stats', label: 'Stats', icon: IconChart },
    { id: 'journal', label: 'Journal', icon: IconBook },
    { id: 'achievements', label: 'Badges', icon: IconAward },
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
            <IconLogOut size={20} />
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

      {/* Profile tabs */}
      <div className="px-4 flex gap-1 bg-[var(--bg)] rounded-xl p-1 mx-4">
        {profileTabs.map(tab => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-[var(--surface)] text-[var(--fg)] shadow-sm'
                  : 'text-[var(--muted)]'
              }`}
            >
              <TabIcon size={14} />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Stats tab */}
      {activeTab === 'stats' && (
        <>
          {/* Stats grid */}
          <div className="px-4 grid grid-cols-4 gap-2">
            {statCards.map(s => {
              const StatIcon = s.icon;
              return (
                <div
                  key={s.label}
                  className="flex flex-col items-center gap-1 p-3 bg-[var(--surface-raised,var(--surface))] border border-[var(--border)] rounded-xl"
                >
                  <StatIcon size={22} color={s.color} />
                  <span className="text-lg font-bold" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-[10px] text-[var(--muted)]">{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* Streak */}
          {stats && (stats as UserStats & { current_streak?: number }).current_streak != null && (
            <div className="px-4">
              <div className="flex items-center gap-3 p-3 bg-[var(--surface-raised,var(--surface))] border border-[var(--border)] rounded-xl">
                <IconFlame size={28} color="#f97316" />
                <div className="flex-1">
                  <span className="text-sm font-bold">{(stats as UserStats & { current_streak?: number }).current_streak}-day streak</span>
                  <p className="text-[10px] text-[var(--muted)]">Keep scouting daily!</p>
                </div>
              </div>
            </div>
          )}

          {/* Active challenges */}
          {challenges.length > 0 && (
            <div className="px-4">
              <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">This Week&apos;s Challenges</h3>
              <div className="space-y-2">
                {challenges.map(c => (
                  <div key={c.id} className="p-3 bg-[var(--surface-raised,var(--surface))] border border-[var(--border)] rounded-xl">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium">{c.title}</span>
                      <span className="text-[10px] text-[var(--warn)] font-bold">+{c.reward_points} XP</span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mb-2">{c.description}</p>
                    <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((c.progress / c.target) * 100, 100)}%`,
                          background: c.completed ? 'var(--accent)' : 'var(--secondary)',
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-[var(--muted)]">{c.progress}/{c.target}</span>
                      {c.completed && (
                        <span className="text-[10px] text-[var(--accent)] font-bold flex items-center gap-0.5">
                          <IconCheck size={12} color="var(--accent)" /> Complete!
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          {recent.length > 0 && (
            <div className="px-4">
              <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Recent Activity</h3>
              <div className="space-y-1">
                {recent.slice(0, 8).map((entry, i) => {
                  const ReasonIcon = REASON_ICONS[entry.reason] || IconStar;
                  return (
                    <div key={i} className="flex items-center gap-2.5 py-2 px-3 bg-[var(--surface)] rounded-lg">
                      <ReasonIcon size={18} color="var(--muted)" />
                      <span className="flex-1 text-sm truncate">{formatReason(entry.reason)}</span>
                      <span className="text-xs font-medium text-[var(--accent)]">+{entry.points}</span>
                      <span className="text-[10px] text-[var(--muted)] w-12 text-right">{formatTimeAgo(entry.created_at)}</span>
                    </div>
                  );
                })}
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
                        {(entry.display_name || entry.name || entry.email || '?')[0].toUpperCase()}
                      </div>
                      <span className={`flex-1 truncate ${isMe ? 'font-medium' : ''}`}>
                        {entry.display_name || entry.name || entry.email?.split('@')[0] || 'User'}
                        {isMe && <span className="text-[10px] text-[var(--muted)] ml-1">(you)</span>}
                      </span>
                      <span className="text-xs font-medium text-[var(--accent)]">{entry.total_points}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Journal tab */}
      {activeTab === 'journal' && (
        <div className="px-4">
          <SpeciesJournal foundSpecies={foundSpecies} />
        </div>
      )}

      {/* Achievements tab */}
      {activeTab === 'achievements' && (
        <div className="px-4 space-y-2">
          <p className="text-xs text-[var(--muted)]">
            {achievements.filter(a => a.earned).length} of {achievements.length} earned
          </p>
          <div className="grid grid-cols-3 gap-2">
            {achievements.map(a => {
              const AchIcon = ACHIEVEMENT_ICON_MAP[a.icon] || IconAward;
              return (
                <div
                  key={a.key}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                    a.earned
                      ? 'bg-[var(--surface-raised,var(--surface))] border-[var(--warn)]/30'
                      : 'bg-[var(--bg)] border-[var(--border)] opacity-40'
                  }`}
                >
                  <AchIcon size={28} color={a.earned ? 'var(--warn)' : 'var(--muted)'} />
                  <span className="text-[10px] font-bold leading-tight">{a.title}</span>
                  <span className="text-[9px] text-[var(--muted)] leading-tight">{a.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
