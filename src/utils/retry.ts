import type { SSEReconnectConfig } from '../types';

/**
 * Configuração padrão de reconexão
 */
export const DEFAULT_RECONNECT_CONFIG: Required<SSEReconnectConfig> = {
  enabled: true,
  maxRetries: Infinity,
  delay: 3000,
  backoffMultiplier: 1.5,
  maxDelay: 30000,
};

/**
 * Normaliza a configuração de reconexão
 *
 * @param config - Configuração parcial ou boolean
 * @returns Configuração completa
 */
export function normalizeReconnectConfig(
  config?: SSEReconnectConfig | boolean
): Required<SSEReconnectConfig> {
  if (config === false) {
    return { ...DEFAULT_RECONNECT_CONFIG, enabled: false };
  }

  if (config === true || config === undefined) {
    return DEFAULT_RECONNECT_CONFIG;
  }

  return {
    ...DEFAULT_RECONNECT_CONFIG,
    ...config,
  };
}

/**
 * Calcula o delay para a próxima tentativa de reconexão
 * Usa backoff exponencial com jitter
 *
 * @param attempt - Número da tentativa (0-indexed)
 * @param config - Configuração de reconexão
 * @returns Delay em milissegundos
 */
export function calculateRetryDelay(
  attempt: number,
  config: Required<SSEReconnectConfig>
): number {
  const { delay, backoffMultiplier, maxDelay } = config;

  const exponentialDelay = delay * Math.pow(backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);

  return Math.round(cappedDelay + jitter);
}

/**
 * Verifica se deve tentar reconectar
 *
 * @param attempt - Número da tentativa atual
 * @param config - Configuração de reconexão
 * @returns true se deve tentar reconectar
 */
export function shouldRetry(
  attempt: number,
  config: Required<SSEReconnectConfig>
): boolean {
  if (!config.enabled) return false;
  if (config.maxRetries === Infinity) return true;
  return attempt < config.maxRetries;
}
