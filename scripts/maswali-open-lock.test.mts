/**
 * test:maswali-open-lock — THE MILLIONEA S8 HOLD, IN CODE (programme FEE-TAX-2026-10, release R1;
 * `docs/COMPLIANCE-DECISIONS.md` § "2026-10-24 · The fee becomes 13% of every stake, …", "The Millionea S8 hold").
 *
 *   npx tsx scripts/maswali-open-lock.test.mts     (npm run test:maswali-open-lock — in predeploy)
 *   npm run red:second-officer-switch              (its red twin drops the lock and needs §1 to go red)
 *
 * A week freezes its fee model when it opens, and Ali's ruling moves Millionea's fee from the payout to the ticket. So the
 * open refuses a public week whose open would freeze the old model (`jackpot-payout`) — keyed on what the open WOULD
 * freeze (`openFeeFreeze`), never on a date or a flag, so R4 of the programme lifts it by changing that answer.
 *   §1 ⛔ the open refuses, in the plain words — and before anything is frozen or written: the week stays the DRAFT it was,
 *      no market is made, no row says it opened
 *   §2 the builder's checklist names the hold first, in the open's own words
 *   §3 the words exist in English, Swahili and Chinese; the console refuses with the English
 *   §4 a DRIVE week (OD-21's private line, dormant) is not held: the records hold public weeks
 *   §5 control: with the hold lifted — the suites' seam — the same week opens, so the refusal was the hold's alone
 *   §6 the hold, read from the source: one answer for what the open freezes, asked before every write; the seam refuses
 *      in production
 * ⛔ IMPORT ORDER IS THE CONTRACT: the stores pick memory or Postgres on first import, so the environment comes first.
 * ⚠️ This file carries no backslash.
 */
delete process.env.DATABASE_URL;
process.env.USE_PRISMA_DAL = "false";
process.env.HB_MONEY_STORE = "memory";
process.env.MASWALI_SCHEDULER = "false";
process.env.LIFECYCLE_TICKER = "false";
process.env.SESSION_SECRET ??= "maswali-open-lock-secret-0123456789abcdef0123456";

const { readFileSync } = await import("node:fs");
const { loadMaswaliWorld } = await import("./lib/maswali-money-world.mts");
const { decomment } = await import("./lib/decomment.mts");
const W = await loadMaswaliWorld();
const consoleRead = await import("../src/lib/server/maswali-console.ts");
const { getMaswaliConfig } = await import("../src/lib/server/maswali-config.ts");
const { dict } = await import("../src/lib/i18n-dict.ts");
const { auditFlush, getAuditByActionsDurable } = await import("../src/lib/server/audit.ts");

/* eslint-disable @typescript-eslint/no-explicit-any */
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const section = (s: string) => console.log(`${String.fromCharCode(10)}── ${s}`);
const J = (x: unknown) => JSON.stringify(x);
const errOf = (r: any) => (r && r.ok === false ? String(r.error) : "");
const MIN = 60_000, DAY = 86_400_000;
const HOLD_EN = dict.en.feeChange.millioneaOpenHeld;

await W.setup({ guarantee: 30_000_000 });
// ⛔ The money world lifts the hold for the suites that test the old model's money; this suite is the hold's own.
W.svc.__liftMillioneaOpenHoldForTests(false);

const DRAFTER = await W.user({ role: "MODERATOR" });
const READER = await W.user({ role: "MODERATOR" });
const OPENER = await W.user({ role: "ADMIN" });

