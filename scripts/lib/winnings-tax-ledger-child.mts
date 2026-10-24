/**
 * ONE STORE'S RUN OF `test:winnings-tax-ledger` (FEE-TAX-2026-10, release R2 lane b) — started twice by the two-store
 * runner (`scripts/winnings-tax-ledger.test.mts`): on the memory store, then on a fresh scratch Postgres with every
 * migration applied. `HB_MONEY_STORE` names the store; every line printed carries it. `red:winnings-tax-ledger` runs the
 * memory child alone over each of its planted defects.
 *
 * WHAT IT HOLDS — the stake-share winnings tax, from the arithmetic to the rows:
 *   §1  PURE BUILDERS on `stakeShareSplit`'s own output (both stores; no database needed): every winner's group built the
 *       way `settleMarket` builds it — the payout and the tax from the split, the commission as each winner's
 *       largest-remainder share of the WHOLE fee F by stake, TRA/GBT over those shares — and then: every group balances;
 *       the POOL ends at exactly 0; the winnings-tax lines sum to T, sit on HOUSE:WINNINGS_TAX only (⛔ never a PLAYER
 *       leg, never HOUSE:TRA_LEVY, never HOUSE:TAX) and name their winner and payout row; each PLAYER line is the NET
 *       payout; the levies are levySplit(F) — on our fee, never on the tax. On the document's own example (both
 *       outcomes), odd stakes, a lopsided book and 400 generated markets.
 *   §2  CONTROLS — the four defects the red twin plants, built here in memory from a correct book (the tax booked from
 *       PLAYER, the tax booked to HOUSE:TRA_LEVY, the tax left in POOL, the payout booked gross): §1's checks must
 *       reject every one, so they are shown able to fail. And the older models' group is byte-for-byte what it was:
 *       no tax line, the pool debit = payout + commission. A fractional or negative tax is refused, never rounded.
 *   §3  A REAL SETTLEMENT through `settleMarket` (both stores): every figure the split names lands — the wallet credit,
 *       `BET_PAYOUT.amount` (= the wallet delta = the `balanceAfter` change), `taxWithheld`, `Position.feeTzs` /
 *       `winningsTaxTzs` on winners and losers, the `market.resolved` record's stake-share block; on Postgres the
 *       ledger rows themselves — each group balanced, the tax line on HOUSE:WINNINGS_TAX tied to its BET_PAYOUT row,
 *       HOUSE:WINNINGS_TAX = Σ taxWithheld = T, POOL = 0, the levies, the trial balance tying.
 *   §4  A RESUMED SETTLEMENT (some winners already WIN, a loser already LOSS — an earlier pass reproduced through the same
 *       builders): the deterministic split over WIN + OPEN reproduces every share, the paid winner is not paid again,
 *       and on Postgres the POOL still ends at exactly 0 and the trial balance ties.
 *   §5  WHAT IS NOT TAXED: a stake-share VOID and a one-sided stake-share market refund in full with no tax line, no fee
 *       figure on any row, and a VOID records the refund (fee 0, no levies); a loser-share market writes no tax line and
 *       leaves both position figures NULL.
 *
 * ⛔ The new law is not in force (`fee-law-gate.ts`): this process opens the gate IN ITSELF, through the test seam, only to
 * stamp the stake-share markets it settles, and shuts it again at the end.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.EMAIL_OUTBOX_CAPTURE = "1";
process.env.POSTMARK_API_KEY = "";
process.env.SMS_PROVIDER = "console";
process.env.UPDOWN_SCHEDULER = "false";
process.env.UPDOWN_HEALER = "false";
process.env.HOUSE_BOT_ENGINE = "false";

import { loadWorld } from "./house-bot-world.mts";
import { decomment } from "./decomment.mts";
import { readFileSync } from "node:fs";

type Any = any;
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const j = (v: unknown) => JSON.stringify(v);
const section = (s: string) => console.log(`\n── [${STORE}] ${s}`);

const P: Any = await import("../../src/lib/payout.ts");
const L: Any = await import("../../src/lib/server/ledger.ts");
const gate: Any = await import("../../src/lib/fee-law-gate.ts");

/** The law's own rates, as a stake-share snapshot freezes them (FEE-TAX-PLAN §3): 3% + 10% of every stake, 15% tax. */
const SS = {
  feeModel: "stake-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, winningsTaxRate: 0.15,
  commissionRate: 0.10, feeCeilingRate: 1 / 3, traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05,
};
const LEVIES = { traTaxOnCommissionRate: 0.10, gbtLevyOnCommissionRate: 0.05 };
const MKT = "mkt_wtl_pure";
type Stake = { id: string; stake: number };
type Line = { account: string; entryType: string; amount: number; txnId?: string; userId?: string; marketId?: string };

/**
 * Every winner's settlement group, built EXACTLY as `settleMarket` builds it for a stake-share market: payout and tax from
 * the split; commission = allocateFeeShares(winners by stake, F); TRA / GBT = allocateFeeShares(fee shares, levySplit(F)).
 */
