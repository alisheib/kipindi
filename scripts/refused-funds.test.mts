/**
 * S1 — THE BALANCE OF A PLAYER WE FINALLY REFUSED, driven through the real services.   `npm run test:refused-funds`
 *
 *   Run: npx tsx scripts/refused-funds.test.mts      RED: npm run red:refused-funds
 *
 * ⭐ THE RULING (Ali, 2026-09-13, docs/COMPLIANCE-DECISIONS.md). A player deposits and plays before anyone checks
 * who they are, so a FINAL identity refusal (UNDERAGE / SANCTIONED / DUPLICATE_IDENTITY) can land on an account
 * holding real money. The refusal freezes the wallet FIRST; then an officer decides the balance, case by case, from
 * a closed set of four outcomes, with a written justification, and each outcome writes its own audit action.
 *
 * SECTIONS
 *   §A  freeze-first: a final refusal whose freeze fails writes no refusal; a recoverable refusal freezes nothing
 *   §B  the decision's preconditions: not final · money in flight · justification floor · officer is the player ·
 *       payout rail closed (returns only) · below the rail minimum
 *   §C  the money: FORFEIT is one confirmed debit + its ledger group · RETURN_BALANCE is a fee-0 payout to the
 *       registered number · RETURN_DEPOSITS returns min(balance, deposits − paid out) and forfeits the rest ·
 *       each outcome's own audit action · the player is told only when the payout started
 *   §D  the report an inspector is handed
 *   §E  `withdraw()`'s refused-funds option can only ever pay a FINALLY refused account; a normal withdrawal from a
 *       frozen wallet stays refused even for an account that was approved once
 *   §F  re-opening a final refusal lifts only the identity hold and releases the document number
 *
 * ⛔ NOT HERE, BECAUSE IT IS HELD ELSEWHERE: the compare-and-swap race, a payout that throws, and the no-lock rule
 * live in `scripts/refused-funds-race.test.mts`. The Prisma mapping of `freezeReasons` lives in `test:dal-parity` §5.
 * ⛔ NO `verified-fixtures` IMPORT: refusal is the population measured. Every fixture's identity row is written by
 * hand, in view.
 * ⚠️ THE MEMORY STORE HAS NO LEDGER TABLE (`postLedgerEntries` returns without writing when there is no database),
 * so §C.3 holds the forfeit's ledger post by SOURCE, with controls, and the group's balance by the pure builder.
 */
process.env.EMAIL_OUTBOX_CAPTURE = "1";

