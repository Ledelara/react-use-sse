import { useCallback, useEffect, useRef, useState } from 'react';

import { createNativeAdapter, createFetchAdapter } from './adapters';
import { normalizeReconnectConfig, calculateRetryDelay, shouldRetry } from './utils';
import type {
  UseSSEOptions,
  UseSSEReturn,
  SSEStatus,
  SSEAdapter,
  SSEReconnectConfig,
} from './types';

/**
 * React hook para consumir Server-Sent Events (SSE)
 *
 * Suporta dois métodos de conexão:
 * - `native`: Usa EventSource (aparece no DevTools, sem headers customizados)
 * - `fetch`: Usa fetch + ReadableStream (suporta headers, não aparece no DevTools)
 *
 * @example
 * ```tsx
 * // Uso básico
 * const { data, status } = useSSE<Notification>({
 *   url: '/api/notifications',
 * });
 *
 * // Com autenticação (força método fetch)
 * const { data, status, error } = useSSE<Order>({
 *   url: '/api/orders/stream',
 *   headers: { Authorization: `Bearer ${token}` },
 * });
 *
 * // Eventos customizados
 * const { data, lastEvent } = useSSE<ClassroomLink>({
 *   url: '/api/classroom/events',
 *   events: ['waiting', 'link-available'],
 *   onMessage: (event, data) => {
 *     if (event === 'link-available') {
 *       window.open(data.meetingUrl);
 *     }
 *   },
 * });
 *
 * // Controle manual
 * const { connect, disconnect, status } = useSSE<Message>({
 *   url: '/api/chat',
 *   enabled: false,
 * });
 * ```
 *
 * @param options - Opções de configuração
 * @returns Estado e controles da conexão SSE
 */
export function useSSE<T = unknown>(options: UseSSEOptions<T>): UseSSEReturn<T> {
  const {
    url,
    method: methodOption = 'native',
    enabled = true,
    events = ['message'],
    headers,
    withCredentials = false,
    reconnect: reconnectOption = true,
    parser = JSON.parse,
    onMessage,
    onError,
    onOpen,
    onClose,
    onReconnect,
  } = options;

  // Se headers foi definido, força método fetch
  const method = headers ? 'fetch' : methodOption;
  const reconnectConfig = normalizeReconnectConfig(reconnectOption);

  // Estados
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<SSEStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const adapterRef = useRef<SSEAdapter | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectConfigRef = useRef<Required<SSEReconnectConfig>>(reconnectConfig);
  const retryCountRef = useRef(0);
  const isManualDisconnectRef = useRef(false);

  useEffect(() => {
    reconnectConfigRef.current = reconnectConfig;
  }, [reconnectConfig]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    const config = reconnectConfigRef.current;
    const attempt = retryCountRef.current;

    if (!shouldRetry(attempt, config)) {
      setStatus('error');
      return;
    }

    if (onReconnect) {
      const shouldContinue = onReconnect(attempt);
      if (shouldContinue === false) {
        setStatus('error');
        return;
      }
    }

    setStatus('reconnecting');
    const delay = calculateRetryDelay(attempt, config);

    reconnectTimeoutRef.current = setTimeout(() => {
      retryCountRef.current += 1;
      setRetryCount(retryCountRef.current);
      adapterRef.current?.connect();
    }, delay);
  }, [onReconnect]);

  const callbacks = useCallback(
    () => ({
      onOpen: () => {
        setStatus('connected');
        setError(null);
        retryCountRef.current = 0;
        setRetryCount(0);
        onOpen?.();
      },
      onMessage: (event: string, eventData: T, id?: string) => {
        setData(eventData);
        setLastEvent(event);
        if (id) setLastEventId(id);
        onMessage?.(event, eventData);
      },
      onError: (err: Error) => {
        setError(err);
        onError?.(err);
      },
      onClose: () => {
        if (!isManualDisconnectRef.current && reconnectConfigRef.current.enabled) {
          scheduleReconnect();
        } else {
          setStatus('closed');
        }
        onClose?.();
      },
    }),
    [onOpen, onMessage, onError, onClose, scheduleReconnect]
  );

  const createAdapter = useCallback(() => {
    const adapterOptions = {
      url,
      events,
      headers,
      withCredentials,
      parser,
      callbacks: callbacks(),
    };

    return method === 'native'
      ? createNativeAdapter(adapterOptions)
      : createFetchAdapter(adapterOptions);
  }, [url, events, headers, withCredentials, parser, method, callbacks]);

  const connect = useCallback(() => {
    isManualDisconnectRef.current = false;
    clearReconnectTimeout();

    if (adapterRef.current) {
      adapterRef.current.disconnect();
    }

    setStatus('connecting');
    setError(null);

    const adapter = createAdapter();
    adapterRef.current = adapter;
    adapter.connect();
  }, [createAdapter, clearReconnectTimeout]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    clearReconnectTimeout();

    if (adapterRef.current) {
      adapterRef.current.disconnect();
      adapterRef.current = null;
    }

    setStatus('closed');
  }, [clearReconnectTimeout]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, url, method]);

  return {
    data,
    status,
    error,
    lastEvent,
    lastEventId,
    retryCount,
    connect,
    disconnect,
  };
}
