"use client";

/**
 * The roster's row controls, the invitation composer, the payables settle control and the
 * Settings form. Each mutation → `runAdminAction` → the shared `ActionOverlay`; a role holding
 * VIEW without ACT sees why rather than a button the server will refuse.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { PLATFORM_MAX_COMMISSION_PCT, type AgentConfig } from "@/lib/server/agent-config";
import {
  setAgentRateAction, deactivateAgentAction, reactivateAgentAction, settlePayableAction, issueInvitationAction, revokeInvitationAction, saveAgentConfigAction,
} from "./actions";

type Res = { ok: true; data?: unknown } | { ok: false; error: string; field?: string };

function useRunner() {
  const ov = useActionOverlay();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [field, setField] = useState<{ name: string; message: string } | null>(null);
  const run = (root: HTMLElement | null, label: string, fn: () => Promise<Res>, onOk: (r: Res) => string) => start(async () => {
    ov.run(label);
    const r = await runAdminAction(fn);
    if (!r.ok) { ov.fail("Not applied", r.error); setField(r.field ? { name: r.field, message: r.error } : null); if (r.field) focusFirstInvalid(root, [r.field]); return; }
    setField(null); ov.succeed(onOk(r)); router.refresh();
  });
  return { ov, pending, field, run };
}

/** Settle a PENDING accrual out of band. */
export function SettlePayable({ rewardId }: { rewardId: string }) {
  const mayAct = useMayAct();
  const { ov, pending, field, run } = useRunner();
  const ref = useRef<HTMLDivElement>(null);
  const [reference, setReference] = useState("");
  const dirty = reference.trim() !== "";
  if (!mayAct) return <ActReadOnly />;
  return (
    <div ref={ref} className="flex items-end gap-2">
      <ActionOverlay state={ov.state} onDismiss={ov.dismiss} />
      <UnsavedChangesGuard dirty={dirty} body="A settlement reference has been typed but not recorded. Leaving now discards it." />
      <Field label="Settlement ref" error={field?.name === "reference" ? field.message : undefined} dataField="reference">
        <Input mono size="sm" name="reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} />
      </Field>
      <Button size="sm" variant="gold" disabled={pending} onClick={() => run(ref.current, "Settling…", () => { const f = new FormData(); f.set("rewardId", rewardId); f.set("reference", reference); return settlePayableAction(f); }, () => "Marked settled.")}>Mark settled</Button>
    </div>
  );
}

/** Issue an invitation to a phone number. The token is shown ONCE. */
export function InviteComposer({ expiryDays }: { expiryDays: number }) {
  const mayAct = useMayAct();
  const { ov, pending, field, run } = useRunner();
  const ref = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState("+255");
  const [name, setName] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const dirty = !link && (phone !== "+255" || name.trim() !== "");
  if (!mayAct) return <ActReadOnly />;
  return (
    <div ref={ref} className="space-y-3">
      <ActionOverlay state={ov.state} onDismiss={ov.dismiss} />
      <UnsavedChangesGuard dirty={dirty} body="An invitation has been typed but not issued. Leaving now discards it." />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[200px_1fr_auto] md:items-end">
        <Field label="Phone (+255…)" error={field?.name === "phone" ? field.message : undefined} dataField="phone">
          <Input mono name="phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))} maxLength={13} />
        </Field>
        <Field label="Name (optional)">
          <Input name="displayName" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>
        <Button variant="primary" size="md" disabled={pending} loading={pending}
          onClick={() => run(ref.current, "Issuing invitation…", () => { const f = new FormData(); f.set("phone", phone); f.set("displayName", name); return issueInvitationAction(f); },
            (r) => { const d = (r as { data?: { link?: string } }).data; if (d?.link) setLink(d.link); return `Invitation issued · expires in ${expiryDays} days. A text with the link is on its way — copy it below in case the text does not arrive.`; })}>
          Invite
        </Button>
      </div>
      {link && (
        <div className="rounded-md border border-border bg-bg-overlay/40 p-3">
          <p className="font-mono text-micro uppercase eyebrow text-text-faint">Invitation link · shown once</p>
          <p className="mt-1 break-all font-mono text-body-sm text-text">{link}</p>
        </div>
      )}
    </div>
  );
}

export function RevokeInvitation({ invitationId }: { invitationId: string }) {
  const mayAct = useMayAct();
  const { ov, pending, run } = useRunner();
  if (!mayAct) return null;
  return (
    <>
      <ActionOverlay state={ov.state} onDismiss={ov.dismiss} />
      <ConfirmDialog tone="warning" title="Withdraw this invitation?" body="The link stops working." confirmLabel="Withdraw" cancelLabel="Keep"
        onConfirm={() => run(null, "Withdrawing…", () => { const f = new FormData(); f.set("invitationId", invitationId); f.set("reason", "withdrawn by officer"); return revokeInvitationAction(f); }, () => "Invitation withdrawn.")}
        trigger={<Button size="sm" variant="ghost" disabled={pending}>Withdraw</Button>} />
    </>
  );
}

