import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { FieldLegend } from "@/components/ui/field-legend";
import { Input } from "@/components/ui/input";
import { CashbackPromo } from "@/components/ui/cashback-promo";
import { currentSession } from "@/lib/server/auth-service";
import { moneyFormMsisdn, normalizeTzLocalDigits } from "@/lib/phone-normalize";
import { DepositNumberChoice } from "@/components/wallet/deposit-number-choice";
import { db } from "@/lib/server/store";
import { getBonusConfig } from "@/lib/server/bonus-config";
import { getServerT } from "@/lib/i18n-server";
import { depositAction } from "./actions";
import { DEPOSIT_MAX_TZS } from "@/lib/server/validators";
import { DepositAmount } from "./deposit-amount";
import { DepositConfirm } from "./deposit-confirm";
import { IdempotencyKeyField } from "@/components/wallet/idempotency-key-field";
import { ProviderRadioGrid } from "@/components/wallet/provider-radio-grid";
import { CardBillingFields } from "@/components/wallet/card-billing-fields";
import { EmailVerifyGate } from "@/components/wallet/email-verify-gate";
import { getPayoutStatus } from "@/lib/server/payout-status";
import { PayoutStatusNotice } from "@/components/wallet/payout-status-notice";
import { PageContainer } from "@/components/layout/page-container";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Deposit", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.deposit };
}

const ADMIN_TEST_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

const PROVIDERS = [
  { id: "MPESA",        name: "M-Pesa",        hue: 152 },
  { id: "AIRTEL_MONEY", name: "Airtel Money",  hue: 22 },
  { id: "HALO_PESA",    name: "HaloPesa",      hue: 80 },
  { id: "MIXX",         name: "Mixx by Yas",   hue: 280 },
  { id: "CARD",         name: "Card",          hue: 200 },
] as const;

const QUICK_AMOUNTS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000];

