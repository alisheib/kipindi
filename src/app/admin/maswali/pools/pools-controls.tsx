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
import { sunsetChoices, sunsetConfirmText, validGuaranteeDraft, type SunsetCandidate } from "@/lib/maswali-admin-form-validation";
import { MASWALI_LICENCE_REF_MIN, MASWALI_LICENCE_REF_MAX, MASWALI_REASON_MIN, MASWALI_REASON_MAX,
  licenceRefLengthOk, reasonLengthOk } from "@/lib/maswali-ceremony-bounds";
import {
  fundMaswaliGuaranteeAction, releaseMaswaliSettlementAction, returnMaswaliGuaranteeAction, setMaswaliLicenceBasisAction,
  setMillioneaRolloutAction, sunsetMaswaliAction,
} from "./actions";

const FUND_WORD = "FUND GUARANTEE";
const RETURN_WORD = "RETURN GUARANTEE";
const SUNSET_WORD = "SUNSET MILLIONEA";

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string; note?: string }>, after?: () => void) => {
    setError(null); setNote(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) { setError(r.error ?? "That did not go through."); return; }
      setNote(r.note ?? null);
      after?.();
      router.refresh();
    });
  };
  return { pending, error, note, run };
}

const Feedback = ({ error, note }: { error: string | null; note: string | null }) => (
  <>
    {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
    {note && <p role="status" className="text-body-sm text-success">{note}</p>}
  </>
);

export function ReleaseControl({ weekId, code, digest }: { weekId: string; code: string; digest: string }) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [open, setOpen] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  return (
    <div className="space-y-1">
      <Button size="xs" disabled={pending} onClick={() => setOpen(true)}>Release {code}</Button>
      <Feedback error={error} note={note} />
      <ConfirmModal open={open} onClose={() => setOpen(false)} loading={pending} tone="brand" tier="hard" typedWord="RELEASE"
        title={`Release ${code}?`} confirmLabel="Release the settlement"
        body="The release pays exactly the figures above, in one transaction. If anything changed since they were prepared, it refuses and you read the new figures first."
        onConfirm={() => run(() => releaseMaswaliSettlementAction(fd({ weekId, digest })), () => setOpen(false))} />
    </div>
  );
}

export function GuaranteeCeremony({ canFund, canReturn }: { canFund: boolean; canReturn: boolean }) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [mode, setMode] = useState<"fund" | "return" | null>(null);
  if (!mayAct) return <ActReadOnly />;
  const word = mode === "return" ? RETURN_WORD : FUND_WORD;
  const ready = validGuaranteeDraft(amount, reference);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount (TZS)" required hint="A whole number above zero"><Input size="sm" inputMode="numeric" grouped value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} /></Field>
        <Field label="Bank or rail reference" required hint="5–120 characters from the bank or payment rail"><Input size="sm" maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
      </div>
      <div className="flex gap-2 flex-wrap">
        {canFund && <Button size="sm" disabled={pending || !ready} onClick={() => setMode("fund")}>Pay in</Button>}
        {canReturn && <Button size="sm" variant="ghost" disabled={pending || !ready} onClick={() => setMode("return")}>Take back</Button>}
      </div>
      <Feedback error={error} note={note} />
      <UnsavedChangesGuard dirty={amount !== "" || reference.trim() !== ""} body="A guarantee movement has been typed but not recorded. Leaving now discards it." />
      <ConfirmModal open={mode !== null} onClose={() => setMode(null)} loading={pending} tone={mode === "return" ? "warning" : "brand"} tier="hard" typedWord={word}
        title={mode === "return" ? "Take guarantee money back?" : "Pay into the guarantee?"} confirmLabel={mode === "return" ? "Take it back" : "Pay it in"}
        body={mode === "return"
          ? "Never below what the unsettled weeks need (OD-02); the service refuses a return that would leave the floor unbacked."
          : "Owner capital paid in to back the floor. It is the owner's money, committed: it never counts as retained earnings."}
        onConfirm={() => run(() => (mode === "return" ? returnMaswaliGuaranteeAction : fundMaswaliGuaranteeAction)(fd({ amount, reference, typed: word })), () => { setMode(null); setAmount(""); setReference(""); })} />
    </div>
  );
}

