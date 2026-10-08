/**
 * test:marketing-settings — U49s's guard: THE LIVE SWITCH'S CLOSING TIME AND ITS TWO AUDITED WRITERS, AND THE MARKETING
 * SMS SETTINGS RECORD (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.3 U49s; decisions E13 · E14; OD62 · OD63).
 *
 * ⭐ DRIVEN, NOT READ. The reader, the gate, both writers and the settings store under test are the REAL ones —
 * `src/lib/server/marketing/live-switch.ts` driven through its declared deps (an in-memory row that answers like Postgres:
 * a copy in, a copy out; a create that refuses a taken key; a replace and a compare-and-delete that compare by value; a
 * delete that returns what it removed), and `src/lib/server/marketing/sms-settings.ts` built by its own `makeStore` over a
 * second instance of the real `defineConfig` factory (`__marketingSmsSettingsForTest`):
 *   S1  the reader — every malformed row and every failed read CLOSED with its `why`; `expired` from `closesAt` on; open
 *       one ms before; and a slow read judged at the instant it lands;  S1c the gate checks the closing time itself;
 *   S2  opening writes exactly the three keys for the chosen duration; bad durations refused with nothing written;
 *   S3  ⭐ an opening is VERIFIED and "off" is never said without proof — a write that writes nothing, throws, lands
 *       another shape or COMMITS THEN THROWS, and a read-back that FAILS, each end with the switch proven off and our
 *       row taken back, or `unconfirmed_off`; every ending recorded;
 *   S4  ⭐ fail closed on the record: a confirmation that is not recorded puts the switch back off, or says it could not;
 *   S4b ⭐ CONCURRENT OPENINGS — exactly one stands: a row another writer lands over ours stays theirs; a second opening
 *       whose first read raced ahead of the first (the switch read absent, or one stale row) WRITES NOTHING and is told
 *       so (the third review's MAJOR-2) — the conditional write, never an upsert; an opening stamped by a clock ahead of
 *       this one is never replaced as stale (the fourth review's m4);
 *   S4c ⭐ RECORD FIRST AND READ FIRST — the `opening` row before every write; a lost opening record writes nothing; an open
 *       switch is never opened over and an unreadable one never written over;
 *   S5  closing removes the row with DELETE … RETURNING and records EXACTLY what it removed; ⭐ a delete that COMMITS AND
 *       LOSES ITS REPLY is recorded as a close (`was: unknown`), never "already off" (the third review's MAJOR-1); a blind
 *       retry never deletes an opening that landed after; a first read that failed still records what it removes and
 *       records NOTHING when there was none; somebody else's later opening stands (`reopened`); a delete that never
 *       answers is `still_open_after_close`;
 *   S5c ⭐ STACKED FAULTS (the fourth review) — a close says only what a READABLE read proved: a failed first read and a
 *       failed delete never record a close while the opening stands (M1); a look that proved the row gone is believed
 *       though every read after fails (m1); no readable look, no second delete (m2); a stale row kept through failed
 *       deletes is not recorded closed (m3); a clean "no row" with no read after it is `close_unconfirmed` (n1);
 *   S5d ⭐ THE FIFTH REVIEW — a readable proof is never thrown away (a look that finds no row though the first read
 *       failed, F1; a retry's compare-and-delete that finds nothing, F2); with no final read, an opening the look saw land
 *       is reported (F3); and ONE rule says what an opening is — one stamped ahead of this clock included (F6);
 *   S5b no database → `no_database`; the ops door's `by`/`reason` screened (NFKC; no hidden, default-ignorable or lone
 *       surrogate characters; at most six numerals of any kind — in each field AND across the two);
 *   S6  (U49s-2) the three actions call `requireOwner` FIRST; switch-on reads only the duration, switch-off no form at all;
 *   S7  the writer population (the loopback probe and the U49s-2 drive name the keys by exact path — the drive only while
 *       it refuses any other database before it connects); S8 the settings bounds; S9 the store; S10 one price source;
 *   S11 (U49s-2) ⭐ no money handed to a viewer who may not read it — the owner included — nothing shown for a record that
 *       cannot be read in full, what only the form prints handed with the form only, no number named as who switched it
 *       on, driven through `marketing-sms-view.ts`; the loader itself (`loadSmsMoneyForViewerAs`, its reads injected)
 *       failing closed and walking for the owner's form only; and the page asks only `loadSmsMoneyForViewer`;
 *   S12 the ops door (the public proxy; its clock checked against the database's for an open, a close only warned — the
 *       rule itself run); S13 wiring;
 *   S14 (U49s-2) ⭐ the card's words (`marketing-sms-words.ts`) true for EVERY path the real writers take in memory —
 *       "weren't switched on" only where no write was attempted and the switch was read; "off" never unread.
 *
 * ⛔ `--prove-red` FIRST PROVES THE BASELINE GREEN, then PLANTS EACH DEFECT IN MEMORY and requires the claim that NAMES it
 * to turn red. No file is written. No database is touched.
 *
 * Run: `npm run test:marketing-settings` · Red: `npm run red:marketing-settings`
 */
delete process.env.DATABASE_URL;

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const PROVE_RED = process.argv.includes("--prove-red");

const LIVE = await import("../src/lib/server/marketing/live-switch.ts");
const PURE = await import("../src/lib/marketing/sms-settings.ts");
const STORE = await import("../src/lib/server/marketing/sms-settings.ts");
const VIEW = await import("../src/app/admin/system/marketing-sms-view.ts");
const ESTIMATE = await import("../src/lib/server/marketing/estimate.ts");
const WORDS = await import("../src/app/admin/system/marketing-sms-words.ts");
const { auditFlush, getAuditPage } = await import("../src/lib/server/audit.ts");

type LiveSwitch = Awaited<ReturnType<typeof LIVE.readMarketingLiveSwitch>>;
type WriteDeps = NonNullable<Parameters<typeof LIVE.openMarketingLiveSwitch>[1]>;
type Settings = ReturnType<typeof PURE.marketingSmsSettingsProblems>;
type SettingsStore = ReturnType<typeof STORE.__marketingSmsSettingsForTest>;
type StoreOpts = Parameters<typeof STORE.__marketingSmsSettingsForTest>[0];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CR = String.fromCharCode(13);
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8").split(CR).join("");

/* ══ THE LABELS — each once, so a red case names exactly the claim it must turn red ═════════════════════════════════ */

const L = {
  s1: "S1 · the reader — absent, unreadable (refused and thrown), the old two-key row, a fourth key, a blank enabledBy, a non-instant, 30 February, closesAt not after enabledAt, an opening over 24 h, an enabledAt in the future, an array and a string each read CLOSED with their why; from closesAt on the row reads expired with closedAt; one ms before, OPEN with its three fields; and a slow read is judged at the instant it lands",
  s1c: "S1c · the gate checks the closing time itself — an open state past its closesAt (or with no readable closesAt) lets no real carrier through; inside it, Blackball passes; the console stub always passes",
  s2: "S2 · opening writes exactly { enabledBy, enabledAt, closesAt } for the chosen duration; 30 min and 24 h are accepted; 29 min, 24 h + 1 ms and a fraction are refused bad_duration with nothing written and no audit row",
  s3: "S3 · ⭐ an opening is VERIFIED and 'off' is never said without proof — a write that writes nothing, throws, or lands another shape, one that COMMITS THEN THROWS, and a read-back that FAILS after the write each end with the switch proven off (save_failed / not_open_after_save) and our row taken back, or unconfirmed_off when the take-back cannot be proven; every ending recorded as open_failed with what was found; no 'opened' row in any of them",
  s4: "S4 · ⭐ FAIL CLOSED ON THE RECORD — a confirmation that throws, or answers not recorded, after a good write takes the row back and answers audit_failed once a read proves it off; a take-back that fails, or a read that cannot answer, answers unconfirmed_off",
  s4b: "S4b · ⭐ CONCURRENT OPENINGS, EXACTLY ONE STANDS — a row another writer lands over ours (before our read-back or our confirmation) stays theirs (other_open) and our rollback deletes nothing that is not ours; a second opening whose first read raced ahead of the first — the switch read absent, or one stale row — writes NOTHING (the conditional write, never an upsert), is told other_open, and the first opening's row is untouched; and an opening stamped by a clock ahead of this one (it reads malformed here only for that, and open at its own instant) is never replaced as stale — already_open, nothing written (the fourth review's m4); a write that throws while such an opening lands is other_open, never 'it is off now' (the fifth review's F6); and a row stamped ahead that is malformed in another way is still replaced (no over-block)",
  s4c: "S4c · ⭐ RECORD FIRST, READ FIRST — in every attempt that writes, the 'opening' COMPLIANCE row was written and confirmed BEFORE the write; an opening record that is not recorded refuses record_failed with nothing written; an open switch is never opened over (already_open) and an unreadable one is never written over (cannot_read) — nothing recorded, nothing written",
  s5: "S5 · closing removes the row with DELETE … RETURNING and records EXACTLY the row it removed — was:open with openSince, was:expired, was:malformed; ⭐ a delete that COMMITS AND LOSES ITS REPLY is recorded as a close (was:unknown, openSince), never 'already off'; a retry never deletes an opening that landed after a delete that may have worked; a delete that errored without effect is retried; a first read that failed still records the row it removes, and records NOTHING when there was none; somebody's later opening stands (reopened); a delete that never answers is still_open_after_close with no 'closed' row; an absent switch is already_closed with nothing written",
  s5c: "S5c · ⭐ STACKED FAULTS — a close says only what a READABLE read proved (the fourth review): a failed first read and a delete that fails without effect is still_open_after_close — nothing recorded, nothing retried, the opening stands (M1); a lost-reply delete whose look proved the row gone is RECORDED (was:unknown) though every read after fails (m1); with no readable look it never deletes again, and a later opening stands (m2); a stale row kept through three failed deletes is already_closed with nothing recorded (m3); a clean 'no row' with no read after it is close_unconfirmed, never 'already off' (n1); a failed first read whose delete landed is recorded once the switch reads absent; an opening that expires between the read and the delete is recorded was:expired",
  s5d: "S5d · ⭐ THE FIFTH REVIEW — a readable proof is never thrown away, and one rule says what an opening is: a look that finds no row proves the row gone though the first read failed, and the close is recorded though every read after fails (F1) — and with somebody's opening landing after that look, recorded and reopened; a retry's compare-and-delete that finds nothing proves it gone (F2); with no final read, whether an opening stands comes from the look that proved the row gone — reopened, never off (F3); an opening stamped ahead of this clock kept through failed deletes is still_open_after_close, and one landing after a clean 'no row' is reopened_meanwhile (F6)",
  s5b: "S5b · no database answers no_database before anything is written; the ops door's by and reason are screened — a phone number in brackets, dots, slashes, dashes, full-width, Arabic-Indic, circled or Ethiopic numerals, a blank, 121 characters, a line break, a bidi override, a line separator, a combining grapheme joiner, the Hangul filler and a lone surrogate are refused; six numerals pass and seven do not, in one field AND across the two; NFKC is applied; named in the row and the payload with no actor; the card needs its officer",
  s6: "S6 · the three actions call requireOwner FIRST — before any other await, in the decommented source — the switch-on action reads only the duration from the form (the form is named only as its parameter and in minutesOf, which reads getAll(\"minutes\") alone; who switched it on is the session's officer), and the switch-off action takes and reads no form at all",
  s7: "S7 · the writer population, across every source extension in src/ and scripts/ (tests aside; the loopback Postgres probe, the U49s-2 drive and U52a's four read-only tools allowed by name — the tools only while their core opens a READ ONLY transaction; the drive only while it refuses a non-loopback database before it connects) — MARKETING_LIVE_SWITCH_KEY and sms.live appear only in live-switch.ts; only the card's actions and the ops door call the two writers; marketing.sms.settings appears only in its own module, and only the card's action calls saveMarketingSmsSettings",
  s8: "S8 · the settings bounds — every boundary accepted and its neighbour refused under its own field (price 1–1,000 with at most two decimals, the reserve from the platform floor to 10,000,000, the limit 100–10,000,000, start 07:00–19:00 and end 09:00–21:00 on the quarter hour); every problem at once; the reserve's minimum follows the floor; under 2 h is refused under the end; the limit's refusal binds each 'TZS' to its amount (a no-break space)",
  s9: "S9 · the store — a partial post, an unknown key and a blank officer are refused with nothing written; a good save writes exactly the record and its ADMIN row; a stale page is refused; a no-change save writes nothing; a row it cannot read in full (a bad field, another shape, a window under 2 h) reads defaults where it failed — the window as a pair — answers readable:false and refuses every save",
  s9r: "S9r · ⛔ U13 · R1 · A PUBLISHED PROMISE HOLDS THE HOURS — new send hours are refused (published_hours, naming the time, nothing written) while a public policy line names a time they would drop: 09:00–18:00 or 08:00–21:00 under a line naming 08:00 and 20:00, and any new hours under a line naming 9 o'clock; hours that keep every named time save; a change that leaves the hours as they are is never held; lines that cannot be read refuse new hours (published_unread) but no other change",
  s10: "S10 · ONE PRICE SOURCE — nothing in src/ reads SMS_PRICE_PER_SEGMENT_TZS (decommented); the estimate RE-READS the record for every estimate and gives no price for a read that failed or a row it cannot read in full; .env.example sets no price",
  s12: "S12 · the ops door imports the two writers (and hasDatabase) and nothing that writes SystemConfig itself, rewrites Railway's private database host to the public proxy before its first read, refuses without a database, outside production's own Railway environment (with its audit secret) and — for an OPEN only — from a PC whose clock is over 20 s off the database's (the fourth review's m4; a close only warns, the fifth's F5) before any write, with that clock rule itself run (the round trip's midpoint, the 20 s edge, the direction named), and calls the writers as via ops with no actor",
  s11: "S11 · a viewer who may not read money figures is handed NO money — the card's props and the tab's props hold no TZS, no price, credit kept for codes or campaign limit, no platform floor, no measured price and no fingerprint spelling them, for a non-owner AND for an owner whose own money.figures cell hides money (who gets text, never a form); a record that cannot be read in full shows no value to anyone; a money viewer is handed the line in money ('TZS 6 per SMS · …', each TZS bound to its amount), and only the owner's form its fingerprint, the floor, the measured price and whether a save was ever made; who switched it on is never a number — in any grouping or separator, a foreign one included, the ops door's `by` too — and a name still shows; a role that could not be read is neither the owner nor shown money, and is said as such, never as 'not the owner'; the loader, driven with its reads injected, answers the owner and the money from ONE role read, fails closed (no role, a role read that failed, a no, a decider that throws) and walks the send history for the owner's form only (a history that cannot be read said so); and the page asks nothing itself — loadSmsMoneyForViewer answers, for both views, and nothing in src/app calls its role-taking twin",
  s13: "S13 · the wiring — test:/red:marketing-settings, ops:marketing-live-switch, db:probe-marketing-settings and qa:marketing-settings resolve, predeploy runs the suite after test:marketing-wordings, and client-graph-safe pins the pure settings module",
  s14: "S14 · ⭐ THE CARD'S WORDS ARE TRUE FOR EVERY PATH THE WRITER CAN TAKE (marketing-sms-words.ts, run against the real writers in memory) — a refused switch-on says 'weren't switched on' ONLY where this click attempted no write and the switch was read; a switch-on that wrote and was taken back (proven off) 'didn't complete'; a failed read or a lost race 'couldn't confirm'; one that may be on, or another's that stands, says so; already_open is worded from the read AFTER it (an opening stamped ahead of this clock is cleared first, one that no longer reads as an opening is a change, never 'already on'); a switch-off's refusals never say off; a switch-off that removed nothing says 'It was already off.' only when the read after it finds nothing stored; and no title repeats the sentence beneath it",
} as const;

let pass = 0;
let fail = 0;
const failed: string[] = [];
const ok = (label: string, cond: boolean, detail = ""): void => {
  if (cond) pass++;
  else { fail++; failed.push(label); }
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};

/* ══ FIXTURES ════════════════════════════════════════════════════════════════════════════════════════════════════ */

