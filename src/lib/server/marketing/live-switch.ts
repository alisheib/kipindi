/**
 * U37b · U49s · THE ONE LIVE-SEND SWITCH (DECISIONS X14 · E13) — the SystemConfig row `marketing.sms.live` =
 * `{ enabledBy, enabledAt, closesAt }`, the one rule every marketing-purpose send asks before anything is minted, written
 * or handed to a carrier, and its two audited writers (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.3 U49s; OD62).
 *
 * ⛔ ABSENT MEANS CLOSED. So does a read that failed, a row that is not exactly the three keys, and a row whose closing
 * time has passed: an unreadable switch is a closed switch, never a guess.
 *
 * ⭐ E13 · THE SWITCH CARRIES ITS OWN CLOSING TIME. An owner who opens it for a test and forgets would otherwise leave every
 * confirmed campaign startable and every officer able to test for ever. Opening takes a duration — 30 minutes to 24
 * hours, 2 hours by default — and the reader reads the row CLOSED (`expired`) from `closesAt` on. Nothing has to run for
 * it to close: the next read after that instant is closed, and the gate checks the instant itself as well.
 *
 * ⭐ TWO WRITERS, TWO DOORS. `openMarketingLiveSwitch` / `closeMarketingLiveSwitch` are called only by the audited ops door
 * (`scripts/ops/marketing-live-switch.mts`, run through `railway run` on Ali's G1 delegation — Claude never signs in as
 * Ali or Jay) and, from U49s-2, the owner's card on Admin → System (`src/app/admin/system/actions.ts`, `requireOwner`
 * first). `test:marketing-settings` S7 pins that population, and the key's only writer is this file.
 *   · OPEN reads first — never over an opening, never over a switch it cannot read — then ⛔ RECORDS FIRST: the
 *     COMPLIANCE row `marketing.live_switch_opening` (who, until when, through which door) is written and confirmed BEFORE
 *     the row exists, so there is no instant at which the switch can read open — on any container — without a record
 *     naming it (the second review's M1). ⛔ THE WRITE IS CONDITIONAL (the third review's MAJOR-2): it CREATES the row only
 *     where none exists, or replaces only the exact stale row it read — so of two openings in the same instant exactly
 *     one stands, and the other is told so; an upsert would let the second silently replace the first after the first
 *     was told "on until 09:30". ⛔ A row that reads malformed ONLY because its `enabledAt` is ahead of this clock is
 *     another writer's opening stamped by a clock ahead of this one, never a stale row to replace: `already_open` (the
 *     fourth review's m4). ONE rule, `openingSince`, answers "is this an opening?" wherever a writer asks it — the first
 *     read, the read-back, the rollback and every decision of the close (the fifth review's F4 and F6) — and the ops door
 *     refuses to OPEN from a PC whose clock is over 20 s off the database's.
 *     Then it READS BACK through the strict rule and confirms (`marketing.live_switch_opened`).
 *     ⛔ "OFF" IS NEVER SAID WITHOUT PROOF (the first review's MAJOR): a write that threw (it may have committed), a
 *     read-back that failed or showed nothing, a confirmation not recorded — each goes through ONE rollback,
 *     `takeBackOpening`, which deletes only the row THIS call wrote (a compare-and-delete), re-reads, and answers "off"
 *     only on a read that PROVES it; a read it cannot trust is "unconfirmed", and the owner is told to switch it off now.
 *     A read-back that shows SOMEBODY ELSE's opening skips the rollback entirely (theirs is never touched). Every ending
 *     is recorded (`marketing.live_switch_open_failed`, with what was found).
 *   · CLOSE removes the row with `DELETE … RETURNING` and records EXACTLY the row it removed — an opening, or a row that
 *     already read closed (expired, or a shape this version does not read), so no stale row outlives the code that knows
 *     it is stale. ⛔ A DELETE WHOSE REPLY IS LOST IS NOT "NOTHING HAPPENED" (the third review's MAJOR-1): it may have
 *     committed. Before trying again the close LOOKS, and tries again only on a READABLE look that shows the very row it
 *     first read — deleting then only that row (a compare-and-delete), so it never deletes an opening that landed after a
 *     delete that may have worked. ⛔ "GONE" IS DECIDED BY COMPARING THE STORED VALUES, and only against a first read that
 *     succeeded (the fourth review's M1: an unreadable first read set beside a still-standing opening once recorded a close
 *     that never happened). Once a readable read proves the row first read is gone — a look or a final read that shows no
 *     row or (against a first read that succeeded) another, or a retry's compare-and-delete that finds nothing (the fifth
 *     review's F1 and F2) — the close is RECORDED (`was: "unknown"` — this close may be what removed it), never "It was
 *     already off"; when no read can be had after it, whether somebody's opening stands comes from the look that proved
 *     it (F3); and with no proof at all it is `close_unconfirmed`, never a guess. Only a switch that had nothing to remove writes nothing. A close is never refused
 *     for a missing record — a stop that waits for its paperwork is not a stop.
 *
 * ⚠️ KNOWN LIMIT (the fourth review's n2): a row holding jsonb `null` — writable only by hand in SQL — reads absent, so
 * every opening answers `changed_meanwhile` and every close `already_closed` until somebody deletes that row by hand.
 *
 * ⭐ WHAT PASSES WHILE IT IS CLOSED: only the console stub (`SMS_PROVIDER=console` on a dev box) — it reaches no handset
 * and costs no money, so a local drive can photograph a test that was handed over. A real carrier passes only while the
 * row reads open. In production the console stub is a dead rail (`smsRailProblem` → "console-in-production"), which the
 * test send refuses before it ever asks this gate.
 *
 * ⚠️ OWED DOWNSTREAM: U42's enqueue and U43's slice ask this same gate before their own `dispatchSlice` — one switch, not
 * one per caller — and RE-READ it for every slice (a state read earlier says nothing about now; the gate refuses one
 * past its `closesAt` regardless).
 *
 * Guards: `npm run test:marketing-settings` S1–S7 (the reader, both writers, the doors) · `npm run test:campaign-compose`
 * §18.6 (the test send reads THIS reader, and an expired switch refuses it) · on Postgres, `npm run
 * db:probe-marketing-settings`.
 */
