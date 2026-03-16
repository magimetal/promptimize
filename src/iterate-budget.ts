import type { IterationBudget } from "./types";

export interface BudgetState {
  iter: number;
  aiCalls: number;
  recentScores: number[];
}

export function createBudgetState(_budget: IterationBudget): BudgetState {
  return {
    iter: 0,
    aiCalls: 0,
    recentScores: [],
  };
}

export function tickBudget(state: BudgetState, aiCallMade: boolean, scores: number[]): BudgetState {
  return {
    iter: state.iter + 1,
    aiCalls: state.aiCalls + (aiCallMade ? 1 : 0),
    recentScores: [...state.recentScores, ...scores],
  };
}

export function isBudgetExhausted(
  state: BudgetState,
  budget: IterationBudget,
): {
  exhausted: boolean;
  reason?: string;
} {
  if (state.iter >= budget.maxIterations) {
    return {
      exhausted: true,
      reason: "max iterations reached",
    };
  }

  if (budget.maxAiCallsPerFile > 0 && state.aiCalls >= budget.maxAiCallsPerFile) {
    return {
      exhausted: true,
      reason: "ai call budget reached",
    };
  }

  if (budget.plateauWindowSize > 0 && state.recentScores.length >= budget.plateauWindowSize) {
    const window = state.recentScores.slice(-budget.plateauWindowSize);
    const minScore = Math.min(...window);
    const maxScore = Math.max(...window);
    if (maxScore - minScore <= budget.plateauMinDelta) {
      return {
        exhausted: true,
        reason: "plateau detected",
      };
    }
  }

  return {
    exhausted: false,
  };
}
