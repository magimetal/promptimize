import { describe, expect, test } from "bun:test";
import { optimizeMarkdownBody } from "../src/optimizer";

describe("optimizeMarkdownBody", () => {
  test("converts 'you should' to imperative without broken grammar", async () => {
    const input = "You should verify links before publishing.\n";
    const output = await optimizeMarkdownBody(input, "guidance");

    expect(output).toContain("Verify links before publishing.");
    expect(output).not.toContain("must verify");
  });

  test("does not invert meaning for 'generally not'", async () => {
    const input = "This is generally not required for local runs.\n";
    const output = await optimizeMarkdownBody(input, "discipline");

    expect(output).toContain("usually not required");
    expect(output).not.toContain("always not");
  });

  test("applies safe verbose phrase reductions", async () => {
    const input = "In order to proceed, it is important to note that a large number of users have the ability to run this now at this point in time.\n";
    const output = await optimizeMarkdownBody(input, "guidance");

    expect(output).toContain("To proceed");
    expect(output).toContain("many users can run this now");
    expect(output.length).toBeLessThan(input.length);
  });

  test("keeps reference docs neutral", async () => {
    const input = "You should verify endpoint parameters for each schema.\n";
    const output = await optimizeMarkdownBody(input, "reference");

    expect(output).toContain("You should verify endpoint parameters for each schema.");
  });

  test("normalizes checklist verb form at list-item starts", async () => {
    const input = "- Using === and !==\n- Using optional chaining\n";
    const output = await optimizeMarkdownBody(input, "discipline");

    expect(output).toContain("- Use === and !==");
    expect(output).toContain("- Use optional chaining");
  });

  test("preserves links and code fences while cleaning text", async () => {
    const input = "Please, you should simply read [docs](https://example.com).\n\n```ts\nconst value = 'you should stay';\n```\n";
    const output = await optimizeMarkdownBody(input, "guidance");

    expect(output).toContain("[docs](https://example.com)");
    expect(output).toContain("const value = 'you should stay';");
    expect(output).not.toContain("  ");
  });

  test("splits joined directive clauses into explicit commands", async () => {
    const input = "Run smoke tests and never skip alert validation.\n";
    const output = await optimizeMarkdownBody(input, "discipline");

    expect(output).toContain("Run smoke tests. Never skip alert validation.");
  });

  test("strengthens soft recommendations in discipline docs", async () => {
    const input = "It is recommended that you run smoke tests before deploy.\n";
    const output = await optimizeMarkdownBody(input, "discipline");

    expect(output).toContain("must run smoke tests before deploy.");
  });

  test("does not emit escaped-space artifact after removing leading phrase", async () => {
    const input = "It is important to note that you should always verify production variables.\n";
    const output = await optimizeMarkdownBody(input, "discipline");

    expect(output).not.toContain("&#x20;");
    expect(output).toContain("Always verify production variables.");
  });

  test("capitalizes 'In order to' replacement at sentence start", async () => {
    const input = "In order to deploy safely, run smoke tests.\n";
    const output = await optimizeMarkdownBody(input, "guidance");

    expect(output).toContain("To deploy safely, run smoke tests.");
    expect(output).not.toContain("to deploy safely, run smoke tests.");
  });
});
