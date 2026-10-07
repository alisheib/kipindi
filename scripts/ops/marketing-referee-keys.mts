/**
 * ops:marketing-referee-keys — U33r's ops door: key every EXISTING agent application's promised referees, so the send
 * gate keeps the promise /legal/privacy §9 made them, "we never contact you for marketing" (Q8; the owner's FINAL rule of
 * 2026-10-07) — made to every referee until v2026-10-07, and kept since for every referee named before that version.
 *
 * ⭐ WHY THE MIGRATION COULD NOT DO THIS. A referee key is an HMAC of the number under `OTP_PEPPER`, and the pepper lives in
 * the application, never in Postgres — writing it into `20261007150000_agent_referee_key/migration.sql` would commit a
 * production secret to git (the precedent: `scripts/ops-backfill-id-fingerprints.mts`). So the table ships EMPTY and this
 * fills it, inside production's environment, where the pepper already is. Referees named from this deploy on are keyed by
 * `setReferees` itself, and an applicant's erasure keys theirs before it empties them; this door is for every application
 * that predates the deploy.
 * ⛔ THE WINDOW. Until it has run AND its RECORD line is copied into the code (`REFEREE_KEYS_ON_PRODUCTION`,
 * `src/lib/server/marketing/outreach-record.ts`) with nothing missing and nothing unreadable, licence outreach and the
 * live-send switch BOTH refuse to open (the fifth opening check, `referee_keys`). Run it after the deploy that applies the
 * migration; BEFORE outreach or the live switch opens; BEFORE `REFEREE_NEW_WORDS_LIVE_AT` is set (a save after the cutoff
 * re-stamps `refereeConsentAt` and would hide an old referee from a later run); and AGAIN after any rollback to a build
 * without U33r and the redeploy that follows (that build keyed nobody it named).
 * ⛔ THE RECORD SAYS WHERE IT RAN (the re-review's MINOR-1): `environment: "production"` ONLY when the door ran with
 * Railway's production markers, `"scratch"` for every other run — and the fifth check takes ONLY a production record, so a
 * scratch rehearsal's line can never reconcile production by being pasted.
 *
 * COMMANDS
 *   status                                   — the census: counts, and the APPLICATION IDS whose contacts the reader
 *                                              could not read (ids only — never a number, a name or a contact).
 *   backfill                                 — key every promised application's referees, then the census and RECORD.
 *   key --application <id>                   — a person read that application's contact and found the referee's
 *                                              mobile number: type it when asked — it is NOT shown as you type, never
 *                                              printed, and keyed by the same reader; ONE audit row names the
 *                                              application, never the number.
 *   reviewed --application <id> --reason "…" — a person read it and it holds NO mobile number: ONE audit row records
 *                                              that, with the reason (plain words, no numeral).
 * A handled application no longer counts as unreadable — until its referees are named again.
 *
 * ⛔ NO BUSINESS LOGIC OF ITS OWN. It calls `refereeKeyCensus`, `backfillRefereeKeys`, `unreadableRefereeApplications`,
 * `keyRefereeNumberByHand` and `recordRefereeContactReviewed` (`referee-exclusion.ts`) — the SAME reader, e-mail lookups,
 * key and writer the service uses. Its refusals are ONE pure rule there too, `refereeKeysDoorVerdict`
 * (`test:marketing-consent` R10 runs it, and pins this file's order, with plants).
 * ⛔ IT PRINTS COUNTS AND APPLICATION IDS ONLY: never a number, a key, a name, an e-mail or a contact — and what a person
 * types is read without echo and handed to the writer, never logged.
 * ⛔ IT REFUSES WITHOUT A DATABASE (a no-database process would key the in-memory store and report success), WITHOUT
 * `OTP_PEPPER` ITSELF (the dev fallback would key under the wrong pepper), and A WRITE REFUSES UNLESS IT RUNS WITH
 * PRODUCTION'S OWN ENVIRONMENT, AS `railway run` INJECTS IT — keys made under any other pepper would never match
 * production's lookups. `--scratch` lets a write reach a LOOPBACK database (the integrator's scratch Postgres).
 * ⛔ IDEMPOTENT: a key already held is skipped, so a re-run writes nothing new.
 *
 * Run it through Railway (the URL is rewritten to the public proxy, as every ops script in this repo does; never printed):
 *   railway run --service 50pick npm run ops:marketing-referee-keys -- status
 *   railway run --service 50pick npm run ops:marketing-referee-keys -- backfill
 *   railway run --service 50pick npm run ops:marketing-referee-keys -- key --application <id>
 *   railway run --service 50pick npm run ops:marketing-referee-keys -- reviewed --application <id> --reason "a landline"
 * and against a scratch database:
 *   DATABASE_URL=postgresql://…@127.0.0.1:5461/… npm run ops:marketing-referee-keys -- backfill --scratch
 *
 * Exit: 0 done (after a backfill: every promised referee's number keyed, no unhandled contact unreadable) · 1 a backfill
 * that left a number unkeyed or a contact unreadable, or a hand step refused · 2 not run (usage, no database, no pepper, a
 * write outside production's environment without --scratch, no application id, a reason that will not do).
 */
