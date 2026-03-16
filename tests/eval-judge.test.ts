import { describe, expect, test } from "bun:test";
import { createOpenAiJudgeCall } from "../src/eval-judge";

describe("openai-compatible eval judge call", () => {
  test("retries once after transient failure", async () => {
    process.env.PROMPTIMIZE_BASE_URL = "http://localhost:1234/v1";
    process.env.PROMPTIMIZE_AI_RETRIES = "1";

    try {
      let callCount = 0;
      const mockFetch = (async () => {
        callCount += 1;
        if (callCount === 1) {
          return new Response("retry", { status: 503 });
        }

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    overall: 80,
                    clarity: 81,
                    structure: 79,
                    actionability: 82,
                    preservation: 83,
                    rationale: "retry success",
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        );
      }) as unknown as typeof fetch;

      const judgeCall = createOpenAiJudgeCall(mockFetch);
      const result = await judgeCall({
        filePath: "/tmp/doc.md",
        classification: "guidance",
        originalBody: "before",
        candidateBody: "after",
      });

      expect(result.overall).toBe(80);
      expect(callCount).toBe(2);
    } finally {
      delete process.env.PROMPTIMIZE_BASE_URL;
      delete process.env.PROMPTIMIZE_AI_RETRIES;
    }
  });

  test("times out and fails after configured retries", async () => {
    process.env.PROMPTIMIZE_BASE_URL = "http://localhost:1234/v1";
    process.env.PROMPTIMIZE_AI_TIMEOUT_MS = "10";
    process.env.PROMPTIMIZE_AI_RETRIES = "1";

    try {
      let callCount = 0;
      const mockFetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
        callCount += 1;
        await new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        });
        return new Response("never", { status: 200 });
      }) as unknown as typeof fetch;

      const judgeCall = createOpenAiJudgeCall(mockFetch);
      let errorMessage = "";
      try {
        await judgeCall({
          filePath: "/tmp/doc.md",
          classification: "guidance",
          originalBody: "before",
          candidateBody: "after",
        });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      expect(errorMessage).toContain("failed after 2 attempt(s)");
      expect(callCount).toBe(2);
    } finally {
      delete process.env.PROMPTIMIZE_BASE_URL;
      delete process.env.PROMPTIMIZE_AI_TIMEOUT_MS;
      delete process.env.PROMPTIMIZE_AI_RETRIES;
    }
  });
});
