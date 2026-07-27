import { z } from 'zod';

export const fetchGameDescriptionInputSchema = z.object({
  gameName: z.string().min(1),
  bggId: z.number().int().nullable().optional(),
});

export type FetchGameDescriptionInput = z.infer<typeof fetchGameDescriptionInputSchema>;