import { readFileSync } from "node:fs";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { withdraw } from "../src/lib/server/wallet-service.ts";
import { decideRefusedFunds, refusedFundsPosition, refusedFundsReport } from "../src/lib/server/refused-funds.ts";
import { reviewKyc, reopenFinalRefusal, REOPEN_FINAL_REFUSAL_REASON_MIN } from "../src/lib/server/kyc-service.ts";
import { addWalletFreeze } from "../src/lib/server/wallet-freeze.ts";
import { assertIdentityForPayout } from "../src/lib/server/kyc-gate.ts";
import { setPayoutStatus } from "../src/lib/server/payout-status.ts";
import { setKillSwitch } from "../src/lib/server/payment-ops.ts";
import { getPaymentProvider } from "../src/lib/server/payment-control.ts";
import { getAuditForTarget, auditFlush } from "../src/lib/server/audit.ts";
import { emailOutbox } from "../src/lib/server/email.ts";
import { adjustmentEntries } from "../src/lib/server/ledger.ts";
import { currentFreezeReasons } from "../src/lib/wallet-freeze-reasons.ts";
import { REFUSED_FUNDS_ACTION, REFUSED_FUNDS_JUSTIFICATION_MIN } from "../src/lib/refused-funds-outcomes.ts";
import { PROVIDER_MIN_PAYOUT_TZS } from "../src/lib/payout.ts";
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n${s}`);
const now = () => new Date().toISOString();
const settle = async () => { await new Promise((r) => setTimeout(r, 250)); await auditFlush(); };
const J = (x: unknown) => JSON.stringify(x);

const OFFICER = "usr_rf_officer";
const WHY = "Underage player refused at review; decided under the 2026-09-13 policy.";
let seq = 0;
const localOf = new Map<string, string>();
const idNumberOf = new Map<string, string>();

type KycFixture = { status: "APPROVED" | "PENDING_REVIEW" | "REJECTED"; rejectReason?: string | null; approvedAt?: string | null } | null;

/** An account with a wallet, confirmed deposits, optional paid-out withdrawals and a hand-written identity row. */
async function player(id: string, o: {
  balance: number; hold?: number; deposits?: number[]; paidOut?: number[]; kyc: KycFixture; wallet?: Partial<StoredWallet>;
}): Promise<string> {
  const local = `73${String(++seq).padStart(7, "0")}`;
  localOf.set(id, local);
  await db.user.create({
    id, phoneE164: `+255${local}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: `Handle ${seq}`, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: `${id}@t.tz`, emailVerifiedAt: now(), createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: o.balance, pending: 0, hold: o.hold ?? 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(), ...(o.wallet ?? {}),
  } as StoredWallet);
  for (const [i, amount] of (o.deposits ?? []).entries()) {
    await db.txn.create({
      id: `txn_rf_${id}_d${i}`, walletId: `wal_${id}`, userId: id, type: "DEPOSIT", status: "CONFIRMED", amount, fee: 0,
      taxWithheld: 0, balanceAfter: amount, currency: "TZS", provider: "MPESA", providerRef: `dep_${id}_${i}`, msisdn: local,
      description: "fixture deposit", positionId: null, amlReason: null, createdAt: now(), updatedAt: now(), completedAt: now(),
    } as never);
  }
  for (const [i, amount] of (o.paidOut ?? []).entries()) {
    await db.txn.create({
      id: `txn_rf_${id}_w${i}`, walletId: `wal_${id}`, userId: id, type: "WITHDRAWAL", status: "CONFIRMED", amount: -amount, fee: 0,
      taxWithheld: 0, balanceAfter: 0, currency: "TZS", provider: "MPESA", providerRef: `wd_${id}_${i}`, msisdn: local,
      description: "fixture payout", positionId: null, amlReason: null, createdAt: now(), updatedAt: now(), completedAt: now(),
    } as never);
  }
  if (o.kyc) {
    const idNumber = `199001015${String(seq).padStart(11, "0")}`;
    idNumberOf.set(id, idNumber);
    await db.kyc.upsert({
      id: `kyc_${id}`, userId: id, status: o.kyc.status, rejectReason: o.kyc.rejectReason ?? null, rejectNote: null,
      idType: "NIDA", idNumber, idExpiry: null, idVerifiedAt: now(), fullName: "Refused Fixture", dob: "1990-01-01",
      documents: [], reviewerId: OFFICER, reviewedAt: now(), submittedAt: now(),
      approvedAt: o.kyc.approvedAt !== undefined ? o.kyc.approvedAt : o.kyc.status === "APPROVED" ? now() : null,
      createdAt: now(), updatedAt: now(),
    } as never);
  }
  return id;
}
/** A finally refused account as `reviewKyc` leaves it: REJECTED on a final code, wallet held for IDENTITY_REFUSED. */
const refused = (id: string, balance: number, deposits: number[], extra: { paidOut?: number[]; approvedAt?: string | null } = {}) =>
  player(id, {
    balance, deposits, paidOut: extra.paidOut,
    kyc: { status: "REJECTED", rejectReason: "UNDERAGE", approvedAt: extra.approvedAt },
    wallet: { status: "FROZEN", freezeReasons: ["IDENTITY_REFUSED"] },
  });

