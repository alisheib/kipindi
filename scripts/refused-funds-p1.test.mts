/**
 * THE REFUSED PLAYER'S BALANCE — THE AUDIT'S MONEY FIXES, driven through the real services.   `npm run test:refused-funds-p1`
 *
 * Found by the audit of the identity-at-withdrawal release (session 95, 2026-09-13 — docs/LIVE-QA-CAMPAIGN.md §6b).
 * `test:refused-funds` proves the release's own claims; this suite proves what the audit found those claims left open,
 * each case written so it fails on the code as it shipped:
 *
 *   §1  a return ABOVE the 5,000,000 cap is refused BEFORE the forfeit (it used to forfeit, then fail)
 *   §2  any hold other than the identity refusal blocks every money path — position, decision, forfeit, withdraw
 *   §3  earlier forfeits count against "what the player paid in"
 *   §4  a paused network is refused before a forfeit that would really move money (the old C.12a had nothing to forfeit)
 *   §5  the officer's return is not charged to the player's withdrawal attempt bucket
 *   §6  the report read WITHOUT money rights reads no wallet at all
 *   §7  a return is "returned" only once its payout CONFIRMED; a failed return says so, to the report and to the player
 *   §8  a payout that fails AFTER a forfeit still writes to the player
 *   §9  a refused player cannot close the account out from under the officer's decision
 *   §10 re-open is refused while money is in flight, and keeps the refusal's evidence pointers
 *   §11 a stale identity hold: detected, lifted only when stale (beside an officer hold), and lifted by a non-final decision
 *   §12 an ACTIVE wallet holds nothing — a leftover reason can no longer trap an officer's freeze
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { withdraw, forfeitRefusedBalance, settleWithdrawalFailed } from "../src/lib/server/wallet-service.ts";
import { decideRefusedFunds, refusedFundsPosition, refusedFundsReport } from "../src/lib/server/refused-funds.ts";
import { reviewKyc, reopenFinalRefusal } from "../src/lib/server/kyc-service.ts";
import { addWalletFreeze, freezeWalletByOfficer, unfreezeWalletByOfficer, staleIdentityHold, liftStaleIdentityHold } from "../src/lib/server/wallet-freeze.ts";
import { closeAccount } from "../src/lib/server/user-service.ts";
import { setKillSwitch } from "../src/lib/server/payment-ops.ts";
import { rateCheckAsync } from "../src/lib/server/rate-limit.ts";
import { getAuditForTarget, auditFlush } from "../src/lib/server/audit.ts";
import { emailOutbox } from "../src/lib/server/email.ts";
import { currentFreezeReasons } from "../src/lib/wallet-freeze-reasons.ts";
import { WITHDRAW_MAX_TZS } from "../src/lib/server/validators.ts";
import { REFUSED_FUNDS_ACTION } from "../src/lib/refused-funds-outcomes.ts";

// The test-only email outbox captures only when armed (read lazily, so setting it here is in time) — §7.6 and §8
// read what the player was actually sent. Without this line the outbox is empty and §7.6 fails for the instrument.
process.env.EMAIL_OUTBOX_CAPTURE = "1";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n${s}`);
const now = () => new Date().toISOString();
const settle = async () => { await new Promise((r) => setTimeout(r, 250)); await auditFlush(); };
const J = (x: unknown) => JSON.stringify(x);

const OFFICER = "usr_rfp_officer";
const WHY = "Refused at review under the 2026-09-13 policy; decided by the compliance officer.";
const REOPEN_WHY = "The refusal was entered on the wrong account; re-opening it after a second look.";
let seq = 0;
const localOf = new Map<string, string>();

type Doc = { docType: string; storageKey: string };
type KycFixture = { status: "APPROVED" | "PENDING_REVIEW" | "REJECTED" | "IN_PROGRESS"; rejectReason?: string | null; approvedAt?: string | null; documents?: Doc[] } | null;

async function player(id: string, o: { balance: number; hold?: number; deposits?: number[]; kyc: KycFixture; wallet?: Partial<StoredWallet> }): Promise<string> {
  const local = `75${String(++seq).padStart(7, "0")}`;
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
      id: `txn_rfp_${id}_d${i}`, walletId: `wal_${id}`, userId: id, type: "DEPOSIT", status: "CONFIRMED", amount, fee: 0,
      taxWithheld: 0, balanceAfter: amount, currency: "TZS", provider: "MPESA", providerRef: `dep_rfp_${id}_${i}`, msisdn: local,
      description: "fixture deposit", positionId: null, amlReason: null, createdAt: now(), updatedAt: now(), completedAt: now(),
    } as never);
  }
  if (o.kyc) {
    await db.kyc.upsert({
      id: `kyc_${id}`, userId: id, status: o.kyc.status, rejectReason: o.kyc.rejectReason ?? null, rejectNote: null,
      idType: "NIDA", idNumber: `199001016${String(seq).padStart(11, "0")}`, idExpiry: null, idVerifiedAt: now(),
      idFingerprint: `fp_${id}`, fullName: "Refused Fixture", dob: "1990-01-01", documents: o.kyc.documents ?? [],
      reviewerId: OFFICER, reviewedAt: now(), submittedAt: now(),
      approvedAt: o.kyc.approvedAt !== undefined ? o.kyc.approvedAt : o.kyc.status === "APPROVED" ? now() : null,
      createdAt: now(), updatedAt: now(),
    } as never);
  }
  return id;
}
const refused = (id: string, balance: number, deposits: number[], extra: { hold?: number; holds?: string[]; documents?: Doc[] } = {}) =>
  player(id, {
    balance, hold: extra.hold, deposits,
    kyc: { status: "REJECTED", rejectReason: "UNDERAGE", documents: extra.documents },
    wallet: { status: "FROZEN", freezeReasons: extra.holds ?? ["IDENTITY_REFUSED"] },
  });
const walletOf = async (id: string) => (await db.wallet.findByUserId(id))!;
const forfeitTxns = async (id: string) => (await db.txn.listForUser(id)).filter((t) => t.type === "ADJUSTMENT_DEBIT");
const decisionRows = (id: string) => getAuditForTarget("User", id, 10_000).filter((e) => Object.values(REFUSED_FUNDS_ACTION).includes(e.action));
const noticesOf = async (id: string) => (await db.notification.findByUser(id, 500)).map((n) => n.titleEn);
const decide = (userId: string, outcome: string, provider: string | null = "MPESA") =>
  decideRefusedFunds({ officerId: OFFICER, userId, outcome, justification: WHY, provider });

await db.user.create({
  id: OFFICER, phoneE164: "+255750000999", passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "COMPLIANCE", status: "ACTIVE", locale: "EN", displayName: "Officer", dob: null, region: null,
  acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
} as never);

// ── §1 · the cap ─────────────────────────────────────────────────────────────────────────────────────────────
section("§1 · a return above the per-withdrawal cap is refused before anything moves");
{
  const u = await refused("usr_rfp_overcap", 7_000_000, [3_000_000, 3_000_000]);
  const pos = await refusedFundsPosition(u);
  ok("1.1 ⛔ RETURN_DEPOSITS (6,000,000) is unavailable, and says why", !pos.outcomes.RETURN_DEPOSITS.allowed && /per-withdrawal maximum/.test(pos.outcomes.RETURN_DEPOSITS.why ?? ""), J(pos.outcomes.RETURN_DEPOSITS));
  ok("1.2 ⛔ RETURN_BALANCE (7,000,000) is unavailable too", !pos.outcomes.RETURN_BALANCE.allowed, J(pos.outcomes.RETURN_BALANCE));
  ok("1.3 CONTROL · HOLD and FORFEIT stay available", pos.outcomes.HOLD_PENDING_APPEAL.allowed && pos.outcomes.FORFEIT.allowed);
  const r = await decide(u, "RETURN_DEPOSITS");
  await settle();
  ok("1.4 ⛔ the decision is refused", !r.ok, J(r));
  ok("1.5 ⛔ …and NOTHING was forfeited: balance intact, no forfeit transaction, no decision row",
    (await walletOf(u)).balance === 7_000_000 && (await forfeitTxns(u)).length === 0 && decisionRows(u).length === 0);
  ok("1.6 CONTROL · the cap in force is the validators' constant", WITHDRAW_MAX_TZS === 5_000_000);
}

// ── §2 · other holds ─────────────────────────────────────────────────────────────────────────────────────────
section("§2 · an officer's own hold or a self-exclusion blocks every money path");
{
  const u = await refused("usr_rfp_officer_hold", 30_000, [30_000], { holds: ["IDENTITY_REFUSED", "OFFICER"] });
  const pos = await refusedFundsPosition(u);
  ok("2.1 ⛔ the position names the blocking hold", J(pos.blockingHolds) === J(["OFFICER"]), J(pos.blockingHolds));
  ok("2.2 ⛔ every money outcome is unavailable; HOLD stays", !pos.outcomes.RETURN_BALANCE.allowed && !pos.outcomes.RETURN_DEPOSITS.allowed && !pos.outcomes.FORFEIT.allowed && pos.outcomes.HOLD_PENDING_APPEAL.allowed);
  const r = await decide(u, "RETURN_BALANCE");
  ok("2.3 ⛔ a RETURN decision is refused", !r.ok, J(r));
  const f = await forfeitRefusedBalance({ userId: u, officerId: OFFICER, amountTzs: 30_000, decisionRef: "rfd_direct", note: WHY, expectBalanceTzs: 30_000 });
  ok("2.4 ⛔ a direct forfeit is refused", !f.ok, J(f));
  const w = await withdraw(u, { provider: "MPESA", amount: 30_000, msisdn: localOf.get(u)! } as never, "rfd:direct_officer_hold", OFFICER, { refusedFundsReturn: { decisionId: "direct" } });
  ok("2.5 ⛔ a direct refused-funds withdraw is refused as frozen", !w.ok && (w as { code?: string }).code === "SUSPENDED", J(w));
  ok("2.6 ⛔ …and the 30,000 never moved", (await walletOf(u)).balance === 30_000 && (await walletOf(u)).hold === 0);
  const sx = await refused("usr_rfp_selfex_hold", 30_000, [30_000], { holds: ["IDENTITY_REFUSED", "SELF_EXCLUSION"] });
  ok("2.7 ⛔ a self-exclusion blocks the same way", !(await refusedFundsPosition(sx)).outcomes.RETURN_BALANCE.allowed);
  const only = await refused("usr_rfp_identity_only", 30_000, [30_000]);
  ok("2.8 CONTROL · with only the identity hold, RETURN_BALANCE is available", (await refusedFundsPosition(only)).outcomes.RETURN_BALANCE.allowed);
}

// ── §3 · earlier forfeits ────────────────────────────────────────────────────────────────────────────────────
section("§3 · earlier forfeits count against what the player paid in");
{
  const u = await refused("usr_rfp_forfeit_then_win", 25_000, [20_000]);
  const f = await decide(u, "FORFEIT", null);
  ok("3.1 setup · the whole 25,000 is forfeited", f.ok && f.forfeitedTzs === 25_000, J(f));
  await db.wallet.adjust(`wal_${u}`, { balance: 8_000 });   // an open bet settles into the frozen wallet afterwards
  const pos = await refusedFundsPosition(u);
  ok("3.2 ⛔ the forfeit is counted", pos.forfeitedBefore === 25_000, String(pos.forfeitedBefore));
  ok("3.3 ⛔ RETURN_DEPOSITS no longer offers the winnings as 'deposits'", !pos.outcomes.RETURN_DEPOSITS.allowed && pos.outcomes.RETURN_DEPOSITS.returnTzs === 0, J(pos.outcomes.RETURN_DEPOSITS));
  ok("3.4 CONTROL · RETURN_BALANCE still offers the 8,000", pos.outcomes.RETURN_BALANCE.allowed && pos.outcomes.RETURN_BALANCE.returnTzs === 8_000);
}

// ── §4 · paused network, with something to forfeit ───────────────────────────────────────────────────────────
section("§4 · a paused network is refused before a forfeit that would really move money");
{
  const u = await refused("usr_rfp_paused_forfeit", 30_000, [20_000]);
  const pos = await refusedFundsPosition(u);
  ok("4.0 setup · RETURN_DEPOSITS here would forfeit 10,000", pos.outcomes.RETURN_DEPOSITS.allowed && pos.outcomes.RETURN_DEPOSITS.forfeitTzs === 10_000, J(pos.outcomes.RETURN_DEPOSITS));
  await setKillSwitch("MPESA", "withdrawals", true, OFFICER);
  try {
    const r = await decide(u, "RETURN_DEPOSITS");
    await settle();
    ok("4.1 ⛔ refused on the paused network", !r.ok, J(r));
    ok("4.2 ⛔ …with nothing forfeited and no decision row", (await walletOf(u)).balance === 30_000 && (await forfeitTxns(u)).length === 0 && decisionRows(u).length === 0);
  } finally {
    await setKillSwitch("MPESA", "withdrawals", false, OFFICER);
  }
}

// ── §5 · the rate limit ──────────────────────────────────────────────────────────────────────────────────────
section("§5 · the officer's return is not charged to the player's withdrawal attempts");
{
  const u = await refused("usr_rfp_ratelimited", 30_000, [30_000]);
  for (let i = 0; i < 12; i++) await rateCheckAsync(u, "wallet.withdraw");
  const exhausted = await rateCheckAsync(u, "wallet.withdraw");
  ok("5.0 setup · the player's own withdraw bucket is exhausted", !exhausted.allowed);
  const r = await decide(u, "RETURN_BALANCE");
  ok("5.1 ⛔ the officer's return still goes out", r.ok && r.returnedTzs === 30_000 && !r.payoutError, J(r));
}

// ── §6 · the report without money rights ─────────────────────────────────────────────────────────────────────
section("§6 · the report read without money rights reads no wallet");
{
  const wallets = db.wallet as { listAll: typeof db.wallet.listAll };
  const orig = wallets.listAll;
  let calls = 0;
  wallets.listAll = ((...a: unknown[]) => { calls++; return (orig as (...x: unknown[]) => unknown).apply(db.wallet, a); }) as typeof db.wallet.listAll;
  try {
    const blind = await refusedFundsReport({ money: false });
    ok("6.1 ⛔ no wallet read", calls === 0, `calls=${calls}`);
    ok("6.2 ⛔ no balance, hold, open or state on any row", blind.accounts.length > 0 && blind.accounts.every((a) => a.balance === null && a.hold === null && a.open === null && a.state === null), `rows=${blind.accounts.length}`);
    const seen = await refusedFundsReport();
    ok("6.3 CONTROL · the default report reads wallets and states", calls >= 1 && seen.accounts.every((a) => a.state !== null));
  } finally {
    wallets.listAll = orig;
  }
}

// ── §7 · a return is returned once it CONFIRMED ──────────────────────────────────────────────────────────────
section("§7 · a return counts as returned only once its payout confirmed; a failed return says so");
{
  const u = await refused("usr_rfp_async_fail", 30_000, [30_000]);
  const prev = process.env.PAYMENTS_DEMO_ASYNC;
  process.env.PAYMENTS_DEMO_ASYNC = "true";
  let r: Awaited<ReturnType<typeof decide>>;
  try { r = await decide(u, "RETURN_BALANCE"); } finally { if (prev === undefined) delete process.env.PAYMENTS_DEMO_ASYNC; else process.env.PAYMENTS_DEMO_ASYNC = prev; }
  await settle();
  ok("7.0 setup · the return was dispatched and is in flight", r.ok && !!r.payoutTxnId && (await walletOf(u)).hold === 30_000, J(r));
  const inFlight = (await refusedFundsReport()).decisions.find((d) => d.userId === u)!;
  ok("7.1 ⛔ in flight: nothing counted as returned yet", inFlight.returnSettledTzs === 0 && inFlight.returnInFlightTzs === 30_000 && /PROCESSING|PENDING/.test(inFlight.payoutTxnStatusNow ?? ""), J(inFlight));
  const acct = (await refusedFundsReport()).accounts.find((a) => a.userId === u)!;
  ok("7.2 ⛔ the case reads 'return in flight'", acct.state === "return_in_flight", String(acct.state));
  const before = (await noticesOf(u)).length;
  await settleWithdrawalFailed(r.ok ? r.payoutTxnId! : "", "fixture: provider refused");
  await settle();
  const failed = (await refusedFundsReport()).decisions.find((d) => d.userId === u)!;
  ok("7.3 ⛔ after FAILED: status now FAILED, nothing counted as returned", failed.payoutTxnStatusNow === "FAILED" && failed.returnSettledTzs === 0 && failed.returnInFlightTzs === 0, J(failed));
  const acct2 = (await refusedFundsReport()).accounts.find((a) => a.userId === u)!;
  ok("7.4 ⛔ …the money is back in the frozen wallet and the case reads 'return failed'", acct2.balance === 30_000 && acct2.state === "return_failed" && (await walletOf(u)).status === "FROZEN", J(acct2));
  const titles = await noticesOf(u);
  ok("7.5 ⛔ the player is told the RETURN did not go through — not a generic 'funds returned to your balance'",
    titles.length > before && titles.some((t) => /return did not go through/i.test(t)) && !titles.some((t) => /^Withdrawal failed/.test(t)), J(titles));
  ok("7.6 ⛔ …and by email", emailOutbox().some((m) => m.to === `${u}@t.tz` && /did not go through/i.test(m.subject)), J(emailOutbox().filter((m) => m.to === `${u}@t.tz`).map((m) => m.subject)));
}

// ── §8 · a payout failing after a forfeit ────────────────────────────────────────────────────────────────────
section("§8 · a payout that fails after a forfeit still writes to the player");
{
  const u = await refused("usr_rfp_payout_error", 30_000, [20_000]);
  await db.user.update(u, { phoneE164: "+2551" } as never);   // an unusable registered number: the payout cannot start
  const r = await decide(u, "RETURN_DEPOSITS");
  await settle();
  ok("8.0 setup · the forfeit committed and the payout did not start", r.ok && r.forfeitedTzs === 10_000 && !!r.payoutError, J(r));
  ok("8.1 ⛔ the player is told what moved and that the return did not go through", (await noticesOf(u)).some((t) => /return did not go through/i.test(t)), J(await noticesOf(u)));
  const row = decisionRows(u)[0];
  ok("8.2 ⭐ the decision records the holds standing when it was taken", Array.isArray((row?.payload as { walletHolds?: unknown })?.walletHolds), J(row?.payload));
}

// ── §9 · closing the account ─────────────────────────────────────────────────────────────────────────────────
section("§9 · a refused player cannot close the account out from under the decision");
{
  const u = await refused("usr_rfp_close", 30_000, [30_000]);
  const r = await closeAccount(u, "fixture");
  ok("9.1 ⛔ closure is refused with account_close_held", !r.ok && (r as { reason?: string }).reason === "account_close_held", J(r));
  ok("9.2 ⛔ …the wallet stays FROZEN (not CLOSED) and the case stays decidable", (await walletOf(u)).status === "FROZEN" && (await refusedFundsPosition(u)).eligible);
  const sx = await player("usr_rfp_close_selfex", { balance: 30_000, kyc: null, wallet: { status: "FROZEN", freezeReasons: ["SELF_EXCLUSION"] } });
  try { await closeAccount(sx, "fixture"); } catch { /* session teardown needs a request scope in a script */ }
  ok("9.3 CONTROL · a self-exclusion alone does not block the player's own closure", (await walletOf(sx)).status === "CLOSED");
}

