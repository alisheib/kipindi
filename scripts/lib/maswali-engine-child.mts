/**
 * test:maswali-engine — A WEEK, END TO END, ON BOTH STORES (MASWALI-BUILD S2; acceptance: open → 15 seals → gate).
 *
 *   npx tsx scripts/maswali-engine.test.mts     (npm run test:maswali-engine)
 *
 *   §1 drafting: the shape, the clock, the code, the chain order
 *   §2 the open refuses every missing condition — licence, parity, guarantee, the close guard, OD-14, politics, sources
 *   §3 ⭐ the open: one claim, a MASWALI market with the jackpot model frozen and no paid exit, the rules and the hash
 *   §4 ⭐ the freeze: every frozen column throws on patch; a draft edit is refused past DRAFT; one open week per visibility
 *   §5 the close moves within its bounds (MB-28) and happens exactly once, with its commitment
 *   §6 sealing: who, when, on what ground; the gate; the objection window (OD-05); the sealer's own correction (OD-09)
 *   §7 the two-officer flag, when on, needs a second officer
 *   §8 ⭐ the week void: certain → sales stop at once; void only after its window; the market voided
 *   §9 the carry: strictly in chain order, claimed once
 *
 * The weeks are placed relative to TODAY (two and three weeks ahead), so the suite never goes stale; the clock changes
 * themselves are pinned by `test:maswali-time`.
 */
// One store's run: the two-store runner (scripts/maswali-engine.test.mts) starts this file once on the memory store
// and once on a fresh migrated scratch Postgres; HB_MONEY_STORE names the store, and every line carries it.
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-engine-session-secret-0123456789abcdef";

const { eatWeekStartMs, eatWeekAt } = await import("../../src/lib/eat-day.ts");
const { utcToZonedLocal } = await import("../../src/lib/maswali-time.ts");
const svc = await import("../../src/lib/server/maswali-service.ts");
const { weekStore, questionStore, ticketStore, __resetMaswaliMemoryStores } = await import("../../src/lib/server/maswali-dal.ts");
const { recordLicenceBasis } = await import("../../src/lib/server/maswali-licence.ts");
const { saveMaswaliConfig } = await import("../../src/lib/server/maswali-config.ts");
const { setRequireTwoOfficerResolution } = await import("../../src/lib/server/resolution-policy.ts");
const { marketStore } = await import("../../src/lib/server/market-dal.ts");
const consoleRead = await import("../../src/lib/server/maswali-console.ts");
const { applySealBatch, parseSealRows, withoutSealedPicks, SEAL_AUDIT_WARNING } = await import("../../src/lib/maswali-seal-batch.ts");
const { noteSealDevice, recentNewDeviceSeals, SEAL_DEVICE_ACTION, SEAL_NEW_DEVICE_ACTION, SEAL_DEVICE_UNCHECKED_ACTION } = await import("../../src/lib/server/maswali-integrity.ts");
const { audit, auditFlush, getAuditByActionsDurable } = await import("../../src/lib/server/audit.ts");
const { readFileSync } = await import("node:fs");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const throwsAsync = async (fn: () => Promise<unknown>): Promise<string | null> => { try { await fn(); return null; } catch (e) { return String((e as Error).message ?? e); } };
const errOf = (r: { ok: boolean; error?: string }) => (r.ok ? "" : String(r.error));
const DAY = 86_400_000;

const DRAFTER = "usr_drafter", READER = "usr_reader", SEALER = "usr_sealer", OTHER = "usr_other", OWNER = "usr_owner";
const RICH = { balance: async () => 5_000_000 };

/** A week two (or more) weeks from today, and its template instants. */
const weekStartAhead = (weeks: number) => eatWeekStartMs(Date.now()) + weeks * 7 * DAY;
const SOURCES: Array<{ category: string; url: string }> = [
  { category: "sports", url: "https://www.nbc.co.tz/results" }, { category: "sports", url: "https://www.tff.or.tz/fixtures" },
  { category: "macro", url: "https://www.bot.go.tz/rates" }, { category: "weather", url: "https://www.meteo.go.tz/bulletin" },
  { category: "crypto", url: "https://www.coingecko.com/en/coins/bitcoin" },
];
/** Fifteen clean questions whose events are on the Saturday and Sunday after the week's Friday close. */
function questions(weekStart: number, over: (i: number) => Record<string, unknown> = () => ({})) {
  return Array.from({ length: 15 }, (_, i) => {
    const main = i < 10;
    const src = SOURCES[i % SOURCES.length];
    const at = weekStart + 5 * DAY + (main ? 9 : 14) * 3_600_000 + i * 60 * 60_000; // Sat from 09:00 UTC, one an hour
    return {
      role: main ? "MAIN" as const : "RESERVE" as const, ordinal: main ? i + 1 : i - 9, category: src.category,
      textEn: `Will event ${i + 1} happen?`, textSw: `Je, tukio la ${i + 1} litatokea?`, textZh: `第 ${i + 1} 个事件会发生吗？`,
      criterionEn: `YES if event ${i + 1} is confirmed by the source.`, criterionSw: `NDIO ikiwa tukio la ${i + 1} litathibitishwa.`, criterionZh: `如果第 ${i + 1} 个事件得到确认则为是。`,
      sourceUrl: src.url, eventKind: "SPORT" as const, eventLocalStart: utcToZonedLocal(at, "Africa/Dar_es_Salaam"), eventZone: "Africa/Dar_es_Salaam",
      probabilityEstimate: 0.5, probabilitySource: "officer estimate from the source's form table",
      ...over(i),
    };
  });
}
const allMains = (): number[] => Array.from({ length: 10 }, (_, i) => i + 1);
/** A draft row's version as an editor loads it (S5-FIX-SRV A5): every edit names the row it read. */
const versionOf = async (weekId: string, slot: number) => svc.draftRowVersion((await questionStore.listForWeek(weekId)).find((q) => q.slot === slot)!);
const editSlot = async (e: { weekId: string; slot: number; changes: Record<string, unknown>; officerId: string }) =>
  svc.editDraftQuestion({ ...e, version: await versionOf(e.weekId, e.slot) });
/** An attestation from a page drawn this instant (S5-FIX-SRV A4): it names the draft's version as stored now. */
const attest = async (weekId: string, officerId: string) => svc.attestParity({ weekId, officerId, readVersion: await svc.readDraftVersion(weekId) });
/**
 * ⭐ S5-FIX-SRV (finding 2's class) · WHERE AN ACT'S AUDIT ROWS AND POOL NOTICES ARE WRITTEN. `spied` runs one act with a
 * writer that notes, for every row the act owes, whether a lock was still held when it was written, then writes it as
 * `audit` does; and it notes the same for every pool frame the act arms (the feed's own frames are fired first, so the
 * act's notice arms one). On PostgreSQL a row or a notice made under no lock follows its act's commit (the outermost lock
 * runs what `afterCommit` queued only once its transaction has resolved); the memory store has no transaction, so there
 * each is only counted.
 */
const { inLock } = await import("../../src/lib/server/locks.ts");
const poolFeed = await import("../../src/lib/server/maswali-pool-feed.ts");
let auditSites: Array<{ action: string; targetId: string | null; underLock: boolean }> = [];
let poolSites: Array<{ weekId: string; underLock: boolean }> = [];
async function spied<T>(act: () => Promise<T>): Promise<T> {
  auditSites = [];
  poolSites = [];
  await poolFeed.__flushPoolFramesForTests();
  const frames = (globalThis as { __50PICK_MLN_POOL_FEED?: Map<string, unknown> }).__50PICK_MLN_POOL_FEED!;
  frames.set = function (this: Map<string, unknown>, weekId: string, timer: unknown) { poolSites.push({ weekId, underLock: inLock() }); return Map.prototype.set.call(this, weekId, timer) as Map<string, unknown>; };
  svc.__setMaswaliAuditWriterForTests(async (row) => { auditSites.push({ action: row.action, targetId: row.targetId ?? null, underLock: inLock() }); return audit(row); });
  try { return await act(); } finally { svc.__setMaswaliAuditWriterForTests(null); delete (frames as { set?: unknown }).set; }
}
/** The act wrote one `action` row for `targetId`: on PostgreSQL, only once its transaction had committed. */
const afterItsCommit = (action: string, targetId: string) => {
  const rows = auditSites.filter((s) => s.action === action && s.targetId === targetId);
  return rows.length === 1 && (STORE !== "postgres" || !rows[0].underLock);
};
/** The act armed one pool frame for `weekId`: on PostgreSQL, only once its transaction had committed. */
const notedAfterItsCommit = (weekId: string) => {
  const notes = poolSites.filter((s) => s.weekId === weekId);
  return notes.length === 1 && (STORE !== "postgres" || !notes[0].underLock);
};

