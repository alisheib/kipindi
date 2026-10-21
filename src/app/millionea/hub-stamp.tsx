"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { MaswaliOutcomeStamp } from "@/components/maswali/maswali-outcome-stamp";
import { useT } from "@/lib/i18n";
import type { MaswaliOutcome } from "@/lib/maswali-score";

/** The slots whose result arrived in this commit, each with its step in the cascade (slot order). */
const Pressed = createContext<ReadonlyMap<number, number>>(new Map());
const NONE: ReadonlyMap<number, number> = new Map();

/**
 * The slots whose outcome ARRIVED between the outcomes a mount last committed (`before`) and this render's: each slot now
 * holding a result it did not hold — a first seal, or a re-seal — with its step in the cascade, in slot order. Nothing on
 * a first render (`before` null: an arrival on the page, never a press). Pure, so its rule is read by a suite.
 */
export function arrivalsOf(
  before: Readonly<Record<number, MaswaliOutcome | null>> | null,
  outcomes: Readonly<Record<number, MaswaliOutcome | null>>,
): ReadonlyMap<number, number> {
  if (!before) return NONE;
  const arrived = Object.keys(outcomes).map(Number)
    .filter((slot) => outcomes[slot] != null && outcomes[slot] !== before[slot])
    .sort((a, b) => a - b);
  return arrived.length === 0 ? NONE : new Map(arrived.map((slot, i) => [slot, i] as const));
}

/**
 * ⭐ N2 ON THE HUB — THE PRESS ON A RESULT THAT ARRIVES WHILE THE READER LOOKS (R1-hub M11, R1-motion L2; DESIGN_AUTHORITY
 * §M8a item 2; MASWALI-PLAN §10 §2 SM3: "ticket or hub"). The hub's fifteen stamps landed silently: a result the poller
 * brought in simply appeared. This holds the outcomes the page has SEEN and, on a render whose outcomes differ, names the
 * slots that just received one — in slot order, each its step in the cascade (the class caps it at four, `min(i, 3)`).
 * ⭐ GLYPHSWAP'S RULE (`glyph-swap.tsx`): only a COMMITTED change counts — the seen outcomes move on after commit, in an
 * effect, and are only read during render, so a render React throws away leaves no trace — and the first render is an
 * arrival, never a press: opening the hub presses nothing (§10 §2: "each fact performs once, for its owner, then rests").
 * Everything it renders is the server's; it draws no element of its own.
 */
export function HubPressGroup({ outcomes, children }: {
  /** Each slot's sealed outcome as this render has it (null while awaited). */
  outcomes: Readonly<Record<number, MaswaliOutcome | null>>;
  children: ReactNode;
}) {
  const seen = useRef<Readonly<Record<number, MaswaliOutcome | null>> | null>(null);
  const before = seen.current;
  const pressed = useMemo(() => arrivalsOf(before, outcomes), [outcomes, before]);
  useEffect(() => { seen.current = outcomes; }, [outcomes]);
  return <Pressed.Provider value={pressed}>{children}</Pressed.Provider>;
}

/**
 * One question's result stamp on the hub: the world's fact (`MaswaliOutcomeStamp`, the same stamp for every outcome —
 * never a verdict), pressed once when its result arrived in this commit AND its row stood on the reader's screen (an
 * IntersectionObserver keeps that answer; a result that lands below the fold simply rests). Under either motion clamp the
 * press is `animation: none` and the stamp is its end frame (motion.css's calm branch).
 * The holder is always drawn, so a result that arrives finds it already measured.
 */
export function HubOutcomeStamp({ slot, outcome }: { slot: number; outcome: MaswaliOutcome | null }) {
  const { t } = useT();
  const holder = useRef<HTMLSpanElement>(null);
  const inView = useRef(false);
  useEffect(() => {
    const el = holder.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => { inView.current = entries.some((e) => e.isIntersecting); });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const step = useContext(Pressed).get(slot);
  const press = step !== undefined && inView.current;
  return (
    <span ref={holder} className="inline-flex" data-pressed={press ? "" : undefined}>
      {outcome !== null && <MaswaliOutcomeStamp t={t} outcome={outcome} press={press} index={press ? step : 0} />}
    </span>
  );
}
