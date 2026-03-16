#!/usr/bin/env bun
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { classifyDocument } from "./classify";
import { discoverMarkdownFiles } from "./discovery";
import { buildRubricJudge } from "./eval-judge";
import { splitFrontmatter } from "./frontmatter";
import { createResultStore } from "./iterate-store";
import { CandidateScorer } from "./iterate-scorer";
import { runIteration } from "./iterate-engine";
import { classifyFixturePath, splitCorpus } from "./iterate-corpus";
import { buildIterationReport, formatIterationText, type IterationReport } from "./iterate-report";
import { buildProviderChain, createOpenAiOptimizeCall } from "./providers";
import type { CandidateScore, DocClass, IterationBudget, IterationRunResult } from "./types";
import type { AcceptanceCriteria } from "./iterate-criteria";
import type { CorpusSplit } from "./iterate-corpus";

const DEFAULT_FIXTURE_PATH = "benchmarks/fixtures";
const DEFAULT_RESULT_FILE = "benchmarks/iterate-results.ndjson";

interface IterateCliOptions {
  inputPaths: string[];
  ai: boolean;
  maxIterations: number;
  maxAiCallsPerFile?: number;
  holdOutFraction: number;
  resultFile: string;
  format: "text" | "json";
  reportFile?: string;
}

interface IterateCliResult {
  train: IterationRunResult[];
  holdOut: Array<{
    filePath: string;
    classification: DocClass;
    score: CandidateScore;
  }>;
}

interface IterateCliJsonResult extends IterateCliResult {
  report: IterationReport;
}

function parseIterateArgs(argv: string[]): IterateCliOptions {
  let ai = false;
  let maxIterations = 5;
  let maxAiCallsPerFile: number | undefined;
  let holdOutFraction = 0.25;
  let resultFile = DEFAULT_RESULT_FILE;
  let format: IterateCliOptions["format"] = "text";
  let reportFile: string | undefined;
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) {
      continue;
    }

    if (arg === "--ai") {
      ai = true;
      continue;
    }

    if (arg === "--max-iter") {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error("--max-iter must be a positive integer");
      }

      maxIterations = value;
      index += 1;
      continue;
    }

    if (arg === "--hold-out") {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value <= 0 || value >= 1) {
        throw new Error("--hold-out must be a number between 0 and 1");
      }

      holdOutFraction = value;
      index += 1;
      continue;
    }

    if (arg === "--max-ai-calls") {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error("--max-ai-calls must be a positive integer");
      }

      maxAiCallsPerFile = value;
      index += 1;
      continue;
    }

    if (arg === "--result-file") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--result-file requires a path");
      }

      resultFile = value;
      index += 1;
      continue;
    }

    if (arg === "--report-file") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--report-file requires a path");
      }

      reportFile = value;
      index += 1;
      continue;
    }

    if (arg === "--format") {
      const value = argv[index + 1];
      if (value !== "text" && value !== "json") {
        throw new Error("--format must be text or json");
      }

      format = value;
      index += 1;
      continue;
    }

    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown flag: ${arg}`);
    }

    positionals.push(arg);
  }

  return {
    ai,
    maxIterations,
    ...(maxAiCallsPerFile ? { maxAiCallsPerFile } : {}),
    holdOutFraction,
    resultFile,
    format,
    inputPaths: positionals,
    ...(reportFile ? { reportFile } : {}),
  };
}

function printHelp(): void {
  console.log(`promptimize iterate

Usage:
  bun run iterate -- [options] [path ...]

