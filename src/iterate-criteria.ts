import type { CandidateScore, DocClass } from "./types";

interface ClassCriteriaOverride {
  minRubricDelta?: number;
  minRetentionFloor?: number;
}

export interface AcceptanceCriteria {
  minRubricDelta: number;
  minRetentionFloor: number;
  maxTokenInflation: number;
  byClass?: Partial<Record<DocClass, ClassCriteriaOverride>>;
}

export interface AcceptanceResult {
  accepted: boolean;
  reason: string;
}

export function evaluateAcceptance(
  before: CandidateScore,
  after: CandidateScore,
  criteria: AcceptanceCriteria,
  classification: DocClass,
): AcceptanceResult {
  const classOverride = criteria.byClass?.[classification];
  const minRubricDelta = classOverride?.minRubricDelta ?? criteria.minRubricDelta;
  const minRetentionFloor = classOverride?.minRetentionFloor ?? criteria.minRetentionFloor;

  const rubricDelta = after.rubric.overall - before.rubric.overall;
  if (rubricDelta < minRubricDelta) {
    return {
      accepted: false,
      reason: `rubric delta below threshold (${rubricDelta.toFixed(2)} < ${minRubricDelta.toFixed(2)})`,
    };
  }

  const preservation = after.rubric.preservation;
  if (preservation < minRetentionFloor) {
    return {
      accepted: false,
      reason: `preservation below floor (${preservation.toFixed(2)} < ${minRetentionFloor.toFixed(2)})`,
    };
  }

  const tokenDelta = after.tokenCount - before.tokenCount;
  if (tokenDelta > criteria.maxTokenInflation) {
    return {
      accepted: false,
      reason: `token inflation exceeds cap (${tokenDelta} > ${criteria.maxTokenInflation})`,
    };
  }

  return {
    accepted: true,
    reason: "all criteria met",
  };
}
