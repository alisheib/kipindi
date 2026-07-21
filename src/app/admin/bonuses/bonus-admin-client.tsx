"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import { useDeferredToast } from "@/components/ui/toast";
import type { BonusConfig } from "@/lib/server/bonus-config";
import { saveBonusConfigAction, grantBonusToPlayerAction, cancelGrantAction } from "./bonus-actions";
import { formatTzs } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ConfirmModal } from "@/components/ui/modal";

/** Cancel an ACTIVE grant from the ledger row. Confirmed — it claws bonus money
 *  back out of a player's wallet, so it should not fire on a single stray click. */
export function CancelGrantButton({ grantId }: { grantId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  return (
    <ConfirmDialog
      tone="claret"
      title="Cancel bonus grant · Ghairi bonasi"
      body="Cancel this active bonus grant? The remaining bonus amount is removed from the player's bonus wallet. This cannot be undone."
      confirmLabel="Yes, cancel grant"
      onConfirm={() => start(async () => {
        const r = await cancelGrantAction(grantId);
        if (r.ok) { router.refresh(); deferToast({ title: `Bonus cancelled · ${formatTzs(r.removedTzs)} removed`, variant: "success" }); }
        else toast({ title: "Couldn't cancel", description: r.error, variant: "danger" });
      })}
      trigger={<Button variant="ghost" size="sm" loading={pending}>Cancel</Button>}
    />
  );
}

/**
 * Interactive bonus-wallet admin: config editor + manual grant-to-player form.
 * Page chrome (KPIs, ledger) is server-rendered; this client owns editable state.
 */

function NumField({
  label, hint, prefix, suffix, value, onChange, width,
}: {
  label: string; hint?: string; prefix?: string; suffix?: string;
  value: number; onChange: (n: number) => void; width?: number;
}) {
  return (
    <div style={{ width: width ?? "100%" }}>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted">{label}</div>
      <Input
        aria-label={label}
        prefix={prefix || undefined}
        trailing={suffix ? <span className="text-[11px]">{suffix}</span> : undefined}
        mono size="sm" inputMode="numeric" value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/[^\d.]/g, ""));
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
      {hint && <div className="mt-1.5 text-[10.5px] text-text-subtle">{hint}</div>}
    </div>
  );
}

function RouteCard({
  icon: Icon, title, sw, desc, on, onToggle,
}: {
  icon: (typeof I)[keyof typeof I]; title: string; sw: string; desc: string; on: boolean; onToggle: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border bg-bg-elevated px-4 py-3.5"
      style={{ borderColor: on ? "color-mix(in oklab, var(--royal-500) 30%, var(--border))" : "var(--border)" }}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px]"
        style={{
          background: on ? "color-mix(in oklab, var(--royal-500) 18%, transparent)" : "var(--bg-overlay)",
          color: on ? "var(--royal-300)" : "var(--text-muted)",
        }}
      >
        <Icon size={19} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold">
          {title} <span className="font-normal italic text-text-subtle text-[12px]">· {sw}</span>
        </div>
        <div className="mt-0.5 text-[11.5px] text-text-muted">{desc}</div>
      </div>
      <Toggle on={on} onClick={onToggle} aria-label={`${title} routes to bonus`} />
    </div>
  );
}

