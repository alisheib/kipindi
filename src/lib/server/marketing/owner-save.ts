/**
 * THE OWNER-SAVE DOOR · G4 · G5 · G10 — how Claude saves what Ali approves in the Claude session: the marketing wordings
 * (G4), the campaign source line (G5) and the public policy lines (G10). Run as `ops:marketing-owner-save`
 * (`scripts/ops/marketing-owner-save.mts`), which has no logic of its own: every decision is made here.
 *
 * ⭐ THE RULING (Ali, 2026-10-07, in the Claude session). He approves each marketing wording, the campaign source line and
 * each public policy line IN THE CHAT, and Claude saves them for him through this audited door — never with his login:
 * `docs/COMPLIANCE-DECISIONS.md` § "2026-10-07 · Marketing SMS go to anyone with a phone — consent is not a condition (the
 * owner's FINAL rule), and his approvals given in the session", its paragraph "The owner's approvals given in the session
 * the same day", which AMENDS the older "his act on the card" wording (the save on Admin → System was the approval). What
 * it saves is legal evidence — a basis wording is shown to the person it describes — so the door is exact, refuses safely,
 * and leaves an honest record of every attempt.
 *
 * ⛔ NO WRITER OF ITS OWN. It calls the SAME writers the two cards call — `saveMarketingWordings` and `savePolicyLines` —
 * with the card's OWN request, built by the card's own pure builders (`wordingsToSave` + `wordingsPostEntries`,
 * `policyLinesToSave` + `policyLinesPostEntries`) from the row AS IT IS NOW: every base is the count saved now, and
 * `approve.<key>=1` goes only with a wording whose history is empty. Every rule, the stale, approval and append-only checks,
 * the verified write and the factory's ADMIN row run inside those writers, unchanged. The author is `ops: <by>` and the
 * instant is the DATABASE's (`savedAt` is evidence, and its EAT day stamps a page's version). Nothing here writes
 * SystemConfig itself, and the card's suggestions are never read (W1): every word saved comes from the approval file.
 *
 * ⛔ THE BYTES WRITTEN ARE THE BYTES ALI APPROVED. The approval is a FILE — UTF-8 JSON with literal characters, because a
 * command line mangles Swahili, Chinese and typographic marks on PowerShell 5.1 — read by its own strict reader: objects
 * and texts only, every key once, no escape anywhere. Each text is normalised by its record's own normaliser
 * (`normalizeWording`, `normalizePolicyLine`); `check` prints it exactly as it will be stored, with the first 12 hex digits
 * of its sha256, and `apply` refuses unless `--expect` names those same digits for every text in the file.
 *
 * ⛔ RECORD FIRST. Nothing is written until COMPLIANCE `marketing.owner_save_applying` — the gate, the keys, their sha256s,
 * who ran the door and why, and that Ali approved it in the Claude session on `approvedOn` — is awaited and comes back
 * recorded; a record that does not land writes nothing at all. Every ending after it is recorded too, awaited:
 *   · `marketing.owner_save_applied` — the versions written, the lines that moved, the page versions and the confirmed
 *     ADMIN row;
 *   · `marketing.owner_save_refused` — NOTHING WAS WRITTEN: the writer refused before its write (its reason, its sentence
 *     and every per-key problem, verbatim), or the database's clock could not be read for the write;
 *   · `marketing.owner_save_failed` — the writer threw, or said saved while the row does not read back as Ali's words, or
 *     answered `not_saved` while the row does not read back as this door's write: what the row holds is not known, or not
 *     what was approved — never passed off as a refusal.
 * ⛔ `not_saved` IS NOT "NOTHING WAS WRITTEN": the factory's verified write (`define-config.ts`) answers it when its read-back
 * fails AFTER a committed save, before its ADMIN row, as well as before a write. So the row is read FRESH: this door's
 * write found there (its `ops: <by>`, this save's instant, Ali's words) → the applied path, never confirmed
 * (`done_unconfirmed`: no ADMIN row); not found → `save_unconfirmed`, recorded `_failed`, and the operator runs `status`.
 * The texts are not copied into these rows: the factory's ADMIN row holds them, before and after.
 *
 * ⛔ THE FACTORY'S ADMIN ROW IS FIRE-AND-FORGET (`define-config.ts`), and a short-lived ops process can exit before it lands.
 * So the door flushes the audit queue, requires nothing left pending, and reads the row back DURABLY — matched by its
 * author, this save's instant and exactly the keys it moved — before it says DONE without a warning. The row reader is
 * HANDED IN (`ownerSaveDeps`): this module calls no audit-row reader of its own, so the console guard that classifies every
 * such reader in `src/` (`test:house-bot-reports` 0.260.1) has nothing new to classify.
 *
 * ⭐ THE RECORD'S OWN RULES RUN FIRST, before the record — the card's sentences, every problem at once. ⭐ U13 · the RG line
 * is judged against the send window's hours AS SAVED NOW, read fresh exactly as the policy writer reads them
 * (`policySendWindow`); while they cannot be read the door refuses, as the writer would, before it records anything.
 * ⭐ NOTHING TO DO WRITES NOTHING: when every text already reads that way — by the card's own rule — not even the record.
 * ⛔ IT DOES NOT CLEAR: a blank text is refused, and a review marks only a line that prints today's words. Clearing stays an
 * act on the card.
 * ⚠️ PRODUCTION'S CACHE: the door runs in another process, and the container keeps its cached copy of both records until it
 * reloads the row or restarts — so the door says to redeploy once after the last apply (it never reaches into production).
 * ⚠️ ONE SAVE AT A TIME IS PER PROCESS: the request carries every base the door read, so a card save that lands after that
 * read is refused `stale` by the writer (and recorded); only a card save inside the writer's own read-and-write
 * milliseconds is the race two containers already have. Apply while nobody is saving these cards.
 *
 * Guard: `npm run test:marketing-owner-save` (red: `npm run red:marketing-owner-save`).
 */
import { createHash } from "node:crypto";
import { audit, auditFlush, auditPending } from "@/lib/server/audit";
import { hasDatabase } from "@/lib/server/prisma";
import { opsClockProblem, readDatabaseClockMs, screenOpsText } from "@/lib/server/marketing/live-switch";
import {
  MARKETING_WORDINGS_AUDIT, MARKETING_WORDINGS_KEY, reloadMarketingWordings, saveMarketingWordings,
  type WordingsReload, type WordingsSaveResult,
} from "@/lib/server/marketing/wordings";
import {
  POLICY_LINES_AUDIT, POLICY_LINES_KEY, policySendWindow, reloadPolicyLines, savePolicyLines,
  type PolicyLinesReload, type PolicyLinesSaveResult, type PolicySendWindowRead,
} from "@/lib/server/legal/policy-lines";
import {
  WORDING_KEYS, WORDING_RULE, isWordingKey, normalizeWording, wordingProblems, wordingsPostEntries, wordingsToSave,
  type WordingCardState, type WordingHistories, type WordingKey, type WordingProblem, type WordingVersion,
} from "@/lib/marketing/marketing-wordings";
import {
  POLICY_LINE_DEFAULTS, POLICY_LINE_KEYS, POLICY_LINE_SPEC, POLICY_LOCALES, POLICY_LOCALE_NAME, POLICY_PAGES,
  POLICY_PAGE_KEYS, isPolicyLineKey, isReviewVersion, nextPolicyVersion, normalizedPolicyTexts, policyDefaultFingerprint,
  policyLineProblems, policyLineState, policyLinesPostEntries, policyLinesToSave, policyOpeningProblems,
  printedPolicyVersion, samePolicyTexts,
  type PolicyCardState, type PolicyLineKey, type PolicyLineProblem, type PolicyLineVersion, type PolicyLinesRecord,
  type PolicyLocale, type PolicyPage, type PolicySendWindow, type PolicyTexts,
} from "@/lib/legal/policy-lines";
import { OUTREACH_CHECK_SENTENCE } from "@/lib/marketing/outreach-open-checks";
import { formatWindow } from "@/lib/marketing/sms-settings";
import { SOURCE_PHRASE_MAX_CHARS } from "@/lib/marketing/campaign-template";
import { encodingFor, unitsIn } from "@/lib/sms-compose";
import { charCount } from "@/lib/contacts/contact-fields";
import { EAT_OFFSET_MS, eatDayKey } from "@/lib/eat-day";

/** The door's CLI loads ONE module after its proxy rewrite: the database check and the clock rule come through here. */
export { hasDatabase, opsClockProblem, readDatabaseClockMs };

/* ⛔ No pattern or text in this file holds a backslash: an editing tool decodes typed escapes (repo memory, 2026-10-02),
   so every control or invisible character, and the one Unicode class, is built from its code. */
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const TAB = String.fromCharCode(9);
const BACKSLASH = String.fromCharCode(92);
const QUOTE = String.fromCharCode(34);
const BOM = String.fromCharCode(0xfeff);
const NBSP = String.fromCharCode(0xa0);
/** Every numeric character in any script — the ops door's own count (`screenOpsText`), held across `by` and `reason`. */
const ANY_NUMERAL = new RegExp(`${BACKSLASH}p{N}`, "gu");
const numeralsIn = (t: string): number => (t.match(ANY_NUMERAL) ?? []).length;
/** At most six numerals across `by` and `reason` together — the live switch door's rule: no phone number, no date. */
const MAX_OPS_NUMERALS = 6;
const DAY_MS = 86_400_000;

/** ⭐ Every version this door saves is stamped `ops: <by>` — the card names it "the ops door (…)", never an admin. */
export const OPS_PREFIX = "ops: ";

/* ══ THE GATES ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

export const OWNER_SAVE_GATES = ["G4", "G5", "G10"] as const;
export type OwnerSaveGate = (typeof OWNER_SAVE_GATES)[number];
const isGate = (g: unknown): g is OwnerSaveGate => g === "G4" || g === "G5" || g === "G10";

/**
 * ⛔ WHICH KEYS EACH GATE MAY SAVE — G4 the nine wordings other than the source line (the five bases, the three 18+
 * sentences and the bought-list notice); G5 the source line ALONE; G10 the five public policy lines. A file that names
 * any other key for its gate is refused, naming the gate the key belongs to.
 */
export const GATE_KEYS: Readonly<Record<OwnerSaveGate, readonly string[]>> = Object.freeze({
  G4: Object.freeze(WORDING_KEYS.filter((k) => k !== "source.phrase")),
  G5: Object.freeze(["source.phrase"]),
  G10: Object.freeze([...POLICY_LINE_KEYS]),
});

/** What each gate is, in words. */
export const GATE_WHAT: Readonly<Record<OwnerSaveGate, string>> = Object.freeze({
  G4: "the consent-basis wordings, the 18+ sentences and the bought-list notice",
  G5: "the campaign source line",
  G10: "the public policy lines",
});

