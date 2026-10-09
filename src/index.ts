export { useSSE } from './useSSE';
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

export { SSE_STATUS, SSE_READY_STATE } from './types';
export { createNativeAdapter, createFetchAdapter, SSEHttpError, EventSourcePolyfill } from './adapters';
export type { EventSourcePolyfillInit, SSEMessageEvent } from './adapters';
export { parseSSEChunk, parseSSEEvent } from './utils/parse-sse';
export {
  DEFAULT_RECONNECT_CONFIG,
  normalizeReconnectConfig,
  calculateRetryDelay,
  shouldRetry,
} from './utils/retry';
