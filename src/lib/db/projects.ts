import { query } from './connection';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  tree_count?: number;
}

export const ProjectManager = {
  async list(): Promise<Project[]> {
    const result = await query(
      `SELECT p.*, COUNT(pt.tree_id)::int as tree_count
       FROM projects p
       LEFT JOIN project_trees pt ON pt.project_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );
    return result.rows;
  },

  async getById(id: string): Promise<Project | null> {
    const result = await query(
      `SELECT p.*, COUNT(pt.tree_id)::int as tree_count
       FROM projects p
       LEFT JOIN project_trees pt ON pt.project_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );
    return result.rows[0] || null;
  },

  async create(name: string, description?: string): Promise<Project> {
    const result = await query(
      'INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    return result.rows[0];
  },

  async addTree(projectId: string, treeId: string): Promise<void> {
    await query(
      'INSERT INTO project_trees (project_id, tree_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [projectId, treeId]
    );
  },

  async removeTree(projectId: string, treeId: string): Promise<void> {
    await query(
      'DELETE FROM project_trees WHERE project_id = $1 AND tree_id = $2',
      [projectId, treeId]
    );
  },

  async getProjectTrees(projectId: string) {
    const result = await query(
      `SELECT t.* FROM trees t
       JOIN project_trees pt ON pt.tree_id = t.id
       WHERE pt.project_id = $1
       ORDER BY t.created_at DESC`,
      [projectId]
    );
    return result.rows;
  },

  async getProjectsForTree(treeId: string): Promise<Project[]> {
    const result = await query(
      `SELECT p.* FROM projects p
       JOIN project_trees pt ON pt.project_id = p.id
       WHERE pt.tree_id = $1`,
      [treeId]
    );
    return result.rows;
  },
};
