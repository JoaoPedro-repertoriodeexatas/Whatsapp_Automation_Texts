# PoC Jurídico — Backend de Monitoramento WhatsApp (Evolution API v2)

Backend local em Node.js + Express + PostgreSQL (`pg`) para receber eventos da **Evolution API v2** via webhook, exibir as conversas em tempo real no terminal e persistir o histórico estruturado no banco `poc_juridico`.

## Estrutura do Projeto

```text
├── scripts/
│   └── test-webhook.js          # Simula 3 payloads reais da Evolution API v2
├── src/
│   ├── config/
│   │   ├── database.js          # Connection Pool (pg) e healthcheck
│   │   └── env.js               # Carregamento de variáveis (.env)
│   ├── controllers/
│   │   ├── healthController.js  # GET /health
│   │   └── webhookController.js # POST /webhook (200 OK imediato + async)
│   ├── database/
│   │   ├── init.sql             # Schema da tabela mensagens + índices
│   │   └── setup.js             # Script opcional para aplicar o init.sql via Node
│   ├── routes/
│   │   └── index.js             # Registro de rotas
│   ├── services/
│   │   ├── evolutionParser.js   # Parser/filtro do evento messages.upsert
│   │   ├── messageService.js    # Persistência SQL parametrizada (idempotente)
│   │   └── terminalLogger.js    # Log colorido nativo (ANSI) no terminal
│   └── server.js                # Entrypoint HTTP + graceful shutdown
├── .env.example
├── .gitignore
└── package.json
```

---

## Pré-requisitos

- **Node.js** v20+
- **PostgreSQL** instalado e rodando localmente (porta padrão `5432`)
- **Evolution API v2** rodando localmente na porta `8080` (opcional para o teste simulado)

---

## 1. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e ajuste a senha/usuário do seu PostgreSQL local:

```powershell
Copy-Item .env.example .env
```

---

## 2. Criar o Banco e Rodar o `init.sql`

Crie o banco `poc_juridico` no PostgreSQL:

```powershell
psql -U postgres -c "CREATE DATABASE poc_juridico;"
```

Aplique o script de criação da tabela e índices:

```powershell
psql -U postgres -d poc_juridico -f src/database/init.sql
```

*(Alternativa via Node, após configurar o `.env`)*:

```powershell
npm run db:setup
```

---

## 3. Iniciar o Servidor

```powershell
npm start
```

Para desenvolvimento com reload automático (Node 20+):

```powershell
npm run dev
```

Valide a saúde da API e do PostgreSQL:

```powershell
curl http://localhost:3000/health
```

---

## 4. Testar Localmente (Sem Parear Celular)

Em outro terminal, com o servidor rodando, execute:

```powershell
npm run test:webhook
```

Para testar a idempotência (`ON CONFLICT (message_id) DO NOTHING`), rode duas vezes com IDs fixos:

```powershell
node scripts/test-webhook.js --fixed
node scripts/test-webhook.js --fixed
```

Para conferir os registros salvos no banco:

```powershell
psql -U postgres -d poc_juridico -c "SELECT id, instancia, telefone_cliente, nome_contato, enviada_por_nos, tipo_mensagem, conteudo, criado_em FROM mensagens ORDER BY criado_em DESC;"
```

---

## 5. Configurar na Evolution API v2

Ao parear cada aparelho corporativo (instância) na Evolution API v2 (`http://localhost:8080`), configure o webhook da instância apontando para:

- **URL:** `http://localhost:3000/webhook`
- **Evento:** `MESSAGES_UPSERT`
- **Webhook by Events:** `false` (para enviar tudo em `POST /webhook`)
