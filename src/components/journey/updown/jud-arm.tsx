"use client";

/**
 * JUU/CHINI'S JOURNEY ARM — what a journey reader's Up & Down controls draw (the Vodacom plan S12, WP9–WP10;
 * `docs/design-system/v5-2026-09-29-simplified-journey/S12-PLAN.md`). Loaded only for a journey request, through
 * `jud-lazy.tsx`, so no classic page ever downloads this module.
 *
 * TWO CONTROLS, ONE GRAMMAR (the S4 boards `s4-11-updown-panel` and `-low`, minus every multiple):
 *   · `JudTwoWay` — the board card's signed-in control and the round page with no side chosen: "Dau lako", the stake box
 *     always visible, four chips in full figures (`quickStakes`), the prompt, and the two side buttons. ONE TAP PLACES at
 *     the stake shown (Open point 7), as the classic control does; the buttons say the side's word and its arrow, nothing
 *     else (the owner's ruling of 2026-10-14).
 *   · `JudConfirm` — the round page's `?side=` panel: the chosen side as a chip, the stake box and chips, the projected
 *     return in shillings ("Ukishinda ≈ TZS 634", muted — projected money is not earned money), and one gold commit
 *     ("Weka dau · TZS 500").
 * Not enough money draws the sheet's own low rows (`LowBlock`, one block for both products) from the sheet's own frame
 * (`judFrame`): the callout, the gilt deposit door with the rails' names, and "Tumia {x} badala yake", which SETS the
 * stake and never places (Open point 11).
 *
 * ⛔ THE MONEY PATH IS THE CLASSIC ONE, UNTOUCHED. Every placement is `bet.place(side)` on the `useUpDownQuickBet` the
 * host already holds — one fresh idempotency key per tap, the server's landed-key answer and its redirect rule — and the
 * receipt is the classic `UpDownBetReceiptModal` (Open point 15). This arm only reshapes the presentation, and it places
 * only when the hook would place EXACTLY the stake on screen (`judCommitReady`).
 * ⛔ No figure is computed here: the frame, the projection and the addresses are `lib/journey/updown-arm.ts`'s.
 */
import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Callout } from "@/components/ui/callout";
import { Spinner } from "@/components/ui/spinner";
import { I } from "@/components/ui/glyphs";
import { noticeBody } from "@/components/ui/empty-state-text";
import { useT } from "@/lib/i18n";
import { cn, fill, formatNumber, formatTzs } from "@/lib/utils";
import { fillNodes } from "@/lib/fill-nodes";
import { sideWord } from "@/lib/side-label";
import { useServerNowGated } from "@/lib/use-shared-second";
import { LowBlock } from "@/components/journey/bet-sheet/bet-sheet";
import { useCashHidden } from "@/components/ui/cash";
import { SheetSentence, sheetTemplate } from "@/components/journey/bet-sheet/sheet-parts";
import { usePlacePulse, type useUpDownQuickBet } from "@/components/updown/use-quick-bet";
import { GLYPH_NO_SHRINK } from "@/components/updown/updown-stake-controls";
import { UpDownBetBlockedModal } from "@/components/updown/updown-bet-blocked-modal";
import { UpDownBetReceiptModal } from "@/components/updown/updown-bet-receipt-modal";
import { HouseLeanWarning } from "@/components/markets/house-lean-warning";
import { attributionFrom, PENDING_BET_KEY, readMarker, writeMarker, stakeFromUrl, parseBetParam } from "@/lib/journey/pending-bet";
import { quarantineLegacySheet, saveSheetSelection } from "@/lib/journey/sheet-owned-storage";
import { pendingBand, type SheetLine } from "@/lib/journey/sheet-state";
import {
  JUD_TAB_MARKER, judBet, judCommitReady, judDepositHref, judEmptySide, judFrame, judNextRoundHref, judNotice, judNoticeEitherSide, judProjection,
  judSpentSince, judViewerAfterSpend,
  type JudClosedNotice, type JudRound, type JudSide, type JudViewer,
} from "@/lib/journey/updown-arm";
import type { UpDownReceiptInfo } from "@/lib/updown-receipt";
import { fmtEATClock } from "@/lib/updown-source-label";

