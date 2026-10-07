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

  const processChunk = (chunk: string) => {
    const sseEvents = parseSSEChunk<T>(chunk, parser);

    for (const sseEvent of sseEvents) {
      if (events.includes(sseEvent.event)) {
        callbacks.onMessage(sseEvent.event, sseEvent.data, sseEvent.id);
      }
    }
  };

  const connect = async () => {
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (buffer.trim()) {
            processChunk(buffer);
          }
          connected = false;
          callbacks.onClose();
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split(/\n\n/);

        buffer = parts.pop() || '';

        for (const part of parts) {
          if (part.trim()) {
            processChunk(part + '\n\n');
          }
        }
      }
    } catch (error) {
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

  const disconnect = () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    connected = false;
  };

  const isConnected = () => connected;

  return {
    connect,
    disconnect,
    isConnected,
  };
}
