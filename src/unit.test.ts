import { describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import Bun from "bun";

const script = resolve(dirname(import.meta.path), "coderlm");
const cwd = resolve(dirname(import.meta.path), "..");

const promptFile = join(tmpdir(), "coderlm-test-prompt.txt");
writeFileSync(promptFile, "test task content");

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
    expect(stdout).toContain("Usage: coderlm");
  });

  test("no args shows usage", async () => {
    const { stdout, exitCode } = await run([]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage: coderlm");
  });

  test("missing --prompt errors", async () => {
    const { stderr, exitCode } = await run(["claude"]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("--prompt is required");
  });

  test("unexpected positional argument errors", async () => {
    const { stderr, exitCode } = await run([
      "claude",
      "*.ts",
      "--prompt",
      promptFile,
    ]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("unexpected argument");
  });

  test("unknown option errors", async () => {
    const { stderr, exitCode } = await run([
      "claude",
      "--bogus",
      "--prompt",
      promptFile,
    ]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("unknown option --bogus");
  });

  test("errors when prompt file not found", async () => {
    const { stderr, exitCode } = await run([
      "claude",
      "--prompt",
      "/nonexistent/file.txt",
    ]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("prompt file not found");
  });
});

// --- Claude ---

describe("claude", () => {
  test("passes -p, --append-system-prompt, --allowedTools", async () => {
    const { args, exitCode } = await dryRun(["claude", "--prompt", promptFile]);
    expect(exitCode).toBe(0);
    expect(args[0]).toBe("claude");
    expect(args[1]).toBe("-p");
    expect(args[2]).toBe("--append-system-prompt");
    // args[3] is the system prompt
    expect(args[3]).toContain("You are an RLM");
    expect(args[4]).toBe("--allowedTools");
    expect(args[5]).toBe("Bash");
    // args[6] is the task reference pointing to the prompt file
    expect(args[6]).toContain("Your task is stored in this file:");
    expect(args[6]).toContain(promptFile);
  });

  test("system prompt contains execution_environment block", async () => {
    const { args } = await dryRun(["claude", "--prompt", promptFile]);
    const sysPrompt = args[3];
    expect(sysPrompt).toContain("<execution_environment>");
    expect(sysPrompt).toContain("output guards");
  });

  test("system prompt contains max-depth", async () => {
    const { args } = await dryRun([
      "claude",
      "--prompt",
      promptFile,
      "--max-depth",
      "5",
    ]);
    const sysPrompt = args[3];
    expect(sysPrompt).toContain("max-depth=5");
  });

  test("--allowedTools overrides default Bash", async () => {
    const { args } = await dryRun([
      "claude",
      "--prompt",
      promptFile,
      "--allowedTools",
      "Bash,Edit",
    ]);
    expect(args[4]).toBe("--allowedTools");
    expect(args[5]).toBe("Bash,Edit");
  });

  test("task file path is NOT embedded in system prompt", async () => {
    const { args } = await dryRun(["claude", "--prompt", promptFile]);
    const sysPrompt = args[3];
    expect(sysPrompt).not.toContain(promptFile);
  });
});

// --- Codex ---

describe("codex", () => {
  test("passes exec --full-auto with combined prompt", async () => {
    const { args, exitCode } = await dryRun(["codex", "--prompt", promptFile]);
    expect(exitCode).toBe(0);
    expect(args[0]).toBe("codex");
    expect(args[1]).toBe("exec");
    expect(args[2]).toBe("--full-auto");
    // args[3] is the combined prompt (system + task reference)
    expect(args[3]).toContain("You are an RLM");
    expect(args[3]).toContain("Your task is stored in this file:");
    expect(args[3]).toContain(promptFile);
  });
});

// --- Gemini ---

describe("gemini", () => {
  test("passes -p and --yolo with combined prompt", async () => {
    const { args, exitCode } = await dryRun([
      "bunx --bun @google/gemini-cli",
      "--prompt",
      promptFile,
    ]);
    expect(exitCode).toBe(0);
    // word-split: bunx, --bun, @google/gemini-cli, -p, <prompt>, --yolo
    expect(args[0]).toBe("bunx");
    expect(args[1]).toBe("--bun");
    expect(args[2]).toBe("@google/gemini-cli");
    expect(args[3]).toBe("-p");
    // args[4] is the combined prompt (system + task reference)
    expect(args[4]).toContain("You are an RLM");
    expect(args[4]).toContain("Your task is stored in this file:");
    expect(args[4]).toContain(promptFile);
    expect(args[5]).toBe("--yolo");
  });
});

// --- Generic ---

describe("generic command", () => {
  test("passes combined prompt as single arg", async () => {
    const { args, exitCode } = await dryRun([
      "my-agent",
      "--prompt",
      promptFile,
    ]);
    expect(exitCode).toBe(0);
    expect(args[0]).toBe("my-agent");
    expect(args[1]).toContain("You are an RLM");
    expect(args[1]).toContain("Your task is stored in this file:");
    expect(args[1]).toContain(promptFile);
  });
});

// --- Model via command ---

describe("model passthrough", () => {
  test("claude with --model is word-split correctly", async () => {
    const { args } = await dryRun([
      "claude --model claude-haiku-4-5",
      "--prompt",
      promptFile,
    ]);
    expect(args[0]).toBe("claude");
    expect(args[1]).toBe("--model");
    expect(args[2]).toBe("claude-haiku-4-5");
    expect(args[3]).toBe("-p");
  });

  test("codex with -m is word-split correctly", async () => {
    const { args } = await dryRun([
      "codex -m gpt-5.2-mini",
      "--prompt",
      promptFile,
    ]);
    expect(args[0]).toBe("codex");
    expect(args[1]).toBe("-m");
    expect(args[2]).toBe("gpt-5.2-mini");
    expect(args[3]).toBe("exec");
  });

  test("gemini with -m is word-split correctly", async () => {
    const { args } = await dryRun([
      "bunx --bun @google/gemini-cli -m gemini-2.5-flash",
      "--prompt",
      promptFile,
    ]);
    expect(args[0]).toBe("bunx");
    expect(args[1]).toBe("--bun");
    expect(args[2]).toBe("@google/gemini-cli");
    expect(args[3]).toBe("-m");
    expect(args[4]).toBe("gemini-2.5-flash");
    expect(args[5]).toBe("-p");
  });
});
