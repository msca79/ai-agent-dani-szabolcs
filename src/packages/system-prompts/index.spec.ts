import { describe, expect, it } from 'vitest';
import { BOARDGAME_SYSTEM_PROMPT } from './index';

describe('BOARDGAME_SYSTEM_PROMPT', () => {
  it('should contain the core XML tags', () => {
    expect(BOARDGAME_SYSTEM_PROMPT).toContain('<role>');
    expect(BOARDGAME_SYSTEM_PROMPT).toContain('<schema>');
    expect(BOARDGAME_SYSTEM_PROMPT).toContain('<rules>');
    expect(BOARDGAME_SYSTEM_PROMPT).toContain('<behavior>');
    expect(BOARDGAME_SYSTEM_PROMPT).toContain('<tools>');
  });

  it('should mention the run_sql tool', () => {
    expect(BOARDGAME_SYSTEM_PROMPT).toContain('run_sql');
  });
});
