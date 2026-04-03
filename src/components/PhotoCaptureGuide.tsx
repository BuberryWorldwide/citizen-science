'use client';

import { useState, useRef, useCallback } from 'react';
import { IconCamera, IconCheck, IconX, IconSearch } from './Icons';

export type PlantOrgan = 'leaf' | 'fruit' | 'bark' | 'flower' | 'habit';

interface PhotoCaptureGuideProps {
  /** Called when user confirms a photo. */
  onCapture: (file: File, organ: PlantOrgan) => void;
  /** Called when user removes/clears the photo. */
  onClear: () => void;
  /** Called when user cancels the whole photo flow. */
  onCancel: () => void;
  /** Current preview data URL (if a photo is already taken). */
  photoPreview: string | null;
  /** Current species selection — if 'Other' or empty, triggers auto-ID. */
  currentSpecies?: string;
  /** Called when PlantNet suggests a species the user accepts. */
  onSpeciesSuggestion?: (species: string, confidence: number) => void;
}

const ORGANS: { id: PlantOrgan; label: string; icon: string; tips: string[] }[] = [
  {
    id: 'leaf', label: 'Leaf', icon: '\u{1F343}',
    tips: ['Single leaf flat on plain background', 'Full leaf — stem to tip', 'Top side, veins visible'],
  },
  {
    id: 'fruit', label: 'Fruit', icon: '\u{1F34E}',
    tips: ['On the branch if possible', 'Show size reference', 'Clear color and texture'],
  },
  {
    id: 'bark', label: 'Bark', icon: '\u{1FAB5}',
    tips: ['Chest height on trunk', 'Fill frame with texture', 'Avoid mossy areas'],
  },
  {
    id: 'flower', label: 'Flower', icon: '\u{1F33A}',
    tips: ['Close up, fill the frame', 'Show petal arrangement', 'Best for identification'],
  },
  {
    id: 'habit', label: 'Full Tree', icon: '\u{1F333}',
    tips: ['Stand back for full shape', 'Include canopy and trunk', 'Less accurate alone'],
  },
];

interface IdResult {
  species: string;
  commonName: string;
  confidence: number;
  loading: boolean;
  error: string | null;
}

