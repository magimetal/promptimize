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
- Eval harness with per-file and per-class scoring (`bun run eval`).
- Local deterministic rubric judge.
- Optional credentialed AI judge path for eval (`bun run eval -- --ai`) with local fallback.
- Real-derived benchmark fixture workflow and corpus registry.
- CI workflow for tests + eval JSON output.

### ⚠️ Not yet built or incomplete

- **AI optimization in main optimize path is not actually wired**.
  - `--ai` exists on `promptimize`, but current CLI/provider wiring does not pass an LLM call into the optimization provider chain.
  - Result: optimization path remains local rule-based even when `--ai` is set.
- Token estimation is still crude (`ceil(char_count / 4)`).
- Missing linter/formatter setup and enforcement.
- Limited CLI/discovery/metrics test depth (core paths tested, edge/error paths still thin).
- Limited error recovery/reporting (single-file failures can abort full runs).
- No config-file support yet.
- No finalized distribution/release story yet.
- Repository hygiene still incomplete (no local git metadata/license in this working directory context).

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
- `--ai` — request credentialed provider path (**currently no-op for optimization until AI wiring lands**)
- `-h, --help` — show help

Input path behavior:

- Single `.md` file → outputs `<name>.optimized.md` by default
- Directory with multiple `.md` files → outputs to `<input>-optimized/` preserving relative structure
- Hidden files/directories and symlinks are skipped by discovery

Examples:

```bash
# Dry-run a skill directory
bun run promptimize -- --dry-run --format json ~/.config/opencode/skills/dev-frontend

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
```

## Optimization pipeline (current implementation)

For each discovered Markdown file:

1. Read file.
2. Split and preserve YAML frontmatter (`src/frontmatter.ts`).
3. Classify document (`src/classify.ts`).
4. Optimize body with AST-aware + regex rules (`src/optimizer.ts`).
5. Pass optimized body through provider chain (`src/providers.ts`).
   - Current default provider returns body unchanged.
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
  - credentialed AI judge available in eval when key exists
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
  - Used for credentialed AI judge auth.
  - Also checked by provider availability in optimize path, though optimize AI call is not currently wired.
- `OPENAI_API_KEY`
  - Alternative key for same credentialed paths.
- `PROMPTIMIZE_EVAL_MODEL`
  - Optional model override for AI eval judge.
  - Default: `gpt-4.1-mini`.

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`

On push/PR to `main`, CI runs:

1. `bun install --frozen-lockfile`
2. `bun test`
3. `bun run eval -- --format json`

## Project structure

```text
promptimize/
  bin/promptimize                  # CLI bin entrypoint
  src/
    cli.ts                         # optimize command + eval subcommand dispatch
    engine.ts                      # file discovery, optimize loop, write modes, metrics
    optimizer.ts                   # markdown AST/rule optimizer
    classify.ts                    # doc class classification
    discovery.ts                   # markdown file traversal
    frontmatter.ts                 # split/join frontmatter helpers
    providers.ts                   # optimization provider abstraction
    eval.ts                        # benchmark/eval orchestration + formatting
    eval-metrics.ts                # deterministic scoring metrics
    eval-judge.ts                  # local + credentialed rubric judges
    types.ts                       # shared types
  tests/                           # bun test coverage for core modules
  benchmarks/
    fixtures/                      # synthetic + real-derived benchmark docs
    scripts/snapshot-fixture.sh    # real-derived fixture snapshot helper
    CORPUS.md                      # fixture registry and update policy
  .github/workflows/ci.yml
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
