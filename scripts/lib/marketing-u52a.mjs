/**
 * U52a · THE SHARED CORE OF THE LIVE DRIVE'S TWO READ-ONLY TOOLS (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.18
 * decisions 1, 3, 5 and 6) — `scripts/live/marketing-preflight.mjs` and `scripts/live/marketing-campaign-evidence.mjs`.
 *
 * ⭐ WHAT LIVES HERE is everything the two tools must do the SAME way, so there is one definition of each and one place a
 * suite can plant a defect:
 *   · the flags, and the two numbers (`--test`, `--control`) judged by the repo's own numbering plan (`parseTzNumber`);
 *   · THE OUTPUT FILTER — every line either tool prints goes through `makeIo`, which masks any whole Tanzanian number that
 *     got that far (a free-text field, an error, a payload) and removes the database address and every secret-named
 *     environment value. The tools also never SELECT a name, an e-mail, an address or a message body; the filter is the
 *     second wall, not the first;
 *   · `readOnlyTransaction` — ONE Prisma transaction whose FIRST statement is `SET TRANSACTION READ ONLY`, read back, and
 *     refused unless the database says `on` (the pattern of `marketing-preledger-offs.mjs`);
 *   · the readers of the three records the engine reads from SystemConfig (the live switch, the settings, the licence
 *     outreach record), each a port of the app's own reader and PINNED to it by `test:marketing-preflight` P6;
 *   · `judgeEligibility` — the CONSENT-AND-BASIS half of the one gate (`mayReceiveMarketingSms`), PINNED to the real gate
 *     by `test:marketing-preflight` P6 over a table of scenarios (the agent-referee exclusion is NOT judged and every GO carries it
 *     in `unjudged` - see `REFEREE_UNJUDGED`);
 *   · the ledger (decision 6): every chargeable send counted, and a refusal to count beyond the cap of six - written through a
 *     temporary file and a rename that waits out a file Windows holds for a moment (`renameWithRetry`);
 *   · ⭐ THE DRIVE'S MESSAGE (`DRIVE_MESSAGE`, the owner's words of 2026-10-09, kept in `marketing-u52a-message.mjs`) and the
 *     lengths it can have on the wire (`driveLengthWindows`) — what the evidence's SENT AS WRITTEN check holds every message to;
 *   · the private-host guard and the one-word database class, defined with the boot module and re-exported here, and `isCampaignId`.
 *
 * ⛔ NOTHING HERE WRITES TO A DATABASE, SENDS AN SMS OR READS A SECRET. The only file it writes is the gitignored ledger.
 * ⛔ This file imports the repo's pure modules by their `.ts` paths, so the tools run through `tsx` (the `ops:` keys) — and the
 * tools load it by a DYNAMIC import, after `marketing-u52a-boot.mjs` has rewritten the database address to the public proxy and
 * checked the working directory (a static import is evaluated first; see that file).
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { databaseClass, isPrivateHost } from "./marketing-u52a-boot.mjs";
import { parseTzNumber } from "../../src/lib/tz-msisdn.ts";
import { maskPhone } from "../../src/lib/phone-normalize.ts";
import { isSmsConsentWording, SMS_CONSENT_WORDINGS } from "../../src/lib/marketing/consent-wording.ts";
import { isImportAttestation } from "../../src/lib/marketing/consent-basis.ts";
import { readWordingHistories, savedBasisWordingsOf } from "../../src/lib/marketing/marketing-wordings.ts";
import {
  MARKETING_SMS_SETTINGS_DEFAULTS, SETTINGS_FIELDS, marketingSmsSettingsProblems,
} from "../../src/lib/marketing/sms-settings.ts";
import { ageOnPlatformDate, MIN_AGE_YEARS } from "../../src/lib/id-documents.ts";
import { JINA, JINA_MAX_CHARS } from "../../src/lib/marketing/campaign-template.ts";
import { DRIVE_MESSAGE, DRIVE_CAMPAIGN_NAMES } from "./marketing-u52a-message.mjs";

/* ══ THE CAP, THE LEDGER'S HOME, THE EXIT CODES ══════════════════════════════════════════════════════════════════════ */

/** G3 · the drive's most chargeable sends: 6 × TZS 6 = TZS 36. A constant of the code — a ledger FILE can never raise it. */
export const SEND_CAP = 6;
/** Decision 6 · the ledger, gitignored (`.qa-shots/`), relative to the repository root. */
export const LEDGER_REL = ".qa-shots/marketing-setup/U52a/ledger.json";
/** 0 done and proven / all GO · 1 a refusal is missing, a NO-GO, or the ledger refused · 2 not run (usage, no database). */
export const EXIT = Object.freeze({ ok: 0, fail: 1, notRun: 2 });

/* ══ THE DRIVE'S MESSAGE, AND THE LENGTHS IT CAN HAVE ON THE WIRE ════════════════════════════════════════════════════ */

/** The owner's words for every real SMS of the drive, and the campaigns' names — ONE copy, in `marketing-u52a-message.mjs`. */
export { DRIVE_MESSAGE, DRIVE_CAMPAIGN_NAMES };

/**
 * ⭐ SENT AS WRITTEN, AS THE DATABASE CAN SEE IT. No message body is ever stored — `SmsMessage` and the recipient row keep only
 * its LENGTH (`bodyLen`, the text's own length) — so the length is what the evidence can hold the wire to: one of the drive's
 * two bodies with `{jina}` filled as the renderer fills it (a usable first name of 1 to `JINA_MAX_CHARS` letters — the account's
 * own — or the draft's word for a contact-book number), and NOTHING after it. Per language: `{ min, max, fallback }`, `fallback`
 * the length a contact-book number is sent. Until the owner's ruling of 2026-10-09 the engine appended 49 characters or more
 * (the stop link, "18+", the helpline; with a source line, more), which no length in these windows can hold.
 * ⚠️ What a length cannot prove: OTHER words of a length inside a window would pass. The length proves nothing was ADDED; the
 * composer test's own card ("The exact text sent:", run sheet step 2) shows the words. `JINA` and `JINA_MAX_CHARS` are the
 * renderer's own (`campaign-template.ts`), imported, so the windows cannot drift from what it prints.
 */
export function driveLengthWindows(message = DRIVE_MESSAGE) {
  const windowOf = (body, fallback) => {
    const holes = body.split(JINA).length - 1;
    const base = body.length - holes * JINA.length;
    return { min: base + holes, max: base + holes * JINA_MAX_CHARS, fallback: base + holes * fallback.length };
  };
  return Object.freeze({ SW: windowOf(message.bodySw, message.nameFallbackSw), EN: windowOf(message.bodyEn, message.nameFallbackEn) });
}

