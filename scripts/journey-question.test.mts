/** S8 WP7a/WP8/WP9: the actual server-rendered picks, seed and break row, plus the question's conditional mount. */
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { JourneyCard, type JourneyCardMarket } from "../src/components/journey/cards/journey-card.tsx";
import { JourneyBetButtons } from "../src/components/journey/question/journey-bet-buttons.tsx";
import { JourneyHolder } from "../src/components/journey/question/journey-holder.tsx";
import { dict, type Locale } from "../src/lib/i18n-dict.ts";
import { cardTitle } from "../src/lib/markets/short-title.ts";
import { DEFAULT_GLOBAL_CONFIG, snapshotFromConfig } from "../src/lib/server/market-config.ts";
import { sheetPublicFrom, type SheetSeed } from "../src/lib/server/journey-sheet.ts";
import type { StoredMarket } from "../src/lib/server/market-service.ts";
import { decomment } from "./lib/decomment.mts";

const NOW = Date.now();
const market = {
  id: "mkt_sheetcard", titleEn: "Will Dodoma have rain?", titleSw: "Je, Dodoma itanyesha?", titleZh: "多多马会下雨吗？",
  shortTitleEn: "Will Dodoma have rain?", shortTitleSw: "Je, Dodoma itanyesha?", shortTitleZh: "多多马会下雨吗？",
  category: "weather", competition: null, status: "LIVE", resolvedOutcome: null, productLine: "MARKET",
  yesPool: 24_825, noPool: 50_462, selectionClosedAt: new Date(NOW + 3_600_000).toISOString(), resolutionAt: new Date(NOW + 7_200_000).toISOString(),
  feeSnapshot: snapshotFromConfig(DEFAULT_GLOBAL_CONFIG), settledAt: null,
} as StoredMarket;
const pub = sheetPublicFrom(market, { min: 500, max: 1_000_000 }, NOW)!;
const { estimates: _estimates, ...publicSeed } = pub;
const seed: SheetSeed = { v: 1, ...publicSeed };
const read = (p: string) => decomment(readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n"));
const page = read("src/app/markets/[id]/page.tsx");
const detailLoading = read("src/app/markets/[id]/loading.tsx");
const parentLoading = read("src/app/markets/loading.tsx");
const questionGhost = read("src/components/journey/question/question-ghost.tsx");
// S8's fetched, immutable pre-product main. WP8 moved this drawing wholesale so loading.tsx can select its reader;
// only the default export's name changed. Comparing the original bytes keeps future main merges from rebasing proof.
const CLASSIC_GHOST_BASE = "7624cf8c9db9f6e43d62d3ff03d09364385e96cc";
const oldBoardGhost = execFileSync("git", ["show", `${CLASSIC_GHOST_BASE}:src/app/markets/loading.tsx`], { encoding: "utf8" }).replace(/\r\n/g, "\n");
// The moved drawing has since taken exactly two reviewed edits, and the proof stays byte-exact: the original bytes with
// exactly these edits, each found once, and nothing else.
//   · U43 (1384383fd, 2026-10-19, "rebuild Up & Down board and market cards"): the ghost's cards take the rebuilt market card's
//     radius, `--r-lg` — made without re-pinning this check, so it stood red from that commit until it was recorded here.
//   · MASWALI-BUILD S5-DESIGN-DOORS H1 (2026-10-21): the Millionea card's slot after the header row (its import, the two
//     booleans `loading.tsx` hands it, the reader's locale, the slot).
const SLOT_EDITS: Array<[string, string]> = [
  ['            className="kp-shimmer-track rounded-md border border-border bg-bg-elevated"\n', '            className="kp-shimmer-track rounded-[var(--r-lg)] border border-border bg-bg-elevated"\n'],
  ['import { useT } from "@/lib/i18n";\n', 'import { useT } from "@/lib/i18n";\nimport { MaswaliHomeCardGhost } from "@/components/maswali/maswali-home-card-ghost";\n'],
  ["export default function MarketsGhost() {\n  const { t } = useT();\n", "export default function MarketsGhost({ millionea = false, preview = false }: { millionea?: boolean; preview?: boolean }) {\n  const { t, locale } = useT();\n"],
  ['        <div className="kp-shimmer-track h-4 w-40 rounded bg-bg-elevated" aria-hidden />\n      </div>\n',
    '        <div className="kp-shimmer-track h-4 w-40 rounded bg-bg-elevated" aria-hidden />\n      </div>\n\n'
    + "      {/* MASWALI-BUILD S5-DESIGN-DOORS H1 · the Millionea card's slot, where the page draws the card (after the header row,\n"
    + "          before the search, mb-3), when `loading.tsx`'s door says it will be offered: the card's own loading picture, so the\n"
    + "          search, the bar and the grid land where they stand (they dropped by the card's height + 16px, 113–303px). */}\n"
    + '      {millionea && <MaswaliHomeCardGhost t={t} locale={locale} host="board" preview={preview} className="mb-3" />}\n'],
];
const renamedBoardGhost = oldBoardGhost.replace("export default function MarketsLoading()", "export default function MarketsGhost()");
const canonicalBoardGhost = SLOT_EDITS.every(([from]) => renamedBoardGhost.split(from).length === 2)
  ? SLOT_EDITS.reduce((s, [from, to]) => s.replace(from, to), renamedBoardGhost) : "(an edit's anchor is not found once in the base bytes)";
const boardGhost = readFileSync(new URL("../src/app/markets/markets-ghost.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const decode = (s: string) => s.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
const attr = (html: string, name: string) => { const match = new RegExp(` ${name}="([^"]*)"`).exec(html); return match ? decode(match[1]) : null; };
const shown = (m: JourneyCardMarket, locale: Locale, onBreak: { until: string; exclusion: boolean } | null = null, supplied: SheetSeed | null = seed) =>
  renderToStaticMarkup(h(JourneyCard, { m, nowMs: NOW, t: dict[locale], locale, sheet: supplied, onBreak }));
const buttons = (locale: Locale, s: SheetSeed = seed) => renderToStaticMarkup(h(JourneyBetButtons, { seed: s, title: cardTitle(locale, market).text, t: dict[locale], headingId: "test-heading" }));
type World = { open: Record<Locale, string>; break: Record<Locale, string>; other: string[]; buttons: Record<Locale, string>; closedButtons: string; page: string; detailLoading: string; parentLoading: string; questionGhost: string; boardGhost: string };
const LOCALES = ["sw", "en", "zh"] as const;
const real: World = {
  open: Object.fromEntries(LOCALES.map((l) => [l, shown(market, l)])) as World["open"],
  break: Object.fromEntries(LOCALES.map((l) => [l, shown(market, l, { until: new Date(NOW + 86_400_000).toISOString(), exclusion: false })])) as World["break"],
  other: [shown(market, "sw", null, null), shown({ ...market, status: "CLOSED" }, "sw"), shown({ ...market, status: "RESOLVED", resolvedOutcome: "YES" }, "sw"), shown({ ...market, productLine: "UPDOWN" }, "sw")],
  buttons: Object.fromEntries(LOCALES.map((l) => [l, buttons(l)])) as World["buttons"], closedButtons: buttons("sw", { ...seed, bettable: false }), page, detailLoading, parentLoading, questionGhost, boardGhost,
};
function checks(w: World): string[] {
  const failed: string[] = [];
  const ok = (name: string, condition: boolean) => { if (!condition) failed.push(name); };
  ok("seed", LOCALES.every((l) => JSON.stringify(JSON.parse(attr(w.open[l], "data-sheet") ?? "null")) === JSON.stringify(seed)
    && attr(w.open[l], "data-sheet-title") === cardTitle(l, market).text
    && (w.open[l].match(/data-bet-side="(?:YES|NO)"/g) ?? []).length === 2));
  ok("break", LOCALES.every((l) => w.break[l].includes("kp-jcard__break") && !w.break[l].includes("data-sheet=") && !w.break[l].includes("data-bet-side=")));
  ok("other", w.other.every((html) => !html.includes("data-sheet=") && !html.includes("data-bet-side=")));
  ok("buttons", LOCALES.every((l) => ["YES", "NO"].every((s) => w.buttons[l].includes(`href="/markets/${market.id}?side=${s}"`) && w.buttons[l].includes(`data-bet-side="${s}"`))
    && attr(w.buttons[l], "data-sheet-title") === cardTitle(l, market).text && attr(w.buttons[l], "data-sheet-origin") === "market") && w.closedButtons === "");
  ok("buttons-motion", LOCALES.every(l => {
    const classes = [...w.buttons[l].matchAll(/<a\b[^>]*class="([^"]+)"/g)].map(m => m[1].split(" "));
    return classes.length === 2 && classes.every(c => c.includes("btn") && !c.includes("press-pop"));
  }));
  ok("mount", w.page.includes(') : journey ? (') && w.page.includes(') : session ? (')
    && !w.page.includes('session ? (journey ? (')
    && w.page.includes('journey && bettingOpen && !breakBody && questionSeed')
    && w.page.includes('className="hidden lg:grid"') && w.page.includes('className="lg:hidden"')
    && w.page.includes('journey && bettingOpen && !breakBody ? "hidden lg:flex'));
  ok("loading", w.detailLoading.includes('const { journey } = await resolveSimpleJourney();')
    && w.detailLoading.includes('if (journey) return <LazyJourneyRouteGhost rails={[]} at="/markets/[id]" />;')
    && w.detailLoading.includes('return <MarketDetailGhost />;') && w.parentLoading.includes('journey && /^\\/markets\\/[^/]+$/.test(pathname)')
    && w.parentLoading.includes("return <MarketsGhost millionea={millionea} preview={millionea && (await millioneaDoor()).preview} />;") && w.parentLoading.includes('import MarketsGhost from "./markets-ghost";')
    && w.parentLoading.includes('import { headers } from "next/headers";')
    && w.parentLoading.includes('const pathname = (await headers()).get("x-pathname") ?? "";')
    && !w.parentLoading.includes('"use client"') && !w.detailLoading.includes('"use client"'));
  ok("board-ghost", oldBoardGhost.includes("export default function MarketsLoading()") && w.boardGhost === canonicalBoardGhost);
  ok("ghost-marker", (w.questionGhost.match(/data-testid="journey-question-ghost"/g) ?? []).length === 1
    && /<header data-testid="journey-question-ghost" className="mt-3 mb-5" aria-hidden>/.test(w.questionGhost));
  return failed;
}
const failures = checks(real);
if (!process.argv.includes("--prove-red")) {
  const emptyHolder = renderToStaticMarkup(h(JourneyHolder, { m: market, positions: [], values: new Map(), sellable: new Map(), pricedFree: new Map(), selectionClosed: false, nowMs: NOW, t: dict.sw, locale: "sw" }));
  if (emptyHolder !== "") failures.push("empty-holder");
  console.log(`journey-question: ${failures.length === 0 ? "all checks passed" : `FAILED ${failures.join(", ")}`}`);
  process.exitCode = failures.length === 0 ? 0 : 1;
} else {
  const plants: Array<[string, World]> = [
    ["seed", { ...real, open: { ...real.open, sw: real.open.sw.replaceAll('data-sheet=', 'data-lost-sheet=') } }],
    ["break", { ...real, break: { ...real.break, sw: real.open.sw } }],
    ["other", { ...real, other: [...real.other, real.open.sw] }],
    ["buttons", { ...real, closedButtons: real.buttons.sw }],
    ["buttons-motion", { ...real, buttons: { ...real.buttons, sw: real.buttons.sw.replace('class="btn btn-yes', 'class="btn-yes') } }],
    ["buttons-motion", { ...real, buttons: { ...real.buttons, sw: real.buttons.sw.replace('class="btn btn-yes', 'class="press-pop btn btn-yes') } }],
    ["mount", { ...real, page: page.replace('className="lg:hidden"', 'className="grid"') }],
    ["mount", { ...real, page: page.replace(') : journey ? (', ') : journey && session ? (') }],
    ["mount", { ...real, page: page.replace('journey && bettingOpen && !breakBody && questionSeed', 'journey && bettingOpen && session && !breakBody && questionSeed') }],
    ["mount", { ...real, page: page.replace('journey && bettingOpen && !breakBody ? "hidden lg:flex', 'journey && bettingOpen && session && !breakBody ? "hidden lg:flex') }],
    ["loading", { ...real, parentLoading: parentLoading.replace('journey && /^\\/markets\\/[^/]+$/.test(pathname)', 'journey') }],
    ["ghost-marker", { ...real, questionGhost: questionGhost.replace('data-testid="journey-question-ghost"', '') }],
    ["board-ghost", { ...real, boardGhost: boardGhost.replace('tier="board"', 'tier="reading"') }],
    ["board-ghost", { ...real, boardGhost: boardGhost.replace('"use client";', '') }],
    // S5-DESIGN-DOORS H1: the Millionea slot losing the page's mb-3 (the search would land 16px high) is not the approved edit.
    ["board-ghost", { ...real, boardGhost: boardGhost.replace('preview={preview} className="mb-3" />}', "preview={preview} />}") }],
    ["loading", { ...real, parentLoading: parentLoading.replace('"x-pathname"', '"x-wrong-pathname"') }],
    ["loading", { ...real, parentLoading: `"use client";\n${parentLoading}` }],
  ];
  const missed = plants.filter(([expect, world]) => { const got = checks(world); return got.length !== 1 || got[0] !== expect; });
  console.log(`journey-question red: ${plants.length - missed.length}/${plants.length} caught${missed.length ? ` MISSED ${missed.map(([n]) => n).join(", ")}` : ""}`);
  process.exitCode = failures.length === 0 && missed.length === 0 ? 0 : 1;
}
