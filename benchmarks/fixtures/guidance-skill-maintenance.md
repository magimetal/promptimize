# Skill Maintenance Notes

This document explains how to keep skill instructions current as project behavior changes.

It is important to note that you should update sample snippets in order to reflect real command behavior.

## Update cycle

- You should review recent merged changes and identify instruction drift.
- It is recommended to rewrite stale sections with direct wording.
- If possible, remove duplicated guidance that appears in multiple places.

## Content quality

Using concrete before/after snippets is usually better than long prose because readers can scan faster.

```md
## Before
You should maybe consider checking test output.

## After
Check test output and paste the failing command.
```

For additional context, check [instruction style guide](https://example.com/docs/instruction-style).
