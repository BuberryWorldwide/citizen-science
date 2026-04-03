'use client';

import { useState, useRef } from 'react';
import { compressImage } from '@/lib/image';
import { IconCamera, IconX, IconCheck } from './Icons';

export type PhotoType = 'leaf' | 'full_tree' | 'fruit' | 'bark' | 'flower' | 'other';

export interface CapturedPhoto {
  file: File;
  preview: string;
  type: PhotoType;
}

interface MultiPhotoCaptureProps {
  photos: CapturedPhoto[];
  onPhotosChange: (photos: CapturedPhoto[]) => void;
  maxPhotos?: number;
  /** Current species — if unknown, triggers PlantNet on leaf photo */
  currentSpecies?: string;
  onSpeciesSuggestion?: (species: string, confidence: number) => void;
}

const PHOTO_TYPES: { id: PhotoType; label: string; required?: boolean }[] = [
  { id: 'leaf', label: 'Leaf', required: true },
  { id: 'full_tree', label: 'Full Tree', required: true },
  { id: 'fruit', label: 'Fruit' },
  { id: 'bark', label: 'Bark' },
  { id: 'flower', label: 'Flower' },
  { id: 'other', label: 'Other' },
];

const TIPS: Record<PhotoType, string> = {
  leaf: 'Single leaf flat on plain background, show veins',
  full_tree: 'Stand back to capture full shape and canopy',
  fruit: 'Show fruit on branch with size reference',
  bark: 'Chest height, fill frame with texture',
  flower: 'Close up, show petal arrangement',
  other: 'Capture anything else noteworthy',
};

export function MultiPhotoCapture({
  photos, onPhotosChange, maxPhotos = 5,
  currentSpecies, onSpeciesSuggestion,
}: MultiPhotoCaptureProps) {
  const [activeType, setActiveType] = useState<PhotoType>('leaf');
  const [identifying, setIdentifying] = useState(false);
  const [idResult, setIdResult] = useState<{ name: string; confidence: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasLeaf = photos.some(p => p.type === 'leaf');
  const hasFullTree = photos.some(p => p.type === 'full_tree');
  const hasMinRequired = hasLeaf || hasFullTree;
  const needsId = !currentSpecies || currentSpecies === 'Other' || currentSpecies === '';

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const compressed = await compressImage(file);
    const preview = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(compressed);
    });

    const newPhoto: CapturedPhoto = { file: compressed, preview, type: activeType };
    const updated = [...photos, newPhoto];
    onPhotosChange(updated);

    // Auto-identify on first leaf photo if species unknown
    if (activeType === 'leaf' && needsId && !idResult) {
      runIdentification(compressed);
    }
  };

  const runIdentification = async (file: File) => {
    setIdentifying(true);
    try {
      const buffer = await file.arrayBuffer();
      const blob = new Blob([buffer], { type: file.type || 'image/jpeg' });
      const formData = new FormData();
      formData.append('image', blob, file.name);
      formData.append('organ', 'leaf');

      const res = await fetch('/api/photos/identify', { method: 'POST', body: formData });
      const json = await res.json();

      if (json.success && json.data?.species) {
        setIdResult({ name: json.data.commonName || json.data.species, confidence: json.data.confidence });
      }
    } catch { /* silent */ }
    setIdentifying(false);
  };

  const removePhoto = (idx: number) => {
    onPhotosChange(photos.filter((_, i) => i !== idx));
  };

  const openCamera = (type: PhotoType) => {
    setActiveType(type);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />

      {/* Taken photos */}
      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative shrink-0">
              <img src={photo.preview} alt={photo.type} className="w-20 h-20 object-cover rounded-lg" />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5 rounded-b-lg capitalize">
                {photo.type.replace('_', ' ')}
              </span>
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <IconX size={10} color="#fff" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PlantNet identification result */}
      {identifying && (
        <div className="flex items-center gap-2 p-2.5 bg-[var(--surface-raised,var(--surface))] rounded-lg">
          <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--muted)]">Identifying species...</span>
        </div>
      )}
      {idResult && (
        <div className="flex items-center justify-between p-2.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">{idResult.name}</p>
            <p className="text-[10px] text-[var(--muted)]">{Math.round(idResult.confidence * 100)}% confidence</p>
          </div>
          <button
            type="button"
            onClick={() => { onSpeciesSuggestion?.(idResult.name, idResult.confidence); setIdResult(null); }}
            className="px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-xs font-medium"
          >
            Use
          </button>
        </div>
      )}

      {/* Requirement indicator */}
      <div className="flex items-center gap-2 text-xs">
        <span className={hasLeaf ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}>
          {hasLeaf ? <IconCheck size={12} color="var(--accent)" /> : '○'} Leaf
        </span>
        <span className={hasFullTree ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}>
          {hasFullTree ? <IconCheck size={12} color="var(--accent)" /> : '○'} Full tree
        </span>
        {!hasMinRequired && (
          <span className="text-[var(--warn,#fbbf24)] text-[10px]">Need at least 1 leaf or full tree</span>
        )}
      </div>

      {/* Photo type buttons */}
      {photos.length < maxPhotos && (
        <div className="grid grid-cols-3 gap-1.5">
          {PHOTO_TYPES.map(t => {
            const exists = photos.some(p => p.type === t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => openCamera(t.id)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-colors ${
                  exists
                    ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted)]'
                }`}
              >
                <IconCamera size={16} />
                <span className="text-[10px] font-medium capitalize">{t.label}</span>
                {exists && <IconCheck size={10} color="var(--accent)" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Tip for selected type */}
      {photos.length < maxPhotos && (
        <p className="text-[10px] text-[var(--muted)] italic">
          Tip: {TIPS[activeType]}
        </p>
      )}
    </div>
  );
}
