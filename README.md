# Monitor Jurídico — Espelhamento WhatsApp (PoC)

Sistema 100% local para espelhar, monitorar em tempo real e armazenar conversas individuais (`@s.whatsapp.net`) de múltiplos aparelhos corporativos do escritório jurídico conectados via **Evolution API v2**.

---

## Como o Projeto Funciona Hoje

O fluxo ponta a ponta ocorre em **4 camadas locais**:

```text
WhatsApp Corporativo
        │
        ▼
Evolution API v2 (porta 8080)
        │  POST /webhook (MESSAGES_UPSERT, CONNECTION_UPDATE)
        ▼
Backend Node.js + Express (porta 3000)
   ├── Responde HTTP 200 OK imediatamente (sem timeout/retentativa)
   ├── Filtra apenas conversas individuais (@s.whatsapp.net)
   │   ↳ Ignora grupos (@g.us), status@broadcast, canais e recibos
   ├── Exibe log colorido em tempo real no terminal
   ├── Persiste no PostgreSQL local (porta 5432, banco poc_juridico)
   │   ↳ Idempotência garantida por ON CONFLICT (message_id) DO NOTHING
   └── Emite eventos em tempo real via SSE (GET /api/events)
        │
        ▼
Front-end Web React + Vite (porta 5173)
   ├── Sidebar com todos os aparelhos + status ao vivo + botão "+ Conectar Aparelho"
   ├── Lista de conversas com busca (nome, telefone e conteúdo) e filtro "Com PDF"
   ├── Visualizador de mensagens somente leitura (texto + cards de anexo PDF/Imagem/Áudio)
   └── Atualização instantânea sem recarregar a página (SSE) + Modo Claro/Escuro
```

### Escopo Atual (Fase 1)
- **Conversas monitoradas:** apenas chats individuais (`@s.whatsapp.net`).
- **Tipos suportados:** `texto`, `documento` (nome do arquivo + mimetype + legenda), `imagem`, `audio` e `outro`.
- **Anexos/PDFs:** registrados como metadados na tabela `mensagens` e exibidos em cards dedicados no front-end (*download/storage S3 ou MinIO previsto para a Fase 2*).
- **Visualização:** painel web em modo **somente leitura** (espelhamento e auditoria).

---

## Estrutura de Pastas

```text
Whatsapp_Automation/
├── evolution-api/                    # Serviço externo da Evolution API v2 (porta 8080)
├── scripts/
│   └── test-webhook.js               # Simula 3 eventos reais (texto recebido, enviado e PDF)
├── src/                              # Backend Node.js + Express + pg + SSE (porta 3000)
│   ├── config/                       # env.js e database.js (pg.Pool)
│   ├── controllers/                  # webhook, health, instances e conversations/SSE
│   ├── database/                     # init.sql e setup.js
│   ├── routes/                       # index.js, instanceRoutes.js, conversationRoutes.js
│   ├── services/                     # evolutionParser, evolutionService, messageService, sseService, terminalLogger
│   └── server.js                     # Ponto de entrada do backend
├── web/                              # Front-end React + Vite + Tailwind CSS (porta 5173)
│   ├── src/
│   │   ├── components/               # Sidebar, ConversationList, ChatView, AttachmentCard, ConnectDeviceModal
│   │   ├── hooks/                    # useRealtimeEvents (SSE), useDebouncedValue, useTheme
│   │   ├── services/api.js           # Cliente REST do backend
│   │   └── utils/formatters.js       # Telefone BR (+55), datas, iniciais e anexos
│   ├── .env
│   └── package.json
├── .env                              # Variáveis locais do backend (não versionado)
├── .env.example
└── package.json
```

---

## Pré-requisitos e Configuração Inicial (Apenas na 1ª Vez)

### 1. Pré-requisitos
- **Node.js** v20+
- **PostgreSQL** instalado e rodando como serviço local na porta `5432`
- **Evolution API v2** configurada na pasta `evolution-api/`

