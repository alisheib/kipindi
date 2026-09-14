/**
 * `npm run test:refused-funds-race` — THE THREE MONEY DEFECTS IN S1's FIRST DRAFT, EACH HELD SHUT.
 *
 *   Run: npx tsx scripts/refused-funds-race.test.mts      RED: npm run red:refused-funds-race
 *
 * S1 (2026-09-13, docs/COMPLIANCE-DECISIONS.md): an officer decides what happens to the balance of a
 * player whose identity was FINALLY refused. The first draft of `decideRefusedFunds` was wrong three ways,
 * all found on re-read before anything reached production, and each has an assertion here:
 *
 *   §1 · TWO OFFICERS, ONE CASE. Without a lock (see §3), two decisions can read the same position. The
 *        forfeit guard was `balance ≥ amount`, so both forfeits passed: 25,000 held, RETURN_DEPOSITS
 *        forfeits 5,000 TWICE, and the player loses money that was owed back. `forfeitRefusedBalance` is
 *        now a COMPARE-AND-SWAP on the balance the decision was computed on.
 *   §2 · A PAYOUT THAT THROWS. The forfeit commits first; a throw from `withdraw()` after it used to
 *        escape before the decision's audit row was written — money forfeited, invisible to the report.
 *   §3 · THE LOCK THAT WOULD HAVE BEEN WORSE. `withLock` JOINS a nested lock onto the outer transaction
 *        (locks.ts), so wrapping the decision would have committed the forfeit and the payout hold only at
 *        return, with the gateway call inside one open transaction. That defect only exists on Postgres —
 *        the in-memory store has no transactions — so it is held by a SOURCE check, with controls.
 *
 * ⛔ No `verified-fixtures` import: these are REFUSED players, and refusal is the population measured.
 */
import { readFileSync } from "node:fs";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { forfeitRefusedBalance } from "../src/lib/server/wallet-service.ts";
import { decideRefusedFunds } from "../src/lib/server/refused-funds.ts";
import { getAuditForTarget } from "../src/lib/server/audit.ts";
import { REFUSED_FUNDS_ACTION } from "../src/lib/refused-funds-outcomes.ts";
// §3 reads source through the SHARED stripper — never a private one (2026-09-14).
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`ok   ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
const OFFICER = "usr_rfr_officer";
const OFFICER_2 = "usr_rfr_officer_2";
const bal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;

/** A player finally refused as UNDERAGE, holding `balance`, having paid in `deposits`. */
async function refusedPlayer(tag: string, balance: number, deposits: number[]): Promise<string> {
  const id = `usr_rfr_${tag}`;
  const local = `76${String(++seq).padStart(7, "0")}`;
  await db.user.create({
    id, phoneE164: `+255${local}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
  for (const [i, amount] of deposits.entries()) {
    await db.txn.create({
      id: `txn_rfr_${tag}_${i}`, walletId: `wal_${id}`, userId: id,
      type: "DEPOSIT", status: "CONFIRMED", amount, fee: 0, taxWithheld: 0, balanceAfter: amount,
      currency: "TZS", provider: "MPESA", providerRef: null, msisdn: local, description: "fixture deposit",
      positionId: null, amlReason: null, createdAt: now(), updatedAt: now(), completedAt: now(),
    } as never);
  }
  await db.kyc.upsert({
    id: `kyc_${id}`, userId: id, status: "REJECTED", rejectReason: "UNDERAGE", rejectNote: null,
    idType: "NIDA", idNumber: `199001017${String(seq).padStart(11, "0")}`, idExpiry: null,
    idVerifiedAt: now(), fullName: "Fixture Refused", dob: "2010-01-01", documents: [],
    reviewerId: OFFICER, reviewedAt: now(), submittedAt: now(), approvedAt: null,
    createdAt: now(), updatedAt: now(),
  } as never);
  return id;
}

