/**
 * Tests the "selections closed — waiting for results" lifecycle transition:
 * bettors on a market whose selection window has passed get a one-time in-app
 * notification + email; it fires exactly once; future-cutoff and Demo markets
 * are excluded. In-memory store.
 *
 * The lifecycle sweep was replaced by PER-MARKET timers, so the trigger is now
 * notifySelectionClosedForMarket(marketId) — the same code path the real timers
 * fire. The old sweep's selectivity (future cutoff / Demo excluded) now lives
 * INSIDE the trigger, so we fire it at every market and aggregate the results:
 * identical assertions, plus an explicit per-market refusal check.
 *
 * §7–§11 (FEE-TAX-2026-10, R2b) drive STAKE-SHARE markets through the real chain — createMarket → buyPosition → close →
 * notify → resolve → settle — and hold DISCLOSED == PAID to the shilling in both outcomes (the document's example, whose
 * T is 4,567.5 before rounding, and the independent review's tie-broken book, where the one-position projection would
 * disclose a different set); a one-sided market discloses the refund; a lopsided book does not throw and its alert speaks
 * the model's words; and a figure that cannot be computed writes nothing, leaves the stamp off and raises a COMPLIANCE alert.
 *
 * Run: npm run test:selection-closed
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
// The transitions are fired by hand below; an ambient per-market timer must not fire one first (read at call time).
process.env.MARKET_SCHEDULER = "false";

import { marketStore, positionStore } from "../src/lib/server/market-dal.ts";
import { notifySelectionClosedForMarket, createMarket, buyPosition, resolveMarket, settleMarket, listPositionsForMarket, ratesFor } from "../src/lib/server/market-service.ts";
import { settledPayoutFor } from "../src/lib/payout.ts";
import { __setFeeLawLiveForTest } from "../src/lib/fee-law-gate.ts";
import { auditFlush, getAuditPage } from "../src/lib/server/audit.ts";
import { listForUser } from "../src/lib/server/notification-service.ts";
import { selectionClosedHtml } from "../src/lib/server/email.ts";
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const now = Date.now();
const iso = new Date(now).toISOString();
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();
const ahead = (mins: number) => new Date(now + mins * 60_000).toISOString();

function mkMarket(id: string, opts: { titleEn?: string; selectionClosedAt: string | null; resolutionAt: string; status?: string; notified?: string | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return marketStore.set({
    id, titleEn: opts.titleEn ?? `Market ${id}`, titleSw: "SW", category: "crypto", sourceUrl: "https://x",
    resolutionCriterion: "crit", resolutionAt: opts.resolutionAt, selectionClosedAt: opts.selectionClosedAt,
    status: opts.status ?? "LIVE", yesPool: 1000, noPool: 1000, predictorCount: 0, resolvedOutcome: null,
    resolutionStage1By: null, resolutionStage1At: null, resolutionStage2By: null, resolutionStage2At: null,
    objectionsClosedAt: null, resolutionNotifiedAt: null, selectionClosedNotifiedAt: opts.notified ?? null,
    proposedBy: "system", createdAt: iso, updatedAt: iso,
  } as any);
}
function mkPosition(id: string, marketId: string, userId: string, status = "OPEN") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return positionStore.set({
    id, marketId, userId, side: "YES", stake: 1000, shares: 1000, status,
    avgPricePct: 50, finalPayout: null, settledAt: null, createdAt: iso, updatedAt: iso,
  } as any);
}
async function mkUser(id: string, email: string | null = null) {
  await db.user.create({
    id, phoneE164: `+25572${id.slice(-7).padStart(7, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0,
    lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: id, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: iso, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email, emailVerifiedAt: null, createdAt: iso, updatedAt: iso, lastLoginAt: iso, closedAt: null,
  });
}

/**
 * Fire the per-market selection-closed trigger at EVERY market in the fixture and
 * aggregate — the exact tally the old poll-everything sweep returned. Sequential
 * (not Promise.all) so the counts are deterministic. `per` keeps each market's own
 * verdict so we can assert WHICH markets the trigger refused.
 */
