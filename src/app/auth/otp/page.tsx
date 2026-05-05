import Link from "next/link";
import { FiftyLockup } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { verifyLoginOtpAction } from "../login/actions";

export const metadata = { title: "Enter code · Weka msimbo" };

export default async function OtpPage({ searchParams }: { searchParams: Promise<{ purpose?: string; phone?: string }> }) {
  const sp = await searchParams;
  const purpose = (sp.purpose ?? "login") as "login" | "register" | "withdraw" | "reauth" | "self_exclusion";
  const phone = sp.phone ?? "";
  const masked = phone ? phone.slice(0, 4) + "*****" + phone.slice(-2) : "+255*****";

  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-center px-3 py-8 overflow-hidden">
      <BrandTopo opacity={0.05} />
      <div className="relative w-full max-w-md">
        <Link href="/" aria-label="50pick home" className="inline-block mb-6">
          <FiftyLockup size={22} />
        </Link>

        <div className="rounded-xl border border-border bg-bg-elevated p-6 space-y-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-yes-300">Verification · Uthibitisho</p>
            <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight text-text">Enter the 6-digit code</h1>
            <p className="mt-1.5 text-[14px] text-text-muted">
              Sent to <span className="font-mono text-text font-bold">{masked}</span>. <span className="italic text-text-subtle">Imetumwa.</span>
            </p>
          </div>

          <form action={verifyLoginOtpAction} className="space-y-3">
            <input type="hidden" name="phone" value={phone} />
            <input type="hidden" name="purpose" value={purpose} />
            <label className="block">
              <span className="block font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5">Code · Msimbo</span>
              <input
                id="code"
                name="code"
                type="text"
                required
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="• • • • • •"
                className="w-full h-16 px-3 text-center rounded-md border-2 border-border bg-bg-overlay font-mono text-[28px] tabular-nums tracking-[0.6em] text-text outline-none focus:border-yes-500 transition-colors"
              />
              <p className="mt-1.5 text-[11px] text-text-subtle">Code valid for 5 minutes. <span className="italic">Msimbo ni kwa dakika 5.</span></p>
            </label>
            <button
              type="submit"
              className="w-full h-12 rounded-md bg-gradient-to-b from-gold-400 to-gold-600 font-display font-bold text-gold-fg border border-gold-700 hover:from-gold-300 hover:to-gold-500 transition-all"
            >
              Verify · Thibitisha
            </button>
          </form>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <Link href={purpose === "register" ? "/auth/register" : "/auth/login"} className="text-[13px] font-semibold text-text-muted hover:text-text transition-colors">
              ← Change number
            </Link>
            <Link href={purpose === "register" ? "/auth/register" : "/auth/login"} className="text-[13px] font-semibold text-yes-300 hover:text-yes-200 transition-colors">
              Resend code
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.16em] text-text-subtle">
          5 wrong attempts triggers a cool-down · Majaribio 5 mabaya — lazima subiri
        </p>
      </div>
    </div>
  );
}
