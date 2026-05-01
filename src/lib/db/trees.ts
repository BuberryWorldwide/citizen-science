import { query } from './connection';
import { Tree, Observation, TreeWithObservations, CreateTreeInput, CreateObservationInput } from '@/types/tree';

export const TreeManager = {
  async create(input: CreateTreeInput): Promise<Tree> {
    const result = await query(
      `INSERT INTO trees (species, species_variety, location, lat, lon, accessibility, status, use_potential, created_by, notes)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.species, input.species_variety,
        input.lat, input.lon,
        input.accessibility || 'unknown',
        input.status || 'active',
        input.use_potential || [],
        input.created_by || null,
        input.notes || null,
      ]
    );
    return result.rows[0];
  },

  async getById(id: string): Promise<TreeWithObservations | null> {
    const treeResult = await query('SELECT * FROM trees WHERE id = $1', [id]);
    if (treeResult.rows.length === 0) return null;

    const obsResult = await query(
      'SELECT * FROM observations WHERE tree_id = $1 ORDER BY observed_at DESC',
      [id]
    );
    const photoResult = await query(
      `SELECT op.* FROM observation_photos op
       JOIN observations o ON o.id = op.observation_id
       WHERE o.tree_id = $1`,
      [id]
    );

    const photosByObs = new Map<string, typeof photoResult.rows>();
    for (const photo of photoResult.rows) {
      const existing = photosByObs.get(photo.observation_id) || [];
      existing.push(photo);
      photosByObs.set(photo.observation_id, existing);
    }

    return {
      ...treeResult.rows[0],
      observations: obsResult.rows.map((obs: Observation) => ({
        ...obs,
        photos: photosByObs.get(obs.id) || [],
      })),
    };
  },

  async search(filters: {
    species?: string;
    bbox?: { south: number; west: number; north: number; east: number };
    lat?: number;
    lon?: number;
    radius?: number; // meters
    accessibility?: string;
    limit?: number;
  }): Promise<Tree[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters.species) {
      conditions.push(`species ILIKE $${paramIdx}`);
      params.push(`%${filters.species}%`);
      paramIdx++;
    }

    if (filters.accessibility) {
      conditions.push(`accessibility = $${paramIdx}`);
      params.push(filters.accessibility);
      paramIdx++;
    }

    if (filters.bbox) {
      conditions.push(
        `ST_Intersects(location, ST_MakeEnvelope($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, 4326)::geography)`
      );
      params.push(filters.bbox.west, filters.bbox.south, filters.bbox.east, filters.bbox.north);
      paramIdx += 4;
    } else if (filters.lat !== undefined && filters.lon !== undefined) {
      const radius = filters.radius || 5000;
      conditions.push(
        `ST_DWithin(location, ST_SetSRID(ST_MakePoint($${paramIdx + 1}, $${paramIdx}), 4326)::geography, $${paramIdx + 2})`
      );
      params.push(filters.lat, filters.lon, radius);
      paramIdx += 3;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 500;

    const result = await query(
      `SELECT * FROM trees ${where} ORDER BY created_at DESC LIMIT $${paramIdx}`,
      [...params, limit]
    );
    return result.rows;
  },

  async update(id: string, updates: Partial<CreateTreeInput>): Promise<Tree | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    const allowed = ['species', 'species_variety', 'accessibility', 'status', 'use_potential', 'notes'] as const;
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${paramIdx}`);
        params.push(updates[key]);
        paramIdx++;
      }
    }

    if (updates.lat !== undefined && updates.lon !== undefined) {
      fields.push(`lat = $${paramIdx}`, `lon = $${paramIdx + 1}`);
      fields.push(`location = ST_SetSRID(ST_MakePoint($${paramIdx + 1}, $${paramIdx}), 4326)::geography`);
      params.push(updates.lat, updates.lon);
      paramIdx += 2;
    }

    if (fields.length === 0) return null;

    fields.push('updated_at = NOW()');
    params.push(id);

    const result = await query(
      `UPDATE trees SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );
    return result.rows[0] || null;
  },
};

export const ObservationManager = {
  async create(input: CreateObservationInput): Promise<Observation> {
    const result = await query(
      `INSERT INTO observations (tree_id, observer_id, health, trunk_width, phenology,
         fruit_size, fruit_sweetness, fruit_color, yield, fruit_quality,
         fruiting_month_start, fruiting_month_end, reliability, notes, synced, local_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        input.tree_id, input.observer_id || null,
        input.health || null, input.trunk_width || null, input.phenology || null,
        input.fruit_size || null, input.fruit_sweetness || null, input.fruit_color || null,
        input.yield || null, input.fruit_quality || null,
        input.fruiting_month_start || null, input.fruiting_month_end || null,
        input.reliability || null, input.notes || null,
        input.synced ?? true, input.local_id || null,
      ]
    );
    return result.rows[0];
  },
};
