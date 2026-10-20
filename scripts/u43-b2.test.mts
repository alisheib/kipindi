/** U43 B2: the card, chart and settlement name the same minute-open price. */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vendorOpenPoints, roundOpenPoints, maskConflictingVendorOpens, roundLineHistoryUrl, shouldDisplayRoundLine, hasLaterConfirmedRead, ROUND_LINE_WINDOW_MS, ROUND_LINE_OUTPUT_BARS } from "../src/lib/updown-vendor-opens";
import { vendorBarsFor, VENDOR_PLAN, __clearVendorCacheForTests } from "../src/lib/server/updown-terminal-vendor";
import { ALLOWED_DURATIONS, roundSpanMinutes } from "../src/lib/updown-durations";
import { assetStore } from "../src/lib/server/updown-dal";
import { getAssetTerminalSeries } from "../src/lib/server/updown-board";
import { RoundLiveLine, roundLineConfirmedAbove } from "../src/components/charts/round-live-line";
import { cardPriceRead } from "../src/lib/updown-card-view";

let failed = 0;
function ok(name: string, passed: boolean) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  if (!passed) failed++;
}

const minute = 60_000;
const open = Math.floor(Date.now() / minute) * minute - 4 * minute;
const close = open + 3 * minute;
ok("the live line belongs to open and locked rounds, then only a briefly frozen result",
  shouldDisplayRoundLine("open", open, close, open, 100.12)
  && shouldDisplayRoundLine("locked", open, close, close - 1, 100.12)
  && !shouldDisplayRoundLine("closing", open, close, close, 100.12)
  && !shouldDisplayRoundLine("confirming", open, close, close + minute, 100.12)
  && shouldDisplayRoundLine("resolved", open, close, close + minute, 100.12)
  && shouldDisplayRoundLine("void", open, close, close + minute, 100.12)
  && !shouldDisplayRoundLine("resolved", open, close, open + ROUND_LINE_WINDOW_MS + 1, 100.12)
  && !shouldDisplayRoundLine("open", open, close, open - 1, 100.12)
  && !shouldDisplayRoundLine("locked", open, close, close + 1, 100.12)
  && !shouldDisplayRoundLine("open", open, close, Number.NaN, 100.12)
  && !shouldDisplayRoundLine("open", Number.NaN, close, close - 1, 100.12)
  && !shouldDisplayRoundLine("resolved", open, Number.NaN, close - 1, 100.12)
  && !shouldDisplayRoundLine("open", open, close, open, 0));
const bars = [
  { t: open, o: 100.124, c: 105 },
  { t: open + minute, o: 100.254, c: 90 },
  { t: close, o: 99.954, c: 110 },
];
const points = vendorOpenPoints(bars, minute, 2);
ok("minute labels use OPEN, rounded like settlement, never bar CLOSE",
  points.length === 4 && points[0].price === 100.12 && points[1].price === 100.25
  && points[2].price === null && points[3].price === 99.95);
const round = roundOpenPoints(points, open, close, close, 100.12, 2);
ok("card starts at the frozen opening price and ends at the settlement instant's OPEN",
  round?.[0].t === open && round[0].price === 100.12 && round.at(-1)?.t === close && round.at(-1)?.price === 99.95);
ok("a missing opening bar cannot be replaced by a nearby bar", roundOpenPoints(points.slice(1), open, close, close, 100.12, 2) === null);
ok("a vendor correction that differs from the receipt cannot contradict the card", roundOpenPoints(points, open, close, close, 100.13, 2) === null);
ok("a corrected closing bar cannot contradict immutable settlement", roundOpenPoints(points, open, close, close, 100.12, 2, 99.96) === null
  && roundOpenPoints(points, open, close, close, 100.12, 2, 99.95)?.at(-1)?.price === 99.95);
const midRead = { quotedAt: new Date(open + minute).toISOString(), price: 100.25 };
ok("a revised middle bar cannot contradict the card's confirmed read",
  roundOpenPoints(points, open, close, close, 100.12, 2, null, { ...midRead, price: 100.26 }) === null
  && roundOpenPoints(points, open, close, close, 100.12, 2, null, midRead)?.[1]?.price === 100.25);
const pins = [{ quotedAt: new Date(open).toISOString(), price: 100.12 }, midRead,
  { quotedAt: new Date(close).toISOString(), price: 99.95 }];
