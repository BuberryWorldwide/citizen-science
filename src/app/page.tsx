'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { TagTreeForm } from '@/components/TagTreeForm';
import { TreeDetail } from '@/components/TreeDetail';
import { ObservationForm } from '@/components/ObservationForm';
import { SearchFilters, SearchParams } from '@/components/SearchFilters';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Tree } from '@/types/tree';

const TreeMap = dynamic(() => import('@/components/TreeMap'), { ssr: false });

export default function Home() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [selectedTree, setSelectedTree] = useState<string | null>(null);
  const [observingTree, setObservingTree] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLon, setFormLon] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeFilters, setActiveFilters] = useState<SearchParams>({});
  const { isOnline, pendingCount, syncing, refreshPendingCount } = useOnlineStatus();

  const fetchTrees = useCallback(async (
    bounds?: { south: number; west: number; north: number; east: number },
    filters?: SearchParams,
  ) => {
    if (!navigator.onLine) return;
    const f = filters ?? activeFilters;
    try {
      const params = new URLSearchParams();
      if (f.species) params.set('species', f.species);
      if (f.accessibility) params.set('accessibility', f.accessibility);
      if (f.lat && f.lon && f.radius) {
        params.set('lat', String(f.lat));
        params.set('lon', String(f.lon));
        params.set('radius', String(f.radius));
      } else if (bounds) {
        params.set('south', String(bounds.south));
        params.set('west', String(bounds.west));
        params.set('north', String(bounds.north));
        params.set('east', String(bounds.east));
      }
      const res = await fetch(`/api/trees?${params}`);
      const json = await res.json();
      if (json.success) setTrees(json.data);
    } catch (err) {
      console.error('Failed to fetch trees:', err);
    }
  }, [activeFilters]);

  const handleSearch = (filters: SearchParams) => {
    setActiveFilters(filters);
    fetchTrees(undefined, filters);
  };

  useEffect(() => {
    fetchTrees();
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => console.log('Geolocation denied, using default center')
      );
    }
  }, [fetchTrees]);

  const handleTagHere = () => {
    if (userLocation) {
      setFormLat(userLocation[0]);
      setFormLon(userLocation[1]);
    }
    setShowForm(true);
  };

  const handleMapClick = (lat: number, lon: number) => {
    setFormLat(lat);
    setFormLon(lon);
    setShowForm(true);
  };

  const handleTreeCreated = () => {
    setShowForm(false);
    refreshPendingCount();
    fetchTrees();
  };

  const handleObservationCreated = () => {
    setObservingTree(null);
    setSelectedTree(null);
    refreshPendingCount();
  };

  const handleAddObservation = (treeId: string) => {
    setSelectedTree(null);
    setObservingTree(treeId);
  };

  return (
    <div className="h-dvh flex flex-col">
      {/* Offline banner */}
      {!isOnline && (
        <div className="px-4 py-1.5 bg-yellow-600/20 text-yellow-400 text-xs text-center">
          Offline — changes saved locally
        </div>
      )}
      {syncing && (
        <div className="px-4 py-1.5 bg-blue-600/20 text-blue-400 text-xs text-center">
          Syncing...
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-[var(--accent)]">Citizen Science</h1>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-yellow-600 text-black text-xs rounded-full font-medium">
              {pendingCount}
            </span>
          )}
          {trees.length > 0 && (
            <span className="text-xs text-[var(--muted)]">{trees.length} trees</span>
          )}
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/export?format=csv${activeFilters.species ? `&species=${activeFilters.species}` : ''}`}
            className="px-2 py-1.5 border border-[var(--border)] text-[var(--muted)] rounded-lg text-xs active:bg-[var(--border)]"
            download
          >
            Export
          </a>
          <button
            onClick={handleTagHere}
            className="px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-sm font-medium active:bg-[var(--accent-dim)]"
          >
            + Tag Tree
          </button>
        </div>
      </header>

      {/* Search */}
      <SearchFilters onSearch={handleSearch} userLocation={userLocation} />

      {/* Map */}
      <div className="flex-1 relative">
        <TreeMap
          trees={trees}
          userLocation={userLocation}
          onMapClick={handleMapClick}
          onTreeSelect={(id) => setSelectedTree(id)}
          onBoundsChange={fetchTrees}
        />
      </div>

      {/* Tag Tree Form */}
      {showForm && (
        <div className="fixed inset-0 z-[1000] bg-black/50" onClick={() => setShowForm(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-[var(--surface)] rounded-t-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto mt-3 mb-2" />
            <TagTreeForm
              lat={formLat}
              lon={formLon}
              onSuccess={handleTreeCreated}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Tree Detail */}
      {selectedTree && (
        <div className="fixed inset-0 z-[1000] bg-black/50" onClick={() => setSelectedTree(null)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-[var(--surface)] rounded-t-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto mt-3 mb-2" />
            <TreeDetail
              treeId={selectedTree}
              onClose={() => setSelectedTree(null)}
              onAddObservation={handleAddObservation}
            />
          </div>
        </div>
      )}

      {/* Observation Form */}
      {observingTree && (
        <div className="fixed inset-0 z-[1000] bg-black/50" onClick={() => setObservingTree(null)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-[var(--surface)] rounded-t-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto mt-3 mb-2" />
            <ObservationForm
              treeId={observingTree}
              onSuccess={handleObservationCreated}
              onCancel={() => setObservingTree(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
