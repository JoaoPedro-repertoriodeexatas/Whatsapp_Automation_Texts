/**
 * Parser e normalizador de payloads de webhook da Evolution API v2.
 * - Aceita `messages.upsert` e variações de caixa/separador (`MESSAGES_UPSERT`).
 * - Mantém apenas conversas individuais (`@s.whatsapp.net`), ignorando `status@broadcast`,
 *   grupos (`@g.us`), canais (`@newsletter`) e mensagens de protocolo/recibo.
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

export function normalizeEventName(event) {
  if (typeof event !== 'string') return '';
  return event.trim().toLowerCase().replace(/_/g, '.');
}

function stripNullBytes(value) {
  if (typeof value !== 'string') return '';
  // PostgreSQL TEXT/VARCHAR rejeita byte nulo (0x00)
  return value.replace(/\u0000/g, '');
}

function safeTrim(value) {
  return typeof value === 'string' ? stripNullBytes(value).trim() : '';
}

function unwrapMessage(rawMessage) {
  if (!rawMessage || typeof rawMessage !== 'object') return null;

  let current = rawMessage;
  let guard = 0;

  while (current && typeof current === 'object' && guard < 6) {
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
    if (current.protocolMessage?.editedMessage) {
      current = current.protocolMessage.editedMessage;
      continue;
    }
    break;
  }

  return current;
}

function extractCleanPhone(key) {
  const remoteJid = typeof key?.remoteJid === 'string' ? key.remoteJid.trim() : '';
  const remoteJidAlt = typeof key?.remoteJidAlt === 'string' ? key.remoteJidAlt.trim() : '';

  // Em contas mais recentes do WhatsApp (LID), usa remoteJidAlt quando trouxer o JID @s.whatsapp.net
  const resolvedJid =
    remoteJid.endsWith('@lid') && remoteJidAlt.endsWith('@s.whatsapp.net')
      ? remoteJidAlt
      : remoteJid;

  if (!resolvedJid) {
    return null;
  }

  const lowerJid = resolvedJid.toLowerCase();

  // Ignora explicitamente status, listas de transmissão, grupos e canais
  if (
    lowerJid === 'status@broadcast' ||
    lowerJid.endsWith('@broadcast') ||
    lowerJid.endsWith('@g.us') ||
    lowerJid.endsWith('@newsletter')
  ) {
    return null;
  }

  // Para esta PoC jurídica, mantém estritamente conversas individuais (@s.whatsapp.net)
  if (!lowerJid.endsWith('@s.whatsapp.net')) {
    return null;
  }

  // Remove sufixo @s.whatsapp.net e eventual identificador de dispositivo (:12)
  const beforeAt = resolvedJid.split('@')[0];
  const cleanNumber = stripNullBytes(beforeAt.split(':')[0]).trim();

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
  if (typeof msg.conversation === 'string') {
    const text = stripNullBytes(msg.conversation);
    if (text.trim() !== '') {
      return {
        tipo_mensagem: 'texto',
        conteudo: text,
      };
    }
  }

  // 2. Texto estendido (respostas, links, formatação)
  if (typeof msg.extendedTextMessage?.text === 'string') {
    const text = stripNullBytes(msg.extendedTextMessage.text);
    if (text.trim() !== '') {
      return {
        tipo_mensagem: 'texto',
        conteudo: text,
      };
    }
  }

  // 3. Documentos / PDFs
  if (msg.documentMessage && typeof msg.documentMessage === 'object') {
    // TODO Fase 2: download e upload para S3/MinIO
    const fileName =
      safeTrim(msg.documentMessage.fileName) ||
      safeTrim(msg.documentMessage.title) ||
      'documento_sem_nome';
    const mimetype = safeTrim(msg.documentMessage.mimetype) || 'application/octet-stream';
    const caption = safeTrim(msg.documentMessage.caption);

    const metadata = `${fileName} (${mimetype})`;
    return {
      tipo_mensagem: 'documento',
      conteudo: caption ? `${metadata} — ${caption}` : metadata,
    };
  }

  // 4. Imagens
  if (msg.imageMessage && typeof msg.imageMessage === 'object') {
    // TODO Fase 2: download e upload para S3/MinIO
    const caption = safeTrim(msg.imageMessage.caption);
    return {
      tipo_mensagem: 'imagem',
      conteudo: caption ? `[Imagem] ${caption}` : '[Imagem sem legenda]',
    };
  }

  // 5. Áudios / mensagens de voz
  if (msg.audioMessage && typeof msg.audioMessage === 'object') {
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
  if (msg.videoMessage && typeof msg.videoMessage === 'object') {
    // TODO Fase 2: download e upload para S3/MinIO
    const caption = safeTrim(msg.videoMessage.caption);
    return {
      tipo_mensagem: 'outro',
      conteudo: caption ? `[Vídeo] ${caption}` : '[Vídeo sem legenda]',
    };
  }

  if (msg.stickerMessage && typeof msg.stickerMessage === 'object') {
    return {
      tipo_mensagem: 'outro',
      conteudo: '[Figurinha]',
    };
  }

  if (msg.contactMessage && typeof msg.contactMessage === 'object') {
    const displayName = safeTrim(msg.contactMessage.displayName) || 'Sem nome';
    return {
      tipo_mensagem: 'outro',
      conteudo: `[Contato compartilhado: ${displayName}]`,
    };
  }

  if (msg.contactsArrayMessage && typeof msg.contactsArrayMessage === 'object') {
    const total = Array.isArray(msg.contactsArrayMessage.contacts)
      ? msg.contactsArrayMessage.contacts.length
      : 0;
    return {
      tipo_mensagem: 'outro',
      conteudo: `[${total || 'Vários'} contatos compartilhados]`,
    };
  }

  if (
    (msg.locationMessage && typeof msg.locationMessage === 'object') ||
    (msg.liveLocationMessage && typeof msg.liveLocationMessage === 'object')
  ) {
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

  const messageId = safeTrim(key.id);
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

  const pushNameClean = safeTrim(item.pushName);
  const pushName = pushNameClean ? pushNameClean.slice(0, 150) : null;

  return {
    message_id: messageId.slice(0, 100),
    instancia: safeTrim(instanceName).slice(0, 50),
    telefone_cliente: telefoneCliente.slice(0, 50),
    nome_contato: pushName,
    enviada_por_nos: Boolean(key.fromMe),
    tipo_mensagem: extracted.tipo_mensagem,
    conteudo: extracted.conteudo,
    criado_em: parseTimestamp(item.messageTimestamp),
  };
}

/**
 * Extrai informações de atualização de conexão (`connection.update` / `CONNECTION_UPDATE`)
 * apenas para log operacional em tempo real no terminal.
 */
export function parseConnectionUpdate(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (normalizeEventName(payload.event) !== 'connection.update') {
    return null;
  }

  const instancia = safeTrim(payload.instance);
  const state = safeTrim(payload.data?.state || payload.data?.connection);
  if (!instancia || !state) {
    return null;
  }

  return {
    instancia,
    state,
    statusReason: payload.data?.statusReason ?? null,
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

  const instancia = safeTrim(payload.instance);
  if (!instancia) {
    return [];
  }

  const rawData = payload.data;
  if (!rawData || typeof rawData !== 'object') {
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
