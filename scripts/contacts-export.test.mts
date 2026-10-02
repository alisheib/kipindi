/**
 * test:contacts-export — U34a's guard: the contact book's CSV export, `GET /api/admin/contacts/export` (the plan's §9
 * "U34 · Export"; decisions X7 · X11 · X27 and C2 · C3 · C6 · C13 · C16 · C19 · M5 · A1.1).
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script — the REAL export (`exportContactsCsv`,
 * `src/lib/server/contacts/export.ts`) over the memory twin, its body read back through U25's REAL reader:
 *   V1–V6  THE VIEWER: the session gives the id and nothing else; the role is the STORED row's; the gate is the contacts
 *          page's own domain; the cell is identity.contact's, so the file and the page agree on who sees numbers; the
 *          route is thin (the stored row, then the second factor, each failure the identical 404).
 *   M1–M6  WHO GETS WHICH FILE: GROWTH's file masks the number AND the email and carries no Consent or Source column
 *          (X11, A1.1); ADMIN's is full; a `none` cell carries neither identity column; no player column for anyone; and a
 *          masked file is refused whole by U28's matcher on re-import, by its own sentence.
 *   A1–A5  ⭐ THE RECORD BEFORE THE FIRST BYTE (the Accept): a reader's non-empty pull writes pii.revealed with the row
 *          count, then contacts.exported, BOTH resolved before the stream's first chunk is read and before the walk's
 *          first step; an empty pull claims no reveal; a row that did not record answers 503 with no file; the filter is
 *          described by U24's ONE describer (no raw number, never "all").
 *   C1–C4  THE ONE WRITER: the mark once at offset 0 across a multi-chunk stream; every cell quoted, CRLF, a doubled quote,
 *          a line break inside a cell; the BOM written by U28's writer and stripped as a PAIR by U25's reader (the
 *          round-trip fixture's first header is the phone header); no second writer.
 *   K1–K7  THE WALK: a keyset by id, a step at a time; one query path (OD36); capped at the audited count; a failure
 *          errors the stream; the export's own instant bounds the window (X7); erased rows are in no file (C3); the
 *          ceiling refuses with both numbers.
 *   R1–R3  THE FILTER: an unknown value refuses before anything is counted (C2), and its audit never echoes the typed
 *          value; a masked viewer's consent, source or player filter is the role refusal (D19); the route hands the
 *          parser the address's own keys only, `ids` kept so a selection in an address is refused (X27).
 *   E1–E5  THE PAGE: the head's control from the list's own filter, only when that read has rows, labelled masked for a
 *          masked viewer, disabled with its reason over the ceiling; the href round-trips through the parser; the ghost
 *          reserves the control's box; the wiring and the words.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY — a swapped dependency of the export or of the
 * viewer, a reader built without its BOM strip, a wrapped audit, a source string — and requires the MATCHING assertion to
 * fail. The fixture rows go into the memory twin through the store's own `create`; the two rows K5 adds are taken back
 * out of the memory maps in a `finally`, and V5's grants are reset in one, so every run starts from the same book. This
 * file makes no file-modifying call of any kind.
 *
 * Run:  npm run test:contacts-export
 * Red:  npm run red:contacts-export
 */
process.exitCode = 1;
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { db } from "../src/lib/server/store.ts";
import type { StoredMarketingContact, StoredUser } from "../src/lib/server/store.ts";
import {
  contactsExportViewer, CONTACTS_EXPORT_VIEWER_DEPS, exportContactsCsv, CONTACTS_EXPORT_DEPS, contactExportKeys,
  contactExportRow, contactExportPages, contactsExportHref, exportParamsOf, CONTACT_EXPORT_KEYS, CONTACTS_EXPORT_MAX,
  CONTACTS_EXPORT_PAGE, CONTACTS_EXPORT_PATH, CONTACTS_PAGE_PATH,
} from "../src/lib/server/contacts/export.ts";
import type { ContactsExportDeps, ContactsExportViewer, ContactsExportViewerDeps } from "../src/lib/server/contacts/export.ts";
import {
  contactAudience, contactAudienceKey, toAudienceWhere, parseContactAudienceParams, auditContactAudience, roleRefusal, WHOLE_BOOK,
} from "../src/lib/server/marketing/audience.ts";
import type { ContactAudience, ContactAudienceFilter } from "../src/lib/server/marketing/audience.ts";
import { toCsv, unguardCell } from "../src/lib/contacts/csv-write.ts";
import { buildCsvReader, CSV_RULES, decodeBytes, parseCsv, sniffEncoding } from "../src/lib/contacts/import-parse.ts";
import type { CsvReadResult } from "../src/lib/contacts/import-parse.ts";
import {
  autoMapHeaders, contactExportHeader, joinTags, CONTACT_MASKED_FILE, CONTACT_NOT_IMPORTED,
} from "../src/lib/contacts/contact-fields.ts";
import { canView, mayReveal, readCell, setRoleGrant, __resetGrantsForTest } from "../src/lib/server/rbac.ts";
import { EDITABLE_ROLES, STAFF_ROLES, domainForPath } from "../src/lib/server/roles.ts";
import type { Role } from "../src/lib/server/roles.ts";
import { SENSITIVE_FIELDS, maskEmail } from "../src/lib/server/sensitive-fields.ts";
import { maskPhone } from "../src/lib/phone-normalize.ts";
import { parseTzNumber } from "../src/lib/tz-msisdn.ts";
import { formatNumber } from "../src/lib/utils.ts";
import {
  CONSENT_LABEL, SOURCE_LABEL, CONTACTS_EXPORT, CONTACTS_FILTER_NOT_FOR_ROLE, contactsExportTooMany,
} from "../src/app/admin/contacts/contacts-copy.ts";
import { operatorBrand } from "../src/app/admin/contacts/contacts-query.ts";
import { ERASURE_EVIDENCE } from "../src/lib/marketing/erasure-mark.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ═══ CHARACTERS — by code, never typed as escape text (the editing tools decode escapes into raw characters) ═══ */
const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
const BOM = String.fromCharCode(0xfeff);
const QUOTE = String.fromCharCode(34);

const lf = (s: string) => s.split(CRLF).join(LF);
const read = (rel: string) => lf(decomment(readFileSync(join(ROOT, rel), "utf8")));
const rawRead = (rel: string) => lf(readFileSync(join(ROOT, rel), "utf8"));

type Sources = {
  exportTs: string; exportRaw: string; route: string; routeRaw: string; page: string; pageRaw: string;
  loading: string; copyRaw: string; pkg: string;
};
const REAL_SOURCES: Sources = {
  exportTs: read("src/lib/server/contacts/export.ts"),
  exportRaw: rawRead("src/lib/server/contacts/export.ts"),
  route: read("src/app/api/admin/contacts/export/route.ts"),
  routeRaw: rawRead("src/app/api/admin/contacts/export/route.ts"),
  page: read("src/app/admin/contacts/page.tsx"),
  pageRaw: rawRead("src/app/admin/contacts/page.tsx"),
  loading: read("src/app/admin/contacts/loading.tsx"),
  copyRaw: rawRead("src/app/admin/contacts/contacts-copy.ts"),
  pkg: rawRead("package.json"),
};

/* ═══ THE IMPLEMENTATION UNDER TEST — swappable, so a red case can plant one piece ═══════════════════════════ */

type AuditFn = ContactsExportDeps["audit"];
type Impl = {
  viewerDeps: ContactsExportViewerDeps;
  deps: ContactsExportDeps;
  /** How a test's audit stub reaches the export — the identity in production; a plant may wrap it. */
  auditVia: (fn: AuditFn) => AuditFn;
  /** U25's REAL reader — what C3's round trip reads the file back through. */
  parse: (text: string) => CsvReadResult;
  sources: Sources;
};
const REAL: Impl = {
  viewerDeps: CONTACTS_EXPORT_VIEWER_DEPS,
  deps: CONTACTS_EXPORT_DEPS,
  auditVia: (fn) => fn,
  parse: (text) => parseCsv(text),
  sources: REAL_SOURCES,
};

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};
/** One assertion whose evidence is computed by `fn` — a throw is a FAIL of that assertion, never a crashed run. */
async function check(label: string, fn: () => Promise<[boolean, string?]> | [boolean, string?]): Promise<void> {
  try {
    const [c, x] = await fn();
    ok(label, c, x ?? "");
  } catch (err) {
    ok(label, false, `threw: ${(err as Error)?.message ?? String(err)}`);
  }
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ═══ THE AUDIT STUB — it records nothing anywhere; it keeps each entry, may wait, and answers `recorded` as told ═══ */

type Entry = { category: string; action: string; actorId: string | null; targetType: string | null; targetId: string | null; payload: Record<string, unknown> };
type Stub = { fn: AuditFn; entries: Entry[] };
function auditStub(o: { recorded?: (action: string) => boolean; delayMs?: number; log?: string[] } = {}): Stub {
  const entries: Entry[] = [];
  const fn = (async (e: Entry) => {
    if (o.delayMs) await sleep(o.delayMs);
    entries.push(e);
    o.log?.push(`${e.action} resolved`);
    return { recorded: o.recorded ? o.recorded(e.action) : true };
  }) as unknown as AuditFn;
  return { fn, entries };
}
const actions = (es: Entry[]) => es.map((e) => e.action).join(",");

/* ═══ RUNNING ONE EXPORT, AND READING ITS BODY ═══════════════════════════════════════════════════════════════ */

type Params = Record<string, string | string[] | undefined>;
type Run = { status: number; headers: Headers; bytes: Uint8Array; text: string; chunks: number; error: string | null; audits: Entry[] };

/** Every chunk of a body, as the browser would receive them — and the error, if the stream errored. */
async function drain(res: Response): Promise<{ bytes: Uint8Array; chunks: number; error: string | null }> {
  const parts: Uint8Array[] = [];
  let error: string | null = null;
  if (res.body) {
    const reader = res.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }
    } catch (err) {
      error = (err as Error)?.message ?? String(err);
    }
  }
  const bytes = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { bytes.set(p, at); at += p.length; }
  return { bytes, chunks: parts.length, error };
}

