"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I, plateGlyph } from "@/components/ui/glyphs";
import { IconPlate } from "@/components/ui/icon-plate";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import { useDeferredToast } from "@/components/ui/toast";
import type { AffiliateConfig, BonusRecipient, BonusTrigger, PrizeMilestone } from "@/lib/server/affiliate-config";
import { UnsavedChangesGuard, PendingChangesBar } from "@/components/ui/unsaved-changes";
import { saveAffiliateConfigAction } from "./actions";
// ⭐ THE PLATFORM'S ONE MONEY FORMATTER. The banner below quotes the officer's own figures back
// to them, and a hand-rolled `toLocaleString()` beside it would be a second spelling of TZS.
import { formatTzs as fmt } from "@/lib/utils";

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
        aria-label={label}
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
    <div className="inline-flex gap-1 rounded-md border border-border bg-bg-overlay p-1">
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
        {/* ⭐ THE KIT ATOM, NOT A NINTH RETYPING. `IconPlate` was built in stage 9 to end this
            exact micro-pattern, and its own note lists THIS FILE among the eight it consolidated
            — but the migration never reached the six sites that actually carried a wrong radius;
            only the two already on `rounded-control` moved. ⚠️ So the radius goes 9px → `--r-md`
            (12px), which is a RENDERED change of 3px on a 36px box and is the point: B10.2 says
            each family has ONE radius, and "a quarter of the size" is the reasoning that produced
            four. The glyph stays the caller's, derived by `plateGlyph`. */}
        <IconPlate
          size={36}
          bg={active ? "color-mix(in oklab, var(--royal-500) 18%, transparent)" : "var(--bg-overlay)"}
          fg={active ? "var(--royal-300)" : "var(--text-muted)"}
        >
          <Icon s={plateGlyph(36)} />
        </IconPlate>
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

