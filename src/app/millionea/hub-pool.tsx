"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MaswaliPoolHead, MaswaliPoolLedger, poolLedgerRows, type PoolView } from "@/components/maswali/maswali-pool-figure";
import type { MaswaliPoolFigure as PoolFigure } from "@/lib/server/maswali-player";
import { useT } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n-dict";
import { pctNum } from "@/lib/utils";
import { poolViewOf } from "./millionea-view";

/** The window event `useEventStream` raises for a `maswali:pool` frame (`use-event-stream.ts`'s EVENT_MAP). */
const POOL_EVENT = "50pick:sse:maswali-pool";

/** A frame as the bus carries it: the derived figure, or anything else (never trusted until it is checked). ⛔ Only THIS
 *  week's, of THIS week's line: `/api/events` forwards a frame only to its audience (a DRIVE week's never to the public,
 *  `millionea-preview.ts → forwardMillioneaPool`), and the block holds itself to the same line besides. */
function isFrameFor(weekId: string, visibility: PoolFigure["visibility"], x: unknown): x is PoolFigure {
  if (!x || typeof x !== "object") return false;
  const f = x as Partial<PoolFigure>;
  return f.weekId === weekId && f.visibility === visibility && typeof f.jackpot === "number" && Number.isFinite(f.jackpot)
    && typeof f.sales === "number" && Number.isFinite(f.sales) && typeof f.feeRate === "number";
}

/** Each ledger row's value as the reader reads it — what a frame is compared by, so a row "changed" exactly when the
 *  words or the figure the reader sees changed (R1-motion L1). */
export function ledgerValues(t: Dict, view: PoolView, pct: number): Map<string, string> {
  return new Map(poolLedgerRows(t, view, pct).map((r) => [r.key, typeof r.value === "string" ? r.value : String(r.value)]));
}

/** The rows whose value a frame changed (`before` → `after`); a row that appears or leaves is not a change of a value. */
export function movedRows(before: ReadonlyMap<string, string>, after: ReadonlyMap<string, string>): Set<string> {
  return new Set([...after].filter(([k, v]) => before.has(k) && before.get(k) !== v).map(([k]) => k));
}

type Live = { view: PoolView; pct: number; tick: number; moved: { n: number; keys: ReadonlySet<string> } };
const LivePool = createContext<Live | null>(null);

/**
 * THE HUB'S POOL, LIVE (MASWALI-BUILD S5 composition; MASWALI-PLAN §7b S5 item 6, MB-31, MB-97) — the figure the server
 * derived for this render, then each `maswali:pool` frame the bus forwards for THIS week (`maswali-pool-feed.ts`:
 * coalesced, derived from the ledger, never stored). A frame for another week — the one being graded, a drive week — is
 * not this block's and is ignored, so a frame's visibility is never this block's to judge.
 * ⭐ S5-DESIGN-HUB H1/H2 · ONE LIVE FIGURE, TWO PLACES: the head (`HubPoolHead`) and the ledger (`HubPoolLedger`) stand
 * apart in the hub's grid — the buy block between them on a phone, the head pinned with the door from 1024 — and read
 * the one figure this island holds, so they can never disagree. It draws no element of its own.
 * ⭐ THE FIGURE TICKS ONCE WHEN IT MOVES (`.m-tick`, §M8a item 7): only on a real change of the larger-of-two, never on
 * mount and never counting (no count-up anywhere); and each ledger value a frame changed ticks with it (R1-motion L1).
 * ⛔ No gold here: an unearned surface (`maswali-pool-figure.tsx`).
 */
export function HubPoolLive({ weekId, initial, price, voiding = false, children }: {
  weekId: string;
  initial: PoolFigure;
  /** The week's frozen ticket price: the block's ticket count is its sales at that price. */
  price: number;
  /** The week's void is already certain (the page's `weekVoidCertain`): the block draws the "voiding" view. */
  voiding?: boolean;
  children: ReactNode;
}) {
  const { t } = useT();
  const [fig, setFig] = useState(initial);
  const [tick, setTick] = useState(0);
  const [moved, setMoved] = useState<Live["moved"]>({ n: 0, keys: new Set() });
  const last = useRef(initial);
  // A server render (the poller's) hands a fresher figure: take it, at rest.
  useEffect(() => {
    setFig(initial);
    last.current = initial;
  }, [initial]);
  useEffect(() => {
    const onFrame = (e: Event) => {
      const frame = (e as CustomEvent).detail;
      if (!isFrameFor(weekId, initial.visibility, frame)) return;
      const before = last.current;
      last.current = frame;
      setFig(frame);
      if (frame.jackpot !== before.jackpot) setTick((n) => n + 1);
      const keys = movedRows(ledgerValues(t, poolViewOf(before, price, voiding), pctNum(before.feeRate)), ledgerValues(t, poolViewOf(frame, price, voiding), pctNum(frame.feeRate)));
      if (keys.size > 0) setMoved((m) => ({ n: m.n + 1, keys }));
    };
    window.addEventListener(POOL_EVENT, onFrame);
    return () => window.removeEventListener(POOL_EVENT, onFrame);
  }, [weekId, initial.visibility, price, voiding, t]);
  return (
    <LivePool.Provider value={{ view: poolViewOf(fig, price, voiding), pct: pctNum(fig.feeRate), tick, moved }}>
      {children}
    </LivePool.Provider>
  );
}

/** The head of the live pool: the label, the figure, its rule — re-keyed on each move of the figure, so `.m-tick` plays
 *  once per change and never on the first paint. `final`: the week is Millionea's final one (H3). */
export function HubPoolHead({ final, labelId, className }: { final?: boolean; labelId?: string; className?: string }) {
  const live = useContext(LivePool);
  const { t, locale } = useT();
  if (!live) return null;
  return <MaswaliPoolHead key={live.tick} t={t} locale={locale} view={live.view} pct={live.pct} final={final} tick={live.tick > 0} labelId={labelId} className={className} />;
}

/** The ledger of the live pool. M7 — when last week rolled over and this reader has not seen it, the carried figure
 *  travels once from the rollover notice's figure (`carryFrom`, the seen state's call), and only on the first paint. */
export function HubPoolLedger({ carryFrom, carryPlay, className }: { carryFrom?: string; carryPlay?: boolean; className?: string }) {
  const live = useContext(LivePool);
  const { t, locale } = useT();
  if (!live) return null;
  return (
    <MaswaliPoolLedger
      t={t}
      locale={locale}
      view={live.view}
      pct={live.pct}
      carry={carryFrom ? { from: carryFrom, play: !!carryPlay && live.tick === 0 && live.moved.n === 0 } : undefined}
      ticked={live.moved}
      className={className}
    />
  );
}
