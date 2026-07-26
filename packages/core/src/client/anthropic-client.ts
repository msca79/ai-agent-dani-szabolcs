import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env['ANTHROPIC_API_KEY'];

    if (!apiKey) {
      throw new Error('Hiányzik az ANTHROPIC_API_KEY környezeti változó.');
    }

    anthropicClient = new Anthropic({ apiKey });
  }

  return anthropicClient;
}
