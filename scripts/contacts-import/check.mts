/**
 * test:contacts-import · section "check" — S15 C3: the import's check (`src/lib/server/contacts/import-check.ts`): the
 * five boxes, the three choices' labels, the changes pages and the facts loader.             (S15, 2026-10-09)
 *
 * ⭐ EXECUTED, NOT READ. Every assertion runs the REAL check over files staged through the REAL staging service on the
 * memory twin (`scripts/lib/contacts-import-world.mts`): the 40-row file whose every box holds a row and whose counts
 * are LITERALS here, the deterministic 5,000-row file whose counts are built into it, and the 30-row file whose every
 * row is a change. The per-choice labels and the changes pages are a READER's (identity.contact read — a COMPLIANCE
 * officer); a GROWTH officer is KEEP-only (S15-10, the review round of 2026-10-09), and C13 holds that a one-row file
 * answers them byte for byte the same whether its number is plain, stopped or erased (a tombstone, or — C8a — an erasure
 * with no book row). C14 (C8a, S15-15) holds the check to the ONE rule of a standing erasure: a later opt-out never lifts
 * it, a GIVEN does, and an opted-out person erased through the real step is kept. Each assertion is proven by a red
 * plant below — a defect built in memory as a replacement bundle.
 *
 * ⛔ IN-PROCESS. Every plant swaps one dependency of the check (`ImportCheckDeps`); this module reads no file and makes
 * no file-changing call. Each run starts from emptied staging, book, ledger, stop-list and user maps, put back after.
 */
import type { ImportSection, RedPlant, SectionContext } from "../contacts-import.test.mts";
import type { ImportCheckDeps, ImportFactsReads } from "../../src/lib/server/contacts/import-check.ts";
import type { ImportChoice, ShownTally } from "../../src/lib/contacts/import-decide.ts";
import type { ChangesResult, PreflightResult, PreflightView } from "../../src/lib/contacts/import-flow.ts";
import {
  ADMIN, FIVE_THOUSAND_CHANGING_LINES, FIVE_THOUSAND_COUNTS, NOW, N, B, OFFICER, OTHER, READER, TEST_REFUSAL_AUDIT, UNREADABLE_SENTENCE,
  UNREADABLE_SENTENCE_2, bookRow, captureAudit, captured, checkModule, db, fiveThousandRows, fortyRows, holdsDigitRun, inFreshStore, isMasked,
  keyOf, mem, seedAccount, seedBook, seedFiveThousandBook, seedFortyWorld, seedStop, seedThirtyBook, seedWord, stageFile, thirtyRows, truthCounts,
} from "../lib/contacts-import-world.mts";
import type { StageRow } from "../lib/contacts-import-world.mts";
import { SAMPLE_ROW_SENTENCE } from "../../src/lib/contacts/sample-sheet.ts";
import { parseTzNumber } from "../../src/lib/tz-msisdn.ts";
import { ERASURE_EVIDENCE } from "../../src/lib/marketing/erasure-mark.ts";

const { IMPORT_CHECK_DEPS, IMPORT_FACTS_READS, checkContactImport, contactImportChanges, loadImportFacts } = checkModule;
// C8a · C14's opted-out person is erased through the REAL step (after the world module set the memory twin up).
const { eraseMarketingFor } = await import("../../src/lib/server/marketing/erase.ts");

/** C8a · one ledger row at an instant of its own — the order a history is read in is the point of C12 and C14. A row
 *  whose evidence is a token reference is the opt-out page's (a Stop or a Resume tap); any other, an officer's. */
async function wordAt(msisdn: string, id: string, status: "GIVEN" | "WITHDRAWN", evidence: string | null, createdAt: string): Promise<void> {
  await db.messagingConsent.create({
    id, channel: "SMS", identifier: msisdn, category: "MARKETING", status,
    source: evidence !== null && evidence.startsWith("optout:") ? "OPT_OUT_PAGE" : "OPERATOR",
    wording: "fixture wording", locale: "EN", evidence, recordedBy: null, createdAt,
  });
}
const MARK = ERASURE_EVIDENCE;
const TAP = "optout:ab**";

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════════════════════ */

export type CheckImpl = {
  /** The check's dependencies — the shipped ones, with the suite's audit capture and fixed clock. */
  readonly deps: ImportCheckDeps;
  /** The facts loader's reads (C12 asks the loader directly). */
  readonly reads: ImportFactsReads;
};

const REAL_DEPS: ImportCheckDeps = { ...IMPORT_CHECK_DEPS, audit: captureAudit, refusalAudit: TEST_REFUSAL_AUDIT, now: () => NOW };
function real(): CheckImpl {
  return { deps: REAL_DEPS, reads: IMPORT_FACTS_READS };
}
const withDeps = (patch: Partial<ImportCheckDeps>): CheckImpl => ({ ...real(), deps: { ...REAL_DEPS, ...patch } });

/* ══ THE LITERALS — the 40-row file, decided by hand ═════════════════════════════════════════════════════════════ */

const FORTY_COUNTS = { new: 22, inBook: 6, repeated: 3, invalid: 7, unreadable: 2 } as const;
/** A tally from its numbers: keepBy in `SHOWN_KEEP_REASONS` order — chosen_keep, suppressed, account, same_run, no_change. */
const tally = (create: number, update: number, keep: number, overwrites: number, kb: [number, number, number, number, number]): ShownTally => ({
  create, update, keep, overwrites, keepBy: { chosen_keep: kb[0], suppressed: kb[1], account: kb[2], same_run: kb[3], no_change: kb[4] },
});
/** A READER's labels. KEEP: B1 B2 B4 B6 chosen_keep (B4 is erased and reads as the ordinary contact — X22), B3 suppressed,
 *  B5 linked to an account (S15-11), 3 repeats. TAKE_FILE: B1 (name and email replaced — one overwrite) and B2 (an email
 *  where none was) update; B4 and B6 have nothing to change. FILL_BLANKS: B2 updates; B1, B4 and B6 have nothing to fill. */
