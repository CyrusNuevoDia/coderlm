# coding-agent-rlm

Process large codebases with Coding Agents using the **RLM (Recursive Language Model)** pattern.

Instead of stuffing all files into an LLM's context window, give it a file listing and let it use tools to peek, decompose, and recursively call itself on subsets. This keeps each agent focused on a manageable scope while covering arbitrarily large codebases.

## Install

```bash
# npm / bun
bunx coding-agent-rlm@latest
npx coding-agent-rlm@latest

# pypi
uvx coding-agent-rlm
pipx run coding-agent-rlm
```

Or install globally:

```bash
npm i -g coding-agent-rlm    # npm
uv tool install coding-agent-rlm  # pypi
```

## Usage

```
coding-agent-rlm <agent> <globs...> --prompt "<task>" [--max-depth N]
```

### Examples

```bash
# Claude
coding-agent-rlm claude "src/**/*.ts" --prompt "Find all TODO comments"

# Codex
coding-agent-rlm codex "**/*.py" --prompt "Review for security issues"

# Gemini
coding-agent-rlm "bunx --bun @google/gemini-cli" "src/**" --prompt "Architecture overview"

# Multiple globs
coding-agent-rlm claude "src/**" "lib/**" "test/**" --prompt "Find dead code"

# Limit recursion depth
coding-agent-rlm claude "**/*.ts" --prompt "Summarize the codebase" --max-depth 2
```

## How It Works

1. **Expand globs** into a file listing using `fd` (or `find` as fallback)
2. **Build a system prompt** containing the file list and RLM instructions (explore, decompose, aggregate)
3. **Launch the agent** with agent-specific flags for non-interactive execution

The agent receives a file listing — not file contents. It uses shell tools (`rg`, `cat`, `head`, `jq`, etc.) to inspect files as needed. For large file sets (>20 files), it spawns recursive sub-agents on subsets.

### Supported Agents

| Agent         | Command                         | Mode                                                               |
| ------------- | ------------------------------- | ------------------------------------------------------------------ |
| Claude Code   | `claude`                        | `--append-system-prompt` (system prompt separate from user prompt) |
| OpenAI Codex  | `codex`                         | `exec --full-auto`                                                 |
| Google Gemini | `bunx --bun @google/gemini-cli` | `-p --yolo`                                                        |
| Any CLI       | `my-agent`                      | Combined prompt as single argument                                 |

## When to Use

- Many files to analyze (>10)
- Task benefits from divide-and-conquer
- Total content exceeds a comfortable context window
- You want the agent to explore strategically rather than read everything upfront
