/**
 * THE ADMIN GUIDE'S WEEKS TELL ONE STORY — `src/app/api/dev-test/seed-maswali-guide` (MASWALI-BUILD S6-GUIDE 6; the lead's
 * round 3 of 2026-10-23: "one capture now … every week's dates follow its own order (sales close → events → void deadline →
 * seals → objection window → settled) and its state … a week's dates and state are the same in every picture … seed the
 * demo names and the evidence text: realistic, plainly fictional, with no '(dev seed)'").
 *
 *   npx tsx scripts/maswali-guide-seed.test.mts        (npm run test:maswali-guide-seed; red twin: red:maswali-guide-seed)
 *
 *   §1 PRODUCTION: the route answers 404 there and writes nothing (the order of that refusal is `test:cert-devroutes`').
 *   §2 THE STORY, AS SEEDED: the route run in THIS process's in-memory store; every week, question, seal, objection and
 *      account it made is read back and judged at the story's own instant (`storyNow`):
 *        2.1 five public weeks, consecutive, each code the ISO week of its own Monday;
 *        2.2 each week on the rules' template — sales Monday 00:00 to Friday 18:00 (EAT);
 *        2.3 each question after the close and its buffer, its void deadline 48 hours after its event;
 *        2.4 each seal after its event and before `storyNow`;
 *        2.5 each week's state where its dates put it: settled, ready to release, in its window with objections, on sale,
 *            drafted — and the window at least the 24 hours it froze, from its last main seal;
 *        2.6 each objection filed after its question's seal, inside the window, before `storyNow`, still to rule;
 *        2.7 no seal is past its void deadline unsealed: a slot still to seal has its deadline ahead;
 *        2.8 every account it made is a fictional "<name> Mfano"; no name or text says dev, seed, test or demo;
 *        2.9 the held share and the desk's two calls are on record.
 *   §3 PLANTS: each predicate of §2 fails on a copy of the facts with its rule broken.
 * ⛔ It writes nothing to disk and reaches no server: the seed runs on this process's memory store.
 */
