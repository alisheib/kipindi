/**
 * test:second-officer-switch — THE OWNER'S "SECOND-OFFICER CHECKS", DRIVEN (programme FEE-TAX-2026-10, release R1; ruling 6
 * of 2026-10-24, `docs/COMPLIANCE-DECISIONS.md`; the setting: `src/lib/server/second-officer-policy.ts`).
 *
 *   npx tsx scripts/second-officer-switch.test.mts     (npm run test:second-officer-switch — in predeploy)
 *   npm run red:second-officer-switch                  (its red twin: `scripts/anchors/second-officer-switch.anchors.mjs`)
 *
 *   §0 THE SETTING · ⭐ nothing stored reads OFF — the Owner's ruling is the default (his go-live answers of 2026-10-24: the
 *      setting goes live OFF, with no click after the release). A read that throws, a read that answers it could not be
 *      asked and a row this version cannot understand all read ON — never weaker on an error. A stored, well-formed row
 *      always wins: a stored ON reads ON, a stored OFF reads OFF. The setter is the Owner's alone (the STORED role), needs
 *      a reason of 5–300 characters, reads back what it wrote and records ONE COMPLIANCE row with the setting before and
 *      after; a change is seen by the very next check — there is no cache to wait out.
 *   §1–§12 THE TWELVE · each check through its real function on the in-memory store, under each answer the setting gives:
 *      a stored ON and a failed read refuse the same officer exactly as before R1 (cases `.a` and `.b` of each pair); a
 *      stored OFF and nothing stored let the same officer act (`.c` and `.d`). Beside the Millionea rulings and the poll
 *      hold, the checks that STAY whatever the setting says (ruling 6b — an officer's own case; the staff-may-not-play
 *      bar) are held too.
 *
 * ⭐ THE SETTING IS MOVED THROUGH ITS REAL DOORS: §0 through the Owner's own act on the memory row, §1–§12 through the store
 *    seam (`scripts/lib/second-officer-seam.mts`), which answers each position through the real reader.
 * ⛔ IMPORT ORDER IS THE CONTRACT: every store picks memory or Postgres when it is first imported, so the environment comes
 *    first and every product module is imported after it. This suite runs on memory only.
 * ⚠️ This file carries no backslash: the patterns below are plain words.
 */
delete process.env.DATABASE_URL;
process.env.USE_PRISMA_DAL = "false";
process.env.HB_MONEY_STORE = "memory";
process.env.MASWALI_SCHEDULER = "false";
process.env.LIFECYCLE_TICKER = "false";
process.env.SESSION_SECRET ??= "second-officer-switch-secret-0123456789abcdef0123";
process.env.OTP_PEPPER ??= "second-officer-pepper-0123";

const { loadMaswaliWorld } = await import("./lib/maswali-money-world.mts");
const { withSecondOfficerChecks: under } = await import("./lib/second-officer-seam.mts");
const W = await loadMaswaliWorld();
const policy = await import("../src/lib/server/second-officer-policy.ts");
const ob = await import("../src/lib/server/maswali-objections.ts");
const classic = await import("../src/lib/server/objections-service.ts");
const kycRisk = await import("../src/lib/server/kyc-risk.ts");
const { packApprovalGate } = await import("../src/lib/server/report-pack.ts");
const { purgeStage2Gate } = await import("../src/app/admin/retention/purge-stage1-store.ts");
const { amlReleaseStep } = await import("../src/app/admin/aml/stage1-store.ts");
const { largeAdjustmentStep, getAdjustStage1, setAdjustStage1 } = await import("../src/app/admin/players/[id]/adjust-stage1-store.ts");
const { adminAdjustBalance } = await import("../src/lib/server/wallet-service.ts");
const staging = await import("../src/lib/server/contacts/import-staging.ts");
const { audit, auditFlush, getAuditByActionsDurable } = await import("../src/lib/server/audit.ts");

type State = import("./lib/second-officer-seam.mts").SecondOfficerState;
/** The four answers each check is driven under: two refuse as before R1, two let the same officer act. */
const ON: State = "stored-on", FAILS: State = "read-fails", OFF: State = "stored-off", NONE: State = "absent";

/* eslint-disable @typescript-eslint/no-explicit-any */
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const section = (s: string) => console.log(`${String.fromCharCode(10)}── ${s}`);
const J = (x: unknown) => JSON.stringify(x);
const errOf = (r: any) => (r && r.ok === false ? String(r.error) : "");
const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const rowsOf = async (action: string) => {
  await auditFlush();
  return (await getAuditByActionsDurable([action], { limit: 500 })).entries as any[];
};

await W.setup({ guarantee: 30_000_000 });

/** The officers. The sealer and the confirmers are COMPLIANCE, so a refusal on a ruling is the setting's, never the role's. */
const OWNER = await W.user({ role: "ADMIN" });
const COMP = await W.user({ role: "COMPLIANCE" });
const SEALER = await W.user({ role: "COMPLIANCE" });
const COMP_A = await W.user({ role: "COMPLIANCE" });
const COMP_B = await W.user({ role: "COMPLIANCE" });
const DRAFTER = await W.user({ role: "MODERATOR" });
const READER = await W.user({ role: "MODERATOR" });
const OTHER = await W.user({ role: "MODERATOR" });

// ═══ §0 · THE SETTING ════════════════════════════════════════════════════════════════════════════════════════════════
section("§0 · the setting: nothing stored is the Owner's OFF; a failed or unreadable read is ON; a stored row always wins");
policy.__setSecondOfficerStoreForTests(null);
const absent = await policy.readSecondOfficerPolicy();
ok("0.1 · ⭐ nothing stored reads OFF — the Owner's ruling of 2026-10-24 is the default, live without a click",
  absent.source === "absent" && absent.on === false && (await policy.secondOfficerChecksOn()) === false, J(absent));

const answered = (value: unknown) => ({ hasDatabase: () => true, loadConfigResult: async () => ({ ok: true as const, value }) });
policy.__setSecondOfficerStoreForTests({ hasDatabase: () => true, loadConfigResult: async () => { throw new Error("injected database outage"); } });
const thrown = await policy.readSecondOfficerPolicy();
const thrownOn = await policy.secondOfficerChecksOn();
policy.__setSecondOfficerStoreForTests(null);
ok("0.2 · a read that THROWS is unreadable, and unreadable is ON — never weaker on an error", thrown.source === "unreadable" && thrown.on === true && thrownOn === true, J(thrown));

policy.__setSecondOfficerStoreForTests({ hasDatabase: () => true, loadConfigResult: async () => ({ ok: false as const, error: "injected: the store could not be asked" }) });
const unasked = await policy.readSecondOfficerPolicy();
const unaskedOn = await policy.secondOfficerChecksOn();
policy.__setSecondOfficerStoreForTests(null);
ok("0.3 · a read that answers it could not be asked is unreadable, and ON — a failed read is never mistaken for nothing stored",
  unasked.source === "unreadable" && unasked.on === true && unaskedOn === true, J(unasked));

