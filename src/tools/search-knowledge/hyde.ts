import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '../../agents/client/anthropic-client';
import { RAG_LLM_MODEL } from '../../rag/rag-llm-model';

// HyDE (Hypothetical Document Embeddings): egy rövid kérdés embeddingje
// gyakran kevésbé hasonlít a tárolt (hosszabb, válasz-jellegű) chunk-ok
// embeddingjéhez, mint egy "elképzelt" válasz-szövegé. Ezért ezt a plugint
// bekapcsolva nem a nyers kérdést, hanem egy erre írt hipotetikus
// szabálykönyv-részletet embedelünk a kereséshez.
// Env-változóval felülírható (HYDE_ENABLED=false), hogy a golden set-et
// nyers keresés vs. teljes pipeline összehasonlításban lehessen futtatni
// kódmódosítás nélkül.
export const HYDE_ENABLED = process.env['HYDE_ENABLED'] !== 'false';

const MAX_TOKENS = 512;

const SYSTEM_PROMPT = `<role>
Egy társasjáték-szabálykönyv részletét írod meg, ami hihetően válaszolna egy
adott kérdésre — ezt egy keresőrendszer fogja embedelni, hogy hasonló
tartalmú valódi szabálykönyv-részleteket találjon.
</role>

<rules>
- Írj egy rövid (3-6 mondatos), szabálykönyv-stílusú magyar szöveget, ami
  úgy hangzik, mintha egy valódi szabálykönyvből származna, és megválaszolná
  a kérdést.
- Ne jelezd, hogy ez kitalált vagy hipotetikus szöveg — ne írj bevezetőt,
  csak magát a "szabályrészletet".
- Ha nem tudod, melyik játékról van szó, írj egy általános, tetszőleges
  társasjáték szabályaira jellemző szöveget a kérdés témájában.
</rules>`;

export interface HydeResult {
  hypotheticalDocument: string;
  tokensUsed: number;
}

export async function generateHypotheticalDocument(
  query: string,
  client: Anthropic = getAnthropicClient(),
): Promise<HydeResult> {
  const response = await client.messages.create({
    model: RAG_LLM_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: query }],
  });

  const hypotheticalDocument = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  const tokensUsed = (response.usage.input_tokens ?? 0) + response.usage.output_tokens;

  return { hypotheticalDocument: hypotheticalDocument || query, tokensUsed };
}
