import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT } from './system-prompt';

describe('SYSTEM_PROMPT', () => {
  it('should contain the core XML tags', () => {
    expect(SYSTEM_PROMPT).toContain('<role>');
    expect(SYSTEM_PROMPT).toContain('<schema>');
    expect(SYSTEM_PROMPT).toContain('<rules>');
    expect(SYSTEM_PROMPT).toContain('<behavior>');
    expect(SYSTEM_PROMPT).toContain('<tools>');
  });

  it('should mention the search_games tool', () => {
    expect(SYSTEM_PROMPT).toContain('search_games');
  });
});
