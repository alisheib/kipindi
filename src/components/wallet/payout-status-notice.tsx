import { I } from "@/components/ui/glyphs";
import type { PayoutStatus } from "@/lib/server/payout-status";

/**
 * Tells a player the truth about taking money out — before they try.
 *
 * 🔴 Since 2026-07-29 withdrawals on 50pick cannot be paid (Selcom's upstream is down and the two
 * rails that would bypass it are not enabled for this vendor). Until this component existed the
 * withdraw form looked entirely normal: a player filled it in, submitted, and got a generic
 * failure. An operator that accepts deposits while it cannot pay withdrawals has to say so
 * plainly, in every language it sells in.
 *
 * Deliberately NOT dismissible, and deliberately rendered above the form rather than as a toast.
 * A notice a player can close is a notice they will not have read when it matters.
 *
 * `variant="deposit"` is the version shown on the deposit page. That placement is the point: the
 * moment that matters most is *before* money comes in, not after.
 */
export function PayoutStatusNotice({
  status,
  note,
  since,
  labels,
  variant = "withdraw",
}: {
  status: PayoutStatus;
  /** Officer note, shown verbatim in place of the default body when present. */
  note?: string | null;
  /** Already-formatted "Since …" line, or null. */
  since?: string | null;
  labels: {
    delayedTitle: string;
    delayedBody: string;
    unavailableTitle: string;
    unavailableBody: string;
    depositWarning: string;
  };
  variant?: "withdraw" | "deposit";
}) {
  if (status === "operational") return null;

  const unavailable = status === "unavailable";
  const title = unavailable ? labels.unavailableTitle : labels.delayedTitle;
  const body =
    note ??
    (variant === "deposit"
      ? labels.depositWarning
      : unavailable
        ? labels.unavailableBody
        : labels.delayedBody);

  // `unavailable` is a hard stop, so it takes the "no" tone; `delayed` is a caution. Both are
  // existing semantic token pairs — no new colour is introduced (design is frozen).
  // The `delayed` fill carries no `/NN` (2026-08-21): `--warning-bg` is already
  // `color-mix(… 18%, transparent)`, so `/30` asked for 5.4% — a caution the player
  // could not see on the surface that tells him his withdrawal is held up. It now
  // paints the designed 18% amber. `--no-500` is opaque, so `unavailable` keeps its
  // modifier. ⛔ Never put a modifier back on a pre-mixed token.
  const tone = unavailable
    ? "border-no-700/60 bg-no-500/[0.10]"
    : "border-warning-border bg-warning-bg";

  return (
    <div role="alert" className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${tone}`}>
      <span className="mt-0.5 shrink-0">
        {unavailable ? (
          <I.alertCircle s={17} className="text-no-300" />
        ) : (
          <I.clock s={17} className="text-warning-fg" />
        )}
      </span>
      <div className="min-w-0">
        <p className="font-display font-semibold text-text text-[13.5px]">{title}</p>
        <p className="mt-1 text-[12.5px] leading-snug text-text-muted">{body}</p>
        {since && (
          <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-subtle">
            {since}
          </p>
        )}
      </div>
    </div>
  );
}
