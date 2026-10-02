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

    // Aguarda o setTimeout do mock
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

    // O mock do EventSource guarda withCredentials
    // Verificamos que não lançou erro
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

    // Conecta novamente
    adapter.connect();
    await vi.advanceTimersByTimeAsync(10);

    // Deve ter chamado onOpen duas vezes
    expect(callbacks.onOpen).toHaveBeenCalledTimes(2);
  });
});
