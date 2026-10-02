/**
 * U21 · THE CONTACT BOOK'S FILTER RAIL — ITS MODEL. Built in ONE function, so the page and `test:contacts-page`
 * build the same rail.
 *
 * ⭐ THE DESK IDIOM, ONE SECTION OVER. `house-console-read.ts` builds the desk's rail — every label, every href, and
 * which option is in force — and `desk/activity-filters.tsx` draws it without a decision of its own. This file is
 * the builder and `contact-filters.tsx` the drawing: the rail file types no route, no enum and no label.
 *
 * ⛔ U21 TURNS NO FILTER INTO A QUERY (decision C1). What is APPLIED is read by U24's own URL parser
 * (`parseContactAudienceParams`) ONE KEY AT A TIME — so the rail can never disagree with what the resolver ran, and
 * one unreadable key does not blank the other axes. Every href is the ONE href builder's (`contactsHref`, C9): a
 * pill changes its own axis and carries the search, the sort and every other filter — never `page`, never `edit`.
 *
 * 🔴 D19 / A1.1 · THE RAIL IS ROLE-SHAPED. There is NO player axis, for anyone. For a viewer whose identity.contact
 * cell is not `read`, Consent and Source are not drawn at all — no axis and no pill — and neither is an applied
 * `player`: until U33 a recorded consent can only be a player's, Source "Sign-up" means the number came with an
 * account, and each answers "is this a player?" for a number the viewer typed. The loader REFUSES all three for that
 * viewer before any row is read (`roleRefusal`), and the refused row names the parameter with Clear filters.
 *
 * ⛔ AN APPLIED VALUE IS ALWAYS A VISIBLE, SELECTED PILL. A list id the book has no list for ("Unknown list"), a tag
 * outside the drawn top 20, an operator with no live prefix (Telxer), two values at once (`?op=AIRTEL,VODACOM`), even
 * a value the parser refused (`?op=NOKIA`, drawn as typed): each is appended to its own axis, selected, and that
 * axis's "Any" clears it. A filter in force that the rail cannot show is a filter the officer cannot remove.
 * U24's recorded extension (`player`, `import`, `range`/`from`/`to`) has NO axis: an applied one is ONE selected
 * pill whose press removes it (toggle semantics), and Clear filters removes it too.
 * ⛔ A FAILED READ STILL DRAWS THE RAIL, FROM THE ADDRESS (§5.15): lists and tags are null, so those two axes carry
 * only what is applied — and the rail draws Clear filters itself, because on that page nothing else does.
 * ⛔ A PILL NEVER WRAPS OR SHRINKS (the kit's own geometry), so a label past `RAIL_LABEL_MAX` is clipped here and its
 * whole text rides in the pill's hover title — a 60-character list name must not run off a 360px screen.
 *
 * ⭐ THE OPTIONS COME FROM THE BOOK'S OWN TABLES, NEVER A TYPED LIST. Operators: every licensee holding a SENDABLE
 * prefix in the ONE numbering table (C10), labelled `TZ_OPERATORS[id].brand` — the value is the licensee id, so a
 * rebrand (Tigo → Yas, 2024) changes a label and never a bookmarked address. Tags: the book's own, most-carried first
 * (`contactTagCounts`, U24/M8), one pill per `tagKey` (C11). Lists: the book's lists, A to Z.
 * ⭐ A COUNT IS SHOWN ONLY WHERE IT IS TRUE. A tag pill carries its whole-book count only while nothing else narrows
 * the list — the one state in which that count is exactly what pressing the pill lists. Under any other filter or a
 * search the count would describe a list the pill does not open, so it is omitted (FilterPill: never invent one).
 *
 * ⚠️ ONE KNOWN SKEW, accepted: a relative window (`?range=7d`) is resolved to instants by the parser at read time, so
 * this rail's label and the loader's filter are resolved milliseconds apart and can straddle a minute boundary. The
 * label is minute-precise; nothing in a link depends on it (no link writes `range`).
 *
 * Guard: `test:contacts-page` (the rail model, every href, the role-shaped rail) · red: `red:contacts-page`.
 */
