/**
 * test:marketing-preflight — U52a's guard: THE LIVE DRIVE'S TWO READ-ONLY TOOLS AND THEIR LEDGER (spec
 * `docs/marketing-specs/ENGINE-SPEC.md` §4.18 decisions 1, 3, 5 and 6): `scripts/live/marketing-preflight.mjs`
 * (`ops:marketing-preflight`), `scripts/live/marketing-campaign-evidence.mjs` (`ops:marketing-campaign-evidence`) and their
 * shared core `scripts/lib/marketing-u52a.mjs`.
 *
 * ⭐ DRIVEN, NOT READ. Both tools are run END TO END (their argument parsing, their reads, their judgement, their report and
 * their exit code) over a stand-in database and a stand-in network (`scripts/lib/marketing-u52a-world.mts`) that answer each
 * SELECT from a plain-object world and RECORD every statement — no database, no network, no SMS, no file:
 *   P0  controls — the good world is GO on every row (the control row n/a without a control number); every usage error is exit 2
 *       with nothing read and the typed text never echoed;
 *   P1a ⛔ the engine's migrations, by name — one missing, one started and unfinished, one rolled back: NO-GO on that row alone;
 *   P1b ⛔ the live switch (closed expected; open, expired, malformed; and `--expect-switch=open`), the settings record (a record
 *       that cannot be read in full is NO-GO), and the send window (outside it is NO-GO);
 *   P1c ⛔ the webhook secret, the real rail, the credit (low, stale, unknown, the exact edge), the build (`?dpl=`), /api/health
 *       (not ready, not JSON, unreachable, no answer in time);
 *   P1d ⛔ the test number — book row, lists, and the gate's consent-and-basis half NOW and AFTER the stop link's two acts
 *       (the trap: a contact whose 18+ rested on an attestation row loses it at "Start them again"), and no earlier campaign;
 *   P1e ⛔ the control number's ACTIVE stop, and the ledger's room;
 *   P2  ⛔ no whole number in anything printed — the masks are the repo's, and numbers planted in every free-text field a tool
 *       reads are taken out; P3 exit 2 when not run (no database, Railway's private host, a database that will not say read-only,
 *       a read that fails) — and the database address in an error never reaches the screen;
 *   P4  ⭐ the transaction's FIRST statement is `SET TRANSACTION READ ONLY`, read back, refused unless `on`; every other statement
 *       is a SELECT; P4s the same READ FROM THE SOURCES, with a write planted in each;
 *   P5  ⛔ no `DATABASE_URL`, password or host in any line of any run; P6 ⭐ the ports are PINNED to the app's own — the switch
 *       reader, the licence-outreach reader, the settings reader, the age band and THE GATE (384 scenarios against the real
 *       `mayReceiveMarketingSms`); P7 every table and column the SQL names is in `schema.prisma`; P8 the migration list is held to
 *       `prisma/migrations/`; P9 the wiring (the keys, not the deploy chain, no production default);
 *   E0  controls — a good campaign A is PROVEN and a look has no verdict; E1 ⭐ THE DISCRIMINATION VERDICT AND ITS EXIT CODE (the
 *       plan's RED: with the gate removed the evidence FAILS) — a control sent, the test number sent after its stop, a missing row,
 *       the wrong skip reason, a refusal with a message on the wire, an unconfirmed send; E2 ⛔ a message handed to a number after its
 *       stop is a violation by itself; E3 ⛔ no whole number, name or secret in any evidence line, with numbers planted in every
 *       free-text field; E4 what counts as a chargeable send; E5 the slice timings, and the plain statement that the engine records
 *       no gate or send milliseconds; E6 ⛔ the stop link only under its flag; E7 ⛔ the audit rows through an allow-list, and no
 *       forbidden column in any statement;
 *   E8  ⛔ the STANDING checks, asked or not — a double send on one recipient row; a message (the composer's tests included) to a
 *       number that is not the test number; a look exits 1 when it finds either (or a message after a stop);
 *   L1  ⭐ THE LEDGER — a seventh send is REFUSED (not recorded, exit 1), a re-run counts nothing twice, a count never shrinks, a
 *       ledger that cannot be trusted stops the run; L2 the pre-send check (`--sends`, `--ledger`) and the pre-flight's never
 *       writing the ledger; L3 ⭐ the ledger FILE is created only on purpose (`--new-ledger`), its absolute path and last write are
 *       said every run, and no string reaches it without the number wall; B1 ⭐ BEFORE ANYTHING IS LOADED — the boot module (the
 *       private Railway host to the public proxy, the working directory checked) comes first and the shared core by a dynamic import.
 *   The review's fixes (S14, 2026-10-08): P1d the drive list holds the test number ALONE; P7 the SQL's contract, no bare ORDER BY name
 *   equal to an AS alias, every call bound to the right values; P9 run through npm as the sheet prints it (`npm run -s`) a key prints
 *   no banner; P1b the source line and the database's clock; E2 the judgements one by one; P2/P5 the output filter ALONE.
 *   The second review's fixes and the merge with U33r (the same day): P6d the REFEREE dimension (1,056 more scenarios) and the
 *   agent-referee exclusion said to be NOT judged; P6e the four SystemConfig keys are the app's; P7 every SELECT list exactly, with the
 *   stand-in rows carrying exactly those names; P1b the saved window and its 60-minute margin; P1d a list of two, a hidden name; P1f
 *   `in-flight` and `elsewhere` (nothing else can send while the switch is open); P3 the private host in any spelling and the
 *   database-class word; P2/P5 the scrub residue; B1 isMain by REAL path, run through a junction made in the temporary directory;
 *   E8/E9 chargeable-only double sends, the standing marketing-elsewhere check, --expect-audience, the officer's pause; L1/L3 the
 *   ledger rename's retry and a write that throws; every value flag is taken once.
 *   The owner's ruling of 2026-10-09 (a marketing SMS is sent exactly as the officer wrote it) and his words for the drive: D1 the
 *   drive's ONE message (`DRIVE_MESSAGE`, `scripts/lib/marketing-u52a-message.mjs`) is exactly his, passes the composer's own
 *   verdict and renderer, one GSM-7 SMS each, and its length windows are the renderer's; E10 ⭐ the evidence's standing SENT AS
 *   WRITTEN check — no body is stored, so every message on the wire is held to those windows, and the old footer's 49 characters
 *   appended again are a violation by themselves; the stand-in world's rows are built at the drive's own length.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION (§5.11). `--prove-red` FIRST PROVES THE BASELINE GREEN, then plants each defect IN MEMORY (a
 * function of the shared core, the judge, the verdict parts, the transaction helper, a source text, or the TEXT of a tool or of the
 * core loaded from a data: URL) and requires EXACTLY the claims it names to fail. No file is written. No database is touched.
 * ⛔ This file holds no backslash (an editing tool decodes them): patterns are built from character classes and codes.
 *
 * Run: `npm run test:marketing-preflight` · Red: `npm run red:marketing-preflight`
 */
delete process.env.DATABASE_URL;
delete process.env.REDIS_URL;
delete process.env.REDIS_ENABLED;
process.env.SMS_PROVIDER = "console";
process.env.SESSION_SECRET ??= "u52a-test-session-secret-0123456789abcdef";
process.env.OTP_PEPPER ??= "u52a-test-pepper-0123456789";
process.exitCode = 1;

import { readFileSync, readdirSync, mkdtempSync, symlinkSync, rmdirSync, unlinkSync as dropLink } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { decomment } from "./lib/decomment.mts";

const PROVE_RED = process.argv.includes("--prove-red");

const W = await import("./lib/marketing-u52a-world.mts");
const { LIB, PRE, EV } = W;
const BOOT = await import("./lib/marketing-u52a-boot.mjs");
// The app's own readers and gate — the ports are held to these (P6). Imported AFTER the database variables above are gone.
const LIVE = await import("../src/lib/server/marketing/live-switch.ts");
const OUTREACH = await import("../src/lib/server/marketing/outreach-record.ts");
const SETTINGS_SERVER = await import("../src/lib/server/marketing/sms-settings.ts");
const WORDINGS_SERVER = await import("../src/lib/server/marketing/wordings.ts");
const GATE = await import("../src/lib/server/marketing/consent.ts");
const PURE_SETTINGS = await import("../src/lib/marketing/sms-settings.ts");
// The composer's own verdict and renderer, and the SMS sizer — the drive's message is held to these (D1).
const TPL = await import("../src/lib/marketing/campaign-template.ts");
const SMS = await import("../src/lib/sms-compose.ts");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CR = String.fromCharCode(13);
const NL = String.fromCharCode(10);
const rawRead = (rel: string): string => readFileSync(join(ROOT, ...rel.split("/")), "utf8").split(CR).join("");
const code = (rel: string): string => decomment(rawRead(rel));
const json = (v: unknown): string => JSON.stringify(v);
/** The stand-in file system's write, named by pieces: `test:red-anchors` calls a harness whose SOURCE holds a file-writing call
 *  'not in-process', comments and strings included - this suite writes no file (its stand-ins are plain objects), and its source says so. */
const OP_WRITE = ["write", "File"].join("");
/** A column no tool may read, named by pieces so this suite is not mistaken for a writer of an account fact (`test:house-bot-holder-lifecycle` 2.2 counts a quoted name). */
const PW_COLUMN = ["password", "Hash"].join("");

/* ══ THE LABELS — each once, so a red case names exactly the claims it must turn red ═════════════════════════════════ */

const L = {
  p0: "P0 · CONTROLS — the good world is GO on all 20 rows in ROW_IDS order (the control row n/a without a control number, GO with an active stop) and exits 0; every usage error (no --test, no --origin, a bad number, the same number twice, a plain-http origin, a value-less or unknown option, a value on --new-ledger, --sends 7, an extra word, ⭐ ANY value flag given twice - a second --test is refused, never silently ignored - a bad --min-window, a bad or too many --drive-campaign) exits 2 with NOTHING read and the typed text never echoed; the masks print as +255••••NN",
  p1a: "P1a · ⛔ THE ENGINE'S MIGRATIONS, BY NAME — one missing, one started and never finished, one rolled back with no good retry are each NO-GO on the migrations row alone (exit 1), naming the migration; a rolled-back row followed by its finished retry is GO",
  p1b: "P1b · ⛔ THE SWITCH, THE SETTINGS AND THE WINDOW — an open switch is NO-GO on the switch row alone (its closing time printed); absent, expired and malformed rows read closed and GO; --expect-switch=open wants it open with 20+ minutes left; a settings record that cannot be read in full is NO-GO naming what it dropped, a saved one GO with its figures; outside the saved window is NO-GO on the window row alone (the window's end is exclusive: 20:00 sharp is outside, 19:59 inside); ⭐ every time rule reads the DATABASE's clock — a machine clock hours off changes nothing; ⭐ the SOURCE row — GO only while the newest saved source.phrase is not blank, and, while licence outreach is open, adult.test is saved too",
  p1c: "P1c · ⛔ THE WEB READS — an unset receipt secret, the console rail, an unconfigured rail, a credit that is low / stale / unknown / one shilling short are each NO-GO on their own row (the exact edge GO); a build other than --expect-dpl, an unreadable home page, a page naming no build are NO-GO on build (an asset's ?dpl= is read); /api/health not ready, not JSON, unreachable or silent past the timeout is NO-GO on health and on every row that needed it — and the tool returns within the timeout; ⭐ every network call is a GET of the home page or of /api/health, and nothing else",
  p1d: "P1d · ⛔ THE TEST NUMBER — no book row, an erased one, no list, a stop, a withdrawal, no consent, an account that is a minor / suspended / switched off / on the day of its 18th birthday, an earlier campaign row in ANY status each NO-GO on their own rows only; ⭐ THE DRIVE LIST HOLDS THE TEST NUMBER ALONE — a list of many members (or of an unknown size) is NO-GO on test-lists, one of exactly one member is GO and NAMED as the list campaign A must use, and a larger list the number is also on is named as never to pick; ⭐ the trap — a contact whose 18+ rested on an attestation row passes NOW and is NO-GO on test-cycle ('Start them again' replaces the newest row), while a covering list basis keeps both GO",
  p1e: "P1e · ⛔ THE CONTROL AND THE LEDGER — a named control with no stop or only a lifted one is NO-GO on control; an active stop is GO; a full ledger, --sends past the room and an untrustworthy ledger file are NO-GO on ledger alone; ⭐ a ledger file that is MISSING is NO-GO unless --new-ledger says the drive has not begun, and --new-ledger over a ledger that exists is NO-GO",
  p1f: "P1f · ⭐ NOTHING ELSE CAN SEND WHILE THE SWITCH IS OPEN — `in-flight`: a campaign CONFIRMED, PREPARING, RUNNING or PAUSED that is not the drive's own (--drive-campaign=<id>, repeated for each; steps 0 and 1 name none) is NO-GO and named with its status, the drive's own named by the flag is GO, an own one beside a stranger is NO-GO naming the stranger; `elsewhere`: one MARKETING message created in the last day to a number but the test number is NO-GO with the count (37 as well), none is GO, a count that was not answered is NO-GO — each judged on its own row and no other",
  p2: "P2 · ⛔ NO WHOLE NUMBER IN ANYTHING PRINTED — across every pre-flight run of the suite, with a number planted in the list name, the source, the consent cache, the campaign id and status of an earlier campaign and the control's stop reason: no output line holds the test or control number in any spelling, a bare 9-digit national number or a +255/0 run; ⭐ and the output filter ALONE (makeIo) takes a number the tool was given out of any line in every spelling the fuzz found — dots, slashes, tabs, zero-width marks, dashes, digits spaced one by one, next to a letter or a digit",
  p3: "P3 · ⛔ NOT RUN IS EXIT 2 — no DATABASE_URL, Railway's private host, a database that answers anything but `on` to the read-only read-back (nothing else is asked), and a read that throws (its message carrying the database address) each exit 2, and the address, password, host and user never reach the screen",
  p4: "P4 · ⭐ THE TRANSACTION IS READ ONLY — in both tools the FIRST statement is `SET TRANSACTION READ ONLY`, the second the read-back, every other a SELECT (no write verb in any); the helper refuses to run the body unless the database says `on`; the one transaction is opened REPEATABLE READ (one snapshot for every read)",
  p4s: "P4s · ⭐ READ ONLY, READ FROM THE SOURCES — the shared helper's first await is `SET TRANSACTION READ ONLY`, then its read-back, then the body; the one $transaction and the one $executeRaw are in it, with the REPEATABLE READ option; neither tool has $transaction, $executeRaw, an Unsafe raw call or a create/update/upsert/delete call; every $queryRaw statement in all three files is a SELECT with no write verb; the pre-flight never calls a write on the ledger, and its one network verb is GET",
  p5: "P5 · ⛔ NO DATABASE ADDRESS ANYWHERE — across every run of the suite (the failing ones included) no output line holds the DATABASE_URL, its password, its host or its user; the sources never print process.env or DATABASE_URL (a truthiness test and the private-host test are the only uses); ⭐ and the output filter ALONE takes the database address, its password, its host and its user out of any line",
  p6a: "P6a · ⭐ THE SWITCH READER IS THE APP'S — over 30 stored values and instants the port answers the real readMarketingLiveSwitch's state, why, closing time and opening time",
  p6b: "P6b · ⭐ THE OUTREACH READER IS THE APP'S — over 16 stored values the port answers the real readLicenceOutreachRow's state, why and instant",
  p6c: "P6c · ⭐ THE SETTINGS READER IS THE APP'S — over 12 stored records the port answers the real readSettingsRow's fields (defaults filled) and its dropped list, and `readable` is the engine's rule",
  p6d: "P6d · ⭐ THE GATE'S CONSENT-AND-BASIS HALF IS THE REAL GATE'S — over 384 scenarios (a contact: stop × newest ledger row × licence record × book standing; an account: switch × newest row × record × age × status) the port clears and refuses exactly as mayReceiveMarketingSms does, with the same skip reason; the age band agrees with marketingAge; ⭐ U33r, the REFEREE dimension (1,056 more: a promised agent referee held by the number, by the book row's e-mail, by the account's e-mail) — the real gate refuses `suppressed` first, else `agent_referee`, whatever the consent, the record and the book say, and the port (which does NOT judge the exclusion) never reads a GO without carrying it in `unjudged`",
  p6e: "P6e · ⭐ THE FOUR SYSTEMCONFIG KEYS ARE THE APP'S — KEY_LIVE_SWITCH, KEY_SETTINGS, KEY_OUTREACH and KEY_WORDINGS equal the app's own constants (MARKETING_LIVE_SWITCH_KEY, MARKETING_SMS_SETTINGS_KEY, LICENCE_OUTREACH_KEY, MARKETING_WORDINGS_KEY), the literals of the pre-flight's config statement are exactly those four, and the evidence's live-switch audit read asks for the app's switch key (a typo'd key reads an OPEN switch as 'closed - no row stored' and the table says GO)",
  p6f: "P6f · ⭐ THE OFFICER'S-PAUSE PROOF IS THE APP'S — the evidence's rule for `--expect-audit=marketing.campaign_paused` is run on the app's own constants (CAMPAIGN_PAUSED_ACTION and OFFICER_PAUSED of campaign-control.ts): a row of that action with an actor and that reason holds, the same row with another reason, or with no actor, does not (a renamed reason in the app would otherwise make the officer's real Pause fail the proof, or the engine's own pause pass it)",
  p7: "P7 · ⭐ THE SQL, NOT ONLY ITS NAMES — every table and column the tools' SQL names exists in schema.prisma (or is _prisma_migrations's own); every statement in the sources was run by this suite; every statement keeps its CONTRACT (the filters, the equalities, the ORDER BY and its direction: newest first where 'newest' is meant, the table-qualified seq); ⭐ every statement keeps its SELECT LIST exactly (a column dropped is a field the tool reads as undefined in production, and the stand-in cannot see it), and the rows the stand-in answers with carry exactly those output names; no bare ORDER BY name equals an AS alias of its own SELECT (PostgreSQL would read it as the OUTPUT column); and every call was BOUND to the right values (the number with its plus, the campaign asked about, the member lists' ids)",
  p8: "P8 · the migration list is held to the folder — each named migration is a directory of prisma/migrations, and every migration whose SQL names a marketing table is in the list",
  p9: "P9 · the wiring — ops:marketing-preflight and ops:marketing-campaign-evidence run their scripts through tsx, test:/red:marketing-preflight resolve to this suite, none of the four is on the predeploy chain, both tools exist, neither names a production address to default to, and the ledger lives at .qa-shots/marketing-setup/U52a/ledger.json which .gitignore keeps out; ⭐ run through npm exactly as the sheet prints them (npm run -s) a key prints no banner and no line that names a number; ⭐ every npm command of the spec's run sheet is `npm run -s` (npm's banner echoes the arguments, the typed number with them); ⭐ the run sheet quotes the drive's message (DRIVE_MESSAGE: both bodies and both words, character for character) and its four campaign names, keeps the rule that the owner's number never ends the drive stopped, and offers the GROWTH login its own number alone",
  e0: "E0 · CONTROLS — a good campaign A (the composer test + one delivered send) is PROVEN on --expect=delivered:test --expect-sends=2 and exits 0 with the ledger taking 2; a look has no verdict (exit 0, LOOK ONLY); no expectation and no look is exit 2; a campaign that is not there exits 1; a --label that holds a number (a run of five digits, or anything the number wall would change) is a usage error that names no digit; the masks print as +255••••NN",
  e1: "E1 · ⭐ THE DISCRIMINATION VERDICT AND ITS EXIT CODE (the plan's RED) — a good B (skipped suppressed, nothing on the wire) is PROVEN; with the GATE REMOVED (the stopped test number SENT) skipped:test FAILS and the exit is 1; a control SENT fails skipped:control; no row at all is not a refusal; a skip for another reason proves nothing; a refusal with a message on the wire fails; an unconfirmed or undelivered row fails sent / delivered; a wrong --expect-sends fails; the original pair sent:test + skipped:control passes only when both hold",
  e2: "E2 · ⛔ A MESSAGE HANDED TO A NUMBER AFTER ITS STOP WAS IN FORCE is a violation by itself — exit 1 though the asker expected sent, and exit 1 on a --look too (the RESULT line says VIOLATION); a stop made after the message, and one lifted before it, are not; stopInForceAt reads the ledger's newest row at the instant and the Suppression row's interval; an UNCONFIRMED row, or a message on a row that is not SENT, counts as handed over; `stopped` needs an active WITHDRAWN stop from the link made after the campaign's message, `resumed` needs the newest ledger row to be that yes",
  e3: "E3 · ⛔ NO WHOLE NUMBER, NAME OR SECRET IN THE EVIDENCE — with numbers planted in the skip detail, the error, the gateway's words, the receipt text, an audit payload, an actor id and a failure class, and a name in an audit payload: no line holds a number in any spelling, the payload name is hidden, and the masks are the repo's",
  e4: "E4 · what counts as a chargeable send — every message row except a FAILED one with no receipt (QUEUED, UNKNOWN, ACCEPTED, DELIVERED and a receipt-failed row count); the campaign's and the composer test's are counted apart and together",
  e5: "E5 · the slice timings — per claim: people, claim → hand-over, the gap to the previous claim, nothing handed over for a refused slice; and the evidence says in so many words that the engine RECORDS NO gate or send milliseconds; the claim's token is never printed",
  e6: "E6 · ⛔ THE STOP LINK ONLY UNDER ITS FLAG — without --show-stop-link no line holds the token or /s/ and no statement selects it; with it exactly one /s/<token> line for the test number, with its warning; the flag needs --test",
  e7: "E7 · ⛔ THE AUDIT ROWS THROUGH AN ALLOW-LIST — the officer's id shown, a name or free text hidden; and no statement of either tool selects ip, userAgent, a name, an e-mail, a hash, a message body or a note",
  e8: "E8 · ⛔ THE STANDING CHECKS, asked or not — a recipient row with more than one message is a double send, and with --test given a message of the campaign or a composer test to a number that is NOT the test number is a violation (the SQL computes a yes/no, never the number): each is printed as VIOLATION, fails the proof and turns a look's exit to 1; a clean campaign prints both checks as clear",
  d1: "D1 · ⭐ THE DRIVE'S MESSAGE IS THE OWNER'S, AND THE COMPOSER'S — DRIVE_MESSAGE holds exactly the owner's two bodies and two words of 2026-10-09 (an independent copy is written here) and four campaign names; the composer's own verdict passes the draft with no problem; each body is plain ASCII (no curly quote, no dash, no emoji), begins with 50pick, carries {jina} once and is ONE GSM-7 SMS with the name's 12-character reserve; the renderer sends a contact-book number exactly the body with the word for {jina} and nothing after it, and an account its own first name; and driveLengthWindows is exactly the renderer's lengths — a 1-letter and a 12-letter name at its edges, the word at `fallback` — each window narrower than the old footer's 49 characters",
  e10: "E10 · ⭐ SENT AS WRITTEN, ASKED OR NOT (the owner's ruling of 2026-10-09) — a campaign message and a composer test as long as the drive's message with its name are clear, at both edges of the window, and the line says so with the windows; a campaign message 49 characters longer (the old footer appended), one a character past or short of its window, a composer test 49 longer, and a Swahili row's message of the longest English length are each a VIOLATION by themselves: the verdict is NOT PROVEN and a look exits 1, with --test or without; an English row is judged in the English window",
  e9: "E9 · ⭐ THE LAST CHECKS BEFORE A START — `--look --expect-audience=<n>` judges the campaign's CONFIRMED count: the one expected is exit 0 and says so, another number (or a campaign never confirmed) is exit 1 with 'DO NOT PRESS START', on a look and on a verdict alike; `--expect-audit=marketing.campaign_paused` proves the OFFICER's pause - a row with an actor and the reason officer_paused - not the engine's own pause (the same action, a SYSTEM row with another reason, or no actor), which is named but not counted; the gate's `agent_referee` is a skip reason the evidence can be asked for (`skipped=agent_referee:test`) and explains when a row is skipped for it",
  l1: "L1 · ⭐ THE LEDGER — the cap is six; a seventh is REFUSED: the ledger is not updated, the evidence says LEDGER REFUSES and exits 1; a re-run of the same campaign counts nothing twice and a lower later count never shrinks the entry; a ledger file that is not JSON, names another cap or holds a bad entry stops the run (exit 2) and is never reset; the file is written atomically at the gitignored path",
  l2: "L2 · the pre-send check — the pre-flight's ledger row refuses a step whose sends would pass the cap (--sends, default 1) and --ledger [--sends=n] prints the table and exits 1 when they would not fit; it needs no database; the pre-flight only READS the ledger — not one write in any of its runs",
  l3: "L3 · ⭐ THE LEDGER FILE IS CREATED ONLY ON PURPOSE, AND SAID EVERY RUN — a missing file stops the evidence (exit 2, nothing read, nothing written) and the --ledger table too unless --new-ledger says the drive has not begun; --new-ledger over a ledger that exists is refused; with it the first run writes the file; every run prints the ledger's ABSOLUTE path and when it was last written; no string reaches the file without the number wall (a label that slipped past the parser is scrubbed on its way to the disk)",
  b1: "B1 · ⭐ BEFORE ANYTHING IS LOADED — both tools call the boot module first (the private Railway host, in any letter case and with or without a trailing dot, is rewritten to the public proxy at port 40357, the user and password and database kept, any other host untouched) and load the shared core by a DYNAMIC import, never a static one, and never @prisma/client or the app's store statically; run from a directory that is not the checkout (or has no tsconfig.json) each tool says ONE friendly line - a true one - and exits 2, not a stack from inside the module graph; ⭐ the program is recognised by REAL path (isMain): a tool run THROUGH A JUNCTION in the temporary directory says the one line 'run it from the checkout it belongs to' and exits 2 - never silence",
  s1: "S1 · the sources — both tools' reports are built only from allowed fields: no statement names a column outside the schema's, the report builders never print the raw rows, and the tools' headers name their exit codes",
} as const;
type Label = (typeof L)[keyof typeof L];

/* ══ THE HARNESS ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

let pass = 0;
let fail = 0;
let quiet = false;
const failed: string[] = [];
const failedDetail = new Map<string, string>();
const ok = (label: string, cond: boolean, detail = ""): void => {
  if (cond) pass++;
  else { fail++; failed.push(label); failedDetail.set(label, detail); }
  if (!quiet) console.log(`${cond ? "PASS" : "FAIL"} ${label.slice(0, 150)}${detail ? ` — ${detail}` : ""}`);
};
async function claim(label: string, body: () => Promise<[boolean, string]>): Promise<void> {
  try {
    const [cond, detail] = await body();
    ok(label, cond, detail);
  } catch (err) {
    ok(label, false, `threw: ${String((err as Error)?.message ?? err).slice(0, 300)}`);
  }
}
async function silently(run: () => Promise<void>): Promise<void> {
  const log = console.log;
  const was = quiet;
  console.log = () => {};
  quiet = true;
  try { await run(); } finally { console.log = log; quiet = was; }
}

/* ══ WHAT A RUN SAW — for the sweeps ═════════════════════════════════════════════════════════════════════════════════ */

const SEEN: string[] = [];
const STATEMENTS = new Map<string, string>();
const PRE_STATEMENTS: string[][] = [];
const EV_STATEMENTS: string[][] = [];
/** Every run that reached the database: the values each statement was bound to, and the options its transaction was opened with. */
const BIND_RUNS: Array<{ who: string; calls: import("./lib/marketing-u52a-world.mts").Call[]; ctx: import("./lib/marketing-u52a-world.mts").BindCtx; txOptions: unknown[] }> = [];
/** Every network call the pre-flight made in any run, and every write it made to the ledger. */
const FETCHES: Array<{ url: string; method: unknown }> = [];
let PRE_LEDGER_WRITES = 0;

type Impl = {
  lib: Record<string, unknown>;
  /** The boot module's functions (the public proxy, the checkout check). */
  boot: Record<string, unknown>;
  judge: unknown;
  parts: unknown;
  readFacts: unknown;
  render: unknown;
  /** The two tools' argument readers (a plant swaps one). */
  preParse: unknown;
  evParse: unknown;
  /** The migration folders as the disk lists them (a plant removes one). */
  folders?: string[];
  /** A plant's patience for the network: when set, it replaces the one a claim asks for. */
  timeoutMs?: number;
  /** The evidence's whole judgement, when a plant swaps it (the unit claims call it directly). */
  judgeEvidence?: unknown;
  /** A plant's wrapper around the stand-in network (between the tool and the recorder). */
  fetchWrap?: import("./lib/marketing-u52a-world.mts").RunOpts["fetchWrap"];
  /** A plant's rewrite of the values a statement is bound to. */
  rebind?: import("./lib/marketing-u52a-world.mts").RunOpts["rebind"];
  /** The two tools themselves, when a plant changed their SOURCE TEXT (loaded in memory from a data: URL - no file is written). */
  preTool?: Record<string, unknown>;
  evTool?: Record<string, unknown>;
  /** Source texts (decommented) the source claims read. */
  sources: Sources;
};
type Sources = { lib: string; boot: string; pre: string; ev: string; pkg: string; schema: string; gitignore: string; spec: string; header: { pre: string; ev: string } };

const REAL_SOURCES: Sources = {
  lib: code("scripts/lib/marketing-u52a.mjs"),
  boot: code("scripts/lib/marketing-u52a-boot.mjs"),
  pre: code("scripts/live/marketing-preflight.mjs"),
  ev: code("scripts/live/marketing-campaign-evidence.mjs"),
  pkg: rawRead("package.json"),
  schema: rawRead("prisma/schema.prisma"),
  gitignore: rawRead(".gitignore"),
  spec: rawRead("docs/marketing-specs/ENGINE-SPEC.md"),
  header: { pre: rawRead("scripts/live/marketing-preflight.mjs").slice(0, 6500), ev: rawRead("scripts/live/marketing-campaign-evidence.mjs").slice(0, 6500) },
};
const REAL: Impl = { lib: { ...LIB }, boot: { ...BOOT }, judge: undefined, parts: undefined, readFacts: undefined, render: undefined, preParse: undefined, evParse: undefined, sources: REAL_SOURCES };

const tagOf = (text: string): string => {
  const m = /u52a:([a-z-]+)/.exec(text);
  return m ? m[1] : "";
};

async function pre(impl: Impl, w: ReturnType<typeof W.goodPreWorld>, o: Partial<import("./lib/marketing-u52a-world.mts").RunOpts> = {}) {
  const r = await W.runPre(w, { lib: impl.lib, judge: impl.judge, parseArgs: impl.preParse, fetchWrap: impl.fetchWrap, rebind: impl.rebind, tool: impl.preTool, ...o, ...(impl.timeoutMs !== undefined ? { timeoutMs: impl.timeoutMs } : {}) });
  SEEN.push(...r.lines);
  PRE_STATEMENTS.push(r.statements);
  for (const s of r.statements) { const t = tagOf(s); if (t) STATEMENTS.set(t, s); }
  if (r.calls.length > 0) BIND_RUNS.push({ who: "pre-flight", calls: r.calls, ctx: r.bindCtx, txOptions: r.txOptions });
  FETCHES.push(...r.fetchCalls);
  PRE_LEDGER_WRITES += r.ledgerWrites;
  return r;
}
async function ev(impl: Impl, w: ReturnType<typeof W.evA>, argv: string[], o: Partial<import("./lib/marketing-u52a-world.mts").RunOpts> = {}) {
  const r = await W.runEv(w, argv, { lib: impl.lib, parts: impl.parts, readFacts: impl.readFacts, render: impl.render, parseArgs: impl.evParse, rebind: impl.rebind, tool: impl.evTool, ...o });
  SEEN.push(...r.lines);
  EV_STATEMENTS.push(r.statements);
  for (const s of r.statements) { const t = tagOf(s); if (t) STATEMENTS.set(t, s); }
  if (r.calls.length > 0) BIND_RUNS.push({ who: "evidence", calls: r.calls, ctx: r.bindCtx, txOptions: r.txOptions });
  return r;
}

/** The report's rows: id → { mark, reason }. */
function rowsOf(lines: string[]): Map<string, { mark: string; reason: string }> {
  const out = new Map<string, { mark: string; reason: string }>();
  const re = new RegExp("^ {2}(GO|NO-GO|n/a) +([a-z-]+) +(.*)$");
  for (const line of lines) {
    const m = re.exec(line);
    if (m) out.set(m[2], { mark: m[1], reason: m[3] });
  }
  return out;
}
const noGo = (lines: string[]): string[] => [...rowsOf(lines)].filter(([, r]) => r.mark === "NO-GO").map(([id]) => id).sort();
const has = (lines: string[], text: string): boolean => lines.some((l) => l.includes(text));
const reasonOf = (lines: string[], id: string): string => rowsOf(lines).get(id)?.reason ?? "";

/**
 * Run an `ops:` key's command as the lead will — a child process, the database variable absent — and keep the answer: a plant
 * changes the command's text, never the files, so one spawn per distinct command serves every run of the red control.
 */
