/**
 * Anchors for `test:house-bot-rules` §10's scope-reach block — the production finding of 2026-09-22.
 *
 * ⛔ WHAT WAS MEASURED, READ-ONLY, ON PRODUCTION THAT DAY. An ACTIVE account on a switched-ON desk had matched no
 * market, ever — zero intents, zero positions — while the roster showed it green with both products. Its stored rules
 * ticked both products with EMPTY scope lists: `DEFAULT_RULES_V1` ships `chains: []` and `categories: []`, no screen
 * wrote either, the engine's predicate ended in `[].includes(x)`, and Start refused nothing because it never asked
 * whether the scope selects anything. The fix is ONE predicate (`rulesCoverTarget`) that the engine delegates to and
 * the desk asks the other way round (`rulesReach`, `rulesInertReasons`), two save rows built from the same reasons,
 * and a Start that refuses one cause per field.
 *
 * ⛔ EACH MUTATION BELOW WAS RUN BY HAND AT THE COMMIT THAT LANDED IT (break, run the suite, record the red count,
 * restore by the reverse edit, re-run green); the counts are in that commit's message. `test:house-bot-rules` has no
 * `red:*` harness of its own, so the declarations live here for `test:red-anchors` §3 to keep pointed at the product
 * and for the suite's own `7.505` roll-call to hold each `expect` to a label the run really prints.
 *
 * `expect` names the `ok("…")` label that must turn red; `suite` is `rules`
 * (`npx tsx scripts/house-bot-rules.test.mts`, pure — no database, no network).
 */
const RULES = "src/lib/house-bot/rules.ts";
const ROUTES = "src/lib/house-bot/console-routes.ts";

export const MUTATIONS = [
  {
    /* (a) the predicate ignores an EMPTY list — the widening that would make the production shape "cover" everything.
     * ⚠️ The class guard (10.class) does NOT go red on this one, and that is by construction: Start and the oracle both
     * ask this predicate, so they agree with each other; what refuses the widening is the direct pins on the predicate,
     * the reach and the production shape. */
    name: "scope-ignore-categories · rulesCoverTarget treats an empty category list as every category",
    file: RULES,
    from: `  return r.scope.products.polls && (mode == null || r.modes.polls[mode]) && r.scope.categories.includes(target.category);`,
    to: `  return r.scope.products.polls && (mode == null || r.modes.polls[mode]) && (r.scope.categories.length === 0 || r.scope.categories.includes(target.category));`,
    expect: "10.cover · ⛔ THE FINDING · a ticked product with an EMPTY list covers nothing",
    suite: "rules",
  },
  {
    name: "scope-ignore-chains · rulesCoverTarget treats an empty chain list as every chain",
    file: RULES,
    from: `    return r.scope.products.updown && (mode == null || r.modes.updown[mode]) && r.scope.chains.includes(target.chainKey);`,
    to: `    return r.scope.products.updown && (mode == null || r.modes.updown[mode]) && (r.scope.chains.length === 0 || r.scope.chains.includes(target.chainKey));`,
    expect: "10.cover · ⛔ THE FINDING · a ticked product with an EMPTY list covers nothing",
    suite: "rules",
  },
  {
    /* (b) one product's refusal dropped — Start lets an Up & Down that reaches nothing through. THIS is the one the
     * class guard exists for: Start and the predicate now disagree on every such document. */
    name: "scope-drop-updown-refusal · a ticked Up & Down with no chain is no longer a reason",
    file: RULES,
    from: `    const members: readonly string[] = product === "updown" ? reach.updown.chains : reach.polls.categories;
    if (members.length === 0) {`,
    to: `    const members: readonly string[] = product === "updown" ? reach.updown.chains : reach.polls.categories;
    if (members.length === 0 && product === "polls") {`,
    expect: "10.class · ⭐ over all 4096 documents",
    suite: "rules",
  },
  {
    /* (c) the save row reports on the wrong list — the officer is sent to the chain picker for a missing category. */
    name: "scope-row-wrong-field · R-PRODUCT-LIST reports each empty list on the OTHER product's list field",
    file: RULES,
    from: `      .map((r) => ({ field: r.field, message: ruleCopy("R-PRODUCT-LIST", r.product === "updown" ? 1 : 0) })),`,
    to: `      .map((r) => ({ field: r.product === "updown" ? "scope.categories" : "scope.chains", message: ruleCopy("R-PRODUCT-LIST", r.product === "updown" ? 1 : 0) })),`,
    expect: "3.R-PRODUCT-LIST · Polls ticked with no category is refused on the category list",
    suite: "rules",
  },
  {
    /* (d) a by-hand screen declared that does not exist — Start would let an Enter-now-only account start and never bet. */
    name: "scope-byhand-flag-without-screen · BY_HAND_SCREENS.enterNow is true while no page exists at its route",
    file: ROUTES,
    from: `export const BY_HAND_SCREENS: ByHandScreens = { enterNow: false, targeting: false };`,
    to: `export const BY_HAND_SCREENS: ByHandScreens = { enterNow: true, targeting: false };`,
    expect: "10.byhand · ⛔ BY_HAND_SCREENS is tied by existence",
    suite: "rules",
  },
];
