/**
 * ThinUpsideNotice — inline disclosure inside the ConvictionDial when this side
 * is crowded enough that there is not much to win.
 *
 * ⚠️ THIS IS NOT A LOSS WARNING ANY MORE, AND IT MUST NEVER BECOME ONE AGAIN.
 *
 * It used to have a `negative` state that told the player, in three languages,
 * that "a winning share may be below your stake" — and that was TRUE under the
 * old flat fee: on a lopsided poll the 9%-of-pool rake exceeded the entire prize
 * and came out of the winners' own stakes. We warned people about a bug instead
 * of fixing it.
 *
 * A winning position can no longer be paid below its stake, and the `negative` level was
 * deleted from the `LeanLevel` union so the compiler would find every last consumer of
 * that lie. ⚠️ THE REASON CHANGED IN 2026-08 AND THIS COMMENT DID NOT, so it is corrected
 * here: it said the fee is "capped at a third of the smaller side", which is the RETIRED
 * capped-commission formula. Under `loser-share` — the live model on both games — there is
 * no ceiling at all; the floor holds because the fee comes ONLY out of the losing pool and
 * is therefore bounded by it. The conclusion is unchanged and now holds under both models,
 * for two different reasons (see the invariants block in `payout.ts`).
 *
 * What remains is the honest message, and the only honest message: on a lopsided
 * poll THE UPSIDE IS THIN, because the other side is small and the other side is
 * the prize. You will not lose money by being right. You just will not win much.
 *
 * Two states:
 *   thin — warning tone. "Your upside is thin — the other side is small."
 *   fair — hidden.
 *
 * ⭐ AND A THIRD, FOR ONE MODEL ONLY — `below` (FEE-TAX-2026-10, Ali's ruling 1 of 2026-10-24). Under `stake-share` the fee
 * comes out of every stake, so a correct call on a lopsided market IS paid less than its stake, and the bet screen must say
 * so before the bet. It is not `negative` come back: `negative` was a lie about a bug, `below` is a true statement about a
 * deliberate law, and it is unreachable for a market frozen under the two older models. Its words are calm and exact —
 * the AMBER box of every warning (never the danger red, never "you may lose"): "If {side} wins you get back about TZS X
 * for your TZS Y — less than you bet — because the other side is small", its figures handed in by the screen from
 * `stakeShareNotice` (the engine's own projection). With no figures it says its title alone.
 *
 * ⛔ AND THE THIN NOTE'S SECOND SENTENCE IS SUPPRESSED BY MODEL, NOT BY LEVEL (the independent review of R2a, finding 1).
 * "You will never be paid less than you staked for a correct call" is false under `stake-share` at EVERY level: a book
 * whose winner is only thin now can still move past the break-even after this bet. So a stake-share screen passes
 * `stakeShare` and its `thin` level draws the title alone; only the two older models ever draw that promise.
 *
 * D3 (license review 2026-05) still applies to the older models: no payout FIGURE before a bet is placed. The exact
 * number is disclosed the moment betting closes and the pools freeze — see notifySelectionClosedMarkets. A stake-share
 * screen states its projected figure, because the ruling that a win can pay back less than the stake requires the
 * player to be told how much less, before the bet.
 */
import { Callout } from "@/components/ui/callout";
import type { LeanLevel } from "@/lib/payout";
import { useT } from "@/lib/i18n";
import { formatTzs } from "@/lib/utils";
import { fillNodes } from "@/lib/fill-nodes";
import { keepText } from "@/components/ui/keep-run";

/** The one tone this notice is drawn in — the warning family's amber (§B11: somebody must act, here before the bet). */
const TONE = "warning" as const;

/**
 * `below`'s words: the side's word (already the reader's, `sideWord`), and — where the screen may state figures — what a
 * win would pay back and the stake. Without the two figures the sentence names the side alone: Up & Down's choices quote
 * no figure before the commit (Ali's ruling of 2026-10-14), and the warning keeps that ruling while it warns.
 */
export type BelowStakeFigures = { side: string; payout?: number; stake?: number };

export function HouseLeanWarning({ level, stakeShare = false, below = null, className = "mt-3" }: {
  level: LeanLevel;
  /** The market froze `stake-share`: the thin note's never-paid-less promise is false there and is never drawn. */
  stakeShare?: boolean;
  /** The figures `below` states (`stakeShareNotice`); without them it draws its title alone. */
  below?: BelowStakeFigures | null;
  className?: string;
}) {
  const { t } = useT();
  if (level === "fair") return null;

  if (level === "below") {
    // FEE-TAX-2026-10 · the below-stake warning: calm amber words with the engine's figures, each an amount (§M4).
    return (
      <Callout tone={TONE} className={className} title={keepText(t.market.ssBelowTitle)}>
        {below ? (
          <p className="mt-1 text-body-sm leading-snug text-text-muted">
            {typeof below.payout === "number" && typeof below.stake === "number"
              ? fillNodes(t.market.ssBelowBody, {
                side: below.side,
                payout: <span className="amount">{formatTzs(below.payout)}</span>,
                stake: <span className="amount">{formatTzs(below.stake)}</span>,
              })
              : fillNodes(t.market.ssBelowSide, { side: below.side })}
          </p>
        ) : null}
      </Callout>
    );
  }

  return (
    /* R4-I (2026-10-09, tiles 035 039 068 072 076) · neither line ends on one word ("mdogo.", "small.") and no line opens
       on the title's dash (`keepText`); the words are unchanged. */
    <Callout tone={TONE} className="mt-3" title={keepText(t.market.crowdedWarning)}>
      {stakeShare ? null : <p className="mt-1 text-body-sm leading-snug text-text-muted">{keepText(t.market.thinUpsideNote)}</p>}
    </Callout>
  );
}
