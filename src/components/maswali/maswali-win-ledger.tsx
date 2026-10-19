import type { ReactNode } from "react";
import { Stat } from "@/components/ui/stat";
import { ReceiptRow } from "@/components/ui/receipt-row";
import { MaswaliClosingRule } from "@/components/maswali/maswali-unbroken-line";
import { MaswaliOutcomeStamp } from "@/components/maswali/maswali-outcome-stamp";
import { SocketGlyph, socketWord, type SocketMark } from "@/components/maswali/maswali-seal-line";
import { MillioneaGlyph } from "@/components/maswali/maswali-glyph";
import { counted, weekWord } from "@/components/maswali/maswali-format";
import { sideWord } from "@/lib/side-label";
import { cn, fill, formatNumber, formatTzs, formatTzsSigned } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";
import type { MaswaliOutcome, MaswaliPick } from "@/lib/maswali-score";

/**
 * THE WIN LEDGER — and the one file where Millionea's money is gold (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.13–§3.14;
 * DESIGN_AUTHORITY §M8a items 6–8, §M3; the v6 delivery's W-settlement receipts).
 *
 * ⭐ GOLD ON EARNED MONEY ONLY, AND ONLY HERE. "Kwa tiketi yako" and "Jumla yako" wear `.gilt-ink`, and so does the
 * amount a won ticket was paid wherever a ticket shows it (`MaswaliEarnedAmount`, `MaswaliEarnedStat`), so a gold figure
 * on a Millionea surface can only come from this file — the jackpot, the floor, the rollover, the stub and every other
 * line of the ledger stay neutral mono, even on a winning receipt. The fee row is the receipt's amber deduction, as on
 * every receipt (`ReceiptRow`'s `warning`), and a net below zero prints with the real minus (U+2212).
 * ⛔ No rolling figure (the seal's amount lands final, `roll: false`), no score on a loss (the ten positions ARE the facts —
 * no "9 of 10", no row named as the near miss), and no buy control on a receipt. The one score Millionea ever prints is
 * the sunset's top score, on the sunset settlement only (Q11).
 * ⭐ THE LEGAL LINE FOLLOWS THE REAL RESOLUTION MODE (manifest L3): one officer seals, so it reads `market.resSingleOfficer`
 * unless the platform's two-officer flag was on at stage 1 for the week (`twoOfficer`), and only then `resTwoOfficer`.
 */

/** The won amount on a ticket: "Kwa tiketi yako" over the paid figure, struck as gold type (T7). */
export function MaswaliEarnedAmount({ t, amount, className }: { t: Dict; amount: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-body-sm text-text-muted">{t.millionea.forYourTicket}</span>
      <span className="amount gilt-ink inline-block text-title-lg font-bold">{formatTzs(amount)}</span>
    </div>
  );
}

/** The final payout of a won ticket on a ticket card — the platform card's own payout stat, struck (T14). */
export function MaswaliEarnedStat({ t, amount }: { t: Dict; amount: number }) {
  return <Stat label={t.journey.ticketFinalPayout} value={formatTzs(amount)} tone="gold" struck money />;
}

/** A receipt's chrome: the eyebrow, the heading, the serials — then its lines, the finality, the legal line, the rule. */
function ReceiptCard({ t, week, heading, serials, headingLevel, legal, play, children, className }: {
  t: Dict;
  week: number;
  heading: string;
  serials: readonly string[];
  headingLevel: 1 | 2;
  legal: MaswaliLegal | null;
  play?: { draw?: boolean };
  children: ReactNode;
  className?: string;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <article className={cn("mat-raised flex flex-col gap-3 rounded-card px-3 py-4", className)}>
      <header className="flex flex-col gap-1">
        <span className="font-mono text-label uppercase eyebrow text-text-subtle">{`${t.millionea.productTitle} · ${weekWord(t, week)}`}</span>
        <Heading className="font-display text-title-md font-bold text-text">{heading}</Heading>
        <span className="font-mono text-body-sm text-text-muted break-all">{serials.join(" · ")}</span>
      </header>
      {children}
      <footer className="flex flex-col gap-1.5">
        <p className="text-body-sm text-text-muted">{t.millionea.finality}</p>
        {legal && (
          <p className="text-body-sm text-text-subtle text-pretty">
            {legal.twoOfficer ? t.market.resTwoOfficer : t.market.resSingleOfficer}
            {" · "}
            {t.common.resolutionAttestation}{" "}
            <span className="font-mono break-all">{legal.hash}</span>
          </p>
        )}
        <MaswaliClosingRule draw={play?.draw} />
      </footer>
    </article>
  );
}

