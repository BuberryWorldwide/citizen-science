'use client';

import { useState, useEffect } from 'react';
import { TreeWithObservations, VerificationStatus } from '@/types/tree';
import { Project } from '@/lib/db/projects';
import { IconCheck, IconX, IconAlertTriangle, IconHelpCircle, IconStar, IconFlag } from '@/components/Icons';

interface TreeDetailProps {
  treeId: string;
  onClose: () => void;
  onAddObservation?: (treeId: string) => void;
  onVerify?: (treeId: string) => void;
  currentUserId?: string | null;
}

export function TreeDetail({ treeId, onClose, onAddObservation, onVerify, currentUserId }: TreeDetailProps) {
  const [tree, setTree] = useState<TreeWithObservations | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [flagging, setFlagging] = useState(false);

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

  const handleFlag = async () => {
    setFlagging(true);
    try {
      await fetch(`/api/trees/${treeId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Flagged by user' }),
      });
    } catch { /* ignore */ }
    setFlagging(false);
  };

  const canVerify = currentUserId && tree && tree.created_by !== currentUserId;

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

      {/* Verification section */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <VerificationBadge
            status={tree.verification_status || 'unverified'}
            confidence={tree.verification_confidence}
          />
          {tree.is_first_discovery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/15 text-yellow-400 rounded-full text-xs font-medium">
              <IconStar size={12} color="currentColor" />
              First Discovery
            </span>
          )}
        </div>

        {tree.plantnet_species && (
          <div className="border border-[var(--border)] rounded-lg p-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">AI suggests:</span>
              <span className="font-medium">{tree.plantnet_species}</span>
            </div>
            {tree.verification_confidence != null && (
              <div className="mt-1.5">
                <div className="w-full h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round(tree.verification_confidence * 100)}%`,
                      background: tree.verification_confidence > 0.8 ? 'var(--accent)' : tree.verification_confidence > 0.5 ? 'var(--warn)' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {canVerify && (
          <div className="flex gap-2">
            {onVerify && (
              <button
                onClick={() => onVerify(treeId)}
                className="flex-1 py-2 bg-[var(--accent)] text-black rounded-lg text-sm font-medium min-h-[44px] flex items-center justify-center gap-1.5 active:opacity-80"
              >
                <IconCheck size={16} color="#000" />
                Verify
              </button>
            )}
            <button
              onClick={handleFlag}
              disabled={flagging}
              className="py-2 px-4 border border-red-500/50 text-red-400 rounded-lg text-sm min-h-[44px] flex items-center justify-center gap-1.5 active:bg-red-500/10 disabled:opacity-50"
            >
              <IconFlag size={16} />
              Flag
            </button>
          </div>
        )}
      </div>

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

// ── Verification Badge ────────────────────────────────────────

const BADGE_CONFIG: Record<VerificationStatus, { bg: string; text: string; label: string; Icon: typeof IconCheck }> = {
  verified:      { bg: 'bg-green-500/15', text: 'text-green-400', label: 'Verified',    Icon: IconCheck },
  auto_verified: { bg: 'bg-blue-500/15',  text: 'text-blue-400',  label: 'AI Verified', Icon: IconCheck },
  unverified:    { bg: 'bg-gray-500/15',  text: 'text-gray-400',  label: 'Unverified',  Icon: IconHelpCircle },
  rejected:      { bg: 'bg-red-500/15',   text: 'text-red-400',   label: 'Rejected',    Icon: IconX },
  disputed:      { bg: 'bg-yellow-500/15', text: 'text-yellow-400', label: 'Disputed',  Icon: IconAlertTriangle },
};

function VerificationBadge({ status, confidence }: { status: VerificationStatus; confidence: number | null }) {
  const cfg = BADGE_CONFIG[status] || BADGE_CONFIG.unverified;
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${cfg.bg} ${cfg.text} rounded-full text-xs font-medium`}>
      <Icon size={12} color="currentColor" />
      {cfg.label}
      {status === 'auto_verified' && confidence != null && (
        <span className="opacity-70 ml-0.5">{Math.round(confidence * 100)}%</span>
      )}
    </span>
  );
}
