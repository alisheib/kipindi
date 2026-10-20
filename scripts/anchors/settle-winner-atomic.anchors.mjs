/** Physical winner reversals consumed by settle-winner-atomic-red.mjs. */
const file = "src/lib/server/market-service.ts";
export const MUTATIONS = [
  { store: "memory", file, name: "memory compensation removed", from: "const restoreMemory = !lockTx", to: "const restoreMemory = false && !lockTx", expect: "FAIL second-winner fault: every real and bonus wallet balance rolled back" },
  { store: "memory", file, name: "winner claim runs before commit", from: "afterCommit(lockTx, () => { committedSettlementEffects.push(fn); });", to: "fn();", expect: "FAIL second-winner fault: no settlement history or player email" },
  { store: "memory", file, name: "settled replay gate removed", from: 'if (m.settledAt) return { ok: false, error: "Market is already settled.", code: "INVALID" };', to: 'if (false && m.settledAt) return { ok: false, error: "Market is already settled.", code: "INVALID" };', expect: "FAIL second-winner fault: replay is refused after commit" },
  { store: "memory", file, name: "winner wallet credit exceeds booked payout", from: "db.wallet.adjust(w.id, { balance: payout }, undefined, tx)", to: "db.wallet.adjust(w.id, { balance: payout + 1 }, undefined, tx)", expect: "FAIL second-winner fault: payout report and balances agree with rows" },
  { store: "postgres", file, name: "first winner position leaves the settlement transaction", from: 'p.status = "WIN"; p.finalPayout = payout; p.settledAt = settledAt;\n          await positionStore.set(p, tx);', to: 'p.status = "WIN"; p.finalPayout = payout; p.settledAt = settledAt;\n          await positionStore.set(p);', expect: "FAIL second-winner fault: both wins and the loss remain OPEN" },
];
