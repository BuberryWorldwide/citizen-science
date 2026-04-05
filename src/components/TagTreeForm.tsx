'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { OfflineStore } from '@/lib/offline/store';
import { compressImage } from '@/lib/image';
import { MultiPhotoCapture, type CapturedPhoto } from './MultiPhotoCapture';
import { IconCamera } from './Icons';

interface TagTreeFormProps {
  lat: number | null;
  lon: number | null;
  onSuccess: (rewards?: unknown) => void;
  onCancel: () => void;
}

const SPECIES_OPTIONS = [
  'Mulberry', 'Pawpaw', 'Persimmon', 'Pecan', 'Apple', 'Pear',
  'Bradford Pear', 'Cherry', 'Plum', 'Fig', 'Muscadine', 'Peach',
  'Walnut', 'Hickory', 'Oak', 'Maple', 'Citrus', 'Chestnut', 'Other',
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

function ChipSelect({ options, value, onChange, capitalize = true }: {
  options: string[] | { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  capitalize?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(value === v ? '' : v)}
            className={`px-3.5 py-2 rounded-full text-sm border ${capitalize ? 'capitalize' : ''} ${
              value === v
                ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

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
  const [submitStatus, setSubmitStatus] = useState('');
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);

  const toggleUsePotential = (value: string) => {
    setUsePotential(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lon) { setError('Location required'); return; }
    setSubmitting(true);
    setSubmitStatus('Saving tree...');
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
      let apiRewards: unknown = null;
      if (navigator.onLine) {
        const res = await fetch('/api/trees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(treeData),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Tree save failed');
        apiRewards = json.rewards;

        const treeId = json.data?.id;
        if (!treeId) throw new Error('Tree saved but no ID returned');

        // Upload photos if any
        if (photos.length > 0) {
          // Get observation ID
          let observationId: string | null = null;

          if (health || trunkWidth || phenology) {
            const treeRes = await fetch(`/api/trees/${treeId}`);
            const treeJson = await treeRes.json();
            if (treeJson.success && treeJson.data?.observations?.length > 0) {
              observationId = treeJson.data.observations[0].id;
            }
          }

          if (!observationId) {
            const obsRes = await fetch('/api/observations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tree_id: treeId, notes: 'Initial photos' }),
            });
            const obsJson = await obsRes.json();
            if (obsJson.success) observationId = obsJson.data.id;
          }

          if (!observationId) throw new Error('No observation ID for photo upload');

          // Upload each photo
          for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];
            setSubmitStatus(`Uploading photo ${i + 1}/${photos.length}...`);

            const photoRes = await fetch('/api/photos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                observation_id: observationId,
                filename: photo.file.name,
                content_type: photo.file.type,
                photo_type: photo.type,
              }),
            });
            const photoJson = await photoRes.json();
            if (!photoJson.success) throw new Error('Photo registration failed');

            const uploadUrl = photoJson.data?.upload_url;
            if (!uploadUrl) throw new Error('No upload URL returned');

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);
            try {
              const putRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: photo.file,
                headers: { 'Content-Type': photo.file.type || 'image/jpeg' },
                signal: controller.signal,
              });
              clearTimeout(timeout);
              if (!putRes.ok) throw new Error(`Upload failed: ${putRes.status}`);
            } catch (e) {
              clearTimeout(timeout);
              if ((e as Error).name === 'AbortError') throw new Error(`Photo ${i + 1} upload timed out`);
              throw e;
            }
          }
        }
      } else {
        // Offline path
        const treeLocalId = uuidv4();
        await OfflineStore.addPendingTree({
          local_id: treeLocalId,
          ...treeData,
          observation_notes: notes || undefined,
          created_at: new Date().toISOString(),
          synced: false,
        });

        for (const photo of photos) {
          const buffer = await photo.file.arrayBuffer();
          await OfflineStore.addPendingPhoto({
            local_id: uuidv4(),
            tree_local_id: treeLocalId,
            filename: photo.file.name,
            content_type: photo.file.type,
            data: buffer,
          });
        }
      }

      setSubmitStatus('');
      onSuccess(apiRewards);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[TagTreeForm] submit failed:', msg);
      setError(msg);
      setSubmitStatus('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 pb-8 space-y-4 safe-area-bottom">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Tag a Tree</h2>
        <button type="button" onClick={onCancel} className="text-[var(--muted)] text-sm">Cancel</button>
      </div>

      {lat && lon && (
        <p className="text-xs text-[var(--muted)]">
          Location: {lat.toFixed(5)}, {lon.toFixed(5)}
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
        <ChipSelect options={ACCESSIBILITY_OPTIONS} value={accessibility} onChange={setAccessibility} capitalize={false} />
      </div>

      {/* Health */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Health</label>
        <ChipSelect options={HEALTH_OPTIONS} value={health} onChange={setHealth} />
      </div>

      {/* Trunk Width */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Trunk Width</label>
        <ChipSelect options={TRUNK_OPTIONS} value={trunkWidth} onChange={setTrunkWidth} capitalize={false} />
      </div>

      {/* Phenology */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Phenology</label>
        <ChipSelect options={PHENOLOGY_OPTIONS} value={phenology} onChange={setPhenology} />
      </div>

      {/* Use Potential */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Use Potential</label>
        <div className="flex flex-wrap gap-1.5">
          {USE_POTENTIAL_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleUsePotential(opt.value)}
              className={`px-3.5 py-2 rounded-full text-sm border ${
                usePotential.includes(opt.value)
                  ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Photos</label>
        <MultiPhotoCapture
          photos={photos}
          onPhotosChange={setPhotos}
          maxPhotos={5}
          currentSpecies={species}
          onSpeciesSuggestion={(s) => { if (!species || species === 'Other') setSpecies(s); }}
        />
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
        {submitting ? (submitStatus || 'Saving...') : 'Tag This Tree'}
      </button>
    </form>
  );
}
