/**
 * S16's worker — ONE CONTAINER for `scripts/load/s16-maswali-cross-instance.mts`: its own OS process and its own Prisma
 * pool, on the scratch Postgres the orchestrator made. It reads ONE job (the JSON file S16_JOB names), does it through the
 * product's own doors (`scripts/lib/maswali-money-world.mts`: the ceremonies, `purchaseMaswaliTickets`, `closeWeek`, the
 * release), and prints one `@@RESULT {json}` line for the orchestrator.
 *
 * ⭐ A RACING JOB (`race: true`) WAITS AT THE BARRIER. With everything loaded and one statement made (a warm connection),
 *    it prints `@@READY`, then waits for the go file (S16_GO) and the instant written in it, the last stretch spun — so
 *    the two or three processes of an act start within milliseconds of each other, never one politely after the other,
 *    which would prove nothing about two containers. `delayMs` then holds this one back (the closer behind the buyers).
 *
 * Jobs (`kind`):
 *   setup   — the licence and the Owner's guarantee (`world.setup`), then every account the acts use, in groups, written
 *             to `playersFile` (one process makes them all, so no two processes can draw the same test phone);
 *   open    — a week `weeksAhead` from today, drafted, attested and OPEN;
 *   week    — the same, then its `lots` sold through the one bet path, closed, and sealed (`seal`: YES, or ALL_VOID);
 *   seal    — an already-closed week sealed (all YES);
 *   buy     — a `plan` of purchases, `concurrency` at a time, until `stopOn` (a reason) answers; every answer recorded
 *             with its reason and its tickets;
 *   close   — `closeWeek` at `at`;  tick — the scheduler's `runMaswaliTick` at `at`;
 *   release — prepare and release a week at `at`, each step timed;  correct — the sealer's `correctSeal` at `at`;
 *   void    — `voidWeek` at `at`;  fund — `fundMaswaliGuarantee` under `reference`;
 *   check   — the week as the database holds it (its row, tickets, positions, the pool three ways, payout and refund
 *             rows, the root over its live tickets), the accounts asked for, and on `ledger` the trial balance and the
 *             Millionea invariants.
 *   suspend — after tickets were bought, fixture-suspend one named group in bounded batches; no wallet is touched.
 * ⛔ Not run directly. ⛔ The orchestrator refuses any database it did not create.
 * ⚠️ This file carries no backslash: line breaks are built from their code points.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

process.env.SESSION_SECRET ??= "maswali-s16-session-secret-0123456789abcdef";
const job: any = JSON.parse(readFileSync(process.env.S16_JOB ?? "", "utf8"));

const { loadMaswaliWorld, SEALER, OWNER, RELEASER } = await import("../lib/maswali-money-world.mts");
const W = await loadMaswaliWorld();
const scheduler = await import("../../src/lib/server/maswali-scheduler.ts");
const { merkleRoot } = await import("../../src/lib/maswali-commitment.ts");
const { checkMaswaliInvariants } = await import("../../src/lib/server/maswali-invariants.ts");
const { auditFlush } = await import("../../src/lib/server/audit.ts");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (v: unknown) => console.log(`@@RESULT ${JSON.stringify(v)}`);
const errOf = (r: any): string | null => (r && r.ok === false ? String(r.error ?? r.reason ?? "refused") : null);
const slipOf = (s: string) => (s === "WIN" ? W.WIN : W.LOSE);
const players: Record<string, string[]> = job.playersFile && existsSync(job.playersFile) ? JSON.parse(readFileSync(job.playersFile, "utf8")) : {};
const writeAtomic = (path: string, text: string) => {
  writeFileSync(`${path}.tmp`, text);
  renameSync(`${path}.tmp`, path);
};

/** The barrier: a warm connection, READY, the go file, then its instant — the last few milliseconds spun, not slept. */
async function barrier(): Promise<number> {
  await W.prisma()!.$queryRawUnsafe("SELECT 1");
  console.log(`@@READY ${process.pid}`);
  const go = process.env.S16_GO ?? "";
  let at = 0;
  while (at <= 0) {
    if (go && existsSync(go)) {
      try { at = Number(JSON.parse(readFileSync(go, "utf8")).at); } catch { at = 0; }
    }
    if (at <= 0) await sleep(5);
  }
  while (at - Date.now() > 25) await sleep(Math.max(1, at - Date.now() - 20));
  while (Date.now() < at) { /* spun */ }
  if (Number(job.delayMs) > 0) await sleep(Number(job.delayMs));
  return Date.now();
}
const started = async (): Promise<number> => (job.race ? barrier() : Date.now());

