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
 */
function motionClamped(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("kp-reduce-motion") ||
    document.documentElement.getAttribute("data-motion") === "minimal"
  );
}

export function MaswaliCarry({ from, play, index = 0, className, children }: {
  /** The id of the element the token leaves from (the annex socket, last week's carried figure). */
  from: string;
  /** Run the carry now. Omitted or false, the wrapper is the end frame and nothing is measured. */
  play?: boolean;
  /** Stagger step; the class caps it at four steps (`min(i, 3)`). */
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!play || !el || motionClamped()) return;
    const origin = document.getElementById(from);
    if (!origin) return;
    const a = origin.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    if (!a.width || !b.width) return;
    el.style.setProperty("--carry-dx", `${a.left + a.width / 2 - (b.left + b.width / 2)}px`);
    el.style.setProperty("--carry-dy", `${a.top + a.height / 2 - (b.top + b.height / 2)}px`);
    el.style.setProperty("--carry-s", String(a.width / b.width));
    el.style.setProperty("--i", String(index));
    el.style.willChange = "translate, scale";
    el.classList.add("maswali-carry");
    const rest = () => {
      el.classList.remove("maswali-carry");
      el.style.willChange = "";
    };
    // Only the carry's own end rests it: a glyph swap inside the wrapper ends its own animation too, and bubbles.
    const onEnd = (e: AnimationEvent) => { if (e.target === el && e.animationName === "maswali-carry") rest(); };
    el.addEventListener("animationend", onEnd);
    el.addEventListener("animationcancel", onEnd);
    return () => {
      el.removeEventListener("animationend", onEnd);
      el.removeEventListener("animationcancel", onEnd);
      rest();
    };
  }, [from, play, index]);
  return <span ref={ref} className={cn("inline-flex", className)}>{children}</span>;
}
