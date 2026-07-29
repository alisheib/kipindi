"use client";

/**
 * UpDownCard — the iconic surface of the Up & Down product.
 *
 * Built to the reviewed spec: `docs/design-system/v2-2026-07-27/02-components/_specs-as-delivered/D1-updown-card-spec.md`.
 * KIT-ONLY — `.chip`, `.live-dot`, `.btn-yes` / `.btn-no`, `formatTzs`, kit glyphs. No
 * primitive is forked here; anything genuinely new belongs in the kit.
 *
 * Four things are MANDATORY on this card (management requirement) and must survive
 * 360px: VOLUME · PLAYERS · AMOUNT · TIMER.
 *
 * ── HONESTY RULES BAKED INTO THIS COMPONENT ─────────────────────────────────
 *  · `livePrice = null` renders an em-dash and "awaiting price". NEVER a zero, never a
 *    stale value dressed as current. (Platform rule A-5 — real data or nothing.)
 *  · The `× 1.4` on the buttons is a DISPLAY ESTIMATE, not fixed odds. It is marked
 *    "est." on the button and carries a qualifier line beneath. Pari-mutuel payouts
 *    depend on how the pools close, and implying otherwise would be a lie to a
 *    real-money bettor.
 *  · `confirming` is CALM, not an error — no red, no spinner, no alarm. The round is
 *    waiting for a source to confirm, which is the system working as designed.
 *  · `void` is NEUTRAL — a refund, not a failure.
 *  · The footer shows the timestamp THE SOURCE published, never our boundary.
 */

import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { cn, formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useUpDownQuickBet, usePlacePulse } from "./use-quick-bet";
import { UpDownStakeControls } from "./updown-stake-controls";
import { useCountdown, mmss } from "./round-countdown";

export type UpDownCardState = "open" | "closing" | "confirming" | "resolved" | "void";

export type UpDownCardProps = {
  roundId: string;
  assetName: string;
  assetTicker: string;
  /** Kit icon recipe key. Unknown keys fall back to a neutral ring. */
  assetIcon: string;
  durationMinutes: number;
  /** Quote precision — the price is never shown to more digits than the source gives. */
  decimals: number;
  /** null ⇒ "—" + awaiting price. NEVER render 0 for an unknown price. */
  livePrice: number | null;
  openPrice: number | null;
  /** Frozen winning boundaries (base ± margin, the PDF's Up/Down target prices). A side
   *  must REACH its target to win: UP ≥ upTarget, DOWN ≤ downTarget; a smaller move voids
   *  + refunds. Null on legacy rounds or before the open price is confirmed. */
  upTarget?: number | null;
  downTarget?: number | null;
  movePct: number | null;
  /** Absolute instant the round closes; the countdown derives from it client-side so
   *  every card agrees and no server timestamp goes stale in the HTML. */
  closesAtMs: number;
  volumeTzs: number;
  players: number;
  /** 0..100. Down is derived — one number, one source. */
  upPct: number;
  /** Display-only estimate multiplier. null ⇒ show no "× …" at all, never "× 0". */
  estMultiplier: number | null;
  state: UpDownCardState;
  outcome?: "UP" | "DOWN" | null;
  closePrice?: number | null;
  voidReason?: "no-move" | "source-failed" | "operator" | null;
  sourceName: string;
  /** ISO — the time THE SOURCE quoted, not our boundary. */
  sourceQuotedAt: string | null;
  className?: string;

  // ── Quick-bet (fast game — one tap places a bet, no navigation) ────────────
  /** The PredictionMarket this round IS — the bet goes to the SAME buyPosition path
   *  the dial uses. Absent ⇒ the card is display-only (buttons route to the detail). */
  marketId?: string;
  /** Signed-out taps route to sign-in instead of placing. */
  isAuthed?: boolean;
  /** Quick-stake selector bounds (the chain's, else the platform default). */
  minStake?: number;
  maxStake?: number;
  /** The viewer's OWN open stake per side on THIS round (server truth), shown as the
   *  "you're in" indicator and topped up optimistically on each tap. */
  myUpStake?: number;
  myDownStake?: number;
};


/** Asset prices are quoted in USD because that is what the source publishes. Player
 *  money is ALWAYS TZS via formatTzs — the two must never be confusable. */
