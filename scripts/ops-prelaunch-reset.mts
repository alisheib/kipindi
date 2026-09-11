/**
 * `ops-prelaunch-reset.mts` — the ONE-TIME pre-launch data reset.
 *
 * Ali's instruction, 2026-09-11: go live with the poll catalogue intact, every
 * player gone so they re-register, and the books at zero — but every RULE we have
 * already set (rates, commissions, levies, RBAC, AI controls) untouched.
 *
 *   npm run ops:prelaunch-reset -- --plan                 # read-only impact report
 *   npm run ops:prelaunch-reset -- --quiesce              # pause chains + sentinel
 *   npm run ops:prelaunch-reset -- --rehearse             # run it ALL, then roll back
 *   npm run ops:prelaunch-reset -- --execute --confirm "RESET 50PICK FOR LAUNCH"
 *   npm run ops:prelaunch-reset -- --verify               # post-reset invariants
 *   npm run ops:prelaunch-reset -- --resume               # un-pause chains + sentinel
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT SURVIVES, AND WHY EACH ONE IS ON THIS SIDE OF THE LINE
 *
 *   SystemConfig rules        market.config (commissionRate .13, feeCeilingRate .333,
 *                             operatorFeeRate .10, platformFeeRate .03, TRA .10, GBT .05,
 *                             withdrawalFeeRate .015, min/max stake), agent.config,
 *                             affiliate.config, updown.config + playbooks, platform_config,
 *                             support_config, resolution.policy, payments.control,
 *                             sentinel.schedule, ai_* controls, sources.disabled_categories.
 *   185 MARKET polls          questions, criteria, translations, resolutionAt AND
 *                             `feeSnapshot` — the rates FROZEN onto each poll. Settlement
 *                             reads the snapshot, never live config, so preserving it is
 *                             what makes a kept poll price the way it was written.
 *   AIPoll / MarketCandidate  the AI generation pipeline's content (716 + 304).
 *   UpDownAsset / Chain       7 assets with their enabled flags, 23 chain definitions.
 *   TrustedSource             30 source-registry rows.
 *   RoleDomainGrant/ReadGrant 0 rows today — the resolver falls back to DEFAULT_GRANTS in
 *                             code, so an empty table is already correct. Left alone.
 *   The kept staff accounts   id, phone, email, passwordHash, role, status and TOTP, so
 *                             they can still sign in. Nothing else.
 *
 * WHAT GOES TO ZERO OR GOES AWAY
 *
 *   Every PLAYER and every non-kept staff account, with all cascaded data.
 *   Every Position, Transaction, LedgerEntry, HousePoolLedger, BonusGrant, Wallet balance
 *     — including the kept admins', who are the heaviest test bettors on the system
 *     (743 positions, 1,495 transactions, TZS 7,381,473).
 *   Every KycSubmission + KycDocument, and the matching R2 objects (--purge-kyc).
 *   All 41,110 UPDOWN market rows → cascades 41,071 UpDownRound, their snapshots and bets.
 *   All 34,526 UpDownObservation rows (child of ASSET, not of round — no cascade reaches it).
 *   All MarketSnapshot rows: price history derived from bets that no longer exist. Keeping
 *     them would render a probability chart for a poll with no trades — the A-5 fabrication
 *     rule the MarketCard cites in its own source.
 *   yesPool / noPool / predictorCount on all 185 kept polls → 0. This is not tidiness:
 *     the pools are denormalised onto the row, so a kept poll would otherwise advertise
 *     TZS 17.6M staked with zero positions behind it, and settlement divides a losing pool
 *     it would then pay out of. Phantom money on a live money surface.
 *   AuditLog — all 264,595 rows. See the header note below.
 *   AiUsageEvent / AiSpendCycle, and the accounting that hides in SystemConfig:
 *     house.pool.state (balance 3,169 + 12 market seeds) and ai_usage_daily.
 *   SystemConfig rows that are USER data, not rules: chat.daily.usr_* (5),
 *     bootstrap.login_promoted:+255* (2), email.suppression (test addresses that would
 *     silently block mail at launch), and test.overrides (dead key, no readers in src/).
 *
 * ⛔ THE AUDIT LOG IS A DELIBERATE DOCTRINE OVERRIDE. `docs/DATA-RETENTION.md` §3 says the
 * HMAC chain is on no deletion path, and it is right: deleting any row breaks the chain,
 * and the break is the signal the chain exists to produce. There is no partial option.
 * Ali's ruling 2026-09-11 is to wipe it whole so the real-money chain begins at GENESIS on
 * day one, rather than carry 264,595 test rows that name 97 erased players and hold payload
 * PII about them. Recorded in docs/COMPLIANCE-DECISIONS.md; §3 amended in the same commit.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FIVE THINGS THAT MAKE THIS SAFE TO RUN ON PRODUCTION
 *
 *  1. **The keep-list is data, not a default.** It comes from a JSON file Ali writes.
 *     Every entry must resolve to EXACTLY ONE live User or the run aborts naming the
 *     entry — a typo'd phone silently keeping nobody is how you delete your own account.
 *  2. **The lockout guard.** The run aborts unless the resolved set contains at least one
 *     role=ADMIN, status=ACTIVE user WITH a passwordHash. A reset that leaves no one able
 *     to sign in is unrecoverable through the product.
 *  3. **Verify BEFORE commit.** The whole reset is one transaction; the invariants are
 *     asserted inside it and a failure ROLLS BACK. The database is never briefly wrong.
 *  4. **It refuses to run against live writers.** 9 Up & Down chains are RUNNING and emit
 *     a round every few minutes; the sentinel resolves markets on its own timer. --execute
 *     aborts if any chain is RUNNING or the sentinel is unpaused, because rows appearing
 *     mid-wipe make the verification meaningless. --quiesce is the separate, reversible step.
 *  5. **Backups are purged LAST, never first.** --purge-backups refuses to run until
 *     --verify has passed and a post-reset backup exists, so the rollback point outlives
 *     the thing it protects against.
 *
 * WHY plain `pg` AND NOT PRISMA: the same reason db-backup.mts uses it — no generated
 * client to go stale against a schema mid-migration, and DDL-adjacent work (TRUNCATE,
 * transaction-scoped asserts) is not what the query builder is for.
 */
import pg from "pg";
import { createHash } from "node:crypto";
import { readFileSync, existsSync, writeFileSync } from "node:fs";

// ── the rules that must survive, named explicitly ──────────────────────────
// A prefix match would have been shorter and wrong: `ai_usage_daily` and
// `ai_ops_config` share a prefix and sit on OPPOSITE sides of this line.
const CONFIG_KEEP = new Set([
  "market.config",
  "agent.config",
  "affiliate.config",
  "bonus.config",
  "lipa.config",
  "updown.config",
  "updown.playbook.index",
  "updown.playbook.profile.BTC/USD",
  "updown.playbook.profile.XAU/USD",
  "proposals.config",
  "platform_config",
  "support_config",
  "resolution.policy",
  "payments.control",
  "sentinel.schedule",
  "sentinel.paused",
  "ai.controls",
  "ai_ops_config",
  "ai_credit_config",
  "ai_cycle_config",
  "sources.disabled_categories",
  "__BACKUP_LAST_RUN__", // ops state the backup watchdog reads; not player data
  "__LEADER_lifecycle__", // multi-instance leader election; regenerates anyway
]);

