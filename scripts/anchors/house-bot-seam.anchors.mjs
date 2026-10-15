/**
 * Anchors for the house-bot money seam (04 F3, N1 §3 MON-09) — DATA, read by `test:house-bot-seam` and
 * by `red:house-bot-money`, and audited by `test:red-anchors` (every `from` resolves exactly once).
 *
 * ⛔ THE SEAM SITES. Every house branch in `market-service.ts` — any `ctx.kind` use, a `"house"`
 * comparison, or a condition on `houseIntent`/`housePool`/`housePosition`/`houseBotId` — sits within the
 * first three code lines under a `// SEAM:<name>` marker, and the markers are exactly `SEAM_SITES`. A house
 * skip planted anywhere else in the bet path — the "if house, skip this gate" shape F3 exists to stop —
 * fails the seam suite's pin. Data carried along (a `houseStake:` label value, `houseBotId: … ?? null`)
 * is not a branch.
 *
 * ⛔ THE DECLARED H2 ORDER. `H2_ORDER` is the group order of `houseH2` (its `// H2_ORDER:` markers) and
 * `H2_CAP_SEQUENCE` the order its cap literals appear in. Within the rate group the terminal
 * PER_MARKET_COUNT is checked first, which is how "the terminal cap wins even when an earlier deferrable
 * cap also fails" is implemented; the caps suite's §2 fixtures prove the behaviour.
 */
export const SEAM_SITES = [
  /* ⭐ `oppositeSide` ADDED 2026-09-21 WITH THE SITE IT NAMES. `buyPositionInner`'s `opposite` predicate now
   * excludes house-marked rows, which makes it a house branch — and §4.1 requires every house branch in
   * `market-service.ts` to sit under a marker, so the marker and this entry arrive together. The defect it
   * closes is recorded at the site: an OPEN house position on the other side made `opposite` truthy for the
   * HOLDER'S OWN real-money stake, so their bonus wagering accrued nothing while the documented escape
   * (closing the opposite leg) is refused for a house leg. */
  "oppositeSide",
  /* ⭐ `shownCount` ADDED 2026-10-11 WITH ITS SITE (sanctioned change (s), owner ruling "a desk account may count as
   * more than one predictor"): straight after H2, the house context reads its "Counts as" for the pool increment's
   * `predictorExtra`. It moves no money and refuses nothing; a player's stake reads 0. */
  /* ⭐ `landedKey` ADDED 2026-10-12 WITH ITS SITE (live fix L2, VODACOM-PLAN §0h point 81): a player's REFUSED keyed bet is
   * answered with the bet that key already placed (`landedKeyAnswer`) — only the player's own, and never a house stake's,
   * the replay's own rule (sanctioned change (b)) — so its `houseBotId != null` is a house branch, under its marker. It
   * moves no money and runs only after a refusal of a player's request; `placeHouseBet` answers its key at H0. */
  "landedKey",
  "H0", "H1", "session", "replay", "H2", "shownCount", "cash", "marker", "lockTimeout", "H3", "markPlaced", "revertNoFunds",
  "revertNoFundsBonus", "txnMarker", "H4", "wagering", "superseded", "audit", "receipts", "recruit",
  "reverseWageringOrphan", "markerOrphan", "cashOutValue", "cashOutReason", "cashOutPosition", "markerCashout", "markerOneSided",
  "markerVoid", "markerWin", "reverseWagering", "markerEmergency", "reverseWageringEmergency",
  // 04 F6: the per-stake email rule on outcome notices, and a verdict's objection standing (C4 rulings 143–145;
  // D19 removed the liquidity label these sites used to carry).
  "emailOneSided", "emailWin", "emailLoss", "emailCancelled", "verdictStanding", "selectionClosedEmail",
  // C4-SPEC ruling 101: the Up & Down post-commit trigger hook (player stakes only, after the commit, outside the lock).
  "trigger",
];

export const H2_ORDER = ["standing", "role", "consent", "cash", "conflicts", "money", "staff", "rate"];