async function runExport(impl: Impl, viewer: ContactsExportViewer, params: Params, over: Partial<ContactsExportDeps> = {}, stub: Stub = auditStub()): Promise<Run> {
  const deps: ContactsExportDeps = { ...impl.deps, ...over, audit: impl.auditVia(stub.fn) };
  const res = await exportContactsCsv({ viewer, params, now: NOW }, deps);
  const d = await drain(res);
  // ⛔ Decoded as U25 decodes (`DECODE_OPTIONS`: the mark passed through, never eaten) — so the mark can be counted.
  return { status: res.status, headers: res.headers, bytes: d.bytes, text: decodeBytes(d.bytes, "utf-8"), chunks: d.chunks, error: d.error, audits: stub.entries };
}

/** The file's rows through U25's REAL reader (the header row first), or null when it refused. */
function rowsOf(text: string): string[][] | null {
  const r = parseCsv(text);
  return r.ok ? r.file.rows.map((x) => x.cells) : null;
}

/* ═══ FIXTURES ═══════════════════════════════════════════════════════════════════════════════════════════════ */

const NOW = Date.parse("2026-10-02T09:00:00.000Z");
const AS_OF = new Date(NOW).toISOString();

function contactRow(id: string, local: string, o: Partial<StoredMarketingContact> = {}): StoredMarketingContact {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn || !p.ndc) throw new Error(`fixture ${local} does not parse`);
  return {
    id, msisdn: p.msisdn, rawInput: local, displayName: null, email: null, ndc: p.ndc, operator: null,
    source: "IMPORT", sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null,
    tags: [], notes: null, importId: null, createdAt: "2026-09-01T08:00:00.000Z", createdBy: null,
    updatedAt: "2026-09-01T08:00:00.000Z", updatedBy: null, ...o,
  };
}

/** The file's hard cases, one row each — and an erased tombstone planted to match as much as it can. */
const FIXTURE: StoredMarketingContact[] = [
  contactRow("mx_01", "0712345678", { displayName: "Asha Mwakalinga", email: "asha@example.com", tags: ["vip", "dar"],
    notes: "Line one" + LF + 'Line two, with "quotes"', consentState: "GIVEN", createdAt: "2026-09-01T07:00:00.000Z" }),
  contactRow("mx_02", "0754000111", { displayName: "=SUM(A1:A2)", email: "baraka@example.com", source: "OPERATOR", createdAt: "2026-09-02T07:00:00.000Z" }),
  contactRow("mx_03", "0791000222", { displayName: "'=quoted", source: "REGISTRATION", userId: "usr_mx_held", consentState: "GIVEN", createdAt: "2026-09-03T07:00:00.000Z" }),
  contactRow("mx_04", "0713000333", { source: "AGENT", consentState: "WITHDRAWN", suppressedAt: "2026-09-04T08:00:00.000Z", createdAt: "2026-09-04T07:00:00.000Z" }),
  contactRow("mx_05", "0621000444", { displayName: "-dash lead", notes: "+plus lead", createdAt: "2026-09-05T07:00:00.000Z" }),
  contactRow("mx_06", "0688000555", { displayName: "Juma, Hassan", email: "juma@example.com", tags: ["weekend"], createdAt: "2026-09-06T07:00:00.000Z" }),
  contactRow("mx_07", "0655000666", { displayName: "Neema “Curly” Kileo’s", createdAt: "2026-09-07T07:00:00.000Z" }),
  contactRow("mx_08", "0781000888", { displayName: "王小明", email: "wang@example.com", createdAt: "2026-09-08T07:00:00.000Z" }),
  contactRow("mx_09", "0611000999", { displayName: "Faraja Mushi", tags: ["vip"], createdAt: "2026-09-09T07:00:00.000Z" }),
  // ⛔ THE ERASED TOMBSTONE (C3): a vip tag, inside every window — so every file that lacks it lacks it by the exclusion.
  contactRow("mx_er", "0776000123", { sourceRef: ERASURE_EVIDENCE, consentState: "WITHDRAWN", tags: ["vip"], createdAt: "2026-09-03T08:00:00.000Z" }),
];
for (const c of FIXTURE) await db.marketingContact.create(c);
/** The visible book, in the keyset's order (id ascending). */
const VISIBLE = FIXTURE.filter((c) => c.sourceRef !== ERASURE_EVIDENCE).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const ERASED = FIXTURE.find((c) => c.sourceRef === ERASURE_EVIDENCE) as StoredMarketingContact;
const byMsisdn = new Map(VISIBLE.map((c) => [c.msisdn, c]));

/** One stored user per role — the viewer's STORED row. */
const ROLES_UNDER_TEST: Role[] = [...STAFF_ROLES, "PLAYER"];
const USER_OF = new Map<Role, string>();
for (const [i, role] of ROLES_UNDER_TEST.entries()) {
  const id = `usr_mx_${role.toLowerCase()}`;
  const at = "2026-09-01T08:00:00.000Z";
  await db.user.create({
    id, phoneE164: `+2557000${String(31000 + i)}`, email: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0,
    lockedUntil: null, role, status: "ACTIVE", locale: "EN", displayName: `MX ${role}`, dob: "1990-01-01", region: null,
    acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    emailVerifiedAt: null, createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
  } as StoredUser);
  USER_OF.set(role, id);
}
const userOf = (role: Role) => USER_OF.get(role) as string;
/** The role each test's COOKIE claims — what a viewer decided on the cookie would read (the red plant does). */
const COOKIE_ROLE = new Map<string, Role>();
function asCookie(userId: string, role: Role): { userId: string; sessionId: string; role: Role } {
  COOKIE_ROLE.set(userId, role);
  return { userId, sessionId: "s_mx", role };
}

const READER: ContactsExportViewer = { userId: userOf("ADMIN"), role: "ADMIN", cell: "read" };
const MASKED: ContactsExportViewer = { userId: userOf("GROWTH"), role: "GROWTH", cell: "masked" };
const NONE: ContactsExportViewer = { userId: userOf("MODERATOR"), role: "MODERATOR", cell: "none" };

/** The headers, derived from U28's list INDEPENDENTLY of the module under test: the masked file drops the two
 *  export-only columns a masked role may not have (consent, source); a `none` file also drops the two refused (masked)
 *  identity columns. */
const FULL_HEADER = [...contactExportHeader(true)];
const READER_ONLY_WORDS = new Set(["consent", "source"]);
const MASKED_IDENTITY_WORDS = new Set(CONTACT_NOT_IMPORTED.filter((e) => e.kind === "refused" && e.header !== null).map((e) => e.header as string));
const MASKED_HEADER = contactExportHeader(false).filter((h) => !READER_ONLY_WORDS.has(h));
const NONE_HEADER = MASKED_HEADER.filter((h) => !MASKED_IDENTITY_WORDS.has(h));

/** Every spelling of a fixture's number a file must never carry for a masked viewer: the key, +key, the 0 form, the nine. */
const spellings = (c: StoredMarketingContact) => [c.msisdn, `0${c.msisdn.slice(3)}`, c.msisdn.slice(3)];
const FULL_NUMBER_RUN = /255\d{9}|(^|\D)0[67]\d{8}(\D|$)/;
const MASK = /^[+]255•{4}\d{2}$/;

/* ═══ SOURCE HELPERS ═════════════════════════════════════════════════════════════════════════════════════════ */

/** The text from one marker to the next marker after it ("" when the first is absent) — a declaration's whole body
 *  when the second marker is the declaration that follows it (a brace count would stop at a destructured parameter). */