// ⛔ IMPORT ORDER IS THE CONTRACT: the stores pick memory or Postgres on first import, so the environment comes first.
delete process.env.DATABASE_URL;
delete process.env.USE_PRISMA_DAL;
process.env.FEATURE_MILLIONEA = "ACTIVE";
process.env.MASWALI_SCHEDULER = "false";
process.env.LIFECYCLE_TICKER = "false";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s}`);
const j = (v: unknown) => JSON.stringify(v);

const quiet = console.log;
console.log = (...a: unknown[]) => { if (typeof a[0] === "string" && (a[0].startsWith("[audit]") || a[0].startsWith("[email]") || a[0].startsWith("[maswali"))) return; quiet(...a); };
const route = await import("../src/app/api/dev-test/seed-maswali-guide/route.ts");
const { weekStore, questionStore } = await import("../src/lib/server/maswali-dal.ts");
const { db } = await import("../src/lib/server/store.ts");
const { getLicenceBasis } = await import("../src/lib/server/maswali-licence.ts");
const { getAuditForTargetsDurable } = await import("../src/lib/server/audit.ts");
const post = (body: unknown) => route.POST(new Request("http://localhost/api/dev-test/seed-maswali-guide", { method: "POST", body: JSON.stringify(body) }));

/* ══ §1 · PRODUCTION ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§1 · production: 404, nothing written");
const env = process.env as Record<string, string | undefined>;
const before = env.NODE_ENV;
env.NODE_ENV = "production";
const refused = await post({});
if (before === undefined) delete env.NODE_ENV; else env.NODE_ENV = before;
ok("1.1 · the route answers 404 in production and seeds no week", refused.status === 404 && (await weekStore.list({ visibility: "PUBLIC" })).length === 0, `status ${refused.status}`);

/* ══ §2 · THE STORY, AS SEEDED ═════════════════════════════════════════════════════════════════════════════════════════ */
section("§2 · the story, seeded in memory and read back");
const res = await post({});
const body = await res.json() as { ok?: boolean; error?: string; storyNow?: string; weeks?: Record<string, string>; lookup?: { serial: string; phone: string } };
console.log = quiet;
if (!body.ok || !body.storyNow || !body.weeks) throw new Error(`PREMISE ABSENT — seed-maswali-guide answered ${res.status}: ${body.error}`);

type Q = { slot: number; eventStartsAt: number; voidDeadlineAt: number; sealedAt: number | null; texts: string[] };
type O = { slot: number; createdAt: number; status: string; detail: string };
type W = { role: string; code: string; state: string; opensAt: number; closesAt: number; objectionsCloseAt: number | null; settledAt: number | null; questions: Q[]; objections: O[] };
type Facts = { storyNow: number; windowHours: number; weeks: W[]; names: string[]; texts: string[]; held: number; reached: number };

const ms = (iso: string | null) => (iso ? Date.parse(iso) : null);
const ROLES = ["settled", "ready", "objections", "selling", "draft"] as const;
// The rules the weeks froze (the defaults: the seed saves no rule): the objection window's hours.
const { getMaswaliConfig } = await import("../src/lib/server/maswali-config.ts");
const frozen = getMaswaliConfig();
const facts: Facts = { storyNow: Date.parse(body.storyNow), windowHours: frozen.objectionWindowHours, weeks: [], names: [], texts: [], held: 0, reached: 0 };
for (const role of ROLES) {
  const w = (await weekStore.get(body.weeks[role]))!;
  const qs = await questionStore.listForWeek(w.id);
  const objs = w.marketId ? db.objection.listForMarket(w.marketId) : [];
  facts.weeks.push({
    role, code: w.code, state: w.state, opensAt: Date.parse(w.opensAt), closesAt: Date.parse(w.closesAt), objectionsCloseAt: ms(w.objectionsCloseAt), settledAt: ms(w.settledAt),
    questions: qs.map((q) => ({ slot: q.slot, eventStartsAt: Date.parse(q.eventStartsAt), voidDeadlineAt: Date.parse(q.voidDeadlineAt), sealedAt: ms(q.sealedAt),
      texts: [q.textEn, q.textSw, q.textZh, q.criterionEn, q.criterionSw, q.criterionZh, q.evidence ?? ""] })),
    objections: (await objs).map((o) => ({ slot: o.questionOrdinal ?? 0, createdAt: Date.parse(o.createdAt), status: o.status, detail: o.detail })),
  });
  for (const q of qs) facts.texts.push(q.textEn, q.criterionEn, q.evidence ?? "");
  for (const o of await objs) facts.texts.push(o.detail);
}
const ids = ["usr_guide_sealer", "usr_guide_drafter", "usr_guide_reader", "usr_guide_compliance", "usr_guide_finance", "usr_guide_owner",
  ...Array.from({ length: 12 }, (_, i) => `usr_guide_p${String(i + 1).padStart(2, "0")}`)];
for (const id of ids) { const u = await db.user.findById(id); if (u) facts.names.push(u.displayName ?? ""); }
const settledId = body.weeks.settled;
const { ticketStore } = await import("../src/lib/server/maswali-dal.ts");
const heldTickets = (await ticketStore.listForWeek(settledId, { status: "SETTLED", won: true })).filter((t) => (t.frozenReason ?? "").startsWith("compliance · "));
facts.held = heldTickets.length;
for (const t of heldTickets) facts.texts.push(t.frozenReason ?? "");
const reached = await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: [settledId], actions: ["maswali.winner.reached"], sinceIso: new Date(0).toISOString(), limit: 10 });
facts.reached = reached.entries.length;
const basis = getLicenceBasis();
if (basis.ref) facts.texts.push(basis.ref);

/** ISO 8601 week of an EAT Monday: "YYYY-Www". */
function isoWeek(mondayUtcMs: number): string {
  const d = new Date(mondayUtcMs + 3 * 3_600_000);
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  day.setUTCDate(day.getUTCDate() + 3); // the Thursday of that week names its year
  const year = day.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round(((day.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}
const eatParts = (t: number) => { const d = new Date(t + 3 * 3_600_000); return { dow: (d.getUTCDay() + 6) % 7, hhmm: d.toISOString().slice(11, 16) }; };
const H = 3_600_000;
const BANNED = /\b(dev|seed|seeded|test|demo|dummy|lorem)\b/i;

/** Every rule of §2 over a set of facts: the broken ones, by number. */
function judge(f: Facts): Record<string, string[]> {
  const bad: Record<string, string[]> = {};
  const no = (k: string, m: string) => { (bad[k] ??= []).push(m); };
  const byOpen = [...f.weeks].sort((a, b) => a.opensAt - b.opensAt);
  if (f.weeks.length !== 5) no("2.1", `${f.weeks.length} weeks`);
  byOpen.forEach((w, i) => {
    if (w.code !== `MLN-${isoWeek(w.opensAt)}`) no("2.1", `${w.code} opens in ${isoWeek(w.opensAt)}`);
    if (i > 0 && w.opensAt - byOpen[i - 1].opensAt !== 7 * 24 * H) no("2.1", `${w.code} is not the week after ${byOpen[i - 1].code}`);
    const o = eatParts(w.opensAt), c = eatParts(w.closesAt);
    if (o.dow !== 0 || o.hhmm !== "00:00" || c.dow !== 4 || c.hhmm !== "18:00" || w.closesAt - w.opensAt !== 4 * 24 * H + 18 * H) no("2.2", `${w.code} opens ${j(o)} closes ${j(c)}`);
    for (const q of w.questions) {
      if (q.eventStartsAt < w.closesAt + 30 * 60_000) no("2.3", `${w.code} slot ${q.slot} starts before the close and its buffer`);
      if (q.voidDeadlineAt !== q.eventStartsAt + 48 * H) no("2.3", `${w.code} slot ${q.slot}'s void deadline is not 48 hours after its event`);
      if (q.sealedAt !== null && (q.sealedAt < q.eventStartsAt || q.sealedAt > f.storyNow)) no("2.4", `${w.code} slot ${q.slot} sealed outside its event and the story's now`);
      if (q.sealedAt === null && w.state !== "DRAFT" && w.state !== "OPEN" && q.voidDeadlineAt <= f.storyNow) no("2.7", `${w.code} slot ${q.slot} is past its void deadline unsealed`);
    }
    const lastMain = Math.max(...w.questions.filter((q) => q.slot <= 10).map((q) => q.sealedAt ?? -Infinity));
    const windowFrom = (x: W) => x.objectionsCloseAt !== null && x.objectionsCloseAt >= lastMain + f.windowHours * H && x.objectionsCloseAt <= lastMain + (f.windowHours + 24) * H;
    const closed = w.closesAt < f.storyNow;
    const s = (cond: boolean, m: string) => { if (!cond) no("2.5", `${w.code} (${w.role}, ${w.state}): ${m}`); };
    if (w.role === "settled") s(w.state === "SETTLED" && closed && windowFrom(w) && w.settledAt !== null && w.settledAt > w.objectionsCloseAt! && w.settledAt < f.storyNow, "not settled after its window and before now");
    if (w.role === "ready") s(w.state === "RESOLVING" && closed && windowFrom(w) && w.objectionsCloseAt! < f.storyNow && w.settledAt === null && w.objections.every((x) => x.status !== "OPEN"), "not a week whose window closed with nothing to rule");
    if (w.role === "objections") s(w.state === "RESOLVING" && closed && windowFrom(w) && w.objectionsCloseAt! > f.storyNow && w.objections.some((x) => x.status === "OPEN"), "not in its window with objections to rule");
    if (w.role === "selling") s(w.state === "OPEN" && w.opensAt <= f.storyNow && f.storyNow < w.closesAt, "not on sale at now");
    if (w.role === "draft") s(w.state === "DRAFT" && w.opensAt > f.storyNow, "not a draft ahead of now");
    for (const x of w.objections) {
      const q = w.questions.find((y) => y.slot === x.slot);
      if (!q || q.sealedAt === null || x.createdAt < q.sealedAt || x.createdAt < lastMain || w.objectionsCloseAt === null || x.createdAt >= w.objectionsCloseAt || x.createdAt > f.storyNow) {
        no("2.6", `${w.code}: an objection to slot ${x.slot} filed outside its window or before its seal`);
      }
    }
  });
  for (const n of f.names) if (!/^[A-Z][a-z]+ Mfano$/.test(n) || BANNED.test(n)) no("2.8", `the name "${n}"`);
  for (const t of f.texts) if (BANNED.test(t) || /\(dev seed\)/i.test(t)) no("2.8", `the text "${t}"`);
  if (f.names.length < 17) no("2.8", `${f.names.length} accounts read`);
  if (f.held !== 1 || f.reached !== 2) no("2.9", `held ${f.held}, reached ${f.reached}`);
  return bad;
}

