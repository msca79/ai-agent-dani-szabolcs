import OpenAI from 'openai';

let openaiClient: OpenAI | undefined;

export function getOpenAiClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env['OPENAI_API_KEY'];

    if (!apiKey) {
      throw new Error('Hiányzik az OPENAI_API_KEY környezeti változó.');
    }

    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}
