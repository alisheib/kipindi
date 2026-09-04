/**
 * presence-class — a celebration only for a result the player was here to watch land,
 * and an announcement that is never marked delivered before it has been delivered.
 *
 * ── THE DECISION (Ali, 2026-09-04) ────────────────────────────────────────────────────
 *
 * *"When I open after a long time and I find multiple notifications that I won… they appear
 * all of a sudden. If I'm logged in and in platform show the celebration, but if I come back
 * after a while I don't think it's needed."*
 *
 * Four rulings followed: an old win gets the seal only when the player TAPS for it; "a while"
 * is the 30 minutes the platform already uses; the return surface is a calm NoticeBar; and a
 * live burst coalesces into one toast.
 *
 * ── THE DEFECTS THIS PINS ─────────────────────────────────────────────────────────────
 *
 * 🔴 E-266 · The toast flood guard DESTROYED everything past four — sliced out of the stack
 *    with its timers cleared, never rendering a frame — while `notify-poller` marked every
 *    position in the same pass as announced AND pruned its market from the localStorage watch
 *    list. A player returning to eight settled positions was told about four of them, ever:
 *    sessionStorage said announced, and the watch list that would have re-fetched the rest was
 *    already gone. A money announcement is not a decoration.
 * 🔴 E-267 · `WinCelebrationHost` mounts a `Modal` but never registered with
 *    `result-modal-presence`, so §F1's toast stand-down did not apply to the one modal §M7
 *    declares exclusive. Toasts at `z-[1800]` painted over the seal at `zIndex 1700`.
 * 🔴 E-268 · `readSeen()` answered an empty set whenever `sessionStorage` threw, with no
 *    memory fallback — so in a storage-blocked browser every settled position re-announced
 *    every two seconds, indefinitely.
 * 🔴 E-269 · The countdown hairline was an INLINE animation, so both reduced-motion clamps
 *    zeroed it and `forwards` held the EMPTY frame: the bar read "your time is up" under a
 *    toast the JS timer held for its full 4.5–8 seconds.
 *
 * ── WHY §1 AND §5 IMPORT INSTEAD OF GREPPING ──────────────────────────────────────────
 *
 * ⭐ `outcome-announcement.ts` and `away-ledger.ts`'s `summarise` are PURE — no DOM, no React,
 * no clock — so this suite CALLS them and asserts what they RETURN. That is §5b at full
 * strength: the answer, not the symbol. A routing table can be inverted without changing a
 * single identifier, and only an executed cross-product catches that.
 *
 * npm run test:presence-class
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { OutcomeKind, PresenceContext } from "../src/lib/outcome-announcement.ts";
import type { LedgerEntry } from "../src/lib/away-ledger.ts";

/**
 * ⛔ `PC_ROOT` — THE SCRATCH ROOT, AND IT IS NOT A CONVENIENCE.
 *
 * `red:presence-class` proves this suite can fail by injecting defects. Two sessions share
 * this working tree, so a harness that mutated files IN PLACE would put a deliberately broken
 * source file under another session's editor — and one `git add -A` away from production.
 * ⭐ So the harness copies `src/` to a temp dir and points this variable at it; the suite
 * reads AND imports from there. Same construction `red-motion-ladder.mjs` uses and states.
 *
 * ⚠️ The four modules imported below have NO runtime imports of their own (the ledger's
 * `OutcomeKind` is a TYPE import and is erased), so they load cleanly from a copied tree with
 * no path-alias resolution. ⛔ If any of them ever gains a real runtime import, this dynamic
 * load breaks and the harness must copy more than `src/`.
 */
const ROOT = process.env.PC_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel: string) => import(pathToFileURL(join(ROOT, rel)).href);

const { routeOutcome, MAX_LIVE_AGE_MS } = (await load("src/lib/outcome-announcement.ts")) as
  typeof import("../src/lib/outcome-announcement.ts");
const { summarise } = (await load("src/lib/away-ledger.ts")) as
  typeof import("../src/lib/away-ledger.ts");
