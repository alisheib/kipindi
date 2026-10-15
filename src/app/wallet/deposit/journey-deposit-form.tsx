"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AmountField } from "@/components/wallet/amount-field";
import { ProviderRadioGrid, type ProviderOption } from "@/components/wallet/provider-radio-grid";
import { PhoneInput } from "@/components/ui/phone-input";
import { Chip } from "@/components/ui/chip";
import { FieldLegend } from "@/components/ui/field-legend";
import { DepositNumberChoice } from "@/components/wallet/deposit-number-choice";
import { useT } from "@/lib/i18n";
import { formatTzs } from "@/lib/utils";
import { parseBetParam, PENDING_BET_KEY } from "@/lib/journey/pending-bet";
import { sideWord } from "@/lib/side-label";
import { trustedDepositBet, type SavedDepositBet } from "@/lib/journey/deposit-state-client";
import { DEPOSIT_MIN_TZS } from "@/lib/server/validators";
import { depositAction } from "./actions";
import { fundingStorageKey, parseStoredFunding, releaseStoredFunding, writeStoredFunding, type StoredFundingIdentity } from "@/lib/journey/funding-storage";

export function JourneyDepositForm({
  ownerId, releaseKey, rawBet, returnPath, initialAmount, initialPhone, registeredPhone, initialProvider,
  providers, maxAmount, quickAmounts, spendable, fromLowBalance,
}: {
  ownerId: string;
  releaseKey: string | null;
  rawBet: string | null;
  returnPath: string | null;
  initialAmount: string;
  initialPhone: string;
  registeredPhone: string;
  initialProvider: string;
  providers: readonly ProviderOption[];
  maxAmount: number;
  quickAmounts: number[];
  spendable: number | null;
  fromLowBalance: boolean;
}) {
  const { t } = useT();
  const formRef = useRef<HTMLFormElement>(null);
  const submittedKey = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [stored, setStored] = useState<StoredFundingIdentity | null>(null);
  const [chosenBet, setChosenBet] = useState<SavedDepositBet | null>(null);
  const [amount, setAmount] = useState<number | null>(Number(initialAmount) || null);
  const [selectedProvider, setSelectedProvider] = useState(
    providers.some((p) => p.id === initialProvider && !p.unavailable) ? initialProvider : "",
  );
  const [phone, setPhone] = useState(initialPhone);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const box = window.sessionStorage;
      const slot = fundingStorageKey(ownerId);
      if (releaseKey && releaseStoredFunding(box, ownerId, releaseKey) && submittedKey.current === releaseKey) {
        submittedKey.current = null;
        setSubmitting(false);
      }
      setStored(null);
      setChosenBet(null);
      const existing = box.getItem(slot);
      if (existing) {
        const record = parseStoredFunding(existing, ownerId);
        if (!record) throw new Error("Invalid saved payment");
        setStored(record);
      }
      if (rawBet) {
        const markerRaw = box.getItem(PENDING_BET_KEY);
        const trusted = trustedDepositBet(ownerId, rawBet, returnPath, { kind: "tab-marker", hydrated: true, markerRaw }, Date.now());
        if (!trusted) throw new Error("The selected bet could not be recovered");
        setChosenBet(trusted);
      }
      setBlocked(false);
      setReady(true);
    } catch {
      // A payment dependent on this tab's chosen bet or saved funding key cannot safely start without durable tab storage.
      setBlocked(true);
      setReady(true);
    }
  }, [ownerId, releaseKey, rawBet, returnPath]);

  const cardHref = useMemo(() => {
    const p = new URLSearchParams();
    if (amount !== null && Number.isSafeInteger(amount) && amount > 0) p.set("amount", String(amount));
    if (fromLowBalance) p.set("from", "low-balance");
    if (chosenBet) { p.set("bet", chosenBet.bet); p.set("returnPath", chosenBet.returnPath); }
    return `/wallet/deposit/card${p.size ? `?${p}` : ""}`;
  }, [amount, fromLowBalance, chosenBet]);
  const selectedBet = chosenBet ? parseBetParam(chosenBet.bet) : null;
  const selectedStake = selectedBet?.stake ?? null;
  const remaining = selectedStake !== null && spendable !== null && amount !== null
    ? Math.max(0, selectedStake - spendable - amount) : null;
  const canPay = providers.some((p) => p.id === selectedProvider && !p.unavailable)
    && amount !== null && amount >= DEPOSIT_MIN_TZS && amount <= maxAmount
    && /^[67][0-9]{8}$/.test(phone) && spendable !== null;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!ready || blocked || stored || submitting || submittedKey.current || !canPay) { event.preventDefault(); return; }
    const form = event.currentTarget;
    const data = new FormData(form);
    const provider = String(data.get("provider") ?? "");
    const amountNow = Number(data.get("amount"));
    const msisdn = String(data.get("msisdn") ?? "");
    if (!providers.some((p) => p.id === provider && !p.unavailable)
      || !Number.isSafeInteger(amountNow) || amountNow < DEPOSIT_MIN_TZS || amountNow > maxAmount
      || !/^[67][0-9]{8}$/.test(msisdn)) {
      event.preventDefault(); return;
    }
    try {
      // A funding identity is born only at the explicit Lipa commit, never on page open or a refused chooser.
      const key = crypto.randomUUID();
      const pendingBet = rawBet ? trustedDepositBet(ownerId, rawBet, returnPath,
        { kind: "tab-marker", hydrated: true, markerRaw: window.sessionStorage.getItem(PENDING_BET_KEY) }, Date.now()) : null;
      if (rawBet && (!pendingBet || JSON.stringify(pendingBet) !== JSON.stringify(chosenBet))) throw new Error("Bet changed");
      if (chosenBet) {
        const field = form.elements.namedItem("pendingBet") as HTMLInputElement | null;
        if (!field) throw new Error("Missing bet field");
        field.value = JSON.stringify(chosenBet);
      }
      // Tab recovery needs the payment identity only. Phone, amount and chosen bet live in the owned server row.
      const funding: StoredFundingIdentity = { v: 1, key, owner: ownerId, startedAt: Date.now(), attempts: 1 };
      if (!writeStoredFunding(window.sessionStorage, ownerId, funding)) throw new Error("Funding key unavailable");
      const keyField = form.elements.namedItem("idempotencyKey") as HTMLInputElement | null;
      if (!keyField) throw new Error("Missing funding key field");
      keyField.value = key;
      submittedKey.current = key;
      setSubmitting(true);
    } catch {
      event.preventDefault();
      setBlocked(true);
    }
  };

  if (!ready) return <div className="rounded-xl glass-panel p-5" role="status">{t.common.loading}</div>;
  if (blocked) return (
    <div className="rounded-xl glass-panel p-5" role="alert">
      <h2 className="font-display font-semibold text-text">{t.wallet.returnUnknownTitle}</h2>
      <p className="mt-2 text-body-sm text-text-muted">{t.wallet.returnUnknownBody}</p>
      <a href="/wallet" className="btn btn-ghost btn-md mt-4 inline-flex">{t.error.backToWallet}</a>
    </div>
  );
  if (stored) return (
    <div className="rounded-xl glass-panel p-5" role="status" data-testid="deposit-recover-lock">
      <h2 className="font-display font-semibold text-text">{t.wallet.returnPendingTitle}</h2>
      <p className="mt-2 text-body-sm text-text-muted">{t.wallet.returnPendingWarnBody}</p>
      <Link href={`/wallet/deposit/wait?key=${encodeURIComponent(stored.key)}`} className="btn btn-primary btn-lg mt-4 inline-flex w-full justify-center">
        {t.wallet.viewReceipt}
      </Link>
    </div>
  );

  return (
    <form ref={formRef} action={depositAction} onSubmit={onSubmit}
      onChange={(event) => { const target = event.target; if (target instanceof HTMLInputElement && target.name === "provider") setSelectedProvider(target.value); }}
      className="rounded-xl glass-panel p-5 lg:p-6" data-testid="journey-deposit-form">
      <div className="space-y-5">
        <input type="hidden" hidden name="flow" value="journey" />
        <input type="hidden" hidden name="expectedOwner" value={ownerId} />
        <input type="hidden" hidden name="idempotencyKey" defaultValue="" />
        <input type="hidden" hidden name="pendingBet" defaultValue="" />
        {fromLowBalance && <input type="hidden" hidden name="origin" value="low_balance" />}
        {selectedBet && selectedStake !== null && <div data-testid="journey-deposit-bet-strip" className="rounded-lg border border-border bg-bg-inset px-4 py-3 text-body-sm text-text-muted">
          <div className="flex flex-wrap items-center gap-2">
            <Chip data-testid="journey-deposit-side" variant={selectedBet.side === "YES" || selectedBet.side === "UP" ? "yes" : "no"}>
              {sideWord(t, selectedBet.side, selectedBet.kind === "round" ? "UPDOWN" : "MARKET")}
            </Chip>
            <p className="font-semibold text-text">{t.journey.depositChosenBet}: <span className="amount">{formatTzs(selectedStake)}</span></p>
          </div>
          {remaining !== null && remaining > 0 && <p className="mt-1">{t.journey.depositStillShort.replace("{amount}", formatTzs(remaining))}</p>}
        </div>}
        <AmountField label={t.common.depositAmountLabel} quickAmounts={quickAmounts} min={DEPOSIT_MIN_TZS} max={maxAmount}
          defaultValue={initialAmount} fullFigures onValueChange={setAmount} />
        <fieldset>
          <FieldLegend as="legend" className="mb-2">{t.wallet.choosePaymentMethod}</FieldLegend>
          <ProviderRadioGrid providers={providers} defaultProvider={initialProvider} unavailableLabel={t.common.temporarilyUnavailable} layout="rows" noDefault />
        </fieldset>
        <div>
          <FieldLegend as="label" htmlFor="msisdn" className="block mb-2">{t.wallet.mobileMoneyNumber}</FieldLegend>
          <PhoneInput id="msisdn" name="msisdn" placeholder="712 345 678" defaultValue={initialPhone}
            onChange={(event) => setPhone(event.target.value)} required />
          <p className="mt-1.5 text-body-sm text-text-subtle">{t.wallet.mobileMoneyNumberHint}</p>
          <DepositNumberChoice registered={registeredPhone} current={initialPhone}
            copy={{ useAnother: t.wallet.useAnotherNumber, useMine: t.wallet.useMyNumber }} />
        </div>
        <p className="text-body-sm text-text-muted">{t.journey.depositPinNote}</p>
        <button type="submit" disabled={submitting || !canPay} className="btn btn-primary btn-lg w-full disabled:opacity-50">
          {amount && amount >= DEPOSIT_MIN_TZS ? t.journey.depositPayAmount.replace("{amount}", formatTzs(amount)) : t.journey.depositPay}
        </button>
        <a href={cardHref} className="btn btn-ghost btn-md flex w-full justify-center">{t.journey.depositCardLink}</a>
        <p className="text-center text-body-sm text-text-subtle">18+</p>
      </div>
    </form>
  );
}
