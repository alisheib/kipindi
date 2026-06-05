import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { FiftyMark } from "@/components/brand";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { depositAction } from "./actions";
import { DepositAmount } from "./deposit-amount";

export const metadata = { title: "Deposit · Amana" };

const ADMIN_TEST_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

const PROVIDERS = [
  { id: "MPESA",        name: "M-Pesa",        hue: 152 },
  { id: "AIRTEL_MONEY", name: "Airtel Money",  hue: 22 },
  { id: "HALO_PESA",    name: "HaloPesa",      hue: 80 },
  { id: "MIXX",         name: "Mixx by Yas",   hue: 280 },
  { id: "CARD",         name: "Card",          hue: 200 },
] as const;

const QUICK_AMOUNTS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000];

export default async function DepositPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const sp = await searchParams;
  const errorMsg = sp.error ? decodeURIComponent(sp.error) : null;

  // TEMPORARY admin test-funding: ADMIN-role accounts can deposit uncapped
  // play-money to test deposits/referrals/proposals. Disable via
  // ADMIN_TEST_DEPOSITS=false. Mirrors the wallet-service bypass.
  const user = db.user.findById(session.userId);
  const adminTest = !!user && ADMIN_TEST_ROLES.has(user.role) && process.env.ADMIN_TEST_DEPOSITS !== "false";
  const maxAmount = adminTest ? 1_000_000_000 : 2_000_000;
  const quickAmounts = adminTest ? [100_000, 1_000_000, 5_000_000, 20_000_000, 100_000_000] : QUICK_AMOUNTS;

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <Link
        href="/wallet"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
      >
        <ChevronLeft size={14} aria-hidden />
        Wallet
      </Link>

      <header className="relative overflow-hidden rounded-2xl border border-border-strong bg-bg-elevated">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(800px 320px at 100% 0%, oklch(58% 0.13 80 / 0.20), transparent 60%), " +
              "linear-gradient(135deg, oklch(22% 0.140 268) 0%, oklch(30% 0.165 268) 100%)",
          }}
        />
        <div className="absolute -right-6 -top-6 opacity-[0.06]" aria-hidden>
          <FiftyMark size={180} />
        </div>
        <div className="relative z-10 p-5 lg:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
            Deposit · Amana
          </p>
          <h1 className="mt-1 font-display text-[26px] font-bold text-text leading-tight tracking-[-0.02em]">
            Add funds to your wallet
          </h1>
          <p className="mt-1 text-[14px] italic text-text-subtle">Choose a payment method · Chagua njia ya malipo.</p>
        </div>
      </header>

      {errorMsg && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-no-700/60 bg-no-500/[0.10] px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-no-300" />
          <div className="text-[12.5px] leading-snug">
            <p className="font-display font-semibold text-text">Deposit didn&rsquo;t go through</p>
            <p className="mt-0.5 text-text-muted">{errorMsg}</p>
          </div>
        </div>
      )}

      <form action={depositAction} className="rounded-2xl glass-panel p-5 lg:p-6 space-y-5">
        {/* Provider grid */}
        <fieldset>
          <legend className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
            Method · Njia
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

        {/* Amount — kit-styled control (no browser number spinner); chips override. */}
        <DepositAmount max={maxAmount} quickAmounts={quickAmounts} adminTest={adminTest} />

        {/* Source phone */}
        <div>
          <label
            htmlFor="msisdn"
            className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2"
          >
            Source phone · Simu (optional)
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
              placeholder="712 345 678"
              className="flex-1 h-11 px-3 rounded-r-md border border-border bg-bg-overlay font-mono text-[13px] tabular-nums text-text focus:outline-none focus:border-aqua-300 focus:shadow-[0_0_0_3px_var(--aqua-glow)] transition-colors"
            />
          </div>
          <p className="mt-2 text-[11px] text-text-subtle">Leave blank to use your account number on file.</p>
        </div>

        {/* Submit */}
        <SubmitButton label="Confirm deposit · Thibitisha" pendingLabel="Processing deposit…" />
      </form>

      <p className="px-1 text-center text-[11.5px] text-text-subtle leading-relaxed">
        Funds typically arrive within 60 seconds. Provider may charge a separate fee.
        <span className="block mt-1 text-[10.5px] text-text-subtle/80">
          Test failure: amount ending in <span className="font-mono text-warning-fg">…13</span> is declined for QA.
        </span>
      </p>
    </main>
  );
}
