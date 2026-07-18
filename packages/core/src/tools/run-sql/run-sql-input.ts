import { z } from 'zod';

export const runSqlInputSchema = z.object({
  query: z.string().min(1),
});

export type RunSqlInput = z.infer<typeof runSqlInputSchema>;