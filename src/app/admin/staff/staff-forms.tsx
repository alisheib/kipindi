"use client";

/**
 * Staff role controls — with CONSEQUENCE HIGHLIGHTING (Ali, 2026-07-28): before the
 * Owner commits, the page states in plain language + the design-system's semantic
 * colours exactly what the chosen role will be able to SEE and DO, and warns that the
 * change signs the person out. Green = gains, amber = money/PII power, rose = revoke.
 *
 * `roleInfos` is computed server-side from the LIVE grant matrix (so it reflects any
 * edits made at /admin/roles), then handed to the client as plain data.
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { setStaffRoleAction, addStaffByPhoneAction } from "./actions";

export type RoleInfo = {
  role: string;
  label: string;
  /** Domains the role may VIEW, as { label } (e.g. "Accounting & money"). */
  view: string[];
  /** Domains the role may ACT on, as { label, act } (what they can DO). */
  act: { label: string; act: string }[];
  /** True for the money/PII-bearing act domains — drives the amber caution. */
  sensitive: boolean;
};

const MONEY = "var(--warning-500)";
const GAIN = "var(--yes-500)";
const REVOKE = "var(--no-500)";

/** The always-visible "what this means" panel. */
function Consequence({ info, isRevoke }: { info: RoleInfo | undefined; isRevoke: boolean }) {
  if (isRevoke) {
    return (
      <div className="rounded-md border px-3 py-2.5 text-caption" style={{ borderColor: "var(--no-border, var(--border))", background: "color-mix(in oklab, var(--no-500) 8%, transparent)" }}>
        <p className="font-mono text-micro uppercase eyebrow" style={{ color: REVOKE }}>Revokes staff access</p>
        <p className="mt-1 text-text-secondary">This person becomes an ordinary <strong>Player</strong>. They will no longer reach the admin console — the nav, every page and every action are closed to them.</p>
      </div>
    );
  }
  if (!info) return null;
  return (
    <div className="rounded-md border border-border bg-bg-overlay px-3 py-2.5 space-y-2">
      <p className="font-mono text-micro uppercase tracking-[0.14em] text-text-subtle">
        As {info.label}, this person will be able to
      </p>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-pill" style={{ background: GAIN }} />
          <p className="text-caption text-text-secondary">
            <span className="font-semibold text-text">See:</span>{" "}
            {info.view.length ? info.view.join(" · ") : "nothing (no view access)"}
          </p>
        </div>
        <div className="flex gap-2">
          <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-pill" style={{ background: info.sensitive ? MONEY : GAIN }} />
          <p className="text-caption text-text-secondary">
            <span className="font-semibold text-text">Do:</span>{" "}
            {info.act.length ? info.act.map((a) => a.act).join("; ") : "view only — no changes anywhere (read-only)"}
          </p>
        </div>
        {info.sensitive && (
          <p className="text-micro" style={{ color: MONEY }}>
            ⚠ This role can move money or handle player PII. Grant it deliberately.
          </p>
        )}
      </div>
      <p className="text-micro text-text-tertiary border-t border-dashed border-border-subtle pt-1.5">
        Saving signs this person out of all devices; they sign in again with the new role. You can fine-tune what each role sees and does at <span className="font-mono">/admin/roles</span>.
      </p>
    </div>
  );
}

const ROLE_OPTIONS = (roleInfos: Record<string, RoleInfo>, includeRevoke: boolean) => {
  const opts = Object.values(roleInfos).map((r) => ({ value: r.role, label: r.label }));
  return includeRevoke ? [...opts, { value: "PLAYER", label: "Player (revoke staff access)" }] : opts;
};

