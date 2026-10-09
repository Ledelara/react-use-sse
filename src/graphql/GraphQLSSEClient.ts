import { EventSourcePolyfill } from '../adapters/eventsource-polyfill';
import type {
  GraphQLSSEClientOptions,
  SubscriptionOptions,
  SubscriptionCallbacks,
  Subscription,
  GraphQLResponse,
  GraphQLError,
} from './types';

export class GraphQLSSEClient {
  private url: string;
  private headers: Record<string, string>;
  private withCredentials: boolean;

  constructor(options: GraphQLSSEClientOptions) {
    this.url = options.url;
    this.headers = options.headers ?? {};
    this.withCredentials = options.withCredentials ?? false;
  }

  subscribe<T = unknown, V = Record<string, unknown>>(
    options: SubscriptionOptions<V>,
    callbacks?: SubscriptionCallbacks<T>
  ): Subscription {
    const body = {
      query: options.subscription,
      variables: options.variables,
      operationName: options.operationName,
    };

    const source = new EventSourcePolyfill(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...this.headers,
      },
      body,
      withCredentials: this.withCredentials,
    });

    source.onopen = () => {
      callbacks?.onOpen?.();
    };

    source.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data as string) as GraphQLResponse<T>;

        if (response.errors && response.errors.length > 0) {
          callbacks?.onError?.(response.errors);
        }

        if (response.data !== undefined) {
          callbacks?.onData?.(response.data);
        }
      } catch (err) {
        const parseError: GraphQLError = {
          message: `Failed to parse GraphQL response: ${(err as Error).message}`,
        };
        callbacks?.onError?.([parseError]);
      }
    };

    source.onerror = () => {
      callbacks?.onNetworkError?.(new Error('GraphQL SSE connection error'));
      callbacks?.onClose?.();
    };

    return {
      unsubscribe: () => {
        source.close();
        callbacks?.onClose?.();
      },
    };
  }

  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }

  setHeader(key: string, value: string): void {
    this.headers[key] = value;
  }

  removeHeader(key: string): void {
    delete this.headers[key];
  }
}
