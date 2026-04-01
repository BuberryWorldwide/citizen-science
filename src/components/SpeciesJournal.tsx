'use client';

import { useState, useMemo } from 'react';
import {
  TreeIcon, IconLock, IconCheck, IconTree, IconTrophy,
  getTreeCategory, getCategoryColor,
} from '@/components/Icons';

const ALL_SPECIES: { name: string }[] = [
  { name: 'Mulberry' },
  { name: 'Pawpaw' },
  { name: 'Persimmon' },
  { name: 'Pecan' },
  { name: 'Apple' },
  { name: 'Pear' },
  { name: 'Cherry' },
  { name: 'Plum' },
  { name: 'Fig' },
  { name: 'Muscadine' },
  { name: 'Peach' },
  { name: 'Walnut' },
  { name: 'Hickory' },
  { name: 'Oak' },
  { name: 'Maple' },
  { name: 'Bradford Pear' },
  { name: 'Citrus' },
  { name: 'Chestnut' },
];

interface SpeciesJournalProps {
  foundSpecies: string[];
}

function getRarityLabel(index: number): { label: string; color: string } {
  if (index >= 14) return { label: 'Rare', color: 'var(--warn)' };
  if (index >= 10) return { label: 'Uncommon', color: 'var(--secondary)' };
  return { label: 'Common', color: 'var(--accent)' };
}

function getCompletionTitle(pct: number): string {
  if (pct === 100) return 'Master Botanist';
  if (pct >= 75) return 'Canopy Scholar';
  if (pct >= 50) return 'Trail Naturalist';
  if (pct >= 25) return 'Keen Observer';
  return 'Budding Explorer';
}

type Filter = 'all' | 'found' | 'missing';

