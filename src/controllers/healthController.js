import { checkConnection } from '../config/database.js';
import { formatError, logError } from '../services/terminalLogger.js';

export async function handleHealth(_req, res) {
  try {
    const dbStatus = await checkConnection();

    res.status(200).json({
      status: 'ok',
      service: 'poc-juridico-whatsapp-backend',
      database: 'connected',
      dbLatencyMs: dbStatus.latencyMs,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('Health', 'Falha na verificação de conectividade com o PostgreSQL', error);

    res.status(503).json({
      status: 'degraded',
      service: 'poc-juridico-whatsapp-backend',
      database: 'disconnected',
      error: formatError(error),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }
}
