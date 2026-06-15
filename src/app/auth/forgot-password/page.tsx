import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { PhoneInput } from "@/components/ui/phone-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { SUPPORT_EMAIL, HELPLINE, HELPLINE_TEL } from "@/lib/support-config";
import { requestResetAction } from "./actions";

export const metadata = { title: "Forgot password · Umesahau nenosiri?" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams?: Promise<{ sent?: string; phone?: string; error?: string }> }) {
  const sp = (await searchParams) ?? {};
  const sent = sp.sent === "1";
  const phoneDefault = (sp.phone ?? "").replace(/^\+255/, "").replace(/\D+/g, "").slice(0, 9);

  return (
    <main className="relative min-h-[calc(100vh-44px)] grid place-items-center overflow-hidden px-3 py-8">
      <BrandTopo opacity={0.05} />
      <div className="relative w-full max-w-md">
        <Link href="/" aria-label="50pick home" className="inline-block mb-6">
          <FiftyLockup size={22} />
        </Link>

        <section className="rounded-xl glass-panel p-6 space-y-5">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
          >
            <I.chevronLeft s={14} />
            Back to sign in
          </Link>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-gold-300">
              Forgot password · Umesahau nenosiri?
            </p>
            <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight text-text tracking-[-0.02em]">
              Recover your account
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              Enter your phone number. If you have an email on file, we&rsquo;ll send a reset link.{" "}
              <span className="italic text-text-subtle">Weka nambari ya simu yako.</span>
            </p>
          </div>

          {sent && (
            <div role="status" className="rounded-md border border-yes-700 bg-yes-500/10 px-3.5 py-3 text-[13px]">
              <p className="font-display font-semibold text-yes-300">Check your email</p>
              <p className="mt-0.5 text-text-muted">
                If an account with an email exists for that phone, we sent a reset link. It expires in 1 hour.{" "}
                <span className="italic text-text-subtle">Angalia barua pepe yako.</span>
              </p>
            </div>
          )}

          {sp.error === "rate_limited" && (
            <div role="alert" className="rounded-md border border-warning-border bg-warning-bg/20 px-3.5 py-3 text-[13px] text-gold-300">
              Too many attempts. Wait a moment and try again. · Majaribio mengi sana.
            </div>
          )}

          {!sent && (
            <form action={requestResetAction} className="space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5"
                >
                  Phone · Simu
                </label>
                <PhoneInput
                  id="phone"
                  name="phone"
                  required
                  defaultValue={phoneDefault}
                  size="lg"
                />
              </div>
              <SubmitButton label="Send reset link · Tuma kiungo" pendingLabel="Sending…" />
            </form>
          )}

          {/* Fallback — users without email */}
          <div className="rounded-xl border border-border bg-bg-overlay/40 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <I.shieldQuestion s={16} className="mt-0.5 shrink-0 text-text-subtle" />
              <div className="text-[12.5px] text-text-muted leading-relaxed">
                <p className="font-display font-semibold text-text">No email? Contact support</p>
                <p>
                  If you don&rsquo;t have an email linked to your account, our team can verify your
                  identity through KYC and reset your password manually.{" "}
                  <span className="italic text-text-subtle">
                    Wasiliana na msaada wetu tukusaidie.
                  </span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={`tel:${HELPLINE_TEL()}`}
                className="flex items-center gap-2.5 rounded-md border border-border bg-bg-elevated px-3 py-2.5 hover:border-gold-700 transition-colors"
              >
                <I.phone s={14} className="text-gold-300 shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-bold text-text">{HELPLINE()}</p>
                  <p className="text-[10px] text-text-subtle">8 am – 8 pm</p>
                </div>
              </a>
              <a
                href={`mailto:${SUPPORT_EMAIL()}?subject=Password%20reset%20request`}
                className="flex items-center gap-2.5 rounded-md border border-border bg-bg-elevated px-3 py-2.5 hover:border-gold-700 transition-colors"
              >
                <I.mail s={14} className="text-gold-300 shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-bold text-text truncate">{SUPPORT_EMAIL()}</p>
                  <p className="text-[10px] text-text-subtle">1 business day</p>
                </div>
              </a>
            </div>
          </div>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            Remembered it?{" "}
            <Link
              href="/auth/login"
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