/** The COMPLIANCE rows the door writes: the intent (first, awaited) and exactly one ending — applied; refused (nothing was
 *  written); or failed (what the row holds is not known, or not what was approved). */
export const OWNER_SAVE_ACTIONS = Object.freeze({
  applying: "marketing.owner_save_applying",
  applied: "marketing.owner_save_applied",
  refused: "marketing.owner_save_refused",
  failed: "marketing.owner_save_failed",
} as const);

/** Who approved, and where — the same words on every record (the ruling of 2026-10-07). */
export const APPROVED_BY = "Ali";
export const APPROVED_IN = "the Claude session";

/** An approval is carried out within a week of the day Ali gave it — an older one is asked for again. */
export const APPROVAL_MAX_AGE_DAYS = 7;

/* ══ THE APPROVAL FILE ═══════════════════════════════════════════════════════════════════════════════════════════════ */

/** One wording Ali approved: its words as the file holds them, as they will be stored, and the stored bytes' sha256. */
export type WordingApproval = { readonly key: WordingKey; readonly asTyped: string; readonly text: string; readonly sha12: string };

/** One policy line Ali approved: new words in the three languages, or a REVIEW of today's words (no text is stored). */
export type LineApproval = {
  readonly key: PolicyLineKey;
  readonly review: boolean;
  /** The file's words (null for a review). */
  readonly asTyped: PolicyTexts | null;
  /** As they will be stored — for a review, today's words, which the marker's fingerprint names. */
  readonly texts: PolicyTexts;
  readonly sha12: string;
};

export type WordingsApproval = {
  readonly record: "wordings";
  readonly gate: "G4" | "G5";
  readonly approvedOn: string;
  readonly wordings: readonly WordingApproval[];
};
export type LinesApproval = {
  readonly record: "policy";
  readonly gate: "G10";
  readonly approvedOn: string;
  readonly lines: readonly LineApproval[];
};
export type Approval = WordingsApproval | LinesApproval;

export type ApprovalReading =
  | { readonly ok: true; readonly approval: Approval; readonly notes: readonly string[] }
  | { readonly ok: false; readonly problems: readonly string[] };

/** The first 12 hex digits of the sha256 of a text's UTF-8 bytes — what `check` prints and `--expect` must name. */
export function sha12Of(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 12);
}

/** A policy line's digest: its three stored texts, one per line — and, for a review, the word first, so a review of
 *  today's words and new words that happen to equal them can never share one. */
export function lineSha12(texts: PolicyTexts, review: boolean): string {
  return sha12Of(`${review ? `review${LF}` : ""}${texts.en}${LF}${texts.sw}${LF}${texts.zh}`);
}

type Strict = string | StrictObject;
type StrictObject = { readonly [key: string]: Strict };
type StrictStop = { readonly strictStop: string };

/**
 * ⛔ THE APPROVAL FILE'S OWN READER — stricter than `JSON.parse`, on purpose. `JSON.parse` keeps the LAST of two equal keys,
 * so a file holding a text twice would save one while a reader of the file saw the other. Here: ONE object; objects and
 * texts in double quotes only (no number, list, true, false or null); every key once; no control character inside a text.
 * (The caller has already refused any backslash, so no text holds an escape.) Objects are prototype-free.
 */
function readStrictJson(text: string): { readonly ok: true; readonly value: StrictObject } | { readonly ok: false; readonly problem: string } {
  let i = 0;
  const lineOf = (at: number): number => text.slice(0, at).split(LF).length;
  const stop = (what: string): never => {
    const e: StrictStop = { strictStop: `line ${lineOf(i)}: ${what}` };
    throw e;
  };
  const isSpace = (c: string | undefined): boolean => c === " " || c === LF || c === CR || c === TAB;
  const skip = (): void => { while (i < text.length && isSpace(text[i])) i++; };
  const readText = (): string => {
    i++;
    const start = i;
    while (i < text.length && text[i] !== QUOTE) {
      const code = text.charCodeAt(i);
      if (code < 32 || code === 127) stop("a line break or another control character inside a text — keep every text on one line");
      i++;
    }
    if (i >= text.length) stop("a text that is never closed (a double quote is missing)");
    const s = text.slice(start, i);
    i++;
    return s;
  };
  const readValue = (depth: number): Strict => {
    skip();
    if (text[i] === QUOTE) return readText();
    if (text[i] === "{") return readObject(depth + 1);
    return stop(i >= text.length
      ? "the file ends where a value should be"
      : "only objects and texts in double quotes belong in an approval file — no number, list, true, false or null");
  };
  const readObject = (depth: number): StrictObject => {
    if (depth > 3) stop("objects nested deeper than an approval file has");
    i++;
    const out = Object.create(null) as Record<string, Strict>;
    skip();
    if (text[i] === "}") { i++; return out; }
    for (;;) {
      skip();
      if (text[i] !== QUOTE) stop("a key in double quotes was expected");
      const key = readText();
      if (Object.prototype.hasOwnProperty.call(out, key)) stop(`the key “${key}” appears twice — every key may appear once`);
      skip();
      if (text[i] !== ":") stop(`a colon was expected after the key “${key}”`);
      i++;
      out[key] = readValue(depth);
      skip();
      if (text[i] === ",") { i++; continue; }
      if (text[i] === "}") { i++; return out; }
      stop("a comma or a closing brace was expected");
    }
  };
  try {
    skip();
    if (text[i] !== "{") stop("an approval file is one object, starting with {");
    const value = readObject(0);
    skip();
    if (i < text.length) stop("something follows the closing brace");
    return { ok: true, value };
  } catch (e) {
    const said = (e as Partial<StrictStop> | null)?.strictStop;
    if (typeof said === "string") return { ok: false, problem: said };
    throw e;
  }
}

const ISO_DAY = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

/**
 * ⛔ THE DAY ALI APPROVED — a calendar date, YYYY-MM-DD, that is neither after today in Dar es Salaam (the DATABASE's clock,
 * EAT) nor more than seven days before it. It is its own field because the date can never ride in `--reason`: the door holds
 * `by` and `reason` together to six numerals, and a date alone is eight. `null` when it is acceptable.
 */
export function approvalDateProblem(raw: unknown, nowMs: number): string | null {
  if (typeof raw !== "string" || !ISO_DAY.test(raw)) {
    return "“approvedOn” must be the day Ali approved these words in the Claude session, written YYYY-MM-DD.";
  }
  const ms = Date.parse(`${raw}T00:00:00.000Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== raw) return `“approvedOn” (${raw}) is not a calendar date.`;
  if (!Number.isFinite(nowMs)) return "The database's clock couldn't be read, so “approvedOn” can't be checked.";
  const today = eatDayKey(nowMs);
  const todayMs = Date.parse(`${today}T00:00:00.000Z`);
  if (ms > todayMs) return `“approvedOn” (${raw}) is after today in Dar es Salaam (${today}).`;
  const days = Math.round((todayMs - ms) / DAY_MS);
  if (days > APPROVAL_MAX_AGE_DAYS) {
    return `“approvedOn” (${raw}) is ${days} days ago — an approval older than ${APPROVAL_MAX_AGE_DAYS} days is not carried out; ask Ali to approve the words again.`;
  }
  return null;
}

const gateOwning = (key: string): OwnerSaveGate | undefined => OWNER_SAVE_GATES.find((g) => GATE_KEYS[g].includes(key));

function wordingsOf(gate: "G4" | "G5", raw: Strict | undefined, problems: string[]): WordingApproval[] {
  if (raw === undefined || typeof raw === "string") {
    problems.push("“wordings” must be an object: each key a wording, each value its words.");
    return [];
  }
  const out: WordingApproval[] = [];
  const names = Object.keys(raw);
  if (names.length === 0) problems.push("“wordings” names no wording to save.");
  for (const key of names) {
    const value = raw[key];
    if (!GATE_KEYS[gate].includes(key) || !isWordingKey(key)) {
      const owner = gateOwning(key);
      problems.push(owner !== undefined
        ? `“${key}” belongs to ${owner} (${GATE_WHAT[owner]}), not ${gate} — approve and save it with a ${owner} file of its own.`
        : `“${key}” is not a marketing wording.`);
      continue;
    }
    if (typeof value !== "string") { problems.push(`“${key}” must be its words, as one text.`); continue; }
    const text = normalizeWording(value);
    if (text === "") {
      problems.push(`“${key}” is blank — clearing a wording stays an act on the card; the door saves words only.`);
      continue;
    }
    out.push({ key, asTyped: value, text, sha12: sha12Of(text) });
  }
  return WORDING_KEYS.flatMap((k) => out.filter((w) => w.key === k));
}

function linesOf(raw: Strict | undefined, problems: string[]): LineApproval[] {
  if (raw === undefined || typeof raw === "string") {
    problems.push("“lines” must be an object: each key a public policy line, each value its three texts { en, sw, zh } or the word review.");
    return [];
  }
  const out: LineApproval[] = [];
  const names = Object.keys(raw);
  if (names.length === 0) problems.push("“lines” names no line to save.");
  for (const key of names) {
    const value = raw[key];
    if (!isPolicyLineKey(key)) {
      const owner = gateOwning(key);
      problems.push(owner !== undefined
        ? `“${key}” belongs to ${owner} (${GATE_WHAT[owner]}), not G10 — approve and save it with a ${owner} file of its own.`
        : `“${key}” is not a public policy line.`);
      continue;
    }
    if (value === "review") {
      if (POLICY_LINE_SPEC[key].clearable) {
        problems.push(`“${key}” can't be marked reviewed — it prints nothing until it is saved with words, so there are no words of today's to review. Approve its words instead.`);
        continue;
      }
      const texts = normalizedPolicyTexts(key, POLICY_LINE_DEFAULTS[key]);
      out.push({ key, review: true, asTyped: null, texts, sha12: lineSha12(texts, true) });
      continue;
    }
    if (typeof value === "string") { problems.push(`“${key}” must be its three texts { en, sw, zh }, or the word review.`); continue; }
    const langs = Object.keys(value);
    const odd = langs.filter((l) => !(POLICY_LOCALES as readonly string[]).includes(l));
    const missing = POLICY_LOCALES.filter((l) => !langs.includes(l));
    if (odd.length > 0 || missing.length > 0) {
      problems.push(`“${key}” must hold exactly en, sw and zh${missing.length > 0 ? ` (missing: ${missing.join(", ")})` : ""}${odd.length > 0 ? ` (not a language here: ${odd.join(", ")})` : ""}.`);
      continue;
    }
    const en = value.en, sw = value.sw, zh = value.zh;
    if (typeof en !== "string" || typeof sw !== "string" || typeof zh !== "string") {
      problems.push(`Each language of “${key}” must be one text.`);
      continue;
    }
    const texts = normalizedPolicyTexts(key, { en, sw, zh });
    const blank = POLICY_LOCALES.filter((l) => texts[l] === "");
    if (blank.length > 0) {
      problems.push(`“${key}” is blank in ${blank.map((l) => POLICY_LOCALE_NAME[l]).join(", ")} — every language needs its words; clearing a line stays an act on the card.`);
      continue;
    }
    out.push({ key, review: false, asTyped: { en, sw, zh }, texts, sha12: lineSha12(texts, false) });
  }
  return POLICY_LINE_KEYS.flatMap((k) => out.filter((l) => l.key === k));
}

/**
 * ⭐ THE APPROVAL FILE, READ AS EVIDENCE — strict UTF-8 (an invalid byte refuses; a byte-order mark is ignored and said),
 * no backslash anywhere, the strict reader, exactly `gate`, `approvedOn` and `wordings` (G4, G5) or `lines` (G10), only the
 * gate's own keys, no blank text, a review only for a line that has today's words, and the approval's date. Each text is
 * normalised by its record's own normaliser and its sha256 taken from the stored bytes. Every problem at once.
 */
export function readApproval(bytes: Uint8Array, nowMs: number): ApprovalReading {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return { ok: false, problems: ["The approval file is not valid UTF-8 — save it as UTF-8 text."] };
  }
  const notes: string[] = [];
  if (text.startsWith(BOM)) {
    text = text.slice(BOM.length);
    notes.push("A byte-order mark at the start of the file was ignored.");
  }
  if (text.trim() === "") return { ok: false, problems: ["The approval file is empty."] };
  const slashAt = text.indexOf(BACKSLASH);
  if (slashAt >= 0) {
    return { ok: false, problems: [`The approval file holds a backslash (line ${text.slice(0, slashAt).split(LF).length}) — write every character as itself, never as an escape, so the file reads exactly as the words Ali approved.`] };
  }
  const json = readStrictJson(text);
  if (!json.ok) return { ok: false, problems: [`The approval file can't be read: ${json.problem}.`] };
  const top = json.value;
  const problems: string[] = [];
  for (const k of Object.keys(top)) {
    if (k !== "gate" && k !== "approvedOn" && k !== "wordings" && k !== "lines") {
      problems.push(`“${k}” is not part of an approval file — it holds “gate”, “approvedOn”, and “wordings” (G4, G5) or “lines” (G10).`);
    }
  }
  const gate = top.gate;
  if (!isGate(gate)) {
    problems.push("“gate” must be G4, G5 or G10.");
    return { ok: false, problems };
  }
  const dateProblem = approvalDateProblem(top.approvedOn, nowMs);
  if (dateProblem !== null) problems.push(dateProblem);
  const approvedOn = typeof top.approvedOn === "string" ? top.approvedOn : "";
  if (gate === "G10") {
    if (top.wordings !== undefined) problems.push("A G10 file holds “lines”, never “wordings”.");
    const lines = linesOf(top.lines, problems);
    if (problems.length > 0) return { ok: false, problems };
    return { ok: true, approval: { record: "policy", gate, approvedOn, lines }, notes };
  }
  if (top.lines !== undefined) problems.push(`A ${gate} file holds “wordings”, never “lines”.`);
  const wordings = wordingsOf(gate, top.wordings, problems);
  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, approval: { record: "wordings", gate, approvedOn, wordings }, notes };
}

