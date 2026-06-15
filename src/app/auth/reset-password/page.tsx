import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { HELPLINE } from "@/lib/support-config";
import { resetPasswordAction } from "./actions";

export const metadata = { title: "Reset password · Badilisha nenosiri" };

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<{ token?: string; error?: string }> }) {
  const sp = (await searchParams) ?? {};
  const token = sp.token ?? "";
  if (!token) redirect("/auth/forgot-password");

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