async function fireAll(ids: string[]) {
  const per = new Map<string, { notified: boolean; bettors: number }>();
  for (const id of ids) per.set(id, await notifySelectionClosedForMarket(id));
  const all = [...per.values()];
  return {
    notified: all.filter((r) => r.notified).length,
    bettors: all.reduce((s, r) => s + r.bettors, 0),
    per,
  };
}
const ALL_MARKETS = ["mkt_sc_1", "mkt_sc_future", "mkt_sc_demo"];

// 0. Email template renders.
{
  // §6: once betting closes the pools are FROZEN, so the payout stops being a
  // projection and becomes an exact number. This email no longer says "waiting for
  // results" — it states the exact amount the player receives if his side wins,
  // computed by the very function that will settle it.
  const html = selectionClosedHtml({
    marketTitle: "Will it rain in Dodoma Friday?", closedAt: iso, resolvesAt: ahead(120), marketId: "mkt_x",
    payoutIfYes: 102_333, payoutIfNo: null,
  });
  ok("email shows market title", html.includes("Will it rain in Dodoma Friday?"));
  ok("email says betting is closed", html.toLowerCase().includes("betting closed"));
  ok("email states the EXACT payout figure", html.includes("102,333"));
  ok("email says the figure is exact, not an estimate", html.toLowerCase().includes("exact amount"));
  ok("email links to the market", html.includes("/markets/mkt_x"));
}

await mkUser("usr_sc_alice", "alice@test.tz");
await mkUser("usr_sc_bob");                       // no email — in-app only
await mkUser("usr_sc_carol", "carol@test.tz");    // bets on a FUTURE market — must NOT be notified

// 1. Selection closed (5 min ago), resolution later → both bettors notified once.
await mkMarket("mkt_sc_1", { titleEn: "Will Simba win on Sunday?", selectionClosedAt: ago(5), resolutionAt: ahead(180) });
mkPosition("pos_a1", "mkt_sc_1", "usr_sc_alice");
mkPosition("pos_b1", "mkt_sc_1", "usr_sc_bob");
mkPosition("pos_a1b", "mkt_sc_1", "usr_sc_alice", "OPEN"); // alice holds 2 positions → still ONE notification

// 2. Selection still OPEN (closes in 60 min) → carol must NOT be notified.
await mkMarket("mkt_sc_future", { titleEn: "Future market", selectionClosedAt: ahead(60), resolutionAt: ahead(240) });
mkPosition("pos_c1", "mkt_sc_future", "usr_sc_carol");

// 3. Demo market past cutoff → excluded (auto-resolves instantly).
await mkMarket("mkt_sc_demo", { titleEn: "Demo · quick market", selectionClosedAt: ago(5), resolutionAt: ahead(5) });
mkPosition("pos_d1", "mkt_sc_demo", "usr_sc_alice");

const r1 = await fireAll(ALL_MARKETS);
await new Promise((res) => setTimeout(res, 150)); // flush fire-and-forget bells + emails

ok("1 market notified", r1.notified === 1, JSON.stringify({ notified: r1.notified, bettors: r1.bettors }));
ok("2 distinct bettors notified (alice once despite 2 positions)", r1.bettors === 2, JSON.stringify({ notified: r1.notified, bettors: r1.bettors }));
ok("the closed market is the one that fired", r1.per.get("mkt_sc_1")?.notified === true && r1.per.get("mkt_sc_1")?.bettors === 2, JSON.stringify(r1.per.get("mkt_sc_1")));
ok("future-cutoff market refused by the trigger", r1.per.get("mkt_sc_future")?.notified === false && r1.per.get("mkt_sc_future")?.bettors === 0, JSON.stringify(r1.per.get("mkt_sc_future")));
ok("Demo market refused by the trigger", r1.per.get("mkt_sc_demo")?.notified === false && r1.per.get("mkt_sc_demo")?.bettors === 0, JSON.stringify(r1.per.get("mkt_sc_demo")));

