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
  const { url, events, withCredentials, parser, callbacks, lastEventId } = options;

  let eventSource: EventSource | null = null;

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

  const connect = () => {
    if (eventSource) {
      disconnect();
    }
    
    let connectionUrl = url;
    if (lastEventId) {
      const separator = url.includes('?') ? '&' : '?';
      connectionUrl = `${url}${separator}lastEventId=${encodeURIComponent(lastEventId)}`;
    }

    eventSource = new EventSource(connectionUrl, {
      withCredentials: withCredentials ?? false,
    });

    eventSource.onopen = () => {
      callbacks.onOpen();
    };

    eventSource.onerror = () => {
      if (eventSource?.readyState === EventSource.CLOSED) {
        callbacks.onError(new Error('SSE connection closed'));
        callbacks.onClose();
      }
    };

    for (const eventType of events) {
      if (eventType === 'message') {
        eventSource.onmessage = handleMessage('message');
      } else {
        eventSource.addEventListener(eventType, handleMessage(eventType) as EventListener);
      }
    }
  };

  const disconnect = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };

  const isConnected = () => {
    return eventSource?.readyState === EventSource.OPEN;
  };

  return {
    connect,
    disconnect,
    isConnected,
  };
}
