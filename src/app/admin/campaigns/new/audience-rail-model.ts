/**
 * U38b · THE COMPOSER'S AUDIENCE RAIL — ITS MODEL. Built in ONE pure function, so the page and `test:campaign-audience`
 * build the same rail; `audience-rail.tsx` reads the book's lists and tags and draws it without a decision of its own —
 * the contact book's own split (`contacts-rail.ts` builds, `contact-filters.tsx` draws), one section over.
 *
 * ⭐ THE AXES (ENGINE-SPEC §4.4 decision 4): Who (Contact book · Player accounts · Both) · Operator (by prefix) · the window
 * (Added · Joined · Added or joined — the platform's ONE window control, drawn by the .tsx) · List · Tag · and for a
 * viewer who may read a number: Consent · Stop list · Source · Player. ⛔ List, Tag and the reader's four are the CONTACT
 * BOOK's: hidden while Who is players or both (a player account has no such field — the campaign door refuses them
 * there, `populationProblem`), and the Who pills for players and both take them off the address as they choose.
 * ⭐ "WHO" IS AN EXPLICIT CHOICE: while the address carries no audience, the rail is Who alone — nothing else narrows a
 * choice nobody made (decision 3).
 *
 * ⛔ THIS RAIL TURNS NO FILTER INTO A QUERY. What is APPLIED is read by the campaign door's own parsers ONE KEY AT A TIME,
 * so a pill can never disagree with what the card counts, and one unreadable key does not blank the other axes. Every
 * href is the composer's ONE builder's (`composeHref`): the draft kept, the other filters kept, never a page or a stray.
 * 🔴 D19 / A1.1 / OD54 · ROLE-SHAPED: a viewer who may not read a number gets no Consent, Stop list, Source or Player axis,
 * and no applied search pill (a search is not that viewer's on a campaign — X25 — and is never described to them).
 * ⛔ AN APPLIED VALUE IS A VISIBLE, SELECTED PILL on every axis that is drawn (an operator with no live prefix, two at once,
 * a list the book no longer has, a value the parser refused — drawn as typed), and the axis's "Any" takes it off.
 * ⛔ A PILL NEVER WRAPS OR SHRINKS (the kit's geometry): a long label is clipped and rides whole in its hover title.
 *
 * Guard: `test:campaign-audience` §B3 (the book's axes hidden for players and both) · `test:filter-language` (the drawing).
 */
import { parseCampaignAudienceParams, parseContactAudienceParams, describeAudience, WHOLE_BOOK } from "@/lib/server/marketing/audience";
import type { AudiencePopulation, ContactAudienceFilter } from "@/lib/server/marketing/audience";
import type { ContactConsentState, ContactSource, ContactTagCount, StoredContactList } from "@/lib/server/store";
import { TZ_OPERATORS } from "@/lib/tz-msisdn";
import type { TzOperatorId } from "@/lib/tz-msisdn";
import { tagKey } from "@/lib/contacts/contact-fields";
import { compareListsByName } from "@/lib/contacts/bulk-rules";
import { RAIL_OPERATORS, TAG_RAIL_CAP, LIST_RAIL_CAP } from "@/app/admin/contacts/contacts-rail";
import type { RailOption } from "@/app/admin/contacts/contacts-rail";
import {
  CONSENT_LABEL, SOURCE_LABEL, RAIL_ANY, RAIL_UNKNOWN_LIST, RAIL_CHOSEN_LIST, railFit, railTypedValue, railOperatorTitle,
} from "@/app/admin/contacts/contacts-copy";
import { composeHref, composeLinkSp } from "./composer-loader";
import type { ComposeParams } from "./composer-loader";
import { AUDIENCE_PLAYER, AUDIENCE_RAIL_KEYS, AUDIENCE_RAIL_LABEL, AUDIENCE_STOP_LIST, AUDIENCE_WHO } from "./audience-copy";

