import { describe, expect, test } from "bun:test";
import { dirname, resolve } from "node:path";
import Bun from "bun";

const script = resolve(dirname(import.meta.path), "coding-agent-rlm");
const cwd = resolve(dirname(import.meta.path), "..");

const parseNullDelimited = (buf: Buffer) =>
  buf
    .toString()
    .split("\0")
    .filter((s) => s.length > 0);

async function dryRun(args: string[]) {
  const proc = Bun.spawn(["bash", script, ...args, "--dry-run"], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).arrayBuffer(),
    new Response(proc.stderr).text(),
  ]);
  return {
    args: parseNullDelimited(Buffer.from(stdout)),
    stderr,
    exitCode,
  };
}

async function run(args: string[]) {
  const proc = Bun.spawn(["bash", script, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout, stderr, exitCode };
}

// --- Help & Errors ---

describe("usage", () => {
  test("--help shows usage", async () => {
    const { stdout, exitCode } = await run(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage: coding-agent-rlm");
  });

  test("no args shows usage", async () => {
    const { stdout, exitCode } = await run([]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage: coding-agent-rlm");
  });

  test("missing --prompt errors", async () => {
    const { stderr, exitCode } = await run(["claude", "*.ts"]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("--prompt is required");
  });

  test("missing globs errors", async () => {
    const { stderr, exitCode } = await run(["claude", "--prompt", "test"]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("at least one glob pattern is required");
  });

  test("unknown option errors", async () => {
    const { stderr, exitCode } = await run([
      "claude",
      "*.ts",
      "--bogus",
      "--prompt",
      "test",
    ]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("unknown option --bogus");
  });
});

// --- Claude ---

describe("claude", () => {
  test("passes -p, --append-system-prompt, --allowedTools", async () => {
    const { args, exitCode } = await dryRun([
      "claude",
      "*.toml",
      "--prompt",
      "find bugs",
    ]);
    expect(exitCode).toBe(0);
    expect(args[0]).toBe("claude");
    expect(args[1]).toBe("-p");
    expect(args[2]).toBe("--append-system-prompt");
    // args[3] is the system prompt
    expect(args[3]).toContain("You are an RLM");
    expect(args[3]).toContain("pyproject.toml");
    expect(args[4]).toBe("--allowedTools");
    expect(args[5]).toBe("Bash");
    // args[6] is the user prompt (separate from system prompt)
    expect(args[6]).toBe("find bugs");
  });

  test("system prompt contains file list", async () => {
    const { args } = await dryRun(["claude", "*.json", "--prompt", "test"]);
    const sysPrompt = args[3];
    expect(sysPrompt).toContain("package.json");
  });

  test("system prompt contains max-depth", async () => {
    const { args } = await dryRun([
      "claude",
      "*.json",
      "--prompt",
      "test",
      "--max-depth",
      "5",
    ]);
    const sysPrompt = args[3];
    expect(sysPrompt).toContain("max-depth=5");
  });

  test("user prompt is NOT embedded in system prompt", async () => {
    const { args } = await dryRun([
      "claude",
      "*.json",
      "--prompt",
      "find all secrets",
    ]);
    const sysPrompt = args[3];
    expect(sysPrompt).not.toContain("find all secrets");
  });
});

// --- Codex ---

describe("codex", () => {
  test("passes exec --full-auto with combined prompt", async () => {
    const { args, exitCode } = await dryRun([
      "codex",
      "*.toml",
      "--prompt",
      "review code",
    ]);
    expect(exitCode).toBe(0);
    expect(args[0]).toBe("codex");
    expect(args[1]).toBe("exec");
    expect(args[2]).toBe("--full-auto");
    // args[3] is the combined prompt (system + task)
    expect(args[3]).toContain("You are an RLM");
    expect(args[3]).toContain("review code");
  });

  test("combined prompt includes file list", async () => {
    const { args } = await dryRun(["codex", "*.json", "--prompt", "test"]);
    expect(args[3]).toContain("package.json");
  });
});

// --- Gemini ---

describe("gemini", () => {
  test("passes -p and --yolo with combined prompt", async () => {
    const { args, exitCode } = await dryRun([
      "bunx --bun @google/gemini-cli",
      "*.toml",
      "--prompt",
      "analyze deps",
    ]);
    expect(exitCode).toBe(0);
    // word-split: bunx, --bun, @google/gemini-cli, -p, <prompt>, --yolo
    expect(args[0]).toBe("bunx");
    expect(args[1]).toBe("--bun");
    expect(args[2]).toBe("@google/gemini-cli");
    expect(args[3]).toBe("-p");
    // args[4] is the combined prompt
    expect(args[4]).toContain("You are an RLM");
    expect(args[4]).toContain("analyze deps");
    expect(args[5]).toBe("--yolo");
  });
});

// --- Generic ---

describe("generic command", () => {
  test("passes combined prompt as single arg", async () => {
    const { args, exitCode } = await dryRun([
      "my-agent",
      "*.toml",
      "--prompt",
      "do stuff",
    ]);
    expect(exitCode).toBe(0);
    expect(args[0]).toBe("my-agent");
    expect(args[1]).toContain("You are an RLM");
    expect(args[1]).toContain("do stuff");
  });
});

// --- Model via command ---

describe("model passthrough", () => {
  test("claude with --model is word-split correctly", async () => {
    const { args } = await dryRun([
      "claude --model claude-haiku-4-5",
      "*.toml",
      "--prompt",
      "test",
    ]);
    expect(args[0]).toBe("claude");
    expect(args[1]).toBe("--model");
    expect(args[2]).toBe("claude-haiku-4-5");
    expect(args[3]).toBe("-p");
  });

  test("codex with -m is word-split correctly", async () => {
    const { args } = await dryRun([
      "codex -m gpt-5.2-mini",
      "*.toml",
      "--prompt",
      "test",
    ]);
    expect(args[0]).toBe("codex");
    expect(args[1]).toBe("-m");
    expect(args[2]).toBe("gpt-5.2-mini");
    expect(args[3]).toBe("exec");
  });

  test("gemini with -m is word-split correctly", async () => {
    const { args } = await dryRun([
      "bunx --bun @google/gemini-cli -m gemini-2.5-flash",
      "*.toml",
      "--prompt",
      "test",
    ]);
    expect(args[0]).toBe("bunx");
    expect(args[1]).toBe("--bun");
    expect(args[2]).toBe("@google/gemini-cli");
    expect(args[3]).toBe("-m");
    expect(args[4]).toBe("gemini-2.5-flash");
    expect(args[5]).toBe("-p");
  });
});

// --- File listing ---

describe("file listing", () => {
  test("multiple globs are combined", async () => {
    const { args } = await dryRun([
      "claude",
      "*.toml",
      "*.json",
      "--prompt",
      "test",
    ]);
    const sysPrompt = args[3];
    expect(sysPrompt).toContain("pyproject.toml");
    expect(sysPrompt).toContain("package.json");
  });

  test("no matching files warns on stderr", async () => {
    const { stderr, exitCode } = await dryRun([
      "claude",
      "*.nonexistent",
      "--prompt",
      "test",
    ]);
    expect(exitCode).toBe(0);
    expect(stderr).toContain("no files matched");
  });
});

