/**
 * U34a · THE CONTACTS EXPORT — the book as a CSV file, through the ONE audience resolver.           (S10, 2026-10-02)
 *
 * ⭐ WHAT IT IS. `GET /api/admin/contacts/export?<the page's filter>` answers every contact the page's filter matches —
 * all of them, not one page — as a UTF-8 CSV download. The route is thin (the session → the viewer on the STORED role
 * row → `checkAdminTotp`, each failure its one identical 404); everything after that lives here, built from parts the
 * suite swaps one at a time (`ContactsExportDeps` — production never passes them).
 *
 * ⭐ THE FILTER, NEVER A LIST (decision X27). The address is read by U24's ONE parser (`parseContactAudienceParams`):
 * an unknown value REFUSES (C2), and a ticked selection cannot travel in an address at all. A viewer who may not read a
 * number is refused every filter U24's ONE role rule keeps for a reader (`roleRefusal`, D19 / A1.1 — consent, source,
 * player, and any it adds), in that rule's own words, before anything is counted. ⛔ C8b (B3) · …and a WHOLE-NUMBER search
 * (`maskedNumberSearchRefusal`, `number-search.ts`): for that viewer the page answers such a search with whether the book
 * holds the number and nothing else, so a typed or forged export address that searches one is refused `number_search`
 * before anything is counted — a file of its one row would hand back what the page withholds. A name search is unchanged.
 * The export's OWN instant is the Added window's upper bound (X7 — `addedBefore`, no DAL change):
 * a contact added while the file streams is in neither the count nor the file. Erased rows are in no audience
 * (C3 — `toAudienceWhere` leaves the tombstone out of every count and walk).
 * ⭐ ROWS COME FROM THE RESOLVER'S KEYSET WALK by id, a step at a time, and NEVER MORE THAN THE COUNT THE AUDIT
 * RECORDED: the file cannot hold more rows than `pii.revealed` says left. A row that starts matching mid-walk may
 * displace a counted one — the accepted direction of error: the record can over-state, never under-state. A walk that
 * fails mid-file ERRORS the stream, so the browser marks the download failed instead of keeping a short file that
 * looks whole.
 *
 * ⭐ THE ONE WRITER (X11, C16, C19). Every line goes through U28's `toCsv` (`csv-write.ts`): every cell quoted, the
 * formula guard that reverses exactly, CRLF after every line, and the byte-order mark — written by it, once, at the
 * head of the file; U25's `stripBom` is its pair on the way back in. The header words are U28's alone
 * (`contactExportHeader`, the ONE field list), and the Consent and Source words are the page's own (`contacts-copy.ts`,
 * C13), as is the Operator brand (`operatorBrand`, the ONE numbering table).
 *
 * ⭐ WHO GETS WHICH FILE — the page's split, decided on the STORED role (`readCell`), never on the cookie:
 *   · read   — the number as `+255…` and the email as stored, plus the Consent and Source columns;
 *   · masked — the number and the email through their registry masks (`contactPhone` U19, `contactEmail` M5), and NO
 *              Consent or Source column (X11, A1.1: until U33 either one, row by row, says who is a player);
 *   · none   — neither identity column at all (READ_TIERS only ever subtracts).
 *   No player column for anyone. A masked file's header names its two identity columns masked, because a CSV has no
 *   eye: the header is the only place a spreadsheet can say which artefact it is — and U28 refuses that file by name on
 *   re-import.
 *
 * ⭐ THE RECORD COMES FIRST. A reader's pull of N > 0 rows writes `pii.revealed` with the row count, AWAITED, then
 * `contacts.exported`; a masked pull writes `contacts.exported` alone. Both are awaited BEFORE the stream exists, and
 * a row that did not record (`recorded: false` — audit.ts never rejects, so the flag is the only signal) answers 503
 * with no file. A refusal writes `contacts.export_refused`. All three carry one export id, so an investigator can
 * join them. The filter is written by U24's ONE describer (`auditContactAudience`): a whole-number search masked, a
 * name search as its length — never a raw `q`, because the chain is unprunable and erasure cannot reach it.
 * ⛔ THE TRANSACTIONS EXPORT'S TWO RESIDUALS ARE NOT COPIED: it decides its read cell on the COOKIE's role
 * (`mayReveal(session.role, …)`) and writes its raw `q` into the chain. That route is outside this unit's permission;
 * the plan's §0 records both.
 *
 * ⭐ vb7 · THE VALIDATION PASS:
 *   · AN ADDRESS KEY THE PAGE NEVER WRITES IS REFUSED (400, `unknown_param`) — `?operator=vodacom` or `?tags=vip` used to
 *     be dropped by `exportParamsOf` and export the WHOLE book under a filter nobody got;
 *   · A BOOK THAT CANNOT BE COUNTED is a 503 with a sentence and an `export_refused` row (`read_failed`), never Next's
 *     bare 500 with no record;
 *   · A SELECTION IN THE ADDRESS is told what an export takes — the page's filter, never ticked rows;
 *   · THE FILE SPEAKS EAST AFRICA TIME: its name and its Added cells are the wall clock an officer in Dar reads, each
 *     cell still one exact instant (`+03:00`);
 *   · THE DOOR (`contactsExportDoor`) is the route's whole decision, here where the suite drives it: a stranger still
 *     gets the ONE 404, an officer whose second factor lapsed goes to the step-up page, and a refused download comes back
 *     to the list as a 303 carrying `?export=<reason>`, which the page says in words.
 *
 * Guard: `npm run test:contacts-export` (in-process, with a `--prove-red` run) · the export leg of
 * `npm run test:contacts-audience` (the list's total = X-Rows-Matched = the rows parsed back).
 */
