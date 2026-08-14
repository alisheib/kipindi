#!/usr/bin/env tsx
/**
 * ONE-OFF · D2 — correct the three MarketCandidate rows the publish false alarm stranded.
 *
 * 🔴 WHY. `scoreCandidate` sent an officer-approved poll scoring below 75 to `FILTERED_OUT`;
 * `approveCandidate` then returned `null` and **its return value was discarded**, so
 * `createMarket` ran anyway and put a LIVE, bettable market on the board; `markPublished`
 * refused because the candidate was not `APPROVED`; and the officer was told the publish had
 * FAILED — about a market players were already betting in. Forward fix + the decision:
 * `docs/COMPLIANCE-DECISIONS.md` § 2026-08-14 · guard: `npm run test:aipoll-publish`.
 *
 * ⛔ THIS MOVES NO MONEY AND TOUCHES NO MONEY COLUMN. It writes exactly two fields on
 * exactly three candidate rows — `state` and `publishedMarketId`. Pools, positions, wallets,
 * transactions and payouts are read for COMPARISON only, before and after, and the run FAILS
 * if a single one of those figures changed. Only the candidate row is wrong; the AiPoll rows
 * linked correctly (`pollLinked: true` in all three audit entries).
 *
 * ⛔ IT WRITES THROUGH THE PRODUCT'S OWN DAL AND THE PRODUCT'S OWN `audit()`. The audit table
 * is an HMAC chain — `prevHash`/`entryHash`, both UNIQUE, with `@@unique([prevHash])` making
 * it physically fork-proof. A hand-rolled `INSERT INTO "AuditLog"` breaks the chain and makes
 * every later verification fail. The first draft of this script did exactly that.
 *
 * ⚠️ DRY RUN BY DEFAULT. It prints every change and writes nothing without `--commit`.
 * ⚠️ It refuses to touch a row that is not in the exact `FILTERED_OUT` state this correction
 * is for — a row somebody else already repaired is skipped, not stamped over.
 *
 *   # get a live DATABASE_URL first (rewrites the internal host onto the public proxy):
 *   railway run -s 50pick -- node scripts/live/ops/mkenv.cjs
 *
 *   npx tsx scripts/ops-d2-publish-false-alarm.mts
 *   npx tsx scripts/ops-d2-publish-false-alarm.mts --commit
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── env: the live URL, loaded BEFORE any app module is imported ───────────────
// `scripts/live/ops/.env` is gitignored and holds the public-proxy URL that mkenv.cjs
// minted. ⛔ Railway's injected DATABASE_URL is `postgres.railway.internal` and resolves
// nowhere off-platform — every read through it silently returns DEFAULTS.
if (!process.env.DATABASE_URL) {
  try {
    for (const line of readFileSync(join(__dirname, "live", "ops", ".env"), "utf8").split("\n")) {
      const i = line.indexOf("=");
      if (i > 0 && !process.env[line.slice(0, i)]) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
    }
  } catch { /* fall through to the check below */ }
}
const DB = process.env.DATABASE_URL;
if (!DB) { console.error("FATAL: DATABASE_URL is not set and scripts/live/ops/.env was not readable."); process.exit(1); }
const host = (() => { try { return new URL(DB).host; } catch { return "unparseable"; } })();
if (host.endsWith(".railway.internal")) {
  console.error(`FATAL: DATABASE_URL points at ${host}, which resolves nowhere off-platform.`);
  console.error("       Every read would silently return DEFAULTS. Run mkenv.cjs first.");
  process.exit(1);
}
process.env.USE_PRISMA_DAL ??= "true";

const COMMIT = process.argv.includes("--commit");

// Dynamic, so the env above is in place before the Prisma client is constructed.
const pg = (await import("pg")).default;
const { candidateStore } = await import("../src/lib/server/market-candidate.ts");
const { audit, auditFlush } = await import("../src/lib/server/audit.ts");

/**
 * The three named in the work order, measured 2026-08-14 morning.
 *
 * ⚠️ THE LIST IS NOT HARDCODED TO THESE. The set of stranded rows is whatever the
 * `aipoll.publish_link_failed` audit rows say it is, and this script derives it from them —
 * because a FOURTH fired at 2026-08-14 10:29, after the work order was written, and a script
 * that trusted its own list would have silently left it stranded. These three are kept only
 * so the run can report which were expected and which are new.
 */
const DOCUMENTED_IDS = [
  "cand_b1445133f4fe3f2223be9205",
  "cand_adb5a50a688130f55535a416",
  "cand_ee4ec4f6ccf9bd8b2839fbab",
];

const c = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
await c.connect();
const q = (sql: string, params?: unknown[]) => c.query(sql, params as never[]).then((r) => r.rows as Record<string, string>[]);

// ── 0 · IDENTITY — a probe that cannot prove which database it read is not evidence ──
const [meta] = await q(`select current_database() as db, inet_server_addr()::text as addr, now()::text as server_now`);
console.log("=== IDENTITY ===");
console.log(`host=${host}  db=${meta.db}  server=${meta.addr}  server_now=${meta.server_now}`);
const [counts] = await q(`
  select (select count(*) from "User")::int as users,
         (select count(*) from "PredictionMarket" where status='LIVE')::int as live,
         (select count(*) from "PredictionMarket" where status='RESOLVED')::int as resolved`);
