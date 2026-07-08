import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { FieldLegend } from "@/components/ui/field-legend";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { CashbackPromo } from "@/components/ui/cashback-promo";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { getBonusConfig } from "@/lib/server/bonus-config";
import { getServerT } from "@/lib/i18n-server";
import { depositAction } from "./actions";
import { DepositAmount } from "./deposit-amount";
import { ProviderRadioGrid } from "@/components/wallet/provider-radio-grid";

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

  let user: Awaited<ReturnType<typeof db.user.findById>> | null = null;
  try { user = await db.user.findById(session.userId); } catch { /* graceful — default limits */ }
  const adminTest = !!user && ADMIN_TEST_ROLES.has(user.role) && process.env.NODE_ENV !== "production" && process.env.ADMIN_TEST_DEPOSITS !== "false";
  const maxAmount = adminTest ? 1_000_000_000 : 2_000_000;
  const quickAmounts = adminTest ? [100_000, 1_000_000, 5_000_000, 20_000_000, 100_000_000] : QUICK_AMOUNTS;
  const bonusCfg = getBonusConfig();
  const showCashback = bonusCfg.enabled && bonusCfg.cashbackEnabled && bonusCfg.cashbackPercentage > 0;

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <BackLink fallbackHref="/wallet" label={t.wallet.title} />

      <PageHero glow="gold">
        <PageHeader
          tone="gold"
          icon={<I.arrowDownToLine s={14} className="text-gold-300" />}
          eyebrow={t.common.addFunds}
          title={t.common.deposit}
          subtitle={t.wallet.mobileMoney}
        />
      </PageHero>

      {errorMsg && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-no-700/60 bg-no-500/[0.10] px-4 py-3">
          <I.alertCircle s={16} />
          <div className="text-[12.5px] leading-snug">
            <p className="font-display font-semibold text-text">{t.wallet.depositFailed}</p>
            <p className="mt-0.5 text-text-muted">{errorMsg}</p>
          </div>
        </div>
      )}

      {showCashback && <CashbackPromo percent={bonusCfg.cashbackPercentage} mode={bonusCfg.cashbackMode} compact cta={false} />}

      <form action={depositAction} className="rounded-xl glass-panel p-5 lg:p-6 space-y-5">
        <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
        <fieldset>
          <FieldLegend as="legend" className="mb-2">
            {t.wallet.mobileMoney}
          </FieldLegend>
          <ProviderRadioGrid providers={PROVIDERS} defaultProvider={prevProvider} unavailableLabel={t.common.temporarilyUnavailable} />
        </fieldset>

        <DepositAmount max={maxAmount} quickAmounts={quickAmounts} adminTest={adminTest} defaultValue={prevAmount} />

        <div>
          <FieldLegend as="label" htmlFor="msisdn" className="block mb-2">
            {t.auth.phone} {t.common.optional}
          </FieldLegend>
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

      {/* Trust strip — the regulator seal is a licensed asset (⊘ pending, Ali);
          this slot is a deliberately-labeled placeholder, never a fabricated mark. */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated/60 px-4 py-3">
        <span
          aria-hidden
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-dashed border-border text-text-subtle"
          style={{ borderRadius: "var(--r-md)" }}
        >
          <I.shieldcheck s={18} />
        </span>
        <p className="text-[11.5px] text-text-subtle leading-relaxed">
          {t.wallet.securedBody}
        </p>
      </div>
    </main>
  );
}
