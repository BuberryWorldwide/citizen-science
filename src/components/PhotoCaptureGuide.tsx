'use client';

import { useState, useRef } from 'react';
import { IconTree, IconCamera, IconCheck } from './Icons';

export type PlantOrgan = 'leaf' | 'fruit' | 'bark' | 'flower' | 'habit';

interface PhotoCaptureGuideProps {
  onCapture: (file: File, organ: PlantOrgan) => void;
  onCancel: () => void;
  photoPreview: string | null;
}

const ORGANS: { id: PlantOrgan; label: string; icon: string; tips: string[] }[] = [
  {
    id: 'leaf',
    label: 'Leaf',
    icon: '\u{1F343}',
    tips: [
      'Place a single leaf flat against a plain background',
      'Include the full leaf — stem to tip',
      'Show the top side (upper surface)',
      'Make sure veins and edges are sharp',
    ],
  },
  {
    id: 'fruit',
    label: 'Fruit',
    icon: '\u{1F34E}',
    tips: [
      'Photograph the fruit on the branch if possible',
      'Show size reference (hand or coin nearby)',
      'Capture color and texture clearly',
      'Include a cross-section if you can cut one open',
    ],
  },
  {
    id: 'bark',
    label: 'Bark',
    icon: '\u{1FAB5}',
    tips: [
      'Photograph at chest height on the trunk',
      'Fill the frame with bark texture',
      'Avoid mossy or damaged sections',
      'Good for winter ID when no leaves',
    ],
  },
  {
    id: 'flower',
    label: 'Flower',
    icon: '\u{1F33A}',
    tips: [
      'Get close — fill the frame with the flower',
      'Show petal shape and arrangement',
      'Include buds if nearby',
      'Best identification accuracy of all organs',
    ],
  },
  {
    id: 'habit',
    label: 'Whole Tree',
    icon: '\u{1F333}',
    tips: [
      'Stand back to capture the full tree shape',
      'Include the canopy and trunk',
      'Avoid other trees overlapping',
      'Less accurate — combine with a leaf or fruit photo',
    ],
  },
];

export function PhotoCaptureGuide({ onCapture, onCancel, photoPreview }: PhotoCaptureGuideProps) {
  const [selectedOrgan, setSelectedOrgan] = useState<PlantOrgan>('leaf');
  const [step, setStep] = useState<'select' | 'tips'>('select');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const organ = ORGANS.find(o => o.id === selectedOrgan)!;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file, selectedOrgan);
    }
  };

  const openCamera = () => {
    fileInputRef.current?.click();
  };

  if (photoPreview) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span>{organ.icon}</span>
          <span className="font-medium">{organ.label} photo</span>
          <IconCheck size={14} color="var(--accent)" />
        </div>
        <img src={photoPreview} alt="Preview" className="rounded-lg max-h-40 object-cover w-full" />
        <button
          type="button"
          onClick={() => setStep('select')}
          className="text-xs text-[var(--accent)]"
        >
          Retake with different angle
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

      {step === 'select' ? (
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
            Next — Photo Tips
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-xs text-[var(--muted)]"
          >
            Skip photo
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{organ.icon}</span>
            <span className="text-sm font-semibold">{organ.label} Photo Tips</span>
          </div>
          <div className="bg-[var(--surface-raised,var(--surface))] rounded-xl p-3 space-y-2">
            {organ.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[var(--accent)] text-xs mt-0.5">
                  {i + 1}.
                </span>
                <span className="text-xs text-[var(--fg)] leading-relaxed">{tip}</span>
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
              onClick={openCamera}
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
