import type { SSEStatus, SSEReconnectConfig } from '../types';

export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLSubscriptionOptions<T = unknown, V = Record<string, unknown>> {
  url: string;
  subscription: string;
  variables?: V;
  operationName?: string;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  reconnect?: SSEReconnectConfig | boolean;
  signal?: AbortSignal;
  connectionTimeout?: number;
  idleTimeout?: number;
  onData?: (data: T) => void;
  onError?: (errors: GraphQLError[]) => void;
  onNetworkError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onReconnect?: (attempt: number) => boolean | void;
  enabled?: boolean;
}

export interface GraphQLSubscriptionReturn<T> {
  data: T | null;
  errors: GraphQLError[] | null;
  status: SSEStatus;
  networkError: Error | null;
  retryCount: number;
  readyState: 0 | 1 | 2;
  connect: () => void;
  disconnect: () => void;
}

export interface GraphQLSSEClientOptions {
  url: string;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export interface SubscriptionOptions<V = Record<string, unknown>> {
  subscription: string;
  variables?: V;
  operationName?: string;
}

export interface SubscriptionCallbacks<T = unknown> {
  onData?: (data: T) => void;
  onError?: (errors: GraphQLError[]) => void;
  onNetworkError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface Subscription {
  unsubscribe: () => void;
}
