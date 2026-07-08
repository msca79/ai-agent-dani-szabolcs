import { describe, expect, it } from 'vitest';
import { buildSearchGamesQuery } from './search-games-query';

describe('buildSearchGamesQuery', () => {
  it('should build an unfiltered query with just an order and limit when no filters are given', () => {
    const { text, values } = buildSearchGamesQuery({});

    expect(text).toEqual('SELECT * FROM games ORDER BY rating DESC NULLS LAST LIMIT 10');
    expect(values).toEqual([]);
  });

  it('should filter by players as a containment range', () => {
    const { text, values } = buildSearchGamesQuery({ players: 3 });

    expect(text).toContain('players_min <= $1 AND players_max >= $1');
    expect(values).toEqual([3]);
  });

  it('should filter by playtime as an upper bound (maximum X perc)', () => {
    const { text, values } = buildSearchGamesQuery({ playtime: 30 });

    expect(text).toContain('playtime_max_minutes <= $1');
    expect(values).toEqual([30]);
  });

  it('should filter by complexity and genre as equality on complexity/category', () => {
    const { text, values } = buildSearchGamesQuery({ complexity: 'könnyű', genre: 'parti' });

    expect(text).toContain('complexity = $1');
    expect(text).toContain('category = $2');
    expect(values).toEqual(['könnyű', 'parti']);
  });

  it('should filter by age as a minimum-age upper bound', () => {
    const { text, values } = buildSearchGamesQuery({ age: 10 });

    expect(text).toContain('min_age <= $1');
    expect(values).toEqual([10]);
  });

  it('should combine multiple filters with increasing placeholder numbers', () => {
    const { text, values } = buildSearchGamesQuery({ players: 3, playtime: 30, genre: 'parti' });

    expect(text).toContain('players_min <= $1 AND players_max >= $1');
    expect(text).toContain('playtime_max_minutes <= $2');
    expect(text).toContain('category = $3');
    expect(values).toEqual([3, 30, 'parti']);
  });
});
