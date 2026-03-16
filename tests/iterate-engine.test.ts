import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import { runIteration } from "../src/iterate-engine";
import { CandidateScorer } from "../src/iterate-scorer";
import type { EnhancementProvider, IterationBudget, IterationRecord, ResultStore, RubricJudgeInput, RubricScore } from "../src/types";

describe("runIteration", () => {
  test("runs until max iterations and appends one record per iteration", async () => {
    const root = await mkdtemp(join(tmpdir(), "promptimize-iterate-"));
    const filePath = join(root, "guidance-test.md");
    const original = "# Guide\n\nUse tests.\n";
    await Bun.write(filePath, original);

    const seenInputs: RubricJudgeInput[] = [];
    const scorer = new CandidateScorer({
      name: "test-judge",
      isAvailable: () => true,
      score: async (input): Promise<RubricScore> => {
        seenInputs.push(input);
        const mapping: Record<string, number> = {
          [original]: 70,
          "candidate-1": 72,
          "candidate-2": 71,
          "candidate-3": 74,
        };
        const overall = mapping[input.candidateBody] ?? 60;
        return {
          provider: "test-judge",
          overall,
          clarity: overall,
          structure: overall,
          actionability: overall,
          preservation: 90,
          rationale: "test",
        };
      },
    });

    let iter = 0;
    const provider: EnhancementProvider = {
      name: "local-rule-agent",
      isAvailable: () => true,
      enhance: async () => {
        iter += 1;
        return {
          body: `candidate-${iter}`,
          attempted: ["local-rule-agent"],
          selected: "local-rule-agent",
          fallbackUsed: false,
        };
      },
    };

    const appended: IterationRecord[] = [];
    const store: ResultStore = {
      append: async (record) => {
        appended.push(record);
      },
      loadHistory: async () => appended,
    };

    const budget: IterationBudget = {
      maxIterations: 3,
      maxAiCallsPerFile: 10,
      plateauWindowSize: 10,
      plateauMinDelta: 0.1,
      resultFile: join(root, "iterate.ndjson"),
    };

    const run = await runIteration(
      filePath,
      provider,
      scorer,
      {
        minRubricDelta: 1,
        minRetentionFloor: 75,
        maxTokenInflation: 100,
      },
      budget,
      store,
    );

    expect(appended.length).toBe(3);
    expect(run.totalIter).toBe(3);
    expect(run.stopReason).toContain("max iterations");

    expect(run.finalBody).toBe("candidate-3");
    expect(run.finalScore.rubric.overall).toBe(74);
    expect(run.iterations[1]?.accepted).toBeFalse();

    const iterationInputs = seenInputs.slice(1);
    for (const input of iterationInputs) {
      expect(input.originalBody).toBe(original);
    }

    await rm(root, { recursive: true, force: true });
  });

  test("enforces ai call budget before provider call and falls back to local candidate", async () => {
    const root = await mkdtemp(join(tmpdir(), "promptimize-iterate-ai-budget-"));
    const filePath = join(root, "guidance-budget.md");
    const original = "# Guide\n\nKeep details.\n";
    await Bun.write(filePath, original);

    const scorer = new CandidateScorer({
      name: "test-judge",
      isAvailable: () => true,
      score: async (input): Promise<RubricScore> => {
        const overall = input.candidateBody.includes("ai-candidate") ? 75 : 70;
        return {
          provider: "test-judge",
          overall,
          clarity: overall,
          structure: overall,
          actionability: overall,
          preservation: 90,
          rationale: "test",
        };
      },
    });

    let aiEnhanceCalls = 0;
    const provider: EnhancementProvider = {
      name: "provider-chain",
      isAvailable: () => true,
      enhance: async () => {
        aiEnhanceCalls += 1;
        return {
          body: `ai-candidate-${aiEnhanceCalls}`,
          attempted: ["credentialed-agent"],
          selected: "credentialed-agent",
          fallbackUsed: false,
        };
      },
    };

    const appended: IterationRecord[] = [];
    const store: ResultStore = {
      append: async (record) => {
        appended.push(record);
      },
      loadHistory: async () => appended,
    };

    const budget: IterationBudget = {
      maxIterations: 3,
      maxAiCallsPerFile: 1,
      plateauWindowSize: 10,
      plateauMinDelta: 0.1,
      resultFile: join(root, "iterate.ndjson"),
    };

    const run = await runIteration(
      filePath,
      provider,
      scorer,
      {
        minRubricDelta: 0,
        minRetentionFloor: 75,
        maxTokenInflation: 100,
      },
      budget,
      store,
    );

    expect(run.totalIter).toBe(3);
    expect(aiEnhanceCalls).toBe(1);
    expect(appended.map((record) => record.aiCallMade)).toEqual([true, false, false]);

    await rm(root, { recursive: true, force: true });
  });
});
