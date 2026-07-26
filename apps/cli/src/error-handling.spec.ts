import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import type { AskHandler } from './ask-handler';
import { withFriendlyErrors } from './error-handling';

function makeAuthenticationError(): Anthropic.AuthenticationError {
  return Object.create(Anthropic.AuthenticationError.prototype);
}

function makeRateLimitError(): Anthropic.RateLimitError {
  return Object.create(Anthropic.RateLimitError.prototype);
}

describe('withFriendlyErrors', () => {
  it('should pass through a successful answer unchanged', async () => {
    const handler: AskHandler = async (question) => `válasz: ${question}`;

    const wrapped = withFriendlyErrors(handler);

    expect(await wrapped('szia')).toEqual('válasz: szia');
  });

  it('should return a friendly message for AuthenticationError', async () => {
    const handler: AskHandler = async () => {
      throw makeAuthenticationError();
    };

    const wrapped = withFriendlyErrors(handler);

    expect(await wrapped('kérdés')).toContain('ANTHROPIC_API_KEY');
  });

  it('should return a friendly message for RateLimitError', async () => {
    const handler: AskHandler = async () => {
      throw makeRateLimitError();
    };

    const wrapped = withFriendlyErrors(handler);

    expect(await wrapped('kérdés')).toContain('Túl sok kérés');
  });

  it('should return a generic friendly message for any other error and log it', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler: AskHandler = async () => {
      throw new Error('valami váratlan');
    };

    const wrapped = withFriendlyErrors(handler);
    const answer = await wrapped('kérdés');

    expect(answer).toEqual('Váratlan hiba történt, részletek a naplóban.');
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