const { groupKeyFor, mergeGroup } = (await load("src/lib/toast-group.ts")) as
  typeof import("../src/lib/toast-group.ts");

const POLICY = "src/lib/outcome-announcement.ts";
const PRESENCE = "src/lib/presence-window.ts";
const LEDGER = "src/lib/away-ledger.ts";
const PLAY = "src/lib/play-session.ts";
const TOAST = "src/components/ui/toast.tsx";
const POLLER = "src/components/markets/notify-poller.tsx";
const CELEBRATION = "src/components/markets/win-celebration.tsx";
const MOTION = "src/app/motion.css";
const BAR = "src/components/layout/away-summary-bar.tsx";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? `\n         ${d}` : ""}`); }
  return c;
};
/** ⛔ CRLF-normalised: `core.autocrlf=true` on the Windows checkouts, and a verdict must not
 *  depend on which machine cloned the repo. */
const read = (p: string) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");

/* Source with comments removed — ⛔ a comment cannot fire a haptic, destroy a toast or mark a
 * position announced. Every absence-check below reads CODE, and several of these files carry a
 * paragraph naming the very symbol the check forbids.
 *
 * ⛔ THE SHARED HELPER, NOT A PRIVATE COPY. `test:decomment` ratchets the number of scripts
 * that hand-roll this, and it may only shrink — because the two obvious orderings are each
 * wrong in a different way (E-186: strip blocks first and you lose the code after a `/*` that
 * appears inside a `//` line; strip lines first and you lose code after a `//` inside a block).
 * One right answer, imported 61 times. */
import { decomment as stripComments } from "./lib/decomment.mts";

/** Brace-matched body extraction. Returns `null`, never `""` — an empty slice would make
 *  every check scoped to it pass vacuously, which is what §0 refuses to run over. */
function sliceBraces(text: string, open: string): string | null {
  const i = text.indexOf(open);
  if (i < 0) return null;
  let d = 0;
  for (let j = text.indexOf("{", i); j < text.length; j++) {
    if (text[j] === "{") d++;
    else if (text[j] === "}") { d--; if (d === 0) return text.slice(i, j + 1); }
  }
  return null;
}

console.log("\npresence-class — the ceremony belongs to the moment, not to the backlog\n");

/* ═══ §0 · THE SLICES — refuse to run if any is empty ═══════════════════════════════════
 * ⚠️ Session 29 shipped six checks that could not fail because their slice never resolved.
 * A guard that cannot go red is worse than no guard: it is a green light over an unread road. */
console.log("§0 · the slices resolve, so every scoped check below can actually fail");

const toastSrc = stripComments(read(TOAST));
const pollerSrc = stripComments(read(POLLER));
const presenceSrc = stripComments(read(PRESENCE));
const ledgerSrc = stripComments(read(LEDGER));

const presentBody = sliceBraces(toastSrc, "const present = React.useCallback(");
const tickBody = sliceBraces(pollerSrc, "const tick = async () =>");
const visibilityBody = sliceBraces(presenceSrc, "function handleVisibility()");
const summariseBody = sliceBraces(ledgerSrc, "export function summarise(");

const slices: [string, string | null][] = [
  ["present() in toast.tsx", presentBody],
  ["tick() in notify-poller.tsx", tickBody],
  ["handleVisibility() in presence-window.ts", visibilityBody],
  ["summarise() in away-ledger.ts", summariseBody],
];
let sliceFail = false;
for (const [name, body] of slices) {
  const good = !!body && body.length > 120;
  if (!ok(`0.1 · slice resolves: ${name}`, good, "the checks scoped to it would pass vacuously")) sliceFail = true;
}
ok("0.2 · the stripped poller is still real code (else every absence below proves nothing)",
  pollerSrc.length > 2000 && pollerSrc.includes("dispatchWinCelebration"));
ok("0.3 · the stripped toast is still real code",
  toastSrc.length > 4000 && toastSrc.includes("MAX_VISIBLE"));
