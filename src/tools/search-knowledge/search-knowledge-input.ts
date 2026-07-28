import { z } from 'zod';

export const searchKnowledgeInputSchema = z.object({
  query: z.string().min(1),
});

export type SearchKnowledgeInput = z.infer<typeof searchKnowledgeInputSchema>;
