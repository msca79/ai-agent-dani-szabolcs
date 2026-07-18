import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { executeRunSql, runSqlTool } from './run-sql-tool';

function makeFakePool(rows: unknown[]): { pool: Pick<Pool, 'query'>; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn(async () => ({ rows }));

  return { pool: { query } as unknown as Pick<Pool, 'query'>, query };
}

describe('runSqlTool', () => {
  it('should declare a required string query input', () => {
    const schema = runSqlTool.input_schema as {
      required?: string[];
      properties: Record<string, { type: string }>;
    };

    expect(schema.required).toEqual(['query']);
    expect(schema.properties['query'].type).toEqual('string');
  });
});

describe('executeRunSql', () => {
  it('should reject invalid input before querying', async () => {
    const { pool, query } = makeFakePool([]);

    await expect(executeRunSql({}, pool)).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('should reject a non-SELECT query before querying', async () => {
    const { pool, query } = makeFakePool([]);

    await expect(executeRunSql({ query: 'DELETE FROM games' }, pool)).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('should wrap the query in a limited read-only subquery and return the rows', async () => {
    const rows = [{ id: 1, name: 'Dobble' }];
    const { pool, query } = makeFakePool(rows);

    const result = await executeRunSql({ query: 'SELECT * FROM games WHERE stock > 0' }, pool);

    expect(query).toHaveBeenCalledWith(
      'SELECT * FROM (SELECT * FROM games WHERE stock > 0) AS run_sql_subquery LIMIT 100',
    );
    expect(result).toEqual(rows);
  });
});