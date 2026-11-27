import {
  Layers,
  Moon,
  Plus,
  RefreshCw,
  Smartphone,
  Sun,
} from 'lucide-react';

function getInstanceStateMeta(state, connected) {
  if (connected || state === 'open') {
    return {
      dotClass: 'bg-[#34C759]',
      label: 'Conectado',
    };
  }
  if (state === 'connecting') {
    return {
      dotClass: 'bg-[#FF9F0A]',
      label: 'Conectando',
    };
  }
  return {
    dotClass: 'bg-[#8E8E93]',
    label: 'Desconectado',
  };
}

export function Sidebar({
  instances,
  loadingInstances,
  selectedInstance,
  onSelectInstance,
  onOpenConnectModal,
  onRefreshInstances,
  sseStatus,
  isDark,
  onToggleTheme,
}) {
  const isAllSelected = selectedInstance === null;

  const sseLabel =
    sseStatus === 'connected'
      ? 'Tempo real ativo'
      : sseStatus === 'connecting'
        ? 'Conectando stream…'
        : 'Reconectando…';

  const sseDot =
    sseStatus === 'connected'
      ? 'bg-[#34C759]'
      : 'bg-[#FF9F0A] animate-pulse';

  return (
    <aside
      aria-label="Navegação de aparelhos corporativos"
      className="apple-vibrancy hidden h-full w-64 shrink-0 flex-col border-r border-hairline bg-[#F5F5F7]/85 dark:bg-[#2C2C2E]/80 lg:flex"
    >
      {/* Cabeçalho da Sidebar */}
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-[17px] font-semibold leading-tight tracking-apple text-[#1D1D1F] dark:text-[#F5F5F7]">
              Monitor Jurídico
            </h1>
            <p className="mt-0.5 text-[12px] text-[#6E6E73] dark:text-[#98989D]">
              Espelhamento WhatsApp
            </p>
          </div>
          <button
            type="button"
            onClick={onRefreshInstances}
            title="Atualizar status dos aparelhos"
            aria-label="Atualizar status dos aparelhos"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6E6E73] transition-all duration-200 ease-out hover:bg-black/[0.06] hover:text-[#1D1D1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59] dark:text-[#98989D] dark:hover:bg-white/[0.08] dark:hover:text-[#F5F5F7] dark:focus-visible:ring-[#2E5EA8]"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loadingInstances ? 'animate-spin' : ''}`}
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>

      {/* Lista de Aparelhos */}
      <nav className="apple-scroll flex-1 overflow-y-auto px-3 pb-3">
        <button
          type="button"
          onClick={() => onSelectInstance(null)}
          aria-current={isAllSelected ? 'page' : undefined}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59] dark:focus-visible:ring-[#2E5EA8] ${
            isAllSelected
              ? 'bg-[#0F2C59] text-white dark:bg-[#2E5EA8]'
              : 'text-[#1D1D1F] hover:bg-black/[0.05] dark:text-[#F5F5F7] dark:hover:bg-white/[0.07]'
          }`}
        >
          <Layers className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span className="truncate">Todos os Aparelhos</span>
        </button>

        <div className="mt-5 px-3 pb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6E6E73] dark:text-[#98989D]">
            Aparelhos ({instances.length})
          </span>
        </div>

        <div className="space-y-0.5">
          {loadingInstances && instances.length === 0 ? (
            <div className="space-y-2 px-3 py-2">
              <div className="h-7 animate-pulse rounded-md bg-black/[0.05] dark:bg-white/[0.06]" />
              <div className="h-7 animate-pulse rounded-md bg-black/[0.05] dark:bg-white/[0.06]" />
            </div>
          ) : instances.length === 0 ? (
            <p className="px-3 py-2 text-[12.5px] leading-relaxed text-[#6E6E73] dark:text-[#98989D]">
              Nenhum aparelho registrado ainda.
            </p>
          ) : (
            instances.map((item) => {
              const isSelected = selectedInstance === item.instanceName;
              const statusMeta = getInstanceStateMeta(item.state, item.connected);

              return (
                <button
                  key={item.instanceName}
                  type="button"
                  onClick={() => onSelectInstance(item.instanceName)}
                  aria-current={isSelected ? 'page' : undefined}
                  className={`group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59] dark:focus-visible:ring-[#2E5EA8] ${
                    isSelected
                      ? 'bg-[#0F2C59] text-white dark:bg-[#2E5EA8]'
                      : 'text-[#1D1D1F] hover:bg-black/[0.05] dark:text-[#F5F5F7] dark:hover:bg-white/[0.07]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Smartphone
                      className={`h-4 w-4 shrink-0 ${
                        isSelected
                          ? 'text-white/90'
                          : 'text-[#6E6E73] dark:text-[#98989D]'
                      }`}
                      strokeWidth={1.5}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">
                        {item.instanceName}
                      </span>
                      <span
                        className={`block text-[11px] leading-tight ${
                          isSelected
                            ? 'text-white/75'
                            : 'text-[#6E6E73] dark:text-[#98989D]'
                        }`}
                      >
                        {statusMeta.label}
                      </span>
                    </span>
                  </span>

                  <span
                    title={statusMeta.label}
                    aria-label={statusMeta.label}
                    className={`h-2 w-2 shrink-0 rounded-full ring-2 ${
                      isSelected
                        ? 'ring-white/25'
                        : 'ring-[#F5F5F7] dark:ring-[#2C2C2E]'
                    } ${statusMeta.dotClass}`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Ação discreta: Conectar Aparelho */}
        <div className="mt-4 pt-3 border-t border-hairline">
          <button
            type="button"
            onClick={onOpenConnectModal}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-hairline bg-white/75 px-3 py-2 text-[13px] font-medium text-[#1D1D1F] transition-all duration-200 ease-out hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59] dark:bg-white/[0.06] dark:text-[#F5F5F7] dark:hover:bg-white/[0.11] dark:focus-visible:ring-[#2E5EA8]"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>Conectar Aparelho</span>
          </button>
        </div>
      </nav>

      {/* Rodapé: Status SSE + Toggle Claro/Escuro */}
      <div className="flex items-center justify-between gap-2 border-t border-hairline px-4 py-3">
        <div
          className="flex min-w-0 items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${sseDot}`} />
          <span className="truncate text-[11.5px] font-medium text-[#6E6E73] dark:text-[#98989D]">
            {sseLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          aria-label={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11.5px] font-medium text-[#6E6E73] transition-all duration-200 ease-out hover:bg-black/[0.06] hover:text-[#1D1D1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59] dark:text-[#98989D] dark:hover:bg-white/[0.08] dark:hover:text-[#F5F5F7] dark:focus-visible:ring-[#2E5EA8]"
        >
          {isDark ? (
            <>
              <Sun className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Claro</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Escuro</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
