## Summary

This PR introduces multiple improvements and new features for version 0.2.0, enhancing the library's capabilities for real-world SSE use cases including AI streaming APIs, connection management, and better developer experience.

## New Features

### 1. AbortSignal Support
External cancellation control via `AbortController`:

```tsx
const controller = new AbortController();
const { data } = useSSE({
  url: '/api/stream',
  signal: controller.signal,
});
// Cancel: controller.abort();
```

### 2. POST Method with Body Support
Perfect for streaming APIs (Claude, OpenAI, etc.):

```tsx
const { data } = useSSE({
  url: '/api/chat/stream',
  httpMethod: 'POST',
  body: { prompt: 'Hello', stream: true },
  headers: { Authorization: `Bearer ${token}` },
});
```

### 3. Connection and Idle Timeouts
Detect connection issues and zombie connections:

```tsx
const { data } = useSSE({
  url: '/api/events',
  connectionTimeout: 5000,  // Fail if not connected in 5s
  idleTimeout: 30000,       // Reconnect if no message in 30s
});
```

### 4. EventSource-Compatible readyState
New `readyState` field in the return value:
- `0` = CONNECTING
- `1` = OPEN  
- `2` = CLOSED

### 5. Status Constants
Type-safe constants for comparisons:

```tsx
import { SSE_STATUS, SSE_READY_STATE } from '@ledelara/use-sse';

if (status === SSE_STATUS.CONNECTED) { /* ... */ }
if (readyState === SSE_READY_STATE.OPEN) { /* ... */ }
```

### 6. HTTP Error Handling (Native Adapter)
New `SSEHttpError` class with detailed error information:

```tsx
import { SSEHttpError } from '@ledelara/use-sse';

if (error instanceof SSEHttpError) {
  console.log(`HTTP ${error.status}: ${error.statusText}`);
}
```

### 7. lastEventId Reconnection Support
Automatic resume from last event on reconnection:
- Fetch adapter: Sends `Last-Event-ID` header
- Native adapter: Sends `?lastEventId=` query parameter

## Files Changed

| File | Description |
|------|-------------|
| `src/types.ts` | New interfaces, options, and constants |
| `src/useSSE.ts` | Implementation of all new features |
| `src/adapters/fetch-adapter.ts` | POST/body support, improved headers |
| `src/adapters/native-adapter.ts` | HTTP error handling with preflight |
| `src/index.ts` | Export new constants and SSEHttpError |
| `README.md` | Comprehensive documentation update |
| `CHANGELOG.md` | Version history |

## API Changes

### New Options

| Option | Type | Description |
|--------|------|-------------|
| `signal` | `AbortSignal` | External abort signal |
| `httpMethod` | `'GET' \| 'POST'` | HTTP method (fetch only) |
| `body` | `string \| object` | Request body (POST only) |
| `connectionTimeout` | `number` | Connection timeout in ms |
| `idleTimeout` | `number` | Idle timeout in ms |

### New Return Fields

| Field | Type | Description |
|-------|------|-------------|
| `readyState` | `0 \| 1 \| 2` | EventSource-compatible state |

### New Exports

- `SSE_STATUS` - Status string constants
- `SSE_READY_STATE` - Ready state number constants
- `SSEHttpError` - HTTP error class with status/statusText

## Breaking Changes

None. All changes are backward-compatible.

## Testing

- Build passes
- TypeScript type checking passes
- ESLint passes
- All existing tests pass
- New tests added for HTTP error handling

## Migration Guide

No migration needed. Existing code will continue to work without changes.

To use new features, simply add the new options:

```tsx
// Before (still works)
const { data } = useSSE({ url: '/api/events' });

// After (with new features)
const { data, readyState } = useSSE({
  url: '/api/events',
  connectionTimeout: 5000,
  idleTimeout: 30000,
});
```
