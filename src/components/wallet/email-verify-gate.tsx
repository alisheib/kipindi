"use client";

/**
 * The deposit email gate — shown INSTEAD of the deposit form until the player's
 * address is confirmed.
 *
 * The trust ladder is: browse free → CONFIRM EMAIL TO DEPOSIT → KYC to withdraw.
 * This is the middle rung. `wallet-service.deposit()` enforces it server-side;
 * this component exists so the player meets the gate *before* filling in a form
 * they'd only be rejected on, and so the thing that unblocks them (resend the
 * link, or fix a wrong address) is one tap away rather than buried in profile.
 *
 * Deliberately NOT a dead end and NOT alarming: an unconfirmed inbox is a normal
 * first-session state, not an error. Info tone, no red, no "blocked" language.
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { useT } from "@/lib/i18n";
import { resendEmailVerificationAction } from "@/app/profile/actions";

export function EmailVerifyGate({ email }: { email: string | null }) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ tone: "ok" | "err"; message: string } | null>(null);

  function resend() {
    setResult(null);
    startTransition(async () => {
      try {
        const r = await resendEmailVerificationAction();
        if (r.ok) {
          // `sent: false` means it was already confirmed in another tab — tell the
          // player the truth and point them at the reload rather than claiming a
          // send that never happened.
          setResult(r.sent
            ? { tone: "ok", message: t.wallet.verifyResent }
            : { tone: "ok", message: t.wallet.verifyAlreadyDone });
        } else {
          setResult({ tone: "err", message: r.error });
        }
      } catch {
        setResult({ tone: "err", message: t.error.somethingDidntWork });
      }
    });
  }

  return (
    <section className="rounded-xl glass-panel p-5 lg:p-6 space-y-4" data-testid="email-verify-gate">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-700/60 bg-brand-500/10 text-brand-300"
        >
          <I.mail s={18} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display font-bold text-[15px] text-text">{t.wallet.verifyGateTitle}</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">{t.wallet.verifyGateBody}</p>
        </div>
      </div>

      {email ? (
        <p className="rounded-md border border-border bg-bg-inset px-3 py-2.5 font-mono text-[12.5px] text-text break-all">
          {email}
        </p>
      ) : (
        <Callout tone="warning" title={t.wallet.verifyNoEmailTitle}>
          {t.wallet.verifyNoEmailBody}
        </Callout>
      )}

      {result && (
        <p
          role="status"
          className={`text-[12.5px] font-medium ${result.tone === "ok" ? "text-yes-300" : "text-no-300"}`}
        >
          {result.message}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2.5">
        {email && (
          <Button
            type="button"
            variant="primary"
            onClick={resend}
            loading={pending}
            fullWidth
            leading={<I.mail s={14} />}
          >
            {t.wallet.verifyResendCta}
          </Button>
        )}
        <Link
          href="/profile/account"
          className="btn btn-ghost btn-lg btn-pill w-full inline-flex items-center justify-center gap-1.5"
        >
          <I.user s={14} />
          {email ? t.wallet.verifyChangeEmailCta : t.wallet.verifyAddEmailCta}
        </Link>
      </div>

      <p className="text-[11.5px] leading-relaxed text-text-subtle">{t.wallet.verifyGateFootnote}</p>
    </section>
  );
}
