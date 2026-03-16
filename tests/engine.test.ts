import { mkdtemp, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import { runPromptimize } from "../src/engine";
import { buildProviderChain } from "../src/providers";

describe("runPromptimize", () => {
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
  });
});
