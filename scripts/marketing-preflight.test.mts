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
 *   L1  ⭐ THE LEDGER — a seventh send is REFUSED (not recorded, exit 1), a re-run counts nothing twice, a count never shrinks, a
 *       ledger that cannot be trusted stops the run; L2 the pre-send check (`--sends`, `--ledger`).
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION (§5.11). `--prove-red` FIRST PROVES THE BASELINE GREEN, then plants each defect IN MEMORY (a
 * function of the shared core, the judge, the verdict parts, the transaction helper, a source text) and requires EXACTLY the
 * claims it names to fail. No file is written. No database is touched.
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

import { readFileSync, readdirSync } from "node:fs";
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
const GATE = await import("../src/lib/server/marketing/consent.ts");
const PURE_SETTINGS = await import("../src/lib/marketing/sms-settings.ts");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CR = String.fromCharCode(13);
const NL = String.fromCharCode(10);
const rawRead = (rel: string): string => readFileSync(join(ROOT, ...rel.split("/")), "utf8").split(CR).join("");
const code = (rel: string): string => decomment(rawRead(rel));
const json = (v: unknown): string => JSON.stringify(v);
/** The two calls the ledger's atomic write is made of, named by pieces: `test:red-anchors` calls a harness whose SOURCE holds a
 *  file-writing call 'not in-process', comments and strings included — this suite writes no file, and its source says so. */
const FS_RENAME = ["rename", "Sync"].join("");
/** A column no tool may read, named by pieces so this suite is not mistaken for a writer of an account fact (`test:house-bot-holder-lifecycle` 2.2 counts a quoted name). */
const PW_COLUMN = ["password", "Hash"].join("");
const FS_WRITE = ["writeFile", "Sync"].join("");

/* ══ THE LABELS — each once, so a red case names exactly the claims it must turn red ═════════════════════════════════ */

