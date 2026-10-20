/**
 * S17's worker — for `scripts/load/s17-maswali-rush.mts` (MB-31, the Friday 18:00 rush). One OS process, its own Prisma
 * pool, on the scratch Postgres the orchestrator made. It reads ONE job (the JSON file RUSH_JOB names):
 *
 *   prep     — the licence and the Owner's guarantee; the Millionea accounts and the Up & Down bettors; one Up & Down
 *              round open on a 60-minute chain (its price read confirmed, as a round opens); one Millionea week OPEN, its
 *              close moved to `closeInSec` from the DATABASE's now (MB-28's move: the rush meets the close on the real
 *              clock, as a purchase reads it). Everything is written to `stateFile`. ⛔ One process makes every account.
 *   instance — ONE CONTAINER of the rush: the week timer armed as a container's boot arms it (`hydrateMaswaliOnBoot`),
 *              then the barrier, then until `endAt`: Millionea purchases as Poisson arrivals at `perMin` (this
 *              instance's share; `lastMinuteFactor` times denser in the minute before the close), each of 1 to 10
 *              tickets of fifteen random answers, on an account of its own slice with room under the cap, a BUSY
 *              retried with the SAME key as the slip retries it; Up & Down bets at `updownPerMin` on the open round;
 *              and after the close, a sample of the purchases that landed retried with their own keys (each must be
 *              answered with its receipt). Every answer, timed, goes to `outFile`.
 *   check    — the database afterwards: the week's row, its tickets (any placed at or after the close, on the database
 *              clock), the root over its live tickets, the pool three ways, the close's audit rows, each account's
 *              live tickets and balance, Up & Down's pool against its positions, the trial balance, the invariants.
 * ⛔ Not run directly. ⛔ The orchestrator refuses any database it did not create.
 * ⚠️ This file carries no backslash: line breaks are built from their code points.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { RUSH_SLIP_SIZES } from "./s17-maswali-rush-target.mts";

process.env.SESSION_SECRET ??= "maswali-s17-session-secret-0123456789abcdef";
const job: any = JSON.parse(readFileSync(process.env.RUSH_JOB ?? "", "utf8"));

const { loadMaswaliWorld, DRAFTER } = await import("../lib/maswali-money-world.mts");
const W = await loadMaswaliWorld();
const scheduler = await import("../../src/lib/server/maswali-scheduler.ts");
const { merkleRoot } = await import("../../src/lib/maswali-commitment.ts");
const { checkMaswaliInvariants } = await import("../../src/lib/server/maswali-invariants.ts");
const { auditFlush } = await import("../../src/lib/server/audit.ts");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (v: unknown) => console.log(`@@RESULT ${JSON.stringify(v)}`);
const writeAtomic = (path: string, text: string) => {
  writeFileSync(`${path}.tmp`, text);
  renameSync(`${path}.tmp`, path);
};
const UD_STAKE = 1_000;

/** The barrier: a warm connection, READY, the go file, then its instant. */
async function barrier(): Promise<void> {
  await W.prisma()!.$queryRawUnsafe("SELECT 1");
  console.log(`@@READY ${process.pid}`);
  const go = process.env.RUSH_GO ?? "";
  let at = 0;
  while (at <= 0) {
    if (go && existsSync(go)) {
      try { at = Number(JSON.parse(readFileSync(go, "utf8")).at); } catch { at = 0; }
    }
    if (at <= 0) await sleep(5);
  }
  while (Date.now() < at) await sleep(Math.max(1, Math.min(50, at - Date.now())));
}

/** Poisson arrivals between `from` and `to` at `rateAt(t)` per minute (thinned from `maxPerMin`); `fire` is not awaited. */
async function arrivals(from: number, to: number, maxPerMin: number, rateAt: (t: number) => number, fire: (t: number) => void): Promise<void> {
  if (!(maxPerMin > 0)) return;
  let t = Math.max(from, Date.now());
  for (;;) {
    t += -Math.log(1 - Math.random()) * (60_000 / maxPerMin);
    if (t >= to) return;
    if (Math.random() * maxPerMin > rateAt(t)) continue;
    const wait = t - Date.now();
    if (wait > 0) await sleep(wait);
    fire(t);
  }
}

const randomSlip = () => Array.from({ length: 15 }, () => (Math.random() < 0.5 ? "YES" : "NO"));
/** Tickets in one purchase: mostly one or two, sometimes a full slip of ten. */

