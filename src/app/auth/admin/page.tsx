import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { FiftyMark, FiftyLockup } from "@/components/brand";
import { PhoneInput } from "@/components/ui/phone-input";
import { PasswordInput } from "@/components/ui/password-input";
import { FieldLegend } from "@/components/ui/field-legend";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { hasTotp } from "@/lib/server/totp";
import { SubmitButton } from "@/components/ui/submit-button";
import { startLoginAction } from "@/app/auth/login/actions";
import { SUPPORT_EMAIL } from "@/lib/support-config";
import { isStaffRole } from "@/lib/server/roles";

export const metadata = { title: "Admin sign in · Kuingia" };
export const dynamic = "force-dynamic";

// RBAC: any staff role may open the console (see isStaffRole).

export default async function AdminLoginPage({ searchParams }: { searchParams?: Promise<{ next?: string }> }) {
  const nextRaw = (await searchParams)?.next ?? "";
  // Open-redirect safety: only /admin paths may round-trip.
  const next = nextRaw.startsWith("/admin") && !nextRaw.startsWith("//") && !nextRaw.startsWith("/auth") ? nextRaw : "";

  const session = await currentSession();
  if (session) {
    const u = await db.user.findById(session.userId);
    const isAdmin = u && isStaffRole(u.role);
    if (isAdmin) {
      if (process.env.DISABLE_ADMIN_TOTP !== "true" && await hasTotp(session.userId)) {
        redirect(next ? `/admin/totp-verify?next=${encodeURIComponent(next)}` : "/admin/totp-verify");
      }
      redirect((next || "/admin") as never);
    }
    // Non-admin with a deep-link: show the form so they can sign in
    // with admin credentials. Without a deep-link, just go home.
    if (!next) redirect("/");
    // Fall through to render the login form
  }

  // flex (not `grid place-items-center`): a centered grid track auto-sizes to the
  // form's max-content width and, with overflow:clip, clips the form off a 320–390px
  // phone (esp. the wider ZH strings). Flex sizes the child to the column instead.
  return (
    <div className="mx-auto flex min-h-[calc(100vh-44px)] items-center justify-center px-3 py-6">
      {/* B7 — was max-w-lg (512) where every sibling auth form is max-w-md (448). */}
      <div className="w-full min-w-0 max-w-md space-y-4">
        <header className="text-center space-y-1.5">
          <Link href="/" aria-label="50pick home" className="mb-2 inline-block transition-opacity hover:opacity-90">
            <FiftyLockup size={22} />
          </Link>
          {/* Admin gold-discipline: gold is only the resolved seal. Royal frame
              (sibling of the Step-2 authenticator card) with a claret "restricted"
              dot — the console ConfidentialBand's security signal. */}
          <div className="flex w-fit mx-auto items-center gap-2 px-3 h-7 rounded-pill border border-brand-500 bg-brand-500/10">
            <span className="h-1.5 w-1.5 shrink-0 rounded-pill" style={{ background: "var(--claret-200)" }} />
            <span className="font-mono text-micro uppercase tracking-[0.18em] font-bold text-brand-300 whitespace-nowrap">
              Staff · Confidential
            </span>
          </div>
          <h1 className="font-display text-title-lg font-bold text-text leading-tight tracking-[-0.02em]">
            Admin sign in
          </h1>
          <p className="text-[14px] italic text-text-subtle">Kuingia kwa wafanyakazi</p>
        </header>

        <section
          className="relative overflow-hidden rounded-xl border border-brand-500 bg-bg-elevated p-6 space-y-5"
          style={{ boxShadow: "0 0 0 1px color-mix(in oklab, var(--brand-500) 30%, transparent) inset" }}
        >
          <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
            <FiftyMark size={160} />
          </div>

          <div className="relative flex items-start gap-2.5 pb-3 border-b border-border">
            <I.shieldcheck s={16} className="text-brand-300 shrink-0 mt-0.5" />
            <div className="text-[12.5px] text-text-muted">
              <p className="font-display font-semibold text-text">
                For 50pick staff accounts only
              </p>
              <p>Step 1: phone OTP. Step 2: 6-digit authenticator code (RFC 6238). Both events audited.</p>
            </div>
          </div>

          <form action={startLoginAction} className="relative space-y-3">
            {next && <input type="hidden" name="next" value={next} />}
            <div>
              {/* ⭐ DG-A-11 — the kit's own eyebrow, adopted. This was `font-mono text-micro
                  uppercase tracking-[0.16em] font-bold text-text-muted` typed by hand, i.e.
                  `FieldLegend`'s recipe BYTE FOR BYTE, so the swap moves no pixel; `className`
                  still carries the two classes that are this site's own (`block mb-1.5`). */}
              <FieldLegend as="label" htmlFor="phone" className="block mb-1.5">
                Phone · Simu
              </FieldLegend>
              <PhoneInput id="phone" name="phone" required autoComplete="tel" size="lg" />
            </div>
            <div>
              <FieldLegend as="label" htmlFor="password" className="block mb-1.5">
                Password · Nenosiri
              </FieldLegend>
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
            <SubmitButton label="Sign in · Ingia" pendingLabel="Signing in…" size="xl" />
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
            <p className="mt-0.5 text-body-sm text-text-subtle">Sign in to your player account instead</p>
          </div>
          <I.chevronRight s={16} className="text-text-subtle group-hover:text-text transition-colors" />
        </Link>

        <p className="text-center font-mono text-[11px] text-text-subtle">
          Lost device or codes? Contact <span className="text-text-muted">{SUPPORT_EMAIL()}</span> with your AML lead in copy.
        </p>
      </div>
    </div>
  );
}
