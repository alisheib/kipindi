/** U43 B4: real seven-day price shape and the market card's visible facts. */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { hasDrawableMarketSpark, sampleMarketSpark } from "../src/lib/markets/market-spark.ts";
import { marketCardSettledDate } from "../src/lib/markets/market-card-date.ts";
import { MicroSpark } from "../src/components/charts/micro-spark.tsx";
import { Chip } from "../src/components/ui/chip.tsx";
import { dict } from "../src/lib/i18n-dict.ts";
import { STATUS_TONE, TONE_CHIP } from "../src/lib/status-tone.ts";
import { decomment } from "./lib/decomment.mts";

let failed = 0;
function check(name: string, condition: boolean, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failed++;
}
const read = (path: string) => decomment(readFileSync(path, "utf8"));
const day = 24 * 3600_000;
const now = Date.UTC(2026, 9, 19, 12);
const start = now - 7 * day;
const row = (atDay: number, pct: number) => ({ t: new Date(start + atDay * day).toISOString(), yesPool: pct, noPool: 100 - pct });
const oneSided = (atDay: number) => ({ t: new Date(start + atDay * day).toISOString(), yesPool: 100, noPool: 0 });

const sampled = sampleMarketSpark([
  row(0.5, 50), row(1, 51), row(1.5, 52), row(2, 53), oneSided(3),
  row(5, 54), row(5.5, 55), row(6, 56), row(6.5, 57),
], now, 8);
check("1.1 time slots carry the last real split, not the event index", JSON.stringify(sampled) === JSON.stringify([null, 51, 53, null, null, 54, 56, 57]), JSON.stringify(sampled));
check("1.2 a one-sided interval has no invented price", sampled[3] === null && sampled[4] === null);
check("1.3 before the first priced bet is blank", sampled[0] === null);
check("1.4 fewer than four priced observations show no graph", sampleMarketSpark([row(1, 50), row(2, 51), row(3, 52)], now).length === 0);
check("1.5 invalid clock shows no graph", sampleMarketSpark([row(1, 50)], Number.NaN).length === 0);
check("1.6 separated priced slots do not leave a label with no line",
  !hasDrawableMarketSpark([null, 50, null, 51]) && hasDrawableMarketSpark([null, 50, 51]) && !hasDrawableMarketSpark([null, Number.NaN, 51]));
const settledAt = "2026-10-19T22:30:00.000Z"; // 20 Oct in East Africa
check("1.7 a recorded settlement day uses EAT and the reader's month words",
  marketCardSettledDate(settledAt, now, dict.en.common.monthsShort, "en") === "20 Oct"
  && marketCardSettledDate(settledAt, now, dict.sw.common.monthsShort, "sw") === "20 Okt"
  && marketCardSettledDate(settledAt, now, dict.zh.common.monthsShort, "zh") === "2026年10月20日");
check("1.8 a missing, malformed or unclocked settlement invents no day",
  marketCardSettledDate(null, now, dict.en.common.monthsShort, "en") === null
  && marketCardSettledDate("bad timestamp", now, dict.en.common.monthsShort, "en") === null
  && marketCardSettledDate(settledAt, undefined, dict.en.common.monthsShort, "en") === null);

const sparseSvg = renderToStaticMarkup(createElement(MicroSpark, {
  data: [null, 50, 50, null, 51, 51], width: 100, height: 28, padX: 0, padY: 4,
  area: true, areaOpacity: 0.1, pip: true, minSpan: 10,
}));
check("2.1 missing price splits the stroke into two paths", (sparseSvg.match(/stroke="var\(--aqua-400\)"/g) ?? []).length === 2);
check("2.2 the quiet move uses a ten-point y scale", /d="M 20\.0 24\.0 L 40\.0 24\.0"/.test(sparseSvg) && /d="M 80\.0 22\.0 L 100\.0 22\.0"/.test(sparseSvg), sparseSvg.slice(0, 350));
check("2.3 the aqua area and latest dot are visible", (sparseSvg.match(/fill-opacity="0\.1"/g) ?? []).length === 2 && sparseSvg.includes('cx="100"'));

