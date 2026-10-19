/**
 * /millionea/register — THE PARTS BOTH REGISTER PAGES SHARE (MASWALI-BUILD S5 VIS-R, the tile read of 2026-10-19).
 *
 * Server-safe, no directive, no read: each page hands in its words.
 */
import type { ReactNode } from "react";
import { Chip } from "@/components/ui/chip";
import { keepConnectives, runAndDashRanges } from "@/components/ui/keep-run";
import { counted, millioneaWord } from "@/components/maswali/maswali-format";
import { WEEK_STATE_KEY } from "@/lib/maswali-week-label";
import { STATUS_TONE, TONE_CHIP } from "@/lib/status-tone";
import { fill, formatTzs } from "@/lib/utils";
import type { MillioneaWeekSummary } from "@/lib/server/maswali-player";
import type { Dict } from "@/lib/i18n-dict";

/**
 * A FINAL WEEK'S STATE, AS ITS OWN CHIP (R4: the heading read "Week 48 · Voided" and wrapped at 320 into a line that began
 * with "·"; R9: a row of the index says its state the same way). Both final states are terminal and inert, so both wear
 * status-tone's slate — the platform's VOID ink, `TONE_CHIP[STATUS_TONE.VOID.player]` — and a settled week never takes the
 * resolved gold here: the register states money, it awards none (DESIGN_AUTHORITY §M8a item 7).
 */
export function WeekStateChip({ t, state }: { t: Dict; state: "SETTLED" | "VOIDED" }) {
  return (
    <Chip variant={TONE_CHIP[STATUS_TONE.VOID.player]} metrics="status" className="shrink-0 self-start" data-testid="millionea-week-state">
      {millioneaWord(t, WEEK_STATE_KEY[state])}
    </Chip>
  );
}

/**
 * A label whose phrases never break inside (S5 VIS A1): each run the caller names — a week, an amount, a date — stays on
 * one line, and no line ends on a connective (the kit's keep-run, as every receipt label is). The words are unchanged.
 */
export function kept(text: string, runs: readonly string[]): ReactNode {
  return keepConnectives(text, runAndDashRanges(text, runs));
}

/**
 * A FINAL WEEK'S FACTS, AFTER ITS STATE (R9: "Week 48 · Voided" and "Week 45: 1 ticket won" were two grammars for one kind
 * of row) — a voided week's refunds ("every ticket refunded" only once every refund landed: the read model's
 * `refundsPending`, MR-18, never a refund stated before it happened), a won week's winners and jackpot, or a rolled week's
 * carry at fee 0 (the strata line, D-38). Every amount is the read model's; each one is a single unbroken run.
 */
export function weekFacts(t: Dict, w: MillioneaWeekSummary): ReactNode[] {
  if (w.state === "VOIDED") return [w.refundsPending ? t.millionea.regRefundsPending : t.millionea.regRefunded];
  const k = w.winners ?? 0;
  if (k > 0) {
    const facts: ReactNode[] = [counted(k, t.millionea.regWonOne, t.millionea.regWon)];
    if (w.jackpot !== null) facts.push(<>{`${t.millionea.jackpot} `}<span className="amount">{formatTzs(w.jackpot)}</span></>);
    return facts;
  }
  const amount = formatTzs(w.carriedForward ?? 0);
  return [kept(fill(t.millionea.regCarried, { amount }), [amount]), t.millionea.feeZero];
}
