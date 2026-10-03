/**
 * test:contacts-bulk — U23's guard: selection and bulk actions on the contact book (decisions C3 · C4 · C5 · C6 · C11 ·
 * C23 · C24 · M4 · M10 · A1.1; the plan's OD27/OD28).
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script — the REAL service (`contact-bulk.ts`) over the memory
 * twin, through the parser the action uses:
 *   B1–B4b  THE SERVER COUNTS: the tier rule; a forged count of 3 for 60 ticked rows changes nothing (the Accept); a
 *           moved audience is refused with the new count; a filter is never ticks; an empty selection is nothing;
 *   B5–B10  each action, counted by the store: tag (U28's ONE rule, the 20-tag cap), untag, add to a list (a new name,
 *           a case-insensitive clash, the kept addedAt), suppress (an OPERATOR stop nobody can lift, C23), the per-number
 *           cap, record a withdrawal (the Accept: a player refused no_consent, a stranger consent_withdrawn), remove (the
 *           memory twin's emulated cascade and freed index; evidence kept; the erased tombstone in no audience, C3);
 *   B11–B16 one cap, one audit row through U24's describer, the parser's named keys, D19's role rule on a POSTed filter,
 *           the masked withdrawal reply (A1.1), the server's selection projection, the filter key;
 *   B17–B19 the adversarial review's fixes (2026-10-02): a run that dies mid-way keeps its ONE audit row (partial) and
 *           mirrors the number it died on; the walk must hold what was counted; a rolling window's IDENTITY.
 *   B14c–d  🔴 OD54 (D19 covers SUPPRESSION too): a masked role's POSTed `suppressed` audience is refused role before any
 *           count; a masked officer may still suppress, and is told the TOTAL ("A stop is on record for N contacts") —
 *           the preview never splits by stop state, and the reader keeps the split.
 *   vb7     B20–B21: a set-based write over a filter is bound to the confirmed rows (a contact that joins after the
 *           recount is written by nobody), and a post with neither a list nor a name is told to choose one. S12–S14: the
 *           bar's parameters checked where they are typed, the "all matching" note, and the toasts that name their tag.
 * Then the source, for what only the source can show (S1–S10): the gated actions, the act-gated bar (its button states
 * EXECUTED), the server's tier in the confirmation, no raw number in a client file, the page's select column and each
 * row's edit link (EXECUTED through the ONE href builder), the copy, the ghost, the pin and the wiring — and S10, the
 * masked KPI band: two whole-book facts, no consent split (OD53) and no stop count (OD54).
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY — a swapped dependency, a parser, a reply
 * shaper, a projection, a source string, or the memory twin's own `removeWhere` wrapped for one case and put back in a
 * `finally` — and requires the MATCHING assertion to fail. This file makes no file-modifying call. Every store mutation
 * goes through the store's own methods inside a scratch book: the memory maps it touches are copied before each check and
 * put back after it, so every check starts from the same fixtures.
 *
 * Run:  npm run test:contacts-bulk
 * Red:  npm run red:contacts-bulk
 */
process.exitCode = 1;

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { db } from "../src/lib/server/store.ts";
import type { StoredMarketingContact, StoredUser, MessagingKey } from "../src/lib/server/store.ts";
import { mayReceiveMarketingSms } from "../src/lib/server/marketing/consent.ts";
import { isSmsConsentWording, SMS_CONSENT_WORDINGS } from "../src/lib/marketing/consent-wording.ts";
import {
  contactAudience, contactAudienceKey, contactAudienceWrites, parseContactAudienceJson, parseContactAudienceParams, roleRefusal, MAX_AUDIENCE_IDS,
  WHOLE_BOOK,
} from "../src/lib/server/marketing/audience.ts";
import {
  parseBulkRequest, previewContactBulk, runContactBulk, contactBulkReply, contactSelectionRow, contactFilterAudienceKey, contactFilterIdentity,
  isTicksOnly, CONTACT_BULK_DEPS, OFFICER_WITHDRAWAL_WORDING, BULK_EVIDENCE_PREFIX, BULK_SENTENCES,
} from "../src/lib/server/marketing/contact-bulk.ts";
import type { ContactBulkDeps, ContactBulkRequest } from "../src/lib/server/marketing/contact-bulk.ts";
import {
  bulkConfirmTier, parseBulkTag, parseListName, compareListsByName, BULK_ENUMERATE_MAX, BULK_SAMPLE, BULK_PER_ROW_MAX, CONTACT_BULK_ACTIONS,
  LIST_NAME_HAS_PHONE, LIST_NAME_EMPTY, LIST_NONE, PER_ROW_ACTIONS,
} from "../src/lib/contacts/bulk-rules.ts";
import type { BulkOutcome, BulkPreview, BulkRefusal } from "../src/lib/contacts/bulk-rules.ts";
import {
  bulkResultLine, enumerateTail, bulkActionState, BULK_COPY, CONTACTS_BULK, CONTACTS_KPI_RECENT,
} from "../src/app/admin/contacts/contacts-copy.ts";
import { contactsHref } from "../src/app/admin/contacts/contacts-query.ts";
import { parseTzNumber } from "../src/lib/tz-msisdn.ts";
import { maskPhone } from "../src/lib/phone-normalize.ts";
import { CONTACT_LIMITS, TAG_HAS_PHONE_SENTENCE, splitTags } from "../src/lib/contacts/contact-fields.ts";
import { ERASURE_EVIDENCE } from "../src/lib/marketing/erasure-mark.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const read = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8")).replace(/\r\n/g, "\n");
const rawRead = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

type Sources = {
  actions: string; actionsRaw: string; bar: string; barRaw: string; provider: string; rowSelect: string; page: string;
  loading: string; service: string; rules: string; cgs: string; pkg: string; rail: string;
};
const REAL_SOURCES: Sources = {
  actions: read("src/app/admin/contacts/contact-bulk-actions.ts"),
  actionsRaw: rawRead("src/app/admin/contacts/contact-bulk-actions.ts"),
  bar: read("src/app/admin/contacts/contacts-bulk-bar.tsx"),
  barRaw: rawRead("src/app/admin/contacts/contacts-bulk-bar.tsx"),
  provider: read("src/app/admin/contacts/contacts-selection-provider.tsx"),
  rowSelect: read("src/app/admin/contacts/contact-row-select.tsx"),
  page: read("src/app/admin/contacts/page.tsx"),
  loading: read("src/app/admin/contacts/loading.tsx"),
  service: read("src/lib/server/marketing/contact-bulk.ts"),
  rules: read("src/lib/contacts/bulk-rules.ts"),
  // vb7 · the rail, for the ONE list order it shares with the bar's picker.
  rail: read("src/app/admin/contacts/contacts-rail.ts"),
  cgs: rawRead("scripts/client-graph-safe.test.mjs"),
  pkg: rawRead("package.json"),
};

/* ═══ THE IMPLEMENTATION UNDER TEST — swappable, so a red case can plant one piece ═══════════════════ */

type Impl = {
  deps: ContactBulkDeps;
  parse: typeof parseBulkRequest;
  reply: typeof contactBulkReply;
  project: typeof contactSelectionRow;
  actionState: typeof bulkActionState;
  identity: typeof contactFilterIdentity;
  /** The toast's result line (`contacts-copy.ts`) — the total-only lines included (A1.1, OD54). */
  line: typeof bulkResultLine;
  /** vb7 · the run itself — swappable, so a red case can plant the unbound set-based write. */
  run: typeof runContactBulk;
  sources: Sources;
};

/** ⭐ Every audit row a run writes is CAPTURED here instead of joining the chain — B12 reads exactly one run's rows. */
const captured: Array<Record<string, unknown>> = [];
const captureAudit = (async (entry: unknown) => {
  captured.push(entry as Record<string, unknown>);
  return { ok: true } as never;
}) as unknown as ContactBulkDeps["audit"];

const OFFICER = "usr_officer_u23";
const NOW = new Date("2026-10-02T09:00:00.000Z");
const TEST_DEPS: ContactBulkDeps = { ...CONTACT_BULK_DEPS, audit: captureAudit, now: () => NOW };

const REAL: Impl = {
  deps: TEST_DEPS, parse: parseBulkRequest, reply: contactBulkReply, project: contactSelectionRow,
  actionState: bulkActionState, identity: contactFilterIdentity, line: bulkResultLine, sources: REAL_SOURCES, run: runContactBulk,
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

/* ═══ THE SCRATCH BOOK — the memory maps a check touches, copied before and put back after ═══════════ */

const BOOK_KEYS = [
  "marketingContacts", "contactsByMsisdn", "messagingConsents", "suppressions", "users", "usersByPhone",
  "contactLists", "contactListMembers",
] as const;
type Maps = Record<(typeof BOOK_KEYS)[number], Map<string, unknown>>;
const memory = (globalThis as unknown as { __50PICK_STORE?: Maps }).__50PICK_STORE;
async function inScratchBook(fn: () => Promise<void>): Promise<void> {
  if (!memory) throw new Error("the memory store is not loaded — this suite runs on the memory twin only");
  const saved = BOOK_KEYS.map((k) => new Map([...memory[k]].map(([key, v]) => [key, v !== null && typeof v === "object" ? { ...(v as object) } : v])));
  try {
    await fn();
  } finally {
    BOOK_KEYS.forEach((k, i) => {
      memory[k].clear();
      for (const [key, v] of saved[i]) memory[k].set(key, v);
    });
  }
}

/* ═══ FIXTURES ═══════════════════════════════════════════════════════════════════════════════════ */

const STOP_AT = "2026-09-12T09:30:00.000Z";
const LIST_AT = "2026-09-01T00:00:00.000Z";
const B60 = Array.from({ length: 60 }, (_, i) => `mc_b_${String(i).padStart(3, "0")}`);
const numberOf = (i: number) => `07135${String(i).padStart(5, "0")}`;
const N = {
  erased: "0713600001",
  player: "0713700001",
  stranger: "0713700002",
  stopped: "0713700003",
  operator: "0713700004",
  withdrawn: "0713700005",
  full: "0713700006",
  ashaLate: "0713700007",
  ashaAfter: "0713700008",
  known: "0712345678",
} as const;
/** 60 ticked-to-be rows + the erased tombstone, the player, the stranger, two stops, the WITHDRAWN one, the full one, the known number. */
const EXPECTED_BOOK = 68;
const MASK = /^\+255•{4}\d{2}$/;

const bare = (local: string): string => {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn) throw new Error(`fixture ${local} does not parse`);
  return p.msisdn;
};
const mkey = (local: string): MessagingKey => ({ channel: "SMS", identifier: bare(local), category: "MARKETING" });

/** A book row written by hand — independent of every builder under test. */
function literalRow(id: string, local: string, o: Partial<StoredMarketingContact> = {}): StoredMarketingContact {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn || !p.ndc) throw new Error(`fixture ${local} does not parse`);
  return {
    id, msisdn: p.msisdn, rawInput: local, displayName: null, email: null, ndc: p.ndc, operator: null,
    source: "IMPORT", sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null,
    tags: [], notes: null, importId: null, createdAt: "2026-09-01T08:00:00.000Z", createdBy: null,
    updatedAt: "2026-09-01T08:00:00.000Z", updatedBy: null, ...o,
  };
}
function makeUser(id: string, phoneE164: string): StoredUser {
  const at = "2026-09-01T08:00:00.000Z";
  return {
    id, phoneE164, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
    acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: true, twoFactorEnabled: false,
    avatarDataUrl: null, createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
  } as StoredUser;
}
let ledgerSeq = 0;
async function ledger(local: string, status: "GIVEN" | "WITHDRAWN", source: "IMPORT" | "REGISTRATION" | "OPT_OUT_PAGE", createdAt: string, wording = "Ninakubali kupokea matangazo kwa SMS.") {
  await db.messagingConsent.create({
    id: `u23l_${++ledgerSeq}`, channel: "SMS", identifier: bare(local), category: "MARKETING", status, source,
    wording, locale: "SW", evidence: "fixture", recordedBy: null, createdAt,
  });
}
let stopSeq = 0;
async function stop(local: string, reason: "WITHDRAWN" | "OPERATOR") {
  await db.suppression.create({
    id: `u23s_${++stopSeq}`, channel: "SMS", identifier: bare(local), category: "MARKETING", reason,
    evidence: "fixture", recordedBy: null, createdAt: STOP_AT, liftedAt: null, liftedReason: null,
  });
}