try {
  if (job.role === "prep") {
    const t0 = Date.now();
    await W.setup({ guarantee: job.guarantee });
    const players: string[] = [], bettors: string[] = [];
    for (let i = 0; i < job.players; i++) {
      players.push(await W.user({ balance: job.playerBalance }));
      if ((i + 1) % 1_000 === 0) console.log(`  … ${i + 1} Millionea accounts`);
    }
    for (let i = 0; i < job.bettors; i++) bettors.push(await W.user({ balance: job.bettorBalance }));
    console.log(`  … ${players.length + bettors.length} accounts in ${Math.round((Date.now() - t0) / 1000)} s`);

    // Up & Down: one round open on a 60-minute chain, as its own suites open one (`updown-load-quickbet.test.mts`).
    const { seedDefaultSources, addSource } = await import("../../src/lib/server/source-registry.ts");
    const { createAsset, setAssetEnabled, createChain, setChainState } = await import("../../src/lib/server/updown-config.ts");
    const { chainStore, observationStore } = await import("../../src/lib/server/updown-dal.ts");
    const { openRound } = await import("../../src/lib/server/updown-service.ts");
    await seedDefaultSources();
    try { await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "load fixture", addedBy: "system" }); } catch { /* already present */ }
    const stamp = Date.now();
    const asset: any = await createAsset({ key: `RSH${stamp % 10_000}`, symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", nameZh: "比特币", iconKey: "crypto",
      priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "crypto", decimals: 2, minMoveTicks: 2 } as never, "off");
    if (!asset.ok) throw new Error(`the Up & Down asset: ${asset.error}`);
    const en: any = await setAssetEnabled(asset.data.id, true, "off");
    if (!en.ok) throw new Error(`the Up & Down asset could not be enabled: ${en.error}`);
    const chainR: any = await createChain({ assetId: asset.data.id, durationMinutes: 60, minStake: UD_STAKE, maxStake: 100_000 } as never, "off");
    if (!chainR.ok) throw new Error(`the Up & Down chain: ${chainR.error}`);
    const run: any = await setChainState(chainR.data.id, "RUNNING", "off");
    if (!run.ok) throw new Error(`the Up & Down chain could not run: ${run.error}`);
    const chain = await chainStore.get(chainR.data.id);
    const openIso = new Date(Date.now() - 60_000).toISOString();
    const obs: any = await observationStore.ensure(asset.data.id, openIso);
    await observationStore.confirm(obs.id, { price: 2_400, sourceUrl: asset.data.priceSourceUrl, sourceQuotedAt: openIso, evidence: "q 2400", confidence: 95, model: "load", rawHash: `h2400${openIso}${stamp}` } as never);
    const round: any = await openRound(chain as never, openIso, obs.id, 2_400);
    if (!round.ok) throw new Error(`the Up & Down round: ${round.error}`);

    // The Millionea week: opened as every suite opens one, then its close brought to the run's instant (MB-28).
    const { week } = await W.openWeek({ weeksAhead: 2 });
    const dbNow = await W.money.dbNowMs(null);
    const moved: any = await W.svc.moveClose({ weekId: week.id, toCloseAt: new Date(dbNow + job.closeInSec * 1_000).toISOString(), officerId: DRAFTER, now: new Date() });
    if (!moved.ok) throw new Error(`the week's close could not be brought to the run (MB-28): ${moved.error}`);
    const rules: any = W.svc.frozenRules(moved.week);
    const state = {
      weekId: week.id, marketId: week.marketId, code: week.code, closesAt: moved.week.closesAt, price: rules.ticketPriceTzs, cap: rules.ticketCapPerWeek,
      players, playerBalance: job.playerBalance, bettors, bettorBalance: job.bettorBalance,
      updownMarketId: round.data.marketId, updownSelectionClosedAt: (await W.mdal.marketStore.get(round.data.marketId))?.selectionClosedAt ?? null,
    };
    writeAtomic(job.stateFile, JSON.stringify(state));
    say({ ok: true, closesAt: state.closesAt, price: state.price, cap: state.cap, accounts: players.length + bettors.length, updownMarketId: state.updownMarketId,
      updownSelectionClosedAt: state.updownSelectionClosedAt, ms: Date.now() - t0 });
  } else if (job.role === "instance") {
    const st = JSON.parse(readFileSync(job.stateFile, "utf8"));
    const n: number = job.instances, me: number = job.index;
    const mine: string[] = st.players.filter((_: string, j: number) => j % n === me);
    const bettors: string[] = st.bettors.filter((_: string, j: number) => j % n === me);
    const sideOf = new Map<string, "YES" | "NO">(st.bettors.map((b: string, j: number) => [b, j % 2 === 0 ? "YES" : "NO"]));
    const closeMs = Date.parse(st.closesAt), startMs: number = job.rushStartAt, endMs: number = job.endAt;
    // The week timer, armed the way a container's boot arms it: the close is stamped by whichever instance's tick wins.
    await scheduler.hydrateMaswaliOnBoot();
    await barrier();
    const lateStartMs = Math.max(0, Date.now() - startMs);
    if (Date.now() < startMs) await sleep(startMs - Date.now());

    const held = new Map<string, number>(), reserved = new Map<string, number>();
    const room = (u: string) => st.cap - (held.get(u) ?? 0) - (reserved.get(u) ?? 0);
    const pick = (): string | null => {
      for (let i = 0; i < 20; i++) { const u = mine[Math.floor(Math.random() * mine.length)]; if (u && room(u) > 0) return u; }
      return mine.find((u) => room(u) > 0) ?? null;
    };
    const buys: any[] = [], bets: any[] = [], retries: any[] = [], pending: Promise<void>[] = [];
    const samples: Array<{ userId: string; slips: string[][]; key: string; tickets: string[] }> = [];
    let noRoom = 0;

    const purchase = async (t: number) => {
      const userId = pick();
      if (!userId) { noRoom++; return; }
      const size = Math.min(RUSH_SLIP_SIZES[Math.floor(Math.random() * RUSH_SLIP_SIZES.length)], room(userId));
      reserved.set(userId, (reserved.get(userId) ?? 0) + size);
      const slips = Array.from({ length: size }, randomSlip);
      const key = randomUUID();
      const attempts: Array<{ ms: number; ok: boolean; reason: string | null }> = [];
      const t0 = Date.now();
      let r: any = null;
      for (let a = 0; a <= job.retries; a++) {
        const ta = Date.now();
        try { r = await W.buy(userId, st.weekId, slips, { key }); } catch (e) { r = { ok: false, reason: "THREW", error: String((e as Error)?.message ?? e).slice(0, 200) }; }
        attempts.push({ ms: Date.now() - ta, ok: r.ok === true, reason: r.ok ? null : String(r.reason ?? r.code ?? "refused") });
        const busy = !r.ok && (r.code === "BUSY" || r.reason === "system_busy");
        if (!busy || a === job.retries) break;
        await sleep(1_000 * Math.max(1, Number(r.retryAfterSec ?? 1)));
      }
      reserved.set(userId, (reserved.get(userId) ?? 0) - size);
      const tickets: string[] = r?.ok ? ((r.data?.maswali?.tickets ?? []) as any[]).map((x) => x.ticketId as string) : [];
      if (r?.ok) held.set(userId, (held.get(userId) ?? 0) + tickets.length);
      buys.push({
        at: t0, planned: Math.round(t), toClose: t0 - closeMs, userId, n: size, ok: r?.ok === true, reason: r?.ok ? null : String(r?.reason ?? r?.code ?? "refused"),
        error: r?.ok ? null : r?.error ?? null, replayed: r?.ok ? r.data?.replayed === true : false, tickets, attempts: attempts.length,
        totalMs: Date.now() - t0, lastMs: attempts[attempts.length - 1]?.ms ?? null, key,
      });
      if (r?.ok && closeMs - t0 < 60_000 && samples.length < job.retrySample) samples.push({ userId, slips, key, tickets });
    };
    const bet = async () => {
      const userId = bettors[Math.floor(Math.random() * bettors.length)];
      if (!userId) return;
      const t0 = Date.now();
      let r: any;
      try {
        r = await W.w.svc.buyPosition(userId, { marketId: st.updownMarketId, side: sideOf.get(userId) ?? "YES", stake: UD_STAKE, idempotencyKey: randomUUID() });
      } catch (e) { r = { ok: false, reason: "THREW", error: String((e as Error)?.message ?? e).slice(0, 200) }; }
      bets.push({ at: t0, userId, ok: r.ok === true, reason: r.ok ? null : String(r.reason ?? r.code ?? "refused"), positionId: r.ok ? r.data?.positionId ?? null : null, ms: Date.now() - t0 });
    };

    const base: number = job.perMin, burst = base * job.lastMinuteFactor;
    const rateAt = (t: number) => (t >= closeMs - 60_000 && t < closeMs ? burst : base);
    await Promise.all([
      arrivals(startMs, endMs, Math.max(base, burst), rateAt, (t) => { pending.push(purchase(t)); }),
      arrivals(startMs, endMs, job.updownPerMin, () => job.updownPerMin, () => { pending.push(bet()); }),
      (async () => {
        // MB-31 · after the close, a purchase that landed and lost its answer is retried with its own key: the receipt.
        const at = closeMs + 5_000;
        if (Date.now() < at) await sleep(at - Date.now());
        for (const s of samples) {
          const t0 = Date.now();
          let r: any;
          try { r = await W.buy(s.userId, st.weekId, s.slips, { key: s.key }); } catch (e) { r = { ok: false, reason: "THREW", error: String((e as Error)?.message ?? e).slice(0, 200) }; }
          const got: string[] = r.ok ? ((r.data?.maswali?.tickets ?? []) as any[]).map((x) => x.ticketId as string) : [];
          retries.push({ at: t0, userId: s.userId, ok: r.ok === true, replayed: r.ok ? r.data?.replayed === true : false, reason: r.ok ? null : String(r.reason ?? r.code ?? "refused"),
            same: r.ok && [...got].sort().join(",") === [...s.tickets].sort().join(","), ms: Date.now() - t0 });
        }
      })(),
    ]);
    // Everything sent is answered before the instance reports: a purchase still in flight would be missing from the books.
    await Promise.race([Promise.all(pending), sleep(180_000)]);
    const unanswered = pending.length - buys.length - bets.length - noRoom;
    writeAtomic(job.outFile, JSON.stringify({ index: me, lateStartMs, noRoom, unanswered, buys, bets, retries }));
    say({ ok: true, index: me, buys: buys.length, bets: bets.length, retries: retries.length, lateStartMs, noRoom, unanswered });
  } else if (job.role === "check") {
    const st = JSON.parse(readFileSync(job.stateFile, "utf8"));
    const week: any = await W.dal.weekStore.get(st.weekId);
    const tickets: any[] = await W.dal.ticketStore.listForWeek(st.weekId);
    const live = tickets.filter((t) => t.status === "LIVE");
    const closeMs = Date.parse(week.closesAt);
    const market: any = await W.mdal.marketStore.get(st.marketId);
    const liveByUser: Record<string, number> = {};
    for (const t of live) liveByUser[t.userId] = (liveByUser[t.userId] ?? 0) + 1;
    const wallets: any[] = await W.prisma()!.wallet.findMany({ where: { userId: { in: [...st.players, ...st.bettors] } }, select: { userId: true, balance: true } });
    const balanceOf: Record<string, number> = Object.fromEntries(wallets.map((w) => [w.userId, Number(w.balance)]));
    // Read by its action: every purchase writes an audit row on the week too, so a newest-first page could miss the close's.
    const closedRows: any[] = await W.prisma()!.auditLog.findMany({
      where: { targetType: "MaswaliCycle", targetId: st.weekId, action: "maswali.week.closed" }, orderBy: { createdAt: "asc" }, select: { createdAt: true },
    });
    const udMarket: any = await W.mdal.marketStore.get(st.updownMarketId);
    const udPositions: any[] = await W.w.svc.listPositionsForMarket(st.updownMarketId);
    const tb: any = await W.ledger.trialBalance();
    say({
      ok: true,
      week: { state: week.state, closesAt: week.closesAt, closedAt: week.closedAt, ticketCount: week.ticketCount, salesAtClose: week.salesAtClose, ticketMerkleRoot: week.ticketMerkleRoot },
      tickets: { all: tickets.length, live: live.length, atOrAfterClose: tickets.filter((t) => Date.parse(t.createdAt) >= closeMs).length, ids: live.map((t) => t.id as string) },
      rootOfLive: merkleRoot(live.map((t) => ({ ticketId: t.id as string, leaf: t.selectionsHash as string }))),
      pool: { market: market?.yesPool ?? null, other: market?.noPool ?? null, ledger: await W.balanceOf(W.acct.pool(st.marketId)) },
      closedAudit: closedRows.map((e) => new Date(e.createdAt).toISOString()),
      liveByUser, balanceOf,
      updown: {
        pool: (udMarket?.yesPool ?? 0) + (udMarket?.noPool ?? 0), positions: udPositions.length,
        stakes: udPositions.reduce((s, p) => s + Number(p.stake), 0),
        stakesByUser: udPositions.reduce((m: Record<string, number>, p) => { m[p.userId] = (m[p.userId] ?? 0) + Number(p.stake); return m; }, {}),
      },
      trialBalance: { ok: tb.ok, checked: tb.checkedWallets, drifting: tb.driftingWallets, imbalanced: tb.imbalancedGroups.length, globalBalanced: tb.globalBalanced },
      invariants: await checkMaswaliInvariants(),
    });
  } else {
    say({ ok: false, threw: `unknown role "${job.role}"` });
    process.exitCode = 2;
  }
} catch (e) {
  say({ ok: false, threw: String((e as Error)?.stack ?? e).slice(0, 2_000) });
  process.exitCode = 1;
}
try { await auditFlush(); } catch { /* the audit queue is not what this worker measures */ }
process.exit(process.exitCode ?? 0);
