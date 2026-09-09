import 'server-only';
import { config } from '../config';
import { getRepo } from '../db';
import { GeminiProvider } from './gemini';
import { NoAiProvider, type AiProvider } from './provider';

/**
 * The provider, resolved once. Falls back to the no-op provider whenever there
 * is no key, which is a fully supported way to run this app rather than an
 * error state.
 */
let provider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (!provider) {
    const key = config.ai.geminiApiKey;
    if (config.ai.provider === 'gemini' && key) {
      const repo = getRepo();
      provider = new GeminiProvider(key, (kind) => {
        repo.bumpQuota(kind);
      });
    } else {
      provider = new NoAiProvider();
    }
  }
  return provider;
}

export type { AiProvider } from './provider';
