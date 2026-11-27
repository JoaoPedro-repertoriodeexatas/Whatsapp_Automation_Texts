import { logInfo, logWarn } from './terminalLogger.js';

const HEARTBEAT_INTERVAL_MS = 25_000;
const clients = new Set();

function removeClient(client) {
  if (!clients.has(client)) return;
  clearInterval(client.heartbeatTimer);
  clients.delete(client);
}

function writeChunk(client, chunk) {
  try {
    client.res.write(chunk);
  } catch (error) {
    logWarn('SSE', `Removendo cliente desconectado: ${error.message}`);
    removeClient(client);
  }
}

export function addSseClient(req, res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const client = {
    res,
    heartbeatTimer: null,
  };

  client.heartbeatTimer = setInterval(() => {
    writeChunk(client, ': keep-alive\n\n');
  }, HEARTBEAT_INTERVAL_MS);

  clients.add(client);

  // Instrução de reconexão automática e confirmação inicial
  writeChunk(client, 'retry: 3000\n');
  writeChunk(
    client,
    `event: connected\ndata: ${JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() })}\n\n`,
  );

  logInfo('SSE', `Cliente conectado (${clients.size} ativo(s))`);

  const cleanup = () => {
    if (clients.has(client)) {
      removeClient(client);
      logInfo('SSE', `Cliente desconectado (${clients.size} ativo(s))`);
    }
  };

  req.on('close', cleanup);
  res.on('error', cleanup);
}

function broadcastEvent(eventName, payload) {
  if (clients.size === 0) return;

  const formatted = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    writeChunk(client, formatted);
  }
}

export function broadcastNewMessage(mensagem) {
  broadcastEvent('new_message', mensagem);
}

export function broadcastConnectionUpdate(payload) {
  broadcastEvent('connection_update', payload);
}

export function getConnectedClientsCount() {
  return clients.size;
}

export function closeAllSseConnections() {
  for (const client of Array.from(clients)) {
    clearInterval(client.heartbeatTimer);
    try {
      client.res.end();
    } catch {
      // ignora erro ao encerrar stream já fechado
    }
    clients.delete(client);
  }
}