/**
 * The Settings tab. ⛔ The ceiling field is validated on both ends against the RULE
 * (`PLATFORM_MAX_COMMISSION_PCT`); an operator narrows inside it and can never widen past it.
 * Numeric fields are the shared strict `Input`; the money ones are gold + mono.
 */
export function AgentSettingsForm({ cfg }: { cfg: AgentConfig }) {
  const mayAct = useMayAct();
  const { ov, pending, field, run } = useRunner();
  const ref = useRef<HTMLFormElement>(null);
  const [v, setV] = useState<Record<string, string>>({
    enabled: cfg.enabled ? "true" : "false",
    defaultCommissionPct: String(cfg.defaultCommissionPct), maxCommissionPct: String(cfg.maxCommissionPct),
    registrationFeeTzs: String(cfg.registrationFeeTzs), feeVatTreatment: cfg.feeVatTreatment, feeVatRatePct: String(cfg.feeVatRatePct),
    feeDestinationName: cfg.feeDestinationName, feeDestinationAccount: cfg.feeDestinationAccount,
    commissionWindowMonths: String(cfg.commissionWindowMonths), capPerRecruitTzs: String(cfg.capPerRecruitTzs),
    invitationExpiryDays: String(cfg.invitationExpiryDays), draftExpiryDays: String(cfg.draftExpiryDays), refundDeadlineDays: String(cfg.refundDeadlineDays),
    reapplyCooldownDays: String(cfg.reapplyCooldownDays), reviewSlaDays: String(cfg.reviewSlaDays),
  });
  /** What the server last confirmed; reset on a successful save so a saved form is clean again. */
  const savedRef = useRef(JSON.stringify(v));
  const dirty = JSON.stringify(v) !== savedRef.current;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  const num = (k: string, label: string, opts: { money?: boolean; hint?: string; decimal?: boolean } = {}) => (
    <Field label={label} hint={opts.hint} error={field?.name === k ? field.message : undefined} dataField={k}>
      <Input mono inputMode={opts.decimal ? "decimal" : "numeric"} name={k} value={v[k]} onChange={set(k)} prefix={opts.money ? "TZS" : undefined} className={opts.money || opts.decimal ? "text-gold-300" : undefined} disabled={!mayAct} />
    </Field>
  );
  return (
    <form ref={ref} className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(ref.current, "Saving settings…", () => { const f = new FormData(); for (const [k, val] of Object.entries(v)) f.set(k, val); return saveAgentConfigAction(f); }, () => { savedRef.current = JSON.stringify(v); return "Settings saved. /agent now renders the new values."; }); }}>
      <ActionOverlay state={ov.state} onDismiss={ov.dismiss} />
      <UnsavedChangesGuard dirty={dirty} body="The agent programme settings have been changed but not saved. Leaving now discards the change." />
      {!mayAct && <ActReadOnly />}
      {/* A read-only officer sees the fact, never a control they cannot use. */}
      {mayAct
        ? <Checkbox checked={v.enabled === "true"} onChange={(c) => setV((x) => ({ ...x, enabled: c ? "true" : "false" }))} label="Agent programme accepting applications (independent of the player promo switch)" />
        : <p className="text-body-sm text-text-secondary">Accepting applications: <span className="font-mono text-text">{v.enabled === "true" ? "on" : "off"}</span></p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {num("defaultCommissionPct", "Default commission (% of net fee)", { decimal: true, hint: "Pre-filled for a new agent" })}
        {num("maxCommissionPct", "Officer ceiling (%)", { decimal: true, hint: `Never above ${PLATFORM_MAX_COMMISSION_PCT}% — the rule (RULES.md §2.10)` })}
        {num("registrationFeeTzs", "Registration fee", { money: true })}
        <Field label="VAT treatment">
          <Select name="feeVatTreatment" value={v.feeVatTreatment} disabled={!mayAct} onChange={(val: string) => setV((x) => ({ ...x, feeVatTreatment: val }))} options={[{ value: "INCLUSIVE", label: "VAT inclusive" }, { value: "EXCLUSIVE", label: "VAT exclusive" }]} />
        </Field>
        {num("feeVatRatePct", "VAT rate (%)", { decimal: true })}
        <Field label="Fee destination — name"><Input name="feeDestinationName" value={v.feeDestinationName} onChange={set("feeDestinationName")} maxLength={80} disabled={!mayAct} /></Field>
        <Field label="Fee destination — account"><Input mono name="feeDestinationAccount" value={v.feeDestinationAccount} onChange={set("feeDestinationAccount")} maxLength={40} disabled={!mayAct} /></Field>
        {num("commissionWindowMonths", "Commission window (months)", { hint: "0 = lifetime" })}
        {num("capPerRecruitTzs", "Cap per recruit", { money: true, hint: "0 = uncapped" })}
        {num("invitationExpiryDays", "Invitation expiry (days)")}
        {num("draftExpiryDays", "Draft expiry (days)")}
        {num("refundDeadlineDays", "Refund deadline (days)")}
        {num("reapplyCooldownDays", "Re-apply cool-down (days)")}
        {num("reviewSlaDays", "Review time promised (days)")}
      </div>
      <Button type="submit" variant="primary" size="md" disabled={!mayAct || pending} loading={pending}>Save settings</Button>
    </form>
  );
}