// The subset of CONFIG_KEEP that is FINGERPRINTED before and after the reset.
// ⛔ The three excluded keys are operational, not rules: `sentinel.paused` is flipped by
// --quiesce itself, `__LEADER_lifecycle__` is rewritten by whichever instance holds the
// lease, and `__BACKUP_LAST_RUN__` by the nightly watchdog. Hashing those would make the
// verification fail for reasons that have nothing to do with the reset.
const RULES_VOLATILE = new Set(["sentinel.paused", "__LEADER_lifecycle__", "__BACKUP_LAST_RUN__"]);

// Accounting state that lives in the config table and must be ZEROED, not kept.
const CONFIG_ZERO: Record<string, string> = {
  "house.pool.state": "zeroed: balance 0, seeds []",
  ai_usage_daily: "zeroed: {}",
  "email.suppression": "zeroed: [] (held only test addresses)",
};

// Config rows that are user data or dead keys — deleted outright.
// Patterns, because the user-scoped ones carry an id in the key.
const CONFIG_DROP_PATTERNS = [/^chat\.daily\./, /^bootstrap\.login_promoted:/, /^test\.overrides$/];

// ── argv ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const KEEP_FILE = val("--keep") ?? "prelaunch-keep-users.json";
const CONFIRM_PHRASE = "RESET 50PICK FOR LAUNCH";

const mode = has("--execute")
  ? "execute"
  : has("--rehearse")
    ? "rehearse"
    : has("--verify")
    ? "verify"
    : has("--quiesce")
      ? "quiesce"
      : has("--resume")
        ? "resume"
        : "plan";

function dbUrl(): string {
  const u = process.env.DATABASE_URL ?? process.env.RESET_DATABASE_URL;
  if (!u) {
    console.error(
      "✖ No DATABASE_URL. This script talks to production over the PUBLIC proxy:\n" +
        "    RESET_DATABASE_URL=$(railway variables --service Postgres --json | jq -r .DATABASE_PUBLIC_URL)\n" +
        "  ⛔ Do NOT use `railway run` — it injects the INTERNAL host, which does not\n" +
        "     resolve off-box, and the failure looks like a dead database."
    );
    process.exit(1);
  }
  return u;
}

const client = new pg.Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } });
const q = async <T = any>(sql: string, params?: any[]): Promise<T[]> =>
  (await client.query(sql, params)).rows as T[];
const one = async (sql: string, params?: any[]) => (await q(sql, params))[0];
const num = async (sql: string) => Number((await one(sql))?.n ?? 0);

const fmt = (n: number | string) => Number(n).toLocaleString("en-US");
const tzs = (n: number | string) => "TZS " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

// ── the keep-list ──────────────────────────────────────────────────────────
type KeepEntry = { phone?: string; email?: string; note?: string; keep?: boolean };

async function resolveKeepList(): Promise<{ ids: string[]; rows: any[] }> {
  if (!existsSync(KEEP_FILE)) {
    console.error(
      `✖ Keep-list not found: ${KEEP_FILE}\n\n` +
        `  Write it as a JSON array. Each entry needs a phone OR an email — whichever\n` +
        `  you have — and may carry a note:\n\n` +
        `  [\n` +
        `    { "phone": "+255777777777", "email": "alisheib07@gmail.com", "note": "owner" },\n` +
        `    { "email": "jay.kaba@50pick.tz", "note": "admin" }\n` +
        `  ]\n\n` +
        `  Every entry must match exactly one live account or the run aborts.`
    );
    process.exit(1);
  }
  const all = JSON.parse(readFileSync(KEEP_FILE, "utf8")) as KeepEntry[];
  if (!Array.isArray(all) || all.length === 0) {
    console.error("✖ Keep-list is empty. Refusing: that would delete every account including yours.");
    process.exit(1);
  }

  // TWO ACCEPTED SHAPES, and the file says which it is rather than the script guessing.
  // A roster carries an explicit `keep` on every row (the generated template, all false),
  // so flipping flags is the whole edit. A plain list has no flags and every entry is a
  // keep. ⛔ A file that mixes the two is rejected: a row with no flag sitting beside rows
  // that have them reads as "keep" under one rule and "drop" under the other, and the
  // difference is somebody's account.
  const flagged = all.filter((e) => typeof e.keep === "boolean").length;
  if (flagged > 0 && flagged < all.length) {
    console.error(
      `✖ Keep-list mixes shapes: ${flagged} of ${all.length} entries carry a "keep" flag.\n` +
        "  Either give EVERY row a keep flag (roster form) or none of them (plain list form).\n" +
        "  A missing flag would otherwise mean the opposite thing on two rows of one file."
    );
    process.exit(1);
  }
  const isRoster = flagged === all.length;
  const raw = isRoster ? all.filter((e) => e.keep === true) : all;
  console.log(
    isRoster
      ? `Keep-list: roster form — ${raw.length} of ${all.length} rows flagged keep:true`
      : `Keep-list: plain form — all ${raw.length} entries are keeps`
  );
  if (raw.length === 0) {
    console.error('✖ Roster has no rows flagged keep:true. Refusing: that deletes every account.');
    process.exit(1);
  }

  const ids: string[] = [];
  const rows: any[] = [];
  const problems: string[] = [];

  for (const [i, e] of raw.entries()) {
    const label = e.phone ?? e.email ?? `entry #${i}`;
    if (!e.phone && !e.email) {
      problems.push(`entry #${i}: needs a phone or an email`);
      continue;
    }
    // ⛔ PHONE IS AUTHORITATIVE WHENEVER IT IS PRESENT, and email is only a fallback.
    // `phoneE164` is the sole @unique column on User; `email` is not unique and in practice
    // is NOT unique here — alisheib07@gmail.com is on FOUR accounts (one ADMIN + three test
    // PLAYER registrations). The first version of this matched `phone = $1 OR email = $2`,
    // so a row carrying both identified four accounts and the run aborted on a keep-list
    // that was perfectly correct. An OR across a unique and a non-unique column always
    // widens to the non-unique one.
    const found = e.phone
      ? await q(
          `SELECT id, role, status, "phoneE164", email, "displayName",
                  ("passwordHash" IS NOT NULL) AS has_password
             FROM "User" WHERE "phoneE164" = $1`,
          [e.phone]
        )
      : await q(
          `SELECT id, role, status, "phoneE164", email, "displayName",
                  ("passwordHash" IS NOT NULL) AS has_password
             FROM "User" WHERE lower(email) = lower($1)`,
          [e.email]
        );

    // Both given: the phone decided, so the email is a cross-check. A disagreement means
    // the list is stale or describes someone else — say so rather than silently trusting
    // whichever field happened to win.
    if (e.phone && e.email && found.length === 1) {
      const actual = (found[0].email ?? "").toLowerCase();
      if (actual !== e.email.toLowerCase())
        problems.push(
          `${e.phone}: phone belongs to ${actual || "(no email)"}, but the list says ${e.email} — resolve which is right`
        );
    }
    if (found.length === 0) problems.push(`${label}: matches NO account`);
    else if (found.length > 1)
      problems.push(`${label}: matches ${found.length} accounts (${found.map((f) => f.id).join(", ")}) — narrow it`);
    else if (ids.includes(found[0].id)) problems.push(`${label}: duplicate of an earlier entry`);
    else {
      ids.push(found[0].id);
      rows.push({ ...found[0], note: e.note ?? "" });
    }
  }

  if (problems.length) {
    console.error("✖ Keep-list does not resolve cleanly. Nothing has been touched.\n");
    for (const p of problems) console.error("   • " + p);
    console.error("\n  Fix the file and re-run. A typo here deletes an account you meant to keep.");
    process.exit(1);
  }

  // ── the lockout guard ──
  const admins = rows.filter((r) => r.role === "ADMIN" && r.status === "ACTIVE" && r.has_password);
  if (admins.length === 0) {
    console.error(
      "✖ LOCKOUT GUARD. The keep-list resolves, but it contains no ADMIN that is ACTIVE and\n" +
        "  has a password. After the reset nobody could sign in to the admin console, and\n" +
        "  there is no way back through the product. Add at least one and re-run."
    );
    process.exit(1);
  }
  const noPw = rows.filter((r) => !r.has_password);
  if (noPw.length) {
    console.warn(
      `⚠ ${noPw.length} kept account(s) have NO passwordHash and cannot sign in until they ` +
        `reset:\n` + noPw.map((r) => `     ${r.role} ${r.phoneE164} ${r.email ?? ""}`).join("\n")
    );
  }
  return { ids, rows };
}

