"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CloseX, Modal } from "@/components/ui/modal";
import { I } from "@/components/ui/glyphs";
import { SteppedProgress } from "@/components/markets/stepped-progress";
import { useCountdown } from "@/components/updown/round-countdown";
import { eatClock, eatWeekdayClock, joinList, reserveLabel, weekWord } from "@/components/maswali/maswali-format";
import { useT } from "@/lib/i18n";
import { fillNodes, moneyRuns } from "@/lib/fill-nodes";
import { MAIN_COUNT, RESERVE_COUNT, SLOT_COUNT, slotOf, type MaswaliPick } from "@/lib/maswali-score";
import { sideWord } from "@/lib/side-label";
import { cn, fill, formatTzs } from "@/lib/utils";
import { stemOf } from "@/lib/display-stem";

/**
 * THE SLIP — fill a ticket (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.5–§3.6; the v6 delivery's S-purchase frames).
 * `/millionea/slip`, the reading tier: fifteen rows built from the platform's own pick controls, the reserves on the
 * inset material under a divider that carries the rule, and the pay control — a sticky rail docked above the tabs below
 * 1280, a sticky panel beside the questions from 1280 (L8: one column with the rail below 1280).
 *
 * ⭐ ONE LIT CONTROL PER ROW, and the betting ink only on it: an unanswered or unchosen side is a ghost on the control
 * border; the chosen one takes its side's button with the check (§B2). Fifteen answers arm the rail's "Endelea" in the
 * brand primary — never gilt (§M3a: the gold sits only on the confirm sheet's armed commit). Before fifteen it is a ghost
 * "Jibu maswali 15" that, tapped, answers with an inline refusal naming the unanswered questions and a way to the first.
 * ⛔ THE COUNTDOWN LIVES HERE AND IN THE HUB'S BUY BLOCK ONLY (§10 §8): `MaswaliClosingPill`, in the last hour, counting
 * minutes as the Yes/No markets do (Q5). The printed close stays in the head at every moment.
 * ⛔ NO FIGURE BUT THE PRICE. No jackpot, no potential payout, no pick aggregate: the slip states the rules and the price.
 * The picks are the composer's (controlled), so the slip it keeps in session storage comes back intact after a deposit,
 * and nothing here ever places a ticket by itself — the commit is the player's press on the confirm sheet.
 */

/** One of the week's fifteen questions as the slip asks it. */
export type SlipQuestion = {
  role: "MAIN" | "RESERVE";
  ordinal: number;
  /** The category, in the reader's words. */
  category: string;
  /** The question, in the reader's language (questions are data). */
  text: string;
  /** The source the officer named for its result. */
  source: string;
  /** When its event starts (ms). */
  eventAt: number | null;
};

/** The fifteen picks by slot − 1 (null: not answered yet). */
export type SlipPicks = readonly (MaswaliPick | null)[];

const slotOfQ = (q: SlipQuestion) => slotOf(q.role, q.ordinal);
const labelOf = (q: SlipQuestion) => (q.role === "MAIN" ? String(q.ordinal) : reserveLabel(q.ordinal));

/** How many mains and reserves are answered (the rail's two groups). */
export function slipProgress(picks: SlipPicks): { mains: number; reserves: number; ready: boolean } {
  let mains = 0, reserves = 0;
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    if (!picks[slot - 1]) continue;
    if (slot <= MAIN_COUNT) mains++; else reserves++;
  }
  return { mains, reserves, ready: mains === MAIN_COUNT && reserves === RESERVE_COUNT };
}

/**
 * The closing pill — only in the sales' last hour, minutes counted down (Q5; the Yes/No markets' own threshold, C1a).
 * `compact` is the rail's pill (the minutes alone); the panel and the hub's buy block say it in full.
 */
