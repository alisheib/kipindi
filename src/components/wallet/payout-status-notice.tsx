import { Callout } from "@/components/ui/callout";
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

  // ⭐ STAGE 9b — THIS BOX IS <Callout size="md">, NOT A FOURTH HAND-ROLLED ONE.
  //
  // Everything this file used to type by hand is the primitive's `md` rung, byte for
  // byte: the `gap-3 rounded-xl px-4 py-3.5` box, the 17px glyph at `mt-0.5`, the
  // `font-display font-semibold text-[13.5px]` title, the `mt-1 text-[12.5px]
  // leading-snug text-text-muted` body, and the `mt-1.5 font-mono text-[10.5px]
  // uppercase tracking-[0.12em] text-text-subtle` since-line (= `meta`).
  //
  // `unavailable` is a hard stop, so it takes the "no" tone; `delayed` is a caution.
  // Both are existing semantic token pairs — no new colour is introduced.
  //
  // ⚠️ NOTHING REPAINTS, AND THE ONE EDGE THAT WOULD HAVE IS PINNED. `delayed` matches
  // the `warning` tone exactly (`--warning-bg` / `--warning-border` on both sides) and
  // the unavailable FILL matches too (`bg-no-500/[0.10]` == the tone's `bg-no-500/10`).
  // The unavailable EDGE does not: this file paints `border-no-700/60`, the kit's
  // `danger` tone paints `border-no-500/40`.
  //
  // ⛔ AND `border-no-700/60` IS THE ONE THAT STAYS, WHICH IS THE OPPOSITE OF WHAT
  // "this file drifted" would predict. It is the platform's prevailing danger edge —
  // twelve call sites, including the `role="alert"` failure box rendered DIRECTLY ABOVE
  // this component on both of its own pages (wallet/deposit/page.tsx · wallet/withdraw/
  // page.tsx). Taking the kit's edge here would have put two red alerts with two
  // different borders on one screen, on the surface that tells a player we cannot pay
  // them. So the tone is the kit's and the edge is pinned through `className` (twMerge
  // drops the tone's border-colour for the later one).
  // 📋 The real question — whether `Callout`'s `danger` edge should move to `no-700/60`
  // or the twelve sites should move to `no-500/40` — is one decision for the design
  // owner, and it is a one-line change here whichever way it goes.
  // ⛔ Never put a `/NN` modifier back on `--warning-bg`: it is already
  // `color-mix(… 18%, transparent)`, so a modifier multiplies against that 18%.
  return (
    <Callout
      role="alert"
      size="md"
      tone={unavailable ? "danger" : "warning"}
      glyph={unavailable ? "alertCircle" : "clock"}
      className={unavailable ? "border-no-700/60" : undefined}
      title={title}
      meta={since}
    >
      {body}
    </Callout>
  );
}
