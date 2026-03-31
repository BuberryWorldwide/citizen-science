'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Tree } from '@/types/tree';

// Fix Leaflet's default icon path issue with bundlers
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

interface TreeMapProps {
  trees: Tree[];
  userLocation: [number, number] | null;
  onMapClick: (lat: number, lon: number) => void;
  onTreeSelect: (id: string) => void;
  onBoundsChange: (bounds: { south: number; west: number; north: number; east: number }) => void;
}

export default function TreeMap({ trees, userLocation, onMapClick, onTreeSelect, onBoundsChange }: TreeMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = userLocation || [35.96, -83.92]; // Default: Knoxville, TN

    const map = L.map(containerRef.current, {
      center,
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM contributors',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control bottom-right
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