/** Every text of an approval with its digest, in the card's order. */
export function approvalDigests(a: Approval): ReadonlyArray<{ readonly key: string; readonly sha12: string }> {
  return a.record === "wordings" ? a.wordings.map((w) => ({ key: w.key, sha12: w.sha12 })) : a.lines.map((l) => ({ key: l.key, sha12: l.sha12 }));
}

const SHA12 = /^[0-9a-f]{12}$/;

/** `--expect` as the operator typed it: `key=sha12,key=sha12,…` — every key once. */
export function readExpect(raw: unknown): { readonly ok: true; readonly pairs: ReadonlyMap<string, string> } | { readonly ok: false; readonly problem: string } {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, problem: "--expect is missing — apply needs the sha256 of every text, exactly as check printed them." };
  }
  const pairs = new Map<string, string>();
  for (const part of raw.split(",")) {
    const p = part.trim();
    const eq = p.indexOf("=");
    if (eq <= 0) return { ok: false, problem: `--expect holds “${p}”, which is not key=sha12.` };
    const key = p.slice(0, eq).trim();
    const sha = p.slice(eq + 1).trim().toLowerCase();
    if (!SHA12.test(sha)) return { ok: false, problem: `--expect gives “${key}” the digest “${sha}”, which is not 12 hex digits.` };
    if (pairs.has(key)) return { ok: false, problem: `--expect names “${key}” twice.` };
    pairs.set(key, sha);
  }
  return { ok: true, pairs };
}

/** ⛔ `--expect` against the file: every text needs its digest, every digest must be its text's, and nothing else. */
export function expectProblems(a: Approval, pairs: ReadonlyMap<string, string>): string[] {
  const out: string[] = [];
  const mine = new Map(approvalDigests(a).map((d) => [d.key, d.sha12] as const));
  for (const [key, sha] of mine) {
    const want = pairs.get(key);
    if (want === undefined) out.push(`--expect names no digest for “${key}” — every text in the file needs its own.`);
    else if (want !== sha) out.push(`“${key}” is not the text --expect names: the file's text is ${sha}, --expect says ${want}. Run check again and show Ali the text it prints.`);
  }
  for (const key of pairs.keys()) if (!mine.has(key)) out.push(`--expect names “${key}”, which this file does not hold.`);
  return out;
}

/* ══ WHAT THE DOOR TOUCHES — injectable, so the suite drives every path ═════════════════════════════════════════════ */

/** The pure pieces the door is built from — so `test:marketing-owner-save` plants ONE of them in the REAL door, never a
 *  re-implementation of it (the wordings store's own lesson). */
export type OwnerSaveRules = {
  readonly readApproval: (bytes: Uint8Array, nowMs: number) => ApprovalReading;
  readonly wordingProblems: (key: WordingKey, raw: string) => readonly WordingProblem[];
  readonly policyLineProblems: typeof policyLineProblems;
  readonly wordingsToSave: typeof wordingsToSave;
  readonly policyLinesToSave: typeof policyLinesToSave;
};

export const OWNER_SAVE_RULES: OwnerSaveRules = Object.freeze({
  readApproval, wordingProblems, policyLineProblems, wordingsToSave, policyLinesToSave,
});

/** An audit row as the door reads it back: what `AuditEntry` holds that the door needs. */
export type DoorAuditRow = {
  readonly id: string;
  readonly action: string;
  readonly actorId: string | null;
  readonly payload?: Record<string, unknown>;
};

/** Everything the door reads and writes. */
export type OwnerSaveDeps = {
  /** The wordings row as it is NOW (`reloadMarketingWordings`). */
  readonly readWordings: () => Promise<WordingsReload>;
  /** ⛔ THE wordings writer — the card's own (`saveMarketingWordings`). */
  readonly saveWordings: (patch: unknown, officerId: string, nowIso?: string) => Promise<WordingsSaveResult>;
  /** The policy row as it is NOW (`reloadPolicyLines`). */
  readonly readPolicy: () => Promise<PolicyLinesReload>;
  /** ⛔ THE policy writer — the card's own (`savePolicyLines`). */
  readonly savePolicy: (patch: unknown, officerId: string, nowIso?: string) => Promise<PolicyLinesSaveResult>;
  /** U13 · the send window's hours AS SAVED NOW, read fresh — the policy writer's own reader (`policySendWindow`), so the
   *  door judges the RG line against the very hours the writer will. */
  readonly readSendWindow: () => Promise<PolicySendWindowRead>;
  /** `audit`, awaited; its `recorded` says whether the row exists. */
  readonly audit: (entry: Parameters<typeof audit>[0]) => Promise<unknown>;
  /** `auditFlush` — the factory's fire-and-forget ADMIN row is in the queue when the writer returns. */
  readonly flush: () => Promise<unknown>;
  /** `auditPending` — appends queued and not yet written. */
  readonly pending: () => number;
  /** The DURABLE rows of one audit target, newest first — handed in by the door's CLI. */
  readonly adminRows: (targetType: string, targetId: string) => Promise<{ readonly entries: readonly DoorAuditRow[] }>;
  /** The database's clock (`SELECT now()`), or null when it cannot be read. */
  readonly dbNowMs: () => Promise<number | null>;
  readonly hasDatabase: () => boolean;
  readonly rules: OwnerSaveRules;
};

/** ⭐ The shipped deps — the two records' own readers and writers, the audit queue, the database's clock. The durable row
 *  reader is the caller's (the CLI hands in the audit module's), so this module names none. */
export function ownerSaveDeps(adminRows: OwnerSaveDeps["adminRows"]): OwnerSaveDeps {
  return Object.freeze({
    readWordings: reloadMarketingWordings,
    saveWordings: saveMarketingWordings,
    readPolicy: reloadPolicyLines,
    savePolicy: savePolicyLines,
    readSendWindow: policySendWindow,
    audit: (entry: Parameters<typeof audit>[0]) => audit(entry),
    flush: auditFlush,
    pending: auditPending,
    adminRows,
    dbNowMs: readDatabaseClockMs,
    hasDatabase,
    rules: OWNER_SAVE_RULES,
  });
}

async function safely<T>(f: () => Promise<T>, fallback: T): Promise<T> {
  try { return await f(); } catch { return fallback; }
}

async function dbNow(deps: OwnerSaveDeps): Promise<number | null> {
  const ms = await safely(deps.dbNowMs, null);
  return typeof ms === "number" && Number.isFinite(ms) ? ms : null;
}

/* ══ THE PLAN — the row as it is now, the record's own rules, and the card's own request ══════════════════════════════ */

export type WordingStep = {
  readonly key: WordingKey;
  /** As it will be stored. */
  readonly text: string;
  readonly asTyped: string;
  readonly sha12: string;
  /** Versions saved now — the card's `base.<key>`. */
  readonly base: number;
  /** The card's `approve.<key>=1`: only for a wording whose history is empty. */
  readonly approve: boolean;
  readonly newest: WordingVersion | null;
  /** In the card's request — false when it already reads exactly that way. */
  readonly writes: boolean;
  readonly problems: readonly WordingProblem[];
};

export type LineStep = {
  readonly key: PolicyLineKey;
  readonly review: boolean;
  readonly texts: PolicyTexts;
  readonly asTyped: PolicyTexts | null;
  readonly sha12: string;
  /** Revisions saved now — the card's `base.<key>`. */
  readonly base: number;
  readonly latest: PolicyLineVersion | null;
  /** The page prints SAVED words for this line now (not today's). */
  readonly printsSaved: boolean;
  readonly reviewedCurrent: boolean;
  readonly writes: boolean;
  readonly problems: Readonly<Record<PolicyLocale, readonly PolicyLineProblem[]>>;
  readonly hints: readonly string[];
};

