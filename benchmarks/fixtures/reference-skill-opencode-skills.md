<!--
  fixture: real-derived
  source-class: skill
  origin: opencode-skills/SKILL.md
  snapshotted: 2026-03-15
  sanitized: yes
-->

---
name: opencode-skills
description: Documentation for creating and configuring OpenCode agent skills.
---

# Overview
OpenCode skills are reusable instruction bundles discovered from `SKILL.md` files. Agents see available skills in the `skill` tool description and load a skill on demand with `skill({ name: "<name>" })`.

# File placement
Create one folder per skill name and place a `SKILL.md` file inside it.

**Project locations**:
- `.opencode/skills/<name>/SKILL.md`
- `.claude/skills/<name>/SKILL.md`
- `.agents/skills/<name>/SKILL.md`

**Global locations**:
- `<path>/.config/opencode/skills/<name>/SKILL.md`
- `<path>/.claude/skills/<name>/SKILL.md`
- `<path>/.agents/skills/<name>/SKILL.md`

# Discovery behavior
- For project-local paths, OpenCode walks up from the current directory to the git worktree and loads any matching `skills/*/SKILL.md` it finds.
- Global definitions are always loaded from the OpenCode and Claude-compatible global paths.

# Skill anatomy
Use one directory per skill. Keep `SKILL.md` as the entrypoint; add supporting folders only when needed.

```text
<name>/
  SKILL.md
  scripts/      # optional: helper scripts
  references/   # optional: long docs/examples
  assets/       # optional: static files used by the skill
```

# Progressive disclosure
- Start with frontmatter metadata (`name`, `description`, optional fields).
- Keep the main body task-focused and scannable.
- Load optional resources (`references/`, `scripts/`, `assets/`) only when needed.
- Keep `SKILL.md` under about 500 lines; move large material to `references/`.

# Frontmatter (required)
Every `SKILL.md` must start with YAML frontmatter. Recognized fields:
- `name` (required)
- `description` (required)
- `license` (optional)
- `compatibility` (optional)
- `metadata` (optional, string-to-string map)

Unknown fields are ignored.

# Name and description rules
- `name` must be 1–64 characters.
- Lowercase alphanumeric with single hyphen separators.
- No leading/trailing `-` and no consecutive `--`.
- Must match the directory name.
- Regex: `^[a-z0-9]+(-[a-z0-9]+)*$`.

`description` must be 1–1024 characters and specific enough for agents to choose appropriately. Include both: what the skill does and when it should trigger.

# Example skill
```
---
name: git-release
description: Create consistent releases and changelogs
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github
---
## What I do
- Draft release notes from merged PRs
- Propose a version bump
- Provide a copy-pasteable `gh release create` command

## When to use me
Use this when preparing a tagged release. Ask clarifying questions if the versioning scheme is unclear.
```

# Writing effective instructions
- Explain why key constraints exist, not just what to do.
- Define expected outputs (format, level of detail, completion signal).
- Include examples for ambiguous tasks so invocation stays consistent.

# Permissions (opencode.json)
Use pattern-based permissions to allow, deny, or request approval for skill loading:

```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "internal-*": "deny",
      "experimental-*": "ask"
    }
  }
}
```

# Per-agent overrides
**Custom agents** (frontmatter):
```yaml
---
permission:
  skill:
    "documents-*": "allow"
---
```

**Built-in agents** (`opencode.json`):
```json
{
  "agent": {
    "plan": {
      "permission": {
        "skill": {
          "internal-*": "allow"
        }
      }
    }
  }
}
```

# Disable the skill tool
**Custom agents**:
```yaml
---
tools:
  skill: false
---
```

**Built-in agents**:
```json
{
  "agent": {
    "plan": {
      "tools": {
        "skill": false
      }
    }
  }
}
```

# Troubleshooting checklist
- `SKILL.md` is all caps and in the correct directory.
- Frontmatter includes `name` and `description`.
- Skill names are unique across all locations.
- Permissions do not deny the skill.

# Reference
- [ALWAYS READ THIS](https://opencode.ai/docs/skills/)
