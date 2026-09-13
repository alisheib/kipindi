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
 * ON A REASON TO EXIST. The reason was the 2026-09-05 identity gate on staking: its
 * `kyc_pending_review` refusal meant a player who had submitted everything and was waiting
 * on OUR review queue, and in the `danger` skin that arrives as a red crest, an ✗ glyph and
 * `role="alertdialog"` — an emergency, about nothing they did. The tone now travels with the
 * refusal, chosen BY REASON in `MODAL_TONE_BY_REASON` (`updown-bet-errors.ts`), not by severity.
 * ⚠️ 2026-09-13: a stake asks no identity question any more (`kyc-gate.ts` — identity is required
 * before withdrawal only), so that map is empty and every refusal reaching this modal is `danger`
 * today. The prop stays for the next refusal that is ordinary progress rather than a fault.
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
