import { Router } from 'express';
import { pool, syncProtocolSequence } from '../db.js';
import { requireAuth, optionalAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

const DEMAND_SELECT = `
  d.*,
  o.acronym AS organ_acronym,
  u.name AS assigned_user_name
  FROM ouvidoria_demands d
  LEFT JOIN ouvidoria_organs o ON o.id = d.organ_id
  LEFT JOIN ouvidoria_users u ON u.id = d.assigned_to_id
`;

// GET /api/demands
router.get('/', requireAuth as any, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${DEMAND_SELECT} ORDER BY d.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[demands/GET]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/demands/:id
router.get('/:id', requireAuth as any, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${DEMAND_SELECT} WHERE d.id = $1`,
      [req.params.id]
    );
    const demand = rows[0];
    if (!demand) {
      res.status(404).json({ error: 'Demanda não encontrada' });
      return;
    }

    // Fetch conversa ativa se houver protocolo
    let conversaAtiva = null;
    if (demand.protocol) {
      const { rows: convRows } = await pool.query(
        'SELECT * FROM ouvidoria_conversas_ativas WHERE protocolo = $1',
        [demand.protocol]
      );
      conversaAtiva = convRows[0] ?? null;
    }

    res.json({ ...demand, conversa_ativa: conversaAtiva });
  } catch (err) {
    console.error('[demands/GET/:id]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

function buildInsertPayload(input: Record<string, any>) {
  return {
    type: input.type,
    status: input.status || 'registrada',
    priority: input.priority,
    organ_id: input.organId || input.organ_id || null,
    description: input.description,
    channel: input.channel,
    anonymous: input.anonymous ?? false,
    citizen_name: input.citizenName || input.citizen_name || null,
    citizen_cpf: input.citizenCpf || input.citizen_cpf || null,
    citizen_phone: input.citizenPhone || input.citizen_phone || null,
    citizen_email: input.citizenEmail || input.citizen_email || null,
    deadline: input.deadline,
  };
}

async function insertDemand(p: any): Promise<any> {
  const queryStr = `
    INSERT INTO ouvidoria_demands
      (type, status, priority, organ_id, description, channel, anonymous,
       citizen_name, citizen_cpf, citizen_phone, citizen_email, deadline, protocol)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, fn_get_next_protocol())
     RETURNING id
  `;
  const params = [
    p.type, p.status, p.priority, p.organ_id, p.description, p.channel,
    p.anonymous, p.citizen_name, p.citizen_cpf, p.citizen_phone, p.citizen_email, p.deadline
  ];
  
  try {
    return await pool.query(queryStr, params);
  } catch (err: any) {
    // If it's a unique constraint violation on protocol, sync and retry
    if (err.code === '23505' && (err.constraint === 'demands_protocol_key' || String(err.message).includes('protocol'))) {
      console.warn('[demands] Protocol collision detected. Synchronizing sequence and retrying...');
      await syncProtocolSequence();
      return await pool.query(queryStr, params);
    }
    throw err;
  }
}

// POST /api/demands
router.post('/', requireAuth as any, async (req, res) => {
  const p = buildInsertPayload(req.body);
  try {
    const { rows } = await insertDemand(p);
    const { rows: full } = await pool.query(
      `SELECT ${DEMAND_SELECT} WHERE d.id = $1`, [rows[0].id]
    );
    res.status(201).json(full[0]);
  } catch (err) {
    console.error('[demands/POST]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/demands/public - sem autenticação (formulário público)
router.post('/public', optionalAuth as any, async (req, res) => {
  const p = buildInsertPayload(req.body);
  try {
    const { rows } = await insertDemand(p);
    const { rows: full } = await pool.query(
      `SELECT ${DEMAND_SELECT} WHERE d.id = $1`, [rows[0].id]
    );
    res.status(201).json(full[0]);
  } catch (err) {
    console.error('[demands/public/POST]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/demands/:id
router.put('/:id', requireAuth as any, async (req: AuthRequest, res) => {
  const updates: Record<string, any> = {};
  const fieldMap: Record<string, string> = {
    type: 'type', status: 'status', priority: 'priority', organId: 'organ_id',
    description: 'description', channel: 'channel', anonymous: 'anonymous',
    citizenName: 'citizen_name', citizenCpf: 'citizen_cpf', citizenPhone: 'citizen_phone',
    citizenEmail: 'citizen_email', assignedToId: 'assigned_to_id', deadline: 'deadline',
    demandanteNome: 'demandante_nome', demandanteCpf: 'demandante_cpf',
    demandanteDataNascimento: 'demandante_data_nascimento', demandanteSituacao: 'demandante_situacao',
    demandanteSexo: 'demandante_sexo', demandanteNomeMae: 'demandante_nome_mae',
    demandanteExposicaoPolitica: 'demandante_exposicao_politica',
    vinculoEmpregadorCnpj: 'vinculo_empregador_cnpj', vinculoEmpregadorNome: 'vinculo_empregador_nome',
    vinculoMatricula: 'vinculo_matricula', vinculoDataAdmissao: 'vinculo_data_admissao',
    vinculoDataInicioAtividade: 'vinculo_data_inicio_atividade', vinculoBloqueio: 'vinculo_bloqueio',
    vinculoElegivel: 'vinculo_elegivel', vinculoMotivoInelegibilidade: 'vinculo_motivo_inelegibilidade',
    vinculoDataDesligamento: 'vinculo_data_desligamento', vinculoMotivoDesligamento: 'vinculo_motivo_desligamento',
    vinculoClassificacaoTributaria: 'vinculo_classificacao_tributaria',
    vinculoCategoriaTrabalhador: 'vinculo_categoria_trabalhador',
    vinculoCnae: 'vinculo_cnae', vinculoCbo: 'vinculo_cbo', vinculoPeriodoReferencia: 'vinculo_periodo_referencia',
  };

  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (req.body[camel] !== undefined) updates[snake] = req.body[camel];
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'Nenhum campo para atualizar' });
    return;
  }

  updates.updated_at = new Date();
  const keys = Object.keys(updates);
  const values = Object.values(updates);
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

  try {
    await pool.query(
      `UPDATE ouvidoria_demands SET ${setClauses} WHERE id = $${keys.length + 1}`,
      [...values, req.params.id]
    );
    const { rows } = await pool.query(
      `SELECT ${DEMAND_SELECT} WHERE d.id = $1`, [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[demands/PUT]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
