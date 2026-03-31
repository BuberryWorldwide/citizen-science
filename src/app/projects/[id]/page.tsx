'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Tree } from '@/types/tree';
import { Project } from '@/lib/db/projects';

const TreeMap = dynamic(() => import('@/components/TreeMap'), { ssr: false });

interface ProjectWithTrees extends Project {
  trees: Tree[];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<ProjectWithTrees | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(json => { if (json.success) setProject(json.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="min-h-dvh bg-[var(--bg)] flex items-center justify-center text-[var(--muted)]">Loading...</div>;
  }

  if (!project) {
    return <div className="min-h-dvh bg-[var(--bg)] flex items-center justify-center text-red-400">Project not found</div>;
  }

  return (
    <div className="h-dvh flex flex-col bg-[var(--bg)]">
      <header className="flex items-center justify-between px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-[var(--accent)] text-sm">&larr; Projects</Link>
          <div>
            <h1 className="text-lg font-bold">{project.name}</h1>
            <p className="text-xs text-[var(--muted)]">{project.tree_count} trees</p>
          </div>
        </div>
      </header>

      {project.description && (
        <p className="px-4 py-2 text-sm text-[var(--muted)] bg-[var(--surface)] border-b border-[var(--border)]">
          {project.description}
        </p>
      )}

      {/* Map with project trees */}
      <div className="flex-1">
        {project.trees.length > 0 ? (
          <TreeMap
            trees={project.trees}
            userLocation={null}
            onMapClick={() => {}}
            onTreeSelect={() => {}}
            onBoundsChange={() => {}}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--muted)] text-sm">
            No trees in this project yet. Add trees from the map view.
          </div>
        )}
      </div>

      {/* Tree list */}
      <div className="max-h-[30vh] overflow-y-auto bg-[var(--surface)] border-t border-[var(--border)]">
        {project.trees.map(tree => (
          <Link
            key={tree.id}
            href={`/trees/${tree.id}`}
            className="flex justify-between items-center px-4 py-3 border-b border-[var(--border)]"
          >
            <div>
              <span className="text-sm font-medium">{tree.species || 'Unknown'}</span>
              {tree.species_variety && (
                <span className="text-xs text-[var(--muted)] ml-2">{tree.species_variety}</span>
              )}
            </div>
            <span className="text-xs text-[var(--muted)] capitalize">{tree.accessibility}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
