import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { FieldLegend } from "@/components/ui/field-legend";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input, Field as KitField } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { Cash } from "@/components/ui/cash";
import { AmountField } from "@/components/wallet/amount-field";
import { formatTzs, fill, pctNum } from "@/lib/utils";
import { getEffectiveConfig } from "@/lib/server/market-config";
import { WithdrawConfirm } from "./withdraw-confirm";
import { IdempotencyKeyField } from "@/components/wallet/idempotency-key-field";
import { WITHDRAW_MIN_TZS, WITHDRAW_MAX_TZS } from "@/lib/server/validators";
import { minWithdrawalForRate } from "@/lib/payout";

// Quick-amount chips for withdraw — AmountField hides any chip above the
// account's withdrawable max (min(cap, balance)), so small balances show fewer.
const WITHDRAW_QUICK = [5_000, 10_000, 25_000, 50_000, 100_000, 500_000];
import { currentSession } from "@/lib/server/auth-service";
import { normalizeTzLocalDigits } from "@/lib/phone-normalize";
import { db } from "@/lib/server/store";
import { withdrawAction } from "./actions";
import { getServerT } from "@/lib/i18n-server";
import { ProviderRadioGrid } from "@/components/wallet/provider-radio-grid";
import { getPayoutStatus, payoutsAcceptingRequests } from "@/lib/server/payout-status";
import { PayoutStatusNotice } from "@/components/wallet/payout-status-notice";
import { PageContainer } from "@/components/layout/page-container";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.wallet.withdrawTitle };
}

