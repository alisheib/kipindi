/**
 * One store's run of `test:maswali-objections` (MASWALI-BUILD S7-OB; MASWALI-PLAN §3 MR-16, MB-23, OD-05). The two-store
 * runner starts this file twice — on the memory store and on a fresh scratch Postgres — because every store picks its
 * backend when it is first imported, so a store is a process. `HB_MONEY_STORE` names the store; every line carries it.
 *
 *   §1 STANDING AND THE WINDOW · the window opens when the graded set is final and closes on the week's frozen end; a
 *      live ticket holder objects to ONE question, once per question; a non-holder, a cancelled ticket, an unsealed
 *      question, a closed window and a final week are refused; an OPEN objection freezes the settlement
 *   §2 THE RULING · the platform's ruling gate (ADMIN or COMPLIANCE); never the sealer, the seal's confirmer, the objector
 *      or an officer holding a ticket; a result reviewed is the result ruled; REJECT changes nothing; REVERSE re-grades and
 *      restarts the window once; a second change keeps the restarted window; the money follows the final record
 *   §3 VOID AND REINSTATE · a voided main brought back pushes its reserve out; a void on objection pulls it in again
 *   §4 THE WEEK VOID · an OPEN objection holds it; a reinstatement undoes a certain week void
 *   §5 RACES · two officers on one case; two cases on one question; the window's last millisecond; a filing landing
 *      inside a release, and a filing after one
 *   §6 FENCES · the Yes/No doors never rule, list or sign off a Millionea objection; the store keeps one per key and rules
 *      only while OPEN
 *   §7 THE RECORD · every act's audit row
 * Every week and ticket goes through the product's own doors (`maswali-money-world.mts`): the draft, the attestation, the
 * open, the one bet path, the close and the seals. ⏱ The week's clock is injected; purchases read the real clock.
 * ⚠️ This file carries no backslash: line breaks are built from their code points.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-objections-session-secret-0123456789abcdef";
process.env.MASWALI_SCHEDULER = "false";

const { loadMaswaliWorld } = await import("./maswali-money-world.mts");
const W = await loadMaswaliWorld();
const ob = await import("../../src/lib/server/maswali-objections.ts");
const classic = await import("../../src/lib/server/objections-service.ts");
const { getAuditByActionsDurable, auditFlush } = await import("../../src/lib/server/audit.ts");
const { objectionWindowEnd } = W.svc;

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const LF = String.fromCharCode(10);
const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const J = (x: unknown) => JSON.stringify(x);
const errOf = (r: any) => (r && r.ok === false ? String(r.error) : "");
const pid = process.pid;

await W.setup({ guarantee: 30_000_000 });

/** The officers: two COMPLIANCE, the Owner (ADMIN), a MODERATOR (not a ruling role), and the sealer (COMPLIANCE too, so
 *  the sealer's refusal is the seal's, never the role's). */
const SEALER = await W.user({ id: `usr_ob_sealer_${pid}`, role: "COMPLIANCE" });
const COMP_A = await W.user({ id: `usr_ob_comp_a_${pid}`, role: "COMPLIANCE" });
const COMP_B = await W.user({ id: `usr_ob_comp_b_${pid}`, role: "COMPLIANCE" });
const OWNER = await W.user({ id: `usr_ob_owner_${pid}`, role: "ADMIN" });
const MOD = await W.user({ id: `usr_ob_mod_${pid}`, role: "MODERATOR" });

type Pick = "YES" | "NO";
const picks = (over: Record<number, Pick> = {}): Pick[] => Array.from({ length: 15 }, (_, i) => over[i + 1] ?? "YES");
let ahead = 3;
type Outcome = "YES" | "NO" | { void: string };

/** A week drafted, attested and opened `ahead` weeks out, with the given buyers' slips bought through the one bet path;
 *  the first ticket of each player in `cancel` cancelled through the player's own free cancel (before the close), then
 *  the sales closed. */
async function weekWith(buys: Array<[string, Pick[][]]>, cancel: string[] = []): Promise<{ wk: any; start: number; tickets: Map<string, any[]> }> {
  const { week, start } = await W.openWeek({ weeksAhead: ahead++ });
  const tickets = new Map<string, any[]>();
  for (const [u, slips] of buys) {
    const r = await W.buy(u, week.id, slips);
    if (!r.ok) throw new Error(`a purchase was refused: ${r.error} (${r.reason})`);
    tickets.set(u, r.data.maswali.tickets);
  }
  for (const u of cancel) {
    const x = await W.money.cancelMaswaliTicket({ userId: u, positionId: tickets.get(u)![0].positionId });
    if (!x.ok) throw new Error(`cancel: ${x.error}`);
  }
  const c = await W.svc.closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt) + MIN) });
  if (!c.ok) throw new Error(`close: ${c.error}`);
  return { wk: week, start, tickets };
}
/** Seal `slots` at `at`, by `officer` (YES unless `outcomes` says otherwise; a VOID with its ground). */
async function seal(weekId: string, slots: number[], at: Date, outcomes: Record<number, Outcome> = {}, officer = SEALER, twoOfficer = false): Promise<void> {
  for (const slot of slots) {
    const o = outcomes[slot] ?? "YES";
    const r = typeof o === "string"
      ? await W.svc.sealQuestion({ weekId, slot, outcome: o, evidence: `Official result for event ${slot}`, officerId: officer, now: at, twoOfficerNow: async () => twoOfficer })
      : await W.svc.sealQuestion({ weekId, slot, outcome: "VOID", voidReason: o.void, evidence: `Event ${slot} did not run as drawn`, officerId: officer, now: at, twoOfficerNow: async () => twoOfficer });
    if (!r.ok) throw new Error(`seal ${slot}: ${r.error}`);
  }
}
const SLOTS = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const weekNow = (id: string) => W.dal.weekStore.get(id);
const question = async (weekId: string, slot: number) => (await W.dal.questionStore.listForWeek(weekId)).find((q: any) => q.slot === slot);
/** The seal an officer reviews before ruling — its result and version, as the console hands them. */
const reviewed = async (weekId: string, slot: number) => {
  const q = await question(weekId, slot);
  return { expectedOutcome: q?.outcome, expectedSealedAt: q?.sealedAt };
};
const file = (userId: string, weekId: string, slot: number, now: Date, o: { reason?: string; detail?: string } = {}) =>
  ob.fileMillioneaObjection({ userId, weekId, slot, reason: o.reason ?? "WRONG_OUTCOME", detail: o.detail ?? `The source published another result for question ${slot}`, now });
