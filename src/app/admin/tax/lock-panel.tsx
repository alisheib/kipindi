"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/input";
import { useDeferredToast } from "@/components/ui/toast";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { formatCents } from "@/lib/tax-report";
import { lockTaxPeriodAction, unlockTaxPeriodAction } from "./actions";

/**
 * Lock and reopen a reporting period (`docs/TAX-REPORT.md` §6). The page decides WHAT may happen
 * (finished, balanced, locked) and passes it here; this component only asks the officer to
 * confirm, and the server action decides again from the books — the page's verdict is a
 * courtesy, never the authority.
 *
 *   · Lock — Finance or the Owner, on a finished, balanced period. Typed confirmation.
 *   · Lock with exceptions acknowledged — the Owner alone, out of balance, with a written reason.
 *   · Reopen — the Owner alone, with a written reason. The lock's row stays; the history keeps it.
 */
export function TaxLockPanel({
  fields,
  seen,
  periodLabel,
  state,
  isOwner,
  lockId,
  differenceCents,
  differenceIsWholeBook,
}: {
  /** Hidden fields naming the period and product, exactly as the page's own links do. */
  fields: Record<string, string>;
  /** The fingerprint of everything on screen (`seenFingerprint`) — the server refuses a lock whose recompute differs. */
  seen: string;
  periodLabel: string;
  /** What the page found: lockable now, blocked out of balance, or already locked. */
  state: "ready" | "out-of-balance" | "locked";
  isOwner: boolean;
  lockId: string | null;
  /** "TZS −19,999" — the difference an out-of-balance lock acknowledges. */
  differenceCents: number;
  /** The difference is the whole book's (this product balances on its own). */
  differenceIsWholeBook: boolean;
}) {
  const mayAct = useMayAct();
  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const [note, setNote] = useState("");
  const [ack, setAck] = useState("");
  const [reason, setReason] = useState("");
  const [asking, setAsking] = useState<"lock" | "ack" | "unlock" | null>(null);

  const formData = (extra: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ ...fields, ...extra })) fd.set(k, v);
    fd.set("seen", seen);
    return fd;
  };

  const submit = (kind: "lock" | "ack" | "unlock") => {
    setAsking(null);
    start(async () => {
      const r = kind === "unlock"
        ? await runAdminAction(() => unlockTaxPeriodAction(formData({ lockId: lockId ?? "", reason })))
        : await runAdminAction(() => lockTaxPeriodAction(formData(kind === "ack" ? { acknowledge: ack } : { note })));
      if (!r.ok) {
        toast({ title: kind === "unlock" ? "Couldn't reopen the period" : "Couldn't lock the period", description: r.error, variant: "danger" });
        // The page re-reads the books at once: after "the books changed" it must not go on showing the old figures
        // beside a green "Ready to lock" (measured 2026-10-03).
        router.refresh();
        if ("field" in r && r.field) focusFirstInvalid(document.body, [r.field]);
        return;
      }
      setNote(""); setAck(""); setReason("");
      router.refresh();
      const unrecorded = "recorded" in r && r.recorded === false;
      deferToast({
        title: kind === "unlock" ? "Period reopened" : "Period locked",
        description: unrecorded
          ? "Saved — but the audit log could not record it. Tell an engineer."
          : kind === "unlock" ? `${periodLabel} can be locked again once it is ready.` : `${periodLabel} is frozen exactly as shown.`,
        variant: unrecorded ? "danger" : "success",
      });
    });
  };

  // ⛔ BELOW EVERY HOOK (act-gate.tsx): a role with accounting VIEW and no ACT reads the card, and acts on nothing.
  if (!mayAct) return <ActReadOnly note="Locking a period needs Finance or the Owner." />;

  if (state === "locked") {
    if (!isOwner) return <p className="text-body-sm text-text-subtle">Only the Owner can reopen a locked period.</p>;
    return (
      <div className="space-y-3">
        <Field label="Why reopen it?" hint="Kept with the lock's history and in the audit log. At least 10 characters." dataField="tax-unlock-reason">
          <Textarea value={reason} onChange={(e) => setReason(e.currentTarget.value)} rows={2} maxLength={500} placeholder="e.g. A late settlement correction changed the figures; refiling." />
        </Field>
        <Button type="button" variant="ghost" size="sm" className="rounded-pill" loading={pending} disabled={reason.trim().length < 10} onClick={() => setAsking("unlock")} leading={<I.unlock s={14} aria-hidden />} data-testid="tax-unlock">
          Reopen period
        </Button>
        <ConfirmModal
          open={asking === "unlock"}
          onClose={() => setAsking(null)}
          onConfirm={() => submit("unlock")}
          eyebrow="Tax report"
          title={`Reopen ${periodLabel}?`}
          body="The locked figures stay on record with this reason. The page then shows the live books again until the period is locked anew."
          confirmLabel="Reopen"
          cancelLabel="Cancel"
          tone="warning"
          tier="hard"
          typedWord="REOPEN"
          maxWidth={460}
          loading={pending}
        />
      </div>
    );
  }

  if (state === "out-of-balance") {
    if (!isOwner) return <p className="text-body-sm text-text-subtle">Sign-off is blocked until the exceptions are resolved. The Owner can lock the period with the exceptions acknowledged.</p>;
    return (
      <div className="space-y-3">
        <Field label="Why lock it out of balance?" hint={<>The difference is <span className="amount">TZS {formatCents(differenceCents)}</span>{differenceIsWholeBook ? " (the whole book)" : ""}. Printed on every export of this period. At least 10 characters.</>} dataField="tax-acknowledge">
          <Textarea value={ack} onChange={(e) => setAck(e.currentTarget.value)} rows={3} maxLength={500} placeholder="e.g. A test round from before launch; filed with it noted." />
        </Field>
        <Button type="button" variant="ghost" size="sm" className="rounded-pill" loading={pending} disabled={ack.trim().length < 10} onClick={() => setAsking("ack")} leading={<I.lock s={14} aria-hidden />} data-testid="tax-lock-ack">
          Lock with exceptions acknowledged
        </Button>
        <ConfirmModal
          open={asking === "ack"}
          onClose={() => setAsking(null)}
          onConfirm={() => submit("ack")}
          eyebrow="Tax report"
          title={`Lock ${periodLabel} out of balance?`}
          body={`The figures are frozen as shown, with the TZS ${formatCents(differenceCents)}${differenceIsWholeBook ? " (whole book)" : ""} difference and your reason printed on every export.`}
          confirmLabel="Lock"
          cancelLabel="Cancel"
          tone="warning"
          tier="hard"
          typedWord="LOCK"
          maxWidth={460}
          loading={pending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field label="Note (optional)" hint="Kept with the lock — e.g. the filing reference you receive from TRA or GBT.">
        <Textarea value={note} onChange={(e) => setNote(e.currentTarget.value)} rows={2} maxLength={500} />
      </Field>
      <Button type="button" variant="primary" size="sm" className="rounded-pill" loading={pending} onClick={() => setAsking("lock")} leading={<I.lock s={14} aria-hidden />} data-testid="tax-lock">
        Lock period
      </Button>
      <ConfirmModal
        open={asking === "lock"}
        onClose={() => setAsking(null)}
        onConfirm={() => submit("lock")}
        eyebrow="Tax report"
        title={`Lock ${periodLabel}?`}
        body="The figures are frozen exactly as shown, and every export of this period will carry them. Only the Owner can reopen it."
        confirmLabel="Lock"
        cancelLabel="Cancel"
        tone="brand"
        tier="hard"
        typedWord="LOCK"
        maxWidth={460}
        loading={pending}
      />
    </div>
  );
}
