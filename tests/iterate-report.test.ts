import { describe, expect, test } from "bun:test";
import { buildIterationReport, formatIterationText } from "../src/iterate-report";
import type { CandidateScore, IterationRunResult, RubricScore } from "../src/types";

describe("iterate report", () => {
  test("builds structured summary and includes result store path", () => {
    const train: IterationRunResult[] = [
      {
        filePath: "benchmarks/fixtures/guidance-a.md",
        classification: "guidance",
        baselineScore: makeScore(70),
        finalScore: makeScore(73),
        finalBody: "candidate",
        totalIter: 2,
        converged: false,
        stopReason: "max iterations reached",
        iterations: [
          makeIterationRecord("benchmarks/fixtures/guidance-a.md", "guidance", 1, true),
          makeIterationRecord("benchmarks/fixtures/guidance-a.md", "guidance", 2, false),
        ],
      },
      {
        filePath: "benchmarks/fixtures/reference-a.md",
        classification: "reference",
        baselineScore: makeScore(72),
        finalScore: makeScore(72),
        finalBody: "candidate",
        totalIter: 1,
        converged: true,
        stopReason: "plateau detected",
        iterations: [makeIterationRecord("benchmarks/fixtures/reference-a.md", "reference", 1, false)],
      },
    ];

    const holdOut = [
      {
        filePath: "benchmarks/fixtures/discipline-a.md",
        classification: "discipline" as const,
        score: makeScore(80),
      },
    ];

    const report = buildIterationReport({ train, holdOut }, "benchmarks/iterate-results.ndjson");
    expect(report.summary.improvedFiles).toBe(1);
    expect(report.summary.resultFile).toBe("benchmarks/iterate-results.ndjson");
    expect(report.byClass.guidance.avgRubricDelta).toBe(3);
    expect(report.holdOut.avgRubricOverall).toBe(80);

    const text = formatIterationText({ train, holdOut }, "benchmarks/iterate-results.ndjson");
    expect(text).toContain("1 of 2 files improved, 80 hold-out score avg.");
    expect(text).toContain("result store: benchmarks/iterate-results.ndjson");
  });
});

function makeScore(overall: number): CandidateScore {
  return {
    rubric: makeRubric(overall),
    metrics: {
      tokenEstimate: 10,
      headingCount: 1,
      listItemCount: 1,
      codeFenceCount: 0,
      linkCount: 0,
      imperativeCount: 1,
      avgSentenceLength: 10,
    },
    retention: 100,
    composite: overall,
    tokenCount: 10,
  };
}

function makeRubric(overall: number): RubricScore {
  return {
    provider: "local-rubric-judge",
    overall,
    clarity: overall,
    structure: overall,
    actionability: overall,
    preservation: 100,
    rationale: "test",
  };
}

function makeIterationRecord(
  filePath: string,
  classification: "guidance" | "reference",
  iter: number,
  accepted: boolean,
) {
  return {
    iter,
    filePath,
    classification,
    candidateBody: "candidate",
    scoreBefore: makeScore(70),
    scoreAfter: makeScore(71),
    accepted,
    acceptanceReason: accepted ? "all criteria met" : "rubric delta below threshold",
    aiCallMade: false,
    durationMs: 1,
  };
}
