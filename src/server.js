import cors from 'cors';
import express from 'express';
import { checkConnection, pool } from './config/database.js';
import { env } from './config/env.js';
import { router } from './routes/index.js';
import { closeAllSseConnections } from './services/sseService.js';
import { formatError, logError, logInfo, logWarn } from './services/terminalLogger.js';

const app = express();

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean)
    : []),
]);

// Middlewares globais
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '15mb' }));

// Tratamento de JSON malformado ou payload acima do limite sem derrubar a aplicação
app.use((err, _req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    logWarn('HTTP', `Payload JSON inválido recebido: ${err.message}`);
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
  }
  if (err?.type === 'entity.too.large') {
    logWarn('HTTP', 'Payload excedeu o limite máximo configurado (15mb).');
    return res.status(413).json({ error: 'Payload excedeu o limite máximo permitido.' });
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
  logInfo('Server', `API Monitoramento:     GET  http://localhost:${env.port}/api/conversations`);
  logInfo('Server', `Stream Tempo Real SSE: GET  http://localhost:${env.port}/api/events`);
  logInfo('Server', `QR Code (Navegador):   GET  http://localhost:${env.port}/instances/:name/qrcode`);

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

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logInfo('Server', `Sinal ${signal} recebido. Encerrando servidor com segurança...`);
  closeAllSseConnections();

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
process.on('unhandledRejection', (reason) => {
  logError('Process', 'Promise rejeitada sem tratamento capturada', reason);
});