if (sliceFail) {
  console.error("\n⛔ A SLICE DID NOT RESOLVE. Refusing to report a result over checks that cannot fail.");
  process.exit(1);
}

/* ═══ §1 · THE ROUTING INVARIANT — EXECUTED, NOT GREPPED ════════════════════════════════ */
console.log("\n§1 · every uncertainty routes AWAY from ceremony (the function is CALLED)");

const NOW = 1_760_000_000_000;
const ctx = (o: Partial<PresenceContext> = {}): PresenceContext => ({
  presenceSinceMs: NOW - 60_000,
  serverNowMs: NOW,
  attentive: true,
  ...o,
});
const fresh = { kind: "WIN" as OutcomeKind, settledAtMs: NOW - 1_000 };

ok("1.1 · a hidden tab never celebrates — a seal shown to an empty chair is a seal spent",
  routeOutcome(fresh, ctx({ attentive: false })).channel === "LEDGER");
/* ⭐ BOTH SPELLINGS OF "UNKNOWN", AND THE SECOND IS THE ONE THAT BITES. `red:presence-class`
 * found that the `null` case cannot fail on its own: rule 4 coerces `null` to 0 and routes it
 * away even with rule 2 deleted, so a check that only passed `null` was testing a branch it
 * could not reach (the law's rule 8 — prove you can produce the failure before asserting it).
 * `undefined` does not coerce — `undefined < n` is false and `n - undefined` is NaN — so with
 * rule 2 gone it reaches CEREMONY. A producer reading an optional field hands us exactly that. */
ok("1.2 · an UNKNOWN settle instant is never LIVE — null AND undefined, all three outcomes",
  (["WIN", "LOSS", "VOID"] as OutcomeKind[]).every((k) =>
    routeOutcome({ kind: k, settledAtMs: null }, ctx()).channel === "LEDGER"
    && routeOutcome({ kind: k, settledAtMs: undefined }, ctx()).channel === "LEDGER"),
  "'we do not know when' must never read as 'yes, just now'");
/* ⭐ 1.2b — THE THIRD SPELLING OF "UNKNOWN", AND IT IS A `number`, SO THE TYPE CANNOT STOP IT.
 * `Date.parse` answers NaN for a malformed date string, and NaN walks through rule 4 (`NaN < n`
 * is false) and rule 5 (`n - NaN` is NaN, `NaN > MAX` is false) to reach the seal by exactly the
 * route rule 2 exists to close for `undefined`.
 * ⛔ ITS GATE IS DELIBERATELY DISJOINT FROM RULE 2's, and this suite is why. The obvious
 * `!Number.isFinite(x)` also swallows null and undefined — which made rule 2 behaviourally dead
 * and its RED mutation uncatchable (10/11, the miss naming that very gate). Two classes, two
 * gates, two independent proofs. */
ok("1.2b · a NaN settle instant — a `number` that is not a time — never reaches the seal",
  (["WIN", "LOSS", "VOID"] as OutcomeKind[]).every((k) =>
    routeOutcome({ kind: k, settledAtMs: Number.NaN }, ctx()).channel === "LEDGER"),
  "Date.parse answers NaN for a malformed string, and NaN defeats every comparison below it");
ok("1.3 · an unestablished presence clock routes to the ledger, not optimistically to the seal",
  routeOutcome(fresh, ctx({ presenceSinceMs: null })).channel === "LEDGER");
ok("1.4a · one millisecond BEFORE this sitting began is RETURNING",
  routeOutcome({ kind: "WIN", settledAtMs: NOW - 60_001 }, ctx()).channel === "LEDGER");
ok("1.4b · …and exactly AT the boundary is LIVE (the comparison is not inverted)",
  routeOutcome({ kind: "WIN", settledAtMs: NOW - 60_000 }, ctx()).channel === "CEREMONY");
