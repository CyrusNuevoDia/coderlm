import { describe, expect, test } from "bun:test";
import { dirname, resolve } from "node:path";
import Bun from "bun";

const script = resolve(dirname(import.meta.path), "coderlm");
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

const PROMPT = "List the .toml files in this directory. Reply in one sentence.";
const TIMEOUT = 120_000;

describe("integration", () => {
  test(
    "codex runs end-to-end",
    async () => {
      const proc = Bun.spawn(
        [
          "bash",
          script,
          "codex -m o4-mini",
          "--prompt",
          PROMPT,
          "--max-depth",
          "1",
        ],
        { cwd, stdout: "pipe", stderr: "pipe" }
      );
      const [exitCode, stdout] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
      ]);
      expect(exitCode).toBe(0);
      expect(stdout.toLowerCase()).toContain("pyproject.toml");
    },
    TIMEOUT
  );

  test(
    "gemini runs end-to-end",
    async () => {
      const proc = Bun.spawn(
        [
          "bash",
          script,
          "bunx --bun @google/gemini-cli -m gemini-2.5-flash",
          "--prompt",
          PROMPT,
          "--max-depth",
          "1",
        ],
        { cwd, stdout: "pipe", stderr: "pipe" }
      );
      const [exitCode, stdout] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
      ]);
      expect(exitCode).toBe(0);
      expect(stdout.toLowerCase()).toContain("pyproject.toml");
    },
    TIMEOUT
  );

  test("claude dry-runs with model flag", async () => {
    const { args, exitCode } = await dryRun([
      "claude --model claude-haiku-4-5",
      "--prompt",
      "test",
    ]);
    expect(exitCode).toBe(0);
    expect(args[0]).toBe("claude");
    expect(args[1]).toBe("--model");
    expect(args[2]).toBe("claude-haiku-4-5");
    expect(args[3]).toBe("-p");
    expect(args[4]).toBe("--append-system-prompt");
    expect(args[5]).toContain("You are an RLM");
  });
});
