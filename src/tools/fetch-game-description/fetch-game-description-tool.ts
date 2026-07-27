import type Anthropic from '@anthropic-ai/sdk';
import { fetchGameDescriptionInputSchema } from './fetch-game-description-input';

export const fetchGameDescriptionTool: Anthropic.Tool = {
  name: 'fetchGameDescription',
  description:
    '[MOCK] Játék leírásának lekérése külső forrásból (pl. BoardGameGeek) a játék neve alapján. ' +
    'Egyelőre helyettesítő (mock) adatot ad vissza — a valós külső integráció még nincs bekötve.',
  input_schema: {
    type: 'object',
    properties: {
      gameName: { type: 'string', description: 'A játék neve, amelynek leírását le szeretnéd kérni.' },
      bggId: { type: ['number', 'null'], description: 'BoardGameGeek azonosító, ha ismert (opcionális).' },
    },
    required: ['gameName'],
  },
};

// MOCK — a valós BoardGameGeek- (vagy más külső) integráció még nincs
// megírva. Ez a tool addig egy determinisztikus, sablonos leírást ad vissza,
// hogy az ingest-agent és az upsertProduct tool összekapcsolása már most
// tesztelhető/bemutatható legyen; a `source: 'mock'` jelzi a hívónak, hogy
// ez nem valós adat.
export async function executeFetchGameDescription(
  rawInput: unknown,
): Promise<{ description: string; source: 'mock' }> {
  const { gameName } = fetchGameDescriptionInputSchema.parse(rawInput);

  return {
    description: `${gameName} — automatikus leírás egyelőre nem érhető el (mock adat, a valós BoardGameGeek-integráció még nincs bekötve).`,
    source: 'mock',
  };
}