/**
 * A plan of purchases, `concurrency` in flight: each answer with its reason, its tickets and its own timing. `stopOn` ends
 * the plan at the first answer with that reason (the close's): what was never sent is not in the results.
 */
async function buyAll(weekId: string, plan: Array<{ userId: string; n: number; slip?: string; key?: string }>, concurrency: number, stopOn?: string) {
  const results: any[] = [];
  let next = 0, stopped = false;
  const lane = async () => {
    for (;;) {
      const i = next++;
      if (i >= plan.length || stopped) return;
      const p = plan[i];
      const slips = Array.from({ length: p.n }, () => slipOf(p.slip ?? "LOSE"));
      const t0 = Date.now();
      try {
        const r: any = await W.buy(p.userId, weekId, slips, { key: p.key });
        const reason = r.ok ? null : String(r.reason ?? r.code ?? "refused");
        results.push({
          userId: p.userId, n: p.n, ok: r.ok === true, reason, replayed: r.ok ? r.data?.replayed === true : false,
          tickets: r.ok ? ((r.data?.maswali?.tickets ?? []) as any[]).map((t) => t.ticketId as string) : [],
          at: t0, ms: Date.now() - t0,
        });
        if (stopOn && reason === stopOn) stopped = true;
      } catch (e) {
        results.push({ userId: p.userId, n: p.n, ok: false, reason: "THREW", error: String((e as Error)?.message ?? e).slice(0, 300), replayed: false, tickets: [], at: t0, ms: Date.now() - t0 });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, lane));
  return results;
}

/** The week as the database holds it. */
async function weekFacts(weekId: string) {
  const week = await W.dal.weekStore.get(weekId);
  if (!week) return null;
  const tickets: any[] = await W.dal.ticketStore.listForWeek(weekId);
  const by = (s: string) => tickets.filter((t) => t.status === s);
  const live = by("LIVE");
  const market: any = week.marketId ? await W.mdal.marketStore.get(week.marketId) : null;
  const positions: any[] = week.marketId ? await W.w.svc.listPositionsForMarket(week.marketId) : [];
  const ids = positions.map((p) => p.id as string);
  const rules: any = W.svc.frozenRules(week);
  const fees: any = market?.feeSnapshot ?? {};
  const rows = async (type: string) => (ids.length ? W.prisma()!.transaction.count({ where: { type, positionId: { in: ids } } }) : 0);
  const pos = (s: string) => positions.filter((p) => p.status === s).length;
  return {
    week: {
      id: week.id, code: week.code, state: week.state, closesAt: week.closesAt, closedAt: week.closedAt, ticketCount: week.ticketCount,
      salesAtClose: week.salesAtClose, ticketMerkleRoot: week.ticketMerkleRoot, objectionsCloseAt: week.objectionsCloseAt, rolloverIn: week.rolloverIn,
      figures: { k: week.winningTickets, J: week.jackpot, F: week.fee, tra: week.traLevy, gbt: week.gbtLevy, share: week.sharePerTicket, paid: week.paidTotal, U: week.topUp, carry: week.carryOut },
    },
    rates: {
      price: rules?.ticketPriceTzs ?? null, cap: rules?.ticketCapPerWeek ?? null, floor: rules?.floorTzs ?? null,
      rate: fees.jackpotFeeRate ?? null, tra: fees.traTaxOnCommissionRate ?? null, gbt: fees.gbtLevyOnCommissionRate ?? null,
    },
    tickets: { all: tickets.length, live: live.length, settled: by("SETTLED").length, refunded: by("REFUNDED").length, cancelled: by("CANCELLED").length, won: tickets.filter((t) => t.won === true).length },
    rootOfLive: merkleRoot(live.map((t) => ({ ticketId: t.id as string, leaf: t.selectionsHash as string }))),
    positions: { all: positions.length, open: pos("OPEN"), win: pos("WIN"), loss: pos("LOSS"), void: pos("VOID") },
    pool: { market: market ? market.yesPool : null, other: market ? market.noPool : null, ledger: week.marketId ? await W.balanceOf(W.acct.pool(week.marketId)) : null },
    payouts: await rows("BET_PAYOUT"),
    refunds: await rows("BET_REFUND"),
    winnerUsers: job.listWinners ? [...new Set(tickets.filter((t) => t.won === true).map((t) => t.userId as string))].sort() : undefined,
  };
}

try {
  if (job.kind === "setup") {
    await W.setup({ guarantee: job.guarantee });
    const groups: Record<string, string[]> = {};
    let made = 0;
    for (const [name, g] of Object.entries(job.groups as Record<string, { count: number; balance: number }>)) {
      groups[name] = [];
      for (let i = 0; i < g.count; i++) {
        groups[name].push(await W.user({ balance: g.balance }));
        if (++made % 1_000 === 0) console.log(`  … ${made} accounts`);
      }
    }
    writeAtomic(job.playersFile, JSON.stringify(groups));
    say({ ok: true, accounts: made, guarantee: await W.balanceOf(W.acct.maswaliGuarantee) });
  } else if (job.kind === "open" || job.kind === "week") {
    const t0 = Date.now();
    const { week, start } = await W.openWeek({ weeksAhead: job.weeksAhead });
    const rules: any = W.svc.frozenRules(week);
    const base = { ok: true, weekId: week.id, marketId: week.marketId, code: week.code, start, closesAt: week.closesAt, price: rules.ticketPriceTzs, cap: rules.ticketCapPerWeek };
    if (job.kind === "open") {
      say(base);
    } else {
      for (const lot of job.lots as Array<{ group: string; tickets: number; slip: string; perPlayer: number }>) {
        await W.sell(week.id, lot.tickets, slipOf(lot.slip), players[lot.group] ?? [], lot.perPlayer);
        console.log(`  … ${lot.tickets} ${lot.slip} ticket(s) sold from ${lot.group} in ${Math.round((Date.now() - t0) / 1000)} s`);
      }
      const sold = Date.now();
      const outcomes = job.seal === "ALL_VOID" ? Array.from({ length: 15 }, () => ({ void: "not_played" })) : [];
      const at = await W.closeAndSeal(week, start, outcomes);
      const after = await W.dal.weekStore.get(week.id);
      say({ ...base, releaseAt: at.toISOString(), windowEnd: after?.objectionsCloseAt ?? null, sellMs: sold - t0, ms: Date.now() - t0 });
    }
  } else if (job.kind === "seal") {
    const week = await W.dal.weekStore.get(job.weekId);
    const at = await W.closeAndSeal(week, job.start, []);
    const after = await W.dal.weekStore.get(job.weekId);
    say({ ok: true, releaseAt: at.toISOString(), windowEnd: after?.objectionsCloseAt ?? null });
  } else if (job.kind === "buy") {
    const t = await started();
    const results = await buyAll(job.weekId, job.plan, Number(job.concurrency ?? 1), job.stopOn);
    say({ ok: true, t, results });
  } else if (job.kind === "close") {
    const t = await started();
    const r: any = await W.svc.closeWeek({ weekId: job.weekId, now: new Date(job.at) });
    say({ ok: r.ok === true, already: r.ok ? r.already === true : false, error: errOf(r), t, ms: Date.now() - t });
  } else if (job.kind === "tick") {
    const t = await started();
    const report = await scheduler.runMaswaliTick(new Date(job.at));
    say({ ok: true, report, t, ms: Date.now() - t });
  } else if (job.kind === "release") {
    // `world.release`, step by step, so the preparation and the release are timed apart: the release's own transaction is
    // what the 30-second budget bounds (a transaction past it is rolled back by the client, so a release that lands fit).
    const t = await started();
    const now = new Date(job.at);
    const p: any = await W.settle.previewMaswaliSettlement(job.weekId, now);
    const tp = Date.now();
    const r: any = p.ok
      ? await W.settle.settleMaswaliWeek({ weekId: job.weekId, releasedBy: RELEASER, digest: p.preview.digest, now })
      : (await W.dal.weekStore.get(job.weekId))?.state === "SETTLED"
        ? await W.settle.settleMaswaliWeek({ weekId: job.weekId, releasedBy: RELEASER, digest: "", now })
        : p;
    say({
      ok: r.ok === true, already: r.ok ? r.already === true : false, error: errOf(r), t, ms: Date.now() - t, previewMs: tp - t, settleMs: Date.now() - tp,
      share: r.ok && !r.already && p.ok ? p.preview.arithmetic?.share ?? null : null,
      previewHeld: p.ok ? p.preview.held : null,
    });
  } else if (job.kind === "correct") {
    const t = await started();
    const r: any = await W.svc.correctSeal({ weekId: job.weekId, slot: job.slot, outcome: job.outcome, evidence: job.evidence, officerId: SEALER, now: new Date(job.at) });
    say({ ok: r.ok === true, error: errOf(r), t, ms: Date.now() - t });
  } else if (job.kind === "void") {
    const t = await started();
    const r: any = await W.svc.voidWeek({ weekId: job.weekId, now: new Date(job.at) });
    say({ ok: r.ok === true, already: r.ok ? r.already === true : false, refunded: r.ok ? r.refunded ?? null : null, error: errOf(r), t, ms: Date.now() - t });
  } else if (job.kind === "fund") {
    const t = await started();
    const r: any = await W.money.fundMaswaliGuarantee({ amount: job.amount, reference: job.reference, typed: W.money.GUARANTEE_FUND_WORD, ownerId: OWNER });
    say({ ok: r.ok === true, balance: r.ok ? r.balance : null, error: errOf(r), t });
  } else if (job.kind === "suspend") {
    // A fixture of the account decision AFTER purchase. The product's purchase gate must see ACTIVE players; the release
    // must see SUSPENDED winners. The world explicitly allows setUserFields to stand in for the officer's status flow.
    const ids = players[String(job.group)] ?? [];
    if (ids.length === 0 || new Set(ids).size !== ids.length) throw new Error("suspend needs a nonempty, unique player group");
    for (let i = 0; i < ids.length; i += 250) {
      await Promise.all(ids.slice(i, i + 250).map((id) => W.setUserFields(id, { status: "SUSPENDED" })));
    }
    const confirmed = await W.prisma()!.user.count({ where: { id: { in: ids }, status: "SUSPENDED" } });
    say({ ok: confirmed === ids.length, group: job.group, requested: ids.length, confirmed });
  } else if (job.kind === "check") {
    const r: any = { ok: true, jackpot: await W.balanceOf(W.acct.maswaliJackpot), guarantee: await W.balanceOf(W.acct.maswaliGuarantee) };
    if (job.weekId) Object.assign(r, await weekFacts(job.weekId));
    if (Array.isArray(job.users)) {
      r.users = {};
      for (const u of job.users as string[]) {
        r.users[u] = { balance: (await W.bal(u))?.balance ?? null, live: job.weekId ? await W.dal.ticketStore.countLiveForUser(job.weekId, u) : null };
      }
    }
    if (Array.isArray(job.sumUsers)) {
      const agg: any = await W.prisma()!.wallet.aggregate({ _sum: { balance: true }, where: { userId: { in: job.sumUsers } } });
      r.sum = Number(agg?._sum?.balance ?? 0);
    }
    if (job.heldGroup) {
      const ids = players[String(job.heldGroup)] ?? [];
      if (!job.weekId || ids.length === 0 || new Set(ids).size !== ids.length) throw new Error("heldGroup needs a week and unique players");
      const pc = W.prisma()!;
      const [suspended, frozenWallets, heldTickets] = await Promise.all([
        pc.user.count({ where: { id: { in: ids }, status: "SUSPENDED" } }),
        pc.wallet.count({ where: { userId: { in: ids }, status: "FROZEN", freezeReasons: { has: "MILLIONEA_SHARE" } } }),
        pc.maswaliTicket.count({ where: { cycleId: job.weekId, userId: { in: ids }, status: "SETTLED", won: true, frozenReason: "account suspended" } }),
      ]);
      // Freeze audits are one per changed wallet, not one per ticket. Count durable rows and distinct accounts, not
      // audit text or player records; every account in this shape owns exactly one winning ticket.
      const audits: any[] = await pc.$queryRawUnsafe(
        `SELECT count(*)::int AS "rows", count(DISTINCT "targetId")::int AS "users" FROM "AuditLog"
          WHERE "action" = 'wallet.freeze_added' AND "targetType" = 'User'
            AND "targetId" = ANY($1::text[])
            AND left("payload"->>'note', length($2::text)) = $2::text`,
        ids, `Millionea ${r.week.code} ·`,
      );
      r.held = { players: ids.length, suspended, frozenWallets, heldTickets,
        auditRows: Number(audits[0]?.rows ?? 0), auditUsers: Number(audits[0]?.users ?? 0) };
    }
    if (job.ledger) {
      const tb: any = await W.ledger.trialBalance();
      r.trialBalance = { ok: tb.ok, checked: tb.checkedWallets, drifting: tb.driftingWallets, imbalanced: tb.imbalancedGroups.length, globalBalanced: tb.globalBalanced };
      r.invariants = await checkMaswaliInvariants();
    }
    say(r);
  } else {
    say({ ok: false, threw: `unknown job kind "${job.kind}"` });
    process.exitCode = 2;
  }
} catch (e) {
  say({ ok: false, threw: String((e as Error)?.stack ?? e).slice(0, 2_000) });
  process.exitCode = 1;
}
try { await auditFlush(); } catch { /* the audit queue is not what this worker measures */ }
process.exit(process.exitCode ?? 0);
