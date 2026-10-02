/**
 * U24 · THE ONE AUDIENCE RESOLVER — the only path from a filter to the contact book.
 *
 * ⭐ WHAT IT IS. A filter (`ContactAudienceFilter`) is what an officer chose: a search, an operator, a consent
 * state, a list, a tag, a window, a ticked selection. This file is where that choice becomes a query, and the
 * ONLY place it does: the list and its KPI band (U20) and the bulk bar's recount and its set-based writes (U23,
 * `contact-bulk.ts`) read through it today; the export walk (U34), the campaign's counts and recount (U38, U40)
 * and the send's walk (U42) join it, each in its own commit. OD36: the count the list shows, the count the bulk
 * confirms, the count the export writes and the count the campaign confirms are one number, because they are one
 * function.
 *
 * ⛔ NO SECOND PATH. Outside the two twins, no file but this one calls the book's set members
 * (`db.marketingContact.page / countWhere / summaryWhere / walk / tagCounts` and U23's `…Where` writes), names
 * `ContactAudienceWhere`, or turns a filter into a where. `test:contacts-audience` §1 walks the real `src/` tree and
 * holds it, with an in-process `--prove-red` that plants each kind of second path.
 *
 * ⛔ A FILTER NEVER WIDENS SILENTLY (decision C2).
 *   · An UNKNOWN VALUE of a known URL key REFUSES — `?op=NOKIA` is a refused page with a Clear action, never
 *     the whole book. A dropped predicate widens a bulk, an export or a campaign audience.
 *   · An EMPTY any-of means NOTHING, never "no constraint": `{ ids: [] }` is zero rows in both twins.
 *   · A relative window (`?range=7d`) is resolved to ABSOLUTE instants here, so a stored filter cannot
 *     re-resolve to a different set at send time.
 * ⛔ ERASED ROWS ARE IN NO AUDIENCE (decision C3). `toAudienceWhere` always sets `excludeSourceRef` to
 * `ERASURE_EVIDENCE`: an emptied tombstone is in no list, count, bulk, export or campaign — not even a
 * whole-number search for its own key. Only the duplicate checks (U22's form, U31's importer) still see it,
 * by a point lookup on the number.
 * ⛔ THERE IS NO "REACHABLE" PREDICATE, BY DESIGN. Reachability is the send gate's per-recipient verdict
 * (`mayReceiveMarketingSms`), several reads each; hoisted into a list-build predicate it is the U9 defect —
 * the opted-out number sent to. `consent` and `suppressed` here are the CACHE columns, named as what they are.
 *
 * Guards: `test:contacts-audience` (structure, behaviour, the ONE-COUNT readers table, the keyset walk, the
 * masking of the audit and describe forms) and `test:dal-parity` §21 (the two twins' translations).
 */
import { db } from "@/lib/server/store";
import type {
  ContactAudienceWhere, ContactBookSummary, ContactBulkCount, ContactBulkStamp, ContactConsentState, ContactPage,
  ContactPageSort, ContactSource, ContactTagCount, ContactWalk,
} from "@/lib/server/store";
import { parseQuery, fieldNames, CONTACT_SEARCH } from "@/lib/search";
import type { ParsedQuery } from "@/lib/search";
import { parseTzNumber, ndcsForOperator, TZ_OPERATORS } from "@/lib/tz-msisdn";
import type { TzOperatorId } from "@/lib/tz-msisdn";
import { maskPhone } from "@/lib/phone-normalize";
import { parseEatLocal, resolveRange, formatEatLocal } from "@/lib/server/date-range";
import { FULL_PRESETS, DAY_MS } from "@/lib/query/windows";
import { EAT_OFFSET_MS, eatDayKey, formatEatDay } from "@/lib/eat-day";
import { ERASURE_EVIDENCE } from "@/lib/server/marketing/erase";

/* ═══ THE FILTER ═══════════════════════════════════════════════════════════════════════════ */

/**
 * What an officer chose. AND across predicates, any-of within one. null means UNCONSTRAINED.
 * ⛔ An EMPTY array means NOTHING, never "no constraint". There is no `reachable` predicate (see the header).
 */
export type ContactAudienceFilter = {
  /** The search box: a WHOLE number (held as its bare `255…` key) or a name query. */
  q: string | null;
  /** ⛔ D19 / A1.1: a reader's alone (`roleRefusal`) — until U33 a recorded consent can only be a player's. */
  consent: ContactConsentState[] | null;
  /** ⛔ D19 / OD54: a reader's alone (`roleRefusal`) — until the importer goes live a stop is a player's or an officer's. */
  suppressed: boolean | null;
  operators: TzOperatorId[] | null;
  lists: string[] | null;
  tags: string[] | null;
  sources: ContactSource[] | null;
  /** true = linked to an account. ⛔ D19: only a viewer who may read a number may ask (`contacts-loader.ts`). */
  player: boolean | null;
  importId: string | null;
  /** ISO instant, INCLUSIVE, always ABSOLUTE. */
  addedFrom: string | null;
  /** ISO instant, EXCLUSIVE. */
  addedBefore: string | null;
  /** A ticked selection, at most `MAX_AUDIENCE_IDS`. ⛔ Travels in a request body, never in an address. */
  ids: string[] | null;
};

/** Every key, in the ONE canonical order (`contactAudienceKey` writes them so). A Record, so a key added to the
 *  filter type and forgotten here is a compile error, not a predicate the JSON parser silently refuses. */