export default async function DepositPage({ searchParams }: { searchParams: Promise<{
  error?: string; provider?: string; amount?: string; msisdn?: string;
  bFirst?: string; bLast?: string; bAddr?: string; bCity?: string; bRegion?: string; bPost?: string;
}> }) {
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/wallet/deposit");
  const { t } = await getServerT();

  // A player about to put money IN has the most right to know we cannot get it out.
  const payouts = await getPayoutStatus();

  const sp = await searchParams;
  const errorMsg = sp.error ? decodeURIComponent(sp.error) : null;
  const prevProvider = sp.provider ?? "";
  const prevAmount = sp.amount ?? "";
  // ⭐ Jay item #8 — see the note in `moneyFormMsisdn`. Same rule, same reason: this action
  // also omits an empty msisdn from its carry params (`deposit/actions.ts:46`).
  const prevMsisdn = moneyFormMsisdn(session.phoneE164, sp.msisdn, errorMsg != null);
  // Billing values round-tripped through the error redirect so a rejected card
  // deposit never makes the player retype their address.
  const prevBilling = {
    firstName: sp.bFirst ?? "",
    lastName: sp.bLast ?? "",
    address1: sp.bAddr ?? "",
    city: sp.bCity ?? "",
    region: sp.bRegion ?? "",
    postcode: sp.bPost ?? "",
  };

  let user: Awaited<ReturnType<typeof db.user.findById>> | null = null;
  try { user = await db.user.findById(session.userId); } catch { /* graceful — default limits */ }
  // The deposit gate. Read here purely to choose what to RENDER; wallet-service
  // re-checks it on submit, so this is presentation, never the enforcement.
  const emailVerified = !!user?.emailVerifiedAt;
  const adminTest = !!user && ADMIN_TEST_ROLES.has(user.role) && process.env.NODE_ENV !== "production" && process.env.ADMIN_TEST_DEPOSITS !== "false";
  const maxAmount = adminTest ? 1_000_000_000 : DEPOSIT_MAX_TZS;
  const quickAmounts = adminTest ? [100_000, 1_000_000, 5_000_000, 20_000_000, 100_000_000] : QUICK_AMOUNTS;
  const bonusCfg = getBonusConfig();
  const showCashback = bonusCfg.enabled && bonusCfg.cashbackEnabled && bonusCfg.cashbackPercentage > 0;

  return (
    <PageContainer tier="form" className="space-y-5">
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

      {/* 🔴 Deliberately ABOVE the cashback promo. If we cannot pay withdrawals, a player has to
          learn that BEFORE we offer them a bonus for putting money in — showing the incentive
          first and the limitation later is the shape of a scam, whatever the intent. */}
      <PayoutStatusNotice
        status={payouts.status}
        variant="deposit"
        note={payouts.note}
        labels={{
          delayedTitle: t.wallet.payoutsDelayedTitle,
          delayedBody: t.wallet.payoutsDelayedBody,
          unavailableTitle: t.wallet.payoutsUnavailableTitle,
          unavailableBody: t.wallet.payoutsUnavailableBody,
          depositWarning: t.wallet.payoutsUnavailableDepositWarning,
        }}
      />

      {showCashback && <CashbackPromo percent={bonusCfg.cashbackPercentage} mode={bonusCfg.cashbackMode} compact cta={false} />}

      {/* ── EMAIL GATE ────────────────────────────────────────────────────────
          A confirmed address is required before the FIRST deposit. The ladder used to
          read "browse free → verify email to deposit → KYC to withdraw"; the third rung
          is gone since 2026-08-20 (Board comment #1), so this is now the ONLY identity-ish
          gate on the money path in either direction. We render the gate INSTEAD
          of the form rather than letting the player fill everything in and be
          rejected on submit — the server enforces it either way, but being told
          up front, with the action that fixes it, is the difference between a
          gate and a dead end. */}
      {!emailVerified ? (
        <EmailVerifyGate email={user?.email ?? null} />
      ) : (
      <form action={depositAction} className="group/deposit rounded-xl glass-panel p-5 lg:p-6 space-y-5">
        <IdempotencyKeyField />
        <fieldset>
          <FieldLegend as="legend" className="mb-2">
            {t.wallet.choosePaymentMethod}
          </FieldLegend>
          <ProviderRadioGrid providers={PROVIDERS} defaultProvider={prevProvider} unavailableLabel={t.common.temporarilyUnavailable} />
        </fieldset>

        <DepositAmount max={maxAmount} quickAmounts={quickAmounts} adminTest={adminTest} defaultValue={prevAmount} />

        {/* Handset number — mobile-money rails only. Hidden (not unmounted) for
            CARD, where the buyer enters their details on Selcom's page instead
            and there is no USSD prompt to push anywhere. No html `required`: it
            would block submit while hidden. depositAction enforces it. */}
        <div className="group-has-[#provider-CARD:checked]/deposit:hidden">
          <FieldLegend as="label" htmlFor="msisdn" className="block mb-2">
            {t.wallet.mobileMoneyNumber}
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
          <p className="mt-1.5 text-[11.5px] text-text-subtle">{t.wallet.mobileMoneyNumberHint}</p>
          {/* 🔴 `E-215`'s OTHER HALF. Withdrawal states its destination and refuses any
              other; deposit OFFERS one, because money arriving from a friend's handset is
              ordinary and blocking it would break real top-ups. The prefill alone was not
              enough: a box that already holds your own number reads as settled rather than
              editable, so the player who needs a different number never thinks to try. */}
          <DepositNumberChoice
            registered={normalizeTzLocalDigits(session.phoneE164)}
            current={prevMsisdn}
            copy={{ useAnother: t.wallet.useAnotherNumber, useMine: t.wallet.useMyNumber }}
          />
        </div>

        {/* Billing details — CARD only. Selcom rejects card orders without them. */}
        <CardBillingFields
          copy={{
            legend: t.wallet.billingLegend,
            why: t.wallet.billingWhy,
            firstName: t.wallet.billingFirstName,
            lastName: t.wallet.billingLastName,
            address: t.wallet.billingAddress,
            city: t.wallet.billingCity,
            region: t.wallet.billingRegion,
            postcode: t.wallet.billingPostcode,
          }}
          defaults={prevBilling}
        />

        {/* Deposit confirms before dispatch (audit M9), matching bet + withdraw.
            Money-in → gold trigger (micro-spec §1). */}
        <DepositConfirm />
      </form>
      )}

      {/* Trust strip — the regulator seal is a licensed asset (⊘ pending, Ali);
          this slot is a deliberately-labeled placeholder, never a fabricated mark. */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated/60 px-4 py-3">
        <span
          aria-hidden
          /* ⚠️ LITERAL, not `h-10 w-10` — `theme.extend.spacing` is overridden
             (tailwind.config.ts:200-215), so `h-10` renders 80px and made this
             empty placeholder the loudest object on the deposit screen. */
          className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center border border-dashed border-border text-text-subtle"
          style={{ borderRadius: "var(--r-md)" }}
        >
          <I.shieldcheck s={18} />
        </span>
        <p className="text-[11.5px] text-text-subtle leading-relaxed">
          {t.wallet.securedBody}
        </p>
      </div>
    </PageContainer>
  );
}
