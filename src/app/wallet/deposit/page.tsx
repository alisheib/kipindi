import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { CashbackPromo } from "@/components/ui/cashback-promo";
import { FiftyMark } from "@/components/brand";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getBonusConfig } from "@/lib/server/bonus-config";
import { getServerT } from "@/lib/i18n-server";
import { depositAction } from "./actions";
import { DepositAmount } from "./deposit-amount";

export const metadata = { title: "Deposit" };

const ADMIN_TEST_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

const PROVIDERS = [
  { id: "MPESA",        name: "M-Pesa",        hue: 152 },
  { id: "AIRTEL_MONEY", name: "Airtel Money",  hue: 22 },
  { id: "HALO_PESA",    name: "HaloPesa",      hue: 80 },
  { id: "MIXX",         name: "Mixx by Yas",   hue: 280 },
  { id: "CARD",         name: "Card",          hue: 200 },
] as const;

const QUICK_AMOUNTS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000];

export default async function DepositPage({ searchParams }: { searchParams: Promise<{ error?: string; provider?: string; amount?: string; msisdn?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/wallet/deposit");
  const { t } = await getServerT();

  const sp = await searchParams;
  const errorMsg = sp.error ? decodeURIComponent(sp.error) : null;
  const prevProvider = sp.provider ?? "";
  const prevAmount = sp.amount ?? "";
  const prevMsisdn = sp.msisdn ?? "";

  const user = await db.user.findById(session.userId);
  const adminTest = !!user && ADMIN_TEST_ROLES.has(user.role) && process.env.NODE_ENV !== "production" && process.env.ADMIN_TEST_DEPOSITS !== "false";
  const maxAmount = adminTest ? 1_000_000_000 : 2_000_000;
  const quickAmounts = adminTest ? [100_000, 1_000_000, 5_000_000, 20_000_000, 100_000_000] : QUICK_AMOUNTS;
  const bonusCfg = getBonusConfig();
  const showCashback = bonusCfg.enabled && bonusCfg.cashbackEnabled && bonusCfg.cashbackPercentage > 0;

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <Link
        href="/wallet"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
      >
        <I.chevronLeft s={14} />
        {t.wallet.title}
      </Link>

      <header className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated">
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
          <div className="flex items-center gap-2 mb-1">
            <I.arrowDownToLine s={14} className="text-gold-300" />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
              {t.common.addFunds}
            </p>
          </div>
          <h1 className="font-display text-[26px] font-bold text-text leading-tight tracking-[-0.02em]">
            {t.common.deposit}
          </h1>
          <p className="mt-1 text-[14px] italic text-text-subtle">{t.wallet.mobileMoney}</p>
        </div>
      </header>

      {errorMsg && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-no-700/60 bg-no-500/[0.10] px-4 py-3">
          <I.alertCircle s={16} />
          <div className="text-[12.5px] leading-snug">
            <p className="font-display font-semibold text-text">{t.wallet.depositFailed}</p>
            <p className="mt-0.5 text-text-muted">{errorMsg}</p>
          </div>
        </div>
      )}

      {showCashback && <CashbackPromo percent={bonusCfg.cashbackPercentage} compact cta={false} />}

      <form action={depositAction} className="rounded-xl glass-panel p-5 lg:p-6 space-y-5">
        <fieldset>
          <legend className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
            {t.wallet.mobileMoney}
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVIDERS.map((p, i) => (
              <label
                key={p.id}
                className="relative flex flex-col items-center gap-2 px-2 py-3.5 rounded-md border border-border cursor-pointer transition-colors hover:border-gold-700 has-[:checked]:border-gold-500 has-[:checked]:bg-gold-500/10"
                style={{ background: "var(--bg-inset)" }}
              >
                <input type="radio" name="provider" value={p.id} required defaultChecked={prevProvider ? p.id === prevProvider : i === 0} className="sr-only peer" />
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

        <DepositAmount max={maxAmount} quickAmounts={quickAmounts} adminTest={adminTest} defaultValue={prevAmount} />

        <div>
          <label
            htmlFor="msisdn"
            className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2"
          >
            {t.auth.phone} {t.common.optional}
          </label>
          <Input
            id="msisdn"
            name="msisdn"
            type="tel"
            inputMode="numeric"
            pattern="\d{9}"
            maxLength={9}
            placeholder="712 345 678"
            prefix="+255"
            mono
            defaultValue={prevMsisdn}
          />
        </div>

        <SubmitButton label={t.common.confirm} pendingLabel={t.common.loading} />
      </form>

      <p className="px-1 text-center text-[11.5px] text-text-subtle leading-relaxed">
        {t.wallet.securedBody}
      </p>
    </main>
  );
}