const revised = points.map((point) => point.t === open + minute ? { ...point, price: 100.26 } : point);
const safeLine = maskConflictingVendorOpens({ mode: "line", points: revised }, pins, 2);
ok("a revised middle OPEN is a gap in the large curve, with adjacent real bars intact",
  safeLine.mode === "line" && safeLine.points[0]?.price === 100.12
  && safeLine.points[1]?.price === null && safeLine.points.at(-1)?.price === 99.95);
const revisedCandles = [
  { t: open, o: 100.12, h: 101, l: 99, c: 100.4 },
  { t: open + minute, o: 100.26, h: 101, l: 99, c: 100.3 },
  { t: close, o: 99.95, h: 101, l: 99, c: 100 },
];
const safeCandles = maskConflictingVendorOpens({ mode: "candles", candles: revisedCandles, gaps: [], bucketMs: minute }, pins, 2);
ok("a revised middle OPEN becomes candle whitespace, not a different OHLC beside the card",
  safeCandles.mode === "candles" && safeCandles.candles.length === 2
  && safeCandles.candles[0]?.t === open && safeCandles.candles[1]?.t === close
  && safeCandles.gaps.length === 1 && safeCandles.gaps[0] === open + minute);
const matching = maskConflictingVendorOpens({ mode: "line", points }, pins, 2);
ok("matching confirmed reads retain every original vendor OPEN and genuine gap",
  matching.mode === "line" && matching.points.every((point, index) => point.price === points[index].price));
ok("a live card cannot show a bar from the future or the close early",
  roundOpenPoints(points, open, close, open + minute, 100.12, 2)?.length === 2);
ok("one vendor opening bar cannot deny a later confirmed price on the card",
  roundOpenPoints(points.slice(0, 1), open, close, open + minute, 100.12, 2, null, midRead)?.length === 1
  && hasLaterConfirmedRead(open, midRead.price, midRead.quotedAt)
  && !hasLaterConfirmedRead(open, 100.12, new Date(open).toISOString())
  && !hasLaterConfirmedRead(open, null, midRead.quotedAt)
  && !hasLaterConfirmedRead(open, 100.25, "bad-time"));
ok("the card requests the one shared 1H vendor window, independent of duration",
  roundLineHistoryUrl("btc") === "/api/updown/history?asset=btc&range=1H&style=line&scope=round"
  && roundLineHistoryUrl("xau") === "/api/updown/history?asset=xau&range=1H&style=line&scope=round");
const longestSpan = Math.max(...ALLOWED_DURATIONS.map(roundSpanMinutes));
ok("the shared 1-minute request retains a 60-minute choice's full 72-minute round plus publishing slack",
  longestSpan === 72 && ROUND_LINE_WINDOW_MS >= 76 * minute
  && ROUND_LINE_OUTPUT_BARS >= 77 && VENDOR_PLAN["1H"].outputsize >= ROUND_LINE_OUTPUT_BARS);
const longOpen = Math.floor(Date.now() / minute) * minute - longestSpan * minute;
const longClose = longOpen + longestSpan * minute;
const longBars = Array.from({ length: longestSpan + 1 }, (_, i) => ({
  t: longOpen + i * minute, o: i === 0 ? 100.12 : i === longestSpan ? 99.95 : 100.25, c: 110,
}));
const longPoints = roundOpenPoints(vendorOpenPoints(longBars, minute, 2), longOpen, longClose, longClose, 100.12, 2);
ok("the 72-minute card includes its genuine opening and deciding-minute OPENs",
  longPoints?.length === longestSpan + 1 && longPoints[0]?.price === 100.12
  && longPoints.at(-1)?.t === longClose && longPoints.at(-1)?.price === 99.95);

const board = readFileSync(new URL("../src/lib/server/updown-board.ts", import.meta.url), "utf8");
const card = readFileSync(new URL("../src/components/charts/round-live-line.tsx", import.meta.url), "utf8");
ok("the rendered round line applies the tested phase rule",
  card.includes('const visible = typeof assetKey === "string" && assetKey.length > 0')
  && card.includes("&& shouldDisplayRoundLine(state, opensAtMs, closesAtMs, nowMs, openPrice);"));