import { describeAudience, ndcsForOperators, parseContactAudienceParams, WHOLE_BOOK } from "@/lib/server/marketing/audience";
import type { ContactAudienceFilter } from "@/lib/server/marketing/audience";
import type { ContactConsentState, ContactSource, ContactTagCount, StoredContactList } from "@/lib/server/store";
import { TZ_MOBILE_NDCS, TZ_OPERATORS } from "@/lib/tz-msisdn";
import type { TzOperatorId } from "@/lib/tz-msisdn";
import { tagKey } from "@/lib/contacts/contact-fields";
import { contactsHref, contactsLinkSp, contactsClearFiltersHref, CONTACTS_FILTER_KEYS } from "./contacts-query";
import type { ContactsLinkKey } from "./contacts-query";
import {
  CONSENT_LABEL, SOURCE_LABEL, SUPPRESSED_LABEL, RAIL_KEYS, RAIL_LABEL, RAIL_ANY, RAIL_UNKNOWN_LIST, RAIL_CHOSEN_LIST,
  RAIL_MORE_TAGS, RAIL_MORE_LISTS, RAIL_CLEAR, railTypedValue, railOperatorTitle, railCountLine, railFit,
} from "./contacts-copy";

/** Next's own shape: a repeated param arrives as an array. */
export type ContactsSp = Record<string, string | string[] | undefined>;

/** The most tags the rail draws; an applied tag beyond them is appended (see the header). */
export const TAG_RAIL_CAP = 20;
/** The most lists the rail draws, A to Z; an applied list beyond them is appended. */
export const LIST_RAIL_CAP = 20;
/** How many of the book's tags the loader reads — more than the cap, so `moreTags` is known and an applied tag past
 *  the drawn twenty still finds its count. */
export const RAIL_TAG_READ = 200;

/** One pill: a finished label, a finished href, and whether it is the one in force. */
export type RailOption = {
  /** The URL value this pill writes (`""` = Any). With the group's `param` it forms FilterPill's `testId`. */
  key: string;
  label: string;
  href: string;
  on: boolean;
  /** Only where it is exactly what the pill lists (see the header). */
  count?: number;
  title?: string;
};
/** One axis. `param` is the REAL query-parameter name, which is what FilterPill's `testId` contract asks for.
 *  `tab`: one option in force, choosing one navigates. `toggle`: an applied value with no axis — pressing it removes it. */
export type RailGroup = { param: ContactsLinkKey; label: string; semantics: "tab" | "toggle"; options: RailOption[] };
export type ContactRail = {
  label: string;
  groups: RailGroup[];
  /** "45 contacts", "3 of 45 contacts" — null when no rows were read (a refused filter, a failed read). */
  countLine: string | null;
  notes: string[];
  /** Clear filters in the rail's foot — only when the input says the page draws none of its own, and something is
   *  applied. Built by the ONE href builder (it keeps the search and the sort). */
  clear: { label: string; href: string } | null;
};
export type ContactRailInput = {
  /** The page's address, as Next hands it. */
  sp: ContactsSp;
  /** D19 · may this viewer read a number? A viewer who may not gets no Consent, Source or Player pill at all. */
  reads: boolean;
  /** Every list — or null when the read failed, so only an applied list is drawn. */
  lists: readonly StoredContactList[] | null;
  /** The book's tags, most-carried first — or null when the read failed. */
  tags: readonly ContactTagCount[] | null;
  /** The match and the whole book, for the count line — null when no rows were read. */
  counted: { match: number; book: number } | null;
  /** The page shows no Clear filters of its own (a FAILED read: no "Showing contacts:" line, no table), so the rail
   *  draws one. ⛔ Never beside the page's own — two "Clear filters" on one screen is one control said twice. */
  clearable: boolean;
};

/** An operator the rail offers. */
export type RailOperator = { id: TzOperatorId; brand: string; ndcs: string[] };

/**
 * Every licensee that holds at least one SENDABLE prefix, from the ONE table, sorted by brand — Airtel, Halotel,
 * TTCL, Vodacom, Yas. ⛔ Never typed: a hand-written 2020-edition map has no 072 under Vodacom and still says "Tigo".
 * Telxer (064, allocated and reaching nothing) gets no pill — a book row can never hold that prefix, so the pill
 * could only ever list nothing — yet an applied `?op=TELXER` is still drawn, as an appended pill.
 * `ndcs` is the resolver's OWN expansion (`ndcsForOperators`), so a pill's hover text is what its filter matches.
 */
