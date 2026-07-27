import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { executeUpsertProduct, upsertProductTool } from './upsert-product-tool';

function makeFakePool(existingRowCount: number): { pool: Pick<Pool, 'query'>; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn(async (sql: string) => {
    if (sql.trim().startsWith('SELECT')) {
      return { rows: [], rowCount: existingRowCount };
    }

    return { rows: [], rowCount: 1 };
  });

  return { pool: { query } as unknown as Pick<Pool, 'query'>, query };
}

describe('upsertProductTool', () => {
  it('should declare name as the only required input', () => {
    const schema = upsertProductTool.input_schema as { required?: string[] };

    expect(schema.required).toEqual(['name']);
  });
});

describe('executeUpsertProduct', () => {
  it('should reject invalid input before querying', async () => {
    const { pool, query } = makeFakePool(0);

    await expect(executeUpsertProduct({}, pool)).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('should reject an invalid category value', async () => {
    const { pool, query } = makeFakePool(0);

    await expect(executeUpsertProduct({ name: 'Dobble', category: 'nem-létező' }, pool)).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('should report created: true and insert only the provided fields for a brand-new product', async () => {
    const { pool, query } = makeFakePool(0);

    const result = await executeUpsertProduct(
      { name: 'Dobble', category: 'parti', price: 4500, stock: 30 },
      pool,
    );

    expect(result).toEqual({ name: 'Dobble', created: true });
    expect(query).toHaveBeenCalledWith('SELECT id FROM games WHERE name = $1', ['Dobble']);

    const [insertSql, insertValues] = query.mock.calls[1] as [string, unknown[]];
    expect(insertSql).toContain('INSERT INTO games (name, category, price, stock)');
    expect(insertSql).toContain('VALUES ($1, $2, $3, $4)');
    expect(insertSql).toContain('ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, price = EXCLUDED.price, stock = EXCLUDED.stock');
    expect(insertValues).toEqual(['Dobble', 'parti', 4500, 30]);
  });

  it('should report created: false when the product already exists', async () => {
    const { pool } = makeFakePool(1);

    const result = await executeUpsertProduct({ name: 'Dobble', stock: 12 }, pool);

    expect(result).toEqual({ name: 'Dobble', created: false });
  });

  it('should only update the fields actually provided, leaving the rest untouched', async () => {
    const { pool, query } = makeFakePool(1);

    await executeUpsertProduct({ name: 'Dobble', price: 3990 }, pool);

    const [insertSql, insertValues] = query.mock.calls[1] as [string, unknown[]];
    expect(insertSql).toContain('ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price');
    expect(insertSql).not.toContain('stock');
    expect(insertValues).toEqual(['Dobble', 3990]);
  });

  it('should do nothing on conflict when only the name is given (no fields to change)', async () => {
    const { pool, query } = makeFakePool(1);

    await executeUpsertProduct({ name: 'Dobble' }, pool);

    const [insertSql] = query.mock.calls[1] as [string, unknown[]];
    expect(insertSql).toContain('ON CONFLICT (name) DO NOTHING');
  });
});
