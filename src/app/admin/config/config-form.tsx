"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { UnsavedChangesGuard, PendingChangesBar, useFormDirty } from "@/components/ui/unsaved-changes";
import {
  updateGlobalConfigAction,
  setMarketOverrideAction,
  clearMarketOverrideAction,
} from "./actions";
import type { RateConfig } from "@/lib/server/market-config";
import { formatTzs } from "@/lib/utils";
import { PLATFORM_MIN_STAKE, PLATFORM_MAX_STAKE, rateBp } from "@/lib/payout";
import { feeLawLive, newFeeLawRefusal } from "@/lib/fee-law-gate";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";

/**
 * Every field the global form draws, in the units the config STORES them in — the writer's baseline (FEE-TAX-2026-10,
 * R2c; the independent review of R2a). The stake bounds are the STORED ones (the fields show the enforced, floored
 * figures), so a stored bound under the platform floor differs from what is shown and is written by the next save.
 */
const GLOBAL_FORM_FIELDS = [
  "commissionRate", "feeCeilingRate", "cashOutFeeRate", "freeExitGraceMinutes", "paidExitWindowMinutes", "withdrawalFeeRate",
  "withdrawalGatewayShareRate", "minStake", "maxStake", "thinProfitRatio", "starterBalanceTzs", "objectionWindowHours",
  "traTaxOnCommissionRate", "gbtLevyOnCommissionRate", "feeModel", "platformFeeRate", "operatorFeeRate", "estimatedWinningsRate",
  "showEstimatedWinnings", "winningsTaxRate",
] as const satisfies ReadonlyArray<keyof RateConfig>;

/**
 * The gate's own words as a STATE — for a control drawn disabled while the new law is not in force — rather than as a
 * refusal: nothing was attempted, so its closing "Nothing was changed." is dropped. `null` once the law is in force.
 */
export function lawNotInForce(): string | null {
  const shut = newFeeLawRefusal();
  return shut === null ? null : shut.replace(/\s*Nothing was changed\.\s*$/, "");
}

function globalBaseline(config: RateConfig, storedStake: { minStake: number; maxStake: number } | null): Partial<RateConfig> {
  const out: Partial<RateConfig> = {};
  for (const k of GLOBAL_FORM_FIELDS) (out as Record<string, unknown>)[k] = config[k];
  if (storedStake) { out.minStake = storedStake.minStake; out.maxStake = storedStake.maxStake; }
  return out;
}

/** `storedStake` — the global bounds as stored. The form shows the ENFORCED ones (floored on read, 2026-10-07); when a
 *  stored value differs, the hint says both, and saving the form writes the enforced value back.
 *  ⭐ `config` is the row READ FRESH (`readMarketConfigFresh`, the page's read): the form is drawn from what is stored now,
 *  never this container's boot copy, and posts what it was drawn with as its `baseline`. */
