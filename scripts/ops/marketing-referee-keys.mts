/**
 * ops:marketing-referee-keys — U33r's ops door: key every EXISTING agent application's promised referees, so the send
 * gate keeps the promise /legal/privacy §9 made them, "we never contact you for marketing" (Q8; the owner's FINAL rule of
 * 2026-10-07) — made to every referee until v2026-10-07, and kept since for every referee named before that version.
 *
 * ⭐ WHY THE MIGRATION COULD NOT DO THIS. A referee key is an HMAC of the number (or of the e-mail address) under
 * `OTP_PEPPER`, and the pepper lives in the application, never in Postgres — writing it into
 * `20261007150000_agent_referee_key/migration.sql` would commit a production secret to git (the precedent:
 * `scripts/ops-backfill-id-fingerprints.mts`). So the table ships EMPTY and this fills it, inside production's environment,
 * where the pepper already is. Referees named from this deploy on are keyed by `setReferees` itself, and an applicant's
 * erasure keys theirs before it empties them; this door is for every application that predates the deploy.
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
 *   status   — the census: counts, and the CONTACTS the reader could not read, each as its application id and its referee
 *              place (one or two) — never a number, a name or a contact.
 *   backfill — key every promised application's referees (numbers and e-mail addresses), then the census and RECORD.
 *   key --application <id> --referee one|two --by "<who>"
 *            — a person read THAT contact and found the referee's mobile number: type it when asked, then type it AGAIN.
 *              Neither is shown as you type, neither is ever printed; each must be the whole number and nothing else (no
 *              guessing at a digit too many), and the two must be the same number, or nothing is keyed.
 *              ⛔ `key`: run it in PowerShell or Windows Terminal — the number must be typed, never piped.
 *              `key` refuses to run when its input
 *              is not a real console (a pipe, `ssh -T`, a CI or an agent's shell), because a number piped in is a number in
 *              a shell history, a transcript or a file.
 *   reviewed --application <id> --referee one|two --reason <code> --by "<who>"
 *            — a person read THAT contact and it holds NO mobile number; the reason is ONE of landline, foreign_number,
 *              postal_address, id_number, date, incomplete_number, no_phone — never free text.
 * Each hand step writes ONE COMPLIANCE audit row naming the application, the referee place, the step and who — never the
 * number — and handles THAT contact alone, until the application's referees are named again.
 *
 * ⛔ NO BUSINESS LOGIC OF ITS OWN. It calls `refereeKeyCensus`, `backfillRefereeKeys`, `unreadableRefereeApplications`,
 * `keyRefereeNumberByHand` and `recordRefereeContactReviewed` (`referee-exclusion.ts`) — the SAME reader, e-mail lookups,
 * key and writer the service uses. Its refusals are ONE pure rule there too, `refereeKeysDoorVerdict`
 * (`test:marketing-consent` R10 runs it, and pins this file's order, with plants).
 * ⛔ IT PRINTS COUNTS, APPLICATION IDS AND REFEREE PLACES ONLY: never a number, a key, a name, an e-mail or a contact — and
 * what a person types is read without echo and handed to the writer, never logged.
 * ⛔ IT REFUSES WITHOUT A DATABASE (a no-database process would key the in-memory store and report success), WITHOUT
 * `OTP_PEPPER` ITSELF (the dev fallback would key under the wrong pepper), and A WRITE REFUSES UNLESS IT RUNS WITH
 * PRODUCTION'S OWN ENVIRONMENT, AS `railway run` INJECTS IT — keys made under any other pepper would never match
 * production's lookups. `--scratch` lets a write reach a LOOPBACK database (the integrator's scratch Postgres).
 * ⛔ IDEMPOTENT: a key already held is skipped, so a re-run writes nothing new.
 *
 * Run it through Railway (the URL is rewritten to the public proxy, as every ops script in this repo does; never printed):
 *   railway run --service 50pick npm run ops:marketing-referee-keys -- status
 *   railway run --service 50pick npm run ops:marketing-referee-keys -- backfill
 *   railway run --service 50pick npm run ops:marketing-referee-keys -- key --application <id> --referee one --by "<who>"
 *   railway run --service 50pick npm run ops:marketing-referee-keys -- reviewed --application <id> --referee two --reason landline --by "<who>"
 * and against a scratch database:
 *   DATABASE_URL=postgresql://…@127.0.0.1:5461/… npm run ops:marketing-referee-keys -- backfill --scratch
 *
 * Exit: 0 done (after a backfill: every promised referee's number and address keyed, no unhandled contact unreadable) ·
 * 1 a backfill that left a key missing or a contact unreadable, or a hand step refused · 2 not run (usage, no database, no
 * pepper, a write outside production's environment without --scratch, no application id, no referee place, a reason not
 * on the list, no `--by`, or `key` without a real console).
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
  return `${c.applications} application(s) · ${c.promised} promised · ${c.withContact} with a referee contact · ${c.numbers} referee number(s) · ${c.emails} referee e-mail address(es) · ${c.missing} not yet keyed · ${c.unreadable} unreadable · ${c.reviewed} handled by hand · ${c.notMobile} landline or foreign · ${c.emailOnlyUnmatched} e-mail with no number found`;
}

/** The census's counts in the code's own shape — what the commit that records the run copies into
 *  `REFEREE_KEYS_ON_PRODUCTION`. Counts only. */
