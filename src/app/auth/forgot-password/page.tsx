import Link from "next/link";
import { ChevronLeft, ShieldQuestion, Phone, Mail } from "lucide-react";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";

export const metadata = { title: "Forgot password · Umesahau nenosiri?" };

export default function ForgotPasswordPage() {
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
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
          >
            <ChevronLeft size={14} aria-hidden />
            Back to sign in
          </Link>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-gold-300">
              Forgot password · Umesahau nenosiri?
            </p>
            <h1 className="mt-1.5 font-display text-[24px] font-bold leading-tight text-text tracking-[-0.02em]">
              Recover your account
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              Tutakusaidia kurudisha akaunti yako.{" "}
              <span className="italic text-text-subtle">We will help you regain access.</span>
            </p>
          </div>

          <div className="rounded-xl border border-warning-border bg-warning-bg/20 p-4">
            <div className="flex items-start gap-2.5">
              <ShieldQuestion size={18} className="mt-0.5 shrink-0 text-warning-fg" aria-hidden />
              <div className="text-[13px] text-text-muted leading-relaxed">
                <p className="font-display font-semibold text-text mb-1">
                  Self-serve reset is coming soon
                </p>
                <p>
                  We launch SMS-based password reset alongside our regulator-licensed
                  SMS provider. Until then, please contact support and we will verify
                  your identity through KYC and reset your password manually.
                </p>
                <p className="italic text-text-subtle text-[12px] mt-2">
                  Tutaanzisha urejeshaji wa nenosiri kupitia SMS hivi karibuni.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href="tel:0800110011"
              className="flex items-start gap-3 rounded-xl border border-border bg-bg-overlay p-4 hover:border-gold-700 transition-colors"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-gold-500/10 text-gold-300 shrink-0">
                <Phone size={18} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-display font-semibold text-text">Helpline · 0800 11 0011</p>
                <p className="mt-0.5 text-[12.5px] text-text-muted">
                  Free in Tanzania, 7 days a week, 8 am – 8 pm.
                </p>
              </div>
            </a>

            <a
              href="mailto:support@50pick.com?subject=Password%20reset%20request"
              className="flex items-start gap-3 rounded-xl border border-border bg-bg-overlay p-4 hover:border-gold-700 transition-colors"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-gold-500/10 text-gold-300 shrink-0">
                <Mail size={18} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-display font-semibold text-text">support@50pick.com</p>
                <p className="mt-0.5 text-[12.5px] text-text-muted">
                  Reply within 1 business day. Include your registered phone number.
                </p>
              </div>
            </a>
          </div>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            Remembered it?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-aqua-200 hover:text-aqua-100 underline-offset-2 hover:underline"
            >
              Sign in · Ingia
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
