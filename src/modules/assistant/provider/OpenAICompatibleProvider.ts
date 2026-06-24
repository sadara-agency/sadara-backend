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
  ToolUseBlock,
} from "../assistant.types";

// ── OpenAI chat/completions wire types (subset we use) ──

interface OpenAiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

interface OpenAiResponse {
  choices: Array<{
    message: { content: string | null; tool_calls?: OpenAiToolCall[] };
    finish_reason: string;
  }>;
}

/**
 * Provider for any OpenAI-compatible chat/completions endpoint — including a
 * local Ollama server (`/v1/chat/completions`). This is the DEFAULT provider so
 * data can stay on-prem for PDPL compliance.
 *
 * Tool-calling on the OpenAI wire differs from Anthropic:
 *   - assistant tool calls live in `message.tool_calls[]` with `function.arguments`
 *     as a JSON STRING (we parse it into a normalized object);
 *   - each tool result is its own `{ role: "tool", tool_call_id, content }` message;
 *   - tool schemas go under `tools[].function.parameters`.
 * All of that is contained here — the loop only sees normalized blocks.
 */
export class OpenAICompatibleProvider implements AIProvider {
  async chat(args: ChatArgs): Promise<ProviderResponse> {
    const baseUrl = env.ai.baseUrl;
    if (!baseUrl) {
      throw new AppError(
        "AI not configured — set AI_BASE_URL for the OpenAI-compatible/Ollama endpoint",
        501,
      );
    }

    const body = {
      model: env.ai.model,
      max_tokens: args.maxTokens,
      messages: this.toWireMessages(args.system, args.messages),
      tools: args.tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      })),
    };

    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (env.ai.apiKey) headers.authorization = `Bearer ${env.ai.apiKey}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      logger.error("OpenAI-compatible API error", {
        status: response.status,
        body: errText,
      });
      throw new AppError(`AI provider returned ${response.status}`, 502);
    }

    const data = (await response.json()) as OpenAiResponse;
    const choice = data.choices[0];
    if (!choice) throw new AppError("AI provider returned no choices", 502);

    return {
      message: this.fromWireMessage(choice.message),
      stopReason: this.mapStopReason(choice.finish_reason),
    };
  }

  /** Normalized history → OpenAI message array (system prepended). */
  private toWireMessages(
    system: string,
    messages: ChatMessage[],
  ): OpenAiMessage[] {
    const wire: OpenAiMessage[] = [{ role: "system", content: system }];

    for (const msg of messages) {
      // tool_result blocks become standalone { role: "tool" } messages.
      const toolResults = msg.content.filter(
        (b): b is Extract<ContentBlock, { type: "tool_result" }> =>
          b.type === "tool_result",
      );
      for (const tr of toolResults) {
        wire.push({
          role: "tool",
          tool_call_id: tr.toolUseId,
          content: tr.content,
        });
      }

      const text = msg.content
        .filter(
          (b): b is Extract<ContentBlock, { type: "text" }> =>
            b.type === "text",
        )
        .map((b) => b.text)
        .join("\n");

      const toolCalls: OpenAiToolCall[] = msg.content
        .filter((b): b is ToolUseBlock => b.type === "tool_use")
        .map((b) => ({
          id: b.id,
          type: "function",
          function: { name: b.name, arguments: JSON.stringify(b.input) },
        }));

      if (text || toolCalls.length > 0) {
        wire.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: text || null,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        });
      }
    }

    return wire;
  }

  /** OpenAI assistant message → normalized assistant ChatMessage. */
  private fromWireMessage(message: {
    content: string | null;
    tool_calls?: OpenAiToolCall[];
  }): ChatMessage {
    const content: ContentBlock[] = [];
    if (message.content) {
      content.push({ type: "text", text: message.content });
    }
    for (const call of message.tool_calls ?? []) {
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(call.function.arguments || "{}") as Record<
          string,
          unknown
        >;
      } catch {
        // Leave input empty; the tool's Zod parse will produce a clean error
        // result the model can react to.
        input = {};
      }
      content.push({
        type: "tool_use",
        id: call.id,
        name: call.function.name,
        input,
      });
    }
    return { role: "assistant", content };
  }

  private mapStopReason(finishReason: string): StopReason {
    if (finishReason === "tool_calls") return "tool_use";
    if (finishReason === "length") return "max_tokens";
    return "end";
  }
}
