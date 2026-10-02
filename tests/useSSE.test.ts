import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSE } from '../src/useSSE';

describe('useSSE', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have closed status when disabled', () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      // When disabled, disconnect is called which sets status to 'closed'
      expect(result.current.status).toBe('closed');
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should start connecting when enabled', () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: true })
      );

      // Should be connecting or connected (depending on mock timing)
      expect(['connecting', 'connected']).toContain(result.current.status);
    });

    it('should have null data initially', () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      expect(result.current.data).toBeNull();
    });

    it('should have null error initially', () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      expect(result.current.error).toBeNull();
    });

    it('should have null lastEvent initially', () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      expect(result.current.lastEvent).toBeNull();
    });

    it('should have zero retryCount initially', () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('connect/disconnect functions', () => {
    it('should expose connect function', () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      expect(typeof result.current.connect).toBe('function');
    });

    it('should expose disconnect function', () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      expect(typeof result.current.disconnect).toBe('function');
    });

    it('should change status when connect is called', () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      expect(result.current.status).toBe('closed');

      act(() => {
        result.current.connect();
      });

      // Should be connecting or connected after calling connect
      expect(['connecting', 'connected']).toContain(result.current.status);
    });

    it('should set status to closed when disconnect is called', () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: true })
      );

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status).toBe('closed');
    });
  });

  describe('method selection', () => {
    it('should use fetch adapter when headers are provided', () => {
      const mockFetch = vi.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves to avoid timeout issues
      );
      global.fetch = mockFetch;

      renderHook(() =>
        useSSE({
          url: '/api/events',
          headers: { Authorization: 'Bearer token' },
        })
      );

      // Fetch should be called when headers are provided
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should not call fetch when using native method without headers', () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      renderHook(() =>
        useSSE({
          url: '/api/events',
          method: 'native',
        })
      );

      // Fetch should NOT be called for native method
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('reconnection config', () => {
    it('should accept boolean reconnect option', () => {
      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          reconnect: false,
          enabled: false,
        })
      );

      // Should not throw
      expect(result.current).toBeDefined();
    });

    it('should accept object reconnect option', () => {
      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          reconnect: {
            enabled: true,
            maxRetries: 5,
            delay: 1000,
          },
          enabled: false,
        })
      );

      // Should not throw
      expect(result.current).toBeDefined();
    });
  });

  describe('events option', () => {
    it('should accept custom events array', () => {
      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          events: ['message', 'custom-event', 'another-event'],
          enabled: false,
        })
      );

      // Should not throw
      expect(result.current).toBeDefined();
    });
  });

  describe('callbacks', () => {
    it('should accept onMessage callback', () => {
      const onMessage = vi.fn();
      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onMessage,
          enabled: false,
        })
      );

      expect(result.current).toBeDefined();
    });

    it('should accept onError callback', () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onError,
          enabled: false,
        })
      );

      expect(result.current).toBeDefined();
    });

    it('should accept onOpen callback', () => {
      const onOpen = vi.fn();
      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onOpen,
          enabled: false,
        })
      );

      expect(result.current).toBeDefined();
    });

    it('should accept onClose callback', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          onClose,
          enabled: false,
        })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('parser option', () => {
    it('should accept custom parser', () => {
      const customParser = (raw: string) => ({ parsed: raw });
      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          parser: customParser,
          enabled: false,
        })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('unmount behavior', () => {
    it('should not throw on unmount', () => {
      const { unmount } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: true })
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
