import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/audit-logs
router.get('/', requireAuth as any, async (req, res) => {
  const { action, entityType, userId, dateFrom, dateTo, limit = '50', offset = '0' } = req.query as Record<string, string>;
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (action) { conditions.push(`action = $${idx++}`); values.push(action); }
  if (entityType) { conditions.push(`entity_type = $${idx++}`); values.push(entityType); }
  if (userId) { conditions.push(`user_id = $${idx++}`); values.push(userId); }
  if (dateFrom) { conditions.push(`created_at >= $${idx++}`); values.push(dateFrom); }
  if (dateTo) { conditions.push(`created_at <= $${idx++}`); values.push(dateTo); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const pageLimit = parseInt(limit);
  const pageOffset = parseInt(offset);

  try {
    const countResult = await pool.query(`SELECT COUNT(*) FROM ouvidoria_audit_logs ${where}`, values);
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT * FROM ouvidoria_audit_logs ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, pageLimit, pageOffset]
    );
    res.json({ data: rows, count: total });
  } catch (err) {
    console.error('[audit/GET]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/audit-logs
router.post('/', requireAuth as any, async (req, res) => {
  const { action, entityType, entityId, entityName, userId, userName, userRole, description, oldValues, newValues } = req.body;
  try {
    await pool.query(
      `INSERT INTO ouvidoria_audit_logs
        (action, entity_type, entity_id, entity_name, user_id, user_name, user_role, description, old_values, new_values)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [action, entityType || null, entityId || null, entityName || null,
       userId || null, userName || null, userRole || null, description || null,
       oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[audit/POST]', err);
    // Audit failures should not crash other operations
    res.status(201).json({ success: false });
  }
});

export default router;