export function PhotoCaptureGuide({
  onCapture, onClear, onCancel, photoPreview,
  currentSpecies, onSpeciesSuggestion,
}: PhotoCaptureGuideProps) {
  const [selectedOrgan, setSelectedOrgan] = useState<PlantOrgan>('leaf');
  const [step, setStep] = useState<'select' | 'tips' | 'review'>('select');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [idResult, setIdResult] = useState<IdResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const organ = ORGANS.find(o => o.id === selectedOrgan)!;

  const needsIdentification = !currentSpecies || currentSpecies === 'Other' || currentSpecies === '';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPendingPreview(reader.result as string);
        setStep('review');
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUsePhoto = useCallback(async () => {
    if (!pendingFile) return;

    // If species unknown, try PlantNet identification
    if (needsIdentification) {
      setIdResult({ species: '', commonName: '', confidence: 0, loading: true, error: null });
      try {
        const formData = new FormData();
        formData.append('image', pendingFile);
        formData.append('organ', selectedOrgan);

        const res = await fetch('/api/photos/identify', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success && json.data?.species) {
          setIdResult({
            species: json.data.species,
            commonName: json.data.commonName || json.data.species,
            confidence: json.data.confidence || 0,
            loading: false,
            error: null,
          });
          return; // Don't call onCapture yet — wait for user to accept/dismiss
        } else {
          setIdResult({ species: '', commonName: '', confidence: 0, loading: false, error: 'Could not identify' });
        }
      } catch {
        setIdResult({ species: '', commonName: '', confidence: 0, loading: false, error: 'Identification failed' });
      }
    }

    // If species is already known, or ID failed, just accept the photo
    onCapture(pendingFile, selectedOrgan);
  }, [pendingFile, selectedOrgan, needsIdentification, onCapture]);

  const handleAcceptSuggestion = () => {
    if (idResult && idResult.species && pendingFile) {
      onSpeciesSuggestion?.(idResult.commonName || idResult.species, idResult.confidence);
      onCapture(pendingFile, selectedOrgan);
    }
  };

  const handleDismissSuggestion = () => {
    if (pendingFile) {
      onCapture(pendingFile, selectedOrgan);
    }
  };

  const handleRetake = () => {
    setPendingFile(null);
    setPendingPreview(null);
    setIdResult(null);
    setStep('tips');
  };

  const handleRemove = () => {
    setPendingFile(null);
    setPendingPreview(null);
    setIdResult(null);
    setStep('select');
    onClear();
  };

  // ── Already confirmed photo ──────────────────────────────────
  if (photoPreview && !pendingPreview) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span>{organ.icon}</span>
            <span className="font-medium">{organ.label}</span>
            <IconCheck size={14} color="var(--accent)" />
          </div>
          <button type="button" onClick={handleRemove} className="text-[11px] text-red-400">
            Remove
          </button>
        </div>
        <img src={photoPreview} alt="Preview" className="rounded-lg max-h-36 object-cover w-full" />
        <button
          type="button"
          onClick={() => { onClear(); setStep('select'); }}
          className="text-xs text-[var(--accent)]"
        >
          Take a different photo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ── Step: Review photo ────────────────────────────────── */}
      {step === 'review' && pendingPreview && (
        <>
          <img src={pendingPreview} alt="Preview" className="rounded-lg max-h-40 object-cover w-full" />

          {/* PlantNet identification result */}
          {idResult?.loading && (
            <div className="flex items-center gap-2 p-3 bg-[var(--surface-raised,var(--surface))] rounded-lg">
              <IconSearch size={16} color="var(--accent)" className="animate-pulse" />
              <span className="text-xs text-[var(--muted)]">Identifying species...</span>
            </div>
          )}

          {idResult && !idResult.loading && idResult.species && (
            <div className="p-3 bg-[var(--accent-glow)] border border-[var(--accent)]/20 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--accent)]">
                    {idResult.commonName}
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">
                    {idResult.species} — {Math.round(idResult.confidence * 100)}% confidence
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAcceptSuggestion}
                  className="flex-1 py-2 bg-[var(--accent)] text-black rounded-lg text-xs font-medium"
                >
                  Use: {idResult.commonName}
                </button>
                <button
                  type="button"
                  onClick={handleDismissSuggestion}
                  className="py-2 px-3 border border-[var(--border)] rounded-lg text-xs text-[var(--muted)]"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {idResult && !idResult.loading && idResult.error && (
            <p className="text-xs text-[var(--muted)]">{idResult.error}</p>
          )}

          {/* Use / Retake buttons (show when not loading ID) */}
          {!idResult?.loading && !idResult?.species && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 border border-[var(--border)] rounded-lg text-sm text-[var(--muted)] flex items-center justify-center gap-1.5"
              >
                <IconCamera size={14} />
                Retake
              </button>
              <button
                type="button"
                onClick={handleUsePhoto}
                className="flex-1 py-3 bg-[var(--accent)] text-black rounded-lg font-medium text-sm flex items-center justify-center gap-1.5"
              >
                <IconCheck size={14} color="#000" />
                {needsIdentification ? 'Identify & Use' : 'Use Photo'}
              </button>
            </div>
          )}

          {/* Retake during ID result */}
          {idResult && !idResult.loading && (
            <button type="button" onClick={handleRetake} className="text-xs text-[var(--muted)] w-full text-center">
              Take a different photo
            </button>
          )}
        </>
      )}

      {/* ── Step: Select organ ────────────────────────────────── */}
      {step === 'select' && (
        <>
          <label className="block text-sm text-[var(--muted)]">
            What are you photographing?
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {ORGANS.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelectedOrgan(o.id)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-colors ${
                  selectedOrgan === o.id
                    ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
                    : 'border-[var(--border)]'
                }`}
              >
                <span className="text-lg">{o.icon}</span>
                <span className="text-[10px] font-medium">{o.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep('tips')}
            className="w-full py-3 bg-[var(--accent)] text-black rounded-lg font-medium text-sm"
          >
            Next
          </button>
          <button type="button" onClick={onCancel} className="w-full py-2 text-xs text-[var(--muted)]">
            Skip photo
          </button>
        </>
      )}

      {/* ── Step: Photo tips ──────────────────────────────────── */}
      {step === 'tips' && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{organ.icon}</span>
            <span className="text-sm font-semibold">{organ.label} Tips</span>
          </div>
          <div className="bg-[var(--surface-raised,var(--surface))] rounded-xl p-3 space-y-1.5">
            {organ.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[var(--accent)] text-xs mt-0.5">{i + 1}.</span>
                <span className="text-xs leading-relaxed">{tip}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('select')}
              className="flex-1 py-3 border border-[var(--border)] rounded-lg text-sm text-[var(--muted)]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-3 bg-[var(--accent)] text-black rounded-lg font-medium text-sm flex items-center justify-center gap-2"
            >
              <IconCamera size={16} color="#000" />
              Take Photo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
