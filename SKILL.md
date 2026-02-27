---
name: coderlm
description: Use when a task involves many files (>10), the total content exceeds comfortable context size, or the task benefits from divide-and-conquer. Runs an agent that discovers files via shell tools, peeks strategically, and recursively decomposes into sub-agents. Bundles bashrlm context guards — output from high-output commands (cat, grep, rg, jq, find, ls, curl, etc.) is automatically truncated so the agent never floods its own context window.
---

## Usage

```
coderlm <agent> --prompt "<task>" [--max-depth N] [--allowedTools TOOLS]
```

## Examples

```bash
coderlm codex --prompt "Find all TODO comments in src/"
coderlm codex --prompt "Architecture overview of src/ and lib/"
coderlm "bunx --bun @google/gemini-cli" --prompt "Review **/*.py for security issues"
coderlm "bunx --bun @google/gemini-cli" --prompt "Find dead code in src/"
coderlm claude --prompt "Fix type errors in src/" --allowedTools "Bash,Edit"
```
