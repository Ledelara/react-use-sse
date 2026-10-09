/**
 * Status da conexão SSE
 */
export type SSEStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'closed';

/**
 * Método de conexão SSE
 * - native: Usa EventSource nativo (melhor suporte no DevTools, sem headers customizados)
 * - fetch: Usa fetch + ReadableStream (suporta headers customizados)
 */
export type SSEMethod = 'native' | 'fetch';

/**
 * Configurações de reconexão automática
 */
export interface SSEReconnectConfig {
  /** Habilita reconexão automática (default: true) */
  enabled: boolean;
  /** Número máximo de tentativas (default: Infinity) */
  maxRetries?: number;
  /** Delay entre tentativas em ms (default: 3000) */
  delay?: number;
  /** Multiplicador exponencial do delay (default: 1.5) */
  backoffMultiplier?: number;
  /** Delay máximo em ms (default: 30000) */
  maxDelay?: number;
}

/**
 * Opções do hook useSSE
 */
export interface UseSSEOptions<T> {
  /** URL do endpoint SSE */
  url: string;

  /**
   * Método de conexão
   * - 'native': EventSource (não suporta headers, mas aparece no DevTools)
   * - 'fetch': fetch + ReadableStream (suporta headers)
   * Se headers for definido, força 'fetch' automaticamente
   * @default 'native'
   */
  method?: SSEMethod;

  /**
   * Habilita a conexão automaticamente
   * @default true
   */
  enabled?: boolean;

  /**
   * Eventos customizados para escutar (além de 'message')
   * @example ['waiting', 'link-available', 'error']
   * @default ['message']
   */
  events?: string[];

  /**
   * Headers customizados (força method: 'fetch')
   * @example { Authorization: 'Bearer xxx' }
   */
  headers?: Record<string, string>;

  /**
   * Envia cookies com a requisição (CORS)
   * @default false
   */
  withCredentials?: boolean;

  /**
   * Configurações de reconexão automática
   * @default { enabled: true, maxRetries: Infinity, delay: 3000 }
   */
  reconnect?: SSEReconnectConfig | boolean;

  /**
   * Parser customizado para os dados recebidos
   * @default JSON.parse
   */
  parser?: (raw: string) => T;

  /**
   * Callback chamado quando uma mensagem é recebida
   */
  onMessage?: (event: string, data: T) => void;

  /**
   * Callback chamado quando ocorre um erro
   */
  onError?: (error: Error) => void;

  /**
   * Callback chamado quando a conexão é aberta
   */
  onOpen?: () => void;

  /**
   * Callback chamado quando a conexão é fechada
   */
  onClose?: () => void;

  /**
   * Callback chamado antes de tentar reconectar
   * Retorne false para cancelar a reconexão
   */
  onReconnect?: (attempt: number) => boolean | void;
}

/**
 * Retorno do hook useSSE
 */
export interface UseSSEReturn<T> {
  data: T | null;
  status: SSEStatus;
  error: Error | null;
  lastEvent: string | null;
  lastEventId: string | null;
  retryCount: number;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Evento SSE parseado
 */
export interface SSEEvent<T = unknown> {
  /** Tipo do evento (default: 'message') */
  event: string;

  /** Dados do evento */
  data: T;

  /** ID do evento (opcional) */
  id?: string;

  /** Tempo de retry sugerido pelo servidor em ms (opcional) */
  retry?: number;
}

/**
 * Interface comum para os adapters de conexão
 */
export interface SSEAdapter {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
}

/**
 * Callbacks para os adapters
 */
export interface SSEAdapterCallbacks<T> {
  onOpen: () => void;
  onMessage: (event: string, data: T, id?: string) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

/**
 * Opções para criar um adapter
 */
export interface SSEAdapterOptions<T> {
  url: string;
  events: string[];
  headers?: Record<string, string>;
  withCredentials?: boolean;
  parser: (raw: string) => T;
  callbacks: SSEAdapterCallbacks<T>;
  lastEventId?: string;
}
