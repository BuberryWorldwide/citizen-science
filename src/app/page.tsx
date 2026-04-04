'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { TagTreeForm } from '@/components/TagTreeForm';
import { TreeDetail } from '@/components/TreeDetail';
import { ObservationForm } from '@/components/ObservationForm';
import { VerificationForm } from '@/components/VerificationForm';
import { WorkOrderPanel } from '@/components/WorkOrderPanel';
import { SearchPanel } from '@/components/SearchPanel';
import { BottomSheet } from '@/components/BottomSheet';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { ProfilePanel } from '@/components/ProfilePanel';
import { BuberryLogo } from '@/components/BuberryLogo';
import { RewardToast } from '@/components/RewardToast';
import { BadgeModal } from '@/components/BadgeModal';
import { AuthPrompt } from '@/components/AuthPrompt';
import Onboarding from '@/components/Onboarding';
import { IconLayers, IconSun, IconMoon, IconHeat, IconUser, IconTree, IconPlus, IconMap } from '@/components/Icons';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTheme } from '@/hooks/useTheme';
import { Tree } from '@/types/tree';
import type { TreeMapHandle } from '@/components/TreeMap';
import { TILE_LAYERS, BASE_LAYER_ORDER, DEFAULT_BASE_LAYER } from '@/lib/map-config';
import type { BaseLayer, MapOverlays } from '@/lib/map-config';

const TreeMap = dynamic(() => import('@/components/TreeMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[var(--surface)]" />,
});

