"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I, plateGlyph } from "@/components/ui/glyphs";
import { IconPlate } from "@/components/ui/icon-plate";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import { useDeferredToast } from "@/components/ui/toast";
import {
  PLAYER_MAX_COMMISSION_RATE,
  PLAYER_WINDOW_MAX_MONTHS,
  PLAYER_WINDOW_MIN_MONTHS,
  affiliateConfigFingerprint,
  changedRewardFields,
  priceInviteRewards,
  validateAffiliateConfig,
  type AffiliateConfig,
  type BonusRecipient,
} from "@/lib/affiliate-rules";
import type { InvitePayableCopy, InvitePayableInput } from "@/lib/server/invite-rewards-ceremony";
import { UnsavedChangesGuard, PendingChangesBar } from "@/components/ui/unsaved-changes";
import { saveAffiliateConfigAction, setInvitePayableAction } from "./actions";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { PayableSwitch } from "./payable-switch";

/**
 * Interactive affiliate editor: the Owner's Payable / Not payable state card, the three reward modes and
 * ONE Save. The page chrome (AdminPageHead, KPIs, roster, ledger) is rendered by the server page on the
 * shared admin shell; this client owns only the editable state.
 *
 * ⛔ THE TWO STATES ARE THE MASTER (2026-09-26). The old master-switch row is gone: Not payable LOCKS every
 * reward setting — read-only fields, disabled switches and choices, no Save and no pending-changes bar —
 * and Payable unlocks them behind the one Save below. The Save never sends the service-level pause
 * (`enabled`); the ceremony is its only writer, and the server drops it from a post anyway.
 */

