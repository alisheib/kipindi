import Link from "next/link";
import { cookies } from "next/headers";
import { I } from "@/components/ui/glyphs";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel, AuthHeader } from "@/components/auth/auth-panel";
import { Field } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { LoginIdentifier } from "@/components/auth/login-identifier";
import { SubmitButton } from "@/components/ui/submit-button";
import { RateLimitBanner } from "@/components/auth/rate-limit-banner";
import { startLoginAction } from "./actions";
import { SUPPORT_EMAIL, HELPLINE } from "@/lib/support-config";
import { getServerT } from "@/lib/i18n-server";
import { bounceIfAuthed } from "../bounce-authed";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.auth.signInTitle };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; identifier?: string; error?: string; retry?: string; next?: string; closed?: string; excluded?: string; cooled?: string; reset?: string; revoked?: string }>;
}) {
  // ⛔ THE BOUNCE RUNS HERE, IN THE PAGE, AND IT MOVED OUT OF `auth/layout.tsx` BECAUSE A
  // LAYOUT IS NOT RE-EXECUTED ON A CLIENT-SIDE SOFT NAVIGATION. The layout compared the
  // `x-pathname` header it captured on the last HARD load, so an authed player who entered
  // `/auth` on a route outside the bounce set (`/auth/otp`, `/auth/verify-email`,
  // `/auth/forgot-password`) and then clicked through to this page was never bounced at all.
  // See `bounce-authed.ts` — it also records why moving this to the middleware would have
  // shipped an infinite redirect loop against B-13's revoked-device flow.
  await bounceIfAuthed();
  const { t } = await getServerT();
  const sp = await searchParams;
  // Detect session-revoked flash (another device signed in). B-13: `?revoked=1`
  // is the reliable path (set by the revoked-device redirect — a render context
  // can never write the flash cookie); the cookie is kept for actions/handlers
  // that CAN set it. Never mutate cookies here — a delete during render throws,
  // and the flash self-expires in 30s anyway.
  const jar = await cookies();
  const wasRevoked = sp.revoked === "1" || jar.get("kp_revoked")?.value === "1";
  // Re-fill whatever the player typed. `?identifier=` is what the action now
  // round-trips; `?phone=` is still honoured so older links (and the sign-up
  // page's "already have an account?" hand-off) keep working.
  const identifierDefault = (sp.identifier ?? sp.phone ?? "").trim().slice(0, 254);
  const retrySec = Number.parseInt(sp.retry ?? "", 10);
  // ?next= is set by the proxy when an unauthed user hits a protected
  // route. We round-trip it through a hidden field so the login action
  // can land the user on the page they actually wanted, not the home.
  // Open-redirect safety: the action validates this is a same-origin,
  // path-only string before redirecting.
  const nextRaw = (sp.next ?? "").trim();
  const nextSafe = /^\/(?![/\\])/.test(nextRaw) ? nextRaw : "";
  // Default the sign-in method to whatever the round-tripped value looks like
  // (an "@" → email, otherwise phone — Tanzania is phone-first).
  const defaultMethod: "email" | "phone" = identifierDefault.includes("@") ? "email" : "phone";

  const errorPanel = (() => {
    if (sp.reset === "1") return {
      tone: "success" as const,
      title: t.auth.passwordReset,
      body: t.auth.passwordResetBody,
      cta: null,
    };
    if (sp.closed === "1") return {
      tone: "warning" as const,
      title: t.auth.accountClosed,
      body: t.auth.accountClosedBody,
      cta: null,
    };
    if (sp.excluded === "1") return {
      tone: "danger" as const,
      title: t.auth.selfExclusionActive,
      body: t.auth.selfExclusionBody,
      cta: null,
    };
    if (sp.cooled === "1") return {
      tone: "warning" as const,
      title: t.auth.coolingOff,
      body: t.auth.coolingOffBody,
      cta: null,
    };
    if (wasRevoked) return {
      tone: "warning" as const,
      title: t.auth.signedOut,
      body: t.auth.signedOutBody,
      cta: null,
    };
    switch (sp.error) {
      case "no_account":
        return {
          tone: "warning" as const,
          title: t.auth.noAccountYet,
          body: t.auth.noAccountYetBody,
          cta: { href: `/auth/register${nextSafe ? `?next=${encodeURIComponent(nextSafe)}` : ""}`, label: t.auth.createOne },
        };
      case "wrong_credentials":
        return {
          tone: "danger" as const,
          title: t.auth.wrongCredentials,
          body: t.auth.wrongCredentialsBody,
          cta: null,
        };
      case "rate_limited":
        return {
          tone: "warning" as const,
          title: t.auth.tooManyTries,
          body: Number.isFinite(retrySec) && retrySec > 0
            ? <RateLimitBanner seconds={retrySec} clearHref={`/auth/login${nextSafe ? `?next=${encodeURIComponent(nextSafe)}` : ""}`} />
            : t.auth.tooManyTriesBody,
          cta: null,
        };
      case "blocked":
        return {
          tone: "danger" as const,
          title: t.auth.accountUnavailable,
          body: t.auth.blockedContactSupport.replace("{email}", SUPPORT_EMAIL()),
          cta: null,
        };
      // B-13 — previously unmapped: a 2FA lapse bounced here with a blank form.
      case "session_expired":
        return {
          tone: "warning" as const,
          title: t.auth.sessionExpired,
          body: t.auth.sessionExpiredBody,
          cta: null,
        };
      // B-13 — the brute-force lockout, with its countdown AND the way out.
      case "locked":
        return {
          tone: "danger" as const,
          title: t.auth.accountLocked,
          body: (
            <>
              {t.auth.accountLockedBody}
              {Number.isFinite(retrySec) && retrySec > 0 && (
                <RateLimitBanner seconds={retrySec} clearHref={`/auth/login${nextSafe ? `?next=${encodeURIComponent(nextSafe)}` : ""}`} />
              )}
            </>
          ),
          cta: { href: `/auth/forgot-password`, label: t.common.resetPassword },
        };
      default:
        return null;
    }
  })();

  return (
    <AuthShell>

        <AuthPanel>
          <AuthHeader
            eyebrow={t.auth.signInTitle}
            title={t.auth.welcomeBack}
            subtitle={t.auth.emailOrPhoneHint}
          />

          {errorPanel && (
            <div
              role="alert"
              className={
                "flex items-start gap-2.5 rounded-md border px-3.5 py-3 " +
                /* D2 (2026-08-21): the SEMANTIC families. This panel says "signed out
                   on another device" / "couldn't sign you in" — app state, never money —
                   and it used to wear the YES and NO betting inks to say it. The third
                   arm already read `--warning-*`, which is the pattern the other two
                   now follow. Alphas hold the old weights within 0.1 of a contrast point. */
                (errorPanel.tone === "success"
                  ? "border-success/45 bg-success/[0.10]"
                  : errorPanel.tone === "danger"
                    ? "border-danger-500/45 bg-danger-500/[0.10]"
                    : "border-warning-border bg-warning-bg")
              }
            >
              <span className={"mt-0.5 shrink-0 " + (errorPanel.tone === "success" ? "text-success-fg" : errorPanel.tone === "danger" ? "text-danger-fg" : "text-gold-300")}>
                <I.alertCircle s={16} />
              </span>
              <div className="text-[12.5px] leading-snug">
                <p className="font-display font-semibold text-text">{errorPanel.title}</p>
                <p className="mt-0.5 text-text-muted">{errorPanel.body}</p>
                {errorPanel.cta && (
                  <Link
                    href={errorPanel.cta.href as never}
                    /* ⚠️ LITERAL, not `h-9` — spacing is overridden (tailwind.config.ts:200-215),
                       so `h-9` was a 64px capsule around 12.5px type. 40px = --tap-min.
                       Twin of auth/register/page.tsx — keep the two in step. */
                    className="mt-2 inline-flex h-[40px] items-center px-3.5 rounded-pill border border-gold-700 bg-gold-500/10 font-display font-bold text-[12.5px] text-gold-300 hover:bg-gold-500/20 transition-colors"
                  >
                    {errorPanel.cta.label} →
                  </Link>
                )}
              </div>
            </div>
          )}

          <form action={startLoginAction} className="space-y-4">
            {nextSafe && <input type="hidden" name="next" value={nextSafe} />}
            {/* Phone/Email switcher. Both methods submit under `identifier`; the
                server discriminates on a literal `@` (email) vs `tzPhone`
                normalisation (a bare 9-digit MSISDN → +255…). Phone mode reuses
                the same pretty <PhoneInput> as the admin sign-in. Email is still
                first-class so a player who remembers their address but not which
                number they registered with can get in. */}
            <LoginIdentifier
              defaultMethod={defaultMethod}
              defaultValue={identifierDefault}
              invalid={sp.error === "no_account"}
            />

            <Field label={t.auth.password} hint={t.auth.passwordHint}>
              <PasswordInput
                id="password"
                name="password"
                required
                autoComplete="current-password"
                minLength={8}
                size="lg"
                placeholder="••••••••"
                aria-invalid={sp.error === "wrong_credentials" ? "true" : undefined}
                aria-describedby={sp.error === "wrong_credentials" ? "login-error" : undefined}
              />
              {sp.error === "wrong_credentials" && (
                <p id="login-error" className="mt-1.5 flex items-center gap-1.5 text-[12px] text-danger-fg font-medium">
                  <I.alertCircle s={13} />
                  {t.auth.wrongCredentials}
                </p>
              )}
            </Field>

            <div className="flex items-center justify-end -mt-2">
              <Link
                href="/auth/forgot-password"
                className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-text-subtle hover:text-text"
              >
                {t.auth.forgotPassword}
              </Link>
            </div>

            <SubmitButton label={t.auth.signInTitle} pendingLabel={t.common.signingIn} />
          </form>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            {t.auth.noAccount}{" "}
            <Link
              href={`/auth/register${nextSafe ? `?next=${encodeURIComponent(nextSafe)}` : ""}` as never}
              className="font-semibold text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline"
            >
              {t.auth.createOne}
            </Link>
          </p>
        </AuthPanel>

    </AuthShell>
  );
}
