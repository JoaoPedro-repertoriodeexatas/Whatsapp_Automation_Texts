import 'dotenv/config';

function parseIntEnv(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const port = parseIntEnv(process.env.PORT, 3000);
const rawEvolutionUrl = (process.env.EVOLUTION_API_URL || 'http://localhost:8080').trim();
const evolutionApiUrl = rawEvolutionUrl.replace(/\/+$/, '');
const rawWebhookUrl = (process.env.WEBHOOK_URL || `http://localhost:${port}/webhook`).trim();

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port,
  webhookUrl: rawWebhookUrl,
  db: Object.freeze({
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.PGHOST || 'localhost',
    port: parseIntEnv(process.env.PGPORT, 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'poc_juridico',
    max: parseIntEnv(process.env.PG_POOL_MAX, 10),
  }),
  evolution: Object.freeze({
    apiUrl: evolutionApiUrl,
    apiKey: (process.env.EVOLUTION_API_KEY || '').trim(),
  }),
});
