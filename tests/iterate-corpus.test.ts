import { describe, expect, test } from "bun:test";
import { discoverMarkdownFiles } from "../src/discovery";
import { classifyFixturePath, splitCorpus } from "../src/iterate-corpus";
import type { DocClass } from "../src/types";

describe("splitCorpus", () => {
  test("creates deterministic stratified split for benchmark fixtures", async () => {
    const discovered = await discoverMarkdownFiles(`${import.meta.dir}/../benchmarks/fixtures`);
    const split = splitCorpus(discovered.files, 0.25);

    expect(split.train.length).toBe(11);
    expect(split.holdOut.length).toBe(5);
    expect(split.train.length + split.holdOut.length).toBe(discovered.files.length);

    const classes = classCounts(discovered.files);
    const holdOutClasses = classCounts(split.holdOut);
    const trainClasses = classCounts(split.train);

    for (const docClass of Object.keys(classes) as DocClass[]) {
      expect(holdOutClasses[docClass]).toBeGreaterThanOrEqual(1);
      expect(trainClasses[docClass]).toBeGreaterThanOrEqual(1);
    }
  });

  test("returns same split for same input", () => {
    const files = [
      "/tmp/discipline-z.md",
      "/tmp/discipline-a.md",
      "/tmp/guidance-a.md",
      "/tmp/guidance-z.md",
      "/tmp/collaborative-a.md",
      "/tmp/reference-a.md",
    ];

    const first = splitCorpus(files, 0.25);
    const second = splitCorpus(files, 0.25);
    expect(first).toEqual(second);
  });

  test("single-file class goes to hold-out", () => {
    const files = ["/tmp/solo.md"];
    const split = splitCorpus(files, 0.25, () => "reference");

    expect(split.holdOut).toEqual(["/tmp/solo.md"]);
    expect(split.train).toEqual([]);
  });
});

function classCounts(files: string[]): Record<DocClass, number> {
  const counts: Record<DocClass, number> = {
    discipline: 0,
    guidance: 0,
    collaborative: 0,
    reference: 0,
  };

  for (const file of files) {
    const docClass = classifyFixturePath(file);
    counts[docClass] += 1;
  }

  return counts;
}
