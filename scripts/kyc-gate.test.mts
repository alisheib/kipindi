/**
 * THE IDENTITY GATE ON THE MONEY PATH — driven, not asserted.   `npm run test:kyc-gate`
 *
 * ⭐ THE RULE (owner ruling, Ali, 2026-09-13 — the top 2026-09-13 entries of
 * docs/COMPLIANCE-DECISIONS.md): identity is required before money is WITHDRAWN, and before
 * nothing else. The ladder: **register → confirm email → deposit and play → verify identity →
 * withdraw.** The gate, and why withdrawal asks "ever approved" rather than "approved now", live in
 * `src/lib/server/kyc-gate.ts` and `src/lib/kyc-approval.ts`.
 *
 * ⛔ THIS FILE ASSERTED THE OPPOSITE FOR DEPOSIT AND BET FROM 2026-09-05 TO 2026-09-13. Its §1 then
 * proved "an unverified account deposits nothing and bets nothing". Every one of those assertions is
 * inverted below, not deleted: a suite that merely stopped checking deposits would let the
 * 2026-09-05 gate come back unseen, which is the exact regression `red:kyc-gate` now plants.
 *
 * ⛔ WHAT THIS FILE REFUSES TO DO IS ASSERT THE REGISTRY. `REASONS.kyc_rejected` existing proves
 * nothing about what a player is told, and `assertIdentityForPayout` answering `false` proves nothing
 * about whether `withdraw()` asks it. Every behavioural section goes through the REAL money function —
 * `deposit()`, `buyPosition()`, `withdraw()` — on fixtures written through the ordinary store, and
 * reads the REAL result.
 *
 * ⛔ AND EVERY REFUSAL IS PAIRED WITH AN ACCEPTANCE ON THE SAME PATH, and every "nothing happened" with
 * a control proving the instrument can see something happen. A negative assertion with no positive
 * beside it passes vacuously (docs/MODULE-CERTIFICATION-PROGRAM.md's meta-rule).
 *
 * ⚠️ NO CALL BELOW MAY CRASH THE SUITE. Every money call goes through `run()`, which turns a throw
 * into a result. `red:kyc-gate` counts a mutation as caught only when it fails its OWN named check,
 * and a crash prints no FAIL line at all — so an uncaught throw would turn a caught defect into
 * "went red on the wrong assertion".
 *
 * SECTIONS
 *   §1  every never-approved state: deposit reaches the email gate and goes through, bet accepted,
 *       withdrawal REFUSED with that state's own reason
 *   §2  the positive controls — APPROVED withdraws; APPROVED with no stamp: gate, panel and predicate agree
 *   §3  🔴 RE-VERIFICATION: approved once, re-verifying now — the withdrawal STAYS OPEN
 *   §4  `approvedAt` survives the paths that would quietly clear it
 *   §5  a missing KYC row is NOT_STARTED, not "fine"
 *   §6  a failed read: the gate refuses, the record says UNREADABLE, money in and stakes are never stopped
 *   §7  the record: `deposit.initiated` carries both fields; one bet writes ONE row, never two
 *   §8  structurally: no call to the gate outside `withdraw()`, anywhere under `src/`
 *   §9  the quiet rule: a withdrawal refused for identity sends the player nothing extra
 *   §10 Up & Down stakes through the same function, so the same record covers both products
 */
// ⚠️ ARMED BEFORE ANY SEND. `email.ts` reads this lazily, at send time, so setting it here (after the
// imports are evaluated) is early enough; §9 reads the outbox it fills. Ignored in production.
process.env.EMAIL_OUTBOX_CAPTURE = "1";

