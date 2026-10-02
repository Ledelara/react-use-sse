import type { SSEEvent } from '../types';

/**
 * Parser para eventos SSE no formato padrão
 *
 * Formato SSE:
 * ```
 * event: custom-event
 * id: 123
 * retry: 5000
 * data: {"key": "value"}
 *
 * ```
 *
 * @param chunk - Chunk de texto recebido do stream
 * @param parser - Função para parsear o campo data
 * @returns Array de eventos parseados
 */
export function parseSSEChunk<T>(
  chunk: string,
  parser: (raw: string) => T = JSON.parse
): SSEEvent<T>[] {
  const events: SSEEvent<T>[] = [];

  // SSE eventos são separados por linhas vazias
  const rawEvents = chunk.split(/\n\n+/);

  for (const rawEvent of rawEvents) {
    if (!rawEvent.trim()) continue;

    const lines = rawEvent.split('\n');

    let event = 'message';
    let data = '';
    let id: string | undefined;
    let retry: number | undefined;

    for (const line of lines) {
      // Comentários começam com ':'
      if (line.startsWith(':')) continue;

      const colonIndex = line.indexOf(':');

      if (colonIndex === -1) {
        // Linha sem ':', trata como campo sem valor
        continue;
      }

      const field = line.slice(0, colonIndex);
      // Remove espaço após ':' se existir
      let value = line.slice(colonIndex + 1);
      if (value.startsWith(' ')) {
        value = value.slice(1);
      }

      switch (field) {
        case 'event':
          event = value;
          break;
        case 'data':
          // Múltiplas linhas de data são concatenadas com newline
          data = data ? `${data}\n${value}` : value;
          break;
        case 'id':
          id = value;
          break;
        case 'retry': {
          const retryValue = parseInt(value, 10);
          if (!isNaN(retryValue)) {
            retry = retryValue;
          }
          break;
        }
      }
    }

    // Só adiciona se tiver dados
    if (data) {
      try {
        const parsedData = parser(data);
        events.push({ event, data: parsedData, id, retry });
      } catch {
        // Se o parser falhar, tenta enviar como string
        events.push({ event, data: data as T, id, retry });
      }
    }
  }

  return events;
}

/**
 * Parser simples para um único evento SSE
 * Útil quando você sabe que o chunk contém apenas um evento
 *
 * @param chunk - Texto do evento
 * @param parser - Função para parsear o campo data
 * @returns Evento parseado ou null se inválido
 */
export function parseSSEEvent<T>(
  chunk: string,
  parser: (raw: string) => T = JSON.parse
): SSEEvent<T> | null {
  const events = parseSSEChunk<T>(chunk, parser);
  return events[0] || null;
}
