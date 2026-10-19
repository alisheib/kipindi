/**
 * JUU/CHINI IN THE JOURNEY'S LANGUAGE — the Vodacom plan S12, WP8–WP11 (`S12-PLAN.md`). What a journey reader's Up & Down
 * controls draw, proved in process, in three languages, against the engines they claim to read:
 *
 *   §1 THE MONEY PATH IS THE CLASSIC ONE. The arm (`jud-arm.tsx`) never imports a server action, never builds its own
 *      bet hook, and calls `bet.place(` only behind `ready` — `judCommitReady`: the frame enables the commit AND the hook
 *      would place exactly the stake on screen. Only the loader imports the arm; only the card, the stake panel and the
 *      round page import the loader.
 *   §2 THE FRAME IS THE SHEET'S. `judFrame` is `sheetFrame` on the round dressed as a seed with NO rates (so the frame's
 *      own estimate is `hidden` and no multiple can exist); every branch S8 draws applies, in its order; the chips are
 *      `quickStakes(min, max)`; the spendable figure is balance + bonus (F1's journey half); a burst's spend is taken off
 *      a stale read (`judViewerAfterSpend`).
 *   §3 THE ADDRESSES. The deposit door is the sheet's query shape with a round's bet; the next round's link carries the
 *      side and the stake the player carried; `stakeFromUrl` honours a stake only with this tab's own, owner-scoped
 *      marker; the tab marker is written only once the privacy notice names a round (`JUD_TAB_MARKER`).
 *   §4 THE ROUND-CLOSED NOTICE. The paid line only with a confirmed deposit (never the address), the next round's start
 *      only from a future server instant, the button only once the next round exists.
 *   §5 RENDERED, en/sw/zh. The card control, the two-way control and the `?side=` panel: Up and Down say the side's word
 *      and nothing else (the owner's ruling of 2026-10-14), no "×" anywhere, the chips in full figures, the commit names
 *      the stake, the projection is `projectedReturn` and travels with its qualifier, the empty-side sentence iff a side
 *      is empty; not enough money draws the sheet's own low rows; a bonus that covers the stake draws none.
 *   §6 FIVE CLASSIC FILES KEEP THEIR LINES. Each file this section tracks holds its base text as an in-order subsequence:
 *      lines are only added beside it, except the named journey-only swaps and the source footer's DotSeq replacement.
 *      `test:updown-source-line` proves that replacement keeps the price's source and full quoted time together.
 *   §7 THE FLAG. The pages read the viewer's facts only for a journey request with a session, and hand the arm its props
 *      by a spread that a classic card's props never see.
 *   §8 THE WORDS. S12's journey keys exist in en/sw/zh with the reviewed Swahili; the Chinese How-to says winners share
 *      the pool by their bets' share, not "equally".
 *
 *   npm run test:journey-updown          (its RED proof: npm run red:journey-updown)
 */
import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dict } from "../src/lib/i18n-dict.ts";
import * as A from "../src/lib/journey/updown-arm.ts";
import { parseBetParam, stakeFromUrl, writeMarker } from "../src/lib/journey/pending-bet.ts";
import { quickStakes } from "../src/components/updown/stake-math.ts";
import { projectedReturn, type UpDownPricing, type UpDownRates } from "../src/lib/updown-pricing.ts";
import { formatTzs, formatNumber } from "../src/lib/utils.ts";
import type { SheetFacts } from "../src/lib/journey/sheet-state.ts";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`FAIL ${n}${d ? ` — ${d}` : ""}`); } // at column 0: red-in-place reads "FAIL <label>"
  return c;
};
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const j = (v: unknown) => JSON.stringify(v);

const ARM = "src/components/journey/updown/jud-arm.tsx";
const LAZY = "src/components/journey/updown/jud-lazy.tsx";
const PURE = "src/lib/journey/updown-arm.ts";
const SERVER = "src/lib/server/journey-updown.ts";
const CARD = "src/components/updown/updown-card.tsx";
const PANEL = "src/components/updown/round-stake-panel.tsx";
const ACTION = "src/components/updown/round-action-panel.tsx";
const BOARD = "src/app/updown/page.tsx";
const ROUND = "src/app/updown/[roundId]/page.tsx";
const SHEET = "src/components/journey/bet-sheet/bet-sheet.tsx";
/** The tree S12 built on (main at c14cb403e, Ali's 2026-10-14 ruling live): §6 holds the classic files to it, so a later lane that
 *  edits one of them re-pins this in the open, as S6–S8 did theirs. */
const BASE = process.env.KP_JUD_BASE ?? "c14cb403e0e7245cd5d508a05bd1a0d0a1bce61a";

const LIVE: UpDownRates = { feeModel: "loser-share", commissionRate: 0.1, feeCeilingRate: 1 / 3, platformFeeRate: 0.03, operatorFeeRate: 0.1 };
const P = (up: number, down: number, show = true): UpDownPricing => ({ upPool: up, downPool: down, rates: LIVE, show });
const NOW = Date.UTC(2026, 9, 14, 9, 0);
const MIN = 60_000;
const facts = (o: Partial<SheetFacts> = {}): SheetFacts => ({
  maintenance: false, lockout: null, session: null, account: { status: "ACTIVE", coolingOffUntil: null },
  wallet: { status: "ACTIVE", balance: 50_000, bonusBalance: 0 }, loss: { dailyLossLimit: null, lossToday: 0 }, pendingDeposit: null,
  deposit: {
    limits: { daily: null, weekly: null, monthly: null }, usage: { day: 0, week: 0, month: 0 },
    sof: { accepted: true, singleTxn: 10_000_000, rolling30d: 20_000_000 }, railsOpen: true, railNames: ["M-Pesa", "Airtel Money"],
  },
  ...o,
});
const viewer = (f: SheetFacts | null, id = "usr_jud01"): A.JudViewer => ({
  facts: f, spendable: f?.wallet && f.wallet.balance !== null ? Math.max(0, f.wallet.balance) + Math.max(0, f.wallet.bonusBalance ?? 0) : null, viewerId: id,
});
const round = (o: Partial<A.JudRound> = {}): A.JudRound => ({
  marketId: "mkt_jud01", roundId: "udr_jud01", pricing: P(6_000, 2_000), min: 500, max: 1_000_000,
  selectionClosesAtMs: NOW + 30 * MIN, open: true, serverNowMs: NOW, myUpStake: 0, myDownStake: 0, ...o,
});
const frame = (stakeText: string, f: SheetFacts | null = facts(), r = round(), side: A.JudSide = "UP", nowMs = NOW) =>
  A.judFrame({ round: r, side, stakeText, viewer: f === null ? viewer(null) : viewer(f), nowMs });