> **Nota para Windows PowerShell:** se o comando `npm` retornar erro de política de execução (`npm.ps1 não pode ser carregado`), use `npm.cmd` exatamente como nos comandos abaixo.

### 2. Instalar dependências (raiz e front-end)
```powershell
npm.cmd install
npm.cmd --prefix web install
```

### 3. Configurar variáveis de ambiente
Crie o `.env` na raiz do projeto (se ainda não existir):
```powershell
Copy-Item .env.example .env
```

Edite o `.env` da raiz e confirme os dados do **PostgreSQL** e a **API Key real** da sua Evolution API:
```env
PORT=3000
NODE_ENV=development

PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=sua_senha_postgres
PGDATABASE=poc_juridico
PG_POOL_MAX=10

EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=mesma_chave_de_AUTHENTICATION_API_KEY_da_evolution_api
```

> **Importante:** `EVOLUTION_API_KEY` precisa ser **idêntica** à chave `AUTHENTICATION_API_KEY` definida no `.env` da `evolution-api/`. Caso contrário, a criação de instâncias retornará `401 Unauthorized`.

Confirme também o arquivo `web/.env`:
```env
VITE_API_URL=http://localhost:3000
```

### 4. Criar o banco de dados `poc_juridico` e a tabela `mensagens`
```powershell
psql -U postgres -c "CREATE DATABASE poc_juridico;"
psql -U postgres -d poc_juridico -f src/database/init.sql
```

*(Alternativa via Node, após criar o banco e configurar o `.env`)*:
```powershell
npm.cmd run db:setup
```

---

## Quantos Terminais São Necessários e O Que Colar em Cada Um

Para rodar o sistema completo localmente, você precisa de **3 terminais abertos simultaneamente** (o **PostgreSQL** já roda em segundo plano como serviço do Windows na porta `5432`), mais **1 terminal opcional** caso queira rodar testes simulados ou consultas SQL.

| Terminal | Serviço | Porta | Obrigatório? |
| --- | --- | --- | --- |
| *(Serviço do Windows)* | PostgreSQL (`poc_juridico`) | `5432` | Sim (em segundo plano) |
| **Terminal 1** | Evolution API v2 | `8080` | Sim (para celular real / QR Code) |
| **Terminal 2** | Backend (Express + PG + SSE) | `3000` | **Sim** |
| **Terminal 3** | Front-end Web (React + Vite) | `5173` | **Sim** |
| **Terminal 4** | Comandos avulsos / Testes | — | Opcional |

Abra cada terminal na pasta raiz do projeto (`Whatsapp_Automation`) e cole o bloco correspondente:

### Terminal 1 — Evolution API v2 (`http://localhost:8080`)
```powershell
cd evolution-api
npm.cmd start
```
*(Aguarde aparecer no log que a Evolution API subiu na porta `8080`.)*

### Terminal 2 — Backend Node.js (`http://localhost:3000`)
```powershell
npm.cmd start
```
*(Para desenvolvimento com recarregamento automático ao editar arquivos do backend, use `npm.cmd run dev`.)*

Você verá no terminal:
```text
[Server] PoC Jurídico Backend rodando em http://localhost:3000
[PostgreSQL] Conectado ao banco "poc_juridico" (...)
```
*(Mantenha este terminal aberto: ele exibe as mensagens chegando em tempo real e mantém o webhook + SSE ativos.)*

### Terminal 3 — Front-end Web (`http://localhost:5173`)
```powershell
cd web
npm.cmd run dev
```
Depois, abra no navegador: **`http://localhost:5173`**

### Terminal 4 (Opcional) — Testes Simulados e Verificações
Use este terminal apenas quando quiser testar sem encerrar os serviços acima:

