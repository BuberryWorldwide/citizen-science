'use client';

import { useParams, useRouter } from 'next/navigation';
import { TreeDetail } from '@/components/TreeDetail';

export default function TreePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <header className="flex items-center px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
        <button onClick={() => router.push('/')} className="text-[var(--accent)] text-sm mr-4">
          &larr; Map
        </button>
        <h1 className="text-lg font-bold">Tree Details</h1>
      </header>
      <TreeDetail treeId={id} onClose={() => router.push('/')} />
    </div>
  );
}
