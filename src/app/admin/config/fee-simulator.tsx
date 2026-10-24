"use client";

/**
 * Fee simulator — see what a rate actually does to a real player, before saving it.
 *
 * This exists because the reported bug was INVISIBLE from the config screen. The
 * old page showed "Total pool fee: 9%" and a green tick that it was under the 30%
 * ceiling. Nothing on the screen suggested that on a YES 300,000 / NO 10,500 poll
 * that same 9% would take 31,050 out of a 10,500 prize and pay a winner 93,150 on
 * a 100,000 stake. You could not see it, so nobody saw it.
 *
 * So: type two pool sizes and a stake, and read what happens to the player.
 *
 * It calls `payoutFor` and `poolFee` — THE REAL FUNCTIONS THE SERVER SETTLES WITH,
 * imported from the same module. Not a re-implementation of the formula for the
 * admin screen. A simulator with its own copy of the maths is worse than no
 * simulator: it would agree with itself and lie about production.
 *
 * ⭐ THREE LAWS (FEE-TAX-2026-10, R2c). The simulator prices any of the three pool laws at the SAVED rates — the saved
 * model by default — so an officer can see what a switch would do before making it: `loser-share` and
 * `capped-commission` through the grids below, byte for byte as before, and `stake-share` (13% of every stake, a winning
 * tax on the prize) through `simulateStakeShare`, which shows F, P, T, TRA, GBT, what we keep, the winners' multiple, the
 * worst case over every split and the break-even lean. ⛔ Under `stake-share` a winner below their stake is the LAW
 * (ruling 1), so it is a WARNING here, never a refusal. ⛔ No winning tax is invented: the saved one is used, or the one
 * the officer types into this calculator — nothing here is saved. It never throws: a rate set the engine refuses is said.
 */

import { useMemo, useState } from "react";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Callout } from "@/components/ui/callout";
import {
  poolFee, settledPayoutFor, worstCaseWinnerRatio, levySplit, roundHalfUpBp, stakeFeeBp, winningsTaxBp,
  stakeShareBreakEvenShare, type FeeRates,
} from "@/lib/payout";
import type { RateConfig } from "@/lib/server/market-config";
import { formatTzs, fmtRate } from "@/lib/utils";

