import { env } from "@config/env";
import type { AuthUser } from "@shared/types";
import type { AIProvider } from "./provider";
import { getProvider } from "./provider";
import { buildSystemPrompt } from "./assistant.prompt";
import { toolDefs, executeTool } from "./tools/registry";
import type {
  ChatMessage,
  ContentBlock,
  ToolUseBlock,
} from "./assistant.types";

const MAX_ITERATIONS = 6;

const CANNOT_COMPLETE =
  "I couldn't complete that within the allowed number of steps. Please try rephrasing or narrowing your request.";

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface RunChatArgs {
  message: string;
  history: ChatHistoryItem[];
  user: AuthUser;
  /** Injectable for tests; defaults to the env-configured provider. */
  provider?: AIProvider;
}

export interface RunChatResult {
  reply: string;
  iterations: number;
}

/**
 * Run the read-only agent loop. Client-supplied `history` is stateless (Phase
 * 1 stores no conversation). Tool calls execute through the registry, which
 * enforces the caller's RBAC + field-access. The loop is provider-agnostic.
 */
export async function runChat({
  message,
  history,
  user,
  provider = getProvider(),
}: RunChatArgs): Promise<RunChatResult> {
  const system = buildSystemPrompt();
  const messages: ChatMessage[] = history.map((h) => ({
    role: h.role,
    content: [{ type: "text", text: h.content }],
  }));
  messages.push({ role: "user", content: [{ type: "text", text: message }] });

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const resp = await provider.chat({
      system,
      messages,
      tools: toolDefs,
      maxTokens: env.ai.maxTokens,
    });
    messages.push(resp.message);

    const toolUses = resp.message.content.filter(
      (b): b is ToolUseBlock => b.type === "tool_use",
    );

    if (toolUses.length === 0) {
      return { reply: extractText(resp.message.content), iterations: i + 1 };
    }

    const results: ContentBlock[] = [];
    for (const call of toolUses) {
      results.push(await executeTool(call.id, call.name, call.input, user));
    }
    // Tool results are sent back as a user-role turn (Anthropic convention);
    // the OpenAI provider re-splits them into `role: "tool"` messages.
    messages.push({ role: "user", content: results });
  }

  // Loop exhausted — surface any last assistant text, else a graceful message.
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const text = lastAssistant ? extractText(lastAssistant.content) : "";
  return { reply: text || CANNOT_COMPLETE, iterations: MAX_ITERATIONS };
}

function extractText(content: ContentBlock[]): string {
  return content
    .filter(
      (b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text",
    )
    .map((b) => b.text)
    .join("\n")
    .trim();
}
