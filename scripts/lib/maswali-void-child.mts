/**
 * test:maswali-void — THE WEEK VOID, ON BOTH STORES (MASWALI-BUILD R1 + R10d; MASWALI-PLAN MR-18, §5b "Week void").
 *
 *   npx tsx scripts/maswali-void.test.mts     (npm run test:maswali-void)
 *
 * R1, the reviewer's finding: a week void that failed after its stamp could never refund — the stamp autocommitted, the
 * refund ran `settleMarket`'s VOID arm at about six round trips per ticket inside one 30 s transaction, and nothing
 * retried a VOIDED week. Now the void completes exactly once, at any size, and is retried until it does:
 *   §1 ⭐ 2,000 tickets across 300 players in one transaction, timed: every balance, refund row and ledger line to the
 *      shilling, POOL back to 0, R untouched, each refunded player's balance pushed to their page (R10d), no poll notice
 *   §2 interrupted after the stamp (a declared fault refuses the refunds), then resumed by `voidWeek` — the alert raised
 *      (under 61 newer weeks too) and cleared, two resumes at once refunding once, a cancelled ticket left alone
 *   §3 …resumed by the tick       §4 …resumed by the heal (its own CLI on Postgres; its reconcile in memory)
 *   §5 the old code's stuck state — its market stamped VOID, never settled — fenced off `settleMarket`, then resumed
 *   §6 a second run changes nothing          §6b Postgres: a refund failing at its last statement rolls back whole
 *   §7 CONTROL: a week that grades is never voided, refunded or alerted, and still settles — and while it waits for its
 *      release, its closed window never shortens the timer's next wake below the normal cadence (a past instant is no
 *      wake time)
 *   §7b the bulk credit (`db.wallet.creditMany`) is all or nothing, and the refund takes no `wallet:` lock
 *   §8 the invariants hold over all of it
 * Each case asserts what the old code got wrong (no REFUNDED ticket, the memory POOL left at the sales, no balance push,
 * no resume, no alert) beside what both must keep (the refunds to the shilling, R untouched).
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-void-session-secret-0123456789abcdef";
// The week timer stays off: every tick here is run on purpose, and a timer firing mid-case would resume a week first.
process.env.MASWALI_SCHEDULER = "false";

const { loadMaswaliWorld, DRAFTER } = await import("./maswali-money-world.mts");
const W = await loadMaswaliWorld();
const { dal, money, acct } = W;
const market = W.w.svc;
const voids = await import("../../src/lib/server/maswali-void.ts");
const scheduler = await import("../../src/lib/server/maswali-scheduler.ts");
const consoleRead = await import("../../src/lib/server/maswali-console.ts");
const { checkMaswaliInvariants } = await import("../../src/lib/server/maswali-invariants.ts");
const { eventBus } = await import("../../src/lib/server/event-bus.ts");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const LF = String.fromCharCode(10);
const errOf = (r: { ok: boolean; error?: string }) => (r.ok ? "" : String(r.error));
const bal = async (u: string) => (await W.bal(u)).balance as number;
const pool = (marketId: string) => W.balanceOf(acct.pool(marketId));
const jackpot = () => W.balanceOf(acct.maswaliJackpot);
const guarantee = () => W.balanceOf(acct.maswaliGuarantee);
const noticesOf = async (u: string) => (((await W.db.notification.findByUser(u, 500)) as any[] | null) ?? []).length;
const ALL_VOID = Array.from({ length: 15 }, () => ({ void: "not_played" }));
/** The R1 alert for one week, or undefined. */
const voidAlert = (alerts: any[], weekId: string) =>
  alerts.find((x) => x.weekId === weekId && x.level === "critical" && String(x.text).includes("voided whole, and its refunds have not landed"));