/** Is `n` a length one of the drive's messages can have — in `locale`'s window when it is known (a recipient row's), else in either? */
export function isDriveLength(n, locale = null, windows = driveLengthWindows()) {
  if (typeof n !== "number" || !Number.isInteger(n)) return false;
  const inside = (w) => n >= w.min && n <= w.max;
  return locale === "SW" || locale === "EN" ? inside(windows[locale]) : inside(windows.SW) || inside(windows.EN);
}

/**
 * The migrations the marketing engine's tables and enum values come from, BY NAME (spec decision 1: "the U43-0 migration row is
 * finished", widened to every migration the engine reads through). `test:marketing-preflight` P8 holds this list to
 * `prisma/migrations/` — each name is a folder, and every migration whose SQL names a marketing table is in it.
 */
export const ENGINE_MIGRATIONS = Object.freeze([
  "20260916120000_sms_message",
  "20260925120000_marketing_consent_suppression",
  "20260925140000_marketing_optout_token",
  "20260925160000_suppression_lifted_at",
  "20260928170000_marketing_contact_book",
  "20261001160000_sms_purpose_marketing",
  "20261002120000_sms_campaign_models",
  "20261002130000_contact_import_staging",
  "20261004120000_contact_list_basis",
  "20261004140000_sms_recipient_unconfirmed",
  "20261008120000_sms_recipient_outcome_index",
  // S15's importer (2026-10-09): ContactImport.targetListId references "ContactList" — the list an import adds its contacts to.
  "20261009120000_contact_import_target_list",
]);

/** The SystemConfig keys the tools read (never write). ⭐ `test:marketing-preflight` P6e holds each to the APP's own constant
 *  (`MARKETING_LIVE_SWITCH_KEY`, `MARKETING_SMS_SETTINGS_KEY`, `LICENCE_OUTREACH_KEY`, `MARKETING_WORDINGS_KEY`) and to the literals of
 *  the pre-flight's SQL: a typo here reads an OPEN switch as "closed - no row stored". */
export const KEY_LIVE_SWITCH = "marketing.sms.live";
export const KEY_SETTINGS = "marketing.sms.settings";
export const KEY_OUTREACH = "marketing.outreach.licence";
export const KEY_WORDINGS = "marketing.wordings";

/** The database a connection string names, as ONE word (`proxy` · `loopback` · `other`), and whether it is Railway's private host -
 *  both defined with the boot module (which has to run before this one is loaded) and used by the tools through here. */
export { databaseClass, isPrivateHost };

/** The campaign id as the composer's address carries it (`?draft=<id>`): 8 to 64 letters, digits, - or _, with a letter in it, never a phone number. */
export function isCampaignId(text) {
  const s = typeof text === "string" ? text : "";
  return /^[A-Za-z0-9_-]{8,64}$/.test(s) && /[A-Za-z]/.test(s) && scrubNumbers(s) === s;
}

/* ══ FLAGS ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * `--name=value` and bare `--flag`, nothing else (no `--name value`: a number is never guessed out of the next word).
 * `spec` = { values: [names that take a value], flags: [names that take none], positional: max count }.
 * Problems are SENTENCES that never repeat what was typed — a number typed in the wrong place must not be echoed.
 */
export function parseFlags(argv, spec) {
  const out = { values: {}, flags: new Set(), positional: [], problems: [] };
  for (const raw of argv) {
    const a = String(raw);
    if (!a.startsWith("--")) { out.positional.push(a); continue; }
    const eq = a.indexOf("=");
    const name = eq < 0 ? a.slice(2) : a.slice(2, eq);
    if (spec.values.includes(name)) {
      if (eq < 0 || eq === a.length - 1) { out.problems.push(`--${name} needs a value, written --${name}=<value>`); continue; }
      (out.values[name] ??= []).push(a.slice(eq + 1));
    } else if (spec.flags.includes(name)) {
      if (eq >= 0) { out.problems.push(`--${name} takes no value`); continue; }
      out.flags.add(name);
    } else {
      // The option's NAME is shown only when it reads as a plain name — a number typed after two dashes is never echoed.
      out.problems.push(/^[a-z][a-z-]{0,23}$/.test(name) ? `--${name} is not an option of this tool` : "an option this tool does not have was given");
    }
  }
  if (out.positional.length > spec.positional) out.problems.push(`at most ${spec.positional} argument${spec.positional === 1 ? "" : "s"} without a -- name`);
  for (const [name, list] of Object.entries(out.values)) {
    if (list.length > 1 && !(spec.repeat ?? []).includes(name)) out.problems.push(`--${name} was given more than once`);
  }
  return out;
}

/**
 * A number argument, judged by the numbering plan the gate itself uses (`parseTzNumber`): a Tanzanian MOBILE number the
 * platform may put on the wire. ⛔ A refusal says the flag and the verdict code, never the text typed.
 */
export function parseNumberArg(flag, raw) {
  if (typeof raw !== "string" || raw.trim() === "") return { ok: false, problem: `--${flag} needs a number` };
  const p = parseTzNumber(raw);
  if (p.verdict !== "ok" || !p.msisdn) return { ok: false, problem: `--${flag} is not a sendable Tanzanian mobile number (${p.verdict})` };
  return { ok: true, key: p.msisdn, masked: maskPhone(p.msisdn), operator: p.operator ? p.operator.brand : null };
}

/** The repo's ONE mask (`+255••••NN`): the dial code and the last two digits, as the admin pages print it. */
export function maskKey(key) {
  return maskPhone(key);
}

/* ══ THE OUTPUT FILTER ═══════════════════════════════════════════════════════════════════════════════════════════════ */

const SECRET_NAMED = /SECRET|TOKEN|PASSWORD|PEPPER|DATABASE_URL|API_KEY|PRIVATE/i;

/** The words that stand in for what was taken out. */
const HIDDEN = "[hidden]";
const NUMBER = "[number]";

/**
 * Take the database address and every secret-named environment value out of a line. ⛔ Never prints the address: the tools
 * only ever ask `Boolean(env.DATABASE_URL)`, and an error that carries it (a driver's "can't reach host:port") is filtered
 * here before it is shown.
 */
