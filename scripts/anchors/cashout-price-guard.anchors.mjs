/**
 * Anchors for `red:cashout-price-guard` (Vodacom plan S6, A8c) — each puts back one defect the sale's price guard exists to
 * prevent, in the real `cashOutPosition` / `cashOutPositionFromForm`, and names the assertion of
 * `scripts/lib/cashout-price-guard-cases.mts` that must turn red on the memory store. DATA, so `test:red-anchors` can audit
 * that every `from` still resolves exactly once without running the harness.
 *
 * `expect` is the start of the case's own label: any other red is WRONG-ASSERTION. `test:sell-price-guard`'s in-process
 * twin plants the same defects into the source TEXT; these prove the cases that drive the money path see them too.
 *
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
const SVC = "src/lib/server/market-service.ts";
const LF = String.fromCharCode(10);
const GUARD = `    if (opts.expectedValue !== undefined && opts.expectedValue !== paid) {`;

export const MUTATIONS = [
  {
    name: "(1) the check is switched off (a sale confirmed at the free price is paid the fee price)",
    file: SVC,
    from: GUARD,
    to: `    if (false) {`,
    expect: "1.2 · the free price its confirm showed",
    suite: "memory",
  },
  {
    name: "(2) only a figure BELOW the price is refused (the lapse — confirmed free, charged a fee — sells)",
    file: SVC,
    from: `opts.expectedValue !== paid) {`,
    to: `opts.expectedValue < paid) {`,
    expect: "1.2 · the free price its confirm showed",
    suite: "memory",
  },
  {
    name: "(3) only a figure ABOVE the price is refused (a player who confirmed less is paid more than they saw)",
    file: SVC,
    from: `opts.expectedValue !== paid) {`,
    to: `opts.expectedValue > paid) {`,
    expect: "1.2 · one shilling below the price",
    suite: "memory",
  },
  {
    name: "(4) the check compares against the price, not what the sale credits (a short pool pays less than confirmed)",
    file: SVC,
    from: `opts.expectedValue !== paid) {`,
    to: `opts.expectedValue !== value) {`,
    expect: "5.1 ·",
    suite: "memory",
  },
  {
    name: "(5) the pool's debit lands before the check (a refusal leaves the pool short)",
    file: SVC,
    from: GUARD,
    to: `    await marketStore.addToPool(m.id, ownYes ? { yesPool: -ownDebit } : { noPool: -ownDebit });${LF}${GUARD}`,
    expect: "1.4 · the free price its confirm showed",
    suite: "memory",
  },
  {
    name: "(6) a short pool is told its price changed (the page can never offer that price, so the player loops)",
    file: SVC,
    from: `      if (paid !== value) {`,
    to: `      if (false) {`,
    expect: "5.1 ·",
    suite: "memory",
  },
  {
    name: "(7) the page's path reads a broken figure as no figure (the guard silently off for a broken client)",
    file: SVC,
    from: `  if (!expected.ok) {`,
    to: `  if (false) {`,
    expect: "6b.1 · the broken figure",
    suite: "memory",
  },
  {
    name: "(8) a refused price is never recorded (a broken pool or host is seen only by the player)",
    file: SVC,
    from: `    recordRefusedSale(userId, positionId, r.reason, expected.expectedValue ?? null, r.detail);`,
    to: ``,
    expect: "1.5b ·",
    suite: "memory",
  },
  {
    name: "(9) every refusal is recorded, a shut exit's too",
    file: SVC,
    from: `  if (!r.ok && (r.reason === "price_changed" || r.reason === "cashout_pool_short")) {`,
    to: `  if (!r.ok) {`,
    expect: "3.4 ·",
    suite: "memory",
  },
];