// ═══ §1 · the forfeit is a compare-and-swap ═══════════════════════════════════════════════════
{
  const u = await refusedPlayer("cas", 25_000, [20_000]);
  const stale = await forfeitRefusedBalance({ userId: u, officerId: OFFICER, amountTzs: 5_000, decisionRef: "rfd_stale", note: "fixture · decided on a balance that has since moved", expectBalanceTzs: 24_999 });
  ok("1a a forfeit computed on a stale balance is refused", !stale.ok, JSON.stringify(stale));
  ok("1b …and moves no money", (await bal(u)) === 25_000, `balance ${await bal(u)}`);
  const debits = (await db.txn.listForUser(u)).filter((t) => t.type === "ADJUSTMENT_DEBIT");
  ok("1c …and writes no forfeit row", debits.length === 0, `${debits.length} row(s)`);
  const fresh = await forfeitRefusedBalance({ userId: u, officerId: OFFICER, amountTzs: 5_000, decisionRef: "rfd_fresh", note: "fixture · decided on the current balance", expectBalanceTzs: 25_000 });
  ok("1d CONTROL — the same forfeit on the current balance goes through", fresh.ok && (await bal(u)) === 20_000, JSON.stringify(fresh));
}
{
  // Two officers, the same case, the same moment. However the two interleave, the remainder is forfeited
  // at most once: the loser is refused by the compare-and-swap, or reads a position with nothing to forfeit.
  const u = await refusedPlayer("race", 25_000, [20_000]);
  const why = "Two officers deciding the same underage case at the same moment.";
  const results = await Promise.all([
    decideRefusedFunds({ officerId: OFFICER, userId: u, outcome: "RETURN_DEPOSITS", justification: why, provider: "MPESA" }),
    decideRefusedFunds({ officerId: OFFICER_2, userId: u, outcome: "RETURN_DEPOSITS", justification: why, provider: "MPESA" }),
  ]);
  const txns = await db.txn.listForUser(u);
  const forfeited = txns.filter((t) => t.type === "ADJUSTMENT_DEBIT").reduce((s, t) => s + Math.abs(t.amount), 0);
  ok("1e two simultaneous decisions forfeit the remainder at most once", forfeited <= 5_000, `TZS ${forfeited} forfeited · ${JSON.stringify(results.map((r) => (r.ok ? { forfeited: r.forfeitedTzs, payout: r.payoutTxnId, err: r.payoutError } : { refused: r.error })))}`);
  // Printed on success too: whether the two decisions actually overlapped is evidence, not decoration.
  // Overlapped ⇒ one is refused by the compare-and-swap; serial ⇒ the second finds a payout in flight.
  console.log(`     race · ${results.map((r) => (r.ok ? `decided (forfeit ${r.forfeitedTzs}, payout ${r.payoutTxnId ? "started" : "none"})` : `refused: ${r.error}`)).join(" · ")}`);
  const moved = results.filter((r) => r.ok && (r.forfeitedTzs > 0 || r.payoutTxnId)).length;
  ok("1f …and at most one of them moves money", moved <= 1, `${moved} decisions moved money`);
}

// ═══ §2 · a payout that throws still leaves its decision on record ═════════════════════════════
{
  const u = await refusedPlayer("throw", 25_000, [20_000]);
  const original = db.txn.findByIdempotencyKey;
  // `withdraw()` reads its idempotency key before anything else; a throw there is a throw from the payout.
  db.txn.findByIdempotencyKey = (async (key: string) => {
    if (key.startsWith("rfd:")) throw new Error("fixture payout boom");
    return original.call(db.txn, key);
  }) as typeof original;
  let threw: unknown = null;
  try {
    await decideRefusedFunds({ officerId: OFFICER, userId: u, outcome: "RETURN_DEPOSITS", justification: "Deposits returned to an underage player under the policy.", provider: "MPESA" });
  } catch (err) {
    threw = err;
  } finally {
    db.txn.findByIdempotencyKey = original;
  }
  const rows = getAuditForTarget("User", u).filter((e) => e.action === REFUSED_FUNDS_ACTION.RETURN_DEPOSITS);
  const p = (rows[0]?.payload ?? {}) as Record<string, unknown>;
  ok("2a a payout that throws does not throw out of the decision", threw === null, String(threw));
  ok("2b a payout that throws still writes the decision row", rows.length === 1, `${rows.length} row(s)`);
  ok("2c …recording the forfeit that DID commit", p.forfeitedTzs === 5_000 && typeof p.forfeitTxnId === "string", JSON.stringify(p));
  ok("2d …and the payout error, with nothing returned", /fixture payout boom/.test(String(p.payoutError)) && p.returnedTzs === 0, JSON.stringify(p));
  ok("2e CONTROL — the forfeit really committed, so that row is its only record", (await bal(u)) === 20_000, `balance ${await bal(u)}`);
}

