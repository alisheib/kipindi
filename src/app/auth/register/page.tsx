import Link from "next/link";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { Field, Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { startRegisterAction } from "./actions";

export const metadata = { title: "Create account · Fungua akaunti" };

export default function RegisterPage() {
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
              Create account · Fungua akaunti
            </p>
            <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight text-text tracking-[-0.02em]">
              Welcome to 50pick
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              Tanzania mobile number, age 18+.{" "}
              <span className="italic text-text-subtle">Simu ya Tanzania, miaka 18+.</span>
            </p>
          </div>

          <form action={startRegisterAction} className="space-y-4">
            <Field label="Phone · Simu" hint="Pick your country, then the mobile number.">
              <PhoneInput name="phone" required size="lg" />
            </Field>

            <Field label="Date of birth · Tarehe ya kuzaliwa" hint="Must be 18 or older. Lazima uwe na miaka 18+.">
              <Input id="dob" name="dob" type="date" required mono size="lg" />
            </Field>

            <fieldset className="space-y-2 pt-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" name="acceptAge" required className="mt-0.5 h-4 w-4 accent-gold-500" />
                <span className="text-[13px] text-text-muted">
                  I confirm I am 18 or older.{" "}
                  <span className="italic text-text-subtle">Ninathibitisha nina miaka 18+.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-4 w-4 accent-gold-500" />
                <span className="text-[13px] text-text-muted">
                  I accept the{" "}
                  <Link href="/legal/terms" className="text-aqua-200 underline-offset-2 hover:underline">Terms</Link>
                  {" "}and{" "}
                  <Link href="/legal/privacy" className="text-aqua-200 underline-offset-2 hover:underline">Privacy</Link>.
                  <span className="italic text-text-subtle ml-1">Ninakubali Sheria na Faragha.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" name="marketingOptIn" className="mt-0.5 h-4 w-4 accent-gold-500" />
                <span className="text-[13px] text-text-muted">
                  Send me product updates (optional).{" "}
                  <span className="italic text-text-subtle">Nipe matangazo (hiari).</span>
                </span>
              </label>
            </fieldset>

            <button type="submit" className="btn btn-gold btn-lg w-full">
              Send verification code · Tuma msimbo
            </button>
          </form>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            Already have an account?{" "}
            <Link
              href={"/auth/login" as never}
              className="font-semibold text-aqua-200 hover:text-aqua-100 underline-offset-2 hover:underline"
            >
              Sign in · Ingia
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