/** What the pages would print, and what the opening checks would say — a PREVIEW from the record's own rules. */
export type PolicyPreview = {
  readonly pagesNow: Readonly<Record<PolicyPage, string>>;
  readonly pagesAfter: Readonly<Record<PolicyPage, string>>;
  readonly openingNow: readonly string[];
  readonly openingAfter: readonly string[];
};

/** Why a plan cannot be applied: a rule of the record (the card's words), a review over saved words, or the card's own
 *  request that would not be the approval. */
export type OwnerSaveBlock = { readonly kind: "rule" | "review" | "builder"; readonly sentence: string };

type PlanCore = {
  /** The database's instant the plan was made at. */
  readonly readAtMs: number;
  /** ⭐ The card's own request — `wordingsPostEntries` / `policyLinesPostEntries` of the card's own builder. */
  readonly patch: Readonly<Record<string, string>>;
  readonly blocks: readonly OwnerSaveBlock[];
};
export type WordingsPlan = PlanCore & {
  readonly record: "wordings";
  readonly approval: WordingsApproval;
  readonly steps: readonly WordingStep[];
  readonly writes: readonly WordingKey[];
};
export type LinesPlan = PlanCore & {
  readonly record: "policy";
  readonly approval: LinesApproval;
  readonly steps: readonly LineStep[];
  readonly writes: readonly PolicyLineKey[];
  readonly before: PolicyLinesRecord;
  readonly preview: PolicyPreview;
  /** U13 · the send window's hours as saved now, the RG line was judged against — null when the file holds no such line. */
  readonly sendWindow: PolicySendWindow | null;
};
export type OwnerSavePlan = WordingsPlan | LinesPlan;

export type PlanReading =
  | { readonly ok: true; readonly plan: OwnerSavePlan }
  | { readonly ok: false; readonly code: "unreadable" | "read_in_part" | "window_unreadable"; readonly sentence: string };

const ROW_SENTENCE = Object.freeze({
  wordingsUnreadable: "The saved marketing wordings couldn't be read just now, so nothing was changed — run it again.",
  wordingsInPart: (dropped: readonly string[]): string =>
    `The saved marketing wordings could be read only in part (${dropped.join(", ")} could not be read), so nothing was changed — the writer refuses every save over such a row. Ask the developer to look at it.`,
  policyUnreadable: "The saved public policy lines couldn't be read just now, so nothing was changed — run it again.",
  policyInPart: (dropped: readonly string[]): string =>
    `The saved public policy lines could be read only in part (${dropped.join(", ")} could not be read), so nothing was changed — the writer refuses every save over such a row. Ask the developer to look at it.`,
  /** U13 · the writer refuses a request holding the RG line while these cannot be read (`window_unreadable`) — so does the door. */
  windowUnreadable:
    "The send window's hours couldn't be read from the Marketing SMS settings, so the marketing line can't be checked against them — nothing was changed. Run it again.",
});

const builderBlock = (what: string): OwnerSaveBlock =>
  ({ kind: "builder", sentence: `${what} — the card's own request would not be Ali's approval, so nothing can be saved; tell the developer.` });

async function planWordings(approval: WordingsApproval, deps: OwnerSaveDeps, nowMs: number): Promise<PlanReading> {
  const read = await safely<WordingsReload>(deps.readWordings, { ok: false });
  if (!read.ok) return { ok: false, code: "unreadable", sentence: ROW_SENTENCE.wordingsUnreadable };
  if (read.dropped.length > 0) return { ok: false, code: "read_in_part", sentence: ROW_SENTENCE.wordingsInPart(read.dropped) };
  const h: WordingHistories = read.histories;
  const listOf = (k: WordingKey): readonly WordingVersion[] => h[k] ?? [];
  const newestOf = (k: WordingKey): WordingVersion | null => {
    const l = listOf(k);
    return l.length > 0 ? l[l.length - 1] : null;
  };
  /* ⭐ The card's state as the card would hold it over the row as it is NOW — every box its newest saved words, the approved
     boxes Ali's words, and the approval tick only where the history is empty. ⛔ A box nobody saved holds nothing here, never
     a suggestion: an untouched never-saved wording is not ticked, so the card's builder never sends it. */
  const texts = Object.fromEntries(WORDING_KEYS.map((k) => [k, newestOf(k)?.text ?? ""])) as Record<WordingKey, string>;
  const saved = Object.fromEntries(
    WORDING_KEYS.map((k) => [k, { count: listOf(k).length, text: newestOf(k)?.text ?? null }]),
  ) as WordingCardState["saved"];
  const approved: Partial<Record<WordingKey, boolean>> = {};
  for (const w of approval.wordings) {
    texts[w.key] = w.text;
    if (listOf(w.key).length === 0) approved[w.key] = true;
  }
  const sending = deps.rules.wordingsToSave({ texts, saved, approved });
  const blocks: OwnerSaveBlock[] = [];
  for (const s of sending) {
    const w = approval.wordings.find((x) => x.key === s.key);
    if (w === undefined) { blocks.push(builderBlock(`It would also send “${s.key}”, which this approval does not hold`)); continue; }
    const count = listOf(s.key).length;
    if (s.base !== count || s.approve !== (count === 0) || normalizeWording(s.text) !== w.text) {
      blocks.push(builderBlock(`It would send “${s.key}” with base ${s.base} and approve ${s.approve}, not base ${count} and approve ${count === 0}, or other words`));
    }
  }
  const steps = approval.wordings.map((w): WordingStep => {
    const count = listOf(w.key).length;
    return {
      key: w.key, text: w.text, asTyped: w.asTyped, sha12: w.sha12, base: count, approve: count === 0, newest: newestOf(w.key),
      writes: sending.some((s) => s.key === w.key), problems: deps.rules.wordingProblems(w.key, w.text),
    };
  });
  for (const s of steps) if (s.writes) for (const p of s.problems) blocks.push({ kind: "rule", sentence: `“${s.key}”: ${p.sentence}` });
  return {
    ok: true,
    plan: {
      record: "wordings", approval, steps, writes: steps.filter((s) => s.writes).map((s) => s.key),
      patch: Object.fromEntries(wordingsPostEntries(sending)), blocks, readAtMs: nowMs,
    },
  };
}

const pagesOf = (r: PolicyLinesRecord): Record<PolicyPage, string> => ({
  rg: printedPolicyVersion(POLICY_PAGES.rg.codeVersion, r["version.rg"]),
  privacy: printedPolicyVersion(POLICY_PAGES.privacy.codeVersion, r["version.privacy"]),
});

/** ⭐ A PREVIEW, from the record's own rules: the version each page would print (new words stamp today's EAT day, or its
 *  next suffix — `nextPolicyVersion`), and the opening checks over the record as it would read. The writer decides the
 *  real ones; `apply` prints those. */
function previewOf(before: PolicyLinesRecord, steps: readonly LineStep[], nowMs: number): PolicyPreview {
  const pagesNow = pagesOf(before);
  const pagesAfter = { ...pagesNow };
  for (const page of POLICY_PAGE_KEYS) {
    if (steps.some((s) => s.writes && !s.review && POLICY_LINE_SPEC[s.key].page === page)) pagesAfter[page] = nextPolicyVersion(pagesNow[page], nowMs);
  }
  const lines = Object.fromEntries(POLICY_LINE_KEYS.map((k) => [k, [...(before[k] ?? [])]])) as Record<PolicyLineKey, PolicyLineVersion[]>;
  const at = new Date(nowMs).toISOString();
  for (const s of steps) {
    if (!s.writes) continue;
    const fp = policyDefaultFingerprint(s.key);
    lines[s.key].push(s.review
      ? { rev: s.base + 1, reviewedDefault: fp, savedAt: at, savedBy: `${OPS_PREFIX}preview` }
      : { rev: s.base + 1, en: s.texts.en, sw: s.texts.sw, zh: s.texts.zh, codeDefault: fp, savedAt: at, savedBy: `${OPS_PREFIX}preview` });
  }
  const after: PolicyLinesRecord = { ...before, ...lines };
  return { pagesNow, pagesAfter, openingNow: policyOpeningProblems(before), openingAfter: policyOpeningProblems(after) };
}

async function planPolicy(approval: LinesApproval, deps: OwnerSaveDeps, nowMs: number): Promise<PlanReading> {
  const read = await safely<PolicyLinesReload>(deps.readPolicy, { ok: false });
  if (!read.ok) return { ok: false, code: "unreadable", sentence: ROW_SENTENCE.policyUnreadable };
  if (read.dropped.length > 0) return { ok: false, code: "read_in_part", sentence: ROW_SENTENCE.policyInPart(read.dropped) };
  const before = read.record;
  // ⭐ U13 · a line that makes promises (the RG line) is judged against the send window's hours AS SAVED NOW — the writer's
  // own fresh read (`policySendWindow`), never the default — and ⛔ while they cannot be read the door refuses, exactly as
  // the writer would (`window_unreadable`), before anything is recorded.
  let sendWindow: PolicySendWindow | undefined;
  if (approval.lines.some((l) => POLICY_LINE_SPEC[l.key].promises)) {
    const w = await safely<PolicySendWindowRead>(deps.readSendWindow, { ok: false });
    if (!w.ok) return { ok: false, code: "window_unreadable", sentence: ROW_SENTENCE.windowUnreadable };
    sendWindow = w.hours;
  }
  const historyOf = (k: PolicyLineKey): readonly PolicyLineVersion[] => before[k] ?? [];
  const stateOf = (k: PolicyLineKey) => policyLineState(k, historyOf(k));
  const blocks: OwnerSaveBlock[] = [];
  /* ⭐ The card's state over the row as it is NOW — every line's boxes hold what its page prints, the approved lines Ali's
     words (a review: today's words, with its tick). */
  const texts = Object.fromEntries(POLICY_LINE_KEYS.map((k) => [k, { ...stateOf(k).printed }])) as Record<PolicyLineKey, PolicyTexts>;
  const saved = Object.fromEntries(
    POLICY_LINE_KEYS.map((k) => [k, { rev: historyOf(k).length, words: stateOf(k).words, reviewedCurrent: stateOf(k).reviewedCurrent }]),
  ) as PolicyCardState["saved"];
  const review: Partial<Record<PolicyLineKey, boolean>> = {};
  for (const l of approval.lines) {
    if (l.review && stateOf(l.key).words !== null) {
      blocks.push({
        kind: "review",
        sentence: `“${l.key}” prints saved words, not today's — a review marks only today's words as read and kept. Approve its words instead.`,
      });
    }
    texts[l.key] = { ...l.texts };
    if (l.review) review[l.key] = true;
  }
  // ⛔ A review over saved words would leave the card's builder sending today's words as NEW words that replace them — so a
  // plan holding one is never built into a request at all.
  const sending: ReturnType<typeof policyLinesToSave> = blocks.length > 0 ? [] : deps.rules.policyLinesToSave({ texts, saved, review });
  for (const s of sending) {
    const l = approval.lines.find((x) => x.key === s.key);
    if (l === undefined) { blocks.push(builderBlock(`It would also send “${s.key}”, which this approval does not hold`)); continue; }
    if (s.base !== historyOf(s.key).length || s.review !== l.review || !samePolicyTexts(normalizedPolicyTexts(s.key, s.texts), l.texts)) {
      blocks.push(builderBlock(`It would send “${s.key}” with base ${s.base} and review ${s.review}, not base ${historyOf(s.key).length} and review ${l.review}, or other words`));
    }
  }
  const steps = approval.lines.map((l): LineStep => {
    const st = stateOf(l.key);
    // The hours read above for a promise line; no other line names a time the window holds.
    const verdict = deps.rules.policyLineProblems(l.key, l.texts, st.printed, sendWindow);
    return {
      key: l.key, review: l.review, texts: l.texts, asTyped: l.asTyped, sha12: l.sha12, base: historyOf(l.key).length,
      latest: st.latest, printsSaved: st.words !== null, reviewedCurrent: st.reviewedCurrent,
      writes: sending.some((s) => s.key === l.key), problems: verdict.problems, hints: verdict.hints,
    };
  });
  for (const s of steps) {
    if (!s.writes) continue;
    for (const loc of POLICY_LOCALES) for (const p of s.problems[loc]) blocks.push({ kind: "rule", sentence: `“${s.key}” (${POLICY_LOCALE_NAME[loc]}): ${p.sentence}` });
  }
  return {
    ok: true,
    plan: {
      record: "policy", approval, steps, writes: steps.filter((s) => s.writes).map((s) => s.key),
      patch: Object.fromEntries(policyLinesPostEntries(sending)), blocks, readAtMs: nowMs, before,
      preview: previewOf(before, steps, nowMs), sendWindow: sendWindow ?? null,
    },
  };
}

