import { readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";

export interface DiscoveryResult {
  root: string;
  files: string[];
}

export async function discoverMarkdownFiles(inputPath: string): Promise<DiscoveryResult> {
  const absolute = resolve(inputPath);
  const stat = await Bun.file(absolute).stat();

  if (stat.isFile()) {
    if (extname(absolute).toLowerCase() !== ".md") {
      throw new Error(`Input file is not markdown: ${absolute}`);
    }

    return { root: absolute, files: [absolute] };
  }

  if (!stat.isDirectory()) {
    throw new Error(`Input path is not a file or directory: ${absolute}`);
  }

  const files = await walkMarkdown(absolute);
  return { root: absolute, files };
}

async function walkMarkdown(root: string): Promise<string[]> {
  const out: string[] = [];
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }

      const fullPath = resolve(current, entry.name);
      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") {
        out.push(fullPath);
      }
    }
  }

  return out.sort();
}
