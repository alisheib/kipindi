"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import {
  updateGlobalConfigAction,
  setMarketOverrideAction,
  clearMarketOverrideAction,
} from "./actions";
import type { RateConfig } from "@/lib/server/market-config";
import { formatTzs } from "@/lib/utils";

export function GlobalConfigForm({ config }: { config: RateConfig }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  // Fee-model UI state (drives conditional fields + the money-model confirm gate).
  const [feeModel, setFeeModel] = useState<RateConfig["feeModel"]>(config.feeModel);
  const [showEst, setShowEst] = useState<boolean>(config.showEstimatedWinnings);
  const [confirmFd, setConfirmFd] = useState<FormData | null>(null);

  const runSave = (fd: FormData) => {
    start(async () => {
      const r = await updateGlobalConfigAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't update", description: r.error, variant: "danger" });
      } else {
        router.refresh();
        deferToast({
          title: "Global config updated",
          description: r.warn,
          variant: r.warn ? "warning" : "success",
        });
      }
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // The checkbox posts nothing when unchecked — set it explicitly from state so
    // "off" is an explicit false, not "leave unchanged".
    fd.set("showEstimatedWinnings", showEst ? "true" : "false");

    // Money-model change? (the fee model, its two rate slices, the estimate rate,
    // or the show-estimate toggle) → confirm first, it reprices EVERY future poll.
    const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v) / 100);
    const changed =
      String(fd.get("feeModel") ?? config.feeModel) !== config.feeModel ||
      (num(fd.get("platformFeeRate")) !== null && num(fd.get("platformFeeRate")) !== config.platformFeeRate) ||
      (num(fd.get("operatorFeeRate")) !== null && num(fd.get("operatorFeeRate")) !== config.operatorFeeRate) ||
      (num(fd.get("estimatedWinningsRate")) !== null && num(fd.get("estimatedWinningsRate")) !== config.estimatedWinningsRate) ||
      showEst !== config.showEstimatedWinnings;
    if (changed) {
      setConfirmFd(fd);
      return;
    }
    runSave(fd);
  };

  const commPct = (config.commissionRate * 100).toFixed(1);
  const ceilPct = (config.feeCeilingRate * 100).toFixed(1);
  const cashOutPct = (config.cashOutFeeRate * 100).toFixed(1);
  const wdrPct = (config.withdrawalFeeRate * 100).toFixed(2);
  const gwPct = (config.withdrawalGatewayShareRate * 100).toFixed(2);
  const traPct = (config.traTaxOnCommissionRate * 100).toFixed(1);
  const gbtPct = (config.gbtLevyOnCommissionRate * 100).toFixed(1);
  const platformPct = (config.platformFeeRate * 100).toFixed(1);
  const operatorPct = (config.operatorFeeRate * 100).toFixed(1);
  const estPct = (config.estimatedWinningsRate * 100).toFixed(0);
  const loserSharePct = ((config.platformFeeRate + config.operatorFeeRate) * 100).toFixed(1);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field
          label="Commission rate (%)"
          hint={`Current ${commPct}%. Our cut, as a share of the WHOLE pool — capped by the fee ceiling below.`}
        >
          <Input name="commissionRate" type="number" step="0.1" min="0" max="30" defaultValue={commPct} mono />
        </Field>
        {/* THE CEILING. This one field is what makes "a winner is never paid below
            his stake" true. It is not a tuning knob like the others — read the hint. */}
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
        <Field label="Min stake (TZS)" hint={`Current ${formatTzs(config.minStake)}`}>
          <Input name="minStake" type="number" step="100" min="100" defaultValue={config.minStake} mono />
        </Field>
        <Field label="Max stake (TZS)" hint={`Current ${formatTzs(config.maxStake)}`}>
          <Input name="maxStake" type="number" step="1000" min="1000" defaultValue={config.maxStake} mono />
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
            describe to the regulator, so it must be a deliberate act. */}
        <Field
          label="Objection window (hours)"
          hint={
            (config.objectionWindowHours ?? 24) === 0
              ? "⚠ 0 = NO objection window. Resolved markets pay out on the next sweep, and players cannot dispute a verdict before the money moves. Do not ship real money like this."
              : `Currently ${config.objectionWindowHours ?? 24}h. A resolved market's money is HELD this long before payout, so players can object while the pool is still intact. An open objection freezes it further.`
          }
        >
          <Input
            name="objectionWindowHours"
            type="number"
            step="1"
            min="0"
            max="168"
            defaultValue={config.objectionWindowHours ?? 24}
            mono
          />
        </Field>
        <Field
          label="TRA tax on commission (%)"
          hint={`Current ${traPct}%. Percentage of the total commission paid to TRA. Does NOT affect player payouts.`}
        >
          <Input name="traTaxOnCommissionRate" type="number" step="0.1" min="0" max="50" defaultValue={traPct} mono />
        </Field>
        <Field
          label="GBT levy on commission (%)"
          hint={`Current ${gbtPct}%. Percentage of the total commission paid to GBT. Does NOT affect player payouts.`}
        >
          <Input name="gbtLevyOnCommissionRate" type="number" step="0.1" min="0" max="50" defaultValue={gbtPct} mono />
        </Field>
      </div>

      {/* ── FEE MODEL (owner decision 2026-07-23 — Jay's "loser-share") ────────
          These apply to FUTURE polls only. Every existing poll keeps the model +
          rates it froze at creation, so the two maths never mix. */}
      <div className="rounded-lg border border-border bg-bg-overlay p-3 space-y-3">
        <div>
          <p className="font-mono text-micro uppercase tracking-[0.14em] text-text-subtle">Fee model</p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            Applies to <strong>new polls only</strong>. Existing polls keep the model they were created under —
            the two calculations never mix.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field
            label="Fee model (new polls)"
            hint={
              feeModel === "loser-share"
                ? "Loser-share (Jay): the fee is a % of the LOSING pool; the commission + ceiling above are unused for new polls."
                : "Capped commission: fee = min(commission × pool, ceiling × smaller side). Uses the commission + ceiling fields above."
            }
          >
            <Select
              name="feeModel"
              ariaLabel="Fee model for new polls"
              defaultValue={config.feeModel}
              onChange={(v) => setFeeModel(v as RateConfig["feeModel"])}
              options={[
                { value: "loser-share", label: "Loser-share (Jay) — 13% of losing pool" },
                { value: "capped-commission", label: "Capped commission (legacy)" },
              ]}
            />
          </Field>
          {feeModel === "loser-share" ? (
            <Field
              label="Total loser-share fee"
              hint={`Platform + Operator = ${loserSharePct}% of the LOSING pool. Charged only on the side that loses; winners split the rest of the pool.`}
            >
              <Input name="_loserShareTotal" type="text" defaultValue={`${loserSharePct}%`} mono disabled />
            </Field>
          ) : null}
        </div>

        {feeModel === "loser-share" ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Platform fee (%)" hint={`Current ${platformPct}%. Slice of the losing pool. Jay: 3%.`}>
              <Input name="platformFeeRate" type="number" step="0.1" min="0" max="100" defaultValue={platformPct} mono />
            </Field>
            <Field label="Operator fee (%)" hint={`Current ${operatorPct}%. Slice of the losing pool. Jay: 10%. TRA + GBT come OUT of this, not the player.`}>
              <Input name="operatorFeeRate" type="number" step="0.1" min="0" max="100" defaultValue={operatorPct} mono />
            </Field>
            <Field
              label="Estimated-winnings bonus (%)"
              hint={`Current ${estPct}%. The fixed pre-bet "possible winnings" a player sees = stake × ${(1 + config.estimatedWinningsRate).toFixed(2)}. A marketing ESTIMATE, not the real payout — the disclaimer says so. Jay: 50% → 1.5×.`}
            >
              <Input name="estimatedWinningsRate" type="number" step="1" min="0" max="500" defaultValue={estPct} mono />
            </Field>
            <Field label="Show estimate to players" hint="When on, loser-share polls show the pre-bet 1.5× estimate + disclaimer. When off, players see only qualitative copy.">
              <label className="flex items-center gap-2 text-[13px] text-text-muted">
                <input
                  type="checkbox"
                  name="showEstimatedWinnings"
                  checked={showEst}
                  onChange={(e) => setShowEst(e.currentTarget.checked)}
                  className="h-4 w-4 accent-brand-500"
                />
                Show the “possible winnings” estimate pre-bet
              </label>
            </Field>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="yes" loading={pending}>
          Save · Hifadhi
        </Button>
        {/* The old note here read "Combined tax + commission + reserve + aggregator
            must stay ≤ 30%". That check could not have caught the bug that caused
            this rewrite — 9% passed it comfortably while paying winners less than
            they staked. The real guard is now the winner floor, enforced in
            validate(): a config under which any winner could be underpaid is
            REFUSED, not warned about. */}
        <p className="font-mono text-micro uppercase tracking-[0.14em] text-text-subtle">
          A save is refused if any winner could be paid below their stake
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
            ? "New polls will use Jay's loser-share model: the fee is a percentage of the LOSING pool, and players see a fixed “possible winnings” estimate before betting. This changes the model for FUTURE polls only — every existing poll keeps its current rule. Continue?"
            : "New polls will use the capped-commission model (min of a commission and a ceiling), and no pre-bet estimate is shown. This affects FUTURE polls only — existing polls keep their current rule. Continue?"
        }
        confirmLabel="Save fee model"
        tone="warning"
        tier="medium"
      />
    </form>
  );
}