import {
  backfillRefereeKeys, keyRefereeNumberByHand, recordRefereeContactReviewed, refereeKeyCensus, refereeKeysDoorVerdict,
  unreadableRefereeApplications, REFEREE_KEYS_DOOR_SENTENCE,
} from "../../src/lib/server/marketing/referee-exclusion.ts";
import type { RefereeHandResult, RefereeKeyCensus } from "../../src/lib/server/marketing/referee-exclusion.ts";

/** ⛔ The public proxy, before anything reads the database: `railway run` injects `postgres.railway.internal`, which does not
 *  resolve off Railway. */
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/@postgres[.]railway[.]internal(:[0-9]+)?/, "@turntable.proxy.rlwy.net:40357");
}

const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const CTRL_C = String.fromCharCode(3);
const CTRL_D = String.fromCharCode(4);
const BACKSPACE = String.fromCharCode(8);
const DELETE = String.fromCharCode(127);

function describe(c: RefereeKeyCensus): string {
  return `${c.applications} application(s) · ${c.promised} promised · ${c.withContact} with a referee contact · ${c.numbers} referee number(s) · ${c.missing} not yet keyed · ${c.unreadable} unreadable · ${c.reviewed} reviewed by hand · ${c.notMobile} landline or foreign · ${c.emailOnlyUnmatched} e-mail with no number found`;
}

/** The census's counts in the code's own shape — what the commit that records the run copies into
 *  `REFEREE_KEYS_ON_PRODUCTION`. Counts only. */
function countsOf(c: RefereeKeyCensus): RefereeKeyCensus {
  return {
    applications: c.applications, promised: c.promised, withContact: c.withContact, numbers: c.numbers, missing: c.missing,
    unreadable: c.unreadable, reviewed: c.reviewed, notMobile: c.notMobile, emailOnlyUnmatched: c.emailOnlyUnmatched,
  };
}

/** ⛔ MINOR-2 · MINOR-4 · a contact the reader could not read is a referee nobody can say is excluded — said every time, with
 *  the applications to look at (ids only) and the two ways a person clears one. */
async function warnUnreadable(c: RefereeKeyCensus): Promise<void> {
  if (c.unreadable === 0) return;
  const ids = await unreadableRefereeApplications();
  console.log(`⚠️ ${c.unreadable} referee contact(s) hold nine or more digits that are not a number the reader can key — nobody can say those referees are excluded, and the referee check stays outstanding until this is 0.`);
  console.log(`   Applications to look at: ${ids.join(", ")}`);
  console.log('   For each, read its referee contacts on the console, then either `key --application <id>` (type the mobile number when asked) or `reviewed --application <id> --reason "…"` (it holds no mobile number).');
}

