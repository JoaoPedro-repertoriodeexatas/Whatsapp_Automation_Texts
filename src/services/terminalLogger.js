const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const TYPE_COLORS = {
  texto: ANSI.white,
  documento: ANSI.yellow,
  imagem: ANSI.magenta,
  audio: ANSI.cyan,
  outro: ANSI.gray,
};

function formatTime(date = new Date()) {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return safeDate.toLocaleTimeString('pt-BR', { hour12: false });
}

function sanitizeInline(text) {
  if (!text) return '';
  return String(text).replace(/\r?\n/g, ' ↵ ').trim();
}

export function logIncomingMessage(msg) {
  const time = `${ANSI.gray}${formatTime(msg.criado_em)}${ANSI.reset}`;
  const instancia = `${ANSI.bold}${ANSI.cyan}[${msg.instancia}]${ANSI.reset}`;
  const direcao = msg.enviada_por_nos
    ? `${ANSI.bold}${ANSI.green}ENVIADA ->${ANSI.reset}`
    : `${ANSI.bold}${ANSI.blue}<- RECEBIDA${ANSI.reset}`;

  const contato = msg.nome_contato
    ? `${ANSI.bold}${msg.nome_contato}${ANSI.reset} ${ANSI.dim}(${msg.telefone_cliente})${ANSI.reset}`
    : `${ANSI.bold}${msg.telefone_cliente}${ANSI.reset}`;

  const typeColor = TYPE_COLORS[msg.tipo_mensagem] || ANSI.white;
  const tipo = `${typeColor}[${msg.tipo_mensagem.toUpperCase()}]${ANSI.reset}`;
  const conteudo = sanitizeInline(msg.conteudo);

  console.log(`${time} ${instancia} ${direcao} ${contato} ${tipo} ${conteudo}`);
}

export function logInfo(scope, message) {
  const time = `${ANSI.gray}${formatTime()}${ANSI.reset}`;
  console.log(`${time} ${ANSI.cyan}[${scope}]${ANSI.reset} ${message}`);
}

export function logWarn(scope, message) {
  const time = `${ANSI.gray}${formatTime()}${ANSI.reset}`;
  console.warn(`${time} ${ANSI.yellow}[${scope}]${ANSI.reset} ${message}`);
}

export function formatError(error) {
  if (!error) return 'Erro desconhecido';
  if (error.message) return error.message;
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors.map((e) => e.message || e.code || String(e)).join('; ');
  }
  if (error.code) return error.code;
  return String(error);
}

export function logError(scope, message, error) {
  const time = `${ANSI.gray}${formatTime()}${ANSI.reset}`;
  const detail = error ? ` — ${formatError(error)}` : '';
  console.error(`${time} ${ANSI.red}[${scope}]${ANSI.reset} ${message}${detail}`);
}