const FORTY_BY_CHOICE: Record<ImportChoice, ShownTally> = {
  KEEP: tally(22, 0, 9, 0, [4, 1, 1, 3, 0]),
  TAKE_FILE: tally(22, 2, 7, 1, [0, 1, 1, 3, 2]),
  FILL_BLANKS: tally(22, 1, 8, 0, [0, 1, 1, 3, 3]),
};
const FORTY_CHANGING: Record<ImportChoice, number> = { KEEP: 0, TAKE_FILE: 2, FILL_BLANKS: 1 };
/** S15-10 · a GROWTH officer's label for the same file: KEEP's, under all three choices, every keep one count. */
const FORTY_KEEP_ONLY = tally(22, 0, 9, 0, [9, 0, 0, 0, 0]);
const FORTY_INVALID_LINES = [5, 11, 14, 18, 21, 25, 39];
const FORTY_REPEATS = [{ line: 8, firstLine: 2 }, { line: 17, firstLine: 3 }, { line: 28, firstLine: 16 }];
const CHOICES = ["KEEP", "TAKE_FILE", "FILL_BLANKS"] as const;

/* ══ THE LABELS — one place, so a plant names exactly the line it must turn red ═══════════════════════════════════ */

export const L = {
  C1: "C1 · ⭐ the 40-row file: the five boxes hold their LITERAL counts (22 new · 6 in the book · 3 repeated · 7 invalid · 2 unreadable), at least one row in every box (the fixture's control), and they add up to the 40 rows staged",
  C2: "C2 · the deterministic 5,000-row file, walked a 2,000-row page at a time: the five boxes equal the counts built into it (3,000 · 250 · 750 · 500 · 500) and add up to 5,000",
  C3: "C3 · ⛔ OD33 · the first row wins ACROSS staged pages — the 40-row file walked 7 rows a page names repeats 8←2, 17←3 and 28←16, and line 40 is NEW because its number's first row (39) is invalid and never claims it; the 5,000-row file's 750 repeats are found whatever page their first row sits on",
  C4: "C4 · M2 · the sample sheet's example number is INVALID with the sample sentence, and every invalid row carries its own sentence (a field problem's, the number's, the sample's) — the bad email, too short, the landline, the Kenyan number, no number, a name holding a phone number — and each unreadable row its read error",
  C5: "C5 · ⛔ D19 / X22 · no answer — the check, every changes page, the run's view — carries a contact id, the word player, an erasure, a consent fact or an account flag",
  C6: "C6 · ⛔ every number leaves masked — each repeated row reads +255••••NN — and no answer holds a run of seven digits",
  C7: "C7 · ⭐ the changes pages (a reader's): in-book rows that a choice would change, in FILE order, at most 50 a page, COMPLETE — the 40-row file's 3 and 6; the 5,000-row file's 125 over three pages; the 30-row file walked four rows a request, every row once — and nextAfterLine null only at the end",
  C8: "C8 · ⛔ the check WRITES NOTHING: the run, the book, the ledger and the stop list are as they were, and its ONE audit row is contacts.import.checked with counts only (rows, the five boxes, ms) — no number",
  C9: "C9 · refusals: a run still STAGING is not_staged with its view; another officer's run is not_yours and shown NOTHING; an unknown id is not_found — each with ONE check_refused audit row and nothing written; an ADMIN may check any run (X18)",
  C10: "C10 · a check past its deadline answers too_slow and writes nothing — never a partial view",
  C11: "C11 · ⭐ a READER's labels are decide()'s own: byChoice equals the literal tallies for KEEP, TAKE_FILE and FILL_BLANKS (repeats kept same_run, the erased row as the contact it reads as, the linked row as account — S15-11), changing[choice] is the in-book updates under each, and mayUpdateInBook is true",
  C12: "C12 · ⭐ the facts are the authority's, per number: the erased tombstone IS in the book (X22), each book row carries its account link (S15-11), an active stop is suppressed and a lifted one is not, the ledger's latest word is read, whether an erasure STANDS is read by the ONE rule (C8a: the marker under an opt-out tap stands, the marker under a GIVEN and a plain WITHDRAWN do not), NO account is read — heldByPlayer false for every number (R16) — an unknown number has no book row; and a set past one chunk (2,507 numbers) is answered whole in two chunks of FOUR reads",
  C13: "C13 · ⛔ S15-10 · a GROWTH officer (identity.contact masked) is KEEP-only and told nothing per person: a one-row file whose number is plain, stopped, erased or (C8a) erased with NO book row — the marker under an opt-out tap — answers the check and the changes request BYTE FOR BYTE the same — mayUpdateInBook false, KEEP's label under all three choices with every keep one count, nothing changing, the changes refused update_needs_reader with ONE audit row holding only the reason — and the 40-row file reads KEEP's label (22 · 0 · 9, every keep one count) under every choice; CONTROL: a reader's answers for the plain and the stopped number differ",
  C14: "C14 · ⛔ C8a · an erasure with NO book row, as the check reads it: the marker alone, the marker under an opt-out tap on an old link (defect #2) and an account that OPTED OUT and was then erased through the real step (N2) are each 'already in the book' and kept under every choice — shown as the contact it is disguised as (X22: chosen_keep under KEEP, no_change otherwise, no change listed) — while the marker under a GIVEN and a plain new number are NEW; the facts loader says so number by number, and nothing is written",
  C15: "C15 · ⭐ C8c · N4 · the check YIELDS TO BETS between its pages: the 5,000-row file walked 2,000 a page, a bet queued after the first page — the walk reads NO page while it waits, waits by its own clock, and once the bet has gone counts exactly C2's boxes; a bet that never leaves ends the check too_slow at its OWN deadline (never a second clock), one page read, nothing written but its refusal row",
  C16: "C16 · ⭐ C8c · #13 · tags a full contact cannot take are LISTED for a reader: a contact holding 20 tags whose only difference is two new tags (TAKE_FILE: nothing to change, two tags not added) is on the changes pages beside a full contact that changes its name (an update, its tag not added) — each preview naming its tags left out — and the check's listed is 2 (changing stays 1); a GROWTH officer is listed nothing and refused the pages (S15-10)",
} as const;

