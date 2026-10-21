import type { ReactNode } from "react";
import Link from "next/link";
import { Stat } from "@/components/ui/stat";
import { I } from "@/components/ui/glyphs";
import { MaswaliClosingRule } from "@/components/maswali/maswali-unbroken-line";
import { MaswaliMoment } from "@/components/maswali/maswali-moment";
import { MaswaliLedger, type MillioneaLedgerRow } from "@/components/maswali/maswali-ledger";
import { counted, weekWord } from "@/components/maswali/maswali-format";
import { MaswaliFacts } from "@/components/maswali/maswali-facts";
import { cn, fill, formatNumber, formatTzs } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";
import type { SocketMark } from "@/components/maswali/maswali-seal-line";
import type { MaswaliOutcome, MaswaliPick } from "@/lib/maswali-score";

/**
 * THE WIN LEDGER — and the one file where Millionea's money is gold (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.13–§3.14;
 * DESIGN_AUTHORITY §M8a items 6–8, §M3; the v6 delivery's W-settlement receipts).
 *
 * ⭐ GOLD ON EARNED MONEY ONLY, AND ONLY HERE. "Kwa tiketi yako" and "Jumla yako" wear `.gilt-ink`, and so does the
 * amount a won ticket was paid wherever a ticket shows it (`MaswaliEarnedAmount`, `MaswaliEarnedStat`), so a gold figure
 * on a Millionea surface can only come from this file — the jackpot, the floor, the rollover, the stub and every other
 * line of the ledger stay neutral mono, even on a winning receipt. ⭐ THE WEEK'S MONEY IS THE ONE MILLIONEA LEDGER
 * (`maswali-ledger.tsx`, the register's own rows: MR-26 as two matching totals, the fee the receipt's amber deduction);
 * this file adds only the player's earned rows after the share (`winLedgerRows`).
 * ⛔ No rolling figure (the seal's amount lands final, `roll: false`), no score on a loss (no "9 of 10", no row named as
 * the near miss), and no buy control on a receipt. The one score Millionea ever prints is the sunset's top score, on the
 * sunset settlement only (Q11).
 * ⭐ THE LEGAL LINE FOLLOWS THE REAL RESOLUTION MODE (manifest L3): one officer seals, so it reads `market.resSingleOfficer`
 * unless every seal of the week was confirmed by a second officer (`twoOfficer`), and only then `resTwoOfficer`. The read
 * model carries no attestation hash, so the line names the mode and — on a final public week — opens the week's register,
 * which prints every seal and every commitment whole (the R1 tickets critic's M6, Ali 2026-10-21 10/10 pass).
 * ⭐ A RECEIPT LEADS ITS TICKET'S PAGE (§M7, H1): it stands above the ticket, so a settled ticket opens on its outcome.
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

/** The final payout of a won ticket on a ticket card — the platform card's own payout stat, struck (T14), in Millionea's
 *  word for a payout (zh 最终派奖, §D; M7). */
export function MaswaliEarnedStat({ t, amount }: { t: Dict; amount: number }) {
  return <Stat label={t.millionea.cardFinalPayout} value={formatTzs(amount)} tone="gold" struck money />;
}

/** How the week was resolved, for the legal line (L3), and the week's register page once it is final and public (M6). */
export type MaswaliLegal = { twoOfficer: boolean; /** the week's register page, when the reader may open it */ href?: string };

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
        <span className="font-mono text-label uppercase eyebrow text-text-subtle"><MaswaliFacts facts={[t.millionea.productTitle, weekWord(t, week)]} /></span>
        <Heading className="font-display text-title-md font-bold text-text">{heading}</Heading>
        <span className="font-mono text-body-sm text-text-muted"><MaswaliFacts facts={serials.map((s) => <span key={s} className="whitespace-nowrap">{s}</span>)} /></span>
      </header>
      {children}
      <footer className="flex flex-col gap-1.5">
        <p className="text-body-sm text-text-muted text-pretty">{t.millionea.finality}</p>
        {legal && <p className="text-body-sm text-text-subtle text-pretty">{legal.twoOfficer ? t.market.resTwoOfficer : t.market.resSingleOfficer}</p>}
        {legal?.href && (
          // The register's door, reaching 40px without moving a line (the card link's absorber: padding taken back by margin).
          <Link href={legal.href as never} className="-my-2 inline-flex items-center gap-1 self-start py-2 text-body-sm text-text-link" style={{ minHeight: "var(--h-control-sm)" }}>
            {t.millionea.register}
            <I.chevronRight s={14} edge="end" text="body-400" className="shrink-0" />
          </Link>
        )}
        {play?.draw ? (
          <MaswaliMoment><MaswaliClosingRule draw /></MaswaliMoment>
        ) : <MaswaliClosingRule />}
      </footer>
    </article>
  );
}

/** The earned lines of a winning player-week, as `winLinesOf` (millionea-view.ts) reads them from the read model. ⚠️ Since
 *  the round-2 adoption the receipt draws the ONE ledger (`MaswaliLedger`) and `winLedgerRows` instead; the shape stays for
 *  that shared helper until the lead retires it. */
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

/** What this player's winning tickets earned in the week — the only gold on a Millionea surface (§M8a item 7). */
export type WinEarned = {
  /** The share each winning ticket was paid. */
  perTicket: number;
  /** How many of the winning tickets are this player's and paid (one seal per player-week). */
  yours: number;
  /** What they were paid together (the ledger's sum, never multiplied here). */
  yourTotal: number;
};

