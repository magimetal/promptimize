<!--
  fixture: real-derived
  source-class: skill
  origin: opencode-commands/SKILL.md
  snapshotted: 2026-03-15
  sanitized: yes
-->

---
name: opencode-commands
description: Documentation for creating and configuring OpenCode custom commands.
---

# Overview
OpenCode custom commands let you define a prompt that runs when a user executes `/your-command` in the TUI. Commands can be defined either as markdown files or via `opencode.json`.

# Where commands are discovered
- **Global**: `<global-opencode-commands-dir>/`
- **Project**: `.opencode/commands/`
- **Config**: `opencode.json` (`command` entries)

# Command name resolution
- **Markdown**: the filename (e.g., `test.md` → `/test`).
- **Config**: the `command` key name (e.g., `"test"` → `/test`).
- Custom commands can override built-in commands if they share a name.

# Method 1: Markdown command files
Create a file at one of the command locations, then provide frontmatter and a template body.

**Example (global):** `<global-opencode-commands-dir>/test.md`
```
---
description: Run tests with coverage
agent: build
model: <model-id>
---
Run the full test suite with coverage report and show any failures.
Focus on the failing tests and suggest fixes.
```

Run in the TUI:
```
/test
```

# Method 2: `opencode.json` config
Use the `command` section in config. `template` is required; other fields are optional.

**Example:**
```
{
  "command": {
    "test": {
      "template": "Run the full test suite with coverage report and show any failures.\nFocus on the failing tests and suggest fixes.",
      "description": "Run tests with coverage",
      "agent": "build",
      "model": "<model-id>",
      "subtask": true
    }
  }
}
```

# Template features (prompt config)
Use these placeholders inside the command template:
- **Arguments**: `$ARGUMENTS` for all args, or `$1`, `$2`, `$3`… for positional args.
- **Shell output**: `!\`command\`` injects command output (runs in project root).
- **File references**: `@path/to/file` includes file contents.

# Options reference
- `template` (required, config only): prompt sent to the LLM.
- `description` (optional): shown in the TUI command list.
- `agent` (optional): agent used to execute the command.
- `model` (optional): overrides default model.
- `subtask` (optional, config only): force subagent invocation.

# Quick checklist
- Pick a unique command name.
- Place the file in the correct directory, or add a `command` entry in config.
- Ensure `template` is present (config) and `description` is provided (markdown frontmatter).
- Test in the TUI with `/<command>`.

# Reference
- [ALWAYS READ THIS](https://opencode.ai/docs/commands/)