/** The composer's address keys a pill may write — the campaign's vocabulary (`CAMPAIGN_AUDIENCE_URL_KEYS`). */
type AudienceKey = "q" | "consent" | "suppressed" | "op" | "list" | "tag" | "source" | "player" | "import" | "range" | "from" | "to" | "pop";

/** One axis of pills. `param` is the REAL address key (FilterPill's `testId` contract): `tab` — one option in force,
 *  choosing one navigates; `toggle` — an applied value with no axis of its own, whose press takes it off. */
export type AudienceRailPills = { kind: "pills"; param: AudienceKey; label: string; semantics: "tab" | "toggle"; options: RailOption[] };
/** The window axis — drawn by the platform's ONE window control (`DateTimeRangeFilter`), which reads the address itself. */
export type AudienceRailWindow = { kind: "window"; param: "range"; label: string };
export type AudienceRailGroup = AudienceRailPills | AudienceRailWindow;
export type AudienceRail = { label: string; groups: AudienceRailGroup[] };

export type AudienceRailInput = {
  /** The composer's address, as Next hands it. */
  sp: ComposeParams;
  /** D19 · may this viewer read a number? Anyone else gets no Consent, Stop list, Source or Player axis. */
  reads: boolean;
  /** Every list — or null when the read failed (only an applied list is then drawn). */
  lists: readonly StoredContactList[] | null;
  /** The book's tags, most-carried first — or null when the read failed. */
  tags: readonly ContactTagCount[] | null;
};

/** The contact book's own address keys: what the Who pills for players and both take off as they choose. */
const BOOK_ONLY: readonly AudienceKey[] = ["q", "consent", "suppressed", "list", "tag", "source", "player", "import"];
const AUDIENCE_KEYS: readonly AudienceKey[] = ["q", "consent", "suppressed", "op", "list", "tag", "source", "player", "import", "range", "from", "to", "pop"];
const CONSENT_ORDER = Object.keys(CONSENT_LABEL) as ContactConsentState[];
const SOURCE_ORDER = Object.keys(SOURCE_LABEL) as ContactSource[];

type Applied = { kind: "none" } | { kind: "values"; values: string[] } | { kind: "unreadable"; raw: string };

/** What the address applies to ONE key, read by the campaign door's own parser with that key ALONE. */
function appliedOf(flat: Record<string, string>, key: AudienceKey, pick: (f: ContactAudienceFilter) => readonly string[] | null): Applied {
  const raw = flat[key];
  if (raw === undefined) return { kind: "none" };
  const r = parseCampaignAudienceParams({ [key]: raw });
  if (!r.ok) return { kind: "unreadable", raw };
  const v = pick(r.filter);
  return v === null ? { kind: "none" } : { kind: "values", values: [...v] };
}

/** Can this value be addressed — does `?<param>=<value>` read back to exactly this value? (A stored tag or list id that
 *  cannot gets no pill: its href would open a refused page, or a different value's rows.) */
function addressable(param: "tag" | "list", value: string): boolean {
  const r = parseContactAudienceParams({ [param]: value });
  if (!r.ok) return false;
  const got = param === "tag" ? r.filter.tags : r.filter.lists;
  return got !== null && got.length === 1 && got[0] === value;
}

type Choice = { key: string; label: string; title?: string };

/** One axis: "Any", the choices, then whatever is applied that no choice shows — EXACTLY one pill in force. */
function axis(
  sp: ComposeParams, param: AudienceKey, label: string, choices: readonly Choice[], applied: Applied, labelOf: (v: string) => string,
): AudienceRailPills {
  const single = applied.kind === "values" && applied.values.length === 1 ? applied.values[0] : null;
  const options: RailOption[] = [
    { key: "", label: RAIL_ANY, href: composeHref(sp, { [param]: null }), on: applied.kind === "none" },
    ...choices.map((c) => ({ ...c, href: composeHref(sp, { [param]: c.key }), on: single !== null && single === c.key })),
  ];
  if (applied.kind === "values" && !choices.some((c) => single !== null && c.key === single)) {
    const key = applied.values.join(",");
    options.push({ key, label: applied.values.map(labelOf).join(" or "), href: composeHref(sp, { [param]: key }), on: true });
  }
  if (applied.kind === "unreadable") {
    // The page the officer is on, refused — the card says why, and "Any" is the way out.
    options.push({ key: applied.raw, label: railTypedValue(applied.raw), href: composeHref(sp), on: true });
  }
  return { kind: "pills", param, label, semantics: "tab", options };
}

