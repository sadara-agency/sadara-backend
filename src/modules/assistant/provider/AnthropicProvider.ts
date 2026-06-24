import { env } from "@config/env";
import { AppError } from "@middleware/errorHandler";
import { logger } from "@config/logger";
import type { AIProvider } from "./AIProvider";
import type {
  ChatArgs,
  ChatMessage,
  ContentBlock,
  ProviderResponse,
  StopReason,
} from "../assistant.types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// ── Anthropic Messages API wire types (subset we use) ──

type AnthropicBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    };

interface AnthropicResponse {
  content: AnthropicBlock[];
  stop_reason: string;
}

/**
 * Provider for the Anthropic Messages API. Swappable alternative to the default
 * OpenAI-compatible/local provider — selected via `AI_PROVIDER=anthropic`.
 *
 * Anthropic tool-calling wire format: assistant `tool_use` blocks live inline in
 * `content`; tool results are sent back as a USER message containing
 * `tool_result` blocks. Tool schemas go under `tools[].input_schema`.
 */
export class AnthropicProvider implements AIProvider {
  async chat(args: ChatArgs): Promise<ProviderResponse> {
    const apiKey = env.ai.anthropicApiKey;
    if (!apiKey) {
      throw new AppError(
        "AI not configured — set ANTHROPIC_API_KEY to use the Anthropic provider",
        501,
      );
    }

    const body = {
      model: env.ai.model,
      max_tokens: args.maxTokens,
      system: args.system,
      messages: args.messages.map((m) => ({
        role: m.role,
        content: this.toWireBlocks(m.content),
      })),
      tools: args.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      })),
    };

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      logger.error("Anthropic API error", {
        status: response.status,
        body: errText,
      });
      throw new AppError(`AI provider returned ${response.status}`, 502);
    }

    const data = (await response.json()) as AnthropicResponse;
    return {
      message: {
        role: "assistant",
        content: this.fromWireBlocks(data.content),
      },
      stopReason: this.mapStopReason(data.stop_reason),
    };
  }

  private toWireBlocks(blocks: ContentBlock[]): AnthropicBlock[] {
    return blocks.map((b) => {
      if (b.type === "text") return { type: "text", text: b.text };
      if (b.type === "tool_use") {
        return { type: "tool_use", id: b.id, name: b.name, input: b.input };
      }
      return {
        type: "tool_result",
        tool_use_id: b.toolUseId,
        content: b.content,
        is_error: b.isError,
      };
    });
  }

  private fromWireBlocks(blocks: AnthropicBlock[]): ContentBlock[] {
    const out: ContentBlock[] = [];
    for (const b of blocks) {
      if (b.type === "text") out.push({ type: "text", text: b.text });
      else if (b.type === "tool_use") {
        out.push({ type: "tool_use", id: b.id, name: b.name, input: b.input });
      }
      // Anthropic never emits tool_result from the assistant; ignore if present.
    }
    return out;
  }

  private mapStopReason(stopReason: string): StopReason {
    if (stopReason === "tool_use") return "tool_use";
    if (stopReason === "max_tokens") return "max_tokens";
    return "end";
  }
}
