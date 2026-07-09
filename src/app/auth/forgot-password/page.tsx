import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { AuthShell } from "@/components/auth/auth-shell";
import { PhoneInput } from "@/components/ui/phone-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { SUPPORT_EMAIL, HELPLINE, HELPLINE_TEL } from "@/lib/support-config";
import { requestResetAction } from "./actions";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.auth.forgotPassword };
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams?: Promise<{ sent?: string; phone?: string; error?: string }> }) {
  const { t } = await getServerT();
  const sp = (await searchParams) ?? {};
  const sent = sp.sent === "1";
  const phoneDefault = (sp.phone ?? "").replace(/^\+255/, "").replace(/\D+/g, "").slice(0, 9);

  return (
    <AuthShell>

        <section className="rounded-xl glass-panel p-6 space-y-5">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
          >
            <I.chevronLeft s={14} />
            {t.common.backToSignIn}
          </Link>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-gold-300">
              {t.auth.forgotPassword}
            </p>
            <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight text-text tracking-[-0.02em]">
              {t.common.recoverAccount}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              {t.common.recoverBody}
            </p>
          </div>

          {sent && (
            <div role="status" className="rounded-md border border-yes-700 bg-yes-500/10 px-3.5 py-3 text-[13px]">
              <p className="font-display font-semibold text-yes-300">{t.common.checkEmail}</p>
              <p className="mt-0.5 text-text-muted">
                {t.common.checkEmailBody}
              </p>
            </div>
          )}

          {sp.error === "phone_required" && (
            <div role="alert" className="rounded-md border border-no-700 bg-no-500/10 px-3.5 py-3 text-[13px] text-no-300">
              {t.common.enterPhone}
            </div>
          )}
          {sp.error === "rate_limited" && (
            <div role="alert" className="rounded-md border border-warning-border bg-warning-bg/20 px-3.5 py-3 text-[13px] text-gold-300">
              {t.common.tooManyAttempts}
            </div>
          )}

          {!sent && (
            <form action={requestResetAction} className="space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5"
                >
                  {t.auth.phone}
                </label>
                <PhoneInput
                  id="phone"
                  name="phone"
                  required
                  defaultValue={phoneDefault}
                  size="lg"
                />
              </div>
              <SubmitButton label={t.common.sendResetLink} pendingLabel={t.common.sending} />
            </form>
          )}

          {/* Fallback — users without email */}
          <div className="rounded-xl border border-border bg-bg-overlay/40 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <I.shieldQuestion s={16} className="mt-0.5 shrink-0 text-text-subtle" />
              <div className="text-[12.5px] text-text-muted leading-relaxed">
                <p className="font-display font-semibold text-text">{t.common.noEmailContactSupport}</p>
                <p>
                  {t.common.noEmailHelp}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={`tel:${HELPLINE_TEL()}`}
                className="flex items-center gap-2.5 rounded-md border border-border bg-bg-elevated px-3 py-2.5 hover:border-brand-400 transition-colors"
              >
                <I.phone s={14} className="text-gold-300 shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-bold text-text">{HELPLINE()}</p>
                  <p className="text-[10px] text-text-subtle">{t.common.businessHours}</p>
                </div>
              </a>
              <a
                href={`mailto:${SUPPORT_EMAIL()}?subject=Password%20reset%20request`}
                className="flex items-center gap-2.5 rounded-md border border-border bg-bg-elevated px-3 py-2.5 hover:border-brand-400 transition-colors"
              >
                <I.mail s={14} className="text-gold-300 shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-bold text-text truncate">{SUPPORT_EMAIL()}</p>
                  <p className="text-[10px] text-text-subtle">{t.common.oneBusinessDay}</p>
                </div>
              </a>
            </div>
          </div>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            {t.common.rememberedIt}{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline"
            >
              {t.common.signIn}
            </Link>
          </p>
        </section>

    </AuthShell>
  );
}
