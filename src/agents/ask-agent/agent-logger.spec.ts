import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logAgentEvent } from './agent-logger';

describe('logAgentEvent', () => {
  const originalIsTTY = process.stderr.isTTY;

  afterEach(() => {
    process.stderr.isTTY = originalIsTTY;
    vi.unstubAllEnvs();
  });

  describe('when stderr is not a TTY (piped/redirected)', () => {
    beforeEach(() => {
      process.stderr.isTTY = false;
    });

    it('should write a single parseable JSON line with the event name and a timestamp', () => {
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      logAgentEvent('tool_call', { tool: 'run_sql', input: { query: 'SELECT 1' } });

      expect(writeSpy).toHaveBeenCalledTimes(1);
      const [line] = writeSpy.mock.calls[0] as [string];
      const parsed = JSON.parse(line.trim());

      expect(parsed).toMatchObject({ event: 'tool_call', tool: 'run_sql', input: { query: 'SELECT 1' } });
      expect(typeof parsed.ts).toBe('string');

      writeSpy.mockRestore();
    });

    it('should log an event with no extra data', () => {
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      logAgentEvent('agent_start');

      const [line] = writeSpy.mock.calls[0] as [string];
      expect(JSON.parse(line.trim())).toMatchObject({ event: 'agent_start' });

      writeSpy.mockRestore();
    });

    it('should redact a thinking block signature instead of dumping the raw opaque token', () => {
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const longSignature = 'x'.repeat(500);

      logAgentEvent('llm_response', {
        iteration: 0,
        stopReason: 'tool_use',
        content: [{ type: 'thinking', thinking: '', signature: longSignature }],
      });

      const [line] = writeSpy.mock.calls[0] as [string];
      expect(line).not.toContain(longSignature);
      expect(line).toContain('signature omitted, 500 chars');

      writeSpy.mockRestore();
    });
  });

  describe('when stderr is a TTY (interactive terminal)', () => {
    beforeEach(() => {
      process.stderr.isTTY = true;
    });

    it('should write a human-readable line instead of raw JSON', () => {
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      logAgentEvent('tool_result', { tool: 'run_sql', resultCount: 3 });

      const [line] = writeSpy.mock.calls[0] as [string];
      expect(() => JSON.parse(line.trim())).toThrow();
      expect(line).toContain('run_sql');
      expect(line).toContain('3 sor');

      writeSpy.mockRestore();
    });

    it('should append a separator line after every block', () => {
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      logAgentEvent('agent_start', { question: 'szia' });

      const [line] = writeSpy.mock.calls[0] as [string];
      expect(line).toContain('─'.repeat(70));

      writeSpy.mockRestore();
    });

    it('should colorize the line with ANSI escape codes when NO_COLOR is not set', () => {
      vi.stubEnv('NO_COLOR', '');
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      logAgentEvent('agent_end', { answerLength: 42 });

      const [line] = writeSpy.mock.calls[0] as [string];
      expect(line).toContain('\x1b[');

      writeSpy.mockRestore();
    });

    it('should not colorize the line when NO_COLOR is set', () => {
      vi.stubEnv('NO_COLOR', '1');
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      logAgentEvent('agent_end', { answerLength: 42 });

      const [line] = writeSpy.mock.calls[0] as [string];
      expect(line).not.toContain('\x1b[');

      writeSpy.mockRestore();
    });

    it('should include the exact messages payload sent to the LLM, not a summary', () => {
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      logAgentEvent('llm_request', {
        iteration: 0,
        model: 'claude-sonnet-5',
        tools: ['run_sql'],
        systemPrompt: '<role>teszt</role>',
        messages: [{ role: 'user', content: 'szia' }],
      });

      const [line] = writeSpy.mock.calls[0] as [string];
      expect(line).toContain('claude-sonnet-5');
      expect(line).toContain('run_sql');
      expect(line).toContain('msg#1');
      expect(line).toContain('<role>teszt</role>');
      expect(line).toContain('"role": "user"');
      expect(line).toContain('"content": "szia"');

      writeSpy.mockRestore();
    });

    it('should show the growing message list across iterations, not just the first message', () => {
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      logAgentEvent('llm_request', {
        iteration: 1,
        model: 'claude-sonnet-5',
        tools: ['run_sql'],
        systemPrompt: '<role>teszt</role>',
        messages: [
          { role: 'user', content: 'szia' },
          { role: 'assistant', content: [{ type: 'text', text: 'ok' }] },
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '[{"name":"Dobble"}]' }] },
        ],
      });

      const [line] = writeSpy.mock.calls[0] as [string];
      expect(line).toContain('msg#3');
      expect(line).toContain('tool_result');
      expect(line).toContain('Dobble');

      writeSpy.mockRestore();
    });

    it('should include the exact response content blocks for an llm_response', () => {
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      logAgentEvent('llm_response', {
        iteration: 0,
        stopReason: 'tool_use',
        content: [{ type: 'tool_use', id: 'toolu_1', name: 'run_sql', input: { query: 'SELECT 1' } }],
      });

      const [line] = writeSpy.mock.calls[0] as [string];
      expect(line).toContain('stop=tool_use');
      expect(line).toContain('"name": "run_sql"');
      expect(line).toContain('"query": "SELECT 1"');

      writeSpy.mockRestore();
    });

    it('should redact a thinking block signature instead of dumping the raw opaque token', () => {
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const longSignature = 'x'.repeat(500);

      logAgentEvent('llm_response', {
        iteration: 0,
        stopReason: 'tool_use',
        content: [{ type: 'thinking', thinking: '', signature: longSignature }],
      });

      const [line] = writeSpy.mock.calls[0] as [string];
      expect(line).not.toContain(longSignature);
      expect(line).toContain('signature omitted, 500 chars');

      writeSpy.mockRestore();
    });
  });
});