const FILTER_KEY_SET: Record<keyof ContactAudienceFilter, true> = {
  q: true, consent: true, suppressed: true, operators: true, lists: true, tags: true, sources: true,
  player: true, importId: true, addedFrom: true, addedBefore: true, ids: true,
};
const FILTER_KEYS = Object.keys(FILTER_KEY_SET) as (keyof ContactAudienceFilter)[];

/** The whole book: every predicate unconstrained (the erased tombstone is still left out — decision C3). */
export const WHOLE_BOOK: ContactAudienceFilter = Object.freeze({
  q: null, consent: null, suppressed: null, operators: null, lists: null, tags: null, sources: null,
  player: null, importId: null, addedFrom: null, addedBefore: null, ids: null,
});

/** ⛔ A selection above this is REFUSED, never truncated — a truncated selection acts on people nobody ticked
 *  or skips people somebody did, and says neither. */
export const MAX_AUDIENCE_IDS = 1000;

export type AudienceParse = { ok: true; filter: ContactAudienceFilter } | { ok: false; param: string; reason: string };

/* ═══ THE VOCABULARY ═══════════════════════════════════════════════════════════════════════ */

/** Words for a sentence ("Consent: given"). Full Records, so a new enum value is a compile error here.
 *  UNKNOWN reads "not recorded" — the list's chip says "Not recorded" (decision C13). */
const CONSENT_WORDS: Record<ContactConsentState, string> = { GIVEN: "given", UNKNOWN: "not recorded", WITHDRAWN: "withdrawn" };
const SOURCE_WORDS: Record<ContactSource, string> = { IMPORT: "import", REGISTRATION: "sign-up", OPERATOR: "added by staff", AGENT: "agent" };
const CONSENT_STATES = Object.keys(CONSENT_WORDS) as ContactConsentState[];
const CONTACT_SOURCES = Object.keys(SOURCE_WORDS) as ContactSource[];
const OPERATOR_IDS = Object.keys(TZ_OPERATORS) as TzOperatorId[];

/**
 * ⭐ THE URL KEYS THIS PARSER READS — the contacts page's filter vocabulary (decision C2). `sort`, `dir`, `page`
 * and any unknown key are ignored (they cannot narrow); `ids` is a known key that always REFUSES in an address.
 * ⚠️ `contacts-query.ts` keeps its own copy for the page's links (it must stay free of the server graph so a
 * client rail can build links); `test:contacts-audience` 1.7 holds the two equal.
 */
export const CONTACT_AUDIENCE_URL_KEYS = ["q", "consent", "suppressed", "op", "list", "tag", "source", "player", "import", "range", "from", "to"] as const;

/** A list or import id as the store mints them (cuid; the dev seed's `mc_seed_000`). Narrower can only refuse. */
const ID_SHAPE = /^[A-Za-z0-9_-]{1,64}$/;
/** Decision C11's tag alphabet: letters, digits, space, `-`, `_`; 1–32 characters; stored lowercase.
 *  ⚠️ U28a's `tagKey` (`src/lib/contacts/contact-fields.ts`) is THE tag rule; when it lands, `tagOf` reads through it. */
const TAG_SHAPE = /^[\p{L}\p{N} _-]{1,32}$/u;

function tagOf(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, " ").toLowerCase();
  return TAG_SHAPE.test(t) ? t : null;
}

const clip = (s: string) => (s.length > 40 ? `${s.slice(0, 40)}…` : s);
const refuse = (param: string, reason: string): AudienceParse => ({ ok: false, param, reason });
/** Deduplicated and sorted in code-unit order — every array in a filter is canonical by construction. */
const canon = <T extends string>(xs: Iterable<T>): T[] => [...new Set(xs)].sort();

/* ═══ THE SEARCH BOX ═══════════════════════════════════════════════════════════════════════ */

export type ContactsSearch = {
  /** The bare `255…` key of a WHOLE number, or null. */
  msisdn: string | null;
  /** A name query, or null when the box is empty or holds a whole number. */
  name: ParsedQuery | null;
};

/**
 * WHAT THE SEARCH BOX MEANS (moved here from `contacts-query.ts` by U24 — the one place the box's text becomes a
 * query). ⭐ A WHOLE NUMBER IS FOUND BY ITS KEY: `0712 345 678`, `712345678`, `+255712345678` and `255712345678`
 * are one person, and the store matches the key EXACTLY.
 * ⛔ A PART OF A NUMBER NEVER SEARCHES THE NUMBER COLUMN. GROWTH sees every number masked (`+255••••01`, U19); a
 * substring search on `msisdn` would let that role rebuild a number digit by digit. Anything that is not a whole
 * sendable number is a NAME search through the shared grammar (`CONTACT_SEARCH`), which reaches `displayName` alone.
 */
export function contactsSearch(raw: string | null | undefined): ContactsSearch {
  const text = (raw ?? "").trim();
  if (text === "") return { msisdn: null, name: null };
  const parsed = parseTzNumber(text);
  if (parsed.verdict === "ok" && parsed.msisdn) return { msisdn: parsed.msisdn, name: null };
  return { msisdn: null, name: parseQuery(text, { fields: fieldNames(CONTACT_SEARCH) }) };
}

/** The box's text as a filter holds it: a whole number as its bare key (so two spellings are one filter), any
 *  other text trimmed, nothing as null. */
function canonicalQ(raw: string): string | null {
  const text = raw.trim();
  if (text === "") return null;
  return contactsSearch(text).msisdn ?? text;
}

/* ═══ THE PREFIXES ═════════════════════════════════════════════════════════════════════════ */

/** The prefixes a set of operators holds, from the ONE table (`ndcsForOperator`) — sendable or not.
 *  ⛔ Never a hand-typed list (`test:contacts-audience` 1.6). */
