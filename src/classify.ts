import { basename } from "node:path";
import type { DocClass } from "./types";

const DISCIPLINE_HINTS = [
  "must",
  "required",
  "no exceptions",
  "never",
  "always",
  "security",
  "compliance",
  "enforcement",
  "critical",
  "forbidden",
];

const COLLABORATIVE_HINTS = [
  "code review",
  "pair",
  "team",
  "collabor",
  "shared",
  "our",
  "colleagues",
  "reviewer",
  "handoff",
];

const REFERENCE_HINTS = [
  "api",
  "parameters",
  "schema",
  "endpoint",
  "changelog",
  "reference",
  "table",
  "glossary",
  "examples",
  "usage",
];

export function classifyDocument(filePath: string, body: string): DocClass {
  const normalized = body.toLowerCase();
  const name = basename(filePath).toLowerCase();
  const pathText = filePath.toLowerCase();

  if (name === "skill.md") {
    return "guidance";
  }

  if (pathText.includes("/agents/") || pathText.includes("/.opencode/agents/")) {
    return "guidance";
  }

  if (isReference(name, normalized)) {
    return "reference";
  }

  if (containsAny(normalized, DISCIPLINE_HINTS)) {
    return "discipline";
  }

  if (containsAny(normalized, COLLABORATIVE_HINTS)) {
    return "collaborative";
  }

  return "guidance";
}

function isReference(name: string, body: string): boolean {
  const nameWithoutExt = name.replace(/\.md$/i, "");
  const refName =
    containsNameToken(nameWithoutExt, "api") ||
    containsNameToken(nameWithoutExt, "reference") ||
    containsNameToken(nameWithoutExt, "schema") ||
    containsNameToken(nameWithoutExt, "changelog");

  const refContent = containsAny(body, REFERENCE_HINTS);
  return refName || (refContent && !containsAny(body, DISCIPLINE_HINTS));
}

function containsAny(text: string, hints: string[]): boolean {
  return hints.some((hint) => buildHintPattern(hint).test(text));
}

function containsNameToken(nameWithoutExt: string, token: string): boolean {
  return buildHintPattern(token).test(nameWithoutExt);
}

function buildHintPattern(hint: string): RegExp {
  const escaped = hint
    .trim()
    .split(/\s+/)
    .map((part) => escapeRegex(part))
    .join("\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
