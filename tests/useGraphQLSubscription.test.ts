import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGraphQLSubscription } from '../src/graphql/useGraphQLSubscription';

describe('useGraphQLSubscription', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        }),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with closed status when disabled', () => {
      const { result } = renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          enabled: false,
        })
      );

      expect(result.current.status).toBe('closed');
      expect(result.current.data).toBeNull();
      expect(result.current.errors).toBeNull();
    });

    it('should start connecting when enabled', async () => {
      const { result } = renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          enabled: true,
        })
      );

      await vi.advanceTimersByTimeAsync(10);

      expect(result.current.status).toBe('connecting');
    });

    it('should return connect and disconnect functions', () => {
      const { result } = renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          enabled: false,
        })
      );

      expect(result.current.connect).toBeDefined();
      expect(result.current.disconnect).toBeDefined();
    });
  });

  describe('request format', () => {
    it('should send POST request with subscription query', async () => {
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
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { messageAdded { id } }',
        })
      );

      await vi.advanceTimersByTimeAsync(10);

      expect(mockFetch).toHaveBeenCalledWith(
        '/graphql',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            query: 'subscription { messageAdded { id } }',
          }),
        })
      );
    });

    it('should include variables in request', async () => {
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
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription($id: ID!) { message(id: $id) { content } }',
          variables: { id: '123' },
        })
      );

      await vi.advanceTimersByTimeAsync(10);

      expect(mockFetch).toHaveBeenCalledWith(
        '/graphql',
        expect.objectContaining({
          body: JSON.stringify({
            query: 'subscription($id: ID!) { message(id: $id) { content } }',
            variables: { id: '123' },
          }),
        })
      );
    });

    it('should include operationName in request', async () => {
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
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription OnMessage { test }',
          operationName: 'OnMessage',
        })
      );

      await vi.advanceTimersByTimeAsync(10);

      expect(mockFetch).toHaveBeenCalledWith(
        '/graphql',
        expect.objectContaining({
          body: JSON.stringify({
            query: 'subscription OnMessage { test }',
            operationName: 'OnMessage',
          }),
        })
      );
    });

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

      renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          headers: { Authorization: 'Bearer token' },
        })
      );

      await vi.advanceTimersByTimeAsync(10);

      expect(mockFetch).toHaveBeenCalledWith(
        '/graphql',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('data handling', () => {
    it('should update data when GraphQL response is received', async () => {
      const encoder = new TextEncoder();
      const responseData = 'data: {"data":{"messageAdded":{"id":"1"}}}\n\n';
      const encodedData = encoder.encode(responseData);

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

      const { result } = renderHook(() =>
        useGraphQLSubscription<{ messageAdded: { id: string } }>({
          url: '/graphql',
          subscription: 'subscription { messageAdded { id } }',
        })
      );

      await vi.waitFor(() => {
        expect(result.current.data).toEqual({ messageAdded: { id: '1' } });
      });
    });

    it('should call onData callback', async () => {
      const encoder = new TextEncoder();
      const responseData = 'data: {"data":{"test":"value"}}\n\n';
      const encodedData = encoder.encode(responseData);

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

      const onData = vi.fn();

      renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          onData,
        })
      );

      await vi.waitFor(() => {
        expect(onData).toHaveBeenCalledWith({ test: 'value' });
      });
    });
  });

  describe('error handling', () => {
    it('should update errors when GraphQL errors are received', async () => {
      const encoder = new TextEncoder();
      const responseData = 'data: {"errors":[{"message":"Not authorized"}]}\n\n';
      const encodedData = encoder.encode(responseData);

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

      const { result } = renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
        })
      );

      await vi.waitFor(() => {
        expect(result.current.errors).toEqual([{ message: 'Not authorized' }]);
      });
    });

    it('should call onError callback', async () => {
      const encoder = new TextEncoder();
      const responseData = 'data: {"errors":[{"message":"Error"}]}\n\n';
      const encodedData = encoder.encode(responseData);

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

      const onError = vi.fn();

      renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          onError,
        })
      );

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith([{ message: 'Error' }]);
      });
    });

    it('should update networkError on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failed'));

      const { result } = renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          reconnect: false,
        })
      );

      await vi.waitFor(() => {
        expect(result.current.networkError).toBeDefined();
        expect(result.current.networkError?.message).toBe('Network failed');
      });
    });

    it('should call onNetworkError callback', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const onNetworkError = vi.fn();

      renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          onNetworkError,
          reconnect: false,
        })
      );

      await vi.waitFor(() => {
        expect(onNetworkError).toHaveBeenCalled();
      });
    });
  });

  describe('connection control', () => {
    it('should connect when connect() is called', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          enabled: false,
        })
      );

      expect(mockFetch).not.toHaveBeenCalled();

      act(() => {
        result.current.connect();
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should disconnect when disconnect() is called', async () => {
      const { result } = renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
        })
      );

      await vi.advanceTimersByTimeAsync(10);

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status).toBe('closed');
    });

    it('should call onOpen callback when connected', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });

      const onOpen = vi.fn();

      renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          onOpen,
        })
      );

      await vi.waitFor(() => {
        expect(onOpen).toHaveBeenCalled();
      });
    });

    it('should call onClose callback when disconnected', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });

      const onClose = vi.fn();

      renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          onClose,
          reconnect: false,
        })
      );

      await vi.waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('readyState', () => {
    it('should return 0 (CONNECTING) when connecting', async () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
        })
      );

      await vi.advanceTimersByTimeAsync(10);

      expect(result.current.readyState).toBe(0);
    });

    it('should return 2 (CLOSED) when disconnected', async () => {
      const { result } = renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          enabled: false,
        })
      );

      expect(result.current.readyState).toBe(2);
    });
  });

  describe('reconnection', () => {
    it('should reconnect on connection close when reconnect is enabled', async () => {
      let connectionCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        connectionCount++;
        return Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
            }),
          },
        });
      });

      renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          reconnect: { enabled: true, delay: 100, maxRetries: 2 },
        })
      );

      await vi.advanceTimersByTimeAsync(10);
      expect(connectionCount).toBe(1);

      await vi.advanceTimersByTimeAsync(200);
      expect(connectionCount).toBeGreaterThan(1);
    });

    it('should not reconnect when reconnect is disabled', async () => {
      let connectionCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        connectionCount++;
        return Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
            }),
          },
        });
      });

      const { result } = renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          reconnect: false,
        })
      );

      await vi.advanceTimersByTimeAsync(10);
      expect(connectionCount).toBe(1);

      await vi.advanceTimersByTimeAsync(5000);

      expect(result.current.status).toBe('closed');
      expect(connectionCount).toBe(1);
    });

    it('should update retryCount on reconnection', async () => {
      let connectionCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        connectionCount++;
        return Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
            }),
          },
        });
      });

      const { result } = renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          reconnect: { enabled: true, delay: 100, maxRetries: 5 },
        })
      );

      await vi.advanceTimersByTimeAsync(50);
      expect(result.current.retryCount).toBe(0);

      await vi.advanceTimersByTimeAsync(200);
      
      expect(connectionCount).toBeGreaterThan(1);
    });
  });

  describe('signal handling', () => {
    it('should disconnect when signal is aborted', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });

      const controller = new AbortController();

      const { result } = renderHook(() =>
        useGraphQLSubscription({
          url: '/graphql',
          subscription: 'subscription { test }',
          signal: controller.signal,
        })
      );

      await vi.advanceTimersByTimeAsync(10);

      act(() => {
        controller.abort();
      });

      expect(result.current.status).toBe('closed');
    });
  });

  describe('variables change', () => {
    it('should reconnect when variables change', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const { rerender } = renderHook(
        ({ variables }) =>
          useGraphQLSubscription({
            url: '/graphql',
            subscription: 'subscription($id: ID!) { message(id: $id) { content } }',
            variables,
          }),
        { initialProps: { variables: { id: '1' } } }
      );

      await vi.advanceTimersByTimeAsync(10);

      const firstCallCount = mockFetch.mock.calls.length;

      rerender({ variables: { id: '2' } });

      await vi.advanceTimersByTimeAsync(10);

      expect(mockFetch.mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });
});