export function ndcsForOperators(ops: TzOperatorId[]): string[] {
  return canon(ops.flatMap((op) => ndcsForOperator(op)));
}

/* ═══ THE URL PARSER ═══════════════════════════════════════════════════════════════════════ */

type Raw = string | string[] | undefined;

/** Every comma-separated token of a key, across repeats; empty tokens are absent. */
function tokens(v: Raw): string[] {
  const vals = v === undefined ? [] : Array.isArray(v) ? v : [v];
  return vals.flatMap((s) => String(s ?? "").split(",")).map((t) => t.trim()).filter((t) => t !== "");
}

/** A single-value key: ONE distinct token, or none. ⛔ Two values ("yes,no", a repeated key) REFUSE — taking the
 *  first would drop the second without a word, which is C2's widening in miniature. */
function oneToken(v: Raw): { ok: true; value: string | undefined } | { ok: false; bad: string } {
  const t = Array.from(new Set(tokens(v)));
  return t.length > 1 ? { ok: false, bad: t.join(",") } : { ok: true, value: t[0] };
}

/** The page clamp — the same rule as `parsePage`, kept here so the server resolver imports no React module
 *  (U34's export route and U42's send worker read through this file). */
function clampPage(raw: string | undefined, total: number, perPage: number): number {
  const n = Number.parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, Math.max(1, Math.ceil(total / perPage)));
}

type Read<T> = { ok: true; value: T } | { ok: false; bad: string };

function readEnum<T extends string>(raw: string[], allowed: readonly T[]): Read<T[]> {
  const out: T[] = [];
  for (const t of raw) {
    const up = t.toUpperCase();
    const hit = allowed.find((a) => a === up);
    if (hit === undefined) return { ok: false, bad: t };
    out.push(hit);
  }
  return { ok: true, value: canon(out) };
}

function readIds(raw: string[]): Read<string[]> {
  for (const t of raw) if (!ID_SHAPE.test(t)) return { ok: false, bad: t };
  return { ok: true, value: canon(raw) };
}

function readTags(raw: string[]): Read<string[]> {
  const out: string[] = [];
  for (const t of raw) {
    const tag = tagOf(t);
    if (tag === null) return { ok: false, bad: t };
    out.push(tag);
  }
  return { ok: true, value: canon(out) };
}

/** yes / no, any case. ⛔ A comparison, not a lookup table: `table["constructor"]` is a function, not undefined. */
const yesNo = (t: string): boolean | undefined => {
  const v = t.toLowerCase();
  return v === "yes" ? true : v === "no" ? false : undefined;
};

const OPERATOR_LIST = OPERATOR_IDS.join(", ");
const ENUM_REASON = {
  consent: (bad: string) => `“${clip(bad)}” is not a consent state the book records (${CONSENT_STATES.join(", ")}).`,
  op: (bad: string) => `“${clip(bad)}” is not a Tanzanian operator (${OPERATOR_LIST}).`,
  source: (bad: string) => `“${clip(bad)}” is not a contact source (${CONTACT_SOURCES.join(", ")}).`,
};
const DATE_REASON = (bad: string) => `“${clip(bad)}” is not a date. Write it as YYYY-MM-DD or YYYY-MM-DDTHH:MM, East Africa Time.`;
const INVERTED_REASON = "The window ends before it starts: “from” must be earlier than “to”.";
const floorMinute = (ms: number) => Math.floor(ms / 60_000) * 60_000;
const ceilMinute = (ms: number) => Math.ceil(ms / 60_000) * 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

/**
 * The window, as ABSOLUTE instants. ⛔ `resolveRange` only ever resolves a NAMED preset here: its custom branch
 * substitutes an unreadable bound, swaps an inverted one and caps at 400 days — each a window nobody chose. So
 * `from`/`to` are read with `parseEatLocal` (EAT wall clock), an unreadable or inverted bound REFUSES, and a
 * date-only `to` covers that whole EAT day. A preset is resolved now and widened to whole minutes, so every
 * window parsed from an address can be written back as one (`contactAudienceParams`).
 */
function readWindow(sp: Record<string, Raw>, now: number): { ok: true; from: string | null; before: string | null } | { ok: false; param: string; reason: string } {
  const rangeOne = oneToken(sp.range);
  const fromOne = oneToken(sp.from);
  const toOne = oneToken(sp.to);
  if (!rangeOne.ok) return { ok: false, param: "range", reason: `“${clip(rangeOne.bad)}” is more than one window; keep one.` };
  if (!fromOne.ok) return { ok: false, param: "from", reason: `“${clip(fromOne.bad)}” is more than one start; keep one.` };
  if (!toOne.ok) return { ok: false, param: "to", reason: `“${clip(toOne.bad)}” is more than one end; keep one.` };
  const range = rangeOne.value?.toLowerCase();
  const fromRaw = fromOne.value;
  const toRaw = toOne.value;
  if (fromRaw !== undefined || toRaw !== undefined) {
    if (range !== undefined && range !== "custom") {
      return { ok: false, param: "range", reason: `“${clip(range)}” and a from/to window disagree; keep one of them.` };
    }
    let start: number | null = null;
    let end: number | null = null;
    if (fromRaw !== undefined) {
      const f = parseEatLocal(fromRaw);
      if (!f) return { ok: false, param: "from", reason: DATE_REASON(fromRaw) };
      start = f.ms;
    }
    if (toRaw !== undefined) {
      const t = parseEatLocal(toRaw);
      if (!t) return { ok: false, param: "to", reason: DATE_REASON(toRaw) };
      end = t.hasTime ? t.ms : t.ms + DAY_MS;
    }
    if (start !== null && end !== null && start >= end) return { ok: false, param: "from", reason: INVERTED_REASON };
    return { ok: true, from: start === null ? null : iso(start), before: end === null ? null : iso(end) };
  }
  if (range === undefined) return { ok: true, from: null, before: null };
  if (range === "custom") return { ok: false, param: "range", reason: "A custom window needs a “from” or a “to” date." };
  const preset = FULL_PRESETS.find((p) => p === range);
  if (preset === undefined) return { ok: false, param: "range", reason: `“${clip(range)}” is not a window this page offers (${FULL_PRESETS.join(", ")}).` };
  const w = resolveRange({ range: preset }, now);
  return { ok: true, from: iso(floorMinute(w.start)), before: iso(ceilMinute(w.end)) };
}

