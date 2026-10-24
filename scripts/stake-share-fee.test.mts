/**
 * test:stake-share-fee — THE NEW LAW'S ARITHMETIC, TO THE SHILLING (programme FEE-TAX-2026-10, release R2, lane a).
 *
 *   npx tsx scripts/stake-share-fee.test.mts                (npm run test:stake-share-fee)
 *   npx tsx scripts/stake-share-fee.test.mts --prove-red    (npm run red:stake-share-fee)
 *
 * Ali's rulings of 2026-10-24 (docs/COMPLIANCE-DECISIONS.md § "2026-10-24 · The fee becomes 13% of every stake …"): a fee
 * of 13% on EVERY stake, rounded half up per side; the losing side's net stakes are the prize fund; 15% of it is withheld as
 * winnings tax; every per-position part is a largest-remainder share, ties by id; Σ payouts + tax + fee = pool, exactly.
 * DECIDED, NOT IN FORCE: `fee-law-gate.ts` keeps every door shut until R5 — this suite proves the ARITHMETIC (`payout.ts`),
 * which prices a stake-share snapshot whatever the gate says (§17): the gate decides what a NEW market may freeze.
 *
 *   §1  ★ the document's worked example, every figure (FEE-TAX-PLAN §3)
 *   §2  ★ 100,000 against 10,000 pays 94,395 — below the stake, by ruling, and never below the net stake
 *   §3  odd stakes and ties — exact, deterministic, ties by id
 *   §4  3,000 generated markets — conservation, the net-stake floor, every part sums, projection within 2 shillings
 *   §5  `stakeShareTotals` = the split's totals
 *   §6  `chargedFee` = the split (fee = F only; staked − paid back = fee + winningsTax); refunds unchanged
 *   §7  ★ the one-sided mirror — a projection onto an empty other side is the stake, never 87%
 *   §8  `readRates` refuses an incomplete stake-share rate set; terms reads; other models ignore a tax
 *   §9  `snapshotOrLegacy` passes stake-share through as frozen — and leaves every legacy snapshot byte-identical
 *   §10 the caption and the figures, from the resolved rates
 *   §11 `leanFor`'s `below`
 *   §12 `worstCaseWinnerRatio` → 1 − f from above, never throws; the break-even lean
 *   §13 the split refuses every input it cannot settle exactly (E-200)
 *   §14 `poolFee`'s contract: fee = F only, the tax beside it
 *   §15 round half up, in integers
 *   §16 no mix: the older models' figures, pinned
 *   §17 the arithmetic does not read the gate
 *
 * ⚠️ Every call that could throw goes through `attempt`, so a defect fails ITS OWN line with its own label — which is what
 * `--prove-red` checks for each plant (`scripts/anchors/stake-share-fee.anchors.mjs`), never a loader error.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS } from "./anchors/stake-share-fee.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// ── --prove-red: each plant must turn ITS OWN assertion red ──────────────────────────────────────────────────────────
if (process.argv.includes("--prove-red")) {
  const run = () => spawnSync(process.execPath, ["--import", "tsx", "scripts/stake-share-fee.test.mts"],
    { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
  const control = run();
  if (control.status !== 0) {
    console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red; a red below would prove nothing.\n" + control.stdout + control.stderr);
    process.exit(1);
  }
  console.log("  ✓ CONTROL  the unmutated tree is GREEN");
  let missed = 0;
  for (const plant of MUTATIONS) {
    const target = resolve(ROOT, plant.file);
    const before = readFileSync(target, "utf8");
    try {
      writeFileSync(target, injectDefect(before, plant.from, plant.to));
      const r = run();
      const out = `${r.stdout}\n${r.stderr}`;
      const caught = r.status !== 0 && plant.failure.test(out);
      console.log(`  ${caught ? "✓ CAUGHT" : "✗ MISSED"}  ${plant.name}${caught ? "" : ` — status ${r.status}, expected ${plant.failure}`}`);
      if (!caught) missed++;
    } finally {
      writeFileSync(target, before);
    }
  }
  const after = run();
  if (after.status !== 0) { console.error("✗ POSITIVE CONTROL FAILED AFTER RESTORE — the tree did not come back clean."); process.exit(1); }
  console.log(`\nred:stake-share-fee — ${MUTATIONS.length - missed}/${MUTATIONS.length} plants caught`);
  process.exit(missed === 0 ? 0 : 1);
}

const P = await import("../src/lib/payout.ts");
const { snapshotOrLegacy, hasOwnSnapshot } = await import("../src/lib/server/market-config.ts");
const { FEE_LAW_LIVE } = await import("../src/lib/fee-law-gate.ts");
type Side = "YES" | "NO";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const section = (s: string) => console.log(`\n── ${s}`);
/** Run `fn`; a throw comes back as the Error, so the assertion that needed the value fails on its own line. */
function attempt<T>(fn: () => T): T | Error {
  try { return fn(); } catch (e) { return e instanceof Error ? e : new Error(String(e)); }
}
const isErr = (v: unknown): v is Error => v instanceof Error;
const msg = (v: unknown) => (isErr(v) ? `threw: ${v.message}` : JSON.stringify(v));
/** Canonical JSON: keys sorted at every depth — a value compared by VALUE, not by key order. */
const canon = (v: unknown): string =>
  v && typeof v === "object" && !Array.isArray(v)
    ? `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}`
    : Array.isArray(v) ? `[${v.map(canon).join(",")}]` : JSON.stringify(v ?? null);

