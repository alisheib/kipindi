/**
 * test:marketing-owner-save — THE OWNER-SAVE DOOR's guard (G4 · G5 · G10; Ali's ruling of 2026-10-07: he approves each
 * marketing wording, the campaign source line and each public policy line IN THE CHAT, and Claude saves them for him through
 * the audited ops door — never with his login).
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script. The door under test is the REAL one —
 * `src/lib/server/marketing/owner-save.ts`, driven through its declared deps — over the REAL writers: each record's own store
 * built by its own `makeStore` over a second instance of the real `defineConfig` factory (`__wordingsStoreForTest`,
 * `__policyLinesStoreForTest`) against an in-memory row that answers like Postgres (a JSON copy in, a JSON copy out), so the
 * card's rules, the stale and approval checks, the append-only check, the verified write and the factory's ADMIN row all run
 * as they ship. The audit queue is the real one (this process has no database: the ring is its store); only the door's own
 * COMPLIANCE rows go to a stand-in chain that can lose or refuse a row on demand and notes how many row writes had happened
 * when each one was recorded.
 *   O1  the approval file read as evidence — strict UTF-8, no backslash, the strict reader, no blank, the stored bytes' digest;
 *   O2  the gates' keys — G4 the nine, G5 the source line alone, G10 the five lines; nothing crosses;
 *   O3  approvedOn against the DATABASE's EAT day — never after today, never more than seven days ago;
 *   O4  who and why screened (each field, and six numerals across the two) before anything is read;
 *   O5  --expect names every text's digest, and nothing else;
 *   O6  the refusals come in the door's order, and none of them records or writes anything;
 *   O7  the row as it is now — unreadable, or read only in part — refuses before the record; status exits 1;
 *   O8  the record's own rules refuse in the card's own words, before the record; a note never blocks;
 *   O9  ⛔ RECORD FIRST — the applying row before any write, carrying Ali's approval; a lost record writes nothing;
 *   O10 ⛔ THE SAME WRITER — the card's own request, `ops: <by>`, the database's instant, the words byte for byte;
 *   O11 a writer that refuses is recorded `_refused` in its own words (and a lost record said so); one that throws is
 *       recorded `_failed`; ⛔ `not_saved` is decided by a fresh read — a write that landed goes on, never confirmed, and one
 *       that did not show is `_failed` with the outcome unknown (the review of 2026-10-07's MAJOR);
 *   O12 a row that does not read back as the approval is `_failed` (step read_back);
 *   O13 NOTHING TO DO writes and records nothing; approve only where the history is empty; a review only of today's words;
 *   O14 ⛔ the factory's ADMIN row flushed, found and named by the applied record — or the save is not confirmed, each of
 *       DONE's conditions held by itself; DONE ends with the redeploy instruction, and a G5 apply names older drafts;
 *   O15 the display rule — "through the ops door (…)", never "by an admin", one rule with the live switch card;
 *   O16 the door's source — the proxy before ANY static specifier names src, production's environment, the clock (an
 *       unreadable one said as the database out of reach), no writer or reader of its own;
 *   O17 the wiring — the scripts and predeploy (a gate outside the pipeline is not a gate);
 *   O18 check writes nothing and prints the words exactly as stored, the previews and the exact apply line;
 *   O19 ⭐ ALI'S APPROVALS OF 2026-10-07, AS COMMITTED (`docs/marketing-approvals/2026-10-07/`) — every text word for word
 *       what he approved (G5 his sentence, G4 the code's suggestions, G10 spec Appendix B.2–B.6, read here — never by the
 *       door), every digest in the door's header the file's own, and each file applied on the memory twin in one save;
 *   O20 U13 · the RG line judged against the send window AS READ, as the writer judges it — refused before the record.
 *   ⚠️ O19 compares with the suggestions and the spec AS THEY STAND. The 2026-10-07 files are evidence and never change:
 *   when a later commit re-words a suggestion or an Appendix B line (the stop link's written confirmation will), it files
 *   new approval files in a new dated folder and points O19 at them.
 *
 * ⛔ `--prove-red` FIRST PROVES THE BASELINE GREEN, then PLANTS EACH DEFECT IN MEMORY — a wrapper around the real door, one
 * rule of its bundle, one source string — and requires the claim that NAMES it to turn red. No file is written, no database is
 * touched, so this harness stays in `test:red-anchors` §4's in-process class. ⛔ No pattern here holds a backslash: an editing
 * tool decodes typed escapes (repo memory, 2026-10-02), so every invisible character is built from its code.
 *
 * Run: `npm run test:marketing-owner-save` · Red: `npm run red:marketing-owner-save`
 */
delete process.env.DATABASE_URL;

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const PROVE_RED = process.argv.includes("--prove-red");

const DOOR = await import("../src/lib/server/marketing/owner-save.ts");
const WSTORE = await import("../src/lib/server/marketing/wordings.ts");
const PSTORE = await import("../src/lib/server/legal/policy-lines.ts");
const WPURE = await import("../src/lib/marketing/marketing-wordings.ts");
const PPURE = await import("../src/lib/legal/policy-lines.ts");
const VIEW = await import("../src/app/admin/system/marketing-sms-view.ts");
const AUDIT = await import("../src/lib/server/audit.ts");

type PolicyTexts = { readonly en: string; readonly sw: string; readonly zh: string };
type Deps = Parameters<typeof DOOR.applyOwnerSave>[1];
type Rules = Deps["rules"];
type Outcome = Awaited<ReturnType<typeof DOOR.applyOwnerSave>>;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const BACKSLASH = String.fromCharCode(92);
const QUOTE = String.fromCharCode(34);
const BACKTICK = String.fromCharCode(96);
const NBSP = String.fromCharCode(0xa0);
const ZWSP = String.fromCharCode(0x200b);
const BOM = String.fromCharCode(0xfeff);
const BIDI = String.fromCharCode(0x202e);
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8").split(CR).join("");

/* ══ THE LABELS — each once, so a red case names exactly the claim it must turn red ═════════════════════════════════ */

const L = {
  o1: "O1 · the approval file is read as evidence — an invalid UTF-8 byte refused, a byte-order mark ignored and said, a backslash anywhere refused, the strict reader (a key twice at the top or inside, a number, a list, a trailing comma, a second object, a non-object, an unknown top-level key refused), a blank wording and one blank language refused, review only for a line that has today's words, and every text normalised by its record's own normaliser (the RG line's numbers bound) with its digest the sha256 of the STORED bytes",
  o2: "O2 · the gates' keys — G4 takes each of the nine wordings other than the source line and refuses source.phrase naming G5; G5 takes source.phrase alone and refuses a G4 wording naming G4; G10 takes each of the five public lines and refuses a wording naming G4; an unknown key and an unknown gate are refused; a wordings file never holds lines, nor a G10 file wordings",
  o3: "O3 · approvedOn — malformed and 30 February refused; a day after today in Dar es Salaam refused (the database's clock, the EAT day turning at 21:00 UTC); today and seven days ago pass, eight days ago is refused",
  o4: "O4 · who and why — screenOpsText on each (a blank, 121 characters, a line break, a bidi override, seven numerals, not text) and six numerals across the two together (a date in the reason, four plus three) refused bad_ops_text before the clock is read, with nothing recorded or written; six across the two pass",
  o5: "O5 · --expect — missing, blank, not key=digest, a short or non-hex digest, a key twice, a key missing, an extra key and a wrong digest each refused expect_mismatch in its own words, with nothing recorded or written; the exact digests of every text pass",
  o6: "O6 · the refusals come in the door's order — a request wrong in every way is refused for its who-and-why, then (fixed one at a time) for the file, --expect, the row and the card's rules — and none of the five records or writes anything",
  o7: "O7 · the row as it is now — a wordings or policy row that cannot be read is unreadable, one read only in part is read_in_part naming what was dropped; nothing recorded, nothing written; status exits 1 for both",
  o8: "O8 · the record's own rules, in the card's own words — a basis that never says 'agreed', a source line over 30 septets (the renderer's sentence) and an RG line promising what the code does not keep (a message limit) are refused invalid before the record, nothing written; a note never blocks a save",
  o9: "O9 · ⛔ RECORD FIRST — the applying row is recorded BEFORE the first row write, with actorId null, targetType SystemConfig, the record's key, via ops, the gate, the keys, every digest, the bases, by, reason, approvedBy Ali, approvedIn the Claude session and approvedOn; a record that is lost or throws refuses record_failed with the writer never called and the row untouched",
  o10: "O10 · ⛔ THE SAME WRITER, the card's own request — called once with exactly the card's builder's fields (base the count saved now; approve.<key>=1 only where the history is empty; review.<key>=1 only for a review), the officer 'ops: <by>' and the DATABASE's instant read for the write, never this PC's; the versions saved carry that author and instant and the file's normalised words byte for byte, and the RG page is stamped while a review moves nothing",
  o11: "O11 · a writer that refuses (a card save landing between the door's read and its write: stale) is recorded _refused with the writer's own reason, sentence and per-key problem, the operator's reason kept, and the card's version stands alone — and when that _refused record is lost, the door says so; a writer that throws is writer_failed, recorded _failed with the outcome unknown — never as a refusal; ⛔ a not_saved answer is decided by a FRESH read: over a write that landed (the factory's read-back failed after it committed) it goes down the applied path, recorded _applied with the writer's answer and never confirmed (done_unconfirmed, the save said landed), wordings and policy lines alike; over a write that did not show it is save_unconfirmed, recorded _failed with the outcome unknown, the operator sent to status — never 'nothing was written'",
  o12: "O12 · a row that does not read back as Ali's words after the writer said saved is read_back_mismatch, recorded _failed (step read_back) with what was found",
  o13: "O13 · NOTHING TO DO — the same file applied twice writes and records nothing the second time (exit 0); a file holding one saved and one new wording sends only the new one; today's words given to a never-saved line are nothing to do (and check says to approve review instead); a review twice is nothing to do; a review of a line that prints saved words is refused review_not_possible with nothing built, recorded or written",
  o14: "O14 · ⛔ THE FACTORY'S ADMIN ROW — after DONE nothing is pending, the door found THIS save's ADMIN row (author 'ops: <by>', changes exactly the keys moved — G10's page stamps included) and the applied record names it with the versions and the page versions; DONE ends with the redeploy instruction, and a G5 apply also says drafts saved before the line carry none (a G10 apply does not); each of DONE's conditions is held by itself — a reader that finds no such row, a lost _applied record, and an audit row still pending each end done_unconfirmed, exit 1, in their own words",
  o15: "O15 · the display rule — a version saved by 'ops: <by>' reads 'the ops door (<by>)' in its history and 'through the ops door (<by>)' in its status line, never 'by an admin'; a by that could be a number reads just 'the ops door'; a staff id reads its name, or 'an admin'; the live switch card names the door by the SAME rule; the page asks no user row for a door stamp and hands both cards the words; the two forms print them",
  o16: "O16 · the door's source — the CLI rewrites Railway's private host to the public proxy before it loads any src module (it statically names only node:fs — no import from, bare import or export from of anything else), refuses without a database before it loads one, checks production's environment (with its audit secret) before check and apply but not status, refuses both when the database's clock cannot be read — saying the database could not be reached, never to sync this PC — then refuses an apply on the clock and only warns a check, hands the door the audit log's durable reader and writes nothing itself; owner-save.ts imports no config store, names no audit-row reader and none of the card's suggestions, records before it calls the writers and calls them only through its deps as 'ops: <by>'; no src file imports the door",
  o17: "O17 · the wiring — test:/red:/ops:marketing-owner-save resolve to this suite and the door, and predeploy runs the suite once, in the Marketing SMS block: right after test:marketing-window, which follows test:marketing-settings (both of whose neighbours other suites pin)",
  o18: "O18 · check writes nothing and prints, for every text, its words exactly as they will be stored, the page versions it would stamp and the opening checks, and the exact apply line with every digest",
  o19: "O19 · ⭐ ALI'S APPROVALS OF 2026-10-07, AS COMMITTED — the three files are UTF-8 with no byte-order mark and no escape, read by the door's own reader as exactly their gate's keys and approvedOn 2026-10-07: G5 is his sentence (the one the decisions log quotes), G4 the nine wordings word for word the code's suggestions, G10 the five lines word for word spec Appendix B.2–B.6 in all three languages; every --expect in the door's header is the file's own digests; and on the memory twin each checks clean and applies in one save (G10 stamping each page once, every public opening check passing after it)",
  o20: "O20 · U13 · THE SEND WINDOW — the RG line is judged against the hours AS READ (the writer's own reader): a time the window does not use is refused invalid before the record in the card's words; under a 09:00–19:00 window '20:00' is refused while the default window passes it; hours that cannot be read refuse window_unreadable before the record with nothing written (check too), while a file without the RG line never asks; check prints the window it judged against",
} as const;

let pass = 0;
let fail = 0;
const failed: string[] = [];
const ok = (label: string, cond: boolean, detail = ""): void => {
  if (cond) pass++;
  else { fail++; failed.push(label); }
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
/** A claim's body may throw under a plant: that is the claim failing, said with what was thrown. */
async function claim(label: string, body: () => Promise<{ readonly cond: boolean; readonly detail: string }>): Promise<void> {
  try {
    const r = await body();
    ok(label, r.cond, r.detail);
  } catch (err) {
    ok(label, false, `threw: ${String((err as Error)?.message ?? err)}`);
  }
}

/* ══ FIXTURES ════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The database's clock: its first read (the approval's day) and every later one (the write's instant) — an odd millisecond,
 *  37 minutes on, so a version stamped with this PC's clock instead can never match it. */
const DB_NOW = Date.parse("2026-10-07T09:00:00.000Z"); // EAT 12:00, 7 October
const T_WRITE = DB_NOW + 37 * 60_000 + 789;
const iso = (ms: number): string => new Date(ms).toISOString();
const DAY = "2026-10-07";
const REASON = "approved by Ali in the Claude session";
const SOURCE_LINE = "Namba yako ipo orodhani kwetu.";
const OWN_FORM = WPURE.WORDING_DEFAULTS["basis.OWN_FORM"];
const OWN_FORM_EDIT = "This person gave their number to 50pick on a 50pick form, and agreed there to receive 50pick offers and news by SMS.";
const ADULT_TEST_A = "I confirm that the person who uses this number is aged 18 or older.";
const ADULT_TEST_B = "I confirm that whoever uses this number is 18 or older.";
/** A consent basis that never says the person agreed — the card's own rule refuses it. */
const NEVER_AGREED = "This person gave their number to 50pick on a 50pick form for offers and news by SMS.";
/** The first source line put to Ali on 2026-10-05 — 58 septets, refused by the renderer's own rule. */
const LONG_LINE = "Umepokea hii kwa sababu namba yako ipo kwenye orodha yetu.";

/* ══ WHAT ALI APPROVED — read from where it is written, never retyped ══════════════════════════════════════════════════ */

/** The spec whose Appendix B.2–B.6 Ali approved as G10 (the decisions log names it), and the log itself. */
const SPEC_PATH = "docs/marketing-specs/U33a-U37c-OD58.md";
const DECISIONS_PATH = "docs/COMPLIANCE-DECISIONS.md";
/** ⭐ The committed approvals of 2026-10-07 — the files the door's header applies. */
const APPROVALS_DIR = "docs/marketing-approvals/2026-10-07";
const GATES = ["G5", "G4", "G10"] as const;
type Gate = (typeof GATES)[number];
const approvalPath = (g: Gate): string => `${APPROVALS_DIR}/approval-${g}.json`;

/** Appendix B's sections and the line each one drafts. */
const APPENDIX_SECTIONS: ReadonlyArray<readonly [string, string]> = [
  ["B.2", "rg.marketing"], ["B.3", "privacy.smsGateway"], ["B.4", "privacy.lawfulLicence"], ["B.5", "privacy.lawfulConsent"], ["B.6", "profile.outreachNote"],
];

/**
 * ⭐ APPENDIX B.2–B.6, WORD FOR WORD — each section's `- **en:** "…"` (and sw, zh) item, its soft-wrapped lines joined by
 * one space (the spec wraps at a space, in every language), the quotes taken off. `null` when a section or a language is
 * not there: the suite then fails at once, never on a guess.
 */
function appendixB(spec: string): Record<string, PolicyTexts> | null {
  const lines = spec.split(LF);
  const out: Record<string, PolicyTexts> = {};
  for (const [section, key] of APPENDIX_SECTIONS) {
    const start = lines.findIndex((l) => l.startsWith(`### ${section} · ${BACKTICK}${key}${BACKTICK}`));
    if (start < 0) return null;
    const items: Record<string, string> = {};
    let lang: string | null = null;
    let parts: string[] = [];
    const flush = (): void => { if (lang !== null) items[lang] = parts.join(" "); lang = null; parts = []; };
    for (let i = start + 1; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith("#") || l === "---") break;
      const m = /^- [*][*](en|sw|zh):[*][*] (.*)$/.exec(l);
      if (m) { flush(); lang = m[1]; parts = [m[2]]; continue; }
      if (lang !== null && l.startsWith("  ")) { parts.push(l.slice(2)); continue; }
      flush();
    }
    flush();
    const unquoted = (t: string | undefined): string | null =>
      (t !== undefined && t.length >= 2 && t.startsWith(QUOTE) && t.endsWith(QUOTE) ? t.slice(1, -1) : null);
    const en = unquoted(items.en), sw = unquoted(items.sw), zh = unquoted(items.zh);
    if (en === null || sw === null || zh === null) return null;
    out[key] = { en, sw, zh };
  }
  return out;
}

