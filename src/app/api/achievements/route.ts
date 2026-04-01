import { NextResponse } from 'next/server';
import { AchievementManager } from '@/lib/db/achievements';
import { getCurrentUserId } from '@/lib/auth/session';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    const achievements = await AchievementManager.getUserAchievements(userId);
    return NextResponse.json({ success: true, data: achievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch achievements' }, { status: 500 });
  }
}
