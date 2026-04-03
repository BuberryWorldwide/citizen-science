'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet.heat';
import { Tree } from '@/types/tree';
import { getTreeCategory, getCategoryColor, type TreeCategory } from './Icons';

// ── Custom SVG markers ────────────────────────────────────────

type VerificationViz = 'verified' | 'auto_verified' | 'unverified';

function markerSvg(cat: TreeCategory, verification?: VerificationViz): string {
  const color = getCategoryColor(cat);
  const opacity = verification === 'unverified' ? '0.55' : '0.9';
  const autoVerifiedDot = verification === 'auto_verified'
    ? '<circle cx="14" cy="32" r="3" fill="#60a5fa" stroke="white" stroke-width="1"/>'
    : '';
  return `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z" fill="${color}" opacity="${opacity}"/>
    <circle cx="14" cy="13" r="6" fill="white" opacity="${opacity}"/>
    <circle cx="14" cy="13" r="3.5" fill="${color}" opacity="${opacity}"/>
    ${autoVerifiedDot}
  </svg>`;
}

function getMarkerIcon(species?: string | null, verification?: VerificationViz) {
  const cat = getTreeCategory(species);
  return L.divIcon({
    className: 'custom-tree-marker',
    html: markerSvg(cat, verification),
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: '<div class="user-pulse"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// ── Tile layers (config imported from lib/map-config to avoid SSR issues) ──

import { TILE_LAYERS, DEFAULT_BASE_LAYER } from '@/lib/map-config';
import type { BaseLayer } from '@/lib/map-config';

// ── Overlay types ─────────────────────────────────────────────

export interface MapOverlays {
  heatmap: boolean;
  myTrees: boolean;
  speciesColor: boolean;
}

// ── Component ─────────────────────────────────────────────────

interface TreeMapProps {
  trees: Tree[];
  userLocation: [number, number] | null;
  baseLayer?: BaseLayer;
  overlays?: MapOverlays;
  userId?: string;
  onMapClick: (lat: number, lon: number) => void;
  onTreeSelect: (id: string) => void;
  onBoundsChange: (bounds: { south: number; west: number; north: number; east: number }) => void;
}

export interface TreeMapHandle {
  flyTo: (lat: number, lon: number, zoom?: number) => void;
}

const TreeMap = forwardRef<TreeMapHandle, TreeMapProps>(function TreeMap({
  trees,
  userLocation,
  baseLayer = DEFAULT_BASE_LAYER,
  overlays = { heatmap: false, myTrees: false, speciesColor: true },
  userId,
  onMapClick,
  onTreeSelect,
  onBoundsChange,
}, ref) {
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatRef = useRef<L.HeatLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = userLocation || [35.96, -83.92];

    const map = L.map(containerRef.current, {
      center,
      zoom: 13,
      zoomControl: false,
    });

    const initialLayer = TILE_LAYERS[baseLayer] || TILE_LAYERS[DEFAULT_BASE_LAYER];
    tileRef.current = L.tileLayer(initialLayer.url, {
      attribution: initialLayer.attribution,
      maxZoom: initialLayer.maxZoom,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Cluster group with custom styling
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        const size = count < 10 ? 36 : count < 50 ? 44 : 52;
        return L.divIcon({
          html: `<div class="cluster-icon" style="width:${size}px;height:${size}px"><span>${count}</span></div>`,
          className: 'custom-cluster',
          iconSize: [size, size],
        });
      },
    });
    map.addLayer(cluster);
    clusterRef.current = cluster;

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    map.on('moveend', () => {
      const b = map.getBounds();
      onBoundsChange({
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch base tile layer
  useEffect(() => {
    if (!mapRef.current || !tileRef.current) return;
    const layer = TILE_LAYERS[baseLayer];
    tileRef.current.setUrl(layer.url);
    tileRef.current.options.attribution = layer.attribution;
    tileRef.current.options.maxZoom = layer.maxZoom;
    // Clamp map zoom to the layer's max so tiles don't break
    mapRef.current.setMaxZoom(layer.maxZoom);
    if (mapRef.current.getZoom() > layer.maxZoom) {
      mapRef.current.setZoom(layer.maxZoom);
    }
  }, [baseLayer]);

  // Update heat map layer
  useEffect(() => {
    if (!mapRef.current) return;

    if (heatRef.current) {
      mapRef.current.removeLayer(heatRef.current);
      heatRef.current = null;
    }

    if (overlays.heatmap && trees.length > 0) {
      const points: [number, number, number][] = trees.map(t => [t.lat, t.lon, 0.5]);
      heatRef.current = (L as unknown as { heatLayer: (pts: [number, number, number][], opts: Record<string, unknown>) => L.HeatLayer }).heatLayer(points, {
        radius: 50,
        blur: 30,
        maxZoom: 17,
        minOpacity: 0.3,
        gradient: { 0.15: '#34d399', 0.4: '#fbbf24', 0.7: '#f97316', 1: '#ef4444' },
      }).addTo(mapRef.current);
    }
  }, [trees, overlays.heatmap]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLocation);
    } else {
      userMarkerRef.current = L.marker(userLocation, { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup('<div style="text-align:center;font-size:13px">You are here</div>');
      mapRef.current.setView(userLocation, 14);
    }
  }, [userLocation]);

  // Update tree markers (cluster layer)
  useEffect(() => {
    if (!clusterRef.current) return;
    clusterRef.current.clearLayers();

    // If heatmap is showing, hide individual markers at lower zoom
    // MarkerCluster handles this naturally — show markers always, heat overlay is additive

    let visibleTrees = trees;

    // Filter to "my trees" if overlay is active
    if (overlays.myTrees && userId) {
      visibleTrees = trees.filter(t => t.created_by === userId);
    }

    for (const tree of visibleTrees) {
      const vStatus: VerificationViz =
        tree.verification_status === 'verified' ? 'verified' :
        tree.verification_status === 'auto_verified' ? 'auto_verified' :
        'unverified';
      const icon = overlays.speciesColor
        ? getMarkerIcon(tree.species, vStatus)
        : getMarkerIcon(null, vStatus);

      const cat = getTreeCategory(tree.species);
      const color = getCategoryColor(cat);

      const marker = L.marker([tree.lat, tree.lon], { icon });
      marker.bindPopup(
        `<div style="min-width:140px;font-family:system-ui">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <div style="width:10px;height:10px;border-radius:50%;background:${color}"></div>
            <strong style="font-size:14px">${tree.species || 'Unknown'}</strong>
          </div>
          ${tree.species_variety ? `<div style="font-size:12px;opacity:0.7;margin-bottom:2px">${tree.species_variety}</div>` : ''}
          <div style="font-size:11px;opacity:0.5">${tree.accessibility}</div>
        </div>`
      );
      marker.on('click', () => onTreeSelect(tree.id));
      clusterRef.current!.addLayer(marker);
    }
  }, [trees, overlays.myTrees, overlays.speciesColor, userId, onTreeSelect]);

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lon: number, zoom = 17) => {
      mapRef.current?.flyTo([lat, lon], zoom, { duration: 0.8 });
    },
  }));

  return <div ref={containerRef} className="w-full h-full" />;
});

export default TreeMap;
