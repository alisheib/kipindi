/**
 * test:contacts-import · section "check" — S15 C3: the import's check (`src/lib/server/contacts/import-check.ts`): the
 * five boxes, the three choices' labels, the changes pages and the facts loader.             (S15, 2026-10-09)
 *
 * ⭐ EXECUTED, NOT READ. Every assertion runs the REAL check over files staged through the REAL staging service on the
 * memory twin (`scripts/lib/contacts-import-world.mts`): the 40-row file whose every box holds a row and whose counts
 * are LITERALS here, the deterministic 5,000-row file whose counts are built into it, and the 30-row file whose every
 * row is a change. The per-choice labels and the changes pages are a READER's (identity.contact read — a COMPLIANCE
 * officer); a GROWTH officer is KEEP-only (S15-10, the review round of 2026-10-09), and C13 holds that a one-row file
 * answers them byte for byte the same whether its number is plain, stopped or erased. Each assertion is proven by a red
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
  ADMIN, FIVE_THOUSAND_CHANGING_LINES, FIVE_THOUSAND_COUNTS, NOW, N, B, OFFICER, OTHER, READER, UNREADABLE_SENTENCE, UNREADABLE_SENTENCE_2,
  bookRow, captureAudit, captured, checkModule, db, fiveThousandRows, fortyRows, holdsDigitRun, inFreshStore, isMasked, keyOf, mem,
  seedBook, seedFiveThousandBook, seedFortyWorld, seedStop, seedThirtyBook, seedWord, stageFile, thirtyRows, truthCounts,
} from "../lib/contacts-import-world.mts";
import type { StageRow } from "../lib/contacts-import-world.mts";
import { SAMPLE_ROW_SENTENCE } from "../../src/lib/contacts/sample-sheet.ts";
import { parseTzNumber } from "../../src/lib/tz-msisdn.ts";
import { ERASURE_EVIDENCE } from "../../src/lib/marketing/erasure-mark.ts";

const { IMPORT_CHECK_DEPS, IMPORT_FACTS_READS, checkContactImport, contactImportChanges, loadImportFacts } = checkModule;

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════════════════════ */

export type CheckImpl = {
  /** The check's dependencies — the shipped ones, with the suite's audit capture and fixed clock. */
  readonly deps: ImportCheckDeps;
  /** The facts loader's reads (C12 asks the loader directly). */
  readonly reads: ImportFactsReads;
};

