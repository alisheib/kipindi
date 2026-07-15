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

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

/** A player with a wallet AND an approved KYC (withdrawals are KYC-gated). */
async function kycdUser(id: string, balance: number): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25596${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
  await db.kyc.upsert({
    userId: id, status: "APPROVED", nidaNumber: "12345678901234567890",
    createdAt: now(), updatedAt: now(),
  } as never);
}
const bal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;

// ════════════════════════════════════════════════════════════════════════════
// ★ THE HEADLINE CASE — deposit, never bet, withdraw. You get it all back
//   minus the 1%. Under the old code this man received 85,000.
// ════════════════════════════════════════════════════════════════════════════
{
  await kycdUser("wd_neverbet", 100_000);

  const r = await withdraw("wd_neverbet", { amount: 100_000, provider: "MPESA", msisdn: "+255700000001" });
  ok("★ withdrawal succeeded", r.ok, r.ok ? "" : (r as { error?: string }).error);

  if (r.ok) {
    ok("★ the fee is 1,000 — exactly 1% of 100,000", r.data.fee === 1_000, `fee=${r.data.fee}`);
    ok("★ HE RECEIVES 99,000 (the old code paid him 85,000 — a 15% 'tax' on his own deposit)",
       r.data.net === 99_000, `net=${r.data.net}`);
    ok("★ NO withholding tax was taken", r.data.fee === 1_000 && r.data.net === 100_000 - r.data.fee);
  }

  // The wallet is fully debited (the gross leaves; the fee is ours, the rest is his).
  ok("★ the wallet is debited the full 100,000", (await bal("wd_neverbet")) === 0, `balance=${await bal("wd_neverbet")}`);
}

// ── The fee is admin-tunable, and it is the ONLY thing the player is charged ──
{
  const saved = await getGlobalConfig();

  await setGlobalConfig({ withdrawalFeeRate: 0.02, withdrawalGatewayShareRate: 0.005 }, "officer_test");
  await kycdUser("wd_tuned", 50_000);
  const r = await withdraw("wd_tuned", { amount: 50_000, provider: "MPESA", msisdn: "+255700000002" });
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
  const r = await withdraw("wd_free", { amount: 20_000, provider: "MPESA", msisdn: "+255700000003" });
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

console.log(`\nwithdrawal-fee: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