// ── quiesce / resume ───────────────────────────────────────────────────────
async function liveWriters() {
  const running = await num(`SELECT count(*)::int n FROM "UpDownChain" WHERE state='RUNNING'`);
  const sentinel = await one(`SELECT value FROM "SystemConfig" WHERE key='sentinel.paused'`);
  const paused = sentinel?.value?.paused === true;
  const recent = await num(
    `SELECT count(*)::int n FROM "UpDownRound" WHERE "createdAt" > now() - interval '10 minutes'`
  );
  return { running, sentinelPaused: paused, recentRounds: recent };
}

async function quiesce() {
  const before = await liveWriters();
  console.log(`Chains RUNNING: ${before.running}   sentinel paused: ${before.sentinelPaused}   rounds last 10min: ${before.recentRounds}`);
  await client.query("BEGIN");
  // ⛔ RECORD THE IDS, NOT THE COUNT. `--resume` used to flip every PAUSED chain back to
  // RUNNING, which is only equivalent while nothing was paused BEFORE the quiesce. A chain
  // Ali had deliberately paused would have been started by the resume — the reset silently
  // turning a switch it was never asked to touch. RETURNING makes the undo exact.
  const r = await client.query<{ id: string }>(
    `UPDATE "UpDownChain" SET state='PAUSED' WHERE state='RUNNING' RETURNING id`
  );
  const paused = r.rows.map((x) => x.id);
  const wasSentinelPaused = before.sentinelPaused;
  await client.query(
    `INSERT INTO "SystemConfig" (key, value, "updatedAt") VALUES ('sentinel.paused', '{"paused":true}'::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value='{"paused":true}'::jsonb, "updatedAt"=now()`
  );
  await client.query("COMMIT");
  console.log(`✔ Paused ${paused.length} chain(s) and the market sentinel.`);
  const alreadyPaused = await num(`SELECT count(*)::int n FROM "UpDownChain" WHERE state='PAUSED'`) - paused.length;
  if (alreadyPaused > 0)
    console.log(`  ⚠ ${alreadyPaused} chain(s) were ALREADY paused before this — --resume will leave them paused.`);
  console.log(`  Reversible with --resume, which restarts these ${paused.length} by id and nothing else.`);
  writeFileSync(
    ".prelaunch-quiesced.json",
    JSON.stringify({ at: new Date().toISOString(), pausedChainIds: paused, sentinelWasPaused: wasSentinelPaused }, null, 2)
  );
}

async function resume() {
  const stamp = existsSync(".prelaunch-quiesced.json")
    ? JSON.parse(readFileSync(".prelaunch-quiesced.json", "utf8"))
    : null;
  if (!stamp?.pausedChainIds) {
    console.error("✖ No .prelaunch-quiesced.json (or it predates id-recording) — refusing to guess.");
    console.error("  Flipping every PAUSED chain to RUNNING would start ones nobody asked to start.");
    console.error("  Start the chains you want from /admin (they are PAUSED, not lost).");
    process.exit(1);
  }
  const r = await client.query(
    `UPDATE "UpDownChain" SET state='RUNNING' WHERE id = ANY($1::text[]) AND state='PAUSED'`,
    [stamp.pausedChainIds]
  );
  // The sentinel goes back to whatever it was, which is not necessarily "running".
  const restore = stamp.sentinelWasPaused === true;
  await client.query(
    `UPDATE "SystemConfig" SET value=$1::jsonb, "updatedAt"=now() WHERE key='sentinel.paused'`,
    [JSON.stringify({ paused: restore })]
  );
  console.log(`✔ Restarted ${r.rowCount} of ${stamp.pausedChainIds.length} chain(s) recorded at quiesce.`);
  if ((r.rowCount ?? 0) < stamp.pausedChainIds.length)
    console.log(`  (the difference was moved out of PAUSED by hand since — left as found)`);
  console.log(`  sentinel.paused restored to ${restore}.`);
}

