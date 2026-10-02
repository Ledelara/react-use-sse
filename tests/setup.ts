import { vi } from 'vitest';

// Mock do EventSource para testes
class MockEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;

  url: string;
  withCredentials: boolean;
  readyState: number = MockEventSource.CONNECTING;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private eventListeners: Map<string, EventListener[]> = new Map();

  constructor(url: string, options?: EventSourceInit) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;

    // Simula conexão assíncrona
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.eventListeners.get(type) || [];
    listeners.push(listener);
    this.eventListeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener) {
    const listeners = this.eventListeners.get(type) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners.get(event.type) || [];
    for (const listener of listeners) {
      listener(event);
    }
    return true;
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  // Helpers para testes
  simulateMessage(data: string, event = 'message', lastEventId?: string) {
    const messageEvent = new MessageEvent(event, {
      data,
      lastEventId,
    });

    if (event === 'message' && this.onmessage) {
      this.onmessage(messageEvent);
    } else {
      this.dispatchEvent(messageEvent);
    }
  }

  simulateError() {
    this.readyState = MockEventSource.CLOSED;
    this.onerror?.(new Event('error'));
  }
}

// @ts-expect-error - Mock global EventSource
global.EventSource = MockEventSource;

// Mock do fetch para testes
global.fetch = vi.fn();

// Mock do TextDecoder
global.TextDecoder = class {
  decode(input?: BufferSource, _options?: TextDecodeOptions): string {
    if (!input) return '';
    return new Uint8Array(input as ArrayBuffer).reduce(
      (str, byte) => str + String.fromCharCode(byte),
      ''
    );
  }
} as unknown as typeof TextDecoder;
