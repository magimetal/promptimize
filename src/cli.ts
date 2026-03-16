#!/usr/bin/env bun
import { buildProviderChain, createOpenAiOptimizeCall } from "./providers";
import { runPromptimize } from "./engine";
import { runEvalCli } from "./eval-cli";
import type { CliOptions } from "./types";

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let inPlace = false;
  let outputDir: string | undefined;
  let format: CliOptions["format"] = "text";
  let ai = false;
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) {
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--in-place") {
      inPlace = true;
      continue;
    }

    if (arg === "--ai") {
      ai = true;
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

    if (arg === "--output-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--output-dir requires a path");
      }

      outputDir = value;
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

  if (positionals.length !== 1) {
    throw new Error("Provide exactly one input path (markdown file or directory)");
  }

  return {
    dryRun,
    inPlace,
    format,
    ai,
    inputPath: positionals[0] ?? "",
    ...(outputDir ? { outputDir } : {}),
  };
}

function printHelp(): void {
  console.log(`promptimize

Usage:
  promptimize [options] <path>
  promptimize eval [options] [path]

Options:
  --dry-run              Analyze and optimize without writing files
  --in-place             Overwrite source files
  --output-dir <path>    Write outputs to custom directory
  --format <text|json>   Output report format (default: text)
  --ai                   Enable OpenAI-compatible AI provider with automatic fallback
  -h, --help             Show help`);
}

function printTextResult(result: Awaited<ReturnType<typeof runPromptimize>>): void {
  console.log(`mode: ${result.mode}`);
  console.log(`files scanned: ${result.totals.filesScanned}`);
  console.log(`files changed: ${result.totals.filesChanged}`);
  console.log(`tokens: ${result.totals.tokensBefore} -> ${result.totals.tokensAfter} (${result.totals.tokenDeltaPct}%)`);
  console.log(
    `providers: credentialed ${result.totals.providerUsage.credentialed}, local ${result.totals.providerUsage.local}, fallbacks ${result.totals.providerUsage.fallbacks}`,
  );
  for (const file of result.files) {
    const fallbackSuffix = file.provider.fallbackUsed
      ? ` fallback from ${file.provider.fallbackFrom ?? "credentialed-agent"} (error)`
      : "";
    console.log(
      `- ${file.sourcePath} -> ${file.outputPath} [${file.classification}] provider ${file.provider.selected}${fallbackSuffix} tokens ${file.metrics.tokenEstimateBefore} -> ${file.metrics.tokenEstimateAfter}`,
    );
  }
}

async function main(): Promise<void> {
  try {
    const argv = process.argv.slice(2);
    if (argv[0] === "eval") {
      await runEvalCli(argv.slice(1));
      return;
    }

    const options = parseArgs(argv);
    const provider = buildProviderChain(options.ai, createOpenAiOptimizeCall());
    const result = await runPromptimize(options, provider);
    if (options.format === "json") {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    printTextResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`promptimize error: ${message}`);
    process.exit(1);
  }
}

void main();
