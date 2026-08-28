/**
 * THE CHAIN PURGE, DRIVEN AGAINST A REAL DATABASE — because the half that matters most had
 * never executed.
 *
 * 🔴 WHY THIS EXISTS. `test:chain-purge` drives the real service, but with no `DATABASE_URL`:
 * `hasDatabase()` is false, so the market redaction, the chaff deletion and the WHOLE
 * verification phase are skipped. Those are prisma-only classes with no in-memory twin. The
 * suite was 51 assertions green over a branch that had never run — and that is exactly where
 * the verification defect of 2026-08-28 lived and shipped:
 *
 *   the verify phase asked the database for `purgedBy = officerB AND purgedAt IS NOT NULL`
 *   and then verified THAT set. It could not fail. The population was pre-filtered to stamped
 *   rows, so "is anything unstamped?" had both arms dead; a market that FAILED to stamp has
 *   `purgedAt NULL` and was excluded before the question was asked; and `purgedBy` names the
 *   OFFICER, not the chain.
 *
 * ⭐ SO §4 IS THE POINT OF THE FILE. It deletes a market behind the engine's back — the exact
 * catastrophe the tombstone design exists to prevent — and asserts the job FAILS. Then it runs
 * the OLD population query over the same rows and shows it returns clean. One drive, both
 * readings, and the difference between them is the finding.
 *
 * ⛔ NEVER PRODUCTION. Refuses any DATABASE_URL that is not a local loopback host, because this
 * script deletes rows and drives a destructive ceremony to completion.
 *
 * Run: npm run qa:chain-purge-verify   (needs a local Postgres; see docs/DATA-RETENTION.md §7.6)
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

const URL_ = process.env.DATABASE_URL ?? "";
const host = URL_.replace(/^.*@/, "").replace(/[:/].*$/, "");
if (!URL_) { console.error("DATABASE_URL is required — this drive needs a real database."); process.exit(2); }
if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
  console.error(`⛔ REFUSING: DATABASE_URL points at "${host}", not a local loopback host.
This drive DELETES rows and runs the purge ceremony to completion. It must never be aimed at production.`);
  process.exit(2);
}

const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient({ datasources: { db: { url: URL_ } } });

const { assetStore, chainStore, roundStore } = await import("../src/lib/server/updown-dal.ts");
const { startJob, advance, PURGED_TITLE } = await import("../src/lib/server/chain-purge.ts");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

const A = "usr_officer_a", B = "usr_officer_b";
const iso = (n: number) => new Date(Date.UTC(2026, 7, 1, 0, n));
const N = 3;

/** A chain, its rounds, their markets, the chaff, and ledger rows that must survive untouched. */
async function seed(chainId: string) {
  // Order matters only in that children go first; there are no FKs on the money tables.
  await db.comment.deleteMany({}); await db.watchlist.deleteMany({});
  await db.marketSnapshot.deleteMany({}); await db.upDownRound.deleteMany({});
  await db.upDownChain.deleteMany({}); await db.upDownAsset.deleteMany({});
  await db.predictionMarket.deleteMany({}); await db.ledgerEntry.deleteMany({});
  await db.systemConfig.deleteMany({}); await db.user.deleteMany({});

  // `Comment.userId` carries a real FK, unlike the money tables — which is the asymmetry the
  // whole tombstone design turns on: the chaff is protected by the database, the books are not.
  await db.user.create({ data: { id: "usr_player", phoneE164: "+255700000001", updatedAt: iso(0) } });

  await assetStore.upsert({
    id: "ast_p", key: "PPP", symbol: "P/USD", nameEn: "P", nameSw: "P", nameZh: null, iconKey: "gold",
    priceSourceUrl: "https://api.twelvedata.com/quote", sourceDomain: "api.twelvedata.com",
    category: "crypto", decimals: 2, minMoveTicks: 2, enabled: true, sortOrder: 0,
    createdBy: "drive", createdAt: iso(0).toISOString(), updatedAt: iso(0).toISOString(),
  } as never);
  await chainStore.upsert({
    id: chainId, assetId: "ast_p", durationMinutes: 5, state: "ARCHIVED", gridAnchorAt: iso(0).toISOString(),
    nextBoundaryAt: null, currentRoundId: null, minStake: null, maxStake: null,
    rateProfile: null, marginBps: null, createdBy: "drive",
    createdAt: iso(0).toISOString(), updatedAt: iso(0).toISOString(),
  } as never);

  for (let i = 0; i < N; i++) {
    const marketId = `mkt_p_${i}`;
    await db.predictionMarket.create({
      data: {
        id: marketId,
        titleEn: `Round ${i + 1} — will P go UP?`,
        titleSw: `Raundi ${i + 1}`,
        titleZh: `第 ${i + 1} 轮`,
        category: "updown",
        sourceUrl: "https://api.twelvedata.com/quote",
        resolutionCriterion: "Close above the open at the boundary.",
        resolutionAt: iso(i + 1),
        proposedBy: "drive",
        status: "RESOLVED",
        resolvedOutcome: "YES",
        settledAt: iso(i + 3),
        yesPool: 1000 + i,
        noPool: 500 + i,
        updatedAt: iso(i),
      },
    });
    await db.comment.create({ data: { id: `cmt_${i}`, marketId, userId: "usr_player", authorName: "Player", body: "hello" } });
    await db.watchlist.create({ data: { id: `wl_${i}`, marketId, userId: "usr_player" } });
    await db.marketSnapshot.create({ data: { id: `snap_${i}`, marketId, yes: 0.5, yesPool: 1000 + i, noPool: 500 + i, volume: 10 } });
    /* ⭐ THE MONEY THAT MUST SURVIVE. Loose strings, no FK — nothing in the database stops a
       market delete from orphaning these, which is the entire argument for the tombstone. */
    await db.ledgerEntry.create({ data: { id: `led_a_${i}`, account: `POOL:${marketId}`, marketId, groupId: `grp_${i}`, amount: 1000, entryType: "STAKE_DEBIT", memo: `drive_${i}` } });
    await db.ledgerEntry.create({ data: { id: `led_b_${i}`, account: "PLAYER:usr_player", marketId, groupId: `grp_${i}`, amount: -1000, entryType: "STAKE_DEBIT", memo: `drive_${i}` } });

    await roundStore.create({
      id: `udr_p_${i}`, chainId, marketId, roundNumber: i + 1,
      opensAt: iso(i).toISOString(), closesAt: iso(i + 1).toISOString(), boundaryAt: iso(i + 1).toISOString(),
      openObservationId: null, closeObservationId: null, openPrice: null, closePrice: null,
      marginBps: null, upTarget: null, downTarget: null,
      capturedSourceUrl: null, capturedSourceDomain: null,
      outcome: "UP", voidReason: null,
      resolvedAt: iso(i + 2).toISOString(), settledAt: iso(i + 3).toISOString(),
      createdAt: iso(i).toISOString(), updatedAt: iso(i).toISOString(),
    } as never);
  }
}

