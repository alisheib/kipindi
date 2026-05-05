import Link from "next/link";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { startRegisterAction } from "./actions";

export const metadata = { title: "Create account · Fungua akaunti" };

export default function RegisterPage() {
  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-center px-3 py-8 overflow-hidden">
      <BrandTopo opacity={0.05} />
      <div className="relative w-full max-w-md">
        <Link href="/" aria-label="50pick home" className="inline-block mb-6">
          <FiftyLockup size={22} />
        </Link>

        <div className="rounded-xl border border-border bg-bg-elevated p-6 space-y-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-yes-300">Create account · Fungua akaunti</p>
            <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight text-text">Welcome to 50pick</h1>
            <p className="mt-1.5 text-[14px] text-text-muted">Tanzania mobile number, age 18+. <span className="italic text-text-subtle">Simu ya Tanzania, miaka 18+.</span></p>
          </div>

          <form action={startRegisterAction} className="space-y-3">
            <label className="block">
              <span className="block font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5">Phone · Simu</span>
              <span className="flex h-12 rounded-md border border-border bg-bg-overlay focus-within:border-teal-300 transition-colors overflow-hidden">
                <span className="inline-flex items-center px-3 bg-bg-elevated border-r border-border font-mono text-[13px] text-text-muted">+255</span>
                <input id="phone" name="phone" type="tel" required inputMode="numeric" autoComplete="tel" placeholder="712 345 678"
                  className="flex-1 px-3 bg-transparent font-mono text-[15px] text-text outline-none" />
              </span>
            </label>

            <label className="block">
              <span className="block font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5">Date of birth · Tarehe ya kuzaliwa</span>
              <input id="dob" name="dob" type="date" required
                className="w-full h-12 px-3 rounded-md border border-border bg-bg-overlay font-mono text-[14px] text-text outline-none focus:border-teal-300 transition-colors" />
              <p className="mt-1.5 text-[11px] text-text-subtle">Must be 18 or older. <span className="italic">Lazima uwe na miaka 18+.</span></p>
            </label>

            <fieldset className="space-y-2 pt-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" name="acceptAge" required className="mt-0.5 h-4 w-4 accent-yes-500" />
                <span className="text-[13px] text-text-muted">I confirm I am 18 or older. <span className="italic text-text-subtle">Ninathibitisha nina miaka 18+.</span></span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-4 w-4 accent-yes-500" />
                <span className="text-[13px] text-text-muted">
                  I accept the <Link href="/legal/terms" className="text-yes-300 underline-offset-2 hover:underline">Terms</Link> and <Link href="/legal/privacy" className="text-yes-300 underline-offset-2 hover:underline">Privacy</Link>. <span className="italic text-text-subtle">Ninakubali Sheria na Faragha.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" name="marketingOptIn" className="mt-0.5 h-4 w-4 accent-yes-500" />
                <span className="text-[13px] text-text-muted">Send me product updates (optional). <span className="italic text-text-subtle">Nipe matangazo (hiari).</span></span>
              </label>
            </fieldset>

            <button type="submit" className="w-full h-12 rounded-md bg-yes-500 font-display font-bold text-yes-950 hover:bg-yes-400 transition-colors">
              Send verification code · Tuma msimbo
            </button>
          </form>

          <p className="text-[13px] text-text-muted pt-3 border-t border-border text-center">
            Already have an account?{" "}
            <Link href={"/auth/login" as never} className="text-yes-300 hover:text-yes-200 font-semibold underline-offset-2 hover:underline">
              Sign in · Ingia
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.16em] text-text-subtle">
          18+ · Licensed by GBT · Helpline 0800 11 0011
        </p>
      </div>
    </div>
  );
}