const CLOSING_SOON_MS = 60 * 60 * 1000;
export function MaswaliClosingPill({ closesAt, serverNow, compact, className }: {
  closesAt: number;
  serverNow: number;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useT();
  const left = useCountdown(closesAt, serverNow);
  if (left === null || left <= 0 || left * 1000 > CLOSING_SOON_MS) return null;
  const mins = Math.max(1, Math.ceil(left / 60));
  return (
    <span
      className={cn(
        "closing-pill inline-flex items-center whitespace-nowrap rounded-full border text-body-sm tabular-nums",
        compact ? "h-5 gap-1 px-1.5" : "gap-1.5 px-3",
        className,
      )}
      style={compact ? undefined : { minHeight: "var(--h-control-sm)" }}
    >
      <I.hourglassHalf s={compact ? 12 : 14} className="shrink-0" />
      {compact ? `${mins} ${t.common.minsUnit}` : `${t.market.closingSoon} · ${mins} ${t.common.minsUnit}`}
    </span>
  );
}

/** The picks as a two-column list ("4 · NDIO"), the reserves grouped under their own head (the panel, the confirm). */
function PicksList({ questions, picks }: { questions: readonly SlipQuestion[]; picks: SlipPicks }) {
  const { t } = useT();
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
      {(["MAIN", "RESERVE"] as const).map((role) => [
        <span key={`${role}-head`} className="col-span-2 pt-1.5 font-mono text-caption uppercase eyebrow text-text-subtle">
          {role === "MAIN" ? t.millionea.mains : t.millionea.reserves}
        </span>,
        ...questions.filter((q) => q.role === role).map((q) => {
          const p = picks[slotOfQ(q) - 1];
          return (
            <span key={`${role}-${q.ordinal}`} className={cn("flex gap-1.5 text-body-sm", p ? "text-text" : "text-text-subtle")}>
              <span className="w-5 shrink-0 font-mono text-text-subtle">{labelOf(q)}</span>
              <span className="font-mono">{p ? sideWord(t, p, "MASWALI") : "—"}</span>
            </span>
          );
        }),
      ])}
    </div>
  );
}

