import { describe, expect, test } from "bun:test";
import { evaluateAcceptance } from "../src/iterate-criteria";
import type { CandidateScore } from "../src/types";

const BASE_CRITERIA = {
  minRubricDelta: 0.5,
  minRetentionFloor: 75,
  maxTokenInflation: 0,
};

describe("evaluateAcceptance", () => {
  test("accepts when all criteria are met", () => {
    const before = createScore({ overall: 70, preservation: 80, tokenCount: 100 });
    const after = createScore({ overall: 71, preservation: 80, tokenCount: 100 });

    const result = evaluateAcceptance(before, after, BASE_CRITERIA, "guidance");
    expect(result.accepted).toBeTrue();
    expect(result.reason).toBe("all criteria met");
  });

  test("rejects rubric regression", () => {
    const before = createScore({ overall: 70, preservation: 80, tokenCount: 100 });
    const after = createScore({ overall: 69, preservation: 80, tokenCount: 100 });

    const result = evaluateAcceptance(before, after, BASE_CRITERIA, "guidance");
    expect(result.accepted).toBeFalse();
    expect(result.reason.length).toBeGreaterThan(0);
  });

  test("rejects when preservation is below floor", () => {
    const before = createScore({ overall: 70, preservation: 80, tokenCount: 100 });
    const after = createScore({ overall: 71, preservation: 70, tokenCount: 100 });

    const result = evaluateAcceptance(before, after, BASE_CRITERIA, "guidance");
    expect(result.accepted).toBeFalse();
    expect(result.reason.length).toBeGreaterThan(0);
  });

  test("rejects token inflation", () => {
    const before = createScore({ overall: 70, preservation: 80, tokenCount: 100 });
    const after = createScore({ overall: 71, preservation: 80, tokenCount: 101 });

    const result = evaluateAcceptance(before, after, BASE_CRITERIA, "guidance");
    expect(result.accepted).toBeFalse();
    expect(result.reason.length).toBeGreaterThan(0);
  });

  test("applies byClass override", () => {
    const before = createScore({ overall: 70, preservation: 80, tokenCount: 100 });
    const after = createScore({ overall: 71.5, preservation: 80, tokenCount: 100 });

    const result = evaluateAcceptance(
      before,
      after,
      {
        ...BASE_CRITERIA,
        byClass: {
          discipline: {
            minRubricDelta: 2,
          },
        },
      },
      "discipline",
    );

    expect(result.accepted).toBeFalse();
    expect(result.reason.length).toBeGreaterThan(0);
  });

  test("accepts zero rubric delta when class override allows it", () => {
    const before = createScore({ overall: 90, preservation: 92, tokenCount: 100 });
    const after = createScore({ overall: 90, preservation: 92, tokenCount: 100 });

    const result = evaluateAcceptance(
      before,
      after,
      {
        ...BASE_CRITERIA,
        byClass: {
          reference: {
            minRubricDelta: 0,
            minRetentionFloor: 90,
          },
        },
      },
      "reference",
    );

    expect(result.accepted).toBeTrue();
    expect(result.reason).toBe("all criteria met");
  });

  test("rejects when class-specific retention floor is not met", () => {
    const before = createScore({ overall: 90, preservation: 92, tokenCount: 100 });
    const after = createScore({ overall: 90.2, preservation: 84, tokenCount: 100 });

    const result = evaluateAcceptance(
      before,
      after,
      {
        ...BASE_CRITERIA,
        byClass: {
          collaborative: {
            minRubricDelta: 0,
            minRetentionFloor: 85,
          },
        },
      },
      "collaborative",
    );

    expect(result.accepted).toBeFalse();
    expect(result.reason).toContain("preservation below floor");
  });
});

function createScore(input: { overall: number; preservation: number; tokenCount: number }): CandidateScore {
  return {
    rubric: {
      provider: "test-judge",
      overall: input.overall,
      clarity: input.overall,
      structure: input.overall,
      actionability: input.overall,
      preservation: input.preservation,
      rationale: "test",
    },
    metrics: {
      tokenEstimate: input.tokenCount,
      headingCount: 1,
      listItemCount: 1,
      codeFenceCount: 0,
      linkCount: 0,
      imperativeCount: 1,
      avgSentenceLength: 10,
    },
    retention: input.preservation,
    composite: input.overall,
    tokenCount: input.tokenCount,
  };
}