export function redactSecrets(text, env = {}) {
  let s = String(text);
  const secrets = new Set();
  const url = typeof env.DATABASE_URL === "string" ? env.DATABASE_URL : "";
  if (url !== "") {
    secrets.add(url);
    try {
      const u = new URL(url);
      if (u.password) { secrets.add(u.password); try { secrets.add(decodeURIComponent(u.password)); } catch { /* not encoded */ } }
      if (u.hostname.length >= 6) secrets.add(u.hostname);
      if (u.username.length >= 6) secrets.add(u.username);
    } catch { /* not a URL: the whole string is still removed */ }
  }
  for (const [k, v] of Object.entries(env)) {
    if (SECRET_NAMED.test(k) && typeof v === "string" && v.length >= 8) secrets.add(v);
  }
  for (const v of secrets) if (v.length >= 4) s = s.split(v).join(HIDDEN);
  return s.replace(/postgres(?:ql)?:[/][/][^\s'"`)]+/gi, HIDDEN);
}

/** True for a character that makes a digit run part of a longer word (a hex reference). An underscore is NOT one: `usr_0755…` is a number after a prefix. */
function wordChar(c) {
  return c !== undefined && /[A-Za-z0-9]/.test(c);
}

/** Does this digit string read as a Tanzanian mobile number in any spelling the gate accepts? */
function looksLikeTzNumber(d) {
  const mobile = (c) => c === "6" || c === "7";
  if (d.length === 12 && d.startsWith("255") && mobile(d[3])) return "long";
  if (d.length === 13 && d.startsWith("2550") && mobile(d[4])) return "long";
  if (d.length === 14 && d.startsWith("00255") && mobile(d[5])) return "long";
  if (d.length === 15 && d.startsWith("002550") && mobile(d[6])) return "long";
  if (d.length === 10 && d.startsWith("0") && mobile(d[1])) return "short";
  if (d.length === 9 && mobile(d[0])) return "short";
  return null;
}

const BS = String.fromCharCode(92);
const DIGIT_LIKE = new RegExp(`[${BS}p{Nd}${BS}p{No}]`, "gu");
const IS_ND = new RegExp(`^${BS}p{Nd}$`, "u");

/**
 * Any Unicode decimal digit (Devanagari, Thai, Arabic-Indic, mathematical …) and any compatibility digit (subscript, circled, full-
 * width) as the ASCII digit it stands for, so a number written in another script is read as the number it is. A decimal digit's
 * value is its place in its run of ten (the Unicode blocks are contiguous tens). Text with no character beyond ASCII is untouched.
 */
function asciiDigits(s) {
  if (![...s].some((ch) => ch.codePointAt(0) > 127)) return s;
  return s.replace(DIGIT_LIKE, (c) => {
    const folded = c.normalize("NFKD");
    if (/^[0-9]+$/.test(folded)) return folded;
    if (!IS_ND.test(c)) return c;
    const cp = c.codePointAt(0);
    let start = cp;
    while (start > 0 && IS_ND.test(String.fromCodePoint(start - 1))) start -= 1;
    return String((cp - start) % 10);
  });
}

/** Up to SIX characters that are neither a letter nor a digit between two digits: spaces, dashes, a slash, dots, tabs, zero-width marks,
 *  a line break - in any mixture (`7 - - 5`, a mark after every digit and a space after every mark). */
const SEPARATORS = "[^A-Za-z0-9]{0,6}";

/**
 * What may stand BETWEEN two digit groups of a number the tool was NOT given (the generic pass): one to three of a space, a bracket, a dot,
 * a hyphen, a slash, an underscore, an en dash or a minus sign, a tab, a no-break or thin space, a zero-width mark or a soft hyphen. A colon, a
 * comma or a letter ends a number (a time, an amount and an id are left alone).
 */
const GENERIC_GAP = new RegExp("^[ ().\\-/_\\t\\u00a0\\u00ad\\u2009\\u200b-\\u200d\\u2013\\u2212\\u2060\\ufeff]{1,3}$");

/**
 * ⭐ A NUMBER THE TOOL WAS GIVEN, in ANY spelling: its nine national digits with up to three non-alphanumerics between any two
 * of them and NO word boundary (`772.619.619`, `7 7 2 - 6 1 9 / 6 1 9`, `x772619619y`, a zero-width mark after each digit), and
 * the prefix in front of it when there is one (`0`, `255`, `+255`, `00255`, `+255 (0)`). Only this one number's own digits can
 * match, so nothing else is damaged.
 */
function keyPattern(key) {
  const national = key.slice(3).split("").join(SEPARATORS);
  const prefix = `(?:(?:[+]|00)?255${SEPARATORS}(?:[(]?0[)]?${SEPARATORS})?|0${SEPARATORS})?`;
  return new RegExp(prefix + national, "g");
}

/**
 * ⛔ NO WHOLE NUMBER LEAVES A TOOL. Every digit group that reads as a Tanzanian mobile number — however it is spelled
 * (`+255 772 619 619`, `0772-619-619`, `772619619`, full-width or Arabic-Indic digits), and two of them side by side — is
 * replaced with `[number]`. A bare 9- or 10-digit run inside a longer word (a reference, an id) is left alone: only a
 * `255…` run, which no id spells, is taken out wherever it stands. `keys` are the numbers the tool was given: those are taken
 * out FIRST, in any spelling at all (`keyPattern`), before the generic pass and whatever stands around them.
 */
export function scrubNumbers(text, keys = []) {
  let s = String(text);
  if (/[^\u0000-\u007f]/.test(s)) {
    s = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 48));
    s = s.replace(/[٠-٩۰-۹]/g, (c) => String.fromCharCode(48 + (c.charCodeAt(0) & 0xf)));
  }
  s = asciiDigits(s);
  for (const k of keys) {
    if (typeof k !== "string" || !/^255[67][0-9]{8}$/.test(k)) continue;
    s = s.replace(keyPattern(k), NUMBER);
  }
  const groups = [...s.matchAll(/[+]?[0-9]+/g)].map((m) => ({ start: m.index, end: m.index + m[0].length, digits: m[0].replace("+", "") }));
  const cuts = [];
  for (let i = 0; i < groups.length; ) {
    let acc = "";
    let found = -1;
    for (let j = i; j < groups.length && j < i + 8; j++) {
      if (j > i) {
        const gap = s.slice(groups[j - 1].end, groups[j].start);
        if (!GENERIC_GAP.test(gap) || s[groups[j].start] === "+") break;
      }
      acc += groups[j].digits;
      if (acc.length > 15) break;
      const kind = looksLikeTzNumber(acc);
      if (kind === "long") found = j;
      else if (kind === "short" && !wordChar(s[groups[i].start - 1]) && !wordChar(s[groups[j].end])) found = j;
    }
    if (found >= 0) { cuts.push([groups[i].start, groups[found].end]); i = found + 1; } else i += 1;
  }
  for (let c = cuts.length - 1; c >= 0; c--) s = s.slice(0, cuts[c][0]) + NUMBER + s.slice(cuts[c][1]);
  return s;
}

