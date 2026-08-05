/**
 * ⭐ E-103 · WHAT PERCENTAGE BELONGS BESIDE A FUNNEL STAGE — and why it is not "of the one above".
 *
 * 🔴 FOUND BY LOOKING AT `/admin/insights` WITH A FUNDED FLEET ON IT, 2026-08-05. With real data
 * in the page for the first time it read:
 *
 *      REGISTERED    55
 *      KYC APPROVED   6    11%
 *      DEPOSITED     11   183%      ← a funnel stage cannot exceed the one above it
 *      PLACED A BET  27   245%      ←
 *
 * The arithmetic was correct for what it computed — `value / previous.value` — and the premise
 * was wrong. ⛔ **THESE STAGES ARE NOT NESTED, AND THAT IS MEASURED, NOT ARGUED**
 * (`scripts/s29-insights-vs-db.cjs`, production): **12 players placed a bet with no confirmed
 * deposit**, and **9 deposited without approved KYC**. A player can fund a wallet before KYC
 * clears, and a bonus or an operator adjustment can put someone into a market having never
 * deposited at all. So *"conversion from the previous stage"* is not a quantity that exists on
 * this platform, and printing it produced a number that reads as broken arithmetic on the
 * owner's dashboard — or worse, as a triumph ("deposit conversion is 183%").
 *
 * ⭐ THE DENOMINATOR IS THE TOP STAGE, FOR EVERY ROW. Against four independent counts, "what
 * share of everyone who registered reached this" is the one comparison that means something and
 * the one a reader can add up. It also makes the column self-consistent — the actual defect was
 * **two different denominators in one column** (KYC used the top, the rest used the previous).
 *
 * ⛔ AND THE CHART MUST SAY SO. `docs/…` precedent (AWARKEH M10): when a figure is right but
 * reads wrong, fix it by DISCLOSURE, not by arithmetic. The label carries its denominator and
 * the card carries a sentence naming the non-nesting, because a "funnel" whose stages are not
 * subsets is a chart type making a claim the data does not support.
 */
export type FunnelStage = { label: string; value: number };

export type FunnelRow = {
  label: string;
  value: number;
  /** Share of the TOP stage. `undefined` on the top stage itself — it is the denominator. */
  shareOfTop: string | undefined;
  /** Bar width 0–100, scaled to the LARGEST stage so the longest bar is always full. */
  barPct: number;
};

export function funnelShares(stages: readonly FunnelStage[]): FunnelRow[] {
  const top = stages[0]?.value ?? 0;
  // Scale bars to the largest value, not to the top stage: with non-nested stages a later one
  // could exceed the first, and a bar wider than its track is a rendering bug rather than a fact.
  const max = Math.max(...stages.map((s) => s.value), 1);
  return stages.map((s, i) => ({
    label: s.label,
    value: s.value,
    // ⛔ `top`, never `stages[i - 1]`. That substitution IS the defect.
    shareOfTop: i === 0 ? undefined : top > 0 ? `${Math.round((s.value / top) * 100)}%` : "—",
    // The 8% floor keeps a tiny-but-real stage visible rather than rendering as a sliver
    // indistinguishable from zero — an honest minimum, not an inflated value, because the
    // number is printed inside the bar.
    barPct: Math.max(8, (s.value / max) * 100),
  }));
}

/**
 * Does the data actually nest? Used to decide whether the disclosure sentence is needed, so the
 * page never asserts "these are independent counts" about a set that happens to be a real funnel.
 */
export function stagesAreNested(stages: readonly FunnelStage[]): boolean {
  for (let i = 1; i < stages.length; i++) if (stages[i].value > stages[i - 1].value) return false;
  return true;
}
