import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/organs - public (used in public demand form)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ouvidoria_organs ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error('[organs/GET]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/organs
router.post('/', requireAuth as any, async (req, res) => {
  const { name, acronym, email, status, description } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO ouvidoria_organs (name, acronym, email, status, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, acronym, email, status, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[organs/POST]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/organs/:id
router.put('/:id', requireAuth as any, async (req, res) => {
  const { name, acronym, email, status, description } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE ouvidoria_organs
       SET name = $1, acronym = $2, email = $3, status = $4, description = $5, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, acronym, email, status, description || null, req.params.id]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Órgão não encontrado' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('[organs/PUT]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
