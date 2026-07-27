import { describe, expect, it } from 'vitest';
import { QUERY_AGENT_SYSTEM_PROMPT } from './query-agent-prompt';

describe('QUERY_AGENT_SYSTEM_PROMPT', () => {
  it('should contain the core XML tags', () => {
    expect(QUERY_AGENT_SYSTEM_PROMPT).toContain('<role>');
    expect(QUERY_AGENT_SYSTEM_PROMPT).toContain('<schema>');
    expect(QUERY_AGENT_SYSTEM_PROMPT).toContain('<rules>');
    expect(QUERY_AGENT_SYSTEM_PROMPT).toContain('<behavior>');
    expect(QUERY_AGENT_SYSTEM_PROMPT).toContain('<tools>');
  });

  it('should mention the run_sql tool', () => {
    expect(QUERY_AGENT_SYSTEM_PROMPT).toContain('run_sql');
  });
});
