"use client";

import {
  Children, cloneElement, isValidElement, memo, useId, useRef,
  type KeyboardEvent, type ReactElement, type ReactNode,
} from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CloseX, Modal, useExitPhase } from "@/components/ui/modal";
import { Callout } from "@/components/ui/callout";
import { I } from "@/components/ui/glyphs";
import { SteppedProgress } from "@/components/markets/stepped-progress";
import { useTickSeconds } from "@/components/updown/round-countdown";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { eatClock, eatWeekdayClock, joinList, reserveLabel, sourceLabel, weekWord } from "@/components/maswali/maswali-format";
import { useT } from "@/lib/i18n";
import { fillNodes, moneyRuns } from "@/lib/fill-nodes";
import { slotOf, type MaswaliPick } from "@/lib/maswali-score";
import { millioneaFreeCancelEnd } from "@/lib/millionea-free-cancel";
import { sideWord } from "@/lib/side-label";
import { useServerNowGated } from "@/lib/use-shared-second";
import { cn, fill, formatNumber, formatTzs } from "@/lib/utils";
import { stemOf } from "@/lib/display-stem";
import type { Locale } from "@/lib/i18n-dict";

/**
 * THE SLIP — fill a ticket (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.5–§3.6; the v6 delivery's S-purchase frames; the
 * design pass of Ali 2026-10-21, "10/10": the slip critic's report and the motion critic's slip items).
 * `/millionea/slip`, the reading tier, on ONE measure at every width (640px, the summary panel's own column): the head (the
 * title, the close and the first event, each with its zone), the ticket switcher when the purchase holds several, the
 * rules (the price before the first answer, the cap), fifteen rows built from the platform's own pick controls, the
 * reserves on ONE inset surface whose head carries their rule, and the pay control — a rail docked full-bleed on the tabs
 * below 1280, a sticky panel beside the questions from 1280 (L8).
 *
 * ⭐ ONE LIT CONTROL PER ROW, and the betting ink only on it: an unanswered or unchosen side is a ghost on the control
 * border; the chosen one takes its side's button with the check (§B2). The check's slot is held in BOTH answers from the
 * first frame and both wear the lit side's type, so a pick changes ink and nothing moves (the motion critic's M1).
 * ⭐ THE PAY CONTROL COUNTS DOWN AND TAKES THE PLAYER THERE (M8, M2): "Answer all 15", then "Answer 3 more"; a press brings
 * the first unanswered question into view and onto the keyboard, marks every unanswered row in its own eyebrow line (a
 * row never changes height) and says which ones in ONE line directly above the control — the bet sheet's rule — never at
 * the list's end, off screen. Armed — every ticket of the purchase answered — it is the brand primary "Continue", never
 * gilt (§M3a: the gold sits only on the confirm sheet's armed commit); while another ticket is incomplete it reads
 * "Finish ticket n" and opens it (H3). One control, never swapped for another, so focus stays on it.
 * ⛔ THE COUNTDOWN LIVES HERE AND IN THE HUB'S BUY BLOCK ONLY (§10 §8): `MaswaliClosingPill`, in the last hour, in the
 * meter's row. The printed close stays in the head at every moment.
 * ⛔ NO FIGURE BUT THE PRICE. No jackpot, no potential payout, no pick aggregate: the slip states the rules and the price.
 * The picks are the composer's (controlled), so the slip it keeps in session storage comes back intact after a deposit,
 * and nothing here ever places a ticket by itself — the commit is the player's press on the confirm sheet.
 * ⭐ SALES CLOSE WHERE THE PLAYER IS LOOKING (H6 + motion H5): the pay control leaves on `.m-out` and the closed statement
 * takes its sticky slot on the mark's axis (`.m-axis-reveal`), with its way on ("Follow the results"); a page drawn after
 * the close shows the same statement in the same place, still.
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

/**
 * How many of the questions the slip ASKS are answered, mains and reserves (the rail's two groups), and of how many. ⭐
 * S5-FIX-PLAYER P10: a question sealed VOID before the close is filled by the slip itself and asked of nobody (MB-15) — it is
 * in neither a count nor a total, so a slip with one such question opens on "Main 0/9" and arms at "Main 9/9", never "Main
 * 1/10" before any tap. `questions` is the slip's own list (the voided one is not in it).
 */
export function slipProgress(picks: SlipPicks, questions: readonly SlipQuestion[]): {
  mains: number; reserves: number; mainsOf: number; reservesOf: number; ready: boolean;
} {
  let mains = 0, reserves = 0, mainsOf = 0, reservesOf = 0;
  for (const q of questions) {
    const answered = !!picks[slotOfQ(q) - 1];
    if (q.role === "MAIN") { mainsOf++; if (answered) mains++; } else { reservesOf++; if (answered) reserves++; }
  }
  return { mains, reserves, mainsOf, reservesOf, ready: mains === mainsOf && reserves === reservesOf };
}

