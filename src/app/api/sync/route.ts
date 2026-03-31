import { NextRequest, NextResponse } from 'next/server';
import { TreeManager, ObservationManager } from '@/lib/db/trees';
import { query } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const results = { trees: [] as string[], observations: [] as string[], errors: [] as string[] };

    // Sync pending trees
    if (body.trees?.length) {
      for (const treeData of body.trees) {
        try {
          // Idempotency: check if local_id already exists via first observation
          if (treeData.local_id) {
            const existing = await query(
              'SELECT tree_id FROM observations WHERE local_id = $1',
              [treeData.local_id]
            );
            if (existing.rows.length > 0) {
              results.trees.push(existing.rows[0].tree_id);
              continue;
            }
          }

          const tree = await TreeManager.create({
            species: treeData.species,
            species_variety: treeData.species_variety,
            lat: treeData.lat,
            lon: treeData.lon,
            accessibility: treeData.accessibility,
            use_potential: treeData.use_potential,
            notes: treeData.notes,
          });

          // Create initial observation with local_id for idempotency
          if (treeData.health || treeData.trunk_width || treeData.phenology) {
            await ObservationManager.create({
              tree_id: tree.id,
              health: treeData.health,
              trunk_width: treeData.trunk_width,
              phenology: treeData.phenology,
              notes: treeData.observation_notes,
              local_id: treeData.local_id,
            });
          }

          results.trees.push(tree.id);
        } catch (err) {
          results.errors.push(`Tree sync failed: ${(err as Error).message}`);
        }
      }
    }

    // Sync pending observations
    if (body.observations?.length) {
      for (const obsData of body.observations) {
        try {
          if (obsData.local_id) {
            const existing = await query(
              'SELECT id FROM observations WHERE local_id = $1',
              [obsData.local_id]
            );
            if (existing.rows.length > 0) {
              results.observations.push(existing.rows[0].id);
              continue;
            }
          }

          const obs = await ObservationManager.create(obsData);
          results.observations.push(obs.id);
        } catch (err) {
          results.errors.push(`Observation sync failed: ${(err as Error).message}`);
        }
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
  }
}
