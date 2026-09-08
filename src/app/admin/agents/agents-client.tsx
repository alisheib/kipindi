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
import type { LipaConfig } from "@/lib/server/lipa-config";
import { formatLipaNumber, normalizeLipaNumber, shouldShowLipaQr } from "@/lib/lipa";
import { I } from "@/components/ui/glyphs";
import {
  setAgentRateAction, deactivateAgentAction, reactivateAgentAction, settlePayableAction, issueInvitationAction, revokeInvitationAction, saveAgentConfigAction,
  saveLipaConfigAction,
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

/**
 * Issue an invitation to an EMAIL address. The token is shown ONCE.
 *
 * 🔴 IT USED TO SAY "A text with the link is on its way." It was not. `sms.ts` ships the
 * `console` provider by default, Beem and Africa's Talking are stubs that throw, and the
 * Selcom contract is unsigned — so in production the log read "console provider active in
 * PRODUCTION … NOT delivered" while this sentence promised an officer it had gone. Worse, the
 * sibling invite paths (`invite-service.ts`, `/admin/invites/[id]`) both consult
 * `smsConfigured()` before promising anything; only the agent path did not.
 *
 * ⭐ SO THE SENTENCE NOW REPORTS WHAT THE PROVIDER ACTUALLY RETURNED. `sendEmail` answers
 * `sent` · `stub` · `suppressed` · `failed`, and each gets its own sentence — including the
 * two an officer must ACT on: `suppressed` means the address hard-bounced before and nothing
 * will ever reach it, `stub` means no mail provider is configured on this deployment.
 */
export function InviteComposer({ expiryDays }: { expiryDays: number }) {
  const mayAct = useMayAct();
  const { ov, pending, field, run } = useRunner();
  const ref = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const dirty = !link && (email.trim() !== "" || name.trim() !== "");
  if (!mayAct) return <ActReadOnly />;
  return (
    <div ref={ref} className="space-y-3">
      <ActionOverlay state={ov.state} onDismiss={ov.dismiss} />
      <UnsavedChangesGuard dirty={dirty} body="An invitation has been typed but not issued. Leaving now discards it." />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,280px)_1fr_auto] md:items-end">
        <Field
          label="Email address"
          hint="Where the invitation and its code are sent — the invitee accepts with the account that uses this address"
          error={field?.name === "email" ? field.message : undefined}
          dataField="email"
        >
          {/* ⭐ A LITERAL EXAMPLE that could never be mistaken for a value (finding A-5: a
              placeholder must never become a value). `type="email"` gets the right keyboard
              on a phone; the real refusals come from the server, which knows far more than a
              shape check can. */}
          <Input
            name="email" type="email" inputMode="email" autoComplete="off" spellCheck={false}
            placeholder="agent@example.com" maxLength={254}
            value={email} onChange={(e) => setEmail(e.target.value.trim())}
          />
        </Field>
        <Field label="Name (optional)" hint="Shown on the invitation page so the invitee knows it is for them" error={field?.name === "displayName" ? field.message : undefined} dataField="displayName">
          <Input name="displayName" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Asha Mwinyi" />
        </Field>
        <Button variant="primary" size="md" disabled={pending || !email.trim()} loading={pending}
          onClick={() => run(ref.current, "Issuing invitation…", () => { const f = new FormData(); f.set("email", email); f.set("displayName", name); return issueInvitationAction(f); },
            (r) => {
              const d = (r as { data?: { link?: string; delivery?: string } }).data;
              if (d?.link) setLink(d.link);
              const head = `Invitation issued · expires in ${expiryDays} days.`;
              switch (d?.delivery) {
                case "sent": return `${head} The invitation email has been sent. The link is below if they need it another way.`;
                case "suppressed": return `${head} ⛔ The email was NOT sent: that address has hard-bounced before and is suppressed. Send them the link below directly, or invite a different address.`;
                case "stub": return `${head} ⚠️ No mail provider is configured on this deployment, so nothing was sent. Send them the link below directly.`;
                case "failed": return `${head} ⚠️ The email could not be delivered. Send them the link below directly, or try again.`;
                default: return `${head} Delivery could not be confirmed — send them the link below directly.`;
              }
            })}>
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
    agentWithholdingTaxPct: String(cfg.agentWithholdingTaxPct),
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
        {/* 🔴 THIS FIELD WAS MISSING, AND THE LIVE DRIVE IS WHAT FOUND IT. The withholding
            rate went into `agent-config`, into the accrual, into the ledger, into the terms and
            onto the public waterfall — and the officer who is accountable for it had no way to
            see or change it. A config value with no control is a value nobody can operate. */}
        {num("agentWithholdingTaxPct", "Agent withholding tax (% of commission)", { decimal: true, hint: "Deducted from the agent's commission and remitted · 0 = does not apply" })}
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
        {/* ⚠️ WORKING days, and the label has to say so. Management moved the unit on
            2026-09-08 and `/admin/agents` measures the SLA with `workingDaysBetween`; a field
            still labelled "(days)" would have an officer typing 5 and meaning a calendar week. */}
        {num("reviewSlaDays", "Review time promised (working days)", { hint: "Weekends are not counted — the same measure the queue's Past-SLA chip uses" })}
      </div>
      <Button type="submit" variant="primary" size="md" disabled={!mayAct || pending} loading={pending}>Save settings</Button>
    </form>
  );
}