// ── §10 · re-open ────────────────────────────────────────────────────────────────────────────────────────────
section("§10 · re-open: never while money is in flight, and never without the evidence pointers");
{
  const busy = await refused("usr_rfp_reopen_inflight", 20_000, [30_000], { hold: 10_000 });
  const r = await reopenFinalRefusal(OFFICER, busy, REOPEN_WHY);
  ok("10.1 ⛔ refused while a payout is in flight", !r.ok && /in flight/.test((r as { error?: string }).error ?? ""), J(r));
  ok("10.2 ⛔ …the refusal stands", (await db.kyc.findByUserId(busy))!.status === "REJECTED");

  const docs = [{ docType: "NIDA_FRONT", storageKey: "r2:kyc/usr_rfp_reopen_evidence/NIDA_FRONT" }, { docType: "SELFIE", storageKey: "data:image/png;base64,AAAA" }];
  const u = await refused("usr_rfp_reopen_evidence", 0, [], { documents: docs });
  const ok2 = await reopenFinalRefusal(OFFICER, u, REOPEN_WHY);
  await settle();
  const row = getAuditForTarget("User", u, 1000).find((e) => e.action === "kyc.refusal_reopened");
  const ev = (row?.payload as { evidence?: { documents?: Array<{ docType: string; storageKey: string | null; inline: boolean }>; idFingerprint?: string | null } })?.evidence;
  ok("10.3 setup · the re-open went through", ok2.ok, J(ok2));
  ok("10.4 ⭐ the refused document's storage pointer is in the compliance record", ev?.documents?.[0]?.storageKey === "r2:kyc/usr_rfp_reopen_evidence/NIDA_FRONT" && ev?.idFingerprint === `fp_${u}`, J(ev));
  ok("10.5 ⛔ an INLINE image is never copied into the audit payload", ev?.documents?.[1]?.storageKey === null && ev?.documents?.[1]?.inline === true, J(ev?.documents?.[1]));
}

