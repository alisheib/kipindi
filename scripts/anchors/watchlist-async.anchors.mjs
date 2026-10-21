/** Post-commit watchlist notification plants for red:watchlist-async. */
// U43, 2026-10-21: settlement awaits each post-commit effect, so the first plant
// is the old fire-and-forget loop itself; the second drops the queued alert.
export const MUTATIONS = [
  {
    name: "settlement stops awaiting its post-commit effects",
    file: "src/lib/server/market-service.ts",
    from: "if (result.ok) await drainCommitted(committedSettlementEffects, currentLockTx());",
    to: "if (result.ok) void drainCommitted(committedSettlementEffects, currentLockTx());",
    expect: "watcher who did NOT bet got a settled alert",
  },
  {
    name: "settlement drops the queued watcher notification",
    file: "src/lib/server/market-service.ts",
    from: 'queueSettlementEffect(() => import("./watchlist-service")',
    to: 'void (() => import("./watchlist-service")',
    expect: "watcher who did NOT bet got a settled alert",
  },
  {
    name: "settlement forgets which watchers already bet",
    file: "src/lib/server/market-service.ts",
    from: "new Set(allMarketPositions.map((p) => p.userId))",
    to: "new Set<string>()",
    expect: "watcher who DID bet got NO duplicate watchlist alert",
  },
];
