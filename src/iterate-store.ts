import type { IterationRecord, ResultStore } from "./types";

export function createResultStore(filePath: string): ResultStore {
  return {
    async append(record: IterationRecord): Promise<void> {
      const existing = await readTextIfExists(filePath);
      const line = `${JSON.stringify(record)}\n`;
      await Bun.write(filePath, `${existing}${line}`);
    },

    async loadHistory(): Promise<IterationRecord[]> {
      const content = await readTextIfExists(filePath);
      if (!content) {
        return [];
      }

      return content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as IterationRecord);
    },
  };
}

async function readTextIfExists(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return "";
  }

  return file.text();
}
