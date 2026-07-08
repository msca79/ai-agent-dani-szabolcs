import { z } from 'zod';

export const CATEGORIES = [
  'parti',
  'stratégiai',
  'család',
  'kooperatív',
  'kártya',
  'absztrakt',
  'dobókockás',
  'roguelike',
] as const;

export const COMPLEXITIES = ['könnyű', 'közepes', 'nehéz'] as const;

export const searchGamesInputSchema = z.object({
  players: z.number().int().positive().optional(),
  playtime: z.number().int().positive().optional(),
  complexity: z.enum(COMPLEXITIES).optional(),
  genre: z.enum(CATEGORIES).optional(),
  age: z.number().int().positive().optional(),
});

export type SearchGamesInput = z.infer<typeof searchGamesInputSchema>;
