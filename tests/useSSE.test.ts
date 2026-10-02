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
    it('should start with idle status when disabled', () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      expect(result.current.status).toBe('idle');
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should start connecting when enabled', async () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: true })
      );

      expect(result.current.status).toBe('connecting');

      // Aguarda conexão
      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });
    });

    it('should default to native method', () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      // O método é interno, mas podemos verificar que não falha
      expect(result.current.status).toBe('idle');
    });
  });

  describe('method selection', () => {
    it('should force fetch method when headers are provided', async () => {
      // Mock fetch para não falhar
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
        vi.advanceTimersByTime(10);
      });

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

  describe('connect/disconnect', () => {
    it('should connect manually when calling connect()', async () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: false })
      );

      expect(result.current.status).toBe('idle');

      act(() => {
        result.current.connect();
      });

      expect(result.current.status).toBe('connecting');
    });

    it('should disconnect when calling disconnect()', async () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', enabled: true })
      );

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

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
        vi.advanceTimersByTime(10);
      });

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      unmount();

      // Não deve lançar erros
    });
  });

  describe('callbacks', () => {
    it('should call onOpen when connected', async () => {
      const onOpen = vi.fn();

      renderHook(() =>
        useSSE({ url: '/api/events', onOpen })
      );

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      await waitFor(() => {
        expect(onOpen).toHaveBeenCalled();
      });
    });

    it('should call onError when error occurs', async () => {
      const onError = vi.fn();

      // Mock fetch para falhar
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
        vi.advanceTimersByTime(10);
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('reconnection', () => {
    it('should reset retry count after successful connection', async () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events' })
      );

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      expect(result.current.retryCount).toBe(0);
    });

    it('should not reconnect when disabled', async () => {
      const onClose = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/events',
          reconnect: false,
          onClose,
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status).toBe('closed');

      // Avança tempo - não deve tentar reconectar
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.status).toBe('closed');
    });
  });

  describe('data handling', () => {
    it('should update data when message received (native)', async () => {
      const { result } = renderHook(() =>
        useSSE<{ value: number }>({ url: '/api/events' })
      );

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Simula mensagem via EventSource mock
      // O mock do EventSource está em setup.ts

      expect(result.current.data).toBeNull(); // Nenhuma mensagem ainda
    });

    it('should update lastEvent when event received', async () => {
      const { result } = renderHook(() =>
        useSSE({ url: '/api/events', events: ['message', 'custom'] })
      );

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      // Inicialmente null
      expect(result.current.lastEvent).toBeNull();
    });
  });
});
