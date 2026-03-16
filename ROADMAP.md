# promptimize roadmap

This roadmap tracks shipped reality, immediate bottlenecks, and a prioritized backlog for launch + post-launch growth.

## Status legend

- `SHIPPED` = implemented and in active use
- `NEXT` = highest-priority near-term work (target pre-launch)
- `HIGH` = pre-launch hardening unless explicitly deferred
- `POST-LAUNCH` = valuable but not required for first release
- `RESEARCH` = experiment tracks/hypotheses, not committed deliverables yet

---

## 1) Current reality snapshot (accurate as of now)

### Core shipped capabilities (`SHIPPED`)

- Optimize CLI works for file/directory discovery and output modes.
- Optional OpenAI-compatible optimize path is wired with local fallback.
- Provider reporting is included per-file and in aggregate output.
- Timeout/retry policy is implemented for OpenAI-compatible calls.
- Eval harness supports deterministic metrics + optional AI rubric judge.
- Iterate Phase A+B is shipped:
  - deterministic stratified train/hold-out split
  - max-iter/plateau stopping
  - AI candidate diversity control via iterate temperature
  - per-file AI-call budget enforcement
  - class-aware acceptance tuning
  - append-only NDJSON iteration store
  - structured iterate text/JSON reporting
- Starter-set and larger curated AI iterate runs have already been executed.

### Known hard truths (`SHIPPED` observations)

- AI/model latency dominates runtime much more than local processing.
- Token estimate still uses a coarse heuristic.
- Some markdown serialization paths can still inflate tokens.
- CI validates tests + eval JSON, but iterate validation remains incomplete.

---

## 2) Current bottlenecks (highest impact now)

## 2.1 Throughput ceiling: file-level concurrency limits (`NEXT`)

**Why it matters**

- End-to-end throughput is currently limited by sequential/broadly conservative processing.
- AI latency is dominant; without controlled parallelism, total run time scales poorly with corpus size.

**Actionable tasks**

- Add bounded file-level parallelism for optimize/eval/iterate execution.
- Add concurrency caps by stage (optimize generation vs judge scoring).
- Add provider-aware backpressure (respect retry pressure and timeout behavior).
- Add deterministic ordering guarantees in reports/output paths.

**Definition of done**

- Large corpus runtime improves materially without introducing nondeterministic report drift.
- Defaults remain safe for local Qwen/OpenAI-compatible endpoints.

---

## 2.2 Signal stability and acceptance confidence (`NEXT`)

**Why it matters**

- Iterate accept/reject decisions are only trustworthy when score variance is bounded.
- Near-threshold decisions currently risk flip-flopping across repeated runs.

**Actionable tasks**

- Add repeat-run variance checks on fixed starter corpus.
- Report confidence bands/noise windows alongside rubric deltas.
- Introduce explicit “indeterminate zone” handling near acceptance thresholds.
- Add score drift alerts in iterate summary output.

**Definition of done**

- Repeated runs on fixed corpus produce documented, bounded variance.
- Threshold decisions are explainable with explicit signal/noise context.

---

## 2.3 Eval baseline comparison maturity (`NEXT`)

**Why it matters**

- Current summaries show deltas, but baseline comparison ergonomics are still thin.
- Users need faster interpretation of “is this candidate actually better than baseline?”

**Actionable tasks**

- Add explicit baseline-vs-candidate comparison blocks in eval/iterate JSON and text outputs.
- Add class-level baseline trend summaries.
- Add regression flags for retention drops despite rubric gains.

**Definition of done**

- Eval/iterate outputs make baseline superiority/regression obvious without manual diffing.

---

## 2.4 Iterate validation in CI (`NEXT`)

**Why it matters**

- Iterate behavior can regress even when tests + eval still pass.

**Actionable tasks**

- Add iterate smoke CI job with bounded corpus + bounded iteration budget.
- Validate iterate report schema + NDJSON store contract in CI.
- Keep runtime bounded for PR cadence.

**Definition of done**