async function seedFixtures(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    await db.marketingContact.create(literalRow(B60[i], numberOf(i), {
      displayName: i < 3 ? `Asha Bulk ${i}` : `Bulk ${i}`,
      tags: i < 2 ? ["vip"] : [],
      createdAt: new Date(Date.parse("2026-09-01T08:00:00.000Z") + i * 60_000).toISOString(),
    }));
  }
  // ⛔ THE ERASED TOMBSTONE (C3): in no audience — not even when its id is ticked.
  await db.marketingContact.create(literalRow("mc_b_erased", N.erased, { sourceRef: ERASURE_EVIDENCE, consentState: "WITHDRAWN", rawInput: bare(N.erased) }));
  // A player whose number is in the book, consent GIVEN in a pinned SMS sentence and the switch ON — marketable before.
  await db.user.create(makeUser("usr_b_player", `+${bare(N.player)}`));
  await ledger(N.player, "GIVEN", "REGISTRATION", "2026-09-10T08:00:00.000Z", SMS_CONSENT_WORDINGS[0].wording);
  await db.marketingContact.create(literalRow("mc_b_player", N.player, { displayName: "Player Held", source: "REGISTRATION", userId: "usr_b_player", consentState: "GIVEN" }));
  // A stranger whose consent the ledger holds as GIVEN.
  await ledger(N.stranger, "GIVEN", "IMPORT", "2026-09-10T08:00:00.000Z");
  await db.marketingContact.create(literalRow("mc_b_stranger", N.stranger, { displayName: "Stranger Given", consentState: "GIVEN" }));
  // A person's own stop (liftable through their link), and an officer's (liftable by nobody).
  await stop(N.stopped, "WITHDRAWN");
  await db.marketingContact.create(literalRow("mc_b_stopped", N.stopped, { displayName: "Person Stopped", suppressedAt: STOP_AT }));
  await stop(N.operator, "OPERATOR");
  await db.marketingContact.create(literalRow("mc_b_operator", N.operator, { displayName: "Officer Stopped", suppressedAt: STOP_AT }));
  // A number whose last word is already WITHDRAWN.
  await ledger(N.withdrawn, "GIVEN", "IMPORT", "2026-09-10T08:00:00.000Z");
  await ledger(N.withdrawn, "WITHDRAWN", "OPT_OUT_PAGE", "2026-09-11T08:00:00.000Z");
  await db.marketingContact.create(literalRow("mc_b_withdrawn", N.withdrawn, { displayName: "Already Withdrawn", consentState: "WITHDRAWN" }));
  // A contact already carrying the most tags a contact may (C11).
  await db.marketingContact.create(literalRow("mc_b_full", N.full, {
    displayName: "Full Tags", tags: Array.from({ length: CONTACT_LIMITS.tags }, (_, k) => `t${String(k + 1).padStart(2, "0")}`),
  }));
  // A whole number to search by (B12): 0712 345 678.
  await db.marketingContact.create(literalRow("mc_b_known", N.known, { displayName: "Known Number" }));
  // An existing list, with two members since September.
  await db.contactList.create({ id: "lst_b_existing", name: "Existing list", description: null, createdAt: LIST_AT, createdBy: null, updatedAt: LIST_AT, updatedBy: null });
  for (const contactId of ["mc_b_000", "mc_b_030"]) await db.contactListMember.add({ listId: "lst_b_existing", contactId, addedAt: LIST_AT, addedBy: null });
  // Evidence on two numbers B10 removes: a ledger row and a stop — keyed by NUMBER, so they must survive the rows.
  await ledger(numberOf(31), "GIVEN", "IMPORT", "2026-09-10T08:00:00.000Z");
  await stop(numberOf(32), "WITHDRAWN");
}

