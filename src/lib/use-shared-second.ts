"use client";

/**
 * ⭐ ONE SECOND-HAND FOR THE WHOLE PAGE.
 *
 * 🔴 WHAT THIS REPLACES, and why it is a device problem rather than a tidiness one. Every
 * clock in Up & Down used to own a private `setInterval(…, 1000)`. A single board card ran
 * **four** of them — `useServerNow` for the phase, `useCountdown` for the betting/result
 * digits, a second `useCountdown` for the handover digits, and a third `useServerNow` inside
 * `use-quick-bet` — so a board of eight cards armed **32 unaligned timers**, each waking the
 * main thread on its own sub-second phase. On the low-end Android this product is built for,
 * that is 32 separate wake-ups a second, 32 chances to miss a frame, and 32 sub-second offsets
 * at which two cards flip the same digit at visibly different moments.
 *
 * ⛔ THIS IS A SCHEDULER, NOT A CLOCK. It broadcasts *when* to recompute and never *what* the
 * answer is: every subscriber is handed the raw `Date.now()` of the broadcast and applies its
 * OWN server offset to it. That is the whole reason it is safe to share — the countdown family
 * is "stale-proof by construction" precisely because each tick DERIVES the remainder from a
 * server-anchored instant instead of decrementing a local counter, and consolidating the timer
 * does not touch that derivation. A drifting clock on a betting cutoff is a money defect; a
 * shared wake-up is not a clock at all.
 *
 * ⚠️ THE ONE THING THAT CHANGES FOR A PLAYER, stated plainly: cards used to flip their seconds
 * at whatever sub-second phase each happened to mount on, and now they flip together. The
 * VALUES are identical — they always came from the absolute clock — and `useCountdown`'s own
 * header already calls two countdowns drifting apart "reads as broken".
 *
 * ⛔ `recomputeOnReveal` IS OPT-IN, and deliberately not the default. A phase clock has to
 * recompute the instant a hidden tab comes back (E-166 — Chrome throttles a background interval
 * to about once a minute, and the phase machinery would otherwise sit on a stale instant), so
 * `useServerNowGated` asks for it. `useCountdown` never had that behaviour, and handing it the
 * same recovery for free would change WHEN a player sees a fresh digit after switching tabs.
 * That is a behaviour change, so it is not smuggled in as a performance win.
 *
 * ⚠️ `useServerNow` KEEPS ITS OWN `visibilitychange` LISTENER rather than joining the reveal set,
 * and that is not an oversight: `red:updown-handover` mutates exactly that statement to prove
 * the recovery is real, and a shared broadcast behind it would keep the clock recovering after
 * the mutation — a RED that cannot fail. One listener per surviving `useServerNow` call site is
 * the price of a guard that still works; the INTERVAL, which is the actual cost, is shared.
 */

import { useEffect, useRef, useState } from "react";

type Tick = (rawNowMs: number) => void;

/** Everyone who wants the once-a-second wake-up. */
const ticking = new Set<Tick>();
/** The subset that also wants an immediate recompute when a hidden tab is revealed. */
const onReveal = new Set<Tick>();
let timer: ReturnType<typeof setInterval> | null = null;

function fire(set: Set<Tick>) {
  if (set.size === 0) return;
  // ⚠️ ONE `Date.now()` FOR THE WHOLE BROADCAST. Reading it per subscriber would let two cards
  // land either side of a second boundary within the same tick and render different digits.
  const raw = Date.now();
  // A copy, so a subscriber that unsubscribes from inside its own callback cannot make the
  // iterator skip a sibling.
  for (const fn of Array.from(set)) fn(raw);
}

function handleReveal() {
  if (document.visibilityState === "visible") fire(onReveal);
}

function ensureRunning() {
  if (timer != null) return;
  timer = setInterval(() => fire(ticking), 1000);
  document.addEventListener("visibilitychange", handleReveal);
}

function stopWhenIdle() {
  if (timer == null || ticking.size > 0) return;
  clearInterval(timer);
  timer = null;
  document.removeEventListener("visibilitychange", handleReveal);
}

