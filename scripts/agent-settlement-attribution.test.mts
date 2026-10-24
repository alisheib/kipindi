/**
 * test:agent-settlement-attribution — AN AGENT'S COMMISSION, PRICED BY THE REAL SETTLEMENT, UNDER EVERY POOL MODEL
 * (programme FEE-TAX-2026-10, release R2 lane b; `docs/FEE-TAX-PLAN.md` §3).
 *
 *   npm run test:agent-settlement-attribution     (memory store; forced, whatever the environment says)
 *
 * An agent earns a share of the fee the house KEPT on each settled position of its recruits — win or lose — priced on
 * the fee NET of the TRA and GBT levies, floored to the shilling (`onRecruitSettlement`). `settleMarket` is the only caller
 * that prices it, so this suite drives the REAL chain — `createMarket` → `buyPosition` → `resolveMarket` → `settleMarket`
 * → `onRecruitSettlement` — and reads the reward rows back, under each model:
 *
 *   §1  loser-share — UNCHANGED: each recruit's base is its pro-rata share of the market's levy-net fee,
 *       floor(rate × (stake / pool) × operatorNet(fee)). A winning and a losing recruit both accrue.
 *   §2  stake-share — every position PAID ITS OWN FEE (13% of its own stake, winner and loser alike), and the house kept
 *       ONE figure of the market's fee F: levySplit(F).operatorNet. Each position's base is its largest-remainder share
 *       of that figure BY ITS OWN FEE, ties by id (`stakeShareCommissionBases`) — so the bases sum to operatorNet(F)
 *       EXACTLY, never a shilling of a fee the house did not keep (RULES §2.10), and a winning and a losing recruit both
 *       accrue on their own fee. The fixture tells this law apart from both others: the pro-rata-by-stake formula would
 *       pay the winner differently, and the first draft's levySplit(own fee) per position would pay the loser differently
 *       — its bases summing to 796 against the 795 the house kept.
 *   §3  ⛔ THE WINNINGS TAX IS NEVER IN THE BASE: the same stakes under a 30% tax accrue exactly what they accrue under 15%,
 *       while the tax itself doubles — and the figure a tax-inclusive base would give is shown to differ.
 *   §4  A VOID CLAWS BACK: an accrual already standing against a stake-share market is REVERSED when the market settles
 *       VOID, the agent's cash returns to what it was, and the void itself accrues nothing; a one-sided stake-share market,
 *       refunded in full at no fee, accrues nothing either.
 *
 * ⚠️ EVERY EXPECTATION IS RE-DERIVED FROM THE MARKET'S OWN FROZEN RATES AND POSITIONS (`stakeShareSplit`, `poolFee`,
 * `levySplit`) — AND PINNED TO A LITERAL. The re-derivation keeps the suite true to the arithmetic; the literal stops it
 * agreeing with a broken engine because both call the same function (`commission-bounded.test.mts`'s rule). The cash a
 * gross accrual lands as goes through `netAfterWht`, the live withholding rate.
 *
 * ⛔ The new law is not in force (`fee-law-gate.ts`): this process opens the gate IN ITSELF, through the test seam, only to
 * stamp its stake-share markets, and shuts it again each time.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
// ⛔ MEMORY ONLY, BY CONSTRUCTION: these fixtures write users, wallets and markets, so the suite never follows a
// DATABASE_URL the environment happens to carry. Set BEFORE the first import below (every import is dynamic for that).
process.env.DATABASE_URL = "";
process.env.USE_PRISMA_DAL = "false";
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.EMAIL_OUTBOX_CAPTURE = "1";
process.env.POSTMARK_API_KEY = "";
process.env.SMS_PROVIDER = "console";
process.env.UPDOWN_SCHEDULER = "false";
process.env.UPDOWN_HEALER = "false";
process.env.HOUSE_BOT_ENGINE = "false";

type Any = any;
await import("./lib/verified-fixtures.mts");
const { loadWorld } = await import("./lib/house-bot-world.mts");
const { mkFixtureUser, approveFixtureAgent, cashOf, netAfterWht } = await import("./lib/agent-fixtures.mts");
const { bindRecruit, onRecruitSettlement } = await import("../src/lib/server/affiliate-service.ts");
const P: Any = await import("../src/lib/payout.ts");
const gate: Any = await import("../src/lib/fee-law-gate.ts");
const { db }: Any = await import("../src/lib/server/store.ts");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const j = (v: unknown) => JSON.stringify(v);

const w: Any = await loadWorld();
const OFFICER = "usr_asa_officer";
const AGENT = `usr_asa_agent_${process.pid}`;
const PCT = 20;
const RATE = PCT / 100;

// ── fixtures ─────────────────────────────────────────────────────────────────────────────────────────────────────────
await mkFixtureUser(AGENT);
const CODE = await approveFixtureAgent(AGENT, { commissionPct: PCT });

/** A funded player bound to the agent through the real `bindRecruit`. */
async function recruit(): Promise<string> {
  const id = await w.user({ balance: 50_000 });
  const b = await bindRecruit({ recruitUserId: id, code: CODE });
  if (!b.bound) throw new Error(`fixture bind refused: ${j(b)}`);
  return id;
}
/** A funded player nobody recruited. */
const outsider = (): Promise<string> => w.user({ balance: 50_000 });

