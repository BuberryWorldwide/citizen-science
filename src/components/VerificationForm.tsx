'use client';

import { useState } from 'react';
import { IconCheck, IconX, IconHelpCircle } from '@/components/Icons';

interface VerificationFormProps {
  treeId: string;
  species: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const SPECIES_OPTIONS = [
  'Mulberry', 'Pawpaw', 'Persimmon', 'Pecan', 'Apple', 'Pear',
  'Bradford Pear', 'Cherry', 'Plum', 'Fig', 'Muscadine', 'Peach',
  'Walnut', 'Hickory', 'Oak', 'Maple', 'Other',
];

type Verdict = 'verified' | 'species_corrected' | null;

export function VerificationForm({ treeId, species, onSuccess, onCancel }: VerificationFormProps) {
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [correctedSpecies, setCorrectedSpecies] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!verdict) return;
    setSubmitting(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        verdict,
        notes: notes || undefined,
      };
      if (verdict === 'species_corrected' && correctedSpecies) {
        body.corrected_species = correctedSpecies;
      }

      const res = await fetch(`/api/trees/${treeId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Verification failed');

      setSuccess(true);
      setTimeout(() => onSuccess(), 1200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 pb-8 safe-area-bottom text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/15 flex items-center justify-center">
          <IconCheck size={24} color="#34d399" />
        </div>
        <p className="text-sm font-medium">Verification submitted!</p>
        <p className="text-xs text-[var(--muted)] mt-1">Thanks for helping verify this tree.</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-8 safe-area-bottom space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Verify Tree</h2>
        <button onClick={onCancel} className="text-[var(--muted)] text-sm min-h-[44px] px-3">Cancel</button>
      </div>

      {species && (
        <div className="border border-[var(--border)] rounded-lg p-3 text-center">
          <p className="text-xs text-[var(--muted)]">Tagged species</p>
          <p className="text-base font-semibold mt-0.5">{species}</p>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Verdict chips */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-2">Is the species correct?</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setVerdict('verified')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border min-h-[44px] transition-colors ${
              verdict === 'verified'
                ? 'bg-green-500/15 border-green-500/50 text-green-400'
                : 'border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            <IconCheck size={16} />
            Correct
          </button>
          <button
            type="button"
            onClick={() => setVerdict('species_corrected')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border min-h-[44px] transition-colors ${
              verdict === 'species_corrected'
                ? 'bg-red-500/15 border-red-500/50 text-red-400'
                : 'border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            <IconX size={16} />
            Wrong
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--muted)] min-h-[44px]"
          >
            <IconHelpCircle size={16} />
            Can&apos;t Tell
          </button>
        </div>
      </div>

      {/* Species correction dropdown */}
      {verdict === 'species_corrected' && (
        <div>
          <label className="block text-sm text-[var(--muted)] mb-1">Correct species</label>
          <select
            value={correctedSpecies}
            onChange={(e) => setCorrectedSpecies(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select species...</option>
            {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Notes */}
      {verdict && (
        <div>
          <label className="block text-sm text-[var(--muted)] mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional details..."
            rows={2}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>
      )}

      {/* Submit */}
      {verdict && (
        <button
          onClick={handleSubmit}
          disabled={submitting || (verdict === 'species_corrected' && !correctedSpecies)}
          className="w-full py-3 bg-[var(--accent)] text-black rounded-lg font-medium text-sm disabled:opacity-50 active:bg-[var(--accent-dim)]"
        >
          {submitting ? 'Submitting...' : 'Submit Verification'}
        </button>
      )}
    </div>
  );
}
