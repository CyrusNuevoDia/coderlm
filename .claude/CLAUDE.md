# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A CLI that implements the RLM (Recursive Language Model) pattern: instead of feeding all files into an LLM's context, let it discover files via shell tools, peek strategically, and recursively decompose into sub-agents. Ships as both an npm package (`bunx coderlm`) and a PyPI package (`uvx coderlm`).

## Commands

```bash
bun test                          # run tests
bun test --watch                  # run tests in watch mode
bun test --filter "pattern"       # run a single test by name
just publish                      # bump patch + publish to npm and pypi
just publish npm minor            # bump minor + publish to npm only
just publish pypi major           # bump major + publish to pypi only
bun x ultracite fix               # format and lint
bun x ultracite check             # check for issues
```

## Architecture

The entire CLI is a single bash script at `src/coderlm`. It:
1. Parses args (command, --prompt, --max-depth, --dry-run)
2. Builds a system prompt with RLM instructions (discover, explore, decompose, aggregate)
3. Dispatches to the appropriate agent with agent-specific flags:
   - **claude**: `-p --append-system-prompt <sys> --allowedTools Bash <prompt>` (system prompt separate)
   - **codex**: `exec --full-auto <combined>` (system + task combined)
   - **gemini**: `-p <combined> --yolo` (command is word-split, e.g. `bunx --bun @google/gemini-cli`)
   - **generic**: `<combined>` as single arg

The Python package (`src/__init__.py`) is a thin wrapper that `os.execvp`s the bash script.

**Context guards** (`src/bashrlm.sh`): Wraps common high-output commands (`cat`, `rg`, `grep`, `jq`, `find`, etc.) with truncation to prevent agents from blowing up their context windows. Injected into every non-interactive bash subshell the agent spawns via `BASH_ENV`. The file `src/bashrlm.md` contains the corresponding instructions that get appended to the system prompt, describing the truncation behavior and rules to the agent.

**Model passthrough**: The agent command is word-split (`read -ra _agent_cmd <<< "$agent"`), so model flags can be passed inline:
```bash
coderlm "claude --model claude-haiku-4-5" --prompt "..."
coderlm "codex -m o4-mini" --prompt "..."
```

## Testing

Unit tests are in `src/unit.test.ts` and integration tests in `src/integration.test.ts`, using `bun:test`. Unit tests use `--dry-run` which prints the constructed command as null-delimited args to stdout instead of exec-ing. This lets tests verify argument construction for each agent without actually running them.

## Known Issues

See `.claude/PROBLEMS.md` for a running log of problems and solutions (e.g., Claude Code nesting limitations, MCP server conflicts).

## Dual Publishing

Versions are kept in sync across `package.json` and `pyproject.toml`. The justfile `_bump` recipe uses `npm version` then syncs to pyproject.toml via perl.


# Code Standards

This project uses **Ultracite** (Biome-backed). Run `bun x ultracite fix` before committing.

TypeScript (test files only): use `const` by default, `async/await` over promise chains, explicit types where clarity is improved, `unknown` over `any`. Don't use `.only` or `.skip` in committed tests.