// ── §11 · stale identity holds ───────────────────────────────────────────────────────────────────────────────
section("§11 · a stale identity hold: detected, lifted only when stale, lifted by a non-final decision");
{
  const stale = await player("usr_rfp_stale", { balance: 5_000, kyc: { status: "IN_PROGRESS" }, wallet: { status: "FROZEN", freezeReasons: ["IDENTITY_REFUSED", "OFFICER"] } });
  ok("11.1 ⛔ detected beside an officer hold", await staleIdentityHold(stale));
  const l = await liftStaleIdentityHold(OFFICER, stale, "stale after a failed re-open");
  const w = await walletOf(stale);
  ok("11.2 ⛔ lifted — only the identity reason; the officer's hold keeps the wallet frozen", l.ok && J(currentFreezeReasons(w)) === J(["OFFICER"]) && w.status === "FROZEN", J({ l, w: w.freezeReasons }));

  const standing = await refused("usr_rfp_not_stale", 5_000, [5_000]);
  ok("11.3 ⛔ a standing final refusal is not stale", !(await staleIdentityHold(standing)));
  const refusedLift = await liftStaleIdentityHold(OFFICER, standing, "trying to lift a real refusal");
  ok("11.4 ⛔ …and cannot be lifted as one", !refusedLift.ok && (await walletOf(standing)).status === "FROZEN", J(refusedLift));

  const approve = await player("usr_rfp_approve_lifts", { balance: 5_000, kyc: { status: "PENDING_REVIEW" }, wallet: { status: "FROZEN", freezeReasons: ["IDENTITY_REFUSED"] } });
  const a = await reviewKyc({ officerId: OFFICER, userId: approve, decision: "APPROVE" });
  ok("11.5 ⛔ an APPROVE lifts a stale identity hold: the approved player is not left frozen", a.ok && (await walletOf(approve)).status === "ACTIVE", J({ a, w: await walletOf(approve) }));
}

