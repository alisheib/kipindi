/**
 * test:visual-pass-r6a — R6-A (2026-10-09): the round-6 review's HIGH responsible-gambling findings A2 and A3, and the bell's
 * sibling of A1. (A1 itself — the confirmation letters — has its own suite, `test:rg-email-end`, so it travels with the
 * hotfix; §0 holds that it stays registered.)
 *
 * A2 · during a break or a self-exclusion no surface offers a stake in place: the market page's bet column, the Up & Down
 *      board's card and the round's panel each draw the break's own notice instead (`BetBreakNotice`: the approved sentence
 *      with its end, the neutral box and the lock, a status), and every other door to a stake leads into one of those three.
 * A3 · no empty state a signed-in player can see invites a first bet during a break: Tiketi zangu's Juu/Chini tab, the
 *      performance page, and the sweep's two more (the empty leaderboard, the empty activity page) say the break's sentence
 *      and offer no way to bet — R4-I's TicketsView rule.
 * Bell · a permanent exclusion's notice names no end (its letter's rule, A1).
 *
 * Executed where it can be: the notice, the board card and the round panel are rendered (react-dom/server, the App Router
 * and i18n contexts as `test:updown-match` renders the card), EmptyState with the pages' own bodies, and the bell notifier on
 * the in-memory store. The server pages are read decommented. Every rule has a control or a plant beside it; the on-disk
 * mutation proof is S\r6a\mutation-proof.cjs.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment } from "./lib/decomment.mts";

process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";
const { dict } = await import("../src/lib/i18n-dict.ts");
const { breakSentence, formatBreakEnd } = await import("../src/lib/break-end.ts");
const { fill } = await import("../src/lib/utils.ts");
const { I } = await import("../src/components/ui/glyphs.tsx");
const { Callout } = await import("../src/components/ui/callout.tsx");
const { BetBreakNotice } = await import("../src/components/rg/bet-break-notice.tsx");
const { EmptyState } = await import("../src/components/ui/empty-state.tsx");

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), and the empty JSX braces a comment leaves (`{}`) dropped. */
const read = (p: string) => decomment(raw(p)).replace(/\{\s*\}/g, "");
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const textOf = (markup: string) => decode(markup.replace(/<[^>]+>/g, ""));
const LOCALES = ["sw", "en", "zh"] as const;
type L = (typeof LOCALES)[number];
const T = dict as unknown as Record<L, typeof dict.en>;

const NOW = Date.now();
const UNTIL = new Date(NOW + 26 * 3_600_000 + 7 * 60_000).toISOString(); // a running break, ~a day ahead
const sentenceOf = (l: L, exclusion: boolean, until = UNTIL) =>
  breakSentence(exclusion ? T[l].rg.exclusionActive : T[l].rg.breakActive, until, NOW, T[l].common.monthsShort, l);
const dateOf = (l: L, until = UNTIL) => formatBreakEnd(Date.parse(until), NOW, T[l].common.monthsShort, l);

/* ══ §0 · A1 TRAVELS WITH ITS OWN SUITE ═══════════════════════════════════════════════════════════════════════════════ */
section("0 · A1's proof stays registered beside this one (it is cherry-picked onto main with the hotfix)");
{
  const pkg = JSON.parse(raw("package.json")) as { scripts: Record<string, string> };
  ok("0.1 · test:rg-email-end runs scripts/rg-email-end.test.mts, and test:visual-pass-r6a runs this file",
    pkg.scripts["test:rg-email-end"] === "tsx scripts/rg-email-end.test.mts" && pkg.scripts["test:visual-pass-r6a"] === "tsx scripts/visual-pass-r6a.test.mts");
}

