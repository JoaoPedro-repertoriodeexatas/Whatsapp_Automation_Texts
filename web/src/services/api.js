const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_URL = RAW_API_URL.replace(/\/+$/, '');

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    throw new Error(
      `Não foi possível conectar ao backend em ${API_URL}. Verifique se o servidor Node (npm.cmd start) está rodando.`,
    );
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `Erro HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.details = data?.details;
    throw err;
  }

  return data;
}

export async function fetchInstances(signal) {
  const data = await request('/api/instances', { signal });
  return Array.isArray(data?.instances) ? data.instances : [];
}

export async function fetchConversations({ instancia, search, onlyDocuments } = {}, signal) {
  const params = new URLSearchParams();
  if (instancia) params.set('instancia', instancia);
  if (search && search.trim()) params.set('search', search.trim());
  if (onlyDocuments) params.set('onlyDocuments', 'true');

  const qs = params.toString();
  const data = await request(`/api/conversations${qs ? `?${qs}` : ''}`, { signal });
  return Array.isArray(data?.conversations) ? data.conversations : [];
}

export async function fetchConversationMessages(
  { instancia, telefone, limit = 200, offset = 0 },
  signal,
) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const encodedInst = encodeURIComponent(instancia);
  const encodedTel = encodeURIComponent(telefone);
  const data = await request(
    `/api/conversations/${encodedInst}/${encodedTel}/messages?${params.toString()}`,
    { signal },
  );
  return Array.isArray(data?.messages) ? data.messages : [];
}

export async function createInstance(instanceName) {
  return request('/instances', {
    method: 'POST',
    body: JSON.stringify({ instanceName }),
  });
}

export async function fetchInstanceQrCode(instanceName, signal) {
  const encoded = encodeURIComponent(instanceName);
  return request(`/instances/${encoded}/qrcode?format=json`, { signal });
}

export async function fetchInstanceStatus(instanceName, signal) {
  const encoded = encodeURIComponent(instanceName);
  return request(`/instances/${encoded}/status`, { signal });
}