import { db } from "../src/lib/server/store.ts";
import { deposit, withdraw } from "../src/lib/server/wallet-service.ts";
import { createMarket, buyPosition } from "../src/lib/server/market-service.ts";
import { assertIdentityForPayout, readIdentityStanding } from "../src/lib/server/kyc-gate.ts";
import { startKyc, reviewKyc, forceReverifyKyc } from "../src/lib/server/kyc-service.ts";
import { getAuditPage, auditFlush } from "../src/lib/server/audit.ts";
import { emailOutbox } from "../src/lib/server/email.ts";
import { kycGateState } from "../src/lib/kyc-gate-state.ts";
import { approvedEver } from "../src/lib/kyc-approval.ts";
import { decomment } from "./lib/decomment.mts";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n${s}`);

const now = () => new Date().toISOString();
let seq = 0;

type KycState = "NOT_STARTED" | "IN_PROGRESS" | "PENDING_REVIEW" | "ADDITIONAL_INFO_REQUIRED" | "REJECTED" | "APPROVED";

/** A money call's result, or the throw it ended in — never an uncaught crash (see the header). */
type Outcome = { ok: boolean; code?: string; reason?: string; error?: string; data?: Record<string, unknown>; threw?: string };
async function run(fn: () => Promise<unknown>): Promise<Outcome> {
  try {
    return (await fn()) as Outcome;
  } catch (e) {
    return { ok: false, threw: (e as Error)?.message ?? String(e) };
  }
}
const why = (o: Outcome) =>
  o.threw ? `THREW: ${o.threw}` : o.ok ? `ok ${JSON.stringify(o.data ?? {})}` : `${o.code ?? "?"} / ${o.reason ?? "no reason"} · ${o.error ?? ""}`;

/** Fire-and-forget sends (notifications, email, audit appends) settle before anything is counted. */
const settle = async () => { await new Promise((r) => setTimeout(r, 250)); await auditFlush(); };

/**
 * An account in a chosen identity state, with an EMPTY wallet — its money arrives through `deposit()`.
 *
 * ⭐ THE BALANCE IS NOT WRITTEN INTO THE WALLET. From 2026-09-13 the product's own order is deposit →
 * play → verify → withdraw, so the fixture takes that road: a confirmed deposit through wallet-service
 * funds every account below, and §1 asserts that deposit rather than assuming it.
 * ⛔ `NOT_STARTED` WRITES NO ROW — that is what a real new account looks like, and §5 exists because
 * "no row" is the state a naive gate treats as fine.
 * ⚠️ THE REGISTERED NUMBER IS REMEMBERED. `withdraw()` refuses any destination that is not the
 * account's own handset (E-215), and that check runs BEFORE the identity gate — a hard-coded number
 * would come back `payout_destination_not_registered` for every fixture, including the APPROVED
 * control, and a refusal from the wrong door looks identical unless the `reason` is read.
 * ⚠️ `status: "ACTIVE"` on every account: from 2026-09-13 new users are created ACTIVE, and
 * `PENDING_KYC` is a legacy value that gated nothing.
 */
const phoneOf = new Map<string, string>();
const emailOf = (id: string) => `${id}@t.tz`;

async function account(id: string, kyc: KycState, opts: { emailConfirmed?: boolean; approvedAt?: string | null } = {}): Promise<void> {
  const phone = `+25577${String(++seq).padStart(7, "0")}`;
  phoneOf.set(id, phone.slice(4)); // the 9-digit local part the payout form submits
  await db.user.create({
    id, phoneE164: phone,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: "Gate Tester", dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: emailOf(id), emailVerifiedAt: opts.emailConfirmed === false ? null : now(),
    createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as never);
  if (kyc === "NOT_STARTED") return;
  await db.kyc.upsert({
    id: `kyc_${id}`, userId: id, status: kyc, rejectReason: null, rejectNote: null,
    idType: "NIDA", idNumber: `199001011${String(seq).padStart(11, "0")}`, idExpiry: null,
    idVerifiedAt: now(), fullName: "Gate Tester", dob: "1990-01-01", documents: [],
    reviewerId: null, reviewedAt: now(), submittedAt: now(),
    approvedAt: opts.approvedAt !== undefined ? opts.approvedAt : kyc === "APPROVED" ? now() : null,
    createdAt: now(), updatedAt: now(),
  });
}

const market = await createMarket({
  titleEn: "Identity gate market", titleSw: "Soko la kitambulisho", category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
} as never);

const DEPOSIT = 50_000, STAKE = 5_000, WITHDRAWAL = 20_000;
const doDeposit = (id: string) => run(() => deposit(id, { provider: "MPESA", amount: DEPOSIT, msisdn: "712345678" }));
const doBet = (id: string) => run(() => buyPosition(id, { marketId: market.id, side: "YES", stake: STAKE }));
const doWithdraw = (id: string) => run(() => withdraw(id, { provider: "MPESA", amount: WITHDRAWAL, msisdn: phoneOf.get(id)! } as never));
const walletOf = async (id: string) => (await db.wallet.findByUserId(id))!;

const officer = "kg_officer";
await db.user.create({
  id: officer, phoneE164: "+255770000999", passwordHash: null, passwordSalt: null,
  failedLoginCount: 0, lockedUntil: null, role: "COMPLIANCE", status: "ACTIVE", locale: "EN",
  displayName: "Officer", dob: null, region: null, acceptedTermsVersion: null,
  acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
} as never);

// ── §1 · every never-approved state ─────────────────────────────────────────
section("§1 · a never-approved account deposits and plays, and cannot withdraw");
{
  const CASES: { kyc: KycState; reason: string }[] = [
    { kyc: "NOT_STARTED",              reason: "kyc_not_verified" },
    { kyc: "IN_PROGRESS",              reason: "kyc_not_verified" },
    { kyc: "PENDING_REVIEW",           reason: "kyc_pending_review" },
    { kyc: "ADDITIONAL_INFO_REQUIRED", reason: "kyc_more_info" },
    { kyc: "REJECTED",                 reason: "kyc_rejected" },
  ];
  for (const c of CASES) {
    const s = c.kyc;

    // ⭐ THE DOOR BELOW IDENTITY'S OLD SPOT. The 2026-09-05 gate stood between the RG lockout and the
    // email gate, so an account with an UNCONFIRMED address is the sharpest probe: without an identity
    // question it must be stopped by the email gate (`EMAIL_UNVERIFIED`), and with one restored it
    // would be stopped earlier with a `kyc_*` reason instead.
    const noEmail = `kg_${s.toLowerCase()}_noemail`;
    await account(noEmail, s, { emailConfirmed: false });
    const e = await doDeposit(noEmail);
    ok(`1.${s}.deposit · reaches the email gate, not an identity refusal`,
      !e.ok && e.code === "EMAIL_UNVERIFIED" && !/^kyc_/.test(e.reason ?? ""), why(e));

    const id = `kg_${s.toLowerCase()}`;
    await account(id, s);
    const d = await doDeposit(id);
    ok(`1.${s}.deposit · goes through with a confirmed email`, d.ok, why(d));
    ok(`1.${s}.deposit · …confirmed and credited`,
      d.ok && d.data?.status === "CONFIRMED" && (await walletOf(id)).balance === DEPOSIT,
      `status ${String(d.data?.status)} · balance ${(await walletOf(id)).balance}`);

    const b = await doBet(id);
    ok(`1.${s}.bet · accepted`, b.ok, why(b));

    // ⛔ THE BALANCE COVERS THE WITHDRAWAL (45,000 held, 20,000 asked), so a refusal here can only be
    // the identity gate — never "insufficient funds" wearing its clothes. The reason is read.
    const before = await walletOf(id);
    const w = await doWithdraw(id);
    ok(`1.${s}.withdraw · REFUSED`, !w.ok && !w.threw, why(w));
    ok(`1.${s}.withdraw · reason is "${c.reason}"`, w.reason === c.reason, why(w));
    const after = await walletOf(id);
    ok(`1.${s}.withdraw · nothing moved`, after.balance === before.balance && after.hold === before.hold,
      `balance ${before.balance}→${after.balance} · hold ${before.hold}→${after.hold}`);
  }
}

// ── §2 · THE POSITIVE CONTROLS ──────────────────────────────────────────────
section("§2 · ★ an approved account withdraws — the gate is not a blanket refusal");
{
  await account("kg_approved", "APPROVED");
  const d = await doDeposit("kg_approved");
  ok("2.1 · ★ APPROVED deposits", d.ok, why(d));
  const b = await doBet("kg_approved");
  ok("2.2 · ★ APPROVED bets", b.ok, why(b));
  const w = await doWithdraw("kg_approved");
  ok("2.3 · ★ APPROVED withdraws", w.ok, why(w));

  // ⭐ APPROVED WITH NO STAMP. `approvedAt` null on an APPROVED row is reachable (a submission written
  // before the column existed whose backfill did not run, or one created outside `reviewKyc`), and
  // until 2026-09-13 the server paid it while the withdraw page walled it off. Three readers, one answer.
  await account("kg_unstamped", "APPROVED", { approvedAt: null });
  const row = await db.kyc.findByUserId("kg_unstamped");
  ok("2.4 · fixture · the row really is APPROVED with no first-approval stamp",
    row?.status === "APPROVED" && row?.approvedAt === null, `${String(row?.status)} · ${String(row?.approvedAt)}`);
  const gate = await run(() => assertIdentityForPayout("kg_unstamped"));
  ok("2.5 · the gate says eligible", (gate as unknown as { eligible?: boolean }).eligible === true, JSON.stringify(gate));
  ok("2.6 · kycGateState draws no panel (null)", kycGateState(row) === null, String(kycGateState(row)));
  ok("2.7 · approvedEver says true", approvedEver(row) === true);
  await doDeposit("kg_unstamped");
  const w2 = await doWithdraw("kg_unstamped");
  ok("2.8 · ★ …and the withdrawal itself goes through", w2.ok, why(w2));
}

// ── §3 · RE-VERIFICATION — THE ONE ASYMMETRY, AND THE POINT OF THE COLUMN ────
section("§3 · 🔴 approved once, re-verifying now — the money already earned stays reachable");
{
  // 🔴 THIS IS THE SECTION THE WHOLE `approvedAt` DESIGN EXISTS FOR. `forceReverifyKyc` moves an
  // APPROVED account to ADDITIONAL_INFO_REQUIRED, and that player HOLDS REAL MONEY earned under an
  // identity we accepted. Gate the payout on CURRENT status and it freezes. An officer who must stop
  // money leaving freezes the wallet — a money control, not an identity status.
  await account("kg_reverify", "APPROVED");
  await doDeposit("kg_reverify");

  const rv = await run(() => forceReverifyKyc(officer, "kg_reverify", "Document expired — please resubmit."));
  ok("3.0 · fixture · the officer really forced a re-verification", rv.ok, why(rv));
  const row = await db.kyc.findByUserId("kg_reverify");
  ok("3.1 · status moved off APPROVED", row?.status === "ADDITIONAL_INFO_REQUIRED", String(row?.status));
  ok("3.2 · ⛔ …but the first-approval stamp SURVIVED", !!row?.approvedAt,
    "cleared here, and the player is locked out of money they already earned");

  const b = await doBet("kg_reverify");
  ok("3.3 · betting stays open while re-verifying", b.ok, why(b));
  const w = await doWithdraw("kg_reverify");
  ok("3.4 · ★★ WITHDRAWAL STILL WORKS mid-re-verification — money already earned is never trapped", w.ok,
    w.ok ? "" : `TRAPPED: ${why(w)}`);

  // And the seam, the panel and the predicate agree with the service, asked directly.
  const gate = await run(() => assertIdentityForPayout("kg_reverify"));
  ok("3.5 · the seam, the panel and the predicate say the same thing",
    (gate as unknown as { eligible?: boolean }).eligible === true && kycGateState(row) === null && approvedEver(row) === true,
    `gate ${JSON.stringify(gate)} · panel ${String(kycGateState(row))}`);
}

// ── §4 · `approvedAt` survives the paths that would quietly clear it ────────
section("§4 · the stamp is written once and never cleared");
{
  // 4a — the REJECT-then-RESTART path. APPROVED → force-reverify → REJECTED → the player taps "start
  // again". `restartedSubmission` rebuilds the submission from scratch instead of spreading `...k`; if
  // it drops the column, a player who was verified, re-checked, turned down and re-applied can no
  // longer reach their own balance — and nothing else would go red.
  // ⚠️ A FIXED DATE IN THE PAST, not `now()`. 4.5 compares the stamp before and after a re-approval;
  // stamped "now" at creation, a re-stamp landing in the same millisecond would read as unchanged and
  // `re-approval-restamps-the-first-approval-date` could slip through on timing alone.
  const FIRST_APPROVAL = "2026-01-01T00:00:00.000Z";
  await account("kg_restart", "APPROVED", { approvedAt: FIRST_APPROVAL });
  const before = (await db.kyc.findByUserId("kg_restart"))!.approvedAt;
  ok("4.0 · fixture · the stamp was set to begin with", before === FIRST_APPROVAL, String(before));

  await forceReverifyKyc(officer, "kg_restart", "Please resubmit your document.");
  await reviewKyc({ officerId: officer, userId: "kg_restart", decision: "REJECT", reason: "Illegible document." } as never);
  ok("4.1 · fixture · the submission really is REJECTED (a recoverable code)",
    (await db.kyc.findByUserId("kg_restart"))?.status === "REJECTED",
    String((await db.kyc.findByUserId("kg_restart"))?.status));

  const restarted = await run(() => startKyc("kg_restart"));
  ok("4.1b · fixture · the restart was accepted", restarted.ok, why(restarted));
  const after = await db.kyc.findByUserId("kg_restart");
  ok("4.2 · ⛔ restart RESET the submission", after?.status === "IN_PROGRESS" && !after?.idNumber, String(after?.status));
  ok("4.3 · ★ …and the first-approval stamp came through the reset intact", !!after?.approvedAt, String(after?.approvedAt));
  const gate = await run(() => assertIdentityForPayout("kg_restart"));
  ok("4.4 · …so the account can still be paid", (gate as unknown as { eligible?: boolean }).eligible === true, JSON.stringify(gate));

  // 4b — re-approval must not RE-STAMP. The column records the FIRST time we were satisfied;
  // overwriting it on every approval makes it a duplicate of `reviewedAt`.
  // 🔴 THE FIRST DRAFT OF THIS CHECK (2026-09-05) PROVED NOTHING, AND `red:kyc-gate` IS WHAT SAID SO.
  // It approved a submission `startKyc` had just reset to IN_PROGRESS — a state `reviewKyc` refuses —
  // and swallowed the refusal, so `approvedAt` was trivially unchanged. ⛔ The submission is moved to
  // PENDING_REVIEW first, and the approval's own return value is asserted before the stamp is read.
  const k2 = (await db.kyc.findByUserId("kg_restart"))!;
  await db.kyc.upsert({ ...k2, status: "PENDING_REVIEW", submittedAt: now(), updatedAt: now() });
  const reapproval = await run(() => reviewKyc({ officerId: officer, userId: "kg_restart", decision: "APPROVE" } as never));
  ok("4.4b · fixture · the re-approval actually happened", reapproval.ok, why(reapproval));
  const reapproved = await db.kyc.findByUserId("kg_restart");
  ok("4.4c · fixture · …and the account really is APPROVED again", reapproved?.status === "APPROVED", String(reapproved?.status));
  ok("4.5 · ★ re-approval did NOT move the first-approval date",
    reapproved?.approvedAt === before, `${String(before)} → ${String(reapproved?.approvedAt)}`);
}

// ── §5 · a missing row is NOT_STARTED, not "fine" ───────────────────────────
section("§5 · the state a brand-new account is actually in");
{
  // From 2026-09-13 most funded accounts have NO KycSubmission when they first reach for their money.
  // A gate reading `row && row.status !== "APPROVED"` would let exactly that population through.
  await account("kg_norow", "NOT_STARTED");
  const row = await db.kyc.findByUserId("kg_norow");
  ok("5.0 · fixture · there really is no KYC row", row === null);
  const gate = (await run(() => assertIdentityForPayout("kg_norow"))) as unknown as { eligible?: boolean; kycStatus?: string; reason?: string; threw?: string };
  ok("5.1 · ★ no row → the gate refuses", gate.eligible === false, JSON.stringify(gate));
  ok("5.2 · …reported as NOT_STARTED with kyc_not_verified, not as an empty string or undefined",
    gate.kycStatus === "NOT_STARTED" && gate.reason === "kyc_not_verified", JSON.stringify(gate));
  const standing = (await run(() => readIdentityStanding("kg_norow"))) as unknown as { kycStatus?: string; everApproved?: boolean | null };
  ok("5.3 · the record says NOT_STARTED / never approved — a real `false`, not a null",
    standing.kycStatus === "NOT_STARTED" && standing.everApproved === false, JSON.stringify(standing));
  ok("5.4 · the panel says not_started and the predicate says false",
    kycGateState(row) === "not_started" && approvedEver(row) === false, String(kycGateState(row)));
}

// ── §6 · a failed read ──────────────────────────────────────────────────────
section("§6 · a failed identity read: the gate refuses, the record says UNREADABLE, nothing else stops");
{
  // ⭐ OPPOSITE FAILURE DIRECTIONS, ONE ACCOUNT. The fixture is APPROVED and funded, so the only thing
  // that can refuse its withdrawal here is the read failing — and "we could not check" must not become
  // "you are verified". The record, on the other hand, sits on money already on its way and a stake
  // already committed, so a failed read must never stop either, and must never be written down as a
  // claim about the player ("NOT_STARTED" / false).
  const broken = "kg_brokenread";
  await account(broken, "APPROVED");
  const funded = await doDeposit(broken);
  ok("6.0 · fixture · funded while the read still worked", funded.ok, why(funded));

  // The break goes through the ordinary store object every reader uses, for this one account only.
  const realFind = db.kyc.findByUserId;
  const failing = new Set<string>([broken]);
  (db.kyc as { findByUserId: unknown }).findByUserId = async (userId: string) => {
    if (failing.has(userId)) throw new Error("simulated KYC read failure");
    return realFind.call(db.kyc, userId);
  };
  try {
    const probe = await run(() => db.kyc.findByUserId(broken));
    const other = await run(() => db.kyc.findByUserId("kg_approved"));
    ok("6.0b · control · the read really fails for this account, and only this one",
      !!probe.threw && !other.threw, `${String(probe.threw)} · other ${other.threw ? "threw" : "read"}`);

    const standing = await run(() => readIdentityStanding(broken));
    const s = standing as unknown as { kycStatus?: string; everApproved?: boolean | null; threw?: string };
    ok("6.1 · readIdentityStanding records UNREADABLE and a null — never throws, never guesses",
      !s.threw && s.kycStatus === "UNREADABLE" && s.everApproved === null, JSON.stringify(standing));

    const gate = await run(() => assertIdentityForPayout(broken));
    ok("6.2 · ★ the gate does NOT say eligible when it could not read",
      !!gate.threw || (gate as unknown as { eligible?: boolean }).eligible === false, JSON.stringify(gate));

    const before = await walletOf(broken);
    const w = await doWithdraw(broken);
    const after = await walletOf(broken);
    ok("6.3 · ★ …so the withdrawal fails closed, and nothing moved",
      !w.ok && after.balance === before.balance && after.hold === before.hold,
      `${why(w)} · balance ${before.balance}→${after.balance} · hold ${before.hold}→${after.hold}`);

    const d = await doDeposit(broken);
    ok("6.4 · ★ a deposit still goes through when the identity read fails", d.ok, why(d));
    await settle();
    const depRow = getAuditPage({ limit: 100_000 }).find((e) => e.action === "deposit.initiated" && e.targetId === d.data?.txnId);
    ok("6.5 · …and its record says UNREADABLE / null, never NOT_STARTED / false",
      depRow?.payload?.kycStatus === "UNREADABLE" && depRow?.payload?.everApproved === null, JSON.stringify(depRow?.payload ?? null));

    const b = await doBet(broken);
    ok("6.6 · ★ a bet is still accepted when the identity read fails", b.ok, why(b));
    await settle();
    const betRow = getAuditPage({ limit: 100_000 }).find((e) => e.action === "market.position.opened" && e.targetId === b.data?.positionId);
    ok("6.7 · …and its record says UNREADABLE / null",
      betRow?.payload?.kycStatus === "UNREADABLE" && betRow?.payload?.everApproved === null, JSON.stringify(betRow?.payload ?? null));
  } finally {
    (db.kyc as { findByUserId: unknown }).findByUserId = realFind;
  }
}

// ── §7 · the record ─────────────────────────────────────────────────────────
section("§7 · what replaced the deposit and bet gates is a RECORD — two fields, never a row");
{
  // ⭐ WHY FIELDS AND NOT ROWS: every `audit()` append is serialised through one database-global
  // writer, and a bet is the hottest path in the repo. A second row per bet would double the load on
  // that single point (`readIdentityStanding`'s header). So: one bet → exactly ONE
  // `market.position.opened` row, carrying `kycStatus` + `everApproved`, and no other identity row.
  const isIdentityRow = (e: { action: string; payload?: Record<string, unknown> | null }) =>
    /kyc|identity/i.test(e.action) || (!!e.payload && ("kycStatus" in e.payload || "everApproved" in e.payload));
  ok("7.0 · control · the identity-row detector can fire",
    isIdentityRow({ action: "bet.identity_standing", payload: { kycStatus: "NOT_STARTED" } })
    && isIdentityRow({ action: "wallet.x", payload: { everApproved: false } })
    && !isIdentityRow({ action: "market.odds.moved", payload: { marketId: "m" } }));

  const CASES = [
    { id: "kg_rec_unverified", kyc: "NOT_STARTED" as const, everApproved: false },
    { id: "kg_rec_approved", kyc: "APPROVED" as const, everApproved: true },
  ];
  for (const c of CASES) {
    await account(c.id, c.kyc);
    const d = await doDeposit(c.id);
    ok(`7.1 · [${c.kyc}] fixture · the deposit went through`, d.ok, why(d));
    await settle();
    const depRows = getAuditPage({ limit: 100_000 }).filter((e) => e.action === "deposit.initiated" && e.targetId === d.data?.txnId);
    ok(`7.2 · deposit.initiated carries kycStatus AND everApproved [${c.kyc}]`,
      depRows.length === 1 && depRows[0].payload?.kycStatus === c.kyc && depRows[0].payload?.everApproved === c.everApproved,
      `${depRows.length} row(s) · ${JSON.stringify(depRows[0]?.payload ?? null)}`);

    const seen = new Set(getAuditPage({ limit: 100_000 }).map((e) => e.id));
    const b = await doBet(c.id);
    ok(`7.3 · [${c.kyc}] fixture · the bet was accepted`, b.ok, why(b));
    await settle();
    const delta = getAuditPage({ limit: 100_000 }).filter((e) => !seen.has(e.id));
    const opened = delta.filter((e) => e.action === "market.position.opened" && e.targetId === b.data?.positionId);
    ok(`7.4 · control · the instrument sees the bet's rows [${c.kyc}]`, delta.length > 0, `${delta.length} new row(s): ${delta.map((e) => e.action).join(", ")}`);
    ok(`7.5 · one bet writes EXACTLY ONE market.position.opened row, with kycStatus AND everApproved [${c.kyc}]`,
      opened.length === 1 && opened[0].payload?.kycStatus === c.kyc && opened[0].payload?.everApproved === c.everApproved,
      `${opened.length} row(s) · ${JSON.stringify(opened[0]?.payload ?? null)}`);
    const others = delta.filter((e) => !opened.includes(e) && isIdentityRow(e));
    ok(`7.6 · ⛔ …and the bet wrote NO other identity row [${c.kyc}]`, others.length === 0,
      others.map((e) => `${e.action} ${JSON.stringify(e.payload)}`).join(" | "));
  }
}

