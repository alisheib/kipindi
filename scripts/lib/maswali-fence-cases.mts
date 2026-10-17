/**
 * THE CASES BEHIND `test:maswali-fence` (MASWALI-BUILD S0.5, `docs/MASWALI-PLAN.md` §7b "S0.5" and its corrections of
 * 2026-10-17) — no generic door or read may treat a Maswali Millionea week as a Yes/No poll.
 *
 * Run twice by `scripts/maswali-fence.test.mts`: on the memory store and on a fresh scratch Postgres with every migration
 * applied (each in its own child, `scripts/lib/maswali-fence-child.mts`). ⭐ WHY BOTH: before S0.5 the Postgres store read
 * every non-UPDOWN `productLine` as MARKET (`toStoredMarket`), while the memory store returned the raw row — so a door
 * check that passes in memory proved nothing about production. Every DAL read below is asserted on both.
 *
 * A week row is planted through the real `createMarket` (`productLine: "MASWALI"`), as S2's `openWeek` will create it; a
 * ticket is planted by cloning a real poll position onto it, because the bet door now refuses a week (the fence itself).
 * Each refusal has a CONTROL beside it: the same door, on a poll, is not refused by the fence.
 *
 * The census (§5) runs in the memory child only: it reads source, which no store changes.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { loadWorld, OFFICER } from "./house-bot-world.mts";

type Any = any;
export type Ok = (label: string, cond: boolean, detail?: string) => void;

const STORE = process.env.HB_MONEY_STORE ?? "unknown";

export async function runFenceCases(ok: Ok): Promise<{ onPostgres: boolean }> {
  const w = await loadWorld();
  const { storedProductLine, isKnownProductLine, PRODUCT_LINES } = await import("../../src/lib/product-line.ts");
  const { nextDeadlineFor } = await import("../../src/lib/server/market-scheduler.ts");
  const { sentinelCheckOne } = await import("../../src/lib/server/market-sentinel.ts");
  const { chargedFee } = await import("../../src/lib/payout.ts");
  const { estimateFor } = await import("../../src/lib/markets/estimate.ts");
  const { positionPermalink, positionListHref } = await import("../../src/lib/position-permalink.ts");
  const { sideWord, outcomeWord, positionStatusWord } = await import("../../src/lib/side-label.ts");
  const { dict } = await import("../../src/lib/i18n-dict.ts");
  const svc = w.svc;
  const FENCE = svc.MASWALI_FENCE_ERROR as string;
  const show = (r: Any) => (r?.ok ? "ok" : `${r?.code ?? "?"} · ${r?.error ?? ""}`);

  // ── Fixtures ───────────────────────────────────────────────────────────────────────────────────────────────────
  const week = (title: string) => svc.createMarket({
    titleEn: title, titleSw: "Maswali Millionea · jaribio", category: "macro", sourceUrl: "https://bot.go.tz",
    resolutionCriterion: "A fence probe, never a real week.", resolutionAt: w.iso(7 * 864e5), proposedBy: OFFICER,
    productLine: "MASWALI", rateOverrides: { freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 },
  });
  const wk: Any = await week("Maswali Millionea · fence probe");
  const poll: Any = await w.poll({ graceMin: 5, paidMin: 0, title: "Fence control poll" });
  const player = await w.user({ balance: 200_000 });
  const admin = await w.user({ role: "ADMIN", balance: 0 });
  const official = await w.user({ role: "ADMIN", balance: 0 });

  // ── §1 · THE ONE READING OF A STORED LINE, ON THIS STORE ─────────────────────────────────────────────────────────
  ok("1.1 · storedProductLine: NULL is a poll, a known line is itself, an unknown value reads as MARKET (with an alarm)",
    storedProductLine(null) === "MARKET" && storedProductLine(undefined) === "MARKET" && storedProductLine("MASWALI") === "MASWALI"
      && storedProductLine("UPDOWN") === "UPDOWN" && storedProductLine("JACKPOT") === "MARKET" && !isKnownProductLine("JACKPOT")
      && PRODUCT_LINES.join(",") === "MARKET,UPDOWN,MASWALI");
  const got: Any = await svc.getMarket(wk.id);
  ok("1.2 · getMarket reads the week as MASWALI, never MARKET (the Postgres coercion is gone)", got?.productLine === "MASWALI", `got ${got?.productLine}`);
  const books: Any = await w.mdal.marketStore.bookByIds([wk.id, poll.id]);
  ok("1.3 · bookByIds keeps MASWALI (the money reports' join)", books.get(wk.id)?.productLine === "MASWALI" && books.get(poll.id)?.productLine === "MARKET",
    `week ${books.get(wk.id)?.productLine} · poll ${books.get(poll.id)?.productLine}`);
  const attr: Any = await w.mdal.marketStore.attribution([wk.id]);
  const attrRow = Array.isArray(attr) ? attr.find((r: Any) => r.id === wk.id) : attr?.get?.(wk.id);
  ok("1.4 · attribution keeps MASWALI (report-money's per-game split)", attrRow?.productLine === "MASWALI", `got ${attrRow?.productLine}`);
  const board: Any[] = await svc.listMarkets({ status: "LIVE" });
  const all: Any[] = await svc.listMarkets({ status: "LIVE", productLine: "ALL" });
  ok("1.5 · the default board (polls) never lists a week; an \"ALL\" read lists it as MASWALI",
    !board.some((m) => m.id === wk.id) && board.some((m) => m.id === poll.id) && all.find((m) => m.id === wk.id)?.productLine === "MASWALI");

  // ── §2 · THE DOORS REFUSE A WEEK (and do not refuse a poll) ──────────────────────────────────────────────────────
  const before = Number((await w.bal(player))?.balance ?? NaN);
  const buy: Any = await svc.buyPosition(player, { marketId: wk.id, side: "YES", stake: 1_000, idempotencyKey: crypto.randomUUID() });
  const after = Number((await w.bal(player))?.balance ?? NaN);
  ok("2.1 · buyPosition refuses a week as a closed market, and no shilling moves", !buy.ok && buy.code === "INVALID" && after === before
    && (await w.positionsOf(wk.id)).length === 0, `${show(buy)} · balance ${before} → ${after}`);
  const ctl: Any = await svc.buyPosition(player, { marketId: poll.id, side: "YES", stake: 1_000, idempotencyKey: crypto.randomUUID() });
  ok("2.1c · CONTROL: the same door sells a poll ticket", ctl.ok === true, show(ctl));

  // A ticket on the week, cloned from the real poll position (the bet door refuses the week — that is §2.1).
  const pollPos: Any = ctl.ok ? await w.mdal.positionStore.get(ctl.data.positionId) : null;
  const ticketId = `pos_fence_${process.pid}`;
  if (pollPos) await w.mdal.positionStore.set({ ...pollPos, id: ticketId, marketId: wk.id, idempotencyKey: null });
  const sell: Any = await svc.cashOutPosition(player, ticketId);
  // Since S3 a Millionea position's only exit is the free cancel (`cancelMaswaliTicket`, RULES §2.6), reached before the
  // poll path's lock; a position with no live ticket behind it is refused there. The poll's paid exit is never reached.
  ok("2.2 · cashOutPosition: a Millionea ticket has no paid exit (it goes to the free cancel, which refuses a position with no live ticket)",
    !sell.ok && sell.reason === "position_not_open", show(sell));

  const res: Any = await svc.resolveMarket({ marketId: wk.id, outcome: "YES", officerId: official });
  ok("2.3 · resolveMarket refuses to seal a week as one question", !res.ok && res.error === FENCE, show(res));
  const due: Any = await svc.resolveDueMarket(wk.id);
  const afterDue: Any = await svc.getMarket(wk.id);
  ok("2.4 · resolveDueMarket skips a week and leaves it untouched (no AI or automatic seal, MR-14)",
    due?.status === "skipped" && afterDue?.status === "LIVE" && !afterDue?.resolvedOutcome, `${JSON.stringify(due)} · ${afterDue?.status}`);
  ok("2.5 · sentinelCheckOne answers nothing for a week, before any paid call", (await sentinelCheckOne(wk.id)) === null);
  const ev: Any = await svc.emergencyVoidMarket({ marketId: wk.id, officerId: admin, reason: "fence probe void" });
  ok("2.6 · emergencyVoidMarket refuses a week (it has its own Compliance control)", !ev.ok && ev.error === FENCE, show(ev));
  const re: Any = await svc.adminReopenMarket(wk.id, admin);
  ok("2.7 · adminReopenMarket refuses a week (its close is write-once)", !re.ok && re.error === FENCE, show(re));

  ok("2.8 · nextDeadlineFor arms nothing for a week; CONTROL: a poll gets a deadline",
    nextDeadlineFor(got) === null && nextDeadlineFor(await svc.getMarket(poll.id)) !== null);
  ok("2.9 · perEventNotificationsSuppressed: a week sends no Yes/No notice (rounds as before, polls as before)",
    svc.perEventNotificationsSuppressed({ productLine: "MASWALI" }) === true && svc.perEventNotificationsSuppressed({ productLine: "UPDOWN" }) === true
      && svc.perEventNotificationsSuppressed({ productLine: "MARKET" }) === false);
  const bounds: Any = await svc.stakeBoundsForMarket({ id: wk.id, productLine: "MASWALI" });
  ok("2.10 · stakeBoundsForMarket answers a week without throwing (S3 sets min = max = the week's price)",
    Number.isFinite(bounds?.min) && Number.isFinite(bounds?.max), JSON.stringify(bounds));

  // settleMarket: a graded week is refused, and since R1 so is a voided one — a week's refund is its own bulk refund
  // (`maswali-void.ts`), with the market's settled stamp in the same transaction: one exactly-once truth.
  await w.mdal.marketStore.stamp(wk.id, { status: "RESOLVED", resolvedOutcome: "YES", objectionsClosedAt: w.iso(-60_000) });
  const graded: Any = await svc.settleMarket(wk.id, { actorId: "system_maswali" });
  ok("2.11 · settleMarket refuses a graded week (its own settlement is S3's; this one would refund at zero fee)",
    !graded.ok && graded.error === FENCE, show(graded));
  const queue: Any[] = await svc.listSettlementQueue();
  const health: Any = await svc.getSettlementHealth();
  ok("2.12 · the generic settlement queue never lists a week (its release is /admin/maswali/pools)",
    !queue.some((r) => r.id === wk.id), `${queue.length} rows`);
  ok("2.13 · getSettlementHealth runs over the same population without the week", health != null);
  const voidWk: Any = await week("Maswali Millionea · fence probe (void arm)");
  await w.mdal.marketStore.stamp(voidWk.id, { status: "VOIDED", resolvedOutcome: "VOID", objectionsClosedAt: w.iso(-60_000) });
  const voided: Any = await svc.settleMarket(voidWk.id, { actorId: "system_maswali" });
  ok("2.14 · settleMarket refuses a VOIDED week too, and leaves it unsettled: its refund is the week void's own (R1, MR-18), never this VOID arm",
    !voided.ok && voided.error === FENCE && !(await svc.getMarket(voidWk.id))?.settledAt, show(voided));

  // ── §3 · MONEY AND REPORT READS ──────────────────────────────────────────────────────────────────────────────────
  let threw = "";
  try { chargedFee({ yesPool: 5_000, noPool: 0, resolvedOutcome: "YES", productLine: "MASWALI" }, {}); } catch (e) { threw = String(e); }
  const pollFee = chargedFee({ yesPool: 5_000, noPool: 3_000, resolvedOutcome: "YES", productLine: "MARKET" }, {});
  ok("3.1 · chargedFee throws on a week (no poll mirror for the jackpot model) — CONTROL: a poll's fee computes",
    threw.includes("Millionea") && Number.isFinite(pollFee.fee), threw.slice(0, 80));

  // The leaderboard never counts a ticket: a player whose only settled position is a Millionea ticket is on no lens.
  const lone = await w.user({ balance: 0 });
  const countsBefore: Any = await w.mdal.positionStore.leaderboardPlayerCounts();
  if (pollPos) await w.mdal.positionStore.set({ ...pollPos, id: `pos_fence_lb_${process.pid}`, userId: lone, marketId: wk.id, status: "LOSS", finalPayout: 0, idempotencyKey: null });
  const lbAll: Any[] = await w.mdal.positionStore.leaderboard(500, { productLine: "ALL" });
  const lbPoll: Any[] = await w.mdal.positionStore.leaderboard(500, { productLine: "MARKET" });
  ok("3.2 · the leaderboard counts no Millionea ticket on any lens", !lbAll.some((r) => r.userId === lone) && !lbPoll.some((r) => r.userId === lone),
    `ALL ${lbAll.length} rows · MARKET ${lbPoll.length} rows`);
  const counts: Any = await w.mdal.positionStore.leaderboardPlayerCounts();
  ok("3.3 · leaderboardPlayerCounts does not count a player whose only settled position is a ticket",
    counts.all === countsBefore.all && counts.market === countsBefore.market && counts.updown === countsBefore.updown,
    `before ${JSON.stringify(countsBefore)} · after ${JSON.stringify(counts)}`);
  const mine: Any[] = await svc.listPositionsForUser(lone, 50, "MASWALI");
  const theirPolls: Any[] = await svc.listPositionsForUser(lone, 50, "MARKET");
  ok("3.4 · a per-product position read names a ticket MASWALI and keeps it out of the poll portfolio",
    mine.length === 1 && theirPolls.length === 0, `MASWALI ${mine.length} · MARKET ${theirPolls.length}`);

  // ── §4 · THE PURE MODULES ────────────────────────────────────────────────────────────────────────────────────────
  const t: Any = dict.sw;
  ok("4.1 · a Millionea pick reads NDIO / HAPANA, and every status arm has a word",
    sideWord(t, "YES", "MASWALI") === t.common.yes && sideWord(t, "NO", "MASWALI") === t.common.no
      && outcomeWord(t, "VOID", "MASWALI") === t.market.statusVoid
      && ["OPEN", "WIN", "LOSS", "VOID", "CASHED_OUT"].every((s) => typeof positionStatusWord(t, s as Any, "MASWALI") === "string"));
  const link = positionPermalink({ positionId: "pos_x", productLine: "MASWALI", marketId: "mkt_x" });
  ok("4.2 · a ticket's permalink goes to the Millionea segment, never /positions or a poll page",
    link.href === "/millionea/tickets#pos_x" && link.surface === "millionea-list" && positionListHref("MASWALI", "pos_x") === "/millionea/tickets#pos_x",
    JSON.stringify(link));
  ok("4.3 · no estimate is ever computed for a ticket (a held ticket never shows a figure it might win)",
    estimateFor({ yesPool: 10_000, noPool: 0, productLine: "MASWALI", rates: {}, side: "YES", stake: 1_000, bettable: true } as Any) === null);
  const C = w.constants;
  ok("4.4 · house bots: MASWALI is denied, off HOUSE_PRODUCTS, and out of the intent and target lines",
    C.HOUSE_PRODUCT_POLICY.MASWALI === "denied" && !C.HOUSE_PRODUCTS.includes("MASWALI")
      && !C.INTENT_PRODUCT_LINES.includes("MASWALI") && !C.TARGET_PRODUCT_LINES.includes("MASWALI"));

  // ── §5 · THE CENSUS (memory child only: it reads source) ─────────────────────────────────────────────────────────
  if (STORE === "memory") runCensus(ok);

  return { onPostgres: w.onPostgres };
}

/**
 * ⛔ THE CENSUS — every branch in `src/` that compares a value with "UPDOWN" (comments stripped), counted per file and
 * held to this list with the reason it is safe for a Millionea week. A NEW site, or a count that moves, fails until it
 * is classified here on purpose: "not a round" no longer means "a poll", and only this list may say why a two-way
 * branch is still right. Exact counts, so a site that is fixed is struck from the list rather than left as cover.
 */
