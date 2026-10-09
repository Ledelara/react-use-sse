// Hook principal
export { useSSE } from './useSSE';

// Tipos
export type {
  SSEStatus,
  SSEMethod,
  SSEReconnectConfig,
  UseSSEOptions,
  UseSSEReturn,
  SSEEvent,
  SSEAdapter,
  SSEAdapterCallbacks,
  SSEAdapterOptions,
} from './types';

// Adapters (para uso avançado)
export { createNativeAdapter, createFetchAdapter, SSEHttpError } from './adapters';

// Utilitários (para uso avançado)
export { parseSSEChunk, parseSSEEvent } from './utils/parse-sse';
export {
  DEFAULT_RECONNECT_CONFIG,
  normalizeReconnectConfig,
  calculateRetryDelay,
  shouldRetry,
} from './utils/retry';
