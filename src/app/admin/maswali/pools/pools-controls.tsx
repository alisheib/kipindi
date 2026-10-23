"use client";

/**
 * The pools page's acts (MASWALI-BUILD S4): accounting's release, and the Owner's four ceremonies.
 * ⭐ Every one is a typed confirmation in the kit dialog (S4 item 6). The words the services check are their own
 *    constants (`FUND GUARANTEE`, `RETURN GUARANTEE`, `SUNSET MILLIONEA`); the dialog arms on the same words.
 * ⛔ The page renders these only for a role the action accepts; otherwise it shows the control locked.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmModal } from "@/components/ui/modal";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { guaranteeReviewDraft, licenceReviewDraft, sunsetChoices, sunsetConfirmText, validGuaranteeDraft,
  type GuaranteeReview, type LicenceReview, type SunsetCandidate } from "@/lib/maswali-admin-form-validation";
import { formatTzs } from "@/lib/utils";
import { MASWALI_LICENCE_REF_MIN, MASWALI_LICENCE_REF_MAX, MASWALI_REASON_MIN, MASWALI_REASON_MAX,
  licenceRefLengthOk, reasonLengthOk } from "@/lib/maswali-ceremony-bounds";
import {
  fundMaswaliGuaranteeAction, releaseMaswaliSettlementAction, returnMaswaliGuaranteeAction, setMaswaliLicenceBasisAction,
  setMillioneaRolloutAction, sunsetMaswaliAction,
} from "./actions";
import { raiseAuditWarning } from "../audit-warning";

const FUND_WORD = "FUND GUARANTEE";
const RETURN_WORD = "RETURN GUARANTEE";
const SUNSET_WORD = "SUNSET MILLIONEA";

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string; note?: string; auditWarning?: string | null }>, after?: () => void, onWarning?: (warning: string | null) => void) => {
    setError(null); setNote(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) { setError(r.error ?? "That did not go through."); return; }
      setNote(r.note ?? null);
      onWarning?.(r.auditWarning ?? null);
      after?.();
      router.refresh();
    });
  };
  return { pending, error, note, run };
}

/**
 * The page's answer to the last act. ⛔ While a confirmation is open its refusal shows INSIDE the dialog (`DialogError`),
 * never a second copy under the scrim, outside the dialog's own tree (S5 review A2: every refusal states its reason where
 * the officer is reading).
 */
const Feedback = ({ error, note, dialogOpen }: { error: string | null; note: string | null; dialogOpen: boolean }) => (
  <>
    {!dialogOpen && error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
    {note && <p role="status" className="text-body-sm text-success">{note}</p>}
  </>
);
const DialogError = ({ error }: { error: string | null }) => (error ? <p role="alert" className="text-body-sm text-danger-fg">{error}</p> : null);

export function ReleaseControl({ weekId, code, digest }: { weekId: string; code: string; digest: string }) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [open, setOpen] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  return (
    <div className="space-y-1">
      <Button size="sm" disabled={pending} onClick={() => setOpen(true)}>Release {code}</Button>
      <Feedback error={error} note={note} dialogOpen={open} />
      <ConfirmModal open={open} onClose={() => setOpen(false)} loading={pending} tone="brand" tier="hard" typedWord="RELEASE"
        title={`Release ${code}?`} confirmLabel="Release the settlement"
        body={<div className="space-y-2">
          <p>The release pays exactly the figures above, in one transaction. If anything changed since they were prepared, it refuses and you read the new figures first.</p>
          <DialogError error={error} />
        </div>}
        onConfirm={() => run(() => releaseMaswaliSettlementAction(fd({ weekId, digest })), () => setOpen(false))} />
    </div>
  );
}