export const CENSUS: Readonly<Record<string, { n: number; why: string }>> = {
  "src/app/admin/house/page.tsx": { n: 1, why: "the Up & Down filter pill; the line label is GAME_LINE_LABEL, exhaustive" },
  "src/app/admin/house/[marketId]/page.tsx": { n: 1, why: "the card's label, with an explicit MASWALI arm beside it" },
  "src/app/admin/markets/[id]/page.tsx": { n: 1, why: "the short-title control; a week returned the read-only notice above it" },
  "src/app/live/featured-contest.tsx": { n: 1, why: "fed only by /live's list, which removes every week before any label" },
  "src/app/live/page.tsx": { n: 2, why: "round lookups and the two-valued card map, after the week filter at the read" },
  "src/app/live/pulse-grid.tsx": { n: 1, why: "fed only by /live's list, which removes every week" },
  "src/app/markets/[id]/page.tsx": { n: 1, why: "the round redirect; a week is notFound() on the line above" },
  "src/app/positions/performance/page.tsx": { n: 1, why: "the round title lookup; the population is each scored line read directly, so no ticket is in it" },
  "src/app/positions/[positionId]/page.tsx": { n: 1, why: "the round lookup only; the line itself flows through positionPermalink, exhaustive" },
  "src/app/results/page.tsx": { n: 1, why: "the archive row map, after the week filter at the read" },
  "src/app/results/results-bar.tsx": { n: 2, why: "the view filter (all · MARKET · UPDOWN), never a row's line" },
  "src/components/journey/cards/journey-card.tsx": { n: 1, why: "the round link, after the explicit MASWALI arm" },
  "src/lib/house-bot/alert-copy.ts": { n: 1, why: "a house alert's side word; MASWALI is denied to house bots and its words are the poll's anyway" },
  "src/lib/house-bot/rules.ts": { n: 1, why: "house-bot scope targets are MARKET or UPDOWN only (DB CHECK)" },
  "src/lib/markets/estimate.ts": { n: 1, why: "returns null for rounds AND weeks, explicitly" },
  "src/lib/position-permalink.ts": { n: 1, why: "the round arm, after the explicit MASWALI arm" },
  "src/lib/product-line.ts": { n: 0, why: "the definitions only" },
  "src/lib/server/house-bot-dal.ts": { n: 4, why: "house-bot intents are MARKET or UPDOWN by CHECK (house-bot-migrations pins it)" },
  "src/lib/server/house-bot/decide.ts": { n: 16, why: "after scopeCode / HOUSE_PRODUCTS: a denied line never reaches a decision" },
  "src/lib/server/house-bot/enter-now.ts": { n: 1, why: "intent rows only, MARKET or UPDOWN by CHECK" },
  "src/lib/server/house-bot/fire.ts": { n: 2, why: "after the HOUSE_PRODUCTS check" },
  "src/lib/server/house-bot/market-view.ts": { n: 3, why: "scopeCode refuses any line but MARKET and UPDOWN" },
  "src/lib/server/house-bot/planner.ts": { n: 8, why: "plannable markets are filtered by line before planning" },
  "src/lib/server/house-bot/seam.ts": { n: 2, why: "the seam refuses a line not in HOUSE_PRODUCTS" },
  "src/lib/server/house-bot/trigger.ts": { n: 3, why: "after the HOUSE_PRODUCTS check; scopeAlerts skips a denied line" },
  "src/lib/server/market-dal.ts": { n: 1, why: "the leaderboard bucket, after tickets are skipped" },
  "src/lib/server/market-service.ts": { n: 2, why: "the Up & Down house trigger, with MASWALI handled beside it, and the round's void reason in settleMarket, which a week never reaches (its fence)" },
  "src/lib/server/short-title-service.ts": { n: 1, why: "the round's own refusal, with the week's refusal beside it" },
  "src/lib/side-label.ts": { n: 2, why: "the exhaustive guard and the round arm of positionStatusWord" },
  "src/lib/tax-report.ts": { n: 1, why: "parseProduct: MASWALI is not selectable until S6, by design" },
};

