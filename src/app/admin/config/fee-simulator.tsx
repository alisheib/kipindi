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
 */

import { useMemo, useState } from "react";
import { Input, Field } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { Callout } from "@/components/ui/callout";
import { poolFee, settledPayoutFor, worstCaseWinnerRatio } from "@/lib/payout";
import type { RateConfig } from "@/lib/server/market-config";
import { formatTzs, fmtRate } from "@/lib/utils";

const num = (s: string, fallback = 0) => {
  const n = Number(String(s).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export function FeeSimulator({ config }: { config: RateConfig }) {
  // Defaults are THE REPORTED POLL. Whoever opens this screen next should see, in
  // the first second, the case that caused all this — and see it paying correctly.
  const [yesRaw, setYes] = useState("300000");
  const [noRaw, setNo] = useState("10500");
  const [stakeRaw, setStake] = useState("100000");
  const [side, setSide] = useState<"YES" | "NO">("YES");

  const yesPool = num(yesRaw);
  const noPool = num(noRaw);
  const stake = num(stakeRaw);

  const isLoserShare = config.feeModel === "loser-share";

  const sim = useMemo(() => {
    // Pass the winning side: loser-share charges the LOSING pool, so its fee depends
    // on the outcome. Capped-commission ignores the side (outcome-neutral).
    const fee = poolFee(yesPool, noPool, config, side);
    const winningPool = side === "YES" ? yesPool : noPool;
    const otherSide = side === "YES" ? "NO" : "YES";

    // The stake is assumed ALREADY IN the pools (this is a settlement preview, not
    // a new bet), so we use the settlement function directly.
    const res = winningPool > 0 && stake > 0 && stake <= winningPool
      ? settledPayoutFor({ yesPool, noPool, side, stake }, config)
      : null;

    // The fee if the OTHER side had won. For capped-commission this is identical
    // (outcome-neutral). For loser-share it DIFFERS — the footer says which.
    const feeIfOtherSideWon = poolFee(yesPool, noPool, config, otherSide).fee;

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
    };
  }, [yesPool, noPool, stake, side, config]);

  const worst = useMemo(
    () => worstCaseWinnerRatio(config),
    [config],
  );

  return (
    <div className="space-y-4">
      {/* Inputs */}
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
            <Stat
              label={`Loser-share rate (${fmtRate(config.platformFeeRate + config.operatorFeeRate)})`}
              value={fmtRate(config.platformFeeRate + config.operatorFeeRate)}
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

      <div className="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-bg-overlay/40 p-3 lg:grid-cols-4">
        <Stat label="Fee charged" value={formatTzs(Math.round(sim.fee.fee))} tone="gold" money
          hint={sim.fee.capped ? "min() picked the ceiling" : "min() picked the commission"} />
        <Stat label="Net pool to winners" value={formatTzs(Math.round(sim.fee.netPool))} money />
        <Stat
          label="Our share of the losers' money"
          value={sim.fee.smaller > 0 ? `${(sim.fee.shareOfLosers * 100).toFixed(1)}%` : "—"}
          hint={sim.fee.smaller > 0 ? `never exceeds ${fmtRate(config.feeCeilingRate)}` : "one-sided"}
        />
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
            <Stat label={`Stake on ${side}`} value={formatTzs(stake)} money />
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

      {/* Fee vs. outcome — a fact about these very numbers, per the active model. */}
      {isLoserShare ? (
        <p className="font-mono text-[10.5px] leading-relaxed text-text-subtle">
          Loser-share: the fee DEPENDS on who wins. On these pools it is {formatTzs(Math.round(sim.fee.fee))} if {side} wins
          {" "}(a {fmtRate(config.platformFeeRate + config.operatorFeeRate)} slice of the losing side), and
          {" "}{formatTzs(Math.round(sim.feeIfOtherSideWon))} if {side === "YES" ? "NO" : "YES"} wins. This is an owner-approved
          override of the outcome-neutral posture — see docs/COMPLIANCE-DECISIONS.md.
        </p>
      ) : (
        <p className="font-mono text-[10.5px] leading-relaxed text-text-subtle">
          Outcome-neutral: the fee on these pools is {formatTzs(Math.round(sim.fee.fee))} whether YES wins or NO
          wins ({formatTzs(Math.round(sim.feeIfOtherSideWon))} either way). The fee is computed from the two pool
          sizes alone and never reads the outcome — that is what the pari-mutuel licence rests on.
        </p>
      )}
    </div>
  );
}
