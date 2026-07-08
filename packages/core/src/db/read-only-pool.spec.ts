import { describe, expect, it } from 'vitest';
import { getReadOnlyPool } from './read-only-pool';

describe('getReadOnlyPool', () => {
  it('should return the same pool instance on repeated calls', () => {
    const first = getReadOnlyPool();
    const second = getReadOnlyPool();

    expect(first).toBe(second);
  });
});