/** Assign / change an existing staffer's role (on the detail page). */
export function AssignRoleForm({ userId, currentRole, roleInfos }: { userId: string; currentRole: string; roleInfos: Record<string, RoleInfo> }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [role, setRole] = useState<string>(currentRole);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const isRevoke = role === "PLAYER";
  const info = roleInfos[role];
  const changed = role !== currentRole;

  const run = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("role", role);
      fd.set("reason", reason);
      const r = await setStaffRoleAction(fd);
      if (!r.ok) { toast({ title: "Couldn't change role", description: r.error, variant: "danger" }); return; }
      router.refresh();
      deferToast({ title: "Role updated", description: "They've been signed out and will re-enter with the new role.", variant: "success" });
      setReason("");
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changed) { toast({ title: "No change", description: "Pick a different role first.", variant: "warning" }); return; }
    if (reason.trim().length < 5) { toast({ title: "Reason required", description: "Add a short reason (≥ 5 characters).", variant: "warning" }); return; }
    setConfirming(true);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Role" hint="One role per person.">
          <Select name="role" ariaLabel="Role" defaultValue={currentRole} onChange={setRole} options={ROLE_OPTIONS(roleInfos, true)} />
        </Field>
        <Field label="Reason (audited)" hint="Why the change — recorded in the compliance log.">
          <Input name="reason" value={reason} onChange={(e) => setReason(e.currentTarget.value)} placeholder="e.g. moved to the finance desk" />
        </Field>
      </div>
      <Consequence info={info} isRevoke={isRevoke} />
      <Button type="submit" variant="primary" loading={pending} disabled={!changed}>
        {isRevoke ? "Revoke staff access" : "Change role"}
      </Button>

      <ConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => { setConfirming(false); run(); }}
        title={isRevoke ? "Revoke staff access?" : `Change role to ${info?.label ?? role}?`}
        body={
          isRevoke
            ? "This person becomes an ordinary Player and loses all admin access. They will be signed out immediately. Continue?"
            : `They will be able to ${info?.act.length ? info.act.map((a) => a.act).join("; ") : "view only (read-only)"}. They'll be signed out and must sign in again. Continue?`
        }
        confirmLabel={isRevoke ? "Revoke access" : "Change role"}
        tone={isRevoke || info?.sensitive ? "claret" : "warning"}
        /* The typed word names the DECISION, not the act (S-17, which found this dialog
           wearing a hard tier with no word at all — an ordinary one-click confirm). A role
           change makes you type the role you are GRANTING, so picking the wrong entry from
           the dropdown and confirming on muscle memory cannot land: the word would not match. */
        tier="hard"
        typedWord={isRevoke ? "REVOKE" : role}
      />
    </form>
  );
}

/** Add staff by promoting an existing account, looked up by phone (roster page). */
export function AddStaffForm({ roleInfos }: { roleInfos: Record<string, RoleInfo> }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("SUPPORT");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const info = roleInfos[role];
  const options = useMemo(() => ROLE_OPTIONS(roleInfos, false), [roleInfos]);

  const run = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("phone", phone);
      fd.set("role", role);
      fd.set("reason", reason);
      const r = await addStaffByPhoneAction(fd);
      if (!r.ok) { toast({ title: "Couldn't add staff", description: r.error, variant: "danger" }); return; }
      router.refresh();
      deferToast({ title: "Staff added", description: `${info?.label ?? role} assigned. They've been signed out and will re-enter with the new role.`, variant: "success" });
      setPhone(""); setReason("");
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { toast({ title: "Phone required", variant: "warning" }); return; }
    if (reason.trim().length < 5) { toast({ title: "Reason required", description: "Add a short reason (≥ 5 characters).", variant: "warning" }); return; }
    setConfirming(true);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Phone" hint="Their existing 50pick account.">
          <Input name="phone" value={phone} onChange={(e) => setPhone(e.currentTarget.value)} placeholder="+255…" mono />
        </Field>
        <Field label="Role">
          <Select name="role" ariaLabel="Role" defaultValue="SUPPORT" onChange={setRole} options={options} />
        </Field>
        <Field label="Reason (audited)">
          <Input name="reason" value={reason} onChange={(e) => setReason(e.currentTarget.value)} placeholder="e.g. new support hire" />
        </Field>
      </div>
      <Consequence info={info} isRevoke={false} />
      <Button type="submit" variant="primary" loading={pending}>Add as staff</Button>

      <ConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => { setConfirming(false); run(); }}
        title={`Make this account ${info?.label ?? role}?`}
        body={`They will be able to ${info?.act.length ? info.act.map((a) => a.act).join("; ") : "view only (read-only)"}. They'll be signed out and must sign in again to pick up admin access. Continue?`}
        confirmLabel="Add as staff"
        tone={info?.sensitive ? "claret" : "warning"}
        /* Type the role being granted (S-17). This form promotes an account found by phone
           lookup, so the two things that can go wrong are the wrong account and the wrong
           role; the word makes the officer restate the second one deliberately. */
        tier="hard"
        typedWord={role}
      />
    </form>
  );
}
