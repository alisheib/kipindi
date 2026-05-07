import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpFromLine, ChevronLeft, ShieldCheck, AlertCircle } from "lucide-react";
import { FiftyMark } from "@/components/brand";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { withdrawAction } from "./actions";

export const metadata = { title: "Withdraw · Toa" };

const PROVIDERS = [
  { id: "MPESA",        name: "M-Pesa",        hue: 152 },
  { id: "TIGO_PESA",    name: "Tigo Pesa",     hue: 240 },
  { id: "AIRTEL_MONEY", name: "Airtel Money",  hue: 22 },
  { id: "HALO_PESA",    name: "HaloPesa",      hue: 80 },
  { id: "MIXX",         name: "Mixx by Yas",   hue: 280 },
  { id: "BANK_TRANSFER",name: "Bank transfer", hue: 200 },
] as const;

export default async function WithdrawPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const wallet = db.wallet.findByUserId(session.userId);
  const kyc = db.kyc.findByUserId(session.userId);
  const kycApproved = kyc?.status === "APPROVED";

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <Link
        href="/wallet"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
      >
        <ChevronLeft size={14} aria-hidden />
        Wallet
      </Link>

      <header className="relative overflow-hidden rounded-2xl border border-border bg-bg-elevated">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(800px 320px at 0% 100%, oklch(45% 0.13 22 / 0.18), transparent 60%), " +
              "linear-gradient(135deg, oklch(20% 0.012 240) 0%, oklch(16% 0.014 240) 100%)",
          }}
        />
        <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
          <FiftyMark size={180} />
        </div>
        <div className="relative z-10 p-5 lg:p-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
              Withdraw · Toa
            </p>
            <h1 className="mt-1 font-display text-[24px] lg:text-[26px] font-bold text-text leading-tight tracking-[-0.02em]">
              Move funds out
            </h1>
            <p className="mt-1 text-[13px] italic text-text-subtle">Mobile money or bank · M-pesa au benki</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Available</p>
            <p className="font-display font-bold text-[22px] tabular-nums text-text leading-none">
              TZS {(wallet?.balance ?? 0).toLocaleString()}
            </p>
            {(wallet?.hold ?? 0) > 0 && (
              <p className="mt-1 font-mono text-[10.5px] tabular-nums text-warning-fg">
                hold {(wallet?.hold ?? 0).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </header>

      {!kycApproved && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-bg/30 p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-warning-fg" />
          <div className="min-w-0">
            <p className="font-display font-semibold text-text">Verify your identity first</p>
            <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
              Tanzania Gaming Act requires NIDA verification before any withdrawal.
              <span className="block italic text-text-subtle text-[11.5px] mt-0.5">
                Sheria ya Bodi ya Michezo ya Kubahatisha inahitaji NIDA.
              </span>
            </p>
            <Link
              href="/profile/kyc"
              className="mt-3 inline-flex h-9 items-center px-4 rounded-pill bg-gold-500 hover:bg-gold-400 text-gold-fg font-display font-bold text-[12.5px] transition-colors"
            >
              Continue KYC →
            </Link>
          </div>
        </div>
      )}

      <form
        action={withdrawAction}
        className={`rounded-2xl border border-border bg-bg-elevated p-5 lg:p-6 space-y-5 ${kycApproved ? "" : "opacity-60"}`}
      >
        <fieldset disabled={!kycApproved}>
          <legend className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
            Destination · Mahali
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVIDERS.map((p, i) => (
              <label
                key={p.id}
                className="relative flex flex-col items-center gap-2 px-2 py-3.5 rounded-md border border-border bg-bg-overlay hover:border-gold-700 cursor-pointer transition-colors has-[:checked]:border-gold-500 has-[:checked]:bg-gold-500/10"
              >
                <input type="radio" name="provider" value={p.id} required defaultChecked={i === 0} className="sr-only peer" />
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md font-display font-bold text-[12px] text-text"
                  style={{ background: `linear-gradient(135deg, oklch(45% 0.10 ${p.hue}), oklch(30% 0.08 ${p.hue}))` }}
                >
                  {p.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                </span>
                <span className="font-display text-[12px] font-semibold text-text text-center leading-tight">{p.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="amount"
            className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2"
          >
            Amount · Kiasi
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 h-12 rounded-l-md border border-r-0 border-border bg-bg-overlay font-mono text-[13px] font-bold text-text-subtle">
              TZS
            </span>
            <input
              id="amount"
              name="amount"
              type="number"
              required
              min={1_000}
              max={5_000_000}
              step={500}
              inputMode="numeric"
              placeholder="10,000"
              disabled={!kycApproved}
              className="flex-1 h-12 px-3 rounded-r-md border border-border bg-bg-overlay font-display font-bold text-[20px] tabular-nums text-text focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 transition-colors disabled:opacity-50"
            />
          </div>
          <p className="mt-2 text-[11px] text-text-subtle">
            Withdrawals ≥ <span className="font-mono text-text-muted">TZS 1,000,000</span> trigger AML review (typically 2 hours).
          </p>
        </div>

        <div>
          <label
            htmlFor="msisdn"
            className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2"
          >
            Destination phone · Simu
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 h-11 rounded-l-md border border-r-0 border-border bg-bg-overlay font-mono text-[13px] text-text-subtle">
              +255
            </span>
            <input
              id="msisdn"
              name="msisdn"
              type="tel"
              inputMode="numeric"
              placeholder="712 345 678"
              disabled={!kycApproved}
              className="flex-1 h-11 px-3 rounded-r-md border border-border bg-bg-overlay font-mono text-[13px] tabular-nums text-text focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="otpCode"
            className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2"
          >
            Confirmation code · Msimbo
          </label>
          <input
            id="otpCode"
            name="otpCode"
            type="text"
            required
            pattern="\d{6}"
            maxLength={6}
            inputMode="numeric"
            placeholder="6-digit code from SMS"
            defaultValue="000000"
            disabled={!kycApproved}
            className="w-full h-11 px-3 rounded-md border border-border bg-bg-overlay font-mono text-[14px] tracking-[0.4em] tabular-nums text-text focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 transition-colors disabled:opacity-50"
          />
          <p className="mt-2 text-[11px] text-text-subtle">For dev: any 6-digit code is accepted.</p>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-warning-border bg-warning-bg/30 px-3 py-2.5 text-[12.5px] leading-snug">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning-fg" />
          <div>
            <p className="font-display font-semibold text-text">Tax notice · Notisi ya kodi</p>
            <p className="mt-0.5 text-text-muted">
              Tanzania withholds tax on declared winnings at withdrawal per the Income Tax Act (Cap 332).
              The receipt screen shows the net amount.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={!kycApproved}
          className={kycApproved ? "btn btn-gold btn-lg w-full" : "btn btn-ghost btn-lg w-full"}
          style={{ borderRadius: 999 }}
        >
          <ArrowUpFromLine size={16} />
          Confirm withdrawal · Thibitisha
        </button>
      </form>
    </main>
  );
}