type Bet = ReturnType<typeof useUpDownQuickBet>;

type ArmProps = {
  bet: Bet;
  round: JudRound;
  viewer: JudViewer | null;
  assetName: string;
  receipt?: UpDownReceiptInfo;
  onWatchRound?: () => void;
  /** "card" on the board, "detail" on the round page — a density, never a different control. */
  size?: "card" | "detail";
};

/** The stake the arm opens at: the round's minimum; the address's own stake only with this tab's marker (`stakeFromUrl`). */
function useStakeText(round: JudRound, viewer: JudViewer | null, carried: JudSide | null): [string, (v: string) => void] {
  const [text, setText] = useState(String(round.min));
  useEffect(() => {
    // Read once, after hydration (the server cannot see this tab's storage): `?bet=udr_<this round>.<side>.<stake>` with
    // a matching, owner-scoped marker under 24 hours old. Anything else leaves the minimum — a link never sets a stake.
    if (!carried || !viewer) return;
    try {
      const bet = parseBetParam(new URLSearchParams(window.location.search).get("bet"));
      if (!bet || bet.kind !== "round" || bet.id !== round.roundId || bet.side !== carried) return;
      const stake = stakeFromUrl(bet, window.sessionStorage.getItem(PENDING_BET_KEY), Date.now(), viewer.viewerId);
      if (stake !== null && stake >= round.min && stake <= round.max) setText(String(stake));
    } catch { /* private storage: the minimum stands */ }
  }, [carried, viewer, round.roundId, round.min, round.max]);
  return [text, setText];
}

/** The server-anchored instant, re-rendering only when the frame's clock-derived answers move: the lock, a pending band. */
function useArmClock(round: JudRound, viewer: JudViewer | null): number {
  const createdAt = viewer?.facts?.pendingDeposit?.createdAt ?? null;
  const now = useServerNowGated(round.serverNowMs, (nowMs) => {
    const shut = round.selectionClosesAtMs !== null && nowMs >= round.selectionClosesAtMs ? "shut" : "open";
    return createdAt ? `${shut}:${pendingBand(createdAt, nowMs)}` : shut;
  });
  return now ?? round.serverNowMs;
}

/** The hook's stake follows the box: custom mode, the box's digits. A placement then always names the figure on screen. */
function useFollowBox(bet: Bet, text: string) {
  const { enterCustom, setCustomValue } = bet;
  useEffect(() => { enterCustom(); setCustomValue(text); }, [enterCustom, setCustomValue, text]);
}

/** ⭐ THE TAB MARKER, then the deposit page: the sheet's storage modules, a round's bet (S12-PLAN WP10 step 4). */
function useDepositDoor(round: JudRound, viewer: JudViewer | null) {
  const router = useRouter();
  return useCallback((side: JudSide, stake: number | null, amount: number | undefined) => {
    if (stake === null || amount === undefined) return;
    const bet = judBet(round.roundId, side, stake);
    try {
      const stamp = Date.now();
      const marker = readMarker(writeMarker(bet, stamp, attributionFrom(new URLSearchParams(window.location.search)), undefined, viewer?.viewerId), stamp);
      // A marker that cannot be kept only costs the way back its stake (the round's minimum then): the deposit stands.
      if (JUD_TAB_MARKER && marker && quarantineLegacySheet(window.sessionStorage)) saveSheetSelection(window.sessionStorage, JSON.stringify(marker));
    } catch { /* private storage: as above */ }
    window.dispatchEvent(new Event("50pick:navigating"));
    router.push(judDepositHref(round.roundId, side, stake, amount) as never);
  }, [round.roundId, router, viewer]);
}

