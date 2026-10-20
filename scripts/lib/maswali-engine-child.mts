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
const { applySealBatch, parseSealRows, withoutSealedPicks } = await import("../../src/lib/maswali-seal-batch.ts");
const { noteSealDevice, recentNewDeviceSeals, SEAL_DEVICE_ACTION, SEAL_NEW_DEVICE_ACTION } = await import("../../src/lib/server/maswali-integrity.ts");
const { auditFlush, getAuditByActionsDurable } = await import("../../src/lib/server/audit.ts");
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
  ok("2.3 · ⛔ the drafter cannot attest their own translations", !(await svc.attestParity({ weekId: week.id, officerId: DRAFTER })).ok);
  ok("2.4 · a second reader attests", (await svc.attestParity({ weekId: week.id, officerId: READER })).ok);
  const poor = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: { balance: async () => 999_999 }, now: nowOpen });
  ok("2.5 · ⛔ a guarantee below the floor → refused (OD-02)", !poor.ok && /guarantee holds TZS 999,999/.test(errOf(poor)), errOf(poor));
  const blind = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: { balance: async () => null }, now: nowOpen });
  ok("2.6 · ⛔ an unreadable guarantee → refused", !blind.ok && /could not be read/.test(errOf(blind)));
  // The close guard: one event at 17:59 EAT on Friday, one minute before an 18:00 close.
  const closeMs = eatWeekAt(W2, 5, "18:00");
  const edit = await svc.editDraftQuestion({ weekId: week.id, slot: 3, changes: { eventLocalStart: utcToZonedLocal(closeMs - 60_000, "Africa/Dar_es_Salaam") }, officerId: DRAFTER });
  ok("2.7 · a draft question may be edited while DRAFT", edit.ok, errOf(edit));
  ok("2.8 · …and the edit cleared the parity attestation", (await weekStore.get(week.id))!.parityAttestedBy === null);
  await svc.attestParity({ weekId: week.id, officerId: READER });
  const guard = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen });
  ok("2.9 · ⛔ THE CLOSE GUARD: an event at 17:59 before an 18:00 close is refused (30-minute buffer, OD-15)", !guard.ok && /at least 30 minutes before the first event/.test(errOf(guard)), errOf(guard));
  const at1729 = await svc.editDraftQuestion({ weekId: week.id, slot: 3, changes: { eventLocalStart: utcToZonedLocal(closeMs + 29 * 60_000, "Africa/Dar_es_Salaam") }, officerId: DRAFTER });
  await svc.attestParity({ weekId: week.id, officerId: READER });
  const g29 = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen });
  ok("2.10 · ⛔ …and at 18:29, one minute inside the buffer, still refused", at1729.ok && !g29.ok && /30 minutes/.test(errOf(g29)));
  await svc.editDraftQuestion({ weekId: week.id, slot: 3, changes: { eventLocalStart: utcToZonedLocal(closeMs + 30 * 60_000, "Africa/Dar_es_Salaam") }, officerId: DRAFTER });
  await svc.editDraftQuestion({ weekId: week.id, slot: 4, changes: { probabilityEstimate: 0.9 }, officerId: DRAFTER });
  await svc.editDraftQuestion({ weekId: week.id, slot: 5, changes: { textEn: "Will the election be won by the incumbent?" }, officerId: DRAFTER });
  await svc.editDraftQuestion({ weekId: week.id, slot: 6, changes: { sourceUrl: "https://example.org/unknown" }, officerId: DRAFTER });
  await svc.attestParity({ weekId: week.id, officerId: READER });
  const many = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen });
  const e = errOf(many);
  ok("2.11 · ⛔ a probability outside 30–70% is refused (OD-14)", /outside 30–70%/.test(e), e);
  ok("2.12 · ⛔ a question about an election is refused in English (R-CATEGORIES)", /about politics \("election"\)/.test(e), e);
  ok("2.13 · ⛔ an untrusted source is refused", /not a trusted source/.test(e), e);
  ok("2.14 · …and an event exactly 30 minutes after the close is NOT refused (the buffer is inclusive)", !/30 minutes before the first event/.test(e), e);
  await svc.editDraftQuestion({ weekId: week.id, slot: 4, changes: { probabilityEstimate: 0.55 }, officerId: DRAFTER });
  await svc.editDraftQuestion({ weekId: week.id, slot: 5, changes: { textEn: "Will event 5 happen?" }, officerId: DRAFTER });
  await svc.editDraftQuestion({ weekId: week.id, slot: 6, changes: { sourceUrl: SOURCES[0].url, category: "sports" }, officerId: DRAFTER });
}

