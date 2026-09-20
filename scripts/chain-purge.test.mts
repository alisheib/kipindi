/**
 * PURGING A CHAIN MUST NOT BE ABLE TO BREAK THE BOOKS.
 *
 * The chain purge is the heaviest destructive control on the platform, so almost everything
 * here is about what it must NOT do. The design decision it enforces — REDACT, DON'T DESTROY —
 * is not a preference: it is the only shape in which every hazard dissolves by construction.
 *
 * 🔴 THE ARGUMENT, MEASURED ON PRODUCTION 2026-08-28. A teardown deleted markets and left two
 * `STAKE_DEBIT` ledger pairs standing, so the books claimed TZS 2,000 escrowed for a market
 * that no longer existed — and `house-money.cjs` still printed "the books balance", because
 * both halves of each pair were present and the grand total was still zero. A market delete at
 * the scale of a whole chain manufactures that thousands of times over WITH EVERY MONEY SUITE
 * GREEN. "The books balance" says every entry has a counterpart; it does not say every account
 * means something.
 *
 * ⛔ SO THE ASSERTIONS ARE MOSTLY NEGATIVE, AND DRIVEN. A source scan for "does it call
 * deleteMany on PredictionMarket" proves nothing about what the job actually leaves behind.
 * Every case below runs the REAL service against the real in-memory stores and then counts what
 * survived.
 *
 * Run: npm run test:chain-purge
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const { assetStore, chainStore, roundStore, __resetUpDownMemoryStores } =
  await import("../src/lib/server/updown-dal.ts");
const { checkPreconditions, computeCost, startJob, advance, getJob, PURGED_TITLE } =
  await import("../src/lib/server/chain-purge.ts");

const OFFICER_A = "usr_officer_a";
const OFFICER_B = "usr_officer_b";
const iso = (n: number) => new Date(Date.UTC(2026, 7, 1, 0, n)).toISOString();

/** A chain with `rounds` settled rounds, in `state`. */
async function seed(rounds: number, state = "ARCHIVED", opts: { unsettled?: number } = {}) {
  __resetUpDownMemoryStores();
  await assetStore.upsert({
    id: "ast_p", key: "PPP", symbol: "P/USD", nameEn: "P", nameSw: "P", nameZh: null, iconKey: "gold",
    priceSourceUrl: "https://api.twelvedata.com/quote", sourceDomain: "api.twelvedata.com",
    category: "crypto", decimals: 2, minMoveTicks: 2, enabled: true, sortOrder: 0,
    createdBy: "test", createdAt: iso(0), updatedAt: iso(0),
  } as never);
  await chainStore.upsert({
    id: "chn_p", assetId: "ast_p", durationMinutes: 5, state, gridAnchorAt: iso(0),
    nextBoundaryAt: null, currentRoundId: null, minStake: null, maxStake: null,
    rateProfile: null, marginBps: null, createdBy: "test", createdAt: iso(0), updatedAt: iso(0),
  } as never);
  for (let i = 0; i < rounds; i++) {
    const open = i >= rounds - (opts.unsettled ?? 0);
    await roundStore.create({
      id: `udr_p_${i}`, chainId: "chn_p", marketId: `mkt_p_${i}`, roundNumber: i + 1,
      opensAt: iso(i), closesAt: iso(i + 1), boundaryAt: iso(i + 1),
      openObservationId: null, closeObservationId: null, openPrice: null, closePrice: null,
      marginBps: null, upTarget: null, downTarget: null,
      capturedSourceUrl: null, capturedSourceDomain: null,
      outcome: open ? null : "UP", voidReason: null,
      resolvedAt: open ? null : iso(i + 2), settledAt: open ? null : iso(i + 3),
      createdAt: iso(i), updatedAt: iso(i),
    } as never);
  }
}

console.log("Chain purge\n");

// ── 1 · THE REFUSALS — each names its own reason ─────────────────────────────
{
  await seed(3, "STOPPED");
  const r1 = await checkPreconditions("chn_p");
  ok("1: 🔴 a chain that is not ARCHIVED is refused", !r1.ok && /not ARCHIVED/i.test(r1.error),
     r1.ok ? "(allowed)" : r1.error);
  ok("1: …and the refusal names the remedy, not just the rule",
     !r1.ok && /[Aa]rchive it first/.test(r1.error), r1.ok ? "" : r1.error);

  await seed(3, "ARCHIVED", { unsettled: 1 });
  const r2 = await checkPreconditions("chn_p");
  ok("1: 🔴 a chain with money still in flight is refused",
     !r2.ok && /unresolved or unsettled/i.test(r2.error), r2.ok ? "(allowed)" : r2.error);
  ok("1: …and it states the COUNT, so the officer knows what is in the way",
     !r2.ok && /1 of 3/.test(r2.error), r2.ok ? "" : r2.error);

  const r3 = await checkPreconditions("chn_missing");
  ok("1: an unknown chain is refused", !r3.ok);

  // ⭐ POSITIVE CONTROL — without this, a precondition that refused EVERYTHING would pass
  // every assertion above and the control would silently not exist.
  await seed(3, "ARCHIVED");
  const r4 = await checkPreconditions("chn_p");
  ok("1: ⭐ CONTROL — a settled, archived chain IS allowed", r4.ok, r4.ok ? "" : r4.error);
}

