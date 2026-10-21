"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * N1 KUBEBA — THE CARRY (MASWALI-BUILD S5; DESIGN_AUTHORITY §M8a item 1, Ali's yes to O-1; motion.css's N-block).
 *
 * A reserve's socket travels ONCE from the annex into the voided main it stands in for, and a closed week's carried
 * figure travels once to the new week's "carried in" line (M7). This wraps the DESTINATION, which renders at rest — its
 * end frame IS the layout — and, when told to play, starts it where `from` (an element id) stands: one measurement
 * before the run, none during it (MASWALI-PLAN §10 §2 point 5), bound to `--carry-dx` / `--carry-dy` / `--carry-s`.
 * The wrapper moves, never the glyph's own drawing.
 *
 * ⛔ IT PLAYS ONLY WHEN THE CALLER SAYS SO. "Each fact performs once, for its owner, then rests": the composer decides
 * from the seen state (`lastViewedAt`), so a poll or a revisit renders the end frame. Under either clamp (the OS
 * preference, the in-app switch and the minimal tier) nothing is bound and nothing moves; the class's own calm branch in
 * motion.css says the same for a run already started. `will-change` is set for the run only and cleared at its end.
 *
 * ⭐ S5-DESIGN-REGISTER (2026-10-21, Ali's 10/10 pass; the motion critic's M5 and H6), for every caller:
 *   · THE TOKEN AT ITS TRUE SCALE. `--carry-s` is the ratio of the two boxes' HEIGHTS: a token's size is its glyph's (or
 *     its line's) height, and a width counts what stands beside it — the annex column measured 47px against a 24px socket,
 *     so the token started at twice its size. The seal line names the annex GLYPH box as the origin, so a reserve's 18px
 *     socket flies into a main's 24px one from 0.75.
 *   · A RUN COUNTER (`run`): a caller replays the carry by counting up, never by remounting what it wraps (How to play's
 *     example remounted its whole line, which blanked for a frame). Each count re-measures and re-runs; a run cut short
 *     by the next rests first.
 *   · BOTH ENDS IN VIEW (the motion critic's H6): the carry plays only when its origin and its destination both lie
 *     wholly inside the viewport at the measurement — a carry that starts 2,000px off screen is not seen, and its end frame
 *     is the layout anyway.
 *   · THE ORIGIN IS VACATED DURING THE RUN: the token has left it, so its own mark (the annex's "↪4") is hidden from the
 *     run's start and settles in (`.g-settle`) when the token lands — never shown before the token has gone.
 *   · `onEnd`: called once the token has landed — or at once when nothing plays (a clamp, an end out of view, an origin
 *     missing) — so a caller says "ended" only when it is true.
 */
function motionClamped(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("kp-reduce-motion") ||
    document.documentElement.getAttribute("data-motion") === "minimal"
  );
}

/** A box in viewport px (the DOMRect fields the geometry reads). */
export type CarryBox = { left: number; top: number; width: number; height: number };

/**
 * ⭐ THE CARRY'S ONE MEASUREMENT, PURE (`test:maswali-design-register` drives it on synthetic boxes): where the token
 * starts relative to its destination, and at what scale — or null, and nothing plays, when either box is empty or not
 * wholly inside the viewport (H6).
 */
export function carryGeometry(origin: CarryBox, dest: CarryBox, viewport: { width: number; height: number }): { dx: number; dy: number; s: number } | null {
  if (!(origin.width > 0 && origin.height > 0 && dest.width > 0 && dest.height > 0)) return null;
  const inView = (b: CarryBox) => b.left >= 0 && b.top >= 0 && b.left + b.width <= viewport.width && b.top + b.height <= viewport.height;
  if (!inView(origin) || !inView(dest)) return null;
  return {
    dx: origin.left + origin.width / 2 - (dest.left + dest.width / 2),
    dy: origin.top + origin.height / 2 - (dest.top + dest.height / 2),
    s: origin.height / dest.height,
  };
}

/** The class that vacates the origin while the token is in flight (globals.css, beside the N-block's own classes). */
const VACATED = "kp-mln-carry-vacated";

export function MaswaliCarry({ from, play, run = 0, index = 0, onEnd, className, children }: {
  /** The id of the element the token leaves from (the annex socket's glyph box, last week's carried figure). */
  from: string;
  /** Run the carry now. Omitted or false, the wrapper is the end frame and nothing is measured. */
  play?: boolean;
  /** The caller's run counter: a new count replays the carry (re-measured), without remounting anything. */
  run?: number;
  /** Stagger step; the class caps it at four steps (`min(i, 3)`). */
  index?: number;
  /** Called once the token has landed — or at once when nothing plays. */
  onEnd?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!play || !el) return;
    // A run cut short by this one rests first, so the measurement below reads the destination at rest.
    el.classList.remove("maswali-carry");
    const origin = document.getElementById(from);
    const g = origin && !motionClamped()
      ? carryGeometry(origin.getBoundingClientRect(), el.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight })
      : null;
    if (!origin || !g) {
      endRef.current?.();
      return;
    }
    el.style.setProperty("--carry-dx", `${g.dx}px`);
    el.style.setProperty("--carry-dy", `${g.dy}px`);
    el.style.setProperty("--carry-s", String(g.s));
    el.style.setProperty("--i", String(index));
    el.style.willChange = "translate, scale";
    origin.classList.remove("g-settle");
    origin.classList.add(VACATED);
    void el.offsetWidth; // a replay restarts the keyframes rather than continuing the last run
    el.classList.add("maswali-carry");
    let ended = false;
    const rest = (landed: boolean) => {
      if (ended) return;
      ended = true;
      el.classList.remove("maswali-carry");
      el.style.willChange = "";
      origin.classList.remove(VACATED);
      if (landed) {
        // The origin's own mark settles in as the token lands (`.g-settle`, the platform's arrival; clamped to its end).
        void origin.offsetWidth;
        origin.classList.add("g-settle");
        endRef.current?.();
      }
    };
    // Only the carry's own end rests it: a glyph swap inside the wrapper ends its own animation too, and bubbles.
    const onAnim = (e: AnimationEvent) => { if (e.target === el && e.animationName === "maswali-carry") rest(true); };
    el.addEventListener("animationend", onAnim);
    el.addEventListener("animationcancel", onAnim);
    return () => {
      el.removeEventListener("animationend", onAnim);
      el.removeEventListener("animationcancel", onAnim);
      rest(false);
    };
  }, [from, play, index, run]);
  return <span ref={ref} className={cn("inline-flex", className)}>{children}</span>;
}
