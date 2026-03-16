import { describe, expect, test } from "bun:test";
import {
  buildProviderChain,
  createOpenAiOptimizeCall,
  CredentialedEnhancementProvider,
  ProviderChain,
} from "../src/providers";

describe("provider abstraction", () => {
  test("falls back when credentialed provider unavailable", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.PROMPTIMIZE_AI_KEY;

    const credentialed = new CredentialedEnhancementProvider(async () => "credentialed");
    const fallback = buildProviderChain(false);
    const chain = new ProviderChain([credentialed, fallback]);

    const out = await chain.enhance({
      filePath: "/tmp/doc.md",
      body: "source",
      classification: "guidance",
    });

    expect(out.body).toBe("source");
    expect(out.selected).toBe("local-rule-agent");
    expect(out.fallbackUsed).toBeFalse();
  });

  test("uses mocked AI call when credentials exist", async () => {
    process.env.PROMPTIMIZE_AI_KEY = "test-key";
    const provider = buildProviderChain(true, async (input) => `${input.body}\n\n<!-- ai -->\n`);

    const out = await provider.enhance({
      filePath: "/tmp/doc.md",
      body: "base",
      classification: "guidance",
    });

    expect(out.body).toContain("<!-- ai -->");
    expect(out.selected).toBe("credentialed-agent");
    delete process.env.PROMPTIMIZE_AI_KEY;
  });

  test("uses mocked AI call when base url exists without API key", async () => {
    process.env.PROMPTIMIZE_BASE_URL = "http://127.0.0.1:1234/v1";
    delete process.env.PROMPTIMIZE_AI_KEY;
    delete process.env.OPENAI_API_KEY;

    const provider = buildProviderChain(true, async () => "credentialed-base-url");
    const out = await provider.enhance({
      filePath: "/tmp/doc.md",
      body: "base",
      classification: "guidance",
    });

    expect(out.body).toBe("credentialed-base-url");
    expect(out.selected).toBe("credentialed-agent");
    delete process.env.PROMPTIMIZE_BASE_URL;
  });

  test("falls back to local provider when AI call throws", async () => {
    process.env.PROMPTIMIZE_AI_KEY = "test-key";
    const provider = buildProviderChain(true, async () => {
      throw new Error("simulated failure");
    });

    const out = await provider.enhance({
      filePath: "/tmp/doc.md",
      body: "base",
      classification: "guidance",
    });

    expect(out.body).toBe("base");
    expect(out.selected).toBe("local-rule-agent");
    expect(out.fallbackUsed).toBeTrue();
    expect(out.fallbackFrom).toBe("credentialed-agent");
    delete process.env.PROMPTIMIZE_AI_KEY;
  });

  test("openai-compatible optimize call trims output and skips auth header when no key", async () => {
    process.env.PROMPTIMIZE_BASE_URL = "http://localhost:1234/v1";
    process.env.PROMPTIMIZE_MODEL = "qwen/qwen3.5-9b";
    delete process.env.PROMPTIMIZE_AI_KEY;
    delete process.env.OPENAI_API_KEY;

    let capturedHeaders: HeadersInit | undefined;
    let capturedUrl = "";
    const mockFetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedHeaders = init?.headers;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "\n\noptimized markdown\n",
                reasoning_content: "internal chain-of-thought",
              },
            },
          ],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const llmCall = createOpenAiOptimizeCall(mockFetch);

    const out = await llmCall({
      filePath: "/tmp/doc.md",
      body: "source",
      classification: "guidance",
    });

    expect(capturedUrl).toBe("http://localhost:1234/v1/chat/completions");
    const headersRecord = toHeaderRecord(capturedHeaders);
    expect(headersRecord["Content-Type"]).toBe("application/json");
    expect(headersRecord.Authorization).toBeUndefined();
    expect(out).toBe("optimized markdown");

    delete process.env.PROMPTIMIZE_BASE_URL;
    delete process.env.PROMPTIMIZE_MODEL;
  });

  test("openai-compatible optimize call retries once after failure", async () => {
    process.env.PROMPTIMIZE_BASE_URL = "http://localhost:1234/v1";
    process.env.PROMPTIMIZE_AI_RETRIES = "1";

    try {
      let callCount = 0;
      const mockFetch = (async () => {
        callCount += 1;
        if (callCount === 1) {
          return new Response("retry", { status: 500 });
        }

        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "retried output" } }],
          }),
          { status: 200 },
        );
      }) as unknown as typeof fetch;

      const llmCall = createOpenAiOptimizeCall(mockFetch);
      const out = await llmCall({
        filePath: "/tmp/doc.md",
        body: "source",
        classification: "guidance",
      });

      expect(out).toBe("retried output");
      expect(callCount).toBe(2);
    } finally {
      delete process.env.PROMPTIMIZE_BASE_URL;
      delete process.env.PROMPTIMIZE_AI_RETRIES;
    }
  });

  test("openai-compatible optimize call times out and reports exhausted retries", async () => {
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

      const llmCall = createOpenAiOptimizeCall(mockFetch);
      let errorMessage = "";
      try {
        await llmCall({
          filePath: "/tmp/doc.md",
          body: "source",
          classification: "guidance",
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

function toHeaderRecord(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}