function usd(n: number, decimals: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function hhmmss(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(11, 19) : null;
}

/**
 * The two-character mark for an asset.
 *
 * ⚠️ NOT `ticker.slice(0, 2)` — XAU and XAG both start "XA", so every metal rendered an
 * identical chip and Gold was visually indistinguishable from Silver on the board.
 * These are the real element symbols, which is also what the design spec asked for.
 */
const ASSET_MARKS: Record<string, string> = {
  gold: "Au", silver: "Ag", platinum: "Pt", copper: "Cu", oil: "Oil", fx: "FX", crypto: "₿",
};
function markFor(icon: string, ticker: string): string {
  return ASSET_MARKS[icon] ?? ticker.slice(-2).toUpperCase();
}

/** Asset identity chip. Gold gets a gilt ring as ASSET IDENTITY — flagged in the spec
 *  as the one place gold is not "earned money"; real artwork replaces it (Q7). */
/** The asset mark — a tinted glyph chip. Default 40px on the board card; the D3 round
 *  page uses it at 44px (page scale). Gold tint is asset identity here, NOT earned money. */
export function AssetMark({ icon, ticker, size = 40 }: { icon: string; ticker: string; size?: number }) {
  const gold = icon === "gold";
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-mono font-bold"
      style={{
        width: size, height: size, fontSize: size >= 44 ? 14 : 13,
        background: gold ? "color-mix(in oklab, var(--gold-500) 16%, transparent)" : "var(--bg-inset)",
        border: `1px solid ${gold ? "color-mix(in oklab, var(--gold-400) 45%, transparent)" : "var(--border)"}`,
        color: gold ? "var(--gold-300)" : "var(--text-subtle)",
      }}
    >
      {markFor(icon, ticker)}
    </span>
  );
}