/** A line as it may be shown: secrets out, then numbers out. */
export function safeLine(text, env = {}, keys = []) {
  return scrubNumbers(redactSecrets(text, env), keys);
}

/**
 * The only way either tool prints. `sink` receives finished lines (the real one is `console.log`; a suite collects them).
 * `keys` are the numbers the tool was given, so even their bare digits are caught wherever a database text carries them.
 */
export function makeIo(sink, env = {}, keys = []) {
  const lines = [];
  return {
    lines,
    line(text = "") {
      // ⭐ The WHOLE text is made safe first and split into lines after: a number (or a secret) that a line break runs through is still one
      // thing to the filter, and a break is one of the separators a number may be spelled with.
      for (const part of safeLine(String(text), env, keys).split("\n")) {
        lines.push(part);
        sink(part);
      }
    },
  };
}

/**
 * An error as one short line: its class, its code and the last line of its message, filtered. ⛔ A driver error can carry
 * the host and port it could not reach, or a statement with its values — never the whole message, never unfiltered.
 */
export function describeError(err, env = {}, keys = []) {
  const name = typeof err?.name === "string" ? err.name : "Error";
  const code = typeof err?.code === "string" ? ` ${err.code}` : "";
  const pg = typeof err?.meta?.code === "string" ? ` pg ${err.meta.code}` : "";
  // ⭐ Made safe BEFORE it is cut: the whole message passes the filter first, so a database address or a secret that the 160-character
  // cut would have split in two (leaving the front half of a password on the screen) is already gone, and so is a number that a line
  // break would have separated from its last digits. The last line of the SAFE text is what is shown.
  const last = safeLine(String(err?.message ?? err ?? ""), env, keys).split("\n").map((l) => l.trim()).filter(Boolean).pop() ?? "";
  const stmt = typeof err?.u52aStatement === "string" && /^[a-z?-]{1,30}$/.test(err.u52aStatement) ? ` [read: ${err.u52aStatement}]` : "";
  return safeLine(`${name}${code}${pg}${stmt}${last ? `: ${last.slice(0, 160)}` : ""}`, env, keys);
}

/**
 * Free text from the database, made safe to show: ASCII letters, digits, spaces and a few marks only, 80 characters at
 * most, any number taken out. Anything else becomes `«text»`. ⛔ For fields that CAN hold words (a skip detail, a provider
 * message, an audit string) — never a name field: the tools do not select those.
 */
