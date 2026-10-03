/**
 * ⭐ EVERY CLIENT IS A CONTACT — THE BACKFILL (the owner, 2026-10-03). From that day both sign-up doors make the new
 * client's number a contact (`src/lib/server/marketing/registration-contact.ts`). This makes every EXISTING client one
 * too, through the SAME rule: it walks every PLAYER account on a +255 number by id (U38a's keyset, a page at a time)
 * and asks `ensureRegistrationContact` once per account — create, link an officer's or an import's contact, or leave
 * alone with the reason (staff, agents, closed and erased accounts, numbers the ONE table does not call a Tanzanian
 * mobile, an erased number's tombstone, a row another account holds).
 *
 * ⭐ IDEMPOTENT: a second run creates and links nothing and repairs no cache — its counts say so.
 * ⛔ IT PRINTS COUNTS ONLY (`registrationBackfillReport`) — never a number, a name or an email.
 * ⛔ IT WRITES NO CONSENT: the book's consent column is U24's mirror of the ledger, and OD8's zero backfill stands.
 * ⛔ A LOOPBACK DATABASE ONLY, unless `--production` is passed — and that run is the owner's, approved by hand. Every
 * refusal happens BEFORE the store loads.
 * ⛔ A REAL-DATABASE WRITE RUN NEEDS THE APP'S OWN AUDIT KEY. Every row it writes is audited, and off production
 * `audit.ts` signs with whatever key the shell holds (`AUDIT_CHAIN_SECRET`, else `SESSION_SECRET`, else a dev
 * placeholder): rows signed on a laptop would never verify on production and the chain would report tampering. So it
 * runs inside the app's environment (`railway run`, which also brings production's ADMIN_BOOTSTRAP_PHONES), and it
 * refuses when that key is absent — the `ops-backfill-id-fingerprints.mts` rule for its pepper. A dry run writes and
 * audits nothing, so it needs no key.
 *
 * Flags: `--dry-run` reads the book and writes nothing (the counts say what a real run would do) · `--production`
 * permits a non-loopback DATABASE_URL · `--chunk=N` accounts per page (1–1,000; 200 by default).
 *
 * Rehearse on a scratch Postgres FIRST (through the heavy-node lock — db-scratch boots PostgreSQL 18.3 on a loopback
 * port and exports VERIFY_DATABASE_URL; the probe seeds a world of every case and proves the walk on Postgres, then this
 * script runs on that world twice — `created 0 · linked 0` is the idempotence, end to end):
 *   bash ~/heavy-node-lock.sh run regcontact npx tsx scripts/db-scratch.mts --reset --run bash -c 'export DATABASE_URL="$VERIFY_DATABASE_URL"; npx prisma migrate deploy && npx tsx scripts/live/registration-contact-pg-probe.mts && npx tsx scripts/live/backfill-registration-contacts.mts --dry-run && npx tsx scripts/live/backfill-registration-contacts.mts'
 * Production (the owner, by hand, inside the app's environment — read the dry run's counts before the real run):
 *   railway run --service 50pick -- npx tsx scripts/live/backfill-registration-contacts.mts --production --dry-run
 *   railway run --service 50pick -- npx tsx scripts/live/backfill-registration-contacts.mts --production
 */
process.exitCode = 1;

const ARGS = process.argv.slice(2);
const PRODUCTION = ARGS.includes("--production");
const DRY_RUN = ARGS.includes("--dry-run");
const CHUNK_FLAG = ARGS.find((a) => a.startsWith("--chunk="));
const UNKNOWN = ARGS.filter((a) => a !== "--production" && a !== "--dry-run" && a !== CHUNK_FLAG);
if (UNKNOWN.length > 0) {
  console.error(`backfill-registration-contacts: ${UNKNOWN.length} argument(s) not understood — the flags are --dry-run, --production and --chunk=N. Nothing was run.`);
  process.exit(2);
}
const CHUNK = CHUNK_FLAG === undefined ? undefined : Number(CHUNK_FLAG.slice("--chunk=".length));
if (CHUNK !== undefined && !(Number.isInteger(CHUNK) && CHUNK >= 1 && CHUNK <= 1000)) {
  console.error("backfill-registration-contacts: --chunk must be a whole number from 1 to 1000. Nothing was run.");
  process.exit(2);
}

/**
 * `railway run` hands a laptop the app's PRIVATE database host, which resolves only inside Railway: rewritten to the
 * public proxy — the rewrite every ops script in this repo makes (`ops-backfill-id-fingerprints.mts`,
 * `ops-bulk-resolve-fleet.mts`, …), here as plain string work: the private host and an optional `:port` after it.
 */