/** The stake box, its bounds line and the chips — the sheet's rows, in the sheet's classes. */
function StakeRows({ id, t, locale, nowMs, frame, text, setText, size, disabled }: {
  id: string; t: ReturnType<typeof useT>["t"]; locale: ReturnType<typeof useT>["locale"]; nowMs: number;
  frame: ReturnType<typeof judFrame>; text: string; setText: (v: string) => void; size: "card" | "detail"; disabled: boolean;
}) {
  const bound: SheetLine | null = frame.breaks === "below" ? { key: "journey.sheetBelowMin", vars: { min: frame.bounds.min } }
    : frame.breaks === "above" ? { key: "journey.sheetAboveMax", vars: { max: frame.bounds.max } }
      : frame.breaks === "notWhole" ? { key: "error.failStakeNotWhole" } : null;
  const calloutId = `${id}-callout`, boundsId = `${id}-bounds`;
  return <>
    <div className="kp-bsheet__stake">
      <label htmlFor={`${id}-stake`}>{t.market.udStake}</label>
      <Input id={`${id}-stake`} data-testid="jud-stake" size={size === "card" ? "lg" : "xl"} grouped mono attention={frame.attention}
        prefix="TZS" inputMode="numeric" enterKeyHint="done" value={text} disabled={disabled} aria-invalid={frame.stakeInvalid || undefined}
        aria-describedby={bound ? boundsId : frame.attention ? calloutId : undefined} onChange={(e) => setText(e.target.value)} />
    </div>
    {bound && <p id={boundsId} role="status" className="kp-bsheet__bounds"><I.info s={16} edge="start" text="body-400" /><span><SheetSentence t={t} locale={locale} nowMs={nowMs} line={bound} /></span></p>}
    {frame.chips && <div role="group" aria-label={t.journey.udQuickStakes} className="kp-bsheet__chips" data-testid="jud-chips">
      {frame.chips.map((amount) => <Button key={amount} type="button" variant="ghost" size="md" className="kp-bsheet__chip amount"
        aria-pressed={frame.stake === amount} disabled={disabled} onClick={() => setText(String(amount))}>{formatNumber(amount)}</Button>)}
    </div>}
  </>;
}

/** A frame that refuses the bet outright (a break, the session limit, the account, a held wallet, the loss limit spent): its own callout. */
function BlockedNote({ t, locale, nowMs, frame, id }: { t: ReturnType<typeof useT>["t"]; locale: ReturnType<typeof useT>["locale"]; nowMs: number; frame: ReturnType<typeof judFrame>; id: string }) {
  if (frame.frame !== "blocked" || !frame.block) return null;
  return <div id={`${id}-callout`}><Callout tone="info" glyph="info" title={sheetTemplate(t, frame.block.title)}>
    <p><SheetSentence t={t} locale={locale} nowMs={nowMs} line={frame.block.body} /></p>
  </Callout></div>;
}

/** The inline lines the sheet stands above its CTA (maintenance; the session limit is a block since S8-PLAN A25), and the empty-side sentence. */
function Lines({ t, locale, nowMs, frame, id }: { t: ReturnType<typeof useT>["t"]; locale: ReturnType<typeof useT>["locale"]; nowMs: number; frame: ReturnType<typeof judFrame>; id: string }) {
  if (frame.lines.length === 0) return null;
  return <div id={`${id}-line`} role="status" className="kp-bsheet__lines">{frame.lines.map((line, index) => <p key={`${line.key}-${index}`}><SheetSentence t={t} locale={locale} nowMs={nowMs} line={line} /></p>)}</div>;
}