// ── §8 · structurally, the gate is asked in ONE function ────────────────────
section("§8 · no call to assertIdentityForPayout outside withdraw(), anywhere under src/");
{
  // ⭐ BEHAVIOUR IS §1; THIS IS THE CENSUS. §1 proves `deposit()` and `buyPosition()` do not refuse on
  // identity today; it cannot see a new money path somebody adds tomorrow (an agent fee, a transfer)
  // that calls the gate where it does not belong. ⛔ The population is DISCOVERED by walking `src/`
  // and printed, never listed here — a list of files written beside the check is the check choosing
  // its own population.
  const ROOT = fileURLToPath(new URL("..", import.meta.url));
  const SRC = join(ROOT, "src");
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(n) ? [p] : [];
  });
  const CALL = /(?<!function\s+)\bassertIdentityForPayout\s*\(/g;
  const TOP = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\s*\*?\s*(\w+)|(?:const|let|var)\s+(\w+))/;

  /** Every call to the gate in one source, with the top-level declaration it sits inside. */
  const callsIn = (code: string) => {
    const lines = code.split("\n");
    const out: { line: number; fn: string }[] = [];
    for (const m of code.matchAll(CALL)) {
      const line = code.slice(0, m.index).split("\n").length;
      let fn = "<module scope>";
      for (let i = line - 1; i >= 0; i--) {
        const t = TOP.exec(lines[i]);
        if (t) { fn = t[1] ?? t[2]; break; }
      }
      out.push({ line, fn });
    }
    return out;
  };

  // Control first: the locator can see a planted call, and can tell inside from outside.
  const planted = callsIn([
    "export async function withdraw(userId: string) {", "  const g = await assertIdentityForPayout(userId);", "}",
    "export async function deposit(userId: string) {", "  const g = await assertIdentityForPayout(userId);", "}",
    "export async function assertIdentityForPayout(userId: string) {}",
  ].join("\n"));
  ok("8.0 · control · the locator finds planted calls, attributes each to its function, and skips the definition",
    planted.length === 2 && planted[0].fn === "withdraw" && planted[1].fn === "deposit", JSON.stringify(planted));

  const files = walk(SRC);
  const sites: { file: string; line: number; fn: string }[] = [];
  const naming: string[] = [];
  for (const f of files) {
    const raw = readFileSync(f, "utf8");
    if (!raw.includes("assertIdentityForPayout")) continue;
    naming.push(relative(ROOT, f).replace(/\\/g, "/"));
    for (const c of callsIn(decomment(raw).replace(/\r\n/g, "\n"))) sites.push({ file: relative(ROOT, f).replace(/\\/g, "/"), ...c });
  }
  console.log(`     population: ${files.length} source files under src/ · ${naming.length} name the gate (${naming.join(", ")})`);
  console.log(`     call sites: ${sites.map((s) => `${s.file}:${s.line} in ${s.fn}()`).join(" · ") || "none"}`);
  ok("8.1 · fixture · the walk really covered the tree", files.length > 300, `${files.length} files`);
  ok("8.2 · the gate is called at all — a renamed gate would make 8.3 vacuous", sites.length >= 1, `${sites.length} call site(s)`);
  const outside = sites.filter((s) => !(s.file === "src/lib/server/wallet-service.ts" && s.fn === "withdraw"));
  ok("8.3 · ⛔ every call to the gate sits inside withdraw() in wallet-service.ts", outside.length === 0,
    outside.map((s) => `${s.file}:${s.line} in ${s.fn}()`).join(" · "));
}

