/**
 * PnlSummaryStrip — "Your standing" ledger for the top of /positions.
 * Server component. Replaces the previous 4-cell SummaryCell grid.
 *
 * Design rules honoured (00-README + 01-RULES):
 *  - ZERO new tokens. Everything resolves to globals.css (glass-panel,
 *    gilt-eyebrow, gilt-rule, --gilt, --aqua-300, --no-300, --border …).
 *  - Gold appears ONLY on settled (earned) profit + the gilt Needle, the
 *    brand signature. Unrealised value is neutral ink and always labelled
 *    "if settled now" (no payout promises pre-resolution).
 *  - Losses render in --no-300 with calm copy. No emojis; line-art only.
 *  - Every figure is passed in from real server data — nothing is
 *    fabricated inside this component.
 */

import { formatTzsAbs, formatTzsSigned } from "@/lib/utils";

type Props = {
  openCount: number;
  /** Sum of stakes on OPEN positions. */
  openStake: number;
  /** Sum of live cash-out values on OPEN positions ("if settled now"). */
  openLiveValue: number;
  /** Realised net P&L across settled positions (WIN/CASHED_OUT payout − stake; −stake on LOSS; 0 on VOID). */
  settledNet: number;
  wins: number;       // status === "WIN"
  losses: number;     // status === "LOSS"
  cashOuts: number;   // status === "CASHED_OUT"
  settledCount: number;
  /** Labels come from the caller's i18n bundle (en/sw/zh). */
  t: {
    yourStanding: string;   // "Your standing"
    live: string;           // "Live"
    atRisk: string;         // "At risk"
    open: string;           // "open"
    liveValueIfSettled: string; // "Live value · if settled now"
    unrealised: string;     // "unrealised"
    settledPnl: string;     // "Settled P&L"
    winRate: string;        // "Win rate"
    ofSettled: string;      // "of {n} settled" — pass pre-interpolated
  };
};

export function PnlSummaryStrip({
  openCount, openStake, openLiveValue, settledNet, wins, losses, cashOuts, settledCount, t,
}: Props) {
  const effWins = wins + cashOuts;
  const winRate = settledCount > 0 ? Math.round((effWins / settledCount) * 100) : 0;

  return (
    <section aria-label={t.yourStanding} className="glass-panel px-5 pt-4 pb-[18px]">
      <div className="flex items-center justify-between gap-3">
        <span className="gilt-eyebrow">{t.yourStanding}</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--aqua-300)", boxShadow: "0 0 8px var(--aqua-glow)" }}
          />
          {t.live}
        </span>
      </div>
      <div className="gilt-rule" style={{ margin: "10px 0 14px" }} />
      <div className="grid gap-x-0 gap-y-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))" }}>
        <Cell label={t.atRisk} value={formatTzsAbs(openStake)} sub={`${openCount} ${t.open}`} />
        <Cell
          label={t.liveValueIfSettled}
          value={formatTzsAbs(openLiveValue)}
          sub={`${formatTzsSigned(openLiveValue - openStake)} ${t.unrealised}`}
        />
        <Cell
          label={t.settledPnl}
          value={formatTzsSigned(settledNet)}
          // Gold = earned money only; losses in rose, stated calmly.
          valueClass={settledNet >= 0 ? "text-[var(--gilt)]" : "text-no-300"}
          sub={`${wins}W \u00b7 ${losses}L \u00b7 ${cashOuts}C`}
        />
        <div className="pl-3.5 pt-0.5" style={{ borderLeft: "1px solid color-mix(in oklab, var(--border) 60%, transparent)" }}>
          <p className="m-0 font-mono text-[9.5px] font-semibold uppercase tracking-[0.10em] text-text-subtle">{t.winRate}</p>
          <div className="mt-1.5 flex items-center gap-2.5">
            <NeedleDial rate={winRate} />
            <p className="m-0 font-mono text-[19px] font-bold tabular-nums leading-[1.1] text-text">{winRate}%</p>
          </div>
          <p className="mt-1.5 font-mono text-[10.5px] tabular-nums text-text-muted">{t.ofSettled}</p>
        </div>
      </div>
    </section>
  );
}

function Cell({ label, value, sub, valueClass = "text-text" }: {
  label: string; value: string; sub: string; valueClass?: string;
}) {
  return (
    <div className="pl-3.5 pt-0.5" style={{ borderLeft: "1px solid color-mix(in oklab, var(--border) 60%, transparent)" }}>
      <p className="m-0 font-mono text-[9.5px] font-semibold uppercase tracking-[0.10em] text-text-subtle">{label}</p>
      <p className={`mt-[7px] font-mono text-[19px] font-bold tabular-nums leading-[1.1] ${valueClass}`}>{value}</p>
      <p className="mt-1.5 font-mono text-[10.5px] tabular-nums text-text-muted">{sub}</p>
    </div>
  );
}

/**
 * NeedleDial — the gilt Needle as a conviction dial (brand signature; same
 * object as the TippingBar needle). Tilt encodes deviation from 50%:
 * upright at 50, leans right when winning, left when losing. ±26° max.
 * Static SVG — no animation needed, so nothing to gate on reduced motion.
 */
function NeedleDial({ rate }: { rate: number }) {
  const tilt = ((Math.max(0, Math.min(100, rate)) - 50) / 50) * 26;
  return (
    <svg width="36" height="36" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="20" fill="var(--bg-overlay)" stroke="var(--border-strong)" strokeWidth="1.5" />
      <line
        x1="22" y1="34" x2="22" y2="7"
        stroke="var(--gilt)" strokeWidth="2.4" strokeLinecap="round"
        transform={`rotate(${tilt.toFixed(1)} 22 34)`}
        style={{ filter: "drop-shadow(0 0 4px var(--bar-needle-glow))" }}
      />
      <circle cx="22" cy="34" r="2.4" fill="var(--gilt)" />
    </svg>
  );
}