const malformedRows = [{ on: "false" }, { on: false }, { on: false, changedBy: 7, changedAt: "x", reason: "y" }, ["off"], "OFF", { on: "true" }];
const malformed = [] as any[];
for (const v of malformedRows) {
  policy.__setSecondOfficerStoreForTests(answered(v));
  malformed.push({ read: await policy.readSecondOfficerPolicy(), on: await policy.secondOfficerChecksOn() });
}
policy.__setSecondOfficerStoreForTests(null);
ok("0.4 · a row this version cannot understand (a string 'false', an OFF with no author, a list, a word) reads ON — an error, never the Owner's OFF",
  malformed.every((m) => m.read.source === "malformed" && m.read.on === true && m.on === true), J(malformed.map((m) => m.read.source)));

policy.__setSecondOfficerStoreForTests(answered({ on: false, changedBy: OWNER, changedAt: "2026-10-24T09:00:00.000Z", reason: "Ruling 6 of 2026-10-24" }));
const storedOff = await policy.readSecondOfficerPolicy();
const storedOffOn = await policy.secondOfficerChecksOn();
policy.__setSecondOfficerStoreForTests(null);
ok("0.5 · a stored, well-formed OFF reads OFF, with who, when and why", storedOff.source === "stored" && storedOff.on === false && storedOffOn === false
  && storedOff.changedBy === OWNER && storedOff.reason === "Ruling 6 of 2026-10-24", J(storedOff));

policy.__setSecondOfficerStoreForTests(answered({ on: true, changedBy: OWNER, changedAt: "2026-10-25T09:00:00.000Z", reason: "Back on while the desk is new" }));
const storedOn = await policy.readSecondOfficerPolicy();
const storedOnOn = await policy.secondOfficerChecksOn();
policy.__setSecondOfficerStoreForTests(null);
ok("0.6 · ⭐ a stored ON always wins over the default: it reads ON, with who, when and why", storedOn.source === "stored" && storedOn.on === true && storedOnOn === true
  && storedOn.changedBy === OWNER && storedOn.reason === "Back on while the desk is new", J(storedOn));

const refusedRows = async () => (await rowsOf("privilege_escalation_blocked")).filter((e) => e.actorId === COMP && e.targetId === "second_officer.checks_on" && e.category === "SECURITY").length;
const securityBefore = await refusedRows();
const byCompliance = await policy.setSecondOfficerChecks(true, COMP, "A compliance officer tries the Owner's switch");
const securityAfter = await refusedRows();
ok("0.7 · ⛔ the setter is the Owner's alone (the STORED role): a COMPLIANCE officer is refused, a SECURITY row says so, and nothing is stored",
  !byCompliance.ok && byCompliance.code === "not_owner" && securityAfter === securityBefore + 1
    && (await policy.readSecondOfficerPolicy()).source === "absent", J({ byCompliance, securityBefore, securityAfter }));

const ZW = String.fromCharCode(0x200b);
const tooShort = await policy.setSecondOfficerChecks(true, OWNER, "four");
const invisible = await policy.setSecondOfficerChecks(true, OWNER, ZW.repeat(5));
const tooLong = await policy.setSecondOfficerChecks(true, OWNER, "x".repeat(301));
ok("0.8 · ⛔ the setter needs a reason: four characters, five zero-width spaces and 301 characters are each refused on the reason, and nothing is stored",
  !tooShort.ok && tooShort.code === "reason_short" && tooShort.field === "reason" && !invisible.ok && invisible.code === "reason_short"
    && !tooLong.ok && tooLong.code === "reason_long" && (await policy.readSecondOfficerPolicy()).source === "absent", J({ tooShort, invisible, tooLong }));

const offRowsAtStart = (await rowsOf("second_officer.checks_off")).length;
const offWhileAbsent = await policy.setSecondOfficerChecks(false, OWNER, "OFF while nothing is stored");
ok("0.9 · with nothing stored the Owner's OFF changes nothing — the ruling already reads OFF: nothing written, nothing recorded",
  offWhileAbsent.ok && offWhileAbsent.changed === false && offWhileAbsent.on === false && (await policy.readSecondOfficerPolicy()).source === "absent"
    && (await rowsOf("second_officer.checks_off")).length === offRowsAtStart, J(offWhileAbsent));

const onRowsBefore = (await rowsOf("second_officer.checks_on")).length;
const turnedOn = await policy.setSecondOfficerChecks(true, OWNER, "The desk is new: second officers again for now");
const readOn = await policy.readSecondOfficerPolicy();
const onRows = await rowsOf("second_officer.checks_on");
const onRow = onRows[0];
ok("0.10 · ⭐ the Owner turns them back ON: stored and read back, and ONE COMPLIANCE row records the setting before (nothing stored, OFF) and after (ON), the reason and who",
  turnedOn.ok && turnedOn.changed && turnedOn.on === true && turnedOn.recorded && readOn.source === "stored" && readOn.on === true && readOn.changedBy === OWNER
    && onRows.length === onRowsBefore + 1 && onRow?.category === "COMPLIANCE" && onRow?.actorId === OWNER && onRow?.targetId === policy.SECOND_OFFICER_POLICY_KEY
    && onRow?.payload?.before?.on === false && onRow?.payload?.before?.source === "absent" && onRow?.payload?.after?.on === true
    && onRow?.payload?.reason === "The desk is new: second officers again for now", J({ turnedOn, readOn, onRow }));

const nextOn = await policy.secondOfficerChecksOn();
const turnedOff = await policy.setSecondOfficerChecks(false, OWNER, "Ruling 6: any admin may do any step");
const nextOff = await policy.secondOfficerChecksOn();
const offRow = (await rowsOf("second_officer.checks_off"))[0];
ok("0.11 · ⭐ no cache: the very next check after the Owner's ON reads ON, and after the Owner's OFF reads OFF — the OFF has its own row, before ON and after OFF",
  nextOn === true && turnedOff.ok && turnedOff.changed && nextOff === false && offRow?.payload?.before?.on === true && offRow?.payload?.before?.source === "stored"
    && offRow?.payload?.after?.on === false && offRow?.actorId === OWNER, J({ nextOn, turnedOff, nextOff, offRow: offRow?.payload }));

const offRowsBefore = (await rowsOf("second_officer.checks_off")).length;
const again = await policy.setSecondOfficerChecks(false, OWNER, "Already off, pressed twice");
ok("0.12 · a change to the position it already holds writes nothing and records nothing",
  again.ok && again.changed === false && (await rowsOf("second_officer.checks_off")).length === offRowsBefore, J(again));

