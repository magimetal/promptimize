import type { ParsedMarkdown } from "./types";

const FRONTMATTER_RE = /^(---\r?\n[\s\S]*?\r?\n---\r?\n?)([\s\S]*)$/;

export function splitFrontmatter(markdown: string): ParsedMarkdown {
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatterRaw: "", body: markdown };
  }

  return {
    frontmatterRaw: match[1] ?? "",
    body: match[2] ?? "",
  };
}

export function joinFrontmatter(parsed: ParsedMarkdown): string {
  return `${parsed.frontmatterRaw}${parsed.body}`;
}
