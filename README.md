# PoC Jurídico — Backend de Monitoramento WhatsApp (Evolution API v2)

Backend local em Node.js + Express + PostgreSQL (`pg`) para receber eventos da **Evolution API v2** via webhook, gerenciar o pareamento de aparelhos corporativos via QR Code, exibir as conversas individuais (`@s.whatsapp.net`) em tempo real no terminal e persistir o histórico estruturado no banco `poc_juridico`.

## Estrutura do Projeto

```text
├── scripts/
│   └── test-webhook.js            # Simula 3 payloads reais da Evolution API v2
├── src/
│   ├── config/
│   │   ├── database.js            # Connection Pool (pg) e healthcheck
│   │   └── env.js                 # Carregamento e validação de variáveis (.env)
│   ├── controllers/
│   │   ├── healthController.js    # GET /health
│   │   ├── instanceController.js  # POST /instances, GET /:name/status e /:name/qrcode
│   │   └── webhookController.js   # POST /webhook (200 OK imediato + async)
│   ├── database/
│   │   ├── init.sql               # Schema da tabela mensagens + índices
│   │   └── setup.js               # Script opcional para aplicar o init.sql via Node
│   ├── routes/
│   │   ├── index.js               # Registro principal de rotas
│   │   └── instanceRoutes.js      # Rotas de criação, status e QR Code de instâncias
│   ├── services/
│   │   ├── evolutionParser.js     # Parser/filtro de messages.upsert e connection.update
│   │   ├── evolutionService.js    # Cliente REST (fetch nativo) para Evolution API v2
│   │   ├── messageService.js      # Persistência SQL parametrizada (idempotente)
│   │   └── terminalLogger.js      # Log colorido nativo (ANSI) no terminal
│   └── server.js                  # Entrypoint HTTP + graceful shutdown
├── .env.example
├── .gitignore
└── package.json
```

---

## Pré-requisitos

- **Node.js** v20+
- **PostgreSQL** rodando localmente (porta padrão `5432`)
- **Evolution API v2** rodando localmente em `http://localhost:8080`

---

## 1. Configurar Variáveis de Ambiente

Copie o `.env.example` para `.env` e preencha as credenciais do PostgreSQL e da sua Evolution API v2 (`EVOLUTION_API_URL` e `EVOLUTION_API_KEY`):

```powershell
Copy-Item .env.example .env
```

---

## 2. Criar o Banco e Rodar o `init.sql`

```powershell
psql -U postgres -c "CREATE DATABASE poc_juridico;"
psql -U postgres -d poc_juridico -f src/database/init.sql
```

*(Alternativa via Node após configurar o `.env`)*:

```powershell
npm run db:setup
```

---

## 3. Iniciar o Backend

```powershell
npm start
```

Valide o servidor e a conexão com o PostgreSQL:

```powershell
curl.exe http://localhost:3000/health
```

*(Para testar o webhook sem celular pareado)*:

```powershell
npm run test:webhook
```

---

## 4. Parear um WhatsApp Real (`celular_juridico_01`)

Com o **PostgreSQL**, a **Evolution API v2** (`http://localhost:8080`) e este backend (`http://localhost:3000`) rodando:

### Passo 1 — Criar a primeira instância com webhook automático

No PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/instances" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"instanceName": "celular_juridico_01"}'
```

Ou via `curl.exe`:

```powershell
curl.exe -X POST http://localhost:3000/instances -H "Content-Type: application/json" -d "{\"instanceName\":\"celular_juridico_01\"}"
```

Isso cria a instância com `integration: "WHATSAPP-BAILEYS"`, `qrcode: true` e já registra o webhook em `http://localhost:3000/webhook` ouvindo `MESSAGES_UPSERT` e `CONNECTION_UPDATE`.

### Passo 2 — Abrir o QR Code no navegador e escanear

1. Abra no navegador:
   ```text
   http://localhost:3000/instances/celular_juridico_01/qrcode
   ```
2. No celular corporativo, abra o **WhatsApp** → **Aparelhos conectados** → **Conectar um aparelho** e escaneie o QR Code exibido na tela.
   - *(Dica: caso precise consumir o QR Code via JSON no front-end futuro, acesse `http://localhost:3000/instances/celular_juridico_01/qrcode?format=json`.)*

### Passo 3 — Confirmar conexão

No terminal do servidor você verá o evento `CONNECTION_UPDATE` mudar para `open`. Também é possível consultar via HTTP:

```powershell
curl.exe http://localhost:3000/instances/celular_juridico_01/status
```

Resposta esperada quando conectado:

```json
{"instanceName":"celular_juridico_01","state":"open","connected":true}
```

### Passo 4 — Validar recebimento de uma mensagem real

1. Envie uma mensagem de texto ou PDF de outro celular para o número pareado em `celular_juridico_01` (conversas individuais `@s.whatsapp.net`; grupos `@g.us` e `status@broadcast` são ignorados automaticamente).
2. Confirme no **terminal do servidor** a linha colorida em tempo real:
   ```text
   22:35:10 [celular_juridico_01] <- RECEBIDA Nome do Cliente (55119...) [TEXTO] Mensagem enviada
   ```
3. Confirme a persistência no **PostgreSQL**:
   ```powershell
   psql -U postgres -d poc_juridico -c "SELECT id, instancia, telefone_cliente, nome_contato, enviada_por_nos, tipo_mensagem, conteudo, criado_em FROM mensagens ORDER BY criado_em DESC LIMIT 10;"
   ```
