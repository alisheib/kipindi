"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MaswaliPoolHead, type PoolView } from "@/components/maswali/maswali-pool-figure";
import { MaswaliLedger, millioneaLedgerRows, type MillioneaLedgerInput, type MillioneaLedgerRow } from "@/components/maswali/maswali-ledger";
import { MaswaliCarry } from "@/components/maswali/maswali-carry";
import { weekNumberOf } from "@/components/maswali/maswali-format";
import type { MaswaliPoolFigure as PoolFigure } from "@/lib/server/maswali-player";
import { useT } from "@/lib/i18n";
import { cn, pctNum } from "@/lib/utils";
import { poolViewOf } from "./millionea-view";
import { registerWeekHref } from "./millionea-parts";
import { HUB_LEDGER } from "./hub-frame";

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
 * ⭐ THE LIVE POOL ON THE ONE MILLIONEA LEDGER (`maswali-ledger.tsx`, the REGISTER lane's shared builder; the lead's ruling
 * of 2026-10-21): the derived figure as that builder's `live` input — or `voiding` once the week's void is certain — so the
 * hub's rows say every figure in the words the register, How to play and the win ledger say it (MR-26's one wording). The
 * ticket count is the sales at the week's one frozen price (MR-11); each carry links its week's register page (M10) — a
 * carry still waiting on its week too, since the register draws a public week from the moment it opens (REGISTER's H2).
 * ⛔ Only on the PUBLIC line: a DRIVE week's chain is private and the public register has no page for it (the register's
 * own `links: false`), so a staff drive's carry names its week and opens nothing — never a door to a 404.
 */
export function ledgerInputOf(fig: PoolFigure, price: number, voiding: boolean): MillioneaLedgerInput {
  const pending = fig.carryPendingCode !== null;
  const pageOf = (code: string | null) => (code && fig.visibility === "PUBLIC" ? registerWeekHref(code) : null);
  const carryIn = pending
    ? { amount: null, week: weekNumberOf(fig.carryPendingCode as string), href: pageOf(fig.carryPendingCode) }
    : (fig.carryIn ?? 0) > 0
      ? { amount: fig.carryIn, week: fig.carryFromCode ? weekNumberOf(fig.carryFromCode) : null, href: pageOf(fig.carryFromCode) }
      : null;
  return {
    kind: voiding ? "voiding" : "live",
    price,
    tickets: price > 0 ? Math.round(fig.sales / price) : 0,
    sales: fig.sales,
    carryIn,
    floor: fig.floor,
    topUp: 0,
    jackpot: voiding ? null : fig.jackpot,
    jackpotAtLeast: pending,
    feePct: pctNum(fig.feeRate),
    fee: null, levies: null, winners: 0, toWinners: null, share: null, paid: null, remainder: null,
    carriedForward: null, refunds: null, sunset: null,
  };
}

/** Each row's figures as the reader reads them — what a frame is compared by, so a row "changed" exactly when a figure it
 *  prints changed (R1-motion L1): the floor's emphasis may move, its figure never does. */
export function rowFigures(f: MillioneaLedgerInput): Map<string, string> {
  const inTotal = (f.carryIn?.amount ?? 0) + f.sales;
  return new Map([
    ["in", String(f.carryIn?.amount ?? "pending")],
    ["sales", `${f.sales}|${f.tickets}`],
    ["pool", `${inTotal}|${f.carryIn?.amount === null}`],
    ["floor", String(f.floor)],
    ["jackpot", `${f.jackpot}|${!!f.jackpotAtLeast}`],
    ["fee", String(f.feePct)],
  ]);
}

/** The rows whose figures a frame changed (`before` → `after`); a row that appears or leaves is not a change of a value. */
export function movedRows(before: ReadonlyMap<string, string>, after: ReadonlyMap<string, string>): Set<string> {
  return new Set([...after].filter(([k, v]) => before.has(k) && before.get(k) !== v).map(([k]) => k));
}

