# Agent Triage Workflow

When a user request arrives, you should start by restating the goal in one sentence so the intent stays visible.

It is recommended that you split the request into phases before editing files.

## Workflow

- In order to choose a path, map the request to one of: bug fix, feature, refactor, or docs maintenance.
- You should note assumptions in a short list before you touch implementation.
- Try to keep each edit narrowly scoped to the current objective.

## Verification expectations

You should run the smallest command that proves the change works.

```bash
bun run build
bun test tests/targeted.test.ts
```

Use the [review checklist](https://example.com/ops/review-checklist) before final output.