const verdict = judge(facts);
for (const w of [...facts.weeks].sort((a, b) => a.opensAt - b.opensAt)) {
  quiet(`  ${w.code} ${w.role.padEnd(10)} ${w.state.padEnd(9)} closes ${new Date(w.closesAt).toISOString()}${w.objectionsCloseAt ? ` · window to ${new Date(w.objectionsCloseAt).toISOString()}` : ""}${w.settledAt ? ` · settled ${new Date(w.settledAt).toISOString()}` : ""}${w.objections.length ? ` · ${w.objections.length} objections` : ""}`);
}
quiet(`  storyNow ${body.storyNow} · lookup ${j(body.lookup)}`);
const RULES: Array<[string, string]> = [
  ["2.1", "five public weeks, consecutive, each code the ISO week of its own Monday"],
  ["2.2", "each week on the rules' template: sales Monday 00:00 to Friday 18:00 (EAT)"],
  ["2.3", "each question after the close and its buffer, its void deadline 48 hours after its event"],
  ["2.4", "each seal after its event and before the story's now"],
  ["2.5", "each week's state where its dates put it, its window the hours it froze"],
  ["2.6", "each objection after its question's seal, inside its window, before the story's now"],
  ["2.7", "no slot is past its void deadline unsealed"],
  ["2.8", "every account a fictional \"<name> Mfano\"; no name or text says dev, seed, test or demo"],
  ["2.9", "the held share and the desk's two calls are on record"],
];
for (const [k, label] of RULES) ok(`${k} · ${label}`, !verdict[k], j(verdict[k]?.slice(0, 3)));

