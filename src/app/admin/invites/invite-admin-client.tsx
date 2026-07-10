"use client";

import { useState, useTransition } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Spinner } from "@/components/ui/spinner";
import { useDeferredToast } from "@/components/ui/toast";
import { createCampaignAction, addContactsStructuredAction, sendCampaignAction, cancelCampaignAction } from "./invite-actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type StagedRow = { email: string; phone: string; amount: number | "" };

/** Create-campaign form (on the list page). */
export function CreateCampaignForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const [name, setName] = useState("");
  const [bonus, setBonus] = useState(10_000);
  const [multiplier, setMultiplier] = useState<number | "">("");
  const [expiry, setExpiry] = useState<number | "">("");
  const [messageEn, setMessageEn] = useState("Join 50pick and start predicting.");
  const [messageSw, setMessageSw] = useState("Jiunge na 50pick uanze kutabiri.");

  const create = () => {
    if (!name.trim()) { toast({ title: "Enter a campaign name", variant: "danger" }); return; }
    start(async () => {
      const r = await createCampaignAction({
        name: name.trim(), bonusAmountTzs: Math.round(bonus),
        wagerMultiplier: multiplier === "" ? undefined : Number(multiplier),
        expiresInDays: expiry === "" ? undefined : Number(expiry),
        messageEn, messageSw,
      });
      if (r.ok) { deferToast({ title: "Campaign created", variant: "success" }); router.push(`/admin/invites/${r.campaignId}` as Route); }
      else toast({ title: "Couldn't create", description: r.error, variant: "danger" });
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="w-full">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted">Campaign name</div>
          <Input aria-label="Campaign name" size="sm" placeholder="June Launch Push" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <NumField label="Bonus per invitee" prefix="TZS" value={bonus} onChange={setBonus} />
        <NumField label="Multiplier" hint="Blank = default" suffix="×"
          value={multiplier === "" ? 0 : multiplier} onChange={(n) => setMultiplier(n === 0 ? "" : n)} />
        <NumField label="Expiry" hint="Blank = default" suffix="days"
          value={expiry === "" ? 0 : expiry} onChange={(n) => setExpiry(n === 0 ? "" : n)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="w-full">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted">Message (English)</div>
          <Input aria-label="Message (English)" size="sm" value={messageEn} onChange={(e) => setMessageEn(e.target.value)} />
        </div>
        <div className="w-full">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted">Message (Swahili)</div>
          <Input aria-label="Message (Swahili)" size="sm" value={messageSw} onChange={(e) => setMessageSw(e.target.value)} />
        </div>
      </div>
      <Button variant="primary" size="sm" leading={<I.plus s={14} />} loading={pending} onClick={create}>Create campaign</Button>
    </div>
  );
}

/** Add-contacts + send controls (on the detail page).
 *
 *  Contacts are entered in SEPARATE email / phone fields (one or both — at least
 *  one required) and staged into a reviewable list before submitting, so admins
 *  can't make the per-line paste mistakes the old single textarea invited. A row
 *  with both an email and a phone reaches the invitee on both channels. */
export function CampaignControls({ campaignId, status, queued, smsLive }: { campaignId: string; status: string; queued: number; smsLive: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");        // raw 9 digits (PhoneInput strips to canonical)
  const [amount, setAmount] = useState<number | "">("");
  const [emailErr, setEmailErr] = useState<string | undefined>();
  const [rows, setRows] = useState<StagedRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null); // which phase is in flight (for live feedback)
  const locked = status === "CANCELLED";

  // Run a server action with an explicit phase label so the admin always sees
  // what's happening ("Adding contacts…", "Sending invites…", "Cancelling…").
  const run = (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    start(async () => {
      try { await fn(); } finally { setBusy(null); }
    });
  };

  const addToList = () => {
    const e = email.trim();
    const p = phone.trim();
    if (!e && !p) { toast({ title: "Enter an email or a phone", variant: "danger" }); return; }
    if (e && !EMAIL_RE.test(e)) { setEmailErr("That doesn't look like an email"); return; }
    if (p && !/^[67]\d{8}$/.test(p)) { toast({ title: "Phone must be a 9-digit TZ mobile (6… or 7…)", variant: "danger" }); return; }
    setEmailErr(undefined);
    setRows((r) => [...r, { email: e, phone: p, amount }]);
    setEmail(""); setPhone(""); setAmount("");
  };
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const submitRows = () => {
    if (rows.length === 0) { toast({ title: "Add at least one contact to the list", variant: "danger" }); return; }
    run(`Adding ${rows.length} contact${rows.length === 1 ? "" : "s"}…`, async () => {
      const r = await addContactsStructuredAction(
        campaignId,
        rows.map((row) => ({ email: row.email || null, phone: row.phone || null, bonusAmountTzs: row.amount === "" ? null : Number(row.amount) })),
      );
      if (r.ok) {
        setRows([]);
        router.refresh();
        deferToast({ title: `${r.added} added · ${r.skipped} duplicate · ${r.invalid} invalid`, variant: "success" });
      } else toast({ title: "Couldn't add", description: r.error, variant: "danger" });
    });
  };
  const send = () => {
    run(`Sending ${queued} invite${queued === 1 ? "" : "s"}…`, async () => {
      const r = await sendCampaignAction(campaignId);
      if (r.ok) {
        router.refresh();
        const extra = r.pending > 0 ? ` · ${r.pending} phone pending (SMS not live yet)` : "";
        deferToast({ title: `Sent ${r.sent}${r.failed > 0 ? ` · ${r.failed} failed` : ""}${extra}`, variant: r.pending > 0 ? "warning" : "success" });
      } else toast({ title: "Couldn't send", description: r.error, variant: "danger" });
    });
  };
  const cancel = () => {
    run("Cancelling campaign…", async () => {
      const r = await cancelCampaignAction(campaignId);
      if (r.ok) { router.refresh(); deferToast({ title: "Campaign cancelled", variant: "success" }); }
      else toast({ title: "Couldn't cancel", description: r.error, variant: "danger" });
    });
  };

  return (
    <div className="space-y-4">
      {/* Structured contact entry */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Email" hint="jane@example.com" error={emailErr} className="lg:col-span-2">
            <Input
              type="email" inputMode="email" autoComplete="off" size="sm" placeholder="jane@example.com"
              value={email} error={emailErr} onChange={(e) => { setEmail(e.target.value); if (emailErr) setEmailErr(undefined); }}
            />
          </Field>
          <Field label="Phone" hint={smsLive ? "Any TZ mobile" : "Captured now · SMS sends once live"}>
            <PhoneInput size="sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Bonus" hint="Blank = campaign default">
            <Input
              prefix="TZS" mono size="sm" inputMode="numeric" placeholder="default" value={amount}
              onChange={(e) => { const n = Number(e.target.value.replace(/[^\d]/g, "")); setAmount(Number.isFinite(n) && n > 0 ? n : ""); }}
            />
          </Field>
        </div>
        <div className="text-[10.5px] text-text-subtle">Fill an email, a phone, or both — at least one is required. Add several, review the list, then submit.</div>
        <Button variant="ghost" size="sm" leading={<I.plus s={13} />} onClick={addToList} disabled={locked}>Add to list</Button>
      </div>

      {/* Staged list */}
      {rows.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-bg-elevated">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted">
              {rows.length} contact{rows.length === 1 ? "" : "s"} staged · not yet saved
            </span>
            <button type="button" onClick={() => setRows([])} disabled={pending}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle hover:text-no-300 transition-colors disabled:opacity-40">
              Clear all
            </button>
          </div>
          <ul className="divide-y divide-border max-h-72 overflow-y-auto">
            {rows.map((row, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2 text-[12px]">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 flex-1 min-w-0">
                  {row.email && <span className="font-mono text-text-muted truncate">{row.email}</span>}
                  {row.phone && <span className="font-mono text-text-muted">+255 {row.phone}</span>}
                  {row.amount !== "" && <span className="font-mono text-text">TZS {Number(row.amount).toLocaleString("en-US")}</span>}
                </div>
                <button type="button" onClick={() => removeRow(i)} className="text-text-subtle hover:text-no-300 transition-colors shrink-0" aria-label="Remove">
                  <I.x s={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Zero-queued hint — tells the admin why Send is unavailable. */}
      {!locked && queued === 0 && !busy && (
        <p className="text-[11.5px] text-text-subtle">
          {rows.length > 0
            ? "Press “Add to campaign” to queue these contacts, then Send."
            : "No invites queued yet — add contacts above, then Send."}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="aqua-ghost" size="sm" leading={<I.plus s={13} />} loading={pending} onClick={submitRows} disabled={rows.length === 0 || locked}>
          Add {rows.length > 0 ? `${rows.length} ` : ""}to campaign
        </Button>
        <Button variant="primary" size="sm" leading={<I.megaphone s={13} />} loading={pending} onClick={send} disabled={queued === 0 || locked}>
          Send {queued > 0 ? `(${queued} queued)` : ""}
        </Button>
        {!locked && (
          <Button variant="ghost" size="sm" loading={pending} onClick={cancel}>Cancel campaign</Button>
        )}
        {/* Live phase indicator — the admin always knows what's happening now. */}
        {busy && (
          <span className="inline-flex items-center gap-2 text-[12px] text-text-muted" role="status" aria-live="polite">
            <Spinner size={13} />
            {busy}
          </span>
        )}
      </div>
    </div>
  );
}

function NumField({
  label, hint, prefix, suffix, value, onChange, width,
}: { label: string; hint?: string; prefix?: string; suffix?: string; value: number; onChange: (n: number) => void; width?: number }) {
  return (
    <div style={{ width: width ?? "100%" }}>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted">{label}</div>
      <Input aria-label={label} prefix={prefix || undefined} trailing={suffix ? <span className="text-[11px]">{suffix}</span> : undefined}
        mono size="sm" inputMode="numeric" value={value}
        onChange={(e) => { const n = Number(e.target.value.replace(/[^\d.]/g, "")); onChange(Number.isFinite(n) ? n : 0); }} />
      {hint && <div className="mt-1.5 text-[10.5px] text-text-subtle">{hint}</div>}
    </div>
  );
}