/** ⛔ One line from the person, NEVER echoed: on a terminal the keys are read raw and nothing is written back; piped, the
 *  first line is read. The text goes to the writer and nowhere else. */
async function readQuietly(prompt: string): Promise<string> {
  process.stderr.write(prompt);
  const stdin = process.stdin;
  if (stdin.isTTY) {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    return new Promise<string>((resolve, reject) => {
      let typed = "";
      const finish = (fn: () => void): void => {
        stdin.removeListener("data", onData);
        stdin.setRawMode(false);
        stdin.pause();
        process.stderr.write(NL);
        fn();
      };
      const onData = (chunk: string): void => {
        for (const ch of chunk) {
          if (ch === CR || ch === NL || ch === CTRL_D) { finish(() => resolve(typed)); return; }
          if (ch === CTRL_C) { finish(() => reject(new Error("cancelled"))); return; }
          if (ch === BACKSPACE || ch === DELETE) { typed = typed.slice(0, -1); continue; }
          typed += ch;
        }
      };
      stdin.on("data", onData);
    });
  }
  let all = "";
  for await (const chunk of stdin) all += String(chunk);
  return all.split(NL)[0] ?? "";
}

/** A hand step's answer, said — never the number. */
function sayHand(r: RefereeHandResult, done: string): number {
  if (r.ok) {
    console.log(done);
    return 0;
  }
  const why: Record<string, string> = {
    no_application: "REFUSED: no application has that id.",
    not_promised: "REFUSED: that application's referees were named after the re-worded §9 went live — they were never promised, so nothing is keyed.",
    not_one_number: "REFUSED: what was typed is not exactly ONE Tanzanian mobile number — nothing was keyed (and nothing of it is printed). Try again.",
    bad_reason: "REFUSED: the reason must say what the contact IS, never whose — plain words of 3–200 characters, with no name and no number of any kind.",
    not_recorded: "⚠️ The step was done but its audit row was not recorded — run it again (a key already held is skipped).",
  };
  console.log(why[r.why] ?? "REFUSED.");
  return 1;
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
    console.log(`STATUS (${verdict.environment}): ${describe(c)}`);
    await warnUnreadable(c);
    return 0;
  }
  if (verdict.command === "key") {
    const typed = await readQuietly(`Type the referee's mobile number for application ${verdict.applicationId}, then Enter (it is not shown): `);
    return sayHand(await keyRefereeNumberByHand({ applicationId: verdict.applicationId ?? "", typed }),
      `KEYED: application ${verdict.applicationId} — the number is excluded, and its audit row names the application only.`);
  }
  if (verdict.command === "reviewed") {
    return sayHand(await recordRefereeContactReviewed({ applicationId: verdict.applicationId ?? "", reason: verdict.reason ?? "" }),
      `RECORDED: application ${verdict.applicationId} — a person read its referee contacts and found no mobile number.`);
  }
  const ranAt = new Date().toISOString();
  const before = await refereeKeyCensus();
  console.log(`BEFORE: ${describe(before)}`);
  const after = await backfillRefereeKeys();
  console.log(`DONE: ${after.written} key row(s) written · AFTER: ${describe(after)}`);
  await warnUnreadable(after);
  // ⭐ The record the code keeps of this run (`RefereeKeysRecord`) — counts only — and WHERE it ran: only a run under
  // Railway's production markers says "production", and only that record reconciles the fifth check.
  console.log(`RECORD: ${JSON.stringify({ environment: verdict.environment, ranAt, status: countsOf(before), backfill: { ...countsOf(after), written: after.written } })}`);
  if (after.missing > 0 || after.unreadable > 0) {
    console.log("⚠️ Not every promised referee is keyed yet — run it again; if the counts stay, tell the developer.");
    return 1;
  }
  return 0;
}

process.exitCode = await main();
// The database pool keeps the event loop alive; every write above was awaited, so leave now.
process.exit(process.exitCode);
