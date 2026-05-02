import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { startRegisterAction } from "./actions";

export const metadata = { title: "Create account · Fungua akaunti" };

export default function RegisterPage() {
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
              <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold">Create account</p>
              <h1 className="font-display font-bold text-title-md text-text mt-1.5">Fungua akaunti yako</h1>
              <p className="text-body-sm text-text-secondary mt-1">Tanzania mobile number, age 18+ · Simu ya Tanzania, miaka 18+.</p>
            </div>
            <form action={startRegisterAction} className="space-y-3">
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
              </div>
              <div>
                <label htmlFor="dob" className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1.5">Date of birth · Tarehe ya kuzaliwa</label>
                <input
                  id="dob"
                  name="dob"
                  type="date"
                  required
                  className="w-full h-11 px-3 rounded-md bg-surface border border-border text-text font-mono text-body-sm focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-[var(--border-focus)]/40 transition-colors"
                />
                <p className="text-micro text-text-tertiary mt-1.5">Must be 18 or older · Lazima uwe na miaka 18+.</p>
              </div>
              <fieldset className="space-y-2 pt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" name="acceptAge" required className="mt-0.5 h-4 w-4 accent-[var(--gold)]" />
                  <span className="text-body-sm text-text-secondary">I confirm I am 18 or older. · Ninathibitisha nina miaka 18+.</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-4 w-4 accent-[var(--gold)]" />
                  <span className="text-body-sm text-text-secondary">
                    I accept the <Link href="/legal/terms" className="text-royal underline-offset-2 hover:underline">Terms</Link> and <Link href="/legal/privacy" className="text-royal underline-offset-2 hover:underline">Privacy Policy</Link>. · Ninakubali Sheria na Faragha.
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" name="marketingOptIn" className="mt-0.5 h-4 w-4 accent-[var(--gold)]" />
                  <span className="text-body-sm text-text-secondary">Send me promotions and tips (optional). · Nipe matangazo (hiari).</span>
                </label>
              </fieldset>
              <Button type="submit" variant="primary" size="xl" fullWidth>Send verification code · Tuma msimbo</Button>
            </form>
            <p className="text-body-sm text-text-secondary text-center pt-2 border-t border-border-divider">
              Already have an account? <Link href="/auth/login" className="text-royal hover:text-royal-hover font-bold underline-offset-2 hover:underline">Sign in · Ingia</Link>
            </p>
          </CardBody>
        </Card>
        <p className="text-micro text-text-tertiary text-center mt-4">
          By creating an account you accept TZ Gaming Act compliance · 18+ only · Helpline 0800 11 0011
        </p>
      </div>
    </div>
  );
}
