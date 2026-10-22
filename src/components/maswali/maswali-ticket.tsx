import type { ReactNode } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { Stat } from "@/components/ui/stat";
import { Callout } from "@/components/ui/callout";
import { I } from "@/components/ui/glyphs";
import { MaswaliSealLine, SocketGlyph, socketInk, socketWord, type SealLine, type SocketMark } from "@/components/maswali/maswali-seal-line";
import { MaswaliOutcomeStamp } from "@/components/maswali/maswali-outcome-stamp";
import { MaswaliEarnedAmount, MaswaliEarnedStat } from "@/components/maswali/maswali-win-ledger";
import { MillioneaGlyph } from "@/components/maswali/maswali-glyph";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { MaswaliMoment, MaswaliTick } from "@/components/maswali/maswali-moment";
import { MaswaliCancelLine } from "@/components/maswali/maswali-ticket-cancel";
import { MaswaliGhostHint } from "@/components/maswali/maswali-ghost-hint";
import { MaswaliStrike } from "@/components/maswali/maswali-strike";
import { eatWeekday, eatWeekdayClock, millioneaWord, reserveLabel, weekWord } from "@/components/maswali/maswali-format";
import { WeekStateChip } from "@/app/millionea/register/register-parts";
import type { MillioneaWeekPhase } from "@/app/millionea/millionea-view";
import { TICKET_SHOWN_KEY, type TicketShown, type WeekState } from "@/lib/maswali-week-label";
import { playerStatusChip, positionStatusChip, type StatusChipVariant } from "@/lib/status-tone";
import { positionStatusGlyph, sideWord } from "@/lib/side-label";
import { formatEatDateTime } from "@/lib/eat-day";
import { fillNodes } from "@/lib/fill-nodes";
import { cn, fill, formatNumber, formatTzs } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { slotOf, type MaswaliOutcome, type MaswaliPick } from "@/lib/maswali-score";

/**
 * THE TICKET — a document with a stub (MASWALI-BUILD S5; MASWALI-PLAN §10 §1 and §3.8–§3.16; the v6 delivery's T-ticket
 * frames). `/millionea/tickets/[serial]`, the receipt tier at every width.
 *
 * Top to bottom: the state word and the week, the serial, the Seal Line (24 / 18), the week's live line, the fifteen
 * clauses (each pick; after a seal its stamp and socket), the perforated rule, and the stub (serial, week, price, purchase
 * time, the question set's hash). Once sales close the stub gains its lock line; a refunded or cancelled ticket its stamp
 * line.
 *
 * ⛔ WHAT A TICKET NEVER SAYS: a potential payout, a running score, the number of misses, or a pick aggregate (§C3,
 * §M8a item 9). While the week runs it says how many results are in and how many valid reserves are left, and — in the
 * owner's own words — when it can no longer win. A voided main says a reserve will take its place; the carry plays only
 * once all fifteen are final, so there is never an un-carry (§M8a item 1).
 * ⛔ GOLD: only the won amount, and it comes from `maswali-win-ledger.tsx` (`MaswaliEarnedAmount`); the stub, the price
 * and every other figure here are neutral (§M8a item 7). The won ticket's WORD is success green (§M8a item 8): a
 * Millionea-only row in `STATUS_TONE_EXCEPTIONS`, so the Yes/No and Up & Down won chips keep their own.
 * ⛔ NO OPACITY ON WORDS (the R1 tickets critic's H2, Ali 2026-10-21 10/10 pass): a ticket that counts for nothing rests
 * through its chip, its Seal Line's rested sockets and its hidden socket words — its question text recedes to the muted
 * ink (11–13:1), never to the disabled opacity, which took the words to 3.1–4.2:1 and faded the VOID stamps that explain
 * the refund.
 * ⭐ THE MOMENTS ARE THE COMPOSER'S (`play`), each from the seen state ("each fact performs once, for its owner, then
 * rests"), and each plays when its part comes into view (`MaswaliMoment`, H3/M8): `cut` (N3 on first view after purchase:
 * the perforation reveals on the mark's axis, the stub settles a beat later) or `undo` (N3 reversed on a refund or the
 * player's own cancel, the perforation staying as the record), `press` (N2 on up to four clauses), `carry` (N1), `draw`
 * (M5's line), `lock` (M2's lock line, `.m-seal`, once after the week's recorded close — L14) and `reveal` (the stamp line
 * on the axis). Omitted, everything renders its end frame.
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
  /** The player's pick — or null where the slip filled the slot itself (a question already VOID when the ticket was cut,
   *  MB-15; S5-FIX-PLAYER P10): drawn "—", never the fill as an answer the player gave. */
  pick: MaswaliPick | null;
  /** The sealed outcome, or null while unsealed. */
  outcome: MaswaliOutcome | null;
};

