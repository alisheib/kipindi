"use client";

/**
 * The decision rail — sticky-right at console width, above the fold. One officer decides;
 * ⛔ no two-officer lock (a dated owner decision, `test:two-admin` asserts its absence); the
 * self-review block and, on an invited application, the invitee's acceptance are the controls.
 *
 * ⭐ EVERY DISABLED ACTION SAYS WHY. The server computed the preconditions once
 * (`approveBlocks`, `fee.whyNoReconcile`); this component only renders them. A mute button on
 * a money page is the defect, not a style.
 *
 * Every mutation → `runAdminAction` → `ActionOverlay` (running / success / error), never a
 * vanishing toast for a role grant. The rate field is the shared numeric `Input`, gold + mono,
 * validated against the config ceiling on both ends.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { AGENT_INVITATION_STATUS } from "@/lib/admin-status-lexicon";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { formatTzs, formatDateShort } from "@/lib/utils";
import type { AgentDocType, AgentRejectReason, AgentFeeDisposition } from "@/lib/server/store";
import {
  approveAgentAction, rejectApplicationAction, requestMoreInfoAction, reconcileFeeAction, waiveFeeAction, recordFeeRefundAction,
  setAgentRateAction, deactivateAgentAction, reactivateAgentAction, revokeAgentAction, revokeInvitationAction,
} from "../actions";

export type RailState = {
  applicationId: string;
  userId: string;
  status: string;
  source: "SELF_SERVICE" | "OFFICER_INVITED";
  approveBlocks: string[];
  canDecide: boolean;
  canRequestInfo: boolean;
  fee: {
    disposition: AgentFeeDisposition; expectedTzs: number; reference: string | null; attestedTzs: number | null; statementRef: string | null;
    reconciledAt: string | null; waivedAt: string | null; waiverReason: string | null; refundDueAt: string | null; refundedAt: string | null; refundReference: string | null; sourceAccount: string | null;
    canReconcile: boolean; canWaive: boolean; canRefund: boolean; whyNoReconcile: string | null;
  };
  defaultRatePct: number;
  maxRatePct: number;
  docSlots: { value: AgentDocType; label: string }[];
  kycStatus: string | null;
  /** ⛔ THE REAL UNION, not `string`. The loose type is why this panel reached for
   *  `status.toLowerCase()` instead of the lexicon: a widened enum cannot index the label
   *  map, so the display fell back to printing the raw value. */
  invitation: { id: string; status: keyof typeof AGENT_INVITATION_STATUS; expiresAt: string } | null;
  agent: { code: string; commissionPct: number | null; active: boolean } | null;
};

const REJECT_OPTIONS: { value: AgentRejectReason; label: string }[] = [
  { value: "INCOMPLETE_DOCUMENTS", label: "Incomplete documents" },
  { value: "DOCUMENT_NOT_LEGIBLE", label: "Document not legible" },
  { value: "UNSATISFACTORY_REFEREE", label: "Unsatisfactory referee" },
  { value: "DETAILS_MISMATCH", label: "Details mismatch" },
  { value: "FEE_NOT_RECONCILED", label: "Fee could not be reconciled" },
  { value: "STAFF_CONFLICT", label: "Staff conflict" },
  { value: "OTHER", label: "Other (note required)" },
  { value: "SANCTIONED", label: "Sanctioned · FINAL" },
  { value: "IDENTITY_MISMATCH", label: "Identity mismatch · FINAL" },
  { value: "FRAUD", label: "Fraud · FINAL" },
];

