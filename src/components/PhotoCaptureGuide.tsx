'use client';

import { useState, useRef } from 'react';
import { IconCamera, IconCheck, IconSearch } from './Icons';
import { compressImage } from '@/lib/image';

export type PlantOrgan = 'leaf' | 'fruit' | 'bark' | 'flower' | 'habit';

interface PhotoCaptureGuideProps {
  onCapture: (file: File, organ: PlantOrgan) => void;
  onClear: () => void;
  onCancel: () => void;
  photoPreview: string | null;
  currentSpecies?: string;
  onSpeciesSuggestion?: (species: string, confidence: number) => void;
}

const ORGANS: { id: PlantOrgan; label: string; icon: string; tips: string[] }[] = [
  { id: 'leaf', label: 'Leaf', icon: '\u{1F343}', tips: ['Single leaf flat on plain background', 'Full leaf — stem to tip', 'Top side, veins visible'] },
  { id: 'fruit', label: 'Fruit', icon: '\u{1F34E}', tips: ['On the branch if possible', 'Show size reference', 'Clear color and texture'] },
  { id: 'bark', label: 'Bark', icon: '\u{1FAB5}', tips: ['Chest height on trunk', 'Fill frame with texture', 'Avoid mossy areas'] },
  { id: 'flower', label: 'Flower', icon: '\u{1F33A}', tips: ['Close up, fill the frame', 'Show petal arrangement', 'Best for identification'] },
  { id: 'habit', label: 'Full Tree', icon: '\u{1F333}', tips: ['Stand back for full shape', 'Include canopy and trunk', 'Less accurate alone'] },
];

type Step = 'select' | 'tips' | 'review' | 'scanning' | 'result';

interface ScanResult {
  species: string;
  commonName: string;
  confidence: number;
  error?: string;
}

