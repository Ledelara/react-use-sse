import type { SSEAdapter, SSEAdapterOptions } from './types';
import { parseSSEChunk } from '../utils/parse-sse';

/**
 * Adapter que usa fetch + ReadableStream
 *
 * Vantagens:
 * - Suporta headers customizados (Authorization, etc.)
 * - Suporta diferentes métodos HTTP
 * - Maior controle sobre a requisição
 *
 * Limitações:
 * - Não aparece na aba EventStream do DevTools
 * - Reconexão manual
 *
 * @example
 * ```typescript
 * const adapter = createFetchAdapter({
 *   url: '/api/events',
 *   events: ['message', 'custom-event'],
 *   headers: { Authorization: 'Bearer xxx' },
 *   parser: JSON.parse,
 *   callbacks: { onOpen, onMessage, onError, onClose },
 * });
 *
 * adapter.connect();
 * // ...
 * adapter.disconnect();
 * ```
 */
export function createFetchAdapter<T>(
  options: SSEAdapterOptions<T>
): SSEAdapter {
  const { url, events, headers, withCredentials, parser, callbacks } = options;

  let abortController: AbortController | null = null;
  let connected = false;

  /**
   * Processa um chunk de dados SSE
   */
  const processChunk = (chunk: string) => {
    const sseEvents = parseSSEChunk<T>(chunk, parser);

    for (const sseEvent of sseEvents) {
      // Verifica se o evento está na lista de eventos para escutar
      if (events.includes(sseEvent.event)) {
        callbacks.onMessage(sseEvent.event, sseEvent.data, sseEvent.id);
      }
    }
  };

  /**
   * Conecta ao endpoint SSE usando fetch
   */
  const connect = async () => {
    // Cancela conexão existente
    if (abortController) {
      disconnect();
    }

    abortController = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...headers,
        },
        credentials: withCredentials ? 'include' : 'same-origin',
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty');
      }

      connected = true;
      callbacks.onOpen();

      // Lê o stream de dados
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Buffer para acumular chunks incompletos
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Processa qualquer dado restante no buffer
          if (buffer.trim()) {
            processChunk(buffer);
          }
          connected = false;
          callbacks.onClose();
          break;
        }

        // Decodifica e acumula no buffer
        buffer += decoder.decode(value, { stream: true });

        // Processa eventos completos (terminam com \n\n)
        const parts = buffer.split(/\n\n/);

        // Mantém a última parte no buffer (pode estar incompleta)
        buffer = parts.pop() || '';

        // Processa as partes completas
        for (const part of parts) {
          if (part.trim()) {
            processChunk(part + '\n\n');
          }
        }
      }
    } catch (error) {
      // Ignora erro de abort (desconexão intencional)
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      connected = false;
      callbacks.onError(
        error instanceof Error ? error : new Error('Unknown SSE error')
      );
      callbacks.onClose();
    }
  };

  /**
   * Desconecta do endpoint SSE
   */
  const disconnect = () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    connected = false;
  };

  /**
   * Verifica se está conectado
   */
  const isConnected = () => connected;

  return {
    connect,
    disconnect,
    isConnected,
  };
}
