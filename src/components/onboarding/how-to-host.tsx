"use client";

/**
 * HOW TO PLAY'S HOST — the sheet that opens by itself, once per browser, for a journey reader (the Vodacom plan S11 WP4;
 * VODACOM-PLAN §3.8 "Auto-open"; `S11-PLAN.md` WP4 and Open points 3-11).
 *
 * ⭐ WHERE IT LIVES. AppShell mounts it in the journey's own slot, beside the flag (`{journeyShown && …}`), from the shell's
 * lazy module (`LazyHowToHost`), in a Suspense boundary of its own because it reads the address (`useSearchParams`), as
 * BetSheetHost does. A classic request renders that slot as the one `false` it always did, so a classic reader is served
 * what they were and never downloads this code. It draws nothing until it opens: the kit Modal portals only while open.
 * ⭐ WHAT IT DOES, per landing (a new path, or `?howto=1` asked on the page):
 *   · it arms ONE timer, `HOWTO_DELAY_MS` (700 ms, the first-visit primer's beat) after the landing, on one of the four
 *     routes only; a route change cancels it, and a landing that is declined is skipped, never retried on the same page
 *     (Open point 8);
 *   · when it fires it reads the facts as they are THEN — the address, the seen key, an open dialog, the automation test and
 *     its opt-in — and asks the one rule, `howToDecision` (`how-to-open.ts`, where the order of the rules is written);
 *   · on "deep" it takes `howto` out of the address with `history.replaceState`, every other parameter kept, so Back and a
 *     reload never open it again; on "auto" it leaves the address alone;
 *   · it opens its own sheet. The How-to card on the home keeps its own instance for a tap, and the two never open together
 *     (each sees the other as an open dialog, Open point 4).
 * ⭐ LEAVING. Every exit of the sheet writes the seen key (the sheet's `close`). A route change while it is open closes it,
 * and that counts as an exit too, written here through the same helper (Open point 10). The render tests the route rule as
 * the effect does — the four routes, HIDE_ON and SUPPRESS_ON (`howToRoute`) — so a sheet open on one landing can never stay
 * up on another: the stacking contract's 8.1 lesson (`test:stacking` 8.6).
 * ⛔ IT WRITES NOTHING OF ITS OWN: no storage call here — the seen key goes through `markSeen` (`primer-keys.ts`), and the
 * address through `history.replaceState`. `test:howto` §2 holds that.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { HowToPlaySheet } from "./how-to-play-sheet";
import { isModalDialogOpen } from "@/lib/modal-open";
import { openLayers } from "@/lib/modal-stack";
import { automated, HOWTO_SEEN_KEY, markSeen, primerForced, seenOrUnreadable } from "@/lib/onboarding/primer-keys";
import { HOWTO_DELAY_MS, HOWTO_PARAM, howToDecision, howToRoute, withoutHowTo } from "@/lib/onboarding/how-to-open";

/** `signedIn` and `onBreak` are AppShell's own reads (the session, and `promoSuppressed` from the limits row in hand). */
export function HowToHost({ signedIn, onBreak }: { signedIn: boolean; onBreak: boolean }) {
  const pathname = usePathname() ?? "/";
  const search = useSearchParams();
  const { open, close } = useHowToLanding(pathname, search?.get(HOWTO_PARAM) === "1", onBreak);
  // ③ THE RENDER ASKS THE ROUTE RULE TOO (the effect cannot take down a sheet that is already open).
  if (!howToRoute(pathname)) return null;
  return <HowToPlaySheet open={open} onClose={close} signedIn={signedIn} />;
}

/* The host's name for React's tools — and the one string of this module a minifier keeps, which `qa:first-load` and
   `qa:chunks-prod` find its chunk by (the marker table's HowToHost row: never in a classic first load). */
HowToHost.displayName = "JourneyShell.HowToHost";

/**
 * THE HOST'S LANDINGS — apart from the address hooks, so `test:howto` runs this very function as React would (its hooks
 * on `scripts/lib/hooks-host.mts`, StrictMode's double run included, on a fake clock), never a copy of it.
 * `pathname` is the page's path; `deepAsked` is `?howto=1` in the address; `onBreak` is AppShell's `promoSuppressed`.
 * Returns whether the sheet is open on THIS page, and the opener's close (the sheet writes the seen key before calling it).
 */
export function useHowToLanding(pathname: string, deepAsked: boolean, onBreak: boolean): { open: boolean; close: () => void } {
  /** The path the sheet was opened on, or null while it is shut. */
  const [openOn, setOpenOn] = useState<string | null>(null);
  /** The landing the effect last saw: a new path, or the deep link asked on the page, is a new landing. */
  const seenLanding = useRef<{ path: string; deep: boolean } | null>(null);
  /** The break as AppShell last said it, read when the timer fires (a refresh may change it meanwhile). */
  const breakNow = useRef(onBreak);
  useEffect(() => {
    breakNow.current = onBreak;
  }, [onBreak]);

  // ① ONE DECISION PER LANDING, 700 ms in. Keyed on the path and on the deep link alone: a chip or a search on the same page
  // changes neither, so it is not a new landing. ⚠️ No "already decided" flag survives a re-run on purpose — React's
  // development StrictMode runs a new effect twice (mount, clean up, mount), and a flag set by the first run would stop the
  // second from arming the timer the first one's cleanup cleared.
  useEffect(() => {
    const was = seenLanding.current;
    seenLanding.current = { path: pathname, deep: deepAsked };
    if (!howToRoute(pathname)) return;
    // The deep link dropping out of the address on the same page is this host's own replaceState after it opened — not a
    // landing, and never a second decision.
    if (was !== null && was.path === pathname && was.deep && !deepAsked) return;
    const timer = window.setTimeout(() => {
      const decided = howToDecision({
        pathname: window.location.pathname,
        search: window.location.search,
        seen: seenOrUnreadable(HOWTO_SEEN_KEY),
        onBreak: breakNow.current,
        dialogOpen: isModalDialogOpen() || openLayers().length > 0,
        automated: automated(navigator),
        forced: primerForced(),
      });
      if (decided.open === null) return;
      if (decided.open === "deep") {
        window.history.replaceState(null, "", withoutHowTo(window.location.pathname, window.location.search, window.location.hash));
      }
      setOpenOn(window.location.pathname);
    }, HOWTO_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname, deepAsked]);

  // ② A ROUTE CHANGE WHILE IT IS OPEN CLOSES IT — and counts as an exit (Open point 10).
  useEffect(() => {
    if (openOn === null || openOn === pathname) return;
    markSeen(HOWTO_SEEN_KEY);
    setOpenOn(null);
  }, [pathname, openOn]);

  const close = useCallback(() => setOpenOn(null), []);
  return { open: openOn === pathname, close };
}
