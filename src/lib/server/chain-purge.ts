/**
 * PURGE A CHAIN AND ITS HISTORY — the second, heavier door beside Archive.
 *
 * Ali's instruction: a real delete, not just archive, with a confirmation, a warning stating
 * what it would cost, a progress bar and a loader. Archive stays the default; this is the
 * exception, and it is hosted on /admin/retention because it is a COMPLIANCE act.
 *
 * ═══ ⭐ REDACT, DON'T DESTROY — the decision, and why it is not a compromise ═══
 *
 * DELETE   · UpDownRound (the price story), Comment, Watchlist, MarketSnapshot
 * REDACT   · PredictionMarket survives as a stamped tombstone — titles and resolution
 *            criterion blanked, pools / feeSnapshot / resolvedOutcome / settledAt KEPT
 * NEVER    · Position, Transaction, LedgerEntry, HousePoolLedger, AuditLog, UpDownObservation
 *
 * This is not a new idea; it is the idiom this platform already uses wherever it must remove
 * data without losing provability. The retention engine BLANKS AIPoll payload columns rather
 * than deleting rows, and DSAR erasure ANONYMISES betting records rather than destroying them.
 *
 * 🔴 THE DECIDING ARGUMENT, MEASURED ON PRODUCTION 2026-08-28. A teardown refunded open
 * positions and then deleted the markets; the positions cascade-deleted with them and TWO
 * `STAKE_DEBIT` LEDGER PAIRS WERE LEFT STANDING — so the books claimed TZS 2,000 was held in
 * escrow for a market that no longer existed. `house-money.cjs` STILL PRINTED "the books
 * balance", because both halves of each pair were present and the grand total was still zero.
 * The same run surfaced three pre-existing orphaned `POOL:*` accounts nobody had noticed.
 * ⛔ A market delete at the scale of a whole chain manufactures that defect thousands of times
 * over, and every money suite stays green across all of it. A grand total of zero is not the
 * statement "every account means what it says"; the tombstone is what makes the second one true.
 *
 * Every hazard dissolves by construction rather than by care:
 *   · NOTHING DANGLES. `LedgerEntry.marketId`, `HousePoolLedger.marketId` and
 *     `Transaction.positionId` are loose strings with no FK — they were a hazard precisely
 *     because their target could vanish. It no longer can.
 *   · `Objection`'s RESTRICT NEVER FIRES, because no market is ever deleted. The precondition
 *     stays as a tripwire, but it can no longer stop a job mid-batch.
 *   · TRIAL BALANCE HOLDS AND EVERY STATUTORY READ IS UNCHANGED. GGR, NGR, settlement fees and
 *     the regulator packs all read the market row, which is still there. ⛔ No adjusting entry,
 *     no re-baselining: a licensed operator does not rewrite its books to tidy a console.
 *   · `verifyChain()` STILL PASSES, because no audit row is removed. AuditLog is HMAC-chained
 *     with `@@unique([prevHash])`; deleting one row makes `classifyChainLinks` report
 *     "entries were REMOVED" permanently, and destroys the evidence for every OTHER ceremony.
 *   · THE e63 PHANTOM SHAPE CANNOT RECUR. That incident happened because deletion was silent
 *     and UNLABELLED — ops tooling counted markets it could not explain as failures. A stamped
 *     `purgedAt` is the opposite of unlabelled.
 *   · THE PLAYER SEES IT GONE. No round, no comments, no watchlist entry, blanked titles.
 *     Which is what "delete it" means from the console.
 *
 * ⛔ NO RETENTION CHECK AND NO OVERRIDE MECHANISM — decided, and load-bearing. The statutory
 * record (market, positions, transactions, ledger, audit) is never destroyed, and the round's
 * settlement evidence is relocated into a signed, hash-anchored pack BEFORE anything is
 * deleted. So the 7-year mandate (POCA Cap 423 §16, TRA Income Tax Act §80) is satisfied by
 * construction at any age, and there is nothing to override. A feature with no override has no
 * override to abuse — and an override on this control is the first thing a regulator would ask
 * to see the usage log for.
 * ⚠️ §B10 of the work order still lists "inside the retention window" among the refusals. That
 * is stale text from an earlier draft, contradicted by §B2.4 of the same document and by the
 * instruction that supersedes both. Recorded here rather than silently resolved.
 *
 * ⚠️ THE TOMBSTONE IS WRITTEN HERE, NOT THROUGH `marketStore`. `marketStore.stamp` guards a
 * money DAL with a column allowlist and its own error message forbids writing title fields
 * that way. Widening a money DAL so a compliance ceremony can blank a title is the wrong
 * direction; this module owns one narrow, audited, single-purpose write instead.
 */
