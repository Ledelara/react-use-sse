import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GraphQLSSEClient } from '../src/graphql/GraphQLSSEClient';

describe('GraphQLSSEClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with url', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const client = new GraphQLSSEClient({
        url: '/graphql',
      });

      expect(client).toBeDefined();
    });

    it('should create client with headers', () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const client = new GraphQLSSEClient({
        url: '/graphql',
        headers: { Authorization: 'Bearer token' },
      });

      expect(client).toBeDefined();
    });
  });

  describe('subscribe', () => {
    it('should make POST request with subscription query', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const client = new GraphQLSSEClient({
        url: '/graphql',
      });

      client.subscribe({
        subscription: 'subscription { messageAdded { id } }',
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/graphql',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              query: 'subscription { messageAdded { id } }',
              variables: undefined,
              operationName: undefined,
            }),
          })
        );
      });
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

      const client = new GraphQLSSEClient({
        url: '/graphql',
      });

      client.subscribe({
        subscription: 'subscription($id: ID!) { message(id: $id) { content } }',
        variables: { id: '123' },
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/graphql',
          expect.objectContaining({
            body: JSON.stringify({
              query: 'subscription($id: ID!) { message(id: $id) { content } }',
              variables: { id: '123' },
              operationName: undefined,
            }),
          })
        );
      });
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

      const client = new GraphQLSSEClient({
        url: '/graphql',
      });

      client.subscribe({
        subscription: 'subscription OnMessage { messageAdded { id } }',
        operationName: 'OnMessage',
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/graphql',
          expect.objectContaining({
            body: JSON.stringify({
              query: 'subscription OnMessage { messageAdded { id } }',
              variables: undefined,
              operationName: 'OnMessage',
            }),
          })
        );
      });
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

      const client = new GraphQLSSEClient({
        url: '/graphql',
        headers: { Authorization: 'Bearer my-token' },
      });

      client.subscribe({
        subscription: 'subscription { messageAdded { id } }',
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/graphql',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer my-token',
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    it('should call onOpen callback', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });

      const client = new GraphQLSSEClient({ url: '/graphql' });
      const onOpen = vi.fn();

      client.subscribe(
        { subscription: 'subscription { test }' },
        { onOpen }
      );

      await vi.waitFor(() => {
        expect(onOpen).toHaveBeenCalled();
      });
    });

    it('should call onData callback with parsed data', async () => {
      const encoder = new TextEncoder();
      const responseData = 'data: {"data":{"messageAdded":{"id":"1","content":"Hello"}}}\n\n';
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

      const client = new GraphQLSSEClient({ url: '/graphql' });
      const onData = vi.fn();

      client.subscribe(
        { subscription: 'subscription { messageAdded { id content } }' },
        { onData }
      );

      await vi.waitFor(() => {
        expect(onData).toHaveBeenCalledWith({
          messageAdded: { id: '1', content: 'Hello' },
        });
      });
    });

    it('should call onError callback when GraphQL errors are received', async () => {
      const encoder = new TextEncoder();
      const responseData = 'data: {"errors":[{"message":"Unauthorized"}]}\n\n';
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

      const client = new GraphQLSSEClient({ url: '/graphql' });
      const onError = vi.fn();

      client.subscribe(
        { subscription: 'subscription { test }' },
        { onError }
      );

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith([{ message: 'Unauthorized' }]);
      });
    });

    it('should call onNetworkError when connection fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const client = new GraphQLSSEClient({ url: '/graphql' });
      const onNetworkError = vi.fn();

      client.subscribe(
        { subscription: 'subscription { test }' },
        { onNetworkError }
      );

      await vi.waitFor(() => {
        expect(onNetworkError).toHaveBeenCalled();
      });
    });

    it('should return unsubscribe function', async () => {
      let aborted = false;
      global.fetch = vi.fn().mockImplementation((_url, options) => {
        options?.signal?.addEventListener('abort', () => {
          aborted = true;
        });
        return new Promise(() => {});
      });

      const client = new GraphQLSSEClient({ url: '/graphql' });

      const subscription = client.subscribe({
        subscription: 'subscription { test }',
      });

      expect(subscription.unsubscribe).toBeDefined();

      subscription.unsubscribe();

      expect(aborted).toBe(true);
    });

    it('should call onClose when unsubscribe is called', async () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const client = new GraphQLSSEClient({ url: '/graphql' });
      const onClose = vi.fn();

      const subscription = client.subscribe(
        { subscription: 'subscription { test }' },
        { onClose }
      );

      subscription.unsubscribe();

      expect(onClose).toHaveBeenCalled();
    });

    it('should handle data with errors in same response', async () => {
      const encoder = new TextEncoder();
      const responseData = 'data: {"data":{"user":null},"errors":[{"message":"User not found","path":["user"]}]}\n\n';
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

      const client = new GraphQLSSEClient({ url: '/graphql' });
      const onData = vi.fn();
      const onError = vi.fn();

      client.subscribe(
        { subscription: 'subscription { user { id } }' },
        { onData, onError }
      );

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith([
          { message: 'User not found', path: ['user'] },
        ]);
        expect(onData).toHaveBeenCalledWith({ user: null });
      });
    });
  });

  describe('setHeaders', () => {
    it('should update headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const client = new GraphQLSSEClient({
        url: '/graphql',
        headers: { Authorization: 'Bearer old-token' },
      });

      client.setHeaders({ Authorization: 'Bearer new-token' });

      client.subscribe({
        subscription: 'subscription { test }',
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/graphql',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer new-token',
            }),
          })
        );
      });
    });
  });

  describe('setHeader', () => {
    it('should set a single header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const client = new GraphQLSSEClient({ url: '/graphql' });

      client.setHeader('X-Custom-Header', 'custom-value');

      client.subscribe({
        subscription: 'subscription { test }',
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/graphql',
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-Custom-Header': 'custom-value',
            }),
          })
        );
      });
    });
  });

  describe('removeHeader', () => {
    it('should remove a header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const client = new GraphQLSSEClient({
        url: '/graphql',
        headers: { Authorization: 'Bearer token', 'X-Remove-Me': 'value' },
      });

      client.removeHeader('X-Remove-Me');

      client.subscribe({
        subscription: 'subscription { test }',
      });

      await vi.waitFor(() => {
        const callHeaders = mockFetch.mock.calls[0][1].headers;
        expect(callHeaders['X-Remove-Me']).toBeUndefined();
        expect(callHeaders['Authorization']).toBe('Bearer token');
      });
    });
  });

  describe('withCredentials', () => {
    it('should send credentials when withCredentials is true', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      });
      global.fetch = mockFetch;

      const client = new GraphQLSSEClient({
        url: '/graphql',
        withCredentials: true,
      });

      client.subscribe({
        subscription: 'subscription { test }',
      });

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/graphql',
          expect.objectContaining({
            credentials: 'include',
          })
        );
      });
    });
  });
});
