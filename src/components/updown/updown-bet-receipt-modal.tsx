"use client";

/**
 * UD-22 · THE UP & DOWN BET CONFIRMATION — the receipt a placed bet ends in.
 *
 * The house rule (CLAUDE.md, "UX commitments") is that **every consequential mutation goes
 * through the unified `OperationResultModal`**, with the corner toast as a *secondary* signal.
 * Up & Down was the standing exception: a bet moved real money out of the wallet and produced
 * a pulse, an `aria-live` line, a haptic and a 3-second toast — four transient channels, no
 * centred receipt — while a deposit, a sale, a withdrawal and a KYC submit all got one.
 *
 * This is the sibling of `updown-bet-blocked-modal.tsx` (the refusal case) on the same
 * primitive, so the two halves of "what happened to my tap" are one dialect:
 *   · refusal → `variant="danger"`, stays until dismissed
 *   · placed  → `variant="success"`, auto-dismisses on the shared 5s default
 *
 * ⛔ IT DOES NOT GATE REPEAT TAPS. Repeat taps are repeat bets (Ali's standing decision), and
 * the buttons behind the scrim stay live. A burst COALESCES into one modal showing the latest
 * bet — never a stack — because the hook holds a single receipt slot and the host keys this
 * component on the receipt's nonce, which restarts the auto-dismiss for each new bet.
 *
 * ⛔ THE PROJECTED RETURN IS NEVER GILDED. `stripTone` is the SIDE (`yes`/`no`), which is the
 * modal's own definition of "a side was staked" and buys the `seal-commit` crest plus the
 * side-coloured button. Gold means money that was EARNED (§M3, `test:gold-is-money`); a
 * projection has not been decided, and `udEstimateNote` — the same disclaimer the buttons
 * carry — travels with the figure so the card and the receipt cannot drift.
 */
import { OperationResultModal, type OperationDetail } from "@/components/markets/operation-result-modal";
import { useT } from "@/lib/i18n";
import { formatTzs } from "@/lib/utils";
import { impliedMultiplier, type UpDownPricing } from "@/lib/updown-pricing";
import { freeExitMinutesFor, type UpDownReceiptInfo } from "@/lib/updown-receipt";
// E-53 · the ONE map from market class to the phrase a player is shown — never the vendor.
import { SOURCE_CLASS_KEY } from "@/lib/updown-source-label";
import type { PlacedReceipt } from "./use-quick-bet";

/** Clock-only, in the viewer's own locale — the receipt states instants, never durations. */
function clockOf(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function UpDownBetReceiptModal({
  placed,
  info,
  pricing,
  assetName,
  onClose,
  onWatchRound,
}: {
  /**
   * The placed BET, or null when nothing has been confirmed.
   * ⚠️ Named `placed`, not `receipt`, deliberately: its host also holds a `receipt` — the
   * ROUND's frozen facts, which arrive here as `info`. Two different things under one word
   * on adjacent lines is how the wrong one gets passed and still type-checks.
   */
  placed: PlacedReceipt | null;
  /** The round's frozen facts, assembled server-side (`BoardRound.receipt`). */
  info: UpDownReceiptInfo;
  pricing: UpDownPricing;
  assetName: string;
  onClose: () => void;
  /** Ghost CTA — navigate to the round. Omitted when the player is already on it. */
  onWatchRound?: () => void;
}) {
  const { t } = useT();
  if (!placed) return null;

  // ⛔ ONE RULE for "what would I be paid" (D2) — the same function the Up/Down buttons and
  // `myExactPayout` use, asked at the amount actually staked. Never a second formula.
  const mult = impliedMultiplier(pricing, placed.side, placed.amount);
  const projected = mult != null ? Math.round(placed.amount * mult) : null;

  // ⛔ COMPUTED PER BET, NEVER STATED AS A CONSTANT. On a 3-minute round the free exit does
  // not exist at all, and on a 5-minute one it exists only at the open — see
  // `src/lib/updown-receipt.ts` for the runway rule and the per-duration table. Both copies
  // already live in the dictionary precisely because this row has two truthful answers.
  const exitMinutes = freeExitMinutesFor(info, placed);

  const betsClose = clockOf(info.selectionClosedAt);
  const resultDue = clockOf(info.closesAt);

  const details: OperationDetail[] = [
    { label: t.market.udStake, value: formatTzs(placed.amount) },
  ];
  if (projected != null) {
    // Tone stays DEFAULT — `good` is the yes-green the settled surfaces use for realised
    // money. A projection borrowing it would read as a result.
    details.push({ label: t.market.udRcProjected, value: formatTzs(projected) });
  }
  if (info.openPrice != null) {
    details.push({
      label: t.market.udRcOpenPrice,
      value: `$${info.openPrice.toFixed(info.decimals)}`,
    });
  }
  if (betsClose) details.push({ label: t.market.udRcBetsClose, value: betsClose });
  if (resultDue) details.push({ label: t.market.udRcResultDue, value: resultDue });
  details.push(
    exitMinutes != null
      ? { label: t.market.udRcExitLabel, value: t.market.udRcExitValue.replace("{mins}", String(exitMinutes)) }
      : { label: t.market.udRcNoExitLabel, value: t.market.udRcNoExitValue },
  );

  const sideWord = placed.side === "UP" ? t.market.udUp : t.market.udDown;

  return (
    <OperationResultModal
      open
      variant="success"
      stripTone={placed.side === "UP" ? "yes" : "no"}
      eyebrow={t.market.udBetPlaced}
      title={`${sideWord} · ${assetName}`}
      // ⛔ BUILT FROM THE CARD'S OWN IDIOM, not a new sentence. `udRoundLabel` is the bare
      // word "Round" and carries NO placeholder — `.replace("{mins}", …)` on it would have
      // been a silent no-op, which is the §2.9 defect (a literal `{min}` reaching a money
      // screen) wearing its opposite face. The card writes `{n} {udMin}`; so does this.
      subtitle={`${info.durationMinutes} ${t.market.udMin} · ${t.market[SOURCE_CLASS_KEY[info.sourceClass]]}`}
      details={details}
      // The projection disclaimer that already travels with every "× N est." figure. Reused,
      // not restated, so the card and the receipt can never say different things about it.
      footnote={projected != null ? t.market.udEstimateNote : undefined}
      primaryLabel={t.market.udRcKeepPlaying}
      secondaryLabel={onWatchRound ? t.market.udRcWatchRound : undefined}
      onSecondary={onWatchRound}
      onClose={onClose}
    />
  );
}