function SlipRow({ q, pick, closed, flagged, onPick }: {
  q: SlipQuestion;
  pick: MaswaliPick | null;
  closed: boolean;
  flagged: boolean;
  onPick: (pick: MaswaliPick) => void;
}) {
  const { t } = useT();
  const reserve = q.role === "RESERVE";
  const yesLit = pick === "YES", noLit = pick === "NO";
  const rowId = `q-${labelOf(q)}`;
  const yesRef = useRef<HTMLButtonElement>(null);
  const noRef = useRef<HTMLButtonElement>(null);
  /**
   * ⭐ ONE RADIO GROUP PER QUESTION (the S5 UI review, MEDIUM 5; the APG radio group): the two answers are radios, named by
   * the question's number and its words, and the group is ONE Tab stop — the chosen answer holds it, or Ndio before either
   * is chosen (fifteen stops, never thirty identical "Ndio"/"Hapana" ones). An arrow moves to the other answer AND chooses
   * it, as a radio group does; Space and Enter choose the focused one (a native button's own click). ⛔ No <label> and no
   * preventDefault on a click: the pick stays the button's own press (the platform's checkbox-label trap).
   */
  const onArrow = (e: KeyboardEvent<HTMLDivElement>) => {
    if (closed) return;
    const arrow = e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!arrow) return;
    e.preventDefault();
    // Two answers: every arrow goes to the other one, wrapping at either end.
    const to: MaswaliPick = document.activeElement === yesRef.current ? "NO" : "YES";
    onPick(to);
    (to === "YES" ? yesRef : noRef).current?.focus();
  };
  const meta = [fill(t.millionea.sourceLine, { source: q.source }), q.eventAt === null ? null : fill(t.millionea.eventAt, { when: eatWeekdayClock(t, q.eventAt) })]
    .filter(Boolean).join(" · ");
  return (
    <li
      id={`q-${labelOf(q)}`}
      className={cn(
        "grid scroll-mt-[96px] grid-cols-[28px_1fr] items-start gap-x-2 gap-y-1.5 border-t border-border py-3 md:grid-cols-[28px_1fr_248px] xl:grid-cols-[28px_1fr_240px]",
        reserve && "border-x px-3",
      )}
      style={reserve ? { background: "var(--wash-inset)" } : undefined}
    >
      <span id={`${rowId}-n`} className={cn("font-mono text-body font-bold tabular-nums", reserve ? "text-text-subtle" : "text-text-muted")}>{labelOf(q)}</span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{q.category}</span>
        <p id={`${rowId}-t`} className="text-body text-text text-pretty">{q.text}</p>
        <span className="text-body-sm text-text-subtle">{meta}</span>
        {flagged && (
          <span className="self-start rounded-full border border-dashed border-border-strong px-1.5 py-0.5 font-mono text-caption uppercase eyebrow text-text-subtle">
            {t.millionea.unanswered}
          </span>
        )}
      </div>
      {/* One lit control per row: the chosen side in its betting ink with the check, the other a ghost (§B2). Closed, the two
          rest at the disabled control's own opacity — never multiplied by a second one on this wrapper, which left the
          player's own pick at about a fifth of its ink (the S5 UI review, LOW 8). */}
      <div
        role="radiogroup"
        aria-labelledby={`${rowId}-n ${rowId}-t`}
        aria-disabled={closed || undefined}
        onKeyDown={onArrow}
        className="col-start-2 grid grid-cols-2 gap-2 md:col-start-3 md:row-start-1"
      >
        <Button ref={yesRef} type="button" role="radio" aria-checked={yesLit} tabIndex={noLit ? -1 : 0} size="md" variant={yesLit ? "yes" : "ghost"}
          disabled={closed} onClick={() => onPick("YES")}
          leading={yesLit ? <I.check s={16} /> : undefined} className={yesLit ? "px-1.5" : "border-border-control px-1.5"}>
          {t.common.yes}
        </Button>
        <Button ref={noRef} type="button" role="radio" aria-checked={noLit} tabIndex={noLit ? 0 : -1} size="md" variant={noLit ? "no" : "ghost"}
          disabled={closed} onClick={() => onPick("NO")}
          leading={noLit ? <I.check s={16} /> : undefined} className={noLit ? "px-1.5" : "border-border-control px-1.5"}>
          {t.common.no}
        </Button>
      </div>
    </li>
  );
}