import { randomBytes } from "node:crypto";
import { db } from "@/lib/server/store";
import type { StoredMarketingContact } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { canView, readCell } from "@/lib/server/rbac";
import { domainForPath, isStaffRole } from "@/lib/server/roles";
import type { ReadCell, Role } from "@/lib/server/roles";
import { SENSITIVE_FIELDS } from "@/lib/server/sensitive-fields";
import {
  auditContactAudience, contactAudience, contactAudienceParams, parseContactAudienceParams, roleRefusal,
  CONTACT_AUDIENCE_URL_KEYS, scrubPhoneRuns,
} from "@/lib/server/marketing/audience";
import type { ContactAudience, ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { toCsv } from "@/lib/contacts/csv-write";
import { contactExportHeader, joinTags } from "@/lib/contacts/contact-fields";
import { EAT_OFFSET_MS } from "@/lib/eat-day";
import type { AdminTotpStatus } from "@/lib/server/admin-guard";
import { contactsHref, operatorBrand } from "@/app/admin/contacts/contacts-query";
import {
  CONSENT_LABEL, CONTACTS_EXPORT, CONTACTS_FILTER_NOT_FOR_ROLE, SOURCE_LABEL, contactsExportTooMany, isContactsExportRefusal,
} from "@/app/admin/contacts/contacts-copy";
import type { ContactsExportRefusal } from "@/app/admin/contacts/contacts-copy";
import { maskedNumberSearchRefusal } from "@/lib/server/contacts/number-search";

/* ═══ THE CONSTANTS ════════════════════════════════════════════════════════════════════════════════ */

/** The page the file serves. Its domain IS the export's domain — the page's own gate (`admin-section-gate.tsx`). */
export const CONTACTS_PAGE_PATH = "/admin/contacts";
/** The route the page head's link points at. */
export const CONTACTS_EXPORT_PATH = "/api/admin/contacts/export";
/** ⛔ More matching contacts than this is REFUSED (422, both numbers named) — never a file cut short in silence. */
export const CONTACTS_EXPORT_MAX = 200_000;
/** Rows per keyset step — the resolver's own walk clamp (`audience.ts`), so no step asks for more than it is given. */
export const CONTACTS_EXPORT_PAGE = 1000;

/** The registry entries the two identity columns are masked through. Both belong to ONE read class
 *  (`identity.contact`), so one cell decides both columns. */
const PHONE = SENSITIVE_FIELDS.contactPhone;
const EMAIL = SENSITIVE_FIELDS.contactEmail;

/* ═══ THE VIEWER — the session's id, the STORED row's role, the page's domain, the cell ═══════════════ */

export type ContactsExportViewer = { userId: string; role: Role; cell: ReadCell };

export type ContactsExportViewerDeps = {
  /** The viewer's STORED row. ⛔ Never the session's `role` — a photograph from sign-in that a demotion never reaches (W25). */
  loadUser: (userId: string) => Promise<{ role: string } | null>;
  canView: typeof canView;
  readCell: typeof readCell;
};

export const CONTACTS_EXPORT_VIEWER_DEPS: ContactsExportViewerDeps = {
  loadUser: async (userId) => {
    try {
      return (await Promise.resolve(db.user.findById(userId))) ?? null;
    } catch {
      // ⛔ A row that cannot be read is no viewer — the route's 404, never an open door.
      return null;
    }
  },
  canView,
  readCell,
};

/**
 * Who may export, and which file they get — or null, which the route answers with its one 404.
 * ⛔ THE SESSION GIVES THE VIEWER'S ID AND NOTHING ELSE — the parameter's type admits nothing more. The role is the
 * stored row's, re-read here, so a demoted officer holding an old cookie gets what the matrix says today. The gate is
 * the contacts page's own (a staff role that may VIEW its domain, `domainForPath`), and the cell is `identity.contact`'s.
 */
export async function contactsExportViewer(
  session: { userId: string } | null,
  deps: ContactsExportViewerDeps = CONTACTS_EXPORT_VIEWER_DEPS,
): Promise<ContactsExportViewer | null> {
  if (session === null) return null;
  const role = (await deps.loadUser(session.userId))?.role;
  if (!isStaffRole(role)) return null;
  if (!(await deps.canView(role, domainForPath(CONTACTS_PAGE_PATH)))) return null;
  return { userId: session.userId, role, cell: await deps.readCell(role, PHONE.readClass) };
}

/* ═══ THE COLUMNS ══════════════════════════════════════════════════════════════════════════════════ */

/**
 * What each column holds, in `contactExportHeader`'s order — U28's contract: the five file columns of the ONE field
 * list, then its four export-only columns (operator, consent, source, and the instant the contact was added). The
 * header WORDS are U28's alone (`contactExportHeaderFor`); these keys only say which value fills each position.
 */
export const CONTACT_EXPORT_KEYS = ["phone", "name", "email", "tags", "notes", "operator", "consent", "source", "added"] as const;
export type ContactExportKey = (typeof CONTACT_EXPORT_KEYS)[number];

/** ⛔ A1.1 + X11 — a per-row consent or source answers "is this a player?": a READER's columns only. */
const READER_ONLY: ReadonlySet<ContactExportKey> = new Set<ContactExportKey>(["consent", "source"]);
/** The two `identity.contact` columns — ABSENT, not blank, for a `none` cell. */
const IDENTITY: ReadonlySet<ContactExportKey> = new Set<ContactExportKey>(["phone", "email"]);

/** The columns a viewer's file carries, in the header's order. */
export function contactExportKeys(cell: ReadCell): ContactExportKey[] {
  if (cell === "read") return [...CONTACT_EXPORT_KEYS];
  return CONTACT_EXPORT_KEYS.filter((k) => !READER_ONLY.has(k) && (cell === "masked" || !IDENTITY.has(k)));
}

/** The header line for those columns — every word from `contactExportHeader`: a reader's spellings, else the masked. */
export function contactExportHeaderFor(keys: readonly ContactExportKey[], cell: ReadCell): string[] {
  const words = contactExportHeader(cell === "read");
  return keys.map((k) => words[CONTACT_EXPORT_KEYS.indexOf(k)] ?? "");
}

/**
 * One contact's cells for those columns. ⛔ THE NUMBER AND THE EMAIL ARE REVEALED FOR A READER ONLY — anyone else gets
 * the registry's own masks (`+255••••NN`, `a••••@example.com`), exactly what the page renders. A reader's number is
 * the `+255…` spelling the reveal hands back; the writer's guard keeps a spreadsheet from reading it as a formula.
 */
/**
 * ⛔ FREE TEXT IN A FILE THAT MAY NOT CARRY NUMBERS (U34a review MINOR-2). A masked or `none` file masked the phone and
 * email COLUMNS, but a note reading "alt 0754 123 456 / asha@x.com" went out whole — and one bulk file of every note is
 * a different exposure from one dialog. Inside a name, the tags and the notes, every run that reads as a phone number
 * and every email-shaped word is masked the way its column is. A reader's file keeps the officer's words as typed.
 */
const EMAIL_IN_TEXT = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
export function maskFreeText(s: string): string {
  return scrubPhoneRuns(s).replace(EMAIL_IN_TEXT, (m) => EMAIL.mask(m));
}

/**
 * ⛔ A CROSS-SITE REQUEST NEVER STARTS AN EXPORT (U34a review MAJOR-1). A top-level navigation from another site carries
 * the SameSite=Lax session and second-factor cookies, so a link anywhere could make a signed-in officer's browser write
 * a bulk-reveal row in their name (and drop the book in their Downloads) with a filter the link chose. `Sec-Fetch-Site`
 * from this origin, a typed or bookmarked address ("none"), or a client too old to send the header is let through — the
 * preview door's rule (`sameOriginRequest`), plus "none" for a download an officer asks for by hand.
 */
export function exportRequestAllowed(secFetchSite: string | null): boolean {
  return secFetchSite === null || secFetchSite === "same-origin" || secFetchSite === "none";
}

/** vb7 · East Africa Time's offset as ISO 8601 writes it ("+03:00"), from the ONE offset (`EAT_OFFSET_MS`). */
const EAT_SUFFIX = `+${String(Math.floor(EAT_OFFSET_MS / 3_600_000)).padStart(2, "0")}:${String(Math.floor((EAT_OFFSET_MS % 3_600_000) / 60_000)).padStart(2, "0")}`;

/**
 * ⭐ vb7 · AN INSTANT AS EAST AFRICA TIME — ISO 8601 with its offset ("2026-09-01T10:00:00+03:00"): the wall clock an
 * officer in Dar reads, and still exactly one instant to any program that reads the file. An unreadable stamp is kept as
 * stored, never invented.
 */
export function eatIsoInstant(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return `${new Date(ms + EAT_OFFSET_MS).toISOString().slice(0, 19)}${EAT_SUFFIX}`;
}

export function contactExportRow(c: StoredMarketingContact, keys: readonly ContactExportKey[], cell: ReadCell): string[] {
  const reveal = cell === "read";
  const text = (s: string) => (reveal ? s : maskFreeText(s));
  const value: Record<ContactExportKey, () => string> = {
    phone: () => (reveal ? `+${c.msisdn}` : PHONE.mask(c.msisdn)),
    name: () => text(c.displayName ?? ""),
    email: () => (c.email === null || c.email === "" ? "" : reveal ? c.email : EMAIL.mask(c.email)),
    tags: () => text(joinTags(c.tags)),
    notes: () => text(c.notes ?? ""),
    operator: () => operatorBrand(c.ndc) ?? "",
    consent: () => CONSENT_LABEL[c.consentState].label,
    source: () => SOURCE_LABEL[c.source],
    added: () => eatIsoInstant(c.createdAt),
  };
  return keys.map((k) => value[k]());
}

/* ═══ THE WALK ═════════════════════════════════════════════════════════════════════════════════════ */

/**
 * The rows, one keyset step at a time (`walk`: id ascending — no offset, and no phone number ever forms the cursor),
 * and ⛔ NEVER MORE THAN `matched`, the count the audit recorded: each step asks for no more than is left. A walk that
 * fails THROWS out of here, so the stream errors rather than ending early.
 */
export async function* contactExportPages(
  audience: ContactAudience,
  matched: number,
  pageSize: number,
): AsyncGenerator<StoredMarketingContact[], void, undefined> {
  let left = matched;
  let afterId: string | null = null;
  while (left > 0) {
    const step = await audience.walk(afterId, Math.min(pageSize, left));
    const rows = step.rows.length > left ? step.rows.slice(0, left) : step.rows;
    if (rows.length === 0) return;
    left -= rows.length;
    yield rows;
    if (step.nextAfterId === null) return;
    afterId = step.nextAfterId;
  }
}

/** The file as a stream of UTF-8 chunks: the head (the mark and the header line) first, then one chunk per step.
 *  ⛔ A failure after the head ERRORS the stream — a download that fails, never a short file that looks complete. */
function csvStream(head: string, rest: AsyncGenerator<string, void, undefined>): ReadableStream<Uint8Array> {
  const utf8 = new TextEncoder();
  let headSent = false;
  // ⚠️ A cancelled download (the officer closed it) is not a failed walk (review MINOR-4): a step still in flight when
  // it was cancelled lands on a closed stream, and that is neither logged as a database fault nor written anywhere.
  let cancelled = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (cancelled) return;
      if (!headSent) {
        headSent = true;
        controller.enqueue(utf8.encode(head));
        return;
      }
      let next: IteratorResult<string, void>;
      try {
        next = await rest.next();
      } catch (err) {
        if (cancelled) return;
        console.error("[contacts-export] the walk failed mid-file; the download fails rather than ending short:", (err as Error)?.message ?? err);
        controller.error(err);
        return;
      }
      if (cancelled) return;
      if (next.done) controller.close();
      else controller.enqueue(utf8.encode(next.value));
    },
    async cancel() {
      cancelled = true;
      await rest.return(undefined);
    },
  });
}

