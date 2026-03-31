'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { TagTreeForm } from '@/components/TagTreeForm';
import { TreeDetail } from '@/components/TreeDetail';
import { ObservationForm } from '@/components/ObservationForm';
import { SearchFilters, SearchParams } from '@/components/SearchFilters';
import { BottomSheet } from '@/components/BottomSheet';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { ProfilePanel } from '@/components/ProfilePanel';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Tree } from '@/types/tree';

const TreeMap = dynamic(() => import('@/components/TreeMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[var(--surface)]" />,
});

export default function Home() {
  const router = useRouter();
  const [trees, setTrees] = useState<Tree[]>([]);
  const [selectedTree, setSelectedTree] = useState<string | null>(null);
  const [observingTree, setObservingTree] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLon, setFormLon] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeFilters, setActiveFilters] = useState<SearchParams>({});
  const [activeTab, setActiveTab] = useState<NavTab>('map');
  const { isOnline, pendingCount, syncing, refreshPendingCount } = useOnlineStatus();
  const { data: session } = useSession();

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

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'map') {
      setShowSearch(false);
      setShowProfile(false);
    } else if (tab === 'search') {
      setShowProfile(false);
      setShowSearch(true);
    } else if (tab === 'projects') {
      router.push('/projects');
    } else if (tab === 'profile') {
      setShowSearch(false);
      setShowProfile(true);
    }
  };

  return (
    <div className="h-dvh relative">
      {/* Offline / syncing banners — float over map */}
      {!isOnline && (
        <div className="fixed top-12 left-4 right-4 z-[800] px-4 py-1.5 bg-yellow-600/90 text-black text-xs text-center rounded-lg backdrop-blur">
          Offline — changes saved locally
        </div>
      )}
      {syncing && (
        <div className="fixed top-12 left-4 right-4 z-[800] px-4 py-1.5 bg-blue-600/90 text-white text-xs text-center rounded-lg backdrop-blur">
          Syncing...
        </div>
      )}

      {/* Floating pill — app name + tree count */}
      <div className="fixed top-0 left-0 right-0 z-[700] flex justify-center pt-3 pointer-events-none">
        <div className="flex items-center gap-2 px-4 py-2 backdrop-blur rounded-full border border-[var(--border)] pointer-events-auto" style={{ background: 'rgba(26, 26, 26, 0.9)' }}>
          <span className="text-sm font-bold text-[var(--accent)]">Citizen Science</span>
          {trees.length > 0 && (
            <span className="text-xs text-[var(--muted)]">{trees.length}</span>
          )}
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-yellow-600 text-black text-[10px] rounded-full font-medium">
              {pendingCount}
            </span>
          )}
        </div>
      </div>

      {/* Full-screen map */}
      <div className="absolute inset-0">
        <TreeMap
          trees={trees}
          userLocation={userLocation}
          onMapClick={handleMapClick}
          onTreeSelect={(id) => setSelectedTree(id)}
          onBoundsChange={fetchTrees}
        />
      </div>

      {/* FAB — Tag Tree */}
      <button
        onClick={handleTagHere}
        className="fixed z-[950] right-4 w-14 h-14 rounded-full bg-[var(--accent)] text-black flex items-center justify-center shadow-lg active:bg-[var(--accent-dim)]"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1rem)' }}
        aria-label="Tag a tree"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Bottom Navigation */}
      <BottomNav
        active={activeTab}
        onTabChange={handleTabChange}
        pendingCount={pendingCount}
      />

      {/* Tag Tree Sheet */}
      <BottomSheet open={showForm} onClose={() => setShowForm(false)}>
        <TagTreeForm
          lat={formLat}
          lon={formLon}
          onSuccess={handleTreeCreated}
          onCancel={() => setShowForm(false)}
        />
      </BottomSheet>

      {/* Tree Detail Sheet */}
      <BottomSheet open={!!selectedTree} onClose={() => setSelectedTree(null)}>
        {selectedTree && (
          <TreeDetail
            treeId={selectedTree}
            onClose={() => setSelectedTree(null)}
            onAddObservation={handleAddObservation}
          />
        )}
      </BottomSheet>

      {/* Observation Form Sheet */}
      <BottomSheet open={!!observingTree} onClose={() => setObservingTree(null)}>
        {observingTree && (
          <ObservationForm
            treeId={observingTree}
            onSuccess={handleObservationCreated}
            onCancel={() => setObservingTree(null)}
          />
        )}
      </BottomSheet>

      {/* Search Filters Sheet */}
      <BottomSheet open={showSearch} onClose={() => { setShowSearch(false); setActiveTab('map'); }}>
        <SearchFilters onSearch={handleSearch} userLocation={userLocation} overlay />
      </BottomSheet>

      {/* Profile Sheet */}
      <BottomSheet open={showProfile} onClose={() => { setShowProfile(false); setActiveTab('map'); }}>
        <ProfilePanel />
      </BottomSheet>
    </div>
  );
}
