/**
 * SETTLEMENT ATOMICITY GUARD — every money write inside `settleMarket` must ride
 * the lock's transaction.
 *
 * The bug this exists to prevent (found 2026-08-10):
 *
 *   `settleMarket` runs its whole body inside `withLock("market:<id>")`, which
 *   opens a Prisma `$transaction` and PUBLISHES it (locks.ts) so that every nested
 *   `withMoneyTx` JOINS it (ledger.ts) instead of opening its own. Consequence:
 *   every winner credit, position mark, payout txn and ledger group stays
 *   UNCOMMITTED until the whole callback returns.
 *
 *   `persistResolution()` wrote the settledAt stamp with `marketStore.set(m)` —
 *   no `tx`. `set(m, tx)` resolves `(tx ?? pc())`, so with no tx it took the GLOBAL
 *   client and committed IMMEDIATELY, on a different connection, while the money
 *   was still uncommitted.
 *
 *   A comment above it explained that settledAt is persisted "LAST, after every
 *   position is paid", so that a crash could not strand winners. That reasoning was
 *   true when each payout autocommitted as it was written, and became false the day
 *   the lock started publishing its transaction. Persisting it "last" persisted it
 *   FIRST — and any rollback in the tail (the watcher alert still awaits two
 *   round-trips afterwards, under a 30s transaction timeout) left settledAt
 *   committed with every winning position still OPEN, no wallet credited, and
 *   nothing able to detect it: `settleMarket` itself, `listSettlementQueue`,
 *   `getSettlementHealth`, `marketStore.pending` and the scheduler ALL treat a
 *   non-null settledAt as "done".
 *
 *   A second instance of the same shape sat 300 lines below: the LOSS branch was
 *   the only `positionStore.set` in the scope that passed no tx.
 *
 * WHY THIS GUARD IS STRUCTURAL AND NOT BEHAVIOURAL. The defect only exists against
 * real Postgres — the in-memory store has no transactions at all, so a functional
 * test of settlement passes identically with and without the fix. Every money suite
 * in the repo (cert-f1, money-invariants, settlement-gate, ledger, trial-balance)
 * was green on BOTH sides of it. So the property has to be asserted on the code.
 *
 * ⚠️ IT ANCHORS ON THE PROPERTY, NOT THE WORDING (§0.1a). The rule is "every
 * persistence call inside settleMarket's scope passes a transaction argument" —
 * it does not care what the variable is named, what order the calls are in, or how
 * many there are. Renaming `lockTx`, adding a fourth refund branch or reordering
 * the loops all keep it green; dropping a `tx` on any one of them fails it.
 *
 * Run: npm run test:settle-atomicity     RED proof: npm run red:settle-atomicity
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
/** Strip comments: this file's own prose quotes the buggy forms on purpose. */
import { decomment } from "./lib/decomment.mts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const FILE = join(ROOT, "src/lib/server/market-service.ts");

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); fail++; }
}

const src = readFileSync(FILE, "utf8");

// ── Isolate a function's body ──────────────────────────────────────────────────
// From its declaration to the next top-level `export ` — brace-matching would be
// stricter, but the anchor here is a function boundary, and a moved/renamed
// neighbouring export cannot silently shrink the corpus without this failing loud.
function bodyOf(decl: string): string | null {
  const startIdx = src.indexOf(decl);
  if (startIdx < 0) return null;
  const after = src.slice(startIdx + 10);
  const nextExport = after.indexOf("\nexport ");
  return decomment(src.slice(startIdx, nextExport >= 0 ? startIdx + 10 + nextExport : src.length));
}

// ⛔ BOTH money paths, not just the one the defect was found in. `emergencyVoidMarket`
// moved money with NO transaction whatsoever while its own docstring called the
// operation atomic — it credited the wallet, then marked the position VOID on a
// separate autocommitting statement, so a crash between them re-refunded on retry.
// A guard written for settleMarket alone would have watched the fixed path and
// ignored the worse one.
const SCOPES = [
  { name: "settleMarket", decl: "export async function settleMarket(", minChars: 8000, marker: /myPositions/ },
  { name: "emergencyVoidMarket", decl: "export async function emergencyVoidMarket(", minChars: 2000, marker: /refundedTzs/ },
];

log("\n── 1 · the corpora are real ────────────────────────────────────");
// ⛔ A guard that silently reads nothing prints PASS forever. Session 38 shipped
// three of those. Assert each body is big enough to contain the code we are judging.
const bodies: Record<string, string> = {};
for (const s of SCOPES) {
  const b = bodyOf(s.decl);
  check(`${s.name} exists`, b !== null);
  if (!b) continue;
  bodies[s.name] = b;
  check(`${s.name} body is substantial`, b.length > s.minChars, `${b.length} chars`);
  check(`${s.name} contains its money loop`, s.marker.test(b));
}
if (Object.keys(bodies).length !== SCOPES.length) {
  log("\n  SETTLEMENT ATOMICITY: a scope could not be located");
  process.exit(1);
}
const body = Object.values(bodies).join("\n");

