import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { FieldLegend } from "@/components/ui/field-legend";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input, Field as KitField } from "@/components/ui/input";
import { Cash } from "@/components/ui/cash";
import { AmountField } from "@/components/wallet/amount-field";
import { formatTzs, fill, pctNum } from "@/lib/utils";
import { getEffectiveConfig } from "@/lib/server/market-config";
import { WithdrawConfirm } from "./withdraw-confirm";
import { WITHDRAW_MIN_TZS, WITHDRAW_MAX_TZS } from "@/lib/server/validators";

// Quick-amount chips for withdraw — AmountField hides any chip above the
// account's withdrawable max (min(cap, balance)), so small balances show fewer.
const WITHDRAW_QUICK = [5_000, 10_000, 25_000, 50_000, 100_000, 500_000];
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { withdrawAction } from "./actions";
import { getServerT } from "@/lib/i18n-server";
import { ProviderRadioGrid } from "@/components/wallet/provider-radio-grid";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.wallet.withdrawTitle };
}

const PROVIDERS = [
  { id: "MPESA",        name: "M-Pesa",        hue: 152 },
  { id: "AIRTEL_MONEY", name: "Airtel Money",  hue: 22 },
  { id: "HALO_PESA",    name: "HaloPesa",      hue: 80 },
  { id: "MIXX",         name: "Mixx by Yas",   hue: 280 },
  { id: "BANK_TRANSFER",name: "Bank transfer", hue: 200 },
] as const;