export function GlobalConfigForm({ config, storedStake = null }: { config: RateConfig; storedStake?: { minStake: number; maxStake: number } | null }) {
  // A1 — /admin/config is the `accounting` domain, and AUDITOR + COMPLIANCE both hold
  // accounting VIEW without ACT. The rate values stay readable — a read-only officer needs
  // to see what the platform charges — and only the writes are gated.
  const mayAct = useMayAct();
  const disabledReason = useActDisabledReason();

  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  // Fee-model UI state (drives conditional fields + the money-model confirm gate).
  const [feeModel, setFeeModel] = useState<RateConfig["feeModel"]>(config.feeModel);
  const [showEst, setShowEst] = useState<boolean>(config.showEstimatedWinnings);
  const [confirmFd, setConfirmFd] = useState<FormData | null>(null);
  /* ADMIN-TABS-2026-09-01 — this form is UNCONTROLLED (11 defaultValue inputs), so React
     state never sees an edit. useFormDirty snapshots the form and compares, so a value typed
     back to what it was stops being dirty rather than warning over nothing. */
  const formRef = useRef<HTMLFormElement>(null);
  /* The form's own Save. The bar draws no second one while this is on screen (owner, 2026-09-22). */
  const saveRef = useRef<HTMLButtonElement>(null);
  const { dirty: fieldsDirty, markSaved, formProps } = useFormDirty(formRef);
  /* ⛔ THE TOGGLE IS NOT IN THE FORM. `showEst` is React state posted by hand in `onSubmit`, so the
     FormData snapshot never sees it — and with Save disabled while clean, a toggle-only change could
     not have been saved at all. It is compared with what was last SAVED rather than with `config`, so
     the bar does not flash back on in the beat between a save and the refresh that brings new props. */
  const [savedShowEst, setSavedShowEst] = useState<boolean>(config.showEstimatedWinnings);
  const dirty = fieldsDirty || showEst !== savedShowEst;
  /* ⛔ A DISCARD RE-BASELINES AFTER THE RENDER IT CAUSES. Putting the fee model back re-mounts the
     loser-share fields, and the snapshot taken on the line after `reset()` is of a form those fields
     are not in yet — so the next keystroke would read dirty over nothing. */
  const [discards, setDiscards] = useState(0);
  useEffect(() => { if (discards > 0) markSaved(); }, [discards, markSaved]);
  const discard = () => {
    formRef.current?.reset();
    setFeeModel(config.feeModel);
    setShowEst(savedShowEst);
    markSaved();
    setDiscards((n) => n + 1);
  };

  const runSave = (fd: FormData) => {
    start(async () => {
      const r = await updateGlobalConfigAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't update", description: r.error, variant: "danger" });
      } else {
        markSaved();
        setSavedShowEst(fd.get("showEstimatedWinnings") === "true");
        router.refresh();
        deferToast({
          title: "Global config updated",
          description: r.warn,
          variant: r.warn ? "warning" : "success",
        });
      }
    });
  };

  const commPct = (config.commissionRate * 100).toFixed(1);
  const ceilPct = (config.feeCeilingRate * 100).toFixed(1);
  const cashOutPct = (config.cashOutFeeRate * 100).toFixed(1);
  const wdrPct = (config.withdrawalFeeRate * 100).toFixed(2);
  const gwPct = (config.withdrawalGatewayShareRate * 100).toFixed(2);
  const traPct = (config.traTaxOnCommissionRate * 100).toFixed(1);
  const gbtPct = (config.gbtLevyOnCommissionRate * 100).toFixed(1);
  // To the hundredth, trimmed ("3", "6.5", "3.25"): the stake-share arithmetic works in whole basis points, so a figure
  // drawn to one decimal could show 3.3 for a stored 3.25.
  const platformPct = String(Number((config.platformFeeRate * 100).toFixed(2)));
  const operatorPct = String(Number((config.operatorFeeRate * 100).toFixed(2)));
  const estPct = (config.estimatedWinningsRate * 100).toFixed(0);
  const loserSharePct = ((config.platformFeeRate + config.operatorFeeRate) * 100).toFixed(1);
  // FEE-TAX-2026-10 · the fee on every stake as the stake-share arithmetic charges it (whole basis points), and the saved
  // winnings tax — EMPTY until an officer types one: there is no default tax (`market-config.ts`).
  const stakeSharePctText = String(rateBp(config.platformFeeRate + config.operatorFeeRate) / 100);
  const winTaxPct = config.winningsTaxRate === undefined ? "" : String(Number((config.winningsTaxRate * 100).toFixed(2)));
  // ⛔ THE NEW LAW'S GATE, read as every door reads it: while it is shut the stake-share option and the winning tax are
  // drawn DISABLED, with the gate's own words — so neither is ever posted, and an unrelated save cannot be refused for them.
  const lawLive = feeLawLive();
  const lawShut = lawNotInForce();

  /**
   * ⭐ THE STRINGS EVERY FIELD WAS DRAWN WITH (FEE-TAX-2026-10, R2c; the independent review of R2a). A save sends only the
   * fields the officer CHANGED — never the values a page opened minutes ago was drawn with, which a stale container would
   * otherwise write back over another officer's save — beside the `baseline` the writer compares them with. It also ends
   * a quieter rewrite: the ceiling is drawn rounded ("33.3"), so every save used to store 0.333 over an exact ⅓.
   */
  const drawn: Record<string, string> = {
    commissionRate: commPct, feeCeilingRate: ceilPct, cashOutFeeRate: cashOutPct,
    freeExitGraceMinutes: String(config.freeExitGraceMinutes), paidExitWindowMinutes: String(config.paidExitWindowMinutes),
    withdrawalFeeRate: wdrPct, withdrawalGatewayShareRate: gwPct,
    // The bounds as STORED: a stored figure under the floor differs from the enforced one shown, so it is sent.
    minStake: String(storedStake?.minStake ?? config.minStake), maxStake: String(storedStake?.maxStake ?? config.maxStake),
    thinProfitRatio: config.thinProfitRatio.toFixed(2), starterBalanceTzs: String(config.starterBalanceTzs ?? 0),
    objectionWindowHours: String(config.objectionWindowHours),
    traTaxOnCommissionRate: traPct, gbtLevyOnCommissionRate: gbtPct,
    feeModel: config.feeModel, platformFeeRate: platformPct, operatorFeeRate: operatorPct, estimatedWinningsRate: estPct,
    winningsTaxRate: winTaxPct, showEstimatedWinnings: String(savedShowEst),
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // The checkbox posts nothing when unchecked — set it explicitly from state so
    // "off" is an explicit false, not "leave unchanged".
    fd.set("showEstimatedWinnings", showEst ? "true" : "false");
    // Only what was changed is sent (see `drawn`), with the values this form was drawn with, as stored: the writer's
    // `baseline`, which refuses a changed field another officer moved since. ⚠️ Set here, never a hidden input — the
    // dirty check snapshots every field, and a baseline that a refresh redraws would read as an unsaved change.
    for (const [name, was] of Object.entries(drawn)) if (fd.get(name) === was) fd.delete(name);
    fd.set("baseline", JSON.stringify(globalBaseline(config, storedStake)));

    // Money-model change? (the fee model, its two rate slices, the estimate rate,
    // the winning tax, or the show-estimate toggle) → confirm first, it reprices EVERY future poll.
    const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v) / 100);
    const changed =
      String(fd.get("feeModel") ?? config.feeModel) !== config.feeModel ||
      (num(fd.get("platformFeeRate")) !== null && num(fd.get("platformFeeRate")) !== config.platformFeeRate) ||
      (num(fd.get("operatorFeeRate")) !== null && num(fd.get("operatorFeeRate")) !== config.operatorFeeRate) ||
      (num(fd.get("estimatedWinningsRate")) !== null && num(fd.get("estimatedWinningsRate")) !== config.estimatedWinningsRate) ||
      (num(fd.get("winningsTaxRate")) !== null && num(fd.get("winningsTaxRate")) !== config.winningsTaxRate) ||
      showEst !== config.showEstimatedWinnings;
    if (changed) {
      setConfirmFd(fd);
      return;
    }
    runSave(fd);
  };

  return (
    <form ref={formRef} {...formProps} onSubmit={onSubmit} className="space-y-3">
      {/* ── FEES & TAXES (FEE-TAX-2026-10, R2c) ─────────────────────────────────
          The polls' fee model, its rates labelled by the base each model charges on, the winning tax and the two levies on
          our fees. Applies to FUTURE polls only: every existing poll keeps the model + rates it froze at creation, so the
          calculations never mix. ⛔ The stake-share option and the winning tax are drawn DISABLED with the gate's reason
          while `fee-law-gate.ts` is shut — the server refuses both too (`validate`). */}
      <div className="rounded-lg border border-border bg-bg-overlay p-3 space-y-3">
        <div>
          <p className="font-mono text-micro uppercase eyebrow text-text-subtle">Polls · fee model and taxes</p>
          <p className="mt-0.5 text-body-sm text-text-muted">
            Applies to <strong>new polls only</strong>. Existing polls keep the model they were created under —
            the calculations never mix.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Fee model (new polls)" hint="How new polls charge their fee and what players see before betting.">
            <Select
              name="feeModel"
              ariaLabel="Fee model for new polls"
              disabled={!mayAct}
              disabledReason={disabledReason}
              defaultValue={config.feeModel}
              onChange={(v) => setFeeModel(v as RateConfig["feeModel"])}
              options={[
                { value: "loser-share", label: "Loser-share — % of the losing pool" },
                // The new law, named with the rate it would charge from today's Platform + Operator. Shown always, chosen
                // only once the gate is open — greyed with the plain reason, never hidden (the Select's own rule).
                {
                  value: "stake-share",
                  label: `Stake-share — ${stakeSharePctText}% of every stake`,
                  disabled: !lawLive,
                  ...(lawShut ? { hint: lawShut } : {}),
                },
                { value: "capped-commission", label: "Capped commission — % of the pool, capped" },
              ]}
            />
          </Field>
          {feeModel === "loser-share" ? (
            <Field
              label="Total loser-share fee"
              hint="Platform + Operator, charged on the losing side. Winners split the rest of the pool."
            >
              <Input name="_loserShareTotal" type="text" defaultValue={`${loserSharePct}% of the losing pool`} mono disabled />
            </Field>
          ) : feeModel === "stake-share" ? (
            <Field
              label="Total fee on every stake"
              hint="Platform + Operator, charged on every stake, on both sides — the same whichever side wins."
            >
              <Input name="_stakeShareTotal" type="text" defaultValue={`${stakeSharePctText}% of every stake`} mono disabled />
            </Field>
          ) : null}
        </div>

        {/* What the selected model does — updates on every change so the officer
            always sees exactly what new polls will apply. */}
        <div className="rounded-md border border-border/70 bg-bg-base/40 px-3 py-2 text-body-sm leading-relaxed text-text-muted">
          {feeModel === "stake-share" ? (
            <>
              <strong className="text-text">Stake-share.</strong> When a poll resolves, the fee is a fixed percentage of
              <strong> every</strong> stake, on both sides (Platform + Operator), and the winning tax is withheld from the
              losing side&apos;s net stakes for TRA. Winners get their stake less its fee, plus a share of the rest. On a
              lopsided poll a winner can be paid back less than their stake — players are warned on the bet screen first.
            </>
          ) : feeModel === "loser-share" ? (
            <>
              <strong className="text-text">Loser-share.</strong> When a poll resolves, the fee is a fixed
              percentage of the <strong>losing</strong> side&apos;s pool (Platform + Operator, set below). Winners get
              their stake back plus a share of the rest of the pool. Players are shown an estimated
              &ldquo;possible winnings&rdquo; before betting. The fee depends on which side loses.
            </>
          ) : (
            <>
              <strong className="text-text">Capped commission (legacy).</strong> Retired 2026-07-23 for polls and
              2026-08-14 for Up &amp; Down; it is shown here because markets created before those dates froze it and
              settle by it forever. The fee is a percentage of the whole pool, but never more than a third of the
              smaller side, and it is the <strong>same whichever side wins</strong>.
              No payout figure is shown to players before they bet. Uses the commission + ceiling fields below.
            </>
          )}
        </div>

        {/* The rates the selected model reads, each labelled by the base it charges on. */}
        {feeModel !== "capped-commission" ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field
              label={feeModel === "stake-share" ? "Platform fee (% of every stake)" : "Platform fee (% of the losing pool)"}
              hint={feeModel === "stake-share"
                ? `Current ${platformPct}%. Slice of EVERY stake, on both sides.`
                : `Current ${platformPct}%. Slice of the losing pool (default 3%).`}
            >
              <Input name="platformFeeRate" type="number" step="0.01" min="0" max="100" defaultValue={platformPct} mono />
            </Field>
            <Field
              label={feeModel === "stake-share" ? "Operator fee (% of every stake)" : "Operator fee (% of the losing pool)"}
              hint={feeModel === "stake-share"
                ? `Current ${operatorPct}%. Slice of EVERY stake, on both sides. TRA + GBT come OUT of our fees, not the player.`
                : `Current ${operatorPct}%. Slice of the losing pool (default 10%). TRA + GBT come OUT of this, not the player.`}
            >
              <Input name="operatorFeeRate" type="number" step="0.01" min="0" max="100" defaultValue={operatorPct} mono />
            </Field>
            {feeModel === "loser-share" ? (
              <>
                <Field
                  label="Estimated-winnings bonus (%)"
                  hint={`Current ${estPct}%. The fixed pre-bet “possible winnings” a player sees = stake × ${(1 + config.estimatedWinningsRate).toFixed(2)}. A marketing ESTIMATE, not the real payout — the disclaimer says so (default 50% → 1.5×).`}
                >
                  <Input name="estimatedWinningsRate" type="number" step="1" min="0" max="500" defaultValue={estPct} mono />
                </Field>
                <Field label="Show estimate to players" hint="When on, loser-share polls show the pre-bet estimate + disclaimer. When off, players see only qualitative copy.">
                  <div className="flex items-center gap-2.5">
                    <Toggle
                      on={showEst}
                      onClick={() => setShowEst((v) => !v)}
                      disabled={!mayAct}
                      aria-label="Show the possible-winnings estimate to players before betting"
                    />
                    <span className="text-[13px] text-text-muted">
                      {showEst ? "Shown pre-bet" : "Hidden pre-bet"}
                    </span>
                  </div>
                </Field>
              </>
            ) : null}
          </div>
        ) : null}

        {/* The capped-commission pair — the selected model's own rates when it is capped; under any other model inert for
            new polls, and still drawn so the stored figures stay in view (and a switch back has its rates). */}
        <div className="space-y-2">
          {feeModel !== "capped-commission" ? (
            <p className="text-body-sm text-text-muted">Capped commission (legacy) — not used by the selected model.</p>
          ) : null}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field
              label="Commission rate (%)"
              hint={`Current ${commPct}%. Our cut, as a share of the WHOLE pool — capped by the fee ceiling.`}
            >
              <Input name="commissionRate" type="number" step="0.1" min="0" max="30" defaultValue={commPct} mono />
            </Field>
            {/* THE CEILING. This one field is what makes "a winner is never paid below
                his stake" true under the capped model. It is not a tuning knob like the others — read the hint. */}
            <Field
              label="Fee ceiling (% of the smaller side)"
              hint={
                config.feeCeilingRate === 0
                  ? `⚠ Current 0.0%. A 0% ceiling zeroes the fee on EVERY poll (fee = min(commission×pool, 0) = 0) — the house collects NO commission and winners keep the entire pool. Set 0 only for a deliberate free / goodwill period; otherwise raise it (e.g. 33.3%). Your commission rate above has no effect while this is 0.`
                  : config.feeCeilingRate > 0.5
                  ? `⚠ Current ${ceilPct}%. Above 50% the house takes MORE than all the winners combined. Winners still never lose money, but check this is what you mean.`
                  : `Current ${ceilPct}%. The fee can never exceed this share of the SMALLER side. The smaller side is the prize — cap the fee below it and a winning bet can never be paid less than it staked. At 33.3% winners always keep at least twice what we take.`
              }
            >
              <Input name="feeCeilingRate" type="number" step="0.1" min="0" max="100" defaultValue={ceilPct} mono />
            </Field>
          </div>
        </div>

        {/* The winning tax and the two levies on our fees — three different things, said so. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field
            label="Winning tax (%)"
            hint={lawShut ?? (feeModel === "stake-share"
              ? (winTaxPct === ""
                ? "None saved yet, and there is no default — a stake-share poll cannot be created until one is. Withheld from each winner's share of the losing side's net stakes, for TRA."
                : `Current ${winTaxPct}%. Withheld from each winner's share of the losing side's net stakes, for TRA — it reduces what winners are paid.`)
              : `${winTaxPct === "" ? "None saved yet, and there is no default." : `Current ${winTaxPct}%.`} Applies only to stake-share polls; inert under the selected model.`)}
          >
            <Input name="winningsTaxRate" type="number" step="0.01" min="0" max="50" defaultValue={winTaxPct} placeholder="—" mono disabled={!mayAct || !lawLive} />
          </Field>
          <Field
            label="TRA (% of our fees)"
            hint={`Current ${traPct}% of every fee we earn, to TRA — paid out of our fee, never by a player. (The winning tax is a separate thing.)`}
          >
            <Input name="traTaxOnCommissionRate" type="number" step="0.1" min="0" max="50" defaultValue={traPct} mono />
          </Field>
          <Field
            label="GBT (% of our fees)"
            hint={`Current ${gbtPct}% of every fee we earn, to GBT — paid out of our fee, never by a player.`}
          >
            <Input name="gbtLevyOnCommissionRate" type="number" step="0.1" min="0" max="50" defaultValue={gbtPct} mono />
          </Field>
        </div>
      </div>

      <p className="font-mono text-micro uppercase eyebrow text-text-subtle">Other platform rates</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field
          label="Cash-out fee (%)"
          hint={`Current ${cashOutPct}%. Only applies if a paid-exit window is set below (0 = no paid exit, so this is unused). Charged on an early exit after the free window and booked to the house; holding to settlement is unaffected.`}
        >
          <Input name="cashOutFeeRate" type="number" step="0.1" min="0" max="30" defaultValue={cashOutPct} mono />
        </Field>
        <Field
          label="Free-exit window (minutes)"
          hint={`Current ${config.freeExitGraceMinutes} min. Sell within this long of placing a bet and it's a full refund at zero fee. 0 = no free window.`}
        >
          <Input name="freeExitGraceMinutes" type="number" step="1" min="0" max="60" defaultValue={config.freeExitGraceMinutes} mono />
        </Field>
        <Field
          label="Paid-exit window (minutes)"
          hint={`Current ${config.paidExitWindowMinutes} min. ${config.paidExitWindowMinutes > 0 ? `After the free window, selling is allowed at the cash-out fee for this long — then it LOCKS. Total sell window = ${config.freeExitGraceMinutes + config.paidExitWindowMinutes} min.` : `0 = no paid exit: the sell window LOCKS the moment the ${config.freeExitGraceMinutes}-min free window ends (current policy — "5-min free exit, then nothing").`} The time-lock is what stops a losing player bailing late to gut a winner's prize.`}
        >
          <Input name="paidExitWindowMinutes" type="number" step="1" min="0" max="1440" defaultValue={config.paidExitWindowMinutes} mono />
        </Field>
        <Field
          label="Withdrawal fee (%)"
          hint={`Current ${wdrPct}%. The ONLY thing a player is charged on a withdrawal. There is no withholding tax — taxes come out of our commission, never a player's money.`}
        >
          <Input name="withdrawalFeeRate" type="number" step="0.01" min="0" max="5" defaultValue={wdrPct} mono />
        </Field>
        <Field
          label="— of which, gateway share (%)"
          hint={`Current ${gwPct}%. The payment gateway's slice of that fee; we keep the rest. Cannot exceed the withdrawal fee.`}
        >
          <Input name="withdrawalGatewayShareRate" type="number" step="0.01" min="0" max="5" defaultValue={gwPct} mono />
        </Field>
        <Field label="Min stake (TZS)" hint={storedStake && storedStake.minStake !== config.minStake ? `Stored ${formatTzs(storedStake.minStake)} · enforced ${formatTzs(config.minStake)} — the platform minimum. Save to store it.` : `Current ${formatTzs(config.minStake)}`}>
          <Input name="minStake" type="number" step="100" min={PLATFORM_MIN_STAKE} max={PLATFORM_MAX_STAKE} defaultValue={config.minStake} mono />
        </Field>
        <Field label="Max stake (TZS)" hint={storedStake && storedStake.maxStake !== config.maxStake ? `Stored ${formatTzs(storedStake.maxStake)} · enforced ${formatTzs(config.maxStake)}. Save to store it.` : `Current ${formatTzs(config.maxStake)}`}>
          <Input name="maxStake" type="number" step="1000" min={PLATFORM_MIN_STAKE} max={PLATFORM_MAX_STAKE} defaultValue={config.maxStake} mono />
        </Field>
        <Field
          label="Thin-profit threshold"
          hint={`Currently ${config.thinProfitRatio.toFixed(2)}× — payout/stake below this shows the warning.`}
        >
          <Input name="thinProfitRatio" type="number" step="0.01" min="1" max="2" defaultValue={config.thinProfitRatio.toFixed(2)} mono />
        </Field>
        <Field
          label="Starter balance (TZS)"
          hint={`Currently ${formatTzs(config.starterBalanceTzs ?? 0)}. Credited to every newly-registered wallet.`}
        >
          <Input
            name="starterBalanceTzs"
            type="number"
            step="1000"
            min="0"
            max="5000000"
            defaultValue={config.starterBalanceTzs ?? 0}
            mono
          />
        </Field>
        {/* F11 — this is a SETTLEMENT GATE, not a display timer. A resolved market
            pays nobody until this many hours have passed with no objection standing.
            0 disables the gate: legal for play-money, but it is the control we
            describe to the regulator, so it must be a deliberate act.

            ⛔ NO `?? 24` FALLBACK, ANYWHERE BELOW. It appeared three times — twice in this hint
            and once on the input's defaultValue — and each was a restatement of the default this
            very screen exists to CHANGE: after the window moved to 1, the officer's own form
            would still have read "Currently 24h" on any render where the field was undefined.
            ⭐ It was also dead: `config` arrives from the server page as a full `RateConfig`, and
            `getEffectiveConfig()` merges the persisted snapshot OVER the code defaults, so the
            field is never undefined. A fallback that cannot fire but can lie is strictly worse
            than none. ⚠️ Importing the default as a VALUE was the other candidate and is refused:
            this file is `"use client"` and imports market-config as a TYPE only — a value import
            would drag the server graph into a browser chunk. */}
        <Field
          label="Objection window (hours)"
          hint={
            config.objectionWindowHours === 0
              ? "⚠ 0 = NO objection window. Resolved markets pay out on the next sweep, and players cannot dispute a verdict before the money moves. Do not ship real money like this."
              : `Currently ${config.objectionWindowHours}h. A resolved market's money is HELD this long before payout, so players can object while the pool is still intact. An open objection freezes it further.`
          }
        >
          <Input
            name="objectionWindowHours"
            type="number"
            step="1"
            min="0"
            max="168"
            defaultValue={config.objectionWindowHours}
            mono
          />
        </Field>
      </div>

      {/* ⭐ THE TWO HALVES OF ONE TRUTH, both driven by the same `dirty`.
          The BAR is proactive — it states the condition while the officer is still on the page
          and puts Save in reach on a form that is taller than the viewport. The GUARD is the
          backstop for the two exits the bar cannot stop: an in-app link (including a section
          rail tab) and the tab closing. ⛔ Not two mechanisms — one signal, two surfaces. */}
      <PendingChangesBar
        dirty={dirty && mayAct}
        saving={pending}
        detail="These rates govern every market on the platform."
        saveAnchor={saveRef}
        onSave={() => formRef.current?.requestSubmit()}
        onDiscard={discard}
        saveLabel="Save · Hifadhi"
      />
      <UnsavedChangesGuard
        dirty={dirty && mayAct}
        body="The global rate configuration has been changed but not saved. Leaving now discards the change."
      />

      <div className="flex items-center gap-2 pt-1">
        {/* Disabled while nothing has changed — the bar and this button answer "is there anything to save" with one `dirty`. */}
        <Button ref={saveRef} type="submit" variant="primary" loading={pending} disabled={!mayAct || !dirty} title={disabledReason}>
          Save · Hifadhi
        </Button>
        {/* The old note here read "Combined tax + commission + reserve + aggregator
            must stay ≤ 30%". That check could not have caught the bug that caused
            this rewrite — 9% passed it comfortably while paying winners less than
            they staked. The real guard is now the winner floor, enforced in
            validate(): a config under which any winner could be underpaid is
            REFUSED, not warned about.

            DG-A-14: that sentence — "A save is refused if any winner could be paid
            below their stake" — was wearing a section eyebrow's clothes (uppercase,
            0.14em tracking, text-micro at 10px). It is reading copy telling the
            operator what the save button will do, so it is now plain prose on
            text-body-sm, the smallest rung above the 12.5px reading floor. */}
        <p className="font-mono text-body-sm text-text-subtle">
          {/* FEE-TAX-2026-10 · model-aware: under stake-share the floor is not a promise the law makes. */}
          {feeModel === "stake-share"
            ? "A save is refused if a rate is out of bounds. Under stake-share a winner can be paid below their stake — players are warned before they bet"
            : "A save is refused if any winner could be paid below their stake"}
        </p>
      </div>

      <ConfirmModal
        open={confirmFd !== null}
        onClose={() => setConfirmFd(null)}
        onConfirm={() => {
          const fd = confirmFd;
          setConfirmFd(null);
          if (fd) runSave(fd);
        }}
        title="Change the fee model?"
        body={
          feeModel === "loser-share"
            ? "New polls will use the loser-share model: the fee is a percentage of the LOSING pool, and players see a fixed “possible winnings” estimate before betting. This changes the model for FUTURE polls only — every existing poll keeps its current rule. Continue?"
            : feeModel === "stake-share"
              ? "New polls will use the stake-share model: the fee is a percentage of EVERY stake and a winnings tax is withheld from the losing side's net stakes, so a winner on a lopsided poll can be paid back less than their stake. This affects FUTURE polls only — existing polls keep their current rule. Continue?"
              : "New polls will use the capped-commission model (min of a commission and a ceiling), and no pre-bet estimate is shown. This affects FUTURE polls only — existing polls keep their current rule. Continue?"
        }
        confirmLabel="Save fee model"
        tone="warning"
        tier="medium"
      />
    </form>
  );
}

