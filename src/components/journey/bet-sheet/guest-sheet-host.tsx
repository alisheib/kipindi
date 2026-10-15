"use client";

/**
 * S10 WP4 · THE GUEST SHEET'S HOST — the journey's bet sheet for a reader who is NOT signed in (the Vodacom plan S10,
 * VODACOM-PLAN §3.7; S10-PLAN.md WP4, as its amendments A7, A10, A11 and A12 amend it). AppShell mounts it in the bet
 * sheet's ONE slot for a journey request with no session, and S8's money host (bet-sheet-host.tsx) for a signed-in one —
 * never both: a sign-in swaps them in one commit.
 *
 * ⛔ IT CAN PLACE NOTHING AND MOVE NOTHING. It imports no money action and no Server Action, reads only the PUBLIC half
 *   (`/api/markets/<id>/sheet`, never `me=1`), mints no request key, stamps no owner, and never touches an account's
 *   recovery store. Its one write is the keyless, ownerless selection marker a door leaves (`saveSheetSelection`, the
 *   24-hour bridge Privacy §7 names; A7). `test:guest-sheet` §7–§10 holds all of this, with plants.
 * ⭐ A TAP opens the sheet in place exactly where the money host would — an unmodified primary click on a pick inside a
 *   seed box (`PICK`), same origin, with a bettable seed, on a page that draws journey picks — with S8's moves:
 *   `preventDefault`, the press pop, `?bet=<id>.<side>` pushed, the guest face drawn on the tap frame (`flushSync`).
 * ⭐ THE ADDRESS opens it too — a reload, Back from the auth page, a campaign link's `?side=` — only where the page carries
 *   the question's seed (the public read names no title, Correction 6), at the minimum unless this tab's own door wrote the
 *   stake (`guestOpensFrom`). A page still streaming is waited for, briefly (`SEED_WAIT_MS`); an address whose seed never
 *   comes opens nothing and is left as it is (A11). On a flight that ended a session, nothing opens from the address: the
 *   session-ended notice speaks (Open point 20).
 * ⭐ THE DOORS carry the bet and the codes (`guestCarry`, `doorHrefsFor`). A press writes the marker; Next's own navigation
 *   of this tab then replaces the address with the carried bet (so Back reopens the sheet at that stake) and closes the
 *   sheet WITHOUT touching history — the Link's push follows (A10).
 * ⭐ ITS FIGURES ARE THE PUBLIC HALF'S, refreshed on open, every 10 s while visible and on focus (Open point 19): a 429, a
 *   5xx or a lost connection keeps the figures it has; a 404 or `bettable: false` draws the closed frame.
 */
import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { flushSync } from "react-dom";
import { useT } from "@/lib/i18n";
import { playPressPop } from "@/lib/press-feedback";
import { PENDING_BET_KEY, pendingBetFrom } from "@/lib/journey/pending-bet";
import { saveSheetSelection } from "@/lib/journey/sheet-owned-storage";
import { parseSheetSeed } from "@/lib/journey/sheet-seed";
import { sendFunnel } from "@/lib/journey/funnel-beacon";
import { clockOffset, estimateMoved, sheetEstimate, sheetOpensOn, sheetPreset, withBet, withoutBet, type SheetFrame, type SheetSeed, type SheetSide } from "@/lib/journey/sheet-state";
import { carriedStake, countsSheetOpen, guestCarry, guestFrame, guestOpensFrom } from "@/lib/journey/guest-sheet";
import { doorHrefsFor } from "@/lib/auth-landing";
import { BetSheet } from "./bet-sheet";
import { useExitPhase } from "@/components/ui/modal";

/** A pick the sheet takes over: a pick inside a seed box. `qa:first-load`'s GuestSheetHost row reads this literal (A12). */
const PICK = "[data-sheet] a[data-bet-side]";
/** How long an address waits for its question's seed on a page still streaming (A11). */
export const SEED_WAIT_MS = 5_000;
/** The public half's refresh while a sheet is open and the page is visible (Open point 19). */
export const GUEST_REFRESH_MS = 10_000;

