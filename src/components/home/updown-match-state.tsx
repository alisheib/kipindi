"use client";

/**
 * THE MATCH'S WRAPPER — the round's state, and its one live read (landing v3, R5 · spec updown-band-v2
 * §4.2, §8, and ruling R5(a)).
 *
 * It owns three things for the whole band, so no descendant computes them twice:
 *
 * 1. THE TENSE, THE LOCK AND THE DECIDING INSTANT, as `data-aged` / `data-closed` / `data-decided` on this
 *    element — the CSS swaps the verdict to past tense, the picks for padlocked sides, and (once the deciding
 *    price's instant has passed) the rule to "decided" and the clock row to "awaiting result". ⛔ NOT `:has()`: a browser without it
 *    would keep a present-tense "Juu inaongoza" for ever, which is stale-as-live. It re-renders only when
 *    one of those three flags flips (≤ 3 renders after mount), on the page's ONE shared second, in the same
 *    frame as the digits (`closed` is the digits' own test: `secondsUntil(betsClose) === 0`). The server
 *    renders `data-aged` already when the round is aged at render.
 *
 * 2. THE ANCHOR. `useReplayAnchor` is taken ONCE here and handed to the digits and the playhead through
 *    context: three independent first-seen lookups would disagree by the hydration gap, and the later two
 *    would no longer match the server's markup.
 *
 * 3. ⭐ R5(a) — THE CONFIRMED PRICE REFRESHES EVERY 60 SECONDS WHILE THE TAB IS VISIBLE (Ali, 2026-09-27,
 *    answered as recommended; a ruling under L12 / WP15 / law 42, which otherwise allow per-second work
 *    only in countdowns). Without it an open tab turns grey ("Juu iliongoza") after about 7.5 minutes.
 *    ⛔ No new server code: it reads the PUBLIC terminal feed `GET /api/updown/history?asset=…&range=15M`
 *    (10-second shared cache, ETag), whose `livePrice` + `sourceQuotedAt` are the asset's newest
 *    CONFIRMED read, and folds it in through `mergeConfirmedRead` (`@/lib/updown-match`) — the same round
 *    type, the same stale rule, the target comparison pinned equal to settlement's.
 *    ⛔ A failed or refused fetch changes nothing: the band keeps its dated verdict, which ages honestly.
 *    ⛔ Hidden tab: no timer at all; on return it reads at once if a minute has passed. It stops at the
 *    deciding instant — past it the round page, not the band, tells the result.
 *
 * Focus never falls to <body>: if a pick has focus when betting closes, focus moves to the Watch link that
 * takes the digits' place in the clock row.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { secondsUntil, useServerNowGated } from "@/lib/use-shared-second";
import { useReplayAnchor } from "@/lib/use-replay-anchor";
import { matchAgedAtMs, mergeConfirmedRead, type UpdownBandRound } from "@/lib/updown-match";

/** How often the band re-reads the asset's newest confirmed price while the tab is visible (R5(a)). */
export const MATCH_REFRESH_MS = 60_000;

type MatchState = { round: UpdownBandRound; anchorMs: number };
const MatchContext = createContext<MatchState | null>(null);

/** The band's live round and its one anchor. Only the match's own leaves call this. */
export function useMatch(): MatchState {
  const v = useContext(MatchContext);
  if (!v) throw new Error("useMatch() outside <UpdownMatchState>");
  return v;
}

export function UpdownMatchState({ className, round: initial, children }: {
  className: string;
  round: UpdownBandRound;
  children: ReactNode;
}) {
  const [round, setRound] = useState(initial);
  const anchor = useReplayAnchor(initial.serverNowMs);
  const agedAtMs = matchAgedAtMs(round);
  // Awaiting a price has no tense to lose.
  const canAge = round.reads != null && round.openPrice != null && round.upTarget != null && round.downTarget != null;
  const flags = (n: number) =>
    `${canAge && agedAtMs != null && n >= agedAtMs ? 1 : 0}${secondsUntil(round.betsCloseAtMs, n) === 0 ? 1 : 0}${n >= round.closesAtMs ? 1 : 0}`;
  const now = useServerNowGated(anchor, flags);
  const n = now ?? anchor;                       // SSR and first hydration: anchor === serverNowMs ⇒ identical markup
  const aged = canAge && agedAtMs != null && n >= agedAtMs;
  const closed = secondsUntil(round.betsCloseAtMs, n) === 0;   // the SAME test as the digits hitting 00
  const decided = n >= round.closesAtMs;                        // the deciding price's instant has passed

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!closed) return;
    const a = document.activeElement;
    if (a instanceof HTMLElement && a.classList.contains("kp-udbug__pick") && ref.current?.contains(a)) {
      ref.current.querySelector<HTMLElement>(".kp-udclock__watch")?.focus();
    }
  }, [closed]);

  // ── R5(a) · the 60-second confirmed-price refresh ───────────────────────────────────────────────
  const { assetKey, closesAtMs, serverNowMs } = initial;
  useEffect(() => {
    if (typeof document === "undefined") return;
    // The server-anchored clock (E-72), captured once — never the device's own wall clock.
    const offset = anchor - Date.now();
    const serverNow = () => Date.now() + offset;
    let lastReadAt = serverNowMs;               // the server render IS the newest read this tab holds
    let timer: ReturnType<typeof setTimeout> | null = null;
    let live = true;
    const ctrl = new AbortController();
    const arm = () => {
      if (timer != null) { clearTimeout(timer); timer = null; }
      if (!live || document.visibilityState !== "visible" || serverNow() >= closesAtMs) return;
      timer = setTimeout(pull, Math.max(0, lastReadAt + MATCH_REFRESH_MS - serverNow()));
    };
    const pull = async () => {
      timer = null;
      lastReadAt = serverNow();
      try {
        const res = await fetch(`/api/updown/history?asset=${encodeURIComponent(assetKey)}&range=15M`, { signal: ctrl.signal });
        if (res.ok) {
          const feed: { livePrice?: unknown; sourceQuotedAt?: unknown } = await res.json();
          if (live) setRound((r) => mergeConfirmedRead(r, feed.livePrice, feed.sourceQuotedAt) ?? r);
        }
      } catch { /* a failed read changes nothing — the dated verdict ages on its own */ }
      arm();
    };
    document.addEventListener("visibilitychange", arm);
    arm();
    return () => {
      live = false;
      ctrl.abort();
      if (timer != null) clearTimeout(timer);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [anchor, assetKey, closesAtMs, serverNowMs]);

  const value = useMemo(() => ({ round, anchorMs: anchor }), [round, anchor]);
  return (
    <MatchContext.Provider value={value}>
      <div ref={ref} className={className} data-aged={aged || undefined} data-closed={closed || undefined}
        data-decided={decided || undefined}>
        {children}
      </div>
    </MatchContext.Provider>
  );
}
