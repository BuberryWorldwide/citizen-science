// Map tile layer configuration — separate from TreeMap to avoid Leaflet SSR issues

export type BaseLayer = 'clean' | 'dark' | 'standard' | 'satellite';

export interface TileLayerDef {
  url: string;
  attribution: string;
  maxZoom: number;
  // Deepest zoom for which native tiles exist. Leaflet upscales tiles between
  // maxNativeZoom and maxZoom (slightly blurry, but keeps deep zoom usable).
  maxNativeZoom?: number;
  // Optional labels overlay drawn above the base (Esri canvas splits labels out).
  referenceUrl?: string;
  label: string;
}

// Esri Light/Dark Gray canvas: no API key, clean look. Base has no labels, so a
// matching Reference overlay is layered on top. Native tiles cap at z16, upscaled to 19.
export const TILE_LAYERS: Record<BaseLayer, TileLayerDef> = {
  clean: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    referenceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; OSM contributors',
    maxZoom: 19,
    maxNativeZoom: 16,
    label: 'Clean',
  },
  dark: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    referenceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; OSM contributors',
    maxZoom: 19,
    maxNativeZoom: 16,
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

// Overlay that includes Falling Fruit community data
export interface MapOverlays {
  heatmap: boolean;
  myTrees: boolean;
  speciesColor: boolean;
  community: boolean;
}