/* ═══ THE EXPORT ═══════════════════════════════════════════════════════════════════════════════════ */

export type ContactsExportDeps = {
  /** U24's ONE resolver. */
  audience: (f: ContactAudienceFilter) => ContactAudience;
  /** U24's ONE address parser and ONE role rule (C2, D19 / A1.1). */
  parse: typeof parseContactAudienceParams;
  roleRefusal: typeof roleRefusal;
  /** C8b (B3) · a masked viewer's whole-number search refused before anything is counted (`number-search.ts`). */
  numberSearch: typeof maskedNumberSearchRefusal;
  /** U24's ONE audit describer (C6). */
  describe: typeof auditContactAudience;
  /** The columns a cell carries, and one row's cells. */
  keys: typeof contactExportKeys;
  row: typeof contactExportRow;
  /** The keyset walk, capped at the audited count. */
  pages: typeof contactExportPages;
  /** U28's ONE writer (C16). */
  write: typeof toCsv;
  audit: typeof audit;
  pageSize: number;
  max: number;
  newExportId: () => string;
};

export const CONTACTS_EXPORT_DEPS: ContactsExportDeps = {
  audience: (f) => contactAudience(f),
  parse: parseContactAudienceParams,
  roleRefusal,
  numberSearch: maskedNumberSearchRefusal,
  describe: auditContactAudience,
  keys: contactExportKeys,
  row: contactExportRow,
  pages: contactExportPages,
  write: toCsv,
  audit,
  pageSize: CONTACTS_EXPORT_PAGE,
  max: CONTACTS_EXPORT_MAX,
  // Sixteen letters, as the bulk bar's run ids: an id that rides in an audit row must never hold a digit run.
  newExportId: () => Array.from(randomBytes(16), (b) => String.fromCharCode(97 + (b % 26))).join(""),
};