function EmptySideNote({ t, side }: { t: ReturnType<typeof useT>["t"]; side: "UP" | "DOWN" | "BOTH" | null }) {
  // The side's word from the one lexicon (`sideWord`), never a private map (`test:labels` §4).
  const copy = side === "BOTH" ? t.market.udNobodyBackedEither : side ? t.market.udNobodyBacked.replace("{side}", sideWord(t, side, "UPDOWN")) : null;
  if (!copy) return null;
  return <p className="kp-jud__note"><I.info s={11} className="mt-[2px] shrink-0" /><span>{noticeBody(copy)}</span></p>;
}

/** FEE-TAX-2026-10 · a stake-share round's standing line, in the empty side's ⓘ register: a winning bet can return less than its stake. */
function StandingNote({ t, shown }: { t: ReturnType<typeof useT>["t"]; shown: boolean }) {
  if (!shown) return null;
  return <p className="kp-jud__note" data-ss-standing=""><I.info s={11} className="mt-[2px] shrink-0" /><span>{noticeBody(t.market.ssStanding)}</span></p>;
}

function YoureIn({ t, bet }: { t: ReturnType<typeof useT>["t"]; bet: Bet }) {
  if (bet.shownUp <= 0 && bet.shownDown <= 0) return null;
  return <div className="kp-jud__in">
    <span className="kp-bsheet__eyebrow">{t.market.udYoureIn}</span>
    {bet.shownUp > 0 && <Chip variant="yes" className="tabular-nums">{t.market.udUp} {formatTzs(bet.shownUp)}</Chip>}
    {bet.shownDown > 0 && <Chip variant="no" className="tabular-nums">{t.market.udDown} {formatTzs(bet.shownDown)}</Chip>}
  </div>;
}