import {
  createConfigIfAbsent, deleteConfigIfValue, loadConfigResult, replaceConfigIfValue, takeConfig,
} from "@/lib/server/config-store";
import { hasDatabase, prisma } from "@/lib/server/prisma";
import { audit } from "@/lib/server/audit";
import type { SmsProviderResolution } from "@/lib/server/sms";
import { LIVE_SWITCH_MAX_OPEN_MS, LIVE_SWITCH_MIN_OPEN_MS } from "@/lib/marketing/sms-settings";

/** E13 · how long one opening may last (30 min – 24 h, 2 h unless chosen). The durations live in the PURE module so the
 *  owner's card offers exactly what this writer accepts; they are re-exported here for the ops door and the suite. */
export {
  LIVE_SWITCH_DEFAULT_OPEN_MS, LIVE_SWITCH_DURATIONS_MS, LIVE_SWITCH_MAX_OPEN_MS, LIVE_SWITCH_MIN_OPEN_MS,
} from "@/lib/marketing/sms-settings";

/** The SystemConfig key. ⛔ Never a phone number or an id in it — a key is not data anybody can erase. */
export const MARKETING_LIVE_SWITCH_KEY = "marketing.sms.live";

/** ⛔ How far ahead of this server's clock a recorded `enabledAt` may sit (another container's clock) before the row is
 *  read as malformed: a row "enabled" in the future is not a decision anybody has taken yet. */
const CLOCK_SKEW_MS = 60_000;

export type MarketingLiveSwitch =
  | { state: "open"; enabledBy: string; enabledAt: string; closesAt: string }
  | { state: "closed"; why: "absent" | "unreadable" | "malformed" | "expired"; closedAt?: string };

/** What the reader is handed: `loadConfigResult`'s answer — whether the store answered, and what it held. */
export type MarketingLiveSwitchLoad = (key: string) => Promise<{ ok: true; value: unknown } | { ok: false; error: string }>;

/** An instant as `toISOString()` writes it (milliseconds optional): anything looser is not a recorded decision. */
const RECORDED_INSTANT = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]{1,3})?Z$/;

/** An instant's milliseconds — or null when it is not EXACTLY a recorded instant: the shape, and a calendar date that
 *  round-trips (`Date.parse` quietly turns 30 February into 2 March; a recorded decision never says 30 February). */
function instantMs(s: string): number | null {
  if (!RECORDED_INSTANT.test(s)) return null;
  const ms = Date.parse(s);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 19) === s.slice(0, 19) ? ms : null;
}

/** The three keys, sorted — a row with any other key set is not one this version reads open. */
const SWITCH_KEYS = "closesAt,enabledAt,enabledBy";

