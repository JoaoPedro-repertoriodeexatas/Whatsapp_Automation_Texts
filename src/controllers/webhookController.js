import {
  parseConnectionUpdate,
  parseEvolutionWebhook,
} from '../services/evolutionParser.js';
import { saveMessage } from '../services/messageService.js';
import {
  broadcastConnectionUpdate,
  broadcastNewMessage,
} from '../services/sseService.js';
import {
  logError,
  logIncomingMessage,
  logInfo,
  logWarn,
} from '../services/terminalLogger.js';

async function processWebhookPayload(payload) {
  try {
    // Loga e retransmite transições de conexão (open/connecting/close) via SSE
    const connUpdate = parseConnectionUpdate(payload);
    if (connUpdate) {
      const reason = connUpdate.statusReason != null ? ` (motivo: ${connUpdate.statusReason})` : '';
      logInfo('Evolution', `[${connUpdate.instancia}] Estado da conexão: ${connUpdate.state}${reason}`);

      broadcastConnectionUpdate({
        instanceName: connUpdate.instancia,
        state: connUpdate.state,
        connected: connUpdate.state === 'open',
        statusReason: connUpdate.statusReason,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const messages = parseEvolutionWebhook(payload);
    if (messages.length === 0) {
      return;
    }

    for (const message of messages) {
      // Exibe imediatamente no terminal para monitoramento em tempo real
      logIncomingMessage(message);

      try {
        const result = await saveMessage(message);
        if (!result.inserted) {
          logWarn('DB', `Mensagem duplicada ignorada (idempotência): ${message.message_id}`);
          continue;
        }

        // Dispara SSE apenas quando a mensagem foi efetivamente persistida (idempotência)
        if (result.record) {
          broadcastNewMessage(result.record);
        }
      } catch (dbError) {
        logError(
          'DB',
          `Falha ao persistir mensagem ${message.message_id} (${message.instancia})`,
          dbError,
        );
      }
    }
  } catch (error) {
    logError('Webhook', 'Erro inesperado ao processar payload assíncrono', error);
  }
}

export function handleWebhook(req, res) {
  const payload = req.body;

  // Responde HTTP 200 OK imediatamente para evitar timeouts e retentativas da Evolution API
  res.status(200).json({ status: 'received' });

  // Processamento assíncrono isolado do ciclo HTTP
  setImmediate(() => {
    void processWebhookPayload(payload);
  });
}
