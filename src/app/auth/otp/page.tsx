import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel, AuthHeader } from "@/components/auth/auth-panel";
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

export default async function OtpPage({ searchParams }: { searchParams: Promise<{ purpose?: string; phone?: string; error?: string; sent?: string; next?: string; retry?: string; exp?: string }> }) {
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
  // B-27 — remaining life computed on the SERVER clock from the code's real
  // expiry (`?exp=` from the issue/resend hop). undefined → component's TTL default.
  const expTs = sp.exp ? Date.parse(sp.exp) : NaN;
  const otpRemainingSec = Number.isFinite(expTs) ? Math.max(0, (expTs - Date.now()) / 1000) : undefined;
  const masked = phone ? phone.slice(0, 4) + "*****" + phone.slice(-2) : "+255*****";
  const errorMsg: Record<string, string> = {
    wrong_code: t.auth.wrongCode,
    expired: t.auth.codeExpired,
    too_many: t.auth.tooManyOtp,
    rate_limited: t.auth.otpRateLimited,
  };

  return (
    <AuthShell>

        <AuthPanel>
          <AuthHeader
            eyebrow={t.common.verification}
            title={t.common.enterCode}
            subtitle={<>{t.common.codeSent} <span className="font-mono text-text font-semibold">{masked}</span>.</>}
          />

          {error && (
            <div id="otp-error" role="alert" className="rounded-md border border-danger-500/70 bg-danger-500/10 px-3 py-2.5 text-[13px] text-danger-fg">
              {errorMsg[error] ?? error}
              {error === "rate_limited" && retrySec > 0 && (
                <> {t.auth.requestCodeIn} <CountdownPill seconds={retrySec} />.</>
              )}
            </div>
          )}

          {sent && !error && (
            <div role="status" className="rounded-md border border-success/65 bg-success/10 px-3 py-2.5 text-[13px] text-success-fg">
              {t.common.newCodeSent}
            </div>
          )}

          <form action={verifyLoginOtpAction} className="space-y-3">
            <input type="hidden" name="phone" value={phone} />
            <input type="hidden" name="purpose" value={purpose} />
            {nextSafe && <input type="hidden" name="next" value={nextSafe} />}
            {/* B-27 — a failed verify round-trips the real expiry too. */}
            {sp.exp && Number.isFinite(expTs) && <input type="hidden" name="exp" value={sp.exp} />}
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
              <OtpExpiryCountdown initialRemainingSec={otpRemainingSec} />
            </label>
            <SubmitButton label={t.common.confirm} pendingLabel={t.common.verifying} />
          </form>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <Link
              href={`${purpose === "register" ? "/auth/register" : "/auth/login"}${nextSafe ? `?next=${encodeURIComponent(nextSafe)}` : ""}` as never}
              className="font-mono text-label uppercase tracking-[0.14em] text-text-subtle hover:text-text transition-colors"
            >
              ← {t.common.changeNumber}
            </Link>
            {purpose === "register" ? (
              // A register OTP can't be re-issued without the original sign-up
              // payload, so send the user back to start over (phone prefilled).
              <Link
                href={`/auth/register?${new URLSearchParams({ ...(phone ? { phone } : {}), ...(nextSafe ? { next: nextSafe } : {}) }).toString()}` as never}
                className="font-mono text-label uppercase tracking-[0.14em] text-brand-300 hover:text-brand-200 transition-colors"
              >
                {t.common.startOver}
              </Link>
            ) : (
              <form action={resendOtpAction}>
                <input type="hidden" name="phone" value={phone} />
                <input type="hidden" name="purpose" value={purpose} />
                {/* B-14 — the resend hop keeps the destination too. */}
                {nextSafe && <input type="hidden" name="next" value={nextSafe} />}
                <ResendOtpButton />
              </form>
            )}
          </div>
        </AuthPanel>

        {/* DG-A-14 · §T4 — "5 wrong attempts triggers a cool-down. Codes expire after 10
            minutes." is two full sentences telling the player a rule, so it is reading copy
            and not a microlabel. It was set in the eyebrow recipe — uppercase, 0.16em
            tracking, text-micro (10px) — which put it 2.5px below the 12.5px reading floor.
            The dressing is removed and the size rises to text-body-sm; colour, centring and
            the mt-6 margin are unchanged. */}
        <p className="mt-6 text-center font-mono text-body-sm text-text-subtle">
          {t.common.wrongAttemptsHint}
        </p>
    </AuthShell>
  );
}
