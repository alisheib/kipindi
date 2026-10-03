/**
 * THE CASES BEHIND `test:cashout-price-guard` (Vodacom plan S6, A8c) — a sale is paid exactly the figure the player
 * confirmed, or nothing happens and the player is told why. `docs/VODACOM-PLAN.md` §0i (A8c) and §0h points 38 to 44.
 *
 * Run three ways, one case list: on the memory store AND on a fresh scratch Postgres by
 * `scripts/cashout-price-guard.test.mts` (each store in its own child, `scripts/lib/cashout-price-guard-child.mts`), and
 * in memory by `test:cashout`, which is in predeploy and has no cluster. `red:cashout-price-guard` plants the guard's
 * defects into the real service and requires the memory child to fail on each one's own assertion.
 *
 * ⭐ A PAGE'S SALE TAKES THE PAGE'S PATH. Every sale a Sell button would make goes through `cashOutPositionFromForm` — the
 * whole of `cashOutPositionAction` after its session check — with a real FormData carrying the figure as the button
 * writes it (`String(value)`), or no figure field at all (a page from before A8c). Only an internal caller's sale, and
 * the service's own fail-closed cases, call `cashOutPosition` directly. Nothing here imitates the money path.
 *
 * ⛔ "NOTHING MOVED" IS SEVEN OBSERVABLES, AND EACH IS PROVEN ABLE TO SEE A SALE IN THE SAME RUN. A refused sale is held
 * to: the wallet, both pools, the position (still OPEN, no final payout, no settled time), no CASHOUT transaction (and,
 * on Postgres, no cash-out line in the ledger), the bonus grant's turnover (no reversal), the odds pushed for the market,
 * and its chart. The sale that follows the refusals moves every one of them, so an observable that could not see a sale
 * fails there, in the same run, instead of passing every refusal by never looking.
 *
 * ⭐ AND EVERY REFUSED PRICE IS RECORDED. The page's path writes one `market.position.sell_refused` audit row per moved
 * price, short pool or broken figure, after the service has returned (outside both locks) — read back here on both
 * stores, beside a sale that writes none and a shut exit that writes none.
 *
 * Fixtures of time and state, each declared: `backdate` moves a placement into the past (the house-bot world's own,
 * used by every exit-window suite), and the short-pool case lowers one pool with the store's own atomic delta, standing
 * in for a pool that holds less than the sale's price — the broken invariant the conservation clamp exists for.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadWorld } from "./house-bot-world.mts";

type Any = any;
export type Ok = (label: string, cond: boolean, detail?: string) => void;

/** The stake every case bets, and what a sale pays for it in a paid window at these polls' frozen 10% exit fee. */
const STAKE = 10_000;
const PAID = 9_000;
const FEE = 1_000;
/** Past a 5-minute free window and inside a 15-minute paid one. */
const SIX_MINUTES = 6 * 60_000;
/** Today's words for a shut exit, byte for byte — A8c must leave them exactly as they were. */
const EXIT_CLOSED = "The sell-out window for this bet has closed — it now rides to settlement. · Muda wa kuuza dau hili umefungwa — litaenda hadi malipo.";
/** The record the page's path writes for a refused price or a broken figure (§0h point 44). */
const REFUSED_ROW = "market.position.sell_refused";
/** Figures no Sell button sends, each through the page's own path: grouped, signed, decimal, empty, a word, past the safe integers. */
const BROKEN = ["3,600", "-1", "1.5", "", "abc", "99999999999999999999"];

