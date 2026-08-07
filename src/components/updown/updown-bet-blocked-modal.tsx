"use client";

/**
 * UD-3 (ux-audit 2026-08) · The compliance/account refusal popup for Up & Down bets.
 *
 * The decision matrix (Report 1 §5): a race/transient refusal is a sticky toast, but a
 * compliance or account block (`SUSPENDED` — self-exclusion, lockout, maintenance) must be
 * READ AND ACKNOWLEDGED — the LCCP informed-consent pattern the house rule states for every
 * consequential mutation ("failures stay open until dismissed", operation-result-modal.tsx
 * header). A 4.5s corner toast at the moment a player's account refuses their money was the
 * inversion of that rule.
 *
 * ONE host per page, mounted beside `UpDownResultAnnouncer` on the board and the round page,
 * fed by a window event from `useUpDownQuickBet` — the same idiom as `50pick:refresh` — so
 * every quick-bet surface shares a single modal instead of three portals.
 *
 * ⛔ No gold anywhere: a refusal is not earned money (gold budget). `danger`, never
 * celebratory; the localized message (UD-4's map) carries the body.
 */

import { useEffect, useState } from "react";
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { useT } from "@/lib/i18n";

export const UPDOWN_BET_BLOCKED_EVENT = "50pick:updown-bet-blocked";

export function UpDownBetBlockedModal() {
  const { t } = useT();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onBlocked = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setMessage(detail?.message || t.market.udErrSuspended);
    };
    window.addEventListener(UPDOWN_BET_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(UPDOWN_BET_BLOCKED_EVENT, onBlocked);
  }, [t.market.udErrSuspended]);

  return (
    <OperationResultModal
      open={message != null}
      variant="danger"
      eyebrow={t.market.udBetFailed}
      title={t.market.udBlockedTitle}
      subtitle={message ?? undefined}
      onClose={() => setMessage(null)}
    />
  );
}