const walletOf = async (id: string) => (await db.wallet.findByUserId(id))!;
const txnsOf = async (id: string) => db.txn.listForUser(id);
const auditOf = (id: string, action: string) => getAuditForTarget("User", id, 10_000).filter((e) => e.action === action);
const decisionRows = (id: string) => getAuditForTarget("User", id, 10_000).filter((e) => Object.values(REFUSED_FUNDS_ACTION).includes(e.action));
const refusedNotices = async (id: string) =>
  (await db.notification.findByUser(id, 500)).filter((n) => /Your balance is held|Decision on your balance|We're returning your money/.test(n.titleEn));
const refusedMails = (id: string) => emailOutbox().filter((m) => m.to === `${id}@t.tz` && /Decision on your balance|Your balance is held/.test(m.subject));

await db.user.create({
  id: OFFICER, phoneE164: "+255730000999", passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "COMPLIANCE", status: "ACTIVE", locale: "EN", displayName: "Officer", dob: null, region: null,
  acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
} as never);

// ── §A · the freeze comes FIRST ────────────────────────────────────────────────────────────────────
section("§A · a final refusal freezes before it is written; a recoverable one freezes nothing");
{
  const u = await player("usr_rf_order", { balance: 10_000, deposits: [10_000], kyc: { status: "PENDING_REVIEW" } });
  const realUpdate = db.wallet.update;
  (db.wallet as { update: unknown }).update = (id: string, patch: Partial<StoredWallet>) =>
    id === `wal_${u}` ? null : realUpdate.call(db.wallet, id, patch);
  let r: Awaited<ReturnType<typeof reviewKyc>>;
  try {
    const probe = await addWalletFreeze(u, "OFFICER", { actorId: OFFICER, note: "probe" });
    ok("A.0 control - the simulated failure really makes a freeze fail", !probe.ok, J(probe));
    r = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "UNDERAGE" });
  } finally {
    (db.wallet as { update: unknown }).update = realUpdate;
  }
  await settle();
  ok("A.1 a final refusal whose freeze fails is refused to the officer", !r.ok, J(r));
  ok("A.2 a final refusal whose freeze fails writes NO refusal", (await db.kyc.findByUserId(u))?.status === "PENDING_REVIEW",
    String((await db.kyc.findByUserId(u))?.status));
  ok("A.3 ...and records no kyc.refused_final fact", auditOf(u, "kyc.refused_final").length === 0);

  const retry = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "UNDERAGE" });
  await settle();
  const w = await walletOf(u);
  ok("A.4 control - the retry with a working freeze refuses AND freezes",
    retry.ok && (await db.kyc.findByUserId(u))?.status === "REJECTED" && w.status === "FROZEN"
      && J(currentFreezeReasons(w)) === J(["IDENTITY_REFUSED"]), `${J(retry)} · ${w.status} ${J(w.freezeReasons)}`);
  const fact = auditOf(u, "kyc.refused_final")[0];
  ok("A.5 ...and writes the COMPLIANCE fact carrying what was at stake", fact?.category === "COMPLIANCE" && fact?.payload?.balance === 10_000, J(fact?.payload ?? null));

  const rec = await player("usr_rf_recoverable_review", { balance: 10_000, deposits: [10_000], kyc: { status: "PENDING_REVIEW" } });
  const rr = await reviewKyc({ officerId: OFFICER, userId: rec, decision: "REJECT", rejectCode: "BLURRY_DOC" });
  await settle();
  const rw = await walletOf(rec);
  ok("A.6 a recoverable refusal is written ...", rr.ok && (await db.kyc.findByUserId(rec))?.status === "REJECTED", J(rr));
  ok("A.7 ...and freezes nothing, records no final fact", rw.status === "ACTIVE" && currentFreezeReasons(rw).length === 0
    && auditOf(rec, "wallet.freeze_added").length === 0 && auditOf(rec, "kyc.refused_final").length === 0, `${rw.status} ${J(rw.freezeReasons)}`);
}

