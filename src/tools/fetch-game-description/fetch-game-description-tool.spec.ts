import { describe, expect, it } from 'vitest';
import { executeFetchGameDescription, fetchGameDescriptionTool } from './fetch-game-description-tool';

describe('fetchGameDescriptionTool', () => {
  it('should declare gameName as the only required input', () => {
    const schema = fetchGameDescriptionTool.input_schema as { required?: string[] };

    expect(schema.required).toEqual(['gameName']);
  });

  it('should mark itself as a mock in its description, since no real integration exists yet', () => {
    expect(fetchGameDescriptionTool.description).toMatch(/mock/i);
  });
});

describe('executeFetchGameDescription', () => {
  it('should reject invalid input', async () => {
    await expect(executeFetchGameDescription({})).rejects.toThrow();
  });

  it('should return a mock description mentioning the requested game name', async () => {
    const result = await executeFetchGameDescription({ gameName: 'Dobble' });

    expect(result.description).toContain('Dobble');
    expect(result.source).toEqual('mock');
  });

  it('should be deterministic for the same input (no real network call)', async () => {
    const first = await executeFetchGameDescription({ gameName: 'Sushi Go!' });
    const second = await executeFetchGameDescription({ gameName: 'Sushi Go!' });

    expect(first).toEqual(second);
  });
});