export function safeText(v, max = 80) {
  if (v === null || v === undefined) return "—";
  const s = String(v).replace(/[\r\n\t]+/g, " ").trim();
  if (s === "") return "—";
  if (!/^[A-Za-z0-9 _.,:;'"()/+=<>@#%&*!?—–-]+$/.test(s)) return "«text»";
  return scrubNumbers(s.length > max ? `${s.slice(0, max - 1)}…` : s);
}

/** A list or campaign LABEL staff typed: shown only if it reads as a plain label, else hidden. */
export function safeLabel(v) {
  const s = typeof v === "string" ? v.trim() : "";
  if (s === "") return "«unnamed»";
  if (!/^[A-Za-z0-9 ._:#-]{1,40}$/.test(s)) return "«name hidden»";
  return scrubNumbers(s);
}

/**
 * An audit payload as a short, safe summary: own keys that are plain names (12 at most), values that are numbers, booleans,
 * null, a word, or the app's own masked number; objects one level deep; arrays as a length. ⛔ Anything else — free text, a
 * long string, a name — is shown as «text», never as itself.
 */
export function safePayload(payload, depth = 0) {
  if (payload === null || payload === undefined) return "—";
  if (typeof payload === "string") {
    try { return safePayload(JSON.parse(payload), depth); } catch { return "«text»"; }
  }
  if (typeof payload !== "object" || Array.isArray(payload)) return Array.isArray(payload) ? `[${payload.length}]` : "«text»";
  const parts = [];
  for (const k of Object.keys(payload).slice(0, 12)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(k)) { parts.push("«key»"); continue; }
    const v = payload[k];
    let shown;
    if (v === null) shown = "null";
    else if (v instanceof Date) shown = toIso(v) ?? "«text»";
    else if (typeof v === "number" || typeof v === "boolean") shown = String(v);
    else if (typeof v === "string") shown = /^[A-Za-z0-9_.:/-]{1,40}$/.test(v) || /^[+]255•{4}[0-9]{2}$/.test(v) ? scrubNumbers(v) : "«text»";
    else if (Array.isArray(v)) shown = `[${v.length}]`;
    else if (typeof v === "object") shown = depth < 1 ? `{${safePayload(v, depth + 1)}}` : "{…}";
    else shown = "«text»";
    parts.push(`${k}=${shown}`);
  }
  return parts.length ? parts.join(" ") : "—";
}

/* ══ TIME (the platform's clock is East Africa Time, UTC+3, no daylight saving) ══════════════════════════════════════ */

const EAT_MS = 3 * 3600_000;

export function eatParts(ms) {
  const d = new Date(ms + EAT_MS);
  return {
    year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
    hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
    minuteOfDay: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

const two = (n) => String(n).padStart(2, "0");

/** An instant (Date, ISO text or milliseconds) as ISO text, or null when it is not one. */
export function toIso(v) {
  if (v === null || v === undefined) return null;
  const ms = v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(String(v));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** "2026-10-09 10:31:07" in EAT, or "—". */
export function fmtEat(v) {
  const iso = toIso(v);
  if (iso === null) return "—";
  const p = eatParts(Date.parse(iso));
  return `${p.year}-${two(p.month)}-${two(p.day)} ${two(p.hour)}:${two(p.minute)}:${two(p.second)}`;
}

/** "HH:MM" in EAT for a minute-of-day. */
export function minuteLabel(minute) {
  return `${two(Math.floor(minute / 60))}:${two(minute % 60)}`;
}

const ms = (v) => {
  const iso = toIso(v);
  return iso === null ? Number.NaN : Date.parse(iso);
};

/**
 * ⭐ THE CLOCK EVERY TIME RULE READS IS THE DATABASE'S. `dbNow` is `SELECT now()` from the same transaction as every other read;
 * this machine's clock is only the fallback when that answer is missing (and the report says so). The switch's opening and closing
 * times, the send window and the age band are all judged against it — the engine reads its own server's clock, never this PC's.
 */
export function clockOf(dbNow, machineMs) {
  const db = ms(dbNow);
  if (Number.isFinite(db)) return { nowMs: db, source: "database", skewMs: Number.isFinite(machineMs) ? machineMs - db : null };
  return { nowMs: machineMs, source: "machine", skewMs: null };
}

/** The clock in one line: whose it is, and how far this machine's is from it (only when it is more than a few seconds). */
export function clockLine(clock) {
  if (clock.source !== "database") return "clock: THIS MACHINE'S - the database's clock could not be read, so every time rule below used it";
  const skew = clock.skewMs === null ? 0 : Math.round(clock.skewMs / 1000);
  return `clock: the database's (every time rule reads it)${Math.abs(skew) > 5 ? ` · this machine is ${Math.abs(skew)} s ${skew > 0 ? "ahead" : "behind"}` : ""}`;
}

/* ══ THE ONE READ-ONLY TRANSACTION ═══════════════════════════════════════════════════════════════════════════════════ */

export class ReadOnlyRefused extends Error {
  constructor(reading) {
    super(`the database did not confirm a read-only transaction (it answered ${JSON.stringify(reading)})`);
    this.name = "ReadOnlyRefused";
  }
}

/**
 * ⛔ READ ONLY BY CONSTRUCTION. One interactive transaction; its FIRST statement is `SET TRANSACTION READ ONLY`, the second
 * reads the setting back, and nothing runs unless the database says `on` — a write would then be refused by the database
 * itself. `body(tx)` gets the transaction handle. Every other statement either tool issues is a SELECT.
 * ⭐ REPEATABLE READ: the dozen reads of one run see ONE snapshot, so a row that changes while the tool is reading (a campaign
 * finishing, a receipt landing) cannot make the picture contradict itself. Prisma issues that `SET TRANSACTION ISOLATION LEVEL`
 * first; `SET TRANSACTION READ ONLY` may follow it, because no query has run yet.
 */
export async function readOnlyTransaction(prisma, body, opts = {}) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const ro = await tx.$queryRaw`SELECT current_setting('transaction_read_only') AS ro`;
    const mode = ro?.[0]?.ro;
    if (mode !== "on") throw new ReadOnlyRefused(mode);
    // The body is handed SELECTs only (no $executeRaw), and a failing statement is NAMED by the tag its text opens with, so a
    // database error on the first live run says which read it was without echoing the statement.
    const reads = {
      async $queryRaw(strings, ...values) {
        const tag = /u52a:([a-z-]+)/.exec(Array.isArray(strings) ? strings.join(" ") : String(strings));
        try {
          return await tx.$queryRaw(strings, ...values);
        } catch (err) {
          if (err && typeof err === "object" && !err.u52aStatement) { try { err.u52aStatement = tag ? tag[1] : "?"; } catch { /* a frozen error keeps no tag */ } }
          throw err;
        }
      },
    };
    return body(reads, { readOnly: mode });
  }, { isolationLevel: "RepeatableRead", timeout: opts.timeoutMs ?? 60_000, maxWait: opts.maxWaitMs ?? 10_000 });
}

/* ══ THE THREE SYSTEMCONFIG RECORDS — ports of the app's own readers, pinned to them by the suite ═══════════════════ */

const RECORDED_INSTANT = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]{1,3})?Z$/;
const SWITCH_KEYS = "closesAt,enabledAt,enabledBy";
const SWITCH_SKEW_MS = 60_000;
const SWITCH_MAX_OPEN_MS = 24 * 60 * 60_000;

function instantMs(s) {
  if (!RECORDED_INSTANT.test(s)) return null;
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString().slice(0, 19) === s.slice(0, 19) ? t : null;
}

/** The live switch exactly as `readMarketingLiveSwitch` judges a stored value (`live-switch.ts` `judgeRow`). */
export function readSwitch(value, nowMs) {
  if (value === null || value === undefined) return { state: "closed", why: "absent" };
  if (typeof value !== "object" || Array.isArray(value)) return { state: "closed", why: "malformed" };
  const row = value;
  if (Object.keys(row).sort().join(",") !== SWITCH_KEYS) return { state: "closed", why: "malformed" };
  const enabledBy = typeof row.enabledBy === "string" ? row.enabledBy.trim() : "";
  const enabledAt = typeof row.enabledAt === "string" ? row.enabledAt.trim() : "";
  const closesAt = typeof row.closesAt === "string" ? row.closesAt.trim() : "";
  const enabledMs = instantMs(enabledAt);
  const closesMs = instantMs(closesAt);
  if (enabledBy === "" || enabledMs === null || closesMs === null) return { state: "closed", why: "malformed" };
  if (closesMs <= enabledMs || closesMs - enabledMs > SWITCH_MAX_OPEN_MS) return { state: "closed", why: "malformed" };
  if (!Number.isFinite(nowMs) || enabledMs > nowMs + SWITCH_SKEW_MS) return { state: "closed", why: "malformed" };
  if (nowMs >= closesMs) return { state: "closed", why: "expired", closedAt: closesAt };
  return { state: "open", enabledAt, closesAt, remainingMs: closesMs - nowMs };
}

/** The licence-outreach record exactly as `readLicenceOutreachRow` judges it. */
export function readOutreach(value) {
  if (value === null || value === undefined) return { state: "closed", why: "default" };
  if (typeof value !== "object" || Array.isArray(value)) return { state: "closed", why: "malformed" };
  const row = value;
  const state = typeof row.state === "string" ? row.state : "";
  if (state === "closed") return { state: "closed", why: Object.keys(row).length === 1 ? "default" : "closed" };
  if (state !== "open") return { state: "closed", why: "malformed" };
  const keys = Object.keys(row).sort();
  if (keys.length !== 3 || keys[0] !== "recordedAt" || keys[1] !== "recordedBy" || keys[2] !== "state") return { state: "closed", why: "malformed" };
  const recordedBy = typeof row.recordedBy === "string" ? row.recordedBy.trim() : "";
  const recordedAt = typeof row.recordedAt === "string" ? row.recordedAt.trim() : "";
  if (recordedBy === "" || !RECORDED_INSTANT.test(recordedAt) || !Number.isFinite(Date.parse(recordedAt))) return { state: "closed", why: "malformed" };
  return { state: "open", recordedAt };
}

/**
 * The Marketing SMS settings record as the engine reads it (`readSettingsRow`): the fields it could read, and every field (or
 * `v`) it had to drop. `stored` false is "nothing saved: the documented defaults apply". `readable` false is the engine's
 * `settings_unreadable` — it pauses rather than guess. A value is always the saved one or the default, never inferred.
 */
export function readSettings(value) {
  const defaults = { ...MARKETING_SMS_SETTINGS_DEFAULTS };
  if (value === null || value === undefined) return { stored: false, readable: true, dropped: [], settings: defaults };
  if (typeof value !== "object" || Array.isArray(value)) return { stored: true, readable: false, dropped: ["record"], settings: defaults };
  const persisted = value;
  const dropped = [];
  if (persisted.v !== 1) dropped.push("v");
  for (const k of Object.keys(persisted)) {
    if (k !== "v" && !SETTINGS_FIELDS.includes(k)) dropped.push(k);
  }
  const judged = marketingSmsSettingsProblems(persisted, 0);
  if (judged.ok) return { stored: true, readable: dropped.length === 0, dropped, settings: { ...judged.value } };
  const bad = new Set(Object.keys(judged.problems));
  if (bad.has("windowStartMinute") || bad.has("windowEndMinute")) { bad.add("windowStartMinute"); bad.add("windowEndMinute"); }
  const settings = { ...defaults };
  for (const f of SETTINGS_FIELDS) {
    if (bad.has(f)) { dropped.push(f); continue; }
    if (typeof persisted[f] === "number") settings[f] = persisted[f]; else dropped.push(f);
  }
  return { stored: true, readable: false, dropped, settings };
}

/** The saved consent-basis wordings (`marketing.wordings`), as the gate recognises an import attestation against them. */
export function savedWordingsOf(value) {
  return savedBasisWordingsOf(readWordingHistories(value ?? null));
}

/**
 * The NEWEST saved version of one wording (`source.phrase`, `adult.test` …) when its words are not blank, else null. A history
 * the app's own reader cannot read in full reads as never saved (it fails closed, as the composer does). ⛔ Only the version
 * number and the save date come back — never the words.
 */
export function newestWording(value, key) {
  const history = readWordingHistories(value ?? null)[key];
  const last = Array.isArray(history) && history.length > 0 ? history[history.length - 1] : null;
  return last && typeof last.text === "string" && last.text.trim() !== "" ? { v: last.v, savedAt: toIso(last.savedAt) } : null;
}

/* ══ THE GATE'S CONSENT-AND-BASIS HALF ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ U33r · THE ONE EXCLUSION NEITHER BRANCH OF THE PORT DECIDES. The real gate (`mayReceiveMarketingSms`, step 1b, right after the
 * stop list and BEFORE any basis, consent included) refuses `agent_referee` for a number kept as an agent applicant's referee, who
 * was promised "we never contact you for marketing". Judging it would mean computing the keyed hash of the number (and of the
 * account's and the book row's e-mail) under the production pepper and reading `AgentRefereeKey` - secret material a read-only tool
 * does not touch, and a second definition of a keyed read that could answer "not held" falsely. So the port does NOT judge it, and
 * SAYS SO on every consent row: the safe direction is the real gate's own refusal at the send, which the evidence names. §4.18
 * records the decision (option b of the merge round). `test:marketing-preflight` P6d requires, over a referee dimension, that the
 * port never reads a GO the real gate refuses without carrying this entry in `unjudged`.
 */
export const REFEREE_UNJUDGED = "the agent-referee exclusion";
export const REFEREE_SAYING = "the agent-referee exclusion is NOT judged here: a number given as an agent applicant's referee is SKIPPED agent_referee at the send, before any consent or basis (the evidence names that reason)";

/** What the gate asks AFTER consent and basis for an account holder — read at the send, NOT judged by the preflight. */
export const UNJUDGED_FOR_ACCOUNTS = Object.freeze([
  "self-exclusion", "cooling-off", "harm markers", "an identity check's final refusal", "under 25 with a break on record",
]);

const MARKETABLE_STATUS = new Set(["ACTIVE", "PENDING_KYC"]);

/** The ledger row's facts the judgement needs, classified: is its wording an SMS-naming sentence, is it an import attestation. */
export function classifyLedgerRow(row, saved) {
  if (!row) return null;
  const status = row.status === "GIVEN" || row.status === "WITHDRAWN" ? row.status : null;
  if (status === null) return null;
  const source = String(row.source ?? "");
  const wording = typeof row.wording === "string" ? row.wording : "";
  return {
    status,
    source,
    sms: isSmsConsentWording(wording),
    attestation: isImportAttestation(
      { status, source, recordedBy: row.recorded_by_officer === true ? "officer" : null, wording },
      saved,
    ),
    viaLink: row.via_link === true,
    createdAt: toIso(row.created_at),
  };
}

/** The age band the gate would read: adult / minor / unknown, or `boundary` when a day either side of now disagrees. */
export function ageBand(dob, nowMs) {
  const iso = toIso(dob);
  if (iso === null) return "unknown";
  const at = (t) => ageOnPlatformDate(iso, new Date(t));
  const now = at(nowMs);
  if (!Number.isFinite(now)) return "unknown";
  const lo = at(nowMs - 36 * 3600_000);
  const hi = at(nowMs + 36 * 3600_000);
  if ((lo >= MIN_AGE_YEARS) !== (hi >= MIN_AGE_YEARS)) return "boundary";
  return now >= MIN_AGE_YEARS ? "adult" : "minor";
}

const refuse = (skipReason, detail) => ({ ok: false, skipReason, detail });

/**
 * ⭐ THE CONSENT-AND-BASIS HALF OF `mayReceiveMarketingSms`, from facts read once (suppression, account, ledger, licence record,
 * book standing) — in the gate's own order, with the gate's own skip reasons. `test:marketing-preflight` P6 drives the REAL gate
 * with the same facts and requires the same answer. WHAT IT DOES NOT DECIDE is `REFEREE_UNJUDGED` (every number) and
 * `UNJUDGED_FOR_ACCOUNTS` (an account holder): the gate asks those at the send, and a GO carries them as `unjudged`.
 *
 * facts = { suppression: bool (an ACTIVE stop), user: null | { status, optIn, adult }, latest: classified ledger row | null,
 *           outreach: "open" | "closed", book: { row: "none" | "live" | "erased", cover: bool } }
 */
export function judgeEligibility(facts) {
  if (facts.suppression === true) return refuse("suppressed", "an active stop is on file");
  const latest = facts.latest ?? null;
  if (facts.user) {
    const u = facts.user;
    let basis = "CONSENT";
    // 2a · the toggle AND an SMS-naming GIVEN row as the latest ledger entry
    let noConsent = null;
    if (u.optIn !== true) noConsent = refuse("no_consent", "the account's own marketing switch is off");
    else if (!latest) noConsent = refuse("no_consent", "no consent row in the ledger");
    else if (latest.status !== "GIVEN") noConsent = refuse("consent_withdrawn", "consent was withdrawn");
    else if (!latest.sms) noConsent = refuse("no_consent", "the consent predates the SMS wording");
    if (noConsent) {
      if (facts.outreach !== "open") return noConsent;
      if (latest && latest.status === "WITHDRAWN") return refuse("consent_withdrawn", "withdrawn; a licence basis never overrides a stop");
      // ⚠️ KNOWN DIVERGENCE, IN THE SAFE DIRECTION (stricter than the gate): main's gate reversed Q9 and clears this account under an OPEN
      // record; this port still refuses it. `test:marketing-preflight` P6d names the family (18 scenarios) and requires nothing else to differ.
      if (u.optIn === false && latest && latest.status === "GIVEN") return refuse("no_consent", "the switch is off after a consent that was never withdrawn");
      basis = "LICENCE_PLAYER";
    }
    if (u.adult === "unknown" || u.adult === "boundary") return refuse("age_unknown", u.adult === "boundary" ? "the account's birthday is within a day of 18" : "no readable date of birth");
    if (u.adult === "minor") return refuse("age_minor", "the account holder is under 18");
    if (!MARKETABLE_STATUS.has(u.status)) return refuse("account_status", `the account is ${safeText(String(u.status), 14).toLowerCase()}`);
    return { ok: true, branch: "account", basis, unjudged: [REFEREE_UNJUDGED, ...UNJUDGED_FOR_ACCOUNTS] };
  }
  // 3 · the contact branch — no account holds the number
  if (latest && latest.status === "WITHDRAWN") return refuse("consent_withdrawn", "consent was withdrawn");
  const consented = latest !== null && latest.status === "GIVEN" && (latest.attestation === true || latest.sms === true);
  if (!consented && facts.outreach !== "open") return refuse("no_consent", latest ? "the latest consent row does not name SMS marketing" : "no consent has ever been recorded");
  const book = facts.book ?? { row: "none", cover: false };
  let basis;
  if (consented) basis = "CONSENT";
  else {
    if (book.row === "erased") return refuse("no_basis", "the book record was erased");
    if (book.cover === true) basis = "LICENCE_LIST";
    else return refuse("no_basis", "no consent and no list basis covers this number");
  }
  const adult = (latest !== null && latest.attestation === true) || book.cover === true;
  if (!adult) return refuse("age_unknown", "no 18+ evidence: no import attestation on the latest row and no covering list basis");
  return { ok: true, branch: "contact", basis, unjudged: [REFEREE_UNJUDGED] };
}

/** The wording the stop link's "Start them again" stores (Swahili, the page's default language). */
export function resumeWording() {
  const w = SMS_CONSENT_WORDINGS.find((x) => x.site === "OPT_OUT_RESUME" && x.locale === "SW");
  return w ? w.wording : "";
}

/**
 * The facts AFTER the stop link's two acts — the stop, then "Start them again": the stop is lifted, the ledger's newest row
 * is the resume row (an SMS-naming GIVEN, source OPT_OUT_PAGE, no officer behind it — so no import attestation), and an
 * account's own switch is on again (`syncPlayerToggle`). ⭐ This is what campaign C meets: a CONTACT's 18+ evidence that lived
 * on an attestation row is gone, so only a covering list basis keeps it sendable.
 */
export function factsAfterStopCycle(facts, nowMs) {
  const t = new Date(nowMs).toISOString();
  return {
    ...facts,
    suppression: false,
    latest: { status: "GIVEN", source: "OPT_OUT_PAGE", sms: true, attestation: false, viaLink: true, createdAt: t },
    user: facts.user ? { ...facts.user, optIn: true } : null,
  };
}

/* ══ CHARGEABLE SENDS AND THE LEDGER ═════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ A MESSAGE THAT MAY HAVE BEEN CHARGED. Every message row counts except one that provably never left: a FAILED row with no
 * receipt (the gateway's own `status:false`, or a failure before the request — `sms.ts` writes those itself). QUEUED and
 * UNKNOWN count (the request may have reached the gateway); a receipt-failed row counts (the carrier may have billed it).
 */
export function isChargeable(status, hasReceipt) {
  return !(String(status) === "FAILED" && hasReceipt !== true);
}

/** Sum a groupBy of messages — rows { status, has_receipt, n } — to the chargeable count. */
export function countChargeable(groups) {
  let n = 0;
  for (const g of groups) if (isChargeable(g.status, g.has_receipt === true)) n += Number(g.n) || 0;
  return n;
}

export const emptyLedger = () => ({ v: 1, cap: SEND_CAP, entries: {} });

const ENTRY_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** A ledger from its file text. ⛔ Fails closed: an unreadable or foreign file is never replaced by an empty one. */
export function parseLedger(text) {
  if (text === null || text === undefined) return { ok: true, ledger: emptyLedger(), existed: false };
  let raw;
  try { raw = JSON.parse(text); } catch { return { ok: false, why: "the ledger file is not JSON" }; }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, why: "the ledger file is not an object" };
  if (raw.v !== 1) return { ok: false, why: "the ledger file is another version" };
  if (raw.cap !== SEND_CAP) return { ok: false, why: `the ledger file names another cap than ${SEND_CAP}` };
  if (raw.entries === null || typeof raw.entries !== "object" || Array.isArray(raw.entries)) return { ok: false, why: "the ledger file has no entries object" };
  const entries = {};
  for (const [id, e] of Object.entries(raw.entries)) {
    if (!ENTRY_ID.test(id) || e === null || typeof e !== "object" || !Number.isSafeInteger(e.chargeable) || e.chargeable < 0) {
      return { ok: false, why: "a ledger entry is malformed" };
    }
    entries[id] = e;
  }
  return { ok: true, ledger: { v: 1, cap: SEND_CAP, entries }, existed: true };
}