type Live = { view: PoolView; input: MillioneaLedgerInput; pct: number; tick: number; moved: { n: number; keys: ReadonlySet<string> } };
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
 * mount and never counting (no count-up anywhere); and each ledger figure a frame changed ticks with it (R1-motion L1).
 * ⛔ No gold here: an unearned surface (`maswali-pool-figure.tsx`, `maswali-ledger.tsx`).
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
      const keys = movedRows(rowFigures(ledgerInputOf(before, price, voiding)), rowFigures(ledgerInputOf(frame, price, voiding)));
      if (keys.size > 0) setMoved((m) => ({ n: m.n + 1, keys }));
    };
    window.addEventListener(POOL_EVENT, onFrame);
    return () => window.removeEventListener(POOL_EVENT, onFrame);
  }, [weekId, initial.visibility, price, voiding]);
  return (
    <LivePool.Provider value={{ view: poolViewOf(fig, price, voiding), input: ledgerInputOf(fig, price, voiding), pct: pctNum(fig.feeRate), tick, moved }}>
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

/**
 * The ledger of the live pool, on the one Millionea ledger: its rows, each figure re-keyed on the frame that moved it so
 * `.m-tick` dips and lands it once (motion L1). M7 — when last week rolled over and this reader has not seen it, the
 * carried figure travels once from the rollover notice's own figure (`carryFrom`, R1-hub M10 / R1-motion H6), on the
 * first paint only, and only with both ends in view (`MaswaliCarry`'s rule).
 * ⭐ S5-R2-HUB · THE CARRY THIS ISLAND WAS FIRST HANDED IS KEPT, AND PLAYS ONCE (R1-motion H6): the hub as `HubNotices`
 * keeps its notices. A render can come while the token flies — a server action that re-signs a returning player's session
 * cookie re-renders the route (`session.ts`: at most every five minutes; the rollover's own seen mark is one), as do the
 * poller's refresh and a pool frame — and a render made after the seen mark no longer carries the rollover, so the ledger
 * dropped its carry and `MaswaliCarry` rested the flight half-way (no settle: the figure snapped home). So the island
 * holds the carry it mounted with, and once the token has landed (or nothing played: an end out of view, a clamp) it is
 * spent, so a row re-keyed by a frame later draws the end frame and never flies again (`qa:maswali-hub-states`: a render
 * while a stretched flight is in the air).
 * ⭐ L15 · BEING VOIDED, the refund sentence names its amount and stands alone — no figure (H1: nothing is refunded yet)
 * and no dash beside it: the one ledger's own row since REGISTER's c851bc760 (`test:maswali-hub` 4.1 holds it here).
 */
export function HubPoolLedger({ carryFrom, carryPlay, className }: { carryFrom?: string; carryPlay?: boolean; className?: string }) {
  const live = useContext(LivePool);
  const { t, locale } = useT();
  // The first paint's carry (the island mounts before any frame or tick), kept for the island's life.
  const [carry, setCarry] = useState<{ from: string; play: boolean } | null>(() => (carryFrom ? { from: carryFrom, play: !!carryPlay } : null));
  const spent = useCallback(() => setCarry((c) => (c?.play ? { ...c, play: false } : c)), []);
  if (!live) return null;
  return (
    <div className={cn(HUB_LEDGER, className)} data-testid="millionea-hub-ledger">
      <MaswaliLedger rows={dressLedgerRows(millioneaLedgerRows(t, locale, live.input), live.input, live.moved, carry, spent)} />
    </div>
  );
}

/**
 * The hub's dress on the shared rows — pure, so a suite renders it: each figure a frame moved re-keyed on that frame and
 * ticked (`.m-tick`, motion L1), and the carried-in figure wrapped in the carry when one plays from the rollover notice
 * (M7). Every row keeps its key, label and figure as the builder made them.
 * ⭐ S5-R2-HUB 9 · THE CARRY'S DESTINATION IS A BOX OF THE ROW'S LINE (`inline-block`; the drive's H6 red at sw 1920×1440,
 * heavy-c5 and on GitHub's runner): the frame sets every ledger figure's line height to 0, so a numeral never grows its
 * line (`hub-frame.ts` NUMERALS, S5-R2-HUB 3) — and `MaswaliCarry`'s own wrapper, an inline flex box around that one
 * figure, was 0px tall, which the carry's one measurement refuses as an empty box: it never played (the drive recorded
 * its destination at [1371, 679, 80, 0]). An inline block takes its line box from the row's own strut, so it is the
 * line's height while the figure inside keeps the frame's rule; nothing grows.
 */
export function dressLedgerRows(
  rows: readonly MillioneaLedgerRow[], input: MillioneaLedgerInput, moved: { n: number; keys: ReadonlySet<string> },
  carry: { from: string; play: boolean } | null,
  /** Called once the carry has landed, or at once when nothing plays (`MaswaliCarry`'s `onEnd`): the flight is spent. */
  onCarryEnd?: () => void,
): MillioneaLedgerRow[] {
  return rows.map((r) => {
    const ticks = moved.n > 0 && moved.keys.has(r.key);
    let value: ReactNode = r.value;
    if (r.key === "in" && carry && typeof input.carryIn?.amount === "number") value = <MaswaliCarry from={carry.from} play={carry.play} onEnd={onCarryEnd} className="inline-block">{value}</MaswaliCarry>;
    return { ...r, value: <span key={ticks ? `${r.key}:${moved.n}` : r.key} className={ticks ? "m-tick" : undefined} data-row={r.key}>{value}</span> };
  });
}
