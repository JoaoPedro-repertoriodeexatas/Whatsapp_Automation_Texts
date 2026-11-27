import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/database.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSetup() {
  const sqlPath = path.join(__dirname, 'init.sql');
  const sql = await fs.readFile(sqlPath, 'utf-8');

  console.log(`[DB Setup] Aplicando schema em "${env.db.database}" (${env.db.host}:${env.db.port})...`);

  try {
    await pool.query(sql);
    console.log('[DB Setup] Tabela "mensagens" e índices verificados/criados com sucesso.');
  } catch (error) {
    const detail = error?.message || (Array.isArray(error?.errors) ? error.errors.map((e) => e.message || e.code).join('; ') : String(error));
    console.error('[DB Setup] Erro ao inicializar o banco de dados:', detail);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runSetup();