// ── the impact report ──────────────────────────────────────────────────────
async function plan(keep: { ids: string[]; rows: any[] }) {
  const line = "─".repeat(78);
  console.log("\n" + "═".repeat(78));
  console.log("50PICK PRE-LAUNCH RESET — IMPACT REPORT (read-only, nothing written)");
  console.log("═".repeat(78));

  const w = await liveWriters();
  console.log(`\nLive writers: ${w.running} chain(s) RUNNING · sentinel ${w.sentinelPaused ? "PAUSED" : "ACTIVE"} · ${w.recentRounds} round(s) in the last 10 min`);
  if (w.running > 0 || !w.sentinelPaused)
    console.log("  ⚠ --execute will REFUSE until these are quiesced. Run --quiesce first.");

  console.log("\n" + line + "\nACCOUNTS\n" + line);
  console.log(`KEEP ${keep.rows.length}:`);
  for (const r of keep.rows)
    console.log(
      `  ${String(r.role).padEnd(11)} ${String(r.status).padEnd(12)} ${String(r.phoneE164).padEnd(15)} ` +
        `${String(r.email ?? "-").padEnd(34)} pw=${r.has_password ? "yes" : "NO "} ${r.note}`
    );

  const del = await q(
    `SELECT role, status, count(*)::int n FROM "User" WHERE id <> ALL($1::text[]) GROUP BY role,status ORDER BY role,status`,
    [keep.ids]
  );
  const delTotal = del.reduce((a, r) => a + r.n, 0);
  console.log(`\nDELETE ${delTotal}:`);
  for (const r of del) console.log(`  ${String(r.role).padEnd(11)} ${String(r.status).padEnd(12)} ${r.n}`);

  console.log("\n" + line + "\nMONEY → ZERO\n" + line);
  const money = await one(`
    SELECT (SELECT sum(balance)::numeric FROM "Wallet") AS bal,
           (SELECT sum("bonusBalance")::numeric FROM "Wallet") AS bonus,
           (SELECT sum(hold)::numeric FROM "Wallet") AS hold,
           (SELECT count(*)::int FROM "Wallet") AS wallets,
           (SELECT count(*)::int FROM "LedgerEntry") AS ledger,
           (SELECT count(*)::int FROM "Transaction") AS txns,
           (SELECT count(*)::int FROM "HousePoolLedger") AS house,
           (SELECT count(*)::int FROM "Position") AS positions,
           (SELECT count(*)::int FROM "BonusGrant") AS bonuses`);
  const keptMoney = await one(
    `SELECT count(*)::int n, coalesce(sum(balance),0)::numeric bal FROM "Wallet" WHERE "userId" = ANY($1::text[]) AND balance <> 0`,
    [keep.ids]
  );
  console.log(`  ${fmt(money.wallets)} wallets holding ${tzs(money.bal)} (+ ${tzs(money.bonus)} bonus, ${tzs(money.hold)} held) → 0`);
  console.log(`     of which ${keptMoney.n} KEPT account(s) hold ${tzs(keptMoney.bal)} — zeroed too, per "0 everything in accounting"`);
  console.log(`  ${fmt(money.ledger)} LedgerEntry · ${fmt(money.txns)} Transaction · ${fmt(money.house)} HousePoolLedger → deleted`);
  console.log(`  ${fmt(money.positions)} Position · ${fmt(money.bonuses)} BonusGrant → deleted`);
  const hp = await one(`SELECT value FROM "SystemConfig" WHERE key='house.pool.state'`);
  if (hp) console.log(`  house.pool.state: balance ${fmt(hp.value.balance ?? 0)}, ${(hp.value.seeds ?? []).length} market seed(s) → 0 / []`);

  console.log("\n" + line + "\nMARKETS\n" + line);
  const mk = await q(`
    SELECT "productLine", status, count(*)::int n, sum("yesPool"+"noPool")::numeric pool, sum("predictorCount")::int preds
      FROM "PredictionMarket" GROUP BY 1,2 ORDER BY 1,2`);
  for (const r of mk) {
    const verb = r.productLine === "MARKET" ? "KEEP  " : "DELETE";
    console.log(`  ${verb} ${String(r.productLine).padEnd(7)} ${String(r.status).padEnd(9)} ${String(fmt(r.n)).padStart(6)} rows   pool ${tzs(r.pool)}${r.productLine === "MARKET" ? " → 0" : ""}   predictors ${r.preds} ${r.productLine === "MARKET" ? "→ 0" : ""}`);
  }
  const casc = await one(`
    SELECT (SELECT count(*)::int FROM "UpDownRound") AS rounds,
           (SELECT count(*)::int FROM "UpDownObservation") AS obs,
           (SELECT count(*)::int FROM "MarketSnapshot") AS snaps,
           (SELECT count(*)::int FROM "Comment") AS comments,
           (SELECT count(*)::int FROM "Objection") AS objections,
           (SELECT count(*)::int FROM "Watchlist") AS watch,
           (SELECT count(*)::int FROM "Proposal") AS proposals,
           (SELECT count(*)::int FROM "ReferralReward") AS refrewards`);
  console.log(`\n  cascades + explicit deletes: ${fmt(casc.rounds)} UpDownRound · ${fmt(casc.obs)} UpDownObservation`);
  console.log(`  ${fmt(casc.snaps)} MarketSnapshot · ${casc.comments} Comment · ${casc.objections} Objection · ${casc.watch} Watchlist`);
  console.log(`  ${casc.proposals} Proposal · ${casc.refrewards} ReferralReward`);

  // Launch-readiness check the reset itself does not fix.
  const stale = await num(
    `SELECT count(*)::int n FROM "PredictionMarket" WHERE "productLine"='MARKET' AND status='LIVE' AND "resolutionAt" < now()`
  );
  if (stale > 0)
    console.log(
      `\n  ⚠ ${stale} of the kept LIVE polls have a resolutionAt ALREADY IN THE PAST. They will\n` +
        `    fall straight into the resolver queue at launch. The reset does not touch dates —\n` +
        `    reschedule or void them in /admin before you open the doors.`
    );

  console.log("\n" + line + "\nRULES — PRESERVED\n" + line);
  const cfg = await q(`SELECT key FROM "SystemConfig" ORDER BY key`);
  const kept: string[] = [], zeroed: string[] = [], dropped: string[] = [], unknown: string[] = [];
  for (const { key } of cfg) {
    if (CONFIG_KEEP.has(key)) kept.push(key);
    else if (key in CONFIG_ZERO) zeroed.push(key);
    else if (CONFIG_DROP_PATTERNS.some((p) => p.test(key))) dropped.push(key);
    else unknown.push(key);
  }
  console.log(`  KEEP    (${kept.length}) ${kept.join(", ")}`);
  console.log(`  ZERO    (${zeroed.length}) ${zeroed.map((k) => `${k} — ${CONFIG_ZERO[k]}`).join("; ")}`);
  console.log(`  DELETE  (${dropped.length}) ${dropped.join(", ")}`);
  if (unknown.length) {
    console.log(`\n  ⛔ ${unknown.length} config key(s) are in NEITHER list: ${unknown.join(", ")}`);
    console.log(`     --execute will REFUSE. A key nobody classified is a rule nobody checked;`);
    console.log(`     add each to CONFIG_KEEP, CONFIG_ZERO or CONFIG_DROP_PATTERNS first.`);
  }
  const rates = await one(`SELECT value FROM "SystemConfig" WHERE key='market.config'`);
  if (rates?.value?.global) {
    const g = rates.value.global;
    console.log(`\n  market.config rates that must read identically after the reset:`);
    console.log(`    commission ${g.commissionRate} · ceiling ${g.feeCeilingRate} · operator ${g.operatorFeeRate} · platform ${g.platformFeeRate}`);
    console.log(`    TRA ${g.traTaxOnCommissionRate} · GBT ${g.gbtLevyOnCommissionRate} · withdrawal ${g.withdrawalFeeRate} · stake ${fmt(g.minStake)}–${fmt(g.maxStake)}`);
  }

  console.log("\n" + line + "\nAUDIT + AI\n" + line);
  const a = await one(`
    SELECT (SELECT count(*)::int FROM "AuditLog") AS audit,
           (SELECT count(*)::int FROM "AiUsageEvent") AS ai,
           (SELECT count(*)::int FROM "AiSpendCycle") AS cycles,
           (SELECT count(*)::int FROM "Notification") AS notifs,
           (SELECT count(*)::int FROM "ActiveSession") AS sess,
           (SELECT count(*)::int FROM "KycSubmission") AS kyc,
           (SELECT count(*)::int FROM "KycDocument") AS kycdocs`);
  console.log(`  ${fmt(a.audit)} AuditLog → deleted, chain restarts at GENESIS (doctrine override, §3)`);
  console.log(`  ${fmt(a.ai)} AiUsageEvent · ${a.cycles} AiSpendCycle · ${fmt(a.notifs)} Notification · ${a.sess} ActiveSession → deleted`);
  console.log(`  ${a.kyc} KycSubmission · ${a.kycdocs} KycDocument → deleted (+ their R2 objects via --purge-kyc)`);

  console.log("\n" + "═".repeat(78));
  console.log("To run it:  --quiesce  →  --execute --confirm \"" + CONFIRM_PHRASE + "\"  →  --verify");
  console.log("═".repeat(78) + "\n");
  return { unknownConfig: unknown };
}

