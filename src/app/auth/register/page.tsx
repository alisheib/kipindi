import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Checkbox } from "@/components/ui/checkbox";
import { FiftyLockup, FiftyMark } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { Field, Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { PasswordPair } from "@/components/auth/password-pair";
import { DateSelect } from "@/components/ui/date-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { resolveReferralPreview } from "@/lib/server/affiliate-service";
import { startRegisterAction } from "./actions";
import { HELPLINE } from "@/lib/support-config";

export const metadata = { title: "Create account · Fungua akaunti" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; error?: string; message?: string; ref?: string; next?: string }>;
}) {
  // Bounce-authed-users guard lives in src/app/auth/layout.tsx so the
  // redirect happens before any page hooks run (avoids a Next.js 16
  // dev-mode hook-count mismatch on hot reload).
  const sp = await searchParams;
  const phoneDefault = (sp.phone ?? "").replace(/^\+255/, "").replace(/\D+/g, "").slice(0, 9);
  const refCode = (sp.ref ?? "").trim().slice(0, 16);
  // Carry the post-auth destination (e.g. the market the player tapped YES on)
  // through registration so they land back on it — new players are PENDING_KYC
  // but can still bet with the starter balance, so we honor their intent.
  const nextRaw = (sp.next ?? "").trim();
  const nextOk = /^\/(?![/\\])/.test(nextRaw) ? nextRaw : "";
  const referral = refCode ? await resolveReferralPreview(refCode) : null;

  const errorPanel = (() => {
    if (!sp.error) return null;
    if (sp.error === "exists") {
      return {
        tone: "warning" as const,
        title: "Account already exists · Akaunti tayari ipo",
        body: "That phone is already registered. Sign in with your password.",
        cta: { href: `/auth/login?phone=${encodeURIComponent(phoneDefault)}`, label: "Sign in · Ingia" },
      };
    }
    if (sp.error === "rate_limited") {
      return {
        tone: "warning" as const,
        title: "Too many tries · Majaribio mengi",
        body: "Wait a couple of minutes and try again.",
        cta: null,
      };
    }
    const msg = (sp as { message?: string }).message;
    return {
      tone: "danger" as const,
      title: "Could not create account",
      body: msg ? decodeURIComponent(msg) : "Check the form fields and try again.",
      cta: null,
    };
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
              Create account · Fungua akaunti
            </p>
            <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight text-text tracking-[-0.02em]">
              Welcome to 50pick
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              Tanzania mobile number, age 18+.{" "}
              <span className="italic text-text-subtle">Simu ya Tanzania, miaka 18+.</span>
            </p>
          </div>

          {referral && (
            <div
              className="overflow-hidden rounded-xl border"
              style={{
                borderColor: "color-mix(in oklab, var(--gold-500) 36%, transparent)",
                background: "linear-gradient(135deg, color-mix(in oklab, var(--gold-500) 16%, var(--bg-elevated)), var(--bg-elevated))",
              }}
            >
              <div className="flex items-center gap-3 p-3.5">
                <FiftyMark size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-text">You were invited by {referral.referrerName}</p>
                  <p className="font-display italic text-text-subtle text-[11px]">Umealikwa na rafiki</p>
                  {referral.newPlayerBonusTzs > 0 && (
                    <p className="mt-1 text-[12.5px] font-semibold text-gold-300">
                      {referral.bonusTrigger === "SIGNUP"
                        ? `Sign up & get TZS ${referral.newPlayerBonusTzs.toLocaleString()} to start`
                        : `Get TZS ${referral.newPlayerBonusTzs.toLocaleString()} on your first deposit`}{" "}
                      · Pata TZS {referral.newPlayerBonusTzs.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

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
              <span className={"mt-0.5 shrink-0 " + (errorPanel.tone === "danger" ? "text-no-300" : "text-gold-300")}>
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

          <form action={startRegisterAction} className="space-y-4">
            {referral && <input type="hidden" name="ref" value={refCode} />}
            {nextOk && <input type="hidden" name="next" value={nextOk} />}
            {referral && (
              <Field label="Referral code · auto-filled">
                <Input
                  readOnly
                  value={refCode.toUpperCase()}
                  prefix="REF"
                  mono
                  aria-label="Referral code"
                  className="text-gold-300 font-semibold"
                />
              </Field>
            )}
            <Field label="Phone · Simu" hint="9 digits after +255 (e.g. 712 345 678).">
              <PhoneInput
                id="phone"
                name="phone"
                required
                defaultValue={phoneDefault}
                size="lg"
              />
            </Field>

            <Field label="Date of birth · Tarehe ya kuzaliwa" hint="You must be 18 or older. Lazima uwe na miaka 18+.">
              {(() => {
                const today = new Date();
                const maxDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
                const maxStr = `${maxDob.getFullYear()}-${String(maxDob.getMonth() + 1).padStart(2, "0")}-${String(maxDob.getDate()).padStart(2, "0")}`;
                return (
                  <DateSelect
                    name="dob"
                    id="dob"
                    required
                    min="1930-01-01"
                    max={maxStr}
                  />
                );
              })()}
            </Field>

            <PasswordPair />

            <fieldset className="space-y-2.5 pt-1">
              <Checkbox
                name="acceptAge"
                required
                label={<span className="text-[13px] text-text-muted">I confirm I am 18 or older. <span className="italic text-text-subtle">Ninathibitisha nina miaka 18+.</span></span>}
              />
              <Checkbox
                name="acceptTerms"
                required
                label={<span className="text-[13px] text-text-muted">I accept the{" "}<Link href="/legal/terms" className="text-accent-400 underline-offset-2 hover:underline">Terms</Link>{" "}and{" "}<Link href="/legal/privacy" className="text-accent-400 underline-offset-2 hover:underline">Privacy</Link>. <span className="italic text-text-subtle">Ninakubali Sheria na Faragha.</span></span>}
              />
              <Checkbox
                name="marketingOptIn"
                label={<span className="text-[13px] text-text-muted">Send me product updates (optional). <span className="italic text-text-subtle">Nipe matangazo (hiari).</span></span>}
              />
            </fieldset>

            <SubmitButton label="Create account · Fungua akaunti" pendingLabel="Creating account…" />
          </form>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            Already have an account?{" "}
            <Link
              href={"/auth/login" as never}
              className="font-semibold text-accent-400 hover:text-accent-300 underline-offset-2 hover:underline"
            >
              Sign in · Ingia
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
