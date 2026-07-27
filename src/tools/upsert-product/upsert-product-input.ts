import { z } from 'zod';

const GAME_CATEGORIES = [
  'parti',
  'stratégiai',
  'család',
  'kooperatív',
  'kártya',
  'absztrakt',
  'dobókockás',
  'roguelike',
] as const;

const GAME_COMPLEXITIES = ['könnyű', 'közepes', 'nehéz'] as const;

export const upsertProductInputSchema = z.object({
  name: z.string().min(1),
  bggId: z.number().int().nullable().optional(),
  category: z.enum(GAME_CATEGORIES).optional(),
  complexity: z.enum(GAME_COMPLEXITIES).optional(),
  playersMin: z.number().int().positive().optional(),
  playersMax: z.number().int().positive().optional(),
  playtimeMinMinutes: z.number().int().positive().optional(),
  playtimeMaxMinutes: z.number().int().positive().optional(),
  minAge: z.number().int().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  salePrice: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative().optional(),
  rating: z.number().min(0).max(10).optional(),
  reviewsCount: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
});

export type UpsertProductInput = z.infer<typeof upsertProductInputSchema>;
