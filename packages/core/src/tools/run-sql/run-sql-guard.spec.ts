import { describe, expect, it } from 'vitest';
import { assertReadOnlySelect } from './run-sql-guard';

describe('assertReadOnlySelect', () => {
  it('should accept a plain SELECT and strip the trailing semicolon', () => {
    expect(assertReadOnlySelect('SELECT * FROM games;')).toEqual('SELECT * FROM games');
  });

  it('should accept a WITH ... SELECT statement', () => {
    const query = 'WITH cheap AS (SELECT * FROM games WHERE price < 10) SELECT * FROM cheap';

    expect(assertReadOnlySelect(query)).toEqual(query);
  });

  it('should reject an empty query', () => {
    expect(() => assertReadOnlySelect('   ')).toThrow();
  });

  it('should reject a query that does not start with SELECT or WITH', () => {
    expect(() => assertReadOnlySelect('EXPLAIN SELECT * FROM games')).toThrow();
  });

  it('should reject stacked statements', () => {
    expect(() => assertReadOnlySelect('SELECT * FROM games; DROP TABLE games;')).toThrow();
  });

  it.each(['INSERT INTO games (name) VALUES (\'x\')', 'UPDATE games SET stock = 0', 'DELETE FROM games', 'DROP TABLE games'])(
    'should reject mutating statements like "%s"',
    (query) => {
      expect(() => assertReadOnlySelect(query)).toThrow();
    },
  );

  it('should not false-positive on column names that contain forbidden substrings', () => {
    expect(assertReadOnlySelect('SELECT created_at, reset_count, asset_tag FROM games')).toEqual(
      'SELECT created_at, reset_count, asset_tag FROM games',
    );
  });
});