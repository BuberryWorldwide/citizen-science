export interface Tree {
  id: string;
  species: string | null;
  species_variety: string | null;
  lat: number;
  lon: number;
  accessibility: string;
  status: string;
  use_potential: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  ushahidi_post_id: number | null;
  notes: string | null;
}

export interface Observation {
  id: string;
  tree_id: string;
  observer_id: string | null;
  observed_at: string;
  health: string | null;
  trunk_width: string | null;
  phenology: string | null;
  fruit_size: string | null;
  fruit_sweetness: string | null;
  fruit_color: string | null;
  yield: string | null;
  fruit_quality: string | null;
  fruiting_month_start: number | null;
  fruiting_month_end: number | null;
  reliability: string | null;
  notes: string | null;
  synced: boolean;
  local_id: string | null;
  photos?: ObservationPhoto[];
}

export interface ObservationPhoto {
  id: string;
  observation_id: string;
  storage_key: string;
  url: string | null;
  caption: string | null;
  synced: boolean;
  local_id: string | null;
}

export interface TreeWithObservations extends Tree {
  observations: Observation[];
}

export interface CreateTreeInput {
  species?: string;
  species_variety?: string;
  lat: number;
  lon: number;
  accessibility?: string;
  status?: string;
  use_potential?: string[];
  created_by?: string;
  notes?: string;
}

export interface CreateObservationInput {
  tree_id: string;
  observer_id?: string;
  health?: string;
  trunk_width?: string;
  phenology?: string;
  fruit_size?: string;
  fruit_sweetness?: string;
  fruit_color?: string;
  yield?: string;
  fruit_quality?: string;
  fruiting_month_start?: number;
  fruiting_month_end?: number;
  reliability?: string;
  notes?: string;
  synced?: boolean;
  local_id?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
