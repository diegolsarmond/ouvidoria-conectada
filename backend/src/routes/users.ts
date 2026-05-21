import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { hashPassword } from '../utils/password.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

async function getUserWithOrgans(userId: string) {
  const { rows: userRows } = await pool.query('SELECT * FROM ouvidoria_users WHERE id = $1', [userId]);
  if (!userRows[0]) return null;
  const { rows: organRows } = await pool.query(
    'SELECT organ_id FROM ouvidoria_user_organs WHERE user_id = $1',
    [userId]
  );
  return { ...userRows[0], organ_ids: organRows.map((r: any) => r.organ_id) };
}

// GET /api/users
router.get('/', requireAuth as any, async (_req, res) => {
  try {
    const { rows: users } = await pool.query('SELECT * FROM ouvidoria_users ORDER BY name');
    const { rows: uo } = await pool.query('SELECT user_id, organ_id FROM ouvidoria_user_organs');
    const organsByUser: Record<string, string[]> = {};
    for (const row of uo) {
      if (!organsByUser[row.user_id]) organsByUser[row.user_id] = [];
      organsByUser[row.user_id].push(row.organ_id);
    }
    const result = users.map((u: any) => ({ ...u, organ_ids: organsByUser[u.id] ?? [] }));
    res.json(result);
  } catch (err) {
    console.error('[users/GET]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/users - create user with password
router.post('/', requireAuth as any, async (req, res) => {
  const { name, cpf, email, registration, role, status, primaryOrganId, organIds, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await hashPassword(password || Math.random().toString(36).slice(-12) + 'A1!');
    const userId = uuidv4();
    await client.query(
      `INSERT INTO ouvidoria_users (id, name, cpf, email, registration, role, status, primary_organ_id, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, name, cpf, email.toLowerCase().trim(), registration, role, status, primaryOrganId || null, passwordHash]
    );
    if (organIds?.length > 0) {
      for (const organId of organIds) {
        await client.query(
          'INSERT INTO ouvidoria_user_organs (user_id, organ_id) VALUES ($1, $2)',
          [userId, organId]
        );
      }
    }
    await client.query('COMMIT');
    const { rows: userRows } = await client.query('SELECT * FROM ouvidoria_users WHERE id = $1', [userId]);
    const { rows: organRows } = await client.query(
      'SELECT organ_id FROM ouvidoria_user_organs WHERE user_id = $1',
      [userId]
    );
    const user = { ...userRows[0], organ_ids: organRows.map((r: any) => r.organ_id) };
    res.status(201).json(user);
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      res.status(400).json({ error: 'Usuário já cadastrado com este e-mail, CPF ou matrícula.' });
      return;
    }
    console.error('[users/POST]', err);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
});

// PUT /api/users/:id
router.put('/:id', requireAuth as any, async (req, res) => {
  const { name, cpf, email, registration, role, status, primaryOrganId, organIds, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE ouvidoria_users
       SET name=$1, cpf=$2, email=$3, registration=$4, role=$5, status=$6, primary_organ_id=$7, updated_at=NOW()
       WHERE id = $8`,
      [name, cpf, email.toLowerCase().trim(), registration, role, status, primaryOrganId || null, req.params.id]
    );
    if (password) {
      const passwordHash = await hashPassword(password);
      await client.query('UPDATE ouvidoria_users SET password_hash = $1 WHERE id = $2', [passwordHash, req.params.id]);
    }
    // Sync organs
    await client.query('DELETE FROM ouvidoria_user_organs WHERE user_id = $1', [req.params.id]);
    if (organIds?.length > 0) {
      for (const organId of organIds) {
        await client.query(
          'INSERT INTO ouvidoria_user_organs (user_id, organ_id) VALUES ($1, $2)',
          [req.params.id, organId]
        );
      }
    }
    await client.query('COMMIT');
    const { rows: userRows } = await client.query('SELECT * FROM ouvidoria_users WHERE id = $1', [req.params.id]);
    const { rows: organRows } = await client.query(
      'SELECT organ_id FROM ouvidoria_user_organs WHERE user_id = $1',
      [req.params.id]
    );
    const user = { ...userRows[0], organ_ids: organRows.map((r: any) => r.organ_id) };
    res.json(user);
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      res.status(400).json({ error: 'Dados duplicados (e-mail, CPF ou matrícula já em uso).' });
      return;
    }
    console.error('[users/PUT]', err);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
});

// PUT /api/users/:id/status
router.put('/:id/status', requireAuth as any, async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE ouvidoria_users SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[users/status]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/users/:id/password - admin reset
router.put('/:id/password', requireAuth as any, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    return;
  }
  try {
    const passwordHash = await hashPassword(password);
    await pool.query('UPDATE ouvidoria_users SET password_hash = $1 WHERE id = $2', [passwordHash, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[users/password]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/users/:id/organs
router.post('/:id/organs', requireAuth as any, async (req, res) => {
  const { organId } = req.body;
  try {
    await pool.query(
      'INSERT INTO ouvidoria_user_organs (user_id, organ_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, organId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[users/organs/POST]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/users/:id/organs/:organId
router.delete('/:id/organs/:organId', requireAuth as any, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM ouvidoria_user_organs WHERE user_id = $1 AND organ_id = $2',
      [req.params.id, req.params.organId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[users/organs/DELETE]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
