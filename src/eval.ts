import { basename, resolve } from "node:path";
import { classifyDocument } from "./classify";
import { discoverMarkdownFiles } from "./discovery";
import { analyzeMarkdownMetrics, computeDeterministicComposite, computeRetentionScore, percentDelta } from "./eval-metrics";
import { buildRubricJudge } from "./eval-judge";
import { splitFrontmatter } from "./frontmatter";
import { optimizeMarkdownBody } from "./optimizer";
import type { DocClass, EvalCliOptions, EvalFileResult, EvalRunResult, RubricJudge } from "./types";

const DEFAULT_BENCHMARK_PATH = "benchmarks/fixtures";
const DOC_CLASSES: DocClass[] = ["discipline", "guidance", "collaborative", "reference"];
const RUBRIC_DELTA_NOISE_FLOOR = 0.1;

export async function runEvaluation(options: EvalCliOptions, judge?: RubricJudge): Promise<EvalRunResult> {
  const benchmarkPath = resolve(options.inputPath ?? DEFAULT_BENCHMARK_PATH);
  const discovery = await discoverMarkdownFiles(benchmarkPath);
  const activeJudge = judge ?? buildRubricJudge(options.ai);
  const files: EvalFileResult[] = [];

  for (const filePath of discovery.files) {
    const sourceText = await Bun.file(filePath).text();
    const parsed = splitFrontmatter(sourceText);
    const classification = classifyFixtureClass(filePath) ?? classifyDocument(filePath, parsed.body);
    const optimizedBody = await optimizeMarkdownBody(parsed.body, classification);

    const deterministicBefore = analyzeMarkdownMetrics(parsed.body);
    const deterministicAfter = analyzeMarkdownMetrics(optimizedBody);
    const retentionBefore = 100;
    const retentionAfter = computeRetentionScore(parsed.body, optimizedBody);
    const deterministicCompositeBefore = computeDeterministicComposite(deterministicBefore, classification, retentionBefore);
    const deterministicCompositeAfter = computeDeterministicComposite(deterministicAfter, classification, retentionAfter);

    const rubricBefore = await activeJudge.score({
      filePath,
      classification,
      originalBody: parsed.body,
      candidateBody: parsed.body,
    });

    const rubricAfter = await activeJudge.score({
      filePath,
      classification,
      originalBody: parsed.body,
      candidateBody: optimizedBody,
    });

    const tokenDelta = deterministicAfter.tokenEstimate - deterministicBefore.tokenEstimate;
    const rubricDelta = zeroSmallDelta(round2(rubricAfter.overall - rubricBefore.overall), RUBRIC_DELTA_NOISE_FLOOR);
    files.push({
      filePath,
      classification,
      changed: parsed.body !== optimizedBody,
      deterministicBefore,
      deterministicAfter,
      deterministicCompositeBefore,
      deterministicCompositeAfter,
      deterministicCompositeDelta: round2(deterministicCompositeAfter - deterministicCompositeBefore),
      rubricBefore,
      rubricAfter,
      rubricDelta,
      tokenDelta,
      tokenDeltaPct: percentDelta(deterministicBefore.tokenEstimate, deterministicAfter.tokenEstimate),
      ...(options.verbose && options.format === "text"
        ? {
            originalBody: parsed.body,
            optimizedBody,
          }
        : {}),
    });
  }

  const tokensBefore = files.reduce((sum, file) => sum + file.deterministicBefore.tokenEstimate, 0);
  const tokensAfter = files.reduce((sum, file) => sum + file.deterministicAfter.tokenEstimate, 0);

  return {
    benchmarkRoot: discovery.root,
    judge: activeJudge.name,
    files,
    totals: {
      filesScanned: files.length,
      filesChanged: files.filter((file) => file.changed).length,
      avgDeterministicBefore: average(files.map((file) => file.deterministicCompositeBefore)),
      avgDeterministicAfter: average(files.map((file) => file.deterministicCompositeAfter)),
      avgDeterministicDelta: average(files.map((file) => file.deterministicCompositeDelta)),
      avgRubricBefore: average(files.map((file) => file.rubricBefore.overall)),
      avgRubricAfter: average(files.map((file) => file.rubricAfter.overall)),
      avgRubricDelta: average(files.map((file) => file.rubricDelta)),
      tokensBefore,
      tokensAfter,
      tokenDelta: tokensAfter - tokensBefore,
      tokenDeltaPct: percentDelta(tokensBefore, tokensAfter),
      byClass: summarizeByClass(files),
    },
  };
}

