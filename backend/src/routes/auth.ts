import { Router } from 'express';
import { pool } from '../db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';

const router = Router();

function sessionResponse(userId: string, email: string, role: string, name: string, cpf: string) {
  const accessToken = signAccessToken({ userId, email, role });
  const refreshToken = uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  return { accessToken, refreshToken, expiresAt, userId, email, role, name, cpf };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email e senha obrigatórios' });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT id, email, role, name, cpf, password_hash, status FROM ouvidoria_users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];
    if (!user || user.status !== 'ativo') {
      res.status(400).json({ error: 'Credenciais inválidas ou usuário inativo' });
      return;
    }
    if (!user.password_hash) {
      res.status(400).json({ error: 'Senha não configurada. Contate o administrador.' });
      return;
    }
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(400).json({ error: 'Credenciais inválidas' });
      return;
    }

    const { accessToken, refreshToken, expiresAt } = sessionResponse(
      user.id, user.email, user.role, user.name, user.cpf
    );
    const expiresAtDb = new Date(Date.now() + config.refreshTokenExpiresMs);
    await pool.query(
      'INSERT INTO ouvidoria_refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAtDb]
    );

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      user: { id: user.id, email: user.email, user_metadata: { name: user.name, cpf: user.cpf } },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth as any, async (req: AuthRequest, res) => {
  const { refresh_token } = req.body;
  try {
    if (refresh_token) {
      await pool.query('DELETE FROM ouvidoria_refresh_tokens WHERE token = $1', [refresh_token]);
    } else if (req.user) {
      // global logout: remove all refresh tokens for the user
      await pool.query('DELETE FROM ouvidoria_refresh_tokens WHERE user_id = $1', [req.user.userId]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[auth/logout]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    res.status(400).json({ error: 'refresh_token obrigatório' });
    return;
  }
  try {
    const result = await pool.query(
      `SELECT rt.user_id, u.email, u.role, u.name, u.cpf
       FROM ouvidoria_refresh_tokens rt
       JOIN ouvidoria_users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.expires_at > NOW() AND u.status = 'ativo'`,
      [refresh_token]
    );
    const row = result.rows[0];
    if (!row) {
      res.status(401).json({ error: 'Token inválido ou expirado' });
      return;
    }
    // Rotate refresh token
    await pool.query('DELETE FROM ouvidoria_refresh_tokens WHERE token = $1', [refresh_token]);
    const newRefreshToken = uuidv4();
    const expiresAtDb = new Date(Date.now() + config.refreshTokenExpiresMs);
    await pool.query(
      'INSERT INTO ouvidoria_refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [row.user_id, newRefreshToken, expiresAtDb]
    );
    const accessToken = signAccessToken({ userId: row.user_id, email: row.email, role: row.role });
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    res.json({ access_token: accessToken, refresh_token: newRefreshToken, expires_at: expiresAt });
  } catch (err) {
    console.error('[auth/refresh]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, name, cpf, registration, role } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email e senha obrigatórios' });
    return;
  }
  try {
    const passwordHash = await hashPassword(password);
    const userId = uuidv4();
    await pool.query(
      `INSERT INTO ouvidoria_users (id, name, cpf, email, registration, role, status, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, 'ativo', $7)`,
      [userId, name || '', cpf || '', email.toLowerCase().trim(), registration || '', role || 'atendente', passwordHash]
    );
    res.status(201).json({
      user: { id: userId, email, user_metadata: { name, cpf } },
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Usuário já cadastrado com este e-mail ou CPF.' });
      return;
    }
    console.error('[auth/signup]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/auth/session
router.get('/session', requireAuth as any, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, cpf FROM ouvidoria_users WHERE id = $1 AND status = $2',
      [req.user!.userId, 'ativo']
    );
    const user = result.rows[0];
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }
    res.json({ user: { id: user.id, email: user.email, user_metadata: { name: user.name, cpf: user.cpf } } });
  } catch (err) {
    console.error('[auth/session]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/reset-password-request
router.post('/reset-password-request', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email obrigatório' });
    return;
  }
  try {
    const result = await pool.query('SELECT id FROM ouvidoria_users WHERE email = $1', [email.toLowerCase().trim()]);
    const user = result.rows[0];
    if (!user) {
      // Don't reveal if email exists
      res.json({ success: true, message: 'Se o email existir, as instruções foram geradas.' });
      return;
    }
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query(
      'INSERT INTO ouvidoria_password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );
    const origin = req.headers.origin || 'http://localhost:8080';
    res.json({
      success: true,
      message: 'Token de recuperação gerado.',
      // Returned for admin use — in production, send by email instead
      reset_url: `${origin}/reset-password?token=${token}`,
    });
  } catch (err) {
    console.error('[auth/reset-password-request]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400).json({ error: 'Token e senha obrigatórios' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT * FROM ouvidoria_password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = FALSE',
      [token]
    );
    const row = result.rows[0];
    if (!row) {
      res.status(400).json({ error: 'Token inválido ou expirado' });
      return;
    }
    const passwordHash = await hashPassword(password);
    await pool.query('UPDATE ouvidoria_users SET password_hash = $1 WHERE id = $2', [passwordHash, row.user_id]);
    await pool.query('UPDATE ouvidoria_password_reset_tokens SET used = TRUE WHERE id = $1', [row.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/auth/update-password
router.put('/update-password', requireAuth as any, async (req: AuthRequest, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    return;
  }
  try {
    const passwordHash = await hashPassword(password);
    await pool.query('UPDATE ouvidoria_users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user!.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[auth/update-password]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
