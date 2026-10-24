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
import { noticeBody } from "@/components/ui/empty-state-text";
import { hangCjkOpening } from "@/lib/cjk-marks";
import { formatBreakEnd } from "@/lib/break-end";
import { fill, formatTzs } from "@/lib/utils";
import { sideWord } from "@/lib/side-label";
import { positionPermalinkHref } from "@/lib/position-permalink";
import { stakeShareNotice } from "@/lib/stake-share-notice";
import { HouseLeanWarning } from "@/components/markets/house-lean-warning";
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

/**
 * A sentence of the sheet's vocabulary. `cash` (S8-PLAN A25 item 5): the money values it names are figures DERIVED from
 * the balance, so they are masked whenever the balance is (`<Cash hidden>`), never printed beside a hidden one.
 */
export function SheetSentence({ t, locale, line, nowMs, cash }: { t: Dict; locale: Locale; line: SheetLine; nowMs: number; cash?: { hidden: boolean; vars: readonly string[] } }) {
  const values: Record<string, ReactNode> = {};
  for (const [key, value] of Object.entries(line.vars ?? {})) {
    values[key] = typeof value === "number"
      ? cash && MONEY_VARS.has(key) && cash.vars.includes(key) ? <Cash hidden={cash.hidden} className="amount">{formatTzs(value)}</Cash>
        : <span className="amount">{MONEY_VARS.has(key) ? formatTzs(value) : value}</span>
      : (key === "until" || key === "untilAt") && typeof value === "string" && Number.isFinite(Date.parse(value))
        ? formatBreakEnd(Date.parse(value), nowMs, t.common.monthsShort, locale) : value;
  }
  // F35: keep the minimum amount and its em dash on one line without inserting an invisible layout character into copy.
  const template = sheetTemplate(t, line.key);
  if (line.key === "journey.lowMinNote" && template.includes("{min} — ") && Object.prototype.hasOwnProperty.call(values, "min")) {
    values.min = <span className="whitespace-nowrap">{values.min} —</span>;
    return <>{fillNodes(template.replace("{min} — ", "{min} "), values)}</>;
  }
  // ⭐ A COMMIT'S SEPARATOR TRAVELS WITH ITS AMOUNT (A25 item 10): "Weka dau" / "· TZS 1,000,000" at 320, never
  // "Weka dau ·" / "TZS 1,000,000" — a line that ends on a dot reads as a sentence cut off. Held by an element, never
  // by a character slipped into the words (keep-words.tsx).
  if (template.includes(" · {amount}") && Object.prototype.hasOwnProperty.call(values, "amount")) {
    values.amount = <span className="whitespace-nowrap">· {values.amount}</span>;
    return <>{fillNodes(template.replace(" · {amount}", " {amount}"), values)}</>;
  }
  return <>{fillNodes(template, values)}</>;
}

type Parts = { t: Dict; locale: Locale; seed: SheetSeed; side: SheetSide; frame: SheetFrame; nowMs: number };

/** The figure's type rungs, largest first; the first is `.kp-bsheet__estimate-figure`'s own size. */
const FIGURE_RUNGS = ["--type-h1", "--type-h2", "--type-h3", "--type-h4"] as const;

/** Long real payouts stay whole: fit by the existing type rungs, measured before paint, never by rounding money.
 *  ⭐ MEASURED IN PLACE (A21, 2026-10-14) — the figure's own text through a Range, against its own box, both as drawn: the
 *  sheet's entrance lift scales every box under the panel alike, so the comparison is the layout one. ⛔ Never a probe
 *  appended to <body>: adding and removing a body child restyled the whole sheet, 307 elements, twice inside the tap that
 *  opens it (da19e5a21's trace: ~45 ms of a 265 ms first frame at 4× CPU). The rung is written before the first read, so
 *  a figure that fits its first rung costs no style pass of its own; a smaller rung restyles this one element. */
export function EstimateFigure({ payout }: { payout: number | null }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let active = true;
    const text = document.createRange();
    const fitEstimateFigure = () => {
      if (!active) return;
      text.selectNodeContents(element);
      for (const rung of FIGURE_RUNGS) {
        const fontSize = `var(${rung})`;
        if (element.style.fontSize !== fontSize) element.style.fontSize = fontSize;
        // The figure has no padding or border, so its drawn box is the room its text may fill.
        const room = element.getBoundingClientRect().width;
        if (room === 0) return;
        if (text.getBoundingClientRect().width <= room) break;
      }
    };
    fitEstimateFigure();
    let lastWidth = element.clientWidth;
    const onEstimateResize = () => {
      const width = element.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      fitEstimateFigure();
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onEstimateResize);
    if (element.parentElement) observer?.observe(element.parentElement);
    document.fonts.addEventListener("loadingdone", fitEstimateFigure);
    void document.fonts.ready.then(fitEstimateFigure);
    return () => { active = false; observer?.disconnect(); document.fonts.removeEventListener("loadingdone", fitEstimateFigure); };
  }, [payout]);
  return <p ref={ref} className="kp-bsheet__estimate-figure amount">{payout === null ? "TZS —" : <>≈ {formatTzs(payout)}</>}</p>;
}

export function ChosenSide({ t, side }: Pick<Parts, "t" | "side">) {
  return <Chip variant={side === "YES" ? "yes" : "no"} size="lg" metrics="status" className="kp-bsheet__chosen">{fill(t.journey.sheetChosen, { side: sideWord(t, side, "MARKET") })}</Chip>;
}

