# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
