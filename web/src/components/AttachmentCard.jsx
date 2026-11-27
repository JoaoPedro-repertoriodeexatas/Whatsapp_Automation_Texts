import { FileText, Image as ImageIcon, Mic } from 'lucide-react';
import { parseAttachmentContent } from '../utils/formatters.js';

const ICON_MAP = {
  documento: FileText,
  imagem: ImageIcon,
  audio: Mic,
};

export function AttachmentCard({ tipoMensagem, conteudo, isOutgoing }) {
  const Icon = ICON_MAP[tipoMensagem] || FileText;
  const { title, meta, caption } = parseAttachmentContent(tipoMensagem, conteudo);

  const cardBg = isOutgoing
    ? 'bg-white/[0.12] border-white/[0.18]'
    : 'bg-white/80 border-black/[0.08] dark:bg-white/[0.08] dark:border-white/[0.10]';

  const iconBox = isOutgoing
    ? 'bg-white/20 text-white'
    : 'bg-[#0F2C59]/10 text-[#0F2C59] dark:bg-[#2E5EA8]/25 dark:text-[#A9C6F5]';

  const metaColor = isOutgoing
    ? 'text-white/75'
    : 'text-[#6E6E73] dark:text-[#98989D]';

  const noteColor = isOutgoing
    ? 'text-white/65 border-white/15'
    : 'text-[#6E6E73] dark:text-[#98989D] border-black/[0.06] dark:border-white/[0.08]';

  return (
    <div className="space-y-2">
      <div
        className={`rounded-xl border p-2.5 transition-colors duration-200 ${cardBg}`}
      >
        <div className="flex items-start gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBox}`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="break-words text-[13.5px] font-medium leading-snug">
              {title}
            </p>
            <p className={`mt-0.5 truncate text-[11px] ${metaColor}`}>
              {meta}
            </p>
          </div>
        </div>
        <p className={`mt-2 border-t pt-1.5 text-[11px] leading-tight ${noteColor}`}>
          Anexo registrado • Download completo na Fase 2
        </p>
      </div>

      {caption ? (
        <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.45]">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