export async function runPriceGuardCases(ok: Ok): Promise<{ onPostgres: boolean }> {
  const w = await loadWorld();
  const { subscribe } = await import("../../src/lib/server/event-bus.ts");
  const { getHistory } = await import("../../src/lib/server/market-history.ts");
  const { creditBonus } = await import("../../src/lib/server/bonus-service.ts");
  const { trialBalance } = await import("../../src/lib/server/ledger.ts");
  const { auditFlush, getAuditForActorDurable } = await import("../../src/lib/server/audit.ts");

  const show = (r: Any) => (r?.ok ? `ok ${JSON.stringify(r.data ?? null)}` : `${r?.code ?? "?"}/${r?.reason ?? "no-reason"}${r?.detail ? ` ${JSON.stringify(r.detail)}` : ""}`);
  const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const num = (v: unknown) => (v == null ? null : Number(v));
  /**
   * A sale as a page's request makes it — `cashOutPositionAction`'s own path after the session check, with a real form:
   * the figure written as the Sell button writes it, or (`undefined`) no figure field at all, a page from before A8c.
   */
  const sell = (uid: string, pid: string, figure?: string): Promise<Any> => {
    const form = new FormData();
    form.set("positionId", pid);
    if (figure !== undefined) form.set("expectedValue", figure);
    return w.svc.cashOutPositionFromForm(uid, form);
  };
  /** The refused-sale records this player's own audit holds, once every queued append has landed (both stores). */
  const refusedRows = async (uid: string): Promise<Any[]> => {
    await auditFlush();
    const page: Any = await getAuditForActorDurable(uid, { limit: 1_000 });
    return (page.entries as Any[]).filter((e) => e.action === REFUSED_ROW);
  };
  const sorted = (xs: unknown[]) => xs.map((x) => JSON.stringify(x)).sort();

  // Every odds push this process makes, by market: the event a sale emits once it has moved a pool.
  const odds = new Map<string, number>();
  const stopOdds = subscribe("market:odds", (d: Any) => { odds.set(d.marketId, (odds.get(d.marketId) ?? 0) + 1); });
  const oddsOf = (mid: string) => odds.get(mid) ?? 0;

  /** A market's chart length once its writes have settled (a sale's snapshot is fire-and-forget, so it lands after the sale). */
  const chart = async (mid: string): Promise<number> => {
    let last = -1;
    for (let i = 0; i < 40; i++) {
      const n = (await getHistory(mid)).length;
      if (n === last) return n;
      last = n;
      await sleep(150);
    }
    return last;
  };
  /** The chart once it has grown past `n` and settled — waited for on the condition, never a guessed margin. */
  const chartPast = async (mid: string, n: number): Promise<number> => {
    for (let i = 0; i < 80 && (await getHistory(mid)).length <= n; i++) await sleep(150);
    return chart(mid);
  };

  /** Postgres: the cash-out lines on this player's ledger account (the group is posted after the credit, fire-and-forget). */
  const cashoutLines = async (uid: string): Promise<{ n: number; sum: number }> => {
    if (!w.onPostgres) return { n: 0, sum: 0 };
    const rows: Any[] = await w.prisma()!.$queryRawUnsafe(
      `SELECT count(*)::int AS "n", coalesce(sum("amount"), 0)::text AS "s" FROM "LedgerEntry" WHERE "account" = $1 AND "entryType"::text = 'CASHOUT'`,
      `PLAYER:${uid}`);
    return { n: Number(rows[0]?.n ?? 0), sum: Number(rows[0]?.s ?? 0) };
  };
  const cashoutLinesReach = async (uid: string, n: number) => {
    for (let i = 0; i < 80; i++) { const r = await cashoutLines(uid); if (r.n >= n) return r; await sleep(150); }
    return cashoutLines(uid);
  };

  /** Everything a sale moves, read at once. */
  const look = async (uid: string, pid: string, mid: string) => {
    const wal: Any = await w.bal(uid);
    const m: Any = await w.svc.getMarket(mid);
    const p: Any = await w.mdal.positionStore.get(pid);
    const grant: Any = (await w.db.bonusGrant.listByUser(uid))[0];
    const cashouts = (await w.txnsFor(pid)).filter((t: Any) => t.type === "CASHOUT");
    return {
      balance: num(wal?.balance), yesPool: num(m?.yesPool), noPool: num(m?.noPool),
      status: p?.status ?? null, finalPayout: num(p?.finalPayout), settledAt: p?.settledAt ?? null,
      wagered: num(grant?.wageredTzs), cashoutTxns: cashouts.length, ledgerLines: (await cashoutLines(uid)).n,
    };
  };

  /** A LIVE poll whose frozen rates the cases read: a 5-minute free window, then `paidMin` paid minutes at a 10% fee. */
  const poll = (paidMin: number): Promise<Any> => w.svc.createMarket({
    titleEn: "Sell price guard poll", titleSw: "Soko la jaribio", category: "macro", sourceUrl: "https://bot.go.tz",
    resolutionCriterion: "Resolves at the official date.", resolutionAt: w.iso(7 * 864e5), proposedBy: "usr_a8c_fixture",
    rateOverrides: { freeExitGraceMinutes: 5, paidExitWindowMinutes: paidMin, cashOutFeeRate: 0.1 },
  });

  /**
   * A player with cash and an ACTIVE bonus grant (5x), so the turnover a cash bet earns — and a sale's reversal of it — can
   * be read off the grant. ⚠️ The bonus wallet is withdrawn from the product, so a grant is minted only on its ON path
   * (`scripts/lib/bonus-feature-on.mts` explains why suites drive it): set for this one call and put back, so a suite
   * that imports these cases keeps whatever state it chose.
   */
  async function player(): Promise<string> {
    const uid = await w.user({ balance: 1_000_000 });
    const before = process.env.FEATURE_BONUS;
    process.env.FEATURE_BONUS = "ACTIVE";
    try {
      const g: Any = await creditBonus(uid, { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 });
      if (!g?.ok) throw new Error(`fixture grant refused: ${JSON.stringify(g)}`);
    } finally {
      if (before === undefined) delete process.env.FEATURE_BONUS;
      else process.env.FEATURE_BONUS = before;
    }
    return uid;
  }

  /** A 10,000 YES bet, paid in cash (real money first), and its position id. */
  async function bet(uid: string, mid: string): Promise<string> {
    const r: Any = await w.svc.buyPosition(uid, { marketId: mid, side: "YES", stake: STAKE, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`fixture bet refused: ${show(r)}`);
    return r.data.positionId;
  }

  /** The figure a Sell button holds for this ticket now: `cashOutValue`, exactly as all three hosts price it (`test:sell-price-guard` 4.hosts). */
  async function pagePrice(pid: string, mid: string): Promise<Any> {
    return w.svc.cashOutValue(await w.mdal.positionStore.get(pid), await w.svc.getMarket(mid));
  }

  // ═══ §1 · the price moved after the player confirmed it: refused, nothing moves, then sold at the price named ═══
  {
    const m = await poll(15);
    const uid = await player();
    const pid = await bet(uid, m.id);
    const confirmed = await pagePrice(pid, m.id);
    ok("1.0 · fixture · the page priced this ticket inside its free window: the whole stake, no fee",
      confirmed.inGracePeriod === true && confirmed.value === STAKE && confirmed.fee === 0, JSON.stringify(confirmed));
    ok("1.0b · fixture · the bet's turnover is on the grant, so a reversal would show",
      (await look(uid, pid, m.id)).wagered === STAKE, JSON.stringify(await look(uid, pid, m.id)));
    // The free window ends while the confirm is still open — the moment A8c exists for, on a legacy poll with a paid window.
    await w.backdate(pid, SIX_MINUTES);
    const now = await pagePrice(pid, m.id);
    ok("1.1 · fixture · six minutes on, the server's price is the paid window's: 9,000 after a 1,000 fee",
      now.inGracePeriod === false && now.sellable === true && now.value === PAID && now.fee === FEE, JSON.stringify(now));
    const chart0 = await chart(m.id);
    const before = await look(uid, pid, m.id);
    const odds0 = oddsOf(m.id);
    const figures: Array<[string, number]> = [["the free price its confirm showed", confirmed.value], ["one shilling above the price", PAID + 1], ["one shilling below the price", PAID - 1]];
    for (const [what, figure] of figures) {
      const r: Any = await sell(uid, pid, String(figure));
      ok(`1.2 · ${what} (${figure}) is refused: CONFLICT / price_changed`, r.ok === false && r.code === "CONFLICT" && r.reason === "price_changed", show(r));
      ok(`1.3 · ${what} · …carrying the server's figures as numbers: what a sale pays now, and its fee`,
        r.ok === false && r.detail?.value === PAID && r.detail?.fee === FEE && Object.keys(r.detail ?? {}).length === 2, JSON.stringify(r.detail));
      const after = await look(uid, pid, m.id);
      ok(`1.4 · ${what} · …and nothing moved: the wallet, both pools, the position (OPEN, no payout, not settled), no CASHOUT row, no ledger line, the grant's turnover`,
        same(after, before), `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
      ok(`1.5 · ${what} · …and no odds were pushed for the market`, oddsOf(m.id) === odds0, `${odds0} → ${oddsOf(m.id)}`);
    }
    const rows = await refusedRows(uid);
    ok("1.5b · each refused price left ONE record, written after the service returned: the reason, the figure the page sent, and the server's figures",
      rows.length === 3 && rows.every((e) => e.targetId === pid && e.payload?.reason === "price_changed" && e.payload?.value === PAID && e.payload?.fee === FEE)
        && same(sorted(rows.map((e) => e.payload?.expected)), sorted(figures.map(([, f]) => f))),
      JSON.stringify(rows.map((e) => e.payload)));
    const sold: Any = await sell(uid, pid, String(now.value));
    const after = await look(uid, pid, m.id);
    ok("1.6 · the price the server named sells at once: ok, and the result is that figure", sold.ok === true && sold.data?.value === PAID, show(sold));
    ok("1.7 · CONTROL · the sale moved every observable the refusals held still: the wallet +9,000, the YES pool −10,000, the position CASHED_OUT at 9,000 with a settled time, one CASHOUT row, the grant's turnover reversed",
      after.balance === (before.balance ?? 0) + PAID && after.yesPool === (before.yesPool ?? 0) - STAKE && after.noPool === before.noPool
        && after.status === "CASHED_OUT" && after.finalPayout === PAID && after.settledAt != null && after.cashoutTxns === 1 && after.wagered === 0,
      `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    const txn: Any = (await w.txnsFor(pid)).find((t: Any) => t.type === "CASHOUT");
    ok("1.8 · …and its transaction books 9,000 to the player and the 1,000 fee", num(txn?.amount) === PAID && num(txn?.fee) === FEE,
      JSON.stringify({ amount: txn?.amount, fee: txn?.fee }));
    ok("1.9 · CONTROL · …and it pushed the market's odds", oddsOf(m.id) > odds0, `${odds0} → ${oddsOf(m.id)}`);
    const chart1 = await chartPast(m.id, chart0);
    ok("1.10 · the chart gained exactly ONE point, the sale's — the three refusals drew none", chart1 === chart0 + 1, `${chart0} → ${chart1}`);
    ok("1.10b · …and the sale itself wrote no refused-sale record (still three)", (await refusedRows(uid)).length === 3, String((await refusedRows(uid)).length));
    if (w.onPostgres) {
      const lines = await cashoutLinesReach(uid, 1);
      ok("1.11 · Postgres: the ledger booked exactly one cash-out credit to the player, of 9,000 — the refusals booked none",
        lines.n === 1 && lines.sum === PAID, JSON.stringify(lines));
    }
  }

  // ═══ §2 · an internal caller sends no figure: no check, as before ═══
  {
    const m = await poll(15);
    const uid = await player();
    const pid = await bet(uid, m.id);
    await w.backdate(pid, SIX_MINUTES);
    const before = await look(uid, pid, m.id);
    const r: Any = await w.svc.cashOutPosition(uid, pid);
    const after = await look(uid, pid, m.id);
    ok("2.1 · an internal caller (the dev routes, every suite) passes NO figure and is not checked: the sale goes through at the server's price, as before A8c",
      r.ok === true && r.data?.value === PAID, show(r));
    ok("2.2 · …and it moved exactly what a sale moves",
      after.balance === (before.balance ?? 0) + PAID && after.yesPool === (before.yesPool ?? 0) - STAKE && after.status === "CASHED_OUT"
        && after.finalPayout === PAID && after.cashoutTxns === 1 && after.wagered === 0,
      `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    ok("2.3 · …and nothing recorded a refusal", (await refusedRows(uid)).length === 0, String((await refusedRows(uid)).length));
    if (w.onPostgres) await cashoutLinesReach(uid, 1);
  }

  // ═══ §3 · a current poll past its free window: exit_window_closed, word for word, whatever the figure ═══
  {
    const m = await poll(0);
    const uid = await player();
    const pid = await bet(uid, m.id);
    await w.backdate(pid, SIX_MINUTES);
    const priced = await pagePrice(pid, m.id);
    ok("3.0 · fixture · a current poll (no paid window) past its free window offers no sale", priced.sellable === false && priced.reason === "WINDOW_PASSED", JSON.stringify(priced));
    const chart0 = await chart(m.id);
    const before = await look(uid, pid, m.id);
    const odds0 = oddsOf(m.id);
    const figures: Array<string | undefined> = [undefined, String(STAKE), "0", String(PAID)];
    for (const figure of figures) {
      const r: Any = await sell(uid, pid, figure);
      const name = figure === undefined ? "no figure field" : `figure ${figure}`;
      ok(`3.1 · ${name} · refused exactly as before A8c: SELECTION_CLOSED / exit_window_closed, in today's words, with no figures`,
        r.ok === false && r.code === "SELECTION_CLOSED" && r.reason === "exit_window_closed" && r.error === EXIT_CLOSED && r.detail === undefined, show(r));
      ok(`3.2 · ${name} · …and nothing moved, and no odds were pushed`, same(await look(uid, pid, m.id), before) && oddsOf(m.id) === odds0,
        `${JSON.stringify(before)} → ${JSON.stringify(await look(uid, pid, m.id))}`);
    }
    ok("3.3 · …and the chart is unchanged", (await chart(m.id)) === chart0, String(chart0));
    ok("3.4 · …and a shut exit is not recorded as a refused price: no record at all", (await refusedRows(uid)).length === 0, String((await refusedRows(uid)).length));
  }

  // ═══ §4 · the figure the confirm showed, inside the free window, sells free ═══
  {
    const m = await poll(0);
    const uid = await player();
    const pid = await bet(uid, m.id);
    const priced = await pagePrice(pid, m.id);
    const before = await look(uid, pid, m.id);
    const r: Any = await sell(uid, pid, String(priced.value));
    const after = await look(uid, pid, m.id);
    const txn: Any = (await w.txnsFor(pid)).find((t: Any) => t.type === "CASHOUT");
    ok("4.1 · the figure the confirm showed (the whole stake, free) sells: ok at 10,000", priced.inGracePeriod === true && r.ok === true && r.data?.value === STAKE, show(r));
    ok("4.2 · …the whole stake back, no fee, the YES pool −10,000, the position CASHED_OUT, the turnover reversed",
      after.balance === (before.balance ?? 0) + STAKE && after.yesPool === (before.yesPool ?? 0) - STAKE && after.status === "CASHED_OUT"
        && after.finalPayout === STAKE && num(txn?.amount) === STAKE && num(txn?.fee) === 0 && after.wagered === 0,
      `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    if (w.onPostgres) await cashoutLinesReach(uid, 1);
  }

  // ═══ §5 · a pool holding less than the price: no page can show what a sale would pay, so the sale is unavailable ═══
  {
    const m = await poll(15);
    const uid = await player();
    const pid = await bet(uid, m.id);
    const confirmed = await pagePrice(pid, m.id);
    // A fixture of state: the YES pool now holds 6,000 against a 10,000 stake — the broken invariant the clamp exists for.
    await w.mdal.marketStore.addToPool(m.id, { yesPool: -4_000 });
    const before = await look(uid, pid, m.id);
    ok("5.0 · fixture · the YES pool (6,000) holds less than the price, and the page still prices the whole stake",
      before.yesPool === 6_000 && confirmed.value === STAKE, `${JSON.stringify(before)} · ${JSON.stringify(confirmed)}`);
    const r: Any = await sell(uid, pid, String(confirmed.value));
    ok("5.1 · the page's figure is refused as a sale that is unavailable — CONFLICT / cashout_pool_short, never 'the price changed' (no page would ever show the figure it would credit) — carrying that figure, 6,000, and no fee",
      r.ok === false && r.code === "CONFLICT" && r.reason === "cashout_pool_short" && r.detail?.value === 6_000 && r.detail?.fee === 0, show(r));
    ok("5.2 · …and nothing moved", same(await look(uid, pid, m.id), before), `${JSON.stringify(before)} → ${JSON.stringify(await look(uid, pid, m.id))}`);
    const rows = await refusedRows(uid);
    ok("5.2b · …and the refusal is recorded with both figures — what the page sent and what the short pool would pay — so a broken pool is seen in the audit, not only by the player",
      rows.length === 1 && rows[0].payload?.reason === "cashout_pool_short" && rows[0].payload?.expected === STAKE && rows[0].payload?.value === 6_000,
      JSON.stringify(rows.map((e) => e.payload)));
    const sold: Any = await sell(uid, pid, "6000");
    const after = await look(uid, pid, m.id);
    ok("5.3 · the figure the sale would credit, sent by hand, sells: ok at 6,000 — the wallet +6,000, the YES pool emptied, the position CASHED_OUT at 6,000",
      sold.ok === true && sold.data?.value === 6_000 && after.balance === (before.balance ?? 0) + 6_000 && after.yesPool === 0
        && after.status === "CASHED_OUT" && after.finalPayout === 6_000,
      `${show(sold)} · ${JSON.stringify(after)}`);
    if (w.onPostgres) await cashoutLinesReach(uid, 1);
  }

  // ═══ §6 · the service fails closed: a figure no sale can equal is refused, never read as "no figure" ═══
  {
    const m = await poll(15);
    const uid = await player();
    const pid = await bet(uid, m.id);
    await w.backdate(pid, SIX_MINUTES);
    const before = await look(uid, pid, m.id);
    const figures = [Number.NaN, -PAID, PAID + 0.5, Number.POSITIVE_INFINITY];
    for (const figure of figures) {
      const r: Any = await w.svc.cashOutPosition(uid, pid, { expectedValue: figure });
      ok(`6.1 · figure ${figure} handed straight to the service is refused with the server's price, never read as no figure`, r.ok === false && r.reason === "price_changed" && r.detail?.value === PAID, show(r));
    }
    ok("6.2 · …and nothing moved", same(await look(uid, pid, m.id), before), `${JSON.stringify(before)} → ${JSON.stringify(await look(uid, pid, m.id))}`);
  }

  // ═══ §6b · the page's path refuses a broken figure before the money path, and records it ═══
  {
    const m = await poll(15);
    const uid = await player();
    const pid = await bet(uid, m.id);
    await w.backdate(pid, SIX_MINUTES);
    const before = await look(uid, pid, m.id);
    for (const raw of BROKEN) {
      const r: Any = await sell(uid, pid, raw);
      ok(`6b.1 · the broken figure ${JSON.stringify(raw)} is refused before the money path: INVALID / unknown_failure, the generic line, no figures`,
        r.ok === false && r.code === "INVALID" && r.reason === "unknown_failure" && r.detail === undefined, show(r));
    }
    ok("6b.2 · …and nothing moved", same(await look(uid, pid, m.id), before), `${JSON.stringify(before)} → ${JSON.stringify(await look(uid, pid, m.id))}`);
    const rows = await refusedRows(uid);
    ok("6b.3 · …and each broken figure is recorded once, with what was sent, so a broken client is seen rather than silent",
      rows.length === BROKEN.length && rows.every((e) => e.targetId === pid && e.payload?.reason === "unknown_failure")
        && same(sorted(rows.map((e) => e.payload?.expected)), sorted(BROKEN)),
      JSON.stringify(rows.map((e) => e.payload)));
    const sold: Any = await sell(uid, pid);
    ok("6b.4 · CONTROL · the same ticket, through the same path with NO figure field (a page from before A8c), sells at the server's price — the refusals above were the figures, not the path",
      sold.ok === true && sold.data?.value === PAID && (await look(uid, pid, m.id)).status === "CASHED_OUT", show(sold));
    if (w.onPostgres) await cashoutLinesReach(uid, 1);
  }

  // ═══ §7 · two sales of one ticket at once: exactly one outcome, one credit ═══
  {
    const m = await poll(15);
    const uid = await player();
    const pid = await bet(uid, m.id);
    await w.backdate(pid, SIX_MINUTES);
    const before = await look(uid, pid, m.id);
    const [good, stale]: Any[] = await Promise.all([sell(uid, pid, String(PAID)), sell(uid, pid, String(STAKE))]);
    const after = await look(uid, pid, m.id);
    ok("7.1 · two sales of one ticket at once, one at the stale free figure: exactly one sells, at the server's price; the other is refused (price_changed, or position_not_open if it ran second)",
      good.ok === true && good.data?.value === PAID && stale.ok === false && (stale.reason === "price_changed" || stale.reason === "position_not_open"),
      `${show(good)} · ${show(stale)}`);
    ok("7.2 · …credited once: the wallet +9,000, one CASHOUT row, the YES pool −10,000 once",
      after.balance === (before.balance ?? 0) + PAID && after.cashoutTxns === 1 && after.yesPool === (before.yesPool ?? 0) - STAKE && after.status === "CASHED_OUT",
      `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    if (w.onPostgres) await cashoutLinesReach(uid, 1);
  }
  {
    const m = await poll(15);
    const uid = await player();
    const pid = await bet(uid, m.id);
    await w.backdate(pid, SIX_MINUTES);
    const before = await look(uid, pid, m.id);
    const both: Any[] = await Promise.all([sell(uid, pid, String(PAID)), sell(uid, pid, String(PAID))]);
    const after = await look(uid, pid, m.id);
    const sold = both.filter((r) => r.ok === true);
    const refused = both.filter((r) => r.ok !== true);
    ok("7.3 · two sales at the right figure at once: one sells, the other finds the ticket no longer open (position_not_open)",
      sold.length === 1 && refused.length === 1 && refused[0].reason === "position_not_open", both.map(show).join(" · "));
    ok("7.4 · …credited once", after.balance === (before.balance ?? 0) + PAID && after.cashoutTxns === 1 && after.yesPool === (before.yesPool ?? 0) - STAKE,
      `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    if (w.onPostgres) await cashoutLinesReach(uid, 1);
  }

  // ═══ §8 · Postgres only: the books, after every sale and refusal above ═══
  if (w.onPostgres) {
    const tb: Any = await trialBalance();
    ok("8.1 · Postgres: the books balance — every ledger group sums to zero, and so does the whole ledger",
      tb.globalBalanced === true && tb.imbalancedGroups.length === 0, `global ${tb.globalSum} · imbalanced ${tb.imbalancedGroups.length}`);
    ok("8.2 · Postgres: every wallet ties to its ledger — no refusal left half a sale behind",
      (tb.drift as Any[]).length === 0 && tb.checkedWallets >= 9, `${(tb.drift as Any[]).length} drifting of ${tb.checkedWallets} · ${JSON.stringify((tb.drift as Any[])[0] ?? null)}`);
  }

  stopOdds();
  return { onPostgres: w.onPostgres };
}