function between(src: string, from: string, to: string): string {
  const start = src.indexOf(from);
  if (start < 0) return "";
  const end = src.indexOf(to, start + from.length);
  return src.slice(start, end < 0 ? src.length : end);
}
/** `test:read-tiers` 4.4's rule, restated without escape text: a file importing a read-cell DECIDER from the matrix. */
const DECIDERS = ["canRead", "readCell", "mayReveal", "canReveal", "defaultReadGrant", "DEFAULT_READ_GRANTS"];
const importsDecider = (src: string) => [...src.matchAll(/import[^;]*?from\s*["']([^"']+)["']/g)]
  .some((m) => /server[/](?:roles|rbac)$/.test(m[1]) && DECIDERS.some((d) => new RegExp(`(?<![A-Za-z0-9_$])${d}(?![A-Za-z0-9_$])`).test(m[0])));
/** The tokens U28's one-list scanner (`test:contacts-import` §F20) treats as a second field list outside contact-fields.ts. */
const DISTINCTIVE = ["phone_e164", "phone_masked", "email_masked", "added_at"];

/* ═══ THE LABELS, ONCE — the assertions and the red cases both read them ═════════════════════════════════════ */

const L = {
  v1: "V1 · no session → no viewer (the route's 404)",
  v2: "V2 · ⛔ W25 · a cookie that says ADMIN over a STORED PLAYER row → no viewer: the session gives the id and nothing else",
  v3: "V3 · the contacts page's own gate, on the stored row: GROWTH → masked, ADMIN → read; FINANCE, COMPLIANCE, AUDITOR, SUPPORT, MODERATOR and PLAYER → no viewer — and the domain asked is domainForPath('/admin/contacts'), growth",
  v4: "V4 · ⛔ a cookie that says ADMIN over a STORED GROWTH row → cell masked — the transactions export's cookie-role residual, NOT copied",
  v5: "V5 · with Growth view granted to every staff role, each viewer's cell IS readCell(role, identity.contact), and read ⇔ mayReveal (the page's viewerReads) — the file and the page agree on who sees numbers, MODERATOR's none included",
  v6: 'V6 · the route is thin: GET, force-dynamic and nodejs only; the viewer (the stored row) THEN checkAdminTotp, each failure the identical new NextResponse("Not Found", { status: 404 }); no store, no cookie role, no decider of its own',
  m1: "M1 · ⭐ GROWTH's file: the masked header (phone and email masked, no Consent, no Source); every number cell the registry's +255••••NN; no fixture number in ANY spelling anywhere in the body; every email masked",
  m2: "M2 · ADMIN's file: the full header; every number the +255… spelling of its row, every email as stored, Consent and Source in the page's words, the operator from the ONE table, the instant added — and M1's detector DOES see these numbers (its positive control)",
  m3: "M3 · 🔴 D19 · no per-row player signal for a masked role: GROWTH's file has no Consent, no Source and no player column and no cell holding a consent or source word; ADMIN's has Consent and Source; no player column for anyone",
  m4: "M4 · a `none` cell's file carries NEITHER identity column (absent, not blank) — no number and no email at all, masked or not",
  m5: "M5 · decision M5 · both identity columns are masked through their registry entries (contactPhone, contactEmail): one read class, one target type, the platform's two masks",
  m6: "M6 · a masked file is REFUSED WHOLE on re-import, in U28's own sentence (its phone header names the mask) — never read as rows of numbers that look cut off",
  a1: "A1 · ⭐ THE ACCEPT · GROWTH downloads a masked file and ADMIN a full one, both audited BEFORE the first byte: every audit row resolved before the response existed, before its first chunk was read and before the walk's first step",
  a2: "A2 · an empty match is the mark and the header only — and a reader's empty pull writes NO pii.revealed, one contacts.exported with matched 0",
  a3: "A3 · ⛔ a row that did not record (recorded: false) answers 503 text/plain with no file — no mark, no row — for pii.revealed and for contacts.exported alike, and nothing is written after the failed row but its refusal",
  a4: "A4 · ⛔ the filter in the chain is U24's describer: a whole number is +255••••78, a name its length, the whole book its asOf bound — never a raw number in any spelling, never the word all",
  a5: "A5 · the rows themselves: pii.revealed carries the class, both fields and the row count, never a value; both rows share one export id (sixteen letters), MarketingContact, COMPLIANCE, the viewer and the STORED role",
  c1: "C1 · the byte-order mark is the file's first three bytes and occurs EXACTLY ONCE, at offset 0, across a stream of six chunks",
  c2: "C2 · every line ends CRLF, the file included; every cell — the header's too — is double-quoted, a quote doubled; a line break inside a note stays inside its cell and reads back identical",
  c3: "C3 · ⭐ THE BOM PAIR · the full file read back through U25's REAL reader: the mark stripped, the first header IS the phone header and maps Phone at column 0, every number parses back to its row, every name (formula-led, guarded, curly, Chinese) unguards exact",
  c4: "C4 · ONE WRITER: export.ts writes through U28's toCsv (its default writer IS toCsv), keeps no cell or guard of its own, holds no raw mark or BOM code, and spells no header word of U28's list",
  k1: "K1 · a KEYSET walk: with a step of 3, exactly three walk calls, each asking ≤ 3, each starting after the last id of the step before; every row once; the real step is 1,000, the resolver's clamp",
  k2: "K2 · ONE query path (OD36): export.ts calls no db.marketingContact member and reads the book through contactAudience alone; the route holds no store",
  k3: "K3 · ⛔ capped at the audited count: a count that says one fewer than the walk holds gives exactly that many rows — never more numbers than pii.revealed recorded",
  k4: "K4 · ⛔ a walk that fails on its second step ERRORS the stream after the head and the first step — never a short file that looks complete",
  k5: "K5 · X7 · the export's own instant bounds the window: a row added a second before it is in the file, a row added after it is in neither the count nor the file, and the audited filter's end is the instant",
  k6: "K6 · ⛔ C3 · the erased tombstone is in no file: not the whole book's, not a vip filter's (it carries vip); every row with no sourceRef is",
  k7: "K7 · ⛔ over 200,000 matching → 422 text/plain naming BOTH numbers, the walk never started, no pii.revealed, no contacts.exported, one contacts.export_refused",
  r1: "R1 · ⛔ C2 · an unknown value refuses (400) BEFORE anything is counted, naming its key; the refusal's audit names the key and never what was typed; a selection in an address is refused too (X27)",
  r2: "R2 · 🔴 D19 · the export asks U24's ONE role rule: every filter that rule keeps from a masked viewer (consent, source and player at the least) is a 403 in the rule's words before anything is counted, every other filter is answered; a reader's source filter is answered",
  r3: "R3 · the route hands the parser the address's own keys only — a repeat as an array, no stray key, nothing on the prototype — and keeps ids, so the parser can refuse it",
  e1: "E1 · the page: the head's export control is built from the list's own filter, only when that read arrived WITH rows, before Add contact; labelled masked for a masked viewer; over the ceiling the kit's disabled Button with its reason beside it; no decider in the page, no number added",
  e2: "E2 · contactsExportHref (EXECUTED): every filter an address can carry reads back through the parser — a day later — to the same key, a relative window included; the whole book is the bare path; a selection or an empty any-of gets no link",
  e3: "E3 · the ghost reserves the export control's 40px box in the head, before Add contact's",
  e4: "E4 · wired: test:contacts-export and red:contacts-export exist, and predeploy runs the suite right after test:contacts-bulk",
  e5: "E5 · the words: Export CSV and Export CSV (masked); the over-the-ceiling sentence names both numbers; each title says the download is recorded",
} as const;

