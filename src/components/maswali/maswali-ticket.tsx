import type { ReactNode } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { Stat } from "@/components/ui/stat";
import { I } from "@/components/ui/glyphs";
import { MaswaliSealLine, SocketGlyph, socketInk, socketWord, type SealLine, type SocketMark } from "@/components/maswali/maswali-seal-line";
import { MaswaliOutcomeStamp } from "@/components/maswali/maswali-outcome-stamp";
import { MaswaliEarnedAmount, MaswaliEarnedStat } from "@/components/maswali/maswali-win-ledger";
import { MillioneaGlyph } from "@/components/maswali/maswali-glyph";
import { eatWeekday, eatWeekdayClock, millioneaWord, reserveLabel, weekWord } from "@/components/maswali/maswali-format";
import { TICKET_SHOWN_KEY, WEEK_STATE_KEY, type TicketShown, type WeekState } from "@/lib/maswali-week-label";
import { playerStatusChip, positionStatusChip } from "@/lib/status-tone";
import { sideWord } from "@/lib/side-label";
import { formatEatDateTime } from "@/lib/eat-day";
import { fillNodes } from "@/lib/fill-nodes";
import { cn, fill, formatTzs } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { slotOf, type MaswaliOutcome, type MaswaliPick } from "@/lib/maswali-score";

/**
 * THE TICKET — a document with a stub (MASWALI-BUILD S5; MASWALI-PLAN §10 §1 and §3.8–§3.16; the v6 delivery's T-ticket
 * frames). `/millionea/tickets/[serial]`, the receipt tier at every width.
 *
 * Top to bottom: the state word and the week, the serial, the Seal Line (24 / 18), the fifteen clauses (each pick; after
 * a seal its stamp and socket), the perforated rule, and the stub (serial, week, price, purchase time, the question
 * set's hash). Once sales close the stub gains its lock line; a refunded or cancelled ticket its stamp line.
 *
 * ⛔ WHAT A TICKET NEVER SAYS: a potential payout, a running score, the number of misses, or a pick aggregate (§C3,
 * §M8a item 9). While the week runs it says how many results are in and how many valid reserves are left, and — in the
 * owner's own words — when it can no longer win. A voided main says a reserve will take its place; the carry plays only
 * once all fifteen are final, so there is never an un-carry (§M8a item 1).
 * ⛔ GOLD: only the won amount, and it comes from `maswali-win-ledger.tsx` (`MaswaliEarnedAmount`); the stub, the price
 * and every other figure here are neutral (§M8a item 7). The won ticket's WORD is success green (§M8a item 8): a
 * Millionea-only row in `STATUS_TONE_EXCEPTIONS`, so the Yes/No and Up & Down won chips keep their own.
 * ⭐ THE MOMENTS ARE THE COMPOSER'S (`play`), each from the seen state ("each fact performs once, for its owner, then
 * rests"): `cut` (N3 on first view after purchase: the perforation reveals on the mark's axis, the stub settles a beat
 * later) or `undo` (N3 reversed on a refund or the player's own cancel, the perforation staying as the record), `press`
 * (N2 on up to four clauses), `carry` (N1), `draw` (M5's line), `lock` (M2's lock line, `.m-seal`) and `reveal` (the stamp
 * line on the axis). Omitted, everything renders its end frame.
 */

/** One of the fifteen questions as the ticket shows it, with this ticket's pick. */
export type TicketClause = {
  role: "MAIN" | "RESERVE";
  ordinal: number;
  /** The question's category, in the reader's words. */
  category: string;
  /** The question, in the reader's language (questions are data). */
  text: string;
  /** When its event starts (ms), or null if not published. */
  eventAt: number | null;
  pick: MaswaliPick;
  /** The sealed outcome, or null while unsealed. */
  outcome: MaswaliOutcome | null;
};

