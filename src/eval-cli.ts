#!/usr/bin/env bun
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { formatEvalText, runEvaluation } from "./eval";
import type { EvalCliOptions } from "./types";

function parseEvalArgs(argv: string[]): EvalCliOptions {
  let format: EvalCliOptions["format"] = "text";
  let ai = false;
  let verbose = false;
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

    if (arg === "--verbose") {
      verbose = true;
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

    if (arg === "--report-file") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--report-file requires a path");
      }

      reportFile = value;
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

  if (positionals.length > 1) {
    throw new Error("Provide at most one benchmark path");
  }

  return {
    format,
    ai,
    ...(verbose ? { verbose: true } : {}),
    ...(positionals[0] ? { inputPath: positionals[0] } : {}),
    ...(reportFile ? { reportFile } : {}),
  };
}

function printHelp(): void {
  console.log(`promptimize eval

Usage:
  promptimize eval [options] [path]

Options:
  --format <text|json>   Output report format (default: text)
  --report-file <path>   Write JSON report to a file
  --verbose              Print original and optimized file bodies (text format only)
  --ai                   Enable credentialed rubric judge with local fallback
  -h, --help             Show help`);
}

export async function runEvalCli(argv: string[]): Promise<void> {
  const options = parseEvalArgs(argv);
  const result = await runEvaluation(options);
  const jsonText = JSON.stringify(result, null, 2);

  if (options.reportFile) {
    const target = resolve(options.reportFile);
    await mkdir(dirname(target), { recursive: true });
    await Bun.write(target, `${jsonText}\n`);
  }

  if (options.format === "json") {
    console.log(jsonText);
    return;
  }

  console.log(formatEvalText(result, options));
}

async function main(): Promise<void> {
  try {
    await runEvalCli(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`promptimize eval error: ${message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  void main();
}
