import Link from "next/link";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { startLoginAction } from "./actions";
import { isDemoModeAllowed } from "@/lib/server/demo-mode";
import { FlaskConical } from "lucide-react";

export const metadata = { title: "Sign in · Ingia" };

export default function LoginPage() {
  const demoOn = isDemoModeAllowed();
  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-center px-3 py-8 overflow-hidden">
      <BrandTopo opacity={0.05} />
      <div className="relative w-full max-w-md">
        <Link href="/" aria-label="50pick home" className="inline-block mb-6">
          <FiftyLockup size={22} />
        </Link>

        <div className="rounded-xl border border-border bg-bg-elevated p-6 space-y-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-yes-300">Sign in · Ingia</p>
            <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight text-text">Continue with your phone</h1>
            <p className="mt-1.5 text-[14px] text-text-muted">We&apos;ll send a 6-digit code. <span className="italic text-text-subtle">Tutatuma msimbo wa tarakimu 6.</span></p>
          </div>

          <form action={startLoginAction} className="space-y-3">
            <Field label="Phone · Simu" hint="Use your registered Tanzania mobile number.">
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                placeholder="712 345 678"
                size="lg"
                mono
                prefix="+255"
              />
            </Field>
            <Button type="submit" variant="yes" size="lg" fullWidth>
              Send code · Tuma msimbo
            </Button>
          </form>

          <p className="text-[13px] text-text-muted pt-3 border-t border-border text-center">
            No account?{" "}
            <Link href={"/auth/register" as never} className="text-yes-300 hover:text-yes-200 font-semibold underline-offset-2 hover:underline">
              Create one · Fungua akaunti
            </Link>
          </p>
        </div>

        {demoOn && (
          <div className="mt-3 rounded-xl border border-gold-700 bg-gradient-to-br from-gold-950/60 via-gold-900/30 to-bg-elevated p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FlaskConical size={14} className="text-gold-300" />
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">Reviewer access · dev only</p>
            </div>
            <p className="text-[13px] text-text-muted leading-snug">
              Skip OTP and explore with a sandbox account, TZS 100,000 fake balance. All bets are virtual.
            </p>
            <form action="/auth/demo" method="post">
              <button
                type="submit"
                className="w-full h-11 rounded-md bg-gradient-to-b from-gold-400 to-gold-600 font-display font-bold text-gold-fg border border-gold-700 hover:from-gold-300 hover:to-gold-500 transition-all"
              >
                Enter demo · Ingia mfano
              </button>
            </form>
            <p className="text-[10px] text-text-subtle">Disabled in production by setting <span className="font-mono">DEMO_MODE_ENABLED=false</span>.</p>
          </div>
        )}

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.16em] text-text-subtle">
          18+ · Licensed by GBT · Helpline 0800 11 0011
        </p>
      </div>
    </div>
  );
}