/**
 * The Lipa (Selcom merchant QR) identity.
 *
 * ── ⭐ WHY IT SHOWS A LIVE VERDICT INSTEAD OF JUST FIELDS ────────────────────
 * The QR renders to applicants ONLY when this Lipa number IS the fee destination
 * account (`shouldShowLipaQr`) — a deliberate rule, so the code and the words beside
 * it can never name different places to send money. The cost of that rule is that an
 * officer can make a perfectly valid edit here and have the QR silently vanish from
 * a public page, with a green "Saved" and no clue why.
 *
 * So the form states the consequence in the same breath as the fields: whether the
 * QR is live right now, and if not, exactly which two values disagree. A setting
 * whose real effect is invisible is a setting somebody will get wrong at 11pm.
 *
 * ⛔ There is no control for the QR image or its pinned payload, and there must not
 * be — see `saveLipaConfigAction`.
 */
export function LipaSettingsForm({ cfg, feeDestinationAccount }: { cfg: LipaConfig; feeDestinationAccount: string }) {
  const mayAct = useMayAct();
  const { ov, pending, field, run } = useRunner();
  const ref = useRef<HTMLFormElement>(null);
  const [v, setV] = useState<Record<string, string>>({
    lipaEnabled: cfg.enabled ? "true" : "false",
    lipaMerchantName: cfg.merchantName,
    lipaNumber: cfg.lipaNumber,
    lipaUssdCode: cfg.ussdCode,
  });
  const savedRef = useRef(JSON.stringify(v));
  const dirty = JSON.stringify(v) !== savedRef.current;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  // The same predicate the public surfaces use — imported, never re-implemented, so this
  // verdict cannot drift from the behaviour it is describing.
  const live = shouldShowLipaQr(
    { enabled: v.lipaEnabled === "true", merchantName: v.lipaMerchantName, lipaNumber: normalizeLipaNumber(v.lipaNumber), ussdCode: v.lipaUssdCode, qrAssetPath: cfg.qrAssetPath },
    feeDestinationAccount,
  );
  const offBecauseSwitch = v.lipaEnabled !== "true";

  return (
    <form ref={ref} className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(ref.current, "Saving Lipa settings…", () => { const f = new FormData(); for (const [k, val] of Object.entries(v)) f.set(k, val); return saveLipaConfigAction(f); }, () => { savedRef.current = JSON.stringify(v); return "Lipa settings saved. /agent and /agent/apply now render the new values."; }); }}>
      <ActionOverlay state={ov.state} onDismiss={ov.dismiss} />
      <UnsavedChangesGuard dirty={dirty} body="The Lipa payment settings have been changed but not saved. Leaving now discards the change." />
      {!mayAct && <ActReadOnly />}
      {mayAct
        ? <Checkbox checked={v.lipaEnabled === "true"} onChange={(c) => setV((x) => ({ ...x, lipaEnabled: c ? "true" : "false" }))} label="Show the Lipa QR on the agent fee pages" />
        : <p className="text-body-sm text-text-secondary">Lipa QR shown: <span className="font-mono text-text">{v.lipaEnabled === "true" ? "on" : "off"}</span></p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Merchant name" hint="Shown to the payer to confirm who they are paying" error={field?.name === "lipaMerchantName" ? field.message : undefined} dataField="lipaMerchantName">
          <Input name="lipaMerchantName" value={v.lipaMerchantName} onChange={set("lipaMerchantName")} maxLength={80} disabled={!mayAct} />
        </Field>
        <Field label="Lipa number" hint="Digits only — a space is fine, it is stripped on save" error={field?.name === "lipaNumber" ? field.message : undefined} dataField="lipaNumber">
          <Input mono inputMode="numeric" name="lipaNumber" value={v.lipaNumber} onChange={set("lipaNumber")} maxLength={24} disabled={!mayAct} />
        </Field>
        <Field label="USSD fallback" hint="For a handset that cannot scan · blank to hide" error={field?.name === "lipaUssdCode" ? field.message : undefined} dataField="lipaUssdCode">
          <Input mono name="lipaUssdCode" value={v.lipaUssdCode} onChange={set("lipaUssdCode")} maxLength={20} disabled={!mayAct} />
        </Field>
      </div>

      {/* The consequence, stated where the change is made. */}
      {live ? (
        <p className="flex gap-1.5 text-body-sm leading-relaxed text-success-500">
          <I.checkCircle s={14} className="mt-0.5 shrink-0" />
          <span>The QR is live on /agent and /agent/apply — it pays Lipa <span className="font-mono">{formatLipaNumber(v.lipaNumber)}</span>, which is the fee destination account.</span>
        </p>
      ) : (
        <p className="flex gap-1.5 text-body-sm leading-relaxed text-warning-500">
          <I.warning s={14} className="mt-0.5 shrink-0" />
          <span>
            {offBecauseSwitch
              ? "The QR is hidden because the switch above is off. Applicants still see the fee destination account as text."
              : <>The QR is hidden: the fee destination account is <span className="font-mono">{feeDestinationAccount || "(empty)"}</span>, which is not this Lipa number. Applicants see that account as text and no QR. Set them to the same number to show it — a QR that pays somewhere other than the account beside it is how money goes missing.</>}
          </span>
        </p>
      )}

      <p className="font-mono text-micro text-text-faint">Artwork: {cfg.qrAssetPath} · verified by <span className="text-text-subtle">npm run test:lipa-qr</span> · replaced only by re-running scripts/extract-lipa-qr.mjs</p>
      <Button type="submit" variant="primary" size="md" disabled={!mayAct || pending} loading={pending}>Save Lipa settings</Button>
    </form>
  );
}
