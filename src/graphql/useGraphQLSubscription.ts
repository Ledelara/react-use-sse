import { useCallback, useEffect, useRef, useState } from 'react';

import { createFetchAdapter } from '../adapters';
import { normalizeReconnectConfig, calculateRetryDelay, shouldRetry } from '../utils';
import type { SSEStatus, SSEAdapter, SSEReconnectConfig } from '../types';
import type {
  GraphQLSubscriptionOptions,
  GraphQLSubscriptionReturn,
  GraphQLError,
  GraphQLResponse,
} from './types';

export function useGraphQLSubscription<T = unknown, V = Record<string, unknown>>(
  options: GraphQLSubscriptionOptions<T, V>
): GraphQLSubscriptionReturn<T> {
  const {
    url,
    subscription,
    variables,
    operationName,
    headers,
    withCredentials = false,
    reconnect: reconnectOption = true,
    signal,
    connectionTimeout,
    idleTimeout,
    onData,
    onError,
    onNetworkError,
    onOpen,
    onClose,
    onReconnect,
    enabled = true,
  } = options;

  const reconnectConfig = normalizeReconnectConfig(reconnectOption);

  const [data, setData] = useState<T | null>(null);
  const [errors, setErrors] = useState<GraphQLError[] | null>(null);
  const [status, setStatus] = useState<SSEStatus>('idle');
  const [networkError, setNetworkError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const adapterRef = useRef<SSEAdapter | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectConfigRef = useRef<Required<SSEReconnectConfig>>(reconnectConfig);
  const retryCountRef = useRef(0);
  const isManualDisconnectRef = useRef(false);

  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);
  const onNetworkErrorRef = useRef(onNetworkError);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onDataRef.current = onData;
    onErrorRef.current = onError;
    onNetworkErrorRef.current = onNetworkError;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onReconnectRef.current = onReconnect;
  }, [onData, onError, onNetworkError, onOpen, onClose, onReconnect]);

  useEffect(() => {
    reconnectConfigRef.current = reconnectConfig;
  }, [reconnectConfig]);

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
        if (adapterRef.current && !isManualDisconnectRef.current) {
          const idleError = new Error(`Connection idle for ${idleTimeout}ms`);
          idleError.name = 'IdleTimeoutError';
          onNetworkErrorRef.current?.(idleError);
          adapterRef.current.disconnect();
        }
      }, idleTimeout);
    }
  }, [idleTimeout, clearIdleTimeout]);

  const parseGraphQLResponse = useCallback((raw: string): GraphQLResponse<T> => {
    return JSON.parse(raw) as GraphQLResponse<T>;
  }, []);

  const createCallbacks = useCallback(() => ({
    onOpen: () => {
      clearConnectionTimeout();
      setStatus('connected');
      setNetworkError(null);
      retryCountRef.current = 0;
      setRetryCount(0);
      resetIdleTimeout();
      onOpenRef.current?.();
    },
    onMessage: (_event: string, response: GraphQLResponse<T>) => {
      resetIdleTimeout();

      if (response.errors && response.errors.length > 0) {
        setErrors(response.errors);
        onErrorRef.current?.(response.errors);
      }

      if (response.data !== undefined) {
        setData(response.data);
        setErrors(null);
        onDataRef.current?.(response.data);
      }
    },
    onError: (err: Error) => {
      clearConnectionTimeout();
      clearIdleTimeout();
      setNetworkError(err);
      onNetworkErrorRef.current?.(err);
    },
    onClose: () => {
      clearConnectionTimeout();
      clearIdleTimeout();
      onCloseRef.current?.();
    },
  }), [clearConnectionTimeout, clearIdleTimeout, resetIdleTimeout]);

  const buildRequestBody = useCallback(() => {
    const body: Record<string, unknown> = {
      query: subscription,
    };

    if (variables) {
      body.variables = variables;
    }

    if (operationName) {
      body.operationName = operationName;
    }

    return body;
  }, [subscription, variables, operationName]);

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
        events: ['message'],
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        withCredentials,
        parser: parseGraphQLResponse,
        httpMethod: 'POST' as const,
        body: buildRequestBody(),
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
      };

      const adapter = createFetchAdapter(adapterOptions);
      adapterRef.current = adapter;
      adapter.connect();
    }, delay);
  }, [url, headers, withCredentials, parseGraphQLResponse, buildRequestBody, createCallbacks]);

  const connect = useCallback(() => {
    isManualDisconnectRef.current = false;
    clearReconnectTimeout();
    clearConnectionTimeout();
    clearIdleTimeout();

    if (adapterRef.current) {
      adapterRef.current.disconnect();
    }

    setStatus('connecting');
    setNetworkError(null);
    setErrors(null);

    if (connectionTimeout && connectionTimeout > 0) {
      connectionTimeoutRef.current = setTimeout(() => {
        if (status === 'connecting') {
          const timeoutError = new Error(`Connection timeout after ${connectionTimeout}ms`);
          timeoutError.name = 'ConnectionTimeoutError';
          setNetworkError(timeoutError);
          onNetworkErrorRef.current?.(timeoutError);

          if (adapterRef.current) {
            adapterRef.current.disconnect();
          }
        }
      }, connectionTimeout);
    }

    const adapterOptions = {
      url,
      events: ['message'],
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      withCredentials,
      parser: parseGraphQLResponse,
      httpMethod: 'POST' as const,
      body: buildRequestBody(),
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
    };

    const adapter = createFetchAdapter(adapterOptions);
    adapterRef.current = adapter;
    adapter.connect();
  }, [
    url,
    headers,
    withCredentials,
    parseGraphQLResponse,
    buildRequestBody,
    connectionTimeout,
    status,
    createCallbacks,
    clearReconnectTimeout,
    clearConnectionTimeout,
    clearIdleTimeout,
    scheduleReconnect,
  ]);

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
  }, [enabled, url, subscription, JSON.stringify(variables)]);

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
    errors,
    status,
    networkError,
    retryCount,
    readyState,
    connect,
    disconnect,
  };
}