export function MaswaliSlip({
  week, questions, picks, onPick, closesAt, firstEventAt, serverNow, price, cap, ticketNumber, closed, closedJustNow, onContinue, className,
}: {
  week: number;
  /** All fifteen, mains first. */
  questions: readonly SlipQuestion[];
  picks: SlipPicks;
  onPick: (slot: number, pick: MaswaliPick) => void;
  /** The sales close and the first event (ms): the head prints both, and the close is always earlier (R-WEEK). */
  closesAt: number;
  firstEventAt: number | null;
  serverNow: number;
  /** The ticket price and the weekly cap, from the week's snapshot. */
  price: number;
  cap: number;
  /** This would be the player's n-th ticket of the week. */
  ticketNumber: number;
  /** Sales have closed: the band says so, the controls rest, the rail leaves. */
  closed?: boolean;
  /** …and they closed while the player was looking (M2): the band reveals on the mark's axis. */
  closedJustNow?: boolean;
  /** Fifteen answers and a press on "Endelea": the composer opens the confirm sheet. */
  onContinue: () => void;
  className?: string;
}) {
  const { t, locale } = useT();
  const [refused, setRefused] = useState(false);
  const progress = slipProgress(picks);
  const unanswered = questions.filter((q) => !picks[slotOfQ(q) - 1]);
  const showRefusal = refused && !progress.ready && !closed;
  const mains = questions.filter((q) => q.role === "MAIN");
  const reserves = questions.filter((q) => q.role === "RESERVE");
  const priceText = formatTzs(price);
  const title = fill(t.millionea.slipTitle, { week });
  const progressText = `${fill(t.millionea.mainsProgress, { a: progress.mains })} · ${fill(t.millionea.reservesProgress, { b: progress.reserves })}`;
  const refusalBody = unanswered.length === 0 ? ""
    : unanswered.length === 1
      ? fill(t.millionea.refusalIncompleteOne, { list: labelOf(unanswered[0]) })
      : fill(t.millionea.refusalIncompleteBody, { n: unanswered.length, list: joinList(locale, unanswered.map(labelOf)) });
  const groups = [{ steps: MAIN_COUNT, done: progress.mains }, { steps: RESERVE_COUNT, done: progress.reserves }];
  const press = () => (progress.ready ? onContinue() : setRefused(true));
  const row = (q: SlipQuestion) => (
    <SlipRow key={`${q.role}-${q.ordinal}`} q={q} pick={picks[slotOfQ(q) - 1] ?? null} closed={!!closed}
      flagged={showRefusal && !picks[slotOfQ(q) - 1]} onPick={(p) => onPick(slotOfQ(q), p)} />
  );
  const strong = (s: string) => <span className="font-mono text-text">{s}</span>;
  const rules = [
    t.millionea.reserveRule,
    fill(t.millionea.capRule, { cap, n: ticketNumber }),
    t.millionea.mainOnly,
  ];
  return (
    <div className={cn("flex flex-col", className)}>
      {closed && (
        <p className={cn("flex items-center gap-2 border-b border-border bg-bg-overlay px-3 py-2 text-body-sm text-text", closedJustNow && "m-axis-reveal")}>
          <I.lock s={16} className="shrink-0 text-text-muted" />
          <span>{fillNodes(t.millionea.salesClosedAt, { when: strong(eatWeekdayClock(t, closesAt)) })}</span>
        </p>
      )}
      <div className="grid w-full grid-cols-1 items-start gap-7 py-5 xl:grid-cols-[minmax(0,640px)_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-col gap-1.5">
            <h1 data-stem={stemOf(title)} className="font-display text-title-lg font-bold text-text">{title}</h1>
            <div className="flex flex-col gap-0.5 text-body-sm text-text-muted">
              <span>{fillNodes(t.millionea.salesCloseColon, { when: strong(eatWeekdayClock(t, closesAt)) })}</span>
              {firstEventAt !== null && <span>{fillNodes(t.millionea.firstEventAt, { when: strong(eatWeekdayClock(t, firstEventAt)) })}</span>}
            </div>
          </header>
          <ul className="mat-inset flex flex-col gap-1.5 rounded-control px-3 py-2">
            {rules.map((r) => (
              <li key={r} className="grid grid-cols-[8px_1fr] gap-1.5 text-body-sm text-text-muted">
                <span aria-hidden className="text-text-subtle">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col">
            <ol>{mains.map(row)}</ol>
            <div
              className="mt-3 flex flex-col gap-0.5 rounded-t-card border border-b-0 border-border px-3 pt-2"
              style={{ background: "var(--wash-inset)", boxShadow: "var(--edge-shade)" }}
            >
              <span className="font-mono text-caption uppercase eyebrow text-text-subtle">{t.millionea.reservesHead}</span>
              <span className="text-body-sm text-text-muted text-pretty">{t.millionea.reserveRule}</span>
            </div>
            <ol>{reserves.map(row)}</ol>
            <div aria-hidden className="h-3 rounded-b-card border border-t-0 border-border" style={{ background: "var(--wash-inset)", boxShadow: "var(--edge-shade)" }} />
          </div>
          {/* ONE POLITE REGION, MOUNTED EMPTY FROM THE FIRST RENDER (the S5 UI review, MEDIUM 6; DESIGN_AUTHORITY §A item 7):
              a status mounted together with its words is often not read, so the refusal's words arrive in this one. */}
          <p aria-live="polite" aria-atomic="true" className="sr-only" data-testid="millionea-slip-live">
            {showRefusal && unanswered.length > 0 ? `${t.millionea.refusalIncomplete}. ${refusalBody}` : ""}
          </p>
          {showRefusal && unanswered.length > 0 && (
            <div className="mat-flat flex gap-2 rounded-control px-3 py-2">
              <I.info s={18} className="mt-px shrink-0 text-text-muted" />
              <div className="flex flex-col gap-1">
                <span className="font-display text-body font-semibold text-text">{t.millionea.refusalIncomplete}</span>
                <span className="text-body-sm text-text-muted">{refusalBody}</span>
                <a href={`#q-${labelOf(unanswered[0])}`} className="inline-flex items-center self-start text-body-sm text-text-link hover:text-text-linkHover" style={{ minHeight: "var(--h-control-md)" }}>
                  {fill(t.millionea.jumpTo, { n: labelOf(unanswered[0]) })}
                </a>
              </div>
            </div>
          )}
        </div>
        {/* From 1280: the sticky panel replaces the rail — progress, the picks, the price and the cap, the pay control. */}
        {!closed && (
          <aside className="mat-raised sticky top-5 hidden flex-col gap-3 rounded-card p-4 xl:flex">
            <div className="flex flex-col gap-1.5">
              <SteppedProgress groups={groups} />
              <span className="font-mono text-body-sm text-text-muted">{progressText}</span>
            </div>
            <PicksList questions={questions} picks={picks} />
            <div className="flex flex-col gap-1 border-t border-border pt-2 text-body-sm text-text-muted">
              <div className="flex justify-between gap-2"><span>{t.millionea.price}</span><span className="amount text-text">{priceText}</span></div>
              <span>{fill(t.millionea.capRule, { cap, n: ticketNumber })}</span>
            </div>
            <MaswaliClosingPill closesAt={closesAt} serverNow={serverNow} className="self-start" />
            <div className="flex flex-col gap-2">
              {progress.ready ? (
                <Button type="button" variant="primary" size="lg" fullWidth onClick={press}>{moneyRuns(fill(t.millionea.continueAt, { price: priceText }))}</Button>
              ) : (
                <Button type="button" variant="ghost" size="lg" fullWidth onClick={press} className="border-border-control">{t.millionea.answerAll}</Button>
              )}
            </div>
          </aside>
        )}
      </div>
      {/* Below 1280: the rail, docked on the tab bar (its 64px row and 1px edge, `.kp-rail`) below 1024 and on the floor
          above it, casting upward. */}
      {!closed && (
        <div className="sticky bottom-[calc(65px+env(safe-area-inset-bottom,0px))] z-30 flex items-center gap-2 border-t border-border-strong px-3 py-2 shadow-overlay-up lg:bottom-0 xl:hidden" style={{ background: "var(--panel)" }}>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <SteppedProgress groups={groups} />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-body-sm text-text-muted">{progressText}</span>
              <MaswaliClosingPill closesAt={closesAt} serverNow={serverNow} compact />
            </div>
          </div>
          {progress.ready ? (
            <Button type="button" variant="primary" size="md" onClick={press} className="shrink-0">{moneyRuns(fill(t.millionea.continueAt, { price: priceText }))}</Button>
          ) : (
            <Button type="button" variant="ghost" size="md" onClick={press} className="shrink-0 border-border-control">{t.millionea.answerAll}</Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * THE CONFIRM SHEET (§3.6; S10–S15) — a sheet on a phone, a dialog from 640: the fifteen picks, where the money comes from,
 * which ticket of the cap this is, the free-cancel line (absent when the close is too near for one), the fee rule, and the
 * one gilt control on the slip: the armed commit (§M3a). In flight it carries the kit's spinner; nothing else changes.
 * With the main balance short, the platform's own deposit entry (`depositDoor`, the composer's) replaces the commit.
 */
export function MaswaliSlipConfirm({
  open, onClose, week, questions, picks, price, balance, ticketNumber, cap, cancelUntil, pct, lowBalance, depositDoor, pending, onCommit,
}: {
  open: boolean;
  onClose: () => void;
  week: number;
  questions: readonly SlipQuestion[];
  picks: SlipPicks;
  price: number;
  /** The main balance (bonus money never counts here). */
  balance: number;
  ticketNumber: number;
  cap: number;
  /** When the free cancel would end (ms), or null when the close is too near for one (MR-12's runway). */
  cancelUntil: number | null;
  /** The week's fee rate, as a number of percent. */
  pct: number;
  /** The main balance is below the price: say so, and offer the deposit entry instead of the commit. */
  lowBalance?: boolean;
  depositDoor?: ReactNode;
  pending?: boolean;
  onCommit: () => void;
}) {
  const { t } = useT();
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const commitRef = useRef<HTMLButtonElement>(null);
  const priceText = formatTzs(price);
  const balanceText = formatTzs(balance);
  const lines = [
    fill(t.millionea.fromMain, { price: priceText, balance: balanceText }),
    fill(t.millionea.ticketNofCap, { n: ticketNumber, cap }),
    cancelUntil === null ? null : fill(t.millionea.cancelFreeUntil, { time: eatClock(cancelUntil) }),
    fill(t.millionea.ruleShared, { pct }),
  ].filter((l): l is string => l !== null);
  return (
    // Focus opens on the commit, whose press IS the act (the bet confirm's rule), and the way out is named (`safeFocus`), so
    // an Enter meant for a dialog drawn over this one can at worst close it. Short of money, focus opens on the way out.
    <Modal open={open} onClose={() => { if (!pending) onClose(); }} sheet maxWidth={480} labelledBy={titleId} ariaBusy={pending}
      safeFocus={cancelRef} initialFocus={lowBalance ? cancelRef : commitRef} closeOnScrim={!pending} closeOnEsc={!pending}
      showClose={false}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-mono text-label uppercase eyebrow text-text-subtle">{`${t.millionea.productTitle} · ${weekWord(t, week)}`}</span>
            <h2 id={titleId} className="font-display text-title-md font-semibold text-text">{t.millionea.confirmTitle}</h2>
          </div>
          {/* ⭐ THE HEADER ROW'S ✕, as the bet confirm's (the one convention, `CloseX` in modal.tsx; r6c §10 "header-row"):
              this sheet opens on its eyebrow, so the ✕ comes to the TITLE's first line — under the 16px eyebrow line and
              2px, its capitals centre 18 + 28/2 − 0.025 × 22 = 31.45px down; the 48px box centres 24px down, so `mt-[7.5px]`
              lowers it and `-mb-[7.5px]` gives the room back. 16px inside the panel's edge, as Modal pins every ✕ (the
              panel's `p-5 lg:p-6`, stepped out 8px / 16px). While the cut is in flight it is WITHHELD (the in-flight rule,
              r5a 8.13): Ghairi is disabled then, and its box stays, so the title never moves. */}
          <CloseX withheld={pending} onClick={() => { if (!pending) onClose(); }} label={t.common.close}
            className="mt-[7.5px] -mb-[7.5px] -mr-1.5 lg:-mr-3 shrink-0" />
        </div>
        <PicksList questions={questions} picks={picks} />
        <div className="flex flex-col gap-1 border-t border-border pt-2 text-body-sm text-text-muted">
          {lines.map((l) => <p key={l} className="text-pretty">{moneyRuns(l)}</p>)}
        </div>
        {lowBalance && (
          <>
            <div className="flex gap-2 rounded-control border border-warning-border bg-warning-bg px-3 py-2">
              <I.warning s={18} className="mt-px shrink-0 text-warning-fg" />
              <p className="text-body-sm text-text">{moneyRuns(fill(t.millionea.lowBalanceBody, { balance: balanceText, price: priceText }))}</p>
            </div>
            {depositDoor}
          </>
        )}
        <div className="flex flex-col gap-2">
          {!lowBalance && (
            <Button ref={commitRef} type="button" variant="gold" size="lg" fullWidth className="gilt-metal" loading={pending} onClick={onCommit}>
              {pending ? t.millionea.inFlight : moneyRuns(fill(t.millionea.cutTicket, { price: priceText }))}
            </Button>
          )}
          <Button ref={cancelRef} type="button" variant="ghost" size="md" fullWidth onClick={onClose} disabled={pending}>
            {t.common.cancel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