/**
 * Subscribe to the shared second. Returns the unsubscribe.
 *
 * ⚠️ THE STOP IS DEFERRED BY ONE TASK, ON PURPOSE. `serverNowMs` is re-rendered by the board's
 * 20-second poller, so every clock effect on the page tears down and re-arms in the same commit.
 * Stopping synchronously would clear and re-create the interval on every poll — churn, and a
 * needlessly reset phase. A macrotask later the new subscribers have arrived and there is
 * nothing to stop.
 */
export function subscribeSecond(fn: Tick, opts?: { recomputeOnReveal?: boolean }): () => void {
  const reveal = opts?.recomputeOnReveal === true;
  ticking.add(fn);
  if (reveal) onReveal.add(fn);
  ensureRunning();
  let live = true;
  return () => {
    if (!live) return;
    live = false;
    ticking.delete(fn);
    if (reveal) onReveal.delete(fn);
    setTimeout(stopWhenIdle, 0);
  };
}

/**
 * Whole seconds from `nowMs` until `targetMs`, floored at zero.
 *
 * ⛔ THE ONE DEFINITION, shared by the digits and by every phase test that asks "is this clock
 * still running". `running` used to be read off `useCountdown`'s clamped return
 * (`secondsLeft > 0`, i.e. `now <= target − 1000`), and a phase gate that instead asked
 * `now < target` would disagree with the digits for a full second at every boundary. Same
 * function, same answer, both sides.
 */
export function secondsUntil(targetMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((targetMs - nowMs) / 1000));
}

/**
 * ⭐ THE SERVER-ANCHORED INSTANT, TICKING — but the component only re-renders when the answer
 * to a question it names actually CHANGES.
 *
 * 🔴 THE DEFECT THIS EXISTS FOR. `useServerNow` returns a new number every second, so every
 * component holding one re-rendered every second whether or not anything it draws had changed.
 * On the board card that meant the ENTIRE card — header, price, pool bar, the two target tiles,
 * the action row, the footer — was re-created once a second per card, purely so that a phase
 * boolean could be re-derived. Almost every one of those seconds produced byte-identical output.
 *
 * ⭐ So the caller supplies `keyOf`: a cheap string naming everything it derives from the clock
 * (phase, locked, bettable, running, the handover branch…). The instant is kept in a ref and
 * updated every tick with no render at all; a render is requested ONLY when the key moves. An
 * open round therefore costs **zero** renders a second, and the boundary it is waiting for still
 * lands on the very tick it happens.
 *
 * ⛔ IT RETURNS THE **FRESH** INSTANT, read from the ref, not the one that produced the last
 * key. A render can also be caused by a prop arriving from the poller, and that render must
 * derive its phase from the clock as it is now — which is exactly what the old `useServerNow`
 * did (its state was likewise at most one tick old). Reading the ref in render is the same
 * narrowly-scoped exception `useHoldAnchor` already documents: the value is written by the
 * broadcast that triggers the render, so the render sees the instant its key was computed from.
 *
 * ⛔ `null` UNTIL THE FIRST CLIENT TICK, exactly like `useServerNow` and `useCountdown`. The
 * server render must not contain a clock reading or hydration mismatches.
 */
export function useServerNowGated(
  serverNowMs: number | undefined,
  keyOf: (nowMs: number) => string,
): number | null {
  const nowRef = useRef<number | null>(null);
  const keyRef = useRef<string | null>(null);
  // The LATEST closure, so a key computed on the ticker always sees this render's props.
  const keyOfRef = useRef(keyOf);
  keyOfRef.current = keyOf;
  const [, bump] = useState(0);

  useEffect(() => {
    // The offset is captured ONCE against the instant the server rendered — never re-measured
    // per tick, which would make the digits jitter by the network latency (E-72).
    const offset = serverNowMs != null ? serverNowMs - Date.now() : 0;
    const apply = (raw: number) => {
      const now = raw + offset;
      nowRef.current = now;
      const next = keyOfRef.current(now);
      if (next === keyRef.current) return;
      keyRef.current = next;
      bump((n) => n + 1);
    };
    apply(Date.now());
    return subscribeSecond(apply, { recomputeOnReveal: true });
  }, [serverNowMs]);

  return nowRef.current;
}