export type TicketMoments = {
  cut?: "cut" | "undo";
  /** Clause slots (1–15) whose stamps land now — at most four (§10 §2). */
  press?: readonly number[];
  carry?: boolean;
  draw?: boolean;
  lock?: boolean;
  reveal?: boolean;
};

/**
 * The chip a ticket's state wears. The platform's position chips (`positionStatusChip`) — LOSS keeps the betting rose by
 * its own recorded ruling — and the one Millionea-only row: a won ticket's chip is the success green (O-6, manifest L4).
 */
export function millioneaTicketChip(shown: TicketShown) {
  switch (shown) {
    case "running": return positionStatusChip("OPEN");
    case "won": return playerStatusChip("MILLIONEA_WIN") ?? "success";
    case "lost": return positionStatusChip("LOSS");
    case "refunded": return positionStatusChip("VOID");
    case "cancelled": return playerStatusChip("CANCELLED") ?? "neutral";
  }
}

/** "Wiki 42 · Wazi" — the week and the state it is in (the check window has its own word inside RESOLVING). */
function weekLine(t: Dict, week: number, state: WeekState, checkWindow: boolean | undefined): string {
  const word = checkWindow ? t.millionea.weekStatusCheck : millioneaWord(t, WEEK_STATE_KEY[state]);
  return `${weekWord(t, week)} · ${word}`;
}

/** What one clause's socket says: its mark, and its words (a stood-in reserve and a voided main name each other). */
function clauseSocket(t: Dict, c: TicketClause, line: SealLine): { mark: SocketMark; words: ReactNode } {
  if (c.role === "MAIN") {
    const m = line.mains[c.ordinal - 1];
    if (!m) return { mark: "awaiting", words: t.millionea.awaiting };
    if (c.outcome === "VOID" && !line.weekVoid) {
      if (m.standIn) {
        return {
          mark: m.mark,
          words: (
            <>
              {t.millionea.void}
              <MillioneaGlyph name="standIn" s={14} />
              {m.standIn}
              {` · ${socketWord(t, m.mark)}`}
            </>
          ),
        };
      }
      // The S5 UI review (MEDIUM 3): when the voided mains already outnumber the reserves that could come back usable,
      // no reserve will take this place — the week is due to be voided (`weekVoidCertain`, the delivery's Timeline D).
      return { mark: "void", words: line.voidCertain ? t.millionea.voidWeekCertain : t.millionea.voidAwaiting };
    }
    return { mark: m.mark, words: socketWord(t, m.mark) };
  }
  const r = line.annex[c.ordinal - 1];
  if (!r) return { mark: "standby", words: t.millionea.standby };
  if (r.carriedTo !== undefined) {
    return {
      mark: r.mark,
      words: (
        <>
          {reserveLabel(c.ordinal)}
          <MillioneaGlyph name="standIn" s={14} />
          {r.carriedTo}
        </>
      ),
    };
  }
  return { mark: r.mark, words: socketWord(t, r.mark) };
}

const slotOfClause = (c: TicketClause) => slotOf(c.role, c.ordinal);