// ── 2 · THE COST PANEL — real counts, and the zero that is stated ────────────
{
  await seed(4, "ARCHIVED");
  const cost = await computeCost("chn_p");
  ok("2: the cost panel counts the real rounds", cost.rounds === 4, String(cost.rounds));
  ok("2: …and names the chain the officer is about to purge", cost.chainLabel === "PPP 5m", cost.chainLabel);
  ok("2: …and reports the date range first → last", !!cost.firstAt && !!cost.lastAt);

  /* ⭐ OBSERVATIONS ARE STATED AS ZERO, WITH THE REASON — not omitted. `UpDownObservation` has
     no FK to a round or chain: it is keyed `@@unique([assetId, boundaryAt])` and DELIBERATELY
     SHARED by the 5/15/30-minute chains on one asset. Deleting the readings this chain used
     would steal the readings the other durations still need, and re-observing a confirmed
     boundary is forbidden. A panel that simply did not mention observations would leave the
     officer to assume either answer. */
  ok("2: 🔴 observations deleted is ZERO", cost.observations === 0);
  ok("2: …and the panel SAYS SO, with the reason",
     /shared/i.test(cost.observationsNote) && /never chain-scoped/i.test(cost.observationsNote),
     cost.observationsNote);
}

// ── 3 · THE JOB — export first, then delete, then verify ─────────────────────
{
  await seed(3, "ARCHIVED");
  const job0 = await startJob({
    chainId: "chn_p", chainLabel: "PPP 5m", officerA: OFFICER_A, officerB: OFFICER_B,
    reason: "pilot chain retired", basis: "POCA Cap 423 §16",
  });
  ok("3: a new job starts in the EXPORTING phase, before anything is deleted",
     job0.phase === "exporting" && job0.done === 0, `${job0.phase}/${job0.done}`);
  ok("3: …and knows how much work it has", job0.total === 3, String(job0.total));

  /* ⛔ EXPORT BEFORE DESTROY. The rounds must still be there when the pack is written, or the
     pack is a record of nothing. Asserted by driving one phase and counting. */
  const j1 = await advance("chn_p");
  ok("3: 🔴 the evidence pack is written BEFORE any deletion", (await roundStore.count({ chainId: "chn_p" })) === 3);
  ok("3: …and its sha256 is recorded on the job", !!j1.packHash && j1.packHash.length === 64, j1.packHash ?? "none");
  ok("3: …and only then does it move to deleting", j1.phase === "deleting", j1.phase);

  let guard = 0;
  let j = j1;
  while (j.phase !== "done" && j.phase !== "failed" && guard++ < 20) j = await advance("chn_p");
  ok("3: the job reaches done", j.phase === "done", `${j.phase}${j.error ? `: ${j.error}` : ""}`);
  ok("3: 🔴 every round is gone", (await roundStore.count({ chainId: "chn_p" })) === 0);
  ok("3: …and the job's progress equals its total", j.done === j.total, `${j.done}/${j.total}`);

  const persisted = await getJob("chn_p");
  ok("3: ⭐ the job is DURABLE — progress survives as a row, so a crash resumes",
     !!persisted && persisted.phase === "done");
}

// ── 4 · RESUMABILITY — a killed job continues, it does not restart ───────────
/**
 * ⭐ THE PROPERTY THAT MAKES THIS SAFE TO RUN AT ALL. `done` is a durable row and each batch is
 * its own transaction, so closing the tab pauses the job rather than corrupting it. Asserted by
 * advancing partway, re-reading the job from the store as a fresh caller would, and continuing.
 */
{
  await seed(2, "ARCHIVED");
  await startJob({
    chainId: "chn_p", chainLabel: "PPP 5m", officerA: OFFICER_A, officerB: OFFICER_B,
    reason: "resume test", basis: "POCA Cap 423 §16",
  });
  await advance("chn_p"); // exporting → deleting

  const midway = await getJob("chn_p");
  ok("4: a partially-run job is readable from the store", !!midway && midway.phase === "deleting");

  let j = midway!;
  let guard = 0;
  while (j.phase !== "done" && j.phase !== "failed" && guard++ < 20) j = await advance("chn_p");
  ok("4: ⭐ it resumes to done rather than restarting", j.phase === "done", j.phase);
  ok("4: …and does not double-count its own progress", j.done === j.total, `${j.done}/${j.total}`);
}