/** The label of the first question the slip asks that `picks` leaves unanswered, or null when all are answered. */
export function firstUnansweredLabel(picks: SlipPicks, questions: readonly SlipQuestion[]): string | null {
  const q = questions.find((x) => !picks[slotOfQ(x) - 1]);
  return q ? labelOf(q) : null;
}

/** The three clamps of §M6 (the OS preference, the in-app switch, the `minimal` tier), as `exitBeatMs` reads them. */
function motionStill(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true ||
    document.documentElement.classList.contains("kp-reduce-motion") ||
    document.documentElement.getAttribute("data-motion") === "minimal"
  );
}

/**
 * ⭐ TAKES THE PLAYER TO A QUESTION (the slip critic's M8): its row into the middle of the view — smoothly, or at once with
 * motion off — and its answer group onto the keyboard (the radio that holds the group's one Tab stop), so the next key or
 * tap answers it. Nothing happens for a label the page does not draw.
 */
export function focusQuestion(label: string): void {
  if (typeof document === "undefined") return;
  const row = document.getElementById(`q-${label}`);
  if (!row) return;
  row.scrollIntoView({ block: "center", behavior: motionStill() ? "auto" : "smooth" });
  row.querySelector<HTMLButtonElement>('[role=radio][tabindex="0"]')?.focus({ preventScroll: true });
}

/**
 * ⭐ EVERY NUMERAL IS MONO (§T5, "including numbers inside body sentences when they are data"; the slip critic's M5): a
 * fact's digit runs — "1 of 10", "14:07", "10/10", "13%" — in the numeral face, tabular, its words untouched; a money
 * figure is already an `.amount` and is left as it is. Walks the nodes a fact was laid out in (`keepFact`'s kept runs).
 */
const DIGITS = /\d+(?:[.,:/–-]\d+)*%?/g;
function monoDigits(node: ReactNode, key = "d"): ReactNode {
  if (typeof node === "string") {
    const out: ReactNode[] = [];
    let last = 0, i = 0;
    for (const m of node.matchAll(DIGITS)) {
      const at = m.index ?? 0;
      if (at > last) out.push(node.slice(last, at));
      out.push(<span key={`${key}-${i++}`} className="font-mono tabular-nums">{m[0]}</span>);
      last = at + m[0].length;
    }
    if (out.length === 0) return node;
    if (last < node.length) out.push(node.slice(last));
    return out;
  }
  if (Array.isArray(node)) return node.map((n, i) => monoDigits(n, `${key}-${i}`));
  if (isValidElement<{ className?: string; children?: ReactNode }>(node)) {
    if (/\b(?:amount|font-mono)\b/.test(node.props.className ?? "")) return node;
    const kids = node.props.children;
    if (kids === undefined) return node;
    return cloneElement(node as ReactElement<{ children?: ReactNode }>, undefined,
      ...Children.toArray(kids).map((n, i) => monoDigits(n, `${key}-${i}`)));
  }
  return node;
}

/** A dictionary fact line, laid out as facts (A1) with its phrases kept whole and every numeral mono. */
function factLine(locale: Locale, line: string): ReactNode[] {
  return factsOf(line).map((f, i) => monoDigits(keepFact(locale, f), `f${i}`));
}

/**
 * The closing pill — only in the sales' last hour, minutes counted down (Q5; the Yes/No markets' own threshold, C1a).
 * `compact` is the rail's and the panel's pill (the minutes, its words for a screen reader); the hub's buy block says it in
 * full. ⭐ SEEDED FROM THE SERVER'S INSTANT (the motion critic's M8): the first render — the server's too — already holds the
 * minutes, so a page opened in the last hour draws its pill from the first paint and nothing grows after hydration.
 */
const CLOSING_SOON_MS = 60 * 60 * 1000;
export function MaswaliClosingPill({ closesAt, serverNow, compact, className }: {
  closesAt: number;
  serverNow: number;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useT();
  const left = useTickSeconds(closesAt, serverNow, true, serverNow);
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
      {compact ? <><span className="sr-only">{t.market.closingSoon} · </span>{`${mins} ${t.common.minsUnit}`}</> : `${t.market.closingSoon} · ${mins} ${t.common.minsUnit}`}
    </span>
  );
}

/**
 * The picks as a two-column list ("4 · NDIO"), the reserves grouped under their own head (the panel, the confirm). ⭐ Each
 * answer in its side's ink (`--yes-300` / `--no-300`, the bet confirm's `sideTone.fg`; the slip critic's M5), so fifteen
 * picks are checked at a glance; an unanswered one is a quiet "—".
 */
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
            <span key={`${role}-${q.ordinal}`} className="flex gap-1.5 text-body-sm">
              <span className="w-5 shrink-0 font-mono text-text-subtle">{labelOf(q)}</span>
              <span className="font-mono font-semibold" style={{ color: p === "YES" ? "var(--yes-300)" : p === "NO" ? "var(--no-300)" : "var(--text-subtle)" }}>
                {p ? sideWord(t, p, "MASWALI") : "—"}
              </span>
            </span>
          );
        }),
      ])}
    </div>
  );
}