export const H2_CAP_SEQUENCE = [
  "STAKE_MIN", "STAKE_MAX", "PER_MARKET", "BALANCE_FLOOR", "DAILY_STAKE", "DAILY_LOSS_PROJECTED", "EXPOSURE",
  "STAFF_CHOSEN_PER_DAY", "STAFF_CHOSEN_DAILY_STAKE", "TARGET_ONCE",
  "PER_MARKET_COUNT", "MIN_GAP", "PER_HOUR", "PER_DAY",
];

const SVC = "src/lib/server/market-service.ts";
const SEAM = "src/lib/server/house-bot/seam.ts";

export const MUTATIONS = [
  {
    // F3: a house branch loses its marker — the pin must see an unmarked `ctx.kind` site.
    name: "market-service.ts — the H2 site loses its SEAM marker",
    file: SVC,
    from: `    // SEAM:H2\n`,
    to: ``,
    expect: "4.1 · every ctx.kind comparison in market-service.ts sits under a SEAM: marker",
    suite: "seam",
  },
  {
    // F3: the planted skip — a gate helper that waves house context through.
    name: "market-service.ts — maintenance skipped for house context (the F3 planted skip)",
    file: SVC,
    from: `  if (await isMaintenanceMode()) {`,
    to: `  if (ctx.kind === "player" && await isMaintenanceMode()) {`,
    expect: "4.1 · every ctx.kind comparison in market-service.ts sits under a SEAM: marker",
    suite: "seam",
  },
  {
    // LIE-04: the same skip written with the literal first — the pin must not depend on operand order.
    name: "market-service.ts — maintenance skipped when \"house\" === ctx.kind",
    file: SVC,
    from: `  if (await isMaintenanceMode()) {`,
    to: `  if (!("house" === ctx.kind) && await isMaintenanceMode()) {`,
    expect: "4.1 · every ctx.kind comparison in market-service.ts sits under a SEAM: marker",
    suite: "seam",
  },
  {
    // LIE-04: a skip keyed on the loaded intent instead of ctx.kind.
    name: "market-service.ts — maintenance skipped when a house intent is loaded",
    file: SVC,
    from: `  if (await isMaintenanceMode()) {`,
    to: `  if (!houseIntent && await isMaintenanceMode()) {`,
    expect: "4.1 · every ctx.kind comparison in market-service.ts sits under a SEAM: marker",
    suite: "seam",
  },
  {
    // N1-8: the staff-chosen group moves after the rate caps — the declared order changes.
    name: "seam.ts — the staff-chosen group is declared after the rate caps",
    file: SEAM,
    from: `  // H2_ORDER:staff\n`,
    to: `  // H2_ORDER:rate-first\n`,
    expect: "5.1 · houseH2's group markers are exactly H2_ORDER, in order",
    suite: "seam",
  },
  {
    // 04 A9: a row lock sneaks into the seam's reads.
    name: "seam.ts — a FOR UPDATE read in the house gates",
    file: SEAM,
    from: `  const bot = await houseBotStore.get(ctx.botId, tx);`,
    to: `  const bot = await houseBotStore.get(ctx.botId, tx); void "SELECT 1 FOR UPDATE";`,
    expect: "5.3 · the house gates take no row lock (no FOR UPDATE)",
    suite: "seam",
  },
  {
    // N1-4: H0 filters on status — a routine cancellation would read as a key mismatch.
    name: "seam.ts — H0 loads the intent only when CLAIMED",
    file: SEAM,
    from: `  const intent = await houseBotIntentStore.get(ctx.intentId);\n  if (!intent ||`,
    to: `  const loaded = await houseBotIntentStore.get(ctx.intentId);\n  const intent = loaded && loaded.status === "CLAIMED" ? loaded : null;\n  if (!intent ||`,
    expect: "5.4 · H0 never reads the intent's status",
    suite: "seam",
  },
  /* ⭐ SANCTIONED CHANGE (s) — "Counts as" at the bet (owner ruling 2026-10-11). Three ways the stamp can lie, each
     caught by §6's (s) on its OWN assertion. `npm run red:house-bot-money -- --only ca-`. */
  {
    name: "ca-every-stake · shown-count.ts adds the extra at EVERY stake, not at the account's first on the market",
    file: "src/lib/server/house-bot/shown-count.ts",
    from: `  if (input.mine.some((p) => p.houseBotId === input.botId)) return 0;`,
    to: `  if (input.mine.some((p) => p.houseBotId === "never")) return 0;`,
    expect: "6.s3 · its SECOND stake on the same market adds nothing to either count",
    suite: "seam",
  },
  {
    name: "ca-whole-weight · shown-count.ts adds the whole weight instead of the weight less the account itself",
    file: "src/lib/server/house-bot/shown-count.ts",
    from: `  return account ? countsAsOf(account.rules) - 1 : 0;`,
    to: `  return account ? countsAsOf(account.rules) : 0;`,
    expect: "6.s2 · a desk account counted as 100",
    suite: "seam",
  },
  {
    name: "ca-player-extra · market-service.ts gives a PLAYER's stake an extra",
    file: SVC,
    from: `    const shownExtra = ctx.kind === "house" ? await houseShownExtra({ tx: lockTx, botId: ctx.botId, mine }) : 0;`,
    to: `    const shownExtra = ctx.kind === "house" ? await houseShownExtra({ tx: lockTx, botId: ctx.botId, mine }) : 1;`,
    expect: "6.s1 · a player's stake",
    suite: "seam",
  },
  {
    // N6: a PAIR must still fail closed when its one-sided desk condition is gone.
    name: "seam.ts — N6 · a PAIR row passes after the condition is gone",
    file: SEAM,
    from: `      || stake > Math.floor(market.otherBotOpenStakeTzs * share.matchPct / 100)) return refuse(conditionGone("PAIR"));`,
    to: `      || stake > Math.floor(market.otherBotOpenStakeTzs * share.matchPct / 100)) return { refusal: null, pool };`,
    expect: "3p.1 · a PAIR row is refused as a lost condition",
    suite: "seam",
  },
  {
    name: "seam.ts — N6 · the PAIR's in-lock holder check is removed",
    file: SEAM,
    from: `    if (await sameHouseHolder(intent.botUserId, market.otherBotUserId, tx)) return refuse(conflict("SAME_HOLDER"));`,
    to: `    if (false) return refuse(conflict("SAME_HOLDER"));`,
    expect: "3p2.2 · a second desk account with the opener's KYC name and DOB refuses SAME_HOLDER",
    suite: "seam",
  },
  {
    name: "seam.ts — N6 · the current share percent no longer binds the PAIR stake",
    file: SEAM,
    from: `      || stake > Math.floor(market.otherBotOpenStakeTzs * share.matchPct / 100)) return refuse(conditionGone("PAIR"));`,
    to: `      || false) return refuse(conditionGone("PAIR"));`,
    expect: "3p2.5 · a PAIR stake below the opposite 10,000 but above the current 50% share loses its condition in H3",
    suite: "seam",
  },
  {
    name: "seam.ts — N6 · unowned pool money may be mistaken for the other desk account's stake",
    file: SEAM,
    from: `rawPool(opposite(side)) !== market.otherBotOpenStakeTzs`,
    to: `false`,
    expect: "3p2.6 · a pool that no longer equals the one other desk account's OPEN stake ends the PAIR condition",
    suite: "seam",
  },
  {
    name: "seam.ts — N6 · a reached pair-round budget no longer binds at H4",
    file: SEAM,
    from: `    if (allPairs.count >= control.gCapPairRoundsPerDay) return refuse(capReached("PAIR_ROUNDS_PER_DAY"));`,
    to: `    if (false) return refuse(capReached("PAIR_ROUNDS_PER_DAY"));`,
    expect: "3b.3 · a newly placed pair exhausts the desk's remaining round budget",
    suite: "seam",
  },
  {
    name: "seam.ts — N6 · malformed raw pair limit can become effectively unbounded",
    file: SEAM,
    from: `Number(s.matchPerDay) <= 28_800`,
    to: `Number(s.matchPerDay) <= Number.MAX_SAFE_INTEGER`,
    expect: "3b.6 · a malformed raw daily account limit cannot open the in-lock PAIR gate",
    suite: "seam",
  },
];