- CI fails on iterate contract regressions.
- Iterate smoke remains fast and stable.

---

## 2.5 Error recovery and partial-run survivability (`NEXT`)

**Why it matters**

- One failing file/provider path can still degrade full-run utility.

**Actionable tasks**

- Add continue-on-error and strict failure-threshold modes.
- Emit structured per-file failure records with stage/provider metadata.
- Improve retry/fallback telemetry for post-run triage.

**Definition of done**

- Batch runs produce usable partial results plus clear error accounting.

---

## 2.6 Token estimator upgrade (`NEXT`)

**Why it matters**

- `chars/4` makes optimization quality harder to judge precisely.

**Actionable tasks**

- Implement model-aware tokenizer path with graceful fallback estimator.
- Surface estimator source in optimize/eval/iterate reports.
- Add estimator consistency tests against representative model tokenizers.

**Definition of done**

- Reported token deltas align more closely with real model tokenization behavior.

---

## 2.7 Config ergonomics + environment onboarding (`NEXT`)

**Why it matters**

- Reproducible project-level runs need config support and clearer env setup.

**Actionable tasks**

- Add `promptimize.config.*` schema + discovery.
- Add CLI override precedence rules.
- Add `.env.example` with documented provider/eval/iterate knobs.

**Definition of done**

- Teams can run stable commands from config with minimal CLI boilerplate.
- Environment setup is discoverable and low-friction.

---

## 2.8 Utility dedup + internal architecture hygiene (`HIGH`)

**Why it matters**

- Shared logic around timing/reporting/errors/provider metadata can drift across optimize/eval/iterate paths.

**Actionable tasks**

- Consolidate duplicated helpers into shared internal utilities.
- Normalize stage timing and provider event models.
- Keep module boundaries small and single-responsibility.

**Definition of done**

- Fewer duplicate code paths for core reporting/recovery logic.
- Lower regression risk when extending optimize/eval/iterate features.

---

## 2.9 Class-specific AI prompt strategy (`HIGH`)

**Why it matters**

- Different doc classes need different optimization intent.
- A single generic prompt underperforms for discipline vs reference vs collaborative docs.

**Actionable tasks**

- Add class-scoped AI prompt templates.
- Add prompt metadata to result traces for auditability.
- Validate class-specific prompt impact via fixed-corpus eval.

**Definition of done**

- Measurable class-level quality gains without retention regressions.

---

## 2.10 Append-only store scaling + maintenance (`HIGH`)

**Why it matters**

- NDJSON append-only store is simple and robust, but read/analysis cost grows with run volume.

**Actionable tasks**

- Add index/manifest metadata for fast lookup by run/file/class.
- Add optional compaction/archive command.
- Add corruption detection + recovery guidance.

**Definition of done**

- Long-running experiment history remains fast to inspect and safe to maintain.

---

## 3) Pre-launch hardening wave (`HIGH`)

## 3.1 Lint/format enforcement in CI

- Add lint + format tooling/scripts.
- Gate PRs on lint/format/test/eval/iterate-smoke.

## 3.2 Test depth where risk is highest

- Expand CLI argument edge cases.
- Expand discovery edge cases (hidden paths/symlinks/non-markdown).
- Expand eval metric correctness and output path resolution tests.

## 3.3 Inflation guard completion

- Finish eval-side quality-vs-token-increase guardrail/reporting.
- Keep known inflation fixtures protected by regression tests.

## 3.4 Distribution story

- Finalize install/release channel (npm, Bun-friendly, or both).
- Validate external bin behavior and release process.

---

## 4) Ambitious backlog (organized feature expansion)

Inspired by practical gaps + patterns seen in `autoresearch`, `hermes-agent`, `qmd`, and `deepagentsjs`.

## 4.1 Experiment tracking and reproducibility (`POST-LAUNCH`)

- Run manifests with immutable config snapshot + env fingerprint.
- Checkpoint/resume for interrupted iterate/eval runs.
- Repro lockfiles for model/provider/judge settings.
- Run lineage graph (parent/child experiment relationships).

