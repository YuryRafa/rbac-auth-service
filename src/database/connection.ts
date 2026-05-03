import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[pg pool] idle client error:', err.message);
});

// Verify DB is reachable at startup 
export const connectDB = async () => {
  const client = await pool.connect();
  client.release();
  console.log('[pg] connected');

}

export default pool;