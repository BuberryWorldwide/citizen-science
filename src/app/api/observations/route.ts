import { NextRequest, NextResponse } from 'next/server';
import { ObservationManager } from '@/lib/db/trees';
import { PointsManager } from '@/lib/db/points';
import { getCurrentUserId } from '@/lib/auth/session';
import { moderate } from '@/lib/moderation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = await getCurrentUserId();

    if (!body.tree_id) {
      return NextResponse.json({ success: false, error: 'tree_id is required' }, { status: 400 });
    }

    const mod = moderate({ notes: body.notes });
    if (!mod.passed) {
      return NextResponse.json({ success: false, error: `Inappropriate content in ${mod.field}` }, { status: 400 });
    }

    const observation = await ObservationManager.create({
      tree_id: body.tree_id,
      observer_id: userId || body.observer_id || undefined,
      health: body.health,
      trunk_width: body.trunk_width,
      phenology: body.phenology,
      fruit_size: body.fruit_size,
      fruit_sweetness: body.fruit_sweetness,
      fruit_color: body.fruit_color,
      yield: body.yield,
      fruit_quality: body.fruit_quality,
      fruiting_month_start: body.fruiting_month_start,
      fruiting_month_end: body.fruiting_month_end,
      reliability: body.reliability,
      notes: body.notes,
      local_id: body.local_id,
    });

    if (userId) {
      await PointsManager.award(userId, 'observation', observation.id);
    }

    return NextResponse.json({ success: true, data: observation }, { status: 201 });
  } catch (error) {
    console.error('Error creating observation:', error);
    return NextResponse.json({ success: false, error: 'Failed to create observation' }, { status: 500 });
  }
}