/**
 * Read the switch. ⛔ Fails CLOSED on every path that is not a well-formed, recorded, unexpired row: no database, no row,
 * a read that threw or did not land, a value that is not an object, any key beside the three (the old two-key row
 * included — U37b review m3), a blank `enabledBy`, an instant that is not exactly one, `closesAt` not after `enabledAt`,
 * an opening longer than 24 hours, an `enabledAt` more than a minute in this server's future — and, from `closesAt` on,
 * `expired`, carrying the instant it closed. ⭐ "Now" is taken AFTER the read lands (unless a caller passes one), so a
 * slow read can never answer open past the closing time.
 */
export async function readMarketingLiveSwitch(
  load: MarketingLiveSwitchLoad = loadConfigResult,
  now?: number,
): Promise<MarketingLiveSwitch> {
  let read: Awaited<ReturnType<MarketingLiveSwitchLoad>>;
  try {
    read = await load(MARKETING_LIVE_SWITCH_KEY);
  } catch {
    return { state: "closed", why: "unreadable" };
  }
  if (!read.ok) return { state: "closed", why: "unreadable" };
  return judgeRow(read.value, now ?? Date.now());
}

/** The reader's rule over one stored value at one instant — also how the writers judge what they read and removed. */
function judgeRow(value: unknown, at: number): MarketingLiveSwitch {
  if (value === null || value === undefined) return { state: "closed", why: "absent" };
  if (typeof value !== "object" || Array.isArray(value)) return { state: "closed", why: "malformed" };
  const row = value as Record<string, unknown>;
  if (Object.keys(row).sort().join(",") !== SWITCH_KEYS) return { state: "closed", why: "malformed" };
  const enabledBy = typeof row.enabledBy === "string" ? row.enabledBy.trim() : "";
  const enabledAt = typeof row.enabledAt === "string" ? row.enabledAt.trim() : "";
  const closesAt = typeof row.closesAt === "string" ? row.closesAt.trim() : "";
  const enabledMs = instantMs(enabledAt);
  const closesMs = instantMs(closesAt);
  if (enabledBy === "" || enabledMs === null || closesMs === null) return { state: "closed", why: "malformed" };
  if (closesMs <= enabledMs || closesMs - enabledMs > LIVE_SWITCH_MAX_OPEN_MS) return { state: "closed", why: "malformed" };
  if (!Number.isFinite(at) || enabledMs > at + CLOCK_SKEW_MS) return { state: "closed", why: "malformed" };
  if (at >= closesMs) return { state: "closed", why: "expired", closedAt: closesAt };
  return { state: "open", enabledBy, enabledAt, closesAt };
}

export type MarketingLiveGate = { ok: true; via: "stub" | "open" } | { ok: false; reason: "live_sends_closed" };

/**
 * ⭐ THE GATE: the console stub always (no handset, no money); a real carrier only while the switch reads open AND its
 * closing time is still ahead (a state read earlier is not a licence for later); anything else — an unrecognised
 * provider — never.
 */
export function marketingLiveGate(provider: SmsProviderResolution, live: MarketingLiveSwitch, now: number = Date.now()): MarketingLiveGate {
  if (provider === "console") return { ok: true, via: "stub" };
  if (provider === "blackball" && live.state === "open") {
    const closesMs = instantMs(live.closesAt);
    if (closesMs !== null && Number.isFinite(now) && now < closesMs) return { ok: true, via: "open" };
  }
  return { ok: false, reason: "live_sends_closed" };
}

/* ══ THE TWO WRITERS ═════════════════════════════════════════════════════════════════════════════════════════════ */

/** Everything the writers touch, injectable so `test:marketing-settings` drives each failure. */
export type LiveSwitchWriteDeps = {
  /** `loadConfigResult` — the RAW row; the writers judge it with the reader's own rule. */
  load: MarketingLiveSwitchLoad;
  /** `createConfigIfAbsent` — "created", or "exists" when the key is taken; throws when the outcome is unknown. */
  create: (key: string, value: unknown) => Promise<"created" | "exists">;
  /** `replaceConfigIfValue` — replaces only the exact row read; throws when the outcome is unknown. */
  replace: (key: string, expected: unknown, value: unknown) => Promise<boolean>;
  /** `takeConfig` — the close's delete, answering exactly what it removed; `ok: false` is an UNKNOWN outcome. With
   *  `expected` (a retry), only while the row still holds exactly that value. */
  take: (key: string, expected?: unknown) => Promise<{ ok: true; deleted: unknown } | { ok: false; error?: string }>;
  /** `deleteConfigIfValue` — the rollback's: only while the row still holds exactly what this call wrote. */
  takeBack: (key: string, value: unknown) => Promise<boolean>;
  /** `audit` — awaited; its `recorded` says whether the row exists (it never throws in production, a stand-in may). */
  audit: (entry: Parameters<typeof audit>[0]) => Promise<unknown>;
  now: () => number;
  hasDatabase: () => boolean;
  /** The pause between attempts (a blip is usually over in a moment). */
  sleep: (ms: number) => Promise<void>;
};

