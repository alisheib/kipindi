/**
 * `npm run db:verify-backup -- --file <backup>` — prove a backup actually restores.
 *
 * A backup you have never restored is not a backup. It is a file you feel good
 * about. This replaces the feeling with evidence, and it is the ONLY thing in this
 * repo permitted to record a healthy backup state for `/admin/compliance`.
 *
 *   npm run db:verify-backup -- --file backups/50pick-full-<stamp>.sql.gz.enc
 *   npm run db:verify-backup -- --file <f> --record     # also update the compliance card
 *
 * WHAT IT DOES
 *   1. Opens the sealed artifact (AES-256-GCM ⇒ a wrong key or one flipped byte
 *      fails here, loudly, rather than restoring plausible garbage).
 *   2. Creates a THROWAWAY database on the scratch cluster and restores from empty.
 *   3. Checks every table's row count against the manifest.
 *   4. Recomputes every money invariant on the RESTORED data — wallet totals,
 *      ledger net, unbalanced groups, the audit chain head.
 *   5. Runs the platform's OWN `trialBalance()` and `verifyChainFull()` against the
 *      restored database. This is the part that matters: the proof is that 50pick's
 *      real integrity code passes on the recovered data, not that a bespoke query
 *      in this file agrees with a bespoke query in the dump. A gate that
 *      re-implements what it is checking is how three "green" gates in this repo
 *      sat on top of broken things.
 *   6. Confirms `AuditLog.seq` resumes ABOVE the restored maximum — otherwise the
 *      site comes back up looking perfect and then cannot write a single audit row.
 *   7. Checks referential integrity across the money tables.
 *   8. Prints a real restored wallet and its ledger trail, so a human can read it.
 *   9. Drops the throwaway database.
 *
 * PRODUCTION IS NEVER THE TARGET. The scratch cluster is rejected outright if it
 * resolves to a known production host — there is no override flag, because there is
 * no legitimate reason to restore a backup over the live money database as a test.
 * (`db:restore` is the deliberate, separately-guarded tool for a real recovery.)
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import pg from "pg";
import {
  BACKUP_KEY_ENV,
  NON_ASCII_FINGERPRINT_SQL,
  SHAPE_SQL,
  backupKey,
  isSealed,
  maskUrl,
  openBackup,
  readManifest,
  recordTargetFor,
  type BackupManifest,
} from "../src/lib/server/backup/core.ts";
import type { BackupRun } from "../src/lib/server/backup/state.ts";
import { BACKUP_STATE_KEY } from "../src/lib/server/backup/state.ts";

/** Hosts that are the live business. Never a verification target. */
const PRODUCTION_HOSTS = [/rlwy\.net$/i, /railway\.app$/i, /railway\.internal$/i, /50pick\.tz$/i];

/**
 * The database this process started against, captured BEFORE anything repoints it.
 *
 * Step 8 below sets `process.env.DATABASE_URL` to the scratch database so 50pick's
 * own `trialBalance()` and `verifyChainFull()` run against the restored copy. That
 * makes the original value unrecoverable later — and the original value is exactly
 * where backup health belongs, because it is the database the backup was taken from
 * and the one `/admin/compliance` reads.
 */
const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const has = (name: string): boolean => process.argv.includes(`--${name}`);

/** Single-quoted SQL literal, for the CREATE DATABASE options that cannot be bound. */
const quoteLit = (s: string): string => `'${s.replace(/'/g, "''")}'`;

/** Set to the source collation when the host could not reproduce it. Reported, never hidden. */
let collationFellBack: string | null = null;

/** Problems found in the SOURCE database, not in the backup. Surfaced to /admin/compliance. */
const sourceWarnings: string[] = [];

