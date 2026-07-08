import { describe, expect, it } from 'vitest';
import { DB_VERSION } from './index';

describe('DB_VERSION', () => {
  it('should be exported', () => {
    expect(DB_VERSION).toEqual('0.0.0');
  });
});