const card = read("src/components/markets/market-card.tsx");
const history = read("src/lib/server/market-history.ts");
const cardFunction = card.slice(card.indexOf("export function MarketCard("));
const footerStart = cardFunction.indexOf('className="mcardp-meta"');
const footerEnd = cardFunction.indexOf('className="mcardp-foot flex items-center justify-end gap-2"', footerStart);
const footerLead = footerStart >= 0 && footerEnd > footerStart ? cardFunction.slice(footerStart, footerEnd) : "";
const badge = card.slice(card.indexOf("function getSignalBadge("), card.indexOf("function DayAgoMove("));
check("3.1 the batch and single readers use the same time sampler", /const spark = sampleMarketSpark\(points, now\);/.test(history) && !/compress\(priced, 16\)/.test(history));
check("3.2 closing SOON beats HOT", badge.indexOf('if (closesWithinTheHour(msLeft)) return { kind: "soon"') >= 0 && badge.indexOf("if (closesWithinTheHour(msLeft))") < badge.indexOf("if (volume >= 30_000"));
check("3.3 live grid cards use one static mark directly before the top-right clock", cardFunction.includes("featured || !live")
  && cardFunction.includes('live && <span className="mcardp-closes inline-flex items-center gap-1" data-market-part="time">{!featured && <span className="mcardp-live-mark"><span className="mcardp-live-dot" aria-hidden />')
  && !cardFunction.includes(') : (\n          <span className="mcardp-live-mark"'));
check("3.4 one quiet fact replaces a dead action on closed cards", cardFunction.includes('className="mcardp-fact gap-1"') && cardFunction.includes("t.market.resVoidRefund") && cardFunction.includes("t.market.resFinalPool") && !cardFunction.includes("pointer-events-none opacity-85"));
check("3.4c the flex fact line visibly separates its pool label and amount", cardFunction.includes('className="mcardp-fact gap-1"') && cardFunction.includes('t.market.resFinalPool}<span className="amount">'));
check("3.4a terminal cards use a real settle date instead of repeating their pool or outcome in meta",
  cardFunction.includes('const settledDate = marketCardSettledDate(settledAt, nowMs, t.common.monthsShort, locale)')
  && cardFunction.includes('statusWord === "RESOLVED" || statusWord === "VOID" ? (')
  && cardFunction.includes('settledDate && settledAt && <time data-market-part="settled-date"')
  && cardFunction.includes('dateTime={settledAt}')
  && cardFunction.includes('aria-label={fill(t.home.settledOn, { date: settledDate })}'));
check("3.4b board, archive and watchlist pass recorded settlement time and the stable read clock",
  ["src/app/markets/page.tsx", "src/app/results/page.tsx", "src/app/watchlist/page.tsx"].every((path) => {
    const source = read(path);
    const start = path.includes("markets/page") ? source.lastIndexOf("<MarketCard") : source.indexOf("<MarketCard");
    const call = source.slice(start, source.indexOf("/>", start));
    return call.includes("settledAt={m.settledAt}") && call.includes("nowMs={nowMs}");
  }));
check("3.5 the grid pool has its noun while featured fresh keeps its existing words", /data-market-part="pool" className=\{featured && fresh \? "mcardp-nopool" : "mcardp-pool"\}[\s\S]{0,150}\{t\.common\.pool\}/.test(cardFunction));
check("3.6 the seven-day micro chart has a label, minimum scale and pip", cardFunction.includes("t.market.spark7d") && cardFunction.includes("minSpan={10}") && cardFunction.includes("areaOpacity={0.1} pip") && cardFunction.includes("hasDrawableMarketSpark(spark)"));
check("3.7 the Swahili predictor count puts its noun first", cardFunction.includes('locale === "sw"') && cardFunction.includes("t.market.predictorsCount}{\" \"}<b>{formatNumber(predictors)}</b>"));
check("3.7a the headline names the funded leader, including NO", cardFunction.includes('const leadingSide = noPool > yesPool ? "NO" : "YES"')
  && cardFunction.includes('sideWord(t, leadingSide, productLine)') && cardFunction.includes('{leadingPct}') && cardFunction.includes('mcardp-pctcap--no'));