policy.__setSecondOfficerStoreForTests({ hasDatabase: () => true, loadConfigResult: async () => ({ ok: false as const, error: "injected outage" }), saveConfig: async () => {} });
const blind = await policy.setSecondOfficerChecks(true, OWNER, "On while the store is down");
policy.__setSecondOfficerStoreForTests(null);
ok("0.13 · ⛔ a setting that cannot be read is never changed: the record would name a 'before' nobody read", !blind.ok && blind.code === "unread", J(blind));
// The memory row is empty again (nothing stored: the Owner's OFF) for §1–§12, which move the setting through the seam alone.
ok("0.14 · control · after §0 nothing is stored and the checks read OFF", (await policy.readSecondOfficerPolicy()).source === "absent" && (await policy.secondOfficerChecksOn()) === false);

// ═══ §1–§2 · MILLIONEA — WHO ATTESTS A DRAFT'S THREE LANGUAGES (MB-79) ════════════════════════════════════════════
section("§1–§2 · Millionea: the drafter, an editor, and the draft history read only for them");
async function draft(weeksAhead: number): Promise<any> {
  const start = W.weekStartAhead(weeksAhead);
  const c = await W.svc.createWeek({ weekStartMs: start, questions: W.questions(start), officerId: DRAFTER, now: new Date(start - 3 * DAY) });
  if (!c.ok) throw new Error(`draft refused: ${c.error}`);
  return c.week;
}
const attest = async (weekId: string, officerId: string, readHistory?: any) =>
  W.svc.attestParity({ weekId, officerId, readVersion: await W.svc.readDraftVersion(weekId), ...(readHistory ? { readHistory } : {}) });
const versionOf = async (weekId: string, slot: number) => W.svc.draftRowVersion((await W.dal.questionStore.listForWeek(weekId)).find((q: any) => q.slot === slot));
const edit = async (weekId: string, slot: number, textEn: string, officerId: string) =>
  W.svc.editDraftQuestion({ weekId, slot, changes: { textEn }, officerId, version: await versionOf(weekId, slot) });
/** An edit whose audit row is lost (the service's writer seam): the text it leaves has no recorded author. */
async function lostEdit(weekId: string, slot: number, textEn: string, officerId: string): Promise<any> {
  W.svc.__setMaswaliAuditWriterForTests(async (row: any) => (row.action === "maswali.week.draft_edited" ? { recorded: false } : audit(row)));
  try { return await edit(weekId, slot, textEn, officerId); } finally { W.svc.__setMaswaliAuditWriterForTests(null); }
}
const attestedBy = async (weekId: string) => (await W.dal.weekStore.get(weekId))?.parityAttestedBy ?? null;

// ── 1 · the drafter ──
const d1 = await draft(20);
const drafterOn = await under(ON, () => attest(d1.id, DRAFTER));
ok("1.a · ON (stored) · the officer who drafted a week cannot attest its translations (MLN-SOD-01, as before R1)",
  !drafterOn.ok && /drafted the week cannot attest/.test(errOf(drafterOn)) && (await attestedBy(d1.id)) === null, errOf(drafterOn));
const drafterFails = await under(FAILS, () => attest(d1.id, DRAFTER));
ok("1.b · ON (a failed read) · the setting cannot be read, so the drafter is refused as before",
  !drafterFails.ok && /drafted the week cannot attest/.test(errOf(drafterFails)) && (await attestedBy(d1.id)) === null, errOf(drafterFails));
const drafterOff = await under(OFF, () => attest(d1.id, DRAFTER));
const attestRows = (await rowsOf("maswali.week.parity_attested")).filter((e) => e.targetId === d1.id);
ok("1.c · OFF (stored) · the drafter attests their own week — the step stays, and its row is written under their name",
  drafterOff.ok && drafterOff.recorded === true && (await attestedBy(d1.id)) === DRAFTER && attestRows.length === 1 && attestRows[0].actorId === DRAFTER, J({ drafterOff, rows: attestRows.length }));
const d1b = await draft(22);
const drafterNone = await under(NONE, () => attest(d1b.id, DRAFTER));
ok("1.d · OFF (nothing stored — the Owner's ruling) · the drafter attests their own week",
  drafterNone.ok && (await attestedBy(d1b.id)) === DRAFTER, errOf(drafterNone));

// ── 2 · an editor since the last attestation, and the history read that exists only for 1 and 2 ──
const d2 = await draft(21);
const e1 = await edit(d2.id, 7, "Will event 7 happen this weekend?", OTHER);
const editorOn = await under(ON, () => attest(d2.id, OTHER));
ok("2.a · ON (stored) · an officer who edited the draft since its last attestation cannot attest it (MLN-SOD-02)",
  e1.ok && !editorOn.ok && /You edited this draft since its last attestation/.test(errOf(editorOn)), errOf(editorOn));
const editorFails = await under(FAILS, () => attest(d2.id, OTHER));
ok("2.b · ON (a failed read) · the editor is refused as before",
  !editorFails.ok && /You edited this draft since its last attestation/.test(errOf(editorFails)), errOf(editorFails));
const editorOff = await under(OFF, () => attest(d2.id, OTHER));
ok("2.c · OFF (stored) · the officer who edited it attests it", editorOff.ok && (await attestedBy(d2.id)) === OTHER, errOf(editorOff));
const d2b = await draft(23);
const e1b = await edit(d2b.id, 7, "Will event 7 happen this weekend?", OTHER);
const editorNone = await under(NONE, () => attest(d2b.id, OTHER));
ok("2.d · OFF (nothing stored) · the officer who edited it attests it", e1b.ok && editorNone.ok && (await attestedBy(d2b.id)) === OTHER, errOf(editorNone));

const e2 = await edit(d2.id, 7, "Will event 7 happen this weekend at all?", DRAFTER);
let historyReads = 0;
const outage = async () => { historyReads++; throw new Error("injected history outage"); };
const outageOn = await under(ON, () => attest(d2.id, READER, outage));
const readsWhileOn = historyReads;
ok("2.e · ON (stored) · a draft history that cannot be read refuses the attestation (MLN-SOD-03, fail closed)",
  e2.ok && !outageOn.ok && /history could not be read/.test(errOf(outageOn)) && readsWhileOn === 1, errOf(outageOn));
const outageFails = await under(FAILS, () => attest(d2.id, READER, outage));
const readsWhileFailing = historyReads;
ok("2.f · ON (a failed read) · the history is read, and its outage refuses as before",
  !outageFails.ok && /history could not be read/.test(errOf(outageFails)) && readsWhileFailing === 2, errOf(outageFails));
const outageOff = await under(OFF, () => attest(d2.id, READER, outage));
ok("2.g · OFF (stored) · the draft history is never read, so its outage refuses nothing: the attestation lands",
  outageOff.ok && historyReads === readsWhileFailing && (await attestedBy(d2.id)) === READER, J({ outageOff, historyReads }));
