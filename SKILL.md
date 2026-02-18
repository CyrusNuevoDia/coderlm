---
name: coding-agent-rlm
description: Use when a task involves many files (>10), the total content exceeds comfortable context size, or the task benefits from divide-and-conquer. Runs an agent with a file listing instead of file contents, letting it peek strategically and recursively decompose into sub-agents.
---

## Usage

```
coding-agent-rlm <agent> <globs...> --prompt "<task>" [--max-depth N]
```

## Examples

```bash
coding-agent-rlm claude "src/**/*.ts" --prompt "Find all TODO comments"
coding-agent-rlm claude "src/**" "lib/**" --prompt "Architecture overview"
coding-agent-rlm codex "**/*.py" --prompt "Review for security issues"
coding-agent-rlm "bunx --bun @google/gemini-cli" "src/**" --prompt "Find dead code"
```