Options:
  --ai                   Enable OpenAI-compatible provider/judge with local fallback
  --max-iter <n>         Max iterations per train file (default: 5)
  --max-ai-calls <n>     Max credentialed AI calls per train file (default: env or 3)
  --hold-out <fraction>  Hold-out fraction between 0 and 1 (default: 0.25)
  --result-file <path>   NDJSON iteration record store (default: benchmarks/iterate-results.ndjson)
  --report-file <path>   Also write JSON summary artifact
  --format <text|json>   Output format (default: text)
  -h, --help             Show help`);
}

export async function runIterateCli(argv: string[]): Promise<void> {
  const options = parseIterateArgs(argv);
  const targetPaths = options.inputPaths.length > 0 ? options.inputPaths : [DEFAULT_FIXTURE_PATH];
  const discoveredFiles = new Set<string>();
  for (const targetPath of targetPaths) {
    const discovery = await discoverMarkdownFiles(resolve(targetPath));
    for (const filePath of discovery.files) {
      discoveredFiles.add(filePath);
    }
  }

  const split: CorpusSplit = splitCorpus(Array.from(discoveredFiles).sort(), options.holdOutFraction);

  const provider = buildProviderChain(
    options.ai,
    createOpenAiOptimizeCall(fetch, {
      temperature: options.ai ? resolveIterateTemperature() : 0,
    }),
  );
  const judge = buildRubricJudge(options.ai);
  const scorer = new CandidateScorer(judge);
  const criteria: AcceptanceCriteria = {
    minRubricDelta: 0.5,
    minRetentionFloor: 75,
    maxTokenInflation: 0,
    byClass: {
      discipline: {
        minRubricDelta: 1,
      },
      guidance: {
        minRubricDelta: 0,
        minRetentionFloor: 85,
      },
      reference: {
        minRubricDelta: 0,
        minRetentionFloor: 90,
      },
      collaborative: {
        minRubricDelta: 0,
        minRetentionFloor: 90,
      },
    },
  };
  const budget: IterationBudget = {
    maxIterations: options.maxIterations,
    maxAiCallsPerFile: options.maxAiCallsPerFile ?? resolveIterateMaxAiCalls(),
    plateauWindowSize: 3,
    plateauMinDelta: 0.1,
    resultFile: options.resultFile,
  };

  const store = createResultStore(budget.resultFile);
  const train: IterationRunResult[] = [];
  for (const filePath of split.train) {
    const run = await runIteration(filePath, provider, scorer, criteria, budget, store);
    train.push(run);
  }

  const holdOut: IterateCliResult["holdOut"] = [];
  for (const filePath of split.holdOut) {
    const source = await Bun.file(filePath).text();
    const parsed = splitFrontmatter(source);
    const classification = classifyFixturePath(filePath) ?? classifyDocument(filePath, parsed.body);
    const score = await scorer.score({
      filePath,
      classification,
      originalBody: parsed.body,
      candidateBody: parsed.body,
    });
    holdOut.push({ filePath, classification, score });
  }

  const result: IterateCliResult = {
    train,
    holdOut,
  };
  const report = buildIterationReport(result, budget.resultFile);
  const jsonResult: IterateCliJsonResult = {
    ...result,
    report,
  };
  const jsonText = JSON.stringify(jsonResult, null, 2);

  if (options.reportFile) {
    const target = resolve(options.reportFile);
    await mkdir(dirname(target), { recursive: true });
    await Bun.write(target, `${jsonText}\n`);
  }

  if (options.format === "json") {
    console.log(jsonText);
    return;
  }

  console.log(formatIterationText(result, budget.resultFile));
}

function resolveIterateTemperature(): number {
  const raw = process.env.PROMPTIMIZE_ITERATE_TEMPERATURE;
  if (!raw) {
    return 0.3;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0.3;
  }

  if (parsed > 0.7) {
    return 0.7;
  }

  return parsed;
}

function resolveIterateMaxAiCalls(): number {
  const raw = process.env.PROMPTIMIZE_ITERATE_MAX_AI_CALLS;
  if (!raw) {
    return 3;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 3;
  }

  return parsed;
}

async function main(): Promise<void> {
  try {
    await runIterateCli(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`promptimize iterate error: ${message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  void main();
}