const APPENDIX = appendixB(read(SPEC_PATH));
if (APPENDIX === null) throw new Error(`${SPEC_PATH} no longer holds Appendix B.2–B.6 as this suite reads it — the G10 approval cannot be checked`);

/* The Appendix B drafts (spec, "drafts for Ali — G4 and G10") — what a person pastes: plain spaces, the normaliser binds. */
const B2: PolicyTexts = APPENDIX["rg.marketing"];
const B3: PolicyTexts = APPENDIX["privacy.smsGateway"];
const B4: PolicyTexts = APPENDIX["privacy.lawfulLicence"];
const B5: PolicyTexts = APPENDIX["privacy.lawfulConsent"];
const B6: PolicyTexts = APPENDIX["profile.outreachNote"];

/** The five public lines, each with an Appendix B draft. */
const FIVE: Record<string, PolicyTexts> = {
  "rg.marketing": B2, "privacy.lawfulConsent": B5, "privacy.lawfulLicence": B4, "privacy.smsGateway": B3, "profile.outreachNote": B6,
};

const APPLYING = DOOR.OWNER_SAVE_ACTIONS.applying;
const APPLIED = DOOR.OWNER_SAVE_ACTIONS.applied;
const REFUSED = DOOR.OWNER_SAVE_ACTIONS.refused;
const FAILED = DOOR.OWNER_SAVE_ACTIONS.failed;

/** The send window as the Marketing SMS settings hold it by default (08:00–20:00 EAT), and one an owner might save. */
type WindowRead = Awaited<ReturnType<Deps["readSendWindow"]>>;
const WINDOW_DEFAULT: WindowRead = { ok: true, hours: { windowStartMinute: 480, windowEndMinute: 1200 } };
const WINDOW_9_TO_7: WindowRead = { ok: true, hours: { windowStartMinute: 540, windowEndMinute: 1140 } };
const WINDOW_UNREAD: WindowRead = { ok: false };

/** The digest the door must print and --expect must name — the first 12 hex digits of the sha256 of the STORED bytes —
 *  computed HERE, never by the door under test. */
const shaOf = (t: string): string => createHash("sha256").update(t, "utf8").digest("hex").slice(0, 12);
const lineShaOf = (t: PolicyTexts, review: boolean): string => shaOf(`${review ? `review${LF}` : ""}${t.en}${LF}${t.sw}${LF}${t.zh}`);

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const decode = (b: Uint8Array): string => new TextDecoder().decode(b);
const fileOf = (o: unknown): Uint8Array => enc(JSON.stringify(o));
const g4 = (wordings: Record<string, string>, approvedOn = DAY): Uint8Array => fileOf({ gate: "G4", approvedOn, wordings });
const g5 = (text = SOURCE_LINE, approvedOn = DAY): Uint8Array => fileOf({ gate: "G5", approvedOn, wordings: { "source.phrase": text } });
const g10 = (lines: Record<string, unknown>, approvedOn = DAY): Uint8Array => fileOf({ gate: "G10", approvedOn, lines });
/** The --expect a wordings file needs, from its texts (normalised as the record stores them). */
const expectW = (wordings: Record<string, string>): string =>
  Object.entries(wordings).map(([k, t]) => `${k}=${shaOf(WPURE.normalizeWording(t))}`).join(",");
/** The --expect a lines file needs — a review digests today's words, behind the word. */
const expectL = (lines: Record<string, PolicyTexts | "review">): string =>
  Object.entries(lines).map(([k, t]) => {
    const key = k as "rg.marketing";
    return t === "review"
      ? `${k}=${lineShaOf(PPURE.normalizedPolicyTexts(key, PPURE.POLICY_LINE_DEFAULTS[key]), true)}`
      : `${k}=${lineShaOf(PPURE.normalizedPolicyTexts(key, t), false)}`;
  }).join(",");
const G5_EXPECT = expectW({ "source.phrase": SOURCE_LINE });
/** A G5 file whose text holds a JSON escape — every reader of the file would see the escape, not the character. */
const SLASHED_G5 = enc(`{"gate":"G5","approvedOn":"${DAY}","wordings":{"source.phrase":"Namba${BACKSLASH}u00a0yako ipo orodhani kwetu."}}`);
const TWICE_G5 = enc(`{"gate":"G5","gate":"G5","approvedOn":"${DAY}","wordings":{"source.phrase":"${SOURCE_LINE}"}}`);

let seq = 0;
/** Letters only — so a tag never adds a numeral to the door's six-numeral rule. */
const tag = (): string => {
  let n = seq++;
  let s = "";
  do { s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26); } while (n > 0);
  return s;
};
/** A fresh `by` per case, so one case's ADMIN row is never another's. */
const BY = (what: string): string => `Claude for Ali ${what} ${tag()}`;

/** Value equality, key order ignored — how Postgres compares jsonb. */
const sameValue = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object).sort(), kb = Object.keys(b as object).sort();
  return ka.join(",") === kb.join(",") && ka.every((k) => sameValue((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
};

/* ══ THE WORLD — the real stores over in-memory rows, the real audit queue, a stand-in chain for the door's own rows ══ */

type FakeRow = {
  readonly deps: unknown;
  /** Row writes ATTEMPTED (a dropped one counts: the writer did try). */
  readonly writes: () => number;
  readonly row: () => Record<string, unknown> | null;
  readonly failLoads: (on: boolean) => void;
  /** The next `n` reads AFTER the next write fail — `n = 1` is the factory's own read-back (`setVerified`), so the writer
   *  answers `not_saved` over a write that committed (`saveConfig` swallows its errors; the read-back decides). */
  readonly failReadsAfterWrite: (n: number) => void;
  /** Writes are swallowed and never land — `saveConfig` answering as if they had (it never throws). */
  readonly dropWrites: (on: boolean) => void;
};

/** ⭐ One SystemConfig row that answers like Postgres: every write kept as a JSON copy and every read a JSON copy back, so the
 *  factory's read-back compares what really round-tripped. `failLoads`: the store cannot answer. */
function fakeRow(seed: unknown = null): FakeRow {
  const copy = (v: unknown): unknown => (v === null || v === undefined ? null : JSON.parse(JSON.stringify(v)));
  let stored: unknown = copy(seed);
  let writes = 0;
  let failing = false;
  let afterWrite = 0;
  let armed = 0;
  let dropping = false;
  const unanswered = { ok: false, error: "the store did not answer" } as const;
  return {
    deps: {
      hasDatabase: () => true,
      loadConfigResult: async () => {
        if (failing) return unanswered;
        if (armed > 0) { armed--; return unanswered; }
        return { ok: true, value: copy(stored) };
      },
      saveConfig: async (_key: string, value: unknown) => {
        writes++;
        if (!dropping) stored = copy(value);
        armed = afterWrite;
        afterWrite = 0;
      },
    },
    writes: () => writes,
    row: () => copy(stored) as Record<string, unknown> | null,
    failLoads: (on: boolean) => { failing = on; },
    failReadsAfterWrite: (n: number) => { afterWrite = n; },
    dropWrites: (on: boolean) => { dropping = on; },
  };
}

type ChainRow = {
  readonly action: string;
  readonly entry: Record<string, unknown>;
  readonly payload: Record<string, unknown>;
  /** Row writes (both records) that had happened when this row was recorded. */
  readonly writesAtCall: number;
  readonly id: string;
};
type Call = { readonly record: "wordings" | "policy"; readonly patch: Record<string, string>; readonly officer: string; readonly nowIso: string | undefined };

type World = {
  readonly wRow: FakeRow;
  readonly pRow: FakeRow;
  readonly wStore: ReturnType<typeof WSTORE.__wordingsStoreForTest>;
  readonly pStore: ReturnType<typeof PSTORE.__policyLinesStoreForTest>;
  readonly rows: ChainRow[];
  readonly calls: Call[];
  readonly deps: Deps;
  readonly writes: () => number;
  readonly clockReads: () => number;
};

type WorldOpts = {
  readonly wSeed?: unknown;
  readonly pSeed?: unknown;
  /** The n-th read of the database's clock (1, 2, …). */
  readonly clock?: (n: number) => number | null;
  /** COMPLIANCE actions the chain loses (answers not recorded), or refuses with a throw. */
  readonly lose?: readonly string[];
  readonly throwOn?: readonly string[];
  readonly adminRows?: Deps["adminRows"];
  /** After the chain records a row — a card save landing between the door's read and its write, say. */
  readonly afterRecord?: (action: string, w: World) => Promise<void>;
  /** U13 · the Marketing SMS settings' send window as the policy WRITER reads it — and the door, through the same reader
   *  (08:00–20:00 unless a case saves other hours, or makes them unreadable). */
  readonly window?: WindowRead;
};

function makeWorld(rules: Rules, o: WorldOpts = {}): World {
  const wRow = fakeRow(o.wSeed ?? null);
  const pRow = fakeRow(o.pSeed ?? null);
  const windowRead = async (): Promise<WindowRead> => o.window ?? WINDOW_DEFAULT;
  const wStore = WSTORE.__wordingsStoreForTest({ deps: wRow.deps as never });
  const pStore = PSTORE.__policyLinesStoreForTest({ deps: pRow.deps as never, window: windowRead });
  const rows: ChainRow[] = [];
  const calls: Call[] = [];
  let clockReads = 0;
  const writes = (): number => wRow.writes() + pRow.writes();
  const clock = o.clock ?? ((n: number): number | null => (n === 1 ? DB_NOW : T_WRITE));
  let self: World | null = null;
  const chainAudit = async (entry: Record<string, unknown>): Promise<unknown> => {
    const action = String(entry.action);
    if (o.throwOn?.includes(action)) throw new Error("the chain did not answer");
    if (o.lose?.includes(action)) return { recorded: false, unrecorded: "PERSIST_FAILED" };
    const copy = JSON.parse(JSON.stringify(entry)) as Record<string, unknown>;
    const id = `cmp_${tag()}`;
    rows.push({ action, entry: copy, payload: (copy.payload ?? {}) as Record<string, unknown>, writesAtCall: writes(), id });
    if (o.afterRecord && self !== null) await o.afterRecord(action, self);
    return { recorded: true, id };
  };
  const deps: Deps = {
    readWordings: () => wStore.reloadHistories(),
    saveWordings: (patch, officer, nowIso) => {
      calls.push({ record: "wordings", patch: { ...(patch as Record<string, string>) }, officer, nowIso });
      return wStore.saveMarketingWordings(patch, officer, nowIso);
    },
    readPolicy: () => pStore.reloadRecord(),
    savePolicy: (patch, officer, nowIso) => {
      calls.push({ record: "policy", patch: { ...(patch as Record<string, string>) }, officer, nowIso });
      return pStore.savePolicyLines(patch, officer, nowIso);
    },
    readSendWindow: windowRead,
    audit: chainAudit as Deps["audit"],
    flush: () => AUDIT.auditFlush(),
    pending: () => AUDIT.auditPending(),
    adminRows: o.adminRows ?? ((t: string, id: string) => AUDIT.getAuditForTargetDurable(t, id, { limit: 500 })),
    dbNowMs: async () => { clockReads++; return clock(clockReads); },
    hasDatabase: () => true,
    rules,
  };
  self = { wRow, pRow, wStore, pStore, rows, calls, deps, writes, clockReads: () => clockReads };
  return self;
}

/* ══ THE IMPLEMENTATION UNDER TEST — swappable, so a red case can plant one piece ═══════════════════════════════════ */

const SRC = {
  cli: "scripts/ops/marketing-owner-save.mts",
  door: "src/lib/server/marketing/owner-save.ts",
  page: "src/app/admin/system/page.tsx",
  wForm: "src/app/admin/system/marketing-wordings-form.tsx",
  pForm: "src/app/admin/system/policy-lines-form.tsx",
} as const;

/* Every STATIC module specifier a (decommented) source names — `import … from "…"`, a bare `import "…"`, and
   `export … from "…"`, on one line or across several — and never a dynamic `import("…")`, which is how the door's CLI
   loads src. ⛔ No backslash: the whitespace class is built from its codes. */
const SPACE = `[ ${String.fromCharCode(9, 10, 13)}]`;
/** A statement starting with `import` or `export` — at a line's start or after a `;` — and its text up to its `;`. */
const STATEMENT = new RegExp(`(?:^|;)${SPACE}*(import|export)(?![A-Za-z0-9_$])([^;]*)`, "gm");
const BARE_SPEC = new RegExp(`^${SPACE}*["']([^"']+)["']`);
const FROM_SPEC = new RegExp(`(?<![A-Za-z0-9_$])from${SPACE}*["']([^"']+)["']`);
function staticSpecifiers(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(STATEMENT)) {
    const rest = m[2] ?? "";
    if (m[1] === "import" && rest.trimStart().startsWith("(")) continue;
    const spec = (m[1] === "import" ? BARE_SPEC.exec(rest)?.[1] : undefined) ?? FROM_SPEC.exec(rest)?.[1];
    if (spec !== undefined) out.push(spec);
  }
  return out;
}

/** Every src file that loads the door (comments aside) — the door is the CLI's and this suite's, nobody else's. */
function doorImporters(): { readonly files: number; readonly importers: readonly string[] } {
  let files = 0;
  const importers: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (!/[.](ts|tsx|mts|cts|js|mjs|cjs)$/.test(name)) continue;
      files++;
      const rel = relative(ROOT, full).split(BACKSLASH).join("/");
      if (rel !== SRC.door && decomment(readFileSync(full, "utf8")).includes("marketing/owner-save")) importers.push(rel);
    }
  };
  walk(join(ROOT, "src"));
  return { files, importers };
}

type Impl = {
  readonly apply: typeof DOOR.applyOwnerSave;
  readonly check: typeof DOOR.checkOwnerSave;
  readonly status: typeof DOOR.ownerSaveStatus;
  readonly readApproval: typeof DOOR.readApproval;
  /** The bundle every world hands the door. */
  readonly rules: Rules;
  readonly savedByView: typeof VIEW.savedByView;
  readonly opsDoorName: typeof VIEW.opsDoorName;
  readonly cardView: typeof VIEW.marketingSmsCardView;
  /** Decommented sources, by path. */
  readonly sources: Readonly<Record<string, string>>;
  readonly importers: { readonly files: number; readonly importers: readonly string[] };
  readonly pkg: string;
  /** ⭐ O19 · the committed approval files, as bytes on disk; the CLI as written (its header carries the operator's lines);
   *  the spec and the decisions log the approvals are held to. */
  readonly approvals: Readonly<Record<Gate, Uint8Array>>;
  readonly cliRaw: string;
  readonly spec: string;
  readonly decisions: string;
};

const REAL: Impl = {
  apply: DOOR.applyOwnerSave,
  check: DOOR.checkOwnerSave,
  status: DOOR.ownerSaveStatus,
  readApproval: DOOR.readApproval,
  rules: DOOR.OWNER_SAVE_RULES,
  savedByView: VIEW.savedByView,
  opsDoorName: VIEW.opsDoorName,
  cardView: VIEW.marketingSmsCardView,
  sources: Object.fromEntries(Object.values(SRC).map((rel) => [rel, decomment(read(rel))])),
  importers: doorImporters(),
  pkg: read("package.json"),
  approvals: Object.fromEntries(GATES.map((g) => [g, new Uint8Array(readFileSync(join(ROOT, approvalPath(g))))])) as Record<Gate, Uint8Array>,
  cliRaw: read(SRC.cli),
  spec: read(SPEC_PATH),
  decisions: read(DECISIONS_PATH),
};

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════════════════ */

