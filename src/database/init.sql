-- ============================================================================
-- Script de Inicialização do Banco de Dados: poc_juridico
-- PoC de Monitoramento WhatsApp (Evolution API v2) - Setor Jurídico
-- ============================================================================
-- Crie o banco antes de executar este script:
--   createdb -U postgres poc_juridico
-- Ou via psql:
--   CREATE DATABASE poc_juridico;
-- Em seguida, execute:
--   psql -U postgres -d poc_juridico -f src/database/init.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS mensagens (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(100) UNIQUE NOT NULL,
    instancia VARCHAR(50) NOT NULL,
    telefone_cliente VARCHAR(50) NOT NULL,
    nome_contato VARCHAR(150),
    enviada_por_nos BOOLEAN NOT NULL,
    tipo_mensagem VARCHAR(30) NOT NULL
        CHECK (tipo_mensagem IN ('texto', 'documento', 'imagem', 'audio', 'outro')),
    conteudo TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice composto principal para listagem de histórico de uma conversa no front-end
-- Atende buscas por (instancia), (instancia, telefone_cliente) e ordenação cronológica
CREATE INDEX IF NOT EXISTS idx_mensagens_instancia_telefone_criado_em
    ON mensagens (instancia, telefone_cliente, criado_em DESC);

-- Índice para busca de um cliente em todas as instâncias/celulares do escritório
CREATE INDEX IF NOT EXISTS idx_mensagens_telefone_cliente
    ON mensagens (telefone_cliente, criado_em DESC);

-- Índice para feed global de mensagens mais recentes (painel de monitoramento)
CREATE INDEX IF NOT EXISTS idx_mensagens_criado_em
    ON mensagens (criado_em DESC);

-- Comentários de documentação no catálogo do PostgreSQL
COMMENT ON TABLE mensagens IS 'Histórico espelhado de mensagens WhatsApp recebidas/enviadas via Evolution API v2';
COMMENT ON COLUMN mensagens.message_id IS 'ID único da mensagem no WhatsApp/Evolution API (garante idempotência)';
COMMENT ON COLUMN mensagens.instancia IS 'Nome da instância na Evolution API identificando o aparelho corporativo';
COMMENT ON COLUMN mensagens.telefone_cliente IS 'Número do cliente limpo, sem sufixo @s.whatsapp.net';
COMMENT ON COLUMN mensagens.nome_contato IS 'Nome público do contato (pushName) no momento do evento';
COMMENT ON COLUMN mensagens.enviada_por_nos IS 'TRUE quando enviada pelo aparelho do escritório (fromMe)';
COMMENT ON COLUMN mensagens.tipo_mensagem IS 'Categoria normalizada: texto, documento, imagem, audio ou outro';
COMMENT ON COLUMN mensagens.conteudo IS 'Texto da mensagem ou metadados do arquivo/mídia (Fase 2: referência S3/MinIO)';