ok("the sparse vendor line hides rather than contradicts a newer confirmed card read",
  card.includes("real.length === 1 && (hasLaterConfirmedRead(opensAtMs, readPrice ?? null, readQuotedAt ?? null)")
  && card.includes("|| (settled && confirmedAbove)))")
  && card.includes('data-testid="round-live-line-unavailable">{words.confirmedFallback}</p>'));
ok("the real history path uses the tested OPEN mapper", board.includes("vendorOpenPoints(inWindow, plan.intervalMs, asset.decimals)"));
ok("the round component uses the shared range, not a duration-specific request", card.includes("fetch(roundLineHistoryUrl(assetKey)"));
const roundCard = readFileSync(new URL("../src/components/updown/updown-card.tsx", import.meta.url), "utf8");
ok("the actual settled card hands its pinned close receipt to the line",
  roundCard.includes("openPrice={openPrice} closePrice={closePrice} readPrice={readPrice} readQuotedAt={readQuotedAt}"));
const boardPage = readFileSync(new URL("../src/app/updown/page.tsx", import.meta.url), "utf8");
const chartLab = readFileSync(new URL("../src/components/charts/updown-chart-lab.tsx", import.meta.url), "utf8");
const terminal = readFileSync(new URL("../src/components/charts/terminal-chart.tsx", import.meta.url), "utf8");
const dictionary = readFileSync(new URL("../src/lib/i18n-dict.ts", import.meta.url), "utf8");
const distinctBars = roundOpenPoints(points, open, close, open + minute, 100.12, 2);
ok("a later unequal minute OPEN is named as a minute OPEN, not the frozen target, in every language",
  distinctBars?.length === 2 && distinctBars[0]?.price === 100.12
  && distinctBars.at(-1)?.price === 100.25 && distinctBars.at(-1)?.price !== distinctBars[0]?.price
  && card.includes('real.length === 1 ? `${words.noNewer} ${openClock}` : words.minuteOpen')
  && card.includes('en: { openReference: "Opening reference", minuteOpen: "Minute open"')
  && card.includes('sw: { openReference: "Bei ya ufunguzi", minuteOpen: "Ufunguzi wa dakika"')
  && card.includes('zh: { openReference: "开盘参考价", minuteOpen: "分钟开盘价"')
  && card.includes('aria-label={`${words.openReference} ${usd(openPrice, decimals)}.')
  && !card.includes('Price to beat') && !card.includes('Bei ya kushinda') && !card.includes('目标价格')
  && terminal.includes('minuteOpen: "Minute open"')
  && terminal.includes('minuteOpen: "Ufunguzi wa dakika"')
  && terminal.includes('minuteOpen: "分钟开盘价"'));
ok("a late minute line cannot move the live money controls",
  roundCard.indexOf('<div className="ud-act">') > 0
  && roundCard.indexOf('<RoundLiveLine assetKey={assetKey}') > roundCard.indexOf('<div className="ud-act">')
  && roundCard.indexOf('<RoundLiveLine assetKey={assetKey}') < roundCard.indexOf('className="ud-foot'));
ok("the board passes its actual confirmed open, middle and close reads to the large chart",
  boardPage.includes("{ quotedAt: round.openQuotedAt, price: round.openPrice }")
  && boardPage.includes("{ quotedAt: round.readQuotedAt, price: round.readPrice }")
  && boardPage.includes("{ quotedAt: round.closeQuotedAt, price: round.closePrice }")
  && boardPage.includes("pinnedReads={chartPricePins}") && chartLab.includes("pinnedReads={pinnedReads}"));
ok("the large chart masks revised vendor bars but leaves confirmed fallback history alone",
  terminal.includes('if (feed?.sourceTier !== "vendor") return feed;')
  && terminal.includes("maskConflictingVendorOpens(feed.series, pins, feed.decimals)")
  && terminal.includes("{ quotedAt: feed.sourceQuotedAt, price: feed.livePrice }")
  && terminal.includes('status === "error" || feed != null ? labels.error : labels.loading')
  && terminal.includes("latestBarRef.current = null;") && terminal.includes("setLegend(null);"));
ok("only open or locked cards poll every 30 seconds; decided cards freeze",
  card.includes('const active = state === "open" || state === "locked";')
  && card.includes("active ? setInterval(() => void load(), 30_000) : null"));
