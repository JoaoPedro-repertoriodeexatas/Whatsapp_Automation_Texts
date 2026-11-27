import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatView } from './components/ChatView.jsx';
import { ConnectDeviceModal } from './components/ConnectDeviceModal.jsx';
import { ConversationList } from './components/ConversationList.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { useDebouncedValue } from './hooks/useDebouncedValue.js';
import { useRealtimeEvents } from './hooks/useRealtimeEvents.js';
import { useTheme } from './hooks/useTheme.js';
import {
  fetchConversationMessages,
  fetchConversations,
  fetchInstances,
} from './services/api.js';

function matchesActiveSearch(msg, query) {
  const clean = query.trim().toLowerCase();
  if (!clean) return true;
  return (
    String(msg.nome_contato || '').toLowerCase().includes(clean) ||
    String(msg.telefone_cliente || '').toLowerCase().includes(clean) ||
    String(msg.conteudo || '').toLowerCase().includes(clean)
  );
}

export default function App() {
  const { isDark, toggleTheme } = useTheme();

  // Instâncias
  const [instances, setInstances] = useState([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState(null);

  // Filtros de conversa
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 240);
  const [onlyDocuments, setOnlyDocuments] = useState(false);

  // Lista de conversas
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationsError, setConversationsError] = useState('');

  // Conversa selecionada + mensagens
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState('');

  // Modal de pareamento
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [lastConnectionEvent, setLastConnectionEvent] = useState(null);

  // Refs para acesso atualizado dentro dos callbacks SSE sem recriar o EventSource
  const selectedConvRef = useRef(selectedConversation);
  const filtersRef = useRef({
    selectedInstance,
    debouncedSearch,
    onlyDocuments,
  });

  useEffect(() => {
    selectedConvRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    filtersRef.current = {
      selectedInstance,
      debouncedSearch,
      onlyDocuments,
    };
  }, [selectedInstance, debouncedSearch, onlyDocuments]);

  // Carrega instâncias
  const loadInstances = useCallback(async (signal) => {
    setLoadingInstances(true);
    try {
      const list = await fetchInstances(signal);
      setInstances(list);
    } catch (err) {
      if (err.name !== 'AbortError') {
        // Mantém estado anterior sem travar o painel
      }
    } finally {
      setLoadingInstances(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadInstances(controller.signal);
    return () => controller.abort();
  }, [loadInstances]);

  // Carrega conversas conforme filtros ativos
  const loadConversations = useCallback(
    async (signal) => {
      setLoadingConversations(true);
      setConversationsError('');
      try {
        const list = await fetchConversations(
          {
            instancia: selectedInstance,
            search: debouncedSearch,
            onlyDocuments,
          },
          signal,
        );
        setConversations(list);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setConversationsError(err.message || 'Erro de conexão com o backend.');
        }
      } finally {
        setLoadingConversations(false);
      }
    },
    [selectedInstance, debouncedSearch, onlyDocuments],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadConversations(controller.signal);
    return () => controller.abort();
  }, [loadConversations]);

  // Carrega histórico da conversa selecionada
  const loadMessages = useCallback(async (conv, signal) => {
    if (!conv) {
      setMessages([]);
      setMessagesError('');
      return;
    }

    setLoadingMessages(true);
    setMessagesError('');
    try {
      const list = await fetchConversationMessages(
        {
          instancia: conv.instancia,
          telefone: conv.telefone_cliente,
          limit: 200,
          offset: 0,
        },
        signal,
      );
      setMessages(list);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessagesError(err.message || 'Erro ao buscar histórico de mensagens.');
      }
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const selectedInstKey = selectedConversation?.instancia ?? null;
  const selectedTelKey = selectedConversation?.telefone_cliente ?? null;

  useEffect(() => {
    if (!selectedInstKey || !selectedTelKey) {
      setMessages([]);
      return undefined;
    }
    const controller = new AbortController();
    loadMessages(
      { instancia: selectedInstKey, telefone_cliente: selectedTelKey },
      controller.signal,
    );
    return () => controller.abort();
  }, [selectedInstKey, selectedTelKey, loadMessages]);

  // Atualização em tempo real: nova mensagem via SSE
  const handleRealtimeMessage = useCallback((msg) => {
    if (!msg || !msg.instancia || !msg.telefone_cliente) return;

    // 1. Garante que a instância exista na sidebar caso seja nova
    setInstances((prev) => {
      if (prev.some((i) => i.instanceName === msg.instancia)) {
        return prev;
      }
      return [
        ...prev,
        { instanceName: msg.instancia, state: 'open', connected: true },
      ].sort((a, b) => a.instanceName.localeCompare(b.instanceName));
    });

    // 2. Atualiza a lista de conversas sem piscar (move para o topo)
    const {
      selectedInstance: activeInstFilter,
      debouncedSearch: activeSearch,
      onlyDocuments: activeOnlyDocs,
    } = filtersRef.current;

    const matchesInstance = !activeInstFilter || activeInstFilter === msg.instancia;

    if (matchesInstance) {
      setConversations((prev) => {
        const idx = prev.findIndex(
          (c) =>
            c.instancia === msg.instancia &&
            c.telefone_cliente === msg.telefone_cliente,
        );

        const existing = idx >= 0 ? prev[idx] : null;
        const nextHasDocument =
          Boolean(existing?.tem_documento) || msg.tipo_mensagem === 'documento';

        if (activeOnlyDocs && !nextHasDocument) {
          return prev;
        }

        if (!existing && !matchesActiveSearch(msg, activeSearch)) {
          return prev;
        }

        // Preserva o nome real do cliente quando o escritório responde (enviada_por_nos = true)
        const resolvedName = msg.enviada_por_nos
          ? existing?.nome_contato || msg.nome_contato || null
          : msg.nome_contato || existing?.nome_contato || null;

        const updatedCard = {
          instancia: msg.instancia,
          telefone_cliente: msg.telefone_cliente,
          nome_contato: resolvedName,
          ultima_mensagem: msg.conteudo,
          ultimo_tipo: msg.tipo_mensagem,
          enviada_por_nos: Boolean(msg.enviada_por_nos),
          ultima_atualizacao: msg.criado_em,
          total_mensagens: (existing?.total_mensagens || 0) + 1,
          tem_documento: nextHasDocument,
        };

        const withoutOld =
          idx >= 0 ? [...prev.slice(0, idx), ...prev.slice(idx + 1)] : prev;

        return [updatedCard, ...withoutOld];
      });
    }

    // 3. Se esta conversa estiver aberta na Coluna 3, anexa sem duplicar
    const currentConv = selectedConvRef.current;
    if (
      currentConv &&
      currentConv.instancia === msg.instancia &&
      currentConv.telefone_cliente === msg.telefone_cliente
    ) {
      // Atualiza nome do contato no header caso tenha chegado agora
      if (!msg.enviada_por_nos && msg.nome_contato && !currentConv.nome_contato) {
        setSelectedConversation((prev) =>
          prev ? { ...prev, nome_contato: msg.nome_contato } : prev,
        );
      }

      setMessages((prev) => {
        const alreadyExists = prev.some(
          (item) =>
            (msg.message_id && item.message_id === msg.message_id) ||
            (msg.id != null && item.id === msg.id),
        );
        if (alreadyExists) return prev;
        return [...prev, msg];
      });
    }
  }, []);

  // Atualização em tempo real: mudança de conexão da instância via SSE
  const handleRealtimeConnectionUpdate = useCallback((payload) => {
    if (!payload?.instanceName) return;

    setLastConnectionEvent(payload);
    setInstances((prev) => {
      const idx = prev.findIndex((i) => i.instanceName === payload.instanceName);
      const nextItem = {
        instanceName: payload.instanceName,
        state: payload.state || 'unknown',
        connected: Boolean(payload.connected ?? payload.state === 'open'),
      };

      if (idx === -1) {
        return [...prev, nextItem].sort((a, b) =>
          a.instanceName.localeCompare(b.instanceName),
        );
      }

      const clone = [...prev];
      clone[idx] = nextItem;
      return clone;
    });
  }, []);

  const { sseStatus, isConnected: isSseConnected } = useRealtimeEvents({
    onNewMessage: handleRealtimeMessage,
    onConnectionUpdate: handleRealtimeConnectionUpdate,
  });

  const handleInstanceConnectedFromModal = useCallback(
    (name) => {
      setInstances((prev) => {
        const idx = prev.findIndex((i) => i.instanceName === name);
        const item = { instanceName: name, state: 'open', connected: true };
        if (idx === -1) {
          return [...prev, item].sort((a, b) =>
            a.instanceName.localeCompare(b.instanceName),
          );
        }
        const clone = [...prev];
        clone[idx] = item;
        return clone;
      });
      loadInstances();
    },
    [loadInstances],
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#1D1D1F] dark:bg-[#1C1C1E] dark:text-[#F5F5F7]">
      {/* Coluna 1: Sidebar de Aparelhos (Desktop lg+) */}
      <Sidebar
        instances={instances}
        loadingInstances={loadingInstances}
        selectedInstance={selectedInstance}
        onSelectInstance={(inst) => {
          setSelectedInstance(inst);
        }}
        onOpenConnectModal={() => setConnectModalOpen(true)}
        onRefreshInstances={() => loadInstances()}
        sseStatus={sseStatus}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Coluna 2: Lista de Conversas (oculta no mobile quando há conversa aberta) */}
      <div
        className={`h-full w-full shrink-0 lg:w-[340px] ${
          selectedConversation ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <ConversationList
          conversations={conversations}
          loading={loadingConversations}
          error={conversationsError}
          onRetry={() => loadConversations()}
          selectedConversation={selectedConversation}
          onSelectConversation={(conv) => setSelectedConversation(conv)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onlyDocuments={onlyDocuments}
          onOnlyDocumentsChange={setOnlyDocuments}
          selectedInstance={selectedInstance}
          instances={instances}
          onSelectInstance={setSelectedInstance}
          onOpenConnectModal={() => setConnectModalOpen(true)}
          sseStatus={sseStatus}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
      </div>

      {/* Coluna 3: Visualizador da Conversa (tela cheia no mobile quando selecionada) */}
      <div
        className={`h-full min-w-0 flex-1 ${
          selectedConversation ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <ChatView
          conversation={selectedConversation}
          messages={messages}
          loading={loadingMessages}
          error={messagesError}
          onRetry={() => loadMessages(selectedConversation)}
          onBack={() => setSelectedConversation(null)}
          isSseConnected={isSseConnected}
        />
      </div>

      {/* Modal Apple Sheet: Conectar Aparelho */}
      <ConnectDeviceModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onInstanceConnected={handleInstanceConnectedFromModal}
        lastConnectionEvent={lastConnectionEvent}
      />
    </div>
  );
}