/* ═══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════════════ */

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  const viewerOf = (userId: string, role: Role) => contactsExportViewer(asCookie(userId, role), impl.viewerDeps);
  /** An audience whose walk and count are observed — wrapping THIS impl's resolver, so a planted one is what runs. */
  const observed = (on: { walk?: (after: string | null, limit: number) => void; count?: () => void }) => (f: ContactAudienceFilter): ContactAudience => {
    const a = impl.deps.audience(f);
    return {
      ...a,
      count: async () => { on.count?.(); return a.count(); },
      walk: async (after, limit) => { on.walk?.(after, limit); return a.walk(after, limit); },
    };
  };

  /* ── V · THE VIEWER ──────────────────────────────────────────────────────────────────────────────────────── */
  await check(p(L.v1), async () => {
    const v = await contactsExportViewer(null, impl.viewerDeps);
    return [v === null, JSON.stringify(v)];
  });
  await check(p(L.v2), async () => {
    const v = await viewerOf(userOf("PLAYER"), "ADMIN");
    return [v === null, JSON.stringify(v)];
  });
  await check(p(L.v3), async () => {
    const want: Array<[Role, string | null]> = [
      ["GROWTH", "masked"], ["ADMIN", "read"], ["FINANCE", null], ["COMPLIANCE", null], ["AUDITOR", null], ["SUPPORT", null], ["MODERATOR", null], ["PLAYER", null],
    ];
    const got: string[] = [];
    let same = true;
    for (const [role, cell] of want) {
      const v = await viewerOf(userOf(role), role);
      got.push(`${role}=${v?.cell ?? "none-viewer"}`);
      if ((v?.cell ?? null) !== cell || (v !== null && v.role !== role)) same = false;
    }
    return [same && domainForPath(CONTACTS_PAGE_PATH) === "growth", got.join(" ")];
  });
  await check(p(L.v4), async () => {
    const v = await viewerOf(userOf("GROWTH"), "ADMIN");
    return [v !== null && v.role === "GROWTH" && v.cell === "masked", JSON.stringify(v)];
  });
  await check(p(L.v5), async () => {
    const seen: string[] = [];
    const wrong: string[] = [];
    try {
      for (const role of EDITABLE_ROLES) await setRoleGrant(role, "growth", true, false, "test-contacts-export");
      for (const role of STAFF_ROLES) {
        const v = await viewerOf(userOf(role), role);
        const cell = await readCell(role, "identity.contact");
        const reveal = await mayReveal(role, "identity.contact");
        seen.push(`${role}=${v?.cell ?? "no-viewer"}`);
        if (v === null || v.cell !== cell || (v.cell === "read") !== reveal) wrong.push(role);
      }
    } finally {
      __resetGrantsForTest();
    }
    const cells = new Set(seen.map((s) => s.split("=")[1]));
    return [wrong.length === 0 && cells.has("read") && cells.has("masked") && cells.has("none"), `${seen.join(" ")}${wrong.length ? ` · wrong: ${wrong.join(",")}` : ""}`];
  });
  await check(p(L.v6), () => {
    const r = impl.sources.route;
    const exported = [...r.matchAll(/^export\s+(?:async\s+)?(?:function|const)\s+(\w+)/gm)].map((m) => m[1]).sort().join(",");
    const NOT_FOUND = 'return new NextResponse("Not Found", { status: 404 });';
    const viewerAt = r.indexOf("const viewer = await contactsExportViewer(session);");
    const totpAt = r.indexOf("checkAdminTotp(session.userId, session.sessionId)");
    const runAt = r.indexOf("return exportContactsCsv({ viewer, params: exportParamsOf(new URL(req.url)), now: Date.now() });");
    return [exported === "GET,dynamic,runtime" && r.includes('export const dynamic = "force-dynamic";') && r.includes('export const runtime = "nodejs";')
      && viewerAt > 0 && totpAt > viewerAt && runAt > totpAt
      && r.split(NOT_FOUND).length - 1 === 2 && r.split("status:").length - 1 === 2
      && r.includes("if (!session || !viewer) " + NOT_FOUND) && r.includes('!== "ok") ' + NOT_FOUND)
      && !/(?<![\w$])db(?![\w$])/.test(r) && !r.includes("session.role") && !importsDecider(r),
      `exports [${exported}] · viewer ${viewerAt} · totp ${totpAt} · run ${runAt}`];
  });

  /* ── M · WHO GETS WHICH FILE ─────────────────────────────────────────────────────────────────────────────── */
  await check(p(L.m1), async () => {
    const g = await runExport(impl, MASKED, {});
    const rows = rowsOf(g.text) ?? [];
    const head = rows[0] ?? [];
    const body = rows.slice(1);
    const emailAt = head.indexOf(MASKED_HEADER[2]);
    const numbersMasked = body.length === VISIBLE.length && body.every((r, i) => r[0].startsWith("'") && unguardCell(r[0]) === maskPhone(VISIBLE[i].msisdn) && MASK.test(unguardCell(r[0])));
    const noSpelling = VISIBLE.every((c) => spellings(c).every((s) => !g.text.includes(s))) && !FULL_NUMBER_RUN.test(g.text);
    const emails = body.map((r) => r[emailAt] ?? "").filter((e) => e !== "");
    const emailsMasked = emails.length === VISIBLE.filter((c) => c.email).length && emails.every((e) => /^.•{4}@example[.]com$/.test(e))
      && VISIBLE.every((c) => !c.email || !g.text.includes(c.email));
    return [g.status === 200 && JSON.stringify(head) === JSON.stringify(MASKED_HEADER) && numbersMasked && noSpelling && emailsMasked && emailAt === 2,
      `${g.status} · head [${head.join(",")}] · first ${body[0]?.slice(0, 3).join(" | ")}`];
  });
  await check(p(L.m2), async () => {
    const a = await runExport(impl, READER, {});
    const rows = rowsOf(a.text) ?? [];
    const body = rows.slice(1);
    const bad = body.map((r, i) => {
      const c = VISIBLE[i];
      const want = [`+${c.msisdn}`, c.displayName ?? "", c.email ?? "", joinTags(c.tags), c.notes ?? "", operatorBrand(c.ndc) ?? "",
        CONSENT_LABEL[c.consentState].label, SOURCE_LABEL[c.source], c.createdAt];
      return r.map((cell) => unguardCell(cell)).join(QUOTE) === want.join(QUOTE) ? null : c.id;
    }).filter((x) => x !== null);
    const detectorSees = VISIBLE.every((c) => a.text.includes(c.msisdn)) && FULL_NUMBER_RUN.test(a.text);
    return [a.status === 200 && JSON.stringify(rows[0]) === JSON.stringify(FULL_HEADER) && body.length === VISIBLE.length && bad.length === 0 && detectorSees
      && a.headers.get("X-Rows-Matched") === String(VISIBLE.length) && a.headers.get("X-Export-Masked") === "false"
      && (a.headers.get("Content-Type") ?? "").startsWith("text/csv")
      && a.headers.get("Content-Disposition") === 'attachment; filename="50pick-contacts-2026-10-02-09-00-00.csv"'
      && a.headers.get("Cache-Control") === "no-store",
      `${a.status} · ${body.length} rows · wrong [${bad.join(",")}] · ${a.headers.get("Content-Disposition")}`];
  });
  await check(p(L.m3), async () => {
    const g = await runExport(impl, MASKED, {});
    const a = await runExport(impl, READER, {});
    const gRows = rowsOf(g.text) ?? [];
    const aHead = (rowsOf(a.text) ?? [])[0] ?? [];
    const SIGNALS = new Set<string>([...Object.values(CONSENT_LABEL).map((x) => x.label), ...Object.values(SOURCE_LABEL)]);
    const signal = gRows.slice(1).flat().filter((cell) => SIGNALS.has(unguardCell(cell)));
    const noPlayer = (h: string[]) => h.every((x) => !/player/i.test(x));
    return [gRows.length > 1 && !gRows[0].includes("consent") && !gRows[0].includes("source") && noPlayer(gRows[0]) && signal.length === 0
      && aHead.includes("consent") && aHead.includes("source") && noPlayer(aHead),
      `masked [${gRows[0]?.join(",")}] signals [${signal.join(",")}] · reader [${aHead.join(",")}]`];
  });
  await check(p(L.m4), async () => {
    const n = await runExport(impl, NONE, {});
    const rows = rowsOf(n.text) ?? [];
    return [n.status === 200 && JSON.stringify(rows[0]) === JSON.stringify(NONE_HEADER) && rows.length === VISIBLE.length + 1
      && !n.text.includes("+255") && !n.text.includes("@") && !n.text.includes("•") && actions(n.audits) === "contacts.exported",
      `head [${rows[0]?.join(",")}] · ${actions(n.audits)}`];
  });
  await check(p(L.m5), async () => {
    const phone = SENSITIVE_FIELDS.contactPhone;
    const email = SENSITIVE_FIELDS.contactEmail;
    const g = await runExport(impl, MASKED, { tag: "dar" });
    const row = (rowsOf(g.text) ?? [])[1] ?? [];
    return [phone.readClass === "identity.contact" && email.readClass === phone.readClass && phone.targetType === "MarketingContact"
      && email.targetType === "MarketingContact" && phone.mask === maskPhone && email.mask === maskEmail
      && unguardCell(row[0] ?? "") === maskPhone(VISIBLE[0].msisdn) && row[2] === maskEmail("asha@example.com"),
      `${row.slice(0, 3).join(" | ")}`];
  });
  await check(p(L.m6), async () => {
    const g = await runExport(impl, MASKED, {});
    const head = (rowsOf(g.text) ?? [])[0] ?? [];
    const map = autoMapHeaders(head);
    const full = autoMapHeaders(FULL_HEADER);
    return [head.length > 0 && map.refusal === CONTACT_MASKED_FILE && map.mapping.phone === undefined && full.refusal === null && full.mapping.phone === 0,
      `masked → ${JSON.stringify(map.refusal)} · full → phone at ${full.mapping.phone}`];
  });

  /* ── A · THE RECORD BEFORE THE FIRST BYTE ────────────────────────────────────────────────────────────────── */
  await check(p(L.a1), async () => {
    const out: string[] = [];
    let good = true;
    for (const [who, viewer] of [["GROWTH", MASKED], ["ADMIN", READER]] as const) {
      const log: string[] = [];
      const stub = auditStub({ delayMs: 15, log });
      const deps: ContactsExportDeps = { ...impl.deps, audience: observed({ walk: () => log.push("walk") }), audit: impl.auditVia(stub.fn) };
      const res = await exportContactsCsv({ viewer, params: {}, now: NOW }, deps);
      log.push("response");
      const reader = res.body?.getReader();
      const first = reader ? await reader.read() : { done: true, value: undefined };
      log.push("first chunk");
      const firstBytes = first.value ?? new Uint8Array(0);
      const parts: Uint8Array[] = [firstBytes];
      if (reader) for (;;) { const r = await reader.read(); if (r.done) break; parts.push(r.value); }
      await sleep(60); // ⛔ an unawaited audit would resolve HERE — after the bytes — and the order below would say so
      const text = parts.map((b) => decodeBytes(b, "utf-8")).join("");
      const head = (rowsOf(text) ?? [])[0] ?? [];
      const at = (s: string) => log.indexOf(s);
      const exported = at("contacts.exported resolved");
      const revealed = at("pii.revealed resolved");
      const ordered = exported >= 0 && exported < at("response") && at("response") < at("first chunk") && at("walk") > exported;
      const bom = firstBytes[0] === 0xef && firstBytes[1] === 0xbb && firstBytes[2] === 0xbf;
      const fileOk = who === "GROWTH"
        ? JSON.stringify(head) === JSON.stringify(MASKED_HEADER) && revealed === -1 && !FULL_NUMBER_RUN.test(text)
        : JSON.stringify(head) === JSON.stringify(FULL_HEADER) && revealed >= 0 && revealed < exported && FULL_NUMBER_RUN.test(text);
      if (!(ordered && bom && fileOk && res.status === 200)) good = false;
      out.push(`${who}: ${log.join(" > ")}`);
    }
    return [good, out.join(" ‖ ")];
  });
  await check(p(L.a2), async () => {
    const e = await runExport(impl, READER, { q: "Nobody Here At All" });
    const rows = rowsOf(e.text) ?? [];
    const exp = e.audits.find((x) => x.action === "contacts.exported");
    return [e.status === 200 && e.text.charCodeAt(0) === 0xfeff && rows.length === 1 && JSON.stringify(rows[0]) === JSON.stringify(FULL_HEADER)
      && actions(e.audits) === "contacts.exported" && exp?.payload.matched === 0 && e.headers.get("X-Rows-Matched") === "0",
      `${e.status} · ${rows.length} row(s) · ${actions(e.audits)}`];
  });
  await check(p(L.a3), async () => {
    const r = await runExport(impl, READER, {}, {}, auditStub({ recorded: (x) => x !== "pii.revealed" }));
    const m = await runExport(impl, MASKED, {}, {}, auditStub({ recorded: (x) => x !== "contacts.exported" }));
    const plainNoFile = (x: Run) => x.status === 503 && (x.headers.get("Content-Type") ?? "").startsWith("text/plain")
      && x.text === CONTACTS_EXPORT.unrecorded && x.text.charCodeAt(0) !== 0xfeff && !x.text.includes("+255");
    const lastIsRefusal = (x: Run) => x.audits[x.audits.length - 1]?.payload.reason === "unrecorded";
    return [plainNoFile(r) && actions(r.audits) === "pii.revealed,contacts.export_refused" && lastIsRefusal(r)
      && plainNoFile(m) && actions(m.audits) === "contacts.exported,contacts.export_refused" && lastIsRefusal(m),
      `reader ${r.status} [${actions(r.audits)}] · masked ${m.status} [${actions(m.audits)}]`];
  });
  await check(p(L.a4), async () => {
    const num = await runExport(impl, READER, { q: "0712 345 678" });
    const name = await runExport(impl, READER, { q: "Asha" });
    const whole = await runExport(impl, READER, {});
    const filterOf = (x: Run) => (x.audits.find((e) => e.action === "contacts.exported")?.payload.filter ?? {}) as Record<string, unknown>;
    const blob = JSON.stringify([...num.audits, ...name.audits, ...whole.audits].map((e) => e.payload));
    const leaks = ["255712345678", "712345678", "0712345678", "0712 345 678"].filter((s) => blob.includes(s));
    const wholeFilter = filterOf(whole);
    const exp = whole.audits.find((e) => e.action === "contacts.exported");
    return [filterOf(num).q === maskPhone("255712345678") && (rowsOf(num.text) ?? []).length === 2
      && filterOf(name).q === "name search (4 characters)" && !/asha/i.test(JSON.stringify(name.audits.map((e) => e.payload)))
      && JSON.stringify(wholeFilter) === JSON.stringify({ addedBefore: AS_OF }) && !/(?<![A-Za-z])all(?![A-Za-z])/i.test(JSON.stringify(wholeFilter))
      && exp?.payload.asOf === AS_OF && exp?.payload.matched === VISIBLE.length && exp?.payload.masked === false && exp?.payload.cell === "read"
      && JSON.stringify(exp?.payload.columns) === JSON.stringify(FULL_HEADER) && leaks.length === 0,
      `number ${JSON.stringify(filterOf(num))} · name ${JSON.stringify(filterOf(name))} · whole ${JSON.stringify(wholeFilter)} · leaks [${leaks.join(",")}]`];
  });
  await check(p(L.a5), async () => {
    const a = await runExport(impl, READER, {});
    const [rev, exp] = a.audits;
    const same = (k: keyof Entry, v: unknown) => rev?.[k] === v && exp?.[k] === v;
    return [actions(a.audits) === "pii.revealed,contacts.exported" && typeof rev?.targetId === "string" && /^[a-z]{16}$/.test(rev.targetId)
      && rev.targetId === exp?.targetId && same("targetType", "MarketingContact") && same("category", "COMPLIANCE") && same("actorId", READER.userId)
      && rev.payload.role === "ADMIN" && exp.payload.role === "ADMIN"
      && rev.payload.field === "contactPhone" && JSON.stringify(rev.payload.fields) === JSON.stringify(["contactPhone", "contactEmail"])
      && rev.payload.readClass === "identity.contact" && rev.payload.bulk === true && rev.payload.rows === VISIBLE.length
      && !VISIBLE.some((c) => JSON.stringify(rev.payload).includes(c.msisdn)),
      `${actions(a.audits)} · ${JSON.stringify(rev?.payload)}`];
  });

  /* ── C · THE ONE WRITER ──────────────────────────────────────────────────────────────────────────────────── */
  await check(p(L.c1), async () => {
    const a = await runExport(impl, READER, {}, { pageSize: 2 });
    const marks = a.text.split(BOM).length - 1;
    return [a.bytes[0] === 0xef && a.bytes[1] === 0xbb && a.bytes[2] === 0xbf && marks === 1 && a.text.indexOf(BOM) === 0
      && a.chunks === 1 + Math.ceil(VISIBLE.length / 2),
      `${marks} mark(s) · ${a.chunks} chunk(s)`];
  });
  await check(p(L.c2), async () => {
    const a = await runExport(impl, READER, {});
    const body = a.text.charCodeAt(0) === 0xfeff ? a.text.slice(1) : a.text;
    const lines = body.split(CRLF);
    const last = lines.pop();
    const quoted = /^"(?:[^"]|"")*"(?:,"(?:[^"]|"")*")*$/;
    const notes = VISIBLE[0].notes ?? "";
    const rows = rowsOf(a.text) ?? [];
    const noteAt = FULL_HEADER.indexOf("notes");
    return [last === "" && lines.length === VISIBLE.length + 1 && lines.every((l) => quoted.test(l)) && lines[0].startsWith(QUOTE)
      && body.includes('""quotes""') && lines[1].includes(LF) && rows[1]?.[noteAt] === notes,
      `${lines.length} lines · quoted ${lines.filter((l) => quoted.test(l)).length} · header starts ${JSON.stringify(lines[0]?.slice(0, 8))}`];
  });
  await check(p(L.c3), async () => {
    const a = await runExport(impl, READER, {});
    const r = impl.parse(a.text);
    const rows = r.ok ? r.file.rows.map((x) => x.cells) : [];
    const head = rows[0] ?? [];
    const map = autoMapHeaders(head);
    const back = rows.slice(1).map((row) => parseTzNumber(unguardCell(row[0] ?? "")).msisdn);
    const names = rows.slice(1).map((row) => unguardCell(row[1] ?? ""));
    const sniff = sniffEncoding(a.bytes.subarray(0, 4096));
    return [r.ok && head[0] === FULL_HEADER[0] && map.mapping.phone === 0 && map.refusal === null
      && JSON.stringify(back) === JSON.stringify(VISIBLE.map((c) => c.msisdn))
      && JSON.stringify(names) === JSON.stringify(VISIBLE.map((c) => c.displayName ?? ""))
      && sniff.encoding === "utf-8" && sniff.bom,
      `first header ${JSON.stringify(head[0])} · phone at ${map.mapping.phone} · refusal ${map.refusal === null ? "none" : "yes"}`];
  });
  await check(p(L.c4), () => {
    const src = impl.sources;
    const noRawMark = [src.exportRaw, src.routeRaw, src.pageRaw, src.copyRaw].every((s) => !s.includes(BOM));
    const noBomCode = !/0xfeff|65279/i.test(src.exportRaw);
    const noOwnCell = !/function\s+(?:cell|csvCell|guardCell|quote)\s*[(]/.test(src.exportTs) && !/(?<![\w$])(?:csvCell|guardCell)(?![\w$])/.test(src.exportTs)
      && !src.exportTs.includes("[=+");
    const noWords = DISTINCTIVE.every((t) => !src.exportRaw.includes(t) && !src.routeRaw.includes(t));
    return [CONTACTS_EXPORT_DEPS.write === toCsv && src.exportTs.includes('import { toCsv } from "@/lib/contacts/csv-write";')
      && /import\s*[{][^}]*(?<![\w$])contactExportHeader(?![\w$])[^}]*[}]\s*from\s*"@[/]lib[/]contacts[/]contact-fields"/.test(src.exportTs)
      && noRawMark && noBomCode && noOwnCell && noWords,
      `raw mark ${!noRawMark} · bom code ${!noBomCode} · own cell ${!noOwnCell} · header words ${!noWords}`];
  });

  /* ── K · THE WALK ────────────────────────────────────────────────────────────────────────────────────────── */
  await check(p(L.k1), async () => {
    const calls: Array<{ after: string | null; limit: number }> = [];
    const steps: string[][] = [];
    const spy = (f: ContactAudienceFilter): ContactAudience => {
      const a = impl.deps.audience(f);
      return { ...a, walk: async (after, limit) => { calls.push({ after, limit }); const w = await a.walk(after, limit); steps.push(w.rows.map((x) => x.id)); return w; } };
    };
    const k = await runExport(impl, READER, {}, { pageSize: 3, audience: spy });
    const ids = (rowsOf(k.text) ?? []).slice(1).map((r) => byMsisdn.get(parseTzNumber(unguardCell(r[0])).msisdn ?? "")?.id ?? "?");
    const chained = calls.length === 3 && calls[0].after === null && calls[1].after === steps[0]?.[steps[0].length - 1]
      && calls[2].after === steps[1]?.[steps[1].length - 1] && calls.every((c) => c.limit <= 3);
    return [chained && JSON.stringify(ids) === JSON.stringify(VISIBLE.map((c) => c.id)) && new Set(ids).size === ids.length
      && CONTACTS_EXPORT_PAGE === 1000 && CONTACTS_EXPORT_DEPS.pageSize === CONTACTS_EXPORT_PAGE,
      `${calls.length} call(s): ${calls.map((c) => `${c.after ?? "start"}/${c.limit}`).join(" ")} · ${ids.length} rows`];
  });
  await check(p(L.k2), async () => {
    const src = impl.sources;
    const viaResolver = /import\s*[{][^}]*(?<![\w$])contactAudience(?![\w$])[^}]*[}]\s*from\s*"@[/]lib[/]server[/]marketing[/]audience"/.test(src.exportTs);
    const shipped = await CONTACTS_EXPORT_DEPS.audience(WHOLE_BOOK).count();
    return [!/db[.]marketingContact[.]/.test(src.exportTs) && viaResolver && shipped === (await contactAudience(WHOLE_BOOK).count())
      && !/(?<![\w$])db(?![\w$])/.test(src.route),
      `resolver import ${viaResolver} · shipped count ${shipped}`];
  });
  await check(p(L.k3), async () => {
    const drift = (f: ContactAudienceFilter): ContactAudience => {
      const a = impl.deps.audience(f);
      return { ...a, count: async () => Math.max(0, (await a.count()) - 1) };
    };
    const d = await runExport(impl, READER, {}, { audience: drift, pageSize: 4 });
    const rows = (rowsOf(d.text) ?? []).slice(1);
    const rev = d.audits.find((e) => e.action === "pii.revealed");
    return [d.status === 200 && rows.length === VISIBLE.length - 1 && d.headers.get("X-Rows-Matched") === String(VISIBLE.length - 1) && rev?.payload.rows === VISIBLE.length - 1,
      `${rows.length} rows for a count of ${d.headers.get("X-Rows-Matched")}`];
  });
  await check(p(L.k4), async () => {
    let step = 0;
    const throwing = (f: ContactAudienceFilter): ContactAudience => {
      const a = impl.deps.audience(f);
      return { ...a, walk: async (after, limit) => { step += 1; if (step === 2) throw new Error("planted walk failure on the second step"); return a.walk(after, limit); } };
    };
    const t = await runExport(impl, READER, {}, { audience: throwing, pageSize: 3 });
    return [t.status === 200 && t.error !== null && t.error.includes("planted walk failure") && t.chunks === 2,
      `error ${JSON.stringify(t.error)} · ${t.chunks} chunk(s) before it`];
  });
  await check(p(L.k5), async () => {
    const late = contactRow("mx_late", "0712000015", { displayName: "Late Row", createdAt: new Date(NOW + 30_000).toISOString() });
    const edge = contactRow("mx_edge", "0712000016", { displayName: "Edge Row", createdAt: new Date(NOW - 1).toISOString() });
    const maps = (globalThis as unknown as { __50PICK_STORE?: { marketingContacts: Map<string, unknown>; contactsByMsisdn: Map<string, string> } }).__50PICK_STORE;
    try {
      await db.marketingContact.create(late);
      await db.marketingContact.create(edge);
      const s = await runExport(impl, READER, {});
      const filter = (s.audits.find((e) => e.action === "contacts.exported")?.payload.filter ?? {}) as Record<string, unknown>;
      return [s.headers.get("X-Rows-Matched") === String(VISIBLE.length + 1) && s.text.includes(`+${edge.msisdn}`) && !s.text.includes(late.msisdn)
        && filter.addedBefore === AS_OF,
        `matched ${s.headers.get("X-Rows-Matched")} · late ${s.text.includes(late.msisdn) ? "IN" : "out"} · edge ${s.text.includes(edge.msisdn) ? "in" : "OUT"}`];
    } finally {
      for (const row of [late, edge]) { maps?.marketingContacts.delete(row.id); maps?.contactsByMsisdn.delete(row.msisdn); }
    }
  });
  await check(p(L.k6), async () => {
    const w = await runExport(impl, READER, {});
    const v = await runExport(impl, READER, { tag: "vip" });
    const tail = ERASED.msisdn.slice(3);
    const vRows = (rowsOf(v.text) ?? []).slice(1);
    return [!w.text.includes(tail) && w.headers.get("X-Rows-Matched") === String(VISIBLE.length) && VISIBLE.every((c) => w.text.includes(c.msisdn))
      && !v.text.includes(tail) && vRows.length === 2 && v.headers.get("X-Rows-Matched") === "2",
      `whole ${w.headers.get("X-Rows-Matched")} · vip ${vRows.length} · tombstone ${w.text.includes(tail) || v.text.includes(tail) ? "EXPORTED" : "absent"}`];
  });
  await check(p(L.k7), async () => {
    let walked = 0;
    const huge = (f: ContactAudienceFilter): ContactAudience => {
      const a = impl.deps.audience(f);
      return { ...a, count: async () => CONTACTS_EXPORT_MAX + 1, walk: async (after, limit) => { walked++; return a.walk(after, limit); } };
    };
    const c = await runExport(impl, READER, {}, { audience: huge });
    const refused = c.audits[0];
    return [c.status === 422 && (c.headers.get("Content-Type") ?? "").startsWith("text/plain")
      && c.text === contactsExportTooMany(CONTACTS_EXPORT_MAX + 1, CONTACTS_EXPORT_MAX)
      && c.text.includes(formatNumber(CONTACTS_EXPORT_MAX + 1)) && c.text.includes(formatNumber(CONTACTS_EXPORT_MAX))
      && walked === 0 && actions(c.audits) === "contacts.export_refused" && refused?.payload.reason === "too_many"
      && refused?.payload.matched === CONTACTS_EXPORT_MAX + 1 && refused?.payload.max === CONTACTS_EXPORT_MAX && CONTACTS_EXPORT_MAX === 200_000,
      `${c.status} · ${JSON.stringify(c.text)} · walked ${walked} · ${actions(c.audits)}`];
  });

  /* ── R · THE FILTER ──────────────────────────────────────────────────────────────────────────────────────── */
  await check(p(L.r1), async () => {
    let counted = 0;
    const counting = observed({ count: () => { counted++; } });
    const nokia = await runExport(impl, READER, { op: "NOKIA" }, { audience: counting });
    const typed = await runExport(impl, READER, { op: "0712345678" }, { audience: counting });
    const ids = await runExport(impl, READER, { ids: "mx_01" }, { audience: counting });
    const one = (x: Run, param: string) => x.status === 400 && actions(x.audits) === "contacts.export_refused"
      && x.audits[0].payload.reason === "unreadable_filter" && x.audits[0].payload.param === param;
    return [one(nokia, "op") && nokia.text.startsWith("The “op” filter in this address can't be used.") && nokia.text.endsWith("Nothing was exported.")
      && !JSON.stringify(nokia.audits).includes("NOKIA") && one(typed, "op") && !JSON.stringify(typed.audits).includes("712345678")
      && one(ids, "ids") && counted === 0,
      `${nokia.status} ${JSON.stringify(nokia.text.slice(0, 60))} · typed ${typed.status} · ids ${ids.status} · counted ${counted}`];
  });
  await check(p(L.r2), async () => {
    let counted = 0;
    const counting = observed({ count: () => { counted++; } });
    // ⭐ THE EXPECTATION IS U24's OWN RULE (the real `roleRefusal`, never this impl's), so a filter the rule learns to keep
    // from a masked viewer later (OD54's stop filter, for one) is held here the day it lands — and D19's floor (consent,
    // source, player) must be among the refused.
    const refusedByRule = (params: Params) => {
      const parsed = parseContactAudienceParams(params, NOW);
      return parsed.ok ? roleRefusal(parsed.filter, false) : null;
    };
    const asked: Params[] = [{ consent: "GIVEN" }, { source: "REGISTRATION" }, { player: "yes" }, { suppressed: "yes" }, { op: "VODACOM" }, { tag: "vip" }];
    const answers: string[] = [];
    let allRight = true;
    for (const params of asked) {
      const rule = refusedByRule(params);
      counted = 0;
      const r = await runExport(impl, MASKED, params, { audience: counting });
      answers.push(`${Object.keys(params)[0]}=${r.status}`);
      const right = rule !== null
        ? r.status === 403 && r.text === `${CONTACTS_FILTER_NOT_FOR_ROLE.body(rule.param, rule.reason)} ${CONTACTS_EXPORT.nothingSent}`
          && r.text.includes("isn't available to your role") && actions(r.audits) === "contacts.export_refused"
          && r.audits[0].payload.reason === "role" && r.audits[0].payload.param === rule.param && counted === 0
        : r.status === 200;
      if (!right) allRight = false;
    }
    const floor = [{ consent: "GIVEN" }, { source: "REGISTRATION" }, { player: "yes" }].every((params) => refusedByRule(params) !== null);
    const reader = await runExport(impl, READER, { source: "REGISTRATION" });
    const readerRows = (rowsOf(reader.text) ?? []).slice(1);
    return [allRight && floor && reader.status === 200 && readerRows.length === 1,
      `${answers.join(" ")} · floor ${floor} · reader ${reader.status}/${readerRows.length}`];
  });
  await check(p(L.r3), () => {
    const u = new URL(`http://x${CONTACTS_EXPORT_PATH}?op=VODACOM&op=AIRTEL&q=asha&utm_source=x&__proto__=1&ids=mx_01&sort=name`);
    const got = exportParamsOf(u);
    return [JSON.stringify(Object.keys(got).sort()) === JSON.stringify(["ids", "op", "q"]) && JSON.stringify(got.op) === JSON.stringify(["VODACOM", "AIRTEL"])
      && got.q === "asha" && Object.getPrototypeOf(got) === Object.prototype && !parseContactAudienceParams(got, NOW).ok,
      JSON.stringify(got)];
  });

  /* ── E · THE PAGE ────────────────────────────────────────────────────────────────────────────────────────── */
  await check(p(L.e1), () => {
    const page = impl.sources.page;
    const head = page.slice(Math.max(0, page.indexOf("<AdminPageHead")), Math.max(0, page.indexOf("<AdminBody>")));
    const control = between(page, "function ContactsExportControl(", "async function AdminContactsContent(");
    const shape = page.includes("const exportable = listed !== null && listed.result.total > 0 ? listed : null;")
      && page.includes("const exportHref = exportable !== null ? contactsExportHref(exportable.filter) : null;")
      && head.includes("{exportable !== null && exportHref !== null && (")
      && head.includes("<ContactsExportControl href={exportHref} matched={exportable.result.total} reads={reads} />")
      && head.indexOf("<ContactsExportControl") < head.indexOf("<AddContactButton hrefParams={linkSp} editOpen={editLoad !== null} />");
    const words = control.includes("const label = reads ? CONTACTS_EXPORT.label : CONTACTS_EXPORT.labelMasked;")
      && control.includes("if (matched > CONTACTS_EXPORT_MAX) {") && control.includes("const reason = contactsExportTooMany(matched, CONTACTS_EXPORT_MAX);")
      && control.includes('<Button type="button" size="sm" variant="ghost" disabled aria-describedby="contacts-export-reason" title={reason}>{label}</Button>')
      && control.includes('<span id="contacts-export-reason" className="text-body-sm')
      && control.includes("href={href}") && control.includes('className="btn btn-ghost btn-sm admin-focus"') && control.includes('data-block="contacts-export"');
    const clean = page.includes('import { contactsExportHref, CONTACTS_EXPORT_MAX } from "@/lib/server/contacts/export";') && !importsDecider(page)
      && !/(?<![\w$])contactAudience(?![\w$])/.test(page) && (page.match(/c[.]msisdn/g) ?? []).length === 2;
    return [shape && words && clean, `shape ${shape} · words ${words} · clean ${clean}`];
  });
  await check(p(L.e2), () => {
    const later = NOW + 86_400_000;
    const filterOf = (sp: Params): ContactAudienceFilter => {
      const r = parseContactAudienceParams(sp, NOW);
      if (!r.ok) throw new Error(`fixture filter refused: ${r.param}`);
      return r.filter;
    };
    const cases: Array<[string, ContactAudienceFilter]> = [
      ["the whole book", WHOLE_BOOK],
      ["a whole number", filterOf({ q: "0712 345 678" })],
      ["an operator and a tag", filterOf({ op: "VODACOM", tag: "vip" })],
      ["a relative window", filterOf({ range: "7d" })],
      ["a name and a custom window", filterOf({ q: "Asha", from: "2026-09-03", to: "2026-09-05" })],
    ];
    const bad = cases.filter(([, f]) => {
      const href = contactsExportHref(f);
      if (href === null) return true;
      const u = new URL(href, "http://x");
      const back = parseContactAudienceParams(exportParamsOf(u), later);
      return u.pathname !== CONTACTS_EXPORT_PATH || !back.ok || contactAudienceKey(back.filter) !== contactAudienceKey(f);
    }).map(([name]) => name);
    return [bad.length === 0 && contactsExportHref(WHOLE_BOOK) === CONTACTS_EXPORT_PATH
      && contactsExportHref({ ...WHOLE_BOOK, ids: ["mx_01"] }) === null && contactsExportHref({ ...WHOLE_BOOK, tags: [] }) === null,
      `${bad.length ? `not round-tripping: ${bad.join(", ")}` : "all round-trip"} · ${contactsExportHref(cases[2][1])}`];
  });
  await check(p(L.e3), () => {
    const loading = impl.sources.loading;
    const head = loading.slice(Math.max(0, loading.indexOf("<AdminPageHead")), Math.max(0, loading.indexOf("<SkBody>")));
    const exportAt = head.indexOf('<div data-skeleton="contacts-export"><SkChip className="h-[40px] w-[');
    const addAt = head.indexOf('<div data-skeleton="contacts-add"><SkChip className="h-[40px] w-[');
    return [exportAt > 0 && addAt > exportAt, `export box at ${exportAt} · add box at ${addAt}`];
  });
  await check(p(L.e4), () => {
    const scripts = (JSON.parse(impl.sources.pkg) as { scripts: Record<string, string> }).scripts;
    return [scripts["test:contacts-export"] === "tsx scripts/contacts-export.test.mts"
      && scripts["red:contacts-export"] === "tsx scripts/contacts-export.test.mts --prove-red"
      && (scripts.predeploy ?? "").includes("npm run test:contacts-bulk && npm run test:contacts-export &&"),
      `${scripts["test:contacts-export"]} · ${scripts["red:contacts-export"]}`];
  });
  await check(p(L.e5), () => [
    CONTACTS_EXPORT.label === "Export CSV" && CONTACTS_EXPORT.labelMasked === "Export CSV (masked)"
      && contactsExportTooMany(214_312, 200_000) === `Too many to export at once: ${formatNumber(214_312)} contacts match, and one file holds at most ${formatNumber(200_000)}. Narrow the filter.`
      && CONTACTS_EXPORT.title(1).includes("1 matching contact ") && CONTACTS_EXPORT.title(3).includes("3 matching contacts")
      && CONTACTS_EXPORT.titleMasked(3).includes("never in full") && CONTACTS_EXPORT.titleMasked(3).includes("masked like +255••••01")
      && [CONTACTS_EXPORT.title(2), CONTACTS_EXPORT.titleMasked(2)].every((t) => t.endsWith("Each download is recorded.")),
    contactsExportTooMany(214_312, 200_000),
  ]);
}