const copy = <T,>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));
/** Value equality, key order ignored — how Postgres compares jsonb. */
const sameValue = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object).sort(), kb = Object.keys(b as object).sort();
  return ka.join(",") === kb.join(",") && ka.every((k) => sameValue((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
};
const T0 = Date.parse("2026-10-06T09:00:00.000Z");
const iso = (ms: number): string => new Date(ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const OWNER = "usr_owner_u49s";
const THEIRS = { enabledBy: "usr_other_owner", enabledAt: iso(T0), closesAt: iso(T0 + 4 * HOUR) };
/** Somebody's opening landing after a close's delete. */
const THIRD = { ...THEIRS, enabledBy: "usr_third_owner" };
/** Another writer's opening, stamped by a clock 2 minutes ahead of this one (the fourth review's m4). */
const AHEAD = { enabledBy: "usr_other_owner", enabledAt: iso(T0 + 2 * MIN), closesAt: iso(T0 + 2 * HOUR) };
const EXPIRED = { enabledBy: OWNER, enabledAt: iso(T0 - 3 * HOUR), closesAt: iso(T0 - HOUR) };
const OPENING = "marketing.live_switch_opening";
const OPENED = "marketing.live_switch_opened";
const OPEN_FAILED = "marketing.live_switch_open_failed";
const CLOSED = "marketing.live_switch_closed";

/** The audit rows this run wrote — from the module's own ring, drained first (`audit()` queues). */
async function auditRows(): Promise<{ action: string; category: string; actorId: string | null; payload: Record<string, unknown> }[]> {
  await auditFlush();
  return getAuditPage({ limit: 500 }).map((r) => ({
    action: r.action, category: r.category, actorId: r.actorId ?? null, payload: (r.payload ?? {}) as Record<string, unknown>,
  }));
}

/** A switch row in memory that answers like Postgres, every call the writers made in order, and the faults a database has. */
type WorldOpts = {
  /** A write (create or replace) that writes nothing / throws having written nothing / lands another shape / COMMITS then throws. */
  saveNoop?: boolean; saveThrows?: boolean; saveShape?: unknown; saveLandsThenThrows?: boolean;
  /** Reads that answer unreadable (a pool blip): this many after a write · the FIRST of the run · these, counted from 1
   *  over the whole run. */
  failReadsAfterSave?: number; failFirstRead?: boolean; failReadsAt?: number[];
  /** The clock moves this far at every delete (a row that expires between the close's read and its delete). */
  tickOnTake?: number;
  /** The row changes under us: right before our write (another opening raced us), right after our write, or after an audit. */
  changeBeforeWrite?: unknown; replaceAfterSave?: unknown; replaceAfterAuditOf?: { action: string; row: unknown };
  /** Close faults: a delete that errors with no effect N times (99: never answers); a FIRST delete that commits and then
   *  loses its reply; somebody's opening landing right after a delete that removed a row; a delete that finds nothing
   *  (somebody else closed it) with a new opening landing right after. */
  takeFails?: number; takeLandsThenFails?: boolean; insertAfterTake?: unknown; takeFindsNothingThenRow?: unknown;
  takeBackNoop?: boolean;
  /** A FIRST delete that loses its reply while still in flight and commits only after the close's look (before its retry). */
  takeCommitsLate?: boolean;
  /** Somebody's row lands just before this read (counted from 1 over the whole run). */
  insertAtLoad?: { n: number; row: unknown };
  /** Audit calls, by action, that throw or answer not recorded. */
  throwAuditOf?: string[]; unrecordedAuditOf?: string[];
  noDb?: boolean; seed?: unknown;
};
function switchWorld(o: WorldOpts = {}) {
  let row: unknown = o.seed === undefined ? null : copy(o.seed);
  let clock = T0;
  let readFailures = 0;
  let firstRead = true;
  let changed = false;
  let landedOnce = false;
  let takeFails = o.takeFails ?? 0;
  const timeline: string[] = [];
  const calls = { save: 0, take: 0, takeBack: 0, audits: [] as { action: string; actorId: string | null; payload: Record<string, unknown>; recorded: boolean }[] };
  const write = (value: unknown) => {
    row = copy(o.saveShape !== undefined ? o.saveShape : value);
    readFailures = o.failReadsAfterSave ?? 0;
    if (o.replaceAfterSave !== undefined) row = copy(o.replaceAfterSave);
    if (o.saveLandsThenThrows) throw new Error("connection dropped after commit");
  };
  const raceIn = () => { if (o.changeBeforeWrite !== undefined && !changed) { changed = true; row = copy(o.changeBeforeWrite); } };
  /** Somebody's opening lands right after the FIRST delete that removed a row — once: a second delete is somebody's own. */
  let reopenedOnce = false;
  const reopenAfter = (deleted: unknown) => {
    if (deleted !== null && o.insertAfterTake !== undefined && !reopenedOnce) { reopenedOnce = true; row = copy(o.insertAfterTake); }
  };
  let loads = 0;
  let lateDelete = false;
  const deps: WriteDeps = {
    load: async () => {
      loads++;
      if (o.insertAtLoad && o.insertAtLoad.n === loads) row = copy(o.insertAtLoad.row);
      if (firstRead && o.failFirstRead) { firstRead = false; return { ok: false as const, error: "pool timeout" }; }
      firstRead = false;
      if ((o.failReadsAt ?? []).includes(loads)) return { ok: false as const, error: "pool timeout" };
      if (readFailures > 0) { readFailures--; return { ok: false as const, error: "pool timeout" }; }
      return { ok: true as const, value: copy(row) };
    },
    create: async (_key, value) => {
      calls.save++;
      timeline.push("save");
      raceIn();
      if (o.saveThrows) throw new Error("save down");
      if (row !== null) return "exists";
      if (o.saveNoop) return "created";
      write(value);
      return "created";
    },
    replace: async (_key, expected, value) => {
      calls.save++;
      timeline.push("save");
      raceIn();
      if (o.saveThrows) throw new Error("save down");
      if (!sameValue(row, expected)) return false;
      if (o.saveNoop) return true;
      write(value);
      return true;
    },
    take: async (_key, expected) => {
      calls.take++;
      timeline.push(expected === undefined ? "take" : "take-if");
      clock += o.tickOnTake ?? 0;
      // The late commit of an earlier delete lands before this statement runs.
      if (lateDelete) { lateDelete = false; row = null; }
      if (o.takeCommitsLate && !landedOnce) { landedOnce = true; lateDelete = true; return { ok: false as const, error: "reply lost in flight" }; }
      if (takeFails > 0) { takeFails--; return { ok: false as const, error: "pool timeout" }; }
      // With `expected`, a compare-and-delete: only while the row still holds exactly that value (as Postgres's jsonb `=`).
      const matches = expected === undefined || (expected !== null && row !== null && sameValue(row, expected));
      if (o.takeLandsThenFails && !landedOnce) {
        landedOnce = true;
        const deleted = matches ? copy(row) : null;
        if (matches) row = null;
        reopenAfter(deleted);
        return { ok: false as const, error: "connection dropped after commit" };
      }
      if (o.takeFindsNothingThenRow !== undefined) {
        row = copy(o.takeFindsNothingThenRow);
        return { ok: true as const, deleted: null };
      }
      if (!matches) return { ok: true as const, deleted: null };
      const deleted = copy(row);
      row = null;
      reopenAfter(deleted);
      return { ok: true as const, deleted };
    },
    takeBack: async (_key, value) => {
      calls.takeBack++;
      timeline.push("takeBack");
      if (o.takeBackNoop) return false;
      if (row !== null && sameValue(row, value)) { row = null; return true; }
      return false;
    },
    audit: async (entry) => {
      const throws = (o.throwAuditOf ?? []).includes(entry.action);
      const recorded = !throws && !(o.unrecordedAuditOf ?? []).includes(entry.action);
      calls.audits.push({ action: entry.action, actorId: entry.actorId ?? null, payload: (entry.payload ?? {}) as Record<string, unknown>, recorded });
      timeline.push(`audit:${entry.action}:${recorded ? "recorded" : "lost"}`);
      if (o.replaceAfterAuditOf && o.replaceAfterAuditOf.action === entry.action) row = copy(o.replaceAfterAuditOf.row);
      if (throws) throw new Error("audit down");
      return { recorded };
    },
    now: () => clock,
    hasDatabase: () => !o.noDb,
    sleep: async () => {},
  };
  return {
    deps,
    calls,
    timeline,
    row: () => copy(row) as Record<string, unknown> | null,
    readNow: () => LIVE.readMarketingLiveSwitch(async () => ({ ok: true as const, value: copy(row) }), clock),
    tick: (ms: number) => { clock += ms; },
  };
}
type World = ReturnType<typeof switchWorld>;
const rowsOf = (w: World, action: string) => w.calls.audits.filter((a) => a.action === action);
/** ⭐ M1: in this world, every write came after a RECORDED opening row. */
const recordedFirst = (w: World): boolean => {
  const firstSave = w.timeline.indexOf("save");
  if (firstSave < 0) return true;
  const intent = w.timeline.indexOf(`audit:${OPENING}:recorded`);
  return intent >= 0 && intent < firstSave;
};

/** A settings row in memory for the real `defineConfig` factory — a copy in, a copy out, and a count of the writes. */
function settingsWorld(seed: unknown = null) {
  let stored = seed === null ? null : copy(seed);
  let writes = 0;
  return {
    deps: {
      hasDatabase: () => true,
      loadConfigResult: async () => ({ ok: true as const, value: stored === null ? null : copy(stored) }),
      saveConfig: async (_key: string, value: unknown) => { writes++; stored = copy(value); },
    },
    writes: () => writes,
    row: () => (stored === null ? null : copy(stored)) as Record<string, unknown> | null,
  };
}

/** Every source file in src/ and scripts/, decommented — every extension a writer could hide in — except the tests. */
function sourcesOf(): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mts|cts|js|mjs|cjs)$/.test(name) && !/\.test\.[cm]?[jt]sx?$/.test(name)) {
        out.set(relative(ROOT, full).split("\\").join("/"), decomment(readFileSync(full, "utf8")).split(CR).join(""));
      }
    }
  };
  walk(join(ROOT, "src"));
  walk(join(ROOT, "scripts"));
  return out;
}

type Impl = {
  readonly read: typeof LIVE.readMarketingLiveSwitch;
  readonly gate: typeof LIVE.marketingLiveGate;
  readonly open: typeof LIVE.openMarketingLiveSwitch;
  readonly close: typeof LIVE.closeMarketingLiveSwitch;
  readonly screen: typeof LIVE.screenOpsText;
  readonly clockProblem: typeof LIVE.opsClockProblem;
  readonly cardView: typeof VIEW.marketingSmsCardView;
  readonly formView: typeof VIEW.marketingSmsFormView;
  readonly moneyFor: typeof ESTIMATE.loadSmsMoneyForViewerAs;
  readonly words: typeof WORDS;
  readonly problems: typeof PURE.marketingSmsSettingsProblems;
  readonly store: (o: StoreOpts) => SettingsStore;
  readonly sources: Map<string, string>;
  readonly envExample: string;
  readonly packageJson: string;
  readonly graphSafe: string;
};

const SOURCES = sourcesOf();
const REAL: Impl = {
  read: LIVE.readMarketingLiveSwitch,
  gate: LIVE.marketingLiveGate,
  open: LIVE.openMarketingLiveSwitch,
  close: LIVE.closeMarketingLiveSwitch,
  screen: LIVE.screenOpsText,
  clockProblem: LIVE.opsClockProblem,
  cardView: VIEW.marketingSmsCardView,
  formView: VIEW.marketingSmsFormView,
  moneyFor: ESTIMATE.loadSmsMoneyForViewerAs,
  words: WORDS,
  problems: PURE.marketingSmsSettingsProblems,
  store: (o) => STORE.__marketingSmsSettingsForTest(o),
  sources: SOURCES,
  envExample: read(".env.example"),
  packageJson: read("package.json"),
  graphSafe: read("scripts/client-graph-safe.test.mjs"),
};

const LIVE_SRC = "src/lib/server/marketing/live-switch.ts";
const SETTINGS_SRC = "src/lib/server/marketing/sms-settings.ts";
const ACTIONS_SRC = "src/app/admin/system/actions.ts";
const OPS_SRC = "scripts/ops/marketing-live-switch.mts";
const PROBE_SRC = "scripts/live/marketing-settings-pg-probe.mts";
const DRIVE_SRC = "scripts/live/marketing-u49s-settings-drive.mjs";
/** U52a's read-only tools (the STEP 54 merge): they NAME the switch's and the settings' keys in their SELECTs — by exact path,
 *  and only while their core opens every read in a READ ONLY transaction (`test:marketing-preflight` pins the rest). */
const U52A_CORE = "scripts/lib/marketing-u52a.mjs";
const U52A_READERS: readonly string[] = [U52A_CORE, "scripts/live/marketing-preflight.mjs", "scripts/live/marketing-campaign-evidence.mjs", "scripts/live/marketing-u52a-pg-probe.mts"];
const U52A_READ_ONLY = "$executeRaw`SET TRANSACTION READ ONLY`";
const PAGE_SRC = "src/app/admin/system/page.tsx";
/** The drive's refusal of any database that is not this machine's — the reason it may name the switch's keys at all. */
const DRIVE_GUARD = 'if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(dbHost)) {';
const ESTIMATE_SRC = "src/lib/server/marketing/estimate.ts";
const ESTIMATE_PRICE = "    const r = await reloadMarketingSmsSettings();\n    return r.ok && r.readable ? r.settings.pricePerSegmentTzs : null;";