export const RAIL_OPERATORS: readonly RailOperator[] = Array.from(new Set(TZ_MOBILE_NDCS.filter((r) => r.sendable).map((r) => r.operator)))
  .map((id) => ({ id, brand: TZ_OPERATORS[id].brand, ndcs: ndcsForOperators([id]) }))
  .sort((a, b) => (a.brand < b.brand ? -1 : a.brand > b.brand ? 1 : 0));

const CONSENT_ORDER = Object.keys(CONSENT_LABEL) as ContactConsentState[];
const SOURCE_ORDER = Object.keys(SOURCE_LABEL) as ContactSource[];

/* ═══ WHAT IS APPLIED — U24's parser, one key at a time ═════════════════════════════════════════ */

type AxisValues = { kind: "none" } | { kind: "values"; values: string[] } | { kind: "unreadable"; raw: string };

/** The keys of `sp` named, and no others — so a refusal on one key cannot hide what another key applies. */
function only(sp: ContactsSp, keys: readonly ContactsLinkKey[]): ContactsSp {
  const out: ContactsSp = {};
  for (const k of keys) if (sp[k] !== undefined) out[k] = sp[k];
  return out;
}

/** What the address applies to ONE axis, read by the resolver's own parser. An unreadable value keeps its raw text,
 *  so the rail can draw it as typed. */
function appliedOf(sp: ContactsSp, key: ContactsLinkKey, pick: (f: ContactAudienceFilter) => readonly string[] | null): AxisValues {
  const one = only(sp, [key]);
  const r = parseContactAudienceParams(one);
  if (!r.ok) return { kind: "unreadable", raw: contactsLinkSp(one)[key] ?? "" };
  const v = pick(r.filter);
  return v === null ? { kind: "none" } : { kind: "values", values: [...v] };
}

const WINDOW_KEYS: readonly ContactsLinkKey[] = ["range", "from", "to"];
type WindowApplied = { kind: "none" } | { kind: "read"; filter: ContactAudienceFilter } | { kind: "unreadable"; raw: string };

/** The window's three keys are read TOGETHER — the parser decides `range` against `from`/`to`. */
function windowOf(sp: ContactsSp): WindowApplied {
  const keys = only(sp, WINDOW_KEYS);
  const r = parseContactAudienceParams(keys);
  if (!r.ok) {
    const flat = contactsLinkSp(keys);
    return { kind: "unreadable", raw: flat[r.param] ?? WINDOW_KEYS.map((k) => flat[k] ?? "").filter((s) => s !== "").join(" ") };
  }
  return r.filter.addedFrom === null && r.filter.addedBefore === null ? { kind: "none" } : { kind: "read", filter: r.filter };
}

/** Can this value be addressed — does the parser read `?<param>=<value>` back to exactly this value? A stored tag or
 *  list id that cannot gets no pill, for one of two reasons: the parser REFUSES it (a character the tag rule does not
 *  allow — the href would open a refused page), or it reads back as a DIFFERENT value (a pre-C11 "VIP": the parser
 *  lowercases it to "vip" while the twins match tags exactly, so a "VIP" pill would list the "vip" rows, not its own).
 *  ⚠️ So a stored tag that is not its own `tagKey` is unreachable from an address at all — a RESOLVER limit, not the
 *  rail's: C11 has every writer store the key, and nothing writes a tag before U22/U23/U31. */
function addressable(param: "tag" | "list", value: string): boolean {
  const r = parseContactAudienceParams({ [param]: value });
  if (!r.ok) return false;
  const got = param === "tag" ? r.filter.tags : r.filter.lists;
  return got !== null && got.length === 1 && got[0] === value;
}

/* ═══ THE HREFS — the ONE builder ═══════════════════════════════════════════════════════════════ */

function hrefWith(sp: ContactsSp, param: ContactsLinkKey, value: string | null): string {
  const patch: Partial<Record<ContactsLinkKey, string | null>> = {};
  patch[param] = value;
  return contactsHref(sp, patch);
}

/* ═══ THE GROUPS ════════════════════════════════════════════════════════════════════════════════ */

type Choice = { key: string; label: string; title?: string; count?: number };

/**
 * One axis: "Any", the choices, then whatever is applied that no choice shows. ⛔ EXACTLY ONE pill is in force on
 * every axis, in every state: "Any" when nothing is applied, the matching choice, or the appended pill.
 */
