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
import { RewardToast } from '@/components/RewardToast';
import { IconLayers, IconSun, IconMoon, IconHeat, IconUser, IconTree, IconPlus } from '@/components/Icons';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTheme } from '@/hooks/useTheme';
import { Tree } from '@/types/tree';
import type { BaseLayer, MapOverlays } from '@/components/TreeMap';

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
  const [baseLayer, setBaseLayer] = useState<BaseLayer>('standard');
  const [overlays, setOverlays] = useState<MapOverlays>({ heatmap: false, myTrees: false, speciesColor: true });
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [pendingRewards, setPendingRewards] = useState<{
    xpAwarded: number;
    newAchievements: { key: string; title: string; icon: string; description: string }[];
    completedChallenges: string[];
    currentStreak: number;
  } | null>(null);

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

  const handleTreeCreated = (rewards?: unknown) => {
    setShowForm(false);
    refreshPendingCount();
    fetchTrees();
    if (rewards) setPendingRewards(rewards as typeof pendingRewards);
  };

  const handleObservationCreated = (rewards?: unknown) => {
    setObservingTree(null);
    setSelectedTree(null);
    refreshPendingCount();
    if (rewards) setPendingRewards(rewards as typeof pendingRewards);
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

  const toggleOverlay = (key: keyof MapOverlays) => {
    setOverlays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-dvh relative">
      {/* Offline / syncing banners */}
      {!isOnline && (
        <div className="fixed top-14 left-4 right-4 z-[800] px-4 py-2 bg-amber-500/90 text-black text-xs text-center rounded-xl backdrop-blur font-medium">
          Offline — changes saved locally
        </div>
      )}
      {syncing && (
        <div className="fixed top-14 left-4 right-4 z-[800] px-4 py-2 bg-blue-500/90 text-white text-xs text-center rounded-xl backdrop-blur font-medium">
          Syncing...
        </div>
      )}

      {/* Top-left: Logo */}
      <div className="fixed top-3 left-3 z-[700] pointer-events-auto">
        <div
          className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 backdrop-blur rounded-2xl border border-[var(--border)] shadow-sm"
          style={{ background: 'var(--pill-bg)' }}
        >
          <BuberryLogo size={32} />
          <div className="flex flex-col leading-none">
            <span className="text-[11px] font-bold text-[var(--accent)]">Citizen Science</span>
            {trees.length > 0 && (
              <span className="text-[10px] text-[var(--muted)]">{trees.length} trees</span>
            )}
          </div>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-[var(--warn)] text-black text-[10px] rounded-full font-bold ml-1">
              {pendingCount}
            </span>
          )}
        </div>
      </div>

      {/* Top-right: Layer picker + theme (next to zoom) */}
      <div className="fixed top-3 right-14 z-[700] flex items-center gap-1.5 pointer-events-auto">
        <div className="relative">
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className="w-9 h-9 flex items-center justify-center backdrop-blur rounded-xl border border-[var(--border)] shadow-sm transition-colors"
            style={{ background: showLayerPanel ? 'var(--accent)' : 'var(--pill-bg)' }}
            aria-label="Map layers"
          >
            <IconLayers size={18} color={showLayerPanel ? '#000' : undefined} />
          </button>

          {showLayerPanel && (
            <div
              className="absolute top-11 right-0 w-48 backdrop-blur rounded-xl border border-[var(--border)] shadow-lg overflow-hidden animate-bounce-in"
              style={{ background: 'var(--pill-bg)' }}
            >
              {/* Base layers */}
              <div className="p-2 border-b border-[var(--border)]">
                <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider font-semibold px-2 mb-1">Base Map</p>
                {(['standard', 'satellite'] as const).map(layer => (
                  <button
                    key={layer}
                    onClick={() => setBaseLayer(layer)}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs ${
                      baseLayer === layer ? 'text-[var(--accent)] bg-[var(--accent-glow)]' : 'text-[var(--fg)]'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: baseLayer === layer ? 'var(--accent)' : 'var(--border)' }}>
                      {baseLayer === layer && <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                    </span>
                    {layer === 'standard' ? 'Standard' : 'Satellite'}
                  </button>
                ))}
              </div>

              {/* Overlay toggles */}
              <div className="p-2">
                <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider font-semibold px-2 mb-1">Overlays</p>
                {([
                  { key: 'heatmap' as const, label: 'Heat Map', icon: <IconHeat size={14} /> },
                  { key: 'myTrees' as const, label: 'My Trees', icon: <IconUser size={14} /> },
                  { key: 'speciesColor' as const, label: 'Species Color', icon: <IconTree size={14} /> },
                ]).map(item => (
                  <button
                    key={item.key}
                    onClick={() => toggleOverlay(item.key)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-[var(--fg)]"
                  >
                    <span
                      className="w-4 h-4 rounded flex items-center justify-center text-[10px] transition-colors"
                      style={{
                        background: overlays[item.key] ? 'var(--accent)' : 'transparent',
                        border: overlays[item.key] ? 'none' : '1.5px solid var(--border)',
                        color: overlays[item.key] ? '#000' : 'transparent',
                      }}
                    >
                      {overlays[item.key] ? '\u2713' : ''}
                    </span>
                    <span className="opacity-60">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center backdrop-blur rounded-xl border border-[var(--border)] shadow-sm"
          style={{ background: 'var(--pill-bg)' }}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
      </div>

      {/* Full-screen map */}
      <div className="absolute inset-0">
        <TreeMap
          trees={trees}
          userLocation={userLocation}
          baseLayer={baseLayer}
          overlays={overlays}
          userId={session?.user?.id}
          onMapClick={handleMapClick}
          onTreeSelect={(id) => setSelectedTree(id)}
          onBoundsChange={fetchTrees}
        />
      </div>

      {/* FAB — Tag Tree */}
      <button
        onClick={handleTagHere}
        className="fixed z-[950] left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 h-12 rounded-full bg-[var(--accent)] text-black font-bold text-sm shadow-lg active:scale-95 transition-transform animate-pulse-glow"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
        aria-label="Tag a tree"
      >
        <IconPlus size={18} color="#000" />
        Tag a Tree
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

      {/* Reward Toasts */}
      <RewardToast rewards={pendingRewards} onDismiss={() => setPendingRewards(null)} />
    </div>
  );
}