/** ⭐ THE PLAN for an approval, over the row as it is now — what `check` prints and `apply` carries out. */
export function planOwnerSave(approval: Approval, deps: OwnerSaveDeps, nowMs: number): Promise<PlanReading> {
  return approval.record === "wordings" ? planWordings(approval, deps, nowMs) : planPolicy(approval, deps, nowMs);
}

/* ══ WHAT THE DOOR ANSWERS ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type OwnerSaveCode =
  | "done" | "done_unconfirmed" | "nothing_to_do" | "checked" | "status" | "status_unreadable"
  | "bad_ops_text" | "no_database" | "clock_unreadable" | "bad_file" | "expect_mismatch" | "unreadable" | "read_in_part"
  | "window_unreadable" | "invalid" | "review_not_possible" | "builder_mismatch" | "record_failed" | "writer_refused"
  | "writer_failed" | "save_unconfirmed" | "read_back_mismatch";

/** What a command did: a code a test can ask for, the exit code (0 done or nothing to do · 1 refused or not confirmed ·
 *  2 not run), the lines the CLI prints, and the ids of the rows it wrote. */
export type OwnerSaveOutcome = {
  readonly code: OwnerSaveCode;
  readonly exitCode: 0 | 1 | 2;
  readonly lines: readonly string[];
  readonly records: { readonly applying: string | null; readonly ending: string | null; readonly admin: string | null };
};

const NO_RECORDS: OwnerSaveOutcome["records"] = Object.freeze({ applying: null, ending: null, admin: null });

const outcome = (
  code: OwnerSaveCode, exitCode: 0 | 1 | 2, lines: readonly string[], records: OwnerSaveOutcome["records"] = NO_RECORDS,
): OwnerSaveOutcome => ({ code, exitCode, lines, records });

/** The door's sentences (English console copy, for the operator and for Ali). */
export const OWNER_SAVE_SENTENCE = Object.freeze({
  badOpsText:
    "Say who and why in plain words of at most 120 characters each, with no more than six digits across the two — so no phone number, and no date: the day Ali approved goes in the file's “approvedOn”.",
  noDatabase: "there is no DATABASE_URL, so nothing can be read or saved — run it through `railway run --service 50pick` (see the door's header).",
  clockUnreadable: "The database's clock couldn't be read, so nothing was saved — run it again.",
  badFile: "The approval file can't be carried out as it stands, so nothing was saved:",
  expect: "--expect does not name the texts in this file, so nothing was saved. Run check, show Ali the words it prints, and pass the digests it prints:",
  blocked: "Nothing was saved — each problem below is in the card's own words:",
  nothingToDo: "every text in the file already reads exactly that way, so nothing was written and nothing was recorded.",
  recordFailed: "The record of Ali's approval couldn't be written, so nothing was saved. Run it again; if it repeats, tell the developer.",
  writerRefused: "The writer refused the save, so nothing was written:",
  writerFailed: "The writer failed before it answered, so whether anything was written is not known — run status to see the row, and tell the developer at once:",
  /** ⛔ `not_saved` is the factory's answer when its read-back after a COMMITTED save fails, as well as before a write — so
   *  it is never "nothing was written". The row, read fresh, did not show this door's write either. */
  saveUnconfirmed:
    "The writer could not confirm its save, and the row does not read back as Ali's words saved by this door — so whether anything was written is not known. Run status to see the row, and tell the developer at once. The writer said:",
  /** The same answer over a write that DID land — the fresh read shows every version this door wrote, at this instant. */
  saveLanded: (error: string): string =>
    `  · the writer answered “${error}” (not_saved), but a fresh read shows every version saved by this door at this instant — the save landed, and the factory never wrote its ADMIN row.`,
  readBack: "The writer reported the save, but the row does not read back as Ali's approval — tell the developer at once:",
  unconfirmed: "Saved, but its audit row was not confirmed — tell the developer.",
  redeploy:
    "⚠️ Production's container still holds its cached copy — run `railway redeploy --service 50pick` once, after the LAST apply (it re-runs the current build; about 60 s of overlap), then read back: the public pages over HTTP (twice — the first request to the new container can still print the old words while it loads), and the wordings with status.",
  draftsKeepNone: "Drafts saved before this line carry none until they are saved again in the composer; a confirmed campaign keeps the line it was confirmed with.",
});

const blockCode = (blocks: readonly OwnerSaveBlock[]): OwnerSaveCode =>
  blocks.some((b) => b.kind === "builder") ? "builder_mismatch" : blocks.some((b) => b.kind === "review") ? "review_not_possible" : "invalid";

/** An instant in EAT, to the second — "2026-10-07 14:30:05 EAT" — or the stored text itself when it is not an instant. */
export function eatStamp(at: string | number): string {
  const ms = typeof at === "number" ? at : Date.parse(at);
  if (!Number.isFinite(ms)) return String(at);
  const s = new Date(ms + EAT_OFFSET_MS).toISOString();
  return `${s.slice(0, 10)} ${s.slice(11, 19)} EAT`;
}

const nbspNote = (t: string): string => {
  const n = t.split(NBSP).length - 1;
  return n > 0 ? `, ${n} no-break space${n === 1 ? "" : "s"}` : "";
};

/** How long a wording is, by its own rule: septets as printed for the source line, characters for the rest. */
function wordingLength(key: WordingKey, text: string): string {
  if (key === "source.phrase") {
    return encodingFor(text) === "GSM7"
      ? `${unitsIn(text, "GSM7")} septets as printed, at most ${SOURCE_PHRASE_MAX_CHARS}`
      : `${charCount(text)} characters, not all in the GSM alphabet`;
  }
  const r = WORDING_RULE[key];
  return `${charCount(text)} characters${r.min !== null && r.max !== null ? `, ${r.min}–${r.max}` : ""}`;
}

const checksOf = (c: readonly string[]): string => (c.length === 0 ? "all pass" : c.join(", "));

/** ⭐ The exact apply line for a plan — the digests of EVERY text in the file, in the card's order. */
export function applyCommandOf(plan: OwnerSavePlan, filePath: string): string {
  const digests = approvalDigests(plan.approval).map((d) => `${d.key}=${d.sha12}`).join(",");
  return `railway run --service 50pick npm run ops:marketing-owner-save -- apply --file "${filePath}" --by "Claude for Ali (${plan.approval.gate})" --reason "approved by Ali in the Claude session" --expect "${digests}"`;
}

function wordingCheckLines(s: WordingStep): string[] {
  const out: string[] = [];
  const was = s.newest === null
    ? `never saved — saving it is its approval (approve.${s.key}=1)`
    : `saved as version ${s.newest.v} at ${eatStamp(s.newest.savedAt)} by ${s.newest.savedBy}`;
  out.push(`  ${s.key} · ${was} · base ${s.base} · sha12 ${s.sha12}`);
  out.push(`    ${wordingLength(s.key, s.text)}: ${s.text}`);
  if (s.asTyped !== s.text) out.push("    (normalised as it will be stored: the file's spacing or invisible characters differ from it)");
  if (s.problems.length === 0) out.push("    ✓ passes the card's rules");
  for (const p of s.problems) out.push(`    ✗ ${p.sentence}`);
  out.push(s.writes ? `    → saves version ${s.base + 1}` : "    → already reads exactly that way — nothing to write");
  return out;
}

function lineCheckLines(s: LineStep): string[] {
  const out: string[] = [];
  const was = s.latest === null
    ? "never saved — the page prints today's words"
    : isReviewVersion(s.latest) ? `revision ${s.latest.rev}: today's words, marked reviewed` : `revision ${s.latest.rev}: saved words`;
  const kind = s.review ? "REVIEW — today's words, read and kept; no text is stored" : "WORDS";
  out.push(`  ${s.key} · ${kind} · ${was} · base ${s.base} · sha12 ${s.sha12}`);
  for (const l of POLICY_LOCALES) {
    const t = s.texts[l];
    out.push(`    ${l} (${charCount(t)} characters${nbspNote(t)}): ${t}`);
    for (const p of s.problems[l]) out.push(`      ✗ ${p.sentence}`);
  }
  if (s.asTyped !== null && !samePolicyTexts(s.asTyped, s.texts)) {
    out.push("    (normalised as it will be stored: spacing, Chinese spacing or the number rule changed the file's words)");
  }
  for (const h of s.hints) out.push(`    note: ${h}`);
  if (POLICY_LOCALES.every((l) => s.problems[l].length === 0)) out.push("    ✓ passes the card's rules");
  if (s.writes) out.push(`    → saves revision ${s.base + 1}${s.review ? " (a review marker; the page's version does not move)" : ""}`);
  else if (s.review) out.push("    → today's words are already marked reviewed — nothing to write");
  else out.push(`    → already reads exactly that way — nothing to write${s.printsSaved ? "" : " (the page prints these words today; to record that they were read and kept, approve review instead)"}`);
  return out;
}