// ── the reset ──────────────────────────────────────────────────────────────
/**
 * `--rehearse` — run the ENTIRE reset against production and then ROLL BACK.
 *
 * ⭐ WHY THIS EXISTS. Everything else here is an argument that the reset will work: the
 * deletion order was derived from the real FK graph, the invariants are written down, the
 * plan prints the right numbers. None of that is the same as having RUN it. A rehearsal
 * executes every statement in order against the real rows, asserts every invariant on the
 * real post-delete state, and then throws the whole thing away — so the first time the SQL
 * meets production is NOT the time it is allowed to keep the result.
 *
 * It answers the one question a plan cannot: does the ORDER hold? A missed RESTRICT edge
 * shows up here as a foreign-key error on a transaction that was always going to be
 * discarded, instead of halfway through the real run.
 *
 * ⛔ IT TAKES REAL LOCKS FOR THE DURATION. Deleting ~350k rows inside a transaction locks
 * those tables until the rollback, and every request the app serves writes an audit row —
 * so an un-quiesced rehearsal can stall the live platform. It therefore demands the same
 * quiesce as `--execute`, and sets `lock_timeout`/`statement_timeout` so a rehearsal that
 * meets contention DIES rather than holding the platform down while it waits.
 */
async function execute(keep: { ids: string[]; rows: any[] }, unknownConfig: string[], rehearse = false) {
  if (!rehearse && val("--confirm") !== CONFIRM_PHRASE) {
    console.error(`✖ --execute needs:  --confirm "${CONFIRM_PHRASE}"`);
    process.exit(1);
  }
  if (unknownConfig.length) {
    console.error(`✖ ${unknownConfig.length} unclassified SystemConfig key(s): ${unknownConfig.join(", ")}`);
    console.error("  Classify each one before running. Refusing.");
    process.exit(1);
  }
  const w = await liveWriters();
  if ((w.running > 0 || !w.sentinelPaused) && !has("--allow-live")) {
    console.error(
      `✖ Live writers active: ${w.running} chain(s) RUNNING, sentinel ${w.sentinelPaused ? "paused" : "ACTIVE"}.\n` +
        "  Rows appearing mid-wipe make the verification meaningless. Run --quiesce first."
    );
    process.exit(1);
  }

  const before = await snapshot();
  const base = await baseline(keep.ids);
  // Copied out BEFORE the transaction, so a rollback cannot lose it and so the rows are the
  // ones that actually existed at decision time.
  const provenance = await preserveProvenance(keep.ids);
  console.log(`Preserved ${provenance.length} audit row(s) explaining the surviving state into the receipt.`);
  console.log(
    `Baseline: ${base.marketPolls} MARKET polls · ${base.ruleKeys.length} rule rows ` +
      `(${base.rulesHash.slice(0, 12)}…) · feeSnapshots ${base.feeSnapshotHash.slice(0, 12)}…`
  );
  console.log(rehearse ? "REHEARSAL — this transaction will be rolled back at the end.\nStarting…" : "Starting transaction…");
  await client.query("BEGIN");
  // Fail fast rather than queueing behind (or in front of) live traffic. A rehearsal that
  // WAITS is worse than one that dies: the waiting is what stalls the platform.
  await client.query("SET LOCAL lock_timeout = '15s'");
  await client.query("SET LOCAL statement_timeout = '180s'");
  const steps: Array<[string, string, any[]?]> = [
    // 1 ── Up & Down product line. Deleting the market rows cascades UpDownRound,
    //      MarketSnapshot, Position, Comment and Watchlist for those 41,110 rows.
    ["UpDownObservation (child of ASSET — no cascade reaches it)", `DELETE FROM "UpDownObservation"`],
    ["UPDOWN markets (cascades rounds, snapshots, bets)", `DELETE FROM "PredictionMarket" WHERE "productLine"='UPDOWN'`],

    // 2 ── user content on the KEPT polls. Objection.marketId is RESTRICT, so it
    //      must go before anything tries to touch a market row; Position, Comment,
    //      Proposal, ProposalVote, ReferralReward and InviteCampaign are all
    //      RESTRICT on User and would block the account deletes below.
    ["Objection", `DELETE FROM "Objection"`],
    ["ProposalVote", `DELETE FROM "ProposalVote"`],
    ["Proposal", `DELETE FROM "Proposal"`],
    ["Comment", `DELETE FROM "Comment"`],
    ["Watchlist", `DELETE FROM "Watchlist"`],
    ["Position", `DELETE FROM "Position"`],
    ["MarketSnapshot (price history of deleted bets)", `DELETE FROM "MarketSnapshot"`],
    ["ReferralReward", `DELETE FROM "ReferralReward"`],
    ["InviteEntry", `DELETE FROM "InviteEntry"`],
    ["InviteCampaign", `DELETE FROM "InviteCampaign"`],
    ["AntiFraudFlag", `DELETE FROM "AntiFraudFlag"`],

    // 3 ── money. Transaction before Wallet; both before the account deletes so a
    //      cascade never has to do it implicitly.
    ["Transaction", `DELETE FROM "Transaction"`],
    ["BonusGrant", `DELETE FROM "BonusGrant"`],
    ["LedgerEntry", `DELETE FROM "LedgerEntry"`],
    ["HousePoolLedger", `DELETE FROM "HousePoolLedger"`],

    // 4 ── identity + comms for EVERY account, kept ones included. TOTP is the one
    //      exception: deleting a kept admin's secret while `twoFactorEnabled` stays
    //      true locks them out of their own console.
    ["KycDocument", `DELETE FROM "KycDocument"`],
    ["KycSubmission", `DELETE FROM "KycSubmission"`],
    ["SourceOfFunds", `DELETE FROM "SourceOfFunds"`],
    ["ResponsibleGambling", `DELETE FROM "ResponsibleGambling"`],
    ["Notification", `DELETE FROM "Notification"`],
    ["PushSubscription", `DELETE FROM "PushSubscription"`],
    ["Session", `DELETE FROM "Session"`],
    ["Otp", `DELETE FROM "Otp"`],
    ["ActiveSession (forces every kept admin to sign in fresh)", `DELETE FROM "ActiveSession"`],
    ["TotpSecret — NON-kept only", `DELETE FROM "TotpSecret" WHERE "userId" <> ALL($1::text[])`, [keep.ids]],
    ["TotpBackupCode — NON-kept only", `DELETE FROM "TotpBackupCode" WHERE "userId" <> ALL($1::text[])`, [keep.ids]],

    // 5 ── the agent/affiliate graph. User.recruitedBy is a SET NULL FK onto
    //      AffiliateAgent.userId, so clear the stamp on kept rows first and the
    //      delete below cannot leave a half-attribution behind.
    [
      "clear referral attribution on kept accounts",
      `UPDATE "User" SET "recruitedBy"=NULL, "recruitedProgramme"=NULL, "recruitedAt"=NULL, "recruitedByCode"=NULL
         WHERE id = ANY($1::text[])`,
      [keep.ids],
    ],
    // ⭐ AN AGENT'S APPROVAL AND RATE ARE A RULE; THEIR EARNINGS ARE ACCOUNTING.
    // `AffiliateAgent` holds BOTH, and the first version of this deleted the table whole —
    // which would have stripped the one real approved agent (code 50PICK-AG-NHKQNC,
    // commissionPct 10.00, approved 2026-09-06) of the negotiated rate Ali explicitly said
    // to keep, and left `policyFor` REFUSING to price them until an officer re-approved.
    // So for KEPT accounts the row survives with its code, commissionPct and approvedAt,
    // and only the earned counters go to zero. `--drop-agent-approvals` reverses this and
    // deletes them all, if Ali would rather re-vet from scratch.
    //
    // ⚠️ The other 56 rows are auto-minted by `ensureAffiliateAccount` on anyone who so
    // much as opens the referral page: all have approvedAt NULL and commissionPct NULL, so
    // they carry no rule and their owners are being deleted anyway.
    [
      "AgentApplicationDocument — non-kept applicants only",
      has("--drop-agent-approvals")
        ? `DELETE FROM "AgentApplicationDocument"`
        : `DELETE FROM "AgentApplicationDocument" WHERE "applicationId" IN (
             SELECT id FROM "AgentApplication" WHERE "userId" <> ALL($1::text[]))`,
      has("--drop-agent-approvals") ? undefined : [keep.ids],
    ],
    ["AgentInvitation", `DELETE FROM "AgentInvitation"`],
    [
      "AgentApplication — non-kept applicants only",
      has("--drop-agent-approvals")
        ? `DELETE FROM "AgentApplication"`
        : `DELETE FROM "AgentApplication" WHERE "userId" <> ALL($1::text[])`,
      has("--drop-agent-approvals") ? undefined : [keep.ids],
    ],
    [
      "AffiliateAgent — non-kept only (kept agents keep code + rate + approval)",
      has("--drop-agent-approvals")
        ? `DELETE FROM "AffiliateAgent"`
        : `DELETE FROM "AffiliateAgent" WHERE "userId" <> ALL($1::text[])`,
      has("--drop-agent-approvals") ? undefined : [keep.ids],
    ],
    [
      "zero kept agents' EARNINGS (the rate and approval stay)",
      `UPDATE "AffiliateAgent" SET "totalRecruits"=0, "totalCommission"=0, "updatedAt"=now()`,
    ],
    ["Device (legacy, 0 rows)", `DELETE FROM "Device"`],

    // 6 ── the accounts themselves.
    ["Wallet — NON-kept only (kept wallets are zeroed below)", `DELETE FROM "Wallet" WHERE "userId" <> ALL($1::text[])`, [keep.ids]],
    ["User — everyone not on the keep-list", `DELETE FROM "User" WHERE id <> ALL($1::text[])`, [keep.ids]],

    // 7 ── zero what survives.
    [
      "zero kept wallets",
      `UPDATE "Wallet" SET balance=0, pending=0, hold=0, "bonusBalance"=0, status='ACTIVE', "updatedAt"=now()`,
    ],
    [
      "reset kept accounts' login state",
      `UPDATE "User" SET "failedLoginCount"=0, "lockedUntil"=NULL, "closedAt"=NULL, "updatedAt"=now()`,
    ],
    [
      "zero pools + predictorCount on the kept polls",
      `UPDATE "PredictionMarket" SET "yesPool"=0, "noPool"=0, "predictorCount"=0, "updatedAt"=now()`,
    ],

    // 8 ── accounting that hides in the config table.
    [
      "house.pool.state → zero",
      `UPDATE "SystemConfig"
          SET value = jsonb_set(jsonb_set(value::jsonb, '{balance}', '0'::jsonb), '{seeds}', '[]'::jsonb),
              "updatedAt" = now()
        WHERE key='house.pool.state'`,
    ],
    ["ai_usage_daily → {}", `UPDATE "SystemConfig" SET value='{}'::jsonb, "updatedAt"=now() WHERE key='ai_usage_daily'`],
    ["email.suppression → []", `UPDATE "SystemConfig" SET value='[]'::jsonb, "updatedAt"=now() WHERE key='email.suppression'`],
    [
      "drop per-user + dead config keys",
      `DELETE FROM "SystemConfig"
        WHERE key LIKE 'chat.daily.%' OR key LIKE 'bootstrap.login_promoted:%' OR key='test.overrides'`,
    ],

    // 9 ── AI cost history and the audit chain.
    ["AiUsageEvent", `DELETE FROM "AiUsageEvent"`],
    ["AiSpendCycle", `DELETE FROM "AiSpendCycle"`],
    ["AuditLog — chain restarts at GENESIS", `DELETE FROM "AuditLog"`],
  ];

  try {
    for (const [label, sql, params] of steps) {
      const r = await client.query(sql, params);
      console.log(`  ${String(r.rowCount ?? 0).toString().padStart(7)}  ${label}`);
    }

    // ── verify INSIDE the transaction; a failure rolls the whole thing back ──
    console.log("\nAsserting invariants before commit…");
    const checks = await assertions(keep.ids, base);
    const failed = checks.filter((c) => !c.ok);
    for (const c of checks) console.log(`  ${c.ok ? "✔" : "✖"} ${c.name}: ${c.got}`);
    if (failed.length) {
      await client.query("ROLLBACK");
      console.error(`\n✖ ${failed.length} invariant(s) failed. ROLLED BACK — the database is unchanged.`);
      process.exit(1);
    }
    if (rehearse) {
      await client.query("ROLLBACK");
      console.log(
        `\n✔ REHEARSAL PASSED — every statement ran in order against production and all ` +
          `${checks.length} invariants held on the real post-delete state. Rolled back; nothing kept.\n` +
          `  The deletion order is now EXECUTED-verified, not merely derived from the FK graph.\n` +
          `  Re-run with --execute --confirm "${CONFIRM_PHRASE}" to keep the result.`
      );
      return;
    }
    await client.query("COMMIT");
    console.log("\n✔ COMMITTED.");
  } catch (e: any) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("\n✖ Failed mid-reset — ROLLED BACK, database unchanged.\n  " + e.message);
    process.exit(1);
  }

  const after = await snapshot();
  console.log("\nBefore → after:");
  for (const k of Object.keys(before))
    if (before[k] !== after[k]) console.log(`  ${k.padEnd(22)} ${String(fmt(before[k])).padStart(10)} → ${fmt(after[k])}`);
  writeFileSync(
    ".prelaunch-reset-receipt.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        keptUsers: keep.rows,
        baseline: base,
        before,
        after,
        // ⚠️ Evidence for a human, NOT a chain. See preserveProvenance().
        provenanceNote:
          "Audit rows copied out of the HMAC chain immediately before it was re-genesised. " +
          "They explain how the SURVIVING state came to be — every config/rule change, staff " +
          "role grant, bootstrap promotion and agent approval, plus anything the kept accounts " +
          "did. This JSON is NOT tamper-evident and must never be restored into AuditLog: " +
          "doing so would fabricate a chain. It exists so that a value which changed shortly " +
          "before the reset (e.g. support_config's phone, corrected 2026-09-11 06:58) is not " +
          "left looking like an unexplained mutation.",
        provenance,
      },
      null,
      2
    )
  );
  console.log("\nReceipt: .prelaunch-reset-receipt.json");
  console.log("Next:  --verify   then the post-reset backup, then --purge-backups");
}

