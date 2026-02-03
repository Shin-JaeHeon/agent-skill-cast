# 🧙‍♂️ Agent Skill Cast

**"Cast" your AI agent skills across your team.**

Agent Skill Cast is a CLI tool that makes it easy to share and sync skills (folders) for AI agents like Claude, Gemini, and Codex. Instead of copy-pasting skill folders or struggling with git submodules for just a few files, Agent Skill Cast lets you "cast" skills from a central repository (or local folder) directly into your project.

## Why use this?

- **Selective Sync**: You don't need the entire repository. Pick only the skills you need.
- **Multi-Agent Support**: Works with `.claude/skills`, `.gemini/skills`, and `.codex/skills`.
- **Live Updates**: Run `cast source sync` to pull the latest changes from the source and update your project instantly.
- **Local & Remote**: Support both Git repositories and local folders as skill sources.

## Installation

Prerequisites: Node.js is required. Install globally via npm:

```bash
npm install -g agent-skill-cast
```

## Getting Started

### 1. Initialize (Init)
Initialize Agent Skill Cast global configuration. (Run this once)

```bash
cast init
```

### 2. Add Source (Register)
Register a skill repository (Source). Once registered, you can use these skills in any project.

```bash
# Add a GitHub repository (Recommended)
cast source add https://github.com/my-team/awesome-skills

# Or add a local folder (Great for development/testing)
cast source add ~/projects/my-personal-skills
```

### 3. Cast Skills (Use)
Select skills from your registered sources and "cast" them into your current project.

```bash
cast use
```
*An interactive menu will appear. Enter the **number** corresponding to your choice. (Use commas for multiple selections)*

### 4. Verify
Check your project folder!
You will see that the selected skills are symlinked into `.claude/skills/`. Your AI agent (e.g., Claude) can now see and use these skills.

### 5. Sync
Has the source repository been updated with new skills or fixes?
Run the `sync` command to pull the latest changes and refresh your installed skills.

```bash
cast source sync
```

## Commands

| Command | Description |
|---|---|
| `cast init` | Initialize Agent Skill Cast global configuration. |
| `cast source add <URL/Path>` | Register a skill source (Git Repo or Local Path). |
| `cast source list` | Show all registered sources. |
| `cast source remove <Name>` | Unregister a source. |
| `cast use` | Interactive menu to select and install skills. |
| `cast use <Source>/<Skill>` | Install a specific skill directly (Non-interactive). |
| `cast use ... --claude` | Install only to `.claude/skills` (must exist). |
| `cast list` | Show all currently installed skills in this project. |
| `cast remove <skill>` | Remove an installed skill. |
| `cast config lang <en\|ko>` | Set language preference (English/Korean). |
| `cast source sync` | Update sources and refresh installed skills. |

## Directory Structure

Agent Skill Cast keeps your project clean:

- `~/.asc_sources/`: Where sources are cloned/linked (managed globally).
- `.claude/skills/`: Symlinks to the actual skill folders.
- `.gemini/skills/`: Symlinks for Gemini.
- `.codex/skills/`: Symlinks for Codex.

## License

MIT
