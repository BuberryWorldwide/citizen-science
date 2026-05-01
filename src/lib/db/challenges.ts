import { query } from './connection';

export interface Challenge {
  id: string;
  challenge_key: string;
  title: string;
  description: string;
  target: number;
  reward_points: number;
  active_from: string;
  active_until: string;
  challenge_type: 'daily' | 'weekly';
  progress?: number;
  completed?: boolean;
}

// Challenge templates that rotate
const CHALLENGE_TEMPLATES = [
  { key: 'tag_3_trees', title: 'Tree Tagger', description: 'Tag 3 trees', target: 3, reward: 30, metric: 'trees_tagged' },
  { key: 'tag_5_trees', title: 'Planting Spree', description: 'Tag 5 trees', target: 5, reward: 50, metric: 'trees_tagged' },
  { key: 'observe_5', title: 'Field Notes', description: 'Make 5 observations', target: 5, reward: 30, metric: 'observations_made' },
  { key: 'observe_10', title: 'Sharp Observer', description: 'Make 10 observations', target: 10, reward: 60, metric: 'observations_made' },
  { key: 'photo_3', title: 'Snapshot Run', description: 'Upload 3 photos', target: 3, reward: 20, metric: 'photos_uploaded' },
  { key: 'photo_10', title: 'Photo Journal', description: 'Upload 10 photos', target: 10, reward: 50, metric: 'photos_uploaded' },
  { key: 'new_species', title: 'Explorer', description: 'Find a new species', target: 1, reward: 40, metric: 'species_found' },
  { key: 'new_species_3', title: 'Biodiversity Quest', description: 'Find 3 new species', target: 3, reward: 75, metric: 'species_found' },
];

export const ChallengeManager = {
  /** Get active challenges with user progress. */
  async getActiveChallenges(userId: string): Promise<Challenge[]> {
    const result = await query(
      `SELECT c.*, COALESCE(cp.progress, 0) as progress, COALESCE(cp.completed, false) as completed
       FROM challenges c
       LEFT JOIN challenge_progress cp ON cp.challenge_id = c.id AND cp.user_id = $1
       WHERE c.active_until >= CURRENT_DATE AND c.active_from <= CURRENT_DATE
       ORDER BY c.challenge_type, c.active_until`,
      [userId]
    );
    return result.rows;
  },

  /** Increment progress on matching challenges. Returns completed challenge titles for toasts. */
  async incrementProgress(userId: string, metric: string): Promise<string[]> {
    // Find active challenges that match this metric
    const challenges = await query(
      `SELECT c.id, c.challenge_key, c.title, c.target, c.reward_points
       FROM challenges c
       WHERE c.active_until >= CURRENT_DATE AND c.active_from <= CURRENT_DATE
         AND c.challenge_key IN (${CHALLENGE_TEMPLATES
           .filter(t => t.metric === metric)
           .map(t => `'${t.key}'`)
           .join(',') || "'none'"})`,
      []
    );

    const completedTitles: string[] = [];

    for (const challenge of challenges.rows) {
      // Upsert progress
      const result = await query(
        `INSERT INTO challenge_progress (user_id, challenge_id, progress)
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id, challenge_id) DO UPDATE SET
           progress = CASE WHEN challenge_progress.completed THEN challenge_progress.progress ELSE challenge_progress.progress + 1 END
         RETURNING progress, completed`,
        [userId, challenge.id]
      );

      const row = result.rows[0];
      if (!row.completed && row.progress >= challenge.target) {
        // Mark as completed and award bonus points
        await query(
          `UPDATE challenge_progress SET completed = true, completed_at = NOW() WHERE user_id = $1 AND challenge_id = $2`,
          [userId, challenge.id]
        );
        // Award bonus XP via points_ledger + user_stats
        await query(
          `INSERT INTO points_ledger (user_id, points, reason, ref_id) VALUES ($1, $2, 'challenge_complete', $3)`,
          [userId, challenge.reward_points, challenge.id]
        );
        await query(
          `UPDATE user_stats SET total_points = total_points + $2 WHERE user_id = $1`,
          [userId, challenge.reward_points]
        );
        completedTitles.push(challenge.title);
      }
    }

    return completedTitles;
  },

  /** Generate new weekly challenges (call from cron or on first load of week). */
  async generateWeeklyChallenges(): Promise<void> {
    // Check if we already have challenges for this week
    const existing = await query(
      `SELECT COUNT(*) as count FROM challenges WHERE active_until >= CURRENT_DATE AND challenge_type = 'weekly'`,
      []
    );
    if (parseInt(existing.rows[0].count) > 0) return;

    // Pick 3 random challenge templates
    const shuffled = [...CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 3);

    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));

    for (const t of picks) {
      await query(
        `INSERT INTO challenges (challenge_key, title, description, target, reward_points, active_from, active_until, challenge_type)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, 'weekly')`,
        [t.key, t.title, t.description, t.target, t.reward, nextSunday.toISOString().split('T')[0]]
      );
    }
  },
};
