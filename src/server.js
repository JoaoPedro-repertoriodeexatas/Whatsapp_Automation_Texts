import cors from 'cors';
import express from 'express';
import { checkConnection, pool } from './config/database.js';
import { env } from './config/env.js';
import { router } from './routes/index.js';
import { formatError, logError, logInfo, logWarn } from './services/terminalLogger.js';

const app = express();

// Middlewares globais
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Tratamento de JSON malformado no body sem derrubar a aplicação
app.use((err, _req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    logWarn('HTTP', `Payload JSON inválido recebido: ${err.message}`);
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
  }
  return next(err);
});

// Rotas da aplicação
app.use('/', router);

// Rota não encontrada
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// Handler global de erros Express
app.use((err, _req, res, _next) => {
  logError('HTTP', 'Erro não tratado na requisição', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

const server = app.listen(env.port, async () => {
  logInfo('Server', `PoC Jurídico Backend rodando em http://localhost:${env.port}`);
  logInfo('Server', `Webhook Evolution API: POST http://localhost:${env.port}/webhook`);
  logInfo('Server', `Healthcheck:           GET  http://localhost:${env.port}/health`);

  try {
    const db = await checkConnection();
    logInfo('PostgreSQL', `Conectado ao banco "${env.db.database}" (${db.latencyMs}ms)`);
  } catch (error) {
    logWarn(
      'PostgreSQL',
      `Não foi possível conectar ao banco "${env.db.database}" na inicialização: ${formatError(error)}`,
    );
  }
});

async function shutdown(signal) {
  logInfo('Server', `Sinal ${signal} recebido. Encerrando servidor com segurança...`);

  server.close(async () => {
    try {
      await pool.end();
      logInfo('PostgreSQL', 'Pool de conexões encerrado.');
      process.exit(0);
    } catch (error) {
      logError('PostgreSQL', 'Erro ao encerrar pool de conexões', error);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
