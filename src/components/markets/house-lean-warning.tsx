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
 * The fee is now capped at a third of the smaller side, so a winning position can
 * no longer be paid below its stake — for ANY admin-set rate. The `negative` level
 * was deleted from the `LeanLevel` union so the compiler would find every last
 * consumer of that lie.
 *
 * What remains is the honest message, and the only honest message: on a lopsided
 * poll THE UPSIDE IS THIN, because the other side is small and the other side is
 * the prize. You will not lose money by being right. You just will not win much.
 *
 * Two states:
 *   thin — warning tone. "Your upside is thin — the other side is small."
 *   fair — hidden.
 *
 * D3 (license review 2026-05) still applies: no payout FIGURE before a bet is
 * placed. The exact number is disclosed the moment betting closes and the pools
 * freeze — see notifySelectionClosedMarkets.
 */
import { Callout } from "@/components/ui/callout";
import type { LeanLevel } from "@/lib/payout";
import { useT } from "@/lib/i18n";

export function HouseLeanWarning({ level }: { level: LeanLevel }) {
  const { t } = useT();
  if (level === "fair") return null;

  return (
    <Callout tone="warning" className="mt-3" title={t.market.crowdedWarning}>
      <p className="mt-1 text-[11px] leading-snug text-text-muted">{t.market.thinUpsideNote}</p>
    </Callout>
  );
}
