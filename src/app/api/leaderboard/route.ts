import { NextResponse } from 'next/server';
import { PointsManager } from '@/lib/db/points';

export async function GET() {
  try {
    const leaderboard = await PointsManager.getLeaderboard(20);
    return NextResponse.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
