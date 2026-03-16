# promptimize roadmap

This roadmap tracks what is still required before promptimize is launch-ready.

Status labels:

- `BLOCKER` = must complete before launch
- `HIGH` = should complete before launch unless explicitly deferred
- `POST-LAUNCH` = valuable, but not required for first release

---

## Phase 0 — Launch blockers (`BLOCKER`)

## 0.1 Wire real AI optimization path into main optimize pipeline

**Why this is a blocker**

- The CLI exposes `--ai`, but optimize currently stays rule-based because no LLM call is passed into the provider chain.
- This creates a capability/expectation mismatch for users.

**Actionable tasks**

- Implement a real `llmCall` path for optimize command.
- Add explicit provider selection/reporting in optimize output (`local` vs `credentialed`).
- Keep safe fallback to local optimizer if credentials/call fail.
- Add timeout + retry policy for credentialed provider.

**Definition of done**

- `promptimize --ai <path>` uses credentialed provider when key exists.
- On auth/network/model failure, run completes with local fallback and clear warning.
- Tests cover: credential success, missing key fallback, runtime failure fallback.

---

## 0.2 Fix token inflation regressions from markdown serialization

**Why this is a blocker**

- Some fixtures show token growth after optimization due to AST stringify/reflow behavior.
- This weakens trust in the “optimization” claim.

**Actionable tasks**

- Add targeted fixtures that currently inflate.
- Adjust stringify strategy and/or whitespace compaction rules to avoid token-expanding rewrites.
- Add guardrail in optimize/eval to flag regressions where quality does not improve enough to justify token increase.

**Definition of done**

- Known inflation fixtures no longer regress or are explicitly justified by quality gains.
- Regression tests enforce no accidental inflation for baseline fixtures.

---

## 0.3 Repository hygiene baseline

**Why this is a blocker**

- No git repository metadata, `.gitignore`, or `LICENSE` in the current project state.
- This blocks clean collaboration and distribution readiness.

**Actionable tasks**

- Initialize git repository if not already managed upstream.
- Add `.gitignore` for Bun/TS outputs and local artifacts.
- Add project license file.

**Definition of done**

- Repo has version control metadata.
- Build/test artifacts are ignored.
- License is explicit and visible.

---

## 0.4 Remove or formalize unused build outputs

**Why this is a blocker**

- Output behavior and artifact expectations are currently ambiguous.
- Ambiguity increases accidental clutter and user confusion.

**Actionable tasks**

- Audit generated outputs from optimize/eval workflows.
- Document which artifacts are intentional.
- Remove dead outputs or move them to explicit artifact directories.

**Definition of done**

- All generated artifacts have a documented purpose.
- No unexplained files appear during normal workflows.

---

## Phase 1 — Pre-launch hardening (`HIGH`)

## 1.1 Add linter + formatter and enforce in CI

**Actionable tasks**

- Add lint and format tooling for TypeScript.
- Add scripts (`lint`, `format:check`, optional `format`).
- Gate PRs on lint/test/eval.

**Definition of done**

- CI fails on lint/format violations.
- Local contributor workflow includes deterministic formatting.

---

## 1.2 Expand test coverage where risk is highest

Current tests cover core paths but still miss key edge cases in CLI/discovery/metrics.

**Actionable tasks**

- CLI argument parsing: invalid/missing combinations, error messaging.
- Discovery edge cases: symlink handling, non-markdown inputs, hidden path behavior.
- Eval metrics correctness for retention/actionability edge cases.
- Output path resolution for single vs multi-file and custom output dirs.

**Definition of done**

- New tests cover failure/edge paths, not just happy paths.
- Coverage is sufficient to refactor parser/discovery/metrics safely.

---

## 1.3 Improve token estimation quality

**Actionable tasks**

- Replace `chars / 4` heuristic with model-aware token counting strategy.
- Keep a fallback estimator when tokenizer package is unavailable.
- Surface estimator type in reports for transparency.

**Definition of done**

- Reported token deltas better align with real tokenizer output.
- Docs explain estimator method and caveats.

---

## 1.4 Add robust error recovery/reporting

**Actionable tasks**

- Support continue-on-error mode for batch runs.
- Emit structured error report per file.
- Return non-zero exit code only when failure threshold is exceeded or strict mode is enabled.

**Definition of done**

- One bad file does not necessarily kill full corpus run.
- Users can identify exactly which files failed and why.

---

## 1.5 Add config file support

**Actionable tasks**

- Define config schema (input globs, output mode, class overrides, provider settings).
- Add default config discovery (`promptimize.config.*`).
- Allow CLI flags to override config values.

**Definition of done**

- Reproducible project-level runs without long CLI command strings.

---

## Phase 2 — Distribution + adoption (`HIGH` / `POST-LAUNCH`)

## 2.1 Ship a practical distribution story (`HIGH`)

**Actionable tasks**

- Decide release channel (npm package, Bun-friendly install instructions, or both).
- Add versioning/release process.
- Validate bin behavior outside repo checkout.

**Definition of done**

- New user can install and run `promptimize` without cloning source.

---

## 2.2 Improve docs for users and maintainers (`HIGH`)

**Actionable tasks**

- Keep README behavior matrix current with real implementation.
- Add troubleshooting section for credentialed judge/provider failures.
- Add examples for common project layouts and safe in-place usage.

**Definition of done**

- New contributor can run build/test/eval and understand limits without reading source code.

---

## 2.3 Expand benchmark realism (`POST-LAUNCH`)

**Actionable tasks**

- Add more real-derived guidance/collaborative/reference fixtures.
- Add fixture rotation/update cadence.
- Add benchmark trend tracking between releases.

**Definition of done**

- Corpus better represents real-world instruction docs and drift over time.

---

## Suggested execution order (next 30 days)

1. **Week 1:** 0.1 AI optimize wiring + tests
2. **Week 1–2:** 0.2 token inflation fixes + regression fixtures
3. **Week 2:** 0.3 repo hygiene + 0.4 output cleanup
4. **Week 3:** 1.1 lint/format + CI gating
5. **Week 3–4:** 1.2 coverage expansion + 1.4 error recovery
6. **Week 4:** 1.3 token estimator upgrade + 1.5 config file MVP

If schedule slips, defer Phase 2. Do not defer Phase 0.
