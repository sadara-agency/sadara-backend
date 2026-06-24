import type { ChatArgs, ProviderResponse } from "../assistant.types";

/**
 * Single swappable interface for any chat model backend.
 *
 * Implementations: {@link OpenAICompatibleProvider} (default — Ollama / any
 * OpenAI-compatible endpoint, used for KSA PDPL-compliant local inference) and
 * {@link AnthropicProvider}. The provider is chosen at runtime by the factory
 * in `provider/index.ts` from `env.ai.provider`; the agent loop never names a
 * provider directly.
 */
export interface AIProvider {
  chat(args: ChatArgs): Promise<ProviderResponse>;
}
