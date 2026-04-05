'use client';

import { useState, useEffect } from 'react';
import { TreeWithObservations, VerificationStatus } from '@/types/tree';
import { Project } from '@/lib/db/projects';
import { IconCheck, IconX, IconAlertTriangle, IconHelpCircle, IconStar, IconFlag, IconMap, IconLeaf, IconCamera } from '@/components/Icons';
import type { QuestContext } from './WorkOrderPanel';

interface TreeDetailProps {
  treeId: string;
  onClose: () => void;
  onAddObservation?: (treeId: string) => void;
  onVerify?: (treeId: string) => void;
  currentUserId?: string | null;
  activeQuest?: QuestContext | null;
}

export function TreeDetail({ treeId, onClose, onAddObservation, onVerify, currentUserId, activeQuest }: TreeDetailProps) {
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

      {/* Active quest banner */}
      {activeQuest && (
        <div className="mb-4 p-3 rounded-lg border" style={{ borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)' }}>
          <div className="flex items-center gap-2 mb-1">
            <IconLeaf size={16} color="#22c55e" />
            <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>
              {activeQuest.orderType === 'check_phenology' ? 'Phenology Quest' : 'Quest'}
            </span>
            <span className="ml-auto text-xs font-medium" style={{ color: '#fbbf24' }}>+{activeQuest.rewardPoints} pts</span>
          </div>
          {activeQuest.questText && (
            <>
              <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{activeQuest.questText.verb}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{activeQuest.questText.lookFor}</p>
              <p className="text-xs mt-1 italic" style={{ color: 'var(--accent)' }}>{activeQuest.questText.tip}</p>
            </>
          )}
        </div>
      )}

      {/* Smart prompts — what this tree needs */}
      {(() => {
        const allPhotos = tree.observations?.flatMap(o => o.photos || []) || [];
        const hasPhotos = allPhotos.length > 0;
        const lastObs = tree.observations?.[0];
        const lastObsDate = lastObs ? new Date(lastObs.observed_at) : null;
        const daysSinceObs = lastObsDate ? (Date.now() - lastObsDate.getTime()) / 86400000 : 999;
        const hasPhenology = tree.observations?.some(o => o.phenology);
        const prompts: { text: string; color: string; icon: React.ReactNode }[] = [];

        if (!hasPhotos) prompts.push({ text: 'This tree needs a photo — add one to help verify it', color: '#fbbf24', icon: <IconCamera size={14} color="#fbbf24" /> });
        if (!hasPhenology) prompts.push({ text: 'No phenology recorded yet — what stage is this tree in?', color: '#22c55e', icon: <IconLeaf size={14} color="#22c55e" /> });
        if (daysSinceObs > 180) prompts.push({ text: `Last observation was ${Math.round(daysSinceObs / 30)} months ago — time for an update`, color: '#f97316', icon: <IconAlertTriangle size={14} color="#f97316" /> });

        if (prompts.length === 0 || activeQuest) return null;
        return (
          <div className="mb-4 space-y-1.5">
            {prompts.map((p, i) => (
              <button
                key={i}
                onClick={() => onAddObservation?.(treeId)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs"
                style={{ background: `color-mix(in srgb, ${p.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${p.color} 25%, transparent)` }}
              >
                {p.icon}
                <span style={{ color: 'var(--fg)' }}>{p.text}</span>
              </button>
            ))}
          </div>
        );
      })()}

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
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${tree.lat},${tree.lon}&travelmode=walking`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 px-3 bg-[#3b82f6] text-white rounded-lg text-sm font-medium min-h-[44px] flex items-center justify-center gap-1.5 active:opacity-80"
        >
          <IconMap size={16} />
          Directions
        </a>
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
        <div className="space-y-2">
          {tree.observations.map((obs, idx) => (
            <ObservationCard key={obs.id} obs={obs} defaultExpanded={idx === 0} />
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

// ── Observation Card (expandable) ────────────────────────────

import { Observation } from '@/types/tree';

function ObservationCard({ obs, defaultExpanded }: { obs: Observation; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const photoCount = obs.photos?.length || 0;
  const firstPhoto = obs.photos?.[0];

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden text-sm">
      {/* Header — always visible, clickable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        {/* Thumbnail */}
        {firstPhoto ? (
          <img
            src={firstPhoto.url || ''}
            alt=""
            className="w-12 h-12 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-[var(--bg)] flex items-center justify-center shrink-0">
            <span className="text-[10px] text-[var(--muted)]">No img</span>
          </div>
        )}

        {/* Summary */}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--muted)]">
            {new Date(obs.observed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {obs.health && <span className="px-1.5 py-0.5 bg-[var(--bg)] rounded text-[10px] capitalize">{obs.health}</span>}
            {obs.phenology && <span className="px-1.5 py-0.5 bg-[var(--bg)] rounded text-[10px] capitalize">{obs.phenology.replace('_', ' ')}</span>}
            {photoCount > 0 && <span className="px-1.5 py-0.5 bg-[var(--bg)] rounded text-[10px]">{photoCount} photo{photoCount !== 1 ? 's' : ''}</span>}
          </div>
        </div>

        {/* Chevron */}
        <span className={`text-[var(--muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-[var(--border)] pt-2 space-y-2">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {obs.health && <span className="px-2 py-0.5 bg-[var(--bg)] rounded text-xs capitalize">{obs.health}</span>}
            {obs.trunk_width && <span className="px-2 py-0.5 bg-[var(--bg)] rounded text-xs capitalize">{obs.trunk_width}</span>}
            {obs.phenology && <span className="px-2 py-0.5 bg-[var(--bg)] rounded text-xs capitalize">{obs.phenology.replace('_', ' ')}</span>}
            {obs.yield && <span className="px-2 py-0.5 bg-[var(--bg)] rounded text-xs capitalize">Yield: {obs.yield}</span>}
          </div>

          {/* Notes */}
          {obs.notes && <p className="text-[var(--muted)] text-xs">{obs.notes}</p>}

          {/* Photos */}
          {obs.photos && obs.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {obs.photos.map(photo => (
                <a key={photo.id} href={photo.url || ''} target="_blank" rel="noopener noreferrer">
                  <img
                    src={photo.url || ''}
                    alt={photo.caption || 'Observation photo'}
                    className="w-40 h-40 object-cover rounded-lg shrink-0"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
