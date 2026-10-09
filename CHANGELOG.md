# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2024-XX-XX

### Added

- **GraphQL Subscriptions Support**: New `useGraphQLSubscription` hook for GraphQL subscriptions over SSE
  - Full TypeScript support with generics for typed responses
  - Separate handling for GraphQL errors vs network errors
  - Support for variables and operation names
  - Auto-reconnection with configurable backoff
  - Compatible with graphql-sse protocol (Yoga, Mercurius, etc.)
- **`GraphQLSSEClient`**: Standalone client for GraphQL subscriptions outside React
  - Subscribe/unsubscribe pattern
  - Dynamic header management (`setHeaders`, `setHeader`, `removeHeader`)
  - Callbacks for data, errors, and connection lifecycle

## [0.3.0] - 2024-XX-XX

### Added

- **`EventSourcePolyfill`**: Drop-in replacement for native EventSource with custom headers support
  - Same familiar API as native EventSource (`onopen`, `onmessage`, `onerror`, `addEventListener`)
  - Supports custom headers (Authorization, etc.)
  - Supports POST method with body
  - Sends `Last-Event-ID` header automatically
  - Exposes `readyState` and `lastEventId` properties

## [0.2.0] - 2024-XX-XX

### Added

- **`lastEventId` support on reconnection**: The hook now sends the last received event ID when reconnecting, allowing servers to resume the stream from where it left off
  - Fetch adapter: Sends `Last-Event-ID` header
  - Native adapter: Sends `lastEventId` query parameter
- **HTTP error handling for native adapter**: New `SSEHttpError` class with `status` and `statusText` properties for detailed error information
- **AbortSignal support**: New `signal` option for external cancellation control via `AbortController`
- **POST method with body support**: New `httpMethod` and `body` options for streaming APIs (Claude, OpenAI, etc.)
- **Connection and idle timeouts**: New `connectionTimeout` and `idleTimeout` options to detect connection issues
- **`readyState` field**: EventSource-compatible ready state (0=CONNECTING, 1=OPEN, 2=CLOSED)
- **Status constants**: `SSE_STATUS` and `SSE_READY_STATE` exports for type-safe comparisons

### Changed

- Refactored internal callbacks to use refs for better stability and memory efficiency
- Replaced `while (true)` with proper loop condition for ESLint compliance

### Fixed

- Potential memory leak in callback handling

## [0.1.6] - 2024-XX-XX

### Added

- `lastEventId` reconnection support
- Improved callback stability using refs

### Fixed

- ESLint `no-constant-condition` warning
- Removed unused internal function

## [0.1.5] - 2024-XX-XX

### Changed

- Version bump

## [0.1.4] - 2024-XX-XX

### Changed

- Removed company references from README

## [0.1.3] - 2024-XX-XX

### Fixed

- Include README.md in npm package

## [0.1.2] - 2024-XX-XX

### Changed

- Package configuration updates

## [0.1.1] - 2024-XX-XX

### Changed

- Minor fixes

## [0.1.0] - 2024-XX-XX

### Added

- Initial release
- `useSSE` hook for consuming Server-Sent Events
- Native adapter using EventSource
- Fetch adapter using fetch + ReadableStream
- Auto-reconnection with exponential backoff
- Custom event type support
- TypeScript generics for type-safe data
- Custom parser support
- Connection callbacks (onOpen, onMessage, onError, onClose)
- Manual connect/disconnect controls
- SSE parsing utilities
