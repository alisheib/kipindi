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
 * player, and any it adds), in that rule's own words, before anything is counted. The export's OWN instant is the Added window's upper bound (X7 — `addedBefore`, no DAL change):
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
  CONTACT_AUDIENCE_URL_KEYS,
} from "@/lib/server/marketing/audience";
import type { ContactAudience, ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { toCsv } from "@/lib/contacts/csv-write";
import { contactExportHeader, joinTags } from "@/lib/contacts/contact-fields";
import { operatorBrand } from "@/app/admin/contacts/contacts-query";
import {
  CONSENT_LABEL, CONTACTS_EXPORT, CONTACTS_FILTER_NOT_FOR_ROLE, SOURCE_LABEL, contactsExportTooMany,
} from "@/app/admin/contacts/contacts-copy";

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
export function contactExportRow(c: StoredMarketingContact, keys: readonly ContactExportKey[], cell: ReadCell): string[] {
  const reveal = cell === "read";
  const value: Record<ContactExportKey, () => string> = {
    phone: () => (reveal ? `+${c.msisdn}` : PHONE.mask(c.msisdn)),
    name: () => c.displayName ?? "",
    email: () => (c.email === null || c.email === "" ? "" : reveal ? c.email : EMAIL.mask(c.email)),
    tags: () => joinTags(c.tags),
    notes: () => c.notes ?? "",
    operator: () => operatorBrand(c.ndc) ?? "",
    consent: () => CONSENT_LABEL[c.consentState].label,
    source: () => SOURCE_LABEL[c.source],
    added: () => c.createdAt,
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
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!headSent) {
        headSent = true;
        controller.enqueue(utf8.encode(head));
        return;
      }
      try {
        const next = await rest.next();
        if (next.done) controller.close();
        else controller.enqueue(utf8.encode(next.value));
      } catch (err) {
        console.error("[contacts-export] the walk failed mid-file; the download fails rather than ending short:", (err as Error)?.message ?? err);
        controller.error(err);
      }
    },
    async cancel() {
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
};

/** The keys the parser reads — `ids` included, so a selection in an address is REFUSED rather than ignored (X27). */
const PARAM_KEYS: readonly string[] = [...CONTACT_AUDIENCE_URL_KEYS, "ids"];

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

function plain(status: number, sentence: string): Response {
  return new Response(sentence, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
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
  const refuse = async (status: number, sentence: string, payload: Record<string, unknown>): Promise<Response> => {
    await record("contacts.export_refused", payload);
    return plain(status, sentence);
  };
  const unrecorded = async (which: string): Promise<Response> => {
    console.error(`[contacts-export] ${which} was not recorded, so no file was sent`);
    await record("contacts.export_refused", { reason: "unrecorded", unrecorded: which });
    return plain(503, CONTACTS_EXPORT.unrecorded);
  };

  // ── the filter: U24's ONE parser, then its ONE role rule — both before anything is counted ──
  const parsed = deps.parse(req.params, req.now);
  if (!parsed.ok) {
    return refuse(400, CONTACTS_EXPORT.unreadable(parsed.param, parsed.reason), { reason: "unreadable_filter", param: knownParam(parsed.param) });
  }
  const role = deps.roleRefusal(parsed.filter, reads);
  if (role !== null) {
    return refuse(403, `${CONTACTS_FILTER_NOT_FOR_ROLE.body(role.param, role.reason)} ${CONTACTS_EXPORT.nothingSent}`, { reason: "role", param: knownParam(role.param) });
  }

  // ── the count, at the export's own instant (X7) ──
  const filter = boundedBy(parsed.filter, asOf);
  const audience = deps.audience(filter);
  const matched = await audience.count();
  const described = deps.describe(filter);
  if (matched > deps.max) {
    return refuse(422, contactsExportTooMany(matched, deps.max), { reason: "too_many", matched, max: deps.max, filter: described });
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
  const stamp = asOf.slice(0, 19).replace(/[:T]/g, "-");
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