const rule = async (objectionId: string, officerId: string, ruling: string, weekId: string, slot: number, now: Date, o: { outcome?: string; voidReason?: string; note?: string; review?: any } = {}) =>
  ob.decideMillioneaObjection({
    objectionId, officerId, ruling: ruling as any, outcome: o.outcome as any, voidReason: o.voidReason ?? null,
    note: o.note ?? `Read the official source again for question ${slot}`, ...(o.review ?? (await reviewed(weekId, slot))), now,
  });
const objectionRow = (id: string) => W.db.objection.findById(id);
const sumBal = async (u: string) => (await W.bal(u)).balance as number;
/** One `action` row whose payload names `objectionId`, read through the durable log (written after its act committed). */
async function auditHas(action: string, objectionId: string, tries = 40): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    await auditFlush();
    const rows = (await getAuditByActionsDurable([action], { limit: 500 })).entries;
    if (rows.some((e: any) => (e.payload?.objectionId ?? null) === objectionId)) return true;
    await new Promise((res) => setTimeout(res, 50));
  }
  return false;
}

// ═══ §1 · STANDING AND THE WINDOW ═══════════════════════════════════════════════════════════════════════════════════
console.log(`${LF}§1 · standing and the window (MR-16)`);
const [H, H2, N, C] = [await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })];
// H holds every answer YES; H2 holds the record §2 leaves (M3 and M5 reversed to NO); C's only ticket is cancelled.
const A = await weekWith([[H, [picks()]], [H2, [picks({ 3: "NO", 5: "NO" })]], [C, [picks()]]], [C]);
// §5's week is the next on the calendar: a week settles only once every earlier week of its line is terminal (MR-3), so
// the week §5 releases stands right after A (which §2 settles) — the later weeks (§2b–§4, §6) never settle.
const [R1, R2, R3] = [await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })];
const Rw = await weekWith([[R1, [picks()]], [R2, [picks()]], [R3, [picks()]]]);
const sealAt = new Date(A.start + 9 * DAY);
await seal(A.wk.id, SLOTS(1, 9), sealAt);
const early = await file(H, A.wk.id, 3, new Date(sealAt.getTime() + HOUR));
ok("1.1 · ⭐ before the graded set is final there is no window: a filing is refused (WINDOW_NOT_OPEN), nothing written",
  !early.ok && early.why === "WINDOW_NOT_OPEN" && (await W.db.objection.listForUser(H)).length === 0, J(early));
// M10 sealed: the gate is ready (no main void), the graded set final, the window open; R5 left unsealed (an unused reserve).
await seal(A.wk.id, [10, 11, 12, 13, 14], sealAt);
const wA = await weekNow(A.wk.id);
const rulesA = W.svc.frozenRules(wA);
const closeA = Date.parse(wA.objectionsCloseAt);
ok("1.2 · the window is the week's own: it opened at the seal that made the graded set final and closes at `objectionWindowEnd` of its frozen hours and EAT floor (24h, 12:00)",
  wA.gradedSetFinalAt === sealAt.toISOString() && closeA === objectionWindowEnd(sealAt.getTime(), rulesA.objectionWindowHours, rulesA.objectionNotBeforeAt)
    && rulesA.objectionWindowHours === 24 && rulesA.objectionNotBeforeAt === "12:00" && wA.objectionRestarted === false, J({ final: wA.gradedSetFinalAt, close: wA.objectionsCloseAt }));
const inA = new Date(sealAt.getTime() + HOUR);
const f1 = await file(H, A.wk.id, 3, inA);
const row1 = f1.ok ? await objectionRow(f1.objectionId) : null;
ok("1.3 · ⭐ a live ticket holder objects to ONE question inside the window: an OPEN row keyed to the week's market, the question's slot and the player, the result it disputes captured",
  f1.ok && !!row1 && row1.status === "OPEN" && row1.questionOrdinal === 3 && row1.marketId === wA.marketId && row1.userId === H
    && row1.outcomeAtFiling === "YES" && row1.reason === "WRONG_OUTCOME", J({ f1, row1 }));
const again = await file(H, A.wk.id, 3, inA);
const elig = await ob.millioneaObjectionEligibility({ userId: H, weekId: A.wk.id, slot: 3, now: inA });
ok("1.4 · one per question: the same player on the same question again is refused (ALREADY_OBJECTED) — by the filing and by the door's own read",
  !again.ok && again.why === "ALREADY_OBJECTED" && !elig.eligible && elig.why === "ALREADY_OBJECTED", J({ again, elig }));
const f2 = await file(H, A.wk.id, 4, inA);
ok("1.5 · …and a second question is a second case: the same player objects to M4", f2.ok, J(f2));
const nonHolder = await file(N, A.wk.id, 3, inA);
const cancelled = await file(C, A.wk.id, 3, inA);
ok("1.6 · ⭐ standing is a LIVE ticket in the week: a player with none, and a player whose only ticket was cancelled, are refused (NO_TICKET)",
  !nonHolder.ok && nonHolder.why === "NO_TICKET" && !cancelled.ok && cancelled.why === "NO_TICKET", J({ nonHolder, cancelled }));
