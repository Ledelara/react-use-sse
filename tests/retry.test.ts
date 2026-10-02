import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RECONNECT_CONFIG,
  normalizeReconnectConfig,
  calculateRetryDelay,
  shouldRetry,
} from '../src/utils/retry';

describe('normalizeReconnectConfig', () => {
  it('should return default config for undefined', () => {
    const config = normalizeReconnectConfig(undefined);
    expect(config).toEqual(DEFAULT_RECONNECT_CONFIG);
  });

  it('should return default config for true', () => {
    const config = normalizeReconnectConfig(true);
    expect(config).toEqual(DEFAULT_RECONNECT_CONFIG);
  });

  it('should return disabled config for false', () => {
    const config = normalizeReconnectConfig(false);
    expect(config.enabled).toBe(false);
  });

  it('should merge partial config with defaults', () => {
    const config = normalizeReconnectConfig({
      enabled: true,
      maxRetries: 5,
    });

    expect(config.enabled).toBe(true);
    expect(config.maxRetries).toBe(5);
    expect(config.delay).toBe(DEFAULT_RECONNECT_CONFIG.delay);
    expect(config.backoffMultiplier).toBe(DEFAULT_RECONNECT_CONFIG.backoffMultiplier);
    expect(config.maxDelay).toBe(DEFAULT_RECONNECT_CONFIG.maxDelay);
  });

  it('should override all values when provided', () => {
    const custom = {
      enabled: true,
      maxRetries: 10,
      delay: 1000,
      backoffMultiplier: 2,
      maxDelay: 60000,
    };

    const config = normalizeReconnectConfig(custom);
    expect(config).toEqual(custom);
  });
});

describe('calculateRetryDelay', () => {
  const config = {
    enabled: true,
    maxRetries: 5,
    delay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000,
  };

  it('should return base delay for first attempt', () => {
    const delay = calculateRetryDelay(0, config);
    // Com jitter de ±10%, deve estar entre 900 e 1100
    expect(delay).toBeGreaterThanOrEqual(900);
    expect(delay).toBeLessThanOrEqual(1100);
  });

  it('should apply exponential backoff', () => {
    // Attempt 1: 1000 * 2^1 = 2000
    const delay1 = calculateRetryDelay(1, config);
    expect(delay1).toBeGreaterThanOrEqual(1800);
    expect(delay1).toBeLessThanOrEqual(2200);

    // Attempt 2: 1000 * 2^2 = 4000
    const delay2 = calculateRetryDelay(2, config);
    expect(delay2).toBeGreaterThanOrEqual(3600);
    expect(delay2).toBeLessThanOrEqual(4400);
  });

  it('should cap delay at maxDelay', () => {
    // Attempt 5: 1000 * 2^5 = 32000, capped at 10000
    const delay = calculateRetryDelay(5, config);
    expect(delay).toBeGreaterThanOrEqual(9000);
    expect(delay).toBeLessThanOrEqual(11000);
  });

  it('should handle Infinity maxRetries', () => {
    const infiniteConfig = { ...config, maxRetries: Infinity };
    const delay = calculateRetryDelay(100, infiniteConfig);
    // Should still be capped at maxDelay
    expect(delay).toBeLessThanOrEqual(11000);
  });
});

describe('shouldRetry', () => {
  it('should return false when disabled', () => {
    const config = { ...DEFAULT_RECONNECT_CONFIG, enabled: false };
    expect(shouldRetry(0, config)).toBe(false);
  });

  it('should return true when enabled and under maxRetries', () => {
    const config = { ...DEFAULT_RECONNECT_CONFIG, maxRetries: 5 };
    expect(shouldRetry(0, config)).toBe(true);
    expect(shouldRetry(4, config)).toBe(true);
  });

  it('should return false when at or over maxRetries', () => {
    const config = { ...DEFAULT_RECONNECT_CONFIG, maxRetries: 5 };
    expect(shouldRetry(5, config)).toBe(false);
    expect(shouldRetry(10, config)).toBe(false);
  });

  it('should always return true for Infinity maxRetries', () => {
    const config = { ...DEFAULT_RECONNECT_CONFIG, maxRetries: Infinity };
    expect(shouldRetry(0, config)).toBe(true);
    expect(shouldRetry(1000, config)).toBe(true);
    expect(shouldRetry(999999, config)).toBe(true);
  });
});
