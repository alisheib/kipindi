/**
 * "Display only" marker — for a status that is SHOWN here but CHANGED elsewhere.
 *
 * WHY: some operational state legitimately belongs on several pages for context
 * (automatic settlement matters on Settlement, on System health, and on Payments
 * ops). That is not redundancy — the redundancy defect would be two places that
 * can CHANGE it. But an operator reading "Auto payout: ON" on a page with no
 * toggle still needs to know, without guessing, that this is a readout and where
 * the single control lives.
 *
 * The rule this encodes: ONE control, many readouts — never two controls. Every
 * readout of a controlled setting should carry this marker and point at its owner.
 */
import Link from "next/link";

export function ControlledElsewhere({
  what,
  where,
  href,
  sw,
}: {
  /** The setting being displayed, e.g. "Automatic settlement". */
  what: string;
  /** Human name of the page that owns the control, e.g. "Payments ops". */
  where: string;
  /** Route of the single control surface. */
  href: string;
  /** Swahili gloss for the setting name (admin surfaces are EN + SW). */
  sw?: string;
}) {
  return (
    <Link
      href={href}
      className="admin-focus mt-2 inline-flex min-h-[40px] items-center gap-2 rounded-pill border border-border bg-bg-overlay px-3 text-[12px] text-text-tertiary transition-colors hover:text-text-secondary"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
        Display only
      </span>
      <span>
        {what}
        {sw ? <span className="text-text-subtle"> · {sw}</span> : null} is set in{" "}
        <span className="text-royal-300 underline-offset-2 group-hover:underline">{where}</span> →
      </span>
    </Link>
  );
}
