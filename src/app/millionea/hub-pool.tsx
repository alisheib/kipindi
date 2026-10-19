"use client";

import { useEffect, useRef, useState } from "react";
import { MaswaliPoolFigure } from "@/components/maswali/maswali-pool-figure";
import type { MaswaliPoolFigure as PoolFigure } from "@/lib/server/maswali-player";
import { useT } from "@/lib/i18n";
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

/**
 * THE HUB'S POOL BLOCK, LIVE (MASWALI-BUILD S5 composition; MASWALI-PLAN §7b S5 item 6, MB-31, MB-97) — the figure the
 * server derived for this render, then each `maswali:pool` frame the bus forwards for THIS week (`maswali-pool-feed.ts`:
 * coalesced, derived from the ledger, never stored). A frame for another week — the one being graded, a drive week — is
 * not this block's and is ignored, so a frame's visibility is never this block's to judge.
 * ⭐ THE FIGURE TICKS ONCE WHEN IT MOVES (`.m-tick`, §M8a item 7): only on a real change of the larger-of-two, never on
 * mount and never counting (no count-up anywhere). ⭐ M7 — when last week rolled over and this reader has not seen it,
 * the carried figure travels once from last week's row (`carry`, the seen state's call).
 * ⛔ No gold here: an unearned surface (`maswali-pool-figure.tsx`).
 */
export function HubPool({ weekId, initial, price, opensAt, voiding = false, carryFrom, carryPlay }: {
  weekId: string;
  initial: PoolFigure;
  /** The week's frozen ticket price: the block's ticket count is its sales at that price. */
  price: number;
  opensAt: string;
  /** The week's void is already certain (the page's `weekVoidCertain`): the block draws the "voiding" view. */
  voiding?: boolean;
  /** The id of last week's carried figure (the M7 origin), when it is on the page. */
  carryFrom?: string;
  carryPlay?: boolean;
}) {
  const { t } = useT();
  const [fig, setFig] = useState(initial);
  const [tick, setTick] = useState(0);
  const last = useRef(initial.jackpot);
  // A server render (the poller's) hands a fresher figure: take it, at rest.
  useEffect(() => {
    setFig(initial);
    last.current = initial.jackpot;
  }, [initial]);
  useEffect(() => {
    const onFrame = (e: Event) => {
      const frame = (e as CustomEvent).detail;
      if (!isFrameFor(weekId, initial.visibility, frame)) return;
      setFig(frame);
      if (frame.jackpot !== last.current) setTick((n) => n + 1);
      last.current = frame.jackpot;
    };
    window.addEventListener(POOL_EVENT, onFrame);
    return () => window.removeEventListener(POOL_EVENT, onFrame);
  }, [weekId, initial.visibility]);
  return (
    <div data-testid="millionea-hub-pool">
      {/* Re-keyed on each move, so `.m-tick` plays once per change and never on the first paint. */}
      <MaswaliPoolFigure
        key={tick}
        t={t}
        view={poolViewOf(fig, price, opensAt, voiding)}
        pct={pctNum(fig.feeRate)}
        tick={tick > 0}
        carry={carryFrom ? { from: carryFrom, play: !!carryPlay && tick === 0 } : undefined}
      />
    </div>
  );
}
