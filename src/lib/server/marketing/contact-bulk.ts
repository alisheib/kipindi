/**
 * U23 · THE CONTACT BOOK'S BULK BAR, ON THE SERVER — the one place a selection becomes a write.  (S10, 2026-10-02)
 *
 * ⭐ THE SERVER COUNTS, AND THE SERVER DECIDES (OD27/OD28). A request names an action, an audience — U24's audience JSON:
 * ticked rows as its `ids` arm, or "select all N matching" as the FILTER (decision C6) — and, when the tier asks, the
 * count the officer typed. `parseBulkRequest` builds a NEW request from those named keys alone, so a posted count, tier
 * or officer never reaches a decision. The run RECOUNTS (`contactAudience(f).count()` — this file is one of U24's
 * declared readers), derives the tier from that recount through the ONE rule (`bulkConfirmTier`), and refuses
 * `confirm_required` / `confirm_mismatch` with the new count BEFORE anything is written. A preview's count is never reused.
 * 🔴 D19 / A1.1 · A POSTED FILTER IS ASKED THE ADDRESS'S QUESTION. For a viewer who may not read a number, an audience
 * naming consent, source, player — or, since OD54, suppressed — is refused by U24's ONE role rule (`roleRefusal`) before
 * any count, so a forged body cannot turn the recount into a player oracle. And a withdrawal's split ("already
 * withdrawn") is itself a consent signal, and a suppression's ("already suppressed") a stop signal (OD54), so the action
 * layer hands either split to a reader alone (`contactBulkReply`). An officer may still suppress: a masked one is told
 * the total.
 * 🔴 C8b (B3) · AND A MASKED VIEWER'S WHOLE-NUMBER SEARCH IS NO AUDIENCE: the page answers such a search with whether the
 * book holds the number and nothing else (`number-search.ts`), so a forged post that searches a whole number is refused
 * `number_search` here too, before any count — a write or a preview over it would hand back the row the page withholds.
 * ⭐ ONE EXCEPTION, A STOP GIVEN BY PHONE (the integrator's ruling, C8b review): SUPPRESS and RECORD A WITHDRAWAL over the
 * whole number ALONE act on that NUMBER (`stopNumberOf`) — counted 1 when the book holds it, by a row or by an erasure's
 * block, exactly as the presence answer reads it (`holdsNumber`), else empty — never on a walked row: no sample, no row
 * read, the masked reply the total alone. So a blocked number answers as a held one does (X22), and the page's "in the
 * book" and this count can never disagree. Tag, untag, add to a list and remove stay refused, in a sentence that names
 * the two actions that still act on the number (`BULK_SENTENCES.numberSearch`, the re-review's MN-1).
 * ⭐ C8b re-review (NIT 9) · THE SAME TWO ACTIONS ACT ON THE NUMBER FOR A READER: a reader's whole number alone that the
 * book BLOCKS lists no row — the tombstone is in no audience — so until now a reader could not record a stop given by
 * phone for it while a masked officer could. A stop or a withdrawal over the whole number alone acts on the NUMBER for
 * every viewer (`stopNumberOf` asks no role): for a number a live row holds it writes exactly what the row's walk wrote
 * (that row's number, once), and a reader keeps the split (`contactBulkReply`).
 * ⛔ C8b (B7) · NO SHARED LABEL FROM A PROTECTED FILTER, FOR ANY VIEWER. A READER may filter by consent, the stop list,
 * the source or the player link, which a masked officer may not (`roleRefusal`). A TAG or a LIST built from such a filter
 * hands that filter to the masked officer: they filter by the tag, or open the list, and read who is a player or under a
 * stop. So "tag" and "add to a list" over an audience that uses any of those four axes are refused `protected_label` for
 * EVERY viewer (`sharedLabelRefusal`, this file's own rule — `audience.ts`'s `roleRefusal` and
 * `campaignAudienceRefusal`, which the campaign path asks, are unchanged), its sentence naming the way on: tick the
 * contacts by hand — a reader's own audited choice, allowed — or filter by something else. Untag, remove, a withdrawal
 * and a suppression build no label and are not refused by it.
 * ⭐ TAG, UNTAG, ADD TO A LIST AND REMOVE ARE SET-BASED, over the where the count reads (`contactAudienceWrites`,
 * audience.ts — the only door to the store's `…Where` members). A tag goes through U28's ONE rule (C11).
 * ⛔ vb7 · OVER A FILTER, A SET-BASED WRITE IS BOUND TO THE CONFIRMED ROWS: they are walked before any write and refused
 * if they are not the recounted number, and the write reaches the filter AND those ids — so a contact that starts
 * matching after the recount is written by nobody, one that stops matching is not written, and a Remove never deletes
 * beyond the typed count.
 * ⛔ vb7 (review m1) · A REMOVE IS ALL OR NOTHING: over a filter its confirmed ids go to the store in ONE call
 * (`removeBound` → the twins' `removeBoundWhere`: ONE transaction in Postgres, however many chunks the ids take), and over
 * ticked rows it is ONE statement — so a fault removes nobody, and the run's audit row says `rolledBack`. ⚠️ A tag, an
 * untag or an add to a list over a filter is written a chunk at a time, as the Prisma twin's set paths always are: a fault
 * part-way leaves the chunks before it written (each is harmless to run again), and the audit row says `partial`, with
 * how far it got.
 * ⭐ vb7 · a post with neither a list nor a new name is told "Choose a list, or name a new one." (`LIST_NONE`, the bar's
 * own words), and a run's outcome carries its tag, for the toast.
 * ⭐ A WITHDRAWAL AND A SUPPRESSION WRITE EVIDENCE PER NUMBER, capped at `BULK_PER_ROW_MAX` and refused above it:
 *   · withdraw — a WITHDRAWN ledger row (source OPERATOR, the fixed officer wording, the officer as recorder, the ledger's
 *     one clock — `test:dal-parity` §20 counts this file a writer), a player's own switch turned OFF only through
 *     `syncPlayerToggle(…, actor)` (decision C5), and the book's cache through `mirrorContactCache` (C4, M4);
 *   · suppress — an OPERATOR stop, which NOBODY can lift: not the person, not a recycled number's next owner (C23/M13 —
 *     an owner question in §0; Ali may rule otherwise). A person's own stop is taken over by it. The confirmation says
 *     so in words.
 * ⛔ ERASED ROWS ARE IN NO AUDIENCE (C3): the resolver leaves the tombstone out of every count, walk and write.
 * ⛔ ONE AUDIT ROW PER RUN, through U24's ONE describer (`auditContactAudience`): a whole number masked, a name search as
 * its length, ticked ids as a COUNT. A new list's name and anything else an officer typed never reach it.
 *
 * Guard: `test:contacts-bulk` (executed on the memory twin) · `test:dal-parity` §20 (this file's ledger rows) and §23.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@/lib/server/store";
import type {
  ContactBulkCount, MessagingKey, StoredContactList, StoredMarketingContact, SuppressionReason,
} from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { maskPhone } from "@/lib/phone-normalize";
import { formatNumber } from "@/lib/utils";
import {
  contactAudience, contactAudienceKey, contactAudienceWrites, auditContactAudience, describeAudience,
  parseContactAudienceJson, roleRefusal, MAX_AUDIENCE_IDS, ROLE_REFUSAL_REASON, WHOLE_BOOK,
} from "@/lib/server/marketing/audience";
import type { ContactAudienceFilter, ContactAudienceWrites } from "@/lib/server/marketing/audience";
import { ledgerStamp } from "@/lib/server/marketing/ledger-stamp";
import { mirrorContactCache } from "@/lib/server/marketing/contact-cache";
import { syncPlayerToggle } from "@/lib/server/marketing/optout-service";
import { CONTACT_LIMITS } from "@/lib/contacts/contact-fields";
import { bookHoldsNumber, maskedNumberSearchRefusal, numberAloneOf } from "@/lib/server/contacts/number-search";
import { RAIL_KEYS } from "@/app/admin/contacts/contacts-copy";
import {
  BULK_PER_ROW_MAX, BULK_SAMPLE, LIST_NONE, bulkConfirmTier, isContactBulkAction, isPerRowAction, listNameKey, parseBulkTag,
  parseListName,
} from "@/lib/contacts/bulk-rules";
import type {
  BulkOutcome, BulkPreview, BulkRefusal, BulkRefusalReason, ContactBulkAction, ContactSelectionRow,
} from "@/lib/contacts/bulk-rules";

/* ═══ THE WORDS THE SERVICE WRITES AND SAYS ═══════════════════════════════════════════════════════ */

