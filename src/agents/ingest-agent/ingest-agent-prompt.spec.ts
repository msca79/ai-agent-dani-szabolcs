import { describe, expect, it } from 'vitest';
import { INGEST_AGENT_SYSTEM_PROMPT } from './ingest-agent-prompt';

describe('INGEST_AGENT_SYSTEM_PROMPT', () => {
  it('should contain the core XML tags', () => {
    expect(INGEST_AGENT_SYSTEM_PROMPT).toContain('<role>');
    expect(INGEST_AGENT_SYSTEM_PROMPT).toContain('<schema>');
    expect(INGEST_AGENT_SYSTEM_PROMPT).toContain('<rules>');
    expect(INGEST_AGENT_SYSTEM_PROMPT).toContain('<behavior>');
    expect(INGEST_AGENT_SYSTEM_PROMPT).toContain('<tools>');
  });

  it('should mention all three tools it may use', () => {
    expect(INGEST_AGENT_SYSTEM_PROMPT).toContain('run_sql');
    expect(INGEST_AGENT_SYSTEM_PROMPT).toContain('upsertProduct');
    expect(INGEST_AGENT_SYSTEM_PROMPT).toContain('fetchGameDescription');
  });

  it('should tell the model to read the current state before writing', () => {
    expect(INGEST_AGENT_SYSTEM_PROMPT).toMatch(/előbb.*run_sql/i);
  });

  it('should forbid deleting or touching other tables', () => {
    expect(INGEST_AGENT_SYSTEM_PROMPT).toMatch(/törlés/i);
  });
});