export function DecisionRail({ state }: { state: RailState }) {
  const mayAct = useMayAct();
  const router = useRouter();
  const ov = useActionOverlay();
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLDivElement>(null);
  const [field, setField] = useState<{ name: string; message: string } | null>(null);
  /** ⭐ Its OWN state, so it cannot be confused with the applicant-facing info-request note. */
  const [withdrawReason, setWithdrawReason] = useState("");

  const [rate, setRate] = useState(String(state.agent?.commissionPct ?? state.defaultRatePct));
  const [rejectReason, setRejectReason] = useState<AgentRejectReason>("INCOMPLETE_DOCUMENTS");
  const [note, setNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [infoSlots, setInfoSlots] = useState<AgentDocType[]>([]);
  // ⛔ Not pre-filled: an attestation that is already the expected figure attests nothing.
  const [attested, setAttested] = useState("");
  const [statementRef, setStatementRef] = useState("");
  const [sourceAccount, setSourceAccount] = useState("");
  const [waiveReason, setWaiveReason] = useState("");
  const [refundRef, setRefundRef] = useState("");
  const [refundAmount, setRefundAmount] = useState(String(state.fee.expectedTzs));
  const [standingReason, setStandingReason] = useState("");
  /** Anything typed and not yet applied — the three exits are guarded by the kit. */
  const dirty = [note, rejectNote, statementRef, sourceAccount, waiveReason, refundRef, standingReason].some((x) => x.trim() !== "")
    || infoSlots.length > 0 || rate !== String(state.agent?.commissionPct ?? state.defaultRatePct)
    || attested !== "" || refundAmount !== String(state.fee.expectedTzs);

  const run = (label: string, fn: () => Promise<{ ok: true } | { ok: false; error: string; field?: string }>, onOk: string) => {
    start(async () => {
      ov.run(label);
      const r = await runAdminAction(fn);
      if (!r.ok) { ov.fail("Not applied", r.error); setField(r.field ? { name: r.field, message: r.error } : null); if (r.field) focusFirstInvalid(formRef.current, [r.field]); return; }
      setField(null);
      ov.succeed(onOk);
      router.refresh();
    });
  };
  const fd = (pairs: Record<string, string | string[]>) => {
    const f = new FormData();
    f.set("applicationId", state.applicationId); f.set("userId", state.userId);
    for (const [k, v] of Object.entries(pairs)) { if (Array.isArray(v)) v.forEach((x) => f.append(k, x)); else f.set(k, v); }
    return f;
  };
  const err = (name: string) => (field?.name === name ? field.message : undefined);

  const isAgent = !!state.agent;
  const approveDisabled = !mayAct || pending || state.approveBlocks.length > 0;

  return (
    <div ref={formRef} className="rounded-xl border border-border bg-bg-elevated/70 p-4 space-y-4">
      <ActionOverlay state={ov.state} onDismiss={ov.dismiss} />
      <UnsavedChangesGuard dirty={dirty} body="A decision, reason or reference has been typed on this application but not applied. Leaving now discards it." />
      <div className="flex items-center justify-between">
        <p className="font-display text-title-sm font-bold">Decision</p>
        {!mayAct && <ActReadOnly />}
      </div>

      {/* ── APPROVED AGENT: standing controls ── */}
      {isAgent && state.agent && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-body-sm text-text">{state.agent.code}</span>
            <Chip variant={state.agent.active ? "success" : "warning"}>{state.agent.active ? "Active" : "Deactivated"}</Chip>
          </div>
          <Field label="Commission rate (% of net fee)" hint={`Ceiling ${state.maxRatePct}% — RULES.md §2.10`} error={err("commissionPct")} dataField="commissionPct">
            <Input mono inputMode="decimal" name="commissionPct" value={rate} onChange={(e) => setRate(e.target.value)} prefix="%" className="text-gold-300" disabled={!mayAct} />
          </Field>
          <Field label="Reason" error={err("reason")} dataField="reason">
            <Input name="reason" value={standingReason} onChange={(e) => setStandingReason(e.target.value)} maxLength={300} disabled={!mayAct} />
          </Field>
          <div className="grid grid-cols-1 gap-2">
            <Button variant="primary" size="md" disabled={!mayAct || pending} loading={pending} onClick={() => run("Changing rate…", () => setAgentRateAction(fd({ commissionPct: rate, reason: standingReason })), "Rate changed. It prices future accruals only.")}>Change rate</Button>
            {state.agent.active ? (
              <ConfirmDialog tone="warning" title="Pause this agent?" body="Their code stops recruiting and no new commission accrues. Commission already paid stays. Reversible."
                confirmLabel="Deactivate" cancelLabel="Keep active" onConfirm={() => run("Deactivating…", () => deactivateAgentAction(fd({ reason: standingReason })), "Agent deactivated.")}
                trigger={<Button variant="ghost" size="md" disabled={!mayAct || pending}>Deactivate</Button>} />
            ) : (
              <Button variant="primary" size="md" disabled={!mayAct || pending} onClick={() => run("Reactivating…", () => reactivateAgentAction(fd({ reason: standingReason })), "Agent reactivated.")}>Reactivate</Button>
            )}
            <ConfirmDialog tone="claret" title="End this partnership?" body="The application becomes REVOKED, the account returns to PLAYER and every session is signed out. The person may apply again later. Commission already paid stays."
              confirmLabel="Revoke" cancelLabel="Cancel" onConfirm={() => run("Revoking…", () => revokeAgentAction(fd({ reason: standingReason })), "Partnership ended.")}
              trigger={<Button variant="danger" size="md" disabled={!mayAct || pending}>Revoke agent status</Button>} />
          </div>
        </div>
      )}

      {/* ── INVITATION ── */}
      {state.invitation && (
        <div className="rounded-md border border-border bg-bg-overlay/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-micro uppercase eyebrow text-text-faint">Invitation</span>
            {/* ⛔ THE LEXICON, NOT `.toLowerCase()`. This printed the raw enum — "issued",
                "revoked" — while every other status on this console reads its word from
                `AGENT_INVITATION_STATUS`. One concept, two vocabularies, is what
                `admin-status-lexicon.ts` exists to prevent. */}
            <Chip variant={state.invitation.status === "ACCEPTED" ? "success" : state.invitation.status === "ISSUED" ? "pending" : "neutral"}>{AGENT_INVITATION_STATUS[state.invitation.status].en}</Chip>
          </div>
          {state.invitation.status === "ISSUED" && (
            <>
              {/* 🔴 THIS REASON HAD NO FIELD OF ITS OWN. It reused `note` — the "Ask for
                  more information" box further down the rail — so an officer who typed a note
                  to the applicant and then withdrew the invitation silently filed that note as
                  the withdrawal reason, in the audit chain, under the wrong action. */}
              <Field label="Reason for withdrawing" hint="Recorded on the invitation and in the audit chain" dataField="withdrawReason">
                <Input value={withdrawReason} onChange={(e) => setWithdrawReason(e.target.value)} maxLength={200} placeholder="Issued to the wrong address" disabled={!mayAct} />
              </Field>
            </>
          )}
          {state.invitation.status === "ISSUED" && (
            <ConfirmDialog tone="warning" title="Withdraw this invitation?" body="The link stops working. The application (if one exists) is closed as declined."
              confirmLabel="Withdraw" cancelLabel="Keep" onConfirm={() => run("Withdrawing…", () => { const f = new FormData(); f.set("invitationId", state.invitation!.id); f.set("reason", withdrawReason.trim() || "withdrawn by officer"); return revokeInvitationAction(f); }, "Invitation withdrawn.")}
              trigger={<Button variant="ghost" size="sm" disabled={!mayAct || pending}>Withdraw invitation</Button>} />
          )}
        </div>
      )}

      {/* ── FEE ── gold: money */}
      {!isAgent && (
        <div className="rounded-md border border-gold-700/60 p-3 space-y-3" style={{ background: "color-mix(in oklab, var(--gold-500) 6%, transparent)" }}>
          <p className="font-mono text-micro uppercase eyebrow font-bold text-gold-300">Fee</p>
          <p className="amount text-body-sm font-bold text-gold-300">{formatTzs(state.fee.expectedTzs)}</p>
          {state.fee.canReconcile ? (
            <>
              <Field label="Amount on the receipt" error={err("attestedTzs")} dataField="attestedTzs" hint="Must equal the fee exactly — a short or over payment is refused">
                <Input mono inputMode="numeric" name="attestedTzs" prefix="TZS" value={attested} onChange={(e) => setAttested(e.target.value)} className="text-gold-300" />
              </Field>
              <Field label="Bank statement line" error={err("statementRef")} dataField="statementRef">
                <Input mono name="statementRef" value={statementRef} onChange={(e) => setStatementRef(e.target.value)} maxLength={80} />
              </Field>
              <Field label="Paid from (masked)" hint="So a refund can only go back the way it came">
                <Input mono name="sourceAccount" value={sourceAccount} onChange={(e) => setSourceAccount(e.target.value)} maxLength={40} placeholder="0769•••877" />
              </Field>
              <Button variant="gold" size="md" disabled={!mayAct || pending} loading={pending} onClick={() => run("Reconciling fee…", () => reconcileFeeAction(fd({ attestedTzs: attested, statementRef, sourceAccount })), "Fee reconciled and booked to the ledger.")}>Reconcile fee</Button>
            </>
          ) : state.fee.whyNoReconcile && state.fee.disposition === "NONE" ? (
            <p className="text-body-sm text-text-muted">{state.fee.whyNoReconcile}</p>
          ) : null}
          {state.fee.canWaive && (
            <>
              <Field label="Waiver reason (audited, ≥ 10 characters)" error={err("waiveReason")} dataField="waiveReason">
                <Input name="waiveReason" value={waiveReason} onChange={(e) => setWaiveReason(e.target.value)} maxLength={300} />
              </Field>
              <ConfirmDialog tone="claret" title="Waive the fee?" body="No fee will be collected for this application. The reason is recorded on the audit chain."
                confirmLabel="Waive" cancelLabel="Cancel" onConfirm={() => run("Waiving fee…", () => waiveFeeAction(fd({ reason: waiveReason })), "Fee waived.")}
                trigger={<Button variant="ghost" size="md" disabled={!mayAct || pending}>Waive fee</Button>} />
            </>
          )}
          {state.fee.canRefund && (
            <>
              <p className="text-body-sm text-warning-500">Refund owed{state.fee.refundDueAt ? ` · due ${formatDateShort(state.fee.refundDueAt)}` : ""} · to {state.fee.sourceAccount ?? "the paying account"}</p>
              <Field label="Refund amount" error={err("refundAmount")} dataField="refundAmount" hint="Exactly the amount collected">
                <Input mono inputMode="numeric" name="refundAmount" prefix="TZS" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="text-gold-300" />
              </Field>
              <Field label="Refund reference" error={err("refundReference")} dataField="refundReference">
                <Input mono name="refundReference" value={refundRef} onChange={(e) => setRefundRef(e.target.value)} maxLength={80} />
              </Field>
              <Button variant="gold" size="md" disabled={!mayAct || pending} loading={pending} onClick={() => run("Recording refund…", () => recordFeeRefundAction(fd({ reference: refundRef, amountTzs: refundAmount })), "Refund recorded and the applicant notified.")}>Record refund</Button>
            </>
          )}
        </div>
      )}

      {/* ── DECISION ── */}
      {!isAgent && (
        <div className="space-y-3">
          <Field label="Commission rate (% of net fee)" hint={`Default ${state.defaultRatePct}% · ceiling ${state.maxRatePct}% (RULES.md §2.10)`} error={err("commissionPct")} dataField="commissionPct">
            <Input mono inputMode="decimal" name="commissionPct" value={rate} onChange={(e) => setRate(e.target.value)} prefix="%" className="text-gold-300" disabled={!mayAct || !state.canDecide} />
          </Field>
          {state.approveBlocks.length > 0 && (
            <ul className="space-y-1 text-body-sm text-text-muted list-disc pl-4">
              {state.approveBlocks.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          )}
          <ConfirmDialog tone="claret" title="Approve this agent?" body={`Grants agent status, mints a 50PICK-AG code and sets the rate to ${rate}% of the net fee.${state.source === "OFFICER_INVITED" && state.kycStatus === "PENDING_REVIEW" ? " The invitee's identity verification is approved in the same step." : ""} Single officer, audited.`}
            confirmLabel="Approve" cancelLabel="Not yet" onConfirm={() => run("Approving…", () => approveAgentAction(fd({ commissionPct: rate })), "Agent approved — code minted, rate set, applicant notified.")}
            trigger={<Button variant="primary" size="lg" fullWidth disabled={approveDisabled} leading={<I.check s={16} />}>Approve</Button>} />

          <div className="rounded-md border border-border bg-bg-overlay/40 p-3 space-y-2">
            <p className="font-mono text-micro uppercase eyebrow text-text-faint">Ask for more information</p>
            <div className="grid grid-cols-2 gap-1">
              {state.docSlots.map((s) => (
                <Checkbox key={s.value} checked={infoSlots.includes(s.value)} onChange={(c) => setInfoSlots((x) => c ? [...x, s.value] : x.filter((v) => v !== s.value))} label={<span className="text-body-sm">{s.label}</span>} />
              ))}
            </div>
            <Field label="Note to the applicant" hint="Sent by email and shown on their status page" error={err("note")} dataField="note">
              <Textarea name="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} disabled={!mayAct || !state.canRequestInfo} />
            </Field>
            <Button variant="primary" size="md" disabled={!mayAct || pending || !state.canRequestInfo} onClick={() => run("Sending request…", () => requestMoreInfoAction(fd({ note, slots: infoSlots })), "Request sent. The application is unlocked for those documents.")}>Request more info</Button>
            {!state.canRequestInfo && <p className="text-body-sm text-text-subtle">Only an application under review can be sent back.</p>}
          </div>

          <div className="rounded-md border border-border bg-bg-overlay/40 p-3 space-y-2">
            <p className="font-mono text-micro uppercase eyebrow text-text-faint">Reject</p>
            <Field label="Reason">
              <Select name="reason" value={rejectReason} onChange={(v: string) => setRejectReason(v as AgentRejectReason)} options={REJECT_OPTIONS} />
            </Field>
            <Field label="Note to the applicant" hint="Required for Other · sent by email and shown on their status page" error={err("rejectNote")} dataField="rejectNote">
              <Textarea name="rejectNote" rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} maxLength={500} disabled={!mayAct || !state.canDecide} />
            </Field>
            <ConfirmDialog tone="claret" title="Reject this application?" body={`${["SANCTIONED", "IDENTITY_MISMATCH", "FRAUD"].includes(rejectReason) ? "This reason is FINAL — the person may never apply again. " : ""}${state.fee.disposition === "COLLECTED" ? "The fee was collected: a refund becomes owed and lands on the refunds worklist. " : ""}Referee ID scans are destroyed now.`}
              confirmLabel="Reject" cancelLabel="Cancel" onConfirm={() => run("Rejecting…", () => rejectApplicationAction(fd({ reason: rejectReason, note: rejectNote })), state.fee.disposition === "COLLECTED" ? "Rejected. A refund is owed — see the fee panel." : "Rejected.")}
              trigger={<Button variant="danger" size="md" fullWidth disabled={!mayAct || pending || !state.canDecide}>Reject</Button>} />
          </div>
        </div>
      )}
    </div>
  );
}
