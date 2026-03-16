import { analyzeMarkdownMetrics, computeDeterministicComposite, computeRetentionScore } from "./eval-metrics";
import type { CandidateScore, RubricJudge, RubricJudgeInput } from "./types";

export class CandidateScorer {
  public constructor(private readonly judge: RubricJudge) {}

  public async score(input: RubricJudgeInput): Promise<CandidateScore> {
    const metrics = analyzeMarkdownMetrics(input.candidateBody);
    const retention = computeRetentionScore(input.originalBody, input.candidateBody);
    const composite = computeDeterministicComposite(metrics, input.classification, retention);
    const rubric = await this.judge.score(input);

    return {
      rubric,
      metrics,
      retention,
      composite,
      tokenCount: metrics.tokenEstimate,
    };
  }
}