/** Drive to a terminal phase. Returns the final job. */
async function run(chainId: string, onBeforeVerify?: () => Promise<void>) {
  await startJob({ chainId, chainLabel: "PPP 5m", officerA: A, officerB: B, reason: "pilot chain retired", basis: "POCA Cap 423 §16" });
  let j = await advance(chainId); // exporting → deleting
  let guard = 0;
  while (j.phase === "deleting" && guard++ < 50) j = await advance(chainId);
  if (onBeforeVerify) await onBeforeVerify();
  guard = 0;
  while (j.phase !== "done" && j.phase !== "failed" && guard++ < 50) j = await advance(chainId);
  return j;
}

console.log(`Chain purge — DRIVEN against ${host}\n`);

// ── 1 · THE HAPPY PATH, and what it left behind ──────────────────────────────
{
  await seed("chn_ok");
  const j = await run("chn_ok");
  ok("1: the job completes", j.phase === "done", `${j.phase}${j.error ? `: ${j.error}` : ""}`);

  const markets = await db.predictionMarket.findMany({ where: { id: { startsWith: "mkt_p_" } }, orderBy: { id: "asc" } });
  ok("1: 🔴 every market SURVIVES — redacted, never deleted", markets.length === N, `${markets.length}/${N}`);
  ok("1: ⭐ …every one is stamped", markets.every((m) => m.purgedAt !== null && m.purgedBy === B && m.purgeReason === "pilot chain retired"));
  ok("1: …titles blanked to the named sentinel", markets.every((m) => m.titleEn === PURGED_TITLE && m.titleSw === PURGED_TITLE && m.titleZh === PURGED_TITLE));
  ok("1: 🔴 …and the MONEY columns are untouched",
     markets.every((m, i) => Number(m.yesPool) === 1000 + i && Number(m.noPool) === 500 + i && m.resolvedOutcome === "YES" && m.settledAt !== null),
     "pools, outcome and settledAt are what keep the trial balance true");

  const [rounds, comments, watch, snaps, ledger] = await Promise.all([
    db.upDownRound.count(), db.comment.count(), db.watchlist.count(), db.marketSnapshot.count(), db.ledgerEntry.count(),
  ]);
  ok("1: the price story is gone", rounds === 0, String(rounds));
  ok("1: the chaff is gone", comments === 0 && watch === 0 && snaps === 0, `c=${comments} w=${watch} s=${snaps}`);
  ok("1: 🔴 every ledger entry SURVIVES", ledger === N * 2, `${ledger}/${N * 2}`);

  /* ⭐ AND THE POOL ACCOUNTS STILL NAME A MARKET THAT EXISTS — `ops:pool-orphans`' question,
     asked of the purge itself. This is the check the whole redact-don't-destroy design exists
     to keep answerable, so it is asserted here rather than left to a separate ops run. */
  const orphans = await db.$queryRawUnsafe<{ account: string }[]>(`
    select le.account from "LedgerEntry" le
    left join "PredictionMarket" m on ('POOL:' || m.id) = le.account
    where le.account like 'POOL:%' and m.id is null group by le.account`);
  ok("1: ⭐ NO orphaned POOL account — every one still names a market that exists", orphans.length === 0,
     orphans.map((o) => o.account).join(", ") || "none");
}

