"use client";

/** S8 WP6 · display only. Every figure is supplied by sheetFrame/estimateFor; no wallet arithmetic lives here. */
import Link from "next/link";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Cash } from "@/components/ui/cash";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { fillNodes } from "@/lib/fill-nodes";
import { formatBreakEnd } from "@/lib/break-end";
import { fill, formatTzs } from "@/lib/utils";
import { sideWord } from "@/lib/side-label";
import { positionPermalinkHref } from "@/lib/position-permalink";
import type { Dict, Locale } from "@/lib/i18n";
import type { SheetFrame, SheetLine, SheetSeed, SheetSide } from "@/lib/journey/sheet-state";

const MONEY_VARS = new Set(["amount", "have", "short", "min", "left", "max", "remaining"]);

/** Keys are the pure core's vocabulary; an unknown key remains visible instead of becoming an invented refusal. */
export function sheetTemplate(t: Dict, key: string): string {
  let value: unknown = t;
  for (const part of key.split(".")) value = value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined;
  return typeof value === "string" ? value : key;
}

export function sheetLineText(t: Dict, locale: Locale, line: SheetLine, nowMs: number): string {
  const values: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(line.vars ?? {})) {
    values[key] = typeof value === "number" && MONEY_VARS.has(key) ? formatTzs(value)
      : (key === "until" || key === "untilAt") && typeof value === "string" && Number.isFinite(Date.parse(value))
        ? formatBreakEnd(Date.parse(value), nowMs, t.common.monthsShort, locale) : value;
  }
  return fill(sheetTemplate(t, line.key), values);
}

export function SheetSentence({ t, locale, line, nowMs }: { t: Dict; locale: Locale; line: SheetLine; nowMs: number }) {
  const values: Record<string, ReactNode> = {};
  for (const [key, value] of Object.entries(line.vars ?? {})) {
    values[key] = typeof value === "number"
      ? <span className="amount">{MONEY_VARS.has(key) ? formatTzs(value) : value}</span>
      : (key === "until" || key === "untilAt") && typeof value === "string" && Number.isFinite(Date.parse(value))
        ? formatBreakEnd(Date.parse(value), nowMs, t.common.monthsShort, locale) : value;
  }
  return <>{fillNodes(sheetTemplate(t, line.key), values)}</>;
}

type Parts = { t: Dict; locale: Locale; seed: SheetSeed; side: SheetSide; frame: SheetFrame; nowMs: number };

/** Long real payouts stay whole: fit by the existing type rungs, measured before paint, never by rounding money. */
export function EstimateFigure({ payout }: { payout: number | null }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let active = true;
    const fitEstimateFigure = () => {
      if (!active) return;
      for (const rung of ["--type-h1", "--type-h2", "--type-h3"]) {
        element.style.fontSize = `var(${rung})`;
        if (element.scrollWidth <= element.clientWidth) break;
      }
    };
    fitEstimateFigure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fitEstimateFigure);
    if (element.parentElement) observer?.observe(element.parentElement);
    void document.fonts.ready.then(fitEstimateFigure);
    return () => { active = false; observer?.disconnect(); };
  }, [payout]);
  return <p ref={ref} className="kp-bsheet__estimate-figure amount">{payout === null ? "TZS —" : <>≈ {formatTzs(payout)}</>}</p>;
}

export function ChosenSide({ t, side }: Pick<Parts, "t" | "side">) {
  return <Chip variant={side === "YES" ? "yes" : "no"} className="kp-bsheet__chosen">{fill(t.journey.sheetChosen, { side: sideWord(t, side, "MARKET") })}</Chip>;
}

export function HolderNote({ t, locale, frame, side, nowMs }: Pick<Parts, "t" | "locale" | "frame" | "side" | "nowMs">) {
  if (frame.holder === "none") return null;
  const held = frame.holder === "other" ? (side === "YES" ? "NO" : "YES") : side;
  const body = frame.holder === "both" ? t.journey.sheetHedgeBothBody : frame.holder === "other" ? t.journey.sheetHedgeBody : t.journey.sheetHoldAddBody;
  return <Callout tone="info" role="note" className="kp-bsheet__holder" title={frame.holder === "both" ? undefined : fill(t.journey.sheetHolds, { side: sideWord(t, held, "MARKET") })}>
    <p>{body}</p>
    {frame.bonusWager && <p className="kp-bsheet__bonus"><SheetSentence t={t} locale={locale} nowMs={nowMs} line={{ key: "journey.sheetBonusWager", vars: { remaining: frame.bonusWager.remaining } }} /></p>}
  </Callout>;
}

