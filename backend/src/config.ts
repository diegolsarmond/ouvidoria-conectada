export const config = {
  port: parseInt(process.env.PORT || '3001'),
  jwtSecret: process.env.JWT_SECRET || 'ouvidoria-dev-secret-change-in-production',
  jwtExpiresIn: '1h',
  refreshTokenExpiresMs: 30 * 24 * 60 * 60 * 1000, // 30 dias
  db: {
    host: process.env.DB_HOST || '38.225.221.230',
    port: parseInt(process.env.DB_PORT || '5434'),
    database: process.env.DB_NAME || 'ouvidoria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'C@104rm0nd1994',
    ssl: process.env.DB_SSL === 'true',
  },
  uploadsDir: process.env.UPLOADS_DIR || './uploads',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8080',
};
