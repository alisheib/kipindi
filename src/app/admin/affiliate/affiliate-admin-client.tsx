"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import { useDeferredToast } from "@/components/ui/toast";
import type { AffiliateConfig, BonusRecipient, BonusTrigger, PrizeMilestone } from "@/lib/server/affiliate-config";
import { saveAffiliateConfigAction } from "./actions";

/**
 * Interactive affiliate-config editor (master switch + reward modes + save).
 * The page chrome (AdminPageHead, KPIs, leaderboard, ledger) is rendered by the
 * server page on the shared admin shell; this client owns only the editable state.
 */

function Field({
  label, hint, prefix, suffix, value, onChange, width,
}: {
  label: string; hint?: string; prefix?: string; suffix?: string;
  value: number; onChange: (n: number) => void; width?: number;
}) {
  return (
    <div style={{ width: width ?? "100%" }}>
      <div className="mb-1.5 text-[12px] font-semibold text-text">{label}</div>
      <Input
        prefix={prefix || undefined}
        trailing={suffix ? <span className="text-[11px]">{suffix}</span> : undefined}
        mono
        size="sm"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/[^\d.]/g, ""));
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
      {hint && <div className="mt-1.5 text-[10.5px] text-text-subtle">{hint}</div>}
    </div>
  );
}

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ v: T; l: string }> }) {
  return (
    <div className="inline-flex gap-[3px] rounded-md border border-border bg-bg-overlay p-[3px]">
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`h-7 rounded-md px-3 text-[12px] font-semibold transition-colors ${active ? "text-white" : "text-text-muted hover:text-text"}`}
            style={active ? { background: "var(--royal-500)" } : undefined}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function RewardCard({
  icon: Icon, title, sw, desc, on, onToggle, disabled, children,
}: {
  icon: (typeof I)[keyof typeof I]; title: string; sw: string; desc: string;
  on: boolean; onToggle: () => void; disabled?: boolean; children?: React.ReactNode;
}) {
  const active = on && !disabled;
  return (
    <div
      className="overflow-hidden rounded-lg border bg-bg-elevated transition-opacity"
      style={{
        borderColor: active ? "color-mix(in oklab, var(--royal-500) 30%, var(--border))" : "var(--border)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3.5"
        style={{ borderBottom: on ? "1px solid var(--border)" : "none", background: active ? "var(--bg-overlay)" : "transparent" }}
      >
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px]"
          style={{
            background: active ? "color-mix(in oklab, var(--royal-500) 18%, transparent)" : "var(--bg-overlay)",
            color: active ? "var(--royal-300)" : "var(--text-muted)",
          }}
        >
          <Icon size={19} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-bold">
            {title} <span className="font-normal italic text-text-subtle text-[12px]">· {sw}</span>
          </div>
          <div className="mt-0.5 text-[11.5px] text-text-muted">{desc}</div>
        </div>
        <Toggle on={on} onClick={onToggle} disabled={disabled} aria-label={`${title} enabled`} />
      </div>
      {on && <div className="flex flex-wrap gap-4 p-4">{children}</div>}
    </div>
  );
}

export function AffiliateAdminClient({ config }: { config: AffiliateConfig }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const [c, setC] = useState<AffiliateConfig>(config);

  const on = c.enabled;
  const setMaster = (v: boolean) => setC((p) => ({ ...p, enabled: v }));
  const patchCommission = (u: Partial<AffiliateConfig["commission"]>) => setC((p) => ({ ...p, commission: { ...p.commission, ...u } }));
  const patchBonus = (u: Partial<AffiliateConfig["bonus"]>) => setC((p) => ({ ...p, bonus: { ...p.bonus, ...u } }));
  const patchPrize = (u: Partial<AffiliateConfig["prize"]>) => setC((p) => ({ ...p, prize: { ...p.prize, ...u } }));

  const save = () => {
    start(async () => {
      const r = await saveAffiliateConfigAction(c);
      if (r.ok) {
        router.refresh();
        deferToast({ title: "Affiliate config saved · Imehifadhiwa", variant: "success" });
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
            color: on ? "var(--royal-300)" : "oklch(84% 0.15 80)",
          }}
        >
          {on ? <I.megaphone size={23} /> : <I.pause s={23} />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold">
            Program master switch · <span className="font-normal italic text-text-subtle text-[12.5px]">Swichi kuu</span>
          </div>
          <div className="mt-0.5 text-[12px] text-text-muted">
            {on
              ? "Live — every player has an active referral link and rewards are accruing."
              : "Paused — links still resolve, but no new rewards accrue. Players see a paused banner."}
          </div>
        </div>
        <Toggle on={on} gold onClick={() => setMaster(!on)} aria-label="Program master switch" />
        <Button variant="gold" size="sm" leading={<I.check s={14} />} loading={pending} onClick={save}>
          Save
        </Button>
      </div>

      {/* Reward modes */}
      <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle">Reward modes · independently toggleable · Njia za zawadi</p>

      <RewardCard
        icon={I.percent} title="Commission" sw="Tume"
        desc="Referrer earns a share of the operator margin their recruits generate."
        on={c.commission.enabled} onToggle={() => patchCommission({ enabled: !c.commission.enabled })} disabled={!on}
      >
        <Field label="Commission rate" hint="Share of operator margin" suffix="%" width={140}
          value={Math.round(c.commission.rate * 100)} onChange={(n) => patchCommission({ rate: Math.max(0, Math.min(100, n)) / 100 })} />
        <Field label="Window" hint="How long it accrues" suffix="months" width={130}
          value={c.commission.windowMonths} onChange={(n) => patchCommission({ windowMonths: n })} />
        <Field label="Per-recruit cap" hint="Max earnable per recruit (0 = none)" prefix="TZS" width={180}
          value={c.commission.capPerRecruitTzs} onChange={(n) => patchCommission({ capPerRecruitTzs: n })} />
      </RewardCard>

      <RewardCard
        icon={I.gift} title="Bonus / discount" sw="Bonasi"
        desc="Sign-up or first-deposit credit to the new player and/or referrer."
        on={c.bonus.enabled} onToggle={() => patchBonus({ enabled: !c.bonus.enabled })} disabled={!on}
      >
        <div className="w-full">
          <div className="mb-1.5 text-[12px] font-semibold">Who gets it</div>
          <Seg<BonusRecipient> value={c.bonus.recipient} onChange={(v) => patchBonus({ recipient: v })}
            options={[{ v: "NEW", l: "New player" }, { v: "REFERRER", l: "Referrer" }, { v: "BOTH", l: "Both" }]} />
        </div>
        <Field label="New-player amount" prefix="TZS" width={160} value={c.bonus.newAmountTzs} onChange={(n) => patchBonus({ newAmountTzs: n })} />
        <Field label="Referrer amount" prefix="TZS" width={160} value={c.bonus.referrerAmountTzs} onChange={(n) => patchBonus({ referrerAmountTzs: n })} />
        <div className="w-full">
          <div className="mb-1.5 text-[12px] font-semibold">Trigger</div>
          <Seg<BonusTrigger> value={c.bonus.trigger} onChange={(v) => patchBonus({ trigger: v })}
            options={[{ v: "SIGNUP", l: "Sign-up" }, { v: "FIRST_DEPOSIT", l: "First deposit" }]} />
        </div>
      </RewardCard>

      <RewardCard
        icon={I.ticket} title="Prize" sw="Tuzo"
        desc="A fixed reward to the referrer when a recruit hits a milestone."
        on={c.prize.enabled} onToggle={() => patchPrize({ enabled: !c.prize.enabled })} disabled={!on}
      >
        <div className="w-full">
          <div className="mb-1.5 text-[12px] font-semibold">Milestone</div>
          <Seg<PrizeMilestone> value={c.prize.milestone} onChange={(v) => patchPrize({ milestone: v })}
            options={[{ v: "FIRST_BET", l: "First bet" }, { v: "DEPOSIT_THRESHOLD", l: "Deposits ≥ threshold" }]} />
        </div>
        {c.prize.milestone === "DEPOSIT_THRESHOLD" && (
          <Field label="Deposit threshold" prefix="TZS" width={180} value={c.prize.depositThresholdTzs} onChange={(n) => patchPrize({ depositThresholdTzs: n })} />
        )}
        <Field label="Fixed prize" prefix="TZS" width={150} value={c.prize.amountTzs} onChange={(n) => patchPrize({ amountTzs: n })} />
        <Field label="Cap per referrer" hint="Max prizes (0 = none)" suffix="prizes" width={180} value={c.prize.capPerReferrer} onChange={(n) => patchPrize({ capPerReferrer: n })} />
      </RewardCard>
    </div>
  );
}
