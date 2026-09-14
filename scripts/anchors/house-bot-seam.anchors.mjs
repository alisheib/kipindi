/**
 * Anchors for the house-bot money seam (04 F3, N1 §3 MON-09) — DATA, read by `test:house-bot-seam` and
 * by `red:house-bot-money`, and audited by `test:red-anchors` (every `from` resolves exactly once).
 *
 * ⛔ THE SEAM SITES. Every `ctx.kind` comparison in `market-service.ts` sits under a `// SEAM:<name>`
 * marker, and the markers are exactly `SEAM_SITES`. A house skip planted anywhere else in the bet path
 * — the "if house, skip this gate" shape F3 exists to stop — fails the seam suite's pin.
 *
 * ⛔ THE DECLARED H2 ORDER. `H2_ORDER` is the group order of `houseH2` (its `// H2_ORDER:` markers) and
 * `H2_CAP_SEQUENCE` the order its cap literals appear in. Within the rate group the terminal
 * PER_MARKET_COUNT is checked first, which is how "the terminal cap wins even when an earlier deferrable
 * cap also fails" is implemented; the caps suite's §2 fixtures prove the behaviour.
 */
export const SEAM_SITES = [
  "H0", "H1", "session", "replay", "H2", "cash", "marker", "lockTimeout", "H3", "markPlaced", "revertNoFunds",
  "revertNoFundsBonus", "txnMarker", "H4", "wagering", "superseded", "audit", "receipts", "recruit",
  "reverseWageringOrphan", "markerOrphan", "cashOutValue", "cashOutPosition", "markerCashout", "markerOneSided",
  "markerVoid", "markerWin", "reverseWagering", "markerEmergency", "reverseWageringEmergency",
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
];