// ── §1 · drafting ───────────────────────────────────────────────────────────
console.log("\n§1 · drafting");
__resetMaswaliMemoryStores();
const W2 = weekStartAhead(2);
const nowDraft = new Date(W2 - 3 * DAY);
{
  const bad = await svc.createWeek({ weekStartMs: W2 + 3_600_000, questions: questions(W2), officerId: DRAFTER, now: nowDraft });
  ok("1.1 · ⛔ a week starts on a Monday 00:00 EAT", !bad.ok && /Monday/.test(errOf(bad)));
  const fourteen = await svc.createWeek({ weekStartMs: W2, questions: questions(W2).slice(0, 14), officerId: DRAFTER, now: nowDraft });
  ok("1.2 · ⛔ fourteen questions are refused", !fourteen.ok);
  const dup = questions(W2); dup[1] = { ...dup[1], ordinal: 1 };
  ok("1.3 · ⛔ a slot drafted twice is refused", !(await svc.createWeek({ weekStartMs: W2, questions: dup, officerId: DRAFTER, now: nowDraft })).ok);
  const amb = await svc.createWeek({ weekStartMs: W2, questions: questions(W2, (i) => (i === 0 ? { eventLocalStart: "2026-10-25T01:30", eventZone: "Europe/London" } : {})), officerId: DRAFTER, now: nowDraft });
  ok("1.4 · ⛔ an event start in a clock change's repeated hour is refused, never guessed", !amb.ok && /happens twice/.test(errOf(amb)), errOf(amb));
  const zone = await svc.createWeek({ weekStartMs: W2, questions: questions(W2, (i) => (i === 0 ? { eventZone: "Mars/Olympus" } : {})), officerId: DRAFTER, now: nowDraft });
  ok("1.5 · ⛔ an unknown zone is refused", !zone.ok && /zone/.test(errOf(zone)));
  // ⭐ S5-FIX-SRV 6 · the server checks every drafted field itself, in the console's words. A throw is NOT a refusal: the
  //    officer would read a raw error (or, on PostgreSQL, the CHECK's), and the memory store used to keep it instead.
  const asRefusal = async (over: (i: number) => Record<string, unknown>) => {
    try { return await svc.createWeek({ weekStartMs: W2, questions: questions(W2, over) as never, officerId: DRAFTER, now: nowDraft }); }
    catch (e) { return { ok: true as const, error: `THREW ${String((e as Error).message ?? e)}` }; }
  };
  const kind = await asRefusal((i) => (i === 0 ? { eventKind: "OTHER" } : {}));
  ok("1.5a · ⛔ an event kind outside SPORT, PRICE, WEATHER, ANNOUNCEMENT is the console's refusal, never a database error (finding 6)",
    !kind.ok && /M1: the event kind must be SPORT, PRICE, WEATHER or ANNOUNCEMENT/.test(errOf(kind)), errOf(kind));
  const chances = await Promise.all([1.5, -0.1, Number.NaN, "0.5"].map((p) => asRefusal((i) => (i === 1 ? { probabilityEstimate: p } : {}))));
  ok("1.5b · ⛔ a probability that is not a number from 0 to 1 (1.5, -0.1, NaN, \"0.5\") is refused",
    chances.every((r) => !r.ok && /M2: the estimated probability must be a number from 0 to 1/.test(errOf(r))), chances.map(errOf).join(" | "));
  const texts = await Promise.all([{ textEn: 42 }, { criterionSw: null }, { sourceUrl: ["https://x"] }, { fallbackSourceUrl: 7 }].map((o) => asRefusal((i) => (i === 2 ? o : {}))));
  ok("1.5c · ⛔ a text field that is not text is refused by name, never a TypeError",
    texts.every((r) => !r.ok && /^M3: the .+ must be text\.$/.test(errOf(r))), texts.map(errOf).join(" | "));
  ok("1.5d · …and none of them stored a week", (await weekStore.list()).length === 0);
  const checkRow = { id: "mlq_event_kind_check", role: "MAIN" as const, ordinal: 1, slot: 1, category: "sports", textEn: "x", textSw: "x", textZh: "x",
    criterionEn: "x", criterionSw: "x", criterionZh: "x", sourceUrl: "https://www.nbc.co.tz/results", sourceDomain: "www.nbc.co.tz", fallbackSourceUrl: null,
    fallbackSourceDomain: null, readingTolerance: null, eventKind: "OTHER" as never, eventStartsAt: new Date(W2).toISOString(), eventZone: "Africa/Dar_es_Salaam",
    voidDeadlineAt: new Date(W2).toISOString(), probabilityEstimate: null, probabilitySource: null, linkedMarketId: null };
  const checkErr = await throwsAsync(() => questionStore.createMany("mlw_no_such_cycle", [checkRow]));
  ok("1.5e · ⛔ the store itself refuses that event kind on BOTH stores, by the database's own CHECK name (MaswaliQuestion_event_kind_check)",
    checkErr !== null && checkErr.includes("MaswaliQuestion_event_kind_check"), String(checkErr).slice(0, 200));
  const past = await svc.createWeek({ weekStartMs: W2, questions: questions(W2), officerId: DRAFTER, now: new Date(W2 + 6 * DAY) });
  ok("1.6 · ⛔ a week whose close has passed is refused", !past.ok);
}
const created = await svc.createWeek({ weekStartMs: W2, questions: questions(W2), officerId: DRAFTER, now: nowDraft });
const week = created.ok ? created.week : (null as never);
{
  ok("1.7 · a clean draft is stored", created.ok, errOf(created));
  ok("1.8 · DRAFT, no market, no frozen rules", week.state === "DRAFT" && week.marketId === null && week.rulesSnapshot === null && week.questionSetHash === null);
  ok("1.9 · its code is its ISO week, MLN-…", /^MLN-\d{4}-W\d{2}$/.test(week.code), week.code);
  ok("1.10 · the template close is Friday 18:00 EAT", Date.parse(week.closesAt) === eatWeekAt(W2, 5, "18:00"));
  ok("1.11 · seq 1 — the first drafted (seq counts drafts; the chain is the calendar)", week.seq === 1);
  ok("1.12 · fifteen questions on slots 1…15", (await questionStore.listForWeek(week.id)).map((q) => q.slot).join(",") === "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15");
  const q1 = (await questionStore.listForWeek(week.id))[0];
  ok("1.13 · each void deadline is the start + 48 h, capped at the final deadline", Date.parse(q1.voidDeadlineAt) === Math.min(Date.parse(q1.eventStartsAt) + 48 * 3_600_000, Date.parse(week.finalDeadlineAt)));
  const again = await svc.createWeek({ weekStartMs: W2, questions: questions(W2), officerId: DRAFTER, now: nowDraft });
  ok("1.14 · ⛔ the same week twice is refused", !again.ok && /already exists/.test(errOf(again)));
  const drive = await svc.createWeek({ weekStartMs: W2, visibility: "DRIVE", questions: questions(W2), officerId: DRAFTER, now: nowDraft });
  ok("1.15 · a DRIVE week shares the ISO week under its own code (MLD-…), next in the chain", drive.ok && /^MLD-/.test(drive.week.code) && drive.week.seq === 2);
  // S5-FIX-SRV 6 · a probability finer than the column holds is kept to four decimals on BOTH stores (Decimal(5,4)).
  const fine = await editSlot({ weekId: week.id, slot: 4, changes: { probabilityEstimate: 0.55555 }, officerId: DRAFTER });
  ok("1.16 · ⛔ a probability of 0.55555 is stored as 0.5556 on both stores — memory keeps exactly what PostgreSQL keeps",
    fine.ok && (await questionStore.listForWeek(week.id)).find((q) => q.slot === 4)?.probabilityEstimate === 0.5556, errOf(fine));
}

// ── §2 · the open refuses ───────────────────────────────────────────────────
console.log("\n§2 · the open refuses every missing condition");
const nowOpen = new Date(W2 + 60_000); // Monday 00:01 EAT
{
  // The builder's checklist reads the real (unfunded) guarantee: it must name what the open would refuse for, in the
  // open's own words — it once said every check passes while the open refused (the S4 drive's finding).
  const listed = async () => (await consoleRead.consoleWeekDetail(week.id, nowOpen))?.problems ?? [];
  const before = await listed();
  ok("2.0 · ⭐ the builder's checklist names the missing licence basis (OD-01) and the short guarantee (OD-02), as the open words them",
    before[0] === svc.NO_LICENCE_BASIS && before.some((p) => /^The guarantee holds TZS 0; TZS [\d,]+ is needed to open \(OD-02\)\.$/.test(p)), JSON.stringify(before));
  const noLicence = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen });
  ok("2.1 · ⛔ no licence basis → refused (OD-01)", !noLicence.ok && errOf(noLicence) === svc.NO_LICENCE_BASIS, errOf(noLicence));
  await recordLicenceBasis({ kind: "OWNER_RULING", ref: "Owner ruling 2026-10-16, docs/COMPLIANCE-DECISIONS.md" }, OWNER);
  const after = await listed();
  ok("2.1b · …once the basis is recorded the checklist drops it, and still names the guarantee",
    !after.includes(svc.NO_LICENCE_BASIS) && after.some((p) => /^The guarantee holds TZS 0;/.test(p)), JSON.stringify(after));
  const noParity = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen });
  ok("2.2 · ⛔ no parity attestation → refused (MB-79)", !noParity.ok && /attested/.test(errOf(noParity)), errOf(noParity));
  ok("2.3 · ⛔ the drafter cannot attest their own translations", !(await attest(week.id, DRAFTER)).ok);
  ok("2.4 · a second reader attests", (await attest(week.id, READER)).ok);
  const poor = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: { balance: async () => 999_999 }, now: nowOpen });
  ok("2.5 · ⛔ a guarantee below the floor → refused (OD-02)", !poor.ok && /guarantee holds TZS 999,999/.test(errOf(poor)), errOf(poor));
  const blind = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: { balance: async () => null }, now: nowOpen });
  ok("2.6 · ⛔ an unreadable guarantee → refused", !blind.ok && /could not be read/.test(errOf(blind)));
  // The close guard: one event at 17:59 EAT on Friday, one minute before an 18:00 close.
  const closeMs = eatWeekAt(W2, 5, "18:00");
  const edit = await editSlot({ weekId: week.id, slot: 3, changes: { eventLocalStart: utcToZonedLocal(closeMs - 60_000, "Africa/Dar_es_Salaam") }, officerId: DRAFTER });
  ok("2.7 · a draft question may be edited while DRAFT", edit.ok, errOf(edit));
  ok("2.8 · …and the edit cleared the parity attestation", (await weekStore.get(week.id))!.parityAttestedBy === null);
  // ⭐ S5-FIX-SRV A5 · two editors on one draft: the drafter's editor loads M3 and M7, another officer saves M7 first.
  const loaded = { 3: await versionOf(week.id, 3), 7: await versionOf(week.id, 7) };
  const theirs = await editSlot({ weekId: week.id, slot: 7, changes: { textEn: "Will event 7 happen this weekend?" }, officerId: OTHER });
  const textOf = async (slot: number) => (await questionStore.listForWeek(week.id)).find((q) => q.slot === slot)!.textEn;
  const m3Before = await textOf(3);
  const staleSave = await svc.editDraftQuestions({ weekId: week.id, officerId: DRAFTER, edits: [
    { slot: 3, changes: { textEn: "Will event 3 happen on Saturday?" }, version: loaded[3] },
    { slot: 7, changes: { textEn: "Will event 7 happen on Sunday?" }, version: loaded[7] },
  ] });
  ok("2.8a · ⛔ a save from an editor opened before another officer's save is refused WHOLE, naming the slot — nothing overwritten (A5)",
    theirs.ok && !staleSave.ok && /M7 changed after you opened the editor/.test(errOf(staleSave))
      && (await textOf(7)) === "Will event 7 happen this weekend?" && (await textOf(3)) === m3Before, errOf(staleSave));
  const versionless = await svc.editDraftQuestions({ weekId: week.id, officerId: DRAFTER, edits: [{ slot: 3, changes: { textEn: "Will event 3 happen on Saturday?" }, version: "" }] });
  ok("2.8b · ⛔ a save that names no version of its row is refused", !versionless.ok && /which version/.test(errOf(versionless)) && (await textOf(3)) === m3Before, errOf(versionless));
  // ⭐ S5-FIX-SRV 3 + A4 · MB-79's second reader, read from the week's own durable trail and tied to the text read.
  const otherAttests = await attest(week.id, OTHER);
  ok("2.8c · ⛔ an officer who edited the draft since its last attestation cannot attest it (finding 3)",
    !otherAttests.ok && /You edited this draft since its last attestation/.test(errOf(otherAttests)) && (await weekStore.get(week.id))!.parityAttestedBy === null, errOf(otherAttests));
  const readAt = await svc.readDraftVersion(week.id);
  const tweak = await editSlot({ weekId: week.id, slot: 7, changes: { textEn: "Will event 7 happen this weekend at all?" }, officerId: DRAFTER });
  const stalePage = await svc.attestParity({ weekId: week.id, officerId: READER, readVersion: readAt });
  ok("2.8d · ⛔ an attestation from a page drawn before another officer's edit is refused, and nothing is attested (A4)",
    tweak.ok && !stalePage.ok && /changed after your page loaded/.test(errOf(stalePage)) && (await weekStore.get(week.id))!.parityAttestedBy === null, errOf(stalePage));
  const unreadable = await svc.attestParity({ weekId: week.id, officerId: READER, readVersion: await svc.readDraftVersion(week.id),
    readHistory: async () => { throw new Error("injected history outage"); } });
  ok("2.8e · ⛔ a draft history that cannot be read refuses the attestation (fail closed)",
    !unreadable.ok && /history could not be read/.test(errOf(unreadable)) && (await weekStore.get(week.id))!.parityAttestedBy === null, errOf(unreadable));
  // An edit whose audit row was never written leaves text nobody is recorded as writing: no second reader can be established.
  svc.__setMaswaliAuditWriterForTests(async (row) => ({ recorded: row.action !== "maswali.week.draft_edited" }));
  let unrecordedEdit: Awaited<ReturnType<typeof svc.editDraftQuestions>>;
  try { unrecordedEdit = await editSlot({ weekId: week.id, slot: 8, changes: { textEn: "Will event 8 happen on Sunday?" }, officerId: OTHER }); }
  finally { svc.__setMaswaliAuditWriterForTests(null); }
  const authorless = await attest(week.id, READER);
  ok("2.8f · ⛔ after an edit whose record was not written, the text has no recorded author and nobody can attest it",
    unrecordedEdit.ok && unrecordedEdit.recorded === false && !authorless.ok && /no audit record of who wrote it/.test(errOf(authorless)), errOf(authorless));
  const restored = await editSlot({ weekId: week.id, slot: 8, changes: { textEn: "Will event 8 happen?" }, officerId: DRAFTER });
  const readerAttests = await attest(week.id, READER);
  ok("2.8g · a recorded edit restores the text's author, and the second reader, who wrote none of it, attests",
    restored.ok && restored.recorded === true && readerAttests.ok && readerAttests.recorded === true && (await weekStore.get(week.id))!.parityAttestedBy === READER, errOf(readerAttests));
  const again = await attest(week.id, READER);
  ok("2.8h · ⛔ an attestation that stands is never overwritten — not even by its own reader", !again.ok && /already attested/.test(errOf(again)), errOf(again));
  const guard = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen });
  ok("2.9 · ⛔ THE CLOSE GUARD: an event at 17:59 before an 18:00 close is refused (30-minute buffer, OD-15)", !guard.ok && /at least 30 minutes before the first event/.test(errOf(guard)), errOf(guard));
  const at1729 = await editSlot({ weekId: week.id, slot: 3, changes: { eventLocalStart: utcToZonedLocal(closeMs + 29 * 60_000, "Africa/Dar_es_Salaam") }, officerId: DRAFTER });
  await attest(week.id, READER);
  const g29 = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen });
  ok("2.10 · ⛔ …and at 18:29, one minute inside the buffer, still refused", at1729.ok && !g29.ok && /30 minutes/.test(errOf(g29)));
  await editSlot({ weekId: week.id, slot: 3, changes: { eventLocalStart: utcToZonedLocal(closeMs + 30 * 60_000, "Africa/Dar_es_Salaam") }, officerId: DRAFTER });
  await editSlot({ weekId: week.id, slot: 4, changes: { probabilityEstimate: 0.9 }, officerId: DRAFTER });
  await editSlot({ weekId: week.id, slot: 5, changes: { textEn: "Will the election be won by the incumbent?" }, officerId: DRAFTER });
  await editSlot({ weekId: week.id, slot: 6, changes: { sourceUrl: "https://example.org/unknown" }, officerId: DRAFTER });
  await attest(week.id, READER);
  const many = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen });
  const e = errOf(many);
  ok("2.11 · ⛔ a probability outside 30–70% is refused (OD-14)", /outside 30–70%/.test(e), e);
  ok("2.12 · ⛔ a question about an election is refused in English (R-CATEGORIES)", /about politics \("election"\)/.test(e), e);
  ok("2.13 · ⛔ an untrusted source is refused", /not a trusted source/.test(e), e);
  ok("2.14 · …and an event exactly 30 minutes after the close is NOT refused (the buffer is inclusive)", !/30 minutes before the first event/.test(e), e);
  await editSlot({ weekId: week.id, slot: 4, changes: { probabilityEstimate: 0.55 }, officerId: DRAFTER });
  await editSlot({ weekId: week.id, slot: 5, changes: { textEn: "Will event 5 happen?" }, officerId: DRAFTER });
  await editSlot({ weekId: week.id, slot: 6, changes: { sourceUrl: SOURCES[0].url, category: "sports" }, officerId: DRAFTER });
}