/** ⭐ The board card's signed-in control, and the round page with no side chosen. */
export function JudTwoWay({ bet, round, viewer, assetName, receipt, onWatchRound, size = "card" }: ArmProps) {
  const { t, locale } = useT();
  const id = useId();
  const cashHidden = useCashHidden();
  const [text, setText] = useStakeText(round, viewer, null);
  useFollowBox(bet, text);
  const nowMs = useArmClock(round, viewer);
  // The facts less what this page's own taps have spent since they were read (judViewerAfterSpend).
  const live = judViewerAfterSpend(viewer, judSpentSince(round, { up: bet.shownUp, down: bet.shownDown }));
  const frame = judFrame({ round, side: "UP", stakeText: text, viewer: live, nowMs });
  const deposit = useDepositDoor(round, viewer);
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const flash = usePlacePulse(bet.justPlaced?.nonce);
  const ready = judCommitReady(frame, bet);
  const instead = frame.low?.betInstead ?? frame.pending?.betInstead ?? null;
  // FEE-TAX-2026-10 · the notice for a control that offers both sides: the warning names the side whose win would pay
  // back less than this stake, and states NO figure (the two-way control quotes nothing, the owner's ruling of 2026-10-14).
  const notice = judNoticeEitherSide(round.pricing, frame.breaks === null ? frame.stake : null);
  const prompt = bet.pending
    ? bet.pendingSlow ? <><span className="live-dot" /> {t.market.udStillPlacing}</> : <><span className="live-dot" /> <span><span className="amount">{formatTzs(bet.stake)}</span> · {t.market.udStreaming}</span></>
    : bet.locallyLocked ? <>{t.market.udErrSelectionClosed}</>
      : ready ? <span>{t.market.udTapToBet} · <span className="amount">{formatTzs(bet.stake)}</span></span> : null;
  const sideButton = (side: JudSide) => <button type="button" onClick={() => { if (ready) bet.place(side); }} disabled={!ready}
    data-testid={side === "UP" ? "jud-up" : "jud-down"} aria-describedby={frame.low || frame.pending || frame.lossRoom || frame.block ? `${id}-callout` : frame.lines.length ? `${id}-line` : undefined}
    className={cn(side === "UP" ? "btn btn-yes btn-lg" : "btn btn-no btn-lg", "justify-center", flash && bet.justPlaced?.side === side && "ud-side-flash")}
    aria-label={`${sideWord(t, side, "UPDOWN")} — ${assetName}${ready ? ` · ${formatTzs(bet.stake)}` : ""}`}>
    {bet.pendingSide === side ? <Spinner size={12} /> : side === "UP" ? <I.arrowUp s={size === "card" ? 14 : 15} edge="start" text="body-700" className={GLYPH_NO_SHRINK} /> : <I.arrowDown s={size === "card" ? 14 : 15} edge="start" text="body-700" className={GLYPH_NO_SHRINK} />} {sideWord(t, side, "UPDOWN")}
  </button>;
  return <div className="kp-jud" data-jud="two-way" data-size={size}>
    <YoureIn t={t} bet={bet} />
    <StakeRows id={id} t={t} locale={locale} nowMs={nowMs} frame={frame} text={text} setText={setText} size={size} disabled={false} />
    <BlockedNote t={t} locale={locale} nowMs={nowMs} frame={frame} id={id} />
    <LowBlock t={t} locale={locale} nowMs={nowMs} frame={frame} calloutId={`${id}-callout`} railNames={live?.facts?.deposit.railNames ?? []} cashHidden={cashHidden}
      depositAmount={depositAmount} onDepositAmount={setDepositAmount} onDeposit={(amount) => deposit("UP", frame.stake, amount)} onClose={() => {}}
      instead={instead && <Button type="button" variant="ghost" size="xl" fullWidth className="kp-bsheet__instead" data-testid="jud-use-instead"
        onClick={() => setText(String(instead.stake))}><span>{fillNodes(t.journey.udUseInstead, { amount: <span className="amount">{formatTzs(instead.stake)}</span> })}</span></Button>} />
    <Lines t={t} locale={locale} nowMs={nowMs} frame={frame} id={id} />
    {prompt && <p className="kp-jud__prompt">{prompt}</p>}
    {/* The below-stake warning stands above the two buttons, because a tap on one of them places. */}
    {notice?.belowSide && <HouseLeanWarning level="below" stakeShare below={{ side: sideWord(t, notice.belowSide, "UPDOWN") }} className="mb-2" />}
    <div className="kp-jud__sides">{sideButton("UP")}{sideButton("DOWN")}</div>
    {size === "detail" && <EmptySideNote t={t} side={judEmptySide(round.pricing, null)} />}
    <StandingNote t={t} shown={notice !== null} />
    <span aria-live="polite" className="sr-only">{bet.liveMessage}</span>
    <UpDownBetBlockedModal blocked={bet.blocked} onClose={bet.clearBlocked} />
    {receipt && <UpDownBetReceiptModal key={bet.placedReceipt?.nonce ?? 0} placed={bet.placedReceipt} info={receipt} pricing={round.pricing}
      assetName={assetName} onClose={bet.clearPlacedReceipt} onWatchRound={onWatchRound} />}
  </div>;
}