function book(yes: Stake[], no: Stake[], outcome: "YES" | "NO", rates: Any = SS) {
  const yesPool = yes.reduce((s, p) => s + p.stake, 0), noPool = no.reduce((s, p) => s + p.stake, 0);
  const winners = outcome === "YES" ? yes : no, losers = outcome === "YES" ? no : yes;
  const split = P.stakeShareSplit({ yesPool, noPool, outcome, winners, losers }, rates);
  const winningPool = winners.reduce((s, p) => s + p.stake, 0);
  const feeByPos: Map<string, number> = P.allocateFeeShares(winners, winningPool, split.fee);
  const lev = P.levySplit(split.fee, rates);
  const feeRows = winners.map((w) => ({ id: w.id, stake: feeByPos.get(w.id) ?? 0 }));
  const tra: Map<string, number> = P.allocateFeeShares(feeRows, split.fee, lev.traLevy);
  const gbt: Map<string, number> = P.allocateFeeShares(feeRows, split.fee, lev.gbtLevy);
  const groups: Line[][] = winners.map((w) => L.settlementPayoutEntries({
    groupId: `settle_txn_${w.id}`, userId: `u_${w.id}`, marketId: MKT,
    payout: split.perWinner.get(w.id).payout, stake: w.stake, fee: split.fee, winningPool,
    commissionAmount: feeByPos.get(w.id) ?? 0, traLevyAmount: tra.get(w.id) ?? 0, gbtLevyAmount: gbt.get(w.id) ?? 0,
    winningsTaxAmount: split.perWinner.get(w.id).tax, txnId: `txn_${w.id}`,
    rates: LEVIES,
  }));
  return { split, groups, lev, pool: yesPool + noPool, winners };
}

/**
 * §1's checks over one book. Returns every reason it is WRONG — empty means correct — so §2 can assert that a planted
 * defect is rejected, by the same function that passes the correct book.
 */
function problems(b: ReturnType<typeof book>, groups: Line[][] = b.groups): string[] {
  const out: string[] = [];
  const all = groups.flat();
  const sum = (f: (l: Line) => boolean) => all.filter(f).reduce((s, l) => s + l.amount, 0);
  groups.forEach((g, i) => { const s = g.reduce((a, l) => a + l.amount, 0); if (s !== 0) out.push(`group ${i} sums to ${s}`); });
  // The stakes credited the pool `pool`; the groups' pool debits must take it to exactly 0.
  const poolEnd = b.pool + sum((l) => l.account === `POOL:${MKT}`);
  if (poolEnd !== 0) out.push(`POOL ends at ${poolEnd}`);
  const taxLines = all.filter((l) => l.entryType === "SETTLEMENT_WINNINGS_TAX");
  const taxOnAccount = sum((l) => l.account === "HOUSE:WINNINGS_TAX" && l.entryType === "SETTLEMENT_WINNINGS_TAX");
  if (taxOnAccount !== b.split.winningsTax) out.push(`HOUSE:WINNINGS_TAX holds ${taxOnAccount}, T is ${b.split.winningsTax}`);
  if (taxLines.some((l) => l.account !== "HOUSE:WINNINGS_TAX")) out.push(`a winnings-tax line sits on ${taxLines.filter((l) => l.account !== "HOUSE:WINNINGS_TAX").map((l) => l.account).join(",")}`);
  if (all.some((l) => l.account.startsWith("PLAYER:") && l.entryType === "SETTLEMENT_WINNINGS_TAX")) out.push("a PLAYER leg on the tax");
  if (all.some((l) => l.account === "HOUSE:TAX")) out.push("HOUSE:TAX touched at settlement");
  // Every winner's PLAYER line is exactly its split payout (the NET), and the tax line is exactly its split tax.
  b.winners.forEach((w, i) => {
    const part = b.split.perWinner.get(w.id);
    const g = groups[i] ?? [];
    const player = g.filter((l) => l.account.startsWith("PLAYER:")).reduce((s, l) => s + l.amount, 0);
    if (player !== part.payout) out.push(`winner ${w.id}: PLAYER line ${player}, the split pays ${part.payout}`);
    const tax = g.filter((l) => l.account === "HOUSE:WINNINGS_TAX").reduce((s, l) => s + l.amount, 0);
    if (tax !== part.tax) out.push(`winner ${w.id}: tax line ${tax}, the split withholds ${part.tax}`);
    const tl = g.find((l) => l.account === "HOUSE:WINNINGS_TAX");
    if (part.tax > 0 && (!tl || tl.txnId !== `txn_${w.id}` || tl.userId !== `u_${w.id}`)) out.push(`winner ${w.id}: the tax line does not name its winner and payout row`);
  });
  // The levies are on OUR fee F — exactly levySplit(F) — and the commission keeps exactly operatorNet.
  const tra = sum((l) => l.account === "HOUSE:TRA_LEVY"), gbt = sum((l) => l.account === "HOUSE:GBT_LEVY");
  if (tra !== b.lev.traLevy) out.push(`HOUSE:TRA_LEVY ${tra}, levySplit(F) says ${b.lev.traLevy}`);
  if (gbt !== b.lev.gbtLevy) out.push(`HOUSE:GBT_LEVY ${gbt}, levySplit(F) says ${b.lev.gbtLevy}`);
  const comm = sum((l) => l.account === "HOUSE:COMMISSION");
  if (comm !== b.lev.operatorNet) out.push(`HOUSE:COMMISSION nets ${comm}, operatorNet is ${b.lev.operatorNet}`);
  if (all.some((l) => l.entryType === "SETTLEMENT_TAX" || l.entryType === "WITHDRAWAL_TAX")) out.push("a dead tax entry type was written");
  return out;
}

const ids = (side: string, xs: number[]) => xs.map((stake, i) => ({ id: `${side}${String(i).padStart(3, "0")}`, stake }));

