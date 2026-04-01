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
import { BuberryLogo } from '@/components/BuberryLogo';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTheme } from '@/hooks/useTheme';
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
  const { theme, toggle: toggleTheme } = useTheme();
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'topo'>('standard');

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

      {/* Floating header */}
      <div className="fixed top-0 left-0 right-0 z-[700] flex items-center justify-between px-3 pt-3 pointer-events-none">
        {/* Logo pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 backdrop-blur rounded-full border border-[var(--border)] pointer-events-auto" style={{ background: 'var(--pill-bg)' }}>
          <BuberryLogo size={22} />
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

        {/* Controls pill */}
        <div className="flex items-center gap-1 px-1.5 py-1 backdrop-blur rounded-full border border-[var(--border)] pointer-events-auto" style={{ background: 'var(--pill-bg)' }}>
          {/* Map style toggle */}
          {(['standard', 'satellite', 'topo'] as const).map(style => (
            <button
              key={style}
              onClick={() => setMapStyle(style)}
              className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                mapStyle === style
                  ? 'bg-[var(--accent)] text-black'
                  : 'text-[var(--muted)] hover:text-[var(--fg)]'
              }`}
              aria-label={`${style} map`}
            >
              {style === 'standard' ? 'Map' : style === 'satellite' ? 'Sat' : 'Topo'}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-4 bg-[var(--border)] mx-0.5" />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-full text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Full-screen map */}
      <div className="absolute inset-0">
        <TreeMap
          trees={trees}
          userLocation={userLocation}
          mapStyle={mapStyle}
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
