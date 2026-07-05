import Link from "next/link";
import { redirect } from "next/navigation";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { SubmitButton } from "@/components/ui/submit-button";
import { OtpInput } from "@/components/ui/otp-input";
import { FieldLegend } from "@/components/ui/field-legend";
import { CountdownPill } from "@/components/ui/countdown-pill";
import { verifyLoginOtpAction, resendOtpAction } from "../login/actions";
import { ResendOtpButton } from "@/components/auth/resend-otp-button";
import { OtpExpiryCountdown } from "@/components/auth/otp-expiry-countdown";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.verification };
}

export default async function OtpPage({ searchParams }: { searchParams: Promise<{ purpose?: string; phone?: string; error?: string; sent?: string; next?: string; retry?: string }> }) {
  // SMS OTP is not wired yet — the live auth flow is password-based. Until the
  // licensed SMS provider is live (OTP_ENABLED=1), this page is dormant and would
  // only confuse a player who lands here via a stale link, so bounce to login.
  if (process.env.OTP_ENABLED !== "1") redirect("/auth/login");

  const { t } = await getServerT();
  const sp = await searchParams;
  const purpose = (sp.purpose ?? "login") as "login" | "register" | "withdraw" | "reauth" | "self_exclusion";
  const phone = sp.phone ?? "";
  const error = sp.error ?? "";
  const sent = sp.sent === "1";
  const retrySec = Math.min(300, Math.max(0, parseInt(sp.retry ?? "0", 10) || 0));
  const nextRaw = (sp.next ?? "").trim();
  const nextSafe = /^\/(?![/\\])/.test(nextRaw) && !nextRaw.startsWith("/auth/") ? nextRaw : "";
  const masked = phone ? phone.slice(0, 4) + "*****" + phone.slice(-2) : "+255*****";
  const errorMsg: Record<string, string> = {
    wrong_code: t.auth.wrongCode,
    expired: t.auth.codeExpired,
    too_many: t.auth.tooManyOtp,
    rate_limited: t.auth.otpRateLimited,
  };

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
              {t.common.verification}
            </p>
            <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight text-text tracking-[-0.02em]">
              {t.common.enterCode}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              {t.common.codeSent} <span className="font-mono text-text font-semibold">{masked}</span>.
            </p>
          </div>

          {error && (
            <div id="otp-error" role="alert" className="rounded-md border border-no-700 bg-no-500/10 px-3 py-2.5 text-[13px] text-no-300">
              {errorMsg[error] ?? error}
              {error === "rate_limited" && retrySec > 0 && (
                <> {t.auth.requestCodeIn} <CountdownPill seconds={retrySec} />.</>
              )}
            </div>
          )}

          {sent && !error && (
            <div role="status" className="rounded-md border border-yes-700 bg-yes-500/10 px-3 py-2.5 text-[13px] text-yes-300">
              {t.common.newCodeSent}
            </div>
          )}

          <form action={verifyLoginOtpAction} className="space-y-3">
            <input type="hidden" name="phone" value={phone} />
            <input type="hidden" name="purpose" value={purpose} />
            {nextSafe && <input type="hidden" name="next" value={nextSafe} />}
            <label className="block">
              <FieldLegend className="block mb-1.5">{t.common.codeLabel}</FieldLegend>
              <OtpInput
                id="code"
                name="code"
                required
                placeholder="• • • • • •"
                aria-invalid={error ? "true" : undefined}
                aria-describedby={error ? "otp-error" : "otp-hint"}
              />
              <OtpExpiryCountdown />
            </label>
            <SubmitButton label={t.common.confirm} pendingLabel={t.common.verifying} />
          </form>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <Link
              href={`${purpose === "register" ? "/auth/register" : "/auth/login"}${nextSafe ? `?next=${encodeURIComponent(nextSafe)}` : ""}` as never}
              className="font-mono text-[12px] uppercase tracking-[0.14em] text-text-subtle hover:text-text transition-colors"
            >
              ← {t.common.changeNumber}
            </Link>
            {purpose === "register" ? (
              // A register OTP can't be re-issued without the original sign-up
              // payload, so send the user back to start over (phone prefilled).
              <Link
                href={`/auth/register?${new URLSearchParams({ ...(phone ? { phone } : {}), ...(nextSafe ? { next: nextSafe } : {}) }).toString()}` as never}
                className="font-mono text-[12px] uppercase tracking-[0.14em] text-brand-300 hover:text-brand-200 transition-colors"
              >
                {t.common.startOver}
              </Link>
            ) : (
              <form action={resendOtpAction}>
                <input type="hidden" name="phone" value={phone} />
                <input type="hidden" name="purpose" value={purpose} />
                <ResendOtpButton />
              </form>
            )}
          </div>
        </section>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-text-subtle">
          {t.common.wrongAttemptsHint}
        </p>
      </div>
    </main>
  );
}
