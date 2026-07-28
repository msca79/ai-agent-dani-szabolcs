import type Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { getAnthropicClient } from '../../agents/client/anthropic-client';
import type { Chunk, ChunkingResult } from './chunk';

const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 4096;

const sectionsSchema = z.object({
  sections: z
    .array(
      z.object({
        startLine: z.number().int().min(1),
        endLine: z.number().int().min(1),
      }),
    )
    .min(1),
});

const SYSTEM_PROMPT = `<role>
Egy társasjáték-szabálykönyv (Markdown formátumú, sorszámozott) szövegét
szemantikus szakaszokra bontod, hogy azokat egy RAG rendszer chunk-jaiként
lehessen tárolni.
</role>

<rules>
- A megadott szöveg minden sora elé "N: " sorszám van írva (N = sorszám,
  1-től indul). Ez csak tájékoztatás a szakaszhatárok megadásához, ne vedd
  bele a tartalmi értelmezésbe.
- Bontsd a szöveget egymást követő, egymást nem átfedő szakaszokra úgy, hogy
  minden szakasz egy összefüggő szabály-témát fedjen le (pl. egy fejezetet
  vagy alfejezetet).
- A szakaszok együttesen fedjék le a teljes szöveget: az első szakasz
  startLine=1-gyel kezdődjön, az utolsó a szöveg utolsó sorával érjen véget,
  ne legyen kihagyott vagy átfedő sor a szakaszok között.
- Egy szakasz ne legyen túl rövid (pár soros) vagy túl hosszú (több száz
  soros) — törekedj kb. 20-60 soros szakaszokra, kivéve ha egy témakör ennél
  lényegesen rövidebb vagy hosszabb.
</rules>`;

// Az "olcsó modell" a kért második chunkolási stratégiához: egy kis Claude
// modell jelöli ki a szemantikus szakaszhatárokat (structured output), majd
// ezek alapján vágjuk ki a chunkokat az eredeti szövegből.
export async function chunkLlmSemantic(
  fileName: string,
  text: string,
  client: Anthropic = getAnthropicClient(),
): Promise<ChunkingResult> {
  const lines = text.split('\n');
  const numberedText = lines.map((line, index) => `${index + 1}: ${line}`).join('\n');

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: numberedText }],
    output_config: { format: zodOutputFormat(sectionsSchema) },
  });

  const tokensUsed = (response.usage.input_tokens ?? 0) + response.usage.output_tokens;

  if (!response.parsed_output) {
    throw new Error(`Nem sikerült szemantikus szakaszhatárokat kinyerni (${fileName}).`);
  }

  const chunks: Chunk[] = response.parsed_output.sections.map((section) => {
    const endLine = Math.min(section.endLine, lines.length);

    return {
      fileName,
      startLine: section.startLine,
      endLine,
      text: lines.slice(section.startLine - 1, endLine).join('\n'),
    };
  });

  return { chunks, tokensUsed };
}
