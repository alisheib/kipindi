import Link from "next/link";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { Input, Field } from "@/components/ui/input";
import { startLoginAction } from "./actions";

export const metadata = { title: "Sign in · Ingia" };

export default function LoginPage() {
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
              Sign in · Ingia
            </p>
            <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight text-text tracking-[-0.02em]">
              Continue with your phone
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              We&apos;ll send a 6-digit code.{" "}
              <span className="italic text-text-subtle">Tutatuma msimbo wa tarakimu 6.</span>
            </p>
          </div>

          <form action={startLoginAction} className="space-y-4">
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
            <button type="submit" className="btn btn-gold btn-lg w-full">
              Send code · Tuma msimbo
            </button>
          </form>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            No account?{" "}
            <Link
              href={"/auth/register" as never}
              className="font-semibold text-aqua-200 hover:text-aqua-100 underline-offset-2 hover:underline"
            >
              Create one · Fungua akaunti
            </Link>
          </p>
        </section>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-text-subtle">
          18+ · Licensed by GBT · Helpline 0800 11 0011
        </p>
      </div>
    </main>
  );
}