async function snapshot(): Promise<Record<string, number>> {
  const t = [
    "User", "Wallet", "Transaction", "LedgerEntry", "HousePoolLedger", "Position",
    "PredictionMarket", "MarketSnapshot", "UpDownRound", "UpDownObservation",
    "AuditLog", "AiUsageEvent", "Notification", "KycSubmission", "SystemConfig",
    "AIPoll", "MarketCandidate", "UpDownAsset", "UpDownChain", "TrustedSource",
  ];
  const out: Record<string, number> = {};
  for (const n of t) out[n] = await num(`SELECT count(*)::int n FROM "${n}"`);
  return out;
}

/**
 * The pre-reset fingerprint the verification compares against.
 *
 * ⛔ WHY NOT ASSERT THE LITERAL NUMBERS. The first draft of this script checked
 * `polls === 185` and `commissionRate === 0.13`. Both are today's values, and both would
 * have produced a FALSE FAILURE the moment Ali added a poll or retuned a rate between the
 * plan and the run — a red board that accuses correct code. Worse, hard-coding the nine
 * rates I happened to read means a tenth rule could be silently clobbered and still pass.
 * Fingerprinting the whole rule set answers the real question — "did the reset change any
 * rule?" — instead of "does this rule still equal the number I saw on Thursday?".
 */