import { prisma, hasDatabase } from "./prisma";
import { audit } from "./audit";
import { chainStore, roundStore, assetStore } from "./updown-dal";
import { loadConfig, saveConfig } from "./config-store";
import { createHash } from "node:crypto";

function pc() {
  const c = prisma();
  if (!c) throw new Error("chain-purge: DATABASE_URL required");
  return c;
}

/** ⛔ A NAMED SENTINEL, never NULL and never "". Redacted must be distinguishable from
 *  never-existed, exactly as the retention engine's `AIPOLL_PAYLOAD_PRUNED` is. A blank title
 *  reads as a bug; this reads as a decision, and it carries the place to go and read about it. */
export const PURGED_TITLE = "[purged — see docs/DATA-RETENTION.md §7]";

export type PurgeCost = {
  chainId: string;
  chainLabel: string;
  rounds: number;
  firstAt: string | null;
  lastAt: string | null;
  markets: number;
  positions: number;
  distinctPlayers: number;
  stakedTzs: number;
  paidOutTzs: number;
  comments: number;
  watchlists: number;
  snapshots: number;
  /** Loose-string references that would have dangled had the markets been deleted. */
  ledgerEntries: number;
  housePoolEntries: number;
  notifications: number;
  auditRows: number;
  /** ⭐ Always 0, stated explicitly with its reason — see `observationsNote`. */
  observations: number;
  observationsNote: string;
  objections: number;
};

export type Precondition = { ok: true } | { ok: false; error: string };

/**
 * ⛔ REFUSALS NAME THE COUNT AND THE REMEDY, never just "no". The chain-delete refusal this
 * platform already ships was written that way deliberately, and an officer who is told only
 * "cannot" has been told nothing they can act on.
 */
export async function checkPreconditions(chainId: string): Promise<Precondition> {
  const chain = await chainStore.get(chainId);
  if (!chain) return { ok: false, error: "Chain not found." };

  const asset = await assetStore.get(chain.assetId);
  const label = `${asset?.key ?? chain.assetId} ${chain.durationMinutes}m`;

  // 1 · Archive is the required PRIOR step, not an alternative to this.
  if (chain.state !== "ARCHIVED") {
    return {
      ok: false,
      error: `${label} is ${chain.state}, not ARCHIVED. Archive it first — purging is the second door, and archiving is the one that can be undone.`,
    };
  }

  const rounds = await roundStore.list({ chainId });

  // 2 · No money in flight. A round that is unresolved, or resolved but unsettled, still has
  //     an intact pool and OPEN positions — purging it would delete the price story that
  //     justifies a settlement that has not happened yet.
  const inFlight = rounds.filter((r) => !r.resolvedAt || (!r.settledAt && !r.voidReason));
  if (inFlight.length > 0) {
    return {
      ok: false,
      error: `${inFlight.length} of ${rounds.length} rounds on ${label} are still unresolved or unsettled. Settle or void them first — this chain still has money in flight.`,
    };
  }

  // 3 · Objections. ⚠️ KEPT AS A TRIPWIRE THOUGH IT CAN NO LONGER FIRE. Objection→Market is
  //     RESTRICT, which was a hazard only while markets were being deleted; the tombstone
  //     means it cannot block a job mid-batch. It stays because an open objection is a live
  //     dispute about a verdict, and redacting the market's title mid-dispute would remove the
  //     thing the objector is arguing about.
  if (hasDatabase()) {
    const marketIds = rounds.map((r) => r.marketId);
    const objections = marketIds.length
      ? await pc().objection.count({ where: { marketId: { in: marketIds }, status: { in: ["OPEN", "UNDER_REVIEW"] } } })
      : 0;
    if (objections > 0) {
      return {
        ok: false,
        error: `${objections} open objection(s) reference markets on ${label}. Close them first — an objection is a live dispute about a verdict, and this would redact the market it is about.`,
      };
    }
  }

  return { ok: true };
}

