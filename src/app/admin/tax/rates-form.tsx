"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateSelect } from "@/components/ui/date-select";
import { Button } from "@/components/ui/button";
import { useDeferredToast } from "@/components/ui/toast";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { GENESIS_DAY, formatWhole, parsePercentToBp, percentLabel, taxOnPayout } from "@/lib/tax-report";
import { recordTaxRatesAction } from "./actions";

/**
 * Record a new rate version (`docs/TAX-REPORT.md` §5) — the Owner's control, per the owner rule of
 * 2026-10-03: every value is changeable by an admin, with validation and an audit row instead of
 * a locked box. A version takes effect at 00:00 EAT on its day and re-prices nothing before it;
 * a locked period keeps the rates it was filed under whatever is recorded here.
 * ⭐ The preview runs the SAME `taxOnPayout` the report runs, on the plan's worked example, so the
 * officer sees what the new rates would print before saving them.
 */
export function TaxRatesForm({ current, todayKey }: {
  current: { commissionBp: number; traBp: number; gbtBp: number };
  todayKey: string;
}) {
  const mayAct = useMayAct();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const [from, setFrom] = useState(todayKey);
  const [commission, setCommission] = useState(percentLabel(current.commissionBp).replace("%", ""));
  const [tra, setTra] = useState(percentLabel(current.traBp).replace("%", ""));
  const [gbt, setGbt] = useState(percentLabel(current.gbtBp).replace("%", ""));
  const [note, setNote] = useState("");
  /* What the form last held when it was clean — the opening values, then whatever was last RECORDED. Compared with
     this, not with `current`: a version recorded for a later day leaves today's rates as they were, and the form would
     otherwise read as unsaved work it no longer holds. */
  const [base, setBase] = useState(() => ({ from: todayKey, commission, tra, gbt }));
  const dirty = !pending && (from !== base.from || commission !== base.commission || tra !== base.tra || gbt !== base.gbt || note.trim() !== "");

  const c = parsePercentToBp(commission);
  const t = parsePercentToBp(tra);
  const g = parsePercentToBp(gbt);
  const preview = c !== null && t !== null && g !== null ? taxOnPayout(570_000 * 100, { commissionBp: c, traBp: t, gbtBp: g }) : null;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("effectiveFrom", from);
    start(async () => {
      const r = await runAdminAction(() => recordTaxRatesAction(fd));
      if (!r.ok) {
        toast({ title: "Couldn't record the rates", description: r.error, variant: "danger" });
        if (r.field) focusFirstInvalid(form, [r.field]);
        return;
      }
      setNote("");
      setBase({ from, commission, tra, gbt });
      router.refresh();
      const unrecorded = "recorded" in r && r.recorded === false;
      deferToast({
        title: "Rates recorded",
        description: unrecorded ? `In force from ${from} — but the audit log could not record it. Tell an engineer.` : `In force from ${from}, 00:00 EAT.`,
        variant: unrecorded ? "danger" : "success",
      });
    });
  };

  // ⛔ BELOW EVERY HOOK — a viewer without the Owner's ACT reads the rates above, and changes nothing.
  if (!mayAct) return <ActReadOnly note="Only the Owner can record new rates." />;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3" data-testid="tax-rates-form">
      <UnsavedChangesGuard dirty={dirty} body="New rates have been entered but not recorded. Leaving now discards them." />
      <Field label="In force from" hint="00:00 East Africa Time on this day. Recording the same day again replaces that day's rates." dataField="tax-rate-from">
        <DateSelect size="sm" min={GENESIS_DAY} value={from} onChange={setFrom} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Commission" hint="% of Payout" dataField="tax-rate-commission">
          <Input name="commission" inputMode="decimal" size="sm" mono value={commission} onChange={(e) => setCommission(e.currentTarget.value)} trailing="%" required />
        </Field>
        <Field label="TRA tax" hint="% of Commission" dataField="tax-rate-tra">
          <Input name="tra" inputMode="decimal" size="sm" mono value={tra} onChange={(e) => setTra(e.currentTarget.value)} trailing="%" required />
        </Field>
        <Field label="GBT levy" hint="% of Commission" dataField="tax-rate-gbt">
          <Input name="gbt" inputMode="decimal" size="sm" mono value={gbt} onChange={(e) => setGbt(e.currentTarget.value)} trailing="%" required />
        </Field>
      </div>
      <Field label="Why the rates change" hint="The notice, letter or decision behind it. Kept with the version and in the audit log." dataField="tax-rate-note">
        <Textarea name="note" value={note} onChange={(e) => setNote(e.currentTarget.value)} rows={2} maxLength={500} required />
      </Field>
      <p className="text-body-sm text-text-tertiary" aria-live="polite">
        {preview
          ? <>On the plan&apos;s worked example (<span className="whitespace-nowrap">Payout <span className="amount">570,000</span></span>): <span className="whitespace-nowrap">Commission <span className="amount">{formatWhole(preview.commission)}</span></span> · <span className="whitespace-nowrap">TRA <span className="amount">{formatWhole(preview.tra)}</span></span> · <span className="whitespace-nowrap">GBT <span className="amount">{formatWhole(preview.gbt)}</span></span> · <span className="whitespace-nowrap">Total tax <span className="amount">{formatWhole(preview.total)}</span></span>.</>
          : "Each rate must be a percentage between 0 and 100, with at most two decimals."}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={pending} disabled={!preview || note.trim().length < 5}>
          Record new rates
        </Button>
        {/* A disabled control says why — a greyed button with no reason reads as a broken console. */}
        {!pending && (!preview || note.trim().length < 5) && (
          <span className="text-body-sm text-text-tertiary" aria-live="polite">
            {!preview ? "Enter each rate as a percentage to record it." : "Write why the rates change (at least 5 characters) to record them."}
          </span>
        )}
      </div>
    </form>
  );
}