export function GuaranteeCeremony({ canFund, canReturn }: { canFund: boolean; canReturn: boolean }) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [review, setReview] = useState<GuaranteeReview | null>(null);
  if (!mayAct) return <ActReadOnly />;
  const word = review?.mode === "return" ? RETURN_WORD : FUND_WORD;
  const ready = validGuaranteeDraft(amount, reference);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount (TZS)" required hint="A whole number above zero"><Input size="md" inputMode="numeric" grouped value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} /></Field>
        <Field label="Bank or rail reference" required hint="5–120 characters from the bank or payment rail"><Input size="md" maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
      </div>
      <div className="flex gap-2 flex-wrap">
        {canFund && <Button size="sm" disabled={pending || !ready} onClick={() => setReview(guaranteeReviewDraft("fund", amount, reference))}>Pay in</Button>}
        {canReturn && <Button size="sm" variant="ghost" disabled={pending || !ready} onClick={() => setReview(guaranteeReviewDraft("return", amount, reference))}>Take back</Button>}
      </div>
      <Feedback error={error} note={note} dialogOpen={review !== null} />
      <UnsavedChangesGuard dirty={amount !== "" || reference.trim() !== ""} body="A guarantee movement has been typed but not recorded. Leaving now discards it." />
      <ConfirmModal open={review !== null} onClose={() => setReview(null)} loading={pending} tone={review?.mode === "return" ? "warning" : "brand"} tier="hard" typedWord={word}
        title={review?.mode === "return" ? "Take guarantee money back?" : "Pay into the guarantee?"} confirmLabel={review?.mode === "return" ? "Take it back" : "Pay it in"}
        body={<div className="space-y-2">
          <p>Amount: <strong>{review ? formatTzs(Number(review.amount)) : ""}</strong></p>
          <p>Bank or rail reference: <strong className="block break-words">{review?.reference}</strong></p>
          <p>{review?.mode === "return"
            ? "Never below what the unsettled weeks need (OD-02); the service refuses a return that would leave the floor unbacked."
            : "Owner capital paid in to back the floor. It is the owner's money, committed: it never counts as retained earnings."}</p>
          <DialogError error={error} />
        </div>}
        onConfirm={() => {
          if (!review || !validGuaranteeDraft(review.amount, review.reference)) return;
          run(() => (review.mode === "return" ? returnMaswaliGuaranteeAction : fundMaswaliGuaranteeAction)(
            fd({ amount: review.amount, reference: review.reference, typed: word })),
          () => { setReview(null); setAmount(""); setReference(""); });
        }} />
    </div>
  );
}

export function LicenceCeremony() {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [kind, setKind] = useState("OWNER_RULING");
  const [savedKind, setSavedKind] = useState("OWNER_RULING");
  const [ref, setRef] = useState("");
  const [review, setReview] = useState<LicenceReview | null>(null);
  if (!mayAct) return <ActReadOnly />;
  return (
    <div className="space-y-3">
      <Field label="Basis"><Select size="md" value={kind} onChange={setKind} ariaLabel="Licence basis"
        options={[{ value: "OWNER_RULING", label: "The Owner's dated ruling" }, { value: "GBT_WRITTEN", label: "The Gaming Board's letter" }, { value: "NONE", label: "None (withdraw it)" }]} /></Field>
      {kind !== "NONE" && <Field label="Where it is kept" hint={`${MASWALI_LICENCE_REF_MIN}–${MASWALI_LICENCE_REF_MAX} characters after spaces are folded.`}>
        <Textarea rows={2} maxLength={MASWALI_LICENCE_REF_MAX} value={ref} onChange={(e) => setRef(e.target.value)} />
      </Field>}
      <Button size="sm" disabled={pending || (kind !== "NONE" && !licenceRefLengthOk(ref))} onClick={() => setReview(licenceReviewDraft(kind, ref))}>Record</Button>
      <Feedback error={error} note={note} dialogOpen={review !== null} />
      <UnsavedChangesGuard dirty={kind !== savedKind || ref.trim() !== ""} body="A licence basis has been chosen but not recorded. Leaving now discards it." />
      <ConfirmModal open={review !== null} onClose={() => setReview(null)} loading={pending} tone="brand" tier="hard" typedWord="RECORD"
        title="Record the licence basis?" confirmLabel="Record it"
        body={<div className="space-y-2">
          <p>Basis: <strong>{review?.label}</strong></p>
          {review?.kind !== "NONE" && <p>Where it is kept: <strong className="block break-words">{review?.ref}</strong></p>}
          <p>{review?.kind === "NONE" ? "No week can open while None is recorded; the ruling of 23 October 2026 does not override it." : "This becomes the basis in force; weeks can open on it once the guarantee covers them."}</p>
          <DialogError error={error} />
        </div>}
        onConfirm={() => {
          if (!review || !licenceReviewDraft(review.kind, review.ref)) return;
          run(() => setMaswaliLicenceBasisAction(fd({ kind: review.kind, ref: review.ref })), () => { setSavedKind(review.kind); setReview(null); setRef(""); });
        }} />
    </div>
  );
}

