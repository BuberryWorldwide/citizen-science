'use client';

import { useState, useEffect } from 'react';
import { IconLeaf } from './Icons';

interface PhaseInfo {
  phase: string;
  verb: string;
  lookFor: string;
}

const PHASE_COLORS: Record<string, string> = {
  bud_break: '#a3e635',
  leaf_out: '#22c55e',
  flowering: '#f472b6',
  fruiting: '#f59e0b',
  ripe_fruit: '#ef4444',
};

export function SeasonalBanner({ userLocation }: { userLocation: [number, number] | null }) {
  const [species, setSpecies] = useState<Record<string, PhaseInfo>>({});

  useEffect(() => {
    const lat = userLocation?.[0] || 36.16;
    fetch(`/api/phenology?lat=${lat}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.species) setSpecies(json.data.species);
      })
      .catch(() => {});
  }, [userLocation]);

  const entries = Object.entries(species);
  if (entries.length === 0) return null;

  return (
    <div className="absolute top-14 left-0 right-0 z-[600] px-2 pointer-events-none">
      <div className="pointer-events-auto overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 py-1.5 px-1 w-max">
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold shrink-0"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', backdropFilter: 'blur(8px)' }}
          >
            <IconLeaf size={11} color="#22c55e" />
            <span style={{ color: 'var(--muted)' }}>In Season</span>
          </div>
          {entries.map(([name, info]) => {
            const color = PHASE_COLORS[info.phase] || '#8890a4';
            return (
              <div
                key={name}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                <span style={{ color: 'var(--fg)' }}>{name}</span>
                <span style={{ color, opacity: 0.8 }}>{info.phase.replace('_', ' ')}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
