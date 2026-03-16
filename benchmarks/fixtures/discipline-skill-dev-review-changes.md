<!--
  fixture: real-derived
  source-class: skill
  origin: dev-review-changes/SKILL.md
  snapshotted: 2026-03-16
  sanitized: yes
-->

---
name: dev-review-changes
description: Deep-review the current local branch diff (working tree and/or staged changes) for logic/bug/race issues, extraction opportunities, and code smells; then produce a practical plan to resolve the findings.
---

## What this skill does

This skill performs the same style of deep scrutiny as a PR review, but against **your current local changes**.

It:

1) Captures the current branch context + change scope.
2) Reviews the diff (and, when helpful, the affected files) to identify:
   - Logic issues / bugs / race conditions
   - Extraction opportunities (helpers)
   - Code smells (duplication, anti-patterns, long logic)
3) Produces a structured set of findings with stable IDs.
4) Produces a **basic, actionable plan** to resolve the findings (ordered, scoped, with verification steps).

## When to use

- You have local changes on a branch and want a deep review before opening/updating a PR.
- You want a repeatable review format with evidence and actionable recommendations.

## Inputs to request from the user (ask only if missing)

1) Diff scope (required):
   - `working-tree` (unstaged)
   - `staged`
   - `both` (Recommended)
   - `since-base` (diff against a base branch)
2) If `since-base`: base ref (optional; default to upstream merge-base if detected, otherwise ask)
3) Verification (optional): commands to run (tests/lint/typecheck) or `skip`.
4) Plan preference (optional):
   - `basic` (default): 5-12 step checklist
   - `detailed`: grouped by themes (correctness, refactor, tests, cleanup)
   - `minimal`: top 3 highest-impact fixes only

## Workflow

### Step 1 — Capture context

Run:

```bash
git status -sb
git rev-parse --abbrev-ref HEAD
git log -5 --oneline
```

If `since-base` is requested, attempt to determine base:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u} || true
git merge-base HEAD @{u} 2>/dev/null || true
```

If no upstream is configured, ask for `base` (common: `origin/develop`).

### Step 2 — Collect diff artifacts

Depending on scope:

#### Working tree
```bash
git diff --name-only
git diff --color=never > /tmp/git-diff-working-tree.diff
```

#### Staged
```bash
git diff --staged --name-only
git diff --staged --color=never > /tmp/git-diff-staged.diff
```

#### Both (recommended)
Collect both diffs and treat them as one review set.

#### Since base
```bash
git diff --name-only <base>...HEAD
git diff --color=never <base>...HEAD > /tmp/git-diff-since-base.diff
```

### Step 3 — Deep review pass

For each changed file:

1) Summarize the intent of the change.
2) Identify risks:
   - race conditions (out-of-order responses, shared loading flags)
   - stale state hazards, missing guards, error handling pitfalls
   - SSR/DI/lifecycle hazards, API contract mismatches
3) Identify refactors:
   - extract helpers for mapping/building/parsing
   - reduce deep nesting / large effect bodies
4) Identify smells:
   - duplication, misleading naming, unused code paths

Produce findings as stable IDs:

```text
[B1] (High) <title>
Evidence: <file>:<line(s)>
Why it matters: <impact>
Recommendation: <specific fix>
```

### Step 4 — Produce a resolution plan

Generate a plan that is:

- **Ordered** (highest severity/risk first)
- **Scoped** (avoid drive-by refactors)
- **Concrete** (specific edits, target files, suggested helper extractions)
- **Verifiable** (tests/commands or manual checks)

Plan format (basic):

```text
## Resolution plan
1. [B1] ... (file:line)
   - Change: ...
   - Verify: ...
2. [S3] ...
   - Change: ...
   - Verify: ...
...

## Suggested verification
- <command>
- <command>
```

If multiple findings are related, group them into a single plan step and reference all IDs.

### Step 5 — Optional verification

If user provided commands (or a standard suite), run them and report exact output summary.

## Guardrails

- Do not invent code; cite evidence (file + line).
- Prefer minimal, targeted refactors in recommendations.
- Do not run destructive git operations.
- Do not create commits unless explicitly requested.

## Notes / interoperability

- If you later want to post review comments to GitHub, use the `gh-pr-deep-review` skill for anchoring + posting.