export type TicketMoments = {
  cut?: "cut" | "undo";
  /** Clause slots (1–15) whose stamps land now — at most four (§10 §2). */
  press?: readonly number[];
  carry?: boolean;
  draw?: boolean;
  /** M2's lock line (`.m-seal`) on the first view after the week's recorded sales close (the "close" fact, L14). */
  lock?: boolean;
  reveal?: boolean;
};

/**
 * The chip a ticket's state wears. The platform's position chips (`positionStatusChip`) — LOSS keeps the betting rose by
 * its own recorded ruling — and the one Millionea-only row: a won ticket's chip is the success green (O-6, manifest L4).
 * A share forfeited after review (round 3) is terminal and inert: the neutral chip, slate's — the tone a cancelled ticket
 * and a forfeited grant wear — never the win's green, and never the loss's rose (it won; the review took its share back).
 * Every state named, with the return type stated, so a new one is a compile error here.
 */
export function millioneaTicketChip(shown: TicketShown): StatusChipVariant | "no" {
  switch (shown) {
    case "running": return positionStatusChip("OPEN");
    case "won": return playerStatusChip("MILLIONEA_WIN") ?? "success";
    case "forfeited": return "neutral";
    case "lost": return positionStatusChip("LOSS");
    case "refunded": return positionStatusChip("VOID");
    case "cancelled": return playerStatusChip("CANCELLED") ?? "neutral";
  }
}

/**
 * The glyph beside a ticket's word and ink (PHOSPHOR-MIGRATION W4: a platform chip is glyph + ink + word; the R1 tickets
 * critic's M1): the platform's position glyphs (`positionStatusGlyph`) for running, won, lost and refunded — the classic
 * and the journey's ticket cards draw the same — and Millionea's own two states: the player's cancel takes the ticket
 * back (`rotateCcw`, the free cancel's own mark), and a share forfeited after review is void.
 */
export function millioneaTicketGlyph(shown: TicketShown): ReturnType<typeof positionStatusGlyph> {
  switch (shown) {
    case "running": return positionStatusGlyph("OPEN");
    case "won": return positionStatusGlyph("WIN");
    case "lost": return positionStatusGlyph("LOSS");
    case "refunded": return positionStatusGlyph("VOID");
    case "cancelled": return { key: "rotateCcw" };
    case "forfeited": return { key: "void" };
  }
}

/** A ticket's state as a chip: its glyph, its ink and its word. */
function TicketStateChip({ t, shown, card }: { t: Dict; shown: TicketShown; card?: boolean }) {
  const g = millioneaTicketGlyph(shown);
  const Glyph = I[g.key];
  return (
    <Chip size={card ? "sm" : "md"} metrics={card ? "base" : "status"} variant={millioneaTicketChip(shown)}>
      <Glyph s={12} tier={g.tier} aria-hidden />
      {millioneaWord(t, TICKET_SHOWN_KEY[shown])}
    </Chip>
  );
}

/**
 * ⭐ A TICKET THAT COUNTS FOR NOTHING RESTS (S5 VIS P10): the player's own cancel, and a voided week's ticket once ITS
 * refund landed ("refunded"). Its Seal Line is at rest (`inert`: every socket the faded ring, never the live "awaiting"
 * one), its question text in the muted ink (H2: never an opacity on words), and its card says the money came back
 * ("Refunded TZS 1,000"), never "Final payout". Every state named, so a new one is a compile error here.
 */