/** The shipped deps — exported so the Postgres probe can drive the REAL writers with one fault planted. */
export const LIVE_SWITCH_WRITE_DEPS: Readonly<LiveSwitchWriteDeps> = Object.freeze({
  load: loadConfigResult,
  create: createConfigIfAbsent,
  replace: replaceConfigIfValue,
  take: takeConfig,
  takeBack: deleteConfigIfValue,
  audit: (entry: Parameters<typeof audit>[0]) => audit(entry),
  now: () => Date.now(),
  hasDatabase,
  sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
});

/** How many times a rollback or a close tries before it says it could not confirm. */
const CONFIRM_ATTEMPTS = 3;
const CONFIRM_PAUSE_MS = 250;

/** Why a write was refused (and the close's two "nothing for me to do" answers). */
export type LiveSwitchRefusal =
  | "bad_duration" | "no_officer" | "bad_ops_text" | "no_database" | "already_open" | "cannot_read" | "record_failed"
  | "changed_meanwhile" | "save_failed" | "not_open_after_save" | "audit_failed" | "other_open" | "unconfirmed_off"
  | "still_open_after_close" | "close_unconfirmed" | "reopened_meanwhile" | "already_closed";

export type LiveSwitchOpenResult =
  | { ok: true; state: Extract<MarketingLiveSwitch, { state: "open" }>; recorded: true }
  | { ok: false; reason: LiveSwitchRefusal; error: string };

/**
 * A close that removed a row (or whose lost-reply delete may have): `was` — what the removed row read as (`unknown` when
 * the delete's reply was lost and only the row's absence is known); `reopened` — somebody switched it on again after
 * this close's delete (their opening stands).
 */
export type LiveSwitchCloseResult =
  | { ok: true; state: MarketingLiveSwitch; recorded: boolean; was: "open" | "expired" | "malformed" | "unknown"; reopened: boolean }
  | { ok: false; reason: LiveSwitchRefusal; error: string };

/** The card's words for each refusal (spec §4.3 "Results"; the rest from the U49s reviews). "It is off now" is said only
 *  where a read proved it. */
export const LIVE_SWITCH_REFUSAL_SENTENCE: Readonly<Record<LiveSwitchRefusal, string>> = Object.freeze({
  bad_duration: "Choose how long it stays on — between 30 minutes and 24 hours.",
  no_officer: "Sign in again to switch marketing SMS on or off.",
  bad_ops_text:
    "Say who and why in plain words of at most 120 characters each — no phone number: no more than six digits across the two, so leave dates out.",
  no_database: "This server has no database, so the switch can't be stored (local development) — it stays off.",
  already_open: "Marketing SMS are already on — switch them off first if you want a different closing time.",
  cannot_read: "The switch couldn't be read just now, so nothing was changed — reload the page and try again.",
  record_failed: "Its record couldn't be written, so nothing was switched on. Try again.",
  changed_meanwhile: "The switch changed while you were switching it on, so nothing was written — reload the page and try again.",
  save_failed: "The switch couldn't be saved — it is off now. Try again.",
  not_open_after_save: "The switch was saved but didn't read back as on — it is off now. Try again.",
  audit_failed: "Its record couldn't be written, so the switch was switched back off — it is off now. Try again.",
  other_open:
    "Someone else switched marketing SMS on at the same moment — theirs stands. Reload the page to see who, and until when.",
  unconfirmed_off:
    "Something failed and the switch couldn't be confirmed off — switch it off now, and if that fails tell the developer at once.",
  still_open_after_close: "The switch didn't read back as off — try again, and if it repeats tell the developer at once.",
  close_unconfirmed:
    "The switch couldn't be read back after switching it off — reload the page to check it is off, and switch it off again if it still reads on.",
  reopened_meanwhile:
    "Someone switched marketing SMS on again at the same moment — it is on now. Switch it off again if you meant to.",
  already_closed: "It was already off.",
});

const refuse = (reason: LiveSwitchRefusal): { ok: false; reason: LiveSwitchRefusal; error: string } =>
  ({ ok: false, reason, error: LIVE_SWITCH_REFUSAL_SENTENCE[reason] });

/** Any character that controls, formats or breaks a line, that the eye never sees (bidi overrides, line separators,
 *  joiners, the Hangul filler — every default-ignorable code point), or a lone surrogate. */
