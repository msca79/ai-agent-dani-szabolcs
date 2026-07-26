import Anthropic from '@anthropic-ai/sdk';
import type { AskHandler } from './ask-handler';

export function withFriendlyErrors(handler: AskHandler): AskHandler {
  return async (question) => {
    try {
      return await handler(question);
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        return 'Hiányzik vagy érvénytelen az ANTHROPIC_API_KEY.';
      }

      if (error instanceof Anthropic.RateLimitError) {
        return 'Túl sok kérés érkezett, próbáld később.';
      }

      console.error(error);

      return 'Váratlan hiba történt, részletek a naplóban.';
    }
  };
}
