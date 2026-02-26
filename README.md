# coderlm

Process large codebases with Coding Agents using the **RLM (Recursive Language Model)** pattern — with bundled context guards to keep the agent's output from flooding its own context window.

Instead of stuffing all files into an LLM's context window, give it a file listing and let it use tools to peek, decompose, and recursively call itself on subsets. This keeps each agent focused on a manageable scope while covering arbitrarily large codebases.

## Install

```bash
# npm / bun
bunx coderlm@latest
npx coderlm@latest

# pypi
uvx coderlm
pipx run coderlm
```

Or install globally:

```bash
npm i -g coderlm    # npm
uv tool install coderlm  # pypi
```

## Usage

```
coderlm <agent> <globs...> --prompt "<task>" [--max-depth N] [--allowedTools TOOLS]
```

### Examples

```bash
# Codex
coderlm codex "src/**/*.ts" --prompt "Find all TODO comments"
coderlm codex "src/**" "lib/**" "test/**" --prompt "Find dead code"
coderlm codex "**/*.ts" --prompt "Summarize the codebase" --max-depth 2

# Gemini
coderlm "bunx --bun @google/gemini-cli" "**/*.py" --prompt "Review for security issues"
coderlm "bunx --bun @google/gemini-cli" "src/**" --prompt "Architecture overview"

# Claude (non-recursive only — Claude cannot spawn nested Claude sessions)
coderlm claude "src/**" --prompt "Fix type errors" --allowedTools "Bash,Edit"
```

## How It Works

1. **Expand globs** into a file listing using `fd` (or `find` as fallback)
2. **Build a system prompt** containing the file list and RLM instructions (explore, decompose, aggregate)
3. **Inject context guards** via `BASH_ENV` so every bash subshell the agent spawns has output truncation active
4. **Launch the agent** with agent-specific flags for non-interactive execution

The agent receives a file listing — not file contents. It uses shell tools (`rg`, `cat`, `head`, `jq`, etc.) to inspect files as needed. For large file sets (>20 files), it spawns recursive sub-agents on subsets.

### Context Guards (bundled)

`bashrlm.sh` is bundled and auto-activates for every agent run. It wraps high-output commands (`cat`, `grep`, `rg`, `jq`, `find`, `ls`, `curl`, etc.) with automatic truncation, preventing the agent from flooding its own context window with oversized output.

Truncation uses head+tail mode — the agent sees the start and end of any large output, with the middle omitted:

```
[TRUNCATED — showing 2000 of 15000 chars, first and last 1000]
```

Guards are redirect-aware: piping to a file (`> /tmp/out.txt`) bypasses truncation, so multi-step processing works naturally. The agent's system prompt includes instructions for this pattern.

### Supported Agents

| Agent         | Command                         | Notes                                                              |
| ------------- | ------------------------------- | ------------------------------------------------------------------ |
| OpenAI Codex  | `codex`                         | Recommended — supports recursive sub-agents                        |
| Google Gemini | `bunx --bun @google/gemini-cli` | Supports recursive sub-agents                                      |
| Claude Code   | `claude`                        | Non-recursive only — cannot spawn nested Claude sessions           |
| Any CLI       | `my-agent`                      | Combined prompt passed as single argument                          |

## When to Use

- Many files to analyze (>10)
- Task benefits from divide-and-conquer
- Total content exceeds a comfortable context window
- You want the agent to explore strategically rather than read everything upfront