const unsealed = await file(H, A.wk.id, 15, inA);
ok("1.7 · a question with no result yet (R5, an unused reserve left unsealed) has nothing to dispute (NOT_SEALED)", !unsealed.ok && unsealed.why === "NOT_SEALED", J(unsealed));
const short = await file(H2, A.wk.id, 6, inA, { detail: "wrong" });
const badReason = await file(H2, A.wk.id, 6, inA, { reason: "BECAUSE" });
const noSlot = await file(H2, A.wk.id, 16, inA);
ok("1.8 · the platform's bounds: a case under 10 characters, a reason off the list and a slot outside 1..15 are refused, nothing written",
  !short.ok && short.why === "INVALID" && !badReason.ok && badReason.why === "INVALID" && !noSlot.ok && noSlot.why === "NO_QUESTION"
    && (await W.db.objection.listForUser(H2)).length === 0, J({ short, badReason, noSlot }));
const lastMs = await file(H2, A.wk.id, 7, new Date(closeA - 1));
const atClose = await file(H2, A.wk.id, 8, new Date(closeA));
ok("1.9 · ⭐ the window's edge: a filing at its last millisecond lands; one at its close is refused (WINDOW_CLOSED)",
  lastMs.ok && !atClose.ok && atClose.why === "WINDOW_CLOSED", J({ lastMs, atClose }));
const afterA = new Date(closeA + MIN);
const frozen = await W.settle.previewMaswaliSettlement(A.wk.id, afterA);
ok("1.10 · ⭐ an OPEN objection freezes the week: after the window the settlement refuses while any stands (MR-16, fail closed)",
  !frozen.ok && /objection is standing/.test(errOf(frozen)), errOf(frozen));

// ═══ §2 · THE RULING ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log(`${LF}§2 · the ruling (MR-16, MR-14)`);
const o3 = (f1 as any).objectionId as string, o4 = (f2 as any).objectionId as string, o7 = (lastMs as any).objectionId as string;
const byMod = await rule(o4, MOD, "REJECT", A.wk.id, 4, afterA);
const byPlayer = await rule(o4, N, "REJECT", A.wk.id, 4, afterA);
ok("2.1 · the platform's ruling gate: a MODERATOR and a player are refused (ADMIN or COMPLIANCE rules)",
  !byMod.ok && /ADMIN or COMPLIANCE/.test(errOf(byMod)) && !byPlayer.ok && /ADMIN or COMPLIANCE/.test(errOf(byPlayer)), J({ byMod, byPlayer }));
const bySealer = await rule(o3, SEALER, "REVERSE", A.wk.id, 3, afterA);
ok("2.2 · ⭐ the officer who sealed the question never rules on it — another officer does, the Owner the fallback (MR-16)",
  !bySealer.ok && /another officer rules/.test(errOf(bySealer)) && (await objectionRow(o3)).status === "OPEN" && (await question(A.wk.id, 3)).outcome === "YES", errOf(bySealer));
const stale = await rule(o4, COMP_A, "REJECT", A.wk.id, 4, afterA, { review: { expectedOutcome: "NO", expectedSealedAt: (await question(A.wk.id, 4)).sealedAt } });
ok("2.3 · the result reviewed is the result ruled: a ruling naming a result the question does not hold is refused", !stale.ok && /changed since you reviewed/.test(errOf(stale)), errOf(stale));
const badShape = await rule(o3, COMP_A, "REINSTATE", A.wk.id, 3, afterA, { outcome: "YES" });
const noOutcome = await rule(o3, COMP_A, "REINSTATE", A.wk.id, 3, afterA);
ok("2.4 · the remedy fits the result: REINSTATE needs a void (M3 holds YES) and names the result it brings back",
  !badShape.ok && /is not void/.test(errOf(badShape)) && !noOutcome.ok && /YES or NO/.test(errOf(noOutcome)), J({ badShape, noOutcome }));
const rej = await rule(o4, COMP_A, "REJECT", A.wk.id, 4, afterA, { note: "The source agrees with the sealed result" });
const wAfterRej = await weekNow(A.wk.id);
ok("2.5 · REJECT: the case is decided (REJECTED, reviewer and note recorded), the result and the window untouched",
  rej.ok && rej.changed === false && rej.restarted === false && (await objectionRow(o4)).status === "REJECTED" && (await objectionRow(o4)).reviewedBy === COMP_A
    && (await question(A.wk.id, 4)).outcome === "YES" && wAfterRej.objectionsCloseAt === wA.objectionsCloseAt, J(rej));
const twice = await rule(o4, COMP_B, "REVERSE", A.wk.id, 4, afterA);
ok("2.6 · a decided case is decided: a second ruling on it is refused, nothing changed", !twice.ok && /already been decided/.test(errOf(twice)) && (await question(A.wk.id, 4)).outcome === "YES", errOf(twice));
// ⭐ The Owner's REVERSE (the Owner never sealed here): the graded set changes, MR-17 re-runs, the window restarts once.
const revAt = new Date(afterA.getTime() + HOUR);
const sealedBefore = (await question(A.wk.id, 3)).sealedAt;
const rev = await rule(o3, OWNER, "REVERSE", A.wk.id, 3, revAt, { note: "The league's official table records a draw: NO" });
const wRev = await weekNow(A.wk.id);
const q3 = await question(A.wk.id, 3);
ok("2.7 · ⭐ REVERSE by the Owner: M3 is NO under a new seal version, its evidence naming the ruling; the case UPHELD with its remedy",
  rev.ok && q3.outcome === "NO" && q3.sealedAt !== sealedBefore && /Objection upheld .REVERSE./.test(q3.evidence) && q3.sealedBy === SEALER
    && (await objectionRow(o3)).status === "UPHELD" && (await objectionRow(o3)).remedy === "REVERSE", J({ rev, q3 }));