// ── §3 · the open ───────────────────────────────────────────────────────────
console.log("\n§3 · ⭐ the open");
await attest(week.id, READER);
// ⭐ S5-FIX-SRV (finding 2's class, in the open) · the open is ONE transaction: the market it makes, its claim and the final
//    mark commit together or not at all, and its audit rows follow the commit. Proven where a transaction can roll back.
{
  const title = `Maswali Millionea · ${week.code}`;
  const { prisma: pgClient } = await import("../../src/lib/server/prisma.ts");
  const marketsMade = async () => (STORE === "postgres" ? pgClient()!.predictionMarket.count({ where: { productLine: "MASWALI", titleEn: title } }) : 0);
  const rowsOf = async (action: string, match: (e: { targetId: string | null; payload?: Record<string, unknown> }) => boolean) => {
    await auditFlush();
    return (await getAuditByActionsDurable([action], { limit: 500 })).entries.filter(match).length;
  };
  const openedRows = () => rowsOf("maswali.week.opened", (e) => e.targetId === week.id);
  const createdRows = () => rowsOf("market.created", (e) => e.payload?.titleEn === title);
  const before = { markets: await marketsMade(), opened: await openedRows(), created: await createdRows() };
  if (STORE === "postgres") {
    // The fault fires on the first read AFTER the claim landed: the market and the claim are both written by then.
    const realGet = weekStore.get, realStamp = weekStore.stampOpen;
    let claimed = false;
    weekStore.stampOpen = async (...args: Parameters<typeof realStamp>) => { const won = await realStamp.apply(weekStore, args); claimed = won; return won; };
    weekStore.get = async (...args: Parameters<typeof realGet>) => {
      if (claimed) throw new Error("injected fault: the connection dropped after the open's claim");
      return realGet.apply(weekStore, args);
    };
    let thrown = "";
    try { await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen }); }
    catch (e) { thrown = String((e as Error).message ?? e); } finally { weekStore.get = realGet; weekStore.stampOpen = realStamp; }
    const after = (await weekStore.get(week.id))!;
    ok("3.0 · ⭐ a fault after the open's claim landed rolls the WHOLE open back — the week DRAFT, no market made for it, and no audit row (opened, market.created)",
      thrown.includes("injected fault") && claimed && after.state === "DRAFT" && after.marketId === null && (await marketsMade()) === before.markets
        && (await openedRows()) === before.opened && (await createdRows()) === before.created,
      JSON.stringify({ thrown, claimed, state: after.state, markets: await marketsMade(), opened: await openedRows(), created: await createdRows() }));
  }
  // A claim lost after the market was made (another open won the row) answers the refusal — and rolls the market back.
  const realStampOpen = weekStore.stampOpen;
  weekStore.stampOpen = async () => false;
  let lost: Awaited<ReturnType<typeof svc.openWeek>> | null = null, lostThrew = "";
  try { lost = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen }); }
  catch (e) { lostThrew = String((e as Error).message ?? e); } finally { weekStore.stampOpen = realStampOpen; }
  ok("3.0b · ⛔ a lost claim answers its refusal, and on PostgreSQL the market it made rolls back with it (the memory store has no transaction)",
    !lostThrew && !!lost && !lost.ok && /changed while it was being opened; nothing was opened/.test(errOf(lost))
      && (STORE !== "postgres" || ((await marketsMade()) === before.markets && (await createdRows()) === before.created)), lostThrew ? `threw: ${lostThrew}` : errOf(lost ?? { ok: false, error: "no answer" }));
}
const opened = await spied(() => svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen }));
const w1 = opened.ok ? opened.week : (null as never);
{
  ok("3.1 · it opens", opened.ok, errOf(opened));
  ok("3.1b · ⭐ the open's audit row and its pool notice each come once — on PostgreSQL only after its transaction committed (S5-FIX-SRV)", afterItsCommit("maswali.week.opened", week.id) && notedAfterItsCommit(week.id), JSON.stringify({ auditSites, poolSites }));
  ok("3.2 · OPEN, with a market, the frozen rules and the question-set hash", w1.state === "OPEN" && !!w1.marketId && w1.rulesSnapshot !== null && /^[0-9a-f]{64}$/.test(w1.questionSetHash ?? ""));
  const m = await marketStore.get(w1.marketId!);
  ok("3.3 · the market is MASWALI, LIVE, closing at the week's close", m?.productLine === "MASWALI" && m.status === "LIVE" && m.selectionClosedAt === w1.closesAt, JSON.stringify({ pl: m?.productLine, st: m?.status, sc: m?.selectionClosedAt }));
  const fs = m?.feeSnapshot as unknown as { feeModel: string; jackpotFeeRate: number; paidExitWindowMinutes: number };
  ok("3.4 · its fee snapshot froze jackpot-payout at 13% and NO paid exit (MB-50)", fs?.feeModel === "jackpot-payout" && fs.jackpotFeeRate === 0.13 && fs.paidExitWindowMinutes === 0, JSON.stringify(fs));
  const rules = svc.frozenRules(w1);
  ok("3.5 · the frozen rules read back: TZS 1,000, cap 10, buffer 30, and no fee rate in them", rules?.ticketPriceTzs === 1_000 && rules.ticketCapPerWeek === 10 && rules.minLockBufferMinutes === 30 && !("jackpotFeeRate" in (rules ?? {})));
  ok("3.6 · ⛔ a second open of the same week is refused", !(await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen })).ok);
  ok("3.7 · ⛔ stampOpen a second time loses the claim", (await weekStore.stampOpen(week.id, { marketId: "mkt_x", rulesSnapshot: {}, questionSetHash: "0".repeat(64), opensAt: nowOpen.toISOString() })) === false);
}

// ── §4 · the freeze ─────────────────────────────────────────────────────────
console.log("\n§4 · ⭐ the freeze");
{
  ok("4.1 · ⛔ a draft edit past DRAFT is refused", !(await editSlot({ weekId: w1.id, slot: 1, changes: { textEn: "changed?" }, officerId: DRAFTER })).ok);
  const q = (await questionStore.listForWeek(w1.id))[0];
  for (const k of ["textEn", "textSw", "textZh", "criterionEn", "criterionSw", "criterionZh", "sourceUrl", "fallbackSourceUrl", "role", "ordinal", "slot", "eventStartsAt", "eventZone", "voidDeadlineAt"]) {
    const err = await throwsAsync(() => questionStore.patch(q.id, { [k]: "x" } as never));
    ok(`4.2 · ⛔ questionStore.patch refuses '${k}'`, err !== null && err.includes(`'${k}' is not a patchable column`), String(err));
  }
  for (const k of ["rulesSnapshot", "questionSetHash", "ticketMerkleRoot", "closesAt", "opensAt", "code", "seq", "marketId", "visibility", "rolloverIn", "ticketCount", "salesAtClose", "closedAt"]) {
    const err = await throwsAsync(() => weekStore.patch(w1.id, { [k]: "x" } as never));
    ok(`4.3 · ⛔ weekStore.patch refuses '${k}'`, err !== null && err.includes(`'${k}' is not a patchable column`), String(err));
  }
  const err = await throwsAsync(() => ticketStore.patch("tk", { selections: [] } as never));
  ok("4.4 · ⛔ ticketStore.patch refuses the picks", err !== null && err.includes("'selections' is not a patchable column"));
  const second = await svc.createWeek({ weekStartMs: weekStartAhead(3), questions: questions(weekStartAhead(3)), officerId: DRAFTER, now: nowDraft });
  if (second.ok) await attest(second.week.id, READER);
  const two = second.ok ? await svc.openWeek({ weekId: second.week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen }) : second;
  ok("4.5 · ⛔ a second PUBLIC week cannot open while one is open (MR-3)", second.ok && !two.ok && /Another public week is open/.test(errOf(two)), errOf(two));
}

