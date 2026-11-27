import {
  AlertCircle,
  FileText,
  Inbox,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Sun,
  X,
} from 'lucide-react';
import {
  formatConversationTime,
  getDisplayName,
  getMediaBadgeLabel,
} from '../utils/formatters.js';
import { Avatar } from './Avatar.jsx';

export function ConversationList({
  conversations,
  loading,
  error,
  onRetry,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  onlyDocuments,
  onOnlyDocumentsChange,
  selectedInstance,
  instances,
  onSelectInstance,
  onOpenConnectModal,
  sseStatus,
  isDark,
  onToggleTheme,
}) {
  const hasFilters = Boolean(searchQuery.trim() || onlyDocuments || selectedInstance);

  const handleClearFilters = () => {
    onSearchChange('');
    onOnlyDocumentsChange(false);
    onSelectInstance(null);
  };

  return (
    <section
      aria-label="Lista de conversas"
      className="flex h-full w-full shrink-0 flex-col border-r border-hairline bg-white dark:bg-[#1C1C1E] lg:w-[340px]"
    >
      {/* Cabeçalho fixo translúcido com Busca + Segmented Control */}
      <header className="apple-vibrancy sticky top-0 z-10 border-b border-hairline bg-white/85 px-3.5 pb-3 pt-3.5 dark:bg-[#1C1C1E]/85">
        {/* Barra mobile (< lg) com título, seletor de aparelho, + conectar e tema */}
        <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[17px] font-semibold tracking-apple text-[#1D1D1F] dark:text-[#F5F5F7]">
                Monitor Jurídico
              </h1>
              <span
                title={sseStatus === 'connected' ? 'Tempo real ativo' : 'Reconectando'}
                className={`h-2 w-2 shrink-0 rounded-full ${
                  sseStatus === 'connected' ? 'bg-[#34C759]' : 'bg-[#FF9F0A] animate-pulse'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenConnectModal}
              aria-label="Conectar Aparelho"
              title="Conectar Aparelho"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F5F7] text-[#1D1D1F] transition-colors hover:bg-black/10 dark:bg-[#2C2C2E] dark:text-[#F5F5F7] dark:hover:bg-white/15"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Modo Claro' : 'Modo Escuro'}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F5F7] text-[#1D1D1F] transition-colors hover:bg-black/10 dark:bg-[#2C2C2E] dark:text-[#F5F5F7] dark:hover:bg-white/15"
            >
              {isDark ? (
                <Sun className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Moon className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {/* Seletor de aparelho compacto para mobile (< lg) */}
        <div className="mb-2.5 lg:hidden">
          <label htmlFor="mobile-instance-select" className="sr-only">
            Filtrar por aparelho
          </label>
          <select
            id="mobile-instance-select"
            value={selectedInstance || ''}
            onChange={(e) => onSelectInstance(e.target.value || null)}
            className="w-full rounded-lg border border-hairline bg-[#F5F5F7] px-3 py-1.5 text-[13px] font-medium text-[#1D1D1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59] dark:bg-[#2C2C2E] dark:text-[#F5F5F7] dark:focus-visible:ring-[#2E5EA8]"
          >
            <option value="">Todos os Aparelhos</option>
            {instances.map((item) => (
              <option key={item.instanceName} value={item.instanceName}>
                {item.instanceName} ({item.connected ? 'Conectado' : 'Offline'})
              </option>
            ))}
          </select>
        </div>

        {/* Título discreto da coluna no Desktop */}
        <div className="mb-2.5 hidden items-baseline justify-between lg:flex">
          <h2 className="text-[15px] font-semibold tracking-apple text-[#1D1D1F] dark:text-[#F5F5F7]">
            {selectedInstance ? selectedInstance : 'Conversas'}
          </h2>
          <span className="tabular-nums text-[12px] text-[#6E6E73] dark:text-[#98989D]">
            {conversations.length} {conversations.length === 1 ? 'conversa' : 'conversas'}
          </span>
        </div>

        {/* Campo de busca estilo Spotlight/iOS */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E73] dark:text-[#98989D]"
            strokeWidth={1.5}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar cliente, telefone ou mensagem"
            aria-label="Buscar cliente, telefone ou mensagem"
            className="w-full rounded-lg bg-black/[0.05] py-1.5 pl-8 pr-8 text-[13.5px] text-[#1D1D1F] placeholder-[#6E6E73] transition-colors duration-200 focus:bg-black/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59] dark:bg-white/[0.08] dark:text-[#F5F5F7] dark:placeholder-[#98989D] dark:focus:bg-white/[0.12] dark:focus-visible:ring-[#2E5EA8]"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[#6E6E73] hover:bg-black/10 hover:text-[#1D1D1F] dark:text-[#98989D] dark:hover:bg-white/10 dark:hover:text-[#F5F5F7]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          ) : null}
        </div>

        {/* Apple Segmented Control: Todas | Com PDF */}
        <div
          role="tablist"
          aria-label="Filtrar conversas"
          className="mt-2.5 grid grid-cols-2 rounded-[9px] bg-black/[0.06] p-[3px] dark:bg-white/[0.08]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!onlyDocuments}
            onClick={() => onOnlyDocumentsChange(false)}
            className={`rounded-[7px] py-1 text-[12.5px] font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59] dark:focus-visible:ring-[#2E5EA8] ${
              !onlyDocuments
                ? 'bg-white text-[#1D1D1F] shadow-segmented dark:bg-[#3A3A3C] dark:text-[#F5F5F7]'
                : 'text-[#6E6E73] hover:text-[#1D1D1F] dark:text-[#98989D] dark:hover:text-[#F5F5F7]'
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={onlyDocuments}
            onClick={() => onOnlyDocumentsChange(true)}
            className={`flex items-center justify-center gap-1.5 rounded-[7px] py-1 text-[12.5px] font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59] dark:focus-visible:ring-[#2E5EA8] ${
              onlyDocuments
                ? 'bg-white text-[#1D1D1F] shadow-segmented dark:bg-[#3A3A3C] dark:text-[#F5F5F7]'
                : 'text-[#6E6E73] hover:text-[#1D1D1F] dark:text-[#98989D] dark:hover:text-[#F5F5F7]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Com PDF</span>
          </button>
        </div>
      </header>

      {/* Corpo rolável da lista */}
      <div className="apple-scroll flex-1 overflow-y-auto px-2 py-2">
        {loading && conversations.length === 0 ? (
          <div className="space-y-1.5 px-1.5 py-1" aria-busy="true">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-xl px-2.5 py-2.5"
              >
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-black/[0.06] dark:bg-white/[0.08]" />
                  <div className="h-3 w-full animate-pulse rounded bg-black/[0.04] dark:bg-white/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mx-2 my-6 rounded-xl border border-hairline bg-[#F5F5F7] p-4 text-center dark:bg-[#2C2C2E]">
            <AlertCircle
              className="mx-auto h-6 w-6 text-[#6E6E73] dark:text-[#98989D]"
              strokeWidth={1.5}
            />
            <p className="mt-2 text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
              Não foi possível carregar as conversas
            </p>
            <p className="mt-1 text-[12px] text-[#6E6E73] dark:text-[#98989D]">
              {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0F2C59] px-3 py-1.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 dark:bg-[#2E5EA8]"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Tentar novamente</span>
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F5F7] text-[#6E6E73] dark:bg-[#2C2C2E] dark:text-[#98989D]">
              <Inbox className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <p className="mt-3 text-[14px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
              {hasFilters ? 'Nenhuma conversa encontrada' : 'Aguardando mensagens'}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#6E6E73] dark:text-[#98989D]">
              {hasFilters
                ? 'Ajuste a busca ou remova o filtro ativo para visualizar outras conversas.'
                : 'Assim que um aparelho pareado receber ou enviar mensagens, elas aparecerão aqui automaticamente.'}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-3 rounded-lg bg-[#F5F5F7] px-3 py-1.5 text-[12.5px] font-medium text-[#0F2C59] transition-colors hover:bg-black/[0.08] dark:bg-[#2C2C2E] dark:text-[#93B8F0] dark:hover:bg-white/[0.12]"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-0.5" role="listbox" aria-label="Conversas recentes">
            {conversations.map((conv) => {
              const key = `${conv.instancia}::${conv.telefone_cliente}`;
              const isSelected =
                selectedConversation?.instancia === conv.instancia &&
                selectedConversation?.telefone_cliente === conv.telefone_cliente;
              const displayName = getDisplayName(conv.nome_contato, conv.telefone_cliente);
              const timeLabel = formatConversationTime(conv.ultima_atualizacao);
              const mediaLabel = getMediaBadgeLabel(conv.ultimo_tipo);
              const showDocPill = !mediaLabel && conv.tem_documento;

              return (
                <li key={key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => onSelectConversation(conv)}
                    className={`group flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59] dark:focus-visible:ring-[#2E5EA8] ${
                      isSelected
                        ? 'bg-[#0F2C59] text-white dark:bg-[#2E5EA8]'
                        : 'hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E]'
                    }`}
                  >
                    <Avatar
                      name={conv.nome_contato}
                      phone={conv.telefone_cliente}
                      inverted={isSelected}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={`truncate text-[14px] font-semibold tracking-[-0.01em] ${
                            isSelected
                              ? 'text-white'
                              : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                          }`}
                        >
                          {displayName}
                        </span>
                        <span
                          className={`tabular-nums shrink-0 text-[11.5px] ${
                            isSelected
                              ? 'text-white/75'
                              : 'text-[#6E6E73] dark:text-[#98989D]'
                          }`}
                        >
                          {timeLabel}
                        </span>
                      </div>

                      <p
                        className={`mt-0.5 truncate text-[12.5px] leading-snug ${
                          isSelected
                            ? 'text-white/85'
                            : 'text-[#6E6E73] dark:text-[#98989D]'
                        }`}
                      >
                        {conv.enviada_por_nos ? (
                          <span
                            className={`font-medium ${
                              isSelected
                                ? 'text-white'
                                : 'text-[#1D1D1F]/80 dark:text-[#F5F5F7]/80'
                            }`}
                          >
                            Você:{' '}
                          </span>
                        ) : null}
                        {conv.ultima_mensagem || 'Mensagem sem conteúdo'}
                      </p>

                      {(mediaLabel || showDocPill || selectedInstance === null) ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {mediaLabel ? (
                            <span
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-medium leading-none ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[#0F2C59]/[0.08] text-[#0F2C59] dark:bg-[#2E5EA8]/25 dark:text-[#B4CEFA]'
                              }`}
                            >
                              {mediaLabel}
                            </span>
                          ) : null}

                          {showDocPill ? (
                            <span
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-medium leading-none ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[#0F2C59]/[0.08] text-[#0F2C59] dark:bg-[#2E5EA8]/25 dark:text-[#B4CEFA]'
                              }`}
                            >
                              PDF
                            </span>
                          ) : null}

                          {selectedInstance === null ? (
                            <span
                              className={`inline-flex max-w-[160px] items-center truncate rounded-md px-1.5 py-0.5 text-[10.5px] font-medium leading-none ${
                                isSelected
                                  ? 'bg-white/15 text-white/90'
                                  : 'bg-black/[0.05] text-[#6E6E73] dark:bg-white/[0.08] dark:text-[#98989D]'
                              }`}
                            >
                              {conv.instancia}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
