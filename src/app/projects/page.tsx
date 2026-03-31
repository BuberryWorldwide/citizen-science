'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Project } from '@/lib/db/projects';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchProjects = () => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(json => { if (json.success) setProjects(json.data); })
      .catch(console.error);
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreate(false);
        setName('');
        setDescription('');
        fetchProjects();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <header className="flex items-center justify-between px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[var(--accent)] text-sm">&larr; Map</Link>
          <h1 className="text-lg font-bold">Projects</h1>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-sm font-medium"
        >
          + New
        </button>
      </header>

      {showCreate && (
        <form onSubmit={handleCreate} className="p-4 bg-[var(--surface)] border-b border-[var(--border)] space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name..."
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            autoFocus
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-[var(--muted)] text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="p-4 space-y-3">
        {projects.length === 0 ? (
          <p className="text-[var(--muted)] text-sm text-center py-8">
            No projects yet. Create one to group trees together.
          </p>
        ) : (
          projects.map(p => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="block p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{p.name}</h3>
                  {p.description && (
                    <p className="text-sm text-[var(--muted)] mt-0.5">{p.description}</p>
                  )}
                </div>
                <span className="text-xs text-[var(--muted)] bg-[var(--bg)] px-2 py-1 rounded">
                  {p.tree_count} trees
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