const HIDDEN = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]/u;
/** Every numeric character in any script — decimal digits, circled and dingbat numbers, numerals of every kind. */
const ANY_NUMBER = /\p{N}/gu;
const numeralsIn = (t: string): number => (t.match(ANY_NUMBER) ?? []).length;
/**
 * The ops door's `by` and `reason`, each: plain words, 1–120 characters after Unicode normalisation (NFKC folds full-width
 * letters and digits), one line, no hidden characters, and at most six numeric characters — and the WRITER holds the two
 * together to six (a number split across `by` and `reason` is still a number): a phone number has no place in an
 * append-only audit chain, whatever it is wrapped in. (A date, eight digits, is refused too; the record carries its own
 * instant. ⚠️ Numerals written as letters — CJK 七一二… — are letters to Unicode and pass; this door is Claude's alone.)
 */
export function screenOpsText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.normalize("NFKC").trim();
  if (t === "" || t.length > 120 || HIDDEN.test(t)) return null;
  if (numeralsIn(t) > 6) return null;
  return t;
}

type WriteInput = { actorId: string | null; via: "card" | "ops"; by?: string; reason?: string };

/** Who the row and the audit name: the owner's id from the card, or the ops door's screened `by` — never a guess. */
function whoOf(i: WriteInput): { ok: true; enabledBy: string; extra: { by?: string; reason?: string } } | { ok: false; reason: LiveSwitchRefusal } {
  if (i.via === "card") {
    const id = typeof i.actorId === "string" ? i.actorId.trim() : "";
    return id === "" ? { ok: false, reason: "no_officer" } : { ok: true, enabledBy: id, extra: {} };
  }
  const by = screenOpsText(i.by);
  const why = screenOpsText(i.reason);
  if (by === null || why === null || numeralsIn(by) + numeralsIn(why) > 6) return { ok: false, reason: "bad_ops_text" };
  return { ok: true, enabledBy: `ops: ${by}`, extra: { by, reason: why } };
}

/** Whether an awaited audit call left its row: a stand-in that throws, or a result without `recorded: true`, did not. */
async function recordedBy(deps: LiveSwitchWriteDeps, entry: Parameters<typeof audit>[0]): Promise<boolean> {
  try {
    const r = await deps.audit(entry);
    return r !== null && typeof r === "object" && (r as { recorded?: unknown }).recorded === true;
  } catch {
    return false;
  }
}

/** One read: the RAW row (for a conditional write) and what the reader's rule makes of it at the instant it landed. */
type Read = { ok: true; raw: unknown; state: MarketingLiveSwitch } | { ok: false; state: MarketingLiveSwitch };
async function readNow(deps: LiveSwitchWriteDeps): Promise<Read> {
  try {
    const r = await deps.load(MARKETING_LIVE_SWITCH_KEY);
    if (!r.ok) return { ok: false, state: { state: "closed", why: "unreadable" } };
    const raw = r.value === undefined ? null : r.value;
    return { ok: true, raw, state: judgeRow(raw, deps.now()) };
  } catch {
    return { ok: false, state: { state: "closed", why: "unreadable" } };
  }
}

/** A pause that can never turn a refusal into a throw. */
async function pause(deps: LiveSwitchWriteDeps): Promise<void> {
  try { await deps.sleep(CONFIRM_PAUSE_MS); } catch { /* no pause is still a retry */ }
}

/** A read that rides out a blip: up to three tries, a pause between. */
async function settledRead(deps: LiveSwitchWriteDeps): Promise<Read> {
  let r = await readNow(deps);
  for (let attempt = 2; attempt <= CONFIRM_ATTEMPTS && !r.ok; attempt++) {
    await pause(deps);
    r = await readNow(deps);
  }
  return r;
}

type SwitchRow = { enabledBy: string; enabledAt: string; closesAt: string };

const isRow = (s: MarketingLiveSwitch, row: SwitchRow): boolean =>
  s.state === "open" && s.enabledBy === row.enabledBy && s.enabledAt === row.enabledAt && s.closesAt === row.closesAt;

/** A stored value as jsonb compares it: an object's keys in any order, everything else exactly. */
function canonicalJson(v: unknown): string {
  return JSON.stringify(v, (_k, x: unknown) =>
    x !== null && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : x);
}
/** Whether two stored values are the same row — what "the row first read is still there" means, never a judged state. */
const sameJson = (a: unknown, b: unknown): boolean => canonicalJson(a) === canonicalJson(b);