/* ══ §1 · THE NOTICE ══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("1 · BetBreakNotice — the approved sentence with its end, the neutral box, the lock, a status (rendered, 3 locales × 2)");
const LOCK = renderToStaticMarkup(h(I.lock, { s: 17 }));
const noticeDefects = (markup: string, l: L, exclusion: boolean): string[] => {
  const d: string[] = [];
  const s = sentenceOf(l, exclusion), date = dateOf(l);
  if (textOf(markup) !== fill(exclusion ? T[l].rg.exclusionActive : T[l].rg.breakActive, { date })) d.push("words are not the dictionary's sentence");
  if (s.text !== textOf(markup)) d.push("inserted or dropped characters");
  if (!new RegExp(`<span class="whitespace-nowrap">[^<]*${esc(date)}[^<]*</span>`).test(markup)) d.push("the end is not one unbreakable run");
  if (!/role="status"/.test(markup)) d.push("not a status");
  if (!/border-dashed border-border bg-bg-elevated\/40/.test(markup)) d.push("not the neutral box");
  if (!/gap-3 rounded-xl px-4 py-3\.5/.test(markup) || !/text-body-sm leading-snug text-text-muted/.test(markup)) d.push("not the md reading rung");
  if (!markup.includes(LOCK)) d.push("not the lock glyph");
  if (/warning|gilt|gold|amber/.test(markup)) d.push("a warning or gold ink");
  return d;
};
{
  const all: string[] = [];
  for (const l of LOCALES) for (const exclusion of [false, true]) {
    const m = renderToStaticMarkup(h(BetBreakNotice, { body: sentenceOf(l, exclusion), testId: "probe" }));
    all.push(...noticeDefects(m, l, exclusion).map((x) => `${l}/${exclusion ? "exclusion" : "break"}: ${x}`));
    if (!/^<div data-testid="probe" data-bet-break="">/.test(m)) all.push(`${l}: no test hook`);
  }
  ok("1.1 · EXECUTED · every locale, break and exclusion: the dictionary's own sentence (nothing inserted), the end one nowrap run, role=status, the neutral md box, the lock, no warning or gold ink",
    all.length === 0, all.join("; "));
  const warn = renderToStaticMarkup(h(Callout, { tone: "warning", size: "md", glyph: "warning", role: "status" }, sentenceOf("sw", false).text));
  ok("1.1′ CONTROL · a warning box with the bare sentence is reported (box, glyph, ink and run)", noticeDefects(warn, "sw", false).length >= 3, noticeDefects(warn, "sw", false).join("; "));
}

/* ══ §2 · THE MARKET PAGE'S BET COLUMN ════════════════════════════════════════════════════════════════════════════════ */
section("2 · /markets/[id] — a reader on a break gets the break's notice where the bet panel stood (both shells)");
const MARKET = read("src/app/markets/[id]/page.tsx");
const asideOf = (src: string) => { const a = src.indexOf("<aside className=\"flex flex-col gap-3 lg:sticky"); return a < 0 ? "" : src.slice(a, src.indexOf("</aside>", a)); };
/** The break branch: first under `bettingOpen`, the column's heading, the one-sided note, the notice — and no SidePicker. */
const marketGateOk = (src: string) => {
  const aside = asideOf(src);
  const m = /\{bettingOpen \? \(\s*session && breakBody \? \(\s*<>([\s\S]*?)<\/>\s*\) : session \? \(/.exec(aside);
  if (!m) return false;
  const branch = m[1].replace(/\s+/g, " ").trim();
  return branch === '<h2 id={BET_PANEL_HEADING} className="sr-only">{t.market.placeYourStake}</h2> {oneSidedCallout} <BetBreakNotice body={breakBody} testId="market-bet-break" />'
    && (aside.match(/<SidePicker\b/g) ?? []).length === 1 && aside.indexOf("<SidePicker") > aside.indexOf(") : session ? (");
};
const marketReadOk = (src: string) =>
  /const breakEnd = session\s*\? await Promise\.resolve\(\)\.then\(\(\) => isLockedOut\(session\.userId\)\)\s*\.then\(breakStateOf\)\s*\.catch\(\(\) => null\)\s*: null;/.test(src)
  && /const breakBody = breakEnd\s*\? breakSentence\(breakEnd\.exclusion \? t\.rg\.exclusionActive : t\.rg\.breakActive, breakEnd\.until, Date\.now\(\), t\.common\.monthsShort, locale\)\s*: null;/.test(src);
{
  ok("2.1 · the break branch comes first under `bettingOpen`: the column's D40 heading, the one-sided note, BetBreakNotice — and the page's one SidePicker only after it, in the `session` branch",
    marketGateOk(MARKET), asideOf(MARKET).slice(0, 300));
  ok("2.1′ PLANT · the dial drawn inside the break branch is reported",
    !marketGateOk(MARKET.replace('<BetBreakNotice body={breakBody} testId="market-bet-break" />', '<BetBreakNotice body={breakBody} testId="market-bet-break" /><SidePicker marketId={m.id} />')));
  ok("2.1″ PLANT · the branch removed (the panel back for a reader on a break) is reported",
    !marketGateOk(MARKET.replace(/session && breakBody \? \([\s\S]*?\) : session \? \(/, "session ? (")));
  ok("2.2 · the read fails OPEN (a failed read shows the panel; the server refuses) and the sentence is `breakSentence` — the one formatter, the end one run",
    marketReadOk(MARKET));
  ok("2.2′ PLANT · a read that throws past the page (no catch) is reported", !marketReadOk(MARKET.replace(".then(breakStateOf)\n        .catch(() => null)", ".then(breakStateOf)")));
  ok("2.3 · `bettingOpen` stays the market's own truth — a break is the reader's, and the closed panels would misstate the market",
    /const bettingOpen = !isResolved && m\.status === "LIVE" && !closedByTime && !selectionClosed;/.test(MARKET) && !/bettingOpen = [^;]*break/i.test(MARKET));
  ok("2.4 · R4-I's two break lines on the page are untouched (Your positions' sentence, Similar markets' withheld line)",
    /\{myPositions\.length === 0 && \(breakEnd && breakDate \? \(/.test(MARKET) && /\{!breakEnd && <p className="mb-4 text-body-sm text-text-muted">\{t\.market\.similarMarketsBody\}<\/p>\}/.test(MARKET));
}

/* ══ §3 · THE UP & DOWN BOARD'S CARD ══════════════════════════════════════════════════════════════════════════════════ */
section("3 · /updown — a bettable card offers no one-tap stake to a reader on a break (rendered)");
const BOARD = read("src/app/updown/page.tsx");
const CARD = read("src/components/updown/updown-card.tsx");
const breakReadOk = (src: string) =>
  /const breakRead = session\s*\? Promise\.resolve\(\)\.then\(\(\) => isLockedOut\(session\.userId\)\)\.then\(breakStateOf\)\.catch\(\(\) => null\)\s*: Promise\.resolve\(null\);/.test(src)
  && /const breakEnd = await breakRead;\s*const breakBody = breakEnd\s*\? breakSentence\(breakEnd\.exclusion \? t\.rg\.exclusionActive : t\.rg\.breakActive, breakEnd\.until, Date\.now\(\), t\.common\.monthsShort, locale\)\s*: null;/.test(src);
const { UpDownCard } = await import("../src/components/updown/updown-card.tsx");
const { RoundActionPanel } = await import("../src/components/updown/round-action-panel.tsx");
const { I18nProvider } = await import("../src/lib/i18n.tsx");
const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} };
const inApp = (l: L, el: ReturnType<typeof h>) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: router as never }, h(I18nProvider, { initial: l }, el)));
const MIN = 60_000;
const CARD_BASE = {
  roundId: "udr_r6a", assetName: "Bitcoin", assetTicker: "BTC", assetIcon: "crypto", durationMinutes: 10, decimals: 2,
  livePrice: 85018.52, openPrice: 85000, upTarget: 85000.02, downTarget: 84999.98, movePct: null,
  closesAtMs: NOW + 6 * MIN, selectionClosesAtMs: NOW + 4 * MIN, serverNowMs: NOW, volumeTzs: 0, players: 0,
  pricing: { upPool: 0, downPool: 0, rates: {}, show: false }, state: "open", sourceClass: "crypto",
  sourceQuotedAt: new Date(NOW - 26_000).toISOString(),
  isAuthed: true, marketId: "mkt_r6a", minStake: 1000, maxStake: 100000, walletBalance: 50000,
};
const card = (l: L, props: Record<string, unknown>) => inApp(l, h(UpDownCard, { ...CARD_BASE, ...props } as never));
const act = (markup: string) => { const a = markup.indexOf('<div class="ud-act'); return a < 0 ? "" : markup.slice(a, markup.indexOf('<div class="ud-foot', a) > 0 ? markup.indexOf('<div class="ud-foot', a) : undefined); };
const STAKES = /role="radiogroup"|btn-yes|btn-no|btn-gold/;
{
  ok("3.1 · the board reads its reader's lockout beside the board (failing open) and hands every card the sentence",
    breakReadOk(BOARD) && /breakBody=\{breakBody\}/.test(BOARD));
  ok("3.1′ PLANT · a read without its catch is reported", !breakReadOk(BOARD.replace(".then(breakStateOf).catch(() => null)", ".then(breakStateOf)")));
  ok("3.2 · the card's break branch stands first in the bettable arm: `canQuickBet && breakBody` → the notice, then the stake controls",
    /\{bettable \? \(\s*canQuickBet && breakBody \? \(\s*<BetBreakNotice body=\{breakBody\} testId="updown-card-break" \/>\s*\) : canQuickBet \? \(/.test(CARD));
  const bad: string[] = [];
  for (const l of LOCALES) for (const exclusion of [false, true]) {
    const a = act(card(l, { breakBody: sentenceOf(l, exclusion) }));
    if (!a.includes('data-testid="updown-card-break"')) bad.push(`${l}: no notice`);
    if (STAKES.test(a)) bad.push(`${l}: a stake control is still drawn`);
    if (!textOf(a).includes(sentenceOf(l, exclusion).text)) bad.push(`${l}: not the sentence`);
  }
  ok("3.3 · EXECUTED · a signed-in reader's bettable card on a break (3 locales × break/exclusion): the notice, the sentence, and no stake chip, side button or commit",
    bad.length === 0, bad.join("; "));
  const open = act(card("sw", {}));
  ok("3.3′ CONTROL · the same card with no break draws the stake controls and no notice", STAKES.test(open) && !open.includes("updown-card-break"));
  const locked = card("sw", { breakBody: sentenceOf("sw", false), selectionClosesAtMs: NOW - MIN });
  ok("3.4 · EXECUTED · a LOCKED card keeps its locked presentation on a break — the notice stands only where a stake would",
    !locked.includes("updown-card-break") && textOf(locked).includes(T.sw.market.udLockedTitle));
  const guest = act(card("sw", { breakBody: sentenceOf("sw", false), isAuthed: false }));
  ok("3.5 · EXECUTED · the gate is the signed-in stake path (`canQuickBet`): a guest's card is untouched", !guest.includes("updown-card-break") && /btn-yes/.test(guest));
}

/* ══ §4 · THE ROUND'S PANEL ═══════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · /updown/[roundId] — the round's stake panel gives way to the notice, in the same #stake region (rendered)");
const ROUND = read("src/app/updown/[roundId]/page.tsx");
const PANEL = read("src/components/updown/round-action-panel.tsx");
const panel = (l: L, stake: Record<string, unknown>, at: { selectionClosedAt?: string } = {}) => inApp(l, h(RoundActionPanel, {
  state: "open", selectionClosedAt: at.selectionClosedAt ?? new Date(NOW + 4 * MIN).toISOString(), closesAt: new Date(NOW + 6 * MIN).toISOString(),
  serverNowMs: NOW, myExactPayout: null, ariaStake: T[l].market.udStake,
  stakePanel: { marketId: "mkt_r6a", isAuthed: true, minStake: 1000, maxStake: 100000, myUpStake: 0, myDownStake: 0,
    pricing: { upPool: 0, downPool: 0, rates: {}, show: false }, assetName: "Bitcoin", signInHref: "/auth/login?next=%2Fupdown%2Fudr_r6a",
    lockedSide: null, walletBalance: 50000, ...stake },
} as never));
{
  ok("4.1 · the round page reads its reader's lockout beside the round (failing open) and puts the sentence in the stake panel's props",
    breakReadOk(ROUND) && /receipt: round\.receipt,\s*breakBody,\s*\}\}/.test(ROUND));
  ok("4.2 · the panel's bettable arm: `breakBody` taken out of the stake props, the notice for a signed-in reader on a break, RoundStakePanel only otherwise",
    /if \(bettable\) \{\s*const \{ breakBody, \.\.\.stake \} = stakePanel;\s*if \(stake\.isAuthed && breakBody\) \{/.test(PANEL) && /<RoundStakePanel\s*\{\.\.\.stake\}/.test(PANEL) && !/\{\.\.\.stakePanel\}/.test(PANEL));
  const bad: string[] = [];
  for (const l of LOCALES) for (const exclusion of [false, true]) {
    const m = panel(l, { breakBody: sentenceOf(l, exclusion) });
    if (!new RegExp(`^<section id="stake" tabindex="-1" aria-label="${esc(T[l].market.udStake)}" class="scroll-mt-\\[96px\\]"><div data-testid="updown-round-break"`).test(m)) bad.push(`${l}: not the notice in #stake`);
    if (/updown-stake-panel|shadow-card/.test(m) || STAKES.test(m)) bad.push(`${l}: the stake card or a control is still drawn`);
    if (!textOf(m).includes(sentenceOf(l, exclusion).text)) bad.push(`${l}: not the sentence`);
  }
  ok("4.3 · EXECUTED · signed in, on a break (3 locales × break/exclusion): #stake holds the notice alone — no stake card, no chip, no Confirm",
    bad.length === 0, bad.join("; "));
  const live = panel("sw", {});
  ok("4.3′ CONTROL · with no break the same panel draws the stake card and its controls", /data-testid="updown-stake-panel"/.test(live) && /shadow-card/.test(live) && !live.includes("updown-round-break"));
  const guest = panel("sw", { isAuthed: false, breakBody: sentenceOf("sw", false) });
  ok("4.4 · EXECUTED · a guest keeps the sign-in route (the gate is the signed-in reader)", !guest.includes("updown-round-break") && textOf(guest).includes(T.sw.market.udSignInToBet));
  const locked = panel("sw", { breakBody: sentenceOf("sw", false) }, { selectionClosedAt: new Date(NOW - MIN).toISOString() });
  ok("4.5 · EXECUTED · a locked round keeps its locked panel on a break", !locked.includes("updown-round-break") && textOf(locked).includes(T.sw.market.udLockedTitle));
}

/* ══ §5 · EVERY PLACE A STAKE CAN BE STARTED ══════════════════════════════════════════════════════════════════════════ */
section("5 · the census — every in-place stake control is gated, every other door leads into a gated page");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f).replace(/\\/g, "/");
  return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mts)$/.test(p) ? [p] : [];
});
const SRC = walk("src").filter((p) => !p.startsWith("src/app/admin/") && !p.startsWith("src/components/admin/") && !p.startsWith("src/app/api/"));
const SOURCES = new Map(SRC.map((p) => [p, read(p)]));
/** Where a stake is PLACED IN PLACE, and what gates it. A new site fails until it is classified here. */
const IN_PLACE: Record<string, string> = {
  "src/app/markets/[id]/page.tsx": "draws <SidePicker> only after its break branch (§2)",
  "src/components/markets/side-picker.tsx": "the dial's host — drawn only by the market page",
  "src/components/markets/conviction-dial.tsx": "the dial, which commits through buyPositionAction — drawn only by SidePicker",
  "src/components/updown/updown-card.tsx": "its bettable arm draws the notice first (§3)",
  "src/components/updown/round-stake-panel.tsx": "drawn only by RoundActionPanel's non-break arm (§4)",
  "src/components/updown/updown-stake-controls.tsx": "the shared control itself — drawn by the card and the stake panel only",
  "src/components/updown/use-quick-bet.ts": "the shared commit hook itself",
};
const STAKE_SITE = /<SidePicker\b|<ConvictionDial\b|<UpDownStakeControls\b|<RoundStakePanel\b|\buseUpDownQuickBet\(|\bbuyPositionAction\b/;
{
  const sites = [...SOURCES].filter(([p, s]) => STAKE_SITE.test(s) && p !== "src/app/markets/actions.ts").map(([p]) => p);
  const unclassified = sites.filter((p) => !(p in IN_PLACE) && p !== "src/components/updown/round-action-panel.tsx");
  ok(`5.1 · every in-place stake site is classified (${sites.length}: ${sites.map((p) => p.split("/").pop()).join(", ")})`, unclassified.length === 0, unclassified.join(", "));
  const users = (re: RegExp) => [...SOURCES].filter(([, s]) => re.test(s)).map(([p]) => p).sort().join(",");
  ok("5.2 · each host is drawn where §2–§4 gate it: SidePicker by the market page, the board card by /updown, RoundActionPanel by the round page, RoundStakePanel by RoundActionPanel, the dial by SidePicker",
    users(/<SidePicker\b/) === "src/app/markets/[id]/page.tsx" && users(/<UpDownCard\b/) === "src/app/updown/page.tsx"
    && users(/<RoundActionPanel\b/) === "src/app/updown/[roundId]/page.tsx" && users(/<RoundStakePanel\b/) === "src/components/updown/round-action-panel.tsx"
    && users(/<ConvictionDial\b/) === "src/components/markets/side-picker.tsx",
    [users(/<SidePicker\b/), users(/<UpDownCard\b/), users(/<RoundActionPanel\b/), users(/<RoundStakePanel\b/), users(/<ConvictionDial\b/)].join(" | "));
  // Doors: a link or a push carrying a side (`?side=`) — every one must open the market page or a round page.
  const doors: string[] = [];
  for (const [p, s] of SOURCES) {
    for (const line of s.split("\n")) {
      // Template literals first; a quoted string only where the line has no template carrying the side.
      const tpl = [...line.matchAll(/`[^`]*\?side=[^`]*`/g)].map((m) => m[0]);
      const quoted = tpl.length ? [] : [...line.matchAll(/"[^"`]*\?side=[^"`]*"/g)].map((m) => m[0]);
      for (const d of [...tpl, ...quoted]) doors.push(`${p} :: ${d} :: ${line.trim()}`);
    }
  }
  /** A side-carrying door opens the market page or a round page — directly, through the board's own route, or as the
   *  sign-in `next` back to the very page it stands on (the market page's guest panel, the round page's `signInHref`). */
  const gated = (d: string) => /:: `(\/markets\/\$\{|\/updown\/\$\{|\$\{roundHref\}\?side=)/.test(d)
    || /:: `\?side=\$\{(side|lockedSide)\}` :: .*(betNext = "\/markets\/" \+ m\.id|\/updown\/\$\{(roundId|round\.id)\}\$\{lockedSide \?)/.test(d);
  const elsewhere = doors.filter((d) => !gated(d));
  ok(`5.3 · every door that carries a side (${doors.length}) opens /markets/<id> or /updown/<round> — the gated pages`, elsewhere.length === 0 && doors.length >= 5,
    elsewhere.join(" ; "));
  ok("5.3′ CONTROL · the door census sees the home rows, the band's picks and the card's push", /landing-hero\.tsx/.test(doors.join()) && /updown-band\.tsx/.test(doors.join()) && /market-card\.tsx/.test(doors.join()));
}

/* ══ §6 · THE EMPTY STATES ════════════════════════════════════════════════════════════════════════════════════════════ */
section("6 · no empty state invites a first bet during a break (A3 and the sweep), rendered and read");
const HISTORY = read("src/app/updown/history/page.tsx");
const PERF = read("src/app/positions/performance/page.tsx");
const LEADER = read("src/app/leaderboard/page.tsx");
const ACTIVITY = read("src/app/profile/activity/page.tsx");
const bodyOf = (tpl: string) => `breakSentence\\(breakEnd\\.exclusion \\? t\\.rg\\.exclusionActive : t\\.rg\\.breakActive, breakEnd\\.until, (?:nowMs|Date\\.now\\(\\)), t\\.common\\.monthsShort, locale\\)${tpl}`;
const historyOk = (src: string) =>
  /const breakEnd = cause === "no-rows"\s*\? await Promise\.resolve\(\)\.then\(\(\) => isLockedOut\(session\.userId\)\)\.then\(breakStateOf\)\.catch\(\(\) => null\)\s*: null;/.test(src)
  && new RegExp(bodyOf("")).test(src)
  && /body=\{cause === "no-rows" \? \(breakBody \?\? t\.market\.udNoHistoryBody\) : t\.market\.udHistoryBody\}/.test(src)
  && /cause === "no-rows" \? \(\s*breakBody \? null : <Link href="\/updown" className="btn btn-primary btn-md">\{t\.market\.udTitle\}<\/Link>\s*\)/.test(src);
const perfOk = (src: string) =>
  /const breakEnd = totalBets === 0\s*\? await Promise\.resolve\(\)\.then\(\(\) => isLockedOut\(session\.userId\)\)\.then\(breakStateOf\)\.catch\(\(\) => null\)\s*: null;/.test(src)
  && new RegExp(bodyOf("")).test(src)
  && /body=\{breakBody \?\? t\.performance\.noPerformanceBody\}\s*action=\{breakBody \? null : <Link href=\{"\/markets" as never\} className="btn btn-primary btn-sm">\{t\.positions\.browseMarkets\}<\/Link>\}/.test(src);
const leaderOk = (src: string) =>
  /const breakEnd = rows\.length === 0\s*\? await currentSession\(\)\s*\.then\(\(s\) => \(s \? isLockedOut\(s\.userId\)\.then\(breakStateOf\) : null\)\)\s*\.catch\(\(\) => null\)\s*: null;/.test(src)
  && new RegExp(bodyOf("")).test(src)
  && /body=\{breakBody \?\? t\.leaderboard\.emptyBody\}\s*action=\{breakBody \? null : <Link href=\{"\/markets" as never\} className="btn btn-primary btn-sm">\{t\.positions\.browseMarkets\}<\/Link>\}/.test(src);
const activityOk = (src: string) =>
  /const breakEnd = summary\.empty \? breakStateFromTimers\(rg\.selfExclusionUntil, rg\.coolingOffUntil, Date\.now\(\)\) : null;/.test(src)
  && new RegExp(bodyOf("")).test(src)
  && /body=\{breakBody \?\? t\.activity\.emptyBody\}\s*action=\{breakBody \? null : <Link href=\{"\/markets" as never\} className="btn btn-primary btn-sm">\{t\.activity\.browseMarkets\}<\/Link>\}/.test(src);
{
  ok("6.1 · Tiketi zangu's Juu/Chini tab (/updown/history): on a break the no-rows state says the break and offers no 'Juu na Chini' button (read only for that state, failing open)", historyOk(HISTORY));
  ok("6.1′ PLANT · the board door kept during a break is reported", !historyOk(HISTORY.replace("breakBody ? null : <Link href=\"/updown\"", "<Link href=\"/updown\"")));
  ok("6.2 · /positions/performance: on a break the empty page says the break and offers no 'Browse markets'", perfOk(PERF));
  ok("6.2′ PLANT · the invitation kept as the body during a break is reported", !perfOk(PERF.replace("body={breakBody ?? t.performance.noPerformanceBody}", "body={t.performance.noPerformanceBody}")));
  ok("6.3 · the sweep · the empty leaderboard ('Place a prediction to get on the board.'): a signed-in reader on a break reads the break, no button; a guest's board unchanged", leaderOk(LEADER));
  ok("6.3′ PLANT · a session read that can throw past the page is reported", !leaderOk(LEADER.replace(".then(breakStateOf) : null))\n        .catch(() => null)", ".then(breakStateOf) : null))")));
  ok("6.4 · the sweep · the empty activity page (its own note: 'invited to go and bet'): the break from the usage row's own timers, no button", activityOk(ACTIVITY));
  ok("6.4′ PLANT · the Browse door kept during a break is reported", !activityOk(ACTIVITY.replace("action={breakBody ? null : <Link", "action={<Link")));
  // Rendered: the body the pages hand EmptyState, and its control.
  const bad: string[] = [];
  for (const l of LOCALES) for (const exclusion of [false, true]) {
    const s = sentenceOf(l, exclusion), date = dateOf(l);
    const m = renderToStaticMarkup(h(EmptyState, { title: T[l].market.udNoHistory, body: s, action: null }));
    if (!textOf(m).includes(s.text)) bad.push(`${l}: not the sentence`);
    if (!new RegExp(`<span class="whitespace-nowrap">[^<]*${esc(date)}[^<]*</span>`).test(m)) bad.push(`${l}: the end is not one run`);
    if (/<a |<button/.test(m)) bad.push(`${l}: a door is drawn`);
  }
  ok("6.5 · EXECUTED · the empty state the pages draw on a break (3 locales × 2): the title, the sentence with its end one run, no link and no button", bad.length === 0, bad.join("; "));
  const control = renderToStaticMarkup(h(EmptyState, { title: T.sw.market.udNoHistory, body: T.sw.market.udNoHistoryBody, action: h("a", { href: "/updown", className: "btn btn-primary btn-md" }, T.sw.market.udTitle) }));
  ok("6.5′ CONTROL · off a break the same state draws its invitation and its door", textOf(control).includes(T.sw.market.udNoHistoryBody) && /<a href="\/updown"/.test(control));
  // Census: every dictionary invitation to a FIRST BET, wherever src draws it, sits behind its page's break gate.
  const INVITES: Record<string, { gate: RegExp; where: string }> = {
    "t.home.picksNone": { gate: /onBreak \? null :/, where: "landing-hero.tsx (R4-I)" },
    "t.market.noBetYet": { gate: /breakEnd && breakDate \?/, where: "markets/[id] (R4-I)" },
    "t.positions.noOpenBody": { gate: /cause === "no-rows" && breakBody \? breakBody/, where: "positions (R4-I)" },
    "t.journey.ticketsEmptyOpenBody": { gate: /breakNow && breakBody \? breakBody/, where: "tickets-view.tsx (R4-I)" },
    "t.market.udNoHistoryBody": { gate: /breakBody \?\? t\.market\.udNoHistoryBody/, where: "updown/history (R6-A)" },
    "t.performance.noPerformanceBody": { gate: /breakBody \?\? t\.performance\.noPerformanceBody/, where: "performance (R6-A)" },
    "t.leaderboard.emptyBody": { gate: /breakBody \?\? t\.leaderboard\.emptyBody/, where: "leaderboard (R6-A)" },
    "t.activity.emptyBody": { gate: /breakBody \?\? t\.activity\.emptyBody/, where: "activity (R6-A)" },
  };
  const loose: string[] = [];
  let seen = 0;
  for (const [key, { gate }] of Object.entries(INVITES)) {
    for (const [p, s] of SOURCES) {
      const lines = s.split("\n");
      lines.forEach((line, i) => {
        if (!line.includes(key)) return;
        seen++;
        // The gate stands in the same expression, at most eight lines up (R4-I's market line is a two-paragraph ternary).
        if (!gate.test(lines.slice(Math.max(0, i - 8), i + 1).join("\n"))) loose.push(`${p}:${i + 1} ${key}`);
      });
    }
  }
  ok(`6.6 · the census · every use of the eight first-bet invitations (${seen}) sits behind its page's break gate`, loose.length === 0 && seen >= 8, loose.join("; "));
  const enInvites = Object.keys(INVITES).map((k) => k.split(".").slice(1)).map(([sec, key]) => (dict.en as Record<string, Record<string, string>>)[sec][key]);
  ok("6.6′ CONTROL · the eight are the dictionary's invitations to bet (each says pick / place / back / choose, or is the board's door)",
    enInvites.every((s) => /pick|place|back a round|choose|dial|deposit or place a bet/i.test(s)), enInvites.join(" | "));
}

/* ══ §7 · THE BELL (A1's sibling, this branch only) ═══════════════════════════════════════════════════════════════════ */
section("7 · the bell — a permanent exclusion's notice names no end, as its letter does (executed on the in-memory store)");
{
  const { db } = await import("../src/lib/server/store.ts");
  const N = await import("../src/lib/server/notification-service.ts");
  const nowIso = new Date().toISOString();
  const mk = async (id: string) => {
    await db.user.create({
      id, phoneE164: `+2557899${String(Math.floor(Math.random() * 1e5)).padStart(5, "0")}`, email: `${id}@test.tz`, passwordHash: null, passwordSalt: null,
      failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
      acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
      createdAt: nowIso, updatedAt: nowIso, lastLoginAt: null, closedAt: null,
    } as never);
  };
  await mk("r6a_perm"); await mk("r6a_6m");
  const PERM = new Date(Date.now() + 100 * 365 * 86_400_000).toISOString();
  const SIX = new Date(Date.now() + 182 * 86_400_000).toISOString();
  const p = await N.notifySelfExclusion("r6a_perm", { until: PERM });
  const s = await N.notifySelfExclusion("r6a_6m", { until: SIX });
  ok("7.1 · EXECUTED · permanent: \"Your account is closed to betting and deposits.\" / \"…kuweka dau na amana.\" / \"…投注与充值。\" — no end, every other word the notice's own",
    !!p && p.bodyEn === "Your account is closed to betting and deposits." && p.bodySw === "Akaunti yako imefungwa kuweka dau na amana."
    && p.bodyZh === "您的账户已停止投注与充值。", JSON.stringify(p && [p.bodyEn, p.bodySw, p.bodyZh]));
  const want = (l: L) => formatBreakEnd(Date.parse(SIX), Date.now(), T[l].common.monthsShort, l);
  ok("7.1′ CONTROL · a six-month exclusion keeps its dated sentence in every language",
    !!s && s.bodyEn === `Your account is closed to betting and deposits until ${want("en")}.` && s.bodySw === `Akaunti yako imefungwa kuweka dau na amana hadi ${want("sw")}.`
    && s.bodyZh === `您的账户已停止投注与充值，直至 ${want("zh")}。`, JSON.stringify(s && [s.bodyEn, s.bodySw, s.bodyZh]));
  const NS = read("src/lib/server/notification-service.ts");
  ok("7.2 · permanence is the one definition, read lazily, and a failed read keeps the dated sentence (the notice is never lost)",
    /const permanent = await import\("\.\/responsible-gambling"\)\s*\.then\(\(m\) => \{ const s = m\.selfExclusionStandingOf\(opts\.until\); return s\.state === "serving" && s\.permanent; \}\)\s*\.catch\(\(\) => false\);\s*const end = permanent \? null : await breakEndIn\(opts\.until\);/.test(NS));
}

console.log(`\nvisual-pass-r6a: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
