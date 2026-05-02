import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { startLoginAction } from "./actions";
import { isDemoModeAllowed } from "@/lib/server/demo-mode";
import { FlaskConical } from "lucide-react";

export const metadata = { title: "Sign in · Ingia" };

export default function LoginPage() {
  const demoOn = isDemoModeAllowed();
  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-center px-3 py-8">
      <Pattern kind="sokoni" opacity={0.04} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="text-royal hover:text-royal-hover transition-colors duration-micro inline-block mb-5">
          <Logo variant="primary" className="h-7" />
        </Link>
        <Card className="border-2 border-border-strong">
          <CardBody className="p-5 lg:p-6 space-y-4">
            <div>
              <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold">Sign in · Ingia</p>
              <h1 className="font-display font-bold text-title-md text-text mt-1.5">Continue with your phone</h1>
              <p className="text-body-sm text-text-secondary mt-1">We&apos;ll send a 6-digit code · Tutatuma msimbo wa tarakimu 6.</p>
            </div>
            <form action={startLoginAction} className="space-y-3">
              <div>
                <label htmlFor="phone" className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1.5">Phone · Simu</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 h-11 rounded-l-md bg-bg-sunken border border-r-0 border-border text-text-secondary font-mono text-body-sm">+255</span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="712 345 678"
                    className="flex-1 h-11 px-3 rounded-r-md bg-surface border border-border text-text font-mono text-body-sm focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-[var(--border-focus)]/40 transition-colors"
                  />
                </div>
                <p className="text-micro text-text-tertiary mt-1.5">Use your registered Tanzania mobile number.</p>
              </div>
              <Button type="submit" variant="primary" size="xl" fullWidth>Send code · Tuma msimbo</Button>
            </form>
            <p className="text-body-sm text-text-secondary text-center pt-2 border-t border-border-divider">
              No account? <Link href="/auth/register" className="text-royal hover:text-royal-hover font-bold underline-offset-2 hover:underline">Create one · Fungua akaunti</Link>
            </p>
          </CardBody>
        </Card>
        {demoOn && (
          <Card className="mt-3 border-2 border-gold-subtleHover/40 bg-gold-subtle/15">
            <CardBody className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FlaskConical size={14} strokeWidth={2.25} className="text-gold" />
                <p className="font-mono text-micro uppercase tracking-[0.16em] text-gold font-bold">Reviewer access · dev only</p>
              </div>
              <p className="text-body-sm text-text-secondary leading-snug">
                Skip OTP and explore the full platform with a sandbox account funded with TZS 100,000.
                All bets are virtual; no real money moves.
              </p>
              <form action="/auth/demo" method="post">
                <Button type="submit" variant="gold" size="lg" fullWidth>Enter demo · Ingia mfano</Button>
              </form>
              <p className="text-micro text-text-tertiary">Disabled in production by setting <span className="font-mono">DEMO_MODE_ENABLED=false</span>.</p>
            </CardBody>
          </Card>
        )}
        <p className="text-micro text-text-tertiary text-center mt-4">
          Licensed by Gaming Board of Tanzania · 18+ · Helpline 0800 11 0011
        </p>
      </div>
    </div>
  );
}
