import pg from 'pg';
import { formatError, logError } from '../services/terminalLogger.js';
import { env } from './env.js';

const { Pool } = pg;

const commonPoolOptions = {
  max: env.db.max,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  query_timeout: 10_000,
};

const poolConfig = env.db.connectionString
  ? {
      connectionString: env.db.connectionString,
      ...commonPoolOptions,
    }
  : {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      ...commonPoolOptions,
    };

export const pool = new Pool(poolConfig);

// Evita queda do processo caso um cliente ocioso no pool perca a conexão
pool.on('error', (err) => {
  logError('PostgreSQL', `Erro inesperado em cliente ocioso do pool: ${formatError(err)}`);
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