/** A poll through the real `createMarket`, its model frozen from explicit overrides. */
async function market(model: "loser-share" | "stake-share", title: string, winningsTaxRate = 0.15): Promise<Any> {
  const base = { platformFeeRate: 0.03, operatorFeeRate: 0.10, freeExitGraceMinutes: 0, paidExitWindowMinutes: 0 };
  const input = {
    titleEn: title, titleSw: `${title} (sw)`, category: "macro", sourceUrl: "https://bot.go.tz",
    resolutionCriterion: "Resolves at the official date.", resolutionAt: w.iso(7 * 864e5), proposedBy: OFFICER,
  };
  if (model === "loser-share") return w.svc.createMarket({ ...input, rateOverrides: { ...base, feeModel: "loser-share" } });
  gate.__setFeeLawLiveForTest(true);
  try {
    return await w.svc.createMarket({ ...input, rateOverrides: { ...base, feeModel: "stake-share", winningsTaxRate } });
  } finally {
    gate.__setFeeLawLiveForTest(null);
  }
}
async function bet(userId: string, marketId: string, side: "YES" | "NO", stake: number): Promise<string> {
  const r = await w.svc.buyPosition(userId, { marketId, side, stake });
  if (!r.ok) throw new Error(`fixture bet refused: ${j(r)}`);
  return r.data.positionId;
}
async function resolveAndSettle(marketId: string, outcome: "YES" | "NO" | "VOID"): Promise<Any> {
  const r = await w.svc.resolveMarket({ marketId, outcome, officerId: OFFICER });
  if (r.ok && r.data?.stage === "stage1") await w.svc.resolveMarket({ marketId, outcome, officerId: `${OFFICER}_b` });
  else if (!r.ok) throw new Error(`fixture resolve refused: ${j(r)}`);
  return w.svc.settleMarket(marketId, { force: true, actorId: OFFICER });
}
/** The reward row a settled position produced — by its idempotency key, the one `onRecruitSettlement` writes. */
const rowOf = async (marketId: string, positionId: string): Promise<Any> =>
  (await db.referralReward.findBySourceRef(`referral:commission:${marketId}:${positionId}`)) ?? null;
const commissionRowsFor = async (marketId: string): Promise<Any[]> =>
  ((await db.referralReward.listByReferrer(AGENT)) as Any[]).filter((r) => r.type === "COMMISSION" && r.marketId === marketId);
/** A PAID agent commission row carrying exactly this gross, its withholding and the rate that priced it. */
const rowIs = (row: Any, gross: number) =>
  !!row && row.status === "PAID" && row.programme === "AGENT" && row.rateApplied === PCT
    && row.grossAmountTzs === gross && row.amountTzs === netAfterWht(gross);
const show = (row: Any) => j(row && { status: row.status, gross: row.grossAmountTzs, net: row.amountTzs, rate: row.rateApplied, programme: row.programme });