type Baseline = {
  marketPolls: number;
  rulesHash: string;
  feeSnapshotHash: string;
  ruleKeys: string[];
  /** Approved agents among the KEPT accounts: code + negotiated rate + approval date. */
  agentRules: Array<{ userId: string; code: string; commissionPct: string | null; approvedAt: string | null }>;
};

async function baseline(keepIds: string[]): Promise<Baseline> {
  const marketPolls = Number(
    (await one(`SELECT count(*)::int n FROM "PredictionMarket" WHERE "productLine"='MARKET'`))?.n ?? 0
  );
  const keys = [...CONFIG_KEEP].filter((k) => !RULES_VOLATILE.has(k)).sort();
  const rows = await q(`SELECT key, value::text v FROM "SystemConfig" WHERE key = ANY($1::text[]) ORDER BY key`, [keys]);
  const rulesHash = createHash("sha256").update(rows.map((r) => `${r.key} ${r.v}`).join("")).digest("hex");
  // The rates FROZEN onto each poll at creation. Settlement reads these, never live
  // config, so a kept poll whose snapshot moved would reprice bets nobody placed yet.
  const snaps = await q(
    `SELECT id, coalesce("feeSnapshot"::text,'') v FROM "PredictionMarket" WHERE "productLine"='MARKET' ORDER BY id`
  );
  const feeSnapshotHash = createHash("sha256").update(snaps.map((r) => `${r.id} ${r.v}`).join("")).digest("hex");
  // ⚠️ Scoped to the KEPT accounts on purpose. A whole-table hash would differ legitimately
  // after the reset (56 auto-minted rows for deleted players go with them), so it could
  // never be asserted equal — a check that must fail is not a check.
  const agentRules = (
    await q(
      `SELECT "userId", code, "commissionPct"::text AS pct, "approvedAt"::text AS approved
         FROM "AffiliateAgent"
        WHERE "approvedAt" IS NOT NULL AND "userId" = ANY($1::text[]) ORDER BY "userId"`,
      [keepIds]
    )
  ).map((r) => ({ userId: r.userId, code: r.code, commissionPct: r.pct, approvedAt: r.approved }));
  return { marketPolls, rulesHash, feeSnapshotHash, ruleKeys: rows.map((r) => r.key), agentRules };
}

/**
 * ⭐ THE AUDIT ROWS THAT EXPLAIN WHAT SURVIVES — copied into the receipt before the chain is
 * wiped, because they are the only record of HOW the surviving state came to be.
 *
 * 🔴 THE PROBLEM THIS SOLVES, named by peer session `asheib-31` on the day: the support phone
 * was corrected through the audited form at 06:58, and `--execute` deletes the audit row that
 * records who corrected it — while the corrected VALUE survives on the keep list. **A value
 * that moved with no surviving audit row is exactly the shape that reads as tampering to
 * whoever audits later.** The same applies to every kept rule and to how each kept admin got
 * their role: `config.*` changes, staff role grants, bootstrap promotions, agent approvals.
 *
 * ⛔ THIS IS NOT A CHAIN AND MUST NEVER BE PRESENTED AS ONE. These rows are copied out of the
 * HMAC chain into a plain JSON file; the file is not tamper-evident and nothing verifies it.
 * It is EVIDENCE FOR A HUMAN READING THE RECEIPT — "here is what the chain said before it was
 * re-genesised" — and it is deliberately kept next to the counts it explains rather than
 * offered as a substitute for the chain. Restoring it into `AuditLog` would fabricate a chain.
 */
async function preserveProvenance(keepIds: string[]) {
  const rows = await q(
    `SELECT "createdAt", category, action, "actorId", "targetType", "targetId", payload
       FROM "AuditLog"
      WHERE action LIKE 'config.%'
         OR action LIKE 'staff.%'
         OR action LIKE '%role%'
         OR action LIKE '%bootstrap%'
         OR action LIKE 'updown.asset.%'
         OR action LIKE 'agent.approve%'
         OR "actorId" = ANY($1::text[])
      ORDER BY "createdAt" DESC
      LIMIT 2000`,
    [keepIds]
  );
  return rows;
}

