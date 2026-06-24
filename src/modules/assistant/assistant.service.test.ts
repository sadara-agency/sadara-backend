jest.mock("./tools/registry", () => ({
  toolDefs: [],
  executeTool: jest.fn().mockResolvedValue({
    type: "tool_result",
    toolUseId: "t1",
    content: "{}",
    isError: false,
  }),
}));
jest.mock("@config/logger", () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import type { AuthUser } from "@shared/types";
import type { AIProvider } from "./provider";
import type { ProviderResponse } from "./assistant.types";
import { runChat } from "./assistant.service";

const USER: AuthUser = {
  id: "user-1",
  email: "a@sadara.com",
  fullName: "Tester",
  role: "Manager",
};

beforeEach(() => jest.clearAllMocks());

describe("runChat agent loop", () => {
  it("returns the assistant text when no tool is called", async () => {
    const provider: AIProvider = {
      chat: jest.fn(
        async (): Promise<ProviderResponse> => ({
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Hello" }],
          },
          stopReason: "end",
        }),
      ),
    };

    const result = await runChat({
      message: "hi",
      history: [],
      user: USER,
      provider,
    });

    expect(result.reply).toBe("Hello");
    expect(result.iterations).toBe(1);
    expect(provider.chat).toHaveBeenCalledTimes(1);
  });

  it("stops at MAX_ITERATIONS when the model never stops calling tools", async () => {
    const provider: AIProvider = {
      chat: jest.fn(
        async (): Promise<ProviderResponse> => ({
          message: {
            role: "assistant",
            content: [
              {
                type: "tool_use",
                id: "t1",
                name: "get_player_by_id",
                input: { id: "p1" },
              },
            ],
          },
          stopReason: "tool_use",
        }),
      ),
    };

    const result = await runChat({
      message: "loop forever",
      history: [],
      user: USER,
      provider,
    });

    expect(provider.chat).toHaveBeenCalledTimes(6);
    expect(result.iterations).toBe(6);
    expect(result.reply).toMatch(/couldn't complete/i);
  });

  it("feeds tool results back and returns the final answer", async () => {
    let turn = 0;
    const provider: AIProvider = {
      chat: jest.fn(async (): Promise<ProviderResponse> => {
        turn += 1;
        if (turn === 1) {
          return {
            message: {
              role: "assistant",
              content: [
                {
                  type: "tool_use",
                  id: "t1",
                  name: "get_player_by_id",
                  input: { id: "p1" },
                },
              ],
            },
            stopReason: "tool_use",
          };
        }
        return {
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Done" }],
          },
          stopReason: "end",
        };
      }),
    };

    const result = await runChat({
      message: "look up p1",
      history: [],
      user: USER,
      provider,
    });

    expect(result.reply).toBe("Done");
    expect(result.iterations).toBe(2);
  });
});
