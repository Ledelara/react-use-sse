## Summary

This PR adds support for sending the `lastEventId` during SSE reconnections, allowing servers to resume the event stream from where it left off. This follows the SSE protocol specification.

## Changes

### New Features

#### 1. `lastEventId` Support on Reconnection
- **Fetch adapter**: Sends `Last-Event-ID` header (standard SSE protocol)
- **Native adapter**: Appends `lastEventId` as query parameter (EventSource doesn't support custom headers)
- On automatic reconnection, the last received event ID is sent to the server
- On manual `connect()`, the `lastEventId` is reset (starts fresh)

#### 2. Improved Callback Stability (Memory Leak Prevention)
- Refactored callbacks to use refs instead of direct closures
- `createCallbacks` now has empty dependency array (created only once)
- Callbacks are kept in sync via `useEffect`
- Prevents adapter recreation on callback changes

#### 3. ESLint Compliance
- Replaced `while (true)` with `while (!done)` in fetch adapter
- Removed unused `createAdapter` function

### Files Changed

| File | Changes |
|------|---------|
| `src/types.ts` | Added `lastEventId?: string` to `SSEAdapterOptions` |
| `src/adapters/fetch-adapter.ts` | Send `Last-Event-ID` header, fix ESLint warning |
| `src/adapters/native-adapter.ts` | Append `lastEventId` as query parameter |
| `src/useSSE.ts` | Refactored to use refs for callbacks, pass `lastEventId` on reconnect |
| `tests/fetch-adapter.test.ts` | Added tests for `Last-Event-ID` header |
| `tests/native-adapter.test.ts` | Added tests for `lastEventId` query parameter |

## Behavior

| Scenario | `lastEventId` sent? |
|----------|----------------------|
| First connection | ❌ No |
| Automatic reconnection (network drop) | ✅ Yes |
| Manual `connect()` call | ❌ No (reset) |
| Fetch adapter | Header `Last-Event-ID` |
| Native adapter | Query param `?lastEventId=...` |

## Server Usage Example

```javascript
// Node.js server example
app.get('/api/events', (req, res) => {
  const lastEventId = req.headers['last-event-id'] || req.query.lastEventId;
  
  if (lastEventId) {
    // Resume from event after lastEventId
    const missedEvents = getEventsSince(lastEventId);
    missedEvents.forEach(event => sendSSE(res, event));
  }
  
  // Continue sending new events...
});
```

## Testing

- Added unit tests for `lastEventId` in both adapters
- Tests verify header/query param is sent when provided
- Tests verify header/query param is NOT sent when not provided
- Tests verify correct URL construction with existing query params

## Breaking Changes

None. This is a backward-compatible enhancement.
