import type { ZodType } from "zod";
import type { AuthUser } from "@shared/types";

/**
 * A read tool the assistant may call. Each tool wraps an EXISTING service
 * function and is responsible for enforcing the same RBAC + field-access the
 * normal API applies, scoped to `user`. Tools must never touch the DB directly.
 */
export interface Tool<I = unknown> {
  name: string;
  description: string;
  /** Zod schema validating the model-supplied arguments. */
  inputSchema: ZodType<I>;
  /** JSON-Schema sent to the provider (model sees this shape). */
  jsonSchema: import("../assistant.types").JsonSchema;
  handler(args: I, user: AuthUser): Promise<unknown>;
}
