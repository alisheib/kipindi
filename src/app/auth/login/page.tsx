import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { Field } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { CountdownPill } from "@/components/ui/countdown-pill";
import { startLoginAction } from "./actions";

export const metadata = { title: "Sign in · Ingia" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; error?: string; retry?: string; next?: string }>;
}) {
  // Note: the "bounce authed users away from this page" check lives in
  // src/app/auth/(public)/layout.tsx so the redirect happens before the
  // page renders. Avoiding redirect() inside the page itself sidesteps a
  // Next.js 16 dev-mode hook-count mismatch on hot reload.
  const sp = await searchParams;
  const phoneDefault = (sp.phone ?? "").replace(/^\+255/, "").replace(/\D+/g, "").slice(0, 9);
  const retrySec = Number.parseInt(sp.retry ?? "", 10);
  // ?next= is set by the proxy when an unauthed user hits a protected
  // route. We round-trip it through a hidden field so the login action
  // can land the user on the page they actually wanted, not the home.
  // Open-redirect safety: the action validates this is a same-origin,
  // path-only string before redirecting.
  const nextRaw = (sp.next ?? "").trim();
  const nextSafe = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "";

  const errorPanel = (() => {
    switch (sp.error) {
      case "no_account":
        return {
          tone: "warning" as const,
          title: "No account yet · Bado huna akaunti",
          body: "We couldn't find an account for that phone. Create one in 30 seconds — TZS 10,000 lands in your wallet on sign-up.",
          cta: { href: "/auth/register", label: "Create account · Fungua akaunti" },
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
            ? <>You can try again in <CountdownPill seconds={retrySec} suffix="· Subiri" />.</>
            : "Wait a couple of minutes and try the same phone again.",
          cta: null,
        };
      case "blocked":
        return {
          tone: "danger" as const,
          title: "Account unavailable · Akaunti haipatikani",
          body: "Contact support@50pick.com if you believe this is in error.",
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
          className="rounded-2xl glass-panel p-6 space-y-5"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-gold-300">
              Sign in · Ingia
            </p>
            <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight text-text tracking-[-0.02em]">
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
                (errorPanel.tone === "danger"
                  ? "border-no-700/60 bg-no-500/[0.10]"
                  : "border-warning-border bg-warning-bg/30")
              }
            >
              <AlertCircle
                size={16}
                className={"mt-0.5 shrink-0 " + (errorPanel.tone === "danger" ? "text-no-300" : "text-gold-300")}
              />
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
              />
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
              href={"/auth/register" as never}
              className="font-semibold text-aqua-200 hover:text-aqua-100 underline-offset-2 hover:underline"
            >
              Create one · Fungua akaunti
            </Link>
          </p>
        </section>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-text-subtle">
          18+ · Licensed by GBT · Helpline 0800 11 0011
        </p>
      </div>
    </main>
  );
}