export function EstimateBox({ t, seed, side, frame, compact = false }: Pick<Parts, "t" | "seed" | "side" | "frame"> & { compact?: boolean }) {
  const estimate = frame.estimate;
  if (!estimate) return null;
  const emptySide = estimate.emptySide === "YES" || estimate.emptySide === "NO" ? estimate.emptySide : side === "YES" ? "NO" : "YES";
  const note = seed.feePct === null ? null : fillNodes(compact ? t.journey.estimateNoteCompact : t.journey.estimateNote, { pct: <span className="amount">{seed.feePct}</span> });
  const priced = estimate.payout !== null;
  if (compact && priced) return <div className="kp-bsheet__compact" data-testid="journey-sheet-estimate-compact">
    <p>{fillNodes(t.journey.estimateCompact, { amount: <span className="amount">{formatTzs(estimate.payout!)}</span> })}<span className="kp-bsheet__compact-mult amount">{fill(t.journey.multOnly, { mult: estimate.multText ?? "—" })}</span></p>
    {note && <p className="kp-bsheet__note">{note}</p>}
  </div>;
  return <div className="kp-bsheet__estimate" data-estimate-state={estimate.state}>
    {estimate.state === "emptyPool" ? <>
      <p className="kp-bsheet__estimate-label">{t.market.noBetsYet}</p><p>{t.journey.sheetEmptyPoolBody}</p><p className="kp-bsheet__note">{t.journey.sheetRefundRule}</p>
    </> : estimate.state === "oneSidedRefund" ? <>
      <p className="kp-bsheet__estimate-label">{t.market.oneSideOnly}</p><p>{fill(t.market.oneSidedNote, { side: sideWord(t, emptySide, "MARKET") })}</p>
    </> : estimate.state === "hidden" ? <>
      <p className="kp-bsheet__estimate-label">{t.journey.ticketPayout}</p><p>{t.journey.sheetLegacyBody}</p>
      {seed.rates?.feeModel === "capped-commission" && seed.feePct !== null && <p className="kp-bsheet__note">{fillNodes(t.journey.sheetLegacyFee, { pct: <span className="amount">{seed.feePct}</span> })}</p>}
    </> : <>
      <p className="kp-bsheet__estimate-label">{t.journey.estimateLead}</p>
      <EstimateFigure payout={estimate.payout} />
      {(priced || estimate.overCap) && <p className="kp-bsheet__mult">{fillNodes(estimate.overCap ? t.journey.estimatePillOver : t.journey.estimatePill, { mult: <span className="amount">{estimate.multText ?? "—"}</span>, cap: <span className="amount">{estimate.multText ?? "—"}</span> })}</p>}
      {estimate.state === "fillsEmptySide" && <p className="kp-bsheet__note">{fill(t.journey.sheetFirstOnSide, { side: sideWord(t, side, "MARKET") })}</p>}
      {estimate.lean === "thin" && <p className="kp-bsheet__note">{t.market.crowdedWarning}</p>}
      {note && <p className="kp-bsheet__note">{note}</p>}
    </>}
  </div>;
}

export function BalanceRow({ t, frame }: Pick<Parts, "t" | "frame">) {
  return <div className="kp-bsheet__balance"><span>{t.journey.balanceRow}</span>
    {frame.balance.kind === "known" ? <Cash className="amount">{formatTzs(frame.balance.spendable)}</Cash>
      : <span className="kp-bsheet__balance-unknown"><span className="amount" aria-hidden>—</span><span>{frame.balance.kind === "loading" ? t.common.loading : t.common.temporarilyUnavailable}</span></span>}
  </div>;
}

export function BetInstead({ t, seed, side, stake, estimate, onClick }: Pick<Parts, "t" | "seed" | "side"> & { stake: number; estimate: SheetFrame["estimate"]; onClick: () => void }) {
  return <Button type="button" variant="ghost" size="xl" fullWidth className="kp-bsheet__instead" data-testid="journey-sheet-bet-instead" onClick={onClick}>
    <span>{fillNodes(t.journey.lowBetInstead, { amount: <span className="amount">{formatTzs(stake)}</span> })}</span>
    {estimate?.payout !== null && estimate?.payout !== undefined && <span className="kp-bsheet__instead-estimate">{fillNodes(t.journey.lowBetInsteadEstimate, { amount: <span className="amount">{formatTzs(estimate.payout)}</span>, mult: <span className="amount">{estimate.multText ?? "—"}</span> })}</span>}
  </Button>;
}

export function Receipt({ t, locale, seed, side, title, frame, nowMs, onClose }: Parts & { title: string; onClose: () => void }) {
  const receipt = frame.receipt;
  if (!receipt) return null;
  const stake = receipt.quote?.stake ?? frame.stake;
  return <>
    <p className="kp-bsheet__question">{title}</p>
    <dl className="kp-bsheet__receipt-rows">
      <div><dt>{t.common.ticket}</dt><dd className="amount kp-bsheet__ticket-id">{receipt.positionId}</dd></div>
      <div><dt>{t.common.stake}</dt><dd className="amount">{stake === null ? "—" : formatTzs(stake)}</dd></div>
      <div><dt>{t.journey.ticketPayout}</dt><dd>{t.journey.ticketPayoutAtResult}</dd></div>
    </dl>
    <p className="kp-bsheet__good-luck">{t.common.goodLuck}</p>
    <Link className="kp-bsheet__ticket-link" href={positionPermalinkHref(receipt.positionId)} onClick={onClose}>{t.journey.tabTickets}<I.chevronRight s={16} edge="end" /></Link>
  </>;
}
