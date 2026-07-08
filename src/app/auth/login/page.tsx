import Link from "next/link";
import { cookies } from "next/headers";
import { I } from "@/components/ui/glyphs";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { RateLimitBanner } from "@/components/auth/rate-limit-banner";
import { startLoginAction } from "./actions";
import { SUPPORT_EMAIL, HELPLINE } from "@/lib/support-config";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.auth.signInTitle };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; error?: string; retry?: string; next?: string; closed?: string; excluded?: string; cooled?: string; reset?: string }>;
}) {
  // Note: the "bounce authed users away from this page" check lives in
  // src/app/auth/layout.tsx so the redirect happens before the page renders.
  // Avoiding redirect() inside the page itself sidesteps a Next.js 16 dev-mode
  // hook-count mismatch on hot reload.
  const { t } = await getServerT();
  const sp = await searchParams;
  // Detect session-revoked flash (another device signed in)
  const jar = await cookies();
  const wasRevoked = jar.get("kp_revoked")?.value === "1";
  if (wasRevoked) try { jar.delete("kp_revoked"); } catch {}
  const phoneDefault = (sp.phone ?? "").replace(/^\+255/, "").replace(/\D+/g, "").slice(0, 9);
  const retrySec = Number.parseInt(sp.retry ?? "", 10);
  // ?next= is set by the proxy when an unauthed user hits a protected
  // route. We round-trip it through a hidden field so the login action
  // can land the user on the page they actually wanted, not the home.
  // Open-redirect safety: the action validates this is a same-origin,
  // path-only string before redirecting.
  const nextRaw = (sp.next ?? "").trim();
  const nextSafe = /^\/(?![/\\])/.test(nextRaw) ? nextRaw : "";

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
      default:
        return null;
    }
  })();

  return (
    <AuthShell>

        <section
          className="rounded-xl glass-panel p-6 space-y-5"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-gold-300">
              {t.auth.signInTitle}
            </p>
            <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight text-text tracking-[-0.02em]">
              {t.auth.continueWithPhone}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              {t.auth.enterPhonePassword}
            </p>
          </div>

          {errorPanel && (
            <div
              role="alert"
              className={
                "flex items-start gap-2.5 rounded-md border px-3.5 py-3 " +
                (errorPanel.tone === "success"
                  ? "border-yes-700/60 bg-yes-500/[0.10]"
                  : errorPanel.tone === "danger"
                    ? "border-no-700/60 bg-no-500/[0.10]"
                    : "border-warning-border bg-warning-bg/30")
              }
            >
              <span className={"mt-0.5 shrink-0 " + (errorPanel.tone === "success" ? "text-yes-300" : errorPanel.tone === "danger" ? "text-no-300" : "text-gold-300")}>
                <I.alertCircle s={16} />
              </span>
              <div className="text-[12.5px] leading-snug">
                <p className="font-display font-semibold text-text">{errorPanel.title}</p>
                <p className="mt-0.5 text-text-muted">{errorPanel.body}</p>
                {errorPanel.cta && (
                  <Link
                    href={errorPanel.cta.href as never}
                    className="mt-2 inline-flex h-9 items-center px-3.5 rounded-pill border border-gold-700 bg-gold-500/10 font-display font-bold text-[12.5px] text-gold-300 hover:bg-gold-500/20 transition-colors"
                  >
                    {errorPanel.cta.label} →
                  </Link>
                )}
              </div>
            </div>
          )}

          <form action={startLoginAction} className="space-y-4">
            {nextSafe && <input type="hidden" name="next" value={nextSafe} />}
            <Field label={t.auth.phone} hint={t.auth.phonePlaceholder}>
              <PhoneInput
                id="phone"
                name="phone"
                required
                defaultValue={phoneDefault}
                size="lg"
              />
            </Field>

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
                <p id="login-error" className="mt-1.5 flex items-center gap-1.5 text-[12px] text-no-300 font-medium">
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
        </section>

    </AuthShell>
  );
}
