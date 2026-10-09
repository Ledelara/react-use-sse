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
    signal,
    httpMethod = 'GET',
    body,
    connectionTimeout,
    idleTimeout,
    onMessage,
    onError,
    onOpen,
    onClose,
    onReconnect,
  } = options;

  // Se headers, httpMethod POST ou body foi definido, força método fetch
  const method = headers || httpMethod === 'POST' || body ? 'fetch' : methodOption;
  const reconnectConfig = normalizeReconnectConfig(reconnectOption);

  // Estados
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<SSEStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Refs
  const adapterRef = useRef<SSEAdapter | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectConfigRef = useRef<Required<SSEReconnectConfig>>(reconnectConfig);
  const retryCountRef = useRef(0);
  const isManualDisconnectRef = useRef(false);
  const lastEventIdRef = useRef<string | null>(null);

  // Refs para callbacks (evita recriação do adapter a cada render)
  const onOpenRef = useRef(onOpen);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onCloseRef = useRef(onClose);
  const onReconnectRef = useRef(onReconnect);

  // Atualiza refs quando callbacks mudam
  useEffect(() => {
    onOpenRef.current = onOpen;
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onCloseRef.current = onClose;
    onReconnectRef.current = onReconnect;
  }, [onOpen, onMessage, onError, onClose, onReconnect]);

  useEffect(() => {
    reconnectConfigRef.current = reconnectConfig;
  }, [reconnectConfig]);

  useEffect(() => {
    lastEventIdRef.current = lastEventId;
  }, [lastEventId]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const clearIdleTimeout = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  }, []);

  const resetIdleTimeout = useCallback(() => {
    clearIdleTimeout();
    if (idleTimeout && idleTimeout > 0) {
      idleTimeoutRef.current = setTimeout(() => {
        // Conexão inativa - força reconexão
        if (adapterRef.current && !isManualDisconnectRef.current) {
          const idleError = new Error(`Connection idle for ${idleTimeout}ms`);
          idleError.name = 'IdleTimeoutError';
          onErrorRef.current?.(idleError);
          adapterRef.current.disconnect();
        }
      }, idleTimeout);
    }
  }, [idleTimeout, clearIdleTimeout]);

  const createCallbacks = useCallback(() => ({
    onOpen: () => {
      clearConnectionTimeout();
      setStatus('connected');
      setError(null);
      retryCountRef.current = 0;
      setRetryCount(0);
      resetIdleTimeout();
      onOpenRef.current?.();
    },
    onMessage: (event: string, eventData: T, id?: string) => {
      resetIdleTimeout();
      setData(eventData);
      setLastEvent(event);
      if (id) {
        setLastEventId(id);
        lastEventIdRef.current = id;
      }
      onMessageRef.current?.(event, eventData);
    },
    onError: (err: Error) => {
      clearConnectionTimeout();
      clearIdleTimeout();
      setError(err);
      onErrorRef.current?.(err);
    },
    onClose: () => {
      clearConnectionTimeout();
      clearIdleTimeout();
      onCloseRef.current?.();
    },
  }), [clearConnectionTimeout, clearIdleTimeout, resetIdleTimeout]);

  const scheduleReconnect = useCallback(() => {
    const config = reconnectConfigRef.current;
    const attempt = retryCountRef.current;

    if (!shouldRetry(attempt, config)) {
      setStatus('error');
      return;
    }

    if (onReconnectRef.current) {
      const shouldContinue = onReconnectRef.current(attempt);
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
      
      if (adapterRef.current) {
        adapterRef.current.disconnect();
      }
      
      const adapterOptions = {
        url,
        events,
        headers,
        withCredentials,
        parser,
        httpMethod,
        body,
        callbacks: {
          ...createCallbacks(),
          onClose: () => {
            if (!isManualDisconnectRef.current && reconnectConfigRef.current.enabled) {
              scheduleReconnect();
            } else {
              setStatus('closed');
            }
            onCloseRef.current?.();
          },
        },
        lastEventId: lastEventIdRef.current ?? undefined,
      };
      
      const adapter = method === 'native'
        ? createNativeAdapter(adapterOptions)
        : createFetchAdapter(adapterOptions);
      
      adapterRef.current = adapter;
      adapter.connect();
    }, delay);
  }, [url, events, headers, withCredentials, parser, method, createCallbacks]);

  const connect = useCallback(() => {
    isManualDisconnectRef.current = false;
    clearReconnectTimeout();
    clearConnectionTimeout();
    clearIdleTimeout();

    if (adapterRef.current) {
      adapterRef.current.disconnect();
    }

    setStatus('connecting');
    setError(null);
    
    setLastEventId(null);
    lastEventIdRef.current = null;

    // Configura timeout de conexão
    if (connectionTimeout && connectionTimeout > 0) {
      connectionTimeoutRef.current = setTimeout(() => {
        if (status === 'connecting') {
          const timeoutError = new Error(`Connection timeout after ${connectionTimeout}ms`);
          timeoutError.name = 'ConnectionTimeoutError';
          setError(timeoutError);
          onErrorRef.current?.(timeoutError);
          
          if (adapterRef.current) {
            adapterRef.current.disconnect();
          }
        }
      }, connectionTimeout);
    }

    const adapterOptions = {
      url,
      events,
      headers,
      withCredentials,
      parser,
      httpMethod,
      body,
      callbacks: {
        ...createCallbacks(),
        onClose: () => {
          if (!isManualDisconnectRef.current && reconnectConfigRef.current.enabled) {
            scheduleReconnect();
          } else {
            setStatus('closed');
          }
          onCloseRef.current?.();
        },
      },
      lastEventId: undefined,
    };

    const adapter = method === 'native'
      ? createNativeAdapter(adapterOptions)
      : createFetchAdapter(adapterOptions);

    adapterRef.current = adapter;
    adapter.connect();
  }, [url, events, headers, withCredentials, parser, method, httpMethod, body, connectionTimeout, status, createCallbacks, clearReconnectTimeout, clearConnectionTimeout, clearIdleTimeout, scheduleReconnect]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    clearReconnectTimeout();
    clearConnectionTimeout();
    clearIdleTimeout();

    if (adapterRef.current) {
      adapterRef.current.disconnect();
      adapterRef.current = null;
    }

    setStatus('closed');
  }, [clearReconnectTimeout, clearConnectionTimeout, clearIdleTimeout]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, url, method]);

  useEffect(() => {
    if (!signal) return;

    const handleAbort = () => {
      disconnect();
    };

    if (signal.aborted) {
      handleAbort();
      return;
    }

    signal.addEventListener('abort', handleAbort);
    return () => {
      signal.removeEventListener('abort', handleAbort);
    };
  }, [signal, disconnect]);

  const readyState: 0 | 1 | 2 = 
    status === 'connecting' || status === 'reconnecting' ? 0 :
    status === 'connected' ? 1 : 2;

  return {
    data,
    status,
    error,
    lastEvent,
    lastEventId,
    retryCount,
    readyState,
    connect,
    disconnect,
  };
}
