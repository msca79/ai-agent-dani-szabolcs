import { z } from 'zod';
import type { ConversationTurn } from '../../../agents/agent-loop/tool-definition';

const conversationTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const askRequestSchema = z.object({
  question: z.string().min(1),
  history: z.array(conversationTurnSchema).optional(),
});

export interface AskRequest {
  question: string;
  history: ConversationTurn[];
}

export function parseAskRequestBody(raw: string): AskRequest {
  const parsed: unknown = JSON.parse(raw);
  const { question, history } = askRequestSchema.parse(parsed);

  return { question, history: history ?? [] };
}