export function AffiliateAdminClient({ config, rewardsLive = false }: {
  config: AffiliateConfig;
  /** ⭐ Resolved on the SERVER (`playerInviteRewardsLive()`) and threaded, like every other product
   *  state a client component needs: this file is `"use client"` and may not read `feature-state`.
   *  ⛔ Defaults to FALSE — the safe direction: a lost prop understates what the platform pays. */
  rewardsLive?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const [c, setC] = useState<AffiliateConfig>(config);
  /* ⭐ THE WHOLE CONFIG IS ONE STATE OBJECT, so the comparison is exact and needs no hook:
     every field the officer can touch lives in `c`, and `config` is what the server last saved. */
  const unsaved = JSON.stringify(c) !== JSON.stringify(config);

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
      {/* One signal, two surfaces. This page is long enough that Save scrolls away. */}
      <PendingChangesBar
        dirty={unsaved}
        saving={pending}
        detail="Affiliate bonuses and prize milestones apply to every referral."
        onSave={save}
        onDiscard={() => setC(config)}
      />
      <UnsavedChangesGuard dirty={unsaved} body="The affiliate configuration has been changed but not saved. Leaving now discards the change." />
      {/* Master switch + Save.
          ⭐ 2026-09-26 — WRAPS, because at a phone's width the plate, the toggle and Save left the
          sentence ~110px, one or two words a line, measured on production at 390. The text now keeps
          at least 14rem and the two controls drop to their own line (right-aligned) when they do not
          fit beside it; on a laptop nothing moves. */}
      <div
        className="flex flex-wrap items-center gap-4 rounded-lg border p-4"
        style={{
          borderColor: on ? "color-mix(in oklab, var(--royal-500) 28%, var(--border))" : "color-mix(in oklab, var(--warning-500) 36%, var(--border))",
          background: on ? "var(--bg-elevated)" : "color-mix(in oklab, var(--warning-500) 8%, var(--bg-elevated))",
        }}
      >
        <IconPlate
          size={44}
          bg={on ? "color-mix(in oklab, var(--royal-500) 18%, transparent)" : "color-mix(in oklab, var(--warning-500) 20%, transparent)"}
          fg={on ? "var(--royal-300)" : "var(--warning-fg)"}
        >
          {on ? <I.megaphone s={plateGlyph(44)} /> : <I.pause s={plateGlyph(44)} />}
        </IconPlate>
        <div className="flex-1 min-w-0 basis-[14rem]">
          <div className="text-[15px] font-bold">
            Program master switch · <span className="font-normal italic text-text-subtle text-body-sm">Swichi kuu</span>
          </div>
          {/* 🔴 "rewards are accruing" WAS A FALSE STATEMENT ON A MONEY SCREEN, and only looking at
              the rendered page found it. With `inviteRewards` WITHDRAWN (2026-09-25) nothing accrues
              on this programme whatever this switch says — it is the operator's switch INSIDE the
              paid promo, and the product state sits above it. An officer reading "rewards are
              accruing" would reasonably conclude the platform was paying referrers, and act on it.
              ⛔ The switch itself is NOT disabled: it is a real setting, it is saved, and it governs
              the promo the day it is switched back on. What changes is that the sentence stops
              claiming an outcome the product has already refused. */}
          <div className="mt-0.5 text-[12px] text-text-muted">
            {!rewardsLive
              ? "Unpaid — every player in good standing has a referral link, and the platform credits nothing for a referral (product state inviteRewards = WITHDRAWN). This switch is stored for the day rewards are turned back on."
              : on
                ? "Live — every player has an active referral link and rewards are accruing."
                : "Paused — links still resolve, but no new rewards accrue. Players see a paused banner."}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Toggle on={on} onClick={() => setMaster(!on)} aria-label="Program master switch" />
          <Button variant="primary" size="sm" leading={<I.check s={14} />} loading={pending} onClick={save}>
            Save
          </Button>
        </div>
      </div>

      {/* Reward modes. DG-A-14: this eyebrow read "Reward modes · independently toggleable ·
          Njia za zawadi" — a bilingual label with its hint welded into the middle of it, so the
          hint was reading copy wearing the sub-floor microlabel recipe. The label keeps that
          recipe (and now matches the "English · Swahili" shape used everywhere else in this
          file); the hint moved to its own line on the reading rung. The wrapper keeps the pair
          as ONE child of the outer `space-y-3`, so the surrounding rhythm is unchanged. */}
      <div>
        <p className="font-mono text-micro uppercase eyebrow text-text-subtle">Reward modes · Njia za zawadi</p>
        <p className="mt-0.5 text-body-sm text-text-subtle">
          {rewardsLive ? "independently toggleable" : "stored, but not consulted while the invite is unpaid"}
        </p>
      </div>

      {/* 🔴 A CONTROL THAT DOES NOTHING IS WORSE THAN NO CONTROL, and until this banner these three
          cards were exactly that: an officer could switch commission on, type 50%, press Save, get a
          success toast — and not one shilling would move, because `policyFor` refuses the PLAYER
          branch ABOVE the config. The numbers were real, the save was real, the effect was zero, and
          nothing on the screen said so. Whoever typed a rate would reasonably believe 50pick had
          started paying referrers.
          ⭐ SO THE CARDS ARE DISABLED AND THE REASON IS NAMED. They keep their stored values — this
          is not a deletion, and flipping `inviteRewards` back to ACTIVE returns them exactly as the
          officer left them. ⛔ It also names the ONE thing that changes it, because the honest answer
          to "which button turns payment on?" is that there is no button: it is a code state and a
          deploy, deliberately out of one-click reach of a misclick, and it is a regulated inducement
          that needs Gaming Board clearance before it is switched on at all. */}
      {!rewardsLive && (
        <div
          className="flex gap-2.5 rounded-xl border p-3"
          style={{
            background: "color-mix(in oklab, var(--warning-500) 12%, transparent)",
            borderColor: "color-mix(in oklab, var(--warning-500) 30%, transparent)",
          }}
        >
          <span className="shrink-0 text-warning-fg mt-0.5"><I.info s={16} /></span>
          <div className="text-caption text-text-secondary leading-relaxed">
            <p className="font-bold text-text mb-1">These three switches are stored, not applied.</p>
            The player invite is <strong className="text-text">unpaid</strong>: every referral accrual
            is refused before these values are read, so changing a rate or an amount here moves no
            money and pays no player. Your numbers are kept exactly as you set them.
            <br />
            <span className="text-text">To actually pay referrers</span> the product state
            <code className="font-mono mx-1">inviteRewards</code> must go to
            <code className="font-mono mx-1">ACTIVE</code> — a one-word code change and a deploy,
            not a setting on this page. ⛔ Rewarding referrals is a regulated inducement: clear the
            structure with the Gaming Board of Tanzania first.
            <br />
            {/* ⭐ WHAT WOULD HAPPEN THE MOMENT IT IS SWITCHED ON, priced from the values on screen.
                An officer who has armed a mode is entitled to know what their own numbers would do —
                "it is off" is only half an answer, and the half that leaves them guessing. Read from
                the live config, so it moves as they type and can never quote a stale figure. */}
            {(c.commission.enabled || c.prize.enabled || c.bonus.enabled) && (
              <>
                <br />
                {/* ⛔ THE CLAUSES ARE JOINED, NOT CONCATENATED WITH TRAILING SEMICOLONS. Appending
                    "…;" to each enabled mode reads correctly only when all three are on: with one
                    mode it printed "a TZS 10,000 prize on the recruit's first bet; — and it would
                    apply…", a semicolon against a dash. The list is built first and punctuated
                    once, so it reads as a sentence at one, two or three modes. */}
                <span className="text-text">If it were switched on right now</span>, with the values
                on this screen, each qualifying referral would pay{" "}
                {(() => {
                  const parts: React.ReactNode[] = [];
                  if (c.commission.enabled) parts.push(<><strong className="text-text">{Math.round(c.commission.rate * 100)}%</strong> of the operator margin their recruits generate{c.commission.windowMonths > 0 ? ` for ${c.commission.windowMonths} months` : " for life"}</>);
                  if (c.prize.enabled && c.prize.amountTzs > 0) parts.push(<>a <strong className="text-text">{fmt(c.prize.amountTzs)}</strong> prize on {c.prize.milestone === "FIRST_BET" ? "the recruit's first bet" : "a qualifying deposit"}</>);
                  if (c.bonus.enabled && c.bonus.referrerAmountTzs > 0 && (c.bonus.recipient === "REFERRER" || c.bonus.recipient === "BOTH")) parts.push(<><strong className="text-text">{fmt(c.bonus.referrerAmountTzs)}</strong> to the referrer on {c.bonus.trigger === "SIGNUP" ? "sign-up" : "first deposit"}</>);
                  return parts.map((p, i) => (
                    <span key={i}>{i > 0 && (i === parts.length - 1 ? ", and " : ", ")}{p}</span>
                  ));
                })()}
                .{" "}
                {/* 🔴 THIS SENTENCE SAID "never retroactively to the people already in the roster
                    below", AND THAT WAS FALSE — a wrong statement about money on the screen an
                    officer would read before switching payment on. Two facts, and they are not the
                    same: no BACK-PAY happens (accruals fire from live hooks; nothing re-walks past
                    bets), but every recruit ALREADY bound becomes payable on their NEXT bet,
                    deposit or settlement — and their commission window is already running, because
                    `commissionWindowEnd` measures from `attribution.boundAt`, not from the day the
                    switch moved. The roster below is therefore the population that would start
                    paying, not a population that is excluded. Found by an adversarial audit that
                    drove the flip and watched already-bound recruits pay out immediately. */}
                <strong className="text-text">
                  Everyone already in the roster below would start paying
                </strong>{" "}
                on their next bet, deposit or settlement — their window runs from the day they were
                invited, not from the day you switch this on. Activity that has already happened is
                not back-paid.
              </>
            )}
            <br />
            <span className="text-text-subtle">
              What still works today: every player in good standing has a link (closed, suspended and
              self-excluded accounts do not), and the roster below counts who they brought. Cash paid to an
              inviter outside the platform is recorded nowhere in 50pick.
            </span>
          </div>
        </div>
      )}

      <RewardCard
        icon={I.percent} title="Commission" sw="Tume"
        desc="Referrer earns a share of the operator margin their recruits generate."
        on={c.commission.enabled} onToggle={() => patchCommission({ enabled: !c.commission.enabled })} disabled={!on || !rewardsLive}
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
        on={c.bonus.enabled} onToggle={() => patchBonus({ enabled: !c.bonus.enabled })} disabled={!on || !rewardsLive}
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
        on={c.prize.enabled} onToggle={() => patchPrize({ enabled: !c.prize.enabled })} disabled={!on || !rewardsLive}
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
        {c.prize.milestone === "FIRST_BET" && (
          <Field label="Min bet amount" hint="Recruit's bet must be ≥ this (§4.2c)" prefix="TZS" width={180} value={c.prize.minBetAmountTzs ?? 0} onChange={(n) => patchPrize({ minBetAmountTzs: n })} />
        )}
        <div className="flex items-center gap-2.5">
          <Toggle on={c.prize.requireDeposit ?? true} onClick={() => patchPrize({ requireDeposit: !(c.prize.requireDeposit ?? true) })} aria-label="Require deposit" />
          <div>
            <div className="text-[12px] font-semibold">Require deposit (§4.2b)</div>
            <div className="text-body-sm text-text-muted">Recruit must have deposited before prize fires</div>
          </div>
        </div>
        <Field label="Cap per referrer" hint="Max prizes (0 = none)" suffix="prizes" width={180} value={c.prize.capPerReferrer} onChange={(n) => patchPrize({ capPerReferrer: n })} />
      </RewardCard>
    </div>
  );
}
