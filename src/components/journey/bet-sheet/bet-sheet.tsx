"use client";

/** S8 WP6 · the complete flagged stake surface; WP7 owns opening, requests, retries and the address. */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { Modal, CloseX } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";
import { Cash } from "@/components/ui/cash";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { useT, type Dict, type Locale } from "@/lib/i18n";
import { fill, formatNumber, formatTzs } from "@/lib/utils";
import { fillNodes } from "@/lib/fill-nodes";
import { sideWord } from "@/lib/side-label";
import { DWELL_BET_RECEIPT_MS } from "@/lib/feedback-timing";
import { sheetEstimate, type SheetFrame, type SheetLine, type SheetSeed, type SheetSide } from "@/lib/journey/sheet-state";
import { depositLeftAfterFor } from "@/lib/journey/shortfall";
import { nextSheetFocus, type SheetFocusState } from "@/lib/journey/sheet-focus";
import { BalanceRow, BetInstead, ChosenSide, EstimateBox, HolderNote, Receipt, SheetSentence, sheetLineText, sheetTemplate } from "./sheet-parts";

export type BetSheetProps = {
  open?: boolean;
  seed: SheetSeed;
  side: SheetSide;
  title: string;
  frame: SheetFrame;
  stakeText: string;
  estimateUpdated: boolean;
  railNames?: readonly string[];
  onStakeChange: (value: string) => void;
  onPlace: () => void;
  onBetInstead: () => void;
  onDeposit: (amount?: number) => void;
  onClose: () => void;
};

type BodyProps = BetSheetProps & {
  t: Dict;
  locale: Locale;
  id: string;
  nowMs: number;
  keyboard?: boolean;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  closeRef?: RefObject<HTMLButtonElement | null>;
  onStakeFocus?: () => void;
  onStakeBlur?: () => void;
  depositAmount?: number | null;
  onDepositAmount?: (amount: number) => void;
};

