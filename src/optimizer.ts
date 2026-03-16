import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { visit } from "unist-util-visit";
import type { DocClass } from "./types";

type RuleReplacement = string | ((substring: string, ...args: Array<string | number>) => string);

interface TextRule {
  pattern: RegExp;
  replacement: RuleReplacement;
}

interface AstNode {
  type: string;
  value?: string;
  children?: AstNode[];
}

const COMMON_REPLACEMENTS: TextRule[] = [
  {
    pattern: /(^|[.!?]\s+|\n)\s*in order to\b/gi,
    replacement: (_substring: string, prefix: string | number) => `${String(prefix)}To`,
  },
  { pattern: /\s*\bit is important to note that\b\s*/gi, replacement: " " },
  { pattern: /\bin order to\b/gi, replacement: "to" },
  { pattern: /\bdue to the fact that\b/gi, replacement: "because" },
  { pattern: /\bat this point in time\b/gi, replacement: "now" },
  { pattern: /\bfor the purpose of\b/gi, replacement: "for" },
  { pattern: /\bin the event that\b/gi, replacement: "if" },
  { pattern: /\bhas the ability to\b/gi, replacement: "can" },
  { pattern: /\bhave the ability to\b/gi, replacement: "can" },
  { pattern: /\bit is possible that\b/gi, replacement: "may" },
  { pattern: /\ba large number of\b/gi, replacement: "many" },
  { pattern: /\bas a means to\b/gi, replacement: "to" },
  { pattern: /\bthis reference contains\b/gi, replacement: "reference:" },
  { pattern: /\bshould only contain\b/gi, replacement: "contain only" },
  { pattern: /\s*\bbasically\b\s*/gi, replacement: " " },
  { pattern: /\s*\bsimply\b\s*/gi, replacement: " " },
  { pattern: /\s*\bactually\b\s*/gi, replacement: " " },
  { pattern: /\s*\bjust\b\s*/gi, replacement: " " },
  { pattern: /\bnow now\b/gi, replacement: "now" },
];

const DIRECTIVE_REPLACEMENTS: TextRule[] = [
  {
    pattern: /\s+and you should never\s+(verify|skip|use|run|keep|write|check|avoid|prefer|validate)\b/gi,
    replacement: (_substring: string, verb: string | number) => `. Never ${String(verb).toLowerCase()}`,
  },
  {
    pattern: /\s+and you should always\s+(verify|skip|use|run|keep|write|check|avoid|prefer|validate)\b/gi,
    replacement: (_substring: string, verb: string | number) => `. Always ${String(verb).toLowerCase()}`,
  },
  {
    pattern: /\s+and never\s+(verify|skip|use|run|keep|write|check|avoid|prefer|validate)\b/gi,
    replacement: (_substring: string, verb: string | number) => `. Never ${String(verb).toLowerCase()}`,
  },
  {
    pattern: /\s+and always\s+(verify|skip|use|run|keep|write|check|avoid|prefer|validate)\b/gi,
    replacement: (_substring: string, verb: string | number) => `. Always ${String(verb).toLowerCase()}`,
  },
  {
    pattern: /(^|[.!?]\s+|\n)\s*you should\s+([a-z])/gi,
    replacement: (_substring: string, prefix: string | number, char: string | number) =>
      `${String(prefix)}${String(char).toUpperCase()}`,
  },
  {
    pattern: /\byou should\s+([a-z])/gi,
    replacement: (_substring: string, char: string | number) => String(char),
  },
  {
    pattern: /(^|[.!?]\s+|\n)\s*it is recommended that you\s+([a-z])/gi,
    replacement: (_substring: string, prefix: string | number, char: string | number) =>
      `${String(prefix)}${String(char).toUpperCase()}`,
  },
  {
    pattern: /\bit is recommended that you\s+([a-z])/gi,
    replacement: (_substring: string, char: string | number) => String(char),
  },
  {
    pattern: /(^|[.!?]\s+|\n)\s*it is recommended to\s+([a-z])/gi,
    replacement: (_substring: string, prefix: string | number, char: string | number) =>
      `${String(prefix)}${String(char).toUpperCase()}`,
  },
  {
    pattern: /\bit is recommended to\s+([a-z])/gi,
    replacement: (_substring: string, char: string | number) => String(char),
  },
  {
    pattern: /(^|\n)(\s*)using\b/gi,
    replacement: (_substring: string, prefix: string | number, indent: string | number) =>
      `${String(prefix)}${String(indent)}Use`,
  },
  { pattern: /\bgenerally not\b/gi, replacement: "usually not" },
  { pattern: /\bgenerally\b/gi, replacement: "usually" },
  { pattern: /\btry to\b/gi, replacement: "" },
  { pattern: /\bif possible\b/gi, replacement: "" },
  { pattern: /\bplease\b/gi, replacement: "" },
];

