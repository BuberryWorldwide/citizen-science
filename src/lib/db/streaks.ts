import { query } from './connection';

export const StreakManager = {
  /**
   * Record activity for today. Updates streak counters.
   * Returns the current streak count.
   */
  async recordActivity(userId: string): Promise<number> {
    const result = await query(
      `INSERT INTO user_stats (user_id, current_streak, longest_streak, last_active_date, updated_at)
       VALUES ($1, 1, 1, CURRENT_DATE, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         current_streak = CASE
           WHEN user_stats.last_active_date = CURRENT_DATE THEN user_stats.current_streak
           WHEN user_stats.last_active_date = CURRENT_DATE - 1 THEN user_stats.current_streak + 1
           ELSE 1
         END,
         longest_streak = GREATEST(
           user_stats.longest_streak,
           CASE
             WHEN user_stats.last_active_date = CURRENT_DATE THEN user_stats.current_streak
             WHEN user_stats.last_active_date = CURRENT_DATE - 1 THEN user_stats.current_streak + 1
             ELSE 1
           END
         ),
         last_active_date = CURRENT_DATE,
         updated_at = NOW()
       RETURNING current_streak`,
      [userId]
    );
    return result.rows[0]?.current_streak ?? 1;
  },

  /** Get current streak info for a user. */
  async getStreak(userId: string) {
    const result = await query(
      'SELECT current_streak, longest_streak, last_active_date FROM user_stats WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length === 0) return { current_streak: 0, longest_streak: 0, last_active_date: null };
    const row = result.rows[0];
    // Check if streak is still active (last activity was today or yesterday)
    const lastActive = row.last_active_date ? new Date(row.last_active_date) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastActive && lastActive >= yesterday) {
      return row;
    }
    // Streak is broken
    return { ...row, current_streak: 0 };
  },

  /** Update species_found count for a user based on actual distinct species tagged. */
  async updateSpeciesCount(userId: string): Promise<number> {
    const result = await query(
      `UPDATE user_stats SET species_found = (
        SELECT COUNT(DISTINCT species) FROM trees WHERE created_by = $1 AND species IS NOT NULL
      ) WHERE user_id = $1 RETURNING species_found`,
      [userId]
    );
    return result.rows[0]?.species_found ?? 0;
  },
};