export function RolloutCeremony({ expectSeq, current }: { expectSeq: number; current: string }) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [cap, setCap] = useState(current);
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  return (
    <div className="space-y-3">
      <Field label="Visible to"><Select size="md" value={cap} onChange={setCap} ariaLabel="Rollout"
        options={[{ value: "WITHDRAWN", label: "Nobody (withdrawn)" }, { value: "STAFF_PREVIEW", label: "Staff preview" }, { value: "ACTIVE", label: "Everyone" }]} /></Field>
      <Field label="Why" hint={`${MASWALI_REASON_MIN}–${MASWALI_REASON_MAX} characters.`}><Textarea rows={2} maxLength={MASWALI_REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <Button size="sm" disabled={pending || cap === current || !reasonLengthOk(reason)} onClick={() => setOpen(true)}>Move the switch</Button>
      <Feedback error={error} note={note} dialogOpen={open} />
      <UnsavedChangesGuard dirty={cap !== current || reason.trim() !== ""} body="A rollout change has been chosen but not made. Leaving now discards it." />
      <ConfirmModal open={open} onClose={() => setOpen(false)} loading={pending} tone="warning" tier="hard" typedWord={cap}
        title={`Set Millionea to ${cap}?`} confirmLabel="Move it"
        body={<div className="space-y-2">
          <p>The environment&apos;s ceiling still applies: the effective state is the lower of the two.</p>
          <DialogError error={error} />
        </div>}
        onConfirm={() => run(() => setMillioneaRolloutAction(fd({ cap, reason, expectSeq: String(expectSeq) })), () => { setOpen(false); setReason(""); })} />
    </div>
  );
}

/**
 * The Owner's stop. `nextAct` is the console's reading of the Owner's next act (`consoleStanding().stopNextAct`): with no
 * week to offer — none on sale, a week being decided, no draft — the control names it (S7-F4), or says it is unknown.
 */
export function SunsetCeremony({ weeks, nextAct }: { weeks: SunsetCandidate[]; nextAct: string | null }) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [weekId, setWeekId] = useState("");
  const [lookup, setLookup] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  if (weeks.length === 0) {
    return <p className="text-body-sm text-text-secondary">{nextAct ?? "No week can be made final now, and the next step could not be read. Reload the page."}</p>;
  }
  const choices = sunsetChoices(weeks, lookup);
  const selected = weeks.find((week) => week.id === weekId) ?? null;
  const review = selected ? sunsetConfirmText(selected) : null;
  return (
    <div className="space-y-3">
      {choices.needsLookup && <Field label="Find the final week by code" hint={`Search all ${weeks.length} eligible public weeks before choosing.`}>
        <Input size="md" value={lookup} maxLength={32} onChange={(event) => { setLookup(event.target.value); setWeekId(""); setOpen(false); }} placeholder="MLN-2026-W01" />
      </Field>}
      {choices.needsLookup && lookup.trim() && <p role="status" className="text-body-sm text-text-secondary">
        {choices.total === 0 ? "No eligible week matches that code." : choices.total > choices.rows.length
          ? `${choices.total} matching weeks; showing the first ${choices.rows.length}. Refine the code to find the right week.`
          : `${choices.total} matching ${choices.total === 1 ? "week" : "weeks"}.`}
      </p>}
      <Field label="The final week" hint="Choose the exact week before confirming."><Select size="md" value={weekId} onChange={setWeekId} ariaLabel="Final week"
        placeholder="Choose an eligible week" disabled={choices.rows.length === 0}
        options={choices.rows.map((week) => ({ value: week.id, label: `${week.code} · ${week.state.toLowerCase()}` }))} /></Field>
      <Field label="Why Millionea is stopping" hint={`${MASWALI_REASON_MIN}–${MASWALI_REASON_MAX} characters.`}><Textarea rows={2} maxLength={MASWALI_REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <Button size="sm" variant="claret" disabled={pending || !selected || !reasonLengthOk(reason)} onClick={() => setOpen(true)}>Make it the final week</Button>
      <Feedback error={error} note={note} dialogOpen={open && !!selected} />
      <UnsavedChangesGuard dirty={weekId !== "" || lookup.trim() !== "" || reason.trim() !== ""} body="A final week has been chosen but not recorded. Leaving now discards it." />
      <ConfirmModal open={open && !!selected} onClose={() => setOpen(false)} loading={pending} tone="claret" tier="hard" typedWord={SUNSET_WORD}
        title={review?.title ?? "Choose a final week"} confirmLabel="Make it final"
        body={<div className="space-y-2">
          <p>{review?.body ?? "Choose the exact eligible week before confirming."}</p>
          <DialogError error={error} />
        </div>}
        onConfirm={() => {
          if (!selected || !reasonLengthOk(reason)) return;
          run(() => sunsetMaswaliAction(fd({ weekId: selected.id, reason, typed: SUNSET_WORD })), () => { setOpen(false); setWeekId(""); setLookup(""); setReason(""); },
            (warning) => raiseAuditWarning("pools:stop", warning));
        }} />
    </div>
  );
}