// ── §B · the preconditions ─────────────────────────────────────────────────────────────────────────
section("§B · a decision is refused before any money moves when a precondition fails");
{
  const rec = await player("usr_rf_notfinal", { balance: 20_000, deposits: [20_000], kyc: { status: "REJECTED", rejectReason: "BLURRY_DOC" } });
  const b1 = await decideRefusedFunds({ officerId: OFFICER, userId: rec, outcome: "FORFEIT", justification: WHY });
  ok("B.1 a recoverable refusal has no balance decision", !b1.ok && (await walletOf(rec)).balance === 20_000 && decisionRows(rec).length === 0, J(b1));

  const inFlight = await refused("usr_rf_inflight", 20_000, [20_000]);
  await db.wallet.update(`wal_${inFlight}`, { hold: 2_000 });
  const b2 = await decideRefusedFunds({ officerId: OFFICER, userId: inFlight, outcome: "FORFEIT", justification: WHY });
  ok("B.2 money in flight (a hold) refuses the decision", !b2.ok && /in flight/.test(b2.error) && (await walletOf(inFlight)).balance === 20_000, J(b2));

  const held = await refused("usr_rf_held", 20_000, [20_000]);
  const short = "x".repeat(REFUSED_FUNDS_JUSTIFICATION_MIN - 1);
  const b3 = await decideRefusedFunds({ officerId: OFFICER, userId: held, outcome: "HOLD_PENDING_APPEAL", justification: `   ${short}   ` });
  ok(`B.3 a justification under ${REFUSED_FUNDS_JUSTIFICATION_MIN} characters is refused`, !b3.ok && decisionRows(held).length === 0, J(b3));
  const b4 = await decideRefusedFunds({ officerId: OFFICER, userId: held, outcome: "HOLD_PENDING_APPEAL", justification: "y".repeat(REFUSED_FUNDS_JUSTIFICATION_MIN) });
  await settle();
  ok(`B.4 control - exactly ${REFUSED_FUNDS_JUSTIFICATION_MIN} characters is accepted, and HOLD moves nothing`,
    b4.ok && (await walletOf(held)).balance === 20_000 && (await walletOf(held)).status === "FROZEN" && decisionRows(held).length === 1, J(b4));

  const self = await decideRefusedFunds({ officerId: held, userId: held, outcome: "HOLD_PENDING_APPEAL", justification: WHY });
  await settle();
  ok("B.5 an officer cannot decide their own balance, and the attempt is a SECURITY fact",
    !self.ok && auditOf(held, "kyc.refused_funds.self_blocked").some((e) => e.category === "SECURITY"), J(self));

  const railed = await refused("usr_rf_rail", 30_000, [30_000]);
  setPayoutStatus({ declared: "unavailable", note: "fixture" }, OFFICER);
  try {
    const pos = await refusedFundsPosition(railed);
    ok("B.6 rail not accepting - both returns are unavailable, with the rail as the reason",
      !pos.outcomes.RETURN_BALANCE.allowed && !pos.outcomes.RETURN_DEPOSITS.allowed && /payout rail/.test(pos.outcomes.RETURN_BALANCE.why ?? ""), J(pos.outcomes));
    ok("B.7 ...while HOLD and FORFEIT stay available (they send nothing)", pos.outcomes.HOLD_PENDING_APPEAL.allowed && pos.outcomes.FORFEIT.allowed);
    const b8 = await decideRefusedFunds({ officerId: OFFICER, userId: railed, outcome: "RETURN_BALANCE", justification: WHY, provider: "MPESA" });
    ok("B.8 ...and a return decided anyway is refused, nothing moved", !b8.ok && (await walletOf(railed)).balance === 30_000, J(b8));
  } finally {
    setPayoutStatus({ declared: "operational", note: null }, OFFICER);
  }
  ok("B.9 control - with the rail open the same return is available", (await refusedFundsPosition(railed)).outcomes.RETURN_BALANCE.allowed);

  const tiny = await refused("usr_rf_tiny", PROVIDER_MIN_PAYOUT_TZS - 200, [PROVIDER_MIN_PAYOUT_TZS - 200]);
  const tp = await refusedFundsPosition(tiny);
  ok(`B.10 below the rail minimum (TZS ${PROVIDER_MIN_PAYOUT_TZS}) a return is unavailable, with that reason`,
    !tp.outcomes.RETURN_BALANCE.allowed && /smallest amount/.test(tp.outcomes.RETURN_BALANCE.why ?? "") && !tp.outcomes.RETURN_DEPOSITS.allowed, J(tp.outcomes));
  const b11 = await decideRefusedFunds({ officerId: OFFICER, userId: tiny, outcome: "RETURN_BALANCE", justification: WHY, provider: "MPESA" });
  ok("B.11 ...a return decided anyway is refused with the same reason, and FORFEIT is still offered",
    !b11.ok && /smallest amount/.test(b11.error) && tp.outcomes.FORFEIT.allowed, J(b11));
  const b12 = await decideRefusedFunds({ officerId: OFFICER, userId: railed, outcome: "RETURN_BALANCE", justification: WHY, provider: null });
  ok("B.12 a return with no network chosen is refused", !b12.ok && (await walletOf(railed)).balance === 30_000, J(b12));
}