/** An applied value with no axis: one selected pill, and its press takes that key off. */
function appliedOnly(sp: ComposeParams, param: AudienceKey, label: string, key: string, pill: string): AudienceRailPills {
  return { kind: "pills", param, label, semantics: "toggle", options: [{ key, label: pill, href: composeHref(sp, { [param]: null }), on: true }] };
}

/** `describeAudience`'s phrase for ONE predicate (the one describer), or the raw value when it says nothing. */
function phrase(f: ContactAudienceFilter, fallback: string): string {
  return describeAudience(f)[0] ?? fallback;
}

/**
 * ⭐ THE RAIL FOR ONE REQUEST. Pure: the same input is the same rail.
 */
export function audienceRail(input: AudienceRailInput): AudienceRail {
  const { sp, reads } = input;
  const flat = composeLinkSp(sp);
  const chosen = AUDIENCE_KEYS.some((k) => flat[k] !== undefined);

  // ── Who: the population, read alone ──
  const popRaw = flat.pop;
  const popRead = popRaw === undefined ? null : parseCampaignAudienceParams({ pop: popRaw });
  const population: AudiencePopulation | "book" | null = !chosen ? null
    : popRead === null ? "book"
      : popRead.ok ? popRead.filter.population ?? "book" : null;
  const offBook: Partial<Record<AudienceKey, null>> = {};
  for (const k of BOOK_ONLY) offBook[k] = null;
  // ⛔ OD66 · a viewer who may not read a number counts the book or the players, never both at once.
  const whoChoices = reads ? (["book", "players", "both"] as const) : (["book", "players"] as const);
  const who: RailOption[] = whoChoices.map((p) => ({
    key: p,
    label: AUDIENCE_WHO[p].label,
    title: AUDIENCE_WHO[p].title,
    // ⭐ Choosing players or both takes the contact book's own filters off — an account has none of them.
    href: composeHref(sp, p === "book" ? { pop: "book" } : { ...offBook, pop: p }),
    on: population === p,
  }));
  if (popRead !== null && !popRead.ok && popRaw !== undefined) {
    who.push({ key: popRaw, label: railTypedValue(popRaw), href: composeHref(sp), on: true });
  }
  const groups: AudienceRailGroup[] = [{ kind: "pills", param: "pop", label: AUDIENCE_RAIL_KEYS.who, semantics: "tab", options: who }];
  // ⭐ Nothing chosen: Who alone (decision 3).
  if (!chosen) return finish(groups);

  // ── Operator (by prefix) and the window: both arms honour them ──
  groups.push(axis(sp, "op", AUDIENCE_RAIL_KEYS.op,
    RAIL_OPERATORS.map((o) => ({ key: o.id, label: o.brand, title: railOperatorTitle(o.ndcs) })),
    appliedOf(flat, "op", (f) => f.operators), (v) => TZ_OPERATORS[v as TzOperatorId]?.brand ?? v));
  groups.push({ kind: "window", param: "range", label: AUDIENCE_RAIL_KEYS.window[population ?? "book"] });

  // ⛔ The contact book's own axes — drawn only while Who is the contact book (B3).
  if (population !== "players" && population !== "both") {
    if (reads) {
      groups.push(axis(sp, "consent", AUDIENCE_RAIL_KEYS.consent,
        CONSENT_ORDER.map((c) => ({ key: c, label: CONSENT_LABEL[c].label })),
        appliedOf(flat, "consent", (f) => f.consent), (v) => CONSENT_LABEL[v as ContactConsentState]?.label ?? v));
      groups.push(axis(sp, "suppressed", AUDIENCE_RAIL_KEYS.suppressed,
        [{ key: "yes", label: AUDIENCE_STOP_LIST.yes }, { key: "no", label: AUDIENCE_STOP_LIST.no }],
        appliedOf(flat, "suppressed", (f) => (f.suppressed === null ? null : [f.suppressed ? "yes" : "no"])),
        (v) => (v === "yes" ? AUDIENCE_STOP_LIST.yes : v === "no" ? AUDIENCE_STOP_LIST.no : v)));
      groups.push(axis(sp, "source", AUDIENCE_RAIL_KEYS.source,
        SOURCE_ORDER.map((s) => ({ key: s, label: SOURCE_LABEL[s] })),
        appliedOf(flat, "source", (f) => f.sources), (v) => SOURCE_LABEL[v as ContactSource] ?? v));
      groups.push(axis(sp, "player", AUDIENCE_RAIL_KEYS.player,
        [{ key: "yes", label: AUDIENCE_PLAYER.yes }, { key: "no", label: AUDIENCE_PLAYER.no }],
        appliedOf(flat, "player", (f) => (f.player === null ? null : [f.player ? "yes" : "no"])),
        (v) => (v === "yes" ? AUDIENCE_PLAYER.yes : v === "no" ? AUDIENCE_PLAYER.no : v)));
    }
    const list = appliedOf(flat, "list", (f) => f.lists);
    const listName = new Map((input.lists ?? []).map((l) => [l.id, l.name]));
    const shownLists = (input.lists ?? []).filter((l) => addressable("list", l.id)).slice().sort(compareListsByName).slice(0, LIST_RAIL_CAP);
    // An axis with no options and nothing applied would be a lone "Any" — a control with no job — so it is drawn only when
    // the book has some, or one is applied (the contact book's rail, the same rule).
    if (shownLists.length > 0 || list.kind !== "none") {
      groups.push(axis(sp, "list", AUDIENCE_RAIL_KEYS.list, shownLists.map((l) => ({ key: l.id, label: l.name })), list,
        (id) => listName.get(id) ?? (input.lists === null ? RAIL_CHOSEN_LIST : RAIL_UNKNOWN_LIST)));
    }
    const tag = appliedOf(flat, "tag", (f) => f.tags);
    const shownTags = (input.tags ?? []).filter((t) => tagKey(t.tag) === t.tag && addressable("tag", t.tag)).slice(0, TAG_RAIL_CAP);
    if (shownTags.length > 0 || tag.kind !== "none") {
      groups.push(axis(sp, "tag", AUDIENCE_RAIL_KEYS.tag, shownTags.map((t) => ({ key: t.tag, label: t.tag })), tag, (t) => t));
    }
    // ── an applied value with no axis: a reader's search, and an import — one pill each, whose press takes it off ──
    if (reads && flat.q !== undefined) {
      const q = parseCampaignAudienceParams({ q: flat.q });
      groups.push(appliedOnly(sp, "q", AUDIENCE_RAIL_KEYS.q, flat.q,
        q.ok && q.filter.q !== null ? phrase({ ...WHOLE_BOOK, q: q.filter.q }, flat.q) : railTypedValue(flat.q)));
    }
    if (flat.import !== undefined) {
      const imp = parseCampaignAudienceParams({ import: flat.import });
      groups.push(appliedOnly(sp, "import", AUDIENCE_RAIL_KEYS.import, flat.import,
        imp.ok && imp.filter.importId !== null ? phrase({ ...WHOLE_BOOK, importId: imp.filter.importId }, flat.import) : railTypedValue(flat.import)));
    }
  }
  return finish(groups);
}

/** ⛔ A pill never wraps or shrinks: a long label is clipped here and rides whole in its title. */
function finish(groups: AudienceRailGroup[]): AudienceRail {
  return {
    label: AUDIENCE_RAIL_LABEL,
    groups: groups.map((g) => (g.kind !== "pills" ? g : {
      ...g,
      options: g.options.map((o) => (railFit(o.label) === o.label ? o : { ...o, label: railFit(o.label), title: o.title ?? o.label })),
    })),
  };
}
