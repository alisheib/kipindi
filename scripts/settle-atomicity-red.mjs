/**
 * RED proof for `settle-atomicity.test.mts`.
 *
 * Reverts each half of the 2026-08-10 settlement-atomicity fix in turn, requires the
 * suite to EXIT NON-ZERO, then restores `market-service.ts` byte-for-byte and
 * re-verifies it is green.
 *
 * ⛔ WHY THIS HARNESS IS NOT OPTIONAL HERE. The defect it guards exists only against
 * real Postgres: the in-memory store has no transactions, so settlement behaves
 * identically with and without the fix. Every money suite in the repo (cert-f1,
 * money-invariants, settlement-gate, ledger, trial-balance, payout-alloc) was GREEN
 * on both sides of the bug. A structural guard is therefore the only thing standing
 * between this defect and a re-introduction — and a structural guard nobody has seen
 * fail is indistinguishable from a guard that reads nothing.
 *
 * ⛔ Checking only that the file CHANGED is the trap: a mutation the guard never
 * reads looks exactly like a guard that works. Each mutation below names the check it
 * must break, and one that does not break it is reported as a MISS, not a pass.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TARGET = join(HERE, "..", "src", "lib", "server", "market-service.ts");
const SUITE = join(HERE, "settle-atomicity.test.mts");
const original = readFileSync(TARGET, "utf8");

const MUTATIONS = [
  {
    name: "the settledAt stamp goes back on its own connection (THE BUG)",
    breaks: "marketStore.set(...) passes a tx",
    from: "await marketStore.set(m, lockTx ?? undefined);",
    to: "await marketStore.set(m);",
  },
  {
    name: "the LOSS mark autocommits again while the winners are uncommitted",
    breaks: "positionStore.set(...) passes a tx",
    from: "await positionStore.set(p, lockTx ?? undefined);",
    to: "await positionStore.set(p);",
  },
  {
    name: "the withLock callback stops binding its transaction",
    breaks: "the withLock callback binds its transaction",
    from: "async (lockTx): Promise<ServiceResult<{ winnersPaid: number; positionsSettled: number }>> => {",
    to: "async (): Promise<ServiceResult<{ winnersPaid: number; positionsSettled: number }>> => {",
  },
  {
    name: "a missing wallet silently skips the position again",
    breaks: "no silent `continue` on a missing wallet",
    from: "if (!w) throw new Error(`settle ${m.id}: wallet row missing for user ${p.userId} — refusing to settle and strand position ${p.id}`);",
    to: "if (!w) continue;",
  },
  {
    name: "the emergency void goes back to moving money with no transaction",
    breaks: "emergencyVoidMarket refunds inside withMoneyTx",
    from: "      await withMoneyTx(async (tx) => {\n        p.status = \"VOID\";\n        p.finalPayout = p.stake;\n        p.settledAt = now;",
    to: "      await (async (tx) => {\n        p.status = \"VOID\";\n        p.finalPayout = p.stake;\n        p.settledAt = now;",
  },
  {
    name: "the emergency void's settledAt stamp autocommits again",
    breaks: "marketStore.set(...) passes a tx",
    from: "await marketStore.set(m, lockTx ?? undefined);\n    recordSnapshot(m.id, 0, 0);",
    to: "await marketStore.set(m);\n    recordSnapshot(m.id, 0, 0);",
  },
  {
    name: "the emergency ledger group goes back to fire-and-forget",
    breaks: "the emergency ledger write is not fire-and-forget",
    from: "          await postLedgerEntries(`refund_${emergTxnId}`, refundEntries({ txnId: emergTxnId, userId: p.userId, marketId: m.id, realPart, bonusPart }), tx);",
    to: "          postLedgerEntries(`refund_${emergTxnId}`, refundEntries({ txnId: emergTxnId, userId: p.userId, marketId: m.id, realPart, bonusPart })).catch(() => {});",
  },
];

// ⛔ RESOLVE THE TSX CLI AND RUN IT WITH `process.execPath` — never `execFileSync("npx", …)`.
// On Windows `npx` is `npx.cmd`, which execFileSync cannot spawn without a shell: it throws
// ENOENT, and the catch below turns that into `{ code: 1, out: "" }` — INDISTINGUISHABLE
// from "the suite failed". This harness then aborts claiming the suite is already red, on a
// suite that is green (observed on first run, 2026-08-10). That is E-133 wearing a third
// costume — a path assumption that holds on Linux and breaks here — and a RED harness that
// cannot run is worth less than no harness at all, because it reports a problem it invented.
const TSX = join(HERE, "..", "node_modules", "tsx", "dist", "cli.mjs");
const run = () => {
  try {
    const out = execFileSync(process.execPath, [TSX, SUITE], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
};

// ⛔ NORMALISE LINE ENDINGS BEFORE MATCHING. `market-service.ts` is stored with CRLF
// on this checkout, so a multi-line anchor written with "\n" finds NOTHING while
// single-line anchors match perfectly — which reads as "the guard missed it" when the
// truth is "the harness never planted the defect". That is exactly the CRLF half of
// E-133 (`test:updown-push` matched "\n      }\n" literally and judged the same commit
// opposite ways on Linux and Windows). We detect the file's own EOL and rewrite each
// anchor into it, so this harness behaves identically on either platform.
const EOL = original.includes("\r\n") ? "\r\n" : "\n";
const toEol = (s) => s.replace(/\r?\n/g, EOL);

let caught = 0;
let missed = 0;

console.log(`RED proof — settlement atomicity  (file EOL: ${EOL === "\r\n" ? "CRLF" : "LF"})\n`);

const baseline = run();
if (baseline.code !== 0) {
  console.log("⛔ ABORT: the suite is already RED before any mutation. Fix that first.");
  console.log(baseline.out.slice(-1500));
  process.exit(1);
}
console.log("  baseline: GREEN\n");

for (const m of MUTATIONS) {
  const from = toEol(m.from);
  const to = toEol(m.to);
  if (!original.includes(from)) {
    console.log(`  ⛔ ANCHOR MISSING — ${m.name}`);
    console.log(`     could not find: ${m.from.slice(0, 80)}`);
    missed++;
    continue;
  }
  writeFileSync(TARGET, original.replace(from, to), "utf8");
  const r = run();
  writeFileSync(TARGET, original, "utf8");

  // The mutation must break the SPECIFIC check it targets, not merely make the
  // suite unhappy for some unrelated reason.
  const brokeTheRightCheck = r.out.includes(`FAIL ${m.breaks}`);
  if (r.code !== 0 && brokeTheRightCheck) {
    console.log(`  ✔ CAUGHT  ${m.name}`);
    caught++;
  } else if (r.code !== 0) {
    console.log(`  ⚠️ CAUGHT BY THE WRONG CHECK — ${m.name}`);
    console.log(`     expected "FAIL ${m.breaks}"`);
    missed++;
  } else {
    console.log(`  ⛔ MISS    ${m.name}  — the guard did not notice`);
    missed++;
  }
}

const restored = readFileSync(TARGET, "utf8");
console.log(`\n  file restored byte-for-byte: ${restored === original ? "yes" : "🔴 NO"}`);
const final = run();
console.log(`  suite green again: ${final.code === 0 ? "yes" : "🔴 NO"}`);

console.log(`\n  ${caught}/${MUTATIONS.length} mutations caught, ${missed} missed`);
process.exit(missed === 0 && restored === original && final.code === 0 ? 0 : 1);