/** How the week was resolved, for the legal line (L3). */
export type MaswaliLegal = { twoOfficer: boolean; /** the resolution attestation's short hash */ hash: string };

/** The earned lines of a winning player-week. Every figure is the settlement's, from the ledger; none is computed here. */
export type WinLines = {
  /** Shown first on a floor week (Timeline C): the pool the week reached and the floor that topped it up. */
  pool?: number;
  floor?: number;
  jackpot: number;
  fee: number;
  /** The fee rate and the two levies' shares of it, as numbers of percent from the week's snapshot. */
  pct: number;
  levies?: { tra: number; gbt: number };
  toWinners: number;
  winningTickets: number;
  perTicket: number;
  /** How many of the winning tickets are this player's (one seal per player-week; the ledger shows × N). */
  yours: number;
  /** What this player's winning tickets were paid together (the ledger's sum, never multiplied here). */
  yourTotal: number;
  /** The floor's top-up: printed, never carried. */
  topUp?: number;
  /** The rounding remainder left by an equal share (carried as real money, never paid from house money). */
  remainder?: number;
  /** When the week's spend exceeds the win, the spend and the net (U+2212 below zero). */
  spent?: { tickets: number; amount: number; net: number };
  /** The sunset week: no floor top-up and no 10/10 (Timeline E). */
  sunsetNoTopUp?: boolean;
};

const ROW = "border-b border-border py-1.5";

export function MaswaliWinLedger({ t, week, serials, lines, sunset, legal, headingLevel = 2, play, className }: {
  t: Dict;
  week: number;
  /** The winning tickets' serials, this player's. */
  serials: readonly string[];
  lines: WinLines;
  /** The sunset's top score, its only appearance (Q11). */
  sunset?: { score: number; tickets: number };
  legal: MaswaliLegal | null;
  headingLevel?: 1 | 2;
  /** M6 · the closing rule draws on (the composer's seen state). */
  play?: { draw?: boolean };
  className?: string;
}) {
  const L = lines;
  const money = (n: number) => formatTzs(n);
  const many = L.yours > 1;
  // Every figure is one unbreakable run (`.amount`): a receipt row at 320 wraps its label, never "TZS" from its digits.
  const fig = (n: number) => <span className="amount">{money(n)}</span>;
  const quiet = (n: number) => <span className="amount text-text-muted">{money(n)}</span>;
  const gilt = (n: number, large: boolean) => (
    <span className={cn("amount gilt-ink inline-block font-bold", large ? "text-title-sm" : "text-body-lg")}>{money(n)}</span>
  );
  return (
    <ReceiptCard t={t} week={week} heading={t.market.wonHeading} serials={serials} headingLevel={headingLevel} legal={legal} play={play} className={className}>
      {sunset && (
        <p className="mat-inset rounded-control px-3 py-2 text-body-sm text-text">
          {counted(sunset.tickets, t.millionea.sunsetScoreOne, t.millionea.sunsetScore, { score: sunset.score })}
        </p>
      )}
      <div className="flex flex-col border-t border-border">
        {L.pool !== undefined && <ReceiptRow className={ROW} label={t.millionea.poolTotal} value={fig(L.pool)} />}
        {L.floor !== undefined && <ReceiptRow className={ROW} label={t.millionea.floor} value={fig(L.floor)} />}
        {!sunset && <ReceiptRow className={ROW} label={t.millionea.jackpot} value={fig(L.jackpot)} />}
        {sunset && L.pool === undefined && <ReceiptRow className={ROW} label={t.millionea.poolTotal} value={fig(L.jackpot)} />}
        <div className={ROW}>
          {/* A fee taken, and the week's net, are the platform's signed figures ("−TZS 136,500", S5 VIS A4). */}
          <ReceiptRow tone="warning" emphasis="fee" label={fill(t.millionea.feeLine, { pct: L.pct })} value={<span className="amount">{formatTzsSigned(-L.fee)}</span>} />
          {L.levies && (
            <p className="mt-0.5 text-body-sm text-text-subtle">{fill(t.millionea.levies, { tra: L.levies.tra, gbt: L.levies.gbt })}</p>
          )}
        </div>
        <ReceiptRow className={ROW} label={t.millionea.toWinners} value={fig(L.toWinners)} />
        <ReceiptRow className={ROW} label={counted(L.winningTickets, t.millionea.perTicketOne, t.millionea.perTicket)} value={fig(L.perTicket)} />
        <ReceiptRow className={ROW} label={t.millionea.forYourTicket} value={gilt(L.perTicket, !many)} />
        {many && (
          <>
            <ReceiptRow className={ROW} label={`× ${formatNumber(L.yours)} · ${fill(t.millionea.wonTickets, { n: formatNumber(L.yours) })}`} value="" />
            <ReceiptRow className={ROW} label={t.millionea.yourTotal} value={gilt(L.yourTotal, true)} />
          </>
        )}
        {L.topUp !== undefined && (
          <ReceiptRow className={cn(ROW, "text-text-muted")} label={`${t.millionea.topUp} · ${t.millionea.topUpNote}`} value={quiet(L.topUp)} />
        )}
        {L.remainder !== undefined && (
          <ReceiptRow className={cn(ROW, "text-text-muted")} label={`${t.millionea.remainder} · ${t.millionea.remainderNote}`} value={quiet(L.remainder)} />
        )}
        {L.sunsetNoTopUp && (
          <ReceiptRow className={ROW} label={t.millionea.noTopUp} value={<span className="text-text-muted">—</span>} />
        )}
        {L.spent && (
          <>
            <ReceiptRow className={ROW} label={counted(L.spent.tickets, t.millionea.spentThisWeekOne, t.millionea.spentThisWeek)} value={quiet(L.spent.amount)} />
            <ReceiptRow className={ROW} emphasis="total" label={t.millionea.yourNet} value={<span className="amount">{formatTzsSigned(L.spent.net)}</span>} />
          </>
        )}
      </div>
    </ReceiptCard>
  );
}

