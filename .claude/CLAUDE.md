# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A CLI that implements the RLM (Recursive Language Model) pattern: instead of feeding all files into an LLM's context, give it a file listing and let it use tools to peek, decompose, and recursively call itself on subsets. Ships as both an npm package (`bunx coding-agent-rlm`) and a PyPI package (`uvx coding-agent-rlm`).

## Commands

```bash
bun test                          # run tests
bun test --watch                  # run tests in watch mode
just publish                      # bump patch + publish to npm and pypi
just publish npm minor            # bump minor + publish to npm only
just publish pypi major           # bump major + publish to pypi only
```

## Architecture

The entire CLI is a single bash script at `src/coding-agent-rlm`. It:
1. Parses args (command, globs, --prompt, --max-depth, --dry-run)
2. Expands globs via `fd` (falls back to `find`)
3. Builds a system prompt with the file list and RLM instructions
4. Dispatches to the appropriate agent with agent-specific flags:
   - **claude**: `-p --append-system-prompt <sys> --allowedTools Bash <prompt>` (system prompt separate)
   - **codex**: `exec --full-auto <combined>` (system + task combined)
   - **gemini**: `-p <combined> --yolo` (command is word-split, e.g. `bunx --bun @google/gemini-cli`)
   - **generic**: `<combined>` as single arg

The Python package (`coding_agent_rlm/__init__.py`) is a thin wrapper that `os.execvp`s the bash script.

## Testing

Unit tests are in `src/unit.test.ts` and integration tests in `src/integration.test.ts`, using `bun:test`. Unit tests use `--dry-run` which prints the constructed command as null-delimited args to stdout instead of exec-ing. This lets tests verify argument construction for each agent without actually running them.

## Known Issues

See `.claude/PROBLEMS.md` for a running log of problems and solutions (e.g., Claude Code nesting limitations, MCP server conflicts).

## Dual Publishing

Versions are kept in sync across `package.json` and `pyproject.toml`. The justfile `_bump` recipe uses `npm version` then syncs to pyproject.toml via perl.


# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `bun x ultracite fix` before committing to ensure compliance.