/**
 * One question. ⭐ MEMOISED (the slip critic's M12, the motion critic's L7): its props are the question, its own pick and
 * two flags, and the composer's ONE stable `onPick(slot, pick)` — so a pick re-renders its own row and the counts, never
 * the fifteen.
 */
const SlipRow = memo(function SlipRow({ q, pick, closed, flagged, onPick }: {
  q: SlipQuestion;
  pick: MaswaliPick | null;
  closed: boolean;
  flagged: boolean;
  onPick: (slot: number, pick: MaswaliPick) => void;
}) {
  const { t, locale } = useT();
  const reserve = q.role === "RESERVE";
  const slot = slotOfQ(q);
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
    onPick(slot, to);
    (to === "YES" ? yesRef : noRef).current?.focus();
  };
  // The source and the event: a fact line (S5 VIS P7, A1) — "Event Saturday 09:00" one run, never "…Saturday" / "09:00".
  const meta = [
    keepFact(locale, fill(t.millionea.sourceLine, { source: sourceLabel(q.source) })),
    q.eventAt === null ? null : <span key="event" className="whitespace-nowrap">{fill(t.millionea.eventAt, { when: eatWeekdayClock(t, q.eventAt) })}</span>,
  ];
  // ⭐ AN UNANSWERED ROW IS MARKED IN ITS OWN EYEBROW LINE ("SPORTS · UNANSWERED"; the motion critic's M2): the line is there
  // either way, so marking a row never moves the rows under the player's finger.
  const eyebrow = [q.category, flagged ? <span key="flag" className="text-text">{t.millionea.unanswered}</span> : null];
  return (
    <li
      id={`q-${labelOf(q)}`}
      data-flagged={flagged || undefined}
      className={cn(
        "grid scroll-mt-[96px] grid-cols-[28px_1fr] items-start gap-x-2 gap-y-1.5 border-t border-border py-3 md:grid-cols-[28px_1fr_248px]",
        reserve ? "px-3" : "kp-mln-row--main",
      )}
    >
      <span id={`${rowId}-n`} className={cn("font-mono text-body font-bold tabular-nums", reserve ? "text-text-subtle" : "text-text-muted")}>{labelOf(q)}</span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-micro uppercase eyebrow text-text-subtle"><MaswaliFacts facts={eyebrow} /></span>
        <p id={`${rowId}-t`} className="text-body text-text text-pretty">{q.text}</p>
        {/* One fact per line below 768 (P3's `phone`): every row's meta is the same two lines, never one row in two. */}
        <span className="text-body-sm text-text-subtle"><MaswaliFacts facts={meta} layout="phone" /></span>
      </div>
      {/* One lit control per row: the chosen side in its betting ink with the check, the other a ghost (§B2). Closed, the two
          rest at the disabled control's own opacity — never multiplied by a second one on this wrapper, which left the
          player's own pick at about a fifth of its ink (the S5 UI review, LOW 8). ⭐ The check's slot is drawn in both from
          the first frame (`invisible` until lit), and both wear the lit side's type (`.kp-mln-answer`): a pick changes the
          ink and nothing moves — the word stood still while the check arrived a frame later, and jumped ~9px (M1). */}
      <div
        role="radiogroup"
        aria-labelledby={`${rowId}-n ${rowId}-t`}
        aria-disabled={closed || undefined}
        onKeyDown={onArrow}
        className="col-start-2 grid grid-cols-2 gap-2 md:col-start-3 md:row-start-1"
      >
        <Button ref={yesRef} type="button" role="radio" aria-checked={yesLit} tabIndex={noLit ? -1 : 0} size="md" variant={yesLit ? "yes" : "ghost"}
          disabled={closed} onClick={() => onPick(slot, "YES")}
          leading={<I.check s={16} className={yesLit ? undefined : "invisible"} />} className={cn("kp-mln-answer px-1.5", !yesLit && "border-border-control")}>
          {t.common.yes}
        </Button>
        <Button ref={noRef} type="button" role="radio" aria-checked={noLit} tabIndex={noLit ? 0 : -1} size="md" variant={noLit ? "no" : "ghost"}
          disabled={closed} onClick={() => onPick(slot, "NO")}
          leading={<I.check s={16} className={noLit ? undefined : "invisible"} />} className={cn("kp-mln-answer px-1.5", !noLit && "border-border-control")}>
          {t.common.no}
        </Button>
      </div>
    </li>
  );
});