const num = (s: string, fallback = 0) => {
  const n = Number(String(s).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** The pool laws this calculator prices — never Millionea's jackpot model, which is no pool. */
type SimModel = "loser-share" | "stake-share" | "capped-commission";
const SIM_MODELS: ReadonlyArray<{ value: SimModel; label: string }> = [
  { value: "loser-share", label: "Loser-share — % of the losing pool" },
  { value: "stake-share", label: "Stake-share — % of every stake" },
  { value: "capped-commission", label: "Capped commission — % of the pool, capped" },
];
const simModelOf = (m: string): SimModel =>
  (SIM_MODELS.some((x) => x.value === m) ? m : "loser-share") as SimModel;

/**
 * The books an officer reaches for: the reported poll (this screen's opening case), the fee & tax document's own example
 * (YES 1,000 + 3,000 + 5,000 against NO 10,000 + 20,000 + 5,000, YES wins — the first YES player's 1,000 shown), and a
 * lopsided book where a stake-share winner gets back less than they staked.
 */
export const SIM_PRESETS = [
  { id: "reported", label: "Reported poll · 300,000 / 10,500", yes: 300_000, no: 10_500, stake: 100_000, side: "YES" },
  { id: "document", label: "Document example · 9,000 / 35,000", yes: 9_000, no: 35_000, stake: 1_000, side: "YES" },
  { id: "lopsided", label: "Lopsided · 100,000 / 10,000", yes: 100_000, no: 10_000, stake: 100_000, side: "YES" },
] as const;

/** ⭐ ONE BOOK UNDER `stake-share`, priced by the engine itself — every figure a call into `@/lib/payout`. */
export type StakeShareSim =
  | { ok: false; refused: string }
  | {
      ok: true;
      yesPool: number; noPool: number; stake: number; side: "YES" | "NO"; pool: number;
      /** The rate of every stake as charged (whole basis points), and the winning tax — `null` when none is set. */
      feePct: number; taxPct: number | null;
      /** One side holds nothing: settlement refunds every stake in full at no fee (ruling 2). */
      oneSided: boolean;
      stakeTooBig: boolean;
      /** F — our fee, every stake on both sides. */
      fee: number;
      /** P — the losing side's stakes less their fee: the prize. */
      prizeFund: number;
      /** T — the winning tax on the prize, to TRA; `null` without a tax. */
      tax: number | null;
      tra: number; gbt: number;
      /** What we keep: F less TRA and GBT (the tax is TRA's, never revenue). */
      netGgr: number;
      /** What every winner shares: pool − F − T; and per shilling staked on the winning side. */
      winnersGet: number | null; multiple: number | null;
      /** This stake's payout if its side wins, and payout ÷ stake. */
      payout: number | null; ratio: number | null;
      /** The worst any winner can do at these rates, over every split; the small side's share below which a winner on
       *  the big side gets back less than their stake; and the small side's share of THESE pools. */
      worst: number | null; breakEven: number | null; smallShare: number;
    };

/**
 * ⭐ THE STAKE-SHARE ARITHMETIC ON ONE BOOK (FEE-TAX-2026-10, R2c) — F, P and T from `poolFee` (the arm settlement's
 * `stakeShareTotals` computes), the position's payout from `settledPayoutFor`, the levies from `levySplit`, the worst case
 * and the break-even from the engine's own sweeps. Pools and stakes are whole shillings under this model, so a typed
 * figure is taken to the shilling below; without a winning tax the figures the tax decides are `null`, never guessed.
 * ⛔ Never throws: rates the engine refuses come back as `refused`, in the engine's words.
 */
export function simulateStakeShare(input: {
  yesPool: number; noPool: number; stake: number; side: "YES" | "NO";
  rates: Partial<FeeRates>;
  levies: { traTaxOnCommissionRate: number; gbtLevyOnCommissionRate: number };
}): StakeShareSim {
  try {
    const yesPool = Math.max(0, Math.floor(input.yesPool));
    const noPool = Math.max(0, Math.floor(input.noPool));
    const stake = Math.max(0, Math.floor(input.stake));
    const side = input.side;
    const feeBp = stakeFeeBp(input.rates);
    if (feeBp === null) return { ok: false, refused: "These rates are not stake-share rates." };
    const taxBp = winningsTaxBp(input.rates);
    const pool = yesPool + noPool;
    const winning = side === "YES" ? yesPool : noPool;
    const losing = side === "YES" ? noPool : yesPool;
    const oneSided = pool > 0 && (yesPool === 0 || noPool === 0);
    // With a tax, the book as settlement prices it; without one, F alone (a terms read: the fee needs no outcome).
    const priced = taxBp === null ? null : poolFee(yesPool, noPool, input.rates, side);
    const fee = priced ? priced.fee : poolFee(yesPool, noPool, input.rates).fee;
    const prizeFund = oneSided || pool === 0 ? 0 : (priced?.prizeFund ?? losing - roundHalfUpBp(losing, feeBp));
    const tax = priced ? (priced.winningsTax ?? 0) : null;
    const levy = levySplit(fee, input.levies);
    const winnersGet = priced ? priced.netPool : null;
    const res = priced && stake > 0 && stake <= winning ? settledPayoutFor({ yesPool, noPool, side, stake }, input.rates) : null;
    return {
      ok: true, yesPool, noPool, stake, side, pool,
      feePct: feeBp / 100, taxPct: taxBp === null ? null : taxBp / 100,
      oneSided, stakeTooBig: stake > winning && winning > 0,
      fee, prizeFund, tax,
      tra: levy.traLevy, gbt: levy.gbtLevy, netGgr: levy.operatorNet,
      winnersGet, multiple: winnersGet !== null && winning > 0 ? winnersGet / winning : null,
      payout: res ? res.payout : null, ratio: res ? res.ratio : null,
      worst: taxBp === null ? null : worstCaseWinnerRatio(input.rates).ratio,
      breakEven: stakeShareBreakEvenShare(input.rates),
      smallShare: pool > 0 ? Math.min(yesPool, noPool) / pool : 0,
    };
  } catch (err) {
    return { ok: false, refused: String((err as Error)?.message ?? err) };
  }
}

/** A share as a percentage, to the hundredth ("14.95%"). */
const pct2 = (share: number) => `${Number((share * 100).toFixed(2))}%`;

export function FeeSimulator({ config }: { config: RateConfig }) {
  // Defaults are THE REPORTED POLL. Whoever opens this screen next should see, in
  // the first second, the case that caused all this — and see it paying correctly.
  const [yesRaw, setYes] = useState("300000");
  const [noRaw, setNo] = useState("10500");
  const [stakeRaw, setStake] = useState("100000");
  const [side, setSide] = useState<"YES" | "NO">("YES");
  // FEE-TAX-2026-10 · the law priced — the saved one until the officer picks another — and, under stake-share, the
  // winning tax: the saved one, or none (there is no default); the officer may type one here, and nothing is saved.
  const [model, setModel] = useState<SimModel>(simModelOf(config.feeModel));
  const [taxRaw, setTaxRaw] = useState(config.winningsTaxRate === undefined ? "" : String(Number((config.winningsTaxRate * 100).toFixed(2))));

  const yesPool = num(yesRaw);
  const noPool = num(noRaw);
  const stake = num(stakeRaw);

  const isLoserShare = model === "loser-share";
  const isStakeShare = model === "stake-share";

  /** The saved rates under the law chosen here (the what-if tax beside them under stake-share). */
  const rates = useMemo<RateConfig>(() => {
    const { winningsTaxRate: _saved, ...rest } = config;
    void _saved;
    if (model !== "stake-share") return { ...rest, feeModel: model };
    const t = taxRaw.trim() === "" ? Number.NaN : Number(taxRaw) / 100;
    return Number.isFinite(t) ? { ...rest, feeModel: model, winningsTaxRate: t } : { ...rest, feeModel: model };
  }, [config, model, taxRaw]);

  const sim = useMemo(() => {
    if (isStakeShare) return null;
    try {
      // Pass the winning side: loser-share charges the LOSING pool, so its fee depends
      // on the outcome. Capped-commission ignores the side (outcome-neutral).
      const fee = poolFee(yesPool, noPool, rates, side);
      const winningPool = side === "YES" ? yesPool : noPool;
      const otherSide = side === "YES" ? "NO" : "YES";

      // The stake is assumed ALREADY IN the pools (this is a settlement preview, not
      // a new bet), so we use the settlement function directly.
      const res = winningPool > 0 && stake > 0 && stake <= winningPool
        ? settledPayoutFor({ yesPool, noPool, side, stake }, rates)
        : null;

      // The fee if the OTHER side had won. For capped-commission this is identical
      // (outcome-neutral). For loser-share it DIFFERS — the footer says which.
      const feeIfOtherSideWon = poolFee(yesPool, noPool, rates, otherSide).fee;

      const traLevy = Math.round(fee.fee * config.traTaxOnCommissionRate);
      const gbtLevy = Math.round(fee.fee * config.gbtLevyOnCommissionRate);

      return {
        fee,
        res,
        feeIfOtherSideWon,
        traLevy,
        gbtLevy,
        operatorNet: Math.round(fee.fee) - traLevy - gbtLevy,
        oneSided: fee.smaller === 0 && fee.pool > 0,
        stakeTooBig: stake > winningPool && winningPool > 0,
        /** The pool the loser-share fee is actually a percentage OF. */
        losingPool: side === "YES" ? noPool : yesPool,
      };
    } catch {
      // A rate set the arithmetic refuses (a hand-written row) is said below — never a screen that falls over.
      return null;
    }
  }, [yesPool, noPool, stake, side, rates, config, isStakeShare]);

  const ss = useMemo(
    () => (isStakeShare ? simulateStakeShare({ yesPool, noPool, stake, side, rates, levies: config }) : null),
    [isStakeShare, yesPool, noPool, stake, side, rates, config],
  );

  const worst = useMemo(() => {
    try { return worstCaseWinnerRatio(rates); } catch { return { ratio: Number.NaN, atYes: 0, atNo: 0 }; }
  }, [rates]);

  const stakeLabel = `Stake on ${side}`;

  /** The law priced, and the books to price it on — the same row under every law. */
  const controls = (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Law simulated" hint={model === simModelOf(config.feeModel) ? "The saved model." : "Not the saved model — a what-if."}>
          <Select
            ariaLabel="Fee model to simulate"
            size="sm"
            value={model}
            onChange={(v) => setModel(simModelOf(v))}
            options={SIM_MODELS.map((m) => ({ value: m.value, label: m.label }))}
          />
        </Field>
        {isStakeShare ? (
          <Field
            label="Winning tax (%) — this calculator only"
            hint={config.winningsTaxRate === undefined
              ? "None is saved, and there is no default. Type one to price the tax — nothing here is saved."
              : `Saved: ${Number((config.winningsTaxRate * 100).toFixed(2))}%. Nothing typed here is saved.`}
          >
            <Input value={taxRaw} onChange={(e) => setTaxRaw(e.target.value)} inputMode="decimal" placeholder="—" mono />
          </Field>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Example books">
        {SIM_PRESETS.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => { setYes(String(p.yes)); setNo(String(p.no)); setStake(String(p.stake)); setSide(p.side); }}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );

  const inputs = (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Field label="YES pool (TZS)">
        <Input value={yesRaw} onChange={(e) => setYes(e.target.value)} inputMode="numeric" mono />
      </Field>
      <Field label="NO pool (TZS)">
        <Input value={noRaw} onChange={(e) => setNo(e.target.value)} inputMode="numeric" mono />
      </Field>
      <Field label="Stake (TZS)">
        <Input value={stakeRaw} onChange={(e) => setStake(e.target.value)} inputMode="numeric" mono />
      </Field>
      <Field label="Winning side">
        <div className="flex gap-1.5">
          {(["YES", "NO"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`btn btn-sm flex-1 ${side === s ? (s === "YES" ? "btn-yes" : "btn-no") : "btn-ghost"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );

  // ── STAKE-SHARE — its own arm, never the grids of the two older laws ──────────────────────────────────────────────
  if (isStakeShare) {
    return (
      <div className="space-y-4">
        {controls}
        {inputs}
        {ss === null || !ss.ok ? (
          <Callout tone="warning" title="These rates cannot be priced as stake-share">
            {ss && !ss.ok ? ss.refused : "Nothing to price."} Nothing here is saved.
          </Callout>
        ) : (
          <>
            {/* F, P and T — the fee on every stake, the prize, the winning tax on it. */}
            <div className="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-bg-overlay/40 p-3 lg:grid-cols-4">
              <Stat label="Pool" value={formatTzs(ss.pool)} money />
              <Stat
                label="Our fee (F)"
                value={formatTzs(ss.fee)}
                tone="gold"
                money
                hint={ss.oneSided ? "one-sided — every stake refunded, no fee" : `${ss.feePct}% of every stake, both sides`}
              />
              <Stat label="Prize fund (P)" value={formatTzs(ss.prizeFund)} money hint="the losing side's stakes, less their fee" />
              <Stat
                label="Winning tax (T)"
                value={ss.tax === null ? "—" : formatTzs(ss.tax)}
                money={ss.tax !== null}
                hint={ss.tax === null ? "no winning tax set — type one above" : `${ss.taxPct}% of the prize fund, to TRA`}
              />
            </div>

            {/* Out of OUR fee: TRA and GBT. The winning tax is TRA's money, not revenue — it is not in what we keep. */}
            <div className="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-bg-overlay/40 p-3 lg:grid-cols-4">
              <Stat label="TRA (of our fee)" value={formatTzs(ss.tra)} money hint={`${fmtRate(config.traTaxOnCommissionRate)} of F`} />
              <Stat label="GBT (of our fee)" value={formatTzs(ss.gbt)} money hint={`${fmtRate(config.gbtLevyOnCommissionRate)} of F`} />
              <Stat label="We keep (net GGR)" value={formatTzs(ss.netGgr)} money hint="F less TRA and GBT" />
              <Stat
                label="Winners share"
                value={ss.winnersGet === null ? "—" : formatTzs(ss.winnersGet)}
                money={ss.winnersGet !== null}
                hint={ss.multiple === null ? "needs the winning tax" : `${ss.multiple.toFixed(3)}× per shilling on the winning side`}
              />
            </div>

            {ss.oneSided ? (
              <Callout tone="info" title="One-sided poll — everyone is refunded">
                Nobody bet the other side, so there is no prize to pay from. The fee is zero and every stake is
                returned in full. This poll earns us nothing.
              </Callout>
            ) : ss.stakeTooBig ? (
              <Callout tone="warning" title="Stake exceeds the winning pool">
                A position cannot be larger than the side it sits on — the pools already include this stake.
              </Callout>
            ) : ss.payout !== null && ss.ratio !== null ? (
              <div className="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-bg-overlay/40 p-3 lg:grid-cols-4">
                <Stat label={stakeLabel} value={formatTzs(ss.stake)} money />
                <Stat label="Payout" value={formatTzs(ss.payout)} tone="gold" money />
                <Stat label="Profit" value={formatTzs(ss.payout - ss.stake)} tone={ss.payout >= ss.stake ? "yes" : "no"} money />
                <Stat
                  label="Ratio"
                  value={`${ss.ratio.toFixed(3)}×`}
                  tone={ss.ratio >= 1 ? "yes" : "no"}
                  hint={ss.ratio >= 1 ? "at or above stake" : "below stake — the law allows it"}
                />
              </div>
            ) : null}

            {/* ⛔ A WARNING, NEVER A REFUSAL: under stake-share a winner below their stake is the law (ruling 1). */}
            {ss.breakEven !== null && ss.worst !== null ? (
              <Callout
                tone="warning"
                title={ss.ratio !== null && ss.ratio < 1 ? "This winner is paid back less than they staked" : "A winner can be paid back less than they staked"}
              >
                {ss.ratio !== null && ss.ratio < 1 && ss.payout !== null ? (
                  <>
                    This stake gets back <span className="amount">{formatTzs(ss.payout)}</span> for{" "}
                    <span className="amount">{formatTzs(ss.stake)}</span>: the small side holds {pct2(ss.smallShare)} of the pool,
                    under the break-even.{" "}
                  </>
                ) : null}
                At these rates a winner on the big side gets back less than their stake once the small side is under{" "}
                <strong>{pct2(ss.breakEven)}</strong> of the pool; the worst case, over every split, is{" "}
                <strong>{ss.worst.toFixed(3)}×</strong> of the stake. The stake-share law allows it, and every bet screen warns
                the player before they bet.
              </Callout>
            ) : (
              <Callout tone="info" title="The payout needs a winning tax">
                No winning tax is set, so the prize&apos;s tax, the payout and the worst case cannot be priced. Type one above to
                see them — nothing here is saved, and a stake-share poll cannot be created until an officer saves one.
              </Callout>
            )}
          </>
        )}
      </div>
    );
  }

  if (!sim) {
    return (
      <div className="space-y-4">
        {controls}
        {inputs}
        <Callout tone="warning" title="These rates cannot be priced">
          The payout arithmetic refuses this set of rates, so nothing is simulated. Nothing here is saved.
        </Callout>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {controls}
      {/* Inputs */}
      {inputs}

      {/* The fee arithmetic, laid out as the sentence it is. */}
      <div className="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-bg-overlay/40 p-3 lg:grid-cols-4">
        <Stat label="Pool" value={formatTzs(sim.fee.pool)} money />
        <Stat
          label="Smaller side (the prize)"
          value={formatTzs(sim.fee.smaller)}
          money
          hint={sim.fee.pool > 0 ? `${((sim.fee.smaller / sim.fee.pool) * 100).toFixed(1)}% of pool` : undefined}
        />
        {isLoserShare ? (
          <>
            <Stat
              label={`Losing pool (${side === "YES" ? "NO" : "YES"} side)`}
              value={formatTzs(Math.round(side === "YES" ? noPool : yesPool))}
              money
              hint="the fee is a % of THIS"
            />
            {/* ⚠️ THE RATE THE ARITHMETIC USED, NOT THE RAW SUM. `poolFee` clamps
                `platformFeeRate + operatorFeeRate` to `MAX_LOSER_SHARE_RATE`, and
                `describeFeeModel` was fixed to clamp its caption for exactly this
                reason. `/admin/config` already refuses a save whose two slices sum
                above 100%, so a divergence is not reachable through the admin door
                today — this reads `shareOfLosers` anyway, because a tile that derives
                its number from the same call it is captioning cannot drift, and a
                snapshot or a hand-written config row is not bound by that form. */}
            <Stat
              label="Loser-share rate"
              value={fmtRate(sim.fee.shareOfLosers)}
              tone="gold"
              hint={`Platform ${fmtRate(config.platformFeeRate)} + Operator ${fmtRate(config.operatorFeeRate)}`}
            />
          </>
        ) : (
          <>
            <Stat
              label={`Commission (${fmtRate(config.commissionRate)} of pool)`}
              value={formatTzs(Math.round(sim.fee.commission))}
              tone={sim.fee.capped ? "muted" : "default"}
              money
              hint={sim.fee.capped ? "capped — not charged" : "charged"}
            />
            <Stat
              label={`Ceiling (${fmtRate(config.feeCeilingRate)} of smaller)`}
              value={formatTzs(Math.round(sim.fee.ceiling))}
              tone={sim.fee.capped ? "gold" : "muted"}
              money
              hint={sim.fee.capped ? "charged" : "slack"}
            />
          </>
        )}
      </div>

      {/* 🔴 THE SECOND GRID WAS NOT BRANCHED, AND IT TAUGHT A RETIRED LAW (2026-09-08).
          The grid above and the paragraph below both switch on `isLoserShare`; this one
          did not, so under the live model an officer read two `capped-commission`
          sentences beside correct figures:
            · "Fee charged · min() picked the commission" — `poolFee`'s loser-share arm
              returns `capped: false` ALWAYS (there is no min() and no ceiling in this
              model), so the hint could only ever say that, describing a mechanism that
              does not run;
            · "Our share of the losers' money · never exceeds 33.3%" — quoting the legacy
              `feeCeilingRate`, when the real share is a FLAT 13% of the losing side and
              `feeCeilingRate` is not read by this model at all.
          ⛔ Values right, law retired — the exact class `docs/RULES.md` §2.1 records for
          `/admin/updown`: "a correct figure under a retired rule, which is worse than a
          wrong one because an operator who checks the arithmetic finds it sound".
          `/admin/markets/[id]` was already branched correctly; this copies its shape.
          ⚠️ The rate quoted is `sim.fee.shareOfLosers` — the clamped `loserRate` that
          `poolFee` ACTUALLY charged — never the raw `platformFeeRate + operatorFeeRate`,
          for the same reason `describeFeeModel` clamps its caption. */}
      <div className="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-bg-overlay/40 p-3 lg:grid-cols-4">
        <Stat label="Fee charged" value={formatTzs(Math.round(sim.fee.fee))} tone="gold" money
          hint={isLoserShare
            ? (sim.losingPool > 0 ? `${fmtRate(sim.fee.shareOfLosers)} of the losing pool` : "no losing side — nothing to charge")
            : sim.fee.capped ? "min() picked the ceiling" : "min() picked the commission"} />
        <Stat label="Net pool to winners" value={formatTzs(Math.round(sim.fee.netPool))} money />
        {isLoserShare ? (
          <Stat
            label="Our share of the losers' money"
            value={sim.losingPool > 0 ? fmtRate(sim.fee.shareOfLosers) : "—"}
            hint={sim.losingPool > 0 ? "flat — this model has no ceiling" : "no losing side"}
          />
        ) : (
          <Stat
            label="Our share of the losers' money"
            value={sim.fee.smaller > 0 ? `${(sim.fee.shareOfLosers * 100).toFixed(1)}%` : "—"}
            hint={sim.fee.smaller > 0 ? `never exceeds ${fmtRate(config.feeCeilingRate)}` : "one-sided"}
          />
        )}
        <Stat
          label="We keep (after TRA + GBT)"
          value={formatTzs(sim.operatorNet)}
          money
          hint={`TRA ${formatTzs(sim.traLevy)} · GBT ${formatTzs(sim.gbtLevy)}`}
        />
      </div>

      {/* What the player actually gets — the only number that matters. */}
      {sim.oneSided ? (
        <Callout tone="info" title="One-sided poll — everyone is refunded">
          Nobody bet the other side, so there is no prize to pay from. The fee is zero and every stake is
          returned in full. This poll earns us nothing.
        </Callout>
      ) : sim.stakeTooBig ? (
        <Callout tone="warning" title="Stake exceeds the winning pool">
          A position cannot be larger than the side it sits on — the pools already include this stake.
        </Callout>
      ) : sim.res ? (
        <>
          <div className="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-bg-overlay/40 p-3 lg:grid-cols-4">
            <Stat label={stakeLabel} value={formatTzs(stake)} money />
            <Stat label="Payout" value={formatTzs(sim.res.payout)} tone="gold" money />
            <Stat
              label="Profit"
              value={formatTzs(sim.res.net)}
              tone={sim.res.net >= 0 ? "yes" : "no"}
              money
            />
            <Stat
              label="Ratio"
              value={`${sim.res.ratio.toFixed(3)}×`}
              tone={sim.res.ratio >= 1 ? "yes" : "no"}
              hint={sim.res.ratio >= 1 ? "at or above stake" : "BELOW STAKE"}
            />
          </div>

          {/* The guarantee, checked live rather than promised. */}
          {sim.res.ratio < 1 ? (
            <Callout tone="danger" title="A winner would be paid LESS than they staked">
              This must be impossible. The fee ceiling exists to prevent exactly this, and saving a config
              that allows it is refused. If you are seeing this, the payout maths has regressed — do not ship.
            </Callout>
          ) : (
            <Callout tone="brand" title="A correct call cannot lose money">
              This stake gets back {formatTzs(sim.res.payout)} on {formatTzs(stake)} staked
              ({sim.res.ratio.toFixed(3)}×). Across every possible split of a poll at these rates, the worst any
              winner can do is <strong>{worst.ratio.toFixed(3)}×</strong> — never below 1.000×.
              {sim.fee.capped && " On this poll the ceiling bound, so we took less than the headline commission."}
            </Callout>
          )}
        </>
      ) : null}

      {/* Fee vs. outcome — a fact about these very numbers, per the active model.
          ⛔ DG-A-12 · §T4 — BOTH BRANCHES ARE PROSE, AND NEITHER TAKES `.amount`.
          `qa:dg-money` surfaced these two as off-ladder AMOUNTS because the paragraph calls
          `formatTzs()` three times. It is not an amount — it is a 40-word paragraph explaining
          the licence posture, with figures inside the sentence. ⭐ THIS IS THE EXACT TRAP THE
          FIRST money-sweep TOOL FELL INTO: it judged "is this an amount?" from a ±4-line window
          and rewrote *"A confirmed movement reconciles … Drift must be TZS 0."* into `.amount`.
          §M4 governs AMOUNTS ONLY — its own note says so — and putting `.amount` here would set
          the whole paragraph in JetBrains Mono with tabular figures.
          What IS wrong is the size: 10.5px is off the ladder (§T1) and two pixels under §T4's
          12.5px reading floor, on reading copy. It takes `text-body-sm` (13), the first rung at
          or above the floor; `leading-relaxed` stays, because the rung's 18px line-height is
          tighter than the ratio this paragraph was set with.
          🔴 AND THE §T4 FIX IMMEDIATELY BROKE §M4 — `test:type-scale` §2 caught it, which is
          why the amounts below are WRAPPED. Every Tailwind rung is a tuple that also emits
          `letter-spacing` (`text-body-sm` = −0.05px), while the old `text-[10.5px]` set size
          alone. So lifting the paragraph to a legible rung letter-spaced the four figures
          inside it, and §M4 says an amount is ⛔ never letter-spaced. The guard's own remedy
          is the one taken: *"wrap the amount in its own span — the sentence keeps its voice,
          the number keeps the ladder."* `.amount` is (0,2,0), so it wins over the paragraph's
          rung. ⭐ This is DG-A-14's shape: an amount inside a sentence is governed by BOTH
          laws, and satisfying one by itself breaks the other. */}
      {isLoserShare ? (
        <p className="font-mono text-body-sm leading-relaxed text-text-subtle">
          Loser-share: the fee DEPENDS on who wins. On these pools it is <span className="amount">{formatTzs(Math.round(sim.fee.fee))}</span> if {side} wins
          {" "}(a {fmtRate(sim.fee.shareOfLosers)} slice of the losing side), and
          {" "}<span className="amount">{formatTzs(Math.round(sim.feeIfOtherSideWon))}</span> if {side === "YES" ? "NO" : "YES"} wins. This is an owner-approved
          override of the outcome-neutral posture — see docs/COMPLIANCE-DECISIONS.md.
        </p>
      ) : (
        /* ⛔ The other branch of the same paragraph — see the note above. Prose, not an amount. */
        <p className="font-mono text-body-sm leading-relaxed text-text-subtle">
          Outcome-neutral: the fee on these pools is <span className="amount">{formatTzs(Math.round(sim.fee.fee))}</span> whether YES wins or NO
          wins (<span className="amount">{formatTzs(Math.round(sim.feeIfOtherSideWon))}</span> either way). The fee is computed from the two pool
          sizes alone and never reads the outcome — that is what the pari-mutuel licence rests on.
        </p>
      )}
    </div>
  );
}
