import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFetchAdapter } from '../src/adapters/fetch-adapter';

describe('createFetchAdapter', () => {
  let callbacks: {
    onOpen: ReturnType<typeof vi.fn>;
    onMessage: ReturnType<typeof vi.fn>;
    onError: ReturnType<typeof vi.fn>;
    onClose: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    callbacks = {
      onOpen: vi.fn(),
      onMessage: vi.fn(),
      onError: vi.fn(),
      onClose: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create an adapter with connect/disconnect/isConnected', () => {
    const adapter = createFetchAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    expect(adapter.connect).toBeDefined();
    expect(adapter.disconnect).toBeDefined();
    expect(adapter.isConnected).toBeDefined();
  });

  it('should not be connected initially', () => {
    const adapter = createFetchAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    expect(adapter.isConnected()).toBe(false);
  });

  it('should call fetch with correct headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        }),
      },
    });
    global.fetch = mockFetch;

    const adapter = createFetchAdapter({
      url: '/api/events',
      events: ['message'],
      headers: { Authorization: 'Bearer token' },
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/events',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
            Authorization: 'Bearer token',
          }),
        })
      );
    });
  });

  it('should call onOpen when response is ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        }),
      },
    });

    const adapter = createFetchAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();

    await vi.waitFor(() => {
      expect(callbacks.onOpen).toHaveBeenCalled();
    });
  });

  it('should call onError when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const adapter = createFetchAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();

    await vi.waitFor(() => {
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('500'),
        })
      );
    });
  });

  it('should call onError when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const adapter = createFetchAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();

    await vi.waitFor(() => {
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Network error',
        })
      );
    });
  });

  it('should call onClose when stream ends', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        }),
      },
    });

    const adapter = createFetchAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();

    await vi.waitFor(() => {
      expect(callbacks.onClose).toHaveBeenCalled();
    });
  });

  it('should parse SSE messages and call onMessage', async () => {
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

    const adapter = createFetchAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();

    await vi.waitFor(() => {
      expect(callbacks.onMessage).toHaveBeenCalledWith(
        'message',
        { test: true },
        undefined
      );
    });
  });

  it('should disconnect and abort fetch', async () => {
    let aborted = false;
    global.fetch = vi.fn().mockImplementation((_url, options) => {
      options?.signal?.addEventListener('abort', () => {
        aborted = true;
      });
      return new Promise(() => {}); // Never resolves
    });

    const adapter = createFetchAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();
    adapter.disconnect();

    expect(aborted).toBe(true);
    expect(adapter.isConnected()).toBe(false);
  });

  it('should use include credentials when withCredentials is true', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        }),
      },
    });
    global.fetch = mockFetch;

    const adapter = createFetchAdapter({
      url: '/api/events',
      events: ['message'],
      withCredentials: true,
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/events',
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });
  });
});
