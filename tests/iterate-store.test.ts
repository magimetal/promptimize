import { rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import { createResultStore } from "../src/iterate-store";
import type { IterationRecord } from "../src/types";

describe("createResultStore", () => {
  test("append/loadHistory round-trip retains all fields", async () => {
    const filePath = createTempStorePath();
    const store = createResultStore(filePath);
    const records = [createRecord(1), createRecord(2), createRecord(3)];

    try {
      for (const record of records) {
        await store.append(record);
      }

      const loaded = await store.loadHistory();
      expect(loaded).toEqual(records);
    } finally {
      await cleanup(filePath);
    }
  });

  test("loadHistory returns empty array when file does not exist", async () => {
    const filePath = createTempStorePath();
    const store = createResultStore(filePath);

    try {
      const loaded = await store.loadHistory();
      expect(loaded).toEqual([]);
    } finally {
      await cleanup(filePath);
    }
  });

  test("loadHistory ignores trailing empty lines", async () => {
    const filePath = createTempStorePath();
    const record = createRecord(1);
    await Bun.write(filePath, `${JSON.stringify(record)}\n\n`);

    const store = createResultStore(filePath);
    try {
      const loaded = await store.loadHistory();
      expect(loaded).toEqual([record]);
    } finally {
      await cleanup(filePath);
    }
  });
});

function createTempStorePath(): string {
  return resolve(import.meta.dir, `../benchmarks/iterate-results-test-${randomUUID()}.ndjson`);
}

async function cleanup(filePath: string): Promise<void> {
  await rm(filePath, { force: true });
}

function createRecord(iter: number): IterationRecord {
  const beforeToken = 100 + iter;
  const afterToken = 99 + iter;

  return {
    iter,
    filePath: `/tmp/doc-${iter}.md`,
    classification: "guidance",
    candidateBody: `candidate-${iter}`,
    scoreBefore: {
      rubric: {
        provider: "test-judge",
        overall: 70,
        clarity: 70,
        structure: 70,
        actionability: 70,
        preservation: 80,
        rationale: "before",
      },
      metrics: {
        tokenEstimate: beforeToken,
        headingCount: 1,
        listItemCount: 1,
        codeFenceCount: 0,
        linkCount: 0,
        imperativeCount: 1,
        avgSentenceLength: 12,
      },
      retention: 80,
      composite: 70,
      tokenCount: beforeToken,
    },
    scoreAfter: {
      rubric: {
        provider: "test-judge",
        overall: 71,
        clarity: 71,
        structure: 71,
        actionability: 71,
        preservation: 80,
        rationale: "after",
      },
      metrics: {
        tokenEstimate: afterToken,
        headingCount: 1,
        listItemCount: 1,
        codeFenceCount: 0,
        linkCount: 0,
        imperativeCount: 1,
        avgSentenceLength: 12,
      },
      retention: 80,
      composite: 71,
      tokenCount: afterToken,
    },
    accepted: true,
    acceptanceReason: "all criteria met",
    aiCallMade: false,
    durationMs: 5,
  };
}
