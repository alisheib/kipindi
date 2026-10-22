/**
 * test:journey-measures — the S13 reads (`src/lib/server/journey-measures-dal.ts`, the visit reads in `site-visits.ts`, the
 * S9 seam), S13-PLAN WP5, ON BOTH STORES.
 *
 *   npm run test:journey-measures     (boots the on-box Postgres through db-scratch; KP_SCRATCH_PORT picks its port)
 *   npm run red:journey-measures      (--prove-red: memory only, in process — each defect is planted in the reads the cases
 *                                      call and must be caught by its own named case; nothing is written to disk)
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/journey-measures-cases.mts`), each read asserted against the fixture's own
 * arithmetic — so the stores agree by agreeing with it. Postgres adds M.10: every client call the reads make is recorded
 * and must carry a window or an id list, and N concurrent first counts of one counter key must make N.
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP. ⛔ THE FLOOR: 16 lines on memory + 0.store = 17; Postgres adds M.10 and M.10b = 19.
 * ⭐ RAISED 2026-10-18 (MASWALI-BUILD S6, OD-22) TO THE PRINTED COUNT: S9's seam is open on this build, so M.9d and M.9e
 *    print where M.9c did (the 17 above was a line short since), and M.12, M.12b, M.12c and M.12d (round 2) add four — 22 on
 *    memory, 24 on Postgres. Round 3: M.12e, M.12f and M.12g add three — 25 and 27. Round 5 rewrites them for the unit's
 *    own horizon (M.12b–M.12g; the count is unchanged). Round 6: M.12h and M.12i add two on each store, and M.12h2 one
 *    on Postgres (every ticket read recorded with its window) — 27 and 30. Round 9: M.12j (reads across chunks) — 28 and 31. Round 11: M.12k (the chunk seam's guard) — 29 and 32.
 */
const PROVE_RED = process.argv.includes("--prove-red");

