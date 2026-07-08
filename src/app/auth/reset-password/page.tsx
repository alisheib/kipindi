import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { HELPLINE, SUPPORT_EMAIL } from "@/lib/support-config";
import { verifySession } from "@/lib/server/crypto";
import { db } from "@/lib/server/store";
import { passwordFingerprint } from "@/lib/server/password-reset";
import { resetPasswordAction } from "./actions";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.resetPassword };
}
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

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<{ token?: string; error?: string }> }) {
  const { t } = await getServerT();

  const errorCopy: Record<Exclude<TokenState, "valid">, { eyebrow: string; title: string; body: string }> = {
    expired: {
      eyebrow: t.common.linkExpiredEyebrow,
      title: t.common.linkExpiredTitle,
      body: t.common.linkExpiredBody,
    },
    invalid: {
      eyebrow: t.common.linkInvalidEyebrow,
      title: t.common.linkInvalidTitle,
      body: t.common.linkInvalidBody,
    },
    email_changed: {
      eyebrow: t.common.linkEmailChangedEyebrow,
      title: t.common.linkEmailChangedTitle,
      body: t.common.linkEmailChangedBody,
    },
  };
  const sp = (await searchParams) ?? {};
  const token = sp.token ?? "";
  if (!token) redirect("/auth/forgot-password");

  const state = await checkToken(token);

  // Bad token — show error state, NOT the form
  if (state !== "valid") {
    const c = errorCopy[state];
    return (
      <AuthShell>

          <section className="rounded-xl glass-panel p-6 space-y-5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-pill bg-no-500/12 text-no-300">
              {state === "expired" ? <I.clock s={22} /> : <I.alertCircle s={22} />}
            </span>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-no-300">
                {c.eyebrow}
              </p>
              <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight text-text tracking-[-0.02em]">
                {c.title}
              </h1>
              <p className="mt-2 text-[13.5px] text-text-muted leading-relaxed">
                {c.body}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <Link href="/auth/forgot-password" className="btn btn-gold btn-lg btn-pill w-full">
                {t.common.requestNewLink}
              </Link>
              <Link href="/auth/login" className="btn btn-ghost btn-lg btn-pill w-full">
                {t.common.backToSignIn}
              </Link>
            </div>

            <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
              {t.common.needHelpEmail}{" "}
              <a href={`mailto:${SUPPORT_EMAIL()}`} className="font-semibold text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline">
                {SUPPORT_EMAIL()}
              </a>
            </p>
          </section>

      </AuthShell>
    );
  }

  // Valid token — show the password form
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
              {t.common.resetPassword}
            </p>
            <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight text-text tracking-[-0.02em]">
              {t.common.setNewPassword}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              {t.common.strongPassword}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-gold-300">
              <I.clock s={12} />
              {t.common.thisLinkExpires}
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
                {t.common.newPassword}
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
                {t.common.confirmPassword}
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
            <SubmitButton label={t.common.resetPassword} pendingLabel={t.common.resetting} />
          </form>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            {t.common.linkExpired}{" "}
            <Link
              href="/auth/forgot-password"
              className="font-semibold text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline"
            >
              {t.common.requestNewOne}
            </Link>
          </p>
        </section>

    </AuthShell>
  );
}