/**
 * The page's address → a filter. Multi-value keys (`consent`, `op`, `list`, `tag`, `source`) take comma lists
 * and repeats as one union; single-value keys take their first token; `q` takes its first value whole.
 * ⛔ An unknown VALUE of a known key REFUSES, naming the key. ⛔ `ids` REFUSES: a selection travels in a body.
 */
export function parseContactAudienceParams(sp: Record<string, string | string[] | undefined>, now = Date.now()): AudienceParse {
  if (tokens(sp.ids).length > 0) return refuse("ids", "A ticked selection cannot travel in an address. Tick the contacts on the page again.");

  // The first NON-BLANK value — the same one the link builder carries (`contactsLinkSp`), so `?q=&q=asha` cannot
  // list the whole book while every link on the page says "asha".
  const qFirst = (Array.isArray(sp.q) ? sp.q : [sp.q]).find((v) => String(v ?? "").trim() !== "");
  const q = canonicalQ(String(qFirst ?? ""));

  let consent: ContactConsentState[] | null = null;
  const consentRaw = tokens(sp.consent);
  if (consentRaw.length > 0) {
    const r = readEnum(consentRaw, CONSENT_STATES);
    if (!r.ok) return refuse("consent", ENUM_REASON.consent(r.bad));
    consent = r.value;
  }

  let operators: TzOperatorId[] | null = null;
  const opRaw = tokens(sp.op);
  if (opRaw.length > 0) {
    const r = readEnum(opRaw, OPERATOR_IDS);
    if (!r.ok) return refuse("op", ENUM_REASON.op(r.bad));
    operators = r.value;
  }

  let sources: ContactSource[] | null = null;
  const sourceRaw = tokens(sp.source);
  if (sourceRaw.length > 0) {
    const r = readEnum(sourceRaw, CONTACT_SOURCES);
    if (!r.ok) return refuse("source", ENUM_REASON.source(r.bad));
    sources = r.value;
  }

  let lists: string[] | null = null;
  const listRaw = tokens(sp.list);
  if (listRaw.length > 0) {
    const r = readIds(listRaw);
    if (!r.ok) return refuse("list", `“${clip(r.bad)}” is not a list.`);
    lists = r.value;
  }

  let tags: string[] | null = null;
  const tagRaw = tokens(sp.tag);
  if (tagRaw.length > 0) {
    const r = readTags(tagRaw);
    if (!r.ok) return refuse("tag", `“${clip(r.bad)}” is not a tag: a tag is 1–32 letters, digits, spaces, - or _.`);
    tags = r.value;
  }

  let suppressed: boolean | null = null;
  const suppressedOne = oneToken(sp.suppressed);
  if (!suppressedOne.ok) return refuse("suppressed", `“${clip(suppressedOne.bad)}” must be ONE of yes or no.`);
  const suppressedRaw = suppressedOne.value;
  if (suppressedRaw !== undefined) {
    const v = yesNo(suppressedRaw);
    if (v === undefined) return refuse("suppressed", `“${clip(suppressedRaw)}” must be yes or no.`);
    suppressed = v;
  }

  let player: boolean | null = null;
  const playerOne = oneToken(sp.player);
  if (!playerOne.ok) return refuse("player", `“${clip(playerOne.bad)}” must be ONE of yes or no.`);
  const playerRaw = playerOne.value;
  if (playerRaw !== undefined) {
    const v = yesNo(playerRaw);
    if (v === undefined) return refuse("player", `“${clip(playerRaw)}” must be yes or no.`);
    player = v;
  }

  let importId: string | null = null;
  const importOne = oneToken(sp.import);
  if (!importOne.ok) return refuse("import", `“${clip(importOne.bad)}” is more than one import; keep one.`);
  const importRaw = importOne.value;
  if (importRaw !== undefined) {
    if (!ID_SHAPE.test(importRaw)) return refuse("import", `“${clip(importRaw)}” is not an import.`);
    importId = importRaw;
  }

  const win = readWindow(sp, now);
  if (!win.ok) return refuse(win.param, win.reason);

  return {
    ok: true,
    filter: { q, consent, suppressed, operators, lists, tags, sources, player, importId, addedFrom: win.from, addedBefore: win.before, ids: null },
  };
}

/* ═══ D19 · THE ORACLE AS A FILTER — one rule for every door ═══════════════════════════════════════ */