const SRC = "src";
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}
/** Block comments, then line comments that are not part of a URL. Approximate on purpose: it only has to keep prose out. */
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

export function censusCounts(root = "."): Map<string, number> {
  const out = new Map<string, number>();
  for (const f of walk(join(root, SRC))) {
    const rel = relative(root, f).split("\\").join("/");
    const n = (stripComments(readFileSync(f, "utf8")).match(/(===|!==)\s*"UPDOWN"/g) ?? []).length;
    if (n > 0) out.set(rel, n);
  }
  return out;
}

function runCensus(ok: Ok): void {
  const counts = censusCounts();
  const unlisted = [...counts].filter(([f]) => !(f in CENSUS)).map(([f, n]) => `${f} (${n})`);
  const moved = Object.entries(CENSUS).filter(([f, c]) => (counts.get(f) ?? 0) !== c.n).map(([f, c]) => `${f}: ${counts.get(f) ?? 0} ≠ ${c.n}`);
  ok("5.1 · every \"UPDOWN\" branch in src/ is in the census, with its reason", unlisted.length === 0, unlisted.join(" · "));
  ok("5.2 · every census count is exact (a fixed site is struck, a new one is classified)", moved.length === 0, moved.join(" · "));
  const lit = (f: string) => readFileSync(f, "utf8");
  const svcSrc = lit("src/lib/server/market-service.ts");
  ok("5.3 · the two-way coercion `=== \"UPDOWN\" ? \"UPDOWN\" : \"MARKET\"` is gone from the DAL and the service",
    !/productLine\s*===\s*"UPDOWN"\s*\?\s*"UPDOWN"\s*:\s*"MARKET"/.test(stripComments(lit("src/lib/server/market-dal.ts")))
      && !/productLine\s*===\s*"UPDOWN"\s*\?\s*"UPDOWN"\s*:\s*"MARKET"/.test(stripComments(svcSrc)));
  // The officer actions need a session to drive, so their fence is pinned in source: each asks before it acts.
  ok("5.4 · settleMarketAction and holdSettlementAction ask isFencedMaswali before acting",
    (lit("src/app/admin/settlement/actions.ts").match(/isFencedMaswali\(await getMarket\(marketId\)\)/g) ?? []).length === 2);
  ok("5.5 · recheckMarketNowAction refuses a week before the paid AI call",
    /isFencedMaswali\(await getMarket\(marketId\)\)[\s\S]*sentinelCheckOne/.test(lit("src/app/admin/resolver-queue/resolution-mode-action.ts")));
  ok("5.6 · the tax report refuses a period that holds a week (fail-closed until S6)",
    /b\.productLine === "MASWALI"\)\)\s*\{\s*return \{ ok: false/.test(lit("src/lib/server/tax-report-data.ts")));
  ok("5.7 · nextDeadlineFor arms a poll only", /if \(storedProductLine\(m\.productLine\) !== "MARKET"\) return null;/.test(lit("src/lib/server/market-scheduler.ts")));
}