/**
 * ⛔ THE WRITERS' ONE RULE FOR "AN OPENING" (the fourth review's m4; the fifth's F4 and F6) — the opening's `enabledAt`,
 * or null. A stored row is an opening when it reads open now — OR when it is another writer's opening stamped by a clock
 * ahead of this one: it reads malformed here only because its `enabledAt` is ahead, and judged at that instant it reads
 * open. The READER still reads the latter closed, so no send passes on it; the writers never replace it, never say the
 * switch is off while it stands, and report it as an opening. ONE rule at ONE instant: the open's first read, its
 * read-back and rollback, and every decision of the close.
 */
function openingSince(raw: unknown, at: number): string | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const enabledAt = (raw as Record<string, unknown>).enabledAt;
  const enabledMs = typeof enabledAt === "string" ? instantMs(enabledAt.trim()) : null;
  const judged = judgeRow(raw, enabledMs !== null ? Math.max(at, enabledMs) : at);
  return judged.state === "open" ? judged.enabledAt : null;
}
const isOpening = (raw: unknown, at: number): boolean => openingSince(raw, at) !== null;

/**
 * ⛔ THE ONE ROLLBACK for an opening that cannot stand. Takes back ONLY the row this call wrote (compare-and-delete), then
 * re-reads, a few times over a blip: `off` only on a READABLE read that shows no opening; `other_open` when it shows an
 * opening SOMEBODY ELSE wrote (theirs is never touched); otherwise `unconfirmed` — and the owner is told to switch it off.
 */
async function takeBackOpening(deps: LiveSwitchWriteDeps, ours: SwitchRow): Promise<"off" | "other_open" | "unconfirmed"> {
  for (let attempt = 1; attempt <= CONFIRM_ATTEMPTS; attempt++) {
    try { await deps.takeBack(MARKETING_LIVE_SWITCH_KEY, ours); } catch { /* the read decides */ }
    const after = await readNow(deps);
    if (after.ok && !isOpening(after.raw, deps.now())) return "off";
    if (after.ok && !sameJson(after.raw, ours)) return "other_open";
    if (attempt < CONFIRM_ATTEMPTS) await pause(deps);
  }
  return "unconfirmed";
}

/**
 * ⛔ OPEN — the owner's G1. Reads first; RECORDS FIRST (`marketing.live_switch_opening`); writes CONDITIONALLY (create where
 * there is no row, replace only the exact stale row read); reads it back; records `marketing.live_switch_opened`. Any
 * failure after the write goes through `takeBackOpening`, and every ending is recorded
 * (`marketing.live_switch_open_failed`). Nothing is ever open without a record naming it, no opening is laid over
 * another, and nothing is reported off unless a read proves it.
 */
