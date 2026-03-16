import { describe, expect, test } from "bun:test";
import { joinFrontmatter, splitFrontmatter } from "../src/frontmatter";
import { optimizeMarkdownBody } from "../src/optimizer";

describe("frontmatter + structural preservation", () => {
  test("preserves frontmatter, code fences, and links", async () => {
    const source = `---
name: demo
description: test
---
You should simply read [the guide](https://example.com/docs).

\`\`\`ts
const shouldStay = "you should not mutate code fences";
\`\`\`
`;

    const parsed = splitFrontmatter(source);
    const optimized = await optimizeMarkdownBody(parsed.body, "guidance");
    const output = joinFrontmatter({ ...parsed, body: optimized });

    expect(output.startsWith("---\nname: demo")).toBeTrue();
    expect(output).toContain("https://example.com/docs");
    expect(output).toContain('const shouldStay = "you should not mutate code fences";');
    expect(output).not.toContain("simply read");
  });
});