export const ledgerTotal = (ledger) => Object.values(ledger.entries).reduce((n, e) => n + e.chargeable, 0);
export const ledgerRoom = (ledger) => SEND_CAP - ledgerTotal(ledger);

/** Would `sends` more chargeable sends fit under the cap? (The preflight's pre-send check.) */
export function checkRoom(ledger, sends) {
  const used = ledgerTotal(ledger);
  return { ok: used + sends <= SEND_CAP, used, sends, room: SEND_CAP - used };
}

/**
 * ⭐ COUNT A CAMPAIGN'S SENDS — and REFUSE to count beyond the cap. The entry for a campaign is a HIGH-WATER MARK (a later
 * look can only raise it: rows are never deleted, so a lower count is a read gone wrong, never fewer sends). Re-running the
 * evidence for the same campaign is therefore idempotent. When the total across the campaigns would pass the cap the
 * ledger is NOT updated and the answer is `over_cap` — the run stops there; nothing is counted into a seventh.
 */
export function recordLedger(ledger, campaignId, entry) {
  if (!ENTRY_ID.test(String(campaignId))) return { ok: false, reason: "bad_id" };
  const prev = ledger.entries[campaignId];
  const chargeable = Math.max(prev ? prev.chargeable : 0, entry.chargeable);
  const others = Object.entries(ledger.entries).filter(([id]) => id !== campaignId).reduce((n, [, e]) => n + e.chargeable, 0);
  const would = others + chargeable;
  if (would > SEND_CAP) return { ok: false, reason: "over_cap", would };
  // A look carries no verdict and no label: it counts the sends and leaves what an earlier proof recorded.
  const keep = entry.verdict === "look" && prev ? { label: prev.label ?? entry.label, outcomes: prev.outcomes ?? entry.outcomes, verdict: prev.verdict ?? entry.verdict } : {};
  const next = { ...ledger, entries: { ...ledger.entries, [campaignId]: { ...entry, ...keep, chargeable } } };
  return { ok: true, ledger: next, total: would };
}

