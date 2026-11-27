/**
 * Parser e normalizador de payloads de webhook da Evolution API v2.
 * Focado no evento `messages.upsert`, ignorando status, broadcasts e mensagens de protocolo.
 */

const IGNORED_MESSAGE_KEYS = new Set([
  'protocolMessage',
  'senderKeyDistributionMessage',
  'messageContextInfo',
  'reactionMessage',
  'encReactionMessage',
  'receiptMessage',
  'keepInChatMessage',
  'pollUpdateMessage',
  'pinInChatMessage',
  'call',
  'bcallMessage',
]);

function normalizeEventName(event) {
  if (typeof event !== 'string') return '';
  return event.trim().toLowerCase().replace(/_/g, '.');
}

function unwrapMessage(rawMessage) {
  if (!rawMessage || typeof rawMessage !== 'object') return null;

  let current = rawMessage;
  let guard = 0;

  while (current && typeof current === 'object' && guard < 5) {
    guard += 1;

    if (current.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message;
      continue;
    }
    if (current.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message;
      continue;
    }
    if (current.viewOnceMessageV2?.message) {
      current = current.viewOnceMessageV2.message;
      continue;
    }
    if (current.viewOnceMessageV2Extension?.message) {
      current = current.viewOnceMessageV2Extension.message;
      continue;
    }
    if (current.documentWithCaptionMessage?.message) {
      current = current.documentWithCaptionMessage.message;
      continue;
    }
    if (current.editedMessage?.message) {
      current = current.editedMessage.message;
      continue;
    }
    break;
  }

  return current;
}

function extractCleanPhone(key) {
  const rawJid =
    (typeof key?.remoteJid === 'string' && key.remoteJid.endsWith('@lid') && key.remoteJidAlt)
      ? key.remoteJidAlt
      : key?.remoteJid;

  if (typeof rawJid !== 'string' || !rawJid.trim()) {
    return null;
  }

  const trimmed = rawJid.trim();

  // Ignora status do WhatsApp e listas de transmissão
  if (trimmed === 'status@broadcast' || trimmed.endsWith('@broadcast')) {
    return null;
  }

  // Remove sufixos como @s.whatsapp.net, @c.us, @g.us e identificadores de dispositivo (:12)
  const beforeAt = trimmed.split('@')[0];
  const cleanNumber = beforeAt.split(':')[0].trim();

  return cleanNumber || null;
}

