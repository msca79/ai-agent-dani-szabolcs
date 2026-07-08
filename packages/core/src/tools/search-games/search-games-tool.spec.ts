import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { CATEGORIES, COMPLEXITIES, searchGamesInputSchema } from './search-games-input';
import { executeSearchGames, searchGamesTool } from './search-games-tool';

function makeFakePool(rows: unknown[]): { pool: Pick<Pool, 'query'>; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn(async () => ({ rows }));

  return { pool: { query } as unknown as Pick<Pool, 'query'>, query };
}

describe('searchGamesTool', () => {
  it('should keep the JSON input_schema in sync with the zod schema fields and enums', () => {
    const schema = searchGamesTool.input_schema as {
      properties: Record<string, { enum?: string[] }>;
    };
    const zodKeys = Object.keys(searchGamesInputSchema.shape).sort();
    const jsonKeys = Object.keys(schema.properties).sort();

    expect(jsonKeys).toEqual(zodKeys);
    expect(schema.properties['complexity'].enum).toEqual([...COMPLEXITIES]);
    expect(schema.properties['genre'].enum).toEqual([...CATEGORIES]);
  });
});

describe('executeSearchGames', () => {
  it('should reject invalid input before querying', async () => {
    const { pool, query } = makeFakePool([]);

    await expect(executeSearchGames({ complexity: 'lehetetlen' }, pool)).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('should run the built query and return the rows', async () => {
    const rows = [{ id: 1, name: 'Dobble' }];
    const { pool, query } = makeFakePool(rows);

    const result = await executeSearchGames({ players: 4 }, pool);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('players_min <= $1'), [4]);
    expect(result).toEqual(rows);
  });
});
