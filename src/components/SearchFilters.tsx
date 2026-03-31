'use client';

import { useState } from 'react';

interface SearchFiltersProps {
  onSearch: (filters: SearchParams) => void;
  userLocation: [number, number] | null;
  overlay?: boolean;
}

export interface SearchParams {
  species?: string;
  accessibility?: string;
  phenology?: string;
  lat?: number;
  lon?: number;
  radius?: number;
}

const SPECIES_QUICK = ['Mulberry', 'Pawpaw', 'Persimmon', 'Bradford Pear', 'Pecan', 'Fig'];
const ACCESS_OPTIONS = ['public', 'roadside', 'permission_needed', 'private'];
const PHENOLOGY_OPTIONS = ['dormant', 'bud_break', 'leaf_out', 'flowering', 'fruiting', 'ripe_fruit'];
const RADIUS_OPTIONS = [
  { value: 800, label: '0.5 mi' },
  { value: 1600, label: '1 mi' },
  { value: 3200, label: '2 mi' },
  { value: 8000, label: '5 mi' },
  { value: 16000, label: '10 mi' },
];

export function SearchFilters({ onSearch, userLocation, overlay }: SearchFiltersProps) {
  const [expanded, setExpanded] = useState(!!overlay);
  const [species, setSpecies] = useState('');
  const [accessibility, setAccessibility] = useState('');
  const [phenology, setPhenology] = useState('');
  const [radius, setRadius] = useState(0);

  const activeCount = [species, accessibility, phenology, radius].filter(Boolean).length;

  const applyFilters = (overrides?: Partial<SearchParams>) => {
    const s = overrides?.species !== undefined ? overrides.species : species;
    const a = overrides?.accessibility !== undefined ? overrides.accessibility : accessibility;
    const r = overrides?.radius !== undefined ? overrides.radius : radius;
    const params: SearchParams = {
      species: s || undefined,
      accessibility: a || undefined,
    };
    if (r && userLocation) {
      params.lat = userLocation[0];
      params.lon = userLocation[1];
      params.radius = r;
    }
    onSearch(params);
  };

  const clearAll = () => {
    setSpecies('');
    setAccessibility('');
    setPhenology('');
    setRadius(0);
    onSearch({});
  };

  const toggleChip = (current: string, value: string, setter: (v: string) => void, key: string) => {
    const next = current === value ? '' : value;
    setter(next);
    applyFilters({ [key]: next || undefined });
  };

  return (
    <div className={overlay ? '' : 'bg-[var(--surface)] border-b border-[var(--border)]'}>
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          type="text"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          placeholder="Search species..."
          className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm"
        />
        <button
          onClick={() => applyFilters()}
          className="px-4 py-2.5 bg-[var(--accent)] text-black rounded-lg text-sm font-medium min-h-[44px]"
        >
          Go
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`px-3 py-2.5 rounded-lg text-sm border min-h-[44px] ${
            activeCount > 0
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-[var(--border)] text-[var(--muted)]'
          }`}
        >
          {activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
        </button>
      </div>

      {/* Quick species chips */}
      <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto no-scrollbar">
        {SPECIES_QUICK.map(s => (
          <button
            key={s}
            onClick={() => toggleChip(species, s, setSpecies, 'species')}
            className={`px-3.5 py-2 rounded-full text-sm whitespace-nowrap border ${
              species === s
                ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-[var(--border)] pt-3">
          {/* Accessibility */}
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Accessibility</label>
            <div className="flex flex-wrap gap-1.5">
              {ACCESS_OPTIONS.map(a => (
                <button
                  key={a}
                  onClick={() => toggleChip(accessibility, a, setAccessibility, 'accessibility')}
                  className={`px-3.5 py-2 rounded-full text-sm capitalize border ${
                    accessibility === a
                      ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {a.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Phenology */}
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Phenology</label>
            <div className="flex flex-wrap gap-1.5">
              {PHENOLOGY_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => toggleChip(phenology, p, setPhenology, 'phenology')}
                  className={`px-3.5 py-2 rounded-full text-sm capitalize border ${
                    phenology === p
                      ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {p.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Radius search */}
          {userLocation && (
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Near me</label>
              <div className="flex flex-wrap gap-1.5">
                {RADIUS_OPTIONS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => toggleChip(String(radius), String(r.value), (v) => setRadius(Number(v)), 'radius')}
                    className={`px-3.5 py-2 rounded-full text-sm border ${
                      radius === r.value
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
            <button onClick={clearAll} className="text-xs text-red-400">
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
