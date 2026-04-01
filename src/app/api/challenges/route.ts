import { NextResponse } from 'next/server';
import { ChallengeManager } from '@/lib/db/challenges';
import { getCurrentUserId } from '@/lib/auth/session';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Auto-generate challenges if needed
    await ChallengeManager.generateWeeklyChallenges();

    const challenges = await ChallengeManager.getActiveChallenges(userId);
    return NextResponse.json({ success: true, data: challenges });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch challenges' }, { status: 500 });
  }
}
