/**
 * Utilitários de formatação para números de telefone brasileiros, datas, iniciais e anexos.
 */

export function formatPhoneBR(rawPhone) {
  if (!rawPhone) return 'Número desconhecido';
  const digits = String(rawPhone).replace(/\D/g, '');

  // Formato completo com DDI Brasil (55 + DDD 2 dígitos + celular 9 dígitos)
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const p1 = digits.slice(4, 9);
    const p2 = digits.slice(9, 13);
    return `+55 (${ddd}) ${p1}-${p2}`;
  }

  // Formato fixo/antigo com DDI Brasil (55 + DDD 2 dígitos + 8 dígitos)
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const p1 = digits.slice(4, 8);
    const p2 = digits.slice(8, 12);
    return `+55 (${ddd}) ${p1}-${p2}`;
  }

  // Sem DDI (DDD + 9 dígitos)
  if (digits.length === 11) {
    return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  // Sem DDI (DDD + 8 dígitos)
  if (digits.length === 10) {
    return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  return digits ? `+${digits}` : String(rawPhone);
}

export function getDisplayName(nomeContato, telefoneCliente) {
  if (typeof nomeContato === 'string' && nomeContato.trim()) {
    return nomeContato.trim();
  }
  return formatPhoneBR(telefoneCliente);
}

export function getInitials(nomeContato, telefoneCliente) {
  if (typeof nomeContato === 'string' && nomeContato.trim()) {
    const parts = nomeContato
      .trim()
      .split(/\s+/)
      .filter((p) => /[a-zA-ZÀ-ÿ0-9]/.test(p));

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
  }

  const digits = String(telefoneCliente || '').replace(/\D/g, '');
  if (digits.length >= 2) {
    return digits.slice(-2);
  }
  return 'CL';
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getYesterday(now) {
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  return y;
}

export function formatConversationTime(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  if (isSameDay(date, now)) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  if (isSameDay(date, getYesterday(now))) {
    return 'Ontem';
  }

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays >= 0 && diffDays < 7) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' });
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export function formatMessageTime(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function getDateKey(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateSeparator(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  if (isSameDay(date, now)) return 'Hoje';
  if (isSameDay(date, getYesterday(now))) return 'Ontem';

  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getMediaBadgeLabel(tipoMensagem) {
  switch (tipoMensagem) {
    case 'documento':
      return 'PDF';
    case 'imagem':
      return 'Imagem';
    case 'audio':
      return 'Áudio';
    default:
      return null;
  }
}

export function parseAttachmentContent(tipoMensagem, conteudo) {
  const raw = typeof conteudo === 'string' ? conteudo.trim() : '';

  if (tipoMensagem === 'documento') {
    // Formato padrão do parser: "Arquivo.pdf (application/pdf) — Legenda opcional"
    const [mainPart, ...captionParts] = raw.split(' — ');
    const caption = captionParts.join(' — ').trim();
    const match = mainPart.match(/^(.+?)\s*\(([^)]+)\)$/);

    if (match) {
      return {
        title: match[1].trim(),
        meta: match[2].trim(),
        caption,
      };
    }

    return {
      title: mainPart || 'Documento anexado',
      meta: 'Documento',
      caption,
    };
  }

  if (tipoMensagem === 'imagem') {
    const cleaned = raw.replace(/^\[Imagem\]\s*/i, '').trim();
    const isEmptyPlaceholder = /^\[Imagem sem legenda\]$/i.test(raw) || !cleaned;
    return {
      title: isEmptyPlaceholder ? 'Imagem recebida' : 'Imagem anexada',
      meta: 'Imagem',
      caption: isEmptyPlaceholder ? '' : cleaned,
    };
  }

  if (tipoMensagem === 'audio') {
    const cleaned = raw.replace(/^\[|\]$/g, '').trim();
    return {
      title: cleaned || 'Mensagem de áudio',
      meta: 'Áudio',
      caption: '',
    };
  }

  return {
    title: raw || 'Anexo',
    meta: 'Mídia',
    caption: '',
  };
}
