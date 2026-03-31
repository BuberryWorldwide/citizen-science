'use client';

import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { OfflineStore } from '@/lib/offline/store';

interface TagTreeFormProps {
  lat: number | null;
  lon: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const SPECIES_OPTIONS = [
  'Mulberry', 'Pawpaw', 'Persimmon', 'Pecan', 'Apple', 'Pear',
  'Bradford Pear', 'Cherry', 'Plum', 'Fig', 'Muscadine', 'Peach',
  'Walnut', 'Hickory', 'Oak', 'Maple', 'Other',
];

const ACCESSIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'roadside', label: 'Roadside' },
  { value: 'permission_needed', label: 'Permission Needed' },
  { value: 'private', label: 'Private' },
  { value: 'unknown', label: 'Unknown' },
];

const HEALTH_OPTIONS = ['good', 'fair', 'poor', 'dead', 'unknown'];
const TRUNK_OPTIONS = [
  { value: 'small', label: 'Small (<2" DBH)' },
  { value: 'medium', label: 'Medium (2-6")' },
  { value: 'large', label: 'Large (6"+)' },
];
const PHENOLOGY_OPTIONS = ['dormant', 'bud_break', 'leaf_out', 'flowering', 'fruiting', 'ripe_fruit'];

const USE_POTENTIAL_OPTIONS = [
  { value: 'rootstock', label: 'Rootstock' },
  { value: 'scion_source', label: 'Scion Source' },
  { value: 'harvest', label: 'Harvest' },
  { value: 'heritage_variety', label: 'Heritage Variety' },
];

export function TagTreeForm({ lat, lon, onSuccess, onCancel }: TagTreeFormProps) {
  const [species, setSpecies] = useState('');
  const [speciesVariety, setSpeciesVariety] = useState('');
  const [accessibility, setAccessibility] = useState('unknown');
  const [health, setHealth] = useState('');
  const [trunkWidth, setTrunkWidth] = useState('');
  const [phenology, setPhenology] = useState('');
  const [usePotential, setUsePotential] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleUsePotential = (value: string) => {
    setUsePotential(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lon) { setError('Location required'); return; }
    setSubmitting(true);
    setError('');

    const treeData = {
      species: species || undefined,
      species_variety: speciesVariety || undefined,
      lat, lon,
      accessibility,
      use_potential: usePotential.length > 0 ? usePotential : undefined,
      notes: notes || undefined,
      health: health || undefined,
      trunk_width: trunkWidth || undefined,
      phenology: phenology || undefined,
    };

    try {
      if (navigator.onLine) {
        const res = await fetch('/api/trees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(treeData),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
      } else {
        // Save to IndexedDB for later sync
        await OfflineStore.addPendingTree({
          local_id: uuidv4(),
          ...treeData,
          observation_notes: notes || undefined,
          created_at: new Date().toISOString(),
          synced: false,
        });
      }
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 pb-8 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Tag a Tree</h2>
        <button type="button" onClick={onCancel} className="text-[var(--muted)] text-sm">Cancel</button>
      </div>

      {lat && lon && (
        <p className="text-xs text-[var(--muted)]">
          {lat.toFixed(5)}, {lon.toFixed(5)}
        </p>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Species */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Species</label>
        <select
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Unknown</option>
          {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Variety */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Variety / Details</label>
        <input
          type="text"
          value={speciesVariety}
          onChange={(e) => setSpeciesVariety(e.target.value)}
          placeholder="e.g. Red Mulberry, Morus rubra, Male"
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Accessibility */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Accessibility</label>
        <div className="flex flex-wrap gap-2">
          {ACCESSIBILITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAccessibility(opt.value)}
              className={`px-3 py-1 rounded-full text-xs border ${
                accessibility === opt.value
                  ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Health */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Health</label>
        <div className="flex flex-wrap gap-2">
          {HEALTH_OPTIONS.map(h => (
            <button
              key={h}
              type="button"
              onClick={() => setHealth(h)}
              className={`px-3 py-1 rounded-full text-xs border capitalize ${
                health === h
                  ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Trunk Width */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Trunk Width</label>
        <div className="flex flex-wrap gap-2">
          {TRUNK_OPTIONS.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTrunkWidth(t.value)}
              className={`px-3 py-1 rounded-full text-xs border ${
                trunkWidth === t.value
                  ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Phenology */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Phenology</label>
        <div className="flex flex-wrap gap-2">
          {PHENOLOGY_OPTIONS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPhenology(p)}
              className={`px-3 py-1 rounded-full text-xs border capitalize ${
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

      {/* Use Potential */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Use Potential</label>
        <div className="flex flex-wrap gap-2">
          {USE_POTENTIAL_OPTIONS.map(u => (
            <button
              key={u.value}
              type="button"
              onClick={() => toggleUsePotential(u.value)}
              className={`px-3 py-1 rounded-full text-xs border ${
                usePotential.includes(u.value)
                  ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* Photo */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Photo</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 border border-dashed border-[var(--border)] rounded-lg text-sm text-[var(--muted)] active:bg-[var(--border)]"
        >
          {photoPreview ? 'Change Photo' : 'Take Photo'}
        </button>
        {photoPreview && (
          <img src={photoPreview} alt="Preview" className="mt-2 rounded-lg max-h-32 object-cover" />
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Location details, landmarks, observations..."
          rows={3}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-[var(--accent)] text-black rounded-lg font-medium text-sm disabled:opacity-50 active:bg-[var(--accent-dim)]"
      >
        {submitting ? 'Saving...' : 'Tag This Tree'}
      </button>
    </form>
  );
}