const e3 = await edit(d2.id, 7, "Will event 7 happen this weekend, as drawn?", DRAFTER);
const outageNone = await under(NONE, () => attest(d2.id, READER, outage));
ok("2.h · OFF (nothing stored) · the history is not read either: its outage refuses nothing",
  e3.ok && outageNone.ok && historyReads === readsWhileFailing && (await attestedBy(d2.id)) === READER, J({ outageNone, historyReads }));

const lost1 = await lostEdit(d2.id, 8, "Will event 8 happen on Sunday?", OTHER);
const authorlessOn = await under(ON, () => attest(d2.id, READER));
ok("2.i · ON (stored) · after an edit whose record was not written the text has no recorded author, and the attestation is refused",
  lost1?.ok === true && lost1.recorded === false && !authorlessOn.ok && /no audit record of who wrote it/.test(errOf(authorlessOn)), errOf(authorlessOn));
const authorlessFails = await under(FAILS, () => attest(d2.id, READER));
ok("2.j · ON (a failed read) · the authorless text is refused as before", !authorlessFails.ok && /no audit record of who wrote it/.test(errOf(authorlessFails)), errOf(authorlessFails));
const authorlessOff = await under(OFF, () => attest(d2.id, READER));
ok("2.k · OFF (stored) · a text with no recorded author is attested — no author is asked for", authorlessOff.ok && (await attestedBy(d2.id)) === READER, errOf(authorlessOff));
const lost2 = await lostEdit(d2.id, 8, "Will event 8 happen this Sunday, as drawn?", OTHER);
const authorlessNone = await under(NONE, () => attest(d2.id, READER));
ok("2.l · OFF (nothing stored) · a text with no recorded author is attested",
  lost2?.ok === true && lost2.recorded === false && authorlessNone.ok && (await attestedBy(d2.id)) === READER, errOf(authorlessNone));

// ═══ §3–§5 · MILLIONEA — THE CORRECTION AND THE OBJECTION RULINGS ═════════════════════════════════════════════════
section("§3–§5 · Millionea: who corrects a result, who rules on its objections");
type Pick = "YES" | "NO";
const slip = (): Pick[] => Array.from({ length: 15 }, () => "YES" as Pick);
async function soldWeek(weeksAhead: number, players: string[]): Promise<{ wk: any; start: number }> {
  const { week, start } = await W.openWeek({ weeksAhead });
  for (const u of players) {
    const r = await W.buy(u, week.id, [slip()]);
    if (!r.ok) throw new Error(`a purchase was refused: ${r.error} (${r.reason})`);
  }
  const c = await W.svc.closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt) + MIN) });
  if (!c.ok) throw new Error(`close: ${c.error}`);
  return { wk: week, start };
}
async function sealAll(weekId: string, at: Date, twoOfficerSlots: number[] = []): Promise<void> {
  for (let slot = 1; slot <= 15; slot++) {
    const two = twoOfficerSlots.includes(slot);
    const r = await W.svc.sealQuestion({ weekId, slot, outcome: "YES", evidence: `Official result for event ${slot}`, officerId: SEALER, now: at, twoOfficerNow: async () => two });
    if (!r.ok) throw new Error(`seal ${slot}: ${r.error}`);
  }
}
const question = async (weekId: string, slot: number) => (await W.dal.questionStore.listForWeek(weekId)).find((q: any) => q.slot === slot);
const reviewed = async (weekId: string, slot: number) => {
  const q = await question(weekId, slot);
  return { expectedOutcome: q?.outcome, expectedSealedAt: q?.sealedAt };
};
const file = (userId: string, weekId: string, slot: number, now: Date) =>
  ob.fileMillioneaObjection({ userId, weekId, slot, reason: "WRONG_OUTCOME", detail: `The source published another result for question ${slot}`, now });
const rule = async (objectionId: string, officerId: string, ruling: string, weekId: string, slot: number, now: Date) =>
  ob.decideMillioneaObjection({ objectionId, officerId, ruling: ruling as any, voidReason: null, note: `Read the official source again for question ${slot}`, ...(await reviewed(weekId, slot)), now });
const correct = async (weekId: string, slot: number, outcome: Pick, officerId: string, now: Date) =>
  W.svc.correctSeal({ weekId, slot, outcome, evidence: `Corrected against the official source for event ${slot}`, ...(await reviewed(weekId, slot)), officerId, now });
const ruledBy = async (objectionId: string) => (await W.db.objection.findById(objectionId))?.reviewedBy ?? null;

// ── 3 · the correction ──
const [CP1] = [await W.user({ balance: 50_000 })];
const C3 = await soldWeek(3, [CP1]);
const sealC3 = new Date(C3.start + 9 * DAY);
await sealAll(C3.wk.id, sealC3);
let m3 = 0;
const at3 = () => new Date(sealC3.getTime() + HOUR + ++m3 * MIN);
const byOtherOn = await under(ON, async () => correct(C3.wk.id, 9, "NO", COMP_A, at3()));
ok("3.a · ON (stored) · only the officer who set a question's present result corrects it: another officer is refused in the seal's words (MLN-OWN-01)",
  !byOtherOn.ok && /Only the officer who sealed a question may correct it/.test(errOf(byOtherOn)) && (await question(C3.wk.id, 9)).outcome === "YES", errOf(byOtherOn));
const byOtherFails = await under(FAILS, async () => correct(C3.wk.id, 9, "NO", COMP_A, at3()));
ok("3.b · ON (a failed read) · another officer is refused as before",
  !byOtherFails.ok && /Only the officer who sealed a question may correct it/.test(errOf(byOtherFails)) && (await question(C3.wk.id, 9)).outcome === "YES", errOf(byOtherFails));
const byOtherOff = await under(OFF, async () => correct(C3.wk.id, 9, "NO", COMP_A, at3()));
ok("3.c · OFF (stored) · that officer corrects it inside the window, and the present record is not read", byOtherOff.ok && (await question(C3.wk.id, 9)).outcome === "NO", errOf(byOtherOff));
const byOtherNone = await under(NONE, async () => correct(C3.wk.id, 10, "NO", COMP_A, at3()));
ok("3.d · OFF (nothing stored) · that officer corrects another of the sealer's results", byOtherNone.ok && (await question(C3.wk.id, 10)).outcome === "NO", errOf(byOtherNone));

// ── 4 and 5 · the objection rulings ──
const [P1, P2, P3, P4] = [await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })];
const C4 = await soldWeek(4, [P1, P2, P3, P4]);
const sealC4 = new Date(C4.start + 9 * DAY);
// M2 is sealed under the two-officer rule and confirmed by COMP_B; the rest by the sealer alone.
await sealAll(C4.wk.id, sealC4, [2]);
const confirmed = await W.svc.confirmSeal({ weekId: C4.wk.id, slot: 2, officerId: COMP_B, ...(await reviewed(C4.wk.id, 2)), now: sealC4 });
if (!confirmed.ok) throw new Error(`confirm: ${confirmed.error}`);
let m4 = 0;
const at4 = () => new Date(sealC4.getTime() + HOUR + ++m4 * MIN);
const idOf = (f: any) => (f.ok ? String(f.objectionId) : "");

