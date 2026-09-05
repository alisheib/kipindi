"use client";

/**
 * UD-3 · the acknowledge-modal for a COMPLIANCE/ACCOUNT bet refusal.
 *
 * The §5 decision matrix: a race/transient refusal is a sticky toast, but a
 * suspension, self-exclusion, cool-off, maintenance or RG daily-loss block must be
 * READ and acknowledged (LCCP informed consent) — the house rule the platform
 * already applies to every other consequential mutation via `OperationResultModal`.
 * This is that same canonical popup, variant `danger`, staying open until dismissed
 * (failures never auto-close) and never gold — a refusal is not earned money.
 *
 * Hosted once per bet-surface instance beside the controls, fed from the quick-bet
 * hook's `blocked` state, so all three surfaces present one identical refusal.
 *
 * 🔴 THE VARIANT IS NO LONGER HARD-WIRED TO `danger`, AND THAT WAS A REAL DEFECT WAITING
 * ON A REASON TO EXIST. It was written when every `modal`-channel reason in the registry
 * carried severity `error`. The 2026-09-05 identity gate added `kyc_pending_review` at
 * severity **`info`** — a player who has submitted everything and is waiting on OUR
 * review queue. In the `danger` skin that arrives as a red crest, an ✗ glyph and
 * `role="alertdialog"`: an emergency, about nothing they did. The tone now travels with
 * the refusal from the registry (`updown-bet-errors.ts` → `SEVERITY_VARIANT`).
 * ⛔ Never `success` — gold is earned money, and a refusal is not.
 */
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { useT } from "@/lib/i18n";

export function UpDownBetBlockedModal({
  blocked,
  onClose,
}: {
  blocked: { title: string; body: string; variant: "danger" | "warning" | "info" } | null;
  onClose: () => void;
}) {
  const { t } = useT();
  return (
    <OperationResultModal
      open={!!blocked}
      /* ⚠️ `?? "danger"` only for the CLOSED state — `blocked` is null while the modal is
         shut and the prop is still required. It is never the tone of a real refusal. */
      variant={blocked?.variant ?? "danger"}
      eyebrow={t.market.udBetFailed}
      title={blocked?.title ?? ""}
      subtitle={blocked?.body}
      onClose={onClose}
    />
  );
}