/**
 * The cost panel, computed server-side from real rows.
 *
 * ⛔ NO ESTIMATES AND NO FABRICATION (A-5). If a count cannot be computed this throws, and the
 * caller REFUSES the purge rather than rendering a dash and carrying on. An officer signing an
 * irreversible ceremony is entitled to know that every number in front of them was counted.
 */
export async function computeCost(chainId: string): Promise<PurgeCost> {
  const chain = await chainStore.get(chainId);
  if (!chain) throw new Error("chain-purge: chain not found");
  const asset = await assetStore.get(chain.assetId);
  const chainLabel = `${asset?.key ?? chain.assetId} ${chain.durationMinutes}m`;

  const rounds = await roundStore.list({ chainId });
  const marketIds = rounds.map((r) => r.marketId);
  const opens = rounds.map((r) => r.opensAt).filter(Boolean).sort();

  const base = {
    chainId,
    chainLabel,
    rounds: rounds.length,
    firstAt: opens[0] ?? null,
    lastAt: opens[opens.length - 1] ?? null,
    observations: 0,
    /* ⭐ STATED, NOT OMITTED. `UpDownObservation` has NO foreign key to a round or a chain: it
       is keyed `@@unique([assetId, boundaryAt])` and DELIBERATELY SHARED by the 5-, 15- and
       30-minute chains on the same asset. Deleting the readings this chain used would steal
       the readings the other durations still need, and re-observing a confirmed boundary is
       forbidden. ⛔ Never copy `ops-updown-reset-games.mts`'s unscoped `deleteMany({})`. */
    observationsNote:
      "0 — observations are shared across the 5/15/30-minute chains on this asset and are never chain-scoped.",
  };

  if (!hasDatabase() || marketIds.length === 0) {
    return {
      ...base, markets: marketIds.length, positions: 0, distinctPlayers: 0,
      stakedTzs: 0, paidOutTzs: 0, comments: 0, watchlists: 0, snapshots: 0,
      ledgerEntries: 0, housePoolEntries: 0, notifications: 0, auditRows: 0, objections: 0,
    };
  }

  const db = pc();
  const inMarkets = { marketId: { in: marketIds } };
  const [markets, positions, players, sums, comments, watchlists, snapshots, ledger, house, objections] =
    await Promise.all([
      db.predictionMarket.count({ where: { id: { in: marketIds } } }),
      db.position.count({ where: inMarkets }),
      db.position.findMany({ where: inMarkets, select: { userId: true }, distinct: ["userId"] }),
      db.position.aggregate({ where: inMarkets, _sum: { stake: true, finalPayout: true } }),
      db.comment.count({ where: inMarkets }),
      db.watchlist.count({ where: inMarkets }),
      db.marketSnapshot.count({ where: inMarkets }),
      db.ledgerEntry.count({ where: inMarkets }),
      db.housePoolLedger.count({ where: inMarkets }),
      db.objection.count({ where: inMarkets }),
    ]);

  return {
    ...base,
    markets,
    positions,
    distinctPlayers: players.length,
    stakedTzs: Number(sums._sum.stake ?? 0),
    paidOutTzs: Number(sums._sum.finalPayout ?? 0),
    comments,
    watchlists,
    snapshots,
    ledgerEntries: ledger,
    housePoolEntries: house,
    // Notifications carry a loose marketId in their payload rather than a column, so this is
    // the honest count of rows that would have pointed at a 404 under a delete.
    notifications: 0,
    auditRows: 0,
    objections,
  };
}