/** The ledger file's home beside this checkout, and an IO over it (a suite hands in an in-memory one). */
export function defaultLedgerPath() {
  return fileURLToPath(new URL(`../../${LEDGER_REL}`, import.meta.url));
}

/** How long (milliseconds) the ledger's rename waits between its tries when Windows holds the target for a moment (an antivirus scan, an
 *  editor, the search indexer): EPERM and EBUSY are common there and pass in a moment. */
export const RENAME_WAITS_MS = Object.freeze([50, 100, 200, 400, 800]);

/** A synchronous wait: the ledger is written synchronously, as the last thing a run does. */
function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * ⭐ `rename(from, to)`, tried again after a short wait while the target is HELD (EPERM, EBUSY) - up to `waits.length` more times - and
 * any other failure at once. Returns how many times it had to wait; throws the last error when the file stays held. A ledger that
 * could not be written is a stopped drive, so a hiccup of the file system must not be one.
 */
export function renameWithRetry(rename, from, to, sleep = sleepMs, waits = RENAME_WAITS_MS) {
  for (let tries = 0; ; tries++) {
    try {
      rename(from, to);
      return tries;
    } catch (err) {
      const held = err !== null && typeof err === "object" && (err.code === "EPERM" || err.code === "EBUSY");
      if (!held || tries >= waits.length) throw err;
      sleep(waits[tries]);
    }
  }
}