/** One region of a source, from an opener to its matching close brace (or "" when absent). */
function region(src: string, opener: string): string {
  const start = src.indexOf(opener);
  if (start < 0) return "";
  let depth = 0;
  for (let i = src.indexOf("{", start); i >= 0 && i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return src.slice(start);
}
/** One exported action's text: from its `export async function` to the next one. */
function actionBody(src: string, name: string): string {
  const at = src.indexOf(`export async function ${name}(`);
  if (at < 0) return "";
  const next = src.indexOf("export async function ", at + 1);
  return src.slice(at, next < 0 ? src.length : next);
}

/* ═══ THE LABELS, ONCE — the assertions and the red cases both read them ═══════════════════════════════ */

const L = {
  b0: "B0 · CONTROL · the fixtures are in the book: sixty contacts, the erased tombstone, a player-held number, a stranger's GIVEN, a person's stop, an officer's stop, a WITHDRAWN ledger, a full row, a known number — and the resolver counts 60 for the 60 ids, 2 for two ids beside the tombstone's",
  b1: "B1 · ⭐ THE ONE TIER RULE (pure): 50 ticked rows enumerate, 51 take the typed word \"51\", and a FILTER of 3 takes the typed word \"3\" — the audience's kind matters, and 50 is the edge",
  b1b: "B1b · the bar's six actions in its order, withdraw and suppress the per-number pair; the per-number cap is 1,000, the sample 20, the enumerate edge 50, and the ticked cap is U24's 1,000",
  b2: "B2 · ⭐ THE SERVER COUNTS — a forged count of 3 for 60 ticked rows changes nothing: the run (typed null; the body's count, tier and matched ignored) refuses confirm_required with the server's 60, and every one of the 60 rows reads back as it was",
  b2b: "B2b · CONTROL · the same 60 confirmed with the server's \"60\" runs: matched 60, changed 58, unchanged 2 (two already carried it), every row tagged — B2's refusal is not a blanket one",
  b3: "B3 · ⭐ A MOVED AUDIENCE IS REFUSED: \"59\" for the 60 is confirm_mismatch with expected 60; a filter previewed at 3, grown by one contact, then confirmed with \"3\", is confirm_mismatch with expected 4 — and nothing changed either time",
  b4: "B4 · ⭐ A FILTER IS NEVER TICKS: a filter audience of 3 rows previews on the typed tier with no sample and its run without a typed word is confirm_required, writing nothing — while the same 3 rows TICKED run on enumerate",
  b4b: "B4b · ⛔ AN EMPTY SELECTION IS NOTHING: a remove over ids [] is refused empty — its preview too — and no row in the book changed",
  b5: "B5 · tag counts are the STORE's: 5 ticked, 2 already vip → matched 5, changed 3, unchanged 2, the line \"3 tagged · 2 already had it\"; a re-run changes 0; a row holding 20 tags is FULL and left as it was; the erased tombstone, ticked too, is in no audience and untouched",
  b5b: "B5b · ⭐ C11 · a tag runs U28's ONE rule: \" VIP \" is \"vip\" — the form's own spelling (splitTags); \"a,b\", \"\", spaces and 33 characters are refused, and a run carrying a bad tag is bad_tag, names its field and writes nothing",
  b6: "B6 · untag mirrors it: matched 5, changed 2, unchanged 3; a row without the tag keeps its stamp; the officer is updatedBy on the changed rows only",
  b6b: "B6b · ⭐ vb5 review M1 · a phone-number tag stored before the rule is still TAKEN OFF: untag “0712 345 678” over the two rows holding it changes 2 and leaves only their other tag; tagging with it is bad_tag in the rule's own sentence and writes nothing; parseBulkTag reads it for untag and refuses it for tag; a new list's name holding a number is refused, one holding a year is not",
  b7: "B7 · add to a list: a NEW name creates it (changed 5, the name returned); a re-run changes 0; an existing member keeps its ORIGINAL addedAt; \"arusha EVENT\" is refused list_exists and creates nothing; an unknown list is bad_list",
  b8: "B8 · ⭐ C23 · suppress writes an OPERATOR stop NOBODY can lift: reason OPERATOR, the officer, the run's evidence; the row's suppressedAt is the stop's own time; the gate says suppressed; a person's old WITHDRAWN stop is taken over (createdAt kept) and its link can no longer lift it; an officer's stop is unchanged",
  b8b: "B8b · the per-number cap is asked BEFORE anything is written: with the cap at 3, a suppress over 4 is too_many_for_per_row with expected 4 — its preview too — and none of the 4 numbers has a stop",
  b9: "B9 · ⭐ THE ACCEPT · a withdrawal appends WITHDRAWN (source OPERATOR, the fixed officer wording, the officer, the run's evidence) and mirrors the row; then the player's number is refused no_consent (its switch turned off through syncPlayerToggle) and the stranger's consent_withdrawn — neither was before; an already-WITHDRAWN number gains no second row; the officer wording is no SMS consent sentence",
  b10: "B10 · ⭐ REMOVE: the rows are gone, their list memberships with them (the cascade, emulated), the number can be added again (the index freed), the ledger and the stop list keep their rows, and the erased tombstone, ticked too, is still there",
  b11: "B11 · ⛔ ONE cap (C6): more than 1,000 ticked ids is refused too_many_ids by the parser — before anything is counted or written, never truncated",
  b12: "B12 · ⭐ ONE AUDIT ROW PER RUN, through U24's describer: action contacts.bulk.tag, the officer, the counts; a whole-number search is +255••••78 and the payload holds neither the nine digits nor the 255 key; ticked ids are a COUNT, never listed",
  b13: "B13 · ⛔ the parser builds a NEW request from named keys: a posted count, tier, officer and matched are never read — the request's keys are action, audience, list, tag and typed — and an unknown audience key refuses",
  b14: "B14 · 🔴 D19 / A1.1 · a masked role's POSTed sources, consent or player audience is refused role BEFORE any count — the preview and the run both, the store's count never asked; a reader gets the count",
  b14b: "B14b · 🔴 A1.1 · a withdrawal's split is a consent signal: a masked viewer's reply carries the total only (changed and unchanged null) and the line says the total; a reader's carries the split; a tag's reply is untouched",
  b14c: "B14c · 🔴 OD54 · a masked role's POSTed suppressed audience — true, false, or beside an operator — is refused role BEFORE any count, the preview and the run both, naming “suppressed”; a reader gets the count of the stopped rows and the audience in words",
  b14d: "B14d · 🔴 OD54 · a suppression's split is a stop signal: a masked officer may still suppress, its preview is the TOTAL (no split key) and its reply carries the total only (changed and unchanged null), the line saying “A stop is on record for N contacts” — never “already suppressed”; a reader's carries the split",
  b15: "B15 · ⭐ the selection row is the SERVER's projection: exactly id, name and masked, the number +255••••NN — and the preview's sample is the same projection, twenty named of thirty, \"and 10 more\"",
  b16: "B16 · \"select all matching\" stores the FILTER: the page's canonical key reads back through U24's JSON parser to the same filter and carries no ids; ticks-only is ids alone, and a filter beside ids is a filter",
  s1: "S1 · ⛔ THE ACTIONS ARE GATED: the file opens \"use server\", exports exactly the two actions, each opens with softRequireStaff(\"growth\", …) before its rate rule and the parser, reads the body only through parseBulkRequest, never a count from it; only a landed run revalidates, and the reply goes through contactBulkReply",
  s2: "S2 · the bar is an act control that never hides: useMayAct and useActDisabledReason at the top, every action button's disabled AND title from bulkActionState (EXECUTED: every action, every state, a reason said)",
  s3: "S3 · ⭐ the confirmation is the SERVER's tier: the ConfirmModal spreads tier and typedWord together from p.tier — no typed word built from the selection — and the run posts back the preview's own word",
  s4: "S4 · ⛔ no raw number reaches the client: msisdn and phoneE164 appear in none of the bar, the provider or the row box; the page projects its rows through contactSelectionRow, which masks",
  s5: "S5 · the page: the select column first (9 / 6 columns), the provider around the bar and the table with U24's cap, the bar on any read book — and every row's edit link is contactsHref with edit = the row's id (EXECUTED: the id travels, the filters and the sort ride along, page drops, no digits of a number)",
  s6: "S6 · the copy says what the server does: Suppress's permanence in words, the remove's kept records, no \"record consent\" action and the bar's sentence saying why, the result line server-counted",
  s7: "S7 · the ghost holds nine columns and the bar's row; bulk-rules.ts is pure (no directive, ./contact-fields alone) and pinned; the suite is wired into predeploy right after test:contacts-form",
  b17: "B17 · ⭐ A RUN THAT DIES MID-WAY STILL LEAVES ITS ONE AUDIT ROW (review F2): a withdrawal of three whose second player-switch write fails rejects — one audit row, partial, with how far it got (matched 2, changed 2), the number it died on mirrored WITHDRAWN (the mirror runs in finally), the third untouched",
  b18: "B18 · ⛔ THE WALK MUST HOLD WHAT WAS COUNTED (review F4): a suppression whose recount said 2 while its walk finds 3 is refused confirm_mismatch with expected 3 — and none of the three numbers has a stop",
  b19: "B19 · the filter's IDENTITY ignores the minute a rolling window resolves to (review F6): range=7d a minute apart is two keys and ONE identity; 24h, a pill or a typed date is another identity; a typed date is one identity at any hour",
  s8: "S8 · the selection clears “all matching” on the filter's IDENTITY, never its key (F6), and “select all matching” says when it may let go of ticks made elsewhere (F5) — the copy executed, “not on this page”",
  s9: "S9 · the confirmation says “and N more” only below a listed sample and names the whole book when nothing narrows it (F3); a button disabled by a request in flight says why (EXECUTED)",
  s11: "S11 · ⭐ vb5 review M1 · the ACTION rides with the tag text to the ONE rule on both sides — the bar asks parseBulkTag(param.tag, param.action), the service parseBulkTag(req.tag, req.action), and the rule reads an untag through parseFilterTag — so the browser never refuses an untag the server would run",
  s10: "S10 · 🔴 D19 / A1.1 / OD54 · the KPI band's consent split (F1) AND its stop count (OD54) are a READER's: a masked viewer's band is exactly two tiles — In the book and the contacts added in the last 7 days (the loader's count) — with no consent, withdrawn or Suppressed tile, in the 1-lg2 rung that holds the four-tile band's rows; a reader's keeps all four",
  b20: "B20 · ⛔ vb7 · A SET-BASED WRITE OVER A FILTER IS BOUND TO THE CONFIRMED ROWS: a Remove of the three “Asha” contacts confirmed with “3”, while a fourth starts matching right after the recount, is refused confirm_mismatch with both counts (4, not 3) and removes NOBODY — the newcomer included; with nobody joining, the same Remove takes exactly the three; (review m8) a confirmed row that STOPS matching between the id walk and the write is NOT removed — the write binds the filter AND the ids, never the ids alone; and a filter Tag written seven ids at a time still counts all sixty",
  b22: "B22 · ⛔ vb7 review m1 · A REMOVE IS ALL OR NOTHING: a Remove over a filter hands the store its confirmed ids in ONE call (removeBound — one transaction in Postgres), however small the chunk size, never a call per chunk; and a store fault part-way removes NOBODY, the run's one audit row saying rolledBack and claiming no count, never partial",
  b21: "B21 · ⛔ vb7 · a post with neither a list nor a new name (or a blank list id) is told LIST_NONE — “Choose a list, or name a new one.”, the bar's own words — never “Type a name for the new list.”, which a new name posted empty is still told; and the empty-selection refusal says what to do next",
  s12: "S12 · ⭐ vb7 · the bar checks its parameters where they are typed: the picker starts EMPTY with “Choose a list…”, its lists in the rail's own order (ONE comparator, EXECUTED), LIST_NONE before any round trip, a name equal to a list's switching the picker to it, the tag box with NO maxLength (it counts UTF-16 units, the rule counts characters — review m7) and the limit in its hint, every refusal focused, a field refusal reopening the dialog (a list refusal refreshing), any other refusal kept in the dialog, a moved count re-previewed with the server's sentence, the per-number cap in a line, and Untag offering the book's tags",
  s13: "S13 · vb7 · unticking one row of “all matching” SAYS the selection narrowed to this page's other rows (matchingNarrowed) — it fell to a page's worth in silence",
  s14: "S14 · vb7 · a run's outcome carries its tag, and the toasts name it (“Tagged “vip””, ““vip” removed”) or the list (EXECUTED); the two actions' failures name their next step",
} as const;

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  /** A behavioural check in its own scratch book, over fresh fixtures. */
  const fresh = (label: string, fn: () => Promise<[boolean, string?]>) =>
    inScratchBook(async () => {
      await seedFixtures();
      await check(p(label), fn);
    });
  /** Parse a body the way the action does, through THIS impl's parser. */
  const parsed = (body: Record<string, unknown>): ContactBulkRequest => {
    const r = impl.parse(body);
    if (!r.ok) throw new Error(`the body was refused: ${r.reason} — ${r.error}`);
    return r.req;
  };
  const run = (body: Record<string, unknown>, reads = true, deps = impl.deps): Promise<BulkOutcome | BulkRefusal> =>
    impl.run(parsed(body), OFFICER, reads, deps);
  const preview = (body: Record<string, unknown>, reads = true, deps = impl.deps): Promise<BulkPreview | BulkRefusal> =>
    previewContactBulk(parsed(body), reads, deps);
  const tagsOf = async (ids: readonly string[]) => JSON.stringify(await Promise.all(ids.map(async (id) => (await db.marketingContact.find(id))?.tags ?? null)));
  const bookSnapshot = async () => JSON.stringify((await db.marketingContact.listAll()).map((c) => [c.id, c.tags, c.updatedAt]));
  const five = ["mc_b_000", "mc_b_001", "mc_b_002", "mc_b_003", "mc_b_004"];
  const outcome = (r: BulkOutcome | BulkRefusal | BulkPreview) => (r.ok ? JSON.stringify(r) : `${r.reason}: ${r.error}`);

  /* ── B0 · THE FIXTURES ───────────────────────────────────────────────────────────────────────────── */
  await fresh(L.b0, async () => {
    const sixty = await contactAudience({ ...WHOLE_BOOK, ids: B60 }).count();
    const beside = await contactAudience({ ...WHOLE_BOOK, ids: ["mc_b_000", "mc_b_001", "mc_b_erased"] }).count();
    const player = await db.user.findByPhone(`+${bare(N.player)}`);
    const personStop = await db.suppression.find(mkey(N.stopped));
    const officerStop = await db.suppression.find(mkey(N.operator));
    const full = await db.marketingContact.find("mc_b_full");
    const book = await db.marketingContact.count();
    return [sixty === 60 && beside === 2 && book === EXPECTED_BOOK && player?.marketingOptIn === true
      && personStop?.reason === "WITHDRAWN" && officerStop?.reason === "OPERATOR" && full?.tags.length === CONTACT_LIMITS.tags,
      `sixty ${sixty} · beside ${beside} · book ${book}`];
  });

  /* ── B1 · THE RULES (pure) ───────────────────────────────────────────────────────────────────────── */
  await check(p(L.b1), () => {
    const t50 = bulkConfirmTier(50, true);
    const t51 = bulkConfirmTier(51, true);
    const f3 = bulkConfirmTier(3, false);
    return [t50.kind === "enumerate" && t51.kind === "typed" && t51.word === "51" && f3.kind === "typed" && f3.word === "3"
      && BULK_ENUMERATE_MAX === 50, `${JSON.stringify(t50)} ${JSON.stringify(t51)} ${JSON.stringify(f3)}`];
  });
  await check(p(L.b1b), () => [
    CONTACT_BULK_ACTIONS.join(",") === "tag,untag,addToList,withdraw,suppress,remove" && PER_ROW_ACTIONS.join(",") === "withdraw,suppress"
      && BULK_PER_ROW_MAX === 1000 && BULK_SAMPLE === 20 && MAX_AUDIENCE_IDS === 1000,
    CONTACT_BULK_ACTIONS.join(","),
  ]);

  /* ── B2–B4b · THE SERVER COUNTS ──────────────────────────────────────────────────────────────────── */
  const forged = { action: "tag", tag: "vip", audience: { ids: B60 }, typed: null, count: 3, tier: "enumerate", matched: 3 };
  await fresh(L.b2, async () => {
    const before = await tagsOf(B60);
    const r = await run(forged);
    const after = await tagsOf(B60);
    return [!r.ok && r.reason === "confirm_required" && r.expected === 60 && before === after, outcome(r)];
  });
  await fresh(L.b2b, async () => {
    const r = await run({ ...forged, typed: "60" });
    const rows = await Promise.all(B60.map((id) => db.marketingContact.find(id)));
    return [r.ok && r.matched === 60 && r.changed === 58 && r.unchanged === 2 && rows.every((c) => c !== null && c.tags.includes("vip")), outcome(r)];
  });
  await fresh(L.b3, async () => {
    const before = await tagsOf(B60);
    const first = await run({ ...forged, typed: "59" });
    const pre = await preview({ action: "tag", tag: "moved", audience: { q: "Asha" }, typed: null });
    await db.marketingContact.create(literalRow("mc_b_asha_late", N.ashaLate, { displayName: "Asha Late" }));
    const word = pre.ok && pre.tier.kind === "typed" ? pre.tier.word : "?";
    const second = await run({ action: "tag", tag: "moved", audience: { q: "Asha" }, typed: word });
    const moved = (await db.marketingContact.listAll()).filter((c) => c.tags.includes("moved")).length;
    return [!first.ok && first.reason === "confirm_mismatch" && first.expected === 60 && (await tagsOf(B60)) === before
      && pre.ok && pre.count === 3 && word === "3" && !second.ok && second.reason === "confirm_mismatch" && second.expected === 4 && moved === 0
      // vb7 · refused by the RECOUNT, in its own sentence — the id walk (B20) is the second line, never the first.
      && second.error === BULK_SENTENCES.confirmMismatch(4, "3"),
      `${outcome(first)} | preview ${pre.ok ? pre.count : outcome(pre)} | ${outcome(second)} | tagged ${moved}`];
  });
  await fresh(L.b4, async () => {
    const filter = { action: "tag", tag: "seen", audience: { q: "Asha" }, typed: null };
    const pre = await preview(filter);
    const refused = await run(filter);
    const seenAfterFilter = (await db.marketingContact.listAll()).filter((c) => c.tags.includes("seen")).length;
    const ticked = await run({ ...filter, audience: { ids: ["mc_b_000", "mc_b_001", "mc_b_002"] } });
    return [pre.ok && pre.tier.kind === "typed" && pre.tier.word === "3" && pre.sample.length === 0
      && !refused.ok && refused.reason === "confirm_required" && refused.expected === 3 && seenAfterFilter === 0
      && ticked.ok && ticked.changed === 3,
      `${outcome(pre)} | ${outcome(refused)} | ${outcome(ticked)}`];
  });
  await fresh(L.b4b, async () => {
    const empty = { action: "remove", audience: { ids: [] }, typed: null };
    const before = await bookSnapshot();
    const pre = await preview(empty);
    const r = await run(empty);
    return [!pre.ok && pre.reason === "empty" && !r.ok && r.reason === "empty" && (await bookSnapshot()) === before
      && (await db.marketingContact.count()) === EXPECTED_BOOK, `${outcome(pre)} | ${outcome(r)}`];
  });

  /* ── B5–B10 · EACH ACTION, COUNTED BY THE STORE ──────────────────────────────────────────────────── */
  await fresh(L.b5, async () => {
    const r1 = await run({ action: "tag", tag: "vip", audience: { ids: five }, typed: null });
    const r2 = await run({ action: "tag", tag: "vip", audience: { ids: five }, typed: null });
    const rFull = await run({ action: "tag", tag: "vip", audience: { ids: ["mc_b_full"] }, typed: null });
    const fullRow = await db.marketingContact.find("mc_b_full");
    const erasedBefore = JSON.stringify(await db.marketingContact.find("mc_b_erased"));
    const rErased = await run({ action: "tag", tag: "vip", audience: { ids: ["mc_b_005", "mc_b_erased"] }, typed: null });
    const erasedAfter = JSON.stringify(await db.marketingContact.find("mc_b_erased"));
    return [r1.ok && r1.matched === 5 && r1.changed === 3 && r1.unchanged === 2 && r1.full === 0 && bulkResultLine(r1) === "3 tagged · 2 already had it"
      && r2.ok && r2.changed === 0 && r2.unchanged === 5
      && rFull.ok && rFull.full === 1 && rFull.changed === 0 && fullRow !== null && fullRow.tags.length === CONTACT_LIMITS.tags && !fullRow.tags.includes("vip")
      && rErased.ok && rErased.matched === 1 && rErased.changed === 1 && erasedAfter === erasedBefore,
      `${outcome(r1)} | ${outcome(r2)} | ${outcome(rFull)} | ${outcome(rErased)}`];
  });
  await fresh(L.b5b, async () => {
    const vip = parseBulkTag(" VIP ", "tag");
    const refused = ["a,b", "", "  ", "x".repeat(CONTACT_LIMITS.tag + 1)].map((t) => parseBulkTag(t, "tag"));
    const before = await tagsOf(five);
    const r = await run({ action: "tag", tag: "a,b", audience: { ids: five }, typed: null });
    return [vip.ok && vip.tag === "vip" && vip.tag === splitTags(" VIP ")[0] && refused.every((v) => !v.ok)
      && !r.ok && r.reason === "bad_tag" && r.field === "tag" && (await tagsOf(five)) === before,
      `${JSON.stringify(vip)} | ${refused.map((v) => (v.ok ? "ok" : "refused")).join(",")} | ${outcome(r)}`];
  });
  await fresh(L.b6, async () => {
    const before = await Promise.all(five.map((id) => db.marketingContact.find(id)));
    const r = await run({ action: "untag", tag: "VIP", audience: { ids: five }, typed: null });
    const after = await Promise.all(five.map((id) => db.marketingContact.find(id)));
    const untouched = [2, 3, 4].every((i) => after[i]?.updatedAt === before[i]?.updatedAt && after[i]?.updatedBy === before[i]?.updatedBy);
    return [r.ok && r.matched === 5 && r.changed === 2 && r.unchanged === 3
      && [0, 1].every((i) => after[i] !== null && !after[i]!.tags.includes("vip") && after[i]!.updatedBy === OFFICER) && untouched,
      outcome(r)];
  });
  await fresh(L.b6b, async () => {
    // Two rows carry a tag stored before the phone-number rule — U23's box accepted one until vb5.
    const PHONE_TAG = "0712 345 678";
    const held = ["mc_b_phonetag_0", "mc_b_phonetag_1"];
    for (const [k, id] of held.entries()) await db.marketingContact.create(literalRow(id, numberOf(90 + k), { tags: ["vip", PHONE_TAG] }));
    const reads = parseBulkTag(PHONE_TAG, "untag");
    const writes = parseBulkTag(PHONE_TAG, "tag");
    const before = await tagsOf(five);
    const refused = await run({ action: "tag", tag: PHONE_TAG, audience: { ids: five }, typed: null });
    const untouched = (await tagsOf(five)) === before;
    const r = await run({ action: "untag", tag: PHONE_TAG, audience: { ids: held }, typed: null });
    const after = await Promise.all(held.map((id) => db.marketingContact.find(id)));
    const list = parseListName("Wateja 0712 345 678");
    const year = parseListName("Wateja 2026");
    return [reads.ok && reads.tag === PHONE_TAG && !writes.ok && writes.sentence === TAG_HAS_PHONE_SENTENCE
      && !refused.ok && refused.reason === "bad_tag" && refused.error === TAG_HAS_PHONE_SENTENCE && untouched
      && r.ok && r.matched === 2 && r.changed === 2 && after.every((c) => c !== null && JSON.stringify(c.tags) === JSON.stringify(["vip"]))
      && !list.ok && list.sentence === LIST_NAME_HAS_PHONE && year.ok,
      `untag reads ${JSON.stringify(reads)} · tag ${JSON.stringify(writes)} · ${outcome(refused)} · ${outcome(r)} · list ${JSON.stringify(list)} · year ${JSON.stringify(year)}`];
  });
  await fresh(L.b7, async () => {
    const r1 = await run({ action: "addToList", newListName: "Arusha event", audience: { ids: five }, typed: null });
    const created = (await db.contactList.listAll()).find((l) => l.name === "Arusha event");
    const r2 = created ? await run({ action: "addToList", listId: created.id, audience: { ids: five }, typed: null }) : null;
    const dup = await run({ action: "addToList", newListName: "arusha EVENT", audience: { ids: five }, typed: null });
    const unknown = await run({ action: "addToList", listId: "lst_nope", audience: { ids: five }, typed: null });
    const existing = await run({ action: "addToList", listId: "lst_b_existing", audience: { ids: five }, typed: null });
    const kept = (await db.contactListMember.listMemberships("mc_b_000")).find((m) => m.listId === "lst_b_existing");
    const lists = (await db.contactList.listAll()).length;
    return [r1.ok && r1.changed === 5 && r1.listName === "Arusha event" && created !== undefined
      && r2 !== null && r2.ok && r2.changed === 0 && r2.unchanged === 5
      && !dup.ok && dup.reason === "list_exists" && lists === 2 && !unknown.ok && unknown.reason === "bad_list"
      && existing.ok && existing.changed === 4 && existing.unchanged === 1 && kept?.addedAt === LIST_AT,
      `${outcome(r1)} | ${r2 ? outcome(r2) : "no list"} | ${outcome(dup)} | ${outcome(unknown)} | ${outcome(existing)} | kept ${kept?.addedAt}`];
  });
  await fresh(L.b8, async () => {
    const r = await run({ action: "suppress", audience: { ids: ["mc_b_010", "mc_b_stopped", "mc_b_operator"] }, typed: null });
    const fresh10 = await db.suppression.find(mkey(numberOf(10)));
    const row10 = await db.marketingContact.find("mc_b_010");
    const gate = await mayReceiveMarketingSms(`+${bare(numberOf(10))}`, NOW);
    const takenOver = await db.suppression.find(mkey(N.stopped));
    const lifted = await db.suppression.lift(mkey(N.stopped), "optout:old-link", NOW.toISOString());
    return [r.ok && r.matched === 3 && r.changed === 2 && r.unchanged === 1
      && fresh10?.reason === "OPERATOR" && fresh10.recordedBy === OFFICER && (fresh10.evidence ?? "").startsWith(BULK_EVIDENCE_PREFIX)
      && row10?.suppressedAt === fresh10.createdAt && !gate.ok && gate.skipReason === "suppressed"
      && takenOver?.reason === "OPERATOR" && takenOver.createdAt === STOP_AT && lifted === null,
      `${outcome(r)} | stop ${fresh10?.reason}/${fresh10?.evidence} | taken over ${takenOver?.reason}@${takenOver?.createdAt} | lift ${lifted === null ? "refused" : "LIFTED"}`];
  });
  await fresh(L.b8b, async () => {
    const capped: ContactBulkDeps = { ...impl.deps, perRowMax: 3 };
    const four = ["mc_b_020", "mc_b_021", "mc_b_022", "mc_b_023"];
    const pre = await preview({ action: "suppress", audience: { ids: four }, typed: null }, true, capped);
    const r = await run({ action: "suppress", audience: { ids: four }, typed: null }, true, capped);
    const stops = await Promise.all([20, 21, 22, 23].map((i) => db.suppression.listFor(bare(numberOf(i)))));
    return [!pre.ok && pre.reason === "too_many_for_per_row" && !r.ok && r.reason === "too_many_for_per_row" && r.expected === 4
      && stops.every((s) => s.length === 0), `${outcome(pre)} | ${outcome(r)}`];
  });
  await fresh(L.b9, async () => {
    const playerBefore = await mayReceiveMarketingSms(`+${bare(N.player)}`, NOW);
    const strangerBefore = await mayReceiveMarketingSms(`+${bare(N.stranger)}`, NOW);
    const withdrawnRows = (await db.messagingConsent.listFor(mkey(N.withdrawn))).length;
    const r = await run({ action: "withdraw", audience: { ids: ["mc_b_player", "mc_b_stranger", "mc_b_withdrawn"] }, typed: null });
    const pLatest = await db.messagingConsent.latestFor(mkey(N.player));
    const sLatest = await db.messagingConsent.latestFor(mkey(N.stranger));
    const player = await db.user.findByPhone(`+${bare(N.player)}`);
    const playerAfter = await mayReceiveMarketingSms(`+${bare(N.player)}`, NOW);
    const strangerAfter = await mayReceiveMarketingSms(`+${bare(N.stranger)}`, NOW);
    const rows = await Promise.all(["mc_b_player", "mc_b_stranger"].map((id) => db.marketingContact.find(id)));
    const latestOk = [pLatest, sLatest].every((l) => l !== null && l.status === "WITHDRAWN" && l.source === "OPERATOR"
      && l.wording === OFFICER_WITHDRAWAL_WORDING && l.recordedBy === OFFICER && (l.evidence ?? "").startsWith(BULK_EVIDENCE_PREFIX));
    const wasReachable = !(!playerBefore.ok && playerBefore.skipReason === "no_consent") && !(!strangerBefore.ok && strangerBefore.skipReason === "consent_withdrawn");
    return [r.ok && r.matched === 3 && r.changed === 2 && r.unchanged === 1 && latestOk && player?.marketingOptIn === false
      && wasReachable && !playerAfter.ok && playerAfter.skipReason === "no_consent" && !strangerAfter.ok && strangerAfter.skipReason === "consent_withdrawn"
      && rows.every((c) => c?.consentState === "WITHDRAWN") && (await db.messagingConsent.listFor(mkey(N.withdrawn))).length === withdrawnRows
      && isSmsConsentWording(OFFICER_WITHDRAWAL_WORDING) === false,
      `${outcome(r)} | player ${playerBefore.ok ? "ok" : playerBefore.skipReason} → ${playerAfter.ok ? "ok" : playerAfter.skipReason} | stranger ${strangerBefore.ok ? "ok" : strangerBefore.skipReason} → ${strangerAfter.ok ? "ok" : strangerAfter.skipReason}`];
  });
  await fresh(L.b10, async () => {
    const ledger31 = (await db.messagingConsent.listFor(mkey(numberOf(31)))).length;
    const stops32 = (await db.suppression.listFor(bare(numberOf(32)))).length;
    const r = await run({ action: "remove", audience: { ids: ["mc_b_030", "mc_b_031", "mc_b_032", "mc_b_erased"] }, typed: null });
    const gone = await Promise.all(["mc_b_030", "mc_b_031", "mc_b_032"].map((id) => db.marketingContact.find(id)));
    const memberships = await db.contactListMember.listMemberships("mc_b_030");
    const again = await db.marketingContact.create(literalRow("mc_b_031_again", numberOf(31)));
    return [r.ok && r.matched === 3 && r.changed === 3 && gone.every((c) => c === null) && memberships.length === 0 && again !== null
      && (await db.messagingConsent.listFor(mkey(numberOf(31)))).length === ledger31 && (await db.suppression.listFor(bare(numberOf(32)))).length === stops32
      && ledger31 === 1 && stops32 === 1 && (await db.marketingContact.find("mc_b_erased")) !== null,
      `${outcome(r)} | memberships ${memberships.length} | re-added ${again !== null}`];
  });

  /* ── B11–B16 · THE CAP, THE AUDIT, THE PARSER, D19, THE PROJECTION, THE FILTER ───────────────────── */
  await fresh(L.b11, async () => {
    const before = await bookSnapshot();
    const ids = Array.from({ length: MAX_AUDIENCE_IDS + 1 }, (_, i) => `mc_x_${i}`);
    const r = impl.parse({ action: "remove", audience: { ids }, typed: String(MAX_AUDIENCE_IDS + 1) });
    return [!r.ok && r.reason === "too_many_ids" && (await bookSnapshot()) === before, r.ok ? "PARSED" : r.reason];
  });
  await fresh(L.b12, async () => {
    captured.length = 0;
    const byNumber = { action: "tag", tag: "audit-check", audience: { q: "0712 345 678" }, typed: null };
    const pre = await preview(byNumber);
    const r = await run({ ...byNumber, typed: pre.ok && pre.tier.kind === "typed" ? pre.tier.word : "?" });
    const rows = captured.splice(0);
    const blob = JSON.stringify(rows.map((e) => e.payload));
    const e = rows[0] ?? {};
    const tick = await run({ action: "tag", tag: "audit-check", audience: { ids: ["mc_b_040", "mc_b_041"] }, typed: null });
    const tickRows = captured.splice(0);
    const tickBlob = JSON.stringify(tickRows.map((x) => x.payload));
    return [r.ok && rows.length === 1 && e.action === "contacts.bulk.tag" && e.actorId === OFFICER && e.category === "ADMIN" && e.targetType === "MarketingContact"
      && blob.includes("+255••••78") && !blob.includes("712345678") && !blob.includes("255712345678")
      && /"matched":1/.test(blob) && /"changed":1/.test(blob)
      && tick.ok && tickRows.length === 1 && /"selected":2/.test(tickBlob) && !tickBlob.includes("mc_b_040"),
      `${rows.length} row(s): ${blob.slice(0, 220)} | ticked: ${tickBlob.slice(0, 120)}`];
  });
  await check(p(L.b13), () => {
    const r = impl.parse({ action: "tag", tag: "vip", audience: { ids: ["mc_b_000"] }, typed: null, count: 3, tier: "enumerate", officerId: "x", matched: 999 });
    const keys = r.ok ? Object.keys(r.req).sort().join(",") : "refused";
    const unknownKey = impl.parse({ action: "tag", tag: "vip", audience: { ids: ["mc_b_000"], reachable: true }, typed: null });
    return [r.ok && keys === "action,audience,list,tag,typed" && !unknownKey.ok && unknownKey.reason === "bad_audience", `${keys} | ${unknownKey.ok ? "PARSED" : unknownKey.reason}`];
  });
  await fresh(L.b14, async () => {
    let counted = 0;
    const counting: ContactBulkDeps = { ...impl.deps, count: async (f) => { counted++; return impl.deps.count(f); } };
    const askedOf = [{ sources: ["REGISTRATION"] }, { consent: ["GIVEN"] }, { player: true }];
    const answers: string[] = [];
    let allRole = true;
    for (const audience of askedOf) {
      const pre = await preview({ action: "tag", tag: "probe", audience, typed: null }, false, counting);
      const r = await run({ action: "tag", tag: "probe", audience, typed: "1" }, false, counting);
      answers.push(`${pre.ok ? `COUNT ${pre.count}` : pre.reason}/${r.ok ? "RAN" : r.reason}`);
      if (pre.ok || pre.reason !== "role" || r.ok || r.reason !== "role") allRole = false;
    }
    const maskedCounts = counted;
    const reader = await preview({ action: "tag", tag: "probe", audience: { sources: ["REGISTRATION"] }, typed: null }, true, counting);
    return [allRole && maskedCounts === 0 && reader.ok && reader.count === 1, `${answers.join(" · ")} · masked counts asked ${maskedCounts} · reader ${outcome(reader)}`];
  });
  await fresh(L.b14c, async () => {
    // 🔴 OD54 · the stop axis asked through the bulk door's body — the address's question, refused the same way.
    let counted = 0;
    const counting: ContactBulkDeps = { ...impl.deps, count: async (f) => { counted++; return impl.deps.count(f); } };
    const askedOf: Array<Record<string, unknown>> = [{ suppressed: true }, { suppressed: false }, { suppressed: true, operators: ["VODACOM"] }];
    const answers: string[] = [];
    let allRole = true;
    for (const audience of askedOf) {
      const pre = await preview({ action: "suppress", audience, typed: null }, false, counting);
      const r = await run({ action: "suppress", audience, typed: "2" }, false, counting);
      answers.push(`${pre.ok ? `COUNT ${pre.count}` : pre.reason}/${r.ok ? "RAN" : r.reason}`);
      if (pre.ok || pre.reason !== "role" || pre.error !== BULK_SENTENCES.role("suppressed") || r.ok || r.reason !== "role") allRole = false;
    }
    const maskedCounts = counted;
    const reader = await preview({ action: "suppress", audience: { suppressed: true }, typed: null }, true, counting);
    return [allRole && maskedCounts === 0 && reader.ok && reader.count === 2 && reader.described.includes("Suppressed"),
      `${answers.join(" · ")} · masked counts asked ${maskedCounts} · reader ${outcome(reader)}`];
  });
  await fresh(L.b14b, async () => {
    const r = await run({ action: "withdraw", audience: { ids: ["mc_b_stranger", "mc_b_withdrawn"] }, typed: null }, false);
    const masked = impl.reply(r, false);
    const reader = impl.reply(r, true);
    const tagged = await run({ action: "tag", tag: "x", audience: { ids: five }, typed: null }, false);
    const taggedMasked = impl.reply(tagged, false);
    return [masked.ok && masked.changed === null && masked.unchanged === null && impl.line(masked) === "A withdrawal is on record for 2 contacts"
      && reader.ok && reader.changed === 1 && reader.unchanged === 1 && JSON.stringify(taggedMasked) === JSON.stringify(tagged),
      `masked ${outcome(masked)} | reader ${outcome(reader)}`];
  });
  await fresh(L.b14d, async () => {
    // A fresh number (a new stop) and an officer's stop (unchanged): the split a masked viewer must not be handed is 1 / 1.
    const ticked = { action: "suppress", audience: { ids: ["mc_b_010", "mc_b_operator"] }, typed: null };
    const pre = await preview(ticked, false);
    const r = await run(ticked, false);
    const masked = impl.reply(r, false);
    const reader = impl.reply(r, true);
    const maskedLine = masked.ok ? impl.line(masked) : "";
    const PREVIEW_KEYS = "action,count,described,listIsNew,listName,ok,sample,tag,tier";
    return [pre.ok && pre.count === 2 && Object.keys(pre).sort().join(",") === PREVIEW_KEYS
      && masked.ok && masked.matched === 2 && masked.changed === null && masked.unchanged === null
      && maskedLine === "A stop is on record for 2 contacts" && !/already|suppressed/i.test(maskedLine)
      && impl.line({ action: "suppress", matched: 1, changed: null, unchanged: null, full: 0 }) === "A stop is on record for 1 contact"
      && reader.ok && reader.changed === 1 && reader.unchanged === 1 && impl.line(reader) === "1 suppressed · 1 already suppressed",
      `preview ${outcome(pre)} | masked ${outcome(masked)} → "${maskedLine}" | reader ${outcome(reader)}`];
  });
  await fresh(L.b15, async () => {
    const row = await db.marketingContact.find("mc_b_known");
    if (row === null) return [false, "no fixture"];
    const sel = impl.project(row);
    const thirty = B60.slice(0, 30);
    const pre = await preview({ action: "tag", tag: "x", audience: { ids: thirty }, typed: null });
    const sampleOk = pre.ok && pre.tier.kind === "enumerate" && pre.sample.length === 20
      && pre.sample.every((s) => Object.keys(s).sort().join(",") === "id,masked,name" && MASK.test(s.masked));
    return [Object.keys(sel).sort().join(",") === "id,masked,name" && MASK.test(sel.masked) && sel.masked === maskPhone(row.msisdn)
      && !JSON.stringify(sel).includes(row.msisdn.slice(3)) && sampleOk && enumerateTail(30, 20) === "and 10 more" && enumerateTail(20, 20) === null,
      `${JSON.stringify(sel)} | sample ${pre.ok ? pre.sample.length : outcome(pre)}`];
  });
  await check(p(L.b16), () => {
    const parsedFilter = parseContactAudienceJson({ q: "0712 345 678", operators: ["VODACOM"], tags: ["vip"] });
    if (!parsedFilter.ok) return [false, parsedFilter.reason];
    const f = parsedFilter.filter;
    const key = contactFilterAudienceKey({ ...f, ids: ["mc_b_000"] });
    const back = parseContactAudienceJson(JSON.parse(key));
    return [back.ok && contactAudienceKey(back.filter) === contactAudienceKey(f) && !key.includes("\"ids\"")
      && isTicksOnly({ ...WHOLE_BOOK, ids: ["mc_b_000"] }) && !isTicksOnly({ ...WHOLE_BOOK, ids: ["mc_b_000"], tags: ["vip"] }) && !isTicksOnly(WHOLE_BOOK),
      key];
  });

  /* ── B17–B19 · THE ADVERSARIAL REVIEW'S FIXES (2026-10-02) ─────────────────────────────────────────────── */
  await fresh(L.b17, async () => {
    // The player's switch write fails — the memory twin's own `update`, wrapped for this check and put back in `finally`.
    const users = db.user as unknown as { update: (id: string, patch: unknown) => unknown };
    const realUpdate = users.update;
    const before = captured.length;
    users.update = (id: string, patch: unknown) => {
      if (id === "usr_b_player") throw new Error("planted: the player's switch could not be written");
      return realUpdate.call(db.user, id, patch);
    };
    let threw = "";
    try {
      await run({ action: "withdraw", audience: { ids: ["mc_b_000", "mc_b_player", "mc_b_stranger"] }, typed: null });
    } catch (err) {
      threw = (err as Error)?.message ?? String(err);
    } finally {
      users.update = realUpdate;
    }
    const rows = captured.slice(before) as Array<{ action?: string; payload?: Record<string, unknown> }>;
    const a = rows[0];
    const first = await db.marketingContact.find("mc_b_000");
    const player = await db.marketingContact.find("mc_b_player");
    const stranger = await db.marketingContact.find("mc_b_stranger");
    const strangerWord = await db.messagingConsent.latestFor(mkey(N.stranger));
    return [threw.startsWith("planted") && rows.length === 1 && a?.action === "contacts.bulk.consent_withdrawn"
      && a?.payload?.partial === true && a?.payload?.matched === 2 && a?.payload?.changed === 2 && a?.payload?.unchanged === 0
      && first?.consentState === "WITHDRAWN" && player?.consentState === "WITHDRAWN"
      && stranger?.consentState === "GIVEN" && strangerWord?.status === "GIVEN",
      JSON.stringify({ threw, audits: rows.length, payload: a?.payload, first: first?.consentState, player: player?.consentState, stranger: stranger?.consentState })];
  });
  await fresh(L.b18, async () => {
    // The recount says 2; the walk then finds the 3 that are really there — the shape of a filter that grew in between.
    const r = await run({ action: "suppress", audience: { ids: ["mc_b_005", "mc_b_006", "mc_b_007"] }, typed: null }, true, { ...impl.deps, count: async () => 2 });
    const stops = await Promise.all([5, 6, 7].map((i) => db.suppression.find(mkey(numberOf(i)))));
    return [!r.ok && r.reason === "confirm_mismatch" && r.expected === 3 && stops.every((x) => x === null), outcome(r)];
  });
  await check(p(L.b19), () => {
    const at = (ms: number, sp: Record<string, string>) => {
      const r = parseContactAudienceParams(sp, ms);
      if (!r.ok) throw new Error(`refused: ${r.param}`);
      return { key: contactFilterAudienceKey(r.filter), id: impl.identity(r.filter, sp) };
    };
    const t0 = NOW.getTime();
    const a = at(t0, { range: "7d" });
    const b = at(t0 + 60_000, { range: "7d" });
    const c = at(t0, { range: "24h" });
    const d = at(t0, { range: "7d", op: "VODACOM" });
    const e = at(t0, { from: "2026-09-01" });
    const e2 = at(t0 + 3_600_000, { from: "2026-09-01" });
    return [a.key !== b.key && a.id === b.id && a.id !== c.id && a.id !== d.id && e.id === e2.id && e.id !== a.id,
      JSON.stringify({ keysMove: a.key !== b.key, oneIdentity: a.id === b.id, rangeDiffers: a.id !== c.id, pillDiffers: a.id !== d.id, typedDate: e.id === e2.id })];
  });

  /* ── S1–S7 · THE SOURCE ──────────────────────────────────────────────────────────────────────────── */
  const src = impl.sources;
  await check(p(L.s1), () => {
    const ACTIONS = ["previewContactBulkAction", "runContactBulkAction"];
    const exported = [...src.actions.matchAll(/^export async function (\w+)\(/gm)].map((m) => m[1]).sort().join(",");
    const GATE_FIRST = /^\s*const g = await softRequireStaff\("growth", "contacts\.bulk\.(?:preview|run)", CONTACT_ROLE_REFUSAL\);\s*if \(!g\.ok\) return \{ ok: false, reason: "forbidden", error: g\.error \};/;
    const RATE = { previewContactBulkAction: "contacts.lookup", runContactBulkAction: "contacts.write" } as Record<string, string>;
    const bad = ACTIONS.filter((n) => {
      const body = actionBody(src.actions, n);
      const rest = body.slice(body.indexOf("\n") + 1);
      const gate = rest.indexOf("softRequireStaff(");
      const rate = rest.indexOf(`rateCheckAsync(g.userId, "${RATE[n]}")`);
      const parse = rest.indexOf("parseBulkRequest(input)");
      return !(GATE_FIRST.test(rest) && gate >= 0 && rate > gate && parse > rate && !/\binput\s*\./.test(body) && !/\.count\b/.test(body));
    });
    const runBody = actionBody(src.actions, "runContactBulkAction");
    const revalidates = /if \(result\.ok\) \{\s*try \{ revalidatePath\("\/admin\/contacts"\);/.test(runBody) && /return contactBulkReply\(result, reads\);/.test(runBody);
    return [src.actionsRaw.startsWith("\"use server\";") && exported === [...ACTIONS].sort().join(",") && bad.length === 0 && revalidates,
      `exported [${exported}] failing [${bad}] revalidates ${revalidates}`];
  });
  await check(p(L.s2), () => {
    const bar = src.bar;
    const shape = /\bconst mayAct = useMayAct\(\);/.test(bar) && /\bconst actReason = useActDisabledReason\(\);/.test(bar)
      && /const state = bulkActionState\(a, \{ mayAct, actReason, count: s\.count, perRowMax: BULK_PER_ROW_MAX, busy: pending \}\);/.test(bar)
      && /<Button key=\{a\} type="button" size="sm" variant="ghost" disabled=\{state\.disabled\} title=\{state\.title\}/.test(bar)
      && /from "\.\/contact-bulk-actions"/.test(bar) && src.barRaw.startsWith("\"use client\";");
    const REASON = "Read-only: the AUDITOR role can view Growth & marketing but not change it.";
    const states = CONTACT_BULK_ACTIONS.flatMap((a) => [
      { a, s: impl.actionState(a, { mayAct: false, actReason: REASON, count: 5, perRowMax: BULK_PER_ROW_MAX, busy: false }), want: { disabled: true, title: REASON } },
      { a, s: impl.actionState(a, { mayAct: true, actReason: undefined, count: 0, perRowMax: BULK_PER_ROW_MAX, busy: false }), want: { disabled: true, title: CONTACTS_BULK.noneTitle } },
      { a, s: impl.actionState(a, { mayAct: true, actReason: undefined, count: 5, perRowMax: BULK_PER_ROW_MAX, busy: false }), want: { disabled: false, title: BULK_COPY[a].hint } },
    ]);
    const overCap = PER_ROW_ACTIONS.map((a) => impl.actionState(a, { mayAct: true, actReason: undefined, count: BULK_PER_ROW_MAX + 1, perRowMax: BULK_PER_ROW_MAX, busy: false }));
    const wrong = states.filter((x) => x.s.disabled !== x.want.disabled || x.s.title !== x.want.title || x.s.title.trim() === "");
    return [shape && wrong.length === 0 && overCap.every((x) => x.disabled && x.title === CONTACTS_BULK.perRowCap(BULK_PER_ROW_MAX)),
      `shape ${shape} · ${wrong.length} wrong of ${states.length}`];
  });
  await check(p(L.s3), () => {
    const bar = src.bar;
    const spread = /\{\.\.\.\(p\.tier\.kind === "typed" \? \(\{ tier: "hard", typedWord: p\.tier\.word \} as const\) : \(\{ tier: "medium" \} as const\)\)\}/.test(bar);
    const oneWord = (bar.match(/typedWord:/g) ?? []).length === 1;
    const postsBack = /typed: p\.tier\.kind === "typed" \? p\.tier\.word : null/.test(bar);
    return [spread && oneWord && postsBack && !/typedWord:\s*(?:String\()?s\./.test(bar), `spread ${spread} · one ${oneWord} · posts back ${postsBack}`];
  });
  await check(p(L.s4), () => {
    const client = [src.bar, src.provider, src.rowSelect];
    const leaks = client.filter((x) => /msisdn|phoneE164/i.test(x)).length;
    const projection = region(src.service, "export function contactSelectionRow(");
    return [leaks === 0 && src.page.includes("const pageRows = rows.map(contactSelectionRow);") && src.page.includes("<ContactRowSelect row={pageRows[i]} />")
      && /masked: maskPhone\(c\.msisdn\)/.test(projection) && !/masked: c\.msisdn/.test(projection),
      `${leaks} client file(s) name a number · projection ${projection.replace(/\s+/g, " ").slice(0, 120)}`];
  });
  await check(p(L.s5), () => {
    const page = src.page;
    const headAt = page.indexOf("<ContactPageSelect />");
    const nameAt = page.indexOf('<SortTh field="name"');
    const link = (/<Link\s+href=\{contactsHref\(sp, \{ edit: c\.id \}\)\}[\s\S]*?<\/Link>/.exec(page) ?? [""])[0];
    const href = contactsHref({ q: "asha", op: "VODACOM", sort: "name", dir: "asc", page: "3" }, { edit: "mc_b_known" });
    const sp = new URL(href, "http://x").searchParams;
    return [page.includes("const cols = reads ? 9 : 6;") && headAt > 0 && nameAt > headAt
      && page.includes("<ContactsSelectionProvider pageRows={pageRows} matching={matching} maxTicks={MAX_AUDIENCE_IDS}>") && page.includes("</ContactsSelectionProvider>")
      && page.includes("const selectable = !failed && !emptyBook;") && /\{selectable && <ContactsBulkBar lists=/.test(page)
      && link.length > 0 && !/msisdn/.test(link) && link.includes("{CONTACTS_BULK.editLink}")
      && sp.get("edit") === "mc_b_known" && sp.get("q") === "asha" && sp.get("op") === "VODACOM" && sp.get("sort") === "name" && !sp.has("page")
      && !/\d{9,}/.test(href),
      `${href} · link ${link.replace(/\s+/g, " ").slice(0, 100)}`];
  });
  await check(p(L.s6), () => [
    BULK_COPY.suppress.consequence.includes("no one can lift this") && BULK_COPY.suppress.consequence.includes("later owner of this number")
      && BULK_COPY.remove.consequence.includes("consent and stop records are kept") && BULK_COPY.remove.consequence.includes("emptied by an erasure are kept")
      && !CONTACT_BULK_ACTIONS.some((a) => /consent/i.test(a) || /record consent|give consent/i.test(BULK_COPY[a].label))
      && /Consent can't be recorded here/.test(CONTACTS_BULK.consentNote) && src.bar.includes("{CONTACTS_BULK.consentNote}")
      && src.bar.includes("{words.consequence}") && bulkResultLine({ action: "suppress", matched: 4, changed: 2, unchanged: 1, full: 0 }) === "2 suppressed · 1 already suppressed · 1 no longer in the book"
      && bulkResultLine({ action: "remove", matched: 3, changed: 3, unchanged: 0, full: 0 }) === "3 removed",
    `${BULK_COPY.suppress.consequence}`,
  ]);
  await check(p(L.s7), () => {
    const scripts = (JSON.parse(src.pkg) as { scripts: Record<string, string> }).scripts;
    const imports = [...src.rules.matchAll(/^import\s[^;]*?from\s+"([^"]+)";/gm)].map((m) => m[1]);
    return [/\bcols=\{9\}/.test(src.loading) && src.loading.includes('data-skeleton="contacts-bulk-bar"')
      && !/"use (?:client|server)"/.test(src.rules) && imports.length === 1 && imports[0] === "./contact-fields"
      && /^\s*"lib\/contacts\/bulk-rules\.ts",/m.test(src.cgs)
      && scripts["test:contacts-bulk"] === "tsx scripts/contacts-bulk.test.mts" && scripts["red:contacts-bulk"] === "tsx scripts/contacts-bulk.test.mts --prove-red"
      && (scripts.predeploy ?? "").includes("npm run test:contacts-form && npm run test:contacts-bulk &&"),
      `imports [${imports}] · ${scripts["test:contacts-bulk"]}`];
  });
  await check(p(L.s8), () => {
    const pv = src.provider;
    const byIdentity = pv.includes("chosen.identity !== matchingKey") && pv.includes("matching?.identity ?? null") && !pv.includes("chosen.key !== matchingKey");
    const notes = pv.includes("CONTACTS_BULK.ticksReplaced(offPage)");
    const copy = CONTACTS_BULK.ticksReplaced(1) === "1 ticked contact not on this page stays selected only if it matches this filter."
      && CONTACTS_BULK.ticksReplaced(3) === "3 ticked contacts not on this page stay selected only if they match this filter."
      && CONTACTS_BULK.selected(3, 2) === "3 selected · 2 not on this page" && CONTACTS_BULK.selected(3, 0) === "3 selected";
    return [byIdentity && notes && copy, JSON.stringify({ byIdentity, notes, copy })];
  });
  await check(p(L.s9), () => {
    const tailGated = src.bar.includes("const tail = p.sample.length > 0 ? enumerateTail(p.count, p.sample.length) : null;");
    const whole = src.bar.includes("CONTACTS_BULK.wholeBook") && CONTACTS_BULK.wholeBook === "Every contact in the book.";
    const busy = impl.actionState("tag", { mayAct: true, actReason: undefined, count: 3, perRowMax: BULK_PER_ROW_MAX, busy: true });
    const idle = impl.actionState("tag", { mayAct: true, actReason: undefined, count: 3, perRowMax: BULK_PER_ROW_MAX, busy: false });
    return [tailGated && whole && busy.disabled && busy.title === CONTACTS_BULK.busyTitle && !idle.disabled && idle.title === BULK_COPY.tag.hint,
      JSON.stringify({ tailGated, whole, busy, idle })];
  });
  await check(p(L.s10), () => {
    const page = src.page;
    const m = page.indexOf("data-kpis-masked");
    const masked = m < 0 ? "" : page.slice(m, page.indexOf("</KpiGrid>", m));
    const r = page.indexOf('<div data-block="contacts-kpis"><KpiGrid>');
    const reader = r < 0 ? "" : page.slice(r, page.indexOf("</KpiGrid>", r));
    const tiles = (masked.match(/<AdminKpi /g) ?? []).length;
    return [page.includes("{reads ? (") && masked.includes('cols="1-lg2"') && tiles === 2 && masked.includes('label="In the book"')
      // OD54 · the second fact is the loader's whole-book count of the last 7 days, under the copy module's one label.
      && masked.includes("label={CONTACTS_KPI_RECENT}") && masked.includes("recent!.toLocaleString()")
      && page.includes("const recent = view?.addedRecently ?? null;") && CONTACTS_KPI_RECENT === "Added in the last 7 days"
      && !/consent|withdrawn|suppress/i.test(masked)
      && ["In the book", "Consent given", "No consent", "Suppressed"].every((l) => reader.includes(`label="${l}"`)),
      `masked: ${masked.replace(/ +/g, " ").slice(0, 200)}`];
  });
  await check(p(L.s11), () => {
    const bar = src.bar.includes("parseBulkTag(param.tag, param.action)");
    const service = src.service.includes('parseBulkTag(req.tag ?? "", req.action)');
    const rules = src.rules.includes('action === "untag" ? parseFilterTag(text) : parseOneTag(text)');
    return [bar && service && rules, `bar ${bar} · service ${service} · rules ${rules}`];
  });

  /* ── B20–B21, S12–S14 · vb7 ─────────────────────────────────────────────────────────────────────── */
  await fresh(L.b20, async () => {
    const ashaIds = async () => (await db.marketingContact.listAll()).filter((c) => /asha/i.test(c.displayName ?? "")).map((c) => c.id).sort().join(",");
    // CONTROL · nobody joins: the Remove over the filter takes exactly the three it confirmed (rolled back after).
    let controlOk = false;
    let controlSeen = "";
    await inScratchBook(async () => {
      const c = await run({ action: "remove", audience: { q: "Asha" }, typed: "3" });
      controlOk = c.ok && c.matched === 3 && c.changed === 3 && (await ashaIds()) === "";
      controlSeen = outcome(c);
    });
    // ⛔ review m8 · a confirmed row STOPS matching between the id walk and the write (renamed out of "Asha" the moment its
    // id is walked): it is NOT removed — the write reaches the filter AND the walked ids, never the ids alone. Run while the
    // book holds exactly the three it confirms (before the newcomer below joins), in its own scratch book.
    let stoppedOk = false;
    let stoppedSeen = "";
    await inScratchBook(async () => {
      let victim = "";
      const stopping: ContactBulkDeps = {
        ...impl.deps,
        walkIds: async (f) => {
          const ids = await impl.deps.walkIds(f);
          const row = ids.length > 0 ? await db.marketingContact.find(ids[0]) : null;
          if (row !== null) {
            victim = row.id;
            await db.marketingContact.updateIfUnchanged(row.id, { displayName: "Zed Stopped", notes: row.notes, tags: [...row.tags], updatedBy: OFFICER },
              { expectedUpdatedAt: row.updatedAt }, new Date(Date.parse(row.updatedAt) + 1000).toISOString());
          }
          return ids;
        },
      };
      const s = await run({ action: "remove", audience: { q: "Asha" }, typed: "3" }, true, stopping);
      const kept = victim === "" ? null : await db.marketingContact.find(victim);
      stoppedOk = s.ok && s.matched === 2 && s.changed === 2 && kept !== null && kept.displayName === "Zed Stopped" && (await ashaIds()) === "";
      stoppedSeen = `${outcome(s)} · the renamed row ${kept === null ? "REMOVED" : "kept"}`;
    });
    const start = await ashaIds();
    // The recount says 3; a fourth "Asha" starts matching right after it — the window a set-based write over a filter had.
    let planted = false;
    const planting: ContactBulkDeps = {
      ...impl.deps,
      count: async (f) => {
        const n = await impl.deps.count(f);
        if (!planted) {
          planted = true;
          await db.marketingContact.create(literalRow("mc_b_asha_after", N.ashaAfter, { displayName: "Asha After" }));
        }
        return n;
      },
    };
    const r = await run({ action: "remove", audience: { q: "Asha" }, typed: "3" }, true, planting);
    const end = await ashaIds();
    // The bound write's chunks are summed: a filter Tag over the sixty "Bulk" rows, seven ids a statement, counts sixty.
    const chunky = await run({ action: "tag", tag: "chunked", audience: { q: "Bulk" }, typed: "60" }, true, { ...impl.deps, setChunk: 7 });
    const tagged = (await db.marketingContact.listAll()).filter((c) => c.tags.includes("chunked")).length;
    return [controlOk && !r.ok && r.reason === "confirm_mismatch" && r.expected === 4 && r.error === BULK_SENTENCES.walkChanged(4, 3)
      && end === [...start.split(","), "mc_b_asha_after"].sort().join(",") && stoppedOk
      && chunky.ok && chunky.matched === 60 && chunky.changed === 60 && tagged === 60,
      `control ${controlSeen} · planted ${outcome(r)} · Asha rows ${start} → ${end} · stopped ${stoppedSeen} · chunked ${outcome(chunky)} (${tagged} tagged)`];
  });
  await fresh(L.b22, async () => {
    const ashaIds = async () => (await db.marketingContact.listAll()).filter((c) => /asha/i.test(c.displayName ?? "")).map((c) => c.id).sort().join(",");
    const start = await ashaIds();
    // ONE call: the confirmed ids reach the store in one removeBound, however small the chunk size.
    const calls: string[] = [];
    const spying: ContactBulkDeps = {
      ...impl.deps,
      setChunk: 1,
      writes: (f) => {
        const w = impl.deps.writes(f);
        return {
          ...w,
          remove: async () => { calls.push("remove"); return w.remove(); },
          removeBound: async (ids) => { calls.push(`removeBound:${ids.length}`); return w.removeBound(ids); },
        };
      },
    };
    let oneCall = false;
    let oneSeen = "";
    await inScratchBook(async () => {
      const r = await run({ action: "remove", audience: { q: "Asha" }, typed: "3" }, true, spying);
      oneCall = r.ok && r.changed === 3 && JSON.stringify(calls) === JSON.stringify(["removeBound:3"]) && (await ashaIds()) === "";
      oneSeen = `${outcome(r)} · calls [${calls}]`;
    });
    // A fault in the store: nobody removed, and the run's one row says it was rolled back — no count, never partial.
    const before = captured.length;
    const faulting: ContactBulkDeps = {
      ...impl.deps,
      writes: (f) => ({ ...impl.deps.writes(f), removeBound: async () => { throw new Error("planted store fault (contacts-bulk B22)"); } }),
    };
    let threw = "";
    try {
      await run({ action: "remove", audience: { q: "Asha" }, typed: "3" }, true, faulting);
    } catch (err) {
      threw = (err as Error)?.message ?? String(err);
    }
    const rows = captured.slice(before) as Array<{ action?: string; payload?: Record<string, unknown> }>;
    const a = rows[0];
    const after = await ashaIds();
    return [oneCall && threw.includes("planted store fault") && after === start && rows.length === 1 && a?.action === "contacts.bulk.remove"
      && a?.payload?.rolledBack === true && !("matched" in (a?.payload ?? {})) && !("partial" in (a?.payload ?? {})),
      `one call: ${oneSeen} · fault: ${threw || "did not throw"} · Asha ${start} → ${after} · audit ${JSON.stringify(a?.payload ?? null)}`];
  });
  await fresh(L.b21, async () => {
    const neither = await preview({ action: "addToList", audience: { ids: five }, typed: null });
    const blankId = await preview({ action: "addToList", audience: { ids: five }, typed: null, listId: "   " });
    const emptyName = await preview({ action: "addToList", audience: { ids: five }, typed: null, newListName: "" });
    const parsedNeither = impl.parse({ action: "addToList", audience: { ids: five }, typed: null });
    return [!neither.ok && neither.reason === "bad_list" && neither.field === "list" && neither.error === LIST_NONE
      && LIST_NONE === "Choose a list, or name a new one." && BULK_SENTENCES.noList === LIST_NONE
      && !blankId.ok && blankId.error === LIST_NONE && !emptyName.ok && emptyName.error === LIST_NAME_EMPTY
      && parsedNeither.ok && parsedNeither.req.list === null
      && BULK_SENTENCES.empty.endsWith("Clear the selection and tick the contacts again."),
      `neither → ${outcome(neither)} · blank id → ${outcome(blankId)} · empty name → ${outcome(emptyName)}`];
  });
  await check(p(L.s12), () => {
    const bar = src.bar;
    const lists = [{ id: "l3", name: "Zeta" }, { id: "l2", name: "same" }, { id: "l1", name: "same" }, { id: "l0", name: "alpha" }, { id: "l4", name: "Beta" }];
    const reference = [...lists].sort((a, b) => a.name.localeCompare(b.name, "en") || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((l) => l.id).join(",");
    const ordered = [...lists].sort(compareListsByName).map((l) => l.id).join(",");
    const picker = bar.includes('setParam({ action, tag: "", listChoice: "", newName: "", error: null, note: null });')
      && bar.includes("placeholder={CONTACTS_BULK.listChoose}") && CONTACTS_BULK.listChoose === "Choose a list…"
      && bar.includes("const sortedLists = React.useMemo(() => [...lists].sort(compareListsByName), [lists]);")
      && bar.includes("options={[...sortedLists.map((l) => ({ value: l.id, label: l.name }))") && !bar.includes("lists[0]?.id")
      && src.rail.includes(".sort(compareListsByName)") && ordered === reference && ordered.indexOf("l1") < ordered.indexOf("l2");
    const before = bar.includes('if (param.listChoice === "") {') && bar.includes("setParam({ ...param, error: LIST_NONE, note: null });")
      && bar.includes('focusFirstInvalid(formRef.current, ["list"]);');
    const same = bar.includes("const same = sortedLists.find((l) => listNameKey(l.name) === key);")
      && bar.includes("note: CONTACTS_BULK.listExisting(same.name)");
    const tagBox = !bar.includes("maxLength") && !bar.includes("TAG_BOX_MAX") && CONTACTS_BULK.tagHint.includes(`${CONTACT_LIMITS.tag} characters`);
    const focus = bar.includes('focusFirstInvalid(formRef.current, ["tag"]);') && bar.includes('focusFirstInvalid(formRef.current, ["newListName"]);');
    const reopen = /if \("field" in r && \(r\.field === "tag" \|\| r\.field === "list"\)\) \{[\s\S]{0,400}?setParamOpen\(true\);[\s\S]{0,200}?if \(r\.field === "list"\) router\.refresh\(\);/.test(bar);
    const keep = bar.includes("setParamRefusal(r.error);") && bar.includes('{paramRefusal !== null && <Callout tone="warning" role="alert">{paramRefusal}</Callout>}');
    const moved = /if \(r\.reason === "confirm_required" \|\| r\.reason === "confirm_mismatch"\) \{\s*preview\(lastPost\.current \?\? post, r\.error\);/.test(bar)
      && bar.includes('{notice !== null && <Callout tone="warning" role="alert">{notice}</Callout>}');
    const cap = bar.includes("{s.count > BULK_PER_ROW_MAX && (") && bar.includes("{CONTACTS_BULK.perRowCap(BULK_PER_ROW_MAX)}");
    const untag = bar.includes('list={param.action === "untag" && tags.length > 0 ? tagListId : undefined}') && bar.includes("<datalist id={tagListId}>")
      && src.page.includes("tags={(view?.tags ?? []).map((t) => t.tag)}");
    return [picker && before && same && tagBox && focus && reopen && keep && moved && cap && untag,
      JSON.stringify({ picker, before, same, tagBox, focus, reopen, keep, moved, cap, untag, ordered, reference })];
  });
  await check(p(L.s13), () => {
    const pv = src.provider;
    const narrowed = /if \(chosen !== null\) \{[\s\S]{0,400}?setRows\(new Map\(pageRows\.filter\(\(r\) => r\.id !== row\.id\)[\s\S]{0,200}?setNote\(CONTACTS_BULK\.matchingNarrowed\);/.test(pv);
    return [narrowed && CONTACTS_BULK.matchingNarrowed === "Select all matching was cleared — only the other contacts on this page stay selected.",
      `narrowed note ${narrowed}`];
  });
  await fresh(L.s14, async () => {
    const tagged = await run({ action: "tag", tag: " VIP ", audience: { ids: five }, typed: null });
    const untagged = await run({ action: "untag", tag: "vip", audience: { ids: five }, typed: null });
    const listed = await run({ action: "addToList", listId: "lst_b_existing", audience: { ids: five }, typed: null });
    const titles = [tagged, untagged, listed].map((r) => (r.ok ? BULK_COPY[r.action].done(r) : `REFUSED ${r.reason}`));
    return [tagged.ok && tagged.tag === "vip" && untagged.ok && untagged.tag === "vip" && listed.ok && listed.tag === null
      && titles[0] === "Tagged “vip”" && titles[1] === "“vip” removed" && titles[2] === "Added to “Existing list”"
      && BULK_COPY.tag.done({ tag: null, listName: null }) === "Tagged"
      && src.actions.includes("safeError(err, CONTACTS_BULK.previewFallback)") && src.actions.includes("safeError(err, CONTACTS_BULK.runFallback)")
      && CONTACTS_BULK.previewFallback === "Counting the selection failed — nothing was changed. Try again."
      && CONTACTS_BULK.runFallback === "The bulk action failed — some contacts may have changed. Reload the list before running it again."
      && src.bar.includes('deferToast({ title: BULK_COPY[r.action].done(r), description: bulkResultLine(r), variant: "success" });'),
      titles.join(" | ")];
  });
}

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`\ncontacts-bulk: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline: ${pass} passed, ${fail} failed\n`);

  /** A count that answers its FIRST figure for an audience for ever after — the preview's count, reused at the run. */
  const memoCount = (): ContactBulkDeps["count"] => {
    const seen = new Map<string, number>();
    return async (f) => {
      const k = contactAudienceKey(f);
      if (!seen.has(k)) seen.set(k, await contactAudience(f).count());
      return seen.get(k) as number;
    };
  };
  /** The memory twin's own remove, wrapped for one case: the rows and the index go, the memberships come back — the
   *  cascade Postgres does, forgotten. Put back in the case's `finally`. */
  const cascadeless = (): (() => void) => {
    const book = db.marketingContact as unknown as { removeWhere: (w: unknown) => unknown };
    const real = book.removeWhere;
    book.removeWhere = (w: unknown) => {
      const members = new Map(memory?.contactListMembers ?? []);
      const out = real(w);
      for (const [k, m] of members) if (memory && !memory.contactListMembers.has(k)) memory.contactListMembers.set(k, m);
      return out;
    };
    return () => { book.removeWhere = real; };
  };
  const withSource = (key: keyof Sources, from: string, to: string): Sources => {
    const text = REAL_SOURCES[key];
    if (text.split(from).length - 1 !== 1) throw new Error(`plant anchor for ${key} does not resolve exactly once: ${from}`);
    return { ...REAL_SOURCES, [key]: text.replace(from, to) };
  };

  type Case = { name: string; expect: string; impl: () => Impl; setup?: () => () => void };
  const CASES: Case[] = [
    /* ── the plan's RED line, each in memory ── */
    {
      name: "R1 · the server takes the client's count — the forged 3 decides the tier, and the 60 are tagged on enumerate",
      expect: L.b2,
      impl: () => ({ ...REAL, deps: { ...TEST_DEPS, count: async () => 3 } }),
    },
    {
      name: "R2 · the run confirms against the preview's count, not a recount — the first count is reused",
      expect: L.b3,
      impl: () => ({ ...REAL, deps: { ...TEST_DEPS, count: memoCount() } }),
    },
    {
      name: "R3 · a filter is treated like ticked rows — the tier ignores the audience's kind",
      expect: L.b4,
      impl: () => ({ ...REAL, deps: { ...TEST_DEPS, tier: (n: number) => (n > BULK_ENUMERATE_MAX ? { kind: "typed" as const, word: String(n) } : { kind: "enumerate" as const }) } }),
    },
    {
      name: "R4 · suppress writes a person-liftable stop — WITHDRAWN, which an old SMS link lifts",
      expect: L.b8,
      impl: () => ({ ...REAL, deps: { ...TEST_DEPS, suppressionReason: "WITHDRAWN" } }),
    },
    {
      name: "R5 · the memory twin forgets the cascade — removeWhere leaves the list memberships behind",
      expect: L.b10,
      impl: () => REAL,
      setup: cascadeless,
    },
    {
      name: "R6 · the audit names the raw search — the describer is the raw filter",
      expect: L.b12,
      impl: () => ({ ...REAL, deps: { ...TEST_DEPS, describe: ((f: unknown) => f) as unknown as ContactBulkDeps["describe"] } }),
    },
    {
      name: "R7 · 🔴 D19 · a masked role's POSTed sources audience is answered with a count — the role rule skipped",
      expect: L.b14,
      impl: () => ({ ...REAL, deps: { ...TEST_DEPS, roleRefusal: () => null } }),
    },

    /* ── and the rest of the unit, each on its own assertion ── */
    {
      name: "R8 · the parser passes the body through — the posted count and tier ride into the request",
      expect: L.b13,
      impl: () => ({ ...REAL, parse: ((x: unknown) => ({ ok: true, req: x as ContactBulkRequest })) as typeof parseBulkRequest }),
    },
    {
      name: "R9 · 🔴 A1.1 · a withdrawal's split reaches a masked viewer — the reply is never shaped",
      expect: L.b14b,
      impl: () => ({ ...REAL, reply: (r) => r }),
    },
    {
      name: "R10 · the raw number reaches the client — the projection carries the stored number",
      expect: L.b15,
      impl: () => ({ ...REAL, project: (c) => ({ id: c.id, name: c.displayName, masked: c.msisdn }) }),
    },
    {
      name: "R11 · an ungated bulk action — runContactBulkAction loses its softRequireStaff",
      expect: L.s1,
      impl: () => ({
        ...REAL,
        sources: withSource("actions",
          'const g = await softRequireStaff("growth", "contacts.bulk.run", CONTACT_ROLE_REFUSAL);\n  if (!g.ok) return { ok: false, reason: "forbidden", error: g.error };',
          'const g = { ok: true as const, userId: "anyone" };'),
      }),
    },
    {
      name: "R12 · a disabled action button with no reason — the bar drops the title",
      expect: L.s2,
      impl: () => ({ ...REAL, sources: withSource("bar", " disabled={state.disabled} title={state.title}", " disabled={state.disabled}") }),
    },
    {
      name: "R13 · a disabled state that says nothing — the act gate's refusal returns an empty reason",
      expect: L.s2,
      impl: () => ({ ...REAL, actionState: (a, s) => (s.mayAct ? bulkActionState(a, s) : { disabled: true, title: "" }) }),
    },
    {
      name: "R14 · the typed word computed in the browser — from the selection's size, not the server's preview",
      expect: L.s3,
      impl: () => ({ ...REAL, sources: withSource("bar", "typedWord: p.tier.word }", "typedWord: String(s.count) }") }),
    },
    {
      name: "R15 · the projection stops masking — the stored number in the selection row",
      expect: L.s4,
      impl: () => ({ ...REAL, sources: withSource("service", "masked: maskPhone(c.msisdn)", "masked: c.msisdn") }),
    },
    {
      name: "R16 · the row's edit link carries the number — ?edit= a phone number instead of the contact id",
      expect: L.s5,
      impl: () => ({ ...REAL, sources: withSource("page", "href={contactsHref(sp, { edit: c.id })}", "href={contactsHref(sp, { edit: c.msisdn })}") }),
    },

    /* ── the adversarial review's fixes (2026-10-02), each on its own assertion ── */
    {
      name: "R17 · a run that dies mid-way leaves no audit row — the partial row never reaches the trail",
      expect: L.b17,
      impl: () => ({
        ...REAL,
        deps: {
          ...TEST_DEPS,
          audit: (async (entry: unknown) => {
            if ((entry as { payload?: Record<string, unknown> }).payload?.partial === true) return { ok: true } as never;
            return captureAudit(entry as never);
          }) as unknown as ContactBulkDeps["audit"],
        },
      }),
    },
    {
      name: "R18 · the filter's identity is its resolved key — a rolling window “changes” every minute",
      expect: L.b19,
      impl: () => ({ ...REAL, identity: (f) => contactFilterAudienceKey(f) }),
    },
    {
      name: "R19 · the selection clears “all matching” on the key, not the identity",
      expect: L.s8,
      impl: () => ({ ...REAL, sources: withSource("provider", "chosen.identity !== matchingKey", "chosen.key !== matchingKey") }),
    },
    {
      name: "R20 · “and N more” under a typed confirmation that lists nobody",
      expect: L.s9,
      impl: () => ({ ...REAL, sources: withSource("bar", "p.sample.length > 0 ? enumerateTail(p.count, p.sample.length) : null", "enumerateTail(p.count, p.sample.length)") }),
    },
    {
      name: "R21 · 🔴 D19 · a masked viewer's KPI band carries the consent split again",
      expect: L.s10,
      impl: () => ({ ...REAL, sources: withSource("page", 'data-kpis-masked><KpiGrid cols="1-lg2">', 'data-kpis-masked><KpiGrid cols="1-lg2"><AdminKpi label="Consent given" value="1" />') }),
    },

    /* ── 🔴 OD54 · D19 covers SUPPRESSION too — each defect on its own assertion ── */
    {
      name: "R22 · 🔴 OD54 · the role rule forgets the stop — a masked role's POSTed { suppressed: true } is answered with a count",
      expect: L.b14c,
      impl: () => ({ ...REAL, deps: { ...TEST_DEPS, roleRefusal: (f, reads) => roleRefusal({ ...f, suppressed: null }, reads) } }),
    },
    {
      name: "R23 · 🔴 OD54 · a suppression's split reaches a masked viewer — the reply shapes a withdrawal only, as before OD54",
      expect: L.b14d,
      impl: () => ({ ...REAL, reply: (r, reads) => (r.ok && r.action === "suppress" ? r : contactBulkReply(r, reads)) }),
    },
    {
      name: "R24 · OD54 · the total-only line borrows the withdrawal's sentence — a masked officer who suppressed is told a withdrawal is on record",
      expect: L.b14d,
      impl: () => ({
        ...REAL,
        line: (r) => (r.changed === null || r.unchanged === null
          ? `A withdrawal is on record for ${r.matched} contact${r.matched === 1 ? "" : "s"}`
          : bulkResultLine(r)),
      }),
    },
    {
      name: "R25 · 🔴 OD54 · “Suppressed” is back in the masked band — the book's stops, beside its size",
      expect: L.s10,
      impl: () => ({
        ...REAL,
        sources: withSource("page",
          '<AdminKpi label={CONTACTS_KPI_RECENT} value={failed ? "" : recent!.toLocaleString()} unavailable={failed} />',
          '<AdminKpi label="Suppressed" value={failed ? "" : s!.suppressed.toLocaleString()} unavailable={failed} />'),
      }),
    },

    /* ── the vb5 review's M1 (2026-10-03), each on its own assertion ── */
    {
      name: "R26 · vb5 M1 · the service drops the action — an untag of a stored phone-number tag meets the write rule and is refused",
      expect: L.s11,
      impl: () => ({ ...REAL, sources: withSource("service", 'parseBulkTag(req.tag ?? "", req.action)', 'parseBulkTag(req.tag ?? "", "tag")') }),
    },
    {
      name: "R27 · vb5 M1 · the bar drops the action — the browser refuses the untag the server would run",
      expect: L.s11,
      impl: () => ({ ...REAL, sources: withSource("bar", "parseBulkTag(param.tag, param.action)", 'parseBulkTag(param.tag, "tag")') }),
    },
    {
      name: "R28 · vb5 M1 · the rule reads an untag through the WRITE rule — both actions ask parseOneTag",
      expect: L.s11,
      impl: () => ({ ...REAL, sources: withSource("rules", 'action === "untag" ? parseFilterTag(text) : parseOneTag(text)', "parseOneTag(text)") }),
    },

    /* ── vb7 · validation batch 7, each on its own assertion ── */
    {
      name: "R29 · vb7 · the set-based write over the FILTER again — a Remove deletes the contact that joined after the recount, beyond the count typed",
      expect: L.b20,
      impl: () => ({
        ...REAL,
        run: async (req, officerId, reads, deps = TEST_DEPS) => {
          if (req.action !== "remove" || isTicksOnly(req.audience)) return runContactBulk(req, officerId, reads, deps);
          const count = await deps.count(req.audience);
          if (req.typed !== String(count)) return { ok: false, reason: req.typed === null ? "confirm_required" : "confirm_mismatch", error: "moved", expected: count };
          const done = await contactAudienceWrites(req.audience).remove();
          return { ok: true, action: req.action, matched: done.matched, changed: done.changed, unchanged: done.unchanged, full: done.full, listName: null, tag: null };
        },
      }),
    },
    {
      name: "R30 · vb7 · no list and no name read as a new list named nothing — the officer is told to type a name nobody asked for",
      expect: L.b21,
      impl: () => ({
        ...REAL,
        parse: ((x: unknown) => {
          const r = parseBulkRequest(x);
          return r.ok && r.req.action === "addToList" && r.req.list === null ? { ok: true, req: { ...r.req, list: { kind: "new", name: "" } } } : r;
        }) as typeof parseBulkRequest,
      }),
    },
    {
      name: "R31 · vb7 · the picker pre-chooses the newest list again — Continue adds to whatever list was made last",
      expect: L.s12,
      impl: () => ({ ...REAL, sources: withSource("bar", 'listChoice: "", newName: "", error: null, note: null', 'listChoice: lists[0]?.id ?? NEW_LIST, newName: "", error: null, note: null') }),
    },
    {
      name: "R32 · vb7 · unticking one row of “all matching” falls to a page's worth in silence again",
      expect: L.s13,
      impl: () => ({ ...REAL, sources: withSource("provider", "setNote(CONTACTS_BULK.matchingNarrowed);", "setNote(null);") }),
    },
    {
      name: "R33 · vb7 · the run's outcome forgets its tag — every tag toast reads a bare “Tagged”",
      expect: L.s14,
      impl: () => ({ ...REAL, run: async (req, officerId, reads, deps) => { const r = await runContactBulk(req, officerId, reads, deps); return r.ok ? { ...r, tag: null } : r; } }),
    },
    /* ── the vb7 review's fixes (2026-10-03), each on its own assertion ── */
    {
      name: "R34 · vb7 review m8 · the bound write drops the filter and keeps only the ids — a row that stopped matching after the walk is removed with the rest",
      expect: L.b20,
      impl: () => ({ ...REAL, deps: { ...TEST_DEPS, writes: (f) => contactAudienceWrites({ ...WHOLE_BOOK, ids: f.ids }) } }),
    },
    {
      name: "R35 · vb7 review m1 · the Remove chunked again — one store call per chunk, so a fault part-way leaves the first chunks removed",
      expect: L.b22,
      impl: () => ({
        ...REAL,
        run: async (req, officerId, reads, deps = TEST_DEPS) => {
          if (req.action !== "remove" || isTicksOnly(req.audience)) return runContactBulk(req, officerId, reads, deps);
          const count = await deps.count(req.audience);
          if (req.typed !== String(count)) return { ok: false, reason: req.typed === null ? "confirm_required" : "confirm_mismatch", error: "moved", expected: count };
          const ids = await deps.walkIds(req.audience);
          const done = { matched: 0, changed: 0, unchanged: 0, full: 0 };
          for (const id of ids) {
            const part = await deps.writes({ ...req.audience, ids: [id] }).remove();
            done.matched += part.matched;
            done.changed += part.changed;
          }
          return { ok: true, action: req.action, matched: done.matched, changed: done.changed, unchanged: 0, full: 0, listName: null, tag: null };
        },
      }),
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    let restore: (() => void) | null = null;
    try {
      restore = c.setup ? c.setup() : null;
      await runAssertions(c.impl(), tag);
    } catch (err) {
      problems.push(`case ${i + 1} (${c.name}): the plant could not be planted — ${(err as Error)?.message ?? String(err)}`);
      continue;
    } finally {
      if (restore !== null) restore();
    }
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
