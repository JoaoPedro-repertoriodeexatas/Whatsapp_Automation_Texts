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
  RETURNING id, message_id;
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
  };
}