export async function openMarketingLiveSwitch(
  i: WriteInput & { forMs: number },
  deps: LiveSwitchWriteDeps = LIVE_SWITCH_WRITE_DEPS,
): Promise<LiveSwitchOpenResult> {
  if (!Number.isSafeInteger(i.forMs) || i.forMs < LIVE_SWITCH_MIN_OPEN_MS || i.forMs > LIVE_SWITCH_MAX_OPEN_MS) {
    return refuse("bad_duration");
  }
  const who = whoOf(i);
  if (!who.ok) return refuse(who.reason);
  // ⛔ With no database nothing can be stored and the read-back would answer "absent": said plainly, before anything runs.
  if (!deps.hasDatabase()) return refuse("no_database");
  // ⭐ READ FIRST: an opening is never laid over another, and a switch that cannot be read is never written over.
  const first = await readNow(deps);
  if (!first.ok) return refuse("cannot_read");
  if (isOpening(first.raw, deps.now())) return refuse("already_open");

  const nowMs = deps.now();
  const ours: SwitchRow = { enabledBy: who.enabledBy, enabledAt: new Date(nowMs).toISOString(), closesAt: new Date(nowMs + i.forMs).toISOString() };
  const base = { category: "COMPLIANCE" as const, actorId: i.actorId, targetType: "SystemConfig", targetId: MARKETING_LIVE_SWITCH_KEY };
  // ⛔ RECORD FIRST — the intent is on the chain before the row can exist. Not recorded: nothing is written at all.
  const intent = await recordedBy(deps, {
    ...base,
    action: "marketing.live_switch_opening",
    payload: { enabledAt: ours.enabledAt, closesAt: ours.closesAt, via: i.via, ...who.extra },
  });
  if (!intent) return refuse("record_failed");

  const ended = async (step: LiveSwitchRefusal, outcome: "off" | "other_open" | "unconfirmed" | "not_written"): Promise<LiveSwitchOpenResult> => {
    // The ending is recorded too — what was FOUND, never what was hoped. (Not recorded: the opening row above still names
    // the attempt, and the owner is told what is true either way.)
    await recordedBy(deps, { ...base, action: "marketing.live_switch_open_failed", payload: { enabledAt: ours.enabledAt, step, outcome } });
    if (outcome === "not_written") return refuse(step);
    return refuse(outcome === "off" ? step : outcome === "other_open" ? "other_open" : "unconfirmed_off");
  };
  const settle = async (step: LiveSwitchRefusal): Promise<LiveSwitchOpenResult> => ended(step, await takeBackOpening(deps, ours));

  // ⛔ THE CONDITIONAL WRITE: no row → create it (a row that appeared since the read → not ours to replace); a stale row
  // (expired, or a shape this version does not read) → replace exactly that row, nothing else.
  let wrote: boolean;
  try {
    wrote = first.raw === null
      ? (await deps.create(MARKETING_LIVE_SWITCH_KEY, { ...ours })) === "created"
      : await deps.replace(MARKETING_LIVE_SWITCH_KEY, first.raw, { ...ours });
  } catch {
    // ⛔ A write that threw may still have committed (the reply was lost, not the write): take it back before saying "off".
    return settle("save_failed");
  }
  if (!wrote) {
    // The row changed between the first read and the write: nothing of ours was written. Say what is there now.
    const now = await readNow(deps);
    return ended(now.ok && isOpening(now.raw, deps.now()) ? "other_open" : "changed_meanwhile", "not_written");
  }
  // ⭐ Believed only when the strict rule says open with THESE three values.
  const back = await readNow(deps);
  if (!isRow(back.state, ours)) {
    // Somebody else's opening landed over ours: theirs stands with its own record, ours never did. Never touch it.
    if (back.ok && isOpening(back.raw, deps.now()) && !sameJson(back.raw, ours)) return ended("not_open_after_save", "other_open");
    return settle("not_open_after_save");
  }
  const confirmed = await recordedBy(deps, {
    ...base,
    action: "marketing.live_switch_opened",
    payload: { enabledAt: ours.enabledAt, closesAt: ours.closesAt, via: i.via, ...who.extra },
  });
  if (!confirmed) return settle("audit_failed");
  return { ok: true, state: { state: "open", ...ours }, recorded: true };
}

/**
 * ⛔ CLOSE — never refused for a missing record. Removes the row with `DELETE … RETURNING` and records
 * `marketing.live_switch_closed` with EXACTLY the row it removed (`was`, and `openSince` for an opening). A delete whose
 * outcome is unknown is never retried blind: the close looks first and tries again ONLY on a readable look showing the
 * very row it first read — deleting then only that row. Once a readable read proves that row gone, the close is RECORDED
 * as `was: "unknown"` (somebody's later opening stands: `reopened`); with no read to be had it is `close_unconfirmed`.
 * Nothing to remove writes nothing.
 */
