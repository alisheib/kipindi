"use client";

/**
 * UpDownBetBox — the inline bet control on the round-detail page (/updown/[roundId]).
 *
 * Up & Down is a SEPARATE game, so its round page bets INLINE through the same
 * `buyPosition` path (via useUpDownQuickBet) rather than linking off to the long-form
 * poll detail — which now redirects Up & Down markets straight back here anyway. It
 * renders the SHARED `UpDownStakeControls` (chips + custom amount + place buttons +
 * success pulse) at the roomier "detail" size, so the board card and the round page
 * can never drift. Signed-out visitors get a sign-in link that returns them here.
 */
import Link from "next/link";
import { cn, formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useUpDownQuickBet, usePlacePulse } from "./use-quick-bet";
import { UpDownStakeControls } from "./updown-stake-controls";

export function UpDownBetBox(props: {
  marketId: string;
  isAuthed: boolean;
  minStake: number;
  maxStake: number;
  myUpStake: number;
  myDownStake: number;
  estMultiplier: number | null;
  assetName?: string;
  /** Where a signed-out tap goes (sign-in, returning to this round). */
  signInHref: string;
}) {
  const { marketId, isAuthed, minStake, maxStake, myUpStake, myDownStake, estMultiplier, assetName = "", signInHref } = props;
  const { t } = useT();
  const bet = useUpDownQuickBet({
    marketId, minStake, maxStake, myUpStake, myDownStake,
    copy: { placed: t.market.udBetPlaced, failed: t.market.udBetFailed, up: t.market.udUp, down: t.market.udDown },
  });
  // A placed bet pulses the bet box (non-intrusive confirmation, reduced-motion aware).
  const pulse = usePlacePulse(bet.justPlaced?.nonce);

  // Signed out — one clear route to sign in, then back to this round to bet.
  if (!isAuthed) {
    return (
      <>
        <p className="text-[12.5px] leading-[1.55] text-text-muted">{t.market.udTagline}</p>
        <Link href={signInHref as never} className="btn btn-primary btn-lg mt-3 w-full justify-center">
          {t.market.udSignInToBet}
        </Link>
        <p className="mt-2 font-mono text-[10px] text-text-faint">{formatTzs(minStake)} – {formatTzs(maxStake)}</p>
      </>
    );
  }

  return (
    <div className={cn("rounded-lg", pulse && "ud-place-pulse")}>
      <p className="mb-3 text-[12.5px] leading-[1.55] text-text-muted">{t.market.udTagline}</p>
      <UpDownStakeControls bet={bet} estMultiplier={estMultiplier} assetName={assetName} size="detail" />
    </div>
  );
}
