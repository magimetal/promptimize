import { mkdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { classifyDocument } from "./classify";
import { discoverMarkdownFiles } from "./discovery";
import { joinFrontmatter, splitFrontmatter } from "./frontmatter";
import { optimizeMarkdownBody } from "./optimizer";
import type { CliOptions, EnhancementProvider, FileProcessResult, RunResult } from "./types";

export async function runPromptimize(options: CliOptions, provider: EnhancementProvider): Promise<RunResult> {
  const discovery = await discoverMarkdownFiles(options.inputPath);
  const files: FileProcessResult[] = [];

  const mode: RunResult["mode"] = options.dryRun ? "dry-run" : "write";
  for (const sourcePath of discovery.files) {
    const sourceText = await Bun.file(sourcePath).text();
    const parsed = splitFrontmatter(sourceText);
    const classification = classifyDocument(sourcePath, parsed.body);
    const optimizedBody = await optimizeMarkdownBody(parsed.body, classification);
    const providerResult = await provider.enhance({
      filePath: sourcePath,
      body: optimizedBody,
      classification,
    });

    const candidateOutputText = joinFrontmatter({
      frontmatterRaw: parsed.frontmatterRaw,
      body: providerResult.body,
    });

    const beforeTokens = estimateTokens(sourceText);
    const candidateAfterTokens = estimateTokens(candidateOutputText);
    const outputText =
      providerResult.selected === "local-rule-agent" && candidateAfterTokens > beforeTokens
        ? sourceText
        : candidateOutputText;

    const outputPath = resolveOutputPath({
      sourcePath,
      root: discovery.root,
      inputPath: options.inputPath,
      inPlace: options.inPlace,
      multipleFiles: discovery.files.length > 1,
      ...(options.outputDir ? { outputDir: options.outputDir } : {}),
    });

    if (!options.dryRun) {
      await mkdir(dirname(outputPath), { recursive: true });
      await Bun.write(outputPath, outputText);
    }

    const afterTokens = estimateTokens(outputText);
    const tokenDelta = afterTokens - beforeTokens;

    files.push({
      sourcePath,
      outputPath,
      classification,
      changed: sourceText !== outputText,
      provider: {
        attempted: providerResult.attempted,
        selected: providerResult.selected,
        fallbackUsed: providerResult.fallbackUsed,
        ...(providerResult.fallbackFrom ? { fallbackFrom: providerResult.fallbackFrom } : {}),
        ...(providerResult.fallbackReason ? { fallbackReason: providerResult.fallbackReason } : {}),
      },
      metrics: {
        charsBefore: sourceText.length,
        charsAfter: outputText.length,
        tokenEstimateBefore: beforeTokens,
        tokenEstimateAfter: afterTokens,
        tokenDelta,
        tokenDeltaPct: percentDelta(beforeTokens, afterTokens),
      },
    });
  }

  const tokensBefore = files.reduce((sum, file) => sum + file.metrics.tokenEstimateBefore, 0);
  const tokensAfter = files.reduce((sum, file) => sum + file.metrics.tokenEstimateAfter, 0);
  const providerUsage = {
    credentialed: files.filter((file) => file.provider.selected === "credentialed-agent").length,
    local: files.filter((file) => file.provider.selected === "local-rule-agent").length,
    fallbacks: files.filter((file) => file.provider.fallbackUsed).length,
  };

  return {
    mode,
    files,
    totals: {
      filesScanned: files.length,
      filesChanged: files.filter((file) => file.changed).length,
      tokensBefore,
      tokensAfter,
      tokenDelta: tokensAfter - tokensBefore,
      tokenDeltaPct: percentDelta(tokensBefore, tokensAfter),
      providerUsage,
    },
  };
}

interface ResolveOutputInput {
  sourcePath: string;
  root: string;
  inputPath: string;
  outputDir?: string;
  inPlace: boolean;
  multipleFiles: boolean;
}

function resolveOutputPath(input: ResolveOutputInput): string {
  if (input.inPlace) {
    return input.sourcePath;
  }

  if (input.outputDir) {
    const outputRoot = resolve(input.outputDir);
    if (input.multipleFiles) {
      const rel = relative(input.root, input.sourcePath);
      return join(outputRoot, rel);
    }

    return join(outputRoot, `${basenameWithoutExt(input.sourcePath)}.optimized.md`);
  }

  if (input.multipleFiles) {
    const sourceRoot = resolve(input.inputPath);
    const outputRoot = `${sourceRoot}-optimized`;
    const rel = relative(input.root, input.sourcePath);
    return join(outputRoot, rel);
  }

  const source = input.sourcePath;
  return source.replace(/\.md$/i, ".optimized.md");
}

function basenameWithoutExt(filePath: string): string {
  const last = filePath.split("/").at(-1) ?? filePath;
  return last.replace(/\.md$/i, "");
}

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

function percentDelta(before: number, after: number): number {
  if (before === 0) {
    return 0;
  }

  return Number((((after - before) / before) * 100).toFixed(2));
}
