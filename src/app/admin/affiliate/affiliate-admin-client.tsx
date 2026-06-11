"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Toggle } from "@/components/ui/toggle";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import type { AffiliateConfig, BonusRecipient, BonusTrigger, PrizeMilestone } from "@/lib/server/affiliate-config";
import type { AdminAffiliateStats } from "@/lib/server/affiliate-service";
import { saveAffiliateConfigAction } from "./actions";

const fmt = (n: number) => n.toLocaleString("en-US");

function Cap({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-subtle">{children}</span>;
}

function Kpi({ label, value, sub, gold }: { label: string; value: string; sub: string; gold?: boolean }) {
  return (
    <div className="rounded-xl glass-panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <Cap>{label}</Cap>
        <span className="text-text-subtle">{gold ? <I.coins s={14} /> : <I.users s={14} />}</span>
      </div>
      <div className={`font-mono text-[24px] font-bold leading-none tracking-[-0.02em] ${gold ? "text-gold-300" : "text-text"}`}>{value}</div>
      <div className="mt-1.5 font-mono text-[10.5px] text-text-subtle">{sub}</div>
    </div>
  );
}

function Field({
  label, hint, prefix, suffix, value, onChange, width,
}: {
  label: string; hint?: string; prefix?: string; suffix?: string;
  value: number; onChange: (n: number) => void; width?: number;
}) {
  return (
    <div style={{ width: width ?? "100%" }}>
      <div className="mb-1.5 text-[12px] font-semibold text-text">{label}</div>
      <span className="input-group" style={{ height: 38 }}>
        {prefix && <span className="prefix">{prefix}</span>}
        <input
          className="input input-mono"
          style={{ fontSize: 13 }}
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^\d.]/g, ""));
            onChange(Number.isFinite(n) ? n : 0);
          }}
        />
        {suffix && <span className="pr-3 font-mono text-[11px] text-text-subtle">{suffix}</span>}
      </span>
      {hint && <div className="mt-1.5 text-[10.5px] text-text-subtle">{hint}</div>}
    </div>
  );
}

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ v: T; l: string }> }) {
  return (
    <div className="inline-flex gap-[3px] rounded-xl border border-border bg-bg-overlay p-[3px]">
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
      className="overflow-hidden rounded-xl border bg-bg-elevated transition-opacity"
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

const LEDGER_CHIP: Record<string, "resolved" | "pending" | "objection"> = { PAID: "resolved", PENDING: "pending", HELD: "objection" };

export function AffiliateAdminClient({ config, stats }: { config: AffiliateConfig; stats: AdminAffiliateStats }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
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
        setTimeout(() => toast({ title: "Affiliate config saved · Imehifadhiwa", variant: "success" }), 400);
      } else {
        toast({ title: "Couldn't save", description: r.error, variant: "danger" });
      }
    });
  };

  const kpis: Array<[string, string, string, boolean]> = [
    ["Total referrals", fmt(stats.totalReferrals), "all-time", false],
    ["Active affiliates", fmt(stats.activeAffiliates), "earned a reward", false],
    ["Commission paid", fmt(stats.commissionPaidTzs), "TZS · all-time", true],
    ["Top referrer", stats.topReferrer?.handle ?? "—", stats.topReferrer ? `${stats.topReferrer.recruits} recruits` : "none yet", true],
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      {/* Head */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="font-display text-[24px] font-bold">Affiliate Program</div>
            <Chip variant={on ? "active" : "paused"}>{on ? "Active" : "Paused"}</Chip>
          </div>
          <div className="mt-1 text-[12.5px] text-text-muted">
            Referral rewards · <span className="italic">Mpango wa marafiki</span> · /admin/affiliate
          </div>
        </div>
        <Button variant="gold" size="md" leading={<I.check s={15} />} loading={pending} onClick={save}>
          Save · Hifadhi
        </Button>
      </div>

      {/* Master switch */}
      <div
        className="flex items-center gap-4 rounded-xl border p-4"
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
          <div className="text-[16px] font-bold">
            Program master switch · <span className="font-normal italic text-text-subtle text-[13px]">Swichi kuu</span>
          </div>
          <div className="mt-0.5 text-[12.5px] text-text-muted">
            {on
              ? "Live — every player has an active referral link and rewards are accruing."
              : "Paused — links still resolve, but no new rewards accrue. Players see a paused banner."}
          </div>
        </div>
        <span className="font-mono text-[11px] tracking-[0.1em]" style={{ color: on ? "var(--gold-300)" : "oklch(84% 0.15 80)" }}>
          {on ? "ON" : "PAUSED"}
        </span>
        <Toggle on={on} gold onClick={() => setMaster(!on)} aria-label="Program master switch" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([l, v, s, g]) => (
          <Kpi key={l} label={l} value={v} sub={s} gold={g} />
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Reward modes */}
        <div className="flex flex-col gap-3">
          <Cap>Reward modes · independently toggleable · Njia za zawadi</Cap>

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

        {/* Compliance + leaderboard */}
        <div className="flex flex-col gap-3">
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "color-mix(in oklab, var(--no-500) 28%, var(--border))", background: "color-mix(in oklab, var(--no-500) 6%, var(--bg-elevated))" }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-no-300"><I.shieldcheck s={16} /></span>
              <div className="text-[13px] font-bold text-no-300">Compliance note · Kumbuka</div>
            </div>
            <div className="mb-2.5 text-[11.5px] leading-relaxed text-text-muted">
              This is a regulated inducement. Pause or limit the program here until you&rsquo;ve cleared the reward
              structure with the Gaming Board of Tanzania.
            </div>
            <div className="rounded-lg border border-border bg-bg-base p-2.5 text-[11.5px] italic leading-relaxed text-text-muted">
              &ldquo;Keep referrer commission ≤ 50% of margin. Review caps quarterly per GBT guidance.&rdquo;
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-bg-elevated">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="text-[14px] font-bold">Referral leaderboard</div>
              <Cap>Top affiliates</Cap>
            </div>
            {stats.leaderboard.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-text-subtle">No affiliates have earned yet.</div>
            ) : (
              stats.leaderboard.map((b, i) => (
                <div key={b.userId} className={`flex items-center gap-3 px-4 py-2.5 ${i < stats.leaderboard.length - 1 ? "border-b border-border" : ""}`}>
                  <span className={`w-[22px] font-mono text-[14px] font-bold ${i === 0 ? "text-gold-400" : "text-text-subtle"}`}>{String(i + 1).padStart(2, "0")}</span>
                  <Avatar initials={b.handle.replace(/[^a-z0-9]/gi, "").slice(0, 2)} size="sm" seed={b.userId} />
                  <span className="flex-1 truncate font-mono text-[12.5px] font-semibold">{b.handle}</span>
                  <span className="font-mono text-[11.5px] text-text-muted">{b.recruits} recruits</span>
                  <span className="w-[80px] text-right font-mono text-[12.5px] font-semibold text-gold-300">{fmt(b.earnedTzs)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ledger */}
      <div className="overflow-hidden rounded-xl border border-border bg-bg-elevated">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-[14px] font-bold">
            Payout ledger · <span className="font-normal italic text-text-subtle text-[12px]">Daftari la malipo</span>
          </div>
          <Cap>{stats.ledger.length} entries</Cap>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[1fr_1.2fr_1.4fr_1fr_0.9fr_0.9fr] gap-3 border-b border-border bg-bg-overlay px-4 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-subtle">
              <span>Referrer</span><span>Recruit</span><span>Type</span><span className="text-right">Amount</span><span>Date</span><span>Status</span>
            </div>
            {stats.ledger.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12px] text-text-subtle">No payouts yet. Rewards appear here as friends sign up and play.</div>
            ) : (
              stats.ledger.map((r, i) => (
                <div key={r.id} className={`grid grid-cols-[1fr_1.2fr_1.4fr_1fr_0.9fr_0.9fr] items-center gap-3 px-4 py-3 text-[12.5px] ${i < stats.ledger.length - 1 ? "border-b border-border" : ""}`}>
                  <span className="font-mono font-semibold">{r.referrerHandle}</span>
                  <span className="font-mono text-text-muted">{r.recruitMasked}</span>
                  <span className="text-text-muted">{r.type}</span>
                  <span className="text-right font-mono font-semibold text-gold-300">{fmt(r.amountTzs)}</span>
                  <span className="font-mono text-text-subtle">{new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                  <span><Chip variant={LEDGER_CHIP[r.status]}>{r.status.toLowerCase()}</Chip></span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