## 4.2 Performance/caching systems (`POST-LAUNCH`)

- Content-hash caching for unchanged file/stage outputs.
- Judge-response caching when prompt+candidate hash matches.
- Trajectory/history compression for long optimization sequences.
- Batch-mode provider requests where backend supports it.

## 4.3 Quality systems: multi-judge + hybrid generation (`POST-LAUNCH`)

- Multi-judge consensus (local + one or more AI judges).
- Hybrid candidate generation (rule-based seed + AI rewrites + mutation variants).
- Tie-breaker policies for conflicting judge outcomes.
- Confidence-weighted acceptance instead of single scalar threshold.

## 4.4 Granularity upgrades (`POST-LAUNCH`)

- Section-level optimization mode (target selected headings/regions).
- Region-level diff-aware writes instead of full-document rewrite.
- Class-specific micro-policies at section granularity.

## 4.5 Corpus operations and lifecycle (`POST-LAUNCH`)

- Corpus maintenance commands (add/sanitize/validate/list/stats).
- Tags/collections for fixture subsets (smoke/regression/class/provider).
- Drift detection and fixture refresh workflows.
- Golden-set curation mode for release gating.

## 4.6 Reporting and observability (`POST-LAUNCH`)

- Trend dashboards (quality/retention/tokens/runtime over time).
- Cost reporting (estimated/actual token + provider call spend).
- Per-stage flame/timing views for latency root-cause analysis.
- Regression alerting for score/runtime/cost anomalies.

## 4.7 SDK/API + integration surfaces (`POST-LAUNCH`)

- Stable programmatic SDK surface for optimize/eval/iterate.
- Embeddable API server mode for CI/platform integration.
- MCP server support for tool-driven agent workflows.
- Plugin/middleware architecture for custom scorers/judges/transforms.

## 4.8 Developer UX improvements (`POST-LAUNCH`)

- Watch mode for iterative local development loops.
- Rich diff output modes (unified/side-by-side/JSON patch).
- Better terminal progress/traceability for long runs.
- “why accepted / why rejected” explainability summaries per iteration.

---

## 5) Research tracks (time-boxed, evidence-driven)

## R1 — Concurrency vs quality stability (`RESEARCH`)

- Hypothesis: bounded parallelism reduces runtime without destabilizing acceptance outcomes.
- Measure: runtime delta, acceptance drift, retry/fallback rates.

## R2 — Class-specific prompts vs generic prompt (`RESEARCH`)

- Hypothesis: class-scoped prompts improve rubric + retention combined score.
- Measure: per-class deltas on fixed corpus with repeated runs.

## R3 — Multi-judge consensus value (`RESEARCH`)

- Hypothesis: consensus lowers false-positive accepts near threshold.
- Measure: variance reduction and downstream regression rate.

## R4 — Caching ROI (`RESEARCH`)

- Hypothesis: hash-based stage caching yields major speedups on iterative corpus tuning.
- Measure: wall-clock reduction and cache hit rates across repeated runs.

## R5 — Section-level optimization impact (`RESEARCH`)

- Hypothesis: section-level mode improves retention while preserving quality gains.
- Measure: retention shifts and user diff acceptability feedback.

---

## 6) Suggested execution order (next 45 days)

1. **Week 1:** Iterate CI smoke + schema contract checks.
2. **Week 1–2:** Signal stability instrumentation (variance + confidence bands).
3. **Week 2:** Eval baseline comparison improvements.
4. **Week 2–3:** File-level bounded parallelism + stage timing expansion.
5. **Week 3:** Error recovery/continue-on-error + structured failure reporting.
6. **Week 3–4:** Token estimator v2 + estimator transparency in reports.
7. **Week 4:** Config discovery + `.env.example`.
8. **Week 5:** Utility dedup pass to support maintainable growth.
9. **Week 6:** Class-specific AI prompt strategy and validation pass.

If capacity slips, keep focus on `NEXT` items before adding new `POST-LAUNCH` features.
