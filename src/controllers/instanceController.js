import { env } from '../config/env.js';
import {
  createInstance,
  EvolutionApiError,
  getInstanceQrCode,
  getInstanceStatus,
} from '../services/evolutionService.js';
import { formatError, logError, logInfo } from '../services/terminalLogger.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderQrHtmlPage({ title, bodyHtml, refreshSeconds = null }) {
  const refreshTag = refreshSeconds
    ? `<meta http-equiv="refresh" content="${refreshSeconds}">`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${refreshTag}
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 28px 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    }
    h1 { font-size: 1.2rem; margin: 0 0 8px; }
    .badge {
      display: inline-block;
      font-size: 0.85rem;
      padding: 4px 10px;
      border-radius: 999px;
      background: #0ea5e9;
      color: #082f49;
      font-weight: 600;
      margin-bottom: 18px;
    }
    .badge.ok { background: #22c55e; color: #052e16; }
    .badge.err { background: #ef4444; color: #fff; }
    .qr-box {
      background: #ffffff;
      padding: 14px;
      border-radius: 10px;
      display: inline-block;
      margin: 8px 0 16px;
    }
    .qr-box img { display: block; width: 280px; height: 280px; }
    .hint { color: #cbd5e1; font-size: 0.9rem; line-height: 1.5; margin: 8px 0; }
    .pairing {
      background: #0f172a;
      border: 1px dashed #475569;
      border-radius: 8px;
      padding: 8px 12px;
      font-family: monospace;
      font-size: 1rem;
      letter-spacing: 0.12em;
      margin-top: 10px;
    }
    .btn {
      display: inline-block;
      margin-top: 16px;
      padding: 10px 18px;
      background: #38bdf8;
      color: #082f49;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <main class="card">
    ${bodyHtml}
  </main>
</body>
</html>`;
}

function sendApiError(res, error, context) {
  if (error instanceof EvolutionApiError) {
    logError('Evolution', `${context}: ${error.message}`);
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details ?? undefined,
    });
  }

  logError('Evolution', `${context}: ${formatError(error)}`);
  return res.status(500).json({
    error: 'Erro interno ao se comunicar com a Evolution API.',
  });
}

export async function handleCreateInstance(req, res) {
  try {
    const instanceName = req.body?.instanceName;
    const result = await createInstance(instanceName);

    logInfo(
      'Evolution',
      `Instância "${result.instanceName}" criada com webhook em ${result.webhookUrl}`,
    );

    return res.status(201).json({
      instanceName: result.instanceName,
      status: result.status,
      webhookUrl: result.webhookUrl,
      qrPageUrl: `http://localhost:${env.port}/instances/${encodeURIComponent(result.instanceName)}/qrcode`,
      qrcode: result.qrcode,
    });
  } catch (error) {
    return sendApiError(res, error, 'Falha ao criar instância');
  }
}

export async function handleGetInstanceStatus(req, res) {
  try {
    const status = await getInstanceStatus(req.params.name);

    return res.status(200).json({
      instanceName: status.instanceName,
      state: status.state,
      connected: status.connected,
    });
  } catch (error) {
    return sendApiError(res, error, `Falha ao consultar status da instância "${req.params.name}"`);
  }
}

export async function handleGetInstanceQrCode(req, res) {
  const rawName = req.params.name;
  const wantsJson = req.query.format === 'json';

  try {
    // Verifica primeiro se o aparelho já está conectado
    const currentStatus = await getInstanceStatus(rawName);

    if (currentStatus.connected) {
      if (wantsJson) {
        return res.status(200).json({
          instanceName: currentStatus.instanceName,
          state: currentStatus.state,
          connected: true,
          base64: null,
        });
      }

      const safeName = escapeHtml(currentStatus.instanceName);
      return res
        .status(200)
        .type('html')
        .send(
          renderQrHtmlPage({
            title: `Conectado — ${currentStatus.instanceName}`,
            bodyHtml: `
              <h1>Instância ${safeName}</h1>
              <span class="badge ok">CONECTADA (open)</span>
              <p class="hint">Este aparelho já está pareado e enviando eventos para o webhook local.</p>
              <a class="btn" href="/instances/${encodeURIComponent(currentStatus.instanceName)}/status">Ver status JSON</a>
            `,
          }),
        );
    }

    const qr = await getInstanceQrCode(rawName);

    if (wantsJson) {
      return res.status(200).json({
        instanceName: qr.instanceName,
        state: qr.state || currentStatus.state,
        connected: qr.connected,
        base64: qr.base64,
        pairingCode: qr.pairingCode,
        code: qr.code,
      });
    }

    const safeName = escapeHtml(qr.instanceName);

    if (!qr.base64) {
      return res
        .status(200)
        .type('html')
        .send(
          renderQrHtmlPage({
            title: `Aguardando QR Code — ${qr.instanceName}`,
            refreshSeconds: 4,
            bodyHtml: `
              <h1>Instância ${safeName}</h1>
              <span class="badge">GERANDO QR CODE...</span>
              <p class="hint">A Evolution API ainda está inicializando o QR Code. Esta página será atualizada automaticamente em alguns segundos.</p>
              <a class="btn" href="">Recarregar agora</a>
            `,
          }),
        );
    }

    const pairingHtml = qr.pairingCode
      ? `<div class="pairing">Código: ${escapeHtml(qr.pairingCode)}</div>`
      : '';

    return res
      .status(200)
      .type('html')
      .send(
        renderQrHtmlPage({
          title: `Parear WhatsApp — ${qr.instanceName}`,
          refreshSeconds: 30,
          bodyHtml: `
            <h1>Parear WhatsApp</h1>
            <span class="badge">${safeName}</span>
            <div class="qr-box">
              <img src="${qr.base64}" alt="QR Code WhatsApp da instância ${safeName}" />
            </div>
            <p class="hint">
              No celular corporativo, abra o <strong>WhatsApp</strong> &rarr;
              <strong>Aparelhos conectados</strong> &rarr; <strong>Conectar um aparelho</strong> e aponte a câmera.
            </p>
            ${pairingHtml}
            <p class="hint" style="font-size:0.8rem;color:#94a3b8;">A página atualiza automaticamente a cada 30s.</p>
            <a class="btn" href="">Atualizar QR Code</a>
          `,
        }),
      );
  } catch (error) {
    if (wantsJson) {
      return sendApiError(res, error, `Falha ao obter QR Code da instância "${rawName}"`);
    }

    const statusCode = error instanceof EvolutionApiError ? error.statusCode : 500;
    const message = error instanceof EvolutionApiError ? error.message : formatError(error);
    logError('Evolution', `Falha ao renderizar QR Code da instância "${rawName}": ${message}`);

    return res
      .status(statusCode)
      .type('html')
      .send(
        renderQrHtmlPage({
          title: `Erro — ${rawName}`,
          bodyHtml: `
            <h1>Não foi possível carregar o QR Code</h1>
            <span class="badge err">HTTP ${statusCode}</span>
            <p class="hint">${escapeHtml(message)}</p>
            <a class="btn" href="">Tentar novamente</a>
          `,
        }),
      );
  }
}
