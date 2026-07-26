import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('getAnthropicClient', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should throw a clear error when ANTHROPIC_API_KEY is missing', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    const { getAnthropicClient } = await import('./anthropic-client');

    expect(() => getAnthropicClient()).toThrow('ANTHROPIC_API_KEY');
  });

  it('should return the same client instance on repeated calls', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');

    const { getAnthropicClient } = await import('./anthropic-client');
    const first = getAnthropicClient();
    const second = getAnthropicClient();

    expect(first).toBe(second);
  });
});