ok("1.5 · the freshness cap holds even INSIDE the presence window",
  routeOutcome(
    { kind: "WIN", settledAtMs: NOW - (MAX_LIVE_AGE_MS + 1) },
    ctx({ presenceSinceMs: NOW - (MAX_LIVE_AGE_MS + 10_000) }),
  ).channel === "LEDGER",
  "a player watching for hours must not be ambushed by a settle discovered late");
ok("1.6 · a LIVE loss and a LIVE refund are BOTH toasts, in DIFFERENT groups",
  (() => {
    const l = routeOutcome({ kind: "LOSS", settledAtMs: NOW - 1000 }, ctx());
    const v = routeOutcome({ kind: "VOID", settledAtMs: NOW - 1000 }, ctx());
    return l.channel === "TOAST" && v.channel === "TOAST"
      && !!l.groupKey && !!v.groupKey && l.groupKey !== v.groupKey;
  })(),
  "coalescing a loss with a refund would state that a returned stake was lost");

/** ⭐ 1.7 — THE INVARIANT, ENUMERATED. Over the whole cross-product, `CEREMONY` may appear
 *  ONLY in the single all-green cell. This is the check that survives a rename. */
{
  const kinds: OutcomeKind[] = ["WIN", "LOSS", "VOID"];
  const settles: [string, number | null | undefined][] = [
    ["null", null], ["undefined", undefined], ["nan", Number.NaN],
    ["stale", NOW - (MAX_LIVE_AGE_MS + 5_000)], ["fresh", NOW - 1_000],
  ];
  const sinces: [string, number | null][] = [
    ["null", null], ["after-settle", NOW - 500], ["before-settle", NOW - 120_000],
  ];
  const wrong: string[] = [];
  for (const k of kinds) for (const [sn, s] of settles) for (const [pn, p] of sinces) for (const a of [true, false]) {
    const r = routeOutcome({ kind: k, settledAtMs: s }, { presenceSinceMs: p, serverNowMs: NOW, attentive: a });
    const shouldCeremony = k === "WIN" && sn === "fresh" && pn === "before-settle" && a === true;
    if ((r.channel === "CEREMONY") !== shouldCeremony) wrong.push(`${k}/${sn}/${pn}/attentive=${a} → ${r.channel}`);
  }
  ok(`1.7 · ⭐ across all ${kinds.length * settles.length * sinces.length * 2} combinations, exactly one reaches CEREMONY`,
    wrong.length === 0, wrong.slice(0, 4).join(" · "));
}
ok("1.control · a case that DOES celebrate exists (so 1.1–1.5's absences are not vacuous)",
  routeOutcome(fresh, ctx()).channel === "CEREMONY");