/** A week drafted and attested: everything the open asks of the week itself is in place. */
async function ready(weeksAhead: number, visibility: "PUBLIC" | "DRIVE"): Promise<{ week: any; start: number }> {
  const start = W.weekStartAhead(weeksAhead);
  const c = await W.svc.createWeek({ weekStartMs: start, visibility, questions: W.questions(start), officerId: DRAFTER, now: new Date(start - 3 * DAY) });
  if (!c.ok) throw new Error(`draft refused: ${c.error}`);
  const a = await W.svc.attestParity({ weekId: c.week.id, officerId: READER, readVersion: await W.svc.readDraftVersion(c.week.id) });
  if (!a.ok) throw new Error(`attest refused: ${a.error}`);
  return { week: (await W.dal.weekStore.get(c.week.id)), start };
}
const open = (weekId: string, start: number) => W.svc.openWeek({ weekId, officerId: OPENER, guarantee: W.money.guaranteeReader, now: new Date(start + MIN) });
const marketsFor = async (code: string) => (await W.w.svc.listMarkets({ productLine: "ALL" })).filter((m: any) => m.titleEn === `Maswali Millionea · ${code}`).length;
const rowsFor = async (action: string, match: (e: any) => boolean) => {
  await auditFlush();
  return (await getAuditByActionsDurable([action], { limit: 500 })).entries.filter(match).length;
};

// ═══ §1 · THE OPEN REFUSES, BEFORE ANYTHING IS FROZEN OR WRITTEN ═══════════════════════════════════════════════════
section("§1 · a public week that would freeze the old fee model does not open");
const P = await ready(3, "PUBLIC");
const questionsBefore = J(await W.dal.questionStore.listForWeek(P.week.id));
const held = await open(P.week.id, P.start);
const after = await W.dal.weekStore.get(P.week.id);
ok("1.1 · ⛔ the open refuses a public week whose open would freeze jackpot-payout, in the plain words",
  !held.ok && errOf(held) === HOLD_EN, errOf(held));
ok("1.2 · …before anything is frozen: the week is still the DRAFT it was — no market, no rules, no question-set hash, the same final deadline — and its questions are as they were",
  after?.state === "DRAFT" && after.marketId === null && after.rulesSnapshot === null && after.questionSetHash === null
    && after.finalDeadlineAt === P.week.finalDeadlineAt && J(await W.dal.questionStore.listForWeek(P.week.id)) === questionsBefore, J(after));
ok("1.3 · …and before anything is written: no market was made, and no row says the week opened or a market was created",
  (await marketsFor(P.week.code)) === 0 && (await rowsFor("maswali.week.opened", (e) => e.targetId === P.week.id)) === 0
    && (await rowsFor("market.created", (e) => e.payload?.titleEn === `Maswali Millionea · ${P.week.code}`)) === 0);

// ═══ §2 · THE CHECKLIST SAYS SO ════════════════════════════════════════════════════════════════════════════════════
section("§2 · the builder's checklist names the hold first");
const listed = (await consoleRead.consoleWeekDetail(P.week.id, new Date(P.start + MIN)))?.problems ?? [];
ok("2.1 · the checklist's first line is the hold, in the open's own words — it never says every check passes while the open refuses",
  listed[0] === HOLD_EN, J(listed));

// ═══ §3 · THE WORDS ════════════════════════════════════════════════════════════════════════════════════════════════
section("§3 · the words, in three languages");
const sw = dict.sw.feeChange.millioneaOpenHeld, zh = dict.zh.feeChange.millioneaOpenHeld;
ok("3.1 · the English is the plain sentence of the release, and it is what the service refuses with",
  HOLD_EN === "Millionea's new fee rules are not live yet, so no week can open (the fee change of 24 October 2026)." && W.svc.OLD_FEE_MODEL_HOLD === HOLD_EN, HOLD_EN);
ok("3.2 · Swahili and Chinese carry it too, each its own sentence, each naming Millionea and the 24 October 2026 change",
  sw !== HOLD_EN && zh !== HOLD_EN && sw.includes("Millionea") && zh.includes("Millionea") && sw.includes("24 Oktoba 2026") && zh.includes("2026年10月24日"), J({ sw, zh }));

