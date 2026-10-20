import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validGuaranteeDraft, validShareDecision } from "../src/lib/maswali-admin-form-validation.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = fileURLToPath(new URL("../src/lib/maswali-admin-form-validation.ts", import.meta.url));
const poolsControl = fileURLToPath(new URL("../src/app/admin/maswali/pools/pools-controls.tsx", import.meta.url));
const integrityControl = fileURLToPath(new URL("../src/app/admin/maswali/integrity/integrity-controls.tsx", import.meta.url));

if (process.argv.includes("--prove-red")) {
  for (const plant of [
    { file: source, anchor: "ref.length >= 5 && ref.length <= 120", mutation: "ref.length >= 0 && ref.length <= 120",
      failure: /blank rail reference cannot open a money confirmation/, name: "blank reference" },
    { file: poolsControl, anchor: 'disabled={pending || !ready} onClick={() => setMode("fund")}',
      mutation: 'disabled={pending} onClick={() => setMode("fund")}',
      failure: /Pay in must stay disabled until both the amount and rail reference are valid/, name: "fund-button gate" },
    { file: integrityControl, anchor: "if (!validShareDecision(reason)) { setTried(true); return; }",
      mutation: "if (false) { setTried(true); return; }",
      failure: /Hold must refuse a blank decision inside the confirmation/, name: "share-decision gate" },
    { file: integrityControl, anchor: '{!open && error && <span role="alert"',
      mutation: '{error && <span role="alert"',
      failure: /Hold failure must have one visible alert inside its open confirmation/, name: "hold-alert placement" },
    { file: integrityControl, anchor: '{mode === null && error && <span role="alert"',
      mutation: '{error && <span role="alert"',
      failure: /Release or forfeit failure must have one visible alert inside its open confirmation/, name: "decision-alert placement" },
  ]) {
    const before = readFileSync(plant.file, "utf8");
    assert.equal(before.split(plant.anchor).length - 1, 1, `${plant.name} plant must have one target`);
    try {
      writeFileSync(plant.file, before.replace(plant.anchor, plant.mutation));
      const run = spawnSync(process.execPath, ["--import", "tsx", "scripts/maswali-admin-form-validation.test.mts"],
        { cwd: root, encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
      assert.notEqual(run.status, 0, `${plant.name} must turn the guard red`);
      assert.match(`${run.stdout}\n${run.stderr}`, plant.failure,
        `${plant.name} failure must name the missing behavior, not a loader error`);
      process.stdout.write(`RED: ${plant.name} behavior is caught\n`);
    } finally {
      writeFileSync(plant.file, before);
    }
  }
  process.exit(0);
}

assert.equal(validGuaranteeDraft("1000", "BANK-123"), true, "a whole amount with a real reference can open confirmation");
assert.equal(validGuaranteeDraft("1000", ""), false, "blank rail reference cannot open a money confirmation");
assert.equal(validGuaranteeDraft("1000", " ab "), false, "short rail reference cannot open a money confirmation");
assert.equal(validGuaranteeDraft("0", "BANK-123"), false, "zero cannot open a money confirmation");
assert.equal(validGuaranteeDraft("-1", "BANK-123"), false, "negative amount cannot open a money confirmation");
assert.equal(validGuaranteeDraft("1.5", "BANK-123"), false, "fractional amount cannot open a money confirmation");
assert.equal(validGuaranteeDraft("9007199254740992", "BANK-123"), false, "unsafe integer cannot open a money confirmation");
assert.equal(validGuaranteeDraft("1000", "X".repeat(121)), false, "long rail reference cannot open a money confirmation");
assert.equal(validShareDecision(" reason "), true, "a written share decision can confirm");
assert.equal(validShareDecision(""), false, "blank share decision cannot confirm");
assert.equal(validShareDecision("abcd"), false, "short share decision cannot confirm");
assert.equal(validShareDecision("x".repeat(301)), false, "long share decision cannot confirm");

const pools = readFileSync(poolsControl, "utf8");
const integrity = readFileSync(integrityControl, "utf8");
assert.match(pools, /const ready = validGuaranteeDraft\(amount, reference\)/,
  "the guarantee form must derive readiness from both entered fields");
assert.match(pools, /disabled=\{pending \|\| !ready\} onClick=\{\(\) => setMode\("fund"\)\}/,
  "Pay in must stay disabled until both the amount and rail reference are valid");
assert.match(pools, /disabled=\{pending \|\| !ready\} onClick=\{\(\) => setMode\("return"\)\}/,
  "Take back must stay disabled until both the amount and rail reference are valid");
assert.match(integrity, /if \(!validShareDecision\(reason\)\) \{ setTried\(true\); return; \}/,
  "Hold must refuse a blank decision inside the confirmation");
assert.match(integrity, /if \(!validShareDecision\(text\)\) \{ setTried\(true\); return; \}/,
  "Release and forfeit must refuse a blank decision inside the confirmation");
assert.match(integrity, /\{!open && error && <span role="alert"/,
  "Hold failure must have one visible alert inside its open confirmation");
assert.match(integrity, /\{mode === null && error && <span role="alert"/,
  "Release or forfeit failure must have one visible alert inside its open confirmation");
process.stdout.write("maswali admin form validation: 12 behavior and 7 control-wiring assertions PASS\n");