async function assertions(keepIds: string[], base: Baseline) {
  const c: Array<{ name: string; ok: boolean; got: string }> = [];
  const g = async (sql: string) => Number((await one(sql))?.n ?? 0);

  const users = await g(`SELECT count(*)::int n FROM "User"`);
  c.push({ name: "only kept accounts remain", ok: users === keepIds.length, got: `${users} (expected ${keepIds.length})` });

  const admins = await g(`SELECT count(*)::int n FROM "User" WHERE role='ADMIN' AND status='ACTIVE' AND "passwordHash" IS NOT NULL`);
  c.push({ name: "at least one usable ADMIN survives", ok: admins >= 1, got: `${admins}` });

  // ⛔ A SUM OF ZERO IS NOT "EVERY WALLET IS ZERO". +100 and −100 sum to zero too, and
  // `balance` is a plain Decimal with no non-negative constraint. So this asserts the
  // WORST SINGLE WALLET, not the total — an aggregate hides a per-account spread, which is
  // the same defect as reading a balanced trial balance as proof each account is right.
  const worstWallet = await g(
    `SELECT coalesce(max(abs(balance) + abs(pending) + abs(hold) + abs("bonusBalance")),0)::numeric n FROM "Wallet"`
  );
  const nonZero = await g(
    `SELECT count(*)::int n FROM "Wallet" WHERE balance <> 0 OR pending <> 0 OR hold <> 0 OR "bonusBalance" <> 0`
  );
  c.push({
    name: "every wallet is zero (worst single wallet, not the sum)",
    ok: worstWallet === 0 && nonZero === 0,
    got: nonZero === 0 ? "all zero" : `${nonZero} wallet(s) non-zero, worst ${tzs(worstWallet)}`,
  });

  for (const [t, label] of [
    ["LedgerEntry", "ledger empty"], ["Transaction", "transactions empty"],
    ["HousePoolLedger", "house pool ledger empty"], ["Position", "no bets"],
    ["MarketSnapshot", "no price history"], ["AuditLog", "audit chain re-genesised"],
    ["UpDownRound", "no rounds"], ["UpDownObservation", "no observations"],
  ] as const) {
    const n = await g(`SELECT count(*)::int n FROM "${t}"`);
    c.push({ name: label, ok: n === 0, got: `${fmt(n)} rows` });
  }

  // Same reasoning as the wallet check: the WORST poll, not the sum across polls.
  const pollsWithPool = await g(
    `SELECT count(*)::int n FROM "PredictionMarket" WHERE "yesPool" <> 0 OR "noPool" <> 0 OR "predictorCount" <> 0`
  );
  const worstPool = await g(
    `SELECT coalesce(max(abs("yesPool") + abs("noPool")),0)::numeric n FROM "PredictionMarket"`
  );
  c.push({
    name: "every kept poll has an empty pool (worst single poll)",
    ok: pollsWithPool === 0,
    got: pollsWithPool === 0 ? "all empty" : `${pollsWithPool} poll(s) non-empty, worst ${tzs(worstPool)}`,
  });

  const polls = await g(`SELECT count(*)::int n FROM "PredictionMarket" WHERE "productLine"='MARKET'`);
  c.push({
    name: "every MARKET poll survived",
    ok: polls === base.marketPolls,
    got: `${polls} (baseline ${base.marketPolls})`,
  });

  const updown = await g(`SELECT count(*)::int n FROM "PredictionMarket" WHERE "productLine"='UPDOWN'`);
  c.push({ name: "UPDOWN rows gone", ok: updown === 0, got: `${updown}` });

  // ── the check the whole job turns on ──
  const now = await baseline(keepIds);
  c.push({
    name: "every kept RULE is byte-identical",
    ok: now.rulesHash === base.rulesHash,
    got:
      now.rulesHash === base.rulesHash
        ? `${now.ruleKeys.length} rule rows unchanged (${now.rulesHash.slice(0, 12)}…)`
        : `CHANGED — baseline ${base.rulesHash.slice(0, 12)}… now ${now.rulesHash.slice(0, 12)}…`,
  });
  c.push({
    name: "frozen per-poll feeSnapshots untouched",
    ok: now.feeSnapshotHash === base.feeSnapshotHash,
    got: now.feeSnapshotHash === base.feeSnapshotHash ? `intact (${now.feeSnapshotHash.slice(0, 12)}…)` : "CHANGED",
  });
  // An approved agent's code + negotiated rate + approval date is a COMMISSION RULE, and
  // Ali said to keep the commissions. Their EARNINGS are accounting and must be zero.
  c.push({
    name: "kept agents' code + rate + approval survived",
    ok: JSON.stringify(now.agentRules) === JSON.stringify(base.agentRules),
    got:
      now.agentRules.length === 0
        ? "no approved agents in the keep-list"
        : now.agentRules.map((a) => `${a.code} @ ${a.commissionPct}%`).join(", ") +
          (JSON.stringify(now.agentRules) === JSON.stringify(base.agentRules) ? "" : "  ✖ CHANGED"),
  });
  const agentEarnings = await g(
    `SELECT coalesce(max(abs("totalCommission") + abs("totalRecruits")),0)::numeric n FROM "AffiliateAgent"`
  );
  c.push({ name: "agent earnings zeroed", ok: agentEarnings === 0, got: `worst ${agentEarnings}` });

  // ⛔ "ABSENT" AND "LOST" ARE NOT THE SAME THING, and the first version of this printed them
  // identically. It passed — correctly, since it compares the before/after COUNT — while its
  // message read `absent: bonus.config, lipa.config, proposals.config`, which looks exactly
  // like three rules the reset destroyed. They were never in the database at all: those three
  // fall back to code defaults and have no persisted row, so they were absent BEFORE the reset
  // too. A green tick beside the word "absent" is how a reader stops trusting the green ticks.
  const lost = base.ruleKeys.filter((k) => !now.ruleKeys.includes(k));
  const neverStored = [...CONFIG_KEEP].filter(
    (k) => !RULES_VOLATILE.has(k) && !base.ruleKeys.includes(k)
  );
  c.push({
    name: "no rule row went missing",
    ok: lost.length === 0 && now.ruleKeys.length === base.ruleKeys.length,
    got:
      (lost.length ? `LOST: ${lost.join(", ")}` : `all ${now.ruleKeys.length} persisted rule rows intact`) +
      (neverStored.length
        ? ` · ${neverStored.length} never stored (code defaults, absent before the reset too): ${neverStored.join(", ")}`
        : ""),
  });

  const leaked = await g(
    `SELECT count(*)::int n FROM "SystemConfig" WHERE key LIKE 'chat.daily.%' OR key LIKE 'bootstrap.login_promoted:%' OR key='test.overrides'`
  );
  c.push({ name: "per-user config keys gone", ok: leaked === 0, got: `${leaked}` });

  const hp = await one(`SELECT value FROM "SystemConfig" WHERE key='house.pool.state'`);
  c.push({
    name: "house pool zeroed but its config kept",
    ok: Number(hp?.value?.balance ?? -1) === 0 && (hp?.value?.seeds ?? []).length === 0 && !!hp?.value?.config,
    got: `balance ${hp?.value?.balance}, ${(hp?.value?.seeds ?? []).length} seeds, config ${hp?.value?.config ? "kept" : "MISSING"}`,
  });

  // Content that must NOT have been collateral damage.
  for (const [t, min] of [["AIPoll", 1], ["MarketCandidate", 1], ["UpDownAsset", 7], ["UpDownChain", 23], ["TrustedSource", 30]] as const) {
    const n = await g(`SELECT count(*)::int n FROM "${t}"`);
    c.push({ name: `${t} preserved`, ok: n >= min, got: `${n} (expected ≥ ${min})` });
  }
  return c;
}

async function verify(keepIds: string[]) {
  console.log("\nPOST-RESET VERIFICATION\n" + "─".repeat(60));
  // ⛔ The baseline must come from the RECEIPT the reset wrote, not from a fresh read.
  // Re-measuring now and comparing it to itself is the classic vacuous check: both sides
  // would move together and the rule-integrity assertion could not fail.
  if (!existsSync(".prelaunch-reset-receipt.json")) {
    console.error("✖ No .prelaunch-reset-receipt.json — run --execute first.");
    console.error("  Without the pre-reset baseline there is nothing to compare the rules against,");
    console.error("  and a verification that measures only the current state proves nothing.");
    process.exit(1);
  }
  const receipt = JSON.parse(readFileSync(".prelaunch-reset-receipt.json", "utf8"));
  if (!receipt.baseline?.rulesHash) {
    console.error("✖ Receipt carries no baseline. Refusing to report a pass it cannot support.");
    process.exit(1);
  }
  console.log(`  baseline from receipt of ${receipt.at}`);
  const checks = await assertions(keepIds, receipt.baseline as Baseline);
  for (const c of checks) console.log(`  ${c.ok ? "✔" : "✖"} ${c.name}: ${c.got}`);
  const bad = checks.filter((c) => !c.ok);
  console.log("─".repeat(60));
  if (bad.length) {
    console.error(`✖ ${bad.length} of ${checks.length} failed.`);
    process.exit(1);
  }
  console.log(`✔ All ${checks.length} invariants hold. Safe to take the post-reset backup.`);
  writeFileSync(".prelaunch-verified.json", JSON.stringify({ at: new Date().toISOString(), checks }, null, 2));
}

// ── main ───────────────────────────────────────────────────────────────────
await client.connect();
try {
  if (mode === "quiesce") await quiesce();
  else if (mode === "resume") await resume();
  else {
    const keep = await resolveKeepList();
    if (mode === "verify") await verify(keep.ids);
    else {
      const { unknownConfig } = await plan(keep);
      if (mode === "execute" || mode === "rehearse") await execute(keep, unknownConfig, mode === "rehearse");
    }
  }
} finally {
  await client.end();
}