/** A pure body for the three-language frame render proof: Modal's portal is not a substitute for rendering each frame. */
export function BetSheetBody(props: BodyProps) {
  const { seed, side, title, frame, stakeText, estimateUpdated, railNames = [], t, locale, id, nowMs, keyboard = false,
    headingRef, closeRef, onStakeChange, onPlace, onBetInstead, onDeposit, onClose, onStakeFocus, onStakeBlur,
    depositAmount, onDepositAmount } = props;
  const placing = frame.frame === "placing";
  const receipt = frame.frame === "receipt";
  const terminal = frame.frame === "blocked" || frame.frame === "closed";
  const calloutId = `${id}-callout`, boundsId = `${id}-bounds`, lineId = `${id}-line`, titleId = `${id}-title`;
  const descriptionId = frame.cta?.describedBy === "callout" ? calloutId : frame.cta?.describedBy === "bounds" ? boundsId : frame.cta?.describedBy === "line" ? lineId : undefined;
  const low = frame.low, pending = frame.pending;
  const options = low?.deposit;
  const selectedDeposit = options && depositAmount !== null && depositAmount !== undefined && options.chips.includes(depositAmount) ? depositAmount : options?.amount;
  const instead = low?.betInstead ?? pending?.betInstead ?? null;
  const bound: SheetLine | null = frame.breaks === "below" ? { key: "journey.sheetBelowMin", vars: { min: frame.bounds.min } }
    : frame.breaks === "above" ? { key: "journey.sheetAboveMax", vars: { max: frame.bounds.max } }
      : frame.breaks === "notWhole" ? { key: "error.failStakeNotWhole" } : null;
  const displayedStake = frame.stake === null ? stakeText : String(frame.stake);
  const parts = { t, locale, seed, side, frame, nowMs };
  const footerLine = frame.cta?.label;
  return <>
    <div aria-hidden className="kp-wsheet__grab" />
    <div className="kp-bsheet__header">
      {receipt ? <p className="kp-bsheet__eyebrow">{t.common.betPlacedEyebrow}</p> : <ChosenSide t={t} side={side} />}
      <CloseX ref={closeRef} withheld={placing} onClick={onClose} label={t.common.close} className="kp-bsheet__close" />
    </div>
    <div className="kp-bsheet__scroll" data-testid="journey-sheet-scroll">
      {terminal && <p className="kp-bsheet__question">{title}</p>}
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className="kp-bsheet__title">
        {receipt ? <><Chip variant={side === "YES" ? "yes" : "no"} size="lg" metrics="status">{sideWord(t, side, "MARKET")}</Chip><span className="amount">{frame.stake === null ? "—" : formatTzs(frame.stake)}</span></>
          : frame.frame === "blocked" && frame.block ? sheetTemplate(t, frame.block.title) : frame.frame === "closed" ? t.journey.sheetClosedTitle : title}
      </h2>
      {receipt ? <Receipt {...parts} title={title} onClose={onClose} /> : terminal ? <div id={calloutId} role="alert" className="kp-bsheet__terminal">
        {frame.block ? <SheetSentence t={t} locale={locale} nowMs={nowMs} line={frame.block.body} /> : frame.closedBody ? sheetTemplate(t, frame.closedBody) : null}
      </div> : <>
        <HolderNote {...parts} />
        <div className="kp-bsheet__stake">
          <label htmlFor={`${id}-stake`}>{t.journey.stakeLabel}</label>
          <Input id={`${id}-stake`} data-testid="journey-sheet-stake" size="xl" grouped mono attention={frame.attention} prefix="TZS" inputMode="numeric" enterKeyHint="done"
            value={displayedStake} disabled={frame.stakeLocked || placing} aria-invalid={frame.stakeInvalid || undefined}
            aria-describedby={bound ? boundsId : frame.attention ? calloutId : undefined}
            onChange={(event) => onStakeChange(event.target.value)} onFocus={onStakeFocus} onBlur={onStakeBlur} />
        </div>
        {bound && <p id={boundsId} role="status" className="kp-bsheet__bounds"><I.info s={16} edge="start" text="body-400" /><span><SheetSentence t={t} locale={locale} nowMs={nowMs} line={bound} /></span></p>}
        {!keyboard && frame.chips && <div role="group" aria-label={t.journey.stakeLabel} className="kp-bsheet__chips">
          {frame.chips.map((amount) => <Button key={amount} type="button" variant="ghost" size="md" className="kp-bsheet__chip amount" aria-pressed={frame.stake === amount} disabled={placing || frame.stakeLocked} onClick={() => onStakeChange(String(amount))}>{formatNumber(amount)}</Button>)}
        </div>}
        {estimateUpdated && frame.showEstimate && <p className="kp-bsheet__updated">{t.journey.estimateUpdated}</p>}
        {(frame.showEstimate || low || pending) && <EstimateBox {...parts} compact={keyboard || !frame.showEstimate} />}
        {low && <div id={calloutId}><Callout tone="info" glyph="alertCircle" title={t.journey.lowTitle}>
          {!low.titleOnly && low.spendable !== null && low.shortfall !== null && <p>{fillNodes(t.journey.lowBody, { have: <Cash className="amount">{formatTzs(low.spendable)}</Cash>, short: <span className="amount">{formatTzs(low.shortfall)}</span> })}</p>}
        </Callout></div>}
        {frame.lossRoom && <div id={calloutId}><Callout tone="info" glyph="info" title={t.journey.lowLossTitle}><SheetSentence t={t} locale={locale} nowMs={nowMs} line={{ key: "journey.lowLossRoom", vars: { amount: frame.lossRoom.headroom } }} /></Callout></div>}
        {pending && <div id={calloutId}><Callout tone="info" glyph="info" title={<SheetSentence t={t} locale={locale} nowMs={nowMs} line={pending.title} />}>
          <p><SheetSentence t={t} locale={locale} nowMs={nowMs} line={pending.body} /></p>
          <Link href={`/wallet/receipt/${encodeURIComponent(pending.txnId)}`} onClick={onClose} className="kp-bsheet__link">{t.journey.lowPendingTrack}<I.chevronRight s={16} edge="end" text="body-400" /></Link>
        </Callout></div>}
        {low?.depositRefusal && <p className="kp-bsheet__deposit-refusal"><SheetSentence t={t} locale={locale} nowMs={nowMs} line={low.depositRefusal === "rails_paused" ? { key: "journey.sheetRailsPaused" }
          : low.depositRefusal === "sof_required" ? { key: "journey.sheetSofRequired" } : low.depositRefusal === "deposit_max" ? { key: "journey.sheetDepositMax", vars: { max: low.depositMaximum ?? "—" } } : { key: "journey.sheetDepositLimit", vars: { amount: low.requestedDeposit ?? "—" } }} /></p>}
        {low?.eyebrow && <p className="kp-bsheet__eyebrow">{t.journey.lowChoose}</p>}
        {options && selectedDeposit !== undefined && <>
          <Button type="button" variant="gold" size="xl" fullWidth className="kp-bsheet__deposit gilt-metal" data-testid="journey-sheet-deposit" onClick={() => onDeposit(selectedDeposit)} leading={<I.wallet s={20} text="body-600" />} trailing={<I.chevronRight s={20} text="body-600" />}>
            <span className="kp-bsheet__deposit-copy"><span>{fillNodes(t.journey.lowDeposit, { amount: <span className="amount">{formatTzs(selectedDeposit)}</span> })}</span>
              <span className="kp-bsheet__rails">{railNames.map((name, index) => <span key={name}>{index > 0 && <span aria-hidden> · </span>}<span className="kp-bsheet__rail">{name}</span></span>)}</span>
            </span>
          </Button>
          {options.chips.length > 1 && <div className="kp-bsheet__chips" role="group" aria-label={t.common.deposit}>{options.chips.map((amount) => <Button key={amount} type="button" variant="ghost" size="md" className="kp-bsheet__chip amount" aria-pressed={selectedDeposit === amount} onClick={() => onDepositAmount?.(amount)}>{formatNumber(amount)}</Button>)}</div>}
          {options.belowDepositMin && <p className="kp-bsheet__note"><SheetSentence t={t} locale={locale} nowMs={nowMs} line={{ key: "journey.lowMinNote", vars: { min: options.amount, left: depositLeftAfterFor(options, selectedDeposit) } }} /></p>}
        </>}
        {low?.depositRefusal === "sof_required" && <Link className="kp-bsheet__link" href="/profile/source-of-funds" onClick={onClose}>{t.journey.lowSofCta}<I.chevronRight s={16} edge="end" text="body-400" /></Link>}
        {low?.depositRefusal === "deposit_limit" && <Link className="kp-bsheet__link" href="/profile/responsible-gambling" onClick={onClose}>{t.rg.setLimits}<I.chevronRight s={16} edge="end" text="body-400" /></Link>}
        {instead && <BetInstead t={t} seed={seed} side={side} stake={instead.stake} estimate={sheetEstimate(seed, side, instead.stake)} onClick={onBetInstead} />}
        {frame.showEstimate && <BalanceRow t={t} frame={frame} />}
        {placing && <p role="status" className="kp-bsheet__placing">{t.journey.sheetPlacing}</p>}
        {frame.lines.length > 0 && <div id={lineId} role="status" className="kp-bsheet__lines">{frame.lines.map((line, index) => <p key={`${line.key}-${index}`}><SheetSentence t={t} locale={locale} nowMs={nowMs} line={line} /></p>)}</div>}
      </>}
    </div>
    <div className="kp-bsheet__footer">
      {receipt ? <Button type="button" variant="ghost" size="xl" fullWidth className="kp-bsheet__continue" onClick={onClose}>{t.market.udRcKeepPlaying}</Button>
        : terminal ? <>
          {frame.block?.actions.includes("setLimits") && <Link className="kp-bsheet__link" href="/profile/responsible-gambling" onClick={onClose}>{t.rg.setLimits}</Link>}
          {frame.block?.actions.includes("contactSupport") && <Link className="kp-bsheet__link" href="/help" onClick={onClose}>{t.kycGate.frozenCta}</Link>}
          <Button type="button" variant="ghost" size="xl" fullWidth onClick={onClose}>{t.common.gotIt}</Button>
        </> : footerLine && <Button type="button" variant="gold" size="xl" fullWidth className="kp-bsheet__commit" data-testid="journey-sheet-place" disabled={!frame.cta?.enabled} aria-describedby={descriptionId} onClick={onPlace}><span><SheetSentence t={t} locale={locale} nowMs={nowMs} line={footerLine} /></span></Button>}
    </div>
  </>;
}

