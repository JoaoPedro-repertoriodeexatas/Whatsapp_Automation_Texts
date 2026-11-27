import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

const poolConfig = env.db.connectionString
  ? {
      connectionString: env.db.connectionString,
      max: env.db.max,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    }
  : {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      max: env.db.max,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    };

export const pool = new Pool(poolConfig);

// Evita queda do processo caso um cliente ocioso no pool perca a conexão
pool.on('error', (err) => {
  console.error('[PostgreSQL] Erro inesperado em cliente ocioso do pool:', err.message);
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function checkConnection() {
  const start = Date.now();
  await pool.query('SELECT 1');
  return {
    connected: true,
    latencyMs: Date.now() - start,
  };
}