// ═══ §3 · the decision takes no lock ═════════════════════════════════════════════════════════
//
// ⭐ 2026-09-14 (audit session 95). This check used to read the source through a PRIVATE comment stripper —
// the E-108 shape `scripts/lib/decomment.mts` exists to end — and knew ONE spelling of the defect: an import
// from "./locks" and a literal `withLock(` in the body. It passed an alias (`withLock as serial`), the
// "@/lib/server/locks" path, `withAdvisoryLock`, and `withMoneyTx` — the same outer transaction by another
// door (ledger.ts) — including a wrapper declared beside the function and called from inside it. So:
//   · the SHARED stripper;
//   · no import from "./locks" or "@/lib/server/locks" (static, dynamic or require);
//   · none of withLock / withMoneyTx / withAdvisoryLock — or any alias bound to one — in decideRefusedFunds'
//     body OR in any function of this file the body reaches (a wrapper is the body by another name).
// ⚠️ Functions IMPORTED from elsewhere are not followed: `withdraw()` takes its own wallet lock by design, and
// that lock is released before the gateway call. What this holds is that the DECISION opens no outer one.
{
  const src = readFileSync(new URL("../src/lib/server/refused-funds.ts", import.meta.url), "utf8");
  const LOCK_FNS = ["withLock", "withMoneyTx", "withAdvisoryLock"];
  const escRe = (n: string) => n.replace(/\$/g, "\\$");
  const LOCK_MODULE = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)["'`](?:\.\/locks|@\/lib\/server\/locks)(?:\.ts)?["'`]/;
  const importsLock = (s: string) => LOCK_MODULE.test(decomment(s));
  /** Top-level declarations of decommented source — each starts at column 0 in this codebase. */
  const declsOf = (d: string) => {
    const starts = [0];
    for (const m of d.matchAll(/\n(?=[A-Za-z_$@])/g)) starts.push((m.index ?? 0) + 1);
    return starts.map((s, i) => {
      const end = i + 1 < starts.length ? starts[i + 1] : d.length;
      const head = d.slice(s, Math.min(end, s + 300));
      const m = head.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([\w$]+)/) ?? head.match(/^(?:export\s+)?(?:const|let|var)\s+([\w$]+)/);
      return { name: m ? m[1] : null, start: s, end };
    });
  };
  /** The three lock functions, plus every name this file binds to one (`withLock as serial`, `const tx = withMoneyTx`). */
  const lockNames = (d: string) => {
    const names = new Set(LOCK_FNS);
    for (const m of d.matchAll(/\b(?:withLock|withMoneyTx|withAdvisoryLock)\s+as\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
    for (const m of d.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]*)?=\s*(?:withLock|withMoneyTx|withAdvisoryLock)\b(?!\s*\()/g)) names.add(m[1]);
    // A destructured rename — `const { withMoneyTx: inTx } = ledger`.
    for (const m of d.matchAll(/\b(?:withLock|withMoneyTx|withAdvisoryLock)\s*:\s*([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
    return names;
  };
  // A namespace member counts too (`ledger.withMoneyTx(`): withMoneyTx lives in ledger.ts, not locks.ts, so the import
  // check never sees `import * as ledger`.
  const mentionsLock = (text: string, names: Iterable<string>) =>
    [...names].some((n) => new RegExp(`(?<![\\w$])${escRe(n)}\\b`).test(decomment(text)));
  /** decideRefusedFunds' body, and the text of every same-file declaration it reaches. */
  const decisionReach = (s: string) => {
    const d = decomment(s);
    const decls = declsOf(d);
    const root = decls.find((x) => x.name === "decideRefusedFunds");
    if (!root) return { body: "", reach: "", reached: [] as string[] };
    const seen = new Set(["decideRefusedFunds"]);
    const queue = [root];
    let reach = "";
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const text = d.slice(cur.start, cur.end);
      reach += `${text}\n`;
      for (const m of text.matchAll(/\b([A-Za-z_$][\w$]*)\s*(?:<[^()]*>)?\s*\(/g)) {
        const next = decls.find((x) => x.name === m[1]);
        if (next?.name && !seen.has(next.name)) { seen.add(next.name); queue.push(next); }
      }
    }
    return { body: d.slice(root.start, root.end), reach, reached: [...seen] };
  };
  const decisionTakesLock = (s: string) => mentionsLock(decisionReach(s).reach, lockNames(decomment(s)));

  const { body, reached } = decisionReach(src);
  ok("3a the decision function is found — the checks below are measuring something", body.length > 1_000, `${body.length} chars · reaches ${reached.join(", ")}`);
  ok("3b refused-funds.ts imports no lock", !importsLock(src));
  ok("3c decideRefusedFunds takes no lock", body.length > 0 && !decisionTakesLock(src), "withLock / withMoneyTx / withAdvisoryLock (or an alias) in the decision or a function it reaches");
  ok("3d CONTROL — the import check sees a lock import", importsLock(`import { withLock } from "./locks";`));
  ok("3e CONTROL — the body check sees a wrapped body, and ignores one in a comment", mentionsLock("return withLock(`k`, async () => {});", LOCK_FNS) && !mentionsLock("// withLock(`k`)", LOCK_FNS));

  // ⭐ The shapes the old check passed — each must now be caught.
  const aliasFile = `import { withLock as serial } from "@/lib/server/locks";\nexport async function decideRefusedFunds(input: unknown) {\n  return serial("refused-funds:k", async () => input);\n}\nexport const after = 1;\n`;
  ok("3f CONTROL — an aliased import from \"@/lib/server/locks\" is seen as a lock import", importsLock(aliasFile));
  ok("3g CONTROL — …and the alias called in the body is seen as taking the lock", decisionTakesLock(aliasFile));
  ok("3h CONTROL — a dynamic import(\"./locks\") is seen", importsLock(`const { withLock } = await import("./locks");`));
  const wrapperFile = `import { withMoneyTx } from "./ledger";\nasync function atomically<T>(fn: () => Promise<T>): Promise<T> {\n  return withMoneyTx(async () => fn());\n}\nexport async function decideRefusedFunds(input: unknown) {\n  return atomically(async () => input);\n}\nexport const after = 1;\n`;
  ok("3i CONTROL — a withMoneyTx WRAPPER declared beside the decision and called from it is caught", decisionTakesLock(wrapperFile) && !importsLock(wrapperFile));
  ok("3j CONTROL — withMoneyTx straight in the body is caught", decisionTakesLock(`export async function decideRefusedFunds() {\n  return withMoneyTx(async (tx) => tx);\n}\n`));
  ok("3k CONTROL — withAdvisoryLock in the body is caught", decisionTakesLock(`export async function decideRefusedFunds() {\n  return withAdvisoryLock("k", async () => 1);\n}\n`));
  ok("3l CONTROL — withMoneyTx imported under another name is caught", decisionTakesLock(`import { withMoneyTx as inOneTx } from "./ledger";\nexport async function decideRefusedFunds() {\n  return inOneTx(async () => 1);\n}\n`));
  ok("3m CONTROL — a lock in a function the decision does NOT reach is not charged to it",
    !decisionTakesLock(`async function helper() { return 1; }\nexport async function decideRefusedFunds() {\n  return helper();\n}\nexport async function elsewhere() {\n  return withLock("k", async () => 1);\n}\n`));
  const hidden = `export async function decideRefusedFunds() {\n  const note = "/*";\n  return withLock("k", async () => note); // */\n}\n`;
  const retired = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok("3n CONTROL — a \"/*\" inside a string does not hide the lock from the shared stripper", decisionTakesLock(hidden));
  ok("3o CONTROL — …where the retired private stripper was blind to it", !/\bwithLock\s*\(/.test(retired(hidden)));
  ok("3p CONTROL — a namespace import of the ledger called as `ledger.withMoneyTx(` is caught",
    decisionTakesLock(`import * as ledger from "./ledger";\nexport async function decideRefusedFunds() {\n  return ledger.withMoneyTx(async () => 1);\n}\n`));
  ok("3q CONTROL — a destructured rename, `const { withMoneyTx: inTx } = ledger`, is caught",
    decisionTakesLock(`import * as ledger from "./ledger";\nconst { withMoneyTx: inTx } = ledger;\nexport async function decideRefusedFunds() {\n  return inTx(async () => 1);\n}\n`));
}

console.log(`\nrefused-funds-race: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