export function BetSheet(props: BetSheetProps) {
  const { t, locale } = useT();
  const open = props.open ?? true;
  const openRef = useRef(open);
  openRef.current = open;
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null), closeRef = useRef<HTMLButtonElement>(null), shellRef = useRef<HTMLDivElement>(null);
  const [stakeFocused, setStakeFocused] = useState(false), [keyboard, setKeyboard] = useState(false);
  const focusIdentity = JSON.stringify([props.seed.id, props.side, props.frame.receipt?.positionId ?? null]);
  const [focusState, setFocusState] = useState<SheetFocusState>(() => ({ identity: focusIdentity, frame: props.frame.frame, revision: 0 }));
  const nextFocus = nextSheetFocus(focusState, focusIdentity, props.frame.frame, stakeFocused);
  // Adjust during render, as useExitPhase does: no intermediate paint steals the field's focus or drops its lift.
  if (nextFocus !== focusState) setFocusState(nextFocus);
  const refocusKey = `${nextFocus.identity}:${nextFocus.revision}`;
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [live, setLive] = useState("");
  const nowMs = Date.now();
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;
  const pauseKinds = useRef(new Set<string>()), target = useRef<number | null>(null), remaining = useRef(DWELL_BET_RECEIPT_MS), closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const lastFrame = useRef<string | null>(null), wasUpdated = useRef(false);
  const receiptId = props.frame.receipt?.positionId ?? null;
  const armClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    target.current = performance.now() + remaining.current;
    closeTimer.current = setTimeout(() => onCloseRef.current(), remaining.current);
  }, []);
  const hold = useCallback((kind: string) => {
    if (target.current === null) return;
    if (pauseKinds.current.size === 0) { remaining.current = Math.max(0, target.current - performance.now()); if (closeTimer.current) clearTimeout(closeTimer.current); }
    pauseKinds.current.add(kind);
  }, []);
  const release = useCallback((kind: string) => {
    const wasPaused = pauseKinds.current.delete(kind);
    if (wasPaused && pauseKinds.current.size === 0 && target.current !== null) armClose();
  }, [armClose]);
  useEffect(() => {
    if (!open || !receiptId) return;
    remaining.current = DWELL_BET_RECEIPT_MS; pauseKinds.current.clear(); pointer.current = null; armClose();
    // The result poller owns the realised payout. A placed sheet records only which market to watch.
    try {
      const WATCH_KEY = "50pick-notify-markets";
      const watchRaw = localStorage.getItem(WATCH_KEY);
      const parsed: unknown = watchRaw ? JSON.parse(watchRaw) : [];
      const watch: string[] = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
      if (!watch.includes(props.seed.id)) { watch.push(props.seed.id); localStorage.setItem(WATCH_KEY, JSON.stringify(watch)); }
    } catch { /* Private storage cannot alter the committed receipt. */ }
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); target.current = null; pauseKinds.current.clear(); pointer.current = null; };
  }, [open, receiptId, props.seed.id, armClose]);
  const revealFocusedStake = useCallback(() => {
    const middle = shellRef.current?.querySelector<HTMLElement>(".kp-bsheet__scroll");
    const field = middle?.querySelector<HTMLInputElement>('[data-testid="journey-sheet-stake"]');
    if (!middle || !field || document.activeElement !== field) return;
    const port = middle.getBoundingClientRect(), stake = field.getBoundingClientRect();
    const padding = getComputedStyle(middle);
    const top = port.top + parseFloat(padding.paddingTop), bottom = port.bottom - parseFloat(padding.paddingBottom);
    // The keyboard can shrink a focused field's scrollport after the browser has already revealed it.
    // Move only this middle region, keeping the chosen side, CloseX and commit fixed.
    if (stake.bottom > bottom) middle.scrollTop += stake.bottom - bottom;
    else if (stake.top < top) middle.scrollTop -= top - stake.top;
  }, []);
  useLayoutEffect(() => {
    if (open && keyboard && stakeFocused) revealFocusedStake();
  }, [open, keyboard, stakeFocused, revealFocusedStake]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const panel = shellRef.current?.closest<HTMLElement>(".kp-bsheet");
    let revealFrame: number | null = null;
    const resizeSheetViewport = () => {
      if (!openRef.current) return;
      const lifted = !!viewport && stakeFocused && window.innerWidth < 1024 && viewport.height < window.innerHeight;
      setKeyboard(lifted);
      // Unlifted is the stylesheet's own fallback (0px, 100dvh): remove, never write "0px". An inherited custom property
      // written onto the panel restyles every element under it, and the opening tap paid for that before its first frame (A21).
      if (lifted) {
        panel?.style.setProperty("--bsheet-keyboard-lift", `${Math.max(0, window.innerHeight - viewport!.height - viewport!.offsetTop)}px`);
        panel?.style.setProperty("--bsheet-visible-height", `${viewport!.height}px`);
      } else {
        panel?.style.removeProperty("--bsheet-keyboard-lift");
        panel?.style.removeProperty("--bsheet-visible-height");
      }
      if (revealFrame !== null) cancelAnimationFrame(revealFrame);
      revealFrame = lifted ? requestAnimationFrame(revealFocusedStake) : null;
    };
    resizeSheetViewport(); viewport?.addEventListener("resize", resizeSheetViewport); viewport?.addEventListener("scroll", resizeSheetViewport);
    return () => { if (revealFrame !== null) cancelAnimationFrame(revealFrame); viewport?.removeEventListener("resize", resizeSheetViewport); viewport?.removeEventListener("scroll", resizeSheetViewport); panel?.style.removeProperty("--bsheet-keyboard-lift"); panel?.style.removeProperty("--bsheet-visible-height"); };
  }, [stakeFocused, revealFocusedStake]);
  useEffect(() => {
    if (!open) { setLive(""); return; }
    const frame = props.frame;
    // A pending deposit's age band is spoken as a frame of its own: the long and late words (and the late band's offer
    // to bet what is already there) are announced once when the band arrives, never on the ticks within it. Keyed by
    // the frame alone, a listener heard only the fresh words for the whole wait (S8 pending-age drive, 2026-10-14).
    const spoken = frame.pending ? `${frame.frame}:${frame.pending.band}` : frame.frame;
    const moved = lastFrame.current !== spoken;
    const updated = props.estimateUpdated && !wasUpdated.current;
    lastFrame.current = spoken; wasUpdated.current = props.estimateUpdated;
    if (!moved && !updated) return;
    let message = "";
    if (frame.frame === "receipt") message = `${t.common.betPlacedEyebrow}. ${t.common.ticket}: ${receiptId ?? ""}.`;
    else if (frame.low) message = t.journey.lowTitle;
    else if (frame.lossRoom) message = sheetLineText(t, locale, { key: "journey.lowLossRoom", vars: { amount: frame.lossRoom.headroom } }, nowMs);
    else if (frame.pending) message = `${sheetLineText(t, locale, frame.pending.title, nowMs)}. ${sheetLineText(t, locale, frame.pending.body, nowMs)}`
      + (frame.pending.betInstead ? ` ${fill(t.journey.lowBetInstead, { amount: formatTzs(frame.pending.betInstead.stake) })}` : "");
    else if (updated && frame.estimate?.payout !== null && frame.estimate?.payout !== undefined) message = fill(t.journey.estimateUpdatedLive, { amount: formatTzs(frame.estimate.payout), mult: frame.estimate.multText ?? "—" });
    setLive(message);
  }, [open, props.frame, props.estimateUpdated, t, locale, receiptId, nowMs]);
  const terminal = props.frame.frame === "closed" || props.frame.frame === "blocked";
  return <Modal open={open} onClose={props.onClose} labelledBy={`${id}-title`} describedBy={terminal ? `${id}-callout` : undefined}
    sheet sheetUntil="lg" maxWidth={440} showClose={false} initialFocus={headingRef} safeFocus={closeRef}
    refocusKey={refocusKey} panelClassName="kp-wsheet kp-bsheet" closeOnScrim={props.frame.closable} closeOnEsc={props.frame.closable} ariaBusy={props.frame.frame === "placing"}>
    <div ref={shellRef} className="kp-bsheet__shell" data-testid="journey-bet-sheet" data-frame={props.frame.frame} data-ptr-skip=""
      onFocusCapture={(event) => { if (open && receiptId && event.target.matches(":focus-visible")) hold("focus"); }}
      onBlurCapture={(event) => { if (open && !event.currentTarget.contains(event.relatedTarget)) release("focus"); }}
      onPointerMove={(event) => { if (!open || !receiptId) return; const prior = pointer.current; pointer.current = { x: event.clientX, y: event.clientY }; if (prior && (prior.x !== event.clientX || prior.y !== event.clientY)) hold("pointer"); }}
      onPointerLeave={() => { if (open) { pointer.current = null; release("pointer"); } }}>
      <BetSheetBody {...props} t={t} locale={locale} id={id} nowMs={nowMs} keyboard={keyboard} headingRef={headingRef} closeRef={closeRef}
        depositAmount={depositAmount} onDepositAmount={setDepositAmount} onStakeFocus={() => { if (open) setStakeFocused(true); }} onStakeBlur={() => { if (open) setStakeFocused(false); }} />
      {open && <p className="sr-only" aria-live="polite" aria-atomic="true">{live}</p>}
    </div>
  </Modal>;
}
