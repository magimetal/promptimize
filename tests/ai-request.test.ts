import { describe, expect, test } from "bun:test";
import { runWithTimeoutAndRetry } from "../src/ai-request";

describe("runWithTimeoutAndRetry", () => {
  test("uses default retry policy when env overrides are unset", async () => {
    delete process.env.PROMPTIMIZE_AI_TIMEOUT_MS;
    delete process.env.PROMPTIMIZE_AI_RETRIES;

    let callCount = 0;
    let errorMessage = "";

    try {
      await runWithTimeoutAndRetry("default policy check", async () => {
        callCount += 1;
        throw new Error("forced failure");
      });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    expect(callCount).toBe(3);
    expect(errorMessage).toContain("failed after 3 attempt(s)");
  });
});
