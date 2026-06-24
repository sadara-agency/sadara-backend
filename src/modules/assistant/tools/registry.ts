import type { AuthUser } from "@shared/types";
import { logger } from "@config/logger";
import type { ToolDef, ToolResultBlock } from "../assistant.types";
import { readTools } from "./readTools";
import type { Tool } from "./types";

const tools: Tool[] = readTools;
const toolMap = new Map<string, Tool>(tools.map((t) => [t.name, t]));

/** Tool definitions advertised to the model provider. */
export const toolDefs: ToolDef[] = tools.map((t) => ({
  name: t.name,
  description: t.description,
  inputSchema: t.jsonSchema,
}));

/**
 * Execute a tool call on behalf of `user`. ALL failures — unknown tool, invalid
 * arguments, permission denial, service error — are returned as a
 * `tool_result` with `isError: true` so the model can recover or explain to the
 * user. Nothing here throws; the agent loop keeps full control of flow.
 */
export async function executeTool(
  toolUseId: string,
  name: string,
  rawArgs: unknown,
  user: AuthUser,
): Promise<ToolResultBlock> {
  const tool = toolMap.get(name);
  if (!tool) {
    return error(toolUseId, `Unknown tool "${name}".`);
  }

  const parsed = tool.inputSchema.safeParse(rawArgs);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return error(toolUseId, `Invalid arguments for ${name}: ${detail}`);
  }

  try {
    const result = await tool.handler(parsed.data, user);
    return {
      type: "tool_result",
      toolUseId,
      content: JSON.stringify(result ?? null),
      isError: false,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Tool execution failed";
    logger.warn("Assistant tool error", { tool: name, error: message });
    return error(toolUseId, message);
  }
}

function error(toolUseId: string, content: string): ToolResultBlock {
  return { type: "tool_result", toolUseId, content, isError: true };
}