/** ⭐ The round page's `?side=` panel (and the way back from a deposit, preset from this tab's marker). */
export function JudConfirm({ bet, round, viewer, assetName, receipt, side }: ArmProps & { side: JudSide }) {
  const { t, locale } = useT();
  const id = useId();
  const cashHidden = useCashHidden();
  const [text, setText] = useStakeText(round, viewer, side);
  useFollowBox(bet, text);
  const nowMs = useArmClock(round, viewer);
  const live = judViewerAfterSpend(viewer, judSpentSince(round, { up: bet.shownUp, down: bet.shownDown }));
  const frame = judFrame({ round, side, stakeText: text, viewer: live, nowMs });
  const deposit = useDepositDoor(round, viewer);
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const pulse = usePlacePulse(bet.justPlaced?.nonce);
  const ready = judCommitReady(frame, bet) && !bet.pending;
  const projected = judProjection(round.pricing, side, frame.breaks === null ? frame.stake : null);
  // FEE-TAX-2026-10 · the notice at the commit (a side chosen): the warning with the projection's own figures above the
  // commit, the fee note and the standing line under it. Null on every older round.
  const notice = judNotice(round.pricing, side, frame.breaks === null ? frame.stake : null);
  const instead = frame.low?.betInstead ?? frame.pending?.betInstead ?? null;
  const word = sideWord(t, side, "UPDOWN");
  const describedBy = frame.low || frame.pending || frame.lossRoom || frame.block ? `${id}-callout` : frame.lines.length ? `${id}-line` : frame.breaks && frame.breaks !== "empty" ? `${id}-bounds` : undefined;
  // The place pulse wraps the column, so the column's own class stays one literal: its buttons stand on its 12px gap
  // (`test:visual-pass-r9a` 5.2 reads the class).
  return <div className={cn(pulse && "ud-place-pulse")}><div className="kp-jud" data-jud="confirm">
    <Chip variant={side === "UP" ? "yes" : "no"} size="lg" metrics="status" className="kp-jud__chosen" data-testid="jud-chosen">{fill(t.journey.sheetChosen, { side: word })}</Chip>
    <StakeRows id={id} t={t} locale={locale} nowMs={nowMs} frame={frame} text={text} setText={setText} size="detail" disabled={bet.pending} />
    {projected !== null && <p className="kp-bsheet__compact kp-jud__projection" data-testid="jud-projection">{fillNodes(t.journey.estimateCompact, { amount: <span className="amount">{formatTzs(projected)}</span> })}</p>}
    <BlockedNote t={t} locale={locale} nowMs={nowMs} frame={frame} id={id} />
    <LowBlock t={t} locale={locale} nowMs={nowMs} frame={frame} calloutId={`${id}-callout`} railNames={live?.facts?.deposit.railNames ?? []} cashHidden={cashHidden}
      depositAmount={depositAmount} onDepositAmount={setDepositAmount} onDeposit={(amount) => deposit(side, frame.stake, amount)} onClose={() => {}}
      instead={instead && <Button type="button" variant="ghost" size="xl" fullWidth className="kp-bsheet__instead" data-testid="jud-use-instead"
        onClick={() => setText(String(instead.stake))}><span>{fillNodes(t.journey.udUseInstead, { amount: <span className="amount">{formatTzs(instead.stake)}</span> })}</span></Button>} />
    <Lines t={t} locale={locale} nowMs={nowMs} frame={frame} id={id} />
    {bet.locallyLocked && <p className="kp-jud__prompt">{t.market.udErrSelectionClosed}</p>}
    {notice?.below && <HouseLeanWarning level="below" stakeShare below={{ side: word, ...notice.below }} className="mb-2" />}
    <Button type="button" variant="gold" size="xl" fullWidth className="kp-bsheet__commit" data-testid="jud-place" disabled={!ready}
      aria-busy={bet.pending || undefined} aria-describedby={describedBy} onClick={() => { if (ready) bet.place(side); }}>
      {bet.pending ? <><Spinner size={14} /><span>{t.market.udPlacing}</span></>
        : <span>{frame.stake !== null && frame.breaks === null ? <SheetSentence t={t} locale={locale} nowMs={nowMs} line={{ key: "journey.placeCta", vars: { amount: frame.stake } }} /> : t.journey.placeCtaBare}</span>}
    </Button>
    <EmptySideNote t={t} side={judEmptySide(round.pricing, side)} />
    {projected !== null && <p className="kp-jud__note"><I.info s={11} className="mt-[2px] shrink-0" /><span>{noticeBody(t.market.udEstimateNote)}</span></p>}
    {projected !== null && notice?.quote && notice.feePct !== null && notice.taxPct !== null && !notice.noTaker && (
      <p className="kp-jud__note"><I.info s={11} className="mt-[2px] shrink-0" /><span>{noticeBody(fill(t.market.ssFeeNote, { fee: notice.feePct, tax: notice.taxPct }))}</span></p>
    )}
    <StandingNote t={t} shown={notice !== null} />
    <span aria-live="polite" className="sr-only">{bet.liveMessage}</span>
    <UpDownBetBlockedModal blocked={bet.blocked} onClose={bet.clearBlocked} />
    {receipt && <UpDownBetReceiptModal key={bet.placedReceipt?.nonce ?? 0} placed={bet.placedReceipt} info={receipt} pricing={round.pricing}
      assetName={assetName} onClose={bet.clearPlacedReceipt} />}
  </div></div>;
}