export type ContactsExportRequest = {
  viewer: ContactsExportViewer;
  /** The address's parameters, in the shape Next hands a page its `searchParams` (a repeated key is an array). */
  params: Record<string, string | string[] | undefined>;
  /** The export's own instant, in ms — the Added window's upper bound (X7) and the file name's stamp. */
  now: number;
  /** vb7 · the address keys the parser does not read (`exportStrayParams`) — any one refuses the export. */
  stray?: readonly string[];
};

/** The keys the parser reads — `ids` included, so a selection in an address is REFUSED rather than ignored (X27). */
const PARAM_KEYS: readonly string[] = [...CONTACT_AUDIENCE_URL_KEYS, "ids"];

/** ⛔ vb7 · every key of the address the parser does NOT read, each once — so the export can REFUSE it instead of
 *  dropping it into the whole book. Counted, never echoed: a key can hold anything someone typed. */
export function exportStrayParams(url: URL): string[] {
  const seen = new Set<string>();
  for (const key of url.searchParams.keys()) if (!PARAM_KEYS.includes(key)) seen.add(key);
  return [...seen];
}

/** The route's address → the parser's input, one value per key or an array for a repeated key, and nothing the parser
 *  does not read (so no key can reach the object's prototype). */
export function exportParamsOf(url: URL): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of PARAM_KEYS) {
    const all = url.searchParams.getAll(key);
    if (all.length > 0) out[key] = all.length === 1 ? all[0] : all;
  }
  return out;
}