/* ═══ RUN — or PROVE RED ═════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`\ncontacts-export: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline: ${pass} passed, ${fail} failed\n`);

  const withSource = (key: keyof Sources, from: string, to: string): Sources => {
    const text = REAL_SOURCES[key];
    if (text.split(from).length - 1 !== 1) throw new Error(`plant anchor for ${key} does not resolve exactly once: ${from}`);
    return { ...REAL_SOURCES, [key]: text.replace(from, to) };
  };
  /** U25's reader with its decode-time stripper taken out — what a reader that stopped stripping the mark sees. */
  const noStripReader = buildCsvReader({ ...CSV_RULES, stripBom: (text: string) => ({ text: String(text ?? ""), hadBom: false }) });
  /** The walk without its cap: every step asks for a whole page, however few rows the audit counted. */
  async function* uncapped(audience: ContactAudience, _matched: number, pageSize: number): AsyncGenerator<StoredMarketingContact[], void, undefined> {
    let after: string | null = null;
    for (;;) {
      const step = await audience.walk(after, pageSize);
      if (step.rows.length > 0) yield step.rows;
      if (step.nextAfterId === null) return;
      after = step.nextAfterId;
    }
  }

  type Case = { name: string; expect: string; impl: () => Impl };
  const CASES: Case[] = [
    /* ── the plan's RED line, each in memory ── */
    {
      name: "R1 · the read-cell branch dropped — every viewer's rows are the reader's, so a masked file holds full numbers",
      expect: L.m1,
      impl: () => ({ ...REAL, deps: { ...CONTACTS_EXPORT_DEPS, row: (c, keys) => contactExportRow(c, keys, "read") } }),
    },
    {
      name: "R2 · the BOM written and no longer stripped — U25's reader built without stripBom",
      expect: L.c3,
      impl: () => ({ ...REAL, parse: (text) => noStripReader.parse(text) }),
    },
    {
      name: "R3 · the cell decided on the COOKIE's role — the viewer reads the session's photograph, not the stored row",
      expect: L.v4,
      impl: () => ({ ...REAL, viewerDeps: { ...CONTACTS_EXPORT_VIEWER_DEPS, loadUser: async (id) => ({ role: COOKIE_ROLE.get(id) ?? "PLAYER" }) } }),
    },
    {
      name: "R4 · `recorded` ignored — every audit row is taken as recorded, whatever audit() answered",
      expect: L.a3,
      impl: () => ({ ...REAL, auditVia: (fn) => (async (e: Entry) => ({ ...(await (fn as unknown as (x: Entry) => Promise<Record<string, unknown>>)(e)), recorded: true })) as unknown as AuditFn }),
    },
    {
      name: "R5 · a raw number in the chain — the describer copies the search as typed",
      expect: L.a4,
      impl: () => ({ ...REAL, deps: { ...CONTACTS_EXPORT_DEPS, describe: (f) => ({ ...auditContactAudience(f), ...(f.q === null ? {} : { q: f.q }) }) } }),
    },
    {
      name: "R6 · a fetch-all walk — one call answers every row (the listAll shape)",
      expect: L.k1,
      impl: () => ({
        ...REAL,
        deps: {
          ...CONTACTS_EXPORT_DEPS,
          audience: (f) => {
            const a = contactAudience(f);
            return { ...a, walk: async () => ({ rows: (await a.page({ sort: "added", dir: "asc", page: "1", perPage: 1000 })).rows.sort((x, y) => (x.id < y.id ? -1 : 1)), nextAfterId: null }) };
          },
        },
      }),
    },
    {
      name: "R7 · erased rows exported — the tombstone's exclusion dropped from the where",
      expect: L.k6,
      impl: () => ({ ...REAL, deps: { ...CONTACTS_EXPORT_DEPS, audience: (f) => contactAudience(f, (g) => ({ ...toAudienceWhere(g), excludeSourceRef: null })) } }),
    },
    {
      name: "R8 · a walk error swallowed — the stream closes normally on a short file",
      expect: L.k4,
      impl: () => ({
        ...REAL,
        deps: {
          ...CONTACTS_EXPORT_DEPS,
          pages: async function* (a, m, s) {
            try { yield* contactExportPages(a, m, s); } catch { /* swallowed: the file just ends */ }
          },
        },
      }),
    },

    /* ── and the rest of the unit, each on its own assertion ── */
    {
      name: "R9 · the audit written after the first byte — fire and forget, the rows land once the file has gone",
      expect: L.a1,
      impl: () => ({ ...REAL, auditVia: (fn) => ((e: Entry) => { void (fn as unknown as (x: Entry) => Promise<unknown>)(e); return Promise.resolve({ recorded: true }); }) as unknown as AuditFn }),
    },
    {
      name: "R10 · a BOM per chunk — the writer asked for the mark on every step",
      expect: L.c1,
      impl: () => ({ ...REAL, deps: { ...CONTACTS_EXPORT_DEPS, write: (rows, opts) => toCsv(rows, { ...(opts ?? {}), bom: true }) } }),
    },
    {
      name: "R11 · the cap removed — the walk runs past the count the audit recorded",
      expect: L.k3,
      impl: () => ({ ...REAL, deps: { ...CONTACTS_EXPORT_DEPS, pages: uncapped } }),
    },
    {
      name: "R12 · no snapshot bound — the export's instant dropped from the Added window",
      expect: L.k5,
      impl: () => ({ ...REAL, deps: { ...CONTACTS_EXPORT_DEPS, audience: (f) => contactAudience({ ...f, addedBefore: null }) } }),
    },
    {
      name: "R13 · the ceiling removed — any count streams",
      expect: L.k7,
      impl: () => ({ ...REAL, deps: { ...CONTACTS_EXPORT_DEPS, max: Number.POSITIVE_INFINITY } }),
    },
    {
      name: "R14 · the masked file keeps the reader's Consent and Source columns",
      expect: L.m3,
      impl: () => ({ ...REAL, deps: { ...CONTACTS_EXPORT_DEPS, keys: (cell) => (cell === "masked" ? [...CONTACT_EXPORT_KEYS] : contactExportKeys(cell)) } }),
    },
    {
      name: "R15 · 🔴 D19 · the role rule skipped — a masked viewer's consent filter is answered with a file",
      expect: L.r2,
      impl: () => ({ ...REAL, deps: { ...CONTACTS_EXPORT_DEPS, roleRefusal: () => null } }),
    },
    {
      name: "R16 · the parser drops an unknown value instead of refusing — ?op=NOKIA becomes the whole book",
      expect: L.r1,
      impl: () => ({
        ...REAL,
        deps: { ...CONTACTS_EXPORT_DEPS, parse: (sp, now) => { const r = parseContactAudienceParams(sp, now); return !r.ok && r.param === "op" ? parseContactAudienceParams({ ...sp, op: undefined }, now) : r; } },
      }),
    },
    {
      name: "R17 · the domain hand-typed — the gate asks the accounting domain, not the contacts page's",
      expect: L.v3,
      impl: () => ({ ...REAL, viewerDeps: { ...CONTACTS_EXPORT_VIEWER_DEPS, canView: (role) => canView(role, "accounting") } }),
    },
    {
      name: "R18 · the second factor dropped from the route",
      expect: L.v6,
      impl: () => ({
        ...REAL,
        sources: withSource("route", '  if ((await checkAdminTotp(session.userId, session.sessionId)) !== "ok") return new NextResponse("Not Found", { status: 404 });' + LF, ""),
      }),
    },
    {
      name: "R19 · the export control offered on an empty book — the guard reads total >= 0",
      expect: L.e1,
      impl: () => ({ ...REAL, sources: withSource("page", "listed !== null && listed.result.total > 0 ? listed : null", "listed !== null && listed.result.total >= 0 ? listed : null") }),
    },
    {
      name: "R20 · the masked label dropped — every viewer reads Export CSV",
      expect: L.e1,
      impl: () => ({ ...REAL, sources: withSource("page", "const label = reads ? CONTACTS_EXPORT.label : CONTACTS_EXPORT.labelMasked;", "const label = CONTACTS_EXPORT.label;") }),
    },
    {
      name: "R21 · the ghost forgets the export control's box — the head grows at 360 when the page swaps in",
      expect: L.e3,
      impl: () => ({ ...REAL, sources: withSource("loading", '<div data-skeleton="contacts-export"><SkChip className="h-[40px] w-[160px]" /></div>', "") }),
    },
    {
      name: "R22 · a none cell given the masked columns — a role that may see no number gets masked ones",
      expect: L.m4,
      impl: () => ({ ...REAL, deps: { ...CONTACTS_EXPORT_DEPS, keys: (cell) => contactExportKeys(cell === "none" ? "masked" : cell) } }),
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    let impl: Impl;
    try {
      impl = c.impl();
    } catch (err) {
      problems.push(`case ${i + 1} (${c.name}): the plant could not be planted — ${(err as Error)?.message ?? String(err)}`);
      continue;
    }
    await runAssertions(impl, tag);
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(`${tag}${c.expect}`)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