/* ⚠️ BOTH HALVES READ STRIPPED SOURCE. The first draft tested the RAW file for the client
 * directive and went red on a correct module — because that module's own header says, in
 * prose, *"⛔ NO `use client`, NO `document`, NO `window`"*. A check that a comment can fail
 * is the defect this file's own `stripComments` exists to prevent, and it caught its author.
 * ⛔ A real directive is CODE and survives stripping, so the check keeps all its teeth. */
{
  const policySrc = stripComments(read(POLICY));
  ok("1.8 · the policy module stays pure — no DOM, no client directive",
    !/["']use client["']/.test(policySrc) && !/\bdocument\.|\bwindow\./.test(policySrc),
    "a DOM dependency would turn §1 into an import error rather than an assertion");
}

/* ═══ §2 · CLOCK DISCIPLINE ════════════════════════════════════════════════════════════ */
console.log("\n§2 · deltas in device time, instants in server time — never mixed");

ok("2.1 · exactly ONE offset capture in the presence module",
  (presenceSrc.match(/serverNowMs\s*-\s*Date\.now\(\)/g) ?? []).length === 1,
  "re-measuring per read makes two outcomes in one tick classify against different clocks");
ok("2.2 · the hidden-duration is a DEVICE delta — two readings of the same clock",
  !!visibilityBody && /Date\.now\(\)\s*-\s*hiddenAtDevice/.test(visibilityBody)
    && !/offsetMs/.test(visibilityBody),
  "applying the offset to a delta would import the skew it exists to remove");
ok("2.3 · the window start is stored in SERVER time",
  !!visibilityBody && /presenceSince\s*=\s*serverNow\(\)/.test(visibilityBody));
ok("2.4 · the boundary is the platform's ONE definition, imported, not a second literal",
  /PLAY_SESSION_GAP_MS/.test(presenceSrc) && /from "@\/lib\/play-session"/.test(read(PRESENCE))
    && !/30\s*\*\s*60|1_?800_?000/.test(presenceSrc),
  "a threshold written twice is a threshold that will disagree with itself");
ok("2.5 · and it is declared exactly once across src/",
  (() => {
    const decl = /export const PLAY_SESSION_GAP_MIN/g;
    return (read(PLAY).match(decl) ?? []).length === 1;
  })());

/* ═══ §3 · ANNOUNCE FIRST, THEN MARK ═══════════════════════════════════════════════════ */
console.log("\n§3 · nothing may claim delivery it did not perform");

{
  const body = tickBody!;
  const iAnnounce = Math.min(
    ...[body.indexOf("dispatchWinCelebration("), body.indexOf("toast({")].filter((i) => i >= 0),
  );
  const iMark = body.indexOf("seen.add(p.positionId)");
  const iPrune = body.indexOf("localStorage.setItem(WATCH_KEY");
  ok("3.control · the tick slice contains BOTH an announcement and the marker",
    iAnnounce >= 0 && iMark >= 0 && iPrune >= 0,
    "comparing two -1s would report a correct order over an empty slice");
  ok("3.1 · ⭐ the announced-marker is written AFTER the announcement, not before it",
    iMark > iAnnounce,
    "marking first is E-266: a destroyed toast recorded as delivered, unrecoverably");
  ok("3.2 · the watch-list prune also follows the announcement",
    iPrune > iAnnounce,
    "pruning a market whose news was never shown makes it unreachable even after `seen` clears");
}
ok("3.3 · the announced-set survives blocked storage (E-268)",
  /const memSeen = new Map/.test(pollerSrc)
    && /memSeen\.set\(SEEN_KEY/.test(pollerSrc)
    && /memSeen\.get\(SEEN_KEY/.test(pollerSrc),
  "an empty set on every tick re-announces every settled position every 2 seconds, forever");

/* ═══ §4 · THE TOAST STACK HOLDS, IT DOES NOT DESTROY ══════════════════════════════════ */
console.log("\n§4 · overflow is held like §F1's hold — nothing is dropped");

ok("4.1 · ⭐ `present()` no longer slices toasts out of the stack",
  !/slice\(-MAX_VISIBLE\)/.test(presentBody!) && !/slice\(0, merged\.length/.test(presentBody!),
  "the destructive flood guard is E-266's root cause");
ok("4.2 · …and the window is applied by the VIEWPORT instead",
  /toasts\.slice\(0, MAX_VISIBLE\)\.map/.test(toastSrc),
  "slicing in the store makes 'nothing is dropped' a promise; slicing in the view makes it true");
ok("4.3 · a toast is punctuated when PAINTED, not when it arrives",
  /punctuatedRef/.test(toastSrc) && !/haptics\./.test(presentBody!),
  "a buzz for a toast the player cannot see is a signal about nothing (§F5 read backwards)");
ok("4.4 · the haptic ladder still refuses `factual` and still alarms on `danger`",
  (() => {
    const i = toastSrc.indexOf("switch (next.variant)");
    const sw = i < 0 ? "" : toastSrc.slice(i, i + 400);
    return i >= 0 && !/case "factual"/.test(sw) && /case "danger":\s*haptics\.error\(\)/.test(sw);
  })(),
  "§F3 — a warning is `factual` and silent; gold is money EARNED");
ok("4.5 · the seal registers as a result popup, so §F1 stands the toasts down (E-267)",
  /useResultModalPresence\(open\)/.test(stripComments(read(CELEBRATION))),
  "toasts at z-1800 painted over the seal at z-1700 for its whole 7-second dwell");
ok("4.6 · ⛔ and the fix touches NO z-index",
  !/z-\[1[0-9]{3}\]|zIndex=\{1[0-9]{3}\}/.test(
    stripComments(read(CELEBRATION)).replace(/zIndex=\{1700\}/, "")),
  "a failure fired during a CONFIRM dialog must stay readable above it");

/* ═══ §5 · THE MONEY-HONESTY RULE — EXECUTED ═══════════════════════════════════════════ */
console.log("\n§5 · a summary carries a figure only when every entry shares one outcome");

const e = (kind: OutcomeKind, amount: number, stake: number, id = `${kind}${amount}${stake}`): LedgerEntry =>
  ({ id, kind, amount, stake, settledAtMs: NOW, label: "x" });

ok("5.1 · ⭐ a MIXED set states NO figure",
  (() => { const s = summarise([e("WIN", 10_000, 2_000), e("LOSS", 0, 2_000)]);
    return s.figure === null && s.homogeneous === null; })(),
  "'+TZS 8,000' was never paid, never lost, and appears in no ledger row");
ok("5.2 · three losses state the STAKE that went",
  (() => { const s = summarise([e("LOSS", 0, 500, "a"), e("LOSS", 0, 700, "b"), e("LOSS", 0, 300, "c")]);
    return s.homogeneous === "LOSS" && s.figure === 1_500; })());
ok("5.3 · two wins state the PAYOUT that landed",
  (() => { const s = summarise([e("WIN", 8_000, 1_000, "a"), e("WIN", 4_000, 1_000, "b")]);
    return s.homogeneous === "WIN" && s.figure === 12_000; })());
ok("5.4 · two refunds state what came BACK",
  (() => { const s = summarise([e("VOID", 1_000, 1_000, "a"), e("VOID", 2_000, 2_000, "b")]);
    return s.homogeneous === "VOID" && s.figure === 3_000; })());
ok("5.5 · a win beside a refund is still MIXED — 'paid' and 'returned' are different columns",
  summarise([e("WIN", 8_000, 1_000, "a"), e("VOID", 1_000, 1_000, "b")]).figure === null);
ok("5.6 · the empty set states nothing at all",
  (() => { const s = summarise([]); return s.total === 0 && s.figure === null && s.homogeneous === null; })());
ok("5.control · a homogeneous set DOES produce a figure (5.1/5.5 are not vacuous)",
  summarise([e("WIN", 8_000, 1_000, "a")]).figure === 8_000);

/* ═══ §6 · THE RETURN SURFACE ANSWERS NOTHING ══════════════════════════════════════════ */
console.log("\n§6 · §F5 — nothing answers an action the player did not take");

for (const f of [BAR, PRESENCE, LEDGER]) {
  const src = stripComments(read(f));
  const mentions = (src.match(/haptics\s*\./g) ?? []).length;
  const statements = (src.match(/^\s*haptics\s*\.\s*\w+\(\)/gm) ?? []).length;
  ok(`6.1 · ${f.split("/").pop()} fires no haptic (mentions=${mentions}, statements=${statements})`,
    mentions === 0 && statements === 0,
    "a buzz on a render is the defect §F5 was written for");
  ok(`6.2 · ${f.split("/").pop()} — no haptic behind a falsy short-circuit`,
    (src.match(/(?:void\s+0|false|null|undefined|0)\s*&&\s*haptics\s*\./g) ?? []).length === 0,
    "E-57: `void 0 && haptics.x()` keeps the name AND the parens, so naive counts both move");
}
ok("6.3 · the bar is a NoticeBar — it blocks nothing and takes no focus",
  /<NoticeBar/.test(read(BAR)) && !/<Modal/.test(read(BAR)),
  "a modal on arrival interrupts for something the player did not do");

/* 🔴 6.4/6.5 — THE TAP HANDLER. Both of these SHIPPED and were found by comparing two
 * independent implementations of this programme against each other, which is the only reason
 * they surfaced at all: every suite was green over them. */
{
  const barSrc = stripComments(read(BAR));
  const seal = sliceBraces(barSrc, "const openSeal = ()");
  ok("6.4.control · the tap handler's body is locatable", seal != null && (seal?.length ?? 0) > 80);
  ok("6.4 · ⛔ the seal clears ONLY the wins it celebrated — never the whole ledger",
    !!seal && /removeAway\(wins\.map/.test(seal) && !/clearAway\(\)/.test(seal),
    "on a MIXED backlog — a state this bar renders, via awayMixed — clearing everything deleted "
    + "the losses behind a gold total, unnamed. RG requires a loss to state its amount");
  ok("6.5 · ⛔ …and nothing is cleared unless the seal was actually delivered",
    !!seal && /const delivered = dispatchWinCelebration/.test(seal)
      && /if \(!delivered\) return;/.test(seal),
    "with no host mounted it wiped the backlog having shown nothing — E-266's shape on a new path");
}
ok("6.6 · ⛔ the attention window re-seeds when the PLAYER changes, not once per page-load",
  /who !== identity/.test(stripComments(read(PRESENCE)))
    && /userId\?: string \| null/.test(read(PRESENCE)),
  "module state outlives a logout/login soft-nav, so the next person inherited the last one's sitting");

/* ═══ §7 · THE COUNTDOWN TELLS THE TRUTH UNDER REDUCED MOTION ══════════════════════════ */
console.log("\n§7 · E-269 — the calm state withdraws a false claim about time");

const motionSrc = read(MOTION);
ok("7.1 · the countdown is a CLASS, so a stylesheet can reach it",
  /\.toast-countdown\s*\{[^}]*animation:\s*toast-bar/.test(motionSrc)
    && /toast-countdown/.test(toastSrc));
ok("7.2 · …and toast.tsx declares neither the curve nor the duration (§E rule 9)",
  !/animation:\s*`?toast-bar/.test(toastSrc) && !/linear forwards/.test(toastSrc),
  "only motion.css may declare a curve or a duration");
ok("7.3 · both hard clamps get a calm branch, and the rail stays FULL",
  (() => {
    const calm = motionSrc.match(/\.toast-countdown\s*\{\s*animation:\s*none\s*!important;\s*transform:\s*scaleX\(1\)/g) ?? [];
    return calm.length >= 2;
  })(),
  "empty said 'your time is up' under a toast still held for 8 seconds");
ok("7.4 · ⛔ and it is NOT in the throttle tier's infinite-loop list",
  !/\[data-motion="reduced"\][^\n]*toast-countdown/.test(read("src/app/globals.css")),
  "that gate is for `infinite` loops; switching a single-shot off there recreates the defect");

/* ═══ §8 · TRILINGUAL ══════════════════════════════════════════════════════════════════ */
console.log("\n§8 · every new token exists in all three locales and none is the English");

const DICT = read("src/lib/i18n-dict.ts");
for (const key of ["awayTitle", "awayWon", "awayLost", "awayReturned", "awayMixed", "awayView"]) {
  const vals = [...DICT.matchAll(new RegExp(`\\b${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "g"))].map((m) => m[1]);
  ok(`8.1 · ${key} is defined three times`, vals.length === 3, `found ${vals.length}`);
  ok(`8.2 · ${key} is not three copies of the English`, new Set(vals).size >= 2);
}
for (const key of ["awayWon", "awayLost", "awayReturned", "awayMixed"]) {
  const vals = [...DICT.matchAll(new RegExp(`\\b${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "g"))].map((m) => m[1]);
  ok(`8.3 · ${key} keeps its {n} placeholder in every locale`,
    vals.length === 3 && vals.every((v) => v.includes("{n}")),
    "a dropped placeholder prints the brace to the player");
}

/* ═══ §9 · COALESCING — EXECUTED, LIKE §1 AND §5 ═══════════════════════════════════════
 *
 * Ali's ruling ④: *"for toasts, they are grouping under each other… find a way intelligent and
 * professional to compact."* The eligibility rule is a MONEY rule — it decides which refusals
 * may never be collapsed out of sight — so it is asserted by CALLING it, not by grepping
 * `toast.tsx` for the word `danger`. A guard that reads the symbol survives an inverted
 * condition; this one does not.
 */
console.log("\n§9 · a burst coalesces into one — but a refusal never joins a group");

ok("9.1 · ⛔ a `danger` toast is NEVER grouped, whatever key it carries",
  groupKeyFor({ groupKey: "outcome:LOSS", variant: "danger", durationMs: 4500 }) === undefined,
  "'deposit declined' collapsed into '2 results' is the swallowed money-path failure itself");
ok("9.2 · ⛔ a STICKY toast (durationMs 0) is never grouped either",
  groupKeyFor({ groupKey: "outcome:LOSS", variant: "factual", durationMs: 0 }) === undefined,
  "sticky is the shape a refusal takes so it stays until read; merging revokes that");
ok("9.3 · …and a negative duration cannot sneak past the sticky rule",
  groupKeyFor({ groupKey: "outcome:LOSS", variant: "factual", durationMs: -1 }) === undefined);
ok("9.4 · a toast with no key stands alone (grouping is opt-in, never inferred)",
  groupKeyFor({ groupKey: undefined, variant: "factual", durationMs: 4500 }) === undefined);
ok("9.control · an ordinary `factual` result IS groupable (9.1–9.4 are not vacuous)",
  groupKeyFor({ groupKey: "outcome:LOSS", variant: "factual", durationMs: 4500 }) === "outcome:LOSS");
/* ⭐ THE ENUMERATION. Every variant the kit has, against both duration shapes — `CEREMONY`'s
 * equivalent here is "may group", and only the safe cells may say yes. */
{
  const variants = ["default", "success", "warning", "danger", "gold", "factual"];
  const wrong: string[] = [];
  for (const v of variants) for (const d of [0, 4500]) {
    const got = groupKeyFor({ groupKey: "k", variant: v, durationMs: d }) !== undefined;
    const may = v !== "danger" && d > 0;
    if (got !== may) wrong.push(`${v}/dur=${d} → ${got ? "grouped" : "alone"}`);
  }
  ok(`9.5 · ⭐ across all ${variants.length * 2} variant × duration cells, only the safe ones group`,
    wrong.length === 0, wrong.join(" · "));
}
ok("9.6 · the fold sums the group's figure",
  (() => {
    const a = mergeGroup({ id: "t1", count: 1, total: 2_000 }, 3_000);
    return a.count === 2 && a.total === 5_000 && a.id === "t1";
  })());
ok("9.7 · ⛔ a member with NO figure raises the count and leaves the total intact",
  (() => {
    const a = mergeGroup({ id: "t1", count: 1, total: 2_000 }, undefined);
    return a.count === 2 && a.total === 2_000;
  })(),
  "`total + undefined` is NaN, and 'TZS NaN' over real money is arithmetic overruling policy");
ok("9.8 · …and a NaN figure is refused the same way",
  mergeGroup({ id: "t1", count: 1, total: 2_000 }, Number.NaN).total === 2_000);
ok("9.9 · the provider defers to that rule rather than re-deciding it",
  /groupKeyFor\(/.test(toastSrc) && /mergeGroup\(/.test(toastSrc)
    && !/variant\s*!==\s*"danger"/.test(toastSrc),
  "a second copy of the eligibility rule is a second thing to get wrong");

/* ═══ FOOTER ══════════════════════════════════════════════════════════════════════════ */
console.log(`\npresence-class: ${pass} passed, ${fails.length} failed  (of ${pass + fails.length})`);
if (fails.length) {
  console.error("\nThe ceremony has stopped belonging to the moment, or an announcement can be lost:");
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
console.log("presence-class: OK — the seal is for a win the player watched land, and nothing is marked delivered undelivered.");