// ── 2 · THE COMPLETION AUDIT ROW states a MEASURED number ────────────────────
{
  const row = await db.auditLog.findFirst({ where: { action: "updown.chain.purged" }, orderBy: { createdAt: "desc" } });
  ok("2: the completion row was written", !!row, row?.action ?? "none");
  const payload = (row?.payload ?? {}) as Record<string, unknown>;
  ok("2: ⛔ marketsRedacted is the MEASURED count, not the round count",
     payload.marketsRedacted === N, `marketsRedacted=${String(payload.marketsRedacted)} rounds=${String(payload.roundsDeleted)}`);
  ok("2: …and both officers, the reason and the pack hash are on the one row",
     payload.officerA === A && payload.officerB === B && typeof payload.packSha256 === "string" && (payload.packSha256 as string).length === 64);
}

// ── 3 · NEGATIVE CONTROL — the assertions above must be able to FAIL ─────────
/**
 * ⛔ §1 would pass identically if the purge had done nothing at all to a chain with no chaff.
 * This proves the seed really put the rows there, so "the chaff is gone" is a measurement of a
 * deletion rather than of an empty table.
 */
{
  await seed("chn_ctl");
  const [c, w, s, m, r] = await Promise.all([
    db.comment.count(), db.watchlist.count(), db.marketSnapshot.count(),
    db.predictionMarket.count(), db.upDownRound.count(),
  ]);
  ok("3: ⭐ CONTROL — the seed really creates the rows §1 claims were deleted",
     c === N && w === N && s === N && m === N && r === N, `c=${c} w=${w} s=${s} markets=${m} rounds=${r}`);
  const before = await db.predictionMarket.findMany({ where: { purgedAt: { not: null } } });
  ok("3: ⭐ CONTROL — nothing is stamped before the purge runs", before.length === 0, String(before.length));
}

