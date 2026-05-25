import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Força a leitura do .env sempre da pasta backend/, independentemente de onde o PM2 foi iniciado
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3002'),
  jwtSecret: process.env.JWT_SECRET || 'ouvidoria-dev-secret-change-in-production',
  jwtExpiresIn: '1h',
  refreshTokenExpiresMs: 30 * 24 * 60 * 60 * 1000, // 30 dias
  db: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
  },
  uploadsDir: process.env.UPLOADS_DIR || './uploads',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8080,http://192.168.30.9:4173,http://192.168.30.9:8080',
};
