"use client";

/**
 * D3 round-detail stake panel.
 *
 * The pick is LOCKED (chosen on the board, carried here as ?side) and shown as a chip
 * statement — NOT a control: to take the other side you leave the round (no cash-out,
 * no side-switch — Ali, 2026-07-27). What stays interactive is the STAKE, and a single
 * gold Confirm is the one money commit on the page. The commit goes through the SAME
 * `useUpDownQuickBet` → `buyPositionAction` path every other surface uses — this panel
 * only reshapes the presentation, never the money path.
 *
 * Safe fallback: if no side was carried in (a direct navigation to the round), we render
 * the shared two-way control so a player is never blocked from betting.
 */
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { cn, formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useUpDownQuickBet, usePlacePulse } from "./use-quick-bet";
import { UpDownStakeControls } from "./updown-stake-controls";
import { stakeChipLabel } from "./stake-math";
import { I } from "@/components/ui/glyphs";
// ⛔ ONE RULE for "what would I be paid" (D2). This panel must agree with the board card to the
// shilling, so it calls the same function rather than multiplying by a rate of its own.
import {
  impliedMultiplier, projectedReturn, refundWarningFor, formatMultiplier, type UpDownPricing,
} from "@/lib/updown-pricing";

export function RoundStakePanel(props: {
  marketId: string;
  isAuthed: boolean;
  minStake: number;
  maxStake: number;
  myUpStake: number;
  myDownStake: number;
  /** ⭐ D2 · the round's real pool + frozen rates. Required — see `UpDownStakeControls`. */
  pricing: UpDownPricing;
  assetName: string;
  signInHref: string;
  lockedSide: "UP" | "DOWN" | null;
  /** UD-2 · the lock instant + server clock, threaded to the hook's place() guard. */
  selectionClosesAtMs?: number | null;
  serverNowMs?: number;
}) {
  const { t } = useT();
  const { marketId, isAuthed, minStake, maxStake, myUpStake, myDownStake, pricing, assetName, signInHref, lockedSide } = props;
  const bet = useUpDownQuickBet({
    marketId, minStake, maxStake, myUpStake, myDownStake,
    selectionClosesAtMs: props.selectionClosesAtMs, serverNowMs: props.serverNowMs,
    copy: { placed: t.market.udBetPlaced, failed: t.market.udBetFailed, up: t.market.udUp, down: t.market.udDown, locked: t.market.udLockedTitle },
  });
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

  // No side chosen (direct nav) → the safe two-way control, so betting is never blocked.
  if (!lockedSide) {
    return (
      <div className={cn(pulse && "ud-place-pulse")}>
        <p className="mb-3 text-[12.5px] leading-[1.55] text-text-muted">{t.market.udTagline}</p>
        <UpDownStakeControls bet={bet} pricing={pricing} assetName={assetName} size="detail" />
      </div>
    );
  }

  // ── Locked pick — the D3 single-direction confirm panel ────────────────────
  const isUp = lockedSide === "UP";
  const pickWord = isUp ? t.market.udUp : t.market.udDown;
  // ⭐ D2 · THE PROJECTION IS THE POOL'S, NOT A RATE'S.
  //
  // 🔴 This line was `Math.round(bet.stake * estMultiplier)` — stake × a config constant. On a
  // round where the other side held nothing it promised a 50% gain over a stake that was going
  // to come straight back, on the one screen whose whole job is to state the commitment before
  // it is made. It is now `projectedPayout`'s own arithmetic, through the shared module.
  const projected = bet.stakeReady ? projectedReturn(pricing, lockedSide, bet.stake) : null;
  const projectedMult = bet.stakeReady ? impliedMultiplier(pricing, lockedSide, bet.stake) : null;
  // ⭐ SIDE-AWARE, and this is the distinction the copy rests on. On a round holding UP 36,000 /
  // DOWN 0, a player locked to UP must be told DOWN has to fill or their stake comes back — but
  // a player locked to DOWN is the one FILLING it, so the same sentence would be false the
  // instant they confirm. `refundWarningFor` is what knows the difference.
  const warn = refundWarningFor(pricing, lockedSide);
  const warnCopy =
    warn === "BOTH" ? t.market.udNobodyBackedEither
    : warn === "UP" ? t.market.udNobodyBacked.replace("{side}", t.market.udUp)
    : warn === "DOWN" ? t.market.udNobodyBacked.replace("{side}", t.market.udDown)
    : null;
  const customInvalid = bet.customMode && bet.customValue.trim() !== "" && !bet.customValid;
  const arrow = isUp ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7";

  return (
    <div className={cn(pulse && "ud-place-pulse")}>
      <div className="flex items-center justify-between gap-2.5">
        <p className="m-0 font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-text-faint">{t.market.udYourPick}</p>
        <span className={cn("chip", isUp ? "chip-yes" : "chip-no")} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={arrow} /></svg>
          {pickWord}
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-[1.5] text-text-muted">{t.market.udPickLocked}</p>

      {/* Stake field — display of the chosen amount + a neutral projection (a projection
          is not earned money, so no gold). */}
      <div
        className="mt-3.5 flex items-center justify-between gap-2.5"
        style={{ height: 46, background: "var(--bg-inset)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "0 12px 0 14px" }}
      >
        <span className="flex min-w-0 items-baseline gap-[7px]">
          <span className="font-mono text-[10.5px] font-semibold tracking-[0.04em] text-text-subtle">TZS</span>
          <span className="font-mono text-[16px] font-bold tabular-nums text-text">{bet.stakeReady ? bet.stake.toLocaleString("en-US") : "—"}</span>
        </span>
        {projected != null && (
          <span className="flex shrink-0 items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            <span className="font-mono text-[12.5px] font-semibold tabular-nums text-text-muted">{projected.toLocaleString("en-US")}</span>
            {/* The multiple, in the SAME muted ink as the amount — it is the same fact stated
                twice, and neither statement gets to be louder than the stake control (G5). */}
            {projectedMult != null && (
              <span className="font-mono text-[11px] tabular-nums text-text-faint">× {formatMultiplier(projectedMult)}</span>
            )}
          </span>
        )}
      </div>

      {/* Presets (real chain bounds) + a compact custom toggle — the stake stays the
          player's choice even though the side is locked. */}
      <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label={t.market.udStake}>
        {bet.stakes.map((s, i) => {
          const on = !bet.customMode && i === Math.min(bet.stakeIdx, bet.stakes.length - 1);
          return (
            <button
              key={s} type="button" role="radio" aria-checked={on}
              onClick={() => bet.setStakeIdx(i)} title={formatTzs(s)}
              className="font-mono text-[11px] font-semibold tabular-nums transition-colors"
              style={{
                flex: 1, height: 30, borderRadius: "var(--r-sm)",
                border: `1px solid ${on ? "var(--brand-500)" : "var(--border)"}`,
                background: on ? "var(--pill-active)" : "color-mix(in oklab, var(--bg-elevated) 60%, transparent)",
                color: on ? "var(--text)" : "var(--text-muted)",
              }}
            >
              {stakeChipLabel(s)}
            </button>
          );
        })}
        <button
          type="button" role="radio" aria-checked={bet.customMode} aria-label={t.market.udCustom}
          onClick={() => (bet.customMode ? bet.exitCustom() : bet.enterCustom())}
          className="inline-flex items-center justify-center gap-0.5 font-mono text-[11px] font-semibold transition-colors"
          style={{
            flex: 1, height: 30, borderRadius: "var(--r-sm)",
            border: `1px solid ${bet.customMode ? "var(--brand-500)" : "var(--border)"}`,
            background: bet.customMode ? "var(--pill-active)" : "color-mix(in oklab, var(--bg-elevated) 60%, transparent)",
            color: bet.customMode ? "var(--text)" : "var(--text-muted)",
          }}
        >
          + {t.market.udCustom}
        </button>
      </div>

      {bet.customMode && (
        <div className="mt-2">
          <Input
            prefix="TZS" mono size="md" inputMode="numeric"
            value={bet.customValue}
            onChange={(e) => bet.setCustomValue(e.target.value.slice(0, 9))}
            onKeyDown={(e) => { if (e.key === "Escape") bet.exitCustom(); }}
            aria-label={t.market.udCustomAmount} aria-invalid={customInvalid} error={customInvalid} placeholder="0"
          />
          <p className={cn("mt-1 font-mono text-[10px] tabular-nums", customInvalid ? "text-no-300" : "text-text-subtle")}>
            {customInvalid ? `${t.market.udStakeRange} · ` : ""}{formatTzs(bet.min)} – {formatTzs(bet.max)}
          </p>
        </div>
      )}

      {/* The one money commit on this page — gold, because this is the commit. */}
      <button
        type="button" onClick={() => bet.place(lockedSide)} disabled={!bet.stakeReady || bet.pending}
        className="btn btn-gold btn-lg mt-3 w-full justify-center"
        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        aria-label={`${t.market.udConfirm} ${pickWord} · ${formatTzs(bet.stake)}`}
      >
        <span>{t.market.udConfirm} {pickWord}</span>
        {bet.stakeReady && <span className="font-mono" style={{ fontWeight: 600, opacity: 0.85 }}>{formatTzs(bet.stake)}</span>}
      </button>
      {/* ⭐ D2 · the empty-side state, scoped to the side this player has locked. Faint
          informational ink and the `info` glyph — a refund is not a failure and not a prize. */}
      {warnCopy && (
        <p className="mt-2 flex items-start gap-1 text-[10.5px] leading-[1.45] text-text-faint">
          <I.info s={11} className="mt-[2px] shrink-0" />
          <span>{warnCopy}</span>
        </p>
      )}
      <p className="mt-2 text-[10px] leading-[1.45] text-text-faint">{t.market.udEstimateNote}</p>

      <span aria-live="polite" className="sr-only">{bet.liveMessage}</span>
    </div>
  );
}
