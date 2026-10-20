import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS } from "./anchors/maswali-admin-form-validation.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";
import { guaranteeReviewDraft, licenceReviewDraft, sunsetChoices, sunsetConfirmText, validGuaranteeDraft, validShareDecision } from "../src/lib/maswali-admin-form-validation.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const poolsControl = fileURLToPath(new URL("../src/app/admin/maswali/pools/pools-controls.tsx", import.meta.url));
const poolsPage = fileURLToPath(new URL("../src/app/admin/maswali/pools/page.tsx", import.meta.url));
const integrityControl = fileURLToPath(new URL("../src/app/admin/maswali/integrity/integrity-controls.tsx", import.meta.url));

if (process.argv.includes("--prove-red")) {
  for (const plant of MUTATIONS) {
    const target = resolve(root, plant.file);
    const before = readFileSync(target, "utf8");
    try {
      writeFileSync(target, injectDefect(before, plant.from, plant.to));
      const run = spawnSync(process.execPath, ["--import", "tsx", "scripts/maswali-admin-form-validation.test.mts"],
        { cwd: root, encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
      assert.notEqual(run.status, 0, `${plant.name} must turn the guard red`);
      assert.match(`${run.stdout}\n${run.stderr}`, plant.failure,
        `${plant.name} failure must name the missing behavior, not a loader error`);
      process.stdout.write(`RED: ${plant.name} behavior is caught\n`);
    } finally {
      writeFileSync(target, before);
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
assert.deepEqual(guaranteeReviewDraft("fund", "001000", "  BANK-123  "),
  { mode: "fund", amount: "1000", reference: "BANK-123" }, "money review freezes the canonical amount and exact submitted reference");
assert.equal(guaranteeReviewDraft("return", "1000", "BAD"), null, "a refused money draft cannot make a review snapshot");
assert.deepEqual(licenceReviewDraft("GBT_WRITTEN", "  Board   letter  42  "),
  { kind: "GBT_WRITTEN", ref: "Board letter 42", label: "The Gaming Board's letter" },
  "licence review names the Board basis and the canonical reference sent to the service");
assert.deepEqual(licenceReviewDraft("NONE", "stale reference"),
  { kind: "NONE", ref: "", label: "None (withdraw it)" }, "withdrawal review cannot carry a stale reference");
assert.equal(licenceReviewDraft("OWNER_RULING", "bad"), null, "a short licence reference cannot make a review snapshot");
assert.equal(licenceReviewDraft("UNKNOWN", "valid reference"), null, "an unknown licence basis cannot make a review snapshot");
assert.equal(validShareDecision(" reason "), true, "a written share decision can confirm");
assert.equal(validShareDecision(""), false, "blank share decision cannot confirm");
assert.equal(validShareDecision("abcd"), false, "short share decision cannot confirm");
assert.equal(validShareDecision("x".repeat(301)), false, "long share decision cannot confirm");

const candidates = Array.from({ length: 26 }, (_, i) => ({ id: `w${i + 1}`, code: `MLN-2026-W${String(i + 1).padStart(2, "0")}`, state: i % 2 ? "OPEN" : "DRAFT" }));
assert.equal(sunsetChoices(candidates, "").rows.length, 0, "a long final-week list requires a code lookup before choices appear");
assert.deepEqual(sunsetChoices(candidates, "w26").rows.map((week) => week.id), ["w26"], "the final-week lookup reaches a candidate beyond the first twenty");
assert.equal(sunsetChoices(candidates, "mln").rows.length, 20, "a broad lookup bounds the rendered final-week options");
assert.equal(sunsetChoices(candidates, "absent").total, 0, "a missing final-week code has an honest empty result");
assert.equal(sunsetChoices(candidates.slice(0, 2), "").rows.length, 2, "a short final-week list remains visible without a search");
const draftReview = sunsetConfirmText(candidates[0]);
assert.match(draftReview.title, /MLN-2026-W01/, "the hard final-week confirmation must name the selected draft week");
assert.match(draftReview.body, /full week's notice.*no later week can open/, "a draft final-week confirmation must explain its timing and consequence");
const openReview = sunsetConfirmText(candidates[1]);
assert.match(openReview.title, /MLN-2026-W02/, "the open final-week confirmation must name that exact selected week");
assert.match(openReview.body, /becomes final at once.*no later week can open/, "an open final-week confirmation must explain its immediate consequence");

const pools = readFileSync(poolsControl, "utf8");
const page = readFileSync(poolsPage, "utf8");
const integrity = readFileSync(integrityControl, "utf8");
assert.match(pools, /const ready = validGuaranteeDraft\(amount, reference\)/,
  "the guarantee form must derive readiness from both entered fields");
assert.match(pools, /disabled=\{pending \|\| !ready\} onClick=\{\(\) => setReview\(guaranteeReviewDraft\("fund", amount, reference\)\)\}/,
  "Pay in must stay disabled until both the amount and rail reference are valid");
assert.match(pools, /disabled=\{pending \|\| !ready\} onClick=\{\(\) => setReview\(guaranteeReviewDraft\("return", amount, reference\)\)\}/,
  "Take back must stay disabled until both the amount and rail reference are valid");
assert.match(pools, /Amount: <strong>\{review \? formatTzs\(Number\(review\.amount\)\) : ""\}<\/strong>/,
  "the guarantee confirmation must show the frozen amount with the shared TZS formatter");
assert.match(pools, /Bank or rail reference: <strong[^>]*>\{review\?\.reference\}<\/strong>/,
  "the guarantee confirmation must show the exact reviewed rail reference");
assert.match(pools, /fd\(\{ amount: review\.amount, reference: review\.reference, typed: word \}\)/,
  "the guarantee action must submit the same amount and reference reviewed in the dialog");
assert.match(pools, /if \(!review \|\| !validGuaranteeDraft\(review\.amount, review\.reference\)\) return;/,
  "the guarantee confirmation must revalidate its frozen values at final submit");
assert.match(pools, /onClick=\{\(\) => setReview\(licenceReviewDraft\(kind, ref\)\)\}/,
  "the licence record button must freeze the basis and reference at review time");
assert.match(pools, /Basis: <strong>\{review\?\.label\}<\/strong>/,
  "the licence confirmation must show the exact basis selected");
assert.match(pools, /Where it is kept: <strong[^>]*>\{review\?\.ref\}<\/strong>/,
  "the licence confirmation must show the exact canonical reference");
assert.match(pools, /fd\(\{ kind: review\.kind, ref: review\.ref \}\)/,
  "the licence action must submit the same basis and reference reviewed in the dialog");
assert.match(pools, /if \(!review \|\| !licenceReviewDraft\(review\.kind, review\.ref\)\) return;/,
  "the licence confirmation must revalidate its frozen values at final submit");
assert.match(pools, /<UnsavedChangesGuard dirty=\{kind !== savedKind \|\| ref\.trim\(\) !== ""\}/,
  "a changed licence basis must guard navigation even when its reference is empty");
assert.match(pools, /setSavedKind\(review\.kind\); setReview\(null\); setRef\(""\);/,
  "a saved licence basis must clear the unsaved warning after successful recording");
assert.match(pools, /Bank or rail reference: <strong className="block break-words">/,
  "a rail reference must get its own line and wrap only when it cannot fit");
assert.match(pools, /Where it is kept: <strong className="block break-words">/,
  "a licence reference must get its own line and wrap only when it cannot fit");
assert.match(pools, /const \[weekId, setWeekId\] = useState\(""\)/,
  "a final week must be chosen explicitly, not silently default to the first candidate");
assert.match(pools, /const choices = sunsetChoices\(weeks, lookup\)/,
  "the final-week selector must use its whole-set code lookup");
assert.match(pools, /disabled=\{pending \|\| !selected \|\| !reasonLengthOk\(reason\)\}/,
  "the final-week action must refuse a missing selection and a short reason");
assert.match(pools, /<ConfirmModal open=\{open && !!selected\}/,
  "the final-week confirmation must not open without a selected candidate");
assert.match(pools, /title=\{review\?\.title \?\? "Choose a final week"\}/,
  "the final-week confirmation must render the selected week's code");
assert.match(pools, /weekId: selected\.id, reason, typed: SUNSET_WORD/,
  "the final-week action must submit the same selected week reviewed in the dialog");
assert.match(page, /weeks=\{sunsetCandidates\.map\(\(w\) => \(\{ id: w\.id, code: w\.code, state: w\.state \}\)\)\}/,
  "the pools page must pass each candidate's code and state into the review");
assert.match(integrity, /if \(!validShareDecision\(reason\)\) \{ setTried\(true\); return; \}/,
  "Hold must refuse a blank decision inside the confirmation");
assert.match(integrity, /if \(!validShareDecision\(text\)\) \{ setTried\(true\); return; \}/,
  "Release and forfeit must refuse a blank decision inside the confirmation");
assert.match(integrity, /\{!open && error && <span role="alert"/,
  "Hold failure must have one visible alert inside its open confirmation");
assert.match(integrity, /\{mode === null && error && <span role="alert"/,
  "Release or forfeit failure must have one visible alert inside its open confirmation");
process.stdout.write("maswali admin form validation: behavior and control-wiring assertions PASS\n");
