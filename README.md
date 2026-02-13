# Agent Skill Cast

**Cast your AI agent skills across your team.**

**English** | [한국어](./README-KR.md) | 
[![npm version](https://img.shields.io/npm/v/agent-skill-cast.svg)](https://www.npmjs.com/package/agent-skill-cast)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
---

## Why?

> *"I made a useful skill on the mobile branch, but I want to use it on main too... cherry-picking is such a pain..."*
> 
> *"Repo A and B are both React projects, and 90% of skills are identical. Managing copies is hell..."*

**Don't let skills be tied to branches or repos.**

Agent Skill Cast lets you pick only the skills you need from a central repository and **cast** them into your project.

---

## Features

| | |
|---|---|
| **Selective Sync** | Pick only the skills you need, not the entire repository |
| **Multi-Agent** | Installs to existing Claude, Gemini, Codex folders |
| **Instant Updates** | `cast source sync` attempts git updates and re-links active symlink skills |
| **Local & Remote** | Supports both Git repos and local folders |

---

## Installation

```bash
npm install -g agent-skill-cast
```

> Requires Node.js

---

## Quick Start

### Step 1. Initialize
```bash
cast init
```

### Step 2. Register Source
```bash
# GitHub repository
cast source add https://github.com/my-team/shared-skills

# Or local folder
cast source add ~/my-personal-skills
```

### Step 3. Cast Skills
```bash
cast use
# Interactive menu - select skill numbers (comma-separated for multiple)

# Or install every skill from a source at once
cast use my-skills --all
```

### Step 4. Verify
```bash
cast list
# By default, symlinks are created in existing agent folders (.claude/.gemini/.codex)
# Use --copy for standalone local copies
```

### Step 5. Sync (when source is updated)
```bash
cast source sync
```

---

## Commands

### Basic Commands

| Command | Description |
|---------|-------------|
| `cast init` | Initialize global configuration |
| `cast use` | Select and install skills (interactive) |
| `cast use <source>/<skill>` | Install a specific skill directly |
| `cast use <source> --all` | Install all skills from a source |
| `cast use <source>/<skill> --copy` | Install as standalone copies (no symlink) |
| `cast use <source> --all --copy` | Install all skills from a source as standalone copies |
| `cast list` | Show installed skills |
| `cast remove <skill>` | Remove installed symlink skills (standalone `--copy` installs are not removed) |

### Source Management

| Command | Description |
|---------|-------------|
| `cast source` | Source Management Menu (Interactive) |
| `cast source add <URL/Path>` | Register a source |
| `cast source list` | Show registered sources |
| `cast source remove <name>` | Unregister a source |
| `cast source sync` | Update git sources and refresh active symlink skills |

### Options

| Option | Description |
|--------|-------------|
| `--claude` | Install only to `.claude/skills` |
| `--gemini` | Install only to `.gemini/skills` |
| `--codex` | Install only to `.codex/skills` |
| `--all` | Install all skills from the specified source (`cast use <source> --all`) |
| `--copy` | Copy skills instead of creating symlinks |

### Configuration

```bash
cast config           # Configuration Menu (Interactive)
cast config lang ko   # 한국어
cast config lang en   # English
```

### CI Mode (for AI Agents / Automation)

Use `--ci` flag for non-interactive execution (Claude Code, Codex, CI/CD pipelines).
`--json` is available on commands that implement CI JSON output (for example `cast source list`, `cast source sync`, `cast list`, and CI error responses).

```bash
# CI mode is auto-activated when:
# - --ci flag is present
# - stdin is not a TTY

cast source list --ci --json     # JSON output
cast use my-skills/helper --ci   # Non-interactive install
cast use my-skills --all --ci    # Non-interactive install of all skills from one source
cast use my-skills/helper --copy --ci  # Non-interactive standalone copy install
cast list --ci --json            # JSON skill list
```

| Option | Description |
|--------|-------------|
| `--ci` | Non-interactive mode (no prompts, no colors) |
| `--json` | Structured JSON output (supported commands only) |

> See [SKILL.md](agent-skill-cast/SKILL.md) for the full agent interface specification.

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Skill Source Repository (GitHub / Local)               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  ~/.asc_sources/                                        │
│  └── shared-skills/     ← git clone or symlink          │
│      ├── react-patterns/                                │
│      ├── testing-guide/                                 │
│      └── mobile-helper/                                 │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     Project A       Project B       Project C
     .claude/        .claude/        .claude/
     skills/         skills/         skills/
       ↓               ↓               ↓
    [symlink]       [symlink]       [symlink]
```

- **Zero Copy (Default)**: Symlinks save disk space
- **Instant Reflect**: Source updates can be re-linked in a project with `cast source sync`
- **Independent Selection**: Each project can have different skill combinations
- **Standalone Mode**: Use `cast use <source>/<skill> --copy` when you want independent local copies (`cast remove` does not remove these local copies)

---

## Skill Structure

To identify a folder as a skill, **it must contain a `SKILL.md` file.**
Agent Skill Cast searches for skills in the following locations within a source repository:

1. **Root Directory**: Any folder containing `SKILL.md`.
   - `my-skill/SKILL.md` → Identified as `my-skill`
2. **Agent Specific Directories**:
   - `.claude/skills/my-skill/SKILL.md`
   - `.gemini/skills/my-skill/SKILL.md`
   - `.codex/skills/my-skill/SKILL.md`

> **Note**: Folders without `SKILL.md` are ignored.

---

## Collaboration Scenarios

<details>
<summary><b>Scenario 1: Sharing Skills Across Branches</b></summary>

> **Situation**: You made a skill on the mobile branch and want to use it on main.

```bash
# Register skill repository (once)
cast source add https://github.com/my-team/shared-skills

# Use from any branch
cast use shared-skills/mobile-helper

# Sync when updated
cast source sync
```

</details>

<details>
<summary><b>Scenario 2: Sharing Skills Across Repositories</b></summary>

> **Situation**: Repo A and B use the same frontend tech, 90% skills are identical.

```bash
# Both Repo A and B:
cast source add https://github.com/my-team/frontend-skills
cast use frontend-skills/react-patterns
cast use frontend-skills/testing-guide
```

Update the source once, `cast source sync` syncs all repos!

</details>

<details>
<summary><b>Scenario 3: Instantly Share with Teammates</b></summary>

> **Situation**: You want to quickly share a new skill with your team.

```bash
# 1. Push to skill repository
cd ~/shared-skills
mkdir new-skill && echo "..." > new-skill/SKILL.md
git add . && git commit -m "feat: add new skill" && git push

# 2. Tell teammates: "Run cast source sync!"

# 3. Teammates
cast source sync
cast use shared-skills/new-skill
```

</details>

---

## License

MIT
