/**
 * ops:marketing-referee-keys — U33r's ONE ops step: key every EXISTING agent application's referees, so the send gate keeps
 * the promise /legal/privacy §9 made them, "we never contact you for marketing" (Q8; the owner's FINAL rule of 2026-10-07).
 *
 * ⭐ WHY THE MIGRATION COULD NOT DO THIS. A referee key is an HMAC of the number under `OTP_PEPPER`, and the pepper lives in
 * the application, never in Postgres — writing it into `20261007150000_agent_referee_key/migration.sql` would commit a
 * production secret to git (the precedent: `scripts/ops-backfill-id-fingerprints.mts`). So the table ships EMPTY and this
 * fills it, inside production's environment, where the pepper already is. Referees named from this deploy on are keyed by
 * `setReferees` itself, and an applicant's erasure keys theirs before it empties them; this step is for every application
 * that predates the deploy. ⛔ UNTIL IT HAS RUN, AN EXISTING REFEREE IS NOT EXCLUDED — run it right after the deploy that
 * applies the migration, and before any campaign sends (the tracker's §0 says so).
 *
 * ⛔ NO BUSINESS LOGIC OF ITS OWN. It calls `refereeKeyCensus` and `backfillRefereeKeys` (`referee-exclusion.ts`) — the SAME
 * free-text reader, key and writer the service uses — so what it keys is exactly what the gate asks.
 * ⛔ IT PRINTS COUNTS ONLY: never a number, a key, a name or an application id (no number in any audit or log).
 * ⛔ IT REFUSES WITHOUT A DATABASE (a no-database process would key the in-memory store and report success), and A WRITE
 * REFUSES UNLESS IT RUNS WITH PRODUCTION'S OWN ENVIRONMENT, AS `railway run` INJECTS IT — keys made under any other pepper
 * would never match production's lookups, and the census would read them back under the same wrong pepper and say "0
 * missing": an operator told the referees are protected while none is. `--scratch` lets a write reach a LOOPBACK database
 * (the integrator's scratch Postgres) under whatever pepper that run sets.
 * ⛔ IDEMPOTENT: a key already held is skipped, so a re-run writes nothing new — run it again only if the pepper ever rotates.
 *
 * Run it through Railway (the URL is rewritten to the public proxy, as every ops script in this repo does; never printed):
 *   railway run --service 50pick npm run ops:marketing-referee-keys -- status
 *   railway run --service 50pick npm run ops:marketing-referee-keys -- backfill
 * and against a scratch database:
 *   DATABASE_URL=postgresql://…@127.0.0.1:5461/… npm run ops:marketing-referee-keys -- backfill --scratch
 *
 * Exit: 0 done (after a backfill: every referee number on file keyed) · 1 a backfill that left a number unkeyed · 2 not run
 * (usage, no database, no pepper, or a write outside production's environment without --scratch).
 */
import { hasDatabase } from "../../src/lib/server/prisma.ts";
import { backfillRefereeKeys, refereeKeyCensus } from "../../src/lib/server/marketing/referee-exclusion.ts";
import type { RefereeKeyCensus } from "../../src/lib/server/marketing/referee-exclusion.ts";

/** ⛔ The public proxy, before anything reads the database: `railway run` injects `postgres.railway.internal`, which does not
 *  resolve off Railway. */
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/@postgres[.]railway[.]internal(:[0-9]+)?/, "@turntable.proxy.rlwy.net:40357");
}

const USAGE = [
  "usage: npm run ops:marketing-referee-keys -- status",
  "       npm run ops:marketing-referee-keys -- backfill [--scratch]",
].join(String.fromCharCode(10));

function describe(c: RefereeKeyCensus): string {
  return `${c.applications} application(s) · ${c.withContact} with a referee contact · ${c.numbers} referee number(s) on file · ${c.missing} not yet keyed`;
}

/** The database host, for the loopback check only — never printed. */
function databaseHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
}

async function main(): Promise<number> {
  const command = process.argv[2];
  if (command !== "status" && command !== "backfill") {
    console.log(USAGE);
    return 2;
  }
  if (!hasDatabase()) {
    console.log("REFUSING: no DATABASE_URL — the keys live in the database. Run it through the runner (see the header).");
    return 2;
  }
  if (!process.env.OTP_PEPPER) {
    // ⛔ `requireSecret` falls back to a dev pepper outside production: keys written under it would never match the ones
    // production computes, which would leave every referee unprotected while this door reported success.
    console.log("REFUSING: OTP_PEPPER is not set — keys made under the dev fallback would never match production's. Run it through the runner.");
    return 2;
  }
  if (command === "status") {
    const c = await refereeKeyCensus();
    console.log(describe(c));
    return 0;
  }
  const viaRailway = process.env.RAILWAY_ENVIRONMENT_NAME === "production" && process.env.RAILWAY_SERVICE_NAME === "50pick";
  const scratch = process.argv.includes("--scratch") && ["127.0.0.1", "localhost", "::1", "[::1]"].includes(databaseHost());
  if (!viaRailway && !scratch) {
    console.log("REFUSING: this is not production's own environment (run it through `railway run --service 50pick`), and no --scratch against a loopback database was asked for — keys made under another pepper would protect nobody.");
    return 2;
  }
  const before = await refereeKeyCensus();
  console.log(`BEFORE: ${describe(before)}`);
  const after = await backfillRefereeKeys();
  console.log(`DONE: ${after.written} key row(s) written · AFTER: ${describe(after)}`);
  if (after.missing > 0) {
    console.log("⚠️ Some referee numbers are still not keyed — run it again; if they stay, tell the developer.");
    return 1;
  }
  return 0;
}

process.exitCode = await main();
// The database pool keeps the event loop alive; every write above was awaited, so leave now.
process.exit(process.exitCode);
