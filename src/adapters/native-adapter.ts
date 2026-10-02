import type { SSEAdapter, SSEAdapterOptions } from './types';

/**
 * Adapter que usa EventSource nativo do browser
 *
 * Vantagens:
 * - Aparece na aba EventStream do DevTools
 * - Reconexão automática nativa
 * - API simples e confiável
 *
 * Limitações:
 * - Não suporta headers customizados
 * - Apenas método GET
 *
 * @example
 * ```typescript
 * const adapter = createNativeAdapter({
 *   url: '/api/events',
 *   events: ['message', 'custom-event'],
 *   parser: JSON.parse,
 *   callbacks: { onOpen, onMessage, onError, onClose },
 * });
 *
 * adapter.connect();
 * // ...
 * adapter.disconnect();
 * ```
 */
export function createNativeAdapter<T>(
  options: SSEAdapterOptions<T>
): SSEAdapter {
  const { url, events, withCredentials, parser, callbacks } = options;

  let eventSource: EventSource | null = null;

  /**
   * Handler para eventos recebidos
   */
  const handleMessage = (eventType: string) => (event: MessageEvent) => {
    try {
      const data = parser(event.data);
      callbacks.onMessage(eventType, data, event.lastEventId || undefined);
    } catch (error) {
      callbacks.onError(
        new Error(`Failed to parse SSE data: ${(error as Error).message}`)
      );
    }
  };

  /**
   * Conecta ao endpoint SSE usando EventSource
   */
  const connect = () => {
    // Fecha conexão existente
    if (eventSource) {
      disconnect();
    }

    // Cria nova conexão
    eventSource = new EventSource(url, {
      withCredentials: withCredentials ?? false,
    });

    // Handler de conexão aberta
    eventSource.onopen = () => {
      callbacks.onOpen();
    };

    // Handler de erro
    eventSource.onerror = () => {
      // EventSource tenta reconectar automaticamente
      // Só notifica erro se a conexão foi fechada
      if (eventSource?.readyState === EventSource.CLOSED) {
        callbacks.onError(new Error('SSE connection closed'));
        callbacks.onClose();
      }
    };

    // Registra handlers para eventos customizados
    for (const eventType of events) {
      if (eventType === 'message') {
        // Evento padrão usa onmessage
        eventSource.onmessage = handleMessage('message');
      } else {
        // Eventos customizados usam addEventListener
        eventSource.addEventListener(eventType, handleMessage(eventType) as EventListener);
      }
    }
  };

  /**
   * Desconecta do endpoint SSE
   */
  const disconnect = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };

  /**
   * Verifica se está conectado
   */
  const isConnected = () => {
    return eventSource?.readyState === EventSource.OPEN;
  };

  return {
    connect,
    disconnect,
    isConnected,
  };
}
