/** U43 B3: the two visible axes, bettable-first order, and honest board states. */
import { readFileSync } from "node:fs";
import { bettableFirst, type BoardOrderRound } from "../src/lib/updown-board-order";
import { suppressChatOnU43, suppressNeedleOnU43 } from "../src/lib/u43-overlay-routes";
import { cardRefundBrief } from "../src/lib/updown-card-refund";
import { sameCardFootprint } from "./lib/u43-card-height.mjs";
import { dict } from "../src/lib/i18n-dict";
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
const heldProbe = read("scripts/u43-held-clearance-probe.mjs");
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const locked320 = [...css.matchAll(/@media \(max-width: 359px\) \{([\s\S]*?)\n\}/g)]
  .map((match) => match[1]).find((body) => body.includes('data-phase="locked"')) ?? "";
const locked360 = [...css.matchAll(/@media \(min-width: 360px\) \{([\s\S]*?)\n\}/g)]
  .map((match) => match[1]).find((body) => body.includes('data-phase="locked"')) ?? "";
const card = read("src/components/updown/updown-card.tsx");
const controls = read("src/components/updown/updown-stake-controls.tsx");
const journeyArm = read("src/components/journey/updown/jud-arm.tsx");
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
// 2026-10-20: first paint leaves the client-only chart choice unresolved; the
// control must report collapsed until a real chart is mounted after hydration.
ok("recent outcomes remain before the inline chart", viz.indexOf('className="ud-board-cubes"') > 0 && viz.indexOf('className="ud-board-cubes"') < viz.indexOf('className="ud-board-chart"') && viz.includes("aria-expanded={open === true}"));
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
  && !card.includes('ud-now-delta')
  && !css.includes('.ud-card .ud-now-delta')
  && card.includes('className="ud-oneside-caption flex"')
  && css.includes('.ud-card .ud-oneside-caption { display: none; }')
  && card.includes('className="ud-figure font-mono font-semibold tabular-nums">{priceText.live}</span>'));
ok("320 held card keeps a measured action reserve above the fixed rail",
  css.includes('.ud-card[data-ud-layout="held"][data-phase="open"] { gap: 3px; }')
  && states.includes('if (action.clearance < 24) throw new Error(`held action clearance ${action.clearance.toFixed(1)}px below 24px`);')
  && states.includes('process.env.HELD_CAPTION_RED === "1"'));
ok("320 open and held cards keep the timed no-new-price line to one row without hiding it",
  dict.en.home.udMatchNoNewPrice === "No new price since {time}"
  && dict.sw.home.udMatchNoNewPrice === "Hakuna bei mpya tangu {time}"
  && dict.zh.home.udMatchNoNewPrice === "自 {time} 开盘暂无新价格"
  && card.includes('t.home.udMatchNoNewPrice.replace("{time}", openClock)')
  && heldProbe.includes('open.heldAction.minButtonHeight < 40 || open.heldAction.clearance < 24')
  && heldProbe.includes('shot.heldAction.minButtonHeight < 40 || shot.heldAction.clearance < 24')
  && heldProbe.includes('open?.heldAction?.layout !== "player"')
  && heldProbe.includes('shot?.heldAction?.layout !== "held"'));
ok("320 and 360 keep ready actions clear and remove only the duplicate prompt",
  css.includes('@media (max-width: 390px) {')
  && css.includes('.ud-board-page .ud-board-header > p:last-child { display: none; }')
  && css.includes('.ud-card .ud-stake-ready-helper { display: none; }')
  && controls.includes('compact && bet.stakeReady && !bet.pending && !bet.locallyLocked && "ud-stake-ready-helper"')
  && controls.includes('{bet.pending') && controls.includes('{t.market.udInsufficientBalance}'));
