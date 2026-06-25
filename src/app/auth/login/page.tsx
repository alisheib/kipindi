import Link from "next/link";
import { cookies } from "next/headers";
import { I } from "@/components/ui/glyphs";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { Field } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { CountdownPill } from "@/components/ui/countdown-pill";
import { RateLimitBanner } from "@/components/auth/rate-limit-banner";
import { startLoginAction } from "./actions";
import { SUPPORT_EMAIL, HELPLINE } from "@/lib/support-config";

export const metadata = { title: "Sign in · Ingia" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; error?: string; retry?: string; next?: string; closed?: string; excluded?: string; cooled?: string; reset?: string }>;
}) {
  // Note: the "bounce authed users away from this page" check lives in
  // src/app/auth/(public)/layout.tsx so the redirect happens before the
  // page renders. Avoiding redirect() inside the page itself sidesteps a
  // Next.js 16 dev-mode hook-count mismatch on hot reload.
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
      title: "Password reset · Nenosiri limebadilishwa",
      body: "Your password has been updated. Sign in with your new password.",
      cta: null,
    };
    if (sp.closed === "1") return {
      tone: "warning" as const,
      title: "Account closed · Akaunti imefungwa",
      body: "Your account has been closed. Contact support if you believe this is in error.",
      cta: null,
    };
    if (sp.excluded === "1") return {
      tone: "danger" as const,
      title: "Self-exclusion active · Umejitenga",
      body: "Your self-exclusion is now active. You will not be able to sign in until the period ends.",
      cta: null,
    };
    if (sp.cooled === "1") return {
      tone: "warning" as const,
      title: "Cooling off · Pumzika kidogo",
      body: "Your cooling-off period is now active. You will not be able to sign in until it ends.",
      cta: null,
    };
    if (wasRevoked) return {
      tone: "warning" as const,
      title: "Signed out · Umetolewa",
      body: "Your account was signed in on another device. Only one session is allowed at a time for your security.",
      cta: null,
    };
    switch (sp.error) {
      case "no_account":
        return {
          tone: "warning" as const,
          title: "No account yet · Bado huna akaunti",
          body: "We couldn't find an account for that phone. Create one in 30 seconds.",
          cta: { href: `/auth/register${nextSafe ? `?next=${encodeURIComponent(nextSafe)}` : ""}`, label: "Create account · Fungua akaunti" },
        };
      case "wrong_credentials":
        return {
          tone: "danger" as const,
          title: "Wrong phone or password · Simu au nenosiri si sahihi",
          body: "Check the digits and try again. After several failed tries we'll slow you down.",
          cta: null,
        };
      case "rate_limited":
        return {
          tone: "warning" as const,
          title: "Too many tries · Majaribio mengi",
          body: Number.isFinite(retrySec) && retrySec > 0
            ? <RateLimitBanner seconds={retrySec} clearHref={`/auth/login${nextSafe ? `?next=${encodeURIComponent(nextSafe)}` : ""}`} />
            : "Wait a couple of minutes and try the same phone again.",
          cta: null,
        };
      case "blocked":
        return {
          tone: "danger" as const,
          title: "Account unavailable · Akaunti haipatikani",
          body: `Contact ${SUPPORT_EMAIL()} if you believe this is in error.`,
          cta: null,
        };
      default:
        return null;
    }
  })();

  return (
    <main className="relative min-h-[calc(100vh-44px)] grid place-items-center overflow-hidden px-3 py-8">
      <BrandTopo opacity={0.05} />
      <div className="relative w-full max-w-md">
        <Link href="/" aria-label="50pick home" className="inline-block mb-6">
          <FiftyLockup size={22} />
        </Link>

        <section
          className="rounded-xl glass-panel p-6 space-y-5"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-gold-300">
              Sign in · Ingia
            </p>
            <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight text-text tracking-[-0.02em]">
              Continue with your phone
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              Enter your phone and password.{" "}
              <span className="italic text-text-subtle">Weka simu na nenosiri.</span>
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
            <Field label="Phone · Simu" hint="Tanzania mobile, 9 digits after +255.">
              <PhoneInput
                id="phone"
                name="phone"
                required
                defaultValue={phoneDefault}
                size="lg"
              />
            </Field>

            <Field label="Password · Nenosiri" hint="At least 8 characters.">
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
                  Wrong phone or password · Simu au nenosiri si sahihi
                </p>
              )}
            </Field>

            <div className="flex items-center justify-end -mt-2">
              <Link
                href="/auth/forgot-password"
                className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-text-subtle hover:text-text"
              >
                Forgot password? · Umesahau?
              </Link>
            </div>

            <SubmitButton label="Sign in · Ingia" pendingLabel="Signing in…" />
          </form>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            No account?{" "}
            <Link
              href={`/auth/register${nextSafe ? `?next=${encodeURIComponent(nextSafe)}` : ""}` as never}
              className="font-semibold text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline"
            >
              Create one · Fungua akaunti
            </Link>
          </p>
        </section>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-text-subtle">
          18+ · Licensed by GBT · Helpline {HELPLINE()}
        </p>
      </div>
    </main>
  );
}
