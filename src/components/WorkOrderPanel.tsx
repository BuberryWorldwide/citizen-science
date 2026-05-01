'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorkOrder } from '@/types/tree';
import { IconCheck, IconCamera, IconMap, IconClipboard, IconLeaf } from '@/components/Icons';

export interface QuestContext {
  orderId: string;
  orderType: string;
  expectedPhase?: string;
  questText?: { verb: string; lookFor: string; tip: string };
  rewardPoints: number;
}

interface WorkOrderPanelProps {
  userLocation: [number, number] | null;
  onSelectTree: (treeId: string, lat: number, lon: number, quest?: QuestContext) => void;
}

type Tab = 'nearby' | 'active' | 'history';

const TYPE_CONFIG: Record<string, { icon: typeof IconCheck; label: string; color: string }> = {
  verify_species:   { icon: IconCheck,    label: 'Verify',    color: 'var(--accent)' },
  add_photo:        { icon: IconCamera,   label: 'Photo',     color: '#fbbf24' },
  confirm_location: { icon: IconMap,      label: 'Location',  color: '#60a5fa' },
  seasonal_update:  { icon: IconClipboard, label: 'Update',   color: '#f97316' },
  check_phenology:  { icon: IconLeaf,     label: 'Phenology', color: '#22c55e' },
};

// Bidirectional radius presets (meters)
const RADIUS_PRESETS: { meters: number; label: string }[] = [
  { meters: 1000,   label: '1km' },
  { meters: 5000,   label: '5km' },
  { meters: 25000,  label: '25km' },
  { meters: 100000, label: '100km' },
  { meters: 500000, label: '500km' },
];
const DEFAULT_RADIUS = 5000;

