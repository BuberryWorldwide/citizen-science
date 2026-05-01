import { AchievementDef, AchievementManager } from './achievements';
import { StreakManager } from './streaks';
import { ChallengeManager } from './challenges';

export interface GamificationEvent {
  newAchievements: AchievementDef[];
  completedChallenges: string[];
  currentStreak: number;
  xpAwarded: number;
}

/**
 * Central gamification hook — call after every user action
 * (tree tagged, observation made, photo uploaded).
 * Returns all reward events for the client to animate.
 */
export async function processGamification(
  userId: string,
  action: 'tree_tagged' | 'observation' | 'photo_uploaded',
  xpAwarded: number
): Promise<GamificationEvent> {
  // 1. Update streak
  const currentStreak = await StreakManager.recordActivity(userId);

  // 2. Update species count if tree was tagged
  if (action === 'tree_tagged') {
    await StreakManager.updateSpeciesCount(userId);
  }

  // 3. Check achievements
  const newAchievements = await AchievementManager.checkAndAward(userId);

  // 4. Update challenge progress
  const metricMap: Record<string, string> = {
    tree_tagged: 'trees_tagged',
    observation: 'observations_made',
    photo_uploaded: 'photos_uploaded',
  };
  const completedChallenges = await ChallengeManager.incrementProgress(userId, metricMap[action]);

  return {
    newAchievements,
    completedChallenges,
    currentStreak,
    xpAwarded,
  };
}
