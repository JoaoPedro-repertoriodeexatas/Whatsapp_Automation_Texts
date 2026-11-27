import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../services/api.js';

/**
 * Conecta ao stream SSE (`GET /api/events`) do backend para atualizações em tempo real.
 */
export function useRealtimeEvents({ onNewMessage, onConnectionUpdate } = {}) {
  const [status, setStatus] = useState('connecting');
  const onNewMessageRef = useRef(onNewMessage);
  const onConnectionUpdateRef = useRef(onConnectionUpdate);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    onConnectionUpdateRef.current = onConnectionUpdate;
  }, [onConnectionUpdate]);

  useEffect(() => {
    const eventSource = new EventSource(`${API_URL}/api/events`);

    const handleConnected = () => {
      setStatus('connected');
    };

    const handleNewMessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onNewMessageRef.current?.(parsed);
      } catch {
        // ignora evento malformado
      }
    };

    const handleConnectionUpdate = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onConnectionUpdateRef.current?.(parsed);
      } catch {
        // ignora evento malformado
      }
    };

    eventSource.onopen = handleConnected;
    eventSource.addEventListener('connected', handleConnected);
    eventSource.addEventListener('new_message', handleNewMessage);
    eventSource.addEventListener('connection_update', handleConnectionUpdate);

    eventSource.onerror = () => {
      setStatus('reconnecting');
    };

    return () => {
      eventSource.removeEventListener('connected', handleConnected);
      eventSource.removeEventListener('new_message', handleNewMessage);
      eventSource.removeEventListener('connection_update', handleConnectionUpdate);
      eventSource.close();
    };
  }, []);

  return { sseStatus: status, isConnected: status === 'connected' };
}