ok("2.8 · ⭐ the graded set changed, so the window RESTARTED once: the graded set final at the ruling, a fresh 24h window from it, the restart spent",
  rev.ok && rev.changed && rev.restarted && wRev.objectionRestarted === true && wRev.gradedSetFinalAt === revAt.toISOString()
    && Date.parse(wRev.objectionsCloseAt) === objectionWindowEnd(revAt.getTime(), rulesA.objectionWindowHours, rulesA.objectionNotBeforeAt), J(wRev));
// A second case in the restarted window, upheld: the graded set changes again, the window stays where the restart put it.
const in2 = new Date(revAt.getTime() + HOUR);
const f5 = await file(H2, A.wk.id, 5, in2, { detail: "Question 5's source reported the other side" });
const rev5 = f5.ok ? await rule(f5.objectionId, COMP_B, "REVERSE", A.wk.id, 5, new Date(in2.getTime() + HOUR), { note: "The match report shows the other side won" }) : f5;
const wRev5 = await weekNow(A.wk.id);
ok("2.9 · ⭐ ONCE: a second upheld change re-grades (M5 is NO) but keeps the restarted window — no second restart",
  f5.ok && rev5.ok && (rev5 as any).changed === true && (rev5 as any).restarted === false && (await question(A.wk.id, 5)).outcome === "NO"
    && wRev5.objectionsCloseAt === wRev.objectionsCloseAt && wRev5.gradedSetFinalAt === wRev.gradedSetFinalAt, J({ f5, rev5 }));
// M7's case (filed in the first window's last millisecond) rejected; an unused reserve's REVERSE changes nothing graded.
await rule(o7, COMP_A, "REJECT", A.wk.id, 7, new Date(in2.getTime() + 2 * HOUR), { note: "Question 7 was read correctly" });
const f12 = await file(H2, A.wk.id, 14, new Date(in2.getTime() + 2 * HOUR), { detail: "Reserve 4 was read against its source" });
const rev12 = f12.ok ? await rule(f12.objectionId, COMP_A, "REVERSE", A.wk.id, 14, new Date(in2.getTime() + 3 * HOUR), { note: "The reserve's source reads the other way" }) : f12;
ok("2.10 · a change outside the graded set (R4, unused) is recorded and re-grades nothing: no restart, the window as it was",
  f12.ok && rev12.ok && (rev12 as any).changed === false && (rev12 as any).restarted === false && (await question(A.wk.id, 14)).outcome === "NO"
    && (await weekNow(A.wk.id)).objectionsCloseAt === wRev.objectionsCloseAt, J({ f12, rev12 }));
// ⭐ The money follows the final record: H (all YES) now scores 8; H2 (M3 and M5 NO) scores 10 and is paid.
const afterRestart = new Date(Date.parse(wRev.objectionsCloseAt) + MIN);
const before = { H: await sumBal(H), H2: await sumBal(H2) };
const paid = await W.release(A.wk.id, afterRestart);
const ticketsA = await W.dal.ticketStore.listForWeek(A.wk.id);
const winners = ticketsA.filter((t: any) => t.won === true).map((t: any) => t.userId);
ok("2.11 · ⭐ the money follows the FINAL record: after the restarted window, with no case standing, the week settles once and pays the ticket the rulings made the winner — never the one the first seals did",
  paid.ok && (await weekNow(A.wk.id)).state === "SETTLED" && winners.length === 1 && winners[0] === H2 && (await sumBal(H2)) > before.H2 && (await sumBal(H)) === before.H, J({ paid: errOf(paid), winners }));
const settledFile = await file(H, A.wk.id, 6, afterRestart);
ok("2.12 · a SETTLED week is final: no filing (WEEK_FINAL)", !settledFile.ok && settledFile.why === "WEEK_FINAL", J(settledFile));

// ═══ §2b · the seal's confirmer, the objector, an officer holding a ticket ═════════════════════════════════════════
console.log(`${LF}§2b · separation of duties`);
const [I1, I2, P1] = [await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })];
const B = await weekWith([[I1, [picks()]], [I2, [picks()]], [P1, [picks()]]]);
const sealB = new Date(B.start + 9 * DAY);
// M2 is sealed under the two-officer rule and confirmed by COMP_B: both signatures stand behind its result.
await seal(B.wk.id, [2], sealB, {}, SEALER, true);
const conf = await W.svc.confirmSeal({ weekId: B.wk.id, slot: 2, officerId: COMP_B, ...(await reviewed(B.wk.id, 2)), now: sealB });
if (!conf.ok) throw new Error(`confirm: ${conf.error}`);
await seal(B.wk.id, [1, ...SLOTS(3, 15)], sealB);
// Two holders made COMPLIANCE officers after buying (MR-10's insider, mid-week): each still holds a live ticket.
await W.setUserFields(I1, { role: "COMPLIANCE" });
await W.setUserFields(I2, { role: "COMPLIANCE" });
const inB = new Date(sealB.getTime() + HOUR);
const fb2 = await file(P1, B.wk.id, 2, inB);
const fbI = await file(I1, B.wk.id, 9, inB);
const byConfirmer = fb2.ok ? await rule(fb2.objectionId, COMP_B, "REVERSE", B.wk.id, 2, inB) : fb2;
ok("2.13 · ⭐ the officer who CONFIRMED the seal (the two-officer rule's second signature) never rules on it either",
  fb2.ok && !byConfirmer.ok && /another officer rules/.test(errOf(byConfirmer)), J({ fb2, byConfirmer }));