async function runAssertions(impl: Impl, prefix: string): Promise<void> {
  const p = (label: string): string => `${prefix}${label}`;
  const world = (o: WorldOpts = {}): World => makeWorld(impl.rules, o);
  const clean = (w: World): boolean => w.rows.length === 0 && w.writes() === 0 && w.calls.length === 0;
  const apply = (w: World, bytes: Uint8Array, expect: unknown, by: unknown = BY("door"), reason: unknown = REASON): Promise<Outcome> =>
    impl.apply({ fileBytes: bytes, by, reason, expect }, w.deps);
  type Reading = ReturnType<typeof DOOR.readApproval>;
  const says = (r: Reading, needle: string): boolean => !r.ok && r.problems.some((x) => x.includes(needle));
  const verdict = (checks: Record<string, boolean>): { cond: boolean; detail: string } => {
    const wrong = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    return { cond: wrong.length === 0, detail: wrong.length === 0 ? `${Object.keys(checks).length} checks` : `wrong: ${wrong.join(", ")}` };
  };
  const SEED_OWN_FORM = { "basis.OWN_FORM": [{ v: 1, text: OWN_FORM, savedAt: "2026-10-04T08:00:00.000Z", savedBy: "usr_owner_a" }] };

  // ── O1 · THE APPROVAL FILE, READ AS EVIDENCE ─────────────────────────────────────────────────────────────────────
  await claim(p(L.o1), async () => {
    const R = (bytes: Uint8Array, now = DB_NOW): Reading => impl.readApproval(bytes, now);
    const g5Body = (body: string): Uint8Array => enc(`{"gate":"G5","approvedOn":"${DAY}","wordings":${body}}`);
    const plain = R(g5());
    const bom = R(enc(BOM + JSON.stringify({ gate: "G5", approvedOn: DAY, wordings: { "source.phrase": SOURCE_LINE } })));
    const review = R(g10({ "privacy.lawfulConsent": "review" }));
    const consentToday = PPURE.normalizedPolicyTexts("privacy.lawfulConsent", PPURE.POLICY_LINE_DEFAULTS["privacy.lawfulConsent"]);
    const messy = R(g5(`  Namba   yako${ZWSP} ipo orodhani kwetu.  `));
    const rg = R(g10({ "rg.marketing": B2 }));
    const rgStored = PPURE.normalizedPolicyTexts("rg.marketing", B2);
    return verdict({
      plain: plain.ok && plain.approval.record === "wordings" && plain.approval.wordings.length === 1
        && plain.approval.wordings[0].text === SOURCE_LINE && plain.approval.wordings[0].sha12 === shaOf(SOURCE_LINE),
      invalidUtf8: says(R(new Uint8Array([0x7b, 0xff, 0x7d])), "not valid UTF-8"),
      byteOrderMark: bom.ok && bom.notes.some((n) => n.includes("byte-order mark")),
      backslash: says(R(SLASHED_G5), "backslash"),
      keyTwiceAtTheTop: says(R(TWICE_G5), "appears twice"),
      keyTwiceInside: says(R(enc(`{"gate":"G4","approvedOn":"${DAY}","wordings":{"adult.test":"${ADULT_TEST_A}","adult.test":"${ADULT_TEST_B}"}}`)), "appears twice"),
      number: says(R(g5Body(`{"source.phrase":30}`)), "only objects and texts"),
      list: says(R(g5Body(`["${SOURCE_LINE}"]`)), "only objects and texts"),
      trailingComma: says(R(g5Body(`{"source.phrase":"${SOURCE_LINE}",}`)), "a key in double quotes"),
      secondObject: says(R(enc(`${JSON.stringify({ gate: "G5", approvedOn: DAY, wordings: { "source.phrase": SOURCE_LINE } })}{}`)), "something follows"),
      notAnObject: says(R(enc(`"G5"`)), "one object"),
      unknownTopKey: says(R(fileOf({ gate: "G5", approvedOn: DAY, wordings: { "source.phrase": SOURCE_LINE }, note: "kept" })), "is not part of an approval file"),
      blankWording: says(R(g5(`   ${ZWSP}  `)), "is blank"),
      blankLanguage: says(R(g10({ "rg.marketing": { ...B2, sw: `  ${ZWSP} ` } })), "is blank in Swahili"),
      reviewOfNothing: says(R(g10({ "privacy.lawfulLicence": "review" })), "marked reviewed"),
      reviewOfToday: review.ok && review.approval.record === "policy" && review.approval.lines[0].review
        && review.approval.lines[0].sha12 === lineShaOf(consentToday, true),
      normalisedAsStored: messy.ok && messy.approval.record === "wordings" && messy.approval.wordings[0].text === SOURCE_LINE
        && messy.approval.wordings[0].sha12 === shaOf(SOURCE_LINE),
      rgNumbersBound: rg.ok && rg.approval.record === "policy" && rgStored.sw.includes(`miaka${NBSP}18`)
        && rg.approval.lines[0].texts.sw === rgStored.sw && rg.approval.lines[0].sha12 === lineShaOf(rgStored, false),
    });
  });

  // ── O2 · THE GATES' KEYS ─────────────────────────────────────────────────────────────────────────────────────────
  await claim(p(L.o2), async () => {
    const R = (bytes: Uint8Array): Reading => impl.readApproval(bytes, DB_NOW);
    const nine = WPURE.WORDING_KEYS.filter((k) => k !== "source.phrase");
    return verdict({
      g4IsTheNine: [...DOOR.GATE_KEYS.G4].sort().join("|") === [...nine].sort().join("|"),
      g4TakesEach: nine.every((k) => R(g4({ [k]: WPURE.WORDING_DEFAULTS[k] })).ok),
      g5IsTheLineAlone: JSON.stringify(DOOR.GATE_KEYS.G5) === '["source.phrase"]' && R(g5()).ok,
      g10IsTheFive: [...DOOR.GATE_KEYS.G10].sort().join("|") === [...PPURE.POLICY_LINE_KEYS].sort().join("|"),
      g10TakesEach: Object.entries(FIVE).every(([k, t]) => R(g10({ [k]: t })).ok),
      sourceLineInG4: says(R(g4({ "source.phrase": SOURCE_LINE })), "belongs to G5"),
      g4WordingInG5: says(R(fileOf({ gate: "G5", approvedOn: DAY, wordings: { "basis.OWN_FORM": OWN_FORM } })), "belongs to G4"),
      wordingInG10: says(R(g10({ "adult.test": { en: ADULT_TEST_A, sw: ADULT_TEST_A, zh: ADULT_TEST_A } })), "belongs to G4"),
      lineInG4: says(R(g4({ "rg.marketing": "No marketing messages to anyone under 18." })), "belongs to G10"),
      unknownWording: says(R(g4({ "basis.NOPE": OWN_FORM })), "is not a marketing wording"),
      unknownLine: says(R(g10({ "legal.nope": B3 })), "is not a public policy line"),
      unknownGate: says(R(fileOf({ gate: "G6", approvedOn: DAY, wordings: { "source.phrase": SOURCE_LINE } })), "must be G4, G5 or G10"),
      linesInAWordingsFile: says(R(fileOf({ gate: "G5", approvedOn: DAY, lines: { "rg.marketing": B2 } })), "never “lines”"),
      wordingsInAG10File: says(R(fileOf({ gate: "G10", approvedOn: DAY, wordings: { "source.phrase": SOURCE_LINE }, lines: { "rg.marketing": B2 } })), "never “wordings”"),
      nothingNamed: says(R(fileOf({ gate: "G4", approvedOn: DAY, wordings: {} })), "names no wording"),
    });
  });

  // ── O3 · APPROVEDON, AGAINST THE DATABASE'S EAT DAY ────────────────────────────────────────────────────────────
  await claim(p(L.o3), async () => {
    const at = (approvedOn: string, now = DB_NOW): Reading => impl.readApproval(g5(SOURCE_LINE, approvedOn), now);
    return verdict({
      malformed: says(at("7 Oct 2026"), "written YYYY-MM-DD") && says(at("2026-10-7"), "written YYYY-MM-DD"),
      february30: says(at("2026-02-30"), "not a calendar date"),
      tomorrow: says(at("2026-10-08"), "after today in Dar es Salaam"),
      eatDayTurnsAt21Utc: at("2026-10-08", Date.parse("2026-10-07T21:30:00.000Z")).ok,
      notYetTurned: says(at("2026-10-08", Date.parse("2026-10-07T20:59:59.000Z")), "after today in Dar es Salaam"),
      today: at(DAY).ok,
      sevenDaysAgo: at("2026-09-30").ok,
      eightDaysAgo: says(at("2026-09-29"), "8 days ago"),
    });
  });

  // ── O4 · WHO AND WHY ─────────────────────────────────────────────────────────────────────────────────────────────
  await claim(p(L.o4), async () => {
    const cases: ReadonlyArray<readonly [string, unknown, unknown]> = [
      ["a blank by", "", REASON],
      ["121 characters", "x".repeat(121), REASON],
      ["a line break", `Claude${LF}for Ali`, REASON],
      ["a bidi override", `Claude ${BIDI}for Ali`, REASON],
      ["seven numerals", "Claude for Ali 1234567", REASON],
      ["not text", 42, REASON],
      ["a date in the reason", "Claude for Ali", "approved on 2026-10-07"],
      ["four and three across the two", "Claude for Ali 1234", "approved 567"],
    ];
    const wrong: string[] = [];
    for (const [name, by, reason] of cases) {
      const w = world();
      const o = await apply(w, g5(), G5_EXPECT, by, reason);
      if (o.code !== "bad_ops_text" || o.exitCode !== 1 || !clean(w) || w.clockReads() !== 0) wrong.push(`${name} → ${o.code}`);
    }
    const w6 = world();
    const six = await apply(w6, g5(), G5_EXPECT, `Claude for Ali 123 ${tag()}`, "approved 456");
    if (six.code !== "done") wrong.push(`six across the two → ${six.code}`);
    return { cond: wrong.length === 0, detail: wrong.length === 0 ? `${cases.length} refused before the clock, six across pass` : wrong.join(" · ") };
  });

  // ── O5 · --EXPECT ────────────────────────────────────────────────────────────────────────────────────────────────
  await claim(p(L.o5), async () => {
    const files = { "basis.OWN_FORM": OWN_FORM, "adult.test": ADULT_TEST_A };
    const good = expectW(files);
    const [a, b] = good.split(",");
    const keyOfA = a.slice(0, a.indexOf("=") + 1);
    const variants: ReadonlyArray<readonly [string, unknown, string]> = [
      ["missing", undefined, "--expect is missing"],
      ["blank", "   ", "--expect is missing"],
      ["not key=digest", "basis.OWN_FORM", "which is not key=sha12"],
      ["a short digest", `${a.slice(0, -1)},${b}`, "not 12 hex digits"],
      ["not hex", `${keyOfA}zzzzzzzzzzzz,${b}`, "not 12 hex digits"],
      ["a key twice", `${a},${a},${b}`, "twice"],
      ["a key missing", a, "names no digest for"],
      ["an extra key", `${good},adult.list=000000000000`, "which this file does not hold"],
      ["a wrong digest", `${keyOfA}${"0".repeat(12)},${b}`, "is not the text --expect names"],
    ];
    const wrong: string[] = [];
    for (const [name, expect, needle] of variants) {
      const w = world();
      const o = await apply(w, g4(files), expect);
      if (o.code !== "expect_mismatch" || !o.lines.some((l) => l.includes(needle)) || !clean(w)) wrong.push(`${name} → ${o.code}`);
    }
    const w = world();
    const exact = await apply(w, g4(files), good);
    if (exact.code !== "done") wrong.push(`the exact digests → ${exact.code}`);
    return { cond: wrong.length === 0, detail: wrong.length === 0 ? `${variants.length} refused, the exact digests pass` : wrong.join(" · ") };
  });

  // ── O6 · THE ORDER OF THE REFUSALS ───────────────────────────────────────────────────────────────────────────────
  await claim(p(L.o6), async () => {
    const ruleBreaker = g4({ "basis.OWN_FORM": NEVER_AGREED });
    const ruleExpect = expectW({ "basis.OWN_FORM": NEVER_AGREED });
    const run = async (by: string, bytes: Uint8Array, expect: string, rowFails: boolean): Promise<{ code: string; clean: boolean }> => {
      const w = world();
      w.wRow.failLoads(rowFails);
      const o = await apply(w, bytes, expect, by);
      return { code: o.code, clean: clean(w) };
    };
    const steps = [
      await run("", SLASHED_G5, "x", true),
      await run(BY("order"), SLASHED_G5, "x", true),
      await run(BY("order"), ruleBreaker, "x", true),
      await run(BY("order"), ruleBreaker, ruleExpect, true),
      await run(BY("order"), ruleBreaker, ruleExpect, false),
    ];
    const order = steps.map((s) => s.code).join(" → ");
    return {
      cond: order === "bad_ops_text → bad_file → expect_mismatch → unreadable → invalid" && steps.every((s) => s.clean),
      detail: order,
    };
  });

  // ── O7 · THE ROW AS IT IS NOW ────────────────────────────────────────────────────────────────────────────────────
  await claim(p(L.o7), async () => {
    const w1 = world();
    w1.wRow.failLoads(true);
    const o1 = await apply(w1, g5(), G5_EXPECT);
    const w2 = world({ wSeed: { "adult.test": [{ v: 1, text: "x", savedAt: "not an instant", savedBy: "usr_x" }], nope: [] } });
    const o2 = await apply(w2, g5(), G5_EXPECT);
    const named = o2.lines.some((l) => l.includes("adult.test") && l.includes("nope"));
    const lines = { "privacy.smsGateway": B3 };
    const w3 = world();
    w3.pRow.failLoads(true);
    const o3 = await apply(w3, g10(lines), expectL(lines));
    const w4 = world({ pSeed: { "rg.marketing": "not a history" } });
    const o4 = await apply(w4, g10(lines), expectL(lines));
    const s1 = await impl.status(w1.deps);
    const s2 = await impl.status(w2.deps);
    const s4 = await impl.status(w4.deps);
    return verdict({
      wordingsUnreadable: o1.code === "unreadable" && clean(w1),
      wordingsInPart: o2.code === "read_in_part" && named && clean(w2),
      policyUnreadable: o3.code === "unreadable" && clean(w3),
      policyInPart: o4.code === "read_in_part" && o4.lines.some((l) => l.includes("rg.marketing")) && clean(w4),
      statusSaysSo: s1.code === "status_unreadable" && s1.exitCode === 1 && s2.exitCode === 1 && s4.exitCode === 1
        && s2.lines.some((l) => l.includes("read only in part")),
    });
  });

  // ── O8 · THE RECORD'S OWN RULES, IN THE CARD'S OWN WORDS ───────────────────────────────────────────────────────
  await claim(p(L.o8), async () => {
    const w1 = world();
    const o1 = await apply(w1, g4({ "basis.OWN_FORM": NEVER_AGREED }), expectW({ "basis.OWN_FORM": NEVER_AGREED }));
    const w2 = world();
    const o2 = await apply(w2, g5(LONG_LINE), expectW({ "source.phrase": LONG_LINE }));
    const renderer = WPURE.wordingProblems("source.phrase", LONG_LINE).map((x) => x.sentence);
    // A frequency cap is a promise the code does not keep (U14 is not built). ⚠️ Not the late-night window: U13 keeps it.
    const capped = { "rg.marketing": { ...B2, en: `${B2.en} There is a message limit for every person.` } };
    const w3 = world();
    const o3 = await apply(w3, g10(capped), expectL(capped));
    const noted = { "rg.marketing": B2 };
    const w4 = world();
    const c4 = await impl.check({ fileBytes: g10(noted), filePath: "g10.json" }, w4.deps);
    const o4 = await apply(w4, g10(noted), expectL(noted));
    return verdict({
      neverAgreed: o1.code === "invalid" && clean(w1)
        && o1.lines.some((l) => l.includes("“basis.OWN_FORM”") && l.includes(WPURE.WORDING_SENTENCE.consentNotStated)),
      sourceLineTooLong: o2.code === "invalid" && clean(w2) && renderer.length > 0 && renderer.every((s) => o2.lines.some((l) => l.includes(s))),
      promiseNotKept: o3.code === "invalid" && clean(w3) && o3.lines.some((l) => l.includes("“rg.marketing” (English)") && l.includes("does not do this yet")),
      aNoteNeverBlocks: c4.code === "checked" && c4.lines.some((l) => l.includes("note:")) && o4.code === "done",
    });
  });

  // ── O9 · ⛔ RECORD FIRST ─────────────────────────────────────────────────────────────────────────────────────────
  await claim(p(L.o9), async () => {
    const w = world();
    const by = BY("record first");
    const o = await apply(w, g5(), G5_EXPECT, by);
    const first = w.rows[0];
    const e = first?.entry ?? {};
    const pl = first?.payload ?? {};
    const lost = world({ lose: [APPLYING] });
    const oLost = await apply(lost, g5(), G5_EXPECT);
    const threw = world({ throwOn: [APPLYING] });
    const oThrew = await apply(threw, g5(), G5_EXPECT);
    const untouched = (x: World): boolean => x.writes() === 0 && x.calls.length === 0 && x.wRow.row() === null;
    return verdict({
      done: o.code === "done" && w.writes() > 0,
      recordedBeforeAnyWrite: first?.action === APPLYING && first.writesAtCall === 0,
      itsShape: e.category === "COMPLIANCE" && e.actorId === null && e.targetType === "SystemConfig" && e.targetId === WSTORE.MARKETING_WORDINGS_KEY,
      alisApproval: pl.via === "ops" && pl.gate === "G5" && JSON.stringify(pl.keys) === '["source.phrase"]'
        && sameValue(pl.sha, { "source.phrase": shaOf(SOURCE_LINE) }) && sameValue(pl.bases, { "source.phrase": 0 })
        && pl.by === by && pl.reason === REASON && pl.approvedBy === "Ali" && pl.approvedIn === "the Claude session" && pl.approvedOn === DAY,
      aLostRecordWritesNothing: oLost.code === "record_failed" && oLost.exitCode === 1 && untouched(lost),
      aThrownRecordWritesNothing: oThrew.code === "record_failed" && untouched(threw),
    });
  });

  // ── O10 · ⛔ THE SAME WRITER, THE CARD'S OWN REQUEST ──────────────────────────────────────────────────────────
  await claim(p(L.o10), async () => {
    const w = world({ wSeed: SEED_OWN_FORM });
    const by = BY("same writer");
    const officer = `ops: ${by}`;
    const typed = `  ${ADULT_TEST_A.replace(" person", "   person")}${ZWSP} `;
    const files = { "basis.OWN_FORM": OWN_FORM_EDIT, "adult.test": typed };
    const o = await apply(w, g4(files), expectW(files), by);
    const call = w.calls[0];
    const row = w.wRow.row() ?? {};
    const own = (row["basis.OWN_FORM"] ?? []) as unknown[];
    const adult = (row["adult.test"] ?? []) as unknown[];

    const pw = world();
    const pby = BY("same writer lines");
    const pOfficer = `ops: ${pby}`;
    const plines = { "rg.marketing": B2, "privacy.lawfulConsent": "review" as const };
    const po = await apply(pw, g10(plines), expectL(plines), pby);
    const nB2 = PPURE.normalizedPolicyTexts("rg.marketing", B2);
    const nC = PPURE.normalizedPolicyTexts("privacy.lawfulConsent", PPURE.POLICY_LINE_DEFAULTS["privacy.lawfulConsent"]);
    const pCall = pw.calls[0];
    const prow = pw.pRow.row() ?? {};
    const rg = (prow["rg.marketing"] ?? []) as unknown[];
    const consent = (prow["privacy.lawfulConsent"] ?? []) as unknown[];
    const rgCode = PPURE.POLICY_PAGES.rg.codeVersion;
    return verdict({
      wordingsDone: o.code === "done",
      wordingsOnce: w.calls.length === 1 && call?.record === "wordings",
      theCardsRequest: sameValue(call?.patch, {
        "basis.OWN_FORM": OWN_FORM_EDIT, "base.basis.OWN_FORM": "1",
        "adult.test": ADULT_TEST_A, "base.adult.test": "0", "approve.adult.test": "1",
      }),
      theDoorsStampAndTheDatabasesInstant: call?.officer === officer && call?.nowIso === iso(T_WRITE),
      savedByteForByte: own.length === 2 && adult.length === 1 && sameValue(own[0], SEED_OWN_FORM["basis.OWN_FORM"][0])
        && sameValue(own[1], { v: 2, text: OWN_FORM_EDIT, savedAt: iso(T_WRITE), savedBy: officer })
        && sameValue(adult[0], { v: 1, text: ADULT_TEST_A, savedAt: iso(T_WRITE), savedBy: officer }),
      linesDone: po.code === "done" && pw.calls.length === 1 && pCall?.record === "policy",
      linesRequest: sameValue(pCall?.patch, {
        "text.rg.marketing.en": nB2.en, "text.rg.marketing.sw": nB2.sw, "text.rg.marketing.zh": nB2.zh, "base.rg.marketing": "0",
        "text.privacy.lawfulConsent.en": nC.en, "text.privacy.lawfulConsent.sw": nC.sw, "text.privacy.lawfulConsent.zh": nC.zh,
        "base.privacy.lawfulConsent": "0", "review.privacy.lawfulConsent": "1",
      }) && pCall?.officer === pOfficer && pCall?.nowIso === iso(T_WRITE),
      linesSaved: sameValue(rg[0], { rev: 1, en: nB2.en, sw: nB2.sw, zh: nB2.zh, codeDefault: PPURE.policyDefaultFingerprint("rg.marketing"), savedAt: iso(T_WRITE), savedBy: pOfficer })
        && sameValue(consent[0], { rev: 1, reviewedDefault: PPURE.policyDefaultFingerprint("privacy.lawfulConsent"), savedAt: iso(T_WRITE), savedBy: pOfficer }),
      rgStampedReviewMovesNothing: sameValue(prow["version.rg"], { stamp: PPURE.nextPolicyVersion(rgCode, T_WRITE), base: rgCode })
        && (prow["version.privacy"] ?? null) === null,
    });
  });

  // ── O11 · A WRITER THAT REFUSES OR THROWS ───────────────────────────────────────────────────────────────────────
  await claim(p(L.o11), async () => {
    const CARD_LINE = "Namba yako iko orodhani.";
    /** A card save landing between the door's read and its write. */
    const cardSaves = async (action: string, self: World): Promise<void> => {
      if (action !== APPLYING) return;
      await self.wStore.saveMarketingWordings(
        { "source.phrase": CARD_LINE, "base.source.phrase": "0", "approve.source.phrase": "1" }, "usr_card_officer", iso(DB_NOW + 60_000),
      );
    };
    const w = world({ afterRecord: cardSaves });
    const o = await apply(w, g5(), G5_EXPECT);
    const refusedRow = w.rows.find((r) => r.action === REFUSED);
    const problems = (refusedRow?.payload.problems ?? {}) as Record<string, ReadonlyArray<{ readonly code?: unknown; readonly sentence?: unknown }>>;
    const staleProblem = problems["source.phrase"]?.[0];
    const history = ((w.wRow.row() ?? {})["source.phrase"] ?? []) as Array<Record<string, unknown>>;
    const t = world();
    const threw = await impl.apply(
      { fileBytes: g5(), by: BY("writer threw"), reason: REASON, expect: G5_EXPECT },
      { ...t.deps, saveWordings: async () => { throw new Error("the writer fell over"); } },
    );
    const tFailed = t.rows.find((r) => r.action === FAILED);
    // The _refused record itself lost: the door says its ending could not be recorded.
    const lostW = world({ afterRecord: cardSaves, lose: [REFUSED] });
    const lost = await apply(lostW, g5(), G5_EXPECT);

    // ⛔ `not_saved` over a write that LANDED — the factory's own read-back (the first read after the write) fails after the
    // save committed: the fresh read finds this door's version, so the door goes on, and never says DONE.
    const lw = world();
    lw.wRow.failReadsAfterWrite(1);
    const lby = BY("landed");
    const landed = await apply(lw, g5(), G5_EXPECT, lby);
    const lApplied = lw.rows.find((r) => r.action === APPLIED);
    const lSaid = (lApplied?.payload.writerSaid ?? {}) as Record<string, unknown>;
    const lHistory = ((lw.wRow.row() ?? {})["source.phrase"] ?? []) as Array<Record<string, unknown>>;
    const again = await apply(lw, g5(), G5_EXPECT);
    // …and never DONE on that answer even were an ADMIN row for this save found: the writer's own word was not "saved".
    const rby = BY("landed with a row");
    const rowFound = async (): Promise<{ entries: Array<Record<string, unknown>> }> => ({
      entries: [{
        id: "adm_found", action: WSTORE.MARKETING_WORDINGS_AUDIT.action, actorId: `ops: ${rby}`,
        payload: {
          changes: { "source.phrase": { from: [], to: [] } },
          after: { "source.phrase": [{ v: 1, text: SOURCE_LINE, savedAt: iso(T_WRITE), savedBy: `ops: ${rby}` }] },
        },
      }],
    });
    const rw = world({ adminRows: rowFound as Deps["adminRows"] });
    rw.wRow.failReadsAfterWrite(1);
    const landedRow = await apply(rw, g5(), G5_EXPECT, rby);
    // …and on the policy record: the page versions and the moved lines from the fresh read, the writer having reported none.
    const pw = world();
    pw.pRow.failReadsAfterWrite(1);
    const pby = BY("landed lines");
    const gateway = { "privacy.smsGateway": B3 };
    const pLanded = await apply(pw, g10(gateway), expectL(gateway), pby);
    const pApplied = pw.rows.find((r) => r.action === APPLIED);
    const pGateway = ((pw.pRow.row() ?? {})["privacy.smsGateway"] ?? []) as Array<Record<string, unknown>>;
    const nB3 = PPURE.normalizedPolicyTexts("privacy.smsGateway", B3);
    const rgCode = PPURE.POLICY_PAGES.rg.codeVersion;
    const prCode = PPURE.POLICY_PAGES.privacy.codeVersion;

    // ⛔ `not_saved` over a write that did NOT land (the store swallowed it), its read-back failing too: the outcome is unknown.
    const nw = world();
    nw.wRow.dropWrites(true);
    nw.wRow.failReadsAfterWrite(1);
    const notLanded = await apply(nw, g5(), G5_EXPECT);
    const nFailed = nw.rows.find((r) => r.action === FAILED);
    const neverNothingWritten = (lines: readonly string[]): boolean => !lines.some((l) => l.includes("nothing was written"));
    return verdict({
      staleRefused: o.code === "writer_refused" && o.exitCode === 1,
      recordedInItsOwnWords: refusedRow?.payload.step === "writer" && refusedRow.payload.refusal === "stale"
        && refusedRow.payload.error === WSTORE.WORDINGS_REFUSAL_SENTENCE.stale
        && staleProblem?.code === "stale" && staleProblem.sentence === WPURE.WORDING_SENTENCE.stale
        && w.rows.map((r) => r.action).join(",") === `${APPLYING},${REFUSED}`,
      theOperatorsReasonKept: refusedRow?.payload.reason === REASON,
      theCardsVersionStandsAlone: history.length === 1 && history[0]?.savedBy === "usr_card_officer" && history[0]?.text === CARD_LINE,
      aThrowIsFailedNeverRefused: threw.code === "writer_failed" && threw.exitCode === 1 && tFailed?.payload.step === "writer"
        && tFailed.payload.outcome === "unknown" && tFailed.payload.error === "the writer fell over"
        && !t.rows.some((r) => r.action === REFUSED) && t.writes() === 0,
      aLostEndingIsSaid: lost.code === "writer_refused" && lost.exitCode === 1 && lost.records.ending === null
        && !lostW.rows.some((r) => r.action === REFUSED)
        && lost.lines.some((l) => l.includes("its ending could not be recorded — tell the developer")),
      notSavedOverALandedWrite: landed.code === "done_unconfirmed" && landed.exitCode === 1
        && lw.rows.map((r) => r.action).join(",") === `${APPLYING},${APPLIED}`
        && lSaid.refusal === "not_saved" && typeof lSaid.error === "string" && lApplied?.payload.adminRow === null
        && lHistory.length === 1 && lHistory[0]?.text === SOURCE_LINE && lHistory[0]?.savedBy === `ops: ${lby}` && lHistory[0]?.savedAt === iso(T_WRITE)
        && landed.lines.includes(`⚠️ ${DOOR.OWNER_SAVE_SENTENCE.unconfirmed}`)
        && landed.lines.some((l) => l.includes("(not_saved), but a fresh read shows every version saved by this door"))
        && neverNothingWritten(landed.lines)
        && again.code === "nothing_to_do" && again.exitCode === 0,
      notSavedIsNeverDoneEvenWithARow: landedRow.code === "done_unconfirmed" && landedRow.exitCode === 1
        && landedRow.records.admin === "adm_found" && landedRow.records.ending !== null
        && landedRow.lines.some((l) => l.includes("(not_saved), but a fresh read shows every version saved by this door")),
      notSavedOverALandedLine: pLanded.code === "done_unconfirmed" && pLanded.exitCode === 1
        && pw.rows.map((r) => r.action).join(",") === `${APPLYING},${APPLIED}`
        && (pApplied?.payload.writerSaid as { refusal?: unknown } | undefined)?.refusal === "not_saved"
        && sameValue(pApplied?.payload.pageVersions, { rg: rgCode, privacy: PPURE.nextPolicyVersion(prCode, T_WRITE) })
        && sameValue(pApplied?.payload.moved, ["privacy.smsGateway"])
        && pGateway.length === 1 && pGateway[0]?.en === nB3.en && pGateway[0]?.savedBy === `ops: ${pby}` && pGateway[0]?.savedAt === iso(T_WRITE),
      notSavedOverAWriteNotShown: notLanded.code === "save_unconfirmed" && notLanded.exitCode === 1
        && nw.rows.map((r) => r.action).join(",") === `${APPLYING},${FAILED}`
        && nFailed?.payload.refusal === "not_saved" && nFailed.payload.outcome === "unknown"
        && Array.isArray(nFailed.payload.found) && (nFailed.payload.found as unknown[]).length > 0
        && notLanded.lines.some((l) => l.includes(DOOR.OWNER_SAVE_SENTENCE.saveUnconfirmed)) && notLanded.lines.some((l) => l.includes("Run status"))
        && neverNothingWritten(notLanded.lines) && nw.wRow.row() === null && nw.wRow.writes() === 1,
    });
  });

  // ── O12 · THE ROW READ BACK ──────────────────────────────────────────────────────────────────────────────────────
  await claim(p(L.o12), async () => {
    const w = world();
    let reads = 0;
    const deps: Deps = {
      ...w.deps,
      readWordings: async () => {
        reads++;
        const r = await w.wStore.reloadHistories();
        if (reads < 2 || !r.ok) return r;
        const h = JSON.parse(JSON.stringify(r.histories)) as Record<string, Array<Record<string, unknown>>>;
        if (h["source.phrase"]?.[0]) h["source.phrase"][0].text = "Namba nyingine.";
        return { ...r, histories: h as never };
      },
    };
    const o = await impl.apply({ fileBytes: g5(), by: BY("read back"), reason: REASON, expect: G5_EXPECT }, deps);
    const failedRow = w.rows.find((r) => r.action === FAILED);
    const found = failedRow?.payload.found;
    return verdict({
      refused: o.code === "read_back_mismatch" && o.exitCode === 1,
      recorded: failedRow?.payload.step === "read_back" && Array.isArray(found) && found.length > 0,
    });
  });

  // ── O13 · NOTHING TO DO ──────────────────────────────────────────────────────────────────────────────────────────
  await claim(p(L.o13), async () => {
    const w = world();
    const first = await apply(w, g5(), G5_EXPECT);
    const before = { rows: w.rows.length, writes: w.writes(), calls: w.calls.length };
    const second = await apply(w, g5(), G5_EXPECT);
    const wp = world({ wSeed: SEED_OWN_FORM });
    const files = { "basis.OWN_FORM": OWN_FORM, "adult.test": ADULT_TEST_A };
    const op = await apply(wp, g4(files), expectW(files));
    const applying = wp.rows.find((r) => r.action === APPLYING);
    const today = { "privacy.smsGateway": PPURE.POLICY_LINE_DEFAULTS["privacy.smsGateway"] };
    const wt = world();
    const ot = await apply(wt, g10(today), expectL(today));
    const ct = await impl.check({ fileBytes: g10(today), filePath: "g10.json" }, wt.deps);
    const rv = { "privacy.lawfulConsent": "review" as const };
    const wr = world();
    const r1 = await apply(wr, g10(rv), expectL(rv));
    const rowsAfterOne = wr.rows.length;
    const r2 = await apply(wr, g10(rv), expectL(rv));
    const nB2 = PPURE.normalizedPolicyTexts("rg.marketing", B2);
    const seedP = {
      "rg.marketing": [{ rev: 1, en: nB2.en, sw: nB2.sw, zh: nB2.zh, codeDefault: PPURE.policyDefaultFingerprint("rg.marketing"), savedAt: "2026-10-05T08:00:00.000Z", savedBy: "usr_owner_a" }],
    };
    const ws = world({ pSeed: seedP });
    const rs = { "rg.marketing": "review" as const };
    const os = await apply(ws, g10(rs), expectL(rs));
    return verdict({
      twiceIsNothing: first.code === "done" && second.code === "nothing_to_do" && second.exitCode === 0
        && w.rows.length === before.rows && w.writes() === before.writes && w.calls.length === before.calls,
      onlyTheNewOne: op.code === "done" && wp.calls.length === 1
        && sameValue(wp.calls[0]?.patch, { "adult.test": ADULT_TEST_A, "base.adult.test": "0", "approve.adult.test": "1" })
        && JSON.stringify(applying?.payload.keys) === '["adult.test"]' && JSON.stringify(applying?.payload.unchanged) === '["basis.OWN_FORM"]',
      todaysWordsAreNothing: ot.code === "nothing_to_do" && clean(wt) && ct.code === "nothing_to_do"
        && ct.lines.some((l) => l.includes("approve review instead")),
      aReviewTwiceIsNothing: r1.code === "done" && r2.code === "nothing_to_do" && wr.rows.length === rowsAfterOne,
      aReviewOfSavedWordsRefused: os.code === "review_not_possible" && clean(ws),
    });
  });

  // ── O14 · ⛔ THE FACTORY'S ADMIN ROW ──────────────────────────────────────────────────────────────────────────
  await claim(p(L.o14), async () => {
    const w = world();
    const by = BY("admin row");
    const o = await apply(w, g5(), G5_EXPECT, by);
    const pendingAfter = AUDIT.auditPending();
    const wordingsRows = (await AUDIT.getAuditForTargetDurable("MARKETING_WORDINGS", "global", { limit: 500 })).entries;
    const admin = wordingsRows.find((e) => e.id === o.records.admin);
    const appliedRow = w.rows.find((r) => r.action === APPLIED);
    const pw = world();
    const pby = BY("admin row lines");
    const po = await apply(pw, g10(FIVE), expectL(FIVE), pby);
    const policyRows = (await AUDIT.getAuditForTargetDurable("POLICY_LINES", "global", { limit: 500 })).entries;
    const pAdmin = policyRows.find((e) => e.id === po.records.admin);
    const pApplied = pw.rows.find((r) => r.action === APPLIED);
    const wantChanges = [...Object.keys(FIVE), "version.rg", "version.privacy"].sort();
    const wantPages = {
      rg: PPURE.nextPolicyVersion(PPURE.POLICY_PAGES.rg.codeVersion, T_WRITE),
      privacy: PPURE.nextPolicyVersion(PPURE.POLICY_PAGES.privacy.codeVersion, T_WRITE),
    };
    const wu = world({ adminRows: async () => ({ entries: [] }) });
    const ou = await apply(wu, g5(), G5_EXPECT);
    const uApplied = wu.rows.find((r) => r.action === APPLIED);
    // ⛔ Each of DONE's other conditions, ALONE: the ADMIN row is found both times, so only the one condition can fail.
    const wl = world({ lose: [APPLIED] });
    const lostApplied = await apply(wl, g5(), G5_EXPECT, BY("lost applied"));
    const wq = world();
    const stillPending = await impl.apply({ fileBytes: g5(), by: BY("still pending"), reason: REASON, expect: G5_EXPECT }, { ...wq.deps, pending: () => 1 });
    const redeploy = DOOR.OWNER_SAVE_SENTENCE.redeploy;
    const drafts = `  ${DOOR.OWNER_SAVE_SENTENCE.draftsKeepNone}`;
    return verdict({
      done: o.code === "done" && o.exitCode === 0 && pendingAfter === 0,
      aLostAppliedRecordIsNotConfirmed: lostApplied.code === "done_unconfirmed" && lostApplied.exitCode === 1
        && lostApplied.records.admin !== null && lostApplied.records.ending === null
        && lostApplied.lines.some((l) => l.includes("the record of the save's ending (marketing.owner_save_applied) was not written")),
      aPendingAuditRowIsNotConfirmed: stillPending.code === "done_unconfirmed" && stillPending.exitCode === 1
        && stillPending.records.admin !== null && stillPending.records.ending !== null
        && stillPending.lines.some((l) => l.includes("1 audit row(s) were still waiting to be written")),
      theRedeployInstructionEndsDone: o.lines[o.lines.length - 1] === redeploy && po.lines[po.lines.length - 1] === redeploy,
      g5SaysDraftsKeepNone: o.lines.includes(drafts) && !po.lines.includes(drafts),
      thisSavesAdminRow: admin !== undefined && admin.actorId === `ops: ${by}` && admin.action === "config.marketing_wordings_updated"
        && JSON.stringify(Object.keys((admin.payload?.changes ?? {}) as object).sort()) === '["source.phrase"]',
      appliedNamesIt: appliedRow !== undefined && appliedRow.payload.adminRow === o.records.admin && o.records.ending === appliedRow.id
        && sameValue(appliedRow.payload.versions, { "source.phrase": 1 }) && appliedRow.payload.savedAt === iso(T_WRITE),
      g10InOneSave: po.code === "done" && pAdmin !== undefined && pAdmin.actorId === `ops: ${pby}`
        && JSON.stringify(Object.keys((pAdmin.payload?.changes ?? {}) as object).sort()) === JSON.stringify(wantChanges),
      pageVersionsRecorded: pApplied !== undefined && sameValue(pApplied.payload.pageVersions, wantPages),
      notFoundIsNotConfirmed: ou.code === "done_unconfirmed" && ou.exitCode === 1 && uApplied !== undefined && uApplied.payload.adminRow === null
        && ou.lines.some((l) => l.includes("audit row was not confirmed")),
    });
  });

  // ── O15 · THE DISPLAY RULE ───────────────────────────────────────────────────────────────────────────────────────
  await claim(p(L.o15), async () => {
    const stamp = "ops: Claude for Ali (G4)";
    const door = impl.savedByView(stamp, new Map());
    const numbered = impl.savedByView("ops: Claude 0712 345 678", new Map());
    const staff = impl.savedByView("usr_asha", new Map([["usr_asha", "Asha"]]));
    const unknown = impl.savedByView("usr_gone", new Map());
    const card = await impl.cardView({
      live: { state: "open", enabledBy: "ops: Claude for Ali (G1)", enabledAt: iso(DB_NOW), closesAt: iso(DB_NOW + 3_600_000) },
      settings: { ok: false, error: "not read in this suite" },
      moneyVisible: false, isOwner: false, now: DB_NOW, nameOf: async () => null,
    });
    const page = impl.sources[SRC.page] ?? "";
    const wForm = impl.sources[SRC.wForm] ?? "";
    const pForm = impl.sources[SRC.pForm] ?? "";
    return verdict({
      theDoorsWords: door.name === "the ops door (Claude for Ali (G4))" && door.words === "through the ops door (Claude for Ali (G4))"
        && door.name === impl.opsDoorName(stamp) && !door.words.includes("an admin"),
      aNumberIsNeverShown: numbered.name === "the ops door" && numbered.words === "through the ops door",
      aStaffName: staff.name === "Asha" && staff.words === "by Asha" && unknown.name === "an admin" && unknown.words === "by an admin",
      oneRuleWithTheSwitchCard: card.enabledByName === impl.opsDoorName("ops: Claude for Ali (G1)") && card.enabledByName === "the ops door (Claude for Ali (G1))",
      thePage: (page.match(/savedByView[(]v[.]savedBy, names[)]/g) ?? []).length === 2
        && (page.match(/if [(]opsDoorName[(]id[)] !== null[)] continue;/g) ?? []).length === 2
        && (page.match(/savedByWords: who[.]words/g) ?? []).length === 2 && !page.includes("savedByName: names.get("),
      theForms: wForm.includes("saved ${n.savedAtLabel} ${n.savedByWords}.") && !wForm.includes("by ${n.savedByName}")
        && pForm.includes("Saved ${latest.savedAtLabel} ${latest.savedByWords}") && pForm.includes("Reviewed ${latest.savedAtLabel} ${latest.savedByWords}")
        && !pForm.includes("by ${latest.savedByName}"),
    });
  });

  // ── O16 · THE DOOR'S SOURCE ──────────────────────────────────────────────────────────────────────────────────────
  await claim(p(L.o16), async () => {
    const cli = impl.sources[SRC.cli] ?? "";
    const door = impl.sources[SRC.door] ?? "";
    const staticImports = staticSpecifiers(cli);
    const firstLoad = cli.indexOf("await import(");
    const proxyAt = cli.indexOf('.replace(PRIVATE_DB_HOST, "@turntable.proxy.rlwy.net:40357")');
    const hostRule = cli.includes('new RegExp("@postgres[.]railway[.]internal(?::[0-9]+)?")');
    const dbAt = cli.indexOf("if (!process.env.DATABASE_URL) {");
    const statusAt = cli.indexOf("DOOR.ownerSaveStatus(deps)");
    const envAt = cli.indexOf('process.env.RAILWAY_ENVIRONMENT_NAME === "production" && process.env.RAILWAY_SERVICE_NAME === "50pick"');
    const clockAt = cli.indexOf("const clockProblem = DOOR.opsClockProblem(dbMs, askedAt, Date.now());");
    const unreadAt = cli.indexOf("if (dbMs === null) {");
    const gateAt = cli.indexOf('if (command === "apply" && clockProblem !== null) {');
    const warnAt = cli.indexOf("if (clockProblem !== null) console.log(`WARNING:");
    const checkAt = cli.indexOf("DOOR.checkOwnerSave(");
    const applyAt = cli.indexOf("DOOR.applyOwnerSave(");
    // ⛔ Built by concatenation: `test:red-anchors` §4 reads this file whole, and a file-writing call's name followed by
    // its parenthesis would take this harness out of the in-process class.
    const FILE_WRITE = new RegExp(`(?:${["write" + "FileSync", "write" + "File", "append" + "FileSync", "rm" + "Sync", "unlink" + "Sync", "rename" + "Sync", "copy" + "FileSync", "cp" + "Sync"].join("|")})[ ]*[(]`);
    const STORE_WRITE = /config-store|saveConfig|systemConfig|PrismaClient|prisma[(][)]/;
    const specs = [...door.matchAll(/from[ ]*"([^"]+)"/g)].map((m) => m[1]);
    const recordAt = door.indexOf("action: OWNER_SAVE_ACTIONS.applying");
    return verdict({
      cliImportsNoSrcStatically: staticImports.length === 1 && staticImports[0] === "node:fs",
      proxyBeforeTheFirstLoad: hostRule && proxyAt > 0 && firstLoad > proxyAt,
      noDatabaseRefusedBeforeLoading: dbAt > proxyAt && dbAt < firstLoad,
      productionChecked: statusAt > firstLoad && envAt > statusAt && checkAt > envAt && applyAt > envAt
        && cli.includes('auditKey === (process.env.SESSION_SECRET ?? "")') && cli.includes('auditKey.trim() === ""'),
      theClockGatesAnApplyOnly: clockAt > envAt && gateAt > clockAt && gateAt < checkAt && gateAt < applyAt
        && warnAt > gateAt && warnAt < checkAt && cli.slice(gateAt, warnAt).includes("return 2;")
        && !cli.slice(warnAt, cli.indexOf(LF, warnAt)).includes("return"),
      // ⛔ A clock that could not be READ is the database out of reach — refused for both commands, never "sync this PC".
      theUnreadableClockIsTheDatabase: unreadAt > envAt && unreadAt < clockAt && cli.slice(unreadAt, clockAt).includes("return 2;")
        && cli.slice(unreadAt, clockAt).includes("the database could not be reached, so nothing was read or written")
        && !cli.slice(unreadAt, clockAt).includes("Sync now"),
      theDurableReaderHandedIn: cli.includes("DOOR.ownerSaveDeps((targetType: string, targetId: string) => AUDIT.getAuditForTargetDurable(targetType, targetId, { limit: 25 }))"),
      theCliWritesNothing: !STORE_WRITE.test(cli) && !FILE_WRITE.test(cli),
      theDoorHasNoWriterOfItsOwn: !specs.some((s) => s.includes("config-store")) && !STORE_WRITE.test(door) && !FILE_WRITE.test(door),
      theDoorReadsNoAuditRow: !door.includes("getAudit"),
      theDoorReadsNoSuggestion: !/WORDING_DEFAULTS|ADULT_ATTESTATION_WORDING|THIRD_PARTY_NOTICE|defaultWording/.test(door),
      theWritersOnlyThroughDeps: (door.match(/deps[.]saveWordings[(]plan[.]patch, officer, nowIso[)]/g) ?? []).length === 1
        && (door.match(/deps[.]savePolicy[(]plan[.]patch, officer, nowIso[)]/g) ?? []).length === 1
        && !/(?<![.A-Za-z])(?:saveMarketingWordings|savePolicyLines)[(]/.test(door)
        && door.includes("const officer = `${OPS_PREFIX}${by}`;") && door.includes('export const OPS_PREFIX = "ops: ";'),
      recordsBeforeItWrites: recordAt > 0 && recordAt < door.indexOf("deps.saveWordings(") && recordAt < door.indexOf("deps.savePolicy("),
      noSrcFileImportsTheDoor: impl.importers.files > 500 && impl.importers.importers.length === 0,
    });
  });

  // ── O17 · THE WIRING ─────────────────────────────────────────────────────────────────────────────────────────────
  await claim(p(L.o17), async () => {
    let scripts: Record<string, string> = {};
    try { scripts = (JSON.parse(impl.pkg) as { scripts?: Record<string, string> }).scripts ?? {}; } catch { scripts = {}; }
    const chain = (scripts.predeploy ?? "").split("&&").map((x) => x.trim());
    const at = chain.indexOf("npm run test:marketing-owner-save");
    return verdict({
      test: scripts["test:marketing-owner-save"] === "tsx scripts/marketing-owner-save.test.mts",
      red: scripts["red:marketing-owner-save"] === "tsx scripts/marketing-owner-save.test.mts --prove-red",
      ops: scripts["ops:marketing-owner-save"] === "tsx scripts/ops/marketing-owner-save.mts",
      // ⛔ `test:marketing-settings`' own S13 pins test:marketing-wordings right before it, and `test:marketing-window` pins
      // itself right after it — so this suite closes that block, one place along.
      predeployOnceInTheBlock: chain.filter((x) => x === "npm run test:marketing-owner-save").length === 1
        && at > 1 && chain[at - 1] === "npm run test:marketing-window" && chain[at - 2] === "npm run test:marketing-settings",
    });
  });

  // ── O18 · CHECK ──────────────────────────────────────────────────────────────────────────────────────────────────
  await claim(p(L.o18), async () => {
    const w = world();
    const lines = { "rg.marketing": B2, "privacy.lawfulConsent": "review" as const };
    const o = await impl.check({ fileBytes: g10(lines), filePath: "C:/evidence/g10.json" }, w.deps);
    const nB2 = PPURE.normalizedPolicyTexts("rg.marketing", B2);
    const nC = PPURE.normalizedPolicyTexts("privacy.lawfulConsent", PPURE.POLICY_LINE_DEFAULTS["privacy.lawfulConsent"]);
    const applyLine = o.lines.find((l) => l.includes("-- apply")) ?? "";
    const rgCode = PPURE.POLICY_PAGES.rg.codeVersion;
    const g5w = world();
    const g5o = await impl.check({ fileBytes: g5(), filePath: "g5.json" }, g5w.deps);
    return verdict({
      checked: o.code === "checked" && o.exitCode === 0,
      writesNothing: clean(w) && clean(g5w),
      everyWordAsStored: [nB2.en, nB2.sw, nB2.zh, nC.en, nC.sw, nC.zh].every((t) => o.lines.some((l) => l.endsWith(`: ${t}`))),
      thePageVersionPreviewed: o.lines.some((l) => l.includes(`Responsible Gambling Policy ${rgCode} → ${PPURE.nextPolicyVersion(rgCode, DB_NOW)}`)),
      theOpeningChecksPreviewed: o.lines.some((l) => l.includes("opening checks: now")),
      theExactApplyLine: applyLine.includes('--file "C:/evidence/g10.json"') && applyLine.includes('--by "Claude for Ali (G10)"')
        && applyLine.includes(`--expect "rg.marketing=${lineShaOf(nB2, false)},privacy.lawfulConsent=${lineShaOf(nC, true)}"`),
      theSourceLineInSeptets: g5o.code === "checked" && g5o.lines.some((l) => l.includes("30 septets as printed, at most 30") && l.endsWith(`: ${SOURCE_LINE}`)),
    });
  });

  // ── O19 · ⭐ ALI'S APPROVALS OF 2026-10-07, AS COMMITTED ───────────────────────────────────────────────────────────
  // ⛔ What he approved is read HERE — his sentence, the code's suggestions, the spec's Appendix — and never by the door
  // (O16 holds it to that): the door saves the file, this claim proves the file is his approval.
  await claim(p(L.o19), async () => {
    const nine = WPURE.WORDING_KEYS.filter((k) => k !== "source.phrase");
    const sameKeys = (a: readonly string[], b: readonly string[]): boolean => [...a].sort().join("|") === [...b].sort().join("|");
    const samePT = (a: PolicyTexts | null, b: PolicyTexts | undefined): boolean =>
      a !== null && b !== undefined && a.en === b.en && a.sw === b.sw && a.zh === b.zh;
    const readings = Object.fromEntries(GATES.map((g) => [g, impl.readApproval(impl.approvals[g], DB_NOW)])) as Record<Gate, Reading>;
    const wordingsIn = (g: Gate) => { const r = readings[g]; return r.ok && r.approval.record === "wordings" ? r.approval.wordings : null; };
    const linesIn = (g: Gate) => { const r = readings[g]; return r.ok && r.approval.record === "policy" ? r.approval.lines : null; };
    const g5 = wordingsIn("G5");
    const g4 = wordingsIn("G4");
    const g10 = linesIn("G10");
    const appendix = appendixB(impl.spec);
    // The file's digests, computed HERE from what the record will store — the operator's lines must name exactly these.
    const digestsOf = (g: Gate): string | null => {
      const w = wordingsIn(g);
      if (w !== null) return w.map((x) => `${x.key}=${shaOf(WPURE.normalizeWording(x.asTyped))}`).join(",");
      const l = linesIn(g);
      return l === null ? null : l.map((x) => {
        // A review digests today's words (no text of the file's is stored); new words digest the file's, as stored.
        const texts = PPURE.normalizedPolicyTexts(x.key, x.review ? PPURE.POLICY_LINE_DEFAULTS[x.key] : (x.asTyped ?? { en: "", sw: "", zh: "" }));
        return `${x.key}=${lineShaOf(texts, x.review)}`;
      }).join(",");
    };
    const headerLines = GATES.filter((g) => {
      const digests = digestsOf(g);
      const file = approvalPath(g);
      return digests !== null && impl.cliRaw.includes(`-- check --file ${file}${LF}`)
        && impl.cliRaw.includes(`-- apply --file ${file} --by "Claude for Ali (${g})" --reason "${REASON}" --expect "${digests}"${LF}`);
    });

    // ⭐ Each file carried out on the memory twin, as the header orders them: check clean, apply, one save per gate.
    const w = world();
    const ran: string[] = [];
    const checks: Partial<Record<Gate, Outcome>> = {};
    for (const g of GATES) {
      const digests = digestsOf(g);
      const c = await impl.check({ fileBytes: impl.approvals[g], filePath: approvalPath(g) }, w.deps);
      checks[g] = c;
      if (c.code !== "checked" || c.lines.some((l) => l.includes("✗"))) ran.push(`${g} check ${c.code}`);
      const o = await apply(w, impl.approvals[g], digests ?? "", BY(`approval ${g}`));
      if (o.code !== "done") ran.push(`${g} apply ${o.code}`);
    }
    const wRow = w.wRow.row() ?? {};
    const pRow = w.pRow.row() ?? {};
    const newest = (row: Record<string, unknown>, k: string): Record<string, unknown> | undefined => {
      const list = row[k];
      return Array.isArray(list) && list.length === 1 ? (list[0] as Record<string, unknown>) : undefined;
    };
    const policyCalls = w.calls.filter((c) => c.record === "policy").length;
    const rgCode = PPURE.POLICY_PAGES.rg.codeVersion;
    const prCode = PPURE.POLICY_PAGES.privacy.codeVersion;
    const record = PPURE.readPolicyLines(pRow);
    const rgHints = PPURE.policyLineProblems("rg.marketing", B2, PPURE.POLICY_LINE_DEFAULTS["rg.marketing"]).hints;
    return verdict({
      utf8NoBomNoEscape: GATES.every((g) => {
        const b = impl.approvals[g];
        const text = new TextDecoder("utf-8", { fatal: true }).decode(b);
        return !(b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) && !text.includes(BACKSLASH);
      }),
      readByTheDoorAsTheirGate: GATES.every((g) => {
        const r = readings[g];
        return r.ok && r.approval.gate === g && r.approval.approvedOn === DAY && r.notes.length === 0;
      }),
      g5IsHisSentence: g5 !== null && g5.length === 1 && g5[0].key === "source.phrase" && g5[0].asTyped === SOURCE_LINE
        && impl.decisions.includes(`**G5 · the source line** "${SOURCE_LINE}" — approved as written.`),
      g4IsTheCodesSuggestions: g4 !== null && sameKeys(g4.map((x) => x.key), nine)
        && g4.every((x) => x.asTyped === WPURE.WORDING_DEFAULTS[x.key])
        && impl.decisions.includes("the texts the code offers as suggestions today, word for word"),
      g10IsAppendixB: appendix !== null && g10 !== null && sameKeys(g10.map((x) => x.key), PPURE.POLICY_LINE_KEYS)
        && g10.every((x) => !x.review && samePT(x.asTyped, appendix[x.key]))
        && impl.decisions.includes(`spec ${BACKTICK}U33a-U37c-OD58.md${BACKTICK} Appendix B.2–B.6`),
      theHeadersLinesAreTheFiles: headerLines.length === GATES.length,
      appliedOnTheTwin: ran.length === 0,
      g5Saved: newest(wRow, "source.phrase")?.text === SOURCE_LINE,
      g4Saved: nine.every((k) => newest(wRow, k)?.text === WPURE.WORDING_DEFAULTS[k]),
      g10InOneSaveEachPageOnce: policyCalls === 1
        && PPURE.POLICY_LINE_KEYS.every((k) => {
          const v = newest(pRow, k);
          const want = PPURE.normalizedPolicyTexts(k, FIVE[k]);
          return v !== undefined && v.en === want.en && v.sw === want.sw && v.zh === want.zh;
        })
        && sameValue(pRow["version.rg"], { stamp: PPURE.nextPolicyVersion(rgCode, T_WRITE), base: rgCode })
        && sameValue(pRow["version.privacy"], { stamp: PPURE.nextPolicyVersion(prCode, T_WRITE), base: prCode }),
      everyOpeningCheckPassesAfter: PPURE.policyOpeningProblems(record).length === 0,
      aliHearsTheNote: rgHints.length > 0 && rgHints.every((h) => (checks.G10?.lines ?? []).includes(`    note: ${h}`)),
    });
  });

  // ── O20 · U13 · THE SEND WINDOW ─────────────────────────────────────────────────────────────────────────────────
  await claim(p(L.o20), async () => {
    const naming = (time: string): Record<string, PolicyTexts> => ({ "rg.marketing": { ...B2, en: `${B2.en} No offers are sent after ${time} EAT.` } });
    const unkept = "names a time the send window doesn't use";
    const at21 = naming("21:00");
    const w1 = world();
    const o1 = await apply(w1, g10(at21), expectL(at21));
    const at20 = naming("20:00");
    const w2 = world();
    const o2 = await apply(w2, g10(at20), expectL(at20));
    const w3 = world({ window: WINDOW_9_TO_7 });
    const o3 = await apply(w3, g10(at20), expectL(at20));
    const c3 = await impl.check({ fileBytes: g10(at20), filePath: "g10.json" }, w3.deps);
    const at19 = naming("19:00");
    const w4 = world({ window: WINDOW_9_TO_7 });
    const o4 = await apply(w4, g10(at19), expectL(at19));
    const rg = { "rg.marketing": B2 };
    const w5 = world({ window: WINDOW_UNREAD });
    const o5 = await apply(w5, g10(rg), expectL(rg));
    const c5 = await impl.check({ fileBytes: g10(rg), filePath: "g10.json" }, w5.deps);
    const gateway = { "privacy.smsGateway": B3 };
    const w6 = world({ window: WINDOW_UNREAD });
    const o6 = await apply(w6, g10(gateway), expectL(gateway));
    return verdict({
      aTimeTheWindowDoesNotUse: o1.code === "invalid" && clean(w1) && o1.lines.some((l) => l.includes("“rg.marketing” (English)") && l.includes(unkept)),
      itsClosingTimePasses: o2.code === "done",
      theHoursAsRead: o3.code === "invalid" && clean(w3) && o3.lines.some((l) => l.includes(unkept) && l.includes("09:00–19:00 EAT"))
        && c3.code === "invalid" && c3.lines.some((l) => l.includes("held to it: 09:00–19:00 EAT")),
      theReadEdgePasses: o4.code === "done",
      unreadRefusesBeforeTheRecord: o5.code === "window_unreadable" && o5.exitCode === 1 && clean(w5) && c5.code === "window_unreadable",
      noRgLineNeverAsks: o6.code === "done",
    });
  });
}

/* ══ THE RUN ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`${LF}marketing-owner-save: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  /* ── THE BASELINE — a plant can only "hold" against claims the real code PASSES ── */
  {
    const log = console.log;
    console.log = () => {};
    try { await runAssertions(REAL, ""); } finally { console.log = log; }
    if (fail > 0) {
      console.log(`RED CONTROL — NOT RUN: the baseline is not green (${fail} claim(s) fail for the REAL code):${LF}  ${failed.join(`${LF}  `)}`);
      await AUDIT.auditFlush();
      process.exit(1);
    }
    console.log(`RED CONTROL — baseline green (${pass} claims pass for the real code)${LF}`);
  }

  /* ── THE PLANTS — each a defect this door could really ship, planted in memory ── */
  type ApplyFn = Impl["apply"];
  type ReadFn = Impl["readApproval"];
  const real = DOOR.applyOwnerSave;
  const rereadAsJson = (bytes: Uint8Array, now: number): ReturnType<ReadFn> => DOOR.readApproval(enc(JSON.stringify(JSON.parse(decode(bytes)))), now);

  /** R-O1a · the approval read by JSON.parse's rule: of two equal keys, the LAST wins. */
  const lastKeyWins: ReadFn = (bytes, now) => {
    const r = DOOR.readApproval(bytes, now);
    if (r.ok || !r.problems.some((x) => x.includes("appears twice"))) return r;
    try { return rereadAsJson(bytes, now); } catch { return r; }
  };
  /** R-O1b · an escape decoded instead of refused — the file no longer reads as the words saved. */
  const escapesDecoded: ReadFn = (bytes, now) => {
    const r = DOOR.readApproval(bytes, now);
    if (r.ok || !r.problems.some((x) => x.includes("backslash"))) return r;
    try { return rereadAsJson(bytes, now); } catch { return r; }
  };
  /** R-O1c · a blank wording passed through — a source line cleared through the door. */
  const blankPasses: ReadFn = (bytes, now) => {
    const r = DOOR.readApproval(bytes, now);
    if (r.ok || !r.problems.some((x) => x.includes("is blank"))) return r;
    try {
      const o = JSON.parse(decode(bytes)) as { gate: string; approvedOn: string; wordings?: Record<string, string> };
      if (o.wordings === undefined) return r;
      const wordings = Object.entries(o.wordings).map(([key, t]) => ({ key, asTyped: t, text: WPURE.normalizeWording(t), sha12: shaOf(WPURE.normalizeWording(t)) }));
      return { ok: true, approval: { record: "wordings", gate: o.gate, approvedOn: o.approvedOn, wordings }, notes: [] } as unknown as ReturnType<ReadFn>;
    } catch { return r; }
  };
  /** R-O2 · the gate's keys not enforced — a file read under whichever wordings gate holds its keys. */
  const anyGate: ReadFn = (bytes, now) => {
    const r = DOOR.readApproval(bytes, now);
    if (r.ok || !r.problems.some((x) => x.includes("belongs to"))) return r;
    try {
      const o = JSON.parse(decode(bytes)) as Record<string, unknown>;
      const keys = Object.keys((o.wordings ?? {}) as object);
      const gate = DOOR.OWNER_SAVE_GATES.find((g) => g !== "G10" && keys.length > 0 && keys.every((k) => DOOR.GATE_KEYS[g].includes(k)));
      return gate === undefined ? r : DOOR.readApproval(fileOf({ ...o, gate }), now);
    } catch { return r; }
  };
  /** R-O3 · approvedOn judged by the file's own day, never by the database's clock. */
  const ownClock: ReadFn = (bytes, now) => {
    try {
      const o = JSON.parse(decode(bytes)) as { approvedOn?: unknown };
      const ms = typeof o.approvedOn === "string" ? Date.parse(`${o.approvedOn}T12:00:00.000Z`) : Number.NaN;
      return DOOR.readApproval(bytes, Number.isFinite(ms) ? ms : now);
    } catch { return DOOR.readApproval(bytes, now); }
  };
  /** R-O4 · who and why screened field by field only — a number split across the two passes. */
  const perField: ApplyFn = (input, deps) => {
    const keep3 = (t: unknown): unknown => {
      if (typeof t !== "string") return t;
      let n = 0;
      return t.replace(/[0-9]/g, (d) => (n++ < 3 ? d : ""));
    };
    return real({ ...input, by: keep3(input.by), reason: keep3(input.reason) }, deps);
  };
  /** R-O5 · --expect never compared — the digests taken from the file itself. */
  const expectIgnored: ApplyFn = (input, deps) => {
    const r = DOOR.readApproval(input.fileBytes, DB_NOW);
    const own = r.ok ? DOOR.approvalDigests(r.approval).map((d) => `${d.key}=${d.sha12}`).join(",") : input.expect;
    return real({ ...input, expect: own }, deps);
  };
  /** R-O6 · the file read before who and why. */
  const fileFirst: ApplyFn = async (input, deps) => {
    const r = deps.rules.readApproval(input.fileBytes, DB_NOW);
    if (!r.ok) return { code: "bad_file", exitCode: 1, lines: [...r.problems], records: { applying: null, ending: null, admin: null } };
    return real(input, deps);
  };
  /** R-O7 · a row read only in part taken as whole — the door goes on, records, and the writer refuses it. */
  const partAsWhole: ApplyFn = (input, deps) => real(input, {
    ...deps,
    readWordings: async () => { const r = await deps.readWordings(); return r.ok ? { ...r, dropped: [] } : r; },
    readPolicy: async () => { const r = await deps.readPolicy(); return r.ok ? { ...r, dropped: [] } : r; },
  });
  /** R-O8 · the door skipping the card's rules — it records Ali's approval of words the writer then refuses. */
  const NO_RULES: Rules = {
    ...DOOR.OWNER_SAVE_RULES,
    wordingProblems: () => [],
    policyLineProblems: () => ({ problems: { en: [], sw: [], zh: [] }, hints: [] }),
  };
  /** R-O9a · the record written AFTER the write. */
  const recordsLate: ApplyFn = (input, deps) => {
    let held: Parameters<Deps["audit"]>[0] | null = null;
    const replay = async (): Promise<void> => { if (held !== null) { const h = held; held = null; await deps.audit(h); } };
    return real(input, {
      ...deps,
      audit: async (entry) => {
        if (entry.action === APPLYING && held === null) { held = entry; return { recorded: true, id: "held" }; }
        return deps.audit(entry);
      },
      saveWordings: async (patch, officer, nowIso) => { const r = await deps.saveWordings(patch, officer, nowIso); await replay(); return r; },
      savePolicy: async (patch, officer, nowIso) => { const r = await deps.savePolicy(patch, officer, nowIso); await replay(); return r; },
    });
  };
  /** R-O9b · a lost record taken as recorded — the writer runs with no record of Ali's approval. */
  const lostIsRecorded: ApplyFn = (input, deps) => real(input, {
    ...deps,
    audit: async (entry) => {
      try {
        const r = await deps.audit(entry);
        return (r as { recorded?: unknown } | null)?.recorded === true ? r : { recorded: true, id: "pretend" };
      } catch {
        return { recorded: true, id: "pretend" };
      }
    },
  });
  /** R-O10a · this PC's clock handed to the writer. */
  const pcClock: ApplyFn = (input, deps) => {
    let n = 0;
    return real(input, { ...deps, dbNowMs: async () => (++n === 1 ? deps.dbNowMs() : Date.now()) });
  };
  /** R-O10b · the author a staff login, not the door's stamp. */
  const asStaff: ApplyFn = (input, deps) => real(input, {
    ...deps,
    saveWordings: (patch, _officer, nowIso) => deps.saveWordings(patch, "usr_ali_login", nowIso),
    savePolicy: (patch, _officer, nowIso) => deps.savePolicy(patch, "usr_ali_login", nowIso),
  });
  /** R-O10c · approve.<key>=1 sent for every wording, saved or not (the card's builder bypassed). */
  const APPROVES_ALL: Rules = {
    ...DOOR.OWNER_SAVE_RULES,
    wordingsToSave: (state) => DOOR.OWNER_SAVE_RULES.wordingsToSave(state).map((x) => ({ ...x, approve: true })),
  };
  /** R-O11a · a writer's refusal not recorded. */
  const refusalUnrecorded: ApplyFn = (input, deps) => real(input, {
    ...deps,
    audit: async (entry) => (entry.action === REFUSED ? { recorded: true, id: "dropped" } : deps.audit(entry)),
  });
  /** R-O11b · a writer that threw recorded as a refusal — "nothing was written", which nobody knows. */
  const throwAsRefusal: ApplyFn = (input, deps) => real(input, {
    ...deps,
    audit: (entry) => deps.audit(entry.action === FAILED && entry.payload?.outcome === "unknown" ? { ...entry, action: REFUSED } : entry),
  });
  /** R-O12 · the door believing its own write. */
  const believesItself: ApplyFn = async (input, deps) => {
    const o = await real(input, deps);
    return o.code === "read_back_mismatch" ? { ...o, code: "done", exitCode: 0 } : o;
  };
  /** R-O13a · NOTHING TO DO still records an attempt. */
  const nothingRecords: ApplyFn = async (input, deps) => {
    const o = await real(input, deps);
    if (o.code === "nothing_to_do") {
      await deps.audit({ category: "COMPLIANCE", action: APPLYING, actorId: null, targetType: "SystemConfig", targetId: "marketing.wordings", payload: { via: "ops" } });
    }
    return o;
  };
  /** R-O13b · a review of saved words carried out as today's words — the saved words replaced. */
  const reviewAsWords: ReadFn = (bytes, now) => {
    const r = DOOR.readApproval(bytes, now);
    if (!r.ok || r.approval.record !== "policy") return r;
    const lines = r.approval.lines.map((l) => (l.review ? { ...l, review: false, asTyped: l.texts, sha12: lineShaOf(l.texts, false) } : l));
    return { ...r, approval: { ...r.approval, lines } };
  };
  /** R-O14 · DONE said without the ADMIN row confirmed. */
  const trustsAdmin: ApplyFn = async (input, deps) => {
    const o = await real(input, deps);
    return o.code === "done_unconfirmed" ? { ...o, code: "done", exitCode: 0 } : o;
  };
  /** R-O11c · the review's MAJOR: `not_saved` taken as a refusal answered before the write — "nothing was written", over a
   *  save that landed (its answer passed on as any other refusal's). */
  const notSavedAsRefusal: ApplyFn = (input, deps) => {
    const asRefusal = <T,>(r: T): T => {
      const x = r as { ok?: unknown; reason?: unknown };
      return x.ok === false && x.reason === "not_saved" ? ({ ...(r as object), reason: "unreadable" } as T) : r;
    };
    return real(input, {
      ...deps,
      saveWordings: async (patch, officer, nowIso) => asRefusal(await deps.saveWordings(patch, officer, nowIso)),
      savePolicy: async (patch, officer, nowIso) => asRefusal(await deps.savePolicy(patch, officer, nowIso)),
    });
  };
  /** R-O11d · a `not_saved` whose write did not show, recorded as a refusal — "nothing was written", which nobody knows. */
  const unconfirmedAsRefusal: ApplyFn = (input, deps) => real(input, {
    ...deps,
    audit: (entry) => deps.audit(entry.action === FAILED && entry.payload?.refusal === "not_saved" ? { ...entry, action: REFUSED } : entry),
  });
  /** R-O11e · a landed `not_saved` said DONE — the writer's own answer overruled. */
  const landedSaidDone: ApplyFn = async (input, deps) => {
    const o = await real(input, deps);
    return o.code === "done_unconfirmed" && o.lines.some((l) => l.includes("(not_saved)")) ? { ...o, code: "done", exitCode: 0 } : o;
  };
  /** R-O11g · DONE's `writerSaid === null` deleted: a landed `not_saved` reads DONE once an ADMIN row for it is found. */
  const notSavedOverruledByARow: ApplyFn = async (input, deps) => {
    const o = await real(input, deps);
    return o.code === "done_unconfirmed" && o.records.admin !== null && o.records.ending !== null && o.lines.some((l) => l.includes("(not_saved)"))
      && !o.lines.some((l) => l.includes("still waiting")) ? { ...o, code: "done", exitCode: 0 } : o;
  };
  /** R-O11f · an ending record that was lost, not said. */
  const lostEndingUnsaid: ApplyFn = async (input, deps) => {
    const o = await real(input, deps);
    return { ...o, lines: o.lines.filter((l) => !l.includes("its ending could not be recorded")) };
  };
  /** R-O14b · DONE's `applied.recorded` deleted: a lost _applied record (the ADMIN row found) reads DONE. */
  const appliedRecordIgnored: ApplyFn = async (input, deps) => {
    const o = await real(input, deps);
    return o.code === "done_unconfirmed" && o.records.admin !== null && o.records.ending === null ? { ...o, code: "done", exitCode: 0 } : o;
  };
  /** R-O14c · DONE's `pending === 0` deleted: an audit row still pending (the ADMIN row found, the ending recorded) reads DONE. */
  const pendingIgnored: ApplyFn = async (input, deps) => {
    const o = await real(input, deps);
    return o.code === "done_unconfirmed" && o.records.admin !== null && o.records.ending !== null && !o.lines.some((l) => l.includes("(not_saved)"))
      ? { ...o, code: "done", exitCode: 0 } : o;
  };
  /** R-O14d · DONE without the redeploy instruction (risk 2: production keeps its cached copy). */
  const noRedeploy: ApplyFn = async (input, deps) => {
    const o = await real(input, deps);
    return { ...o, lines: o.lines.filter((l) => l !== DOOR.OWNER_SAVE_SENTENCE.redeploy) };
  };
  /** R-O14e · a G5 apply that never says drafts saved before the line carry none. */
  const noDraftsLine: ApplyFn = async (input, deps) => {
    const o = await real(input, deps);
    return { ...o, lines: o.lines.filter((l) => !l.includes(DOOR.OWNER_SAVE_SENTENCE.draftsKeepNone)) };
  };
  const G5_IN = (what: string) => ({ fileBytes: g5(), by: BY(what), reason: REASON, expect: G5_EXPECT });
  const staleWriter = async () => ({ ok: false as const, reason: "stale" as const, error: WSTORE.WORDINGS_REFUSAL_SENTENCE.stale, problems: {} });
  const BARE_DOOR_IMPORT = `import "../../src/lib/server/marketing/owner-save.ts";${LF}`;
  const DOOR_EXPORT_FROM = `${LF}export { applyOwnerSave } from "../../src/lib/server/marketing/owner-save.ts";${LF}`;
  /** R-O15a · a door save shown as an admin's. */
  const asAnAdmin: Impl["savedByView"] = (savedBy, names) => {
    const name = names.get(savedBy) ?? "an admin";
    return { name, words: `by ${name}` };
  };
  /** R-O15b · the door's by shown unscreened — a number included. */
  const unscreened: Impl["savedByView"] = (savedBy, names) =>
    (savedBy.startsWith("ops: ") ? { name: `the ops door (${savedBy.slice(5)})`, words: `through the ops door (${savedBy.slice(5)})` } : VIEW.savedByView(savedBy, names));
  /** R-O15c · the cards' rule drifted from the switch card's (a second copy). */
  const drifted: Impl["opsDoorName"] = (stamp) => (stamp.startsWith("ops: ") ? `the ops door: ${stamp.slice(5)}` : null);

  /* O19 · a committed approval file that is no longer what Ali approved — each planted as the bytes on disk would be. */
  const realText = (g: Gate): string => decode(REAL.approvals[g]);
  const edited = (g: Gate, from: string, to: string): Uint8Array => enc(realText(g).split(from).join(to));
  const approvalsWith = (g: Gate, bytes: Uint8Array): Impl["approvals"] => ({ ...REAL.approvals, [g]: bytes });
  /** R-O19a · the licence basis saved without its last words — no longer the code's suggestion. */
  const G4_DRIFT = edited("G4", "and a stop is kept for good.", "and a stop is kept.");
  /** R-O19b · one Swahili word of the Blackball line (B.3) changed — no longer Appendix B. */
  const G10_DRIFT = edited("G10", "na hutuambia kama kila ujumbe umefika", "na hutuambia kama kila ujumbe ulifika");
  /** R-O19c · another source line than Ali's sentence. */
  const G5_DRIFT = edited("G5", SOURCE_LINE, "Namba yako iko orodhani kwetu.");
  /** R-O19d · a G4 file holding eight of the nine — the bought-list notice left out. */
  const G4_EIGHT = (() => {
    const o = JSON.parse(realText("G4")) as { wordings: Record<string, string> };
    delete o.wordings["notice.thirdParty"];
    return enc(JSON.stringify(o, null, 2));
  })();
  /** R-O19e · the header's G10 apply line naming a stale digest for the RG line. */
  const RG_DIGEST = /rg[.]marketing=([0-9a-f]{12})/.exec(REAL.cliRaw)?.[1] ?? "";
  const CLI_STALE = REAL.cliRaw.split(`rg.marketing=${RG_DIGEST}`).join(`rg.marketing=${"0".repeat(12)}`);
  /** R-O19f · Ali's sentence written with an escape — every reader of the file sees the escape, not the space. */
  const G5_ESCAPED = enc(realText("G5").split("Namba yako").join(`Namba${BACKSLASH}u0020yako`));

  /** O20 · the door's rules judging the RG line against the DEFAULT window, whatever the hours read. */
  const NO_HOURS: Rules = {
    ...DOOR.OWNER_SAVE_RULES,
    policyLineProblems: (key, raw, published) => PPURE.policyLineProblems(key, raw, published),
  };
  /** R-O20b · hours that could not be read taken as the default — the door goes on and records. */
  const windowGuessed: ApplyFn = (input, deps) => real(input, {
    ...deps,
    readSendWindow: async () => { const r = await deps.readSendWindow(); return r.ok ? r : WINDOW_DEFAULT; },
  });
  const AT20 = { "rg.marketing": { ...B2, en: `${B2.en} No offers are sent after 20:00 EAT.` } };

  const withSource = (rel: string, f: (t: string) => string): Readonly<Record<string, string>> => ({ ...REAL.sources, [rel]: f(REAL.sources[rel] ?? "") });
  const has = (rel: string, needle: string): boolean => (REAL.sources[rel] ?? "").includes(needle);
  const fresh = (rules: Rules = REAL.rules, o: WorldOpts = {}): World => makeWorld(rules, o);
  const IN_PART_SEED = { "adult.test": [{ v: 1, text: "x", savedAt: "not an instant", savedBy: "usr_x" }] };

  type Plant = {
    readonly name: string;
    readonly claim: string;
    readonly impl: Impl;
    readonly landed: () => Promise<boolean> | boolean;
    readonly landedAs: string;
  };
  const plants: Plant[] = [
    { name: "R-O1a · of two equal keys the last wins (JSON.parse's rule)", claim: "O1 ·", impl: { ...REAL, readApproval: lastKeyWins, rules: { ...REAL.rules, readApproval: lastKeyWins } },
      landed: () => lastKeyWins(TWICE_G5, DB_NOW).ok, landedAs: "a file holding a key twice is read" },
    { name: "R-O1b · a JSON escape decoded instead of refused", claim: "O1 ·", impl: { ...REAL, readApproval: escapesDecoded, rules: { ...REAL.rules, readApproval: escapesDecoded } },
      landed: () => escapesDecoded(SLASHED_G5, DB_NOW).ok, landedAs: "a file holding an escape is read" },
    { name: "R-O1c · a blank wording passed through (the source line cleared by the door)", claim: "O1 ·", impl: { ...REAL, readApproval: blankPasses, rules: { ...REAL.rules, readApproval: blankPasses } },
      landed: () => blankPasses(g5("   "), DB_NOW).ok, landedAs: "a blank source line is read" },
    { name: "R-O2 · the gate's keys not enforced", claim: "O2 ·", impl: { ...REAL, readApproval: anyGate, rules: { ...REAL.rules, readApproval: anyGate } },
      landed: () => anyGate(fileOf({ gate: "G5", approvedOn: DAY, wordings: { "basis.OWN_FORM": OWN_FORM } }), DB_NOW).ok, landedAs: "a G4 wording is read from a G5 file" },
    { name: "R-O3 · approvedOn judged by the file's own day", claim: "O3 ·", impl: { ...REAL, readApproval: ownClock, rules: { ...REAL.rules, readApproval: ownClock } },
      landed: () => ownClock(g5(SOURCE_LINE, "2026-10-08"), DB_NOW).ok, landedAs: "tomorrow's approval is read" },
    { name: "R-O4 · who and why screened field by field only", claim: "O4 ·", impl: { ...REAL, apply: perField },
      landed: async () => (await perField({ fileBytes: g5(), by: `Claude for Ali 1234 ${tag()}`, reason: "approved 567", expect: G5_EXPECT }, fresh().deps)).code === "done",
      landedAs: "a number split across the two is saved" },
    { name: "R-O5 · --expect never compared", claim: "O5 ·", impl: { ...REAL, apply: expectIgnored },
      landed: async () => (await expectIgnored({ fileBytes: g5(), by: BY("plant"), reason: REASON, expect: `source.phrase=${"0".repeat(12)}` }, fresh().deps)).code === "done",
      landedAs: "a wrong digest is saved" },
    { name: "R-O6 · the file read before who and why", claim: "O6 ·", impl: { ...REAL, apply: fileFirst },
      landed: async () => (await fileFirst({ fileBytes: SLASHED_G5, by: "", reason: REASON, expect: "x" }, fresh().deps)).code === "bad_file",
      landedAs: "a blank by is refused for the file" },
    { name: "R-O7 · a row read only in part taken as whole", claim: "O7 ·", impl: { ...REAL, apply: partAsWhole },
      landed: async () => { const w = fresh(REAL.rules, { wSeed: IN_PART_SEED }); const o = await partAsWhole({ fileBytes: g5(), by: BY("plant"), reason: REASON, expect: G5_EXPECT }, w.deps); return o.code !== "read_in_part" && w.rows.length > 0; },
      landedAs: "the door records over a half-read row" },
    { name: "R-O8 · the door skipping the card's rules", claim: "O8 ·", impl: { ...REAL, rules: NO_RULES },
      landed: async () => { const w = fresh(NO_RULES); await real({ fileBytes: g4({ "basis.OWN_FORM": NEVER_AGREED }), by: BY("plant"), reason: REASON, expect: expectW({ "basis.OWN_FORM": NEVER_AGREED }) }, w.deps); return w.rows.length > 0; },
      landedAs: "a wording the card refuses is recorded as approved" },
    { name: "R-O9a · the record written after the write", claim: "O9 ·", impl: { ...REAL, apply: recordsLate },
      landed: async () => { const w = fresh(); await recordsLate({ fileBytes: g5(), by: BY("plant"), reason: REASON, expect: G5_EXPECT }, w.deps); return w.rows[0]?.action === APPLYING && w.rows[0].writesAtCall > 0; },
      landedAs: "the applying row lands after the row write" },
    { name: "R-O9b · a lost record taken as recorded", claim: "O9 ·", impl: { ...REAL, apply: lostIsRecorded },
      landed: async () => { const w = fresh(REAL.rules, { lose: [APPLYING] }); await lostIsRecorded({ fileBytes: g5(), by: BY("plant"), reason: REASON, expect: G5_EXPECT }, w.deps); return w.writes() > 0; },
      landedAs: "the writer runs with no record" },
    { name: "R-O10a · this PC's clock handed to the writer", claim: "O10 ·", impl: { ...REAL, apply: pcClock },
      landed: async () => { const w = fresh(); await pcClock({ fileBytes: g5(), by: BY("plant"), reason: REASON, expect: G5_EXPECT }, w.deps); const h = ((w.wRow.row() ?? {})["source.phrase"] ?? []) as Array<Record<string, unknown>>; return h.length === 1 && h[0].savedAt !== iso(T_WRITE); },
      landedAs: "the version is stamped with this PC's instant" },
    { name: "R-O10b · the author a staff login", claim: "O10 ·", impl: { ...REAL, apply: asStaff },
      landed: async () => { const w = fresh(); await asStaff({ fileBytes: g5(), by: BY("plant"), reason: REASON, expect: G5_EXPECT }, w.deps); const h = ((w.wRow.row() ?? {})["source.phrase"] ?? []) as Array<Record<string, unknown>>; return h[0]?.savedBy === "usr_ali_login"; },
      landedAs: "the version names a login" },
    { name: "R-O10c · approve sent for a wording already saved", claim: "O10 ·", impl: { ...REAL, rules: APPROVES_ALL },
      landed: () => {
        const texts = Object.fromEntries(WPURE.WORDING_KEYS.map((k) => [k, ""])) as Record<string, string>;
        const saved = Object.fromEntries(WPURE.WORDING_KEYS.map((k) => [k, { count: 0, text: null }])) as Record<string, { count: number; text: string | null }>;
        texts["basis.OWN_FORM"] = OWN_FORM_EDIT;
        saved["basis.OWN_FORM"] = { count: 1, text: OWN_FORM };
        return APPROVES_ALL.wordingsToSave({ texts, saved, approved: {} } as never).some((x) => x.key === "basis.OWN_FORM" && x.approve);
      },
      landedAs: "the builder approves a saved wording" },
    { name: "R-O11a · a writer's refusal not recorded", claim: "O11 ·", impl: { ...REAL, apply: refusalUnrecorded },
      landed: async () => {
        const w = fresh();
        const o = await refusalUnrecorded({ fileBytes: g5(), by: BY("plant"), reason: REASON, expect: G5_EXPECT },
          { ...w.deps, saveWordings: async () => ({ ok: false, reason: "stale", error: WSTORE.WORDINGS_REFUSAL_SENTENCE.stale, problems: {} }) });
        return o.code === "writer_refused" && !w.rows.some((r) => r.action === REFUSED);
      },
      landedAs: "the refusal leaves no _refused row" },
    { name: "R-O11b · a writer that threw recorded as a refusal", claim: "O11 ·", impl: { ...REAL, apply: throwAsRefusal },
      landed: async () => {
        const w = fresh();
        await throwAsRefusal({ fileBytes: g5(), by: BY("plant"), reason: REASON, expect: G5_EXPECT }, { ...w.deps, saveWordings: async () => { throw new Error("down"); } });
        return w.rows.some((r) => r.action === REFUSED) && !w.rows.some((r) => r.action === FAILED);
      },
      landedAs: "a throw reads 'nothing was written'" },
    { name: "R-O11c · THE REVIEW'S MAJOR: not_saved taken as a refusal before the write, over a save that landed", claim: "O11 ·", impl: { ...REAL, apply: notSavedAsRefusal },
      landed: async () => {
        const w = fresh();
        w.wRow.failReadsAfterWrite(1);
        const o = await notSavedAsRefusal(G5_IN("plant"), w.deps);
        const h = ((w.wRow.row() ?? {})["source.phrase"] ?? []) as unknown[];
        return o.code === "writer_refused" && w.rows.some((r) => r.action === REFUSED) && h.length === 1;
      },
      landedAs: "'nothing was written' recorded over the door's own landed version" },
    { name: "R-O11d · a not_saved whose write did not show recorded as a refusal", claim: "O11 ·", impl: { ...REAL, apply: unconfirmedAsRefusal },
      landed: async () => {
        const w = fresh();
        w.wRow.dropWrites(true);
        w.wRow.failReadsAfterWrite(1);
        await unconfirmedAsRefusal(G5_IN("plant"), w.deps);
        return w.rows.some((r) => r.action === REFUSED) && !w.rows.some((r) => r.action === FAILED);
      },
      landedAs: "an unknown outcome reads 'nothing was written'" },
    { name: "R-O11e · a landed not_saved said DONE", claim: "O11 ·", impl: { ...REAL, apply: landedSaidDone },
      landed: async () => { const w = fresh(); w.wRow.failReadsAfterWrite(1); return (await landedSaidDone(G5_IN("plant"), w.deps)).code === "done"; },
      landedAs: "the writer's not_saved overruled" },
    { name: "R-O11g · a landed not_saved said DONE once an ADMIN row is found", claim: "O11 ·", impl: { ...REAL, apply: notSavedOverruledByARow },
      landed: async () => {
        const by = BY("plant row");
        const w = fresh(REAL.rules, { adminRows: (async () => ({ entries: [{
          id: "adm_plant", action: WSTORE.MARKETING_WORDINGS_AUDIT.action, actorId: `ops: ${by}`,
          payload: { changes: { "source.phrase": {} }, after: { "source.phrase": [{ v: 1, text: SOURCE_LINE, savedAt: iso(T_WRITE), savedBy: `ops: ${by}` }] } },
        }] })) as Deps["adminRows"] });
        w.wRow.failReadsAfterWrite(1);
        return (await notSavedOverruledByARow({ fileBytes: g5(), by, reason: REASON, expect: G5_EXPECT }, w.deps)).code === "done";
      },
      landedAs: "the writer's not_saved overruled by a row" },
    { name: "R-O11f · a lost ending record not said", claim: "O11 ·", impl: { ...REAL, apply: lostEndingUnsaid },
      landed: async () => {
        const w = fresh(REAL.rules, { lose: [REFUSED] });
        const o = await lostEndingUnsaid(G5_IN("plant"), { ...w.deps, saveWordings: staleWriter });
        return o.code === "writer_refused" && o.records.ending === null && !o.lines.some((l) => l.includes("could not be recorded"));
      },
      landedAs: "the operator is never told the ending was lost" },
    { name: "R-O12 · the door believing its own write", claim: "O12 ·", impl: { ...REAL, apply: believesItself },
      landed: async () => {
        const w = fresh();
        let reads = 0;
        const deps: Deps = { ...w.deps, readWordings: async () => {
          reads++;
          const r = await w.wStore.reloadHistories();
          if (reads < 2 || !r.ok) return r;
          const h = JSON.parse(JSON.stringify(r.histories)) as Record<string, Array<Record<string, unknown>>>;
          if (h["source.phrase"]?.[0]) h["source.phrase"][0].text = "Namba nyingine.";
          return { ...r, histories: h as never };
        } };
        return (await believesItself({ fileBytes: g5(), by: BY("plant"), reason: REASON, expect: G5_EXPECT }, deps)).code === "done";
      },
      landedAs: "a mismatching row is reported DONE" },
    { name: "R-O13a · NOTHING TO DO still records an attempt", claim: "O13 ·", impl: { ...REAL, apply: nothingRecords },
      landed: async () => { const w = fresh(); await real({ fileBytes: g5(), by: BY("plant"), reason: REASON, expect: G5_EXPECT }, w.deps); const n = w.rows.length; await nothingRecords({ fileBytes: g5(), by: BY("plant"), reason: REASON, expect: G5_EXPECT }, w.deps); return w.rows.length > n; },
      landedAs: "a second apply records a row" },
    { name: "R-O13b · a review of saved words carried out as today's words", claim: "O13 ·", impl: { ...REAL, readApproval: reviewAsWords, rules: { ...REAL.rules, readApproval: reviewAsWords } },
      landed: async () => {
        const nB2 = PPURE.normalizedPolicyTexts("rg.marketing", B2);
        const w = fresh({ ...REAL.rules, readApproval: reviewAsWords }, { pSeed: { "rg.marketing": [{ rev: 1, en: nB2.en, sw: nB2.sw, zh: nB2.zh, codeDefault: PPURE.policyDefaultFingerprint("rg.marketing"), savedAt: "2026-10-05T08:00:00.000Z", savedBy: "usr_owner_a" }] } });
        const bytes = g10({ "rg.marketing": "review" });
        const r = reviewAsWords(bytes, DB_NOW);
        const expect = r.ok ? DOOR.approvalDigests(r.approval).map((d) => `${d.key}=${d.sha12}`).join(",") : "";
        const o = await real({ fileBytes: bytes, by: BY("plant"), reason: REASON, expect }, w.deps);
        return o.code === "done" && w.writes() > 0;
      },
      landedAs: "the saved words are replaced by today's" },
    { name: "R-O14 · DONE said without the ADMIN row confirmed", claim: "O14 ·", impl: { ...REAL, apply: trustsAdmin },
      landed: async () => (await trustsAdmin({ fileBytes: g5(), by: BY("plant"), reason: REASON, expect: G5_EXPECT }, fresh(REAL.rules, { adminRows: async () => ({ entries: [] }) }).deps)).code === "done",
      landedAs: "an unconfirmed save reads DONE" },
    { name: "R-O14b · the review's MINOR: DONE without its _applied record", claim: "O14 ·", impl: { ...REAL, apply: appliedRecordIgnored },
      landed: async () => (await appliedRecordIgnored(G5_IN("plant"), fresh(REAL.rules, { lose: [APPLIED] }).deps)).code === "done",
      landedAs: "a lost _applied record reads DONE" },
    { name: "R-O14c · the review's MINOR: DONE with an audit row still pending", claim: "O14 ·", impl: { ...REAL, apply: pendingIgnored },
      landed: async () => (await pendingIgnored(G5_IN("plant"), { ...fresh().deps, pending: () => 1 })).code === "done",
      landedAs: "a pending audit row reads DONE" },
    { name: "R-O14d · DONE without the redeploy instruction", claim: "O14 ·", impl: { ...REAL, apply: noRedeploy },
      landed: async () => { const o = await noRedeploy(G5_IN("plant"), fresh().deps); return o.code === "done" && !o.lines.includes(DOOR.OWNER_SAVE_SENTENCE.redeploy); },
      landedAs: "production's cached copy is never mentioned" },
    { name: "R-O14e · a G5 apply without the drafts line", claim: "O14 ·", impl: { ...REAL, apply: noDraftsLine },
      landed: async () => { const o = await noDraftsLine(G5_IN("plant"), fresh().deps); return o.code === "done" && !o.lines.some((l) => l.includes(DOOR.OWNER_SAVE_SENTENCE.draftsKeepNone)); },
      landedAs: "drafts made before the line are never mentioned" },
    { name: "R-O15a · a door save shown as an admin's", claim: "O15 ·", impl: { ...REAL, savedByView: asAnAdmin },
      landed: () => asAnAdmin("ops: Claude for Ali (G4)", new Map()).words === "by an admin", landedAs: "the door reads 'by an admin'" },
    { name: "R-O15b · the door's by shown unscreened", claim: "O15 ·", impl: { ...REAL, savedByView: unscreened },
      landed: () => unscreened("ops: Claude 0712 345 678", new Map()).name.includes("0712"), landedAs: "a phone number is shown" },
    { name: "R-O15c · the cards' rule drifted from the switch card's", claim: "O15 ·", impl: { ...REAL, opsDoorName: drifted },
      landed: () => drifted("ops: x") !== VIEW.opsDoorName("ops: x"), landedAs: "two spellings of the door" },
    { name: "R-O15d · the page asking a user row for a door stamp", claim: "O15 ·",
      impl: { ...REAL, sources: withSource(SRC.page, (t) => t.split("if (opsDoorName(id) !== null) continue;").join("")) },
      landed: () => has(SRC.page, "if (opsDoorName(id) !== null) continue;"), landedAs: "the user read is asked again" },
    { name: "R-O15e · a form printing 'by <name>' again", claim: "O15 ·",
      impl: { ...REAL, sources: withSource(SRC.wForm, (t) => t.split("${n.savedByWords}").join("by ${n.savedByName}")) },
      landed: () => has(SRC.wForm, "${n.savedByWords}"), landedAs: "the status line names an admin" },
    { name: "R-O16a · the door loaded before the proxy rewrite (a static import)", claim: "O16 ·",
      impl: { ...REAL, sources: withSource(SRC.cli, (t) => `import { applyOwnerSave } from "../../src/lib/server/marketing/owner-save.ts";${LF}${t}`) },
      landed: () => (REAL.sources[SRC.cli] ?? "").length > 500, landedAs: "the CLI imports the door statically" },
    { name: "R-O16b · no production-environment check", claim: "O16 ·",
      impl: { ...REAL, sources: withSource(SRC.cli, (t) => t.replace('process.env.RAILWAY_ENVIRONMENT_NAME === "production" && process.env.RAILWAY_SERVICE_NAME === "50pick"', "true")) },
      landed: () => has(SRC.cli, 'process.env.RAILWAY_ENVIRONMENT_NAME === "production"'), landedAs: "the environment is no longer checked" },
    { name: "R-O16c · an apply not refused on the clock", claim: "O16 ·",
      impl: { ...REAL, sources: withSource(SRC.cli, (t) => t.replace('if (command === "apply" && clockProblem !== null) {', "if (false) {")) },
      landed: () => has(SRC.cli, 'if (command === "apply" && clockProblem !== null) {'), landedAs: "an apply goes on with a clock off" },
    { name: "R-O16d · Railway's private host left in place", claim: "O16 ·",
      impl: { ...REAL, sources: withSource(SRC.cli, (t) => t.replace('"@turntable.proxy.rlwy.net:40357"', '"@postgres.railway.internal"')) },
      landed: () => has(SRC.cli, '"@turntable.proxy.rlwy.net:40357"'), landedAs: "the private host is no longer rewritten" },
    { name: "R-O16e · the door writing SystemConfig itself", claim: "O16 ·",
      impl: { ...REAL, sources: withSource(SRC.door, (t) => `import { saveConfig } from "@/lib/server/config-store";${LF}${t}`) },
      landed: () => (REAL.sources[SRC.door] ?? "").length > 500, landedAs: "the door imports the config store" },
    { name: "R-O16f · the door reading an audit row itself", claim: "O16 ·",
      impl: { ...REAL, sources: withSource(SRC.door, (t) => `import { getAuditForTargetDurable } from "@/lib/server/audit";${LF}${t}`) },
      landed: () => (REAL.sources[SRC.door] ?? "").length > 500, landedAs: "the door imports an audit-row reader" },
    { name: "R-O16g · the door reading the card's suggestions", claim: "O16 ·",
      impl: { ...REAL, sources: withSource(SRC.door, (t) => `${t}${LF}export const sneak = () => WORDING_DEFAULTS["source.phrase"];${LF}`) },
      landed: () => (REAL.sources[SRC.door] ?? "").length > 500, landedAs: "the door names a suggestion" },
    { name: "R-O16h · a src file wiring the door into the app", claim: "O16 ·",
      impl: { ...REAL, importers: { files: REAL.importers.files, importers: ["src/app/admin/system/actions.ts"] } },
      landed: () => REAL.importers.importers.length === 0, landedAs: "an action imports the door" },
    { name: "R-O16i · the review's NIT: a bare static import of the door in the CLI", claim: "O16 ·",
      impl: { ...REAL, sources: withSource(SRC.cli, (t) => `${BARE_DOOR_IMPORT}${t}`) },
      landed: () => staticSpecifiers(`${BARE_DOOR_IMPORT}${REAL.sources[SRC.cli] ?? ""}`).some((s) => s.includes("src/lib/server/marketing/owner-save")),
      landedAs: "the bare import loads the door before the proxy rewrite" },
    { name: "R-O16j · a static export from the door in the CLI", claim: "O16 ·",
      impl: { ...REAL, sources: withSource(SRC.cli, (t) => `${t}${DOOR_EXPORT_FROM}`) },
      landed: () => staticSpecifiers(`${REAL.sources[SRC.cli] ?? ""}${DOOR_EXPORT_FROM}`).some((s) => s.includes("src/lib/server/marketing/owner-save")),
      landedAs: "the export-from loads the door before the proxy rewrite" },
    { name: "R-O16k · the review's NIT: an unreadable database clock sent to sync this PC", claim: "O16 ·",
      impl: { ...REAL, sources: withSource(SRC.cli, (t) => t.split("if (dbMs === null) {").join("if (false) {")) },
      landed: () => has(SRC.cli, "if (dbMs === null) {"), landedAs: "the unreadable clock falls to 'sync it'" },
    { name: "R-O17 · the suite out of predeploy", claim: "O17 ·",
      impl: { ...REAL, pkg: REAL.pkg.split(" && npm run test:marketing-owner-save").join("") },
      landed: () => REAL.pkg.includes(" && npm run test:marketing-owner-save"), landedAs: "predeploy no longer runs the suite" },
    { name: "R-O18 · check printing words as typed, not as stored", claim: "O18 ·",
      impl: { ...REAL, check: async (input, deps) => { const o = await DOOR.checkOwnerSave(input, deps); return { ...o, lines: o.lines.map((l) => l.split(NBSP).join(" ")) }; } },
      landed: () => PPURE.normalizedPolicyTexts("rg.marketing", B2).sw.includes(NBSP), landedAs: "the RG line's bound numbers print as plain spaces" },
    { name: "R-O19a · the G4 file's licence basis no longer the code's suggestion", claim: "O19 ·", impl: { ...REAL, approvals: approvalsWith("G4", G4_DRIFT) },
      landed: () => DOOR.readApproval(G4_DRIFT, DB_NOW).ok && decode(G4_DRIFT) !== realText("G4"), landedAs: "a valid G4 file with other words" },
    { name: "R-O19b · one Swahili word of the G10 Blackball line no longer Appendix B.3", claim: "O19 ·", impl: { ...REAL, approvals: approvalsWith("G10", G10_DRIFT) },
      landed: () => DOOR.readApproval(G10_DRIFT, DB_NOW).ok && decode(G10_DRIFT) !== realText("G10"), landedAs: "a valid G10 file with other words" },
    { name: "R-O19c · the G5 file holding another source line than Ali's sentence", claim: "O19 ·", impl: { ...REAL, approvals: approvalsWith("G5", G5_DRIFT) },
      landed: () => DOOR.readApproval(G5_DRIFT, DB_NOW).ok && decode(G5_DRIFT) !== realText("G5"), landedAs: "a valid G5 file with another line" },
    { name: "R-O19d · the G4 file holding eight of the nine", claim: "O19 ·", impl: { ...REAL, approvals: approvalsWith("G4", G4_EIGHT) },
      landed: () => { const r = DOOR.readApproval(G4_EIGHT, DB_NOW); return r.ok && r.approval.record === "wordings" && r.approval.wordings.length === 8; },
      landedAs: "a valid G4 file one wording short" },
    { name: "R-O19e · the header's G10 apply line naming a stale digest", claim: "O19 ·", impl: { ...REAL, cliRaw: CLI_STALE },
      landed: () => RG_DIGEST !== "" && CLI_STALE !== REAL.cliRaw, landedAs: "the operator's line carries a digest no file has" },
    { name: "R-O19f · Ali's sentence committed with an escape", claim: "O19 ·", impl: { ...REAL, approvals: approvalsWith("G5", G5_ESCAPED) },
      landed: () => decode(G5_ESCAPED).includes(BACKSLASH), landedAs: "the file holds a backslash" },
    { name: "R-O20a · the RG line judged against the default window, not the hours read", claim: "O20 ·", impl: { ...REAL, rules: NO_HOURS },
      landed: () => {
        const v = NO_HOURS.policyLineProblems("rg.marketing", AT20["rg.marketing"], undefined, WINDOW_9_TO_7.ok ? WINDOW_9_TO_7.hours : null);
        return PPURE.POLICY_LOCALES.every((l) => v.problems[l].length === 0);
      },
      landedAs: "'20:00' passes under a 09:00–19:00 window" },
    { name: "R-O20b · hours that could not be read taken as the default", claim: "O20 ·", impl: { ...REAL, apply: windowGuessed },
      landed: async () => {
        const w = fresh(REAL.rules, { window: WINDOW_UNREAD });
        const o = await windowGuessed({ fileBytes: g10({ "rg.marketing": B2 }), by: BY("plant"), reason: REASON, expect: expectL({ "rg.marketing": B2 }) }, w.deps);
        return o.code !== "window_unreadable" && w.rows.length > 0;
      },
      landedAs: "the door records over hours it could not read" },
  ];

  console.log(`RED CONTROL — each defect planted in memory must fire its own claim${LF}`);
  let held = 0;
  const missed: string[] = [];
  for (const plant of plants) {
    let landed = false;
    try { landed = await plant.landed(); } catch { landed = false; }
    pass = 0; fail = 0; failed.length = 0;
    const log = console.log;
    console.log = () => {};
    try { await runAssertions(plant.impl, ""); } finally { console.log = log; }
    const fired = failed.some((l) => l.startsWith(plant.claim));
    if (landed && fired) { held++; console.log(`  held  ${plant.name}`); }
    else {
      missed.push(plant.name);
      console.log(`  FAIL  ${plant.name} — ${landed ? `${plant.claim} did not fire (failed: ${failed.join(" | ") || "nothing"})` : `the plant did not land (${plant.landedAs})`}`);
    }
  }
  console.log(`${LF}RED CONTROL — ${held} of ${plants.length} proofs held${missed.length ? `; ${missed.length} FAILED` : ""}`);
  process.exitCode = missed.length === 0 ? 0 : 1;
}

// The audit ring's queue is the only thing this process waits on: drain it, then leave with the verdict.
await AUDIT.auditFlush();
process.exit(process.exitCode ?? 1);
