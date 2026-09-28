/**
 * What a market card may say about its price — landing v3 WP6, MOBILE-VISUAL ruling 13, INHERIT-MANIFEST L14.
 *
 * ⭐ ONE ANSWER, READ FROM THE TWO POOLS, NEVER FROM A ROUNDED PERCENTAGE. A card has three honest
 * states, and they are facts about the money, not about a number derived from it:
 *   · `none`     — nothing is staked. No price (the em-dash and "No bets yet", licence condition 1).
 *   · `oneSided` — money on one side only. **A price needs two sides** (ruling 13): a split of a pool
 *                  with one part is 100/0, a certainty nobody's money stated, and every stake is
 *                  refunded if betting closes like this (`settleMarket`'s one-sided branch, rules §7).
 *   · `priced`   — money on both sides. Shown within **1–99** (L14): `Math.round` turns 25,000 vs 100
 *                  into 100, which states a certainty two stakers disproved. The NO figure is always
 *                  `100 − yesPct`, never rounded on its own, so the pair cannot read 0 either.
 *
 * ⛔ NEVER INFER ONE-SIDEDNESS FROM `yesPct === 0 || === 100`. A genuine 99.6% two-sided market rounds
 * to 100 and would lose a price it really has; a one-sided market is the POOL's shape. Ruling 13's
 * "no clamping" is about the one-sided case (there is no price to clamp); the 1–99 range applies only
 * where both pools hold money. The two are one rule, not a conflict.
 *
 * ⛔ NOT `pricedYesPct`. That function is the unrounded-to-range share the hero's aggregate conviction
 * bar, the topic lean and the board's odds filters read (`test:hero-contract` §1 pins one-sided pools
 * to 100/0 there), and an aggregate over the whole book is not a market's price.
 *
 * ⚠️ NO IMPORTS, NO "use client": the market card (a client component) and the server-rendered
 * landing both call this, and a helper exported from a "use client" file and called on the server is
 * the outage that took every page down while tsc and the build stayed green.
 */
export type Side = "YES" | "NO";

export type PriceState =
  | { kind: "none" }
  | { kind: "oneSided"; emptySide: Side }
  | { kind: "priced"; yesPct: number };

/**
 * ⭐ R6(2) (Ali, 2026-09-27) · ONE "tipping" rule: a two-sided price within 3 points of an even split,
 * |YES − 50| ≤ 3. Before C1 four surfaces each kept their own threshold — the bar's lean word `< 3`, the
 * card badge `≤ 3`, the share preview `< 4` and /live's header count `< 8` — so one market could be
 * "tipping" on one screen and "leans yes" on the next. Every surface reads `isTipping`; none compares.
 * ⚠️ Only ever called with a PRINTED price (1–99): an empty or one-sided pool has no price to tip.
 */
export const TIPPING_BAND = 3;

export function isTipping(yesPct: number): boolean {
  return Math.abs(yesPct - 50) <= TIPPING_BAND;
}

export function priceState(yesPool: number, noPool: number): PriceState {
  const yes = Math.max(0, yesPool);
  const no = Math.max(0, noPool);
  if (yes > 0 && no > 0) {
    const share = Math.round((yes / (yes + no)) * 100);
    return { kind: "priced", yesPct: Math.min(99, Math.max(1, share)) };
  }
  if (yes > 0) return { kind: "oneSided", emptySide: "NO" };
  if (no > 0) return { kind: "oneSided", emptySide: "YES" };
  return { kind: "none" };
}

/**
 * The YES figure a surface may PRINT or rank by: the two-sided price (1–99), or **null** where there
 * is none — nothing staked, or one side only. This is what a board row carries as `yesPct`, so the
 * `/markets` odds filters and "closest call" sort treat a one-sided market as the card shows it (no
 * price), instead of filing a NO-only pool under long shots at 0%.
 */
export function shownYesPct(yesPool: number, noPool: number): number | null {
  const p = priceState(yesPool, noPool);
  return p.kind === "priced" ? p.yesPct : null;
}

/**
 * The landing's price-quality tier, from the pools: 0 two-sided (a price exists), 1 one-sided, 2 empty.
 *
 * The hero's floor and the landing grid both order by it, so a market with no price never takes a seat
 * a priced one could have. 🔴 It used to be read from the ROUNDED `yesPct` (`=== 0 || === 100`), which
 * put a two-sided 199-vs-1 market (rounds to 100) in the one-sided tier and its mirror image 1-vs-199
 * (rounds to 1) in the contested one — two tiers for one shape, decided by `Math.round(0.5)`.
 */
export function priceTier(r: { yesPool: number; noPool: number }): 0 | 1 | 2 {
  const kind = priceState(r.yesPool, r.noPool).kind;
  if (kind === "priced") return 0;
  if (kind === "oneSided") return 1;
  return 2;
}
