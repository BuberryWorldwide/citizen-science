'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet.heat';
import { Tree } from '@/types/tree';
import { getTreeCategory, getCategoryColor, type TreeCategory } from './Icons';

// ── Custom SVG markers ────────────────────────────────────────

function markerSvg(cat: TreeCategory): string {
  const color = getCategoryColor(cat);
  // Simple pin with category-colored dot
  return `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z" fill="${color}" opacity="0.9"/>
    <circle cx="14" cy="13" r="6" fill="white" opacity="0.9"/>
    <circle cx="14" cy="13" r="3.5" fill="${color}"/>
  </svg>`;
}

function getMarkerIcon(species?: string | null) {
  const cat = getTreeCategory(species);
  return L.divIcon({
    className: 'custom-tree-marker',
    html: markerSvg(cat),
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

// ── Tile layers ───────────────────────────────────────────────

export type BaseLayer = 'standard' | 'satellite';

const TILE_LAYERS: Record<BaseLayer, { url: string; attribution: string; maxZoom: number }> = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OSM contributors',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
};

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

export default function TreeMap({
  trees,
  userLocation,
  baseLayer = 'standard',
  overlays = { heatmap: false, myTrees: false, speciesColor: true },
  userId,
  onMapClick,
  onTreeSelect,
  onBoundsChange,
}: TreeMapProps) {
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

    const layer = TILE_LAYERS.standard;
    tileRef.current = L.tileLayer(layer.url, {
      attribution: layer.attribution,
      maxZoom: layer.maxZoom,
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
        radius: 25,
        blur: 15,
        maxZoom: 16,
        gradient: { 0.2: '#34d399', 0.5: '#fbbf24', 0.8: '#f97316', 1: '#ef4444' },
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
      const icon = overlays.speciesColor
        ? getMarkerIcon(tree.species)
        : getMarkerIcon(null); // uniform gray markers

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

  return <div ref={containerRef} className="w-full h-full" />;
}