console.log(`users=${counts.users}  marketsLive=${counts.live}  marketsResolved=${counts.resolved}`);
console.log("⭐ cross-check users/marketsLive against https://www.50pick.tz/api/health before believing anything below.\n");

// ── 1 · THE ALARM — the audit rows that named these three ────────────────────
const alarms = await q(`
  select "createdAt"::text as at, "targetId" as market_id, payload::text as payload
    from "AuditLog" where action = 'aipoll.publish_link_failed' order by "createdAt"`);
console.log(`=== THE ALARM · ${alarms.length} \`aipoll.publish_link_failed\` row(s) ===`);
const pairing = new Map<string, string>();
for (const a of alarms) {
  const p = JSON.parse(a.payload ?? "{}") as { candidateId?: string; pollLinked?: boolean; marketPublished?: boolean };
  console.log(`  ${a.at}  market=${a.market_id}  candidate=${p.candidateId}  pollLinked=${p.pollLinked}  marketPublished=${p.marketPublished}`);
  if (p.candidateId && a.market_id) pairing.set(p.candidateId, a.market_id);
}

// The population is the alarm, not the work order.
const CANDIDATE_IDS = [...pairing.keys()];
const unlisted = CANDIDATE_IDS.filter((id) => !DOCUMENTED_IDS.includes(id));
const absent = DOCUMENTED_IDS.filter((id) => !CANDIDATE_IDS.includes(id));
console.log(`\n  work order named ${DOCUMENTED_IDS.length} · the audit log names ${CANDIDATE_IDS.length}`);
if (unlisted.length) console.log(`  NOTE — fired after the work order was written: ${unlisted.join(", ")}`);
if (absent.length) console.log(`  NOTE — named in the work order, absent from the audit log: ${absent.join(", ")}`);

// ── 2 · THE CANDIDATE ROWS ───────────────────────────────────────────────────
const cands = await q(`
  select id, state, confidence::text as confidence, "publishedMarketId", "rejectReason", "rejectNote",
         "proposedTitleEn", "updatedAt"::text as updated_at
    from "MarketCandidate" where id = any($1::text[]) order by "createdAt"`, [CANDIDATE_IDS]);
console.log(`\n=== THE CANDIDATE ROWS · ${cands.length}/${CANDIDATE_IDS.length} found ===`);
for (const r of cands) {
  console.log(`  ${r.id}`);
  console.log(`     state=${r.state}  confidence=${r.confidence}  publishedMarketId=${r.publishedMarketId ?? "NULL"}`);
  console.log(`     rejectReason=${r.rejectReason ?? "-"}  note=${r.rejectNote ?? "-"}`);
  console.log(`     title="${(r.proposedTitleEn ?? "").slice(0, 72)}"  updated ${r.updated_at}`);
}
for (const id of CANDIDATE_IDS) if (!cands.some((r) => r.id === id)) console.log(`  ⛔ NOT FOUND: ${id}`);

// ── 3 · THE MONEY, read for comparison only ──────────────────────────────────
const marketIds = [...pairing.values()];
/**
 * ⚠️ Transaction has NO marketId column. It carries a soft positionId, so the LEDGER side of
 * a market is reached THROUGH its positions. Joining on a column that does not exist turns a
 * money check into a crash; guessing one that exists but means something else turns it into a
 * green that proves nothing.
 * ⚠️ And do not write a column name in backticks inside this template literal — it closes the
 * string, and the parse error lands on a line you did not touch.
 */
async function money(): Promise<Record<string, string>[]> {
  if (marketIds.length === 0) return [];
  return await q(`
    select m.id, m.status, m."productLine",
           m."yesPool"::text as yes_pool, m."noPool"::text as no_pool,
           (select count(*) from "Position" p where p."marketId" = m.id)::text                     as positions,
           (select count(distinct p."userId") from "Position" p where p."marketId" = m.id)::text   as bettors,
           (select coalesce(sum(p.stake),0)::text from "Position" p where p."marketId" = m.id)     as staked,
           (select count(*) from "Transaction" t
             where t."positionId" in (select p.id from "Position" p where p."marketId" = m.id))::text as txns,
           (select coalesce(sum(t.amount),0)::text from "Transaction" t
             where t."positionId" in (select p.id from "Position" p where p."marketId" = m.id))       as txn_sum
      from "PredictionMarket" m where m.id = any($1::text[]) order by m."createdAt"`, [marketIds]);
}
const fingerprint = (rows: Record<string, string>[]) =>
  rows.map((r) => [r.id, r.status, r.yes_pool, r.no_pool, r.positions, r.bettors, r.staked, r.txns, r.txn_sum].join("|")).sort().join("\n");
