import { env } from "@config/env";
import type { AIProvider } from "./AIProvider";
import { OpenAICompatibleProvider } from "./OpenAICompatibleProvider";
import { AnthropicProvider } from "./AnthropicProvider";

export type { AIProvider } from "./AIProvider";

/**
 * Resolve the configured chat provider. Selection is purely env-driven
 * (`AI_PROVIDER`), defaulting to the local OpenAI-compatible endpoint for PDPL
 * compliance. Missing credentials surface as AppError(501) from inside the
 * provider's first `chat()` call, mirroring the existing `llm.ts` behaviour.
 */
export function getProvider(): AIProvider {
  switch (env.ai.provider) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
    default:
      return new OpenAICompatibleProvider();
  }
}
