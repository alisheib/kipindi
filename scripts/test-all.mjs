#!/usr/bin/env node
/**
 * test:all — the single Phase-B safety net.
 *
 * Runs typecheck + every `test:*` suite declared in package.json (money,
 * security, concurrency, i18n, compliance) in isolated child processes,
 * aggregates a pass/fail summary, and exits non-zero if ANYTHING fails.
 *
 * Each `tsx` suite is a fresh process, so the in-memory store never leaks
 * across suites. Suites run sequentially for deterministic, readable output.
 *
 * Usage:
 *   node scripts/test-all.mjs              # typecheck + all suites
 *   node scripts/test-all.mjs --no-tsc     # skip the typecheck step
 *   node scripts/test-all.mjs --only money # only suites whose key contains "money"
 *   node scripts/test-all.mjs --filter kyc,ledger,wallet
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const args = process.argv.slice(2);
const noTsc = args.includes("--no-tsc");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;
const filterIdx = args.indexOf("--filter");
const filterList = filterIdx >= 0 ? (args[filterIdx + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean) : null;

// Every `test:*` script except the aggregator itself, in declaration order.
let suites = Object.keys(pkg.scripts)
  .filter((k) => k.startsWith("test:") && k !== "test:all")
  .map((k) => ({ key: k, cmd: pkg.scripts[k] }));

if (only) suites = suites.filter((s) => s.key.includes(only));
if (filterList) suites = suites.filter((s) => filterList.some((f) => s.key.includes(f)));

const npmCli = process.platform === "win32" ? "npm.cmd" : "npm";
const results = [];
const t0 = Date.now();

function hr() { return "─".repeat(64); }

function run(label, bin, argv) {
  const start = Date.now();
  const r = spawnSync(bin, argv, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32", // npm.cmd needs a shell on Windows
    env: { ...process.env, FORCE_COLOR: "0" },
    maxBuffer: 32 * 1024 * 1024,
  });
  const ms = Date.now() - start;
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const passed = r.status === 0;
  results.push({ label, passed, ms, out });
  const tag = passed ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${tag}  ${label.padEnd(26)} ${(ms / 1000).toFixed(1)}s`);
  if (!passed) {
    // Surface the failing tail so an unattended run captures the reason.
    const tail = out.trim().split("\n").slice(-25).join("\n");
    console.log(`\x1b[90m${tail.split("\n").map((l) => "        │ " + l).join("\n")}\x1b[0m`);
  }
  return passed;
}

console.log(`\n${hr()}\n  test:all — ${suites.length} suite(s)${noTsc ? "" : " + typecheck"}\n${hr()}`);

if (!noTsc) run("typecheck", npmCli, ["run", "typecheck"]);
for (const s of suites) run(s.key, npmCli, ["run", s.key]);

const failed = results.filter((r) => !r.passed);
const totalMs = Date.now() - t0;

console.log(`\n${hr()}`);
console.log(`  ${results.length - failed.length}/${results.length} green · ${(totalMs / 1000).toFixed(1)}s total`);
if (failed.length) {
  console.log(`  \x1b[31mFAILED:\x1b[0m ${failed.map((f) => f.label).join(", ")}`);
}
console.log(`${hr()}\n`);

process.exit(failed.length ? 1 : 0);
