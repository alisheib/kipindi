/** One builder save across two slots: refusal and write failure leave both stores untouched. */
import { readFileSync } from "node:fs";

const store = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-batch-edit-test-session-0123456789";
const { eatWeekStartMs } = await import("../../src/lib/eat-day.ts");
const { utcToZonedLocal } = await import("../../src/lib/maswali-time.ts");
const svc = await import("../../src/lib/server/maswali-service.ts");
const { weekStore, questionStore, __resetMaswaliMemoryStores } = await import("../../src/lib/server/maswali-dal.ts");
const { auditFlush } = await import("../../src/lib/server/audit.ts");

let pass = 0, fail = 0;
const failedNames: string[] = [];
function ok(name: string, condition: boolean, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"} [${store}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (condition) pass++; else { fail++; failedNames.push(name); }
}
const errorOf = (result: { ok: boolean; error?: string }) => result.ok ? "" : String(result.error);
const throwsAsync = async (fn: () => Promise<unknown>) => { try { await fn(); return false; } catch { return true; } };
const day = 86_400_000;
const weekStart = eatWeekStartMs(Date.now()) + 14 * day;
const questions = Array.from({ length: 15 }, (_, index) => {
  const slot = index + 1;
  return {
    role: (index < 10 ? "MAIN" : "RESERVE") as "MAIN" | "RESERVE",
    ordinal: index < 10 ? slot : slot - 10,
    category: "sports", eventKind: "SPORT" as const,
    textEn: `Will event ${slot} happen?`, textSw: `Je, tukio ${slot} litatokea?`, textZh: `事件 ${slot} 会发生吗？`,
    criterionEn: `YES if event ${slot} happens; NO otherwise.`, criterionSw: `NDIO ikiwa tukio ${slot} litatokea.`, criterionZh: `若事件 ${slot} 发生则为是。`,
    sourceUrl: "https://www.nbc.co.tz/results", eventLocalStart: utcToZonedLocal(weekStart + 5 * day + slot * 3_600_000, "Africa/Dar_es_Salaam"),
    eventZone: "Africa/Dar_es_Salaam", probabilityEstimate: 0.5,
  };
});

__resetMaswaliMemoryStores();
const draft = await svc.createWeek({ weekStartMs: weekStart, questions, officerId: "usr_builder", now: new Date(weekStart - day) });
ok("draft fixture is stored", draft.ok, errorOf(draft));
if (!draft.ok) process.exit(1);
const weekId = draft.week.id;
const before = await questionStore.listForWeek(weekId);
ok("fixture has fifteen ordered slots", before.length === 15 && before[0]?.slot === 1 && before[14]?.slot === 15);

const dalFailed = await throwsAsync(() => questionStore.editDraftQuestions([
  { id: before[0]!.id, fields: { textEn: "Should roll back" } },
  { id: "mlq_missing_batch_edit", fields: { textEn: "No row" } },
]));
const afterDal = await questionStore.listForWeek(weekId);
ok("store batch raises on a later write failure", dalFailed);
ok("store batch rolls back its earlier question", afterDal[0]?.textEn === before[0]?.textEn);

const attested = await svc.attestParity({ weekId, officerId: "usr_second_reader" });
ok("second reader attests the draft", attested.ok, errorOf(attested));
// S5-FIX-SRV A5 · every edit names the version of the row the builder loaded.
const v = (index: number) => svc.draftRowVersion(before[index]!);
const refused = await svc.editDraftQuestions({ weekId, officerId: "usr_builder", edits: [
  { slot: 1, changes: { textEn: "Should not save" }, version: v(0) },
  { slot: 2, changes: { eventLocalStart: "not-a-date" }, version: v(1) },
] });
const afterRefusal = await questionStore.listForWeek(weekId);
ok("later invalid slot names M2 and refuses whole save", !refused.ok && /M2/.test(errorOf(refused)), errorOf(refused));
ok("later refusal leaves both question rows unchanged", afterRefusal[0]?.textEn === before[0]?.textEn && afterRefusal[1]?.textEn === before[1]?.textEn);
ok("later refusal retains second-reader attestation", (await weekStore.get(weekId))?.parityAttestedBy === "usr_second_reader");

const duplicate = await svc.editDraftQuestions({ weekId, officerId: "usr_builder", edits: [
  { slot: 1, changes: { textEn: "First" }, version: v(0) }, { slot: 1, changes: { textEn: "Second" }, version: v(0) },
] });
ok("duplicate slot refuses without a write", !duplicate.ok && (await questionStore.listForWeek(weekId))[0]?.textEn === before[0]?.textEn);

const originalBatch = questionStore.editDraftQuestions;
if (process.argv.includes("--prove-red")) {
  // Plant the old partial-success defect in memory: the service says success after only the first patch.
  questionStore.editDraftQuestions = (edits, tx) => originalBatch.call(questionStore, edits.slice(0, 1), tx);
}
const saved = await svc.editDraftQuestions({ weekId, officerId: "usr_builder", edits: [
  { slot: 1, changes: { textEn: "Edited question one" }, version: v(0) },
  { slot: 2, changes: { textEn: "Edited question two" }, version: v(1) },
] });
questionStore.editDraftQuestions = originalBatch;
const afterSave = await questionStore.listForWeek(weekId);
ok("one accepted save updates both changed slots", saved.ok && saved.recorded && afterSave[0]?.textEn === "Edited question one" && afterSave[1]?.textEn === "Edited question two", errorOf(saved));
ok("accepted batch clears parity once", (await weekStore.get(weekId))?.parityAttestedBy === null);

// An audit append can fail after commit. The officer must hear that the edits landed, without a false rollback claim.
await auditFlush();
const oldNodeEnv = process.env.NODE_ENV;
const oldAuditSecret = process.env.AUDIT_CHAIN_SECRET;
process.env.NODE_ENV = "production";
delete process.env.AUDIT_CHAIN_SECRET;
const unrecordedSave = await svc.editDraftQuestions({ weekId, officerId: "usr_builder", edits: [
  { slot: 3, changes: { textEn: "Saved despite audit refusal" }, version: v(2) },
] });
if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
if (oldAuditSecret === undefined) delete process.env.AUDIT_CHAIN_SECRET; else process.env.AUDIT_CHAIN_SECRET = oldAuditSecret;
ok("an unrecorded audit reports saved, not rolled back", unrecordedSave.ok && !unrecordedSave.recorded
  && (await questionStore.listForWeek(weekId))[2]?.textEn === "Saved despite audit refusal");

const builder = readFileSync("src/app/admin/maswali/new/week-builder.tsx", "utf8");
const action = readFileSync("src/app/admin/maswali/actions.ts", "utf8");
ok("builder submits one batch action instead of a per-slot loop", builder.includes("editMaswaliQuestionsAction(form)") && !builder.includes("editMaswaliQuestionAction(f)"));
ok("batch action calls the atomic service", action.includes("editDraftQuestions({ weekId, edits, officerId: session.userId })"));
ok("batch action returns the measured audit outcome", action.includes("recorded: r.recorded"));
ok("builder warns that an unrecorded save still landed", builder.includes("Questions saved, but the audit record was not written")
  && builder.includes("The edits are already saved; do not repeat them."));

console.log(`@@SUMMARY ${JSON.stringify({ pass, fail })}`);
if (process.argv.includes("--prove-red")) {
  const caught = failedNames.length === 1 && failedNames[0] === "one accepted save updates both changed slots";
  console.log(`${caught ? "CAUGHT" : "MISSED"} partial-success mutation at the two-slot value assertion`);
  process.exit(caught ? 0 : 1);
}
process.exit(fail === 0 ? 0 : 1);
