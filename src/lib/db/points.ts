import { query } from './connection';

const POINTS = {
  tree_tagged: 10,
  observation: 5,
  photo_uploaded: 3,
} as const;

type PointReason = keyof typeof POINTS | 'bonus';

export const PointsManager = {
  async award(userId: string, reason: PointReason, refId?: string, customPoints?: number) {
    const pts = customPoints ?? POINTS[reason as keyof typeof POINTS] ?? 0;
    if (!pts) return;

    // Upsert user_stats
    await query(
      `INSERT INTO user_stats (user_id, total_points, trees_tagged, observations_made, photos_uploaded, updated_at)
       VALUES ($1, $2,
         CASE WHEN $3 = 'tree_tagged' THEN 1 ELSE 0 END,
         CASE WHEN $3 = 'observation' THEN 1 ELSE 0 END,
         CASE WHEN $3 = 'photo_uploaded' THEN 1 ELSE 0 END,
         NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         total_points = user_stats.total_points + $2,
         trees_tagged = user_stats.trees_tagged + CASE WHEN $3 = 'tree_tagged' THEN 1 ELSE 0 END,
         observations_made = user_stats.observations_made + CASE WHEN $3 = 'observation' THEN 1 ELSE 0 END,
         photos_uploaded = user_stats.photos_uploaded + CASE WHEN $3 = 'photo_uploaded' THEN 1 ELSE 0 END,
         updated_at = NOW()`,
      [userId, pts, reason]
    );

    // Append to ledger
    await query(
      `INSERT INTO points_ledger (user_id, points, reason, ref_id) VALUES ($1, $2, $3, $4)`,
      [userId, pts, reason, refId || null]
    );
  },

  async getStats(userId: string) {
    const result = await query(
      'SELECT * FROM user_stats WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || { user_id: userId, total_points: 0, trees_tagged: 0, observations_made: 0, photos_uploaded: 0 };
  },

  async getLeaderboard(limit = 20) {
    const result = await query(
      `SELECT us.*, u.name, u.email
       FROM user_stats us
       JOIN "user" u ON u.id = us.user_id
       ORDER BY us.total_points DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async getLedger(userId: string, limit = 50) {
    const result = await query(
      'SELECT * FROM points_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows;
  },
};