function printMoney(label: string, rows: Record<string, string>[]) {
  console.log(`\n--- ${label} ---`);
  if (rows.length === 0) { console.log("  (no markets)"); return; }
  for (const r of rows) {
    console.log(`  ${r.id}  ${r.status.padEnd(8)} ${r.productLine}`);
    console.log(`     pools yes=${r.yes_pool} no=${r.no_pool} · positions=${r.positions} bettors=${r.bettors} staked=${r.staked} · transactions=${r.txns} sum=${r.txn_sum}`);
  }
}
const before = await money();
printMoney("MONEY BEFORE", before);
const fpBefore = fingerprint(before);

// ── 4 · THE AiPoll SIDE, which the alarm says linked correctly ───────────────
const polls = await q(`
  select id, state, "publishedCandidateId", "publishedMarketId", confidence::text as confidence
    from "AIPoll" where "publishedCandidateId" = any($1::text[])`, [CANDIDATE_IDS]);
console.log(`\n=== THE AiPoll ROWS (expected: already correct) ===`);
for (const p of polls) console.log(`  ${p.id}  state=${p.state}  candidate=${p.publishedCandidateId}  market=${p.publishedMarketId}  confidence=${p.confidence}`);
if (polls.length !== CANDIDATE_IDS.length) console.log(`  ⚠️ ${CANDIDATE_IDS.length - polls.length} candidate(s) have no AiPoll pointing at them`);

// ── 5 · WHAT NEEDS CORRECTING ────────────────────────────────────────────────
type Job = { candidateId: string; marketId: string; from: string; confidence: string };
const todo: Job[] = [];
for (const id of CANDIDATE_IDS) {
  const row = cands.find((r) => r.id === id);
  const marketId = pairing.get(id);
  if (!row) { console.log(`\nSKIP ${id} — candidate row not found`); continue; }
  if (!marketId) { console.log(`\nSKIP ${id} — no market id in any alarm payload`); continue; }
  if (!before.some((m) => m.id === marketId)) { console.log(`\nSKIP ${id} — market ${marketId} does not exist`); continue; }
  if (row.state === "PUBLISHED" && row.publishedMarketId === marketId) { console.log(`\nSKIP ${id} — ALREADY CORRECT`); continue; }
  if (row.state !== "FILTERED_OUT") { console.log(`\nSKIP ${id} — state is ${row.state}, not FILTERED_OUT. Refusing to touch it.`); continue; }
  todo.push({ candidateId: id, marketId, from: row.state, confidence: row.confidence });
}
console.log(`\n=== TO CORRECT · ${todo.length} row(s) ===`);
for (const t of todo) console.log(`  ${t.candidateId}: ${t.from} → PUBLISHED · publishedMarketId → ${t.marketId} (confidence ${t.confidence})`);

if (!COMMIT) {
  console.log(`\nDRY RUN — nothing written. Re-run with --commit to correct these ${todo.length} row(s).`);
  await c.end();
  process.exit(0);
}

// ── 6 · THE WRITE — through the DAL, one row at a time, each audited ─────────
for (const t of todo) {
  const cand = await candidateStore.get(t.candidateId);
  if (!cand) { console.log(`  ✗ ${t.candidateId} — vanished between read and write; skipped`); continue; }
  if (cand.state !== "FILTERED_OUT") { console.log(`  ✗ ${t.candidateId} — state changed to ${cand.state} between read and write; skipped`); continue; }

  cand.state = "PUBLISHED";
  cand.publishedMarketId = t.marketId;
  cand.updatedAt = new Date().toISOString();
  await candidateStore.set(cand);

  await audit({
    category: "COMPLIANCE",
    action: "candidate.published_correction",
    actorId: "ops_d2",
    targetType: "Candidate",
    targetId: t.candidateId,
    payload: {
      marketId: t.marketId,
      from: t.from,
      to: "PUBLISHED",
      confidence: Number(t.confidence),
      why: "aipoll.publish_link_failed — the market was created and went LIVE; only the candidate row was left behind. Forward fix + decision: docs/COMPLIANCE-DECISIONS.md 2026-08-14.",
      moneyTouched: false,
    },
  });
  console.log(`  ✓ ${t.candidateId} → PUBLISHED (${t.marketId})`);
}
await auditFlush();

// ── 7 · PROVE IT, AND PROVE THE MONEY DID NOT MOVE ───────────────────────────
const after = await q(`
  select id, state, "publishedMarketId", "updatedAt"::text as updated_at
    from "MarketCandidate" where id = any($1::text[]) order by "createdAt"`, [CANDIDATE_IDS]);
console.log(`\n=== AFTER ===`);
for (const r of after) console.log(`  ${r.id}  state=${r.state}  market=${r.publishedMarketId ?? "NULL"}  updated ${r.updated_at}`);

const moneyAfter = await money();
printMoney("MONEY AFTER", moneyAfter);
const fpAfter = fingerprint(moneyAfter);
console.log(`\nMONEY UNCHANGED: ${fpBefore === fpAfter ? "YES ✓" : "NO ⛔ — INVESTIGATE"}`);
if (fpBefore !== fpAfter) {
  console.log("--- before ---\n" + fpBefore + "\n--- after ----\n" + fpAfter);
  await c.end();
  process.exit(2);
}

await c.end();
process.exit(0);
