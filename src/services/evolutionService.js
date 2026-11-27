import { env } from '../config/env.js';

const INSTANCE_NAME_REGEX = /^[a-zA-Z0-9_-]{1,50}$/;
const REQUEST_TIMEOUT_MS = 15_000;

export class EvolutionApiError extends Error {
  constructor(message, { statusCode = 502, details = null } = {}) {
    super(message);
    this.name = 'EvolutionApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function validateInstanceName(instanceName) {
  if (typeof instanceName !== 'string' || !INSTANCE_NAME_REGEX.test(instanceName.trim())) {
    throw new EvolutionApiError(
      'Nome de instância inválido. Use de 1 a 50 caracteres (apenas letras, números, "_" ou "-").',
      { statusCode: 400 },
    );
  }
  return instanceName.trim();
}

function normalizeBase64DataUri(rawBase64) {
  if (typeof rawBase64 !== 'string' || !rawBase64.trim()) {
    return null;
  }
  const trimmed = rawBase64.trim();
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  return `data:image/png;base64,${trimmed}`;
}

function extractErrorMessage(body, fallbackStatus) {
  if (!body) return `Erro HTTP ${fallbackStatus} na Evolution API.`;
  if (typeof body === 'string') return body;

  const candidate =
    body.response?.message ??
    body.message ??
    body.error;

  if (Array.isArray(candidate)) {
    return candidate.join('; ');
  }
  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate.trim();
  }
  return `Erro HTTP ${fallbackStatus} na Evolution API.`;
}

async function evolutionRequest(endpointPath, { method = 'GET', body } = {}) {
  if (!env.evolution.apiKey) {
    throw new EvolutionApiError(
      'EVOLUTION_API_KEY não configurada no arquivo .env.',
      { statusCode: 500 },
    );
  }

  const url = `${env.evolution.apiUrl}${endpointPath}`;
  const headers = {
    apikey: env.evolution.apiKey,
    Accept: 'application/json',
  };

  const fetchOptions = {
    method,
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    const causeErrors = Array.isArray(error?.cause?.errors)
      ? error.cause.errors.map((e) => e.code || e.message).filter(Boolean).join(', ')
      : '';
    const reason =
      error?.name === 'TimeoutError'
        ? `tempo limite excedido (${REQUEST_TIMEOUT_MS / 1000}s)`
        : error?.cause?.code || causeErrors || error?.message || 'falha de rede';

    throw new EvolutionApiError(
      `Não foi possível se comunicar com a Evolution API em ${env.evolution.apiUrl} (${reason}).`,
      { statusCode: 502 },
    );
  }

  const rawText = await response.text();
  let data = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

  if (!response.ok) {
    throw new EvolutionApiError(extractErrorMessage(data, response.status), {
      statusCode: response.status >= 400 && response.status < 600 ? response.status : 502,
      details: data,
    });
  }

  return data;
}

/**
 * Cria uma nova instância Baileys na Evolution API v2 já com QR Code habilitado
 * e webhook apontando para o backend local.
 */
export async function createInstance(instanceName) {
  const safeName = validateInstanceName(instanceName);

  const payload = {
    instanceName: safeName,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
    webhook: {
      url: env.webhookUrl,
      byEvents: false,
      base64: false,
      events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
    },
  };

  const data = await evolutionRequest('/instance/create', {
    method: 'POST',
    body: payload,
  });

  const qrRaw = data?.qrcode?.base64 ?? data?.base64 ?? null;

  return {
    instanceName: data?.instance?.instanceName || safeName,
    status: data?.instance?.status || 'created',
    webhookUrl: env.webhookUrl,
    qrcode: {
      base64: normalizeBase64DataUri(qrRaw),
      code: data?.qrcode?.code ?? data?.code ?? null,
      pairingCode: data?.qrcode?.pairingCode ?? data?.pairingCode ?? null,
      count: data?.qrcode?.count ?? data?.count ?? null,
    },
    raw: data,
  };
}

/**
 * Obtém o QR Code (base64 / pairing code) de uma instância existente para pareamento ou reconexão.
 */
export async function getInstanceQrCode(instanceName) {
  const safeName = validateInstanceName(instanceName);
  const data = await evolutionRequest(`/instance/connect/${encodeURIComponent(safeName)}`, {
    method: 'GET',
  });

  const state = data?.instance?.state ?? null;
  const qrRaw = data?.base64 ?? data?.qrcode?.base64 ?? null;

  return {
    instanceName: safeName,
    state,
    connected: state === 'open',
    base64: normalizeBase64DataUri(qrRaw),
    code: data?.code ?? data?.qrcode?.code ?? null,
    pairingCode: data?.pairingCode ?? data?.qrcode?.pairingCode ?? null,
    count: data?.count ?? null,
    raw: data,
  };
}

/**
 * Consulta o estado atual da conexão da instância (`open`, `close` ou `connecting`).
 */
export async function getInstanceStatus(instanceName) {
  const safeName = validateInstanceName(instanceName);
  const data = await evolutionRequest(`/instance/connectionState/${encodeURIComponent(safeName)}`, {
    method: 'GET',
  });

  const state = data?.instance?.state ?? data?.state ?? 'unknown';

  return {
    instanceName: data?.instance?.instanceName || safeName,
    state,
    connected: state === 'open',
    raw: data,
  };
}

/**
 * Lista instâncias cadastradas atualmente na Evolution API v2.
 * Retorna array vazio caso a Evolution API esteja offline ou indisponível.
 */
export async function listEvolutionInstances() {
  try {
    const data = await evolutionRequest('/instance/fetchInstances', {
      method: 'GET',
    });

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map((item) => {
        const name = item?.name || item?.instance?.instanceName || item?.instanceName;
        const state = item?.connectionStatus || item?.instance?.state || item?.state || 'unknown';
        if (typeof name !== 'string' || !name.trim()) {
          return null;
        }
        return {
          instanceName: name.trim(),
          state,
          connected: state === 'open',
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}
