# promptimize

`promptimize` is a standalone Bun + TypeScript CLI for optimizing Markdown instruction docs (skills, agents, runbooks, references) for AI execution quality and token efficiency.

It is **usable now** for deterministic rule-based optimization and benchmark evaluation. It is **not launch-complete yet** (see [Current maturity](#current-maturity--honest-status) and [ROADMAP.md](./ROADMAP.md)).

## What promptimize does

- Discovers Markdown files from a single file or directory (recursive, non-hidden files).
- Preserves YAML frontmatter exactly and keeps code fences + links intact.
- Classifies docs as `discipline`, `guidance`, `collaborative`, or `reference`.
- Applies class-aware text normalization and directive-strengthening rules.
- Writes optimized output side-by-side by default, or in-place/custom output directory.
- Reports per-file and aggregate deltas (chars + estimated tokens).
- Includes a benchmark/eval harness with deterministic metrics plus optional AI rubric judging.

## Current maturity / honest status

### ✅ Working today

- End-to-end local optimization pipeline (`bun run promptimize -- <path>`).
- Optional OpenAI-compatible AI optimization path (`bun run promptimize -- --ai <path>`) with local fallback.
- Optimize output now reports provider usage per file and in totals (credentialed/local/fallback counts).
- Eval harness with per-file and per-class scoring (`bun run eval`).
- Iterative optimizer Phase A+B loop over benchmark corpus (`bun run iterate`) with AI candidate diversity controls, AI-call budgeting, structured trend reporting, train/hold-out split, acceptance criteria, and NDJSON iteration logs.
- Local deterministic rubric judge.
- Optional OpenAI-compatible AI judge path for eval (`bun run eval -- --ai`) with local fallback.
- Real-derived benchmark fixture workflow and corpus registry.
- CI workflow for tests + eval JSON output.
- Explicit project license (`MIT`, see `LICENSE`).

### ⚠️ Not yet built or incomplete

- Token estimation is still crude (`ceil(char_count / 4)`).
- Missing linter/formatter setup and enforcement.
- Limited CLI/discovery/metrics test depth (core paths tested, edge/error paths still thin).
- Limited error recovery/reporting (single-file failures can abort full runs).
- No config-file support yet.
- No finalized distribution/release story yet.

## Quick start

### Prerequisites

- Bun (current project runtime)
- TypeScript is installed via dev dependencies

### Install dependencies

```bash
bun install
```

### Build and verify

```bash
bun run build
bun test
bun run eval -- --format json
bun run iterate -- --max-iter 2
```

`bun run build` is a verification step (TypeScript compile check with no emitted files).

If you explicitly need emitted JS/type declarations for local inspection, run:

```bash
bun run build:dist
```

### First optimization run

```bash
# dry run + machine-readable output
bun run promptimize -- --dry-run --format json ./benchmarks/fixtures

# write side-by-side outputs (default behavior)
bun run promptimize -- ./benchmarks/fixtures
```

## CLI usage

### Optimize command

```bash
bun run promptimize -- [options] <path>
```

Options:

- `--dry-run` — compute/report only, do not write files
- `--in-place` — overwrite source files
- `--output-dir <path>` — write output to custom location
- `--format <text|json>` — output format for result summary (default `text`)
- `--ai` — enable OpenAI-compatible AI provider with automatic local fallback
  - JSON output includes per-file provider metadata (`selected`, `attempted`, `fallbackUsed`).
  - Totals include `providerUsage` (`credentialed`, `local`, `fallbacks`).
- `-h, --help` — show help

Input path behavior:

- Single `.md` file → outputs `<name>.optimized.md` by default
- Directory with multiple `.md` files → outputs to `<input>-optimized/` preserving relative structure
- Hidden files/directories and symlinks are skipped by discovery

Examples:

```bash
# Dry-run a skill directory
bun run promptimize -- --dry-run --format json ~/.config/opencode/skills/dev-frontend

# Dry-run using local OpenAI-compatible endpoint + Qwen model
PROMPTIMIZE_BASE_URL=http://192.168.68.52:1234/v1 \
PROMPTIMIZE_MODEL=qwen/qwen3.5-9b \
bun run promptimize -- --ai --dry-run --format json ~/.config/opencode/skills/dev-frontend

# In-place rewrite
bun run promptimize -- --in-place ./docs/AGENTS.md

# Custom output root
bun run promptimize -- --output-dir ./artifacts/optimized ./docs
```

### Eval command

```bash
bun run eval -- [options] [path]

# equivalent subcommand path
bun run promptimize -- eval [options] [path]
```

Options:

- `--format <text|json>` — result format (default `text`)
- `--report-file <path>` — also persist JSON report
- `--verbose` — include per-file original/optimized bodies in text output
- `--ai` — enable credentialed rubric judge with automatic local fallback
- `-h, --help` — show help

Examples:

```bash
# Evaluate built-in fixtures
bun run eval -- --format text

# Include body diff context in text output
bun run eval -- --format text --verbose

# Emit JSON and save report artifact
bun run eval -- --format json --report-file ./artifacts/eval-report.json

# Evaluate a custom benchmark folder
bun run eval -- --format json ./benchmarks/fixtures

# Evaluate with local OpenAI-compatible endpoint + Qwen model
PROMPTIMIZE_BASE_URL=http://192.168.68.52:1234/v1 \
PROMPTIMIZE_EVAL_MODEL=qwen/qwen3.5-9b \
bun run eval -- --ai --format json ./benchmarks/fixtures
```

### Iterate command (Phase A+B)

```bash
bun run iterate -- [options] [path ...]
```

Options:

- `--ai` — enable OpenAI-compatible provider/judge with local fallback
- `--max-iter <n>` — max iterations per train file (default `5`)
- `--max-ai-calls <n>` — max credentialed AI calls per train file (default `3`, overridable by env)
- `--hold-out <fraction>` — stratified hold-out fraction (default `0.25`)
- `--result-file <path>` — append-only NDJSON iteration store (default `benchmarks/iterate-results.ndjson`)
- `--report-file <path>` — also write JSON summary artifact
- `--format <text|json>` — output format (default `text`)
- `-h, --help` — show help

Behavior:

- Train split: files are iterated with accept/reject criteria.
- AI runs use `PROMPTIMIZE_ITERATE_TEMPERATURE` (default `0.3`, clamped to `0.7`) to improve candidate diversity.
- AI call budget is enforced before credentialed calls; once exhausted, iterations continue with local fallback candidates.
- Hold-out split: files are score-only (never enhanced, never written to NDJSON store).
- Retention scoring is always measured against each file's original body.
- Text output includes per-file deltas, per-class trend aggregates, hold-out average, and NDJSON result-store path.
- You can scope runs to a subset by passing one or more file and/or directory paths.

Examples:

```bash
# local-first Phase A run
bun run iterate -- --format text

# produce JSON output + JSON artifact
bun run iterate -- --max-iter 2 --format json --report-file ./artifacts/iterate-report.json

# AI iterate smoke run on local OpenAI-compatible Qwen endpoint
PROMPTIMIZE_BASE_URL=http://192.168.68.52:1234/v1 \
PROMPTIMIZE_MODEL=qwen/qwen3.5-9b \
PROMPTIMIZE_EVAL_MODEL=qwen/qwen3.5-9b \
PROMPTIMIZE_ITERATE_MAX_AI_CALLS=2 \
bun run iterate -- --ai --max-iter 2 --report-file ./artifacts/iterate-ai-smoke.json

# AI starter-set run scoped to four fixtures
PROMPTIMIZE_BASE_URL=http://192.168.68.52:1234/v1 \
PROMPTIMIZE_MODEL=qwen/qwen3.5-9b \
PROMPTIMIZE_EVAL_MODEL=qwen/qwen3.5-9b \
bun run iterate -- --ai --max-iter 3 --max-ai-calls 2 \
  --result-file ./artifacts/starter-run-001-ai.ndjson \
  --report-file ./artifacts/starter-run-001-ai.json \
  ./benchmarks/fixtures/guidance-skill-ghostty-config.md \
  ./benchmarks/fixtures/reference-skill-opencode-agents.md \
  ./benchmarks/fixtures/discipline-skill-dev-review-changes.md \
  ./benchmarks/fixtures/guidance-skill-ghostty-themes.md
```

## Optimization pipeline (current implementation)

For each discovered Markdown file:

1. Read file.
2. Split and preserve YAML frontmatter (`src/frontmatter.ts`).
3. Classify document (`src/classify.ts`).
4. Optimize body with AST-aware + regex rules (`src/optimizer.ts`).
5. Pass optimized body through provider chain (`src/providers.ts`).
   - OpenAI-compatible provider runs first when `--ai` and AI config are present.
   - Local provider is always available fallback.
   - Runtime AI failures trigger one local fallback and are reported in result metadata.
6. Re-join frontmatter + body.
7. Write output based on mode (`in-place`, side-by-side, or `output-dir`).
8. Report metrics (`chars`, token estimate, deltas).

### Classification model

- `discipline`: stronger enforcement language, critical constraints.
- `guidance`: action-oriented recommendations.
- `collaborative`: team/review/handoff oriented language.
- `reference`: clarity/structure-focused, avoids over-strengthening directives.

## Eval system

`src/eval.ts` runs corpus files through optimizer and scores before/after.

Scoring dimensions include:

- Deterministic metric bundle (`src/eval-metrics.ts`):
  - structure signals (headings/lists/code/link counts)
  - imperative/actionability signals
  - clarity proxy (average sentence length)
  - retention score (critical headings/links/directive terms/code fences)
- Rubric judge (`src/eval-judge.ts`):
  - local heuristic judge always available
  - OpenAI-compatible AI judge available in eval when API key or `PROMPTIMIZE_BASE_URL` is configured
  - automatic fallback to local judge on credential/judge-call failure

Interpretation guidance:

- Quality and retention deltas matter more than token reduction alone.
- `reference` docs should usually remain neutral (clarity improvements without needless imperative inflation).
- Small rubric deltas are normalized by a noise floor in reporting.

## Benchmark corpus and fixture workflow

Corpus lives in `benchmarks/fixtures/` and is tracked in `benchmarks/CORPUS.md`.

Fixture types:

- **Synthetic fixtures**: stable handcrafted baselines.
- **Real-derived fixtures**: snapshots from real local docs, then sanitized for commit.

Real-derived fixtures include provenance metadata header:

```markdown
<!--
  fixture: real-derived
  source-class: <skill|agent>
  origin: <basename-only>
  snapshotted: <YYYY-MM-DD>
  sanitized: yes
-->
```

Naming convention:

- `benchmarks/fixtures/<class>-<source-slug>.md`
- Example: `discipline-agent-emet.md`

Add a real-derived fixture:

1. Snapshot:
   ```bash
   bash benchmarks/scripts/snapshot-fixture.sh <source-path> <class> <slug>
   ```
2. Sanitize manually:
   - remove machine-specific paths
   - remove private/internal URLs
   - remove credentials/tokens/model identifiers
   - remove provider-specific config fields as needed
3. Verify:
   ```bash
   bun test
   bun run eval -- --format json
   ```

## Environment variables

Supported vars:

- `PROMPTIMIZE_AI_KEY`
  - Optional bearer token for OpenAI-compatible optimize and eval judge calls.
- `OPENAI_API_KEY`
  - Alternative key for same OpenAI-compatible paths.
- `PROMPTIMIZE_BASE_URL`
  - Optional OpenAI-compatible API base URL.
  - Default: `https://api.openai.com/v1`.
  - If set (for example LM Studio), optimize/eval AI paths are considered available even without API key.
- `PROMPTIMIZE_MODEL`
  - Optional model override for optimize AI path.
  - Default: `gpt-4.1-mini`.
- `PROMPTIMIZE_EVAL_MODEL`
  - Optional model override for AI eval judge.
  - Default: `gpt-4.1-mini`.
- `PROMPTIMIZE_AI_TIMEOUT_MS`
  - Optional timeout for each OpenAI-compatible optimize/eval request.
  - Default: `45000`.
- `PROMPTIMIZE_AI_RETRIES`
  - Optional retry count after initial OpenAI-compatible optimize/eval attempt.
  - Default: `2` (3 total attempts).
- `PROMPTIMIZE_ITERATE_TEMPERATURE`
  - Optional temperature for iterate `--ai` optimize calls.
  - Default: `0.3` in iterate mode, clamped to `0.0–0.7`.
- `PROMPTIMIZE_ITERATE_MAX_AI_CALLS`
  - Optional max credentialed AI calls per train file in iterate mode.
  - Default: `3`.

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`

On push/PR to `main`, CI runs:

1. `bun install --frozen-lockfile`
2. `bun test`
3. `bun run eval -- --format json`

## Generated outputs (formalized)

Intentional generated outputs:

- Optimize writes:
  - single-file default: `<name>.optimized.md`
  - directory default: `<input>-optimized/`
  - custom: `--output-dir <path>`
- Eval report: only when `--report-file <path>` is set
- TypeScript emit: only when `bun run build:dist` is run (writes `dist/`)

Ignored local artifacts (`.gitignore`): `dist/`, `artifacts/`, `*.optimized.md`, `*-optimized/`, coverage/log/env/editor noise.

## Project structure

```text
promptimize/
  bin/promptimize                  # CLI bin entrypoint
  src/
    cli.ts                         # optimize command + eval subcommand dispatch
    engine.ts                      # file discovery, optimize loop, write modes, metrics
    optimizer.ts                   # markdown AST/rule optimizer
    classify.ts                    # doc class classification
    ai-config.ts                   # OpenAI-compatible base URL + auth helpers
    discovery.ts                   # markdown file traversal
    frontmatter.ts                 # split/join frontmatter helpers
    providers.ts                   # optimization provider abstraction
    eval.ts                        # benchmark/eval orchestration + formatting
    iterate-cli.ts                 # iterative optimization CLI (Phase A)
    iterate-engine.ts              # iteration loop controller
    iterate-scorer.ts              # unified deterministic+rubric scoring
    iterate-criteria.ts            # accept/reject criteria
    iterate-budget.ts              # stopping logic (max iter/plateau/AI budget)
    iterate-store.ts               # append-only NDJSON result store
    iterate-corpus.ts              # deterministic stratified train/hold-out split
    eval-metrics.ts                # deterministic scoring metrics
    eval-judge.ts                  # local + credentialed rubric judges
    types.ts                       # shared types
  tests/                           # bun test coverage for core modules
  benchmarks/
    fixtures/                      # synthetic + real-derived benchmark docs
    scripts/snapshot-fixture.sh    # real-derived fixture snapshot helper
    CORPUS.md                      # fixture registry and update policy
  .github/workflows/ci.yml
  LICENSE
  ROADMAP.md
```

## Contributing / development workflow

1. Install and verify baseline:
   ```bash
   bun install
   bun run build
   bun test
   bun run eval -- --format json
   ```
2. Make focused changes.
3. Re-run verification commands above.
4. If you changed corpus fixtures, update `benchmarks/CORPUS.md` and include sanitization notes in your PR description.
5. If behavior changed, update this README and `ROADMAP.md` status lines accordingly.

## Limitations and known gaps

- Rule-based optimizer can inflate tokens on some fixtures due to markdown serialization/reflow side effects.
- Token estimate is heuristic only, not tokenizer-accurate.
- Error handling is still coarse (limited per-file recovery/reporting).
- CLI UX is functional but minimal (limited diagnostics/config ergonomics).
- No release packaging/publishing pipeline yet.

See [ROADMAP.md](./ROADMAP.md) for prioritized launch blockers and post-launch enhancements.
