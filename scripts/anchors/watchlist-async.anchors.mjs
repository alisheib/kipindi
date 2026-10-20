/** Post-commit watchlist notification plants for red:watchlist-async. */
export const MUTATIONS = [
  {
    name: "settlement drops the queued watcher notification",
    file: "src/lib/server/market-service.ts",
    from: 'void import("./watchlist-service")',
    to: 'void Promise.resolve()',
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
