import { describe, it, expect } from 'vitest';
import { parseSSEChunk, parseSSEEvent } from '../src/utils/parse-sse';

describe('parseSSEChunk', () => {
  it('should parse a simple message event', () => {
    const chunk = 'data: {"name": "test"}\n\n';
    const events = parseSSEChunk<{ name: string }>(chunk);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      event: 'message',
      data: { name: 'test' },
      id: undefined,
      retry: undefined,
    });
  });

  it('should parse event with custom type', () => {
    const chunk = 'event: custom\ndata: {"value": 123}\n\n';
    const events = parseSSEChunk<{ value: number }>(chunk);

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('custom');
    expect(events[0].data).toEqual({ value: 123 });
  });

  it('should parse event with id', () => {
    const chunk = 'id: 42\ndata: {"test": true}\n\n';
    const events = parseSSEChunk<{ test: boolean }>(chunk);

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('42');
  });

  it('should parse event with retry', () => {
    const chunk = 'retry: 5000\ndata: {"reconnect": true}\n\n';
    const events = parseSSEChunk<{ reconnect: boolean }>(chunk);

    expect(events).toHaveLength(1);
    expect(events[0].retry).toBe(5000);
  });

  it('should parse multiple events in one chunk', () => {
    const chunk = 'data: {"id": 1}\n\ndata: {"id": 2}\n\n';
    const events = parseSSEChunk<{ id: number }>(chunk);

    expect(events).toHaveLength(2);
    expect(events[0].data).toEqual({ id: 1 });
    expect(events[1].data).toEqual({ id: 2 });
  });

  it('should handle multi-line data', () => {
    const chunk = 'data: line1\ndata: line2\ndata: line3\n\n';
    const events = parseSSEChunk<string>(chunk, (raw) => raw);

    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('line1\nline2\nline3');
  });

  it('should ignore comments', () => {
    const chunk = ': this is a comment\ndata: {"valid": true}\n\n';
    const events = parseSSEChunk<{ valid: boolean }>(chunk);

    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ valid: true });
  });

  it('should handle empty chunks', () => {
    const events = parseSSEChunk('');
    expect(events).toHaveLength(0);
  });

  it('should handle chunk with only whitespace', () => {
    const events = parseSSEChunk('   \n\n   ');
    expect(events).toHaveLength(0);
  });

  it('should use custom parser', () => {
    const chunk = 'data: hello world\n\n';
    const events = parseSSEChunk<string>(chunk, (raw) => raw.toUpperCase());

    expect(events[0].data).toBe('HELLO WORLD');
  });

  it('should handle parse errors gracefully', () => {
    const chunk = 'data: not valid json\n\n';
    const events = parseSSEChunk<unknown>(chunk);

    // Deve retornar o dado como string quando parse falha
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('not valid json');
  });

  it('should handle space after colon', () => {
    const chunk = 'data: {"spaced": true}\n\n';
    const events = parseSSEChunk<{ spaced: boolean }>(chunk);

    expect(events[0].data).toEqual({ spaced: true });
  });

  it('should handle no space after colon', () => {
    const chunk = 'data:{"nospace": true}\n\n';
    const events = parseSSEChunk<{ nospace: boolean }>(chunk);

    expect(events[0].data).toEqual({ nospace: true });
  });
});

describe('parseSSEEvent', () => {
  it('should parse a single event', () => {
    const chunk = 'data: {"single": true}\n\n';
    const event = parseSSEEvent<{ single: boolean }>(chunk);

    expect(event).not.toBeNull();
    expect(event?.data).toEqual({ single: true });
  });

  it('should return null for empty chunk', () => {
    const event = parseSSEEvent('');
    expect(event).toBeNull();
  });

  it('should return first event when multiple exist', () => {
    const chunk = 'data: {"id": 1}\n\ndata: {"id": 2}\n\n';
    const event = parseSSEEvent<{ id: number }>(chunk);

    expect(event?.data).toEqual({ id: 1 });
  });
});
