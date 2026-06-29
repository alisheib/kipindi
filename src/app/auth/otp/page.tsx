import Link from "next/link";
import { redirect } from "next/navigation";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { SubmitButton } from "@/components/ui/submit-button";
import { CountdownPill } from "@/components/ui/countdown-pill";
import { verifyLoginOtpAction, resendOtpAction } from "../login/actions";
import { ResendOtpButton } from "@/components/auth/resend-otp-button";
import { OtpExpiryCountdown } from "@/components/auth/otp-expiry-countdown";
import { getServerT } from "@/lib/i18n-server";

export const metadata = { title: "Enter code · Weka msimbo" };

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
    wrong_code: "Wrong code — try again. · Msimbo si sahihi.",
    expired: "Code expired — request a new one. · Msimbo umeisha muda.",
    too_many: "Too many attempts — wait a moment. · Majaribio mengi sana.",
    rate_limited: "Rate limited — try again shortly. · Subiri kidogo.",
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
              Verification · Uthibitisho
            </p>
            <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight text-text tracking-[-0.02em]">
              Enter the 6-digit code
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              Sent to <span className="font-mono text-text font-semibold">{masked}</span>.{" "}
              <span className="italic text-text-subtle">Imetumwa.</span>
            </p>
          </div>

          {error && (
            <div id="otp-error" role="alert" className="rounded-md border border-no-700 bg-no-500/10 px-3 py-2.5 text-[13px] text-no-300">
              {errorMsg[error] ?? error}
              {error === "rate_limited" && retrySec > 0 && (
                <> You can request a new code in <CountdownPill seconds={retrySec} suffix="· Subiri" />.</>
              )}
            </div>
          )}

          {sent && !error && (
            <div role="status" className="rounded-md border border-yes-700 bg-yes-500/10 px-3 py-2.5 text-[13px] text-yes-300">
              New code sent. · Msimbo mpya umetumwa.
            </div>
          )}

          <form action={verifyLoginOtpAction} className="space-y-3">
            <input type="hidden" name="phone" value={phone} />
            <input type="hidden" name="purpose" value={purpose} />
            {nextSafe && <input type="hidden" name="next" value={nextSafe} />}
            <label className="block">
              <span className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5">
                Code · Msimbo
              </span>
              <input
                id="code"
                name="code"
                type="text"
                required
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="• • • • • •"
                aria-invalid={error ? "true" : undefined}
                aria-describedby={error ? "otp-error" : "otp-hint"}
                className="w-full h-[52px] text-center font-mono font-semibold text-[20px] tracking-[0.3em] rounded-md bg-bg-inset border border-border text-text outline-none transition-colors brand-focus"
              />
              <OtpExpiryCountdown />
            </label>
            <SubmitButton label="Verify · Thibitisha" pendingLabel={t.common.verifying} />
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
          5 wrong attempts triggers a cool-down · Majaribio 5 mabaya — lazima subiri
        </p>
      </div>
    </main>
  );
}
