"use client";

/**
 * UpDownBetBox — the inline bet control on the round-detail page (/updown/[roundId]).
 *
 * Up & Down is a SEPARATE game, so its round page bets INLINE through the same
 * `buyPosition` path (via useUpDownQuickBet) rather than linking off to the long-form
 * poll detail — which now redirects Up & Down markets straight back here anyway. Same
 * one-tap stake chips, optimistic "you're in", and toast as the board card; a fuller
 * layout because the detail page has the room. Signed-out visitors get a sign-in link
 * that returns them to this round.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useUpDownQuickBet } from "./use-quick-bet";

export function UpDownBetBox(props: {
  marketId: string;
  isAuthed: boolean;
  minStake: number;
  maxStake: number;
  myUpStake: number;
  myDownStake: number;
  estMultiplier: number | null;
  /** Where a signed-out tap goes (sign-in, returning to this round). */
  signInHref: string;
}) {
  const { marketId, isAuthed, minStake, maxStake, myUpStake, myDownStake, estMultiplier, signInHref } = props;
  const { t } = useT();
  const { stakes, stakeIdx, setStakeIdx, stake, shownUp, shownDown, pending, place } = useUpDownQuickBet({
    marketId, minStake, maxStake, myUpStake, myDownStake,
    copy: { placed: t.market.udBetPlaced, failed: t.market.udBetFailed, up: t.market.udUp, down: t.market.udDown },
  });

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
    <>
      <p className="text-[12.5px] leading-[1.55] text-text-muted">{t.market.udTagline}</p>

      {/* "You're in" — the viewer's OWN live stake this round (server + optimistic tap). */}
      {(shownUp > 0 || shownDown > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono text-[10.5px]">
          <span className="uppercase tracking-[0.10em] text-text-faint">{t.market.udYoureIn}</span>
          {shownUp > 0 && <span className="chip chip-yes tabular-nums">{t.market.udUp} {formatTzs(shownUp)}</span>}
          {shownDown > 0 && <span className="chip chip-no tabular-nums">{t.market.udDown} {formatTzs(shownDown)}</span>}
        </div>
      )}

      {/* Stake selector — one-tap presets, no keyboard. */}
      {stakes.length > 1 && (
        <div className="mt-3 flex items-center gap-1.5" role="radiogroup" aria-label={t.market.udStake}>
          <span className="mr-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-faint">{t.market.udStake}</span>
          {stakes.map((s, i) => {
            const on = i === Math.min(stakeIdx, stakes.length - 1);
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setStakeIdx(i)}
                className="rounded-md px-2.5 py-1.5 font-mono text-[11.5px] font-semibold tabular-nums transition-colors"
                style={{
                  border: `1px solid ${on ? "var(--border-strong)" : "transparent"}`,
                  background: on ? "var(--bg-inset)" : "color-mix(in oklab, var(--bg-inset) 45%, transparent)",
                  color: on ? "var(--text)" : "var(--text-subtle)",
                }}
              >
                {formatTzs(s)}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => place("UP")} className="btn btn-yes btn-lg justify-center"
                aria-label={`${t.market.udUp} · ${formatTzs(stake)}`}>
          <I.trendingUp s={15} /> {t.market.udUp}
          {estMultiplier != null && <span className="font-mono text-[12.5px] opacity-85">× {estMultiplier.toFixed(1)} est.</span>}
        </button>
        <button type="button" onClick={() => place("DOWN")} className="btn btn-no btn-lg justify-center"
                aria-label={`${t.market.udDown} · ${formatTzs(stake)}`}>
          <I.trendingDown s={15} /> {t.market.udDown}
          {estMultiplier != null && <span className="font-mono text-[12.5px] opacity-85">× {estMultiplier.toFixed(1)} est.</span>}
        </button>
      </div>

      <p className="mt-2 flex items-center gap-1 text-[10.5px] leading-[1.45] text-text-faint">
        {pending
          ? <><span className="live-dot" /> {formatTzs(stake)} · {t.market.udStreaming}</>
          : <>{t.market.udTapToBet} · {formatTzs(stake)}</>}
      </p>
      <p className="mt-1 text-[10px] leading-[1.45] text-text-faint">{t.market.udEstimateNote}</p>
      <p className="mt-1 font-mono text-[10px] text-text-faint">{formatTzs(minStake)} – {formatTzs(maxStake)}</p>
    </>
  );
}
