/** Officer-count copy reversals consumed by red:emergency-officer-count. */
export const MUTATIONS = [
  { file: "src/lib/server/notification-service.ts",
    name: "officer English notice counts people instead of stakes",
    from: '${opts.refundedCount} open ${opts.refundedCount === 1 ? "stake was" : "stakes were"} refunded in full',
    to: '${opts.refundedCount} ${opts.refundedCount === 1 ? "player was" : "players were"} refunded in full',
    failure: "FAIL officer bell counts two refunded stakes, never two players, in EN SW ZH" },
  { file: "src/lib/server/notification-service.ts",
    name: "officer Chinese notice counts players instead of positions",
    from: '${opts.refundedCount} 笔未结投注已全额退回',
    to: '${opts.refundedCount} 位玩家已全额退款',
    failure: "FAIL officer bell counts two refunded stakes, never two players, in EN SW ZH" },
  { file: "src/lib/server/email.ts",
    name: "officer email labels position count as players",
    from: '{ label: "Stakes refunded", value: String(refundedCount) }',
    to: '{ label: "Players refunded", value: String(refundedCount) }',
    failure: "FAIL officer email labels the position count and total, not a player count" },
];