export function ticketRests(shown: TicketShown): boolean {
  switch (shown) {
    case "cancelled": case "refunded": return true;
    case "running": case "won": case "lost": case "forfeited": return false;
  }
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
  const stamp = c.outcome !== null ? <MaswaliOutcomeStamp t={t} outcome={c.outcome} press={press >= 0} index={press} /> : null;
  return (
    <li
      className="grid grid-cols-[28px_1fr] gap-x-2 gap-y-1 border-t border-border px-3 py-2"
      style={reserve ? { background: "var(--wash-inset)" } : undefined}
    >
      <span className={cn("font-mono text-body-sm font-bold tabular-nums", reserve ? "text-text-subtle" : "text-text-muted")}>
        {reserve ? reserveLabel(c.ordinal) : c.ordinal}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-micro uppercase eyebrow text-text-subtle">
          {/* The category and its event's day and time: a fact line, the day never parted from its time (A1). */}
          <MaswaliFacts facts={[c.category, c.eventAt === null ? null : <span key="at" className="whitespace-nowrap">{eatWeekdayClock(t, c.eventAt)}</span>]} />
        </span>
        {/* A voided question drawn through the one strike, which ends at the last mark's ink (`MaswaliStrike`). */}
        <p className={cn("text-body-sm text-pretty", voided || inert ? "text-text-muted" : "text-text")}>{voided ? <MaswaliStrike text={c.text} /> : c.text}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
          <span className="inline-flex gap-1.5 text-body-sm text-text-muted">
            {t.millionea.pick}
            <span className={cn("font-mono font-bold", inert ? "text-text-muted" : "text-text")}>{c.pick ? sideWord(t, c.pick, "MASWALI") : "—"}</span>
          </span>
          {/* A press lands when its stamp comes into view, never on a mount below the fold (H3/M8). */}
          {stamp && (press >= 0 ? <MaswaliMoment as="span" className="inline-flex">{stamp}</MaswaliMoment> : stamp)}
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

/** One field of the stub: its label over its value. */
function StubField({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", wide && "col-span-2")}>
      <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{label}</span>
      <span className="font-mono text-body-sm text-text [overflow-wrap:anywhere]">{children}</span>
    </div>
  );
}

export function MaswaliTicket({
  t, locale, serverNow, serial, week, weekState, phase, shown, clauses, line, idBase, stub, closedAt,
  wonAmount, notice, live, cannotWin, cancel, play, className,
}: {
  t: Dict;
  locale: Locale;
  /** The instant the page was rendered on the server (a date's year shows only when it leaves this one). */
  serverNow: number;
  serial: string;
  week: number;
  weekState: WeekState;
  /** Where the week stands once its results are in (S5-FIX-PLAYER P6, `millioneaWeekPhase`): the week's chip says it in
   *  the one chip a Millionea week wears everywhere (`WeekStateChip` — "Objection window", "Settling", "Week is being
   *  voided"); omitted, its state's own word. */
  phase?: MillioneaWeekPhase;
  shown: TicketShown;
  /** All fifteen, mains first. */
  clauses: readonly TicketClause[];
  /** `sealLineOf(questions, picks)` — the one grader's answer for this ticket. */
  line: SealLine;
  /** Names the annex sockets for the carry (default: the serial). */
  idBase?: string;
  /** The stub. `registerHref` (M6): the week's register page once the week is final and public — its hash opens it. */
  stub: { price: number; boughtAt: string; questionSetHash: string; registerHref?: string };
  /** The sales close, once it has passed: the stub's lock line. */
  closedAt?: number;
  /** The amount this ticket was paid (after the seal): the only gold on a ticket. */
  wonAmount?: number;
  /** The head's lines: the week voided whole, a share's mark, where the money went (L4, L12). */
  notice?: ReactNode;
  /** The week's live line. While it resolves: how many results are in, the valid reserves left, the next event, and while
   *  it is open the objection window's end (P6) — `valid` may be below zero (the voided mains outnumber the reserves left)
   *  and is then said in words, never as a negative (D-20). While it sells (L11): its close and its first event. */
  live?: {
    resultsIn?: number; reservesLeft?: { valid: number; of: number }; nextEventAt?: number; objectionsUntil?: number;
    salesCloseAt?: number; firstEventAt?: number;
  };
  /** On the results so far this ticket cannot win (the composer's verdict; never a score). */
  cannotWin?: boolean;
  /** The free cancel while its window is open (`TicketCancel`: the door, its rule, its confirm) — the composer's control.
   *  ⭐ It stands in the ticket's head, under the Seal Line, so a pending ticket inside its window shows it on the first
   *  screen (S5 VIS P12: the stamp promised "Free cancel until 11:18", and the control once waited under all fifteen). */
  cancel?: ReactNode;
  play?: TicketMoments;
  className?: string;
}) {
  const inert = ticketRests(shown);
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
  // M5 · the purchase time breaks only after its weekday: "Jumatano" / "21 Okt, 10:18", the date and time one run.
  const bought = (
    <time dateTime={stub.boughtAt}>
      {eatWeekday(t, boughtMs)}{" "}
      <span className="whitespace-nowrap">{formatEatDateTime(boughtMs, serverNow, t.common.monthsShort, locale)}</span>
    </time>
  );
  // The week's live line: a fact line (S5 VIS A1) — "4 of 15 results in · Valid reserves left: 3 of 5 · Next event
  // Saturday 13:00", never a separator at a line's start or end; the count dips and lands when a result arrives (L2).
  const liveFacts: ReactNode[] | null = live
    ? [
        live.resultsIn !== undefined
          ? <MaswaliTick key="in" value={live.resultsIn}>{keepFact(locale, fill(t.millionea.resultsOut, { n: formatNumber(live.resultsIn) }))}</MaswaliTick>
          : null,
        live.reservesLeft
          ? keepFact(locale, live.reservesLeft.valid < 0
            ? fill(t.millionea.reservesShort, { b: live.reservesLeft.of })
            : fill(t.millionea.reservesLeft, { a: live.reservesLeft.valid, b: live.reservesLeft.of }))
          : null,
        live.nextEventAt !== undefined ? keepFact(locale, fill(t.millionea.nextEvent, { when: eatWeekdayClock(t, live.nextEventAt) })) : null,
        live.objectionsUntil !== undefined ? keepFact(locale, fill(t.millionea.checkWindowUntil, { when: eatWeekdayClock(t, live.objectionsUntil) })) : null,
        // An open week's two facts in the slip's own words (round 2, SLIP's observation): "Sales close: Friday 18:00 EAT ·
        // First event: Saturday 09:00 EAT" — one grammar and one zone for the pair, as the ticket was bought under them.
        live.salesCloseAt !== undefined ? keepFact(locale, fill(t.millionea.salesCloseColon, { when: eatWeekdayClock(t, live.salesCloseAt) })) : null,
        live.firstEventAt !== undefined ? keepFact(locale, fill(t.millionea.firstEventAt, { when: eatWeekdayClock(t, live.firstEventAt) })) : null,
      ].filter((x) => x !== null)
    : null;
  const shownLive = liveFacts && liveFacts.length > 0 ? liveFacts : null;
  const stampNodes = ended
    ? fillNodes(ended === "refunded" ? t.millionea.refundedLine : t.millionea.cancelledLine, {
        price: <span className="amount">{formatTzs(stub.price)}</span>,
      })
    : null;
  const sealLine = <MaswaliSealLine line={line} size={24} numbers idBase={base} play={{ carry, draw }} inert={inert} />;
  const perforation = (
    // The perforation: the ticket glyph's notch line at document scale. It reveals on the mark's axis when the stub is
    // first cut, and stays as the record when the stub rejoins.
    <div aria-hidden className={cn("relative flex h-5 items-center", cut === "cut" && "m-axis-reveal")} style={{ background: "var(--wash-inset)" }}>
      <span className="absolute -left-2 top-0 h-5 w-5 rounded-full border border-border bg-bg" />
      <span className="absolute -right-2 top-0 h-5 w-5 rounded-full border border-border bg-bg" />
      <span className="mx-5 flex-1 border-t border-dashed border-border-strong" />
    </div>
  );
  const stubBlock = (
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
      {/* M5 · the serial its own row, whole; the week its number alone (L7); the purchase time a row of its own, so its
          date and time stay one run at 320 in every language; the question set's hash the week register's door (M6). */}
      <StubField label={t.millionea.stubSerial} wide><span className="whitespace-nowrap">{serial}</span></StubField>
      <StubField label={t.millionea.stubWeek}>{formatNumber(week)}</StubField>
      <StubField label={t.millionea.stubPrice}><span className="amount">{formatTzs(stub.price)}</span></StubField>
      <StubField label={t.millionea.stubBought} wide>{bought}</StubField>
      <StubField label={t.millionea.stubHash} wide>
        {stub.registerHref ? (
          // A 44px reach that moves no line: padding taken back by the same margin (the card link's absorber).
          <Link href={stub.registerHref as never} className="-my-2 inline-flex items-center gap-1 py-2 text-text-link">
            {stub.questionSetHash}
            <I.chevronRight s={14} edge="end" text="body-400" className="shrink-0" />
          </Link>
        ) : stub.questionSetHash}
      </StubField>
      {closedAt !== undefined && !ended && (
        <p className={cn("col-span-2 flex items-center gap-1.5 text-body-sm text-text-muted", lock && "m-seal")}>
          <I.lock s={14} className="shrink-0" />
          <span>{keepFact(locale, fill(t.millionea.lockedAt, { when: eatWeekdayClock(t, closedAt) }))}</span>
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
  );
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <article className="mat-raised flex flex-col overflow-hidden rounded-card">
        <div className="flex flex-col gap-3 px-3 pb-3 pt-4">
          <div className="flex flex-col gap-1.5">
            {/* Two rows on a phone — the ticket's own state, then its week and where the week stands — and one row from
                `sm`: the same rows in every language and every state, so the head never wraps raggedly ("Wiki 49 ·
                Matokeo yanatolewa" fell under the chip, right-aligned, at 360 in Swahili) and its loading drawing
                holds its height (M9). */}
            <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <TicketStateChip t={t} shown={shown} />
              {/* The week and where it stands: its number, then the one chip a Millionea week wears on every surface
                  (`WeekStateChip`, the register's — the lead's round-2 line; its word P6's phase). */}
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-label uppercase eyebrow text-text-subtle kp-track-end">{weekWord(t, week)}</span>
                <WeekStateChip t={t} state={weekState} phase={phase ?? null} />
              </span>
            </div>
            {/* The page's one heading: the ticket is named by its serial (`test:visual-pass-r7b` 1.6 registers this head,
                its eyebrow the week line above). */}
            <h1 className="font-mono text-title-md font-bold text-text break-all">{serial}</h1>
            {wonAmount !== undefined && <MaswaliEarnedAmount t={t} amount={wonAmount} />}
            {notice && <p className="text-body-sm text-text text-pretty">{notice}</p>}
          </div>
          <div className="border-y border-border py-2">
            {/* Keyed by the moments it holds: a NEW moment after a refresh mounts a fresh wrapper, held until it is seen —
                one kept from the moment before it would carry that one's "played" and spend the new one off screen. */}
            {carry || draw ? <MaswaliMoment key={`seal${carry ? "-carry" : ""}${draw ? "-draw" : ""}`}>{sealLine}</MaswaliMoment> : sealLine}
          </div>
          {/* ONE POLITE REGION, MOUNTED FROM THE FIRST RENDER (the S5 UI review, MEDIUM 6; DESIGN_AUTHORITY §A item 7): a
              region mounted together with its words is often not read, so this one is always there and only its words
              change — each result that arrives, and the ticket's own word when it changes (the chip says it to the eye). */}
          <p aria-live="polite" aria-atomic="true" data-testid="millionea-ticket-live" className={cn("text-body-sm text-text-muted", !shownLive && "sr-only")}>
            <span className="sr-only">{`${millioneaWord(t, TICKET_SHOWN_KEY[shown])}. `}</span>
            {shownLive && <MaswaliFacts facts={shownLive} />}
          </p>
          {/* L8 · the owner's verdict in the kit's neutral note, never a hand-rolled inset box. */}
          {cannotWin && <Callout tone="neutral">{t.millionea.cannotWin}</Callout>}
          {cancel}
        </div>
        <ol>
          {mains.map((c) => <Clause key={`m${c.ordinal}`} t={t} c={c} line={line} inert={inert} press={pressAt(c)} />)}
        </ol>
        <div className="flex flex-col gap-0.5 border-t border-border px-3 pb-1.5 pt-2" style={{ background: "var(--wash-inset)", boxShadow: "var(--edge-shade)" }}>
          <span className="font-mono text-caption uppercase eyebrow text-text-subtle"><MaswaliFacts facts={factsOf(t.millionea.reservesHead)} /></span>
          <span className="text-body-sm text-text-muted text-pretty">{keepFact(locale, t.millionea.reserveRule)}</span>
        </div>
        <ol>
          {reserves.map((c) => <Clause key={`r${c.ordinal}`} t={t} c={c} line={line} inert={inert} press={pressAt(c)} />)}
        </ol>
        {/* The cut and its reverse, the stamp line's reveal and the lock line play when half the stub is in view, never on a
            mount ~1,700px below the fold (H3). Keyed by the moments it holds (H4): the free cancel's reverse cut after the
            page's refresh is a new moment in a fresh wrapper, held below the fold — never the seen cut's wrapper, which
            played it at once, off screen (qa:maswali-ticket-moments 3.2). */}
        {cut || reveal || lock
          ? <MaswaliMoment key={`stub-${cut ?? "rest"}${reveal ? "-reveal" : ""}${lock ? "-lock" : ""}`}>{perforation}{stubBlock}</MaswaliMoment>
          : <>{perforation}{stubBlock}</>}
      </article>
    </div>
  );
}

/**
 * A ticket on Tiketi zangu's Millionea segment (T13/T14) — ONE CARD WITH ITS SIBLINGS IN THE SAME SWITCH (the R1 tickets
 * critic's M1 and M7, Ali 2026-10-21 10/10 pass): the journey ticket card's own shell (`rounded-xl border border-border
 * bg-bg-elevated p-4`, its `mt-3` rhythm, its 2 : 3 stake/payout grid), the state chip as every platform chip is — glyph,
 * ink and word — and the WHOLE card the ticket's link, lifting as the kit's raised card lifts (`mat-raised-i`), "View
 * ticket ›" kept as its visible door. Its name is "View ticket MLN-…" (`aria-labelledby`), its facts its description.
 * Then the week and the state, the Seal Line, the price and the payout, the serial and when it was bought — in the stub's
 * own words ("Price", "Bought …"): one fact, one wording, the list's and the ticket's byte for byte (§3.9).
 * ⛔ The payout is "when the result is in" until the week settles — never a projected figure (§C3, SJ-4); the amount a
 * won ticket was paid is the only gold, from the win ledger.
 * ⭐ S5 VIS P10 · money that came back says so: a cancelled ticket, and a voided week's once its refund landed, reads
 * "Refunded TZS 1,000" (it once read "Final payout"), its line at rest; a voided week's ticket whose refund is still on
 * its way reads "Refund · On its way back", never "when the result is in". P11 · a value in words keeps the money figure's
 * own line box (the `xs` rung's), so two cards side by side keep their serial and "Bought" rows on one level.
 */
export function MaswaliTicketCard({ t, locale, serverNow, href, serial, week, shown, line, price, payout, share, refundPending = false, placedAt, cancelUntil, className }: {
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
  /** A voided week's ticket whose refund has not landed yet (it still reads "running" until it does). */
  refundPending?: boolean;
  /** When it was bought (ISO). */
  placedAt: string;
  /** M9 · the free cancel's end (ms) while it is open: noted for the ticket's loading drawing, never shown on the card. */
  cancelUntil?: number;
  className?: string;
}) {
  const [boughtBefore, boughtAfter] = t.millionea.boughtAt.split("{date}");
  // A value in words on the money rung's line box (P11): the face and weight change, the size and the leading do not.
  const WORDS = "font-normal text-balance";
  const id = `mln-card-${serial}`;
  return (
    <Link
      href={href as never}
      aria-labelledby={`${id}-door ${id}-serial`}
      aria-describedby={`${id}-state`}
      className={cn("mat-raised-i flex min-w-0 flex-col rounded-xl border border-border bg-bg-elevated p-4 text-text", className)}
    >
      <div id={`${id}-state`} className="flex flex-wrap items-center justify-between gap-2">
        <Chip size="sm" metrics="base" variant="neutral">{weekWord(t, week)}</Chip>
        <TicketStateChip t={t} shown={shown} card />
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <MaswaliSealLine line={line} size={18} inert={ticketRests(shown)} />
        <span id={`${id}-door`} className="inline-flex items-center gap-1 self-start text-body-sm text-text-link">
          {t.millionea.viewTicket}
          <I.chevronRight s={14} edge="end" text="body-400" className="shrink-0" />
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(max-content,2fr)_minmax(0,3fr)] gap-3">
        <Stat label={t.millionea.stubPrice} value={formatTzs(price)} money />
        {shown === "won" && payout !== null ? (
          <MaswaliEarnedStat t={t} amount={payout} />
        ) : shown === "forfeited" || (shown === "won" && share === "held") ? (
          // A share held for review, or one forfeited after it (round 3: that ticket reads "forfeited", never "won"): its
          // word in the payout's place — never gold, never a figure (MB-43, OD-07).
          <Stat label={t.millionea.cardFinalPayout} value={shown === "forfeited" ? t.millionea.shareForfeited : t.millionea.shareHeld} tone="muted" font="body" valueClassName={WORDS} />
        ) : shown === "running" && refundPending ? (
          <Stat label={t.millionea.statRefund} value={t.millionea.refundOnItsWay} tone="muted" font="body" valueClassName={WORDS} />
        ) : shown === "running" ? (
          <Stat label={t.millionea.cardPayout} value={t.journey.ticketPayoutAtResult} tone="muted" font="body" valueClassName={WORDS} />
        ) : ticketRests(shown) ? (
          <Stat label={t.millionea.statRefunded} value={formatTzs(payout ?? price)} money />
        ) : (
          // The S5 UI review (LOW 10): a payout the record does not hold is a dash, never a fabricated TZS 0 (AGENTS §6).
          <Stat label={t.millionea.cardFinalPayout} value={payout === null ? "—" : formatTzs(payout)} money={payout !== null} />
        )}
      </div>
      <div className="mt-3 flex flex-col gap-1 text-body-sm text-text-muted">
        <p className="flex items-center gap-1.5 font-mono"><I.ticket s={14} className="shrink-0" /><span id={`${id}-serial`} className="whitespace-nowrap">{serial}</span></p>
        <p className="flex items-center gap-1.5">
          <I.clock s={14} className="shrink-0" />
          <span>{boughtBefore}<time dateTime={placedAt} className="whitespace-nowrap font-mono tabular-nums">{formatEatDateTime(Date.parse(placedAt), serverNow, t.common.monthsShort, locale)}</time>{boughtAfter}</span>
        </p>
      </div>
      {/* M9 · this door knows the free cancel is open: the ticket's loading drawing draws its band (`maswali-ghost-hint.tsx`). */}
      {cancelUntil !== undefined && <MaswaliGhostHint serial={serial} cancelUntil={cancelUntil} />}
    </Link>
  );
}

/** A held ticket in the hub's buy block (U2): the serial and the Seal Line at 18 — its annex under the mains, as on the
 *  card and the ticket (P16) — the row a link to the ticket. ⭐ The hub critic's L4 and L20 (the lead, 2026-10-21): the row
 *  lifts and presses as the kit's raised card does (`mat-raised-i`, the ticket card's); with `t` its name says what it
 *  opens ("View ticket · MLN-…"); with `cancelUntil` (and the render's `serverNow`) it draws the free cancel's line in the
 *  ticket page's own words, "Free cancel until 10:21 · 9:42", gone the moment the window is. Omitted, today's row. */
export function MaswaliHeldTicketRow({ t, href, serial, line, cancelUntil, serverNow, className }: {
  t?: Dict;
  href: string;
  serial: string;
  line: SealLine;
  cancelUntil?: number;
  serverNow?: number;
  className?: string;
}) {
  return (
    <Link
      href={href as never}
      aria-label={t ? `${t.millionea.viewTicket} · ${serial}` : undefined}
      className={cn("mat-raised mat-raised-i flex flex-col gap-1.5 rounded-control p-2 text-text", className)}
      style={{ minHeight: "var(--h-control-md)" }}
    >
      <span className="flex items-center justify-between gap-1.5">
        <span className="font-mono text-body-sm font-bold text-text break-all">{serial}</span>
        <I.chevronRight s={16} edge="end" className="shrink-0 text-text-subtle" />
      </span>
      <MaswaliSealLine line={line} size={18} />
      {cancelUntil !== undefined && serverNow !== undefined && <MaswaliCancelLine until={cancelUntil} serverNow={serverNow} />}
      {/* M9 · the door knew the window: the ticket's loading drawing draws the free cancel's band (`maswali-ghost-hint.tsx`). */}
      {cancelUntil !== undefined && <MaswaliGhostHint serial={serial} cancelUntil={cancelUntil} />}
    </Link>
  );
}