/** One counted position on a loss receipt: the graded question (a reserve's own text where it stood in), its pick, the
 *  world's result and the match. */
export type LossPosition = {
  /** The main's number (1…10). */
  ordinal: number;
  /** The question that was graded in this position — the reserve's, where one stood in. */
  text: string;
  pick: MaswaliPick;
  outcome: Exclude<MaswaliOutcome, "VOID">;
  mark: Extract<SocketMark, "matched" | "missed">;
  /** The reserve that stood in ("A1"). */
  standIn?: string;
};

/**
 * THE LOSS RECEIPT (§3.14, W15) — the ten counted positions and ONE week line, without a figure. ⛔ No score and no
 * line naming the misses: a tick in the success ink, a cross in the muted ink, and the rows are the facts. The week
 * line says what the week did ("no 10/10 ticket", or how many tickets won), never what this ticket "almost" did.
 */
export function MaswaliLossReceipt({ t, week, serial, positions, winners, legal, headingLevel = 2, play, className }: {
  t: Dict;
  week: number;
  serial: string;
  positions: readonly LossPosition[];
  /** How many tickets won the week (0: no 10/10, the pool rolled). */
  winners: number;
  legal: MaswaliLegal | null;
  headingLevel?: 1 | 2;
  play?: { draw?: boolean };
  className?: string;
}) {
  const weekLine = winners === 0
    ? fill(t.millionea.weekLineNoWinner, { week })
    : counted(winners, t.millionea.settledWonOne, t.millionea.settledWon, { week });
  return (
    <ReceiptCard t={t} week={week} heading={t.millionea.lossHeading} serials={[serial]} headingLevel={headingLevel} legal={legal} play={play} className={className}>
      <ol className="flex flex-col border-t border-border">
        {positions.map((p) => (
          <li key={p.ordinal} className="grid grid-cols-[28px_1fr_auto] items-center gap-x-2 gap-y-1 border-b border-border py-2">
            <span className="font-mono text-body-sm font-bold text-text-muted tabular-nums">{p.ordinal}</span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body-sm text-text text-pretty">{p.text}</span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-text-muted">
                <span className="inline-flex gap-1">{t.millionea.pick}<span className="font-mono font-bold text-text">{sideWord(t, p.pick, "MASWALI")}</span></span>
                <MaswaliOutcomeStamp t={t} outcome={p.outcome} size="micro" />
                {p.standIn && (
                  <span className="inline-flex items-center gap-0.5 font-mono text-text-muted">
                    {p.ordinal}
                    <MillioneaGlyph name="standIn" s={12} />
                    {p.standIn}
                  </span>
                )}
              </span>
            </span>
            <span className="flex flex-col items-center gap-0.5">
              <SocketGlyph mark={p.mark} s={24} />
              <span className="sr-only">{socketWord(t, p.mark)}</span>
            </span>
          </li>
        ))}
      </ol>
      <ReceiptRow className={ROW} label={weekLine} value="" />
    </ReceiptCard>
  );
}
