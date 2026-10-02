import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
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
    it('should have closed status when disabled', async () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      // When disabled, the hook disconnects which sets status to 'closed'
      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.status).toBe('closed');
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should connect when enabled', async () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: true })
      );

      // Should start connecting immediately
      expect(['connecting', 'connected']).toContain(result.current.status);

      // Wait for connection
      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      await waitFor(
        () => {
          expect(result.current.status).toBe('connected');
        },
        { timeout: 1000 }
      );
    });

    it('should work with native method by default', async () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Should not throw any errors
      expect(result.current.error).toBeNull();
    });
  });

  describe('method selection', () => {
    it('should force fetch method when headers are provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      renderHook(() =>
        useSSE({
          url: '/api/events',
          headers: { Authorization: 'Bearer token' },
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/events',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer token',
            }),
          })
        );
      });
    });
  });

  describe('connect/disconnect', () => {
    it('should connect manually when calling connect()', async () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.status).toBe('closed');

      act(() => {
        result.current.connect();
      });

      expect(['connecting', 'connected']).toContain(result.current.status);
    });

    it('should disconnect when calling disconnect()', async () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: true })
      );

      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      await waitFor(
        () => {
          expect(result.current.status).toBe('connected');
        },
        { timeout: 1000 }
      );

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status).toBe('closed');
    });

    it('should disconnect on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: true })
      );

      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      await waitFor(
        () => {
          expect(result.current.status).toBe('connected');
        },
        { timeout: 1000 }
      );

      // Should not throw any errors on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('callbacks', () => {
    it('should call onOpen when connected', async () => {
      const onOpen = vi.fn();

      renderHook(() => useSSE({ url: '/api/events', onOpen }));

      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      await waitFor(
        () => {
          expect(onOpen).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });

    it('should call onError when error occurs', async () => {
      const onError = vi.fn();

      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      renderHook(() =>
        useSSE({
          url: '/api/events',
          method: 'fetch',
          onError,
          reconnect: false,
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      await waitFor(
        () => {
          expect(onError).toHaveBeenCalledWith(expect.any(Error));
        },
        { timeout: 1000 }
      );
    });
  });

  describe('reconnection', () => {
    it('should reset retry count after successful connection', async () => {
      const { result } = renderHook(() => useSSE({ url: '/api/events' }));

      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      await waitFor(
        () => {
          expect(result.current.status).toBe('connected');
        },
        { timeout: 1000 }
      );

      expect(result.current.retryCount).toBe(0);
    });

    it('should not reconnect when disabled', async () => {
      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          reconnect: false,
          enabled: false,
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.status).toBe('closed');

      // Advance time - should not try to reconnect
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.status).toBe('closed');
    });
  });

  describe('data handling', () => {
    it('should start with null data', async () => {
      const { result } = renderHook(() =>
        useSSE<{ value: number }>({ url: '/api/events' })
      );

      expect(result.current.data).toBeNull();
    });

    it('should start with null lastEvent', async () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', events: ['message', 'custom'] })
      );

      expect(result.current.lastEvent).toBeNull();
    });
  });
});