export function LicenceCeremony() {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [kind, setKind] = useState("OWNER_RULING");
  const [ref, setRef] = useState("");
  const [open, setOpen] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  return (
    <div className="space-y-3">
      <Field label="Basis"><Select size="sm" value={kind} onChange={setKind} ariaLabel="Licence basis"
        options={[{ value: "OWNER_RULING", label: "The Owner's dated ruling" }, { value: "GBT_WRITTEN", label: "The Gaming Board's letter" }, { value: "NONE", label: "None (withdraw it)" }]} /></Field>
      {kind !== "NONE" && <Field label="Where it is kept" hint={`${MASWALI_LICENCE_REF_MIN}–${MASWALI_LICENCE_REF_MAX} characters after spaces are folded.`}>
        <Textarea rows={2} maxLength={MASWALI_LICENCE_REF_MAX} value={ref} onChange={(e) => setRef(e.target.value)} />
      </Field>}
      <Button size="sm" disabled={pending || (kind !== "NONE" && !licenceRefLengthOk(ref))} onClick={() => setOpen(true)}>Record</Button>
      <Feedback error={error} note={note} />
      <UnsavedChangesGuard dirty={ref.trim() !== ""} body="A licence basis has been typed but not recorded. Leaving now discards it." />
      <ConfirmModal open={open} onClose={() => setOpen(false)} loading={pending} tone="brand" tier="hard" typedWord="RECORD"
        title="Record the licence basis?" confirmLabel="Record it"
        body={kind === "NONE" ? "No week can open while no basis is recorded." : "Weeks can open once this is recorded and the guarantee covers them."}
        onConfirm={() => run(() => setMaswaliLicenceBasisAction(fd({ kind, ref })), () => { setOpen(false); setRef(""); })} />
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
      <Field label="Visible to"><Select size="sm" value={cap} onChange={setCap} ariaLabel="Rollout"
        options={[{ value: "WITHDRAWN", label: "Nobody (withdrawn)" }, { value: "STAFF_PREVIEW", label: "Staff preview" }, { value: "ACTIVE", label: "Everyone" }]} /></Field>
      <Field label="Why" hint={`${MASWALI_REASON_MIN}–${MASWALI_REASON_MAX} characters.`}><Textarea rows={2} maxLength={MASWALI_REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <Button size="sm" disabled={pending || cap === current || !reasonLengthOk(reason)} onClick={() => setOpen(true)}>Move the switch</Button>
      <Feedback error={error} note={note} />
      <UnsavedChangesGuard dirty={cap !== current || reason.trim() !== ""} body="A rollout change has been chosen but not made. Leaving now discards it." />
      <ConfirmModal open={open} onClose={() => setOpen(false)} loading={pending} tone="warning" tier="hard" typedWord={cap}
        title={`Set Millionea to ${cap}?`} confirmLabel="Move it"
        body="The environment's ceiling still applies: the effective state is the lower of the two."
        onConfirm={() => run(() => setMillioneaRolloutAction(fd({ cap, reason, expectSeq: String(expectSeq) })), () => { setOpen(false); setReason(""); })} />
    </div>
  );
}

export function SunsetCeremony({ weeks }: { weeks: SunsetCandidate[] }) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [weekId, setWeekId] = useState("");
  const [lookup, setLookup] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  if (weeks.length === 0) return <p className="text-body-sm text-text-secondary">No public week can be made final now.</p>;
  const choices = sunsetChoices(weeks, lookup);
  const selected = weeks.find((week) => week.id === weekId) ?? null;
  const review = selected ? sunsetConfirmText(selected) : null;
  return (
    <div className="space-y-3">
      {choices.needsLookup && <Field label="Find the final week by code" hint={`Search all ${weeks.length} eligible public weeks before choosing.`}>
        <Input size="sm" value={lookup} maxLength={32} onChange={(event) => { setLookup(event.target.value); setWeekId(""); setOpen(false); }} placeholder="MLN-2026-W01" />
      </Field>}
      {choices.needsLookup && lookup.trim() && <p role="status" className="text-body-sm text-text-secondary">
        {choices.total === 0 ? "No eligible week matches that code." : choices.total > choices.rows.length
          ? `${choices.total} matching weeks; showing the first ${choices.rows.length}. Refine the code to find the right week.`
          : `${choices.total} matching ${choices.total === 1 ? "week" : "weeks"}.`}
      </p>}
      <Field label="The final week" hint="Choose the exact week before confirming."><Select size="sm" value={weekId} onChange={setWeekId} ariaLabel="Final week"
        placeholder="Choose an eligible week" disabled={choices.rows.length === 0}
        options={choices.rows.map((week) => ({ value: week.id, label: `${week.code} · ${week.state.toLowerCase()}` }))} /></Field>
      <Field label="Why Millionea is stopping" hint={`${MASWALI_REASON_MIN}–${MASWALI_REASON_MAX} characters.`}><Textarea rows={2} maxLength={MASWALI_REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <Button size="sm" variant="claret" disabled={pending || !selected || !reasonLengthOk(reason)} onClick={() => setOpen(true)}>Make it the final week</Button>
      <Feedback error={error} note={note} />
      <UnsavedChangesGuard dirty={weekId !== "" || lookup.trim() !== "" || reason.trim() !== ""} body="A final week has been chosen but not recorded. Leaving now discards it." />
      <ConfirmModal open={open && !!selected} onClose={() => setOpen(false)} loading={pending} tone="claret" tier="hard" typedWord={SUNSET_WORD}
        title={review?.title ?? "Choose a final week"} confirmLabel="Make it final"
        body={review?.body ?? "Choose the exact eligible week before confirming."}
        onConfirm={() => {
          if (!selected || !reasonLengthOk(reason)) return;
          run(() => sunsetMaswaliAction(fd({ weekId: selected.id, reason, typed: SUNSET_WORD })), () => { setOpen(false); setWeekId(""); setLookup(""); setReason(""); });
        }} />
    </div>
  );
}