export async function closeMarketingLiveSwitch(
  i: WriteInput,
  deps: LiveSwitchWriteDeps = LIVE_SWITCH_WRITE_DEPS,
): Promise<LiveSwitchCloseResult> {
  const who = whoOf(i);
  if (!who.ok) return refuse(who.reason);
  const first = await readNow(deps);
  if (first.ok && first.raw === null) return refuse("already_closed");
  // The row this close set out to remove — known only when the first read succeeded.
  const firstRaw: unknown = first.ok ? first.raw : undefined;

  let removed: unknown = null;       // the row a delete ANSWERED it removed
  let unknownOutcome = false;        // a delete's reply was lost: it may have committed
  let goneSeen = false;              // a readable proof that the row first read is no longer there
  let goneLook: unknown = undefined; // what the readable look that proved it showed: no row, or another
  for (let attempt = 1; attempt <= CONFIRM_ATTEMPTS; attempt++) {
    let r: Awaited<ReturnType<LiveSwitchWriteDeps["take"]>>;
    try {
      // The first delete takes whatever is there and says what it took; ⛔ a retry takes ONLY the row first read.
      r = attempt === 1 ? await deps.take(MARKETING_LIVE_SWITCH_KEY) : await deps.take(MARKETING_LIVE_SWITCH_KEY, firstRaw);
    } catch {
      r = { ok: false };
    }
    if (r.ok) {
      if (r.deleted !== null && r.deleted !== undefined) removed = r.deleted;
      // ⛔ A retry's compare-and-delete that found nothing PROVES the row first read is gone (the fifth review's F2).
      else if (attempt > 1) goneSeen = true;
      break;
    }
    // ⛔ The delete may have committed and lost its reply. Look before trying again — and try again ONLY on a readable
    // look that shows the very row first read (no look, or no first read to compare with, is no licence to delete again).
    unknownOutcome = true;
    const look = await readNow(deps);
    if (!look.ok) break;
    // A readable look that finds no row proves it gone even when the first read failed (the fifth review's F1).
    if (look.raw === null || (first.ok && !sameJson(look.raw, firstRaw))) { goneSeen = true; goneLook = look.raw; break; }
    if (!first.ok) break;
    if (attempt < CONFIRM_ATTEMPTS) await pause(deps);
  }
  const after = await settledRead(deps);
  // What stands now: the final read — or, when none could be had, what the look that proved the row gone showed (the
  // fifth review's F3: never "off" over an opening this close saw land).
  const standing: unknown = after.ok ? after.raw : goneLook;
  const reopened = standing !== undefined && isOpening(standing, deps.now());
  const record = (was: "open" | "expired" | "malformed" | "unknown", openSince: string | null) => recordedBy(deps, {
    category: "COMPLIANCE",
    action: "marketing.live_switch_closed",
    actorId: i.actorId,
    targetType: "SystemConfig",
    targetId: MARKETING_LIVE_SWITCH_KEY,
    payload: { via: i.via, was, openSince, ...who.extra },
  });

  if (removed !== null) {
    // ⭐ Recorded from the row it REMOVED, judged by the writers' rule at this instant.
    const at = deps.now();
    const since = openingSince(removed, at);
    const judged = judgeRow(removed, at);
    const was = since !== null ? "open" : judged.state === "closed" && judged.why === "expired" ? "expired" : "malformed";
    const recorded = await record(was, since);
    return { ok: true, state: after.state, recorded, was, reopened };
  }
  if (unknownOutcome) {
    // ⛔ "Gone" only on a READABLE read, comparing stored values: no row now, or — against a first read that succeeded —
    // a different one. This close's lost-reply delete may be what removed it, so it is RECORDED, never "already off".
    const goneNow = after.ok && (after.raw === null || (first.ok && !sameJson(after.raw, firstRaw)));
    if (goneSeen || goneNow) {
      const recorded = await record("unknown", first.ok ? openingSince(firstRaw, deps.now()) : null);
      return { ok: true, state: after.state, recorded, was: "unknown", reopened };
    }
    if (!after.ok) return refuse("close_unconfirmed");
    // A readable read shows a row no delete removed: an opening → it was not switched off; a stale row → it read off.
    return refuse(isOpening(after.raw, deps.now()) ? "still_open_after_close" : "already_closed");
  }
  // The delete answered cleanly that there was NO row: somebody else removed it after the first read. This close did
  // nothing, and writes nothing — and says what is there now, or that it cannot.
  if (!after.ok) return refuse("close_unconfirmed");
  if (isOpening(after.raw, deps.now())) return refuse("reopened_meanwhile");
  return refuse("already_closed");
}

/** How far an ops writer's clock may sit from the database's before it may not OPEN the switch (the reader tolerates a
 *  minute). */
export const MAX_OPS_CLOCK_OFFSET_MS = 20_000;

/**
 * The ops door's clock check (the fourth review's m4): null when this process's clock is within 20 s of the database's —
 * `dbMs` set against the midpoint of the round trip that read it — else what is wrong, in words.
 */
export function opsClockProblem(dbMs: number | null, askedAt: number, answeredAt: number): string | null {
  if (dbMs === null || !Number.isFinite(dbMs) || !Number.isFinite(askedAt) || !Number.isFinite(answeredAt)) {
    return "the database's clock couldn't be read, so this PC's clock can't be checked against it";
  }
  const offsetMs = dbMs - (askedAt + answeredAt) / 2;
  if (Math.abs(offsetMs) <= MAX_OPS_CLOCK_OFFSET_MS) return null;
  return `this PC's clock is ${Math.round(Math.abs(offsetMs) / 1000)} s ${offsetMs > 0 ? "behind" : "ahead of"} the database's`;
}

/**
 * The database's clock (`SELECT now()`), for the ops door — it runs on an operator's PC through `railway run`, and a writer
 * whose clock is more than a minute off would stamp an opening the servers read as malformed, or read a fresh opening as
 * one (the fourth review's m4). Read-only; null when it cannot be read.
 */
export async function readDatabaseClockMs(): Promise<number | null> {
  if (!hasDatabase()) return null;
  const client = prisma();
  if (!client) return null;
  try {
    const rows = await client.$queryRaw<{ now: Date }[]>`SELECT now() AS now`;
    const at = rows[0]?.now;
    const ms = at instanceof Date ? at.getTime() : Number.NaN;
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}