const owedIds = async () => (await voids.unrefundedVoids()).map((w: any) => w.id as string);
const groupLines = async (weekId: string) => (W.onPostgres
  ? Number(((await W.prisma()!.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "LedgerEntry" WHERE "groupId" = $1`, `maswali_void_${weekId}`)) as any[])[0]?.n)
  : 0);

const FUND = 20_000_000;
await W.setup({ guarantee: FUND });
let ahead = 2;
const big: string[] = [];
for (let i = 0; i < 300; i++) big.push(await W.user({ balance: 200_000 }));
const small: string[] = [];
for (let i = 0; i < 12; i++) small.push(await W.user({ balance: 200_000 }));

/**
 * A week sold to `buyers` (each `[player, tickets]`) through the one bet path, closed at its close, and every question
 * sealed VOID: its void is certain, and its window has closed at the returned instant. `beforeClose` runs while it sells.
 */
async function doomedWeek(buyers: Array<[string, number]>, beforeClose?: (bought: Map<string, string[]>) => Promise<void>) {
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  const bought = new Map<string, string[]>();
  for (const [u, n] of buyers) {
    const r = await W.buy(u, week.id, Array.from({ length: n }, () => W.LOSE));
    if (!r.ok) throw new Error(`doomedWeek: a purchase was refused: ${r.error} (${r.reason})`);
    bought.set(u, [...(bought.get(u) ?? []), ...r.data.maswali.tickets.map((t: any) => t.positionId as string)]);
  }
  if (beforeClose) await beforeClose(bought);
  const at = await W.closeAndSeal(week, start, ALL_VOID);
  return { week: await dal.weekStore.get(week.id), at, bought };
}

/** Everything a refund moves for one week and its players, read through the stores — to compare before and after. */
async function stateOf(week: any, users: string[]) {
  const tickets = await dal.ticketStore.listForWeek(week.id);
  const positions = (await market.listPositionsForMarket(week.marketId)) as any[];
  const ids = new Set(positions.map((p) => p.id));
  let refunds = 0;
  for (const u of users) refunds += ((await W.db.txn.findByUser(u, 2_000)) as any[]).filter((t) => t.type === "BET_REFUND" && ids.has(t.positionId)).length;
  const m = await W.w.mdal.marketStore.get(week.marketId);
  return {
    weekState: (await dal.weekStore.get(week.id)).state as string,
    live: tickets.filter((t: any) => t.status === "LIVE").length,
    refundedTickets: tickets.filter((t: any) => t.status === "REFUNDED").length,
    open: positions.filter((p) => p.status === "OPEN").length,
    voidPositions: positions.filter((p) => p.status === "VOID").length,
    refunds,
    pool: await pool(week.marketId),
    settledAt: (m?.settledAt ?? null) as string | null,
    balances: await Promise.all(users.map(bal)),
  };
}

/**
 * ⚠️ A FAULT THE PRODUCT CANNOT PRODUCE, DECLARED (the settle suite's §6b): one shilling booked into a week's POOL from
 * outside, so the ledger disagrees with the tickets and the refund refuses — AFTER the stamp. Then booked back out.
 */
const fault = (marketId: string, sign: 1 | -1) => money.postMaswaliLines(`test_void_fault_${sign > 0 ? "in" : "out"}_${marketId}`, [
  { account: acct.pool(marketId), entryType: "ADJUSTMENT", amount: sign, marketId, memo: "test fault" },
  { account: acct.external("TEST_FAULT"), entryType: "ADJUSTMENT", amount: -sign, marketId, memo: "test fault" },
], null);

// ── The CONTROL week (§7 reads it), opened first so it is the oldest of the line: all fifteen seal YES, so it grades.
const ctlBuyers = small.slice(9);
const { week: ctlOpen, start: ctlStart } = await W.openWeek({ weeksAhead: ahead++ });
for (const u of ctlBuyers) {
  const r = await W.buy(u, ctlOpen.id, [W.LOSE, W.LOSE]);
  if (!r.ok) throw new Error(`control: a purchase was refused: ${r.error}`);
}
const ctlAt = await W.closeAndSeal(ctlOpen, ctlStart);
const ctlWeek = await dal.weekStore.get(ctlOpen.id);
const ctlSold = await Promise.all(ctlBuyers.map(bal));

// ── §1 · R1 · 2,000 tickets across 300 players, in one transaction ──────────
console.log(`${LF}§1 · R1 · a void of 2,000 tickets across 300 players, in one transaction`);
const plan: Array<[string, number]> = big.map((u, i) => [u, i < 200 ? 7 : 6]);
const doomed = await doomedWeek(plan);
const B = doomed.week;
{
  const sold = await Promise.all(big.map(bal));
  ok("1.0 · the week sold 2,000 tickets to 300 players, and its void is certain with its window closed",
    B.ticketCount === 2_000 && (await pool(B.marketId)) === 2_000_000 && plan.every(([, n], i) => 200_000 - sold[i] === n * 1_000),
    `count ${B.ticketCount} · pool ${await pool(B.marketId)}`);
  const R0 = await jackpot(), G0 = await guarantee();
  const notesBefore = await Promise.all(big.slice(0, 5).map(noticesOf));
  const pushed = new Map<string, number[]>();
  const onBalance = (d: { userId: string; balance: number }) => { pushed.set(d.userId, [...(pushed.get(d.userId) ?? []), d.balance]); };
  eventBus.on("wallet:balance", onBalance);
  const t0 = Date.now();
  const v = await W.svc.voidWeek({ weekId: B.id, now: doomed.at });
  const ms = Date.now() - t0;
  eventBus.off("wallet:balance", onBalance);
  console.log(`   ⏱ [${STORE}] the void of 2,000 tickets across 300 players took ${ms} ms, end to end`);
  const m = await W.w.mdal.marketStore.get(B.marketId);
  ok("1.1 · ⭐ one call voids it and refunds it: the week VOIDED, its market VOIDED with outcome VOID, and settled",
    v.ok && v.week.state === "VOIDED" && v.already === false && v.refunded === 2_000 && m?.status === "VOIDED" && m?.resolvedOutcome === "VOID" && !!m?.settledAt,
    errOf(v) || J({ status: m?.status, outcome: m?.resolvedOutcome, settledAt: m?.settledAt }));
  if (W.onPostgres) ok(`1.2 · ⭐ on Postgres the whole void takes well inside the lock's 30 s transaction budget (${ms} ms)`, v.ok && ms < 15_000, `${ms} ms`);
  const after = await Promise.all(big.map(bal));
  ok("1.3 · ⭐ every player is credited exactly the sum of their stakes — back to the balance they had before buying",
    plan.every(([, n], i) => after[i] - sold[i] === n * 1_000 && after[i] === 200_000),
    J(plan.map(([u, n], i) => ({ u, got: after[i] - sold[i], want: n * 1_000 })).filter((x) => x.got !== x.want).slice(0, 3)));
  const positions = (await market.listPositionsForMarket(B.marketId)) as any[];
  ok("1.4 · every position VOID, paid back its own stake, and stamped",
    positions.length === 2_000 && positions.every((p) => p.status === "VOID" && p.stake === 1_000 && p.finalPayout === p.stake && !!p.settledAt),
    `${positions.filter((p) => p.status !== "VOID").length} not VOID`);
  const tickets = await dal.ticketStore.listForWeek(B.id);
  ok("1.5 · ⭐ every ticket REFUNDED, none left LIVE", tickets.length === 2_000 && tickets.every((t: any) => t.status === "REFUNDED"),
    `${tickets.filter((t: any) => t.status !== "REFUNDED").length} not REFUNDED`);
  const posById = new Map(positions.map((p) => [p.id, p]));
  const byUser = new Map<string, any[]>();
  for (const u of big) byUser.set(u, ((await W.db.txn.findByUser(u, 500)) as any[]).filter((t) => t.type === "BET_REFUND" && posById.has(t.positionId)));
  const refunds = [...byUser.values()].flat();
  const words = `${voids.MASWALI_VOID_REFUND} · "${String(m?.titleEn ?? "").slice(0, 60)}"`;
  ok("1.6 · one BET_REFUND per ticket: its stake in full, fee 0, CONFIRMED, INTERNAL, in the platform's words for a voided week",
    refunds.length === 2_000 && new Set(refunds.map((t) => t.positionId)).size === 2_000
      && refunds.every((t) => t.amount === 1_000 && t.fee === 0 && t.taxWithheld === 0 && t.status === "CONFIRMED" && t.provider === "INTERNAL" && t.description === words),
    J(refunds[0]));
  ok("1.7 · each player's refund rows run up, ticket by ticket, to their credited balance (balanceAfter)",
    plan.every(([u, n], i) => J((byUser.get(u) ?? []).map((t) => t.balanceAfter).sort((x, y) => x - y)) === J(Array.from({ length: n }, (_, k) => after[i] - (n - 1 - k) * 1_000))),
    J((byUser.get(big[0]) ?? []).map((t) => t.balanceAfter)));
  ok("1.8 · Ruling 232 · every refund row is positioned on its own ticket's position, for its holder, and carries that position's marker",
    refunds.every((t) => posById.get(t.positionId)?.userId === t.userId && (t.houseBotId ?? null) === (posById.get(t.positionId)?.houseBotId ?? null)));
  ok("1.9 · ⭐ the week's POOL is back to exactly 0, on both stores (the memory mirror books the void now)", (await pool(B.marketId)) === 0, `${await pool(B.marketId)}`);
  if (W.onPostgres) {
    const px = W.prisma()!;
    const [g] = (await px.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n, COUNT(DISTINCT "txnId")::int AS txns, COALESCE(SUM("amount"), 0)::text AS sum,
              COALESCE(SUM("amount") FILTER (WHERE "account" = $2), 0)::text AS pool
         FROM "LedgerEntry" WHERE "groupId" = $1`, `maswali_void_${B.id}`, acct.pool(B.marketId))) as any[];
    const players = (await px.$queryRawUnsafe(
      `SELECT "account", SUM("amount")::text AS s FROM "LedgerEntry" WHERE "groupId" = $1 AND "account" <> $2 GROUP BY "account"`,
      `maswali_void_${B.id}`, acct.pool(B.marketId))) as any[];
    const want = new Map(plan.map(([u, n]) => [acct.player(u), n * 1_000]));
    ok("1.10 · ⭐ on Postgres ONE ledger group: two lines per ticket, one pair per refund row, summing to 0 — POOL −2,000,000, each PLAYER + their stakes",
      g?.n === 4_000 && g?.txns === 2_000 && Number(g?.sum) === 0 && Number(g?.pool) === -2_000_000 && players.length === 300
        && players.every((r) => want.get(r.account) === Number(r.s)), J({ g, players: players.length }));
  }
  ok("1.11 · R is untouched (MR-18): the jackpot and the guarantee did not move", (await jackpot()) === R0 && (await guarantee()) === G0,
    `jackpot ${R0} → ${await jackpot()} · guarantee ${G0} → ${await guarantee()}`);
  ok("1.12 · ⭐ R10d · every refunded player's open page heard their new balance: a push each, carrying the committed balance",
    big.filter((u) => pushed.has(u)).length === 300 && big.every((u, i) => pushed.get(u)?.at(-1) === after[i]), `${pushed.size} players pushed`);
  await new Promise((r) => setTimeout(r, 400)); // a notice would be written just after its money commits
  const notesAfter = await Promise.all(big.slice(0, 5).map(noticesOf));
  ok("1.13 · ⛔ no poll notice for a ticket (S6 writes Millionea's own, MB-68)", J(notesAfter) === J(notesBefore), `${J(notesBefore)} → ${J(notesAfter)}`);
  const wk = await dal.weekStore.get(B.id);
  ok("1.14 · the week stays VOIDED and keeps its count (a refund is not a cancel)", wk.state === "VOIDED" && wk.ticketCount === 2_000, `${wk.state} · ${wk.ticketCount}`);
}

// ── §2 · R1 · interrupted after the stamp, then resumed by voidWeek ─────────
console.log(`${LF}§2 · R1 · interrupted after the stamp, then resumed by voidWeek`);
{
  const [a, b, c] = small;
  const users = [a, b, c];
  // `c` cancels one of three tickets inside its free window: the void must leave that ticket alone.
  const D = await doomedWeek([[a, 4], [b, 2], [c, 3]], async (bought) => {
    const r = await market.cashOutPosition(c, bought.get(c)![0]);
    if (!r.ok) throw new Error(`§2: the free cancel was refused: ${r.error}`);
  });
  const sold = await Promise.all(users.map(bal));
  await fault(D.week.marketId, 1);
  const stuck = await W.svc.voidWeek({ weekId: D.week.id, now: D.at });
  const s1 = await stateOf(D.week, users);
  ok("2.1 · ⭐ the fault refuses the refunds AFTER the stamp: the week is VOIDED, its market unsettled, and voidWeek says its refunds have not landed",
    !stuck.ok && errOf(stuck).includes("VOIDED, and its refunds have not landed") && s1.weekState === "VOIDED" && s1.settledAt === null, errOf(stuck));
  ok("2.2 · …and nothing moved: tickets LIVE, positions OPEN, balances as bought, no refund row, the pool at the sales and the fault",
    s1.live === 8 && s1.open === 8 && s1.refunds === 0 && J(s1.balances) === J(sold) && s1.pool === 8_001, J(s1));
  ok("2.3 · ⭐ the console raises it as critical: voided whole, its refunds not landed", !!voidAlert(await consoleRead.consoleAlerts(D.at), D.week.id),
    J((await consoleRead.consoleAlerts(D.at)).map((x: any) => x.text)));
  // The alerts read every week they can concern by STATE: sixty-one newer drafts cannot push the owed week off them.
  for (let k = 0; k < 61; k++) {
    const start = W.weekStartAhead(200 + k);
    const d = await W.svc.createWeek({ weekStartMs: start, questions: W.questions(start), officerId: DRAFTER, now: new Date(start - 3 * 86_400_000) });
    if (!d.ok) throw new Error(`§2: a draft was refused: ${d.error}`);
  }
  ok("2.3b · …and it still speaks under 61 newer weeks: the alerts read by state, never the newest N", !!voidAlert(await consoleRead.consoleAlerts(D.at), D.week.id));
  ok("2.4 · …and it is owed: unrefundedVoids lists it (what the tick and the heal retry)", (await owedIds()).includes(D.week.id));
  const generic = await market.settleMarket(D.week.marketId, { actorId: "system_maswali" });
  ok("2.5 · ⛔ the generic settlement moves nothing for it (its market is not even adjudicated: the void stamps it with the money)",
    !generic.ok && (await stateOf(D.week, users)).live === 8, errOf(generic));
  await fault(D.week.marketId, -1);
  const pushedTo: string[] = [];
  const onBalance = (d: { userId: string }) => { pushedTo.push(d.userId); };
  eventBus.on("wallet:balance", onBalance);
  const [r1, r2] = await Promise.all([W.svc.voidWeek({ weekId: D.week.id, now: D.at }), W.svc.voidWeek({ weekId: D.week.id, now: D.at })]);
  eventBus.off("wallet:balance", onBalance);
  const s2 = await stateOf(D.week, users);
  ok("2.6 · ⭐ the fault undone, two resumes at once refund it EXACTLY once: one refunds, the other answers already — every live ticket refunded, the pool at 0, settled",
    r1.ok && r2.ok && [r1.already, r2.already].filter((x) => x === false).length === 1 && [r1, r2].some((r) => r.ok && r.refunded === 8)
      && s2.refundedTickets === 8 && s2.live === 0 && s2.voidPositions === 8 && s2.refunds === 8 && s2.pool === 0 && s2.settledAt !== null
      && pushedTo.length === 3 && new Set(pushedTo).size === 3,
    `${errOf(r1)} ${errOf(r2)} · ${J({ already: [r1.ok && r1.already, r2.ok && r2.already], s2, pushes: pushedTo.length })}`);
  ok("2.7 · …each balance exactly: a's 4,000 back, b's 2,000, and c's 2,000 for the two tickets it kept",
    s2.balances[0] - sold[0] === 4_000 && s2.balances[1] - sold[1] === 2_000 && s2.balances[2] - sold[2] === 2_000, J(s2.balances.map((x, k) => x - sold[k])));
  const cTickets = (await dal.ticketStore.listForWeek(D.week.id)).filter((t: any) => t.userId === c);
  const cOut = ((await market.listPositionsForMarket(D.week.marketId)) as any[]).filter((p) => p.userId === c && p.status === "CASHED_OUT");
  ok("2.8 · the ticket c cancelled in its free window stays CANCELLED, its position CASHED_OUT, with no refund row of its own",
    cTickets.filter((t: any) => t.status === "CANCELLED").length === 1 && cOut.length === 1
      && !((await W.db.txn.findByUser(c, 500)) as any[]).some((t) => t.type === "BET_REFUND" && t.positionId === cOut[0]?.id));
  ok("2.9 · the alert is cleared, and nothing is owed", !voidAlert(await consoleRead.consoleAlerts(D.at), D.week.id) && !(await owedIds()).includes(D.week.id));
}

// ── §3 · R1 · resumed by the tick ───────────────────────────────────────────
console.log(`${LF}§3 · R1 · interrupted after the stamp, then resumed by the tick`);
{
  const users = small.slice(3, 5);
  const D = await doomedWeek([[users[0], 5], [users[1], 5]]);
  const sold = await Promise.all(users.map(bal));
  await fault(D.week.marketId, 1);
  const stuck = await W.svc.voidWeek({ weekId: D.week.id, now: D.at });
  ok("3.1 · stuck after the stamp: VOIDED, unsettled, owed", !stuck.ok && (await stateOf(D.week, users)).weekState === "VOIDED" && (await owedIds()).includes(D.week.id), errOf(stuck));
  const failing = await scheduler.runMaswaliTick(D.at);
  const s1 = await stateOf(D.week, users);
  ok("3.2 · ⛔ a tick while the fault stands counts the week failed and moves nothing", failing.failures >= 1 && s1.live === 10 && s1.refunds === 0 && s1.settledAt === null && J(s1.balances) === J(sold),
    J({ failing, s1 }));
  await fault(D.week.marketId, -1);
  const tick = await scheduler.runMaswaliTick(D.at);
  const s2 = await stateOf(D.week, users);
  ok("3.3 · ⭐ the next tick resumes it, and counts it voided: refunded to the shilling, the pool at 0, settled",
    tick.voided === 1 && tick.failures === 0 && s2.refundedTickets === 10 && s2.refunds === 10 && s2.pool === 0 && s2.settledAt !== null
      && s2.balances.every((x, k) => x - sold[k] === 5_000), J({ tick, s2 }));
  ok("3.4 · the alert is cleared", !voidAlert(await consoleRead.consoleAlerts(D.at), D.week.id));
}

// ── §4 · R1 · resumed by the heal ───────────────────────────────────────────
console.log(`${LF}§4 · R1 · interrupted after the stamp, then resumed by the heal`);
{
  const users = small.slice(5, 7);
  const D = await doomedWeek([[users[0], 3], [users[1], 1]]);
  const sold = await Promise.all(users.map(bal));
  await fault(D.week.marketId, 1);
  const stuck = await W.svc.voidWeek({ weekId: D.week.id, now: D.at });
  await fault(D.week.marketId, -1);
  ok("4.1 · stuck after the stamp, VOIDED and owed — the fault already gone, so only a retry is missing",
    !stuck.ok && (await stateOf(D.week, users)).settledAt === null && (await owedIds()).includes(D.week.id), errOf(stuck));
  if (W.onPostgres) {
    // ⭐ The heal as the operator runs it: its own CLI, in a second process, against this database.
    const heal = (apply: boolean) => spawnSync("npx", ["tsx", "scripts/ops-maswali-heal.mts", ...(apply ? ["--apply"] : [])], {
      cwd: ROOT, env: { ...process.env }, encoding: "utf8", shell: process.platform === "win32", timeout: 5 * 60_000,
    });
    const dry = heal(false);
    const sDry = await stateOf(D.week, users);
    ok("4.2 · the heal's dry run names the week, says its refunds have not landed and raises the alert — and writes nothing",
      dry.status === 0 && `${dry.stdout}`.includes(D.week.code) && `${dry.stdout}`.includes("REFUNDS NOT LANDED") && `${dry.stdout}`.includes("its refunds have not landed")
        && sDry.settledAt === null && sDry.live === 4, `${dry.status} · ${`${dry.stdout}`.slice(-400)} ${`${dry.stderr}`.slice(-300)}`);
    const applied = heal(true);
    ok("4.3 · ⭐ the heal's --apply resumes it (the scheduler's own reconcile), and exits 0",
      applied.status === 0 && `${applied.stdout}`.includes("voided 1"), `${applied.status} · ${`${applied.stdout}`.slice(-400)} ${`${applied.stderr}`.slice(-300)}`);
  } else {
    // The memory store has no second process to reach it: the dry run's own reads, then the reconcile `--apply` runs.
    ok("4.2 · the heal's dry-run reads name the week as owed and raise its alert — and write nothing",
      (await owedIds()).includes(D.week.id) && !!voidAlert(await consoleRead.consoleAlerts(D.at), D.week.id) && (await stateOf(D.week, users)).live === 4);
    const r = await scheduler.reconcileMaswaliWeeks();
    ok("4.3 · ⭐ the heal's apply — reconcileMaswaliWeeks, the scheduler's own tick — resumes it", r.voided === 1 && r.failures === 0, J(r));
  }
  const s = await stateOf(D.week, users);
  ok("4.4 · refunded to the shilling, the pool at 0, settled, and the alert cleared",
    s.refundedTickets === 4 && s.refunds === 4 && s.pool === 0 && s.settledAt !== null && s.balances[0] - sold[0] === 3_000 && s.balances[1] - sold[1] === 1_000
      && !voidAlert(await consoleRead.consoleAlerts(D.at), D.week.id), J(s));
}

// ── §5 · the old code's stuck state, resumed ────────────────────────────────
console.log(`${LF}§5 · R1 · the old code's stuck state — its market stamped VOID, never settled — fenced, then resumed`);
{
  const users = small.slice(7, 9);
  const D = await doomedWeek([[users[0], 2], [users[1], 2]]);
  const sold = await Promise.all(users.map(bal));
  // ⚠️ A FIXTURE OF STATE, DECLARED: exactly the two writes the old `voidWeek` made before its `settleMarket` failed — the
  //    week patched VOIDED, the market stamped VOID with no settlement — so a week stranded that way is shown resumed.
  const oldAt = new Date(Date.now() - 3_600_000).toISOString();
  await dal.weekStore.patch(D.week.id, { state: "VOIDED" });
  await W.w.mdal.marketStore.stamp(D.week.marketId, {
    status: "VOIDED", resolvedOutcome: "VOID", resolutionStage1By: "system_maswali", resolutionStage1At: oldAt,
    resolutionStage2By: "system_maswali", resolutionStage2At: oldAt, objectionsClosedAt: oldAt, resolutionNotifiedAt: oldAt,
    settledAt: null, updatedAt: oldAt,
  });
  const fenced = await market.settleMarket(D.week.marketId, { actorId: "system_maswali" });
  ok("5.1 · ⛔ settleMarket refuses a VOIDED, unsettled week's market — the poll's VOID arm never refunds a week again (one exactly-once truth)",
    !fenced.ok && fenced.error === market.MASWALI_FENCE_ERROR && (await stateOf(D.week, users)).live === 4, errOf(fenced));
  ok("5.2 · …and the console raises it like any unrefunded void", !!voidAlert(await consoleRead.consoleAlerts(D.at), D.week.id));
  const r = await W.svc.voidWeek({ weekId: D.week.id, now: D.at });
  const s = await stateOf(D.week, users);
  ok("5.3 · ⭐ voidWeek resumes it: refunded to the shilling, the pool at 0, settled",
    r.ok && r.already === false && s.refundedTickets === 4 && s.pool === 0 && s.settledAt !== null && s.balances.every((x, k) => x - sold[k] === 2_000), errOf(r) || J(s));
  const m = await W.w.mdal.marketStore.get(D.week.marketId);
  ok("5.4 · the market keeps the stamps it was first given (stamped once), and gains only its settlement",
    m?.resolutionStage1At === oldAt && m?.resolutionStage2At === oldAt && m?.objectionsClosedAt === oldAt && !!m?.settledAt && m?.settledAt !== oldAt,
    J({ stage1: m?.resolutionStage1At, closed: m?.objectionsClosedAt, settledAt: m?.settledAt }));
}

// ── §6 · a second run changes nothing ───────────────────────────────────────
console.log(`${LF}§6 · a second run changes nothing`);
{
  const snap = async () => ({ s: await stateOf(B, big), settledAt: (await W.w.mdal.marketStore.get(B.marketId))?.settledAt ?? null, lines: await groupLines(B.id) });
  const before = await snap();
  const pushedTo: string[] = [];
  const onBalance = (d: { userId: string }) => { pushedTo.push(d.userId); };
  eventBus.on("wallet:balance", onBalance);
  const again = await W.svc.voidWeek({ weekId: B.id, now: doomed.at });
  const direct = await voids.refundVoidedWeek(B.id);
  eventBus.off("wallet:balance", onBalance);
  const after = await snap();
  ok("6.1 · voidWeek on a refunded week answers already", again.ok && again.already === true && again.week.state === "VOIDED", errOf(again));
  ok("6.2 · ⭐ …and nothing moved: every balance, refund row, ticket and position, the pool, and the market's own settled stamp",
    J(after.s) === J(before.s) && after.s.refunds === 2_000 && after.s.refundedTickets === 2_000 && after.settledAt === before.settledAt, J({ before: before.settledAt, after: after.settledAt }));
  if (W.onPostgres) ok("6.3 · …and its ledger group holds the same 4,000 lines", before.lines === 4_000 && after.lines === 4_000, `${before.lines} → ${after.lines}`);
  ok("6.4 · refundVoidedWeek called directly answers already too", direct.ok && direct.already === true, errOf(direct));
  ok("6.5 · no second balance push: nothing moved, so no open page is told anything", pushedTo.length === 0, `${pushedTo.length} pushes`);
  const tick = await scheduler.runMaswaliTick(doomed.at);
  ok("6.6 · the tick finds nothing owed", !(await owedIds()).includes(B.id) && tick.voided === 0, J(tick));
}

// ── §6b · Postgres · a refund failing at its last statement rolls back whole ─
if (W.onPostgres) {
  console.log(`${LF}§6b · Postgres · a refund that fails at its last statements rolls back whole, and is refunded whole after`);
  const users = small.slice(3, 5);
  const D = await doomedWeek([[users[0], 3], [users[1], 2]]);
  const sold = await Promise.all(users.map(bal));
  const px = W.prisma()!;
  // ⚠️ A FAULT THE PRODUCT CANNOT PRODUCE, DECLARED: the tickets' CHECK narrowed back to before REFUNDED existed (NOT VALID,
  //    so the tickets already refunded above stand), so the refund's ticket statement — after the wallets, the positions,
  //    the refund rows and the ledger lines — fails inside the one transaction.
  await px.$executeRawUnsafe(`ALTER TABLE "MaswaliTicket" DROP CONSTRAINT "MaswaliTicket_status_check"`);
  await px.$executeRawUnsafe(`ALTER TABLE "MaswaliTicket" ADD CONSTRAINT "MaswaliTicket_status_check" CHECK ("status" IN ('LIVE', 'CANCELLED', 'SETTLED')) NOT VALID`);
  let threw = "";
  try { await W.svc.voidWeek({ weekId: D.week.id, now: D.at }); } catch (err) { threw = String((err as Error)?.message ?? err); }
  const s1 = await stateOf(D.week, users);
  const lines = await groupLines(D.week.id);
  ok("6b.1 · ⭐ the failure at the tickets rolls the WHOLE refund back — positions OPEN, wallets uncredited, no refund row, no ledger line, the market unsettled — and the week stays VOIDED and owed",
    threw.length > 0 && s1.weekState === "VOIDED" && s1.open === 5 && s1.live === 5 && s1.refunds === 0 && lines === 0 && s1.settledAt === null
      && s1.pool === 5_000 && J(s1.balances) === J(sold) && (await owedIds()).includes(D.week.id), `${threw.slice(0, 160)} · ${J(s1)} · lines ${lines}`);
  await px.$executeRawUnsafe(`ALTER TABLE "MaswaliTicket" DROP CONSTRAINT "MaswaliTicket_status_check"`);
  await px.$executeRawUnsafe(`ALTER TABLE "MaswaliTicket" ADD CONSTRAINT "MaswaliTicket_status_check" CHECK ("status" IN ('LIVE', 'CANCELLED', 'SETTLED', 'REFUNDED'))`);
  const r = await W.svc.voidWeek({ weekId: D.week.id, now: D.at });
  const s2 = await stateOf(D.week, users);
  ok("6b.2 · …and with the CHECK whole again, voidWeek refunds it exactly once, to the shilling",
    r.ok && r.already === false && s2.refundedTickets === 5 && s2.refunds === 5 && s2.pool === 0 && s2.settledAt !== null && (await groupLines(D.week.id)) === 10
      && s2.balances[0] - sold[0] === 3_000 && s2.balances[1] - sold[1] === 2_000, errOf(r) || J(s2));
}

// ── §7 · CONTROL · a week that grades is untouched ──────────────────────────
console.log(`${LF}§7 · CONTROL · a week that grades is never voided, refunded or alerted — and still settles`);
{
  const r = await W.svc.voidWeek({ weekId: ctlWeek.id, now: ctlAt });
  const s = await stateOf(ctlWeek, ctlBuyers);
  ok("7.1 · voidWeek refuses a week whose sealed record grades (no week void)", !r.ok && errOf(r).includes("not final"), errOf(r));
  ok("7.2 · …and nothing moved: RESOLVING, tickets LIVE, positions OPEN, balances as bought, its market unsettled, its pool at the sales",
    s.weekState === "RESOLVING" && s.live === 6 && s.open === 6 && s.refunds === 0 && s.settledAt === null && s.pool === 6_000 && J(s.balances) === J(ctlSold), J(s));
  const direct = await voids.refundVoidedWeek(ctlWeek.id);
  ok("7.3 · refundVoidedWeek refuses a week that is not VOIDED", !direct.ok && errOf(direct).includes("only a VOIDED week is refunded"), errOf(direct));
  ok("7.4 · every tick above left it RESOLVING; it is owed nothing, and no void alert names it",
    (await dal.weekStore.get(ctlWeek.id)).state === "RESOLVING" && !(await owedIds()).includes(ctlWeek.id) && !voidAlert(await consoleRead.consoleAlerts(ctlAt), ctlWeek.id));
  // It is now the one week of either line still open to a tick, its window closed, waiting for accounting.
  const waiting = await scheduler.nextMaswaliDueMs(ctlAt.getTime());
  ok("7.4b · ⭐ a week waiting for its release never shortens the timer's next wake below the normal cadence: its closed window is no wake time",
    waiting === null && scheduler.wakeDelayMs(waiting, ctlAt.getTime()) === 5 * 60_000, `due ${waiting} · delay ${scheduler.wakeDelayMs(waiting, ctlAt.getTime())}`);
  const windowEnd = Date.parse(ctlWeek.objectionsCloseAt);
  ok("7.4c · CONTROL · …while a future instant still is: before that window closed, the next wake was its end",
    (await scheduler.nextMaswaliDueMs(windowEnd - 2 * 3_600_000)) === windowEnd);
  const rel = await W.release(ctlWeek.id, ctlAt);
  ok("7.5 · it still settles the normal way: released, SETTLED, its pool at 0", rel.ok && rel.week.state === "SETTLED" && (await pool(ctlWeek.marketId)) === 0, errOf(rel));
}

// ── §7b · the bulk credit is all or nothing ─────────────────────────────────
console.log(`${LF}§7b · the bulk credit (db.wallet.creditMany) is all or nothing, and the refund takes no wallet lock`);
{
  const [u1, u2] = small.slice(0, 2);
  const before = await Promise.all([u1, u2].map(bal));
  // The holder with a wallet comes first, on another amount: on Postgres its credit is written, then rolled back.
  const missing = await W.db.wallet.creditMany([{ userId: u1, amount: 1_000 }, { userId: "usr_mln_void_no_wallet", amount: 2_000 }]);
  const afterMissing = await Promise.all([u1, u2].map(bal));
  const twice = await W.db.wallet.creditMany([{ userId: u1, amount: 1_000 }, { userId: u2, amount: 1_000 }, { userId: u1, amount: 3_000 }]);
  const unpaid = await W.db.wallet.creditMany([{ userId: u1, amount: 1_000 }, { userId: u2, amount: 0 }]);
  const after = await Promise.all([u1, u2].map(bal));
  ok("7b.1 · ⛔ a holder with no wallet refuses the whole credit, and the wallet it reached first keeps its balance (rolled back on Postgres, never written in memory)",
    missing === null && J(afterMissing) === J(before), J({ missing, before, afterMissing }));
  ok("7b.2 · ⛔ a user named twice refuses the whole credit: credited neither once nor twice", twice === null && J(after) === J(before), J({ twice, before, after }));
  ok("7b.3 · ⛔ an amount that is not positive refuses the whole credit", unpaid === null && J(after) === J(before), J({ unpaid, before, after }));
  // Lock order: wallet → market across the platform, so a refund holding `market:` must never take a wallet's lock.
  const src = readFileSync(join(ROOT, "src/lib/server/maswali-void.ts"), "utf8");
  const walletLock = ["withLock(`wallet:", 'withLock("wallet:', "withAdvisoryLock(`wallet:", 'withAdvisoryLock("wallet:'].filter((s) => src.includes(s));
  ok("7b.4 · the refund takes no wallet: lock — it credits by row updates inside its one transaction",
    walletLock.length === 0 && src.includes("db.wallet.creditMany(") && !src.includes("db.wallet.adjust("), J(walletLock));
}

// ── §8 · the invariants ─────────────────────────────────────────────────────
console.log(`${LF}§8 · the invariants hold over all of it`);
{
  const inv = await checkMaswaliInvariants();
  ok("8.1 · ⭐ every pool at 0 — each voided week's included, on both stores — and no voided week holds a live ticket", inv.ok, J(inv.problems));
}

console.log(`${LF}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