/* ══ §3 · PLANTS ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§3 · each rule fails on a copy of the facts with that rule broken");
const copy = (): Facts => JSON.parse(JSON.stringify(facts)) as Facts;
const role = (f: Facts, r: string) => f.weeks.find((w) => w.role === r)!;
const plants: Array<[string, string, (f: Facts) => void]> = [
  ["2.1", "a week's code one week off", (f) => { const w = role(f, "ready"); w.code = w.code.replace(/W(\d\d)$/, (_m, n) => `W${String(Number(n) + 1).padStart(2, "0")}`); }],
  ["2.2", "a close an hour late", (f) => { role(f, "ready").closesAt += H; }],
  ["2.3", "an event before the close", (f) => { const w = role(f, "settled"); w.questions[0].eventStartsAt = w.closesAt - H; w.questions[0].voidDeadlineAt = w.questions[0].eventStartsAt + 48 * H; }],
  ["2.4", "a seal before its event", (f) => { const q = role(f, "settled").questions[2]; q.sealedAt = q.eventStartsAt - 60_000; }],
  ["2.5", "the settled stamp before its window closed", (f) => { const w = role(f, "settled"); w.settledAt = w.objectionsCloseAt! - H; }],
  ["2.5", "the week on sale closed before now", (f) => { role(f, "selling").closesAt = f.storyNow - H; }],
  ["2.6", "an objection filed after its window", (f) => { const w = role(f, "objections"); w.objections[0].createdAt = w.objectionsCloseAt! + 60_000; }],
  ["2.7", "a slot still to seal past its void deadline", (f) => { const q = role(f, "objections").questions.find((x) => x.sealedAt === null)!; q.voidDeadlineAt = f.storyNow - H; q.eventStartsAt = q.voidDeadlineAt - 48 * H; }],
  ["2.8", "\"(dev seed)\" in an evidence text", (f) => { f.texts.push("Official result for event 9 (dev seed)"); }],
  ["2.8", "a player named \"Dev player 9dd1\"", (f) => { f.names.push("Dev player 9dd1"); }],
  ["2.9", "no held share", (f) => { f.held = 0; }],
];
for (const [k, what, mutate] of plants) {
  const f = copy();
  mutate(f);
  ok(`3 PLANT · ${what}: rule ${k} reports it`, !!judge(f)[k], "the judge passed it");
}

console.log(`\n${"═".repeat(70)}\n  MASWALI GUIDE SEED: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run printed. */
const MIN_ASSERTIONS = 21;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
