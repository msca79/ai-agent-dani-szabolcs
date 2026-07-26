import { describe, expect, it } from 'vitest';
import { CORE_VERSION } from './index';

describe('CORE_VERSION', () => {
  it('should be exported', () => {
    expect(CORE_VERSION).toEqual('0.0.0');
  });
});