const failures: string[] = [];
let checks = 0;
function ok(label: string, cond: boolean, detail = ""): void {
  checks++;
  if (cond) console.log(`   OK   ${label}${detail ? `  ${detail}` : ""}`);
  else {
    console.log(`   FAIL ${label}${detail ? `  ${detail}` : ""}`);
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Decimal-safe comparison: these are money strings from Postgres, not floats. */
function sameMoney(a: string, b: string): boolean {
  const n = (s: string): number => Math.round(Number(s) * 100);
  return n(a) === n(b);
}

async function main(): Promise<void> {
  const file = arg("file");
  if (!file) {
    console.error("usage: npm run db:verify-backup -- --file <backup.sql.gz[.enc]> [--record]");
    process.exit(1);
  }

  // ── Scratch target ────────────────────────────────────────────────────────
  const scratchAdminUrl = arg("scratch") ?? process.env.VERIFY_DATABASE_URL;
  if (!scratchAdminUrl) {
    console.error(
      "No scratch cluster. Set VERIFY_DATABASE_URL (or pass --scratch <url>) to a\n" +
        "disposable Postgres this script may create and drop databases on.\n" +
        "  local: postgresql://postgres:pw@localhost:5433/postgres\n" +
        "  CI:    the workflow's own postgres service",
    );
    process.exit(1);
  }
  const scratchHost = new URL(scratchAdminUrl).hostname;
  if (PRODUCTION_HOSTS.some((re) => re.test(scratchHost))) {
    console.error(
      `\n!! REFUSING — the scratch cluster resolves to "${scratchHost}", which is production.\n` +
        `   Verification restores a full copy of the database; it never runs against the\n` +
        `   live money cluster. There is no override for this.\n`,
    );
    process.exit(2);
  }

  // ── 1. Open the artifact ──────────────────────────────────────────────────
  const raw = readFileSync(file);
  const sha256 = createHash("sha256").update(raw).digest("hex");
  const sealed = isSealed(raw);
  let sql: string;
  if (sealed) {
    let key: string | null = null;
    try {
      key = backupKey();
    } catch (e) {
      console.error(`!! ${(e as Error).message}`);
      process.exit(2);
    }
    if (!key) {
      console.error(`!! This backup is sealed and ${BACKUP_KEY_ENV} is not set.`);
      process.exit(2);
    }
    // Throws on a wrong key or a single corrupted byte — GCM authenticates.
    sql = gunzipSync(openBackup(raw, key)).toString("utf8");
  } else {
    sql = gunzipSync(raw).toString("utf8");
  }

  const manifest: BackupManifest | null = readManifest(sql);
  if (!manifest) {
    console.error("!! This backup has no manifest — it cannot self-verify. Re-take it with db:backup.");
    process.exit(2);
  }

  const expectedRows = Object.values(manifest.tables).reduce((a, b) => a + b, 0);
  console.log(`Backup:   ${file}`);
  console.log(`Sealed:   ${sealed ? "yes (AES-256-GCM, opened OK)" : "NO — plaintext"}`);
  console.log(`sha256:   ${sha256}`);
  console.log(`Taken:    ${manifest.takenAt}  from ${manifest.source}`);
  console.log(`Expects:  ${expectedRows} rows / ${Object.keys(manifest.tables).length} tables · ` +
    `${manifest.money.walletBalanceSum} TZS in ${manifest.tables.Wallet ?? 0} wallets · ` +
    `${manifest.audit.entries} audit entries`);
  // Read defensively: an artifact written before manifest v2 has no such field.
  if (manifest.undeclaredTables?.length) {
    console.log(
      `Undecl.:  ${manifest.undeclaredTables.join(", ")} — present in the source database but\n` +
      `          not in the schema it was dumped with (a migration ahead of its code).\n` +
      `          Backed up by introspection; their row counts are checked below like any other.`,
    );
  }
  console.log("");

  // ── 2. Throwaway database ─────────────────────────────────────────────────
  const scratchName = `kipindi_verify_${manifest.takenAt.replace(/\D/g, "").slice(0, 14)}_${process.pid}`;
  const admin = new pg.Client({ connectionString: scratchAdminUrl });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${JSON.stringify(scratchName)}`);
  // 🔴 CREATE DATABASE with no ENCODING inherits the CLUSTER's default, which on a
  // Windows initdb is WIN1252 — and the first real verification run died replaying 至
  // into it. The encoding is a property of the BACKUP, so it is taken from the manifest.
  // TEMPLATE template0 is required whenever encoding/locale differ from template1's.
  const enc = manifest.encoding;
  const name = JSON.stringify(scratchName);
  if (!enc) {
    await admin.query(`CREATE DATABASE ${name}`); // pre-v2 manifest; nothing to match
  } else {
    try {
      // Exact: same encoding AND same collation, so text also sorts the way it does in
      // production.
      await admin.query(
        `CREATE DATABASE ${name} TEMPLATE template0 ENCODING ${quoteLit(enc.encoding)} ` +
          `LC_COLLATE ${quoteLit(enc.collate)} LC_CTYPE ${quoteLit(enc.ctype)}`,
      );
    } catch {
      // Collation names are OS-specific — production's `en_US.utf8` is a libc locale that
      // simply does not exist on Windows, where the same locale is `English_United
      // States.1252`. ENCODING is the one that decides whether the DATA survives, so it
      // is required; collation only affects sort order and is allowed to differ, out loud.
      try {
        await admin.query(`CREATE DATABASE ${name} TEMPLATE template0 ENCODING ${quoteLit(enc.encoding)}`);
        collationFellBack = enc.collate;
      } catch (e2) {
        console.error(
          `\n!! Could not create a scratch database in ${enc.encoding}:\n   ${(e2 as Error).message}\n\n` +
            `   A target that cannot hold the source's character set cannot prove a restore.\n` +
            `   Re-create the scratch cluster:  npm run db:scratch -- --reset\n`,
        );
        await admin.end().catch(() => {});
        process.exit(2);
      }
    }
  }
  await admin.end();

  const scratchUrl = (() => {
    const u = new URL(scratchAdminUrl);
    u.pathname = `/${scratchName}`;
    return u.toString();
  })();
  console.log(`Scratch:  ${maskUrl(scratchUrl)}\n`);

  let recorded: BackupRun | null = null;
  /** Why `--record` wrote nothing. Non-null ⇒ this run exits non-zero. */
  let recordError: string | null = null;
  // Held outside the try so `finally` can close it before dropping the database.
  // An ioredis-style trap applies to pg too: a Client with no 'error' listener
  // re-throws an async server notice as an uncaught exception, which killed the
  // process before main().catch could report WHY the restore failed.
  let client: pg.Client | null = null;

  try {
    client = new pg.Client({ connectionString: scratchUrl });
    client.on("error", (e) => console.warn(`   note: scratch connection error: ${e.message}`));
    await client.connect();

    console.log("Restoring from empty...");
    const t0 = Date.now();
    // One simple-protocol query: the whole file, schema + data + sequences, inside
    // the BEGIN/COMMIT the dump carries. Either all of it lands or none does.
    await client.query(sql);
    console.log(`   restored in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

    // ── 3. Extensions. The restore already proved they install (the GIN indexes
    //      would not build otherwise) — this proves the manifest describes reality.
    if (manifest.extensions?.length) {
      console.log("Extensions:");
      const ex = await client.query<{ name: string; version: string }>(
        `select extname as name, extversion as version from pg_extension`,
      );
      const present = new Map(ex.rows.map((r) => [r.name, r.version]));
      for (const want of manifest.extensions) {
        ok(want.name.padEnd(22), present.has(want.name), `${present.get(want.name) ?? "MISSING"} / ${want.version}`);
      }
      console.log("");
    }

    // ── 3b. The restored database speaks the same charset as the source ──────
    //
    // Asserted rather than assumed, because the failure mode when it is wrong is not
    // always an error: a lenient target can accept the bytes and hand back mojibake, and
    // a Swahili or Chinese market title that comes back as garbage is data loss that
    // every row count in this file would still call a success.
    if (manifest.encoding) {
      const enc2 = await client.query<{ encoding: string; collate: string }>(
        `select pg_encoding_to_char(encoding) as encoding, datcollate as collate
           from pg_database where datname = current_database()`,
      );
      ok("charset matches the source".padEnd(22),
        enc2.rows[0].encoding === manifest.encoding.encoding,
        `${enc2.rows[0].encoding} / ${manifest.encoding.encoding}`);
      if (collationFellBack) {
        console.log(
          `   note  this host has no "${collationFellBack}" locale, so the throwaway uses ` +
          `${enc2.rows[0].collate}.\n` +
          `         Encoding — which decides whether the data survives — still matches. Text\n` +
          `         SORT ORDER was therefore not verified against production's collation.`,
        );
      }

      // And the content itself, not just the label on the database. Same query the dump
      // used, so the two cannot drift apart.
      const want = manifest.encoding.nonAscii;
      if (want && want.rows > 0) {
        const got = await client.query<{ rows: string; md5: string }>(NON_ASCII_FINGERPRINT_SQL);
        ok("multibyte rows".padEnd(22), Number(got.rows[0].rows) === want.rows,
          `${got.rows[0].rows} / ${want.rows}`);
        ok("🔴 non-ASCII text is byte-identical".padEnd(22), got.rows[0].md5 === want.md5,
          got.rows[0].md5 === want.md5
            ? `md5 ${want.md5.slice(0, 12)}… over ${want.rows} titles`
            : `md5 ${got.rows[0].md5.slice(0, 12)}… != ${want.md5.slice(0, 12)}… — MOJIBAKE`);
      } else if (want) {
        // Said out loud rather than counted as a pass. An assertion over an empty set is
        // true for any input, and a green tick that proves nothing is what this whole
        // toolchain exists to stop.
        console.log("   note  the source had no multibyte text — this run proves nothing about encoding");
      }
    }

    // ── 3c. STRUCTURE. The guarantees, not just the rows ─────────────────────
    //
    // 🔴 THE CHECK THAT WOULD HAVE CAUGHT THE WORST DEFECT IN THIS TOOLCHAIN. Every dump
    // written before 2026-07-30 was missing the 48 unique indexes that back a UNIQUE
    // constraint, and every other assertion in this file passed anyway: the rows were all
    // there, the wallets balanced, the audit chain verified. A restored database would
    // have accepted a Selcom payment credited twice, and two accounts on one NIDA.
    if (manifest.shape) {
      console.log("\nStructure vs manifest:");
      const s = await client.query<typeof manifest.shape>(SHAPE_SQL);
      const got = s.rows[0];
      for (const key of Object.keys(manifest.shape) as Array<keyof typeof manifest.shape>) {
        const flag = key === "uniqueIndexes" || key === "foreignKeys" ? "🔴 " : "";
        ok(`${flag}${key}`.padEnd(24), got[key] === manifest.shape[key], `${got[key]} / ${manifest.shape[key]}`);
      }
    }

    // ── 4. Row counts ────────────────────────────────────────────────────────
    console.log("\nRow counts vs manifest:");
    for (const [table, expected] of Object.entries(manifest.tables)) {
      const r = await client.query<{ n: string }>(`select count(*)::text n from "public".${JSON.stringify(table)}`);
      const actual = Number(r.rows[0].n);
      ok(table.padEnd(22), actual === expected, `${actual} / ${expected}`);
    }

    // ── 4. Money invariants, recomputed on the RESTORED data ─────────────────
    console.log("\nMoney invariants on the restored database:");
    const m = await client.query<{
      balance: string; pending: string; hold: string; bonus: string;
      ledger_entries: string; ledger_net: string; unbalanced: string;
    }>(`select
          coalesce((select sum("balance")      from "public"."Wallet"), 0)::text as balance,
          coalesce((select sum("pending")      from "public"."Wallet"), 0)::text as pending,
          coalesce((select sum("hold")         from "public"."Wallet"), 0)::text as hold,
          coalesce((select sum("bonusBalance") from "public"."Wallet"), 0)::text as bonus,
          (select count(*) from "public"."LedgerEntry")::text                    as ledger_entries,
          coalesce((select sum("amount") from "public"."LedgerEntry"), 0)::text  as ledger_net,
          (select count(*)::text from (select "groupId" from "public"."LedgerEntry"
             group by "groupId" having sum("amount") <> 0) g)                    as unbalanced`);
    const got = m.rows[0];
    ok("wallet balance total", sameMoney(got.balance, manifest.money.walletBalanceSum), `${got.balance} / ${manifest.money.walletBalanceSum}`);
    ok("wallet pending total", sameMoney(got.pending, manifest.money.walletPendingSum), `${got.pending} / ${manifest.money.walletPendingSum}`);
    ok("wallet hold total", sameMoney(got.hold, manifest.money.walletHoldSum), `${got.hold} / ${manifest.money.walletHoldSum}`);
    ok("wallet bonus total", sameMoney(got.bonus, manifest.money.walletBonusSum), `${got.bonus} / ${manifest.money.walletBonusSum}`);
    ok("ledger entry count", Number(got.ledger_entries) === manifest.money.ledgerEntries, `${got.ledger_entries} / ${manifest.money.ledgerEntries}`);
    ok("ledger net sum", sameMoney(got.ledger_net, manifest.money.ledgerNetSum), `${got.ledger_net} / ${manifest.money.ledgerNetSum}`);
    ok("unbalanced ledger groups", Number(got.unbalanced) === manifest.money.ledgerUnbalancedGroups, `${got.unbalanced} / ${manifest.money.ledgerUnbalancedGroups}`);

    // ── 5. Audit chain head + the sequence that makes it writable again ──────
    console.log("\nAudit chain:");
    const a = await client.query<{ n: string; head: string | null; maxseq: string | null }>(
      `select (select count(*) from "public"."AuditLog")::text as n,
              (select "entryHash" from "public"."AuditLog" order by "seq" desc limit 1) as head,
              (select max("seq")::text from "public"."AuditLog") as maxseq`,
    );
    ok("entry count", Number(a.rows[0].n) === manifest.audit.entries, `${a.rows[0].n} / ${manifest.audit.entries}`);
    ok("head entryHash", a.rows[0].head === manifest.audit.headEntryHash, `${a.rows[0].head?.slice(0, 16) ?? "—"}…`);
    ok("max seq", (a.rows[0].maxseq ?? null) === (manifest.audit.maxSeq ?? null), `${a.rows[0].maxseq ?? "—"}`);

    // The failure this catches: rows restore perfectly, the sequence does not, and
    // the FIRST audit write after recovery dies on the unique constraint. The site
    // looks healthy and silently cannot record anything.
    const seqName = await client.query<{ s: string | null }>(
      `select pg_get_serial_sequence('"public"."AuditLog"', 'seq') as s`,
    );
    if (seqName.rows[0].s) {
      // 🔴 quoteLit, NOT JSON.stringify. `pg_get_serial_sequence` returns
      // `public."AuditLog_seq_seq"`, and JSON.stringify wraps it in DOUBLE quotes — which
      // in SQL is an IDENTIFIER, not a string, so this line was a syntax error every time
      // it ran. It had never run: the check that proves a restored database can write its
      // FIRST audit row was itself broken, and only a real restore reached it.
      const next = await client.query<{ n: string }>(`select nextval(${quoteLit(seqName.rows[0].s)})::text n`);
      const maxSeq = Number(manifest.audit.maxSeq ?? 0);
      ok(
        "seq resumes above the restored max",
        Number(next.rows[0].n) > maxSeq,
        `next=${next.rows[0].n} max=${maxSeq || "—"}`,
      );
    }

    // ── 6. Referential integrity across the money tables ─────────────────────
    console.log("\nReferential integrity:");
    const orphanChecks: Array<[string, string]> = [
      ["Position → PredictionMarket", `select count(*)::text n from "public"."Position" p left join "public"."PredictionMarket" m on m."id" = p."marketId" where m."id" is null`],
      ["Position → User", `select count(*)::text n from "public"."Position" p left join "public"."User" u on u."id" = p."userId" where u."id" is null`],
      ["Wallet → User", `select count(*)::text n from "public"."Wallet" w left join "public"."User" u on u."id" = w."userId" where u."id" is null`],
      ["Transaction → Wallet", `select count(*)::text n from "public"."Transaction" t left join "public"."Wallet" w on w."id" = t."walletId" where w."id" is null`],
    ];
    for (const [label, q] of orphanChecks) {
      const r = await client.query<{ n: string }>(q);
      ok(label.padEnd(28), r.rows[0].n === "0", `${r.rows[0].n} orphan(s)`);
    }

    // ── 7. A restored wallet a human can read ────────────────────────────────
    const sample = await client.query<{ userId: string; phone: string; balance: string }>(
      `select w."userId", u."phoneE164" as phone, w."balance"::text as balance
         from "public"."Wallet" w join "public"."User" u on u."id" = w."userId"
        order by w."balance" desc limit 1`,
    );
    if (sample.rows.length) {
      const s = sample.rows[0];
      // Mask the phone: this output lands in CI logs.
      const masked = s.phone ? `${s.phone.slice(0, 6)}***${s.phone.slice(-2)}` : "—";
      console.log(`\nLargest restored wallet: ${masked}  balance ${s.balance} TZS`);
      const trail = await client.query<{ account: string; entryType: string; amount: string; memo: string | null }>(
        `select "account", "entryType", "amount"::text as amount, "memo" from "public"."LedgerEntry"
          where "userId" = $1 order by "createdAt" limit 6`,
        [s.userId],
      );
      for (const t of trail.rows) {
        console.log(`   ${t.account.padEnd(30)} ${t.entryType.padEnd(18)} ${t.amount.padStart(12)}  ${t.memo ?? ""}`);
      }
    }

    await client.end();
    client = null;

    // ── 8. THE PROOF: 50pick's own integrity code, on the restored data ──────
    //
    // Point the process at the scratch database BEFORE importing anything that
    // touches Prisma — prisma() latches its client on globalThis from
    // DATABASE_URL at first call, which is exactly the seam the load harness uses.
    console.log("\n50pick's own integrity functions, run against the restored database:");
    process.env.DATABASE_URL = scratchUrl;
    process.env.USE_PRISMA_DAL = "true";

    const { trialBalance } = await import("../src/lib/server/ledger.ts");
    const tb = await trialBalance();
    const { verifyChainFull } = await import("../src/lib/server/audit.ts");
    const chain = await verifyChainFull();

    // 🔴 COMPARED AGAINST THE SOURCE, NOT AGAINST PERFECTION.
    //
    // These four used to assert `tb.ok === true` and `!chain.linkBroken`. The first real
    // run against production data therefore ended in "DO NOT TRUST THIS BACKUP" — while
    // production itself reported exactly the same drifting wallet and the same broken
    // link. The artifact was flawless; it had reproduced an unhealthy database faithfully,
    // which is precisely its job. Left that way, the nightly verification would be red
    // forever, the compliance card would never show a verified backup, and people would
    // learn to ignore both.
    //
    // So: a RESTORE is correct when it matches the source. The source's own health is a
    // separate, loudly-reported operational finding — see the SOURCE INTEGRITY block below.
    const src = manifest.sourceIntegrity;
    if (src) {
      ok("trialBalance matches the source", tb.ok === src.trialBalanceOk,
        `restored ok=${tb.ok} / source ok=${src.trialBalanceOk}`);
      ok("drifting wallets match", tb.driftingWallets === src.driftingWallets,
        `${tb.driftingWallets} / ${src.driftingWallets}`);
      ok("total drift matches", tb.totalAbsDrift === src.totalAbsDrift,
        `${tb.totalAbsDrift} / ${src.totalAbsDrift}`);
      ok("imbalanced groups match", tb.imbalancedGroups.length === src.imbalancedGroups,
        `${tb.imbalancedGroups.length} / ${src.imbalancedGroups}`);
      // `?? false` on both sides: linkBroken is optional on the result type, and
      // `undefined === false` would fail a perfectly matching pair.
      ok("audit chain link state matches", (chain.linkBroken ?? false) === src.chainLinkBroken,
        `restored linkBroken=${chain.linkBroken ?? false} / source linkBroken=${src.chainLinkBroken}`);
      ok("audit chain validity matches", chain.valid === src.chainValid,
        `restored valid=${chain.valid} / source valid=${src.chainValid}`);
    } else {
      // Pre-v2 artifact with no recorded source verdict: fall back to absolute checks and
      // say plainly that a failure here cannot be attributed.
      ok("trialBalance().ok", tb.ok, `drift ${tb.totalAbsDrift} across ${tb.checkedWallets} wallets`);
      ok("audit chain links intact", !chain.linkBroken, chain.linkBroken ? `first break at ${chain.firstBreakAt}` : `${chain.total} entries`);
      console.log("   note  this artifact predates sourceIntegrity — a failure above may belong to the SOURCE");
    }
    if (chain.unverifiable) {
      console.log(`   note  ${chain.unverifiable} entr(ies) predate the current signing key — links still verified`);
    }

    // The source's own health, stated separately from the backup's. This is what an
    // operator needs to act on, and it must never be confused with a bad artifact.
    if (src && (!src.trialBalanceOk || src.chainLinkBroken)) {
      sourceWarnings.push(
        ...(src.trialBalanceOk
          ? []
          : [`trial balance fails on the SOURCE: ${src.driftingWallets} drifting wallet(s), ${src.totalAbsDrift} TZS`]),
        ...(src.chainLinkBroken ? ["the SOURCE's audit chain has a broken link"] : []),
      );
    }

    const { PrismaClient: PC } = await import("@prisma/client");
    void PC;

    // ── 9. Record the verified run for /admin/compliance ────────────────────
    if (has("record")) {
      // Explicit wins; otherwise the database this run STARTED against, which is
      // the one the backup came from. Before this fallback existed, `--record`
      // needed a third env var the runbook never mentioned, and without it the
      // script printed a note and exited 0 — so the drill "passed", nothing was
      // written, and the compliance card stayed on "no backup has ever run".
      const target = recordTargetFor(process.env.BACKUP_RECORD_DATABASE_URL, ORIGINAL_DATABASE_URL);
      if ("error" in target) {
        // Asking to record and not recording is a FAILURE, not a note. Exits below.
        recordError = target.error;
      } else {
        const recordUrl = target.url;
        recorded = {
          finishedAt: new Date().toISOString(),
          ok: true,
          verified: failures.length === 0,
          sizeBytes: raw.length,
          rows: expectedRows,
          sha256,
          destination: process.env.BACKUP_DESTINATION ?? "unspecified",
          sealed,
          ...(failures.length ? { error: `${failures.length} verification failure(s): ${failures[0]}` } : {}),
          // Carried even on a fully successful run: the backup is fine, the database it
          // came from may not be, and only one screen shows an officer either.
          ...(sourceWarnings.length ? { sourceWarnings } : {}),
        };
        // A dedicated client: the singleton above is bound to the scratch DB.
        const rec = new PrismaClient({ datasources: { db: { url: recordUrl } }, log: ["error"] });
        try {
          await rec.systemConfig.upsert({
            where: { key: BACKUP_STATE_KEY },
            create: { key: BACKUP_STATE_KEY, value: recorded as unknown as object },
            update: { value: recorded as unknown as object },
          });
          console.log(`\nRecorded ${BACKUP_STATE_KEY} on ${maskUrl(recordUrl)} — verified=${recorded.verified}`);
        } catch (e) {
          // Reported as a record failure rather than thrown: the verification
          // result above is real and worth printing, and "the backup is good but
          // the card was not updated" is a different problem from "the backup is
          // bad". Both still exit non-zero.
          recorded = null;
          recordError = `writing to ${maskUrl(recordUrl)} failed — ${(e as Error).message}`;
        } finally {
          await rec.$disconnect().catch(() => {});
        }
      }
    }
  } finally {
    // Close our own connection first, or the terminate below kills it mid-flight
    // and the resulting async error masks whatever actually went wrong.
    if (client) await client.end().catch(() => {});
    // Always drop the throwaway, even on failure. Connect to the admin database:
    // you cannot drop a database you are connected to.
    try {
      const cleanup = new pg.Client({ connectionString: scratchAdminUrl });
      await cleanup.connect();
      await cleanup.query(
        `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
        [scratchName],
      );
      await cleanup.query(`DROP DATABASE IF EXISTS ${JSON.stringify(scratchName)}`);
      await cleanup.end();
    } catch (e) {
      console.warn(`   note: could not drop scratch database ${scratchName}: ${(e as Error).message}`);
    }
  }

  console.log("");
  if (failures.length) {
    console.error(`!! VERIFICATION FAILED — ${failures.length} of ${checks} checks:`);
    failures.slice(0, 20).forEach((f) => console.error(`   - ${f}`));
    console.error(`\n   DO NOT TRUST THIS BACKUP.`);
    process.exit(2);
  }

  console.log("===============================================================");
  console.log(`  VERIFIED — ${checks} checks passed.`);
  console.log("  This backup restores into an empty Postgres, every shilling, every");
  console.log("  index, constraint and foreign key comes back, non-ASCII text is");
  console.log("  byte-identical, and the platform's own trial balance and chain");
  console.log("  verification return EXACTLY what they return on the source.");
  console.log("===============================================================");
  // Never folded into the banner above. The backup is good; the database may not be,
  // and the sentence that says so has to survive being skim-read.
  if (sourceWarnings.length) {
    console.log("");
    console.log("  ⚠️  BUT THE SOURCE DATABASE HAS PROBLEMS — faithfully reproduced here:");
    for (const w of sourceWarnings) console.log(`      · ${w}`);
    console.log("      Nothing is wrong with this artifact. Investigate production.");
  }

  // The backup is good; the thing an officer LOOKS AT was not updated. Silence here
  // is how a drill reports success while /admin/compliance still says no backup has
  // ever run — so this exits non-zero and says which half failed.
  if (recordError) {
    console.error(`\n!! --record was requested but NOTHING WAS RECORDED: ${recordError}`);
    console.error(`   The backup above is verified. Backup health on /admin/compliance is UNCHANGED.`);
    process.exit(2);
  }
  if (recorded) console.log(`\n::verify-result::${JSON.stringify(recorded)}`);
}

main().catch((e: unknown) => {
  console.error("\nVERIFY FAILED:", e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