function axis(
  sp: ContactsSp,
  param: ContactsLinkKey,
  label: string,
  choices: readonly Choice[],
  applied: AxisValues,
  labelOf: (value: string) => string,
  countOf: (value: string) => number | undefined = () => undefined,
): RailGroup {
  const single = applied.kind === "values" && applied.values.length === 1 ? applied.values[0] : null;
  const options: RailOption[] = [
    { key: "", label: RAIL_ANY, href: hrefWith(sp, param, null), on: applied.kind === "none" },
    ...choices.map((c) => ({ ...c, href: hrefWith(sp, param, c.key), on: single !== null && single === c.key })),
  ];
  if (applied.kind === "values" && !choices.some((c) => single !== null && c.key === single)) {
    const key = applied.values.join(",");
    options.push({
      key,
      label: applied.values.map(labelOf).join(" or "),
      href: hrefWith(sp, param, key),
      on: true,
      count: single !== null ? countOf(single) : undefined,
    });
  }
  if (applied.kind === "unreadable") {
    // The address is kept as it is: this is the page the officer is on, refused, and "Any" is the way out.
    options.push({ key: applied.raw, label: railTypedValue(applied.raw), href: contactsHref(sp), on: true });
  }
  return { param, label, semantics: "tab", options };
}

/** An applied value with NO axis: one selected pill, and pressing it removes that filter. */
function appliedOnly(param: ContactsLinkKey, label: string, key: string, pill: string, clearHref: string): RailGroup {
  return { param, label, semantics: "toggle", options: [{ key, label: pill, href: clearHref, on: true }] };
}

/** `describeAudience`'s phrase for one predicate (the ONE describer — U38 reuses it), with its lead word dropped
 *  where the group key already says it ("Added 1 Sep 2026 → 8 Sep 2026" under ADDED reads "1 Sep 2026 → 8 Sep 2026"). */
function phrase(f: ContactAudienceFilter, lead: string, fallback: string): string {
  const said = describeAudience(f)[0];
  if (said === undefined) return fallback;
  return said.startsWith(lead) ? said.slice(lead.length) : said;
}

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/* ═══ THE RAIL ══════════════════════════════════════════════════════════════════════════════════ */

/**
 * The rail for one request. Groups in the plan's order — consent · suppressed · operator · source · list · tag —
 * then the applied-only pills (player · import · window). Pure: the same input is the same rail.
 */
