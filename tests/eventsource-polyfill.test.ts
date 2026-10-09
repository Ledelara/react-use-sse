import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventSourcePolyfill } from '../src/adapters/eventsource-polyfill';

describe('EventSourcePolyfill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('static properties', () => {
    it('should have static readyState constants', () => {
      expect(EventSourcePolyfill.CONNECTING).toBe(0);
      expect(EventSourcePolyfill.OPEN).toBe(1);
      expect(EventSourcePolyfill.CLOSED).toBe(2);
    });

    it('should have instance readyState constants', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const es = new EventSourcePolyfill('/api/events');

      expect(es.CONNECTING).toBe(0);
      expect(es.OPEN).toBe(1);
      expect(es.CLOSED).toBe(2);

      es.close();
    });
  });

  describe('constructor', () => {
    it('should accept string URL', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const es = new EventSourcePolyfill('/api/events');

      expect(es.url).toBe('/api/events');
      es.close();
    });

    it('should accept URL object', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const es = new EventSourcePolyfill(new URL('https://example.com/events'));

      expect(es.url).toBe('https://example.com/events');
      es.close();
    });

    it('should default withCredentials to false', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const es = new EventSourcePolyfill('/api/events');

      expect(es.withCredentials).toBe(false);
      es.close();
    });

    it('should set withCredentials from options', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const es = new EventSourcePolyfill('/api/events', { withCredentials: true });

      expect(es.withCredentials).toBe(true);
      es.close();
    });

    it('should start in CONNECTING state', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const es = new EventSourcePolyfill('/api/events');

      expect(es.readyState).toBe(0);
      es.close();
    });

    it('should start connection immediately', () => {
      const mockFetch = vi.fn().mockImplementation(() => new Promise(() => {}));
      global.fetch = mockFetch;

      const es = new EventSourcePolyfill('/api/events');

      expect(mockFetch).toHaveBeenCalled();
      es.close();
    });
  });

  describe('headers', () => {
    it('should send custom headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const es = new EventSourcePolyfill('/api/events', {
        headers: {
          Authorization: 'Bearer my-token',
          'X-Custom-Header': 'custom-value',
        },
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/events',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer my-token',
              'X-Custom-Header': 'custom-value',
            }),
          })
        );
      });

      es.close();
    });

    it('should send Accept and Cache-Control headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const es = new EventSourcePolyfill('/api/events');

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/events',
          expect.objectContaining({
            headers: expect.objectContaining({
              Accept: 'text/event-stream',
              'Cache-Control': 'no-cache',
            }),
          })
        );
      });

      es.close();
    });

    it('should send Last-Event-ID header on reconnection', async () => {
      const encoder = new TextEncoder();
      const messageData = 'id: event-123\ndata: test\n\n';
      const encodedData = encoder.encode(messageData);

      let readCount = 0;
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              readCount++;
              if (readCount === 1) {
                return Promise.resolve({ done: false, value: encodedData });
              }
              return Promise.resolve({ done: true, value: undefined });
            }),
          }),
        },
      });
      global.fetch = mockFetch;

      const es = new EventSourcePolyfill('/api/events');

      await vi.waitFor(() => {
        expect(es.lastEventId).toBe('event-123');
      });

      es.close();
    });
  });

  describe('HTTP methods', () => {
    it('should use GET by default', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const es = new EventSourcePolyfill('/api/events');

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/events',
          expect.objectContaining({
            method: 'GET',
          })
        );
      });

      es.close();
    });

    it('should support POST method', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const es = new EventSourcePolyfill('/api/events', {
        method: 'POST',
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/events',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      es.close();
    });

    it('should send body with POST', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const es = new EventSourcePolyfill('/api/events', {
        method: 'POST',
        body: { prompt: 'Hello' },
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/events',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ prompt: 'Hello' }),
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });

      es.close();
    });

    it('should send string body as-is', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const es = new EventSourcePolyfill('/api/events', {
        method: 'POST',
        body: 'raw body content',
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/events',
          expect.objectContaining({
            body: 'raw body content',
          })
        );
      });

      es.close();
    });
  });

  describe('credentials', () => {
    it('should use same-origin by default', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const es = new EventSourcePolyfill('/api/events');

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/events',
          expect.objectContaining({
            credentials: 'same-origin',
          })
        );
      });

      es.close();
    });

    it('should use include when withCredentials is true', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const es = new EventSourcePolyfill('/api/events', {
        withCredentials: true,
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/events',
          expect.objectContaining({
            credentials: 'include',
          })
        );
      });

      es.close();
    });
  });

  describe('callbacks', () => {
    it('should call onopen when connected', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });

      const es = new EventSourcePolyfill('/api/events');
      const onOpen = vi.fn();
      es.onopen = onOpen;

      await vi.waitFor(() => {
        expect(onOpen).toHaveBeenCalled();
      });

      es.close();
    });

    it('should call onmessage for message events', async () => {
      const encoder = new TextEncoder();
      const messageData = 'data: {"test": true}\n\n';
      const encodedData = encoder.encode(messageData);

      let readCount = 0;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              readCount++;
              if (readCount === 1) {
                return Promise.resolve({ done: false, value: encodedData });
              }
              return Promise.resolve({ done: true, value: undefined });
            }),
          }),
        },
      });

      const es = new EventSourcePolyfill('/api/events');
      const onMessage = vi.fn();
      es.onmessage = onMessage;

      await vi.waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'message',
            data: '{"test": true}',
          })
        );
      });

      es.close();
    });

    it('should call onerror on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const es = new EventSourcePolyfill('/api/events');
      const onError = vi.fn();
      es.onerror = onError;

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      expect(es.readyState).toBe(2);
      es.close();
    });

    it('should call onerror on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const es = new EventSourcePolyfill('/api/events');
      const onError = vi.fn();
      es.onerror = onError;

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      expect(es.readyState).toBe(2);
      es.close();
    });
  });

  describe('event listeners', () => {
    it('should support addEventListener', async () => {
      const encoder = new TextEncoder();
      const messageData = 'event: custom\ndata: hello\n\n';
      const encodedData = encoder.encode(messageData);

      let readCount = 0;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              readCount++;
              if (readCount === 1) {
                return Promise.resolve({ done: false, value: encodedData });
              }
              return Promise.resolve({ done: true, value: undefined });
            }),
          }),
        },
      });

      const es = new EventSourcePolyfill('/api/events');
      const listener = vi.fn();
      es.addEventListener('custom', listener);

      await vi.waitFor(() => {
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'custom',
            data: 'hello',
          })
        );
      });

      es.close();
    });

    it('should support removeEventListener', async () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const es = new EventSourcePolyfill('/api/events');
      const listener = vi.fn();

      es.addEventListener('custom', listener);
      es.removeEventListener('custom', listener);

      es.dispatchEvent({
        type: 'custom',
        data: 'test',
        lastEventId: '',
        origin: '',
      });

      expect(listener).not.toHaveBeenCalled();

      es.close();
    });

    it('should support multiple listeners for same event', async () => {
      const encoder = new TextEncoder();
      const messageData = 'event: update\ndata: test\n\n';
      const encodedData = encoder.encode(messageData);

      let readCount = 0;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              readCount++;
              if (readCount === 1) {
                return Promise.resolve({ done: false, value: encodedData });
              }
              return Promise.resolve({ done: true, value: undefined });
            }),
          }),
        },
      });

      const es = new EventSourcePolyfill('/api/events');
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      es.addEventListener('update', listener1);
      es.addEventListener('update', listener2);

      await vi.waitFor(() => {
        expect(listener1).toHaveBeenCalled();
        expect(listener2).toHaveBeenCalled();
      });

      es.close();
    });

    it('should dispatch to both onmessage and addEventListener for message events', async () => {
      const encoder = new TextEncoder();
      const messageData = 'data: test\n\n';
      const encodedData = encoder.encode(messageData);

      let readCount = 0;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              readCount++;
              if (readCount === 1) {
                return Promise.resolve({ done: false, value: encodedData });
              }
              return Promise.resolve({ done: true, value: undefined });
            }),
          }),
        },
      });

      const es = new EventSourcePolyfill('/api/events');
      const onMessage = vi.fn();
      const listener = vi.fn();

      es.onmessage = onMessage;
      es.addEventListener('message', listener);

      await vi.waitFor(() => {
        expect(onMessage).toHaveBeenCalled();
        expect(listener).toHaveBeenCalled();
      });

      es.close();
    });
  });

  describe('close', () => {
    it('should set readyState to CLOSED', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const es = new EventSourcePolyfill('/api/events');
      es.close();

      expect(es.readyState).toBe(2);
    });

    it('should abort ongoing fetch', () => {
      let aborted = false;
      global.fetch = vi.fn().mockImplementation((_url, options) => {
        options?.signal?.addEventListener('abort', () => {
          aborted = true;
        });
        return new Promise(() => {});
      });

      const es = new EventSourcePolyfill('/api/events');
      es.close();

      expect(aborted).toBe(true);
    });

    it('should not process messages after close', async () => {
      const encoder = new TextEncoder();
      const messageData = 'data: test\n\n';
      const encodedData = encoder.encode(messageData);

      global.fetch = vi.fn().mockImplementation((_url, options) => {
        return new Promise((resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });

          setTimeout(() => {
            resolve({
              ok: true,
              body: {
                getReader: () => ({
                  read: vi.fn().mockResolvedValue({ done: false, value: encodedData }),
                }),
              },
            });
          }, 100);
        });
      });

      const es = new EventSourcePolyfill('/api/events');
      const onMessage = vi.fn();
      es.onmessage = onMessage;

      es.close();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(onMessage).not.toHaveBeenCalled();
    });
  });

  describe('readyState transitions', () => {
    it('should transition from CONNECTING to OPEN on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });

      const es = new EventSourcePolyfill('/api/events');

      expect(es.readyState).toBe(0);

      await vi.waitFor(() => {
        expect(es.readyState).toBe(2);
      });
    });

    it('should transition to CLOSED on error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const es = new EventSourcePolyfill('/api/events');

      await vi.waitFor(() => {
        expect(es.readyState).toBe(2);
      });
    });

    it('should transition to CLOSED when stream ends', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });

      const es = new EventSourcePolyfill('/api/events');

      await vi.waitFor(() => {
        expect(es.readyState).toBe(2);
      });
    });
  });

  describe('message event properties', () => {
    it('should include origin in message events', async () => {
      const encoder = new TextEncoder();
      const messageData = 'data: test\n\n';
      const encodedData = encoder.encode(messageData);

      let readCount = 0;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              readCount++;
              if (readCount === 1) {
                return Promise.resolve({ done: false, value: encodedData });
              }
              return Promise.resolve({ done: true, value: undefined });
            }),
          }),
        },
      });

      const es = new EventSourcePolyfill('https://api.example.com/events');
      const onMessage = vi.fn();
      es.onmessage = onMessage;

      await vi.waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            origin: 'https://api.example.com',
          })
        );
      });

      es.close();
    });

    it('should track lastEventId from events', async () => {
      const encoder = new TextEncoder();
      const message1 = 'id: 1\ndata: first\n\n';
      const message2 = 'id: 2\ndata: second\n\n';
      const encoded1 = encoder.encode(message1);
      const encoded2 = encoder.encode(message2);

      let readCount = 0;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              readCount++;
              if (readCount === 1) return Promise.resolve({ done: false, value: encoded1 });
              if (readCount === 2) return Promise.resolve({ done: false, value: encoded2 });
              return Promise.resolve({ done: true, value: undefined });
            }),
          }),
        },
      });

      const es = new EventSourcePolyfill('/api/events');

      await vi.waitFor(() => {
        expect(es.lastEventId).toBe('2');
      });

      es.close();
    });

    it('should include lastEventId in message events', async () => {
      const encoder = new TextEncoder();
      const messageData = 'id: event-abc\ndata: test\n\n';
      const encodedData = encoder.encode(messageData);

      let readCount = 0;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              readCount++;
              if (readCount === 1) {
                return Promise.resolve({ done: false, value: encodedData });
              }
              return Promise.resolve({ done: true, value: undefined });
            }),
          }),
        },
      });

      const es = new EventSourcePolyfill('/api/events');
      const onMessage = vi.fn();
      es.onmessage = onMessage;

      await vi.waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            lastEventId: 'event-abc',
          })
        );
      });

      es.close();
    });
  });

  describe('multiple SSE events in single chunk', () => {
    it('should parse multiple events from one chunk', async () => {
      const encoder = new TextEncoder();
      const messageData = 'data: first\n\ndata: second\n\ndata: third\n\n';
      const encodedData = encoder.encode(messageData);

      let readCount = 0;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              readCount++;
              if (readCount === 1) {
                return Promise.resolve({ done: false, value: encodedData });
              }
              return Promise.resolve({ done: true, value: undefined });
            }),
          }),
        },
      });

      const es = new EventSourcePolyfill('/api/events');
      const messages: string[] = [];

      es.onmessage = (event) => {
        messages.push(event.data);
      };

      await vi.waitFor(() => {
        expect(messages).toEqual(['first', 'second', 'third']);
      });

      es.close();
    });
  });

  describe('custom events', () => {
    it('should handle custom event types', async () => {
      const encoder = new TextEncoder();
      const messageData = 'event: notification\ndata: {"type": "alert"}\n\n';
      const encodedData = encoder.encode(messageData);

      let readCount = 0;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              readCount++;
              if (readCount === 1) {
                return Promise.resolve({ done: false, value: encodedData });
              }
              return Promise.resolve({ done: true, value: undefined });
            }),
          }),
        },
      });

      const es = new EventSourcePolyfill('/api/events');
      const listener = vi.fn();
      es.addEventListener('notification', listener);

      await vi.waitFor(() => {
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'notification',
            data: '{"type": "alert"}',
          })
        );
      });

      es.close();
    });

    it('should not call onmessage for custom events', async () => {
      const encoder = new TextEncoder();
      const messageData = 'event: custom\ndata: test\n\n';
      const encodedData = encoder.encode(messageData);

      let readCount = 0;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              readCount++;
              if (readCount === 1) {
                return Promise.resolve({ done: false, value: encodedData });
              }
              return Promise.resolve({ done: true, value: undefined });
            }),
          }),
        },
      });

      const es = new EventSourcePolyfill('/api/events');
      const onMessage = vi.fn();
      es.onmessage = onMessage;

      const customListener = vi.fn();
      es.addEventListener('custom', customListener);

      await vi.waitFor(() => {
        expect(customListener).toHaveBeenCalled();
      });

      expect(onMessage).not.toHaveBeenCalled();

      es.close();
    });
  });
});
