/**
 * THE IDENTITY GATE ON THE MONEY PATH — driven, not asserted.
 *
 * Owner ruling, Ali, 2026-09-05: a player may not DEPOSIT, BET or WITHDRAW until we have
 * approved their identity. Rationale, and why withdrawal asks a different question from
 * the other two, in `src/lib/server/kyc-gate.ts`.
 *
 * ⛔ WHAT THIS FILE REFUSES TO DO IS ASSERT THE REGISTRY. `REASONS.kyc_rejected` existing
 * proves nothing about what a player is told; `assertKycForMoney` returning `false` proves
 * nothing about whether `deposit()` calls it. Every section below goes through the REAL
 * money function and reads the REAL refusal.
 *
 * ⛔ AND EVERY REFUSAL IS PAIRED WITH AN ACCEPTANCE ON THE SAME PATH. A suite that only
 * proves "unverified is refused" is satisfied by a `deposit()` that refuses everybody, and
 * by a `buyPosition()` that is simply broken. `docs/MODULE-CERTIFICATION-PROGRAM.md`'s
 * meta-rule: a negative assertion needs a positive control beside it or it can pass
 * vacuously.
 *
 * SECTIONS
 *   §1  every refusing state, every money action, with its own reason
 *   §2  the positive controls — an APPROVED player does all three
 *   §3  🔴 RE-VERIFICATION: deposit and bet lock, WITHDRAWAL STAYS OPEN
 *   §4  `approvedAt` survives the paths that would quietly clear it
 *   §5  a missing KYC row is NOT_STARTED, not "fine"
 *   §6  the Up & Down surface is the same gate, not a second one
 */
