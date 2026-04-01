import { NextResponse } from 'next/server';
import { StreakManager } from '@/lib/db/streaks';
import { getCurrentUserId } from '@/lib/auth/session';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    const streak = await StreakManager.getStreak(userId);
    return NextResponse.json({ success: true, data: streak });
  } catch (error) {
    console.error('Error fetching streak:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch streak' }, { status: 500 });
  }
}
