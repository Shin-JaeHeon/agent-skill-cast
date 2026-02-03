# 🧙‍♂️ Agent Skill Cast (ASC)

**"Cast" your AI agent skills across your team.**

ASC is a CLI tool that makes it easy to share and sync skills (folders) for AI agents like Claude, Gemini, and Codex. Instead of copy-pasting skill folders or struggling with git submodules for just a few files, ASC lets you "cast" skills from a central repository (or local folder) directly into your project.

## Why use this?

- **Selective Sync**: You don't need the entire repository. Pick only the skills you need.
- **Multi-Agent Support**: Works with `.claude/skills`, `.gemini/skills`, and `.codex/skills`.
- **Live Updates**: Run `cast source sync` to pull the latest changes from the source and update your project instantly.
- **Local & Remote**: Support both Git repositories and local folders as skill sources.

## Installation

```bash
npm install -g agent-skill-cast
```

## Getting Started

### 1. Initialize
First, set up the ASC environment in your project.

```bash
cast init
```

### 2. Add a Source
Register a skill repository. This can be a GitHub repo or a local directory.

```bash
# Add a remote git repository
cast source add https://github.com/your-org/team-skills

# Or add a local folder
cast source add ~/projects/my-personal-skills
```

### 3. Use Skills ("Cast")
Choose which skills you want to use in your current project. Interactive mode is supported.

```bash
cast use
```
*Follow the prompts to select a source and the specific skills you want.*

### 4. Sync
Keep everything up to date. This pulls changes from your sources and refreshes your skill folders.

```bash
cast source sync
```

## Commands

| Command | Description |
|Args| |
|---|---|
| `cast init` | Initialize ASC in the current directory. |
| `cast source add <url/path>` | Add a skill source (Git URL or local path). |
| `cast source list` | Show all registered sources. |
| `cast source remove <name>` | Remove a registered source. |
| `cast use` | Interactively select and install skills. |
| `cast use <source>/<skill>` | Install a specific skill directly. |
| `cast list` | Show all currently installed skills in this project. |
| `cast remove <skill>` | Remove an installed skill. |
| `cast config lang <en\|ko>` | Set language preference (English/Korean). |
| `cast source sync` | Update sources and refresh installed skills. |

## Directory Structure

ASC keeps your project clean:

- `~/.asc_sources/`: Where sources are cloned/linked (managed globally).
- `.claude/skills/`: Symlinks to the actual skill folders.
- `.gemini/skills/`: Symlinks for Gemini.
- `.codex/skills/`: Symlinks for Codex.

## License

MIT
