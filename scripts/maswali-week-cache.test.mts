/**
 * S5 · the rush week shares only published question facts between requests. The gate, owner data and money remain live.
 * Run --prove-red to plant cache removal and privacy regressions in the actual source, then ask this guard to reject each.
 */
import { readFileSync } from "node:fs";
import type { StoredQuestion } from "../src/lib/server/maswali-dal.ts";
import { publicHubQuestionsOf } from "../src/lib/server/maswali-player.ts";

const player = readFileSync("src/lib/server/maswali-player.ts", "utf8");
const actions = readFileSync("src/app/admin/maswali/actions.ts", "utf8");
let passed = 0, failed = 0;
function ok(name: string, yes: boolean, detail = "") {
  console.log(`${yes ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  yes ? passed++ : failed++;
}
function between(source: string, from: string, to: string): string {
  const a = source.indexOf(from);
  const b = source.indexOf(to, a + from.length);
  return a < 0 || b < 0 ? "" : source.slice(a, b);
}
function defects(p: string, a: string): string[] {
  const d: string[] = [];
  const projection = between(p, "export function publicHubQuestionsOf(", "async function readHubQuestions(");
  const mapper = between(p, "function questionsOf(", "The only shape the shared cache may hold:");
  const cache = between(p, "const cachedPublicHubQuestions = unstable_cache(", "async function hubQuestionsOf(");
  const choice = between(p, "async function hubQuestionsOf(", "/** How far the week's results have come:");
  const hub = between(p, "async function hubWeekOf(", "/** The template's next open");
  const refresh = between(a, "const refresh = (weekId?: string) => {", "const str = (");

  if (!projection.includes("const graded = gradable(qs);") || !projection.includes("return { questions: questionsOf(qs, graded), graded };")) d.push("public projection");
  if (!mapper.includes("slot: q.slot, label: slotLabel(q.slot), role: q.role, category: q.category,") || mapper.includes("...q")) d.push("allowlist");
  if (!cache.includes("async (weekId: string, _questionSetHash: string) => readHubQuestions(weekId)")
      || !cache.includes("{ tags: [MASWALI_PUBLIC_WEEK_QUESTIONS_TAG], revalidate: 2 }")) d.push("two-second data cache");
  if (!choice.includes('week.visibility === "PUBLIC" && week.state !== "DRAFT" && !!week.questionSetHash')
      || !choice.includes("? cachedPublicHubQuestions(week.id, week.questionSetHash)")
      || !choice.includes(": readHubQuestions(week.id)")) d.push("public and versioned choice");
  if (!choice.includes('process.env.HB_MONEY_STORE === "memory" || process.env.HB_MONEY_STORE === "postgres"')) d.push("CLI-only bypass");
  if (!hub.includes("const { questions, graded: gq } = await hubQuestionsOf(week);")
      || !hub.includes("const tickets = await ticketStore.listForUser(viewer.userId, { cycleId: week.id });")
      || !hub.includes("pool: await maswaliPoolFigure(week.id).catch(() => null)")
      || !hub.includes("const terms = await termsOf(week);")
      || /cachedPublicHubQuestions\([^)]*(?:userId|ticket|pool)/.test(hub)) d.push("fresh owner and money reads");
  if (!refresh.includes("revalidateTag(MASWALI_PUBLIC_WEEK_QUESTIONS_TAG, { expire: 0 });")) d.push("immediate officer invalidation");
  return d;
}

ok("a published PUBLIC week uses Next's data cache, keyed by week and the frozen question-set hash, for two seconds", !defects(player, actions).includes("two-second data cache") && !defects(player, actions).includes("public and versioned choice"));
ok("the two-store CLI bypass is explicit; production requests take the cache branch", !defects(player, actions).includes("CLI-only bypass"));
ok("the hub still reads each owner's tickets, current frozen terms and the ledger pool per request", !defects(player, actions).includes("fresh owner and money reads"));
ok("officer actions expire the question cache without serving stale data", !defects(player, actions).includes("immediate officer invalidation"));

const privateValues = ["SECRET_SEALER_ID", "SECRET_EVIDENCE", "SECRET_AI", "SECRET_PROBABILITY", "SECRET_TICKET"];
const row = {
  id: "internal_question_id", cycleId: "internal_week_id", slot: 1, ordinal: 1, role: "MAIN", category: "SPORT",
  textEn: "Who won?", textSw: "Nani alishinda?", textZh: "谁获胜？",
  criterionEn: "Official result", criterionSw: "Matokeo rasmi", criterionZh: "官方结果",
  sourceUrl: "https://example.org/results", sourceDomain: "example.org",
  eventStartsAt: "2026-10-30T18:00:00.000Z", eventZone: "Africa/Dar_es_Salaam", voidDeadlineAt: "2026-10-31T18:00:00.000Z",
  outcome: "YES", twoOfficerAtStage1: true, stage2By: null,
  sealedBy: privateValues[0], evidence: privateValues[1], aiSuggestion: privateValues[2],
  probabilitySource: privateValues[3], ticketIds: [privateValues[4]],
} as unknown as StoredQuestion;
const pending = publicHubQuestionsOf([row]);
const publicQuestionKeys = ["slot", "label", "role", "category", "text", "criterion", "sourceUrl", "sourceDomain", "eventStartsAt", "eventZone", "voidDeadlineAt", "outcome"];
ok("cached question has exactly the player-visible allowlist", JSON.stringify(Object.keys(pending.questions[0] ?? {}).sort()) === JSON.stringify(publicQuestionKeys.sort()));
ok("a first-officer seal remains unpublished until the second officer confirms", pending.questions[0]?.outcome === null && pending.graded[0]?.outcome === null);
ok("no officer id, evidence, AI suggestion, probability input or ticket can enter the cached payload",
  privateValues.every((value) => !JSON.stringify(pending).includes(value)) && !JSON.stringify(pending).includes("internal_question_id"));
ok("the three public translations and published source survive the projection",
  pending.questions[0]?.text.sw === "Nani alishinda?" && pending.questions[0]?.criterion.zh === "官方结果"
  && pending.questions[0]?.sourceDomain === "example.org");
const confirmed = publicHubQuestionsOf([{ ...row, stage2By: "second_officer" }]);
ok("a confirmed outcome reaches the public vector and page", confirmed.questions[0]?.outcome === "YES" && confirmed.graded[0]?.outcome === "YES");
ok("the source projects each question through the same allowlist tested above", !defects(player, actions).includes("public projection") && !defects(player, actions).includes("allowlist"));

if (process.argv.includes("--prove-red")) {
  function plant(source: string, oldText: string, newText: string): string {
    if (!source.includes(oldText)) throw new Error(`Missing mutation target: ${oldText}`);
    return source.replace(oldText, newText);
  }
  ok("red: removing the shared cache fails", defects(plant(player, "const cachedPublicHubQuestions = unstable_cache(", "const cachedPublicHubQuestions = ("), actions).includes("two-second data cache"));
  ok("red: routing PUBLIC weeks around the cache fails", defects(plant(player, "? cachedPublicHubQuestions(week.id, week.questionSetHash)", "? readHubQuestions(week.id)"), actions).includes("public and versioned choice"));
  ok("red: admitting DRIVE into the shared cache fails", defects(plant(player, 'week.visibility === "PUBLIC" && ', ""), actions).includes("public and versioned choice"));
  ok("red: an unversioned cache key fails", defects(plant(player, "cachedPublicHubQuestions(week.id, week.questionSetHash)", "cachedPublicHubQuestions(week.id, '')"), actions).includes("public and versioned choice"));
  ok("red: caching raw question rows with officer/evidence fields fails", defects(plant(player, "return { questions: questionsOf(qs, graded), graded };", "return { questions: qs as unknown as MillioneaQuestion[], graded };"), actions).includes("public projection"));
  ok("red: leaking raw fields through the mapper fails", defects(plant(player, "return qs.map((q, i) => ({", "return qs.map((q, i) => ({ ...q,"), actions).includes("allowlist"));
  ok("red: bypassing the per-request PUBLIC gate fails", defects(plant(player, "const { questions, graded: gq } = await hubQuestionsOf(week);", "const { questions, graded: gq } = await cachedPublicHubQuestions(week.id, week.questionSetHash ?? '');"), actions).includes("fresh owner and money reads"));
  ok("red: removing immediate officer invalidation fails", defects(player, plant(actions, "revalidateTag(MASWALI_PUBLIC_WEEK_QUESTIONS_TAG, { expire: 0 });", "")).includes("immediate officer invalidation"));
}
console.log(`maswali week cache: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
