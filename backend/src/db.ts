import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  ...(config.db.url
    ? { connectionString: config.db.url, ssl: config.db.ssl ? { rejectUnauthorized: false } : false }
    : {
        host: config.db.host,
        port: config.db.port,
        database: config.db.database,
        user: config.db.user,
        password: config.db.password,
        ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
      }),
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

export async function syncProtocolSequence() {
  try {
    const currentYear = new Date().getFullYear().toString();
    
    // First, ensure sequence exists
    await pool.query("CREATE SEQUENCE IF NOT EXISTS protocol_seq START 1;");
    
    // Find the max sequence number used in both demands and conversas_ativas
    const query = `
      SELECT MAX(seq) as max_val FROM (
        SELECT CAST(SUBSTRING(protocol FROM 5) AS INTEGER) as seq
        FROM ouvidoria_demands
        WHERE protocol ~ '^[0-9]+$' AND protocol LIKE $1
        
        UNION ALL
        
        SELECT CAST(SUBSTRING(protocolo FROM 5) AS INTEGER) as seq
        FROM ouvidoria_conversas_ativas
        WHERE protocolo ~ '^[0-9]+$' AND protocolo LIKE $1
      ) t
    `;
    const { rows } = await pool.query(query, [`${currentYear}%`]);
    const maxVal = rows[0]?.max_val || 0;
    
    // Update sequence to be at least maxVal
    if (maxVal > 0) {
      await pool.query(`SELECT setval('protocol_seq', $1)`, [maxVal]);
      console.log(`[db] Sequence 'protocol_seq' synchronized to max protocol of ${currentYear}. New value: ${maxVal}`);
    } else {
      console.log(`[db] Sequence 'protocol_seq' check: no existing protocols for ${currentYear}.`);
    }
  } catch (err: any) {
    console.error('[db] Error synchronizing protocol sequence:', err.message);
  }
}

