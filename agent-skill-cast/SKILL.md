---
name: agent-skill-cast
description: CLI to sync AI skills from git repos to local .claude/.gemini/.codex folders.
allowed-tools: Bash
---

# Agent Skill Cast (ASC) Interface

## ⚠️ CI Mode (Required for Agents)
All commands MUST use `--ci` flag. Interactive prompts are disabled in CI mode.
Add `--json` for machine-readable output.

CI mode is auto-activated when:
- `--ci` flag is present
- stdin is not a TTY (e.g. piped execution)

## Syntax
`cast <command> [arguments] --ci [--json] [--copy]`

## Commands
### Source Management
* `cast source add <url|path> --ci`: Register a git repo or local folder source.
* `cast source sync --ci`: Update all sources to latest. **Required before `use`.**
* `cast source list --ci [--json]`: Show registered sources.
* `cast source remove <name> --ci`: Unregister a source.

### Skill Operations
* `cast init --ci`: Initialize ASC in current project (creates config).
* `cast list --ci [--json]`: Show skills currently installed in this project.
* `cast use <source>/<skill> --ci [--copy]`: Install a specific skill.
    * Flags: `--claude`, `--gemini`, `--codex` (Target specific agent. Default: all), `--copy` (install standalone copies instead of symlinks).
* `cast remove <skill> --ci`: Uninstall a skill.

### Configuration
* `cast config lang <en|ko> --ci`: Set CLI language.

## Rules
1. ALWAYS use `--ci` flag. Never omit it.
2. ALWAYS provide required arguments explicitly. Never rely on interactive prompts.
3. Use `--json` when you need to parse the output programmatically.
4. Run `cast source sync --ci` before `cast use` if sources haven't been synced.

## JSON Output Format
When `--json` is used, output follows this structure:
```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": "error_key", "message": "Human readable message" }
```

## Exit Codes
* `0`: Success
* `1`: Execution error (source not found, skill not found, etc.)
* `2`: Argument error (missing required argument in CI mode)

## Example Workflow
1. `cast init --ci`
2. `cast source add https://github.com/my-team/frontend-skills --ci`
3. `cast source sync --ci`
4. `cast use frontend-skills/react-patterns --gemini --ci`
5. `cast use frontend-skills/testing-guide --copy --ci`
6. `cast list --ci --json`
