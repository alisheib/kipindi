import Link from "next/link";
import { redirect } from "next/navigation";
import { Pattern } from "@/components/ui/pattern";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, Smartphone, ChevronRight } from "lucide-react";
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
    const u = db.user.findById(session.userId);
    const isAdmin = !!session.demoMode || (u && ADMIN_ROLES.has(u.role));
    if (isAdmin) {
      // Already signed in as admin → require TOTP if configured, else go to /admin
      if (!session.demoMode && hasTotp(session.userId)) {
        redirect("/admin/totp-verify");
      }
      redirect("/admin");
    }
    // Signed in as a regular player — bounce home
    redirect("/");
  }

  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-center px-3 py-6 bg-bg-base">
      <Pattern kind="sokoni" opacity={0.04} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative w-full max-w-lg space-y-4">
        <header className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 h-7 rounded-md bg-bg-sunken text-onBrand font-mono text-micro tracking-[0.18em] uppercase">
            <span className="h-1.5 w-1.5 rounded-pill bg-gold" />
            <span className="text-white">Staff · Confidential</span>
          </div>
          <h1 className="font-display font-bold text-title-lg text-text">Admin sign in</h1>
          <p className="text-body text-text-secondary italic">Kuingia kwa wafanyakazi</p>
        </header>

        <Card className="border-2 border-gold/40">
          <CardBody className="p-5 lg:p-6 space-y-4">
            <div className="flex items-start gap-2.5 pb-3 border-b border-border-subtle">
              <ShieldCheck size={18} className="text-gold shrink-0 mt-0.5" />
              <div className="text-caption text-text-secondary">
                <p className="font-bold text-text">For ADMIN, COMPLIANCE, MODERATOR roles only</p>
                <p>Step 1: phone OTP. Step 2: 6-digit authenticator code (RFC 6238). Both events audited.</p>
              </div>
            </div>

            <form action={startLoginAction} className="space-y-3">
              <input type="hidden" name="returnTo" value="/admin" />
              <div>
                <label htmlFor="phone" className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1.5">
                  Phone · Simu
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 h-12 rounded-l-md bg-bg-sunken border border-r-0 border-border text-text-secondary font-mono text-body-sm font-bold">+255</span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{9}"
                    placeholder="712 345 678"
                    autoComplete="tel"
                    className="flex-1 h-12 px-3 rounded-r-md bg-surface border border-border text-text font-mono text-body focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-[var(--border-focus)]/40 transition-colors"
                  />
                </div>
              </div>
              <Button type="submit" variant="primary" size="xl" fullWidth leading={<Lock size={16} />}>
                Send OTP · Tuma msimbo
              </Button>
            </form>

            <div className="flex items-center gap-2 text-caption text-text-tertiary pt-2 border-t border-border-subtle">
              <Smartphone size={12} aria-hidden />
              <span>You will be prompted for your authenticator code after OTP.</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <Link href="/auth/login" className="flex items-center justify-between gap-2 group">
              <div className="text-caption">
                <p className="text-text font-bold">I&apos;m a player, not staff</p>
                <p className="text-text-tertiary">Sign in to your player account instead</p>
              </div>
              <ChevronRight size={16} className="text-text-tertiary group-hover:text-text transition-colors" />
            </Link>
          </CardBody>
        </Card>

        <p className="text-caption text-text-tertiary text-center pt-2">
          Lost device or codes? Contact <span className="font-mono">support@kipindi.co.tz</span> with your AML lead in copy.
          Recovery requires documented identity verification.
        </p>
      </div>
    </div>
  );
}