function previewLines(plan: LinesPlan): string[] {
  const p = plan.preview;
  const page = (k: PolicyPage): string =>
    `${POLICY_PAGES[k].title} ${p.pagesNow[k]}${p.pagesAfter[k] !== p.pagesNow[k] ? ` → ${p.pagesAfter[k]}` : " (unchanged)"}`;
  return [
    ...(plan.sendWindow !== null ? [`  the send window as saved now — every time the RG line names is held to it: ${formatWindow(plan.sendWindow)}`] : []),
    `  the pages' versions, if applied today (EAT): ${page("rg")} · ${page("privacy")}`,
    `  licence outreach, the public texts' opening checks: now ${checksOf(p.openingNow)} → after: ${checksOf(p.openingAfter)}`,
  ];
}

/* ══ STATUS ══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

function wordingsStatusLines(read: WordingsReload): string[] {
  if (!read.ok) return [`Marketing wordings (${MARKETING_WORDINGS_KEY}) — ⚠️ couldn't be read just now.`];
  const state = read.dropped.length > 0
    ? `⚠️ read only in part: ${read.dropped.join(", ")} could not be read`
    : read.stored ? "read in full" : "no row stored yet";
  const out = [`Marketing wordings (${MARKETING_WORDINGS_KEY}) — ${state}`];
  for (const key of WORDING_KEYS) {
    const list: readonly WordingVersion[] = read.histories[key] ?? [];
    const n = list.length > 0 ? list[list.length - 1] : null;
    out.push(n === null
      ? `  ${key.padEnd(22)} not saved`
      : `  ${key.padEnd(22)} v${n.v} · saved ${eatStamp(n.savedAt)} by ${n.savedBy} · sha12 ${sha12Of(n.text)}${n.text === "" ? " · blank" : ""}`);
  }
  return out;
}

function policyStatusLines(read: PolicyLinesReload): string[] {
  if (!read.ok) return [`Public policy lines (${POLICY_LINES_KEY}) — ⚠️ couldn't be read just now.`];
  const state = read.dropped.length > 0
    ? `⚠️ read only in part: ${read.dropped.join(", ")} could not be read`
    : read.stored ? "read in full" : "no row stored yet";
  const out = [`Public policy lines (${POLICY_LINES_KEY}) — ${state}`];
  for (const key of POLICY_LINE_KEYS) {
    const list: readonly PolicyLineVersion[] = read.record[key] ?? [];
    const latest = list.length > 0 ? list[list.length - 1] : null;
    if (latest === null) {
      out.push(`  ${key.padEnd(22)} not saved — ${POLICY_LINE_SPEC[key].clearable ? "nothing is printed" : "the page prints today's words"}`);
    } else if (isReviewVersion(latest)) {
      const current = latest.reviewedDefault === policyDefaultFingerprint(key) ? "" : " · ⚠️ the code's words changed since";
      out.push(`  ${key.padEnd(22)} revision ${latest.rev} · today's words marked reviewed at ${eatStamp(latest.savedAt)} by ${latest.savedBy}${current}`);
    } else {
      const sha = lineSha12({ en: latest.en, sw: latest.sw, zh: latest.zh }, false);
      out.push(`  ${key.padEnd(22)} revision ${latest.rev} · words saved at ${eatStamp(latest.savedAt)} by ${latest.savedBy} · sha12 ${sha}`);
    }
  }
  const pages = pagesOf(read.record);
  out.push(`  the pages print: ${POLICY_PAGE_KEYS.map((p) => `${POLICY_PAGES[p].title} ${pages[p]} (code ${POLICY_PAGES[p].codeVersion})`).join(" · ")}`);
  const checks = policyOpeningProblems(read.record);
  out.push(checks.length === 0
    ? "  licence outreach, the public texts' opening checks: all pass"
    : `  licence outreach, the public texts' opening checks failing: ${checks.map((c) => `${c} — ${OUTREACH_CHECK_SENTENCE[c]}`).join(" | ")}`);
  return out;
}

/** ⭐ STATUS — read-only: every key of both records as the ROW holds it now, saved or not, with its version, its instant in
 *  EAT, its author and the digest of its newest text; the pages' versions and the opening checks. Exit 1 when either row
 *  could not be read, or was read only in part. */
