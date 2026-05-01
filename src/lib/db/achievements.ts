import { query } from './connection';

// Achievement definitions — key, title, description, icon name, condition
export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: 'trees' | 'observations' | 'photos' | 'species' | 'streaks' | 'social';
  check: (stats: UserStatsRow) => boolean;
}

interface UserStatsRow {
  total_points: number;
  trees_tagged: number;
  observations_made: number;
  photos_uploaded: number;
  current_streak: number;
  longest_streak: number;
  species_found: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Trees
  { key: 'first_tree', title: 'Trailblazer', description: 'Tag your first tree', icon: 'tree', category: 'trees', check: s => s.trees_tagged >= 1 },
  { key: 'trees_10', title: 'Grove Starter', description: 'Tag 10 trees', icon: 'tree', category: 'trees', check: s => s.trees_tagged >= 10 },
  { key: 'trees_50', title: 'Forest Scout', description: 'Tag 50 trees', icon: 'tree', category: 'trees', check: s => s.trees_tagged >= 50 },
  { key: 'trees_100', title: 'Tree Legend', description: 'Tag 100 trees', icon: 'trophy', category: 'trees', check: s => s.trees_tagged >= 100 },

  // Observations
  { key: 'first_obs', title: 'Sharp Eyes', description: 'Make your first observation', icon: 'eye', category: 'observations', check: s => s.observations_made >= 1 },
  { key: 'obs_25', title: 'Keen Observer', description: 'Make 25 observations', icon: 'eye', category: 'observations', check: s => s.observations_made >= 25 },
  { key: 'obs_100', title: 'Field Scientist', description: 'Make 100 observations', icon: 'target', category: 'observations', check: s => s.observations_made >= 100 },

  // Photos
  { key: 'first_photo', title: 'Snapshot', description: 'Upload your first photo', icon: 'camera', category: 'photos', check: s => s.photos_uploaded >= 1 },
  { key: 'photos_25', title: 'Photographer', description: 'Upload 25 photos', icon: 'camera', category: 'photos', check: s => s.photos_uploaded >= 25 },
  { key: 'photos_100', title: 'Documentary', description: 'Upload 100 photos', icon: 'camera', category: 'photos', check: s => s.photos_uploaded >= 100 },

  // Species
  { key: 'species_3', title: 'Curious Finder', description: 'Discover 3 different species', icon: 'book', category: 'species', check: s => s.species_found >= 3 },
  { key: 'species_8', title: 'Biodiversity Scout', description: 'Discover 8 different species', icon: 'book', category: 'species', check: s => s.species_found >= 8 },
  { key: 'species_15', title: 'Master Botanist', description: 'Discover 15 different species', icon: 'award', category: 'species', check: s => s.species_found >= 15 },

  // Streaks
  { key: 'streak_3', title: 'Getting Started', description: '3-day activity streak', icon: 'flame', category: 'streaks', check: s => s.longest_streak >= 3 },
  { key: 'streak_7', title: 'Week Warrior', description: '7-day activity streak', icon: 'flame', category: 'streaks', check: s => s.longest_streak >= 7 },
  { key: 'streak_30', title: 'Dedicated', description: '30-day activity streak', icon: 'star', category: 'streaks', check: s => s.longest_streak >= 30 },

  // Points milestones
  { key: 'points_100', title: 'Century', description: 'Earn 100 points', icon: 'target', category: 'social', check: s => s.total_points >= 100 },
  { key: 'points_500', title: 'High Roller', description: 'Earn 500 points', icon: 'star', category: 'social', check: s => s.total_points >= 500 },
  { key: 'points_1000', title: 'Legendary', description: 'Earn 1000 points', icon: 'trophy', category: 'social', check: s => s.total_points >= 1000 },
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map(a => [a.key, a]));

export const AchievementManager = {
  /**
   * Check for newly earned achievements and award them.
   * Returns array of newly earned achievement keys.
   */
  async checkAndAward(userId: string): Promise<AchievementDef[]> {
    // Get current stats
    const statsResult = await query(
      'SELECT total_points, trees_tagged, observations_made, photos_uploaded, current_streak, longest_streak, COALESCE(species_found, 0) as species_found FROM user_stats WHERE user_id = $1',
      [userId]
    );
    if (statsResult.rows.length === 0) return [];
    const stats = statsResult.rows[0] as UserStatsRow;

    // Get already earned achievements
    const earnedResult = await query(
      'SELECT achievement_key FROM achievements WHERE user_id = $1',
      [userId]
    );
    const earned = new Set(earnedResult.rows.map((r: { achievement_key: string }) => r.achievement_key));

    // Check each achievement
    const newlyEarned: AchievementDef[] = [];
    for (const achievement of ACHIEVEMENTS) {
      if (earned.has(achievement.key)) continue;
      if (achievement.check(stats)) {
        await query(
          'INSERT INTO achievements (user_id, achievement_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, achievement.key]
        );
        newlyEarned.push(achievement);
      }
    }

    return newlyEarned;
  },

  /** Get all achievements for a user (earned + locked). */
  async getUserAchievements(userId: string) {
    const earnedResult = await query(
      'SELECT achievement_key, earned_at FROM achievements WHERE user_id = $1',
      [userId]
    );
    const earnedMap = new Map(
      earnedResult.rows.map((r: { achievement_key: string; earned_at: string }) => [r.achievement_key, r.earned_at])
    );

    return ACHIEVEMENTS.map(a => ({
      ...a,
      earned: earnedMap.has(a.key),
      earned_at: earnedMap.get(a.key) || null,
    }));
  },
};