export default async function WithdrawPage({ searchParams }: { searchParams: Promise<{ error?: string; provider?: string; amount?: string; msisdn?: string }> }) {
  const { t } = await getServerT();
  // The withdrawal fee we quote here must be the one we actually charge. It also
  // replaces the old "Tax notice" panel, which told the player that Tanzania
  // withholds tax on their winnings at withdrawal — we withheld 15% of every
  // withdrawal, including money they had deposited and never bet. That is gone.
  const wcfg = await getEffectiveConfig();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/wallet/withdraw");

  const sp = await searchParams;
  const errorMsg = sp.error ? decodeURIComponent(sp.error) : null;
  // Restore form values on error redirect so the player doesn't re-enter everything
  const prevProvider = sp.provider ?? "";
  const prevAmount = sp.amount ?? "";
  const prevMsisdn = sp.msisdn ?? "";

  let wallet: Awaited<ReturnType<typeof db.wallet.findByUserId>> | null = null;
  let kyc: Awaited<ReturnType<typeof db.kyc.findByUserId>> | null = null;
  try { wallet = await db.wallet.findByUserId(session.userId); } catch { /* graceful */ }
  try { kyc = await db.kyc.findByUserId(session.userId); } catch { /* graceful */ }
  const kycApproved = kyc?.status === "APPROVED";

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <BackLink fallbackHref="/wallet" label={t.wallet.title} />

      <PageHero glow="rose" contentClassName="relative z-10 p-5 lg:p-6 flex items-end justify-between gap-4">
          <PageHeader
            tone="gold"
            icon={<I.arrowUpFromLine s={14} className="text-gold-300" />}
            eyebrow={t.wallet.withdrawTitle}
            title={t.wallet.moveFundsOut}
            subtitle={t.wallet.mobileMoney}
          />
          <div className="text-right shrink-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{t.wallet.available}</p>
            <Cash className="font-display font-bold text-[22px] tabular-nums text-text leading-none block">
              {formatTzs(wallet?.balance ?? 0)}
            </Cash>
            {(wallet?.hold ?? 0) > 0 && (
              <Cash className="mt-1 font-mono text-[10.5px] tabular-nums text-warning-fg block">
                {`${t.wallet.holdWarning} ${formatTzs(wallet?.hold ?? 0)}`}
              </Cash>
            )}
          </div>
      </PageHero>

      {errorMsg && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-no-700/60 bg-no-500/[0.10] px-4 py-3">
          <I.alertCircle s={16} />
          <div className="text-[12.5px] leading-snug">
            <p className="font-display font-semibold text-text">{t.wallet.withdrawFailed}</p>
            <p className="mt-0.5 text-text-muted">{errorMsg}</p>
          </div>
        </div>
      )}

      {!kycApproved && (
        <div className="flex items-start gap-3.5 rounded-xl border border-warning-border bg-warning-bg/30 p-4">
          <KycLock />
          <div className="min-w-0">
            <p className="font-display font-semibold text-text">{t.wallet.verifyFirst}</p>
            <p className="mt-1 text-[12.5px] text-text-muted leading-snug">
              {t.wallet.verifyFirstBody}
            </p>
            {/* Return the user to Withdraw after verifying (IA review R6);
                primary not gold — verifying ID isn't a money-in action. */}
            <Link href="/profile/kyc?next=/wallet/withdraw" className="btn btn-primary btn-sm mt-3">
              {t.wallet.continueKyc}
            </Link>
          </div>
        </div>
      )}

      <form
        action={withdrawAction}
        className={`rounded-xl glass-panel p-5 lg:p-6 space-y-5 ${kycApproved ? "" : "opacity-60"}`}
      >
        <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
        <fieldset disabled={!kycApproved}>
          <FieldLegend as="legend" className="mb-2">
            {t.wallet.destination}
          </FieldLegend>
          <ProviderRadioGrid providers={PROVIDERS} defaultProvider={prevProvider} unavailableLabel={t.common.temporarilyUnavailable} />
        </fieldset>

        {/* C2e — amount now routes through the shared deposit/withdraw kit
            control (Input + quick-amount chips), instead of a bare number field. */}
        <AmountField
          label={t.wallet.amount}
          hint={t.wallet.amountHint}
          quickAmounts={WITHDRAW_QUICK}
          min={WITHDRAW_MIN_TZS}
          max={Math.min(WITHDRAW_MAX_TZS, wallet?.balance ?? 0)}
          defaultValue={prevAmount || undefined}
          disabled={!kycApproved}
        />

        <KitField label={t.wallet.destinationPhone}>
          <Input
            id="msisdn"
            name="msisdn"
            type="tel"
            inputMode="numeric"
            pattern="\d{9}"
            maxLength={9}
            required
            placeholder="712 345 678"
            defaultValue={prevMsisdn || undefined}
            disabled={!kycApproved}
            prefix="+255"
            mono
          />
        </KitField>

        {/* C2e — the withdraw notices merged into ONE iconized panel (was two
            separate info/warning strips). */}
        <div className="rounded-xl border border-border bg-bg-elevated/50 divide-y divide-border/60">
          <NoticeRow icon={<I.shieldcheck s={15} className="text-info-fg" />} title={t.wallet.securedByKyc} body={t.wallet.securedBody} />
          <NoticeRow icon={<I.alertCircle s={15} className="text-warning-fg" />} title={t.wallet.taxNotice} body={fill(t.wallet.taxBody, { pct: pctNum(wcfg.withdrawalFeeRate) })} />
        </div>

        {kycApproved ? <WithdrawConfirm /> : <SubmitButton label={t.common.confirm} pendingLabel={t.common.loading} />}
      </form>
    </main>
  );
}

/** One iconized row inside the merged withdraw notices panel (C2e). */
function NoticeRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-2.5 px-3.5 py-3 text-[12.5px] leading-snug">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="font-display font-semibold text-text">{title}</p>
        <p className="mt-0.5 text-text-muted">{body}</p>
      </div>
    </div>
  );
}

/** C2e — KYC-lock line-art: a padlock over an ID silhouette, marking that
 *  withdrawal is gated behind identity verification. */
function KycLock() {
  return (
    <svg viewBox="0 0 56 56" width={44} height={44} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-warning-fg" aria-hidden>
      <rect x="7" y="13" width="34" height="24" rx="3" />
      <circle cx="17" cy="22" r="3.4" />
      <path d="M12 30 a5 5 0 0 1 10 0" />
      <line x1="27" y1="20" x2="36" y2="20" />
      <line x1="27" y1="25" x2="34" y2="25" />
      {/* padlock in front (filled with the panel bg so it occludes the card) */}
      <rect x="30" y="34" width="17" height="13" rx="2.5" fill="var(--warning-bg)" />
      <path d="M33.5 34 v-3 a4.5 4.5 0 0 1 9 0 v3" />
      <circle cx="38.5" cy="40.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