/**
 * The page head's link: the export route carrying the page's OWN filter, written by U24's ONE address writer
 * (`contactAudienceParams`), so the route's parser reads back exactly the filter the page listed — a relative window
 * already absolute. ⛔ null when the filter cannot be an address (a ticked selection, X27): then there is no link.
 */
export function contactsExportHref(f: ContactAudienceFilter): string | null {
  const params = contactAudienceParams(f);
  if (params === null) return null;
  const qs = new URLSearchParams(params).toString();
  return qs === "" ? CONTACTS_EXPORT_PATH : `${CONTACTS_EXPORT_PATH}?${qs}`;
}

/** ⭐ X7 · the export's own instant as the Added window's upper bound — the earlier of the filter's bound and now. */
function boundedBy(f: ContactAudienceFilter, asOf: string): ContactAudienceFilter {
  const before = f.addedBefore !== null && Date.parse(f.addedBefore) <= Date.parse(asOf) ? f.addedBefore : asOf;
  return { ...f, addedBefore: before };
}

/** A refusal names the parameter — one of the parser's own keys — and never what was typed into it: a typed value can
 *  be a phone number, and the chain is unprunable. */
function knownParam(param: string): string {
  return PARAM_KEYS.includes(param) ? param : "filter";
}

/** vb7 · the header a refusal names its reason in — the door reads it to send the officer back to the list. */
export const EXPORT_REFUSED_HEADER = "X-Export-Refused";

