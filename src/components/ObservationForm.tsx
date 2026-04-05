'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { OfflineStore } from '@/lib/offline/store';
import { compressImage } from '@/lib/image';
import { MultiPhotoCapture, type CapturedPhoto } from './MultiPhotoCapture';

interface ObservationFormProps {
  treeId: string;
  onSuccess: (rewards?: unknown) => void;
  onCancel: () => void;
}

const HEALTH_OPTIONS = ['good', 'fair', 'poor', 'dead', 'unknown'];
const TRUNK_OPTIONS = [
  { value: 'small', label: 'Small (<2")' },
  { value: 'medium', label: 'Medium (2-6")' },
  { value: 'large', label: 'Large (6"+)' },
];
const PHENOLOGY_OPTIONS = ['dormant', 'bud_break', 'leaf_out', 'flowering', 'fruiting', 'ripe_fruit'];
const FRUIT_SIZE = ['small', 'medium', 'large'];
const SWEETNESS = ['tart', 'mild', 'sweet', 'very_sweet'];
const YIELD = ['none', 'light', 'moderate', 'heavy'];
const QUALITY = ['poor', 'fair', 'good', 'excellent'];
const RELIABILITY = ['annual', 'biennial', 'irregular', 'unknown'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function ChipSelect({ options, value, onChange, capitalize = true }: {
  options: string[] | { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  capitalize?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt.replace('_', ' ') : opt.label;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(value === val ? '' : val)}
            className={`px-3.5 py-2 rounded-full text-sm border ${capitalize ? 'capitalize' : ''} ${
              value === val
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


export function ObservationForm({ treeId, onSuccess, onCancel }: ObservationFormProps) {
  const [health, setHealth] = useState('');
  const [trunkWidth, setTrunkWidth] = useState('');
  const [phenology, setPhenology] = useState('');
  const [fruitSize, setFruitSize] = useState('');
  const [fruitSweetness, setFruitSweetness] = useState('');
  const [fruitColor, setFruitColor] = useState('');
  const [yieldAmt, setYieldAmt] = useState('');
  const [fruitQuality, setFruitQuality] = useState('');
  const [fruitingStart, setFruitingStart] = useState(0);
  const [fruitingEnd, setFruitingEnd] = useState(0);
  const [reliability, setReliability] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);

  const showHarvestFields = ['fruiting', 'ripe_fruit'].includes(phenology);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const obsData = {
      tree_id: treeId,
      health: health || undefined,
      trunk_width: trunkWidth || undefined,
      phenology: phenology || undefined,
      fruit_size: fruitSize || undefined,
      fruit_sweetness: fruitSweetness || undefined,
      fruit_color: fruitColor || undefined,
      yield: yieldAmt || undefined,
      fruit_quality: fruitQuality || undefined,
      fruiting_month_start: fruitingStart || undefined,
      fruiting_month_end: fruitingEnd || undefined,
      reliability: reliability || undefined,
      notes: notes || undefined,
    };

    try {
      let apiRewards: unknown = null;
      if (navigator.onLine) {
        setSubmitStatus('Saving observation...');
        const res = await fetch('/api/observations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(obsData),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        apiRewards = json.rewards;
        const observationId = json.data?.id;

        // Upload photos
        if (photos.length > 0 && observationId) {
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
              await fetch(uploadUrl, {
                method: 'PUT',
                body: photo.file,
                headers: { 'Content-Type': photo.file.type },
                signal: controller.signal,
              });
            } finally {
              clearTimeout(timeout);
            }
          }
        }
      } else {
        const obsLocalId = uuidv4();
        await OfflineStore.addPendingObservation({
          local_id: obsLocalId,
          tree_id: treeId,
          health: health || undefined,
          trunk_width: trunkWidth || undefined,
          phenology: phenology || undefined,
          notes: notes || undefined,
          created_at: new Date().toISOString(),
          synced: false,
        });

        for (const photo of photos) {
          const compressed = await compressImage(photo.file);
          const buffer = await compressed.arrayBuffer();
          await OfflineStore.addPendingPhoto({
            local_id: uuidv4(),
            observation_local_id: obsLocalId,
            filename: compressed.name,
            content_type: compressed.type,
            data: buffer,
          });
        }
      }
      onSuccess(apiRewards);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
      setSubmitStatus('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 pb-8 space-y-4 safe-area-bottom">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">New Observation</h2>
        <button type="button" onClick={onCancel} className="text-[var(--muted)] text-sm min-h-[44px] px-3">Cancel</button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Health */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Health</label>
        <ChipSelect options={HEALTH_OPTIONS} value={health} onChange={setHealth} />
      </div>

      {/* Trunk Width */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Trunk Width</label>
        <ChipSelect options={TRUNK_OPTIONS} value={trunkWidth} onChange={setTrunkWidth} />
      </div>

      {/* Phenology */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Phenology</label>
        <ChipSelect options={PHENOLOGY_OPTIONS} value={phenology} onChange={setPhenology} />
      </div>

      {/* Harvest data — only show when fruiting/ripe */}
      {showHarvestFields && (
        <>
          <div className="border-t border-[var(--border)] pt-3">
            <p className="text-xs text-[var(--accent)] font-medium mb-3">Harvest Data</p>
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Fruit Size</label>
            <ChipSelect options={FRUIT_SIZE} value={fruitSize} onChange={setFruitSize} />
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Sweetness</label>
            <ChipSelect options={SWEETNESS} value={fruitSweetness} onChange={setFruitSweetness} />
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Fruit Color</label>
            <input
              type="text"
              value={fruitColor}
              onChange={(e) => setFruitColor(e.target.value)}
              placeholder="e.g. dark purple, red, white"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Yield</label>
            <ChipSelect options={YIELD} value={yieldAmt} onChange={setYieldAmt} />
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Fruit Quality</label>
            <ChipSelect options={QUALITY} value={fruitQuality} onChange={setFruitQuality} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Fruiting Starts</label>
              <select
                value={fruitingStart}
                onChange={(e) => setFruitingStart(parseInt(e.target.value))}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              >
                <option value={0}>--</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Fruiting Ends</label>
              <select
                value={fruitingEnd}
                onChange={(e) => setFruitingEnd(parseInt(e.target.value))}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              >
                <option value={0}>--</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Reliability</label>
            <ChipSelect options={RELIABILITY} value={reliability} onChange={setReliability} />
          </div>
        </>
      )}

      {/* Photos */}
      <MultiPhotoCapture
        photos={photos}
        onPhotosChange={setPhotos}
      />

      {/* Notes */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you observe?"
          rows={3}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-[var(--accent)] text-black rounded-lg font-medium text-sm disabled:opacity-50 active:bg-[var(--accent-dim)]"
      >
        {submitting ? (submitStatus || 'Saving...') : 'Save Observation'}
      </button>
    </form>
  );
}