/** `existing` — every market's override as the page read it (fresh): the one for the market typed is posted as the
 *  writer's `baseline` (`{}` when the page showed none), so an override another officer saved since is refused in words,
 *  never written over (FEE-TAX-2026-10, R2c). */
export function MarketOverrideForm({ globalConfig, existing = {} }: { globalConfig: RateConfig; existing?: Record<string, Partial<RateConfig>> }) {
  // A1 — /admin/config is the `accounting` domain, and AUDITOR + COMPLIANCE both hold
  // accounting VIEW without ACT. The rate values stay readable — a read-only officer needs
  // to see what the platform charges — and only the writes are gated.
  const mayAct = useMayAct();
  const disabledReason = useActDisabledReason();

  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // ⚠️ Set here, not drawn as a field: this form offers exactly the two inputs its action consumes (F3).
    const typed = String(fd.get("marketId") ?? "").trim();
    fd.set("baseline", JSON.stringify(Object.hasOwn(existing, typed) ? existing[typed] : {}));
    start(async () => {
      const r = await setMarketOverrideAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't save override", description: r.error, variant: "danger" });
      } else {
        (e.target as HTMLFormElement).reset();
        router.refresh();
        deferToast({ title: "Override saved", variant: "success" });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Market id" hint="Get this from the markets table — starts with mkt_">
        <Input name="marketId" placeholder="mkt_abc123…" mono />
      </Field>
      {/* 🔴 F3 · FOUR RATE INPUTS USED TO SIT HERE AND NONE OF THEM COULD EVER DO
          ANYTHING — commission, fee ceiling, cash-out fee and thin-profit ratio.
          The old comment claimed this was by design:

            "An override only affects polls created AFTER it is set — a poll freezes
             its rates at creation … That is the point."

          It is not the point, it is a dead end. This form is keyed on an EXISTING
          `mkt_` id. `createMarket` mints `mkt_${randomId(10)}` and then asks
          `getEffectiveConfig(id)` for the rates of that brand-new id, one
          microsecond old — so an override stored under any existing poll's id can
          never be the one it reads. A poll created "after" has a DIFFERENT id.

          ⭐ The comment described unreachable code as a designed limitation, which is
          why it survived: it reads like a decision. Ali's call was to remove the four
          rather than re-key overrides on something a future poll can carry.

          ⚠️ MIN/MAX STAKE STAY, AND THAT DISTINCTION IS THE WHOLE FINDING. They are
          read LIVE via `getEffectiveConfig(m.id)` on the market page and enforced
          server-side in `buyPosition`, so they work exactly as advertised. This was
          "4 of 6 controls are inert", never "the form is broken" — deleting the form
          would have deleted two working controls. */}
      <p className="rounded-md border border-border bg-bg-overlay px-3 py-2.5 text-body-sm leading-relaxed text-text-muted">
        <strong className="text-text">Stake bounds only.</strong> Fee rates are global and are
        frozen onto a poll when it is created, so they cannot be overridden per market — change
        them above, before creating the poll.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* `formatTzs`, not a bare `toLocaleString()` — the two identical fields in the
            GLOBAL form above already quote their inherited figure that way ("Current TZS
            1,000"), and a `toLocaleString()` with no locale argument is cut by whatever
            locale the runtime happens to hold, so the same number could group two ways on
            one page. */}
        <Field label="Min stake (TZS)" hint={`Leave blank to inherit ${formatTzs(globalConfig.minStake)}`}>
          <Input name="minStake" type="number" step="100" min={PLATFORM_MIN_STAKE} max={PLATFORM_MAX_STAKE} placeholder="" mono />
        </Field>
        <Field label="Max stake (TZS)" hint={`Leave blank to inherit ${formatTzs(globalConfig.maxStake)}`}>
          <Input name="maxStake" type="number" step="1000" min={PLATFORM_MIN_STAKE} max={PLATFORM_MAX_STAKE} placeholder="" mono />
        </Field>
      </div>
      <Button type="submit" variant="primary" loading={pending} disabled={!mayAct} title={disabledReason}>
        Save override
      </Button>
    </form>
  );
}

export function ClearOverrideButton({ marketId }: { marketId: string }) {
  // A1 — /admin/config is the `accounting` domain, and AUDITOR + COMPLIANCE both hold
  // accounting VIEW without ACT. The rate values stay readable — a read-only officer needs
  // to see what the platform charges — and only the writes are gated.
  const mayAct = useMayAct();
  const disabledReason = useActDisabledReason();

  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const onClick = () => {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("marketId", marketId);
        const r = await clearMarketOverrideAction(fd);
        if (!r.ok) {
          toast({ title: "Couldn't clear override", description: r.error, variant: "danger" });
          return;
        }
        router.refresh();
        deferToast({ title: "Override cleared", variant: "warning" });
      } catch {
        toast({ title: "Couldn't clear override", variant: "danger" });
      }
    });
  };
  return (
    <Button type="button" size="sm" variant="ghost" onClick={onClick} loading={pending} disabled={!mayAct} title={disabledReason}>
      Clear
    </Button>
  );
}