// ── §C · the money ────────────────────────────────────────────────────────────────────────────────
section("§C · FORFEIT, RETURN_BALANCE and RETURN_DEPOSITS move exactly what they say");
const decided: Record<string, { user: string; decisionId: string }> = {};
{
  // C.1 FORFEIT
  const f = await refused("usr_rf_forfeit", 25_000, [20_000]);
  const r = await decideRefusedFunds({ officerId: OFFICER, userId: f, outcome: "FORFEIT", justification: WHY });
  await settle();
  const debits = (await txnsOf(f)).filter((t) => t.type === "ADJUSTMENT_DEBIT");
  ok("C.1 FORFEIT debits exactly the balance, as ONE confirmed ADJUSTMENT_DEBIT",
    r.ok && r.forfeitedTzs === 25_000 && r.returnedTzs === 0 && (await walletOf(f)).balance === 0
      && debits.length === 1 && debits[0].status === "CONFIRMED" && debits[0].amount === -25_000, `${J(r)} · ${J(debits.map((t) => [t.status, t.amount]))}`);
  ok("C.2 ...sends nothing, and the wallet stays frozen",
    !(await txnsOf(f)).some((t) => t.type === "WITHDRAWAL") && (await walletOf(f)).status === "FROZEN");
  if (r.ok) decided.FORFEIT = { user: f, decisionId: r.decisionId };

  // C.3 the ledger group — by source (the memory store has no ledger) and by the pure builder
  const WS = decomment(readFileSync(new URL("../src/lib/server/wallet-service.ts", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
  const at = WS.indexOf("export async function forfeitRefusedBalance");
  const body = at < 0 ? "" : WS.slice(at, WS.indexOf("\nexport ", at + 10));
  const POST = new RegExp("postLedgerEntries\\(\\s*`forfeit_\\$\\{txnId\\}`\\s*,\\s*adjustmentEntries\\([\\s\\S]*?\\),\\s*tx\\s*\\)");
  const postsInTx = (b: string) => {
    const tx = b.indexOf("withMoneyTx(");
    const post = b.search(POST);
    const after = b.indexOf("if (!committed)");
    return tx >= 0 && post > tx && (after < 0 || post < after);
  };
  ok("C.3a forfeitRefusedBalance is found - the check below reads something", body.length > 800, `${body.length} chars`);
  ok("C.3 the forfeit posts its balanced ledger group inside the money transaction", postsInTx(body));
  ok("C.3b control - a body that posts no ledger group is caught",
    !postsInTx(body.replace(/postLedgerEntries\(/, "Promise.resolve(")) && body.length > 800);
  const group = adjustmentEntries({ txnId: "t", userId: f, amount: -25_000, description: "fixture" });
  ok("C.3c the group the forfeit posts balances to zero and debits the player's own account by the amount",
    group.reduce((s, e) => s + e.amount, 0) === 0 && group.some((e) => e.account.includes(f) && e.amount === -25_000), J(group));

  // C.4 RETURN_BALANCE
  ok("C.4a fixture - payouts go through the mock provider in this run", (await getPaymentProvider()) === "mock", String(await getPaymentProvider()));
  const b = await refused("usr_rf_balance", 30_000, [30_000]);
  const rb = await decideRefusedFunds({ officerId: OFFICER, userId: b, outcome: "RETURN_BALANCE", justification: WHY, provider: "MPESA" });
  await settle();
  const payout = rb.ok && rb.payoutTxnId ? await db.txn.findById(rb.payoutTxnId) : null;
  ok("C.4 RETURN_BALANCE starts a payout of the whole balance", rb.ok && rb.returnedTzs === 30_000 && rb.forfeitedTzs === 0 && !rb.payoutError
    && payout?.type === "WITHDRAWAL" && payout.amount === -30_000 && (await walletOf(b)).balance === 0, `${J(rb)} · ${J(payout)}`);
  ok("C.5 the return pays out with fee 0", payout?.fee === 0, `fee ${String(payout?.fee)}`);
  // ⚠️ The service is handed the 9 local digits and the payout row stores the number as E.164, so the row is
  // compared with the account's own `phoneE164` — the registered number, exactly as written on the account.
  const registered = (await db.user.findById(b))?.phoneE164;
  ok("C.6 ...to the REGISTERED number, on the chosen network, and the mock answered",
    !!registered && payout?.msisdn === registered && payout?.provider === "MPESA" && !!payout?.providerRef && ["CONFIRMED", "PROCESSING"].includes(payout?.status ?? ""),
    `${String(payout?.msisdn)} vs ${String(registered)} · ${String(payout?.provider)} · ${String(payout?.providerRef)} · ${String(payout?.status)}`);
  if (rb.ok) decided.RETURN_BALANCE = { user: b, decisionId: rb.decisionId };

  // C.7 RETURN_DEPOSITS, with money already paid out
  const d = await refused("usr_rf_deposits", 25_000, [30_000], { paidOut: [15_000] });
  const pos = await refusedFundsPosition(d);
  ok("C.7a fixture - returnable = min(balance 25,000, deposits 30,000 - paid out 15,000) = 15,000", pos.returnableDeposits === 15_000, J(pos));
  const rd = await decideRefusedFunds({ officerId: OFFICER, userId: d, outcome: "RETURN_DEPOSITS", justification: WHY, provider: "MPESA" });
  await settle();
  const dRow = decisionRows(d)[0]?.payload ?? {};
  ok("C.7 RETURN_DEPOSITS returns min(balance, deposits - paid out) and forfeits the remainder",
    rd.ok && rd.returnedTzs === 15_000 && rd.forfeitedTzs === 10_000 && (await walletOf(d)).balance === 0, J(rd));
  ok("C.8 returned + forfeited === the balance before, in the result AND in the record",
    rd.ok && rd.returnedTzs + rd.forfeitedTzs === 25_000 && (dRow.returnedTzs as number) + (dRow.forfeitedTzs as number) === dRow.balanceBefore, J(dRow));
  if (rd.ok) decided.RETURN_DEPOSITS = { user: d, decisionId: rd.decisionId };
  const d2 = await refused("usr_rf_deposits_simple", 25_000, [20_000]);
  const rd2 = await decideRefusedFunds({ officerId: OFFICER, userId: d2, outcome: "RETURN_DEPOSITS", justification: WHY, provider: "MPESA" });
  ok("C.9 with nothing paid out, the deposits (20,000) go back and the winnings (5,000) are forfeited",
    rd2.ok && rd2.returnedTzs === 20_000 && rd2.forfeitedTzs === 5_000, J(rd2));

  // C.10 each outcome under its OWN action, carrying the justification
  const heldUser = "usr_rf_held";
  const heldId = String(decisionRows(heldUser)[0]?.payload?.decisionId ?? "");
  if (heldId) decided.HOLD_PENDING_APPEAL = { user: heldUser, decisionId: heldId };
  ok("C.10a control - the four outcome actions are four different strings", new Set(Object.values(REFUSED_FUNDS_ACTION)).size === 4);
  for (const [outcome, x] of Object.entries(decided)) {
    const rows = decisionRows(x.user);
    const own = rows.filter((e) => e.action === REFUSED_FUNDS_ACTION[outcome as keyof typeof REFUSED_FUNDS_ACTION]);
    ok(`C.10 ${outcome} is recorded once, under its own action, as COMPLIANCE, with the justification`,
      rows.length === 1 && own.length === 1 && own[0].category === "COMPLIANCE" && typeof own[0].payload?.justification === "string"
        && (own[0].payload!.justification as string).length >= REFUSED_FUNDS_JUSTIFICATION_MIN && own[0].payload?.decisionId === x.decisionId,
      J(rows.map((e) => [e.action, e.payload?.decisionId])));
  }
  ok("C.10b control - all four outcomes were decided above", Object.keys(decided).length === 4, Object.keys(decided).join(","));

  // C.11 the player is told only when the decision was carried out
  ok("C.11 a return that started tells the player (bell AND email)",
    (await refusedNotices(b)).length === 1 && refusedMails(b).length === 1, `bell ${(await refusedNotices(b)).length} · mail ${refusedMails(b).length}`);
  const stuck = await refused("usr_rf_notstarted", 30_000, [30_000]);
  // C.12a ⛔ A PAUSED NETWORK IS REFUSED BEFORE ANYTHING MOVES (review, 2026-09-13). The kill-switch used to be
  // this suite's fixture for "a payout that could not start" — and the decision forfeited first, then failed on
  // it. `decideRefusedFunds` now refuses a paused network up front, so that fixture became its own rule.
  await setKillSwitch("MPESA", "withdrawals", true, OFFICER);
  let rp: Awaited<ReturnType<typeof decideRefusedFunds>>;
  try {
    rp = await decideRefusedFunds({ officerId: OFFICER, userId: stuck, outcome: "RETURN_BALANCE", justification: WHY, provider: "MPESA" });
  } finally {
    await setKillSwitch("MPESA", "withdrawals", false, OFFICER);
  }
  await settle();
  ok("C.12a a return on a PAUSED network is refused before anything moves — nothing recorded, nothing forfeited",
    !rp.ok && /paused/i.test(String((rp as { error?: string }).error)) && decisionRows(stuck).length === 0
      && (await walletOf(stuck)).balance === 30_000, J(rp));
  // C.12b a payout that fails AFTER every precheck — here the payout itself throws — is still RECORDED, with the error.
  const originalIdem = db.txn.findByIdempotencyKey;
  db.txn.findByIdempotencyKey = (async (key: string) => {
    if (key.startsWith("rfd:")) throw new Error("fixture payout could not start");
    return originalIdem.call(db.txn, key);
  }) as typeof originalIdem;
  let rs: Awaited<ReturnType<typeof decideRefusedFunds>>;
  try {
    rs = await decideRefusedFunds({ officerId: OFFICER, userId: stuck, outcome: "RETURN_BALANCE", justification: WHY, provider: "MPESA" });
  } finally {
    db.txn.findByIdempotencyKey = originalIdem;
  }
  await settle();
  ok("C.12 fixture - a return whose payout could not start is still RECORDED, with the error and nothing returned",
    rs.ok && !!rs.payoutError && rs.returnedTzs === 0 && decisionRows(stuck).length === 1 && !!decisionRows(stuck)[0].payload?.payoutError
      && (await walletOf(stuck)).balance === 30_000, J(rs));
  ok("C.13 ...and the player is told NOTHING (no bell, no email)",
    (await refusedNotices(stuck)).length === 0 && refusedMails(stuck).length === 0, `bell ${(await refusedNotices(stuck)).length} · mail ${refusedMails(stuck).length}`);
}

// ── §D · the report ───────────────────────────────────────────────────────────────────────────────
section("§D · the report lists every decision and every finally refused account");
{
  const open = await refused("usr_rf_open_undecided", 12_000, [12_000]);
  const rep = await refusedFundsReport();
  const ids = new Set(rep.decisions.map((d) => d.decisionId));
  ok("D.1 every decision taken above is in the report, with its outcome",
    Object.entries(decided).every(([o, x]) => rep.decisions.some((d) => d.decisionId === x.decisionId && d.outcome === o)), `${ids.size} decision(s)`);
  ok("D.2 the read is complete and did not fail", !rep.decisionsTruncated && !rep.accountsFailed);
  const acct = (u: string) => rep.accounts.find((a) => a.userId === u);
  ok("D.3 an undecided refused account holding money is OPEN", acct(open)?.open === true && acct(open)?.balance === 12_000, J(acct(open)));
  ok("D.4 a HOLD_PENDING_APPEAL decision leaves the case OPEN", acct("usr_rf_held")?.open === true, J(acct("usr_rf_held")));
  ok("D.5 a forfeited account (nothing held, decided) is CLOSED", acct("usr_rf_forfeit")?.open === false, J(acct("usr_rf_forfeit")));
  ok("D.6 control - a RECOVERABLE refusal is not in the refused-accounts list", !acct("usr_rf_notfinal") && rep.accounts.length >= 5, `${rep.accounts.length} account(s)`);
}

// ── §E · withdraw()'s refused-funds option ─────────────────────────────────────────────────────────
section("§E · the refused-funds option pays only a FINALLY refused account; a frozen wallet stays shut otherwise");
{
  const opt = { refusedFundsReturn: { decisionId: "rfd_fixture" } };
  const appr = await player("usr_rf_opt_approved", { balance: 30_000, deposits: [30_000], kyc: { status: "APPROVED" } });
  const e1 = await withdraw(appr, { provider: "MPESA", amount: 20_000, msisdn: localOf.get(appr)! } as never, "rfd:e1", OFFICER, opt);
  await settle();
  ok("E.1 withdraw() with refusedFundsReturn is refused for an account that is not finally refused",
    !e1.ok && (await walletOf(appr)).balance === 30_000 && auditOf(appr, "withdraw.refused_funds_return_refused").length === 1, J(e1));
  const rec = await player("usr_rf_opt_recoverable", { balance: 30_000, deposits: [30_000], kyc: { status: "REJECTED", rejectReason: "EXPIRED_ID" } });
  const e2 = await withdraw(rec, { provider: "MPESA", amount: 20_000, msisdn: localOf.get(rec)! } as never, "rfd:e2", OFFICER, opt);
  ok("E.2 ...and for a RECOVERABLE refusal", !e2.ok && (await walletOf(rec)).balance === 30_000, J(e2));
  const fin = await refused("usr_rf_opt_final", 30_000, [30_000]);
  const e3 = await withdraw(fin, { provider: "MPESA", amount: 20_000, msisdn: localOf.get(fin)! } as never, undefined, undefined, opt);
  ok("E.3 ...and when the player, not an officer, asks for it", !e3.ok && (await walletOf(fin)).balance === 30_000, J(e3));
  const e4 = await withdraw(fin, { provider: "MPESA", amount: 20_000, msisdn: localOf.get(fin)! } as never, "rfd:e4", OFFICER, opt);
  ok("E.4 control - an officer's return for a finally refused, FROZEN account goes through, fee 0",
    e4.ok && e4.data?.fee === 0 && (await walletOf(fin)).balance === 10_000, J(e4));

  // An account approved ONCE and later finally refused: the identity gate says yes, so only the freeze stands.
  const once = await refused("usr_rf_once_approved", 30_000, [30_000], { approvedAt: "2026-01-01T00:00:00.000Z" });
  const gate = await assertIdentityForPayout(once);
  ok("E.5 fixture - the identity gate alone would let this account withdraw (approved once)", gate.eligible === true, J(gate));
  const e6 = await withdraw(once, { provider: "MPESA", amount: 20_000, msisdn: localOf.get(once)! } as never);
  ok("E.6 a normal withdrawal from the FROZEN wallet is still refused - by the freeze",
    !e6.ok && e6.code === "SUSPENDED" && (await walletOf(once)).balance === 30_000 && (await walletOf(once)).hold === 0, J(e6));
}

// ── §F · re-opening a final refusal ───────────────────────────────────────────────────────────────
section("§F · re-opening a final refusal lifts only the identity hold and releases the document number");
{
  const u = await refused("usr_rf_reopen", 5_000, [5_000]);
  await addWalletFreeze(u, "OFFICER", { actorId: OFFICER, note: "separate officer doubt" });
  const num = idNumberOf.get(u)!;
  ok("F.0 control - before re-opening, the refused document number is RESERVED",
    db.kyc.findActiveByIdNumber("NIDA", num, "usr_rf_someone_else")?.userId === u, J(db.kyc.findActiveByIdNumber("NIDA", num, "usr_rf_someone_else")));
  const reason = "Date of birth misread from the document; re-verification requested.";
  const selfR = await reopenFinalRefusal(u, u, reason);
  const shortR = await reopenFinalRefusal(OFFICER, u, "x".repeat(REOPEN_FINAL_REFUSAL_REASON_MIN - 1));
  ok("F.1 an officer cannot re-open their own, and a reason under the floor is refused",
    !selfR.ok && !shortR.ok && (await db.kyc.findByUserId(u))?.status === "REJECTED", `${J(selfR)} · ${J(shortR)}`);
  const recoverable = await player("usr_rf_reopen_recoverable", { balance: 0, kyc: { status: "REJECTED", rejectReason: "BLURRY_DOC" } });
  const rr = await reopenFinalRefusal(OFFICER, recoverable, reason);
  ok("F.2 a recoverable refusal cannot be re-opened here (the player restarts it)", !rr.ok, J(rr));

  const r = await reopenFinalRefusal(OFFICER, u, reason);
  await settle();
  const k = await db.kyc.findByUserId(u);
  const w = await walletOf(u);
  ok("F.3 re-opening restarts the verification", r.ok && k?.status === "IN_PROGRESS" && !k?.idNumber && !k?.rejectReason, `${J(r)} · ${String(k?.status)}`);
  ok("F.4 it lifts ONLY the identity hold - the officer's freeze stands", w.status === "FROZEN" && J(currentFreezeReasons(w)) === J(["OFFICER"]), `${w.status} ${J(w.freezeReasons)}`);
  ok("F.5 the document number is RELEASED", db.kyc.findActiveByIdNumber("NIDA", num, "usr_rf_someone_else") === null);
  ok("F.6 the re-open is a COMPLIANCE fact carrying the officer's reason",
    auditOf(u, "kyc.refusal_reopened").some((e) => e.category === "COMPLIANCE" && e.payload?.reason === reason));
  const only = await refused("usr_rf_reopen_only", 5_000, [5_000]);
  await reopenFinalRefusal(OFFICER, only, reason);
  ok("F.7 control - with no other hold, the same re-open makes the wallet ACTIVE", (await walletOf(only)).status === "ACTIVE", (await walletOf(only)).status);
}

console.log(`\nrefused-funds: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