/**
 * ⛔ THE OFFICER'S WITHDRAWAL, AS THE LEDGER'S `wording`: what the record SAYS happened — fixed, never typed by the officer
 * (free text could hold a phone number, §5.14), never an SMS consent sentence (`isSmsConsentWording` is false for it;
 * `test:contacts-bulk` asserts it). English, like the console and like erasure's own wording.
 */
export const OFFICER_WITHDRAWAL_WORDING = "Recorded by staff — this person asked not to receive marketing.";
/** The evidence a run leaves on each ledger row and stop it writes, and on a player's switch audit: this, then the run id. */
export const BULK_EVIDENCE_PREFIX = "contacts-bulk:";

/** ⭐ C8b re-review (NIT) · a filter as the RAIL names it (`RAIL_KEYS`: "Consent", "Suppressed", "Source", "Player") — what
 *  a sentence quotes, never the address's own key ("suppressed"); a key the rail does not draw is quoted as it is. */
const axisName = (param: string): string => (RAIL_KEYS as Readonly<Record<string, string>>)[param] ?? param;

export const BULK_SENTENCES = {
  badRequest: "This isn't an action the contact book offers.",
  badAudience: "The selection could not be read.",
  role: (param: string) => `The “${axisName(param)}” filter ${ROLE_REFUSAL_REASON.slice("This filter ".length)}`,
  empty: "Nothing was changed: the selection holds no contacts in the book. Clear the selection and tick the contacts again.",
  perRowCap: (n: number, max: number) =>
    `A withdrawal or a suppression writes one record per number, so it takes at most ${formatNumber(max)} contacts at a time; `
    + `this selection holds ${formatNumber(n)}. Nothing was changed — narrow it and run it in parts.`,
  confirmRequired: (n: number) => `Type ${n} to confirm — the number of contacts this changes. Nothing was changed.`,
  confirmMismatch: (n: number, typed: string) =>
    `The selection changed: it now holds ${formatNumber(n)} contacts — you confirmed ${typed}. Nothing was changed; review it again.`,
  walkChanged: (n: number, counted: number) =>
    `The selection changed while it was being read: it now holds ${formatNumber(n)} contacts, not ${formatNumber(counted)}. Nothing was changed; review it again.`,
  /** vb7 · the bar's own words (`bulk-rules.ts`), said before the round trip there and after it here. */
  noList: LIST_NONE,
  noSuchList: "That list isn't in the book any more. Choose another, or name a new one.",
  listExists: (name: string) => `A list called “${name}” already exists — two names that differ only in capitals are one list. Choose it instead.`,
  /** C8b re-review (MN-1) · a masked viewer's whole-number audience refused for an action that is not a stop — the
   *  sentence names the two actions that still act on the number, as the bar's disabled buttons do. */
  numberSearch: "For your role a whole number shows only whether it is in the book, so only Suppress and Record a withdrawal act on it — clear the search, or search by name, to tag, list or remove contacts.",
  /** C8b (B7) · a tag or a list from a filter some staff may not use — said for each of the two actions, with the way on. */
  protectedLabel: (action: "tag" | "addToList", param: string) =>
    `A ${action === "tag" ? "tag" : "list"} made from the “${axisName(param)}” filter would let staff who may not use that filter find these contacts through that ${action === "tag" ? "tag" : "list"}. `
    + `${action === "tag" ? "Tag these" : "Add these to a list"} by ticking them by hand, or filter by something else.`,
} as const;

