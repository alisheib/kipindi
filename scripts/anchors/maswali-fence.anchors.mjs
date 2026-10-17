/**
 * Anchors for `red:maswali-fence` (MASWALI-BUILD S0.5) — each puts back one way a Maswali Millionea week could again be
 * treated as a Yes/No poll, in the real source, and names the assertion of `scripts/lib/maswali-fence-cases.mts` that
 * must turn red on the memory store. DATA, so `test:red-anchors` can audit that every `from` still resolves exactly once
 * without running the harness.
 *
 * `expect` is the start of the case's own label: any other red is WRONG-ASSERTION.
 * ⚠️ MEMORY CHILD ONLY, like `red:cashout-price-guard`: the Postgres-only reads (the SQL anti-join on the leaderboard,
 * `toStoredMarket`) are held by `test:maswali-fence`'s Postgres child itself (§1.2–1.4, §3.2), which reads them through
 * the real DAL on a migrated cluster; the one reading every store shares, `storedProductLine`, is planted here (1).
 *
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
const SVC = "src/lib/server/market-service.ts";
const DAL = "src/lib/server/market-dal.ts";

export const MUTATIONS = [
  {
    name: "(1) the one reading folds MASWALI into MARKET again (only UPDOWN passes through)",
    file: "src/lib/product-line.ts",
    from: "  if (isKnownProductLine(v)) return v;",
    to: "  if (v === \"UPDOWN\") return v;",
    expect: "1.1 · storedProductLine",
    suite: "memory",
  },
  {
    name: "(2) the bet door sells a one-sided stake on a week",
    file: SVC,
    // ⚠️ RE-ANCHORED (MASWALI-BUILD S3): the fence is now a block that routes slips to the ticket arm; removing it lets a
    // no-picks buy fall through to the poll path — the one-sided stake this plant measures.
    from: "  if (isFencedMaswali(market)) {",
    to: "  if (false) {",
    expect: "2.1 · buyPosition refuses a week",
    suite: "memory",
  },
  {
    name: "(3) a ticket gets the poll's paid exit",
    file: SVC,
    from: "    if (isFencedMaswali(m)) return { ok: false as const, error: \"Market is not accepting predictions.\", code: \"INVALID\" as const, reason: \"market_not_live\" as const };",
    to: "    if (false) return { ok: false as const, error: \"Market is not accepting predictions.\", code: \"INVALID\" as const, reason: \"market_not_live\" as const };",
    expect: "2.2 · cashOutPosition",
    suite: "memory",
  },
  {
    name: "(4) an officer seals a whole week as one question",
    file: SVC,
    from: "  if (isFencedMaswali(m)) return { ok: false, error: MASWALI_FENCE_ERROR, code: \"INVALID\" };",
    to: "  if (false) return { ok: false, error: MASWALI_FENCE_ERROR, code: \"INVALID\" };",
    expect: "2.3 · resolveMarket refuses",
    suite: "memory",
  },
  {
    name: "(5) the generic emergency void refunds a week (bypassing its own Compliance control)",
    file: SVC,
    from: "    // carried-in jackpot whole (MR-18). Never through this generic door.\n    if (isFencedMaswali(m)) return { ok: false as const, error: MASWALI_FENCE_ERROR, code: \"INVALID\" as const };",
    to: "    // carried-in jackpot whole (MR-18). Never through this generic door.\n    if (false) return { ok: false as const, error: MASWALI_FENCE_ERROR, code: \"INVALID\" as const };",
    expect: "2.6 · emergencyVoidMarket refuses",
    suite: "memory",
  },
  {
    name: "(6) a closed week is reopened for sale",
    file: SVC,
    from: "    // S0.5 · the fence: a Millionea week's close is write-once (MR-13: the ticket commitment is stamped at close).\n    if (isFencedMaswali(m))",
    to: "    // S0.5 · the fence: a Millionea week's close is write-once (MR-13: the ticket commitment is stamped at close).\n    if (false)",
    expect: "2.7 · adminReopenMarket refuses",
    suite: "memory",
  },
  {
    name: "(7) the poll scheduler arms deadlines for a week again (only rounds are skipped)",
    file: "src/lib/server/market-scheduler.ts",
    from: "  if (storedProductLine(m.productLine) !== \"MARKET\") return null;",
    to: "  if (storedProductLine(m.productLine) === \"UPDOWN\") return null;",
    expect: "2.8 · nextDeadlineFor arms nothing",
    suite: "memory",
  },
  {
    name: "(8) a week sends Yes/No notices",
    file: SVC,
    from: "{ MARKET: () => false, UPDOWN: () => true, MASWALI: () => true });\n}",
    to: "{ MARKET: () => false, UPDOWN: () => true, MASWALI: () => false });\n}",
    expect: "2.9 · perEventNotificationsSuppressed",
    suite: "memory",
  },
  {
    name: "(9) settleMarket settles a week: a graded one at zero fee through its one-sided branch, a voided one ticket by ticket",
    file: SVC,
    // ⚠️ RE-ANCHORED (MASWALI-BUILD R1): the fence is total now — a voided week refunds through `maswali-void.ts` alone.
    from: "  if (isFencedMaswali(m)) return { ok: false, code: \"INVALID\", error: MASWALI_FENCE_ERROR };",
    to: "  if (false) return { ok: false, code: \"INVALID\", error: MASWALI_FENCE_ERROR };",
    expect: "2.11 · settleMarket refuses a graded week",
    suite: "memory",
  },
  {
    name: "(10) the generic settlement queue lists a week (its Settle button is a refused door)",
    file: SVC,
    from: "  // money is shown there, with its own \"unsettled by Tuesday\" alert (S4) — never hidden, never on the wrong button.\n  const unsettled = (await marketStore.pending(\"ALL\")).filter(\n    (m) => (m.status === \"RESOLVED\" || m.status === \"VOIDED\") && !m.settledAt && !isFencedMaswali(m),",
    to: "  // money is shown there, with its own \"unsettled by Tuesday\" alert (S4) — never hidden, never on the wrong button.\n  const unsettled = (await marketStore.pending(\"ALL\")).filter(\n    (m) => (m.status === \"RESOLVED\" || m.status === \"VOIDED\") && !m.settledAt,",
    expect: "2.12 · the generic settlement queue",
    suite: "memory",
  },
  {
    name: "(11) the poll fee mirror prices a week (a wrong figure instead of a loud failure)",
    file: "src/lib/payout.ts",
    from: "  if (m.productLine === \"MASWALI\") {\n    throw new Error(",
    to: "  if (false) {\n    throw new Error(",
    expect: "3.1 · chargedFee throws on a week",
    suite: "memory",
  },
  {
    name: "(12) the leaderboard ranks a ticket holder",
    file: DAL,
    from: "      if (markets.get(p.marketId)?.productLine === \"MASWALI\") continue;",
    to: "      if (false) continue;",
    expect: "3.2 · the leaderboard counts no Millionea ticket",
    suite: "memory",
  },
  {
    name: "(13) the leaderboard's player counts include a ticket holder",
    file: DAL,
    from: "      if (line === \"MASWALI\") continue;",
    to: "      if (false) continue;",
    expect: "3.3 · leaderboardPlayerCounts",
    suite: "memory",
  },
  {
    name: "(14) a ticket's permalink lands on the poll portfolio",
    file: "src/lib/position-permalink.ts",
    from: "    case \"MASWALI\": return `/millionea/tickets${frag}`;",
    to: "    case \"MASWALI\": return `/positions${frag}`;",
    expect: "4.2 · a ticket's permalink",
    suite: "memory",
  },
  {
    name: "(15) a held ticket is priced (an estimate of what it might win)",
    file: "src/lib/markets/estimate.ts",
    from: "  if (input.productLine === \"UPDOWN\" || input.productLine === \"MASWALI\") return null;",
    to: "  if (input.productLine === \"UPDOWN\") return null;",
    expect: "4.3 · no estimate is ever computed",
    suite: "memory",
  },
  {
    name: "(16) house bots are let onto Millionea",
    file: "src/lib/house-bot/constants.ts",
    from: "  MASWALI: \"denied\",",
    to: "  MASWALI: \"polls\",",
    expect: "4.4 · house bots: MASWALI is denied",
    suite: "memory",
  },
  {
    name: "(17) the Settle action reaches settleMarket for a week",
    file: "src/app/admin/settlement/actions.ts",
    // ⚠️ RE-ANCHORED (MASWALI-BUILD R1): the comment above the check now says a voided week refunds through its own path.
    from: "  // not even a voided week, whose refund is the week void's own bulk refund (R1, maswali-void.ts).\n  if (isFencedMaswali(await getMarket(marketId))) return { ok: false, error: MASWALI_FENCE_ERROR };",
    to: "  // not even a voided week, whose refund is the week void's own bulk refund (R1, maswali-void.ts).",
    expect: "5.4 · settleMarketAction and holdSettlementAction",
    suite: "memory",
  },
];