const REAL_DEPS: ImportCheckDeps = { ...IMPORT_CHECK_DEPS, audit: captureAudit, now: () => NOW };
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
  C12: "C12 · ⭐ the facts are the authority's, per number: the erased tombstone IS in the book (X22), each book row carries its account link (S15-11), an active stop is suppressed and a lifted one is not, the ledger's latest word is read, NO account is read — heldByPlayer false for every number (R16) — an unknown number has no book row; and a set past one chunk (2,507 numbers) is answered whole in two chunks of THREE reads",
  C13: "C13 · ⛔ S15-10 · a GROWTH officer (identity.contact masked) is KEEP-only and told nothing per person: a one-row file whose number is plain, stopped or erased answers the check and the changes request BYTE FOR BYTE the same — mayUpdateInBook false, KEEP's label under all three choices with every keep one count, nothing changing, the changes refused update_needs_reader with ONE audit row holding only the reason — and the 40-row file reads KEEP's label (22 · 0 · 9, every keep one count) under every choice; CONTROL: a reader's answers for the plain and the stopped number differ",
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
    const extra = Array.from({ length: 2500 }, (_, i) => `2557555${String(i).padStart(5, "0")}`);
    const calls: Record<string, number> = { snapshots: 0, activeStops: 0, latestWords: 0 };
    const counting: ImportFactsReads = {
      snapshots: async (m) => { calls.snapshots++; return impl.reads.snapshots(m); },
      activeStops: async (m) => { calls.activeStops++; return impl.reads.activeStops(m); },
      latestWords: async (m) => { calls.latestWords++; return impl.reads.latestWords(m); },
    };
    const asked = [keyOf(B(4)), keyOf(B(3)), keyOf(N(9)), keyOf(N(8)), keyOf(B(5)), keyOf(B(1)), keyOf(N(50)), ...extra];
    const facts = await loadImportFacts(asked, counting);
    const f = (local: string) => facts.get(keyOf(local));
    const erased = f(B(4));
    ok(L.C12, erased?.book?.sourceRef === ERASURE_EVIDENCE && erased.book.id === "mc_w_b4"
      && f(B(3))?.suppressed === true && f(N(9))?.suppressed === false
      && f(N(8))?.ledgerLatest?.status === "WITHDRAWN" && f(B(5))?.book?.id === "mc_w_b5" && f(B(5))?.book?.userId === "usr_w_player"
      && f(B(1))?.book?.userId === null && [...facts.values()].every((x) => x.heldByPlayer === false)
      && f(N(50))?.book === null && f(N(50))?.ledgerLatest === null
      && facts.size === 2507 && extra.every((m) => facts.get(m)?.book === null)
      && json(calls) === json({ snapshots: 2, activeStops: 2, latestWords: 2 }) && Object.keys(impl.reads).sort().join(",") === "activeStops,latestWords,snapshots",
      `erased ${json(erased?.book?.sourceRef ?? null)} · stopped ${f(B(3))?.suppressed} · lifted ${f(N(9))?.suppressed} · word ${f(N(8))?.ledgerLatest?.status ?? "none"} · B5 link ${f(B(5))?.book?.userId ?? "none"} · reads ${json(calls)} · answered ${facts.size}`);
  });

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
    type World = "plain" | "stopped" | "erased";
    const oneRow: StageRow[] = [{ line: 2, cells: [Z, "Invented Name", "", "", ""] }];
    const answersOf = (w: World, who: string): Promise<{ check: string; changes: string; p: PreflightView | null; refusals: number }> => inFreshStore(async () => {
      await seedBook(bookRow("mc_c13", Z, w === "erased" ? { source: "IMPORT", sourceRef: ERASURE_EVIDENCE } : { displayName: "Old Name" }));
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
    const g = { plain: await answersOf("plain", OFFICER), stopped: await answersOf("stopped", OFFICER), erased: await answersOf("erased", OFFICER) };
    const reader = { plain: await answersOf("plain", READER), stopped: await answersOf("stopped", READER) };
    const keepOnlyOne = tally(0, 0, 1, 0, [1, 0, 0, 0, 0]);
    const gp = g.plain.p;
    const identical = g.plain.check === g.stopped.check && g.plain.check === g.erased.check
      && g.plain.changes === g.stopped.changes && g.plain.changes === g.erased.changes;
    ok(L.C13, identical && fortyKeepOnly && gp !== null && gp.mayUpdateInBook === false && gp.counts.inBook === 1
      && CHOICES.every((ch) => sameTally(gp.byChoice[ch], keepOnlyOne)) && json(gp.changing) === json({ KEEP: 0, TAKE_FILE: 0, FILL_BLANKS: 0 })
      && g.plain.changes.includes('"reason":"update_needs_reader"') && g.plain.refusals === 1 && g.stopped.refusals === 1 && g.erased.refusals === 1
      && reader.plain.p?.mayUpdateInBook === true && reader.plain.check !== reader.stopped.check,
      `growth: plain = stopped ${g.plain.check === g.stopped.check} · plain = erased ${g.plain.check === g.erased.check} · changes alike ${g.plain.changes === g.stopped.changes} · 40-row KEEP-only ${fortyKeepOnly} · label ${gp ? json(gp.byChoice.TAKE_FILE) : "refused"} · reader told apart ${reader.plain.check !== reader.stopped.check}`);
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