/**
 * 🔴 D19 (and DECISIONS A1.1). Until U33 a consent row can only come from a PLAYER (sign-up, profile, opt-out) or
 * an erasure; a `source` of REGISTRATION means the number came with an account (and any source list says it by
 * what it leaves out); `player` says it outright. With a whole number in the search box, each answers "is this
 * person a player?" with one row or none.
 * 🔴 OD54 · AND `suppressed`, the same way (S10, from the U23 review). Until the importer goes live a STOP comes only
 * from a player's own opt-out link or from an officer, and U22's "Add contact" makes ANY number typeable — so whether a
 * typed number is under a stop answers "is this a player?" exactly as its consent does. Yes and no alike: "no" is the
 * same question asked the other way round.
 * So a viewer who may not read a number is REFUSED all four, before any row is read — and EVERY door asks this one
 * function: the page today, U23's bulk, U34's export, U40's recount.
 */
export const ROLE_REFUSAL_REASON = "This filter isn't available to your role: it would show which numbers belong to players.";
export function roleRefusal(f: ContactAudienceFilter, viewerReads: boolean): { param: string; reason: string } | null {
  if (viewerReads) return null;
  if (f.player !== null) return { param: "player", reason: ROLE_REFUSAL_REASON };
  if (f.sources !== null) return { param: "source", reason: ROLE_REFUSAL_REASON };
  if (f.consent !== null) return { param: "consent", reason: ROLE_REFUSAL_REASON };
  if (f.suppressed !== null) return { param: "suppressed", reason: ROLE_REFUSAL_REASON };
  return null;
}

/* ═══ THE JSON PARSER — posted and stored filters ══════════════════════════════════════════ */

function readJsonStrings(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  for (const x of v) if (typeof x !== "string") return null;
  return v as string[];
}

/** ⛔ A FULL ISO instant with its zone, or nothing: `Date.parse` alone reads "2026-09-01" as UTC midnight (three
 *  hours off EAT) and "Sep 1 2026" in the SERVER's time zone — a stored window must not move with the host. */
const JSON_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
function readJsonInstant(v: unknown): string | null {
  if (typeof v !== "string" || !JSON_INSTANT.test(v)) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? iso(ms) : null;
}

/**
 * A posted or stored filter (U23's action bodies, U35's `SmsCampaign.audienceFilter`) → a filter, STRICTLY.
 * ⛔ An unknown KEY refuses too: a predicate this parser does not know is a predicate it would drop, and a dropped
 * predicate widens the audience. `ids` are allowed here (≤ `MAX_AUDIENCE_IDS`, more REFUSES), and `[]` stays `[]`
 * — nothing.
 */
export function parseContactAudienceJson(raw: unknown): AudienceParse {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return refuse("filter", "The audience is not a filter.");
  const o = raw as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    if (!Object.prototype.hasOwnProperty.call(FILTER_KEY_SET, k)) {
      return refuse(k, `“${clip(k)}” is not part of an audience filter, and a part that is dropped would widen the audience.`);
    }
  }
  const has = (k: keyof ContactAudienceFilter) => o[k] !== undefined && o[k] !== null;
  const f: ContactAudienceFilter = { ...WHOLE_BOOK };

  if (has("q")) {
    if (typeof o.q !== "string") return refuse("q", "The search must be text.");
    f.q = canonicalQ(o.q);
  }
  if (has("consent")) {
    const xs = readJsonStrings(o.consent);
    const r = xs === null ? null : readEnum(xs, CONSENT_STATES);
    if (r === null) return refuse("consent", "Consent must be a list of consent states.");
    if (!r.ok) return refuse("consent", ENUM_REASON.consent(r.bad));
    f.consent = r.value;
  }
  if (has("operators")) {
    const xs = readJsonStrings(o.operators);
    const r = xs === null ? null : readEnum(xs, OPERATOR_IDS);
    if (r === null) return refuse("operators", "Operators must be a list of operator ids.");
    if (!r.ok) return refuse("operators", ENUM_REASON.op(r.bad));
    f.operators = r.value;
  }
  if (has("sources")) {
    const xs = readJsonStrings(o.sources);
    const r = xs === null ? null : readEnum(xs, CONTACT_SOURCES);
    if (r === null) return refuse("sources", "Sources must be a list of contact sources.");
    if (!r.ok) return refuse("sources", ENUM_REASON.source(r.bad));
    f.sources = r.value;
  }
  if (has("lists")) {
    const xs = readJsonStrings(o.lists);
    const r = xs === null ? null : readIds(xs);
    if (r === null) return refuse("lists", "Lists must be a list of list ids.");
    if (!r.ok) return refuse("lists", `“${clip(r.bad)}” is not a list.`);
    f.lists = r.value;
  }
  if (has("tags")) {
    const xs = readJsonStrings(o.tags);
    const r = xs === null ? null : readTags(xs);
    if (r === null) return refuse("tags", "Tags must be a list of tags.");
    if (!r.ok) return refuse("tags", `“${clip(r.bad)}” is not a tag.`);
    f.tags = r.value;
  }
  if (has("ids")) {
    const xs = readJsonStrings(o.ids);
    if (xs === null) return refuse("ids", "The selection must be a list of contact ids.");
    if (xs.length > MAX_AUDIENCE_IDS) {
      return refuse("ids", `A selection holds at most ${MAX_AUDIENCE_IDS.toLocaleString("en-GB")} contacts; this one has ${xs.length.toLocaleString("en-GB")}. Nothing was cut off — narrow it and try again.`);
    }
    const r = readIds(xs);
    if (!r.ok) return refuse("ids", `“${clip(r.bad)}” is not a contact id.`);
    f.ids = r.value;
  }
  if (has("suppressed")) {
    if (typeof o.suppressed !== "boolean") return refuse("suppressed", "Suppressed must be true or false.");
    f.suppressed = o.suppressed;
  }
  if (has("player")) {
    if (typeof o.player !== "boolean") return refuse("player", "Player must be true or false.");
    f.player = o.player;
  }
  if (has("importId")) {
    if (typeof o.importId !== "string" || !ID_SHAPE.test(o.importId)) return refuse("importId", "The import is not an import id.");
    f.importId = o.importId;
  }
  if (has("addedFrom")) {
    const at = readJsonInstant(o.addedFrom);
    if (at === null) return refuse("addedFrom", "The window's start is not an instant.");
    f.addedFrom = at;
  }
  if (has("addedBefore")) {
    const at = readJsonInstant(o.addedBefore);
    if (at === null) return refuse("addedBefore", "The window's end is not an instant.");
    f.addedBefore = at;
  }
  if (f.addedFrom !== null && f.addedBefore !== null && Date.parse(f.addedFrom) >= Date.parse(f.addedBefore)) {
    return refuse("addedFrom", INVERTED_REASON);
  }
  return { ok: true, filter: f };
}