/** A valid settings post (the form's text) and its base. */
const D = PURE.MARKETING_SMS_SETTINGS_DEFAULTS;
const BASE0 = PURE.settingsFingerprint({ ...D });
const post = (over: Record<string, unknown> = {}, base = BASE0): Record<string, unknown> => ({
  pricePerSegmentTzs: "7.50", codesReserveTzs: "25000", campaignLimitTzs: "12000", windowStartMinute: "510", windowEndMinute: "1140", base, ...over,
});
const openIt = (impl: Impl, w: World, forMs = 2 * HOUR) => impl.open({ actorId: OWNER, via: "card", forMs }, w.deps);
const closeIt = (impl: Impl, w: World) => impl.close({ actorId: OWNER, via: "card" }, w.deps);
type OpenR = Awaited<ReturnType<typeof LIVE.openMarketingLiveSwitch>>;
type CloseR = Awaited<ReturnType<typeof LIVE.closeMarketingLiveSwitch>>;
const why = (r: OpenR | CloseR): string =>
  (r.ok ? ("was" in r ? `closed:${r.was}${r.reopened ? "+reopened" : ""}` : "OPEN") : r.reason);

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════════════════════ */

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (label: string): string => `${tag}${label}`;

  /* ── S1 · the reader ── */
  {
    const r = (value: unknown, now = T0) => impl.read(async () => ({ ok: true as const, value: copy(value) }), now);
    const good = { enabledBy: OWNER, enabledAt: iso(T0 - HOUR), closesAt: iso(T0 + HOUR) };
    const cases: [string, LiveSwitch, string][] = [
      ["absent", await r(null), "absent"],
      ["refused read", await impl.read(async () => ({ ok: false as const, error: "down" }), T0), "unreadable"],
      ["thrown read", await impl.read(async () => { throw new Error("boom"); }, T0), "unreadable"],
      ["two-key row", await r({ enabledBy: OWNER, enabledAt: iso(T0 - MIN) }), "malformed"],
      ["fourth key", await r({ ...good, enabled: false }), "malformed"],
      ["blank enabledBy", await r({ ...good, enabledBy: "   " }), "malformed"],
      ["non-instant", await r({ ...good, enabledAt: "2026-10-06 08:00" }), "malformed"],
      ["30 February", await r({ ...good, enabledAt: "2026-02-30T08:00:00.000Z", closesAt: "2026-02-30T10:00:00.000Z" }, Date.parse("2026-03-02T09:00:00.000Z")), "malformed"],
      ["closesAt = enabledAt", await r({ ...good, closesAt: good.enabledAt }), "malformed"],
      ["over 24 h", await r({ ...good, closesAt: iso(T0 - HOUR + 24 * HOUR + 1) }), "malformed"],
      ["enabledAt in the future", await r({ ...good, enabledAt: iso(T0 + 2 * MIN), closesAt: iso(T0 + HOUR) }), "malformed"],
      ["an array", await r([]), "malformed"],
      ["a string", await r("on"), "malformed"],
    ];
    const closedRight = cases.every(([, got, w]) => got.state === "closed" && got.why === w);
    const atClose = await r(good, T0 + HOUR);
    const justBefore = await r(good, T0 + HOUR - 1);
    const expiredRight = atClose.state === "closed" && atClose.why === "expired" && atClose.closedAt === good.closesAt;
    const openRight = justBefore.state === "open" && justBefore.enabledBy === OWNER && justBefore.enabledAt === good.enabledAt
      && justBefore.closesAt === good.closesAt;
    // ⭐ A slow read is judged at the instant it LANDS: the row is open when the read starts and past its close when it ends.
    const realNow = Date.now();
    const soon = { enabledBy: OWNER, enabledAt: iso(realNow - MIN), closesAt: iso(realNow + 60) };
    const slow = await impl.read(async () => { await new Promise((res) => setTimeout(res, 150)); return { ok: true as const, value: copy(soon) }; });
    const slowRight = slow.state === "closed" && slow.why === "expired";
    ok(p(L.s1), closedRight && expiredRight && openRight && slowRight,
      `${cases.filter(([, got, w]) => !(got.state === "closed" && got.why === w)).map(([n, got]) => `${n}→${JSON.stringify(got)}`).join(" · ") || "closed cases right"} · at close ${JSON.stringify(atClose)} · before ${justBefore.state} · slow ${JSON.stringify(slow)}`);
  }

  /* ── S1c · the gate checks the closing time itself ── */
  {
    const inside = { state: "open" as const, enabledBy: OWNER, enabledAt: iso(T0 - HOUR), closesAt: iso(T0 + HOUR) };
    const g = (provider: string, live: LiveSwitch, now: number) => impl.gate(provider as never, live, now).ok;
    ok(p(L.s1c),
      g("blackball", inside, T0) && !g("blackball", inside, T0 + HOUR) && !g("blackball", inside, T0 + 2 * HOUR)
        && !g("blackball", { ...inside, closesAt: "not an instant" }, T0) && g("console", inside, T0 + 2 * HOUR)
        && !g("blackball", { state: "closed", why: "absent" }, T0),
      `inside ${g("blackball", inside, T0)} · at close ${g("blackball", inside, T0 + HOUR)} · after ${g("blackball", inside, T0 + 2 * HOUR)} · garbled ${g("blackball", { ...inside, closesAt: "not an instant" }, T0)}`);
  }

  /* ── S2 · opening writes the three keys, for the chosen duration ── */
  {
    const w30 = switchWorld();
    const r30 = await openIt(impl, w30, 30 * MIN);
    const row30 = w30.row();
    const w24 = switchWorld({ seed: EXPIRED });
    const r24 = await openIt(impl, w24, 24 * HOUR);
    const refused: string[] = [];
    let wroteOnRefusal = 0;
    for (const forMs of [29 * MIN, 24 * HOUR + 1, 30 * MIN + 0.5]) {
      const w = switchWorld();
      const r = await openIt(impl, w, forMs);
      refused.push(why(r));
      wroteOnRefusal += w.calls.save + w.calls.audits.length;
    }
    const keysRight = row30 !== null && Object.keys(row30).sort().join(",") === "closesAt,enabledAt,enabledBy"
      && row30.enabledBy === OWNER && row30.enabledAt === iso(T0) && row30.closesAt === iso(T0 + 30 * MIN);
    const o30 = rowsOf(w30, OPENED);
    ok(p(L.s2),
      r30.ok && r24.ok && keysRight && w24.row()?.closesAt === iso(T0 + 24 * HOUR)
        && o30.length === 1 && o30[0].payload.closesAt === iso(T0 + 30 * MIN) && o30[0].payload.via === "card" && o30[0].actorId === OWNER
        && refused.every((x) => x === "bad_duration") && wroteOnRefusal === 0,
      `30 min ${why(r30)} · 24 h over an expired row ${why(r24)} · row ${JSON.stringify(row30)} · refused ${refused.join(",")} · writes on refusal ${wroteOnRefusal}`);
  }

  /* ── S3 · an opening is verified, and "off" is never said without proof ── */
  {
    const run = async (o: WorldOpts) => { const w = switchWorld(o); const r = await openIt(impl, w); return { w, r, off: (await w.readNow()).state === "closed" }; };
    const silent = await run({ saveNoop: true });
    const thrown = await run({ saveThrows: true });
    const shaped = await run({ saveShape: { enabledBy: OWNER, enabledAt: iso(T0) } });
    const landed = await run({ saveLandsThenThrows: true });
    const landedStuck = await run({ saveLandsThenThrows: true, takeBackNoop: true });
    const blip = await run({ failReadsAfterSave: 1 });
    const blipStuck = await run({ failReadsAfterSave: 1, takeBackNoop: true });
    const blipLong = await run({ failReadsAfterSave: 9 });
    const all = [silent, thrown, shaped, landed, landedStuck, blip, blipStuck, blipLong];
    const outcome = (x: { w: World }) => rowsOf(x.w, OPEN_FAILED)[0]?.payload.outcome;
    ok(p(L.s3),
      why(silent.r) === "not_open_after_save" && silent.off && outcome(silent) === "off"
        && why(thrown.r) === "save_failed" && thrown.off && outcome(thrown) === "off"
        && why(shaped.r) === "not_open_after_save" && shaped.off
        && why(landed.r) === "save_failed" && landed.w.row() === null && landed.off
        && why(landedStuck.r) === "unconfirmed_off" && !landedStuck.off && outcome(landedStuck) === "unconfirmed"
        && why(blip.r) === "not_open_after_save" && blip.w.row() === null && blip.off
        && why(blipStuck.r) === "unconfirmed_off" && !blipStuck.off
        && why(blipLong.r) === "unconfirmed_off"
        && all.every((x) => rowsOf(x.w, OPENED).length === 0 && rowsOf(x.w, OPEN_FAILED).length === 1),
      `silent ${why(silent.r)} · thrown ${why(thrown.r)} · shaped ${why(shaped.r)} · committed-then-threw ${why(landed.r)} (row ${JSON.stringify(landed.w.row())}) / stuck ${why(landedStuck.r)} · read blip ${why(blip.r)} / stuck ${why(blipStuck.r)} / long ${why(blipLong.r)} · endings ${all.map((x) => String(outcome(x))).join(",")}`);
  }

  /* ── S4 · fail closed on the record ── */
  {
    const run = async (o: WorldOpts) => { const w = switchWorld(o); const r = await openIt(impl, w); return { w, r, off: (await w.readNow()).state === "closed" }; };
    const thrown = await run({ throwAuditOf: [OPENED] });
    const unrec = await run({ unrecordedAuditOf: [OPENED] });
    const stuck = await run({ throwAuditOf: [OPENED], takeBackNoop: true });
    // The take-back lands, but every read after the confirmation fails: off cannot be PROVEN.
    const w = switchWorld({ throwAuditOf: [OPENED] });
    const realLoad = w.deps.load;
    let confirmed = false;
    const blind: WriteDeps = {
      ...w.deps,
      audit: async (e) => { if (e.action === OPENED) confirmed = true; return w.deps.audit(e); },
      load: async (key) => (confirmed ? { ok: false as const, error: "pool timeout" } : realLoad(key)),
    };
    const rBlind = await impl.open({ actorId: OWNER, via: "card", forMs: 2 * HOUR }, blind);
    ok(p(L.s4),
      why(thrown.r) === "audit_failed" && thrown.w.row() === null && thrown.off && thrown.w.calls.takeBack >= 1
        && why(unrec.r) === "audit_failed" && unrec.w.row() === null && unrec.off
        && why(stuck.r) === "unconfirmed_off" && !stuck.off
        && why(rBlind) === "unconfirmed_off",
      `thrown ${why(thrown.r)} (row ${JSON.stringify(thrown.w.row())}) · unrecorded ${why(unrec.r)} · stuck ${why(stuck.r)} · unreadable after ${why(rBlind)}`);
  }

  /* ── S4b · concurrent openings: exactly one stands ── */
  {
    const beforeRead = switchWorld({ replaceAfterSave: THEIRS });
    const rBefore = await openIt(impl, beforeRead);
    const beforeConfirm = switchWorld({ replaceAfterAuditOf: { action: OPENED, row: THEIRS }, throwAuditOf: [OPENED] });
    const rConfirm = await openIt(impl, beforeConfirm);
    // ⭐ MAJOR-2: our first read saw NO row; the first opening's row lands before our write. Ours must write nothing.
    const racedAbsent = switchWorld({ changeBeforeWrite: THEIRS });
    const rRacedAbsent = await openIt(impl, racedAbsent);
    // …and our first read saw an EXPIRED row; the first opening replaces it before our write. Ours must write nothing.
    const racedStale = switchWorld({ seed: EXPIRED, changeBeforeWrite: THEIRS });
    const rRacedStale = await openIt(impl, racedStale);
    const kept = (w: World) => sameValue(w.row(), THEIRS);
    const notWritten = (w: World) => rowsOf(w, OPEN_FAILED)[0]?.payload.outcome === "not_written" && rowsOf(w, OPENED).length === 0;
    // ⛔ m4: another writer's opening stamped by a clock 2 minutes ahead of ours — malformed HERE (its enabledAt is ahead),
    // open at its own instant (proven below, so the case is real). It is never replaced as if it were stale.
    const aheadHere = await impl.read(async () => ({ ok: true as const, value: copy(AHEAD) }), T0);
    const aheadThere = await impl.read(async () => ({ ok: true as const, value: copy(AHEAD) }), T0 + 2 * MIN);
    const aheadReal = aheadHere.state === "closed" && aheadHere.why === "malformed" && aheadThere.state === "open";
    const ahead = switchWorld({ seed: AHEAD });
    const rAhead = await openIt(impl, ahead);
    // F6 (the fifth review): a write that throws while such an opening lands — theirs stands, never "it is off now".
    const aheadLanded = switchWorld({ changeBeforeWrite: AHEAD, saveThrows: true });
    const rAheadLanded = await openIt(impl, aheadLanded);
    // …and the rule never over-blocks: a row stamped ahead that is malformed in another way (a fourth key) is replaced.
    const aheadBroken = switchWorld({ seed: { ...AHEAD, note: "x" } });
    const rAheadBroken = await openIt(impl, aheadBroken);
    ok(p(L.s4b),
      why(rBefore) === "other_open" && kept(beforeRead) && rowsOf(beforeRead, OPENED).length === 0 && beforeRead.calls.takeBack === 0
        && why(rConfirm) === "other_open" && kept(beforeConfirm)
        && why(rRacedAbsent) === "other_open" && kept(racedAbsent) && notWritten(racedAbsent) && racedAbsent.calls.takeBack === 0
        && why(rRacedStale) === "other_open" && kept(racedStale) && notWritten(racedStale)
        && aheadReal && why(rAhead) === "already_open" && ahead.calls.save === 0 && sameValue(ahead.row(), AHEAD)
        && why(rAheadLanded) === "other_open" && sameValue(aheadLanded.row(), AHEAD)
        && rAheadBroken.ok && aheadBroken.row()?.enabledBy === OWNER,
      `landed before our read-back ${why(rBefore)} · landed before our confirmation ${why(rConfirm)} · raced an absent read ${why(rRacedAbsent)} (row ${JSON.stringify(racedAbsent.row())}) · raced a stale read ${why(rRacedStale)} (row ${JSON.stringify(racedStale.row())}) · stamped ahead ${why(rAhead)} (real ${aheadReal}, writes ${ahead.calls.save}) · one landing as the write threw ${why(rAheadLanded)} · stamped ahead AND malformed ${why(rAheadBroken)}`);
  }

  /* ── S4c · record first, read first ── */
  {
    const attempts: World[] = [];
    for (const o of [{}, { saveThrows: true }, { saveLandsThenThrows: true }, { failReadsAfterSave: 1 }, { throwAuditOf: [OPENED] }, { replaceAfterSave: THEIRS }, { seed: EXPIRED }] as WorldOpts[]) {
      const w = switchWorld(o);
      await openIt(impl, w);
      attempts.push(w);
    }
    const everyFirst = attempts.every(recordedFirst);
    const lostIntent = switchWorld({ unrecordedAuditOf: [OPENING] });
    const rLost = await openIt(impl, lostIntent);
    const thrownIntent = switchWorld({ throwAuditOf: [OPENING] });
    const rThrown = await openIt(impl, thrownIntent);
    const already = switchWorld({ seed: THEIRS });
    const rAlready = await openIt(impl, already);
    const blind = switchWorld({ failFirstRead: true });
    const rBlind = await openIt(impl, blind);
    ok(p(L.s4c),
      everyFirst
        && why(rLost) === "record_failed" && lostIntent.calls.save === 0 && lostIntent.row() === null
        && why(rThrown) === "record_failed" && thrownIntent.calls.save === 0
        && why(rAlready) === "already_open" && already.calls.save === 0 && already.calls.audits.length === 0 && sameValue(already.row(), THEIRS)
        && why(rBlind) === "cannot_read" && blind.calls.save === 0 && blind.calls.audits.length === 0,
      `record first in every attempt ${everyFirst} (${attempts.map((w) => w.timeline.join(">")).join(" | ")}) · lost intent ${why(rLost)} writes ${lostIntent.calls.save} · thrown intent ${why(rThrown)} · already open ${why(rAlready)} · unreadable first ${why(rBlind)}`);
  }

  /* ── S5 · closing ── */
  {
    const w = switchWorld();
    const opening = await openIt(impl, w);
    const enabledAt = w.row()?.enabledAt;
    w.tick(10 * MIN);
    const closed = await closeIt(impl, w);
    const rows = rowsOf(w, CLOSED);
    // ⭐ MAJOR-1: the delete commits and loses its reply — the close is still RECORDED (was:unknown), never "already off".
    const lost = switchWorld({ seed: THEIRS, takeLandsThenFails: true });
    const rLost = await closeIt(impl, lost);
    // …and an opening landing after that delete stands: no blind second delete.
    const lostThenOpened = switchWorld({ seed: THEIRS, takeLandsThenFails: true, insertAfterTake: { ...THEIRS, enabledBy: "usr_third_owner" } });
    const rLostThenOpened = await closeIt(impl, lostThenOpened);
    const retried = switchWorld({ seed: THEIRS, takeFails: 1 });
    const rRetried = await closeIt(impl, retried);
    const never = switchWorld({ seed: THEIRS, takeFails: 99 });
    const rNever = await closeIt(impl, never);
    const absent = switchWorld();
    const rAbsent = await closeIt(impl, absent);
    const expired = switchWorld({ seed: EXPIRED });
    const rExpired = await closeIt(impl, expired);
    const twoKey = switchWorld({ seed: { enabledBy: OWNER, enabledAt: iso(T0 - HOUR) } });
    const rTwoKey = await closeIt(impl, twoKey);
    const blindOpen = switchWorld({ seed: THEIRS, failFirstRead: true });
    const rBlindOpen = await closeIt(impl, blindOpen);
    const blindEmpty = switchWorld({ failFirstRead: true });
    const rBlindEmpty = await closeIt(impl, blindEmpty);
    const reopened = switchWorld({ seed: THEIRS, insertAfterTake: { ...THEIRS, enabledBy: "usr_third_owner" } });
    const rReopened = await closeIt(impl, reopened);
    const beatenToIt = switchWorld({ seed: THEIRS, takeFindsNothingThenRow: { ...THEIRS, enabledBy: "usr_third_owner" } });
    const rBeaten = await closeIt(impl, beatenToIt);
    const wasOf = (wx: World) => rowsOf(wx, CLOSED)[0]?.payload.was;
    ok(p(L.s5),
      opening.ok && closed.ok && closed.was === "open" && !closed.reopened && w.row() === null && closed.recorded
        && rows.length === 1 && rows[0].payload.openSince === enabledAt && rows[0].payload.via === "card" && rows[0].payload.was === "open"
        && rLost.ok && rLost.was === "unknown" && lost.row() === null && wasOf(lost) === "unknown" && rowsOf(lost, CLOSED)[0]?.payload.openSince === THEIRS.enabledAt
        && rLostThenOpened.ok && rLostThenOpened.was === "unknown" && rLostThenOpened.reopened && lostThenOpened.row()?.enabledBy === "usr_third_owner" && lostThenOpened.calls.take === 1
        && rRetried.ok && rRetried.was === "open" && retried.row() === null && retried.calls.take === 2
        && why(rNever) === "still_open_after_close" && rowsOf(never, CLOSED).length === 0 && never.row() !== null
        && why(rAbsent) === "already_closed" && absent.calls.take === 0 && absent.calls.audits.length === 0
        && rExpired.ok && rExpired.was === "expired" && expired.row() === null && wasOf(expired) === "expired"
        && rTwoKey.ok && rTwoKey.was === "malformed" && twoKey.row() === null && wasOf(twoKey) === "malformed"
        && rBlindOpen.ok && rBlindOpen.was === "open" && rowsOf(blindOpen, CLOSED)[0]?.payload.openSince === THEIRS.enabledAt
        && why(rBlindEmpty) === "already_closed" && blindEmpty.calls.audits.length === 0
        && rReopened.ok && rReopened.was === "open" && rReopened.reopened && reopened.row()?.enabledBy === "usr_third_owner" && reopened.calls.take === 1
        && why(rBeaten) === "reopened_meanwhile" && rowsOf(beatenToIt, CLOSED).length === 0,
      `close ${why(closed)} · lost reply ${why(rLost)} (row ${JSON.stringify(lost.row())}) · lost reply then opened ${why(rLostThenOpened)} (takes ${lostThenOpened.calls.take}) · retried ${why(rRetried)} · never ${why(rNever)} · absent ${why(rAbsent)} · expired ${why(rExpired)} · two-key ${why(rTwoKey)} · first read failed: open ${why(rBlindOpen)} / empty ${why(rBlindEmpty)} · reopened after delete ${why(rReopened)} · beaten to it ${why(rBeaten)}`);
  }

  /* ── S5c · stacked faults: a close says only what a readable read proved ── */
  {
    // M1: the first read fails and the delete fails without effect — the opening still stands.
    const m1 = switchWorld({ seed: THEIRS, failReadsAt: [1], takeFails: 1 });
    const rM1 = await closeIt(impl, m1);
    // m1: the delete commits and loses its reply, the look proves the row gone, then every read after it fails.
    const lostBlind = switchWorld({ seed: THEIRS, takeLandsThenFails: true, failReadsAt: [3, 4, 5] });
    const rLostBlind = await closeIt(impl, lostBlind);
    // m2: the delete commits and loses its reply, the look fails, and somebody opens meanwhile — no second delete.
    const noLook = switchWorld({ seed: THEIRS, takeLandsThenFails: true, insertAfterTake: THIRD, failReadsAt: [2] });
    const rNoLook = await closeIt(impl, noLook);
    // m3: a stale row kept through three failed deletes.
    const staleKept = switchWorld({ seed: EXPIRED, takeFails: 3 });
    const rStaleKept = await closeIt(impl, staleKept);
    // n1: the delete answers cleanly that there is no row (somebody closed it, somebody opened), then no read can be had.
    const cleanBlind = switchWorld({ seed: THEIRS, takeFindsNothingThenRow: THIRD, failReadsAt: [2, 3, 4] });
    const rCleanBlind = await closeIt(impl, cleanBlind);
    // A failed first read whose delete landed and lost its reply: the switch reads absent after — recorded, its row unknown.
    const blindLanded = switchWorld({ seed: THEIRS, failReadsAt: [1], takeLandsThenFails: true });
    const rBlindLanded = await closeIt(impl, blindLanded);
    // An opening that expires between the close's read and its delete.
    const expiring = switchWorld({ seed: { enabledBy: OWNER, enabledAt: iso(T0 - HOUR), closesAt: iso(T0 + 1) }, tickOnTake: 2 });
    const rExpiring = await closeIt(impl, expiring);
    const closedRows = (wx: World) => rowsOf(wx, CLOSED);
    ok(p(L.s5c),
      why(rM1) === "still_open_after_close" && closedRows(m1).length === 0 && sameValue(m1.row(), THEIRS) && m1.calls.take === 1
        && rLostBlind.ok && rLostBlind.was === "unknown" && closedRows(lostBlind).length === 1
        && closedRows(lostBlind)[0].payload.openSince === THEIRS.enabledAt && lostBlind.row() === null
        && rNoLook.ok && rNoLook.was === "unknown" && rNoLook.reopened && noLook.calls.take === 1 && sameValue(noLook.row(), THIRD)
        && closedRows(noLook).length === 1
        && why(rStaleKept) === "already_closed" && closedRows(staleKept).length === 0 && sameValue(staleKept.row(), EXPIRED) && staleKept.calls.take === 3
        && why(rCleanBlind) === "close_unconfirmed" && closedRows(cleanBlind).length === 0
        && rBlindLanded.ok && rBlindLanded.was === "unknown" && closedRows(blindLanded).length === 1
        && closedRows(blindLanded)[0].payload.openSince === null && blindLanded.row() === null
        && rExpiring.ok && rExpiring.was === "expired" && closedRows(expiring)[0]?.payload.was === "expired" && expiring.row() === null,
      `M1 ${why(rM1)} (closed rows ${closedRows(m1).length}, deletes ${m1.calls.take}, row ${JSON.stringify(m1.row())}) · m1 ${why(rLostBlind)} (rows ${closedRows(lostBlind).length}) · m2 ${why(rNoLook)} (deletes ${noLook.calls.take}, row ${JSON.stringify(noLook.row())}) · m3 ${why(rStaleKept)} (rows ${closedRows(staleKept).length}, deletes ${staleKept.calls.take}) · n1 ${why(rCleanBlind)} · blind first, landed ${why(rBlindLanded)} · expiring ${why(rExpiring)}`);
  }

  /* ── S5d · the fifth review: a readable proof is never thrown away, and one rule says what an opening is ── */
  {
    // F1: the first read fails, the delete commits and loses its reply, the look finds no row, every read after fails.
    const f1 = switchWorld({ seed: THEIRS, failReadsAt: [1, 3, 4, 5], takeLandsThenFails: true });
    const rF1 = await closeIt(impl, f1);
    // …and somebody's opening lands after that look: the close is recorded, and theirs stands.
    const f1b = switchWorld({ seed: THEIRS, failReadsAt: [1], takeLandsThenFails: true, insertAtLoad: { n: 3, row: THIRD } });
    const rF1b = await closeIt(impl, f1b);
    // F2: the first delete loses its reply in flight and commits after the look; the retry finds nothing; no read after.
    const f2 = switchWorld({ seed: THEIRS, takeCommitsLate: true, failReadsAt: [3, 4, 5, 6] });
    const rF2 = await closeIt(impl, f2);
    // F3: the delete commits and loses its reply, somebody opens, the look sees it, every read after fails.
    const f3 = switchWorld({ seed: THEIRS, takeLandsThenFails: true, insertAfterTake: THIRD, failReadsAt: [3, 4, 5] });
    const rF3 = await closeIt(impl, f3);
    // F6: an opening stamped ahead of this clock kept through three failed deletes; one landing after a clean "no row".
    const f6a = switchWorld({ seed: AHEAD, takeFails: 3 });
    const rF6a = await closeIt(impl, f6a);
    const f6b = switchWorld({ seed: THEIRS, takeFindsNothingThenRow: AHEAD });
    const rF6b = await closeIt(impl, f6b);
    const closedRows = (wx: World) => rowsOf(wx, CLOSED);
    ok(p(L.s5d),
      rF1.ok && rF1.was === "unknown" && !rF1.reopened && closedRows(f1).length === 1 && f1.row() === null
        && rF1b.ok && rF1b.was === "unknown" && rF1b.reopened && closedRows(f1b).length === 1 && sameValue(f1b.row(), THIRD)
        && rF2.ok && rF2.was === "unknown" && closedRows(f2).length === 1 && closedRows(f2)[0].payload.openSince === THEIRS.enabledAt
        && f2.row() === null && f2.calls.take === 2
        && rF3.ok && rF3.was === "unknown" && rF3.reopened && rF3.state.state === "closed" && rF3.state.why === "unreadable"
        && sameValue(f3.row(), THIRD)
        && why(rF6a) === "still_open_after_close" && closedRows(f6a).length === 0 && sameValue(f6a.row(), AHEAD)
        && why(rF6b) === "reopened_meanwhile" && closedRows(f6b).length === 0,
      `F1 ${why(rF1)} (rows ${closedRows(f1).length}) · F1 then opened ${why(rF1b)} · F2 ${why(rF2)} (rows ${closedRows(f2).length}, deletes ${f2.calls.take}) · F3 ${why(rF3)} (state ${JSON.stringify(rF3.ok ? rF3.state : null)}) · F6 kept ${why(rF6a)} · F6 landed ${why(rF6b)}`);
  }

  /* ── S5b · no database, the ops door's screening, the card's officer ── */
  {
    const noDb = switchWorld({ noDb: true });
    const rNoDb = await openIt(impl, noDb);
    const ops = switchWorld();
    const rOps = await impl.open({ actorId: null, via: "ops", forMs: HOUR, by: "Ｃｌａｕｄｅ for Ali (G1)", reason: "U52a live drive" }, ops.deps);
    const opsRow = ops.row();
    const opsAudit = rowsOf(ops, OPENED)[0];
    const phones = [
      "call +255 712 345 678", "(0712) 345 678", "+255 (712) 345678", "0712.345.678", "0712/345/678", "0712–345–678",
      "０７１２３４５６７８", "٠٧١٢٣٤٥٦٧٨", "❸❶❷❸❹❺❻❼❽", "፩፪፫፬፭፮፯",
    ];
    const hidden = ["Claude\u202Efor Ali", "Claude\u2028for Ali", "Claude\u0085for Ali", "Claude\nfor Ali", "Claude\u034Ffor Ali", "\u3164Claude", "Claude\uD800for Ali"];
    // The boundary: "U52a run 1234" holds six numerals in all and passes; "U52a run 12345" holds seven and does not.
    const pureRefuses = [...phones, ...hidden, "", "x".repeat(121), "U52a run 12345"].filter((t) => impl.screen(t) !== null);
    const pureKeeps = impl.screen("Claude for Ali (G1)") === "Claude for Ali (G1)" && impl.screen("ＣＬＡＵＤＥ") === "CLAUDE"
      && impl.screen("U52a run 1234") === "U52a run 1234";
    const writerRefused: string[] = [];
    for (const [by, reason] of [["(0712) 345 678", "test"], ["Claude\u202Efor Ali", "test"], ["Claude for Ali 255712", "345678 drive"]]) {
      const w = switchWorld();
      const r = await impl.open({ actorId: null, via: "ops", forMs: HOUR, by, reason }, w.deps);
      writerRefused.push(why(r));
    }
    const noOfficer = await impl.open({ actorId: "  ", via: "card", forMs: HOUR }, switchWorld().deps);
    ok(p(L.s5b),
      why(rNoDb) === "no_database" && noDb.calls.save === 0
        && rOps.ok && opsRow?.enabledBy === "ops: Claude for Ali (G1)" && opsAudit !== undefined && opsAudit.actorId === null
        && opsAudit.payload.by === "Claude for Ali (G1)" && opsAudit.payload.reason === "U52a live drive" && opsAudit.payload.via === "ops"
        && pureRefuses.length === 0 && pureKeeps && writerRefused.every((x) => x === "bad_ops_text")
        && why(noOfficer) === "no_officer",
      `no db ${why(rNoDb)} · ops ${why(rOps)} by "${String(opsRow?.enabledBy)}" · let through [${pureRefuses.map((t) => JSON.stringify(t)).join(", ")}] · keeps ${pureKeeps} · writer ${writerRefused.join(",")} · officer ${why(noOfficer)}`);
  }

  /* ── S6 · the actions call requireOwner first, and read only what they must ── */
  {
    const src = impl.sources.get(ACTIONS_SRC) ?? "";
    const bodyOf = (name: string): string => {
      const at = src.indexOf(`export async function ${name}(`);
      if (at < 0) return "";
      const next = src.indexOf("\nexport ", at + 1);
      return src.slice(at, next < 0 ? src.length : next);
    };
    const names = ["openMarketingLiveSwitchAction", "closeMarketingLiveSwitchAction", "saveMarketingSmsSettingsAction"];
    const firsts = names.map((n) => {
      const b = bodyOf(n);
      const at = b.indexOf("await ");
      return at < 0 ? "" : b.slice(at, at + 40);
    });
    const ownerFirst = firsts.every((f) => f.startsWith("await requireOwner("));
    const count = (s: string, re: RegExp): number => (s.match(re) ?? []).length;
    const open = bodyOf("openMarketingLiveSwitchAction");
    const minutesAt = src.indexOf("function minutesOf(formData: FormData): number | null {");
    const minutesFn = minutesAt < 0 ? "" : src.slice(minutesAt, src.indexOf("\n}", minutesAt) + 2);
    // The form is named twice in the switch-on action — its parameter and `minutesOf(formData)` — and twice in minutesOf —
    // its parameter and `getAll("minutes")`: nothing else of the request is read, however it is spelled.
    const readsOnlyMinutes = count(open, /\bformData\b/g) === 2 && open.includes("minutesOf(formData)")
      && count(minutesFn, /\bformData\b/g) === 2 && minutesFn.includes('formData.getAll("minutes")')
      && /openMarketingLiveSwitch\(\{ actorId: session\.userId, via: "card", forMs: minutes \* 60_000 \}\)/.test(open);
    const close = bodyOf("closeMarketingLiveSwitchAction");
    const closeNoForm = close.includes("closeMarketingLiveSwitchAction(): Promise") && !/\bformData\b/.test(close)
      && /closeMarketingLiveSwitch\(\{ actorId: session\.userId, via: "card" \}\)/.test(close);
    ok(p(L.s6), ownerFirst && readsOnlyMinutes && closeNoForm,
      `first awaits [${firsts.map((f) => f.slice(0, 26)).join(" | ")}] · switch-on reads only minutes ${readsOnlyMinutes} (formData ×${count(open, /\bformData\b/g)} / minutesOf ×${count(minutesFn, /\bformData\b/g)}) · switch-off reads no form ${closeNoForm}`);
  }

  /* ── S7 · the writer population ── */
  {
    const keyNamed: string[] = [];
    const settingsKeyNamed: string[] = [];
    const callers: string[] = [];
    const setterCallers: string[] = [];
    // The loopback probe and the U49s-2 drive may NAME the keys (they seed and read rows on a scratch cluster) — by exact
    // path, and the drive only while it refuses any other database before it connects. Neither may call a writer.
    const byName = (rel: string): boolean => rel === PROBE_SRC || rel === DRIVE_SRC || U52A_READERS.includes(rel);
    for (const [rel, text] of impl.sources) {
      if (rel !== LIVE_SRC && !byName(rel) && (/\bMARKETING_LIVE_SWITCH_KEY\b/.test(text) || text.includes("sms.live"))) keyNamed.push(rel);
      if (rel !== SETTINGS_SRC && !byName(rel) && (/\bMARKETING_SMS_SETTINGS_KEY\b/.test(text) || text.includes("sms.settings"))) settingsKeyNamed.push(rel);
      if (rel !== LIVE_SRC && /\b(?:openMarketingLiveSwitch|closeMarketingLiveSwitch)\s*\(/.test(text)) callers.push(rel);
      if (rel !== SETTINGS_SRC && /\bsaveMarketingSmsSettings\s*\(/.test(text)) setterCallers.push(rel);
    }
    const allowed = new Set([ACTIONS_SRC, OPS_SRC, PROBE_SRC]);
    const liveSrc = impl.sources.get(LIVE_SRC) ?? "";
    const wired = ["load: loadConfigResult,", "create: createConfigIfAbsent,", "replace: replaceConfigIfValue,", "take: takeConfig,", "takeBack: deleteConfigIfValue,"]
      .every((x) => liveSrc.includes(x));
    const drive = impl.sources.get(DRIVE_SRC) ?? "";
    const guardAt = drive.indexOf(DRIVE_GUARD);
    const exitAt = guardAt < 0 ? -1 : drive.indexOf("process.exit(2)", guardAt);
    const driveLoopback = guardAt > 0 && exitAt > guardAt && drive.indexOf("await sql.connect()") > exitAt;
    const u52aReadOnly = (impl.sources.get(U52A_CORE) ?? "").includes(U52A_READ_ONLY);
    ok(p(L.s7),
      keyNamed.length === 0 && settingsKeyNamed.length === 0 && callers.every((c) => allowed.has(c)) && callers.includes(OPS_SRC)
        && setterCallers.every((c) => c === ACTIONS_SRC || c === PROBE_SRC)
        && /export const MARKETING_LIVE_SWITCH_KEY = "marketing\.sms\.live";/.test(liveSrc) && wired && driveLoopback && u52aReadOnly,
      `switch key named in [${keyNamed.join(", ")}] · settings key in [${settingsKeyNamed.join(", ")}] · writer callers [${callers.join(", ")}] · setter callers [${setterCallers.join(", ")}] · shipped deps wired ${wired} · the drive refuses a non-loopback database before it connects ${driveLoopback}`);
  }

  /* ── S8 · the settings bounds ── */
  {
    const okv = { pricePerSegmentTzs: 6, codesReserveTzs: 20_000, campaignLimitTzs: 10_000, windowStartMinute: 480, windowEndMinute: 1200 };
    const judge = (over: Record<string, unknown>, floor = 50): Settings => impl.problems({ ...okv, ...over }, floor);
    const field = (s: Settings, f: string): string | undefined => (s.ok ? undefined : (s.problems as Record<string, string>)[f]);
    const accepted: [string, Record<string, unknown>][] = [
      ["price 1", { pricePerSegmentTzs: 1 }], ["price 1000", { pricePerSegmentTzs: 1000 }], ["price 6.5", { pricePerSegmentTzs: 6.5 }],
      ["price '6.50'", { pricePerSegmentTzs: "6.50" }], ["reserve 50", { codesReserveTzs: 50 }], ["reserve 10M", { codesReserveTzs: 10_000_000 }],
      ["limit 100", { campaignLimitTzs: 100 }], ["limit 10M", { campaignLimitTzs: 10_000_000 }],
      ["start 07:00", { windowStartMinute: 420 }], ["start 19:00", { windowStartMinute: 1140, windowEndMinute: 1260 }],
      ["end 09:00", { windowStartMinute: 420, windowEndMinute: 540 }], ["end 21:00", { windowEndMinute: 1260 }],
      ["exactly 2 h", { windowStartMinute: 480, windowEndMinute: 600 }],
    ];
    const refused: [string, Record<string, unknown>, string, string][] = [
      ["price 0.99", { pricePerSegmentTzs: 0.99 }, "pricePerSegmentTzs", PURE.SETTINGS_SENTENCE.price],
      ["price 1000.01", { pricePerSegmentTzs: 1000.01 }, "pricePerSegmentTzs", PURE.SETTINGS_SENTENCE.price],
      ["price 6.555", { pricePerSegmentTzs: 6.555 }, "pricePerSegmentTzs", PURE.SETTINGS_SENTENCE.price],
      ["price 'abc'", { pricePerSegmentTzs: "abc" }, "pricePerSegmentTzs", PURE.SETTINGS_SENTENCE.price],
      ["reserve 49", { codesReserveTzs: 49 }, "codesReserveTzs", PURE.SETTINGS_SENTENCE.reserve(50)],
      ["reserve 10M+1", { codesReserveTzs: 10_000_001 }, "codesReserveTzs", PURE.SETTINGS_SENTENCE.reserve(50)],
      ["reserve 20000.5", { codesReserveTzs: 20_000.5 }, "codesReserveTzs", PURE.SETTINGS_SENTENCE.reserve(50)],
      ["limit 99", { campaignLimitTzs: 99 }, "campaignLimitTzs", PURE.SETTINGS_SENTENCE.limit],
      ["limit 10M+1", { campaignLimitTzs: 10_000_001 }, "campaignLimitTzs", PURE.SETTINGS_SENTENCE.limit],
      ["start 06:45", { windowStartMinute: 405 }, "windowStartMinute", PURE.SETTINGS_SENTENCE.start],
      ["start 19:15", { windowStartMinute: 1155, windowEndMinute: 1260 }, "windowStartMinute", PURE.SETTINGS_SENTENCE.start],
      ["start 07:05", { windowStartMinute: 425 }, "windowStartMinute", PURE.SETTINGS_SENTENCE.start],
      ["end 08:45", { windowStartMinute: 420, windowEndMinute: 525 }, "windowEndMinute", PURE.SETTINGS_SENTENCE.end],
      ["end 21:15", { windowEndMinute: 1275 }, "windowEndMinute", PURE.SETTINGS_SENTENCE.end],
      ["1 h 45", { windowStartMinute: 480, windowEndMinute: 585 }, "windowEndMinute", PURE.SETTINGS_SENTENCE.length],
    ];
    const badAccepted = accepted.filter(([, over]) => !judge(over).ok).map(([n]) => n);
    const badRefused = refused.filter(([, over, f, sentence]) => field(judge(over), f) !== sentence).map(([n]) => n);
    const all = impl.problems({ pricePerSegmentTzs: 0, codesReserveTzs: 1, campaignLimitTzs: 1, windowStartMinute: 1, windowEndMinute: 2 }, 50);
    const allFive = !all.ok && Object.keys(all.problems).length === 5;
    const floored = field(judge({ codesReserveTzs: 499 }, 500), "codesReserveTzs") === PURE.SETTINGS_SENTENCE.reserve(500)
      && judge({ codesReserveTzs: 500 }, 500).ok && PURE.SETTINGS_SENTENCE.reserve(500).includes("at least 500");
    // The limit's refusal binds each "TZS" to its amount — pinned in its exact words, so the sentence itself is held too.
    const NB = String.fromCharCode(160);
    const limitWords = field(judge({ campaignLimitTzs: 99 }), "campaignLimitTzs") ?? "";
    const limitBound = limitWords === `Enter a campaign limit from TZS${NB}100 to TZS${NB}10,000,000.`;
    ok(p(L.s8), badAccepted.length === 0 && badRefused.length === 0 && allFive && floored && limitBound,
      `wrongly refused [${badAccepted.join(", ")}] · wrongly accepted [${badRefused.join(", ")}] · all five ${allFive} · floor ${floored} · limit's TZS bound ${limitBound}`);
  }

  /* ── S9 · the store ── */
  {
    const w = settingsWorld();
    const s = impl.store({ floorTzs: () => 50, factoryDeps: w.deps });
    const fresh = await s.reload();
    const partial = await s.save({ pricePerSegmentTzs: "7", base: BASE0 }, OWNER);
    const unknown = await s.save({ ...post(), extra: "1" }, OWNER);
    const noOfficer = await s.save(post(), "  ");
    const writesBefore = w.writes();
    const good = await s.save(post(), OWNER);
    const row = w.row();
    const want = { v: 1, pricePerSegmentTzs: 7.5, codesReserveTzs: 25_000, campaignLimitTzs: 12_000, windowStartMinute: 510, windowEndMinute: 1140 };
    const exact = row !== null && Object.keys(row).sort().join(",") === Object.keys(want).sort().join(",")
      && Object.entries(want).every(([k, v]) => row[k] === v);
    const stale = await s.save(post({ campaignLimitTzs: "13000" }), OWNER);
    const base1 = PURE.settingsFingerprint(want as never);
    const same = await s.save(post({}, base1), OWNER);
    const writesAfter = w.writes();
    const audits = (await auditRows()).filter((a) => a.action === STORE.MARKETING_SMS_SETTINGS_AUDIT.action);
    const lastAudit = audits[audits.length - 1];

    // A row it cannot read in full — three ways — reads defaults where it failed, the window as a pair, and refuses saves.
    const unreadable = async (seed: Record<string, unknown>) => {
      const u = settingsWorld(seed);
      const us = impl.store({ floorTzs: () => 50, factoryDeps: u.deps });
      const r = await us.reload();
      const saved = await us.save(post({}, PURE.settingsFingerprint(r.ok ? r.settings : D)), OWNER);
      return { r, saved, writes: u.writes(), row: u.row() };
    };
    const badField = await unreadable({ ...want, pricePerSegmentTzs: "x" });
    const otherShape = await unreadable({ ...want, v: 2 });
    const shortWindow = await unreadable({ ...want, windowStartMinute: 1140, windowEndMinute: 1200 });
    const readsDefaults = badField.r.ok && badField.r.settings.pricePerSegmentTzs === D.pricePerSegmentTzs && badField.r.settings.campaignLimitTzs === 12_000
      && shortWindow.r.ok && shortWindow.r.settings.windowStartMinute === D.windowStartMinute && shortWindow.r.settings.windowEndMinute === D.windowEndMinute;
    const refusesAll = [badField, otherShape, shortWindow].every((x) => x.r.ok && !x.r.readable && !x.saved.ok && x.saved.reason === "unreadable" && x.writes === 0);

    ok(p(L.s9),
      fresh.ok && !fresh.stored && fresh.readable
        && !partial.ok && partial.reason === "invalid" && Object.keys(partial.problems ?? {}).length === 4
        && !unknown.ok && unknown.reason === "not_understood" && !noOfficer.ok && noOfficer.reason === "no_officer" && writesBefore === 0
        && good.ok && good.changed.length === 5 && exact && s.get().campaignLimitTzs === 12_000
        && !stale.ok && stale.reason === "stale"
        && same.ok && same.changed.length === 0 && writesAfter === 1
        && lastAudit !== undefined && lastAudit.category === "ADMIN" && lastAudit.actorId === OWNER
        && (lastAudit.payload.after as Record<string, unknown> | undefined)?.campaignLimitTzs === 12_000
        && readsDefaults && refusesAll,
      `partial ${partial.ok ? "SAVED" : partial.reason} · unknown ${unknown.ok ? "SAVED" : unknown.reason} · good ${good.ok ? good.changed.length : good.reason} · row ${JSON.stringify(row)} · stale ${stale.ok ? "SAVED" : stale.reason} · same ${same.ok ? same.changed.length : same.reason} · writes ${writesAfter} · audits ${audits.length} · unreadable ${[badField, otherShape, shortWindow].map((x) => (x.saved.ok ? "SAVED" : x.saved.reason)).join(",")} · defaults ${readsDefaults}`);
  }

  /* ── S9r · U13 · R1 · a published promise holds the hours ── */
  {
    const said = (texts: string[] | null) => async () => (texts === null ? { ok: false as const } : { ok: true as const, texts });
    const NAMES_BOTH = "Hakuna matangazo kabla ya 08:00 wala baada ya 20:00 EAT.";
    const NAMES_OPEN = "No offers before 08:00 EAT.";
    const NAMES_ODD = "No offers after 9 o'clock at night.";
    const attempt = async (texts: string[] | null, over: Record<string, unknown>) => {
      const w = settingsWorld();
      const s = impl.store({ floorTzs: () => 50, factoryDeps: w.deps, published: said(texts) });
      const r = await s.save(post(over), OWNER);
      return { r, writes: w.writes() };
    };
    const KEEP = { windowStartMinute: "480", windowEndMinute: "1200" };
    const drops = await attempt([NAMES_BOTH], { windowStartMinute: "540", windowEndMinute: "1080" });
    const keepsOpening = await attempt([NAMES_OPEN], { windowStartMinute: "480", windowEndMinute: "1140" });
    const dropsClose = await attempt([NAMES_BOTH], { windowStartMinute: "480", windowEndMinute: "1260" });
    const oddHour = await attempt([NAMES_ODD], { windowStartMinute: "480", windowEndMinute: "1140" });
    const sameHours = await attempt([NAMES_ODD], KEEP);
    const unread = await attempt(null, { windowStartMinute: "540", windowEndMinute: "1080" });
    const unreadSameHours = await attempt(null, KEEP);
    const nothingNamed = await attempt(["No offers to a self-excluded player."], { windowStartMinute: "540", windowEndMinute: "1080" });
    const refusedFor = (x: typeof drops, reason: string) => !x.r.ok && x.r.reason === reason && x.writes === 0;
    ok(p(L.s9r),
      refusedFor(drops, "published_hours") && !drops.r.ok && drops.r.error.includes("08:00") && drops.r.error.includes("20:00")
        && keepsOpening.r.ok && keepsOpening.writes === 1
        && refusedFor(dropsClose, "published_hours") && !dropsClose.r.ok && dropsClose.r.error.includes("20:00") && !dropsClose.r.error.includes("08:00,")
        && refusedFor(oddHour, "published_hours")
        && sameHours.r.ok && refusedFor(unread, "published_unread") && unreadSameHours.r.ok && nothingNamed.r.ok
        && STORE.hoursDroppedByPublished([NAMES_BOTH], { windowStartMinute: 480, windowEndMinute: 1200 }) === null,
      `09:00–18:00 under a line naming 08:00 and 20:00 → ${drops.r.ok ? "SAVED" : drops.r.error} · 08:00–19:00 under "before 08:00" → ${keepsOpening.r.ok ? "saved" : keepsOpening.r.reason} · 08:00–21:00 → ${dropsClose.r.ok ? "SAVED" : dropsClose.r.reason} · "9 o'clock" → ${oddHour.r.ok ? "SAVED" : oddHour.r.reason} · the same hours, a price change → ${sameHours.r.ok ? "saved" : sameHours.r.reason} · lines unreadable → ${unread.r.ok ? "SAVED" : unread.r.reason}, same hours ${unreadSameHours.r.ok ? "saved" : unreadSameHours.r.reason} · nothing named → ${nothingNamed.r.ok ? "saved" : nothingNamed.r.reason}`);
  }

  /* ── S10 · one price source ── */
  {
    const envReads = [...impl.sources].filter(([rel, text]) => rel.startsWith("src/") && /SMS_PRICE_PER_SEGMENT_TZS/.test(text)).map(([rel]) => rel);
    const est = (impl.sources.get(ESTIMATE_SRC) ?? "").split(CR).join("");
    const envExampleSets = /^\s*SMS_PRICE_PER_SEGMENT_TZS\s*=/m.test(impl.envExample);
    ok(p(L.s10),
      envReads.length === 0 && est.includes(ESTIMATE_PRICE)
        && /import \{ reloadMarketingSmsSettings \} from "@\/lib\/server\/marketing\/sms-settings";/.test(est)
        && !/\bmarketingSmsSettings\(\)/.test(est) && !envExampleSets,
      `env reads in [${envReads.join(", ")}] · estimate re-reads ${est.includes(ESTIMATE_PRICE)} · cached read ${/\bmarketingSmsSettings\(\)/.test(est)} · .env.example sets it ${envExampleSets}`);
  }

  /* ── S11 · no money for a viewer who may not read it — the owner included ── */
  {
    const settings = { ok: true as const, settings: { ...D }, stored: false, readable: true };
    const half = { ok: true as const, settings: { ...D }, stored: true, readable: false };
    const live = { state: "closed" as const, why: "absent" as const };
    const nameOf = async () => "QA Owner";
    const MEASURED = { kind: "measured" as const, tzsPerSegment: 6, sends: 7, pairs: 6, spread: { min: 6, max: 6 }, since: iso(T0 - 24 * HOUR) };
    // Handed to viewers who may NOT read money — a non-owner, and an owner whose own money.figures cell hides it (D3).
    const hidden = {
      card: await impl.cardView({ live, settings, moneyVisible: false, isOwner: false, now: T0, nameOf }),
      form: impl.formView({ settings, moneyVisible: false, isOwner: false, floorTzs: 50, measured: MEASURED }),
      ownerForm: impl.formView({ settings, moneyVisible: false, isOwner: true, floorTzs: 50, measured: MEASURED }),
    };
    const MONEY = /TZS|20,?000|10,?000|pricePerSegmentTzs|codesReserveTzs|campaignLimitTzs|"floorTzs":\s*50|\|6\||Measured now/;
    const leaks = Object.entries(hidden).filter(([, v]) => MONEY.test(JSON.stringify(v))).map(([k]) => k);
    const ownerHiddenRight = !hidden.ownerForm.editable && hidden.ownerForm.base === null && hidden.ownerForm.money === null;
    // A record that cannot be read in full shows NO value — to anyone.
    const halfCard = await impl.cardView({ live, settings: half, moneyVisible: true, isOwner: true, now: T0, nameOf });
    const halfForm = impl.formView({ settings: half, moneyVisible: true, isOwner: true, floorTzs: 50, measured: MEASURED });
    const halfRight = !/TZS|EAT/.test(halfCard.limits) && !halfForm.editable && !halfForm.readable
      && halfForm.window === null && halfForm.money === null && halfForm.base === null && halfForm.measuredHint === null;
    // A viewer who may read money is handed the line in money — and only the owner's form its fingerprint.
    const cardShown = await impl.cardView({ live, settings, moneyVisible: true, isOwner: true, now: T0, nameOf });
    const formOwner = impl.formView({ settings, moneyVisible: true, isOwner: true, floorTzs: 50, measured: MEASURED });
    const formViewer = impl.formView({ settings, moneyVisible: true, isOwner: false, floorTzs: 50, measured: MEASURED });
    // Each "TZS" is bound to its amount by a no-break space, so a phone never wraps a figure away from its currency.
    const NBSP = String.fromCharCode(160);
    const shownRight = cardShown.limits.startsWith(`TZS${NBSP}6 per SMS · TZS${NBSP}20,000 kept for login and withdrawal codes · at most TZS${NBSP}10,000 per campaign`)
      && formOwner.editable && formOwner.money !== null && formOwner.base === PURE.settingsFingerprint({ ...D })
      && formOwner.measuredHint === "Measured now: TZS 6 from 7 delivered messages."
      && !formViewer.editable && formViewer.money !== null && formViewer.base === null;
    // ⛔ What only the form prints — whether a save was ever made, the floor, the measured price — goes with the form only.
    const formOnlyRight = formOwner.stored === false && formOwner.floorTzs === 50
      && [formViewer, hidden.form, hidden.ownerForm, halfForm].every((v) => v.stored === null && v.floorTzs === null && v.measuredHint === null);
    // ⛔ Who switched it on is never a number — in any grouping or separator, a foreign one included — and a name stays.
    const liveOpen = { state: "open" as const, enabledBy: "usr_owner", enabledAt: iso(T0 - HOUR), closesAt: iso(T0 + HOUR) };
    const whoFor = async (n: string) =>
      (await impl.cardView({ live: liveOpen, settings, moneyVisible: true, isOwner: true, now: T0, nameOf: async () => n })).enabledByName;
    const grouped = await Promise.all(["+255 712 345 678", "0 712-345-678", "255/712/345/678", "0·712·345·678", "+1 (415) 555-0132"].map(whoFor));
    const named = await Promise.all(["QA Owner", "Tax officer 12"].map(whoFor));
    // The ops door's `by` is screened again as it is read: a name shows, a number never does.
    const opsWho = async (by: string) =>
      (await impl.cardView({ live: { ...liveOpen, enabledBy: `ops: ${by}` }, settings, moneyVisible: true, isOwner: true, now: T0, nameOf })).enabledByName;
    const opsNamed = await opsWho("Claude for Ali (G1)");
    const opsNumber = await opsWho("0712 345 678");
    const nameRight = grouped.every((x) => x === "an owner") && named[0] === "QA Owner" && named[1] === "Tax officer 12"
      && opsNamed === "the ops door (Claude for Ali (G1))" && opsNumber === "the ops door";
    // ⭐ THE LOADER ITSELF, its reads injected: ONE role read answers the owner and the money; it fails CLOSED (no role, a
    // no, a decider that throws); and only the owner's form walks the history — one that cannot be read is said so.
    let walks = 0;
    const yes = async (): Promise<boolean> => true;
    const no = async (): Promise<boolean> => false;
    const throws = async (): Promise<boolean> => { throw new Error("decider down"); };
    const depsOf = (moneyVisible: () => Promise<boolean>, recentSends: () => Promise<never[]> = async () => { walks++; return []; }) =>
      ({ moneyVisible, recentSends, provider: () => "console", now: () => T0 });
    const m = {
      unread: await impl.moneyFor("unread", { measure: true }, depsOf(yes)),
      noRole: await impl.moneyFor(null, { measure: true }, depsOf(yes)),
      ownerNo: await impl.moneyFor("ADMIN", { measure: true }, depsOf(no)),
      ownerThrows: await impl.moneyFor("ADMIN", { measure: true }, depsOf(throws)),
      viewerYes: await impl.moneyFor("COMPLIANCE", { measure: true }, depsOf(yes)),
      ownerOtherTab: await impl.moneyFor("ADMIN", { measure: false }, depsOf(yes)),
    };
    const walksBefore = walks;
    const ownerTab = await impl.moneyFor("ADMIN", { measure: true }, depsOf(yes));
    const historyDown = await impl.moneyFor("ADMIN", { measure: true }, depsOf(yes, () => { throw new Error("history down"); }));
    const loaderRight = walksBefore === 0
      && m.unread.roleUnread && !m.unread.isOwner && !m.unread.visible && m.unread.measured === null
      && !m.noRole.roleUnread && !m.ownerNo.roleUnread && !ownerTab.roleUnread
      && !m.noRole.isOwner && !m.noRole.visible && m.noRole.measured === null
      && m.ownerNo.isOwner && !m.ownerNo.visible && m.ownerNo.measured === null
      && m.ownerThrows.isOwner && !m.ownerThrows.visible && m.ownerThrows.measured === null
      && !m.viewerYes.isOwner && m.viewerYes.visible && m.viewerYes.measured === null
      && m.ownerOtherTab.isOwner && m.ownerOtherTab.visible && m.ownerOtherTab.measured === null
      && walks === 1 && ownerTab.isOwner && ownerTab.visible && ownerTab.measured !== null
      && historyDown.measured !== null && historyDown.measured.kind === "unknown" && historyDown.measured.reason === "history-unreadable";
    // ⛔ A role that could not be read: no money anywhere, and the card and the tab say why — never "not the owner".
    const unreadCard = await impl.cardView({ live, settings, moneyVisible: m.unread.visible, isOwner: m.unread.isOwner, roleUnread: m.unread.roleUnread, now: T0, nameOf });
    const unreadForm = impl.formView({ settings, moneyVisible: m.unread.visible, isOwner: m.unread.isOwner, roleUnread: m.unread.roleUnread, floorTzs: 50, measured: MEASURED });
    const unreadRight = unreadCard.roleUnread && unreadCard.limits.includes("Your role couldn't be checked just now")
      && !MONEY.test(JSON.stringify(unreadCard)) && unreadForm.roleUnread && !unreadForm.editable && !MONEY.test(JSON.stringify(unreadForm))
      && !hidden.card.roleUnread && !hidden.form.roleUnread;
    // ⛔ The page asks nothing itself: `loadSmsMoneyForViewer` (ONE read of the stored role, the one decider) answers the
    // owner and the money, for both views — and nothing in src/app calls its role-taking twin.
    const page = impl.sources.get(PAGE_SRC) ?? "";
    const twinCallers = [...impl.sources].filter(([rel, text]) => rel.startsWith("src/app/") && /\bloadSmsMoneyForViewerAs\b/.test(text)).map(([rel]) => rel);
    const wiring = !/\bcampaignMoneyVisible\b/.test(page) && page.includes('loadSmsMoneyForViewer({ measure: tab === "marketing-sms" })')
      && (page.match(/moneyVisible: smsMoney\.visible, isOwner: smsMoney\.isOwner, roleUnread: smsMoney\.roleUnread,/g) ?? []).length === 2
      && page.includes("measured: smsMoney.measured") && twinCallers.length === 0;
    ok(p(L.s11), leaks.length === 0 && ownerHiddenRight && halfRight && shownRight && formOnlyRight && nameRight && unreadRight && loaderRight && wiring,
      `money handed to [${leaks.join(", ")}] · owner without money read-only ${ownerHiddenRight} · half-read shows nothing ${halfRight} · money viewers right ${shownRight} (owner's line "${cardShown.limits.slice(0, 40)}…", hint "${formOwner.measuredHint}") · form-only facts with the form only ${formOnlyRight} · grouped numbers named [${grouped.join(", ")}], names [${named.join(", ")}], the ops door "${opsNamed}" / "${opsNumber}" · a role unread said so ${unreadRight} · the loader fails closed and walks for the owner's form only ${loaderRight} (walks ${walks}) · page asks only the loader ${wiring}${twinCallers.length > 0 ? ` (the twin called in ${twinCallers.join(", ")})` : ""}`);
  }

  /* ── S12 · the ops door ── */
  {
    const ops = impl.sources.get(OPS_SRC) ?? "";
    const imports = [...ops.matchAll(/^\s*import[\s\S]*?from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
    const onlyTwo = imports.length === 2 && imports.includes("../../src/lib/server/prisma.ts") && imports.includes("../../src/lib/server/marketing/live-switch.ts");
    const noWriter = !/config-store|saveConfig|deleteConfig|takeConfig|createConfig|replaceConfig|PrismaClient|prisma\(\)|systemConfig/.test(ops);
    const firstWrite = Math.min(...["openMarketingLiveSwitch({", "closeMarketingLiveSwitch({"].map((x) => { const i = ops.indexOf(x); return i < 0 ? Infinity : i; }));
    const dbAt = ops.indexOf("if (!hasDatabase())");
    const envAt = ops.indexOf('process.env.RAILWAY_ENVIRONMENT_NAME === "production" && process.env.RAILWAY_SERVICE_NAME === "50pick"');
    const secretAt = ops.indexOf("process.env.AUDIT_CHAIN_SECRET");
    const sessionCompared = /auditKey === \(process\.env\.SESSION_SECRET \?\? ""\)/.test(ops);
    const asOps = /openMarketingLiveSwitch\(\{ actorId: null, via: "ops"/.test(ops) && /closeMarketingLiveSwitch\(\{ actorId: null, via: "ops"/.test(ops);
    // ⛔ m4: this PC's clock against the database's — it gates an OPEN, and a close only warns (the fifth review's F5).
    const clockAt = ops.indexOf("const clockProblem = opsClockProblem(dbMs, askedAt, Date.now());");
    const openAt = ops.indexOf('if (command === "open") {');
    const openGate = openAt < 0 ? -1 : ops.indexOf("if (clockProblem !== null) {", openAt);
    const openCall = ops.indexOf("openMarketingLiveSwitch({");
    const warnAt = ops.indexOf("if (clockProblem !== null) console.log(`WARNING:");
    const closeCall = ops.indexOf("closeMarketingLiveSwitch({");
    const closeNotGated = warnAt > openCall && warnAt < closeCall && !ops.slice(warnAt, closeCall).includes("return");
    const clockGates = clockAt > 0 && clockAt < openAt && openGate > openAt && openGate < openCall && closeNotGated;
    // …and the rule itself, RUN: within 20 s of the round trip's MIDPOINT passes; past it, the direction is named.
    const cp = impl.clockProblem;
    const clockRule = cp(T0, T0 - 100, T0 + 100) === null && cp(T0 + 20_000, T0, T0) === null
      && (cp(T0 + 21_000, T0, T0) ?? "").includes("21 s behind") && (cp(T0 - 21_000, T0, T0) ?? "").includes("21 s ahead of")
      && cp(T0 + 1_000, T0 - 30_000, T0 + 30_000) === null && (cp(null, T0, T0) ?? "").includes("couldn't be read");
    // ⛔ The public proxy before the first read: `railway run` injects a host that resolves only inside Railway.
    const proxyAt = ops.indexOf('.replace(/@postgres\\.railway\\.internal(:\\d+)?/, "@turntable.proxy.rlwy.net:40357")');
    const firstRead = ops.indexOf("async function main(");
    ok(p(L.s12), ops.length > 500 && onlyTwo && noWriter && dbAt > 0 && dbAt < firstWrite && envAt > 0 && envAt < firstWrite && secretAt > 0 && secretAt < firstWrite && sessionCompared && asOps
        && clockGates && clockRule && proxyAt > 0 && proxyAt < firstRead,
      `imports [${imports.join(", ")}] · no writer ${noWriter} · db refusal at ${dbAt} · environment check at ${envAt} · secret at ${secretAt} · clock gates the open only ${clockGates} (rule run ${clockRule}) · proxy rewrite at ${proxyAt} (main at ${firstRead}) · first write at ${firstWrite} · as ops ${asOps}`);
  }

  /* ── S13 · the wiring ── */
  {
    let scripts: Record<string, string> = {};
    try { scripts = (JSON.parse(impl.packageJson) as { scripts: Record<string, string> }).scripts; } catch { scripts = {}; }
    const predeploy = scripts.predeploy ?? "";
    ok(p(L.s13),
      scripts["test:marketing-settings"] === "tsx scripts/marketing-settings.test.mts"
        && scripts["red:marketing-settings"] === "tsx scripts/marketing-settings.test.mts --prove-red"
        && scripts["ops:marketing-live-switch"] === "tsx scripts/ops/marketing-live-switch.mts"
        && scripts["db:probe-marketing-settings"] === `tsx scripts/db-scratch.mts --reset --run npx tsx scripts/live/pg-probe-run.mts ${PROBE_SRC}`
        && scripts["qa:marketing-settings"] === `node ${DRIVE_SRC}`
        && predeploy.includes("npm run test:marketing-wordings && npm run test:marketing-settings &&")
        && impl.graphSafe.includes('"lib/marketing/sms-settings.ts"'),
      `test ${scripts["test:marketing-settings"]} · red ${scripts["red:marketing-settings"]} · ops ${scripts["ops:marketing-live-switch"]} · probe ${scripts["db:probe-marketing-settings"]} · qa ${scripts["qa:marketing-settings"]} · predeploy ${predeploy.includes("test:marketing-settings")} · pinned ${impl.graphSafe.includes('"lib/marketing/sms-settings.ts"')}`);
  }

  /* ── S14 · the card's words, true for every path the writer can take ── */
  {
    const W = impl.words;
    // ⛔ The expected words are spelled HERE, never read from the module under test — a plant cannot agree with itself.
    const NOT_ON = "Marketing SMS weren't switched on";
    const TAKEN_BACK = "The switch-on didn't complete";
    const UNSURE = "Couldn't confirm whether marketing SMS are on";
    const repeats = (title: string, body: string): boolean => body.toLowerCase().startsWith(title.toLowerCase().replace(/[.…]+$/, ""));
    // How the read after an `already_open` sees the switch — exactly as the action reads it (`readsAsAfterAlreadyOpen`).
    const readsAsOf = async (w: World): Promise<"open" | "malformed" | "other"> => {
      const s = await w.readNow();
      return s.state === "open" ? "open" : s.why === "malformed" ? "malformed" : "other";
    };
    const third = { enabledBy: "usr_third_owner", enabledAt: iso(T0), closesAt: iso(T0 + 3 * HOUR) };
    const openCases: { name: string; opts: WorldOpts; forMs?: number; expect: string }[] = [
      { name: "a bad duration", opts: {}, forMs: 29 * MIN, expect: NOT_ON },
      { name: "no database", opts: { noDb: true }, expect: NOT_ON },
      { name: "the opening record lost", opts: { unrecordedAuditOf: [OPENING] }, expect: NOT_ON },
      { name: "the first read failed", opts: { failFirstRead: true }, expect: UNSURE },
      { name: "a lost race whose re-read failed", opts: { changeBeforeWrite: THEIRS, failReadsAt: [2] }, expect: UNSURE },
      { name: "a lost race to another opening", opts: { changeBeforeWrite: THEIRS }, expect: "Two switch-ons at once" },
      { name: "a write that threw", opts: { saveThrows: true }, expect: TAKEN_BACK },
      { name: "a write that landed then threw", opts: { saveLandsThenThrows: true }, expect: TAKEN_BACK },
      { name: "a write that landed another shape", opts: { saveShape: { enabledBy: OWNER, enabledAt: iso(T0) } }, expect: TAKEN_BACK },
      { name: "a confirmation that failed", opts: { throwAuditOf: [OPENED] }, expect: TAKEN_BACK },
      { name: "a take-back that could not be proven", opts: { throwAuditOf: [OPENED], takeBackNoop: true }, expect: "Marketing SMS may still be on" },
    ];
    const openWrong: string[] = [];
    for (const c of openCases) {
      const w = switchWorld(c.opts);
      const r = await openIt(impl, w, c.forMs ?? 2 * HOUR);
      const reason = r.ok ? "OPEN" : r.reason;
      const title = W.openRefusalTitle(r.ok ? undefined : r.reason);
      const toast = r.ok ? null : W.openRefusalToast(r.reason, r.error);
      const after = await w.readNow();
      const oursReadsOn = after.state === "open" && after.enabledBy === OWNER;
      // ⭐ GROUND TRUTH, not the case list: "weren't switched on" only where no write was attempted AND the switch was read;
      // "didn't complete" only where a write was attempted and nothing of ours reads as on.
      const truthful = (title !== NOT_ON || (w.calls.save === 0 && !c.opts.failFirstRead))
        && (title !== TAKEN_BACK || (w.calls.save > 0 && !oursReadsOn));
      if (r.ok || title !== c.expect || !truthful || toast === null || repeats(toast.title, toast.description)) {
        openWrong.push(`${c.name}: ${reason} → "${title}"`);
      }
    }
    // already_open — worded from the read AFTER it: another's opening; one stamped ahead of this clock (malformed here).
    const alreadyCases = [
      { name: "an opening", seed: THEIRS, title: "Switched on since this page loaded" },
      { name: "an opening stamped ahead", seed: AHEAD, title: "Clear the stored switch first" },
    ];
    for (const c of alreadyCases) {
      const w = switchWorld({ seed: c.seed });
      const r = await openIt(impl, w);
      const t = r.ok ? null : W.openRefusalToast(r.reason, r.error, await readsAsOf(w));
      const sane = t !== null && t.title === c.title && !repeats(t.title, t.description)
        && (c.seed === AHEAD ? !/already on/i.test(`${t.title} ${t.description}`) : t.description === (r.ok ? "" : r.error));
      if (r.ok || r.reason !== "already_open" || !sane) openWrong.push(`already open (${c.name}): "${t?.title}" / "${t?.description}"`);
    }
    // …and one that no longer reads as an opening is a change, never "already on".
    const gone = W.openRefusalToast("already_open", LIVE.LIVE_SWITCH_REFUSAL_SENTENCE.already_open, "other");
    if (gone.title !== UNSURE || /already on/i.test(gone.description)) openWrong.push(`already open, gone since: "${gone.title}" / "${gone.description}"`);
    // A switch-off's refusals never say off; and "nothing to remove" is said as the read after it found the switch.
    const closeCases: { name: string; opts: WorldOpts; reason: string; expect: string }[] = [
      { name: "a delete that never answers", opts: { seed: THEIRS, takeFails: 99 }, reason: "still_open_after_close", expect: "Marketing SMS are still on" },
      { name: "beaten to it, then another opening", opts: { seed: THEIRS, takeFindsNothingThenRow: third }, reason: "reopened_meanwhile", expect: "Your switch-off didn't hold" },
      { name: "a clean 'no row' with no read after it", opts: { seed: THEIRS, takeFindsNothingThenRow: third, failReadsAt: [2, 3, 4] }, reason: "close_unconfirmed", expect: "Couldn't confirm marketing SMS are off" },
    ];
    const closeWrong: string[] = [];
    for (const c of closeCases) {
      const w = switchWorld(c.opts);
      const r = await closeIt(impl, w);
      const title = W.closeRefusalTitle(r.ok ? undefined : r.reason);
      if (r.ok || r.reason !== c.reason || title !== c.expect || /^(it was )?already off|^marketing sms are off/i.test(title) || repeats(title, r.error)) {
        closeWrong.push(`${c.name}: ${why(r)} → "${title}"`);
      }
    }
    const offCases: { name: string; opts: WorldOpts; remains: string; success: boolean }[] = [
      { name: "nothing stored", opts: {}, remains: "none", success: true },
      { name: "a stale row three deletes could not remove (m3)", opts: { seed: EXPIRED, takeFails: 3 }, remains: "stale", success: false },
    ];
    for (const c of offCases) {
      const w = switchWorld(c.opts);
      const r = await closeIt(impl, w);
      const s = await w.readNow();
      const remains = s.state === "open" ? "open" : s.why === "absent" ? "none" : s.why === "unreadable" ? "unread" : "stale";
      const t = W.alreadyOffToast(remains);
      const right = !r.ok && r.reason === "already_closed" && remains === c.remains && (t.variant === "success") === c.success
        && (t.title === "It was already off.") === c.success;
      if (!right) closeWrong.push(`already off (${c.name}): ${why(r)} · ${remains} → "${t.title}"`);
    }
    const unsure = (["open", "unread"] as const).map((x) => W.alreadyOffToast(x)).filter((t) => /already off/i.test(t.title) || t.variant === "success");
    if (unsure.length > 0) closeWrong.push(`already off said over an opening or no read: ${unsure.map((t) => t.title).join(" · ")}`);
    ok(p(L.s14), openWrong.length === 0 && closeWrong.length === 0,
      `switch-on [${openWrong.join(" | ")}] · switch-off [${closeWrong.join(" | ")}]`);
  }
}

/* ══ THE RUN ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`\nmarketing-settings: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  /* ── THE BASELINE — a plant can only "hold" against claims the real code PASSES ── */
  {
    const log = console.log;
    console.log = () => {};
    try { await runAssertions(REAL, ""); } finally { console.log = log; }
    if (fail > 0) {
      console.log(`RED CONTROL — NOT RUN: the baseline is not green (${fail} claim(s) fail for the REAL code):\n  ${failed.join("\n  ")}`);
      process.exit(1);
    }
    console.log(`RED CONTROL — baseline green (${pass} claims pass for the real code)\n`);
  }

  /* ── THE PLANTS — each a defect this unit could really ship, planted in memory ── */
  const KEY = LIVE.MARKETING_LIVE_SWITCH_KEY;
  const absentLoad = async () => ({ ok: true as const, value: null });

  /** R-S1 · the old two-key row read open. */
  const twoKeyOpen: typeof LIVE.readMarketingLiveSwitch = async (load = absentLoad, now) => {
    const got = await load(KEY).catch(() => ({ ok: false as const, error: "x" }));
    const v = got.ok ? (got.value as Record<string, unknown> | null) : null;
    if (v && typeof v === "object" && Object.keys(v).sort().join(",") === "enabledAt,enabledBy") {
      return { state: "open", enabledBy: String(v.enabledBy), enabledAt: String(v.enabledAt), closesAt: "9999-12-31T00:00:00.000Z" };
    }
    return LIVE.readMarketingLiveSwitch(load, now);
  };
  /** R-S1b · an expired row read open. */
  const expiredOpen: typeof LIVE.readMarketingLiveSwitch = async (load = absentLoad, now) => {
    const real = await LIVE.readMarketingLiveSwitch(load, now);
    return real.state === "closed" && real.why === "expired" && real.closedAt ? LIVE.readMarketingLiveSwitch(load, Date.parse(real.closedAt) - 1) : real;
  };
  /** R-S1d · "now" taken BEFORE the read (the pre-review default parameter). */
  const nowBeforeLoad: typeof LIVE.readMarketingLiveSwitch = (load = absentLoad, now = Date.now()) => LIVE.readMarketingLiveSwitch(load, now);
  /** R-S1c · the gate trusting an open state whatever its closing time. */
  const gateIgnoresClose: typeof LIVE.marketingLiveGate = (provider, live) =>
    provider === "console" ? { ok: true, via: "stub" } : provider === "blackball" && live.state === "open" ? { ok: true, via: "open" } : { ok: false, reason: "live_sends_closed" };
  /** R-S3 · an opening that trusts its write — the read-back answers what was written, not what the row holds. */
  const trustsSave: typeof LIVE.openMarketingLiveSwitch = (i, deps) => {
    if (!deps) return LIVE.openMarketingLiveSwitch(i);
    let saved: unknown = null;
    return LIVE.openMarketingLiveSwitch(i, {
      ...deps,
      create: async (key, value) => { saved = value; return deps.create(key, value); },
      replace: async (key, expected, value) => { saved = value; return deps.replace(key, expected, value); },
      load: async (key) => (saved !== null ? { ok: true as const, value: saved } : deps.load(key)),
    });
  };
  /** R-S3b · THE FIRST REVIEW'S MAJOR, undone: a rollback that takes an unreadable read as proof the switch is off. */
  const unreadableIsOff: typeof LIVE.openMarketingLiveSwitch = (i, deps) => {
    if (!deps) return LIVE.openMarketingLiveSwitch(i);
    let wrote = false;
    return LIVE.openMarketingLiveSwitch(i, {
      ...deps,
      create: async (key, value) => { wrote = true; return deps.create(key, value); },
      load: async (key) => { const r = await deps.load(key); return wrote && !r.ok ? { ok: true as const, value: null } : r; },
    });
  };
  /** R-S4 · a failed confirmation that leaves the switch open — the row is put back after the writer took it away. */
  const leavesOpen: typeof LIVE.openMarketingLiveSwitch = async (i, deps) => {
    if (!deps) return LIVE.openMarketingLiveSwitch(i);
    let saved: unknown = null;
    const r = await LIVE.openMarketingLiveSwitch(i, { ...deps, create: async (key, value) => { saved = value; return deps.create(key, value); } });
    if (!r.ok && (r.reason === "audit_failed" || r.reason === "unconfirmed_off") && saved !== null) {
      // The plant's own re-write may meet the same fault the world injects (a write that throws): it is the plant's, swallowed.
      try { await deps.create(KEY, saved); } catch { /* still the plant */ }
      const back = await LIVE.readMarketingLiveSwitch(deps.load, deps.now());
      return back.state === "open" ? { ok: true, state: back, recorded: true } : r;
    }
    return r;
  };
  /** R-S4b · a rollback that deletes whatever is there — a second owner's opening included. */
  const deletesTheirs: typeof LIVE.openMarketingLiveSwitch = (i, deps) =>
    deps ? LIVE.openMarketingLiveSwitch(i, { ...deps, takeBack: async (key) => { const r = await deps.take(key); return r.ok && r.deleted !== null; } }) : LIVE.openMarketingLiveSwitch(i);
  /** R-S4e · THE THIRD REVIEW'S MAJOR-2, undone: an unconditional write (an upsert) — whatever the key holds when the write
   *  lands is replaced, so the second of two openings replaces the first. */
  const upserts: typeof LIVE.openMarketingLiveSwitch = (i, deps) => {
    if (!deps) return LIVE.openMarketingLiveSwitch(i);
    const force = async (key: string, value: unknown) => { await deps.take(key); await deps.create(key, value); };
    return LIVE.openMarketingLiveSwitch(i, {
      ...deps,
      create: async (key, value) => { if ((await deps.create(key, value)) === "exists") await force(key, value); return "created"; },
      replace: async (key, expected, value) => { if (!(await deps.replace(key, expected, value))) await force(key, value); return true; },
    });
  };
  /** R-S4c · THE SECOND REVIEW'S M1, undone: the switch written with nothing recorded first. */
  const noIntent: typeof LIVE.openMarketingLiveSwitch = (i, deps) =>
    deps ? LIVE.openMarketingLiveSwitch(i, { ...deps, audit: async (e) => (e.action === OPENING ? { recorded: true } : deps.audit(e)) }) : LIVE.openMarketingLiveSwitch(i);
  /** R-S4d · m1, undone: the first read blinded — an opening is not seen before the write. */
  const overOpening: typeof LIVE.openMarketingLiveSwitch = (i, deps) => {
    if (!deps) return LIVE.openMarketingLiveSwitch(i);
    let loads = 0;
    return LIVE.openMarketingLiveSwitch(i, { ...deps, load: async (key) => (loads++ === 0 ? { ok: true as const, value: null } : deps.load(key)) });
  };
  /** R-S5 · a close that reports success without a read-back. */
  const closesBlind: typeof LIVE.closeMarketingLiveSwitch = (i, deps) => {
    if (!deps) return LIVE.closeMarketingLiveSwitch(i);
    let loads = 0;
    return LIVE.closeMarketingLiveSwitch(i, { ...deps, load: async (key) => (loads++ === 0 ? deps.load(key) : { ok: true as const, value: null }) });
  };
  /** R-S5c · a close that leaves an expired or malformed row behind — "it already reads off". */
  const leavesStale: typeof LIVE.closeMarketingLiveSwitch = async (i, deps) => {
    if (!deps) return LIVE.closeMarketingLiveSwitch(i);
    const current = await LIVE.readMarketingLiveSwitch(deps.load, deps.now());
    if (current.state === "closed" && (current.why === "expired" || current.why === "malformed")) {
      return { ok: false, reason: "already_closed", error: LIVE.LIVE_SWITCH_REFUSAL_SENTENCE.already_closed };
    }
    return LIVE.closeMarketingLiveSwitch(i, deps);
  };
  /** R-S5d · m2, undone: a close blind to the row its delete removed — it records nothing when the first read failed. */
  const closeBlindToDeleted: typeof LIVE.closeMarketingLiveSwitch = (i, deps) =>
    deps ? LIVE.closeMarketingLiveSwitch(i, { ...deps, take: async (key, expected) => { const r = await deps.take(key, expected); return r.ok ? { ok: true, deleted: null } : r; } }) : LIVE.closeMarketingLiveSwitch(i);
  /** R-S5e · THE THIRD REVIEW'S MAJOR-1, undone: a delete with a lost reply treated as "nothing happened". */
  const lostReplyIsNothing: typeof LIVE.closeMarketingLiveSwitch = (i, deps) =>
    deps ? LIVE.closeMarketingLiveSwitch(i, { ...deps, take: async (key, expected) => { const r = await deps.take(key, expected); return r.ok ? r : { ok: true, deleted: null }; } }) : LIVE.closeMarketingLiveSwitch(i);
  /** R-S5f · …and its other half: a retry that deletes blind — whatever is there, after a look that replays the first read. */
  const retriesBlind: typeof LIVE.closeMarketingLiveSwitch = (i, deps) => {
    if (!deps) return LIVE.closeMarketingLiveSwitch(i);
    let loads = 0;
    let firstRaw: unknown = undefined;
    return LIVE.closeMarketingLiveSwitch(i, {
      ...deps,
      take: (key) => deps.take(key),
      load: async (key) => {
        loads++;
        if (loads === 1) { const r = await deps.load(key); firstRaw = r.ok ? r.value : undefined; return r; }
        if (loads === 2 && firstRaw !== undefined) return { ok: true as const, value: firstRaw };
        return deps.load(key);
      },
    });
  };
  /** R-S5g · THE FOURTH REVIEW'S M1, undone: an unreadable first read taken as a row — set beside the opening still
   *  standing, it reads "gone", and a close that never happened is recorded. */
  const unreadableFirstAsRow: typeof LIVE.closeMarketingLiveSwitch = (i, deps) => {
    if (!deps) return LIVE.closeMarketingLiveSwitch(i);
    let loads = 0;
    return LIVE.closeMarketingLiveSwitch(i, {
      ...deps,
      load: async (key) => { const r = await deps.load(key); return loads++ === 0 && !r.ok ? { ok: true as const, value: "unreadable" } : r; },
    });
  };
  /** R-S5h · m1, undone: the answer decided by the last read alone, forgetting the look that proved the row gone. */
  const forgetsTheLook: typeof LIVE.closeMarketingLiveSwitch = async (i, deps) => {
    const r = await LIVE.closeMarketingLiveSwitch(i, deps);
    return r.ok && r.was === "unknown" && r.state.state === "closed" && r.state.why === "unreadable"
      ? { ok: false, reason: "still_open_after_close", error: LIVE.LIVE_SWITCH_REFUSAL_SENTENCE.still_open_after_close }
      : r;
  };
  /** R-S5i · m3, undone: a row that READS closed counted as gone — a stale row kept through failed deletes is recorded closed. */
  const staleCountedGone: typeof LIVE.closeMarketingLiveSwitch = async (i, deps) => {
    if (!deps) return LIVE.closeMarketingLiveSwitch(i);
    let failedDelete = false;
    const r = await LIVE.closeMarketingLiveSwitch(i, {
      ...deps,
      take: async (key, expected) => { const t = await deps.take(key, expected); if (!t.ok) failedDelete = true; return t; },
    });
    if (r.ok || r.reason !== "already_closed" || !failedDelete) return r;
    await deps.audit({ category: "COMPLIANCE", action: CLOSED, actorId: i.actorId, targetType: "SystemConfig", targetId: KEY, payload: { via: i.via, was: "unknown", openSince: null } });
    return { ok: true, state: await LIVE.readMarketingLiveSwitch(deps.load, deps.now()), recorded: true, was: "unknown", reopened: false };
  };
  /** Whether the first read of a run failed — seen through a wrapped `load`. */
  const watchFirstRead = (deps: WriteDeps) => {
    let loads = 0;
    const seen = { firstFailed: false };
    return { seen, deps: { ...deps, load: async (key: string) => { const r = await deps.load(key); if (loads++ === 0 && !r.ok) seen.firstFailed = true; return r; } } };
  };
  /** R-S5k · THE FIFTH REVIEW'S F1, undone: a look that found no row disbelieved because the first read failed. */
  const noRowDisbelieved: typeof LIVE.closeMarketingLiveSwitch = async (i, deps) => {
    if (!deps) return LIVE.closeMarketingLiveSwitch(i);
    const w = watchFirstRead(deps);
    const r = await LIVE.closeMarketingLiveSwitch(i, w.deps);
    return w.seen.firstFailed && r.ok && r.was === "unknown" && r.state.state === "closed" && r.state.why === "unreadable"
      ? { ok: false, reason: "close_unconfirmed", error: LIVE.LIVE_SWITCH_REFUSAL_SENTENCE.close_unconfirmed }
      : r;
  };
  /** R-S5l · F2, undone: a retry's compare-and-delete that found nothing taken as one more lost reply. */
  const retryMissIsUnknown: typeof LIVE.closeMarketingLiveSwitch = (i, deps) =>
    deps ? LIVE.closeMarketingLiveSwitch(i, {
      ...deps,
      take: async (key, expected) => { const r = await deps.take(key, expected); return expected !== undefined && r.ok && r.deleted === null ? { ok: false } : r; },
    }) : LIVE.closeMarketingLiveSwitch(i);
  /** R-S5m · F3, undone: with no final read, "reopened" taken from nothing — an opening the look saw land is not reported. */
  const reopenedFromLastReadOnly: typeof LIVE.closeMarketingLiveSwitch = async (i, deps) => {
    const r = await LIVE.closeMarketingLiveSwitch(i, deps);
    return r.ok && r.state.state === "closed" && r.state.why === "unreadable" && r.reopened ? { ...r, reopened: false } : r;
  };
  /** R-S5n · F6, undone at the close: "an opening" judged by the reader's state — a row stamped ahead reads closed. */
  const closeJudgesByReader: typeof LIVE.closeMarketingLiveSwitch = async (i, deps) => {
    if (!deps) return LIVE.closeMarketingLiveSwitch(i);
    const r = await LIVE.closeMarketingLiveSwitch(i, deps);
    if (r.ok || (r.reason !== "still_open_after_close" && r.reason !== "reopened_meanwhile")) return r;
    const s = await LIVE.readMarketingLiveSwitch(deps.load, deps.now());
    return s.state === "closed" ? { ok: false, reason: "already_closed", error: LIVE.LIVE_SWITCH_REFUSAL_SENTENCE.already_closed } : r;
  };
  /** R-S4g · F6, undone at the rollback: "off" judged by the reader's state — "it is off now" over an opening stamped ahead. */
  const rollbackJudgesByReader: typeof LIVE.openMarketingLiveSwitch = async (i, deps) => {
    if (!deps) return LIVE.openMarketingLiveSwitch(i);
    const r = await LIVE.openMarketingLiveSwitch(i, deps);
    if (r.ok || r.reason !== "other_open") return r;
    const s = await LIVE.readMarketingLiveSwitch(deps.load, deps.now());
    return s.state === "closed" ? { ok: false, reason: "save_failed", error: LIVE.LIVE_SWITCH_REFUSAL_SENTENCE.save_failed } : r;
  };
  /** R-S5j · n1, undone: a clean "no row" answered "It was already off." with no read after it. */
  const blindAlreadyOff: typeof LIVE.closeMarketingLiveSwitch = async (i, deps) => {
    const r = await LIVE.closeMarketingLiveSwitch(i, deps);
    return !r.ok && r.reason === "close_unconfirmed" ? { ok: false, reason: "already_closed", error: LIVE.LIVE_SWITCH_REFUSAL_SENTENCE.already_closed } : r;
  };
  /** R-S4f · THE FOURTH REVIEW'S m4, undone: an opening stamped ahead of this clock judged as a stale row — its first read
   *  loses what made it an opening, and the replace is aimed at the row actually there, as the old writer's was. */
  const replacesStampedAhead: typeof LIVE.openMarketingLiveSwitch = (i, deps) => {
    if (!deps) return LIVE.openMarketingLiveSwitch(i);
    let loads = 0;
    let actual: unknown = null;
    return LIVE.openMarketingLiveSwitch(i, {
      ...deps,
      load: async (key) => {
        const r = await deps.load(key);
        if (loads++ !== 0 || !r.ok || r.value === null || typeof r.value !== "object") return r;
        actual = r.value;
        return { ok: true as const, value: { ...(r.value as Record<string, unknown>), seenAs: "stale" } };
      },
      replace: (key, expected, value) => deps.replace(key, actual ?? expected, value),
    });
  };
  /** R-S5b · the ops door's text screened field by field only — a number split across `by` and `reason` passes. */
  const perFieldOnly: typeof LIVE.openMarketingLiveSwitch = (i, deps) => {
    if (i.via !== "ops") return LIVE.openMarketingLiveSwitch(i, deps);
    const shorten = (t?: string) => (typeof t === "string" ? t.replace(/[0-9]/g, (d, k: number) => (k < 3 ? d : "")) : t);
    return LIVE.openMarketingLiveSwitch({ ...i, by: shorten(i.by), reason: shorten(i.reason) }, deps);
  };
  /** R-S5b2 · the ops door's text screened for decimal digits and control characters only (the first fix's rule). */
  const decimalOnly: typeof LIVE.screenOpsText = (raw) => {
    if (typeof raw !== "string") return null;
    const t = raw.normalize("NFKC").trim();
    if (t === "" || t.length > 120 || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(t)) return null;
    if ((t.match(/\p{Nd}/gu) ?? []).length > 6) return null;
    return t;
  };
  /** R-S8 · the window's 2-hour rule removed. */
  const noTwoHours: typeof PURE.marketingSmsSettingsProblems = (raw, floor) => {
    const r = PURE.marketingSmsSettingsProblems(raw, floor);
    if (r.ok || r.problems.windowEndMinute !== PURE.SETTINGS_SENTENCE.length) return r;
    const rest = { ...r.problems };
    delete rest.windowEndMinute;
    if (Object.keys(rest).length > 0) return { ok: false, problems: rest };
    const o = raw as Record<string, unknown>;
    return { ok: true, value: { v: 1, pricePerSegmentTzs: Number(o.pricePerSegmentTzs), codesReserveTzs: Number(o.codesReserveTzs), campaignLimitTzs: Number(o.campaignLimitTzs), windowStartMinute: Number(o.windowStartMinute), windowEndMinute: Number(o.windowEndMinute) } };
  };
  /** R-S9 · a partial post filled in from the record (a stale field survives the save). */
  const fillsPartial = (o: StoreOpts): SettingsStore => {
    const real = STORE.__marketingSmsSettingsForTest(o);
    return { ...real, save: (input, officer) => {
      const cur = real.get();
      const filled = { ...Object.fromEntries(PURE.SETTINGS_FIELDS.map((f) => [f, String(cur[f])])), ...(input as Record<string, unknown>) };
      return real.save(filled, officer);
    } };
  };
  /** R-S9b · the page's base ignored — a stale page overwrites. */
  const ignoresBase = (o: StoreOpts): SettingsStore => {
    const real = STORE.__marketingSmsSettingsForTest(o);
    return { ...real, save: async (input, officer) => {
      const fresh = await real.reload();
      const base = fresh.ok ? PURE.settingsFingerprint(fresh.settings) : "";
      return real.save({ ...(input as Record<string, unknown>), base }, officer);
    } };
  };
  /** R-S9r · U13 · R1 · new hours saved without asking the published lines — a printed "after 20:00" left unkept. */
  const ignoresPublished = (o: StoreOpts): SettingsStore =>
    STORE.__marketingSmsSettingsForTest({ ...o, published: async () => ({ ok: true as const, texts: [] }) });
  /** R-S9c · a row reader that reads what it can and notes nothing — a half-read row is saved over. */
  const notesNothing = (o: StoreOpts): SettingsStore =>
    STORE.__marketingSmsSettingsForTest({ ...o, readRow: (persisted) => ({ settings: STORE.readSettingsRow(persisted).settings, dropped: [] }) });

  /* ── S11's plants: each a view that hands money where it must not ── */
  const SETTINGS_OK = { ok: true as const, settings: { ...D }, stored: false, readable: true };
  const SETTINGS_HALF = { ok: true as const, settings: { ...D }, stored: true, readable: false };
  const MEASURED_7 = { kind: "measured" as const, tzsPerSegment: 6, sends: 7, pairs: 6, spread: { min: 6, max: 6 }, since: iso(T0 - 24 * HOUR) };
  /** R-S11 · the money line built for every viewer. */
  const cardMoneyForAll: typeof VIEW.marketingSmsCardView = (i) => VIEW.marketingSmsCardView({ ...i, moneyVisible: true });
  /** R-S11b · the form's fingerprint (which spells the money) handed to every viewer. */
  const baseForAll: typeof VIEW.marketingSmsFormView = (i) =>
    ({ ...VIEW.marketingSmsFormView(i), base: i.settings.ok ? PURE.settingsFingerprint(i.settings.settings) : null });
  /** R-S11c · the measured price handed to every viewer. */
  const measuredForAll: typeof VIEW.marketingSmsFormView = (i) => ({ ...VIEW.marketingSmsFormView(i), measuredHint: VIEW.measuredHintOf(i.measured) });
  /** R-S11d · an owner whose own money.figures cell hides money handed the form anyway (blank boxes, never savable). */
  const ownerAlwaysEdits: typeof VIEW.marketingSmsFormView = (i) => {
    const v = VIEW.marketingSmsFormView(i);
    return i.isOwner && i.settings.ok && i.settings.readable ? { ...v, editable: true, base: PURE.settingsFingerprint(i.settings.settings) } : v;
  };
  /** R-S11e · a record that could not be read in full shown with its values — defaults nobody chose. */
  const halfShowsValues: typeof VIEW.marketingSmsFormView = (i) => {
    const v = VIEW.marketingSmsFormView(i);
    if (!i.settings.ok || i.settings.readable) return v;
    const s = i.settings.settings;
    return {
      ...v, window: { startMinute: s.windowStartMinute, endMinute: s.windowEndMinute },
      money: i.moneyVisible ? { pricePerSegmentTzs: s.pricePerSegmentTzs, codesReserveTzs: s.codesReserveTzs, campaignLimitTzs: s.campaignLimitTzs } : null,
    };
  };
  /** R-S11g · what only the form prints (a save ever made, the floor) handed to a viewer who reads text. */
  const formFactsForAll: typeof VIEW.marketingSmsFormView = (i) => {
    const v = VIEW.marketingSmsFormView(i);
    return i.settings.ok ? { ...v, stored: i.settings.stored, floorTzs: i.floorTzs } : v;
  };
  /** R-S11h · who switched it on judged by the four-digit rule alone — a phone number written in groups is shown. */
  const groupedNumberShown: typeof VIEW.marketingSmsCardView = async (i) => {
    const v = await VIEW.marketingSmsCardView(i);
    if (i.live.state !== "open") return v;
    const name = ((await i.nameOf(i.live.enabledBy)) ?? "").trim();
    return name !== "" && !/\p{N}{4,}/u.test(name) ? { ...v, enabledByName: name } : v;
  };
  /** R-S11i · the money loader fails OPEN: a decider that throws is taken as a yes. */
  const moneyFailsOpen: typeof ESTIMATE.loadSmsMoneyForViewerAs = (role, o, deps = {}) => {
    const asked = deps.moneyVisible ?? (async () => false);
    return ESTIMATE.loadSmsMoneyForViewerAs(role, o, { ...deps, moneyVisible: async (r) => { try { return await asked(r); } catch { return true; } } });
  };
  /** R-S11j · the price walked for every viewer who may read money, not only for the owner's form. */
  const walksForEveryMoneyViewer: typeof ESTIMATE.loadSmsMoneyForViewerAs = async (role, o, deps = {}) => {
    const r = await ESTIMATE.loadSmsMoneyForViewerAs(role, o, deps);
    return r.visible && o.measure && !r.isOwner ? { ...r, measured: (await ESTIMATE.loadSmsMoneyForViewerAs("ADMIN", o, deps)).measured } : r;
  };
  const NB = String.fromCharCode(160);
  /** R-S11m · the limits line's "TZS" no longer bound to its amount. */
  const limitsUnbound: typeof VIEW.marketingSmsCardView = async (i) => {
    const v = await VIEW.marketingSmsCardView(i);
    return { ...v, limits: v.limits.split(NB).join(" ") };
  };
  /** R-S11n · a role that could not be read said as "not the owner". */
  const unreadAsNotOwner: typeof VIEW.marketingSmsCardView = (i) => VIEW.marketingSmsCardView({ ...i, roleUnread: false });
  /** R-S11o · the ops door's `by` shown as it was stored — a number included. */
  const opsUnscreened: typeof VIEW.marketingSmsCardView = async (i) => {
    const v = await VIEW.marketingSmsCardView(i);
    return i.live.state === "open" && i.live.enabledBy.startsWith("ops: ") ? { ...v, enabledByName: `the ops door (${i.live.enabledBy.slice(5)})` } : v;
  };
  /** R-S11p · the loader forgetting that its role read failed (the owner told "only an owner can"). */
  const unreadForgotten: typeof ESTIMATE.loadSmsMoneyForViewerAs = (role, o, deps) =>
    ESTIMATE.loadSmsMoneyForViewerAs(role === "unread" ? null : role, o, deps);
  /** R-S8b · the limit's refusal with "TZS" free to wrap away from its amount. */
  const limitSentenceUnbound: typeof PURE.marketingSmsSettingsProblems = (raw, floor) => {
    const r = PURE.marketingSmsSettingsProblems(raw, floor);
    if (r.ok || r.problems.campaignLimitTzs === undefined) return r;
    return { ...r, problems: { ...r.problems, campaignLimitTzs: r.problems.campaignLimitTzs.split(NB).join(" ") } };
  };
  /** R-S14 · a lost race said as "weren't switched on" — while another opening may stand. */
  const raceSaidNotOn: typeof WORDS = { ...WORDS, openRefusalTitle: (r) => (r === "changed_meanwhile" ? "Marketing SMS weren't switched on" : WORDS.openRefusalTitle(r)) };
  /** R-S14b · a switch-on that wrote and was taken back said as "weren't switched on". */
  const takenBackSaidNotOn: typeof WORDS = { ...WORDS, openRefusalTitle: (r) => (r === "audit_failed" ? "Marketing SMS weren't switched on" : WORDS.openRefusalTitle(r)) };
  /** R-S14c · already_open worded from the page as it was before the click — the writer's "already on" over a card that
   *  reads it malformed, and over one that no longer reads as an opening. */
  const alreadyFromThePage: typeof WORDS = { ...WORDS, openRefusalToast: (r, e) => ({ title: WORDS.openRefusalTitle(r), description: e }) };
  /** R-S14d · "It was already off." over a stale row three deletes could not remove. */
  const alreadyOffAlways: typeof WORDS = { ...WORDS, alreadyOffToast: () => ({ title: "It was already off.", variant: "success" as const }) };
  /** R-S14e · a switch-off that could not be confirmed said as off. */
  const closeSaidOff: typeof WORDS = { ...WORDS, closeRefusalTitle: (r) => (r === "close_unconfirmed" ? "Marketing SMS are off" : WORDS.closeRefusalTitle(r)) };

  const withSource = (rel: string, edit: (text: string) => string): Map<string, string> => {
    const m = new Map(SOURCES);
    m.set(rel, edit(m.get(rel) ?? ""));
    return m;
  };

  type Plant = { name: string; expect: RegExp; impl: Impl; landed: () => Promise<boolean> | boolean; landedAs: string };
  const plants: Plant[] = [
    { name: "R-S1 · the old two-key row read open", expect: /^S1 ·/, impl: { ...REAL, read: twoKeyOpen },
      landed: async () => (await twoKeyOpen(async () => ({ ok: true, value: { enabledBy: OWNER, enabledAt: iso(T0) } }), T0)).state === "open",
      landedAs: "a { enabledBy, enabledAt } row reads open" },
    { name: "R-S1b · an expired row read open", expect: /^S1 ·/, impl: { ...REAL, read: expiredOpen },
      landed: async () => (await expiredOpen(async () => ({ ok: true, value: EXPIRED }), T0)).state === "open",
      landedAs: "a row past its closesAt reads open" },
    { name: "R-S1d · 'now' taken before a slow read lands", expect: /^S1 ·/, impl: { ...REAL, read: nowBeforeLoad },
      landed: async () => {
        const n = Date.now();
        const v = { enabledBy: OWNER, enabledAt: iso(n - MIN), closesAt: iso(n + 60) };
        return (await nowBeforeLoad(async () => { await new Promise((res) => setTimeout(res, 150)); return { ok: true, value: v }; })).state === "open";
      },
      landedAs: "a row that closed during the read reads open" },
    { name: "R-S1c · the gate ignoring the closing time", expect: /^S1c ·/, impl: { ...REAL, gate: gateIgnoresClose },
      landed: () => gateIgnoresClose("blackball", { state: "open", ...EXPIRED }).ok,
      landedAs: "an open state past its close lets Blackball through" },
    { name: "R-S3 · an opening that trusts its write without a read-back", expect: /^S3 ·/, impl: { ...REAL, open: trustsSave },
      landed: async () => (await trustsSave({ actorId: OWNER, via: "card", forMs: HOUR }, switchWorld({ saveNoop: true }).deps)).ok,
      landedAs: "a write that wrote nothing is reported open" },
    { name: "R-S3b · THE FIRST REVIEW'S MAJOR: a rollback that takes an unreadable read as 'off'", expect: /^S3 ·/, impl: { ...REAL, open: unreadableIsOff },
      landed: async () => { const w = switchWorld({ failReadsAfterSave: 9, takeBackNoop: true }); const r = await unreadableIsOff({ actorId: OWNER, via: "card", forMs: HOUR }, w.deps); return !r.ok && r.reason === "not_open_after_save" && w.row() !== null; },
      landedAs: "the row is still there and the owner is told it is off" },
    { name: "R-S4 · a failed confirmation that leaves the switch open", expect: /^S4 ·/, impl: { ...REAL, open: leavesOpen },
      landed: async () => { const w = switchWorld({ throwAuditOf: [OPENED] }); await leavesOpen({ actorId: OWNER, via: "card", forMs: HOUR }, w.deps); return w.row() !== null; },
      landedAs: "after the confirmation throws, the row is back" },
    { name: "R-S4b · a rollback that deletes a second owner's opening", expect: /^S4b ·/, impl: { ...REAL, open: deletesTheirs },
      landed: async () => { const w = switchWorld({ replaceAfterAuditOf: { action: OPENED, row: THEIRS }, throwAuditOf: [OPENED] }); await deletesTheirs({ actorId: OWNER, via: "card", forMs: HOUR }, w.deps); return w.row() === null; },
      landedAs: "the other owner's row is gone" },
    { name: "R-S4e · THE THIRD REVIEW'S MAJOR-2: an unconditional write over a concurrent opening", expect: /^S4b ·/, impl: { ...REAL, open: upserts },
      landed: async () => { const w = switchWorld({ changeBeforeWrite: THEIRS }); const r = await upserts({ actorId: OWNER, via: "card", forMs: HOUR }, w.deps); return r.ok && !sameValue(w.row(), THEIRS); },
      landedAs: "the first opening's row is replaced and the second is told OK" },
    { name: "R-S4f · THE FOURTH REVIEW'S m4: an opening stamped ahead of this clock replaced as a stale row", expect: /^S4b ·/, impl: { ...REAL, open: replacesStampedAhead },
      landed: async () => { const w = switchWorld({ seed: AHEAD }); const r = await replacesStampedAhead({ actorId: OWNER, via: "card", forMs: HOUR }, w.deps); return r.ok && !sameValue(w.row(), AHEAD); },
      landedAs: "the other writer's opening is replaced and this one is told OK" },
    { name: "R-S4g · THE FIFTH REVIEW'S F6 at the rollback: 'it is off now' over an opening stamped ahead", expect: /^S4b ·/, impl: { ...REAL, open: rollbackJudgesByReader },
      landed: async () => { const w = switchWorld({ changeBeforeWrite: AHEAD, saveThrows: true }); const r = await rollbackJudgesByReader({ actorId: OWNER, via: "card", forMs: HOUR }, w.deps); return !r.ok && r.reason === "save_failed" && sameValue(w.row(), AHEAD); },
      landedAs: "the owner is told it is off while that opening stands" },
    { name: "R-S4c · THE SECOND REVIEW'S M1: the switch written with no opening record first", expect: /^S4c ·/, impl: { ...REAL, open: noIntent },
      landed: async () => { const w = switchWorld(); await noIntent({ actorId: OWNER, via: "card", forMs: HOUR }, w.deps); return w.calls.save === 1 && !recordedFirst(w); },
      landedAs: "a write with no opening row before it" },
    { name: "R-S4d · the first read blinded (an opening not seen before the write)", expect: /^S4c ·/, impl: { ...REAL, open: overOpening },
      landed: async () => { const w = switchWorld({ seed: THEIRS }); const r = await overOpening({ actorId: OWNER, via: "card", forMs: HOUR }, w.deps); return !r.ok && r.reason !== "already_open"; },
      landedAs: "an open switch is not refused already_open" },
    { name: "R-S5 · a close that reports success without a read-back", expect: /^S5 ·/, impl: { ...REAL, close: closesBlind },
      landed: async () => { const w = switchWorld({ seed: THEIRS, takeFails: 99 }); const r = await closesBlind({ actorId: OWNER, via: "card" }, w.deps); return r.ok && w.row() !== null; },
      landedAs: "a delete that never answered is reported done" },
    { name: "R-S5c · a close that leaves an expired or malformed row behind", expect: /^S5 ·/, impl: { ...REAL, close: leavesStale },
      landed: async () => { const w = switchWorld({ seed: { enabledBy: OWNER, enabledAt: iso(T0 - HOUR) } }); await leavesStale({ actorId: OWNER, via: "card" }, w.deps); return w.row() !== null; },
      landedAs: "the two-key row survives the close" },
    { name: "R-S5d · a close blind to the row its delete removed", expect: /^S5 ·/, impl: { ...REAL, close: closeBlindToDeleted },
      landed: async () => { const w = switchWorld({ seed: THEIRS, failFirstRead: true }); const r = await closeBlindToDeleted({ actorId: OWNER, via: "card" }, w.deps); return !r.ok && w.row() === null && rowsOf(w, CLOSED).length === 0; },
      landedAs: "an opening is deleted and nothing records it" },
    { name: "R-S5e · THE THIRD REVIEW'S MAJOR-1: a lost-reply delete treated as nothing removed", expect: /^S5 ·/, impl: { ...REAL, close: lostReplyIsNothing },
      landed: async () => { const w = switchWorld({ seed: THEIRS, takeLandsThenFails: true }); const r = await lostReplyIsNothing({ actorId: OWNER, via: "card" }, w.deps); return !r.ok && r.reason === "already_closed" && rowsOf(w, CLOSED).length === 0; },
      landedAs: "the owner is told 'It was already off' and nothing is recorded" },
    { name: "R-S5f · a retry that deletes blind onto an opening that landed after", expect: /^S5 ·/, impl: { ...REAL, close: retriesBlind },
      landed: async () => { const w = switchWorld({ seed: THEIRS, takeLandsThenFails: true, insertAfterTake: THIRD }); await retriesBlind({ actorId: OWNER, via: "card" }, w.deps); return w.row() === null; },
      landedAs: "the later opening is deleted" },
    { name: "R-S5g · THE FOURTH REVIEW'S M1: an unreadable first read taken as a row, so a standing opening reads 'gone'", expect: /^S5c ·/, impl: { ...REAL, close: unreadableFirstAsRow },
      landed: async () => { const w = switchWorld({ seed: THEIRS, failReadsAt: [1], takeFails: 1 }); const r = await unreadableFirstAsRow({ actorId: OWNER, via: "card" }, w.deps); return r.ok && rowsOf(w, CLOSED).length === 1 && sameValue(w.row(), THEIRS); },
      landedAs: "a close is recorded while the opening still stands" },
    { name: "R-S5h · m1: the answer decided by the last read alone, forgetting the look that proved the row gone", expect: /^S5c ·/, impl: { ...REAL, close: forgetsTheLook },
      landed: async () => { const w = switchWorld({ seed: THEIRS, takeLandsThenFails: true, failReadsAt: [3, 4, 5] }); const r = await forgetsTheLook({ actorId: OWNER, via: "card" }, w.deps); return !r.ok && w.row() === null; },
      landedAs: "the owner is told it didn't read back as off although the look proved it gone" },
    { name: "R-S5i · m3: a row that reads closed counted as gone, so a stale row kept through failed deletes is recorded closed", expect: /^S5c ·/, impl: { ...REAL, close: staleCountedGone },
      landed: async () => { const w = switchWorld({ seed: EXPIRED, takeFails: 3 }); const r = await staleCountedGone({ actorId: OWNER, via: "card" }, w.deps); return r.ok && rowsOf(w, CLOSED).length === 1 && sameValue(w.row(), EXPIRED); },
      landedAs: "a close is recorded while the stale row is still there" },
    { name: "R-S5j · n1: a clean 'no row' answered 'It was already off.' with no read after it", expect: /^S5c ·/, impl: { ...REAL, close: blindAlreadyOff },
      landed: async () => { const w = switchWorld({ seed: THEIRS, takeFindsNothingThenRow: THIRD, failReadsAt: [2, 3, 4] }); const r = await blindAlreadyOff({ actorId: OWNER, via: "card" }, w.deps); return !r.ok && r.reason === "already_closed" && w.row() !== null; },
      landedAs: "'It was already off.' while a later opening stands" },
    { name: "R-S5k · THE FIFTH REVIEW'S F1: a look that found no row disbelieved because the first read failed", expect: /^S5d ·/, impl: { ...REAL, close: noRowDisbelieved },
      landed: async () => { const w = switchWorld({ seed: THEIRS, failReadsAt: [1, 3, 4, 5], takeLandsThenFails: true }); const r = await noRowDisbelieved({ actorId: OWNER, via: "card" }, w.deps); return !r.ok && w.row() === null; },
      landedAs: "the opening this close removed goes unrecorded as a close" },
    { name: "R-S5l · F2: a retry's clean miss taken as one more lost reply", expect: /^S5d ·/, impl: { ...REAL, close: retryMissIsUnknown },
      landed: async () => { const w = switchWorld({ seed: THEIRS, takeCommitsLate: true, failReadsAt: [3, 4, 5, 6] }); const r = await retryMissIsUnknown({ actorId: OWNER, via: "card" }, w.deps); return !r.ok && r.reason === "close_unconfirmed" && w.row() === null; },
      landedAs: "the close that removed it answers close_unconfirmed and records nothing" },
    { name: "R-S5m · F3: with no final read, an opening the look saw land not reported", expect: /^S5d ·/, impl: { ...REAL, close: reopenedFromLastReadOnly },
      landed: async () => { const w = switchWorld({ seed: THEIRS, takeLandsThenFails: true, insertAfterTake: THIRD, failReadsAt: [3, 4, 5] }); const r = await reopenedFromLastReadOnly({ actorId: OWNER, via: "card" }, w.deps); return r.ok && !r.reopened && sameValue(w.row(), THIRD); },
      landedAs: "'switched off' while somebody's opening stands" },
    { name: "R-S5n · F6 at the close: an opening stamped ahead judged by the reader's closed state", expect: /^S5d ·/, impl: { ...REAL, close: closeJudgesByReader },
      landed: async () => { const w = switchWorld({ seed: AHEAD, takeFails: 3 }); const r = await closeJudgesByReader({ actorId: OWNER, via: "card" }, w.deps); return !r.ok && r.reason === "already_closed" && sameValue(w.row(), AHEAD); },
      landedAs: "'It was already off.' while the opening stands" },
    { name: "R-S5b · a number split across the ops door's two fields", expect: /^S5b ·/, impl: { ...REAL, open: perFieldOnly },
      landed: async () => (await perFieldOnly({ actorId: null, via: "ops", forMs: HOUR, by: "Claude for Ali 255712", reason: "345678 drive" }, switchWorld().deps)).ok,
      landedAs: "the split number is let through" },
    { name: "R-S5b2 · the ops door's text screened for decimal digits and control characters only", expect: /^S5b ·/, impl: { ...REAL, screen: decimalOnly },
      landed: () => decimalOnly("❸❶❷❸❹❺❻❼❽") !== null && decimalOnly("Claude\u034Ffor Ali") !== null, landedAs: "circled numerals and a grapheme joiner pass" },
    { name: "R-S7 · a second writer of the key in another src file", expect: /^S7 ·/,
      impl: { ...REAL, sources: withSource("src/lib/server/marketing/estimate.ts", (t) => `${t}\nexport const sneak = () => saveConfigOrThrow(LIVE_KEY_ALIAS ?? "marketing" + ".sms.live", {});\n`) },
      landed: () => true, landedAs: "estimate.ts writes the key through a spelled-out string" },
    { name: "R-S7b · a caller of the writers outside the two doors", expect: /^S7 ·/,
      impl: { ...REAL, sources: withSource("src/app/admin/campaigns/new/actions.ts", (t) => `${t}\nexport async function sneak() { return openMarketingLiveSwitch({ actorId: "x", via: "card", forMs: 1 }); }\n`) },
      landed: () => true, landedAs: "the composer's actions open the switch" },
    { name: "R-S7c · a second caller of the settings setter", expect: /^S7 ·/,
      impl: { ...REAL, sources: withSource("scripts/live/sneak.mjs", () => `export const x = () => saveMarketingSmsSettings({}, "x");\n`) },
      landed: () => true, landedAs: "a script saves the settings" },
    { name: "R-S7d · the switch's key named in another scripts/live drive (the exemption is by exact path, not by folder)", expect: /^S7 ·/,
      impl: { ...REAL, sources: withSource("scripts/live/sneak-drive.mjs", () => 'const KEY = "marketing.sms.live";\n') },
      landed: () => true, landedAs: "another drive names marketing.sms.live" },
    { name: "R-S7f · U52a's core no longer opens its reads READ ONLY (a tool that names the keys could write them)", expect: /^S7 ·/,
      impl: { ...REAL, sources: withSource(U52A_CORE, (t) => t.split(U52A_READ_ONLY).join("$executeRaw" + String.fromCharCode(96) + "SET TRANSACTION READ WRITE" + String.fromCharCode(96))) },
      landed: () => (SOURCES.get(U52A_CORE) ?? "").includes(U52A_READ_ONLY), landedAs: "U52a's tools read in a writable transaction" },
    { name: "R-S7e · the U49s-2 drive's loopback refusal removed", expect: /^S7 ·/,
      impl: { ...REAL, sources: withSource(DRIVE_SRC, (t) => t.replace(DRIVE_GUARD, "if (false) {")) },
      landed: () => (SOURCES.get(DRIVE_SRC) ?? "").includes(DRIVE_GUARD), landedAs: "the drive would write into any database" },
    { name: "R-S6 · the settings action guarded by a staff grant, not requireOwner", expect: /^S6 ·/,
      impl: { ...REAL, sources: withSource(ACTIONS_SRC, (t) => t.replace('await requireOwner("marketingSmsSettings")', 'await requireStaff("ops")')) },
      landed: () => (SOURCES.get(ACTIONS_SRC) ?? "").includes('await requireOwner("marketingSmsSettings")'), landedAs: "a staff grant can save the settings" },
    { name: "R-S6b · the switch-on action reads who switched it on from the form", expect: /^S6 ·/,
      impl: { ...REAL, sources: withSource(ACTIONS_SRC, (t) => t.replace('openMarketingLiveSwitch({ actorId: session.userId, via: "card"', 'openMarketingLiveSwitch({ actorId: String(formData.get("enabledBy") ?? session.userId), via: "card"')) },
      landed: () => (SOURCES.get(ACTIONS_SRC) ?? "").includes('openMarketingLiveSwitch({ actorId: session.userId, via: "card"'), landedAs: "a posted enabledBy names the opener" },
    { name: "R-S6c · the switch-off action takes and reads a form", expect: /^S6 ·/,
      impl: { ...REAL, sources: withSource(ACTIONS_SRC, (t) => t
        .replace("closeMarketingLiveSwitchAction(): Promise", "closeMarketingLiveSwitchAction(formData?: FormData): Promise")
        .replace('closeMarketingLiveSwitch({ actorId: session.userId, via: "card" })', 'closeMarketingLiveSwitch({ actorId: session.userId, via: "card", by: String(formData?.get("by") ?? "") })')) },
      landed: () => (SOURCES.get(ACTIONS_SRC) ?? "").includes("closeMarketingLiveSwitchAction(): Promise"), landedAs: "a posted field reaches the stop" },
    { name: "R-S6d · an await hoisted above requireOwner in the switch-on action", expect: /^S6 ·/,
      impl: { ...REAL, sources: withSource(ACTIONS_SRC, (t) => t.replace(
        'const session = await requireOwner("marketingLiveSwitch");\n  const minutes = minutesOf(formData);',
        'await Promise.resolve();\n  const session = await requireOwner("marketingLiveSwitch");\n  const minutes = minutesOf(formData);')) },
      landed: () => (SOURCES.get(ACTIONS_SRC) ?? "").includes('const session = await requireOwner("marketingLiveSwitch");\n  const minutes = minutesOf(formData);'),
      landedAs: "something runs before the owner is checked" },
    { name: "R-S6e · the switch-on action reads the whole form", expect: /^S6 ·/,
      impl: { ...REAL, sources: withSource(ACTIONS_SRC, (t) => t.replace("const minutes = minutesOf(formData);", "const minutes = minutesOf(formData);\n  const posted = Object.fromEntries(formData);")) },
      landed: () => (SOURCES.get(ACTIONS_SRC) ?? "").includes("const minutes = minutesOf(formData);"), landedAs: "every posted field is read" },
    { name: "R-S11 · the money line rendered for every viewer", expect: /^S11 ·/, impl: { ...REAL, cardView: cardMoneyForAll },
      landed: async () => (await cardMoneyForAll({ live: { state: "closed", why: "absent" }, settings: SETTINGS_OK, moneyVisible: false, isOwner: false, now: T0, nameOf: async () => null })).limits.includes("TZS"),
      landedAs: "a viewer without money is shown TZS" },
    { name: "R-S11b · the form's fingerprint handed to every viewer", expect: /^S11 ·/, impl: { ...REAL, formView: baseForAll },
      landed: () => (baseForAll({ settings: SETTINGS_OK, moneyVisible: false, isOwner: false, floorTzs: 50, measured: null }).base ?? "").includes("20000"),
      landedAs: "the fingerprint spells the reserve to a viewer without money" },
    { name: "R-S11c · the measured price handed to every viewer", expect: /^S11 ·/, impl: { ...REAL, formView: measuredForAll },
      landed: () => (measuredForAll({ settings: SETTINGS_OK, moneyVisible: false, isOwner: false, floorTzs: 50, measured: MEASURED_7 }).measuredHint ?? "").includes("TZS 6"),
      landedAs: "a viewer without money reads the measured price" },
    { name: "R-S11d · an owner whose money.figures cell hides money handed the form anyway", expect: /^S11 ·/, impl: { ...REAL, formView: ownerAlwaysEdits },
      landed: () => ownerAlwaysEdits({ settings: SETTINGS_OK, moneyVisible: false, isOwner: true, floorTzs: 50, measured: null }).editable,
      landedAs: "a form with blank money boxes that can never save" },
    { name: "R-S11e · a record that could not be read in full shown with its values", expect: /^S11 ·/, impl: { ...REAL, formView: halfShowsValues },
      landed: () => halfShowsValues({ settings: SETTINGS_HALF, moneyVisible: true, isOwner: true, floorTzs: 50, measured: null }).money !== null,
      landedAs: "defaults nobody chose shown as the owner's values" },
    { name: "R-S11f · the page asks the money decider itself", expect: /^S11 ·/,
      impl: { ...REAL, sources: withSource(PAGE_SRC, (t) => t.replace('loadSmsMoneyForViewer({ measure: tab === "marketing-sms" })', '(async () => ({ visible: await campaignMoneyVisible("ADMIN"), measured: null }))()')) },
      landed: () => (SOURCES.get(PAGE_SRC) ?? "").includes('loadSmsMoneyForViewer({ measure: tab === "marketing-sms" })'), landedAs: "the page decides money on its own" },
    { name: "R-S11g · what only the form prints handed to a viewer who reads text", expect: /^S11 ·/, impl: { ...REAL, formView: formFactsForAll },
      landed: () => formFactsForAll({ settings: SETTINGS_OK, moneyVisible: true, isOwner: false, floorTzs: 50, measured: null }).stored !== null,
      landedAs: "a text viewer is told whether the documented defaults are in force" },
    { name: "R-S11h · a phone number written in groups shown as who switched it on", expect: /^S11 ·/, impl: { ...REAL, cardView: groupedNumberShown },
      landed: async () => (await groupedNumberShown({
        live: { state: "open", enabledBy: "usr_owner", enabledAt: iso(T0 - HOUR), closesAt: iso(T0 + HOUR) }, settings: SETTINGS_OK,
        moneyVisible: true, isOwner: true, now: T0, nameOf: async () => "+255 712 345 678",
      })).enabledByName === "+255 712 345 678",
      landedAs: "every viewer of the card reads an owner's phone number" },
    { name: "R-S11i · the money loader fails open on a decider that throws", expect: /^S11 ·/, impl: { ...REAL, moneyFor: moneyFailsOpen },
      landed: async () => (await moneyFailsOpen("GROWTH", { measure: false }, { moneyVisible: async () => { throw new Error("down"); } })).visible,
      landedAs: "a decider that is down shows money to anyone" },
    { name: "R-S11j · the price walked for every viewer who may read money", expect: /^S11 ·/, impl: { ...REAL, moneyFor: walksForEveryMoneyViewer },
      landed: async () => (await walksForEveryMoneyViewer("COMPLIANCE", { measure: true }, {
        moneyVisible: async () => true, recentSends: async () => [], provider: () => "console", now: () => T0,
      })).measured !== null,
      landedAs: "a money viewer's render walks the send history for a figure it never shows" },
    { name: "R-S11k · the owner read by the page apart from the loader's answer", expect: /^S11 ·/,
      impl: { ...REAL, sources: withSource(PAGE_SRC, (t) => t.split("isOwner: smsMoney.isOwner,").join("isOwner: pageReadsOwner,")) },
      landed: () => (SOURCES.get(PAGE_SRC) ?? "").split("isOwner: smsMoney.isOwner,").length === 3, landedAs: "two role reads that can disagree" },
    { name: "R-S11l · a file in src/app calls the loader's role-taking twin", expect: /^S11 ·/,
      impl: { ...REAL, sources: withSource(ACTIONS_SRC, (t) => `${t}\nexport const ownersMoney = () => loadSmsMoneyForViewerAs("ADMIN", { measure: true });\n`) },
      landed: () => (SOURCES.get(ACTIONS_SRC) ?? "") !== "", landedAs: "a role handed in by a page" },
    { name: "R-S11m · the limits line's TZS free to wrap away from its amount", expect: /^S11 ·/, impl: { ...REAL, cardView: limitsUnbound },
      landed: async () => (await limitsUnbound({ live: { state: "closed", why: "absent" }, settings: SETTINGS_OK, moneyVisible: true, isOwner: true, now: T0, nameOf: async () => null })).limits.startsWith("TZS 6 per SMS"),
      landedAs: "a phone wraps 'TZS' away from 6" },
    { name: "R-S11n · a role that could not be read said as not the owner", expect: /^S11 ·/, impl: { ...REAL, cardView: unreadAsNotOwner },
      landed: async () => !(await unreadAsNotOwner({ live: { state: "closed", why: "absent" }, settings: SETTINGS_OK, moneyVisible: false, isOwner: false, roleUnread: true, now: T0, nameOf: async () => null })).roleUnread,
      landedAs: "the owner told only an owner can, on a blip" },
    { name: "R-S11o · the ops door's by shown unscreened", expect: /^S11 ·/, impl: { ...REAL, cardView: opsUnscreened },
      landed: async () => (await opsUnscreened({
        live: { state: "open", enabledBy: "ops: 0712 345 678", enabledAt: iso(T0 - HOUR), closesAt: iso(T0 + HOUR) }, settings: SETTINGS_OK,
        moneyVisible: true, isOwner: true, now: T0, nameOf: async () => null,
      })).enabledByName === "the ops door (0712 345 678)",
      landedAs: "a number named as who switched it on" },
    { name: "R-S11p · the loader forgetting its role read failed", expect: /^S11 ·/, impl: { ...REAL, moneyFor: unreadForgotten },
      landed: async () => !(await unreadForgotten("unread", { measure: false }, {})).roleUnread, landedAs: "a blip said as not the owner" },
    { name: "R-S8b · the limit's refusal with TZS free to wrap", expect: /^S8 ·/, impl: { ...REAL, problems: limitSentenceUnbound },
      landed: () => { const r = limitSentenceUnbound({ pricePerSegmentTzs: 6, codesReserveTzs: 20_000, campaignLimitTzs: 99, windowStartMinute: 480, windowEndMinute: 1200 }, 50); return !r.ok && (r.problems.campaignLimitTzs ?? "").includes("TZS 100"); },
      landedAs: "the limit's refusal wraps 'TZS' away from 100" },
    { name: "R-S14 · a lost race said as weren't switched on", expect: /^S14 ·/, impl: { ...REAL, words: raceSaidNotOn },
      landed: () => raceSaidNotOn.openRefusalTitle("changed_meanwhile") === "Marketing SMS weren't switched on", landedAs: "'not on' while another opening may stand" },
    { name: "R-S14b · a switch-on taken back said as weren't switched on", expect: /^S14 ·/, impl: { ...REAL, words: takenBackSaidNotOn },
      landed: () => takenBackSaidNotOn.openRefusalTitle("audit_failed") === "Marketing SMS weren't switched on", landedAs: "'never on' for a switch that read on" },
    { name: "R-S14c · already_open worded from the page, not the read after it", expect: /^S14 ·/, impl: { ...REAL, words: alreadyFromThePage },
      landed: () => /already on/i.test(alreadyFromThePage.openRefusalToast("already_open", LIVE.LIVE_SWITCH_REFUSAL_SENTENCE.already_open, "malformed").description),
      landedAs: "'already on' over a card that says Off" },
    { name: "R-S14d · It was already off. over a stale row", expect: /^S14 ·/, impl: { ...REAL, words: alreadyOffAlways },
      landed: () => alreadyOffAlways.alreadyOffToast("stale").title === "It was already off.", landedAs: "a stored switch the owner meant to clear said gone" },
    { name: "R-S14e · a switch-off that could not be confirmed said as off", expect: /^S14 ·/, impl: { ...REAL, words: closeSaidOff },
      landed: () => closeSaidOff.closeRefusalTitle("close_unconfirmed") === "Marketing SMS are off", landedAs: "'off' unread" },
    { name: "R-S8 · the window's 2-hour rule removed", expect: /^S8 ·/, impl: { ...REAL, problems: noTwoHours },
      landed: () => noTwoHours({ pricePerSegmentTzs: 6, codesReserveTzs: 20_000, campaignLimitTzs: 10_000, windowStartMinute: 480, windowEndMinute: 585 }, 50).ok,
      landedAs: "a 1 h 45 window is accepted" },
    { name: "R-S9 · a partial post filled in from the record", expect: /^S9 ·/, impl: { ...REAL, store: fillsPartial },
      landed: async () => { const w = settingsWorld(); const s = fillsPartial({ floorTzs: () => 50, factoryDeps: w.deps }); await s.reload(); return (await s.save({ pricePerSegmentTzs: "7", base: BASE0 }, OWNER)).ok; },
      landedAs: "a post naming only the price is saved" },
    { name: "R-S9b · the page's base ignored", expect: /^S9 ·/, impl: { ...REAL, store: ignoresBase },
      landed: async () => { const w = settingsWorld(); const s = ignoresBase({ floorTzs: () => 50, factoryDeps: w.deps }); await s.reload(); await s.save(post(), OWNER); return (await s.save(post({ campaignLimitTzs: "13000" }), OWNER)).ok; },
      landedAs: "a save from the old base overwrites" },
    { name: "R-S9c · a half-read row saved over", expect: /^S9 ·/, impl: { ...REAL, store: notesNothing },
      landed: async () => { const w = settingsWorld({ v: 1, pricePerSegmentTzs: "x", codesReserveTzs: 25_000, campaignLimitTzs: 12_000, windowStartMinute: 510, windowEndMinute: 1140 }); const s = notesNothing({ floorTzs: () => 50, factoryDeps: w.deps }); const r = await s.reload(); return (await s.save(post({}, PURE.settingsFingerprint(r.ok ? r.settings : D)), OWNER)).ok; },
      landedAs: "a row with an unreadable price is saved over" },
    { name: "R-S9r · U13 · R1 · new hours saved without asking the published lines", expect: /^S9r ·/, impl: { ...REAL, store: ignoresPublished },
      landed: async () => { const w = settingsWorld(); const s = ignoresPublished({ floorTzs: () => 50, factoryDeps: w.deps, published: async () => ({ ok: true as const, texts: ["No offers after 20:00 EAT."] }) }); return (await s.save(post({ windowStartMinute: "480", windowEndMinute: "1260" }), OWNER)).ok; },
      landedAs: "08:00–21:00 is saved under a line promising nothing after 20:00" },
    { name: "R-S10 · the environment read restored", expect: /^S10 ·/,
      impl: { ...REAL, sources: withSource(ESTIMATE_SRC, (t) => t.split(CR).join("").replace(ESTIMATE_PRICE, "    return Number(process.env.SMS_PRICE_PER_SEGMENT_TZS) || null;")) },
      landed: () => (SOURCES.get(ESTIMATE_SRC) ?? "").split(CR).join("").includes(ESTIMATE_PRICE),
      landedAs: "estimate.ts reads the variable again" },
    { name: "R-S10b · the estimate priced from the per-container cache", expect: /^S10 ·/,
      impl: { ...REAL, sources: withSource(ESTIMATE_SRC, (t) => t.split(CR).join("").replace(ESTIMATE_PRICE, "    return marketingSmsSettings().pricePerSegmentTzs;")) },
      landed: () => (SOURCES.get(ESTIMATE_SRC) ?? "").split(CR).join("").includes(ESTIMATE_PRICE),
      landedAs: "estimate.ts reads the cached settings" },
    { name: "R-S12 · the ops door writing SystemConfig itself", expect: /^S12 ·/,
      impl: { ...REAL, sources: withSource(OPS_SRC, (t) => `import { saveConfigOrThrow } from "../../src/lib/server/config-store.ts";\n${t}`) },
      landed: () => (SOURCES.get(OPS_SRC) ?? "").length > 500, landedAs: "the ops door imports the config store" },
    { name: "R-S12b · the ops door without the production-environment check", expect: /^S12 ·/,
      impl: { ...REAL, sources: withSource(OPS_SRC, (t) => t.replace('process.env.RAILWAY_ENVIRONMENT_NAME === "production" && process.env.RAILWAY_SERVICE_NAME === "50pick"', "true")) },
      landed: () => (SOURCES.get(OPS_SRC) ?? "").includes('process.env.RAILWAY_ENVIRONMENT_NAME === "production"'), landedAs: "the environment is no longer checked" },
    { name: "R-S12c · THE FOURTH REVIEW'S m4: the ops door opening without checking this PC's clock", expect: /^S12 ·/,
      impl: { ...REAL, sources: withSource(OPS_SRC, (t) => t.replace("if (clockProblem !== null) {", "if (false) {")) },
      landed: () => (SOURCES.get(OPS_SRC) ?? "").includes("if (clockProblem !== null) {"), landedAs: "an open is no longer refused on the clock" },
    { name: "R-S12e · the clock offset's sign flipped (a PC behind reported ahead)", expect: /^S12 ·/,
      impl: { ...REAL, clockProblem: (db, a, b) => LIVE.opsClockProblem(db === null ? null : (a + b) - db, a, b) },
      landed: () => (LIVE.opsClockProblem(T0 - 21_000, T0, T0) ?? "").includes("ahead of"), landedAs: "behind and ahead swap" },
    { name: "R-S12f · THE FIFTH REVIEW'S F5: a close refused on the clock (a stop that waits)", expect: /^S12 ·/,
      impl: { ...REAL, sources: withSource(OPS_SRC, (t) => t.replace("if (clockProblem !== null) console.log(`WARNING:", "if (clockProblem !== null) { console.log(\"REFUSING\"); return 2; } console.log(`WARNING:")) },
      landed: () => (SOURCES.get(OPS_SRC) ?? "").includes("if (clockProblem !== null) console.log(`WARNING:"), landedAs: "a close refuses on the clock" },
    { name: "R-S12d · the ops door left on Railway's private database host (unreachable from a PC)", expect: /^S12 ·/,
      impl: { ...REAL, sources: withSource(OPS_SRC, (t) => t.replace('"@turntable.proxy.rlwy.net:40357"', '"@postgres.railway.internal"').replace(".replace(/@postgres", ".replace(/@nowhere")) },
      landed: () => (SOURCES.get(OPS_SRC) ?? "").includes('"@turntable.proxy.rlwy.net:40357"'), landedAs: "the private host is no longer rewritten" },
  ];

  console.log("RED CONTROL — each defect planted in memory must fire its own claim\n");
  let held = 0;
  const missed: string[] = [];
  for (const plant of plants) {
    const landed = await plant.landed();
    pass = 0; fail = 0; failed.length = 0;
    const log = console.log;
    console.log = () => {};
    try { await runAssertions(plant.impl, ""); } finally { console.log = log; }
    const fired = failed.some((l) => plant.expect.test(l));
    if (landed && fired) { held++; console.log(`  held  ${plant.name}`); }
    else {
      missed.push(plant.name);
      console.log(`  FAIL  ${plant.name} — ${landed ? `${plant.expect} did not fire (failed: ${failed.join(" | ") || "nothing"})` : `the plant did not land (${plant.landedAs})`}`);
    }
  }
  console.log(`\nRED CONTROL — ${held} of ${plants.length} proofs held${missed.length ? `; ${missed.length} FAILED` : ""}`);
  process.exitCode = missed.length === 0 ? 0 : 1;
}