// ── 5 · WHAT THE SOURCE MUST NEVER DO ───────────────────────────────────────
/**
 * ⛔ THE ONLY SOURCE-READ SECTION, and it is here because these are ABSENCES. "It never deletes
 * a Position" cannot be driven on a fixture that has no positions, and the in-memory stores do
 * not model the money tables at all — so the honest instrument is to read the one module that
 * would have to contain such a call. Every name is checked individually rather than as one
 * regex, so a failure says WHICH protected class was touched.
 */
{
  const src = decomment(readFileSync(join(ROOT, "src/lib/server/chain-purge.ts"), "utf8"));

  for (const model of ["position", "transaction", "ledgerEntry", "housePoolLedger", "auditLog", "upDownObservation"]) {
    ok(`5: 🔴 the purge never deletes a ${model}`,
       !new RegExp(`${model}\\.delete`, "i").test(src),
       "this class is the statutory record — it is never destroyed");
  }
  ok("5: ⛔ …and never calls an UNSCOPED deleteMany({})",
     !/deleteMany\(\s*\{\s*\}\s*\)/.test(src),
     /* ⚠️ The reset script is named in this COMMENT and not in the message string above it.
        `test:orphans` reads raw source for filenames and counts one as a REFERENCE, so naming
        `ops-updown-reset-games.mts` in a string literal marked a declared-orphan script as
        reachable — the E-136 shape the scanner already fixed for comments, arriving through a
        string instead. Nothing here runs that file. */
     "the Up & Down reset script's unscoped delete is what steals the shared observations");
  ok("5: 🔴 the market is REDACTED, never deleted",
     !/predictionMarket\.delete/i.test(src) && /predictionMarket\.updateMany/.test(src));

  /* ⭐ AND THE MONEY COLUMNS ARE NOT IN THE REDACTION. A tombstone that blanked its own pools
     would balance the books to a different number — the exact thing the whole design exists to
     avoid. The update writes titles and the stamp, and nothing else. */
  const update = src.match(/predictionMarket\.updateMany\(\{[\s\S]*?\}\)/)?.[0] ?? "";
  ok("5: the redaction was located in the source", update.length > 50);
  for (const col of ["yesPool", "noPool", "feeSnapshot", "resolvedOutcome", "settledAt"]) {
    ok(`5: 🔴 …and it does NOT write ${col}`, !update.includes(col),
       "pools, fees and outcomes are what keep the trial balance true");
  }
  ok("5: ⭐ …and it DOES stamp the tombstone", /purgedAt/.test(update) && /purgedBy/.test(update));

  /* A named sentinel, not "" or null — redacted must be distinguishable from never-existed,
     exactly as the retention engine's AIPOLL_PAYLOAD_PRUNED is. */
  ok("5: the blanked title is a NAMED sentinel that says where to read about it",
     PURGED_TITLE.length > 10 && /DATA-RETENTION/.test(PURGED_TITLE), PURGED_TITLE);
}

