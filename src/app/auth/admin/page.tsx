import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { PhoneInput } from "@/components/ui/phone-input";
import { PasswordInput } from "@/components/ui/password-input";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { hasTotp } from "@/lib/server/totp";
import { startLoginAction } from "@/app/auth/login/actions";

export const metadata = { title: "Admin sign in · Kuingia" };
export const dynamic = "force-dynamic";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

export default async function AdminLoginPage() {
  const session = await currentSession();
  if (session) {
    const u = await db.user.findById(session.userId);
    const isAdmin = u && ADMIN_ROLES.has(u.role);
    if (isAdmin) {
      if (hasTotp(session.userId)) {
        redirect("/admin/totp-verify");
      }
      redirect("/admin");
    }
    redirect("/");
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-44px)] place-items-center px-3 py-6">
      <div className="w-full max-w-lg space-y-4">
        <header className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 h-7 rounded-pill border border-gold-700 bg-gold-500/10">
            <span className="h-1.5 w-1.5 rounded-pill bg-gold-300" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-gold-300">
              Staff · Confidential
            </span>
          </div>
          <h1 className="font-display text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">
            Admin sign in
          </h1>
          <p className="text-[14px] italic text-text-subtle">Kuingia kwa wafanyakazi</p>
        </header>

        <section
          className="relative overflow-hidden rounded-xl border border-gold-700 bg-bg-elevated p-5 lg:p-6 space-y-4"
          style={{ boxShadow: "0 0 0 1px color-mix(in oklab, var(--gilt) 30%, transparent) inset" }}
        >
          <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
            <FiftyMark size={160} />
          </div>

          <div className="relative flex items-start gap-2.5 pb-3 border-b border-border">
            <I.shieldcheck s={16} className="text-gold-300 shrink-0 mt-0.5" />
            <div className="text-[12.5px] text-text-muted">
              <p className="font-display font-semibold text-text">
                For ADMIN, COMPLIANCE, MODERATOR roles only
              </p>
              <p>Step 1: phone OTP. Step 2: 6-digit authenticator code (RFC 6238). Both events audited.</p>
            </div>
          </div>

          <form action={startLoginAction} className="relative space-y-3">
            <div>
              <label
                htmlFor="phone"
                className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-1.5"
              >
                Phone · Simu
              </label>
              <PhoneInput id="phone" name="phone" required autoComplete="tel" size="lg" />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-1.5"
              >
                Password · Nenosiri
              </label>
              <PasswordInput
                id="password"
                name="password"
                required
                minLength={8}
                autoComplete="current-password"
                placeholder="••••••••"
                size="lg"
              />
            </div>
            <button type="submit" className="btn btn-gold btn-xl w-full rounded-full">
              <I.lock s={15} />
              Sign in · Ingia
            </button>
          </form>

          <div className="relative flex items-center gap-2 pt-3 border-t border-border font-mono text-[11px] text-text-subtle">
            <I.smartphone s={11} />
            <span>If TOTP is enabled on your account you will be prompted next.</span>
          </div>
        </section>

        <Link
          href="/auth/login"
          className="flex items-center justify-between gap-2 rounded-xl border border-border bg-bg-elevated p-4 hover:border-aqua-edge transition-colors group"
        >
          <div>
            <p className="font-display text-[13.5px] font-semibold text-text">I&apos;m a player, not staff</p>
            <p className="mt-0.5 text-[11.5px] text-text-subtle">Sign in to your player account instead</p>
          </div>
          <I.chevronRight s={16} className="text-text-subtle group-hover:text-text transition-colors" />
        </Link>

        <p className="text-center font-mono text-[11px] text-text-subtle">
          Lost device or codes? Contact <span className="text-text-muted">support@50pick.com</span> with your AML lead in copy.
        </p>
      </div>
    </main>
  );
}