// ═══ §1 · THE PURE BUILDERS ON THE SPLIT'S OWN OUTPUT ═════════════════════════════════════════════════════════════════
section("§1 · the pure builders on the split's own output");
{
  // The document's example (FEE-TAX-PLAN §3): YES 1,000 / 3,000 / 5,000 against NO 10,000 / 20,000 / 5,000.
  const yes = ids("Y", [1_000, 3_000, 5_000]), no = ids("N", [10_000, 20_000, 5_000]);
  const doc = book(yes, no, "YES");
  ok("1.1 · the document's example, YES wins: T = 4,568 (15% of the losers' net 30,450 is 4,567.5, rounded half up) and F = 5,720",
    doc.split.winningsTax === 4_568 && doc.split.fee === 5_720 && doc.split.prizeFund === 30_450, j({ T: doc.split.winningsTax, F: doc.split.fee, P: doc.split.prizeFund }));
  ok("1.2 · …its three winners are paid 3,746 / 11,237 / 18,729 with 507 / 1,523 / 2,538 withheld",
    j([...doc.split.perWinner.values()].map((w: Any) => [w.payout, w.tax])) === j([[3_746, 507], [11_237, 1_523], [18_729, 2_538]]),
    j([...doc.split.perWinner.values()]));
  const docProblems = problems(doc);
  ok("1.3 · ★ every group balances, the POOL ends at 0, the tax lines sum to T on HOUSE:WINNINGS_TAX, no PLAYER leg, the levies are levySplit(F)",
    docProblems.length === 0, docProblems.join(" | "));
  const docNo = book(yes, no, "NO");
  ok("1.4 · the same pools, NO wins (T = 1,175 from 1,174.5): every check holds too", problems(docNo).length === 0 && docNo.split.winningsTax === 1_175,
    `${problems(docNo).join(" | ")} T=${docNo.split.winningsTax}`);
  // The independent review's book (odd stakes, ties broken by id).
  const odd = book(ids("Y", [1_005, 1_337, 999]), ids("N", [500, 500, 1_337]), "YES");
  ok("1.5 · odd stakes (YES 1,005 / 1,337 / 999 against NO 500 / 500 / 1,337): every check holds, payouts 1,395 / 1,854 / 1,386",
    problems(odd).length === 0 && j([...odd.split.perWinner.values()].map((w: Any) => w.payout)) === j([1_395, 1_854, 1_386]),
    `${problems(odd).join(" | ")} ${j([...odd.split.perWinner.values()].map((w: Any) => w.payout))}`);
  // A lopsided book — the winner is paid BELOW its stake (ruling 1) and the books still close exactly.
  const lop = book(ids("Y", [100_000]), ids("N", [10_000]), "YES");
  ok("1.6 · a lopsided book (100,000 against 10,000): the winner is paid 94,395 — below its stake, above its net stake — and the books close",
    problems(lop).length === 0 && lop.split.perWinner.get("Y000").payout === 94_395 && lop.split.perWinner.get("Y000").payout >= 100_000 - lop.split.perWinner.get("Y000").fee,
    `${problems(lop).join(" | ")} ${j(lop.split.perWinner.get("Y000"))}`);
  // 400 generated markets — seeded, so a failure reproduces. 1–8 positions a side, whole stakes 500 … 60,000.
  // Park–Miller: every product stays below 2^53, so the sequence is exact on every machine.
  let seed = 20_261_024;
  const rnd = (n: number) => { seed = (seed * 48_271) % 2_147_483_647; return seed % n; };
  const bad: string[] = [];
  let taxed = 0;
  for (let k = 0; k < 400 && bad.length < 3; k++) {
    const side = () => Array.from({ length: 1 + rnd(8) }, () => 500 + rnd(59_501));
    const b = book(ids(`a${k}_`, side()), ids(`b${k}_`, side()), rnd(2) === 0 ? "YES" : "NO");
    const ps = problems(b);
    if (ps.length) bad.push(`market ${k}: ${ps.join("; ")}`);
    taxed += b.split.winningsTax;
  }
  ok("1.7 · ★ 400 generated markets: every group balances, every POOL ends at 0, every tax column sums to its T on the right account",
    bad.length === 0 && taxed > 0, bad.join(" | ") || `Σ T over the population ${taxed}`);
}