const L = {
  p0: "P0 · CONTROLS — the good world is GO on all 18 rows in ROW_IDS order (the control row n/a without a control number, GO with an active stop) and exits 0; every usage error (no --test, no --origin, a bad number, the same number twice, a plain-http origin, a value-less or unknown option, a value on --new-ledger, --sends 7, an extra word) exits 2 with NOTHING read and the typed text never echoed; the masks print as +255••••NN",
  p1a: "P1a · ⛔ THE ENGINE'S MIGRATIONS, BY NAME — one missing, one started and never finished, one rolled back with no good retry are each NO-GO on the migrations row alone (exit 1), naming the migration; a rolled-back row followed by its finished retry is GO",
  p1b: "P1b · ⛔ THE SWITCH, THE SETTINGS AND THE WINDOW — an open switch is NO-GO on the switch row alone (its closing time printed); absent, expired and malformed rows read closed and GO; --expect-switch=open wants it open with 20+ minutes left; a settings record that cannot be read in full is NO-GO naming what it dropped, a saved one GO with its figures; outside the saved window is NO-GO on the window row alone (the window's end is exclusive: 20:00 sharp is outside, 19:59 inside); ⭐ every time rule reads the DATABASE's clock — a machine clock hours off changes nothing; ⭐ the SOURCE row — GO only while the newest saved source.phrase is not blank, and, while licence outreach is open, adult.test is saved too",
  p1c: "P1c · ⛔ THE WEB READS — an unset receipt secret, the console rail, an unconfigured rail, a credit that is low / stale / unknown / one shilling short are each NO-GO on their own row (the exact edge GO); a build other than --expect-dpl, an unreadable home page, a page naming no build are NO-GO on build (an asset's ?dpl= is read); /api/health not ready, not JSON, unreachable or silent past the timeout is NO-GO on health and on every row that needed it — and the tool returns within the timeout; ⭐ every network call is a GET of the home page or of /api/health, and nothing else",
  p1d: "P1d · ⛔ THE TEST NUMBER — no book row, an erased one, no list, a stop, a withdrawal, no consent, an account that is a minor / suspended / switched off / on the day of its 18th birthday, an earlier campaign row in ANY status each NO-GO on their own rows only; ⭐ THE DRIVE LIST HOLDS THE TEST NUMBER ALONE — a list of many members (or of an unknown size) is NO-GO on test-lists, one of exactly one member is GO and NAMED as the list campaign A must use, and a larger list the number is also on is named as never to pick; ⭐ the trap — a contact whose 18+ rested on an attestation row passes NOW and is NO-GO on test-cycle ('Start them again' replaces the newest row), while a covering list basis keeps both GO",
  p1e: "P1e · ⛔ THE CONTROL AND THE LEDGER — a named control with no stop or only a lifted one is NO-GO on control; an active stop is GO; a full ledger, --sends past the room and an untrustworthy ledger file are NO-GO on ledger alone; ⭐ a ledger file that is MISSING is NO-GO unless --new-ledger says the drive has not begun, and --new-ledger over a ledger that exists is NO-GO",
  p2: "P2 · ⛔ NO WHOLE NUMBER IN ANYTHING PRINTED — across every pre-flight run of the suite, with a number planted in the list name, the source, the consent cache, the campaign id and status of an earlier campaign and the control's stop reason: no output line holds the test or control number in any spelling, a bare 9-digit national number or a +255/0 run; ⭐ and the output filter ALONE (makeIo) takes a number the tool was given out of any line in every spelling the fuzz found — dots, slashes, tabs, zero-width marks, dashes, digits spaced one by one, next to a letter or a digit",
  p3: "P3 · ⛔ NOT RUN IS EXIT 2 — no DATABASE_URL, Railway's private host, a database that answers anything but `on` to the read-only read-back (nothing else is asked), and a read that throws (its message carrying the database address) each exit 2, and the address, password, host and user never reach the screen",
  p4: "P4 · ⭐ THE TRANSACTION IS READ ONLY — in both tools the FIRST statement is `SET TRANSACTION READ ONLY`, the second the read-back, every other a SELECT (no write verb in any); the helper refuses to run the body unless the database says `on`; the one transaction is opened REPEATABLE READ (one snapshot for every read)",
  p4s: "P4s · ⭐ READ ONLY, READ FROM THE SOURCES — the shared helper's first await is `SET TRANSACTION READ ONLY`, then its read-back, then the body; the one $transaction and the one $executeRaw are in it, with the REPEATABLE READ option; neither tool has $transaction, $executeRaw, an Unsafe raw call or a create/update/upsert/delete call; every $queryRaw statement in all three files is a SELECT with no write verb; the pre-flight never calls a write on the ledger, and its one network verb is GET",
  p5: "P5 · ⛔ NO DATABASE ADDRESS ANYWHERE — across every run of the suite (the failing ones included) no output line holds the DATABASE_URL, its password, its host or its user; the sources never print process.env or DATABASE_URL (a truthiness test and the private-host test are the only uses); ⭐ and the output filter ALONE takes the database address, its password, its host and its user out of any line",
  p6a: "P6a · ⭐ THE SWITCH READER IS THE APP'S — over 30 stored values and instants the port answers the real readMarketingLiveSwitch's state, why, closing time and opening time",
  p6b: "P6b · ⭐ THE OUTREACH READER IS THE APP'S — over 16 stored values the port answers the real readLicenceOutreachRow's state, why and instant",
  p6c: "P6c · ⭐ THE SETTINGS READER IS THE APP'S — over 12 stored records the port answers the real readSettingsRow's fields (defaults filled) and its dropped list, and `readable` is the engine's rule",
  p6d: "P6d · ⭐ THE GATE'S CONSENT-AND-BASIS HALF IS THE REAL GATE'S — over 384 scenarios (a contact: stop × newest ledger row × licence record × book standing; an account: switch × newest row × record × age × status) the port clears and refuses exactly as mayReceiveMarketingSms does, with the same skip reason; the age band agrees with marketingAge",
  p7: "P7 · ⭐ THE SQL, NOT ONLY ITS NAMES — every table and column the tools' SQL names exists in schema.prisma (or is _prisma_migrations's own); every statement in the sources was run by this suite; every statement keeps its CONTRACT (the filters, the equalities, the ORDER BY and its direction: newest first where 'newest' is meant, the table-qualified seq); no bare ORDER BY name equals an AS alias of its own SELECT (PostgreSQL would read it as the OUTPUT column); and every call was BOUND to the right values (the number with its plus, the campaign asked about, the member lists' ids)",
  p8: "P8 · the migration list is held to the folder — each named migration is a directory of prisma/migrations, and every migration whose SQL names a marketing table is in the list",
  p9: "P9 · the wiring — ops:marketing-preflight and ops:marketing-campaign-evidence run their scripts through tsx, test:/red:marketing-preflight resolve to this suite, none of the four is on the predeploy chain, both tools exist, neither names a production address to default to, and the ledger lives at .qa-shots/marketing-setup/U52a/ledger.json which .gitignore keeps out; ⭐ run through npm exactly as the sheet prints them (npm run -s) a key prints no banner and no line that names a number; ⭐ every npm run in the spec's run sheet is `npm run -s` (npm's banner echoes the arguments, the typed number with them)",
  e0: "E0 · CONTROLS — a good campaign A (the composer test + one delivered send) is PROVEN on --expect=delivered:test --expect-sends=2 and exits 0 with the ledger taking 2; a look has no verdict (exit 0, LOOK ONLY); no expectation and no look is exit 2; a campaign that is not there exits 1; a --label that holds a number (a run of five digits, or anything the number wall would change) is a usage error that names no digit; the masks print as +255••••NN",
  e1: "E1 · ⭐ THE DISCRIMINATION VERDICT AND ITS EXIT CODE (the plan's RED) — a good B (skipped suppressed, nothing on the wire) is PROVEN; with the GATE REMOVED (the stopped test number SENT) skipped:test FAILS and the exit is 1; a control SENT fails skipped:control; no row at all is not a refusal; a skip for another reason proves nothing; a refusal with a message on the wire fails; an unconfirmed or undelivered row fails sent / delivered; a wrong --expect-sends fails; the original pair sent:test + skipped:control passes only when both hold",
  e2: "E2 · ⛔ A MESSAGE HANDED TO A NUMBER AFTER ITS STOP WAS IN FORCE is a violation by itself — exit 1 though the asker expected sent, and exit 1 on a --look too (the RESULT line says VIOLATION); a stop made after the message, and one lifted before it, are not; stopInForceAt reads the ledger's newest row at the instant and the Suppression row's interval; an UNCONFIRMED row, or a message on a row that is not SENT, counts as handed over; `stopped` needs an active WITHDRAWN stop from the link made after the campaign's message, `resumed` needs the newest ledger row to be that yes",
  e3: "E3 · ⛔ NO WHOLE NUMBER, NAME OR SECRET IN THE EVIDENCE — with numbers planted in the skip detail, the error, the gateway's words, the receipt text, an audit payload, an actor id and a failure class, and a name in an audit payload: no line holds a number in any spelling, the payload name is hidden, and the masks are the repo's",
  e4: "E4 · what counts as a chargeable send — every message row except a FAILED one with no receipt (QUEUED, UNKNOWN, ACCEPTED, DELIVERED and a receipt-failed row count); the campaign's and the composer test's are counted apart and together",
  e5: "E5 · the slice timings — per claim: people, claim → hand-over, the gap to the previous claim, nothing handed over for a refused slice; and the evidence says in so many words that the engine RECORDS NO gate or send milliseconds; the claim's token is never printed",
  e6: "E6 · ⛔ THE STOP LINK ONLY UNDER ITS FLAG — without --show-stop-link no line holds the token or /s/ and no statement selects it; with it exactly one /s/<token> line for the test number, with its warning; the flag needs --test",
  e7: "E7 · ⛔ THE AUDIT ROWS THROUGH AN ALLOW-LIST — the officer's id shown, a name or free text hidden; and no statement of either tool selects ip, userAgent, a name, an e-mail, a hash, a message body or a note",
  e8: "E8 · ⛔ THE STANDING CHECKS, asked or not — a recipient row with more than one message is a double send, and with --test given a message of the campaign or a composer test to a number that is NOT the test number is a violation (the SQL computes a yes/no, never the number): each is printed as VIOLATION, fails the proof and turns a look's exit to 1; a clean campaign prints both checks as clear",
  l1: "L1 · ⭐ THE LEDGER — the cap is six; a seventh is REFUSED: the ledger is not updated, the evidence says LEDGER REFUSES and exits 1; a re-run of the same campaign counts nothing twice and a lower later count never shrinks the entry; a ledger file that is not JSON, names another cap or holds a bad entry stops the run (exit 2) and is never reset; the file is written atomically at the gitignored path",
  l2: "L2 · the pre-send check — the pre-flight's ledger row refuses a step whose sends would pass the cap (--sends, default 1) and --ledger [--sends=n] prints the table and exits 1 when they would not fit; it needs no database; the pre-flight only READS the ledger — not one write in any of its runs",
  l3: "L3 · ⭐ THE LEDGER FILE IS CREATED ONLY ON PURPOSE, AND SAID EVERY RUN — a missing file stops the evidence (exit 2, nothing read, nothing written) and the --ledger table too unless --new-ledger says the drive has not begun; --new-ledger over a ledger that exists is refused; with it the first run writes the file; every run prints the ledger's ABSOLUTE path and when it was last written; no string reaches the file without the number wall (a label that slipped past the parser is scrubbed on its way to the disk)",
  b1: "B1 · ⭐ BEFORE ANYTHING IS LOADED — both tools call the boot module first (the private Railway host is rewritten to the public proxy, the user and password and database kept, any other host untouched) and load the shared core by a DYNAMIC import, never a static one, and never @prisma/client or the app's store statically; run from a directory that is not the checkout (or has no tsconfig.json) each tool says ONE friendly line and exits 2 — not a stack from inside the module graph",
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
  /** A plant's wrapper around the stand-in network (between the tool and the recorder). */
  fetchWrap?: import("./lib/marketing-u52a-world.mts").RunOpts["fetchWrap"];
  /** A plant's rewrite of the values a statement is bound to. */
  rebind?: import("./lib/marketing-u52a-world.mts").RunOpts["rebind"];
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
  const r = await W.runPre(w, { lib: impl.lib, judge: impl.judge, parseArgs: impl.preParse, fetchWrap: impl.fetchWrap, rebind: impl.rebind, ...o, ...(impl.timeoutMs !== undefined ? { timeoutMs: impl.timeoutMs } : {}) });
  SEEN.push(...r.lines);
  PRE_STATEMENTS.push(r.statements);
  for (const s of r.statements) { const t = tagOf(s); if (t) STATEMENTS.set(t, s); }
  if (r.calls.length > 0) BIND_RUNS.push({ who: "pre-flight", calls: r.calls, ctx: r.bindCtx, txOptions: r.txOptions });
  FETCHES.push(...r.fetchCalls);
  PRE_LEDGER_WRITES += r.ledgerWrites;
  return r;
}
async function ev(impl: Impl, w: ReturnType<typeof W.evA>, argv: string[], o: Partial<import("./lib/marketing-u52a-world.mts").RunOpts> = {}) {
  const r = await W.runEv(w, argv, { lib: impl.lib, parts: impl.parts, readFacts: impl.readFacts, render: impl.render, parseArgs: impl.evParse, rebind: impl.rebind, ...o });
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
    ];
    const refusals: string[] = [];
    for (const [name, argv] of bad) {
      const r = await pre(impl, W.goodPreWorld(), { argv });
      if (r.code !== 2 || r.statements.length !== 0 || !has(r.lines, "REFUSING")) refusals.push(`${name}: exit ${r.code}, ${r.statements.length} statements`);
    }
    const typed = await pre(impl, W.goodPreWorld(), { argv: [`--test=0755 000 1`, `--origin=${W.ORIGIN}`] });
    const noEcho = !typed.lines.some((l) => l.includes("0755 000 1") || l.includes("7550001"));
    return [g.code === 0 && ids.length === 18 && json(ids) === json(PRE.ROW_IDS) && allGo && cGo && masks && refusals.length === 0 && noEcho && g.lines.some((l) => l.startsWith("RESULT: GO")),
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
    const lastMinute = W.goodPreWorld();
    lastMinute.now = Date.parse("2026-10-09T16:59:00.000Z");
    const rLast = await pre(impl, lastMinute);
    if (noGo(rLast.lines).length !== 0) wrong.push(`19:59 EAT: ${json(noGo(rLast.lines))}`);
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

  /* ── P3 · not run ── */
  await claim(L.p3, async () => {
    const wrong: string[] = [];
    const noUrl = await pre(impl, W.goodPreWorld(), { env: {} });
    if (noUrl.code !== 2 || noUrl.statements.length !== 0 || !has(noUrl.lines, "no DATABASE_URL")) wrong.push(`no url: ${noUrl.code}`);
    const priv = await pre(impl, W.goodPreWorld(), { env: { DATABASE_URL: "postgresql://u:longpassword123@postgres.railway.internal:5432/railway" } });
    if (priv.code !== 2 || priv.statements.length !== 0 || !has(priv.lines, "private host") || priv.lines.some((l) => l.includes("longpassword123") || l.includes("postgres.railway.internal"))) wrong.push(`private host: ${priv.code}`);
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
    type Scn = { suppression: boolean; user: null | { optIn: boolean; status: string; adult: "adult" | "minor" | "unknown" }; latest: Latest; outreach: "open" | "closed"; book: { row: "none" | "live" | "erased"; cover: boolean } };
    const scenarios: Scn[] = [];
    for (const suppression of [false, true]) for (const latest of [null, "sms", "other", "withdrawn"] as Latest[]) for (const outreach of ["closed", "open"] as const) {
      for (const row of ["none", "live", "erased"] as const) for (const cover of [false, true]) scenarios.push({ suppression, user: null, latest, outreach, book: { row, cover } });
      for (const optIn of [true, false]) for (const adult of ["adult", "minor", "unknown"] as const) for (const status of ["ACTIVE", "PENDING_KYC", "SUSPENDED"]) {
        scenarios.push({ suppression, user: { optIn, status, adult }, latest, outreach, book: { row: "none", cover: false } });
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
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = await GATE.mayReceiveMarketingSms(KEY, NOWD, reads as any);
      return v.ok ? { ok: true } : { ok: false, skipReason: v.skipReason };
    };
    const mineOf = (s: Scn): { ok: boolean; skipReason?: string } => {
      const lib = impl.lib as typeof LIB;
      const latest = s.latest === null ? null : { status: s.latest === "withdrawn" ? "WITHDRAWN" : "GIVEN", source: "PROFILE", sms: s.latest === "sms", attestation: false, viaLink: false, createdAt: "2026-10-04T10:00:00.000Z" };
      const v = lib.judgeEligibility({
        suppression: s.suppression,
        user: s.user ? { status: s.user.status, optIn: s.user.optIn, adult: lib.ageBand(DOB[s.user.adult], W.NOW) } : null,
        latest, outreach: s.outreach, book: s.book,
      });
      return v.ok ? { ok: true } : { ok: false, skipReason: v.skipReason };
    };
    const cache = (globalThis as unknown as { __U52A_GATE_CACHE?: Map<string, { ok: boolean; skipReason?: string }> });
    cache.__U52A_GATE_CACHE ??= new Map();
    const diffs: string[] = [];
    for (const s of scenarios) {
      const k = json(s);
      let real = cache.__U52A_GATE_CACHE.get(k);
      if (!real) { real = await realOf(s); cache.__U52A_GATE_CACHE.set(k, real); }
      const mine = mineOf(s);
      if (real.ok !== mine.ok || (!real.ok && real.skipReason !== mine.skipReason)) diffs.push(`${k.slice(0, 120)} → real ${real.ok ? "ok" : real.skipReason} · port ${mine.ok ? "ok" : mine.skipReason}`);
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
    return [diffs.length === 0 && ageDiffs.length === 0 && bandWrong.length === 0 && scenarios.length === 384, `${scenarios.length} scenarios · ${diffs.length} differences [${diffs.slice(0, 3).join("; ")}] · age differences [${ageDiffs.join("; ")}] · the band table is wrong for [${bandWrong.join("; ")}]`];
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
      config: { each: [`FROM "SystemConfig" WHERE "key" IN ('marketing.sms.live', 'marketing.sms.settings', 'marketing.outreach.licence', 'marketing.wordings')`] },
      contact: { each: [`FROM "MarketingContact" WHERE "msisdn" = ${ph("testKey")}`, `COALESCE("sourceRef" = 'erasure', false) AS erased`] },
      lists: { each: [`FROM "ContactListMember" m JOIN "ContactList" l ON l."id" = m."listId" WHERE m."contactId" = ${ph("facts.test.contact.id")} ORDER BY l."id"`, `(SELECT count(*)::int FROM "ContactListMember" x WHERE x."listId" = l."id") AS members`] },
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
      "switch-audit": { each: [`FROM "AuditLog" WHERE "targetType" = 'SystemConfig' AND "targetId" = 'marketing.sms.live' ORDER BY "AuditLog"."seq" DESC LIMIT 8`] },
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
    return [bad.length === 0 && models.size > 60 && statements.size >= 25 && unexercised.length === 0 && contractBad.length === 0 && aliasBad.length === 0 && bindBad.length === 0 && unbound.length === 0,
      `${models.size} models · ${statements.size} statements in the sources · bad [${bad.slice(0, 4).join("; ")}] · never run [${unexercised.join(", ")}] · contract [${contractBad.slice(0, 3).join("; ")}] · alias [${aliasBad.join("; ")}] · bound values [${bindBad.slice(0, 3).join("; ")}] · never bound [${unbound.join(", ")}]`];
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
    if (plain.length > 0) wrong.push(`${plain.length} npm run in the run sheet without -s`);
    const RAILWAY = "railway run --service 50pick ";
    const bare = [...sheet.matchAll(new RegExp("npm run -s ops:", "g"))].filter((m) => sheet.slice(Math.max(0, (m.index ?? 0) - RAILWAY.length), m.index ?? 0) !== RAILWAY);
    if (bare.length > 0) wrong.push(`${bare.length} command(s) of the run sheet do not go through ${RAILWAY.trim()}`);
    if (!sheet.includes("kipindi-m14-base")) wrong.push("the run sheet does not name the checkout the commands run from");
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
    if (clean.code !== 0 || !has(clean.lines, "ONE MESSAGE PER ROW   clear") || !has(clean.lines, "TO THE TEST NUMBER    clear") || has(clean.lines, "VIOLATION — ")) wrong.push(`a clean campaign: exit ${clean.code}`);
    if (!clean.lines.some((l) => l.includes("to the test number: yes"))) wrong.push("a message line does not say whether it went to the test number");
    // ONE MESSAGE PER ROW — a double send, whatever else was asked (no --expect-sends here)
    const twice = W.evA();
    twice.testMessages = [];
    twice.messages.push(W.messageRow({ reference: "sms_dupdupdupdupdupdupdup01", target_id: "rcp_test_a", status: "ACCEPTED", dlr_status: null, created_at: d(W.T0 + 5_000), sent_at: d(W.T0 + 5_500) }));
    const rTwice = await ev(impl, twice, W.evArgv(W.CAMPAIGN, base));
    if (rTwice.code !== 1 || !has(rTwice.lines, "VIOLATION — the test row has 2 messages") || !has(rTwice.lines, "RESULT: NOT PROVEN")) wrong.push(`a double send: exit ${rTwice.code}`);
    const lookTwice = await ev(impl, twice, W.evArgv(W.CAMPAIGN, ["--look"]));
    if (lookTwice.code !== 1 || !has(lookTwice.lines, "RESULT: LOOK ONLY") || !has(lookTwice.lines, "BUT 1 VIOLATION")) wrong.push(`a look at a double send: exit ${lookTwice.code}`);
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
    // the file io: atomic and at the gitignored path
    const src = impl.sources.lib;
    if (!(src.includes(`${FS_RENAME}(tmp, path)`) && src.includes(`${FS_WRITE}(tmp, text`))) wrong.push("the ledger is not written through a temporary file and a rename");
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
    if (!(u.hostname === "turntable.proxy.rlwy.net" && u.username === "fake_user" && u.password === fakePw && u.pathname === "/railway")) wrong.push("the private host was not rewritten to the public proxy, or the rest of the address changed");
    const other = { DATABASE_URL: `postgresql://fake_user:${fakePw}@db.example.test:5432/x` };
    boot.boot(preTool, other, ROOT);
    if (other.DATABASE_URL !== `postgresql://fake_user:${fakePw}@db.example.test:5432/x`) wrong.push("another host was rewritten");
    // the checkout: right here is fine; elsewhere, or with no tsconfig.json, is a sentence
    if (boot.checkoutProblem(ROOT, preTool) !== null) wrong.push("the checkout itself was refused");
    if (boot.checkoutProblem(tmpdir(), preTool) === null) wrong.push("a directory outside the checkout was accepted");
    if (boot.checkoutProblem(join(ROOT, "scripts"), preTool) === null) wrong.push("a folder of the checkout (no tsconfig.json) was accepted");
    if (boot.checkoutProblem(ROOT, preTool, () => false) === null) wrong.push("a checkout with no tsconfig.json was accepted");
    // both tools: boot first, the core by a dynamic import after it, and no static import of the core, of the client or of the store
    for (const [name, src] of [["pre-flight", impl.sources.pre], ["evidence", impl.sources.ev]] as const) {
      const statics = Array.from(src.matchAll(new RegExp('^import [^;]*from "([^"]+)";', "gm"))).map((m) => m[1]);
      const allowed = ["node:path", "node:url", "../lib/marketing-u52a-boot.mjs"];
      const stray = statics.filter((s) => !allowed.includes(s));
      if (stray.length > 0) wrong.push(`${name} imports ${stray.join(", ")} statically`);
      const bootAt = src.indexOf("boot(import.meta.url)");
      const coreAt = src.indexOf('await import("../lib/marketing-u52a.mjs")');
      const clientAt = src.indexOf('await import("@prisma/client")');
      if (!(bootAt > 0 && coreAt > bootAt && clientAt > coreAt)) wrong.push(`${name}: the order is boot ${bootAt} · core ${coreAt} · client ${clientAt}`);
      if (src.split('await import("../lib/marketing-u52a.mjs")').length !== 2) wrong.push(`${name} loads the core more than once`);
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
    return [leaks.length === 0 && SEEN.length > 400 && maskedSeen && wallLeaks.length === 0 && wallSays && survivors.length === 0,
      `${SEEN.length} lines swept · leaks [${leaks.slice(0, 4).join(", ")}] · the mask was printed ${maskedSeen} · the filter alone: ${wallSays ? "says [number]" : "does not say [number]"}, leaks ${wallLeaks.length}, ${survivors.length} spelling(s) survived [${[...new Set(survivors)].slice(0, 3).join(" | ")}]`];
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
  const withLib = (patch: Record<string, unknown>): Partial<Impl> => ({ lib: { ...LIB, ...patch } });
  const withSources = (patch: Partial<Sources>): Partial<Impl> => ({ sources: { ...REAL_SOURCES, ...patch } });
  const L_ = LIB as unknown as Record<string, (...a: unknown[]) => unknown>;
  const PRE_ = PRE as unknown as { judgePreflight: (f: unknown, c: unknown, l: unknown) => unknown };
  const EV_ = EV as unknown as { PARTS: Record<string, (...a: unknown[]) => unknown>; judgeExpectation: (...a: unknown[]) => { holds: boolean; why: string; label: string } };

  type Plant = { name: string; expect: Label[]; impl: Partial<Impl> | (() => Partial<Impl>) };
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
    { name: "R-N3 · both walls down: the output filter and the error description leave the database address in a line", expect: [L.p3, L.p5],
      impl: withLib({
        makeIo: (sink: (l: string) => void, env: Record<string, string>, keys: string[]) => { const lines: string[] = []; return { lines, line: (t: string) => { for (const part of String(t).split(NL)) { const safe = LIB.scrubNumbers(part, keys); lines.push(safe); sink(safe); } } }; },
        describeError: (err: Error) => String(err?.message ?? err),
      }) },
    { name: "R-N4 · a list's name is shown as it is (no label filter, no scrub)", expect: [L.e3],
      impl: withLib({ safeLabel: (v: unknown) => String(v) }) },
    { name: "R-N5 · free text from the database is shown as it is", expect: [L.e3],
      impl: withLib({ safeText: (v: unknown) => (v === null || v === undefined ? "—" : String(v)) }) },
    { name: "R-N6 · the audit payload is printed whole", expect: [L.e3, L.e7],
      impl: withLib({ safePayload: (p: unknown) => JSON.stringify(p) }) },
    { name: "R-N7 · an error is described by its whole message — HELD BY THE SECOND WALL: the output filter still takes the address out", expect: [],
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
    { name: "R-V1 · a SKIPPED expectation holds whatever the row is (the gate removed — and the evidence still passes)", expect: [L.e1],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: { outcome: string; who: string }, p: unknown, l: unknown) => (e.outcome === "skipped" ? { label: "skipped", holds: true, why: "planted" } : EV_.judgeExpectation(e, p, l)) } } },
    { name: "R-V2 · a person with NO row counts as refused", expect: [L.e1],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: { outcome: string }, p: { recipient: object | null } | null, l: unknown) => (p && !p.recipient && e.outcome === "skipped" ? { label: "skipped", holds: true, why: "planted" } : EV_.judgeExpectation(e, p, l)) } } },
    { name: "R-V3 · a skip for ANY reason proves the stop", expect: [L.e1],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: { outcome: string; reason: string | null }, p: unknown, l: unknown) => EV_.judgeExpectation(e.outcome === "skipped" ? { ...e, reason: null } : e, p, l) } } },
    { name: "R-V4 · the stop-violation scan finds nothing", expect: [L.e2],
      impl: { parts: { ...EV.PARTS, stopViolations: () => [] } } },
    { name: "R-V5 · an UNCONFIRMED row counts as sent", expect: [L.e1],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: { outcome: string }, p: { recipient: { status: string } | null } | null, l: unknown) => (e.outcome === "sent" && p && p.recipient && p.recipient.status === "UNCONFIRMED" ? { label: "sent", holds: true, why: "planted" } : EV_.judgeExpectation(e, p, l)) } } },
    { name: "R-V6 · --expect-sends is never compared (the counts the evidence reports and the ledger takes go with it)", expect: [L.e0, L.e1, L.e4, L.l1, L.l3],
      impl: { parts: { ...EV.PARTS, sendCounts: (facts: unknown, lib: unknown) => ({ ...(EV_.PARTS.sendCounts(facts, lib) as object), chargeable: 0 }) } } },
    { name: "R-V7 · the verdict is always proven (every expectation holds, no violation is ever found)", expect: [L.e1, L.e2],
      impl: { parts: { ...EV.PARTS, judgeExpectation: (e: { outcome: string }) => ({ label: e.outcome, holds: true, why: "planted" }), stopViolations: () => [], sendCounts: (f: unknown, l: unknown) => { const s = EV_.PARTS.sendCounts(f, l) as { chargeable: number }; return s; } } } },
    { name: "R-V8 · a stop is 'in force' whenever the Suppression row is not lifted (its date and the ledger are ignored) — a stop made AFTER the message is flagged", expect: [L.e2],
      impl: { parts: { ...EV.PARTS, stopViolations: (people: Array<{ ledger: unknown[]; suppressions: Array<{ lifted_at: unknown }> }>) => (EV.PARTS.stopViolations as (p: unknown, f: unknown) => unknown)(people.map((p) => ({ ...p, ledger: [] })), (_at: number, sup: Array<{ lifted_at: unknown }>) => ({ inForce: sup.some((x) => x.lifted_at === null || x.lifted_at === undefined), by: "suppression", at: 0 })) } } },
    { name: "R-V13 · an audit expectation always holds (the rows are not looked at)", expect: [L.e1],
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
    { name: "R-V21 · a LOOK never exits 1 — its violations are counted as none (the review's X1)", expect: [L.e2, L.e8],
      impl: { parts: { ...EV.PARTS, lookViolations: () => 0 } } },
    { name: "R-V9 · the slice timings are never worked out", expect: [L.e5],
      impl: { parts: { ...EV.PARTS, sliceTimings: () => [] } } },
    { name: "R-V10 · the test and control rows are swapped (a person is judged on the other's row)", expect: [L.e1],
      impl: { parts: { ...EV.PARTS, buildPeople: (facts: { recipients: Array<{ msisdn: string }> }, args: { test: { key: string } | null; control: { key: string } | null }) => (EV.PARTS.buildPeople as (f: unknown, a: unknown) => unknown)(facts, { ...args, test: args.control && args.test ? args.control : args.test }) } } },
    { name: "R-V11 · the report never says that the engine records no gate or send milliseconds", expect: [L.e5],
      impl: { render: (facts: unknown, v: unknown, a: unknown, c: unknown, l: unknown) => (EV.renderEvidence as (...x: unknown[]) => string[])(facts, v, a, c, l).filter((line) => !line.includes("RECORDS NO")) } },
    { name: "R-V12 · the evidence reads the audit row's ip as well", expect: [L.e7],
      impl: { readFacts: async (tx: { $queryRaw: (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown> }, a: { campaignId: string }) => { const facts = await (EV.readEvidenceFacts as (t: unknown, x: unknown) => Promise<unknown>)(tx, a); await tx.$queryRaw`/* u52a:audit */ SELECT "ip", "seq"::text AS seq FROM "AuditLog" WHERE "targetType" = 'SmsCampaign' AND "targetId" = ${a.campaignId}`; return facts; } } },
    /* ── chargeable counts and the ledger ── */
    { name: "R-C1 · only ACCEPTED and DELIVERED messages are chargeable", expect: [L.e4],
      impl: withLib({ isChargeable: (s: string) => s === "ACCEPTED" || s === "DELIVERED", countChargeable: (g: Array<{ status: string; n: number }>) => g.filter((x) => x.status === "ACCEPTED" || x.status === "DELIVERED").reduce((n, x) => n + x.n, 0) }) },
    { name: "R-C2 · a FAILED message with no receipt is counted as a send", expect: [L.e4],
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
      impl: () => withSources({ lib: plantIn(REAL_SOURCES.lib, `${FS_RENAME}(tmp, path);`, "") }) },
    { name: "R-L8 · the ledger's strings reach the file unscrubbed (a number in a label or an outcome — the review's X2)", expect: [L.l3],
      impl: withLib({ serializeLedger: (l: object) => `${JSON.stringify(l, null, 2)}${NL}` }) },
    { name: "R-L9 · the pre-flight WRITES the ledger it reads (the same text back — S10 of the review)", expect: [L.l2],
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
    /* ── before anything is loaded ── */
    { name: "R-B1 · the private Railway host is NOT rewritten to the public proxy", expect: [L.b1],
      impl: { boot: { ...BOOT, boot: (toolUrl: string, _env: object, cwd: string, exists?: (p: string) => boolean) => { const p = BOOT.checkoutProblem(cwd, toolUrl, exists); return p === null ? { ok: true } : { ok: false, problem: p }; } } } },
    { name: "R-B2 · the rewrite replaces the user, the password and the database too", expect: [L.b1],
      impl: { boot: { ...BOOT, boot: (toolUrl: string, env: Record<string, string>, cwd: string, exists?: (p: string) => boolean) => { if (env.DATABASE_URL) env.DATABASE_URL = "postgresql://other:secret@turntable.proxy.rlwy.net:40357/postgres"; const p = BOOT.checkoutProblem(cwd, toolUrl, exists); return p === null ? { ok: true } : { ok: false, problem: p }; } } } },
    { name: "R-B3 · the working directory is never checked (a run from elsewhere dies in the module graph)", expect: [L.b1],
      impl: { boot: { ...BOOT, checkoutProblem: () => null } } },
    { name: "R-B4 · a tool imports the shared core STATICALLY (evaluated before the public-proxy rewrite — ops:marketing-referee-keys, 70e9ba96)", expect: [L.b1],
      impl: () => withSources({ pre: `import * as EARLY from "../lib/marketing-u52a.mjs";${NL}${REAL_SOURCES.pre}` }) },
    { name: "R-B5 · a tool never calls boot before it loads the core", expect: [L.b1],
      impl: () => withSources({ ev: plantIn(REAL_SOURCES.ev, "boot(import.meta.url)", "Boot(import.meta.url)") }) },
  ];

  console.log(`RED CONTROL — each defect planted in memory must fail EXACTLY the claims it names${NL}`);
  let held = 0;
  const missed: string[] = [];
  for (const plant of plants) {
    reset();
    let built: Impl;
    try {
      built = { ...REAL, ...(typeof plant.impl === "function" ? plant.impl() : plant.impl) };
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
  console.log(`${NL}RED CONTROL — ${held} of ${plants.length} proofs held${missed.length ? `; ${missed.length} FAILED` : ""}`);
  process.exitCode = missed.length === 0 ? 0 : 1;
  exitNow();
}
