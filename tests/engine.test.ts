import { mkdtemp, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import { runPromptimize } from "../src/engine";
import { buildProviderChain } from "../src/providers";

describe("runPromptimize", () => {
  test("does not inflate tokens for command quick-reference regression fixture", async () => {
    const root = await mkdtemp(join(tmpdir(), "promptimize-"));
    const docPath = join(root, "commands-quick-ref.md");
    await Bun.write(
      docPath,
      `# Agent-browser developer workflow quick reference

Use this as a condensed reference focused on verification, debugging, and UI understanding.

## Key flags

- --session, --session-name
- --headed
- --json
- --full
- --annotate
- --cdp
- --auto-connect
- --color-scheme
- --content-boundaries
- --max-output
- --debug
- --allow-file-access
- --download-path

## Key environment variables

- AGENT_BROWSER_HEADED
- AGENT_BROWSER_JSON
- AGENT_BROWSER_DEBUG
- AGENT_BROWSER_DEFAULT_TIMEOUT
- AGENT_BROWSER_CONTENT_BOUNDARIES
- AGENT_BROWSER_MAX_OUTPUT
- AGENT_BROWSER_COLOR_SCHEME
- AGENT_BROWSER_AUTO_CONNECT
`,
    );

    const result = await runPromptimize(
      {
        dryRun: true,
        inPlace: false,
        format: "json",
        ai: false,
        inputPath: resolve(docPath),
      },
      buildProviderChain(false),
    );

    expect(result.files[0]?.classification).toBe("reference");
    expect(result.files[0]?.changed).toBeFalse();
    expect(result.files[0]?.metrics.tokenDelta).toBeLessThanOrEqual(0);
  });

  test("processes skill directory recursively in dry-run", async () => {
    const root = await mkdtemp(join(tmpdir(), "promptimize-"));
    const skillDir = join(root, "my-skill");
    const refsDir = join(skillDir, "references");
    await mkdir(refsDir, { recursive: true });

    await Bun.write(
      join(skillDir, "SKILL.md"),
      `---\nname: my-skill\ndescription: demo\n---\nYou should simply follow this guidance.\n`,
    );
    await Bun.write(join(refsDir, "api.md"), "API reference with endpoint parameters.\n");

    const result = await runPromptimize(
      {
        dryRun: true,
        inPlace: false,
        format: "json",
        ai: false,
        inputPath: resolve(skillDir),
      },
      buildProviderChain(false),
    );

    expect(result.totals.filesScanned).toBe(2);
    expect(result.files.some((file) => file.sourcePath.endsWith("SKILL.md"))).toBeTrue();
    expect(result.files.some((file) => file.outputPath.includes("-optimized"))).toBeTrue();
    expect(result.totals.providerUsage.local).toBe(2);
    expect(result.totals.providerUsage.credentialed).toBe(0);
    expect(result.totals.providerUsage.fallbacks).toBe(0);
  });

  test("reports fallback provider usage when AI call fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "promptimize-"));
    const docPath = join(root, "guide.md");
    await Bun.write(docPath, "You should keep this rule.\n");

    process.env.PROMPTIMIZE_AI_KEY = "test-key";
    const provider = buildProviderChain(true, async () => {
      throw new Error("simulated ai outage");
    });

    const result = await runPromptimize(
      {
        dryRun: true,
        inPlace: false,
        format: "json",
        ai: true,
        inputPath: resolve(docPath),
      },
      provider,
    );

    expect(result.files[0]?.provider.selected).toBe("local-rule-agent");
    expect(result.files[0]?.provider.fallbackUsed).toBeTrue();
    expect(result.files[0]?.provider.fallbackFrom).toBe("credentialed-agent");
    expect(result.totals.providerUsage.credentialed).toBe(0);
    expect(result.totals.providerUsage.local).toBe(1);
    expect(result.totals.providerUsage.fallbacks).toBe(1);

    delete process.env.PROMPTIMIZE_AI_KEY;
  });
});