// ═══ §2 · CONTROLS — the checks can fail, and the older models are untouched ══════════════════════════════════════════
section("§2 · controls: each planted defect is rejected; the older models' group is what it was; a broken tax is refused");
{
  const b = book(ids("Y", [1_000, 3_000, 5_000]), ids("N", [10_000, 20_000, 5_000]), "YES");
  const clone = () => b.groups.map((g) => g.map((l) => ({ ...l })));
  const taxOf = (g: Line[]) => g.find((l) => l.account === "HOUSE:WINNINGS_TAX")?.amount ?? 0;
  // (a) the tax booked FROM THE PLAYER: the pool gives up only payout + commission, the player's line is the payout less the
  // tax, the tax account is credited — a group that BALANCES, and the defect the trial balance exists for.
  const fromPlayer = clone().map((g) => { const t = taxOf(g); return g.map((l) => l.account.startsWith("POOL:") ? { ...l, amount: l.amount + t } : l.account.startsWith("PLAYER:") ? { ...l, amount: l.amount - t } : l); });
  // (b) the tax booked to HOUSE:TRA_LEVY — a levy on revenue never earned.
  const toLevy = clone().map((g) => g.map((l) => l.account === "HOUSE:WINNINGS_TAX" ? { ...l, account: "HOUSE:TRA_LEVY" } : l));
  // (c) the tax LEFT IN POOL: no tax line, and the pool debit stops at payout + commission — balanced, and a residual.
  const leftInPool = clone().map((g) => { const t = taxOf(g); return g.filter((l) => l.account !== "HOUSE:WINNINGS_TAX").map((l) => l.account.startsWith("POOL:") ? { ...l, amount: l.amount + t } : l); });
  // (d) the payout booked GROSS: the player credited payout + tax, the pool debited for it — no tax ever leaves for TRA.
  const gross = clone().map((g) => { const t = taxOf(g); return g.filter((l) => l.account !== "HOUSE:WINNINGS_TAX").map((l) => l.account.startsWith("PLAYER:") ? { ...l, amount: l.amount + t } : l); });
  for (const [label, planted] of [["(a) the tax booked from PLAYER", fromPlayer], ["(b) the tax booked to HOUSE:TRA_LEVY", toLevy], ["(c) the tax left in POOL", leftInPool], ["(d) the payout booked gross", gross]] as const) {
    const ps = problems(b, planted as Line[][]);
    ok(`2.1 · CONTROL · ${label} is REJECTED by §1's own checks`, ps.length > 0, ps.slice(0, 3).join(" | ") || "NOT REJECTED");
  }
  ok("2.2 · CONTROL · …and every planted book still BALANCES group by group — so the balance check alone could never have seen them",
    [fromPlayer, toLevy, leftInPool, gross].every((gs) => gs.every((g) => g.reduce((s, l) => s + l.amount, 0) === 0)));
  // The older models' group: no tax line, and exactly the shape it always had.
  const legacy: Line[] = L.settlementPayoutEntries({
    groupId: "settle_legacy", userId: "u_legacy", marketId: "mkt_legacy", payout: 3_740, stake: 2_000, fee: 260, winningPool: 2_000,
    commissionAmount: 260, traLevyAmount: 26, gbtLevyAmount: 13, rates: LEVIES,
  });
  ok("2.3 · the older models' group carries NO winnings-tax line and the pool gives up exactly payout + commission",
    !legacy.some((l) => l.entryType === "SETTLEMENT_WINNINGS_TAX" || l.account === "HOUSE:WINNINGS_TAX")
      && legacy.find((l) => l.account === "POOL:mkt_legacy")?.amount === -(3_740 + 260) && legacy.every((l) => l.txnId === undefined),
    j(legacy));
  const zero: Line[] = L.settlementPayoutEntries({
    groupId: "settle_zero", userId: "u_zero", marketId: "mkt_zero", payout: 1_000, stake: 1_000, fee: 0, winningPool: 1_000,
    commissionAmount: 0, traLevyAmount: 0, gbtLevyAmount: 0, winningsTaxAmount: 0, txnId: "txn_zero", rates: LEVIES,
  });
  ok("2.4 · a zero tax books no tax line at all", !zero.some((l) => l.account === "HOUSE:WINNINGS_TAX"), j(zero));
  const refused = (amount: number) => { try { L.settlementPayoutEntries({ groupId: "g", userId: "u", marketId: "m", payout: 1, stake: 1, fee: 0, winningPool: 1, commissionAmount: 0, winningsTaxAmount: amount, rates: LEVIES }); return false; } catch { return true; } };
  ok("2.5 · ⛔ a fractional, a negative or a NaN tax is REFUSED — never rounded into a tax nobody withheld",
    refused(1.5) && refused(-1) && refused(Number.NaN), `${refused(1.5)} ${refused(-1)} ${refused(Number.NaN)}`);
  ok("2.6 · the account is its own: HOUSE:WINNINGS_TAX, neither a levy account nor HOUSE:TAX",
    L.acct.winningsTax === "HOUSE:WINNINGS_TAX" && L.acct.winningsTax !== L.acct.traLevy && L.acct.winningsTax !== L.acct.tax);
}

