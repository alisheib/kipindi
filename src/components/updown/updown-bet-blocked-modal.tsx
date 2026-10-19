"use client";

/**
 * UD-3 · the acknowledge-modal for a COMPLIANCE/ACCOUNT bet refusal.
 *
 * The §5 decision matrix: a race/transient refusal is a sticky toast, but a
 * suspension, self-exclusion, cool-off, maintenance or RG daily-loss block must be
 * READ and acknowledged (LCCP informed consent) — the house rule the platform
 * already applies to every other consequential mutation via `OperationResultModal`.
 * This is that same canonical popup, variant `neutral`, staying open until dismissed
 * (failures never auto-close). A refusal has no betting side or earned money.
 *
 * Hosted once per bet-surface instance beside the controls, fed from the quick-bet
 * hook's `blocked` state, so all three surfaces present one identical refusal.
 *
 * U43 uses slate for the refusal itself. The localized reason still names the
 * actual block; the modal's colour makes no claim about UP, DOWN or a win.
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
      variant="neutral"
      eyebrow={t.market.udBetFailed}
      title={blocked?.title ?? ""}
      subtitle={blocked?.body}
      onClose={onClose}
    />
  );
}
