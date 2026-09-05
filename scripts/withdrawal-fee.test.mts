/**
 * Withdrawal fee — and the DELETION of the 15% withholding tax.
 *
 *   Run: npx tsx scripts/withdrawal-fee.test.mts     (npm run test:withdrawal)
 *
 * ── THE BUG THIS KILLS ─────────────────────────────────────────────────────
 *
 * `wallet-service.ts` called `computeWithdrawalTax(amount, amount)` — withholding
 * a hardcoded 15% of EVERY withdrawal, treating the entire amount as taxable
 * winnings. Its own comment at the call site called itself "naïve".
 *
 * So a player could deposit 100,000, place NO BETS AT ALL, withdraw his own
 * untouched money, and receive 85,000. We took 15,000 of a man's own deposit and
 * booked it as tax on winnings he had never won.
 *
 * Ali's decision: taxes are only ever levied on OUR COMMISSION, never on a
 * player's money. A player pays exactly one thing on a withdrawal — the 1% fee —
 * of which half a percent is what the payment gateway charges us.
 *
 * ⚠️ LEGAL: the 15% cited the Income Tax Act. Removing it is a legal call, not an
 * engineering one. Ali has made it. It is flagged in the session summary.
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { withdraw } from "../src/lib/server/wallet-service.ts";
import { setGlobalConfig, getGlobalConfig } from "../src/lib/server/market-config.ts";
import { withdrawalEntries } from "../src/lib/server/ledger.ts";
import { computeWithdrawalFee, minWithdrawalForRate, PROVIDER_MIN_PAYOUT_TZS } from "../src/lib/payout.ts";
import { WITHDRAW_MIN_TZS } from "../src/lib/server/validators.ts";

import "./lib/verified-fixtures.mts";
let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

/**
 * The local digits of each fixture's REGISTERED number.
 *
 * E-215: a payout may only go to the number on the account, so a fixture that
 * withdraws to a literal it never registered is proving a refusal, not a fee.
 */
const localDigits = new Map<string, string>();

/** A player with a wallet AND an approved KYC (withdrawals are KYC-gated). */
async function kycdUser(id: string, balance: number): Promise<void> {
  // `7...`, NOT `96...`. RegisterSchema.phone is tzPhone ([67] + 8 digits), so `+25596...`
  // is a number no real account can hold - and withdraw() re-parses the submitted msisdn
  // through the same rule, so such a fixture could never withdraw at all.
  const local = `75${String(++seq).padStart(7, "0")}`;
  localDigits.set(id, local);
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
  // `id` is REQUIRED: the Prisma upsert keys its where-clause on it. Omitted,
  // this throws on a real database while the in-memory Map happily accepts it —
  // so the withdrawal-fee proof never ran against Postgres.
  await db.kyc.upsert({
    id: `kyc_${id}`,
    // ⛔ Same trap as money-e2e: this said `nidaNumber` alone, so after the contract
    // migration it seeded an APPROVED submission with no identity number.
    userId: id, status: "APPROVED", idType: "NIDA", idNumber: "12345678901234567890", idVerifiedAt: now(),
    // The column the WITHDRAW gate reads (2026-09-05). An APPROVED fixture without it is a
    // player who can bet and cannot be paid — a state the product never produces.
    approvedAt: now(),
    documents: [],
    createdAt: now(), updatedAt: now(),
  } as never);
}
const bal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;

