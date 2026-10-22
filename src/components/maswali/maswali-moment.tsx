"use client";

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * EACH FACT PERFORMS ONCE, ON SCREEN, FOR ITS OWNER (MASWALI-BUILD S5-DESIGN-TICKETS; the R1 tickets critic's M8 and the
 * motion critic's H3 — one fix: §10 §2 "each fact performs once, for its owner, then rests", DESIGN_AUTHORITY §M8a item 5).
 *
 * 🔴 WHAT THE FRAMES SHOWED: the cut (N3) and its reverse, the stamp line's reveal, the closing rule (M6) and the presses
 *    (N2) below the first screen all started on MOUNT — the stub stands ~1,700px down at 360 and at 1280 — and the page then
 *    marked every fact seen, so the "performs once" moment was spent where nobody saw it; the cancel's undo played under
 *    the result dialog.
 *
 * ⭐ THE PLATFORM'S <Reveal> MECHANISM, FOR A MOMENT (`components/layout/reveal.tsx`): an IntersectionObserver that fires
 *    once and is let go, its state RENDERED BY REACT (`data-mln-played`), never an attribute written behind React's back.
 *    `MaswaliMoment` wraps the part a moment plays on; the part keeps its N-block class as the composer chose it (the
 *    server's markup is the moment's markup), and ONE rule in globals.css (`[data-mln-moment]`) holds every such animation
 *    at its first frame inside a moment that has not entered view yet — so a moment never starts where nobody is looking,
 *    and never blinks from its end frame back to its first when it does start. Once `threshold` of the part is in view
 *    (half of the stub, as the critic asked) the moment plays from its first frame.
 * ⚠️ UNLIKE <Reveal>, THE LOW-END `reduced` TIER PLAYS IT: the N-block plays there at full duration (§M8a item 5, §M6 —
 *    a throttle, not a clamp). Under either clamp the N-block's classes are `animation: none` and the end frame IS the
 *    layout: the hold rule is scoped off both clamps, and the part counts as played once it is in view (its end frame is
 *    what the owner saw).
 * ⭐ THE SEEN MARK WAITS FOR THE MOMENTS (`MaswaliMomentsHost`): each moment registers with the page's host, and the host
 *    marks the facts seen — through the newest instant this render holds (L7) — only once every moment of the render has
 *    played. A moment the owner never scrolled to has not performed, so its facts stay unseen and perform next time. A
 *    render with no moment marks at once, as before. A mark is never load-bearing: one that fails records nothing.
 * ⛔ No moment, no wrapper: a part drawn with no moment renders exactly as it did (the composer wraps only what plays).
 *    Without JavaScript the hold rule never matches (`@media (scripting: enabled)`), so each moment plays where it stands.
 */

type Host = { register: (id: string) => void; unregister: (id: string) => void; played: (id: string) => void };
const MomentsHost = createContext<Host | null>(null);

/** The host of a page's moments: it calls `onAllPlayed` once every moment registered under it has played. */
export function MaswaliMomentsHost({ through, onAllPlayed, children }: {
  /** The newest fact this render holds — a change starts a new round of moments. */
  through: string;
  /** Called once per `through`, when every registered moment has played (or at once when none is registered). */
  onAllPlayed: (through: string) => void;
  children: ReactNode;
}) {
  const registered = useRef(new Set<string>());
  const done = useRef(new Set<string>());
  const sent = useRef<string | null>(null);
  const latest = useRef({ through, onAllPlayed });
  latest.current = { through, onAllPlayed };
  const [host] = useState<Host>(() => {
    const settle = () => {
      const { through: at, onAllPlayed: mark } = latest.current;
      if (sent.current === at) return;
      for (const id of registered.current) if (!done.current.has(id)) return;
      sent.current = at;
      mark(at);
    };
    return {
      register: (id) => { registered.current.add(id); },
      unregister: (id) => { registered.current.delete(id); done.current.delete(id); },
      played: (id) => { done.current.add(id); settle(); },
      settle,
    } as Host & { settle: () => void };
  });
  // Children's effects run before this one: by now every moment of this render has registered.
  useEffect(() => { (host as Host & { settle: () => void }).settle(); }, [host, through]);
  return <MomentsHost.Provider value={host}>{children}</MomentsHost.Provider>;
}

let seq = 0;

export function MaswaliMoment({ as: Tag = "div", threshold = 0.5, className, style, children }: {
  as?: "div" | "span";
  /** The share of the part that must be in view before its moment plays (or that much of the viewport, for a tall part). */
  threshold?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const host = useContext(MomentsHost);
  const ref = useRef<HTMLElement>(null);
  const id = useRef("");
  if (id.current === "") id.current = `mln-moment-${++seq}`;
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const me = id.current;
    host?.register(me);
    if (!el) return () => host?.unregister(me);
    let fired = false;
    const play = () => { if (fired) return; fired = true; setPlayed(true); host?.played(me); };
    if (typeof IntersectionObserver === "undefined") { play(); return () => host?.unregister(me); }
    const io = new IntersectionObserver((entries) => {
      const seen = entries.some((e) => e.isIntersecting && (e.intersectionRatio >= threshold - 0.001
        || (e.rootBounds !== null && e.intersectionRect.height >= e.rootBounds.height * threshold)));
      if (seen) { io.disconnect(); play(); }
    }, { threshold: [0, threshold / 2, threshold, 1] });
    io.observe(el);
    return () => { io.disconnect(); host?.unregister(me); };
  }, [host, threshold]);
  return (
    <Tag ref={ref as never} data-mln-moment="" {...(played ? { "data-mln-played": "" } : {})} className={className} style={style}>
      {children}
    </Tag>
  );
}

/**
 * A LIVE FIGURE THAT DIPS AND LANDS WHEN IT MOVES (the motion critic's L2: the ticket's "x of 15 results in" never ticked).
 * The platform's `.m-tick` — never a translate, never a count — keyed on the value, so it plays once per COMMITTED change
 * (`GlyphSwap`'s rule: a render thrown away leaves no trace) and never on the first paint.
 */
export function MaswaliTick({ value, children }: { value: number | string; children: ReactNode }) {
  const initial = useRef(value);
  const changed = useRef(false);
  useEffect(() => { if (value !== initial.current) changed.current = true; }, [value]);
  const tick = changed.current || value !== initial.current;
  return <span key={String(value)} className={cn(tick && "m-tick")}>{children}</span>;
}