export default function Home() {
  const router = useRouter();
  const [trees, setTrees] = useState<Tree[]>([]);
  const [currentBounds, setCurrentBounds] = useState<{ south: number; west: number; north: number; east: number } | null>(null);
  const [selectedTree, setSelectedTree] = useState<string | null>(null);
  const [observingTree, setObservingTree] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLon, setFormLon] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string | number | undefined>>({});
  const mapRef = useRef<TreeMapHandle>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('map');
  const { isOnline, pendingCount, syncing, refreshPendingCount } = useOnlineStatus();
  const { data: session } = useSession();
  const { theme, toggle: toggleTheme } = useTheme();
  const [baseLayer, setBaseLayerState] = useState<BaseLayer>(DEFAULT_BASE_LAYER);

  // Restore basemap from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('buberry-basemap');
    if (stored && stored in TILE_LAYERS) setBaseLayerState(stored as BaseLayer);
  }, []);

  const setBaseLayer = (layer: BaseLayer) => {
    setBaseLayerState(layer);
    localStorage.setItem('buberry-basemap', layer);
  };
  const [overlays, setOverlays] = useState<MapOverlays>({ heatmap: false, myTrees: false, speciesColor: true, community: false });
  const [ffLocations, setFfLocations] = useState<{ ff_id: number; lat: number; lng: number; species: string }[]>([]);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [pendingRewards, setPendingRewards] = useState<{
    xpAwarded: number;
    newAchievements: { key: string; title: string; icon: string; description: string }[];
    completedChallenges: string[];
    currentStreak: number;
  } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [authBannerDismissed, setAuthBannerDismissed] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [verifyingTree, setVerifyingTree] = useState<{ id: string; species: string | null } | null>(null);
  const [showWorkOrders, setShowWorkOrders] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [badgeToShow, setBadgeToShow] = useState<{ title: string; description: string; icon: string } | null>(null);

  // Show onboarding on first visit
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('buberry-onboarded')) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('buberry-onboarded', '1');
  };

  // Fetch nearby task count for badge
  useEffect(() => {
    if (!session || !userLocation) return;
    const params = new URLSearchParams();
    params.set('lat', String(userLocation[0]));
    params.set('lon', String(userLocation[1]));
    params.set('radius', '10000'); // 10km radius
    fetch(`/api/work-orders?${params}`)
      .then(r => r.json())
      .then(json => { if (json.success && Array.isArray(json.data)) setTaskCount(json.data.length); })
      .catch(() => {});
  }, [session, userLocation]);

  const handleVerify = (treeId: string) => {
    if (!session) { setShowAuthGate(true); return; }
    const tree = trees.find(t => t.id === treeId);
    setSelectedTree(null);
    setVerifyingTree({ id: treeId, species: tree?.species || null });
  };

  const handleVerificationSuccess = () => {
    setVerifyingTree(null);
    fetchTrees();
  };

  const handleWorkOrderSelectTree = (treeId: string, lat: number, lon: number) => {
    // Fly to tree but keep quest panel open
    mapRef.current?.flyTo(lat, lon, 17);
  };

  const fetchTrees = useCallback(async (
    bounds?: { south: number; west: number; north: number; east: number },
    filters?: Record<string, string | number | undefined>,
  ) => {
    if (!navigator.onLine) return;
    if (bounds) setCurrentBounds(bounds);
    const f = filters ?? activeFilters;
    try {
      const params = new URLSearchParams();
      if (f.species) params.set('species', String(f.species));
      if (f.accessibility) params.set('accessibility', String(f.accessibility));
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

      // Fetch Falling Fruit community data if overlay is on
      if (overlays.community && bounds) {
        try {
          const ffParams = new URLSearchParams();
          ffParams.set('sw_lat', String(bounds.south));
          ffParams.set('sw_lng', String(bounds.west));
          ffParams.set('ne_lat', String(bounds.north));
          ffParams.set('ne_lng', String(bounds.east));
          ffParams.set('zoom', '14');
          const ffRes = await fetch(`/api/ff/locations?${ffParams}`);
          const ffJson = await ffRes.json();
          if (ffJson.success) setFfLocations(ffJson.data || []);
        } catch { setFfLocations([]); }
      } else if (!overlays.community) {
        setFfLocations([]);
      }
    } catch (err) {
      console.error('Failed to fetch trees:', err);
    }
  }, [activeFilters, overlays.community]);

  const handleSearch = (filters: Record<string, string | number | undefined>) => {
    setActiveFilters(filters);
    fetchTrees(undefined, filters);
  };

  const handleSearchSelectTree = (tree: Tree) => {
    mapRef.current?.flyTo(tree.lat, tree.lon, 17);
    setShowSearch(false);
    // Open tree detail after a short delay for the fly animation
    setTimeout(() => setSelectedTree(tree.id), 500);
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
    if (!session) { setShowAuthGate(true); return; }
    if (userLocation) {
      setFormLat(userLocation[0]);
      setFormLon(userLocation[1]);
    }
    setShowForm(true);
  };

  const handleMapClick = (lat: number, lon: number) => {
    if (!session) { setShowAuthGate(true); return; }
    setFormLat(lat);
    setFormLon(lon);
    setShowForm(true);
  };

  const processRewards = (rewards: unknown) => {
    if (!rewards) return;
    const r = rewards as typeof pendingRewards;
    setPendingRewards(r);
    // Show badge modal for the first new achievement
    if (r?.newAchievements?.length) {
      const first = r.newAchievements[0];
      setBadgeToShow({ title: first.title, description: first.description, icon: first.icon });
    }
  };

  const handleTreeCreated = (rewards?: unknown) => {
    setShowForm(false);
    refreshPendingCount();
    fetchTrees();
    processRewards(rewards);
  };

  const handleObservationCreated = (rewards?: unknown) => {
    setObservingTree(null);
    setSelectedTree(null);
    refreshPendingCount();
    processRewards(rewards);
  };

  const handleAddObservation = (treeId: string) => {
    if (!session) { setShowAuthGate(true); return; }
    setSelectedTree(null);
    setObservingTree(treeId);
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'map') {
      setShowSearch(false);
      setShowProfile(false);
      setShowWorkOrders(false);
    } else if (tab === 'search') {
      setShowProfile(false);
      setShowWorkOrders(false);
      setShowSearch(true);
    } else if (tab === 'quests') {
      setShowSearch(false);
      setShowProfile(false);
      setShowWorkOrders(true);
    } else if (tab === 'profile') {
      setShowSearch(false);
      setShowWorkOrders(false);
      setShowProfile(true);
    }
  };

  const toggleOverlay = (key: keyof MapOverlays) => {
    setOverlays(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'community' && next.community && currentBounds) {
        fetchTrees(currentBounds);
      } else if (key === 'community' && !next.community) {
        setFfLocations([]);
      }
      return next;
    });
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
                {BASE_LAYER_ORDER.map(layer => (
                  <button
                    key={layer}
                    onClick={() => { setBaseLayer(layer); setShowLayerPanel(false); }}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs ${
                      baseLayer === layer ? 'text-[var(--accent)] bg-[var(--accent-glow)]' : 'text-[var(--fg)]'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: baseLayer === layer ? 'var(--accent)' : 'var(--border)' }}>
                      {baseLayer === layer && <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                    </span>
                    {TILE_LAYERS[layer].label}
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
                  { key: 'community' as const, label: 'Community Trees', icon: <IconMap size={14} /> },
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
          ref={mapRef}
          trees={trees}
          ffLocations={ffLocations}
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
        questCount={taskCount}
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
            onVerify={handleVerify}
            currentUserId={session?.user?.id || null}
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

      {/* Search Panel */}
      <BottomSheet open={showSearch} onClose={() => { setShowSearch(false); setActiveTab('map'); }}>
        <SearchPanel
          trees={trees}
          userLocation={userLocation}
          onSelectTree={handleSearchSelectTree}
          onFilterChange={handleSearch}
        />
      </BottomSheet>

      {/* Profile Sheet */}
      <BottomSheet open={showProfile} onClose={() => { setShowProfile(false); setActiveTab('map'); }}>
        <ProfilePanel />
      </BottomSheet>

      {/* Verification Form Sheet */}
      <BottomSheet open={!!verifyingTree} onClose={() => setVerifyingTree(null)}>
        {verifyingTree && (
          <VerificationForm
            treeId={verifyingTree.id}
            species={verifyingTree.species}
            onSuccess={handleVerificationSuccess}
            onCancel={() => setVerifyingTree(null)}
          />
        )}
      </BottomSheet>

      {/* Quests Sheet */}
      <BottomSheet open={showWorkOrders} onClose={() => { setShowWorkOrders(false); setActiveTab('map'); }}>
        <WorkOrderPanel
          userLocation={userLocation}
          onSelectTree={handleWorkOrderSelectTree}
        />
      </BottomSheet>

      {/* Auth gate sheet */}
      <BottomSheet open={showAuthGate} onClose={() => setShowAuthGate(false)}>
        <AuthPrompt variant="gate" />
      </BottomSheet>

      {/* Auth banner — floating prompt for unauthenticated users */}
      {!session && !authBannerDismissed && !showOnboarding && !showAuthGate && (
        <AuthPrompt variant="banner" onDismiss={() => setAuthBannerDismissed(true)} />
      )}

      {/* Onboarding — first visit walkthrough */}
      {showOnboarding && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      {/* Reward Toasts */}
      <RewardToast rewards={pendingRewards} onDismiss={() => setPendingRewards(null)} />

      {/* Badge Modal */}
      <BadgeModal
        badge={badgeToShow}
        onClose={() => setBadgeToShow(null)}
        onViewAll={() => { setBadgeToShow(null); setShowProfile(true); setActiveTab('profile'); }}
      />
    </div>
  );
}