// ════════════════════════════════════════════════════════════════════════════
// ★ THE HEADLINE CASE — deposit, never bet, withdraw. You get it all back
//   minus the withdrawal fee. Under the old code this man received 85,000.
//
// ⚠️ 2026-08-14: this section asserted a 1% fee. PRODUCTION HAS CHARGED 1.5% SINCE BEFORE
// 2026-08-10 — the live config said 1.5%, the code default said 1%, and this suite was
// green on the default for weeks. The test was the thing out of step with reality, not the
// platform. The rule is 1.5% (docs/RULES.md §2.7); 0.5 points of it is the gateway's share.
// ════════════════════════════════════════════════════════════════════════════
{
  await kycdUser("wd_neverbet", 100_000);

  const r = await withdraw("wd_neverbet", { amount: 100_000, provider: "MPESA", msisdn: localDigits.get("wd_neverbet")! });
  ok("★ withdrawal succeeded", r.ok, r.ok ? "" : (r as { error?: string }).error);

  if (r.ok) {
    ok("★ the fee is 1,500 — exactly 1.5% of 100,000", r.data.fee === 1_500, `fee=${r.data.fee}`);
    ok("★ HE RECEIVES 98,500 (the old code paid him 85,000 — a 15% 'tax' on his own deposit)",
       r.data.net === 98_500, `net=${r.data.net}`);
    ok("★ NO withholding tax was taken", r.data.fee === 1_500 && r.data.net === 100_000 - r.data.fee);
  }

  // The wallet is fully debited (the gross leaves; the fee is ours, the rest is his).
  ok("★ the wallet is debited the full 100,000", (await bal("wd_neverbet")) === 0, `balance=${await bal("wd_neverbet")}`);
}

// ── The fee is admin-tunable, and it is the ONLY thing the player is charged ──
{
  const saved = await getGlobalConfig();

  await setGlobalConfig({ withdrawalFeeRate: 0.02, withdrawalGatewayShareRate: 0.005 }, "officer_test");
  await kycdUser("wd_tuned", 50_000);
  const r = await withdraw("wd_tuned", { amount: 50_000, provider: "MPESA", msisdn: localDigits.get("wd_tuned")! });
  ok("the withdrawal fee is admin-tunable (2% → 1,000 on 50,000)", r.ok && r.data.fee === 1_000, r.ok ? `fee=${r.data.fee}` : "");
  ok("…and the player receives the rest", r.ok && r.data.net === 49_000, r.ok ? `net=${r.data.net}` : "");

  // The gateway's slice cannot exceed the fee — we would be paying the gateway more
  // than we charged the player and taking a loss on every withdrawal.
  const bad = await setGlobalConfig({ withdrawalFeeRate: 0.01, withdrawalGatewayShareRate: 0.03 }, "officer_test");
  ok("REFUSES a gateway share larger than the fee it comes out of", bad.ok === false);

  await setGlobalConfig({
    withdrawalFeeRate: saved.withdrawalFeeRate,
    withdrawalGatewayShareRate: saved.withdrawalGatewayShareRate,
  }, "officer_test");
}

// ── A zero fee is reachable (the knob covers the full range) ─────────────────
{
  const saved = await getGlobalConfig();
  await setGlobalConfig({ withdrawalFeeRate: 0, withdrawalGatewayShareRate: 0 }, "officer_test");

  await kycdUser("wd_free", 20_000);
  const r = await withdraw("wd_free", { amount: 20_000, provider: "MPESA", msisdn: localDigits.get("wd_free")! });
  ok("a 0% fee returns the whole amount", r.ok && r.data.fee === 0 && r.data.net === 20_000, r.ok ? `net=${r.data.net}` : "");

  await setGlobalConfig({
    withdrawalFeeRate: saved.withdrawalFeeRate,
    withdrawalGatewayShareRate: saved.withdrawalGatewayShareRate,
  }, "officer_test");
}