/**
 * ⭐ THE PLAYER'S OWN ROWS, SPLICED INTO THE WEEK'S ONE LEDGER (S5-DESIGN-REGISTER's shared builder, `maswali-ledger.tsx`;
 * the lead's round-2 line): "For your ticket" — and, for more than one, how many reached 10/10 and "Your total" — straight
 * after the week's share (`share`), so a ticket's ledger and the register's say MR-26 in the same rows and the same words,
 * and this player's money is read where the share is. The only gold of the receipt is here.
 */
export function winLedgerRows(t: Dict, rows: readonly MillioneaLedgerRow[], earned: WinEarned): MillioneaLedgerRow[] {
  const many = earned.yours > 1;
  const gilt = (n: number, large: boolean) => (
    <span className={cn("amount gilt-ink inline-block font-bold", large ? "text-title-sm" : "text-body-lg")}>{formatTzs(n)}</span>
  );
  const mine: MillioneaLedgerRow[] = [
    { key: "yours", label: t.millionea.forYourTicket, value: gilt(earned.perTicket, !many) },
    ...(many ? [
      { key: "yourTickets", label: fill(t.millionea.wonTickets, { n: formatNumber(earned.yours) }), value: <span className="amount">{`× ${formatNumber(earned.yours)}`}</span> },
      { key: "yourTotal", label: t.millionea.yourTotal, value: gilt(earned.yourTotal, true) },
    ] : []),
  ];
  const at = rows.findIndex((r) => r.key === "share");
  return at < 0 ? [...rows, ...mine] : [...rows.slice(0, at + 1), ...mine, ...rows.slice(at + 1)];
}

/**
 * THE WIN LEDGER (§3.13, W-settlement): the receipt's chrome — the week, "You won", the paid serials — over the week's ONE
 * ledger (`MaswaliLedger`, MR-26's two matching totals, the shared builder's sentence-case rows), this player's earned rows
 * spliced after the share (`winLedgerRows`), then the finality, the legal line and the closing rule.
 */
export function MaswaliWinLedger({ t, week, serials, rows, earned, legal, headingLevel = 2, play, className }: {
  t: Dict;
  week: number;
  /** The winning tickets' serials, this player's. */
  serials: readonly string[];
  /** The week's own ledger rows — the register's (`registerLedgerRows`), the shared builder's. */
  rows: readonly MillioneaLedgerRow[];
  earned: WinEarned;
  legal: MaswaliLegal | null;
  headingLevel?: 1 | 2;
  /** M6 · the closing rule draws on (the composer's seen state). */
  play?: { draw?: boolean };
  className?: string;
}) {
  return (
    <ReceiptCard t={t} week={week} heading={t.millionea.wonHeading} serials={serials} headingLevel={headingLevel} legal={legal} play={play} className={className}>
      <MaswaliLedger rows={winLedgerRows(t, rows, earned)} className="border-t border-border pt-3" />
    </ReceiptCard>
  );
}

/** One counted position of a lost ticket (`lossPositionsOf`, millionea-view.ts) — the graded question, its pick, the
 *  world's result and the match. ⚠️ Since H1 the loss card no longer draws them (the ticket under it does); the shape stays
 *  for the shared helper that builds it, until the lead retires that helper. */
export type LossPosition = {
  ordinal: number;
  text: string;
  pick: MaswaliPick;
  outcome: Exclude<MaswaliOutcome, "VOID">;
  mark: Extract<SocketMark, "matched" | "missed">;
  standIn?: string;
};

/**
 * THE LOSS CARD (§3.14, W15; the R1 tickets critic's H1) — "Did not win" and the WEEK's line, without a figure: no 10/10
 * ticket and where the pool went ("Carried forward to Week 50", the calendar chain's week, P9), or how many tickets won the
 * week. ⛔ No score, no line naming the misses, and not the ten positions again: the ticket under this card shows every
 * clause with its stamp and its socket, so a loss is said once, compactly, and the facts stay the ticket's own. The week
 * line is body text under the week's eyebrow, never a receipt row's 10px label (§T4).
 */
export function MaswaliLossReceipt({ t, week, serial, winners, carriedTo, legal, headingLevel = 2, play, className }: {
  t: Dict;
  week: number;
  serial: string;
  /** How many tickets won the week (0: no 10/10, the pool rolled). */
  winners: number;
  /** A week with no 10/10: the week its pool was carried to (null when the chain names none yet). */
  carriedTo?: number | null;
  legal: MaswaliLegal | null;
  headingLevel?: 1 | 2;
  play?: { draw?: boolean };
  className?: string;
}) {
  const facts = winners === 0
    ? [t.millionea.lossNoWinner, carriedTo != null ? fill(t.millionea.carriedOut, { week: carriedTo }) : t.millionea.carriedOutNoWeek]
    : [counted(winners, t.millionea.regWonOne, t.millionea.regWon)];
  return (
    <ReceiptCard t={t} week={week} heading={t.millionea.lossHeading} serials={[serial]} headingLevel={headingLevel} legal={legal} play={play} className={className}>
      <p className="border-t border-border pt-3 text-body-sm text-text" data-testid="millionea-loss-week">
        <MaswaliFacts facts={facts.map((f) => <span key={f} className="text-pretty">{f}</span>)} />
      </p>
    </ReceiptCard>
  );
}
