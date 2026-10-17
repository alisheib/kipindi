/**
 * test:maswali-shared-paths — THE PATHS EVERY PRODUCT SHARES, AFTER MILLIONEA TOUCHED THEM (MASWALI-BUILD S3/S4).
 *
 *   npx tsx scripts/maswali-shared-paths.test.mts     (npm run test:maswali-shared-paths; both stores)
 *
 * Millionea's build edited code a Yes/No player runs on every bet: the bet door (the ticket arm sits above the poll
 * path), the cash-out (a line read before its lock), the loss limit (its net now subtracts Millionea's excluded money in
 * SQL), the house book (a new liability query), the lifecycle (a nightly check), the admin overview (an alerts read).
 * This suite drives each of those for a player who has never seen Millionea, with no Millionea week anywhere, and
 * requires the platform's own answers: nothing moved for anyone else, and no new read throws.
 * ⭐ The Postgres half is the point: the loss-limit exclusion is raw SQL over three tables, and it runs inside the bet's
 *    own transaction for every player with a daily loss limit.
 */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-shared-paths-secret-0123456789abcdef";

const { loadWorld } = await import("./house-bot-world.mts");
const W = await loadWorld();
const rg = await import("../../src/lib/server/responsible-gambling.ts");
const { ticketStore } = await import("../../src/lib/server/maswali-dal.ts");
const { checkMaswaliInvariants } = await import("../../src/lib/server/maswali-invariants.ts");
const consoleRead = await import("../../src/lib/server/maswali-console.ts");
const { readHouseAccounts } = await import("../../src/lib/server/house-ledger.ts");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const why = (r: { ok: boolean; reason?: string; error?: string }) => (r.ok ? "ok" : `${r.reason ?? "-"}: ${r.error}`);
const noThrow = async <T,>(fn: () => Promise<T>): Promise<{ ok: true; v: T } | { ok: false; e: string }> => {
  try { return { ok: true, v: await fn() }; } catch (e) { return { ok: false, e: String((e as Error).message ?? e) }; }
};

// ── §1 · a Yes/No bet and its free cash-out, unchanged ──────────────────────
console.log("\n§1 · a poll bet and its free exit");
const poll = await W.poll({ graceMin: 5 }); // `createMarket` answers the stored market itself
const marketId: string = poll.id;
const p = await W.user({ balance: 50_000 });
{
  ok("1.0 · the poll exists", !!marketId, JSON.stringify(poll).slice(0, 160));
  const bet = await W.svc.buyPosition(p, { marketId, side: "YES", stake: 2_000 });
  ok("1.1 · a YES stake on a poll goes through the bet door", bet.ok && !bet.data.maswali, why(bet));
  ok("1.2 · one debit of the stake", (await W.bal(p)).balance === 48_000, `${(await W.bal(p)).balance}`);
  const out = bet.ok ? await W.svc.cashOutPosition(p, bet.data.positionId) : null;
  ok("1.3 · the free cash-out inside the window returns the stake", !!out?.ok && out.data.value === 2_000 && (await W.bal(p)).balance === 50_000, out ? why(out) : "no bet");
}

// ── §2 · the loss limit, for a player with no ticket ever ───────────────────
console.log("\n§2 · the loss limit reads its net with Millionea's exclusion, which is 0 for this player");
{
  const q = await W.user({ balance: 50_000 });
  const ex = await noThrow(() => ticketStore.lossLimitExclusionsSince(q, new Date(Date.now() - 86_400_000).toISOString()));
  ok("2.1 · ⭐ the exclusion read runs and finds nothing", ex.ok && ex.v === 0, ex.ok ? `${ex.v}` : ex.e);
  await rg.setLimits(q, { dailyLossLimit: 3_000 });
  const a = await W.svc.buyPosition(q, { marketId, side: "NO", stake: 2_000 });
  ok("2.2 · ⭐ a stake inside the limit goes through (the gate's SQL ran in the bet's transaction)", a.ok, why(a));
  const b = await W.svc.buyPosition(q, { marketId, side: "NO", stake: 2_000 });
  ok("2.3 · …and the next stake past it is refused with the platform's own reason", !b.ok && b.reason === "loss_limit_daily", why(b));
  const usage = await noThrow(() => rg.getLimitUsage(q));
  ok("2.4 · the player's \"used today\" reads the same net: 2,000", usage.ok && usage.v.lossToday === 2_000, usage.ok ? `${usage.v.lossToday}` : usage.e);
  const net = await W.db.txn.sumGamblingNetSince(q, Date.now() - 86_400_000);
  ok("2.5 · the DAL sum it is built on is untouched (−2,000)", net === -2_000, `${net}`);
}

// ── §3 · the house book, the invariants, the console reads ──────────────────
console.log("\n§3 · the reads Millionea added to shared pages");
{
  if (W.onPostgres) {
    const h = await noThrow(() => readHouseAccounts());
    ok("3.1 · ⭐ the house book's accounts read, with no Millionea pool owed", h.ok && !!h.v && h.v.maswaliOpenPools === 0 && h.v.maswaliJackpot === 0, h.ok ? JSON.stringify(h.v && { pools: h.v.maswaliOpenPools, jackpot: h.v.maswaliJackpot }) : h.e);
  }
  const inv = await noThrow(() => checkMaswaliInvariants());
  ok("3.2 · the nightly invariants run and hold over no week", inv.ok && inv.v.ok && inv.v.weeks === 0, inv.ok ? JSON.stringify(inv.v) : inv.e);
  const alerts = await noThrow(() => consoleRead.consoleAlerts());
  ok("3.3 · ⭐ the overview's Millionea alerts are EMPTY while no week exists (no strip on /admin before the first draft)", alerts.ok && alerts.v.length === 0, alerts.ok ? JSON.stringify(alerts.v) : alerts.e);
  for (const [name, fn] of [
    ["listConsoleWeeks", () => consoleRead.listConsoleWeeks()],
    ["consoleStanding", () => consoleRead.consoleStanding()],
    ["poolsView", () => consoleRead.poolsView()],
    ["integrityView", () => consoleRead.integrityView()],
  ] as const) {
    const r = await noThrow(fn as () => Promise<unknown>);
    ok(`3.4 · the console's ${name} reads with no week`, r.ok, r.ok ? "" : r.e);
  }
}

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