const ownCase = fbI.ok ? await rule(fbI.objectionId, I1, "REJECT", B.wk.id, 9, inB) : fbI;
ok("2.14 · no officer rules on their own objection", fbI.ok && !ownCase.ok && /your own objection/.test(errOf(ownCase)), J({ fbI, ownCase }));
const byHolder = fb2.ok ? await rule(fb2.objectionId, I2, "REJECT", B.wk.id, 2, inB) : fb2;
ok("2.15 · ⭐ an officer holding a live ticket in the week never rules on its objections (MR-14's bar on a seal, held on its ruling)",
  !byHolder.ok && /holds a ticket in this week/.test(errOf(byHolder)), errOf(byHolder));
const okB = fb2.ok ? await rule(fb2.objectionId, COMP_A, "REJECT", B.wk.id, 2, inB, { note: "Both signatures read the same source" }) : fb2;
await rule((fbI as any).objectionId, COMP_A, "REJECT", B.wk.id, 9, inB, { note: "Question 9 stands as sealed" });
ok("2.16 · …a third officer rules (COMPLIANCE, neither sealer nor confirmer nor holder)", okB.ok, errOf(okB));
// ⭐ MR-16, held absolute: the officer whose upheld ruling set a question's present result is its author now — the next
// objection to that result goes to another officer, as the sealer's do.
const fa5 = await file(P1, B.wk.id, 5, inB, { detail: "The source published NO for event 5 on the day" });
const fb5 = await file(I1, B.wk.id, 5, inB, { detail: "The federation decided event 5 as NO" });
const rev5B = fa5.ok ? await rule(fa5.objectionId, COMP_A, "REVERSE", B.wk.id, 5, inB, { note: "The federation's sheet reads NO for event 5" }) : fa5;
const byAuthor = fb5.ok ? await rule(fb5.objectionId, COMP_A, "REJECT", B.wk.id, 5, inB, { note: "Already reversed on the first case" }) : fb5;
const byOther = fb5.ok ? await rule(fb5.objectionId, COMP_B, "REJECT", B.wk.id, 5, inB, { note: "Already reversed on the first case" }) : fb5;
ok("2.17 · ⭐ the officer whose upheld ruling set a question's present result never rules on its next objection — another officer does (MR-16)",
  rev5B.ok && !byAuthor.ok && /present result on an earlier objection/.test(errOf(byAuthor)) && byOther.ok
    && (await objectionRow((fb5 as any).objectionId))?.reviewedBy === COMP_B, J({ rev5B, byAuthor, byOther }));

// ═══ §3 · VOID AND REINSTATE ════════════════════════════════════════════════════════════════════════════════════════
console.log(`${LF}§3 · void and reinstate (MR-16, MR-17)`);
const [V1, V2] = [await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })];
const Cw = await weekWith([[V1, [picks()]], [V2, [picks()]]]);
const sealC = new Date(Cw.start + 9 * DAY);
await seal(Cw.wk.id, SLOTS(1, 15), sealC, { 2: { void: "not_played" } });
const mapC0 = W.svc.gradable(await W.dal.questionStore.listForWeek(Cw.wk.id));
const sig0 = ob.gradedSetSignature(mapC0);
const inC = new Date(sealC.getTime() + HOUR);
const fv2 = await file(V1, Cw.wk.id, 2, inC, { detail: "The match was played on the day it was drawn" });
const reverseVoid = fv2.ok ? await rule(fv2.objectionId, COMP_A, "REVERSE", Cw.wk.id, 2, inC) : fv2;
const reinst = fv2.ok ? await rule(fv2.objectionId, COMP_A, "REINSTATE", Cw.wk.id, 2, inC, { outcome: "YES", note: "The fixture was played: home win" }) : fv2;
const sig1 = ob.gradedSetSignature(W.svc.gradable(await W.dal.questionStore.listForWeek(Cw.wk.id)));
ok("3.1 · ⭐ REINSTATE: a voided main comes back with its result (a REVERSE of a void is refused: there is no side to flip), the reserve that stood in for it leaves the graded set, the window restarts",
  fv2.ok && !reverseVoid.ok && /reversed by REINSTATE/.test(errOf(reverseVoid))
    && reinst.ok && (reinst as any).changed && (reinst as any).restarted && (await question(Cw.wk.id, 2)).outcome === "YES"
    && (await question(Cw.wk.id, 2)).voidReason === null && sig0.startsWith("1:YES,3:YES") && sig0.includes("11:YES") && sig1.startsWith("1:YES,2:YES") && !sig1.includes("11:"), J({ reinst, sig0, sig1 }));
const fv6 = await file(V2, Cw.wk.id, 6, new Date(inC.getTime() + HOUR), { detail: "The criterion named the wrong competition" });
const badGround = fv6.ok ? await rule(fv6.objectionId, COMP_A, "VOID", Cw.wk.id, 6, new Date(inC.getTime() + HOUR), { voidReason: "because" }) : fv6;
const voidIt = fv6.ok ? await rule(fv6.objectionId, COMP_A, "VOID", Cw.wk.id, 6, new Date(inC.getTime() + HOUR), { note: "The criterion named the wrong competition" }) : fv6;
const q6 = await question(Cw.wk.id, 6);
ok("3.2 · a void ruled on an objection names a ground from the closed list (refused off it) — by default the closed list's own 'Objection to the criterion upheld' — and pulls the first usable reserve in; the restart already spent, the window stays",
  !badGround.ok && /closed list/.test(errOf(badGround)) && voidIt.ok && q6.outcome === "VOID" && q6.voidReason === "criterion_objection"
    && (voidIt as any).changed && !(voidIt as any).restarted && ob.gradedSetSignature(W.svc.gradable(await W.dal.questionStore.listForWeek(Cw.wk.id))).includes("11:YES"), J({ badGround, voidIt, q6 }));

