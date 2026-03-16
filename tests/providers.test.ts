import { describe, expect, test } from "bun:test";
import { buildProviderChain, CredentialedEnhancementProvider, ProviderChain } from "../src/providers";

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

    expect(out).toBe("source");
  });

  test("uses mocked AI call when credentials exist", async () => {
    process.env.PROMPTIMIZE_AI_KEY = "test-key";
    const provider = buildProviderChain(true, async (input) => `${input.body}\n\n<!-- ai -->\n`);

    const out = await provider.enhance({
      filePath: "/tmp/doc.md",
      body: "base",
      classification: "guidance",
    });

    expect(out).toContain("<!-- ai -->");
    delete process.env.PROMPTIMIZE_AI_KEY;
  });
});
