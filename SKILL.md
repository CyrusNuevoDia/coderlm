---
name: coderlm
description: Use when a task involves many files (>10), the total content exceeds comfortable context size, or the task benefits from divide-and-conquer. Runs an agent with a file listing instead of file contents, letting it peek strategically and recursively decompose into sub-agents. Bundles bashrlm context guards — output from high-output commands (cat, grep, rg, jq, find, ls, curl, etc.) is automatically truncated so the agent never floods its own context window.
---

## Usage

```
coderlm <agent> <globs...> --prompt "<task>" [--max-depth N] [--allowedTools TOOLS]
```

## Examples

```bash
coderlm codex "src/**/*.ts" --prompt "Find all TODO comments"
coderlm codex "src/**" "lib/**" --prompt "Architecture overview"
coderlm "bunx --bun @google/gemini-cli" "**/*.py" --prompt "Review for security issues"
coderlm "bunx --bun @google/gemini-cli" "src/**" --prompt "Find dead code"
coderlm claude "src/**" --prompt "Fix type errors" --allowedTools "Bash,Edit"
```