ok("a decided card can load once after a hidden mount but cannot repaint on later tab reveals",
  card.includes('if (document.visibilityState === "visible" && (active || !frozen)) void load();')
  && card.includes('if (!active && openPrice != null && roundOpenPoints(next.series.points,')
  && card.includes('opensAtMs, closesAtMs, closesAtMs, openPrice, decimals, closePrice,')
  && roundOpenPoints(points, open, close, close, 100.12, 2, 99.95)?.at(-1)?.price === 99.95
  && roundOpenPoints(points, open, close, open - minute, 100.12, 2, 99.95) === null
  && card.includes('if (active) document.addEventListener') === false);
const pendingMarkup = renderToStaticMarkup(createElement(RoundLiveLine, {
  assetKey: "u43b2", opensAtMs: open, closesAtMs: close, openPrice: 100.12,
  closePrice: null, decimals: 2, locale: "sw", state: "open", serverNowMs: open + minute,
}));
ok("an unanswered vendor read paints no invented line and no endless loading label", pendingMarkup === "");
ok("a card missing an asset key never crashes or invents a vendor line",
  renderToStaticMarkup(createElement(RoundLiveLine, {
    assetKey: undefined as unknown as string, opensAtMs: open, closesAtMs: close, openPrice: 100.12,
    decimals: 2, locale: "sw", state: "open", serverNowMs: open + minute,
  })) === "");
ok("a backgrounded first request has a bounded timeout and a truthful unavailable state",
  card.includes('if (alive) setStatus((previous) => previous === "loading" ? "error" : previous);')
  && card.includes("clearTimeout(watchdog)")
  && card.includes('if (status === "loading") return null;')
  && card.includes("{words.unavailable}"));
const linePriceEvidence = { opensAtMs: open, closesAtMs: close, openPrice: 100.12,
  readPrice: 100.25, readQuotedAt: new Date(open + minute).toISOString(), closePrice: 99.95 };
ok("missing minute history names a price only when the card shows a confirmed read or close",
  roundLineConfirmedAbove({ ...linePriceEvidence, state: "open" })
  && roundLineConfirmedAbove({ ...linePriceEvidence, state: "locked" })
  && roundLineConfirmedAbove({ ...linePriceEvidence, state: "resolved", readPrice: null })
  && roundLineConfirmedAbove({ ...linePriceEvidence, state: "void", readPrice: null })
  && !roundLineConfirmedAbove({ ...linePriceEvidence, state: "closing" })
  && !roundLineConfirmedAbove({ ...linePriceEvidence, state: "confirming" })
  && !roundLineConfirmedAbove({ ...linePriceEvidence, state: "resolved", closePrice: null })
  && !roundLineConfirmedAbove({ ...linePriceEvidence, state: "void", closePrice: Number.NaN })
  && !roundLineConfirmedAbove({ ...linePriceEvidence, state: "open", readQuotedAt: null })
  && !roundLineConfirmedAbove({ ...linePriceEvidence, state: "locked", readQuotedAt: new Date(close + minute).toISOString() })
  && card.includes('if (confirmedAbove)')
  && card.includes('|| (settled && confirmedAbove)))')
  && card.includes('cardPriceRead({ opensAtMs, closesAtMs, readQuotedAt: readQuotedAt ?? null, openPrice, readPrice }) === "newer"')
  && cardPriceRead({ opensAtMs: open, closesAtMs: close, readQuotedAt: new Date(open + minute).toISOString(), openPrice: 100.12, readPrice: 100.25 }) === "newer"
  && cardPriceRead({ opensAtMs: open, closesAtMs: close, readQuotedAt: null, openPrice: 100.12, readPrice: 100.25 }) !== "newer"
  && cardPriceRead({ opensAtMs: open, closesAtMs: close, readQuotedAt: new Date(close + minute).toISOString(), openPrice: 100.12, readPrice: 100.25 }) !== "newer"
  && card.includes('return closePrice != null && Number.isFinite(closePrice) && closePrice > 0;')
  && (card.match(/data-testid="round-live-line-unavailable">\{words\.confirmedFallback\}<\/p>/g) ?? []).length === 2
  && (card.match(/data-testid="round-live-line-empty">\{words\.unavailable\}<\/span>/g) ?? []).length === 2
  && card.includes('unavailable: "Minute price history unavailable for this round", confirmedFallback: "Minute history unavailable · confirmed price shown above"')
  && card.includes('unavailable: "Historia ya bei za dakika haipatikani kwa raundi hii", confirmedFallback: "Historia ya dakika haipatikani · bei iliyothibitishwa iko juu"')
  && card.includes('unavailable: "本回合分钟价格历史暂不可用", confirmedFallback: "分钟历史暂不可用 · 上方显示已确认价格"'));
