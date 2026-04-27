import { createHash } from "crypto";
import { env } from "@config/env";
import { AppError } from "@middleware/errorHandler";
import { logger } from "@config/logger";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export interface LlmResult {
  content: string;
  model: string;
  promptHash: string;
}

/**
 * Call the Anthropic Messages API and return the text response with
 * provenance metadata (model id + SHA-256 hash of the full prompt).
 * Throws AppError(501) if ANTHROPIC_API_KEY is not configured.
 */
export async function callLlm(
  systemPrompt: string,
  userPrompt: string,
): Promise<LlmResult> {
  const apiKey = env.anthropic.apiKey;
  if (!apiKey) {
    throw new AppError(
      "LLM not configured — set ANTHROPIC_API_KEY to enable AI summaries",
      501,
    );
  }

  const promptHash = createHash("sha256")
    .update(systemPrompt + "\n\n" + userPrompt)
    .digest("hex");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    logger.error("Anthropic API error", {
      status: response.status,
      body: errText,
    });
    throw new AppError(`LLM API returned ${response.status}`, 502);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
    model: string;
  };

  const text = data.content.find((c) => c.type === "text")?.text ?? "";
  if (!text) throw new AppError("LLM returned empty response", 502);

  return { content: text, model: data.model, promptHash };
}
