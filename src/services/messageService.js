import { query } from '../config/database.js';

const INSERT_MESSAGE_SQL = `
  INSERT INTO mensagens (
    message_id,
    instancia,
    telefone_cliente,
    nome_contato,
    enviada_por_nos,
    tipo_mensagem,
    conteudo,
    criado_em
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  ON CONFLICT (message_id) DO NOTHING
  RETURNING
    id,
    message_id,
    instancia,
    telefone_cliente,
    nome_contato,
    enviada_por_nos,
    tipo_mensagem,
    conteudo,
    criado_em;
`;

const LIST_DISTINCT_INSTANCES_SQL = `
  SELECT DISTINCT instancia
  FROM mensagens
  ORDER BY instancia ASC;
`;

const LIST_CONVERSATIONS_SQL = `
  WITH latest AS (
    SELECT DISTINCT ON (instancia, telefone_cliente)
      instancia,
      telefone_cliente,
      nome_contato,
      conteudo AS ultima_mensagem,
      tipo_mensagem AS ultimo_tipo,
      enviada_por_nos,
      criado_em AS ultima_atualizacao
    FROM mensagens
    WHERE ($1::text IS NULL OR instancia = $1)
    ORDER BY instancia, telefone_cliente, criado_em DESC, id DESC
  ),
  stats AS (
    SELECT
      instancia,
      telefone_cliente,
      COUNT(*)::int AS total_mensagens,
      BOOL_OR(tipo_mensagem = 'documento') AS tem_documento,
      MAX(NULLIF(TRIM(nome_contato), '')) FILTER (WHERE enviada_por_nos = FALSE) AS nome_cliente_conhecido
    FROM mensagens
    WHERE ($1::text IS NULL OR instancia = $1)
    GROUP BY instancia, telefone_cliente
  )
  SELECT
    l.instancia,
    l.telefone_cliente,
    COALESCE(s.nome_cliente_conhecido, NULLIF(TRIM(l.nome_contato), '')) AS nome_contato,
    l.ultima_mensagem,
    l.ultimo_tipo,
    l.enviada_por_nos,
    l.ultima_atualizacao,
    s.total_mensagens,
    s.tem_documento
  FROM latest l
  INNER JOIN stats s
    ON s.instancia = l.instancia
   AND s.telefone_cliente = l.telefone_cliente
  WHERE ($2::boolean IS NOT TRUE OR s.tem_documento = TRUE)
    AND (
      $3::text IS NULL
      OR EXISTS (
        SELECT 1
        FROM mensagens m
        WHERE m.instancia = l.instancia
          AND m.telefone_cliente = l.telefone_cliente
          AND (
            m.nome_contato ILIKE $3
            OR m.telefone_cliente ILIKE $3
            OR m.conteudo ILIKE $3
          )
      )
    )
  ORDER BY l.ultima_atualizacao DESC;
`;

const LIST_CONVERSATION_MESSAGES_SQL = `
  SELECT
    id,
    message_id,
    instancia,
    telefone_cliente,
    nome_contato,
    enviada_por_nos,
    tipo_mensagem,
    conteudo,
    criado_em
  FROM mensagens
  WHERE instancia = $1
    AND telefone_cliente = $2
  ORDER BY criado_em ASC, id ASC
  LIMIT $3
  OFFSET $4;
`;

/**
 * Persiste uma mensagem normalizada no PostgreSQL garantindo idempotência via message_id.
 */
export async function saveMessage(message) {
  const params = [
    message.message_id,
    message.instancia,
    message.telefone_cliente,
    message.nome_contato,
    message.enviada_por_nos,
    message.tipo_mensagem,
    message.conteudo,
    message.criado_em,
  ];

  const result = await query(INSERT_MESSAGE_SQL, params);
  const row = result.rows[0] ?? null;

  return {
    inserted: result.rowCount > 0,
    id: row?.id ?? null,
    messageId: message.message_id,
    record: row,
  };
}

/**
 * Retorna os nomes distintos de instâncias já registradas na tabela mensagens.
 */
export async function listDistinctInstances() {
  const result = await query(LIST_DISTINCT_INSTANCES_SQL);
  return result.rows.map((row) => row.instancia).filter(Boolean);
}

/**
 * Lista conversas agrupadas por (instancia, telefone_cliente), ordenadas pela última atualização.
 */
export async function listConversations({ instancia = null, search = null, onlyDocuments = false } = {}) {
  const cleanInstancia = typeof instancia === 'string' && instancia.trim() ? instancia.trim() : null;
  const cleanSearch = typeof search === 'string' && search.trim() ? `%${search.trim()}%` : null;

  const result = await query(LIST_CONVERSATIONS_SQL, [
    cleanInstancia,
    Boolean(onlyDocuments),
    cleanSearch,
  ]);

  return result.rows;
}

/**
 * Retorna o histórico cronológico completo de uma conversa específica.
 */
export async function listConversationMessages({
  instancia,
  telefone,
  limit = 200,
  offset = 0,
}) {
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 200, 1), 500);
  const safeOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);

  const result = await query(LIST_CONVERSATION_MESSAGES_SQL, [
    instancia,
    telefone,
    safeLimit,
    safeOffset,
  ]);

  return result.rows;
}