export function contactRail(input: ContactRailInput): ContactRail {
  const { sp, reads } = input;
  const flat = contactsLinkSp(sp);

  const consent = appliedOf(sp, "consent", (f) => f.consent);
  const suppressed = appliedOf(sp, "suppressed", (f) => (f.suppressed === null ? null : [f.suppressed ? "yes" : "no"]));
  const op = appliedOf(sp, "op", (f) => f.operators);
  const source = appliedOf(sp, "source", (f) => f.sources);
  const list = appliedOf(sp, "list", (f) => f.lists);
  const tag = appliedOf(sp, "tag", (f) => f.tags);
  const player = appliedOf(sp, "player", (f) => (f.player === null ? null : [f.player ? "yes" : "no"]));
  const imported = appliedOf(sp, "import", (f) => (f.importId === null ? null : [f.importId]));
  const win = windowOf(sp);

  // ⭐ A tag's whole-book count is what its pill lists ONLY while nothing else narrows the list (see the header).
  const exact = flat.q === undefined
    && [consent, suppressed, op, source, list, player, imported].every((a) => a.kind === "none") && win.kind === "none";

  const railTags = (input.tags ?? []).filter((t) => tagKey(t.tag) === t.tag && addressable("tag", t.tag));
  const shownTags = railTags.slice(0, TAG_RAIL_CAP);
  const tagCount = new Map(railTags.map((t) => [t.tag, t.count]));
  const tagCountOf = (t: string) => (exact ? tagCount.get(t) : undefined);

  const listName = new Map((input.lists ?? []).map((l) => [l.id, l.name]));
  const railLists = (input.lists ?? [])
    .filter((l) => addressable("list", l.id))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "en") || byText(a.id, b.id));
  const shownLists = railLists.slice(0, LIST_RAIL_CAP);

  const groups: RailGroup[] = [];
  if (reads) {
    groups.push(axis(sp, "consent", RAIL_KEYS.consent,
      CONSENT_ORDER.map((c) => ({ key: c, label: CONSENT_LABEL[c].label })),
      consent, (v) => CONSENT_LABEL[v as ContactConsentState]?.label ?? v));
  }
  groups.push(axis(sp, "suppressed", RAIL_KEYS.suppressed,
    [{ key: "yes", label: SUPPRESSED_LABEL.yes }, { key: "no", label: SUPPRESSED_LABEL.no }],
    suppressed, (v) => (v === "yes" ? SUPPRESSED_LABEL.yes : v === "no" ? SUPPRESSED_LABEL.no : v)));
  groups.push(axis(sp, "op", RAIL_KEYS.op,
    RAIL_OPERATORS.map((o) => ({ key: o.id, label: o.brand, title: railOperatorTitle(o.ndcs) })),
    op, (v) => TZ_OPERATORS[v as TzOperatorId]?.brand ?? v));
  if (reads) {
    groups.push(axis(sp, "source", RAIL_KEYS.source,
      SOURCE_ORDER.map((s) => ({ key: s, label: SOURCE_LABEL[s] })),
      source, (v) => SOURCE_LABEL[v as ContactSource] ?? v));
  }
  // Nothing writes a list or a tag yet (U22/U23/U31): an axis with no options and nothing applied would be a lone
  // "Any" — a control with no job — so it is drawn only when the book has some, or one is applied.
  if (shownLists.length > 0 || list.kind !== "none") {
    groups.push(axis(sp, "list", RAIL_KEYS.list,
      shownLists.map((l) => ({ key: l.id, label: l.name })),
      list, (id) => listName.get(id) ?? (input.lists === null ? RAIL_CHOSEN_LIST : RAIL_UNKNOWN_LIST)));
  }
  if (shownTags.length > 0 || tag.kind !== "none") {
    groups.push(axis(sp, "tag", RAIL_KEYS.tag,
      shownTags.map((t) => ({ key: t.tag, label: t.tag, count: tagCountOf(t.tag) })),
      tag, (t) => t, tagCountOf));
  }

  // ── U24's recorded extension: no axis, one selected pill each ──
  if (reads && player.kind !== "none") {
    const key = player.kind === "values" ? player.values[0] : player.raw;
    const pill = player.kind === "values"
      ? phrase({ ...WHOLE_BOOK, player: key === "yes" }, "", key)
      : railTypedValue(player.raw);
    groups.push(appliedOnly("player", RAIL_KEYS.player, key, pill, hrefWith(sp, "player", null)));
  }
  if (imported.kind !== "none") {
    const key = imported.kind === "values" ? imported.values[0] : imported.raw;
    const pill = imported.kind === "values"
      ? phrase({ ...WHOLE_BOOK, importId: key }, "From import ", key)
      : railTypedValue(imported.raw);
    groups.push(appliedOnly("import", RAIL_KEYS.import, key, pill, hrefWith(sp, "import", null)));
  }
  if (win.kind !== "none") {
    const param: ContactsLinkKey = flat.range !== undefined ? "range" : flat.from !== undefined ? "from" : "to";
    const pill = win.kind === "read"
      ? phrase({ ...WHOLE_BOOK, addedFrom: win.filter.addedFrom, addedBefore: win.filter.addedBefore }, "Added ", flat[param] ?? "")
      : railTypedValue(win.raw);
    groups.push(appliedOnly(param, RAIL_KEYS.window, flat[param] ?? "", pill, contactsHref(sp, { range: null, from: null, to: null })));
  }

  const notes: string[] = [];
  if (railLists.length > LIST_RAIL_CAP) notes.push(RAIL_MORE_LISTS(LIST_RAIL_CAP));
  if (railTags.length > TAG_RAIL_CAP) notes.push(RAIL_MORE_TAGS(TAG_RAIL_CAP));

  // ⭐ Something applied — any filter key the address carries, readable or not (Clear filters removes them all).
  const applied = CONTACTS_FILTER_KEYS.some((k) => flat[k] !== undefined);

  return {
    label: RAIL_LABEL,
    // ⛔ A pill never wraps or shrinks, so a long label is clipped here and the whole text rides in its title.
    groups: groups.map((g) => ({
      ...g,
      options: g.options.map((o) => (railFit(o.label) === o.label ? o : { ...o, label: railFit(o.label), title: o.title ?? o.label })),
    })),
    countLine: input.counted === null ? null : railCountLine(input.counted.match, input.counted.book),
    notes,
    clear: input.clearable && applied ? { label: RAIL_CLEAR, href: contactsClearFiltersHref(sp) } : null,
  };
}
