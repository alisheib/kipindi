"use client";

/**
 * The deposit email gate — shown INSTEAD of the deposit form until the player's
 * address is confirmed.
 *
 * The ladder is: register → CONFIRM EMAIL → deposit and play → verify identity → withdraw
 * (owner ruling, 2026-09-13). This gate is the email rung, and since that date it is the only
 * requirement of its kind in front of the deposit form — from 2026-09-05 to 2026-09-13 an
 * approved identity stood beside it, and that gate is deleted (`kyc-gate.ts`).
 * `wallet-service.deposit()` enforces it server-side;
 * this component exists so the player meets the gate *before* filling in a form
 * they'd only be rejected on, and so the thing that unblocks them (resend the
 * link, or fix a wrong address) is one tap away rather than buried in profile.
 *
 * Deliberately NOT a dead end and NOT alarming: an unconfirmed inbox is a normal
 * first-session state, not an error. Info tone, no red, no "blocked" language.
 *
 * ⭐ TWO STATES, AND EACH SAYS ONLY WHAT IS TRUE OF IT (route audit D1, 2026-10-06):
 *   · AN ADDRESS ON FILE, NOT YET CONFIRMED — "we sent a confirmation link to the address below", the address, a
 *     resend and a change-address door. The sentence is true for a new address and for a changed one alike, so it no
 *     longer says "before your first deposit" to a player re-confirming an address they changed.
 *   · NO ADDRESS AT ALL — the title and the warning callout explain, and the add-address door is the step. The "we sent
 *     you a link" sentence is NOT drawn: nothing was sent to an account with no address.
 * ⛔ The page never draws this door from a FAILED read: `wallet/deposit/page.tsx` lets its user read throw to
 * `wallet/error.tsx` instead of guessing "no address" (D2), because a guess here sends a confirmed player to type an
 * address, and a different address clears the confirmation.
 */
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { useT } from "@/lib/i18n";
import { resendEmailVerificationAction } from "@/app/profile/actions";
import { verifyErrorMessage } from "@/lib/verify-error";

export function EmailVerifyGate({ email }: { email: string | null }) {
  const { t } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ tone: "ok" | "err"; message: string } | null>(null);
  // ⭐ "OPEN IT, THEN COME BACK HERE" (D3f, 2026-10-06) — and coming back now re-reads the page. The player confirms in
  // their mail app or another tab; returning to this one used to show the same stale door until they reloaded by hand.
  // A tab that becomes visible again (or a page restored from the back-forward cache) refreshes the server render, so a
  // confirmed address opens the form. At most once per 5 s, and never while hidden. S9's inline code step polls instead.
  useEffect(() => {
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
  }, [router]);

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
          // ⭐ 2026-10-06 · …and do the reload for them: the page re-renders without this gate, the form appears,
          // and the app-wide bar goes with it. It used to tell the player to reload and then wait for them to.
          if (!r.sent) router.refresh();
        } else {
          // `r.error` is a CODE — never render it raw at a player.
          setResult({ tone: "err", message: verifyErrorMessage(t, r.error, r.retryAfterSec) });
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
          /* ⛔ LITERALS, NOT SCALE TOKENS — `theme.extend.spacing` is overridden
             (tailwind.config.ts:200-215), so `h-10 w-10` is 80×80px. 40px = --tap-min. */
          className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full border border-brand-600/60 bg-brand-500/10 text-brand-300"
        >
          <I.mail s={18} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display font-bold text-[15px] text-text text-balance">{t.wallet.verifyGateTitle}</h2>
          {email && <p className="mt-1 text-body-sm leading-relaxed text-text-muted">{t.wallet.verifyGateBody}</p>}
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
          className={`text-[12.5px] font-medium ${result.tone === "ok" ? "text-success-fg" : "text-danger-fg"}`}
        >
          {result.message}
        </p>
      )}

      {/* 2026-09-13: ONE size and ONE shape for the pair. The primary was the kit's default md
          (44px, rounded) beside a hand-composed lg pill (48px), so the two sat mismatched side by
          side. Both are now lg on the kit radius. The second stays a Link, because it navigates —
          so it wears the exact classes the kit Button composes. */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {email && (
          <Button
            type="button"
            variant="primary"
            size="lg"
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
          className="btn btn-ghost btn-lg w-full"
        >
          <I.user s={14} />
          {email ? t.wallet.verifyChangeEmailCta : t.wallet.verifyAddEmailCta}
        </Link>
      </div>

      <p className="text-body-sm leading-relaxed text-text-subtle">{t.wallet.verifyGateFootnote}</p>
    </section>
  );
}