function Clause({ t, c, line, inert, press }: { t: Dict; c: TicketClause; line: SealLine; inert: boolean; press: number }) {
  const reserve = c.role === "RESERVE";
  const voided = c.outcome === "VOID";
  const socket = inert ? null : clauseSocket(t, c, line);
  return (
    <li
      className="grid grid-cols-[28px_1fr] gap-x-2 gap-y-1 border-t border-border px-3 py-2"
      style={{
        ...(reserve ? { background: "var(--wash-inset)" } : null),
        ...(inert ? { opacity: "var(--state-disabled-opacity)" } : null),
      }}
    >
      <span className={cn("font-mono text-body-sm font-bold tabular-nums", reserve ? "text-text-subtle" : "text-text-muted")}>
        {reserve ? reserveLabel(c.ordinal) : c.ordinal}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-micro uppercase eyebrow text-text-subtle">
          {c.eventAt === null ? c.category : `${c.category} · ${eatWeekdayClock(t, c.eventAt)}`}
        </span>
        <p className={cn("text-body-sm text-pretty", voided ? "text-text-muted line-through decoration-border-strong" : "text-text")}>{c.text}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
          <span className="inline-flex gap-1.5 text-body-sm text-text-muted">
            {t.millionea.pick}
            <span className="font-mono font-bold text-text">{sideWord(t, c.pick, "MASWALI")}</span>
          </span>
          {c.outcome !== null && <MaswaliOutcomeStamp t={t} outcome={c.outcome} press={press >= 0} index={press} />}
          {socket && (
            <span className={cn("inline-flex items-center gap-1.5 text-body-sm", socketInk(socket.mark))}>
              <SocketGlyph mark={socket.mark} s={18} />
              <span className="inline-flex flex-wrap items-center gap-x-1">{socket.words}</span>
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export function MaswaliTicket({
  t, locale, serverNow, serial, week, weekState, checkWindow, shown, clauses, line, idBase, stub, closedAt,
  wonAmount, notice, live, cannotWin, seal, cancel, cancelWindowMins, finality, play, className,
}: {
  t: Dict;
  locale: Locale;
  /** The instant the page was rendered on the server (a date's year shows only when it leaves this one). */
  serverNow: number;
  serial: string;
  week: number;
  weekState: WeekState;
  /** RESOLVING, inside the 24-hour check window before payout: the week word says so. */
  checkWindow?: boolean;
  shown: TicketShown;
  /** All fifteen, mains first. */
  clauses: readonly TicketClause[];
  /** `sealLineOf(questions, picks)` — the one grader's answer for this ticket. */
  line: SealLine;
  /** Names the annex sockets for the carry (default: the serial). */
  idBase?: string;
  stub: { price: number; boughtAt: string; questionSetHash: string };
  /** The sales close, once it has passed: the stub's lock line. */
  closedAt?: number;
  /** The amount this ticket was paid (after the seal): the only gold on a ticket. */
  wonAmount?: number;
  /** One line above the Seal Line — a week voided whole, said in the dictionary's sentence. */
  notice?: ReactNode;
  /** While the week resolves: how many results are in, the valid reserves left, the next event. `valid` may be below
   *  zero — the voided mains outnumber the reserves left — and is then said in words, never as a negative (D-20). */
  live?: { resultsIn: number; reservesLeft?: { valid: number; of: number }; nextEventAt?: number };
  /** On the results so far this ticket cannot win (the composer's verdict; never a score). */
  cannotWin?: boolean;
  /** The door that opens the seal on the player's own tap ("Ona matokeo") — the composer's control. */
  seal?: ReactNode;
  /** The free cancel while its window is open (`MaswaliCancelButton` and its dialog) — the composer's control. */
  cancel?: ReactNode;
  /** The window, in minutes, from the week's snapshot: the line under the cancel. */
  cancelWindowMins?: number;
  /** Settled: the finality line, and the attestation's short hash when the week was resolved. */
  finality?: { hash?: string };
  play?: TicketMoments;
  className?: string;
}) {
  const inert = shown === "cancelled";
  // How the ticket ended without a result — its stamp line on the stub — from its one state (the S5 UI review, LOW 11: a
  // second prop let a "Pending" chip sit over an "IMEREJESHWA" stamp).
  const ended = shown === "refunded" || shown === "cancelled" ? shown : undefined;
  const base = idBase ?? `mln-${serial}`;
  // The moments as locals, so each class that names one is a plain condition (the eyebrow census reads them as written).
  const { cut, press, carry, draw, lock, reveal } = play ?? {};
  const pressAt = (c: TicketClause) => {
    const i = press?.indexOf(slotOfClause(c)) ?? -1;
    return i >= 0 && i < 4 ? i : -1;
  };
  const mains = clauses.filter((c) => c.role === "MAIN");
  const reserves = clauses.filter((c) => c.role === "RESERVE");
  const boughtMs = Date.parse(stub.boughtAt);
  const bought = `${eatWeekday(t, boughtMs)} ${formatEatDateTime(boughtMs, serverNow, t.common.monthsShort, locale)}`;
  const liveText = live
    ? [
        fill(t.millionea.resultsOut, { n: live.resultsIn }),
        live.reservesLeft
          ? live.reservesLeft.valid < 0
            ? fill(t.millionea.reservesShort, { b: live.reservesLeft.of })
            : fill(t.millionea.reservesLeft, { a: live.reservesLeft.valid, b: live.reservesLeft.of })
          : null,
        live.nextEventAt !== undefined ? fill(t.millionea.nextEvent, { when: eatWeekdayClock(t, live.nextEventAt) }) : null,
      ].filter(Boolean).join(" · ")
    : null;
  const stampNodes = ended
    ? fillNodes(ended === "refunded" ? t.millionea.refundedLine : t.millionea.cancelledLine, {
        price: <span className="amount">{formatTzs(stub.price)}</span>,
      })
    : null;
  const stubItems: Array<[string, ReactNode]> = [
    [t.millionea.stubSerial, serial],
    [t.millionea.stubWeek, weekWord(t, week)],
    [t.millionea.stubPrice, <span key="p" className="amount">{formatTzs(stub.price)}</span>],
    [t.millionea.stubBought, <time key="t" dateTime={stub.boughtAt}>{bought}</time>],
    [t.millionea.stubHash, stub.questionSetHash],
  ];
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <article className="mat-raised flex flex-col overflow-hidden rounded-card">
        <div className="flex flex-col gap-3 px-3 pb-3 pt-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <Chip metrics="status" variant={millioneaTicketChip(shown)}>{millioneaWord(t, TICKET_SHOWN_KEY[shown])}</Chip>
              <span className="font-mono text-label uppercase eyebrow text-text-subtle">{weekLine(t, week, weekState, checkWindow)}</span>
            </div>
            <span className="font-mono text-title-md font-bold text-text break-all">{serial}</span>
            {wonAmount !== undefined && <MaswaliEarnedAmount t={t} amount={wonAmount} />}
            {notice && <p className="text-body-sm text-text text-pretty">{notice}</p>}
          </div>
          <div className="border-y border-border py-2">
            <MaswaliSealLine line={line} size={24} numbers idBase={base} play={{ carry, draw }} inert={inert} />
          </div>
          {/* ONE POLITE REGION, MOUNTED FROM THE FIRST RENDER (the S5 UI review, MEDIUM 6; DESIGN_AUTHORITY §A item 7): a
              region mounted together with its words is often not read, so this one is always there and only its words
              change — each result that arrives, and the ticket's own word when it changes (the chip says it to the eye). */}
          <p aria-live="polite" aria-atomic="true" data-testid="millionea-ticket-live" className={cn("text-body-sm text-text-muted", !liveText && "sr-only")}>
            <span className="sr-only">{`${millioneaWord(t, TICKET_SHOWN_KEY[shown])}. `}</span>
            {liveText}
          </p>
          {cannotWin && <p className="mat-inset rounded-control px-3 py-2 text-body-sm text-text text-pretty">{t.millionea.cannotWin}</p>}
          {seal}
        </div>
        <ol>
          {mains.map((c) => <Clause key={`m${c.ordinal}`} t={t} c={c} line={line} inert={inert} press={pressAt(c)} />)}
        </ol>
        <div className="flex flex-col gap-0.5 border-t border-border px-3 pb-1.5 pt-2" style={{ background: "var(--wash-inset)", boxShadow: "var(--edge-shade)" }}>
          <span className="font-mono text-caption uppercase eyebrow text-text-subtle">{t.millionea.reservesHead}</span>
          <span className="text-body-sm text-text-muted text-pretty">{t.millionea.reserveRule}</span>
        </div>
        <ol>
          {reserves.map((c) => <Clause key={`r${c.ordinal}`} t={t} c={c} line={line} inert={inert} press={pressAt(c)} />)}
        </ol>
        {/* The perforation: the ticket glyph's notch line at document scale. It reveals on the mark's axis when the stub
            is first cut, and stays as the record when the stub rejoins. */}
        <div aria-hidden className={cn("relative flex h-5 items-center", cut === "cut" && "m-axis-reveal")} style={{ background: "var(--wash-inset)" }}>
          <span className="absolute -left-2 top-0 h-5 w-5 rounded-full border border-border bg-bg" />
          <span className="absolute -right-2 top-0 h-5 w-5 rounded-full border border-border bg-bg" />
          <span className="mx-5 flex-1 border-t border-dashed border-border-strong" />
        </div>
        <div
          className={cn(
            "grid grid-cols-2 gap-x-3 gap-y-2 px-3 pb-4 pt-2",
            cut === "cut" && "maswali-cut",
            cut === "undo" && "maswali-cut-undo",
          )}
          style={{
            background: "var(--wash-inset)",
            boxShadow: "var(--edge-shade)",
            // The stub settles a beat after the blade crosses (M1: the perforation's reveal, then the cut).
            ...(cut === "cut" ? { animationDelay: "var(--t-base)" } : null),
          }}
        >
          {stubItems.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-0.5">
              <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{label}</span>
              <span className="font-mono text-body-sm text-text [overflow-wrap:anywhere]">{value}</span>
            </div>
          ))}
          {closedAt !== undefined && !ended && (
            <p className={cn("col-span-2 flex items-center gap-1.5 text-body-sm text-text-muted", lock && "m-seal")}>
              <I.lock s={14} className="shrink-0" />
              <span>{fill(t.millionea.lockedAt, { when: eatWeekdayClock(t, closedAt) })}</span>
            </p>
          )}
          {stampNodes && (
            <p
              className={cn(
                "col-span-2 inline-flex flex-wrap items-center gap-x-1 justify-self-start border border-border-strong px-2 py-1 font-mono text-label font-bold uppercase eyebrow text-text",
                reveal && "m-axis-reveal",
              )}
              style={{ borderRadius: "var(--r-xs)" }}
            >
              {stampNodes}
            </p>
          )}
        </div>
      </article>
      {cancel && (
        <div className="flex flex-col gap-1.5">
          {cancel}
          {cancelWindowMins !== undefined && (
            <p className="text-center text-body-sm text-text-subtle">{fill(t.millionea.cancelNote, { mins: cancelWindowMins })}</p>
          )}
        </div>
      )}
      {finality && (
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm text-text-muted">{t.millionea.finality}</p>
          {finality.hash && (
            <p className="font-mono text-body-sm text-text-subtle break-all">{`${t.common.resolutionAttestation} · ${finality.hash}`}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A ticket on Tiketi zangu's Millionea segment (T13/T14) — the platform's ticket card, the Seal Line as its title: the
 * week and the state, the line (the card's link), the stake and the payout, the serial and when it was bought.
 * ⛔ The payout is "when the result is in" until the week settles — never a projected figure (§C3, SJ-4); the amount a
 * won ticket was paid is the only gold, from the win ledger.
 */
export function MaswaliTicketCard({ t, locale, serverNow, href, serial, week, shown, line, price, payout, share, placedAt, className }: {
  t: Dict;
  locale: Locale;
  serverNow: number;
  /** The ticket's page. */
  href: string;
  serial: string;
  week: number;
  shown: TicketShown;
  line: SealLine;
  price: number;
  /** What the ticket was finally paid: the share when won AND paid, the price back when refunded or cancelled, 0 when
   *  lost; null while its result is not in — and for a won share held for review or forfeited (`share`). */
  payout: number | null;
  /** A won ticket's share as the settlement and Compliance left it (MB-43, OD-07): a held or a forfeited one shows its
   *  word in the payout's place — never gold, never a figure. */
  share?: "paid" | "held" | "forfeited" | null;
  /** When it was bought (ISO). */
  placedAt: string;
  className?: string;
}) {
  const [placedBefore, placedAfter] = t.journey.ticketPlacedAt.split("{date}");
  return (
    <article className={cn("mat-raised flex min-w-0 flex-col gap-2 p-3", className)} style={{ borderRadius: "var(--r-xl)" }}>
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <Chip size="sm" metrics="base" variant="neutral">{weekWord(t, week)}</Chip>
        <Chip size="sm" metrics="base" variant={millioneaTicketChip(shown)}>{millioneaWord(t, TICKET_SHOWN_KEY[shown])}</Chip>
      </div>
      {/* The card's one link names itself in words as well as by its line (the S5 UI review, MEDIUM 4): until the Phosphor
          swap draws Millionea's new marks, a line of open sockets can be blank, and a link must never be an invisible box. */}
      <Link href={href as never} aria-label={`${t.millionea.viewTicket} · ${serial}`} className="-my-1.5 flex flex-col justify-center gap-1 py-1.5" style={{ minHeight: "var(--h-control-md)" }}>
        <MaswaliSealLine line={line} size={18} annex="below" inert={shown === "cancelled"} />
        <span className="inline-flex items-center gap-1 self-start text-body-sm text-text-link">
          {t.millionea.viewTicket}
          <I.chevronRight s={14} edge="end" className="shrink-0" />
        </span>
      </Link>
      <div className="grid grid-cols-2 gap-2">
        <Stat label={t.dialog.stakeLabel} value={formatTzs(price)} money />
        {shown === "won" && payout !== null ? (
          <MaswaliEarnedStat t={t} amount={payout} />
        ) : shown === "won" && (share === "held" || share === "forfeited") ? (
          <Stat label={t.journey.ticketFinalPayout} value={share === "held" ? t.millionea.shareHeld : t.millionea.shareForfeited} tone="muted" font="body" valueClassName="font-normal text-body-sm leading-snug text-balance" />
        ) : shown === "running" ? (
          <Stat label={t.journey.ticketPayout} value={t.journey.ticketPayoutAtResult} tone="muted" font="body" valueClassName="font-normal text-body-sm leading-snug text-balance" />
        ) : (
          // The S5 UI review (LOW 10): a payout the record does not hold is a dash, never a fabricated TZS 0 (AGENTS §6).
          <Stat label={t.journey.ticketFinalPayout} value={payout === null ? "—" : formatTzs(payout)} money={payout !== null} />
        )}
      </div>
      <div className="flex flex-col gap-1 text-body-sm text-text-muted">
        <p className="flex items-center gap-1.5 break-all font-mono"><I.ticket s={14} className="shrink-0" />{serial}</p>
        <p className="flex items-center gap-1.5">
          <I.clock s={14} className="shrink-0" />
          <span>{placedBefore}<time dateTime={placedAt} className="whitespace-nowrap font-mono tabular-nums">{formatEatDateTime(Date.parse(placedAt), serverNow, t.common.monthsShort, locale)}</time>{placedAfter}</span>
        </p>
      </div>
    </article>
  );
}

/** A held ticket in the hub's buy block (U2): the serial and the Seal Line at 18, the row a link to the ticket. */
export function MaswaliHeldTicketRow({ href, serial, line, className }: { href: string; serial: string; line: SealLine; className?: string }) {
  return (
    <Link href={href as never} className={cn("mat-raised flex flex-col gap-1.5 rounded-control p-2 text-text", className)} style={{ minHeight: "var(--h-control-md)" }}>
      <span className="flex items-center justify-between gap-1.5">
        <span className="font-mono text-body-sm font-bold text-text break-all">{serial}</span>
        <I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle" />
      </span>
      <MaswaliSealLine line={line} size={18} annex="beside" />
    </Link>
  );
}