export function UpDownCard(props: UpDownCardProps) {
  const {
    roundId, assetName, assetTicker, assetIcon, durationMinutes, decimals,
    livePrice, openPrice, upTarget, downTarget, movePct, closesAtMs, volumeTzs, players, upPct,
    estMultiplier, state, outcome, closePrice, voidReason,
    sourceName, sourceQuotedAt, className,
    marketId, isAuthed, minStake, maxStake, myUpStake = 0, myDownStake = 0,
  } = props;
  const { t } = useT();
  const router = useRouter();
  const secondsLeft = useCountdown(closesAtMs);

  // `secondsLeft === null` is the pre-hydration tick. Treat it as "not yet expired" so
  // the server renders the same action row the client will, and only the digits differ
  // (they read `--:--`, which is identical on both sides).
  const running = secondsLeft == null || secondsLeft > 0;
  const bettable = state === "open" && running;
  const urgent = bettable && secondsLeft != null && secondsLeft <= 30;
  const downPct = Math.max(0, 100 - upPct);
  const dir = movePct == null ? null : movePct > 0 ? "up" : movePct < 0 ? "down" : "flat";
  const priceColor = dir === "up" ? "var(--yes-300)" : dir === "down" ? "var(--no-300)" : "var(--text-muted)";
  const quoted = hhmmss(sourceQuotedAt);

  // ── Quick-bet ──────────────────────────────────────────────────────────────
  // One-tap bet that keeps the card in place (see useUpDownQuickBet — the SHARED
  // logic the round-detail bet box uses too). The card does NOT reorder the board or
  // router.refresh() per tap — the game is fast, so taps must feel instant; the
  // board's 20s poller reconciles server truth.
  const canQuickBet = bettable && !!marketId && isAuthed === true;
  const bet = useUpDownQuickBet({
    marketId, minStake, maxStake, myUpStake, myDownStake,
    copy: { placed: t.market.udBetPlaced, failed: t.market.udBetFailed, up: t.market.udUp, down: t.market.udDown },
  });
  // A placed bet pulses the whole card (non-intrusive confirmation, reduced-motion aware).
  const cardPulse = usePlacePulse(bet.justPlaced?.nonce);

  // Signed-out / display-only cards keep the old behaviour: open the round detail
  // (where the sign-in gate lives) rather than trying to place from the card.
  const go = (side: "UP" | "DOWN") => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    window.dispatchEvent(new Event("50pick:navigating"));
    router.push(`/updown/${roundId}?side=${side}`);
  };

  return (
    <article
      className={cn("mcardp group", cardPulse && "ud-place-pulse", className)}
      aria-label={`${assetName} ${t.market.udTitle} · ${durationMinutes} ${t.market.udMin}`}
      style={{ cursor: "pointer", display: "flex", flexDirection: "column" }}
      role="link"
      tabIndex={0}
      onClick={() => { window.dispatchEvent(new Event("50pick:navigating")); router.push(`/updown/${roundId}`); }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          router.push(`/updown/${roundId}`);
        }
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5">
        <AssetMark icon={assetIcon} ticker={assetTicker} />
        <div className="min-w-0 flex-1">
          {/* 2-line clamp, not ellipsis: Swahili and Chinese expand ~35% and the card
              is bottom-pinned, so the extra height keeps grid alignment (Q6). */}
          <h3 className="font-display text-[14.5px] font-semibold leading-[1.25] text-text"
              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {assetName} {t.market.udTitle}
            <span className="chip" style={{ marginLeft: 6, verticalAlign: "middle" }}>{durationMinutes} {t.market.udMin}</span>
          </h3>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.10em] text-text-subtle">
            {bettable && <span className="live-dot" />}
            {bettable ? t.market.udStreaming : t.market.statusClosed} · {assetTicker}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {livePrice == null ? (
            <>
              <div className="font-mono text-[15.5px] font-bold tabular-nums" style={{ color: "var(--text-faint)" }}>—</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">{t.market.udAwaitingRead}</div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-end gap-1 font-mono text-[15.5px] font-bold tabular-nums" style={{ color: priceColor }}>
                {dir === "up" && <I.trendingUp s={11} />}
                {dir === "down" && <I.trendingDown s={11} />}
                {usd(livePrice, decimals)}
              </div>
              {movePct != null && (
                <div className="font-mono text-[11px] font-semibold tabular-nums" style={{ color: priceColor }}>
                  {movePct > 0 ? "+" : ""}{movePct.toFixed(2)}%
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Countdown (mandatory: TIMER) ───────────────────────────────── */}
      <div className="mt-3 rounded-xl px-3 py-2.5"
           style={{ background: "var(--bg-inset)", border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)" }}>
        <div className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-text-faint">
          {state === "resolved" || state === "void" ? t.market.udRoundSettled
            : running ? t.market.udClosesIn : t.market.udSelectionsClosed}
        </div>
        <div className={cn("font-mono font-bold tabular-nums leading-none", urgent && "ud-count-pulse")}
             style={{ fontSize: 28, letterSpacing: "0.05em", color: urgent ? "var(--no-300)" : running ? "var(--text)" : "var(--text-subtle)" }}>
          {mmss(secondsLeft)}
        </div>
      </div>

      {/* ── Stats (mandatory: VOLUME · PLAYERS) ────────────────────────── */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[11.5px] font-semibold tabular-nums text-text-muted">
          <span className="text-[8.5px] uppercase tracking-[0.12em] text-text-faint">{t.market.udVolume} </span>
          {formatTzs(volumeTzs)}
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[11.5px] font-semibold tabular-nums text-text-muted">
          <I.users s={11} />{players.toLocaleString()}
        </span>
      </div>

      {/* Pool split — words AND colour, never colour alone (a11y). */}
      <div className="mt-2">
        <div className="flex items-center justify-between font-mono text-[9.5px] font-bold tracking-[0.06em]">
          <span style={{ color: "var(--yes-300)" }}>{t.market.udUp} {Math.round(upPct)}%</span>
          <span style={{ color: "var(--no-300)" }}>{Math.round(downPct)}% {t.market.udDown}</span>
        </div>
        <div className="mt-1 flex gap-[2px] overflow-hidden rounded-pill" style={{ height: 5 }}>
          <span style={{ width: `${upPct}%`, background: "var(--yes-500)" }} />
          <span style={{ width: `${downPct}%`, background: "var(--no-500)" }} />
        </div>
      </div>

      {/* ── Winning boundaries — the PDF's Up/Down target prices ─────────
          The exact price a side must REACH to win: UP at or above upTarget, DOWN at or
          below downTarget; a smaller move voids + refunds (the ± buffer around the base).
          Two tinted tiles echo the Up/Down bet buttons below — a quiet preview of the
          choice — with the arrow + label stacked over the price so a 6-figure asset can
          never overflow. Frozen at open; hidden once the round settles (it shows its
          outcome instead) or before a price is confirmed (we never invent a boundary). */}
      {upTarget != null && downTarget != null && state !== "resolved" && state !== "void" && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between gap-2 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-text-faint">
            <span className="truncate">{t.market.udWinTarget}</span>
            {openPrice != null && <span className="shrink-0 tabular-nums">± {usd(upTarget - openPrice, decimals)}</span>}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-lg px-2.5 py-1.5"
                 style={{ background: "color-mix(in oklab, var(--yes-500) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--yes-500) 24%, transparent)" }}>
              <div className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.10em]" style={{ color: "var(--yes-300)" }}>
                <I.trendingUp s={10} />{t.market.udUp}
              </div>
              <div className="mt-0.5 font-mono text-[12.5px] font-bold tabular-nums leading-tight" style={{ color: "var(--yes-300)" }}>
                ≥ {usd(upTarget, decimals)}
              </div>
            </div>
            <div className="min-w-0 rounded-lg px-2.5 py-1.5 text-right"
                 style={{ background: "color-mix(in oklab, var(--no-500) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--no-500) 24%, transparent)" }}>
              <div className="flex items-center justify-end gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.10em]" style={{ color: "var(--no-300)" }}>
                {t.market.udDown}<I.trendingDown s={10} />
              </div>
              <div className="mt-0.5 font-mono text-[12.5px] font-bold tabular-nums leading-tight" style={{ color: "var(--no-300)" }}>
                ≤ {usd(downTarget, decimals)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── The one action / status block. Exactly one renders. ────────── */}
      <div style={{ marginTop: "auto", paddingTop: 12 }}>
        {bettable ? (
          canQuickBet ? (
            // Authed + has its market → the shared quick-bet control (chips + custom
            // amount + place buttons + success pulse), identical to the round page.
            <UpDownStakeControls bet={bet} estMultiplier={estMultiplier} assetName={assetName} size="card" stopPropagation />
          ) : (
            // Signed-out / display-only → the buttons route to the round detail, where
            // the sign-in gate lives. No stake control, no money path from here.
            <>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={go("UP")} className="btn btn-yes btn-lg"
                        aria-label={`${t.market.udUp} — ${assetName}`}>
                  <I.trendingUp s={14} /> {t.market.udUp}
                  {estMultiplier != null && <span className="font-mono text-[12.5px] opacity-85">× {estMultiplier.toFixed(1)} est.</span>}
                </button>
                <button type="button" onClick={go("DOWN")} className="btn btn-no btn-lg"
                        aria-label={`${t.market.udDown} — ${assetName}`}>
                  <I.trendingDown s={14} /> {t.market.udDown}
                  {estMultiplier != null && <span className="font-mono text-[12.5px] opacity-85">× {estMultiplier.toFixed(1)} est.</span>}
                </button>
              </div>
              {estMultiplier != null && (
                <p className="mt-1.5 text-[10px] leading-[1.45] text-text-faint">{t.market.udEstimateNote}</p>
              )}
            </>
          )
        ) : state === "confirming" ? (
          // CALM. No red, no spinner, and above all no number we do not have.
          <div className="rounded-xl p-3.5" style={{ background: "color-mix(in oklab, var(--bg-inset) 70%, transparent)", border: "1px solid var(--border)" }}>
            <span className="chip chip-pending">{t.market.udConfirmingPrice}</span>
            <p className="mt-2 text-[11.5px] leading-[1.5] text-text-muted">{t.market.udConfirmingBody}</p>
          </div>
        ) : state === "void" ? (
          // NEUTRAL — a refund, not a failure. Default chip, no danger tone.
          <div className="rounded-xl p-3.5" style={{ background: "color-mix(in oklab, var(--bg-inset) 70%, transparent)", border: "1px solid var(--border)" }}>
            <span className="chip">{t.market.udVoided}</span>
            <p className="mt-2 text-[11.5px] leading-[1.5] text-text-muted">
              {voidReason === "source-failed" ? t.market.udVoidedSource : t.market.udVoidedBody}
            </p>
          </div>
        ) : state === "resolved" ? (
          // The market outcome, NOT the player's payout — no gold here.
          <div className="flex items-center justify-between gap-2 rounded-xl px-3.5 py-3" style={{ background: "var(--bg-inset)" }}>
            <span className="inline-flex items-center gap-1.5 font-mono text-[14px] font-bold tracking-[0.04em]"
                  style={{ color: outcome === "UP" ? "var(--yes-300)" : "var(--no-300)" }}>
              {outcome === "UP" ? <I.trendingUp s={14} /> : <I.trendingDown s={14} />}
              {outcome === "UP" ? t.market.udUpWins : t.market.udDownWins}
            </span>
            {openPrice != null && closePrice != null && (
              <span className="text-right font-mono text-[10.5px] tabular-nums text-text-muted">
                {usd(openPrice, decimals)} → {usd(closePrice, decimals)}
              </span>
            )}
          </div>
        ) : (
          <div className="btn btn-ghost btn-lg pointer-events-none w-full justify-center opacity-85">
            {t.market.udAwaitingResult}
          </div>
        )}
      </div>

      {/* ── Footer: the trust line. Never dropped, even at 360px. ──────── */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 font-mono text-[9.5px] text-text-faint"
           style={{ borderTop: "1px solid color-mix(in oklab, var(--border) 55%, transparent)" }}>
        <span className="truncate">
          {t.market.udSource}: {sourceName}{quoted ? ` · ${t.market.udQuoted} ${quoted}` : ""}
        </span>
        {openPrice != null && (
          <span className="shrink-0 tabular-nums">{t.market.udOpenPrice} {usd(openPrice, decimals)}</span>
        )}
      </div>
    </article>
  );
}
