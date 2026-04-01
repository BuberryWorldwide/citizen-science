import { NextResponse } from 'next/server';
import { PointsManager } from '@/lib/db/points';
import { getCurrentUserId } from '@/lib/auth/session';
import { query } from '@/lib/db/connection';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const stats = await PointsManager.getStats(userId);
    const ledger = await PointsManager.getLedger(userId, 20);

    // Get distinct species this user has tagged
    const speciesResult = await query(
      `SELECT DISTINCT species FROM trees WHERE created_by = $1 AND species IS NOT NULL ORDER BY species`,
      [userId]
    );
    const foundSpecies = speciesResult.rows.map((r: { species: string }) => r.species);

    return NextResponse.json({
      success: true,
      data: { stats, recent: ledger, foundSpecies },
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
