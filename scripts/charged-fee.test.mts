/**
 * test:charged-fee — the fee a READER reports is the fee settlement actually debited (landing v3 C1, §9).
 *
 * 🔴 THE DEFECT. Four readers — the finance per-poll fee view (`analytics.ts`), the landing's settled strip
 * (`platform-stats.ts`), the house book's per-game recompute (`admin/house/[marketId]`) and the officer's market
 * page (`admin/markets/[id]`) — priced a settled market's fee with `poolFee(yes, no, rates, resolvedOutcome)`.
 * `settleMarket` never charges that fee on two shapes of pool: ONE SIDE ONLY (every stake refunded at zero fee,
 * whatever the verdict) and VOID. Under loser-share a YES-only pool resolved NO has a "losing pool" of YES money,
 * so `poolFee` returns 13% of it — revenue nobody was charged, counted in a finance report. The player's
 * resolution panel printed the same phantom (E-419; fixed on the panel in C1-A).
 *
 * ⭐ THE GUARD DRIVES THE REAL SETTLEMENT. For every branch settlement has — two-sided YES win, two-sided NO win,
 * one-sided resolved FOR its money, one-sided resolved AGAINST it, VOID — under both fee models, it builds the
 * market through the real services (in memory), settles it, measures what the house RETAINED (Σ stakes −
 * Σ amounts paid back), and pins `chargedFee` equal to it. The fixtures are sized so every fee is a whole
 * shilling, so the comparison is exact: no tolerance.
 *
 * ⛔ PLANTED-WRONG CONTROL: the pre-C1 reader (`poolFee(…, winner)`) is run over the same settled markets and must
 * DISAGREE with settlement on the one-sided-against branch (and on a capped VOID) — so this guard is shown able
 * to tell the right reader from the wrong one, not merely to agree with whatever it is handed.
 *
 * Run: npm run test:charged-fee
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { chargedFee, poolFee, type FeeRates } from "../src/lib/payout.ts";
import { createMarket, buyPosition, resolveMarket, settleMarket, listPositionsForMarket, getMarket, ratesFor } from "../src/lib/server/market-service.ts";
import { setGlobalConfig } from "../src/lib/server/market-config.ts";

import "./lib/verified-fixtures.mts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (cond) pass++; else fail++;
}

const now = () => new Date().toISOString();
let seq = 0;
async function fundedUser(id: string, balance = 1_000_000): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25597${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}

type Outcome = "YES" | "NO" | "VOID";
type Case = { name: string; yes: number[]; no: number[]; outcome: Outcome };

/** Build, bet, resolve, settle — through the real services — and read what settlement kept. */
async function settle(tag: string, c: Case) {
  const m = await createMarket({
    titleEn: `charged-fee ${tag} ${c.name}`, titleSw: "Soko la ada", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
  let n = 0;
  for (const [side, stakes] of [["YES", c.yes], ["NO", c.no]] as const) {
    for (const stake of stakes) {
      const uid = `cf_${tag}_${c.name.replace(/\W+/g, "")}_${side}_${n++}`;
      await fundedUser(uid);
      const r = await buyPosition(uid, { marketId: m.id, side, stake });
      if (!r.ok) throw new Error(`bet refused on ${c.name}: ${JSON.stringify(r).slice(0, 200)}`);
    }
  }
  const first = await resolveMarket({ marketId: m.id, outcome: c.outcome, officerId: "cf_officer_a" });
  if (first.ok && first.data.stage === "stage1") await resolveMarket({ marketId: m.id, outcome: c.outcome, officerId: "cf_officer_b" });
  const s = await settleMarket(m.id, { force: true });
  if (!s.ok) throw new Error(`settle refused on ${c.name}: ${JSON.stringify(s).slice(0, 200)}`);
  const settled = await getMarket(m.id);
  const positions = await listPositionsForMarket(m.id);
  const staked = positions.reduce((a, p) => a + p.stake, 0);
  const paidBack = positions.reduce((a, p) => a + (p.finalPayout ?? 0), 0);
  return { m: settled!, retained: staked - paidBack, staked, allSettled: positions.every((p) => !!p.settledAt) };
}

const CASES: Case[] = [
  { name: "two-sided YES wins", yes: [5_000, 5_000], no: [5_000, 5_000], outcome: "YES" },
  { name: "two-sided NO wins", yes: [4_000, 6_000], no: [10_000], outcome: "NO" },
  { name: "one-sided resolved FOR its money", yes: [5_000, 5_000], no: [], outcome: "YES" },
  { name: "one-sided resolved AGAINST its money", yes: [5_000, 5_000], no: [], outcome: "NO" },
  { name: "one-sided NO-only resolved YES", yes: [], no: [10_000], outcome: "YES" },
  { name: "void, two-sided", yes: [5_000, 5_000], no: [5_000], outcome: "VOID" },
];

const naive = (m: { yesPool: number; noPool: number; resolvedOutcome: Outcome }, r: Partial<FeeRates>) =>
  poolFee(m.yesPool, m.noPool, r, m.resolvedOutcome === "VOID" ? undefined : m.resolvedOutcome).fee;

const MODELS: Array<[string, Record<string, unknown>]> = [
  ["loser-share", { feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, maxStake: 1_000_000 }],
  ["capped", { feeModel: "capped-commission", commissionRate: 0.10, feeCeilingRate: 1 / 3, maxStake: 1_000_000 }],
];

const disagreements: string[] = [];
for (const [tag, cfg] of MODELS) {
  console.log(`\n── ${tag}`);
  const set = await setGlobalConfig(cfg as never, "charged-fee-test");
  ok(`${tag} · the fee model was set for the markets below (precondition)`, set.ok, JSON.stringify(set).slice(0, 160));
  for (const c of CASES) {
    const { m, retained, staked, allSettled } = await settle(tag, c);
    const rates = ratesFor(m);
    const outcome = m.resolvedOutcome as Outcome;
    const charged = chargedFee({ yesPool: m.yesPool, noPool: m.noPool, resolvedOutcome: outcome }, rates);
    ok(`${tag} · ${c.name} · settlement ran on every position (precondition, staked ${staked})`, allSettled && m.settledAt != null);
    ok(`${tag} · ${c.name} · chargedFee === what settlement retained (${retained})`, charged.fee === retained,
      `chargedFee ${charged.fee} · retained ${retained}`);
    ok(`${tag} · ${c.name} · netPool === what settlement paid back (${staked - retained})`, charged.netPool === staked - retained,
      `netPool ${charged.netPool}`);
    const refundBranch = outcome === "VOID" || m.yesPool === 0 || m.noPool === 0;
    ok(`${tag} · ${c.name} · 'refunded' names settlement's branch (${refundBranch ? "refund" : "pari-mutuel"})`, charged.refunded === refundBranch);
    const n = naive({ yesPool: m.yesPool, noPool: m.noPool, resolvedOutcome: outcome }, rates);
    if (n !== retained) disagreements.push(`${tag} · ${c.name}: poolFee ${n} vs settlement ${retained}`);
  }
}

// ⭐ THE PLANTED-WRONG CONTROL — the pre-C1 reader, run over the same settled markets, MUST be caught.
console.log("\n── control: the pre-C1 reader (`poolFee(…, winner)`) against the same settlements");
disagreements.forEach((d) => console.log(`     ${d}`));
ok("control · the old reader DISAGREES with settlement on a one-sided pool resolved against its money (the phantom fee)",
  disagreements.some((d) => d.startsWith("loser-share · one-sided resolved AGAINST")));
ok("control · …and on a capped-commission VOID (a fee for a market that charged none)",
  disagreements.some((d) => d.startsWith("capped · void")));
ok("control · …and AGREES on every two-sided win (the guard is not merely rejecting poolFee)",
  !disagreements.some((d) => /two-sided (?:YES|NO) wins/.test(d)));

console.log(`\ncharged-fee: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
