import type { CandidateScore, DocClass, IterationRunResult } from "./types";

const DOC_CLASSES: DocClass[] = ["discipline", "guidance", "collaborative", "reference"];

interface HoldOutScore {
  filePath: string;
  classification: DocClass;
  score: CandidateScore;
}

interface IterateResultShape {
  train: IterationRunResult[];
  holdOut: HoldOutScore[];
}

export interface IterationReport {
  perFile: Array<{
    filePath: string;
    classification: DocClass;
    baselineRubric: number;
    finalRubric: number;
    rubricDelta: number;
    iterationsUsed: number;
    accepted: number;
    total: number;
    acceptedRatio: number;
    converged: boolean;
    stopReason: string;
  }>;
  byClass: Record<
    DocClass,
    {
      files: number;
      avgRubricDelta: number;
      avgIterationsToConverge: number;
    }
  >;
  holdOut: {
    files: number;
    avgRubricOverall: number;
  };
  summary: {
    improvedFiles: number;
    totalFiles: number;
    holdOutAvgRubric: number;
    resultFile: string;
  };
}

export function buildIterationReport(result: IterateResultShape, resultFile: string): IterationReport {
  const perFile = result.train.map((run) => {
    const accepted = run.iterations.filter((iter) => iter.accepted).length;
    const total = run.iterations.length;
    const baselineRubric = round2(run.baselineScore.rubric.overall);
    const finalRubric = round2(run.finalScore.rubric.overall);
    return {
      filePath: run.filePath,
      classification: run.classification,
      baselineRubric,
      finalRubric,
      rubricDelta: round2(finalRubric - baselineRubric),
      iterationsUsed: run.totalIter,
      accepted,
      total,
      acceptedRatio: total === 0 ? 0 : round2((accepted / total) * 100),
      converged: run.converged,
      stopReason: run.stopReason,
    };
  });

  const byClass = Object.fromEntries(
    DOC_CLASSES.map((docClass) => {
      const group = perFile.filter((item) => item.classification === docClass);
      const converged = group.filter((item) => item.converged);
      return [
        docClass,
        {
          files: group.length,
          avgRubricDelta: average(group.map((item) => item.rubricDelta)),
          avgIterationsToConverge: average(converged.map((item) => item.iterationsUsed)),
        },
      ];
    }),
  ) as IterationReport["byClass"];

  const holdOutAvgRubric = average(result.holdOut.map((item) => item.score.rubric.overall));
  const improvedFiles = perFile.filter((item) => item.rubricDelta > 0).length;

  return {
    perFile,
    byClass,
    holdOut: {
      files: result.holdOut.length,
      avgRubricOverall: holdOutAvgRubric,
    },
    summary: {
      improvedFiles,
      totalFiles: perFile.length,
      holdOutAvgRubric,
      resultFile,
    },
  };
}

export function formatIterationText(result: IterateResultShape, resultFile: string): string {
  const report = buildIterationReport(result, resultFile);
  const lines: string[] = [];
  lines.push(`train files: ${report.summary.totalFiles}`);

  for (const item of report.perFile) {
    lines.push(
      `- ${item.filePath} Δrubric ${item.rubricDelta} iter ${item.iterationsUsed} accepted ${item.accepted}/${item.total} converged ${item.converged ? "yes" : "no"}`,
    );
  }

  lines.push("by class:");
  for (const docClass of DOC_CLASSES) {
    const item = report.byClass[docClass];
    lines.push(
      `  - ${docClass}: files ${item.files}, avg Δrubric ${item.avgRubricDelta}, avg iter-to-converge ${item.avgIterationsToConverge}`,
    );
  }

  lines.push(`hold-out avg rubric.overall: ${report.holdOut.avgRubricOverall}`);
  lines.push(
    `${report.summary.improvedFiles} of ${report.summary.totalFiles} files improved, ${report.summary.holdOutAvgRubric} hold-out score avg.`,
  );
  lines.push(`result store: ${report.summary.resultFile}`);

  return `${lines.join("\n")}\n`;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}