// ── §5 · the close ──────────────────────────────────────────────────────────
console.log("\n§5 · the close");
{
  const closeMs = Date.parse(w1.closesAt);
  const reviewedClose = w1.closesAt;
  const soon = await svc.moveClose({ weekId: w1.id, toCloseAt: new Date(Date.parse(nowOpen.toISOString()) + 3 * 60_000).toISOString(), expectedClosesAt: reviewedClose, officerId: DRAFTER, now: nowOpen });
  ok("5.1 · ⛔ an earlier close inside the free-cancel window + 1 min is refused (MB-28)", !soon.ok && /6 minutes/.test(errOf(soon)), errOf(soon));
  const late = await svc.moveClose({ weekId: w1.id, toCloseAt: new Date(closeMs + 24 * 3_600_000).toISOString(), expectedClosesAt: reviewedClose, officerId: DRAFTER, now: nowOpen });
  ok("5.2 · ⛔ a later close past the first event − buffer is refused", !late.ok && /30 minutes before the first event/.test(errOf(late)), errOf(late));
  const earlier = await svc.moveClose({ weekId: w1.id, toCloseAt: new Date(closeMs - 2 * 3_600_000).toISOString(), expectedClosesAt: reviewedClose, officerId: DRAFTER, now: nowOpen });
  ok("5.3 · an earlier close two hours sooner is allowed", earlier.ok && Date.parse(earlier.week.closesAt) === closeMs - 2 * 3_600_000, errOf(earlier));
  ok("5.4 · …and the market's own cutoff follows it", (await marketStore.get(w1.marketId!))?.selectionClosedAt === new Date(closeMs - 2 * 3_600_000).toISOString());
  // ⭐ S5-FIX-SRV A3 · a page drawn before 5.3's move still shows the original close: its move is refused, nothing moves.
  const moved = new Date(closeMs - 2 * 3_600_000).toISOString();
  const stale = await svc.moveClose({ weekId: w1.id, toCloseAt: new Date(closeMs - 3 * 3_600_000).toISOString(), expectedClosesAt: reviewedClose, officerId: OTHER, now: nowOpen });
  ok("5.10 · ⛔ a move reviewed against a close another officer has since moved is refused, and the close stays where that move put it (A3)",
    !stale.ok && /changed since you reviewed it/.test(errOf(stale)) && (await weekStore.get(w1.id))!.closesAt === moved
      && (await marketStore.get(w1.marketId!))?.selectionClosedAt === moved, errOf(stale));
  const unreviewed = await svc.moveClose({ weekId: w1.id, toCloseAt: new Date(closeMs - 3 * 3_600_000).toISOString(), expectedClosesAt: "", officerId: OTHER, now: nowOpen });
  ok("5.11 · ⛔ a move that names no reviewed close is refused", !unreviewed.ok && /review its close/.test(errOf(unreviewed)) && (await weekStore.get(w1.id))!.closesAt === moved, errOf(unreviewed));
  // The two writes are one transaction: a fault at the market's cutoff leaves the week's close where it was (Postgres).
  if (STORE === "postgres") {
    const realStamp = marketStore.stamp;
    marketStore.stamp = async () => { throw new Error("injected fault: the connection dropped at the market's cutoff"); };
    let thrown = "";
    try {
      await svc.moveClose({ weekId: w1.id, toCloseAt: new Date(closeMs - 3 * 3_600_000).toISOString(), expectedClosesAt: moved, officerId: DRAFTER, now: nowOpen });
    } catch (e) { thrown = String((e as Error).message ?? e); } finally { marketStore.stamp = realStamp; }
    ok("5.12 · ⭐ a fault after the week's close was moved rolls the move back: the close and the market's cutoff agree, unmoved",
      thrown.includes("injected fault") && (await weekStore.get(w1.id))!.closesAt === moved && (await marketStore.get(w1.marketId!))?.selectionClosedAt === moved,
      JSON.stringify({ thrown, closesAt: (await weekStore.get(w1.id))!.closesAt }));
  }
  const early = await svc.closeWeek({ weekId: w1.id, now: nowOpen });
  ok("5.5 · ⛔ the tick cannot close before the close", !early.ok);
  const at = new Date(closeMs - 2 * 3_600_000);
  const closed = await spied(() => svc.closeWeek({ weekId: w1.id, now: at }));
  ok("5.6 · at the close: CLOSED, the empty week's commitment stamped (0 tickets, the empty root)", closed.ok && closed.week.state === "CLOSED" && closed.week.ticketCount === 0
    && closed.week.ticketMerkleRoot === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" && closed.week.salesAtClose === 0, JSON.stringify(closed.ok ? closed.week : closed));
  ok("5.6b · ⭐ the close's audit row and its pool notice each come once — on PostgreSQL only after its transaction committed (S5-FIX-SRV)", afterItsCommit("maswali.week.closed", w1.id) && notedAfterItsCommit(w1.id), JSON.stringify({ auditSites, poolSites }));
  const twice = await svc.closeWeek({ weekId: w1.id, now: at });
  ok("5.7 · a second close is a no-op that says so (exactly once)", twice.ok && twice.already === true);
  ok("5.8 · ⛔ the close can never move once passed", !(await svc.moveClose({ weekId: w1.id, toCloseAt: new Date(closeMs).toISOString(), expectedClosesAt: (await weekStore.get(w1.id))!.closesAt, officerId: DRAFTER, now: at })).ok);
  // The data layer's own claim, beneath the service's state check: a second stamp must lose, or a race could re-commit.
  ok("5.9 · ⛔ a second stampClose loses the claim (exactly once, in the store itself)",
    (await weekStore.stampClose(w1.id, { closedAt: at.toISOString(), ticketCount: 99, salesAtClose: 99_000, ticketMerkleRoot: "f".repeat(64) })) === false
    && (await weekStore.get(w1.id))!.ticketCount === 0);
}

// ── §6 · sealing ────────────────────────────────────────────────────────────
console.log("\n§6 · sealing");
const afterClose = new Date(Date.parse((await weekStore.get(w1.id))!.closesAt) + 3_600_000);
{
  const q1 = (await questionStore.listForWeek(w1.id))[0];
  const noEv = await svc.sealQuestion({ weekId: w1.id, slot: 1, outcome: "YES", evidence: "ok", officerId: SEALER, now: afterClose });
  ok("6.1 · ⛔ a seal without evidence is refused", !noEv.ok && /evidence/.test(errOf(noEv)));
  const voidNoGround = await svc.sealQuestion({ weekId: w1.id, slot: 1, outcome: "VOID", evidence: "the match was not played at all", officerId: SEALER, now: afterClose });
  ok("6.2 · ⛔ a void without a ground from the closed list is refused", !voidNoGround.ok && /closed list/.test(errOf(voidNoGround)));
  const early = await svc.sealQuestion({ weekId: w1.id, slot: 1, outcome: "VOID", voidReason: "not_played", evidence: "the match was not played at all", officerId: SEALER, now: afterClose });
  ok("6.3 · ⛔ 'not played' before the void deadline is refused (MR-15)", !early.ok && /void deadline/.test(errOf(early)), errOf(early));
  // A ticket holder may not seal. ⚠️ MEMORY ONLY: on Postgres a ticket row needs a real Position (a foreign key), and
  // positions are bought through S3's money path — whose suite proves the same refusal with real tickets on Postgres.
  if (STORE === "memory") {
    await ticketStore.create({ id: "tk_officer", positionId: "pos_officer", cycleId: w1.id, userId: OTHER, serial: "MLN-T-1", selections: Array(15).fill("YES"),
      salt: "0".repeat(32), selectionsHash: "a".repeat(64), picksKey: "b".repeat(64), status: "LIVE", cancelledAt: null, closeAtPurchase: w1.closesAt,
      rulesVersion: "v1", score: null, won: null, payout: null, frozenReason: null, lastViewedAt: null, createdAt: nowOpen.toISOString() });
    const holder = await svc.sealQuestion({ weekId: w1.id, slot: 1, outcome: "YES", evidence: "Final score 2-1, official site", officerId: OTHER, now: afterClose });
    ok("6.4 · ⛔ an officer holding a ticket in the week cannot seal it", !holder.ok && /holds a ticket/.test(errOf(holder)));
  }
  const s1 = await svc.sealQuestion({ weekId: w1.id, slot: 1, outcome: "YES", evidence: "Final score 2-1, official site", officerId: SEALER, now: afterClose });
  ok("6.5 · a seal lands and the week is RESOLVING", s1.ok && (await weekStore.get(w1.id))!.state === "RESOLVING", errOf(s1));
  ok("6.6 · ⛔ a second seal of the same question is refused (correction is its own act)", !(await svc.sealQuestion({ weekId: w1.id, slot: 1, outcome: "NO", evidence: "changed my mind about it", officerId: SEALER, now: afterClose })).ok);
  ok("6.7 · the seal is on the record", (await questionStore.get(q1.id))?.sealedBy === SEALER);
  for (let slot = 2; slot <= 10; slot++) await svc.sealQuestion({ weekId: w1.id, slot, outcome: slot % 2 ? "YES" : "NO", evidence: `Official result for event ${slot}`, officerId: SEALER, now: afterClose });
  const w = (await weekStore.get(w1.id))!;
  ok("6.8 · ⭐ ten mains sealed, none void: the graded set is final with the reserves still open (MR-19)", !!w.gradedSetFinalAt && !!w.objectionsCloseAt);
  const end = Date.parse(w.objectionsCloseAt!);
  ok("6.9 · the objection window is 24 h, never closing before 12:00 EAT (OD-05)", end === svc.objectionWindowEnd(afterClose.getTime(), 24, "12:00") && end >= afterClose.getTime() + 24 * 3_600_000);
  ok("6.10 · objectionWindowEnd: a window ending at 06:00 EAT is held to 12:00", svc.objectionWindowEnd(Date.parse("2026-11-01T03:00:00Z") - 24 * 3_600_000, 24, "12:00") === Date.parse("2026-11-01T09:00:00Z"));
  const q2 = (await questionStore.listForWeek(w1.id)).find((q) => q.slot === 2)!;
  const reviewed2 = { expectedOutcome: q2.outcome!, expectedSealedAt: q2.sealedAt! };
  const noCorrectionEvidence = await svc.correctSeal({ weekId: w1.id, slot: 2, outcome: "YES", evidence: "  ", ...reviewed2, officerId: SEALER, now: afterClose });
  ok("6.10a · ⛔ a correction without evidence is refused before touching the seal",
    !noCorrectionEvidence.ok && /evidence/.test(errOf(noCorrectionEvidence)) && (await questionStore.get(q2.id))?.outcome === "NO");
  // A throw is no refusal: with the closed-list check gone, the grader throws on "MAYBE" inside the correction, and an
  // uncaught throw here killed the child before this case printed (red-maswali-engine (22) was a WRONG-ASSERTION, on
  // 8c468393b too). Caught, the case reports the defect itself.
  const invalidCorrectionOutcome = await svc.correctSeal({ weekId: w1.id, slot: 2, outcome: "MAYBE" as never, evidence: "Official corrected result", ...reviewed2, officerId: SEALER, now: afterClose })
    .catch((e: unknown) => ({ ok: true as const, error: `THREW ${String((e as Error)?.message ?? e)}` }));
  ok("6.10b · ⛔ an outcome outside YES, NO, VOID cannot be corrected into the record",
    !invalidCorrectionOutcome.ok && /YES, NO or VOID/.test(errOf(invalidCorrectionOutcome)) && (await questionStore.get(q2.id))?.outcome === "NO");
  const prematureCorrectionVoid = await svc.correctSeal({ weekId: w1.id, slot: 2, outcome: "VOID", voidReason: "not_played", evidence: "Official source still awaits the event", ...reviewed2, officerId: SEALER, now: afterClose });
  ok("6.10c · ⛔ a correction cannot use not-played before its void deadline",
    !prematureCorrectionVoid.ok && /void deadline/.test(errOf(prematureCorrectionVoid)) && (await questionStore.get(q2.id))?.outcome === "NO");
  const nonVoidGround = await svc.correctSeal({ weekId: w1.id, slot: 2, outcome: "YES", voidReason: "not_played", evidence: "Official corrected result", ...reviewed2, officerId: SEALER, now: afterClose });
  ok("6.10d · ⛔ a YES correction cannot carry a VOID ground",
    !nonVoidGround.ok && /Only a VOID/.test(errOf(nonVoidGround)) && (await questionStore.get(q2.id))?.outcome === "NO");
  const wrongOfficer = await svc.correctSeal({ weekId: w1.id, slot: 2, outcome: "YES", evidence: "I read it differently", ...reviewed2, officerId: READER, now: afterClose });
  ok("6.11 · ⛔ only the sealer may correct a seal (OD-09)", !wrongOfficer.ok && /Only the officer who sealed/.test(errOf(wrongOfficer)));
  const q3 = (await questionStore.listForWeek(w1.id)).find((q) => q.slot === 3)!;
  const reviewed3 = { expectedOutcome: q3.outcome!, expectedSealedAt: q3.sealedAt! };
  const sameSealClock = new Date(q3.sealedAt!);
  const raced = await Promise.all([
    svc.correctSeal({ weekId: w1.id, slot: 3, outcome: reviewed3.expectedOutcome, evidence: "Corrected evidence from the official source", ...reviewed3, officerId: SEALER, now: sameSealClock }),
    svc.correctSeal({ weekId: w1.id, slot: 3, outcome: reviewed3.expectedOutcome, evidence: "Second review of the same stale seal", ...reviewed3, officerId: SEALER, now: sameSealClock }),
  ]);
  ok("6.11a · ⛔ concurrent corrections of one reviewed seal land exactly once",
    raced.filter((r) => r.ok).length === 1 && raced.filter((r) => !r.ok).every((r) => /seal changed/.test(errOf(r)))
      && (await questionStore.get(q3.id))?.outcome === reviewed3.expectedOutcome && Date.parse((await questionStore.get(q3.id))?.sealedAt ?? "") > sameSealClock.getTime());
  const afterRace = (await weekStore.get(w1.id))!;
  ok("6.11b · ⭐ the landed correction made the graded set final again, in the same commit: its window restarted (OD-09)",
    !!afterRace.gradedSetFinalAt && !!afterRace.objectionsCloseAt && Date.parse(afterRace.gradedSetFinalAt) === sameSealClock.getTime(),
    JSON.stringify({ gradedSetFinalAt: afterRace.gradedSetFinalAt, objectionsCloseAt: afterRace.objectionsCloseAt }));
  const fix = await svc.correctSeal({ weekId: w1.id, slot: 2, outcome: "YES", evidence: "Corrected: the source updated its final score", ...reviewed2, officerId: SEALER, now: new Date(afterClose.getTime() + 3_600_000) });
  const w2c = (await weekStore.get(w1.id))!;
  ok("6.12 · the sealer's correction lands inside the window and RESTARTS it", fix.ok && Date.parse(w2c.objectionsCloseAt!) > end, errOf(fix));
  const replay = await svc.correctSeal({ weekId: w1.id, slot: 2, outcome: "YES", evidence: "Replayed correction must not record twice", ...reviewed2, officerId: SEALER, now: new Date(afterClose.getTime() + 3_600_001) });
  ok("6.12a · ⛔ replaying a reviewed correction cannot write or restart the window twice",
    !replay.ok && /seal changed/.test(errOf(replay)) && (await weekStore.get(w1.id))?.objectionsCloseAt === w2c.objectionsCloseAt);
  await auditFlush();
  const correctedAudit = (await getAuditByActionsDurable(["maswali.question.corrected"], { limit: 200 })).entries
    .filter((entry) => entry.targetId === q2.id || entry.targetId === q3.id);
  ok("6.12b · ⭐ each landed correction is audited once, and refusals leave no audit",
    correctedAudit.length === 2 && correctedAudit.every((entry) => entry.actorId === SEALER));
  const corrected2 = (await questionStore.get(q2.id))!;
  ok("6.13 · ⛔ no correction once the window has closed", !(await svc.correctSeal({ weekId: w1.id, slot: 2, outcome: "NO", evidence: "too late for this one", expectedOutcome: corrected2.outcome!, expectedSealedAt: corrected2.sealedAt!, officerId: SEALER, now: new Date(Date.parse(w2c.objectionsCloseAt!) + 1) })).ok);

  // ── S5-FIX-SRV 2 · a seal, a correction: refused before any write, or landed whole ────────────────
  const inWindow = new Date(afterClose.getTime() + 2 * 3_600_000);
  const q4 = (await questionStore.listForWeek(w1.id)).find((q) => q.slot === 4)!;
  const weekBefore = (await weekStore.get(w1.id))!;
  /** The week's frozen rules made unreadable (a snapshot version this build cannot read), on this store's own row. */
  const setRulesVersion = async (v: number) => {
    if (STORE === "memory") {
      const row = (globalThis as { __50PICK_MLN_WEEKS?: Map<string, { rulesSnapshot: Record<string, unknown> }> }).__50PICK_MLN_WEEKS!.get(w1.id)!;
      row.rulesSnapshot = { ...row.rulesSnapshot, v };
    } else {
      const { prisma } = await import("../../src/lib/server/prisma.ts");
      await prisma()!.$executeRaw`UPDATE "MaswaliCycle" SET "rulesSnapshot" = jsonb_set("rulesSnapshot", '{v}', to_jsonb(${v}::int)) WHERE "id" = ${w1.id}`;
    }
  };
  /** A call that must REFUSE: a throw is not a refusal (the officer would read "could not be recorded"). */
  const settled = async (fn: () => Promise<{ ok: boolean; error?: string }>) => { try { return await fn(); } catch (e) { return { ok: true, error: `THREW ${String((e as Error).message ?? e)}` }; } };
  const correctedRows = async () => { await auditFlush(); return (await getAuditByActionsDurable(["maswali.question.corrected"], { limit: 500 })).entries.filter((entry) => entry.targetId === q4.id).length; };
  const auditBefore = await correctedRows();
  await setRulesVersion(99);
  try {
    ok("6.14 · premise · the week's frozen rules are now unreadable", svc.frozenRules((await weekStore.get(w1.id))!) === null);
    const unreadCorrection = await settled(() => svc.correctSeal({ weekId: w1.id, slot: 4, outcome: "YES", evidence: "Corrected: the source revised its result", expectedOutcome: q4.outcome!, expectedSealedAt: q4.sealedAt!, officerId: SEALER, now: inWindow }));
    const q4After = (await questionStore.get(q4.id))!, weekAfter = (await weekStore.get(w1.id))!;
    ok("6.14a · ⛔ a correction whose restarted window cannot be read is REFUSED before any write — the result, its window and the audit untouched",
      !unreadCorrection.ok && /frozen rules cannot be read/.test(unreadCorrection.error ?? "") && q4After.outcome === q4.outcome && q4After.sealedAt === q4.sealedAt
        && weekAfter.gradedSetFinalAt === weekBefore.gradedSetFinalAt && weekAfter.objectionsCloseAt === weekBefore.objectionsCloseAt && (await correctedRows()) === auditBefore,
      JSON.stringify({ r: unreadCorrection, outcome: q4After.outcome, window: weekAfter.objectionsCloseAt }));
    const unreadSeal = await settled(() => svc.sealQuestion({ weekId: w1.id, slot: 12, outcome: "YES", evidence: "Official result for reserve 2", officerId: SEALER, now: inWindow }));
    ok("6.14b · ⛔ …and so is a seal: nothing is written on a week whose frozen rules cannot be read",
      !unreadSeal.ok && /frozen rules cannot be read/.test(unreadSeal.error ?? "") && (await questionStore.listForWeek(w1.id)).find((q) => q.slot === 12)?.outcome === null,
      JSON.stringify(unreadSeal));
  } finally {
    await setRulesVersion(1);
  }
  ok("6.14c · premise · the rules read again", svc.frozenRules((await weekStore.get(w1.id))!) !== null);

  // ⭐ The behavioural proof of the one transaction needs a real one: the memory store has none to roll back.
  if (STORE === "postgres") {
    const realPatch = weekStore.patch;
    let patches = 0;
    weekStore.patch = async (...args: Parameters<typeof realPatch>) => {
      patches++;
      if (patches === 2) throw new Error("injected fault: the connection dropped at the restarted window's stamp");
      return realPatch.apply(weekStore, args);
    };
    let thrown = "";
    try {
      await svc.correctSeal({ weekId: w1.id, slot: 4, outcome: "YES", evidence: "Corrected: the source revised its result", expectedOutcome: q4.outcome!, expectedSealedAt: q4.sealedAt!, officerId: SEALER, now: inWindow });
    } catch (e) { thrown = String((e as Error).message ?? e); } finally { weekStore.patch = realPatch; }
    const q4After = (await questionStore.get(q4.id))!, weekAfter = (await weekStore.get(w1.id))!;
    ok("6.15 · ⭐ a fault after the corrected result and the window reset were written rolls the WHOLE correction back — the result, its window, and no audit row",
      thrown.includes("injected fault") && patches === 2 && q4After.outcome === q4.outcome && q4After.sealedAt === q4.sealedAt
        && weekAfter.gradedSetFinalAt === weekBefore.gradedSetFinalAt && weekAfter.objectionsCloseAt === weekBefore.objectionsCloseAt && (await correctedRows()) === auditBefore,
      JSON.stringify({ thrown, patches, outcome: q4After.outcome, gradedSetFinalAt: weekAfter.gradedSetFinalAt, window: weekAfter.objectionsCloseAt }));
  }

  // The act's audit rows are written after its commit, and it says whether they landed.
  svc.__setMaswaliAuditWriterForTests(async (row) => ({ recorded: row.action !== "maswali.question.corrected" }));
  let unrecordedFix: Awaited<ReturnType<typeof svc.correctSeal>>;
  try {
    unrecordedFix = await svc.correctSeal({ weekId: w1.id, slot: 4, outcome: "YES", evidence: "Corrected: the source revised its result", expectedOutcome: q4.outcome!, expectedSealedAt: q4.sealedAt!, officerId: SEALER, now: inWindow });
  } finally { svc.__setMaswaliAuditWriterForTests(null); }
  const q4Fixed = (await questionStore.get(q4.id))!, weekFixed = (await weekStore.get(w1.id))!;
  ok("6.16 · ⭐ a correction whose audit row was not written still landed whole — its window restarted — and says recorded: false",
    unrecordedFix.ok && unrecordedFix.recorded === false && q4Fixed.outcome === "YES" && !!weekFixed.objectionsCloseAt
      && Date.parse(weekFixed.objectionsCloseAt!) > Date.parse(weekBefore.objectionsCloseAt!), JSON.stringify({ r: unrecordedFix, window: weekFixed.objectionsCloseAt }));
  const fixBack = await svc.correctSeal({ weekId: w1.id, slot: 4, outcome: "NO", evidence: "Corrected back: the source's final reading", expectedOutcome: "YES", expectedSealedAt: q4Fixed.sealedAt!, officerId: SEALER, now: new Date(inWindow.getTime() + 60_000) });
  ok("6.16b · control · with the writer back, a correction says recorded: true", fixBack.ok && fixBack.recorded === true, JSON.stringify(fixBack));
}

// ── §7 · two officers ───────────────────────────────────────────────────────
console.log("\n§7 · the two-officer flag");
{
  // ⭐ S5-FIX-SRV A9 (S7-F2's port) · the setting is read, or the seal refuses — never single-officer by default.
  const unsealed12 = async () => (await questionStore.listForWeek(w1.id)).find((q) => q.slot === 12)!;
  const thrownRead = await svc.sealQuestion({ weekId: w1.id, slot: 12, outcome: "YES", evidence: "Official result for reserve 2", officerId: SEALER, now: afterClose,
    twoOfficerNow: async () => { throw new Error("injected settings outage"); } });
  ok("7.0a · ⛔ a two-officer setting whose read throws refuses the seal, and nothing is sealed (A9: fail closed)",
    !thrownRead.ok && /two-officer setting could not be read/.test(errOf(thrownRead)) && (await unsealed12()).outcome === null, errOf(thrownRead));
  const unansweredRead = await svc.sealQuestion({ weekId: w1.id, slot: 12, outcome: "YES", evidence: "Official result for reserve 2", officerId: SEALER, now: afterClose,
    twoOfficerNow: async () => null });
  ok("7.0b · ⛔ …and so does a read that has not answered (null), never the single-officer default",
    !unansweredRead.ok && /two-officer setting could not be read/.test(errOf(unansweredRead)) && (await unsealed12()).outcome === null, errOf(unansweredRead));
  await setRequireTwoOfficerResolution(true, OWNER);
  const s = await svc.sealQuestion({ weekId: w1.id, slot: 11, outcome: "YES", evidence: "Official result for reserve 1", officerId: SEALER, now: afterClose });
  const q = (await questionStore.listForWeek(w1.id)).find((x) => x.slot === 11)!;
  ok("7.1 · with the flag on, the seal records stage 1 and waits", s.ok && q.twoOfficerAtStage1 === true && q.stage2By === null);
  const reviewed = { expectedOutcome: "YES" as const, expectedSealedAt: q.sealedAt! };
  ok("7.2 · ⛔ a changed outcome cannot be confirmed from a stale review",
    !(await svc.confirmSeal({ weekId: w1.id, slot: 11, officerId: READER, expectedOutcome: "NO", expectedSealedAt: q.sealedAt! })).ok
      && (await questionStore.get(q.id))?.stage2By === null);
  ok("7.3 · ⛔ even a same-outcome reseal invalidates the reviewed timestamp",
    !(await svc.confirmSeal({ weekId: w1.id, slot: 11, officerId: READER, expectedOutcome: "YES", expectedSealedAt: "2020-01-01T00:00:00.000Z" })).ok
      && (await questionStore.get(q.id))?.stage2By === null);
  ok("7.4 · ⛔ the sealer cannot confirm their own seal", !(await svc.confirmSeal({ weekId: w1.id, slot: 11, officerId: SEALER, ...reviewed })).ok);
  ok("7.5 · a second officer confirms exactly the seal they reviewed", (await svc.confirmSeal({ weekId: w1.id, slot: 11, officerId: READER, ...reviewed })).ok);
  const q1 = (await questionStore.listForWeek(w1.id)).find((x) => x.slot === 1)!;
  ok("7.6 · a seal made with the flag off needs no second officer", !(await svc.confirmSeal({ weekId: w1.id, slot: 1, officerId: READER, expectedOutcome: q1.outcome!, expectedSealedAt: q1.sealedAt! })).ok);
  await setRequireTwoOfficerResolution(false, OWNER);

  const device = (slots: number[], ip: string) => noteSealDevice({ officerId: SEALER, weekId: w1.id, slots, ip, userAgent: "maswali-batch-test" });
  const first = await applySealBatch([
    { slot: 13, outcome: "YES" as const, evidence: "Official result for reserve 3" },
    { slot: 11, outcome: "NO" as const, evidence: "Already sealed reserve 1" },
  ], (row) => svc.sealQuestion({ weekId: w1.id, ...row, officerId: SEALER, now: afterClose }),
  (slots) => device(slots, "198.51.100.121"), () => "Unexpected seal error");
  ok("7.7 · ⛔ a later service refusal reports exactly the first landed slot, naming the refused one as the console does (A1, never \"Slot 11\")",
    !first.ok && first.sealed.length === 1 && first.sealed[0] === 13 && /^A1 is already sealed/.test(errOf(first)) && !/Slot 11/.test(errOf(first))
      && (await questionStore.listForWeek(w1.id)).find((x) => x.slot === 13)?.outcome === "YES", errOf(first));
  await auditFlush();
  const deviceRows = (await recentNewDeviceSeals(200))?.filter((row) => row.officerId === SEALER && row.weekId === w1.id) ?? [];
  const deviceAudit = (await getAuditByActionsDurable([SEAL_DEVICE_ACTION, SEAL_NEW_DEVICE_ACTION], { limit: 200 })).entries
    .filter((entry) => entry.actorId === SEALER && entry.targetId === w1.id && entry.ip === "198.51.100.121");
  ok("7.8 · ⭐ a partial batch still records exactly the successful slot in both device audits",
    deviceRows.length === 1 && deviceRows[0].firstSeal && deviceAudit.length === 2
      && deviceAudit.some((entry) => entry.category === "ADMIN" && entry.action === SEAL_DEVICE_ACTION)
      && deviceAudit.some((entry) => entry.category === "COMPLIANCE" && entry.action === SEAL_NEW_DEVICE_ACTION)
      && deviceAudit.every((entry) => JSON.stringify(entry.payload?.slots) === "[13]"));
  const remaining = withoutSealedPicks({ 13: "landed", 11: "refused", 15: "unattempted" }, first.sealed);
  ok("7.9 · the form clears only landed picks; refused and unattempted values survive",
    !(13 in remaining) && remaining[11] === "refused" && remaining[15] === "unattempted");

  const second = await applySealBatch([
    { slot: 14, outcome: "YES" as const, evidence: "Official result for reserve 4" },
    { slot: 15, outcome: "NO" as const, evidence: "Official result for reserve 5" },
  ], (row) => row.slot === 15 ? Promise.reject(new Error("Injected failure after first seal"))
    : svc.sealQuestion({ weekId: w1.id, ...row, officerId: SEALER, now: afterClose }),
  (slots) => device(slots, "198.51.100.122"), () => "The second call threw");
  ok("7.10 · ⛔ a throw after one success still reports only the landed slot",
    !second.ok && second.sealed.length === 1 && second.sealed[0] === 14 && /^A5: The second call threw/.test(errOf(second))
      && (await questionStore.listForWeek(w1.id)).find((x) => x.slot === 14)?.outcome === "YES");
  await auditFlush();
  const twoDevices = (await recentNewDeviceSeals(200))?.filter((row) => row.officerId === SEALER && row.weekId === w1.id) ?? [];
  const thrownDeviceAudit = (await getAuditByActionsDurable([SEAL_DEVICE_ACTION, SEAL_NEW_DEVICE_ACTION], { limit: 200 })).entries
    .filter((entry) => entry.actorId === SEALER && entry.targetId === w1.id && entry.ip === "198.51.100.122");
  ok("7.11 · ⭐ a thrown later seal still records exactly the earlier slot in both device audits",
    twoDevices.length === 2 && thrownDeviceAudit.length === 2
      && thrownDeviceAudit.every((entry) => JSON.stringify(entry.payload?.slots) === "[14]"));
  const deviceFailed = await applySealBatch([{ slot: 99 }], async () => ({ ok: true }), async () => { throw new Error("audit unavailable"); }, () => "Seal failed");
  ok("7.12 · a device-note failure does not erase landed slot identity or claim a complete audit",
    deviceFailed.ok && deviceFailed.sealed[0] === 99 && !!deviceFailed.auditWarning);
  const actionSource = readFileSync("src/app/admin/maswali/actions.ts", "utf8");
  ok("7.13 · the real admin action gives the batch helper every successful slot for device audit",
    actionSource.includes("const result = await applySealBatch(rows,")
      && actionSource.includes("(sealed) => noteDevice(session.userId, weekId, sealed)"));
  const consoleSource = readFileSync("src/app/admin/maswali/[weekId]/week-controls.tsx", "utf8");
  ok("7.14 · the real seal form clears only returned successes and excludes newly sealed rows",
    consoleSource.includes("withoutSealedPicks(current, result.sealed)")
      && consoleSource.includes("row.slot === Number(slot) && row.outcome === null"));
  ok("7.15 · ⛔ a malformed row or non-string evidence is rejected before any seal",
    typeof parseSealRows('[null]') === "string"
      && typeof parseSealRows('[{"slot":1,"outcome":"YES","evidence":null}]') === "string"
      && typeof parseSealRows('[{"slot":1,"outcome":{},"evidence":"Official record"}]') === "string");
  ok("7.16 · ⛔ only integer question slots 1 through 15 are accepted",
    typeof parseSealRows('[{"slot":0,"outcome":"YES","evidence":"Official record"}]') === "string"
      && typeof parseSealRows('[{"slot":16,"outcome":"YES","evidence":"Official record"}]') === "string"
      && typeof parseSealRows('[{"slot":1.5,"outcome":"YES","evidence":"Official record"}]') === "string");
  // ⭐ S5-FIX-SRV A7 · a cache refresh that throws after the commit never reports the committed act as failed. Each action's
  //    body sits in a try whose catch answers "could not be recorded", so every `refresh(…)` must be the ONLY statement of its
  //    own try, with an empty catch — read from the syntax tree, every call counted.
  const tsMod = (await import("typescript")).default;
  const actionTree = tsMod.createSourceFile("actions.ts", actionSource, tsMod.ScriptTarget.Latest, true);
  const refreshCalls: Array<{ line: number; guarded: boolean }> = [];
  const visit = (n: import("typescript").Node) => {
    if (tsMod.isCallExpression(n) && tsMod.isIdentifier(n.expression) && n.expression.text === "refresh") {
      const stmt = n.parent, block = stmt?.parent, tryStmt = block?.parent;
      const guarded = !!stmt && tsMod.isExpressionStatement(stmt) && !!block && tsMod.isBlock(block) && block.statements.length === 1
        && !!tryStmt && tsMod.isTryStatement(tryStmt) && tryStmt.tryBlock === block && !!tryStmt.catchClause && tryStmt.catchClause.block.statements.length === 0;
      refreshCalls.push({ line: actionTree.getLineAndCharacterOfPosition(n.getStart()).line + 1, guarded });
    }
    n.forEachChild(visit);
  };
  visit(actionTree);
  ok("7.25 · ⛔ every refresh after a committed act sits alone in its own try: a failed refresh never reports the act as failed (A7)",
    refreshCalls.length >= 9 && refreshCalls.every((c) => c.guarded), JSON.stringify(refreshCalls.filter((c) => !c.guarded)));
  ok("7.17 · ⛔ duplicate slots cannot partially seal the same question twice",
    typeof parseSealRows('[{"slot":1,"outcome":"YES","evidence":"Official record"},{"slot":1,"outcome":"NO","evidence":"Official record"}]') === "string"
      && parseSealRows('[{"slot":11,"outcome":"YES","evidence":"Official record"},{"slot":11,"outcome":"NO","evidence":"Official record"}]') === "A1 appears more than once.");
  ok("7.18 · the real admin action validates rows before the first irreversible seal",
    actionSource.includes('const rows = parseSealRows(str(formData, "seals"));')
      && actionSource.indexOf('const rows = parseSealRows(str(formData, "seals"));') < actionSource.indexOf("const result = await applySealBatch(rows,"));
  const unrecorded = await applySealBatch([{ slot: 100 }], async () => ({ ok: true }), async () => false, () => "Seal failed");
  ok("7.19 · ⛔ a resolved but unrecorded device audit leaves the landed seal successful and warns",
    unrecorded.ok && unrecorded.sealed[0] === 100 && !!unrecorded.auditWarning);
  const sealUnrecorded = await applySealBatch([{ slot: 101 }], async () => ({ ok: true, recorded: false }), async () => true, () => "Seal failed");
  ok("7.19b · ⛔ a landed seal whose own audit rows were not all written warns, though its device audit landed (S5-FIX-SRV 2)",
    sealUnrecorded.ok && sealUnrecorded.sealed[0] === 101 && sealUnrecorded.auditWarning === SEAL_AUDIT_WARNING, JSON.stringify(sealUnrecorded));
  const auditInput = { officerId: SEALER, weekId: w1.id, slots: [13], ip: "198.51.100.222", userAgent: "injected-device" };
  const written: string[] = [];
  const adminFailed = await noteSealDevice(auditInput, {
    history: async () => ({ seals: 0, fromDevice: 0 }),
    write: async (entry) => { written.push(entry.action); return { recorded: entry.action !== SEAL_DEVICE_ACTION }; },
  });
  ok("7.20 · ⛔ an ADMIN audit that resolves unrecorded cannot be reported as complete",
    !adminFailed && written.join(",") === `${SEAL_DEVICE_ACTION},${SEAL_NEW_DEVICE_ACTION}`);
  const complianceFailed = await noteSealDevice(auditInput, {
    history: async () => ({ seals: 0, fromDevice: 0 }),
    write: async (entry) => ({ recorded: entry.action !== SEAL_NEW_DEVICE_ACTION }),
  });
  ok("7.21 · ⛔ an unrecorded new-device COMPLIANCE row is a nonblocking incomplete audit", !complianceFailed);
  // ⭐ 7.22 · THE TRUE PREMISE (S5 review, findings 1 and A1): the history is the officer's OWN seal-device rows, counted
  //    exactly — an officer whose other audit rows outnumber any read window is still answered. The real readers, on both
  //    stores: under the old window over every action, the known device below read as "could not be checked" (a warning
  //    on every seal) and the new one raised nothing.
  const BUSY = "usr_busy_sealer";
  const busyNote = (ip: string, userAgent: string) => noteSealDevice({ officerId: BUSY, weekId: w1.id, slots: [12], ip, userAgent });
  const busyFirst = await busyNote("198.51.100.31", "busy-phone");
  await auditFlush();
  for (let i = 0; i < 501; i++) void audit({ category: "ADMIN", action: "maswali.test.officer_activity", actorId: BUSY, targetType: "MaswaliCycle", targetId: w1.id, payload: { i } });
  await auditFlush();
  const busyKnown = await busyNote("198.51.100.31", "busy-phone");
  await auditFlush();
  const busyNew = await busyNote("198.51.100.32", "busy-laptop");
  await auditFlush();
  const busyFlags = (await recentNewDeviceSeals(200))?.filter((row) => row.officerId === BUSY) ?? [];
  ok("7.22 · ⭐ an officer with more audit rows than any window: the known device needs no flag and no warning, a new one is flagged",
    busyFirst && busyKnown && busyNew && busyFlags.length === 2 && busyFlags.every((row) => row.kind === "new")
      && busyFlags[0].firstSeal === false && busyFlags[1].firstSeal === true, JSON.stringify({ busyFirst, busyKnown, busyNew, busyFlags }));
  const uncheckedActions: string[] = [];
  const unreadHistory = await noteSealDevice(auditInput, {
    history: async () => { throw new Error("injected history outage"); },
    write: async (entry) => { uncheckedActions.push(`${entry.category}:${entry.action}`); return { recorded: true }; },
  });
  ok("7.22b · ⛔ an unreadable history is never silence: a COMPLIANCE 'device unchecked' row, and the officer is warned",
    !unreadHistory && uncheckedActions.join(",") === `ADMIN:${SEAL_DEVICE_ACTION},COMPLIANCE:${SEAL_DEVICE_UNCHECKED_ACTION}`, uncheckedActions.join(","));
  const UNREAD = "usr_unread_sealer";
  await noteSealDevice({ officerId: UNREAD, weekId: w1.id, slots: [12], ip: "198.51.100.33", userAgent: "unread-device" },
    { history: async () => { throw new Error("injected history outage"); }, write: audit });
  await auditFlush();
  const unreadFlags = (await recentNewDeviceSeals(200))?.filter((row) => row.officerId === UNREAD) ?? [];
  ok("7.22c · ⛔ the integrity page's reader returns the unchecked seal, as unchecked",
    unreadFlags.length === 1 && unreadFlags[0].kind === "unchecked" && unreadFlags[0].weekId === w1.id, JSON.stringify(unreadFlags));
  const integrityPage = readFileSync("src/app/admin/maswali/integrity/page.tsx", "utf8").split("\r\n").join("\n");
  const allClearAt = integrityPage.indexOf("Every recent seal came from a device its officer had sealed from before.");
  ok("7.22d · …and the page names it, keeping the all-clear sentence for an empty list only",
    /d\.kind === "unchecked"\s*\?\s*<span className="text-warning"> · the device could not be checked against their earlier seals<\/span>/.test(integrityPage)
      && allClearAt > 0 && integrityPage.slice(allClearAt - 140, allClearAt).includes("newDevices.length === 0 ?"));
  const thrownAudit = await noteSealDevice(auditInput, {
    history: async () => ({ seals: 0, fromDevice: 0 }),
    write: async () => { throw new Error("injected audit outage"); },
  });
  ok("7.23 · an audit write throw is contained after the irreversible seal", !thrownAudit);
  ok("7.24 · successful void, correction and confirmation actions return the nonblocking audit warning — the device's and the act's own rows",
    actionSource.includes("return await noteSealDevice({ officerId, weekId, slots, ip: meta.ip, userAgent: meta.ua });")
      && actionSource.match(/auditWarning: audited && r\.recorded \? null : SEAL_AUDIT_WARNING/g)?.length === 2
      && actionSource.includes("auditWarning: r.recorded ? null : CONFIRM_AUDIT_WARNING")
      && consoleSource.includes("onWarning?.(r.auditWarning ?? null)")
      && consoleSource.match(/setVoidRow\(null\), setSealAuditWarning|setCorrectRow\(null\), setSealAuditWarning|setConfirmRow\(null\), setSealAuditWarning/g)?.length === 3);
}

// ── §8 · the week void ──────────────────────────────────────────────────────
console.log("\n§8 · ⭐ the week void");
{
  // The DRIVE week: open it and void six mains before its close — sales must stop at once.
  const drive = (await weekStore.list({ visibility: "DRIVE" }))[0];
  await attest(drive.id, READER);
  const o = await svc.openWeek({ weekId: drive.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen });
  ok("8.1 · a DRIVE week opens beside the public one", o.ok, errOf(o));
  const yes = await svc.sealQuestion({ weekId: drive.id, slot: 1, outcome: "YES", evidence: "too early to know this", officerId: SEALER, now: nowOpen });
  ok("8.2 · ⛔ a YES before the close is refused", !yes.ok && /after the sales close/.test(errOf(yes)));
  for (let slot = 1; slot <= 6; slot++) {
    await svc.sealQuestion({ weekId: drive.id, slot, outcome: "VOID", voidReason: "criterion_wrong", evidence: `Criterion ${slot} is materially wrong (found before the close)`, officerId: SEALER, now: nowOpen });
  }
  const after6 = (await weekStore.get(drive.id))!;
  ok("8.3 · ⭐ six voided mains make the week void CERTAIN, and its sales stop at once (MR-18)", after6.state === "CLOSED" && !!after6.closedAt, after6.state);
  ok("8.4 · …the market's cutoff is now", (await marketStore.get(after6.marketId!))?.selectionClosedAt === nowOpen.toISOString());
  const tooSoon = await svc.voidWeek({ weekId: drive.id, now: nowOpen });
  ok("8.5 · ⛔ the void waits for the final record (the reserves are not all sealed)", !tooSoon.ok);
  for (let slot = 7; slot <= 15; slot++) await svc.sealQuestion({ weekId: drive.id, slot, outcome: "YES", evidence: `Official result for ${slot}`, officerId: SEALER, now: afterClose });
  const final = (await weekStore.get(drive.id))!;
  ok("8.6 · the record is final and the objection window is open", !!final.gradedSetFinalAt && !!final.objectionsCloseAt);
  const inWindow = await svc.voidWeek({ weekId: drive.id, now: afterClose });
  ok("8.7 · ⛔ the void waits for the objection window (an objection could reinstate a question)", !inWindow.ok && /objection window/.test(errOf(inWindow)));
  // ⭐ S5-FIX-SRV (finding 2's class, in the week void) · the decision takes the chain lock's transaction: a fault after it is
  //    stamped rolls it back, and its audit row follows the commit only (PostgreSQL: the memory store cannot roll back).
  if (STORE === "postgres") {
    // The fault fires on the first read AFTER the decision was stamped.
    const realGet = weekStore.get, realStampVoid = weekStore.stampVoid;
    let decided = false;
    weekStore.stampVoid = async (...args: Parameters<typeof realStampVoid>) => { const won = await realStampVoid.apply(weekStore, args); decided = won; return won; };
    weekStore.get = async (...args: Parameters<typeof realGet>) => {
      if (decided) throw new Error("injected fault: the connection dropped after the void's decision");
      return realGet.apply(weekStore, args);
    };
    let thrown = "";
    try { await svc.voidWeek({ weekId: drive.id, now: new Date(Date.parse(final.objectionsCloseAt!) + 1) }); }
    catch (e) { thrown = String((e as Error).message ?? e); } finally { weekStore.get = realGet; weekStore.stampVoid = realStampVoid; }
    await auditFlush();
    const voidedRows = (await getAuditByActionsDurable(["maswali.week.voided"], { limit: 500 })).entries.filter((e) => e.targetId === drive.id).length;
    const kept = (await weekStore.get(drive.id))!;
    ok("8.7b · ⭐ a fault after the week void's decision was stamped rolls it back — the week is not VOIDED, and no audit row says it was",
      thrown.includes("injected fault") && decided && kept.state === final.state && voidedRows === 0, JSON.stringify({ thrown, decided, state: kept.state, voidedRows }));
  }
  const v = await spied(() => svc.voidWeek({ weekId: drive.id, now: new Date(Date.parse(final.objectionsCloseAt!) + 1) }));
  ok("8.8 · after the window: VOIDED", v.ok && v.week.state === "VOIDED", errOf(v));
  ok("8.8b · ⭐ the void's audit row is written once — on PostgreSQL only after its decision committed (S5-FIX-SRV)", afterItsCommit("maswali.week.voided", drive.id), JSON.stringify(auditSites));
  const m = await marketStore.get(final.marketId!);
  ok("8.9 · the market is VOIDED with outcome VOID, settled by the week's bulk refund (R1)", m?.status === "VOIDED" && m.resolvedOutcome === "VOID" && !!m.settledAt, JSON.stringify({ s: m?.status, o: m?.resolvedOutcome, at: m?.settledAt }));
}

// ── §9 · the carry ──────────────────────────────────────────────────────────
console.log("\n§9 · the carry, in chain order");
{
  const third = (await weekStore.list({ visibility: "PUBLIC" })).find((w) => w.state === "DRAFT")!;
  const blocked = await svc.claimCarry({ weekId: third.id, readJackpot: async () => 300_000 });
  ok("9.1 · ⛔ a later week cannot claim while an earlier one is unsettled (MR-3)", !blocked.ok && /strictly in order/.test(errOf(blocked)), errOf(blocked));
  await weekStore.patch(w1.id, { state: "SETTLED", settledAt: afterClose.toISOString() });
  const blind = await svc.claimCarry({ weekId: third.id, readJackpot: async () => null });
  ok("9.2 · ⛔ an unreadable jackpot claims nothing", !blind.ok);
  // ⭐ S5-FIX-SRV (finding 2's class, in the carry) · the claim takes the chain lock's transaction: handed it, and rolled back
  //    with it when a fault follows — no carry and no audit row (PostgreSQL).
  if (STORE === "postgres") {
    const realClaim = weekStore.claimCarry;
    let handedTx = false;
    weekStore.claimCarry = async (...args: Parameters<typeof realClaim>) => {
      handedTx = !!args[2];
      await realClaim.apply(weekStore, args);
      throw new Error("injected fault: the connection dropped after the carry's claim");
    };
    let thrown = "";
    try { await svc.claimCarry({ weekId: third.id, readJackpot: async () => 300_000 }); }
    catch (e) { thrown = String((e as Error).message ?? e); } finally { weekStore.claimCarry = realClaim; }
    await auditFlush();
    const carryRows = (await getAuditByActionsDurable(["maswali.week.carry_claimed"], { limit: 500 })).entries.filter((e) => e.targetId === third.id).length;
    ok("9.2b · ⭐ the carry's claim is handed the chain lock's transaction, and a fault after it leaves no carry and no audit row",
      thrown.includes("injected fault") && handedTx && (await weekStore.get(third.id))!.rolloverIn === null && carryRows === 0,
      JSON.stringify({ thrown, handedTx, rolloverIn: (await weekStore.get(third.id))!.rolloverIn, carryRows }));
  }
  const c = await spied(() => svc.claimCarry({ weekId: third.id, readJackpot: async () => 300_000 }));
  ok("9.3 · once the earlier week is settled, the carry is claimed", c.ok && c.rolloverIn === 300_000 && !c.already);
  ok("9.3b · ⭐ the carry's audit row is written once — on PostgreSQL only after its claim committed (S5-FIX-SRV)", afterItsCommit("maswali.week.carry_claimed", third.id), JSON.stringify(auditSites));
  const again = await svc.claimCarry({ weekId: third.id, readJackpot: async () => 999_999 });
  ok("9.4 · ⭐ exactly once: a second claim returns the first figure", again.ok && again.rolloverIn === 300_000 && again.already === true);
  const late = await svc.sealQuestion({ weekId: w1.id, slot: 12, outcome: "YES", evidence: "Official result for reserve 2", officerId: SEALER, now: afterClose });
  ok("9.6 · ⛔ nothing can be sealed on a SETTLED week (a paid week is final)", !late.ok && /SETTLED/.test(errOf(late)), errOf(late));
  // ⭐ S5-FIX-SRV 4 · a seal still awaiting its second officer when the week settled cannot be confirmed afterwards: the
  //    confirmation would change the outcome the register published. (The marker set as a two-officer seal leaves it.)
  const q13 = (await questionStore.listForWeek(w1.id)).find((q) => q.slot === 13)!;
  await questionStore.patch(q13.id, { twoOfficerAtStage1: true, stage2By: null, stage2At: null });
  const settledConfirm = await svc.confirmSeal({ weekId: w1.id, slot: 13, officerId: READER, expectedOutcome: q13.outcome!, expectedSealedAt: q13.sealedAt!, now: afterClose });
  ok("9.7 · ⛔ a confirmation on a SETTLED week is refused, and the seal's record is unchanged (finding 4)",
    !settledConfirm.ok && /SETTLED; its seals are final/.test(errOf(settledConfirm)) && (await questionStore.get(q13.id))?.stage2By === null, errOf(settledConfirm));
  const driveWeeks = await weekStore.list({ visibility: "DRIVE" });
  ok("9.5 · the DRIVE chain is its own: the public week never waited on it", driveWeeks.length === 1 && driveWeeks[0].state === "VOIDED");
}

// ── §10 · config changes reach only the NEXT week ──────────────────────────
console.log("\n§10 · a config change applies from the next week");
{
  await saveMaswaliConfig({ ticketCapPerWeek: 7 }, DRAFTER);
  ok("10.1 · ⛔ an open week keeps its frozen cap", svc.frozenRules((await weekStore.get(w1.id))!)?.ticketCapPerWeek === 10);
  await saveMaswaliConfig({ ticketCapPerWeek: 10 }, DRAFTER);
}

// ── §11 · under the two-officer rule, the confirmation that makes the void certain stops the sales ─────────────────
console.log("\n§11 · a confirmed void stops the sales at once (S5-FIX-SRV 5)");
{
  // The week 4.5 drafted and attested (a standing attestation is never redone, 2.8h).
  const next = (await weekStore.list({ visibility: "PUBLIC", states: ["DRAFT"] }))[0];
  const opened2 = next ? await svc.openWeek({ weekId: next.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen }) : null;
  ok("11.0 · premise · the next public week, attested in 4.5, is on sale", next?.parityAttestedBy === READER && !!opened2?.ok, errOf(opened2 ?? { ok: false, error: "no draft" }));
  if (next && opened2?.ok) {
    await setRequireTwoOfficerResolution(true, OWNER);
    try {
      for (let slot = 1; slot <= 6; slot++) {
        await svc.sealQuestion({ weekId: next.id, slot, outcome: "VOID", voidReason: "criterion_wrong", evidence: `Criterion ${slot} is materially wrong (found before the close)`, officerId: SEALER, now: nowOpen });
      }
      ok("11.1 · six VOIDs sealed under the two-officer rule do not count yet: the week still sells",
        (await weekStore.get(next.id))!.state === "OPEN");
      const voids = (await questionStore.listForWeek(next.id)).filter((q) => q.slot <= 6);
      for (const q of voids.slice(0, 5)) await svc.confirmSeal({ weekId: next.id, slot: q.slot, officerId: READER, expectedOutcome: q.outcome!, expectedSealedAt: q.sealedAt!, now: nowOpen });
      ok("11.2 · …nor do five confirmed: one void short of certain, the week still sells", (await weekStore.get(next.id))!.state === "OPEN");
      // ⭐ S5-FIX-SRV (finding 2's class, in the close) · the commitment and the market's cutoff are ONE transaction: a fault
      //    after the cutoff was stamped rolls both back, so the week sells on, its market's cutoff is unmoved, and no audit
      //    row says it closed (PostgreSQL).
      if (STORE === "postgres") {
        const realStamp = marketStore.stamp, marketId = opened2.week.marketId!;
        const cutoff = (await marketStore.get(marketId))?.selectionClosedAt;
        let stamped = false;
        marketStore.stamp = async (...args: Parameters<typeof realStamp>) => {
          await realStamp.apply(marketStore, args);
          stamped = true;
          throw new Error("injected fault: the connection dropped after the early close's cutoff");
        };
        let thrown = "";
        try { await svc.closeWeek({ weekId: next.id, early: true, now: nowOpen }); }
        catch (e) { thrown = String((e as Error).message ?? e); } finally { marketStore.stamp = realStamp; }
        await auditFlush();
        const closedRows = (await getAuditByActionsDurable(["maswali.week.closed"], { limit: 500 })).entries.filter((e) => e.targetId === next.id).length;
        const still = (await weekStore.get(next.id))!, cutoffNow = (await marketStore.get(marketId))?.selectionClosedAt;
        ok("11.2b · ⭐ a fault after the early close's market cutoff rolls the commitment and the cutoff back — the week sells on, its market's cutoff unmoved, and no audit row says it closed",
          thrown.includes("injected fault") && stamped && still.state === "OPEN" && still.closedAt === null && !!cutoff && cutoffNow === cutoff && cutoff !== nowOpen.toISOString() && closedRows === 0,
          JSON.stringify({ thrown, stamped, state: still.state, cutoff, cutoffNow, closedRows }));
      }
      const sixth = voids[5];
      const last = await svc.confirmSeal({ weekId: next.id, slot: sixth.slot, officerId: READER, expectedOutcome: sixth.outcome!, expectedSealedAt: sixth.sealedAt!, now: nowOpen });
      const after = (await weekStore.get(next.id))!;
      ok("11.3 · ⭐ the sixth confirmation makes the week void certain and stops its sales at once, as a seal would (MR-18, finding 5)",
        last.ok && after.state === "CLOSED" && after.closedAt === nowOpen.toISOString()
          && (await marketStore.get(after.marketId!))?.selectionClosedAt === nowOpen.toISOString(), JSON.stringify({ last, state: after.state, closedAt: after.closedAt }));
    } finally {
      await setRequireTwoOfficerResolution(false, OWNER);
    }
  }
}

// ── §12 · the Owner's stop lands whole (S5-FIX-SRV, finding 2's class) ───────────────────────────────────────────────
console.log("\n§12 · the Owner's stop: its mark and its audit row land with its commit");
{
  const W5 = weekStartAhead(5);
  const drafted5 = await svc.createWeek({ weekStartMs: W5, questions: questions(W5), officerId: DRAFTER, now: nowDraft });
  ok("12.0 · premise · a public week drafted more than a full week ahead", drafted5.ok, errOf(drafted5));
  if (drafted5.ok) {
    const id5 = drafted5.week.id;
    const orderedRows = async () => {
      await auditFlush();
      return (await getAuditByActionsDurable(["maswali.sunset.ordered"], { limit: 500 })).entries.filter((e) => e.targetId === id5).length;
    };
    const stop = () => svc.sunsetMaswali({ weekId: id5, ownerId: OWNER, typed: svc.SUNSET_WORD, reason: "The Owner stops Millionea after this week (engine suite).", now: nowDraft });
    if (STORE === "postgres") {
      // The fault fires on the first read AFTER the final mark was written.
      const realGet = weekStore.get, realPatch = weekStore.patch;
      let marked = false;
      weekStore.patch = async (...args: Parameters<typeof realPatch>) => { await realPatch.apply(weekStore, args); if ((args[1] as { isFinal?: boolean }).isFinal) marked = true; };
      weekStore.get = async (...args: Parameters<typeof realGet>) => {
        if (marked) throw new Error("injected fault: the connection dropped after the final mark");
        return realGet.apply(weekStore, args);
      };
      let thrown = "";
      try { await stop(); } catch (e) { thrown = String((e as Error).message ?? e); } finally { weekStore.get = realGet; weekStore.patch = realPatch; }
      ok("12.1 · ⭐ a fault after the final mark was written rolls the stop back — the week is not final, and no audit row orders it",
        thrown.includes("injected fault") && marked && (await weekStore.get(id5))!.isFinal === false && (await orderedRows()) === 0, JSON.stringify({ thrown, marked, rows: await orderedRows() }));
    }
    const stopped = await spied(stop);
    ok("12.2 · control · the stop lands: the week is final, and the order is audited once, after its commit",
      stopped.ok && stopped.week.isFinal === true && (await weekStore.get(id5))!.isFinal === true && (await orderedRows()) === 1, errOf(stopped));
    ok("12.3 · ⭐ the order's audit row is written once — on PostgreSQL only after the mark committed", afterItsCommit("maswali.sunset.ordered", id5), JSON.stringify(auditSites));
  }
}

// ── §13 · the final role passes on inside the next open's transaction (S5-FIX-SRV, finding 2's class) ─────────────────
console.log("\n§13 · the final role passes on: the next week's open marks it final in the same transaction");
{
  // The final week (12.2) opens at its announced open, closes early, and voids — the void stamped by the store itself (a
  // fixture: this section is about the NEXT open). A final week that voided hands the role on (MR-30, OD-03).
  const W5 = weekStartAhead(5), W6 = weekStartAhead(6);
  const final5 = (await weekStore.list({ visibility: "PUBLIC" })).find((w) => w.isFinal);
  const attested5 = final5 ? await attest(final5.id, READER) : null;
  const open5 = final5 ? await svc.openWeek({ weekId: final5.id, officerId: DRAFTER, guarantee: RICH, now: new Date(W5 + 60_000) }) : null;
  const close5 = final5 ? await svc.closeWeek({ weekId: final5.id, early: true, now: new Date(W5 + 120_000) }) : null;
  const voided5 = final5 ? await weekStore.stampVoid(final5.id) : false;
  const life = await svc.sunsetState();
  const drafted6 = await svc.createWeek({ weekStartMs: W6, questions: questions(W6), officerId: DRAFTER, now: nowDraft });
  const attested6 = drafted6.ok ? await attest(drafted6.week.id, READER) : null;
  ok("13.0 · premise · the final week opened, closed and voided, so the role passes on; the next public week is drafted and attested",
    !!final5 && !!attested5?.ok && !!open5?.ok && !!close5?.ok && voided5 && life.kind === "PASSES_ON" && life.week.id === final5.id && drafted6.ok && !!attested6?.ok,
    JSON.stringify({ final5: final5?.code, attested5: errOf(attested5 ?? { ok: false, error: "none" }), open5: errOf(open5 ?? { ok: false, error: "none" }), close5: errOf(close5 ?? { ok: false, error: "none" }), voided5, life: life.kind, drafted6: errOf(drafted6), attested6: errOf(attested6 ?? { ok: false, error: "none" }) }));
  if (drafted6.ok && life.kind === "PASSES_ON") {
    const id6 = drafted6.week.id, title6 = `Maswali Millionea · ${drafted6.week.code}`;
    const rowsFor6 = async (action: string) => {
      await auditFlush();
      return (await getAuditByActionsDurable([action], { limit: 500 })).entries.filter((e) => e.targetId === id6).length;
    };
    const { prisma: pgClient } = await import("../../src/lib/server/prisma.ts");
    const markets6 = async () => (STORE === "postgres" ? pgClient()!.predictionMarket.count({ where: { productLine: "MASWALI", titleEn: title6 } }) : 0);
    const open6 = () => svc.openWeek({ weekId: id6, officerId: DRAFTER, guarantee: RICH, now: new Date(W6 + 60_000) });
    if (STORE === "postgres") {
      // The fault fires on the first read AFTER the open marked the week final.
      const realGet = weekStore.get, realPatch = weekStore.patch;
      let marked = false;
      weekStore.patch = async (...args: Parameters<typeof realPatch>) => { await realPatch.apply(weekStore, args); if ((args[1] as { isFinal?: boolean }).isFinal) marked = true; };
      weekStore.get = async (...args: Parameters<typeof realGet>) => {
        if (marked) throw new Error("injected fault: the connection dropped after the open's final mark");
        return realGet.apply(weekStore, args);
      };
      let thrown = "";
      try { await open6(); } catch (e) { thrown = String((e as Error).message ?? e); } finally { weekStore.get = realGet; weekStore.patch = realPatch; }
      const kept = (await weekStore.get(id6))!;
      ok("13.1 · ⭐ a fault after the open marked the week final rolls the WHOLE open back — still a DRAFT, not final, no market, and no audit row passes the role on",
        thrown.includes("injected fault") && marked && kept.state === "DRAFT" && kept.isFinal === false && kept.marketId === null && (await markets6()) === 0
          && (await rowsFor6("maswali.sunset.passed_on")) === 0 && (await rowsFor6("maswali.week.opened")) === 0,
        JSON.stringify({ thrown, marked, state: kept.state, isFinal: kept.isFinal, markets: await markets6(), passed: await rowsFor6("maswali.sunset.passed_on") }));
    }
    const passed = await spied(open6);
    ok("13.2 · control · the open lands and the week is the final week; the role's passing is audited once, after its commit (PostgreSQL: under no lock)",
      passed.ok && passed.week.state === "OPEN" && passed.week.isFinal === true && (await weekStore.get(id6))!.isFinal === true
        && afterItsCommit("maswali.sunset.passed_on", id6) && afterItsCommit("maswali.week.opened", id6) && (await rowsFor6("maswali.sunset.passed_on")) === 1,
      passed.ok ? JSON.stringify(auditSites) : errOf(passed));
  }
}

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