function countsOf(c: RefereeKeyCensus): RefereeKeyCensus {
  return {
    applications: c.applications, promised: c.promised, withContact: c.withContact, numbers: c.numbers, emails: c.emails,
    missing: c.missing, unreadable: c.unreadable, reviewed: c.reviewed, notMobile: c.notMobile, emailOnlyUnmatched: c.emailOnlyUnmatched,
  };
}

/** ⛔ MINOR-2 · MINOR-4 · a contact the reader could not read is a referee nobody can say is excluded — said every time, with
 *  the contacts to look at (application ids and referee places only) and the two ways a person handles one. */
async function warnUnreadable(c: RefereeKeyCensus): Promise<void> {
  if (c.unreadable === 0) return;
  const contacts = await unreadableRefereeApplications();
  console.log(`⚠️ ${c.unreadable} referee contact(s) hold digits the reader cannot key with certainty — nobody can say those referees are excluded, and the referee check stays outstanding until this is 0.`);
  console.log(`   Contacts to look at: ${contacts.map((x) => `${x.applicationId} referee ${x.referee}`).join(", ")}`);
  console.log('   For each, read that contact on the console, then either `key --application <id> --referee <one|two> --by "<who>"` (type the mobile number twice when asked) or `reviewed --application <id> --referee <one|two> --reason <code> --by "<who>"` (it holds no mobile number).');
}

/** ⛔ One line from the person, NEVER echoed: the keys are read raw from a real console and nothing is written back. The
 *  door's rule has already refused `key` without one (`not_a_terminal`); this refuses too, rather than read a pipe. */
async function readQuietly(prompt: string): Promise<string> {
  const stdin = process.stdin;
  if (stdin.isTTY !== true) throw new Error("not a console — the number must be typed, never piped");
  process.stderr.write(prompt);
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

/** A hand step's answer, said — never the number. */
function sayHand(r: RefereeHandResult, done: string): number {
  if (r.ok) {
    console.log(done);
    return 0;
  }
  const why: Record<string, string> = {
    no_application: "REFUSED: no application has that id.",
    no_contact: "REFUSED: that application holds no contact in that referee place.",
    not_promised: "REFUSED: that application's referees were named after the re-worded §9 went live — they were never promised, so nothing is keyed.",
    not_a_number: "REFUSED: what was typed is not one whole Tanzanian mobile number and nothing else — nothing was keyed (and nothing of it is printed). Try again.",
    mismatch: "REFUSED: the two numbers typed are not the same number — nothing was keyed. Try again, carefully.",
    bad_reason: "REFUSED: the reason must be one code from the list in the header.",
    bad_by: "REFUSED: say who you are with --by.",
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
    stdinIsTerminal: process.stdin.isTTY === true,
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
    const place = `application ${verdict.applicationId}, referee ${verdict.referee}`;
    const typed = await readQuietly(`Type the referee's mobile number for ${place}, then Enter (it is not shown): `);
    const again = await readQuietly("Type it again to confirm (it is not shown): ");
    return sayHand(await keyRefereeNumberByHand({ applicationId: verdict.applicationId ?? "", referee: verdict.referee ?? "one", typed, again, by: verdict.by ?? "" }),
      `KEYED: ${place} — the number is excluded, and its audit row names the application and the place only.`);
  }
  if (verdict.command === "reviewed") {
    return sayHand(await recordRefereeContactReviewed({ applicationId: verdict.applicationId ?? "", referee: verdict.referee ?? "one", reason: verdict.reason ?? "", by: verdict.by ?? "" }),
      `RECORDED: application ${verdict.applicationId}, referee ${verdict.referee} — a person read that contact and found no mobile number (${verdict.reason}).`);
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
