<!--
  fixture: real-derived
  source-class: skill
  origin: opencode-agents/SKILL.md
  snapshotted: 2026-03-16
  sanitized: yes
-->

---
name: opencode-agents
description: How to create and configure OpenCode agents (primary and subagents)
---

# Opencode Agents

Use this skill to create and configure OpenCode agents consistently with the official docs and local agent conventions.

## Overview

OpenCode supports two agent types:

- **Primary agents**: The main assistants you talk to directly (switch with Tab / keybind).
- **Subagents**: Specialized helpers invoked by primary agents or by `@mention`.

Built-in examples include **Build** (primary), **Plan** (primary), **General** (subagent), and **Explore** (subagent).

## Where to define agents

You can define agents in either JSON or Markdown:

- **Global**: `<home>/.config/opencode/agents/`
- **Project**: `.opencode/agents/`

> In Markdown, the **file name becomes the agent identifier** (e.g., `review.md` → `review`).

## Required fields

From the docs, the following are required in agent config:

- `description` (required)
- `mode` (optional, defaults to `all`): `primary`, `subagent`, or `all`

## Common options (docs-accurate)

- `model`: Override model for this agent (e.g., `<model-id>`)
- `prompt`: Inline prompt or a file reference (JSON only: `{file:./prompts/agent.txt}`)
- `temperature`: 0.0–1.0
- `top_p`: 0.0–1.0
- `steps`: Max agent iterations (replaces deprecated `maxSteps`)
- `disable`: Set `true` to disable
- `hidden`: Hide from `@` menu (subagents only)
- `tools`: Enable/disable specific tools (JSON or Markdown)
- `permission`: Set tool permissions (`allow`, `ask`, `deny`), supports per-command `bash` rules
- `permission.task`: Restrict which subagents this agent can spawn (glob rules; last match wins)

## Create an agent (recommended workflow)

Use the interactive creator:

```bash
opencode agent create
```

This wizard:
1. Asks where to save (global or project)
2. Prompts for description and purpose
3. Generates a prompt + identifier
4. Lets you choose tools/permissions
5. Writes a markdown file

## Minimal Markdown example (subagent)

`<home>/.config/opencode/agents/review.md`

```
---
description: Reviews code for quality and best practices
mode: subagent
tools:
  write: false
  edit: false
  bash: false
---

You are in code review mode. Focus on:
- Code quality and best practices
- Potential bugs and edge cases
- Performance implications
- Security considerations
Provide constructive feedback without making direct changes.
```

## Minimal JSON example (primary)

`opencode.json`

```
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "build": {
      "mode": "primary",
      "description": "Full development agent",
      "model": "<model-id>",
      "tools": {
        "write": true,
        "edit": true,
        "bash": true
      }
    }
  }
}
```

## Local reference agents (use as templates)

Reference these local agents for structure, permissions, and prompt style:

- `<home>/.config/opencode/agents/executor.md`
- `<home>/.config/opencode/agents/orchestrate.md`
- `<home>/.config/opencode/agents/planner.md`

## Gotchas

- **`description` is required** for every agent.
- **Markdown file name = agent id** (used for `@mention`).
- **`mode` defaults to `all`** if omitted.
- Use **`steps`**, not `maxSteps` (deprecated).
- **`hidden` only applies to subagents.**
- **Permissions are separate from tools**: `tools` controls availability; `permission` controls access policy.
- **Order matters in `permission.task` and `permission.bash`**: the last matching rule wins.

## When to use which type

- **Primary**: user-facing main workflows, broad responsibilities
- **Subagent**: focused tasks, specialized research, or read-only exploration

## Official documentation

Primary source: https://opencode.ai/docs/agents/
