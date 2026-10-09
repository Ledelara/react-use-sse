import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNativeAdapter } from '../src/adapters/native-adapter';

describe('createNativeAdapter', () => {
  let callbacks: {
    onOpen: ReturnType<typeof vi.fn>;
    onMessage: ReturnType<typeof vi.fn>;
    onError: ReturnType<typeof vi.fn>;
    onClose: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    callbacks = {
      onOpen: vi.fn(),
      onMessage: vi.fn(),
      onError: vi.fn(),
      onClose: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should create an adapter with connect/disconnect/isConnected', () => {
    const adapter = createNativeAdapter({
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
    const adapter = createNativeAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    expect(adapter.isConnected()).toBe(false);
  });

  it('should call onOpen when connected', async () => {
    const adapter = createNativeAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();

    await vi.advanceTimersByTimeAsync(10);

    expect(callbacks.onOpen).toHaveBeenCalled();
  });

  it('should be connected after onOpen', async () => {
    const adapter = createNativeAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();
    await vi.advanceTimersByTimeAsync(10);

    expect(adapter.isConnected()).toBe(true);
  });

  it('should disconnect properly', async () => {
    const adapter = createNativeAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();
    await vi.advanceTimersByTimeAsync(10);

    adapter.disconnect();

    expect(adapter.isConnected()).toBe(false);
  });

  it('should pass withCredentials option', () => {
    const adapter = createNativeAdapter({
      url: '/api/events',
      events: ['message'],
      withCredentials: true,
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();

    expect(adapter).toBeDefined();
  });

  it('should close existing connection before reconnecting', async () => {
    const adapter = createNativeAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();
    await vi.advanceTimersByTimeAsync(10);

    adapter.connect();
    await vi.advanceTimersByTimeAsync(10);

    expect(callbacks.onOpen).toHaveBeenCalledTimes(2);
  });

  it('should append lastEventId to URL as query parameter', async () => {
    let capturedUrl = '';
    
    const originalEventSource = global.EventSource;
    global.EventSource = vi.fn().mockImplementation((url) => {
      capturedUrl = url;
      return {
        readyState: EventSource.OPEN,
        close: vi.fn(),
        onopen: null,
        onerror: null,
        onmessage: null,
        addEventListener: vi.fn(),
      };
    }) as unknown as typeof EventSource;
    
    (global.EventSource as unknown as Record<string, number>).CONNECTING = 0;
    (global.EventSource as unknown as Record<string, number>).OPEN = 1;
    (global.EventSource as unknown as Record<string, number>).CLOSED = 2;

    const adapter = createNativeAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
      lastEventId: 'event-456',
    });

    adapter.connect();

    expect(capturedUrl).toBe('/api/events?lastEventId=event-456');
    
    global.EventSource = originalEventSource;
  });

  it('should append lastEventId with & when URL already has query params', async () => {
    let capturedUrl = '';
    
    const originalEventSource = global.EventSource;
    global.EventSource = vi.fn().mockImplementation((url) => {
      capturedUrl = url;
      return {
        readyState: EventSource.OPEN,
        close: vi.fn(),
        onopen: null,
        onerror: null,
        onmessage: null,
        addEventListener: vi.fn(),
      };
    }) as unknown as typeof EventSource;
    
    (global.EventSource as unknown as Record<string, number>).CONNECTING = 0;
    (global.EventSource as unknown as Record<string, number>).OPEN = 1;
    (global.EventSource as unknown as Record<string, number>).CLOSED = 2;

    const adapter = createNativeAdapter({
      url: '/api/events?channel=main',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
      lastEventId: 'event-789',
    });

    adapter.connect();

    expect(capturedUrl).toBe('/api/events?channel=main&lastEventId=event-789');
    
    global.EventSource = originalEventSource;
  });

  it('should not append lastEventId when not provided', async () => {
    let capturedUrl = '';
    
    const originalEventSource = global.EventSource;
    global.EventSource = vi.fn().mockImplementation((url) => {
      capturedUrl = url;
      return {
        readyState: EventSource.OPEN,
        close: vi.fn(),
        onopen: null,
        onerror: null,
        onmessage: null,
        addEventListener: vi.fn(),
      };
    }) as unknown as typeof EventSource;
    
    (global.EventSource as unknown as Record<string, number>).CONNECTING = 0;
    (global.EventSource as unknown as Record<string, number>).OPEN = 1;
    (global.EventSource as unknown as Record<string, number>).CLOSED = 2;

    const adapter = createNativeAdapter({
      url: '/api/events',
      events: ['message'],
      parser: JSON.parse,
      callbacks,
    });

    adapter.connect();

    expect(capturedUrl).toBe('/api/events');
    
    global.EventSource = originalEventSource;
  });
});
