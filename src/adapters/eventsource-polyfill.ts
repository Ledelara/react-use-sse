import { parseSSEChunk } from '../utils/parse-sse';

export type EventSourcePolyfillReadyState = 0 | 1 | 2;

export interface EventSourcePolyfillInit {
  headers?: Record<string, string>;
  withCredentials?: boolean;
  method?: 'GET' | 'POST';
  body?: string | object;
}

export interface SSEMessageEvent<T = unknown> {
  data: T;
  lastEventId: string;
  origin: string;
  type: string;
}

type EventHandler<T = unknown> = (event: SSEMessageEvent<T>) => void;

export class EventSourcePolyfill {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;

  readonly url: string;
  readonly withCredentials: boolean;

  private _readyState: EventSourcePolyfillReadyState = 0;
  private _lastEventId = '';
  private abortController: AbortController | null = null;
  private eventListeners: Map<string, Set<EventHandler>> = new Map();
  private headers: Record<string, string>;
  private method: 'GET' | 'POST';
  private body?: string | object;

  onopen: (() => void) | null = null;
  onmessage: ((event: SSEMessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string | URL, eventSourceInitDict?: EventSourcePolyfillInit) {
    this.url = typeof url === 'string' ? url : url.toString();
    this.withCredentials = eventSourceInitDict?.withCredentials ?? false;
    this.headers = eventSourceInitDict?.headers ?? {};
    this.method = eventSourceInitDict?.method ?? 'GET';
    this.body = eventSourceInitDict?.body;

    this.connect();
  }

  get readyState(): EventSourcePolyfillReadyState {
    return this._readyState;
  }

  get lastEventId(): string {
    return this._lastEventId;
  }

  addEventListener(type: string, listener: EventHandler): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventHandler): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  dispatchEvent(event: SSEMessageEvent): boolean {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
    return true;
  }

  close(): void {
    this._readyState = 2;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private buildRequestBody(): string | undefined {
    if (!this.body) return undefined;
    if (typeof this.body === 'string') return this.body;
    return JSON.stringify(this.body);
  }

  private buildHeaders(): Record<string, string> {
    const baseHeaders: Record<string, string> = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    };

    if (this._lastEventId) {
      baseHeaders['Last-Event-ID'] = this._lastEventId;
    }

    if (this.method === 'POST' && this.body && typeof this.body === 'object') {
      baseHeaders['Content-Type'] = 'application/json';
    }

    return { ...baseHeaders, ...this.headers };
  }

  private createMessageEvent<T>(
    type: string,
    data: T,
    lastEventId: string
  ): SSEMessageEvent<T> {
    return {
      type,
      data,
      lastEventId,
      origin: new URL(this.url, window.location.origin).origin,
    };
  }

  private async connect(): Promise<void> {
    if (this._readyState === 2) return;

    this._readyState = 0;
    this.abortController = new AbortController();

    try {
      const response = await fetch(this.url, {
        method: this.method,
        headers: this.buildHeaders(),
        body: this.buildRequestBody(),
        credentials: this.withCredentials ? 'include' : 'same-origin',
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty');
      }

      this._readyState = 1;
      this.onopen?.();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;

      while (!done && this._readyState === 1) {
        const result = await reader.read();
        done = result.done;

        if (done) {
          if (buffer.trim()) {
            this.processChunk(buffer);
          }
          this.handleClose();
          break;
        }

        buffer += decoder.decode(result.value, { stream: true });

        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (part.trim()) {
            this.processChunk(part + '\n\n');
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      this.handleError();
    }
  }

  private processChunk(chunk: string): void {
    const parser = (raw: string) => raw;
    const events = parseSSEChunk<string>(chunk, parser);

    for (const sseEvent of events) {
      if (sseEvent.id) {
        this._lastEventId = sseEvent.id;
      }

      const messageEvent = this.createMessageEvent(
        sseEvent.event,
        sseEvent.data,
        this._lastEventId
      );

      if (sseEvent.event === 'message') {
        this.onmessage?.(messageEvent);
      }

      this.dispatchEvent(messageEvent);
    }
  }

  private handleError(): void {
    this._readyState = 2;
    const errorEvent = new Event('error');
    this.onerror?.(errorEvent);
  }

  private handleClose(): void {
    this._readyState = 2;
  }
}