/* ═══ THE CANONICAL FORMS ══════════════════════════════════════════════════════════════════ */

/**
 * The filter's ONE spelling: fixed key order, arrays deduplicated and sorted, nulls omitted, a whole number as its
 * bare key. Two spellings of one filter give one key. U35 stores it; U40 compares against it as the audience
 * watermark. ⛔ It never carries a relative window — `range` is resolved before a filter exists.
 */
export function contactAudienceKey(f: ContactAudienceFilter): string {
  const out: Record<string, unknown> = {};
  for (const k of FILTER_KEYS) {
    const v = f[k];
    if (v === null || v === undefined) continue;
    if (k === "q" && typeof v === "string") out.q = canonicalQ(v) ?? v;
    else out[k] = Array.isArray(v) ? canon(v as string[]) : v;
  }
  return JSON.stringify(out);
}

/**
 * Can this filter be written as an address, exactly? ⛔ Not a selection (`ids`), not an empty any-of (an address
 * can only drop it, which WIDENS), and not a window bound finer than a minute (`from`/`to` carry minutes).
 */
export function urlExpressible(f: ContactAudienceFilter): boolean {
  if (f.ids !== null) return false;
  for (const xs of [f.consent, f.operators, f.lists, f.tags, f.sources]) if (xs !== null && xs.length === 0) return false;
  for (const at of [f.addedFrom, f.addedBefore]) if (at !== null && Date.parse(at) % 60_000 !== 0) return false;
  return true;
}

/**
 * The filter → the page's address, for links (`parseContactAudienceParams` reads it back to the same filter).
 * ⛔ null when the filter cannot be written as one (`urlExpressible`): a link that silently dropped a selection or an
 * empty any-of would open the WHOLE book under a heading that says it is the audience.
 */
export function contactAudienceParams(f: ContactAudienceFilter): Record<string, string> | null {
  if (!urlExpressible(f)) return null;
  const out: Record<string, string> = {};
  const list = (xs: string[] | null) => (xs === null ? undefined : canon(xs).join(","));
  const put = (k: string, v: string | undefined) => { if (v !== undefined) out[k] = v; };
  put("q", f.q ?? undefined);
  put("consent", list(f.consent));
  put("suppressed", f.suppressed === null ? undefined : f.suppressed ? "yes" : "no");
  put("op", list(f.operators));
  put("list", list(f.lists));
  put("tag", list(f.tags));
  put("source", list(f.sources));
  put("player", f.player === null ? undefined : f.player ? "yes" : "no");
  put("import", f.importId ?? undefined);
  put("from", f.addedFrom === null ? undefined : formatEatLocal(Date.parse(f.addedFrom)));
  put("to", f.addedBefore === null ? undefined : formatEatLocal(Date.parse(f.addedBefore)));
  return out;
}

/** A run of nine or more digits — a national number or a key — is masked wherever a value could carry one. */
/**
 * Any run that READS AS A PHONE NUMBER — nine or more digits, single spaces, hyphens or underscores allowed between
 * them — masked to its last two digits (U34a review MINOR-3: a tag of "0712 345 678" went into the chain whole; the old
 * scrub caught consecutive digits only). The ONE scrub — the chain's filter here, and the export's free text.
 */
export function scrubPhoneRuns(s: string): string {
  return s.replace(/[0-9](?:[ _-]?[0-9]){8,}/g, (m) => `••••${m.replace(/[^0-9]/g, "").slice(-2)}`);
}
const scrubDigits = scrubPhoneRuns;

/**
 * The filter for the unprunable chain (U34's export audit, U40's send audit).
 * ⛔ No raw `255…` key and no nine-digit national run: a whole-number search is written masked (`+255••••78`), a
 * name search as its LENGTH only ("name search (4 characters)" — never the text), and a selection as a COUNT
 * (`selected`), never the ids.
 */
