'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Tree } from '@/types/tree';

const treeIcon = L.divIcon({
  className: 'tree-marker',
  html: '<div style="width:12px;height:12px;background:#22c55e;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const userIcon = L.divIcon({
  className: 'user-marker',
  html: '<div style="width:14px;height:14px;background:#3b82f6;border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.5)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export type MapStyle = 'standard' | 'satellite' | 'topo';

const TILE_LAYERS: Record<MapStyle, { url: string; attribution: string; maxZoom: number }> = {
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
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
  },
};

interface TreeMapProps {
  trees: Tree[];
  userLocation: [number, number] | null;
  mapStyle?: MapStyle;
  onMapClick: (lat: number, lon: number) => void;
  onTreeSelect: (id: string) => void;
  onBoundsChange: (bounds: { south: number; west: number; north: number; east: number }) => void;
}

export default function TreeMap({ trees, userLocation, mapStyle = 'standard', onMapClick, onTreeSelect, onBoundsChange }: TreeMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
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

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markers = L.layerGroup().addTo(map);
    markersRef.current = markers;

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

  // Switch tile layer when mapStyle changes
  useEffect(() => {
    if (!mapRef.current || !tileRef.current) return;

    const layer = TILE_LAYERS[mapStyle];
    tileRef.current.setUrl(layer.url);
    tileRef.current.options.attribution = layer.attribution;
    tileRef.current.options.maxZoom = layer.maxZoom;
  }, [mapStyle]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLocation);
    } else {
      userMarkerRef.current = L.marker(userLocation, { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup('You are here');
      mapRef.current.setView(userLocation, 14);
    }
  }, [userLocation]);

  // Update tree markers
  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();

    for (const tree of trees) {
      const marker = L.marker([tree.lat, tree.lon], { icon: treeIcon });
      marker.bindPopup(
        `<div style="min-width:120px">
          <strong>${tree.species || 'Unknown'}</strong>
          ${tree.species_variety ? `<br/><span style="color:#888">${tree.species_variety}</span>` : ''}
          <br/><span style="color:#888">${tree.accessibility}</span>
        </div>`
      );
      marker.on('click', () => onTreeSelect(tree.id));
      markersRef.current.addLayer(marker);
    }
  }, [trees, onTreeSelect]);

  return <div ref={containerRef} className="w-full h-full" />;
}
