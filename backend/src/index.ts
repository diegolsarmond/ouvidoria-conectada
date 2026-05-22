import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import organsRoutes from './routes/organs.js';
import usersRoutes from './routes/users.js';
import demandsRoutes from './routes/demands.js';
import historyRoutes from './routes/history.js';
import auditRoutes from './routes/audit.js';
import promptsRoutes from './routes/prompts.js';
import storageRoutes from './routes/storage.js';
import { pool } from './db.js';

const app = express();

app.use(cors({
  origin: config.corsOrigin.split(','),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/organs', organsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/demands', demandsRoutes);
app.use('/api/demands/:demandId/history', historyRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/assistant-prompts', promptsRoutes);
app.use('/api/storage', storageRoutes);

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

app.listen(config.port, () => {
  console.log(`[server] Backend rodando em http://localhost:${config.port}`);
});