function viaPublicProxy(url: string): string {
  const PRIVATE_HOST = "@postgres.railway.internal";
  const at = url.indexOf(PRIVATE_HOST);
  if (at < 0) return url;
  let end = at + PRIVATE_HOST.length;
  if (url[end] === ":") {
    end++;
    while (end < url.length && url[end] >= "0" && url[end] <= "9") end++;
  }
  return `${url.slice(0, at)}@turntable.proxy.rlwy.net:40357${url.slice(end)}`;
}

// ── ⛔ THE REFUSALS, BEFORE THE STORE LOADS ────────────────────────────────────────────────────────────────────────
const GIVEN_URL = process.env.DATABASE_URL;
if (!GIVEN_URL) {
  console.error("backfill-registration-contacts: needs DATABASE_URL — without it the store is the in-memory twin, which writes nowhere. Nothing was run.");
  process.exit(2);
}
if (process.env.USE_PRISMA_DAL === "false") {
  console.error("backfill-registration-contacts: USE_PRISMA_DAL=false hands the store its in-memory twin — refusing. Nothing was run.");
  process.exit(2);
}
const DATABASE_URL = viaPublicProxy(GIVEN_URL);
process.env.DATABASE_URL = DATABASE_URL;
let host = "";
try {
  host = new URL(DATABASE_URL).hostname;
} catch {
  host = "";
}
if (host === "") {
  console.error("backfill-registration-contacts: DATABASE_URL cannot be read as a URL — refusing. Nothing was run.");
  process.exit(2);
}
const LOOPBACK = ["127.0.0.1", "localhost", "::1", "[::1]"];
if (!LOOPBACK.includes(host) && !PRODUCTION) {
  console.error("backfill-registration-contacts: refusing — DATABASE_URL is not a loopback scratch cluster. A real database gets every client's contact written: that run is the owner's, approved by hand, with --production (run it with --dry-run first). Nothing was run.");
  process.exit(2);
}
/** What the run is AGAINST — named by the target, never by the flag alone. */
const REAL_DATABASE = !LOOPBACK.includes(host);
if (REAL_DATABASE && !DRY_RUN) {
  const auditKey = process.env.AUDIT_CHAIN_SECRET;
  if (!auditKey || auditKey === process.env.SESSION_SECRET) {
    console.error("backfill-registration-contacts: REFUSING — AUDIT_CHAIN_SECRET, the app's own audit key, is not in this environment (or equals SESSION_SECRET). Every row this run writes is audited, and rows signed with a laptop's fallback key would never verify on production — the chain would report tampering. Run it inside the app's environment: railway run --service 50pick -- npx tsx scripts/live/backfill-registration-contacts.mts --production. Nothing was run.");
    process.exit(2);
  }
}

// ── THE RUN — the store loads only now ───────────────────────────────────────────────────────────────────────────
const { backfillRegistrationContacts, registrationBackfillReport, registrationDryRunDeps } = await import("../../src/lib/server/marketing/registration-contact.ts");
const { auditFlush } = await import("../../src/lib/server/audit.ts");
const { prisma, hasDatabase } = await import("../../src/lib/server/prisma.ts");

if (!hasDatabase()) {
  console.error("backfill-registration-contacts: the store did not engage Postgres — refusing. Nothing was run.");
  process.exit(2);
}
console.log(`backfill-registration-contacts: ${REAL_DATABASE ? "PRODUCTION" : "scratch"} database${DRY_RUN ? " · DRY RUN" : ""} — walking the player accounts…`);
try {
  const counts = await backfillRegistrationContacts({
    ...(CHUNK === undefined ? {} : { chunk: CHUNK }),
    ...(DRY_RUN ? { contact: registrationDryRunDeps() } : {}),
  });
  // Every audit row the run queued is in the chain before the report is printed.
  await auditFlush();
  for (const line of registrationBackfillReport(counts, { production: REAL_DATABASE, dryRun: DRY_RUN })) console.log(line);
  process.exitCode = counts.outcomes.failed === 0 ? 0 : 1;
} catch (err) {
  const name = typeof (err as { name?: unknown })?.name === "string" ? String((err as { name: string }).name) : "Error";
  console.error(`backfill-registration-contacts: stopped part-way (${name}). Every write that landed is kept, and a second run finishes the rest — the rule is idempotent.`);
  process.exitCode = 1;
} finally {
  // ⛔ The audit rows of the writes that DID land are flushed on every way out, before the connection closes.
  await auditFlush().catch(() => undefined);
  await prisma()?.$disconnect().catch(() => undefined);
}