export function MaswaliSlip({
  week, questions, picks, onPick, closesAt, firstEventAt, serverNow, price, cap, ticketNumber, ticketName, actionLabel, finish,
  refused, onRefuse, closed, closedJustNow, onContinue, switcher, addTicket, followHref, className,
}: {
  week: number;
  /** All fifteen, mains first. */
  questions: readonly SlipQuestion[];
  picks: SlipPicks;
  /** ONE stable callback for every row (`SlipRow` is memoised on it). */
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
  /** The purchase holds several tickets: the one being answered ("Ticket 2") leads the counts (H3). */
  ticketName?: string;
  /** The composer names the total when several independently answered tickets will be confirmed together. */
  actionLabel?: string;
  /** Another ticket of the purchase is still incomplete: the armed control reads its words and opens it instead (H3). */
  finish?: { label: string; onPress: () => void };
  /** The player pressed the pay control with questions unanswered (the composer holds it, so a landed cut clears it). */
  refused: boolean;
  onRefuse: () => void;
  /** Sales have closed: the controls rest and the closed statement takes the pay control's place. */
  closed?: boolean;
  /** …and they closed while the player was looking (M2): the statement arrives on the mark's axis. */
  closedJustNow?: boolean;
  /** Every ticket answered and a press on "Continue": the composer opens the confirm sheet. */
  onContinue: () => void;
  /** The ticket switcher (several tickets), under the head. */
  switcher?: ReactNode;
  /** "Add another ticket", after the reserves. */
  addTicket?: ReactNode;
  /** Where the closed statement's way on leads (the hub, where the week's results follow). */
  followHref: string;
  className?: string;
}) {
  const { t, locale } = useT();
  const progress = slipProgress(picks, questions);
  const unanswered = questions.filter((q) => !picks[slotOfQ(q) - 1]);
  const showRefusal = refused && !progress.ready && !closed;
  const mains = questions.filter((q) => q.role === "MAIN");
  const reserves = questions.filter((q) => q.role === "RESERVE");
  const priceText = formatTzs(price);
  const title = fill(t.millionea.slipTitle, { week });
  // "Main 0/10 · Reserve 0/5": two whole counts — side by side where they fit, stacked without the "·" where they do not
  // (S5 VIS P7) — each of the questions the slip asks (P10); led by the ticket's name when the purchase holds several (H3).
  const progressFacts = [
    ticketName ? <span key="ticket" className="whitespace-nowrap text-text">{ticketName}</span> : null,
    <span key="mains" className="whitespace-nowrap">{fill(t.millionea.mainsProgress, { a: formatNumber(progress.mains), n: formatNumber(progress.mainsOf) })}</span>,
    <span key="reserves" className="whitespace-nowrap">{fill(t.millionea.reservesProgress, { b: formatNumber(progress.reserves), n: formatNumber(progress.reservesOf) })}</span>,
  ];
  const refusalBody = unanswered.length === 0 ? ""
    : unanswered.length === 1
      ? fill(t.millionea.refusalIncompleteOne, { list: labelOf(unanswered[0]) })
      : fill(t.millionea.refusalIncompleteBody, { n: formatNumber(unanswered.length), list: joinList(locale, unanswered.map(labelOf)) });
  const groups = [{ steps: progress.mainsOf, done: progress.mains }, { steps: progress.reservesOf, done: progress.reserves }];
  // ⭐ THE CONTROL COUNTS DOWN (M8): "Answer all 15" — the number the slip asks (P10) — until the first answer, then the
  // count left; armed, "Continue · TZS 1,000"; another ticket incomplete, "Finish ticket 2" (H3). ONE control.
  const answered = progress.mains + progress.reserves, asked = progress.mainsOf + progress.reservesOf;
  const armed = progress.ready && !finish;
  const payWords: ReactNode = !progress.ready
    ? answered === 0 ? fill(t.millionea.answerAll, { n: formatNumber(asked) }) : fill(t.millionea.answerMore, { n: formatNumber(asked - answered) })
    : finish ? finish.label : moneyRuns(actionLabel ?? fill(t.millionea.continueAt, { price: priceText }));
  const press = () => {
    if (!progress.ready) {
      onRefuse();
      const first = firstUnansweredLabel(picks, questions);
      if (first) focusQuestion(first);
      return;
    }
    if (finish) { finish.onPress(); return; }
    onContinue();
  };
  const row = (q: SlipQuestion) => (
    <SlipRow key={`${q.role}-${q.ordinal}`} q={q} pick={picks[slotOfQ(q) - 1] ?? null} closed={!!closed}
      flagged={showRefusal && !picks[slotOfQ(q) - 1]} onPick={onPick} />
  );
  // A day and its time are one run ("Friday 18:00", A1), in the numeral face (§T5).
  const strong = (s: string) => <span className="whitespace-nowrap font-mono text-text">{s}</span>;
  const capLine = <MaswaliFacts facts={factLine(locale, fill(t.millionea.capRule, { cap: formatNumber(cap), n: formatNumber(ticketNumber) }))} />;
  // ⭐ The price before the first answer, at every width (the slip critic's M7): "TZS 1,000 a ticket · main balance only".
  const priceLine = <MaswaliFacts facts={factLine(locale, fill(t.millionea.priceMainOnly, { price: priceText }))} />;
  // The rules box: the price, and the cap — from 1280 the cap is the summary panel's alone (P7). ⭐ The reserves' rule is
  // said ONCE, in the reserves' own head where it applies (it stood here too).
  const rules: ReadonlyArray<{ key: string; node: ReactNode; className?: string }> = [
    { key: "price", node: priceLine },
    { key: "cap", node: capLine, className: "xl:hidden" },
  ];
  // The one line that says what is still unanswered, directly above the control it explains (the bet sheet's rule, M2).
  const refusalLine = showRefusal && unanswered.length > 0 && (
    <p className="flex items-start gap-1.5 text-body-sm text-text-muted" data-testid="millionea-slip-refusal">
      <I.info s={16} className="mt-px shrink-0 text-text-subtle" />
      <span className="min-w-0">{monoDigits(refusalBody)}</span>
    </p>
  );
  const payButton = (size: "md" | "lg") => (
    <Button type="button" variant={armed ? "primary" : "ghost"} size={size} fullWidth={size === "lg"} onClick={press}
      data-testid="millionea-slip-pay" data-armed={armed || undefined}
      className={cn(size === "md" && "shrink-0", size === "md" && actionLabel && armed && "w-full", !armed && "border-border-control")}>
      {payWords}
    </Button>
  );
  // ⭐ THE CLOSED STATEMENT, where the pay control stood (rail and panel alike) and with its way on beside it (§F4): the lock
  // and "Sales closed · Friday 18:00 EAT", read once through the polite region below when it arrives while looking.
  const closedText = fill(t.millionea.salesClosedAt, { when: `${eatWeekdayClock(t, closesAt)} EAT` });
  const closedLine = (
    <p className="flex min-w-0 flex-1 basis-[14rem] items-start gap-2 text-body-sm text-text">
      <I.lock s={16} tier="fill" className="mt-px shrink-0 text-text-muted" />
      <span className="min-w-0">{fillNodes(t.millionea.salesClosedAt, { when: strong(`${eatWeekdayClock(t, closesAt)} EAT`) })}</span>
    </p>
  );
  // ⭐ THE PAY CONTROL LEAVES BEFORE THE STATEMENT ARRIVES (the motion critic's H5): its own exit beat (`.m-out`, `--t-quick`,
  // nothing under the clamps — Modal's `useExitPhase`), then the closed statement on the mark's axis in the same slot.
  const pay = useExitPhase(!closed, "--t-quick");
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="grid w-full grid-cols-1 items-start gap-7 py-5 xl:grid-cols-[minmax(0,640px)_400px]">
        <div className="flex min-w-0 max-w-[640px] flex-col gap-4">
          <header className="flex flex-col gap-1.5">
            <h1 data-stem={stemOf(title)} className="font-display text-title-lg font-bold text-text">{title}</h1>
            <div className="flex flex-col gap-0.5 text-body-sm text-text-muted">
              <span>{fillNodes(t.millionea.salesCloseColon, { when: strong(eatWeekdayClock(t, closesAt)) })}</span>
              {firstEventAt !== null && <span>{fillNodes(t.millionea.firstEventAt, { when: strong(eatWeekdayClock(t, firstEventAt)) })}</span>}
            </div>
          </header>
          {switcher}
          <ul className="mat-inset flex flex-col gap-1.5 rounded-control px-3 py-2">
            {rules.map((r) => (
              <li key={r.key} className={cn("grid grid-cols-[8px_1fr] gap-1.5 text-body-sm text-text-muted", r.className)}>
                <span aria-hidden className="text-text-subtle">·</span>
                <span className="min-w-0">{r.node}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col">
            <ol>{mains.map(row)}</ol>
            {/* ⭐ THE RESERVES ON ONE INSET SURFACE (§M2: a surface picks a rung — `.mat-inset` — and never composes its wash
                and shadow over three elements), its head carrying their rule; from 768 the mains take its inset, so every
                answer stands in one column (`.kp-mln-row--main`). */}
            <section aria-labelledby="mln-reserves-head" className="kp-mln-reserves mat-inset mt-3 flex flex-col rounded-card">
              <div className="flex flex-col gap-0.5 px-3 pb-2 pt-2.5">
                <span id="mln-reserves-head" className="font-mono text-caption uppercase eyebrow text-text-subtle"><MaswaliFacts facts={factsOf(t.millionea.reservesHead)} /></span>
                <span className="text-body-sm text-text-muted text-pretty">{keepFact(locale, t.millionea.reserveRule)}</span>
              </div>
              <ol>{reserves.map(row)}</ol>
            </section>
            {addTicket && !closed && <div className="mt-4">{addTicket}</div>}
          </div>
          {/* ONE POLITE REGION, MOUNTED EMPTY FROM THE FIRST RENDER (the S5 UI review, MEDIUM 6; DESIGN_AUTHORITY §A item 7):
              a status mounted together with its words is often not read, so the refusal's words arrive in this one. */}
          <p aria-live="polite" aria-atomic="true" className="sr-only" data-testid="millionea-slip-live">
            {closedJustNow ? closedText : showRefusal && unanswered.length > 0 ? `${t.millionea.refusalIncomplete}. ${refusalBody}` : ""}
          </p>
        </div>
        {/* From 1280: the sticky panel replaces the rail — progress, the picks, the price and the cap, the pay control —
            standing under the top bar (`xl:top-[72px]`: the bar's 56px and the market aside's 16px; the slip critic's M1). */}
        <aside className="mat-raised sticky top-[72px] hidden flex-col gap-3 rounded-card p-4 xl:flex" data-testid="millionea-slip-panel">
          <div className="flex flex-col gap-1.5">
            <div className="flex h-5 items-center gap-2">
              <SteppedProgress groups={groups} className="min-w-0 flex-1" />
              {!closed && <MaswaliClosingPill closesAt={closesAt} serverNow={serverNow} compact className="shrink-0" />}
            </div>
            <span className="font-mono text-body-sm text-text-muted"><MaswaliFacts facts={progressFacts} /></span>
          </div>
          <PicksList questions={questions} picks={picks} />
          <div className="flex flex-col gap-1 border-t border-border pt-2 text-body-sm text-text-muted">
            <div className="flex items-baseline justify-between gap-2"><span>{t.millionea.price}</span><span className="amount text-title-sm font-bold text-text">{priceText}</span></div>
            <span>{capLine}</span>
          </div>
          {pay.present ? (
            <div className={cn("flex flex-col gap-2", pay.exiting && "m-out")}>
              {refusalLine}
              {payButton("lg")}
            </div>
          ) : (
            <div className={cn("flex flex-col gap-2", closedJustNow && "m-axis-reveal")} data-testid="millionea-slip-closed">
              {closedLine}
              <Link href={followHref as never} className="btn btn-ghost btn-lg w-full border-border-control">{t.millionea.followResults}</Link>
            </div>
          )}
        </aside>
      </div>
      {/* Below 1280: the rail, docked full-bleed on the tab bar (its 64px row and 1px edge) below 1024 and on the floor above
          it, casting upward. Its row of the meter holds the last hour's pill (so the pill never adds a row), then what is
          unanswered, then the counts beside the pay control. ⭐ In the classic shell its foot leaves the deposit coin's
          crown its own room (`.kp-mln-rail`, the slip critic's M2). Closed, the statement takes its slot. */}
      <div className="kp-mln-rail sticky bottom-[calc(65px+env(safe-area-inset-bottom,0px))] z-30 -mx-3 lg:-mx-6 lg:bottom-0 xl:hidden" data-closed={closed || undefined}>
        {pay.present ? (
          <div className={cn("border-t border-border-strong px-3 py-2 shadow-overlay-up lg:px-6", pay.exiting && "m-out")} style={{ background: "var(--panel)" }}>
            <div className="flex max-w-[640px] flex-col gap-2">
              <div className="flex h-5 items-center gap-2">
                <SteppedProgress groups={groups} className="min-w-0 flex-1" />
                <MaswaliClosingPill closesAt={closesAt} serverNow={serverNow} compact className="shrink-0" />
              </div>
              {refusalLine}
              <div className={cn("flex items-center gap-2", actionLabel && armed && "flex-wrap")}>
                <span className={cn("min-w-0 flex-1 font-mono text-body-sm text-text-muted", actionLabel && armed && "basis-full")}><MaswaliFacts facts={progressFacts} /></span>
                {payButton("md")}
              </div>
            </div>
          </div>
        ) : (
          <div className={cn("border-t border-border-strong px-3 py-2 shadow-overlay-up lg:px-6", closedJustNow && "m-axis-reveal")} style={{ background: "var(--panel)" }}
            data-testid="millionea-slip-closed">
            <div className="flex max-w-[640px] flex-wrap items-center gap-x-3 gap-y-2">
              {closedLine}
              <Link href={followHref as never} className="btn btn-ghost btn-md shrink-0 border-border-control">{t.millionea.followResults}</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The live free cancel a ticket cut NOW would carry (S5-FIX-PLAYER P1): the server-aligned instant through
 * `cancelMaswaliTicket`'s one rule (`millioneaFreeCancelEnd`), asked only while the sheet is open and drawn again only
 * when its minute moves (`useServerNowGated`; the slip critic's M12 — the sheet no longer re-renders every second). Null
 * before the first tick, and whenever the close is too near for one — then the sheet promises none.
 */
function useFreeCancel(open: boolean, serverNow: number, closesAt: number, minutes: number): number | null {
  const endAt = (now: number) => millioneaFreeCancelEnd(now, closesAt, closesAt, minutes);
  const now = useServerNowGated(serverNow, (n) => (open ? `${endAt(n) === null ? "none" : eatClock(endAt(n)!)}` : "shut"));
  return open && now !== null ? endAt(now) : null;
}

/**
 * THE CONFIRM SHEET (§3.6; S10–S15) — the platform's sheet below 1024 and a dialog from it (`sheetUntil="lg"`, the bet
 * sheet's and the Wallet's; the motion critic's L4), built as the bet confirm is (R4-I; the slip critic's M3): a column no
 * taller than the screen less 40px, its picks and facts scrolling inside it, and its answers pinned under them — the total
 * and the main balance, then the one gilt control on the slip (the armed commit, §M3a) over its twin-sized way back
 * ("Back": "Cancel" sat under "Free cancel until…"). In flight it carries the kit's spinner; nothing else changes.
 * ⭐ A SHORT MAIN BALANCE is the bet sheet's own low frame (M4): the kit Callout with the journey's title and Millionea's
 *    words, then the composer's deposit door (`deposit`, from the shortfall plan — H4).
 * ⭐ AN UNKNOWN BALANCE IS NEVER TZS 0 (H5, AGENTS §6): "—" and "Temporarily unavailable", and the server decides.
 * ⭐ SALES CLOSING WHILE IT IS OPEN keep it open (H6): its body becomes the closed statement and its one answer "Got it" —
 *    unless the cut is in flight, which the server answers first.
 */
export function MaswaliSlipConfirm({
  open, onClose, handoff, week, questions, picks, slips, total, balance, ticketNumber, cap, closesAt, serverNow, freeCancelMinutes, pct,
  lowBalance, deposit, closed, pending, onCommit,
}: {
  open: boolean;
  onClose: () => void;
  /** The sheet closes into the stamp: one dim across the two (Modal's `handoff`, the motion critic's H1). */
  handoff?: boolean;
  week: number;
  questions: readonly SlipQuestion[];
  picks: SlipPicks;
  /** Every independently answered ticket in this one atomic purchase; omitted for the original single-ticket view. */
  slips?: readonly SlipPicks[];
  /** What the purchase costs: the price, or the price × the tickets. */
  total: number;
  /** The main balance (bonus money never counts here), or null when it could not be read (unknown, never zero). */
  balance: number | null;
  ticketNumber: number;
  cap: number;
  /** The free cancel a ticket cut now would carry is computed here, live, from these (P1). */
  closesAt: number;
  serverNow: number;
  freeCancelMinutes: number;
  /** The week's fee rate, as a number of percent. */
  pct: number;
  /** The main balance is below the total: say so, and offer the deposit door instead of the commit. */
  lowBalance?: boolean;
  deposit?: ReactNode;
  closed?: boolean;
  pending?: boolean;
  onCommit: () => void;
}) {
  const { t, locale } = useT();
  const titleId = useId();
  const backRef = useRef<HTMLButtonElement>(null);
  const commitRef = useRef<HTMLButtonElement>(null);
  const gotItRef = useRef<HTMLButtonElement>(null);
  const totalText = formatTzs(total);
  const count = slips?.length ?? 1;
  const many = count > 1;
  const cancelUntil = useFreeCancel(open, serverNow, closesAt, freeCancelMinutes);
  // The closed frame waits for a cut in flight: the server answers that first (the stamp, or its refusal).
  const shut = !!closed && !pending;
  const frame = shut ? "closed" : lowBalance ? "low" : "commit";
  const lines = [
    many ? fill(t.millionea.ticketsOfCap, { from: formatNumber(ticketNumber), to: formatNumber(ticketNumber + count - 1), cap: formatNumber(cap) })
      : fill(t.millionea.ticketNofCap, { n: formatNumber(ticketNumber), cap: formatNumber(cap) }),
    cancelUntil === null ? null : fill(t.millionea.cancelFreeUntil, { time: eatClock(cancelUntil) }),
    fill(t.millionea.ruleSharedJackpot, { pct }),
  ].filter((l): l is string => l !== null);
  const closedLine = fill(t.millionea.salesClosedAt, { when: `${eatWeekdayClock(t, closesAt)} EAT` });
  return (
    // Focus opens on the commit, whose press IS the act (the bet confirm's rule), and the way out is named (`safeFocus`), so
    // an Enter meant for a dialog drawn over this one can at worst close it. Short of money, focus opens on the way back;
    // closed, on "Got it" — and a frame that changes while it is open takes focus again (`refocusKey`).
    // `kp-mln-zh` on the panel: the sheet is portalled out of the page's root, so it carries Millionea's Chinese rule itself
    // (S5 VIS A2/A3 — keep-all, and the one label rule keyed on the class).
    <Modal open={open} onClose={() => { if (!pending) onClose(); }} sheet sheetUntil="lg" maxWidth={480} labelledBy={titleId} ariaBusy={pending}
      safeFocus={shut ? gotItRef : backRef} initialFocus={shut ? gotItRef : lowBalance ? backRef : commitRef} refocusKey={pending ? undefined : frame}
      closeOnScrim={!pending} closeOnEsc={!pending} handoff={handoff}
      showClose={false} panelClassName="kp-mln-zh kp-wsheet kp-mln-confirm">
      <div aria-hidden className="kp-wsheet__grab" />
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-mono text-label uppercase eyebrow text-text-subtle"><MaswaliFacts facts={[t.millionea.productTitle, keepFact(locale, weekWord(t, week))]} /></span>
          <h2 id={titleId} className="font-display text-title-md font-semibold text-text">
            {shut ? <MaswaliFacts facts={factLine(locale, closedLine)} /> : many ? fill(t.millionea.confirmTickets, { n: formatNumber(count) }) : t.millionea.confirmTitle}
          </h2>
        </div>
        {/* ⭐ THE HEADER ROW'S ✕, as the bet confirm's (the one convention, `CloseX` in modal.tsx; r6c §10 "header-row"):
            this sheet opens on its eyebrow, so the ✕ comes to the TITLE's first line — under the 16px eyebrow line and
            2px, its capitals centre 18 + 28/2 − 0.025 × 22 = 31.45px down; the 48px box centres 24px down, so `mt-[7.5px]`
            lowers it and `-mb-[7.5px]` gives the room back. 16px inside the panel's edge, as Modal pins every ✕: the
            sheet's panel is the platform sheet's (`.kp-wsheet`, --sp-5 inline at every width), so the box steps out 4px
            (`-mr-1`). While the cut is in flight it is WITHHELD (the in-flight rule, r5a 8.13): the way back is disabled
            then, and its box stays, so the title never moves. */}
        <CloseX withheld={pending} onClick={() => { if (!pending) onClose(); }} label={t.common.close}
          className="mt-[7.5px] -mb-[7.5px] -mr-1 shrink-0" />
      </div>
      {shut ? (
        <p role="alert" className="sr-only">{closedLine}</p>
      ) : (
        <div className="kp-mln-confirm__body" data-testid="millionea-confirm-body">
          {lowBalance && (
            // The bet sheet's own low frame (M4): the kit's info notice with the journey's title, in Millionea's words.
            <Callout tone="info" glyph="alertCircle" title={t.journey.lowTitle}>
              {balance === null ? null : moneyRuns(fill(t.millionea.lowBalanceBody, { balance: formatTzs(balance), price: totalText }))}
            </Callout>
          )}
          {many ? (
            <div className="flex flex-col gap-1" data-testid="millionea-confirm-tickets">
              {slips?.map((slip, i) => (
                <details key={i} className="kp-mln-ticket rounded-control border border-border px-3">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 font-mono text-body-sm text-text">
                    <span className="min-w-0 flex-1">{fill(t.millionea.draftTicket, { n: formatNumber(ticketNumber + i) })}</span>
                    <I.chevronDown s={14} edge="end" aria-hidden className="kp-mln-caret shrink-0 opacity-70" />
                  </summary>
                  <div className="border-t border-border pb-3 pt-2"><PicksList questions={questions} picks={slip} /></div>
                </details>
              ))}
            </div>
          ) : <PicksList questions={questions} picks={picks} />}
          <div className="flex flex-col gap-1 border-t border-border pt-2 text-body-sm text-text-muted">
            {/* Each line a fact line (A1) and every numeral mono (§T5): "Ticket 1 of 10 this week", "Free cancel until 14:07
                EAT", "Jackpot shared equally… · 13% fee at payout". */}
            {lines.map((l) => <p key={l}><MaswaliFacts facts={factLine(locale, l)} /></p>)}
          </div>
        </div>
      )}
      <div className="kp-mln-confirm__foot">
        {shut ? (
          <Button ref={gotItRef} type="button" variant="ghost" size="xl" fullWidth onClick={onClose}>{t.common.gotIt}</Button>
        ) : (
          <>
            {/* ⭐ WHAT IT COSTS AND WHERE IT COMES FROM, pinned over the commit (M5): the total in bold mono at title-sm, then
                the main balance — or, unread, "—" and "Temporarily unavailable" (the bet sheet's BalanceRow). */}
            <dl className="flex flex-col gap-1" data-testid="millionea-confirm-money">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-body text-text-muted">{many ? t.millionea.totalRow : t.millionea.price}</dt>
                <dd className="amount text-title-sm font-bold text-text">{formatTzs(total)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3 text-body-sm text-text-muted">
                <dt>{t.millionea.mainBalanceRow}</dt>
                {balance === null
                  ? <dd className="flex flex-col items-end gap-0.5"><span className="amount" aria-hidden>—</span><span>{t.common.temporarilyUnavailable}</span></dd>
                  : <dd className="amount text-text">{formatTzs(balance)}</dd>}
              </div>
            </dl>
            {lowBalance ? deposit : (
              <Button ref={commitRef} type="button" variant="gold" size="lg" fullWidth className="gilt-metal" loading={pending} onClick={onCommit}
                data-testid="millionea-confirm-commit">
                {pending ? t.millionea.inFlight : moneyRuns(fill(many ? t.millionea.cutTickets : t.millionea.cutTicket, { price: totalText, n: formatNumber(count) }))}
              </Button>
            )}
            <Button ref={backRef} type="button" variant="ghost" size="lg" fullWidth onClick={onClose} disabled={pending}>
              {t.common.back}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
