import { NextRequest, NextResponse } from 'next/server';
import { TreeManager, ObservationManager } from '@/lib/db/trees';
import { PointsManager } from '@/lib/db/points';
import { getCurrentUserId } from '@/lib/auth/session';
import { query } from '@/lib/db/connection';
import { moderate } from '@/lib/moderation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = await getCurrentUserId();
    const results = { trees: [] as string[], observations: [] as string[], errors: [] as string[] };

    // Sync pending trees
    if (body.trees?.length) {
      for (const treeData of body.trees) {
        try {
          const mod = moderate({ species_variety: treeData.species_variety, notes: treeData.notes, observation_notes: treeData.observation_notes });
          if (!mod.passed) {
            results.errors.push(`Tree rejected: inappropriate content in ${mod.field}`);
            continue;
          }

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
            created_by: userId || undefined,
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

          if (userId) await PointsManager.award(userId, 'tree_tagged', tree.id);
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
          const mod = moderate({ notes: obsData.notes });
          if (!mod.passed) {
            results.errors.push(`Observation rejected: inappropriate content in ${mod.field}`);
            continue;
          }

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

          const obs = await ObservationManager.create({ ...obsData, observer_id: userId || obsData.observer_id });
          if (userId) await PointsManager.award(userId, 'observation', obs.id);
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