const f3 = await file(P1, C4.wk.id, 3, at4());
const sealerOn = await under(ON, () => rule(idOf(f3), SEALER, "REJECT", C4.wk.id, 3, at4()));
ok("4.a · ON (stored) · the officer who sealed the question never rules on its objections (MLN-SOD-07)",
  f3.ok && !sealerOn.ok && /another officer rules/.test(errOf(sealerOn)), J({ f3, sealerOn }));
const sealerFails = await under(FAILS, () => rule(idOf(f3), SEALER, "REJECT", C4.wk.id, 3, at4()));
ok("4.b · ON (a failed read) · the sealer is refused as before", !sealerFails.ok && /another officer rules/.test(errOf(sealerFails)), errOf(sealerFails));
const sealerOff = await under(OFF, () => rule(idOf(f3), SEALER, "REJECT", C4.wk.id, 3, at4()));
ok("4.c · OFF (stored) · the sealer rules on it", sealerOff.ok && (await ruledBy(idOf(f3))) === SEALER, errOf(sealerOff));
const f3b = await file(P2, C4.wk.id, 3, at4());
const sealerNone = await under(NONE, () => rule(idOf(f3b), SEALER, "REJECT", C4.wk.id, 3, at4()));
ok("4.d · OFF (nothing stored) · the sealer rules on another objection to it", f3b.ok && sealerNone.ok && (await ruledBy(idOf(f3b))) === SEALER, J({ f3b, sealerNone }));

const f2 = await file(P2, C4.wk.id, 2, at4());
const confirmerOn = await under(ON, () => rule(idOf(f2), COMP_B, "REJECT", C4.wk.id, 2, at4()));
ok("4.e · ON (stored) · the officer who confirmed the seal never rules on its objections either (MLN-SOD-07)",
  f2.ok && !confirmerOn.ok && /another officer rules/.test(errOf(confirmerOn)), J({ f2, confirmerOn }));
const confirmerFails = await under(FAILS, () => rule(idOf(f2), COMP_B, "REJECT", C4.wk.id, 2, at4()));
ok("4.f · ON (a failed read) · the confirmer is refused as before", !confirmerFails.ok && /another officer rules/.test(errOf(confirmerFails)), errOf(confirmerFails));
const confirmerOff = await under(OFF, () => rule(idOf(f2), COMP_B, "REJECT", C4.wk.id, 2, at4()));
ok("4.g · OFF (stored) · the confirmer rules on it", confirmerOff.ok && (await ruledBy(idOf(f2))) === COMP_B, errOf(confirmerOff));
const f2b = await file(P3, C4.wk.id, 2, at4());
const confirmerNone = await under(NONE, () => rule(idOf(f2b), COMP_B, "REJECT", C4.wk.id, 2, at4()));
ok("4.h · OFF (nothing stored) · the confirmer rules on another objection to it", f2b.ok && confirmerNone.ok && (await ruledBy(idOf(f2b))) === COMP_B, J({ f2b, confirmerNone }));

const f5a = await file(P3, C4.wk.id, 5, at4());
const rev5 = await under(ON, () => rule(idOf(f5a), COMP_A, "REVERSE", C4.wk.id, 5, at4()));
const f5b = await file(P1, C4.wk.id, 5, at4());
const authorOn = await under(ON, () => rule(idOf(f5b), COMP_A, "REJECT", C4.wk.id, 5, at4()));
ok("5.a · ON (stored) · the officer whose upheld ruling set a question's present result never rules on its next objection (MLN-SOD-08)",
  rev5.ok && f5b.ok && !authorOn.ok && /present result on an earlier objection/.test(errOf(authorOn)), J({ rev5, f5b, authorOn }));
const authorFails = await under(FAILS, () => rule(idOf(f5b), COMP_A, "REJECT", C4.wk.id, 5, at4()));
ok("5.b · ON (a failed read) · that officer is refused as before", !authorFails.ok && /present result on an earlier objection/.test(errOf(authorFails)), errOf(authorFails));
const authorOff = await under(OFF, () => rule(idOf(f5b), COMP_A, "REJECT", C4.wk.id, 5, at4()));
ok("5.c · OFF (stored) · that officer rules on it", authorOff.ok && (await ruledBy(idOf(f5b))) === COMP_A, errOf(authorOff));
const f5c = await file(P2, C4.wk.id, 5, at4());
const authorNone = await under(NONE, () => rule(idOf(f5c), COMP_A, "REJECT", C4.wk.id, 5, at4()));
ok("5.d · OFF (nothing stored) · that officer rules on another objection to it", f5c.ok && authorNone.ok && (await ruledBy(idOf(f5c))) === COMP_A, J({ f5c, authorNone }));

// ⛔ KEPT whatever the setting says (ruling 6b; the staff-may-not-play bar): P4, a ticket holder made an officer mid-week.
await W.setUserFields(P4, { role: "COMPLIANCE" });
const f7 = await file(P4, C4.wk.id, 7, at4());
const f8 = await file(P1, C4.wk.id, 8, at4());
const keptAt = at4();
const ownOff = await under(OFF, () => rule(idOf(f7), P4, "REJECT", C4.wk.id, 7, keptAt));
const holderOff = await under(OFF, () => rule(idOf(f8), P4, "REJECT", C4.wk.id, 8, keptAt));
const ownNone = await under(NONE, () => rule(idOf(f7), P4, "REJECT", C4.wk.id, 7, keptAt));
const holderNone = await under(NONE, () => rule(idOf(f8), P4, "REJECT", C4.wk.id, 8, keptAt));
ok("5.e · OFF (stored, and nothing stored) · ⛔ kept: the objector never rules on their own objection, and an officer holding a ticket in the week never rules on its objections",
  f7.ok && f8.ok && [ownOff, ownNone].every((r) => !r.ok && /your own objection/.test(errOf(r)))
    && [holderOff, holderNone].every((r) => !r.ok && /holds a ticket in this week/.test(errOf(r))), J({ ownOff, holderOff, ownNone, holderNone }));