```powershell
# 1. Conferir se backend e PostgreSQL estão saudáveis
curl.exe http://localhost:3000/health

# 2. Enviar 3 mensagens simuladas (texto recebido, enviado e PDF)
npm.cmd run test:webhook

# 3. Testar idempotência (rodar 2x com os mesmos message_ids — a 2ª é ignorada no banco)
node scripts/test-webhook.js --fixed
node scripts/test-webhook.js --fixed

# 4. Consultar as últimas mensagens gravadas no PostgreSQL
psql -U postgres -d poc_juridico -c "SELECT id, instancia, telefone_cliente, nome_contato, enviada_por_nos, tipo_mensagem, conteudo, criado_em FROM mensagens ORDER BY criado_em DESC LIMIT 10;"
```

---

## Como Parear um Celular Corporativo (WhatsApp Real)

Com os **Terminais 1, 2 e 3** rodando:

### Opção A — Diretamente pelo Front-end (Recomendado)
1. Acesse **`http://localhost:5173`**.
2. Na sidebar esquerda, clique em **"+ Conectar Aparelho"**.
3. Digite o nome da instância (ex.: `celular_juridico_01`) e clique em **Gerar QR Code**.
   - O backend cria a instância na Evolution API v2 (`WHATSAPP-BAILEYS`) e já configura automaticamente o webhook para `http://localhost:3000/webhook` nos eventos `MESSAGES_UPSERT` e `CONNECTION_UPDATE`.
4. No celular corporativo, abra **WhatsApp → Aparelhos conectados → Conectar um aparelho** e escaneie o QR Code na tela.
5. Assim que o pareamento concluir, o modal confirma a conexão e o aparelho aparece com ponto verde (**Conectado**) na sidebar.

### Opção B — Via Terminal + Navegador
No Terminal 4:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/instances" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"instanceName": "celular_juridico_01"}'
```
Depois abra no navegador para escanear:
```text
http://localhost:3000/instances/celular_juridico_01/qrcode
```
Para conferir o status da conexão:
```powershell
curl.exe http://localhost:3000/instances/celular_juridico_01/status
```

---

## Endpoints da API (Backend `:3000`)

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/health` | Verifica saúde da API e conectividade com o PostgreSQL (`SELECT 1`) |
| `POST` | `/webhook` | Recebe eventos da Evolution API v2 com resposta imediata `200 OK` |
| `POST` | `/instances` | Cria instância na Evolution API v2 com webhook automático |
| `GET` | `/instances/:name/status` | Consulta estado da instância (`open`, `connecting`, `close`) |
| `GET` | `/instances/:name/qrcode` | Página HTML com QR Code (`?format=json` para resposta JSON) |
| `GET` | `/api/events` | Stream **SSE** (`new_message`, `connection_update`, heartbeat a cada 25s) |
| `GET` | `/api/instances` | Lista instâncias (PostgreSQL + Evolution API) com status de conexão |
| `GET` | `/api/conversations` | Conversas agrupadas (`?instancia=`, `?search=`, `?onlyDocuments=true`) |
| `GET` | `/api/conversations/:instancia/:telefone/messages` | Histórico cronológico da conversa (`?limit=200&offset=0`) |

---

## Solução Rápida de Problemas

- **Erro de `fetch` / *"Não foi possível conectar ao backend em http://localhost:3000"*:** o **Terminal 2** (`npm.cmd start`) não está rodando. Inicie o backend e tente novamente.
- **Erro `502` / *"Não foi possível se comunicar com a Evolution API em http://localhost:8080"*:** o **Terminal 1** (`cd evolution-api` → `npm.cmd start`) está parado.
- **Erro `401 Unauthorized` ao criar instância:** a variável `EVOLUTION_API_KEY` no `.env` da raiz não coincide com a `AUTHENTICATION_API_KEY` da Evolution API. Atualize o `.env` e reinicie o **Terminal 2**.
- **PowerShell bloqueando `npm`:** use `npm.cmd` no lugar de `npm`.
- **Build de produção do front-end (validação):**
  ```powershell
  npm.cmd --prefix web run build
  ```