/**
 * THE FIXTURE BOOK, the same in every section: two recruits and two outsiders —
 *   YES · recruit A 1,400 · outsider C 1,000        NO · recruit B 2,800 · outsider D 2,000        pool 7,200
 * Chosen (searched, not guessed) so every per-position fee is an exact 13% of its stake — A 182, C 130, B 364, D 260 — while
 * the market's fee F = 312 + 624 = 936 is levied ONCE: the house keeps levySplit(936).operatorNet = 795. Split by own fee
 * (largest remainder, exact): A 155 · C 110 · B 309 · D 221 = 795, so the recruits accrue 31 and 61. The two laws it must
 * NOT be are both visibly different on this book: pro-rata by stake pays the winner 30; the first draft's
 * levySplit(own fee) per position sums to 155 + 110 + 310 + 221 = 796 — one shilling the house never kept — and pays the
 * loser 62.
 */
async function book(marketId: string) {
  const a = await recruit(), b = await recruit(), c = await outsider(), d = await outsider();
  const pa = await bet(a, marketId, "YES", 1_400);
  const pc = await bet(c, marketId, "YES", 1_000);
  const pb = await bet(b, marketId, "NO", 2_800);
  const pd = await bet(d, marketId, "NO", 2_000);
  return { a, b, c, d, pa, pb, pc, pd };
}

// ═══ §1 · loser-share — unchanged ════════════════════════════════════════════════════════════════════════════════════
console.log("\n§1 · loser-share: the pro-rata share of the market's levy-net fee, exactly as it always was");
{
  const m = await market("loser-share", "Agent attribution · loser-share");
  ok("1.0 · the market froze loser-share", m.feeSnapshot?.feeModel === "loser-share", j(m.feeSnapshot?.feeModel));
  const x = await book(m.id);
  const settled = await resolveAndSettle(m.id, "YES");
  ok("1.1 · settleMarket settles it", settled.ok === true, j(settled));
  const fresh = await w.svc.getMarket(m.id);
  const fee = P.poolFee(fresh.yesPool, fresh.noPool, fresh.feeSnapshot, "YES");
  const lev = P.levySplit(fee.fee, fresh.feeSnapshot);
  const pool = fresh.yesPool + fresh.noPool;
  const grossA = Math.floor(((1_400 / pool) * lev.operatorNet) * RATE);
  const grossB = Math.floor(((2_800 / pool) * lev.operatorNet) * RATE);
  ok("1.2 · fixture · the fee is 13% of the losing pool (624), 531 of it kept after the levies",
    fee.fee === 624 && lev.operatorNet === 531 && pool === 7_200, j({ fee: fee.fee, lev, pool }));
  const ra = await rowOf(m.id, x.pa), rb = await rowOf(m.id, x.pb);
  ok("1.3 · ★ the WINNING recruit accrues floor(20% × (1,400 / 7,200) × 531) = 20 — the formula it always had",
    grossA === 20 && rowIs(ra, grossA), `${show(ra)} vs gross ${grossA}`);
  ok("1.4 · ★ …and the LOSING recruit accrues floor(20% × (2,800 / 7,200) × 531) = 41 — every stake funded the fee",
    grossB === 41 && rowIs(rb, grossB), `${show(rb)} vs gross ${grossB}`);
  ok("1.5 · the outsiders' positions accrue nothing (no referrer), so the market holds exactly the two rows",
    (await rowOf(m.id, x.pc)) === null && (await rowOf(m.id, x.pd)) === null && (await commissionRowsFor(m.id)).length === 2);
}