ok("every card gives one short refund condition before the choices",
  card.includes('const refundBrief = cardRefundBrief(t, emptySideOf(pricing));')
  && card.includes('bettable && refundBrief && (')
  && card.indexOf('className="ud-refund-brief') > card.indexOf('className="ud-split"')
  && card.indexOf('className="ud-refund-brief') < card.indexOf('className="ud-act"')
  && card.includes('{refundBrief}')
  && !card.includes('outEmptyCopy')
  && controls.includes('!compact && emptyCopy && (')
  && journeyArm.includes('{size === "detail" && <EmptySideNote t={t} side={judEmptySide(round.pricing, null)} />}')
  && css.includes('.ud-refund-brief { display: block; }')
  && css.includes('.ud-card .ud-oneside-caption { display: none; }')
  && !css.includes('.ud-card .ud-refund-brief { display: none; }'));
ok("refund condition names the actually empty side in all three languages",
  cardRefundBrief(dict.en, "UP") === "If Up stays empty, stakes return."
  && cardRefundBrief(dict.sw, "DOWN") === "Chini ikibaki tupu, dau hurudi."
  && cardRefundBrief(dict.zh, "DOWN") === "若跌方仍无人投注，本金退还。"
  && cardRefundBrief(dict.en, "BOTH") === "No bets yet. If only one side has bets at close, every stake returns."
  && cardRefundBrief(dict.sw, "BOTH") === "Hakuna dau bado. Madau yakifungwa na upande mmoja tu, kila dau litarudi."
  && cardRefundBrief(dict.zh, "BOTH") === "暂无投注。投注截止时若只有一方有投注，所有本金退回。"
  && cardRefundBrief(dict.en, null) === null);
ok("a zero-pool card says no bets exist before giving the conditional refund rule",
  [dict.en, dict.sw, dict.zh].every((t) => cardRefundBrief(t, "BOTH") === t.market.udNobodyBackedEither)
  && ![dict.en, dict.sw, dict.zh].some((t) => cardRefundBrief(t, "BOTH") === t.market.udOneSideRefundBrief));
ok("two-sided banded card warns of small-move refunds before the choices in every language",
  card.includes('const bandBrief = price.kind === "priced" && upTarget != null && downTarget != null')
  && card.includes('&& Number.isFinite(upTarget) && Number.isFinite(downTarget) && upTarget > downTarget')
  && card.includes('? t.market.udBandBeforeBet : null;')
  && card.includes('bettable && bandBrief && (')
  && card.includes('{bandBrief}')
  && card.indexOf('{bandBrief}') > card.indexOf('className="ud-split"')
  && card.indexOf('{bandBrief}') < card.indexOf('className="ud-act"')
  && [dict.en, dict.sw, dict.zh].every((t) => t.market.udBandBeforeBet.length > 0));
ok("320 locked card follows its content instead of reserving empty live space",
  card.includes('data-ud-layout={isAuthed === true && marketId ? (myUpStake > 0 || myDownStake > 0 ? "held" : "player") : "guest"}')
  && css.includes('.ud-card[data-phase="locked"] .ud-act { flex: 0 0 auto; margin-top: 0; }')
  && locked320.includes('.ud-card[data-phase="locked"][data-ud-layout="guest"],')
  && locked320.includes('.ud-card[data-phase="locked"][data-ud-layout="player"],')
  && locked320.includes('.ud-card[data-phase="locked"][data-ud-layout="held"] { min-height: 0; }')
  && states.includes('if (gap > 24) throw new Error(`320px locked card leaves'));
