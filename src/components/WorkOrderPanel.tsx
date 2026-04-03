'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorkOrder } from '@/types/tree';
import { IconCheck, IconCamera, IconMap, IconClipboard } from '@/components/Icons';

interface WorkOrderPanelProps {
  userLocation: [number, number] | null;
  onSelectTree: (treeId: string, lat: number, lon: number) => void;
}

type Tab = 'nearby' | 'mine';

const TYPE_CONFIG: Record<string, { icon: typeof IconCheck; label: string; color: string }> = {
  verify_species:   { icon: IconCheck,  label: 'Verify',   color: 'var(--accent)' },
  add_photo:        { icon: IconCamera, label: 'Photo',    color: '#fbbf24' },
  confirm_location: { icon: IconMap,    label: 'Location', color: '#60a5fa' },
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
        }
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
  }, [tab, userLocation]);

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
          Tasks
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
          Nearby Tasks
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'mine'
              ? 'bg-[var(--surface)] text-[var(--fg)] shadow-sm'
              : 'text-[var(--muted)]'
          }`}
        >
          My Tasks
        </button>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="text-center text-[var(--muted)] text-sm py-8">Loading tasks...</div>
      ) : orders.length === 0 ? (
        <div className="text-center text-[var(--muted)] text-sm py-8">
          {tab === 'mine' ? 'No claimed tasks yet.' : 'No tasks available nearby.'}
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
                  if (order.tree_lat != null && order.tree_lon != null) {
                    onSelectTree(order.tree_id, order.tree_lat, order.tree_lon);
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
                      {order.tree_species || 'Unknown Tree'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] text-[var(--muted)] shrink-0">
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-0.5">
                    {dist && <span>{dist} away</span>}
                    {order.reward_points > 0 && (
                      <span className="text-[var(--warn)]">+{order.reward_points} pts</span>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
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
        </div>
      )}
    </div>
  );
}