log("\n── 2 · every persistence call in the scope carries a transaction ──");

// The calls that MOVE or FINALISE money/state. Each must be given a tx argument.
// `db.wallet.adjust(id, delta, undefined, tx)` — 4th arg. The rest — 2nd arg.
const RULES: Array<{ label: string; re: RegExp; okIfHasArg: (call: string) => boolean }> = [
  {
    label: "positionStore.set(...) passes a tx",
    re: /positionStore\.set\(([^;]*?)\)/g,
    okIfHasArg: (c) => /,\s*[A-Za-z_$][\w$]*\s*(\?\?\s*undefined\s*)?\)?\s*$/.test(c.trim()),
  },
  {
    label: "marketStore.set(...) passes a tx",
    re: /marketStore\.set\(([^;]*?)\)/g,
    okIfHasArg: (c) => /,\s*[A-Za-z_$][\w$]*/.test(c),
  },
  {
    label: "db.wallet.adjust(...) passes a tx",
    re: /db\.wallet\.adjust\(([^;]*?)\)/g,
    okIfHasArg: (c) => /,\s*[A-Za-z_$][\w$]*\s*\)?\s*$/.test(c.trim()),
  },
];

for (const r of RULES) {
  const calls = Array.from(body.matchAll(r.re)).map((m) => m[1]);
  check(`${r.label} — found ${calls.length} call(s)`, calls.length > 0, "corpus empty: the matcher no longer matches the code");
  const bad = calls.filter((c) => !r.okIfHasArg(c));
  check(
    r.label,
    bad.length === 0,
    bad.length ? `${bad.length} call(s) with no tx: ${bad.map((b) => b.replace(/\s+/g, " ").slice(0, 70)).join(" | ")}` : "",
  );
}

log("\n── 3 · the lock's transaction is actually taken ────────────────");
// withLock's callback receives the tx. If the callback declares no parameter there
// is nothing to thread, and every rule above would be satisfied by `undefined`.
check(
  "the withLock callback binds its transaction (settleMarket)",
  /withLock\(\s*`market:\$\{marketId\}`\s*,\s*async\s*\(\s*[A-Za-z_$][\w$]*/.test(bodies.settleMarket),
  "settleMarket's withLock callback takes no tx parameter",
);
check(
  "the withLock callback binds its transaction (emergencyVoidMarket)",
  /withLock\(\s*`market:\$\{opts\.marketId\}`\s*,\s*async\s*\(\s*[A-Za-z_$][\w$]*/.test(bodies.emergencyVoidMarket),
  "emergencyVoidMarket's withLock callback takes no tx parameter",
);

log("\n── 3b · the emergency refund is wrapped in a money transaction ──");
// The credit-then-mark ordering is only safe because both are in one transaction.
check(
  "emergencyVoidMarket refunds inside withMoneyTx",
  /withMoneyTx\(/.test(bodies.emergencyVoidMarket),
  "the emergency refund loop moves money with no transaction — a crash mid-loop double-refunds on retry",
);
// The ledger group must be awaited WITH the tx. Fire-and-forget inside a money
// transaction is the C3 finding: the credit commits without its double entry.
check(
  "the emergency ledger write is not fire-and-forget",
  !/postLedgerEntries\([^;]*\)\s*\.catch\(/.test(bodies.emergencyVoidMarket),
  "postLedgerEntries(...).catch() lets a refund commit without its ledger group",
);

log("\n── 4 · a missing wallet REFUSES, it does not skip ──────────────");
// `if (!w) continue;` stepped over a position, left it OPEN, and let settledAt be
// stamped anyway — stranding the stake with nothing able to see it.
check(
  "no silent `continue` on a missing wallet",
  !/if\s*\(\s*!w\s*\)\s*continue\s*;/.test(body),
  "a missing wallet still skips a position instead of refusing the settlement",
);
check(
  "a missing wallet throws",
  /if\s*\(\s*!w\s*\)\s*throw\b/.test(body),
  "expected a throw so the settlement rolls back rather than stranding the position",
);

log("\n────────────────────────────────────────────────────────────────");
log(`  SETTLEMENT ATOMICITY: ${fail === 0 ? "all checks passed" : `${fail} FAILED`}`);
log("────────────────────────────────────────────────────────────────");
process.exit(fail === 0 ? 0 : 1);