/** The law as decided: 3% + 10% of every stake, 15% winnings tax. Written out, never imported from a default. */
const SS = { feeModel: "stake-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, winningsTaxRate: 0.15, commissionRate: 0.10, feeCeilingRate: 1 / 3 };
/** An Up & Down profile: the model and its fee, no tax (a round takes the platform's when it is stamped). */
const PROFILE = { feeModel: "stake-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, feeCeilingRate: 1 / 3 };
const LS = { feeModel: "loser-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, commissionRate: 0.10, feeCeilingRate: 1 / 3 };
const CAP = { feeModel: "capped-commission" as const, commissionRate: 0.13, feeCeilingRate: 1 / 3 };
const pos = (id: string, stake: number) => ({ id, stake });
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

type Split = ReturnType<typeof P.stakeShareSplit>;
const winner = (s: Split | Error, id: string) => (isErr(s) ? undefined : s.perWinner.get(id));

// ═══ §1 · THE DOCUMENT'S WORKED EXAMPLE ═══════════════════════════════════════════════════════════════════════════════
section("§1 · the document's worked example — YES 1,000 / 3,000 / 5,000 against NO 10,000 / 20,000 / 5,000, YES wins");
const DOC_W = [pos("y1", 1_000), pos("y2", 3_000), pos("y3", 5_000)];
const DOC_L = [pos("n1", 10_000), pos("n2", 20_000), pos("n3", 5_000)];
const doc = attempt(() => P.stakeShareSplit({ yesPool: 9_000, noPool: 35_000, outcome: "YES", winners: DOC_W, losers: DOC_L }, SS));
{
  const d = isErr(doc) ? null : doc;
  ok("1.1 · ★ the fee F is 5,720 — 1,170 on the YES stakes + 4,550 on the NO stakes", d?.fee === 5_720 && d?.feeYes === 1_170 && d?.feeNo === 4_550, msg(d ?? doc));
  ok("1.2 · ★ the prize fund P is 30,450 — the losers' net stakes", d?.prizeFund === 30_450, String(d?.prizeFund));
  ok("1.3 · ★ the winnings tax T is 4,568 — 15% of 30,450 = 4,567.5, rounded half UP", d?.winningsTax === 4_568, String(d?.winningsTax));
  ok("1.4 · the winners share 33,712 — pool − F − T", d?.netPool === 33_712, String(d?.netPool));
  const pay = DOC_W.map((w) => winner(doc, w.id)?.payout);
  ok("1.5 · ★ the payouts are 3,746 / 11,237 / 18,729 (the document's own table said 3,717 / 11,151 / 18,844)", canon(pay) === canon([3_746, 11_237, 18_729]), canon(pay));
  const tax = DOC_W.map((w) => winner(doc, w.id)?.tax);
  ok("1.6 · ★ the tax each winner bears is 507 / 1,523 / 2,538", canon(tax) === canon([507, 1_523, 2_538]), canon(tax));
  const parts = DOC_W.map((w) => { const x = winner(doc, w.id); return x ? [x.fee, x.net, x.prize] : null; });
  ok("1.7 · each winner's fee, net stake and prize: 130·870·2,876 / 390·2,610·8,627 / 650·4,350·14,379", canon(parts) === canon([[130, 870, 2_876], [390, 2_610, 8_627], [650, 4_350, 14_379]]), canon(parts));
  const lf = DOC_L.map((l) => (isErr(doc) ? undefined : doc.perLoser.get(l.id)?.fee));
  ok("1.8 · each loser's fee is 1,300 / 2,600 / 650 — the NO side's 4,550, by stake; a loser is paid nothing", canon(lf) === canon([1_300, 2_600, 650]), canon(lf));
  const paid = sum(pay.map((x) => x ?? 0));
  ok("1.9 · ★ conservation: Σ payouts + T + F = 44,000 = the pool — the document's 44,001 had a shilling that did not exist", d !== null && paid + d.winningsTax + d.fee === 44_000, `${paid} + ${d?.winningsTax} + ${d?.fee}`);
  ok("1.10 · TRA 572 · GBT 286 · net GGR 4,862 — `levySplit` on the fee, once, unchanged", canon(P.levySplit(5_720, { traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05 })) === canon({ fee: 5_720, traLevy: 572, gbtLevy: 286, operatorNet: 4_862 }));
  const gross = DOC_W.map((w) => { const x = winner(doc, w.id); return x ? x.prize + x.tax : NaN; });
  ok("1.11 · each winner's gross winnings (prize + tax) sum to P — the tax is a share of what they won, nothing else", sum(gross) === 30_450, canon(gross));
}

// ═══ §2 · THE LOPSIDED MARKET ═════════════════════════════════════════════════════════════════════════════════════════
section("§2 · 100,000 against 10,000, YES wins — a winner paid less than the stake, by ruling 1");
{
  const s = attempt(() => P.stakeShareSplit({ yesPool: 100_000, noPool: 10_000, outcome: "YES", winners: [pos("w1", 100_000)], losers: [pos("l1", 10_000)] }, SS));
  const w = winner(s, "w1");
  ok("2.1 · ★ the split pays 94,395 — F 14,300, P 8,700, T 1,305", !isErr(s) && w?.payout === 94_395 && s.fee === 14_300 && s.prizeFund === 8_700 && s.winningsTax === 1_305, msg(isErr(s) ? s : { payout: w?.payout, fee: s.fee, P: s.prizeFund, T: s.winningsTax }));
  ok("2.2 · …below the stake, and never below the NET stake (100,000 − 13,000 = 87,000)", !!w && w.payout < 100_000 && w.payout >= w.net && w.net === 87_000, canon(w ?? null));
  const proj = attempt(() => P.settledPayoutFor({ yesPool: 100_000, noPool: 10_000, side: "YES", stake: 100_000 }, SS));
  const quoted = attempt(() => P.payoutFor({ yesPool: 0, noPool: 10_000, side: "YES", stake: 100_000 }, SS));
  ok("2.3 · ★ the projection says the same before and after the bet: 94,395", !isErr(proj) && proj.payout === 94_395 && !isErr(quoted) && quoted.payout === 94_395, `${msg(isErr(proj) ? proj : proj.payout)} / ${msg(isErr(quoted) ? quoted : quoted.payout)}`);
  ok("2.4 · …and names it `below`", !isErr(proj) && P.leanFor(proj.ratio) === "below", isErr(proj) ? proj.message : String(proj.ratio));
  const be = P.stakeShareBreakEvenShare(SS);
  ok("2.5 · the break-even lean is 14.95% of the pool on the smaller side (FEE-TAX-PLAN §3)", be !== null && Math.abs(be - 0.149511) < 1e-5, String(be));
  const at16 = P.poolFee(84_000, 16_000, SS, "YES").netPool / 84_000;
  const at14 = P.poolFee(86_000, 14_000, SS, "YES").netPool / 86_000;
  ok("2.6 · …and it is the line: a 16% smaller side pays the bigger side ≥ its stake, a 14% one < its stake", at16 >= 1 && at14 < 1, `${at16.toFixed(4)} / ${at14.toFixed(4)}`);
}

// ═══ §3 · ODD STAKES AND TIES ═════════════════════════════════════════════════════════════════════════════════════════
section("§3 · odd stakes and ties — 1,005 / 1,337 / 999 / 1,005 against 1,005 / 1,337 / 999");
{
  const W = [pos("p1", 1_005), pos("p2", 1_337), pos("p3", 999), pos("p4", 1_005)];
  const L = [pos("q1", 1_005), pos("q2", 1_337), pos("q3", 999)];
  const s = attempt(() => P.stakeShareSplit({ yesPool: 4_346, noPool: 3_341, outcome: "YES", winners: W, losers: L }, SS));
  const t = isErr(s) ? null : s;
  ok("3.1 · the totals: F 999 (565 + 434), P 2,907, T 436, shared 6,252", t !== null && t.fee === 999 && t.feeYes === 565 && t.feeNo === 434 && t.prizeFund === 2_907 && t.winningsTax === 436 && t.netPool === 6_252, msg(t ?? s));
  const rows = W.map((w) => { const x = winner(s, w.id); return x ? [x.fee, x.prize, x.tax, x.payout] : null; });
  ok("3.2 · every part: fee·prize·tax·payout = 131·572·101·1,446 / 174·760·134·1,923 / 130·568·100·1,437 / 130·571·101·1,446",
    canon(rows) === canon([[131, 572, 101, 1_446], [174, 760, 134, 1_923], [130, 568, 100, 1_437], [130, 571, 101, 1_446]]), canon(rows));
  const p1 = winner(s, "p1"), p4 = winner(s, "p4");
  ok("3.3 · ★ ties go by id: p1 and p4 stake the same, and p1 — the lower id — takes the leftover shilling of the fee AND of the prize",
    !!p1 && !!p4 && p1.fee === p4.fee + 1 && p1.prize === p4.prize + 1 && p1.payout === p4.payout, canon([p1 ?? null, p4 ?? null]));
  const lf = L.map((l) => (isErr(s) ? undefined : s.perLoser.get(l.id)?.fee));
  ok("3.4 · the losers' fees: 130 / 174 / 130 — Σ 434", canon(lf) === canon([130, 174, 130]), canon(lf));
  const paid = t ? sum([...t.perWinner.values()].map((x) => x.payout)) : NaN;
  ok("3.5 · conservation exact, and every winner ≥ its net stake", t !== null && paid + t.winningsTax + t.fee === 4_346 + 3_341 && [...t.perWinner.values()].every((x) => x.payout >= x.net), `${paid}`);
  const shuffled = attempt(() => P.stakeShareSplit({ yesPool: 4_346, noPool: 3_341, outcome: "YES", winners: [W[2], W[3], W[0], W[1]], losers: [L[2], L[0], L[1]] }, SS));
  ok("3.6 · ★ deterministic: a shuffled input gives the same Maps, in the same order", !isErr(s) && !isErr(shuffled)
    && canon([...s.perWinner]) === canon([...shuffled.perWinner]) && canon([...s.perLoser]) === canon([...shuffled.perLoser]));
  // Equal stakes everywhere: only the id can decide.
  const eq = attempt(() => P.stakeShareSplit({ yesPool: 3_003, noPool: 1_000, outcome: "YES", winners: [pos("b", 1_001), pos("a", 1_001), pos("c", 1_001)], losers: [pos("x", 1_000)] }, SS));
  const eqRows = ["a", "b", "c"].map((id) => { const x = winner(eq, id); return x ? [x.fee, x.prize, x.tax, x.payout] : null; });
  ok("3.7 · three equal stakes: a 130·247·44·1,118, b 130·246·44·1,117, c 130·246·43·1,117 — the leftovers by id",
    canon(eqRows) === canon([[130, 247, 44, 1_118], [130, 246, 44, 1_117], [130, 246, 43, 1_117]]), canon(eqRows));
  const no = attempt(() => P.stakeShareSplit({ yesPool: 4_346, noPool: 3_341, outcome: "NO", winners: L, losers: W }, SS));
  const noPay = L.map((l) => winner(no, l.id)?.payout);
  ok("3.8 · the same book, NO wins: F 999 (434 on the winners), P 3,781, T 567, payouts 1,842 / 2,449 / 1,830",
    !isErr(no) && no.fee === 999 && no.prizeFund === 3_781 && no.winningsTax === 567 && canon(noPay) === canon([1_842, 2_449, 1_830]), msg(isErr(no) ? no : { P: no.prizeFund, T: no.winningsTax, noPay }));
}

// ═══ §4 · GENERATED MARKETS ═══════════════════════════════════════════════════════════════════════════════════════════
section("§4 · 3,000 generated markets — the properties, not the examples");
{
  // mulberry32 — a 32-bit generator in exact integer steps, so every run on every machine draws the same 3,000 markets.
  let seed = 20261024;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const RATE_SETS = [
    { platformFeeRate: 0.03, operatorFeeRate: 0.10, winningsTaxRate: 0.15 },
    { platformFeeRate: 0.0275, operatorFeeRate: 0.10, winningsTaxRate: 0.15 },
    { platformFeeRate: 0, operatorFeeRate: 0, winningsTaxRate: 0 },
    { platformFeeRate: 0.10, operatorFeeRate: 0.20, winningsTaxRate: 0.5 },
    { platformFeeRate: 0.0001, operatorFeeRate: 0, winningsTaxRate: 0.1234 },
  ];
  const bad: string[] = [];
  let projWorst = 0;
  for (let n = 0; n < 3_000 && bad.length < 5; n++) {
    const rates = { ...SS, ...RATE_SETS[n % RATE_SETS.length] };
    const outcome: Side = rnd() < 0.5 ? "YES" : "NO";
    const W = Array.from({ length: int(1, 8) }, (_, i) => pos(`w${String(i).padStart(2, "0")}`, int(500, 1_000_000)));
    const L = Array.from({ length: int(1, 8) }, (_, i) => pos(`l${String(i).padStart(2, "0")}`, int(500, 1_000_000)));
    const wPool = sum(W.map((w) => w.stake)), lPool = sum(L.map((l) => l.stake));
    const yesPool = outcome === "YES" ? wPool : lPool, noPool = outcome === "YES" ? lPool : wPool;
    const s = attempt(() => P.stakeShareSplit({ yesPool, noPool, outcome, winners: W, losers: L }, rates));
    if (isErr(s)) { bad.push(`#${n} threw: ${s.message}`); continue; }
    const parts = [...s.perWinner.values()];
    const fw = outcome === "YES" ? s.feeYes : s.feeNo, fl = outcome === "YES" ? s.feeNo : s.feeYes;
    if (sum(parts.map((x) => x.payout)) + s.winningsTax + s.fee !== yesPool + noPool) bad.push(`#${n} does not conserve`);
    if (parts.some((x) => x.payout < x.net || x.net !== x.payout - x.prize)) bad.push(`#${n} breaks the net-stake floor`);
    if (sum(parts.map((x) => x.fee)) !== fw || sum([...s.perLoser.values()].map((x) => x.fee)) !== fl) bad.push(`#${n} fees do not sum`);
    if (sum(parts.map((x) => x.tax)) !== s.winningsTax || sum(parts.map((x) => x.prize)) !== s.prizeFund - s.winningsTax) bad.push(`#${n} tax/prize do not sum`);
    const tt = attempt(() => P.stakeShareTotals(yesPool, noPool, outcome, rates));
    if (isErr(tt) || canon(tt) !== canon({ fee: s.fee, feeYes: s.feeYes, feeNo: s.feeNo, prizeFund: s.prizeFund, winningsTax: s.winningsTax, netPool: s.netPool })) bad.push(`#${n} totals differ`);
    const cf = attempt(() => P.chargedFee({ yesPool, noPool, resolvedOutcome: outcome }, rates));
    if (isErr(cf) || cf.fee !== s.fee || cf.winningsTax !== s.winningsTax || cf.netPool !== s.netPool || cf.refunded) bad.push(`#${n} chargedFee differs`);
    for (const w of W) {
      const pr = attempt(() => P.settledPayoutFor({ yesPool, noPool, side: outcome, stake: w.stake }, rates));
      if (isErr(pr)) { bad.push(`#${n} projection threw: ${pr.message}`); break; }
      projWorst = Math.max(projWorst, Math.abs(pr.payout - (s.perWinner.get(w.id)?.payout ?? NaN)));
    }
  }
  ok("4.1 · ★ every market conserves exactly, holds the net-stake floor, and every part sums to its whole", bad.length === 0, bad.join(" | "));
  ok("4.2 · ★ `stakeShareTotals` and `chargedFee` give the split's totals in every market (§5, §6)", !bad.some((b) => /totals|chargedFee/.test(b)));
  ok("4.3 · the one-position projection lands within 2 shillings of what the split pays (it rounds once, the split three times)", projWorst <= 2, `worst ${projWorst}`);
}

// ═══ §5 · TOTALS ══════════════════════════════════════════════════════════════════════════════════════════════════════
section("§5 · `stakeShareTotals` — the same numbers from the two pools alone");
{
  const t = attempt(() => P.stakeShareTotals(9_000, 35_000, "YES", SS));
  ok("5.1 · the document's totals from the pools alone", !isErr(t) && !isErr(doc) && canon(t) === canon({ fee: doc.fee, feeYes: doc.feeYes, feeNo: doc.feeNo, prizeFund: doc.prizeFund, winningsTax: doc.winningsTax, netPool: doc.netPool }), msg(t));
  ok("5.2 · an empty market prices to zero", canon(attempt(() => P.stakeShareTotals(0, 0, "YES", SS))) === canon({ fee: 0, feeYes: 0, feeNo: 0, prizeFund: 0, winningsTax: 0, netPool: 0 }));
  ok("5.3 · a one-sided pool is REFUSED — settlement refunds it (ruling 2), nothing prices it", isErr(attempt(() => P.stakeShareTotals(5_000, 0, "YES", SS))));
  ok("5.4 · a fractional pool is refused, never rounded", isErr(attempt(() => P.stakeShareTotals(9_000.5, 35_000, "YES", SS))));
}

// ═══ §6 · chargedFee ══════════════════════════════════════════════════════════════════════════════════════════════════
section("§6 · `chargedFee` — what the settlement keeps back, for readers");
{
  const c = attempt(() => P.chargedFee({ yesPool: 9_000, noPool: 35_000, resolvedOutcome: "YES" }, SS));
  ok("6.1 · fee is F ONLY (5,720) — the tax stands beside it (4,568), with P (30,450); what winners got is 33,712",
    !isErr(c) && c.fee === 5_720 && c.winningsTax === 4_568 && c.prizeFund === 30_450 && c.netPool === 33_712 && !c.refunded, msg(c));
  ok("6.2 · ★ staked − paid back = fee + winnings tax: 44,000 − 33,712 = 10,288", !isErr(c) && 44_000 - 33_712 === c.fee + (c.winningsTax ?? 0));
  const one = attempt(() => P.chargedFee({ yesPool: 25_000, noPool: 0, resolvedOutcome: "NO" }, SS));
  ok("6.3 · one side only (resolved against its money) → refunded in full, fee 0, no tax — ruling 2, as today", !isErr(one) && one.refunded && one.fee === 0 && one.winningsTax === undefined, msg(one));
  const voided = attempt(() => P.chargedFee({ yesPool: 20_000, noPool: 5_000, resolvedOutcome: "VOID" }, SS));
  ok("6.4 · VOID → refunded, fee 0", !isErr(voided) && voided.refunded && voided.fee === 0, msg(voided));
  const empty = attempt(() => P.chargedFee({ yesPool: 0, noPool: 0, resolvedOutcome: "YES" }, SS));
  ok("6.5 · a market nobody backed → fee 0, nothing shared, nothing refunded", !isErr(empty) && empty.fee === 0 && empty.netPool === 0 && !empty.refunded, msg(empty));
}

// ═══ §7 · THE ONE-SIDED MIRROR ════════════════════════════════════════════════════════════════════════════════════════
section("§7 · a projection onto an empty other side is the stake — never 87%");
{
  const first = attempt(() => P.payoutFor({ yesPool: 0, noPool: 0, side: "YES", stake: 5_000 }, SS));
  ok("7.1 · ★ the first bet on an empty market is quoted its own stake back", !isErr(first) && first.payout === 5_000 && first.ratio === 1, msg(isErr(first) ? first : { payout: first.payout, ratio: first.ratio }));
  const more = attempt(() => P.payoutFor({ yesPool: 20_000, noPool: 0, side: "YES", stake: 5_000 }, SS));
  ok("7.2 · …and so is a bet on a side nobody has taken the other side of", !isErr(more) && more.payout === 5_000, msg(isErr(more) ? more : more.payout));
  const ls = P.payoutFor({ yesPool: 20_000, noPool: 0, side: "YES", stake: 5_000 }, LS);
  ok("7.3 · the older model says the same of the same pools (it falls out of its maths)", ls.payout === 5_000, String(ls.payout));
  const f = attempt(() => P.poolFee(25_000, 0, SS, "YES"));
  const g = attempt(() => P.poolFee(25_000, 0, SS));
  ok("7.4 · `poolFee` on a one-sided pool is the refund settlement makes: fee 0, the whole pool back, no tax",
    !isErr(f) && f.fee === 0 && f.netPool === 25_000 && f.winningsTax === undefined && !isErr(g) && g.fee === 0, `${msg(f)} · ${msg(g)}`);
  const control = attempt(() => P.payoutFor({ yesPool: 20_000, noPool: 1, side: "YES", stake: 5_000 }, SS));
  ok("7.5 · CONTROL · one shilling on the other side and the fee applies: 4,350, not the stake", !isErr(control) && control.payout === 4_350, msg(isErr(control) ? control : control.payout));
  // FEE-TAX R2 review · a refund needs no rate: the one-sided answer is decided BEFORE the pricing read that wants the tax.
  const noTaxOneSided = attempt(() => P.poolFee(25_000, 0, PROFILE, "YES"));
  ok("7.6 · ★ `poolFee` refunds a one-sided pool even when its rates lack the tax — it never reads a rate to refund",
    !isErr(noTaxOneSided) && noTaxOneSided.fee === 0 && noTaxOneSided.netPool === 25_000 && noTaxOneSided.winningsTax === undefined, msg(noTaxOneSided));
  ok("7.7 · CONTROL · …while a two-sided pool with a side still refuses those rates (a price needs the tax)",
    isErr(attempt(() => P.poolFee(25_000, 1, PROFILE, "YES"))));
}

// ═══ §8 · THE READ ════════════════════════════════════════════════════════════════════════════════════════════════════
section("§8 · `readRates` — a stake-share rate set is read, never completed");
{
  const refuses = (rates: object) => isErr(attempt(() => P.stakeShareTotals(9_000, 35_000, "YES", rates as never)));
  const { winningsTaxRate: _t, ...noTax } = SS;
  const { platformFeeRate: _p, ...noPlatform } = SS;
  const { operatorFeeRate: _o, ...noOperator } = SS;
  ok("8.1 · ★ no winnings tax → refused, never defaulted", refuses(noTax));
  ok("8.2 · no platform rate → refused", refuses(noPlatform));
  ok("8.3 · no operator rate → refused", refuses(noOperator));
  ok("8.4 · platform 25% + operator 10% = 35% > the 30% bound → refused", refuses({ ...SS, platformFeeRate: 0.25 }));
  ok("8.5 · a 60% tax > the 50% bound → refused", refuses({ ...SS, winningsTaxRate: 0.6 }));
  ok("8.6 · a NaN tax → refused", refuses({ ...SS, winningsTaxRate: Number.NaN }));
  ok("8.7 · a TERMS read needs no tax: the profile names its model, captions its rate and previews F with no side",
    P.resolveFeeModel(PROFILE) === "stake-share" && P.describeFeeModel(PROFILE).caption === "13% of stakes" && attempt(() => P.poolFee(10_000, 10_000, PROFILE)).fee === 2_600);
  ok("8.8 · …but a PRICE of it refuses: a side, or a projection, needs the tax", isErr(attempt(() => P.poolFee(10_000, 10_000, PROFILE, "YES"))) && isErr(attempt(() => P.payoutFor({ yesPool: 10_000, noPool: 10_000, side: "YES", stake: 1_000 }, PROFILE))));
  ok("8.9 · a terms read still refuses a malformed fee rate", isErr(attempt(() => P.resolveFeeModel({ feeModel: "stake-share", operatorFeeRate: 0.10 } as never))));
  const withTax = P.poolFee(7_000, 3_000, { ...LS, winningsTaxRate: 0.15 }, "YES");
  ok("8.10 · every other model IGNORES a tax: loser-share is 390 with or without one, and carries no tax field",
    withTax.fee === 390 && withTax.winningsTax === undefined && canon(withTax) === canon(P.poolFee(7_000, 3_000, LS, "YES")));
  ok("8.11 · CONTROL · an unknown model is still refused, never coerced", isErr(attempt(() => P.resolveFeeModel({ feeModel: "mystery" } as never))));
  // FEE-TAX R2 review · a rate between two basis points would be frozen as one figure and charged as another (rateBp rounds
  // 312.5 → 313 and 1,234.5 → 1,235), so the read that prices refuses it — terms reads included.
  ok("8.12 · ★ a platform rate between basis points (0.03125) → refused, on a price and on a terms read",
    refuses({ ...SS, platformFeeRate: 0.03125 }) && isErr(attempt(() => P.resolveFeeModel({ ...PROFILE, platformFeeRate: 0.03125 }))));
  ok("8.13 · ★ a winnings tax between basis points (0.12345) → refused", refuses({ ...SS, winningsTaxRate: 0.12345 }));
  ok("8.14 · CONTROL · whole basis points still read: 2.75% + 10% with a 12.34% tax prices, and `isWholeBasisPoints` says why",
    !refuses({ ...SS, platformFeeRate: 0.0275, winningsTaxRate: 0.1234 }) && P.isWholeBasisPoints(0.1275) && P.isWholeBasisPoints(0.0001)
      && !P.isWholeBasisPoints(0.03125) && !P.isWholeBasisPoints(0.12345) && !P.isWholeBasisPoints(Number.NaN));
}

// ═══ §9 · THE SNAPSHOT READER ═════════════════════════════════════════════════════════════════════════════════════════
section("§9 · `snapshotOrLegacy` — stake-share as frozen; every legacy snapshot byte-identical");
{
  const V3 = {
    commissionRate: 0.10, feeCeilingRate: 1 / 3, cashOutFeeRate: 0.10, freeExitGraceMinutes: 5, paidExitWindowMinutes: 0,
    traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05, thinProfitRatio: 1.05,
    feeModel: "stake-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, winningsTaxRate: 0.15,
    estimatedWinningsRate: 0.5, showEstimatedWinnings: true, v: 3, stampedAt: "2026-11-01T00:00:00.000Z",
  };
  const read = attempt(() => snapshotOrLegacy(V3));
  ok("9.1 · ★ a stake-share snapshot passes through EXACTLY as frozen — never folded into capped-commission", !isErr(read) && canon(read) === canon(V3), msg(read));
  const { winningsTaxRate: _x, ...v3NoTax } = V3;
  const noTax = attempt(() => snapshotOrLegacy(v3NoTax));
  ok("9.2 · one with no tax passes through with NO tax — not defaulted — and pricing it refuses",
    !isErr(noTax) && noTax.feeModel === "stake-share" && noTax.winningsTaxRate === undefined && isErr(attempt(() => P.stakeShareTotals(1_000, 1_000, "YES", noTax))), msg(noTax));
  const bare = { feeModel: "stake-share", operatorFeeRate: 0.10, winningsTaxRate: 0.15, stampedAt: "2026-11-01T00:00:00.000Z" };
  const bareRead = attempt(() => snapshotOrLegacy(bare));
  ok("9.3 · one missing its platform rate keeps it missing (not 3%), and is still its OWN snapshot — not the 9% legacy fallback",
    hasOwnSnapshot(bare) && !isErr(bareRead) && bareRead.feeModel === "stake-share" && bareRead.platformFeeRate === undefined && bareRead.stampedAt === bare.stampedAt, msg(bareRead));

  const DEFAULTS = { cashOutFeeRate: 0.10, freeExitGraceMinutes: 5, paidExitWindowMinutes: 0, traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05, thinProfitRatio: 1.05 };
  const L1 = { commissionRate: 0.09, feeCeilingRate: 1 / 3 };
  const L1_OUT = { ...L1, ...DEFAULTS, feeModel: "capped-commission", platformFeeRate: 0.03, operatorFeeRate: 0.10, estimatedWinningsRate: 0, showEstimatedWinnings: false, v: 1, stampedAt: "legacy" };
  const L2 = { commissionRate: 0.10, feeCeilingRate: 1 / 3, ...DEFAULTS, feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, estimatedWinningsRate: 0.5, showEstimatedWinnings: true, v: 2, stampedAt: "2026-08-01T00:00:00.000Z" };
  const L3 = { ...L2, feeModel: "jackpot-payout", jackpotFeeRate: 0.13 };
  const FALLBACK = { commissionRate: 0.09, feeCeilingRate: 1 / 3, ...DEFAULTS, feeModel: "capped-commission", platformFeeRate: 0.03, operatorFeeRate: 0.10, estimatedWinningsRate: 0, showEstimatedWinnings: false, v: 1, stampedAt: "legacy" };
  ok("9.4 · a bare pre-2026-07-23 snapshot reads exactly as it always has", canon(snapshotOrLegacy(L1)) === canon(L1_OUT), canon(snapshotOrLegacy(L1)));
  ok("9.5 · a loser-share v2 snapshot reads exactly as frozen", canon(snapshotOrLegacy(L2)) === canon(L2));
  ok("9.6 · …and a stray tax on it is NOT carried — only a stake-share snapshot carries one", canon(snapshotOrLegacy({ ...L2, winningsTaxRate: 0.15 })) === canon(L2));
  ok("9.7 · a Millionea week reads exactly as frozen", canon(snapshotOrLegacy(L3)) === canon(L3));
  ok("9.8 · no snapshot at all → the 9% legacy fallback, unchanged", canon(snapshotOrLegacy(null)) === canon(FALLBACK));
}

// ═══ §10 · CAPTIONS AND FIGURES ═══════════════════════════════════════════════════════════════════════════════════════
section("§10 · the caption and the figures, from the resolved rates — never a literal");
{
  const d = P.describeFeeModel(SS);
  ok("10.1 · the caption is \"13% of stakes\" and names the model", d.model === "stake-share" && d.caption === "13% of stakes", canon(d));
  const captions = ([[0.0275, 0.10], [0.10, 0.20], [0.0001, 0]] as const)
    .map(([p, o]) => P.describeFeeModel({ ...SS, platformFeeRate: p, operatorFeeRate: o }).caption);
  ok("10.2 · it fits the measured tile at every whole basis point: 12.75% · 30% · 0.01%",
    canon(captions) === canon(["12.75% of stakes", "30% of stakes", "0.01% of stakes"]) && captions.every((c) => c.length <= P.FEE_CAPTION_MAX_CHARS), canon(captions));
  const quoted = Number(/([\d.]+)%/.exec(d.caption)?.[1]) / 100;
  ok("10.3 · the quoted rate × every stake = the fee charged with no side: 13% of 100,000 = 13,000", Math.abs(quoted * 100_000 - P.poolFee(70_000, 30_000, SS).fee) < 1e-9);
  ok("10.4 · stakeShareRate 0.13 · stakeSharePct 13 · winningsTaxPct 15", P.stakeShareRate(SS) === 0.13 && P.stakeSharePct(SS) === 13 && P.winningsTaxPct(SS) === 15);
  ok("10.5 · loserShareRate and loserSharePct are null under stake-share; the stake-share figures are null under loser-share",
    P.loserShareRate(SS) === null && P.loserSharePct(SS) === null && P.stakeSharePct(LS) === null && P.winningsTaxPct(LS) === null);
  ok("10.6 · a profile with no tax has a fee figure and no tax figure", P.stakeSharePct(PROFILE) === 13 && P.winningsTaxPct(PROFILE) === null);
}

// ═══ §11 · leanFor ════════════════════════════════════════════════════════════════════════════════════════════════════
section("§11 · `leanFor` — `below` is back, for one model");
ok("11.1 · below 1 is `below`; 1.02 thin; 1.5 fair", P.leanFor(0.9449) === "below" && P.leanFor(1.02) === "thin" && P.leanFor(1.5) === "fair");
ok("11.2 · a ratio of 0 is the no-position answer and keeps the level it always had (`thin`); exactly 1 is `thin`", P.leanFor(0) === "thin" && P.leanFor(1) === "thin");

// ═══ §12 · THE WORST CASE ═════════════════════════════════════════════════════════════════════════════════════════════
section("§12 · `worstCaseWinnerRatio` — tends to 1 − f from above, never throws");
{
  const w = attempt(() => P.worstCaseWinnerRatio(SS));
  ok("12.1 · ★ ≈ 0.871 at the sweep's 99.9/0.1, the winner on the bigger side", !isErr(w) && w.ratio > 0.8705 && w.ratio < 0.871 && w.atYes === 999_000, msg(w));
  const wp = attempt(() => P.worstCaseWinnerRatio(PROFILE));
  ok("12.2 · a profile with no tax does not throw — it is swept at the highest tax a snapshot may freeze", !isErr(wp) && !isErr(w) && wp.ratio < w.ratio && wp.ratio > 0.87, msg(wp));
  ok("12.3 · the older models' worst case is unchanged: never below 1", P.worstCaseWinnerRatio(LS).ratio >= 1 && P.worstCaseWinnerRatio(CAP).ratio >= 1);
}

// ═══ §13 · REFUSALS ═══════════════════════════════════════════════════════════════════════════════════════════════════
section("§13 · the split refuses every input it cannot settle exactly");
{
  const split = (input: Partial<Parameters<typeof P.stakeShareSplit>[0]>, rates: object = SS) =>
    attempt(() => P.stakeShareSplit({ yesPool: 9_000, noPool: 35_000, outcome: "YES", winners: DOC_W, losers: DOC_L, ...input } as never, rates as never));
  const e1 = split({ winners: DOC_W.slice(0, 2) });
  ok("13.1 · ★ E-200 · winners that do not make the winning pool → refused, never a quiet short-payment", isErr(e1) && /do not make the pools/.test(e1.message), msg(e1));
  ok("13.2 · an id on both sides → refused", isErr(split({ losers: [pos("y1", 10_000), pos("n2", 20_000), pos("n3", 5_000)] })));
  ok("13.3 · a fractional stake → refused", isErr(split({ yesPool: 9_000.5, winners: [pos("y1", 1_000.5), pos("y2", 3_000), pos("y3", 5_000)] })));
  ok("13.4 · a one-sided market → refused (the caller refunds it)", isErr(split({ noPool: 0, losers: [] })));
  ok("13.5 · a loser-share rate set → refused: this arithmetic prices one law", isErr(split({}, LS)));
  const empty = split({ yesPool: 0, noPool: 0, winners: [], losers: [] });
  ok("13.6 · a market nobody backed → all zeros, no parts", !isErr(empty) && empty.fee === 0 && empty.perWinner.size === 0 && empty.perLoser.size === 0, msg(empty));
}

// ═══ §14 · poolFee ════════════════════════════════════════════════════════════════════════════════════════════════════
section("§14 · `poolFee`'s contract — fee = F only, the tax beside it");
{
  const a = P.poolFee(9_000, 35_000, SS, "YES");
  ok("14.1 · with a side: fee 5,720, winningsTax 4,568, prizeFund 30,450, netPool = pool − F − T = 33,712",
    a.fee === 5_720 && a.winningsTax === 4_568 && a.prizeFund === 30_450 && a.netPool === 33_712 && !a.capped, canon(a));
  const b = P.poolFee(9_000, 35_000, SS);
  ok("14.2 · with no side: F alone (known before the outcome), no tax yet, netPool = pool − F",
    b.fee === 5_720 && b.winningsTax === undefined && b.prizeFund === undefined && b.netPool === 38_280, canon(b));
  ok("14.3 · the older models carry no tax field at all", P.poolFee(7_000, 3_000, LS, "YES").winningsTax === undefined && P.poolFee(7_000, 3_000, CAP, "YES").winningsTax === undefined);
}

// ═══ §15 · ROUND HALF UP ══════════════════════════════════════════════════════════════════════════════════════════════
section("§15 · round half up, in integers");
ok("15.1 · 4,567.5 → 4,568 · 130.65 → 131 · 1,170 → 1,170 · 0.5 → 1 · 0.45 → 0",
  P.roundHalfUpBp(30_450, 1_500) === 4_568 && P.roundHalfUpBp(1_005, 1_300) === 131 && P.roundHalfUpBp(9_000, 1_300) === 1_170 && P.roundHalfUpBp(5, 1_000) === 1 && P.roundHalfUpBp(3, 1_500) === 0);
ok("15.2 · a fractional or negative amount is refused, never rounded", isErr(attempt(() => P.roundHalfUpBp(10.5, 1_300))) && isErr(attempt(() => P.roundHalfUpBp(-1, 1_300))));
ok("15.3 · a rate is read in whole basis points: 0.03 + 0.10 → 1,300", P.rateBp(0.03 + 0.10) === 1_300 && P.rateBp(0.15) === 1_500);

// ═══ §16 · NO MIX ═════════════════════════════════════════════════════════════════════════════════════════════════════
section("§16 · no mix — the older models' figures, pinned");
ok("16.1 · loser-share 13% on 7,000/3,000, YES wins: fee 390; capped 13%/⅓: fee 1,000",
  P.poolFee(7_000, 3_000, LS, "YES").fee === 390 && P.poolFee(7_000, 3_000, CAP, "YES").fee === 1_000);
ok("16.2 · a loser-share winner staking 1,000 of 7,000 is paid 1,373 — its floor (`assertWinnerFloor`) untouched",
  P.settledPayoutFor({ yesPool: 7_000, noPool: 3_000, side: "YES", stake: 1_000 }, LS).payout === 1_373);
ok("16.3 · the legacy allocator still allocates the legacy way", canon([...P.allocateWinnerPayouts([pos("a", 1), pos("b", 1), pos("c", 1)], 3, 10)]) === canon([["a", 4], ["b", 3], ["c", 3]]));

// ═══ §17 · THE GATE ═══════════════════════════════════════════════════════════════════════════════════════════════════
section("§17 · the arithmetic does not read the gate");
ok("17.1 · the gate is shut in this build, and a stake-share snapshot is priced all the same — the gate decides only what a NEW market may freeze",
  FEE_LAW_LIVE === false && !isErr(doc));

console.log(`\nstake-share-fee: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