const aliceNs = (await listForUser("usr_sc_alice")).filter((n) => n.kind === "SELECTION_CLOSED");
const bobNs = (await listForUser("usr_sc_bob")).filter((n) => n.kind === "SELECTION_CLOSED");
const carolNs = (await listForUser("usr_sc_carol")).filter((n) => n.kind === "SELECTION_CLOSED");
ok("alice got exactly ONE selection-closed bell", aliceNs.length === 1, `got ${aliceNs.length}`);
ok("bob got one selection-closed bell", bobNs.length === 1, `got ${bobNs.length}`);
ok("carol (future market) got NONE", carolNs.length === 0, `got ${carolNs.length}`);
ok("alice's bell deep-links to the market", aliceNs[0]?.href === "/markets/mkt_sc_1", aliceNs[0]?.href);
ok("alice's bell did NOT come from the demo market", !aliceNs.some((n) => n.href === "/markets/mkt_sc_demo"));

// 4. Idempotency — re-firing every trigger notifies nobody new.
const r2 = await fireAll(ALL_MARKETS);
ok("second fire notifies 0 markets", r2.notified === 0, JSON.stringify({ notified: r2.notified, bettors: r2.bettors }));
ok("re-firing the already-notified market is a no-op", r2.per.get("mkt_sc_1")?.notified === false && r2.per.get("mkt_sc_1")?.bettors === 0, JSON.stringify(r2.per.get("mkt_sc_1")));
const aliceAfter = (await listForUser("usr_sc_alice")).filter((n) => n.kind === "SELECTION_CLOSED");
ok("alice still has exactly ONE bell after re-sweep", aliceAfter.length === 1, `got ${aliceAfter.length}`);

// 5. The market got stamped.
const m1 = await marketStore.get("mkt_sc_1");
ok("market stamped selectionClosedNotifiedAt", !!m1?.selectionClosedNotifiedAt, String(m1?.selectionClosedNotifiedAt));

// 6. When the future market's window passes, its bettor gets notified.
const fut = await marketStore.get("mkt_sc_future");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await marketStore.set({ ...(fut as any), selectionClosedAt: ago(1) });
const r3 = await fireAll(ALL_MARKETS);
await new Promise((res) => setTimeout(res, 150)); // flush fire-and-forget bells + emails
const carolAfter = (await listForUser("usr_sc_carol")).filter((n) => n.kind === "SELECTION_CLOSED");
ok("carol notified once her market's window closed", carolAfter.length === 1 && r3.notified === 1, `${carolAfter.length} / ${JSON.stringify({ notified: r3.notified, bettors: r3.bettors })}`);
ok("and it was HER market that fired, for exactly 1 bettor", r3.per.get("mkt_sc_future")?.notified === true && r3.per.get("mkt_sc_future")?.bettors === 1, JSON.stringify(r3.per.get("mkt_sc_future")));

