"use client";

import { useState, useTransition } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeferredToast } from "@/components/ui/toast";
import { createCampaignAction, addContactsAction, sendCampaignAction, cancelCampaignAction } from "./invite-actions";

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
          <div className="mb-1.5 text-[12px] font-semibold text-text">Campaign name</div>
          <Input size="sm" placeholder="June Launch Push" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <NumField label="Bonus per invitee" prefix="TZS" value={bonus} onChange={setBonus} />
        <NumField label="Multiplier" hint="Blank = default" suffix="×"
          value={multiplier === "" ? 0 : multiplier} onChange={(n) => setMultiplier(n === 0 ? "" : n)} />
        <NumField label="Expiry" hint="Blank = default" suffix="days"
          value={expiry === "" ? 0 : expiry} onChange={(n) => setExpiry(n === 0 ? "" : n)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="w-full">
          <div className="mb-1.5 text-[12px] font-semibold text-text">Message (English)</div>
          <Input size="sm" value={messageEn} onChange={(e) => setMessageEn(e.target.value)} />
        </div>
        <div className="w-full">
          <div className="mb-1.5 text-[12px] font-semibold text-text">Message (Swahili)</div>
          <Input size="sm" value={messageSw} onChange={(e) => setMessageSw(e.target.value)} />
        </div>
      </div>
      <Button variant="gold" size="sm" leading={<I.plus s={14} />} loading={pending} onClick={create}>Create campaign</Button>
    </div>
  );
}

/** Add-contacts + send controls (on the detail page). */
export function CampaignControls({ campaignId, status, queued }: { campaignId: string; status: string; queued: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const [text, setText] = useState("");

  const add = () => {
    if (!text.trim()) { toast({ title: "Paste some contacts first", variant: "danger" }); return; }
    start(async () => {
      const r = await addContactsAction(campaignId, text);
      if (r.ok) {
        setText("");
        router.refresh();
        deferToast({ title: `${r.added} added · ${r.skipped} duplicate · ${r.invalid.length} invalid`, variant: "success" });
      } else toast({ title: "Couldn't add", description: r.error, variant: "danger" });
    });
  };
  const send = () => {
    start(async () => {
      const r = await sendCampaignAction(campaignId);
      if (r.ok) { router.refresh(); deferToast({ title: `Sent ${r.sent} · ${r.failed} failed`, variant: "success" }); }
      else toast({ title: "Couldn't send", description: r.error, variant: "danger" });
    });
  };
  const cancel = () => {
    start(async () => {
      const r = await cancelCampaignAction(campaignId);
      if (r.ok) { router.refresh(); deferToast({ title: "Campaign cancelled", variant: "success" }); }
      else toast({ title: "Couldn't cancel", description: r.error, variant: "danger" });
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 text-[12px] font-semibold text-text">Add contacts · one per line (email or phone, optional <span className="font-mono">,amount</span>)</div>
        <textarea
          className="w-full min-h-[120px] rounded-md border border-border bg-bg-overlay px-3 py-2 font-mono text-[12px] text-text"
          placeholder={"jane@example.com\n0712345678\n+255713000111,15000"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" leading={<I.plus s={13} />} loading={pending} onClick={add} disabled={status === "CANCELLED"}>Add contacts</Button>
          <Button variant="gold" size="sm" leading={<I.megaphone s={13} />} loading={pending} onClick={send} disabled={queued === 0 || status === "CANCELLED"}>
            Send {queued > 0 ? `(${queued} queued)` : ""}
          </Button>
          {status !== "CANCELLED" && (
            <Button variant="ghost" size="sm" loading={pending} onClick={cancel}>Cancel campaign</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function NumField({
  label, hint, prefix, suffix, value, onChange, width,
}: { label: string; hint?: string; prefix?: string; suffix?: string; value: number; onChange: (n: number) => void; width?: number }) {
  return (
    <div style={{ width: width ?? "100%" }}>
      <div className="mb-1.5 text-[12px] font-semibold text-text">{label}</div>
      <Input prefix={prefix || undefined} trailing={suffix ? <span className="text-[11px]">{suffix}</span> : undefined}
        mono size="sm" inputMode="numeric" value={value}
        onChange={(e) => { const n = Number(e.target.value.replace(/[^\d.]/g, "")); onChange(Number.isFinite(n) ? n : 0); }} />
      {hint && <div className="mt-1.5 text-[10.5px] text-text-subtle">{hint}</div>}
    </div>
  );
}