/**
 * ⭐ THE ROUND THAT CLOSED WHILE THE PLAYER WAS AWAY (S12-PLAN WP11; the S4 board `s4-11-updown-round-closed`). Drawn on
 * the round page for a journey reader who came back with a bet for this round (`?bet=udr_…`, or `?side=`) and found its
 * selection shut: the notice, the money line only with a CONFIRMED deposit read from S9's owned status (never the
 * address), the next round's start only from an instant the server knows, and — once the next round exists — the way to
 * it with the side and the stake the player carried. ⛔ The button only NAVIGATES: the next round's panel opens preset
 * and places nothing until the player taps. E-166's automatic hop is untouched (it carries no stake).
 */
export function JudRoundClosed({ roundId, side, notice, viewer }: { roundId: string; side: JudSide; notice: JudClosedNotice; viewer: JudViewer | null }) {
  const { t } = useT();
  const id = useId();
  const [carried, setCarried] = useState<number | null>(null);
  useEffect(() => {
    if (!viewer) return;
    try {
      const bet = parseBetParam(new URLSearchParams(window.location.search).get("bet"));
      if (!bet || bet.kind !== "round" || bet.id !== roundId || bet.side !== side) return;
      setCarried(stakeFromUrl(bet, window.sessionStorage.getItem(PENDING_BET_KEY), Date.now(), viewer.viewerId));
    } catch { /* private storage: the next round opens at its minimum */ }
  }, [roundId, side, viewer]);
  const next = notice.successorRoundId;
  const keepMarker = () => {
    if (!next || carried === null) return;
    try {
      const stamp = Date.now();
      const marker = readMarker(writeMarker(judBet(next, side, carried), stamp, attributionFrom(new URLSearchParams(window.location.search)), undefined, viewer?.viewerId), stamp);
      if (JUD_TAB_MARKER && marker && quarantineLegacySheet(window.sessionStorage)) saveSheetSelection(window.sessionStorage, JSON.stringify(marker));
    } catch { /* the next round then opens at its minimum */ }
  };
  // The paid line's words on either side of its figure go through the keep ("Pesa zako", "salio lako" held whole, as every
  // notice body), and the figure stays the mono money span (§M4).
  const time = notice.nextOpensAtMs === null ? null : fmtEATClock(notice.nextOpensAtMs);
  return <div className="kp-jud" data-jud="closed">
    <div id={`${id}-note`} role="status"><Callout tone="info" glyph="info" title={t.journey.udRoundClosedTitle}>
      {(notice.paidAmount !== null || time !== null) && <p>
        {notice.paidAmount !== null && <>{noticeBody(t.journey.udRoundClosedPaid.split("{amount}")[0])}<span className="amount">{formatTzs(notice.paidAmount)}</span>{noticeBody(t.journey.udRoundClosedPaid.split("{amount}")[1] ?? "")}</>}
        {notice.paidAmount !== null && time !== null && " "}
        {time !== null && fillNodes(t.journey.udNextRoundAt, { time: <span className="kp-jud__time">{time}</span> })}
      </p>}
    </Callout></div>
    {next && <Link href={judNextRoundHref(next, side, carried) as never} prefetch={false} onClick={keepMarker} aria-describedby={`${id}-note`}
      className="btn btn-primary btn-lg w-full justify-center" data-testid="jud-next-round">{t.journey.udNextRoundGo}</Link>}
  </div>;
}
