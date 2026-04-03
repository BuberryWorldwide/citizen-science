'use client';

import { useState, useMemo } from 'react';
import { Tree } from '@/types/tree';
import { TreeIcon, getCategoryColor, getTreeCategory } from './Icons';
import { IconSearch, IconFilter, IconTree, IconCheck } from './Icons';

interface SearchPanelProps {
  trees: Tree[];
  userLocation: [number, number] | null;
  onSelectTree: (tree: Tree) => void;
  onFilterChange: (filters: { species?: string; accessibility?: string; radius?: number; lat?: number; lon?: number }) => void;
}

const SPECIES_OPTIONS = [
  'Mulberry', 'Pawpaw', 'Persimmon', 'Pecan', 'Apple', 'Pear',
  'Cherry', 'Plum', 'Fig', 'Muscadine', 'Peach', 'Walnut',
  'Hickory', 'Oak', 'Maple', 'Bradford Pear', 'Citrus', 'Chestnut',
];

const ACCESS_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'roadside', label: 'Roadside' },
  { value: 'permission_needed', label: 'Permission' },
  { value: 'private', label: 'Private' },
];

const RADIUS_OPTIONS = [
  { value: 800, label: '0.5 mi' },
  { value: 1600, label: '1 mi' },
  { value: 3200, label: '2 mi' },
  { value: 8000, label: '5 mi' },
  { value: 16000, label: '10 mi' },
];

function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function SearchPanel({ trees, userLocation, onSelectTree, onFilterChange }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('');
  const [selectedAccess, setSelectedAccess] = useState<string>('');
  const [selectedRadius, setSelectedRadius] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  const applyFilters = (overrides?: { species?: string; accessibility?: string; radius?: number }) => {
    const sp = overrides?.species !== undefined ? overrides.species : selectedSpecies;
    const ac = overrides?.accessibility !== undefined ? overrides.accessibility : selectedAccess;
    const rd = overrides?.radius !== undefined ? overrides.radius : selectedRadius;

    const filters: { species?: string; accessibility?: string; radius?: number; lat?: number; lon?: number } = {};
    if (sp) filters.species = sp;
    if (ac) filters.accessibility = ac;
    if (rd && userLocation) {
      filters.radius = rd;
      filters.lat = userLocation[0];
      filters.lon = userLocation[1];
    }
    onFilterChange(filters);
  };

  const toggleSpecies = (s: string) => {
    const next = selectedSpecies === s ? '' : s;
    setSelectedSpecies(next);
    applyFilters({ species: next || undefined });
  };

  const toggleAccess = (a: string) => {
    const next = selectedAccess === a ? '' : a;
    setSelectedAccess(next);
    applyFilters({ accessibility: next || undefined });
  };

  const toggleRadius = (r: number) => {
    const next = selectedRadius === r ? 0 : r;
    setSelectedRadius(next);
    applyFilters({ radius: next || undefined });
  };

  const clearAll = () => {
    setQuery('');
    setSelectedSpecies('');
    setSelectedAccess('');
    setSelectedRadius(0);
    onFilterChange({});
  };

  const activeCount = [selectedSpecies, selectedAccess, selectedRadius].filter(Boolean).length;

  // Client-side filter + sort the current tree set for the list
  const filteredTrees = useMemo(() => {
    let list = trees;

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(t =>
        (t.species?.toLowerCase().includes(q)) ||
        (t.species_variety?.toLowerCase().includes(q)) ||
        (t.notes?.toLowerCase().includes(q))
      );
    }

    // Sort by distance if we have user location
    if (userLocation) {
      list = [...list].sort((a, b) => {
        const da = distanceMiles(userLocation[0], userLocation[1], a.lat, a.lon);
        const db = distanceMiles(userLocation[0], userLocation[1], b.lat, b.lon);
        return da - db;
      });
    }

    return list.slice(0, 50);
  }, [trees, query, userLocation]);

  return (
    <div className="flex flex-col h-full max-h-[75vh]">
      {/* Search + filter header */}
      <div className="p-3 space-y-2 border-b border-[var(--border)]">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search trees..."
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2.5 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm border transition-colors ${
              activeCount > 0
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-glow)]'
                : 'border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            <IconFilter size={14} />
            {activeCount > 0 ? activeCount : ''}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-2.5 pt-1">
            {/* Species chips */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1.5">Species</p>
              <div className="flex flex-wrap gap-1">
                {SPECIES_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSpecies(s)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      selectedSpecies === s
                        ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--muted)]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Accessibility */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1.5">Access</p>
              <div className="flex gap-1.5">
                {ACCESS_OPTIONS.map(a => (
                  <button
                    key={a.value}
                    onClick={() => toggleAccess(a.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      selectedAccess === a.value
                        ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--muted)]'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Radius */}
            {userLocation && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1.5">Distance</p>
                <div className="flex gap-1.5">
                  {RADIUS_OPTIONS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => toggleRadius(r.value)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        selectedRadius === r.value
                          ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                          : 'border-[var(--border)] text-[var(--muted)]'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeCount > 0 && (
              <button onClick={clearAll} className="text-[11px] text-red-400 hover:text-red-300">
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="px-3 py-2 text-[11px] text-[var(--muted)] border-b border-[var(--border)]">
        {filteredTrees.length} tree{filteredTrees.length !== 1 ? 's' : ''}{trees.length > filteredTrees.length ? ` of ${trees.length}` : ''}
        {userLocation ? ' · sorted by distance' : ''}
      </div>

      {/* Tree list */}
      <div className="flex-1 overflow-y-auto">
        {filteredTrees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <IconTree size={32} color="var(--muted)" className="opacity-30 mb-2" />
            <p className="text-sm text-[var(--muted)]">No trees match your search</p>
          </div>
        ) : (
          filteredTrees.map((tree) => {
            const cat = getTreeCategory(tree.species);
            const color = getCategoryColor(cat);
            const dist = userLocation ? distanceMiles(userLocation[0], userLocation[1], tree.lat, tree.lon) : null;

            return (
              <button
                key={tree.id}
                onClick={() => onSelectTree(tree)}
                className="flex items-center gap-3 w-full px-3 py-3 border-b border-[var(--border)] hover:bg-[var(--surface-raised,var(--surface))] transition-colors text-left"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${color}15` }}
                >
                  <TreeIcon species={tree.species} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {tree.species || 'Unknown'}
                    {tree.species_variety && (
                      <span className="text-[var(--muted)] font-normal"> · {tree.species_variety}</span>
                    )}
                  </p>
                  <p className="text-[11px] text-[var(--muted)] truncate">
                    {tree.accessibility}
                    {tree.notes && ` · ${tree.notes.slice(0, 40)}`}
                  </p>
                </div>
                {dist !== null && (
                  <span className="text-[11px] text-[var(--muted)] shrink-0">
                    {dist < 0.1 ? `${Math.round(dist * 5280)}ft` : `${dist.toFixed(1)}mi`}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