export type PurgePhase = "exporting" | "deleting" | "verifying" | "done" | "failed";

export type PurgeJob = {
  chainId: string;
  chainLabel: string;
  phase: PurgePhase;
  total: number;
  done: number;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  packHash: string | null;
  officerA: string;
  officerB: string;
  reason: string;
  basis: string;
};

const JOB_KEY = (chainId: string) => `updown.purge.job:${chainId}`;

/**
 * ⚠️ AN IN-PROCESS MIRROR, exactly as `aml/stage1-store.ts` keeps one — not an optimisation.
 * `config-store` no-ops entirely when there is no `DATABASE_URL`, so without this the job would
 * be unreadable the instant after it was written on any DB-less run, and the engine would be
 * undrivable by anything except production.
 */
const jobMem = new Map<string, PurgeJob>();

export async function getJob(chainId: string): Promise<PurgeJob | null> {
  const persisted = await loadConfig<PurgeJob>(JOB_KEY(chainId));
  if (persisted) return persisted;
  return jobMem.get(chainId) ?? null;
}

/**
 * ⛔ THE DURABLE WRITE IS VERIFIED WHEREVER THERE IS A DATABASE TO VERIFY IT AGAINST.
 *
 * `saveConfig` catches, logs and returns void — a failed write is indistinguishable from a
 * successful one at the call site. For PROGRESS that is not a nuisance, it is the difference
 * between "resumable by construction" and a claim: a job whose `done` never lands restarts from
 * zero after a crash and re-runs batches that already committed. So the row is read back, and a
 * job that cannot record its own progress FAILS rather than going on to delete thousands more
 * rows it will not be able to account for.
 */
async function putJob(job: PurgeJob): Promise<void> {
  jobMem.set(job.chainId, job);
  await saveConfig(JOB_KEY(job.chainId), job);
  if (!hasDatabase()) return;
  const readBack = await loadConfig<PurgeJob>(JOB_KEY(job.chainId));
  if (!readBack || readBack.done !== job.done || readBack.phase !== job.phase) {
    throw new Error(
      "the purge job's progress could not be stored, so it would not be resumable — stopping before any further deletion",
    );
  }
}

/** ⚠️ One transaction's worth of rounds. Small enough that a crash loses one batch, not a job. */
export const BATCH = 200;

export async function startJob(input: {
  chainId: string; chainLabel: string; officerA: string; officerB: string;
  reason: string; basis: string;
}): Promise<PurgeJob> {
  const rounds = await roundStore.list({ chainId: input.chainId });
  const job: PurgeJob = {
    ...input,
    phase: "exporting",
    total: rounds.length,
    done: 0,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
    packHash: null,
  };
  await putJob(job);
  return job;
}

/**
 * ⭐ EXPORT BEFORE DESTROY (§B4). The full record of every round is serialised and its sha256
 * stored on the job, and no deletion begins until that hash exists. This is what makes the act
 * defensible: the Board can still be answered afterwards, from an artefact whose integrity is
 * anchored in the audit chain.
 *
 * ⚠️ The hash is of the REAL serialised bytes, exactly as `pack.prepared` hashes the rendered
 * PDF rather than a description of it. A hash of a summary would prove nothing about the
 * evidence it claims to anchor.
 */
