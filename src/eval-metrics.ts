import type { DeterministicMetrics, DocClass } from "./types";

export function analyzeMarkdownMetrics(markdown: string): DeterministicMetrics {
  const headings = markdown.match(/^#{1,6}\s+/gm) ?? [];
  const listItems = markdown.match(/^\s*[-*+]\s+/gm) ?? [];
  const codeFences = markdown.match(/```/g) ?? [];
  const links = markdown.match(/\[[^\]]+\]\(([^)]+)\)/g) ?? [];
  const sentenceImperatives = markdown.match(/(^|[.!?]\s+|\n)\s*(use|verify|run|keep|write|check|avoid|prefer|validate)\b/gim) ?? [];
  const directivePairs =
    markdown.match(/\b(always|never|must|required(?:\s+to)?)\s+(verify|skip|use|run|keep|write|check|avoid|prefer|validate)\b/gi) ??
    [];
  const sentenceLengths = extractSentenceLengths(markdown);

  return {
    tokenEstimate: estimateTokens(markdown),
    headingCount: headings.length,
    listItemCount: listItems.length,
    codeFenceCount: Math.floor(codeFences.length / 2),
    linkCount: links.length,
    imperativeCount: sentenceImperatives.length + directivePairs.length,
    avgSentenceLength: average(sentenceLengths),
  };
}

export function computeRetentionScore(original: string, candidate: string): number {
  const headingScore = ratio(extractHeadings(original).length, countRetained(extractHeadings(original), extractHeadings(candidate)));
  const linkScore = ratio(extractLinks(original).length, countRetained(extractLinks(original), extractLinks(candidate)));
  const directiveScore = ratio(extractDirectiveTerms(original).length, countRetained(extractDirectiveTerms(original), extractDirectiveTerms(candidate)));
  const codeFenceScore = ratio(countCodeFenceBlocks(original), countCodeFenceBlocks(candidate));

  const weighted = headingScore * 0.35 + linkScore * 0.25 + directiveScore * 0.2 + codeFenceScore * 0.2;
  return round2(weighted * 100);
}

export function computeDeterministicComposite(
  metrics: DeterministicMetrics,
  classification: DocClass,
  retentionScore: number,
): number {
  const clarity = clamp01(computeClarityScore(metrics.avgSentenceLength) / 100);
  const structure = clamp01(
    Math.min(metrics.headingCount, 4) / 4 * 0.4 +
      Math.min(metrics.listItemCount, 8) / 8 * 0.35 +
      Math.min(metrics.codeFenceCount + metrics.linkCount, 6) / 6 * 0.25,
  );

  const actionabilityBase =
    classification === "reference"
      ? 0.7 + Math.min(metrics.imperativeCount, 2) * 0.05
      : 0.3 + Math.min(metrics.imperativeCount, 8) / 8 * 0.7;
  const actionability = clamp01(actionabilityBase);

  const weighted = clarity * 0.3 + structure * 0.25 + actionability * 0.2 + clamp01(retentionScore / 100) * 0.25;
  return round2(weighted * 100);
}

export function computeClarityScore(avgSentenceLength: number): number {
  if (avgSentenceLength <= 0) {
    return 70;
  }

  if (avgSentenceLength >= 8 && avgSentenceLength <= 20) {
    return 100;
  }

  if (avgSentenceLength < 8) {
    return round2(Math.max(82, 100 - (8 - avgSentenceLength) * 3));
  }

  return round2(Math.max(0, 100 - (avgSentenceLength - 20) * 3));
}

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

export function percentDelta(before: number, after: number): number {
  if (before === 0) {
    return 0;
  }

  return round2(((after - before) / before) * 100);
}

function extractHeadings(markdown: string): string[] {
  return (markdown.match(/^#{1,6}\s+.+$/gm) ?? []).map((line) => line.trim().toLowerCase());
}

function extractLinks(markdown: string): string[] {
  const matches = markdown.match(/\[[^\]]+\]\(([^)]+)\)/g) ?? [];
  return matches.map((item) => item.toLowerCase());
}

function extractDirectiveTerms(markdown: string): string[] {
  const directives = markdown.match(/\b(must|never|always|required|no exceptions)\b/gi) ?? [];
  return directives.map((item) => item.toLowerCase());
}

function countCodeFenceBlocks(markdown: string): number {
  return Math.floor((markdown.match(/```/g) ?? []).length / 2);
}

function countRetained(baseline: string[], candidate: string[]): number {
  if (baseline.length === 0) {
    return candidate.length === 0 ? 1 : 0;
  }

  const set = new Set(candidate);
  return baseline.filter((item) => set.has(item)).length;
}

function ratio(before: number, after: number): number {
  if (before === 0) {
    return 1;
  }

  return clamp01(after / before);
}

function extractSentenceLengths(markdown: string): number[] {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "");
  const sentences = stripped
    .split(/[.!?]+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  return sentences.map((sentence) => sentence.split(/\s+/).filter(Boolean).length);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}