// ── §3 · the open ───────────────────────────────────────────────────────────
console.log("\n§3 · ⭐ the open");
await svc.attestParity({ weekId: week.id, officerId: READER });
const opened = await svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen });
const w1 = opened.ok ? opened.week : (null as never);
{
  ok("3.1 · it opens", opened.ok, errOf(opened));
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
  ok("4.1 · ⛔ a draft edit past DRAFT is refused", !(await svc.editDraftQuestion({ weekId: w1.id, slot: 1, changes: { textEn: "changed?" }, officerId: DRAFTER })).ok);
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
  if (second.ok) await svc.attestParity({ weekId: second.week.id, officerId: READER });
  const two = second.ok ? await svc.openWeek({ weekId: second.week.id, officerId: DRAFTER, guarantee: RICH, now: nowOpen }) : second;
  ok("4.5 · ⛔ a second PUBLIC week cannot open while one is open (MR-3)", second.ok && !two.ok && /Another public week is open/.test(errOf(two)), errOf(two));
}

// ── §5 · the close ──────────────────────────────────────────────────────────
console.log("\n§5 · the close");
{
  const closeMs = Date.parse(w1.closesAt);
  const soon = await svc.moveClose({ weekId: w1.id, toCloseAt: new Date(Date.parse(nowOpen.toISOString()) + 3 * 60_000).toISOString(), officerId: DRAFTER, now: nowOpen });
  ok("5.1 · ⛔ an earlier close inside the free-cancel window + 1 min is refused (MB-28)", !soon.ok && /6 minutes/.test(errOf(soon)), errOf(soon));
  const late = await svc.moveClose({ weekId: w1.id, toCloseAt: new Date(closeMs + 24 * 3_600_000).toISOString(), officerId: DRAFTER, now: nowOpen });
  ok("5.2 · ⛔ a later close past the first event − buffer is refused", !late.ok && /30 minutes before the first event/.test(errOf(late)), errOf(late));
  const earlier = await svc.moveClose({ weekId: w1.id, toCloseAt: new Date(closeMs - 2 * 3_600_000).toISOString(), officerId: DRAFTER, now: nowOpen });
  ok("5.3 · an earlier close two hours sooner is allowed", earlier.ok && Date.parse(earlier.week.closesAt) === closeMs - 2 * 3_600_000, errOf(earlier));
  ok("5.4 · …and the market's own cutoff follows it", (await marketStore.get(w1.marketId!))?.selectionClosedAt === new Date(closeMs - 2 * 3_600_000).toISOString());
  const early = await svc.closeWeek({ weekId: w1.id, now: nowOpen });
  ok("5.5 · ⛔ the tick cannot close before the close", !early.ok);
  const at = new Date(closeMs - 2 * 3_600_000);
  const closed = await svc.closeWeek({ weekId: w1.id, now: at });
  ok("5.6 · at the close: CLOSED, the empty week's commitment stamped (0 tickets, the empty root)", closed.ok && closed.week.state === "CLOSED" && closed.week.ticketCount === 0
    && closed.week.ticketMerkleRoot === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" && closed.week.salesAtClose === 0, JSON.stringify(closed.ok ? closed.week : closed));
  const twice = await svc.closeWeek({ weekId: w1.id, now: at });
  ok("5.7 · a second close is a no-op that says so (exactly once)", twice.ok && twice.already === true);
  ok("5.8 · ⛔ the close can never move once passed", !(await svc.moveClose({ weekId: w1.id, toCloseAt: new Date(closeMs).toISOString(), officerId: DRAFTER, now: at })).ok);
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
  const wrongOfficer = await svc.correctSeal({ weekId: w1.id, slot: 2, outcome: "YES", evidence: "I read it differently", officerId: READER, now: afterClose });
  ok("6.11 · ⛔ only the sealer may correct a seal (OD-09)", !wrongOfficer.ok && /Only the officer who sealed/.test(errOf(wrongOfficer)));
  const fix = await svc.correctSeal({ weekId: w1.id, slot: 2, outcome: "YES", evidence: "Corrected: the source updated its final score", officerId: SEALER, now: new Date(afterClose.getTime() + 3_600_000) });
  const w2c = (await weekStore.get(w1.id))!;
  ok("6.12 · the sealer's correction lands inside the window and RESTARTS it", fix.ok && Date.parse(w2c.objectionsCloseAt!) > end, errOf(fix));
  ok("6.13 · ⛔ no correction once the window has closed", !(await svc.correctSeal({ weekId: w1.id, slot: 2, outcome: "NO", evidence: "too late for this one", officerId: SEALER, now: new Date(Date.parse(w2c.objectionsCloseAt!) + 1) })).ok);
}

// ── §7 · two officers ───────────────────────────────────────────────────────
console.log("\n§7 · the two-officer flag");
{
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
  ok("7.7 · ⛔ a later service refusal reports exactly the first landed slot",
    !first.ok && first.sealed.length === 1 && first.sealed[0] === 13 && /Slot 11/.test(errOf(first))
      && (await questionStore.listForWeek(w1.id)).find((x) => x.slot === 13)?.outcome === "YES");
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
    !second.ok && second.sealed.length === 1 && second.sealed[0] === 14 && /Slot 15: The second call threw/.test(errOf(second))
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
  ok("7.17 · ⛔ duplicate slots cannot partially seal the same question twice",
    typeof parseSealRows('[{"slot":1,"outcome":"YES","evidence":"Official record"},{"slot":1,"outcome":"NO","evidence":"Official record"}]') === "string");
  ok("7.18 · the real admin action validates rows before the first irreversible seal",
    actionSource.includes('const rows = parseSealRows(str(formData, "seals"));')
      && actionSource.indexOf('const rows = parseSealRows(str(formData, "seals"));') < actionSource.indexOf("const result = await applySealBatch(rows,"));
  const unrecorded = await applySealBatch([{ slot: 100 }], async () => ({ ok: true }), async () => false, () => "Seal failed");
  ok("7.19 · ⛔ a resolved but unrecorded device audit leaves the landed seal successful and warns",
    unrecorded.ok && unrecorded.sealed[0] === 100 && !!unrecorded.auditWarning);
  const auditInput = { officerId: SEALER, weekId: w1.id, slots: [13], ip: "198.51.100.222", userAgent: "injected-device" };
  const written: string[] = [];
  const adminFailed = await noteSealDevice(auditInput, {
    read: async () => ({ entries: [], truncated: false }),
    write: async (entry) => { written.push(entry.action); return { recorded: entry.action !== SEAL_DEVICE_ACTION }; },
  });
  ok("7.20 · ⛔ an ADMIN audit that resolves unrecorded cannot be reported as complete",
    !adminFailed && written.join(",") === `${SEAL_DEVICE_ACTION},${SEAL_NEW_DEVICE_ACTION}`);
  const complianceFailed = await noteSealDevice(auditInput, {
    read: async () => ({ entries: [], truncated: false }),
    write: async (entry) => ({ recorded: entry.action !== SEAL_NEW_DEVICE_ACTION }),
  });
  ok("7.21 · ⛔ an unrecorded new-device COMPLIANCE row is a nonblocking incomplete audit", !complianceFailed);
  const truncatedActions: string[] = [];
  const incompleteHistory = await noteSealDevice(auditInput, {
    read: async () => ({ entries: [], truncated: true }),
    write: async (entry) => { truncatedActions.push(entry.action); return { recorded: true }; },
  });
  ok("7.22 · ⛔ truncated seal history never invents a new device",
    !incompleteHistory && truncatedActions.join(",") === SEAL_DEVICE_ACTION);
  const thrownAudit = await noteSealDevice(auditInput, {
    read: async () => ({ entries: [], truncated: false }),
    write: async () => { throw new Error("injected audit outage"); },
  });
  ok("7.23 · an audit write throw is contained after the irreversible seal", !thrownAudit);
  ok("7.24 · successful void and correction actions return the nonblocking audit warning",
    actionSource.includes("return await noteSealDevice({ officerId, weekId, slots, ip: meta.ip, userAgent: meta.ua });")
      && actionSource.match(/auditWarning: audited \? null : SEAL_DEVICE_AUDIT_WARNING/g)?.length === 2
      && consoleSource.includes("onWarning?.(r.auditWarning ?? null)")
      && consoleSource.match(/setVoidRow\(null\), setSealAuditWarning|setCorrectRow\(null\), setSealAuditWarning/g)?.length === 2);
}

// ── §8 · the week void ──────────────────────────────────────────────────────
console.log("\n§8 · ⭐ the week void");
{
  // The DRIVE week: open it and void six mains before its close — sales must stop at once.
  const drive = (await weekStore.list({ visibility: "DRIVE" }))[0];
  await svc.attestParity({ weekId: drive.id, officerId: READER });
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
  const v = await svc.voidWeek({ weekId: drive.id, now: new Date(Date.parse(final.objectionsCloseAt!) + 1) });
  ok("8.8 · after the window: VOIDED", v.ok && v.week.state === "VOIDED", errOf(v));
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
  const c = await svc.claimCarry({ weekId: third.id, readJackpot: async () => 300_000 });
  ok("9.3 · once the earlier week is settled, the carry is claimed", c.ok && c.rolloverIn === 300_000 && !c.already);
  const again = await svc.claimCarry({ weekId: third.id, readJackpot: async () => 999_999 });
  ok("9.4 · ⭐ exactly once: a second claim returns the first figure", again.ok && again.rolloverIn === 300_000 && again.already === true);
  const late = await svc.sealQuestion({ weekId: w1.id, slot: 12, outcome: "YES", evidence: "Official result for reserve 2", officerId: SEALER, now: afterClose });
  ok("9.6 · ⛔ nothing can be sealed on a SETTLED week (a paid week is final)", !late.ok && /SETTLED/.test(errOf(late)), errOf(late));
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

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