/* ═══ C8b (B7) · NO SHARED LABEL FROM A PROTECTED FILTER ═══════════════════════════════════════════════ */

/**
 * ⛔ C8b (B7) · A TAG OR A LIST BUILT FROM A PROTECTED FILTER, FOR EVERY VIEWER — refused, naming the axis; null when the
 * action builds no shared label (anything but tag and add-to-list) or the audience uses no protected axis. ⭐ "PROTECTED"
 * IS ASKED OF THE ONE ROLE RULE, never copied: an axis is protected exactly when `roleRefusal` refuses it to a viewer who
 * may not read a number (`roleRefusal(audience, false)` — today player, source, consent and suppressed), so a fifth axis
 * added there is protected here the same day. ⭐ A selection of ticked rows alone is the officer's own audited choice and
 * is never refused by it (`isTicksOnly`); a filter beside ticked rows is a filter (and only a forged post makes one).
 */
export function sharedLabelRefusal(req: Pick<ContactBulkRequest, "action" | "audience">): { param: string } | null {
  if (req.action !== "tag" && req.action !== "addToList") return null;
  if (isTicksOnly(req.audience)) return null;
  const masked = roleRefusal(req.audience, false);
  return masked === null ? null : { param: masked.param };
}

/* ═══ THE REQUEST — named keys only ═══════════════════════════════════════════════════════════════ */

/** ⛔ EXACTLY THESE KEYS. Whatever else a body carries — a count, a tier, an officer — is never read. */
export type ContactBulkRequest = {
  action: ContactBulkAction;
  /** Parsed STRICTLY by U24's `parseContactAudienceJson`: an unknown key refuses, ids ≤ `MAX_AUDIENCE_IDS`, `[]` = nothing. */
  audience: ContactAudienceFilter;
  /** The count the officer typed, when the tier asked for one; compared with the server's RECOUNT, never trusted. */
  typed: string | null;
  /** Tag / untag: the raw box text — the run puts it through U28's ONE rule (`parseBulkTag`). */
  tag: string | null;
  /** Add to list: an existing list's id, or a new name. */
  list: { kind: "existing"; id: string } | { kind: "new"; name: string } | null;
};