export function MarketOverrideForm({ globalConfig }: { globalConfig: RateConfig }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
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
      {/* An override only affects polls created AFTER it is set — a poll freezes
          its rates at creation, so setting an override on a poll that already
          exists changes nothing about it. That is the point. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Commission (%)" hint={`Leave blank to inherit ${(globalConfig.commissionRate * 100).toFixed(1)}%`}>
          <Input name="commissionRate" type="number" step="0.1" min="0" max="30" placeholder="" mono />
        </Field>
        <Field label="Fee ceiling (%)" hint={`Leave blank to inherit ${(globalConfig.feeCeilingRate * 100).toFixed(1)}% of the smaller side`}>
          <Input name="feeCeilingRate" type="number" step="0.1" min="0" max="100" placeholder="" mono />
        </Field>
        {/* These two were merged by getEffectiveConfig() but the form had no input
            for them — so a per-market override of either was unreachable through
            the UI. The storage layer always supported it. */}
        <Field label="Cash-out fee (%)" hint={`Leave blank to inherit ${(globalConfig.cashOutFeeRate * 100).toFixed(1)}%`}>
          <Input name="cashOutFeeRate" type="number" step="0.1" min="0" max="30" placeholder="" mono />
        </Field>
        <Field label="Thin-profit threshold" hint={`Leave blank to inherit ${globalConfig.thinProfitRatio.toFixed(2)}×`}>
          <Input name="thinProfitRatio" type="number" step="0.01" min="1" max="2" placeholder="" mono />
        </Field>
        <Field label="Min stake (TZS)" hint="Optional override">
          <Input name="minStake" type="number" step="100" min="100" placeholder="" mono />
        </Field>
        <Field label="Max stake (TZS)" hint="Optional override">
          <Input name="maxStake" type="number" step="1000" min="1000" placeholder="" mono />
        </Field>
      </div>
      <Button type="submit" variant="primary" loading={pending}>
        Save override
      </Button>
    </form>
  );
}

export function ClearOverrideButton({ marketId }: { marketId: string }) {
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
    <Button type="button" size="sm" variant="ghost" onClick={onClick} loading={pending}>
      Clear
    </Button>
  );
}