function formatDistance(meters?: number): string {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function WorkOrderPanel({ userLocation, onSelectTree }: WorkOrderPanelProps) {
  const [tab, setTab] = useState<Tab>('nearby');
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(DEFAULT_RADIUS);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let url: string;
      if (tab === 'active') {
        url = '/api/work-orders/mine?status=active';
      } else if (tab === 'history') {
        url = '/api/work-orders/mine?status=all';
      } else {
        // Nearby — only fetch with location; no global fallback
        if (!userLocation) {
          setOrders([]);
          setLoading(false);
          return;
        }
        const params = new URLSearchParams();
        params.set('lat', String(userLocation[0]));
        params.set('lon', String(userLocation[1]));
        params.set('radius', String(searchRadius));
        params.set('limit', '50');
        url = `/api/work-orders?${params}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        let data: WorkOrder[] = json.data || [];
        if (tab === 'history') {
          // History tab shows completed + ended (not active)
          data = data.filter(o => o.my_state === 'completed' || o.my_state === 'ended');
        }
        setOrders(data);
      }
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
    setBusyId(orderId);
    try {
      const res = await fetch(`/api/work-orders/${orderId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) fetchOrders();
    } catch { /* ignore */ }
    setBusyId(null);
  };

  const handleAbandon = async (orderId: string) => {
    setBusyId(orderId);
    try {
      const res = await fetch(`/api/work-orders/${orderId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) fetchOrders();
    } catch { /* ignore */ }
    setBusyId(null);
  };

  // Empty-state copy varies by tab
  const emptyText =
    tab === 'active' ? 'No active quests. Find some on Nearby.' :
    tab === 'history' ? 'No quest history yet.' :
    !userLocation ? 'Location needed to find quests near you.' :
    `No quests within ${formatDistance(searchRadius)}.`;

  return (
    <div className="p-4 pb-8 safe-area-bottom">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <IconClipboard size={20} />
          Quests
        </h2>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-[var(--bg)] rounded-lg mb-3">
        {(['nearby', 'active', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
              tab === t
                ? 'bg-[var(--surface)] text-[var(--fg)] shadow-sm'
                : 'text-[var(--muted)]'
            }`}
          >
            {t === 'active' ? 'My Quests' : t}
          </button>
        ))}
      </div>

      {/* Radius chips — only on Nearby */}
      {tab === 'nearby' && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {RADIUS_PRESETS.map(p => (
            <button
              key={p.meters}
              onClick={() => setSearchRadius(p.meters)}
              className={`px-3 py-1 text-xs rounded-full border whitespace-nowrap transition-colors ${
                searchRadius === p.meters
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Orders list */}
      {loading ? (
        <div className="text-center text-[var(--muted)] text-sm py-8">Loading quests...</div>
      ) : orders.length === 0 ? (
        <div className="text-center text-[var(--muted)] text-sm py-8">{emptyText}</div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const cfg = TYPE_CONFIG[order.order_type] || TYPE_CONFIG.verify_species;
            const Icon = cfg.icon;
            const dist = formatDistance(order.distance);

            // Row state derives from tab + per-row data
            const isInQueue = tab === 'nearby' && order.claimed_by_me === true;
            const isActiveOwn = tab === 'active'; // every row in this tab is active
            const isEndedRow = order.my_state === 'ended';
            const isCompletedOwnRow = order.my_state === 'completed';

            const rowDimmed = isEndedRow;
            const lat = (order as any).lat ?? order.tree_lat;
            const lon = (order as any).lon ?? order.tree_lon;

            return (
              <button
                key={order.id + ':' + (order.my_state || 'nearby')}
                onClick={() => {
                  if (lat == null || lon == null) return;
                  if (rowDimmed || isCompletedOwnRow) return; // history rows are non-interactive
                  const rd = (order as any).result_data;
                  onSelectTree(order.tree_id, lat, lon, {
                    orderId: order.id,
                    orderType: order.order_type,
                    expectedPhase: rd?.expected_phase,
                    questText: rd?.quest_text,
                    rewardPoints: order.reward_points,
                  });
                }}
                className={`w-full flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg text-left transition-colors ${
                  rowDimmed ? 'opacity-60' : 'active:bg-[var(--bg)]'
                }`}
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
                    {isInQueue && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)] shrink-0">
                        In queue
                      </span>
                    )}
                  </div>
                  {order.order_type === 'check_phenology' && !rowDimmed && (() => {
                    const qt = (order as any).result_data?.quest_text;
                    const verb = typeof qt?.verb === 'string' ? qt.verb : null;
                    const lookFor = typeof qt?.lookFor === 'string' ? qt.lookFor.toLowerCase() : null;
                    if (!verb && !lookFor) return null;
                    return (
                      <div className="text-xs text-[var(--accent)] mt-0.5 truncate">
                        {verb}{verb && lookFor ? ' — ' : ''}{lookFor}
                      </div>
                    );
                  })()}
                  {isEndedRow && (
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      {order.my_removed_reason === 'order_expired'
                        ? 'Expired before completion'
                        : 'Completed by another scout'}
                    </div>
                  )}
                  {isCompletedOwnRow && (
                    <div className="text-xs text-[var(--accent)] mt-0.5">
                      Completed by you · +{order.reward_points} pts
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-0.5">
                    {dist && <span>{dist} away</span>}
                    {!isEndedRow && !isCompletedOwnRow && order.reward_points > 0 && (
                      <span className="text-[var(--warn)]">+{order.reward_points} pts</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {/* Walking directions on actionable rows */}
                  {!rowDimmed && !isCompletedOwnRow && lat != null && lon != null && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-[#3b82f6] text-white rounded-lg text-xs font-medium"
                    >
                      <IconMap size={14} />
                    </a>
                  )}

                  {tab === 'nearby' && !isInQueue && (
                    <button
                      onClick={() => handleClaim(order.id)}
                      disabled={busyId === order.id}
                      className="px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] rounded-lg text-xs font-medium active:bg-[var(--accent)]/10 disabled:opacity-50"
                    >
                      {busyId === order.id ? '...' : 'Claim'}
                    </button>
                  )}
                  {tab === 'nearby' && isInQueue && (
                    <span className="px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-xs font-medium">
                      Go
                    </span>
                  )}
                  {isActiveOwn && (
                    <>
                      <span className="px-3 py-1.5 bg-[var(--accent)] text-black rounded-lg text-xs font-medium">
                        Go
                      </span>
                      <button
                        onClick={() => handleAbandon(order.id)}
                        disabled={busyId === order.id}
                        className="px-2.5 py-1.5 border border-[var(--border)] text-[var(--muted)] rounded-lg text-xs font-medium disabled:opacity-50"
                        aria-label="Remove from queue"
                      >
                        ✕
                      </button>
                    </>
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