// ── 6 · THE CEREMONY — two officers, and the gate that must not pass ─────────
/**
 * ⛔ THE FAILURE MODE THIS SECTION EXISTS FOR. `twoOfficerGate` returns null — PASSES — when
 * `makerId` is absent, because for its other callers a missing maker means "no conflict". For a
 * ceremony that REQUIRES two officers that reading is exactly backwards: no maker means the
 * ceremony never started. Combined with `saveConfig`, which never throws, a silently-dropped
 * stage-1 write would not fail closed — it would make ONE OFFICER SUFFICIENT.
 */
{
  const actions = decomment(readFileSync(join(ROOT, "src/app/admin/retention/purge-actions.ts"), "utf8"));
  ok("6: 🔴 stage 2 REFUSES when there is no first signature, rather than treating it as no conflict",
     /if \(!stage1\)/.test(actions) && /has not been started/.test(actions));
  ok("6: …and the maker is asserted BEFORE twoOfficerGate is consulted",
     actions.indexOf("if (!stage1)") < actions.indexOf("twoOfficerGate("));
  ok("6: the ceremony is wrapped in withLock, so two officers cannot both pass the stage check",
     /withLock\(`updown-purge:/.test(actions));
  ok("6: the typed word is the CHAIN'S OWN LABEL, not a generic DELETE",
     /typed\.toUpperCase\(\) !== label\.toUpperCase\(\)/.test(actions));
  ok("6: ⛔ there is NO override flag anywhere in the ceremony",
     !/override/i.test(actions),
     "a feature with no override has no override to abuse — §B2.4");

  const store = decomment(readFileSync(join(ROOT, "src/app/admin/retention/purge-stage1-store.ts"), "utf8"));
  /* ⛔ SCOPED TO `setFirstSignature`, NOT THE WHOLE FILE. The first draft tested the file for a
     `loadConfig` call — and `getFirstSignature` contains one, so removing the read-back from
     the WRITE path left the assertion passing on the READ path's evidence. The red harness
     caught it. A check for "does this file mention X" cannot police where X is. */
  const setFn = store.slice(store.indexOf("export async function setFirstSignature"));
  const setBody = setFn.slice(0, setFn.indexOf("export async function clearFirstSignature"));
  ok("6: 🔴 the stage-1 write is READ BACK — saveConfig never throws",
     /loadConfig<PurgeStage1>/.test(setBody) && /return false/.test(setBody),
     "the read-back must be in setFirstSignature, not merely somewhere in the file");
  ok("6: the first signature EXPIRES, so a stale one cannot hold a gate half-open",
     /STAGE1_TTL_MS/.test(store));
  ok("6: …and an unparseable timestamp is treated as EXPIRED, not valid for ever",
     /Number\.isFinite\(at\)/.test(store));
  ok("6: it can be CLEARED — the AML original it copies never removes its row",
     /export async function clearFirstSignature/.test(store));
}

// ── 7 · THE HOST SURFACE — a compliance control on a compliance route ────────
{
  const updown = decomment(readFileSync(join(ROOT, "src/app/admin/updown/page.tsx"), "utf8"));
  ok("7: ⛔ /admin/updown carries a LINK, not the control",
     /\/admin\/retention/.test(updown) && !/purgeStage2Action/.test(updown),
     "a compliance control on a trading route is Owner-only in practice — E-18/E-23");

  const roles = readFileSync(join(ROOT, "src/lib/server/roles.ts"), "utf8");
  ok("7: /admin/retention is a compliance route", /\["\/admin\/retention", "compliance"\]/.test(roles));
  ok("7: …and /admin/updown is a trading one, which is why the control is not there",
     /\["\/admin\/updown", "trading"\]/.test(roles));
}

// ── 8 · THE VERIFICATION'S POPULATION — what it asks, and of whom ────────────
/**
 * 🔴 THE DEFECT THIS SECTION EXISTS FOR, found 2026-08-28 while confirming the migration had
 * landed on production. The verify phase asked the database for `purgedBy = officerB AND
 * purgedAt IS NOT NULL` and verified THAT set — and so could not fail in three ways at once:
 *
 *   ① VACUOUS. The population was pre-filtered to `purgedAt IS NOT NULL`, so the follow-up
 *      "is anything unstamped?" query — whose arms were `purgedAt IS NULL` OR a non-sentinel
 *      title — could match nothing. Both arms were dead against that set. `unstamped` was
 *      structurally zero, always, on every run.
 *
 *   ② THE INSTRUMENT EXCLUDED WHAT IT HUNTED. A market the purge failed to stamp has
 *      `purgedAt IS NULL`, so it was filtered out of the population BEFORE the question was
 *      asked. This is `pool-residual.cjs`'s inner join exactly — the shape this very feature
 *      was designed around — reproduced in new code days later.
 *
 *   ③ WRONG SCOPE. `purgedBy` names the OFFICER, not the chain, so an officer's second purge
 *      re-verified every market from their first.
 *
 * ⚠️ SOURCE-LEVEL, AND STATED RATHER THAN GLOSSED. This suite drives the real stores with no
 * DATABASE_URL, so `hasDatabase()` is false and the verification block never executes here —
 * the redaction and the chaff are prisma-only classes with no in-memory twin. These assertions
 * read the source, exactly as §5 does, and the drive that exercises the block for real is
 * `qa:chain-purge-verify` against a database.
 */
{
  const src = decomment(readFileSync(join(ROOT, "src/lib/server/chain-purge.ts"), "utf8"));
  const verify = src.slice(src.indexOf("const leftoverRounds"), src.indexOf("const finished:"));
  ok("8: the verifying block was located in the source", verify.length > 200, String(verify.length));

  ok("8: 🔴 the verification population is NOT scoped by the OFFICER",
     !/purgedBy:\s*job\.officerB/.test(verify),
     "purgedBy names the officer, not the chain — a second purge re-verifies the first one's markets");
  ok("8: 🔴 …and it is NOT pre-filtered to rows that are already stamped",
     !/purgedAt:\s*\{\s*not:\s*null\s*\}[\s\S]{0,80}select:\s*\{\s*id:\s*true/.test(verify),
     "a market that failed to stamp has purgedAt NULL, so pre-filtering hides exactly what is hunted");
  ok("8: ⭐ the population comes from the EVIDENCE PACK, written before any deletion",
     /packRow\.body/.test(verify) && /packed\.markets/.test(verify),
     "the pack is the pre-purge truth: chain-scoped, captured in the exporting phase, hash-anchored");
  ok("8: …and a pack with a hash but no artefact REFUSES rather than verifying nothing",
     /hash but no artefact/.test(verify),
     "an empty market list would make every count below trivially zero");
  ok("8: …and the ids are de-duplicated, because many rounds can name one market",
     /new Set\(/.test(verify));

  /* ⭐ VANISHED — the class the whole tombstone design exists to prevent, and which nothing
     measured until now. A DELETED market is not an unstamped one: it is absent, so any
     "is it stamped?" count returns nothing and reads as clean. Only a difference against the
     pack can see it. */
  ok("8: ⭐ a market that VANISHED is counted, by difference against the pack",
     /vanished\s*=\s*marketIds\.length\s*-\s*alive/.test(verify),
     "a deleted market is absent from every count that asks the surviving rows about themselves");
  ok("8: 🔴 …and it FAILS the job", /vanished\s*>\s*0/.test(verify));
  ok("8: …and it is named in the officer-facing error in its own words",
     /NO LONGER EXIST/.test(verify),
     "an officer must not have to infer that 'unstamped' meant 'destroyed'");
  ok("8: …and it is carried on the failure audit row", /payload:\s*\{[^}]*vanished/.test(verify));
  ok("8: ⚠️ unstamped counts only markets that still EXIST, so a vanished one is reported once",
     /unstamped\s*=\s*alive\s*-\s*stamped/.test(verify));

  /* ⛔ AND THE COMPLETION ROW STATES A MEASURED NUMBER. `marketsRedacted: job.total` asserted
     the ROUND count as the market count in an append-only compliance record. */
  const done = src.slice(src.indexOf("const finished:"));
  ok("8: ⛔ the completion audit row does NOT report the round count as the market count",
     !/marketsRedacted:\s*job\.total/.test(done),
     "rounds and markets are only equal if every round names a distinct market that still exists");
  ok("8: ⭐ …it reports the number actually counted stamped",
     /marketsRedacted,/.test(done) && /marketsRedacted\s*=\s*stamped/.test(verify));
}

// ── 9 · THE NEVER LIST, AS A GUARD RATHER THAN A PARAGRAPH ──────────────────
/**
 * 🔴 WHAT WAS THERE, AND WHY §5 ABOVE WAS NOT ENOUGH. `chain-purge.ts`'s docblock named fourteen
 * tables under NEVER, eight of them the house tables (04 A20). `grep -c "HouseBot"` on that file
 * returned **1** — the comment itself. §5 is the only thing that ever bit, and it is a source scan
 * over a HAND-WRITTEN array of six names; the eight house tables were in the prose, in the
 * register, and in nothing that could fail.
 *
 * ⛔ AND ADDING EIGHT STRINGS TO §5 WOULD HAVE BEEN THE WEAKER FIX — it closes today's gap and
 * hands tomorrow's to the ninth house table. So the population is DERIVED and the refusal is a
 * PROXY, and this section DRIVES it: every assertion here calls the real guard and reads what it
 * did, rather than reading the source and inferring.
 */
{
  const {
    guardProtectedModels, isProtectedModel, MUTATING_METHODS, RAW_METHODS, PurgeProtectedTableError,
  } = await import("../src/lib/server/purge-protected.ts");

  /** A client-shaped fake: every delegate records its calls, so "it was allowed" is measurable. */
  const calls: string[] = [];
  const delegate = (name: string) => new Proxy({}, {
    get: (_t, m: string) => (...a: unknown[]) => { calls.push(`${name}.${m}`); return { ok: true, args: a }; },
  });
  const rawClient = {
    // protected
    position: delegate("position"), transaction: delegate("transaction"),
    ledgerEntry: delegate("ledgerEntry"), housePoolLedger: delegate("housePoolLedger"),
    auditLog: delegate("auditLog"), upDownObservation: delegate("upDownObservation"),
    houseBot: delegate("houseBot"), houseBotControl: delegate("houseBotControl"),
    houseBotRuntime: delegate("houseBotRuntime"), houseBotAlertOnce: delegate("houseBotAlertOnce"),
    houseBotEvent: delegate("houseBotEvent"), houseBotIntent: delegate("houseBotIntent"),
    houseBotTarget: delegate("houseBotTarget"), houseBotPress: delegate("houseBotPress"),
    // the purge's own targets
    comment: delegate("comment"), watchlist: delegate("watchlist"),
    marketSnapshot: delegate("marketSnapshot"), upDownRound: delegate("upDownRound"),
    predictionMarket: delegate("predictionMarket"), objection: delegate("objection"),
    $executeRaw: () => { calls.push("$executeRaw"); return 1; },
    $executeRawUnsafe: () => { calls.push("$executeRawUnsafe"); return 1; },
    $queryRaw: () => { calls.push("$queryRaw"); return []; },
    $queryRawUnsafe: () => { calls.push("$queryRawUnsafe"); return []; },
    $runCommandRaw: () => { calls.push("$runCommandRaw"); return {}; },
    $transaction: (arg: unknown) => (typeof arg === "function" ? (arg as (tx: unknown) => unknown)(rawClient) : arg),
  };
  const guarded = guardProtectedModels(rawClient);
  const threw = (fn: () => unknown): boolean => {
    try { fn(); return false; } catch (e) { return e instanceof PurgeProtectedTableError; }
  };

  /* ⭐ EVERY PROTECTED MODEL, EVERY MUTATING METHOD, ONE ASSERTION EACH — so a failure says WHICH
     table and WHICH verb got through, exactly as §5 names its classes individually. */
  const PROTECTED = [
    "position", "transaction", "ledgerEntry", "housePoolLedger", "auditLog", "upDownObservation",
    "houseBot", "houseBotControl", "houseBotRuntime", "houseBotAlertOnce",
    "houseBotEvent", "houseBotIntent", "houseBotTarget", "houseBotPress",
  ];
  for (const model of PROTECTED) {
    const missed = MUTATING_METHODS.filter(
      (m) => !threw(() => ((guarded as Record<string, Record<string, (a: unknown) => unknown>>)[model][m])({})),
    );
    ok(`9: 🔴 the purge CANNOT write ${model} — every mutating method is refused`,
       missed.length === 0, missed.length ? `got through: ${missed.join(", ")}` : `${MUTATING_METHODS.length} methods refused`);
  }
  ok("9: …and the refusal is typed and names the model and the verb",
     (() => { try { (guarded as never as { houseBotIntent: { deleteMany: (a: unknown) => unknown } }).houseBotIntent.deleteMany({}); return false; }
              catch (e) { return e instanceof PurgeProtectedTableError && /HouseBotIntent\.deleteMany/.test(String((e as Error).message)); } })());

  /* ⭐ READS ARE ALLOWED, AND THAT IS A DECISION. A purge is entitled to COUNT the statutory
     record it must not touch — the cost panel does exactly that with positions and ledger rows,
     and the live-intent precondition counts intents. A guard that refused reads would have made
     the cost panel unbuildable and been quietly deleted. */
  calls.length = 0;
  const readBack = (guarded as never as { ledgerEntry: { count: (a: unknown) => unknown } }).ledgerEntry.count({});
  ok("9: ⭐ …but READS pass through untouched — the cost panel counts what it may not delete",
     calls.includes("ledgerEntry.count") && !!readBack);

  /* ⭐ THE POSITIVE CONTROL, and it is the one that would have broken the product silently. The
     purge's own five writes MUST still work: a guard that refused `predictionMarket.updateMany`
     would kill the redaction, and every "it never deletes X" assertion in §5 would still pass. */
  calls.length = 0;
  (guarded as never as { comment: { deleteMany: (a: unknown) => unknown } }).comment.deleteMany({});
  (guarded as never as { watchlist: { deleteMany: (a: unknown) => unknown } }).watchlist.deleteMany({});
  (guarded as never as { marketSnapshot: { deleteMany: (a: unknown) => unknown } }).marketSnapshot.deleteMany({});
  (guarded as never as { upDownRound: { deleteMany: (a: unknown) => unknown } }).upDownRound.deleteMany({});
  (guarded as never as { predictionMarket: { updateMany: (a: unknown) => unknown } }).predictionMarket.updateMany({});
  ok("9: ⭐ CONTROL — the purge's OWN five writes are untouched, redaction included",
     calls.length === 5 && calls.includes("predictionMarket.updateMany") && calls.includes("upDownRound.deleteMany"),
     calls.join(", "));

  /* ⛔ RAW SQL NAMES TABLES AS STRINGS and walks straight past a per-model proxy. The purge calls
     none of these, so refusing the whole class closes the only bypass the proxy cannot police. */
  for (const m of RAW_METHODS) {
    ok(`9: ⛔ ${m}() is refused outright — a SQL string is invisible to a per-model guard`,
       threw(() => ((guarded as unknown as Record<string, () => unknown>)[m])()));
  }

  /* ⛔ THE INTERACTIVE TRANSACTION IS WRAPPED TOO. One refactor from `$transaction([...])` to
     `$transaction(async (tx) => …)` would otherwise hand back an UNGUARDED client, and nothing
     above could see it: every assertion in this section would still pass. */
  let txGuarded = false;
  (guarded as never as { $transaction: (fn: (tx: unknown) => unknown) => unknown }).$transaction((tx) => {
    txGuarded = threw(() => (tx as { houseBotEvent: { deleteMany: (a: unknown) => unknown } }).houseBotEvent.deleteMany({}));
    return null;
  });
  ok("9: ⛔ the client handed to $transaction(fn) is guarded too", txGuarded);

  /* ⚠️ AND THE ARRAY FORM IS PASSED THROUGH UNCHANGED. `$transaction([...])` inspects the promises
     it is given; a guard that wrapped a delegate's RESULT would break every batch in the purge
     while every assertion above stayed green. The identity is what makes that measurable. */
  const p = (guarded as never as { comment: { deleteMany: (a: unknown) => unknown } }).comment.deleteMany({});
  const passed = (guarded as never as { $transaction: (a: unknown[]) => unknown[] }).$transaction([p]);
  ok("9: ⚠️ …and a delegate's own return value is NOT wrapped, so $transaction([…]) still works",
     Array.isArray(passed) && passed[0] === p);

  ok("9: the guard is WIRED — pc() never hands out a raw client",
     /return guardProtectedModels\(c\)/.test(decomment(readFileSync(join(ROOT, "src/lib/server/chain-purge.ts"), "utf8"))),
     "a guard that exists and is not called is the defect this section was written for");

  ok("9: ⭐ CONTROL — the predicate says NO to the tables the purge must be able to touch",
     !isProtectedModel("predictionMarket") && !isProtectedModel("comment") && !isProtectedModel("watchlist")
     && !isProtectedModel("marketSnapshot") && !isProtectedModel("upDownRound") && !isProtectedModel("objection"),
     "a predicate that protected everything would pass every assertion above and break the purge");
}

// ── 10 · THE POPULATION IS DERIVED FROM THE SCHEMA, NOT TYPED OUT ────────────
/**
 * ⛔ THE FAILURE THIS SECTION EXISTS FOR IS THE NINTH HOUSE TABLE. A list that must be
 * hand-extended protects exactly the tables somebody remembered; the one added next month escapes
 * it silently, and every suite stays green because the suite is reading the same list.
 *
 * ⭐ SO THE RULE IS READ TWICE, AND THIS IS THE READING THAT BITES FIRST. The runtime guard derives
 * from the GENERATED client's DMMF, which only knows what `prisma generate` last produced. This
 * one parses `prisma/schema.prisma` — the file a developer actually edits — so it fails in the
 * window between adding a table and regenerating, which is the whole window that matters.
 */
{
  const { deriveHouseFamily, parsePrismaModels, isProtectedModel, HOUSE_FAMILY_FLOOR, STATUTORY_MODELS } =
    await import("../src/lib/server/purge-protected.ts");

  const models = parsePrismaModels(readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8"));
  ok("10: the schema was parsed", models.length > 50, `${models.length} models`);
  const derived = deriveHouseFamily(models);

  const escaped = derived.filter((m) => !isProtectedModel(m));
  ok("10: 🔴 EVERY house table the SCHEMA declares is protected — a new one cannot escape",
     escaped.length === 0,
     escaped.length ? `not protected: ${escaped.join(", ")}` : `${derived.length} derived: ${derived.join(", ")}`);

  const missingFromSchema = (HOUSE_FAMILY_FLOOR as readonly string[]).filter((m) => !derived.includes(m));
  ok("10: ⭐ …and the pinned FLOOR is a subset of what the schema derives, so it cannot go stale",
     missingFromSchema.length === 0, missingFromSchema.join(", "));

  /* ⭐ THE RULE ITSELF, DRIVEN ON A FIXTURE — because "every derived model is protected" would be
     TAUTOLOGICAL if the rule were only the name prefix. What makes it a real question is clause ②:
     the soft key `houseBotId`, which is the idiom this schema actually uses. A house table named
     anything at all is caught by it; an unrelated table is not. */
  const fixture = [
    { name: "BotLiquidityLedger", fields: [{ name: "houseBotId", type: "String" }] },
    { name: "PressAuditTrail", fields: [{ name: "press", type: "HouseBotPress", ownsRelation: true }] },
    { name: "HouseBotPress", fields: [{ name: "id", type: "String" }] },
    { name: "Comment", fields: [{ name: "marketId", type: "String" }, { name: "user", type: "User", ownsRelation: true }] },
    { name: "User", fields: [{ name: "houseBots", type: "HouseBot", isList: true }] },
    { name: "HouseBot", fields: [{ name: "user", type: "User", ownsRelation: true }] },
  ];
  const f = deriveHouseFamily(fixture);
  ok("10: ⭐ the rule catches a house table that is NOT named HouseBot*, by its soft key",
     f.includes("BotLiquidityLedger"), f.join(", "));
  ok("10: …and one that only hangs off the family by a relation it OWNS, at any depth",
     f.includes("PressAuditTrail"), f.join(", "));
  /* 🔴 THE DEFECT THIS CONTROL CAUGHT, KEPT AS A CASE. The first rule followed any field whose
     type was in the family — and the DMMF adds the BACK-relation of every relation, so `User`
     carries `houseBots HouseBot[]`, joined the family, and dragged in every model with a `user`
     field. `Comment` became protected and the guard refused the purge's own chaff deletion. A
     back-relation is the schema saying "something else points at me", not the reverse. */
  ok("10: 🔴 CONTROL — a BACK-relation does not drag its owner into the family",
     !f.includes("User"), f.join(", "));
  ok("10: ⭐ CONTROL — and it does NOT sweep in an ordinary table",
     !f.includes("Comment"), f.join(", "));
  ok("10: ⭐ CONTROL — `BotLiquidityLedger` is not protected TODAY, so §10's first assertion is live",
     !isProtectedModel("BotLiquidityLedger"),
     "if the predicate said yes to a name that is not in the schema, the escape check could not fail");

  /* The six statutory singletons are named one at a time on purpose: no property of the schema
     picks out exactly these six, so a derivation over them would be a coincidence wearing a rule. */
  for (const m of STATUTORY_MODELS) {
    ok(`10: 🔴 the statutory singleton ${m} is protected`, isProtectedModel(m));
  }
}

// ── 11 · THE LIVE-INTENT PRECONDITION — 04 A16, driven ──────────────────────
/**
 * AUTHORITY, found before it was built: `04-amendments.md` A16's lifecycle table, "Chain purge"
 * row — *"purge refused while PENDING/CLAIMED intents exist"* — and `01-scenario-register.md`
 * CRA-15, which writes the officer's sentence out in full. ⚠️ CRA-15 was PARTLY struck by D20 on
 * 2026-09-17 (the cost-panel rows and the pack field are gone, because no record splits house
 * money out), and its own supersession note keeps this: *"the live-intent precondition and the
 * NEVER list are untouched by D20."*
 *
 * ⛔ WHY IT IS A REFUSAL AND NOT A RACE. PENDING or CLAIMED means a worker is seconds from placing
 * a real house bet on one of these markets. Purge through it and the money lands AFTER the
 * evidence pack was sealed — so the pack stops being the pre-purge truth, and the verification
 * phase's whole population (§8) is computed from a document that is already wrong.
 */
{
  const { houseBotIntentStore, __resetHouseBotMemoryStores } = await import("../src/lib/server/house-bot-dal.ts");

  const intent = (id: string, marketId: string, status: "PENDING" | "CLAIMED" | "CANCELLED") => ({
    id, houseBotId: "hb_1", botUserId: "usr_bot_1", kind: "COUNTER", anchorKey: `pos_${id}`,
    marketId, productLine: "UPDOWN", triggerPositionId: `pos_${id}`, triggerUserId: "usr_p",
    targetId: null, requestedById: null, entryCondition: null, side: "YES", stakeTzs: 1000,
    dueAt: iso(1), deadlineAt: iso(9), staleAt: iso(9), status, reasonCode: null, why: null,
    decision: {}, attempts: 0, transientAttempts: 0, nextAttemptAt: null, claimedBy: null,
    claimedUntil: null, positionId: null, finishedAt: status === "CANCELLED" ? iso(2) : null, alertedAt: null,
  });

  for (const status of ["PENDING", "CLAIMED"] as const) {
    __resetHouseBotMemoryStores();
    await seed(3, "ARCHIVED");
    await houseBotIntentStore.insert(intent(`hbi_${status}`, "mkt_p_1", status) as never);
    const r = await checkPreconditions("chn_p");
    ok(`11: 🔴 a chain with a ${status} house intent on one of its markets is REFUSED`,
       !r.ok && /house intents are still live/.test(r.error), r.ok ? "(allowed)" : r.error);
    ok(`11: …and the refusal names the COUNT and the remedy, like every other one here`,
       !r.ok && /^1 house intents/.test(r.error) && /cancel them or let them expire first/.test(r.error),
       r.ok ? "" : r.error);
  }

  /* ⭐ THE POSITIVE CONTROL. Without it, a precondition that refused EVERY chain would pass both
     assertions above harder — the shape `red:chain-purge`'s `the-precondition-refuses-everything`
     case already exists for on the ARCHIVED arm. CRA-15 names this case itself: "after the intent
     expires the purge proceeds". */
  __resetHouseBotMemoryStores();
  await seed(3, "ARCHIVED");
  await houseBotIntentStore.insert(intent("hbi_done", "mkt_p_1", "CANCELLED") as never);
  const done = await checkPreconditions("chn_p");
  ok("11: ⭐ CONTROL — once the intent is terminal the SAME chain is allowed", done.ok,
     done.ok ? "" : done.error);

  /* ⚠️ SCOPED TO THIS CHAIN'S MARKETS. A live intent anywhere else on the platform must not block
     an unrelated purge — the `purgedBy`-scoping mistake of §8 in a different costume. */
  __resetHouseBotMemoryStores();
  await seed(3, "ARCHIVED");
  await houseBotIntentStore.insert(intent("hbi_else", "mkt_somewhere_else", "PENDING") as never);
  const elsewhere = await checkPreconditions("chn_p");
  ok("11: ⚠️ …and a live intent on a market this chain does NOT own is not this chain's problem",
     elsewhere.ok, elsewhere.ok ? "" : elsewhere.error);

  /* ⚠️ THE PRISMA BRANCH CANNOT RUN HERE — no DATABASE_URL, so `hasDatabase()` is false and the
     memory walk is what executes. It is asserted as source, and DRIVEN for real against a scratch
     cluster by `npm run qa:purge-protected`, which is where the indexed `count` and the guard's
     behaviour on a genuine PrismaClient are measured. */
  const svc = decomment(readFileSync(join(ROOT, "src/lib/server/chain-purge.ts"), "utf8"));
  const counter = svc.slice(svc.indexOf("async function countLiveHouseIntents"));
  ok("11: the database branch counts every market at once, not one query per market",
     /houseBotIntent\.count\(/.test(counter) && /marketId: \{ in: \[\.\.\.marketIds\] \}/.test(counter),
     "a year of 5-minute rounds is 105,120 markets");
  ok("11: ⛔ …and 'live' is ONE constant, not two lists that can drift",
     /status: \{ in: \[\.\.\.LIVE_INTENT_STATUSES\] \}/.test(counter) && !/"PENDING"/.test(counter));
  __resetHouseBotMemoryStores();
}

// ── 12 · THE DOCBLOCK IS A CHECKED ARTEFACT, NOT PROSE ──────────────────────
/**
 * 🔴 THE WHOLE DEFECT IN ONE SENTENCE: the NEVER line said fourteen tables and the code enforced
 * six of them, for as long as the file existed. The line is now held equal to `neverList()`, so
 * the two cannot drift apart again — a name added to the docblock without the guard, or removed
 * from the docblock while the guard still holds it, is a failing assertion either way.
 */
{
  const src = readFileSync(join(ROOT, "src/lib/server/chain-purge.ts"), "utf8");
  const { neverList } = await import("../src/lib/server/purge-protected.ts");

  const line = /^\s*\*\s*NEVER\s*·\s*(.+)$/m.exec(src)?.[1] ?? "";
  ok("12: the NEVER line was located in the docblock", line.length > 20, line.slice(0, 40));
  const documented = line.split(",").map((s) => s.trim()).filter(Boolean).sort();
  const enforced = neverList();
  ok("12: 🔴 every table the docblock says is NEVER purged is actually protected",
     documented.every((m) => enforced.includes(m)),
     `prose only: ${documented.filter((m) => !enforced.includes(m)).join(", ")}`);
  ok("12: ⭐ …and every table the guard protects is named in the docblock",
     enforced.every((m) => documented.includes(m)),
     `guarded but undocumented: ${enforced.filter((m) => !documented.includes(m)).join(", ")}`);
  ok("12: ⭐ CONTROL — and there are really 14 of them, so neither side is empty",
     documented.length === 14 && enforced.length === 14, `${documented.length} documented / ${enforced.length} enforced`);
  ok("12: the docblock states WHAT ENFORCES the list, not only what it is",
     /guardProtectedModels/.test(src) && /purge-protected\.ts/.test(src));
  ok("12: …and states that retention still deletes HouseBotAlertOnce, so the two facts do not read as a bug",
     /retention\.purge\.daily` deletes it every/.test(src) && /A20/.test(src));
}

console.log(`\nchain-purge: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