// ── §1 · the money path ───────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · the money path is the classic hook's, and the arm places only the figure on screen");
{
  const arm = strip(read(ARM));
  const imports = [...arm.matchAll(/^\s*import\s+(?:type\s+)?[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
  ok("1.1 the arm imports no server action, no server module and builds no bet hook of its own",
    !imports.some((m) => /_actions|\/actions$|@\/lib\/server|next\/headers/.test(m)) && !/buyPositionAction|useUpDownQuickBet\(/.test(arm),
    j(imports.filter((m) => /actions|server/.test(m))));
  const places = [...arm.matchAll(/bet\.place\(/g)].length;
  const guarded = [...arm.matchAll(/\{\s*if \(ready\) bet\.place\((?:side|lockedSide)\);\s*\}/g)].length;
  ok("1.2 every `bet.place(` in the arm sits behind `if (ready)` — and there are exactly two (the two-way buttons, the commit)",
    places === 2 && guarded === 2, `${places} calls, ${guarded} guarded`);
  ok("1.3 `ready` is `judCommitReady` on both controls (the confirm adds `!bet.pending`: one commit at a time)",
    /const ready = judCommitReady\(frame, bet\);/.test(arm) && /const ready = judCommitReady\(frame, bet\) && !bet\.pending;/.test(arm));
  const fake = (o: Partial<{ stakeReady: boolean; stake: number; locallyLocked: boolean }>) => ({ stakeReady: true, stake: 500, locallyLocked: false, ...o });
  const f500 = frame("500");
  ok("1.4 judCommitReady: enabled frame + the hook's stake equal to the frame's → ready; a different hook stake, an unready stake or the lock → not",
    A.judCommitReady(f500, fake({})) && !A.judCommitReady(f500, fake({ stake: 1_000 })) && !A.judCommitReady(f500, fake({ stakeReady: false }))
      && !A.judCommitReady(f500, fake({ locallyLocked: true })) && !A.judCommitReady(frame("499"), fake({ stake: 499 })));
  const lazy = strip(read(LAZY));
  ok("1.5 the loader declares the three parts through next/dynamic, each ending in the lost-chunk guard, with no option object",
    (lazy.match(/dynamic\(\(\) => import\("@\/components\/journey\/updown\/jud-arm"\)\.then\(\(m\) => m\.Jud(TwoWay|Confirm|RoundClosed)\)\.catch\(nothingIfLost\)\)/g) ?? []).length === 3
      && !/ssr:|loading:/.test(lazy));
  // Every file under src/ that imports the module (a walk, so a file not yet committed is read too).
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.(tsx?|mts)$/.test(e.name) ? [`${dir}/${e.name}`] : []);
  const SRC = walk("src");
  const importers = (mod: string) => SRC.filter((f) => read(f).includes(`"@/components/journey/updown/${mod}"`)).sort();
  ok("1.6 only the loader imports the arm; only the card, the stake panel and the round page import the loader",
    j(importers("jud-arm")) === j([LAZY]) && j(importers("jud-lazy")) === j([ROUND, CARD, PANEL].sort()),
    j({ arm: importers("jud-arm"), lazy: importers("jud-lazy") }));
  ok("1.7 the arm's parts are named for React's tools and for qa:first-load (JudArm.*)",
    ["TwoWay", "Confirm", "RoundClosed"].every((n) => lazy.includes(`LazyJud${n}.displayName = "JudArm.${n}";`)));
}

// ── §2 · the frame ────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · the frame is the sheet's, on a seed with no rates");
{
  const seed = A.judSeed(round());
  ok("2.1 the seed carries the round's pools and bounds and NO rates (the frame's estimate can never price a multiple)",
    seed.rates === null && seed.feePct === null && seed.yesPool === 6_000 && seed.noPool === 2_000 && seed.min === 500 && seed.id === "mkt_jud01"
      && seed.closesAt === new Date(NOW + 30 * MIN).toISOString());
  const fr = frame("500");
  ok("2.2 an ordinary stake: the edit frame, the commit enabled, the estimate hidden (no multiple text anywhere in the frame)",
    fr.frame === "edit" && fr.cta?.enabled === true && fr.estimate?.state === "hidden" && fr.estimate?.multText === null && !/×/.test(j(fr)), j({ frame: fr.frame, est: fr.estimate }));
  ok("2.3 the chips are quickStakes(min, max) — 500 · 1,000 · 2,500 · 5,000 at the default bounds",
    j(fr.chips) === j(quickStakes(500, 1_000_000)) && j(fr.chips) === j([500, 1_000, 2_500, 5_000]), j(fr.chips));
  const bounds = ["499", "1000001", "12.5", ""].map((s) => frame(s).breaks);
  ok("2.4 the stake's bounds: below, above, not whole, and empty (no line)", j(bounds) === j(["below", "above", "notWhole", "empty"]), j(bounds));
  const low = frame("5000", facts({ wallet: { status: "ACTIVE", balance: 2_000, bonusBalance: 0 } }));
  ok("2.5 not enough money: the low frame from shortfallPlan — 2,000 held, 3,000 short, the deposit offer and \"use instead\" (2,000)",
    low.frame === "low" && low.low?.spendable === 2_000 && low.low?.shortfall === 3_000 && low.low?.deposit?.amount === 3_000
      && low.low?.betInstead?.stake === 2_000 && low.cta?.enabled === false, j(low.low));
  const bonus = frame("5000", facts({ wallet: { status: "ACTIVE", balance: 2_000, bonusBalance: 3_000 } }));
  ok("2.6 ⭐ F1's journey half: a bonus that covers the stake is spendable — no low frame, the commit enabled",
    bonus.frame === "edit" && bonus.cta?.enabled === true, j({ frame: bonus.frame }));
  const branches: Array<[string, SheetFacts, string]> = [
    ["maintenance", facts({ maintenance: true }), "edit/line"],
    ["self-exclusion", facts({ lockout: { kind: "self_exclusion", until: new Date(NOW + 86_400_000).toISOString() } }), "blocked"],
    ["cooling-off", facts({ lockout: { kind: "cooling_off", until: new Date(NOW + 86_400_000).toISOString() } }), "blocked"],
    // S8-PLAN A25 item 1 (round V2): the session limit is the sheet's block, here as on the sheet.
    ["session limit", facts({ session: { exceeded: true, limitMin: 30, playedMin: 31 } }), "blocked"],
    ["account blocked", facts({ account: { status: "SUSPENDED", coolingOffUntil: null } }), "blocked"],
    ["wallet held", facts({ wallet: { status: "FROZEN", balance: 50_000, bonusBalance: 0 } }), "blocked"],
    ["loss room", facts({ loss: { dailyLossLimit: 3_000, lossToday: 0 } }), "lossRoom"],
    ["loss spent", facts({ loss: { dailyLossLimit: 3_000, lossToday: 3_000 } }), "blocked"],
    ["pending fresh", facts({ wallet: { status: "ACTIVE", balance: 0, bonusBalance: 0 }, pendingDeposit: { amount: 5_000, txnId: "txn_p1", createdAt: new Date(NOW - MIN).toISOString() } }), "pending"],
    ["rails paused", facts({ wallet: { status: "ACTIVE", balance: 0, bonusBalance: 0 }, deposit: { ...facts().deposit, railsOpen: false, railNames: [] } }), "low"],
    ["deposit limit", facts({ wallet: { status: "ACTIVE", balance: 0, bonusBalance: 0 }, deposit: { ...facts().deposit, limits: { daily: 1_000, weekly: null, monthly: null } } }), "low"],
    ["source of funds", facts({ wallet: { status: "ACTIVE", balance: 0, bonusBalance: 0 }, deposit: { ...facts().deposit, sof: { accepted: false, singleTxn: 1_000, rolling30d: 20_000_000 } } }), "low"],
  ];
  const got = branches.map(([name, f, want]) => {
    const fr2 = frame("5000", f);
    const kind = fr2.frame === "edit" && fr2.lines.length > 0 ? "edit/line" : fr2.frame;
    return { name, want, kind, enabled: fr2.cta?.enabled === true };
  });
  ok("2.7 every branch the sheet draws applies, in its order — maintenance as a line, a break, the session limit (A25), the account and a held wallet blocked, the loss room, a pending deposit, and the three deposit refusals — and none enables the commit",
    got.every((g) => g.kind === g.want && !g.enabled), j(got.filter((g) => g.kind !== g.want || g.enabled)));
  const refusals = ["rails paused", "deposit limit", "source of funds"].map((n) => frame("5000", branches.find((b) => b[0] === n)![1]).low?.depositRefusal);
  ok("2.8 …the deposit refusals are named: rails_paused, deposit_limit, sof_required", j(refusals) === j(["rails_paused", "deposit_limit", "sof_required"]), j(refusals));
  const lockedNow = frame("500", facts(), round(), "UP", NOW + 30 * MIN);
  const closedSeed = frame("500", facts(), round({ open: false }));
  ok("2.9 the round closes at its lock on the server's clock, and a round rendered shut is shut: the commit never enables",
    lockedNow.frame === "closed" && closedSeed.frame === "closed" && lockedNow.cta === null && closedSeed.cta === null, j([lockedNow.frame, closedSeed.frame]));
  const unknown = frame("5000", null);
  ok("2.10 a failed facts read is unknown, never zero: the commit stays enabled and the server decides", unknown.frame === "edit" && unknown.cta?.enabled === true, unknown.frame);
  const v = viewer(facts({ wallet: { status: "ACTIVE", balance: 2_000, bonusBalance: 3_000 } }));
  const after = A.judViewerAfterSpend(v, 4_000);
  ok("2.11 a burst's spend comes off a stale read: the balance first, then the bonus, floored at zero (2,000 + 3,000 less 4,000 → 0 + 1,000)",
    after?.facts?.wallet?.balance === 0 && after?.facts?.wallet?.bonusBalance === 1_000 && after?.spendable === 1_000
      && A.judViewerAfterSpend(v, 0) === v && A.judViewerAfterSpend(null, 500) === null
      && A.judViewerAfterSpend(viewer(null), 500)?.spendable === null, j(after?.facts?.wallet));
  ok("2.12 the spend since the read is the hook's stakes beyond the server's own (taps in flight and unreconciled)",
    A.judSpentSince({ myUpStake: 1_000, myDownStake: 0 }, { up: 2_000, down: 500 }) === 1_500 && A.judSpentSince({ myUpStake: 1_000, myDownStake: 0 }, { up: 1_000, down: 0 }) === 0);
  ok("2.13 the projection is projectedReturn (and none for a stake that cannot be read, or with the display switch off)",
    A.judProjection(P(6_000, 2_000), "UP", 1_000) === projectedReturn(P(6_000, 2_000), "UP", 1_000) && A.judProjection(P(6_000, 2_000), "UP", null) === null
      && A.judProjection(P(6_000, 2_000, false), "UP", 1_000) === null);
  ok("2.14 the empty-side sentence's side: round-wide on the two-way control, side-aware once locked (the filler is never warned)",
    A.judEmptySide(P(3_000, 0), null) === "DOWN" && A.judEmptySide(P(3_000, 0), "UP") === "DOWN" && A.judEmptySide(P(3_000, 0), "DOWN") === null
      && A.judEmptySide(P(0, 0), "UP") === "BOTH" && A.judEmptySide(P(6_000, 2_000), null) === null);
}

// ── §3 · the addresses ────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · the addresses carry what the player chose, and a link alone never sets a stake");
{
  const dep = A.judDepositHref("udr_jud01", "UP", 5_000, 3_000);
  const q = new URL(dep, "https://50pick.tz").searchParams;
  ok("3.1 the deposit door: /wallet/deposit with the offered amount, from=low-balance and the round's bet (the sheet's query shape)",
    dep.startsWith("/wallet/deposit?") && q.get("amount") === "3000" && q.get("from") === "low-balance" && q.get("bet") === "udr_jud01.UP.5000"
      && j(parseBetParam(q.get("bet"))) === j({ kind: "round", id: "udr_jud01", side: "UP", stake: 5_000 }), dep);
  const next = A.judNextRoundHref("udr_next02", "DOWN", 2_500);
  ok("3.2 the next round: its own page with ?bet=<that round>.<side>.<stake> — and with no stake when none was carried",
    next === "/updown/udr_next02?bet=udr_next02.DOWN.2500" && A.judNextRoundHref("udr_next02", "UP", null) === "/updown/udr_next02?bet=udr_next02.UP", next);
  const bet = A.judBet("udr_jud01", "UP", 5_000);
  const mine = writeMarker(bet, NOW, {}, undefined, "usr_jud01");
  ok("3.3 a carried stake is honoured only with this tab's own marker for the same bet, owner-scoped — a forwarded link opens at the minimum",
    stakeFromUrl(bet, mine, NOW + MIN, "usr_jud01") === 5_000 && stakeFromUrl(bet, null, NOW, "usr_jud01") === null
      && stakeFromUrl(bet, mine, NOW + MIN, "usr_other") === null && stakeFromUrl(A.judBet("udr_jud01", "UP", 9_000), mine, NOW, "usr_jud01") === null);
  const privacy = read("src/app/legal/privacy/page.tsx");
  // One round paragraph per language (en, sw, zh): §7 must say it to every reader, not to one.
  const namesRound = (privacy.match(/data-policy-addition="pending-round"/g) ?? []).length === 3;
  ok("3.4 ⛔ the tab marker that carries a stake is written only once the privacy notice names a round (S12-PLAN Risk 14): JUD_TAB_MARKER is false, or §7 holds the round sentence",
    A.JUD_TAB_MARKER === false || namesRound, `JUD_TAB_MARKER=${A.JUD_TAB_MARKER}, §7 names a round: ${namesRound}`);
  const arm = strip(read(ARM));
  ok("3.5 …and every marker write in the arm is behind that constant (two: the deposit door, the next round)",
    (arm.match(/saveSheetSelection\(/g) ?? []).length === 2 && (arm.match(/if \(JUD_TAB_MARKER && marker && quarantineLegacySheet\(window\.sessionStorage\)\) saveSheetSelection\(/g) ?? []).length === 2);
}

// ── §4 · the round-closed notice ──────────────────────────────────────────────────────────────────────────────────
console.log("\n§4 · the round-closed notice says only what the server knows");
{
  const n = (o: Partial<Parameters<typeof A.judClosedNotice>[0]>) => A.judClosedNotice({ successor: null, confirmedDepositTzs: null, nowMs: NOW, ...o });
  ok("4.1 no successor yet: the title alone — no time, no button, no money line", j(n({})) === j({ paidAmount: null, nextOpensAtMs: null, successorRoundId: null }));
  ok("4.2 a future opening instant says when the next round starts; a past one says nothing (that round is live)",
    n({ successor: { roundId: null, opensAtMs: NOW + 5 * MIN } }).nextOpensAtMs === NOW + 5 * MIN && n({ successor: { roundId: "udr_n", opensAtMs: NOW - MIN } }).nextOpensAtMs === null);
  ok("4.3 the button appears once the next round exists", n({ successor: { roundId: "udr_n", opensAtMs: null } }).successorRoundId === "udr_n");
  ok("4.4 the money line only with a confirmed positive whole deposit — never a zero, a fraction or nothing",
    n({ confirmedDepositTzs: 5_000 }).paidAmount === 5_000 && [0, -5, 12.5, null].every((x) => n({ confirmedDepositTzs: x as number | null }).paidAmount === null));
  const round = strip(read(ROUND));
  ok("4.5 the round page never reads the paid amount from the address: it passes `confirmedDepositTzs: null` until S9's owned status exists",
    /judClosedNotice\(\{ successor: round\.successor, confirmedDepositTzs: null, nowMs: round\.serverNowMs \}\)/.test(round));
}

// ── §5 · rendered ─────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§5 · rendered in en/sw/zh: Up and Down only, the chips in full, the commit names the stake, the projection is the pool's");
{
  const { JudTwoWay, JudConfirm, JudRoundClosed } = await import("../src/components/journey/updown/jud-arm.tsx");
  const { useUpDownQuickBet } = await import("../src/components/updown/use-quick-bet.ts");
  const { I18nProvider } = await import("../src/lib/i18n.tsx");
  const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
  const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} };
  type Loc = "en" | "sw" | "zh";
  const LOCALES: Loc[] = ["en", "sw", "zh"];
  const wrap = (loc: Loc, el: ReactElement) => renderToStaticMarkup(
    createElement(AppRouterContext.Provider, { value: router as never }, createElement(I18nProvider, { initial: loc }, el)));
  const text = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  /** The host's hook, exactly as the card and the panel build it — the arm is handed it, never builds one. */
  function Host(props: { kind: "card" | "detail" | "confirm"; r: A.JudRound; v: A.JudViewer; side?: A.JudSide; loc: Loc }) {
    const t = dict[props.loc];
    const bet = useUpDownQuickBet({
      marketId: props.r.marketId, minStake: props.r.min, maxStake: props.r.max, myUpStake: props.r.myUpStake, myDownStake: props.r.myDownStake,
      walletBalance: props.v.spendable, selectionClosesAtMs: props.r.selectionClosesAtMs, serverNowMs: props.r.serverNowMs,
      copy: { placed: t.market.udBetPlaced, failed: t.market.udBetFailed, up: t.market.udUp, down: t.market.udDown, insufficient: t.market.udInsufficientBalance },
      errCopy: t.market as never, reasonCopy: t.error as unknown as Record<string, string>,
    });
    return props.kind === "confirm"
      ? createElement(JudConfirm, { bet, round: props.r, viewer: props.v, assetName: "Bitcoin", side: props.side ?? "UP" })
      : createElement(JudTwoWay, { bet, round: props.r, viewer: props.v, assetName: "Bitcoin", size: props.kind });
  }
  const POOLS: Array<[string, number, number]> = [["two-sided", 6_000, 2_000], ["down-empty", 3_000, 0], ["empty", 0, 0]];
  type R = { what: string; loc: Loc; kind: "card" | "detail" | "confirm"; pricing: UpDownPricing; side?: A.JudSide; html: string };
  const renders: R[] = [];
  let err = "";
  try {
    for (const loc of LOCALES) for (const [shape, up, down] of POOLS) for (const show of [true, false]) {
      const pricing = P(up, down, show);
      const r = round({ pricing });
      for (const kind of ["card", "detail"] as const) renders.push({ what: `${kind} ${loc}/${shape}/show=${show}`, loc, kind, pricing, html: wrap(loc, createElement(Host, { kind, r, v: viewer(facts()), loc })) });
      for (const side of ["UP", "DOWN"] as const) renders.push({ what: `confirm ${side} ${loc}/${shape}/show=${show}`, loc, kind: "confirm", pricing, side, html: wrap(loc, createElement(Host, { kind: "confirm", r, v: viewer(facts()), side, loc })) });
    }
  } catch (e) { err = String((e as Error)?.stack ?? e).split("\n").slice(0, 4).join(" | "); }
  ok(`5.0 the card control, the two-way control and the confirm panel render on the server (${renders.length} renders)`, err === "" && renders.length === 3 * 3 * 2 * 4, err || String(renders.length));
  const sides = (html: string) => [...html.matchAll(/<button[^>]*class="btn btn-(yes|no)\b[^"]*"[^>]*>([\s\S]*?)<\/button>/g)].map((m) => ({ side: m[1], text: text(m[2]) }));
  /** One element's opening tag, whatever order React writes its attributes in (it puts `disabled` first). */
  const tagOf = (html: string, re: RegExp) => html.match(re)?.[0] ?? "";
  const sideTags = (html: string) => [...html.matchAll(/<button\b[^>]*class="btn btn-(?:yes|no)\b[^"]*"[^>]*>/g)].map((m) => m[0]);
  const sentence = (loc: Loc, e: "UP" | "DOWN" | "BOTH" | null) => {
    const t = dict[loc].market;
    return e === "BOTH" ? t.udNobodyBackedEither : e === "UP" ? t.udNobodyBacked.replace("{side}", t.udUp) : e === "DOWN" ? t.udNobodyBacked.replace("{side}", t.udDown) : null;
  };
  const all3 = (loc: Loc) => [sentence(loc, "BOTH"), sentence(loc, "UP"), sentence(loc, "DOWN")] as string[];
  function defects(r: R, html = r.html): string[] {
    const d: string[] = [];
    const t = dict[r.loc];
    const all = text(html);
    if (/×/.test(all)) d.push(`a "×" is printed: …${(all.match(/.{0,30}×.{0,20}/) ?? [""])[0]}…`);
    if (/≈\s*\d+(?:[.,]\d+)?\s*×|≈\d/.test(all)) d.push("a multiple is printed");
    const want = sentence(r.loc, A.judEmptySide(r.pricing, r.kind === "confirm" ? r.side! : null));
    if (want && !all.includes(want)) d.push(`the empty-side sentence is missing: "${want}"`);
    for (const s of all3(r.loc)) if (s !== want && all.includes(s)) d.push(`a false empty-side sentence: "${s}"`);
    const chips = [...html.matchAll(/<button[^>]*class="[^"]*kp-bsheet__chip[^"]*"[^>]*>([^<]*)<\/button>/g)].map((m) => m[1]);
    if (j(chips) !== j([500, 1_000, 2_500, 5_000].map((n) => formatNumber(n)))) d.push(`the chips read ${j(chips)}`);
    const stakeBox = html.match(/<input[^>]*data-testid="jud-stake"[^>]*>/)?.[0] ?? "";
    if (!stakeBox) d.push("no stake box");
    if (r.kind === "confirm") {
      if (sides(html).length !== 0) d.push("a side button on the confirm panel");
      const chosen = text(html.match(/<span[^>]*data-testid="jud-chosen"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? "");
      const word = r.side === "UP" ? t.market.udUp : t.market.udDown;
      if (chosen !== t.journey.sheetChosen.replace("{side}", word)) d.push(`the chip reads "${chosen}"`);
      const cta = text(html.match(/<button[^>]*data-testid="jud-place"[^>]*>([\s\S]*?)<\/button>/)?.[1] ?? "");
      if (cta !== t.journey.placeCta.replace("{amount}", formatTzs(500))) d.push(`the commit reads "${cta}", want "${t.journey.placeCta.replace("{amount}", formatTzs(500))}"`);
      const projected = html.match(/data-testid="jud-projection"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? null;
      const wantP = projectedReturn(r.pricing, r.side!, 500);
      if (wantP === null) { if (projected !== null) d.push("a projection with no figure to state"); }
      else if (projected === null || !text(projected).includes(formatTzs(wantP))) d.push(`the projection reads ${projected && text(projected)}, the pool says ${formatTzs(wantP)}`);
      const qualifier = all.includes(text(t.market.udEstimateNote));
      if (qualifier !== (wantP !== null)) d.push(`the qualifier ${qualifier ? "shown without" : "missing beside"} a projection`);
      if (/gold|--gold/.test(html.match(/data-testid="jud-projection"[^>]*/)?.[0] ?? "")) d.push("the projection wears gold");
    } else {
      const b = sides(html);
      if (b.length !== 2) d.push(`${b.length} side buttons`);
      for (const x of b) { const w = x.side === "yes" ? t.market.udUp : t.market.udDown; if (x.text !== w) d.push(`the ${x.side} button reads "${x.text}"`); }
      if (all.includes(t.market.udEstimateNote)) d.push("the estimate note is on a choice surface");
      if (!all.includes(`${t.market.udTapToBet} · ${formatTzs(500)}`)) d.push("the prompt does not name the stake");
    }
    return d;
  }
  const bad = renders.flatMap((r) => defects(r).map((x) => `${r.what}: ${x}`));
  ok("5.1 every journey render obeys the ruling and the boards: word-only sides, no \"×\", chips in full, the commit and the prompt name the stake, the projection is the pool's with its qualifier, the empty side iff true",
    bad.length === 0, bad.slice(0, 5).join(" · "));
  ok("5.2 CONTROL · the renders cover a projection shown (switch on, two-sided) and withheld (switch off), and a sentence shown and withheld, in every language",
    LOCALES.every((loc) => renders.some((r) => r.loc === loc && r.kind === "confirm" && /data-testid="jud-projection"/.test(r.html))
      && renders.some((r) => r.loc === loc && r.kind === "confirm" && !/data-testid="jud-projection"/.test(r.html))
      && renders.some((r) => r.loc === loc && all3(loc).some((s) => text(r.html).includes(s)))
      && renders.some((r) => r.loc === loc && !all3(loc).some((s) => text(r.html).includes(s)))));
  // Not enough money: the sheet's own rows, "use instead" in place of "bet instead", and nothing placeable.
  const lowRenders = LOCALES.flatMap((loc) => (["card", "confirm"] as const).map((kind) => ({ loc, kind, html: wrap(loc, createElement(Host, { kind, r: round(), v: viewer(facts({ wallet: { status: "ACTIVE", balance: 200, bonusBalance: 0 } })), loc, side: "UP" })) })));
  const lowBad = lowRenders.flatMap(({ loc, kind, html }) => {
    const t = dict[loc].journey;
    const d: string[] = [];
    if (!text(html).includes(text(t.lowTitle))) d.push("no low title");
    if (!/data-testid="journey-sheet-deposit"/.test(html)) d.push("no deposit door");
    const use = text(html.match(/data-testid="jud-use-instead"[^>]*>([\s\S]*?)<\/button>/)?.[1] ?? "");
    // 200 held is under the 500 minimum: no "use instead" may be offered (shortfallPlan offers it only at ≥ min).
    if (use) d.push(`"use instead" offered below the minimum: ${use}`);
    if (/data-testid="journey-sheet-bet-instead"/.test(html)) d.push("the sheet's placing \"bet instead\" leaked into Juu/Chini");
    if (kind === "confirm" && !/\sdisabled=""/.test(tagOf(html, /<button\b[^>]*data-testid="jud-place"[^>]*>/))) d.push("the commit is not disabled");
    if (kind === "card" && sideTags(html).some((tag) => !/\sdisabled=""/.test(tag))) d.push("a side button is not disabled");
    return d.map((x) => `${kind} ${loc}: ${x}`);
  });
  ok("5.3 not enough money (200 held, 500 minimum): the sheet's low rows and its gilt deposit door, no \"use instead\" below the minimum, nothing placeable",
    lowBad.length === 0, lowBad.slice(0, 4).join(" · "));
  // A shortfall ABOVE the minimum ("Tumia {amount} badala yake") exists only after the player raises the stake — a first
  // render always opens at the minimum — so no static render can show it: 2.5 proves the option from the frame, and
  // `qa:journey-updown` drives it in a browser (low.3 offers it, low.4 and keys.4 show it sets the stake and places nothing).
  const bonusRender = wrap("en", createElement(Host, { kind: "card", r: round(), v: viewer(facts({ wallet: { status: "ACTIVE", balance: 200, bonusBalance: 800 } })), loc: "en" }));
  ok("5.5 ⭐ F1's journey half, rendered: 200 balance + 800 bonus covers a 500 stake — no low rows, the side buttons enabled",
    !/data-testid="journey-sheet-deposit"/.test(bonusRender) && !text(bonusRender).includes(dict.en.journey.lowTitle)
      && sideTags(bonusRender).length === 2 && sideTags(bonusRender).every((tag) => !/\sdisabled=""/.test(tag)));
  // The round-closed notice.
  const closed = (loc: Loc, notice: A.JudClosedNotice) => wrap(loc, createElement(JudRoundClosed, { roundId: "udr_jud01", side: "UP", notice, viewer: viewer(facts()) }));
  // In every language: the title alone while nothing is known; then the paid line, the next start and the button. The
  // drive (`qa:journey-updown` closed.*) cannot produce the paid line (S9's owned status is not on this base) nor the start
  // line (`updown-handover` settles and opens in one call), so these renders are their proof — figures included: the
  // amount in the mono money span and the time in `.kp-jud__time`, whose rule sets the mono face (DA T5: every numeral).
  const closedBad = LOCALES.flatMap((loc) => {
    const t = dict[loc].journey, d: string[] = [];
    const c1 = closed(loc, { paidAmount: null, nextOpensAtMs: null, successorRoundId: null });
    const c2 = closed(loc, { paidAmount: 5_000, nextOpensAtMs: NOW + 5 * MIN, successorRoundId: "udr_next02" });
    const [paidHead, paidTail] = t.udRoundClosedPaid.split("{amount}");
    const [atHead, atTail] = t.udNextRoundAt.split("{time}");
    if (!text(c1).includes(text(t.udRoundClosedTitle))) d.push("no title");
    if (/jud-next-round/.test(c1)) d.push("a button with no successor");
    if (text(c1).includes(text(paidHead.trim())) || text(c1).includes(text(atHead.trim()))) d.push("a paid or start line with nothing known");
    if (!text(c2).includes(text(t.udRoundClosedPaid.replace("{amount}", formatTzs(5_000))))) d.push("no paid line");
    if (!new RegExp(`<span class="amount">${formatTzs(5_000).replace(/\s/g, "\\s")}</span>`).test(c2.replace(/&nbsp;|\u00a0/g, " "))) d.push("the paid figure is not in the money span");
    const clock = new RegExp(`${atHead.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*<span class="kp-jud__time">\\d\\d:\\d\\d</span>${atTail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    if (!clock.test(c2)) d.push("the start line does not carry a 24-hour time in .kp-jud__time");
    if (!/\shref="\/updown\/udr_next02\?bet=udr_next02\.UP"/.test(tagOf(c2, /<a\b[^>]*data-testid="jud-next-round"[^>]*>/)) || !text(c2).includes(text(t.udNextRoundGo))) d.push("no button to the next round carrying the side");
    void paidTail;
    return d.map((x) => `${loc}: ${x}`);
  });
  const timeRule = /\.kp-jud__time\s*\{([^}]*)\}/.exec(read("src/app/globals.css"))?.[1] ?? "";
  if (!/font-family:\s*var\(--font-mono\)/.test(timeRule) || !/font-variant-numeric:\s*tabular-nums/.test(timeRule)) closedBad.push(`.kp-jud__time is not the mono figure face: {${timeRule.trim()}}`);
  ok("5.6 the round-closed notice in en/sw/zh: the title alone while nothing is known; then the paid line (its figure the mono money span), the next start (a 24-hour time in the mono face) and the button carrying the side",
    closedBad.length === 0, closedBad.slice(0, 4).join(" · "));
  // ⭐ PLANTS — the reader must report each.
  const two = renders.find((r) => r.what === "card en/two-sided/show=true")!;
  const conf = renders.find((r) => r.what === "confirm UP sw/two-sided/show=true")!;
  const plantMult = two.html.replace(/(<button[^>]*class="btn btn-yes[^"]*"[^>]*>[\s\S]*?)(<\/button>)/, "$1<span>≈1.26×</span>$2");
  ok("5.1′ PLANT · a multiple put back on the arm's Up button is reported", plantMult !== two.html && defects(two, plantMult).some((x) => /×|multiple|button reads/.test(x)));
  const plantProj = conf.html.replace(/(data-testid="jud-projection"[^>]*>[\s\S]*?<span class="amount">)[^<]+(<\/span>)/, `$1${formatTzs(750)}$2`);
  ok("5.1″ PLANT · a projection that is not the pool's is reported", plantProj !== conf.html && defects(conf, plantProj).some((x) => /pool says/.test(x)));
  const plantChip = two.html.replace(/(<button[^>]*kp-bsheet__chip[^>]*>)1,000(<\/button>)/, "$11K$2");
  ok("5.1‴ PLANT · a classic short chip label (\"1K\") in the arm is reported", plantChip !== two.html && defects(two, plantChip).some((x) => /chips read/.test(x)));
}

// ── §6 · classic files keep every line ────────────────────────────────────────────────────────────────────────────
console.log("\n§6 · the classic files keep every base line, in order, except the named swaps and source footer");
{
  const SWAPS: Record<string, RegExp[]> = {
    [BOARD]: [/^\s+walletBalance=\{walletBalance\}$/],
    [ROUND]: [
      /^\s+searchParams: Promise<\{ side\?: string; from\?: string \}>;$/, /^\s+lockedSide,$/,
      /^\s+walletBalance: detail\.walletBalance,$/, /^\s+\{t\.market\.udPositionsOnRound\} · \{formatNumber\(myPosition\.items\.length\)\}$/,
      // F34: the page keeps prose in the body face and isolates the amount, instant and proof figures in mono.
      /^import \{ fill, formatNumber, formatTzs \} from "@\/lib\/utils";$/,
      /^\s+const stamp = quotedAt \? <span className="whitespace-nowrap">\{t\.market\.udQuoted\} \{quotedAt\}/,
      /^\s+: !decided && tone === "level" \? fill\(t\.market\.udLevelBy/,
      /^\s+: `\$\{move > 0 \? t\.market\.udAboveOpenBy/,
      /^\s+<dl className="mt-\[11px\] grid grid-cols-\[auto_1fr\].*font-mono text-\[10\.5px\]/,
      /^\s+<dd className="m-0 tabular-nums text-text-muted">\{fmtEAT\((quotedAt|observedAt)\)/,
      /^\s+<dd className="m-0 tabular-nums text-text-muted">\{pMove(Pct)?/,
      /^\s+<dd className="m-0 tabular-nums" style=\{\{ color: "var\(--(yes|no)-300\)"/,
      // PHOSPHOR-MIGRATION W4 (§8a, §8b): the hand-drawn outcome arrow and person mark and the typed ↑/↓ are the family's
      // arrowUp/arrowDown and users; test:visual-pass-r10 §3 pins each new mark's role.
      /^\s+const outcomeArrow = round\.outcome === "UP" \? "M5 15l7-7 7 7" : round\.outcome === "DOWN" \? "M5 9l7 7 7-7" : null;$/,
      /^\s+\{p\.side === "UP" \? "↑" : "↓"\} \{formatTzs\(p\.stake\)\}$/,
      /^\s+<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var\(--text-muted\)" .*<circle cx="12" cy="8" r="3\.4" \/>.*<\/svg>$/,
      /^\s+\{outcomeArrow && <svg width="16" height="16" viewBox="0 0 24 24" .*<path d=\{outcomeArrow\} \/><\/svg>\}$/,
    ],
    [CARD]: [
      /^\s+expectedResultAtMs = null, resolvedAtMs = null, successor, receipt, breakBody = null,$/,
      /^\s+price, and never leaving the dot stranded at a line's end \(the stamp carries it onto its own line\)\. The$/,
      /^\s+seconds stay \(E-47b\)\. \*\/\}$/,
      /^\s+\{t\.market\[SOURCE_CLASS_KEY\[sourceClass\]\]\}$/,
      /^\s+\{quoted && <>\{" "\}<span className="whitespace-nowrap">\{"· "\}/,
      // F32/F55: baseline alignment and the named EAT lock instant.
      /^\s+\* The wall-clock time the lock happened, in the player's own locale/,
      /^\s+CLOCK_FORMAT = new Intl.DateTimeFormat\(undefined/,
      /^\s+return CLOCK_FORMAT.format\(new Date\(ms\)\);$/,
      /^\s+\/\/ The exact time the lock happened \(or will\), for the reason line\. Local-time formatting is$/,
      /^\s+\/\/ deliberate — the player's own clock is what they will compare it against\.$/,
      /^\s+\/\/ ⚠️ `formatClock` reuses ONE `Intl.DateTimeFormat`/,
      /^\s+\/\/ render, and this card used to render every second\.$/,
      /^\s+<span className="inline-flex items-center gap-1 self-center font-mono text-\[15\.5px\]/,
      // U43 (MOBILE-VISUAL, 2026-10-19): the last-30-seconds pulse moves onto the digits' own span — beside `.m-tick` it lost
      // the cascade and never played — and a round only one side backed shows its refund sentence instead of the two
      // "If it closes …" rows (classic-identical otherwise: the journey arm draws neither).
      /^\s+className=\{cn\("m-tick font-mono font-bold tabular-nums leading-none", urgent && "ud-count-pulse"\)\}$/,
      /^\s+\{digits \?\? mmss\(left\)\}$/,
      /^\s+\{ifUp != null && ifDown != null && \($/,
      // PHOSPHOR-MIGRATION W4 (§8b): the sides are the family's arrowUp/arrowDown wherever the trend zigzags stood, each set
      // by its role (test:visual-pass-r10 §3).
      /^\s+\{tone === "(up|down)" && <I\.trending(Up|Down) s=\{11\} \/>\}$/,
      /^\s+<I\.trendingUp s=\{10\} edge="start" \/>\{t\.market\.udUp\}$/,
      /^\s+\{t\.market\.udDown\}<I\.trendingDown s=\{10\} edge="end" \/>$/,
      /^\s+\{\/\* The trend pictogram leads the centred pick, so its ink stands on the start padding \(round 10, R10-A6\)\. \*\/\}$/,
      /^\s+<I\.trending(Up|Down) s=\{14\} edge="start" className=\{GLYPH_NO_SHRINK\} \/> \{t\.market\.ud(Up|Down)\}$/,
      /^\s+\{outcome === "UP" \? <I\.trendingUp s=\{14\} className=\{GLYPH_NO_SHRINK\} \/> : <I\.trendingDown s=\{14\} className=\{GLYPH_NO_SHRINK\} \/>\}$/,
    ],
    [PANEL]: [
      // PHOSPHOR-MIGRATION W4 (§8a): the projected return's hand-drawn arrow is the family's arrowRight.
      /^\s+<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var\(--text-muted\)" .*<path d="M5 12h14M13 6l6 6-6 6" \/><\/svg>$/,
    ],
    [ACTION]: [
      // F55: the locked round panel names the same EAT clock as its board card.
      /^\s+const lockClock = selectionClosesAtMs != null$/,
      /^\s+\? new Date\(selectionClosesAtMs\)\.toLocaleTimeString\(undefined/,
      /^\s+: null;$/,
      // U43 (MOBILE-VISUAL, 2026-10-19): the card's twin — one refund sentence on a one-sided locked round (two imports gain
      // `emptySideOf` and `noticeBody`, the rows' condition gains `!lockedOneSided`).
      /^import type \{ UpDownPricing \} from "@\/lib\/updown-pricing";$/,
      /^import type \{ KeptBody \} from "@\/components\/ui\/empty-state-text";$/,
      /^\s+\{payoutIfUp != null && payoutIfDown != null && \($/,
    ],
  };
  const results = Object.entries(SWAPS).map(([file, swaps]) => {
    let base = "";
    try { base = execFileSync("git", ["show", `${BASE}:${file}`], { encoding: "utf8" }).replace(/\r\n/g, "\n"); } catch { return { file, error: `no ${BASE}:${file}` }; }
    const now = read(file).split("\n");
    const baseLines = base.split("\n");
    let i = 0;
    const missing: string[] = [];
    for (const line of baseLines) {
      const at = now.indexOf(line, i);
      if (at >= 0) { i = at + 1; continue; }
      if (swaps.some((re) => re.test(line))) continue;
      missing.push(line.trim().slice(0, 90));
    }
    return { file, missing, swapsSeen: swaps.filter((re) => baseLines.some((l) => re.test(l))).length, swapsWanted: swaps.length };
  });
  ok("6.1 every base line of the five classic files is still there, in order, but for the named swaps and DotSeq footer",
    results.every((r) => !("error" in r) && r.missing!.length === 0 && r.swapsSeen === r.swapsWanted), `against ${BASE}: ` + j(results.filter((r) => "error" in r || r.missing!.length || r.swapsSeen !== r.swapsWanted)));
  const board = strip(read(BOARD)), roundSrc = strip(read(ROUND)), card = strip(read(CARD)), panel = strip(read(PANEL));
  ok("6.2 each swap is classic-identical by construction: the journey value only when `judViewer` is set, else today's",
    /walletBalance=\{judViewer \? judViewer\.spendable : walletBalance\}/.test(board)
      && /lockedSide: judSide \?\? lockedSide,/.test(roundSrc) && /walletBalance: judViewer \? judViewer\.spendable : detail\.walletBalance,/.test(roundSrc)
      && /\{journey \? t\.journey\.ticketsHere : t\.market\.udPositionsOnRound\}/.test(roundSrc)
      && /const judSide: "UP" \| "DOWN" \| null = !judViewer \? null/.test(roundSrc));
  ok("6.3 the arm stands in the same slot as the classic element on the card and both panel arms (one ternary or early return each)",
    /\{journey && marketId && serverNowMs != null \? <LazyJudTwoWay[\s\S]*?: \(\n\s*<UpDownStakeControls/.test(card)
      && /if \(jud && props\.journey\) return <LazyJudTwoWay /.test(panel) && /if \(jud && props\.journey\) return <LazyJudConfirm /.test(panel));
}

// ── §7 · the flag ─────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§7 · the arm is a journey request's alone");
{
  const board = strip(read(BOARD)), roundSrc = strip(read(ROUND));
  ok("7.1 both pages read the viewer's facts only for a journey request with a session",
    /const judViewer = journey && session \? await judViewerFor\(session\.userId, session\.playStartedAt\) : null;/.test(board)
      && /const judViewer = journey && session \? await judViewerFor\(session\.userId, session\.playStartedAt\) : null;/.test(roundSrc));
  ok("7.2 …and hand them on by a spread a classic reader's props never see (no `journey` key, not even null)",
    /\{\.\.\.\(judViewer \? \{ journey: judViewer \} : \{\}\)\}/.test(board) && /\.\.\.\(judViewer \? \{ journey: \{ roundId, viewer: judViewer \} \} : \{\}\),/.test(roundSrc)
      && !/journey=\{judViewer\}/.test(board));
  ok("7.3 the round-closed notice renders only for a journey reader who came back with a bet for a round that no longer takes one",
    /const judClosed = judViewer && judSide && !isOpen\n/.test(roundSrc) && /\{judClosed && judSide && <LazyJudRoundClosed /.test(roundSrc));
  const server = strip(read(SERVER));
  ok("7.4 the viewer half reads the sheet's own viewerFacts and counts the bonus as spendable; a failed read is unknown (null), never zero",
    /import \{ viewerFacts \} from "\.\/journey-sheet";/.test(server) && /Math\.max\(0, wallet\.balance\) \+ Math\.max\(0, wallet\.bonusBalance \?\? 0\)/.test(server)
      && /\.catch\(\(\) => null\)/.test(server));
  const css = read("src/app/globals.css");
  const rules = [...css.matchAll(/^\.(kp-jud[\w-]*)/gm)].map((m) => m[1]);
  ok("7.5 the arm's own CSS is its kp-jud rules alone — nothing that matches a classic element",
    rules.length >= 5 && rules.every((r) => r.startsWith("kp-jud")) && !/\.kp-jud[^{]*\.(?:btn|mcardp|ud-act)\b/.test(css), j(rules));
}

// ── §8 · the words ────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§8 · S12's journey words, in three languages");
{
  const KEYS = ["udRoundClosedTitle", "udRoundClosedPaid", "udNextRoundAt", "udNextRoundGo", "udUseInstead", "udQuickStakes"] as const;
  const missing = (["en", "sw", "zh"] as const).flatMap((loc) => KEYS.filter((k) => typeof (dict[loc].journey as Record<string, unknown>)[k] !== "string").map((k) => `${loc}.${k}`));
  ok("8.1 the six S12 journey keys exist in en, sw and zh", missing.length === 0, j(missing));
  const sw = dict.sw.journey;
  ok("8.2 the reviewed Swahili (S4-COPY-AUDIT review 3 and the boards): \"Raundi hii imefungwa\", \"Pesa zako zimeingia — {amount} ziko kwenye salio lako.\", \"Nenda kwenye raundi inayofuata\", \"Tumia {amount} badala yake\"",
    sw.udRoundClosedTitle === "Raundi hii imefungwa" && sw.udRoundClosedPaid === "Pesa zako zimeingia — {amount} ziko kwenye salio lako."
      && sw.udNextRoundGo === "Nenda kwenye raundi inayofuata" && sw.udUseInstead === "Tumia {amount} badala yake" && sw.udNextRoundAt === "Raundi inayofuata inaanza {time}.");
  ok("8.3 the placeholders agree across languages ({amount} twice, {time} once)",
    (["en", "sw", "zh"] as const).every((loc) => dict[loc].journey.udRoundClosedPaid.includes("{amount}") && dict[loc].journey.udUseInstead.includes("{amount}") && dict[loc].journey.udNextRoundAt.includes("{time}")));
  ok("8.4 the Chinese How-to says winners share the pool in proportion to their bets (赢家按投注比例分享奖池), never \"equally\" (平分)",
    dict.zh.journey.howStep3Body.startsWith("赢家按投注比例分享奖池") && !dict.zh.journey.howStep3Body.includes("平分"), dict.zh.journey.howStep3Body);
  ok("8.5 no S12 Juu/Chini word prints a multiple or a rate", !KEYS.some((k) => (["en", "sw", "zh"] as const).some((loc) => /×|%/.test((dict[loc].journey as Record<string, string>)[k]))));
  ok("8.6 the sheet's low rows are one block (LowBlock), defined in the sheet's own file and drawn by both hosts",
    /export function LowBlock\(/.test(read(SHEET)) && (strip(read(ARM)).match(/<LowBlock /g) ?? []).length === 2 && (strip(read(SHEET)).match(/<LowBlock /g) ?? []).length === 1);
}

console.log(`\njourney-updown: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.error(`\n✗ ${fails.length} failed:\n${fails.map((f) => `   · ${f}`).join("\n")}\n`);
  process.exit(1);
}
console.log("✓ Juu/Chini speaks the journey's language on the classic money path; the named source footer replacement is guarded separately.\n");
