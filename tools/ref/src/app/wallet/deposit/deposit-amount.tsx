"use client";

/**
 * DepositAmount — thin wrapper over the shared wallet AmountField (C2e unified
 * deposit + withdraw onto one control). Keeps the same call signature the deposit
 * page already uses.
 *
 * ⭐ THE HINT STATES THE RULE FROM ITS ONE HOME (2026-10-07). `depositAmountHint` is a `{min}`/`{max}` template filled
 * from DEPOSIT_MIN_TZS / DEPOSIT_MAX_TZS — it carried a typed "Min TZS 500" in three languages after the minimum it
 * stated had become TZS 1,000 (management, relayed by Ali: "consistently 1000 not 500"). `formatNumber` keeps the
 * dictionary's no-break spaces around each figure intact (zh once wrapped between "TZS" and its amount).
 * ⭐ A prefilled amount below the minimum (`?amount=` on a hand-made link) is not shown: the field would offer a figure
 * the confirm dialog and the server both refuse.
 */
import { AmountField } from "@/components/wallet/amount-field";
import { useT } from "@/lib/i18n";
import { fill, formatNumber } from "@/lib/utils";
import { DEPOSIT_MIN_TZS, DEPOSIT_MAX_TZS } from "@/lib/server/validators";

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
  const prefill = defaultValue && Number(defaultValue) >= DEPOSIT_MIN_TZS ? defaultValue : undefined;
  return (
    <AmountField
      label={t.common.depositAmountLabel}
      hint={fill(t.common.depositAmountHint, { min: formatNumber(DEPOSIT_MIN_TZS), max: formatNumber(DEPOSIT_MAX_TZS) })}
      quickAmounts={quickAmounts}
      min={DEPOSIT_MIN_TZS}
      max={max}
      defaultValue={prefill}
    />
  );
}