type GuestActive = {
  seed: SheetSeed; side: SheetSide; title: string; stakeText: string; offset: number; serial: number;
  pathname: string; pushed: boolean; dropSide: boolean; estimateUpdated: boolean;
};

const ignore = () => {};
const sameSheet = (a: GuestActive, id: string, side: SheetSide) => a.seed.id === id && a.side === side;

/** The money host's boundary pattern (bet-sheet-host.tsx `SheetBoundary`), the guest host's own: a render failure reports
 *  once and closes the sheet; it cannot take the root layout down. */
class GuestSheetBoundary extends Component<{ children: ReactNode; onFailed: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    try {
      const body = JSON.stringify({ message: error.message.slice(0, 1_000), stack: `${error.stack ?? ""}\n${info.componentStack ?? ""}`.slice(0, 4_000), path: window.location.pathname, digest: null, build: String((globalThis as { NEXT_DEPLOYMENT_ID?: string }).NEXT_DEPLOYMENT_ID ?? "") || null });
      if (typeof navigator.sendBeacon === "function") navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
      else void fetch("/api/client-error", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
    } catch { /* the page stays usable even when reporting fails */ }
    this.props.onFailed();
  }
  render() { return this.state.failed ? null : this.props.children; }
}

export function GuestSheetHost({ sessionEnded = false }: { sessionEnded?: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const { t } = useT();
  const [active, setActive] = useState<GuestActive | null>(null);
  const { present } = useExitPhase(active !== null);
  const lastView = useRef<{ active: GuestActive; frame: SheetFrame } | null>(null);
  const [now, setNow] = useState(0);
  const current = useRef<GuestActive | null>(null);
  const serial = useRef(0);
  const generation = useRef(0);
  const reads = useRef(0);
  const mounted = useRef(true);
  const waiting = useRef<(() => void) | null>(null);
  const ended = useRef(sessionEnded);
  ended.current = sessionEnded;

  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const show = useCallback((value: GuestActive | null) => { current.current = value; if (mounted.current) setActive(value); }, []);
  const stopWaiting = useCallback(() => { waiting.current?.(); waiting.current = null; }, []);
  const stripAddress = useCallback((dropSide: boolean) => {
    if (!mounted.current) return;
    window.history.replaceState(null, "", window.location.pathname + withoutBet(window.location.search, dropSide) + window.location.hash);
  }, []);
  const markerRaw = useCallback((): string | null => {
    try { return window.sessionStorage.getItem(PENDING_BET_KEY); } catch { return null; }
  }, []);

  /** The PUBLIC half only. A 429, a 5xx or a lost connection keeps the figures; a 404 draws the closed frame. */
  const refreshed = useCallback(async () => {
    const before = current.current;
    if (!before) return;
    const seq = ++reads.current;
    let seed: SheetSeed | null = null, gone = false;
    try {
      const response = await fetch(`/api/markets/${encodeURIComponent(before.seed.id)}/sheet`, { cache: "no-store" });
      if (response.status === 404) gone = true;
      else if (response.ok) {
        const parsed = parseSheetSeed({ ...(await response.json()), v: 1 });
        seed = parsed && parsed.id === before.seed.id ? parsed : null;
      }
    } catch { /* a failed read keeps the figures it has */ }
    const after = current.current;
    if (!mounted.current || !after || after.serial !== before.serial || seq !== reads.current) return;
    if (gone) { show({ ...after, seed: { ...after.seed, bettable: false } }); return; }
    if (!seed) return;
    const stake = Number(after.stakeText);
    const moved = estimateMoved({ stake, estimate: sheetEstimate(after.seed, after.side, stake) }, { stake, estimate: sheetEstimate(seed, after.side, stake) });
    show({ ...after, seed, offset: clockOffset(seed.serverNow, Date.now()), estimateUpdated: after.estimateUpdated || moved });
  }, [show]);

  const open = useCallback((seed: SheetSeed, side: SheetSide, title: string, pushed: boolean, dropSide: boolean, origin: string, allowed: number | null) => {
    const stamp = Date.now();
    ++generation.current; stopWaiting();
    const raw = markerRaw();
    const addressBet = pendingBetFrom(window.location.pathname, new URLSearchParams(window.location.search));
    show({ seed, side, title, stakeText: String(sheetPreset(seed, allowed)), offset: clockOffset(seed.serverNow, stamp), serial: ++serial.current,
      pathname: window.location.pathname, pushed, dropSide, estimateUpdated: false });
    setNow(stamp);
    if (countsSheetOpen({ tapped: pushed, markerRaw: raw, bet: addressBet, nowMs: stamp })) sendFunnel("sheet_open", origin);
    void refreshed();
  }, [markerRaw, refreshed, show, stopWaiting]);

  const close = useCallback(() => {
    if (!mounted.current) return;
    const a = current.current;
    if (!a) return;
    show(null); ++generation.current;
    if (a.pushed) window.history.back();
    else stripAddress(a.dropSide);
  }, [show, stripAddress]);

  /** The address's bet, where the page carries its seed (A11: waited for briefly, never stripped when it never comes). */
  const openAddress = useCallback(() => {
    if (ended.current) return;
    const path = window.location.pathname;
    const q = new URLSearchParams(window.location.search);
    const opens = guestOpensFrom(path, q, markerRaw(), Date.now());
    if (!opens) return;
    const shown = current.current;
    if (shown && sameSheet(shown, opens.bet.id, opens.bet.side)) return;
    stopWaiting();
    const token = ++generation.current;
    const origin = q.get("from") === "home" ? "home" : "board";
    const attempt = (): boolean => {
      if (!mounted.current || token !== generation.current || window.location.pathname !== path) return true;
      const box = [...document.querySelectorAll<HTMLElement>("[data-sheet]")].find((e) => parseSheetSeed(e.getAttribute("data-sheet"))?.id === opens.bet.id);
      const seed = box ? parseSheetSeed(box.getAttribute("data-sheet")) : null;
      if (!box || !seed) return false;
      open(seed, opens.bet.side, box.dataset.sheetTitle ?? "", false, opens.dropSide, origin, opens.stake);
      return true;
    };
    if (attempt()) return;
    const watch = new MutationObserver(() => { if (attempt()) stopWaiting(); });
    const timer = window.setTimeout(stopWaiting, SEED_WAIT_MS);
    waiting.current = () => { watch.disconnect(); window.clearTimeout(timer); };
    watch.observe(document.body, { childList: true, subtree: true });
  }, [markerRaw, open, stopWaiting]);

  /** What the open sheet's doors carry at this moment (`guestCarry`): the bet at the frame's stake when it is inside the
   *  bounds, the marker and the address — from the page as it stands. */
  const carryNow = useCallback(() => {
    const a = current.current;
    if (!a) return null;
    const stamp = Date.now();
    const frame = guestFrame({ seed: a.seed, side: a.side, stakeText: a.stakeText, nowMs: stamp, offsetMs: a.offset });
    return guestCarry({ pathname: window.location.pathname, search: window.location.search, seedId: a.seed.id, side: a.side, stake: carriedStake(frame), nowMs: stamp });
  }, []);

  /** A door's press (every press, a new tab's too): the keyless, ownerless selection marker, so the stake comes back. */
  const press = useCallback(() => {
    const carry = carryNow();
    // A refusal (storage off, full, or a legacy envelope it cannot archive) never stops the visitor: the stake returns at
    // the minimum (Open point 7).
    try { if (carry) saveSheetSelection(window.sessionStorage, carry.markerRaw); } catch { /* the door still navigates */ }
  }, [carryNow]);

  /** Next is navigating THIS tab: leave the carried bet in the address (Back reopens the sheet at it) and close the sheet
   *  without touching history — the Link's push follows. */
  const leave = useCallback(() => {
    const carry = carryNow();
    if (!carry || !mounted.current) return;
    window.history.replaceState(null, "", carry.address + window.location.hash);
    ++generation.current; stopWaiting(); show(null);
  }, [carryNow, show, stopWaiting]);

  useEffect(() => {
    mounted.current = true;
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(PICK) : null;
      const box = anchor?.closest<HTMLElement>("[data-sheet]");
      const side = anchor?.dataset.betSide;
      const seed = box && parseSheetSeed(box.getAttribute("data-sheet"));
      if (!anchor || !box || !seed || !seed.bettable || (side !== "YES" && side !== "NO") || anchor.target && anchor.target !== "_self" || !sheetOpensOn(window.location.pathname)) return;
      const href = new URL(anchor.href, window.location.href);
      if (href.origin !== window.location.origin) return;
      event.preventDefault();
      playPressPop(anchor);
      const bet = { kind: "market" as const, id: seed.id, side: side as SheetSide, stake: null };
      window.history.pushState(null, "", window.location.pathname + withBet(window.location.search, bet) + window.location.hash);
      // The capture listener draws the public frame before downstream click work resumes (S8's own reason).
      flushSync(() => open(seed, side, box.dataset.sheetTitle ?? "", true, false, box.dataset.sheetOrigin ?? "card", null));
    };
    const pop = () => {
      const bet = pendingBetFrom(window.location.pathname, new URLSearchParams(window.location.search));
      if (current.current && !bet) { show(null); ++generation.current; stopWaiting(); }
      else openAddress();
    };
    const refresh = () => { if (document.visibilityState === "visible") void refreshed(); };
    let lastRead = Date.now();
    const interval = setInterval(() => {
      const stamp = Date.now();
      if (!current.current) return;
      setNow(stamp);
      if (document.visibilityState === "visible" && stamp - lastRead >= GUEST_REFRESH_MS) { lastRead = stamp; void refreshed(); }
    }, 1_000);
    window.addEventListener("click", click, true);
    window.addEventListener("popstate", pop);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    openAddress();
    return () => {
      mounted.current = false; ++generation.current; stopWaiting(); clearInterval(interval);
      window.removeEventListener("click", click, true); window.removeEventListener("popstate", pop);
      window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh);
    };
  }, [open, openAddress, refreshed, show, stopWaiting]);

  useEffect(() => {
    const a = current.current;
    if (a && a.pathname !== pathname) { show(null); ++generation.current; stopWaiting(); }
    if (sheetOpensOn(pathname)) openAddress();
  }, [pathname, search, openAddress, show, stopWaiting]);

  const frame = active ? guestFrame({ seed: active.seed, side: active.side, stakeText: active.stakeText, nowMs: now, offsetMs: active.offset }) : null;
  if (active && frame) lastView.current = { active, frame };
  // Only a drawing survives the kit's exit beat.
  const view = active && frame ? { active, frame } : present ? lastView.current : null;
  const doors = (() => {
    if (!view) return null;
    const query = search?.toString() ?? "";
    const carry = guestCarry({ pathname: pathname ?? "/", search: query, seedId: view.active.seed.id, side: view.active.side, stake: carriedStake(view.frame), nowMs: now });
    return carry ? doorHrefsFor(carry.next, new URLSearchParams(query)) : null;
  })();

  return view && doors ? <GuestSheetBoundary key={view.active.serial} onFailed={() => { if (current.current?.serial === view.active.serial) { stripAddress(view.active.dropSide); show(null); } }}>
    <BetSheet open={active !== null} seed={view.active.seed} side={view.active.side} title={view.active.title || t.common.temporarilyUnavailable} frame={view.frame}
      stakeText={view.active.stakeText} estimateUpdated={view.active.estimateUpdated}
      onStakeChange={(value) => { const a = current.current; if (a && a.serial === view.active.serial) show({ ...a, stakeText: value, estimateUpdated: false }); }}
      onPlace={ignore} onBetInstead={ignore} onDeposit={ignore}
      onClose={() => { if (current.current?.serial === view.active.serial) close(); }}
      guest={{ signUp: doors.signUp, signIn: doors.signIn, onPress: press, onLeave: leave }} />
  </GuestSheetBoundary> : null;
}