// ═══ §2b · SOURCE PIN — settlement hands the split's tax to the builder (a memory store has no ledger to read) ═════════
section("§2b · the settlement passes each winner's tax to the ledger builder");
{
  const svc = decomment(readFileSync(new URL("../../src/lib/server/market-service.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n"));
  // Code-only bounds (the source is decommented): settleMarket up to the next export, `SettlementQueueRow`.
  const settle = svc.slice(svc.indexOf("export async function settleMarket("), svc.indexOf("export type SettlementQueueRow"));
  ok("2b.1 · settleMarket passes `winningsTaxAmount: sharePart.tax` and the payout row's id into `settlementPayoutEntries`",
    settle.length > 5_000 && /winningsTaxAmount:\s*sharePart\.tax,\s*txnId:\s*payoutTxnId/.test(settle));
  ok("2b.2 · …and credits the wallet with the split's NET payout (`part.payout`), never the gross",
    /payoutByPos = new Map\(\[\.\.\.shareSplit\.perWinner\]\.map\(\(\[id, part\]\) => \[id, part\.payout\] as const\)\)/.test(settle));
  ok("2b.3 · CONTROL · the pin can fail: a settlement that dropped the tax is not matched",
    !/winningsTaxAmount:\s*sharePart\.tax,\s*txnId:\s*payoutTxnId/.test(settle.replace("winningsTaxAmount: sharePart.tax, ", "")));
}

// ═══ §3 – §5 · REAL SETTLEMENTS ═══════════════════════════════════════════════════════════════════════════════════════
const w: Any = await loadWorld();
const { auditFlush, getAuditForTargetsDurable } = await import("../../src/lib/server/audit.ts");
const OFFICER = "usr_wtl_officer";
const sinceIso = new Date(Date.now() - 60_000).toISOString();

/** A stake-share market, stamped through the real `createMarket` with the law's rates as explicit overrides. */
async function stakeShareMarket(title: string): Promise<Any> {
  gate.__setFeeLawLiveForTest(true);
  try {
    return await w.svc.createMarket({
      titleEn: title, titleSw: `${title} (sw)`, category: "macro", sourceUrl: "https://bot.go.tz",
      resolutionCriterion: "Resolves at the official date.", resolutionAt: w.iso(7 * 864e5), proposedBy: OFFICER,
      rateOverrides: { feeModel: "stake-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, winningsTaxRate: 0.15, freeExitGraceMinutes: 0, paidExitWindowMinutes: 0 },
    });
  } finally {
    gate.__setFeeLawLiveForTest(null);
  }
}
/** Bets through the real `buyPosition`, one fresh funded player each. Returns the positions in placing order. */
async function bets(marketId: string, plan: Array<["YES" | "NO", number]>): Promise<Array<{ id: string; userId: string; side: "YES" | "NO"; stake: number }>> {
  const out = [];
  for (const [side, stake] of plan) {
    const userId = await w.user({ balance: 200_000 });
    const r = await w.svc.buyPosition(userId, { marketId, side, stake });
    if (!r.ok) throw new Error(`fixture bet refused: ${j(r)}`);
    out.push({ id: r.data.positionId, userId, side, stake });
  }
  return out;
}
async function resolve(marketId: string, outcome: "YES" | "NO" | "VOID"): Promise<void> {
  const r = await w.svc.resolveMarket({ marketId, outcome, officerId: OFFICER });
  if (r.ok && r.data?.stage === "stage1") await w.svc.resolveMarket({ marketId, outcome, officerId: `${OFFICER}_b` });
  else if (!r.ok) throw new Error(`fixture resolve refused: ${j(r)}`);
}
/** The split the settlement must pay, computed independently from the market's own pools and position ids. */
async function expectedSplit(marketId: string, outcome: "YES" | "NO"): Promise<Any> {
  const m = await w.svc.getMarket(marketId);
  const ps = await w.mdal.positionStore.listForMarket(marketId);
  const live = ps.filter((p: Any) => ["OPEN", "WIN", "LOSS"].includes(p.status));
  return P.stakeShareSplit({
    yesPool: m.yesPool, noPool: m.noPool, outcome,
    winners: live.filter((p: Any) => p.side === outcome).map((p: Any) => ({ id: p.id, stake: p.stake })),
    losers: live.filter((p: Any) => p.side !== outcome).map((p: Any) => ({ id: p.id, stake: p.stake })),
  }, SS);
}
const balanceOf = async (uid: string) => Number((await w.db.wallet.findByUserId(uid))?.balance ?? NaN);
const payoutTxns = async (uid: string) => ((await w.db.txn.listForUser(uid)) as Any[]).filter((t) => t.type === "BET_PAYOUT");
/** Postgres: this market's ledger lines. */
const ledgerOf = async (marketId: string): Promise<Line[]> => {
  if (!w.onPostgres) return [];
  const rows: Any[] = await w.prisma()!.ledgerEntry.findMany({ where: { marketId } });
  return rows.map((r: Any) => ({ account: r.account, entryType: String(r.entryType), amount: Number(r.amount), txnId: r.txnId ?? undefined, userId: r.userId ?? undefined, marketId: r.marketId ?? undefined, groupId: r.groupId } as Any));
};

// ── §3 · the document's example, settled for real ────────────────────────────────────────────────────────────────────
section("§3 · a real stake-share settlement writes every figure the split names");
{
  const m = await stakeShareMarket("Winnings tax ledger · the document's example");
  ok("3.0 · the market froze stake-share with its 15% tax (v3)", m.feeSnapshot?.feeModel === "stake-share" && m.feeSnapshot?.winningsTaxRate === 0.15 && m.feeSnapshot?.v === 3, j(m.feeSnapshot));
  const placed = await bets(m.id, [["YES", 1_000], ["YES", 3_000], ["YES", 5_000], ["NO", 10_000], ["NO", 20_000], ["NO", 5_000]]);
  const before = new Map<string, number>();
  for (const p of placed) before.set(p.userId, await balanceOf(p.userId));
  await resolve(m.id, "YES");
  const expected = await expectedSplit(m.id, "YES");
  const settled = await w.svc.settleMarket(m.id, { force: true, actorId: OFFICER });
  ok("3.1 · settleMarket settles it", settled.ok && settled.data?.positionsSettled === 6, j(settled));
  const rows = await w.mdal.positionStore.listForMarket(m.id);
  const byId = new Map(rows.map((p: Any) => [p.id, p]));
  let winnersRight = 0, losersRight = 0, txnsRight = 0;
  const detail: string[] = [];
  for (const p of placed) {
    const row: Any = byId.get(p.id);
    const delta = (await balanceOf(p.userId)) - (before.get(p.userId) ?? NaN);
    if (p.side === "YES") {
      const part = expected.perWinner.get(p.id);
      if (row.status === "WIN" && row.finalPayout === part.payout && row.feeTzs === part.fee && row.winningsTaxTzs === part.tax && delta === part.payout) winnersRight++;
      else detail.push(`winner ${p.stake}: ${j({ status: row.status, finalPayout: row.finalPayout, feeTzs: row.feeTzs, tax: row.winningsTaxTzs, delta })} vs ${j(part)}`);
      const t = await payoutTxns(p.userId);
      if (t.length === 1 && t[0].amount === part.payout && t[0].taxWithheld === part.tax && t[0].fee === 0 && t[0].balanceAfter === before.get(p.userId)! + part.payout && t[0].positionId === p.id) txnsRight++;
      else detail.push(`txn ${p.stake}: ${j(t.map((x: Any) => ({ amount: x.amount, tax: x.taxWithheld, fee: x.fee, balanceAfter: x.balanceAfter })))}`);
    } else {
      const lost = expected.perLoser.get(p.id);
      if (row.status === "LOSS" && row.finalPayout === 0 && row.feeTzs === lost.fee && row.winningsTaxTzs === 0 && delta === 0) losersRight++;
      else detail.push(`loser ${p.stake}: ${j({ status: row.status, feeTzs: row.feeTzs, tax: row.winningsTaxTzs, delta })} vs ${j(lost)}`);
    }
  }
  ok("3.2 · ★ every winner: wallet credit = finalPayout = the split's NET payout, and its own fee and withheld tax on the row",
    winnersRight === 3, detail.join(" | "));
  ok("3.3 · ★ every BET_PAYOUT: amount = the wallet delta = the balanceAfter change, taxWithheld = the split's tax, fee 0",
    txnsRight === 3, detail.join(" | "));
  ok("3.4 · every loser: LOSS, paid nothing, its own fee on the row, winningsTaxTzs 0", losersRight === 3, detail.join(" | "));
  const paid = rows.filter((p: Any) => p.status === "WIN").reduce((s: number, p: Any) => s + p.finalPayout, 0);
  ok("3.5 · Σ payouts + T + F = the pool, exactly (33,712 + 4,568 + 5,720 = 44,000)",
    paid + expected.winningsTax + expected.fee === 44_000 && paid === 33_712, `${paid} + ${expected.winningsTax} + ${expected.fee}`);
  await auditFlush();
  const audit: Any[] = (await getAuditForTargetsDurable({ targetType: "Market", targetIds: [m.id], actions: ["market.resolved"], sinceIso })).entries;
  const rec: Any = audit[0]?.payload ?? null;
  // ⚠️ Field by field, never one JSON string: Postgres stores the payload as JSONB, which does not keep key order.
  const want: Record<string, unknown> = { feeBp: 1_300, winningsTaxBp: 1_500, refunded: false, fee: 5_720, feeYes: 1_170, feeNo: 4_550, prizeFund: 30_450, winningsTax: 4_568, netPool: 33_712 };
  const got: Record<string, unknown> = rec?.stakeShare ?? {};
  ok("3.6 · ★ the tamper-evident market.resolved row names the model and every figure of the split: f, t, F, F_YES, F_NO, P, T, netPool",
    !!rec && rec.payoutModel === "whole-pool-stake-share" && rec.rates?.feeModel === "stake-share" && rec.rates?.winningsTaxRate === 0.15
      && Object.keys(want).every((k) => got[k] === want[k]) && Object.keys(got).length === Object.keys(want).length,
    j(rec && { payoutModel: rec.payoutModel, rates: rec.rates, stakeShare: rec.stakeShare }));
  const lev = P.levySplit(5_720, LEVIES);
  ok("3.7 · …and its levies are levySplit(F) — 572 / 286 / 4,862 — the tax is never in their base",
    !!rec && rec.fee === 5_720 && rec.levies?.traLevy === lev.traLevy && rec.levies?.gbtLevy === lev.gbtLevy && rec.levies?.operatorNet === lev.operatorNet && lev.traLevy === 572 && lev.gbtLevy === 286,
    j(rec?.levies));
  if (w.onPostgres) {
    const lines = await ledgerOf(m.id);
    const groups = new Map<string, Line[]>();
    for (const l of lines as Any[]) groups.set(l.groupId, [...(groups.get(l.groupId) ?? []), l]);
    const unbalanced = [...groups].filter(([, g]) => Math.abs(g.reduce((s, l) => s + l.amount, 0)) > 0.001).map(([g]) => g);
    ok("3.8 · Postgres · every ledger group of the market balances", groups.size > 0 && unbalanced.length === 0, unbalanced.join(", "));
    const pool = lines.filter((l) => l.account === `POOL:${m.id}`).reduce((s, l) => s + l.amount, 0);
    ok("3.9 · ★ Postgres · POOL:<market> ends at EXACTLY 0 — no dust, no residual, no tax left behind", pool === 0, `POOL ${pool}`);
    const taxLines = lines.filter((l) => l.entryType === "SETTLEMENT_WINNINGS_TAX");
    const taxTotal = taxLines.reduce((s, l) => s + l.amount, 0);
    let withheld = 0;
    const tied: string[] = [];
    for (const p of placed.filter((x) => x.side === "YES")) {
      const t = (await payoutTxns(p.userId))[0];
      withheld += t?.taxWithheld ?? 0;
      const line = taxLines.find((l) => l.txnId === t?.id);
      if (!line || line.amount !== t.taxWithheld || line.userId !== p.userId || line.account !== "HOUSE:WINNINGS_TAX") tied.push(p.id);
    }
    ok("3.10 · ★ Postgres · HOUSE:WINNINGS_TAX = Σ BET_PAYOUT.taxWithheld = T (4,568), each tax line tied to its payout row and its winner",
      taxTotal === withheld && taxTotal === 4_568 && tied.length === 0 && taxLines.every((l) => l.account === "HOUSE:WINNINGS_TAX"),
      `lines ${taxTotal} · withheld ${withheld} · untied ${tied.join(",")}`);
    ok("3.11 · Postgres · ⛔ no winnings-tax line on a PLAYER account, none on HOUSE:TRA_LEVY or HOUSE:TAX",
      !lines.some((l) => l.entryType === "SETTLEMENT_WINNINGS_TAX" && l.account !== "HOUSE:WINNINGS_TAX") && !lines.some((l) => l.account === "HOUSE:TAX"));
    const sumAt = (a: string) => lines.filter((l) => l.account === a).reduce((s, l) => s + l.amount, 0);
    ok("3.12 · Postgres · the levies booked are levySplit(F) and HOUSE:COMMISSION keeps operatorNet",
      sumAt("HOUSE:TRA_LEVY") === lev.traLevy && sumAt("HOUSE:GBT_LEVY") === lev.gbtLevy && sumAt("HOUSE:COMMISSION") === lev.operatorNet,
      j({ tra: sumAt("HOUSE:TRA_LEVY"), gbt: sumAt("HOUSE:GBT_LEVY"), comm: sumAt("HOUSE:COMMISSION") }));
    const fresh: Any[] = await w.prisma()!.position.findMany({ where: { marketId: m.id } });
    ok("3.13 · Postgres · the two figures PERSIST on the rows (the settlement write is an update — both upsert arms carry them)",
      fresh.length === 6 && fresh.every((r: Any) => r.feeTzs != null && r.winningsTaxTzs != null)
        && fresh.filter((r: Any) => r.status === "WIN").reduce((s: number, r: Any) => s + Number(r.winningsTaxTzs), 0) === 4_568,
      j(fresh.map((r: Any) => [r.status, r.feeTzs, r.winningsTaxTzs])));
    const tb: Any = await L.trialBalance();
    ok("3.14 · ★ Postgres · the trial balance ties — every PLAYER ledger = its wallet, global Σ 0, no imbalanced group", tb.ok === true,
      j({ drifting: tb.driftingWallets, globalSum: tb.globalSum, imbalanced: tb.imbalancedGroups?.length, worst: tb.worst }));
  }
}

// ── §4 · a resumed settlement ─────────────────────────────────────────────────────────────────────────────────────────
section("§4 · a resumed settlement reproduces every share");
{
  const m = await stakeShareMarket("Winnings tax ledger · resumed");
  const placed = await bets(m.id, [["YES", 1_005], ["YES", 1_337], ["YES", 999], ["NO", 500], ["NO", 500], ["NO", 1_337]]);
  await resolve(m.id, "YES");
  const expected = await expectedSplit(m.id, "YES");
  // THE EARLIER PASS, reproduced through the same builders settlement uses: the first winner paid in full (wallet, WIN with
  // its figures, BET_PAYOUT, its ledger group) and the first loser marked LOSS with its fee — then the process "died".
  const first = placed[0], firstLoser = placed[3];
  const fresh = await w.svc.getMarket(m.id);
  const winners = placed.filter((p) => p.side === "YES").map((p) => ({ id: p.id, stake: p.stake }));
  const winningPool = fresh.yesPool;
  const feeByPos: Map<string, number> = P.allocateFeeShares(winners, winningPool, expected.fee);
  const lev = P.levySplit(expected.fee, LEVIES);
  const feeRows = winners.map((x) => ({ id: x.id, stake: feeByPos.get(x.id) ?? 0 }));
  const tra: Map<string, number> = P.allocateFeeShares(feeRows, expected.fee, lev.traLevy);
  const gbt: Map<string, number> = P.allocateFeeShares(feeRows, expected.fee, lev.gbtLevy);
  const part = expected.perWinner.get(first.id);
  const wal = await w.db.wallet.findByUserId(first.userId);
  const credited = await w.db.wallet.adjust(wal.id, { balance: part.payout });
  const row: Any = await w.mdal.positionStore.get(first.id);
  row.status = "WIN"; row.finalPayout = part.payout; row.settledAt = new Date().toISOString(); row.feeTzs = part.fee; row.winningsTaxTzs = part.tax;
  await w.mdal.positionStore.set(row);
  const txnId = `txn_wtl_resume_${process.pid}`;
  await w.db.txn.create({
    id: txnId, walletId: wal.id, userId: first.userId, type: "BET_PAYOUT", status: "CONFIRMED", amount: part.payout, fee: 0, taxWithheld: part.tax,
    balanceAfter: credited.balance, currency: "TZS", provider: "INTERNAL", providerRef: null, msisdn: null, description: "YES won · resumed fixture",
    positionId: first.id, amlReason: null, createdAt: row.settledAt, updatedAt: row.settledAt, completedAt: row.settledAt,
  });
  await L.postLedgerEntries(`settle_${txnId}`, L.settlementPayoutEntries({
    groupId: `settle_${txnId}`, userId: first.userId, marketId: m.id, payout: part.payout, stake: first.stake, fee: expected.fee, winningPool,
    commissionAmount: feeByPos.get(first.id) ?? 0, traLevyAmount: tra.get(first.id) ?? 0, gbtLevyAmount: gbt.get(first.id) ?? 0,
    winningsTaxAmount: part.tax, txnId, rates: LEVIES,
  }));
  const lrow: Any = await w.mdal.positionStore.get(firstLoser.id);
  lrow.status = "LOSS"; lrow.finalPayout = 0; lrow.settledAt = row.settledAt; lrow.feeTzs = expected.perLoser.get(firstLoser.id).fee; lrow.winningsTaxTzs = 0;
  await w.mdal.positionStore.set(lrow);
  const paidBefore = await balanceOf(first.userId);
  const others = new Map<string, number>();
  for (const p of placed.slice(1)) others.set(p.userId, await balanceOf(p.userId));

  const resumed = await w.svc.settleMarket(m.id, { force: true, actorId: OFFICER });
  ok("4.1 · the resumed settlement completes", resumed.ok, j(resumed));
  const rows = new Map((await w.mdal.positionStore.listForMarket(m.id)).map((p: Any) => [p.id, p]));
  const wrong: string[] = [];
  for (const p of placed.slice(1)) {
    const r: Any = rows.get(p.id);
    const delta = (await balanceOf(p.userId)) - (others.get(p.userId) ?? NaN);
    if (p.side === "YES") {
      const x = expected.perWinner.get(p.id);
      if (!(r.status === "WIN" && r.finalPayout === x.payout && r.feeTzs === x.fee && r.winningsTaxTzs === x.tax && delta === x.payout)) wrong.push(`${p.id} ${j({ s: r.status, f: r.finalPayout, fee: r.feeTzs, t: r.winningsTaxTzs, delta })} vs ${j(x)}`);
    } else {
      const x = expected.perLoser.get(p.id);
      if (!(r.status === "LOSS" && r.feeTzs === x.fee && delta === 0)) wrong.push(`${p.id} ${j({ s: r.status, fee: r.feeTzs, delta })} vs ${j(x)}`);
    }
  }
  ok("4.2 · ★ every share the resumed pass paid is the share the split names over WIN + OPEN — to the shilling", wrong.length === 0, wrong.join(" | "));
  ok("4.3 · the winner the earlier pass paid is NOT paid again", (await balanceOf(first.userId)) === paidBefore && (await payoutTxns(first.userId)).length === 1,
    `${await balanceOf(first.userId)} vs ${paidBefore}`);
  if (w.onPostgres) {
    const lines = await ledgerOf(m.id);
    const pool = lines.filter((l) => l.account === `POOL:${m.id}`).reduce((s, l) => s + l.amount, 0);
    const tax = lines.filter((l) => l.account === "HOUSE:WINNINGS_TAX").reduce((s, l) => s + l.amount, 0);
    ok("4.4 · ★ Postgres · after the resume the POOL still ends at exactly 0 and HOUSE:WINNINGS_TAX holds exactly T",
      pool === 0 && tax === expected.winningsTax, `POOL ${pool} · tax ${tax} vs T ${expected.winningsTax}`);
    const tb: Any = await L.trialBalance();
    ok("4.5 · Postgres · the trial balance still ties", tb.ok === true, j({ drifting: tb.driftingWallets, worst: tb.worst }));
  }
}

// ── §5 · what is not taxed ────────────────────────────────────────────────────────────────────────────────────────────
section("§5 · a VOID, a one-sided market and an older model withhold nothing");
{
  // A stake-share VOID: every stake back, no tax line, no fee figure on any row, and the record states the refund.
  const v = await stakeShareMarket("Winnings tax ledger · void");
  const vb = await bets(v.id, [["YES", 2_000], ["NO", 3_000]]);
  const vBefore = new Map<string, number>();
  for (const p of vb) vBefore.set(p.userId, await balanceOf(p.userId));
  await resolve(v.id, "VOID");
  const vs = await w.svc.settleMarket(v.id, { force: true, actorId: OFFICER });
  const vRows = await w.mdal.positionStore.listForMarket(v.id);
  const refundedAll = await Promise.all(vb.map(async (p) => (await balanceOf(p.userId)) - (vBefore.get(p.userId) ?? NaN) === p.stake));
  ok("5.1 · a stake-share VOID refunds every stake in full (ruling 2), and writes no fee or tax figure on any row",
    vs.ok && refundedAll.every(Boolean) && vRows.every((p: Any) => p.status === "VOID" && p.finalPayout === p.stake && p.feeTzs == null && p.winningsTaxTzs == null),
    j(vRows.map((p: Any) => [p.status, p.finalPayout, p.feeTzs, p.winningsTaxTzs])));
  await auditFlush();
  const vRec: Any = (await getAuditForTargetsDurable({ targetType: "Market", targetIds: [v.id], actions: ["market.resolved"], sinceIso })).entries[0]?.payload ?? null;
  ok("5.2 · ★ its market.resolved row records the REFUND — fee 0, no levies, no tax — never the F a fee-before-outcome would state",
    !!vRec && vRec.payoutModel === "whole-pool-stake-share" && vRec.fee === 0 && vRec.levies?.traLevy === 0 && vRec.levies?.gbtLevy === 0
      && vRec.stakeShare?.refunded === true && vRec.stakeShare?.fee === 0 && vRec.stakeShare?.winningsTax === 0,
    j(vRec && { fee: vRec.fee, levies: vRec.levies, stakeShare: vRec.stakeShare }));
  // A one-sided stake-share market resolved against its money: refunded in full, nothing withheld.
  const o = await stakeShareMarket("Winnings tax ledger · one-sided");
  const ob = await bets(o.id, [["YES", 4_000], ["YES", 1_500]]);
  const oBefore = new Map<string, number>();
  for (const p of ob) oBefore.set(p.userId, await balanceOf(p.userId));
  await resolve(o.id, "NO");
  const os = await w.svc.settleMarket(o.id, { force: true, actorId: OFFICER });
  const oRows = await w.mdal.positionStore.listForMarket(o.id);
  const oBack = await Promise.all(ob.map(async (p) => (await balanceOf(p.userId)) - (oBefore.get(p.userId) ?? NaN) === p.stake));
  ok("5.3 · a one-sided stake-share market is refunded in full at no fee and no tax, the figures left NULL",
    os.ok && oBack.every(Boolean) && oRows.every((p: Any) => p.status === "VOID" && p.finalPayout === p.stake && p.feeTzs == null && p.winningsTaxTzs == null),
    j(oRows.map((p: Any) => [p.status, p.finalPayout, p.feeTzs])));
  // An older model: no tax anywhere, the figures NULL on every row.
  const ls = await w.svc.createMarket({
    titleEn: "Winnings tax ledger · loser-share", titleSw: "Soko la jaribio", category: "macro", sourceUrl: "https://bot.go.tz",
    resolutionCriterion: "Resolves at the official date.", resolutionAt: w.iso(7 * 864e5), proposedBy: OFFICER,
    rateOverrides: { feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, freeExitGraceMinutes: 0, paidExitWindowMinutes: 0 },
  });
  const lb = await bets(ls.id, [["YES", 2_000], ["NO", 2_000]]);
  await resolve(ls.id, "YES");
  const lsr = await w.svc.settleMarket(ls.id, { force: true, actorId: OFFICER });
  const lRows = await w.mdal.positionStore.listForMarket(ls.id);
  const lTxn = (await payoutTxns(lb[0].userId))[0];
  ok("5.4 · a loser-share market settles as it always has: the winner paid 3,740, taxWithheld 0, both figures NULL on every row",
    lsr.ok && lTxn?.amount === 3_740 && lTxn?.taxWithheld === 0 && lRows.every((p: Any) => p.feeTzs == null && p.winningsTaxTzs == null),
    j({ txn: lTxn && [lTxn.amount, lTxn.taxWithheld], rows: lRows.map((p: Any) => [p.status, p.feeTzs, p.winningsTaxTzs]) }));
  if (w.onPostgres) {
    const vLines = await ledgerOf(v.id), oLines = await ledgerOf(o.id), lLines = await ledgerOf(ls.id);
    ok("5.5 · Postgres · no winnings-tax line on the void, the one-sided market or the loser-share market",
      ![...vLines, ...oLines, ...lLines].some((l) => l.account === "HOUSE:WINNINGS_TAX" || l.entryType === "SETTLEMENT_WINNINGS_TAX"));
    const tb: Any = await L.trialBalance();
    ok("5.6 · Postgres · the trial balance ties over the whole run", tb.ok === true, j({ drifting: tb.driftingWallets, worst: tb.worst }));
  }
}

ok(`0.store · the cases ran on the ${STORE} store`, w.onPostgres === (STORE === "postgres"), `onPostgres ${w.onPostgres}`);
ok("0.gate · the fee-law gate is shut again — this process opened it only to stamp", gate.feeLawLive() === false);
console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
