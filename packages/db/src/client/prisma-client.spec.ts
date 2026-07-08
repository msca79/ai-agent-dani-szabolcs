import { describe, expect, it } from 'vitest';
import { getPrismaClient } from './prisma-client';

describe('getPrismaClient', () => {
  it('should return a client exposing the games model delegate', () => {
    const client = getPrismaClient();

    expect(client.game).toBeDefined();
  });

  it('should return the same instance on repeated calls', () => {
    const first = getPrismaClient();
    const second = getPrismaClient();

    expect(first).toBe(second);
  });
});