const SPAWNED = new Map<string, { status: number | null; out: string }>();
function spawnKey(cmd: string, extra: string[], cwd: string = ROOT): { status: number | null; out: string } {
  const memo = JSON.stringify([cmd, extra, cwd]);
  const hit = SPAWNED.get(memo);
  if (hit) return hit;
  const parts = cmd.split(" ");
  const tsxCli = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  const argv = parts[0] === "tsx" ? [tsxCli, ...parts.slice(1).map((p) => (cwd === ROOT || p.startsWith("-") ? p : join(ROOT, p))), ...extra] : [...parts.slice(1), ...extra];
  const env: Record<string, string> = { PATH: process.env.PATH ?? "", SESSION_SECRET: process.env.SESSION_SECRET ?? "", OTP_PEPPER: process.env.OTP_PEPPER ?? "" };
  if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
  const r = spawnSync(process.execPath, argv, { cwd, env, encoding: "utf8", timeout: 90_000 });
  const done = { status: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  SPAWNED.set(memo, done);
  return done;
}

/**
 * ⭐ A JUNCTION made in the temporary directory for the length of ONE call, and removed with rmdir (a junction is removed as a link, never
 * through a recursive delete) whatever happens. It points at this checkout: a tool run THROUGH it is the checker's MAJOR 1 - the program's path
 * is the link's, the script's real URL is the checkout's, and a plain comparison of the two made the tool a silent no-op (exit 0, no output).
 */
function withJunction<T>(fn: (link: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "u52a-link-"));
  const link = join(dir, "checkout");
  try {
    symlinkSync(ROOT, link, "junction");
    return fn(link);
  } finally {
    // a Windows junction goes with rmdir (never a recursive delete: that would follow it into the checkout); a symlink elsewhere with an unlink
    try { rmdirSync(link); } catch { try { dropLink(link); } catch { /* never made, or already gone */ } }
    try { rmdirSync(dir); } catch { /* not empty only if the link survived: left for the person to see */ }
  }
}
/** A tool run as a child process with its working directory the junction and its script reached through it (memoised: a plant changes text, not files). */
const SPAWNED_LINKED = new Map<string, { status: number | null; out: string }>();
function spawnLinked(link: string, scriptRel: string, args: string[]): { status: number | null; out: string } {
  const memo = JSON.stringify([scriptRel, args]);
  const hit = SPAWNED_LINKED.get(memo);
  if (hit) return hit;
  const tsxCli = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  const env: Record<string, string> = { PATH: process.env.PATH ?? "", SESSION_SECRET: process.env.SESSION_SECRET ?? "", OTP_PEPPER: process.env.OTP_PEPPER ?? "" };
  if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
  const r = spawnSync(process.execPath, [tsxCli, join(link, ...scriptRel.split("/")), ...args], { cwd: link, env, encoding: "utf8", timeout: 90_000 });
  const done = { status: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  SPAWNED_LINKED.set(memo, done);
  return done;
}

/**
 * Run a key THROUGH NPM, as the sheet prints it (`npm run -s <key> -- <args>`), or without -s as a control: the answer is what
 * reaches the lead's screen — npm's own banner included, which echoes the command line and the typed number with it. The
 * arguments are plain (no space, no quote): on Windows the command goes through the shell.
 */
const SPAWNED_NPM = new Map<string, { status: number | null; out: string }>();
function spawnNpm(silent: boolean, key: string, extra: string[]): { status: number | null; out: string } {
  const memo = JSON.stringify([silent, key, extra]);
  const hit = SPAWNED_NPM.get(memo);
  if (hit) return hit;
  const win = process.platform === "win32";
  const env: Record<string, string> = {};
  for (const k of ["PATH", "Path", "PATHEXT", "SystemRoot", "windir", "ComSpec", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP", "HOME"]) {
    if (process.env[k] !== undefined) env[k] = String(process.env[k]);
  }
  env.SESSION_SECRET = process.env.SESSION_SECRET ?? "";
  env.OTP_PEPPER = process.env.OTP_PEPPER ?? "";
  const words = ["run", ...(silent ? ["-s"] : []), key, "--", ...extra];
  // on Windows npm is a .cmd file and goes through the shell as ONE command line (arguments here are plain words)
  const r = win
    ? spawnSync(["npm.cmd", ...words].join(" "), { cwd: ROOT, env, encoding: "utf8", timeout: 120_000, shell: true })
    : spawnSync("npm", words, { cwd: ROOT, env, encoding: "utf8", timeout: 120_000 });
  const done = { status: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  SPAWNED_NPM.set(memo, done);
  return done;
}

/**
 * Every spelling of one number the reviewer's fuzz found getting past the first filter, and the plain ones — an INDEPENDENT list,
 * written here: dots, slashes, underscores, runs of spaces, a no-break or thin space, a tab, en dashes, minus signs, a zero-width mark
 * or a soft hyphen inside, digits spaced one by one, a bracketed trunk zero. (The separators are built from codes: no backslash.)
 */
function spellingsOf(key: string): string[] {
  const n = key.slice(3);
  const g = [n.slice(0, 3), n.slice(3, 6), n.slice(6)];
  const zero = (s: string): string => `0${g.join(s)}`;
  const ZW = String.fromCharCode(0x200b);
  const SHY = String.fromCharCode(0xad);
  const EN = String.fromCharCode(0x2013);
  const MINUS = String.fromCharCode(0x2212);
  const NBSP = String.fromCharCode(0xa0);
  const THIN = String.fromCharCode(0x2009);
  const TAB = String.fromCharCode(9);
  return [
    key, `+${key}`, n, `0${n}`, `00${key}`,
    g.join(" "), `+255 ${g.join(" ")}`, `0${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`, `0${n.slice(0, 2)}${n.slice(2, 5)} ${n.slice(5)}`,
    zero("-"), zero("."), zero("/"), zero("_"), zero("  "), zero("   "), zero(NBSP), zero(THIN), zero(TAB), zero(EN), zero(MINUS),
    `(0${n.slice(0, 2)}) ${n.slice(2, 5)} ${n.slice(5)}`, `+255 (0) ${g.join(" ")}`, `255-0${n}`, `+255${g[0]} ${g[1]}${g[2]}`,
    `0${n.slice(0, 4)} ${n.slice(4)}`, `0${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 6)} ${n.slice(6, 8)} ${n.slice(8)}`,
    `0 ${n.split("").join(" ")}`, `0${n.split("").join(ZW)}`, `0${g[0]}${ZW}${g[1]}${g[2]}`, `0${g[0]}${SHY}${g[1]}${g[2]}`,
  ];
}

/** An INDEPENDENT detector of a whole number — written here, not borrowed from the code under test. */
const OWN_NUMBERS = [W.TEST.key, W.CONTROL.key, W.OTHER_KEY];
function leakOf(text: string): string | null {
  const stripped = text.replace(new RegExp("[0-9]{14}_[a-z_]+", "g"), "migration").replace(new RegExp("sms_[0-9a-f]+", "g"), "ref");
  for (const key of OWN_NUMBERS) {
    for (const s of spellingsOf(key)) if (stripped.includes(s)) return s.replace(new RegExp("[0-9]", "g"), "#");
  }
  const generic = [
    new RegExp("[+]?255 ?[67][0-9]{8}"),
    new RegExp("(^|[^0-9A-Za-z_])0[67][0-9]{8}($|[^0-9])"),
    new RegExp("(^|[^0-9A-Za-z_])[67][0-9]{8}($|[^0-9A-Za-z_])"),
  ];
  for (const re of generic) if (re.test(stripped)) return "a Tanzanian-shaped number";
  return null;
}
/** The lines that hold a whole number, each as its own text with every digit turned into # (a failure never prints a number). */
const leaksIn = (lines: string[]): string[] => lines.filter((l) => leakOf(l) !== null).map((l) => l.replace(new RegExp("[0-9]", "g"), "#").slice(0, 110));
function dbLeaks(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) for (const piece of W.DB_PIECES) if (line.includes(piece)) out.push(piece.slice(0, 6));
  return out;
}

/* ══ THE CLAIMS ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

const W_ = W;
const d = (ms: number): Date => new Date(ms);
const CONTROL_STOP = { reason: "WITHDRAWN", via_link: false, created_at: d(W.NOW - 30 * 86400_000), lifted_at: null };
const withControl = (): ReturnType<typeof W.goodPreWorld> => {
  const w = W.goodPreWorld();
  w.control = { suppressions: [CONTROL_STOP] };
  return w;
};
const ARGV_CONTROL = W.preArgv([`--control=${W.CONTROL.raw}`]);

async function runAssertions(impl: Impl): Promise<void> {
  SEEN.length = 0;
  PRE_STATEMENTS.length = 0;
  EV_STATEMENTS.length = 0;
  STATEMENTS.clear();
  BIND_RUNS.length = 0;
  FETCHES.length = 0;
  PRE_LEDGER_WRITES = 0;

  /* ── P0 · controls ── */
  await claim(L.p0, async () => {
    const g = await pre(impl, W.goodPreWorld());
    const rows = rowsOf(g.lines);
    const ids = [...rows.keys()];
    const allGo = [...rows].every(([id, r]) => (id === "control" ? r.mark === "n/a" : r.mark === "GO"));
    const withC = await pre(impl, withControl(), { argv: ARGV_CONTROL });
    const cGo = rowsOf(withC.lines).get("control")?.mark === "GO" && noGo(withC.lines).length === 0;
    const masks = has(g.lines, W.TEST.masked) && has(withC.lines, W.CONTROL.masked);
    const bad: Array<[string, string[]]> = [
      ["no test", [`--origin=${W.ORIGIN}`]],
      ["no origin", [`--test=${W.TEST.raw}`]],
      ["bad number", [`--test=0755 00`, `--origin=${W.ORIGIN}`]],
      ["a landline", [`--test=022 123 4567`, `--origin=${W.ORIGIN}`]],
      ["same twice", [`--test=${W.TEST.raw}`, `--control=${W.TEST.raw}`, `--origin=${W.ORIGIN}`]],
      ["plain http", [`--test=${W.TEST.raw}`, `--origin=http://prod.example.test`]],
      ["a path in the origin", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}/admin`]],
      ["a value-less test", [`--test`, `--origin=${W.ORIGIN}`]],
      ["an unknown option", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--nonsense=1`]],
      ["sends past the cap", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--sends=7`]],
      ["a stray word", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `stray`]],
      ["a bad switch", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--expect-switch=maybe`]],
      ["a value on --new-ledger", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--new-ledger=yes`]],
      // ⭐ a value flag given twice is refused, whichever it is - the second is never silently dropped (and a second --test is the dangerous one)
      ["--test twice", [`--test=${W.TEST.raw}`, `--test=0622 000 222`, `--origin=${W.ORIGIN}`]],
      ["--test twice, the same number", [`--test=${W.TEST.raw}`, `--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`]],
      ["--origin twice", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--origin=https://other.example.test`]],
      ["--control twice", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--control=${W.CONTROL.raw}`, `--control=0688 000 333`]],
      ["--sends twice", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--sends=1`, `--sends=2`]],
      ["--expect-dpl twice", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--expect-dpl=aaaaaaa`, `--expect-dpl=bbbbbbb`]],
      ["--expect-switch twice", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--expect-switch=open`, `--expect-switch=closed`]],
      ["--min-window twice", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--min-window=10`, `--min-window=20`]],
      ["--min-window not a number", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--min-window=soon`]],
      ["--min-window past 720", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--min-window=721`]],
      ["--drive-campaign that is a number", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--drive-campaign=0755000111`]],
      ["--drive-campaign too short", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--drive-campaign=cmp_x`]],
      ["--drive-campaign with no value", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, `--drive-campaign`]],
      ["nine --drive-campaign ids", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`, ...Array.from({ length: 9 }, (_, i) => `--drive-campaign=cmp_drive_own_000${i}`)]],
    ];
    const refusals: string[] = [];
    for (const [name, argv] of bad) {
      const r = await pre(impl, W.goodPreWorld(), { argv });
      if (r.code !== 2 || r.statements.length !== 0 || !has(r.lines, "REFUSING")) refusals.push(`${name}: exit ${r.code}, ${r.statements.length} statements`);
      if (new RegExp("[0-9]{5}").test(r.lines.join(" "))) refusals.push(`${name}: the refusal shows a run of digits`);
    }
    const typed = await pre(impl, W.goodPreWorld(), { argv: [`--test=0755 000 1`, `--origin=${W.ORIGIN}`] });
    const noEcho = !typed.lines.some((l) => l.includes("0755 000 1") || l.includes("7550001"));
    return [g.code === 0 && ids.length === 20 && json(ids) === json(PRE.ROW_IDS) && allGo && cGo && masks && refusals.length === 0 && noEcho && g.lines.some((l) => l.startsWith("RESULT: GO")),
      `exit ${g.code} · ${ids.length} rows in order ${json(ids) === json(PRE.ROW_IDS)} · all GO ${allGo} · with a control ${cGo} · masks ${masks} · refusals [${refusals.join("; ")}] · typed text not echoed ${noEcho}`];
  });

  /* ── P1a · migrations ── */
  await claim(L.p1a, async () => {
    const names = LIB.ENGINE_MIGRATIONS as readonly string[];
    const cases: Array<[string, (w: ReturnType<typeof W.goodPreWorld>) => void, string[]]> = [
      ["one missing", (w) => { w.migrations = w.migrations.filter((m) => m.name !== names[3]); }, ["migrations"]],
      ["the newest missing", (w) => { w.migrations = w.migrations.filter((m) => m.name !== names[names.length - 1]); }, ["migrations"]],
      ["started, never finished", (w) => { w.migrations[2] = { name: names[2], finished: false, rolled: false }; }, ["migrations"]],
      ["rolled back, no retry", (w) => { w.migrations[2] = { name: names[2], finished: true, rolled: true }; }, ["migrations"]],
      ["rolled back, then finished", (w) => { w.migrations.push({ name: names[2], finished: false, rolled: true }); }, []],
      ["an unrelated extra", (w) => { w.migrations.push({ name: "20270101000000_something_else", finished: true, rolled: false }); }, []],
    ];
    const wrong: string[] = [];
    let named = true;
    for (const [name, mut, want] of cases) {
      const w = W.goodPreWorld();
      mut(w);
      const r = await pre(impl, w);
      if (json(noGo(r.lines)) !== json(want) || r.code !== (want.length ? 1 : 0)) wrong.push(`${name}: ${json(noGo(r.lines))} exit ${r.code}`);
      if (want.length && name === "one missing" && !reasonOf(r.lines, "migrations").includes(names[3])) named = false;
    }
    return [wrong.length === 0 && named, `wrong [${wrong.join("; ")}] · the missing one named ${named}`];
  });

  /* ── P1b · switch, settings, window ── */
  await claim(L.p1b, async () => {
    const wrong: string[] = [];
    const check = async (name: string, mut: (w: ReturnType<typeof W.goodPreWorld>) => void, want: string[], extra: string[] = [], text?: [string, string]) => {
      const w = W.goodPreWorld();
      mut(w);
      const r = await pre(impl, w, { argv: W.preArgv(extra) });
      if (json(noGo(r.lines)) !== json(want)) wrong.push(`${name}: ${json(noGo(r.lines))}`);
      if (text && !reasonOf(r.lines, text[0]).includes(text[1])) wrong.push(`${name}: the ${text[0]} row does not say "${text[1]}"`);
    };
    const swKey = LIB.KEY_LIVE_SWITCH as string;
    const stKey = LIB.KEY_SETTINGS as string;
    await check("open switch", (w) => { w.config[swKey] = W.liveSwitchRow(90); }, ["switch"], [], ["switch", "OPEN until 2026-10-09 12:00:00 EAT"]);
    await check("expired switch", (w) => { w.config[swKey] = W.liveSwitchRow(-10, 130); }, [], [], ["switch", "switched itself off"]);
    await check("a two-key row", (w) => { w.config[swKey] = { enabledBy: "ops", enabledAt: new Date(W.NOW - 60_000).toISOString() }; }, [], [], ["switch", "reads as off"]);
    await check("expect open, closed", () => {}, ["switch"], ["--expect-switch=open"]);
    await check("expect open, open 90 min", (w) => { w.config[swKey] = W.liveSwitchRow(90); }, [], ["--expect-switch=open"], ["switch", "OPEN until"]);
    await check("expect open, 10 min left", (w) => { w.config[swKey] = W.liveSwitchRow(10); }, ["switch"], ["--expect-switch=open"], ["switch", "less than 20 minutes"]);
    await check("settings unreadable (v: 2)", (w) => { w.config[stKey] = { v: 2, pricePerSegmentTzs: 6, codesReserveTzs: 20000, campaignLimitTzs: 10000, windowStartMinute: 480, windowEndMinute: 1200 }; }, ["settings"], [], ["settings", "dropped: v"]);
    await check("settings with a bad price", (w) => { w.config[stKey] = { v: 1, pricePerSegmentTzs: 0, codesReserveTzs: 20000, campaignLimitTzs: 10000, windowStartMinute: 480, windowEndMinute: 1200 }; }, ["settings"], [], ["settings", "pricePerSegmentTzs"]);
    await check("settings saved, valid", (w) => { w.config[stKey] = { v: 1, pricePerSegmentTzs: 8, codesReserveTzs: 20000, campaignLimitTzs: 9000, windowStartMinute: 480, windowEndMinute: 1200 }; }, [], [], ["settings", "TZS 8 per SMS"]);
    await check("settings defaults named", () => {}, [], [], ["settings", "defaults, nothing saved: TZS 6 per SMS · TZS 20,000 kept"]);
    const late = W.goodPreWorld();
    late.now = Date.parse("2026-10-09T18:00:00.000Z");
    const rl = await pre(impl, late);
    if (json(noGo(rl.lines)) !== json(["window"])) wrong.push(`outside the window: ${json(noGo(rl.lines))}`);
    const early = W.goodPreWorld();
    early.now = Date.parse("2026-10-09T04:59:00.000Z");
    const re = await pre(impl, early);
    if (json(noGo(re.lines)) !== json(["window"])) wrong.push(`07:59 EAT: ${json(noGo(re.lines))}`);
    const edge = W.goodPreWorld();
    edge.now = Date.parse("2026-10-09T05:00:00.000Z");
    const rg = await pre(impl, edge);
    if (noGo(rg.lines).length !== 0) wrong.push(`08:00 EAT sharp: ${json(noGo(rg.lines))}`);
    // ⭐ the window's END is exclusive, as the engine's: 20:00 sharp is outside, 19:59 inside
    const endSharp = W.goodPreWorld();
    endSharp.now = Date.parse("2026-10-09T17:00:00.000Z");
    const rEnd = await pre(impl, endSharp);
    if (json(noGo(rEnd.lines)) !== json(["window"])) wrong.push(`20:00 EAT sharp: ${json(noGo(rEnd.lines))}`);
    // ⭐ THE DRIVE NEEDS ROOM: inside the window is not enough - at least 60 minutes must be left (--min-window), or a start at 19:55 is held at 20:00
    const at = (utc: string): ReturnType<typeof W.goodPreWorld> => { const w = W.goodPreWorld(); w.now = Date.parse(`2026-10-09T${utc}:00.000Z`); return w; };
    const rLast = await pre(impl, at("16:59"));
    if (json(noGo(rLast.lines)) !== json(["window"]) || !reasonOf(rLast.lines, "window").includes("only 1 min")) wrong.push(`19:59 EAT (1 minute left): ${json(noGo(rLast.lines))} "${reasonOf(rLast.lines, "window").slice(0, 80)}"`);
    const rSixty = await pre(impl, at("16:00"));
    if (noGo(rSixty.lines).length !== 0) wrong.push(`19:00 EAT (exactly 60 minutes left): ${json(noGo(rSixty.lines))}`);
    const rFiftyNine = await pre(impl, at("16:01"));
    if (json(noGo(rFiftyNine.lines)) !== json(["window"]) || !reasonOf(rFiftyNine.lines, "window").includes("only 59 min")) wrong.push(`19:01 EAT (59 minutes left): ${json(noGo(rFiftyNine.lines))}`);
    const rOne = await pre(impl, at("16:59"), { argv: W.preArgv(["--min-window=1"]) });
    if (noGo(rOne.lines).length !== 0) wrong.push(`19:59 EAT with --min-window=1: ${json(noGo(rOne.lines))}`);
    const rTwo = await pre(impl, at("16:59"), { argv: W.preArgv(["--min-window=2"]) });
    if (json(noGo(rTwo.lines)) !== json(["window"])) wrong.push(`19:59 EAT with --min-window=2: ${json(noGo(rTwo.lines))}`);
    const rZeroOutside = await pre(impl, at("17:00"), { argv: W.preArgv(["--min-window=0"]) });
    if (json(noGo(rZeroOutside.lines)) !== json(["window"])) wrong.push(`20:00 EAT sharp with --min-window=0: ${json(noGo(rZeroOutside.lines))}`);
    // ⭐ THE SAVED WINDOW IS THE ONE JUDGED (not the default 08:00-20:00): 09:00-17:00 saved, so 08:30 and 17:30 are outside and 15:59 / 16:01 sit either side of the 60 minutes
    const narrow = (w: ReturnType<typeof W.goodPreWorld>) => { w.config[stKey] = { v: 1, pricePerSegmentTzs: 6, codesReserveTzs: 20000, campaignLimitTzs: 10000, windowStartMinute: 540, windowEndMinute: 1020 }; return w; };
    const nInside = await pre(impl, narrow(at("07:30")));
    if (noGo(nInside.lines).length !== 0 || !reasonOf(nInside.lines, "window").includes("09:00–17:00 EAT") || !reasonOf(nInside.lines, "settings").includes("09:00–17:00 EAT")) wrong.push(`10:30 EAT in a saved 09:00-17:00: ${json(noGo(nInside.lines))} "${reasonOf(nInside.lines, "window").slice(0, 90)}"`);
    for (const [utc, want, note] of [["05:30", ["window"], "08:30 (inside the default, outside the saved)"], ["14:30", ["window"], "17:30 (inside the default, outside the saved)"], ["12:59", [], "15:59 (61 left)"], ["13:01", ["window"], "16:01 (59 left)"], ["06:00", [], "09:00 sharp"]] as Array<[string, string[], string]>) {
      const rn = await pre(impl, narrow(at(utc)));
      if (json(noGo(rn.lines)) !== json(want)) wrong.push(`a saved 09:00-17:00 at ${note}: ${json(noGo(rn.lines))}`);
    }
    // ⭐ A STRING-VALUED RECORD IS MALFORMED, as the app reads it (an object or nothing): never parsed into one here
    const asText = (v: unknown): string => JSON.stringify(v);
    await check("a switch stored as TEXT reads as malformed (closed)", (w) => { w.config[swKey] = asText(W.liveSwitchRow(90)); }, [], [], ["switch", "not in a shape the reader accepts"]);
    await check("a switch stored as TEXT is not 'open' when open is expected", (w) => { w.config[swKey] = asText(W.liveSwitchRow(90)); }, ["switch"], ["--expect-switch=open"]);
    await check("settings stored as TEXT cannot be read", (w) => { w.config[stKey] = asText({ v: 1, pricePerSegmentTzs: 8, codesReserveTzs: 20000, campaignLimitTzs: 9000, windowStartMinute: 480, windowEndMinute: 1200 }); }, ["settings"], [], ["settings", "cannot be read in full"]);
    await check("a licence record stored as TEXT reads as closed", (w) => { w.config[LIB.KEY_OUTREACH as string] = asText(W.RECORD_OPEN_OUTREACH); }, [], [], ["test-consent", "licence outreach: closed"]);
    // ⭐ every time rule reads the DATABASE's clock (the world's `now`), not this machine's (the `now` the tool is handed)
    const lateMachine = Date.parse("2026-10-09T18:00:00.000Z");
    const dbInside = await pre(impl, W.goodPreWorld(), { now: lateMachine });
    if (noGo(dbInside.lines).length !== 0) wrong.push(`a machine clock at 21:00 EAT with the database at 10:30: ${json(noGo(dbInside.lines))}`);
    if (!has(dbInside.lines, "clock: the database's") || !has(dbInside.lines, "this machine is")) wrong.push("the report does not say whose clock it used, and how far the machine's is");
    const dbLate = W.goodPreWorld();
    dbLate.now = lateMachine;
    const rDbLate = await pre(impl, dbLate, { now: W.NOW });
    if (json(noGo(rDbLate.lines)) !== json(["window"])) wrong.push(`the database at 21:00 EAT with a machine at 10:30: ${json(noGo(rDbLate.lines))}`);
    const openOnTheirClock = W.goodPreWorld();
    openOnTheirClock.config[swKey] = W.liveSwitchRow(90);
    const rOpen = await pre(impl, openOnTheirClock, { now: W.NOW + 10 * 3600_000, argv: W.preArgv(["--expect-switch=open"]) });
    if (noGo(rOpen.lines).length !== 0 || !reasonOf(rOpen.lines, "switch").includes("OPEN until")) wrong.push(`an open switch judged on a machine clock ten hours ahead: ${json(noGo(rOpen.lines))}`);
    // ⭐ THE SOURCE ROW — the campaign's source line, and (licence outreach open) the typed-number test's 18+ sentence
    const wordKey = LIB.KEY_WORDINGS as string;
    const outreachKey = LIB.KEY_OUTREACH as string;
    const version = (text: string, v = 1) => ({ v, text, savedAt: "2026-10-07T08:00:00.000Z", savedBy: "usr_owner_0001" });
    const sourceOnly = { "source.phrase": W.SAVED_WORDINGS["source.phrase"] };
    await check("no wordings saved at all", (w) => { delete w.config[wordKey]; }, ["source"], [], ["source", "no source line is saved"]);
    await check("source.phrase saved blank", (w) => { w.config[wordKey] = { ...W.SAVED_WORDINGS, "source.phrase": [version("")] }; }, ["source"]);
    await check("source.phrase newest version blank", (w) => { w.config[wordKey] = { ...W.SAVED_WORDINGS, "source.phrase": [version("A first line"), version("", 2)] }; }, ["source"]);
    await check("source.phrase history unreadable", (w) => { w.config[wordKey] = { ...W.SAVED_WORDINGS, "source.phrase": [{ v: 2, text: "x" }] }; }, ["source"]);
    await check("source saved, outreach closed, no adult.test", (w) => { w.config[wordKey] = sourceOnly; }, [], [], ["source", "adult.test not needed"]);
    await check("outreach open, adult.test saved", (w) => { w.config[outreachKey] = W.RECORD_OPEN_OUTREACH; }, [], [], ["source", "adult.test v1"]);
    await check("outreach open, adult.test missing", (w) => { w.config[outreachKey] = W.RECORD_OPEN_OUTREACH; w.config[wordKey] = sourceOnly; }, ["source"], [], ["source", "adult.test"]);
    await check("outreach open, adult.test blank", (w) => { w.config[outreachKey] = W.RECORD_OPEN_OUTREACH; w.config[wordKey] = { ...sourceOnly, "adult.test": [version("")] }; }, ["source"]);
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── P1c · the web reads ── */
  await claim(L.p1c, async () => {
    const wrong: string[] = [];
    const check = async (name: string, mut: (w: ReturnType<typeof W.goodPreWorld>) => void, want: string[], extra: string[] = [], o: Record<string, unknown> = {}) => {
      const w = W.goodPreWorld();
      mut(w);
      const t0 = Date.now();
      const r = await pre(impl, w, { argv: W.preArgv(extra), ...o });
      if (json(noGo(r.lines)) !== json(want)) wrong.push(`${name}: ${json(noGo(r.lines))}`);
      return Date.now() - t0;
    };
    const sms = (over: Record<string, unknown>) => (w: ReturnType<typeof W.goodPreWorld>) => { w.health = W.goodHealth({ sms: over }); };
    await check("secret unset", sms({ webhookSecretSet: false }), ["webhook"]);
    await check("console rail", sms({ provider: "console" }), ["rail"]);
    await check("rail not configured", sms({ configured: false }), ["rail"]);
    await check("credit low", sms({ balanceTzs: 100 }), ["credit"]);
    await check("credit stale", sms({ balanceStale: true }), ["credit"]);
    await check("credit unknown", sms({ balanceTzs: null }), ["credit"]);
    await check("credit at the edge", sms({ balanceTzs: 20_036 }), []);
    await check("credit one short", sms({ balanceTzs: 20_035 }), ["credit"]);
    await check("build mismatch", () => {}, ["build"], ["--expect-dpl=deadbee"]);
    await check("build matches", () => {}, [], [`--expect-dpl=${W.BUILD.slice(0, 8)}`]);
    await check("home unreadable", (w) => { w.homeMode = "throws"; }, ["build"]);
    await check("home without a build", (w) => { w.home = "<html><body>no build here</body></html>"; }, ["build"]);
    await check("build from an asset", (w) => { w.home = `<html><script src="/_next/static/chunks/a.js?dpl=${W.BUILD}"></script></html>`; }, [], [`--expect-dpl=${W.BUILD.slice(0, 7)}`]);
    await check("build from the preload Link header", (w) => { w.home = "<html><body>no attribute here</body></html>"; w.homeLink = `</_next/static/css/a.css?dpl=${W.BUILD}>; rel=preload; as=style`; }, [], [`--expect-dpl=${W.BUILD.slice(0, 7)}`]);
    await check("build from an entity-escaped asset", (w) => { w.home = `<link href="/_next/static/a.css?x=1&amp;dpl=${W.BUILD}">`; }, [], [`--expect-dpl=${W.BUILD.slice(0, 7)}`]);
    await check("not ready (503)", (w) => { w.health = W.goodHealth({ ok: false }); w.healthStatus = 503; }, ["health"]);
    await check("database not migrated", (w) => { w.health = W.goodHealth({ database: { reachable: true, migrated: false } }); }, ["health"]);
    const four = ["credit", "health", "rail", "webhook"];
    await check("health not JSON", (w) => { w.healthMode = "html"; }, four);
    await check("health unreachable", (w) => { w.healthMode = "throws"; }, four);
    await check("health 404", (w) => { w.healthStatus = 404; }, four);
    // ⭐ every network call is a GET of the home page or of /api/health — nothing else (no POST, no other path)
    const goodRun = await pre(impl, W.goodPreWorld());
    const asked = goodRun.fetchCalls.map((c) => c.url).sort();
    if (json(asked) !== json([`${W.ORIGIN}/`, `${W.ORIGIN}/api/health`].sort())) wrong.push(`the network calls were ${json(asked)}`);
    if (goodRun.fetchCalls.length === 0 || goodRun.fetchCalls.some((c) => c.method !== "GET")) wrong.push(`a network call was not a GET: ${json(goodRun.fetchCalls.map((c) => c.method))}`);
    // ⛔ a silent network must not hold the tool: the read gives up at its timeout (60 ms here) — raced against a guard of 3 s
    const t0 = Date.now();
    const guard = await Promise.race([
      check("health silent", (w) => { w.healthMode = "hangs"; }, four, [], { timeoutMs: 60 }).then(() => "returned"),
      new Promise<string>((res) => setTimeout(() => res("hung"), 3000)),
    ]);
    const tookMs = Date.now() - t0;
    return [wrong.length === 0 && guard === "returned", `wrong [${wrong.join("; ")}] · the silent health read ${guard} after ${tookMs} ms`];
  });

  /* ── P1d · the test number ── */
  await claim(L.p1d, async () => {
    const wrong: string[] = [];
    type World = ReturnType<typeof W.goodPreWorld>;
    const check = async (name: string, base: () => World, mut: (w: World) => void, want: string[], extra: string[] = []) => {
      const w = base();
      mut(w);
      const r = await pre(impl, w, { argv: W.preArgv(extra) });
      if (json(noGo(r.lines)) !== json(want)) wrong.push(`${name}: ${json(noGo(r.lines))}`);
      return r;
    };
    const player = W.goodPreWorld;
    const contact = W.contactPreWorld;
    await check("player: nothing wrong", player, () => {}, []);
    await check("player: no book row", player, (w) => { w.contact = null; w.lists = []; }, ["test-book", "test-lists"]);
    await check("player: erased book row", player, (w) => { (w.contact as Record<string, unknown>).erased = true; }, ["test-book", "test-lists"]);
    await check("player: on no list", player, (w) => { w.lists = []; }, ["test-lists"]);
    // ⭐ THE DRIVE LIST HOLDS THE TEST NUMBER ALONE — campaign A is "to a book list": every other member would be messaged
    const manyOnly = await check("player: only on a list of 40", player, (w) => { w.lists = [{ ...w.lists[0], members: 40 }]; }, ["test-lists"]);
    if (!reasonOf(manyOnly.lines, "test-lists").includes("must hold the test number alone")) wrong.push("a list of many does not say the drive list must hold the number alone");
    await check("player: on a list of an unknown size", player, (w) => { w.lists = [{ ...w.lists[0], members: null }]; }, ["test-lists"]);
    const bigList = { list_id: "lst_all_contacts_01", list_name: "All contacts", added_at: d(W.NOW - 86400_000), members: 150000, basis: null };
    const oneAndBig = await check("player: on a list of one AND a big list", player, (w) => { w.lists = [{ ...w.lists[0], members: 1 }, bigList]; }, []);
    const oneAndBigSays = reasonOf(oneAndBig.lines, "test-lists");
    if (!(oneAndBigSays.includes("campaign A must use this list") && oneAndBigSays.includes("U52a drive list") && oneAndBigSays.includes("never pick") && oneAndBigSays.includes("All contacts"))) wrong.push(`a list of one beside a big one: the row says "${oneAndBigSays.slice(0, 140)}"`);
    const twoSolo = await check("player: on two lists of one", player, (w) => { w.lists = [{ ...w.lists[0], members: 1 }, { ...w.lists[0], list_id: "lst_u52a_0002", list_name: "Second drive list", members: 1 }]; }, []);
    if (!reasonOf(twoSolo.lines, "test-lists").includes("one of these lists")) wrong.push("two lists of one are not named as 'one of these lists'");
    const soloRow = await check("player: the list of one is named", player, () => {}, []);
    if (!reasonOf(soloRow.lines, "test-lists").includes("campaign A must use this list")) wrong.push("a list of one is not named as the list campaign A must use");
    // ⭐ EXACTLY ONE: a list of TWO is NO-GO (the second member would be messaged), so is a list that counts none, and 3 and 1000 are no better
    for (const members of [0, 2, 3, 1000]) await check(`player: a list of ${members}`, player, (w) => { w.lists = [{ ...w.lists[0], members }]; }, ["test-lists"]);
    // ⭐ ... AND NAMEABLE: a list of one whose name the tool will not print cannot be pointed at on the sheet - NO-GO, with its id so it can be found
    for (const hidden of ["Liste d'essai é", "A".repeat(41), "<script>x</script>", "", `tab${String.fromCharCode(9)}name`]) {
      const r = await check(`player: the only list of one has a hidden name (${hidden.length} chars)`, player, (w) => { w.lists = [{ ...w.lists[0], list_name: hidden }]; }, ["test-lists"]);
      const says = reasonOf(r.lines, "test-lists");
      if (!(says.includes("lst_u52a_0001") && says.includes("rename") && says.includes("plain name"))) wrong.push(`a hidden-name list of one: the row says "${says.slice(0, 120)}"`);
    }
    // ... but a hidden name beside a plain-named list of one is fine: the plain one is named, the hidden one is mentioned with its id
    const mixed = await check("player: a plain list of one AND a hidden-name list of one", player, (w) => { w.lists = [{ ...w.lists[0] }, { ...w.lists[0], list_id: "lst_u52a_0003", list_name: "Liste é", members: 1 }]; }, []);
    if (!(reasonOf(mixed.lines, "test-lists").includes("U52a drive list") && reasonOf(mixed.lines, "test-lists").includes("lst_u52a_0003"))) wrong.push("a hidden-name list of one beside a plain one is not mentioned with its id");
    // ⭐ U33r · the agent-referee exclusion is NOT judged (§4.18, option b), and BOTH consent rows SAY so - GO or NO-GO, account or contact
    const refereeSaid = (r: { lines: string[] }): boolean => ["test-consent", "test-cycle"].every((id) => reasonOf(r.lines, id).includes("agent-referee exclusion is NOT judged here") && reasonOf(r.lines, id).includes("SKIPPED agent_referee"));
    if (!refereeSaid(soloRow)) wrong.push("a GO on the account branch does not say the referee exclusion is not judged");
    const contactGo = await check("contact: nothing wrong, the referee exclusion said", contact, () => {}, []);
    if (!refereeSaid(contactGo)) wrong.push("a GO on the contact branch does not say the referee exclusion is not judged");
    const refusedSays = await check("player: switch off, the referee exclusion said", player, (w) => { (w.user as Record<string, unknown>).opt_in = false; }, ["test-consent"]);
    if (!refereeSaid(refusedSays)) wrong.push("a NO-GO does not say the referee exclusion is not judged");
    await check("player: switch off", player, (w) => { (w.user as Record<string, unknown>).opt_in = false; }, ["test-consent"]);
    await check("player: a minor", player, (w) => { (w.user as Record<string, unknown>).dob = d(Date.parse("2015-01-01T00:00:00Z")); }, ["test-consent", "test-cycle"]);
    await check("player: no date of birth", player, (w) => { (w.user as Record<string, unknown>).dob = null; }, ["test-consent", "test-cycle"]);
    await check("player: suspended", player, (w) => { (w.user as Record<string, unknown>).status = "SUSPENDED"; }, ["test-consent", "test-cycle"]);
    await check("player: no ledger row", player, (w) => { w.latest = null; }, ["test-consent"]);
    await check("player: newest row a withdrawal", player, (w) => { (w.latest as Record<string, unknown>).status = "WITHDRAWN"; }, ["test-consent"]);
    await check("player: an old consent wording", player, (w) => { (w.latest as Record<string, unknown>).wording = "Send me product updates"; }, ["test-consent"]);
    await check("player: an active stop", player, (w) => { w.suppressions = [{ reason: "WITHDRAWN", via_link: true, created_at: d(W.NOW - 3600_000), lifted_at: null }]; }, ["test-consent"]);
    await check("player: only a lifted stop", player, (w) => { w.suppressions = [{ reason: "WITHDRAWN", via_link: true, created_at: d(W.NOW - 7200_000), lifted_at: d(W.NOW - 3600_000) }]; }, []);
    // an earlier campaign row in ANY status holds the number (a recipient row's statuses — not a campaign's)
    for (const status of ["DELIVERED", "SENT", "SKIPPED", "PENDING", "HELD", "FAILED", "UNCONFIRMED"]) {
      await check(`player: an earlier campaign row ${status} holds it`, player, (w) => { w.holds = [{ campaign_id: "cmp_old_campaign_01", status }]; }, ["test-fresh"]);
    }
    // an account on the day of its 18th birthday is NOT cleared: the gate's own age is within a day of the line (the boundary band)
    await check("player: its 18th birthday is today", player, (w) => { (w.user as Record<string, unknown>).dob = d(Date.parse("2008-10-09T00:00:00Z")); }, ["test-consent", "test-cycle"]);
    await check("player: 18 since days", player, (w) => { (w.user as Record<string, unknown>).dob = d(Date.parse("2008-10-06T00:00:00Z")); }, []);
    await check("contact: nothing wrong (covering list basis)", contact, () => {}, []);
    await check("contact: no cover", contact, (w) => { w.lists[0].basis = null; }, ["test-consent", "test-cycle"]);
    await check("contact: cover revoked", contact, (w) => { (w.lists[0].basis as Record<string, unknown>).revoked = true; }, ["test-consent", "test-cycle"]);
    await check("contact: added after the recording", contact, (w) => { w.lists[0].added_at = d(W.NOW - 60_000); }, ["test-consent", "test-cycle"]);
    await check("contact: no consent, licence record closed", contact, (w) => { w.latest = null; }, ["test-consent"]);
    await check("contact: no consent, licence record open", contact, (w) => { w.latest = null; w.config[LIB.KEY_OUTREACH as string] = W.RECORD_OPEN_OUTREACH; }, []);
    await check("contact: no consent, record open, erased", contact, (w) => { w.latest = null; w.config[LIB.KEY_OUTREACH as string] = W.RECORD_OPEN_OUTREACH; (w.contact as Record<string, unknown>).erased = true; }, ["test-book", "test-consent", "test-cycle", "test-lists"]);
    await check("contact: withdrawn", contact, (w) => { (w.latest as Record<string, unknown>).status = "WITHDRAWN"; }, ["test-consent"]);
    await check("contact: an active stop", contact, (w) => { w.suppressions = [{ reason: "OPERATOR", via_link: false, created_at: d(W.NOW - 3600_000), lifted_at: null }]; }, ["test-consent"]);
    // ⭐ THE TRAP — 18+ resting on an import attestation row, with no covering basis
    const attested = (w: World) => {
      w.config[LIB.KEY_WORDINGS as string] = { ...W.SAVED_WORDINGS, "basis.OWN_FORM": [{ v: 1, text: "This person agreed on a 50pick form.", savedAt: "2026-10-01T08:00:00.000Z", savedBy: "usr_owner_0001" }], "adult.consent": [{ v: 1, text: "They told us they are 18 or older.", savedAt: "2026-10-01T08:00:00.000Z", savedBy: "usr_owner_0001" }] };
      w.latest = { status: "GIVEN", source: "IMPORT", wording: "This person agreed on a 50pick form. They told us they are 18 or older.", recorded_by_officer: true, via_link: false, created_at: d(W.NOW - 5 * 86400_000) };
      w.lists[0].basis = null;
    };
    const trap = await check("contact: attestation only (the trap)", contact, attested, ["test-cycle"]);
    const trapSays = reasonOf(trap.lines, "test-cycle").includes("age_unknown");
    await check("contact: attestation AND a covering basis", contact, (w) => { attested(w); w.lists[0].basis = { id: "lb_covering_basis_01", recorded_at: d(W.NOW - 3600_000), revoked: false }; }, []);
    return [wrong.length === 0 && trapSays, `wrong [${wrong.join("; ")}] · the trap says age_unknown ${trapSays}`];
  });

  /* ── P1e · control and ledger ── */
  await claim(L.p1e, async () => {
    const wrong: string[] = [];
    type World = ReturnType<typeof W.goodPreWorld>;
    const check = async (name: string, mut: (w: World) => void, want: string[], argv: string[] = ARGV_CONTROL, ledgerText?: string | null) => {
      const w = withControl();
      mut(w);
      const r = await pre(impl, w, { argv, ...(ledgerText !== undefined ? { ledgerText } : {}) });
      if (json(noGo(r.lines)) !== json(want)) wrong.push(`${name}: ${json(noGo(r.lines))}`);
    };
    const ledgerWith = (counts: number[]): string => {
      const l = LIB.emptyLedger();
      counts.forEach((n, i) => { l.entries[`cmp_ledger_entry_${i}x`] = { chargeable: n }; });
      return LIB.serializeLedger(l);
    };
    await check("an active stop", () => {}, []);
    await check("no stop at all", (w) => { w.control = { suppressions: [] }; }, ["control"]);
    await check("only a lifted stop", (w) => { w.control = { suppressions: [{ ...CONTROL_STOP, lifted_at: d(W.NOW - 1000) }] }; }, ["control"]);
    await check("a full ledger", () => {}, ["ledger"], ARGV_CONTROL, ledgerWith([3, 3]));
    await check("five used, one more fits", () => {}, [], ARGV_CONTROL, ledgerWith([3, 2]));
    await check("five used, two do not", () => {}, ["ledger"], [...ARGV_CONTROL, "--sends=2"], ledgerWith([3, 2]));
    await check("sends 0 on a full ledger", () => {}, [], [...ARGV_CONTROL, "--sends=0"], ledgerWith([3, 3]));
    await check("a ledger that is not JSON", () => {}, ["ledger"], ARGV_CONTROL, "not json at all");
    await check("a ledger naming another cap", () => {}, ["ledger"], ARGV_CONTROL, json({ v: 1, cap: 100, entries: {} }));
    // ⭐ a ledger file is created only on purpose: missing is NO-GO unless --new-ledger, and --new-ledger over an existing one is NO-GO
    await check("an existing empty ledger, no flag", () => {}, [], ARGV_CONTROL);
    await check("no ledger file and no flag (counts lost, or another checkout)", () => {}, ["ledger"], ARGV_CONTROL, null);
    await check("no ledger file, --new-ledger (the drive has not begun)", () => {}, [], [...ARGV_CONTROL, "--new-ledger"], null);
    await check("an existing ledger, --new-ledger (the drive has begun)", () => {}, ["ledger"], [...ARGV_CONTROL, "--new-ledger"]);
    const lost = await pre(impl, withControl(), { argv: ARGV_CONTROL, ledgerText: null });
    if (!(reasonOf(lost.lines, "ledger").includes("--new-ledger") && reasonOf(lost.lines, "ledger").includes("must STOP"))) wrong.push("a missing ledger does not say what to do");
    const begun = await pre(impl, withControl(), { argv: [...ARGV_CONTROL, "--new-ledger"] });
    if (!reasonOf(begun.lines, "ledger").includes("already exists")) wrong.push("--new-ledger over an existing ledger does not say why it is refused");
    const fresh = await pre(impl, withControl(), { argv: [...ARGV_CONTROL, "--new-ledger"], ledgerText: null });
    if (!reasonOf(fresh.lines, "ledger").includes("a NEW ledger")) wrong.push("a new ledger is not said to be new");
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── P1f · nothing else can send while the switch is open ── */
  await claim(L.p1f, async () => {
    const wrong: string[] = [];
    type World = ReturnType<typeof W.goodPreWorld>;
    const check = async (name: string, mut: (w: World) => void, want: string[], extra: string[] = []) => {
      const w = W.goodPreWorld();
      mut(w);
      const r = await pre(impl, w, { argv: W.preArgv(extra) });
      if (json(noGo(r.lines)) !== json(want)) wrong.push(`${name}: ${json(noGo(r.lines))}`);
      return r;
    };
    const OWN = "cmp_drive_own_0001";
    const OWN2 = "cmp_drive_own_0002";
    const STRANGER = "cmp_someone_else_01";
    const camp = (id: string, status: string) => ({ id, status });
    // in-flight
    const none = await check("no campaign could send", () => {}, []);
    if (!reasonOf(none.lines, "in-flight").includes("no campaign is CONFIRMED, PREPARING, RUNNING or PAUSED")) wrong.push("the empty in-flight row does not say so");
    for (const status of ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"]) {
      const r = await check(`another campaign ${status}`, (w) => { w.inFlight = [camp(STRANGER, status)]; }, ["in-flight"]);
      const says = reasonOf(r.lines, "in-flight");
      if (!(says.includes(STRANGER) && says.includes(status) && says.includes("other than the drive's own"))) wrong.push(`a stranger ${status}: the row says "${says.slice(0, 100)}"`);
    }
    await check("the drive's own campaign, named", (w) => { w.inFlight = [camp(OWN, "CONFIRMED")]; }, [], [`--drive-campaign=${OWN}`]);
    await check("the drive's own campaign, NOT named (steps 0 and 1 name none)", (w) => { w.inFlight = [camp(OWN, "CONFIRMED")]; }, ["in-flight"]);
    const both = await check("the drive's own named AND a stranger running", (w) => { w.inFlight = [camp(OWN, "CONFIRMED"), camp(STRANGER, "RUNNING")]; }, ["in-flight"], [`--drive-campaign=${OWN}`]);
    const bothSays = reasonOf(both.lines, "in-flight");
    if (!bothSays.includes(STRANGER) || bothSays.includes(OWN)) wrong.push(`an own campaign beside a stranger: the row names "${bothSays.slice(0, 120)}"`);
    await check("two of the drive's own, the flag repeated", (w) => { w.inFlight = [camp(OWN, "PAUSED"), camp(OWN2, "CONFIRMED")]; }, [], [`--drive-campaign=${OWN}`, `--drive-campaign=${OWN2}`]);
    await check("two of the drive's own, only one named", (w) => { w.inFlight = [camp(OWN, "PAUSED"), camp(OWN2, "CONFIRMED")]; }, ["in-flight"], [`--drive-campaign=${OWN}`]);
    await check("a named id that is not in flight is fine (it is done)", () => {}, [], [`--drive-campaign=${OWN}`]);
    const crowd = await check("more than twenty in flight", (w) => { w.inFlight = Array.from({ length: 21 }, (_, i) => camp(`cmp_crowd_${String(100 + i)}_x`, "RUNNING")); }, ["in-flight"]);
    if (!reasonOf(crowd.lines, "in-flight").includes("21 or more") || !reasonOf(crowd.lines, "in-flight").includes("and 16 more")) wrong.push(`a crowd: "${reasonOf(crowd.lines, "in-flight").slice(0, 100)}"`);
    // elsewhere
    const clear = await check("no marketing message to anyone else", () => {}, []);
    if (!reasonOf(clear.lines, "elsewhere").includes("no MARKETING message created in the last 24 hours")) wrong.push("the clear elsewhere row does not say so");
    const one = await check("one marketing message to another number", (w) => { w.elsewhere = 1; }, ["elsewhere"]);
    if (!reasonOf(one.lines, "elsewhere").includes("1 MARKETING message was created")) wrong.push(`one: "${reasonOf(one.lines, "elsewhere").slice(0, 100)}"`);
    const many = await check("many marketing messages to other numbers", (w) => { w.elsewhere = 37; }, ["elsewhere"]);
    if (!reasonOf(many.lines, "elsewhere").includes("37 MARKETING messages were created")) wrong.push(`many: "${reasonOf(many.lines, "elsewhere").slice(0, 100)}"`);
    await check("the count was not answered", (w) => { w.elsewhere = null; }, ["elsewhere"]);
    // the two reads were made and bound as they must be (the statements ran, and checkBinds holds their values)
    const ran = await pre(impl, W.goodPreWorld());
    for (const tag of ["in-flight", "elsewhere"]) if (!ran.calls.some((c) => c.tag === tag)) wrong.push(`the ${tag} read was never made`);
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── P6e · the four SystemConfig keys ── */
  await claim(L.p6e, async () => {
    const wrong: string[] = [];
    const lib = impl.lib as typeof LIB;
    const app: Array<[string, string, string]> = [
      ["KEY_LIVE_SWITCH", String(lib.KEY_LIVE_SWITCH), LIVE.MARKETING_LIVE_SWITCH_KEY],
      ["KEY_SETTINGS", String(lib.KEY_SETTINGS), SETTINGS_SERVER.MARKETING_SMS_SETTINGS_KEY],
      ["KEY_OUTREACH", String(lib.KEY_OUTREACH), OUTREACH.LICENCE_OUTREACH_KEY],
      ["KEY_WORDINGS", String(lib.KEY_WORDINGS), WORDINGS_SERVER.MARKETING_WORDINGS_KEY],
    ];
    for (const [name, mine, theirs] of app) if (mine !== theirs) wrong.push(`${name} is "${mine}", the app's is "${theirs}"`);
    // the pre-flight's config statement asks for exactly those four keys (as literals - the SQL cannot read a constant)
    const text = impl.sources.pre;
    const at = text.indexOf("/* u52a:config */");
    const stmt = at < 0 ? "" : text.slice(at, text.indexOf(String.fromCharCode(96), at));
    const inList = new RegExp("IN [(]([^)]*)[)]").exec(stmt);
    const literals = inList ? [...inList[1].matchAll(new RegExp("'([^']*)'", "g"))].map((m) => m[1]) : [];
    if (json([...literals].sort()) !== json(app.map((a) => a[2]).sort())) wrong.push(`the config statement asks for [${literals.join(", ")}]`);
    // the evidence's live-switch audit read asks for the app's switch key and the target type the app writes it under
    const audit = impl.sources.ev.indexOf("/* u52a:switch-audit */");
    const auditStmt = audit < 0 ? "" : impl.sources.ev.slice(audit, impl.sources.ev.indexOf(String.fromCharCode(96), audit));
    if (!auditStmt.includes(`"targetType" = 'SystemConfig' AND "targetId" = '${LIVE.MARKETING_LIVE_SWITCH_KEY}'`)) wrong.push("the switch-audit read does not ask for the app's switch key under SystemConfig");
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── P3 · not run ── */
  await claim(L.p3, async () => {
    const wrong: string[] = [];
    const noUrl = await pre(impl, W.goodPreWorld(), { env: {} });
    if (noUrl.code !== 2 || noUrl.statements.length !== 0 || !has(noUrl.lines, "no DATABASE_URL")) wrong.push(`no url: ${noUrl.code}`);
    const priv = await pre(impl, W.goodPreWorld(), { env: { DATABASE_URL: "postgresql://u:longpassword123@postgres.railway.internal:5432/railway" } });
    if (priv.code !== 2 || priv.statements.length !== 0 || !has(priv.lines, "private host") || priv.lines.some((l) => l.includes("longpassword123") || l.includes("postgres.railway.internal"))) wrong.push(`private host: ${priv.code}`);
    // ⭐ the private host is matched in any letter case, with or without a trailing dot, with or without a port - in both tools
    for (const host of ["POSTGRES.RAILWAY.INTERNAL:5432", "postgres.railway.internal.:5432", "Postgres.Railway.Internal.", "db.RAILWAY.internal:5432", "postgres.railway.internal"]) {
      const url = `postgresql://u:longpassword123@${host}/railway`;
      const p = await pre(impl, W.goodPreWorld(), { env: { DATABASE_URL: url } });
      if (p.code !== 2 || p.statements.length !== 0 || !has(p.lines, "private host") || p.lines.some((l) => l.includes("longpassword123"))) wrong.push(`pre-flight, private host in another spelling (${host.length} chars): exit ${p.code}, ${p.statements.length} statements`);
      const e = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--look"]), { env: { DATABASE_URL: url } });
      if (e.code !== 2 || e.statements.length !== 0 || !has(e.lines, "private host")) wrong.push(`evidence, private host in another spelling (${host.length} chars): exit ${e.code}, ${e.statements.length} statements`);
    }
    const isPrivate = impl.lib.isPrivateHost as typeof LIB.isPrivateHost;
    for (const [url, want] of [
      ["postgresql://u:p@postgres.railway.internal:5432/railway", true], ["postgresql://u:p@POSTGRES.RAILWAY.INTERNAL/railway", true], ["postgresql://u:p@postgres.railway.internal./railway", true],
      ["postgresql://u:p@turntable.proxy.rlwy.net:40357/railway", false], ["postgresql://u:p@127.0.0.1:5432/x", false], ["postgresql://u:p@railway.internal.evil.example:5432/x", false],
      ["postgresql://u:p@myrailway.internal:5432/x", false], ["postgresql://u:p@db-railway-internal.example.test/x", false], ["not a url at all", false],
    ] as Array<[string, boolean]>) if (isPrivate(url) !== want) wrong.push(`isPrivateHost(${url.slice(0, 40)}) is not ${want}`);
    // ⭐ the report says ONE WORD for the database it read - proxy, loopback or other - never its address
    const classOf = async (url: string): Promise<string> => {
      const r = await pre(impl, W.goodPreWorld(), { env: { DATABASE_URL: url } });
      const e = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--look"]), { env: { DATABASE_URL: url } });
      const word = (lines: string[]): string => /database: ([a-z]+)/.exec(lines.find((l) => l.startsWith("transaction read-only")) ?? "")?.[1] ?? "none";
      return word(r.lines) === word(e.lines) ? word(r.lines) : `${word(r.lines)}/${word(e.lines)}`;
    };
    for (const [url, want] of [
      ["postgresql://u:p@turntable.proxy.rlwy.net:40357/railway", "proxy"], ["postgresql://u:p@TURNTABLE.proxy.rlwy.net.:40357/railway", "proxy"],
      ["postgresql://u:p@127.0.0.1:5432/x", "loopback"], ["postgresql://u:p@localhost:5432/x", "loopback"], ["postgresql://u:p@[::1]:5432/x", "loopback"],
      [W.FAKE_DB_URL, "other"], ["postgresql://u:p@roundhouse.proxy.rlwy.net:1234/x", "other"],
    ] as Array<[string, string]>) {
      const got = await classOf(url);
      if (got !== want) wrong.push(`the database class of ${url.slice(url.indexOf("@") + 1, url.indexOf("@") + 14)}… is "${got}", not "${want}"`);
    }
    const off = await pre(impl, W.goodPreWorld(), { transactionMode: "off" });
    if (off.code !== 2 || off.statements.length !== 2 || !has(off.lines, "NOT RUN")) wrong.push(`read-back off: exit ${off.code}, ${off.statements.length} statements`);
    const boom = await pre(impl, W.goodPreWorld(), { throwOnQuery: new Error(`could not connect to server at ${W.DB_PIECES[2]} as ${W.DB_PIECES[3]} using ${W.DB_PIECES[0]} for ${W.TEST.key}`) });
    if (boom.code !== 2 || !has(boom.lines, "NOT RUN") || !has(boom.lines, "[read: now]") || dbLeaks(boom.lines).length || leaksIn(boom.lines).length) wrong.push(`read failure: exit ${boom.code}, leaks ${dbLeaks(boom.lines).length + leaksIn(boom.lines).length}`);
    const evOff = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect=sent:test"]), { transactionMode: "off" });
    if (evOff.code !== 2 || evOff.statements.length !== 2) wrong.push(`evidence read-back off: exit ${evOff.code}`);
    const evNoUrl = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect=sent:test"]), { env: {} });
    if (evNoUrl.code !== 2 || evNoUrl.statements.length !== 0) wrong.push(`evidence, no url: exit ${evNoUrl.code}`);
    const evBoom = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect=sent:test"]), { throwOnQuery: new Error(`connect ${W.DB_PIECES[0]}`) });
    if (evBoom.code !== 2 || dbLeaks(evBoom.lines).length) wrong.push(`evidence read failure: exit ${evBoom.code}`);
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── P4 · the transaction ── */
  await claim(L.p4, async () => {
    const wrong: string[] = [];
    const checkRun = (name: string, statements: string[]) => {
      const strip = (s: string): string => s.replace(new RegExp("/[*][^*]*[*]/", "g"), "").trim();
      if (statements.length < 3) { wrong.push(`${name}: only ${statements.length} statements`); return; }
      if (strip(statements[0]) !== "SET TRANSACTION READ ONLY") wrong.push(`${name}: the first statement is "${strip(statements[0]).slice(0, 40)}"`);
      if (!statements[1].includes("current_setting('transaction_read_only')")) wrong.push(`${name}: the second is not the read-back`);
      const writes = statements.slice(1).filter((s) => !new RegExp("^SELECT ").test(strip(s)));
      if (writes.length) wrong.push(`${name}: ${writes.length} statement(s) that are not a SELECT`);
      const verbs = statements.filter((s) => new RegExp("(^|[^A-Za-z_])(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COPY|MERGE|CALL|LOCK)([^A-Za-z_]|$)").test(strip(s)));
      if (verbs.length) wrong.push(`${name}: a write verb`);
    };
    const p = await pre(impl, withControl(), { argv: ARGV_CONTROL });
    checkRun("pre-flight", p.statements);
    const e = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, `--control=${W.CONTROL.raw}`, "--expect=sent:test", "--show-stop-link"]));
    checkRun("evidence", e.statements);
    // the helper alone, with a database that says `off` and one that says `on`
    const ran: string[] = [];
    const statements: string[] = [];
    const prismaOff = W.fakePrisma({}, statements, { transactionMode: "off" });
    let refused = false;
    try { await (impl.lib.readOnlyTransaction as typeof LIB.readOnlyTransaction)(prismaOff as never, async () => { ran.push("body"); return 1; }); } catch { refused = true; }
    if (!refused || ran.length) wrong.push(`the helper ran its body against a database that said off (refused ${refused})`);
    // the body is handed SELECTs only: no way to execute a statement through the handle it gets
    let handed = "?";
    await (impl.lib.readOnlyTransaction as typeof LIB.readOnlyTransaction)(W.fakePrisma({}, [], {}) as never, async (tx: Record<string, unknown>) => { handed = typeof tx.$executeRaw; return 1; });
    if (handed !== "undefined") wrong.push(`the body is handed a transaction with $executeRaw (${handed})`);
    // ⭐ the ONE transaction is REPEATABLE READ: one snapshot for every read of the run, so a row that changes while the tool is
    // reading cannot make its picture contradict itself
    for (const [name, opened] of [["pre-flight", p.txOptions], ["evidence", e.txOptions]] as const) {
      const first = opened[0] as { isolationLevel?: string } | undefined;
      if (opened.length !== 1 || !first || first.isolationLevel !== "RepeatableRead") wrong.push(`${name}: the transaction was opened with ${json(opened)}`);
    }
    return [wrong.length === 0, `wrong [${wrong.join("; ")}] · pre-flight ${p.statements.length} statements, evidence ${e.statements.length}`];
  });

  /* ── P4s · the sources ── */
  await claim(L.p4s, async () => {
    const wrong: string[] = [];
    const S = impl.sources;
    const at = (s: string, needle: string): number => s.indexOf(needle);
    const helper = S.lib.slice(at(S.lib, "export async function readOnlyTransaction"));
    const iSet = at(helper, "SET TRANSACTION READ ONLY");
    const iBack = at(helper, "transaction_read_only");
    const iBody = at(helper, "return body(");
    if (!(iSet > 0 && iBack > iSet && iBody > iBack)) wrong.push(`the helper's order is SET ${iSet} · read-back ${iBack} · body ${iBody}`);
    if (!new RegExp("await tx[.][$]executeRaw`SET TRANSACTION READ ONLY`").test(helper)) wrong.push("the helper's first await is not the SET statement");
    const count = (s: string, needle: string): number => s.split(needle).length - 1;
    if (count(S.lib, "$transaction(") !== 1) wrong.push(`the core has ${count(S.lib, "$transaction(")} $transaction calls`);
    if (count(S.lib, "$executeRaw") !== 1) wrong.push(`the core has ${count(S.lib, "$executeRaw")} $executeRaw calls`);
    for (const [name, src] of [["pre-flight", S.pre], ["evidence", S.ev]] as const) {
      for (const bad of ["$transaction(", "$executeRaw", "$queryRawUnsafe", "$executeRawUnsafe", ".create(", ".createMany(", ".update(", ".updateMany(", ".upsert(", ".delete(", ".deleteMany("]) {
        if (src.includes(bad)) wrong.push(`${name} holds ${bad}`);
      }
      if (!src.includes("readOnlyTransaction(")) wrong.push(`${name} does not go through readOnlyTransaction`);
    }
    if (!helper.includes('isolationLevel: "RepeatableRead"')) wrong.push("the helper does not open its transaction REPEATABLE READ");
    // the pre-flight only READS the ledger, and asks the network with GET alone
    if (new RegExp("ledgerIo[^;]{0,12}[.]write[(]").test(S.pre) || S.pre.includes("serializeLedger") || S.pre.includes("recordLedger")) wrong.push("the pre-flight writes (or builds a write of) the ledger");
    const verbs = [...S.pre.matchAll(new RegExp('method: "([A-Z]+)"', "g"))].map((m) => m[1]);
    if (verbs.length !== 1 || verbs[0] !== "GET") wrong.push(`the pre-flight's network verbs are ${json(verbs)}`);
    if (S.pre.includes("body:")) wrong.push("the pre-flight sends a request body");
    const stmtRe = new RegExp("[$]queryRaw`([^`]*)`", "g");
    const verbRe = new RegExp("(^|[^A-Za-z_])(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COPY|MERGE|CALL|LOCK|SET)([^A-Za-z_]|$)");
    let statementsSeen = 0;
    for (const [name, src] of [["core", S.lib], ["pre-flight", S.pre], ["evidence", S.ev]] as const) {
      for (const m of src.matchAll(stmtRe)) {
        statementsSeen++;
        const text = m[1].replace(new RegExp("/[*][^*]*[*]/", "g"), "").trim();
        if (!new RegExp("^SELECT ").test(text)) wrong.push(`${name}: a $queryRaw that is not a SELECT ("${text.slice(0, 30)}")`);
        if (verbRe.test(text)) wrong.push(`${name}: a write verb in a $queryRaw ("${text.slice(0, 30)}")`);
      }
    }
    if (statementsSeen < 20) wrong.push(`only ${statementsSeen} $queryRaw statements were found in the sources — the scan is blind`);
    return [wrong.length === 0, `wrong [${wrong.join("; ")}] · ${statementsSeen} statements read`];
  });

  /* ── P6 · the ports are the app's ── */
  await claim(L.p6a, async () => {
    const iso = (ms: number): string => new Date(ms).toISOString();
    const N = W.NOW;
    const open = { enabledBy: "ops", enabledAt: iso(N - 1000), closesAt: iso(N + 3_600_000) };
    const values: unknown[] = [
      null, undefined, "x", [], 5, {}, open,
      { enabledBy: "ops", enabledAt: iso(N - 1000) },
      { ...open, extra: 1 },
      { ...open, enabledBy: " " }, { ...open, enabledBy: 5 }, { ...open, enabledAt: "2026-02-30T00:00:00.000Z" },
      { ...open, closesAt: "tomorrow" }, { ...open, closesAt: iso(N - 1000) }, { ...open, enabledAt: iso(N + 5000), closesAt: iso(N + 4000) },
      { ...open, enabledAt: iso(N - 25 * 3_600_000), closesAt: iso(N + 3_600_000) },
      { ...open, enabledAt: iso(N - 24 * 3_600_000), closesAt: iso(N + 1000) },
      { ...open, enabledAt: iso(N + 120_000), closesAt: iso(N + 3_600_000) },
      { ...open, enabledAt: iso(N + 30_000), closesAt: iso(N + 3_600_000) },
      { ...open, closesAt: iso(N) }, { ...open, closesAt: iso(N + 1) }, { ...open, closesAt: iso(N - 1) },
      { enabledBy: "ops", enabledAt: iso(N - 7_200_000), closesAt: iso(N - 3_600_000) },
      { enabledBy: "a", enabledAt: `${iso(N - 1000).slice(0, 19)}Z`, closesAt: `${iso(N + 5000).slice(0, 19)}Z` },
      { enabledBy: "a", enabledAt: iso(N - 1000), closesAt: iso(N + 5000), closedAt: iso(N) },
      { enabledBy: "a", enabledAt: 5, closesAt: iso(N + 5000) },
      { enabledBy: "a", enabledAt: iso(N - 1000), closesAt: iso(N + 86_400_000 - 1001) },
      { enabledBy: "a", enabledAt: iso(N - 1000), closesAt: iso(N + 86_400_000 - 1000) },
      { enabledBy: "a", enabledAt: iso(N - 1000), closesAt: iso(N + 86_400_000 - 999) },
      '{"enabledBy":"a"}',
    ];
    const diffs: string[] = [];
    for (let i = 0; i < values.length; i++) {
      const real = await LIVE.readMarketingLiveSwitch(async () => ({ ok: true as const, value: values[i] }), N);
      const mine = (impl.lib.readSwitch as typeof LIB.readSwitch)(values[i], N);
      const same = real.state === mine.state
        && (real.state === "open" ? real.closesAt === (mine as { closesAt: string }).closesAt && real.enabledAt === (mine as { enabledAt: string }).enabledAt
          : real.why === (mine as { why: string }).why && (real.closedAt ?? null) === ((mine as { closedAt?: string }).closedAt ?? null));
      if (!same) diffs.push(`#${i}: real ${real.state}/${(real as { why?: string }).why ?? "-"} · port ${mine.state}/${(mine as { why?: string }).why ?? "-"}`);
    }
    return [diffs.length === 0, `${values.length} values · differences [${diffs.join("; ")}]`];
  });

  await claim(L.p6b, async () => {
    const iso = "2026-10-05T08:00:00.000Z";
    const good = { state: "open", recordedBy: "usr_owner", recordedAt: iso };
    const values: unknown[] = [
      null, undefined, "open", [], 7, { state: "closed" }, { state: "closed", closedBy: "u", closedAt: iso }, { state: "maybe" }, {}, good,
      { ...good, extra: 1 }, { ...good, recordedBy: "  " }, { ...good, recordedAt: "yesterday" }, { state: "open", recordedBy: "u" },
      { state: "open", recordedBy: "u", recordedAt: "2026-02-30T00:00:00.000Z", x: 1 }, { state: 5, recordedBy: "u", recordedAt: iso },
    ];
    const diffs: string[] = [];
    for (let i = 0; i < values.length; i++) {
      const real = OUTREACH.readLicenceOutreachRow(values[i]);
      const mine = (impl.lib.readOutreach as typeof LIB.readOutreach)(values[i]);
      const same = real.state === mine.state && (real.state === "open" ? real.recordedAt === (mine as { recordedAt: string }).recordedAt : real.why === (mine as { why: string }).why);
      if (!same) diffs.push(`#${i}: real ${real.state}/${(real as { why?: string }).why ?? "-"} · port ${mine.state}/${(mine as { why?: string }).why ?? "-"}`);
    }
    return [diffs.length === 0, `${values.length} values · differences [${diffs.join("; ")}]`];
  });

  await claim(L.p6c, async () => {
    const full = { v: 1, pricePerSegmentTzs: 8, codesReserveTzs: 25_000, campaignLimitTzs: 12_000, windowStartMinute: 495, windowEndMinute: 1185 };
    const values: Array<Record<string, unknown>> = [
      full, { ...full, extra: 1 }, { ...full, v: 2 }, { ...full, pricePerSegmentTzs: 0 }, { ...full, pricePerSegmentTzs: 6.123 },
      { ...full, windowStartMinute: 481 }, { ...full, windowEndMinute: 500 }, { ...full, windowStartMinute: 1000, windowEndMinute: 1100 },
      { v: 1 }, {}, { ...full, campaignLimitTzs: "100" }, { ...full, codesReserveTzs: -5 },
    ];
    const diffs: string[] = [];
    for (let i = 0; i < values.length; i++) {
      const real = SETTINGS_SERVER.readSettingsRow(values[i]);
      const mine = (impl.lib.readSettings as typeof LIB.readSettings)(values[i]);
      const expected = { ...PURE_SETTINGS.MARKETING_SMS_SETTINGS_DEFAULTS, ...real.settings };
      const sameFields = json(Object.fromEntries(Object.entries(mine.settings).sort())) === json(Object.fromEntries(Object.entries(expected).sort()));
      const sameDropped = json([...mine.dropped].sort()) === json([...real.dropped].sort());
      const readable = mine.readable === (real.dropped.length === 0);
      if (!(sameFields && sameDropped && readable)) diffs.push(`#${i}: fields ${sameFields} dropped ${sameDropped} readable ${readable}`);
    }
    const none = (impl.lib.readSettings as typeof LIB.readSettings)(null);
    const noneOk = none.stored === false && none.readable === true && none.settings.pricePerSegmentTzs === 6;
    return [diffs.length === 0 && noneOk, `${values.length} records · differences [${diffs.join("; ")}] · absent reads as defaults ${noneOk}`];
  });

  await claim(L.p6d, async () => {
    const KEY = W.TEST.key;
    const NOWD = new Date(W.NOW);
    const DOB: Record<string, string | null> = { adult: "1990-01-01", minor: "2015-01-01", unknown: null };
    type Latest = null | "sms" | "other" | "withdrawn";
    /** ⭐ U33r · how the number is held as an agent applicant's referee, if at all: by the number itself (step 1b), by the e-mail of the
     *  contact-book row at the number (1b′), or by the e-mail of the account that holds the number (step 2's first question). */
    type Referee = "none" | "number" | "book-email" | "account-email";
    type Scn = { referee: Referee; suppression: boolean; user: null | { optIn: boolean; status: string; adult: "adult" | "minor" | "unknown" }; latest: Latest; outreach: "open" | "closed"; book: { row: "none" | "live" | "erased"; cover: boolean } };
    const scenarios: Scn[] = [];
    for (const referee of ["none", "number", "book-email", "account-email"] as Referee[]) for (const suppression of [false, true]) for (const latest of [null, "sms", "other", "withdrawn"] as Latest[]) for (const outreach of ["closed", "open"] as const) {
      if (referee !== "account-email") for (const row of ["none", "live", "erased"] as const) for (const cover of [false, true]) scenarios.push({ referee, suppression, user: null, latest, outreach, book: { row, cover } });
      for (const optIn of [true, false]) for (const adult of ["adult", "minor", "unknown"] as const) for (const status of ["ACTIVE", "PENDING_KYC", "SUSPENDED"]) {
        scenarios.push({ referee, suppression, user: { optIn, status, adult }, latest, outreach, book: { row: "none", cover: false } });
      }
    }
    const ledgerRow = (latest: Exclude<Latest, null>) => ({
      id: "ledger_parity_0001", channel: "SMS", identifier: KEY, category: "MARKETING", status: latest === "withdrawn" ? "WITHDRAWN" : "GIVEN", source: "PROFILE",
      wording: latest === "sms" ? W.SMS_WORDING : "Send me product updates", locale: "SW", evidence: null, recordedBy: null, createdAt: "2026-10-04T10:00:00.000Z",
    });
    const realOf = async (s: Scn): Promise<{ ok: boolean; skipReason?: string }> => {
      const user = s.user ? { id: "usr_parity_0001", phoneE164: `+${KEY}`, marketingOptIn: s.user.optIn, status: s.user.status, dob: DOB[s.user.adult] } : null;
      const reads = {
        suppression: () => (s.suppression ? { id: "sup_1", channel: "SMS", identifier: KEY, category: "MARKETING", reason: "WITHDRAWN", evidence: "optout:x", recordedBy: null, createdAt: "2026-10-04T09:00:00.000Z", liftedAt: null, liftedReason: null } : null),
        userByPhone: () => user,
        latestConsent: () => (s.latest ? ledgerRow(s.latest) : null),
        outreach: () => (s.outreach === "open" ? { state: "open", recordedBy: "usr_owner", recordedAt: "2026-10-05T08:00:00.000Z" } : { state: "closed", why: "default" }),
        bookStanding: () => ({ row: s.book.row, cover: s.book.cover ? { basisId: "lb_1", listId: "l_1", recordedAt: "2026-10-05T08:00:00.000Z" } : null }),
        // U33r · the three referee reads (main's gate asks them; a held number is refused before any basis)
        refereeHeld: () => s.referee === "number",
        refereeEmailHeld: () => s.referee === "account-email",
        refereeBookEmailHeld: () => s.referee === "book-email",
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = await GATE.mayReceiveMarketingSms(KEY, NOWD, reads as any);
      return v.ok ? { ok: true } : { ok: false, skipReason: v.skipReason };
    };
    const mineOf = (s: Scn): { ok: boolean; skipReason?: string; unjudged?: string[] } => {
      const lib = impl.lib as typeof LIB;
      const latest = s.latest === null ? null : { status: s.latest === "withdrawn" ? "WITHDRAWN" : "GIVEN", source: "PROFILE", sms: s.latest === "sms", attestation: false, viaLink: false, createdAt: "2026-10-04T10:00:00.000Z" };
      const v = lib.judgeEligibility({
        suppression: s.suppression,
        user: s.user ? { status: s.user.status, optIn: s.user.optIn, adult: lib.ageBand(DOB[s.user.adult], W.NOW) } : null,
        latest, outreach: s.outreach, book: s.book,
      });
      return v.ok ? { ok: true, unjudged: v.unjudged } : { ok: false, skipReason: v.skipReason };
    };
    const cache = (globalThis as unknown as { __U52A_GATE_CACHE?: Map<string, { ok: boolean; skipReason?: string }> });
    cache.__U52A_GATE_CACHE ??= new Map();
    const diffs: string[] = [];
    // ⭐ U33r · the REFEREE dimension. The port does not judge the exclusion (§4.18, option b), so for a held referee the parity cannot be
    // exact; what is required is (1) the real gate's own order — a stop first, else `agent_referee`, whatever the consent, the record and
    // the book say (the claim §4.18 rests on), and (2) the port NEVER reads a GO the real gate refuses without carrying the exclusion in
    // `unjudged` — the row that prints it says "NOT judged here".
    const heldOrder: string[] = [];
    const silentGo: string[] = [];
    let heldGoes = 0;
    let heldScenarios = 0;
    // ⚠️ ONE NAMED FAMILY IS ALLOWED TO DIFFER, in the SAFE direction only: main's gate reversed Q9 (the owner's final rule, 2026-10-07 - an
    // account whose switch is off after a consent that was never withdrawn is reached under an OPEN record), and the port still refuses
    // that account `no_consent` - stricter, never looser. The edit that would align the port was refused by the session's classifier, so
    // it waits for a person's decision (the report says so). The family is exactly the 18 scenarios below; any other difference, and
    // any difference in the other direction, still fails this claim. The count is 18 while the port is stricter and 0 once aligned.
    let stricter = 0;
    for (const s of scenarios) {
      const k = json(s);
      let real = cache.__U52A_GATE_CACHE.get(k);
      if (!real) { real = await realOf(s); cache.__U52A_GATE_CACHE.set(k, real); }
      const mine = mineOf(s);
      if (s.referee === "none") {
        const q9Lapse = !s.suppression && s.user !== null && s.user.optIn === false && (s.latest === "sms" || s.latest === "other") && s.outreach === "open";
        if (q9Lapse && !mine.ok && mine.skipReason === "no_consent" && !(real.ok === false && real.skipReason === "no_consent")) { stricter++; continue; }
        if (real.ok !== mine.ok || (!real.ok && real.skipReason !== mine.skipReason)) diffs.push(`${k.slice(0, 120)} → real ${real.ok ? "ok" : real.skipReason} · port ${mine.ok ? "ok" : mine.skipReason}`);
        continue;
      }
      heldScenarios++;
      const wantReal = s.suppression ? "suppressed" : "agent_referee";
      if (real.ok || real.skipReason !== wantReal) heldOrder.push(`${k.slice(0, 90)} → real ${real.ok ? "ok" : real.skipReason}, wanted ${wantReal}`);
      if (mine.ok) {
        heldGoes++;
        if (!(mine.unjudged ?? []).includes(impl.lib.REFEREE_UNJUDGED as string)) silentGo.push(k.slice(0, 90));
      }
    }
    // the age band against the app's own
    const dobs = ["1990-01-01", "2008-10-09", "2008-10-12", "2008-10-06", "2015-06-01", "2000-02-29", null, "not a date", "1900-01-01"];
    const ageDiffs: string[] = [];
    for (const dob of dobs) {
      const real = GATE.marketingAge(dob, NOWD).band;
      const mine = (impl.lib.ageBand as typeof LIB.ageBand)(dob, W.NOW);
      if (mine !== real && mine !== "boundary") ageDiffs.push(`${dob}: real ${real} · port ${mine}`);
    }
    // ⭐ the 36-hour band is real: a birthday within a day or two of the line reads `boundary` — never adult or minor — while the dates
    // beyond it read as the app reads them (the port refuses the boundary where the gate would clear: stricter, said, never looser)
    const bands: Array<[string | null, string]> = [["1990-01-01", "adult"], ["2008-10-06", "adult"], ["2008-10-08", "boundary"], ["2008-10-09", "boundary"], ["2008-10-10", "boundary"], ["2008-10-12", "minor"], ["2015-06-01", "minor"], [null, "unknown"], ["not a date", "unknown"]];
    const bandWrong = bands.filter(([dob, want]) => (impl.lib.ageBand as typeof LIB.ageBand)(dob, W.NOW) !== want).map(([dob, want]) => `${dob}: not ${want}`);
    const base = scenarios.length - heldScenarios;
    return [diffs.length === 0 && (stricter === 0 || stricter === 18) && ageDiffs.length === 0 && bandWrong.length === 0 && base === 384 && heldScenarios === 1056 && heldOrder.length === 0 && silentGo.length === 0 && heldGoes > 0,
      `${base} scenarios with no referee · ${diffs.length} differences [${diffs.slice(0, 3).join("; ")}] · ${stricter} of them in the one named family where the port is STRICTER than the gate (Q9 lapse, 18 or 0) · ${heldScenarios} with a held referee: the real gate's order wrong in ${heldOrder.length} [${heldOrder.slice(0, 2).join("; ")}], the port read GO in ${heldGoes} (all carrying the exclusion in unjudged: ${silentGo.length === 0}) [${silentGo.slice(0, 2).join("; ")}] · age differences [${ageDiffs.join("; ")}] · the band table is wrong for [${bandWrong.join("; ")}]`];
  });

  /* ── P6f · the officer's-pause proof is run on the app's own constants ── */
  await claim(L.p6f, async () => {
    const CONTROL = await import("../src/lib/server/marketing/campaign-control.ts");
    const action: string = CONTROL.CAMPAIGN_PAUSED_ACTION;
    const reason: string = CONTROL.OFFICER_PAUSED;
    const parts = (impl.parts ?? (impl.evTool as { PARTS?: unknown } | undefined)?.PARTS ?? EV.PARTS) as unknown as { auditChecks: (f: object, a: object) => Array<{ holds: boolean; n: number }> };
    const ask = (rows: object[]) => parts.auditChecks({ audit: rows }, { expectAudit: [action] })[0];
    const officer = ask([{ action, actor_id: "usr_officer_0001", payload: { reason } }]);
    const engine = ask([{ action, actor_id: null, payload: { reason: "rail_dead" } }]);
    const wrongReason = ask([{ action, actor_id: "usr_officer_0001", payload: { reason: "rail_dead" } }]);
    const noActor = ask([{ action, actor_id: null, payload: { reason } }]);
    const wrong: string[] = [];
    if (!officer.holds || officer.n !== 1) wrong.push(`the officer's own pause (${action}, reason ${reason}) does not hold`);
    if (engine.holds) wrong.push("the engine's own pause holds");
    if (wrongReason.holds) wrong.push("a pause with an actor and another reason holds");
    if (noActor.holds) wrong.push("a pause with the officer's reason and no actor holds");
    if (action !== "marketing.campaign_paused" || reason !== "officer_paused") wrong.push(`the app's action is "${action}" and its reason "${reason}"`);
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── P7 · the SQL names ── */
  await claim(L.p7, async () => {
    const schema = impl.sources.schema;
    const models = new Map<string, Set<string>>();
    let current: Set<string> | null = null;
    for (const line of schema.split(NL)) {
      const mm = new RegExp("^model ([A-Za-z0-9_]+) [{]").exec(line);
      if (mm) { current = new Set(); models.set(mm[1], current); continue; }
      if (current && line.startsWith("}")) { current = null; continue; }
      const f = new RegExp("^ {2}([A-Za-z_][A-Za-z0-9_]*) +[A-Za-z]").exec(line);
      if (current && f) current.add(f[1]);
    }
    models.set("_prisma_migrations", new Set(["migration_name", "finished_at", "rolled_back_at"]));
    // every statement in the SOURCES, tag and all (a template literal after $queryRaw), checked against the schema
    const statements = new Map<string, string>();
    const BT_ = String.fromCharCode(96);
    // a template literal read WHOLE, nested templates and ${…} expressions included (the user lookup holds one: ${`+${testKey}`})
    const templateAt = (src: string, from: number): string => {
      let i = from;
      let out = "";
      while (i < src.length) {
        const c = src[i];
        if (c === BT_) return out;
        if (c === "$" && src[i + 1] === "{") {
          let depth = 1;
          out += "${";
          i += 2;
          while (i < src.length && depth > 0) {
            if (src[i] === BT_) { const inner = templateAt(src, i + 1); out += BT_ + inner + BT_; i += inner.length + 2; continue; }
            if (src[i] === "{") depth++;
            if (src[i] === "}") depth--;
            out += src[i];
            i++;
          }
          continue;
        }
        out += c;
        i++;
      }
      return out;
    };
    for (const src of [impl.sources.pre, impl.sources.ev]) {
      const needle = "$queryRaw" + BT_;
      for (let at = src.indexOf(needle); at >= 0; at = src.indexOf(needle, at + 1)) {
        const text = templateAt(src, at + needle.length);
        const tag = tagOf(text);
        if (tag) statements.set(`${tag}#${statements.size}`, text);
      }
    }
    const bad: string[] = [];
    for (const [key, text] of statements) {
      const noLiterals = text.replace(new RegExp("'[^']*'", "g"), "''");
      const quoted = [...noLiterals.matchAll(new RegExp('"([A-Za-z_][A-Za-z0-9_]*)"', "g"))].map((m) => m[1]);
      const tables = [...new Set(quoted.filter((q) => models.has(q)))];
      if (tables.length === 0 && key.split("#")[0] !== "now") bad.push(`${key}: no table found`);
      const columns = new Set(tables.flatMap((t) => [...(models.get(t) ?? [])]));
      for (const q of quoted) if (!models.has(q) && !columns.has(q)) bad.push(`${key}: "${q}" is neither a model nor a column of ${tables.join("/")}`);
    }
    // every tag in the sources was run by this suite (the named person beyond the first 41 rows included: E1 drives it)
    const tagsInSources = new Set([...statements.keys()].map((k) => k.split("#")[0]));
    const unexercised = [...tagsInSources].filter((t) => !STATEMENTS.has(t));

    // ⭐ THE CONTRACT — a statement can name only real tables and columns and still ask the wrong thing (the oldest row for the newest,
    // another campaign, a number without its plus). Each tag keeps the fragments that make it the question it is for.
    const ph = (e: string): string => "$" + "{" + e + "}";
    const stopsFrom = `FROM "Suppression" WHERE "channel"::text = 'SMS' AND "category"::text = 'MARKETING' AND "identifier" = `;
    const stops = (who: string): string => stopsFrom + ph(who);
    const consent = (who: string, tail: string): string => `FROM "MessagingConsent" WHERE "channel"::text = 'SMS' AND "category"::text = 'MARKETING' AND "identifier" = ${ph(who)} ORDER BY "createdAt" DESC, "id" DESC LIMIT ${tail}`;
    const inCampaign = (more: string): string => `FROM "SmsMessage" m WHERE m."targetType" = 'SmsCampaignRecipient' AND m."targetId" IN (SELECT r."id" FROM "SmsCampaignRecipient" r WHERE r."campaignId" = ${ph("campaignId")})${more}`;
    const CONTRACT: Record<string, { each: string[]; union?: string[] }> = {
      now: { each: ["SELECT now() AS now"] },
      migrations: { each: [`("finished_at" IS NOT NULL) AS finished, ("rolled_back_at" IS NOT NULL) AS rolled FROM "_prisma_migrations"`] },
      // the four keys are the APP's own constants, not a copy typed here (P6e holds the tool's constants to the same four)
      config: { each: [`FROM "SystemConfig" WHERE "key" IN ('${LIVE.MARKETING_LIVE_SWITCH_KEY}', '${SETTINGS_SERVER.MARKETING_SMS_SETTINGS_KEY}', '${OUTREACH.LICENCE_OUTREACH_KEY}', '${WORDINGS_SERVER.MARKETING_WORDINGS_KEY}')`] },
      contact: { each: [`COALESCE("sourceRef" = 'erasure', false) AS erased`, `FROM "MarketingContact" WHERE "msisdn" = ${ph("testKey")}`] },
      lists: { each: [`(SELECT count(*)::int FROM "ContactListMember" x WHERE x."listId" = l."id") AS members`, `FROM "ContactListMember" m JOIN "ContactList" l ON l."id" = m."listId" WHERE m."contactId" = ${ph("facts.test.contact.id")} ORDER BY l."id"`] },
      basis: { each: [`("revokedAt" IS NOT NULL) AS revoked FROM "ContactListBasis" WHERE "listId" = ${ph("l.list_id")} ORDER BY "recordedAt" DESC, "id" DESC LIMIT 1`] },
      suppression: { each: [`"liftedAt" AS lifted_at ${stopsFrom}`], union: [stops("testKey"), stops("controlKey")] },
      ledger: { each: [consent("testKey", "1")] },
      user: { each: [`FROM "User" WHERE "phoneE164" = ${ph(`${BT_}+${ph("testKey")}${BT_}`)}`] },
      holds: { each: [`FROM "SmsCampaignRecipient" WHERE "msisdn" = ${ph("testKey")} ORDER BY "createdAt" LIMIT 20`] },
      campaign: { each: [`FROM "SmsCampaign" WHERE "id" = ${ph("campaignId")}`] },
      recipients: { each: [`FROM "SmsCampaignRecipient" WHERE "campaignId" = ${ph("campaignId")} ORDER BY "id" LIMIT 41`] },
      "recipient-named": { each: [`FROM "SmsCampaignRecipient" WHERE "campaignId" = ${ph("campaignId")} AND "msisdn" = ${ph("key")}`] },
      "recipient-counts": { each: [`FROM "SmsCampaignRecipient" WHERE "campaignId" = ${ph("campaignId")} GROUP BY 1, 2, 3 ORDER BY 1, 2, 3`] },
      messages: { each: [`(m."msisdn" = ${ph("probeKey")}) AS to_test`, inCampaign(` ORDER BY m."createdAt", m."reference" LIMIT 201`)] },
      "message-counts": { each: [inCampaign(" GROUP BY 1, 2")] },
      "test-messages": { each: [`(m."msisdn" = ${ph("probeKey")}) AS to_test`, `FROM "SmsMessage" m WHERE m."targetType" = 'SmsCampaignTest' AND m."targetId" = ${ph("campaignId")} ORDER BY m."createdAt", m."reference" LIMIT 20`] },
      "test-message-counts": { each: [`FROM "SmsMessage" m WHERE m."targetType" = 'SmsCampaignTest' AND m."targetId" = ${ph("campaignId")} GROUP BY 1, 2`] },
      audit: { each: [`FROM "AuditLog" WHERE "targetType" = 'SmsCampaign' AND "targetId" = ${ph("campaignId")} ORDER BY "AuditLog"."seq" LIMIT 200`] },
      "switch-audit": { each: [`FROM "AuditLog" WHERE "targetType" = 'SystemConfig' AND "targetId" = '${LIVE.MARKETING_LIVE_SWITCH_KEY}' ORDER BY "AuditLog"."seq" DESC LIMIT 8`] },
      // ⭐ nothing else can send while the switch is open: every campaign that could send now, and ONE COUNT (never a number) of the last day's marketing messages to anyone else
      "in-flight": { each: [`FROM "SmsCampaign" WHERE "status"::text IN ('CONFIRMED', 'PREPARING', 'RUNNING', 'PAUSED') ORDER BY "createdAt", "id" LIMIT 21`] },
      elsewhere: { each: [`FROM "SmsMessage" WHERE "purpose"::text = 'MARKETING' AND "createdAt" > now() - interval '1 day' AND "msisdn" <> ${ph("testKey")}`] },
      "person-suppression": { each: [`"liftedAt" AS lifted_at, COALESCE("liftedReason" LIKE 'optout:%', false) AS lifted_via_link ${stops("key")}`] },
      "person-ledger": { each: [consent("key", "50")] },
      token: { each: [`FROM "SmsCampaignRecipient" WHERE "campaignId" = ${ph("campaignId")} AND "msisdn" = ${ph("testKey")} AND "optOutToken" IS NOT NULL`] },
    };
    const squash = (s: string): string => s.split(NL).join(" ").split(CR).join(" ").split(String.fromCharCode(9)).join(" ").split(" ").filter((x) => x !== "").join(" ");
    const contractBad: string[] = [];
    const tagTexts = new Map<string, string[]>();
    for (const [key, text] of statements) {
      const tag = key.split("#")[0];
      tagTexts.set(tag, [...(tagTexts.get(tag) ?? []), squash(text)]);
    }
    for (const tag of tagsInSources) if (!CONTRACT[tag]) contractBad.push(`${tag}: a statement with no contract`);
    for (const [tag, rule] of Object.entries(CONTRACT)) {
      const texts = tagTexts.get(tag) ?? [];
      if (texts.length === 0) { contractBad.push(`${tag}: the statement is gone`); continue; }
      for (const frag of rule.each) for (const t of texts) if (!t.includes(squash(frag))) contractBad.push(`${tag}: lacks «${frag.slice(0, 70)}…»`);
      for (const frag of rule.union ?? []) if (!texts.some((t) => t.includes(squash(frag)))) contractBad.push(`${tag}: no statement has «${frag.slice(-40)}»`);
      // ⭐ ... and the statement ENDS with its contract: an ORDER BY direction, a condition or a clause appended to it is a different question
      const tails = rule.union ?? [rule.each[rule.each.length - 1]];
      for (const t of texts) if (!tails.some((f) => t.endsWith(squash(f)))) contractBad.push(`${tag}: does not END with its contract («${t.slice(-50)}»)`);
    }
    // ⭐ THE SELECT LISTS, EXACTLY. The stand-in answers whatever a statement selects, so a column dropped from (or added to) a SELECT is
    // invisible to every run - in production the tool would read `undefined` (dropping `"createdAt" AS created_at` from the person's ledger
    // blinded the stop scan, and nothing turned red). Each tag keeps its exact list of items; and the rows the stand-in answers with carry
    // EXACTLY those output names, so the stand-in can neither supply a field the SQL does not select nor leave one out.
    const RECIPIENT_COLUMNS = [`"id"`, `"msisdn"`, `"status"::text AS status`, `"skipReason" AS skip_reason`, `"skipDetail" AS skip_detail`, `"failureClass" AS failure_class`, `"error"`, `"attempts"`, `"smsReference" AS sms_reference`, `("optOutToken" IS NOT NULL) AS has_token`, `"locale"::text AS locale`, `"segments"`, `"bodyLen" AS body_len`, `"costTzs"::text AS cost_tzs`, `"claimToken" AS claim_token`, `"claimedAt" AS claimed_at`, `"sentAt" AS sent_at`, `"deliveredAt" AS delivered_at`, `"failedAt" AS failed_at`, `"gateTrail" AS gate_trail`];
    const MESSAGE_COLUMNS = [`m."reference"`, `(m."msisdn" = ${ph("probeKey")}) AS to_test`, `m."purpose"::text AS purpose`, `m."status"::text AS status`, `m."bodyLen" AS body_len`, `m."dlrStatus" AS dlr_status`, `m."dlrDesc" AS dlr_desc`, `m."providerMsg" AS provider_msg`, `m."attempts"`, `m."targetId" AS target_id`, `m."createdAt" AS created_at`, `m."sentAt" AS sent_at`, `m."deliveredAt" AS delivered_at`, `m."failedAt" AS failed_at`, `m."balanceTzs"::text AS balance_tzs`];
    const MESSAGE_COUNTS = [`m."status"::text AS status`, `(m."dlrStatus" IS NOT NULL) AS has_receipt`, `count(*)::int AS n`];
    const SELECTS: Record<string, string[]> = {
      now: [`now() AS now`],
      migrations: [`"migration_name" AS name`, `("finished_at" IS NOT NULL) AS finished`, `("rolled_back_at" IS NOT NULL) AS rolled`],
      config: [`"key"`, `"value"`],
      contact: [`"id"`, `"consentState"::text AS consent_state`, `("suppressedAt" IS NOT NULL) AS suppressed`, `("userId" IS NOT NULL) AS linked`, `"source"::text AS source`, `COALESCE("sourceRef" = 'erasure', false) AS erased`, `"createdAt" AS created_at`],
      lists: [`l."id" AS list_id`, `l."name" AS list_name`, `m."addedAt" AS added_at`, `(SELECT count(*)::int FROM "ContactListMember" x WHERE x."listId" = l."id") AS members`],
      basis: [`"id"`, `"recordedAt" AS recorded_at`, `("revokedAt" IS NOT NULL) AS revoked`],
      suppression: [`"reason"::text AS reason`, `COALESCE("evidence" LIKE 'optout:%', false) AS via_link`, `"createdAt" AS created_at`, `"liftedAt" AS lifted_at`],
      ledger: [`"status"::text AS status`, `"source"::text AS source`, `"wording"`, `("recordedBy" IS NOT NULL AND btrim("recordedBy") <> '') AS recorded_by_officer`, `COALESCE("evidence" LIKE 'optout:%', false) AS via_link`, `"createdAt" AS created_at`],
      user: [`"role"::text AS role`, `"status"::text AS status`, `"marketingOptIn" AS opt_in`, `"dob"`],
      holds: [`"campaignId" AS campaign_id`, `"status"::text AS status`],
      "in-flight": [`"id"`, `"status"::text AS status`],
      elsewhere: [`count(*)::int AS n`],
      campaign: [`"id"`, `"status"::text AS status`, `"stopReason" AS stop_reason`, `"audienceCount" AS audience_count`, `"confirmTier" AS confirm_tier`, `"estimateSegments" AS estimate_segments`, `"estimateTzs"::text AS estimate_tzs`, `"budgetTzs"::text AS budget_tzs`, `"segmentsSw" AS segments_sw`, `"segmentsEn" AS segments_en`, `("enqueueCursor" = 'done') AS enqueued`, `"createdBy" AS created_by`, `"confirmedBy" AS confirmed_by`, `"confirmedAt" AS confirmed_at`, `"enqueuedAt" AS enqueued_at`, `"startedAt" AS started_at`, `"pausedAt" AS paused_at`, `"finishedAt" AS finished_at`, `"createdAt" AS created_at`],
      recipients: RECIPIENT_COLUMNS,
      "recipient-named": RECIPIENT_COLUMNS,
      "recipient-counts": [`"status"::text AS status`, `"skipReason" AS skip_reason`, `"failureClass" AS failure_class`, `count(*)::int AS n`],
      messages: MESSAGE_COLUMNS,
      "message-counts": MESSAGE_COUNTS,
      "test-messages": MESSAGE_COLUMNS,
      "test-message-counts": MESSAGE_COUNTS,
      audit: [`"seq"::text AS seq`, `"createdAt" AS created_at`, `"category"::text AS category`, `"action"`, `"actorId" AS actor_id`, `"payload"`],
      "switch-audit": [`"seq"::text AS seq`, `"createdAt" AS created_at`, `"action"`, `"payload"`],
      "person-suppression": [`"reason"::text AS reason`, `COALESCE("evidence" LIKE 'optout:%', false) AS via_link`, `"createdAt" AS created_at`, `"liftedAt" AS lifted_at`, `COALESCE("liftedReason" LIKE 'optout:%', false) AS lifted_via_link`],
      "person-ledger": [`"status"::text AS status`, `"source"::text AS source`, `COALESCE("evidence" LIKE 'optout:%', false) AS via_link`, `"createdAt" AS created_at`],
      token: [`"optOutToken" AS token`],
    };
    /** The top-level items of a statement's SELECT list (commas inside brackets or quotes do not split), after its tag comment. */
    const selectItems = (text: string): string[] => {
      const t = squash(text);
      const body = t.replace(new RegExp("^/[*] u52a:[a-z-]+ [*]/ "), "");
      const sel = body.startsWith("SELECT ") ? body.slice("SELECT ".length) : body;
      let depth = 0;
      let quote: string | null = null;
      let end = sel.length;
      for (let i = 0; i < sel.length; i++) {
        const ch = sel[i];
        if (quote) { if (ch === quote) quote = null; continue; }
        if (ch === "'" || ch === '"') { quote = ch; continue; }
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (depth === 0 && sel.startsWith(" FROM ", i)) { end = i; break; }
      }
      const items: string[] = [];
      let cur = "";
      depth = 0;
      quote = null;
      for (const ch of sel.slice(0, end)) {
        if (quote) { cur += ch; if (ch === quote) quote = null; continue; }
        if (ch === "'" || ch === '"') { quote = ch; cur += ch; continue; }
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (ch === "," && depth === 0) { items.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      if (cur.trim() !== "") items.push(cur.trim());
      return items;
    };
    const outputName = (item: string): string => {
      const alias = new RegExp(" AS ([a-z_0-9]+)$", "i").exec(item);
      return alias ? alias[1] : item.replace(new RegExp('^[a-z][.]'), "").replace(new RegExp('"', "g"), "");
    };
    const selectBad: string[] = [];
    for (const [tag, texts] of tagTexts) {
      const want = SELECTS[tag];
      if (!want) { selectBad.push(`${tag}: no select list is pinned`); continue; }
      for (const t of texts) {
        const got = selectItems(t);
        if (json(got) !== json(want.map(squash))) {
          const missing = want.filter((x) => !got.includes(squash(x))).map((x) => outputName(x));
          const extra = got.filter((x) => !want.map(squash).includes(x)).map((x) => outputName(x));
          selectBad.push(`${tag}: the SELECT list differs (missing [${missing.join(", ")}] · extra [${extra.join(", ")}]${missing.length === 0 && extra.length === 0 ? " · order" : ""})`);
        }
      }
    }
    for (const tag of Object.keys(SELECTS)) if (!tagTexts.has(tag)) selectBad.push(`${tag}: a pinned select list for a statement that is gone`);
    // ... and the rows the stand-in answers with carry exactly those output names
    const richPre = W.contactPreWorld();
    richPre.user = { role: "PLAYER", status: "ACTIVE", opt_in: true, dob: d(Date.parse("1990-01-01T00:00:00Z")) };
    richPre.suppressions = [{ reason: "WITHDRAWN", via_link: true, created_at: d(W.NOW - 3600_000), lifted_at: null }];
    richPre.holds = [{ campaign_id: "cmp_old_campaign_01", status: "SENT" }];
    richPre.inFlight = [{ id: "cmp_someone_else_01", status: "RUNNING" }];
    const preRows = W.preHandlers(richPre);
    const evHandlerSets = [W.evA(), W.evB(), W.evC()].map((w) => W.evHandlers(w));
    const rowsOf2 = (tag: string): Array<Record<string, unknown>> => {
      const values: Record<string, unknown[]> = { basis: ["lst_u52a_0001"], suppression: [W.TEST.key], campaign: [W.CAMPAIGN], "recipient-named": [W.CAMPAIGN, W.TEST.key], "person-suppression": [W.TEST.key], "person-ledger": [W.TEST.key] };
      const handlers = [preRows[tag], ...evHandlerSets.map((h) => h[tag])].filter((h) => h !== undefined) as Array<(v: unknown[]) => Array<Record<string, unknown>>>;
      return handlers.flatMap((h) => h(values[tag] ?? []));
    };
    for (const tag of Object.keys(SELECTS)) {
      const rows = rowsOf2(tag);
      if (rows.length === 0) { selectBad.push(`${tag}: the stand-in answers with no row, so its columns are never exercised`); continue; }
      const want = SELECTS[tag].map(outputName).sort();
      for (const r of rows) {
        const got = Object.keys(r).sort();
        if (json(got) !== json(want)) selectBad.push(`${tag}: a stand-in row carries [${got.filter((k) => !want.includes(k)).join(", ")}] the SQL does not select and lacks [${want.filter((k) => !got.includes(k)).join(", ")}]`);
      }
    }
    // the generic rule: a bare ORDER BY name must never equal an AS alias of its own SELECT (PostgreSQL reads it as the OUTPUT column)
    const aliasBad: string[] = [];
    for (const [key, text] of statements) {
      const t = squash(text);
      const aliases = new Set([...t.matchAll(new RegExp("[ )]AS ([a-z_][a-z0-9_]*)", "g"))].map((m) => m[1].toLowerCase()));
      const at = t.indexOf(" ORDER BY ");
      if (at < 0) continue;
      const clause = t.slice(at + " ORDER BY ".length).split(" LIMIT ")[0];
      for (const term of clause.split(",")) {
        const bare = new RegExp('^"([A-Za-z_][A-Za-z0-9_]*)"( ASC| DESC)?$').exec(term.trim());
        if (bare && aliases.has(bare[1].toLowerCase())) aliasBad.push(`${key.split("#")[0]}: ORDER BY "${bare[1]}" is also an AS alias`);
      }
    }
    // every call was BOUND to the right values (the stand-in database answers whatever it is asked, so this is held here)
    const bindBad = [...new Set(BIND_RUNS.flatMap((run) => W.checkBinds(run.calls, run.ctx).map((p) => `${run.who}: ${p}`)))];
    const boundTags = new Set(BIND_RUNS.flatMap((run) => run.calls.map((c) => c.tag)));
    const unbound = Object.keys(CONTRACT).filter((t) => !boundTags.has(t));
    return [bad.length === 0 && models.size > 60 && statements.size >= 25 && unexercised.length === 0 && contractBad.length === 0 && selectBad.length === 0 && aliasBad.length === 0 && bindBad.length === 0 && unbound.length === 0,
      `${models.size} models · ${statements.size} statements in the sources · bad [${bad.slice(0, 4).join("; ")}] · never run [${unexercised.join(", ")}] · contract [${contractBad.slice(0, 3).join("; ")}] · select lists [${selectBad.slice(0, 3).join("; ")}] · alias [${aliasBad.join("; ")}] · bound values [${bindBad.slice(0, 3).join("; ")}] · never bound [${unbound.join(", ")}]`];
  });

  /* ── P8 · the migration list ── */
  await claim(L.p8, async () => {
    const dir = join(ROOT, "prisma", "migrations");
    const folders = (impl.folders ?? readdirSync(dir)).filter((n) => new RegExp("^[0-9]{14}_").test(n));
    const listed = (impl.lib.ENGINE_MIGRATIONS as readonly string[]);
    const missingOnDisk = listed.filter((n) => !folders.includes(n));
    const marketing = new RegExp('SmsCampaign|"SmsMessage"|MarketingContact|ContactList|MessagingConsent|"Suppression"|MarketingOptOutToken|SmsPurpose|SmsStatus');
    const touching = folders.filter((n) => marketing.test(readFileSync(join(dir, n, "migration.sql"), "utf8")));
    const notListed = touching.filter((n) => !listed.includes(n));
    const sorted = json([...listed].sort()) === json([...listed]);
    return [missingOnDisk.length === 0 && notListed.length === 0 && sorted && listed.length >= 10,
      `${listed.length} listed · ${folders.length} on disk · not on disk [${missingOnDisk.join(", ")}] · touching a marketing table but not listed [${notListed.join(", ")}] · in order ${sorted}`];
  });

  /* ── P9 · the wiring ── */
  await claim(L.p9, async () => {
    const wrong: string[] = [];
    let scripts: Record<string, string> = {};
    try { scripts = (JSON.parse(impl.sources.pkg) as { scripts?: Record<string, string> }).scripts ?? {}; } catch { wrong.push("package.json is not JSON"); }
    const want: Record<string, string> = {
      "ops:marketing-preflight": "tsx scripts/live/marketing-preflight.mjs",
      "ops:marketing-campaign-evidence": "tsx scripts/live/marketing-campaign-evidence.mjs",
      "test:marketing-preflight": "tsx scripts/marketing-preflight.test.mts",
      "red:marketing-preflight": "tsx scripts/marketing-preflight.test.mts --prove-red",
      // the lead's addition · the two tools end to end on a scratch PostgreSQL (loopback only, the lock's)
      "db:probe-marketing-u52a": "tsx scripts/db-scratch.mts --reset --run npx tsx scripts/live/pg-probe-run.mts scripts/live/marketing-u52a-pg-probe.mts",
    };
    for (const [k, v] of Object.entries(want)) if (scripts[k] !== v) wrong.push(`${k} is "${scripts[k] ?? "missing"}"`);
    const chain = (scripts.predeploy ?? "").split("&&").map((x) => x.trim());
    for (const k of Object.keys(want)) if (chain.some((x) => x.includes(k))) wrong.push(`${k} is on the predeploy chain`);
    for (const rel of ["scripts/live/marketing-preflight.mjs", "scripts/live/marketing-campaign-evidence.mjs", "scripts/lib/marketing-u52a.mjs", "scripts/lib/marketing-u52a-boot.mjs", "scripts/lib/marketing-u52a-world.mts", "scripts/live/marketing-u52a-pg-probe.mts"]) {
      try { rawRead(rel); } catch { wrong.push(`${rel} is missing`); }
    }
    const prod = new RegExp("https?://[A-Za-z0-9.-]*50pick[.]tz");
    for (const [name, src] of [["core", impl.sources.lib], ["pre-flight", impl.sources.pre], ["evidence", impl.sources.ev]] as const) if (prod.test(src)) wrong.push(`${name} names a production address`);
    // ⭐ AS THE LEAD RUNS THEM — each `ops:` key's own command, as a child process with no database: exit 2, a word, no typed number
    for (const [key, extra, wantWords] of [
      ["ops:marketing-preflight", [`--test=${W.TEST.raw}`, `--origin=${W.ORIGIN}`], "no DATABASE_URL"],
      ["ops:marketing-campaign-evidence", [W.CAMPAIGN], "nothing to prove"],
    ] as const) {
      if (!scripts[key]) continue;
      const r = spawnKey(scripts[key], [...extra]);
      if (r.status !== 2 || !r.out.includes(wantWords) || leakOf(r.out) !== null) wrong.push(`${key} run as a child process: exit ${r.status}, says "${wantWords}" ${r.out.includes(wantWords)}`);
    }
    if (impl.lib.LEDGER_REL !== ".qa-shots/marketing-setup/U52a/ledger.json") wrong.push(`the ledger path is ${String(impl.lib.LEDGER_REL)}`);
    if (!impl.sources.gitignore.split(NL).some((l) => l.trim() === ".qa-shots/")) wrong.push(".qa-shots/ is not gitignored");
    // ⭐ THROUGH NPM, exactly as the sheet prints it (`npm run -s <key> -- <args>`): no banner and no line that names a number. npm's
    // own banner echoes the command line — the typed number with it — which is why every command of the sheet says -s. (The control,
    // without -s, is run for the record: it shows what the flag keeps off the screen.)
    let bannerShowsNumber = "not run";
    if (scripts["ops:marketing-preflight"]) {
      const typed = [`--test=+${W.TEST.key}`, `--origin=${W.ORIGIN}`];
      const quiet = spawnNpm(true, "ops:marketing-preflight", typed);
      if (quiet.status !== 2 || !quiet.out.includes("no DATABASE_URL")) wrong.push(`npm run -s ops:marketing-preflight: exit ${quiet.status}, says "no DATABASE_URL" ${quiet.out.includes("no DATABASE_URL")}`);
      const banner = quiet.out.split(NL).filter((l) => l.trim().startsWith(">"));
      if (banner.length > 0) wrong.push(`npm run -s still printed ${banner.length} banner line(s)`);
      if (leakOf(quiet.out) !== null) wrong.push("npm run -s printed a line that names a number");
      bannerShowsNumber = String(leakOf(spawnNpm(false, "ops:marketing-preflight", typed).out) !== null);
    }
    // ⭐ every `npm run` of the spec's run sheet is `npm run -s`, and every command of the sheet goes through `railway run --service 50pick`
    const spec = impl.sources.spec;
    const from = spec.indexOf("✅ **AS BUILT — the run sheet (");
    const to = spec.indexOf(NL + "## 5 · Shared rules");
    const sheet = from >= 0 && to > from ? spec.slice(from, to) : "";
    if (sheet.length < 3000) wrong.push("the run sheet was not found in the spec");
    const plain = sheet.split("npm run ").slice(1).filter((rest) => !(rest.startsWith("-s ") || rest.startsWith("-s`")));
    if (plain.length > 0) wrong.push(`${plain.length} npm command(s) of the run sheet without -s`);
    const RAILWAY = "railway run --service 50pick ";
    const bare = [...sheet.matchAll(new RegExp("npm run -s ops:", "g"))].filter((m) => sheet.slice(Math.max(0, (m.index ?? 0) - RAILWAY.length), m.index ?? 0) !== RAILWAY);
    if (bare.length > 0) wrong.push(`${bare.length} command(s) of the run sheet do not go through ${RAILWAY.trim()}`);
    if (!sheet.includes("kipindi-m14-base")) wrong.push("the run sheet does not name the checkout the commands run from");
    // the scratch-PostgreSQL probe is a REQUIRED step before production, not an option
    if (!(sheet.includes("db:probe-marketing-u52a") && sheet.includes("REQUIRED before production") && sheet.includes("Step 0 is not run on production until it is green"))) wrong.push("the run sheet no longer requires the scratch probe before production");
    // ⭐ THE GATE is on the sheet (the cap and "nothing else can send" gate the drive, they are not only read afterwards): the pre-flight with the
    // campaign about to start named, the ledger's room, the audience look - before step 2, each Start and any retry - and step 0 reads twenty rows
    for (const gate of ["ops:marketing-campaign-evidence -- --ledger --sends=1", "--look --expect-audience=1", "--expect-switch=open --drive-campaign=<X>"]) {
      if (!sheet.includes(gate)) wrong.push(`the run sheet no longer carries the gate command «${gate}»`);
    }
    if (!sheet.includes("and before ANY retry run G1, G2 and G3")) wrong.push("the run sheet no longer gates a retry");
    if (!sheet.includes("RESULT: GO — 19 of 19 rows (1 not applicable)")) wrong.push("the run sheet's step 0 no longer reads 19 of 19 rows");
    // ⭐ THE DRIVE'S MESSAGE, QUOTED (the owner's words of 2026-10-09): the sheet holds the ONE constant's four fields character for
    // character, each in code quotes, and names the campaigns as the constant does — the drive never tells them apart by their text
    const tick = String.fromCharCode(96);
    const driveWords = impl.lib.DRIVE_MESSAGE as unknown as Record<string, string>;
    for (const [field, words] of Object.entries(driveWords)) if (!sheet.includes(`${tick}${words}${tick}`)) wrong.push(`the run sheet does not quote the drive's ${field} exactly`);
    for (const name of Object.values(impl.lib.DRIVE_CAMPAIGN_NAMES as unknown as Record<string, string>)) if (!sheet.includes(`${tick}${name}${tick}`)) wrong.push(`the run sheet does not name the campaign ${name}`);
    // ⛔ the owner's number never ends the drive stopped, and the GROWTH login is offered its own number alone
    if (!(sheet.includes("never ends the drive") && sheet.includes("Anza kupokea tena") && sheet.includes("--expect=resumed:test"))) wrong.push("the run sheet no longer starts the owner's number again before a drive that stops");
    if (!(sheet.includes("is for ADMIN and COMPLIANCE only") && sheet.includes("My own number"))) wrong.push("the run sheet no longer says the GROWTH login is offered its own number alone");
    return [wrong.length === 0, `wrong [${wrong.join("; ")}] · without -s the banner names the number: ${bannerShowsNumber}`];
  });

  /* ── E0 · evidence controls ── */
  const A_ARGS = [`--test=${W.TEST.raw}`, "--expect=delivered:test", "--expect-sends=2", "--label=A"];
  await claim(L.e0, async () => {
    const wrong: string[] = [];
    const a = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, A_ARGS));
    if (a.code !== 0 || !has(a.lines, "RESULT: PROVEN")) wrong.push(`A: exit ${a.code}`);
    const led = LIB.parseLedger(a.ledgerText);
    if (!(led.ok && LIB.ledgerTotal(led.ledger) === 2 && led.ledger.entries[W.CAMPAIGN]?.label === "A")) wrong.push("A: the ledger did not take 2");
    if (!has(a.lines, W.TEST.masked)) wrong.push("A: the mask is not printed");
    const look = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, ["--look"]));
    if (look.code !== 0 || !has(look.lines, "LOOK ONLY") || has(look.lines, "PROVEN")) wrong.push(`look: exit ${look.code}`);
    // ... and the judged result of a look says so itself: no verdict (null) — never "proven" — whatever the facts hold (V16 of the review)
    const bareFacts = { campaign: { id: W.CAMPAIGN }, recipients: [], recipientCounts: [], messages: [], messageCounts: [], testMessages: [], testMessageCounts: [], audit: [], switchAudit: [], people: {} };
    const lookArgs = EV.parseEvidenceArgs([W.CAMPAIGN, "--look"], LIB);
    const judged = lookArgs.ok ? (((impl.judgeEvidence ?? EV.judgeEvidence) as typeof EV.judgeEvidence)(bareFacts as never, lookArgs.args as never, impl.lib as never, (impl.parts ?? EV.PARTS) as never) as { proven: unknown }) : null;
    if (!judged || judged.proven !== null) wrong.push(`a look carries a verdict (proven ${String(judged?.proven)})`);
    const none = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`]));
    if (none.code !== 2 || none.statements.length !== 0 || !has(none.lines, "nothing to prove")) wrong.push(`no expectation: exit ${none.code}`);
    const both = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--look", "--expect=sent:test"]));
    if (both.code !== 2) wrong.push(`look + expect: exit ${both.code}`);
    const missing = W.evA();
    missing.campaign = null;
    const gone = await ev(impl, missing, W.evArgv(W.CAMPAIGN, A_ARGS));
    if (gone.code !== 1 || !has(gone.lines, "NOT FOUND")) wrong.push(`no such campaign: exit ${gone.code}`);
    const usage: Array<[string, string[]]> = [
      ["no id", [`--test=${W.TEST.raw}`, "--expect=sent:test"]],
      ["a phone number as the id", ["0755000111", `--test=${W.TEST.raw}`, "--expect=sent:test"]],
      ["who without its number", [W.CAMPAIGN, "--expect=skipped:control", `--test=${W.TEST.raw}`]],
      ["an outcome that does not exist", [W.CAMPAIGN, `--test=${W.TEST.raw}`, "--expect=maybe:test"]],
      ["a skip reason the gate lacks", [W.CAMPAIGN, `--test=${W.TEST.raw}`, "--expect=skipped=because:test"]],
      ["a reason on sent", [W.CAMPAIGN, `--test=${W.TEST.raw}`, "--expect=sent=suppressed:test"]],
      ["--show-stop-link without --test", [W.CAMPAIGN, "--look", "--show-stop-link"]],
      ["--sends outside --ledger", [W.CAMPAIGN, "--look", "--sends=1"]],
      ["a bad label", [W.CAMPAIGN, "--look", "--label=a very long label indeed"]],
      ["a label that is a number", [W.CAMPAIGN, "--look", "--label=772619619"]],
      ["a label of a run of five digits", [W.CAMPAIGN, "--look", "--label=ab12345"]],
      ["a label that is a spaced number", [W.CAMPAIGN, "--look", "--label=0772 619 619"]],
      ["a value on --new-ledger", [W.CAMPAIGN, "--look", "--new-ledger=yes"]],
      ["--expect-sends 9", [W.CAMPAIGN, `--test=${W.TEST.raw}`, "--expect-sends=9"]],
      ["an audit token that is not an action", [W.CAMPAIGN, "--expect-audit=paused"]],
      ["--look with an audit expectation", [W.CAMPAIGN, "--look", "--expect-audit=marketing.campaign_started"]],
      // ⭐ a value flag given twice is refused, whichever it is (only --expect and --expect-audit repeat) - a second --test is never silently dropped
      ["--test twice", [W.CAMPAIGN, "--look", `--test=${W.TEST.raw}`, "--test=0622 000 222"]],
      ["--test twice, the same number", [W.CAMPAIGN, "--look", `--test=${W.TEST.raw}`, `--test=${W.TEST.raw}`]],
      ["--control twice", [W.CAMPAIGN, "--look", `--test=${W.TEST.raw}`, `--control=${W.CONTROL.raw}`, "--control=0688 000 333"]],
      ["--label twice", [W.CAMPAIGN, "--look", "--label=A", "--label=B"]],
      ["--expect-sends twice", [W.CAMPAIGN, `--test=${W.TEST.raw}`, "--expect-sends=1", "--expect-sends=2"]],
      ["--sends twice", ["--ledger", "--sends=1", "--sends=2"]],
      ["two campaign ids", [W.CAMPAIGN, `${W.CAMPAIGN}x`, "--look"]],
      // ⭐ --expect-audience: one whole number of people, once, never with --ledger
      ["--expect-audience twice", [W.CAMPAIGN, "--look", "--expect-audience=1", "--expect-audience=2"]],
      ["--expect-audience not a number", [W.CAMPAIGN, "--look", "--expect-audience=one"]],
      ["--expect-audience a phone number", [W.CAMPAIGN, "--look", "--expect-audience=0755000111"]],
      ["--expect-audience past 9999", [W.CAMPAIGN, "--look", "--expect-audience=10000"]],
      ["--expect-audience with --ledger", ["--ledger", "--expect-audience=1"]],
    ];
    for (const [name, argv] of usage) {
      const r = await ev(impl, W.evA(), argv);
      if (r.code !== 2 || r.statements.length !== 0) wrong.push(`${name}: exit ${r.code}`);
      if (new RegExp("[0-9]{5}").test(r.lines.join(" "))) wrong.push(`${name}: the refusal shows a run of digits`);
    }
    const labelled = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect=delivered:test", "--label=Step 3b"]));
    if (labelled.code !== 0) wrong.push(`a plain label with a digit: exit ${labelled.code}`);
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── E1 · the discrimination verdict and its exit code ── */
  await claim(L.e1, async () => {
    const wrong: string[] = [];
    type EvW = ReturnType<typeof W.evA>;
    const run = async (name: string, w: EvW, extra: string[], wantCode: number, saying?: string) => {
      const r = await ev(impl, w, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, `--control=${W.CONTROL.raw}`, ...extra]));
      if (r.code !== wantCode) wrong.push(`${name}: exit ${r.code}, wanted ${wantCode}`);
      if (saying && !has(r.lines, saying)) wrong.push(`${name}: does not say "${saying}"`);
    };
    const bW = (): EvW => W.evB();
    await run("B good: skipped:test + 0 sends", bW(), ["--expect=skipped:test", "--expect-sends=0"], 0, "RESULT: PROVEN");
    await run("B good: stopped:test", bW(), ["--expect=skipped:test,stopped:test"], 0);
    // ⭐ THE GATE REMOVED — the stopped number is SENT; the refusal the drive was given to prove is not there
    const removed = (): EvW => {
      const w = W.evA();
      w.recipients = [W.recipientRow({ key: W.TEST.key, id: "rcp_test_b", sms_reference: "sms_b0b0b0b0b0b0b0b0b0b0b0b0", claimed_at: d(W.T0 + 1_802_000), sent_at: d(W.T0 + 1_804_000), delivered_at: null, status: "SENT" })];
      w.messages = [W.messageRow({ reference: "sms_b0b0b0b0b0b0b0b0b0b0b0b0", target_id: "rcp_test_b", status: "ACCEPTED", dlr_status: null, dlr_desc: null, delivered_at: null, created_at: d(W.T0 + 1_803_000), sent_at: d(W.T0 + 1_804_000) })];
      w.testMessages = [];
      return W.withStop(w, "test", W.T0 + 1_140_000);
    };
    await run("gate removed: skipped:test fails", removed(), ["--expect=skipped:test"], 1, "NOT refused");
    await run("gate removed: zero sends fails", removed(), ["--expect=skipped:test", "--expect-sends=0"], 1);
    // the original pair: the control refused in the same run an eligible number is sent
    const pair = (): EvW => {
      const w = W.evA();
      w.testMessages = [];
      w.recipients.push(W.recipientRow({ key: W.CONTROL.key, id: "rcp_control_a", status: "SKIPPED", skip_reason: "suppressed", skip_detail: "suppressed withdrawn", sms_reference: null, has_token: false, sent_at: null, delivered_at: null, claim_token: "clm_token_one" }));
      w.people.control = { suppressions: [{ reason: "WITHDRAWN", via_link: false, created_at: d(W.T0 - 86400_000), lifted_at: null, lifted_via_link: false }], ledger: [{ status: "WITHDRAWN", source: "OPERATOR", via_link: false, created_at: d(W.T0 - 86400_000) }] };
      return w;
    };
    await run("pair: sent:test + skipped:control", pair(), ["--expect=sent:test,skipped:control", "--expect-sends=1"], 0, "RESULT: PROVEN");
    const controlSent = pair();
    controlSent.recipients[1] = W.recipientRow({ key: W.CONTROL.key, id: "rcp_control_a", sms_reference: "sms_cccccccccccc00000000aaaa" });
    controlSent.messages.push(W.messageRow({ reference: "sms_cccccccccccc00000000aaaa", target_id: "rcp_control_a" }));
    await run("control SENT (gate removed): skipped:control fails", controlSent, ["--expect=sent:test,skipped:control"], 1, "FAILS");
    const noControlRow = pair();
    noControlRow.recipients = noControlRow.recipients.slice(0, 1);
    await run("control has no row: not a refusal", noControlRow, ["--expect=sent:test,skipped:control"], 1, "NO row on this campaign");
    const noTestRow = bW();
    noTestRow.recipients = [];
    await run("test has no row: not a refusal", noTestRow, ["--expect=skipped:test"], 1, "NO row on this campaign");
    const otherReason = bW();
    otherReason.recipients[0] = { ...otherReason.recipients[0], skip_reason: "no_consent" };
    await run("skipped for no_consent proves nothing about the stop", otherReason, ["--expect=skipped:test"], 1, "proves nothing about the stop");
    await run("skipped=no_consent names its reason", otherReason, ["--expect=skipped=no_consent:test"], 0);
    const skippedWithMessage = bW();
    skippedWithMessage.messages = [W.messageRow({ reference: "sms_dddddddddddd00000000bbbb", target_id: "rcp_test_b", status: "ACCEPTED", dlr_status: null })];
    await run("skipped yet a message exists", skippedWithMessage, ["--expect=skipped:test"], 1, "a message of it exists on the wire");
    const sentNotDelivered = W.evA();
    sentNotDelivered.recipients[0] = { ...sentNotDelivered.recipients[0], status: "SENT", delivered_at: null };
    sentNotDelivered.messages[0] = { ...sentNotDelivered.messages[0], status: "ACCEPTED", dlr_status: null, delivered_at: null };
    await run("sent is not delivered", sentNotDelivered, ["--expect=delivered:test"], 1, "not DELIVERED");
    await run("sent holds on SENT", sentNotDelivered, ["--expect=sent:test"], 0);
    const unconfirmed = W.evA();
    unconfirmed.recipients[0] = { ...unconfirmed.recipients[0], status: "UNCONFIRMED", sms_reference: null, sent_at: null, delivered_at: null };
    unconfirmed.messages = [];
    await run("unconfirmed is not sent", unconfirmed, ["--expect=sent:test"], 1);
    const failedRow = W.evA();
    failedRow.recipients[0] = { ...failedRow.recipients[0], status: "FAILED", failure_class: "REJECTED", delivered_at: null };
    await run("failed is not delivered", failedRow, ["--expect=delivered:test"], 1);
    await run("a wrong --expect-sends", W.evA(), ["--expect=delivered:test", "--expect-sends=1"], 1, "counted 2");
    await run("sent but no message on the wire", (() => { const w = W.evA(); w.messages = []; return w; })(), ["--expect=sent:test"], 1, "no message of it is on the wire");
    await run("stopped:test on a campaign never stopped", W.evA(), ["--expect=stopped:test"], 1);
    await run("resumed:test on a campaign never stopped", W.evA(), ["--expect=resumed:test"], 1);
    await run("resumed:test after start-again (C)", W.evC(), ["--expect=sent:test,resumed:test", "--expect-sends=1"], 0, "RESULT: PROVEN");
    await run("resumed:test while still stopped", bW(), ["--expect=resumed:test"], 1);
    await run("repeated --expect and --expect-audit flags (PowerShell-safe)", bW(), ["--expect=skipped:test", "--expect=stopped:test", "--expect-audit=marketing.campaign_confirmed", "--expect-audit=marketing.campaign_started"], 0, "RESULT: PROVEN");
    await run("audit rows named and present (A)", W.evA(), ["--expect=delivered:test", "--expect-audit=marketing.campaign_confirmed,marketing.campaign_started,marketing.campaign_finished"], 0, "EXPECT audit marketing.campaign_started");
    await run("audit row named and absent (A was never paused)", W.evA(), ["--expect=delivered:test", "--expect-audit=marketing.campaign_paused"], 1, "0 rows of E24");
    await run("audit rows of a pause and a resume (C)", W.evC(), ["--expect=sent:test", "--expect-audit=marketing.campaign_paused,marketing.campaign_resumed"], 0);
    await run("an audit expectation alone is something to prove", W.evC(), ["--expect-audit=marketing.campaign_resumed"], 0);
    // the named person is found even beyond the first 41 rows (the SQL asks for them by number) and judged like any other
    const crowd = (): EvW => {
      const w = W.evB();
      const testRow = w.recipients[0];
      const filler = Array.from({ length: 45 }, (_, i) => W.recipientRow({ key: `255761${String(100000 + i)}`, id: `rcp_fill_${String(100 + i)}`, status: "PENDING", skip_reason: null, skip_detail: null, sms_reference: null, has_token: false, sent_at: null, delivered_at: null, claim_token: null, claimed_at: null }));
      w.recipients = [...filler, testRow];
      return w;
    };
    await run("the test number beyond the first 41 rows is still judged", crowd(), ["--expect=skipped:test,stopped:test"], 0, "RESULT: PROVEN");
    const crowdSent = crowd();
    crowdSent.recipients[45] = { ...crowdSent.recipients[45], status: "SENT", skip_reason: null, sms_reference: "sms_b0b0b0b0b0b0b0b0b0b0b0b0", sent_at: d(W.T0 + 1_804_000) };
    crowdSent.messages = [W.messageRow({ reference: "sms_b0b0b0b0b0b0b0b0b0b0b0b0", target_id: "rcp_test_b", status: "ACCEPTED", dlr_status: null, created_at: d(W.T0 + 1_803_000), sent_at: d(W.T0 + 1_804_000) })];
    await run("the test number beyond the first 41 rows SENT after its stop is still caught", crowdSent, ["--expect=skipped:test"], 1, "NOT refused");
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── E2 · a message after a stop ── */
  await claim(L.e2, async () => {
    const wrong: string[] = [];
    // a sent row whose slice took the person up AFTER a stop: a violation even though the asker only expected `sent`
    const w = W.evA();
    w.testMessages = [];
    w.recipients[0] = { ...w.recipients[0], claimed_at: d(W.T0 + 1_802_000), sent_at: d(W.T0 + 1_804_000), delivered_at: d(W.T0 + 1_809_000) };
    w.messages[0] = { ...w.messages[0], created_at: d(W.T0 + 1_803_000), sent_at: d(W.T0 + 1_804_000) };
    W.withStop(w, "test", W.T0 + 1_140_000);
    const r = await ev(impl, w, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect=sent:test"]));
    if (r.code !== 1 || !has(r.lines, "VIOLATION — ")) wrong.push(`sent after a stop: exit ${r.code}`);
    // a stop made AFTER the message is not a violation, and `stopped:test` holds
    const after = W.evA();
    after.testMessages = [];
    W.withStop(after, "test", W.T0 + 600_000);
    const ra = await ev(impl, after, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect=sent:test,stopped:test"]));
    if (ra.code !== 0 || has(ra.lines, "VIOLATION — ")) wrong.push(`stop after the message: exit ${ra.code}`);
    // a stop lifted BEFORE the message is not a violation (C)
    const rc = await ev(impl, W.evC(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect=sent:test"]));
    if (rc.code !== 0 || has(rc.lines, "VIOLATION — ")) wrong.push(`message after the stop was lifted: exit ${rc.code}`);
    // the control: a message to the control after its (operator) stop
    const cw = W.evA();
    cw.testMessages = [];
    cw.recipients.push(W.recipientRow({ key: W.CONTROL.key, id: "rcp_control_a", sms_reference: "sms_eeeeeeeeeeee00000000cccc" }));
    cw.messages.push(W.messageRow({ reference: "sms_eeeeeeeeeeee00000000cccc", target_id: "rcp_control_a" }));
    cw.people.control = { suppressions: [{ reason: "OPERATOR", via_link: false, created_at: d(W.T0 - 86400_000), lifted_at: null, lifted_via_link: false }], ledger: [] };
    const rcw = await ev(impl, cw, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, `--control=${W.CONTROL.raw}`, "--expect=sent:test"]));
    if (rcw.code !== 1 || !has(rcw.lines, "VIOLATION — the control")) wrong.push(`control sent after its stop: exit ${rcw.code}`);
    // stopInForceAt itself
    const f = EV.stopInForceAt;
    const T = W.T0;
    const ledger = [{ status: "GIVEN", created_at: d(T) }, { status: "WITHDRAWN", created_at: d(T + 100) }, { status: "GIVEN", created_at: d(T + 200) }];
    const sup = [{ created_at: d(T + 100), lifted_at: d(T + 200) }];
    const table: Array<[number, boolean]> = [[T + 50, false], [T + 100, true], [T + 150, true], [T + 200, false], [T + 300, false]];
    for (const [at, want] of table) if (f(at, sup, ledger).inForce !== want) wrong.push(`stopInForceAt(${at - T}) is not ${want}`);
    // a re-armed suppression: the Suppression row says "in force" from its first creation, a later yes says otherwise
    const rearmed = [{ created_at: d(T + 100), lifted_at: null }];
    if (f(T + 250, rearmed, [{ status: "GIVEN", created_at: d(T + 200) }, { status: "WITHDRAWN", created_at: d(T + 100) }]).inForce !== false) wrong.push("a yes after the stop did not end it");

    // ⭐ A LOOK finds a violation too: it asks for no verdict, not for silence — the exit is 1 and the RESULT line says VIOLATION
    const lookViolation = await ev(impl, w, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--look"]));
    if (lookViolation.code !== 1 || !has(lookViolation.lines, "RESULT: LOOK ONLY") || !has(lookViolation.lines, "BUT 1 VIOLATION")) wrong.push(`a look at a campaign that messaged a stopped number: exit ${lookViolation.code}`);
    const lookClean = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--look"]));
    if (lookClean.code !== 0 || has(lookClean.lines, "VIOLATION — ") || has(lookClean.lines, "BUT ")) wrong.push(`a look at a clean campaign: exit ${lookClean.code}`);

    // ⭐ THE JUDGEMENTS, one by one, on people built by hand (the parts are the ones under test)
    const parts = (impl.parts ?? EV.PARTS) as unknown as { judgeExpectation: (e: object, p: object, l: unknown) => { holds: boolean }; stopViolations: (people: object[]) => unknown[] };
    const person = (o: Record<string, unknown>) => ({ role: "test", masked: W.TEST.masked, key: W.TEST.key, recipient: null, messages: [] as object[], suppressions: [] as object[], ledger: [] as object[], ...o });
    const row = (o: Record<string, unknown> = {}) => W.recipientRow({ key: W.TEST.key, id: "rcp_unit_0001", sms_reference: "sms_a0a0a0a0a0a0a0a0a0a0a0a0", ...o });
    const msg = (o: Record<string, unknown> = {}) => W.messageRow({ reference: "sms_a0a0a0a0a0a0a0a0a0a0a0a0", target_id: "rcp_unit_0001", ...o });
    const linkStop = { reason: "WITHDRAWN", via_link: true, created_at: d(W.T0 + 600_000), lifted_at: null, lifted_via_link: false };
    const withdrew = { status: "WITHDRAWN", source: "OPT_OUT_PAGE", via_link: true, created_at: d(W.T0 + 600_000) };
    const gave = (at: number) => ({ status: "GIVEN", source: "OPT_OUT_PAGE", via_link: true, created_at: d(at) });
    const holds = (outcome: string, p: object): boolean => parts.judgeExpectation({ outcome, who: "test", reason: null }, p, impl.lib).holds;
    // `stopped` means the stop link was tapped AFTER this campaign's message — a stop made BEFORE the message is not that
    const stopBeforeMessage = person({ recipient: row({ claimed_at: d(W.T0 + 880_000), sent_at: d(W.T0 + 900_000) }), messages: [msg({ created_at: d(W.T0 + 890_000), sent_at: d(W.T0 + 900_000) })], suppressions: [linkStop], ledger: [withdrew] });
    if (holds("stopped", stopBeforeMessage)) wrong.push("`stopped` held for a stop made BEFORE the campaign's message");
    const stopAfterMessage = person({ recipient: row(), messages: [msg()], suppressions: [linkStop], ledger: [withdrew] });
    if (!holds("stopped", stopAfterMessage)) wrong.push("`stopped` did not hold for a stop from the link made after the message");
    // ... and it means an ACTIVE WITHDRAWN stop made from the link: an operator's stop is not "the stop link tapped"
    const operatorStop = person({ recipient: row(), messages: [msg()], suppressions: [{ ...linkStop, reason: "OPERATOR", via_link: false }], ledger: [withdrew] });
    if (holds("stopped", operatorStop)) wrong.push("`stopped` held for a stop that was not made from the link");
    // `resumed` means the stop was lifted from the link AND the person's newest ledger row is that yes
    const lifted = { ...linkStop, lifted_at: d(W.T0 + 700_000), lifted_via_link: true };
    if (!holds("resumed", person({ recipient: row(), suppressions: [lifted], ledger: [gave(W.T0 + 700_000), withdrew] }))) wrong.push("`resumed` did not hold after a lift from the link with that yes as the newest row");
    if (holds("resumed", person({ recipient: row(), suppressions: [lifted], ledger: [{ ...withdrew, created_at: d(W.T0 + 800_000) }, gave(W.T0 + 700_000), withdrew] }))) wrong.push("`resumed` held while the newest ledger row is a withdrawal");
    // what counts as HANDED OVER to a stopped number: an UNCONFIRMED row (the request may have reached the carrier), and a message on the
    // wire even for a row that is not SENT — and not a row that never left
    const stoppedOnes = { suppressions: [linkStop], ledger: [withdrew] };
    const gone = { sms_reference: null, sent_at: null, delivered_at: null, claimed_at: d(W.T0 + 900_000) };
    if (parts.stopViolations([person({ ...stoppedOnes, recipient: row({ ...gone, status: "UNCONFIRMED" }) })]).length !== 1) wrong.push("an UNCONFIRMED row after a stop was not found handed over");
    if (parts.stopViolations([person({ ...stoppedOnes, recipient: row({ ...gone, status: "FAILED" }), messages: [msg({ created_at: d(W.T0 + 905_000), sent_at: null })] })]).length !== 1) wrong.push("a message on the wire for a row that is not SENT was not found handed over");
    if (parts.stopViolations([person({ ...stoppedOnes, recipient: row({ ...gone, status: "FAILED" }) })]).length !== 0) wrong.push("a FAILED row with no message counted as handed over");
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── E8 · the standing checks ── */
  await claim(L.e8, async () => {
    const wrong: string[] = [];
    const base = [`--test=${W.TEST.raw}`, "--expect=delivered:test"];
    const clean = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, base));
    if (clean.code !== 0 || !has(clean.lines, "ONE MESSAGE PER ROW   clear") || !has(clean.lines, "TO THE TEST NUMBER    clear") || !has(clean.lines, "NO OTHER MARKETING SMS clear") || has(clean.lines, "VIOLATION — ")) wrong.push(`a clean campaign: exit ${clean.code}`);
    if (!clean.lines.some((l) => l.includes("to the test number: yes"))) wrong.push("a message line does not say whether it went to the test number");
    // ONE CHARGEABLE MESSAGE PER ROW — a double send, whatever else was asked (no --expect-sends here)
    const twice = W.evA();
    twice.testMessages = [];
    twice.messages.push(W.messageRow({ reference: "sms_dupdupdupdupdupdupdup01", target_id: "rcp_test_a", status: "ACCEPTED", dlr_status: null, created_at: d(W.T0 + 5_000), sent_at: d(W.T0 + 5_500) }));
    const rTwice = await ev(impl, twice, W.evArgv(W.CAMPAIGN, base));
    if (rTwice.code !== 1 || !has(rTwice.lines, "VIOLATION — the test row has 2 chargeable messages") || !has(rTwice.lines, "RESULT: NOT PROVEN")) wrong.push(`a double send: exit ${rTwice.code}`);
    const lookTwice = await ev(impl, twice, W.evArgv(W.CAMPAIGN, ["--look"]));
    if (lookTwice.code !== 1 || !has(lookTwice.lines, "RESULT: LOOK ONLY") || !has(lookTwice.lines, "BUT 1 VIOLATION")) wrong.push(`a look at a double send: exit ${lookTwice.code}`);
    // ⭐ ... but a first attempt the GATEWAY REFUSED (FAILED, no receipt: it never left) plus the engine's retry is not a double send - two such failures and one send are not either
    const retried = W.evA();
    retried.testMessages = [];
    retried.messages.unshift(W.messageRow({ reference: "sms_refusedrefusedrefused01", target_id: "rcp_test_a", status: "FAILED", dlr_status: null, dlr_desc: null, delivered_at: null, failed_at: d(W.T0 + 2_900), created_at: d(W.T0 + 2_800), sent_at: null }));
    const rRetried = await ev(impl, retried, W.evArgv(W.CAMPAIGN, base));
    if (rRetried.code !== 0 || !has(rRetried.lines, "ONE MESSAGE PER ROW   clear") || has(rRetried.lines, "VIOLATION — ")) wrong.push(`a refused first attempt and a retry read as a double send: exit ${rRetried.code}`);
    const retriedTwice = W.evA();
    retriedTwice.testMessages = [];
    for (const ref of ["sms_refusedrefusedrefused01", "sms_refusedrefusedrefused02"]) retriedTwice.messages.unshift(W.messageRow({ reference: ref, target_id: "rcp_test_a", status: "FAILED", dlr_status: null, dlr_desc: null, delivered_at: null, failed_at: d(W.T0 + 2_900), created_at: d(W.T0 + 2_800), sent_at: null }));
    const rRetriedTwice = await ev(impl, retriedTwice, W.evArgv(W.CAMPAIGN, base));
    if (rRetriedTwice.code !== 0 || has(rRetriedTwice.lines, "VIOLATION — ")) wrong.push(`two refused attempts and a send read as a double send: exit ${rRetriedTwice.code}`);
    // a FAILED row WITH a receipt did reach the carrier (it may have been billed): it counts, so it plus a send IS a double
    const failedWithReceipt = W.evA();
    failedWithReceipt.testMessages = [];
    failedWithReceipt.messages.unshift(W.messageRow({ reference: "sms_receiptfailedreceipt01", target_id: "rcp_test_a", status: "FAILED", dlr_status: "UNDELIV", dlr_desc: "Undelivered", delivered_at: null, failed_at: d(W.T0 + 2_900), created_at: d(W.T0 + 2_800), sent_at: d(W.T0 + 2_850) }));
    const rFailedWithReceipt = await ev(impl, failedWithReceipt, W.evArgv(W.CAMPAIGN, base));
    if (rFailedWithReceipt.code !== 1 || !has(rFailedWithReceipt.lines, "VIOLATION — the test row has 2 chargeable messages")) wrong.push(`a receipt-failed message and a send: exit ${rFailedWithReceipt.code}`);
    // ⭐ NOTHING ELSE IS SENDING — any MARKETING message of the last day to a number but the test number, of ANY campaign: a violation, on a verdict and on a look
    const elsewhere = W.evA();
    elsewhere.elsewhere = 3;
    const rElsewhere = await ev(impl, elsewhere, W.evArgv(W.CAMPAIGN, base));
    if (rElsewhere.code !== 1 || !has(rElsewhere.lines, "VIOLATION — 3 MARKETING messages created in the last 24 hours went to a number that is NOT the test number") || !has(rElsewhere.lines, "RESULT: NOT PROVEN")) wrong.push(`marketing to other numbers: exit ${rElsewhere.code}`);
    const lookElsewhere = await ev(impl, elsewhere, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--look"]));
    if (lookElsewhere.code !== 1 || !has(lookElsewhere.lines, "BUT 1 VIOLATION") || !has(lookElsewhere.lines, "marketing going to another number")) wrong.push(`a look while marketing goes elsewhere: exit ${lookElsewhere.code}`);
    const oneElsewhere = W.evA();
    oneElsewhere.elsewhere = 1;
    if (!has((await ev(impl, oneElsewhere, W.evArgv(W.CAMPAIGN, base))).lines, "VIOLATION — 1 MARKETING message created in the last 24 hours went to")) wrong.push("one message elsewhere is not named in the singular");
    const unread = W.evA();
    unread.elsewhere = null;
    const rUnread = await ev(impl, unread, W.evArgv(W.CAMPAIGN, base));
    if (rUnread.code !== 1 || !has(rUnread.lines, "was not read")) wrong.push(`an unread count passed by default: exit ${rUnread.code}`);
    const noTestElsewhere = await ev(impl, elsewhere, W.evArgv(W.CAMPAIGN, ["--look"]));
    if (noTestElsewhere.code !== 0 || noTestElsewhere.statements.some((s) => s.includes("u52a:elsewhere")) || has(noTestElsewhere.lines, "NO OTHER MARKETING SMS")) wrong.push(`without --test the elsewhere count is read or judged anyway: exit ${noTestElsewhere.code}`);
    // the statement counts in SQL and never selects a number
    const elsewhereText = (() => { const at = impl.sources.ev.indexOf("/* u52a:elsewhere */"); return at < 0 ? "" : impl.sources.ev.slice(at, impl.sources.ev.indexOf(String.fromCharCode(96), at)); })();
    if (!elsewhereText.includes("SELECT count(*)::int AS n FROM") || new RegExp('SELECT [^F]*"msisdn"').test(elsewhereText)) wrong.push("the elsewhere statement does not count in SQL, or selects a number");
    // TO THE TEST NUMBER — a campaign message to another number, and a composer test to another number
    const stray = W.evA();
    stray.messages[0] = { ...stray.messages[0], to_test: false };
    const rStray = await ev(impl, stray, W.evArgv(W.CAMPAIGN, base));
    if (rStray.code !== 1 || !has(rStray.lines, "VIOLATION — 1 campaign message went to a number that is NOT the test number")) wrong.push(`a campaign message to another number: exit ${rStray.code}`);
    const strayTest = W.evA();
    strayTest.testMessages[0] = { ...strayTest.testMessages[0], to_test: false };
    const rStrayTest = await ev(impl, strayTest, W.evArgv(W.CAMPAIGN, base));
    if (rStrayTest.code !== 1 || !has(rStrayTest.lines, "VIOLATION — 1 composer test message went to a number that is NOT the test number")) wrong.push(`a composer test to another number: exit ${rStrayTest.code}`);
    const lookStray = await ev(impl, strayTest, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--look"]));
    if (lookStray.code !== 1 || !has(lookStray.lines, "BUT 1 VIOLATION")) wrong.push(`a look at a composer test to another number: exit ${lookStray.code}`);
    // no --test, no comparison: the check is skipped, never guessed
    const noTest = await ev(impl, strayTest, W.evArgv(W.CAMPAIGN, ["--look"]));
    if (noTest.code !== 0 || has(noTest.lines, "TO THE TEST NUMBER")) wrong.push(`without --test the comparison is made anyway: exit ${noTest.code}`);
    // the statements compute a yes/no and never select the number — read from the SOURCE of the two statements
    const BT_ = String.fromCharCode(96);
    const textOf = (tag: string): string => { const at = impl.sources.ev.indexOf(`/* u52a:${tag} */`); return at < 0 ? "" : impl.sources.ev.slice(at, impl.sources.ev.indexOf(BT_, at)); };
    const asked = ["messages", "test-messages"].map(textOf);
    if (asked.some((s) => s === "" || !s.includes('(m."msisdn" = ') || new RegExp('m[.]"msisdn"(?! = )').test(s))) wrong.push("a messages statement selects the number itself, or does not compare it");
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── E9 · the last checks before a Start ── */
  await claim(L.e9, async () => {
    const wrong: string[] = [];
    type EvW = ReturnType<typeof W.evA>;
    const look = (audience: string[] = ["--expect-audience=1"]): string[] => [`--test=${W.TEST.raw}`, "--look", ...audience];
    // the audience: confirmed for 1, expected 1
    const good = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, look()));
    if (good.code !== 0 || !has(good.lines, "EXPECT audience=1    HOLDS — the campaign is confirmed for 1 person") || !has(good.lines, "RESULT: LOOK ONLY — no verdict was asked; the audience is the 1 expected")) wrong.push(`a campaign confirmed for the 1 expected: exit ${good.code}`);
    const two = W.evA();
    (two.campaign as Record<string, unknown>).audience_count = 2;
    const rTwo = await ev(impl, two, W.evArgv(W.CAMPAIGN, look()));
    if (rTwo.code !== 1 || !has(rTwo.lines, "EXPECT audience=1    FAILS — the campaign is confirmed for 2 people - DO NOT PRESS START") || !has(rTwo.lines, "BUT the campaign is not confirmed for the 1 person expected - DO NOT PRESS START") || !has(rTwo.lines, "RESULT: LOOK ONLY")) wrong.push(`a campaign confirmed for 2: exit ${rTwo.code}`);
    const never = W.evA();
    (never.campaign as Record<string, unknown>).audience_count = null;
    const rNever = await ev(impl, never, W.evArgv(W.CAMPAIGN, look()));
    if (rNever.code !== 1 || !has(rNever.lines, "never confirmed")) wrong.push(`a campaign never confirmed: exit ${rNever.code}`);
    const zero = W.evA();
    (zero.campaign as Record<string, unknown>).audience_count = 0;
    const rZero = await ev(impl, zero, W.evArgv(W.CAMPAIGN, look(["--expect-audience=0"])));
    if (rZero.code !== 0) wrong.push(`an expected audience of 0, confirmed for 0: exit ${rZero.code}`);
    const rZeroWrong = await ev(impl, zero, W.evArgv(W.CAMPAIGN, look()));
    if (rZeroWrong.code !== 1) wrong.push(`an expected audience of 1, confirmed for 0: exit ${rZeroWrong.code}`);
    // a look WITHOUT the expectation is unchanged, and a violation plus a wrong audience say both
    const plain = await ev(impl, two, W.evArgv(W.CAMPAIGN, look([])));
    if (plain.code !== 0 || has(plain.lines, "audience=")) wrong.push(`a look with no audience asked judged one: exit ${plain.code}`);
    const both = W.evA();
    (both.campaign as Record<string, unknown>).audience_count = 2;
    both.elsewhere = 1;
    const rBoth = await ev(impl, both, W.evArgv(W.CAMPAIGN, look()));
    if (rBoth.code !== 1 || !has(rBoth.lines, "BUT 1 VIOLATION") || !has(rBoth.lines, "DO NOT PRESS START")) wrong.push(`a violation and a wrong audience: exit ${rBoth.code}`);
    // on a VERDICT it is one more thing that must hold, alone or beside the others
    const proven = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect=delivered:test", "--expect-audience=1"]));
    if (proven.code !== 0 || !has(proven.lines, "RESULT: PROVEN")) wrong.push(`a verdict with the audience that holds: exit ${proven.code}`);
    const notProven = await ev(impl, two, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect=delivered:test", "--expect-audience=1"]));
    if (notProven.code !== 1 || !has(notProven.lines, "RESULT: NOT PROVEN")) wrong.push(`a verdict with an audience that does not: exit ${notProven.code}`);
    const alone = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect-audience=1"]));
    if (alone.code !== 0 || !has(alone.lines, "RESULT: PROVEN")) wrong.push(`--expect-audience alone as the thing to prove: exit ${alone.code}`);
    // the judgement itself
    const judged = ((impl.judgeEvidence ?? EV.judgeEvidence) as typeof EV.judgeEvidence)(W.evA() as never, { ...(EV.parseEvidenceArgs([W.CAMPAIGN, `--test=${W.TEST.raw}`, "--look", "--expect-audience=3"], LIB) as { args: object }).args } as never, impl.lib as never, (impl.parts ?? EV.PARTS) as never) as { audience: { expected: number; actual: number; holds: boolean } | null };
    if (!judged.audience || judged.audience.expected !== 3 || judged.audience.actual !== 1 || judged.audience.holds !== false) wrong.push(`the judged audience is ${json(judged.audience)}`);

    // ⭐ THE OFFICER'S PAUSE (the checker's MINOR 8): the action is shared with the engine, so the row must carry an actor AND the reason officer_paused
    const pausedWorld = (rows: Array<Record<string, unknown>>): EvW => {
      const w = W.evC();
      w.audit = w.audit.filter((r) => r.action !== "marketing.campaign_paused").concat(rows);
      return w;
    };
    const askPause = ["--expect=sent:test", "--expect-audit=marketing.campaign_paused"];
    const run = async (name: string, w: EvW, wantCode: number, saying?: string) => {
      const r = await ev(impl, w, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, ...askPause]));
      if (r.code !== wantCode) wrong.push(`${name}: exit ${r.code}, wanted ${wantCode}`);
      if (saying && !has(r.lines, saying)) wrong.push(`${name}: does not say "${saying}"`);
      return r;
    };
    const officer = { seq: "1021", created_at: d(W.T0 + 3_600_500), category: "ADMIN", action: "marketing.campaign_paused", actor_id: "usr_qa_growth_0001", payload: { reason: "officer_paused" } };
    const engine = { seq: "1020", created_at: d(W.T0 + 3_600_100), category: "SYSTEM", action: "marketing.campaign_paused", actor_id: null, payload: { reason: "rail_dead" } };
    await run("the officer's pause", pausedWorld([officer]), 0, "1 row of E24 on this campaign counting as the OFFICER's pause");
    const onlyEngine = await run("only the engine's own pause", pausedWorld([engine]), 1, "0 rows of E24 on this campaign counting as the OFFICER's pause");
    if (!has(onlyEngine.lines, "1 other row of that action is not it")) wrong.push("the engine's pause is not named as 'not it'");
    await run("a pause with an actor and ANOTHER reason", pausedWorld([{ ...engine, actor_id: "usr_qa_growth_0001" }]), 1);
    await run("a pause with the officer's reason and NO actor", pausedWorld([{ ...officer, actor_id: null }]), 1);
    await run("a pause with an empty actor", pausedWorld([{ ...officer, actor_id: "" }]), 1);
    await run("an officer's pause beside the engine's own", pausedWorld([engine, officer]), 0, "(1 other row of that action is not it");
    await run("an officer's pause whose payload is JSON text", pausedWorld([{ ...officer, payload: JSON.stringify({ reason: "officer_paused" }) }]), 0);
    await run("a pause whose payload is unreadable text", pausedWorld([{ ...officer, payload: "not json" }]), 1);
    await run("no pause row at all", pausedWorld([]), 1, "0 rows of E24");
    // the other actions still count a row as it is (they carry no such rule)
    const started = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect=delivered:test", "--expect-audit=marketing.campaign_started"]));
    if (started.code !== 0 || !has(started.lines, "EXPECT audit marketing.campaign_started  HOLDS — 1 row of E24 on this campaign") || has(started.lines, "counting as")) wrong.push(`another action is judged by the pause's rule: exit ${started.code}`);

    // ⭐ U33r · the pre-flight does not judge the agent-referee exclusion, so the evidence must be able to NAME it and say what it means
    const parsed = EV.parseEvidenceArgs([W.CAMPAIGN, `--test=${W.TEST.raw}`, "--expect=skipped=agent_referee:test"], LIB);
    if (!parsed.ok) wrong.push("--expect=skipped=agent_referee:test is not accepted");
    const referee = W.evB();
    referee.recipients[0] = { ...referee.recipients[0], skip_reason: "agent_referee", skip_detail: "given to 50pick as an agent applicant's referee" };
    referee.people.test = { suppressions: [], ledger: [] };
    const asked = await ev(impl, referee, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect=skipped=agent_referee:test", "--expect-sends=0"]));
    if (asked.code !== 0 || !has(asked.lines, "SKIPPED agent_referee") || !has(asked.lines, "RESULT: PROVEN")) wrong.push(`a row skipped agent_referee, asked for by name: exit ${asked.code}`);
    const notStop = await ev(impl, referee, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect=skipped:test"]));
    if (notStop.code !== 1 || !has(notStop.lines, "agent applicant's referee") || !has(notStop.lines, "cannot be the drive's test number") || !has(notStop.lines, "proves nothing about the stop")) wrong.push(`a referee's skip taken for the stop: exit ${notStop.code}`);
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── D1 · the drive's message (the owner's words of 2026-10-09) ── */
  await claim(L.d1, async () => {
    const wrong: string[] = [];
    const lib = impl.lib as typeof LIB;
    const msg = lib.DRIVE_MESSAGE as unknown as Record<"bodySw" | "bodyEn" | "nameFallbackSw" | "nameFallbackEn", string>;
    // ⭐ AN INDEPENDENT COPY of the owner's words, typed here and NOT read from the constant: a body retyped, a word lost, a quote
    // curled or a word changed in `marketing-u52a-message.mjs` fails this line, never passes it.
    const OWNER = {
      bodySw: "50pick: Habari {jina}! Mambo makubwa yanakuja hivi karibuni, na kilichofichwa kitafichuka. Kaa nasi, hutataka kukosa!",
      bodyEn: "50pick: Hello {jina}! Big things are coming soon, and what's hidden will be revealed. Stay tuned, you won't want to miss it!",
      nameFallbackSw: "Rafiki",
      nameFallbackEn: "Friend",
    };
    if (json(msg) !== json(OWNER)) wrong.push("DRIVE_MESSAGE is not exactly the owner's words");
    const names = lib.DRIVE_CAMPAIGN_NAMES as unknown as Record<string, string>;
    if (json(names) !== json({ A: "U52a drive A", B: "U52a drive B", C: "U52a drive C", D: "U52a drive D" })) wrong.push(`the campaign names are ${json(names)}`);
    // the composer's own verdict, as the save and the renderer run it
    const fields = { name: names.A ?? "", bodySw: msg.bodySw, bodyEn: msg.bodyEn, nameFallbackSw: msg.nameFallbackSw, nameFallbackEn: msg.nameFallbackEn };
    const verdict = TPL.validateCampaignTemplate(fields as never, "");
    if (!verdict.ok || Object.keys(verdict.problems).length > 0) wrong.push(`the composer refuses the drive's draft: ${json(verdict.problems).slice(0, 160)}`);
    const tpl = { ...fields, sourcePhrase: "" };
    const render = (variant: "SW" | "EN", name: string | null, origin: "book" | "account") => TPL.renderForRecipient(tpl as never, { variant, name, token: "ABCD2345", origin } as never);
    const windows = lib.driveLengthWindows(lib.DRIVE_MESSAGE) as unknown as Record<"SW" | "EN", { min: number; max: number; fallback: number }>;
    for (const [v, body, word] of [["SW", msg.bodySw, msg.nameFallbackSw], ["EN", msg.bodyEn, msg.nameFallbackEn]] as const) {
      // plain ASCII, printable: no curly quote, no dash, no emoji — every character one GSM-7 septet
      if (![...body].every((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126)) wrong.push(`${v}: a character outside plain ASCII`);
      if (!body.startsWith("50pick")) wrong.push(`${v}: does not begin with 50pick`);
      if (body.split(TPL.JINA).length !== 2) wrong.push(`${v}: {jina} is not there exactly once`);
      const counter = TPL.counterFor(body, v, word, "");
      if (counter.encoding !== "GSM7" || counter.segments !== 1 || counter.left < 0 || counter.problems.length > 0) wrong.push(`${v}: the counter reads ${json({ e: counter.encoding, s: counter.segments, left: counter.left, p: counter.problems })}`);
      const book = render(v, null, "book");
      if (!book.ok || book.text !== body.split(TPL.JINA).join(word)) wrong.push(`${v}: a contact-book number is not sent exactly the body with "${word}" for {jina}`);
      const own = render(v, "Asha", "account");
      if (!own.ok || own.text !== body.split(TPL.JINA).join("Asha")) wrong.push(`${v}: an account is not sent the body with its own first name`);
      const longest = render(v, "W".repeat(TPL.JINA_MAX_CHARS), "account");
      const shortest = render(v, "A", "account");
      const sized = SMS.sizeSms(longest.text);
      if (!longest.ok || sized.segments !== 1 || sized.encoding !== "GSM7") wrong.push(`${v}: the longest name makes it more than one GSM-7 SMS`);
      const wv = windows[v];
      if (!wv || !(wv.min === shortest.text.length && wv.max === longest.text.length && wv.fallback === book.text.length)) wrong.push(`${v}: the window ${json(wv)} is not the renderer's ${shortest.text.length} to ${longest.text.length} (the word: ${book.text.length})`);
      else if (!(wv.max - wv.min < 49)) wrong.push(`${v}: the window could hold the old footer's 49 characters`);
    }
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── E10 · SENT AS WRITTEN ── */
  await claim(L.e10, async () => {
    const wrong: string[] = [];
    const base = [`--test=${W.TEST.raw}`, "--expect=delivered:test"];
    const SW = W.DRIVE_LENGTH.SW;
    const EN = W.DRIVE_LENGTH.EN;
    const clean = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, base));
    if (clean.code !== 0 || !has(clean.lines, "SENT AS WRITTEN       clear") || !has(clean.lines, `Swahili ${SW.min} to ${SW.max} characters, English ${EN.min} to ${EN.max}`)) wrong.push(`a clean campaign: exit ${clean.code}`);
    // a world whose test row's message (and, if asked, its composer test) is `len` long
    const sized = (len: number, o: { locale?: string; test?: number } = {}): ReturnType<typeof W.evA> => {
      const w = W.evA();
      w.recipients[0] = { ...w.recipients[0], ...(o.locale ? { locale: o.locale } : {}) };
      w.messages[0] = { ...w.messages[0], body_len: len };
      if (o.test !== undefined) w.testMessages[0] = { ...w.testMessages[0], body_len: o.test };
      return w;
    };
    const verdictOn = async (name: string, w: ReturnType<typeof W.evA>, wantClear: boolean, saying?: string) => {
      const r = await ev(impl, w, W.evArgv(W.CAMPAIGN, base));
      const clear = r.code === 0 && has(r.lines, "SENT AS WRITTEN       clear") && !has(r.lines, "VIOLATION — ");
      const flagged = r.code === 1 && has(r.lines, "RESULT: NOT PROVEN") && has(r.lines, saying ?? "is not as long as the drive's message with its name filled in");
      if (wantClear ? !clear : !flagged) wrong.push(`${name}: exit ${r.code}${wantClear ? " (wanted clear)" : " (wanted a VIOLATION)"}`);
      return r;
    };
    // at both edges of the Swahili window, and at the contact-book length: clear
    await verdictOn("the shortest Swahili message (a one-letter name)", sized(SW.min), true);
    await verdictOn("the longest Swahili message (a twelve-letter name)", sized(SW.max), true);
    await verdictOn("a contact-book number's Swahili message", sized(SW.fallback), true);
    // ⭐ THE OLD FOOTER APPENDED AGAIN — 49 characters more — and one character past or short of the window: a violation by itself
    const footer = await verdictOn("the Swahili message with the old footer's 49 characters after it", sized(SW.fallback + 49), false, "VIOLATION — 1 campaign message is not as long as the drive's message with its name filled in");
    if (!has(footer.lines, "something was added to it, or other words were sent")) wrong.push("the footer's violation does not say what it means");
    await verdictOn("one character past the Swahili window", sized(SW.max + 1), false);
    await verdictOn("one character short of the Swahili window", sized(SW.min - 1), false);
    // a composer test 49 longer is a violation of its own
    await verdictOn("a composer test with the old footer after it", sized(SW.fallback, { test: SW.fallback + 49 }), false, "VIOLATION — 1 composer test message is not as long");
    // ⭐ the row's own language decides the window: an English row at the English contact-book length is clear; a SWAHILI row at the longest English length is not
    await verdictOn("an English row's English message", sized(EN.fallback, { locale: "EN" }), true);
    if (EN.max > SW.max) await verdictOn("a Swahili row's message of the longest English length", sized(EN.max), false);
    else wrong.push("the English window does not reach past the Swahili one - the language check cannot be seen");
    // a LOOK exits 1 on it, with --test and without (the check needs no number)
    const footered = sized(SW.fallback + 49);
    const lookTest = await ev(impl, footered, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--look"]));
    if (lookTest.code !== 1 || !has(lookTest.lines, "BUT 1 VIOLATION") || !has(lookTest.lines, "a message not sent as written")) wrong.push(`a look with --test at a footered message: exit ${lookTest.code}`);
    const lookBare = await ev(impl, footered, W.evArgv(W.CAMPAIGN, ["--look"]));
    if (lookBare.code !== 1 || !has(lookBare.lines, "BUT 1 VIOLATION")) wrong.push(`a look without --test at a footered message: exit ${lookBare.code}`);
    // the rule itself: a length that is not a whole number is never a drive length
    const isLen = impl.lib.isDriveLength as typeof LIB.isDriveLength;
    if (isLen(null as never) || isLen(String(SW.fallback) as never) || isLen(SW.fallback + 0.5) || !isLen(SW.fallback) || !isLen(EN.fallback, "EN") || isLen(EN.max, "SW")) wrong.push("isDriveLength answers wrongly for null, text, a fraction, or a language");
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── E4 · what counts as a chargeable send ── */
  await claim(L.e4, async () => {
    const wrong: string[] = [];
    const table: Array<[string, boolean, boolean]> = [
      ["QUEUED", false, true], ["ACCEPTED", false, true], ["DELIVERED", true, true], ["UNKNOWN", false, true],
      ["FAILED", false, false], ["FAILED", true, true], ["SOMETHING_NEW", false, true],
    ];
    for (const [status, receipt, want] of table) if ((impl.lib.isChargeable as typeof LIB.isChargeable)(status, receipt) !== want) wrong.push(`${status}/${receipt}`);
    const total = (impl.lib.countChargeable as typeof LIB.countChargeable)([{ status: "ACCEPTED", has_receipt: false, n: 2 }, { status: "FAILED", has_receipt: false, n: 3 }, { status: "FAILED", has_receipt: true, n: 1 }, { status: "UNKNOWN", has_receipt: false, n: 1 }, { status: "QUEUED", has_receipt: false, n: 1 }]);
    if (total !== 5) wrong.push(`countChargeable is ${total}, not 5`);
    // through a run: a campaign with a FAILED-no-receipt message, an UNKNOWN and a QUEUED one, and a composer test that failed
    const w = W.evA();
    w.recipients.push(W.recipientRow({ key: W.OTHER_KEY, id: "rcp_other_1", status: "UNCONFIRMED", sms_reference: "sms_ffffffffffff00000000dddd", sent_at: null, delivered_at: null }));
    w.messages.push(
      W.messageRow({ reference: "sms_ffffffffffff00000000dddd", target_id: "rcp_other_1", status: "UNKNOWN", dlr_status: null }),
      W.messageRow({ reference: "sms_ffffffffffff00000000eeee", target_id: "rcp_other_1", status: "FAILED", dlr_status: null }),
      W.messageRow({ reference: "sms_ffffffffffff00000000ffff", target_id: "rcp_other_1", status: "QUEUED", dlr_status: null }),
    );
    w.testMessages.push(W.messageRow({ reference: "sms_ffffffffffff00000000aaaa", target_id: W.CAMPAIGN, status: "FAILED", dlr_status: null }));
    const r = await ev(impl, w, W.evArgv(W.CAMPAIGN, ["--look"]));
    if (!has(r.lines, "chargeable sends · 4 (1 composer test + 3 campaign)")) wrong.push(`the run counted: ${r.lines.find((l) => l.startsWith("chargeable")) ?? "nothing"}`);
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── E5 · slice timings ── */
  await claim(L.e5, async () => {
    const wrong: string[] = [];
    const w = W.evA();
    w.testMessages = [];
    w.recipients = [
      W.recipientRow({ key: W.TEST.key, id: "rcp_s1", claim_token: "clm_secret_token_one", claimed_at: d(W.T0 + 2000), sent_at: d(W.T0 + 4500) }),
      W.recipientRow({ key: W.OTHER_KEY, id: "rcp_s2", claim_token: "clm_secret_token_one", claimed_at: d(W.T0 + 2000), sent_at: d(W.T0 + 4500) }),
      W.recipientRow({ key: "255688000444", id: "rcp_s3", status: "SKIPPED", skip_reason: "no_consent", claim_token: "clm_secret_token_two", claimed_at: d(W.T0 + 9000), sent_at: null, delivered_at: null }),
    ];
    const r = await ev(impl, w, W.evArgv(W.CAMPAIGN, ["--look"]));
    if (!has(r.lines, "RECORDS NO gate or send milliseconds")) wrong.push("the statement is missing");
    if (!has(r.lines, "slice 1: 2 people") || !has(r.lines, "2.5 s from claim to hand-over")) wrong.push("slice 1 is wrong");
    if (!has(r.lines, "slice 2: 1 person (1 refused)") || !has(r.lines, "nothing handed over") || !has(r.lines, "7.0 s after the previous claim")) wrong.push("slice 2 is wrong");
    if (r.lines.some((l) => l.includes("clm_secret_token"))) wrong.push("a claim token was printed");
    const slices = EV.sliceTimings(w.recipients as never);
    if (!(slices.length === 2 && slices[0].claimToHandOverMs === 2500 && slices[1].gapSincePreviousMs === 7000 && slices[1].handedOverAt === null)) wrong.push(`sliceTimings: ${json(slices)}`);
    const none = W.evA();
    none.recipients = [W.recipientRow({ key: W.TEST.key, id: "rcp_n1", status: "PENDING", claim_token: null, claimed_at: null, sent_at: null, delivered_at: null })];
    const rn = await ev(impl, none, W.evArgv(W.CAMPAIGN, ["--look"]));
    if (!has(rn.lines, "nothing has been sliced")) wrong.push("an unclaimed campaign should say nothing was sliced");
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── E6 · the stop link ── */
  await claim(L.e6, async () => {
    const wrong: string[] = [];
    const base = [`--test=${W.TEST.raw}`, "--expect=delivered:test"];
    const without = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, base));
    if (without.lines.some((l) => l.includes("ABCD2345") || l.includes("/s/"))) wrong.push("the token or /s/ is printed without the flag");
    if (without.statements.some((s) => s.includes("u52a:token"))) wrong.push("the token is selected without the flag");
    if (without.statements.some((s) => new RegExp('"optOutToken"(?! IS NOT NULL)').test(s))) wrong.push("the token column is read without the flag");
    const withFlag = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [...base, "--show-stop-link"]));
    const linkLines = withFlag.lines.filter((l) => l.includes("/s/"));
    if (linkLines.length !== 1 || !linkLines[0].includes("/s/ABCD2345")) wrong.push(`with the flag: ${linkLines.length} link lines`);
    if (!has(withFlag.lines, "live bearer link")) wrong.push("no warning with the link");
    const none = W.evB();
    none.token = null;
    const rn = await ev(impl, none, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect=skipped:test", "--show-stop-link"]));
    if (!has(rn.lines, "none — the test number has no row with a link")) wrong.push("a missing token is not said");
    // the control's token is never asked for: only one token statement, and it names the test number
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── E3 · numbers, names and secrets in the evidence ── */
  await claim(L.e3, async () => {
    const wrong: string[] = [];
    const w = W.evA();
    w.recipients[0] = { ...w.recipients[0], skip_detail: `refused 0755 000 111 and +255688000333`, error: `gateway said 255755000111`, failure_class: "code-0755000111", skip_reason: "x-255622000222" };
    w.messages[0] = { ...w.messages[0], provider_msg: "sent to 0622 000 222 ok", dlr_desc: "delivered to +255 755 000 111" };
    w.audit.push({ seq: "104", created_at: d(W.T0), category: "ADMIN", action: "marketing.campaign_note", actor_id: "usr_0755000111", payload: { reason: "call 0755000111", note: "Jay Kaba asked", to: "+255••••11", nested: { who: "255622000222" }, count: 3 } });
    (w.campaign as Record<string, unknown>).created_by = "usr_255755000111";
    (w.campaign as Record<string, unknown>).stop_reason = "paused for 0755000111";
    const r = await ev(impl, w, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, `--control=${W.CONTROL.raw}`, "--look"]));
    const leaks = leaksIn(r.lines);
    if (leaks.length) wrong.push(`${leaks.length} leaked number(s): ${leaks.slice(0, 3).join(", ")}`);
    if (r.lines.some((l) => l.includes("Jay Kaba"))) wrong.push("a name was printed");
    if (!r.lines.some((l) => l.includes("#104") && l.includes("count=3") && l.includes("note=«text»"))) wrong.push("the audit line is not the allow-listed summary");
    if (!has(r.lines, W.TEST.masked)) wrong.push("the test mask is missing");
    // the control's mask also appears when the control has a row
    const c = W.evA();
    c.recipients.push(W.recipientRow({ key: W.CONTROL.key, id: "rcp_control_a", status: "SKIPPED", skip_reason: "suppressed", sms_reference: null, sent_at: null, delivered_at: null, has_token: false }));
    c.people.control = { suppressions: [{ reason: "OPERATOR", via_link: false, created_at: d(W.T0 - 1000), lifted_at: null, lifted_via_link: false }], ledger: [] };
    const rc = await ev(impl, c, W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, `--control=${W.CONTROL.raw}`, "--look"]));
    if (!has(rc.lines, W.CONTROL.masked) || leaksIn(rc.lines).length) wrong.push("the control's mask is missing or a number leaked");
    // the two text filters, alone
    const textOf = impl.lib.safeText as typeof LIB.safeText;
    const labelOf = impl.lib.safeLabel as typeof LIB.safeLabel;
    if (leakOf(textOf("see 0755000111 now")) !== null || leakOf(textOf("x 255622000222 y")) !== null) wrong.push("safeText lets a number through");
    if (textOf("<script>?</script> é") !== "«text»") wrong.push("safeText shows text outside its plain alphabet");
    if (leakOf(labelOf("Jay 0755 000 111")) !== null) wrong.push("safeLabel lets a number through");
    if (labelOf("a <b> label") !== "«name hidden»" || labelOf("") !== "«unnamed»") wrong.push("safeLabel's hidden forms");
    // the output filter alone, on awkward spellings
    const scrub = impl.lib.scrubNumbers as typeof LIB.scrubNumbers;
    const samples = ["call +255 755 000 111 now", "(0755) 000 111", "0755-000-111", "755000111", "255755000111", "0755 000 111 and 0622 000 222", "tel:+255755000111;", "x255755000111y", "00255755000111"];
    for (const s of samples) if (leakOf(scrub(s)) !== null) wrong.push(`scrub left "${s}" as "${scrub(s)}"`);
    const keeps = ["sms_aabbccddeeff001122334455", "2026-10-09 10:31:07", "TZS 49,994.00", "20261008120000_sms_recipient_outcome_index", "+255••••11", "cmp_u52a_campaign_AAAA"];
    for (const s of keeps) if (scrub(s) !== s) wrong.push(`scrub damaged "${s}" into "${scrub(s)}"`);
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── E7 · the audit allow-list and the forbidden columns ── */
  await claim(L.e7, async () => {
    const wrong: string[] = [];
    const payload = impl.lib.safePayload as typeof LIB.safePayload;
    const shown = payload({ reason: "officer_paused", count: 3, ok: true, none: null, who: "Jay Kaba", to: "+255••••11", nested: { a: 1, b: "free text here" }, list: [1, 2, 3], when: new Date("2026-10-09T07:00:00Z"), "bad key!": 1 });
    if (!(shown.includes("reason=officer_paused") && shown.includes("count=3") && shown.includes("ok=true") && shown.includes("none=null") && shown.includes("who=«text»") && shown.includes("list=[3]") && shown.includes("when=2026-10-09T07:00:00.000Z") && shown.includes("«key»"))) wrong.push(`safePayload: ${shown}`);
    if (shown.includes("Jay") || shown.includes("free text")) wrong.push("safePayload printed free text");
    // every statement the two tools ran, for the columns that must never be read
    const forbidden = ["ip", "userAgent", "email", "displayName", "rawInput", "notes", "bodySw", "bodyEn", "nameFallbackSw", "nameFallbackEn", "sourcePhrase", PW_COLUMN, "entryHash", "prevHash", "hash", "tags", "wording"];
    for (const [tag, text] of STATEMENTS) {
      for (const col of forbidden) {
        if (text.includes(`"${col}"`) && !(col === "wording" && tag === "ledger")) wrong.push(`${tag} reads "${col}"`);
      }
      if (tag !== "lists" && tag.length && text.includes('"name"')) wrong.push(`${tag} reads "name"`);
    }
    if (![...STATEMENTS].some(([t]) => t === "audit")) wrong.push("the audit statement never ran");
    // the evidence's own audit statement names exactly the allowed columns
    const audit = STATEMENTS.get("audit") ?? "";
    if (!(audit.includes('"seq"') && audit.includes('"actorId"') && audit.includes('"payload"')) || audit.includes('"ip"')) wrong.push("the audit statement is not the allow-listed one");
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── L1 · the ledger ── */
  await claim(L.l1, async () => {
    const wrong: string[] = [];
    const lib = impl.lib as typeof LIB;
    // the pure rules
    let ledger = lib.emptyLedger();
    const take = (id: string, n: number) => {
      const r = lib.recordLedger(ledger, id, { chargeable: n });
      if (r.ok) ledger = r.ledger;
      return r;
    };
    if (!take("cmp_ledger_aaaa", 2).ok || !take("cmp_ledger_bbbb", 0).ok || !take("cmp_ledger_cccc", 4).ok) wrong.push("six sends were not accepted");
    if (lib.ledgerTotal(ledger) !== 6) wrong.push(`total ${lib.ledgerTotal(ledger)}`);
    const seventh = take("cmp_ledger_dddd", 1);
    if (seventh.ok || seventh.reason !== "over_cap" || lib.ledgerTotal(ledger) !== 6 || ledger.entries.cmp_ledger_dddd) wrong.push("a seventh send was counted");
    const same = take("cmp_ledger_aaaa", 2);
    if (!same.ok || lib.ledgerTotal(ledger) !== 6) wrong.push("re-recording a campaign counted it twice");
    const lower = take("cmp_ledger_cccc", 1);
    if (!lower.ok || ledger.entries.cmp_ledger_cccc.chargeable !== 4) wrong.push("a lower later count shrank the entry");
    const raise = take("cmp_ledger_aaaa", 3);
    if (raise.ok) wrong.push("raising an entry past the cap was accepted");
    if (lib.checkRoom(ledger, 1).ok || !lib.checkRoom(ledger, 0).ok) wrong.push("checkRoom disagrees with the total");
    // the parser fails closed
    for (const [name, text] of [["not json", "{"], ["an array", "[]"], ["another version", json({ v: 2, cap: 6, entries: {} })], ["another cap", json({ v: 1, cap: 7, entries: {} })], ["no entries", json({ v: 1, cap: 6 })], ["a negative entry", json({ v: 1, cap: 6, entries: { cmp_ledger_aaaa: { chargeable: -1 } } })], ["a bad id", json({ v: 1, cap: 6, entries: { x: { chargeable: 1 } } })]] as const) {
      if (lib.parseLedger(text).ok) wrong.push(`the parser accepted ${name}`);
    }
    if (!lib.parseLedger(null).ok) wrong.push("an absent file is an empty ledger");
    // through the evidence: a seventh is refused, exit 1, the file untouched
    const seeded = lib.emptyLedger();
    seeded.entries.cmp_prior_aaaaa = { chargeable: 3 };
    seeded.entries.cmp_prior_bbbbb = { chargeable: 2 };
    const seededText = lib.serializeLedger(seeded);
    const over = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, A_ARGS), { ledgerText: seededText });
    if (over.code !== 1 || !has(over.lines, "LEDGER REFUSES") || !has(over.lines, "7 chargeable sends") || over.ledgerText !== seededText || !has(over.lines, "RESULT: NOT PROVEN")) wrong.push(`a seventh through the evidence: exit ${over.code}, file changed ${over.ledgerText !== seededText}`);
    // a re-run is idempotent
    const first = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, A_ARGS));
    const second = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, A_ARGS), { ledgerText: first.ledgerText });
    const total2 = (t: string | null) => { const p = LIB.parseLedger(t); return p.ok ? LIB.ledgerTotal(p.ledger) : -1; };
    if (total2(first.ledgerText) !== 2 || total2(second.ledgerText) !== 2) wrong.push(`a re-run counted ${total2(second.ledgerText)}`);
    // a look is counted too (the sends happened either way) — and it leaves a proof's label, outcomes and verdict as they were
    const lookRun = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, ["--look"]));
    if (total2(lookRun.ledgerText) !== 2) wrong.push("a look did not count the sends");
    const afterProof = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, ["--look"]), { ledgerText: first.ledgerText });
    const kept = LIB.parseLedger(afterProof.ledgerText);
    const keptEntry = kept.ok ? kept.ledger.entries[W.CAMPAIGN] : null;
    if (!(keptEntry && keptEntry.verdict === "pass" && keptEntry.label === "A")) wrong.push(`a look after a proof overwrote its verdict: ${keptEntry ? `${keptEntry.verdict}/${keptEntry.label}` : "no entry"}`);
    // a failing verdict is counted too
    const failRun = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--expect-sends=0"]));
    if (failRun.code !== 1 || total2(failRun.ledgerText) !== 2) wrong.push("a failing verdict did not count the sends");
    // an untrustworthy file stops the run, and is not reset
    for (const bad of ["{", json({ v: 1, cap: 99, entries: {} })]) {
      const r = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, A_ARGS), { ledgerText: bad });
      if (r.code !== 2 || r.statements.length !== 0 || r.ledgerText !== bad) wrong.push(`an untrustworthy ledger: exit ${r.code}`);
    }
    // the file io, through a STAND-IN file system (this suite writes no file): atomic - a temporary file, then a rename over the ledger - at the
    // gitignored path; a file the file system holds for a moment (EPERM, EBUSY - Windows, an antivirus scan) is waited for, a few tries; anything else fails at once
    const ioWith = (renames: Array<string | null>) => {
      const log: string[] = [];
      const sleeps: number[] = [];
      let renameCalls = 0;
      const fs = {
        mkdir: (p: string) => { log.push(`mkdir ${p}`); },
        writeFile: (p: string, t: string) => { log.push(`write ${p} ${t}`); },
        rename: (a: string, b: string) => { const code = renames[Math.min(renameCalls, renames.length - 1)]; renameCalls++; log.push(`rename ${a} ${b}`); if (code) throw Object.assign(new Error(code), { code }); },
        sleep: (ms: number) => { sleeps.push(ms); },
      };
      const made = (lib.fileLedgerIo as unknown as (p: string, o: unknown) => { write: (t: string) => void })("F:/stand-in/ledger.json", fs);
      let thrown: string | null = null;
      try { made.write("TEXT"); } catch (err) { thrown = String((err as { code?: string }).code ?? err); }
      return { log, sleeps, renameCalls, thrown };
    };
    const plain = ioWith([null]);
    if (json(plain.log) !== json(["mkdir F:/stand-in", "write F:/stand-in/ledger.json.tmp TEXT", "rename F:/stand-in/ledger.json.tmp F:/stand-in/ledger.json"]) || plain.sleeps.length !== 0 || plain.thrown !== null) wrong.push(`the ledger write is not mkdir, a temporary file, a rename: ${json(plain.log)}`);
    const held = ioWith(["EPERM", "EBUSY", null]);
    if (held.thrown !== null || held.renameCalls !== 3 || json(held.sleeps) !== json([50, 100])) wrong.push(`a file held twice (EPERM, EBUSY): ${held.renameCalls} renames, waits ${json(held.sleeps)}, threw ${held.thrown}`);
    const stuck = ioWith(["EBUSY"]);
    if (stuck.thrown !== "EBUSY" || stuck.renameCalls !== 6 || json(stuck.sleeps) !== json([50, 100, 200, 400, 800])) wrong.push(`a file held for good: ${stuck.renameCalls} renames, waits ${json(stuck.sleeps)}, threw ${stuck.thrown}`);
    const other = ioWith(["ENOENT"]);
    if (other.thrown !== "ENOENT" || other.renameCalls !== 1 || other.sleeps.length !== 0) wrong.push(`another failure (ENOENT) is retried: ${other.renameCalls} renames, waits ${json(other.sleeps)}`);
    if (!LIB.defaultLedgerPath().split(String.fromCharCode(92)).join("/").endsWith("/.qa-shots/marketing-setup/U52a/ledger.json")) wrong.push("the default ledger path");
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── L2 · the pre-send check ── */
  await claim(L.l2, async () => {
    const wrong: string[] = [];
    const lib = impl.lib as typeof LIB;
    const l = lib.emptyLedger();
    l.entries.cmp_prior_aaaaa = { chargeable: 4, label: "A", outcomes: { test: "DELIVERED", control: null }, verdict: "pass", recordedAt: new Date(W.NOW).toISOString() };
    const text = lib.serializeLedger(l);
    const ok2 = await ev(impl, W.evA(), ["--ledger", "--sends=2"], { ledgerText: text, env: {} });
    if (ok2.code !== 0 || !has(ok2.lines, "counted 4 · room 2") || !has(ok2.lines, "2 more FIT") || ok2.statements.length !== 0) wrong.push(`two fit: exit ${ok2.code}`);
    const no = await ev(impl, W.evA(), ["--ledger", "--sends=3"], { ledgerText: text, env: {} });
    if (no.code !== 1 || !has(no.lines, "REFUSED")) wrong.push(`three do not fit: exit ${no.code}`);
    const bare = await ev(impl, W.evA(), ["--ledger", "--new-ledger"], { ledgerText: null, env: {} });
    if (bare.code !== 0 || !has(bare.lines, "nothing counted yet")) wrong.push(`a new ledger's table: exit ${bare.code}`);
    const bareNoFlag = await ev(impl, W.evA(), ["--ledger"], { ledgerText: null, env: {} });
    if (bareNoFlag.code !== 2 || !has(bareNoFlag.lines, "no ledger file")) wrong.push(`the table of a missing ledger, no flag: exit ${bareNoFlag.code}`);
    const mixed = await ev(impl, W.evA(), ["--ledger", `--test=${W.TEST.raw}`], { env: {} });
    if (mixed.code !== 2) wrong.push(`--ledger with --test: exit ${mixed.code}`);
    const pf = await pre(impl, W.goodPreWorld(), { ledgerText: text, argv: W.preArgv(["--sends=3"]) });
    if (json(noGo(pf.lines)) !== json(["ledger"]) || pf.code !== 1) wrong.push(`the pre-flight with --sends=3: ${json(noGo(pf.lines))}`);
    const pf1 = await pre(impl, W.goodPreWorld(), { ledgerText: text });
    if (noGo(pf1.lines).length !== 0) wrong.push("the pre-flight's default of one send should fit");
    // ⭐ the pre-flight only READS the ledger: not one write in any run of the whole suite so far (a new ledger included)
    await pre(impl, W.goodPreWorld(), { ledgerText: null, argv: W.preArgv(["--new-ledger"]) });
    if (PRE_LEDGER_WRITES !== 0) wrong.push(`the pre-flight wrote the ledger ${PRE_LEDGER_WRITES} time(s)`);
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── L3 · the ledger file is created only on purpose, and said every run ── */
  await claim(L.l3, async () => {
    const wrong: string[] = [];
    const lib = impl.lib as typeof LIB;
    const argv = [`--test=${W.TEST.raw}`, "--expect=delivered:test", "--expect-sends=2", "--label=A"];
    // a missing file stops the evidence: nothing read, nothing written, exit 2, and the run says where it looked
    const missing = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, argv), { ledgerText: null });
    if (missing.code !== 2 || missing.statements.length !== 0 || missing.ledgerText !== null || !has(missing.lines, "no ledger file") || !has(missing.lines, "--new-ledger")) wrong.push(`a missing ledger: exit ${missing.code}, ${missing.statements.length} statements, written ${missing.ledgerText !== null}`);
    if (!missing.lines.some((l) => l.startsWith("ledger file: ") && l.includes("not present"))) wrong.push("a missing ledger is not said to be missing, with its path");
    // --new-ledger: the first run writes the file, with the count
    const created = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [...argv, "--new-ledger"]), { ledgerText: null });
    const parsed = lib.parseLedger(created.ledgerText);
    if (created.code !== 0 || !(parsed.ok && lib.ledgerTotal(parsed.ledger) === 2)) wrong.push(`--new-ledger on a missing file: exit ${created.code}`);
    // ⭐ A LEDGER THAT COULD NOT BE WRITTEN STOPS THE DRIVE: the count is not on the disk, so the next cap check would be wrong - exit 1 on a verdict AND on
    // a look, and the line says to run the SAME evidence again (a re-run counts nothing twice) - never "write it down by hand"
    const unwritable = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, argv), { ledgerWriteThrows: true });
    const unwritableSays = unwritable.lines.find((l) => l.startsWith("LEDGER NOT WRITTEN")) ?? "";
    if (unwritable.code !== 1 || !unwritableSays.includes("NOT recorded") || !unwritableSays.includes("same evidence command again") || !unwritableSays.includes("counts nothing twice") || unwritableSays.includes("by hand") || !has(unwritable.lines, "RESULT: NOT PROVEN") || !has(unwritable.lines, "the ledger refused")) wrong.push(`a ledger write that throws: exit ${unwritable.code}, says "${unwritableSays.slice(0, 100)}"`);
    const unwritableLook = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--look"]), { ledgerWriteThrows: true });
    if (unwritableLook.code !== 1 || !has(unwritableLook.lines, "LEDGER NOT WRITTEN") || !has(unwritableLook.lines, "the ledger problem above still stops the drive")) wrong.push(`a look whose ledger write throws: exit ${unwritableLook.code}`);
    const lookWithViolation = await ev(impl, (() => { const w = W.evA(); w.elsewhere = 2; return w; })(), W.evArgv(W.CAMPAIGN, [`--test=${W.TEST.raw}`, "--look"]), { ledgerWriteThrows: true });
    if (lookWithViolation.code !== 1 || !has(lookWithViolation.lines, "the ledger problem above stops it too")) wrong.push(`a look with a violation AND a ledger that cannot be written: exit ${lookWithViolation.code}`);
    // ... and over a ledger that already exists it is refused: nothing read, nothing written
    const again = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, [...argv, "--new-ledger"]), { ledgerText: created.ledgerText });
    if (again.code !== 2 || again.statements.length !== 0 || again.ledgerText !== created.ledgerText || !has(again.lines, "already exists")) wrong.push(`--new-ledger over an existing ledger: exit ${again.code}`);
    // every run says where the ledger is (ABSOLUTE) and when it was last written
    const normal = await ev(impl, W.evA(), W.evArgv(W.CAMPAIGN, argv));
    const line = normal.lines.find((l) => l.startsWith("ledger file: ")) ?? "";
    if (!(line.includes("ledger.json") && line.includes("last written 2026-10-09 09:30:00 EAT"))) wrong.push(`an ordinary run's ledger line is "${line.slice(0, 120)}"`);
    const pf = await pre(impl, W.goodPreWorld());
    if (!pf.lines.some((l) => l.startsWith("ledger file: ") && l.includes("last written"))) wrong.push("the pre-flight does not say where its ledger is");
    const real = lib.fileLedgerIo();
    const at = real.where();
    if (!(isAbsolute(String(at.path)) && String(at.path).split(String.fromCharCode(92)).join("/").endsWith("/.qa-shots/marketing-setup/U52a/ledger.json"))) wrong.push("the real ledger io does not name an absolute path");
    // no string reaches the file without the number wall: an entry that carries a number is scrubbed on its way to the disk
    const dirty = lib.emptyLedger();
    dirty.entries.cmp_scrub_check_01 = { chargeable: 1, label: `call ${W.TEST.raw}`, outcomes: { test: `row ${W.TEST.key}`, control: null }, verdict: "pass" };
    const written = lib.serializeLedger(dirty);
    if (leakOf(written) !== null || !written.includes("[number]")) wrong.push("a number reached the ledger file");
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── B1 · before anything is loaded ── */
  await claim(L.b1, async () => {
    const wrong: string[] = [];
    const boot = impl.boot as typeof BOOT;
    const preTool = pathToFileURL(join(ROOT, "scripts", "live", "marketing-preflight.mjs")).href;
    // the public proxy: only the PRIVATE host changes; the user, the password and the database stay, and another host is left alone
    const fakePw = "fakepassword-0000";
    const env: Record<string, string> = { DATABASE_URL: `postgresql://fake_user:${fakePw}@postgres.railway.internal:5432/railway` };
    boot.boot(preTool, env, ROOT);
    const u = new URL(env.DATABASE_URL);
    // ⭐ the port is the PROXY'S (40357), not the private host's 5432: the rest of the address is kept
    if (!(u.hostname === "turntable.proxy.rlwy.net" && u.port === "40357" && u.username === "fake_user" && u.password === fakePw && u.pathname === "/railway")) wrong.push("the private host was not rewritten to the public proxy (host and port 40357), or the rest of the address changed");
    // ... in any letter case, with or without a trailing dot, a port or a query - and only the WHOLE host
    for (const [host, tail] of [["POSTGRES.RAILWAY.INTERNAL:5432", "/railway"], ["postgres.railway.internal.:5432", "/railway"], ["Postgres.Railway.Internal", "/railway?sslmode=disable"], ["postgres.railway.internal", "/railway"]] as Array<[string, string]>) {
      const e: Record<string, string> = { DATABASE_URL: `postgresql://fake_user:${fakePw}@${host}${tail}` };
      boot.boot(preTool, e, ROOT);
      const x = new URL(e.DATABASE_URL);
      if (!(x.hostname === "turntable.proxy.rlwy.net" && x.port === "40357" && x.username === "fake_user" && x.password === fakePw && x.pathname === "/railway")) wrong.push(`the private host in another spelling (${host.length} chars) was not rewritten`);
    }
    for (const same of [`postgresql://fake_user:${fakePw}@db.example.test:5432/x`, `postgresql://fake_user:${fakePw}@postgres.railway.internal.evil.example:5432/x`, `postgresql://fake_user:${fakePw}@xpostgres.railway.internal:5432/x`, `postgresql://fake_user:${fakePw}@turntable.proxy.rlwy.net:40357/x`]) {
      const o: Record<string, string> = { DATABASE_URL: same };
      boot.boot(preTool, o, ROOT);
      if (o.DATABASE_URL !== same) wrong.push("another host was rewritten");
    }
    // the checkout: right here is fine; elsewhere, or with no tsconfig.json, is a sentence - and the sentence is true
    if (boot.checkoutProblem(ROOT, preTool) !== null) wrong.push("the checkout itself was refused");
    // (a sibling of the checkout that does not exist: it is outside the checkout wherever this suite is run, even inside the temporary directory)
    const elsewhereSays = boot.checkoutProblem(join(dirname(ROOT), "a-folder-that-is-not-the-checkout"), preTool);
    if (elsewhereSays === null) wrong.push("a directory outside the checkout was accepted");
    else if (elsewhereSays.includes("does that for you") || !elsewhereSays.includes(ROOT) || !elsewhereSays.includes("same command again")) wrong.push(`the sentence for another directory is "${elsewhereSays.slice(0, 120)}"`);
    if (boot.checkoutProblem(join(ROOT, "scripts"), preTool) === null) wrong.push("a folder of the checkout (no tsconfig.json) was accepted");
    if (boot.checkoutProblem(ROOT, preTool, () => false) === null) wrong.push("a checkout with no tsconfig.json was accepted");
    // both tools: isMain, then boot, then the core by a dynamic import after it, and no static import of the core, of the client or of the store
    for (const [name, src] of [["pre-flight", impl.sources.pre], ["evidence", impl.sources.ev]] as const) {
      const statics = Array.from(src.matchAll(new RegExp('^import [^;]*from "([^"]+)";', "gm"))).map((m) => m[1]);
      const allowed = ["../lib/marketing-u52a-boot.mjs"];
      const stray = statics.filter((s) => !allowed.includes(s));
      if (stray.length > 0) wrong.push(`${name} imports ${stray.join(", ")} statically`);
      const mainAt = src.indexOf("isMain(import.meta.url)");
      const bootAt = src.indexOf("boot(import.meta.url)");
      const coreAt = src.indexOf('await import("../lib/marketing-u52a.mjs")');
      const clientAt = src.indexOf('await import("@prisma/client")');
      if (!(mainAt > 0 && bootAt > mainAt && coreAt > bootAt && clientAt > coreAt)) wrong.push(`${name}: the order is isMain ${mainAt} · boot ${bootAt} · core ${coreAt} · client ${clientAt}`);
      if (src.split('await import("../lib/marketing-u52a.mjs")').length !== 2) wrong.push(`${name} loads the core more than once`);
      // ⭐ the program is recognised by REAL path (isMain), never by comparing the script's URL with the typed path
      if (src.includes("process.argv[1]") || src.includes("pathToFileURL")) wrong.push(`${name} compares the script's URL with the typed path itself (a junction makes it a silent no-op)`);
    }
    // ⭐ isMain compares REAL paths: the tool's own path is it, another tool is not, nothing and nonsense are not
    const isMainFn = boot.isMain as typeof BOOT.isMain;
    const preFile = join(ROOT, "scripts", "live", "marketing-preflight.mjs");
    const evFile = join(ROOT, "scripts", "live", "marketing-campaign-evidence.mjs");
    if (!isMainFn(preTool, preFile)) wrong.push("isMain: the tool's own path is not it");
    if (isMainFn(preTool, evFile)) wrong.push("isMain: another tool is the pre-flight");
    if (isMainFn(preTool, "") || isMainFn(preTool, null as never) || isMainFn(preTool, join(ROOT, "scripts", "live", "a-file-that-is-not-there.mjs"))) wrong.push("isMain: nothing, null or a missing file is it");
    // ⭐ THE CHECKER'S MAJOR 1 - the tool reached THROUGH A JUNCTION: isMain sees the real path, and a run with that junction as its working
    // directory is told ONE line - "run it from the checkout it belongs to" - and exits 2: never silence (exit 0, no output)
    try {
      withJunction((link) => {
        if (!isMainFn(preTool, join(link, "scripts", "live", "marketing-preflight.mjs"))) wrong.push("isMain: the tool reached through a junction is not itself");
        if (isMainFn(preTool, join(link, "scripts", "live", "marketing-campaign-evidence.mjs"))) wrong.push("isMain: another tool reached through a junction is the pre-flight");
        for (const [name, script, args] of [["pre-flight", "scripts/live/marketing-preflight.mjs", [`--test=+${W.TEST.key}`, `--origin=${W.ORIGIN}`]], ["evidence", "scripts/live/marketing-campaign-evidence.mjs", ["--ledger"]]] as const) {
          const r = spawnLinked(link, script, [...args]);
          const said = r.out.split(NL).filter((l) => l.trim() !== "");
          if (r.status !== 2 || said.length !== 1 || !said[0].startsWith("REFUSING: run it from the checkout it belongs to") || new RegExp("Error|    at ").test(r.out) || leakOf(r.out) !== null) wrong.push(`${name} run through a junction: exit ${r.status}, ${said.length} line(s) ("${(said[0] ?? "").slice(0, 60)}")`);
        }
      });
    } catch (err) {
      wrong.push(`a junction could not be made or removed in the temporary directory (${String((err as { code?: string }).code ?? err).slice(0, 40)})`);
    }
    // run from somewhere else, each tool says ONE friendly line and exits 2 — no stack from inside the module graph
    for (const [name, script, args] of [["pre-flight", "scripts/live/marketing-preflight.mjs", [`--test=+${W.TEST.key}`, `--origin=${W.ORIGIN}`]], ["evidence", "scripts/live/marketing-campaign-evidence.mjs", ["--ledger"]]] as const) {
      const r = spawnKey(`tsx ${script}`, [...args], tmpdir());
      const said = r.out.split(NL).filter((l) => l.trim() !== "");
      if (r.status !== 2 || said.length !== 1 || !said[0].startsWith("REFUSING:") || new RegExp("Error|    at ").test(r.out) || leakOf(r.out) !== null) wrong.push(`${name} run from another directory: exit ${r.status}, ${said.length} line(s)`);
    }
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── S1 · the sources' report discipline ── */
  await claim(L.s1, async () => {
    const wrong: string[] = [];
    const S = impl.sources;
    for (const [name, head] of [["pre-flight", S.header.pre], ["evidence", S.header.ev]] as const) {
      if (!(head.includes("Exit:") && head.includes("READ ONLY BY CONSTRUCTION") && head.includes("NO NUMBER IS PRINTED WHOLE"))) wrong.push(`${name}'s header does not state its exit codes, its read-only rule and its number rule`);
    }
    for (const [name, src] of [["pre-flight", S.pre], ["evidence", S.ev]] as const) {
      // the one console call allowed is the boot refusal's sentence (a fixed sentence about the working directory, said before the filter is even loaded)
      const around = src.split("sink: (line) => console.log(line)").join("").split("console.log(`REFUSING: ${booted.problem}`);").join("");
      if (new RegExp("console[.](log|error|warn)[(]").test(around)) wrong.push(`${name} prints through console directly, around the output filter`);
      if (new RegExp("JSON[.]stringify[(](facts|rows|r|recipient)").test(src)) wrong.push(`${name} stringifies a raw row`);
    }
    if (!S.lib.includes("makeIo(")) wrong.push("the core has no output filter");
    return [wrong.length === 0, `wrong [${wrong.join("; ")}]`];
  });

  /* ── P2 · no whole number in anything printed (last: it sweeps every run above) ── */
  await claim(L.p2, async () => {
    // extra runs with a number planted in every free-text field the pre-flight reads
    const w = W.contactPreWorld();
    w.lists[0].list_name = "Jay 0755 000 111 +255688000333";
    (w.contact as Record<string, unknown>).source = "0755000111";
    (w.contact as Record<string, unknown>).consent_state = "255755000111";
    w.holds = [{ campaign_id: "x255755000111y", status: "0622 000 222" }];
    w.control = { suppressions: [{ reason: "+255622000222", via_link: false, created_at: d(W.NOW - 86400_000), lifted_at: null }] };
    w.user = { role: "0755000111", status: "255622000222", opt_in: true, dob: d(Date.parse("1990-01-01T00:00:00Z")) };
    await pre(impl, w, { argv: ARGV_CONTROL });
    const leaks = leaksIn(SEEN);
    const maskedSeen = SEEN.some((l) => l.includes(W.TEST.masked));
    // ⭐ THE OUTPUT FILTER ALONE (makeIo): a number the tool was given never leaves it, in any spelling the fuzz found — whatever stands
    // beside it (a letter, a digit, a prefix), the digits taken out of the line leave no trace of the nine national digits
    const lib = impl.lib as typeof LIB;
    const shown: string[] = [];
    const io = lib.makeIo((l: string) => shown.push(l), {}, [W.TEST.key, W.CONTROL.key]);
    io.line(`call ${W.TEST.raw} or +${W.TEST.key} or 0${W.CONTROL.key.slice(3)} now`);
    const wallLeaks = leaksIn(shown);
    const wallSays = shown.length === 1 && shown[0].includes("[number]");
    const survivors: string[] = [];
    for (const spelling of spellingsOf(W.TEST.key)) {
      for (const before of ["", "x", "tel:", "9", "y"]) {
        for (const after of ["", "y", "9", " ok"]) {
          const out = lib.safeLine(`${before}${spelling}${after}`, {}, [W.TEST.key]);
          if (leakOf(out) !== null || out.replace(new RegExp("[^0-9]", "g"), "").includes(W.TEST.key.slice(3))) survivors.push(spelling.replace(new RegExp("[0-9]", "g"), "#"));
        }
      }
    }
    // ⭐ THE SCRUB RESIDUE (the checker's MINOR 7), each pinned by a spelling:
    //  (1) up to SIX separators between the digits of a number the tool was GIVEN - dashes, spaces, a zero-width mark after each digit and a space after each mark;
    //  (2) a number the tool was NOT given (the generic pass alone, no key): a slash, an underscore, an en dash, a minus sign, a tab, a no-break or thin space, a zero-width mark between its groups;
    //  (3) a LINE BREAK through a number: the whole text is made safe before it is split into lines;
    //  (4) a number or an address the 160-character cut of an error would have split: the message is made safe BEFORE it is cut.
    const national = W.TEST.key.slice(3);
    const ZW_ = String.fromCharCode(0x200b);
    const TAB_ = String.fromCharCode(9);
    const NBSP_ = String.fromCharCode(0xa0);
    const THIN_ = String.fromCharCode(0x2009);
    const EN_ = String.fromCharCode(0x2013);
    const MINUS_ = String.fromCharCode(0x2212);
    const SHY_ = String.fromCharCode(0xad);
    const NL_ = String.fromCharCode(10);
    const residue: string[] = [];
    const digitsOf = (s: string): string => s.replace(new RegExp("[^0-9]", "g"), "");
    for (const sep of ["------", " - - -", `${ZW_} ${ZW_} ${ZW_}`, `${TAB_}${TAB_}${TAB_}${TAB_}${TAB_}${TAB_}`, "/ / /", "_ _ _"]) {
      const out = lib.safeLine(`x${national.split("").join(sep)}y`, {}, [W.TEST.key]);
      if (digitsOf(out).includes(national.slice(0, 5)) || !out.includes("[number]")) residue.push(`a given number with ${sep.length} separators of one kind or another between its digits survived`);
    }
    for (const sep of ["/", "_", EN_, MINUS_, TAB_, NBSP_, THIN_, ZW_, SHY_, `${ZW_}/`, ` ${EN_} `]) {
      const out = lib.scrubNumbers(`call 0${national.slice(0, 3)}${sep}${national.slice(3, 6)}${sep}${national.slice(6)} now`);
      if (!out.includes("[number]") || digitsOf(out).includes(national.slice(3, 6))) residue.push(`a number NOT given, grouped with a separator of ${sep.length} character(s), survived the generic pass`);
    }
    const broken: string[] = [];
    const breakIo = lib.makeIo((l: string) => broken.push(l), {}, [W.TEST.key]);
    breakIo.line(`call 0${national.slice(0, 3)} ${national.slice(3, 6)}${NL_}${national.slice(6)} now and +255${national.slice(0, 3)}${NL_}${national.slice(3)}`);
    if (broken.some((l) => digitsOf(l).includes(national.slice(3, 6))) || !broken.join(" ").includes("[number]")) residue.push("a number a line break runs through survived the output filter");
    const cutNumber = lib.describeError(new Error(`${"x".repeat(150)} 0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`), {}, [W.TEST.key]);
    if (digitsOf(cutNumber).includes(national.slice(0, 4))) residue.push(`a number the 160-character cut would have split left its front digits in the error line: "${cutNumber.replace(new RegExp("[0-9]", "g"), "#").slice(-30)}"`);
    return [leaks.length === 0 && SEEN.length > 400 && maskedSeen && wallLeaks.length === 0 && wallSays && survivors.length === 0 && residue.length === 0,
      `${SEEN.length} lines swept · leaks [${leaks.slice(0, 4).join(", ")}] · the mask was printed ${maskedSeen} · the filter alone: ${wallSays ? "says [number]" : "does not say [number]"}, leaks ${wallLeaks.length}, ${survivors.length} spelling(s) survived [${[...new Set(survivors)].slice(0, 3).join(" | ")}] · residue [${residue.slice(0, 3).join("; ")}]`];
  });

  /* ── P5 · no database address anywhere (after the failing runs of P3) ── */
  await claim(L.p5, async () => {
    const wrong: string[] = [];
    const leaks = dbLeaks(SEEN);
    if (leaks.length) wrong.push(`${leaks.length} line(s) hold the address, password, host or user`);
    for (const [name, src] of [["core", impl.sources.lib], ["pre-flight", impl.sources.pre], ["evidence", impl.sources.ev]] as const) {
      const uses = [...src.matchAll(new RegExp("DATABASE_URL", "g"))].length;
      const printsEnv = new RegExp("(io0?|console)[.](line|log)[(][^)]*[.]DATABASE_URL").test(src) || new RegExp("[$][{][^}]*DATABASE_URL").test(src) || new RegExp("(io0?|console)[.](line|log)[(]process[.]env").test(src);
      if (printsEnv) wrong.push(`${name} interpolates the database address into a line`);
      if (name !== "core" && uses > 4) wrong.push(`${name} mentions DATABASE_URL ${uses} times`);
    }
    // a run whose every dependency fails still prints no address
    const boom = await pre(impl, W.goodPreWorld(), { throwOnQuery: new Error(`FATAL: password authentication failed for user "${W.DB_PIECES[3]}" at ${W.DB_PIECES[2]} (${W.DB_PIECES[0]})`) });
    if (dbLeaks(boom.lines).length) wrong.push("an error carrying the address reached the screen");
    // ⭐ the output filter ALONE takes the address, its password, its host, its user and any secret-named value out of any line
    const shown: string[] = [];
    const filter = (impl.lib as typeof LIB).makeIo((l: string) => shown.push(l), { DATABASE_URL: W.FAKE_DB_URL, SESSION_SECRET: "a-session-secret-0123456789" }, []);
    filter.line(`could not connect to ${W.FAKE_DB_URL} as ${W.DB_PIECES[3]} at ${W.DB_PIECES[2]} (password ${W.DB_PIECES[1]}) with a-session-secret-0123456789`);
    if (dbLeaks(shown).length || shown.some((l) => l.includes("a-session-secret"))) wrong.push("the output filter alone lets the address or a secret through");
    // ⭐ a secret or an address the 160-character cut of an error would have split: the message is made safe BEFORE it is cut, so no front half is left
    const describe = (impl.lib as typeof LIB).describeError;
    const cutSecret = describe(new Error(`${"y".repeat(140)} a-session-secret-0123456789`), { SESSION_SECRET: "a-session-secret-0123456789" }, []);
    if (cutSecret.includes("a-session-secret")) wrong.push("the front half of a secret survived the 160-character cut of an error");
    const cutAddress = describe(new Error(`${"y".repeat(140)} ${W.DB_PIECES[2]}:5432/${W.DB_PIECES[3]}`), { DATABASE_URL: W.FAKE_DB_URL }, []);
    if (cutAddress.includes(W.DB_PIECES[2].slice(0, 8)) || cutAddress.includes(W.DB_PIECES[3])) wrong.push("the database host or user survived the cut of an error");
    return [wrong.length === 0, `${SEEN.length} lines swept · wrong [${wrong.join("; ")}]`];
  });
}

/* ══ THE RUN ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Leave once stdout has flushed (a silent network leaves a timer behind that would hold the process for an hour). */
const exitNow = (): void => { const c = typeof process.exitCode === "number" ? process.exitCode : 1; process.stdout.write("", () => process.exit(c)); };

if (!PROVE_RED) {
  await runAssertions(REAL);
  console.log(`${NL}marketing-preflight: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
  exitNow();
} else {
  const reset = (): void => { pass = 0; fail = 0; failed.length = 0; failedDetail.clear(); };
  quiet = true;
  /* ── THE BASELINE — a plant can only "hold" against claims the real code PASSES ── */
  await silently(() => runAssertions(REAL));
  if (fail > 0) {
    console.log(`RED CONTROL — NOT RUN: the baseline is not green (${fail} claim(s) fail for the REAL code):${NL}  ${failed.join(`${NL}  `)}`);
    process.exit(1);
  }
  console.log(`RED CONTROL — baseline green (${pass} claims pass for the real code)${NL}`);

  /** A source with one anchor replaced. ⛔ An anchor that is not there THROWS, so a plant can never pass as caught unchanged. */
  const plantIn = (src: string, from: string, to: string): string => {
    if (!src.includes(from)) throw new Error(`plant anchor not found: ${from.slice(0, 60)}`);
    return src.replace(from, to);
  };
  /** A backtick, built from its code — a planted SQL statement is a template literal. */
  const BT = String.fromCharCode(96);
  /**
   * ⭐ A REPO MODULE WITH ONE TEXT ANCHOR REPLACED, loaded IN MEMORY: the text is changed, its relative imports are made absolute (a data: URL
   * has no folder) and `import.meta.url` is its own real URL again, then it is imported from a data: URL - no file is written, nothing
   * on disk changes. This is what lets a plant be a TEXT mutant of a tool or of the core and still be run end to end, with no seam in the code
   * for it (a hard-coded window, a deleted line, a looser comparison). ⛔ An anchor that is not there THROWS, as `plantIn` does.
   */
  const plantedModule = async (rel: string, from: string, to: string): Promise<Record<string, unknown>> => {
    const file = join(ROOT, ...rel.split("/"));
    const text = readFileSync(file, "utf8").split(CR).join("");
    if (!text.includes(from)) throw new Error(`plant anchor not found: ${from.slice(0, 60)}`);
    const here = pathToFileURL(file).href;
    const absolute = (spec: string): string => pathToFileURL(join(dirname(file), spec)).href;
    const patched = text.replace(from, () => to)
      .replace(new RegExp('"([.][.]?/[^"]+)"', "g"), (_m, spec: string) => JSON.stringify(absolute(spec)))
      .split("import.meta.url").join(JSON.stringify(here));
    const mod = await import(`data:text/javascript;base64,${Buffer.from(patched, "utf8").toString("base64")}`);
    return { ...mod };
  };
  const withPreText = async (from: string, to: string): Promise<Partial<Impl>> => ({ preTool: await plantedModule("scripts/live/marketing-preflight.mjs", from, to) });
  const withEvText = async (from: string, to: string): Promise<Partial<Impl>> => ({ evTool: await plantedModule("scripts/live/marketing-campaign-evidence.mjs", from, to) });
  const withCoreText = async (from: string, to: string): Promise<Partial<Impl>> => ({ lib: await plantedModule("scripts/lib/marketing-u52a.mjs", from, to) });
  const withLib = (patch: Record<string, unknown>): Partial<Impl> => ({ lib: { ...LIB, ...patch } });
  const withSources = (patch: Partial<Sources>): Partial<Impl> => ({ sources: { ...REAL_SOURCES, ...patch } });
  const L_ = LIB as unknown as Record<string, (...a: unknown[]) => unknown>;
  const PRE_ = PRE as unknown as { judgePreflight: (f: unknown, c: unknown, l: unknown) => unknown };
  const EV_ = EV as unknown as { PARTS: Record<string, (...a: unknown[]) => unknown>; judgeExpectation: (...a: unknown[]) => { holds: boolean; why: string; label: string } };

  type Plant = { name: string; expect: Label[]; impl: Partial<Impl> | (() => Partial<Impl> | Promise<Partial<Impl>>) };
  const plants: Plant[] = [
    /* ── the read-only transaction ── */
    { name: "R-RO1 · the helper never sets the transaction read-only (as if the first statement were dropped) — the first statement is the read-back, and P3's 'nothing else is asked' count is short", expect: [L.p3, L.p4],
      impl: withLib({ readOnlyTransaction: async (prisma: { $transaction: (f: (tx: unknown) => Promise<unknown>, o: unknown) => Promise<unknown> }, body: (tx: unknown, i: unknown) => Promise<unknown>) =>
        prisma.$transaction(async (tx: { $queryRaw: (s: TemplateStringsArray) => Promise<Array<{ ro: string }>> }) => {
          const ro = await tx.$queryRaw`SELECT current_setting('transaction_read_only') AS ro`;
          if (ro?.[0]?.ro !== "on") throw new LIB.ReadOnlyRefused(ro?.[0]?.ro);
          return body(tx, { readOnly: "on" });
        }, {}) }) },
    { name: "R-RO6 · the body is handed the raw transaction (it could execute a write; a failing read is no longer named)", expect: [L.p3, L.p4],
      impl: withLib({ readOnlyTransaction: async (prisma: { $transaction: (f: (tx: unknown) => Promise<unknown>, o: unknown) => Promise<unknown> }, body: (tx: unknown, i: unknown) => Promise<unknown>) =>
        prisma.$transaction(async (tx: { $executeRaw: (s: TemplateStringsArray) => Promise<unknown>; $queryRaw: (s: TemplateStringsArray) => Promise<Array<{ ro: string }>> }) => {
          await tx.$executeRaw`SET TRANSACTION READ ONLY`;
          const ro = await tx.$queryRaw`SELECT current_setting('transaction_read_only') AS ro`;
          if (ro?.[0]?.ro !== "on") throw new LIB.ReadOnlyRefused(ro?.[0]?.ro);
          return body(tx, { readOnly: "on" });
        }, {}) }) },
    { name: "R-RO2 · the helper runs the body whatever the database says (the read-back is not believed)", expect: [L.p3, L.p4],
      impl: withLib({ readOnlyTransaction: async (prisma: { $transaction: (f: (tx: unknown) => Promise<unknown>, o: unknown) => Promise<unknown> }, body: (tx: unknown, i: unknown) => Promise<unknown>) =>
        prisma.$transaction(async (tx: { $executeRaw: (s: TemplateStringsArray) => Promise<unknown>; $queryRaw: (s: TemplateStringsArray) => Promise<unknown> }) => {
          await tx.$executeRaw`SET TRANSACTION READ ONLY`;
          await tx.$queryRaw`SELECT current_setting('transaction_read_only') AS ro`;
          return body(tx, { readOnly: "on" });
        }, {}) }) },
    { name: "R-RO3 · the SET TRANSACTION READ ONLY line deleted from the shared helper's source", expect: [L.p4s],
      impl: () => withSources({ lib: plantIn(REAL_SOURCES.lib, "await tx.$executeRaw`SET TRANSACTION READ ONLY`;", "") }) },
    { name: "R-RO4 · an UPDATE planted in the evidence tool's SQL", expect: [L.p4s],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, "if (!facts.campaign) return facts;", "if (!facts.campaign) return facts; await tx.$queryRaw" + BT + 'UPDATE "SmsCampaign" SET "status" = 1' + BT + ";") }) },
    { name: "R-RO5 · a create call planted in the pre-flight", expect: [L.p4s],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, "const facts = { migrations: [], config: {}, test: {}, control: null };", "const facts = { migrations: [], config: {}, test: {}, control: null }; await tx.suppression.create({});") }) },
    { name: "R-RO7 · the transaction is not opened REPEATABLE READ (the option never reaches the database)", expect: [L.p4],
      impl: withLib({ readOnlyTransaction: (prisma: { $transaction: (f: unknown, o: Record<string, unknown>) => Promise<unknown>; $disconnect: () => Promise<void> }, body: unknown, opts?: unknown) =>
        (LIB.readOnlyTransaction as unknown as (p: unknown, b: unknown, o?: unknown) => Promise<unknown>)({ $transaction: (f: unknown, o: Record<string, unknown>) => prisma.$transaction(f, { ...o, isolationLevel: undefined }), $disconnect: () => prisma.$disconnect() }, body, opts) }) },
    { name: "R-RO8 · the helper's source loses the REPEATABLE READ option", expect: [L.p4s],
      impl: () => withSources({ lib: plantIn(REAL_SOURCES.lib, 'isolationLevel: "RepeatableRead", ', "") }) },
    { name: "R-RO9 · the pre-flight asks the network with POST (S9 of the review: the method reaches the stand-in network as POST)", expect: [L.p1c],
      impl: { fetchWrap: ((f: (url: string, init?: object) => Promise<unknown>) => (url: string, init?: object) => f(url, { ...init, method: "POST" })) as never } },
    { name: "R-RO10 · the pre-flight's source asks with POST", expect: [L.p4s],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, 'method: "GET"', 'method: "POST"') }) },
    { name: "R-RO11 · the pre-flight's source writes the ledger it was only to read (S10 of the review)", expect: [L.p4s],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, "const ledgerIo = d.ledgerIo();", 'const ledgerIo = d.ledgerIo(); ledgerIo.write("");') }) },
    /* ── the SQL: its contract, its order, its bound values (the review's 15 text mutations, and the two ways the stand-in database cannot see them) ── */
    { name: "R-Q1 · the newest consent row becomes the OLDEST (S1: ORDER BY … ASC on the ledger read)", expect: [L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, 'ORDER BY "createdAt" DESC, "id" DESC LIMIT 1', 'ORDER BY "createdAt" ASC, "id" ASC LIMIT 1') }) },
    { name: "R-Q2 · the person's ledger timeline runs oldest-first (S2)", expect: [L.p7],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, 'ORDER BY "createdAt" DESC, "id" DESC LIMIT 50', 'ORDER BY "createdAt" ASC, "id" ASC LIMIT 50') }) },
    { name: "R-Q3 · a list's NEWEST basis becomes its oldest (S3)", expect: [L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, 'ORDER BY "recordedAt" DESC, "id" DESC LIMIT 1', 'ORDER BY "recordedAt" ASC, "id" ASC LIMIT 1') }) },
    { name: "R-Q4 · the stop read loses its category filter (S4)", expect: [L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, `AND "category"::text = 'MARKETING' AND "identifier" = ${"$"}{testKey}${BT};`, `AND "identifier" = ${"$"}{testKey}${BT};`) }) },
    { name: "R-Q5 · the audit read orders by the BARE name again (S5: the trap that was found — PostgreSQL reads it as the text output column)", expect: [L.p7],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, 'ORDER BY "AuditLog"."seq" LIMIT 200', 'ORDER BY "seq" LIMIT 200') }) },
    { name: "R-Q6 · the live switch's 'newest eight' become the OLDEST eight (S6)", expect: [L.p7],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, 'ORDER BY "AuditLog"."seq" DESC LIMIT 8', 'ORDER BY "AuditLog"."seq" ASC LIMIT 8') }) },
    { name: "R-Q7 · the recipients of ANOTHER campaign (S7: campaignId <>)", expect: [L.p7],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, `FROM "SmsCampaignRecipient" WHERE "campaignId" = ${"$"}{campaignId} ORDER BY "id" LIMIT 41`, `FROM "SmsCampaignRecipient" WHERE "campaignId" <> ${"$"}{campaignId} ORDER BY "id" LIMIT 41`) }) },
    { name: "R-Q8 · the book row of ANY OTHER number (S8: msisdn <>)", expect: [L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, `FROM "MarketingContact" WHERE "msisdn" = ${"$"}{testKey}`, `FROM "MarketingContact" WHERE "msisdn" <> ${"$"}{testKey}`) }) },
    { name: "R-Q9 · 'lifted' reads the wrong column (S13: liftedReason AS lifted_at)", expect: [L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, `"liftedAt" AS lifted_at FROM "Suppression" WHERE "channel"::text = 'SMS' AND "category"::text = 'MARKETING' AND "identifier" = ${"$"}{testKey}`, `"liftedReason" AS lifted_at FROM "Suppression" WHERE "channel"::text = 'SMS' AND "category"::text = 'MARKETING' AND "identifier" = ${"$"}{testKey}`) }) },
    { name: "R-Q10 · the account lookup drops the plus (S14: the two-format trap)", expect: [L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, '"phoneE164" = ${`+${testKey}`}', '"phoneE164" = ${testKey}') }) },
    { name: "R-Q11 · the message join counts the messages of OTHER campaigns' recipients (S15)", expect: [L.p7],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, `m."targetId" IN (SELECT r."id" FROM "SmsCampaignRecipient" r WHERE r."campaignId" = ${"$"}{campaignId}) ORDER BY m."createdAt", m."reference" LIMIT 201`, `m."targetId" IN (SELECT r."id" FROM "SmsCampaignRecipient" r WHERE r."campaignId" <> ${"$"}{campaignId}) ORDER BY m."createdAt", m."reference" LIMIT 201`) }) },
    { name: "R-Q12 · a bare ORDER BY name equals an AS alias of its own SELECT (the generic rule, with the contract's fragment left intact)", expect: [L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, '"recordedAt" AS recorded_at', '"recordedAt" AS recordedat') }) },
    { name: "R-Q13 · the account lookup is BOUND without its plus (the stand-in database answers anyway; only the bound values show it)", expect: [L.p7],
      impl: { rebind: (tag: string, values: unknown[]) => (tag === "user" ? [String(values[0]).slice(1)] : values) } },
    { name: "R-Q14 · the audit read is BOUND to another campaign", expect: [L.p7],
      impl: { rebind: (tag: string, values: unknown[]) => (tag === "audit" ? ["cmp_some_other_campaign"] : values) } },
    { name: "R-Q15 · the control's stop is looked up under the TEST number (both look-ups bound to the same person)", expect: [L.p7],
      impl: { rebind: (tag: string, values: unknown[]) => (tag === "suppression" ? [W.TEST.key] : values) } },
    { name: "R-Q16 · the composer test's statement selects the NUMBER ITSELF instead of a yes/no", expect: [L.e8, L.p7],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, '/* u52a:test-messages */ SELECT m."reference", (m."msisdn" = ${probeKey}) AS to_test,', '/* u52a:test-messages */ SELECT m."reference", m."msisdn" AS to_test,') }) },
    /* ── numbers, names, secrets ── */
    { name: "R-N1 · the number argument keeps the whole number as its mask (P2 holds: the output filter's second wall takes the key out of every line)", expect: [L.p0, L.e0, L.e3],
      impl: withLib({ parseNumberArg: (flag: string, raw: string) => { const r = L_.parseNumberArg(flag, raw) as { ok: boolean; key: string; masked: string }; return r.ok ? { ...r, masked: r.key } : r; }, maskKey: (k: string) => k }) },
    { name: "R-N2 · the output filter lets every line through unchanged (numbers and the database address both) — the FIRST wall (safeText / safeLabel / safePayload on every database text) still keeps the suite's own runs clean, so it takes the direct claims on the filter to see it", expect: [L.p2, L.p5],
      impl: withLib({ makeIo: (sink: (l: string) => void) => { const lines: string[] = []; return { lines, line: (t: string) => { for (const part of String(t).split(NL)) { lines.push(part); sink(part); } } }; } }) },
    { name: "R-N8 · the output filter's NUMBER wall is gone but its secret wall stays (S11 of the review: makeIo without the scrub)", expect: [L.p2],
      impl: withLib({ makeIo: (sink: (l: string) => void, env: Record<string, string>) => { const lines: string[] = []; return { lines, line: (t: string) => { for (const part of String(t).split(NL)) { const safe = LIB.redactSecrets(part, env); lines.push(safe); sink(safe); } } }; } }) },
    { name: "R-N9 · the number wall ignores the numbers the tool was GIVEN (the generic pass alone: a bare run beside a letter, dots, slashes, tabs, zero-width marks all get through)", expect: [L.p2],
      impl: withLib({
        safeLine: (text: string, env: Record<string, string>) => LIB.scrubNumbers(LIB.redactSecrets(text, env), []),
        makeIo: (sink: (l: string) => void, env: Record<string, string>) => { const lines: string[] = []; return { lines, line: (t: string) => { for (const part of String(t).split(NL)) { const safe = LIB.scrubNumbers(LIB.redactSecrets(part, env), []); lines.push(safe); sink(safe); } } }; },
      }) },
    { name: "R-N3 · both walls down: the output filter and the error description leave the database address in a line", expect: [L.p2, L.p3, L.p5],
      impl: withLib({
        makeIo: (sink: (l: string) => void, env: Record<string, string>, keys: string[]) => { const lines: string[] = []; return { lines, line: (t: string) => { for (const part of String(t).split(NL)) { const safe = LIB.scrubNumbers(part, keys); lines.push(safe); sink(safe); } } }; },
        describeError: (err: Error) => String(err?.message ?? err),
      }) },
    { name: "R-N4 · a list's name is shown as it is (no label filter, no scrub)", expect: [L.e3, L.p1d],
      impl: withLib({ safeLabel: (v: unknown) => String(v) }) },
    { name: "R-N5 · free text from the database is shown as it is", expect: [L.e3],
      impl: withLib({ safeText: (v: unknown) => (v === null || v === undefined ? "—" : String(v)) }) },
    { name: "R-N6 · the audit payload is printed whole", expect: [L.e3, L.e7],
      impl: withLib({ safePayload: (p: unknown) => JSON.stringify(p) }) },
    { name: "R-N7 · an error is described by its whole message with no filter of its own (in a run the output filter, the second wall, still takes the address out; the direct claims on describeError see it)", expect: [L.p2, L.p5],
      impl: withLib({ describeError: (err: Error & { u52aStatement?: string }) => `[read: ${err.u52aStatement}] ${String(err?.message ?? err)}` }) },
    /* ── the pre-flight's rules ── */
    { name: "R-J1 · a switch that is OPEN reads closed (the port ignores the row)", expect: [L.p1b, L.p6a],
      impl: withLib({ readSwitch: () => ({ state: "closed", why: "absent" }) }) },
    { name: "R-J2 · an EXPIRED switch reads open", expect: [L.p1b, L.p6a],
      impl: withLib({ readSwitch: (v: unknown, now: number) => { const r = LIB.readSwitch(v, now) as { state: string; why?: string; closedAt?: string }; return r.state === "closed" && r.why === "expired" ? { state: "open", enabledAt: "x", closesAt: r.closedAt, remainingMs: 3_600_000 } : r; } }) },
    { name: "R-J3 · a settings record that cannot be read in full is read as readable", expect: [L.p1b, L.p6c],
      impl: withLib({ readSettings: (v: unknown) => ({ ...(LIB.readSettings(v) as object), readable: true }) }) },
    { name: "R-J4 · the migration check counts a rolled-back migration as finished", expect: [L.p1a],
      impl: { judge: (f: { migrations: Array<{ rolled: boolean }> }, c: unknown, l: unknown) => PRE_.judgePreflight({ ...f, migrations: f.migrations.map((m) => ({ ...m, rolled: false })) }, c, l) } },
    { name: "R-J5 · the migration check counts a started, unfinished migration as finished", expect: [L.p1a],
      impl: { judge: (f: { migrations: Array<{ finished: boolean }> }, c: unknown, l: unknown) => PRE_.judgePreflight({ ...f, migrations: f.migrations.map((m) => ({ ...m, finished: true })) }, c, l) } },
    { name: "R-J6 · the receipt secret's flag is ignored", expect: [L.p1c],
      impl: { judge: (f: unknown, c: { health: { ok: boolean; json: { sms: object } } }, l: unknown) => PRE_.judgePreflight(f, c.health.ok ? { ...c, health: { ...c.health, json: { ...c.health.json, sms: { ...c.health.json.sms, webhookSecretSet: true } } } } : c, l) } },
    { name: "R-J7 · a stale credit figure is believed", expect: [L.p1c],
      impl: { judge: (f: unknown, c: { health: { ok: boolean; json: { sms: object } } }, l: unknown) => PRE_.judgePreflight(f, c.health.ok ? { ...c, health: { ...c.health, json: { ...c.health.json, sms: { ...c.health.json.sms, balanceStale: false } } } } : c, l) } },
    { name: "R-J8 · the build is never compared with --expect-dpl", expect: [L.p1c],
      impl: { judge: (f: unknown, c: { args: object }, l: unknown) => PRE_.judgePreflight(f, { ...c, args: { ...c.args, expectDpl: null } }, l) } },
    { name: "R-J9 · the console rail passes (the provider is not looked at)", expect: [L.p1c],
      impl: { judge: (f: unknown, c: { health: { ok: boolean; json: { sms: object } } }, l: unknown) => PRE_.judgePreflight(f, c.health.ok ? { ...c, health: { ...c.health, json: { ...c.health.json, sms: { ...c.health.json.sms, provider: "blackball", configured: true } } } } : c, l) } },
    { name: "R-J10 · the window is never consulted (it is always inside)", expect: [L.p1b],
      impl: { judge: (f: unknown, c: { nowMs: number }, l: unknown) => PRE_.judgePreflight(f, { ...c, nowMs: Date.parse("2026-10-09T07:30:00.000Z") }, l) } },
    { name: "R-J11 · an active stop on the test number is ignored by the consent judgement", expect: [L.p1d, L.p6d],
      impl: withLib({ judgeEligibility: (f: object) => LIB.judgeEligibility({ ...f, suppression: false }) }) },
    { name: "R-J12 · the stop-and-start-again cycle changes nothing (the trap is not modelled)", expect: [L.p1d],
      impl: withLib({ factsAfterStopCycle: (f: unknown) => f }) },
    { name: "R-J13 · 18+ evidence is never required of a contact", expect: [L.p1d, L.p6d],
      impl: withLib({ judgeEligibility: (f: { book?: object; latest?: object | null; user: unknown }) => LIB.judgeEligibility(f.user ? (f as never) : ({ ...f, book: { ...(f.book ?? {}), cover: true } } as never)) }) },
    { name: "R-J14 · a minor account is an adult", expect: [L.p1d, L.p6d],
      impl: withLib({ ageBand: () => "adult" }) },
    { name: "R-J15 · an import attestation is never recognised", expect: [L.p1d],
      impl: withLib({ classifyLedgerRow: (row: object, saved: unknown) => { const c = LIB.classifyLedgerRow(row as never, saved as never) as { attestation: boolean } | null; return c ? { ...c, attestation: false } : c; } }) },
    { name: "R-J16 · a lifted stop counts as an active one on the control", expect: [L.p1e],
      impl: { judge: (f: { control: { suppressions: object[] } | null }, c: unknown, l: unknown) => PRE_.judgePreflight(f.control ? { ...f, control: { suppressions: f.control.suppressions.map((s) => ({ ...s, lifted_at: null })) } } : f, c, l) } },
    { name: "R-J17 · the test number's earlier campaigns are not looked at", expect: [L.p1d],
      impl: { judge: (f: { test: object }, c: unknown, l: unknown) => PRE_.judgePreflight({ ...f, test: { ...f.test, campaigns: [] } }, c, l) } },
    { name: "R-J19 · an erased book row is read as live (its old list memberships cover the number)", expect: [L.p1d],
      impl: { judge: (f: { test: { contact: object | null } }, c: unknown, l: unknown) => PRE_.judgePreflight({ ...f, test: { ...f.test, contact: f.test.contact ? { ...f.test.contact, erased: false } : f.test.contact } }, c, l) } },
    { name: "R-J18 · the network is waited for for an hour (the timeout is not applied)", expect: [L.p1c],
      impl: { timeoutMs: 3_600_000 } },
    { name: "R-J20 · the size of a list is not looked at (every list passes as a list of one)", expect: [L.p1d],
      impl: { judge: (f: { test: { lists?: object[] } }, c: unknown, l: unknown) => PRE_.judgePreflight({ ...f, test: { ...f.test, lists: (f.test.lists ?? []).map((x) => ({ ...x, members: 1 })) } }, c, l) } },
    { name: "R-J21 · the source row never looks at the saved wordings (it is always satisfied)", expect: [L.p1b],
      impl: { judge: (f: { config: Record<string, unknown> }, c: unknown, l: unknown) => PRE_.judgePreflight({ ...f, config: { ...f.config, [LIB.KEY_WORDINGS as string]: { ...((f.config[LIB.KEY_WORDINGS as string] as object) ?? {}), "source.phrase": W.SAVED_WORDINGS["source.phrase"], "adult.test": W.SAVED_WORDINGS["adult.test"] } } }, c, l) } },
    { name: "R-J22 · licence outreach being OPEN does not ask for adult.test", expect: [L.p1b],
      impl: { judge: (f: { config: Record<string, unknown> }, c: unknown, l: unknown) => PRE_.judgePreflight({ ...f, config: { ...f.config, [LIB.KEY_WORDINGS as string]: { ...((f.config[LIB.KEY_WORDINGS as string] as object) ?? {}), "adult.test": W.SAVED_WORDINGS["adult.test"] } } }, c, l) } },
    { name: "R-J23 · the time rules read THIS MACHINE's clock, not the database's", expect: [L.p1b],
      impl: withLib({ clockOf: (_dbNow: unknown, machineMs: number) => ({ nowMs: machineMs, source: "machine", skewMs: null }) }) },
    { name: "R-J24 · the send window's END is inclusive — 20:00 sharp is inside (V9 of the review)", expect: [L.p1b],
      impl: { judge: (f: unknown, c: { nowMs: number }, l: unknown) => (PRE_.judgePreflight(f, c, l) as Array<{ id: string; go: boolean | null }>).map((r) => (r.id === "window" && LIB.eatParts(c.nowMs).minuteOfDay === 1200 ? { ...r, go: true } : r)) } },
    { name: "R-J25 · test-fresh looks only at campaigns whose status is DONE (V18 of the review)", expect: [L.p1d],
      impl: { judge: (f: { test: { campaigns?: Array<{ status: string }> } }, c: unknown, l: unknown) => PRE_.judgePreflight({ ...f, test: { ...f.test, campaigns: (f.test.campaigns ?? []).filter((r) => r.status === "DONE") } }, c, l) } },
    { name: "R-J26 · the age band has no boundary: a birthday within a day of 18 reads adult (V12 of the review)", expect: [L.p1d, L.p6d],
      impl: withLib({ ageBand: (dob: unknown, now: number) => { const b = LIB.ageBand(dob, now); return b === "boundary" ? "adult" : b; } }) },
    { name: "R-J27 · a MISSING ledger file is trusted without --new-ledger (the drive restarts from zero and nobody said so)", expect: [L.l2, L.l3, L.p1e],
      impl: withLib({ ledgerGate: (read: { ok: boolean; existed?: boolean }, newLedger: boolean) => (read.ok && !read.existed && newLedger !== true ? { ok: true, kind: "new", used: 0 } : LIB.ledgerGate(read as never, newLedger)) }) },
    { name: "R-J28 · --new-ledger is accepted over a ledger that already EXISTS", expect: [L.l3, L.p1e],
      impl: withLib({ ledgerGate: (read: { ok: boolean; existed?: boolean; ledger: object }, newLedger: boolean) => (read.ok && read.existed && newLedger === true ? { ok: true, kind: "existing", used: LIB.ledgerTotal(read.ledger as never) } : LIB.ledgerGate(read as never, newLedger)) }) },
    /* ── the evidence verdict ── */
    { name: "R-V1 · a SKIPPED expectation holds whatever the row is (the gate removed — and the evidence still passes)", expect: [L.e1, L.e9],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: { outcome: string; who: string }, p: unknown, l: unknown) => (e.outcome === "skipped" ? { label: "skipped", holds: true, why: "planted" } : EV_.judgeExpectation(e, p, l)) } } },
    { name: "R-V2 · a person with NO row counts as refused", expect: [L.e1],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: { outcome: string }, p: { recipient: object | null } | null, l: unknown) => (p && !p.recipient && e.outcome === "skipped" ? { label: "skipped", holds: true, why: "planted" } : EV_.judgeExpectation(e, p, l)) } } },
    { name: "R-V3 · a skip for ANY reason proves the stop", expect: [L.e1, L.e9],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: { outcome: string; reason: string | null }, p: unknown, l: unknown) => EV_.judgeExpectation(e.outcome === "skipped" ? { ...e, reason: null } : e, p, l) } } },
    { name: "R-V4 · the stop-violation scan finds nothing", expect: [L.e2],
      impl: { parts: { ...EV.PARTS, stopViolations: () => [] } } },
    { name: "R-V5 · an UNCONFIRMED row counts as sent", expect: [L.e1],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: { outcome: string }, p: { recipient: { status: string } | null } | null, l: unknown) => (e.outcome === "sent" && p && p.recipient && p.recipient.status === "UNCONFIRMED" ? { label: "sent", holds: true, why: "planted" } : EV_.judgeExpectation(e, p, l)) } } },
    { name: "R-V6 · --expect-sends is never compared (the counts the evidence reports and the ledger takes go with it)", expect: [L.e0, L.e1, L.e4, L.l1, L.l3],
      impl: { parts: { ...EV.PARTS, sendCounts: (facts: unknown, lib: unknown) => ({ ...(EV_.PARTS.sendCounts(facts, lib) as object), chargeable: 0 }) } } },
    { name: "R-V7 · the verdict is always proven (every expectation holds, no violation is ever found)", expect: [L.e1, L.e2, L.e9],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: { outcome: string }) => ({ label: e.outcome, holds: true, why: "planted" }), stopViolations: () => [], sendCounts: (f: unknown, l: unknown) => { const s = EV_.PARTS.sendCounts(f, l) as { chargeable: number }; return s; } } } },
    { name: "R-V8 · a stop is 'in force' whenever the Suppression row is not lifted (its date and the ledger are ignored) — a stop made AFTER the message is flagged", expect: [L.e2],
      impl: { parts: { ...EV.PARTS, stopViolations: (people: Array<{ ledger: unknown[]; suppressions: Array<{ lifted_at: unknown }> }>) => (EV.PARTS.stopViolations as (p: unknown, f: unknown) => unknown)(people.map((p) => ({ ...p, ledger: [] })), (_at: number, sup: Array<{ lifted_at: unknown }>) => ({ inForce: sup.some((x) => x.lifted_at === null || x.lifted_at === undefined), by: "suppression", at: 0 })) } } },
    { name: "R-V13 · an audit expectation always holds (the rows are not looked at)", expect: [L.e1, L.e9, L.p6f],
      impl: { parts: { ...EV.PARTS, auditChecks: (_f: unknown, a: { expectAudit?: string[] }) => (a.expectAudit ?? []).map((action) => ({ action, holds: true, n: 1 })) } } },
    { name: "R-V14 · `stopped` does not look at the ORDER against the message — a stop made BEFORE it holds (V1 of the review)", expect: [L.e2],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: { outcome: string }, p: { recipient: unknown } | null, l: unknown) => EV_.judgeExpectation(e, e.outcome === "stopped" && p ? { ...p, recipient: null } : p, l) } } },
    { name: "R-V15 · `stopped` holds for ANY active stop — its reason and its source are not looked at (V14 of the review)", expect: [L.e2],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: { outcome: string }, p: { suppressions: Array<{ reason: string; via_link: boolean }> } | null, l: unknown) => EV_.judgeExpectation(e, e.outcome === "stopped" && p ? { ...p, suppressions: p.suppressions.map((s) => ({ ...s, reason: "WITHDRAWN", via_link: true })) } : p, l) } } },
    { name: "R-V16 · `resumed` does not need the newest ledger row to be that yes (V13 of the review)", expect: [L.e2],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: { outcome: string }, p: { ledger: object[] } | null, l: unknown) => EV_.judgeExpectation(e, e.outcome === "resumed" && p ? { ...p, ledger: [{ status: "GIVEN", via_link: true, created_at: new Date(Date.UTC(2099, 0, 1)) }, ...p.ledger] } : p, l) } } },
    { name: "R-V17 · an UNCONFIRMED row is not 'handed over' after a stop (V3 of the review)", expect: [L.e2],
      impl: { parts: { ...EV.PARTS, stopViolations: (people: Array<{ recipient: { status: string } | null }>) => (EV.PARTS.stopViolations as (p: unknown) => unknown)(people.map((p) => (p.recipient && p.recipient.status === "UNCONFIRMED" ? { ...p, recipient: { ...p.recipient, status: "PENDING" } } : p))) } } },
    { name: "R-V18 · only the row's status says 'handed over' — a message on the wire for a row that is not SENT does not (V3b of the review)", expect: [L.e2],
      impl: { parts: { ...EV.PARTS, stopViolations: (people: object[]) => (EV.PARTS.stopViolations as (p: unknown) => unknown)(people.map((p) => ({ ...p, messages: [] }))) } } },
    { name: "R-V19 · the standing double-send check finds nothing", expect: [L.e8],
      impl: { parts: { ...EV.PARTS, standingFindings: (f: unknown, a: unknown) => (EV.PARTS.standingFindings as (x: unknown, y: unknown) => Array<{ kind: string }>)(f, a).filter((s) => s.kind !== "double_send") } } },
    { name: "R-V20 · the standing 'to the test number only' check finds nothing", expect: [L.e8],
      impl: { parts: { ...EV.PARTS, standingFindings: (f: unknown, a: unknown) => (EV.PARTS.standingFindings as (x: unknown, y: unknown) => Array<{ kind: string }>)(f, a).filter((s) => s.kind !== "other_number") } } },
    { name: "R-V21 · a LOOK never exits 1 — its violations are counted as none (the review's X1)", expect: [L.e2, L.e8, L.e9, L.e10, L.l3],
      impl: { parts: { ...EV.PARTS, lookViolations: () => 0 } } },
    { name: "R-V22 · a look carries a verdict: its judged result says proven (V16 of the review)", expect: [L.e0],
      impl: { judgeEvidence: ((f: unknown, a: unknown, l: unknown, p: unknown) => ({ ...(EV.judgeEvidence as unknown as (...x: unknown[]) => object)(f, a, l, p), proven: true })) as never } },
    { name: "R-V9 · the slice timings are never worked out", expect: [L.e5],
      impl: { parts: { ...EV.PARTS, sliceTimings: () => [] } } },
    { name: "R-V10 · the test and control rows are swapped (a person is judged on the other's row)", expect: [L.e1],
      impl: { parts: { ...EV.PARTS, buildPeople: (facts: { recipients: Array<{ msisdn: string }> }, args: { test: { key: string } | null; control: { key: string } | null }) => (EV.PARTS.buildPeople as (f: unknown, a: unknown) => unknown)(facts, { ...args, test: args.control && args.test ? args.control : args.test }) } } },
    { name: "R-V11 · the report never says that the engine records no gate or send milliseconds", expect: [L.e5],
      impl: { render: (facts: unknown, v: unknown, a: unknown, c: unknown, l: unknown) => (EV.renderEvidence as (...x: unknown[]) => string[])(facts, v, a, c, l).filter((line) => !line.includes("RECORDS NO")) } },
    { name: "R-V12 · the evidence reads the audit row's ip as well", expect: [L.e7],
      impl: { readFacts: async (tx: { $queryRaw: (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown> }, a: { campaignId: string }) => { const facts = await (EV.readEvidenceFacts as (t: unknown, x: unknown) => Promise<unknown>)(tx, a); await tx.$queryRaw`/* u52a:audit */ SELECT "ip", "seq"::text AS seq FROM "AuditLog" WHERE "targetType" = 'SmsCampaign' AND "targetId" = ${a.campaignId}`; return facts; } } },
    /* ── chargeable counts and the ledger ── */
    { name: "R-C1 · only ACCEPTED and DELIVERED messages are chargeable", expect: [L.e4, L.e8],
      impl: withLib({ isChargeable: (s: string) => s === "ACCEPTED" || s === "DELIVERED", countChargeable: (g: Array<{ status: string; n: number }>) => g.filter((x) => x.status === "ACCEPTED" || x.status === "DELIVERED").reduce((n, x) => n + x.n, 0) }) },
    { name: "R-C2 · a FAILED message with no receipt is counted as a send", expect: [L.e4, L.e8],
      impl: withLib({ isChargeable: () => true, countChargeable: (g: Array<{ n: number }>) => g.reduce((n, x) => n + x.n, 0) }) },
    { name: "R-L1 · the ledger counts a seventh send (no cap)", expect: [L.l1],
      impl: withLib({ recordLedger: (ledger: { entries: Record<string, { chargeable: number }> }, id: string, entry: { chargeable: number }) => ({ ok: true, ledger: { ...ledger, entries: { ...ledger.entries, [id]: { ...entry } } }, total: 0 }) }) },
    { name: "R-L2 · a later, lower count shrinks the entry", expect: [L.l1],
      impl: withLib({ recordLedger: (ledger: { entries: Record<string, { chargeable: number }> }, id: string, entry: { chargeable: number }) => {
        const others = Object.entries(ledger.entries).filter(([k]) => k !== id).reduce((n, [, e]) => n + e.chargeable, 0);
        return others + entry.chargeable > 6 ? { ok: false, reason: "over_cap", would: others + entry.chargeable } : { ok: true, ledger: { ...ledger, entries: { ...ledger.entries, [id]: { ...entry } } }, total: others + entry.chargeable };
      } }) },
    { name: "R-L7 · a look overwrites the verdict and the label of an earlier proof", expect: [L.l1],
      impl: withLib({ recordLedger: (ledger: { entries: Record<string, { chargeable: number }> }, id: string, entry: { chargeable: number }) => {
        const real = LIB.recordLedger(ledger as never, id, entry as never) as { ok: boolean; ledger?: { entries: Record<string, object> } };
        if (!real.ok || !real.ledger) return real;
        return { ...real, ledger: { ...real.ledger, entries: { ...real.ledger.entries, [id]: { ...entry, chargeable: (real.ledger.entries[id] as { chargeable: number }).chargeable } } } };
      } }) },
    { name: "R-L3 · a re-run counts the campaign again (entries add up)", expect: [L.l1],
      impl: withLib({ recordLedger: (ledger: { entries: Record<string, { chargeable: number }> }, id: string, entry: { chargeable: number }) => {
        const prev = ledger.entries[id]?.chargeable ?? 0;
        const total = Object.values(ledger.entries).reduce((n, e) => n + e.chargeable, 0) + entry.chargeable;
        return total > 6 ? { ok: false, reason: "over_cap", would: total } : { ok: true, ledger: { ...ledger, entries: { ...ledger.entries, [id]: { ...entry, chargeable: prev + entry.chargeable } } }, total };
      } }) },
    { name: "R-L4 · a ledger file naming another cap is trusted (the reader believes its own cap field)", expect: [L.l1, L.p1e],
      impl: withLib({ readLedger: (io: { read: () => string | null }) => { const text = io.read(); try { const raw = JSON.parse(String(text)); return { ok: true, ledger: { v: 1, cap: 6, entries: raw.entries ?? {} }, existed: true }; } catch { return LIB.parseLedger(text); } } }) },
    { name: "R-L5 · the pre-send check always fits", expect: [L.l1, L.l2],
      impl: withLib({ checkRoom: (_ledger: unknown, sends: number) => ({ ok: true, used: 0, sends, room: 6 }) }) },
    { name: "R-L6 · the ledger is written in place (no temporary file, no rename)", expect: [L.l1],
      impl: withLib({ fileLedgerIo: (path: string, ops: Record<string, (...a: unknown[]) => void>) => ({ ...(LIB.fileLedgerIo as unknown as (p: string, o: unknown) => object)(path, ops), write: (text: string) => { ops.mkdir(dirname(path), { recursive: true }); ops[OP_WRITE](path, text, "utf8"); } }) }) },
    { name: "R-L11 · the ledger's rename is never tried again (a file Windows holds for a moment stops the drive)", expect: [L.l1],
      impl: withLib({ fileLedgerIo: (path: string, ops: Record<string, (...a: unknown[]) => void>) => ({ ...(LIB.fileLedgerIo as unknown as (p: string, o: unknown) => object)(path, ops), write: (text: string) => { ops.mkdir(dirname(path), { recursive: true }); ops[OP_WRITE](`${path}.tmp`, text, "utf8"); ops.rename(`${path}.tmp`, path); } }) }) },
    { name: "R-L12 · the ledger's rename is tried again whatever went wrong (ENOENT too, and for good)", expect: [L.l1],
      impl: withLib({ fileLedgerIo: (path: string, ops: Record<string, (...a: unknown[]) => void>) => ({ ...(LIB.fileLedgerIo as unknown as (p: string, o: unknown) => object)(path, ops), write: (text: string) => {
        ops.mkdir(dirname(path), { recursive: true });
        ops[OP_WRITE](`${path}.tmp`, text, "utf8");
        for (let tries = 0; ; tries++) { try { ops.rename(`${path}.tmp`, path); return; } catch (err) { if (tries >= 5) throw err; ops.sleep(50 * (tries + 1)); } }
      } }) }) },
    { name: "R-L8 · the ledger's strings reach the file unscrubbed (a number in a label or an outcome — the review's X2)", expect: [L.l3],
      impl: withLib({ serializeLedger: (l: object) => `${JSON.stringify(l, null, 2)}${NL}` }) },
    { name: "R-L9 · the pre-flight WRITES the ledger it reads (the same text back — S10 of the review)", expect: [L.l2, L.l3],
      impl: withLib({ readLedger: (io: { read: () => string | null; write: (t: string) => void }) => { const t = io.read(); if (t !== null) io.write(t); return LIB.readLedger(io as never); } }) },
    { name: "R-L10 · the ledger file's absolute path and last write are not said", expect: [L.l3],
      impl: withLib({ ledgerFileLine: () => "" }) },
    /* ── the stop link, the flag, the arguments ── */
    { name: "R-T1 · the stop link is shown without its flag", expect: [L.e6],
      impl: { readFacts: (tx: unknown, a: object) => (EV as unknown as { readEvidenceFacts: (t: unknown, x: unknown) => unknown }).readEvidenceFacts(tx, { ...a, wantToken: true }),
        render: (facts: unknown, v: unknown, a: object, c: unknown, l: unknown) => (EV as unknown as { renderEvidence: (...x: unknown[]) => unknown }).renderEvidence(facts, v, { ...a, showStopLink: true }, c, l) } },
    { name: "R-T2 · an evidence run with nothing to prove is quietly turned into a look (exit 0)", expect: [L.e0],
      impl: { evParse: (argv: string[], lib: unknown) => {
        const r = EV.parseEvidenceArgs(argv, lib as never);
        return !r.ok && r.problems.length === 1 && r.problems[0].startsWith("nothing to prove") ? EV.parseEvidenceArgs([...argv, "--look"], lib as never) : r;
      } } },
    { name: "R-T3 · a phone number given as the campaign id is accepted", expect: [L.e0],
      impl: withLib({ parseFlags: (argv: string[], spec: object) => { const r = LIB.parseFlags(argv, spec as never); return { ...r, positional: r.positional.map((p: string) => (p === "0755000111" ? "cmp_u52a_campaign_AAAA" : p)) }; } }) },
    { name: "R-T4 · the numbering plan is not asked (an invalid number is accepted as a number — and then the database is asked about a number nobody typed)", expect: [L.p0, L.p7],
      impl: withLib({ parseNumberArg: (flag: string, raw: string) => { const r = LIB.parseNumberArg(flag, raw); return r.ok ? r : { ok: true, key: "255" + "6" + "00000000", masked: "+255" + "•".repeat(4) + "00", operator: null }; } }) },
    { name: "R-T5 · a --label that is a number is accepted (the parser takes it for a plain label)", expect: [L.e0],
      impl: { evParse: (argv: string[], lib: unknown) => EV.parseEvidenceArgs(argv.map((a) => (a.startsWith("--label=") ? "--label=A" : a)), lib as never) } },
    /* ── wiring ── */
    { name: "R-W1 · ops:marketing-preflight runs through plain node (the repo's .ts is not loaded)", expect: [L.p9],
      impl: () => withSources({ pkg: plantIn(REAL_SOURCES.pkg, '"ops:marketing-preflight": "tsx scripts/live/marketing-preflight.mjs"', '"ops:marketing-preflight": "node scripts/live/marketing-preflight.mjs"') }) },
    { name: "R-W2 · the suite joins the predeploy chain", expect: [L.p9],
      impl: () => withSources({ pkg: plantIn(REAL_SOURCES.pkg, '"predeploy": "', '"predeploy": "npm run test:marketing-preflight && ') }) },
    { name: "R-W3 · the pre-flight defaults its origin to production", expect: [L.p9],
      impl: () => withSources({ pre: `${REAL_SOURCES.pre}${NL}const FALLBACK = "https://www.50pick.tz";` }) },
    { name: "R-W4 · the ledger is no longer gitignored", expect: [L.p9],
      impl: () => withSources({ gitignore: plantIn(REAL_SOURCES.gitignore, ".qa-shots/", "") }) },
    { name: "R-W5 · the migration list loses the UNCONFIRMED value", expect: [L.p8],
      impl: withLib({ ENGINE_MIGRATIONS: LIB.ENGINE_MIGRATIONS.filter((n: string) => !n.endsWith("sms_recipient_unconfirmed")) }) },
    { name: "R-W6 · a migration the list names is not a folder of prisma/migrations", expect: [L.p8],
      impl: () => ({ folders: readdirSync(join(ROOT, "prisma", "migrations")).filter((n) => !n.endsWith("sms_recipient_unconfirmed")) }) },
    { name: "R-W7 · the SQL names a column the schema does not have", expect: [L.p7],
      impl: () => withSources({ schema: plantIn(REAL_SOURCES.schema, "  smsReference String?                    @unique", "  smsRef2 String?                    @unique") }) },
    { name: "R-W8 · the core's source prints through console around the filter", expect: [L.s1],
      impl: () => withSources({ pre: `${REAL_SOURCES.pre}${NL}console.log(rows);` }) },
    { name: "R-W9 · the pre-flight stringifies a raw row", expect: [L.s1],
      impl: () => withSources({ pre: `${REAL_SOURCES.pre}${NL}const dump = JSON.stringify(facts);` }) },
    { name: "R-W13 · a command of the run sheet drops -s (npm's banner would echo the typed number)", expect: [L.p9],
      impl: () => withSources({ spec: plantIn(REAL_SOURCES.spec, "npm run -s ops:marketing-preflight", "npm run ops:marketing-preflight") }) },
    { name: "R-W14 · a command of the run sheet does not go through railway run", expect: [L.p9],
      impl: () => withSources({ spec: plantIn(REAL_SOURCES.spec, "railway run --service 50pick npm run -s ops:marketing-preflight", "npm run -s ops:marketing-preflight") }) },
    { name: "R-W15 · the run sheet no longer names the checkout it runs from", expect: [L.p9],
      impl: () => withSources({ spec: REAL_SOURCES.spec.split("kipindi-m14-base").join("a-checkout") }) },
    { name: "R-W16 · the run sheet makes the scratch-PostgreSQL probe optional again", expect: [L.p9],
      impl: () => withSources({ spec: REAL_SOURCES.spec.split("REQUIRED before production").join("optional") }) },
    { name: "R-W23 · the run sheet no longer reads the audience before a Start (the --look --expect-audience gate is gone)", expect: [L.p9],
      impl: () => withSources({ spec: REAL_SOURCES.spec.split("--look --expect-audience=1").join("--look") }) },
    { name: "R-W24 · the run sheet no longer gates the cap before a send (--ledger --sends=1 is gone)", expect: [L.p9],
      impl: () => withSources({ spec: REAL_SOURCES.spec.split("ops:marketing-campaign-evidence -- --ledger --sends=1").join("ops:marketing-campaign-evidence -- --ledger") }) },
    { name: "R-W25 · the run sheet's step 0 reads the old seventeen rows, and its gate no longer covers a retry", expect: [L.p9],
      impl: () => withSources({ spec: REAL_SOURCES.spec.split("19 of 19 rows").join("17 of 17 rows").split("and before ANY retry run G1, G2 and G3").join("and run G1") }) },
    { name: "R-W26 · the run sheet's pre-flight gate no longer names the campaign about to start (the in-flight row cannot tell it from a stranger)", expect: [L.p9],
      impl: () => withSources({ spec: REAL_SOURCES.spec.split("--expect-switch=open --drive-campaign=<X>").join("--expect-switch=open") }) },
    /* ── before anything is loaded ── */
    { name: "R-B1 · the private Railway host is NOT rewritten to the public proxy", expect: [L.b1],
      impl: { boot: { ...BOOT, boot: (toolUrl: string, _env: object, cwd: string, exists?: (p: string) => boolean) => { const p = BOOT.checkoutProblem(cwd, toolUrl, exists); return p === null ? { ok: true } : { ok: false, problem: p }; } } } },
    { name: "R-B2 · the rewrite replaces the user, the password and the database too", expect: [L.b1],
      impl: { boot: { ...BOOT, boot: (toolUrl: string, env: Record<string, string>, cwd: string, exists?: (p: string) => boolean) => { if (env.DATABASE_URL) env.DATABASE_URL = "postgresql://other:secret@turntable.proxy.rlwy.net:40357/postgres"; const p = BOOT.checkoutProblem(cwd, toolUrl, exists); return p === null ? { ok: true } : { ok: false, problem: p }; } } } },
    { name: "R-B3 · the working directory is never checked (a run from elsewhere dies in the module graph)", expect: [L.b1],
      impl: { boot: { ...BOOT, checkoutProblem: () => null } } },
    { name: "R-B4 · a tool imports the shared core STATICALLY (evaluated before the public-proxy rewrite — the referee-keys door, 70e9ba96)", expect: [L.b1],
      impl: () => withSources({ pre: `import * as EARLY from "../lib/marketing-u52a.mjs";${NL}${REAL_SOURCES.pre}` }) },
    { name: "R-B5 · a tool never calls boot before it loads the core", expect: [L.b1],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, "boot(import.meta.url)", "Boot(import.meta.url)") }) },

    /* ══ FIX ROUND 2 · the merged gate's referee, the junction, the pinned SQL, the standing reads, the margins, the scrub ══ */
    /* ── U33r: the agent-referee exclusion (§4.18 option b: not judged, and said so) ── */
    { name: "R-X1 · the consent rows stop saying that the agent-referee exclusion is not judged (the port would read a silent GO where the real gate refuses agent_referee)", expect: [L.p1d],
      impl: withLib({ REFEREE_SAYING: "" }) },
    { name: "R-X2 · a GO of the port stops carrying the referee exclusion in `unjudged` (P6d: the port reads GO where the real gate refuses, and does not say so)", expect: [L.p6d],
      impl: withLib({ judgeEligibility: (f: object) => { const v = LIB.judgeEligibility(f as never) as { ok: boolean; unjudged?: string[] }; return v.ok ? { ...v, unjudged: (v.unjudged ?? []).filter((x) => x !== LIB.REFEREE_UNJUDGED) } : v; } }) },
    { name: "R-X3 · the evidence cannot be asked for `skipped=agent_referee` (the reason is missing from the gate's list)", expect: [L.e9],
      impl: { evParse: (argv: string[], lib: unknown) => (argv.some((a) => a.includes("agent_referee")) ? { ok: false, problems: ["--expect names a skip reason the gate does not have"] } : EV.parseEvidenceArgs(argv, lib as never)) } },
    { name: "R-X4 · a referee's skip is explained like any other skip (no word about the agent referee)", expect: [L.e9],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: object, p: object | null, l: unknown) => { const r = EV_.judgeExpectation(e, p, l); return { ...r, why: r.why.split("agent applicant's referee").join("x").split("cannot be the drive's").join("is the drive's") }; } } } },
    /* ── MAJOR 1: the junction, isMain, the boot sentence, the proxy ── */
    { name: "R-B6 · a tool decides it is the program by comparing its URL with the typed path (the old expression: through a junction it is a silent no-op)", expect: [L.b1],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, "const AS_MAIN = isMain(import.meta.url);", "const AS_MAIN = import.meta.url === process.argv[1];") }) },
    { name: "R-B7 · isMain compares the typed paths, not the real ones (through a junction the tool is not itself)", expect: [L.b1],
      impl: { boot: { ...BOOT, isMain: (toolUrl: string, argv1: string) => typeof argv1 === "string" && argv1 !== "" && join(fileURLToPath(toolUrl)) === join(argv1) } } },
    { name: "R-B8 · the boot sentence says again that npm cds for you (it does not)", expect: [L.b1],
      impl: { boot: { ...BOOT, checkoutProblem: (cwd: string, toolUrl: string, exists?: (p: string) => boolean) => { const p = BOOT.checkoutProblem(cwd, toolUrl, exists); return p === null ? null : `${p} (npm run -s does that for you)`; } } } },
    { name: "R-B9 · the private host is rewritten to the proxy's host but with the private host's port (5432)", expect: [L.b1],
      impl: { boot: { ...BOOT, boot: (toolUrl: string, env: Record<string, string>, cwd: string, exists?: (p: string) => boolean) => { if (env.DATABASE_URL) env.DATABASE_URL = BOOT.publicProxyUrl(env.DATABASE_URL).split(":40357").join(":5432"); const p = BOOT.checkoutProblem(cwd, toolUrl, exists); return p === null ? { ok: true } : { ok: false, problem: p }; } } } },
    { name: "R-B10 · the private host is matched in lower case and without a trailing dot only (the old pattern)", expect: [L.b1],
      impl: { boot: { ...BOOT, boot: (toolUrl: string, env: Record<string, string>, cwd: string, exists?: (p: string) => boolean) => { if (env.DATABASE_URL) env.DATABASE_URL = env.DATABASE_URL.replace(new RegExp("@postgres[.]railway[.]internal(:[0-9]+)?"), "@turntable.proxy.rlwy.net:40357"); const p = BOOT.checkoutProblem(cwd, toolUrl, exists); return p === null ? { ok: true } : { ok: false, problem: p }; } } } },
    { name: "R-H1 · the tools' private-host guard is case-sensitive and ignores the trailing dot (the old pattern)", expect: [L.p3],
      impl: withLib({ isPrivateHost: (u: string) => new RegExp("[.]railway[.]internal(?::|[/]|$)").test(String(u)) }) },
    { name: "R-H2 · the report calls every database a 'proxy'", expect: [L.p3],
      impl: withLib({ databaseClass: () => "proxy" }) },
    /* ── MAJOR 2: the SystemConfig keys, the SELECT lists, the window, the list of two, the ledger write, the repeated flag ── */
    { name: "R-K1 · the live switch's key is mistyped in the core (an OPEN switch reads 'closed - no row stored')", expect: [L.p1b, L.p6e],
      impl: withLib({ KEY_LIVE_SWITCH: "marketing.sms.lvie" }) },
    { name: "R-K2 · the settings key is mistyped in the core (the saved record is never found: the defaults are judged)", expect: [L.p1b, L.p6e],
      impl: withLib({ KEY_SETTINGS: "marketing.sms.setings" }) },
    { name: "R-K3 · the licence-outreach key is mistyped in the core (an open record reads closed)", expect: [L.p1b, L.p1d, L.p6e],
      impl: withLib({ KEY_OUTREACH: "marketing.outreach.license" }) },
    { name: "R-K4 · the wordings key is mistyped in the core (nothing saved is ever found, so the `source` row is NO-GO in every world that should be GO)", expect: [L.l2, L.p0, L.p1a, L.p1b, L.p1c, L.p1d, L.p1e, L.p1f, L.p6e],
      impl: withLib({ KEY_WORDINGS: "marketing.wording" }) },
    { name: "R-K5 · the pre-flight's config statement asks for a key spelt wrongly (the stand-in answers anyway)", expect: [L.p6e, L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, "'marketing.sms.settings'", "'marketing.sms.settngs'") }) },
    { name: "R-K6 · the evidence's live-switch audit read asks for another key", expect: [L.p6e, L.p7],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, `"targetId" = 'marketing.sms.live'`, `"targetId" = 'marketing.sms.lvie'`) }) },
    { name: "R-S1 · the person's ledger read loses `createdAt AS created_at` (the stop scan goes blind; the stand-in still answers)", expect: [L.p7],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, `COALESCE("evidence" LIKE 'optout:%', false) AS via_link, "createdAt" AS created_at FROM "MessagingConsent"`, `COALESCE("evidence" LIKE 'optout:%', false) AS via_link FROM "MessagingConsent"`) }) },
    { name: "R-S2 · the person's suppression read loses `createdAt AS created_at`", expect: [L.p7],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, `AS via_link, "createdAt" AS created_at, "liftedAt" AS lifted_at, COALESCE("liftedReason"`, `AS via_link, "liftedAt" AS lifted_at, COALESCE("liftedReason"`) }) },
    { name: "R-S3 · the recipients read loses its 'id' (the messages cannot be matched to their rows)", expect: [L.p7],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, `/* u52a:recipients */ SELECT "id", "msisdn"`, `/* u52a:recipients */ SELECT "msisdn"`) }) },
    { name: "R-S4 · the message counts lose has_receipt (a refused attempt cannot be told from a charged one)", expect: [L.p7],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, `/* u52a:message-counts */ SELECT m."status"::text AS status, (m."dlrStatus" IS NOT NULL) AS has_receipt, count(*)::int AS n`, `/* u52a:message-counts */ SELECT m."status"::text AS status, count(*)::int AS n`) }) },
    { name: "R-S5 · the message counts lose 'status'", expect: [L.p7],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, `/* u52a:message-counts */ SELECT m."status"::text AS status, `, `/* u52a:message-counts */ SELECT `) }) },
    { name: "R-S6 · the audit read loses its text cast on seq (the order trap comes back in another form)", expect: [L.p7],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, `/* u52a:audit */ SELECT "seq"::text AS seq`, `/* u52a:audit */ SELECT "seq" AS seq`) }) },
    { name: "R-S7 · the pre-flight's list read selects one more column than the tool uses", expect: [L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, `m."addedAt" AS added_at, (SELECT count(*)::int`, `m."addedAt" AS added_at, m."contactId" AS contact_id, (SELECT count(*)::int`) }) },
    { name: "R-S8 · the user read selects the date of birth under another name (the tool reads `dob`)", expect: [L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, `"marketingOptIn" AS opt_in, "dob" FROM "User"`, `"marketingOptIn" AS opt_in, "dob" AS birth FROM "User"`) }) },
    { name: "R-W17 · the send window is the hard-coded 08:00-20:00, not the saved one", expect: [L.p1b],
      impl: () => withPreText("if (!(minuteNow >= s.windowStartMinute && minuteNow < s.windowEndMinute))", "if (!(minuteNow >= 480 && minuteNow < 1200))") },
    { name: "R-W18 · the window's margin is never asked for (a start with one minute left is GO)", expect: [L.p1b],
      impl: { judge: (f: unknown, c: { args: object }, l: unknown) => PRE_.judgePreflight(f, { ...c, args: { ...c.args, minWindow: 0 } }, l) } },
    { name: "R-S9 · the lists read is ordered newest-id-first (a direction APPENDED at the end of the statement: a substring check cannot see it)", expect: [L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, `ORDER BY l."id"${BT}`, `ORDER BY l."id" DESC${BT}`) }) },
    { name: "R-S10 · a condition is APPENDED to the elsewhere count (it skips the failed messages)", expect: [L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, `AND "msisdn" <> ${"$"}{testKey}${BT}`, `AND "msisdn" <> ${"$"}{testKey} AND "status"::text <> 'FAILED'${BT}`) }) },
    { name: "R-W19 · a list of TWO members passes as a list of one (`<= 2`)", expect: [L.p1d],
      impl: () => withPreText("const alone = lists.filter((l) => Number(l.members) === 1);", "const alone = lists.filter((l) => Number(l.members) <= 2);") },
    { name: "R-W20 · a list of one whose name is hidden passes (the tool cannot name it, and says GO)", expect: [L.p1d],
      impl: { judge: (f: { test: { lists?: Array<Record<string, unknown>> } }, c: unknown, l: unknown) => PRE_.judgePreflight({ ...f, test: { ...f.test, lists: (f.test.lists ?? []).map((x) => ({ ...x, list_name: "Plain name" })) } }, c, l) } },
    { name: "R-W21 · the repeated value flag is taken silently (the first --test wins)", expect: [L.p0, L.e0],
      impl: withLib({ parseFlags: (argv: string[], spec: object) => { const r = LIB.parseFlags(argv, spec as never); return { ...r, problems: r.problems.filter((p: string) => !p.includes("more than once")) }; } }) },
    { name: "R-W22 · any text is a campaign id (a phone number as the id, as a --drive-campaign)", expect: [L.p0, L.e0],
      impl: withLib({ isCampaignId: () => true }) },
    { name: "R-L13 · the ledger write that throws no longer stops the drive (`ledgerOk = false` deleted)", expect: [L.l3],
      impl: () => withEvText(`ledgerOk = false;${NL}      io.line("LEDGER NOT WRITTEN:`, `io.line("LEDGER NOT WRITTEN:`) },
    { name: "R-L14 · the failed ledger write tells the lead to write the count down by hand", expect: [L.l3],
      impl: () => withEvText("Run this same evidence command again for this campaign until it says the ledger took the count (a re-run counts nothing twice), and take no further step before it does.", "Write the count down by hand before going on.") },
    /* ── MAJOR 3: nothing else can send while the switch is open ── */
    { name: "R-E1 · the evidence's standing check for marketing to other numbers finds nothing", expect: [L.e8, L.e9, L.l3],
      impl: { parts: { ...EV.PARTS, standingFindings: (f: unknown, a: unknown, l: unknown) => (EV.PARTS.standingFindings as (x: unknown, y: unknown, z: unknown) => Array<{ kind: string }>)(f, a, l).filter((s) => s.kind !== "elsewhere") } } },
    { name: "R-E2 · the pre-flight's `elsewhere` row never looks at the count", expect: [L.p1f],
      impl: { judge: (f: object, c: unknown, l: unknown) => PRE_.judgePreflight({ ...f, elsewhere: 0 }, c, l) } },
    { name: "R-E3 · the pre-flight's `in-flight` row sees no campaign", expect: [L.p1f],
      impl: { judge: (f: object, c: unknown, l: unknown) => PRE_.judgePreflight({ ...f, inFlight: [] }, c, l) } },
    { name: "R-E4 · the pre-flight's `in-flight` row ignores --drive-campaign (the drive's own campaign is a stranger)", expect: [L.p1f],
      impl: { judge: (f: unknown, c: { args: object }, l: unknown) => PRE_.judgePreflight(f, { ...c, args: { ...c.args, driveCampaigns: [] } }, l) } },
    { name: "R-E5 · the pre-flight's `in-flight` row takes every campaign for the drive's own", expect: [L.p1f],
      impl: { judge: (f: { inFlight?: Array<{ id: string }> }, c: { args: object }, l: unknown) => PRE_.judgePreflight(f, { ...c, args: { ...c.args, driveCampaigns: (f.inFlight ?? []).map((x) => x.id) } }, l) } },
    { name: "R-E6 · the `elsewhere` count includes the test number's own messages (`=` for `<>`)", expect: [L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, `AND "msisdn" <> ${"$"}{testKey}`, `AND "msisdn" = ${"$"}{testKey}`) }) },
    { name: "R-E7 · the in-flight read leaves out PAUSED (a paused campaign can be resumed by anyone with the act)", expect: [L.p7],
      impl: () => withSources({ pre: plantIn(REAL_SOURCES.pre, `IN ('CONFIRMED', 'PREPARING', 'RUNNING', 'PAUSED')`, `IN ('CONFIRMED', 'PREPARING', 'RUNNING')`) }) },
    { name: "R-A1 · --expect-audience is never judged (the audience check finds nothing)", expect: [L.e9],
      impl: { parts: { ...EV.PARTS, audienceCheck: () => null } } },
    { name: "R-A2 · a look never fails for the audience (only violations turn its exit to 1)", expect: [L.e9],
      impl: { parts: { ...EV.PARTS, lookViolations: (v: { violations: unknown[]; standing: unknown[] }) => v.violations.length + v.standing.length } } },
    /* ── the minors ── */
    { name: "R-M4 · the double-send check counts every message row, chargeable or not (a refused first attempt and the retry read as a double send)", expect: [L.e8],
      impl: { parts: { ...EV.PARTS, standingFindings: (f: unknown, a: unknown, l: object) => (EV.PARTS.standingFindings as (x: unknown, y: unknown, z: unknown) => unknown)(f, a, { ...l, isChargeable: () => true }) } } },
    { name: "R-M7a · the output filter splits a text into lines BEFORE it makes it safe (a number a line break runs through survives)", expect: [L.p2],
      impl: withLib({ makeIo: (sink: (l: string) => void, env: Record<string, string>, keys: string[]) => { const lines: string[] = []; return { lines, line: (t: string) => { for (const part of String(t).split(NL)) { const safe = LIB.safeLine(part, env, keys); lines.push(safe); sink(safe); } } }; } }) },
    { name: "R-M7b · an error is cut to 160 characters BEFORE it is made safe (the front half of a secret or a number survives the cut)", expect: [L.p2, L.p5],
      impl: withLib({ describeError: (err: { message?: string; name?: string; code?: string; meta?: { code?: string }; u52aStatement?: string }, env: Record<string, string>, keys: string[]) => {
        // the old function, as it was: the last line is CUT to 160 characters and only then made safe
        const name = typeof err?.name === "string" ? err.name : "Error";
        const code = typeof err?.code === "string" ? ` ${err.code}` : "";
        const pg = typeof err?.meta?.code === "string" ? ` pg ${err.meta.code}` : "";
        const last = String(err?.message ?? err ?? "").split(NL).map((l) => l.trim()).filter(Boolean).pop() ?? "";
        const stmt = typeof err?.u52aStatement === "string" && /^[a-z?-]{1,30}$/.test(err.u52aStatement) ? ` [read: ${err.u52aStatement}]` : "";
        return LIB.safeLine(`${name}${code}${pg}${stmt}${last ? `: ${last.slice(0, 160)}` : ""}`, env, keys);
      } }) },
    { name: "R-M7c · the given number's pattern allows three separators between its digits, not six", expect: [L.p2],
      impl: () => withCoreText(`const SEPARATORS = "[^A-Za-z0-9]{0,6}";`, `const SEPARATORS = "[^A-Za-z0-9]{0,3}";`) },
    { name: "R-M7d · the generic pass allows only a space, a bracket, a dot and a hyphen between a number's groups (the old pattern: no slash, underscore, en dash, tab or zero-width mark)", expect: [L.p2],
      impl: () => withCoreText('if (!GENERIC_GAP.test(gap) || s[groups[j].start] === "+") break;', 'if (!/^[ ().-]{1,2}$/.test(gap) || s[groups[j].start] === "+") break;') },
    { name: "R-M8 · an expected audit action is satisfied by ANY row of it (the engine's own pause proves the officer's Pause)", expect: [L.e9, L.p6f],
      impl: { parts: { ...EV.PARTS, auditChecks: (f: { audit?: Array<{ action: string }> }, a: { expectAudit?: string[] }) => (a.expectAudit ?? []).map((action) => { const n = (f.audit ?? []).filter((r) => r.action === action).length; return { action, holds: n > 0, n, others: 0, words: null }; }) } } },
    { name: "R-K7 · the evidence's officer-pause reason is mistyped (the officer's real Pause would fail the proof)", expect: [L.e1, L.e9, L.p6f],
      impl: () => withEvText('payloadOf(r)?.reason === "officer_paused"', 'payloadOf(r)?.reason === "officer_pause"') },
    { name: "R-M10 · a SystemConfig value stored as text is parsed into an object (a row the engine refuses reads fine)", expect: [L.p1b],
      impl: { judge: (f: { config: Record<string, unknown> }, c: unknown, l: unknown) => PRE_.judgePreflight({ ...f, config: Object.fromEntries(Object.entries(f.config).map(([k, v]) => { if (typeof v === "string") { try { return [k, JSON.parse(v)]; } catch { return [k, v]; } } return [k, v]; })) }, c, l) } },

    /* ══ FIX ROUND 3 · the owner's ruling of 2026-10-09 (a marketing SMS is sent exactly as written) and his words for the drive ══ */
    { name: "R-AW1 · the SENT AS WRITTEN check finds nothing (a footer appended again goes by unseen)", expect: [L.e10],
      impl: { parts: { ...EV.PARTS, standingFindings: (f: unknown, a: unknown, l: unknown) => (EV.PARTS.standingFindings as (x: unknown, y: unknown, z: unknown) => Array<{ kind: string }>)(f, a, l).filter((s) => s.kind !== "as_written") } } },
    { name: "R-AW2 · the length windows are widened by the old footer's 49 characters (a footered message reads as written)", expect: [L.d1, L.e10],
      impl: withLib({ driveLengthWindows: (m?: unknown) => { const w = (LIB.driveLengthWindows as (x?: unknown) => Record<"SW" | "EN", { min: number; max: number; fallback: number }>)(m); return { SW: { ...w.SW, max: w.SW.max + 49 }, EN: { ...w.EN, max: w.EN.max + 49 } }; } }) },
    { name: "R-AW3 · a campaign message is judged in either window, whatever its row's language (a Swahili row may carry the English length)", expect: [L.e10],
      impl: withLib({ isDriveLength: (n: unknown, _locale: unknown, w?: unknown) => (LIB.isDriveLength as (a: unknown, b: unknown, c?: unknown) => boolean)(n, null, w) }) },
    { name: "R-DM1 · the drive's Swahili body loses two words (the constant no longer holds the owner's words, nor the words the run sheet quotes)", expect: [L.d1, L.p9],
      impl: withLib({ DRIVE_MESSAGE: { ...(LIB.DRIVE_MESSAGE as unknown as Record<string, string>), bodySw: (LIB.DRIVE_MESSAGE as unknown as Record<string, string>).bodySw.split(" hivi karibuni").join("") } }) },
    { name: "R-DM2 · the drive's campaigns lose their names (they could only be told apart by their words)", expect: [L.d1],
      impl: withLib({ DRIVE_CAMPAIGN_NAMES: { A: "U52a drive A" } }) },
    { name: "R-W27 · the run sheet's Swahili message is retyped with two words lost (the sheet no longer quotes the one constant)", expect: [L.p9],
      impl: () => withSources({ spec: plantIn(REAL_SOURCES.spec, (LIB.DRIVE_MESSAGE as unknown as Record<string, string>).bodySw, (LIB.DRIVE_MESSAGE as unknown as Record<string, string>).bodySw.split(" hivi karibuni").join("")) }) },
    { name: "R-W28 · the run sheet drops the rule that the owner's number is started again before a drive that stops", expect: [L.p9],
      impl: () => withSources({ spec: REAL_SOURCES.spec.split("never ends the drive").join("may end the drive") }) },
  ];

  console.log(`RED CONTROL — each defect planted in memory must fail EXACTLY the claims it names${NL}`);
  let held = 0;
  const missed: string[] = [];
  // U52A_ONLY=R-W17,R-K plays only the plants whose name starts with one of the prefixes (a development aid; the real run plays them all)
  const only = (process.env.U52A_ONLY ?? "").split(",").map((x) => x.trim()).filter((x) => x !== "");
  for (const plant of plants) {
    if (only.length > 0 && !only.some((prefix) => plant.name.startsWith(prefix))) continue;
    reset();
    let built: Impl;
    try {
      built = { ...REAL, ...(typeof plant.impl === "function" ? await plant.impl() : plant.impl) };
    } catch (err) {
      missed.push(plant.name);
      console.log(`  FAIL  ${plant.name} — the plant could not be built: ${String((err as Error)?.message ?? err)}`);
      continue;
    }
    await silently(() => runAssertions(built));
    const got = [...new Set(failed)].sort();
    const want = [...new Set<string>(plant.expect)].sort();
    if (json(got) === json(want)) {
      held++;
      console.log(`  held  ${plant.name}`);
    } else {
      missed.push(plant.name);
      const extra = got.filter((x) => !want.includes(x));
      const absent = want.filter((x) => !got.includes(x));
      console.log(`  FAIL  ${plant.name}${absent.length ? `${NL}        did not fail: ${absent.map((x) => x.slice(0, 60)).join(" | ")}` : ""}${extra.length ? `${NL}        also failed: ${extra.map((x) => `${x.slice(0, 6)} (${(failedDetail.get(x) ?? "").slice(0, 160)})`).join(" | ")}` : ""}${absent.length && process.env.U52A_DEBUG ? `${NL}        got: ${got.map((x) => `${x.slice(0, 6)} (${(failedDetail.get(x) ?? "").slice(0, 300)})`).join(" | ")}` : ""}`);
    }
  }
  console.log(`${NL}RED CONTROL — ${held} of ${only.length > 0 ? held + missed.length : plants.length} proofs held${missed.length ? `; ${missed.length} FAILED` : ""}${only.length > 0 ? " (a FILTERED run: U52A_ONLY)" : ""}`);
  process.exitCode = missed.length === 0 ? 0 : 1;
  exitNow();
}
