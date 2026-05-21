import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/assistant-prompts
router.get('/', requireAuth as any, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM ouvidoria_assistant_prompts LIMIT 1');
    res.json(rows[0] ?? null);
  } catch (err) {
    console.error('[prompts/GET]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/assistant-prompts/:id
router.put('/:id', requireAuth as any, async (req, res) => {
  const fieldMap: Record<string, string> = {
    orquestrador: 'orquestrador', cadastro: 'cadastro', consulta: 'consulta',
    atendimento: 'atendimento', triagem: 'triagem', saudacao: 'saudacao',
    baseConhecimento: 'base_conhecimento', baseConhecimentoPdfUrl: 'base_conhecimento_pdf_url',
  };
  const updates: Record<string, any> = {};
  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (req.body[camel] !== undefined) updates[snake] = req.body[camel];
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'Nenhum campo fornecido' });
    return;
  }
  updates.updated_at = new Date();
  const keys = Object.keys(updates);
  const values = Object.values(updates);
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  try {
    const { rows } = await pool.query(
      `UPDATE ouvidoria_assistant_prompts SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[prompts/PUT]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/assistant-prompts/upsert
router.post('/upsert', requireAuth as any, async (req, res) => {
  const fieldMap: Record<string, string> = {
    orquestrador: 'orquestrador', cadastro: 'cadastro', consulta: 'consulta',
    atendimento: 'atendimento', triagem: 'triagem', saudacao: 'saudacao',
    baseConhecimento: 'base_conhecimento', baseConhecimentoPdfUrl: 'base_conhecimento_pdf_url',
  };
  const payload: Record<string, any> = {};
  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (req.body[camel] !== undefined) payload[snake] = req.body[camel];
  }

  try {
    const existing = await pool.query('SELECT id FROM ouvidoria_assistant_prompts LIMIT 1');
    let result;
    if (existing.rows[0]) {
      const id = existing.rows[0].id;
      payload.updated_at = new Date();
      const keys = Object.keys(payload);
      const values = Object.values(payload);
      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const { rows } = await pool.query(
        `UPDATE ouvidoria_assistant_prompts SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, id]
      );
      result = rows[0];
    } else {
      const keys = Object.keys(payload);
      const values = Object.values(payload);
      const cols = keys.join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await pool.query(
        `INSERT INTO ouvidoria_assistant_prompts (${cols}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      result = rows[0];
    }
    res.json(result);
  } catch (err) {
    console.error('[prompts/upsert]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
