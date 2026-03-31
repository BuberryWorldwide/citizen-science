'use client';

import { useEffect, useRef, useCallback, ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ y: number; scrollTop: number } | null>(null);
  const dragOffset = useRef(0);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.classList.add('sheet-open');
    } else {
      document.body.classList.remove('sheet-open');
    }
    return () => document.body.classList.remove('sheet-open');
  }, [open]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    dragStart.current = {
      y: e.touches[0].clientY,
      scrollTop: sheet.scrollTop,
    };
    dragOffset.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const sheet = sheetRef.current;
    if (!sheet || !dragStart.current) return;

    const dy = e.touches[0].clientY - dragStart.current.y;

    // Only capture drag when scrolled to top and dragging down
    if (dragStart.current.scrollTop > 0 || dy < 0) return;

    // Prevent scroll while dragging
    e.preventDefault();
    dragOffset.current = dy;
    sheet.style.transform = `translateY(${Math.max(0, dy)}px)`;
    sheet.style.transition = 'none';
  }, []);

  const handleTouchEnd = useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    sheet.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';

    if (dragOffset.current > 120) {
      sheet.style.transform = 'translateY(100%)';
      setTimeout(onClose, 300);
    } else {
      sheet.style.transform = 'translateY(0)';
    }

    dragStart.current = null;
    dragOffset.current = 0;
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 z-[1001] bg-[var(--surface)] rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3 cursor-grab">
          <div className="w-12 h-1 bg-[var(--border)] rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
}