function Field({
  label, hint, prefix, suffix, value, onChange, width, readOnly, error,
}: {
  label: string; hint?: string; prefix?: string; suffix?: string;
  value: number; onChange: (n: number) => void; width?: number;
  /** Not payable: the value stays legible and cannot be changed. */
  readOnly?: boolean;
  /** Why the server would refuse THIS field — shown under it, and the Save stays disabled. */
  error?: string;
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
        allowDecimal
        readOnly={readOnly}
        error={error}
        value={value}
        onChange={(e) => {
          if (readOnly) return;
          /* ⛔ WHOLE NUMBERS ONLY, AND WHAT IS SHOWN IS WHAT IS HELD (addendum F, 2026-09-26). Every field
             here is whole shillings, months, a count or a whole percent. The atom alone strips the dot, so a
             pasted "7.5" became "75" — clamped to a 50% commission. The dot is let through to HERE and
             everything from it on is dropped: "7.5" is 7, on screen and in the draft alike. */
          const whole = e.target.value.split(".")[0].replace(/\D/g, "");
          const n = whole === "" ? 0 : Number(whole);
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
      {error ? (
        <p className="mt-1.5 text-body-sm text-danger-fg">{error}</p>
      ) : hint ? (
        <div className="mt-1.5 text-[10.5px] text-text-subtle">{hint}</div>
      ) : null}
    </div>
  );
}

function Seg<T extends string>({ value, onChange, options, disabled }: {
  value: T; onChange: (v: T) => void; options: Array<{ v: T; l: string }>;
  /** Not payable: the stored choice stays painted, and no segment can be pressed. */
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex gap-1 rounded-md border border-border bg-bg-overlay p-1">
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(o.v)}
            className={`h-7 rounded-md px-3 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${active ? "text-white" : disabled ? "text-text-muted" : "text-text-muted hover:text-text"}`}
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
  icon: Icon, title, sw, desc, on, onToggle, locked, children,
}: {
  icon: (typeof I)[keyof typeof I]; title: string; sw: string; desc: string;
  on: boolean; onToggle: () => void;
  /** Not payable: the switch is disabled and the card is not painted as live. */
  locked: boolean;
  children?: React.ReactNode;
}) {
  /* ⭐ A MODE SWITCHED ON WHILE NOT PAYABLE PAYS NOTHING, so it is not painted as live — but the card is
     not dimmed either: its values stay legible, because the Owner reads them to decide whether "the
     settings on this page" is what should pay. The locked fields carry the kit's own locked look. */
  const active = on && !locked;
  return (
    <div
      className="overflow-hidden rounded-lg border bg-bg-elevated"
      style={{ borderColor: active ? "color-mix(in oklab, var(--royal-500) 30%, var(--border))" : "var(--border)" }}
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
        <Toggle on={on} onClick={onToggle} disabled={locked} aria-label={`${title} enabled`} />
      </div>
      {on && <div className="flex flex-wrap gap-4 p-4">{children}</div>}
    </div>
  );
}

export function AffiliateAdminClient({ config, baseFingerprint, copy, rosterRecruits }: {
  /** The stored reward settings — the SAME object the server priced and fingerprinted for `copy`. */
  config: AffiliateConfig;
  /** `affiliateConfigFingerprint(config)`, from the server — posted back by the Save as `baseFingerprint`. */
  baseFingerprint: string;
  /**
   * ⭐ Every sentence of the switch, built on the server (`invitePayableDialogs`). ⛔ Never the view it is
   * built from: that carries the Owner's user id, and a client prop ships to the browser.
   */
  copy: InvitePayableCopy;
  /** Recruits per inviter already in the roster — prices the draft's exposure line. */
  rosterRecruits: number[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const locked = copy.locked;
  const configKey = JSON.stringify(config);
  const [c, setC] = useState<AffiliateConfig>(config);
  /* ⭐ THE DRAFT FOLLOWS THE SERVER WHEN THE SERVER MOVES. A ceremony changes the stored settings under an
     open page — "Nothing yet" switches every mode off, and Stop paying locks the form — and a draft seeded
     once would then sit on screen as unsaved edits nobody made. So when the stored settings or the lock
     change, a clean draft takes the new settings, and a locked form always shows what is stored; an
     unsaved edit survives only a refresh that leaves the form editable. Adjusted during render (React's
     "state from a changed prop" pattern), so no frame paints the stale draft. */
  const [seed, setSeed] = useState({ key: configKey, locked });
  /* ⛔ THE SAVE'S BASE — the settings this draft was taken from, and their fingerprint (review P3,
     2026-09-26). The Save posts ONLY the fields changed against it, with its fingerprint; the server refuses
     a fingerprint that no longer matches the row. It follows the server only when the draft follows too
     (a clean or locked form): a draft holding edits keeps its OLD base, so its Save is refused with "These
     settings changed since this page loaded" rather than quietly writing its page-load values over them. */
  const [base, setBase] = useState<{ config: AffiliateConfig; fingerprint: string }>({ config, fingerprint: baseFingerprint });
  if (seed.key !== configKey || seed.locked !== locked) {
    const clean = JSON.stringify(c) === JSON.stringify(base.config);
    setSeed({ key: configKey, locked });
    if (locked || clean) {
      setC(config);
      setBase({ config, fingerprint: baseFingerprint });
    }
  }
  /* ⭐ THE WHOLE CONFIG IS ONE STATE OBJECT, so the comparison is exact and needs no hook:
     every field the officer can touch lives in `c`, and `base.config` is what this draft was taken from. */
  const unsaved = !locked && JSON.stringify(c) !== JSON.stringify(base.config);
  /** The form's own Save — the bar's `saveAnchor`, so the two are never on screen together. */
  const saveRef = useRef<HTMLButtonElement>(null);

  const patchCommission = (u: Partial<AffiliateConfig["commission"]>) => setC((p) => ({ ...p, commission: { ...p.commission, ...u } }));
  const patchBonus = (u: Partial<AffiliateConfig["bonus"]>) => setC((p) => ({ ...p, bonus: { ...p.bonus, ...u } }));
  const patchPrize = (u: Partial<AffiliateConfig["prize"]>) => setC((p) => ({ ...p, prize: { ...p.prize, ...u } }));

  /* ⭐ THE LIVE PREVIEW PRICES THE DRAFT WITH THE PAYER'S OWN RULES — the pure module the server validates
     every save with and prices the Make-payable dialog from, so the three cannot describe one config three
     ways. ⛔ A draft the server would refuse is not priced at all: its reason is shown instead, because a
     price for settings that cannot be stored is a money statement about nothing. */
  const check = validateAffiliateConfig(c);
  /** ⛔ The refusal sits AT the field that causes it (addendum E); the Save stays disabled while there is one. */
  const fieldError = (field: string): string | undefined => (!locked && !check.ok && check.field === field ? check.reason : undefined);
  const preview = priceInviteRewards(c, { destination: copy.destination, rosterRecruitsPerInviter: rosterRecruits });

  /** Discard takes what the server last rendered — and re-bases on it, so a Save after it posts a current base. */
  const discard = () => { setC(config); setBase({ config, fingerprint: baseFingerprint }); };

  /* `runAdminAction` turns a thrown action into the `{ ok:false, error }` the toast renders
     (a redirect is rethrown). On success the base moves to what the server stored, and `c` is re-seeded
     from it only if it is still what was sent: an edit made while the save ran stays on screen and dirty.
     ⛔ The post is `{ baseFingerprint, changes }` — only the fields changed against the base, never
     `enabled` — and a draft the server would refuse is not sent at all. */
  const save = () => {
    if (locked || !unsaved || !check.ok) return;
    const sent = JSON.stringify(c);
    const post = { baseFingerprint: base.fingerprint, changes: changedRewardFields(base.config, c) };
    start(async () => {
      const r = await runAdminAction(() => saveAffiliateConfigAction(post));
      if (r.ok) {
        setBase({ config: r.config, fingerprint: affiliateConfigFingerprint(r.config) });
        setC((cur) => (JSON.stringify(cur) === sent ? r.config : cur));
        router.refresh();
        if (r.warning) toast({ title: "Affiliate config saved · Imehifadhiwa", description: r.warning, variant: "warning" });
        else deferToast({ title: "Affiliate config saved · Imehifadhiwa", variant: "success" });
      } else {
        toast({ title: "Couldn't save", description: r.error, variant: "danger" });
      }
    });
  };

  /** The ceremony's action, made throw-safe HERE — see the note at the top of `payable-switch.tsx`. */
  const setPayable = (input: InvitePayableInput) => runAdminAction(() => setInvitePayableAction(input));

  return (
    <div className="space-y-3">
      {/* One signal, two surfaces. The bar's Save shows only while the form's own Save (at the foot of
          the reward modes, `saveAnchor`) is off screen; both say "Save changes" and call `save`.
          ⛔ Not payable renders no bar at all — there is nothing to save. And a draft the server would
          refuse offers no Save in the bar either (`onSave` unset): its reason is at the field. */}
      {!locked && (
        <PendingChangesBar
          dirty={unsaved}
          saving={pending}
          detail="Affiliate bonuses and prize milestones apply to every referral."
          saveLabel="Save changes"
          onSave={check.ok ? save : undefined}
          onDiscard={discard}
          saveAnchor={saveRef}
        />
      )}
      <UnsavedChangesGuard dirty={unsaved} body="The affiliate configuration has been changed but not saved. Leaving now discards the change." />

      <PayableSwitch copy={copy} act={setPayable} />

      {/* Reward modes. DG-A-14: this eyebrow read "Reward modes · independently toggleable ·
          Njia za zawadi" — a bilingual label with its hint welded into the middle of it, so the
          hint was reading copy wearing the sub-floor microlabel recipe. The label keeps that
          recipe (and now matches the "English · Swahili" shape used everywhere else in this
          file); the hint moved to its own line on the reading rung. The wrapper keeps the pair
          as ONE child of the outer stack, so the surrounding rhythm is unchanged. */}
      <div>
        <p className="font-mono text-micro uppercase eyebrow text-text-subtle">Reward modes · Njia za zawadi</p>
        {locked ? (
          <p className="mt-0.5 flex items-center gap-1.5 text-body-sm text-text-muted">
            <span aria-hidden className="shrink-0 text-warning-fg"><I.lock s={14} /></span>
            {copy.lockedCaption}
          </p>
        ) : (
          <p className="mt-0.5 text-body-sm text-text-subtle">independently toggleable</p>
        )}
      </div>

      <RewardCard
        icon={I.percent} title="Commission" sw="Tume"
        desc="Referrer earns a share of the operator margin their recruits generate."
        on={c.commission.enabled} onToggle={() => patchCommission({ enabled: !c.commission.enabled })} locked={locked}
      >
        {/* ⛔ 50% OF MARGIN IS THE PLATFORM CEILING, AND THE FIELD CANNOT HOLD MORE — the same rule the
            server refuses on save and the payer clamps again. */}
        <Field label="Commission rate" hint={`Share of operator margin · whole percent, max ${Math.round(PLAYER_MAX_COMMISSION_RATE * 100)}%`} suffix="%" width={140} readOnly={locked}
          error={fieldError("commission.rate")}
          value={Math.round(c.commission.rate * 100)} onChange={(n) => patchCommission({ rate: Math.max(0, Math.min(Math.round(PLAYER_MAX_COMMISSION_RATE * 100), n)) / 100 })} />
        {/* ⛔ 1–60 MONTHS, NEVER "FOR LIFE": the player promo has no lifetime term, and 0 is refused. */}
        <Field label="Window" hint={`${PLAYER_WINDOW_MIN_MONTHS}–${PLAYER_WINDOW_MAX_MONTHS} months from the invite`} suffix="months" width={130} readOnly={locked}
          error={fieldError("commission.windowMonths")}
          value={c.commission.windowMonths} onChange={(n) => patchCommission({ windowMonths: n })} />
        <Field label="Per-recruit cap" hint="Max earnable per recruit (0 = none)" prefix="TZS" width={180} readOnly={locked}
          error={fieldError("commission.capPerRecruitTzs")}
          value={c.commission.capPerRecruitTzs} onChange={(n) => patchCommission({ capPerRecruitTzs: n })} />
      </RewardCard>

      <RewardCard
        icon={I.gift} title="Bonus / discount" sw="Bonasi"
        desc="A sign-up credit to the new player and/or the referrer."
        on={c.bonus.enabled} onToggle={() => patchBonus({ enabled: !c.bonus.enabled })} locked={locked}
      >
        <div className="w-full">
          <div className="mb-1.5 text-[12px] font-semibold">Who gets it</div>
          <Seg<BonusRecipient> value={c.bonus.recipient} onChange={(v) => patchBonus({ recipient: v })} disabled={locked}
            options={[{ v: "NEW", l: "New player" }, { v: "REFERRER", l: "Referrer" }, { v: "BOTH", l: "Both" }]} />
        </div>
        <Field label="New-player amount" prefix="TZS" width={160} readOnly={locked} error={fieldError("bonus.newAmountTzs")} value={c.bonus.newAmountTzs} onChange={(n) => patchBonus({ newAmountTzs: n })} />
        <Field label="Referrer amount" prefix="TZS" width={160} readOnly={locked} error={fieldError("bonus.referrerAmountTzs")} value={c.bonus.referrerAmountTzs} onChange={(n) => patchBonus({ referrerAmountTzs: n })} />
        {/* ⛔ Sign-up is the ONLY trigger (2026-09-26): the RG policy promises no bonus offers tied to deposits. */}
        <div className="w-full">
          <div className="mb-1.5 text-[12px] font-semibold">Trigger</div>
          <div className="text-body-sm text-text-muted">Sign-up · a deposit never triggers a referral reward (Responsible Gambling policy)</div>
        </div>
      </RewardCard>

      <RewardCard
        icon={I.ticket} title="Prize" sw="Tuzo"
        desc="A fixed reward to the referrer when a recruit hits a milestone."
        on={c.prize.enabled} onToggle={() => patchPrize({ enabled: !c.prize.enabled })} locked={locked}
      >
        {/* ⛔ The first bet is the ONLY milestone (2026-09-26): a prize for depositing is retired. */}
        <div className="w-full">
          <div className="mb-1.5 text-[12px] font-semibold">Milestone</div>
          <div className="text-body-sm text-text-muted">A friend&apos;s first bet · never a deposit amount (Responsible Gambling policy)</div>
        </div>
        <Field label="Fixed prize" prefix="TZS" width={150} readOnly={locked} error={fieldError("prize.amountTzs")} value={c.prize.amountTzs} onChange={(n) => patchPrize({ amountTzs: n })} />
        <Field label="Min bet amount" hint="Recruit's bet must be ≥ this (§4.2c)" prefix="TZS" width={180} readOnly={locked} error={fieldError("prize.minBetAmountTzs")} value={c.prize.minBetAmountTzs ?? 0} onChange={(n) => patchPrize({ minBetAmountTzs: n })} />
        <div className="flex items-center gap-2.5">
          <Toggle on={c.prize.requireDeposit ?? true} onClick={() => patchPrize({ requireDeposit: !(c.prize.requireDeposit ?? true) })} disabled={locked} aria-label="Require deposit" />
          <div>
            <div className="text-[12px] font-semibold">Require deposit (§4.2b)</div>
            <div className="text-body-sm text-text-muted">Anti-fraud check: the recruit must have deposited before the first-bet prize fires (not a reward for depositing)</div>
          </div>
        </div>
        <Field label="Cap per referrer" hint="Max prizes (0 = none)" suffix="prizes" width={180} readOnly={locked} error={fieldError("prize.capPerReferrer")} value={c.prize.capPerReferrer} onChange={(n) => patchPrize({ capPerReferrer: n })} />
      </RewardCard>

      {/* Payable only: what the settings ON SCREEN would pay, then the form's one Save. */}
      {!locked && (
        <div className="rounded-lg border border-border bg-bg-elevated p-4">
          <p className="font-mono text-micro uppercase eyebrow text-text-subtle">{unsaved ? "This will pay once saved" : "This will pay"}</p>
          {check.ok ? (
            <>
              <p className="mt-1.5 text-body-sm font-semibold text-text">{preview.headline}</p>
              {preview.lines.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-body-sm text-text-secondary">
                  {preview.lines.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              )}
              {!preview.nothingPays && <p className="mt-1.5 text-body-sm text-text-muted">{preview.exposureLine}</p>}
            </>
          ) : (
            <p className="mt-1.5 text-body-sm text-danger-fg">{check.reason}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" size="sm" disabled={!unsaved || pending} onClick={discard}>Discard</Button>
            {/* Disabled while nothing has changed, so it cannot pass for a save still to do — and while the
                draft would be refused (addendum E): the reason is at the field. */}
            <Button ref={saveRef} variant="primary" size="sm" leading={<I.check s={14} />} loading={pending} disabled={!unsaved || !check.ok} onClick={save}>Save changes</Button>
          </div>
        </div>
      )}
    </div>
  );
}