const refuse = (reason: BulkRefusalReason, error: string, field?: "tag" | "list", expected?: number): BulkRefusal => ({
  ok: false, reason, error, ...(field !== undefined ? { field } : {}), ...(expected !== undefined ? { expected } : {}),
});
const bag = (v: unknown): Record<string, unknown> =>
  (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const text = (v: unknown): string | null => (typeof v === "string" ? v : null);

/**
 * The posted body → a request, built NEW from named keys. ⛔ Never a spread of the body: a `count`, a `tier` or an
 * `officerId` beside the named keys is simply not read, so nothing the browser claims can stand in for the server's count.
 */
export function parseBulkRequest(input: unknown): { ok: true; req: ContactBulkRequest } | BulkRefusal {
  const body = bag(input);
  const action = body.action;
  if (!isContactBulkAction(action)) return refuse("bad_request", BULK_SENTENCES.badRequest);
  const parsed = parseContactAudienceJson(body.audience);
  if (!parsed.ok) {
    const ids = bag(body.audience).ids;
    if (parsed.param === "ids" && Array.isArray(ids) && ids.length > MAX_AUDIENCE_IDS) return refuse("too_many_ids", parsed.reason);
    return refuse("bad_audience", `${BULK_SENTENCES.badAudience} ${parsed.reason}`);
  }
  const typed = (text(body.typed) ?? "").trim();
  let list: ContactBulkRequest["list"] = null;
  if (action === "addToList") {
    const id = (text(body.listId) ?? "").trim();
    const name = text(body.newListName);
    // ⛔ vb7 · neither a list nor a name is NO list ("Choose a list, or name a new one.") — never "Type a name for the new
    // list", which answered a question nobody asked. A name that is a string, even "", is a new list being named.
    list = id !== "" ? { kind: "existing", id } : name !== null ? { kind: "new", name } : null;
  }
  return {
    ok: true,
    req: {
      action,
      audience: parsed.filter,
      typed: typed === "" ? null : typed,
      tag: action === "tag" || action === "untag" ? (text(body.tag) ?? "") : null,
      list,
    },
  };
}

/* ═══ THE PIECES THE PAGE AND THE RUN SHARE ═══════════════════════════════════════════════════════ */

/**
 * ⛔ THE ONE PROJECTION A SELECTED ROW TAKES TO THE BROWSER: id, name, the number MASKED (`+255••••NN`) — for every role,
 * readers included. The page hands the bar these, and the preview's sample is these; no raw number leaves the server.
 */
export function contactSelectionRow(c: Pick<StoredMarketingContact, "id" | "displayName" | "msisdn">): ContactSelectionRow {
  return { id: c.id, name: c.displayName, masked: maskPhone(c.msisdn) };
}

/**
 * The page's filter as U24's audience JSON, SERIALISED — its canonical key (`contactAudienceKey`: fixed order, a relative
 * window already absolute, a whole number as its key). "Select all N matching" stores this string and posts it back
 * parsed; `parseContactAudienceJson` reads it to the same filter (`test:contacts-audience` 2.15).
 */
export function contactFilterAudienceKey(f: ContactAudienceFilter): string {
  return contactAudienceKey({ ...f, ids: null });
}

/**
 * WHICH FILTER the page shows, for the selection's "the filter changed" (U23 review F6, 2026-10-02): the audience key
 * with its Added window as the ADDRESS wrote it — `range`, `from`, `to` — never the instants a preset resolves to. A
 * rolling window ("last 7 days") resolves to new instants every minute, so a key built from them cleared "all matching"
 * and said the filter had changed when nothing had. The key a run POSTS stays the resolved one, captured at selection.
 */
export function contactFilterIdentity(f: ContactAudienceFilter, sp: Record<string, string | string[] | undefined>): string {
  const first = (v: string | string[] | undefined): string | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  return JSON.stringify([
    contactAudienceKey({ ...f, ids: null, addedFrom: null, addedBefore: null }),
    first(sp.range)?.toLowerCase() ?? null, first(sp.from), first(sp.to),
  ]);
}

/** Is the audience nothing but ticked rows? A filter — or a filter beside ids — is a filter, and takes the typed tier. */
export function isTicksOnly(f: ContactAudienceFilter): boolean {
  return f.ids !== null && contactAudienceKey({ ...f, ids: null }) === contactAudienceKey(WHOLE_BOOK);
}

/** A list id as the store mints them; anything else is not a list, without asking the store. */
const LIST_ID = /^[A-Za-z0-9_-]{1,64}$/;
/** A new list's id: `cl_` and sixteen letters — no digit run that could read as a phone number in a log or a URL. */
function newListId(): string {
  return `cl_${Array.from(randomBytes(16), (b) => String.fromCharCode(97 + (b % 26))).join("")}`;
}

/* ═══ THE DEPENDENCIES — swappable for the suite's in-process red plants; production never passes them ═══════ */

export type ContactBulkDeps = {
  /** The ONE count — the resolver's (`contactAudience(f).count()`). */
  count: (f: ContactAudienceFilter) => Promise<number>;
  /** The ONE tier rule (`bulk-rules.ts`). */
  tier: typeof bulkConfirmTier;
  /** D19 / A1.1 — the ONE role rule (`audience.ts`). */
  roleRefusal: typeof roleRefusal;
  /** C8b (B3) — a masked viewer's whole-number search is no audience (`number-search.ts`). */
  numberSearch: typeof maskedNumberSearchRefusal;
  /** C8b (B3's one exception) — does the book hold this number, as the page's presence answer reads it
   *  (`bookHoldsNumber`): the count of a stop or withdrawal over the whole number alone. */
  holdsNumber: (msisdn: string) => Promise<boolean>;
  /** C8b review · the number a stop or a withdrawal over this audience acts on, or null (`stopNumberOf`) — asked for
   *  EVERY viewer (the re-review's NIT 9); `viewerReads` rides along for a red case to plant a masked-only rule. */
  stopNumber: (req: Pick<ContactBulkRequest, "action" | "audience">, viewerReads: boolean) => string | null;
  /** C8b (B7) — no shared label from a protected filter, for any viewer (`sharedLabelRefusal`). */
  labelRefusal: typeof sharedLabelRefusal;
  /** The ONE audit describer (`audience.ts`). */
  describe: typeof auditContactAudience;
  /** The officer's stop: OPERATOR, which nobody can lift (C23). */
  suppressionReason: SuppressionReason;
  perRowMax: number;
  audit: typeof audit;
  now: () => Date;
  newRunId: () => string;
  /** vb7 · how many walked ids one bound tag, untag or add-to-list write takes — at most U24's ONE cap
   *  (`MAX_AUDIENCE_IDS`, what one audience may name). A suite lowers it to drive several chunks over a small book. */
  setChunk: number;
  /** vb7 (review m8) · the ids a FILTER audience holds, walked before any write (`audienceIds`) — and the set-based
   *  writes (`contactAudienceWrites`). Seams for the suite's in-process cases; production never passes them. */
  walkIds: (f: ContactAudienceFilter) => Promise<string[]>;
  writes: (f: ContactAudienceFilter) => ContactAudienceWrites;
};

export const CONTACT_BULK_DEPS: ContactBulkDeps = {
  count: (f) => contactAudience(f).count(),
  tier: bulkConfirmTier,
  roleRefusal,
  numberSearch: maskedNumberSearchRefusal,
  holdsNumber: bookHoldsNumber,
  stopNumber: (req) => stopNumberOf(req),
  labelRefusal: sharedLabelRefusal,
  describe: auditContactAudience,
  suppressionReason: "OPERATOR",
  perRowMax: BULK_PER_ROW_MAX,
  audit,
  now: () => new Date(),
  // Sixteen letters: a run id rides in evidence and audit rows, and must never hold a digit run.
  newRunId: () => Array.from(randomBytes(16), (b) => String.fromCharCode(97 + (b % 26))).join(""),
  setChunk: MAX_AUDIENCE_IDS,
  walkIds: (f) => audienceIds(f),
  writes: (f) => contactAudienceWrites(f),
};

/* ═══ THE PARAMETERS — a tag through U28's ONE rule, a list that exists or a new name nobody holds ═══════════ */

type BulkParams = {
  tag: string | null;
  list: { kind: "existing"; row: StoredContactList } | { kind: "new"; name: string } | null;
};

async function resolveParams(req: ContactBulkRequest): Promise<{ ok: true; p: BulkParams } | BulkRefusal> {
  if (req.action === "tag" || req.action === "untag") {
    // ⭐ The action rides with the text: an untag reads the tag as the book holds it (vb5 review M1).
    const t = parseBulkTag(req.tag ?? "", req.action);
    return t.ok ? { ok: true, p: { tag: t.tag, list: null } } : refuse("bad_tag", t.sentence, "tag");
  }
  if (req.action !== "addToList") return { ok: true, p: { tag: null, list: null } };
  const l = req.list;
  if (l === null) return refuse("bad_list", BULK_SENTENCES.noList, "list");
  if (l.kind === "existing") {
    const row = LIST_ID.test(l.id) ? await db.contactList.find(l.id) : null;
    return row ? { ok: true, p: { tag: null, list: { kind: "existing", row } } } : refuse("bad_list", BULK_SENTENCES.noSuchList, "list");
  }
  const named = parseListName(l.name);
  if (!named.ok) return refuse("bad_list", named.sentence, "list");
  // ⭐ ONE LIST PER NAME TO A PERSON: the store's unique index is case-sensitive, so the clash is asked here.
  const key = listNameKey(named.name);
  const clash = (await db.contactList.listAll()).find((x) => listNameKey(x.name) === key);
  if (clash) return refuse("list_exists", BULK_SENTENCES.listExists(clash.name), "list");
  return { ok: true, p: { tag: null, list: { kind: "new", name: named.name } } };
}

/* ═══ THE PREVIEW — what the confirmation is built from ═══════════════════════════════════════════════════ */

/**
 * The server's count of the audience, its tier, and — for the enumerate tier — the first `BULK_SAMPLE` rows, masked.
 * Refuses before counting a role-refused audience (D19), and refuses an empty selection or one past the per-number cap,
 * so the officer learns it before typing anything.
 * 🔴 OD54 · it never splits the audience by stop (or consent) state, for anyone: the count is the TOTAL, the sample is
 * `{ id, name, masked }`, and `described` cannot name a stop for a masked viewer — the role rule refused one first.
 */
export async function previewContactBulk(
  req: ContactBulkRequest,
  viewerReads: boolean,
  deps: ContactBulkDeps = CONTACT_BULK_DEPS,
): Promise<BulkPreview | BulkRefusal> {
  const role = deps.roleRefusal(req.audience, viewerReads);
  if (role !== null) return refuse("role", BULK_SENTENCES.role(role.param));
  // ⛔ C8b · B3 then B7 — both before anything is counted. ⭐ B3's one exception: a stop or a withdrawal over the whole
  // number ALONE acts on that NUMBER, counted as the presence answer reads it — for every viewer (`stopNumber`, NIT 9).
  const numberSearch = deps.numberSearch(req.audience, viewerReads);
  const stopNumber = deps.stopNumber(req, viewerReads);
  if (numberSearch !== null && stopNumber === null) return refuse("number_search", BULK_SENTENCES.numberSearch);
  const label = deps.labelRefusal(req);
  if (label !== null && (req.action === "tag" || req.action === "addToList")) return refuse("protected_label", BULK_SENTENCES.protectedLabel(req.action, label.param));
  const params = await resolveParams(req);
  if (!params.ok) return params;
  const count = stopNumber !== null ? ((await deps.holdsNumber(stopNumber)) ? 1 : 0) : await deps.count(req.audience);
  if (count === 0) return refuse("empty", BULK_SENTENCES.empty);
  if (isPerRowAction(req.action) && count > deps.perRowMax) {
    return refuse("too_many_for_per_row", BULK_SENTENCES.perRowCap(count, deps.perRowMax), undefined, count);
  }
  const tier = deps.tier(count, isTicksOnly(req.audience));
  // ⛔ No sample for a stop over a number: the page withholds that number's row, and so does this (a filter takes the
  // typed tier anyway).
  const sample = tier.kind === "enumerate" && stopNumber === null
    ? (await contactAudience(req.audience).page({ sort: "name", dir: "asc", page: "1", perPage: BULK_SAMPLE })).rows.map(contactSelectionRow)
    : [];
  const list = params.p.list;
  return {
    ok: true,
    action: req.action,
    count,
    tier,
    sample,
    described: describeAudience(req.audience),
    tag: params.p.tag,
    listName: list === null ? null : list.kind === "existing" ? list.row.name : list.name,
    listIsNew: list !== null && list.kind === "new",
  };
}

/* ═══ THE RUN ═════════════════════════════════════════════════════════════════════════════════════════ */

/** Every row an audience holds, by the resolver's keyset walk — for the two per-number actions, after the cap was asked. */
async function audienceRows(f: ContactAudienceFilter): Promise<StoredMarketingContact[]> {
  const audience = contactAudience(f);
  const rows: StoredMarketingContact[] = [];
  let afterId: string | null = null;
  for (;;) {
    const page = await audience.walk(afterId, 1000);
    rows.push(...page.rows);
    if (page.nextAfterId === null) return rows;
    afterId = page.nextAfterId;
  }
}

/** vb7 · every id a FILTER audience holds, by the same keyset walk — what a bound set-based write may reach. Ids only:
 *  a Remove over a large filter must not hold every row in memory to know which ones it confirmed. */
async function audienceIds(f: ContactAudienceFilter): Promise<string[]> {
  const audience = contactAudience(f);
  const ids: string[] = [];
  let afterId: string | null = null;
  for (;;) {
    const page = await audience.walk(afterId, 1000);
    for (const c of page.rows) ids.push(c.id);
    if (page.nextAfterId === null) return ids;
    afterId = page.nextAfterId;
  }
}

const keyOf = (identifier: string): MessagingKey => ({ channel: "SMS", identifier, category: "MARKETING" });

/**
 * ⭐ C8b · B3'S ONE EXCEPTION — the number a stop or a withdrawal acts on: `withdraw` or `suppress` over the whole number
 * ALONE (`numberAloneOf`), else null — for EVERY viewer (the re-review's NIT 9: a reader's search of a number the book
 * blocks lists no row, and this is how they record a stop given by phone). Such a run acts on the NUMBER, held by a row or
 * blocked by an erasure, counted by `holdsNumber` exactly as the page's presence answer is — so "in the book" and this
 * count never disagree, and a blocked number answers 1 as a held one does (X22). A masked reply is the total alone
 * (`contactBulkReply`); a reader keeps the split.
 */
function stopNumberOf(req: Pick<ContactBulkRequest, "action" | "audience">): string | null {
  if (req.action !== "withdraw" && req.action !== "suppress") return null;
  return numberAloneOf(req.audience);
}

/**
 * ⭐ RECORD A WITHDRAWAL, PER NUMBER. A number whose latest ledger row already says WITHDRAWN is UNCHANGED (no second row);
 * every other number gets one WITHDRAWN row. Either way the player who holds the number, if any, has their own switch
 * turned OFF through the ONE writer (C5) — a repair when the ledger already said it — and the book's cache is mirrored.
 */
async function withdrawEach(msisdns: readonly string[], officerId: string, runId: string, at: string, out: ContactBulkCount): Promise<void> {
  const evidence = BULK_EVIDENCE_PREFIX + runId;
  for (const msisdn of msisdns) {
    out.matched++;
    // ⛔ THE MIRROR RUNS IN `finally` (review F2, 2026-10-02): a failure after this number's ledger row — the player's
    // switch, say — must not leave its book row reading GIVEN until some other writer happens by.
    try {
    const latest = await db.messagingConsent.latestFor(keyOf(msisdn));
    if (latest?.status === "WITHDRAWN") {
      out.unchanged++;
    } else {
      await db.messagingConsent.create({
        // ⛔ The ledger's ONE clock (`ledger-stamp.ts`): a withdrawal must read back after the consent it withdraws.
        ...ledgerStamp(),
        channel: "SMS",
        identifier: msisdn,
        category: "MARKETING",
        status: "WITHDRAWN",
        source: "OPERATOR",
        wording: OFFICER_WITHDRAWAL_WORDING,
        locale: "EN",
        evidence,
        recordedBy: officerId,
      });
      out.changed++;
    }
    await syncPlayerToggle(msisdn, false, { kind: "officer", officerId, runRef: evidence });
    } finally {
      await mirrorContactCache(msisdn, at);
    }
  }
}

/**
 * ⭐ SUPPRESS, PER NUMBER — an officer's stop (`reason`, OPERATOR in production), which `lift` refuses for everybody.
 * A number already under a stop nobody can lift (an officer's, a complaint, a self-exclusion) is UNCHANGED; a person's
 * own stop (WITHDRAWN — liftable through their old SMS link) is TAKEN OVER by the officer's, its `createdAt` kept (the
 * store's re-arm rule), and counts as changed. Then the cache: `suppressedAt` becomes the stop's own time.
 */
async function suppressEach(
  msisdns: readonly string[], officerId: string, runId: string, at: string, reason: SuppressionReason, out: ContactBulkCount,
): Promise<void> {
  for (const msisdn of msisdns) {
    out.matched++;
    try {
    const active = await db.suppression.find(keyOf(msisdn));
    if (active !== null && active.reason !== "WITHDRAWN") {
      out.unchanged++;
    } else {
      await db.suppression.create({
        id: randomUUID(),
        channel: "SMS",
        identifier: msisdn,
        category: "MARKETING",
        reason,
        evidence: BULK_EVIDENCE_PREFIX + runId,
        recordedBy: officerId,
        createdAt: at,
        liftedAt: null,
        liftedReason: null,
      });
      out.changed++;
    }
    } finally {
      await mirrorContactCache(msisdn, at);
    }
  }
}

const AUDIT_VERB: Record<ContactBulkAction, string> = {
  tag: "tag", untag: "untag", addToList: "list_add", withdraw: "consent_withdrawn", suppress: "suppress", remove: "remove",
};

/**
 * One run. ⛔ THE ORDER IS THE CONTRACT: the role rule → (C8b) a masked whole-number search (B3) and a shared label from a
 * protected filter (B7) → the parameters → the RECOUNT → empty → the per-number cap → the
 * tier from the recount → the typed count (missing: `confirm_required`; different: `confirm_mismatch`, with the new count)
 * → the write → ONE audit row → the server-counted outcome. Nothing is written on any refusal.
 */
export async function runContactBulk(
  req: ContactBulkRequest,
  officerId: string,
  viewerReads: boolean,
  deps: ContactBulkDeps = CONTACT_BULK_DEPS,
): Promise<BulkOutcome | BulkRefusal> {
  const role = deps.roleRefusal(req.audience, viewerReads);
  if (role !== null) return refuse("role", BULK_SENTENCES.role(role.param));
  // ⛔ C8b · B3 (a masked viewer's whole-number search is no audience — but for B3's one exception, a stop or a withdrawal
  // over the whole number alone, which acts on that NUMBER for every viewer: `stopNumber`) then B7 (no shared label from a
  // protected filter).
  const numberSearch = deps.numberSearch(req.audience, viewerReads);
  const stopNumber = deps.stopNumber(req, viewerReads);
  if (numberSearch !== null && stopNumber === null) return refuse("number_search", BULK_SENTENCES.numberSearch);
  const label = deps.labelRefusal(req);
  if (label !== null && (req.action === "tag" || req.action === "addToList")) return refuse("protected_label", BULK_SENTENCES.protectedLabel(req.action, label.param));
  const params = await resolveParams(req);
  if (!params.ok) return params;
  // ⭐ THE RECOUNT — never the preview's count, never anything the browser posted.
  const count = stopNumber !== null ? ((await deps.holdsNumber(stopNumber)) ? 1 : 0) : await deps.count(req.audience);
  if (count === 0) return refuse("empty", BULK_SENTENCES.empty);
  if (isPerRowAction(req.action) && count > deps.perRowMax) {
    return refuse("too_many_for_per_row", BULK_SENTENCES.perRowCap(count, deps.perRowMax), undefined, count);
  }
  const tier = deps.tier(count, isTicksOnly(req.audience));
  if (tier.kind === "typed") {
    if (req.typed === null) return refuse("confirm_required", BULK_SENTENCES.confirmRequired(count), undefined, count);
    if (req.typed !== tier.word) return refuse("confirm_mismatch", BULK_SENTENCES.confirmMismatch(count, req.typed), undefined, count);
  }
  // ⛔ THE WALK MUST HOLD WHAT WAS COUNTED (review F4, 2026-10-02). The cap and the typed word bind the RECOUNT, and a
  // per-number action walks its rows afterwards: a filter audience can gain rows in between (a new id sorts after the
  // cursor), or lose some. Nobody confirmed THAT set, so it is refused — the rows are walked BEFORE any write.
  // ⭐ C8b · a stop over the whole number alone walks no row: its one number is the number the search names.
  const numbers: string[] = !isPerRowAction(req.action) ? []
    : stopNumber !== null ? [stopNumber] : (await audienceRows(req.audience)).map((c) => c.msisdn);
  if (isPerRowAction(req.action) && numbers.length !== count) {
    return refuse("confirm_mismatch", BULK_SENTENCES.walkChanged(numbers.length, count), undefined, numbers.length);
  }
  // ⛔ vb7 · …AND A SET-BASED WRITE OVER A FILTER IS BOUND TO THE ROWS THAT WERE CONFIRMED. Tag, untag, add to a list and
  // remove were one statement over the FILTER, after the recount: a contact that started matching in between was written
  // too, and a Remove deleted beyond the count the officer typed. Now the filter's ids are walked here, BEFORE any write,
  // and refused unless they are the confirmed count; the write then reaches the filter AND those ids, a chunk at a time,
  // so a row that joined later is in no chunk and a row that stopped matching fails the filter. A large Remove still
  // runs — a mismatch is refused, the size is never capped. Ticked rows are their own bound: no id joins a ticked list.
  const bound = !isPerRowAction(req.action) && !isTicksOnly(req.audience) ? await deps.walkIds(req.audience) : null;
  if (bound !== null && bound.length !== count) {
    return refuse("confirm_mismatch", BULK_SENTENCES.walkChanged(bound.length, count), undefined, bound.length);
  }

  const at = deps.now().toISOString();
  const runId = deps.newRunId();
  const stamp = { at, by: officerId };
  const tag = params.p.tag;
  let listId: string | null = null;
  let listName: string | null = null;
  let listCreated = false;
  // The per-number loops — and a bound write's chunks (vb7) — count into THIS object, so a run that dies mid-way still
  // knows how far it got.
  const out: ContactBulkCount = { matched: 0, changed: 0, unchanged: 0, full: 0 };
  /** `ended`: "done"; "partial" — a run that died part-way, with how far it got; "rolled_back" (vb7 review m1) — a Remove
   *  that died, which removed nobody. */
  const writeAudit = (counts: ContactBulkCount | null, ended: "done" | "partial" | "rolled_back") => deps.audit({
    category: req.action === "withdraw" || req.action === "suppress" ? "COMPLIANCE" : "ADMIN",
    action: `contacts.bulk.${AUDIT_VERB[req.action]}`,
    actorId: officerId,
    targetType: "MarketingContact",
    targetId: runId,
    payload: {
      audience: deps.describe(req.audience),
      confirmed: count,
      ...(counts !== null ? { matched: counts.matched, changed: counts.changed, unchanged: counts.unchanged, full: counts.full } : {}),
      // A tag is officer text within the tag alphabet — digits allowed — so it is written through the same scrub.
      ...(tag !== null ? { tag: auditContactAudience({ ...WHOLE_BOOK, tags: [tag] }).tags } : {}),
      ...(listId !== null ? { listId, listCreated } : {}),
      ...(ended === "partial" ? { partial: true } : {}),
      ...(ended === "rolled_back" ? { rolledBack: true } : {}),
    },
  });
  /** vb7 · one set-based tag, untag or add-to-list write: over ticked rows in one statement (the store's own count); over a
   *  filter, the confirmed ids a chunk at a time, each chunk the filter AND its ids, summed into `out`. */
  const setWrite = async (write: (w: ContactAudienceWrites) => Promise<ContactBulkCount>): Promise<ContactBulkCount> => {
    if (bound === null) return write(deps.writes(req.audience));
    const size = Math.max(1, Math.min(MAX_AUDIENCE_IDS, Math.floor(deps.setChunk)));
    for (let i = 0; i < bound.length; i += size) {
      const part = await write(deps.writes({ ...req.audience, ids: bound.slice(i, i + size) }));
      out.matched += part.matched;
      out.changed += part.changed;
      out.unchanged += part.unchanged;
      out.full += part.full;
    }
    return out;
  };
  let done: ContactBulkCount = out;
  try {
  if (req.action === "tag" && tag !== null) {
    done = await setWrite((w) => w.tag(tag, CONTACT_LIMITS.tags, stamp));
  } else if (req.action === "untag" && tag !== null) {
    done = await setWrite((w) => w.untag(tag, stamp));
  } else if (req.action === "addToList" && params.p.list !== null) {
    const chosen = params.p.list;
    let row: StoredContactList | null = chosen.kind === "existing" ? chosen.row : null;
    if (chosen.kind === "new") {
      row = await db.contactList.create({
        id: newListId(), name: chosen.name, description: null, createdAt: at, createdBy: officerId, updatedAt: at, updatedBy: officerId,
      });
      // ⛔ The unique index refused it: somebody created the name between the check and here.
      if (row === null) return refuse("list_exists", BULK_SENTENCES.listExists(chosen.name), "list");
      listCreated = true;
    }
    if (row === null) return refuse("bad_list", BULK_SENTENCES.noSuchList, "list");
    const listRowId = row.id;
    listId = listRowId;
    listName = row.name;
    done = await setWrite((w) => w.addToList(listRowId, stamp));
  } else if (req.action === "remove") {
    // ⛔ vb7 (review m1) · ALL OR NOTHING: over a filter, the confirmed ids in ONE call — the store runs every chunk in ONE
    // transaction — and over ticked rows ONE statement.
    done = bound !== null ? await deps.writes(req.audience).removeBound(bound) : await deps.writes(req.audience).remove();
  } else if (req.action === "withdraw") {
    await withdrawEach(numbers, officerId, runId, at, out);
  } else if (req.action === "suppress") {
    await suppressEach(numbers, officerId, runId, at, deps.suppressionReason, out);
  } else {
    return refuse("bad_request", BULK_SENTENCES.badRequest);
  }
  } catch (err) {
    // ⛔ A RUN THAT DIES MID-WAY STILL LEAVES ITS ONE AUDIT ROW (review F2, 2026-10-02) — marked `partial`, with how far a
    // per-number loop got, or (vb7) how far a bound write's chunks got; a single set-based statement's partial count is
    // unknown, so none is claimed. The ledger rows and stops it did write carry `contacts-bulk:<runId>` as evidence; the
    // error itself goes on to the action. ⭐ vb7 (review m1) · a REMOVE is all or nothing, so one that died removed nobody:
    // its row says `rolledBack`, and claims no count.
    if (req.action === "remove") await writeAudit(null, "rolled_back").catch(() => undefined);
    else await writeAudit(isPerRowAction(req.action) || bound !== null ? out : null, "partial").catch(() => undefined);
    throw err;
  }

  await writeAudit(done, "done");
  return {
    ok: true, action: req.action, matched: done.matched, changed: done.changed, unchanged: done.unchanged, full: done.full, listName,
    tag: req.action === "tag" || req.action === "untag" ? tag : null,
  };
}

/**
 * 🔴 D19 / A1.1 · WHAT THE ACTION HANDS THE BROWSER. Until U33 a WITHDRAWN ledger row can only be a player's (or an
 * erasure's), so "1 already withdrawn" on a number a masked role ticked answers "is this a player?". 🔴 OD54 · and until
 * the importer goes live a stop can only be a player's own opt-out or an officer's, so "1 already suppressed" answers it
 * too. A viewer whose identity.contact cell is not `read` is told a withdrawal's or a suppression's TOTAL only — the
 * split is absent, not hidden. Every other action's split (a tag, a list, a removal) is an officer's own fact and stays.
 */
export function contactBulkReply(r: BulkOutcome | BulkRefusal, reads: boolean): BulkOutcome | BulkRefusal {
  if (!r.ok || reads || (r.action !== "withdraw" && r.action !== "suppress")) return r;
  return { ...r, changed: null, unchanged: null };
}
