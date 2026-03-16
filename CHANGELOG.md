# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Introduced iterative optimization workflow via `bun run iterate`, including train/hold-out splitting, accept/reject criteria, convergence/budget stopping, and append-only NDJSON iteration logs.
- Added iteration reporting and supporting modules for budgeting, scoring, corpus splitting, result storage, and report generation.
- Added benchmark fixtures and corpus registry entries for `dev-review-changes`, `ghostty-config`, `ghostty-themes`, and `opencode-agents` skill-derived documents.
- Added `PROMPTIMIZE_ITERATE_MAX_AI_CALLS` environment variable and `--max-ai-calls` CLI option to cap credentialed AI calls per train file.

### Changed
- Updated OpenAI-compatible optimize provider to accept a configurable temperature (clamped to `0.0–0.7`) and added coverage for default/custom temperature behavior.
- Updated project docs (`README.md`, `ROADMAP.md`) and `.gitignore` to document iterate-mode behavior and ignore local iteration result logs.
- Reworked `ROADMAP.md` to reflect current shipped capabilities, near-term `NEXT` bottlenecks, pre-launch hardening priorities, and post-launch/research tracks.
