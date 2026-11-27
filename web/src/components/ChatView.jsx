import { useEffect, useMemo, useRef } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  Eye,
  MessageSquare,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import {
  formatDateSeparator,
  formatMessageTime,
  formatPhoneBR,
  getDateKey,
  getDisplayName,
} from '../utils/formatters.js';
import { AttachmentCard } from './AttachmentCard.jsx';
import { Avatar } from './Avatar.jsx';

const MEDIA_TYPES = new Set(['documento', 'imagem', 'audio']);

export function ChatView({
  conversation,
  messages,
  loading,
  error,
  onRetry,
  onBack,
  isSseConnected,
}) {
  const bottomRef = useRef(null);
  const prevKeyRef = useRef(null);

  const conversationKey = conversation
    ? `${conversation.instancia}::${conversation.telefone_cliente}`
    : null;

  useEffect(() => {
    if (!bottomRef.current) return;
    const isConversationSwitch = prevKeyRef.current !== conversationKey;
    prevKeyRef.current = conversationKey;

    bottomRef.current.scrollIntoView({
      behavior: isConversationSwitch ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [conversationKey, messages.length]);

  const groupedTimeline = useMemo(() => {
    const items = [];
    let lastDateKey = null;

    for (const msg of messages) {
      const dateKey = getDateKey(msg.criado_em);
      if (dateKey !== lastDateKey) {
        items.push({
          type: 'separator',
          id: `sep-${dateKey}`,
          label: formatDateSeparator(msg.criado_em),
        });
        lastDateKey = dateKey;
      }
      items.push({
        type: 'message',
        id: msg.message_id || `msg-${msg.id}`,
        data: msg,
      });
    }

    return items;
  }, [messages]);

  if (!conversation) {
    return (
      <main className="hidden h-full flex-1 flex-col items-center justify-center bg-[#F5F5F7]/50 px-8 text-center dark:bg-[#1C1C1E] lg:flex">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-hairline bg-white text-[#0F2C59] shadow-sm dark:bg-[#2C2C2E] dark:text-[#93B8F0]">
          <MessageSquare className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <h2 className="mt-4 text-[17px] font-semibold tracking-apple text-[#1D1D1F] dark:text-[#F5F5F7]">
          Selecione uma conversa
        </h2>
        <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-[#6E6E73] dark:text-[#98989D]">
          Escolha um atendimento na coluna ao lado para inspecionar o histórico
          completo e acompanhar novas mensagens em tempo real.
        </p>
      </main>
    );
  }

  const displayName = getDisplayName(
    conversation.nome_contato,
    conversation.telefone_cliente,
  );
  const formattedPhone = formatPhoneBR(conversation.telefone_cliente);
  const showPhoneSubtitle = displayName !== formattedPhone;

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col bg-white dark:bg-[#1C1C1E]">
      {/* Header translúcido fixo */}
      <header className="apple-vibrancy sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-hairline bg-white/80 px-4 py-3 dark:bg-[#1C1C1E]/80 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-0.5 rounded-lg py-1 pl-1 pr-2 text-[14px] font-medium text-[#0F2C59] transition-colors hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59] dark:text-[#7AA8F0] dark:hover:bg-white/[0.08] lg:hidden"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
            <span>Voltar</span>
          </button>

          <Avatar
            name={conversation.nome_contato}
            phone={conversation.telefone_cliente}
            size="lg"
          />

          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold leading-tight tracking-apple text-[#1D1D1F] dark:text-[#F5F5F7]">
              {displayName}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-[#6E6E73] dark:text-[#98989D]">
              {showPhoneSubtitle ? (
                <span className="tabular-nums">{formattedPhone}</span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-md bg-[#F5F5F7] px-1.5 py-0.5 text-[11px] font-medium text-[#1D1D1F]/80 dark:bg-[#2C2C2E] dark:text-[#F5F5F7]/80">
                <Smartphone className="h-3 w-3" strokeWidth={1.5} />
                {conversation.instancia}
              </span>
            </div>
          </div>
        </div>

        {/* Selo sutil Ao vivo */}
        <div
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-[#F5F5F7]/90 px-2.5 py-1 text-[11.5px] font-medium text-[#1D1D1F] dark:bg-[#2C2C2E]/90 dark:text-[#F5F5F7] sm:inline-flex"
          title={
            isSseConnected
              ? 'Recebendo atualizações em tempo real'
              : 'Reconectando ao stream em tempo real'
          }
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isSseConnected
                ? 'bg-[#34C759]'
                : 'bg-[#FF9F0A] animate-pulse'
            }`}
          />
          <span>{isSseConnected ? 'Ao vivo' : 'Reconectando'}</span>
        </div>
      </header>

      {/* Área rolável de mensagens */}
      <div className="apple-scroll flex-1 overflow-y-auto bg-[#F5F5F7]/40 px-4 py-5 dark:bg-[#1C1C1E] sm:px-7">
        {loading && messages.length === 0 ? (
          <div className="mx-auto max-w-3xl space-y-4 py-4" aria-busy="true">
            <div className="flex justify-start">
              <div className="h-14 w-64 animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.08]" />
            </div>
            <div className="flex justify-end">
              <div className="h-16 w-72 animate-pulse rounded-2xl bg-[#0F2C59]/15 dark:bg-[#2E5EA8]/25" />
            </div>
            <div className="flex justify-start">
              <div className="h-12 w-52 animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.08]" />
            </div>
          </div>
        ) : error ? (
          <div className="mx-auto my-10 max-w-sm rounded-2xl border border-hairline bg-white p-5 text-center dark:bg-[#2C2C2E]">
            <AlertCircle
              className="mx-auto h-6 w-6 text-[#6E6E73] dark:text-[#98989D]"
              strokeWidth={1.5}
            />
            <p className="mt-2.5 text-[14px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
              Erro ao carregar mensagens
            </p>
            <p className="mt-1 text-[12.5px] text-[#6E6E73] dark:text-[#98989D]">
              {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-[#0F2C59] px-3.5 py-1.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 dark:bg-[#2E5EA8]"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Recarregar</span>
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto my-14 max-w-xs text-center">
            <p className="text-[13.5px] text-[#6E6E73] dark:text-[#98989D]">
              Nenhuma mensagem registrada nesta conversa.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            {groupedTimeline.map((entry) => {
              if (entry.type === 'separator') {
                return (
                  <div
                    key={entry.id}
                    className="my-3 flex items-center justify-center"
                  >
                    <span className="apple-vibrancy rounded-full border border-hairline bg-white/75 px-3 py-1 text-[11.5px] font-medium text-[#6E6E73] dark:bg-[#2C2C2E]/80 dark:text-[#98989D]">
                      {entry.label}
                    </span>
                  </div>
                );
              }

              const msg = entry.data;
              const isOutgoing = Boolean(msg.enviada_por_nos);
              const isMedia = MEDIA_TYPES.has(msg.tipo_mensagem);

              return (
                <div
                  key={entry.id}
                  className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                >
                  <article
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 sm:max-w-[70%] ${
                      isOutgoing
                        ? 'rounded-br-[6px] bg-[#0F2C59] text-white dark:bg-[#2E5EA8]'
                        : 'rounded-bl-[6px] bg-[#E9E9EB] text-[#1D1D1F] dark:bg-[#3A3A3C] dark:text-[#F5F5F7]'
                    }`}
                  >
                    {isMedia ? (
                      <AttachmentCard
                        tipoMensagem={msg.tipo_mensagem}
                        conteudo={msg.conteudo}
                        isOutgoing={isOutgoing}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.45]">
                        {msg.conteudo}
                      </p>
                    )}

                    <div className="mt-1 flex items-center justify-end gap-1.5">
                      <time
                        dateTime={msg.criado_em}
                        className={`tabular-nums text-[10.5px] leading-none ${
                          isOutgoing
                            ? 'text-white/70'
                            : 'text-[#6E6E73] dark:text-[#98989D]'
                        }`}
                      >
                        {formatMessageTime(msg.criado_em)}
                      </time>
                    </div>
                  </article>
                </div>
              );
            })}
            <div ref={bottomRef} className="h-1" />
          </div>
        )}
      </div>

      {/* Rodapé informativo fixo (somente leitura) */}
      <footer className="apple-vibrancy flex items-center justify-center gap-2 border-t border-hairline bg-white/85 px-4 py-2.5 text-center text-[12px] text-[#6E6E73] dark:bg-[#1C1C1E]/85 dark:text-[#98989D]">
        <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
        <span>
          Modo Monitoramento — Visualização espelhada em tempo real (somente leitura)
        </span>
      </footer>
    </main>
  );
}
