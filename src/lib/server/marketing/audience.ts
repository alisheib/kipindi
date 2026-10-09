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
 * by a point lookup on the number. ⚠️ C8a · the tombstone alone is asked here, and that is enough: an audience is made
 * of book rows and accounts, and an erasure with no book row (the ledger's marker, `erasure-mark.ts`'s ONE rule) has
 * neither — an erased account's own number is a tombstone in `User` too, so the player arm never walks it — while the
 * send gate refuses every number on which an erasure stands (its latest ledger row is always a WITHDRAWN). The duplicate
 * checks, which CREATE rows, ask the ONE rule itself.
 * ⛔ THERE IS NO "REACHABLE" PREDICATE, BY DESIGN. Reachability is the send gate's per-recipient verdict
 * (`mayReceiveMarketingSms`), several reads each; hoisted into a list-build predicate it is the U9 defect —
 * the opted-out number sent to. `consent` and `suppressed` here are the CACHE columns, named as what they are.
 *
 * ⭐ U38a · THE CAMPAIGN AUDIENCE, IN THIS SAME FILE (decisions X7–X9, X25). The filter gains ONE axis, `population` —
 * the contact book (null, so every filter written before U38 reads exactly as it did), `players` or `both` — through the
 * same parser, key and describer; there is no second filter type. With `players` or `both` only the axes both arms can
 * honour may be set (the operator and the window); a book-only axis there is REFUSED, never dropped (C2). The JSON
 * parser reads the axis only at a campaign's door (`AudienceScope`) — a contact-book door refuses it by name. ONE walk,
 * `walkCampaignAudience`, visits the book by id and then the players by account id, its cursor `b:<id>` · `p:<id>` ·
 * `done` read here alone; a number the book holds is walked once, by its book row; erased tombstones, staff and
 * non-`+255` numbers never. Its length, `campaignAudienceCount`, IS the population U40 confirms and U42 enqueues (X9).
 * The will-receive split asks the send gate about each walked number (`audience-split.ts`).
 * ⭐ U38b · THE CAMPAIGN'S ADDRESS CARRIES THE POPULATION — ONE key, `pop` (`book` · `players` · `both`), read ONLY by the
 * campaign door's URL parser (`parseCampaignAudienceParams`: U24's parser for every other key, then `pop`, then
 * `populationProblem`) and written ONLY by `campaignAudienceParams`. The contact book's address REFUSES `pop` by name
 * (`parseContactAudienceParams`), as its JSON door refuses a population — never read as the book, never ignored.
 *
 * ⭐ vb5 · THE SHARED FIELD RULES, READ HERE, KEPT IN `contact-fields.ts` (S10 2026-10-03). A `?tag=` is read by
 * `parseFilterTag` — the write rule's own steps, where this file kept a narrower copy — and the phone-run mask the audit
 * and the export use is `contact-fields.ts`' `scrubPhoneRuns`, re-exported here so `export.ts` and `campaign-draft.ts`
 * keep importing it from here: the mask and the dialog's refusal are one rule. The search box's text is cleaned like a
 * stored name (no NUL reaches Postgres' contains), and a search longer than the grammar keeps is REFUSED, never cut.
 *
 * Guards: `test:contacts-audience` (structure, behaviour, the ONE-COUNT readers table, the keyset walk, the
 * masking of the audit and describe forms), `test:dal-parity` §21 (the two twins' translations, and since U38a the
 * player arm's keyset read) and `test:campaign-audience` (the population axis, the walk, the split).
 */
import { db } from "@/lib/server/store";
import type {
  ContactAudienceWhere, ContactBookSummary, ContactBulkCount, ContactBulkStamp, ContactConsentState, ContactPage,
  ContactPageSort, ContactSource, ContactTagCount, ContactWalk, MarketingContactPresenceQuery, PlayerWalk, PlayerWalkQuery,
} from "@/lib/server/store";
import { parseQuery, fieldNames, CONTACT_SEARCH, MAX_QUERY_LEN } from "@/lib/search";
import type { ParsedQuery, SearchTerm } from "@/lib/search";
import { TAG_ONE_AT_A_TIME_SENTENCE, cleanDisplayName, parseFilterTag, scrubPhoneRuns } from "@/lib/contacts/contact-fields";
import { parseTzNumber, ndcsForOperator, TZ_OPERATORS } from "@/lib/tz-msisdn";
import type { TzOperatorId } from "@/lib/tz-msisdn";
import { maskPhone, toMsisdn255 } from "@/lib/phone-normalize";
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
  /**
   * U38a · WHO the audience is drawn from (decision X7): null is THE CONTACT BOOK — U24's meaning, so every filter
   * written before U38 (the list's, the bulk bar's, the export's, a draft's stored one) reads exactly as it did —
   * `players` is the player accounts, `both` the book ∪ the players, one row per number (`walkCampaignAudience`).
   * ⛔ With `players` or `both` only the axes BOTH arms can honour may be set — the operator and the window
   * (`populationProblem`); the contact book's readers (`contactAudience`) refuse any population at all.
   */
  population: AudiencePopulation | null;
};

/** U38a · the population axis's values. The contact book is null (and the JSON spelling `"book"` reads as null), so
 *  one filter has one key. */
export type AudiencePopulation = "players" | "both";

/** Every key, in the ONE canonical order (`contactAudienceKey` writes them so). A Record, so a key added to the
 *  filter type and forgotten here is a compile error, not a predicate the JSON parser silently refuses.
 *  ⚠️ `population` is LAST on purpose: a key is written in this order and a null is omitted, so every key stored before
 *  U38 is byte-identical to the one this writes for the same filter. */
const FILTER_KEY_SET: Record<keyof ContactAudienceFilter, true> = {
  q: true, consent: true, suppressed: true, operators: true, lists: true, tags: true, sources: true,
  player: true, importId: true, addedFrom: true, addedBefore: true, ids: true, population: true,
};
const FILTER_KEYS = Object.keys(FILTER_KEY_SET) as (keyof ContactAudienceFilter)[];

/** The whole book: every predicate unconstrained (the erased tombstone is still left out — decision C3). */
export const WHOLE_BOOK: ContactAudienceFilter = Object.freeze({
  q: null, consent: null, suppressed: null, operators: null, lists: null, tags: null, sources: null,
  player: null, importId: null, addedFrom: null, addedBefore: null, ids: null, population: null,
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
 * and any unknown key are ignored (they cannot narrow); `ids` is a known key that always REFUSES in an address, and so
 * (U38b) is the campaign's `pop`, which only `parseCampaignAudienceParams` reads.
 * ⚠️ `contacts-query.ts` keeps its own copy for the page's links (it must stay free of the server graph so a
 * client rail can build links); `test:contacts-audience` 1.7 holds the two equal.
 */
export const CONTACT_AUDIENCE_URL_KEYS = ["q", "consent", "suppressed", "op", "list", "tag", "source", "player", "import", "range", "from", "to"] as const;

/**
 * ⭐ U38b · THE CAMPAIGN'S ADDRESS VOCABULARY — the contact book's keys and ONE more, `pop` (who the audience is drawn
 * from: `book` · `players` · `both`). Read only by `parseCampaignAudienceParams`, written only by `campaignAudienceParams`;
 * the composer's links, its save and its action carry exactly these (decision 1 of ENGINE-SPEC §4.4).
 */
export const CAMPAIGN_AUDIENCE_URL_KEYS = [...CONTACT_AUDIENCE_URL_KEYS, "pop"] as const;

/** A list or import id as the store mints them (cuid; the dev seed's `mc_seed_000`). Narrower can only refuse. */
const ID_SHAPE = /^[A-Za-z0-9_-]{1,64}$/;
/* ⭐ vb5 · A TAG IS READ BY THE ONE TAG RULE (`parseFilterTag`, `contact-fields.ts`) — the copy this file kept had no NFKC
 * and no combining marks, so a Devanagari or Arabic tag the form stores had no pill and no address, and a full-width
 * `?tag=` missed its stored form. The phone-run mask is the same file's (`scrubPhoneRuns`), re-exported for the export
 * and the draft save, which import it from here. */
export { scrubPhoneRuns };

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
 * ⛔ vb5 · TEXT IN THE BOX IS NEVER "NO CONSTRAINT" (C2). A lone quote, or quotes and a dash, leaves the grammar no word to
 * look for, and its `empty` reads as EVERY row in both twins — the whole book under "Name contains “"”", which a bulk
 * Tag would then write to. Such text is searched for literally, as one phrase: it matches what it says, which is in
 * practice nothing. (The grammar's own rule: it never errors and never matches everything.)
 */
export function contactsSearch(raw: string | null | undefined): ContactsSearch {
  const text = (raw ?? "").trim();
  if (text === "") return { msisdn: null, name: null };
  const parsed = parseTzNumber(text);
  if (parsed.verdict === "ok" && parsed.msisdn) return { msisdn: parsed.msisdn, name: null };
  const name = parseQuery(text, { fields: fieldNames(CONTACT_SEARCH) });
  if (name.mode !== "empty") return { msisdn: null, name };
  return { msisdn: null, name: { mode: "terms", raw: text, terms: [{ kind: "phrase", value: text.toLowerCase(), negated: false }] } };
}

/** ⛔ vb5 · C2: a search the grammar would CUT (`parseQuery` keeps its first `MAX_QUERY_LEN` units) is refused, naming
 *  the limit. */
export const SEARCH_TOO_LONG = `A search holds at most ${MAX_QUERY_LEN} characters.`;
/** ⛔ vb5 · a search of invisible or control characters only (a NUL in a hand-edited address): nothing in it can match a
 *  stored name, and "nothing" must never read as "no search" — the whole book. */
export const SEARCH_UNREADABLE = "This search holds only invisible characters — type a name or a number.";

type QRead = { ok: true; q: string | null } | { ok: false; reason: string };

/**
 * The box's text as a filter holds it: a whole number as its bare key (so two spellings are one filter), any other text
 * CLEANED AS A STORED NAME IS (`cleanDisplayName`: NFC, invisible format and control characters out, spaces collapsed)
 * — so no NUL ever reaches Postgres' contains, and a search finds the names the book stores — nothing as null.
 * ⛔ vb5 · C2, REFUSED, NEVER WIDENED OR CUT: text that cleans to nothing (`SEARCH_UNREADABLE`), and text longer than the
 * grammar keeps (`SEARCH_TOO_LONG` — counted as the box's own maxLength and the grammar count, in UTF-16 units, so
 * nothing the grammar would clip ever passes).
 */
function readQ(raw: string): QRead {
  if (raw.trim() === "") return { ok: true, q: null };
  const text = cleanDisplayName(raw);
  if (text === null) return { ok: false, reason: SEARCH_UNREADABLE };
  if (text.length > MAX_QUERY_LEN) return { ok: false, reason: SEARCH_TOO_LONG };
  return { ok: true, q: contactsSearch(text).msisdn ?? text };
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

/** An address is not typed into a box, so a separator inside one of its tags is said as the rule (vb5 review m5) — the
 *  rule's own sentence ("Type one tag at a time…") speaks to somebody at the bulk box. */
export const TAG_SEPARATOR_IN_ADDRESS = "A tag never holds a comma, ; or |.";

/** Every tag through THE ONE TAG RULE as a filter reads it (`parseFilterTag`); a refusal carries the rule's own sentence,
 *  the separator's said as the rule. */
function readTags(raw: string[]): { ok: true; value: string[] } | { ok: false; bad: string; why: string } {
  const out: string[] = [];
  for (const t of raw) {
    const v = parseFilterTag(t);
    if (!v.ok) return { ok: false, bad: t, why: v.sentence === TAG_ONE_AT_A_TIME_SENTENCE ? TAG_SEPARATOR_IN_ADDRESS : v.sentence };
    out.push(v.tag);
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
  // ⛔ U38b · `pop` is the CAMPAIGN's key (`parseCampaignAudienceParams` reads it, and hands this parser the rest): at the
  // contact book's address it is REFUSED BY NAME — never read as the book, and never ignored, which would list the book
  // under a heading that says players.
  if (tokens(sp.pop).length > 0) return refuse("pop", POPULATION_BOOK_DOOR_REASON);

  // The first NON-BLANK value — the same one the link builder carries (`contactsLinkSp`), so `?q=&q=asha` cannot
  // list the whole book while every link on the page says "asha".
  const qFirst = (Array.isArray(sp.q) ? sp.q : [sp.q]).find((v) => String(v ?? "").trim() !== "");
  const qRead = readQ(String(qFirst ?? ""));
  if (!qRead.ok) return refuse("q", qRead.reason);
  const q = qRead.q;

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
    if (!r.ok) return refuse("tag", `“${clip(r.bad)}” is not a tag. ${r.why}`);
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

  // ⚠️ `population` is not part of the contacts page's address vocabulary (`CONTACT_AUDIENCE_URL_KEYS`, which
  // `contacts-query.ts` mirrors): this parser's address always means the contact book. A campaign's population travels
  // in the campaign's own key, `pop`, read by `parseCampaignAudienceParams` alone (U38b).
  return {
    ok: true,
    filter: { q, consent, suppressed, operators, lists, tags, sources, player, importId, addedFrom: win.from, addedBefore: win.before, ids: null, population: null },
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

/* ═══ U38a · THE POPULATION AXIS — which axes a player account can honour ═══════════════════════ */

/** The JSON spellings of the axis — `book` is the contact book, held as null (one filter, one key). */
const POPULATIONS = ["book", "players", "both"] as const;

/**
 * The axes ONLY the contact book carries: the search (⛔ X25 — no number search ever runs against the player arm, where
 * a count of one or none is the oracle), the book's own consent, stop, source and link columns, its lists, tags and
 * imports, and a ticked selection of book rows. A player account has none of them.
 */
const BOOK_ONLY_AXES: readonly (keyof ContactAudienceFilter)[] = [
  "q", "consent", "suppressed", "lists", "tags", "sources", "player", "importId", "ids",
];

export const POPULATION_BOOK_ONLY_REASON =
  "This narrows the contact book only — a player account has no such field. Choose the contact book as the audience, or take it off.";

/**
 * Which door reads a posted or stored filter. ⛔ A CONTACT-BOOK door (`"book"`, the default — U23's bulk bar) acts on the
 * book alone: a population there is REFUSED BY NAME, never read as the book and never handed to the book's reader to
 * throw (a thrown read is a generic "failed" where a refusal names the axis). Only a campaign's door (`"campaign"`)
 * admits the axis (X7).
 */
export type AudienceScope = "book" | "campaign";
export const POPULATION_BOOK_DOOR_REASON =
  "Player accounts are a campaign's audience — this acts on the contact book alone. Take the audience choice off.";

/**
 * ⛔ A FILTER THAT CANNOT APPLY TO AN ARM IS REFUSED, NAMING THE AXIS — never dropped for that arm (which would WIDEN
 * the players to every account) and never read as "that arm matches nobody" (an audience quietly smaller than its
 * words). With `players` or `both`, only the operator and the window may narrow. null when the filter is coherent.
 */
export function populationProblem(f: ContactAudienceFilter): { param: string; reason: string } | null {
  if (f.population == null) return null;
  for (const k of BOOK_ONLY_AXES) if (f[k] !== null) return { param: k, reason: POPULATION_BOOK_ONLY_REASON };
  return null;
}

/* ═══ U38b · THE CAMPAIGN'S ADDRESS — the population in its own key ═══════════════════════════ */

/** The address key each book-only axis travels under, so a refusal at the campaign's address names the key the address
 *  holds (`tag`, never the filter's `tags`). */
const ADDRESS_KEY_OF: Readonly<Partial<Record<keyof ContactAudienceFilter, string>>> = {
  q: "q", consent: "consent", suppressed: "suppressed", lists: "list", tags: "tag", sources: "source", player: "player",
  importId: "import", ids: "ids",
};

/**
 * ⭐ U38b · THE CAMPAIGN DOOR'S ADDRESS → a filter (decision 1 of ENGINE-SPEC §4.4). U24's parser reads every key it knows
 * (an unknown value REFUSES, C2) with `pop` handed to nobody else; then `pop` — `book` · `players` · `both`, any case, ONE
 * value (two refuse; an unknown one refuses naming it) — the book held as null, so one filter has one key; then
 * `populationProblem`: a book-only axis beside `players` or `both` is REFUSED with its address key, never dropped (C2).
 * ⛔ The only reader of `pop`. The contact book's address refuses it (`parseContactAudienceParams`).
 */
export function parseCampaignAudienceParams(sp: Record<string, string | string[] | undefined>, now = Date.now()): AudienceParse {
  const rest: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(sp)) if (k !== "pop") rest[k] = v;
  const base = parseContactAudienceParams(rest, now);
  if (!base.ok) return base;
  const popOne = oneToken(sp.pop);
  if (!popOne.ok) return refuse("pop", `“${clip(popOne.bad)}” is more than one audience; keep one.`);
  let population: AudiencePopulation | null = null;
  if (popOne.value !== undefined) {
    const said = popOne.value.toLowerCase();
    const p = POPULATIONS.find((x) => x === said);
    if (p === undefined) return refuse("pop", `“${clip(popOne.value)}” is not an audience a campaign can go to (${POPULATIONS.join(", ")}).`);
    population = p === "book" ? null : p;
  }
  const filter: ContactAudienceFilter = { ...base.filter, population };
  const mixed = populationProblem(filter);
  if (mixed !== null) return refuse(ADDRESS_KEY_OF[mixed.param as keyof ContactAudienceFilter] ?? mixed.param, mixed.reason);
  return { ok: true, filter };
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
 * U38a · `scope` names the door (`AudienceScope`): the population axis is read only at a campaign's door. ⭐ U38b · both
 * campaign doors that read a stored filter (`composer-loader.ts`, `campaign-draft.ts`) pass `"campaign"`, so a draft saved
 * with a population reads back at both; the contact book's doors keep the default and refuse it by name.
 */
export function parseContactAudienceJson(raw: unknown, scope: AudienceScope = "book"): AudienceParse {
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
    const qRead = readQ(o.q);
    if (!qRead.ok) return refuse("q", qRead.reason);
    f.q = qRead.q;
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
    if (!r.ok) return refuse("tags", `“${clip(r.bad)}” is not a tag. ${r.why}`);
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
  // U38a · the population axis — an unknown value REFUSES (C2), and `book` is held as null so one filter has one key.
  if (has("population")) {
    const given = o.population;
    const p = typeof given === "string" ? POPULATIONS.find((x) => x === given) : undefined;
    if (p === undefined) {
      return refuse("population", `“${clip(String(given))}” is not an audience population (${POPULATIONS.join(", ")}).`);
    }
    if (p !== "book" && scope !== "campaign") return refuse("population", POPULATION_BOOK_DOOR_REASON);
    f.population = p === "book" ? null : p;
  }
  const mixed = populationProblem(f);
  if (mixed !== null) return refuse(mixed.param, mixed.reason);
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
    if (k === "q" && typeof v === "string") {
      // A parsed filter's q is already canonical; a filter built in code is canonicalised when it can be, else kept.
      const r = readQ(v);
      out.q = r.ok && r.q !== null ? r.q : v;
    } else out[k] = Array.isArray(v) ? canon(v as string[]) : v;
  }
  return JSON.stringify(out);
}

/**
 * Can this filter be written as an address, exactly? ⛔ Not a selection (`ids`), not an empty any-of (an address
 * can only drop it, which WIDENS), and not a window bound finer than a minute (`from`/`to` carry minutes).
 */
export function urlExpressible(f: ContactAudienceFilter): boolean {
  if (f.ids !== null) return false;
  // U38a · the contact book's address always means the contact book (`parseContactAudienceParams`), so a population
  // cannot be written as one — a link that dropped it would open the BOOK under a heading that says players. (U38b · the
  // campaign's own address carries it, `campaignAudienceParams`.)
  if (f.population != null) return false;
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

/**
 * ⭐ U38b · THE FILTER → THE CAMPAIGN'S ADDRESS (`parseCampaignAudienceParams` reads it back to the same filter): the
 * contact book's keys, then `pop` — ALWAYS written, `book` for the contact book, so an address built here is an audience
 * someone chose and a save that posts it replaces a stored population with the book when that is what was chosen.
 * ⛔ null when it cannot be written exactly: a selection (`ids`), an empty any-of, a bound finer than a minute
 * (`urlExpressible`), or a book-only axis beside a population (the parser would refuse the address it built).
 */
export function campaignAudienceParams(f: ContactAudienceFilter): Record<string, string> | null {
  if (populationProblem(f) !== null) return null;
  const book = contactAudienceParams({ ...f, population: null });
  return book === null ? null : { ...book, pop: f.population ?? "book" };
}

/**
 * Any run that READS AS A PHONE NUMBER is masked to its last two digits wherever a value could carry one — the chain's
 * filter here and the export's free text (U34a review MINOR-3: a tag of "0712 345 678" went into the chain whole).
 * ⭐ vb5 · THE ONE SCRUB IS `contact-fields.ts`' `scrubPhoneRuns` (re-exported above): the same scanner as the
 * `holdsPhoneRun` that refuses a number in a name or a tag, so "(0754) 123 456", "0754.123.456" and the no-break-space
 * and en-dash spellings — which the single-separator copy this file kept let through — are masked too.
 */
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
  if (f.population != null) out.population = f.population;
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

/** One search word as the description quotes it, clipped at 40 characters: the phrase is shown in a line above the table,
 *  and a long unbroken word would stretch it past the card at 360. */
const quoteWord = (t: SearchTerm) => `“${t.value.length > 40 ? `${t.value.slice(0, 39)}…` : t.value}”`;

/**
 * ⛔ vb7 · A NAME SEARCH, SAID FROM WHAT THE GRAMMAR WILL RUN — never echoed as typed. The shared grammar reads `-zzz` as
 * an EXCLUDED word, so `?q=-zzz` matches nearly the whole book, and it used to be described as "Name contains “-zzz”" —
 * the opposite of what it did, above a list a bulk action would then write to. Now: every wanted word must appear, in
 * any order ("Name contains “asha” and “juma”"), a quoted phrase is one phrase, an excluded word is "not" ("Name
 * contains “asha”, not “juma”"), and a search of excluded words alone says so ("Name doesn't contain “zzz”"). The
 * grammar lower-cases what it matches, and the description quotes what is matched. Each word is clipped at 40.
 */
function describeNameSearch(name: ParsedQuery | null, raw: string): string {
  if (name === null || name.mode !== "terms") return `Name contains “${raw.length > 40 ? `${raw.slice(0, 39)}…` : raw}”`;
  const wanted = name.terms.filter((t) => !t.negated).map(quoteWord);
  const unwanted = name.terms.filter((t) => t.negated).map(quoteWord);
  if (wanted.length === 0) return `Name doesn't contain ${unwanted.join(" or ")}`;
  const contains = `Name contains ${wanted.join(" and ")}`;
  return unwanted.length === 0 ? contains : `${contains}, not ${unwanted.join(" or ")}`;
}

/** U38a · the population in words — the first phrase whenever it is set. The book (null) says nothing, as before. */
const POPULATION_WORDS: Record<AudiencePopulation, string> = { players: "Player accounts", both: "Contact book and player accounts" };
/** The window's verb: a book row is ADDED, an account JOINS (its `createdAt`), and the union says both. */
const WINDOW_VERB: Record<AudiencePopulation | "book", string> = { book: "Added", players: "Joined", both: "Added or joined" };

/**
 * The filter in words, one phrase per predicate ("Operator: Vodacom", "Consent: given", "Added 1 Sep 2026 →
 * 8 Sep 2026", "Name contains “asha”", "Name doesn't contain “zzz”", "Number +255••••78"). Brand labels come from
 * `TZ_OPERATORS`; a name search is said from the terms the grammar runs (`describeNameSearch`, vb7).
 * ⭐ THE describeAudience — the list page renders it above the table now, and U38's confirm screen must reuse it
 * (one implementation). A whole number is always written masked, whoever reads it.
 * 🔴 D19 / A1.1 / OD54 · it says what it is handed, for every role — so a masked viewer is never handed a description
 * naming a consent, source, player or stop predicate: the loader's "Showing contacts:" line and U23's preview describe a
 * filter only after `roleRefusal` passed it, and the rail's pills (`contacts-rail.ts`) describe one predicate each and
 * draw none of those four for that viewer.
 */
export function describeAudience(f: ContactAudienceFilter): string[] {
  const out: string[] = [];
  if (f.population != null) out.push(POPULATION_WORDS[f.population]);
  if (f.q !== null) {
    const s = contactsSearch(f.q);
    // ⛔ vb7 · a whole number is said masked; a name search is said from the terms the grammar runs, each word clipped at
    // 40 characters (`describeNameSearch`) — never the raw text, which called an excluded word a wanted one.
    out.push(s.msisdn !== null ? `Number ${maskPhone(s.msisdn)}` : describeNameSearch(s.name, f.q));
  }
  if (f.operators !== null) out.push(`Operator: ${anyOf(f.operators.map((op) => TZ_OPERATORS[op].brand))}`);
  if (f.consent !== null) out.push(`Consent: ${anyOf(f.consent.map((c) => CONSENT_WORDS[c]))}`);
  if (f.suppressed !== null) out.push(f.suppressed ? "Suppressed" : "Not suppressed");
  if (f.lists !== null) out.push(f.lists.length === 1 ? "In a chosen list" : `In any of ${f.lists.length} chosen lists`);
  if (f.tags !== null) out.push(`Tag: ${anyOf(f.tags)}`);
  if (f.sources !== null) out.push(`Source: ${anyOf(f.sources.map((s) => SOURCE_WORDS[s]))}`);
  if (f.player !== null) out.push(f.player ? "Players only" : "Not players");
  if (f.importId !== null) out.push(`From import ${scrubDigits(f.importId)}`);
  const verb = WINDOW_VERB[f.population ?? "book"];
  if (f.addedFrom !== null && f.addedBefore !== null) out.push(`${verb} ${eatLabel(f.addedFrom, false)} → ${eatLabel(f.addedBefore, true)}`);
  else if (f.addedFrom !== null) out.push(`${verb} from ${eatLabel(f.addedFrom, false)}`);
  else if (f.addedBefore !== null) out.push(`${verb} up to ${eatLabel(f.addedBefore, true)}`);
  if (f.ids !== null) out.push(f.ids.length === 1 ? "1 selected contact" : `${f.ids.length} selected contacts`);
  return out;
}

/** Does the filter narrow by anything but the search box? (The page shows "Showing contacts: …" only then — the
 *  box already shows its own text.) */
export function narrowsBeyondSearch(f: ContactAudienceFilter): boolean {
  return FILTER_KEYS.some((k) => k !== "q" && f[k] !== null);
}

/** U38b · Is this the WHOLE of its population — every predicate null but `population`? (The composer then says "everyone"
 *  in the population's own words: the contact book, every player account, or both.) */
export function isUnfilteredCampaignAudience(f: ContactAudienceFilter): boolean {
  return FILTER_KEYS.every((k) => k === "population" || f[k] === null);
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
  if (f.population != null) {
    // ⛔ U38a · the CONTACT BOOK'S reader never reads a campaign population as the book — a bulk, an export or a count
    // handed `players` would otherwise act on the book under a heading that says players. The campaign audience is
    // walked by `walkCampaignAudience`, which hands this function the book arm alone.
    throw new Error(`contactAudience: the contact book's reader was handed the population "${f.population}" — walk it with walkCampaignAudience`);
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
 * `tagWhere`, `untagWhere`, `addWhere`, `removeWhere`, and vb7's `removeBoundWhere`), over EXACTLY the where
 * `contactAudience` counts: the same
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
  /** ⭐ vb7 (review m1) · REMOVE the rows the audience holds AMONG `ids` — a bulk Remove's confirmed ids — ALL OR
   *  NOTHING: ONE transaction in Postgres however many chunks the ids take, one pass in the memory twin. A row that
   *  stopped matching is not removed (the where still binds), and a row that joined is in no id. */
  removeBound(ids: readonly string[]): Promise<ContactBulkCount>;
};

/** The writes for one audience. `toWhere` exists for in-process red plants only — production never passes it. */
export function contactAudienceWrites(f: ContactAudienceFilter, toWhere: typeof toAudienceWhere = toAudienceWhere): ContactAudienceWrites {
  if (f.ids !== null && f.ids.length > MAX_AUDIENCE_IDS) {
    // ⛔ REFUSED, never truncated — the same belt as `contactAudience`.
    throw new Error(`contactAudienceWrites: a selection holds at most ${MAX_AUDIENCE_IDS} contacts (got ${f.ids.length})`);
  }
  if (f.population != null) {
    // ⛔ U38a · the same belt: a bulk write acts on the contact book, never on a campaign population.
    throw new Error(`contactAudienceWrites: a bulk write acts on the contact book — it was handed the population "${f.population}"`);
  }
  const where = toWhere(f);
  return {
    tag: async (tag, maxTags, stamp) => db.marketingContact.tagWhere(where, tag, maxTags, stamp),
    untag: async (tag, stamp) => db.marketingContact.untagWhere(where, tag, stamp),
    addToList: async (listId, stamp) => db.marketingContact.addWhere(where, listId, stamp),
    remove: async () => db.marketingContact.removeWhere(where),
    removeBound: async (ids) => db.marketingContact.removeBoundWhere(where, ids),
  };
}

/* ═══ U38a · THE CAMPAIGN AUDIENCE — the book ∪ the players, ONE walk (decisions X7–X9, X25) ═════════════════════ */

export const CAMPAIGN_SEARCH_REFUSAL_REASON =
  "A search isn't available to your role on a campaign's audience: counting who will receive asks the sending rules about each number, which would show which numbers belong to players.";
/** ⭐ ONE sentence, here: the campaign door below and U37's draft save (`campaign-draft.ts`, which re-exports it). */
export const CAMPAIGN_AUDIENCE_SELECTION = "A campaign's audience is a filter, never a list of ticked contacts.";

/**
 * 🔴 X25 / D19 · THE CAMPAIGN AUDIENCE'S ROLE RULE — U24's `roleRefusal` (consent, source, player, stop), and the search.
 * ⛔ A viewer who may not read a number is refused ANY search here. Decided in S10 for a whole number: the split asks the
 * gate about the book row's number, the gate reads the player table, so one row's answer says "is this a player".
 * ⭐ U38a widens it to a NAME search on the same ground — a name narrowed to one book row makes the split's figures that
 * row's own verdict, the protected line included. A reader is refused nothing new. A population carrying a book-only
 * axis (`populationProblem`) is refused here too, for a filter built in code.
 * ⛔ A TICKED SELECTION (`ids`) IS REFUSED FOR EVERY ROLE, first: a campaign's audience is a filter, never a list of
 * people (X13 — U37's save and `assertAudienceFilter` refuse it too), and one ticked row would make a masked viewer's
 * figures that row's own verdict, the protected line included.
 * ⚠️ RESIDUAL: any axis that narrows the audience to one known person — a tag, a list, an import, a one-minute window —
 * would make a masked viewer's figures that person's verdict. ⭐ U38b answers it with OD65: before a campaign sends, a
 * masked viewer is shown the COUNT ALONE at every size — the ONE walk's count, the gate never asked (`composeAudienceCount`).
 * ⛔ OD66 · AND NEVER BOTH POPULATIONS AT ONCE: the walk counts a number the book holds ONCE (a player whose number a
 * live book row holds is skipped in the player phase), so with both arms on, adding one contact moves the count by 0 or 1
 * as that number is or is not a player's — "is this a player?" again, through a bare count. A masked viewer may count the
 * book or the players, one at a time; a reader may count both.
 */
export const CAMPAIGN_BOTH_MASKED_REASON = "For your role, choose the contact book or player accounts — not both together.";
export function campaignAudienceRefusal(f: ContactAudienceFilter, viewerReads: boolean): { param: string; reason: string } | null {
  if (f.ids !== null) return { param: "ids", reason: CAMPAIGN_AUDIENCE_SELECTION };
  const role = roleRefusal(f, viewerReads);
  if (role !== null) return role;
  if (!viewerReads && f.q !== null) return { param: "q", reason: CAMPAIGN_SEARCH_REFUSAL_REASON };
  // ⛔ OD66 · both populations at once count a book-held player once — a masked viewer's count would say who is a player.
  if (!viewerReads && f.population === "both") return { param: "pop", reason: CAMPAIGN_BOTH_MASKED_REASON };
  return populationProblem(f);
}

/** The player arm, as the store's keyset read takes it: the operator's prefixes from the ONE table, and the window. */
export type PlayerArm = Pick<PlayerWalkQuery, "ndcs" | "createdFrom" | "createdBefore">;
/** A filter's two arms. null = that arm is off: the book for `players`, the players for the book (population null). */
export type AudienceArms = { book: ContactAudienceFilter | null; players: PlayerArm | null };

/** The filter → its arms. ⛔ THROWS on a population carrying a book-only axis — the JSON parser refuses it first; this
 *  is the belt for a filter built in code, so an arm is never silently dropped (wider) or emptied (narrower). */
export function audienceArms(f: ContactAudienceFilter): AudienceArms {
  const mixed = populationProblem(f);
  if (mixed !== null) throw new Error(`audienceArms: "${mixed.param}" cannot narrow player accounts — refused, never dropped`);
  return {
    book: f.population === "players" ? null : { ...f, population: null },
    players: f.population == null ? null : {
      ndcs: f.operators === null ? null : ndcsForOperators(f.operators),
      createdFrom: f.addedFrom,
      createdBefore: f.addedBefore,
    },
  };
}

/**
 * One row of the campaign audience, as U42 will enqueue it. ⛔ A book row carries its CONTACT id and its own
 * `linkedUserId` — the book's link, never a test of "is this a player" (the gate finds the account by NUMBER) — and a
 * player row its ACCOUNT id. `msisdn` is the bare `255…` key either way.
 */
export type CampaignAudienceRow =
  | { kind: "contact"; msisdn: string; contactId: string; linkedUserId: string | null; name: string | null }
  | { kind: "player"; msisdn: string; userId: string };
/** One page of the walk and where to resume — `b:<contact id>` · `p:<account id>` · `done`. ⭐ A page may hold fewer
 *  rows than asked, even none, and only `done` ends the walk. */
export type CampaignAudiencePage = { rows: CampaignAudienceRow[]; next: string };

/** The most rows one call of the walk returns — the book walk's own clamp. */
export const CAMPAIGN_WALK_MAX = WALK_MAX;

/** The store reads the player phase makes — swappable for the suite's in-process red plants; production never passes it. */
export type CampaignWalkDeps = {
  players: (q: PlayerWalkQuery) => Promise<PlayerWalk>;
  inBook: (q: MarketingContactPresenceQuery) => Promise<string[]>;
};
/** Frozen: the default is production's walk, and U42's enqueue will read it — nothing may reassign a member in-process. */
export const CAMPAIGN_WALK_DEPS: Readonly<CampaignWalkDeps> = Object.freeze({
  players: async (q: PlayerWalkQuery) => db.user.playerWalk(q),
  inBook: async (q: MarketingContactPresenceQuery) => db.marketingContact.msisdnsPresent(q),
});

type WalkAt = { phase: "book"; after: string | null } | { phase: "players"; after: string | null } | { phase: "done" };

/** ⛔ THE CURSOR IS READ HERE AND NOWHERE ELSE (decision X8). A cursor this walk did not write — or one naming an arm the
 *  filter does not have — REFUSES: never read as "start again" (a restart re-sends) and never as "done". */
function readCampaignCursor(cursor: string | null, arms: AudienceArms): WalkAt {
  if (cursor === null) {
    if (arms.book !== null) return { phase: "book", after: null };
    return arms.players !== null ? { phase: "players", after: null } : { phase: "done" };
  }
  if (cursor === "done") return { phase: "done" };
  const phase = cursor.slice(0, 2);
  const after = cursor.slice(2);
  // ⛔ An id of digits alone is refused too: no id this walk writes is one, and that shape is a phone number — the stored
  // cursor's own rule (`campaign-model.ts` `isCursor`, U35's `enqueueCursor`), so the two can never disagree.
  if ((phase !== "b:" && phase !== "p:") || !ID_SHAPE.test(after) || /^[0-9]+$/.test(after)) {
    throw new Error(`walkCampaignAudience: “${clip(cursor)}” is not a cursor this walk wrote`);
  }
  if (phase === "b:") {
    if (arms.book === null) throw new Error("walkCampaignAudience: a contact-book cursor on an audience with no contact book");
    return { phase: "book", after };
  }
  if (arms.players === null) throw new Error("walkCampaignAudience: a player cursor on an audience with no player accounts");
  return { phase: "players", after };
}

/**
 * ⭐ THE ONE WALK (decision X8) — the campaign audience in its ONE order: the book by contact id, then the players by
 * account id. U38a's count and split read it; U40's confirmation counts it; U42 enqueues it.
 * ⛔ A NUMBER THE BOOK HOLDS IS WALKED ONCE, BY ITS BOOK ROW: with both arms on, a player whose number a LIVE book row
 * holds is skipped in the player phase — the book row speaks for the number, so a window that admits the account but not
 * the row leaves that person out (narrower), never in twice. An ERASED tombstone is in no audience (C3): it is never
 * walked, and it does not hide the player at its number. Staff, erased accounts and non-`+255` numbers are never walked
 * (`user.playerWalk`).
 * ⛔ Keyset reads only, `>` the cursor: a row written between two calls is never visited twice, and no phone number ever
 * forms a cursor. `deps` exists for in-process red plants only — production never passes it.
 */
export async function walkCampaignAudience(
  f: ContactAudienceFilter,
  cursor: string | null,
  limit: number,
  deps: CampaignWalkDeps = CAMPAIGN_WALK_DEPS,
): Promise<CampaignAudiencePage> {
  const arms = audienceArms(f);
  const take = clampInt(limit, 1, CAMPAIGN_WALK_MAX);
  const at = readCampaignCursor(cursor, arms);
  if (at.phase === "done") return { rows: [], next: "done" };
  let playersAfter: string | null = at.after;
  if (at.phase === "book" && arms.book !== null) {
    const page = await contactAudience(arms.book).walk(at.after, take);
    const last = page.rows[page.rows.length - 1];
    if (last !== undefined) {
      const rows = page.rows.map((c): CampaignAudienceRow => ({
        kind: "contact", msisdn: c.msisdn, contactId: c.id, linkedUserId: c.userId, name: c.displayName,
      }));
      // More book rows → resume after the last. The book done → the same cursor moves on to the players at the next
      // call, or the walk is done when there is no player arm.
      const next = page.nextAfterId !== null ? `b:${page.nextAfterId}` : arms.players !== null ? `b:${last.id}` : "done";
      return { rows, next };
    }
    if (arms.players === null) return { rows: [], next: "done" };
    playersAfter = null; // the book is exhausted at this cursor: the players, from the first account
  }
  if (arms.players === null) return { rows: [], next: "done" };
  const walk = await deps.players({ afterId: playersAfter, limit: take, ...arms.players });
  if (walk.rows.length === 0) return { rows: [], next: "done" };
  const keys = walk.rows.map((u) => toMsisdn255(u.phoneE164));
  const heldByBook = arms.book === null
    ? new Set<string>()
    : new Set(await deps.inBook({ msisdns: keys, excludeSourceRef: ERASURE_EVIDENCE }));
  const rows: CampaignAudienceRow[] = [];
  walk.rows.forEach((u, i) => {
    if (!heldByBook.has(keys[i])) rows.push({ kind: "player", msisdn: keys[i], userId: u.id });
  });
  return { rows, next: walk.nextAfterId !== null ? `p:${walk.nextAfterId}` : "done" };
}

/**
 * ⭐ THE CAMPAIGN-AUDIENCE COUNT (decision X9) — how many rows the ONE walk yields. This IS the population U40 fences and
 * U42 enqueues — never the book-only `contactAudience(f).count()`, which would leave players unconfirmed or refuse every
 * Start. It walks and counts; who will RECEIVE is the gate's answer (`audience-split.ts`). `walk` exists for in-process
 * red plants only — production never passes it.
 */
export async function campaignAudienceCount(
  f: ContactAudienceFilter,
  walk: typeof walkCampaignAudience = walkCampaignAudience,
): Promise<number> {
  let n = 0;
  let cursor: string | null = null;
  for (;;) {
    const page: CampaignAudiencePage = await walk(f, cursor, CAMPAIGN_WALK_MAX);
    n += page.rows.length;
    if (page.next === "done") return n;
    if (page.next === cursor) throw new Error("campaignAudienceCount: the walk did not move — refusing to loop");
    cursor = page.next;
  }
}