// ══ 7–11 · STAKE-SHARE (FEE-TAX-2026-10): THE DISCLOSURE IS THE SETTLEMENT ═════════════════════════════════════════
// Terms §4 promises the figure told at close is the EXACT amount paid. Under `stake-share` it comes from
// `stakeShareSplit` per hypothetical outcome — the arithmetic settlement pays by — so these markets are driven through
// the REAL chain (createMarket → buyPosition → close → notify → resolve → settle) and every winner's paid amount is held
// to the shilling against what it was told. ⛔ The new law is not in force (`fee-law-gate.ts`): the gate is opened IN
// THIS PROCESS only to stamp these markets, and shut again at once.
const j = (v: unknown) => JSON.stringify(v);
let fseq = 0;
/** A funded player (the id ends in seven digits, which `mkUser` turns into its phone number). */
async function funded(): Promise<string> {
  const id = `usr_scss${String(++fseq).padStart(7, "0")}`;
  await mkUser(id);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 200_000, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: iso, updatedAt: iso,
  } as never);
  return id;
}
async function ssMarket(title: string): Promise<string> {
  __setFeeLawLiveForTest(true);
  try {
    const m = await createMarket({
      titleEn: title, titleSw: "SW", category: "macro", sourceUrl: "https://bot.go.tz", resolutionCriterion: "crit",
      resolutionAt: ahead(7 * 24 * 60), proposedBy: "test",
      rateOverrides: { feeModel: "stake-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, winningsTaxRate: 0.15, freeExitGraceMinutes: 0, paidExitWindowMinutes: 0 },
    } as never);
    if (m.feeSnapshot?.feeModel !== "stake-share") throw new Error(`fixture: the market did not freeze stake-share (${j(m.feeSnapshot)})`);
    return m.id;
  } finally {
    __setFeeLawLiveForTest(null);
  }
}
type Placed = { id: string; userId: string; side: "YES" | "NO"; stake: number };
async function place(marketId: string, plan: Array<["YES" | "NO", number]>): Promise<Placed[]> {
  const out: Placed[] = [];
  for (const [side, stake] of plan) {
    const userId = await funded();
    const r = await buyPosition(userId, { marketId, side, stake });
    if (!r.ok) throw new Error(`fixture bet refused: ${j(r)}`);
    out.push({ id: r.data!.positionId, userId, side, stake });
  }
  return out;
}
/** Betting closes: the cutoff moves into the past, exactly what the scheduler's timer sees when it fires. */
const closeBetting = (marketId: string) => marketStore.stamp(marketId, { selectionClosedAt: ago(1) });
async function settle(marketId: string, outcome: "YES" | "NO") {
  const r = await resolveMarket({ marketId, outcome, officerId: "usr_sc_officer_a" });
  if (r.ok && r.data?.stage === "stage1") await resolveMarket({ marketId, outcome, officerId: "usr_sc_officer_b" });
  else if (!r.ok) throw new Error(`fixture resolve refused: ${j(r)}`);
  const s = await settleMarket(marketId, { force: true, actorId: "usr_sc_officer_a" });
  if (!s.ok) throw new Error(`fixture settle refused: ${j(s)}`);
}
const told = async (marketId: string) => new Map((await listPositionsForMarket(marketId)).map((p) => [p.id, p.potentialPayout ?? null]));
const paidOf = async (marketId: string) => new Map((await listPositionsForMarket(marketId)).map((p) => [p.id, { status: p.status, paid: p.finalPayout ?? null }]));

// 7. The document's example (FEE-TAX-PLAN §3), once for each outcome — T = 4,567.5 → 4,568 if YES wins (half up).
const DOC: Array<["YES" | "NO", number]> = [["YES", 1_000], ["YES", 3_000], ["YES", 5_000], ["NO", 10_000], ["NO", 20_000], ["NO", 5_000]];
const DOC_TOLD = [3_746, 11_237, 18_729, 10_601, 21_203, 5_301];
for (const outcome of ["YES", "NO"] as const) {
  const mid = await ssMarket(`Stake-share disclosure · the document's example · ${outcome} wins`);
  const placed = await place(mid, DOC);
  await closeBetting(mid);
  const r = await notifySelectionClosedForMarket(mid);
  ok(`7.${outcome}.1 · the stake-share close notifies its six bettors`, r.notified && r.bettors === 6, j(r));
  const t = await told(mid);
  ok(`7.${outcome}.2 · ★ each position is told its exact if-my-side-wins figure: 3,746 / 11,237 / 18,729 and 10,601 / 21,203 / 5,301`,
    j(placed.map((p) => t.get(p.id))) === j(DOC_TOLD), j(placed.map((p) => t.get(p.id))));
  ok(`7.${outcome}.3 · …the YES figures carry T = 4,568 (15% of 30,450 is 4,567.5, rounded half up): Σ = 44,000 − 5,720 − 4,568`,
    DOC_TOLD.slice(0, 3).reduce((s, v) => s + v, 0) === 44_000 - 5_720 - 4_568);
  await settle(mid, outcome);
  const paid = await paidOf(mid);
  const winners = placed.filter((p) => p.side === outcome);
  ok(`7.${outcome}.4 · ★ DISCLOSED == PAID: every winner is paid exactly the figure it was told, to the shilling`,
    winners.every((p) => paid.get(p.id)?.status === "WIN" && paid.get(p.id)?.paid === t.get(p.id)),
    j(winners.map((p) => [t.get(p.id), paid.get(p.id)])));
}

// 8. One side only: settlement refunds every stake in full at no fee (ruling 2), so the figure told is the stake itself.
{
  const mid = await ssMarket("Stake-share disclosure · one-sided");
  const placed = await place(mid, [["YES", 4_000], ["YES", 1_500]]);
  await closeBetting(mid);
  const r = await notifySelectionClosedForMarket(mid);
  const t = await told(mid);
  ok("8.1 · a one-sided stake-share close discloses the REFUND — each stake itself, no fee, no tax",
    r.notified && placed.every((p) => t.get(p.id) === p.stake), j(placed.map((p) => [p.stake, t.get(p.id)])));
  await settle(mid, "NO");
  const paid = await paidOf(mid);
  ok("8.2 · …and that is what settlement pays back", placed.every((p) => paid.get(p.id)?.paid === t.get(p.id)), j([...paid.values()]));
}

// 9. The independent review's book (ties broken by id): the disclosure is the SPLIT, not the one-position projection.
{
  const BOOK: Array<["YES" | "NO", number]> = [["YES", 1_005], ["YES", 1_337], ["YES", 999], ["NO", 500], ["NO", 500], ["NO", 1_337]];
  for (const outcome of ["YES", "NO"] as const) {
    const mid = await ssMarket(`Stake-share disclosure · the review's book · ${outcome} wins`);
    const placed = await place(mid, BOOK);
    await closeBetting(mid);
    await notifySelectionClosedForMarket(mid);
    const t = await told(mid);
    const side = placed.filter((p) => p.side === outcome);
    const want = outcome === "YES" ? [1_395, 1_854, 1_386] : [964, 964, 2_576];
    ok(`9.${outcome}.1 · the ${outcome} positions are told the split's figures ${want.join(" / ")}`,
      j(side.map((p) => t.get(p.id))) === j(want), j(side.map((p) => t.get(p.id))));
    const m = (await marketStore.get(mid))!;
    const projected = side.map((p) => settledPayoutFor({ yesPool: m.yesPool, noPool: m.noPool, side: p.side, stake: p.stake }, ratesFor(m)).payout);
    ok(`9.${outcome}.2 · CONTROL · the one-position projection names a DIFFERENT set (${projected.join(" / ")}) — so 9.${outcome}.1 can fail`,
      j(projected) !== j(want), j(projected));
    await settle(mid, outcome);
    const paid = await paidOf(mid);
    ok(`9.${outcome}.3 · ★ DISCLOSED == PAID on the tie-broken book`, side.every((p) => paid.get(p.id)?.paid === t.get(p.id)),
      j(side.map((p) => [t.get(p.id), paid.get(p.id)])));
  }
}

// 10. A lopsided book does not throw: its big-side winners are told a figure BELOW their stake (ruling 1), never below the
//     net stake, and the officer's alert says so in the model's own words — not the older law's "never below stake".
{
  const mid = await ssMarket("Stake-share disclosure · lopsided");
  const placed = await place(mid, [["YES", 20_000], ["YES", 9_000], ["NO", 600]]);
  await closeBetting(mid);
  let threw: unknown = null;
  let r: { notified: boolean; bettors: number } = { notified: false, bettors: 0 };
  try { r = await notifySelectionClosedForMarket(mid); } catch (e) { threw = e; }
  ok("10.1 · a lopsided stake-share close does NOT throw, and notifies", threw === null && r.notified, String(threw ?? j(r)));
  const t = await told(mid);
  const big = placed.filter((p) => p.side === "YES");
  ok("10.2 · …the big-side positions are told 17,706 / 7,968 — below their stakes, above their net stakes (17,400 / 7,830)",
    j(big.map((p) => t.get(p.id))) === j([17_706, 7_968]), j(big.map((p) => t.get(p.id))));
  await auditFlush();
  const alert = getAuditPage({ category: "ADMIN", limit: 1_000 }).find((e) => e.action === "market.selection_closed.thin_poll" && e.targetId === mid);
  const pl = (alert?.payload ?? {}) as { feeModel?: string; reason?: string; triggers?: { belowStake?: boolean }; winningsTaxIfYesWins?: number };
  ok("10.3 · ★ the thin-poll alert names stake-share and says BELOW STAKE — never \"Winners are protected (never below stake)\"",
    pl.feeModel === "stake-share" && pl.triggers?.belowStake === true && /^BELOW STAKE/.test(pl.reason ?? "") && !(pl.reason ?? "").includes("never below stake"),
    j(pl));
  ok("10.4 · …and states the tax each outcome would withhold beside its fee (78 if YES wins)", pl.winningsTaxIfYesWins === 78, j(pl.winningsTaxIfYesWins));
  await settle(mid, "YES");
  const paid = await paidOf(mid);
  ok("10.5 · DISCLOSED == PAID on the lopsided book", big.every((p) => paid.get(p.id)?.paid === t.get(p.id)), j(big.map((p) => [t.get(p.id), paid.get(p.id)])));
}

// 11. ⛔ A figure that cannot be computed is NOT a silent loss: nothing is written, the stamp stays off (so the close
//     retries), a COMPLIANCE alert names the market, and the error reaches the scheduler. Once the cause is gone, the next
//     fire discloses. The fault is planted in memory: the market's YES pool no longer equals its YES stakes.
{
  const mid = await ssMarket("Stake-share disclosure · a refused figure");
  const placed = await place(mid, [["YES", 2_000], ["NO", 3_000]]);
  await closeBetting(mid);
  const before = await told(mid);
  const m0 = (await marketStore.get(mid))!;
  await marketStore.stamp(mid, { yesPool: m0.yesPool + 1 });
  let threw = false;
  try { await notifySelectionClosedForMarket(mid); } catch { threw = true; }
  const m1 = (await marketStore.get(mid))!;
  const after = await told(mid);
  ok("11.1 · a split that refuses THROWS to the scheduler (so it backs off and retries)", threw);
  ok("11.2 · ★ …and writes NOTHING: no stamp, every position's figure exactly as it was",
    !m1.selectionClosedNotifiedAt && placed.every((p) => after.get(p.id) === before.get(p.id)),
    j({ stamp: m1.selectionClosedNotifiedAt, before: [...before], after: [...after] }));
  await auditFlush();
  const alert = getAuditPage({ category: "COMPLIANCE", limit: 1_000 }).find((e) => e.action === "market.selection_closed.disclosure_failed" && e.targetId === mid);
  ok("11.3 · ★ a COMPLIANCE alert names the market, the reason, and that nothing was stamped",
    !!alert && (alert.payload as { stamped?: boolean })?.stamped === false && String((alert.payload as { error?: string })?.error ?? "").length > 0, j(alert?.payload));
  await marketStore.stamp(mid, { yesPool: m0.yesPool });
  const healed = await notifySelectionClosedForMarket(mid);
  const t = await told(mid);
  ok("11.4 · once the cause is gone the next fire discloses: notified, stamped, the figures written",
    healed.notified && !!(await marketStore.get(mid))?.selectionClosedNotifiedAt && placed.every((p) => typeof t.get(p.id) === "number" && t.get(p.id)! > 0),
    j({ healed, told: [...t] }));
}

console.log(`\nselection-closed-notify: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