check("3.8 the price figure stays neutral and the side caption keeps its ink", /\.mcardp-pct \{[^}]*color: var\(--text\)/.test(readFileSync("src/app/globals.css", "utf8")) && /\.mcardp-pctcap \{[^}]*color: var\(--yes-400\)/.test(readFileSync("src/app/globals.css", "utf8")));
check("3.9 all three languages name the seven-day trend", ["en", "sw", "zh"].every((locale) => !!(dict[locale].market as Record<string, string>).spark7d));
check("3.10 a resolved status is neutral everywhere; a player's WIN still owns gold",
  STATUS_TONE.RESOLVED.player === "slate" && STATUS_TONE.RESOLVED.admin === "slate" && STATUS_TONE.RESOLVED.proposals === "slate"
  && TONE_CHIP[STATUS_TONE.RESOLVED.player] === "neutral" && TONE_CHIP[STATUS_TONE.WIN.player] === "gold");
check("3.11 market verdict chips read the shared neutral status tone, never the gold variant",
  read("src/app/markets/[id]/page.tsx").includes('<Chip variant={TONE_CHIP[STATUS_TONE.RESOLVED.player]} size="lg" metrics="status">')
  && read("src/app/results/page.tsx").includes('<Chip variant={TONE_CHIP[STATUS_TONE.RESOLVED.player]} size="sm" metrics="status">')
  && read("src/components/markets/resolution-panel.tsx").includes('<Chip variant={TONE_CHIP[STATUS_TONE[isVoid ? "VOID" : "RESOLVED"].player]} metrics="status">'));
const neutralStatus = renderToStaticMarkup(createElement(Chip, { variant: "neutral", metrics: "status" }, "LIVE"));
check("3.12 featured LIVE status reads the neutral dictionary, with no red live dot",
  STATUS_TONE.LIVE.player === "slate" && TONE_CHIP[STATUS_TONE.LIVE.player] === "neutral"
  && cardFunction.includes('variant={TONE_CHIP[STATUS_TONE[statusWord].player]}')
  && !cardFunction.includes('dot={featured && live}')
  && neutralStatus.includes('data-kit-chip-variant="neutral"')
  && neutralStatus.includes('color:var(--text-muted)')
  && !neutralStatus.includes('live-dot'));
check("3.13 HOT status is neutral instead of NO-side rose",
  cardFunction.includes('variant={signal.kind === "hot" ? "neutral" : signal.kind === "soon" ? "pending"')
  && !cardFunction.includes('signal.kind === "hot" ? "hot"'));
check("3.14 the market countdown dot uses neutral ink",
  /\.mcardp-live-dot \{[^}]*background: var\(--text-subtle\)/.test(readFileSync("src/app/globals.css", "utf8")));
check("3.15 pool, info, Share and Details share one footer row",
  footerLead.includes('className="mcardp-meta-right"')
  && footerLead.includes("<HowItWorks />")
  && !footerLead.includes("</div>")
  && cardFunction.slice(footerEnd).includes("<ShareButton compact marketId={id} title={title} />")
  && cardFunction.slice(footerEnd).includes("className=\"mcardp-details\""));
check("3.15b footer actions retain their slot after the pool at narrow widths",
  /\.mcardp-meta > \.mcardp-foot \{[^}]*margin-left: auto;[^}]*flex-shrink: 0;/.test(readFileSync("src/app/globals.css", "utf8")));
check("3.16 the market board count uses its Open tab's word in all three languages",
  read("src/app/markets/page.tsx").includes('<span className="text-text-subtle">{t.market.statusOpen}</span>')
  && ["en", "sw", "zh"].every((locale) => !!dict[locale].market.statusOpen)
  && dict.zh.market.statusOpen === "开放");

console.log(`U43 market card: ${failed ? `${failed} failed` : "all checks passed"}`);
process.exit(failed ? 1 : 0);
