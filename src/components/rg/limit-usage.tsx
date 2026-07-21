import { formatTzs } from "@/lib/utils";

/**
 * LimitUsageMeter — a read-only value-vs-cap bar for the responsible-gambling
 * page. `used` and `cap` are REAL figures computed by the same functions the
 * deposit/loss gates enforce (see `getLimitUsage`), so the meter shows exactly
 * how close a player is to a limit they set — never a proxy or an estimate.
 *
 * Colour is the neutral→warning→danger status ramp, NOT yes/no: a usage meter
 * is not a bet outcome, so green/rose (DESIGN_AUTHORITY B2) must not be reused
 * here. Fills are the AA-darkened status tokens; the value text sits above the
 * bar (never on the fill), so contrast is unaffected. Reduced-motion safe — the
 * only transition is width, and it renders server-side at its final width.
 */
export function LimitUsageMeter({
  label,
  used,
  cap,
  overLabel,
}: {
  label: string;
  used: number;
  cap: number;
  /** Shown when usage has reached/exceeded the cap. */
  overLabel: string;
}) {
  const pct = cap > 0 ? (used / cap) * 100 : 0;
  const clamped = Math.max(0, Math.min(100, pct));
  const reached = used >= cap;
  const fill =
    reached || pct >= 90 ? "var(--danger-500)" : pct >= 75 ? "var(--warning)" : "var(--royal-400)";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-medium text-text">{label}</span>
        <span className="font-mono text-[11.5px] tabular-nums text-text-muted whitespace-nowrap">
          {formatTzs(used)} <span className="text-text-tertiary">/ {formatTzs(cap)}</span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${formatTzs(used)} / ${formatTzs(cap)}`}
        className="mt-1.5 h-2 w-full overflow-hidden rounded-pill bg-bg-sunken"
      >
        <div
          className="h-full rounded-pill transition-[width] duration-500"
          style={{ width: `${Math.max(3, clamped)}%`, background: fill }}
        />
      </div>
      {reached && <p className="mt-1 text-[11px] font-medium text-danger-fg">{overLabel}</p>}
    </div>
  );
}
