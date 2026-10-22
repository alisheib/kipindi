/** Two real money-transaction snapshot reversals, shared by the red runner and anchor audit. */
// 2026-10-21 · U43 CI repair: the queued points return their promise (awaited after commit); the plants still move each
// point out of its queue so it is written before the money commits.
export const MUTATIONS = [
  {
    name: "settlement records a chart point before its money commits",
    file: "src/lib/server/market-service.ts",
    from: "queueSettlementEffect(() => recordSnapshot(m.id, m.yesPool, m.noPool));",
    to: "void recordSnapshot(m.id, m.yesPool, m.noPool);",
    expected: "FAIL S.rollback · failed transaction leaves no chart point",
  },
  {
    name: "emergency void records a chart point before its refunds commit",
    file: "src/lib/server/market-service.ts",
    from: "afterCommit(lockTx, () => { committedNotices.push(() => recordSnapshot(m.id, 0, 0)); });",
    to: "void recordSnapshot(m.id, 0, 0);",
    expected: "FAIL E.rollback · failed transaction leaves no chart point",
  },
];