// ═══ §6 · IDENTITY — THE HIGH-RISK MAKER-CHECKER ═══════════════════════════════════════════════════════════════════
section("§6 · identity: the high-risk maker-checker and its fail-closed risk read");
const K1 = await W.user({ role: "COMPLIANCE" });
const K2 = await W.user({ role: "COMPLIANCE" });
const risky = await W.user({ balance: 0 });
const nowIso = () => new Date().toISOString();
let tseq = 0;
const txn = (type: string, status: string, amount: number) => W.db.txn.create({
  id: `txn_so_${risky}_${++tseq}`, walletId: `wal_${risky}`, userId: risky, type, status, amount, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS",
  provider: "INTERNAL", providerRef: null, msisdn: null, description: null, positionId: null, amlReason: null, createdAt: nowIso(), updatedAt: nowIso(), completedAt: nowIso(),
});
for (let i = 0; i < 3; i++) await txn("WITHDRAWAL", "CONFIRMED", -1_200_000);
for (let i = 0; i < 2; i++) await txn("WITHDRAWAL", "AML_REVIEW", -2_000_000);
for (let i = 0; i < 6; i++) await txn("DEPOSIT", "CONFIRMED", 10_000);
const VERSION = "so-case-version-1";
await audit({ category: "COMPLIANCE", action: "kyc.approve.recommended", actorId: K1, targetType: "User", targetId: risky, payload: { version: VERSION } });
await auditFlush();
const riskNow = await kycRisk.kycRiskScore(risky);
const checker = (officerId: string) => kycRisk.kycApprovalMakerChecker({ userId: risky, version: VERSION, officerId });
const selfOn = await under(ON, () => checker(K1));
const otherOn = await under(ON, () => checker(K2));
ok("6.a · ON (stored) · at a high risk score the officer who recommended the approval cannot seal it; a different officer can (KYC maker-checker)",
  riskNow.score >= kycRisk.KYC_MAKER_CHECKER_THRESHOLD && !selfOn.ok && /Second officer required/.test(errOf(selfOn)) && otherOn.ok && otherOn.makerChecker === true,
  J({ score: riskNow.score, selfOn, otherOn }));
const selfFails = await under(FAILS, () => checker(K1));
ok("6.b · ON (a failed read) · the recommender is refused as before", !selfFails.ok && /Second officer required/.test(errOf(selfFails)), J(selfFails));
const selfOff = await under(OFF, () => checker(K1));
ok("6.c · OFF (stored) · the recommender approves at the same score; the score still rides the approval's record",
  selfOff.ok && selfOff.makerChecker === false && selfOff.riskScore === riskNow.score, J(selfOff));
const selfNone = await under(NONE, () => checker(K1));
ok("6.d · OFF (nothing stored) · the recommender approves; the score still rides the record",
  selfNone.ok && selfNone.makerChecker === false && selfNone.riskScore === riskNow.score, J(selfNone));
const realList = W.db.txn.listForUser;
W.db.txn.listForUser = async () => { throw new Error("injected: the transactions could not be read"); };
let blindOn: any, blindFails: any, blindOff: any, blindNone: any;
try {
  blindOn = await under(ON, () => checker(K2));
  blindFails = await under(FAILS, () => checker(K2));
  blindOff = await under(OFF, () => checker(K1));
  blindNone = await under(NONE, () => checker(K1));
} finally { W.db.txn.listForUser = realList; }
ok("6.e · ON (stored) · a risk score that cannot be read refuses the approval (the rule could not be checked)",
  !blindOn.ok && /risk score could not be read/.test(errOf(blindOn)), J(blindOn));
ok("6.f · ON (a failed read) · the unreadable score refuses as before", !blindFails.ok && /risk score could not be read/.test(errOf(blindFails)), J(blindFails));
ok("6.g · OFF (stored) · the unreadable score refuses nothing: the approval proceeds, and the record says the score was not read",
  blindOff.ok && blindOff.riskScore === null && blindOff.makerChecker === false, J(blindOff));
ok("6.h · OFF (nothing stored) · the unreadable score refuses nothing", blindNone.ok && blindNone.riskScore === null && blindNone.makerChecker === false, J(blindNone));

// ═══ §7 · THE GAMING BOARD MONTHLY PACK ════════════════════════════════════════════════════════════════════════════
section("§7 · the monthly pack: its preparer approves it only while the checks are OFF");
const PACK = { period: "2026-09", preparedBy: K1 };
const blocked = async () => (await rowsOf("pack.approve.conflict_blocked")).length;
const blockedBefore = await blocked();
const packOn = await under(ON, () => packApprovalGate(PACK, K1));
const blockedAfterOn = await blocked();
ok("7.a · ON (stored) · the officer who prepared the pack cannot approve it, and the refused attempt is recorded",
  packOn !== null && /you prepared this pack and cannot approve your own work/.test(packOn.error) && blockedAfterOn === blockedBefore + 1, J(packOn));
const packFails = await under(FAILS, () => packApprovalGate(PACK, K1));
const blockedAfterFails = await blocked();
ok("7.b · ON (a failed read) · the preparer is refused as before, and recorded", packFails !== null && blockedAfterFails === blockedAfterOn + 1, J(packFails));
const packOff = await under(OFF, () => packApprovalGate(PACK, K1));
ok("7.c · OFF (stored) · the preparer approves it (no refusal, no conflict row)", packOff === null && (await blocked()) === blockedAfterFails, J(packOff));
const packNone = await under(NONE, () => packApprovalGate(PACK, K1));
ok("7.d · OFF (nothing stored) · the preparer approves it", packNone === null && (await blocked()) === blockedAfterFails, J(packNone));

// ═══ §8 · UP & DOWN — AN ARCHIVED CHAIN'S PURGE ════════════════════════════════════════════════════════════════════
section("§8 · the chain purge: stage 2 by the officer who signed stage 1");
const STAGE1 = { actorId: K1, at: new Date().toISOString(), reason: "Retention period over for this chain", basis: "Data retention schedule" };
const stage2 = () => purgeStage2Gate(STAGE1, K1, "udc_so_chain", "BTC 5 MIN");
const purgeOn = await under(ON, stage2);
ok("8.a · ON (stored) · the officer who recorded the reason cannot complete the purge — a second officer must",
  purgeOn !== null && /you recorded the reason yourself/.test(purgeOn.error), J(purgeOn));
const purgeFails = await under(FAILS, stage2);
ok("8.b · ON (a failed read) · the same officer is refused as before", purgeFails !== null && /you recorded the reason yourself/.test(purgeFails.error), J(purgeFails));
const purgeOff = await under(OFF, stage2);
ok("8.c · OFF (stored) · the same officer completes it", purgeOff === null, J(purgeOff));
const purgeNone = await under(NONE, stage2);
ok("8.d · OFF (nothing stored) · the same officer completes it", purgeNone === null, J(purgeNone));

// ═══ §9 · A HELD WITHDRAWAL AT OR ABOVE THE TWO-PERSON LINE ═══════════════════════════════════════════════════════
section("§9 · a held large withdrawal: two different approvers");
const amlFirst = await under(ON, () => amlReleaseStep("txn_so_aml_1", K1, 2_000_000));
const amlSame = await under(ON, () => amlReleaseStep("txn_so_aml_1", K1, 2_000_000));
const amlOther = await under(ON, () => amlReleaseStep("txn_so_aml_1", K2, 2_000_000));
ok("9.a · ON (stored) · the first approval records stage 1, the SAME officer's second approval is refused, a different officer's releases it",
  amlFirst.kind === "first" && amlSame.kind === "same" && amlOther.kind === "release" && amlOther.firstOfficerId === K1, J({ amlFirst, amlSame, amlOther }));