// ── 4 · THE DEFECT ITSELF — a market DELETED behind the engine's back ────────
/**
 * 🔴 THE CASE THE OLD VERIFICATION COULD NOT SEE, AND THE REASON THIS FILE EXISTS.
 *
 * A market is deleted between the last delete batch and the verify phase — modelling the
 * 2026-08-28 production defect, where a teardown deleted markets and left `STAKE_DEBIT` pairs
 * standing against rows that no longer existed while `house-money.cjs` printed "the books
 * balance".
 *
 * ⭐ AND THE SECOND HALF IS THE PART TO READ. After asserting the job now FAILS, the OLD
 * population query is run over the very same rows and shown to come back CLEAN. The old code
 * would have completed this job and written `updown.chain.purged`.
 */
{
  await seed("chn_gone");
  /* ⚠️ A DELTA, NOT A TOTAL — the lesson this repo already paid for. `AuditLog` is append-only
     and deliberately NOT cleared by `seed()`, so a second run of this drive doubles every count.
     The first version asserted `=== 1` and went red on its own second run, for a reason that had
     nothing to do with the product. */
  const failedRowsBefore = await db.auditLog.count({ where: { action: "updown.chain.purge.failed", targetId: "chn_gone" } });
  const j = await run("chn_gone", async () => {
    await db.ledgerEntry.deleteMany({ where: { id: "led_never" } }); // no-op; keeps the money rows in place
    await db.predictionMarket.delete({ where: { id: "mkt_p_1" } });
  });

  ok("4: 🔴 the job FAILS when a market was destroyed rather than redacted", j.phase === "failed", j.phase);
  ok("4: …and says so in the officer's own words", /NO LONGER EXIST/.test(j.error ?? ""), j.error ?? "no error");
  ok("4: …and counts exactly one", /^Verification failed: 1 market\(s\) NO LONGER EXIST/.test(j.error ?? ""), j.error ?? "");
  ok("4: ⛔ …and NOTHING is recorded as purged",
     (await db.auditLog.count({ where: { action: "updown.chain.purged", targetId: "chn_gone" } })) === 0);
  /* ⭐ AND IT MUST BE THERE BY NOW, not eventually. This assertion is what found the failure
     audit row being written WITHOUT `await` — the only un-awaited audit() in the file, and the
     one that matters most under investigation. It printed after this check, on a request that
     returns immediately afterwards. */
  ok("4: …a failure row is written instead, and it is AWAITED rather than floating",
     (await db.auditLog.count({ where: { action: "updown.chain.purge.failed", targetId: "chn_gone" } })) === failedRowsBefore + 1,
     `+${(await db.auditLog.count({ where: { action: "updown.chain.purge.failed", targetId: "chn_gone" } })) - failedRowsBefore}`);

  /* ⭐ THE OLD READING, over the identical rows. */
  const oldPopulation = await db.predictionMarket.findMany({
    where: { purgedBy: B, purgedAt: { not: null } }, select: { id: true },
  });
  const oldUnstamped = await db.predictionMarket.count({
    where: { id: { in: oldPopulation.map((m) => m.id) }, OR: [{ purgedAt: null }, { titleEn: { not: PURGED_TITLE } }] },
  });
  ok("4: 🔴 PROOF — the OLD officer-scoped query reports the destroyed market as CLEAN",
     oldUnstamped === 0 && oldPopulation.length === N - 1,
     `old unstamped=${oldUnstamped} over a population of ${oldPopulation.length} (the deleted market is simply absent)`);

  /* ⛔ AND THE MONEY IS NOW ORPHANED, which is what the failure is protecting. */
  const orphans = await db.$queryRawUnsafe<{ account: string }[]>(`
    select le.account from "LedgerEntry" le
    left join "PredictionMarket" m on ('POOL:' || m.id) = le.account
    where le.account like 'POOL:%' and m.id is null group by le.account`);
  ok("4: ⛔ …and this is what it costs: an orphaned POOL account, exactly the production defect",
     orphans.length === 1 && orphans[0].account === "POOL:mkt_p_1", orphans.map((o) => o.account).join(", ") || "none");
}

// ── 5 · A MARKET LEFT UNSTAMPED is caught too, and named differently ─────────
/**
 * ⛔ The other half of the old defect: a market that EXISTS but did not get stamped. Under the
 * old population it was filtered out by `purgedAt IS NOT NULL` before the question was asked —
 * the instrument excluding precisely what it hunts, `pool-residual.cjs`'s inner join again.
 */
{
  await seed("chn_unstamped");
  const j = await run("chn_unstamped", async () => {
    await db.predictionMarket.update({
      where: { id: "mkt_p_2" },
      data: { purgedAt: null, purgedBy: null, purgeReason: null, titleEn: "Round 3 — will P go UP?" },
    });
  });
  ok("5: 🔴 the job FAILS on a market that exists but was not stamped", j.phase === "failed", j.phase);
  ok("5: …and reports it as UNSTAMPED, not as vanished",
     /0 market\(s\) NO LONGER EXIST/.test(j.error ?? "") && /1 unstamped market\(s\)/.test(j.error ?? ""), j.error ?? "");

  const oldPopulation = await db.predictionMarket.findMany({ where: { purgedBy: B, purgedAt: { not: null } }, select: { id: true } });
  const oldUnstamped = await db.predictionMarket.count({
    where: { id: { in: oldPopulation.map((m) => m.id) }, OR: [{ purgedAt: null }, { titleEn: { not: PURGED_TITLE } }] },
  });
  ok("5: 🔴 PROOF — the OLD query reports the unstamped market as CLEAN too", oldUnstamped === 0,
     `old unstamped=${oldUnstamped} — it was filtered out of its own population`);
}

await db.$disconnect();
console.log(`\nchain-purge-drive: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
