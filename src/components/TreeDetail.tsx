'use client';

import { useState, useEffect } from 'react';
import { TreeWithObservations } from '@/types/tree';

interface TreeDetailProps {
  treeId: string;
  onClose: () => void;
  onAddObservation?: (treeId: string) => void;
}

export function TreeDetail({ treeId, onClose, onAddObservation }: TreeDetailProps) {
  const [tree, setTree] = useState<TreeWithObservations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/trees/${treeId}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setTree(json.data);
      })
      .catch(err => console.error('Failed to load tree:', err))
      .finally(() => setLoading(false));
  }, [treeId]);

  if (loading) {
    return <div className="p-6 text-center text-[var(--muted)]">Loading...</div>;
  }

  if (!tree) {
    return <div className="p-6 text-center text-red-400">Tree not found</div>;
  }

  return (
    <div className="p-4 pb-8">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold">{tree.species || 'Unknown Species'}</h2>
          {tree.species_variety && (
            <p className="text-sm text-[var(--muted)]">{tree.species_variety}</p>
          )}
        </div>
        <button onClick={onClose} className="text-[var(--muted)] text-sm">Close</button>
      </div>

      {/* Tree info */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div>
          <span className="text-[var(--muted)]">Status:</span>{' '}
          <span className="capitalize">{tree.status}</span>
        </div>
        <div>
          <span className="text-[var(--muted)]">Access:</span>{' '}
          <span className="capitalize">{tree.accessibility?.replace('_', ' ')}</span>
        </div>
        <div className="col-span-2">
          <span className="text-[var(--muted)]">Location:</span>{' '}
          {tree.lat.toFixed(5)}, {tree.lon.toFixed(5)}
        </div>
        {tree.use_potential?.length > 0 && (
          <div className="col-span-2">
            <span className="text-[var(--muted)]">Use:</span>{' '}
            {tree.use_potential.map(u => u.replace('_', ' ')).join(', ')}
          </div>
        )}
      </div>

      {tree.notes && (
        <p className="text-sm text-[var(--muted)] mb-4 italic">{tree.notes}</p>
      )}

      {/* Add observation button */}
      {onAddObservation && (
        <button
          onClick={() => onAddObservation(treeId)}
          className="w-full py-2 border border-[var(--accent)] text-[var(--accent)] rounded-lg text-sm font-medium active:bg-[var(--accent)]/10 mb-4"
        >
          + Add Observation
        </button>
      )}

      {/* Observation timeline */}
      <h3 className="text-sm font-bold text-[var(--accent)] mb-2 mt-4">
        Observations ({tree.observations?.length || 0})
      </h3>

      {(!tree.observations || tree.observations.length === 0) ? (
        <p className="text-sm text-[var(--muted)]">No observations yet.</p>
      ) : (
        <div className="space-y-3">
          {tree.observations.map(obs => (
            <div key={obs.id} className="border border-[var(--border)] rounded-lg p-3 text-sm">
              <div className="text-xs text-[var(--muted)] mb-1">
                {new Date(obs.observed_at).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric'
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {obs.health && (
                  <span className="px-2 py-0.5 bg-[var(--bg)] rounded text-xs capitalize">{obs.health}</span>
                )}
                {obs.trunk_width && (
                  <span className="px-2 py-0.5 bg-[var(--bg)] rounded text-xs capitalize">{obs.trunk_width}</span>
                )}
                {obs.phenology && (
                  <span className="px-2 py-0.5 bg-[var(--bg)] rounded text-xs capitalize">
                    {obs.phenology.replace('_', ' ')}
                  </span>
                )}
                {obs.yield && (
                  <span className="px-2 py-0.5 bg-[var(--bg)] rounded text-xs capitalize">Yield: {obs.yield}</span>
                )}
              </div>
              {obs.notes && <p className="text-[var(--muted)] mt-1">{obs.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