// ═══ §4 · THE WEEK VOID ═════════════════════════════════════════════════════════════════════════════════════════════
console.log(`${LF}§4 · the week void (MR-18)`);
const [D1, D2] = [await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })];
const Dw = await weekWith([[D1, [picks()]], [D2, [picks()]]]);
const sealD = new Date(Dw.start + 9 * DAY);
// Six mains void, every reserve sealed YES: five usable reserves for six voids — the whole week voids (MR-18).
await seal(Dw.wk.id, SLOTS(1, 15), sealD, Object.fromEntries([1, 2, 3, 4, 5, 6].map((s) => [s, { void: "not_played" }])));
const gD = W.svc.gradable(await W.dal.questionStore.listForWeek(Dw.wk.id));
const fd = await file(D1, Dw.wk.id, 1, new Date(sealD.getTime() + HOUR), { detail: "Question 1's match was played and finished" });
const afterD = new Date(Date.parse((await weekNow(Dw.wk.id)).objectionsCloseAt) + MIN);
const heldVoid = await W.svc.voidWeek({ weekId: Dw.wk.id, now: afterD });
ok("4.1 · ⭐ a week whose void is certain still waits for its objections: the week void refuses while one stands (a reinstatement could save it)",
  ob.gradedSetSignature(gD) === "WEEK_VOID" && fd.ok && !heldVoid.ok && /objection is standing/.test(errOf(heldVoid)) && (await weekNow(Dw.wk.id)).state === "RESOLVING", J({ fd, heldVoid }));
const saved = fd.ok ? await rule(fd.objectionId, COMP_A, "REINSTATE", Dw.wk.id, 1, afterD, { outcome: "YES", note: "The match was played: the home side won" }) : fd;
const gD2 = ob.gradedSetSignature(W.svc.gradable(await W.dal.questionStore.listForWeek(Dw.wk.id)));
const wD = await weekNow(Dw.wk.id);
const noVoid = await W.svc.voidWeek({ weekId: Dw.wk.id, now: new Date(Date.parse(wD.objectionsCloseAt) + MIN) });
ok("4.2 · ⭐ …and a REINSTATE that brings the voids within the reserves undoes it: the week grades again (five voids, five reserves), the window restarts, the week void now refuses",
  saved.ok && (saved as any).changed && (saved as any).restarted && gD2 !== "WEEK_VOID" && gD2.split(",").length === 10 && !noVoid.ok && /not final/.test(errOf(noVoid)), J({ saved, gD2, noVoid }));

// ═══ §5 · RACES ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log(`${LF}§5 · races`);
const sealR = new Date(Rw.start + 9 * DAY);
await seal(Rw.wk.id, SLOTS(1, 15), sealR);
const inR = new Date(sealR.getTime() + HOUR);
const fr = await file(R1, Rw.wk.id, 8, inR);
const fr2 = await file(R2, Rw.wk.id, 8, inR);
const view = await reviewed(Rw.wk.id, 8);
const [ra, rb] = await Promise.all([
  rule((fr as any).objectionId, COMP_A, "REVERSE", Rw.wk.id, 8, inR, { review: view }),
  rule((fr as any).objectionId, COMP_B, "REJECT", Rw.wk.id, 8, inR, { review: view }),
]);
const orow = await objectionRow((fr as any).objectionId);
ok("5.1 · ⭐ two officers ruling on ONE case at once: exactly one ruling lands, and the case records that one",
  fr.ok && [ra, rb].filter((r: any) => r.ok).length === 1 && orow.status !== "OPEN"
    && (orow.status === "UPHELD" ? (await question(Rw.wk.id, 8)).outcome === "NO" : (await question(Rw.wk.id, 8)).outcome === "YES"), J({ ra, rb, status: orow.status }));
// Two cases on one question, each upheld with REVERSE on the result both officers reviewed: never flipped twice. Two
// officers neither of whom set M8's present result in 5.1 (MR-16 bars that one), so the race is the reviewed seal's alone.
const v2 = await reviewed(Rw.wk.id, 8);
const fr3 = await file(R3, Rw.wk.id, 8, inR);
const COMP_C = await W.user({ id: `usr_ob_comp_c_${pid}`, role: "COMPLIANCE" });
const [rc, rd] = await Promise.all([
  rule((fr2 as any).objectionId, OWNER, "REVERSE", Rw.wk.id, 8, inR, { review: v2 }),
  rule((fr3 as any).objectionId, COMP_C, "REVERSE", Rw.wk.id, 8, inR, { review: v2 }),
]);
ok("5.2 · ⭐ two cases on ONE question ruled at once on the same reviewed result: one lands, the other is refused as stale — the result is flipped once, never back",
  fr2.ok && fr3.ok && [rc, rd].filter((r: any) => r.ok).length === 1 && [rc, rd].some((r: any) => !r.ok && /changed since you reviewed/.test(errOf(r)))
    && (await question(Rw.wk.id, 8)).outcome === (v2.expectedOutcome === "YES" ? "NO" : "YES"), J({ rc, rd }));
