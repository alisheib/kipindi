import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ShieldCheck, AlertCircle } from "lucide-react";
import { I } from "@/components/ui/glyphs";
import { SubmitButton } from "@/components/ui/submit-button";
import { FiftyMark } from "@/components/brand";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { withdrawAction } from "./actions";

export const metadata = { title: "Withdraw · Toa" };

const PROVIDERS = [
  { id: "MPESA",        name: "M-Pesa",        hue: 152 },
  { id: "AIRTEL_MONEY", name: "Airtel Money",  hue: 22 },
  { id: "HALO_PESA",    name: "HaloPesa",      hue: 80 },
  { id: "MIXX",         name: "Mixx by Yas",   hue: 280 },
  { id: "BANK_TRANSFER",name: "Bank transfer", hue: 200 },
] as const;

export default async function WithdrawPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const sp = await searchParams;
  const errorMsg = sp.error ? decodeURIComponent(sp.error) : null;

  const wallet = db.wallet.findByUserId(session.userId);
  const kyc = db.kyc.findByUserId(session.userId);
  const kycApproved = kyc?.status === "APPROVED";

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <Link
        href="/wallet"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
      >
        <I.chevronLeft s={14} />
        Wallet
      </Link>

      <header className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(800px 320px at 0% 100%, oklch(45% 0.13 22 / 0.18), transparent 60%), " +
              "linear-gradient(135deg, oklch(22% 0.140 268) 0%, oklch(30% 0.165 268) 100%)",
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

      {errorMsg && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-no-700/60 bg-no-500/[0.10] px-4 py-3">
          <I.alertCircle s={16} />
          <div className="text-[12.5px] leading-snug">
            <p className="font-display font-semibold text-text">Withdrawal didn&rsquo;t go through</p>
            <p className="mt-0.5 text-text-muted">{errorMsg}</p>
          </div>
        </div>
      )}

      {!kycApproved && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-bg/30 p-4">
          <I.shieldcheck s={18} />
          <div className="min-w-0">
            <p className="font-display font-semibold text-text">Verify your identity first</p>
            <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
              Tanzania Gaming Act requires NIDA verification before any withdrawal.
              <span className="block italic text-text-subtle text-[11.5px] mt-0.5">
                Sheria ya Bodi ya Michezo ya Kubahatisha inahitaji NIDA.
              </span>
            </p>
            <Link href="/profile/kyc" className="btn btn-gold btn-sm mt-3">
              Continue KYC →
            </Link>
          </div>
        </div>
      )}

      <form
        action={withdrawAction}
        className={`rounded-xl glass-panel p-5 lg:p-6 space-y-5 ${kycApproved ? "" : "opacity-60"}`}
      >
        <fieldset disabled={!kycApproved}>
          <legend className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
            Destination · Mahali
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVIDERS.map((p, i) => (
              <label
                key={p.id}
                className="relative flex flex-col items-center gap-2 px-2 py-3.5 rounded-md border border-border cursor-pointer transition-colors hover:border-gold-700 has-[:checked]:border-gold-500 has-[:checked]:bg-gold-500/10"
                style={{ background: "var(--bg-inset)" }}
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
            <span className="inline-flex items-center px-3 h-11 rounded-l-md border border-r-0 border-border bg-bg-overlay font-mono text-[13px] font-bold text-text-subtle">
              TZS
            </span>
            <input
              id="amount"
              name="amount"
              type="text"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="10,000"
              disabled={!kycApproved}
              className="flex-1 h-11 px-3 rounded-r-md border border-border bg-bg-overlay font-display font-bold text-[20px] tabular-nums text-text focus:outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors disabled:opacity-50"
            />
          </div>
          <p className="mt-2 text-[11px] text-text-subtle">
            Min TZS 1,000 · Max TZS 5,000,000 per withdrawal.
            Amounts ≥ <span className="font-mono text-text-muted">TZS 1,000,000</span> trigger AML review (typically 2 hours).
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
              pattern="\d{9}"
              maxLength={9}
              required
              placeholder="712 345 678"
              disabled={!kycApproved}
              className="flex-1 h-11 px-3 rounded-r-md border border-border bg-bg-overlay font-mono text-[13px] tabular-nums text-text focus:outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-info-border bg-info-bg/30 px-3 py-2.5 text-[12.5px] leading-snug">
          <I.shieldcheck s={14} />
          <div>
            <p className="font-display font-semibold text-text">Secured by KYC &amp; AML · Imelindwa</p>
            <p className="mt-0.5 text-text-muted">
              Withdrawals are released only to a NIDA-verified account, and amounts of
              <span className="font-mono text-text-muted"> TZS 1,000,000</span>+ are held for AML review.
              SMS step-up confirmation is added once the licensed SMS provider is live.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-warning-border bg-warning-bg/30 px-3 py-2.5 text-[12.5px] leading-snug">
          <I.alertCircle s={14} />
          <div>
            <p className="font-display font-semibold text-text">Tax notice · Notisi ya kodi</p>
            <p className="mt-0.5 text-text-muted">
              Tanzania withholds tax on declared winnings at withdrawal per the Income Tax Act (Cap 332).
              The receipt screen shows the net amount.
            </p>
          </div>
        </div>

        <SubmitButton label="Confirm withdrawal · Thibitisha" pendingLabel="Processing withdrawal…" />
      </form>
    </main>
  );
}
