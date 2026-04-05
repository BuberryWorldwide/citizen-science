'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorkOrder } from '@/types/tree';
import { IconCheck, IconCamera, IconMap, IconClipboard, IconLeaf } from '@/components/Icons';

interface WorkOrderPanelProps {
  userLocation: [number, number] | null;
  onSelectTree: (treeId: string, lat: number, lon: number) => void;
}

type Tab = 'nearby' | 'mine';

const TYPE_CONFIG: Record<string, { icon: typeof IconCheck; label: string; color: string }> = {
  verify_species:   { icon: IconCheck,    label: 'Verify',    color: 'var(--accent)' },
  add_photo:        { icon: IconCamera,   label: 'Photo',     color: '#fbbf24' },
  confirm_location: { icon: IconMap,      label: 'Location',  color: '#60a5fa' },
  seasonal_update:  { icon: IconClipboard, label: 'Update',   color: '#f97316' },
  check_phenology:  { icon: IconLeaf,     label: 'Phenology', color: '#22c55e' },
};

function formatDistance(meters?: number): string {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function WorkOrderPanel({ userLocation, onSelectTree }: WorkOrderPanelProps) {
  const [tab, setTab] = useState<Tab>('nearby');
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(100000); // 100km default

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let url: string;
      if (tab === 'mine') {
        url = '/api/work-orders/mine';
      } else {
        const params = new URLSearchParams();
        if (userLocation) {
          params.set('lat', String(userLocation[0]));
          params.set('lon', String(userLocation[1]));
          params.set('radius', String(searchRadius));
        }
        params.set('limit', '50');
        url = `/api/work-orders?${params}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setOrders(json.data || []);
    } catch (err) {
      console.error('Failed to fetch work orders:', err);
    } finally {
      setLoading(false);
    }
  }, [tab, userLocation, searchRadius]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleClaim = async (orderId: string) => {
    setClaiming(orderId);
    try {
      const res = await fetch(`/api/work-orders/${orderId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) {
        fetchOrders();
      }
    } catch { /* ignore */ }
    setClaiming(null);
  };

  return (
    <div className="p-4 pb-8 safe-area-bottom">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <IconClipboard size={20} />
          Quests
        </h2>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-[var(--bg)] rounded-lg mb-4">
        <button
          onClick={() => setTab('nearby')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'nearby'
              ? 'bg-[var(--surface)] text-[var(--fg)] shadow-sm'
              : 'text-[var(--muted)]'
          }`}
        >
          Nearby
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'mine'
              ? 'bg-[var(--surface)] text-[var(--fg)] shadow-sm'
              : 'text-[var(--muted)]'
          }`}
        >
          My Quests
        </button>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="text-center text-[var(--muted)] text-sm py-8">Loading quests...</div>
      ) : orders.length === 0 ? (
        <div className="text-center text-[var(--muted)] text-sm py-8 space-y-3">
          <p>{tab === 'mine' ? 'No claimed quests yet.' : `No quests within ${Math.round(searchRadius / 1000)}km.`}</p>
          {tab === 'nearby' && searchRadius < 500000 && (
            <button
              onClick={() => setSearchRadius(prev => prev * 5)}
              className="px-4 py-2 border border-[var(--border)] rounded-lg text-xs text-[var(--accent)]"
            >
              Search wider area
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const cfg = TYPE_CONFIG[order.order_type] || TYPE_CONFIG.verify_species;
            const Icon = cfg.icon;
            const isClaimed = order.status === 'claimed';
            const dist = formatDistance(order.distance);

            return (
              <button
                key={order.id}
                onClick={() => {
                  const lat = (order as any).lat ?? order.tree_lat;
                  const lon = (order as any).lon ?? order.tree_lon;
                  if (lat != null && lon != null) {
                    onSelectTree(order.tree_id, lat, lon);
                  }
                }}
                className="w-full flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg text-left active:bg-[var(--bg)] transition-colors"
              >
                {/* Type icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in srgb, ${cfg.color} 15%, transparent)` }}
                >
                  <Icon size={18} color={cfg.color} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">
                      {(order as any).species || order.tree_species || 'Unknown Tree'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] text-[var(--muted)] shrink-0">
                      {cfg.label}
                    </span>
                  </div>
                  {order.order_type === 'check_phenology' && (order as any).result_data?.quest_text && (
                    <div className="text-xs text-[var(--accent)] mt-0.5 truncate">
                      {(order as any).result_data.quest_text.verb} — {(order as any).result_data.quest_text.lookFor.toLowerCase()}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-0.5">
                    {dist && <span>{dist} away</span>}
                    {order.reward_points > 0 && (
                      <span className="text-[var(--warn)]">+{order.reward_points} pts</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const lat = (order as any).lat ?? order.tree_lat;
                    const lon = (order as any).lon ?? order.tree_lon;
                    return lat != null && lon != null ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-[#3b82f6] text-white rounded-lg text-xs font-medium"
                      >
                        <IconMap size={14} />
                      </a>
                    ) : null;
                  })()}
                  {isClaimed ? (
                    <span className="px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-xs font-medium">
                      Go
                    </span>
                  ) : (
                    <button
                      onClick={() => handleClaim(order.id)}
                      disabled={claiming === order.id}
                      className="px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-lg text-xs font-medium active:bg-[var(--accent)]/10 disabled:opacity-50"
                    >
                      {claiming === order.id ? '...' : 'Claim'}
                    </button>
                  )}
                </div>
              </button>
            );
          })}
          {tab === 'nearby' && searchRadius < 500000 && (
            <button
              onClick={() => setSearchRadius(prev => prev * 3)}
              className="w-full py-2 text-xs text-[var(--muted)] text-center mt-2"
            >
              Showing within {Math.round(searchRadius / 1000)}km · Tap to expand
            </button>
          )}
        </div>
      )}
    </div>
  );
}
