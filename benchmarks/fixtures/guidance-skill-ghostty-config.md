<!--
  fixture: real-derived
  source-class: skill
  origin: ghostty-config/SKILL.md
  snapshotted: 2026-03-16
  sanitized: yes
-->

---
name: ghostty-config
description: Safely update Ghostty config options using the official reference.
---

# Overview
This skill helps modify and manage the Ghostty configuration file at `<home>/.config/ghostty/config` using the official option reference. It focuses on safe, minimal changes and verified syntax.

# When to use
- You need to add, remove, or adjust Ghostty config keys.
- You want to split config into multiple files with `config-file`.
- A setting is not taking effect and you need to validate syntax or reload behavior.

# Safety / backup workflow
1. **Backup first**: copy the current config before edits.
2. **Make minimal, targeted changes**: one key at a time.
3. **Preserve syntax**: `key = value` with optional quotes. Comments start with `#` and must be on their own line.
4. **Validate**: re-open the file and ensure only intended lines changed.
5. **Reload or restart**: use Ghostty’s reload shortcut when possible; if changes still don’t apply, restart Ghostty.

# Common config edits (examples)
> Use values that match the option reference. Keys are case-sensitive and lowercase.

**Font family and size**
```
font-family = "JetBrains Mono"
font-size = 13.5
```

**Theme selection**
```
theme = "Rose Pine"
```

**Colors**
```
background = 282c34
foreground = ffffff
```

**Keybindings**
```
keybind = ctrl+z=close_surface
keybind = ctrl+d=new_split:right
```

**Split config into multiple files**
```
config-file = some/relative/sub/config
config-file = ?optional/config
config-file = /absolute/path/config
```

**Reset a value to default**
```
font-family =
```

# Troubleshooting
- **Config not loading**: confirm the file is at `<home>/.config/ghostty/config` and uses `key = value` syntax.
- **Comments ignored**: only `#` comments on their own line are valid.
- **Change not applied**: reload the config (default shortcut: `ctrl+shift+,` on Linux or `cmd+shift+,` on macOS). If still unchanged, restart Ghostty.
- **Conflicts across files**: if multiple config files exist, later files override earlier ones.
- **Unknown option or value**: verify the option name and allowed values in the Ghostty config reference.

# Reference
- https://ghostty.org/docs/config
- https://ghostty.org/docs/config/reference
