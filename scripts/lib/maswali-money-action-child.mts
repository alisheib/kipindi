/** Real FormData -> /millionea's purchase action core -> money door, on both stores. */
/* eslint-disable @typescript-eslint/no-explicit-any */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-action-e2e-session-secret-0123456789";

const { readFileSync } = await import("node:fs");
const { loadMaswaliWorld } = await import("./maswali-money-world.mts");
const W: any = await loadMaswaliWorld();
const ACT: any = await import("../../src/lib/server/maswali-player-acts.ts");
const RG: any = await import("../../src/lib/server/responsible-gambling.ts");
const AUDIT: any = await import("../../src/lib/server/audit.ts");
const FAILURE: any = await import("../../src/lib/failure-reasons.ts");

process.exitCode = 1;
let pass = 0, fail = 0;
function ok(label: string, condition: boolean, detail = "") {
  condition ? pass++ : fail++;
  console.log(`${condition ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
}
const json = (v: unknown) => JSON.stringify(v);
const reason = (r: any) => r?.ok ? "ok" : String(r?.reason ?? r?.error ?? "unknown");
const ACTIVE = { deps: { stateNow: async () => "ACTIVE" } };
const WITHDRAWN = { deps: { stateNow: async () => "WITHDRAWN" } };
const form = (userId: string, weekId: string, key: string, slips: unknown, patch: Record<string, string> = {}) => {
  const data = new FormData();
  for (const [name, value] of Object.entries({ expectedOwnerId: userId, weekId, idempotencyKey: key, slips: json(slips), ...patch })) data.set(name, value);
  return data;
};
const buy = (userId: string, weekId: string, key: string, slips: unknown, opts: any = ACTIVE) =>
  ACT.buyMillioneaFromForm(userId, form(userId, weekId, key, slips), opts);
const tickets = (userId: string, weekId: string) => W.dal.ticketStore.listForUser(userId, { cycleId: weekId });
const txns = (userId: string) => W.w.db.txn.findByUser(userId, 100);

// The browser posts to this server action. Pin its signed-session handoff to the driven core so an
// accidental second purchase path, or a dropped play clock, cannot make the drive irrelevant.
const wrapper = readFileSync("src/app/millionea/actions.ts", "utf8");
ok("the Next purchase action checks its signed session", /export async function buyMillioneaTicketsAction\(formData: FormData\)[\s\S]*?const session = await currentSession\(\);[\s\S]*?if \(!session\) redirect\(/.test(wrapper));
ok("the Next purchase action delegates the posted FormData and play clock to the driven core", /const r = await buyMillioneaFromForm\(session\.userId, formData, \{ playStartedAt: session\.playStartedAt \}\);/.test(wrapper));
ok("the Next purchase action refreshes only after success", /if \(r\.ok\) refresh\(\);\s*return r;/.test(wrapper));

await W.setup({ guarantee: 20_000_000 });
const { week } = await W.openWeek({ weeksAhead: 2 });
const price = W.svc.frozenRules(week).ticketPriceTzs as number;
const buyer = await W.user({ balance: 50_000 });
const realForm = form(buyer, week.id, "e2e-action-first-0001", [W.WIN, W.LOSE]);
ok("the submitted request is real FormData with two fifteen-answer slips", realForm instanceof FormData && JSON.parse(String(realForm.get("slips"))).length === 2);
const beforePool = await W.balanceOf(W.acct.pool(week.marketId));
const first = await ACT.buyMillioneaFromForm(buyer, realForm, ACTIVE);
const held = await tickets(buyer, week.id);
const afterBalance = (await W.bal(buyer)).balance;
const afterPool = await W.balanceOf(W.acct.pool(week.marketId));
ok("the action accepts an eligible buyer with real balance", first.ok && first.data?.replayed === false, reason(first));
ok("the action returns two distinct serials for two complete slips", first.ok && first.data.tickets.length === 2 && new Set(first.data.tickets.map((t: any) => t.serial)).size === 2);
ok("the receipt reports the committed real balance", first.ok && first.data.balance === afterBalance && afterBalance === 50_000 - 2 * price);
ok("the real wallet debit equals the pool credit", beforePool + 2 * price === afterPool && 50_000 - afterBalance === afterPool - beforePool);
ok("both tickets exist live and belong to the buyer", held.length === 2 && held.every((t: any) => t.userId === buyer && t.status === "LIVE"));
ok("both positions were paid with real money, no bonus", held.every((t: any) => first.data.tickets.some((r: any) => r.positionId === t.positionId))
  && (await W.w.svc.listPositionsForMarket(week.marketId)).filter((p: any) => p.userId === buyer).every((p: any) => p.stake === price && (p.bonusStakeTzs ?? 0) === 0));
ok("the buyer has exactly two stake transactions", (await txns(buyer)).filter((t: any) => t.type === "BET_PLACED" && t.amount === -price).length === 2);
ok("the receipt offers the real free-cancel deadline", first.ok && Date.parse(first.data.cancelUntil) > Date.now());

await AUDIT.auditFlush();
const auditNow = await AUDIT.getAuditForTargetDurable("MaswaliCycle", week.id, { limit: 100 });
const purchases = () => auditNow.entries.filter((e: any) => e.action === "maswali.tickets.bought" && e.actorId === buyer);
ok("one durable purchase audit records the count, value and serials", purchases().length === 1
  && purchases()[0].payload?.count === 2 && purchases()[0].payload?.total === 2 * price
  && json(purchases()[0].payload?.serials) === json(first.data.tickets.map((t: any) => t.serial)));

const replay = await buy(buyer, week.id, "e2e-action-first-0001", [W.WIN, W.LOSE]);
ok("a retry with the same request id returns the same serials, marked replayed", replay.ok && replay.data.replayed === true
  && json(replay.data.tickets) === json(first.data.tickets));
ok("the replay makes no second debit, ticket or pool credit", (await W.bal(buyer)).balance === afterBalance
  && (await tickets(buyer, week.id)).length === 2 && (await W.balanceOf(W.acct.pool(week.marketId))) === afterPool);
const changed = await buy(buyer, week.id, "e2e-action-first-0001", [W.LOSE, W.LOSE]);
ok("a reused id with different picks is refused", !changed.ok && changed.reason === "idempotency_key_conflict", reason(changed));
await AUDIT.auditFlush();
const auditAfterReplay = await AUDIT.getAuditForTargetDurable("MaswaliCycle", week.id, { limit: 100 });
ok("retry and conflict leave one purchase audit", auditAfterReplay.entries.filter((e: any) => e.action === "maswali.tickets.bought" && e.actorId === buyer).length === 1);

const racing = await W.user({ balance: 50_000 });
const raceKey = "e2e-action-race-0001";
const race = await Promise.all(Array.from({ length: 4 }, () => buy(racing, week.id, raceKey, [W.WIN])));
ok("concurrent same-id confirms all return one serial", race.every((r: any) => r.ok) && new Set(race.map((r: any) => r.data?.tickets[0]?.serial)).size === 1, json(race.map(reason)));
ok("concurrent confirms charge once and leave one ticket", (await W.bal(racing)).balance === 50_000 - price && (await tickets(racing, week.id)).length === 1);
ok("concurrent confirms include one first purchase and replay replies", race.filter((r: any) => r.ok && !r.data.replayed).length === 1 && race.filter((r: any) => r.ok && r.data.replayed).length === 3);
await AUDIT.auditFlush();
const raceAudits = await AUDIT.getAuditForTargetDurable("MaswaliCycle", week.id, { limit: 100 });
ok("concurrent confirms are audited exactly once", raceAudits.entries.filter((e: any) => e.action === "maswali.tickets.bought" && e.actorId === racing).length === 1);
// The bonus-only refusal fixture below deliberately seeds a wallet bonus without a real BonusGrant.
// Take the whole-book trial balance here, while every fixture is backed by a ledger entry.
if (W.onPostgres) {
  const trial = await W.ledger.trialBalance();
  ok("PostgreSQL trial balance remains globally balanced with no drift", trial.ok && trial.globalBalanced && trial.driftingWallets === 0, json(trial));
} else {
  ok("memory ledger pool conserves all three bought stakes", (await W.balanceOf(W.acct.pool(week.marketId))) === beforePool + 3 * price);
}

const refused = await W.user({ balance: 50_000 });
const refusedBefore = (await W.bal(refused)).balance;
const changedSession = await ACT.buyMillioneaFromForm(refused, form(buyer, week.id, "e2e-action-changed-0001", [W.WIN]), ACTIVE);
ok("a form shown for a different signed-in account is refused", !changedSession.ok && changedSession.reason === "session_changed", reason(changedSession));
const killed = await buy(refused, week.id, "e2e-action-killed-0001", [W.WIN], WITHDRAWN);
ok("the withdrawn rollout refuses the purchase", !killed.ok && killed.reason === "millionea_not_available", reason(killed));
const invalid = await buy(refused, week.id, "short", [W.WIN]);
ok("an invalid request id is refused before money", !invalid.ok && invalid.reason === "unknown_failure", reason(invalid));
const incomplete = await buy(refused, week.id, "e2e-action-bad-slip-0001", [W.WIN.slice(0, 14)]);
ok("an incomplete slip is refused before money", !incomplete.ok && incomplete.reason === "millionea_picks_incomplete", reason(incomplete));
ok("form and rollout refusals write no tickets and move no money", (await W.bal(refused)).balance === refusedBefore && (await tickets(refused, week.id)).length === 0);

const bonus = await W.user({ balance: 0, bonusBalance: 50_000 });
const bonusResult = await buy(bonus, week.id, "e2e-action-bonus-0001", [W.WIN]);
ok("bonus funds cannot buy a ticket", !bonusResult.ok && bonusResult.reason === "millionea_bonus_refused" && (await tickets(bonus, week.id)).length === 0, reason(bonusResult));
const poor = await W.user({ balance: price - 1 });
const poorResult = await buy(poor, week.id, "e2e-action-poor-0001", [W.WIN]);
ok("an underfunded real wallet is refused unchanged", !poorResult.ok && poorResult.reason === "balance_insufficient"
  && (await W.bal(poor)).balance === price - 1 && (await tickets(poor, week.id)).length === 0, reason(poorResult));
const staff = await W.user({ balance: 50_000, role: "ADMIN" });
const staffResult = await buy(staff, week.id, "e2e-action-staff-0001", [W.WIN]);
ok("a staff account is barred from real-money play", !staffResult.ok && staffResult.reason === "millionea_staff_barred" && (await W.bal(staff)).balance === 50_000, reason(staffResult));
const desk = await W.bot({ balance: 50_000 });
const deskResult = await buy(desk.userId, week.id, "e2e-action-desk-0001", [W.WIN]);
ok("a house desk account is barred from play", !deskResult.ok && deskResult.reason === "millionea_account_ineligible" && (await W.bal(desk.userId)).balance === 50_000, reason(deskResult));

const excluded = await W.user({ balance: 50_000 });
await RG.selfExclude(excluded, "24h");
const excludedResult = await buy(excluded, week.id, "e2e-action-excluded-0001", [W.WIN]);
ok("self-exclusion reaches the shared bet gate", !excludedResult.ok && excludedResult.reason === "self_excluded" && (await W.bal(excluded)).balance === 50_000, reason(excludedResult));
const cooling = await W.user({ balance: 50_000 });
await RG.coolOff(cooling, "1h");
const coolingResult = await buy(cooling, week.id, "e2e-action-cooling-0001", [W.WIN]);
ok("a cooling-off period reaches the shared bet gate", !coolingResult.ok && coolingResult.reason === "cooling_off" && (await W.bal(cooling)).balance === 50_000, reason(coolingResult));
const suspended = await W.user({ balance: 50_000 });
await W.setUserFields(suspended, { status: "SUSPENDED" });
const suspendedResult = await buy(suspended, week.id, "e2e-action-suspended-0001", [W.WIN]);
ok("a suspended account is refused unchanged", !suspendedResult.ok && suspendedResult.reason === "account_blocked" && (await W.bal(suspended)).balance === 50_000, reason(suspendedResult));
const session = await W.user({ balance: 50_000 });
await RG.setLimits(session, { sessionTimeLimitMin: 15 });
const sessionResult = await buy(session, week.id, "e2e-action-session-0001", [W.WIN],
  { ...ACTIVE, playStartedAt: Date.now() - 16 * 60_000 });
ok("the signed play clock enforces the session limit on the action", !sessionResult.ok && sessionResult.reason === "session_limit_reached"
  && (await W.bal(session)).balance === 50_000, reason(sessionResult));

ok("every refusal reason has registered translated player copy", [changedSession, killed, invalid, incomplete, bonusResult,
  poorResult, staffResult, deskResult, excludedResult, coolingResult, suspendedResult, sessionResult]
  .every((r: any) => !r.ok && typeof r.reason === "string" && !!FAILURE.REASONS[r.reason]));
ok("every refused account remains nonnegative", (await Promise.all([refused, bonus, poor, staff, desk.userId, excluded, cooling, suspended, session]
  .map((id) => W.bal(id)))).every((w: any) => w.balance >= 0));

console.log(`\n@@SUMMARY ${json({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