// ── §12 · an ACTIVE wallet holds nothing ─────────────────────────────────────────────────────────────────────
section("§12 · an ACTIVE wallet's leftover reasons are history, not holds");
{
  ok("12.1 ⛔ ACTIVE + ['SELF_EXCLUSION'] reads as no holds", currentFreezeReasons({ status: "ACTIVE", freezeReasons: ["SELF_EXCLUSION"] }).length === 0);
  ok("12.2 CONTROL · FROZEN with no recorded reason still reads as a self-exclusion", J(currentFreezeReasons({ status: "FROZEN", freezeReasons: [] })) === J(["SELF_EXCLUSION"]));
  const u = await player("usr_rfp_leftover", { balance: 5_000, kyc: null, wallet: { status: "ACTIVE", freezeReasons: ["SELF_EXCLUSION"] } });
  const fz = await freezeWalletByOfficer(OFFICER, u, "officer freeze on a leftover");
  const uf = await unfreezeWalletByOfficer(OFFICER, u, "officer lifts their freeze");
  ok("12.3 ⛔ an officer's freeze then unfreeze returns the wallet to ACTIVE (it used to stay frozen for good)", fz.ok && uf.ok && (await walletOf(u)).status === "ACTIVE", J({ fz, uf, w: await walletOf(u) }));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
