import { describe, expect, it } from 'vitest';
import { createProgram } from './create-program';

describe('createProgram', () => {
  it('should create a commander program named boardgame', () => {
    const program = createProgram();

    expect(program.name()).toEqual('boardgame');
  });
});