/* ══ THE RUN ══════════════════════════════════════════════════════════════════════════════════════════════════ */

type Ctx = SectionContext<CheckImpl>;
const json = (v: unknown): string => JSON.stringify(v);
const preflightOf = (r: PreflightResult): PreflightView | null => (r.ok ? r.preflight : null);
const sameTally = (a: ShownTally, b: ShownTally): boolean =>
  a.create === b.create && a.update === b.update && a.keep === b.keep && a.overwrites === b.overwrites
  && Object.keys(b.keepBy).length === Object.keys(a.keepBy).length
  && Object.keys(b.keepBy).every((k) => a.keepBy[k as keyof ShownTally["keepBy"]] === b.keepBy[k as keyof ShownTally["keepBy"]]);
const countsEqual = (p: PreflightView | null, want: Readonly<Record<string, number>>): boolean =>
  p !== null && Object.entries(want).every(([k, n]) => p.counts[k as keyof PreflightView["counts"]] === n);

/** Every changes page from the top, until nextAfterLine is null (a safety stop at 500 requests). */
async function allChanges(runId: string, deps: ImportCheckDeps, who: string): Promise<{ pages: ChangesResult[]; lines: number[]; ok: boolean }> {
  const pages: ChangesResult[] = [];
  const lines: number[] = [];
  let after = 0;
  for (let i = 0; i < 500; i++) {
    const r = await contactImportChanges(who, { runId, afterLine: after }, deps);
    pages.push(r);
    if (!r.ok) return { pages, lines, ok: false };
    for (const row of r.page.rows) lines.push(row.line);
    if (r.page.nextAfterLine === null) return { pages, lines, ok: r.page.rows.length <= 50 && pages.every((p) => !p.ok || p.page.rows.length <= 50) };
    after = r.page.nextAfterLine;
  }
  return { pages, lines, ok: false };
}