const DISCIPLINE_STRENGTHENING_REPLACEMENTS: TextRule[] = [
  {
    pattern: /\bit is recommended that you\s+(verify|skip|use|run|keep|write|check|avoid|prefer|validate)\b/gi,
    replacement: (_substring: string, verb: string | number) => `must ${String(verb).toLowerCase()}`,
  },
  {
    pattern: /\bit is recommended to\s+(verify|skip|use|run|keep|write|check|avoid|prefer|validate)\b/gi,
    replacement: (_substring: string, verb: string | number) => `must ${String(verb).toLowerCase()}`,
  },
];

export async function optimizeMarkdownBody(body: string, docClass: DocClass): Promise<string> {
  const processor = unified().use(remarkParse).use(remarkStringify, {
    bullet: "-",
    fences: true,
    listItemIndent: "one",
  });

  const tree = processor.parse(body);

  visit(tree, "text", (node, index, parent) => {
    const textNode = node as { value: string };
    textNode.value = optimizeTextValue(textNode.value, docClass);

    if (typeof index === "number" && index === 0 && parent && startsWithContainerBoundary(parent.type)) {
      textNode.value = textNode.value.replace(/^\s+/, "");
    }
  });

  cleanupAst(tree as AstNode);

  const stringified = processor.stringify(tree);
  return compactWhitespace(stringified);
}

function optimizeTextValue(value: string, docClass: DocClass): string {
  const base = applyRules(value, COMMON_REPLACEMENTS);
  if (docClass === "reference") {
    return normalizeSpacing(base);
  }

  if (docClass === "discipline") {
    const strengthened = applyRules(base, DISCIPLINE_STRENGTHENING_REPLACEMENTS);
    return normalizeSpacing(applyRules(strengthened, DIRECTIVE_REPLACEMENTS));
  }

  if (docClass === "guidance" || docClass === "collaborative") {
    return normalizeSpacing(applyRules(base, DIRECTIVE_REPLACEMENTS));
  }

  return normalizeSpacing(base);
}

function applyRules(input: string, rules: TextRule[]): string {
  let out = input;
  for (const { pattern, replacement } of rules) {
    out = typeof replacement === "string" ? out.replace(pattern, replacement) : out.replace(pattern, replacement);
  }
  return out;
}

function normalizeSpacing(input: string): string {
  return input
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1");
}

function cleanupAst(node: AstNode): void {
  if (!node.children) {
    return;
  }

  for (const child of node.children) {
    cleanupAst(child);
  }

  const merged: AstNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.value === "") {
      continue;
    }

    const previous = merged.at(-1);
    if (previous && previous.type === "text" && child.type === "text") {
      previous.value = `${previous.value ?? ""}${child.value ?? ""}`;
      continue;
    }

    merged.push(child);
  }

  node.children = merged;
}

function compactWhitespace(markdown: string): string {
  const collapsed = markdown
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();

  return collapsed.length === 0 ? "" : `${collapsed}\n`;
}

function startsWithContainerBoundary(nodeType: string): boolean {
  return nodeType === "paragraph" || nodeType === "heading" || nodeType === "listItem" || nodeType === "blockquote";
}
