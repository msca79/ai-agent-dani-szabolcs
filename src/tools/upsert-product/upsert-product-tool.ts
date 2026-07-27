import type Anthropic from '@anthropic-ai/sdk';
import type { Pool } from 'pg';
import { upsertProductInputSchema, type UpsertProductInput } from './upsert-product-input';

// camelCase mező -> tényleges games oszlopnév. Csak ez a fix, whitelistelt
// halmaz kerülhet valaha SQL oszlopnévként a query-be — a mezőértékek mindig
// paraméterezve mennek, sosem string-interpolációval.
const FIELD_TO_COLUMN = {
  bggId: 'bgg_id',
  category: 'category',
  complexity: 'complexity',
  playersMin: 'players_min',
  playersMax: 'players_max',
  playtimeMinMinutes: 'playtime_min_minutes',
  playtimeMaxMinutes: 'playtime_max_minutes',
  minAge: 'min_age',
  price: 'price',
  salePrice: 'sale_price',
  stock: 'stock',
  rating: 'rating',
  reviewsCount: 'reviews_count',
  description: 'description',
} as const satisfies Record<string, string>;

type OptionalField = keyof typeof FIELD_TO_COLUMN;

export const upsertProductTool: Anthropic.Tool = {
  name: 'upsertProduct',
  description:
    'Új társasjáték-termék felvétele vagy meglévő frissítése a games katalógusban (ár, akció, ' +
    'készlet, leírás, játékadatok). A name mező azonosítja a terméket; a meg nem adott mezők ' +
    'frissítéskor nem változnak.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'A termék (játék) neve — ez azonosítja, melyik sort érinti.' },
      bggId: { type: ['number', 'null'], description: 'BoardGameGeek azonosító, ha ismert.' },
      category: {
        type: 'string',
        enum: ['parti', 'stratégiai', 'család', 'kooperatív', 'kártya', 'absztrakt', 'dobókockás', 'roguelike'],
      },
      complexity: { type: 'string', enum: ['könnyű', 'közepes', 'nehéz'] },
      playersMin: { type: 'number' },
      playersMax: { type: 'number' },
      playtimeMinMinutes: { type: 'number' },
      playtimeMaxMinutes: { type: 'number' },
      minAge: { type: 'number' },
      price: { type: 'number' },
      salePrice: { type: ['number', 'null'], description: 'Akciós ár, vagy null ha nincs akció.' },
      stock: { type: 'number' },
      rating: { type: 'number', description: '0–10 közötti érték.' },
      reviewsCount: { type: 'number' },
      description: { type: 'string' },
    },
    required: ['name'],
  },
};

export async function executeUpsertProduct(
  rawInput: unknown,
  pool: Pick<Pool, 'query'>,
): Promise<{ name: string; created: boolean }> {
  const input = upsertProductInputSchema.parse(rawInput);

  const providedFields = (Object.keys(FIELD_TO_COLUMN) as OptionalField[]).filter(
    (field) => input[field as keyof UpsertProductInput] !== undefined,
  );

  const existing = await pool.query('SELECT id FROM games WHERE name = $1', [input.name]);
  const created = existing.rowCount === 0;

  const columns = ['name', ...providedFields.map((field) => FIELD_TO_COLUMN[field])];
  const values: unknown[] = [input.name, ...providedFields.map((field) => input[field as keyof UpsertProductInput])];
  const placeholders = values.map((_, index) => `$${index + 1}`);

  const conflictClause =
    providedFields.length > 0
      ? `DO UPDATE SET ${providedFields.map((field) => `${FIELD_TO_COLUMN[field]} = EXCLUDED.${FIELD_TO_COLUMN[field]}`).join(', ')}`
      : 'DO NOTHING';

  const query = `INSERT INTO games (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (name) ${conflictClause}`;

  await pool.query(query, values);

  return { name: input.name, created };
}
