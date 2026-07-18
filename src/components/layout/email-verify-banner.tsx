"use client";

/**
 * Persistent "confirm your email" bar — app-wide, for every signed-in player
 * whose address is still unconfirmed.
 *
 * Why it exists: confirming your email is what unlocks depositing (browse free →
 * CONFIRM EMAIL TO DEPOSIT → KYC to withdraw), but until now the ONLY place that
 * said so was the deposit page itself. A player who signed up, browsed markets
 * and never opened /wallet/deposit had no signal at all that their account was
 * in a limited state, and no idea a confirmation mail was waiting in their
 * inbox. They discovered it at the exact moment they wanted to put money in —
 * the worst possible moment to introduce a new step.
 *
 * So the state is now visible everywhere, with the thing that clears it (resend
 * the link) one tap away in the bar itself, not one navigation away.
 *
 * NOT dismissible, on purpose: this is not an announcement, it is a live
 * limitation on the account, and it disappears by being FIXED. A dismiss button
 * would let a player permanently hide the reason their deposit will be refused.
 * It stays slim, and it is `role="status"`/`aria-live="polite"` rather than an
 * alert — it is a standing condition, not an emergency.
 */
import { useState, useTransition } from "react";
import { NoticeBar, NoticeBarAction } from "@/components/ui/notice-bar";
import { useT } from "@/lib/i18n";
import { resendEmailVerificationAction } from "@/app/profile/actions";
import { verifyErrorMessage } from "@/lib/verify-error";

export function EmailVerifyBanner({ email }: { email: string | null }) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ tone: "ok" | "err"; message: string } | null>(null);

  function resend() {
    setResult(null);
    startTransition(async () => {
      try {
        const r = await resendEmailVerificationAction();
        if (r.ok) {
          // `sent: false` = confirmed in another tab. Say so rather than
          // claiming a send that never happened.
          setResult(r.sent
            ? { tone: "ok", message: t.wallet.verifyResent }
            : { tone: "ok", message: t.wallet.verifyAlreadyDone });
        } else {
          setResult({ tone: "err", message: verifyErrorMessage(t, r.error, r.retryAfterSec) });
        }
      } catch {
        setResult({ tone: "err", message: t.error.somethingDidntWork });
      }
    });
  }

  return (
    <NoticeBar
      tone="warning"
      glyph="mail"
      testId="email-verify-banner"
      // The fix travels WITH the warning — resending the link is the entire
      // remedy, so making the player navigate to profile to find it would be
      // the same mistake as hiding the warning on the deposit page.
      action={
        email ? (
          <NoticeBarAction glyph="mail" onClick={resend} disabled={pending}>
            {pending ? t.common.loading : t.wallet.verifyBannerCta}
          </NoticeBarAction>
        ) : (
          <NoticeBarAction glyph="user" href="/profile/account">
            {t.wallet.verifyBannerNoEmailCta}
          </NoticeBarAction>
        )
      }
    >
      {email ? t.wallet.verifyBannerText : t.wallet.verifyBannerNoEmail}
      {result && (
        <span className={`ml-2 font-semibold ${result.tone === "ok" ? "text-yes-300" : "text-no-300"}`}>
          {result.message}
        </span>
      )}
    </NoticeBar>
  );
}
