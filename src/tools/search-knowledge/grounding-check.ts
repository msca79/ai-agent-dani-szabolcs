import type Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { getAnthropicClient } from '../../agents/client/anthropic-client';
import { RAG_LLM_MODEL } from '../../rag/rag-llm-model';
import type { KnowledgeSearchResult } from './knowledge-search-result';

// Ha be van kapcsolva, a query-agent a végső válasz elkészülte után
// ellenőrizteti, hogy a válasz tényleg a beszélgetés során lekért
// chunk-okon alapul-e — csak logol, a választ nem módosítja.
export const GROUNDING_ENABLED = true;

const MAX_TOKENS = 512;

const groundingSchema = z.object({
  grounded: z.boolean().describe('Igaz, ha a válasz állításai levezethetők a megadott forrásrészletekből.'),
  notes: z.string().describe('Rövid indoklás, különösen akkor, ha grounded=false.'),
});

const SYSTEM_PROMPT = `<role>
Ellenőrzöd, hogy egy társasjáték-szabály kérdésre adott válasz kizárólag a
megadott forrás-szövegrészleteken (chunk) alapul-e, vagy tartalmaz-e
kitalált, a forrásokban nem szereplő állítást.
</role>

<rules>
- Csak a megadott forrásrészletek tartalma alapján dönts, ne a saját
  tudásod alapján.
- grounded=false, ha a válasz olyan konkrét szabályt, számot vagy tényt
  állít, ami nem szerepel egyik forrásrészletben sem.
- grounded=true, ha a válasz minden lényegi állítása visszavezethető a
  forrásrészletekre (parafrázis, összefoglalás rendben van).
</rules>`;

export interface GroundingResult {
  grounded: boolean;
  notes: string;
  tokensUsed: number;
}

export async function checkGrounding(
  question: string,
  answer: string,
  chunks: KnowledgeSearchResult[],
  client: Anthropic = getAnthropicClient(),
): Promise<GroundingResult> {
  const sourceList = chunks
    .map((chunk, index) => `[${index}] (${chunk.fileName}, ${chunk.startLine}-${chunk.endLine}):\n${chunk.text}`)
    .join('\n\n');

  const response = await client.messages.parse({
    model: RAG_LLM_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `Kérdés: ${question}\n\nVálasz: ${answer}\n\nForrásrészletek:\n${sourceList}` },
    ],
    output_config: { format: zodOutputFormat(groundingSchema) },
  });

  const tokensUsed = (response.usage.input_tokens ?? 0) + response.usage.output_tokens;

  if (!response.parsed_output) {
    return { grounded: true, notes: 'Nem sikerült ellenőrizni.', tokensUsed };
  }

  return { ...response.parsed_output, tokensUsed };
}