const ascending = (xs: readonly number[]): boolean => xs.every((x, i) => i === 0 || xs[i - 1] < x);
const sameList = (a: readonly number[], b: readonly number[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
const FORBIDDEN_WORDS = /player|erase|erasure|consent|heldBy|ledger|contactId/i;

async function run({ impl, ok, log }: Ctx): Promise<void> {
  /** C7's three cases, gathered across the three files and asserted once. */
  let fortyChanges = "";
  let fortyChangesOk = false;
  // ── the 40-row file, by a READER: C1, C4, C5, C6, C8, C11 (and C7's first case) ──
  await inFreshStore(async () => {
    await seedFortyWorld();
    const runId = await stageFile(READER, fortyRows());
    const before = { run: json(await db.contactImport.find(runId)), book: json([...mem().marketingContacts.entries()]), truth: truthCounts() };
    captured.length = 0;
    const r = await checkContactImport(READER, runId, impl.deps);
    const p = preflightOf(r);
    log(`40-row file: ${p ? json(p.counts) : `refused ${r.ok ? "" : r.reason}`}`);
    const everyBox = p !== null && Object.values(p.counts).every((n) => n >= 1);
    ok(L.C1, countsEqual(p, FORTY_COUNTS) && everyBox && p !== null && p.rows === 40,
      p ? `${json(p.counts)} · rows ${p.rows}` : `refused: ${r.ok ? "" : r.reason}`);

    const invalidRows = p?.invalid.rows ?? [];
    const sentenceAt = (line: number): string => invalidRows.find((x) => x.line === line)?.sentence ?? "(none)";
    const expectedInvalid: Array<[number, string]> = [
      [5, "The Email cell doesn't look like an email address (name@example.com)."],
      [11, parseTzNumber("12345").reason],
      [14, SAMPLE_ROW_SENTENCE],
      [18, parseTzNumber("022 211 0000").reason],
      [21, parseTzNumber("+254 712 345 678").reason],
      [25, parseTzNumber("").reason],
    ];
    const invalidRight = p !== null && sameList(invalidRows.map((x) => x.line), FORTY_INVALID_LINES)
      && expectedInvalid.every(([line, s]) => sentenceAt(line) === s) && sentenceAt(39).includes("phone number")
      && json(p.unreadable.rows) === json([{ line: 9, sentence: UNREADABLE_SENTENCE }, { line: 23, sentence: UNREADABLE_SENTENCE_2 }]);
    ok(L.C4, invalidRight, p ? `invalid ${json(invalidRows.map((x) => x.line))} · 14: "${sentenceAt(14)}"` : "refused");

    const changes = await allChanges(runId, impl.deps, READER);
    const answers = json([r, changes.pages]);
    const ids = ["mc_w_b1", "mc_w_b2", "mc_w_b3", "mc_w_b4", "mc_w_b5", "mc_w_b6", "usr_w_player"];
    const leaked = ids.filter((id) => answers.includes(id));
    ok(L.C5, r.ok && changes.ok && leaked.length === 0 && !FORBIDDEN_WORDS.test(answers) && !answers.includes(ERASURE_EVIDENCE),
      `leaked ids [${leaked}] · forbidden word ${FORBIDDEN_WORDS.exec(answers)?.[0] ?? "none"}`);

    const repeats = p?.repeated.rows ?? [];
    ok(L.C6, p !== null && json(repeats.map((x) => ({ line: x.line, firstLine: x.firstLine }))) === json(FORTY_REPEATS)
      && repeats.every((x) => isMasked(x.masked)) && !holdsDigitRun(answers),
      `repeats ${json(repeats)} · digit run ${holdsDigitRun(answers)}`);

    ok(L.C11, p !== null && p.mayUpdateInBook === true && CHOICES.every((ch) => sameTally(p.byChoice[ch], FORTY_BY_CHOICE[ch]))
      && json(p.changing) === json(FORTY_CHANGING),
      p ? `mayUpdateInBook ${p.mayUpdateInBook} · byChoice ${json(p.byChoice)} · changing ${json(p.changing)}` : "refused");

    const after = { run: json(await db.contactImport.find(runId)), book: json([...mem().marketingContacts.entries()]), truth: truthCounts() };
    const checkedRows = captured.filter((a) => a.action === "contacts.import.checked");
    const payload = (checkedRows[0]?.payload ?? {}) as Record<string, unknown>;
    const keys = Object.keys(payload).sort().join(",");
    ok(L.C8, before.run === after.run && before.book === after.book && json(before.truth) === json(after.truth)
      && checkedRows.length === 1 && keys === "inBook,invalid,ms,new,repeated,rows,unreadable" && !holdsDigitRun(json(payload))
      && captured.every((a) => String(a.action).startsWith("contacts.import.")),
      `audit [${captured.map((a) => a.action)}] · payload keys ${keys}`);

    // C7's first case: the 40-row file's changes are its rows 3 and 6, on one page.
    fortyChanges = json(changes.lines);
    fortyChangesOk = changes.ok && sameList(changes.lines, [3, 6]) && changes.pages.length === 1;
  });

  // ── C3 · the 40-row file walked SEVEN rows a page ──
  let c3Forty = false;
  let c3Detail = "";
  await inFreshStore(async () => {
    await seedFortyWorld();
    const runId = await stageFile(OFFICER, fortyRows());
    const p = preflightOf(await checkContactImport(OFFICER, runId, { ...impl.deps, windowRows: 7 }));
    c3Forty = p !== null && json(p.repeated.rows.map((x) => ({ line: x.line, firstLine: x.firstLine }))) === json(FORTY_REPEATS)
      && countsEqual(p, FORTY_COUNTS);
    c3Detail = p ? `7-row pages: ${json(p.counts)} · repeats ${json(p.repeated.rows.map((x) => [x.line, x.firstLine]))}` : "refused";
  });

  // ── the 5,000-row file, by a READER: C2, C3's second half, C7's second case, C10 ──
  let bigChanges: { pages: ChangesResult[]; lines: number[]; ok: boolean } = { pages: [], lines: [], ok: false };
  await inFreshStore(async () => {
    await seedFiveThousandBook();
    const runId = await stageFile(READER, fiveThousandRows());
    const r = await checkContactImport(READER, runId, impl.deps);
    const p = preflightOf(r);
    log(`5,000-row file: ${p ? json(p.counts) : `refused ${r.ok ? "" : r.reason}`}`);
    ok(L.C2, countsEqual(p, FIVE_THOUSAND_COUNTS) && p !== null && p.rows === 5000, p ? `${json(p.counts)} · rows ${p.rows}` : "refused");
    const c3Big = p !== null && p.repeated.total === FIVE_THOUSAND_COUNTS.repeated && p.counts.new === FIVE_THOUSAND_COUNTS.new;
    ok(L.C3, c3Forty && c3Big, `${c3Detail} · 5,000: repeated ${p?.repeated.total ?? "?"}, new ${p?.counts.new ?? "?"}`);

    bigChanges = await allChanges(runId, impl.deps, READER);

    let tick = NOW.getTime();
    const slow = await checkContactImport(READER, runId, { ...impl.deps, windowRows: 100, now: () => new Date((tick += 30_000)) });
    ok(L.C10, !slow.ok && slow.reason === "too_slow" && slow.view !== null, slow.ok ? "answered a full view" : `refused ${slow.reason}`);
  });

  // ── the 30-row file, walked FOUR rows a request — then C7 over all three files ──
  const thirty = await inFreshStore(async () => {
    await seedThirtyBook();
    const id = await stageFile(READER, thirtyRows());
    return allChanges(id, { ...impl.deps, windowRows: 4, changesWalkRows: 4 }, READER);
  });
  const thirtyLines = Array.from({ length: 30 }, (_, i) => i + 2);
  ok(L.C7, fortyChangesOk && bigChanges.ok && sameList(bigChanges.lines, FIVE_THOUSAND_CHANGING_LINES) && bigChanges.pages.length === 3
    && ascending(bigChanges.lines) && thirty.ok && sameList(thirty.lines, thirtyLines),
    `40-row ${fortyChanges} · 5,000: ${bigChanges.lines.length} rows over ${bigChanges.pages.length} page(s) · 30-row: ${json(thirty.lines)}`);

  // ── C9 · the refusals ──
  await inFreshStore(async () => {
    await seedFortyWorld();
    const stagingId = await stageFile(OFFICER, fortyRows(), true);
    captured.length = 0;
    const staging = await checkContactImport(OFFICER, stagingId, impl.deps);
    const notYours = await checkContactImport(OTHER, stagingId, impl.deps);
    const missing = await checkContactImport(OFFICER, "ci_aaaaaaaaaaaaaaaaaaaa", impl.deps);
    const refusedRows = captured.filter((a) => a.action === "contacts.import.check_refused").length;
    const asAdmin = await checkContactImport(ADMIN, stagingId, impl.deps);
    ok(L.C9, !staging.ok && staging.reason === "not_staged" && staging.view !== null
      && !notYours.ok && notYours.reason === "not_yours" && notYours.view === null
      && !missing.ok && missing.reason === "not_found" && refusedRows === 3
      && !asAdmin.ok && asAdmin.reason === "not_staged",
      `${[staging, notYours, missing, asAdmin].map((x) => (x.ok ? "ok" : x.reason)).join(" · ")} · refusal rows ${refusedRows}`);
  });

  // ── C12 · the facts loader ──
  await inFreshStore(async () => {
    await seedFortyWorld();
    await seedStop(keyOf(N(9)), "sup_c12_lift", true);
    await seedWord(keyOf(N(8)), "led_c12_n8", "WITHDRAWN");
    // C8a · two numbers with no book row: the marker under an opt-out tap (it stands), the marker under a GIVEN (lifted).
    await wordAt(keyOf(N(60)), "led_c12_n60a", "WITHDRAWN", MARK, "2026-09-05T08:00:00.000Z");
    await wordAt(keyOf(N(60)), "led_c12_n60b", "WITHDRAWN", TAP, "2026-09-06T08:00:00.000Z");
    await wordAt(keyOf(N(61)), "led_c12_n61a", "WITHDRAWN", MARK, "2026-09-05T08:00:00.000Z");
    await wordAt(keyOf(N(61)), "led_c12_n61b", "GIVEN", TAP, "2026-09-06T08:00:00.000Z");
    const extra = Array.from({ length: 2500 }, (_, i) => `2557555${String(i).padStart(5, "0")}`);
    const calls: Record<string, number> = { snapshots: 0, activeStops: 0, latestWords: 0, erasureStands: 0 };
    const counting: ImportFactsReads = {
      snapshots: async (m) => { calls.snapshots++; return impl.reads.snapshots(m); },
      activeStops: async (m) => { calls.activeStops++; return impl.reads.activeStops(m); },
      latestWords: async (m) => { calls.latestWords++; return impl.reads.latestWords(m); },
      erasureStands: async (m) => { calls.erasureStands++; return impl.reads.erasureStands(m); },
    };
    const asked = [keyOf(B(4)), keyOf(B(3)), keyOf(N(9)), keyOf(N(8)), keyOf(B(5)), keyOf(B(1)), keyOf(N(50)), keyOf(N(60)), keyOf(N(61)), ...extra];
    const facts = await loadImportFacts(asked, counting);
    const f = (local: string) => facts.get(keyOf(local));
    const erased = f(B(4));
    const standing = {
      tombstone: f(B(4))?.erasureStands, tapOverMarker: f(N(60))?.erasureStands, givenOverMarker: f(N(61))?.erasureStands,
      plainWithdrawn: f(N(8))?.erasureStands, unknown: f(N(50))?.erasureStands,
    };
    ok(L.C12, erased?.book?.sourceRef === ERASURE_EVIDENCE && erased.book.id === "mc_w_b4"
      && f(B(3))?.suppressed === true && f(N(9))?.suppressed === false
      && f(N(8))?.ledgerLatest?.status === "WITHDRAWN" && f(B(5))?.book?.id === "mc_w_b5" && f(B(5))?.book?.userId === "usr_w_player"
      && f(B(1))?.book?.userId === null && [...facts.values()].every((x) => x.heldByPlayer === false)
      && f(N(50))?.book === null && f(N(50))?.ledgerLatest === null
      && json(standing) === json({ tombstone: true, tapOverMarker: true, givenOverMarker: false, plainWithdrawn: false, unknown: false })
      && f(N(60))?.book === null && f(N(60))?.ledgerLatest?.evidence === TAP
      && facts.size === 2509 && extra.every((m) => facts.get(m)?.book === null && facts.get(m)?.erasureStands === false)
      && json(calls) === json({ snapshots: 2, activeStops: 2, latestWords: 2, erasureStands: 2 })
      && Object.keys(impl.reads).sort().join(",") === "activeStops,erasureStands,latestWords,snapshots",
      `erased ${json(erased?.book?.sourceRef ?? null)} · stopped ${f(B(3))?.suppressed} · lifted ${f(N(9))?.suppressed} · word ${f(N(8))?.ledgerLatest?.status ?? "none"} · B5 link ${f(B(5))?.book?.userId ?? "none"} · erasure standing ${json(standing)} · reads ${json(calls)} · answered ${facts.size}`);
  });

  // ── C14 · C8a · an erasure with NO book row, read by the check from the ONE rule ──
  {
    const E1 = "0757500001"; // the marker alone
    const E2 = "0757500002"; // the marker, then an opt-out tap on an old /s/ link (defect #2)
    const E3 = "0757500003"; // an account that OPTED OUT, then was erased through the real step (N2)
    const L1 = "0757500004"; // the marker, then a GIVEN — the number's next holder said yes
    const P1 = "0757500005"; // a plain new number
    const NUMBERS = [E1, E2, E3, L1, P1];
    const file: StageRow[] = NUMBERS.map((n, i) => ({ line: i + 2, cells: [n, `Person ${i + 1}`, `person${i + 1}@example.com`, "", ""] }));
    const seen = await inFreshStore(async () => {
      await wordAt(keyOf(E1), "led_c14_e1", "WITHDRAWN", MARK, "2026-09-05T08:00:00.000Z");
      await wordAt(keyOf(E2), "led_c14_e2a", "WITHDRAWN", MARK, "2026-09-05T08:00:00.000Z");
      await wordAt(keyOf(E2), "led_c14_e2b", "WITHDRAWN", TAP, "2026-09-06T08:00:00.000Z");
      const optedOut = await seedAccount(E3, "usr_c14_e3", "Opted Out");
      await wordAt(keyOf(E3), "led_c14_e3", "WITHDRAWN", TAP, "2026-09-04T08:00:00.000Z");
      const erasure = await eraseMarketingFor({ userId: optedOut.id, phoneE164: optedOut.phoneE164, officerId: null });
      await wordAt(keyOf(L1), "led_c14_l1a", "WITHDRAWN", MARK, "2026-09-05T08:00:00.000Z");
      await wordAt(keyOf(L1), "led_c14_l1b", "GIVEN", TAP, "2026-09-06T08:00:00.000Z");
      const runId = await stageFile(READER, file);
      const truth = truthCounts();
      const r = await checkContactImport(READER, runId, impl.deps);
      const changes = await allChanges(runId, impl.deps, READER);
      const facts = await loadImportFacts(NUMBERS.map(keyOf), impl.reads);
      return {
        p: preflightOf(r), changes, marked: erasure.marketingConsentWithdrawn, book: mem().marketingContacts.size,
        truthKept: json(truthCounts()) === json(truth), stands: NUMBERS.map((n) => facts.get(keyOf(n))?.erasureStands ?? null),
      };
    });
    const p = seen.p;
    ok(L.C14, p !== null && countsEqual(p, { new: 2, inBook: 3, repeated: 0, invalid: 0, unreadable: 0 }) && p.rows === 5
      && sameTally(p.byChoice.KEEP, tally(2, 0, 3, 0, [3, 0, 0, 0, 0])) && sameTally(p.byChoice.TAKE_FILE, tally(2, 0, 3, 0, [0, 0, 0, 0, 3]))
      && sameTally(p.byChoice.FILL_BLANKS, tally(2, 0, 3, 0, [0, 0, 0, 0, 3])) && json(p.changing) === json({ KEEP: 0, TAKE_FILE: 0, FILL_BLANKS: 0 })
      && seen.changes.ok && seen.changes.lines.length === 0 && seen.marked === 1 && seen.book === 0 && seen.truthKept
      && json(seen.stands) === json([true, true, true, false, false]),
      p ? `${json(p.counts)} · KEEP ${json(p.byChoice.KEEP)} · TAKE_FILE ${json(p.byChoice.TAKE_FILE)} · changes ${json(seen.changes.lines)} · the opted-out account's erasure wrote ${seen.marked} marker(s) · standing ${json(seen.stands)} · book ${seen.book}` : "refused");
  }

  // ── C15 · C8c · N4 · the check yields to a bet queued between its pages ──
  await inFreshStore(async () => {
    await seedFiveThousandBook();
    const runId = await stageFile(READER, fiveThousandRows());
    const admission = (globalThis as { __50PICK_ADMISSION?: { queue: unknown[] } }).__50PICK_ADMISSION;
    /** One walk of the check with a bet queued right after its first page read; `leaveAfter` waits later it is admitted
     *  (Infinity: never — a safety stop at 2,000 waits lets a defective walk end instead of hanging the run). */
    const walk = async (leaveAfter: number) => {
      const clock = { ms: NOW.getTime() };
      const waiter = { resolve: () => undefined, timer: null, enqueuedAt: NOW.getTime(), settled: false };
      const queued = (): boolean => (admission?.queue.indexOf(waiter) ?? -1) >= 0;
      const leave = (): void => {
        const i = admission?.queue.indexOf(waiter) ?? -1;
        if (admission && i >= 0) admission.queue.splice(i, 1);
      };
      let pages = 0;
      let readsWhileQueued = 0;
      let waits = 0;
      const deps: ImportCheckDeps = {
        ...impl.deps,
        now: () => new Date(clock.ms),
        rowsAfter: async (w) => {
          if (w.limit > 1) {
            if (queued()) readsWhileQueued++;
            pages++;
            if (pages === 1) admission?.queue.push(waiter);
          }
          return impl.deps.rowsAfter(w);
        },
        pause: async (ms) => {
          waits++;
          clock.ms += ms;
          if (waits >= leaveAfter || waits >= 2000) leave();
        },
      };
      captured.length = 0;
      let r: PreflightResult | null = null;
      try {
        r = await checkContactImport(READER, runId, deps);
      } finally {
        leave();
      }
      return { r, pages, readsWhileQueued, waits, refused: captured.filter((a) => a.action === "contacts.import.check_refused").length };
    };
    const admitted = await walk(6);
    const never = await walk(Number.POSITIVE_INFINITY);
    const p = admitted.r !== null ? preflightOf(admitted.r) : null;
    // The deadline is the check's own: 75 s of waits at the walk's own pace, nothing more.
    const budget = Math.ceil(REAL_DEPS.deadlineMs / REAL_DEPS.betWaitMs);
    ok(L.C15, admitted.readsWhileQueued === 0 && admitted.waits >= 6 && countsEqual(p, FIVE_THOUSAND_COUNTS) && p !== null && p.rows === 5000
      && never.r !== null && !never.r.ok && never.r.reason === "too_slow" && never.r.view !== null && never.pages === 1 && never.readsWhileQueued === 0
      && never.waits > 0 && never.waits <= budget + 1 && never.refused === 1 && (await db.contactImport.find(runId))?.status === "STAGED",
      `admitted: waits ${admitted.waits}, pages read while queued ${admitted.readsWhileQueued}, ${p ? json(p.counts) : "refused"} · never: ${never.r === null ? "no answer" : never.r.ok ? "a FULL view" : never.r.reason} after ${never.waits} waits (budget ${budget}), pages ${never.pages}, refusal rows ${never.refused}`);
  });

  // ── C16 · C8c · #13 · a full contact's tags left out are listed for a reader ──
  {
    const FULL = Array.from({ length: 20 }, (_, i) => `t${String(i + 1).padStart(2, "0")}`);
    const file: StageRow[] = [
      { line: 2, cells: ["0757600001", "Full One", "", "new one, new two", ""] },
      { line: 3, cells: ["0757600002", "Full Two Renamed", "", "vip", ""] },
      { line: 4, cells: [N(1), "Fresh", "", "", ""] },
    ];
    const seen = (who: string) => inFreshStore(async () => {
      await seedBook(bookRow("mc_full_1", "0757600001", { displayName: "Full One", tags: FULL }));
      await seedBook(bookRow("mc_full_2", "0757600002", { displayName: "Full Two", tags: FULL }));
      const runId = await stageFile(who, file);
      const p = preflightOf(await checkContactImport(who, runId, impl.deps));
      const changes = await allChanges(runId, impl.deps, who);
      const rows = changes.pages.flatMap((r) => (r.ok ? r.page.rows : []));
      return { p, changes, rows };
    });
    const reader = await seen(READER);
    const growth = await seen(OFFICER);
    const at = (line: number) => reader.rows.find((r) => r.line === line);
    const onlyTags = at(2)?.preview.byChoice.TAKE_FILE;
    const renamed = at(3)?.preview.byChoice.TAKE_FILE;
    ok(L.C16, reader.p !== null && reader.p.listed === 2 && reader.p.changing.TAKE_FILE === 1 && reader.changes.ok
      && sameList(reader.changes.lines, [2, 3])
      && onlyTags?.kind === "keep" && onlyTags.reason === "no_change" && json(onlyTags.tagsNotAdded) === json(["new one", "new two"])
      && renamed?.kind === "update" && json(renamed.tagsNotAdded) === json(["vip"])
      && growth.p !== null && growth.p.listed === 0 && growth.p.mayUpdateInBook === false
      && growth.changes.pages.length === 1 && !growth.changes.pages[0].ok && growth.changes.pages[0].reason === "update_needs_reader",
      `reader: listed ${reader.p?.listed ?? "?"} · changing ${json(reader.p?.changing ?? null)} · lines ${json(reader.changes.lines)} · row 2 ${json(onlyTags ?? null)} · growth: listed ${growth.p?.listed ?? "?"}, pages ${growth.changes.pages.map((r) => (r.ok ? "ok" : r.reason))}`);
  }

  // ── C13 · S15-10 · a GROWTH officer is told nothing per person — first the 40-row file's KEEP-only label ──
  const growthForty = await inFreshStore(async () => {
    await seedFortyWorld();
    const runId = await stageFile(OFFICER, fortyRows());
    return preflightOf(await checkContactImport(OFFICER, runId, impl.deps));
  });
  const fortyKeepOnly = growthForty !== null && growthForty.mayUpdateInBook === false && countsEqual(growthForty, FORTY_COUNTS)
    && CHOICES.every((ch) => sameTally(growthForty.byChoice[ch], FORTY_KEEP_ONLY)) && json(growthForty.changing) === json({ KEEP: 0, TAKE_FILE: 0, FILL_BLANKS: 0 });
  log(`40-row file, GROWTH: ${growthForty ? `mayUpdateInBook ${growthForty.mayUpdateInBook} · ${json(growthForty.byChoice.KEEP)}` : "refused"}`);
  {
    const Z = "0757400001";
    type World = "plain" | "stopped" | "erased" | "erasedLedger";
    const oneRow: StageRow[] = [{ line: 2, cells: [Z, "Invented Name", "", "", ""] }];
    const answersOf = (w: World, who: string): Promise<{ check: string; changes: string; p: PreflightView | null; refusals: number }> => inFreshStore(async () => {
      if (w === "erasedLedger") {
        // C8a · no book row at all: the erasure's marker, and an opt-out tap on an old link above it.
        await wordAt(keyOf(Z), "led_c13_mark", "WITHDRAWN", MARK, "2026-09-05T08:00:00.000Z");
        await wordAt(keyOf(Z), "led_c13_tap", "WITHDRAWN", TAP, "2026-09-06T08:00:00.000Z");
      } else {
        await seedBook(bookRow("mc_c13", Z, w === "erased" ? { source: "IMPORT", sourceRef: ERASURE_EVIDENCE } : { displayName: "Old Name" }));
      }
      if (w === "stopped") await seedStop(keyOf(Z), "sup_c13");
      const runId = await stageFile(who, oneRow);
      captured.length = 0;
      const r = await checkContactImport(who, runId, impl.deps);
      const c = await contactImportChanges(who, { runId, afterLine: 0 }, impl.deps);
      const strip = (v: unknown): string => json(v).split(runId).join("RUN");
      const refusals = captured.filter((x) => x.action === "contacts.import.check_refused"
        && Object.keys(x.payload as Record<string, unknown>).join(",") === "reason"
        && (x.payload as { reason?: unknown }).reason === "update_needs_reader").length;
      return { check: strip(r), changes: strip(c), p: preflightOf(r), refusals };
    });
    const g = {
      plain: await answersOf("plain", OFFICER), stopped: await answersOf("stopped", OFFICER), erased: await answersOf("erased", OFFICER),
      erasedLedger: await answersOf("erasedLedger", OFFICER),
    };
    const reader = { plain: await answersOf("plain", READER), stopped: await answersOf("stopped", READER) };
    const keepOnlyOne = tally(0, 0, 1, 0, [1, 0, 0, 0, 0]);
    const gp = g.plain.p;
    const identical = g.plain.check === g.stopped.check && g.plain.check === g.erased.check && g.plain.check === g.erasedLedger.check
      && g.plain.changes === g.stopped.changes && g.plain.changes === g.erased.changes && g.plain.changes === g.erasedLedger.changes;
    ok(L.C13, identical && fortyKeepOnly && gp !== null && gp.mayUpdateInBook === false && gp.counts.inBook === 1
      && CHOICES.every((ch) => sameTally(gp.byChoice[ch], keepOnlyOne)) && json(gp.changing) === json({ KEEP: 0, TAKE_FILE: 0, FILL_BLANKS: 0 })
      && g.plain.changes.includes('"reason":"update_needs_reader"') && g.plain.refusals === 1 && g.stopped.refusals === 1 && g.erased.refusals === 1
      && g.erasedLedger.refusals === 1 && reader.plain.p?.mayUpdateInBook === true && reader.plain.check !== reader.stopped.check,
      `growth: plain = stopped ${g.plain.check === g.stopped.check} · plain = erased ${g.plain.check === g.erased.check} · plain = erased by the ledger ${g.plain.check === g.erasedLedger.check} · changes alike ${g.plain.changes === g.stopped.changes} · 40-row KEEP-only ${fortyKeepOnly} · label ${gp ? json(gp.byChoice.TAKE_FILE) : "refused"} · reader told apart ${reader.plain.check !== reader.stopped.check}`);
  }
}

/* ══ THE PLANTS — each a defect built in memory, and the ONE label it must turn red ══════════════════════════════ */

const plants: readonly RedPlant<CheckImpl>[] = [
  {
    name: "P1 · the facts loader reads the book through a cache that never answers: every in-book number is called NEW",
    expect: L.C1,
    impl: () => {
      const reads: ImportFactsReads = { ...IMPORT_FACTS_READS, snapshots: async () => [] };
      return { deps: { ...REAL_DEPS, reads }, reads };
    },
  },
  {
    name: "P2 · the walk stops after its first staged page (2,000 rows) — the rest of the file is never counted",
    expect: L.C2,
    impl: () => {
      let pages = 0;
      return withDeps({ rowsAfter: async (w) => (w.limit > 1 && pages++ >= 1 ? [] : db.contactImportRow.after(w)) });
    },
  },
  {
    name: "P3 · the first-line map is rebuilt on every page — a repeat whose first row sits on an earlier page reads as a first row",
    expect: L.C3,
    impl: () => withDeps({ firstLinesAcrossPages: false }),
  },
  {
    name: "P4 · the sample sheet's numbers are no longer refused — the example row would be imported",
    expect: L.C4,
    impl: () => withDeps({ isSample: () => false }),
  },
  {
    name: "P5 · a changes preview carries the book row's id — a contact id reaches the browser (D19)",
    expect: L.C5,
    impl: () => withDeps({
      preview: (c, f, runId) => ({ ...checkModule.IMPORT_CHECK_DEPS.preview(c, f, runId), ...(f.book ? { contactId: f.book.id } : {}) }) as never,
    }),
  },
  {
    name: "P6 · the mask is the identity — whole numbers leave the server",
    expect: L.C6,
    impl: () => withDeps({ mask: (m) => `+${m}` }),
  },
  {
    name: "P7 · the bisection starts a changes page at the LINE as an ordinal — the row after each page's last is skipped",
    expect: L.C7,
    impl: () => withDeps({ locate: async (_id, afterLine) => afterLine }),
  },
  {
    name: "P8 · the checked audit row carries the file's first number",
    expect: L.C8,
    impl: () => withDeps({
      audit: (async (entry: Parameters<typeof captureAudit>[0]) =>
        captureAudit(entry.action === "contacts.import.checked" ? { ...entry, payload: { ...entry.payload, number: keyOf(N(1)) } } : entry)) as typeof captureAudit,
    }),
  },
  {
    name: "P9 · every officer reads as an ADMIN — another officer's run is opened (X18 broken)",
    expect: L.C9,
    impl: () => withDeps({ isAdmin: async () => true }),
  },
  {
    name: "P10 · the deadline is never asked — a slow check runs on and on",
    expect: L.C10,
    impl: () => withDeps({ deadlineMs: Number.POSITIVE_INFINITY }),
  },
  {
    name: "P11 · decide() is handed a first-line map in which every row is its number's first — repeats are decided as new rows",
    expect: L.C11,
    impl: () => withDeps({
      plan: (input) => checkModule.IMPORT_CHECK_DEPS.plan({ ...input, firstLines: new Map(input.candidates.map((c) => [c.msisdn, c.line])) }),
    }),
  },
  {
    name: "P12 · the book read leaves the erased tombstone out (the campaign's presence rule, not the importer's) — an erased number reads as new",
    expect: L.C12,
    impl: () => {
      const reads: ImportFactsReads = {
        ...IMPORT_FACTS_READS,
        snapshots: async (msisdns) => (await IMPORT_FACTS_READS.snapshots(msisdns)).filter((r) => r.sourceRef !== ERASURE_EVIDENCE),
      };
      return { deps: { ...REAL_DEPS, reads }, reads };
    },
  },
  {
    // ⭐ C8a's defect #2, as it shipped: the importer's facts carried only each number's LATEST ledger row.
    name: "P14 · C8a · the loader's erasure is the ledger's LATEST word — the marker under an opt-out tap reads as no erasure, and the erased person is NEW",
    expect: L.C14,
    impl: () => {
      const reads: ImportFactsReads = {
        ...IMPORT_FACTS_READS,
        erasureStands: async (msisdns) => (await IMPORT_FACTS_READS.latestWords(msisdns))
          .filter((w) => w.status === "WITHDRAWN" && w.evidence === ERASURE_EVIDENCE).map((w) => w.identifier),
      };
      return { deps: { ...REAL_DEPS, reads }, reads };
    },
  },
  {
    name: "P14b · C8a · the loader never asks whether an erasure stands — every erasure with no book row reads as a new number",
    expect: L.C14,
    impl: () => {
      const reads: ImportFactsReads = { ...IMPORT_FACTS_READS, erasureStands: async () => [] };
      return { deps: { ...REAL_DEPS, reads }, reads };
    },
  },
  {
    // 🔴 #13 as it shipped: the pages list only the rows some choice would UPDATE — a full contact's tags vanish unsaid.
    name: "P16 · C8c · #13 · a changes-page row is one some choice updates, and nothing else — the tags a full contact cannot take are never listed",
    expect: L.C16,
    impl: () => withDeps({ listed: (p) => p.kind === "inBook" && CHOICES.some((ch) => p.byChoice[ch].kind === "update") }),
  },
  {
    // 🔴 N4 as it shipped: the walk never asks the bet queue — it reads page after page while a bet waits.
    name: "P15 · C8c · N4 · the bet queue reads empty to the check — its walk reads the next page while a bet waits",
    expect: L.C15,
    impl: () => withDeps({ queueDepth: () => 0 }),
  },
  {
    // 🔴 …or it waits, but by a clock of its own: the deadline is never reached while bets queue, and the check runs on.
    name: "P15b · C8c · N4 · the wait for bets keeps its own clock — the check's deadline never ends it while a bet waits",
    expect: L.C15,
    impl: () => withDeps({ deadlineMs: Number.POSITIVE_INFINITY }),
  },
  {
    name: "P13 · S15-10 · the non-reader's label LEAKS the keep split — a one-line file reads 'suppressed' exactly when that number is stopped",
    expect: L.C13,
    impl: () => withDeps({ keepOnly: (t) => ({ ...t, keepBy: { ...t.keepBy } }) }),
  },
  {
    name: "P13b · S15-10 · the matrix is never asked — every officer is shown a reader's labels and changes",
    expect: L.C13,
    impl: () => withDeps({ readsNumbers: async () => true }),
  },
];

export const CHECK_SECTION: ImportSection<CheckImpl> = { name: "check", owner: "S15", real, run, plants };
