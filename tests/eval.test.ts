import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { runEvaluation } from "../src/eval";
import { buildRubricJudge } from "../src/eval-judge";

const FIXTURE_PATH = resolveFixturePath();

function resolveFixturePath(): string {
  const sourcePath = resolve(import.meta.dir, "../benchmarks/fixtures");
  if (existsSync(sourcePath)) {
    return sourcePath;
  }

  const builtPath = resolve(import.meta.dir, "../../benchmarks/fixtures");
  return builtPath;
}

describe("evaluation harness", () => {
  test("produces deterministic and rubric outputs without credentials", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.PROMPTIMIZE_AI_KEY;

    const result = await runEvaluation({
      inputPath: FIXTURE_PATH,
      ai: false,
      format: "json",
    });

    expect(result.totals.filesScanned).toBeGreaterThanOrEqual(8);
    expect(result.files.length).toBe(result.totals.filesScanned);
    expect(result.totals.byClass.guidance.filesScanned).toBeGreaterThanOrEqual(3);
    expect(result.totals.byClass.collaborative.filesScanned).toBeGreaterThanOrEqual(2);
    expect(result.totals.byClass.discipline.filesScanned).toBeGreaterThanOrEqual(2);
    expect(result.totals.byClass.reference.filesScanned).toBeGreaterThanOrEqual(2);
    expect(result.totals.byClass.discipline.avgRubricDelta).toBeGreaterThanOrEqual(0);
    expect(result.totals.byClass.collaborative.avgRubricDelta).toBeGreaterThanOrEqual(0);
    expect(result.files.every((file) => file.rubricAfter.provider === "local-rubric-judge")).toBeTrue();
    expect(result.files.some((file) => file.changed)).toBeTrue();
    expect(result.totals.byClass.guidance.filesChanged).toBeGreaterThan(0);
    expect(result.totals.byClass.collaborative.filesChanged).toBeGreaterThan(0);
    expect(result.files.some((file) => file.deterministicCompositeDelta > 0)).toBeTrue();
    expect(result.files.some((file) => file.rubricDelta > 0)).toBeTrue();
    expect(Number.isFinite(result.totals.tokenDeltaPct)).toBeTrue();
  });

  test("uses credentialed judge when ai enabled and key exists", async () => {
    process.env.PROMPTIMIZE_AI_KEY = "test-key";
    const judge = buildRubricJudge(true, async () => ({
      overall: 88,
      clarity: 87,
      structure: 89,
      actionability: 90,
      preservation: 86,
      rationale: "mocked judge",
    }));

    const result = await runEvaluation(
      {
        inputPath: FIXTURE_PATH,
        ai: true,
        format: "json",
      },
      judge,
    );

    expect(result.files.every((file) => file.rubricAfter.provider === "credentialed-rubric-judge")).toBeTrue();
    delete process.env.PROMPTIMIZE_AI_KEY;
  });

  test("falls back to local judge when credentialed call fails", async () => {
    process.env.PROMPTIMIZE_AI_KEY = "test-key";
    const judge = buildRubricJudge(true, async () => {
      throw new Error("simulated failure");
    });

    const result = await runEvaluation(
      {
        inputPath: FIXTURE_PATH,
        ai: true,
        format: "json",
      },
      judge,
    );

    expect(result.files.every((file) => file.rubricAfter.provider === "local-rubric-judge")).toBeTrue();
    delete process.env.PROMPTIMIZE_AI_KEY;
  });
});