import { db } from "../src/lib/server/store.ts";
import { deposit, withdraw } from "../src/lib/server/wallet-service.ts";
import { createMarket, buyPosition } from "../src/lib/server/market-service.ts";
import { assertKycForMoney } from "../src/lib/server/kyc-gate.ts";
import { startKyc, reviewKyc, forceReverifyKyc } from "../src/lib/server/kyc-service.ts";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n${s}`);

const now = () => new Date().toISOString();
let seq = 0;

type KycState = "NOT_STARTED" | "IN_PROGRESS" | "PENDING_REVIEW" | "ADDITIONAL_INFO_REQUIRED" | "REJECTED" | "APPROVED";

/**
 * A player with a balance, a confirmed address, and a chosen identity state.
 *
 * ⛔ `verified: true` ON EVERY FIXTURE, DELIBERATELY. The email door sits below the
 * identity door on the deposit path; leaving it shut would let an email refusal masquerade
 * as an identity one and every §1 deposit assertion would pass for the wrong reason.
 * ⛔ `NOT_STARTED` writes NO ROW — that is what a real new account looks like, and §5
 * exists because "no row" is the state a naive gate treats as fine.
 */
/**
 * ⚠️ THE REGISTERED NUMBER IS REMEMBERED, AND THE FIRST DRAFT DID NOT DO THAT.
 * `withdraw()` refuses any destination that is not the account's own registered handset
 * (Board comment #8 / E-215), and that check runs BEFORE the identity gate. A hard-coded
 * `712345678` therefore came back `payout_destination_not_registered` for every fixture —
 * including the APPROVED positive control — so §1's withdrawal assertions were all failing
 * on a door this suite is not about, and §2.3 was reporting a working payout as broken.
 * ⛔ A refusal from the wrong door is indistinguishable from the right one unless the test
 * reads the `reason`. This one did, which is the only reason it was visible at all.
 */
const phoneOf = new Map<string, string>();

async function player(id: string, kyc: KycState, balance = 500_000): Promise<void> {
  const phone = `+25577${String(++seq).padStart(7, "0")}`;
  phoneOf.set(id, phone.slice(4)); // the 9-digit local part the payout form submits
  await db.user.create({
    id, phoneE164: phone,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: kyc === "APPROVED" ? "ACTIVE" : "PENDING_KYC", locale: "EN",
    displayName: "Gate Tester", dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: `${id}@t.tz`, emailVerifiedAt: now(),
    createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as never);
  if (kyc === "NOT_STARTED") return;
  await db.kyc.upsert({
    id: `kyc_${id}`, userId: id, status: kyc, rejectReason: null, rejectNote: null,
    idType: "NIDA", idNumber: `199001011${String(seq).padStart(11, "0")}`, idExpiry: null,
    idVerifiedAt: now(), fullName: "Gate Tester", dob: "1990-01-01", documents: [],
    reviewerId: null, reviewedAt: now(), submittedAt: now(),
    approvedAt: kyc === "APPROVED" ? now() : null,
    createdAt: now(), updatedAt: now(),
  });
}

const market = await createMarket({
  titleEn: "Identity gate market", titleSw: "Soko la kitambulisho", category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
} as never);

const doDeposit = (id: string) => deposit(id, { provider: "MPESA", amount: 5_000, msisdn: "712345678" });
const doBet = (id: string) => buyPosition(id, { marketId: market.id, side: "YES", stake: 5_000 });
const doWithdraw = (id: string) => withdraw(id, { provider: "MPESA", amount: 20_000, msisdn: phoneOf.get(id)! } as never);
const reasonOf = (r: unknown) => (r as { reason?: string }).reason;

// ── §1 · every refusing state, every money action ───────────────────────────
section("§1 · an unverified account moves no money, in any direction");
{
  const CASES: { kyc: KycState; reason: string }[] = [
    { kyc: "NOT_STARTED",              reason: "kyc_not_verified" },
    { kyc: "IN_PROGRESS",              reason: "kyc_not_verified" },
    { kyc: "PENDING_REVIEW",           reason: "kyc_pending_review" },
    { kyc: "ADDITIONAL_INFO_REQUIRED", reason: "kyc_more_info" },
    { kyc: "REJECTED",                 reason: "kyc_rejected" },
  ];
  for (const c of CASES) {
    const id = `kg_${c.kyc.toLowerCase()}`;
    await player(id, c.kyc);

    const d = await doDeposit(id);
    ok(`1.${c.kyc}.deposit · refused`, !d.ok);
    ok(`1.${c.kyc}.deposit · …with reason "${c.reason}"`, reasonOf(d) === c.reason, String(reasonOf(d)));

    const b = await doBet(id);
    ok(`1.${c.kyc}.bet · refused`, !b.ok);
    ok(`1.${c.kyc}.bet · …with reason "${c.reason}"`, reasonOf(b) === c.reason, String(reasonOf(b)));

    // ⛔ THE BALANCE IS 500,000 AND THE WITHDRAWAL IS 20,000, so a refusal here can only
    // be the identity gate — never "insufficient funds" wearing its clothes.
    const w = await doWithdraw(id);
    ok(`1.${c.kyc}.withdraw · refused`, !w.ok);
    ok(`1.${c.kyc}.withdraw · …with reason "${c.reason}"`, reasonOf(w) === c.reason, String(reasonOf(w)));

    // Nothing may have moved, in either direction.
    ok(`1.${c.kyc} · balance untouched`, (await db.wallet.findByUserId(id))!.balance === 500_000);
  }
}

// ── §2 · THE POSITIVE CONTROLS ──────────────────────────────────────────────
section("§2 · ★ an APPROVED player does all three — the gate is not a blanket refusal");
{
  await player("kg_approved", "APPROVED");
  const d = await doDeposit("kg_approved");
  ok("2.1 · ★ APPROVED deposits", d.ok, d.ok ? "" : String((d as { error: string }).error));
  const b = await doBet("kg_approved");
  ok("2.2 · ★ APPROVED bets", b.ok, b.ok ? "" : String((b as { error: string }).error));
  const w = await doWithdraw("kg_approved");
  ok("2.3 · ★ APPROVED withdraws", w.ok, w.ok ? "" : String((w as { error: string }).error));
}

// ── §3 · RE-VERIFICATION — THE ONE ASYMMETRY, AND THE POINT OF THE COLUMN ────
section("§3 · 🔴 a re-verifying player is stopped from NEW exposure and never from their own money");
{
  // 🔴 THIS IS THE SECTION THE WHOLE `approvedAt` DESIGN EXISTS FOR. `forceReverifyKyc`
  // moves an APPROVED player to ADDITIONAL_INFO_REQUIRED, and that player HOLDS REAL MONEY
  // earned under an identity we accepted. Gate the payout on CURRENT status and it freezes
  // — the harm docs/BOARD-DISCLOSURE-B-E.md §6 recorded when it noted that force-reverify
  // had stopped being a money control. Deposit and bet still lock, because those add NEW
  // exposure and we are entitled to stop that the moment a doubt appears.
  await player("kg_reverify", "APPROVED");
  await db.user.create({
    id: "kg_officer", phoneE164: "+255770000999", passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "COMPLIANCE", status: "ACTIVE", locale: "EN",
    displayName: "Officer", dob: null, region: null, acceptedTermsVersion: null,
    acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);

  const rv = await forceReverifyKyc("kg_officer", "kg_reverify", "Document expired — please resubmit.");
  ok("3.0 · fixture · the officer really forced a re-verification", rv.ok, rv.ok ? "" : String((rv as { error: string }).error));
  const row = await db.kyc.findByUserId("kg_reverify");
  ok("3.1 · status moved off APPROVED", row?.status === "ADDITIONAL_INFO_REQUIRED", String(row?.status));
  ok("3.2 · ⛔ …but the first-approval stamp SURVIVED", !!row?.approvedAt,
    "cleared here, and the player is locked out of money they already earned");

  const d = await doDeposit("kg_reverify");
  ok("3.3 · deposit is LOCKED while re-verifying", !d.ok && reasonOf(d) === "kyc_more_info", String(reasonOf(d)));
  const b = await doBet("kg_reverify");
  ok("3.4 · betting is LOCKED while re-verifying", !b.ok && reasonOf(b) === "kyc_more_info", String(reasonOf(b)));
  const w = await doWithdraw("kg_reverify");
  ok("3.5 · ★★ WITHDRAWAL STILL WORKS — money already earned is never trapped", w.ok,
    w.ok ? "" : `TRAPPED: ${String((w as { error: string }).error)}`);

  // And the seam agrees with the services, asked directly.
  ok("3.6 · the seam says the same thing",
    (await assertKycForMoney("kg_reverify", "WITHDRAW")).eligible === true
    && (await assertKycForMoney("kg_reverify", "DEPOSIT")).eligible === false
    && (await assertKycForMoney("kg_reverify", "BET")).eligible === false);
}

// ── §4 · `approvedAt` survives the paths that would quietly clear it ────────
section("§4 · the stamp is written once and never cleared");
{
  // 4a — the REJECT-then-RESTART path. APPROVED → force-reverify → REJECTED → the player
  // taps "start again". `startKyc` is the ONE upsert in the codebase that rebuilds a
  // submission from scratch instead of spreading `...k`; if it drops the column here, a
  // player who was verified, re-checked, turned down and re-applied can no longer reach
  // their own balance — and no suite would go red.
  await player("kg_restart", "APPROVED");
  await db.user.update("kg_restart", { status: "ACTIVE" });
  const before = (await db.kyc.findByUserId("kg_restart"))!.approvedAt;
  ok("4.0 · fixture · the stamp was set to begin with", !!before);

  await forceReverifyKyc("kg_officer", "kg_restart", "Please resubmit your document.");
  await reviewKyc({ officerId: "kg_officer", userId: "kg_restart", decision: "REJECT", reason: "Illegible document." } as never);
  ok("4.1 · fixture · the submission really is REJECTED",
    (await db.kyc.findByUserId("kg_restart"))?.status === "REJECTED",
    String((await db.kyc.findByUserId("kg_restart"))?.status));

  await startKyc("kg_restart");
  const after = await db.kyc.findByUserId("kg_restart");
  ok("4.2 · ⛔ restart RESET the submission", after?.status === "IN_PROGRESS" && !after?.idNumber);
  ok("4.3 · ★ …and the first-approval stamp came through the reset intact", !!after?.approvedAt, String(after?.approvedAt));
  ok("4.4 · …so the player can still be paid", (await assertKycForMoney("kg_restart", "WITHDRAW")).eligible === true);

  // 4b — re-approval must not RE-STAMP. The column records the FIRST time we were
  // satisfied; overwriting it on every approval makes it a duplicate of `reviewedAt` and
  // loses the fact that this player had been trusted before.
  //
  // 🔴 THE FIRST DRAFT OF THIS CHECK PROVED NOTHING, AND `red:kyc-gate` IS WHAT SAID SO.
  // It called `reviewKyc(APPROVE)` on a submission `startKyc` had just reset to
  // IN_PROGRESS — a state `reviewKyc` refuses — and swallowed the refusal in a `.catch()`.
  // So no approval ever happened, `approvedAt` was trivially unchanged, and the assertion
  // passed against a mutation that re-stamps on EVERY approval. A test that never reaches
  // the code it names is the quietest kind of green.
  // ⛔ The submission is therefore moved to PENDING_REVIEW first, and the approval's own
  // return value is asserted before the stamp is read.
  const k2 = (await db.kyc.findByUserId("kg_restart"))!;
  await db.kyc.upsert({ ...k2, status: "PENDING_REVIEW", submittedAt: now(), updatedAt: now() });
  const reapproval = await reviewKyc({ officerId: "kg_officer", userId: "kg_restart", decision: "APPROVE" } as never);
  ok("4.4b · fixture · the re-approval actually happened", reapproval.ok,
    reapproval.ok ? "" : String((reapproval as { error: string }).error));
  const reapproved = await db.kyc.findByUserId("kg_restart");
  ok("4.4c · fixture · …and the account really is APPROVED again", reapproved?.status === "APPROVED", String(reapproved?.status));
  ok("4.5 · ★ re-approval did NOT move the first-approval date",
    reapproved?.approvedAt === before, `${String(before)} → ${String(reapproved?.approvedAt)}`);
}

// ── §5 · a missing row is NOT_STARTED, not "fine" ───────────────────────────
section("§5 · the state a brand-new account is actually in");
{
  // A player who has never opened /profile/kyc has NO KycSubmission at all. A gate that
  // reads `row?.status === "APPROVED"` refuses correctly; one that reads
  // `row && row.status !== "APPROVED"` lets exactly the population it exists to stop
  // straight through. There is no row here — that is the whole fixture.
  await player("kg_norow", "NOT_STARTED");
  ok("5.0 · fixture · there really is no KYC row", (await db.kyc.findByUserId("kg_norow")) === null);
  const e = await assertKycForMoney("kg_norow", "DEPOSIT");
  ok("5.1 · ★ no row → refused", e.eligible === false);
  ok("5.2 · …reported as NOT_STARTED, not as an empty string or undefined",
    e.eligible === false && e.kycStatus === "NOT_STARTED", e.eligible === false ? e.kycStatus : "eligible");
}

// ── §6 · Up & Down is the same gate, not a second one ───────────────────────
section("§6 · one gate covers both products");
{
  // ⛔ SOURCE-READ, AND IT IS THE RIGHT INSTRUMENT HERE. The claim is not "an Up & Down bet
  // is refused" — §1 already proved the refusal at `buyPosition`, which is where every
  // stake on the platform lands. The claim is that Up & Down has no SECOND path that could
  // bypass it. That is a statement about which function the surface calls, and the honest
  // way to check it is to read the call.
  const quickBet = readFileSync(new URL("../src/components/updown/use-quick-bet.ts", import.meta.url), "utf8");
  ok("6.1 · the Up & Down surface stakes through buyPositionAction",
    /buyPositionAction\(fd\)/.test(quickBet) && /from "@\/app\/markets\/actions"/.test(quickBet),
    "if Up & Down grows its own stake action, it needs its own gate and this test must change");
  const updownService = readFileSync(new URL("../src/lib/server/updown-service.ts", import.meta.url), "utf8");
  ok("6.2 · …and updown-service never debits a wallet on its own",
    !/db\.wallet\.adjust|spendBonusLocked/.test(updownService),
    "an independent debit path in updown-service would be a stake the identity gate never sees");
}

console.log(`\nkyc-gate: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
