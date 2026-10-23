/**
 * S18's worker — ONE CONTAINER for `scripts/load/s18-maswali-objection-cross-instance.mts` (MASWALI-BUILD S7-OB): its own
 * OS process and its own Prisma pool, on the scratch Postgres the orchestrator made. It reads ONE job (the JSON file S18_JOB
 * names), does it through the product's own doors (`scripts/lib/maswali-money-world.mts` for the week, the bet path and the
 * release; `src/lib/server/maswali-objections.ts` for the filing and the ruling), and prints one `@@RESULT {json}` line.
 *
 * ⭐ A RACING JOB (`race: true`) WAITS AT THE BARRIER — S16's (`s16-maswali-worker.mts`): everything loaded and one
 *    statement made, `@@READY`, then the go file (S18_GO) and the instant written in it, the last stretch spun, so the two
 *    processes of an act start within milliseconds of each other. Anything a job reads to prepare (the seal an officer
 *    reviewed) is read BEFORE the barrier, so only the act itself is raced.
 *
 * Jobs (`kind`):
 *   setup   — the licence and the Owner's guarantee (`world.setup`), every player in `groups`, and the `officers` (each a
 *             real account with its role), written to `playersFile` (one process makes them all);
 *   week    — a week `weeksAhead` from today, drafted, attested, OPEN, its `lots` sold through the one bet path, closed and
 *             sealed all YES by the world's sealer; answers the graded set's instant and the window's end;
 *   file    — `fileMillioneaObjection` by `userId` on `slot` at `at`;
 *   rule    — `decideMillioneaObjection` by `officerId` with `ruling` at `at`, on the seal of `slot` read before the barrier;
 *   release — prepare and release the week at `at` (`world.release`);
 *   check   — the week as the database holds it: its row, the question at `slot`, every objection on its market with its
 *             durable ruling audit rows, the winners, the payout rows and the accounts asked for; on `ledger` the trial
 *             balance and the Millionea invariants.
 * ⛔ Not run directly. ⛔ The orchestrator refuses any database it did not create.
 * ⚠️ This file carries no backslash: line breaks are built from their code points.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

process.env.SESSION_SECRET ??= "maswali-s18-session-secret-0123456789abcdef";
const job: any = JSON.parse(readFileSync(process.env.S18_JOB ?? "", "utf8"));

const { loadMaswaliWorld } = await import("../lib/maswali-money-world.mts");
const W = await loadMaswaliWorld();
const ob = await import("../../src/lib/server/maswali-objections.ts");
const { checkMaswaliInvariants } = await import("../../src/lib/server/maswali-invariants.ts");
const { auditFlush } = await import("../../src/lib/server/audit.ts");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (v: unknown) => console.log(`@@RESULT ${JSON.stringify(v)}`);
const errOf = (r: any): string | null => (r && r.ok === false ? String(r.error ?? r.reason ?? "refused") : null);
/** WIN: every main YES; LOSE: M1 missed; M4NO: every main YES but M4 — the slip an upheld REVERSE of M4 makes the winner. */
const slipOf = (s: string) => (s === "WIN" ? W.WIN : s === "M4NO" ? W.slip("YES", 3) : W.LOSE);
const players: Record<string, string[]> = job.playersFile && existsSync(job.playersFile) ? JSON.parse(readFileSync(job.playersFile, "utf8")) : {};
const writeAtomic = (path: string, text: string) => {
  writeFileSync(`${path}.tmp`, text);
  renameSync(`${path}.tmp`, path);
};

/** The barrier: a warm connection, READY, the go file, then its instant — the last few milliseconds spun, not slept. */
async function barrier(): Promise<number> {
  await W.prisma()!.$queryRawUnsafe("SELECT 1");
  console.log(`@@READY ${process.pid}`);
  const go = process.env.S18_GO ?? "";
  let at = 0;
  while (at <= 0) {
    if (go && existsSync(go)) {
      try { at = Number(JSON.parse(readFileSync(go, "utf8")).at); } catch { at = 0; }
    }
    if (at <= 0) await sleep(5);
  }
  while (at - Date.now() > 25) await sleep(Math.max(1, at - Date.now() - 20));
  while (Date.now() < at) { /* spun */ }
  return Date.now();
}
const started = async (): Promise<number> => (job.race ? barrier() : Date.now());

