import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  QrCode,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';
import {
  createInstance,
  fetchInstanceQrCode,
  fetchInstanceStatus,
} from '../services/api.js';

const INSTANCE_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,50}$/;

export function ConnectDeviceModal({
  isOpen,
  onClose,
  onInstanceConnected,
  lastConnectionEvent,
}) {
  const [step, setStep] = useState('form'); // 'form' | 'qr' | 'connected'
  const [instanceName, setInstanceName] = useState('');
  const [activeInstance, setActiveInstance] = useState('');
  const [qrBase64, setQrBase64] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const [error, setError] = useState('');
  const [canUseExisting, setCanUseExisting] = useState(false);

  // Reset ao fechar
  useEffect(() => {
    if (!isOpen) {
      setStep('form');
      setInstanceName('');
      setActiveInstance('');
      setQrBase64(null);
      setPairingCode(null);
      setSubmitting(false);
      setRefreshingQr(false);
      setError('');
      setCanUseExisting(false);
    }
  }, [isOpen]);

  // Fechar com tecla Escape
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const loadQrCode = useCallback(async (name) => {
    setRefreshingQr(true);
    setError('');
    try {
      const data = await fetchInstanceQrCode(name);
      if (data?.connected || data?.state === 'open') {
        setStep('connected');
        onInstanceConnected?.(name);
        return;
      }
      setQrBase64(data?.base64 || null);
      setPairingCode(data?.pairingCode || null);
    } catch (err) {
      setError(err.message || 'Falha ao obter o QR Code.');
    } finally {
      setRefreshingQr(false);
    }
  }, [onInstanceConnected]);

  // Reage instantaneamente ao evento SSE connection_update
  useEffect(() => {
    if (!isOpen || step !== 'qr' || !activeInstance || !lastConnectionEvent) {
      return;
    }
    if (
      lastConnectionEvent.instanceName === activeInstance &&
      (lastConnectionEvent.connected || lastConnectionEvent.state === 'open')
    ) {
      setStep('connected');
      onInstanceConnected?.(activeInstance);
    }
  }, [isOpen, step, activeInstance, lastConnectionEvent, onInstanceConnected]);

  // Polling leve de status a cada 3s enquanto o QR Code está aberto
  useEffect(() => {
    if (!isOpen || step !== 'qr' || !activeInstance) return undefined;

    const timer = setInterval(async () => {
      try {
        const status = await fetchInstanceStatus(activeInstance);
        if (status?.connected || status?.state === 'open') {
          setStep('connected');
          onInstanceConnected?.(activeInstance);
        }
      } catch {
        // ignora erro temporário no polling
      }
    }, 3_000);

    return () => clearInterval(timer);
  }, [isOpen, step, activeInstance, onInstanceConnected]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleaned = instanceName.trim();

    if (!INSTANCE_NAME_PATTERN.test(cleaned)) {
      setError('Use de 1 a 50 caracteres (apenas letras, números, "_" ou "-").');
      return;
    }

    setSubmitting(true);
    setError('');
    setCanUseExisting(false);

    try {
      const created = await createInstance(cleaned);
      setActiveInstance(cleaned);
      setStep('qr');

      if (created?.qrcode?.base64) {
        setQrBase64(created.qrcode.base64);
        setPairingCode(created.qrcode.pairingCode || null);
      } else {
        await loadQrCode(cleaned);
      }
    } catch (err) {
      setError(err.message || 'Não foi possível criar a instância.');
      // Caso a instância já exista na Evolution API (403/409), permite carregar o QR Code dela
      if (err.status === 403 || err.status === 409) {
        setCanUseExisting(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadExistingQr = async () => {
    const cleaned = instanceName.trim();
    if (!cleaned) return;
    setActiveInstance(cleaned);
    setStep('qr');
    await loadQrCode(cleaned);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm transition-opacity duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-sheet transition-all duration-200 dark:bg-[#2C2C2E] dark:shadow-sheet-dark">
        {/* Cabeçalho da Sheet */}
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F2C59]/10 text-[#0F2C59] dark:bg-[#2E5EA8]/25 dark:text-[#A9C6F5]">
              {step === 'qr' ? (
                <QrCode className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Smartphone className="h-4 w-4" strokeWidth={1.5} />
              )}
            </div>
            <div>
              <h2
                id="connect-modal-title"
                className="text-[15px] font-semibold tracking-apple text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                Conectar Aparelho
              </h2>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D]">
                Pareamento corporativo via Evolution API v2
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#6E6E73] transition-colors hover:bg-black/[0.06] hover:text-[#1D1D1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59] dark:text-[#98989D] dark:hover:bg-white/[0.1] dark:hover:text-[#F5F5F7]"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Conteúdo da Sheet */}
        <div className="px-5 py-5">
          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="instance-name-input"
                  className="block text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]"
                >
                  Nome da instância
                </label>
                <p className="mt-0.5 text-[12px] text-[#6E6E73] dark:text-[#98989D]">
                  Identifique o aparelho do escritório (ex.:{' '}
                  <code className="rounded bg-black/[0.05] px-1 py-0.5 font-mono text-[11.5px] dark:bg-white/[0.08]">
                    celular_juridico_01
                  </code>
                  ).
                </p>
                <input
                  id="instance-name-input"
                  type="text"
                  autoFocus
                  value={instanceName}
                  onChange={(e) => {
                    setInstanceName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="celular_juridico_01"
                  maxLength={50}
                  className="mt-2.5 w-full rounded-xl border border-hairline bg-[#F5F5F7] px-3.5 py-2.5 text-[14px] text-[#1D1D1F] placeholder-[#6E6E73]/70 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59] dark:bg-[#1C1C1E] dark:text-[#F5F5F7] dark:placeholder-[#98989D]/70 dark:focus-visible:ring-[#2E5EA8]"
                />
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.08] p-3 text-[12.5px] text-red-700 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <p>{error}</p>
                    {canUseExisting ? (
                      <button
                        type="button"
                        onClick={handleLoadExistingQr}
                        className="mt-2 font-semibold underline underline-offset-2 hover:opacity-80"
                      >
                        Abrir QR Code desta instância existente
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-[13.5px] font-medium text-[#6E6E73] transition-colors hover:bg-black/[0.05] hover:text-[#1D1D1F] dark:text-[#98989D] dark:hover:bg-white/[0.08] dark:hover:text-[#F5F5F7]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !instanceName.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0F2C59] px-4 py-2 text-[13.5px] font-medium text-white transition-all duration-200 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#2E5EA8]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                      <span>Criando…</span>
                    </>
                  ) : (
                    <span>Gerar QR Code</span>
                  )}
                </button>
              </div>
            </form>
          ) : null}

          {step === 'qr' ? (
            <div className="flex flex-col items-center text-center">
              <span className="rounded-full bg-[#F5F5F7] px-3 py-1 text-[12px] font-medium text-[#1D1D1F] dark:bg-[#1C1C1E] dark:text-[#F5F5F7]">
                {activeInstance}
              </span>

              <div className="mt-4 flex h-[244px] w-[244px] items-center justify-center rounded-2xl border border-hairline bg-white p-3.5 shadow-sm">
                {refreshingQr && !qrBase64 ? (
                  <div className="flex flex-col items-center gap-2 text-[#6E6E73]">
                    <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.5} />
                    <span className="text-[12px]">Gerando QR Code…</span>
                  </div>
                ) : qrBase64 ? (
                  <img
                    src={qrBase64}
                    alt={`QR Code para parear ${activeInstance}`}
                    className="h-full w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="px-4 text-[12.5px] text-[#6E6E73]">
                    QR Code ainda não disponível. Clique em atualizar abaixo.
                  </div>
                )}
              </div>

              {pairingCode ? (
                <div className="tabular-nums mt-3 rounded-lg bg-[#F5F5F7] px-3 py-1.5 font-mono text-[13px] tracking-widest text-[#1D1D1F] dark:bg-[#1C1C1E] dark:text-[#F5F5F7]">
                  {pairingCode}
                </div>
              ) : null}

              <p className="mt-3.5 max-w-xs text-[12.5px] leading-relaxed text-[#6E6E73] dark:text-[#98989D]">
                No celular corporativo, abra o <strong>WhatsApp</strong> →{' '}
                <strong>Aparelhos conectados</strong> →{' '}
                <strong>Conectar um aparelho</strong> e escaneie o código.
              </p>

              {error ? (
                <p className="mt-2.5 text-[12px] text-red-600 dark:text-red-400">
                  {error}
                </p>
              ) : null}

              <div className="mt-4 flex w-full items-center justify-between gap-2 border-t border-hairline pt-4">
                <div className="flex items-center gap-2 text-[12px] text-[#6E6E73] dark:text-[#98989D]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF9F0A]" />
                  <span>Aguardando leitura…</span>
                </div>
                <button
                  type="button"
                  disabled={refreshingQr}
                  onClick={() => loadQrCode(activeInstance)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5F5F7] px-3 py-1.5 text-[12.5px] font-medium text-[#1D1D1F] transition-colors hover:bg-black/[0.08] disabled:opacity-50 dark:bg-[#1C1C1E] dark:text-[#F5F5F7] dark:hover:bg-white/[0.12]"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${refreshingQr ? 'animate-spin' : ''}`}
                    strokeWidth={1.5}
                  />
                  <span>Atualizar QR</span>
                </button>
              </div>
            </div>
          ) : null}

          {step === 'connected' ? (
            <div className="flex flex-col items-center py-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#34C759]/15 text-[#34C759]">
                <CheckCircle2 className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <h3 className="mt-3.5 text-[16px] font-semibold tracking-apple text-[#1D1D1F] dark:text-[#F5F5F7]">
                Aparelho conectado
              </h3>
              <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-[#6E6E73] dark:text-[#98989D]">
                A instância <strong>{activeInstance}</strong> está ativa e
                espelhando novas mensagens em tempo real.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 rounded-xl bg-[#0F2C59] px-5 py-2 text-[13.5px] font-medium text-white transition-opacity hover:opacity-95 dark:bg-[#2E5EA8]"
              >
                Concluir
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