ok("360 locked card retains the open card footprint",
  css.includes('.ud-card[data-phase="locked"][data-ud-layout="guest"] { min-height: 329px; }')
  && css.includes('.ud-card[data-phase="locked"][data-ud-layout="held"] { min-height: 381px; }')
  && locked360.includes('.ud-card[data-phase="open"][data-ud-layout="guest"] { min-height: 329px; }')
  && locked360.includes('.ud-card[data-phase="open"][data-ud-layout="held"] { min-height: 381px; }')
  && locked360.includes('.ud-card[data-phase="locked"] { justify-content: space-between; }')
  && states.includes('const lockHeightOnly = process.env.LOCK_HEIGHT_ONLY === "1";')
  && states.includes('index.lockedParity = pairs.map(')
  && states.includes('if (!sameCardFootprint(pair.openHeight, pair.lockedHeight))')
  && sameCardFootprint(329, 329) && sameCardFootprint(381, 381)
  && !sameCardFootprint(322, 329) && !sameCardFootprint(372, 381)
  && !sameCardFootprint(372, 411) && !sameCardFootprint(322, NaN));
ok("360 signed-in no-stake card holds a 381px footprint with clear choices",
  css.includes('.ud-card[data-phase="locked"][data-ud-layout="player"] { min-height: 381px; }')
  && locked360.includes('.ud-card[data-phase="open"][data-ud-layout="player"] { min-height: 381px; }')
  && states.includes('const noBetParityOnly = process.env.NO_BET_PARITY_ONLY === "1";')
  && states.includes('["sw", "en", "zh"].map((locale) => ({ who: "player", locale, width: 360 }))')
  && states.includes('if (Math.abs(open.cardGeometry.height - 381) > 1)')
  && states.includes('open.heldAction.minButtonHeight < 40 || open.heldAction.clearance < 24')
  && states.includes('!sameCardFootprint(open.cardGeometry.height, locked.cardGeometry.height)')
  && sameCardFootprint(381, 381) && !sameCardFootprint(347, 381));
ok("Needle stands down on the board and round but not Up & Down history",
  suppressNeedleOnU43("/updown") && suppressNeedleOnU43("/updown/round_1")
  && !suppressNeedleOnU43("/updown/history") && !suppressNeedleOnU43("/updown/history/x")
  && !suppressNeedleOnU43("/updownx"));
ok("Needle stands down over every actionable classic market card surface",
  ["/", "/markets", "/markets/round_1", "/watchlist", "/results"].every(suppressNeedleOnU43)
  && ["/live", "/marketplace", "/watchlisting", "/resultset", null].every((path) => !suppressNeedleOnU43(path)));
ok("chat stands down over market choices and U43 money controls",
  ["/", "/markets", "/markets/round_1", "/watchlist", "/results", "/updown", "/updown/round_1"].every(suppressChatOnU43)
  && ["/live", "/updown/history"].every((path) => !suppressChatOnU43(path)));
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
// 2026-10-20: the exact-phase state manifest now owns the market-page premise.
// Check its scoped choice readback, not the removed path-string shortcut.
ok("market card capture waits for side words to paint after scrolling", /await cards\.nth\(i\)\.scrollIntoViewIfNeeded\(\);\r?\n          await p\.page\.evaluate/.test(states) && states.includes("requestAnimationFrame(() => requestAnimationFrame(resolve))") && states.includes("if (requirement.marketPage)") && states.includes("if (await choices.count())") && states.includes('choices.count() !== 2') && states.includes("unreadable side choice") && capture.includes("await cards.nth(i).scrollIntoViewIfNeeded()") && capture.includes('sideButtons.count() !== 2'));
// A stopped Gold board has no round and therefore no chart canvas. Only that
// state may bypass the wait; ordinary desktop frames still need painted pixels.
ok("desktop chart frames wait for a painted plot",
  states.includes('const chartReady = requirement.stoppedGold || await p.page.waitForFunction')
  && states.includes('chartReady: requirement.stoppedGold || final.chartReady')
  && states.includes('sample.cards === 0 && sample.emptyState && sample.bettableChoiceCount === 0')
  && states.includes('.ud-chart-slot [role="img"] > div[style*="opacity: 1"] canvas')
  && (states.match(/s\.chartReady === false/g) ?? []).length === 2
  && capture.includes('await p2.waitForFunction(() => !!document.querySelector(\'.ud-chart-slot [role="img"] > div[style*="opacity: 1"] canvas\')'));
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
