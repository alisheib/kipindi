/**
 * e2e:maswali-fault's worker — one process per act, on the scratch Postgres the orchestrator made
 * (`scripts/maswali-fault.test.mts`). MODE (env MLN_FAULT_MODE):
 *   · seed   — the licence, the guarantee and `MLN_FAULT_TICKETS` tickets on a week `MLN_FAULT_AHEAD` weeks ahead,
 *              `MLN_FAULT_WINNERS` of them 10 of 10; closed and sealed. Prints @@SEED {weekId, at, winners}.
 *   · settle — prepares and releases week MLN_FAULT_WEEK at MLN_FAULT_AT. Prints @@RESULT {ok, already, error, ms}.
 *   · check  — reads the week, its tickets, positions, ledger group, pool and the winners' wallets. Prints @@CHECK {...}.
 * Everything through the product's own doors (`maswali-money-world.mts`).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const MODE = process.env.MLN_FAULT_MODE ?? "";
process.env.SESSION_SECRET ??= "maswali-fault-session-secret-0123456789abcdef";
const { loadMaswaliWorld } = await import("./maswali-money-world.mts");
const W = await loadMaswaliWorld();
const out = (tag: string, v: unknown) => console.log(`@@${tag} ${JSON.stringify(v)}`);

if (MODE === "seed") {
  const n = Number(process.env.MLN_FAULT_TICKETS ?? "0"), k = Number(process.env.MLN_FAULT_WINNERS ?? "0");
  if (process.env.MLN_FAULT_SETUP === "1") await W.setup({ guarantee: 10_000_000 });
  const { week, start } = await W.openWeek({ weeksAhead: Number(process.env.MLN_FAULT_AHEAD ?? "2") });
  const players: string[] = [];
  for (let i = 0; i < Math.ceil((n - k) / 10) + k; i++) players.push(await W.user({ balance: 50_000 }));
  const winners = players.slice(0, k);
  for (const u of winners) { const r = await W.buy(u, week.id, [W.WIN]); if (!r.ok) throw new Error(r.error); }
  await W.sell(week.id, n - k, W.LOSE, players.slice(k));
  const at = await W.closeAndSeal(week, start);
  out("SEED", { weekId: week.id, marketId: week.marketId, at: at.toISOString(), winners });
} else if (MODE === "settle") {
  const t0 = Date.now();
  const r = await W.release(process.env.MLN_FAULT_WEEK!, new Date(process.env.MLN_FAULT_AT!));
  out("RESULT", { ok: r.ok, already: r.ok ? r.already === true : false, error: r.ok ? null : r.error, ms: Date.now() - t0, share: r.ok && !r.already ? r.preview.arithmetic.share : null });
} else if (MODE === "check") {
  const weekId = process.env.MLN_FAULT_WEEK!;
  const week = await W.dal.weekStore.get(weekId);
  const tickets = await W.dal.ticketStore.listForWeek(weekId);
  const positions = (await W.w.svc.listPositionsForMarket(week.marketId)) as any[];
  const groupLines = await W.prisma()!.ledgerEntry.count({ where: { groupId: `maswali_settle_${weekId}` } });
  const winners = JSON.parse(process.env.MLN_FAULT_WINNERS_JSON ?? "[]") as string[];
  const balances = await Promise.all(winners.map(async (u) => (await W.bal(u)).balance));
  const payouts = await W.prisma()!.transaction.count({ where: { type: "BET_PAYOUT", positionId: { in: positions.map((p) => p.id) } } });
  const { trialBalance } = await import("../../src/lib/server/ledger.ts");
  const tb = await trialBalance();
  const { checkMaswaliInvariants } = await import("../../src/lib/server/maswali-invariants.ts");
  const inv = await checkMaswaliInvariants();
  out("CHECK", {
    state: week.state, settledAt: week.settledAt, rolloverIn: week.rolloverIn,
    live: tickets.filter((t: any) => t.status === "LIVE").length, settled: tickets.filter((t: any) => t.status === "SETTLED").length,
    open: positions.filter((p) => p.status === "OPEN").length, win: positions.filter((p) => p.status === "WIN").length, loss: positions.filter((p) => p.status === "LOSS").length,
    groupLines, payouts, balances, pool: await W.balanceOf(W.acct.pool(week.marketId)),
    trialBalance: { ok: tb.ok, drifting: tb.driftingWallets, checked: tb.checkedWallets, imbalanced: tb.imbalancedGroups.length },
    invariants: inv,
  });
} else {
  console.error(`maswali-fault-child: unknown MLN_FAULT_MODE "${MODE}"`);
  process.exit(2);
}
process.exit(0);
