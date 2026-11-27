import 'dotenv/config';

const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL || `http://localhost:${PORT}/webhook`;
const USE_FIXED_IDS = process.argv.includes('--fixed');
const suffix = USE_FIXED_IDS ? 'FIXED_001' : String(Date.now());
const nowUnix = Math.floor(Date.now() / 1000);

const payloads = [
  {
    label: '1) Texto recebido (cliente -> escritório)',
    body: {
      event: 'messages.upsert',
      instance: 'celular_civel_01',
      data: {
        key: {
          remoteJid: '5511987654321@s.whatsapp.net',
          fromMe: false,
          id: `BAE5TEXTRX_${suffix}`,
        },
        pushName: 'Maria Fernanda Oliveira',
        message: {
          conversation: 'Bom dia, Dr. João! Alguma novidade sobre a audiência da semana que vem?',
        },
        messageType: 'conversation',
        messageTimestamp: nowUnix,
      },
      destination: WEBHOOK_URL,
      date_time: new Date().toISOString(),
      sender: '5511911112222@s.whatsapp.net',
      server_url: 'http://localhost:8080',
    },
  },
  {
    label: '2) Texto enviado (escritório -> cliente)',
    body: {
      event: 'messages.upsert',
      instance: 'celular_civel_01',
      data: {
        key: {
          remoteJid: '5511987654321@s.whatsapp.net',
          fromMe: true,
          id: `BAE5TEXTTX_${suffix}`,
        },
        pushName: 'Escritório Jurídico',
        message: {
          extendedTextMessage: {
            text: 'Bom dia, Maria! A audiência foi confirmada para quarta-feira às 14h. Pode nos enviar a procuração assinada em PDF?',
          },
        },
        messageType: 'extendedTextMessage',
        messageTimestamp: nowUnix + 5,
      },
      destination: WEBHOOK_URL,
      date_time: new Date().toISOString(),
      sender: '5511911112222@s.whatsapp.net',
      server_url: 'http://localhost:8080',
    },
  },
  {
    label: '3) Documento PDF recebido (cliente -> escritório)',
    body: {
      event: 'messages.upsert',
      instance: 'celular_civel_01',
      data: {
        key: {
          remoteJid: '5511987654321@s.whatsapp.net',
          fromMe: false,
          id: `BAE5PDFRX_${suffix}`,
        },
        pushName: 'Maria Fernanda Oliveira',
        message: {
          documentMessage: {
            url: 'https://mmg.whatsapp.net/v/t62.7119-24/exemplo',
            mimetype: 'application/pdf',
            title: 'Procuracao_Ad_Judicia_Assinada.pdf',
            fileName: 'Procuracao_Ad_Judicia_Assinada.pdf',
            fileLength: '245120',
            pageCount: 2,
            caption: 'Segue a procuração assinada conforme solicitado.',
          },
        },
        messageType: 'documentMessage',
        messageTimestamp: nowUnix + 12,
      },
      destination: WEBHOOK_URL,
      date_time: new Date().toISOString(),
      sender: '5511911112222@s.whatsapp.net',
      server_url: 'http://localhost:8080',
    },
  },
];

async function run() {
  console.log(`Enviando ${payloads.length} eventos simulados da Evolution API v2 para ${WEBHOOK_URL}`);
  if (USE_FIXED_IDS) {
    console.log('Modo --fixed ativo: usando message_ids fixos para testar idempotência (ON CONFLICT DO NOTHING).');
  }
  console.log('');

  for (const item of payloads) {
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      });

      const responseBody = await response.text();
      console.log(`[HTTP ${response.status}] ${item.label} -> ${responseBody}`);
    } catch (error) {
      console.error(`[ERRO] ${item.label}: ${error.message}`);
      process.exitCode = 1;
    }
  }

  console.log('\nConcluído. Verifique os logs no terminal do servidor e a tabela "mensagens" no PostgreSQL.');
}

run();
