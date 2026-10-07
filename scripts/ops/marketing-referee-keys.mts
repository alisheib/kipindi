/**
 * ops:marketing-referee-keys — U33r's ONE ops step: key every EXISTING agent application's promised referees, so the send
 * gate keeps the promise /legal/privacy §9 made them, "we never contact you for marketing" (Q8; the owner's FINAL rule of
 * 2026-10-07).
 *
 * ⭐ WHY THE MIGRATION COULD NOT DO THIS. A referee key is an HMAC of the number under `OTP_PEPPER`, and the pepper lives in
 * the application, never in Postgres — writing it into `20261007150000_agent_referee_key/migration.sql` would commit a
 * production secret to git (the precedent: `scripts/ops-backfill-id-fingerprints.mts`). So the table ships EMPTY and this
 * fills it, inside production's environment, where the pepper already is. Referees named from this deploy on are keyed by
 * `setReferees` itself, and an applicant's erasure keys theirs before it empties them; this step is for every application
 * that predates the deploy.
 * ⛔ THE WINDOW. Until it has run AND the two lines it prints are recorded in the code (`REFEREE_KEYS_ON_PRODUCTION`,
 * `src/lib/server/marketing/outreach-record.ts`) with nothing missing and nothing unreadable, licence outreach and the
 * live-send switch BOTH refuse to open (the fifth opening check, `referee_keys`). Run it after the deploy that applies the
 * migration; BEFORE outreach or the live switch opens; BEFORE `REFEREE_NEW_WORDS_LIVE_AT` is set (a save after the cutoff
 * re-stamps `refereeConsentAt` and would hide an old referee from a later run); and AGAIN after any rollback to a build
 * without U33r and the redeploy that follows (that build keyed nobody it named).
 *
 * ⛔ NO BUSINESS LOGIC OF ITS OWN. It calls `refereeKeyCensus` and `backfillRefereeKeys` (`referee-exclusion.ts`) — the SAME
 * free-text reader, e-mail lookups, key and writer the service uses — so what it keys is exactly what the gate asks. Its
 * refusals are ONE pure rule there too, `refereeKeysDoorVerdict` (`test:marketing-consent` R10 runs it, and pins this
 * file's order, with plants).
 * ⛔ IT PRINTS COUNTS ONLY: never a number, a key, a name, an e-mail or an application id (no number in any audit or log).
 * ⛔ IT REFUSES WITHOUT A DATABASE (a no-database process would key the in-memory store and report success), WITHOUT
 * `OTP_PEPPER` ITSELF (the dev fallback would key under the wrong pepper), and A WRITE REFUSES UNLESS IT RUNS WITH
 * PRODUCTION'S OWN ENVIRONMENT, AS `railway run` INJECTS IT — keys made under any other pepper would never match
 * production's lookups, and the census would read them back under the same wrong pepper and say "0 missing": an operator
 * told the referees are protected while none is. `--scratch` lets a write reach a LOOPBACK database (the integrator's
 * scratch Postgres) under whatever pepper that run sets.
 * ⛔ IDEMPOTENT: a key already held is skipped, so a re-run writes nothing new.
 *
 * Run it through Railway (the URL is rewritten to the public proxy, as every ops script in this repo does; never printed):
 *   railway run --service 50pick npm run ops:marketing-referee-keys -- status
 *   railway run --service 50pick npm run ops:marketing-referee-keys -- backfill
 * and against a scratch database:
 *   DATABASE_URL=postgresql://…@127.0.0.1:5461/… npm run ops:marketing-referee-keys -- backfill --scratch
 *
 * Exit: 0 done (after a backfill: every promised referee's number keyed, no contact unreadable) · 1 a backfill that left a
 * number unkeyed or a contact unreadable · 2 not run (usage, no database, no pepper, or a write outside production's
 * environment without --scratch).
 */
import { backfillRefereeKeys, refereeKeyCensus, refereeKeysDoorVerdict, REFEREE_KEYS_DOOR_SENTENCE } from "../../src/lib/server/marketing/referee-exclusion.ts";
import type { RefereeKeyCensus } from "../../src/lib/server/marketing/referee-exclusion.ts";

/** ⛔ The public proxy, before anything reads the database: `railway run` injects `postgres.railway.internal`, which does not
 *  resolve off Railway. */
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/@postgres[.]railway[.]internal(:[0-9]+)?/, "@turntable.proxy.rlwy.net:40357");
}

function describe(c: RefereeKeyCensus): string {
  return `${c.applications} application(s) · ${c.promised} promised · ${c.withContact} with a referee contact · ${c.numbers} referee number(s) · ${c.missing} not yet keyed · ${c.unreadable} unreadable · ${c.notMobile} landline or foreign · ${c.emailOnlyUnmatched} e-mail with no number found`;
}

/** The census's counts in the code's own shape — what the commit that records the run copies into
 *  `REFEREE_KEYS_ON_PRODUCTION`. Counts only. */
function countsOf(c: RefereeKeyCensus): RefereeKeyCensus {
  return {
    applications: c.applications, promised: c.promised, withContact: c.withContact, numbers: c.numbers, missing: c.missing,
    unreadable: c.unreadable, notMobile: c.notMobile, emailOnlyUnmatched: c.emailOnlyUnmatched,
  };
}

/** ⛔ MINOR-2 · a contact the reader could not read is a referee nobody can say is excluded — said every time, never a count
 *  left for the operator to notice. */
function warnUnreadable(c: RefereeKeyCensus): void {
  if (c.unreadable > 0) {
    console.log(`⚠️ ${c.unreadable} referee contact(s) hold nine or more digits that are not a number the reader can key — nobody can say those referees are excluded. Tell the developer: the referee check stays outstanding until this is 0.`);
  }
}

async function main(): Promise<number> {
  const verdict = refereeKeysDoorVerdict({
    argv: process.argv.slice(2),
    databaseUrl: process.env.DATABASE_URL,
    pepperSet: typeof process.env.OTP_PEPPER === "string" && process.env.OTP_PEPPER !== "",
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT_NAME,
    railwayService: process.env.RAILWAY_SERVICE_NAME,
  });
  if (!verdict.ok) {
    console.log(REFEREE_KEYS_DOOR_SENTENCE[verdict.why]);
    return 2;
  }
  if (verdict.command === "status") {
    const c = await refereeKeyCensus();
    console.log(`STATUS: ${describe(c)}`);
    warnUnreadable(c);
    return 0;
  }
  const ranAt = new Date().toISOString();
  const before = await refereeKeyCensus();
  console.log(`BEFORE: ${describe(before)}`);
  const after = await backfillRefereeKeys();
  console.log(`DONE: ${after.written} key row(s) written · AFTER: ${describe(after)}`);
  warnUnreadable(after);
  // ⭐ The record the code keeps of this run (`RefereeKeysRecord`) — counts only — for the commit that records it.
  console.log(`RECORD: ${JSON.stringify({ ranAt, status: countsOf(before), backfill: { ...countsOf(after), written: after.written } })}`);
  if (after.missing > 0 || after.unreadable > 0) {
    console.log("⚠️ Not every promised referee is keyed yet — run it again; if the counts stay, tell the developer.");
    return 1;
  }
  return 0;
}

process.exitCode = await main();
// The database pool keeps the event loop alive; every write above was awaited, so leave now.
process.exit(process.exitCode);
