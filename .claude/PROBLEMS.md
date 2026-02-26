# Problems & Solutions

Running log of known issues and workarounds.

## Claude Code cannot be spawned from within a Claude Code session

**Problem**: Running `coderlm claude ...` from inside a Claude Code session (or any child process of Claude Code) fails silently or with "cannot be launched inside another Claude Code session". This happens even after unsetting `CLAUDECODE` — the nesting guard goes deeper than just the env var (likely shared runtime resources or lock files).

**Impact**: Cannot integration-test the `claude` agent path from within Claude Code. The codex and gemini paths work fine.

**Workaround**: Test the claude path from a standalone terminal:
```bash
./src/coderlm claude "**/*.ts" --prompt "Summarize" --max-depth 1
```

The integration test suite uses `--dry-run` for claude to verify command construction without actually spawning a session.

## CLAUDECODE env var leaks into macOS session

**Problem**: Claude Code sets `CLAUDECODE` in child processes. If something triggers `launchctl setenv CLAUDECODE ...`, it persists across all new terminals system-wide — even standalone ones outside the IDE.

**Fix**:
```bash
launchctl unsetenv CLAUDECODE
```

## Gemini CLI hangs when MCP servers conflict

**Problem**: When running `coderlm` with Gemini from inside another agent session (e.g., Claude Code), the shared `nia` MCP server can't handle concurrent connections. Gemini hangs during startup trying to connect.

**Workaround**: Pass `--allowed-mcp-server-names none` to disable MCP servers, or run from a standalone terminal. The integration test sets `GEMINI_ALLOWED_MCP_SERVERS=none` in the env.