export async function ownerSaveStatus(deps: OwnerSaveDeps): Promise<OwnerSaveOutcome> {
  if (!deps.hasDatabase()) return outcome("no_database", 2, [`REFUSING: ${OWNER_SAVE_SENTENCE.noDatabase}`]);
  const nowMs = await dbNow(deps);
  const w = await safely<WordingsReload>(deps.readWordings, { ok: false });
  const p = await safely<PolicyLinesReload>(deps.readPolicy, { ok: false });
  const lines = [
    `STATUS — read at ${nowMs === null ? "an unknown time (the database's clock couldn't be read)" : `${eatStamp(nowMs)} (the database's clock)`}`,
    ...wordingsStatusLines(w),
    ...policyStatusLines(p),
  ];
  const whole = w.ok && w.dropped.length === 0 && p.ok && p.dropped.length === 0;
  return outcome(whole ? "status" : "status_unreadable", whole ? 0 : 1, lines);
}

/* ══ CHECK ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

function checkLines(plan: OwnerSavePlan, notes: readonly string[], filePath: string): string[] {
  const a = plan.approval;
  const out: string[] = [
    `CHECK · ${a.gate} (${GATE_WHAT[a.gate]}) · approved by ${APPROVED_BY} on ${a.approvedOn} in ${APPROVED_IN} · the row read at ${eatStamp(plan.readAtMs)} (the database's clock)`,
  ];
  for (const n of notes) out.push(`  note: ${n}`);
  if (plan.record === "wordings") {
    for (const s of plan.steps) out.push(...wordingCheckLines(s));
  } else {
    for (const s of plan.steps) out.push(...lineCheckLines(s));
    out.push(...previewLines(plan));
  }
  if (plan.blocks.length > 0) {
    out.push(`REFUSED (${blockCode(plan.blocks)}) — ${plan.blocks.length} problem${plan.blocks.length === 1 ? "" : "s"}; nothing can be applied until each is fixed:`);
    for (const b of plan.blocks) out.push(`  · ${b.sentence}`);
    return out;
  }
  if (plan.writes.length === 0) {
    out.push(`NOTHING TO DO — ${OWNER_SAVE_SENTENCE.nothingToDo}`);
    return out;
  }
  out.push(`It would save ${plan.writes.length} of ${a.record === "wordings" ? a.wordings.length : a.lines.length}: ${plan.writes.join(", ")}. Show Ali the words above, exactly; then — while nobody is saving these cards on Admin → System — apply with:`);
  out.push(`  ${applyCommandOf(plan, filePath)}`);
  return out;
}

/** ⭐ CHECK — writes nothing: the approval file read as evidence, the row as it is now, and for every key the words exactly
 *  as they would be stored, their length, their digest, the base, the approval or review flag and the card's own problems
 *  and notes — for G10 the pages' versions and the opening checks before and after — and the exact apply line. */
export async function checkOwnerSave(input: { readonly fileBytes: Uint8Array; readonly filePath: string }, deps: OwnerSaveDeps): Promise<OwnerSaveOutcome> {
  if (!deps.hasDatabase()) return outcome("no_database", 2, [`REFUSING: ${OWNER_SAVE_SENTENCE.noDatabase}`]);
  const nowMs = await dbNow(deps);
  if (nowMs === null) return outcome("clock_unreadable", 1, [`REFUSED (clock_unreadable): ${OWNER_SAVE_SENTENCE.clockUnreadable}`]);
  const reading = deps.rules.readApproval(input.fileBytes, nowMs);
  if (!reading.ok) return outcome("bad_file", 1, [`REFUSED (bad_file): ${OWNER_SAVE_SENTENCE.badFile}`, ...reading.problems.map((p) => `  · ${p}`)]);
  const planned = await planOwnerSave(reading.approval, deps, nowMs);
  if (!planned.ok) return outcome(planned.code, 1, [`REFUSED (${planned.code}): ${planned.sentence}`]);
  const plan = planned.plan;
  const lines = checkLines(plan, reading.notes, input.filePath);
  if (plan.blocks.length > 0) return outcome(blockCode(plan.blocks), 1, lines);
  return outcome(plan.writes.length === 0 ? "nothing_to_do" : "checked", 0, lines);
}

/* ══ APPLY ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

type AuditEntryIn = Parameters<typeof audit>[0];

/** Whether an awaited audit call left its row, and the row's id: a stand-in that throws, or a result without
 *  `recorded: true`, did not (the live switch door's rule). */
async function recordOf(deps: OwnerSaveDeps, entry: AuditEntryIn): Promise<{ readonly recorded: boolean; readonly id: string | null }> {
  try {
    const r = await deps.audit(entry);
    if (r !== null && typeof r === "object" && (r as { recorded?: unknown }).recorded === true) {
      const id = (r as { id?: unknown }).id;
      return { recorded: true, id: typeof id === "string" ? id : null };
    }
    return { recorded: false, id: null };
  } catch {
    return { recorded: false, id: null };
  }
}

async function settle(deps: OwnerSaveDeps): Promise<void> {
  try { await deps.flush(); } catch { /* what is left is counted by `pending` */ }
}

function pendingNow(deps: OwnerSaveDeps): number {
  try { return deps.pending(); } catch { return Number.POSITIVE_INFINITY; }
}

const isObject = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === "object" && !Array.isArray(x);
const sameSet = (a: readonly string[], b: readonly string[]): boolean => [...a].sort().join("|") === [...b].sort().join("|");

/**
 * ⛔ THE FACTORY'S ADMIN ROW, READ BACK DURABLY — the newest row of the record's audit target that is THIS save's: its
 * action, its author `ops: <by>`, `changes` naming exactly the keys this save moved, and each written key's newest version
 * in `after` stamped with this save's instant and author. Its id, or null.
 */
async function adminRowOf(
  deps: OwnerSaveDeps, kind: { readonly action: string; readonly targetType: string }, officer: string, nowIso: string,
  written: readonly string[], moved: readonly string[],
): Promise<string | null> {
  let rows: readonly DoorAuditRow[];
  try { rows = (await deps.adminRows(kind.targetType, "global")).entries; } catch { return null; }
  for (const row of rows) {
    if (row.action !== kind.action || row.actorId !== officer) continue;
    const changes = row.payload?.changes;
    const after = row.payload?.after;
    if (!isObject(changes) || !isObject(after) || !sameSet(Object.keys(changes), moved)) continue;
    const ours = written.every((k) => {
      const list = after[k];
      const last: unknown = Array.isArray(list) && list.length > 0 ? list[list.length - 1] : null;
      return isObject(last) && last.savedAt === nowIso && last.savedBy === officer;
    });
    if (ours) return row.id;
  }
  return null;
}

function wordingsReadBackProblems(plan: WordingsPlan, h: WordingHistories, officer: string, nowIso: string): string[] {
  const out: string[] = [];
  for (const s of plan.steps) {
    if (!s.writes) continue;
    const list: readonly WordingVersion[] = h[s.key] ?? [];
    const v = s.base < list.length ? list[s.base] : null;
    if (v === null) { out.push(`“${s.key}”: version ${s.base + 1} is not in the row`); continue; }
    if (v.v !== s.base + 1 || v.text !== s.text || v.savedBy !== officer || v.savedAt !== nowIso) {
      out.push(`“${s.key}”: version ${s.base + 1} is not Ali's words saved by this door (it reads sha12 ${sha12Of(v.text)}, by ${v.savedBy} at ${v.savedAt})`);
    }
  }
  return out;
}

/** Every written line's new revision as this door's save of Ali's words — and, when the writer reported the page versions
 *  (`versions`; a `not_saved` answer reports none), each page printing exactly that. */
function linesReadBackProblems(plan: LinesPlan, r: PolicyLinesRecord, officer: string, nowIso: string, versions: Readonly<Record<PolicyPage, string>> | null): string[] {
  const out: string[] = [];
  for (const s of plan.steps) {
    if (!s.writes) continue;
    const list: readonly PolicyLineVersion[] = r[s.key] ?? [];
    const v = s.base < list.length ? list[s.base] : null;
    if (v === null) { out.push(`“${s.key}”: revision ${s.base + 1} is not in the row`); continue; }
    if (v.rev !== s.base + 1 || v.savedBy !== officer || v.savedAt !== nowIso) {
      out.push(`“${s.key}”: revision ${s.base + 1} is not this door's save (by ${v.savedBy} at ${v.savedAt})`);
      continue;
    }
    const fp = policyDefaultFingerprint(s.key);
    if (s.review) {
      if (!isReviewVersion(v) || v.reviewedDefault !== fp) out.push(`“${s.key}”: revision ${s.base + 1} is not the review of today's words`);
    } else if (isReviewVersion(v) || !samePolicyTexts({ en: v.en, sw: v.sw, zh: v.zh }, s.texts)) {
      out.push(`“${s.key}”: revision ${s.base + 1} does not hold Ali's words`);
    }
  }
  if (versions === null) return out;
  const pages = pagesOf(r);
  for (const page of POLICY_PAGE_KEYS) {
    if (pages[page] !== versions[page]) out.push(`the ${POLICY_PAGES[page].title} prints ${pages[page]}, not ${versions[page]} as the writer reported`);
  }
  return out;
}

/** The record of Ali's approval — every row the door writes carries it. The words themselves are not copied: the
 *  factory's ADMIN row holds them, before and after. */
function storyOf(plan: OwnerSavePlan, by: string, why: string): Record<string, unknown> {
  const steps: ReadonlyArray<{ readonly key: string; readonly sha12: string; readonly base: number; readonly writes: boolean }> = plan.steps;
  return {
    via: "ops",
    gate: plan.approval.gate,
    keys: [...plan.writes],
    unchanged: steps.filter((s) => !s.writes).map((s) => s.key),
    sha: Object.fromEntries(steps.map((s) => [s.key, s.sha12])),
    bases: Object.fromEntries(steps.filter((s) => s.writes).map((s) => [s.key, s.base])),
    ...(plan.record === "policy" ? { review: plan.steps.filter((s) => s.writes && s.review).map((s) => s.key) } : {}),
    by,
    reason: why,
    approvedBy: APPROVED_BY,
    approvedIn: APPROVED_IN,
    approvedOn: plan.approval.approvedOn,
  };
}

export type ApplyInput = {
  readonly fileBytes: Uint8Array;
  readonly by: unknown;
  readonly reason: unknown;
  readonly expect: unknown;
};

/**
 * ⛔ APPLY — in this order, and every refusal before the record writes nothing at all:
 *   1 · `by` and `reason` screened (`screenOpsText`, and six numerals across the two) → bad_ops_text;
 *   2 · a database → no_database (exit 2);
 *   3 · the database's clock, for the approval's date → clock_unreadable;
 *   4 · the approval file, read as evidence → bad_file;
 *   5 · `--expect` names every text's digest → expect_mismatch;
 *   6 · the row as it is now → unreadable / read_in_part; for the RG line, the send window's hours as saved now →
 *       window_unreadable (U13);
 *   7 · the record's own rules (the card's words), a review over saved words, the card's own request → invalid /
 *       review_not_possible / builder_mismatch;
 *   8 · every text already reads that way → NOTHING TO DO (exit 0, nothing written, nothing recorded);
 *   9 · ⛔ RECORD FIRST — `marketing.owner_save_applying`, awaited; not recorded → record_failed, nothing written;
 *  10 · the database's instant, read again for the write → clock_unreadable, recorded `_refused`;
 *  11 · THE SAME WRITER, the card's own request, `ops: <by>`, that instant → writer_refused, recorded `_refused` in the
 *       writer's own words, for every refusal it answers before its write; a writer that throws → writer_failed, recorded
 *       `_failed` (whether it wrote is not known);
 *  12 · the row read back FRESH: every written key's new version is Ali's words, this door's, this instant → otherwise
 *       read_back_mismatch, recorded `_failed`. ⛔ After `not_saved` the same read decides: found → on, never confirmed;
 *       not found → save_unconfirmed, recorded `_failed` (the outcome unknown — run status);
 *  13 · the queue flushed and the factory's ADMIN row read back durably; `marketing.owner_save_applied` recorded; the queue
 *       flushed again with nothing pending → DONE, or done_unconfirmed (exit 1, "Saved, but its audit row was not
 *       confirmed — tell the developer.") when any of the three is missing, or the writer's answer was `not_saved`.
 */
export async function applyOwnerSave(input: ApplyInput, deps: OwnerSaveDeps): Promise<OwnerSaveOutcome> {
  const by = screenOpsText(input.by);
  const why = screenOpsText(input.reason);
  if (by === null || why === null || numeralsIn(by) + numeralsIn(why) > MAX_OPS_NUMERALS) {
    return outcome("bad_ops_text", 1, [`REFUSED (bad_ops_text): ${OWNER_SAVE_SENTENCE.badOpsText}`]);
  }
  if (!deps.hasDatabase()) return outcome("no_database", 2, [`REFUSING: ${OWNER_SAVE_SENTENCE.noDatabase}`]);
  const nowMs = await dbNow(deps);
  if (nowMs === null) return outcome("clock_unreadable", 1, [`REFUSED (clock_unreadable): ${OWNER_SAVE_SENTENCE.clockUnreadable}`]);
  const reading = deps.rules.readApproval(input.fileBytes, nowMs);
  if (!reading.ok) return outcome("bad_file", 1, [`REFUSED (bad_file): ${OWNER_SAVE_SENTENCE.badFile}`, ...reading.problems.map((p) => `  · ${p}`)]);
  const expect = readExpect(input.expect);
  const wrong = expect.ok ? expectProblems(reading.approval, expect.pairs) : [expect.problem];
  if (wrong.length > 0) return outcome("expect_mismatch", 1, [`REFUSED (expect_mismatch): ${OWNER_SAVE_SENTENCE.expect}`, ...wrong.map((p) => `  · ${p}`)]);
  const planned = await planOwnerSave(reading.approval, deps, nowMs);
  if (!planned.ok) return outcome(planned.code, 1, [`REFUSED (${planned.code}): ${planned.sentence}`]);
  const plan = planned.plan;
  if (plan.blocks.length > 0) {
    const code = blockCode(plan.blocks);
    return outcome(code, 1, [`REFUSED (${code}): ${OWNER_SAVE_SENTENCE.blocked}`, ...plan.blocks.map((b) => `  · ${b.sentence}`)]);
  }
  if (plan.writes.length === 0) return outcome("nothing_to_do", 0, [`NOTHING TO DO — ${OWNER_SAVE_SENTENCE.nothingToDo}`]);

  // ⛔ RECORD FIRST — Ali's approval is on the chain before the writer runs. Not recorded: nothing is written at all.
  const officer = `${OPS_PREFIX}${by}`;
  const configKey = plan.record === "wordings" ? MARKETING_WORDINGS_KEY : POLICY_LINES_KEY;
  const base = { category: "COMPLIANCE" as const, actorId: null, targetType: "SystemConfig", targetId: configKey };
  const story = storyOf(plan, by, why);
  const applying = await recordOf(deps, { ...base, action: OWNER_SAVE_ACTIONS.applying, payload: story });
  if (!applying.recorded) return outcome("record_failed", 1, [`REFUSED (record_failed): ${OWNER_SAVE_SENTENCE.recordFailed}`]);

  /** ⭐ Every ending after the record is recorded too, awaited — what was FOUND: `refused` (nothing was written: the
   *  writer's own reason, sentence and per-key problems, verbatim) or `failed` (what the row holds is not known, or is not
   *  Ali's words). ⛔ The writer's code goes in `refusal`: the payload's `reason` is the operator's, and stays his. */
  const ended = async (
    kind: "refused" | "failed", code: OwnerSaveCode, step: "clock" | "writer" | "read_back", details: Record<string, unknown>,
    lines: readonly string[],
  ): Promise<OwnerSaveOutcome> => {
    const ending = await recordOf(deps, { ...base, action: OWNER_SAVE_ACTIONS[kind], payload: { ...story, step, ...details } });
    await settle(deps);
    const tail = ending.recorded
      ? `  records: COMPLIANCE ${applying.id ?? "?"} (applying) · ${ending.id ?? "?"} (${kind})`
      : `  ⚠️ its ending could not be recorded — tell the developer (the applying record ${applying.id ?? "?"} names the attempt).`;
    return outcome(code, 1, [...lines, tail], { applying: applying.id, ending: ending.recorded ? ending.id : null, admin: null });
  };
  const threw = (err: unknown): Promise<OwnerSaveOutcome> => {
    const error = String((err as Error)?.message ?? err);
    return ended("failed", "writer_failed", "writer", { outcome: "unknown", error }, [`FAILED (writer_failed): ${OWNER_SAVE_SENTENCE.writerFailed} ${error}`]);
  };
  /** ⛔ `not_saved` over a row that does not read back as this door's write: the outcome is UNKNOWN (the write may have
   *  committed, or may yet show) — recorded `_failed`, never `_refused`, and the operator is sent to `status`. */
  const unconfirmedSave = (error: string, found: readonly string[]): Promise<OwnerSaveOutcome> =>
    ended("failed", "save_unconfirmed", "writer", { refusal: "not_saved", error, outcome: "unknown", found: [...found] },
      [`FAILED (save_unconfirmed): ${OWNER_SAVE_SENTENCE.saveUnconfirmed} ${error}`, ...found.map((p) => `  · ${p}`)]);

  const atMs = await dbNow(deps);
  if (atMs === null) {
    return ended("refused", "clock_unreadable", "clock", { refusal: "clock_unreadable", error: OWNER_SAVE_SENTENCE.clockUnreadable },
      [`REFUSED (clock_unreadable): ${OWNER_SAVE_SENTENCE.clockUnreadable}`]);
  }
  const nowIso = new Date(atMs).toISOString();

  /** The keys the writer wrote, the keys the factory's ADMIN row must name as changed (G10: the page stamps too), and the
   *  lines whose printed words moved. */
  let written: readonly string[];
  let adminKeys: readonly string[];
  let movedLines: readonly string[];
  let versionLines: string[];
  let pageLine: string | null = null;
  let pageVersions: Readonly<Record<PolicyPage, string>> | null = null;
  let adminKind: { readonly action: string; readonly targetType: string };
  /** ⛔ The writer's `not_saved`, over a write the fresh read shows LANDED: the save goes down the applied path and is
   *  never confirmed — the factory wrote no ADMIN row, and the writer's own answer was not "saved". */
  let writerSaid: { readonly refusal: string; readonly error: string } | null = null;
  if (plan.record === "wordings") {
    adminKind = MARKETING_WORDINGS_AUDIT;
    let res: WordingsSaveResult;
    try {
      res = await deps.saveWordings(plan.patch, officer, nowIso);
    } catch (err) {
      return threw(err);
    }
    // ⛔ Every refusal but `not_saved` is answered BEFORE the write: nothing was written, said in the writer's own words.
    if (!res.ok && res.reason !== "not_saved") {
      const refused = res;
      const per = WORDING_KEYS.flatMap((k) => (refused.problems[k] ?? []).map((p) => `  · “${k}”: ${p.sentence}`));
      return ended("refused", "writer_refused", "writer", { refusal: refused.reason, error: refused.error, problems: refused.problems },
        [`REFUSED (writer_refused): ${OWNER_SAVE_SENTENCE.writerRefused} ${refused.error}`, ...per]);
    }
    if (res.ok && !sameSet(res.changed, plan.writes)) {
      return ended("failed", "read_back_mismatch", "writer", { found: ["the writer saved other wordings than the approval's"], changed: [...res.changed] },
        [`FAILED (read_back_mismatch): ${OWNER_SAVE_SENTENCE.readBack} the writer saved [${res.changed.join(", ")}], not [${plan.writes.join(", ")}].`]);
    }
    // ⭐ THE ROW, READ FRESH, DECIDES — after a save, and after a `not_saved`, which `define-config.ts`'s verified write also
    // answers when its read-back fails AFTER a committed save (and before its ADMIN row): never the answer alone.
    const back = await safely<WordingsReload>(deps.readWordings, { ok: false });
    const problems = back.ok ? wordingsReadBackProblems(plan, back.histories, officer, nowIso) : ["the row couldn't be read back"];
    if (!res.ok) {
      if (problems.length > 0) return unconfirmedSave(res.error, problems);
      writerSaid = { refusal: res.reason, error: res.error };
    } else if (problems.length > 0) {
      return ended("failed", "read_back_mismatch", "read_back", { found: problems },
        [`FAILED (read_back_mismatch): ${OWNER_SAVE_SENTENCE.readBack}`, ...problems.map((p) => `  · ${p}`)]);
    }
    written = plan.writes;
    adminKeys = plan.writes;
    movedLines = plan.writes;
    versionLines = plan.steps.filter((s) => s.writes).map((s) => `  ${s.key} · version ${s.base + 1} saved ${eatStamp(nowIso)} by ${officer} · sha12 ${s.sha12}`);
  } else {
    adminKind = POLICY_LINES_AUDIT;
    let res: PolicyLinesSaveResult;
    try {
      res = await deps.savePolicy(plan.patch, officer, nowIso);
    } catch (err) {
      return threw(err);
    }
    // ⛔ Every refusal but `not_saved` is answered BEFORE the write: nothing was written, said in the writer's own words.
    if (!res.ok && res.reason !== "not_saved") {
      const refused = res;
      const per: string[] = [];
      for (const k of POLICY_LINE_KEYS) {
        const found = refused.problems[k];
        if (!found) continue;
        for (const l of POLICY_LOCALES) for (const p of found[l]) per.push(`  · “${k}” (${POLICY_LOCALE_NAME[l]}): ${p.sentence}`);
      }
      return ended("refused", "writer_refused", "writer", { refusal: refused.reason, error: refused.error, problems: refused.problems },
        [`REFUSED (writer_refused): ${OWNER_SAVE_SENTENCE.writerRefused} ${refused.error}`, ...per]);
    }
    if (res.ok && !sameSet(res.changed, plan.writes)) {
      return ended("failed", "read_back_mismatch", "writer", { found: ["the writer saved other lines than the approval's"], changed: [...res.changed] },
        [`FAILED (read_back_mismatch): ${OWNER_SAVE_SENTENCE.readBack} the writer saved [${res.changed.join(", ")}], not [${plan.writes.join(", ")}].`]);
    }
    // ⭐ THE ROW, READ FRESH, DECIDES — after a save, and after a `not_saved` (see the wordings branch above).
    const back = await safely<PolicyLinesReload>(deps.readPolicy, { ok: false });
    if (!back.ok) {
      const unread = ["the row couldn't be read back"];
      return res.ok
        ? ended("failed", "read_back_mismatch", "read_back", { found: unread }, [`FAILED (read_back_mismatch): ${OWNER_SAVE_SENTENCE.readBack}`, ...unread.map((p) => `  · ${p}`)])
        : unconfirmedSave(res.error, unread);
    }
    const problems = linesReadBackProblems(plan, back.record, officer, nowIso, res.ok ? res.versions : null);
    if (problems.length > 0) {
      return res.ok
        ? ended("failed", "read_back_mismatch", "read_back", { found: problems }, [`FAILED (read_back_mismatch): ${OWNER_SAVE_SENTENCE.readBack}`, ...problems.map((p) => `  · ${p}`)])
        : unconfirmedSave(res.error, problems);
    }
    if (!res.ok) writerSaid = { refusal: res.reason, error: res.error };
    /* The lines whose printed words moved — the writer's own answer, or, after a `not_saved` whose write landed, every line
       this door wrote with words (a review moves none) — and the page stamps they moved, which the ADMIN row's `changes`
       names beside the lines. The versions the pages print: the writer's answer, or the fresh read. */
    const moved: readonly PolicyLineKey[] = res.ok ? res.moved : plan.steps.filter((s) => s.writes && !s.review).map((s) => s.key);
    const stamped = POLICY_PAGE_KEYS.filter((page) => moved.some((k) => POLICY_LINE_SPEC[k].page === page)).map((page) => POLICY_PAGES[page].versionKey);
    const versions: Readonly<Record<PolicyPage, string>> = res.ok ? res.versions : pagesOf(back.record);
    written = plan.writes;
    adminKeys = [...plan.writes, ...stamped];
    movedLines = [...moved];
    pageVersions = versions;
    versionLines = plan.steps.filter((s) => s.writes).map((s) => `  ${s.key} · revision ${s.base + 1}${s.review ? " (today's words, reviewed)" : ""} saved ${eatStamp(nowIso)} by ${officer} · sha12 ${s.sha12}`);
    const checks = policyOpeningProblems(back.record);
    pageLine = `  the pages print now: ${POLICY_PAGE_KEYS.map((p) => `${POLICY_PAGES[p].title} ${versions[p]}`).join(" · ")} · licence outreach, the public texts' opening checks: ${checksOf(checks)}`;
  }

  // ⛔ The factory's ADMIN row is fire-and-forget: flushed, then read back DURABLY and matched to THIS save.
  await settle(deps);
  const admin = await adminRowOf(deps, adminKind, officer, nowIso, written, adminKeys);
  const applied = await recordOf(deps, {
    ...base,
    action: OWNER_SAVE_ACTIONS.applied,
    payload: {
      ...story,
      savedAt: nowIso,
      changed: [...written],
      moved: [...movedLines],
      versions: Object.fromEntries((plan.steps as ReadonlyArray<{ readonly key: string; readonly base: number; readonly writes: boolean }>).filter((s) => s.writes).map((s) => [s.key, s.base + 1])),
      ...(pageVersions !== null ? { pageVersions } : {}),
      ...(writerSaid !== null ? { writerSaid } : {}),
      adminRow: admin,
    },
  });
  await settle(deps);
  const pending = pendingNow(deps);
  // ⛔ DONE needs all four: the ADMIN row found, the ending recorded, nothing left pending — and the writer's own "saved".
  const confirmed = admin !== null && applied.recorded && pending === 0 && writerSaid === null;
  const unchanged = (plan.steps as ReadonlyArray<{ readonly key: string; readonly writes: boolean }>).filter((s) => !s.writes).map((s) => s.key);
  const lines: string[] = [
    `DONE — ${plan.approval.gate} (${GATE_WHAT[plan.approval.gate]}) saved through the ops door, on ${APPROVED_BY}'s approval of ${plan.approval.approvedOn} in ${APPROVED_IN}.`,
    ...versionLines,
    ...(unchanged.length > 0 ? [`  unchanged (already read exactly that way): ${unchanged.join(", ")}`] : []),
    ...(pageLine !== null ? [pageLine] : []),
    `  records: COMPLIANCE ${applying.id ?? "?"} (applying) · ${applied.recorded ? (applied.id ?? "?") : "NOT RECORDED"} (applied) · ADMIN ${adminKind.action} ${admin ?? "NOT CONFIRMED"}`,
  ];
  if (!confirmed) {
    lines.push(`⚠️ ${OWNER_SAVE_SENTENCE.unconfirmed}`);
    if (writerSaid !== null) lines.push(OWNER_SAVE_SENTENCE.saveLanded(writerSaid.error));
    if (admin === null) lines.push("  · the factory's ADMIN row for this save was not found in the audit log.");
    if (!applied.recorded) lines.push("  · the record of the save's ending (marketing.owner_save_applied) was not written.");
    if (pending !== 0) lines.push(`  · ${Number.isFinite(pending) ? pending : "an unknown number of"} audit row(s) were still waiting to be written.`);
  }
  if (plan.approval.gate === "G5") lines.push(`  ${OWNER_SAVE_SENTENCE.draftsKeepNone}`);
  lines.push(OWNER_SAVE_SENTENCE.redeploy);
  return outcome(confirmed ? "done" : "done_unconfirmed", confirmed ? 0 : 1, lines, {
    applying: applying.id, ending: applied.recorded ? applied.id : null, admin,
  });
}
