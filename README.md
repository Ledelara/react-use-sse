# @ledelara/use-sse

[![npm version](https://img.shields.io/npm/v/@ledelara/use-sse.svg)](https://www.npmjs.com/package/@ledelara/use-sse)
[![npm downloads](https://img.shields.io/npm/dm/@ledelara/use-sse.svg)](https://www.npmjs.com/package/@ledelara/use-sse)
[![license](https://img.shields.io/npm/l/@ledelara/use-sse.svg)](https://github.com/Ledelara/react-use-sse/blob/main/LICENSE)

React hook for consuming Server-Sent Events (SSE) with TypeScript support, auto-reconnection, and multiple adapter strategies.

## Features

- 🎣 **Simple React Hook** - Easy to use `useSSE` hook
- 🔄 **Auto-reconnection** - Configurable exponential backoff with jitter
- 🔌 **Multiple connection strategies**:
  - `native` - Uses EventSource (better DevTools support)
  - `fetch` - Uses fetch + ReadableStream (supports custom headers & POST)
  - `EventSourcePolyfill` - Drop-in EventSource replacement with headers support
- 📝 **Full TypeScript support** - Generics for type-safe data
- 🎯 **Custom events** - Listen to specific SSE event types
- 🪶 **Zero dependencies** - Only React as peer dependency
- ⚡ **Tree-shakeable** - Import only what you need
- 🔁 **Resume support** - Sends `lastEventId` on reconnection
- ⏱️ **Timeout handling** - Connection and idle timeouts
- 🛑 **AbortController support** - External cancellation control

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
  readyState,  // 0 (CONNECTING) | 1 (OPEN) | 2 (CLOSED) - EventSource compatible
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
| `signal` | `AbortSignal` | - | External abort signal for cancellation |
| `httpMethod` | `'GET' \| 'POST'` | `'GET'` | HTTP method (fetch adapter only) |
| `body` | `string \| object` | - | Request body (fetch adapter with POST) |
| `connectionTimeout` | `number` | - | Timeout in ms for initial connection |
| `idleTimeout` | `number` | - | Timeout in ms without messages |
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

### Constants

```typescript
import { SSE_STATUS, SSE_READY_STATE } from '@ledelara/use-sse';

// Status constants
if (status === SSE_STATUS.CONNECTED) { /* ... */ }

// ReadyState constants (EventSource compatible)
if (readyState === SSE_READY_STATE.OPEN) { /* ... */ }
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

### POST Request with Body (AI Streaming APIs)

Perfect for streaming APIs like Claude, OpenAI, or similar:

```tsx
const { data, status } = useSSE<StreamChunk>({
  url: '/api/chat/stream',
  httpMethod: 'POST',
  body: {
    prompt: 'Hello, how are you?',
    stream: true,
  },
  headers: {
    Authorization: `Bearer ${apiKey}`,
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

### With AbortController

Control the connection externally:

```tsx
function StreamingComponent() {
  const controllerRef = useRef(new AbortController());
  
  const { data, status } = useSSE<Message>({
    url: '/api/stream',
    signal: controllerRef.current.signal,
  });

  const handleCancel = () => {
    controllerRef.current.abort();
    controllerRef.current = new AbortController();
  };

  return (
    <div>
      <p>{data?.message}</p>
      <button onClick={handleCancel}>Cancel</button>
    </div>
  );
}
```

### With Timeouts

Detect connection issues and zombie connections:

```tsx
const { data, status, error } = useSSE<HeartbeatData>({
  url: '/api/heartbeat',
  connectionTimeout: 5000,  // Fail if not connected in 5s
  idleTimeout: 30000,       // Reconnect if no message in 30s
  onError: (err) => {
    if (err.name === 'ConnectionTimeoutError') {
      console.log('Server took too long to respond');
    }
    if (err.name === 'IdleTimeoutError') {
      console.log('Connection went idle');
    }
  },
});
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

### Error Handling with SSEHttpError

Handle HTTP errors with detailed information:

```tsx
import { useSSE, SSEHttpError } from '@ledelara/use-sse';

const { data, error } = useSSE<Data>({
  url: '/api/events',
  onError: (err) => {
    if (err instanceof SSEHttpError) {
      console.log(`HTTP ${err.status}: ${err.statusText}`);
      if (err.status === 401) {
        // Redirect to login
      }
    }
  },
});
```

## Connection Methods

### Native (EventSource)

- ✅ Shows events in DevTools "EventStream" tab
- ✅ Automatic reconnection by browser
- ✅ Sends `lastEventId` via query parameter on reconnection
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
- ✅ POST method with body support
- ✅ Sends `Last-Event-ID` header on reconnection
- ❌ No DevTools EventStream visibility
- ❌ Manual reconnection

```tsx
const { data } = useSSE({
  url: '/api/events',
  method: 'fetch',
  headers: { Authorization: 'Bearer xxx' },
});
```

> **Note:** When `headers`, `httpMethod: 'POST'`, or `body` options are provided, `method` is automatically set to `'fetch'`.

### EventSourcePolyfill (Drop-in Replacement)

A drop-in replacement for the native `EventSource` that supports custom headers. Use it when you need the familiar EventSource API but with authentication headers.

- ✅ Same API as native EventSource
- ✅ Custom headers support (Authorization, etc.)
- ✅ POST method with body support
- ✅ Sends `Last-Event-ID` header automatically
- ❌ No DevTools EventStream visibility
- ❌ No automatic reconnection (must implement manually)

```tsx
import { EventSourcePolyfill } from '@ledelara/use-sse';

// Basic usage with headers
const source = new EventSourcePolyfill('/api/events', {
  headers: {
    Authorization: 'Bearer my-token',
  },
});

source.onopen = () => console.log('Connected');
source.onmessage = (event) => console.log('Message:', event.data);
source.onerror = () => console.log('Error');

// Custom events
source.addEventListener('notification', (event) => {
  console.log('Notification:', event.data);
});

// Close when done
source.close();
```

#### POST Request with Body

```tsx
const source = new EventSourcePolyfill('/api/chat/stream', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer my-token',
    'X-Custom-Header': 'value',
  },
  body: {
    prompt: 'Hello, how are you?',
    stream: true,
  },
});

source.onmessage = (event) => {
  const chunk = JSON.parse(event.data);
  console.log(chunk.text);
};
```

#### EventSourcePolyfill Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headers` | `Record<string, string>` | `{}` | Custom headers to send |
| `withCredentials` | `boolean` | `false` | Send cookies (CORS) |
| `method` | `'GET' \| 'POST'` | `'GET'` | HTTP method |
| `body` | `string \| object` | - | Request body (for POST) |

#### Properties and Methods

| Property/Method | Description |
|-----------------|-------------|
| `url` | The URL of the SSE endpoint |
| `readyState` | 0 (CONNECTING), 1 (OPEN), 2 (CLOSED) |
| `withCredentials` | Whether credentials are sent |
| `lastEventId` | ID of the last received event |
| `onopen` | Callback when connection opens |
| `onmessage` | Callback for message events |
| `onerror` | Callback when error occurs |
| `addEventListener(type, listener)` | Listen to custom events |
| `removeEventListener(type, listener)` | Remove event listener |
| `close()` | Close the connection |

## Server-Side: Resuming with lastEventId

When reconnecting, the hook sends the last received event ID so the server can resume from where it left off:

- **Fetch adapter**: Sends `Last-Event-ID` header
- **Native adapter**: Sends `?lastEventId=` query parameter

### Server Example (Node.js/Express)

```javascript
app.get('/api/events', (req, res) => {
  // Get lastEventId from header (fetch) or query param (native)
  const lastEventId = req.headers['last-event-id'] || req.query.lastEventId;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  if (lastEventId) {
    // Client is reconnecting - send missed events
    const missedEvents = getEventsSince(lastEventId);
    missedEvents.forEach(event => {
      res.write(`id: ${event.id}\n`);
      res.write(`data: ${JSON.stringify(event.data)}\n\n`);
    });
  }
  
  // Continue sending new events...
});
```

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

### Using EventSourcePolyfill for Manual Control

When you need full control over the connection lifecycle with custom headers:

```typescript
import { EventSourcePolyfill } from '@ledelara/use-sse';

class SSEClient {
  private source: EventSourcePolyfill | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    this.source = new EventSourcePolyfill('/api/events', {
      headers: { Authorization: `Bearer ${token}` },
    });

    this.source.onopen = () => {
      this.reconnectAttempts = 0;
      console.log('Connected');
    };

    this.source.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data));
    };

    this.source.onerror = () => {
      this.handleError();
    };
  }

  private handleMessage(data: unknown) {
    // Process message
  }

  private handleError() {
    this.source?.close();
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(this.getToken()), delay);
    }
  }

  private getToken(): string {
    // Get current token
    return 'token';
  }

  disconnect() {
    this.source?.close();
    this.source = null;
  }
}
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

## TypeScript Support

Full TypeScript support with generics:

```typescript
interface MyEvent {
  id: string;
  type: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
}

const { data } = useSSE<MyEvent>({
  url: '/api/events',
});

// data is typed as MyEvent | null
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © Leandro de Lara