export function SpeciesJournal({ foundSpecies }: SpeciesJournalProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [recentlyClicked, setRecentlyClicked] = useState<string | null>(null);

  const foundSet = useMemo(() => new Set(foundSpecies), [foundSpecies]);

  const speciesCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const name of foundSpecies) {
      counts[name] = (counts[name] || 0) + 1;
    }
    return counts;
  }, [foundSpecies]);

  const discoveredCount = useMemo(
    () => ALL_SPECIES.filter(s => foundSet.has(s.name)).length,
    [foundSet]
  );

  const totalCount = ALL_SPECIES.length;
  const pct = Math.round((discoveredCount / totalCount) * 100);
  const title = getCompletionTitle(pct);

  const recentlyDiscovered = useMemo(() => {
    const seen = new Set<string>();
    const recent: string[] = [];
    for (let i = foundSpecies.length - 1; i >= 0; i--) {
      const name = foundSpecies[i];
      if (!seen.has(name)) {
        seen.add(name);
        recent.push(name);
      }
      if (recent.length >= 3) break;
    }
    return recent;
  }, [foundSpecies]);

  const filtered = useMemo(() => {
    return ALL_SPECIES.filter(s => {
      if (filter === 'found') return foundSet.has(s.name);
      if (filter === 'missing') return !foundSet.has(s.name);
      return true;
    });
  }, [filter, foundSet]);

  const handleCardClick = (name: string) => {
    setRecentlyClicked(name);
    setTimeout(() => setRecentlyClicked(null), 600);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-5">
      <style>{`
        @keyframes journal-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes journal-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes journal-pop {
          0% { transform: scale(1); }
          30% { transform: scale(1.15); }
          60% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes journal-glow {
          0%, 100% { box-shadow: 0 0 4px transparent; }
          50% { box-shadow: 0 0 16px var(--accent); }
        }
        @keyframes journal-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .journal-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .journal-card:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .journal-card:active {
          transform: scale(0.97);
        }
        .journal-card-pop {
          animation: journal-pop 0.5s ease;
        }
        .journal-found-glow {
          animation: journal-glow 2s ease-in-out infinite;
        }
        .journal-progress-fill {
          transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .journal-pct {
          background: linear-gradient(90deg, var(--accent), var(--secondary), var(--accent));
          background-size: 200% auto;
          animation: journal-shimmer 3s linear infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .journal-stagger > * {
          animation: journal-slide-up 0.3s ease both;
        }
        .journal-stagger > *:nth-child(1) { animation-delay: 0ms; }
        .journal-stagger > *:nth-child(2) { animation-delay: 30ms; }
        .journal-stagger > *:nth-child(3) { animation-delay: 60ms; }
        .journal-stagger > *:nth-child(4) { animation-delay: 90ms; }
        .journal-stagger > *:nth-child(5) { animation-delay: 120ms; }
        .journal-stagger > *:nth-child(6) { animation-delay: 150ms; }
        .journal-stagger > *:nth-child(7) { animation-delay: 180ms; }
        .journal-stagger > *:nth-child(8) { animation-delay: 210ms; }
        .journal-stagger > *:nth-child(9) { animation-delay: 240ms; }
        .journal-stagger > *:nth-child(10) { animation-delay: 270ms; }
        .journal-stagger > *:nth-child(n+11) { animation-delay: 300ms; }
      `}</style>

      {/* Header */}
      <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--fg)]">Species Journal</h2>
            <p className="text-sm text-[var(--muted)] mt-0.5">{title}</p>
          </div>
          <div className="text-right">
            <div className="journal-pct text-4xl font-black leading-none">{pct}%</div>
            <p className="text-xs text-[var(--muted)] mt-1">complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1.5">
            <span>{discoveredCount} of {totalCount} discovered</span>
            <span>{totalCount - discoveredCount} remaining</span>
          </div>
          <div className="h-3 rounded-full bg-[var(--bg)] overflow-hidden border border-[var(--border)]">
            <div
              className="journal-progress-fill h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, var(--accent), var(--secondary))`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Recently Discovered */}
      {recentlyDiscovered.length > 0 && (
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">
            Recently Discovered
          </h3>
          <div className="flex gap-3">
            {recentlyDiscovered.map(name => {
              return (
                <div
                  key={name}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--accent)] journal-found-glow"
                  style={{ borderColor: 'var(--accent)', borderWidth: 1 }}
                >
                  <TreeIcon species={name} size={20} />
                  <span className="text-sm font-medium text-[var(--fg)]">{name}</span>
                  <span className="text-xs text-[var(--accent)]">NEW</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {([
          { key: 'all' as Filter, label: 'All' },
          { key: 'found' as Filter, label: `Found (${discoveredCount})` },
          { key: 'missing' as Filter, label: `Missing (${totalCount - discoveredCount})` },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150"
            style={{
              background: filter === tab.key ? 'var(--accent)' : 'var(--surface)',
              color: filter === tab.key ? '#000' : 'var(--muted)',
              border: `1px solid ${filter === tab.key ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Species Grid */}
      <div className="grid grid-cols-3 gap-3 journal-stagger">
        {filtered.map((species) => {
          const isFound = foundSet.has(species.name);
          const count = speciesCounts[species.name] || 0;
          const rarity = getRarityLabel(ALL_SPECIES.indexOf(species));
          const isPopping = recentlyClicked === species.name;

          return (
            <button
              key={species.name}
              onClick={() => handleCardClick(species.name)}
              className={`journal-card ${isPopping ? 'journal-card-pop' : ''} relative rounded-xl p-3 text-center border cursor-pointer`}
              style={{
                background: isFound ? 'var(--surface-raised)' : 'var(--surface)',
                borderColor: isFound ? getCategoryColor(getTreeCategory(species.name)) + '40' : 'var(--border)',
                opacity: isFound ? 1 : 0.5,
              }}
            >
              {/* Found checkmark badge */}
              {isFound && (
                <div
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--accent)', color: '#000' }}
                >
                  <IconCheck size={12} color="#000" />
                </div>
              )}

              {/* Species icon */}
              <div className="flex items-center justify-center mb-1.5">
                {isFound ? (
                  <TreeIcon species={species.name} size={32} />
                ) : (
                  <IconLock size={32} color="var(--muted)" />
                )}
              </div>

              {/* Species name */}
              <div
                className="text-xs font-semibold truncate"
                style={{ color: isFound ? 'var(--fg)' : 'var(--muted)' }}
              >
                {isFound ? species.name : '???'}
              </div>

              {/* Rarity tag */}
              {isFound && (
                <div
                  className="text-[9px] font-bold uppercase tracking-wider mt-1"
                  style={{ color: rarity.color }}
                >
                  {rarity.label}
                </div>
              )}

              {/* Count */}
              {isFound && count > 1 && (
                <div
                  className="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: 'var(--bg)', color: 'var(--muted)' }}
                >
                  x{count}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty state for filters */}
      {filtered.length === 0 && (
        <div className="text-center py-10 space-y-2">
          <div className="flex justify-center">
            {filter === 'found' ? (
              <IconTree size={40} color="var(--muted)" />
            ) : (
              <IconTrophy size={40} color="var(--warn)" />
            )}
          </div>
          <p className="text-sm text-[var(--muted)]">
            {filter === 'found'
              ? 'No species found yet. Get out there and explore!'
              : 'You found them all! True Master Botanist.'}
          </p>
        </div>
      )}

      {/* Completion milestone */}
      {pct === 100 && (
        <div
          className="rounded-xl border-2 p-5 text-center space-y-2"
          style={{
            borderColor: 'var(--warn)',
            background: 'var(--surface)',
          }}
        >
          <div className="flex justify-center" style={{ animation: 'journal-pulse 2s ease infinite' }}>
            <IconTrophy size={40} color="var(--warn)" />
          </div>
          <p className="font-bold text-[var(--fg)]">Collection Complete!</p>
          <p className="text-sm text-[var(--muted)]">
            You&apos;ve identified all {totalCount} species. Legendary.
          </p>
        </div>
      )}
    </div>
  );
}
