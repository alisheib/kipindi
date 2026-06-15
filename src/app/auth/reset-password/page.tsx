import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { HELPLINE, SUPPORT_EMAIL } from "@/lib/support-config";
import { verifySession } from "@/lib/server/crypto";
import { db } from "@/lib/server/store";
import { passwordFingerprint } from "@/lib/server/password-reset";
import { resetPasswordAction } from "./actions";

export const metadata = { title: "Reset password · Badilisha nenosiri" };
export const dynamic = "force-dynamic";

type TokenState = "valid" | "expired" | "invalid" | "email_changed";

/** Pre-validate the token WITHOUT consuming it — just check HMAC, expiry, email match. */
async function checkToken(token: string): Promise<TokenState> {
  const payload = verifySession<{ purpose: string; userId: string; email: string; pwh?: string; exp: number }>(token);
  if (!payload) return "expired"; // HMAC fail or exp passed
  if (payload.purpose !== "password-reset" || !payload.userId || !payload.email) return "invalid";
  const user = await db.user.findById(payload.userId);
  if (!user) return "invalid";
  const currentEmail = (user.email ?? "").trim().toLowerCase();
  if (currentEmail !== payload.email.trim().toLowerCase()) return "email_changed";
  // Single-use: a completed reset rotates the password hash, so an already-used
  // link no longer matches the fingerprint baked into the token.
  if (payload.pwh !== undefined && passwordFingerprint(user.passwordHash) !== payload.pwh) return "invalid";
  return "valid";
}

const ERROR_COPY: Record<Exclude<TokenState, "valid">, { eyebrow: string; title: string; body: string; sw: string }> = {
  expired: {
    eyebrow: "Link expired · Kiungo kimeisha",
    title: "This reset link has expired",
    body: "Password reset links are valid for 1 hour. Request a new one below.",
    sw: "Kiungo cha kubadilisha nenosiri kinaisha baada ya saa 1. Omba kipya hapa chini.",
  },
  invalid: {
    eyebrow: "Link invalid · Kiungo si sahihi",
    title: "This reset link isn't valid",
    body: "The link may be damaged or was already used. Request a fresh one below.",
    sw: "Kiungo kinaweza kuwa kimeharibika. Omba kipya hapa chini.",
  },
  email_changed: {
    eyebrow: "Link out of date · Kiungo kimepitwa",
    title: "Your email changed since this link was sent",
    body: "For security, changing your email invalidates any outstanding reset links. Request a new one with your current email.",
    sw: "Kubadilisha barua pepe kunabatilisha viungo vya awali. Omba kipya.",
  },
};

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<{ token?: string; error?: string }> }) {
  const sp = (await searchParams) ?? {};
  const token = sp.token ?? "";
  if (!token) redirect("/auth/forgot-password");

  const state = await checkToken(token);

  // Bad token — show error state, NOT the form
  if (state !== "valid") {
    const c = ERROR_COPY[state];
    return (
      <main className="relative min-h-[calc(100vh-44px)] grid place-items-center overflow-hidden px-3 py-8">
        <BrandTopo opacity={0.05} />
        <div className="relative w-full max-w-md">
          <Link href="/" aria-label="50pick home" className="inline-block mb-6">
            <FiftyLockup size={22} />
          </Link>

          <section className="rounded-xl glass-panel p-6 space-y-5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-pill bg-no-500/12 text-no-300">
              {state === "expired" ? <I.clock s={22} /> : <I.alertCircle s={22} />}
            </span>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-no-300">
                {c.eyebrow}
              </p>
              <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight text-text tracking-[-0.02em]">
                {c.title}
              </h1>
              <p className="mt-2 text-[13.5px] text-text-muted leading-relaxed">
                {c.body}
                <span className="block italic text-text-subtle text-[12px] mt-1">{c.sw}</span>
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <Link href="/auth/forgot-password" className="btn btn-gold btn-lg w-full" style={{ borderRadius: "var(--r-pill)" }}>
                Request a new link · Omba kiungo kipya
              </Link>
              <Link href="/auth/login" className="btn btn-ghost btn-lg w-full" style={{ borderRadius: "var(--r-pill)" }}>
                Back to sign in · Ingia
              </Link>
            </div>

            <p className="border-t border-border pt-3 text-center text-[12.5px] text-text-muted">
              Need help? Email{" "}
              <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-semibold text-accent-400 hover:text-accent-300 underline-offset-2 hover:underline">
                {SUPPORT_EMAIL()}
              </a>
            </p>
          </section>

          <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-text-subtle">
            18+ · Licensed by GBT · Helpline {HELPLINE()}
          </p>
        </div>
      </main>
    );
  }

  // Valid token — show the password form
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
              Reset password · Badilisha nenosiri
            </p>
            <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight text-text tracking-[-0.02em]">
              Set a new password
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              Choose a strong password (8+ characters).{" "}
              <span className="italic text-text-subtle">Chagua nenosiri imara.</span>
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-gold-300">
              <I.clock s={12} />
              This link expires 1 hour after it was sent. · Kiungo hiki kinaisha baada ya saa 1.
            </p>
          </div>

          {sp.error && (
            <div role="alert" className="rounded-md border border-no-700 bg-no-500/10 px-3.5 py-3 text-[13px] text-no-300">
              {sp.error}
            </div>
          )}

          <form action={resetPasswordAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <div>
              <label
                htmlFor="password"
                className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5"
              >
                New password · Nenosiri jipya
              </label>
              <PasswordInput
                id="password"
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="••••••••"
                size="lg"
                showStrength
              />
            </div>
            <div>
              <label
                htmlFor="confirm"
                className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5"
              >
                Confirm password · Thibitisha nenosiri
              </label>
              <PasswordInput
                id="confirm"
                name="confirm"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="••••••••"
                size="lg"
              />
            </div>
            <SubmitButton label="Reset password · Badilisha" pendingLabel="Resetting…" />
          </form>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            Link expired?{" "}
            <Link
              href="/auth/forgot-password"
              className="font-semibold text-accent-400 hover:text-accent-300 underline-offset-2 hover:underline"
            >
              Request a new one
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
