import { describe, expect, it } from 'vitest';
import { getWritePool } from './write-pool';

describe('getWritePool', () => {
  it('should return the same pool instance on repeated calls', () => {
    const first = getWritePool();
    const second = getWritePool();

    expect(first).toBe(second);
  });
});
