/**
 * RED HARNESS — the money rail nobody chose.
 *
 *   node scripts/payment-control-red.mjs        (npm run red:payment-control)
 *
 * ⭐ MUTATION 1 IS THE PRODUCTION STATE AT `adc3718f`, VERBATIM. `envProvider()` folded
 * three states into one — the variable set to `mock` (a choice), UNSET (nobody chose),
 * and set to something unrecognised (a failed choice) — and returned `mock` for all
 * three. On a LIVE deployment the last two silently activated an adapter whose own doc
 * comment says it "fabricates confirmations: deposits credit real wallets with no money
 * received", with no typed confirm, no COMPLIANCE audit and no banner, because those
 * exist only where an officer PICKS the mock. If mutation 1 ever stops going red, the
 * refusal has been undone.
 *
 * ⚠️ MUTATIONS 5 AND 6 ARE OVER-CORRECTIONS, NOT DEFECTS OF THE OLD KIND. They refuse a
 * mock that WAS chosen, and refuse in TEST mode. Both must go red too: the first would
 * silently reverse the owner decision of 2026-07-24, the second would stop every
 * developer machine and CI box booting. A guard that only fails in one direction turns
 * the next fix into a regression.
 *
 * ⚠️ CRLF: an LF anchor silently fails to match a CRLF tree, the mutation never applies,
 * and the harness reports "defect not caught" as guard weakness. Every mutation matches
 * both line endings AND re-reads the file to confirm the anchor is gone from disk.
 *
 * ⚠️ POSITIVE CONTROL FIRST. A refusal check needs one in the same run, or fixing the
 * defect turns the check red and nobody can tell the two apart.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const CTRL = new URL("../src/lib/server/payment-control.ts", import.meta.url);
const PAY = new URL("../src/lib/server/payments.ts", import.meta.url);
const originals = new Map([[CTRL, readFileSync(CTRL, "utf8")], [PAY, readFileSync(PAY, "utf8")]]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const CWD = new URL("..", import.meta.url);
const suiteFails = () => {
  try {
    const out = execSync("npx tsx scripts/payment-control.test.mts", { cwd: CWD, stdio: "pipe" }).toString();
    // ⛔ Exit code alone is not enough — the suite must also REPORT a failure. A
    // harness that only checks "did the file change" prints ✓ RED for mutations the
    // guard silently passed; that happened twice in this repo.
    return /(?:^|\n)payment-control: \d+ passed, [1-9]\d* failed/.test(out);
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    return /[1-9]\d* failed/.test(out) || /Error|error TS/.test(out);
  }
};

restore();
if (suiteFails()) {
  console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
  console.error("  A red below would be indistinguishable from red-on-everything. Fix the suite first.");
  process.exit(1);
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

const MUTATIONS = [
  {
    name: "unset-falls-back-to-the-mock",
    why: "⭐ THE ACTUAL PRE-2026-09-08 STATE — real money LIVE, nothing chosen, and the resolver hands back the simulator. A deposit 'confirms' and a real wallet is credited for money that never arrived",
    file: CTRL,
    from: `  if (isLiveMoneyMode()) {`,
    to: `  if (false) {`,
  },
  {
    name: "dispatch-ignores-the-refusal",
    why: "★ the resolver still refuses but the MONEY PATH does not listen — `adapterFor` falls through its `default` arm straight back to the mock. The view would look correct while wallets were credited",
    file: PAY,
    from: `  if (!resolution.ok) {`,
    to: `  if (false && !resolution.ok) {`,
  },
  {
    name: "a-typo-counts-as-a-choice",
    why: "PAYMENT_AGGREGATOR=selcomm in Railway. Any non-empty string is treated as a deliberate selection, so a misspelt variable re-activates the simulator on real money",
    file: CTRL,
    from: `  return { provider: (ALL_PROVIDERS as string[]).includes(v) ? (v as PaymentProviderId) : null, raw };`,
    to: `  return { provider: (raw ? (v as PaymentProviderId) : null), raw };`,
  },
  {
    name: "the-view-denies-it",
    why: "the money path refuses but /admin/payments reports a healthy rail — the operator is never told why every deposit is failing",
    file: CTRL,
    from: `    moneyRailUnset: !resolved.ok,`,
    to: `    moneyRailUnset: false,`,
  },
  {
    name: "over-correction-a-CHOSEN-mock-is-refused-too",
    why: "⚠️ NOT THE OLD DEFECT — the mirror. Refusing a mock an officer deliberately selected silently REVERSES the owner decision of 2026-07-24; the positive control must catch it",
    file: CTRL,
    from: `  if (store.provider !== null) return { ok: true, provider: store.provider, source: "officer" };`,
    to: `  if (store.provider !== null && store.provider !== "mock") return { ok: true, provider: store.provider, source: "officer" };`,
  },
  {
    name: "over-correction-TEST-mode-refuses-too",
    why: "⚠️ NOT A MONEY DEFECT — it breaks every developer machine and CI box, which boot with no configuration at all and must still run the mock",
    file: CTRL,
    from: `  // TEST: unchanged — a deployment with no configuration behaves exactly as it did.\n  return { ok: true, provider: "mock", source: "env" };`,
    to: `  return { ok: false, provider: null, source: "none", envRaw: "", reason: "refused in every mode" };`,
  },
  {
    name: "hydration-flag-raised-before-the-read",
    why: "★ §H — the flag goes up before `await loadConfig`, so a caller arriving during that round-trip reads the DEFAULTS as though they were the officer's saved row",
    file: CTRL,
    from: `      globalThis.__50PICK_PAY_CONTROL_HYDRATED = true;\n    })()`,
    to: `    })()`,
    extra: {
      from: `    globalThis.__50PICK_PAY_CONTROL_HYDRATING = (async () => {`,
      to: `    globalThis.__50PICK_PAY_CONTROL_HYDRATED = true;\n    globalThis.__50PICK_PAY_CONTROL_HYDRATING = (async () => {`,
    },
  },
];

let caught = 0;
const problems = [];

/**
 * Apply one anchored replacement, CRLF-aware, and confirm it landed on disk.
 *
 * ⚠️ "THE ANCHOR IS GONE" IS THE WRONG LANDED-CHECK FOR AN INSERTION, and this harness
 * proved it on its own first run: the hydration mutation REPLACES a line with a copy of
 * itself plus one more, so the anchor is still there afterwards by design and the edit
 * was reported as a HARNESS ERROR though it had applied perfectly. The check is now:
 * the file must have CHANGED, and the anchor must be gone only when the replacement
 * does not deliberately contain it.
 */
function applyEdit(file, from, to) {
  const src = readFileSync(file, "utf8");
  const asCRLF = from.replace(/\n/g, "\r\n");
  const anchor = src.includes(from) ? from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) return `anchor not found`;
  writeFileSync(file, src.replace(anchor, anchor === asCRLF ? to.replace(/\n/g, "\r\n") : to));
  const after = readFileSync(file, "utf8");
  if (after === src) return `file unchanged after write`;
  const reinserted = to.replace(/\r\n/g, "\n").includes(from.replace(/\r\n/g, "\n"));
  if (!reinserted && after.includes(anchor)) return `anchor still present after write`;
  return null;
}

for (const m of MUTATIONS) {
  restore();
  let err = applyEdit(m.file, m.from, m.to);
  if (!err && m.extra) err = applyEdit(m.file, m.extra.from, m.extra.to);
  if (err) { problems.push(`${m.name} — HARNESS ERROR: ${err}`); continue; }

  if (suiteFails()) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
