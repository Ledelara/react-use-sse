# @ledelara/use-sse

[![npm version](https://img.shields.io/npm/v/@ledelara/use-sse.svg)](https://www.npmjs.com/package/@ledelara/use-sse)
[![npm downloads](https://img.shields.io/npm/dm/@ledelara/use-sse.svg)](https://www.npmjs.com/package/@ledelara/use-sse)
[![license](https://img.shields.io/npm/l/@ledelara/use-sse.svg)](https://github.com/Ledelara/react-use-sse/blob/main/LICENSE)

React hook for consuming Server-Sent Events (SSE) with TypeScript support, auto-reconnection, and multiple adapter strategies.

## Features

- 🎣 **Simple React Hook** - Easy to use `useSSE` hook
- 🔄 **Auto-reconnection** - Configurable exponential backoff with jitter
- 🔌 **Two connection modes**:
  - `native` - Uses EventSource (better DevTools support)
  - `fetch` - Uses fetch + ReadableStream (supports custom headers)
- 📝 **Full TypeScript support** - Generics for type-safe data
- 🎯 **Custom events** - Listen to specific SSE event types
- 🪶 **Zero dependencies** - Only React as peer dependency
- ⚡ **Tree-shakeable** - Import only what you need

## Installation

```bash
npm install @ledelara/use-sse
```

```bash
yarn add @ledelara/use-sse
```

```bash
pnpm add @ledelara/use-sse
```

## Quick Start

```tsx
import { useSSE } from '@ledelara/use-sse';

interface Notification {
  id: string;
  message: string;
}

function NotificationList() {
  const { data, status, error } = useSSE<Notification>({
    url: '/api/notifications',
  });

  if (status === 'connecting') return <div>Connecting...</div>;
  if (status === 'error') return <div>Error: {error?.message}</div>;

  return (
    <div>
      <p>Status: {status}</p>
      {data && <p>Latest: {data.message}</p>}
    </div>
  );
}
```

## API Reference

### useSSE(options)

```typescript
const {
  data,        // Latest data received
  status,      // 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed'
  error,       // Error object if any
  lastEvent,   // Name of last event received
  lastEventId, // ID of last event (if sent by server)
  retryCount,  // Number of reconnection attempts
  connect,     // Manual connect function
  disconnect,  // Manual disconnect function
} = useSSE<T>(options);
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | Required | SSE endpoint URL |
| `method` | `'native' \| 'fetch'` | `'native'` | Connection method |
| `enabled` | `boolean` | `true` | Auto-connect on mount |
| `events` | `string[]` | `['message']` | Event types to listen |
| `headers` | `Record<string, string>` | - | Custom headers (forces `fetch` method) |
| `withCredentials` | `boolean` | `false` | Send cookies (CORS) |
| `reconnect` | `boolean \| ReconnectConfig` | `true` | Auto-reconnection settings |
| `parser` | `(raw: string) => T` | `JSON.parse` | Custom data parser |
| `onMessage` | `(event, data) => void` | - | Message callback |
| `onError` | `(error) => void` | - | Error callback |
| `onOpen` | `() => void` | - | Connection opened callback |
| `onClose` | `() => void` | - | Connection closed callback |
| `onReconnect` | `(attempt) => boolean \| void` | - | Reconnection callback |

### Reconnect Config

```typescript
interface ReconnectConfig {
  enabled: boolean;        // Enable auto-reconnect (default: true)
  maxRetries?: number;     // Max attempts (default: Infinity)
  delay?: number;          // Initial delay in ms (default: 3000)
  backoffMultiplier?: number; // Exponential multiplier (default: 1.5)
  maxDelay?: number;       // Max delay in ms (default: 30000)
}
```

## Usage Examples

### With Authentication

When you need custom headers, the hook automatically uses the `fetch` adapter:

```tsx
const { data } = useSSE<Order>({
  url: '/api/orders/stream',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Custom Events

Listen to specific SSE event types:

```tsx
const { data, lastEvent } = useSSE<ClassroomEvent>({
  url: '/api/classroom/events',
  events: ['waiting', 'link-available'],
  onMessage: (event, data) => {
    if (event === 'link-available') {
      window.open(data.meetingUrl, '_blank');
    }
  },
});
```

### Manual Connection Control

```tsx
const { connect, disconnect, status } = useSSE<Message>({
  url: '/api/chat',
  enabled: false, // Don't connect automatically
});

return (
  <div>
    <p>Status: {status}</p>
    <button onClick={connect} disabled={status === 'connected'}>
      Connect
    </button>
    <button onClick={disconnect} disabled={status !== 'connected'}>
      Disconnect
    </button>
  </div>
);
```

### With Reconnection Config

```tsx
const { data, status, retryCount } = useSSE<StockPrice>({
  url: '/api/stocks/stream',
  reconnect: {
    enabled: true,
    maxRetries: 10,
    delay: 1000,
    backoffMultiplier: 2,
    maxDelay: 30000,
  },
  onReconnect: (attempt) => {
    console.log(`Reconnection attempt ${attempt}`);
    // Return false to cancel reconnection
    return attempt < 5;
  },
});

return (
  <div>
    {status === 'reconnecting' && (
      <p>Reconnecting... (attempt {retryCount})</p>
    )}
  </div>
);
```

### With Custom Parser

```tsx
const { data } = useSSE<string>({
  url: '/api/logs',
  parser: (raw) => raw.toUpperCase(), // Custom transformation
});
```

## Connection Methods

### Native (EventSource)

- ✅ Shows events in DevTools "EventStream" tab
- ✅ Automatic reconnection by browser
- ❌ No custom headers support
- ❌ GET method only

```tsx
const { data } = useSSE({
  url: '/api/events',
  method: 'native', // default
});
```

### Fetch (ReadableStream)

- ✅ Custom headers support (Authorization, etc.)
- ✅ Full control over request
- ❌ No DevTools EventStream visibility
- ❌ Manual reconnection

```tsx
const { data } = useSSE({
  url: '/api/events',
  method: 'fetch',
  headers: { Authorization: 'Bearer xxx' },
});
```

> **Note:** When `headers` option is provided, `method` is automatically set to `'fetch'`.

## Advanced Usage

### Using Adapters Directly

For advanced use cases, you can use the adapters directly:

```typescript
import { createNativeAdapter, createFetchAdapter } from '@ledelara/use-sse';

const adapter = createFetchAdapter({
  url: '/api/events',
  events: ['message'],
  headers: { Authorization: 'Bearer xxx' },
  parser: JSON.parse,
  callbacks: {
    onOpen: () => console.log('Connected'),
    onMessage: (event, data) => console.log(event, data),
    onError: (error) => console.error(error),
    onClose: () => console.log('Closed'),
  },
});

adapter.connect();
// ...
adapter.disconnect();
```

### SSE Parser Utilities

```typescript
import { parseSSEChunk, parseSSEEvent } from '@ledelara/use-sse';

const chunk = 'event: update\ndata: {"value": 42}\n\n';
const events = parseSSEChunk(chunk);
// [{ event: 'update', data: { value: 42 } }]
```

## Browser Support

- Chrome 52+
- Firefox 52+
- Safari 10+
- Edge 79+

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [Leandro de Lara](https://github.com/Ledelara)

---

Developed with ❤️ at [Cogna](https://www.cogna.com.br)