// Mobile-money payout rails only (Selcom Wallet Cashin). Bank transfer is a
// separate rail (Qwiksend) with its own account capture — not offered here.
const PROVIDERS = [
  { id: "MPESA",        name: "M-Pesa",        hue: 152 },
  { id: "AIRTEL_MONEY", name: "Airtel Money",  hue: 22 },
  { id: "HALO_PESA",    name: "HaloPesa",      hue: 80 },
  { id: "MIXX",         name: "Mixx by Yas",   hue: 280 },
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
  // 🔴 `E-215` · ON WITHDRAWAL THE DESTINATION IS THE ACCOUNT'S NUMBER, FULL STOP —
  // so it is read from the SESSION and never from the query string.
  //
  // ⭐ THIS LINE USED TO BE `moneyFormMsisdn(session.phoneE164, sp.msisdn, errorMsg != null)`,
  // which was exactly right for Jay item #8 (E-210) and is exactly wrong now, for a reason
  // worth stating: that rule ROUND-TRIPS WHAT WAS SUBMITTED on a validation error. The form
  // can no longer submit anything else — the field is gone — but a hand-crafted POST can, and
  // the action carries `msisdn` back in its error redirect. So the old call would take an
  // attacker's number straight out of `?msisdn=` and render it on this page under the words
  // "Registered number". ⛔ A FALSE STATEMENT ABOUT WHERE MONEY IS GOING, on the screen whose
  // entire job is to state that correctly — the E-5 shape, and worse, because it would be
  // reassuring rather than merely wrong.
  //
  // ⛔ `moneyFormMsisdn` IS NOT CHANGED and is still the rule on DEPOSIT, where a player may
  // legitimately choose another number and must not lose it to a validation error. The two
  // screens want different behaviour because the two directions carry different risk; that
  // asymmetry IS the law, not an inconsistency. `test:msisdn-prefill` pins both halves.
  const registeredMsisdn = normalizeTzLocalDigits(session.phoneE164);

  // B-1: a swallowed wallet read made the form silently unusable (max = 0). A failed
  // read throws to the wallet error boundary instead of fabricating that state.
  //
  // ⛔ THE KYC READ IS GONE FROM THIS PAGE, DELIBERATELY — not overlooked. Identity
  // verification stopped being a precondition of withdrawal (Board comment #1, relayed
  // by the owner 2026-08-19), so this page has nothing left to decide from it, and a
  // page-level read with nothing to decide is how the gate gets re-added. The read that
  // survives is in `wallet-service.withdraw()`, where it RECORDS identity instead of
  // gating on it. See docs/BOARD-DISCLOSURE-B-E.md.
  const wallet = await db.wallet.findByUserId(session.userId);

  // Can we actually pay a withdrawal right now? Since 2026-07-29 the honest answer has been no,
  // and until this landed the form said nothing at all. `unavailable` disables the form — taking
  // a request we cannot fulfil is worse than refusing it, because it looks like progress.
  // ✅ SEALED 2026-08-10 — the temporary named-tester bypass is deleted (see the withdraw
  // action for the full note). One gate, everyone, no exceptions.
  const payouts = await getPayoutStatus();
  const payoutsOpen = payoutsAcceptingRequests(payouts.status);
  // ⛔ PAYOUT CAPACITY IS THE ONLY THING THAT DISABLES THIS FORM NOW. It used to be
  // `kycApproved && payoutsOpen`; identity came out on the Board's instruction. The
  // service agrees — it no longer refuses on identity either, which is the point: a
  // page that promised what the next screen refused is E-5, and this is the same
  // failure read backwards.
  const canSubmit = payoutsOpen;

  return (
    <PageContainer tier="form" className="space-y-5">
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
            <p className="font-mono text-micro uppercase eyebrow text-text-subtle">{t.wallet.available}</p>
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
          <div className="text-body-sm leading-snug">
            <p className="font-display font-semibold text-text">{t.wallet.withdrawFailed}</p>
            <p className="mt-0.5 text-text-muted">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* "We cannot pay you right now" is the first thing this page says, and after
          2026-08-20 it is also the ONLY precondition it states — the verify-your-ID
          panel this used to be ranked against is gone. */}
      <PayoutStatusNotice
        status={payouts.status}
        note={payouts.note}
        since={payouts.declaredAt ? fill(t.wallet.payoutsSince, { date: new Date(payouts.declaredAt).toLocaleDateString("en-GB") }) : null}
        labels={{
          delayedTitle: t.wallet.payoutsDelayedTitle,
          delayedBody: t.wallet.payoutsDelayedBody,
          unavailableTitle: t.wallet.payoutsUnavailableTitle,
          unavailableBody: t.wallet.payoutsUnavailableBody,
          depositWarning: t.wallet.payoutsUnavailableDepositWarning,
        }}
      />

      {/* The verify-first panel stood here until 2026-08-20. It is gone, not hidden:
          nothing on this page is conditional on identity any more. */}

      <form
        action={withdrawAction}
        className={`rounded-xl glass-panel p-5 lg:p-6 space-y-5 ${canSubmit ? "" : "opacity-60"}`}
      >
        <IdempotencyKeyField />
        <fieldset disabled={!canSubmit}>
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
          // Derived from the LIVE fee rate, not WITHDRAW_MIN_TZS: the gateway's floor is on
          // what it receives (net), so a gross minimum of 1,000 offers an amount we cannot
          // actually send. See minWithdrawalForRate.
          min={Math.max(WITHDRAW_MIN_TZS, minWithdrawalForRate(wcfg.withdrawalFeeRate))}
          max={Math.min(WITHDRAW_MAX_TZS, wallet?.balance ?? 0)}
          defaultValue={prevAmount || undefined}
          disabled={!canSubmit}
        />

        {/* 🔴 `E-215` · THE DESTINATION IS STATED, NOT TYPED — and it is not a disabled
            input either. Until 2026-08-25 this was a free-text field and the server compared
            it to nothing: 7 of 25 lifetime withdrawals went to a number other than the
            account's, 6 CONFIRMED, one of them a DIGIT TRANSPOSITION (`…979354` → `…939754`)
            — a player who mistyped their own number and paid a stranger.

            ⛔ NOT `disabled`, ON THE OWNER'S EXPLICIT INSTRUCTION. A greyed-out box says
            *you may not* without ever saying *why*, so the player is left to guess whether
            the form is broken. This shows the number, names it as the registered one, and
            states the rule in the player's own language.

            ⚠️ THE HIDDEN INPUT IS NOT THE CONTROL. `WithdrawConfirm.validate()` reads
            `fd.get("msisdn")` and the payee-name lookup posts it, so the form must still
            carry the value; but nothing here is what makes the rule true. The seal is
            `payoutDestinationFor` inside `wallet-service.withdraw()`, which refuses a
            mismatch before a shilling is moved — this markup is manners, the server is the
            law. Rewriting the hidden value in devtools changes nothing. */}
        <div className="rounded-xl border border-border bg-bg-inset/60 px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <FieldLegend>{t.wallet.destinationPhone}</FieldLegend>
            <Chip variant="neutral" size="sm">{t.wallet.destinationRegistered}</Chip>
          </div>
          <p className="mt-1.5 font-mono text-body-lg tabular-nums text-text">
            +255 {registeredMsisdn.replace(/(\d{3})(?=\d)/g, "$1 ")}
          </p>
          <p className="mt-1.5 text-body-sm leading-snug text-text-muted">{t.wallet.destinationLockedBody}</p>
          <input type="hidden" name="msisdn" value={registeredMsisdn} />
        </div>

        {/* C2e — the withdraw notices merged into ONE iconized panel (was two
            separate info/warning strips). */}
        <div className="rounded-xl border border-border bg-bg-elevated/50 divide-y divide-border/60">
          <NoticeRow icon={<I.shieldcheck s={15} className="text-info-fg" />} title={t.wallet.securedByKyc} body={t.wallet.securedBody} />
          <NoticeRow icon={<I.alertCircle s={15} className="text-warning-fg" />} title={t.wallet.taxNotice} body={fill(t.wallet.taxBody, { pct: pctNum(wcfg.withdrawalFeeRate) })} />
        </div>

        {canSubmit ? <WithdrawConfirm feeRate={wcfg.withdrawalFeeRate} /> : <SubmitButton label={t.common.confirm} pendingLabel={t.common.loading} disabled={!canSubmit} />}
      </form>
    </PageContainer>
  );
}

/** One iconized row inside the merged withdraw notices panel (C2e). */
function NoticeRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-2.5 px-3.5 py-3 text-body-sm leading-snug">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="font-display font-semibold text-text">{title}</p>
        <p className="mt-0.5 text-text-muted">{body}</p>
      </div>
    </div>
  );
}

// The `KycLock` padlock icon was deleted 2026-08-20 with the panel it marked. It
// existed to say "withdrawal is gated behind identity verification", which is no
// longer true of this product.
