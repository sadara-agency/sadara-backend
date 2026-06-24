/**
 * Provider-agnostic chat types.
 *
 * The agent loop and tools operate ONLY on these normalized shapes. Each
 * concrete AIProvider implementation is responsible for translating to/from
 * its wire format (Anthropic Messages API, OpenAI-compatible chat/completions,
 * etc.) in BOTH directions. Nothing outside `provider/` should ever touch
 * provider-specific JSON.
 */

export type ChatRole = "user" | "assistant";

/** A minimal JSON-Schema object describing a tool's input. */
export interface JsonSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JsonSchemaProperty {
  type: "string" | "number" | "integer" | "boolean";
  description?: string;
  enum?: string[];
}

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  /** Provider-issued id correlating this call to its result. */
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  toolUseId: string;
  /** Stringified result fed back to the model. */
  content: string;
  isError: boolean;
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

export interface ChatMessage {
  role: ChatRole;
  content: ContentBlock[];
}

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

export type StopReason = "end" | "tool_use" | "max_tokens";

export interface ProviderResponse {
  /** The assistant message produced this turn (text and/or tool_use blocks). */
  message: ChatMessage;
  stopReason: StopReason;
}

export interface ChatArgs {
  system: string;
  messages: ChatMessage[];
  tools: ToolDef[];
  maxTokens: number;
}
