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
{
  const src = readFileSync(new URL("../src/lib/server/refused-funds.ts", import.meta.url), "utf8");
  const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const importsLock = (s: string) => /from\s+["']\.\/locks["']/.test(stripComments(s));
  const takesLock = (s: string) => /\bwithLock\s*\(/.test(stripComments(s));
  const start = src.indexOf("export async function decideRefusedFunds");
  const end = src.indexOf("\nexport ", start + 10);
  const body = start < 0 ? "" : src.slice(start, end < 0 ? undefined : end);
  ok("3a the decision function is found — the checks below are measuring something", body.length > 1_000, `${body.length} chars`);
  ok("3b refused-funds.ts imports no lock", !importsLock(src));
  ok("3c decideRefusedFunds takes no lock", body.length > 0 && !takesLock(body));
  ok("3d CONTROL — the import check sees a lock import", importsLock(`import { withLock } from "./locks";`));
  ok("3e CONTROL — the body check sees a wrapped body, and ignores one in a comment", takesLock("return withLock(`k`, async () => {});") && !takesLock("// withLock(`k`)"));
}

console.log(`\nrefused-funds-race: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
