import type { SSEAdapter, SSEAdapterOptions } from './types';

/**
 * Erro HTTP com status code e mensagem
 */
export class SSEHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string
  ) {
    super(`HTTP error ${status}: ${statusText}`);
    this.name = 'SSEHttpError';
  }
}

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
  let isDisconnecting = false;

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

  const buildConnectionUrl = () => {
    if (!lastEventId) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}lastEventId=${encodeURIComponent(lastEventId)}`;
  };

  /**
   * Valida o endpoint com uma requisição HEAD/GET antes de conectar
   * Isso permite capturar erros HTTP (401, 403, 404, 500, etc.)
   * que o EventSource não reporta adequadamente
   */
  const validateEndpoint = async (connectionUrl: string): Promise<void> => {
    const response = await fetch(connectionUrl, {
      method: 'HEAD',
      credentials: withCredentials ? 'include' : 'same-origin',
    });

    if (!response.ok) {
      throw new SSEHttpError(response.status, response.statusText);
    }
  };

  const connectEventSource = (connectionUrl: string) => {
    eventSource = new EventSource(connectionUrl, {
      withCredentials: withCredentials ?? false,
    });

    eventSource.onopen = () => {
      callbacks.onOpen();
    };

    eventSource.onerror = () => {
      if (isDisconnecting) return;
      
      if (eventSource?.readyState === EventSource.CLOSED) {
        callbacks.onError(new Error('SSE connection closed unexpectedly'));
        callbacks.onClose();
      } else if (eventSource?.readyState === EventSource.CONNECTING) {
        // EventSource está tentando reconectar automaticamente
        // Não fazemos nada aqui, deixamos o browser tentar
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

  const connect = async () => {
    if (eventSource) {
      disconnect();
    }

    isDisconnecting = false;
    const connectionUrl = buildConnectionUrl();

    try {
      // Valida o endpoint antes de conectar para capturar erros HTTP
      await validateEndpoint(connectionUrl);
      
      // Se a validação passou, conecta o EventSource
      connectEventSource(connectionUrl);
    } catch (error) {
      if (isDisconnecting) return;
      
      callbacks.onError(
        error instanceof Error ? error : new Error('Failed to connect to SSE endpoint')
      );
      callbacks.onClose();
    }
  };

  const disconnect = () => {
    isDisconnecting = true;
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