ok("the chart names the plotted point's own time and distinguishes vendor OPEN from a confirmed-read fallback",
  terminal.includes('guardedFeed?.series.mode === "line"')
  && terminal.includes('const chartPointWord = guardedFeed?.sourceTier === "vendor"')
  && terminal.includes('range === "15M" || range === "30M" || range === "1H" ? words.minuteOpen : words.barOpen')
  && terminal.includes('data-testid="updown-chart-point"')
  && terminal.includes('{chartPointWord} {chartPointClock} EAT')
  && terminal.includes('minuteOpen: "Minute open"')
  && terminal.includes('minuteOpen: "Ufunguzi wa dakika"')
  && terminal.includes('minuteOpen: "分钟开盘价"'));
ok("the chart footer gives the plotted point room and repeats a quote only when vendor OPEN can differ",
  terminal.includes('const showConfirmedAside = showLine && (guardedFeed?.sourceTier === "vendor" || lastChartPoint?.price !== guardedFeed?.livePrice);')
  && terminal.includes('{showConfirmedAside && (')
  && !terminal.includes('{words.beat} <span className="tabular-nums">{usd(priceToBeat, guardedFeed.decimals)}</span>')
  && !terminal.includes('Price to beat') && !terminal.includes('Bei ya kushinda') && !terminal.includes('目标价格'));
ok("chart footer separates plotted point from source and time in readable rows",
  terminal.includes('flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-left text-body-sm')
  && terminal.includes('<span className="tabular-nums text-text-subtle">{receipt}</span>')
  && !terminal.includes('text-right font-mono text-body-sm'));
ok("the sparse-data explanation is short, readable and translated",
  dictionary.includes('udNoCandles: "Too few prices for candles · line shown"')
  && dictionary.includes('udNoCandles: "Bei chache kwa mishumaa · mstari umeonyeshwa"')
  && dictionary.includes('udNoCandles: "价格不足以绘制K线 · 显示曲线"')
  && terminal.includes('<p className="mt-1 mb-0 text-body-sm text-text-subtle">{labels.noCandles}</p>'));

__clearVendorCacheForTests();
const asset = { id: "u43-b2", symbol: "BTC/USD", priceSourceUrl: "https://example.test/quote", sourceDomain: "example.test" };
let calls = 0;
const fixture = (async () => {
  calls++;
  await new Promise((resolve) => setTimeout(resolve, 10));
  return new Response(JSON.stringify({ values: [{
    datetime: new Date(open).toISOString().slice(0, 19).replace("T", " "),
    open: "100.12", high: "101", low: "99", close: "100.5",
  }] }), { status: 200 });
}) as typeof fetch;
const sameWindow = await Promise.all(Array.from({ length: 5 }, () => vendorBarsFor(asset, "1H", "test-key", fixture)));
ok("simultaneous viewers spend one vendor credit for the asset's range", calls === 1 && sameWindow.every((result) => result?.length === 1));
await vendorBarsFor(asset, "1H", "test-key", fixture);
ok("the 30-second cache serves later viewers without a new vendor call", calls === 1);
__clearVendorCacheForTests();