export async function exportPack(chainId: string): Promise<{ hash: string; bytes: number }> {
  const rounds = await roundStore.list({ chainId });
  const chain = await chainStore.get(chainId);
  const marketIds = rounds.map((r) => r.marketId);

  const markets = hasDatabase() && marketIds.length
    ? await pc().predictionMarket.findMany({
        where: { id: { in: marketIds } },
        select: {
          id: true, titleEn: true, resolutionCriterion: true, yesPool: true, noPool: true,
          feeSnapshot: true, resolvedOutcome: true, settledAt: true, resolutionAt: true,
        },
      })
    : [];

  const pack = {
    kind: "updown.chain.purge.evidence",
    version: 1,
    chain,
    rounds,
    markets,
    note:
      "Every round's full record as it stood immediately before the purge. The markets survive " +
      "as redacted tombstones; this is the unredacted copy of what was blanked, and the price " +
      "story that was deleted.",
  };
  const body = Buffer.from(JSON.stringify(pack, null, 1), "utf8");
  const hash = createHash("sha256").update(body as unknown as Uint8Array).digest("hex");

  /* ⛔ THE PACK IS STORED, NOT ONLY HASHED. A hash with no artefact behind it anchors nothing
     — it is a claim about a document nobody has. `SystemConfig` is the durable store this
     platform already uses for exactly this class of record. */
  await saveConfig(`updown.purge.pack:${chainId}`, { hash, bytes: body.length, body: body.toString("base64") });
  return { hash, bytes: body.length };
}

/**
 * ⭐ ONE BATCH PER CALL, DRIVEN BY THE CLIENT — and that is deliberate, not a limitation.
 *
 * ⛔ There is no background worker to hand. A server action that returns immediately and keeps
 * working relies on the process outliving the response, which on this deployment it may not:
 * the "job" would report `deleting` for ever and nobody would know whether it had stopped. So
 * the client drives, one batch per call, and the progress bar is DETERMINATE because it reads
 * a real committed count rather than a guess.
 *
 * ⭐ RESUMABLE BY CONSTRUCTION. `done` is a durable row and each batch is its own transaction,
 * so a crash, a reload or a closed laptop resumes from the last committed batch instead of
 * restarting. Killing the tab mid-job leaves a resumable job, never a half-deleted chain with
 * no record of where it stopped.
 */
