# Agent Skill Cast

**Cast your AI agent skills across your team.**

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
| **Multi-Agent** | Auto-manages Claude, Gemini, Codex folders |
| **Instant Updates** | `cast source sync` keeps everything up-to-date |
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
```

### Step 4. Verify
```bash
cast list
# Symlinks created in .claude/skills/
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
| `cast list` | Show installed skills |
| `cast remove <skill>` | Remove a skill |

### Source Management

| Command | Description |
|---------|-------------|
| `cast source add <URL/Path>` | Register a source |
| `cast source list` | Show registered sources |
| `cast source remove <name>` | Unregister a source |
| `cast source sync` | Update sources and refresh skills |

### Options

| Option | Description |
|--------|-------------|
| `--claude` | Install only to `.claude/skills` |
| `--gemini` | Install only to `.gemini/skills` |
| `--codex` | Install only to `.codex/skills` |

### Configuration

```bash
cast config lang ko   # 한국어
cast config lang en   # English
```

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

- **Zero Copy**: Symlinks save disk space
- **Instant Reflect**: Source updates apply to all projects automatically
- **Independent Selection**: Each project can have different skill combinations

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
<summary><b>Scenario 2: Branch-Specific Skills</b></summary>

> **Situation**: Mobile-only skills are only needed on the mobile branch.

```bash
# main branch
cast use shared-skills/common-helper
cast use shared-skills/api-guide

# mobile branch (additional)
cast use shared-skills/mobile-helper
cast use shared-skills/responsive-design
```

Each branch maintains independent `.claude/skills/`!

</details>

<details>
<summary><b>Scenario 3: Sharing Skills Across Repositories</b></summary>

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
<summary><b>Scenario 4: Instantly Share with Teammates</b></summary>

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

<details>
<summary><b>Scenario 5: Local Development & Testing</b></summary>

> **Situation**: You want to test a skill locally before pushing to the shared repo.

```bash
# Register local folder as source
cast source add ~/my-local-skills

# Develop & test
cast use my-local-skills/experimental-skill

# After testing, move to shared repository
mv ~/my-local-skills/experimental-skill ~/shared-skills/
cd ~/shared-skills && git add . && git commit -m "feat: add skill" && git push
```

</details>

---

## License

MIT
