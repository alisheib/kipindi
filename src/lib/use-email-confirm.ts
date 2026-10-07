"use client";

/**
 * THE EMAIL-CONFIRMATION STEP'S TWO BEHAVIOURS, IN ONE HOME — the withdraw panel's email step uses both.
 *
 * ⭐ WHY A MODULE. Until 2026-10-07 these lived inside the DEPOSIT email door (`email-verify-gate.tsx`), and a second,
 * thinner copy of the resend half lived in the app-wide email bar. The owner moved the confirmed email from deposits to
 * withdrawals (2026-10-07): the door and the bar are deleted, and the one surface that asks for the address now is the
 * withdraw screen's panel (`KycGatePanel`, state `email` or its second step). Moving the logic here instead of copying
 * it a third time keeps the fixes the door had earned:
 *   · `useResendEmailLink` — the resend action's outcome, told truthfully: "sent", "already confirmed" (and the page
 *     refreshed for them, so the panel steps aside), or the coded refusal in the player's language via
 *     `verifyErrorMessage` (rate limit, a suppressed address, a failed send). `r.error` is a CODE — never shown raw.
 *   · `useRefreshOnReturn` — D3f (2026-10-06): the player confirms in their mail app or another tab and comes back; a
 *     tab that becomes visible again (or a page restored from the back-forward cache) re-reads the server render, so a
 *     confirmed address opens the withdraw form with its `?amount=` still set. At most once per 5 s, never while hidden.
 */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { resendEmailVerificationAction } from "@/app/profile/actions";
import { verifyErrorMessage } from "@/lib/verify-error";

export type ResendOutcome = { tone: "ok" | "err" | "info"; message: string };

export function useResendEmailLink() {
  const { t } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ResendOutcome | null>(null);

  function resend() {
    setResult(null);
    startTransition(async () => {
      try {
        const r = await resendEmailVerificationAction();
        if (r.ok) {
          // `sent: false` = confirmed in another tab. Say so, and do the reload for them: the panel steps aside.
          setResult(r.sent ? { tone: "ok", message: t.wallet.verifyResent } : { tone: "ok", message: t.wallet.verifyAlreadyDone });
          if (!r.sent) router.refresh();
        } else {
          // A rate limit is a refusal the player can wait out (§F3: factual, not alarming); a suppressed address or a
          // failed send is a real failure and reads as one.
          setResult({ tone: r.error === "RATE_LIMITED" ? "info" : "err", message: verifyErrorMessage(t, r.error, r.retryAfterSec) });
        }
      } catch {
        setResult({ tone: "err", message: t.error.somethingDidntWork });
      }
    });
  }

  return { pending, result, resend };
}

export function useRefreshOnReturn(enabled: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    const back = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < 5_000) return;
      last = now;
      router.refresh();
    };
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) back(); };
    document.addEventListener("visibilitychange", back);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("pageshow", onShow);
    };
  }, [enabled, router]);
}