// Every case decided, then a filing landing INSIDE the release (after its holds, before its money): nothing pays.
for (const o of (await W.db.objection.listForMarket((await weekNow(Rw.wk.id)).marketId)).filter((x: any) => x.status === "OPEN")) {
  const r = await rule(o.id, OWNER, "REJECT", Rw.wk.id, o.questionOrdinal, inR, { note: "Decided before the release" });
  if (!r.ok) throw new Error(`decide ${o.id}: ${errOf(r)}`);
}
const wR = await weekNow(Rw.wk.id);
const afterR = new Date(Date.parse(wR.objectionsCloseAt) + MIN);
const pre = await W.settle.previewMaswaliSettlement(Rw.wk.id, afterR);
// ⚠️ A FIXTURE, DECLARED (as OB.3's): the release holds the chain lock while this hook runs, and the real filing waits for
// that very lock — that wait IS the serialization — so the row a filing would write lands here as the row itself, a
// question-keyed case the release must read again.
W.settle.__setMaswaliSettleSeamsForTests({ afterHolds: async () => {
  const late = await W.db.objection.create({
    id: `obj_ob_race_${pid}`, marketId: wR.marketId, userId: R3, reason: "WRONG_OUTCOME", detail: "Filed while the release ran",
    status: "OPEN", createdAt: new Date().toISOString(), reviewedBy: null, reviewedAt: null, reviewNote: null, remedy: null,
    outcomeAtFiling: "YES", questionOrdinal: 9,
  });
  void late;
} });
let rel: any;
try { rel = pre.ok ? await W.settle.settleMaswaliWeek({ weekId: Rw.wk.id, releasedBy: "usr_mln_accounting", digest: pre.preview.digest, now: afterR }) : pre; }
finally { W.settle.__setMaswaliSettleSeamsForTests(null); }
ok("5.3 · ⭐ a case landing INSIDE the release (after its holds, under its chain lock): read again before the money, nothing pays",
  pre.ok && !rel.ok && /objection is standing/.test(errOf(rel)) && (await weekNow(Rw.wk.id)).state === "RESOLVING", errOf(rel));
const decided = await rule(`obj_ob_race_${pid}`, OWNER, "REJECT", Rw.wk.id, 9, afterR, { note: "Decided after the refused release" });
const rel2 = await W.release(Rw.wk.id, afterR);
const lateFile = await file(R2, Rw.wk.id, 10, afterR);
ok("5.4 · …decided, the week releases once; and a filing after the release meets a final week (WEEK_FINAL), never a moot case",
  decided.ok && rel2.ok && (await weekNow(Rw.wk.id)).state === "SETTLED" && !lateFile.ok && lateFile.why === "WEEK_FINAL", J({ decided: errOf(decided), rel2: errOf(rel2), lateFile }));

// ═══ §6 · FENCES ════════════════════════════════════════════════════════════════════════════════════════════════════
console.log(`${LF}§6 · fences: the Yes/No doors never rule, list or sign off a Millionea objection`);
const queue = await classic.listObjections();
ok("6.1 · the Yes/No officer queue lists no Millionea objection (they are ruled per question in /admin/maswali)",
  queue.every((o: any) => o.questionOrdinal == null) && (await W.db.objection.listForMarket(wA.marketId)).some((o: any) => o.questionOrdinal != null), `${queue.length} rows`);
const P2 = await W.user({ balance: 50_000 });
const E = await weekWith([[P2, [picks()]]]);
const sealE = new Date(E.start + 9 * DAY);
await seal(E.wk.id, SLOTS(1, 15), sealE);
const fe = await file(P2, E.wk.id, 1, new Date(sealE.getTime() + HOUR));
const cRej = fe.ok ? await classic.rejectObjection(fe.objectionId, COMP_A, "rejected through the Yes/No door") : fe;
const cUp = fe.ok ? await classic.upholdObjection(fe.objectionId, COMP_A, { remedy: "REVERSE", note: "reversed through the Yes/No door" }) : fe;
ok("6.2 · ⭐ the Yes/No rulings refuse a Millionea case — neither rejects it nor flips the week's market — and it stays OPEN",
  fe.ok && !cRej.ok && /ruled in .admin.maswali/.test(errOf(cRej)) && !cUp.ok && /ruled in .admin.maswali/.test(errOf(cUp)) && (await objectionRow((fe as any).objectionId)).status === "OPEN", J({ cRej, cUp }));
const rulings = await W.db.objection.listUpheldRulings();
ok("6.3 · a Millionea ruling is no row of a market's sign-off (`listUpheldRulings`): §2's REVERSEs changed questions, never a verdict",
  !rulings.some((r: any) => r.marketId === wA.marketId), J(rulings.filter((r: any) => r.marketId === wA.marketId)));
// ⚠️ A FIXTURE, DECLARED: no door stamps a week's market RESOLVED before its settlement does (and that stamps it settled
// too) — so the row that state would be is written here, to show the Yes/No filing refuses the week itself, not merely a
// status it happens never to reach.
const marketE = (await weekNow(E.wk.id)).marketId;
await W.mdal.marketStore.stamp(marketE, { status: "RESOLVED", resolvedOutcome: "YES", updatedAt: new Date().toISOString() });
const cElig = await classic.objectionEligibility(P2, marketE);
const cHold = await classic.holdSettlementAsOfficer(COMP_A, { marketId: marketE, reason: "OTHER", detail: "held through the Yes/No door" });
ok("6.4 · the Yes/No filing and the officer hold refuse a Millionea week — even one whose market row reads RESOLVED (the fence's words, never the status's)",
  !cElig.eligible && cElig.why === "NOT_ADJUDICATED" && !cHold.ok && /Millionea week/.test(errOf(cHold)), J({ cElig, cHold }));
const dup = { id: `obj_ob_dup_${pid}`, marketId: wA.marketId, userId: H, reason: "OTHER", detail: "a second row on one key", status: "OPEN",
  createdAt: new Date().toISOString(), reviewedBy: null, reviewedAt: null, reviewNote: null, remedy: null, outcomeAtFiling: "YES", questionOrdinal: 3 };