function classifyFixtureClass(filePath: string): DocClass | null {
  const fixtureName = basename(filePath).toLowerCase();
  if (fixtureName.startsWith("discipline-")) {
    return "discipline";
  }

  if (fixtureName.startsWith("guidance-")) {
    return "guidance";
  }

  if (fixtureName.startsWith("collaborative-")) {
    return "collaborative";
  }

  if (fixtureName.startsWith("reference-")) {
    return "reference";
  }

  return null;
}

export function formatEvalText(result: EvalRunResult, options?: Pick<EvalCliOptions, "verbose">): string {
  const lines: string[] = [];
  lines.push(`benchmark root: ${result.benchmarkRoot}`);
  lines.push(`judge: ${result.judge}`);
  lines.push(`files scanned: ${result.totals.filesScanned}`);
  lines.push(`files changed: ${result.totals.filesChanged}`);
  lines.push(
    `deterministic avg: ${result.totals.avgDeterministicBefore} -> ${result.totals.avgDeterministicAfter} (Δ ${result.totals.avgDeterministicDelta})`,
  );
  lines.push(`rubric avg: ${result.totals.avgRubricBefore} -> ${result.totals.avgRubricAfter} (Δ ${result.totals.avgRubricDelta})`);
  lines.push(`tokens: ${result.totals.tokensBefore} -> ${result.totals.tokensAfter} (${result.totals.tokenDeltaPct}%)`);
  lines.push("by class:");
  for (const docClass of DOC_CLASSES) {
    const totals = result.totals.byClass[docClass];
    lines.push(
      `  - ${docClass}: files ${totals.filesScanned}, changed ${totals.filesChanged}, deterministic Δ ${totals.avgDeterministicDelta}, rubric Δ ${totals.avgRubricDelta}, tokens ${totals.tokensBefore} -> ${totals.tokensAfter} (${totals.tokenDeltaPct}%)`,
    );
  }
  lines.push("");

  for (const file of result.files) {
    lines.push(`- ${file.filePath}`);
    lines.push(`  class: ${file.classification}`);
    lines.push(
      `  deterministic: ${file.deterministicCompositeBefore} -> ${file.deterministicCompositeAfter} (Δ ${file.deterministicCompositeDelta})`,
    );
    lines.push(`  rubric (${file.rubricAfter.provider}): ${file.rubricBefore.overall} -> ${file.rubricAfter.overall} (Δ ${file.rubricDelta})`);
    lines.push(`  preservation: ${file.rubricAfter.preservation}`);
    lines.push(`  tokens: ${file.deterministicBefore.tokenEstimate} -> ${file.deterministicAfter.tokenEstimate} (${file.tokenDeltaPct}%)`);
    lines.push(`  rationale: ${file.rubricAfter.rationale}`);

    if (options?.verbose) {
      lines.push("  --- original ---");
      lines.push(file.originalBody ?? "");
      lines.push("  --- optimized ---");
      lines.push(file.optimizedBody ?? "");
    }
  }

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

function zeroSmallDelta(value: number, threshold: number): number {
  if (Math.abs(value) < threshold) {
    return 0;
  }

  return value;
}

function summarizeByClass(files: EvalFileResult[]): EvalRunResult["totals"]["byClass"] {
  const summary = Object.fromEntries(
    DOC_CLASSES.map((docClass) => [
      docClass,
      {
        filesScanned: 0,
        filesChanged: 0,
        avgDeterministicDelta: 0,
        avgRubricDelta: 0,
        tokensBefore: 0,
        tokensAfter: 0,
        tokenDeltaPct: 0,
      },
    ]),
  ) as EvalRunResult["totals"]["byClass"];

  for (const docClass of DOC_CLASSES) {
    const group = files.filter((file) => file.classification === docClass);
    const tokensBefore = group.reduce((sum, file) => sum + file.deterministicBefore.tokenEstimate, 0);
    const tokensAfter = group.reduce((sum, file) => sum + file.deterministicAfter.tokenEstimate, 0);

    summary[docClass] = {
      filesScanned: group.length,
      filesChanged: group.filter((file) => file.changed).length,
      avgDeterministicDelta: average(group.map((file) => file.deterministicCompositeDelta)),
      avgRubricDelta: average(group.map((file) => file.rubricDelta)),
      tokensBefore,
      tokensAfter,
      tokenDeltaPct: percentDelta(tokensBefore, tokensAfter),
    };
  }

  return summary;
}