/** `ops` is the file system the io writes through (a suite hands in a stand-in: it writes no file). */
export function fileLedgerIo(path = defaultLedgerPath(), ops = {}) {
  const fsOps = { mkdir: mkdirSync, writeFile: writeFileSync, rename: renameSync, sleep: sleepMs, ...ops };
  return {
    path,
    read() {
      try { return readFileSync(path, "utf8"); } catch (err) {
        if (err && err.code === "ENOENT") return null;
        throw err;
      }
    },
    write(text) {
      fsOps.mkdir(dirname(path), { recursive: true });
      const tmp = `${path}.tmp`;
      fsOps.writeFile(tmp, text, "utf8");
      renameWithRetry(fsOps.rename, tmp, path, fsOps.sleep);
    },
    /** Where the file is and when it was last written — said by every run, so a ledger in the wrong checkout shows at once. */
    where() {
      try { return { path, mtimeMs: statSync(path).mtimeMs }; } catch { return { path, mtimeMs: null }; }
    },
  };
}

/** Every STRING in a value with any whole number taken out (the keys of an object are left alone: they are validated ids). */
export function scrubStrings(value, keys = []) {
  if (typeof value === "string") return scrubNumbers(value, keys);
  if (Array.isArray(value)) return value.map((x) => scrubStrings(x, keys));
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrubStrings(v, keys)]));
  return value;
}

/** ⛔ The file text. Every string in the ledger passes the number wall once more on its way to the disk (a label, an outcome). */
export const serializeLedger = (ledger) => `${JSON.stringify(scrubStrings(ledger), null, 2)}\n`;

/** Read the ledger through an io. `{ ok: false }` when the file cannot be trusted — the caller refuses, never resets. */
export function readLedger(io) {
  let text;
  try { text = io.read(); } catch { return { ok: false, why: "the ledger file could not be read" }; }
  return parseLedger(text);
}

/** The ledger file's ABSOLUTE path and last write, from the io (an in-memory io has neither). */
export function ledgerWhere(io) {
  try { return typeof io.where === "function" ? io.where() : { path: null, mtimeMs: null }; } catch { return { path: null, mtimeMs: null }; }
}

/** The one line both tools print on every run: where the ledger is and when it was last written. */
export function ledgerFileLine(io) {
  const w = ledgerWhere(io);
  const state = w.mtimeMs === null || w.mtimeMs === undefined ? "not present" : `last written ${fmtEat(w.mtimeMs)} EAT`;
  return `ledger file: ${w.path ?? "(in memory)"} · ${state}`;
}

/**
 * ⭐ A LEDGER FILE IS CREATED ONLY ON PURPOSE. A missing file means "no send has been counted yet" ONLY when the person running the
 * tool says so (`--new-ledger`: the drive's first runs, before the first send). Any later, a missing file means the counts were lost
 * or this is another checkout — and a drive restarted from zero would send past the cap. The reverse is refused too: `--new-ledger`
 * over a ledger that exists says the drive has not begun when it has. `read` is `readLedger(io)`.
 */
export function ledgerGate(read, newLedger) {
  if (!read.ok) return { ok: false, kind: "untrusted", why: `the ledger cannot be trusted (${read.why}) - move it aside by hand; it is never reset for you` };
  if (!read.existed && newLedger !== true) {
    return { ok: false, kind: "missing", why: "there is no ledger file - give --new-ledger on the drive's first runs (before the first send) and never after: a ledger that is missing LATER means the counts were lost or this is another checkout, and the drive must STOP" };
  }
  if (read.existed && newLedger === true) {
    return { ok: false, kind: "exists", why: "--new-ledger was given but a ledger file already exists (the drive has begun) - leave the flag out" };
  }
  return { ok: true, kind: read.existed ? "existing" : "new", used: ledgerTotal(read.ledger) };
}
