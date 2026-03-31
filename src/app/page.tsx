'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { TagTreeForm } from '@/components/TagTreeForm';
import { TreeDetail } from '@/components/TreeDetail';
import { Tree } from '@/types/tree';

// Leaflet must be loaded client-side only
const TreeMap = dynamic(() => import('@/components/TreeMap'), { ssr: false });

export default function Home() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [selectedTree, setSelectedTree] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLon, setFormLon] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const fetchTrees = useCallback(async (bounds?: { south: number; west: number; north: number; east: number }) => {
    try {
      const params = new URLSearchParams();
      if (bounds) {
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
  }, []);

  useEffect(() => {
    fetchTrees();
    // Get user location
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
    fetchTrees();
  };

  return (
    <div className="h-dvh flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <h1 className="text-lg font-bold text-[var(--accent)]">Citizen Science</h1>
        <div className="flex gap-2">
          <button
            onClick={handleTagHere}
            className="px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-sm font-medium active:bg-[var(--accent-dim)]"
          >
            + Tag Tree
          </button>
        </div>
      </header>

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

      {/* Tag Tree Form (slide-up panel) */}
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

      {/* Tree Detail (slide-up panel) */}
      {selectedTree && (
        <div className="fixed inset-0 z-[1000] bg-black/50" onClick={() => setSelectedTree(null)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-[var(--surface)] rounded-t-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto mt-3 mb-2" />
            <TreeDetail treeId={selectedTree} onClose={() => setSelectedTree(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