// ═══ §2 · stake-share — ONE kept figure, split by each position's own fee ════════════════════════════════════════════
console.log("\n§2 · stake-share: the house kept ONE figure, operatorNet(F); each recruit's base is its share of it by the fee ITS OWN stake paid");
let shareGross: { a: number; b: number } = { a: NaN, b: NaN };
{
  const m = await market("stake-share", "Agent attribution · stake-share");
  ok("2.0 · the market froze stake-share with its 15% tax (v3)",
    m.feeSnapshot?.feeModel === "stake-share" && m.feeSnapshot?.winningsTaxRate === 0.15 && m.feeSnapshot?.v === 3, j(m.feeSnapshot));
  const x = await book(m.id);
  const fresh = await w.svc.getMarket(m.id);
  const split = P.stakeShareSplit({
    yesPool: fresh.yesPool, noPool: fresh.noPool, outcome: "YES",
    winners: [{ id: x.pa, stake: 1_400 }, { id: x.pc, stake: 1_000 }],
    losers: [{ id: x.pb, stake: 2_800 }, { id: x.pd, stake: 2_000 }],
  }, fresh.feeSnapshot);
  const feeOf = (id: string): number => split.perWinner.get(id)?.fee ?? split.perLoser.get(id)?.fee;
  const kept: number = P.levySplit(split.fee, fresh.feeSnapshot).operatorNet;
  // The engine's own figure (pure, exported for exactly this) …
  const bases: Map<string, number> = w.svc.stakeShareCommissionBases(split, fresh.feeSnapshot);
  // … and an INDEPENDENT oracle: largest remainder of `kept` over the four own fees, in exact integers, ties by id.
  const oracle = (() => {
    const rows = [x.pa, x.pc, x.pb, x.pd].map((id) => ({ id, w: feeOf(id) }));
    const sw = rows.reduce((s, r) => s + r.w, 0);
    const parts = rows.map((r) => { const rem = (r.w * kept) % sw; return { id: r.id, q: (r.w * kept - rem) / sw, rem }; });
    const left = kept - parts.reduce((s, p) => s + p.q, 0);
    const order = [...parts].sort((p, q) => (q.rem !== p.rem ? q.rem - p.rem : p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
    const out = new Map(parts.map((p) => [p.id, p.q] as const));
    for (let i = 0; i < left; i++) out.set(order[i].id, (out.get(order[i].id) ?? 0) + 1);
    return out;
  })();
  const settled = await resolveAndSettle(m.id, "YES");
  ok("2.1 · settleMarket settles it", settled.ok === true, j(settled));
  ok("2.2 · fixture · own fees A 182 (winner) · C 130 · B 364 (loser) · D 260 — 13% of each stake — F = 936, and the house kept operatorNet(F) = 795",
    feeOf(x.pa) === 182 && feeOf(x.pc) === 130 && feeOf(x.pb) === 364 && feeOf(x.pd) === 260 && split.fee === 936 && kept === 795,
    j({ fees: [x.pa, x.pc, x.pb, x.pd].map(feeOf), F: split.fee, kept }));
  const sumBases = [...bases.values()].reduce((s, v) => s + v, 0);
  ok("2.3 · ★ the bases sum to levySplit(F).operatorNet EXACTLY (795) — never a shilling of a fee the house did not keep",
    bases.size === 4 && sumBases === kept && sumBases === 795, j({ sumBases, kept, size: bases.size }));
  const pinned = [x.pa, x.pc, x.pb, x.pd].map((id) => bases.get(id));
  ok("2.4 · ★ …each is its largest-remainder share of 795 BY ITS OWN FEE, ties by id — A 155 · C 110 · B 309 · D 221 — and an independent integer oracle agrees",
    j(pinned) === j([155, 110, 309, 221]) && [x.pa, x.pc, x.pb, x.pd].every((id) => oracle.get(id) === bases.get(id)),
    j({ engine: pinned, oracle: [x.pa, x.pc, x.pb, x.pd].map((id) => oracle.get(id)) }));
  const grossA = Math.floor((bases.get(x.pa) ?? NaN) * RATE);
  const grossB = Math.floor((bases.get(x.pb) ?? NaN) * RATE);
  shareGross = { a: grossA, b: grossB };
  const rows = new Map(((await w.mdal.positionStore.listForMarket(m.id)) as Any[]).map((p) => [p.id, p]));
  const ra = await rowOf(m.id, x.pa), rb = await rowOf(m.id, x.pb);
  ok("2.5 · ★ the WINNING recruit accrues floor(20% × its base 155) = 31, on its own fee — and its row states that fee (182)",
    grossA === 31 && rowIs(ra, grossA) && (rows.get(x.pa) as Any)?.status === "WIN" && (rows.get(x.pa) as Any)?.feeTzs === 182,
    `${show(ra)} vs gross ${grossA} · position ${j(rows.get(x.pa) && { s: (rows.get(x.pa) as Any).status, fee: (rows.get(x.pa) as Any).feeTzs })}`);
  ok("2.6 · ★ the LOSING recruit accrues floor(20% × its base 309) = 61, on its own fee (364) — paid nothing, its fee funded us",
    grossB === 61 && rowIs(rb, grossB) && (rows.get(x.pb) as Any)?.status === "LOSS" && (rows.get(x.pb) as Any)?.feeTzs === 364,
    `${show(rb)} vs gross ${grossB}`);
  // ⛔ THE TWO LAWS IT MUST NOT BE, on the same book — each visibly different, so 2.5 / 2.6 can fail.
  const pool = fresh.yesPool + fresh.noPool;
  const proA = Math.floor(((1_400 / pool) * kept) * RATE);
  ok("2.7 · CONTROL · pro-rata BY STAKE (the older models' formula) would pay the winner 30 — not what the row holds",
    proA === 30 && ra?.grossAmountTzs !== proA, j({ proA }));
  const draftSum = [x.pa, x.pc, x.pb, x.pd].reduce((s, id) => s + P.levySplit(feeOf(id), fresh.feeSnapshot).operatorNet, 0);
  const draftB = Math.floor(P.levySplit(364, fresh.feeSnapshot).operatorNet * RATE);
  ok("2.8 · CONTROL · the first draft's levySplit(own fee) per position sums to 796 — MORE than the 795 kept — and would pay the loser 62",
    draftSum === 796 && draftSum > kept && draftB === 62 && rb?.grossAmountTzs !== draftB, j({ draftSum, kept, draftB }));
  ok("2.9 · the outsiders' shares (110 + 221) exist and are never accrued — and never handed to a recruit: exactly the two recruits' rows",
    (await rowOf(m.id, x.pc)) === null && (await rowOf(m.id, x.pd)) === null && (await commissionRowsFor(m.id)).length === 2
      && (bases.get(x.pc) ?? 0) + (bases.get(x.pd) ?? 0) === 331);
}

// ═══ §3 · the winnings tax is never in the base ══════════════════════════════════════════════════════════════════════
console.log("\n§3 · ⛔ the winnings tax is never in the base");
{
  const m = await market("stake-share", "Agent attribution · stake-share at a 30% tax", 0.30);
  ok("3.0 · the market froze stake-share with a 30% tax", m.feeSnapshot?.feeModel === "stake-share" && m.feeSnapshot?.winningsTaxRate === 0.30, j(m.feeSnapshot));
  const x = await book(m.id);
  const fresh = await w.svc.getMarket(m.id);
  const at = (rate: number) => P.stakeShareTotals(fresh.yesPool, fresh.noPool, "YES", { ...fresh.feeSnapshot, winningsTaxRate: rate });
  const settled = await resolveAndSettle(m.id, "YES");
  ok("3.1 · settleMarket settles it", settled.ok === true, j(settled));
  ok("3.2 · fixture · the tax doubles with the rate (626 at 15%, 1,253 at 30%) while the fee F stays 936",
    at(0.15).winningsTax === 626 && at(0.30).winningsTax === 1_253 && at(0.15).fee === 936 && at(0.30).fee === 936,
    j({ t15: at(0.15).winningsTax, t30: at(0.30).winningsTax }));
  const ra = await rowOf(m.id, x.pa), rb = await rowOf(m.id, x.pb);
  ok("3.3 · ★ …and both recruits accrue EXACTLY what they accrued at 15% (31 / 61): the tax is not in the base",
    rowIs(ra, 31) && rowIs(rb, 61) && shareGross.a === 31 && shareGross.b === 61, `${show(ra)} · ${show(rb)}`);
  const rows = new Map(((await w.mdal.positionStore.listForMarket(m.id)) as Any[]).map((p) => [p.id, p]));
  const taxA = Number((rows.get(x.pa) as Any)?.winningsTaxTzs);
  const taxC = Number((rows.get(x.pc) as Any)?.winningsTaxTzs);
  // A base that let the withheld tax in — the winners' weights fee + tax — would hand A a far larger share of the 795.
  const taxedWeight = (182 + taxA) + (130 + taxC) + 364 + 260;
  const taxedA = Math.floor(Math.floor((795 * (182 + taxA)) / taxedWeight) * RATE);
  ok("3.4 · CONTROL · a base that let the winners' withheld tax into the weights would pay A a different figure — so 3.3 can fail",
    Number.isSafeInteger(taxA) && taxA > 0 && Number.isSafeInteger(taxC) && taxC > 0 && taxedA !== 31, j({ taxA, taxC, taxedA }));
}

// ═══ §4 · a void claws back; a refund accrues nothing ════════════════════════════════════════════════════════════════
console.log("\n§4 · a VOID claws back what stands against it; a refund accrues nothing");
{
  const m = await market("stake-share", "Agent attribution · stake-share voided");
  const x = await book(m.id);
  // AN ACCRUAL ALREADY STANDING against the market — what an earlier pass, or a verdict later reversed, leaves behind.
  // Planted through the real hook with the base §2 priced, so it is exactly the row a settlement would have written.
  const before = await cashOf(AGENT);
  await onRecruitSettlement(x.a, { operatorNetFee: 155, marketId: m.id, positionId: x.pa, houseBotId: null });
  const planted = await rowOf(m.id, x.pa);
  ok("4.1 · fixture · the standing accrual landed: PAID, gross 31, the agent's cash up by its net",
    rowIs(planted, 31) && (await cashOf(AGENT)) === before + netAfterWht(31), `${show(planted)} · cash ${await cashOf(AGENT)} vs ${before}`);
  const stakesBack = new Map<string, number>();
  for (const u of [x.a, x.b, x.c, x.d]) stakesBack.set(u, Number((await db.wallet.findByUserId(u))?.balance));
  const settled = await resolveAndSettle(m.id, "VOID");
  ok("4.2 · the VOID settles, every stake refunded in full", settled.ok === true
    && (await Promise.all([[x.a, 1_400], [x.b, 2_800], [x.c, 1_000], [x.d, 2_000]].map(async ([u, s]) =>
      Number((await db.wallet.findByUserId(u as string))?.balance) - (stakesBack.get(u as string) ?? NaN) === s))).every(Boolean),
    j(settled));
  const after = await rowOf(m.id, x.pa);
  ok("4.3 · ★ the standing accrual is REVERSED by the settlement, with its reason, and the agent's cash is back where it was",
    after?.status === "REVERSED" && after?.reversedReason === "market voided at settlement" && (await cashOf(AGENT)) === before,
    `${j(after && { status: after.status, reason: after.reversedReason })} · cash ${await cashOf(AGENT)} vs ${before}`);
  ok("4.4 · …and the void itself accrued NOTHING: the losing recruit has no row, the market holds only the reversed one",
    (await rowOf(m.id, x.pb)) === null && (await commissionRowsFor(m.id)).length === 1);

  // A one-sided stake-share market: every stake refunded in full at no fee — nothing kept, nothing shared.
  const o = await market("stake-share", "Agent attribution · stake-share one-sided");
  const a = await recruit(), c = await outsider();
  const pa = await bet(a, o.id, "YES", 1_400);
  await bet(c, o.id, "YES", 1_000);
  const cashBefore = await cashOf(AGENT);
  const oSettled = await resolveAndSettle(o.id, "NO");
  ok("4.5 · a one-sided stake-share market is refunded and accrues nothing — no row, the agent's cash unmoved",
    oSettled.ok === true && (await rowOf(o.id, pa)) === null && (await commissionRowsFor(o.id)).length === 0 && (await cashOf(AGENT)) === cashBefore,
    j(oSettled));
}

ok("0.store · the suite ran on the memory store", w.onPostgres === false, `onPostgres ${w.onPostgres}`);
ok("0.gate · the fee-law gate is shut again — this process opened it only to stamp", gate.feeLawLive() === false);
console.log(`\nagent-settlement-attribution: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 && pass > 0 ? 0 : 1);
