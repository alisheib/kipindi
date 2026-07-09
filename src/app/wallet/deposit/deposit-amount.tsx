"use client";

/**
 * DepositAmount — thin wrapper over the shared wallet AmountField (C2e unified
 * deposit + withdraw onto one control). Keeps the same call signature the deposit
 * page already uses.
 */
import { AmountField } from "@/components/wallet/amount-field";
import { useT } from "@/lib/i18n";

export function DepositAmount({
  max,
  quickAmounts,
  defaultValue,
}: {
  max: number;
  quickAmounts: number[];
  adminTest?: boolean;
  defaultValue?: string;
}) {
  const { t } = useT();
  return (
    <AmountField
      label={t.common.depositAmountLabel}
      hint={t.common.depositAmountHint}
      quickAmounts={quickAmounts}
      max={max}
      defaultValue={defaultValue}
    />
  );
}