// Drive the REAL server history mapping, not just its pure helper. The fixture
// uses CLOSE values far from OPEN so substituting the wrong field is visible.
const storedId = "udast_u43_b2_guard";
const timestamp = new Date().toISOString();
await assetStore.upsert({
  id: storedId, key: "u43b2", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", nameZh: null,
  iconKey: "btc", priceSourceUrl: "https://example.test/quote", sourceDomain: "example.test",
  category: "crypto", decimals: 2, minMoveTicks: 1, enabled: true, sortOrder: 1,
  createdBy: "test", createdAt: timestamp, updatedAt: timestamp,
});
const previousFetch = globalThis.fetch;
const previousKey = process.env.TWELVEDATA_API_KEY;
let fixtureBars = bars;
let fixtureRows: Array<{ datetime: string; open: string; high: string; low: string; close: string }> | null = null;
globalThis.fetch = (async () => new Response(JSON.stringify({ values: fixtureRows ?? fixtureBars.map((bar) => ({
  datetime: new Date(bar.t).toISOString().slice(0, 19).replace("T", " "),
  open: String(bar.o), high: "111", low: "90", close: String(bar.c),
})) }), { status: 200 })) as typeof fetch;
process.env.TWELVEDATA_API_KEY = "test-key";
try {
  const history = await getAssetTerminalSeries("u43b2", "1H", "line");
  const serverPoints = history?.series.mode === "line" ? history.series.points : [];
  ok("the served history labels real vendor OPENs, including the round's deciding minute",
    history?.sourceTier === "vendor" && serverPoints.some((point) => point.t === open && point.price === 100.12)
    && serverPoints.some((point) => point.t === close && point.price === 99.95));
  fixtureBars = longBars;
  __clearVendorCacheForTests();
  const longHistory = await getAssetTerminalSeries("u43b2", "1H", "line", "round");
  const chartHistory = await getAssetTerminalSeries("u43b2", "1H", "line", "chart");
  const longServed = longHistory?.series.mode === "line" ? longHistory.series.points : [];
  const chartServed = chartHistory?.series.mode === "line" ? chartHistory.series.points : [];
  ok("the card endpoint serves the 72-minute opening and close from the shared cached vendor request",
    longHistory?.sourceTier === "vendor" && longServed.some((point) => point.t === longOpen && point.price === 100.12)
    && longServed.some((point) => point.t === longClose && point.price === 99.95));
  ok("the large chart still shows only its labelled one hour",
    chartHistory?.sourceTier === "vendor" && !chartServed.some((point) => point.t === longOpen)
    && chartServed.some((point) => point.t === longClose));
  // A vendor can return a syntactically valid zero or negative OHLC row. It is
  // not a price a player may see: both served views must leave a gap instead.
  const stamp = (t: number) => new Date(t).toISOString().slice(0, 19).replace("T", " ");
  fixtureRows = [
    { datetime: stamp(open), open: "100.12", high: "101", low: "99", close: "100.4" },
    { datetime: stamp(open + minute), open: "0", high: "1", low: "0", close: "0.5" },
    { datetime: stamp(open + 2 * minute), open: "-1", high: "1", low: "-2", close: "0.5" },
    { datetime: stamp(close), open: "99.95", high: "101", low: "99", close: "100" },
    { datetime: stamp(close + minute), open: "100", high: "99", low: "101", close: "100.5" },
  ];
  __clearVendorCacheForTests();
  const safeRoundFeed = await getAssetTerminalSeries("u43b2", "1H", "line", "round");
  const safeChartFeed = await getAssetTerminalSeries("u43b2", "1H", "line", "chart");
  const roundServed = safeRoundFeed?.series.mode === "line" ? safeRoundFeed.series.points : [];
  const chartSafe = safeChartFeed?.series.mode === "line" ? safeChartFeed.series.points : [];
  const onlyPositiveOrGap = (points: typeof roundServed) => points.every((point) => point.price == null || point.price > 0);
  const roundDrawing = roundOpenPoints(roundServed, open, close, close, 100.12, 2, 99.95);
  ok("nonpositive vendor OHLC cannot reach the served chart or round line",
    safeRoundFeed?.sourceTier === "vendor" && safeChartFeed?.sourceTier === "vendor"
    && onlyPositiveOrGap(roundServed) && onlyPositiveOrGap(chartSafe)
    && roundServed.some((point) => point.t === open + minute && point.price === null)
    && roundServed.some((point) => point.t === open + 2 * minute && point.price === null)
    && roundDrawing?.[0]?.price === 100.12 && roundDrawing.at(-1)?.price === 99.95
    && !chartSafe.some((point) => point.t === close + minute && point.price != null));
} finally {
  globalThis.fetch = previousFetch;
  if (previousKey === undefined) delete process.env.TWELVEDATA_API_KEY;
  else process.env.TWELVEDATA_API_KEY = previousKey;
  __clearVendorCacheForTests();
}

console.log(`${failed ? "FAILURES" : "ALL PASS"} — ${failed} failed`);
process.exit(failed ? 1 : 0);
