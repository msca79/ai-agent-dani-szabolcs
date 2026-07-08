import type Anthropic from '@anthropic-ai/sdk';
import type { Pool } from 'pg';
import { buildSearchGamesQuery } from './search-games-query';
import { CATEGORIES, COMPLEXITIES, searchGamesInputSchema } from './search-games-input';

export interface GameRow {
  id: number;
  name: string | null;
  bgg_id: number | null;
  category: string | null;
  complexity: string | null;
  players_min: number | null;
  players_max: number | null;
  playtime_min_minutes: number | null;
  playtime_max_minutes: number | null;
  min_age: number | null;
  price: string | null;
  sale_price: string | null;
  stock: number | null;
  rating: string | null;
  reviews_count: number | null;
  description: string | null;
}

export const searchGamesTool: Anthropic.Tool = {
  name: 'search_games',
  description:
    'Szűrt keresés a games katalógusban játékosszám, játékidő, nehézség, kategória és minimum életkor alapján.',
  input_schema: {
    type: 'object',
    properties: {
      players: { type: 'integer', description: 'A kívánt játékosszám.' },
      playtime: { type: 'integer', description: 'A rendelkezésre álló idő percben (maximum X perc).' },
      complexity: { type: 'string', enum: [...COMPLEXITIES], description: 'A játék nehézsége.' },
      genre: { type: 'string', enum: [...CATEGORIES], description: 'A games.category oszlopnak felel meg.' },
      age: { type: 'integer', description: 'A játékos életkora.' },
    },
    required: [],
  },
};

export async function executeSearchGames(rawInput: unknown, pool: Pick<Pool, 'query'>): Promise<GameRow[]> {
  const input = searchGamesInputSchema.parse(rawInput);
  const { text, values } = buildSearchGamesQuery(input);
  const result = await pool.query(text, values);

  return result.rows;
}
