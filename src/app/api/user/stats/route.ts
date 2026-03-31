import { NextResponse } from 'next/server';
import { PointsManager } from '@/lib/db/points';
import { getCurrentUserId } from '@/lib/auth/session';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const stats = await PointsManager.getStats(userId);
    const ledger = await PointsManager.getLedger(userId, 20);

    return NextResponse.json({ success: true, data: { stats, recent: ledger } });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