if (!PROVE_RED) {
  const { runTwoStores } = await import("./lib/house-bot-two-stores.mts");
  await runTwoStores({ suite: "test:journey-measures", casesFile: "scripts/lib/journey-measures-child.mts", minPass: { memory: 29, postgres: 32 }, dbPrefix: "s13_measures" });
} else {
  delete process.env.DATABASE_URL;
  process.env.USE_PRISMA_DAL = "false";
  process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
  const { loadDal, runDalCases } = await import("./lib/journey-measures-cases.mts");
  const { impl: REAL } = await loadDal();
  const { siteVisitsReport } = await import("../src/lib/server/site-visits.ts");
  const { db } = await import("../src/lib/server/store.ts");
  type Impl = typeof REAL;
  type Row = Record<string, unknown> & { id: string; userId: string; at: number };
  let runIndex = 1;
  const run = async (impl: Impl) => {
    const failed: string[] = [];
    try { await runDalCases((label, cond) => { if (!cond) failed.push(label); }, impl, runIndex++); }
    catch (e) { failed.push(`threw: ${String((e as Error)?.message ?? e).slice(0, 160)}`); }
    return failed;
  };
  /** The deposit rows of the memory store, raw — for plants that re-admit what a filter dropped. */
  const raw = async () => (await Promise.resolve(db.txn.listAll())).filter((t) => t.type === "DEPOSIT");
  const users = async () => new Map((await Promise.resolve(db.user.list())).map((u) => [u.id, u]));
  const asRow = (t: { id: string; userId: string; createdAt: string; completedAt?: string | null }): Row => {
    const c = t.completedAt ? Date.parse(t.completedAt) : null;
    return { id: t.id, userId: t.userId, at: c ?? Date.parse(t.createdAt), completedAt: c, savedBet: null };
  };
  const inWin = (r: Row, f: number, to: number) => r.at >= f && r.at < to;
  /** The memory store's Millionea ticket positions of these players, as a bet read returns them — for the OD-22 plants. */
  const ticketsOf = async (ids: readonly string[]) => {
    const { positionStore, marketStore } = await import("../src/lib/server/market-dal.ts");
    const mine = (await positionStore.values()).filter((p) => ids.includes(p.userId) && !p.houseBotId);
    const books = await marketStore.bookByIds([...new Set(mine.map((p) => p.marketId))]);
    return mine.filter((p) => books.get(p.marketId)?.productLine === "MASWALI")
      .map((p) => ({ id: p.id, userId: p.userId, marketId: p.marketId, side: p.side, stake: p.stake, placedAt: Date.parse(p.placedAt) }));
  };
  /** A row as R2 or R4 returned it, with the round-5 mark taken off (the plants below put a ticket holder back in). */
  const unmark = (r: Record<string, unknown>) => { const { ticketInHorizon: _mark, ...rest } = r; void _mark; return rest; };
  /** ⭐ Round 6 — a window holding every ticket ever bought, and R2 re-marked over a mutated 4b horizon. */
  const EVER_FROM = Date.parse("2000-01-01T00:00:00.000Z"), EVER_TO = Date.parse("2100-01-01T00:00:00.000Z");
  const MIN = 60_000;
  const remark4b = (lo: number, hi: number, endIncluded: boolean) => async (f: number, to: number) => {
    const rows = (await REAL.confirmedDeposits(f, to)).map(unmark) as Array<Record<string, unknown> & { userId: string; at: number }>;
    const bought = await REAL.ticketPurchases(rows.map((r) => r.userId), EVER_FROM, EVER_TO);
    return rows.map((r) => ((bought.get(r.userId) ?? []).some((t) => t >= r.at + lo && (endIncluded ? t <= r.at + hi : t < r.at + hi)) ? { ...r, ticketInHorizon: true as const } : r));
  };
  const plants: Array<{ name: string; expect: RegExp; impl: Impl }> = [
    { name: "R1 counts a REVERSED deposit (status filter dropped)", expect: /^M\.4 /,
      impl: { ...REAL, shortfallDeposits: async (f, to) => [...(await REAL.shortfallDeposits(f, to)), ...(await raw()).filter((t) => t.status === "REVERSED" && t.origin === "low_balance").map(asRow).filter((r) => inWin(r, f, to))] } },
    { name: "R1 counts a staff depositor (role filter dropped)", expect: /^M\.4 /,
      impl: { ...REAL, shortfallDeposits: async (f, to) => { const u = await users(); return [...(await REAL.shortfallDeposits(f, to)), ...(await raw()).filter((t) => t.status === "CONFIRMED" && t.origin === "low_balance" && !t.houseBotId && u.get(t.userId)?.role === "FINANCE").map(asRow).filter((r) => inWin(r, f, to))]; } } },
    { name: "R1 counts a marked deposit", expect: /^M\.4 /,
      impl: { ...REAL, shortfallDeposits: async (f, to) => [...(await REAL.shortfallDeposits(f, to)), ...(await raw()).filter((t) => t.status === "CONFIRMED" && t.origin === "low_balance" && t.houseBotId).map(asRow).filter((r) => inWin(r, f, to))] } },
    { name: "R2 places a deposit by createdAt (completedAt ignored)", expect: /^M\.(5|4b) /,
      impl: { ...REAL, confirmedDeposits: async (f, to) => (await REAL.confirmedDeposits(f, to)).map((r: Row) => ({ ...r, at: r.at - 10 * 60_000 })) } },
    { name: "R2's window closed at its upper bound (lte, not lt)", expect: /^M\.5b /,
      impl: { ...REAL, confirmedDeposits: (f, to) => REAL.confirmedDeposits(f, to + 1) } },
    { name: "the follow-up read exclusive at its upper bound", expect: /^M\.6b /,
      impl: { ...REAL, betsOf: (ids, f, to) => REAL.betsOf(ids, f, to - 1) } },
    { name: "a marked stake counted as a follow-up bet", expect: /^M\.6 /,
      impl: { ...REAL, betsOf: async (ids, f, to) => { const { positionStore } = await import("../src/lib/server/market-dal.ts"); const all = await positionStore.values(); return [...(await REAL.betsOf(ids, f, to)), ...all.filter((p) => ids.includes(p.userId) && p.houseBotId).map((p) => ({ id: p.id, userId: p.userId, marketId: p.marketId, side: p.side, stake: p.stake, placedAt: Date.parse(p.placedAt) }))]; } } },
    { name: "R4 drops AGENT accounts (role === PLAYER, S3b's rule)", expect: /^M\.7 /,
      impl: { ...REAL, joinedPlayers: async (f, to) => { const u = await users(); return (await REAL.joinedPlayers(f, to)).filter((p: { id: string }) => u.get(p.id)?.role === "PLAYER"); } } },
    { name: "R4's first bet counts a marked stake", expect: /^M\.7 /,
      impl: { ...REAL, joinedPlayers: async (f, to) => (await REAL.joinedPlayers(f, to)).map((p: { firstBetAt: number | null; joinedAt: number }) => (p.firstBetAt === null ? { ...p, firstBetAt: p.joinedAt + 30 * 60_000 } : p)) } },
    { name: "W counts a REVERSED deposit as failed", expect: /^M\.8 /,
      impl: { ...REAL, depositOutcomesByDay: async (f, to) => { const m = await REAL.depositOutcomesByDay(f, to); for (const d of m.values()) if (d.confirmed > 0) { d.confirmed--; d.failed++; break; } return m; } } },
    { name: "home views from the top-N ranking ('/' out of the top)", expect: /^M\.2 /,
      impl: { ...REAL, homeViewsByDay: async (f, to) => { const r = await siteVisitsReport(f, to, 0); return new Map(r.pages.filter((p) => p.path === "/").map((p) => [f, p.views])); } } },
    { name: "counters read on the UTC day (one day early)", expect: /^M\.1 /,
      impl: { ...REAL, counterRows: async (f, to) => (await REAL.counterRows(f, to)).map((r: { day: string }) => ({ ...r, day: new Date(Date.parse(`${r.day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10) })) } },
    { name: "the seam opened while the schema has no S9 columns", expect: /^M\.9 /,
      impl: { ...REAL, seam: REAL.seam.replace("export const S9_RECORDS: S9Records | null = null;", "export const S9_RECORDS: S9Records | null = { savedQuestionBet: () => null, returnWindowMs: 1800000 };") } },
    { name: "the returned-bet read answers [] while the seam is shut", expect: /^M\.9c /,
      impl: { ...REAL, returnedBetsOf: async () => [] } },
    { name: "a second 30-minute constant beside S9's", expect: /^M\.9b /,
      impl: { ...REAL, measuresSource: REAL.measuresSource.replace("export const DEPOSIT_FOLLOW_UP_MS = 30 * 60_000;", "export const DEPOSIT_FOLLOW_UP_MS = 31 * 60_000;") } },
    { name: "the view walks a store itself", expect: /^M\.11 /,
      impl: { ...REAL, viewSource: `${REAL.viewSource}\nconst all = await db.txn.listAll();` } },
    // ⭐ MASWALI-BUILD S6 · OD-22 — the two ways a ticket could come back in as a bet.
    { name: "a Millionea ticket counted as a deposit's follow-up bet", expect: /^M\.12 /,
      impl: { ...REAL, betsOf: async (ids, f, to) => [...(await REAL.betsOf(ids, f, to)), ...(await ticketsOf(ids)).filter((b) => b.placedAt >= f && b.placedAt <= to)] } },
    // ⭐ Round 2 — the population rule of measures 5 and 4b: a ticket holder put back in either one's whole.
    // ⭐ Round 5 — who 5 and 4b leave out: a unit whose player bought a ticket within the window the measure reads for it.
    { name: "a sign-up whose ticket came within its horizon left unmarked (measure 5 keeps it)", expect: /^M\.12b /,
      impl: { ...REAL, joinedPlayers: async (f, to) => (await REAL.joinedPlayers(f, to)).map(unmark) } },
    { name: "a deposit followed by a ticket within its window left unmarked (4b keeps it)", expect: /^M\.12d /,
      impl: { ...REAL, confirmedDeposits: async (f, to) => (await REAL.confirmedDeposits(f, to)).map(unmark) } },
    { name: "every ticket holder marked, whenever the ticket was bought (the horizon ignored: the baseline moves)", expect: /^M\.12e /,
      impl: { ...REAL, joinedPlayers: async (f, to) => {
        const rows = await REAL.joinedPlayers(f, to);
        const { ticketHolders } = await import("../src/lib/server/journey-measures-dal.ts");
        const held = await ticketHolders(rows.map((p: { id: string }) => p.id), EVER_TO);
        return rows.map((p: { id: string }) => (held.has(p.id) ? { ...p, ticketInHorizon: true as const } : p));
      } } },
    { name: "tickets read though no Millionea week has ever opened", expect: /^M\.12f /,
      impl: { ...REAL, joinedPlayers: async (f, to) => {
        const rows = await REAL.joinedPlayers(f, to);
        const { ticketHolders } = await import("../src/lib/server/journey-measures-dal.ts");
        await ticketHolders(rows.map((p: { id: string }) => p.id), EVER_TO);
        return rows;
      } } },
    // ⭐ Round 6 (MEDIUM-2) — the ticket read as round 5 made it: every ticket an account ever bought.
    { name: "the ticket read unbounded in time (every ticket an account ever bought)", expect: /^M\.12h /,
      impl: { ...REAL, ticketPurchases: (ids) => REAL.ticketPurchases(ids, EVER_FROM, EVER_TO) } },
    // ⭐ Round 6 (LOW 2) — 4b's horizon wrong at either end.
    { name: "4b's horizon opened before the deposit (a ticket 10 minutes before it marks it)", expect: /^M\.12i /,
      impl: { ...REAL, confirmedDeposits: remark4b(-30 * MIN, 30 * MIN, true) } },
    { name: "4b's horizon open at its end (a ticket at exactly +30 minutes leaves the deposit in)", expect: /^M\.12i /,
      impl: { ...REAL, confirmedDeposits: remark4b(0, 30 * MIN, false) } },
    { name: "4b's horizon a millisecond long (a ticket at +30 minutes + 1 ms marks the deposit)", expect: /^M\.12i /,
      impl: { ...REAL, confirmedDeposits: remark4b(0, 30 * MIN + 1, true) } },
  ];
  let caught = 0, fail = 0;
  const say = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = await run(REAL);
  say("the REAL reads pass every case", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = await run(p.impl);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    say(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the cases cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}
