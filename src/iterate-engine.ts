import { classifyDocument } from "./classify";
import { splitFrontmatter } from "./frontmatter";
import { createBudgetState, isBudgetExhausted, tickBudget } from "./iterate-budget";
import { evaluateAcceptance } from "./iterate-criteria";
import { classifyFixturePath } from "./iterate-corpus";
import type { CandidateScorer } from "./iterate-scorer";
import type {
  EnhancementProvider,
  IterationBudget,
  IterationRunResult,
  ResultStore,
} from "./types";
import type { AcceptanceCriteria, AcceptanceResult } from "./iterate-criteria";

export async function runIteration(
  filePath: string,
  provider: EnhancementProvider,
  scorer: CandidateScorer,
  criteria: AcceptanceCriteria,
  budget: IterationBudget,
  store: ResultStore,
): Promise<IterationRunResult> {
  const source = await Bun.file(filePath).text();
  const parsed = splitFrontmatter(source);
  const body = parsed.body;
  const classification = classifyFixturePath(filePath) ?? classifyDocument(filePath, body);

  const baselineScore = await scorer.score({
    filePath,
    classification,
    originalBody: body,
    candidateBody: body,
  });

  let current = body;
  let currentScore = baselineScore;
  let stopReason = "budget exhausted";
  const iterations: IterationRunResult["iterations"] = [];
  let budgetState = createBudgetState(budget);
  const providerCanUseAi = provider.name === "provider-chain" || provider.name === "credentialed-agent";
  const stopBudget: IterationBudget = providerCanUseAi ? { ...budget, maxAiCallsPerFile: 0 } : budget;

  while (true) {
    const startedAt = Date.now();
    const scoreBefore = currentScore;
    const aiBudgetReached = providerCanUseAi && budget.maxAiCallsPerFile > 0 && budgetState.aiCalls >= budget.maxAiCallsPerFile;
    const candidate = aiBudgetReached
      ? {
          body: current,
          attempted: [provider.name, "local-rule-agent"],
          selected: "local-rule-agent",
          fallbackUsed: true,
          fallbackFrom: "credentialed-agent" as const,
          fallbackReason: "error" as const,
        }
      : await provider.enhance({
          filePath,
          body: current,
          classification,
        });

    const candidateScore = await scorer.score({
      filePath,
      classification,
      originalBody: body,
      candidateBody: candidate.body,
    });

    const acceptance: AcceptanceResult = evaluateAcceptance(currentScore, candidateScore, criteria, classification);
    if (acceptance.accepted) {
      current = candidate.body;
      currentScore = candidateScore;
    }

    const record = {
      iter: budgetState.iter + 1,
      filePath,
      classification,
      candidateBody: candidate.body,
      scoreBefore,
      scoreAfter: candidateScore,
      accepted: acceptance.accepted,
      acceptanceReason: acceptance.reason,
      aiCallMade: candidate.selected === "credentialed-agent",
      durationMs: Date.now() - startedAt,
    };
    iterations.push(record);
    await store.append(record);

    budgetState = tickBudget(budgetState, record.aiCallMade, [currentScore.rubric.overall]);
    const exhausted = isBudgetExhausted(budgetState, stopBudget);
    if (exhausted.exhausted) {
      stopReason = exhausted.reason ?? "budget exhausted";
      break;
    }
  }

  return {
    filePath,
    classification,
    iterations,
    baselineScore,
    finalScore: currentScore,
    finalBody: current,
    totalIter: budgetState.iter,
    converged: stopReason.includes("plateau"),
    stopReason,
  };
}