// ═══ §4 · A DRIVE WEEK IS NOT HELD ════════════════════════════════════════════════════════════════════════════════
section("§4 · a DRIVE week is not held");
const D = await ready(3, "DRIVE");
const driveListed = (await consoleRead.consoleWeekDetail(D.week.id, new Date(D.start + MIN)))?.problems ?? [];
const driveOpen = await open(D.week.id, D.start);
ok("4.1 · a DRIVE week (the private line, OD-21) opens with the hold in place, and its checklist names no hold — the records hold public weeks",
  driveOpen.ok && !driveListed.includes(HOLD_EN), errOf(driveOpen) || J(driveListed));

// ═══ §5 · CONTROL — LIFTED, THE SAME WEEK OPENS ══════════════════════════════════════════════════════════════════
section("§5 · control: the refusal was the hold's alone");
const before = W.svc.__liftMillioneaOpenHoldForTests(true);
const lifted = await open(P.week.id, P.start);
W.svc.__liftMillioneaOpenHoldForTests(before);
const opened = await W.dal.weekStore.get(P.week.id);
ok("5.1 · control · with the hold lifted (the seam the money suites use) the same public week opens: OPEN, its market made",
  lifted.ok && opened?.state === "OPEN" && opened.marketId !== null && (await marketsFor(P.week.code)) === 1, errOf(lifted));

// ═══ §6 · THE HOLD, READ FROM THE SOURCE ═══════════════════════════════════════════════════════════════════════════
section("§6 · keyed on what the open freezes, asked before every write; the seam refuses in production");
const svcSource = decomment(readFileSync(new URL("../src/lib/server/maswali-service.ts", import.meta.url), "utf8")).split(String.fromCharCode(13)).join("");
const openAt = svcSource.indexOf("export async function openWeek(");
const openBody = svcSource.slice(openAt, svcSource.indexOf("export ", openAt + 30));
const holdAt = svcSource.indexOf("export function oldFeeModelHold(");
const holdBody = svcSource.slice(holdAt, svcSource.indexOf("}", svcSource.indexOf("return OLD_FEE_MODEL_HOLD;", holdAt)));
const heldAt = openBody.indexOf("if (held) return refuse(held);");
ok("6.1 · the open's frozen fees and the hold read ONE answer (openFeeFreeze), and the hold reads no date, no clock and no environment flag",
  openAt >= 0 && holdAt >= 0 && /rateOverrides: openFeeFreeze[(]fresh[.]config[)]/.test(openBody) && /openFeeFreeze[(]config[)][.]feeModel !== "jackpot-payout"/.test(holdBody)
    && !/Date|now|process[.]env|2026/.test(holdBody), holdBody.slice(0, 400));
ok("6.2 · the hold is asked before the licence, the source registry's seeding and the chain lock — before every write the open makes",
  heldAt > 0 && heldAt < openBody.indexOf("licence.standing.holds") && heldAt < openBody.indexOf("await seedDefaultSources()") && heldAt < openBody.indexOf("withLock(MASWALI_CHAIN_LOCK"),
  J({ heldAt }));
const env = process.env as Record<string, string | undefined>;
const realEnv = env.NODE_ENV;
let refused = false;
try {
  env.NODE_ENV = "production";
  try { W.svc.__liftMillioneaOpenHoldForTests(true); } catch { refused = true; }
} finally {
  if (realEnv === undefined) delete env.NODE_ENV; else env.NODE_ENV = realEnv;
}
ok("6.3 · ⛔ the seam refuses to lift the hold in production, and the hold still stands after the attempt",
  refused && W.svc.oldFeeModelHold({ visibility: "PUBLIC" }, getMaswaliConfig()) === HOLD_EN);

console.log(`${String.fromCharCode(10)}maswali open lock: ${pass} passed, ${fail} failed`);
/** The floor is every assertion this file makes (eleven); it only ever rises. */
const MIN_PASS = 11;
if (pass < MIN_PASS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_PASS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