function parseTimestamp(rawTimestamp) {
  if (rawTimestamp == null) {
    return new Date();
  }

  let seconds;
  if (typeof rawTimestamp === 'number') {
    seconds = rawTimestamp;
  } else if (typeof rawTimestamp === 'string' && rawTimestamp.trim() !== '') {
    seconds = Number(rawTimestamp);
  } else if (typeof rawTimestamp === 'object' && typeof rawTimestamp.low === 'number') {
    seconds = rawTimestamp.low;
  }

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return new Date();
  }

  // Se já vier em milissegundos (13 dígitos), usa direto; caso contrário converte de segundos
  const ms = seconds > 1e12 ? seconds : seconds * 1000;
  const date = new Date(ms);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function extractContent(messageObj) {
  const msg = unwrapMessage(messageObj);
  if (!msg || typeof msg !== 'object') {
    return null;
  }

  // 1. Texto simples
  if (typeof msg.conversation === 'string' && msg.conversation.trim() !== '') {
    return {
      tipo_mensagem: 'texto',
      conteudo: msg.conversation,
    };
  }

  // 2. Texto estendido (respostas, links, formatação)
  if (typeof msg.extendedTextMessage?.text === 'string' && msg.extendedTextMessage.text.trim() !== '') {
    return {
      tipo_mensagem: 'texto',
      conteudo: msg.extendedTextMessage.text,
    };
  }

  // 3. Documentos / PDFs
  if (msg.documentMessage) {
    // TODO Fase 2: download e upload para S3/MinIO
    const fileName = msg.documentMessage.fileName || msg.documentMessage.title || 'documento_sem_nome';
    const mimetype = msg.documentMessage.mimetype || 'application/octet-stream';
    const caption = msg.documentMessage.caption?.trim();

    const metadata = `${fileName} (${mimetype})`;
    return {
      tipo_mensagem: 'documento',
      conteudo: caption ? `${metadata} — ${caption}` : metadata,
    };
  }

  // 4. Imagens
  if (msg.imageMessage) {
    // TODO Fase 2: download e upload para S3/MinIO
    const caption = msg.imageMessage.caption?.trim();
    return {
      tipo_mensagem: 'imagem',
      conteudo: caption ? `[Imagem] ${caption}` : '[Imagem sem legenda]',
    };
  }

  // 5. Áudios / mensagens de voz
  if (msg.audioMessage) {
    // TODO Fase 2: download e upload para S3/MinIO
    const seconds = Number(msg.audioMessage.seconds);
    const isVoiceNote = Boolean(msg.audioMessage.ptt);
    const durationPart = Number.isFinite(seconds) && seconds > 0 ? ` (${seconds}s)` : '';
    const label = isVoiceNote ? 'Áudio de voz' : 'Áudio';

    return {
      tipo_mensagem: 'audio',
      conteudo: `[${label}${durationPart}]`,
    };
  }

  // 6. Outros tipos úteis (vídeo, figurinha, contato, localização)
  if (msg.videoMessage) {
    // TODO Fase 2: download e upload para S3/MinIO
    const caption = msg.videoMessage.caption?.trim();
    return {
      tipo_mensagem: 'outro',
      conteudo: caption ? `[Vídeo] ${caption}` : '[Vídeo sem legenda]',
    };
  }

  if (msg.stickerMessage) {
    return {
      tipo_mensagem: 'outro',
      conteudo: '[Figurinha]',
    };
  }

  if (msg.contactMessage) {
    const displayName = msg.contactMessage.displayName || 'Sem nome';
    return {
      tipo_mensagem: 'outro',
      conteudo: `[Contato compartilhado: ${displayName}]`,
    };
  }

  if (msg.contactsArrayMessage) {
    const total = Array.isArray(msg.contactsArrayMessage.contacts)
      ? msg.contactsArrayMessage.contacts.length
      : 0;
    return {
      tipo_mensagem: 'outro',
      conteudo: `[${total || 'Vários'} contatos compartilhados]`,
    };
  }

  if (msg.locationMessage || msg.liveLocationMessage) {
    const loc = msg.locationMessage || msg.liveLocationMessage;
    const coords =
      loc.degreesLatitude != null && loc.degreesLongitude != null
        ? `${loc.degreesLatitude}, ${loc.degreesLongitude}`
        : 'coordenadas indisponíveis';
    return {
      tipo_mensagem: 'outro',
      conteudo: `[Localização: ${coords}]`,
    };
  }

  // Ignora mensagens de protocolo, recibos, distribuição de chaves e payloads sem conteúdo útil
  const relevantKeys = Object.keys(msg).filter((key) => !IGNORED_MESSAGE_KEYS.has(key));
  if (relevantKeys.length === 0) {
    return null;
  }

  return null;
}

function parseSingleMessage(item, instanceName) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const key = item.key;
  if (!key || typeof key !== 'object') {
    return null;
  }

  const messageId = typeof key.id === 'string' ? key.id.trim() : '';
  if (!messageId) {
    return null;
  }

  const telefoneCliente = extractCleanPhone(key);
  if (!telefoneCliente) {
    return null;
  }

  const extracted = extractContent(item.message);
  if (!extracted) {
    return null;
  }

  const pushName = typeof item.pushName === 'string' && item.pushName.trim() !== ''
    ? item.pushName.trim().slice(0, 150)
    : null;

  return {
    message_id: messageId.slice(0, 100),
    instancia: String(instanceName).trim().slice(0, 50),
    telefone_cliente: telefoneCliente.slice(0, 50),
    nome_contato: pushName,
    enviada_por_nos: Boolean(key.fromMe),
    tipo_mensagem: extracted.tipo_mensagem,
    conteudo: extracted.conteudo,
    criado_em: parseTimestamp(item.messageTimestamp),
  };
}

/**
 * Converte o body do webhook da Evolution API v2 em uma lista de mensagens normalizadas.
 * Retorna array vazio para eventos não suportados ou mensagens ignoradas.
 */
export function parseEvolutionWebhook(payload) {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  if (normalizeEventName(payload.event) !== 'messages.upsert') {
    return [];
  }

  const instancia = payload.instance;
  if (typeof instancia !== 'string' || !instancia.trim()) {
    return [];
  }

  const rawData = payload.data;
  if (!rawData) {
    return [];
  }

  let items;
  if (Array.isArray(rawData)) {
    items = rawData;
  } else if (Array.isArray(rawData.messages)) {
    items = rawData.messages;
  } else {
    items = [rawData];
  }

  const parsedMessages = [];
  for (const item of items) {
    const normalized = parseSingleMessage(item, instancia);
    if (normalized) {
      parsedMessages.push(normalized);
    }
  }

  return parsedMessages;
}