const amlFailsFresh = await under(FAILS, () => amlReleaseStep("txn_so_aml_2", K1, 2_000_000));
const amlFailsSame = await under(FAILS, () => amlReleaseStep("txn_so_aml_2", K1, 2_000_000));
ok("9.b · ON (a failed read) · a fresh row only records stage 1, and the same officer's second approval is refused",
  amlFailsFresh.kind === "first" && amlFailsSame.kind === "same", J({ amlFailsFresh, amlFailsSame }));
const amlOff = await under(OFF, () => amlReleaseStep("txn_so_aml_3", K1, 2_000_000));
const amlOffStaged = await under(OFF, () => amlReleaseStep("txn_so_aml_2", K1, 2_000_000));
ok("9.c · OFF (stored) · one officer's approval releases it — at once on a fresh row, and on a row they had already signed",
  amlOff.kind === "release" && amlOff.firstOfficerId === null && amlOffStaged.kind === "release" && amlOffStaged.firstOfficerId === K1, J({ amlOff, amlOffStaged }));
const amlStaged = await under(ON, () => amlReleaseStep("txn_so_aml_4", K1, 2_000_000));
const amlNone = await under(NONE, () => amlReleaseStep("txn_so_aml_5", K1, 2_000_000));
const amlNoneStaged = await under(NONE, () => amlReleaseStep("txn_so_aml_4", K1, 2_000_000));
ok("9.d · OFF (nothing stored) · one officer's approval releases it — on a fresh row, and on one they signed while the checks were ON",
  amlNone.kind === "release" && amlNone.firstOfficerId === null && amlStaged.kind === "first" && amlNoneStaged.kind === "release" && amlNoneStaged.firstOfficerId === K1,
  J({ amlNone, amlStaged, amlNoneStaged }));

// ═══ §10 · A LARGE MANUAL BALANCE ADJUSTMENT ═══════════════════════════════════════════════════════════════════════
section("§10 · a large balance adjustment: a second officer's identical submission");
const ADJ = 1_500_000;
const WHY = "Goodwill credit after an outage";
const payee = await W.user({ balance: 10_000 });
const adjFirst = await under(ON, () => largeAdjustmentStep(payee, K1, ADJ, WHY));
const adjSame = await under(ON, () => largeAdjustmentStep(payee, K1, ADJ, WHY));
ok("10.a · ON (stored) · the first submission is recorded as a proposal, and the SAME officer's identical submission is refused",
  adjFirst.kind === "first" && adjSame.kind === "same" && (await getAdjustStage1(payee))?.actorId === K1, J({ adjFirst, adjSame }));
const adjFails = await under(FAILS, () => largeAdjustmentStep(payee, K1, ADJ, WHY));
ok("10.b · ON (a failed read) · the same officer's identical submission is refused as before, the proposal untouched",
  adjFails.kind === "same" && (await getAdjustStage1(payee))?.actorId === K1, J(adjFails));
const adjOff = await under(OFF, () => largeAdjustmentStep(payee, K1, ADJ, WHY));
const before10 = (await W.bal(payee)).balance;
const applied = adjOff.kind === "apply" ? await adminAdjustBalance(payee, K1, ADJ, WHY) : { ok: false, error: `step ${adjOff.kind}` };
// As the action does once the money moved: the proposal this act completed is cleared.
if (adjOff.kind === "apply" && adjOff.countersigns) await setAdjustStage1(payee, null);
const after10 = (await W.bal(payee)).balance;
ok("10.c · OFF (stored) · the same officer's submission applies it — completing their own proposal — and the money moves",
  adjOff.kind === "apply" && adjOff.countersigns?.actorId === K1 && adjOff.large === true && (applied as any).ok === true && after10 === before10 + ADJ
    && (await getAdjustStage1(payee)) === null, J({ adjOff, applied, before10, after10 }));
const fresh10 = await W.user({ balance: 0 });
const adjNone = await under(NONE, () => largeAdjustmentStep(fresh10, K1, ADJ, "A correction of a large deposit"));
ok("10.d · OFF (nothing stored) · on a player with no proposal one officer's submission applies at once, said as a large single-officer act",
  adjNone.kind === "apply" && adjNone.countersigns === null && adjNone.large === true, J(adjNone));

// ═══ §11 · YES/NO MARKETS — AN OFFICER'S OWN PAYOUT HOLD ══════════════════════════════════════════════════════════
section("§11 · a Yes/No market: the officer who held a payout rules on that hold only while the checks are OFF");
const M = W.w;
async function resolvedMarket(stakers: Array<[string, "YES" | "NO"]>): Promise<string> {
  const m = await M.poll({ title: `Second-officer poll ${++tseq}` });
  for (const [u, side] of stakers) {
    const b = await M.svc.buyPosition(u, { marketId: m.id, side, stake: 5_000 });
    if (!b.ok) throw new Error(`a stake was refused: ${b.error}`);
  }
  const r = await M.svc.resolveMarket({ marketId: m.id, outcome: "YES", officerId: OWNER });
  if (!r.ok) throw new Error(`resolve: ${r.error}`);
  return m.id;
}
const [Y1, N1] = [await W.user({ balance: 100_000 }), await W.user({ balance: 100_000 })];
const HOLDER = await W.user({ role: "COMPLIANCE" });
async function heldMarket(reason: "OTHER" | "WRONG_OUTCOME"): Promise<{ marketId: string; holdId: string; held: any }> {
  const marketId = await resolvedMarket([[Y1, "YES"], [N1, "NO"]]);
  const held = await classic.holdSettlementAsOfficer(HOLDER, { marketId, reason, detail: "Holding while the source is read again." });
  return { marketId, holdId: held.ok ? held.data.objectionId : "", held };
}
const H1 = await heldMarket("OTHER");
const rejectOn = await under(ON, () => classic.rejectObjection(H1.holdId, HOLDER, "Releasing my own hold with the checks on."));
ok("11.a · ON (stored) · the officer who placed a payout hold cannot release it (CONFLICT) — a different officer must",
  H1.held.ok && !rejectOn.ok && rejectOn.code === "CONFLICT" && (await classic.countOpenObjections(H1.marketId)) === 1, J({ held: H1.held, rejectOn }));
const rejectFails = await under(FAILS, () => classic.rejectObjection(H1.holdId, HOLDER, "Releasing my own hold while the setting is unread."));
ok("11.b · ON (a failed read) · that officer is refused as before (CONFLICT)",
  !rejectFails.ok && rejectFails.code === "CONFLICT" && (await classic.countOpenObjections(H1.marketId)) === 1, J(rejectFails));
