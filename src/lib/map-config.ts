// Map tile layer configuration — separate from TreeMap to avoid Leaflet SSR issues

export type BaseLayer = 'clean' | 'dark' | 'standard' | 'satellite';

export interface TileLayerDef {
  url: string;
  attribution: string;
  maxZoom: number;
  label: string;
}

export const TILE_LAYERS: Record<BaseLayer, TileLayerDef> = {
  clean: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
    label: 'Clean',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
    label: 'Dark',
  },
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors',
    maxZoom: 19,
    label: 'Standard',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
    label: 'Satellite',
  },
};

export const BASE_LAYER_ORDER: BaseLayer[] = ['clean', 'dark', 'standard', 'satellite'];
export const DEFAULT_BASE_LAYER: BaseLayer = 'clean';
