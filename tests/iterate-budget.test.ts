import { describe, expect, test } from "bun:test";
import { createBudgetState, isBudgetExhausted, tickBudget } from "../src/iterate-budget";
import type { IterationBudget } from "../src/types";

describe("iteration budget", () => {
  test("stops at max iterations", () => {
    const budget: IterationBudget = {
      maxIterations: 3,
      maxAiCallsPerFile: 10,
      plateauWindowSize: 3,
      plateauMinDelta: 0.1,
      resultFile: "benchmarks/iterate-results.ndjson",
    };

    let state = createBudgetState(budget);
    state = tickBudget(state, false, [80]);
    state = tickBudget(state, false, [81]);
    state = tickBudget(state, false, [82]);

    const exhausted = isBudgetExhausted(state, budget);
    expect(exhausted.exhausted).toBeTrue();
    expect(exhausted.reason).toContain("max iterations");
  });

  test("stops at ai call budget", () => {
    const budget: IterationBudget = {
      maxIterations: 10,
      maxAiCallsPerFile: 2,
      plateauWindowSize: 3,
      plateauMinDelta: 0.1,
      resultFile: "benchmarks/iterate-results.ndjson",
    };

    let state = createBudgetState(budget);
    state = tickBudget(state, true, [80]);
    state = tickBudget(state, true, [82]);

    const exhausted = isBudgetExhausted(state, budget);
    expect(exhausted.exhausted).toBeTrue();
    expect(exhausted.reason).toContain("ai call budget");
  });

  test("detects plateau with window and delta", () => {
    const budget: IterationBudget = {
      maxIterations: 10,
      maxAiCallsPerFile: 10,
      plateauWindowSize: 3,
      plateauMinDelta: 0.1,
      resultFile: "benchmarks/iterate-results.ndjson",
    };

    let state = createBudgetState(budget);
    state = tickBudget(state, false, [80]);
    state = tickBudget(state, false, [80.05]);
    state = tickBudget(state, false, [80.02]);

    const exhausted = isBudgetExhausted(state, budget);
    expect(exhausted.exhausted).toBeTrue();
    expect(exhausted.reason).toContain("plateau");
  });
});
