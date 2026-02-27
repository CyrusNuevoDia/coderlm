[![npm](https://img.shields.io/npm/v/coderlm)](https://www.npmjs.com/package/coderlm) [![PyPI](https://img.shields.io/pypi/v/coderlm)](https://pypi.org/project/coderlm/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# coderlm

Make codex, gemini-cli, or any other coding agent into an RLM.

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
coderlm <agent> --prompt "<task>" [--max-depth N] [--allowedTools TOOLS]
```

### Examples

```bash
# Codex
coderlm codex --prompt "Find all TODO comments in src/"
coderlm codex --prompt "Find dead code in src/, lib/, and test/"
coderlm codex --prompt "Summarize the codebase" --max-depth 2

# Gemini
coderlm "bunx --bun @google/gemini-cli" --prompt "Review **/*.py for security issues"
coderlm "bunx --bun @google/gemini-cli" --prompt "Architecture overview of src/"

# Claude (non-recursive only — Claude cannot spawn nested Claude sessions)
coderlm claude --prompt "Fix type errors in src/" --allowedTools "Bash,Edit"
```

## How It Works

1. **Build a system prompt** with RLM instructions (discover, explore, decompose, aggregate)
2. **Inject context guards** via `BASH_ENV` so every bash subshell the agent spawns has output truncation active
3. **Launch the agent** with agent-specific flags for non-interactive execution

The agent starts with no file contents in context. It uses shell tools (`fd`, `rg`, `cat`, `head`, `jq`, etc.) to discover and inspect files as needed. For large file sets (>20 files), it spawns recursive sub-agents on subsets.

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
