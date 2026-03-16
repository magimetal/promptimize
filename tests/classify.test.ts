import { describe, expect, test } from "bun:test";
import { classifyDocument } from "../src/classify";

describe("classifyDocument", () => {
  test("detects skill markdown as guidance", () => {
    const result = classifyDocument("/tmp/my-skill/SKILL.md", "Use this when...");
    expect(result).toBe("guidance");
  });

  test("keeps API reference neutral", () => {
    const result = classifyDocument(
      "/tmp/docs/api-reference.md",
      "API parameters table with endpoint schemas and examples.",
    );
    expect(result).toBe("reference");
  });

  test("detects discipline language", () => {
    const result = classifyDocument("/tmp/docs/rules.md", "You must always validate security boundaries.");
    expect(result).toBe("discipline");
  });

  test("does not misclassify substring false positives", () => {
    const guidance = classifyDocument(
      "/tmp/docs/notes.md",
      "Your workflow should be comfortable. Please capitalize headings and keep four samples.",
    );

    expect(guidance).toBe("guidance");
  });

  test("does not classify filename substrings as reference", () => {
    const result = classifyDocument("/tmp/docs/capitalize.md", "General style instructions.");
    expect(result).toBe("guidance");
  });
});
