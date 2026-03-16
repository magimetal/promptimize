export type DocClass = "discipline" | "guidance" | "collaborative" | "reference";

export interface CliOptions {
  dryRun: boolean;
  inPlace: boolean;
  outputDir?: string;
  format: "text" | "json";
  ai: boolean;
  inputPath: string;
}

export interface ParsedMarkdown {
  frontmatterRaw: string;
  body: string;
}

export interface FileProcessResult {
  sourcePath: string;
  outputPath: string;
  classification: DocClass;
  changed: boolean;
  provider: {
    attempted: string[];
    selected: string;
    fallbackUsed: boolean;
    fallbackFrom?: string;
    fallbackReason?: "error";
  };
  metrics: {
    charsBefore: number;
    charsAfter: number;
    tokenEstimateBefore: number;
    tokenEstimateAfter: number;
    tokenDelta: number;
    tokenDeltaPct: number;
  };
}

export interface RunResult {
  mode: "dry-run" | "write";
  files: FileProcessResult[];
  totals: {
    filesScanned: number;
    filesChanged: number;
    tokensBefore: number;
    tokensAfter: number;
    tokenDelta: number;
    tokenDeltaPct: number;
    providerUsage: {
      credentialed: number;
      local: number;
      fallbacks: number;
    };
  };
}

export interface OptimizeRequest {
  filePath: string;
  body: string;
  classification: DocClass;
}

export interface EnhancementProvider {
  readonly name: string;
  isAvailable(): boolean;
  enhance(input: OptimizeRequest): Promise<EnhancementResult>;
}

export interface EnhancementResult {
  body: string;
  attempted: string[];
  selected: string;
  fallbackUsed: boolean;
  fallbackFrom?: string;
  fallbackReason?: "error";
}

export interface EvalCliOptions {
  inputPath?: string;
  format: "text" | "json";
  ai: boolean;
  verbose?: boolean;
  reportFile?: string;
}

export interface DeterministicMetrics {
  tokenEstimate: number;
  headingCount: number;
  listItemCount: number;
  codeFenceCount: number;
  linkCount: number;
  imperativeCount: number;
  avgSentenceLength: number;
}

export interface RubricScore {
  provider: string;
  overall: number;
  clarity: number;
  structure: number;
  actionability: number;
  preservation: number;
  rationale: string;
}

export interface EvalFileResult {
  filePath: string;
  classification: DocClass;
  changed: boolean;
  deterministicBefore: DeterministicMetrics;
  deterministicAfter: DeterministicMetrics;
  deterministicCompositeBefore: number;
  deterministicCompositeAfter: number;
  deterministicCompositeDelta: number;
  rubricBefore: RubricScore;
  rubricAfter: RubricScore;
  rubricDelta: number;
  tokenDelta: number;
  tokenDeltaPct: number;
  originalBody?: string;
  optimizedBody?: string;
}

export interface EvalRunResult {
  benchmarkRoot: string;
  judge: string;
  files: EvalFileResult[];
  totals: {
    filesScanned: number;
    filesChanged: number;
    avgDeterministicBefore: number;
    avgDeterministicAfter: number;
    avgDeterministicDelta: number;
    avgRubricBefore: number;
    avgRubricAfter: number;
    avgRubricDelta: number;
    tokensBefore: number;
    tokensAfter: number;
    tokenDelta: number;
    tokenDeltaPct: number;
    byClass: Record<DocClass, EvalClassTotals>;
  };
}

export interface EvalClassTotals {
  filesScanned: number;
  filesChanged: number;
  avgDeterministicDelta: number;
  avgRubricDelta: number;
  tokensBefore: number;
  tokensAfter: number;
  tokenDeltaPct: number;
}

export interface RubricJudgeInput {
  filePath: string;
  classification: DocClass;
  originalBody: string;
  candidateBody: string;
}

export interface RubricJudge {
  readonly name: string;
  isAvailable(): boolean;
  score(input: RubricJudgeInput): Promise<RubricScore>;
}