function plain(status: number, sentence: string, refusal: ContactsExportRefusal): Response {
  return new Response(sentence, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      [EXPORT_REFUSED_HEADER]: refusal,
    },
  });
}

/** vb7 · the count, at the export's instant — or the fault it threw, which the export answers as `read_failed`. */
async function countFor(deps: ContactsExportDeps, filter: ContactAudienceFilter): Promise<
  { ok: true; audience: ContactAudience; matched: number } | { ok: false; error: unknown }
> {
  try {
    const audience = deps.audience(filter);
    return { ok: true, audience, matched: await audience.count() };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * The export, for a viewer the route has already let in. ⛔ THE ORDER IS THE CONTRACT: the parser → the role rule →
 * the export's instant as the window's end → the COUNT → the ceiling → `pii.revealed` (a reader's non-empty pull),
 * awaited → `contacts.exported`, awaited → only then the stream. Nothing is read from the book before the role rule,
 * and no byte of the file exists before both rows are recorded.
 */
export async function exportContactsCsv(req: ContactsExportRequest, deps: ContactsExportDeps = CONTACTS_EXPORT_DEPS): Promise<Response> {
  const { viewer } = req;
  const asOf = new Date(req.now).toISOString();
  const exportId = deps.newExportId();
  const reads = viewer.cell === "read";
  const record = (action: string, payload: Record<string, unknown>) => deps.audit({
    category: "COMPLIANCE",
    action,
    actorId: viewer.userId,
    targetType: PHONE.targetType,
    targetId: exportId,
    payload: { role: viewer.role, asOf, ...payload },
  });
  const refuse = async (status: number, sentence: string, payload: Record<string, unknown>, refusal: ContactsExportRefusal): Promise<Response> => {
    await record("contacts.export_refused", payload);
    return plain(status, sentence, refusal);
  };
  const unrecorded = async (which: string): Promise<Response> => {
    console.error(`[contacts-export] ${which} was not recorded, so no file was sent`);
    await record("contacts.export_refused", { reason: "unrecorded", unrecorded: which });
    return plain(503, CONTACTS_EXPORT.unrecorded, "unrecorded");
  };

  // ── ⛔ vb7 · a key this page never writes is REFUSED, never dropped — `?operator=vodacom` exported the whole book. The
  // record counts the keys and names none (a key can hold anything someone typed). ──
  const stray = req.stray ?? [];
  if (stray.length > 0) return refuse(400, CONTACTS_EXPORT.stray, { reason: "unknown_param", keys: stray.length }, "unknown_param");

  // ── the filter: U24's ONE parser, then its ONE role rule — both before anything is counted ──
  const parsed = deps.parse(req.params, req.now);
  if (!parsed.ok) {
    // vb7 · a selection in the address is told what an export takes — the page's filter, never ticked rows.
    if (parsed.param === "ids") return refuse(400, CONTACTS_EXPORT.noSelection, { reason: "unreadable_filter", param: "ids" }, "selection");
    return refuse(400, CONTACTS_EXPORT.unreadable(parsed.param, parsed.reason), { reason: "unreadable_filter", param: knownParam(parsed.param) }, "unreadable_filter");
  }
  const role = deps.roleRefusal(parsed.filter, reads);
  if (role !== null) {
    return refuse(403, `${CONTACTS_FILTER_NOT_FOR_ROLE.body(role.param, role.reason)} ${CONTACTS_EXPORT.nothingSent}`, { reason: "role", param: knownParam(role.param) }, "role");
  }
  // ⛔ C8b (B3) · a masked viewer's whole-number search is no audience: refused before anything is counted.
  const numberSearch = deps.numberSearch(parsed.filter, reads);
  if (numberSearch !== null) {
    return refuse(403, `${numberSearch.reason} ${CONTACTS_EXPORT.nothingSent}`, { reason: "number_search", param: "q" }, "number_search");
  }

  // ── the count, at the export's own instant (X7) ──
  const filter = boundedBy(parsed.filter, asOf);
  // ⛔ vb7 · a book that cannot be counted is a REFUSAL — a sentence with a next step and an export_refused row — never
  // Next's bare 500 with nothing recorded. Only the fault's name is logged: a database error's text can print the query.
  const counted = await countFor(deps, filter);
  if (!counted.ok) {
    console.error("[contacts-export] the book could not be counted, so no file was sent:", (counted.error as Error)?.name ?? "Error");
    return refuse(503, CONTACTS_EXPORT.readFailed, { reason: "read_failed" }, "read_failed");
  }
  const { audience, matched } = counted;
  const described = deps.describe(filter);
  if (matched > deps.max) {
    return refuse(422, contactsExportTooMany(matched, deps.max), { reason: "too_many", matched, max: deps.max, filter: described }, "too_many");
  }

  const keys = deps.keys(viewer.cell);
  const header = contactExportHeaderFor(keys, viewer.cell);

  // ── ⭐ THE RECORD BEFORE THE FIRST BYTE ──
  if (reads && matched > 0) {
    // ⛔ The COUNT and the CLASS, never a value — the rule the single-field reveal obeys (players/actions.ts).
    const revealed = await record("pii.revealed", {
      field: "contactPhone", fields: ["contactPhone", "contactEmail"], readClass: PHONE.readClass, bulk: true, rows: matched,
    });
    if (!revealed.recorded) return unrecorded("pii.revealed");
  }
  const exported = await record("contacts.exported", { filter: described, matched, masked: !reads, cell: viewer.cell, columns: header });
  if (!exported.recorded) return unrecorded("contacts.exported");

  // ── the file: the head, then every step's rows through the ONE writer ──
  async function* chunks(): AsyncGenerator<string, void, undefined> {
    for await (const rows of deps.pages(audience, matched, deps.pageSize)) {
      yield deps.write(rows.map((c) => deps.row(c, keys, viewer.cell)));
    }
  }
  // vb7 · the file's name is stamped in East Africa Time — the clock on the officer's wall, as its Added cells are.
  const stamp = new Date(req.now + EAT_OFFSET_MS).toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new Response(csvStream(deps.write([header], { bom: true }), chunks()), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="50pick-contacts-${stamp}${reads ? "" : "-masked"}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      // ⭐ The count the audit recorded — the file holds no more rows than this (`contactExportPages`).
      "X-Rows-Matched": String(matched),
      // True — like the file name's "-masked" — for every file that is not the full one: a masked cell's, and a `none`
      // cell's, which carries no identity column at all.
      "X-Export-Masked": String(!reads),
    },
  });
}

/* ═══ vb7 · THE DOOR — the route's whole decision, where the suite drives it ═══════════════════════════════════════ */

/** What the door reads of the request: its method, its address and its `Sec-Fetch-Site` header. ⛔ Only the address's
 *  query is read — never its host, which on Railway is the container's. */
export type ContactsExportDoorRequest = { method: string; url: string; secFetchSite: string | null };

/** The door's answer: the ONE 404, a 303 to one of this console's own pages, or the export's own response. */
export type ContactsExportDoorAnswer =
  | { kind: "not_found" }
  | { kind: "see_other"; to: string }
  | { kind: "response"; response: Response };

/** What the door asks, in order. The route passes the platform's own; `test:contacts-export` passes stand-ins. */
export type ContactsExportDoorDeps = {
  /** The session cookie — the viewer's id and nothing else is read from it. */
  session: () => Promise<{ userId: string; sessionId: string } | null>;
  /** The viewer on the STORED role (`contactsExportViewer`). */
  viewer: (session: { userId: string } | null) => Promise<ContactsExportViewer | null>;
  /** The second factor (`checkAdminTotp`): a direct GET skips the admin layout's gate, so the door asks itself. */
  secondFactor: (userId: string, sessionId: string) => Promise<AdminTotpStatus>;
  /** The export (`exportContactsCsv`). */
  run: (req: ContactsExportRequest) => Promise<Response>;
  now: () => number;
};

/** vb7 · a lapsed (or never set up) second factor: the step-up page, which returns the officer to the list's own address
 *  for this filter — written by the ONE href builder, so `ids`, `page` and any stray key never travel. */
export function contactsExportStepUpHref(status: Exclude<AdminTotpStatus, "ok">, params: Record<string, string | string[]>): string {
  const page = status === "not-enrolled" ? "/admin/2fa/setup" : "/admin/totp-verify";
  return `${page}?next=${encodeURIComponent(contactsHref(params))}`;
}

/** vb7 · a refused download: the list again, for the same filter, saying why (`?export=<reason>`, read by the page from
 *  `CONTACTS_EXPORT_REFUSED`). */
export function contactsExportBackHref(params: Record<string, string | string[]>, refusal: ContactsExportRefusal): string {
  const list = contactsHref(params);
  return `${list}${list.includes("?") ? "&" : "?"}export=${encodeURIComponent(refusal)}`;
}

/** vb7 · the reason a response refused with (`EXPORT_REFUSED_HEADER`, set by `plain`) — or null for a file. */
export function contactsExportRefusalOf(response: Response): ContactsExportRefusal | null {
  const raw = response.headers.get(EXPORT_REFUSED_HEADER);
  return isContactsExportRefusal(raw) ? raw : null;
}

/**
 * ⭐ vb7 · THE EXPORT'S DOOR — the route's whole decision, in this order, and the order IS the gate:
 *   1. GET only, never a cross-site request (`exportRequestAllowed`) — before the session is read;
 *   2. a session, and a viewer decided on the STORED role (`contactsExportViewer`);
 *      ⛔ a failure of 1 or 2 is the ONE identical 404 — a stranger learns nothing and is sent nowhere;
 *   3. the second factor: an officer whose 2-step sign-in lapsed, or was never set up, is sent to the step-up page with
 *      `next` the list for this filter — never the file, and never "Not Found";
 *   4. the export; a refusal it answers comes back to the list as a 303 with `?export=<reason>`, which the page says in
 *      words, and a file is handed through untouched.
 */
export async function contactsExportDoor(req: ContactsExportDoorRequest, deps: ContactsExportDoorDeps): Promise<ContactsExportDoorAnswer> {
  if (req.method !== "GET" || !exportRequestAllowed(req.secFetchSite)) return { kind: "not_found" };
  const session = await deps.session();
  const viewer = await deps.viewer(session);
  if (!session || !viewer) return { kind: "not_found" };
  const url = new URL(req.url, "http://export.invalid");
  const params = exportParamsOf(url);
  const factor = await deps.secondFactor(session.userId, session.sessionId);
  if (factor !== "ok") return { kind: "see_other", to: contactsExportStepUpHref(factor, params) };
  const response = await deps.run({ viewer, params, stray: exportStrayParams(url), now: deps.now() });
  const refused = contactsExportRefusalOf(response);
  return refused === null ? { kind: "response", response } : { kind: "see_other", to: contactsExportBackHref(params, refused) };
}
