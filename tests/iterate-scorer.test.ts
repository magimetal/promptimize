import { describe, expect, test } from "bun:test";
import { buildRubricJudge } from "../src/eval-judge";
import { CandidateScorer } from "../src/iterate-scorer";

describe("CandidateScorer", () => {
  test("returns all score fields and tokenCount mirrors metrics tokenEstimate", async () => {
    const scorer = new CandidateScorer(buildRubricJudge(false));
    const original = "# Title\n\nUse clear structure.\n\n- Keep links\n";
    const candidate = "# Title\n\nUse clear structure.\n\n- Keep links\n";

    const score = await scorer.score({
      filePath: "/tmp/doc.md",
      classification: "guidance",
      originalBody: original,
      candidateBody: candidate,
    });

    expect(score.rubric.provider).toBe("local-rubric-judge");
    expect(score.metrics.tokenEstimate).toBeGreaterThan(0);
    expect(score.retention).toBe(100);
    expect(score.composite).toBeGreaterThan(0);
    expect(score.tokenCount).toBe(score.metrics.tokenEstimate);
  });

  test("computes expected deterministic composite for known metrics", async () => {
    const scorer = new CandidateScorer(buildRubricJudge(false));
    const markdown = "# Title\n\nUse tests.\n\n- Keep links\n";

    const score = await scorer.score({
      filePath: "/tmp/doc.md",
      classification: "guidance",
      originalBody: markdown,
      candidateBody: markdown,
    });

    const clarity = computeClarityFromAvgSentenceLength(score.metrics.avgSentenceLength);
    const structure = Math.max(
      0,
      Math.min(
        1,
        Math.min(score.metrics.headingCount, 4) / 4 * 0.4 +
          Math.min(score.metrics.listItemCount, 8) / 8 * 0.35 +
          Math.min(score.metrics.codeFenceCount + score.metrics.linkCount, 6) / 6 * 0.25,
      ),
    );
    const actionability = Math.max(0, Math.min(1, 0.3 + Math.min(score.metrics.imperativeCount, 8) / 8 * 0.7));
    const expectedComposite = Number(
      ((clarity * 0.3 + structure * 0.25 + actionability * 0.2 + (score.retention / 100) * 0.25) * 100).toFixed(2),
    );

    expect(score.composite).toBe(expectedComposite);
  });

  test("retention passes through scorer output", async () => {
    const scorer = new CandidateScorer(buildRubricJudge(false));
    const original = "# Important\n\nUse the command:\n\n```bash\nbun test\n```\n";

    const fullRetention = await scorer.score({
      filePath: "/tmp/doc.md",
      classification: "discipline",
      originalBody: original,
      candidateBody: original,
    });

    const lowRetention = await scorer.score({
      filePath: "/tmp/doc.md",
      classification: "discipline",
      originalBody: original,
      candidateBody: "",
    });

    expect(fullRetention.retention).toBe(100);
    expect(lowRetention.retention).toBeLessThan(50);
  });
});

function computeClarityFromAvgSentenceLength(avgSentenceLength: number): number {
  if (avgSentenceLength <= 0) {
    return 0.7;
  }

  if (avgSentenceLength >= 8 && avgSentenceLength <= 20) {
    return 1;
  }

  if (avgSentenceLength < 8) {
    return Math.max(0, Math.min(1, Number(Math.max(82, 100 - (8 - avgSentenceLength) * 3).toFixed(2)) / 100));
  }

  return Math.max(0, Math.min(1, Number(Math.max(0, 100 - (avgSentenceLength - 20) * 3).toFixed(2)) / 100));
}