export function HolderNote({ t, locale, frame, side, nowMs }: Pick<Parts, "t" | "locale" | "frame" | "side" | "nowMs">) {
  if (frame.holder === "none") return null;
  const held = frame.holder === "other" ? (side === "YES" ? "NO" : "YES") : side;
  const body = frame.holder === "both" ? t.journey.sheetHedgeBothBody : frame.holder === "other" ? t.journey.sheetHedgeBody : t.journey.sheetHoldAddBody;
  // A notice's body through the keep (noticeBody): its last two words — in Chinese its last two ideographs and their
  // stop — never alone on a line ("…上的投" / "注。", tile 019; A25 item 11).
  return <Callout tone="info" role="note" className="kp-bsheet__holder" title={frame.holder === "both" ? undefined : fill(t.journey.sheetHolds, { side: sideWord(t, held, "MARKET") })}>
    <p>{noticeBody(body)}</p>
    {frame.bonusWager && <p className="kp-bsheet__bonus"><SheetSentence t={t} locale={locale} nowMs={nowMs} line={{ key: "journey.sheetBonusWager", vars: { remaining: frame.bonusWager.remaining } }} /></p>}
  </Callout>;
}

export function EstimateBox({ t, seed, side, frame, compact = false, keyboard = false }: Pick<Parts, "t" | "seed" | "side" | "frame"> & { compact?: boolean; keyboard?: boolean }) {
  const estimate = frame.estimate;
  if (!estimate) return null;
  const emptySide = estimate.emptySide === "YES" || estimate.emptySide === "NO" ? estimate.emptySide : side === "YES" ? "NO" : "YES";
  // ⭐ FEE-TAX-2026-10 · a stake-share market's notice (`stake-share-notice.ts`, the one view model every bet screen draws):
  // its own note (the fee on every stake and the winnings tax, both the market's frozen figures), the standing line, and
  // the AMBER below-stake warning — independent of the display switch, because a warning is not an estimate. Null on
  // every older model, so nothing below changes for one of those.
  const ss = stakeShareNotice({ yesPool: seed.yesPool, noPool: seed.noPool, side, stake: frame.breaks === null ? frame.stake : null, rates: seed.rates });
  const note = ss
    ? (ss.feePct !== null && ss.taxPct !== null
      ? fillNodes(compact ? t.journey.ssEstimateNoteCompact : t.journey.ssEstimateNote, { fee: <span className="amount">{ss.feePct}</span>, tax: <span className="amount">{ss.taxPct}</span> })
      : null)
    : seed.feePct === null ? null : fillNodes(compact ? t.journey.estimateNoteCompact : t.journey.estimateNote, { pct: <span className="amount">{seed.feePct}</span> });
  // The warning with its figures in the full box; in the compact one (the low frames, the keyboard up) its title alone,
  // so the line that must be read before the bet survives where the note does not.
  const warning = ss?.below ? <HouseLeanWarning level="below" stakeShare below={compact ? null : { side: sideWord(t, side, "MARKET"), ...ss.below }} /> : null;
  const priced = estimate.payout !== null;
  // ⭐ COMPACT PRINTS A FIGURE OR NOTHING (A22 item 1's "or nothing", taken in A25): the low frames and the keyboard's frame
  // drew the whole unpriced box here — the sliver under the stake with the keyboard up (tiles 002–022) and the height that
  // pushed the low frame's second option under its footer (034–041). With the keyboard up the line drops its note too.
  // (A below-stake warning is the one thing it still draws without a figure: never a bet placed past it unsaid.)
  if (compact && !priced) return warning;
  if (compact) return <div className="kp-bsheet__compact" data-testid="journey-sheet-estimate-compact">
    <p>{fillNodes(t.journey.estimateCompact, { amount: <span className="amount">{formatTzs(estimate.payout!)}</span> })}<span className="kp-bsheet__compact-mult amount">{fill(t.journey.multOnly, { mult: estimate.multText ?? "—" })}</span></p>
    {note && !keyboard && <p className="kp-bsheet__note">{note}</p>}
    {warning}
  </div>;
  return <div className="kp-bsheet__estimate" data-estimate-state={estimate.state}>
    {estimate.state === "emptyPool" ? <>
      <p className="kp-bsheet__estimate-label">{t.market.noBetsYet}</p><p>{t.journey.sheetEmptyPoolBody}</p><p className="kp-bsheet__note">{t.journey.sheetRefundRule}</p>
    </> : estimate.state === "oneSidedRefund" ? <>
      <p className="kp-bsheet__estimate-label">{t.market.oneSideOnly}</p><p>{hangCjkOpening(fill(t.market.oneSidedNote, { side: sideWord(t, emptySide, "MARKET") }))}</p>
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
    {warning}
    {/* The standing line, on every state of a stake-share market's box: a winning bet can return less than its stake. */}
    {ss && <p className="kp-bsheet__note" data-ss-standing="">{t.market.ssStanding}</p>}
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
    <Link className="kp-bsheet__ticket-link" href={positionPermalinkHref(receipt.positionId)} onClick={onClose}>{t.journey.tabTickets}<I.chevronRight s={16} edge="end" text="body-400" /></Link>
  </>;
}