export function PhotoCaptureGuide({
  onCapture, onClear, onCancel, photoPreview,
  currentSpecies, onSpeciesSuggestion,
}: PhotoCaptureGuideProps) {
  const [selectedOrgan, setSelectedOrgan] = useState<PlantOrgan>('leaf');
  const [step, setStep] = useState<Step>('select');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const organ = ORGANS.find(o => o.id === selectedOrgan)!;
  const needsId = !currentSpecies || currentSpecies === 'Other' || currentSpecies === '';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress immediately so all downstream uses get the small file
      const compressed = await compressImage(file);
      setPendingFile(compressed);
      const reader = new FileReader();
      reader.onload = () => {
        setPendingPreview(reader.result as string);
        setStep('review');
      };
      reader.readAsDataURL(compressed);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUsePhoto = () => {
    if (!pendingFile) return;
    if (needsId) {
      runIdentification();
    } else {
      onCapture(pendingFile, selectedOrgan);
    }
  };

  const runIdentification = async () => {
    if (!pendingFile) return;
    setStep('scanning');
    setScanResult(null);

    try {
      // Compress before sending to PlantNet
      const compressed = await compressImage(pendingFile);
      const formData = new FormData();
      formData.append('image', compressed);
      formData.append('organ', selectedOrgan);

      const res = await fetch('/api/photos/identify', { method: 'POST', body: formData });
      const json = await res.json();

      if (json.success && json.data?.species) {
        setScanResult({
          species: json.data.species,
          commonName: json.data.commonName || json.data.species,
          confidence: json.data.confidence || 0,
        });
        setStep('result');
      } else {
        setScanResult({ species: '', commonName: '', confidence: 0, error: 'Could not identify this plant. Try a clearer photo or different angle.' });
        setStep('result');
      }
    } catch {
      setScanResult({ species: '', commonName: '', confidence: 0, error: 'Identification failed. Check your connection.' });
      setStep('result');
    }
  };

  const acceptSuggestion = () => {
    if (scanResult?.commonName && pendingFile) {
      onSpeciesSuggestion?.(scanResult.commonName, scanResult.confidence);
      onCapture(pendingFile, selectedOrgan);
    }
  };

  const skipSuggestion = () => {
    if (pendingFile) onCapture(pendingFile, selectedOrgan);
  };

  const retake = () => {
    setPendingFile(null);
    setPendingPreview(null);
    setScanResult(null);
    setStep('tips');
  };

  const remove = () => {
    setPendingFile(null);
    setPendingPreview(null);
    setScanResult(null);
    setStep('select');
    onClear();
  };

  // ── Confirmed photo (already accepted) ─────────────────────
  if (photoPreview && step !== 'review' && step !== 'scanning' && step !== 'result') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span>{organ.icon}</span>
            <span className="font-medium">{organ.label}</span>
            <IconCheck size={14} color="var(--accent)" />
          </div>
          <button type="button" onClick={remove} className="text-[11px] text-red-400">Remove</button>
        </div>
        <img src={photoPreview} alt="Preview" className="rounded-lg max-h-36 object-cover w-full" />
        <button type="button" onClick={() => { onClear(); setStep('select'); }} className="text-xs text-[var(--accent)]">
          Take a different photo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

      {/* ── Scanning ──────────────────────────────────────────── */}
      {step === 'scanning' && (
        <div className="space-y-3">
          {pendingPreview && (
            <img src={pendingPreview} alt="Scanning" className="rounded-lg max-h-36 object-cover w-full opacity-70" />
          )}
          <div className="flex items-center gap-3 p-4 bg-[var(--surface-raised,var(--surface))] rounded-xl">
            <div className="relative">
              <IconSearch size={20} color="var(--accent)" />
              <div className="absolute inset-0 animate-ping">
                <IconSearch size={20} color="var(--accent)" className="opacity-30" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Identifying species...</p>
              <p className="text-[11px] text-[var(--muted)]">Analyzing your {organ.label.toLowerCase()} photo</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Result ────────────────────────────────────────────── */}
      {step === 'result' && (
        <div className="space-y-3">
          {pendingPreview && (
            <img src={pendingPreview} alt="Preview" className="rounded-lg max-h-36 object-cover w-full" />
          )}

          {scanResult?.species ? (
            <div className="p-4 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl space-y-3">
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-semibold">Species Identified</p>
                <p className="text-lg font-bold text-[var(--accent)] mt-1">{scanResult.commonName}</p>
                <p className="text-xs text-[var(--muted)]">
                  {scanResult.species} — {Math.round(scanResult.confidence * 100)}% confidence
                </p>
              </div>
              {/* Confidence bar */}
              <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(scanResult.confidence * 100)}%`,
                    background: scanResult.confidence > 0.7 ? 'var(--accent)' : scanResult.confidence > 0.4 ? '#fbbf24' : '#f97316',
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={acceptSuggestion}
                  className="flex-1 py-2.5 bg-[var(--accent)] text-black rounded-lg text-sm font-semibold"
                >
                  Use: {scanResult.commonName}
                </button>
                <button
                  type="button"
                  onClick={skipSuggestion}
                  className="py-2.5 px-4 border border-[var(--border)] rounded-lg text-sm text-[var(--muted)]"
                >
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[var(--surface-raised,var(--surface))] rounded-xl space-y-2">
              <p className="text-sm text-[var(--muted)]">{scanResult?.error || 'Could not identify'}</p>
              <div className="flex gap-2">
                <button type="button" onClick={retake} className="flex-1 py-2.5 border border-[var(--border)] rounded-lg text-sm text-[var(--muted)]">
                  Retake
                </button>
                <button type="button" onClick={skipSuggestion} className="flex-1 py-2.5 bg-[var(--accent)] text-black rounded-lg text-sm font-medium">
                  Use Photo Anyway
                </button>
              </div>
            </div>
          )}

          <button type="button" onClick={retake} className="text-xs text-[var(--muted)] w-full text-center">
            Take a different photo
          </button>
        </div>
      )}

      {/* ── Review (before scanning) ──────────────────────────── */}
      {step === 'review' && pendingPreview && (
        <div className="space-y-3">
          <img src={pendingPreview} alt="Preview" className="rounded-lg max-h-40 object-cover w-full" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={retake}
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
              {needsId ? (
                <><IconSearch size={14} color="#000" /> Identify</>
              ) : (
                <><IconCheck size={14} color="#000" /> Use Photo</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Select organ ──────────────────────────────────────── */}
      {step === 'select' && (
        <>
          <label className="block text-sm text-[var(--muted)]">What are you photographing?</label>
          <div className="grid grid-cols-5 gap-1.5">
            {ORGANS.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelectedOrgan(o.id)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-colors ${
                  selectedOrgan === o.id ? 'border-[var(--accent)] bg-[var(--accent-glow)]' : 'border-[var(--border)]'
                }`}
              >
                <span className="text-lg">{o.icon}</span>
                <span className="text-[10px] font-medium">{o.label}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStep('tips')} className="w-full py-3 bg-[var(--accent)] text-black rounded-lg font-medium text-sm">
            Next
          </button>
          <button type="button" onClick={onCancel} className="w-full py-2 text-xs text-[var(--muted)]">Skip photo</button>
        </>
      )}

      {/* ── Tips ──────────────────────────────────────────────── */}
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
            <button type="button" onClick={() => setStep('select')} className="flex-1 py-3 border border-[var(--border)] rounded-lg text-sm text-[var(--muted)]">
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