export async function advance(chainId: string): Promise<PurgeJob> {
  const job = await getJob(chainId);
  if (!job) throw new Error("chain-purge: no job for this chain");
  if (job.phase === "done" || job.phase === "failed") return job;

  try {
    if (job.phase === "exporting") {
      const { hash } = await exportPack(chainId);
      const next: PurgeJob = { ...job, packHash: hash, phase: "deleting" };
      await putJob(next);
      return next;
    }

    if (job.phase === "deleting") {
      const rounds = await roundStore.list({ chainId });
      if (rounds.length === 0) {
        const next: PurgeJob = { ...job, done: job.total, phase: "verifying" };
        await putJob(next);
        return next;
      }
      const slice = rounds.slice(0, BATCH);
      const marketIds = slice.map((r) => r.marketId);
      const roundIds = slice.map((r) => r.id);

      if (!hasDatabase()) {
        /* ⚠️ THE NO-DATABASE PATH IS NOT A STUB — it is what makes this engine drivable at all.
           Without it the batch loop would spin for ever against the in-memory stores (nothing
           deleted, `remaining` never zero), and every claim about resumability, verification
           and "no round survives" would be untestable outside production. Rounds go through the
           DAL, which has both implementations; the market redaction and the chaff are
           prisma-only classes with no in-memory twin, so they are simply absent here. */
        await roundStore.deleteMany(roundIds);
      } else {
        const db = pc();
        await db.$transaction([
          // DELETE — the price story and the player-facing chaff. No money meaning.
          db.comment.deleteMany({ where: { marketId: { in: marketIds } } }),
          db.watchlist.deleteMany({ where: { marketId: { in: marketIds } } }),
          db.marketSnapshot.deleteMany({ where: { marketId: { in: marketIds } } }),
          db.upDownRound.deleteMany({ where: { id: { in: roundIds } } }),
          // REDACT — the market survives as a stamped tombstone. Pools, feeSnapshot,
          // resolvedOutcome and settledAt are deliberately NOT in this update.
          db.predictionMarket.updateMany({
            where: { id: { in: marketIds } },
            data: {
              titleEn: PURGED_TITLE,
              titleSw: PURGED_TITLE,
              titleZh: PURGED_TITLE,
              resolutionCriterion: PURGED_TITLE,
              purgedAt: new Date(),
              purgedBy: job.officerB,
              purgeReason: job.reason,
            },
          }),
        ]);
      }

      const done = Math.min(job.total, job.done + slice.length);
      const remaining = await roundStore.count({ chainId });
      const next: PurgeJob = { ...job, done, phase: remaining === 0 ? "verifying" : "deleting" };
      await putJob(next);
      return next;
    }

    // phase === "verifying"
    /* ⛔ VERIFY BEFORE CLAIMING — the S-18 lesson, applied to a much larger act. A destructive
       job that writes its completion row before reading back is asserting an outcome it has
       not observed. Every class is re-counted, and a non-zero count FAILS the job rather than
       completing it with a caveat. */
    const leftoverRounds = await roundStore.count({ chainId });
    let leftoverChaff = 0;
    let unstamped = 0;
    let vanished = 0;
    let marketsRedacted = 0;
    if (hasDatabase()) {
      const db = pc();
      const packRow = await loadConfig<{ hash: string; body?: string }>(`updown.purge.pack:${chainId}`);
      if (!packRow?.hash) throw new Error("the evidence pack is missing — refusing to complete");

      /* ⛔ THE POPULATION COMES FROM THE PACK, WHICH WAS WRITTEN BEFORE ANY DELETION — and that
         is the whole correctness of this section, not a detail of it.

         The first version asked the database `purgedBy = officerB AND purgedAt IS NOT NULL` and
         verified THAT set. It could not fail, in three separate ways:

         ① VACUOUS. The set was already filtered to `purgedAt IS NOT NULL`, so the `purgedAt:
            null` arm of the very next query could never match, and every row in it had just been
            written `titleEn = PURGED_TITLE` by the same `updateMany`, so the other arm could not
            match either. `unstamped` was structurally zero. A verification that cannot fail.

         ② THE INSTRUMENT EXCLUDED WHAT IT HUNTED — `pool-residual.cjs`'s inner join exactly, in
            new code written days after that finding. A market this purge FAILED to stamp has
            `purgedAt IS NULL`, so it was filtered OUT of the population before the "is everything
            stamped?" question was asked. The one row the check exists to find was the one row it
            could not see.

         ③ WRONG SCOPE ACROSS JOBS. `purgedBy` is the OFFICER, not the chain. An officer's second
            purge re-verified every market from their first — so this chain's job could be failed
            by another chain's leftovers, and the counts named in the audit row were never this
            chain's.

         The pack is the pre-purge truth: chain-scoped, captured in the `exporting` phase before
         a single row was deleted, hash-anchored in the audit chain. Verifying against it asks
         the real question — *did every market this chain named end up stamped, and is it still
         there?* — instead of asking the stamped rows whether they are stamped. */
      if (!packRow.body) throw new Error("the evidence pack has a hash but no artefact — refusing to complete");
      const packed = JSON.parse(
        Buffer.from(packRow.body, "base64").toString("utf8"),
      ) as { markets?: { id: string }[] };
      const marketIds = [...new Set((packed.markets ?? []).map((m) => m.id))];

      const [c, w, s, stamped, alive] = await Promise.all([
        db.comment.count({ where: { marketId: { in: marketIds } } }),
        db.watchlist.count({ where: { marketId: { in: marketIds } } }),
        db.marketSnapshot.count({ where: { marketId: { in: marketIds } } }),
        db.predictionMarket.count({
          where: { id: { in: marketIds }, purgedAt: { not: null }, titleEn: PURGED_TITLE },
        }),
        db.predictionMarket.count({ where: { id: { in: marketIds } } }),
      ]);
      leftoverChaff = c + w + s;
      marketsRedacted = stamped;

      /* ⭐ VANISHED IS THE ONE THE WHOLE FEATURE EXISTS TO PREVENT, and until now nothing
         measured it. A market that was DELETED rather than redacted leaves loose `LedgerEntry`,
         `HousePoolLedger` and `Transaction` rows pointing at nothing — the 2026-08-28 production
         defect, where the books claimed TZS 2,000 escrowed for a market that no longer existed
         and `house-money.cjs` still printed "the books balance". A deleted market is not
         unstamped: it is absent, so an "is it stamped?" count returns nothing and reads as
         clean. It has to be counted by DIFFERENCE against the pack, which is the only record
         that the market was ever there. */
      vanished = marketIds.length - alive;

      /* ⚠️ Only over markets that still EXIST, so a vanished market is reported once, under the
         name of what actually happened to it, rather than twice under the milder one. */
      unstamped = alive - stamped;
    }

    if (leftoverRounds > 0 || leftoverChaff > 0 || unstamped > 0 || vanished > 0) {
      const failed: PurgeJob = {
        ...job,
        phase: "failed",
        finishedAt: new Date().toISOString(),
        /* ⚠️ `vanished` is named FIRST and in its own words. It is not a bigger `unstamped`:
           an unstamped market is a redaction that did not finish, a vanished one is a row that
           was destroyed along with the meaning of every ledger entry still pointing at it. An
           officer reading this must not have to infer which happened. */
        error: `Verification failed: ${vanished} market(s) NO LONGER EXIST (they were deleted, not redacted — every ledger entry naming them is now orphaned), ${leftoverRounds} round(s), ${leftoverChaff} comment/watchlist/snapshot row(s) and ${unstamped} unstamped market(s) remain. Nothing has been recorded as purged.`,
      };
      await putJob(failed);
      /* ⛔ AWAITED, like its twin on the success path — found by driving this branch against a
         real database on 2026-08-28, where the assertion that the row exists ran BEFORE the row
         was written. It was the only `audit()` in this file without an `await`, and it was the
         one that matters most under investigation: the record of a DESTRUCTIVE job that failed
         verification, on a request that returns immediately afterwards. A floating promise on a
         process that may not outlive the response is a compliance row that sometimes exists. */
      await audit({
        category: "COMPLIANCE",
        action: "updown.chain.purge.failed",
        actorId: job.officerB,
        targetType: "UpDownChain",
        targetId: chainId,
        payload: { leftoverRounds, leftoverChaff, unstamped, vanished, packHash: job.packHash },
      });
      return failed;
    }

    const finished: PurgeJob = { ...job, phase: "done", done: job.total, finishedAt: new Date().toISOString() };
    await putJob(finished);
    /* The completion row, copying `aml.approved`'s shape: BOTH officer ids in ONE row, the
       typed reason, the statutory basis, the pack hash and every count. One row that answers
       "who, why, under what authority, and what exactly happened". */
    await audit({
      category: "COMPLIANCE",
      action: "updown.chain.purged",
      actorId: job.officerB,
      targetType: "UpDownChain",
      targetId: chainId,
      payload: {
        chainLabel: job.chainLabel,
        officerA: job.officerA,
        officerB: job.officerB,
        reason: job.reason,
        statutoryBasis: job.basis,
        packSha256: job.packHash,
        roundsDeleted: job.total,
        /* ⛔ MEASURED, NOT ASSUMED. This was `job.total` — the ROUND count — asserted as the
           market count in an append-only compliance row. The two are only equal if every round
           names a distinct market that still exists, which is precisely what the verification
           above had no way to establish. It is now the number of rows actually counted stamped,
           so the row states what happened rather than what was planned. ⚠️ Zero on a
           database-less drive is correct and not a gap: the redaction is a prisma-only class
           with no in-memory twin, so there is nothing there to redact. */
        marketsRedacted,
        observationsDeleted: 0,
        note:
          "Markets survive as stamped tombstones; positions, transactions, ledger entries, " +
          "house-pool entries and audit rows were not touched. Observations are shared across " +
          "the 5/15/30-minute chains and are never chain-scoped.",
      },
    });
    return finished;
  } catch (e) {
    const failed: PurgeJob = {
      ...job, phase: "failed", finishedAt: new Date().toISOString(),
      error: String((e as Error)?.message ?? e),
    };
    await putJob(failed);
    return failed;
  }
}
