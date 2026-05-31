import Link from "next/link";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { SubmitButton } from "@/components/ui/submit-button";
import { verifyLoginOtpAction, resendOtpAction } from "../login/actions";

export const metadata = { title: "Enter code · Weka msimbo" };

export default async function OtpPage({ searchParams }: { searchParams: Promise<{ purpose?: string; phone?: string; error?: string; sent?: string }> }) {
  const sp = await searchParams;
  const purpose = (sp.purpose ?? "login") as "login" | "register" | "withdraw" | "reauth" | "self_exclusion";
  const phone = sp.phone ?? "";
  const error = sp.error ?? "";
  const sent = sp.sent === "1";
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
          className="rounded-2xl border border-border bg-bg-elevated p-6 space-y-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-gold-300">
              Verification · Uthibitisho
            </p>
            <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight text-text tracking-[-0.02em]">
              Enter the 6-digit code
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              Sent to <span className="font-mono text-text font-semibold">{masked}</span>.{" "}
              <span className="italic text-text-subtle">Imetumwa.</span>
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-md border border-no-700 bg-no-500/10 px-3 py-2.5 text-[13px] text-no-300">
              {errorMsg[error] ?? error}
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
            <label className="block">
              <span className="block font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5">
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
                className="input input-mono w-full text-center"
                style={{ height: 64, fontSize: 28, letterSpacing: "0.6em" }}
              />
              <p className="mt-1.5 text-[11px] text-text-subtle">
                Code valid for 5 minutes. <span className="italic">Msimbo ni kwa dakika 5.</span>
              </p>
            </label>
            <SubmitButton label="Verify · Thibitisha" pendingLabel="Verifying…" />
          </form>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <Link
              href={purpose === "register" ? "/auth/register" : "/auth/login"}
              className="font-mono text-[12px] uppercase tracking-[0.14em] text-text-subtle hover:text-text transition-colors"
            >
              ← Change number
            </Link>
            {purpose === "register" ? (
              // A register OTP can't be re-issued without the original sign-up
              // payload, so send the user back to start over (phone prefilled).
              <Link
                href={`/auth/register${phone ? `?phone=${encodeURIComponent(phone)}` : ""}`}
                className="font-mono text-[12px] uppercase tracking-[0.14em] text-aqua-200 hover:text-aqua-100 transition-colors"
              >
                Start over
              </Link>
            ) : (
              <form action={resendOtpAction}>
                <input type="hidden" name="phone" value={phone} />
                <input type="hidden" name="purpose" value={purpose} />
                <button
                  type="submit"
                  className="font-mono text-[12px] uppercase tracking-[0.14em] text-aqua-200 hover:text-aqua-100 transition-colors"
                >
                  Resend code
                </button>
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
