import { Router, type Request } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

interface DemandParams extends Request {
  params: { demandId: string };
}

const router = Router({ mergeParams: true });

// GET /api/demands/:demandId/history
router.get('/', requireAuth as any, async (req: DemandParams, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT h.*, u.name AS user_name
       FROM ouvidoria_demand_history h
       LEFT JOIN ouvidoria_users u ON u.id = h.user_id
       WHERE h.demand_id = $1
       ORDER BY h.created_at ASC`,
      [req.params.demandId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[history/GET]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/demands/:demandId/history
router.post('/', requireAuth as any, async (req: DemandParams, res) => {
  const { action, description, userId, fromStatus, toStatus } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO ouvidoria_demand_history
        (demand_id, action, description, user_id, from_status, to_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.demandId, action, description, userId || null, fromStatus || null, toStatus || null]
    );
    const entry = rows[0];
    // Fetch user name
    let userName = 'Sistema';
    if (entry.user_id) {
      const { rows: uRows } = await pool.query('SELECT name FROM ouvidoria_users WHERE id = $1', [entry.user_id]);
      if (uRows[0]) userName = uRows[0].name;
    }
    res.status(201).json({ ...entry, user_name: userName });
  } catch (err) {
    console.error('[history/POST]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