export function BonusAdminClient({ config }: { config: BonusConfig }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const [c, setC] = useState<BonusConfig>(config);
  const on = c.enabled;

  const save = () => {
    start(async () => {
      const r = await saveBonusConfigAction(c);
      if (r.ok) {
        router.refresh();
        deferToast({ title: "Bonus config saved · Imehifadhiwa", variant: "success" });
      } else {
        toast({ title: "Couldn't save", description: r.error, variant: "danger" });
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Master switch + Save */}
      <div
        className="flex items-center gap-4 rounded-lg border p-4"
        style={{
          borderColor: on ? "color-mix(in oklab, var(--royal-500) 28%, var(--border))" : "color-mix(in oklab, var(--warning-500) 36%, var(--border))",
          background: on ? "var(--bg-elevated)" : "color-mix(in oklab, var(--warning-500) 8%, var(--bg-elevated))",
        }}
      >
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px]"
          style={{
            background: on ? "color-mix(in oklab, var(--royal-500) 18%, transparent)" : "color-mix(in oklab, var(--warning-500) 20%, transparent)",
            color: on ? "var(--royal-300)" : "var(--warning-fg)",
          }}
        >
          {on ? <I.gift size={23} /> : <I.pause s={23} />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold">
            Bonus program · <span className="font-normal italic text-text-subtle text-[12.5px]">Mpango wa bonasi</span>
          </div>
          <div className="mt-0.5 text-[12px] text-text-muted">
            {on
              ? "Live — bonuses can be granted and route per the toggles below."
              : "Paused — no new bonus grants from any source. Existing bonuses keep running."}
          </div>
        </div>
        <Toggle on={on} onClick={() => setC((p) => ({ ...p, enabled: !p.enabled }))} aria-label="Bonus program master switch" />
        <Button variant="primary" size="sm" leading={<I.check s={14} />} loading={pending} onClick={save}>Save</Button>
      </div>

      {/* Defaults */}
      <div className="rounded-lg border border-border bg-bg-elevated p-4">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle mb-3">Defaults · platform-wide · Misingi</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumField label="Wagering multiplier" hint="Play this × the bonus to unlock it" suffix="×"
            value={c.defaultWagerMultiplier} onChange={(n) => setC((p) => ({ ...p, defaultWagerMultiplier: n }))} />
          <NumField label="Expiry" hint="Days before an unused bonus expires" suffix="days"
            value={c.defaultExpiryDays} onChange={(n) => setC((p) => ({ ...p, defaultExpiryDays: n }))} />
          <NumField label="Monthly cap" hint="0 = no cap (admin discretion)" prefix="TZS"
            value={c.monthlyCapTzs} onChange={(n) => setC((p) => ({ ...p, monthlyCapTzs: n }))} />
        </div>
      </div>

      {/* Rules — Management Bonus Rules §2 (cashback) and §6 (sequential) */}
      <div className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle">Bonus rules · Management policy · Sheria</p>

        <div className="flex items-center gap-3 rounded-md border border-border bg-bg-overlay/40 px-3.5 py-3">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold">Sequential bonuses · Bonasi moja kwa moja</div>
            <div className="mt-0.5 text-[11px] text-text-muted">
              {c.sequentialBonuses
                ? "ON — one bonus at a time. New bonuses are queued until the current one completes (§6)."
                : "OFF — multiple bonuses can be active simultaneously (legacy mode)."}
            </div>
          </div>
          <Toggle on={c.sequentialBonuses} onClick={() => setC((p) => ({ ...p, sequentialBonuses: !p.sequentialBonuses }))} aria-label="Sequential bonuses" />
        </div>

        <div className="flex items-center gap-3 rounded-md border border-border bg-bg-overlay/40 px-3.5 py-3">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold">Cashback mode · Aina ya marejesho</div>
            <div className="mt-0.5 text-[11px] text-text-muted">
              {c.cashbackMode === "REQUEST"
                ? "REQUEST — player loses deposit, submits request, management approves (§2)."
                : "AUTO — cashback credited automatically on every confirmed deposit (legacy)."}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setC((p) => ({ ...p, cashbackMode: p.cashbackMode === "REQUEST" ? "AUTO" : "REQUEST" }))}
            className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-text-muted hover:text-text transition-colors"
          >
            {c.cashbackMode === "REQUEST" ? <><I.shieldcheck s={12} /> Request</> : <><I.bolt s={12} /> Auto</>}
          </button>
        </div>
      </div>

      {/* Routing */}
      <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle">Reward routing · send earnings to the bonus wallet · Mwelekeo</p>
      <RouteCard icon={I.percent} title="Affiliate rewards" sw="Tume za marafiki"
        desc="Referral commission, bonuses and prizes land in the bonus wallet (must be played through)."
        on={c.affiliateToBonus} onToggle={() => setC((p) => ({ ...p, affiliateToBonus: !p.affiliateToBonus }))} />
      <RouteCard icon={I.ticket} title="Proposal prizes" sw="Tuzo za mapendekezo"
        desc="Player-proposal prizes land in the bonus wallet (must be played through)."
        on={c.proposalToBonus} onToggle={() => setC((p) => ({ ...p, proposalToBonus: !p.proposalToBonus }))} />
    </div>
  );
}

export function GrantBonusForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(10_000);
  const [multiplier, setMultiplier] = useState<number | "">("");
  const [expiry, setExpiry] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Validate first, then ask for an explicit confirm — a manual grant creates
  // real bonus liability the player must play through, so it must not issue on
  // a single stray click (parity with settlement / kill-switch / provider-switch).
  const grant = () => {
    if (!phone.trim()) { toast({ title: "Enter a phone number", variant: "danger" }); return; }
    if (!(amount > 0)) { toast({ title: "Enter a positive amount", variant: "danger" }); return; }
    setConfirmOpen(true);
  };
  const doGrant = () => {
    start(async () => {
      const r = await grantBonusToPlayerAction({
        phone: phone.trim(),
        amountTzs: Math.round(amount),
        wagerMultiplier: multiplier === "" ? undefined : Number(multiplier),
        expiryDays: expiry === "" ? undefined : Number(expiry),
        note: note.trim() || undefined,
      });
      if (r.ok) {
        setPhone(""); setNote(""); setMultiplier(""); setExpiry("");
        router.refresh();
        deferToast({ title: `Bonus granted to ${r.handle}`, variant: "success" });
      } else {
        toast({ title: "Couldn't grant bonus", description: r.error, variant: "danger" });
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="w-full">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted">Player phone</div>
          <Input aria-label="Player phone" prefix="+255" mono size="sm" placeholder="712 345 678" value={phone}
            onChange={(e) => setPhone(e.target.value)} />
          <div className="mt-1.5 text-[10.5px] text-text-subtle">Any TZ format · 0712…, 255…, +255…</div>
        </div>
        <NumField label="Amount" prefix="TZS" value={amount} onChange={setAmount} />
        <NumField label="Multiplier" hint="Blank = default" suffix="×"
          value={multiplier === "" ? 0 : multiplier} onChange={(n) => setMultiplier(n === 0 ? "" : n)} />
        <NumField label="Expiry" hint="Blank = default" suffix="days"
          value={expiry === "" ? 0 : expiry} onChange={(n) => setExpiry(n === 0 ? "" : n)} />
        <div className="w-full sm:col-span-2 lg:col-span-1">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted">Note (optional)</div>
          <Input aria-label="Note (optional)" size="sm" placeholder="e.g. retention gift" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <Button variant="primary" size="sm" leading={<I.plus s={14} />} loading={pending} onClick={grant}>Grant bonus</Button>
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); doGrant(); }}
        tone="warning"
        title="Grant bonus · Toa bonasi"
        confirmLabel="Yes, grant"
        body={
          <>Credit <b>{formatTzs(Math.round(amount || 0))}</b> to the bonus wallet of <b>+255 {phone.trim() || "—"}</b>
          {multiplier === "" ? "" : ` at ${Number(multiplier)}× wagering`}? This creates real bonus liability the player must play through before it can be withdrawn.</>
        }
      />
    </div>
  );
}
