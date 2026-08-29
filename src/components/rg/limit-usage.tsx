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
 * bar (never on the fill), so contrast is unaffected.
 *
 * Reduced-motion safe, and now cheap as well: the only transition is `transform`
 * (it was `width`, which reflowed the panel on every refresh), and the meter still
 * renders server-side at its final length. §M6 · all three gates hold without a new
 * branch — motion.css's universal clamp already zeroes `transition-duration` for the
 * OS query, `html.kp-reduce-motion` and `[data-motion="minimal"]`, and the third
 * gate's list in globals.css §6 governs `infinite` animations, which a one-shot
 * transition is not. With motion off the bar renders at its final length instantly.
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
        {/* THE FILL SCALES; IT DOES NOT WIDEN. Same technique as the wallet's unlock
            bar and the OTP drain — one way to draw a fill, everywhere. The 3% floor is
            unchanged and still applied to the drawn length: a player at 0.4% of a
            deposit cap must still see a mark, or the meter reads as "no limit set".
            ⚠️ The cap, stated: scaleX squashes this element's 4px radius horizontally,
            so the moving right edge flattens — most at the 3% floor, where the mark is
            a sliver by design. Both visible OUTER ends keep their true shape because
            the track is `rounded-pill overflow-hidden`. There is no child to
            counter-scale: the figures sit ABOVE the bar, never on the fill, which is
            the same decision that keeps this meter's contrast independent of the fill
            colour. §M6 · no new branch is owed — see the header note. */}
        <div
          className="h-full w-full origin-left rounded-pill transition-transform duration-500"
          style={{ transform: `scaleX(${Math.max(3, clamped) / 100})`, background: fill }}
        />
      </div>
      {reached && <p className="mt-1 text-body-sm font-medium text-danger-fg">{overLabel}</p>}
    </div>
  );
}