let dupCode: unknown = null;
try { await W.db.objection.create(dup); } catch (e) { dupCode = (e as any)?.code; }
ok("6.5 · ⭐ the store keeps ONE per (market, question, player), open or decided — the partial unique index, held by the memory store too (P2002)",
  dupCode === "P2002" && (await objectionRow(dup.id)) === null, J({ dupCode }));
const once1 = await W.db.objection.decideOpen((fe as any).objectionId, { status: "REJECTED", reviewedBy: OWNER, reviewedAt: new Date().toISOString(), reviewNote: "first", remedy: null });
const once2 = await W.db.objection.decideOpen((fe as any).objectionId, { status: "UPHELD", reviewedBy: COMP_A, reviewedAt: new Date().toISOString(), reviewNote: "second", remedy: "REVERSE" });
const oe = await objectionRow((fe as any).objectionId);
ok("6.6 · ⭐ the store rules only while OPEN (a conditional update): a second decision writes nothing",
  once1 === true && once2 === false && oe.status === "REJECTED" && oe.reviewNote === "first", J({ once1, once2, status: oe.status }));
// ⚠️ A FIXTURE, DECLARED: a Yes/No poll whose verdict reads YES (stamped as a resolution leaves it) and one OPEN objection
// to it, written as the row itself — the ruling's own refusal is the subject here, not how a poll reaches its verdict.
const poll = await W.w.poll({ title: `Objection remedy poll ${pid}` });
await W.mdal.marketStore.stamp(poll.id, { status: "RESOLVED", resolvedOutcome: "YES", updatedAt: new Date().toISOString() });
const pollCase = { id: `obj_ob_poll_${pid}`, marketId: poll.id, userId: H, reason: "WRONG_OUTCOME", detail: "The source published NO for this poll", status: "OPEN",
  createdAt: new Date().toISOString(), reviewedBy: null, reviewedAt: null, reviewNote: null, remedy: null, outcomeAtFiling: "YES" };
await W.db.objection.create(pollCase);
const cBad = await classic.upholdObjection(pollCase.id, COMP_A, { remedy: "REINSTATE" as any, note: "no such remedy for a Yes/No verdict" });
const pollAfter = await W.mdal.marketStore.get(poll.id);
ok("6.7 · the Yes/No ruling refuses a remedy other than VOID or REVERSE, whatever a form posts: the poll keeps its verdict and the case stays OPEN (unread, it was flipped as a REVERSE)",
  !cBad.ok && /VOID or REVERSE/.test(errOf(cBad)) && pollAfter?.resolvedOutcome === "YES" && (await objectionRow(pollCase.id))?.status === "OPEN",
  J({ cBad, verdict: pollAfter?.resolvedOutcome }));

// ═══ §8 · THE PLAYER'S DOOR ═══════════════════════════════════════════════════════════════════════════════════════════
console.log(`${LF}§8 · the player's door (the ticket page reads it; the dialog posts the form)`);
const [DH, DN] = [await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })];
const DoorW = await weekWith([[DH, [picks()]], [DN, [picks()]]], [DN]);
const sealDoor = new Date(DoorW.start + 9 * DAY);
await seal(DoorW.wk.id, SLOTS(1, 15), sealDoor);
const inDoor = new Date(sealDoor.getTime() + HOUR);
const door0 = await ob.millioneaObjectionDoor(DH, DoorW.wk.id, inDoor.getTime());
const formOf = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const viaForm = await ob.fileMillioneaObjectionFromForm(DH, formOf({ weekId: DoorW.wk.id, slot: "6", reason: "WRONG_OUTCOME", detail: "The source lists event 6 as postponed" }), inDoor);
const formNoSlot = await ob.fileMillioneaObjectionFromForm(DH, formOf({ weekId: DoorW.wk.id, slot: "", reason: "WRONG_OUTCOME", detail: "No question is named in this form" }), inDoor);
const door1 = await ob.millioneaObjectionDoor(DH, DoorW.wk.id, inDoor.getTime());
const doorN = await ob.millioneaObjectionDoor(DN, DoorW.wk.id, inDoor.getTime());
ok("8.1 · the door reads the open window, the reader's standing and nothing objected to yet",
  door0?.window.state === "OPEN" && door0.holds === true && door0.mine.length === 0, J(door0));
ok("8.2 · ⭐ the form's filing answers the code alone — never the server's sentence — and the door then lists it OPEN on its question",
  J(viaForm) === J({ ok: true }) && J(formNoSlot) === J({ ok: false, why: "NO_QUESTION" }) && door1?.mine.length === 1 && door1.mine[0].slot === 6 && door1.mine[0].status === "OPEN",
  J({ viaForm, formNoSlot, mine: door1?.mine }));
ok("8.3 · a player whose only ticket was cancelled has no standing at the door", doorN?.holds === false && doorN.window.state === "OPEN", J(doorN));

// ═══ §7 · THE RECORD ════════════════════════════════════════════════════════════════════════════════════════════════
console.log(`${LF}§7 · the record`);
ok("7.1 · every act records itself once its lock committed: the filing (maswali.objection.filed), the rejection and the upheld ruling",
  (await auditHas("maswali.objection.filed", o3)) && (await auditHas("maswali.objection.rejected", o4)) && (await auditHas("maswali.objection.upheld", o3)));

const { checkMaswaliInvariants } = await import("../../src/lib/server/maswali-invariants.ts");
const inv = await checkMaswaliInvariants();
ok("7.2 · the invariants and the books over everything above", inv.ok, J(inv.problems));
ok(`0.store · the cases ran on the ${STORE} store`, W.onPostgres === (STORE === "postgres"), `onPostgres ${W.onPostgres}`);

console.log(`${LF}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