// ── The ledger split: gateway gets its share, we keep the rest, nobody taxes ──
{
  const entries = withdrawalEntries({
    txnId: "wd_led", userId: "wd_neverbet", grossAmount: 100_000,
    fee: 1_000, gatewayShare: 500, provider: "MPESA",
  });
  const sum = entries.reduce((s, e) => s + e.amount, 0);
  ok("ledger: the withdrawal group balances", Math.abs(sum) < 0.005, `sum=${sum}`);
  ok("ledger: the player is debited 100,000", entries.some(e => e.account === "PLAYER:wd_neverbet" && e.amount === -100_000));
  ok("ledger: 99,000 leaves for the provider", entries.some(e => e.account === "EXTERNAL:MPESA" && e.amount === 99_000));
  ok("ledger: the gateway is paid its 500", entries.some(e => e.account === "HOUSE:AGGREGATOR" && e.amount === 500));
  ok("ledger: we keep the other 500", entries.some(e => e.account === "HOUSE:COMMISSION" && e.amount === 500));
  ok("ledger: NOTHING is booked to HOUSE:TAX", !entries.some(e => e.account === "HOUSE:TAX"));
  ok("ledger: no WITHDRAWAL_TAX entry exists any more", !entries.some(e => e.entryType === "WITHDRAWAL_TAX"));
}

// ── The gateway floor is on the NET (Selcom resultcode 013, found live 2026-07-31) ──
//
// A real player asked for TZS 1,000 — our advertised minimum. The 1.5% fee took 15, we sent
// Selcom 985, and it refused: "Payment amount must be greater than or equal to TZS 1,000."
// So the smallest withdrawal 50pick offered was one it could never deliver. It stayed invisible
// for the platform's whole life because no payout had ever reached Selcom's business layer.
//
// The trap this guards is the TEMPTING fix: hardcode the minimum at 1,016. `withdrawalFeeRate`
// is admin-tunable, so that constant silently breaks the day someone raises the fee — and the
// symptom is a refused player, not a failing test. Hence: derive it, and prove it at rates the
// operator could actually set.
{
  const rates = [0, 0.005, 0.01, 0.015, 0.02, 0.03, 0.05, 0.1];
  for (const rate of rates) {
    const minGross = minWithdrawalForRate(rate);
    const net = minGross - computeWithdrawalFee(minGross, rate);
    ok(`net clears the gateway floor at rate ${(rate * 100).toFixed(1)}%`,
      net >= PROVIDER_MIN_PAYOUT_TZS, `gross=${minGross} net=${net}`);
    // One shilling below must NOT clear it — otherwise the helper is just padding and would
    // drift from the real boundary the next time anyone touches the rounding.
    const below = minGross - 1;
    const belowNet = below - computeWithdrawalFee(below, rate);
    ok(`one shilling below the derived minimum does NOT clear it at ${(rate * 100).toFixed(1)}%`,
      rate === 0 ? belowNet < PROVIDER_MIN_PAYOUT_TZS : belowNet <= PROVIDER_MIN_PAYOUT_TZS,
      `gross=${below} net=${belowNet}`);
  }

  // The regression itself, stated as a fact: the shipped gross minimum is NOT safe on its own
  // at the rate production actually runs. If this ever passes, someone has re-introduced the bug
  // by raising WITHDRAW_MIN_TZS instead of deriving it.
  const liveRate = 0.015;
  const naiveNet = WITHDRAW_MIN_TZS - computeWithdrawalFee(WITHDRAW_MIN_TZS, liveRate);
  ok("WITHDRAW_MIN_TZS alone is NOT enough at the live 1.5% fee (this is the bug)",
    naiveNet < PROVIDER_MIN_PAYOUT_TZS, `net=${naiveNet}`);
  ok("the derived minimum is strictly larger than the raw gross minimum at 1.5%",
    minWithdrawalForRate(liveRate) > WITHDRAW_MIN_TZS);

  // A fee at or above 100% has no solution; it must clamp rather than divide by ~0 and hand
  // back Infinity, which would render as a NaN minimum on the withdraw form.
  ok("an absurd fee rate clamps instead of returning Infinity",
    Number.isFinite(minWithdrawalForRate(1)) && Number.isFinite(minWithdrawalForRate(5)));
  ok("a negative fee rate is treated as zero",
    minWithdrawalForRate(-1) === PROVIDER_MIN_PAYOUT_TZS);
}

console.log(`\nwithdrawal-fee: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
