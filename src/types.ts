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
 * Constantes de status SSE para comparações type-safe
 * @example
 * if (status === SSE_STATUS.CONNECTED) { ... }
 */
export const SSE_STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
  CLOSED: 'closed',
} as const;

/**
 * Constantes de readyState compatíveis com EventSource
 * @example
 * if (readyState === SSE_READY_STATE.OPEN) { ... }
 */
export const SSE_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
} as const;

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
   * AbortSignal para cancelamento externo da conexão
   * Quando o signal é abortado, a conexão é encerrada
   * @example
   * ```tsx
   * const controller = new AbortController();
   * const { data } = useSSE({ url: '/api/events', signal: controller.signal });
   * // Para cancelar: controller.abort();
   * ```
   */
  signal?: AbortSignal;

  /**
   * Método HTTP para a requisição (apenas com method: 'fetch')
   * Útil para APIs que requerem POST (ex: Claude API, OpenAI streaming)
   * @default 'GET'
   */
  httpMethod?: 'GET' | 'POST';

  /**
   * Body da requisição (apenas com method: 'fetch' e httpMethod: 'POST')
   * Objetos são automaticamente convertidos para JSON
   * @example { prompt: 'Hello', stream: true }
   */
  body?: string | object;

  /**
   * Timeout em ms para considerar falha na conexão inicial
   * Se o servidor não responder dentro desse tempo, dispara erro
   * @default undefined (sem timeout)
   */
  connectionTimeout?: number;

  /**
   * Timeout em ms sem receber mensagens para considerar conexão inativa
   * Se nenhuma mensagem for recebida dentro desse tempo, reconecta
   * Útil para detectar conexões "zumbis" que não fecharam corretamente
   * @default undefined (sem timeout)
   */
  idleTimeout?: number;

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
  /** Último dado recebido */
  data: T | null;
  /** Status atual da conexão */
  status: SSEStatus;
  /** Erro atual (se houver) */
  error: Error | null;
  /** Nome do último evento recebido */
  lastEvent: string | null;
  /** ID do último evento recebido (se enviado pelo servidor) */
  lastEventId: string | null;
  /** Número de tentativas de reconexão */
  retryCount: number;
  /** 
   * Estado da conexão compatível com EventSource.readyState
   * - 0: CONNECTING
   * - 1: OPEN
   * - 2: CLOSED
   */
  readyState: 0 | 1 | 2;
  /** Função para conectar manualmente */
  connect: () => void;
  /** Função para desconectar manualmente */
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
  /** ID do último evento recebido (para retomar conexão) */
  lastEventId?: string;
  /** Método HTTP (apenas para fetch adapter) @default 'GET' */
  httpMethod?: 'GET' | 'POST';
  /** Body da requisição (apenas para fetch adapter com POST) */
  body?: string | object;
}
