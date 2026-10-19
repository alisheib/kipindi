/** U43 B3: the two visible axes, bettable-first order, and honest board states. */
import { readFileSync } from "node:fs";
import { bettableFirst, type BoardOrderRound } from "../src/lib/updown-board-order";
import { suppressChatOnU43, suppressNeedleOnU43 } from "../src/lib/u43-overlay-routes";
import { decomment } from "./lib/decomment.mts";

let failures = 0;
function ok(label: string, value: boolean) {
  console.log(`${value ? "PASS" : "FAIL"} ${label}`);
  if (!value) failures++;
}
const read = (file: string) => decomment(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
const page = read("src/app/updown/page.tsx");
const viz = read("src/components/charts/board-viz.tsx");
const ghost = read("src/app/updown/updown-ghost.tsx");
const capture = read("scripts/live/updown-visual-capture.mjs");
const states = read("scripts/live/updown-visual-states.mjs");
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const card = read("src/components/updown/updown-card.tsx");
const controls = read("src/components/updown/updown-stake-controls.tsx");
const dictionary = read("src/lib/i18n-dict.ts");
const chat = read("src/components/chat/ChatRoot.tsx");
const needle = read("src/components/layout/needle.tsx");

const now = Date.parse("2026-10-19T12:02:00Z");
const round = (state: string, extras: Partial<BoardOrderRound> = {}): BoardOrderRound => ({
  state, opensAt: "2026-10-19T12:00:00Z", closesAt: "2026-10-19T12:05:00Z",
  selectionClosedAt: "2026-10-19T12:04:00Z", openPrice: 100,
  upTarget: 100.02, downTarget: 99.98, ...extras,
});
const locked = round("locked");
const open = round("open");
const input = [locked, open];
ok("bettable round leads and source order is unchanged", bettableFirst(input, now)[0] === open && input[0] === locked);
ok("a passed selection deadline is never called bettable", bettableFirst([locked, round("open", { selectionClosedAt: "2026-10-19T12:01:00Z" })], now)[0] === locked);
ok("a missing frozen price is never called bettable", bettableFirst([locked, round("open", { openPrice: null })], now)[0] === locked);
ok("a future round is never called bettable", bettableFirst([locked, round("open", { opensAt: "2026-10-19T12:03:00Z" })], now)[0] === locked);

ok("render uses bettable-first order", page.includes("const displayedRounds = bettableFirst(rounds, Date.now())") && page.includes("{displayedRounds.map((r) => ("));
ok("board header names both phone actions", page.includes("{t.market.udRulesShort}") && page.includes("{t.common.myBets}"));
ok("price tape, duplicate live eyebrow and view switch are removed", !/<PriceTape|<AssetTicker|udViewCubes|udViewChart|udStreaming/.test(page));
ok("recent outcomes remain before the inline chart", viz.indexOf('className="ud-board-cubes"') > 0 && viz.indexOf('className="ud-board-cubes"') < viz.indexOf('className="ud-board-chart"') && viz.includes("aria-expanded={open}"));
ok("phone card precedes the chart; desktop puts chart beside it", /\.ud-board-rounds\s*\{\s*order:\s*1/.test(css) && /\.ud-board-lab\s*\{\s*order:\s*2/.test(css) && /grid-template-columns:\s*minmax\(0, 1fr\) 392px/.test(css));
ok("tablet result card stays slim beside the live round",
  page.includes('<div className="grid items-start gap-4"')
  && css.includes('.ud-card { height: auto; gap: var(--ud-gap); padding: var(--ud-pad); }'));
ok("the loading drawing has the same two visible chip rows", (ghost.match(/className="ud-filter-rail/g) ?? []).length === 2 && !ghost.includes("price tape"));
const tabs = read("src/components/updown/updown-board-tabs.tsx");
ok("320 Swahili duration pills fit without a duplicate sheet", tabs.includes('className="ud-filter-rail mt-2 flex gap-0.5"')
  && ghost.includes('className="ud-filter-rail mt-2 flex gap-0.5"')
  && tabs.includes('rail.scrollWidth > rail.clientWidth + 1')
  && tabs.includes('className={choicesOverflow ? "mt-2 sm:hidden" : "hidden"}'));
ok("320 first card clears the fixed rail without removing either chip row",
  page.includes('className="ud-board-page mx-auto') && ghost.includes('className="ud-board-page mx-auto')
  && css.includes('.ud-board-page { padding-top: var(--sp-1); }')
  && css.includes('.ud-board-page .ud-board-header > p:last-child { display: none; }')
  && css.includes('.ud-board-page > .ud-filter-rail.mt-4 { margin-top: var(--sp-1); }')
  && css.includes('.ud-board-page > .ud-filter-rail.mt-2 { margin-top: var(--sp-1); }')
  && css.includes('.ud-board-page .ud-board-rounds { margin-top: var(--sp-1); }'));
ok("320 held stake choices clear the rail without shrinking controls or hiding the confirmed quote",
  dictionary.includes('udBetsCloseIn: "Dau linafungwa"')
  && !dictionary.includes('udBetsCloseIn: "Dau linafungwa baada ya"')
  && card.includes('className="ud-now-delta font-mono text-micro tabular-nums"')
  && css.includes('.ud-card .ud-now-delta { display: none; }')
  && card.includes('className="ud-oneside-caption flex"')
  && css.includes('.ud-card .ud-oneside-caption { display: none; }')
  && card.includes('className="ud-figure font-mono font-semibold tabular-nums">{priceText.live}</span>'));
ok("320 and 360 keep ready actions clear and remove only the duplicate prompt",
  css.includes('@media (max-width: 390px) {')
  && css.includes('.ud-board-page .ud-board-header > p:last-child { display: none; }')
  && css.includes('.ud-card .ud-stake-ready-helper { display: none; }')
  && controls.includes('compact && bet.stakeReady && !bet.pending && !bet.locallyLocked && "ud-stake-ready-helper"')
  && controls.includes('{bet.pending') && controls.includes('{t.market.udInsufficientBalance}'));
ok("narrow cards put the truthful one-sided refund condition before money choices",
  card.includes('bettable && outEmptyCopy && (')
  && card.indexOf('className="ud-refund-brief') > card.indexOf('className="ud-split"')
  && card.indexOf('className="ud-refund-brief') < card.indexOf('className="ud-act"')
  && card.includes('{t.market.udOneSideRefundBrief}')
  && css.includes('.ud-refund-brief { display: none; }')
  && css.includes('.ud-card .ud-refund-brief { display: block; }')
  && css.includes('.ud-card .ud-oneside-caption { display: none; }')
  && dictionary.includes('udOneSideRefundBrief: "One side at close: stakes return."')
  && dictionary.includes('udOneSideRefundBrief: "Upande mmoja hadi mwisho: dau hurudi."')
  && dictionary.includes('udOneSideRefundBrief: "截止时仅一方投注：本金退还。"'));
ok("locked card reserves the preceding live action footprint",
  card.includes('data-ud-layout={isAuthed === true && marketId ? (myUpStake > 0 || myDownStake > 0 ? "held" : "player") : "guest"}')
  && css.includes('.ud-card[data-phase="locked"][data-ud-layout="guest"] { min-height: 337px; }')
  && css.includes('.ud-card[data-phase="locked"][data-ud-layout="held"] { min-height: 411px; }')
  && css.includes('.ud-card[data-phase="locked"][data-ud-layout="held"] { min-height: 457px; }')
  && css.includes('.ud-card[data-phase="locked"] .ud-act { flex: 1 0 auto; margin-top: 0; }'));
ok("locked card spreads spare room at 360 and wider without moving 320 next step",
  css.includes('@media (min-width: 360px) {')
  && css.includes('.ud-card[data-phase="locked"] { justify-content: space-between; }')
  && css.includes('.ud-card[data-phase="locked"] .ud-act { flex: 0 0 auto; }'));
ok("Needle stands down on the board and round but not Up & Down history",
  suppressNeedleOnU43("/updown") && suppressNeedleOnU43("/updown/round_1")
  && !suppressNeedleOnU43("/updown/history") && !suppressNeedleOnU43("/updown/history/x")
  && !suppressNeedleOnU43("/markets") && !suppressNeedleOnU43("/updownx"));
ok("chat stands down over market choices and U43 money controls",
  suppressChatOnU43("/markets") && suppressChatOnU43("/updown")
  && suppressChatOnU43("/updown/round_1") && !suppressChatOnU43("/updown/history")
  && !suppressChatOnU43("/markets/round_1"));
ok("floating helpers apply the route gate before paint and close an open chat panel",
  needle.includes('suppressNeedleOnU43(pathname)') && needle.includes('hidden={suppressNeedleOnU43(pathname)}')
  && chat.includes('if (suppressChatOnU43(pathname)) setOpen(false);')
  && chat.includes('if (suppressChatOnU43(pathname)) return null;'));
ok("both U43 captures use the approved 360 by 740 phone viewport",
  capture.includes('360: 740') && states.includes('360: 740')
  && !capture.includes('360: 780') && !states.includes('360: 780'));
ok("capture shows the current chart control in its phone and desktop defaults", capture.includes('localStorage.setItem("kp-updown-chart-open", "closed")') && capture.includes('localStorage.setItem("kp-updown-chart-open", "open")') && states.includes('localStorage.setItem("kp-updown-chart-open", desktop ? "open" : "closed")') && states.includes('c.width >= 1024') && !capture.includes("kp-updown-viz") && !states.includes("kp-updown-viz"));
ok("capture hides chrome without mutating React hydration nodes", capture.includes("const style = await page.addStyleTag") && states.includes("const style = await page.addStyleTag") && !capture.includes("data-u43-hid") && !states.includes("data-u43-hid"));
ok("dev review frames hide Next's tool overlay after hydration", capture.includes('nextjs-portal{visibility:hidden!important}') && states.includes('const STILL = "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}nextjs-portal{visibility:hidden!important}";') && states.includes('nextjs-portal{visibility:hidden!important}'));
ok("state capture reads the numeric clock leaf without rejecting settled words", states.includes("cards.length > 0") && states.includes('const running = [...document.querySelectorAll(\'article.mcardp[data-phase="open"],article.mcardp[data-phase="locked"]\')]') && (states.match(/card\.querySelector\("\.ud-clock > \.m-tick\.tabular-nums"\)/g) ?? []).length === 2 && states.includes("/\\d/.test(tick)") && states.includes('!tick.includes("—:—")'));
ok("state capture accepts a real round detail without demanding board cards", states.includes('if (detailPage) return !!document.querySelector("main h1") && !!document.querySelector("main section")') && states.includes('/^\\/updown\\/[^/?]+/.test(path)'));
ok("capture waits for card glyphs to paint", capture.includes('querySelectorAll("article.mcardp svg")') && states.includes('querySelectorAll("article.mcardp svg")') && capture.includes("el.getBBox().width > 0") && (states.match(/el\.getBBox\(\)\.width > 0/g) ?? []).length === 2);
ok("market card capture waits for side words to paint after scrolling", /await cards\.nth\(i\)\.scrollIntoViewIfNeeded\(\);\r?\n          await p\.page\.evaluate/.test(states) && states.includes("requestAnimationFrame(() => requestAnimationFrame(resolve))") && states.includes('path === "/markets"') && states.includes('choices.count() !== 2') && states.includes("unreadable side choice") && capture.includes("await cards.nth(i).scrollIntoViewIfNeeded()") && capture.includes('sideButtons.count() !== 2'));
ok("desktop chart frames wait for a painted plot", states.includes('chartReady = await p.page.waitForFunction') && states.includes('.ud-chart-slot [role="img"] > div[style*="opacity: 1"] canvas') && (states.match(/s\.chartReady === false/g) ?? []).length === 2 && capture.includes('await p2.waitForFunction(() => !!document.querySelector(\'.ud-chart-slot [role="img"] > div[style*="opacity: 1"] canvas\')'));
ok("final state capture covers both viewers at seven widths in three languages",
  states.includes('process.env.MATRIX === "full"')
  && states.includes('"320,360,390,768,1024,1280,1920"')
  && states.includes('"sw,en,zh"')
  && states.includes('{ who: "guest", locale, width }, { who: "player", locale, width }')
  && states.includes('const inFullMatrix = (quickFilter) => (cell) => fullMatrix || quickFilter(cell)')
  && states.includes('const receiptPlayers = receiptParticipants(pages, fullMatrix)')
  && states.includes('if (receiptPlayers.length === 0) die("state capture needs a signed-in cell for a real quick bet")')
  && states.includes('const bettor = receiptPlayers.find((p) => p.width === 360) ?? receiptPlayers[0]')
  && (states.match(/inFullMatrix\(/g) ?? []).length >= 7);
ok("state driver never calls a merely spent or historical round settled",
  states.includes('return ph === "resolved" || ph === "void";')
  && states.includes('index.settle?.closed?.id !== round.id || !index.settle.closed.resolvedAt')
  && !states.includes('return ph === "spent" || ph.startsWith("h:")'));
ok("empty board distinguishes calendar, stopped chain, and scheduled gap", page.includes("marketReopensAt != null ?") && page.includes("chainPaused ?") && page.includes("udNextMatchNoneBody") && page.includes("udNoRoundsBody"));

console.log(`U43 BOARD: ${failures} failed`);
process.exit(failures ? 1 : 0);