const rejectOff = await under(OFF, () => classic.rejectObjection(H1.holdId, HOLDER, "Releasing my own hold: second-officer checks are off."));
ok("11.c · OFF (stored) · the officer who placed it releases it, and the freeze is gone",
  rejectOff.ok && (await classic.countOpenObjections(H1.marketId)) === 0 && (await W.db.objection.findById(H1.holdId))?.reviewedBy === HOLDER, J(rejectOff));
const H2 = await heldMarket("OTHER");
const rejectNone = await under(NONE, () => classic.rejectObjection(H2.holdId, HOLDER, "Releasing my own hold: the Owner's ruling."));
ok("11.d · OFF (nothing stored) · the officer who placed it releases it",
  H2.held.ok && rejectNone.ok && (await classic.countOpenObjections(H2.marketId)) === 0, J(rejectNone));

const H3 = await heldMarket("WRONG_OUTCOME");
const upholdOn = await under(ON, () => classic.upholdObjection(H3.holdId, HOLDER, { remedy: "REVERSE", note: "Flipping my own hold with the checks on." }));
ok("11.e · ON (stored) · …and the same for UPHOLD: the officer who placed the hold is refused (CONFLICT)",
  H3.held.ok && !upholdOn.ok && upholdOn.code === "CONFLICT" && (await classic.countOpenObjections(H3.marketId)) === 1, J(upholdOn));
const upholdFails = await under(FAILS, () => classic.upholdObjection(H3.holdId, HOLDER, { remedy: "REVERSE", note: "Flipping my own hold while unread." }));
ok("11.f · ON (a failed read) · the uphold is refused as before (CONFLICT)", !upholdFails.ok && upholdFails.code === "CONFLICT", J(upholdFails));
const upholdOff = await under(OFF, () => classic.upholdObjection(H3.holdId, HOLDER, { remedy: "REVERSE", note: "Flipping my own hold: second-officer checks are off." }));
ok("11.g · OFF (stored) · the officer who placed it upholds it", upholdOff.ok && (await classic.countOpenObjections(H3.marketId)) === 0, J(upholdOff));
const H4 = await heldMarket("WRONG_OUTCOME");
const upholdNone = await under(NONE, () => classic.upholdObjection(H4.holdId, HOLDER, { remedy: "REVERSE", note: "Flipping my own hold: the Owner's ruling." }));
ok("11.h · OFF (nothing stored) · the officer who placed it upholds it", H4.held.ok && upholdNone.ok && (await classic.countOpenObjections(H4.marketId)) === 0, J(upholdNone));

// ⛔ KEPT (ruling 6b): a case on the officer's OWN stake — a player's objection they filed, then promoted.
const STAKER = await W.user({ balance: 100_000 });
const m5 = await resolvedMarket([[STAKER, "NO"], [Y1, "YES"]]);
const filed5 = await classic.fileObjection(STAKER, { marketId: m5, reason: "WRONG_OUTCOME", detail: "The source reports the opposite result." });
await W.setUserFields(STAKER, { role: "COMPLIANCE" });
const own5 = filed5.ok ? filed5.data.objectionId : "";
const ownStakeOff = await under(OFF, () => classic.rejectObjection(own5, STAKER, "Dismissing my own objection with the checks off."));
const ownStakeNone = await under(NONE, () => classic.rejectObjection(own5, STAKER, "Dismissing my own objection under the ruling."));
ok("11.i · OFF (stored, and nothing stored) · ⛔ kept: an officer never rules on a case about their OWN stake — a check on their own account (ruling 6b)",
  filed5.ok && [ownStakeOff, ownStakeNone].every((r) => !r.ok && r.code === "CONFLICT") && (await classic.countOpenObjections(m5)) === 1, J({ filed5, ownStakeOff, ownStakeNone }));

// ═══ §12 · CONTACTS — WHO CARRIES AN IMPORT ON ═════════════════════════════════════════════════════════════════════
section("§12 · contacts: another officer's import");
const G1 = await W.user({ role: "GROWTH" });
const G2 = await W.user({ role: "GROWTH" });
const isAdmin = async (id: string) => (await W.db.user.findById(id))?.role === "ADMIN";
const DIGEST = "c".repeat(64);
const opened = await staging.openContactImport(G1, {
  format: "csv", fileName: "list.csv", fileDigest: DIGEST, headers: ["Phone", "Name"], mapping: { phone: 0, name: 1 }, totalRows: 5, unreadable: 0,
});
const runId = opened.ok ? opened.view.id : "";
const driveOn = await under(ON, () => staging.mayDriveImport(G1, G2, isAdmin));
const ownOn = await under(ON, () => staging.mayDriveImport(G1, G1, isAdmin));
const ownerOn = await under(ON, () => staging.mayDriveImport(G1, OWNER, isAdmin));
const peekOn = await under(ON, () => staging.contactImportView(G2, runId));
ok("12.a · ON (stored) · only the officer who started an import, or an ADMIN, may continue it — another GROWTH officer may not, and is shown nothing",
  opened.ok && driveOn === false && ownOn === true && ownerOn === true && peekOn === null, J({ driveOn, ownOn, ownerOn, peekOn: peekOn === null ? null : "SEEN" }));
const driveFails = await under(FAILS, () => staging.mayDriveImport(G1, G2, isAdmin));
const peekFails = await under(FAILS, () => staging.contactImportView(G2, runId));
ok("12.b · ON (a failed read) · the other officer is refused as before, and shown nothing", driveFails === false && peekFails === null, J({ driveFails }));
const driveOff = await under(OFF, () => staging.mayDriveImport(G1, G2, isAdmin));
const peekOff = await under(OFF, () => staging.contactImportView(G2, runId));
ok("12.c · OFF (stored) · any officer with the contacts role may continue it: the one rule says yes, and the real view opens the run to them, naming who started it",
  driveOff === true && peekOff !== null && peekOff.mine === false && peekOff.createdBy === G1, J({ driveOff, peekOff: peekOff && { mine: peekOff.mine, createdBy: peekOff.createdBy } }));
const driveNone = await under(NONE, () => staging.mayDriveImport(G1, G2, isAdmin));
const peekNone = await under(NONE, () => staging.contactImportView(G2, runId));
ok("12.d · OFF (nothing stored) · the other officer may continue it, and the view opens the run to them",
  driveNone === true && peekNone !== null && peekNone.mine === false && peekNone.createdBy === G1, J({ driveNone }));

console.log(`${String.fromCharCode(10)}second-officer switch: ${pass} passed, ${fail} failed`);
/** The floor is every assertion this file makes (§0 fourteen, §1–§12 seventy): a run that stopped early is no pass. It only
 *  ever rises. */
const MIN_PASS = 84;
if (pass < MIN_PASS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_PASS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
