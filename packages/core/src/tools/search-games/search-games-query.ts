import type { SearchGamesInput } from './search-games-input';

export interface SearchGamesQuery {
  text: string;
  values: unknown[];
}

export function buildSearchGamesQuery(input: SearchGamesInput): SearchGamesQuery {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (input.players !== undefined) {
    values.push(input.players);
    conditions.push(`players_min <= $${values.length} AND players_max >= $${values.length}`);
  }

  if (input.playtime !== undefined) {
    values.push(input.playtime);
    // A rendszerprompt "maximum X perc" szabálya szerint egyetlen skalár playtime
    // paraméterrel a helyes értelmezés playtime_max_minutes <= X, NEM a players-hez
    // hasonló tartomány-tartalmazás — tudatos egyszerűsítés, ne "javítsd" vissza.
    conditions.push(`playtime_max_minutes <= $${values.length}`);
  }

  if (input.complexity !== undefined) {
    values.push(input.complexity);
    conditions.push(`complexity = $${values.length}`);
  }

  if (input.genre !== undefined) {
    values.push(input.genre);
    conditions.push(`category = $${values.length}`);
  }

  if (input.age !== undefined) {
    values.push(input.age);
    conditions.push(`min_age <= $${values.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const text = `SELECT * FROM games ${where} ORDER BY rating DESC NULLS LAST LIMIT 10`.replace(/\s+/g, ' ').trim();

  return { text, values };
}
