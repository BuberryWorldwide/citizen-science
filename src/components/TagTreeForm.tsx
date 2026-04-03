'use client';

import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { OfflineStore } from '@/lib/offline/store';
import { compressImage } from '@/lib/image';
import { PhotoCaptureGuide, type PlantOrgan } from './PhotoCaptureGuide';
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoOrgan, setPhotoOrgan] = useState<PlantOrgan>('leaf');
  const [showPhotoGuide, setShowPhotoGuide] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  // Ref as backup source of truth for photo file
  const photoFileRef = useRef<File | null>(null);

  function dbg(...parts: unknown[]) {
    const line = parts.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join(' ');
    console.log(line);
    setDebugLog(prev => [...prev.slice(-30), line]);
  }

  const handlePhotoCapture = (file: File, organ: PlantOrgan) => {
    dbg('[CAPTURE] file:', file?.name, 'type:', file?.type, 'size:', file?.size);
    photoFileRef.current = file;
    setPhotoFile(file);
    setPhotoOrgan(organ);
    setShowPhotoGuide(false);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
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
    setSubmitStatus('Saving tree...');
    setError('');
    setDebugLog([]);

    const traceId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    dbg('[SUBMIT]', traceId, 'started');

    const fileToUpload = photoFileRef.current ?? photoFile;
    dbg('[SUBMIT]', traceId, 'photoFile state:', photoFile?.name, photoFile?.size);
    dbg('[SUBMIT]', traceId, 'photoFileRef:', photoFileRef.current?.name, photoFileRef.current?.size);
    dbg('[SUBMIT]', traceId, 'fileToUpload:', fileToUpload?.name, fileToUpload?.size);

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
        // Step 1: Save tree
        dbg('[SUBMIT]', traceId, 'POST /api/trees');
        const res = await fetch('/api/trees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(treeData),
        });
        const raw = await res.text();
        dbg('[SUBMIT]', traceId, 'tree response status:', res.status);
        dbg('[SUBMIT]', traceId, 'tree response:', raw.slice(0, 200));

        let json;
        try { json = JSON.parse(raw); } catch { throw new Error('Invalid tree response: ' + raw.slice(0, 100)); }
        if (!json.success) throw new Error(json.error || 'Tree save failed');
        apiRewards = json.rewards;

        const treeId = json.data?.id;
        dbg('[SUBMIT]', traceId, 'treeId:', treeId);
        if (!treeId) throw new Error('Tree saved but no ID returned');

        // Step 2: Upload photo if present
        const willUpload = !!fileToUpload && !!treeId;
        dbg('[SUBMIT]', traceId, 'willUpload:', willUpload);

        if (willUpload) {
          setSubmitStatus('Preparing photo...');

          // Step 2a: Get observation ID
          let observationId: string | null = null;

          if (health || trunkWidth || phenology) {
            dbg('[SUBMIT]', traceId, 'fetching tree to get observation ID');
            const treeRes = await fetch(`/api/trees/${treeId}`);
            const treeRaw = await treeRes.text();
            dbg('[SUBMIT]', traceId, 'tree fetch status:', treeRes.status);
            const treeJson = JSON.parse(treeRaw);
            if (treeJson.success && treeJson.data?.observations?.length > 0) {
              observationId = treeJson.data.observations[0].id;
            }
            dbg('[SUBMIT]', traceId, 'observationId from tree:', observationId);
          }

          if (!observationId) {
            dbg('[SUBMIT]', traceId, 'creating fallback observation');
            const obsRes = await fetch('/api/observations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tree_id: treeId, notes: 'Initial photo' }),
            });
            const obsRaw = await obsRes.text();
            dbg('[SUBMIT]', traceId, 'obs create status:', obsRes.status, 'body:', obsRaw.slice(0, 200));
            const obsJson = JSON.parse(obsRaw);
            if (obsJson.success) observationId = obsJson.data.id;
            dbg('[SUBMIT]', traceId, 'observationId from create:', observationId);
          }

          if (!observationId) {
            throw new Error('No observation ID available for photo upload');
          }

          // Step 2b: Compress
          setSubmitStatus('Compressing photo...');
          dbg('[UPLOAD]', traceId, 'compressing file:', fileToUpload!.name, fileToUpload!.size);
          const compressed = await compressImage(fileToUpload!);
          dbg('[UPLOAD]', traceId, 'compressed:', compressed.name, compressed.size, compressed.type);

          // Step 2c: Get upload URL
          setSubmitStatus('Requesting upload URL...');
          dbg('[UPLOAD]', traceId, 'POST /api/photos');
          const photoRes = await fetch('/api/photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              observation_id: observationId,
              filename: compressed.name,
              content_type: compressed.type,
              organ: photoOrgan,
            }),
          });
          const photoRaw = await photoRes.text();
          dbg('[UPLOAD]', traceId, 'photo route status:', photoRes.status);
          dbg('[UPLOAD]', traceId, 'photo route body:', photoRaw.slice(0, 300));

          let photoJson;
          try { photoJson = JSON.parse(photoRaw); } catch { throw new Error('Invalid photo response: ' + photoRaw.slice(0, 100)); }
          if (!photoJson.success) throw new Error('Photo route failed: ' + (photoJson.error || photoRaw.slice(0, 100)));

          const uploadUrl = photoJson.data?.upload_url;
          dbg('[UPLOAD]', traceId, 'uploadUrl:', uploadUrl);
          if (!uploadUrl) throw new Error('No upload_url in photo response');

          // Step 2d: PUT file to upload URL with timeout
          setSubmitStatus('Uploading photo...');
          dbg('[UPLOAD]', traceId, 'PUT to:', uploadUrl);
          dbg('[UPLOAD]', traceId, 'PUT size:', compressed.size, 'type:', compressed.type);

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);
          try {
            const putRes = await fetch(uploadUrl, {
              method: 'PUT',
              body: compressed,
              headers: { 'Content-Type': compressed.type || 'image/jpeg' },
              signal: controller.signal,
            });
            clearTimeout(timeout);
            const putBody = await putRes.text().catch(() => '');
            dbg('[UPLOAD]', traceId, 'PUT status:', putRes.status, 'body:', putBody.slice(0, 200));
            if (!putRes.ok) throw new Error(`PUT failed ${putRes.status}: ${putBody.slice(0, 100)}`);
            dbg('[UPLOAD]', traceId, 'upload complete');
          } catch (putErr) {
            clearTimeout(timeout);
            if ((putErr as Error).name === 'AbortError') {
              throw new Error('Photo upload timed out after 30 seconds');
            }
            throw putErr;
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

        if (fileToUpload) {
          const compressed = await compressImage(fileToUpload);
          const buffer = await compressed.arrayBuffer();
          await OfflineStore.addPendingPhoto({
            local_id: uuidv4(),
            tree_local_id: treeLocalId,
            filename: compressed.name,
            content_type: compressed.type,
            data: buffer,
          });
        }
      }

      dbg('[SUBMIT]', traceId, 'SUCCESS');
      setSubmitStatus('');
      onSuccess(apiRewards);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      dbg('[SUBMIT] FAILED:', msg);
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

      {/* Photo with guide */}
      <div>
        <label className="block text-sm text-[var(--muted)] mb-1">Photo</label>
        {showPhotoGuide || photoPreview ? (
          <PhotoCaptureGuide
            onCapture={handlePhotoCapture}
            onClear={() => { photoFileRef.current = null; setPhotoFile(null); setPhotoPreview(null); }}
            onCancel={() => setShowPhotoGuide(false)}
            photoPreview={photoPreview}
            currentSpecies={species}
            onSpeciesSuggestion={(s) => { if (!species || species === 'Other') setSpecies(s); }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowPhotoGuide(true)}
            className="w-full py-3 border border-dashed border-[var(--border)] rounded-lg text-sm text-[var(--muted)] active:bg-[var(--border)] flex items-center justify-center gap-2"
          >
            <IconCamera size={16} />
            Add Photo
          </button>
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
        {submitting ? (submitStatus || 'Saving...') : 'Tag This Tree'}
      </button>

      {/* Debug log panel */}
      {debugLog.length > 0 && (
        <div style={{
          background: '#111',
          color: '#0f0',
          fontSize: 10,
          padding: 8,
          borderRadius: 8,
          maxHeight: '30vh',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
        }}>
          {debugLog.join('\n')}
        </div>
      )}
    </form>
  );
}
