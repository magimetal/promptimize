<!--
  fixture: real-derived
  source-class: skill
  origin: ghostty-themes/SKILL.md
  snapshotted: 2026-03-16
  sanitized: yes
-->

---
name: ghostty-themes
description: Create and port Ghostty themes from authoritative sources with exact color fidelity, source documentation, and verification-ready Ghostty config output.
---
## What I do
- Create new Ghostty theme files using Ghostty config syntax.
- Port themes from authoritative upstream sources into Ghostty format.
- Preserve exact hex values and document source provenance and caveats.

## When to use me
Use this when a user asks to create, port, validate, or document a Ghostty theme.

## Workflow
1. Find the authoritative source for the requested theme.
   - Prefer Ghostty bundled themes first.
   - Otherwise use trusted upstream repos such as iTerm2-Color-Schemes.
   - Record exact source URL(s).
2. Normalize a portable palette.
   - Keep semantic color intent clear (background, foreground, cursor, selection, ANSI palette).
   - Preserve exact hex values from source.
   - Capture semantic caveats (example: ANSI blue intentionally teal).
3. Produce Ghostty-format theme output.
   - Use plain Ghostty config entries, for example:
     - `palette = 0=#17141f`
     - `background = #191323`
     - `foreground = #cccccc`
     - `cursor-color = #e07d13`
     - `cursor-text = #ffffff`
     - `selection-background = #220525`
     - `selection-foreground = #f4f4f4`
   - Create optional JSON or YAML documentation artifacts when useful for portability or review.
4. Install only when explicitly requested.
   - Install path: `<home>/.config/ghostty/themes/<name>`.
   - Do not install or copy themes unless the user asks.
5. Verify output.
   - Confirm file exists at expected path.
   - Confirm expected keys are present and values match source exactly.

## Outputs
- Primary: Ghostty theme file in Ghostty config syntax.
- Optional: JSON or YAML artifact summarizing palette, source URLs, and caveats.

## Guardrails
- Never invent colors when an authoritative source exists.
- If multiple upstream variants exist, state which variant was selected and why.
- Keep output ASCII and concise.
