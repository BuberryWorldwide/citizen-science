'use client';

import { useState, useEffect } from 'react';
import { TreeWithObservations } from '@/types/tree';
import { Project } from '@/lib/db/projects';

interface TreeDetailProps {
  treeId: string;
  onClose: () => void;
  onAddObservation?: (treeId: string) => void;
}

export function TreeDetail({ treeId, onClose, onAddObservation }: TreeDetailProps) {
  const [tree, setTree] = useState<TreeWithObservations | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch(`/api/trees/${treeId}`)
      .then(r => r.json())
      .then(json => { if (json.success) setTree(json.data); })
      .catch(err => console.error('Failed to load tree:', err))
      .finally(() => setLoading(false));
  }, [treeId]);

  const openProjectPicker = async () => {
    try {
      const res = await fetch('/api/projects');
      const json = await res.json();
      if (json.success) setAllProjects(json.data);
    } catch { /* ignore */ }
    setShowProjectPicker(true);
  };

  const addToProject = async (projectId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/trees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tree_id: treeId }),
      });
      const proj = allProjects.find(p => p.id === projectId);
      if (proj) setProjects(prev => [...prev, proj]);
    } catch { /* ignore */ }
    setShowProjectPicker(false);
  };

  if (loading) {
    return <div className="p-6 text-center text-[var(--muted)]">Loading...</div>;
  }

  if (!tree) {
    return <div className="p-6 text-center text-red-400">Tree not found</div>;
  }

  return (
    <div className="p-4 pb-8 safe-area-bottom">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold">{tree.species || 'Unknown Species'}</h2>
          {tree.species_variety && (
            <p className="text-sm text-[var(--muted)]">{tree.species_variety}</p>
          )}
        </div>
        <button onClick={onClose} className="text-[var(--muted)] text-sm min-h-[44px] px-3">Close</button>
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

      {/* Projects this tree belongs to */}
      {projects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {projects.map(p => (
            <span key={p.id} className="px-2 py-0.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs">
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        {onAddObservation && (
          <button
            onClick={() => onAddObservation(treeId)}
            className="flex-1 py-2 border border-[var(--accent)] text-[var(--accent)] rounded-lg text-sm font-medium min-h-[44px] active:bg-[var(--accent)]/10"
          >
            + Observation
          </button>
        )}
        <button
          onClick={openProjectPicker}
          className="flex-1 py-2 border border-[var(--border)] text-[var(--muted)] rounded-lg text-sm min-h-[44px] active:bg-[var(--border)]"
        >
          + Project
        </button>
      </div>

      {/* Project picker */}
      {showProjectPicker && (
        <div className="mb-4 border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-[var(--bg)] text-xs text-[var(--muted)]">Add to project:</div>
          {allProjects.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[var(--muted)]">No projects yet.</p>
          ) : (
            allProjects.map(p => (
              <button
                key={p.id}
                onClick={() => addToProject(p.id)}
                className="w-full text-left px-3 py-3 text-sm border-t border-[var(--border)] min-h-[44px] active:bg-[var(--border)]"
              >
                {p.name}
              </button>
            ))
          )}
          <button
            onClick={() => setShowProjectPicker(false)}
            className="w-full px-3 py-2 text-xs text-[var(--muted)] border-t border-[var(--border)]"
          >
            Cancel
          </button>
        </div>
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
              {obs.photos && obs.photos.length > 0 && (
                <div className="flex gap-2 mt-2 overflow-x-auto">
                  {obs.photos.map(photo => (
                    <a
                      key={photo.id}
                      href={photo.url || ''}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={photo.url || ''}
                        alt={photo.caption || 'Observation photo'}
                        className="w-48 h-48 object-cover rounded-lg flex-shrink-0"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