// ── §9 · the quiet rule ─────────────────────────────────────────────────────
section("§9 · a withdrawal refused for identity sends the player nothing extra");
{
  // ⭐ OWNER INSTRUCTION, Ali, 2026-09-13: don't over-tell the player. The withdraw screen says it
  // (KycGatePanel); the server refusal is the whole event. A bell row or an email "prompting" them
  // after a refused withdrawal was built and removed the same day (`promptIdentityAfterBlockedWithdrawal`).
  // ⚠️ Counted, not grepped: the instrument is the player's own notification list and the captured
  // outbox, and both are proven able to move before "did not move" is believed.
  const id = "kg_quiet";
  await account(id, "NOT_STARTED");
  const bellOf = async (u: string) => (await db.notification.findByUser(u, 1000)).length;
  const mailOf = (u: string) => emailOutbox().filter((m) => m.to === emailOf(u)).length;

  const bell0 = await bellOf(id), mail0 = mailOf(id);
  const d = await doDeposit(id);
  await settle();
  ok("9.0 · control · the instruments see a confirmed deposit's receipt (bell AND email)",
    d.ok && (await bellOf(id)) > bell0 && mailOf(id) > mail0,
    `${why(d)} · bell ${bell0}→${await bellOf(id)} · mail ${mail0}→${mailOf(id)}`);

  const bell1 = await bellOf(id), mail1 = mailOf(id);
  const w = await doWithdraw(id);
  await settle();
  ok("9.1 · fixture · the withdrawal really was refused for identity", !w.ok && w.reason === "kyc_not_verified", why(w));
  ok("9.2 · ⛔ …and it put NOTHING in the player's notifications", (await bellOf(id)) === bell1, `${bell1}→${await bellOf(id)}`);
  ok("9.3 · ⛔ …and sent the player NO email", mailOf(id) === mail1, `${mail1}→${mailOf(id)}`);

  // Control on the refusal side: a withdrawal that DOES go through is visible to the same instrument.
  await account("kg_quiet_approved", "APPROVED");
  await doDeposit("kg_quiet_approved");
  await settle();
  const bell2 = await bellOf("kg_quiet_approved");
  const w2 = await doWithdraw("kg_quiet_approved");
  await settle();
  ok("9.4 · control · an accepted withdrawal IS visible to the same counter",
    w2.ok && (await bellOf("kg_quiet_approved")) > bell2, `${why(w2)} · bell ${bell2}→${await bellOf("kg_quiet_approved")}`);
}

// ── §10 · Up & Down is the same function, so the same record ────────────────
section("§10 · one stake path, one record, both products");
{
  // ⛔ SOURCE-READ, AND IT IS THE RIGHT INSTRUMENT HERE. §7 proved the record at `buyPosition`. The
  // claim is that Up & Down has no SECOND stake path that would carry no identity record — a statement
  // about which function the surface calls, and the honest way to check it is to read the call.
  const quickBet = readFileSync(new URL("../src/components/updown/use-quick-bet.ts", import.meta.url), "utf8");
  ok("10.1 · the Up & Down surface stakes through buyPositionAction",
    /buyPositionAction\(fd\)/.test(quickBet) && /from "@\/app\/markets\/actions"/.test(quickBet),
    "if Up & Down grows its own stake action, it needs its own record and this test must change");
  const updownService = readFileSync(new URL("../src/lib/server/updown-service.ts", import.meta.url), "utf8");
  ok("10.2 · …and updown-service never debits a wallet on its own",
    !/db\.wallet\.adjust|spendBonusLocked/.test(updownService),
    "an independent debit path in updown-service would be a stake with no identity record");
}

console.log(`\nkyc-gate: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