export function auditContactAudience(f: ContactAudienceFilter): Record<string, string | string[] | number | boolean> {
  const out: Record<string, string | string[] | number | boolean> = {};
  if (f.q !== null) {
    const s = contactsSearch(f.q);
    out.q = s.msisdn !== null ? maskPhone(s.msisdn) : `name search (${f.q.length} characters)`;
  }
  if (f.consent !== null) out.consent = [...f.consent];
  if (f.suppressed !== null) out.suppressed = f.suppressed;
  if (f.operators !== null) out.operators = [...f.operators];
  if (f.lists !== null) out.lists = f.lists.map(scrubDigits);
  if (f.tags !== null) out.tags = f.tags.map(scrubDigits);
  if (f.sources !== null) out.sources = [...f.sources];
  if (f.player !== null) out.player = f.player;
  if (f.importId !== null) out.importId = scrubDigits(f.importId);
  if (f.addedFrom !== null) out.addedFrom = f.addedFrom;
  if (f.addedBefore !== null) out.addedBefore = f.addedBefore;
  if (f.ids !== null) out.selected = f.ids.length;
  return out;
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "1 Sep 2026", or "1 Sep 2026 14:30" when the instant is not an EAT midnight. An EXCLUSIVE end that falls on a
 *  midnight is shown as the day before — the last day it covers. */
function eatLabel(at: string, exclusiveEnd: boolean): string {
  const ms = Date.parse(at);
  const local = new Date(ms + EAT_OFFSET_MS);
  const midnight = local.getUTCHours() === 0 && local.getUTCMinutes() === 0;
  const dayMs = midnight && exclusiveEnd ? ms - DAY_MS : ms;
  const key = eatDayKey(dayMs);
  const day = `${formatEatDay(key, MONTHS_EN, "en")} ${key.slice(0, 4)}`;
  if (midnight) return day;
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${day} ${p2(local.getUTCHours())}:${p2(local.getUTCMinutes())}`;
}

const anyOf = (xs: string[]) => (xs.length === 0 ? "none" : xs.join(" or "));

/**
 * The filter in words, one phrase per predicate ("Operator: Vodacom", "Consent: given", "Added 1 Sep 2026 →
 * 8 Sep 2026", "Name contains “asha”", "Number +255••••78"). Brand labels come from `TZ_OPERATORS`.
 * ⭐ THE describeAudience — the list page renders it above the table now, and U38's confirm screen must reuse it
 * (one implementation). A whole number is always written masked, whoever reads it.
 * 🔴 D19 / A1.1 / OD54 · it says what it is handed, for every role — so a masked viewer is never handed a description
 * naming a consent, source, player or stop predicate: the loader's "Showing contacts:" line and U23's preview describe a
 * filter only after `roleRefusal` passed it, and the rail's pills (`contacts-rail.ts`) describe one predicate each and
 * draw none of those four for that viewer.
 */
export function describeAudience(f: ContactAudienceFilter): string[] {
  const out: string[] = [];
  if (f.q !== null) {
    const s = contactsSearch(f.q);
    // Clipped to 40 characters: the phrase is shown in a line above the table and a long unbroken word would
    // stretch it past the card at 360.
    out.push(s.msisdn !== null ? `Number ${maskPhone(s.msisdn)}` : `Name contains “${f.q.length > 40 ? `${f.q.slice(0, 39)}…` : f.q}”`);
  }
  if (f.operators !== null) out.push(`Operator: ${anyOf(f.operators.map((op) => TZ_OPERATORS[op].brand))}`);
  if (f.consent !== null) out.push(`Consent: ${anyOf(f.consent.map((c) => CONSENT_WORDS[c]))}`);
  if (f.suppressed !== null) out.push(f.suppressed ? "Suppressed" : "Not suppressed");
  if (f.lists !== null) out.push(f.lists.length === 1 ? "In a chosen list" : `In any of ${f.lists.length} chosen lists`);
  if (f.tags !== null) out.push(`Tag: ${anyOf(f.tags)}`);
  if (f.sources !== null) out.push(`Source: ${anyOf(f.sources.map((s) => SOURCE_WORDS[s]))}`);
  if (f.player !== null) out.push(f.player ? "Players only" : "Not players");
  if (f.importId !== null) out.push(`From import ${scrubDigits(f.importId)}`);
  if (f.addedFrom !== null && f.addedBefore !== null) out.push(`Added ${eatLabel(f.addedFrom, false)} → ${eatLabel(f.addedBefore, true)}`);
  else if (f.addedFrom !== null) out.push(`Added from ${eatLabel(f.addedFrom, false)}`);
  else if (f.addedBefore !== null) out.push(`Added up to ${eatLabel(f.addedBefore, true)}`);
  if (f.ids !== null) out.push(f.ids.length === 1 ? "1 selected contact" : `${f.ids.length} selected contacts`);
  return out;
}

/** Does the filter narrow by anything but the search box? (The page shows "Showing contacts: …" only then — the
 *  box already shows its own text.) */
export function narrowsBeyondSearch(f: ContactAudienceFilter): boolean {
  return FILTER_KEYS.some((k) => k !== "q" && f[k] !== null);
}

/* ═══ THE ONE TRANSLATION ══════════════════════════════════════════════════════════════════ */

export const AUDIENCE_DEPS = { search: contactsSearch, ndcsFor: ndcsForOperators };

/**
 * The filter → the twins' where. ⛔ THE ONLY filter-to-where translation in `src/` (`test:contacts-audience` 1.5).
 * It ALWAYS sets `excludeSourceRef` to `ERASURE_EVIDENCE` (decision C3). `deps` exists for in-process red plants
 * only — production never passes it.
 */
export function toAudienceWhere(
  f: ContactAudienceFilter,
  deps: { search: typeof contactsSearch; ndcsFor: typeof ndcsForOperators } = AUDIENCE_DEPS,
): ContactAudienceWhere {
  const s = f.q === null ? { msisdn: null, name: null } : deps.search(f.q);
  return {
    msisdn: s.msisdn,
    name: s.name,
    consent: f.consent,
    suppressed: f.suppressed,
    ndcs: f.operators === null ? null : deps.ndcsFor(f.operators),
    listIds: f.lists,
    tags: f.tags,
    sources: f.sources,
    linked: f.player,
    importId: f.importId,
    createdFrom: f.addedFrom,
    createdBefore: f.addedBefore,
    ids: f.ids,
    excludeSourceRef: ERASURE_EVIDENCE,
  };
}

/* ═══ THE RESOLVER ═════════════════════════════════════════════════════════════════════════ */

export type ContactAudience = {
  readonly filter: ContactAudienceFilter;
  readonly key: string;
  /** How many contacts the audience holds. */
  count(): Promise<number>;
  /** Its counts by recorded consent and suppression (the KPI band asks this of `WHOLE_BOOK`). */
  breakdown(): Promise<ContactBookSummary>;
  /** One page. ⭐ CLAMPED: page 4 of a 3-row result is page 1 — read again when the clamp moved it — never "no
   *  matches" for an audience that has rows. */
  page(o: { sort: ContactPageSort; dir: "asc" | "desc"; page: string | undefined; perPage: number }): Promise<ContactPage & { page: number }>;
  /** A KEYSET walk on `id` ascending, `limit` clamped to [1, 1000]. ⛔ No phone number ever forms a cursor. */
  walk(afterId: string | null, limit: number): Promise<ContactWalk>;
};

const WALK_MAX = 1000;
const clampInt = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? Math.floor(n) : lo));

/** THE function every reader calls. `toWhere` exists for in-process red plants only. */
export function contactAudience(f: ContactAudienceFilter, toWhere: typeof toAudienceWhere = toAudienceWhere): ContactAudience {
  if (f.ids !== null && f.ids.length > MAX_AUDIENCE_IDS) {
    // ⛔ REFUSED, never truncated — the JSON parser refuses first; this is the belt for a filter built in code.
    throw new Error(`contactAudience: a selection holds at most ${MAX_AUDIENCE_IDS} contacts (got ${f.ids.length})`);
  }
  const where = toWhere(f);
  return {
    filter: f,
    key: contactAudienceKey(f),
    count: async () => db.marketingContact.countWhere(where),
    breakdown: async () => db.marketingContact.summaryWhere(where),
    page: async (o) => {
      const perPage = clampInt(o.perPage, 1, WALK_MAX);
      const read = (p: number) => db.marketingContact.page({ where, sort: o.sort, dir: o.dir, offset: (p - 1) * perPage, limit: perPage });
      const requested = clampPage(o.page, Number.MAX_SAFE_INTEGER, perPage);
      let result = await read(requested);
      const page = clampPage(o.page, result.total, perPage);
      if (page !== requested) result = await read(page);
      return { rows: result.rows, total: result.total, page };
    },
    walk: async (afterId, limit) => db.marketingContact.walk({ where, afterId, limit: clampInt(limit, 1, WALK_MAX) }),
  };
}

/**
 * The book's distinct tags with how many contacts carry each, most-carried first (U21's rail reads it). The erased
 * tombstone is left out, as from every reader. `limit` is clamped to [1, 1000].
 */
export async function contactTagCounts(limit = 200): Promise<ContactTagCount[]> {
  return db.marketingContact.tagCounts({ excludeSourceRef: ERASURE_EVIDENCE, limit: clampInt(limit, 1, WALK_MAX) });
}

/* ═══ U23 · THE BULK WRITES — set-based, over the where the count reads ═════════════════════════ */

/**
 * U23 · TAG, UNTAG, ADD TO A LIST, REMOVE — every row an audience holds, in set-based store writes (the twins'
 * `tagWhere`, `untagWhere`, `addWhere`, `removeWhere`), over EXACTLY the where `contactAudience` counts: the same
 * filter through the same translation, so the erased tombstone is in no bulk (decision C3) and an empty selection
 * writes nothing. ⛔ Those store members are SET paths, so `test:contacts-audience` §1.1 lets no file but this one call
 * them: U23's service (`contact-bulk.ts`) reaches them only through here. Each answer is the store's own count.
 * The two per-number writes — a withdrawal and a suppression — are not here: they write evidence one number at a time,
 * walked through `contactAudience(f).walk`, and live in `contact-bulk.ts`.
 */
export type ContactAudienceWrites = {
  /** Add `tag` (already through U28's ONE rule) to every row lacking it; a row holding `maxTags` is left as it was. */
  tag(tag: string, maxTags: number, stamp: ContactBulkStamp): Promise<ContactBulkCount>;
  untag(tag: string, stamp: ContactBulkStamp): Promise<ContactBulkCount>;
  /** An existing member keeps its original `addedAt`. */
  addToList(listId: string, stamp: ContactBulkStamp): Promise<ContactBulkCount>;
  /** Memberships go with the rows; the ledger and the stop list (keyed by number) stay. */
  remove(): Promise<ContactBulkCount>;
};

/** The writes for one audience. `toWhere` exists for in-process red plants only — production never passes it. */
export function contactAudienceWrites(f: ContactAudienceFilter, toWhere: typeof toAudienceWhere = toAudienceWhere): ContactAudienceWrites {
  if (f.ids !== null && f.ids.length > MAX_AUDIENCE_IDS) {
    // ⛔ REFUSED, never truncated — the same belt as `contactAudience`.
    throw new Error(`contactAudienceWrites: a selection holds at most ${MAX_AUDIENCE_IDS} contacts (got ${f.ids.length})`);
  }
  const where = toWhere(f);
  return {
    tag: async (tag, maxTags, stamp) => db.marketingContact.tagWhere(where, tag, maxTags, stamp),
    untag: async (tag, stamp) => db.marketingContact.untagWhere(where, tag, stamp),
    addToList: async (listId, stamp) => db.marketingContact.addWhere(where, listId, stamp),
    remove: async () => db.marketingContact.removeWhere(where),
  };
}