try {
  if (job.kind === "setup") {
    await W.setup({ guarantee: job.guarantee });
    const groups: Record<string, string[]> = {};
    let made = 0;
    for (const [name, g] of Object.entries(job.groups as Record<string, { count: number; balance: number }>)) {
      groups[name] = [];
      for (let i = 0; i < g.count; i++) { groups[name].push(await W.user({ balance: g.balance })); made++; }
    }
    for (const [name, role] of Object.entries(job.officers as Record<string, string>)) {
      groups[name] = [await W.user({ id: `usr_s18_${name.toLowerCase()}_${process.pid}`, role })];
      made++;
    }
    writeAtomic(job.playersFile, JSON.stringify(groups));
    say({ ok: true, accounts: made });
  } else if (job.kind === "week") {
    const { week, start } = await W.openWeek({ weeksAhead: job.weeksAhead });
    const rules: any = W.svc.frozenRules(week);
    for (const lot of job.lots as Array<{ group: string; tickets: number; slip: string; perPlayer: number }>) {
      await W.sell(week.id, lot.tickets, slipOf(lot.slip), players[lot.group] ?? [], lot.perPlayer);
    }
    await W.closeAndSeal(week, start, []);
    const after: any = await W.dal.weekStore.get(week.id);
    say({ ok: true, weekId: week.id, marketId: week.marketId, code: week.code, price: rules.ticketPriceTzs,
      gradedSetFinalAt: after.gradedSetFinalAt, windowEnd: after.objectionsCloseAt });
  } else if (job.kind === "file") {
    const t = await started();
    const r: any = await ob.fileMillioneaObjection({ userId: job.userId, weekId: job.weekId, slot: job.slot, reason: "WRONG_OUTCOME",
      detail: job.detail ?? `The official source published another result for question ${job.slot}`, now: new Date(job.at) });
    say({ ok: r.ok === true, objectionId: r.ok ? r.objectionId : null, why: r.ok ? null : r.why, error: errOf(r), t, ms: Date.now() - t });
  } else if (job.kind === "rule") {
    // The seal the officer reviewed (its result and version), read as the console hands it — before the barrier.
    const q: any = (await W.dal.questionStore.listForWeek(job.weekId)).find((x: any) => x.slot === job.slot);
    const t = await started();
    const r: any = await ob.decideMillioneaObjection({ objectionId: job.objectionId, officerId: job.officerId, ruling: job.ruling,
      note: job.note ?? `Read the official source again for question ${job.slot}`, outcome: job.outcome, voidReason: null,
      expectedOutcome: q?.outcome, expectedSealedAt: q?.sealedAt, now: new Date(job.at) });
    say({ ok: r.ok === true, changed: r.ok ? r.changed : null, restarted: r.ok ? r.restarted : null, error: errOf(r), t, ms: Date.now() - t });
  } else if (job.kind === "release") {
    const t = await started();
    let r: any;
    try { r = await W.release(job.weekId, new Date(job.at)); } catch (e) { r = { ok: false, error: `THREW: ${String((e as Error)?.message ?? e).slice(0, 600)}` }; }
    say({ ok: r.ok === true, already: r.ok ? r.already === true : false, error: errOf(r), t, ms: Date.now() - t });
  } else if (job.kind === "check") {
    const r: any = { ok: true };
    if (job.weekId) {
      const week: any = await W.dal.weekStore.get(job.weekId);
      const tickets: any[] = await W.dal.ticketStore.listForWeek(job.weekId);
      const q: any = job.slot ? (await W.dal.questionStore.listForWeek(job.weekId)).find((x: any) => x.slot === job.slot) : null;
      const rows: any[] = await W.db.objection.listForMarket(week.marketId);
      const ids = rows.map((o) => o.id as string);
      // The durable ruling and filing rows, written once each act committed (`recordOwed`).
      const audits: any[] = ids.length ? await W.prisma()!.$queryRawUnsafe(
        `SELECT "action", "payload"->>'objectionId' AS "objectionId" FROM "AuditLog"
          WHERE "action" LIKE 'maswali.objection.%' AND "payload"->>'objectionId' = ANY($1::text[])`, ids) : [];
      const positions: any[] = await W.w.svc.listPositionsForMarket(week.marketId);
      const posIds = positions.map((p) => p.id as string);
      Object.assign(r, {
        week: { state: week.state, gradedSetFinalAt: week.gradedSetFinalAt, objectionsCloseAt: week.objectionsCloseAt,
          objectionRestarted: week.objectionRestarted, settledAt: week.settledAt, share: week.sharePerTicket, winning: week.winningTickets },
        question: q ? { outcome: q.outcome, sealedAt: q.sealedAt, evidence: q.evidence } : null,
        objections: rows.map((o) => ({ id: o.id, userId: o.userId, slot: o.questionOrdinal, status: o.status, remedy: o.remedy, reviewedBy: o.reviewedBy,
          audits: audits.filter((a) => a.objectionId === o.id).map((a) => a.action as string).sort() })),
        winners: [...new Set(tickets.filter((t) => t.won === true).map((t) => t.userId as string))].sort(),
        live: tickets.filter((t) => t.status === "LIVE").length,
        payouts: posIds.length ? await W.prisma()!.transaction.count({ where: { type: "BET_PAYOUT", positionId: { in: posIds } } }) : 0,
      });
    }
    if (Array.isArray(job.users)) {
      r.users = {};
      for (const u of job.users as string[]) r.users[u] = (await W.bal(u))?.balance ?? null;
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
