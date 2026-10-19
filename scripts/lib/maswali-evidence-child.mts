/**
 * test:maswali-evidence — THE PER-WEEK EVIDENCE PACK, ON BOTH STORES (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 8, MB-92).
 *
 *   npx tsx scripts/maswali-evidence.test.mts     (npm run test:maswali-evidence)
 *
 *   §1 a settled week: its pack refused BY NAME while it sells and while it is sealed; then the frozen rules and the
 *      fifteen questions, the commitment RECOMPUTED and matching (the question-set hash, the root, every leaf), the
 *      week's audit record without a purchase row or a device, the settlement's ledger group to the shilling and the
 *      guarantee's movements (Postgres; the memory store says it keeps no lines), the winner, the cluster report by
 *      account id — and no salt, number or name anywhere in the pack or its CSV, whose SHA-256 the pack names.
 *   §2 a voided week: fifteen voids with their ground, the void and the refund in the audit record, the refund group
 *      to the shilling (Postgres), every ticket REFUNDED, no winner and no settlement group.
 *   §3 (MB-64) the support desk's lookup: a serial and its holder's number open ONE ticket, projected to the desk's keys
 *      and never its salt or number; its script filled from where each figure lives; another account's number answers
 *      exactly as a serial nobody holds; a running week's ticket shows no answers; won, held, lost, cancelled and voided
 *      tickets each name their script (or none); and every lookup that read anything is recorded, never the number.
 *   §4 (S6 review R2-1) a share's note through the one projection: Compliance's words come through, and a hold the
 *      settlement placed by itself — planted with its own word for a desk account — reads the neutral note, while
 *      neither the pack nor its CSV names the house at any depth (D19/D20); and, fail-safe, so does a hold reason the
 *      projection has never heard of. Round 3: the console's projection shows the deciding officer exactly the five ruled
 *      hold words and nothing else, while the CSV stays neutral even for those.
 *   §5 (S6 review R2-4, R2-5) a lookup whose record cannot be written shows nothing; past the officer's budget a lookup
 *      reads and records nothing; and the evidence download's door, driven as the route drives it: the sealing officer
 *      and an unverified second factor meet the 404, a cross-site request and a HEAD start nothing, an unwritten record
 *      hands over no bytes, and the file's SHA-256 is the hash on its record. Round 5: the ticket CSV is built on its own
 *      — the voided week's refund CSV is served while the pack cannot be built (5.10) — a week still selling is refused
 *      by name for either part (5.11), and an unwritten record hands over no CSV either (5.12).
 *   §6 (S6 review R2-10, R2-11) a share Compliance forfeits: its own ledger group in the pack (Postgres); the platform's
 *      sales pause, carried by the weeks whose sale window it falls inside — and (round 3) by a week that opened while it
 *      stood, through the pack's own read; and an objection keeps the question it named.
 *   §7 (S6 review round 4) a crowded place's holders ride along in the pack whole, by account id, though the report
 *      itself carries only the first few. Round 5: the pack is built in a bounded number of reads, as many for six
 *      crowded lines as for none (7.3), and carries the report's one order as the lines' ids (7.4). Round 6: the same
 *      three statements on Postgres (7.3b), and a failed read of the report stated in the pack, never thrown, with the
 *      refund CSV served all the same (7.5).
 *   Round 2 also adds §1's tamper control on the commitment (1.4b, R2-14a) and the capture statement (1.6b, R2-8a).
 * Every week, ticket and seal goes through the product's own doors (`maswali-money-world.mts`).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
// The shared absence words (ruling 175; §4). A pure module with no store behind it, so a static import keeps the
// import-order contract: the environment below is still set before the world loads.
import { extendHouseWords } from "./house-bot-vocabulary.mjs";
type Any = any;
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-evidence-session-secret-0123456789abcdef";
// The week timer stays off: every close, seal and void here is run on purpose.
process.env.MASWALI_SCHEDULER = "false";

const { loadMaswaliWorld, SEALER } = await import("./maswali-money-world.mts");
const W = await loadMaswaliWorld();
const { maswaliEvidencePack, EVIDENCE_TICKET_COLUMNS } = await import("../../src/lib/server/maswali-evidence.ts");
const { auditFlush } = await import("../../src/lib/server/audit.ts");
const { createHash } = await import("node:crypto");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const LF = String.fromCharCode(10);
// Built from char codes, never typed as escape text (the editing tools decode escapes into raw characters).
const BOM = String.fromCharCode(0xfeff);
const EOL = String.fromCharCode(13, 10);
const csvLines = (csv: string) => csv.replace(BOM, "").split(EOL).filter(Boolean);
const ALL_VOID = Array.from({ length: 15 }, () => ({ void: "not_played" }));

await W.setup({ guarantee: 20_000_000 });

// ── §1 · a settled week ─────────────────────────────────────────────────────
console.log(`${LF}§1 · a settled week's evidence pack`);
const { week, start } = await W.openWeek({ weeksAhead: 2 });
const [p1, p2, p3] = [await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })];
const b1 = await W.buy(p1, week.id, [W.WIN, W.LOSE]);
const b2 = await W.buy(p2, week.id, [W.LOSE]);
const b3 = await W.buy(p3, week.id, [W.slip("NO")]);
const c3 = b3.ok ? await W.w.svc.cashOutPosition(p3, b3.data.maswali.tickets[0].positionId) : { ok: false };
ok("1.0 · CONTROL · four tickets bought through the one bet path, and one cancelled inside its free window",
  b1.ok && b2.ok && b3.ok && c3.ok, J([b1, b2, b3, c3].filter((x: Any) => !x.ok).map((x: Any) => x.error)));
const early = await maswaliEvidencePack(week.id);
ok("1.1 · ⛔ while the week sells its pack is refused BY NAME — its tickets are still a pick aggregate (MB-34, MB-95)",
  !early.ok && early.notFinal === true && /ready once it is settled or voided/.test(early.error), J(early));
const at = await W.closeAndSeal(week, start);
const mid = await maswaliEvidencePack(week.id);
ok("1.1b · …and while it is being sealed, too", !mid.ok && mid.notFinal === true, J(mid));
const rel = await W.release(week.id, at);
ok("1.2 · CONTROL · the week settles through accounting's release", rel.ok, J(rel.ok ? null : rel));
await auditFlush();
const r = await maswaliEvidencePack(week.id);
const pack: Any = r.ok ? r.pack : null;
ok("1.3 · the pack builds for the settled week", !!pack && pack.kind === "50pick.millionea.evidence" && pack.version === 1 && pack.week.code === week.code && pack.week.state === "SETTLED",
  r.ok ? "" : r.error);
ok("1.4 · ⭐ the commitment is RECOMPUTED from the stored rows and matches: the question-set hash, the Merkle root, and every committed leaf (3 — the cancelled ticket is outside the root)",
  pack?.commitment.questionSetMatches === true && pack?.commitment.rootMatches === true && pack?.commitment.leaves.committed === 3 && pack?.commitment.leaves.verified === 3,
  J(pack?.commitment));
// R2-14a · A TAMPER CONTROL: a leaf check that always passed would pass 1.4 as well. One committed ticket's stored salt is
// changed under the pack, straight in the store (the DAL refuses to patch a salt, as only a fault could change one), and
// the pack must count that leaf unverified; then the salt is put back.
{
  const victim: Any = (await W.dal.ticketStore.listForWeek(week.id)).find((t: Any) => t.userId === p2 && t.status !== "CANCELLED");
  const setSalt = async (id: string, salt: string) => {
    if (W.onPostgres) {
      const { prisma } = await import("../../src/lib/server/prisma.ts");
      await prisma()!.maswaliTicket.update({ where: { id }, data: { salt } });
    } else {
      const m = (globalThis as Any).__50PICK_MLN_TICKETS as Map<string, Any>;
      m.set(id, { ...m.get(id), salt });
    }
  };
  const original = String(victim?.salt ?? "");
  await setSalt(victim.id, "0".repeat(32));
  const tampered = await maswaliEvidencePack(week.id);
  await setSalt(victim.id, original);
  const restored = await maswaliEvidencePack(week.id);
  ok("1.4b · ⛔ R2-14a · TAMPER CONTROL · a committed ticket whose stored salt no longer makes its leaf is counted unverified (2 of 3) — 1.4's count is a check, not a constant — while the root, which hashes the stored leaves, still matches",
    !!victim && original.length > 0 && tampered.ok && tampered.pack.commitment.leaves.committed === 3 && tampered.pack.commitment.leaves.verified === 2
      && tampered.pack.commitment.rootMatches === true && restored.ok && restored.pack.commitment.leaves.verified === 3,
    J(tampered.ok ? tampered.pack.commitment.leaves : tampered));
}
ok("1.5 · the frozen rules, and the fee model its market froze beside the levies",
  !!pack?.rules.snapshot && pack?.rules.feeSnapshot?.feeModel === "jackpot-payout", J(pack?.rules.feeSnapshot ?? null).slice(0, 200));
ok("1.6 · the fifteen questions, each sealed with its evidence and its officer",
  pack?.questions.length === 15 && pack.questions.every((q: Any) => q.outcome === "YES" && String(q.evidence ?? "").length >= 10 && q.sealedBy === SEALER),
  J(pack?.questions.map((q: Any) => [q.slot, q.outcome, q.sealedBy])));
{
  // R2-8a · no seal writes a capture yet (MB-80): the pack says so in words, never a bare null; a capture that exists is shown.
  const { EVIDENCE_CAPTURE_NOT_TAKEN } = await import("../../src/lib/server/maswali-evidence.ts");
  const q1: Any = (await W.dal.questionStore.listForWeek(week.id)).find((q: Any) => q.slot === 1);
  await W.dal.questionStore.patch(q1.id, { evidenceCaptureRef: "captures/mln/q1-test.png" });
  const withCapture = await maswaliEvidencePack(week.id);
  await W.dal.questionStore.patch(q1.id, { evidenceCaptureRef: null });
  ok("1.6b · R2-8a · MB-92 · a capture never taken reads \"capture not taken (MB-80 owed)\" on every question — and a capture that exists is the one shown",
    pack?.questions.every((q: Any) => q.evidenceCaptureRef === EVIDENCE_CAPTURE_NOT_TAKEN) && withCapture.ok
      && withCapture.pack.questions.find((q: Any) => q.slot === 1)?.evidenceCaptureRef === "captures/mln/q1-test.png"
      && withCapture.pack.questions.filter((q: Any) => q.evidenceCaptureRef === EVIDENCE_CAPTURE_NOT_TAKEN).length === 14,
    J(pack?.questions.map((q: Any) => q.evidenceCaptureRef).slice(0, 2)));
}
const actions: string[] = pack?.audit.rows.map((x: Any) => x.action) ?? [];
ok("1.7 · ⭐ the week's audit record: drafted, attested, opened, closed, its graded set final and settled — and the fifteen seals, the read complete",
  ["maswali.week.drafted", "maswali.week.parity_attested", "maswali.week.opened", "maswali.week.closed", "maswali.week.graded_set_final", "maswali.week.settled"].every((a) => actions.includes(a))
    && actions.filter((a) => a === "maswali.question.sealed").length === 15 && pack?.audit.complete === true,
  J(actions));
ok("1.8 · ⛔ …and no purchase row (the CSV is the purchases), and no row carries its IP or device",
  actions.length > 0 && !actions.includes("maswali.tickets.bought") && pack.audit.rows.every((x: Any) => !("ip" in x) && !("userAgent" in x)));
if (W.onPostgres) {
  const s = pack?.ledger.settlement;
  ok("1.9 · ⭐ Postgres · the settlement's ledger group, line by line, every line in its group, summing to 0 (MR-26)",
    s?.state === "read" && s.lines.length >= 3 && s.sumTzs === 0 && s.lines.every((l: Any) => l.groupId === pack.week.settlementGroupId), J(s).slice(0, 300));
  const g = pack?.ledger.guarantee;
  ok("1.10 · Postgres · the guarantee's own movements to the week's end: the Owner's funding first, then this week's floor top-up",
    g?.state === "read" && g.lines[0]?.entryType === "MASWALI_GUARANTEE_FUND" && g.lines.some((l: Any) => l.entryType === "MASWALI_TOPUP" && l.groupId === pack.week.settlementGroupId),
    J(g?.lines?.map((l: Any) => l.entryType)));
} else {
  ok("1.9 · memory · the pack SAYS it holds no ledger lines (this store keeps none) — never an empty list standing in for an unread one",
    pack?.ledger.settlement?.state === "not-kept" && pack.ledger.settlement.lines === null && pack.ledger.guarantee.state === "not-kept", J(pack?.ledger));
}
ok("1.11 · the integrity report: the one 10/10 ticket, its share paid, its account a player, nothing held",
  pack?.integrity.winners.length === 1 && pack.integrity.winners[0].accountId === p1 && pack.integrity.winners[0].share === "paid"
    && pack.integrity.winners[0].accountRole === "PLAYER" && pack.integrity.sharesHeld === 0 && pack.integrity.sharesForfeited === 0,
  J(pack?.integrity));
const same = pack?.clusters.groups.find((x: Any) => x.basis === "answers" && J(x.accounts.map((a: Any) => a.userId).sort()) === J([p1, p2].sort()));
ok("1.12 · the cluster report rides along — the two accounts holding the same fifteen answers — by account id only, never a name",
  !!same && same.accounts.every((a: Any) => J(Object.keys(a)) === J(["userId", "tickets"])) && !J(pack.clusters).includes('"holder"'),
  J(pack?.clusters.groups ?? null).slice(0, 300));
const tickets = await W.dal.ticketStore.listForWeek(week.id);
const people = (await Promise.all([p1, p2, p3].map((u) => W.db.user.findById(u)))) as Any[];
const needles = [...tickets.map((t: Any) => t.salt as string), ...people.flatMap((u) => [u?.phoneE164, u?.displayName].filter((x): x is string => typeof x === "string" && x.length >= 4))];
const packJson = J(pack);
ok("1.13 · ⛔ MB-32 · no ticket's salt, and no holder's number or name, anywhere in the pack or its CSV — and no `salt` key at all",
  r.ok && tickets.length === 4 && needles.length >= 4 && needles.every((n) => !packJson.includes(n) && !r.csv.includes(n)) && !packJson.includes("\"salt\""),
  needles.filter((n) => packJson.includes(n) || (r.ok && r.csv.includes(n))).slice(0, 3).join(", "));
const lines = r.ok ? csvLines(r.csv) : [];
ok("1.14 · the ticket CSV: its header, and every ticket the week sold — the cancelled one included, marked so",
  lines[0] === EVIDENCE_TICKET_COLUMNS.map((c: string) => `"${c}"`).join(",") && lines.length === 1 + 4 && lines.filter((l) => l.includes("\"CANCELLED\"")).length === 1,
  J(lines.slice(0, 2)));
ok("1.15 · ⭐ the pack names its CSV by the SHA-256 of the exact bytes — the two files belong together",
  r.ok && pack.tickets.sha256 === createHash("sha256").update(r.csv).digest("hex") && pack.tickets.count === 4, pack?.tickets.sha256);

// ── §2 · a voided week ──────────────────────────────────────────────────────
console.log(`${LF}§2 · a voided week's evidence pack`);
// One of its tickets, for the desk's lookup in §3.
let voided: { serial: string; holder: string } | null = null;
{
  const { week: v, start: vs } = await W.openWeek({ weeksAhead: 3 });
  const [q1, q2] = [await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })];
  const bought = [await W.buy(q1, v.id, [W.LOSE, W.LOSE]), await W.buy(q2, v.id, [W.WIN])];
  if (bought[1].ok) voided = { serial: bought[1].data.maswali.tickets[0].serial, holder: q2 };
  const vat = await W.closeAndSeal(v, vs, ALL_VOID);
  const vr = await W.svc.voidWeek({ weekId: v.id, now: vat });
  await auditFlush();
  ok("2.1 · CONTROL · the week sold three tickets, voided whole and refunded", bought.every((x: Any) => x.ok) && vr.ok && vr.week.state === "VOIDED", J(vr.ok ? null : vr));
  const r2 = await maswaliEvidencePack(v.id);
  const p2k: Any = r2.ok ? r2.pack : null;
  ok("2.2 · the voided week's pack builds", !!p2k && p2k.week.state === "VOIDED", r2.ok ? "" : r2.error);
  const acts: string[] = p2k?.audit.rows.map((x: Any) => x.action) ?? [];
  ok("2.3 · ⭐ its record: fifteen voids, each with its ground, and the void and its refund in the audit rows",
    p2k?.questions.every((q: Any) => q.outcome === "VOID" && q.voidReason === "not_played") && acts.includes("maswali.week.voided") && acts.includes("maswali.week.refunded")
      && acts.filter((a) => a === "maswali.question.sealed").length === 15,
    J(acts));
  if (W.onPostgres) {
    const vr2 = p2k?.ledger.voidRefund;
    ok("2.4 · ⭐ Postgres · the void's refund group, line by line, summing to 0", vr2?.state === "read" && vr2.lines.length >= 2 && vr2.sumTzs === 0, J(vr2).slice(0, 300));
  }
  const vl = r2.ok ? csvLines(r2.csv).slice(1) : [];
  ok("2.5 · every ticket in its CSV is REFUNDED", vl.length === 3 && vl.every((l) => l.includes("\"REFUNDED\"")), J(vl));
  ok("2.6 · no winner and no settlement group on a voided week", p2k?.integrity.winners.length === 0 && p2k?.ledger.settlement === null, J(p2k?.integrity));
}

// ── §3 · the support desk's lookup of one ticket (MB-64) ────────────────────
console.log(`${LF}§3 · the support desk's lookup of one ticket`);
{
  const { lookupMaswaliTicketForDesk, SUPPORT_LOOKUP_ACTION, DESK_NOT_FOUND } = await import("../../src/lib/server/maswali-support.ts");
  const { MILLIONEA_SUPPORT_SCRIPTS, fillSupportScript, scriptForTicket } = await import("../../src/lib/maswali-support-scripts.ts");
  const { getAuditForActorDurable } = await import("../../src/lib/server/audit.ts");
  const { SUPPORT_EMAIL } = await import("../../src/lib/server/support-config.ts");
  const { WITHDRAW_MAX_TZS } = await import("../../src/lib/server/validators.ts");
  const { getGlobalConfig } = await import("../../src/lib/server/market-config.ts");
  const { formatTzs, fmtRate } = await import("../../src/lib/utils.ts");
  const { durationHours } = await import("../../src/lib/duration-phrase.ts");
  const desk = await W.user({ role: "SUPPORT" });
  const compliance = await W.user({ role: "COMPLIANCE" });
  // The number as a caller reads it out — 07… — never the stored +255 form.
  const spoken = (u: Any) => `0${String(u?.phoneE164 ?? "").slice(4)}`;
  const look = (serial: unknown, phone: unknown): Promise<Any> => lookupMaswaliTicketForDesk({ serial, phone, officerId: desk });
  const winT: Any = tickets.find((t: Any) => t.userId === p1 && t.won === true);
  const lossT: Any = tickets.find((t: Any) => t.userId === p2);
  const cancT: Any = tickets.find((t: Any) => t.userId === p3);
  const DESK_KEYS = ["serial", "accountId", "week", "shown", "boughtAt", "cancelledAt", "cancelUntil", "price", "rulesVersion", "resultsOut", "share", "paid", "refund", "answers", "script"];

  const won = await look(String(winT?.serial ?? "").toLowerCase(), spoken(people[0]));
  ok("3.1 · ⭐ a serial (in any case) and its holder's number, as spoken, open ONE ticket: won, its share paid, its fifteen answers beside their results — the week is final",
    won.ok && won.ticket.serial === winT.serial && won.ticket.accountId === p1 && won.ticket.shown === "won" && won.ticket.share === "paid" && won.ticket.paid > 0
      && won.ticket.answers?.length === 15 && won.ticket.answers.every((a: Any) => a.pick === "YES" && a.outcome === "YES") && won.ticket.script === "win",
    J(won).slice(0, 300));
  ok("3.2 · ⛔ only what the desk needs, the projection's keys exactly — no salt (MB-32), no number, no other ticket",
    won.ok && J(Object.keys(won.ticket)) === J(DESK_KEYS) && !J(won).includes(winT.salt) && !J(won).includes('"salt"')
      && !J(won).includes(String(people[0]?.phoneE164 ?? "+255").slice(4)),
    J(won.ok ? Object.keys(won.ticket) : won));
  const rules: Any = W.svc.frozenRules(await W.dal.weekStore.get(week.id));
  const rates: Any = await getGlobalConfig();
  const f: Any = won.ok ? won.figures : null;
  const { getMaswaliConfig } = await import("../../src/lib/server/maswali-config.ts");
  ok("3.3 · ⭐ every figure from where it lives: the week's own frozen check window, the live withdrawal limit and fee, the support address, and the complaint answer target as `maswali.config` holds it (R2-7)",
    !!f && !!rules && f.objectionHours === rules.objectionWindowHours && f.objectionNotBefore === rules.objectionNotBeforeAt
      && f.withdrawalCap === formatTzs(WITHDRAW_MAX_TZS) && f.withdrawalFee === fmtRate(rates.withdrawalFeeRate) && f.supportEmail === SUPPORT_EMAIL()
      && f.answerDays === getMaswaliConfig().complaintAnswerDays, J(f));
  const filled: string[] = f ? MILLIONEA_SUPPORT_SCRIPTS.flatMap((s: Any) => [fillSupportScript(s.en, "en", f), fillSupportScript(s.sw, "sw", f)]) : [];
  const complaint: Any = MILLIONEA_SUPPORT_SCRIPTS.find((s: Any) => s.key === "complaint");
  const left = (x: string) => /\{\w+\}/.test(x);
  ok("3.4 · all ten scripts fill, en and sw, with no placeholder left — and the complaint path states the window, the address and the answer time",
    MILLIONEA_SUPPORT_SCRIPTS.length === 10 && filled.length === 20 && !filled.some(left) && !!f && !!complaint
      && fillSupportScript(complaint.en, "en", f).includes(durationHours("en", f.objectionHours)) && fillSupportScript(complaint.en, "en", f).includes(f.supportEmail)
      && fillSupportScript(complaint.sw, "sw", f).includes(`siku ${f.answerDays} za kazi`),
    filled.find(left) ?? "");
  const wrongNumber = await look(winT?.serial, spoken(people[1]));
  const nobody = await look("MLN-2099-W01-000001", spoken(people[0]));
  ok("3.5 · ⛔ MB-95 · another account's number answers EXACTLY as a serial nobody holds — walking serials or numbers learns nothing",
    !wrongNumber.ok && !nobody.ok && wrongNumber.error === DESK_NOT_FOUND && J(wrongNumber) === J(nobody), J([wrongNumber, nobody]));
  const malformed = await look("not a serial", spoken(people[0]));
  const shortNumber = await look(winT?.serial, "0712");
  ok("3.6 · a malformed serial or a short number is refused before anything is read, in one sentence",
    !malformed.ok && !shortNumber.ok && malformed.error !== DESK_NOT_FOUND && malformed.error === shortNumber.error, J([malformed, shortNumber]));
  const lost = await look(lossT?.serial, spoken(people[1]));
  const cancelled = await look(cancT?.serial, spoken(people[2]));
  ok("3.7 · the losing ticket reads lost, with the loss script; the cancelled one reads cancelled, with no script of its own",
    lost.ok && lost.ticket.shown === "lost" && lost.ticket.script === "loss" && lost.ticket.share === null
      && cancelled.ok && cancelled.ticket.shown === "cancelled" && cancelled.ticket.script === null && cancelled.ticket.cancelledAt !== null,
    J([lost, cancelled]).slice(0, 300));
  const { week: selling } = await W.openWeek({ weeksAhead: 4 });
  const bought = await W.buy(p2, selling.id, [W.WIN]);
  const live = await look(bought.ok ? bought.data.maswali.tickets[0].serial : "", spoken(people[1]));
  ok("3.8 · ⛔ MB-34 · while its week sells the desk reads the ticket's state, and NEVER its answers — nothing a pick decides",
    bought.ok && live.ok && live.ticket.shown === "running" && live.ticket.answers === null && live.ticket.script === null && live.ticket.resultsOut === 0
      && !J(live).includes('"pick"'),
    J(live).slice(0, 300));
  const voidHolder: Any = voided ? await W.db.user.findById(voided.holder) : null;
  const v = voided ? await look(voided.serial, spoken(voidHolder)) : { ok: false };
  ok("3.9 · a voided week's ticket reads refunded, its refund landed, with the week-void script and its fifteen voided answers",
    v.ok && v.ticket.shown === "refunded" && v.ticket.refund?.state === "landed" && v.ticket.script === "weekVoid" && v.ticket.answers?.length === 15
      && v.ticket.answers.every((a: Any) => a.outcome === "VOID"),
    J(v).slice(0, 300));
  const held = winT ? await W.settle.holdMaswaliShare({ ticketId: winT.id, officerId: compliance, reason: "a reversed deposit funded it" }) : { ok: false };
  const heldView = await look(winT?.serial, spoken(people[0]));
  ok("3.10 · a held share reads held, with no paid figure and the held-share script; a forfeited share has no script of its own",
    held.ok && heldView.ok && heldView.ticket.share === "held" && heldView.ticket.paid === null && heldView.ticket.script === "heldShare"
      && scriptForTicket({ shown: "won", share: "forfeited", weekState: "SETTLED" }) === null,
    J([held, heldView]).slice(0, 300));
  await auditFlush();
  const rows: Any[] = (await getAuditForActorDurable(desk, { limit: 100 })).entries.filter((e: Any) => e.action === SUPPORT_LOOKUP_ACTION);
  const numbers = [...people, voidHolder].map((u: Any) => String(u?.phoneE164 ?? "").slice(4)).filter((x) => x.length >= 9);
  ok("3.11 · ⭐ every lookup that read anything is recorded, found or not — the serial asked for and whether it was found, never the number typed",
    rows.length === 8 && rows.every((e) => e.category === "COMPLIANCE" && typeof e.payload?.serial === "string" && typeof e.payload?.found === "boolean")
      && rows.filter((e) => e.payload.found === false).length === 2 && rows.every((e) => (e.payload.found ? typeof e.targetId === "string" : e.targetId === null))
      && numbers.length === 4 && numbers.every((n) => !J(rows).includes(n)),
    J(rows.map((e) => [e.payload?.serial, e.payload?.found])));
}

// ── §4 · R2-1 (HIGH) · a share's note through the one projection: the pack and its CSV name no house (D19/D20) ──
console.log(`${LF}§4 · R2-1 · a share the settlement held by itself reads the neutral note, in the pack and its CSV`);
{
  // The shared absence words, and the settlement's own words for the holds it places on a desk account (`holdFor`).
  // R3 · imported at the top, so ruling 175's subset pin (`BROADER_LISTS`) reads this file as a broader list.
  const HOUSE = extendHouseWords(["house desk", "desk account", "desk check"]);
  const HOLD_WORDS = ["staff account", "house desk account", "desk check unreadable", "account suspended", "account closed"];
  const won: Any = tickets.find((t: Any) => t.userId === p1 && t.won === true);
  const rowOf = (csv: string) => csvLines(csv).find((l) => l.startsWith(`"${won?.serial}"`)) ?? "";
  const officer = await maswaliEvidencePack(week.id);
  ok("4.1 · CONTROL · Compliance's own words for its hold (§3) are the note the CSV carries, beside the share held",
    officer.ok && rowOf(officer.csv).endsWith('"held","a reversed deposit funded it"'), officer.ok ? rowOf(officer.csv) : officer.error);
  await W.dal.ticketStore.patch(won.id, { frozenReason: "house desk account" });
  const planted: Any = await W.dal.ticketStore.get(won.id);
  ok("4.2 · CONTROL · the plant is real: the stored row carries the word the settlement writes for a desk account's hold",
    planted?.frozenReason === "house desk account", String(planted?.frozenReason ?? ""));
  const r4 = await maswaliEvidencePack(week.id);
  const packText = r4.ok ? J(r4.pack) : "", csvText = r4.ok ? r4.csv : "";
  ok("4.3 · ⛔ D19 · neither the pack nor its CSV names the house — at any depth, in any of the settlement's own hold words",
    r4.ok && !HOUSE.test(packText) && !HOUSE.test(csvText) && HOLD_WORDS.every((w) => !packText.includes(w) && !csvText.includes(w)),
    [...(packText.match(HOUSE) ?? []), ...(csvText.match(HOUSE) ?? [])].slice(0, 3).join(", "));
  ok("4.4 · ⭐ the house-held winner's row reads the neutral note, its share held, and the pack counts it held",
    r4.ok && rowOf(r4.csv).endsWith('"held","held for review"') && r4.pack.integrity.sharesHeld === 1, r4.ok ? rowOf(r4.csv) : r4.error);
  // ⛔ FAIL-SAFE · a hold reason the projection has never heard of — a later lane's own words for a hold it adds.
  const notes: Any = await import("../../src/lib/maswali-share-note.ts");
  const { shareNoteOf, MILLIONEA_HELD_NOTE } = notes;
  const UNKNOWN = "held by a check this build never heard of";
  await W.dal.ticketStore.patch(won.id, { frozenReason: UNKNOWN });
  const r5 = await maswaliEvidencePack(week.id);
  ok("4.5 · ⛔ R2-1 · FAIL-SAFE · a hold reason the projection has never heard of reads the neutral note too, and its words appear nowhere — while an officer's own words still come through",
    r5.ok && rowOf(r5.csv).endsWith('"held","held for review"') && !J(r5.pack).includes(UNKNOWN) && !r5.csv.includes(UNKNOWN)
      && ["deposit under review", "deposit check unreadable", UNKNOWN, "any words a later lane writes"].every((x) => shareNoteOf(x) === MILLIONEA_HELD_NOTE)
      && shareNoteOf("compliance · an officer's words") === "an officer's words" && shareNoteOf("forfeited · the forfeit's words") === "the forfeit's words"
      && shareNoteOf(null) === null,
    r5.ok ? rowOf(r5.csv) : r5.error);
  // R3 · the deciding officer's projection (the integrity page's "Why"): the ruled words as they are — written out here,
  // never read from the list under test — and every other mark exactly as the neutral projection reads it.
  const consoleNote = (x: string | null) => (typeof notes.consoleShareNoteOf === "function" ? notes.consoleShareNoteOf(x) : undefined);
  const SHOWN = ["staff account", "account suspended", "account closed", "deposit under review", "deposit check unreadable"];
  const NEUTRAL = ["house desk account", "desk check unreadable", UNKNOWN, "Staff Account", " staff account", "account closed "];
  ok("4.6 · ⭐ R3 · the console's projection: the deciding officer reads the account's standing and the deposit checks as the settlement wrote them — exactly the five ruled words; a house desk's, and any other, stay neutral — and an officer's words still come through",
    SHOWN.every((x) => consoleNote(x) === x) && NEUTRAL.every((x) => consoleNote(x) === MILLIONEA_HELD_NOTE)
      && J([...(notes.MILLIONEA_CONSOLE_HOLD_REASONS ?? [])].sort()) === J([...SHOWN].sort())
      && consoleNote("compliance · an officer's words") === "an officer's words" && consoleNote("forfeited · the forfeit's words") === "the forfeit's words"
      && consoleNote(null) === null,
    J({ shown: SHOWN.map(consoleNote), neutral: NEUTRAL.map(consoleNote) }));
  // R3 · …and the regulator's CSV reads none of it: a word the console shows, planted on the winner's row, is neutral there.
  await W.dal.ticketStore.patch(won.id, { frozenReason: "staff account" });
  const r47 = await maswaliEvidencePack(week.id);
  ok("4.7 · ⛔ R3 · the regulator's CSV keeps the neutral note for EVERY hold the settlement placed by itself — even one the console shows the deciding officer — and the pack carries none of its words",
    r47.ok && rowOf(r47.csv).endsWith('"held","held for review"') && !J(r47.pack).includes("staff account") && !r47.csv.includes("staff account")
      && r47.pack.integrity.sharesHeld === 1,
    r47.ok ? rowOf(r47.csv) : r47.error);
}

// ── §5 · R2-4 / R2-5 · the desk lookup's budget and its unwritten record; every refusal of the evidence download ──
console.log(`${LF}§5 · R2-4 / R2-5 · a lookup's budget and record, and the evidence download's door, by behaviour`);
{
  const { lookupMaswaliTicketForDesk, DESK_LOOKUP_DEPS, DESK_UNRECORDED, DESK_NOT_FOUND, SUPPORT_LOOKUP_ACTION } = await import("../../src/lib/server/maswali-support.ts");
  const { RATE_RULES } = await import("../../src/lib/server/rate-limit.ts");
  const { maswaliEvidenceDoor, MASWALI_EVIDENCE_DOOR_DEPS } = await import("../../src/lib/server/maswali-evidence-door.ts");
  const { getAuditForActorDurable } = await import("../../src/lib/server/audit.ts");
  const won: Any = tickets.find((t: Any) => t.userId === p1 && t.won === true);
  const spokenNumber = `0${String((people[0] as Any)?.phoneE164 ?? "").slice(4)}`;

  const deskA = await W.user({ role: "SUPPORT" });
  const unrecorded = await lookupMaswaliTicketForDesk({ serial: won?.serial, phone: spokenNumber, officerId: deskA },
    { ...DESK_LOOKUP_DEPS, record: async () => ({ recorded: false }) });
  ok("5.1 · ⛔ R2-5 · a lookup whose record could not be written shows NOTHING of the ticket — not even that it exists",
    !unrecorded.ok && unrecorded.error === DESK_UNRECORDED && !J(unrecorded).includes(String(won?.serial)), J(unrecorded));

  // R2-4 · one officer spends the whole budget: malformed lookups read and record nothing, one real miss is recorded.
  const deskB = await W.user({ role: "SUPPORT" });
  const capacity = RATE_RULES["maswali.lookup"]?.capacity ?? 0;
  for (let k = 0; k < capacity - 1; k++) await lookupMaswaliTicketForDesk({ serial: "not a serial", phone: "", officerId: deskB });
  const lastAllowed = await lookupMaswaliTicketForDesk({ serial: "MLN-2099-W01-000002", phone: spokenNumber, officerId: deskB });
  const refused = await lookupMaswaliTicketForDesk({ serial: won?.serial, phone: spokenNumber, officerId: deskB });
  await auditFlush();
  const deskBRows = (await getAuditForActorDurable(deskB, { limit: 200 })).entries.filter((e: Any) => e.action === SUPPORT_LOOKUP_ACTION);
  ok("5.2 · ⛔ R2-4 · past the officer's budget a lookup is refused before anything is read — even the holder's own serial and number open nothing — and writes no record",
    capacity > 1 && !lastAllowed.ok && lastAllowed.error === DESK_NOT_FOUND && !refused.ok && /Too many lookups/.test(refused.error)
      && !J(refused).includes(String(won?.serial)) && deskBRows.length === 1,
    J({ capacity, last: lastAllowed, refused, rows: deskBRows.length }));
  const otherDesk = await lookupMaswaliTicketForDesk({ serial: won?.serial, phone: spokenNumber, officerId: deskA });
  ok("5.3 · CONTROL · the budget is the officer's own: another desk officer still opens the ticket", otherDesk.ok, J(otherDesk).slice(0, 160));

  // R2-5 · the evidence download's door, driven as the route drives it, its session and second factor stood in (a script
  // has no cookies); the viewer's ROLE is the stored row's, and the pack is the real one.
  const officer = await W.user({ role: "COMPLIANCE" }), auditor = await W.user({ role: "AUDITOR" }), sealer = await W.user({ role: "MODERATOR" });
  const records: Any[] = [];
  let packs = 0, csvs = 0;
  // R5 · `packFails` stands in for a pack one of whose sections cannot be built: the CSV must not wait on it.
  const deps = (o: { who?: string; factor?: string; recorded?: boolean; packFails?: boolean } = {}) => ({
    session: async () => ({ userId: o.who ?? officer, sessionId: "s_evidence" }),
    secondFactor: async () => o.factor ?? "ok",
    record: async (entry: Any) => { records.push(entry); return { recorded: o.recorded ?? true }; },
    pack: (weekId: string) => {
      packs++;
      if (o.packFails) throw new Error("a section of the pack could not be read");
      return MASWALI_EVIDENCE_DOOR_DEPS.pack(weekId);
    },
    tickets: (weekId: string) => { csvs++; return MASWALI_EVIDENCE_DOOR_DEPS.tickets(weekId); },
  });
  const req = (o: { part?: string; site?: string | null; method?: string } = {}) => ({
    method: o.method ?? "GET", url: `https://50pick.tz/api/admin/maswali/evidence/${week.id}${o.part ? `?part=${o.part}` : ""}`,
    secFetchSite: o.site === undefined ? "same-origin" : o.site, weekId: week.id,
  });
  const bySealer = await maswaliEvidenceDoor(req(), deps({ who: sealer }));
  ok("5.4 · ⛔ R2-5 · a role without the evidence page's view (the officer who seals) meets the 404 a missing route answers — no pack built, nothing recorded",
    bySealer.kind === "not_found" && packs === 0 && records.length === 0, J(bySealer));
  const noFactor = await maswaliEvidenceDoor(req(), deps({ factor: "unverified" }));
  ok("5.5 · ⛔ R2-5 · a session whose second factor is not verified meets the same 404 — no pack built, nothing recorded",
    noFactor.kind === "not_found" && packs === 0 && records.length === 0, J(noFactor));
  const cross = await maswaliEvidenceDoor(req({ site: "cross-site" }), deps());
  const head = await maswaliEvidenceDoor(req({ method: "HEAD" }), deps());
  ok("5.6 · ⛔ a cross-site request and a HEAD never start an export", cross.kind === "not_found" && head.kind === "not_found" && packs === 0, J([cross, head]));
  const unwritten = await maswaliEvidenceDoor(req(), deps({ recorded: false }));
  ok("5.7 · ⛔ R2-5 · an export whose record could not be written hands over nothing — no bytes in the answer the route turns into its bodiless 503",
    unwritten.kind === "unrecorded" && !("body" in unwritten) && records.length === 1, J(unwritten));
  const file = await maswaliEvidenceDoor(req(), deps({ who: auditor }));
  const fileRecord = records[records.length - 1];
  ok("5.8 · ⭐ R2-5 · the Auditor takes the pack, and the header's SHA-256 is the hash of the bytes handed over AND the hash on the export's record",
    file.kind === "file" && file.sha256 === createHash("sha256").update(file.body).digest("hex") && fileRecord?.payload?.sha256 === file.sha256
      && fileRecord?.actorId === auditor && fileRecord?.payload?.part === "pack",
    J({ kind: file.kind, recorded: fileRecord?.payload?.sha256 ?? null }));
  const csvFile = await maswaliEvidenceDoor(req({ part: "tickets" }), deps());
  const csvRecord = records[records.length - 1];
  ok("5.9 · CONTROL · Compliance takes the ticket CSV, recorded as that part with its own hash",
    csvFile.kind === "file" && csvFile.contentType.startsWith("text/csv") && csvRecord?.payload?.part === "tickets" && csvRecord?.payload?.sha256 === csvFile.sha256,
    J({ kind: csvFile.kind }));

  // R5 · every door answer, and the CSV on its own: the voided week's refund CSV while the pack cannot be built.
  const reqFor = (weekId: string, part?: string) => ({
    method: "GET", url: `https://50pick.tz/api/admin/maswali/evidence/${weekId}${part ? `?part=${part}` : ""}`, secFetchSite: "same-origin", weekId,
  });
  const voidedWeek: Any = (await W.dal.weekStore.list({ states: ["VOIDED"] }))[0];
  const before = { packs, csvs };
  const refund: Any = await maswaliEvidenceDoor(reqFor(String(voidedWeek?.id), "tickets"), deps({ packFails: true })).catch((err: unknown) => ({ kind: "threw", error: String(err) }));
  const refundRecord = records[records.length - 1];
  ok("5.10 · ⭐ R5 · the voided week's refund CSV is served while the pack cannot be built — it never waits on the cluster report or any other section — its hash on its record, and no pack begun",
    !!voidedWeek && refund.kind === "file" && refund.contentType.startsWith("text/csv") && String(refund.body).includes('"REFUNDED"')
      && packs === before.packs && csvs === before.csvs + 1 && refundRecord?.payload?.part === "tickets" && refundRecord?.payload?.sha256 === refund.sha256,
    J({ kind: refund.kind, packsBegun: packs - before.packs, error: refund.error ?? null }));
  const selling: Any = await W.dal.weekStore.openFor("PUBLIC");
  const recordsBefore = records.length;
  const notFinal: Any = await maswaliEvidenceDoor(reqFor(String(selling?.id)), deps());
  const notFinalCsv: Any = await maswaliEvidenceDoor(reqFor(String(selling?.id), "tickets"), deps());
  ok("5.11 · R5 · each door answer · a week still selling is refused BY NAME for either part — the reason its 409 carries — and nothing is recorded",
    !!selling && notFinal.kind === "not_final" && notFinalCsv.kind === "not_final" && /ready once it is settled or voided/.test(String(notFinal.error))
      && records.length === recordsBefore,
    J([notFinal, notFinalCsv]));
  const csvUnwritten = await maswaliEvidenceDoor(req({ part: "tickets" }), deps({ recorded: false }));
  ok("5.12 · ⛔ R5 · each door answer · an export of the CSV whose record could not be written hands over no CSV either",
    csvUnwritten.kind === "unrecorded" && !("body" in csvUnwritten), J(csvUnwritten));
}

// ── §6 · R2-10 / R2-11 · a forfeit's own ledger group, the platform's sales pause, an objection's question ──────────
console.log(`${LF}§6 · R2-10 / R2-11 · what else a week's record holds: a forfeit, the sales pause, and which question an objection named`);
{
  const { salesPauseRowsFor, EVIDENCE_PAUSE_ACTIONS } = await import("../../src/lib/server/maswali-evidence.ts");
  const won: Any = tickets.find((t: Any) => t.userId === p1 && t.won === true);
  const compliance = await W.user({ role: "COMPLIANCE" });
  // R7 · the lead's ruling: a settled week holding a share is not yet decided — the report counts the share held until
  // the officer's forfeit decides it.
  const { clusterReport: reportOf } = await import("../../src/lib/server/maswali-integrity.ts");
  const undecidedBefore = (await reportOf((await W.dal.weekStore.get(week.id))!)).undecidedShares;
  const forfeited = await W.settle.forfeitMaswaliShare({ ticketId: won.id, officerId: compliance, typed: W.settle.FORFEIT_SHARE_WORD, reason: "the payment behind it was reversed" });
  const undecidedAfter = (await reportOf((await W.dal.weekStore.get(week.id))!)).undecidedShares;
  const r6 = await maswaliEvidencePack(week.id);
  const p6: Any = r6.ok ? r6.pack : null;
  ok("6.1 · CONTROL · Compliance forfeits the held share back to the jackpot; the pack counts it forfeited, its note the officer's own words",
    forfeited.ok && p6?.integrity.sharesForfeited === 1 && r6.ok && csvLines(r6.csv).some((l) => l.startsWith(`"${won.serial}"`) && l.endsWith('"forfeited","the payment behind it was reversed"')),
    J(forfeited));
  ok("6.1b · ⭐ R7 · the settled week's report counts its held winning share as undecided — one while it is held, none once the forfeit decides it",
    undecidedBefore === 1 && undecidedAfter === 0, J({ undecidedBefore, undecidedAfter }));
  if (W.onPostgres) {
    const fg = p6?.ledger.forfeits;
    ok("6.2 · ⭐ R2-10 · Postgres · the forfeit's own ledger group is in the pack, line by line, summing to 0",
      fg?.state === "read" && fg.lines.length === 2 && fg.sumTzs === 0 && fg.lines.every((l: Any) => l.groupId.startsWith("maswali_forfeit_") && l.entryType === "MASWALI_FORFEIT_RETURN"),
      J(fg).slice(0, 300));
  } else {
    ok("6.2 · R2-10 · memory · the pack SAYS it holds no forfeit lines (this store keeps none)", p6?.ledger.forfeits?.state === "not-kept", J(p6?.ledger.forfeits ?? null));
  }
  // R2-10 · the platform-wide pause names no week: a week carries the rows inside its own sale window — R3, and the start
  // row of a pause still in force when it opened — and no other.
  const at = (ms: number) => new Date(ms).toISOString();
  const open = Date.parse(week.opensAt), close = Date.parse((await W.dal.weekStore.get(week.id))?.closedAt ?? week.closesAt);
  const row = (action: string, ms: number) => ({ id: `a_${action}_${ms}`, category: "COMPLIANCE", action, actorId: "usr_x", targetType: "MaswaliSalesPause", targetId: "maswali.sales_pause", createdAt: at(ms), prevHash: "", entryHash: "" }) as Any;
  const [PAUSED, RESUMED] = EVIDENCE_PAUSE_ACTIONS;
  const span = { opensAt: week.opensAt, closedAt: at(close), closesAt: week.closesAt };
  const inside = [row(PAUSED, open + 60_000), row(RESUMED, close - 60_000)];
  const kept = salesPauseRowsFor(span,
    [...inside, row(PAUSED, open - 120_000), row(RESUMED, open - 60_000), row(RESUMED, close + 60_000), row(PAUSED, close + 120_000), row("maswali.week.opened", open + 120_000)]);
  ok("6.3 · ⭐ R2-10 · the sales pause and its lifting inside the week's sale window are the week's — a pause lifted before its open, a change after its close, or any other action, is not",
    J(kept.map((e) => e.id)) === J(inside.map((e) => e.id)), J(kept.map((e) => e.id)));
  // R3 · a pause made before the open and lifted inside the window: newest first, as the audit read returns them.
  const inForce = row(PAUSED, open - 60_000), lifted = row(RESUMED, open + 30 * 60_000);
  const keptInForce = salesPauseRowsFor(span, [row(PAUSED, open - 3 * 3_600_000), row(RESUMED, open - 2 * 3_600_000), inForce, lifted, row(PAUSED, close + 60_000)].reverse());
  ok("6.3b · ⭐ R3 · a pause still in force when the week opened is the week's too: its start row is carried, though written before the open — an earlier pause, lifted before it, is not",
    J(keptInForce.map((e) => e.id).sort()) === J([inForce, lifted].map((e) => e.id).sort()), J(keptInForce.map((e) => e.id)));
  // R2-11 · an objection that names a Millionea question keeps it, on both stores.
  const objector = await W.user({ balance: 0 });
  const objection = {
    id: `obj_mln_${objector}`, marketId: String(week.marketId), userId: objector, reason: "WRONG_OUTCOME", detail: "Question 3's result is not what the source says.",
    status: "REJECTED", createdAt: new Date().toISOString(), reviewedBy: compliance, reviewedAt: new Date().toISOString(), reviewNote: "The source agrees with the seal.",
    remedy: null, outcomeAtFiling: null, questionOrdinal: 3,
  };
  await W.db.objection.create(objection as never);
  const stored: Any = (await W.db.objection.listForMarket(String(week.marketId))).find((o: Any) => o.id === objection.id);
  const r7 = await maswaliEvidencePack(week.id);
  ok("6.4 · ⭐ R2-11 · an objection keeps the question it named, on this store, and the week's pack carries it",
    stored?.questionOrdinal === 3 && r7.ok && (r7.pack.objections as Any[]).some((o: Any) => o.id === objection.id && o.questionOrdinal === 3), J(stored ?? null));
  // R3 · the pack's OWN pause read, driven once: Compliance pauses the sales now — before this week's open, which sits
  // weeks ahead on the real clock — so the pause is in force when the week opens; then lifts it, still before the open.
  const { pauseMaswaliSales, resumeMaswaliSales } = await import("../../src/lib/server/maswali-pause.ts");
  const pauser = await W.user({ role: "COMPLIANCE" });
  const pauseRows = (r: Any): Any[] => (r.ok ? (r.pack.audit.rows as Any[]) : []).filter((x: Any) => x.actorId === pauser);
  const paused = await pauseMaswaliSales({ officerId: pauser, reason: "a pause made before this week opened" });
  await auditFlush();
  const r8 = await maswaliEvidencePack(week.id);
  ok("6.5 · ⭐ R3 · the pack's own read carries a pause still in force when the week opened — its start row, written before the open",
    paused.ok && open > Date.now() && J(pauseRows(r8).map((x: Any) => x.action)) === J([PAUSED]),
    J({ paused: paused.ok, open: week.opensAt, rows: pauseRows(r8).map((x: Any) => [x.action, x.createdAt]) }));
  const resumed = await resumeMaswaliSales({ officerId: pauser, note: "the pause is lifted before the week opens" });
  await auditFlush();
  const r9 = await maswaliEvidencePack(week.id);
  ok("6.6 · CONTROL · …and once that pause is lifted before the open, the pack carries neither row",
    resumed.ok && r9.ok && pauseRows(r9).length === 0, J({ resumed: resumed.ok, rows: pauseRows(r9).map((x: Any) => x.action) }));
}

// ── §7 · R4 · a crowded place's holders ride along in the pack whole, by account id ──────────────────────
console.log(`${LF}§7 · R4 · a crowded place's holders ride along in the pack whole, by account id`);
{
  const { audit } = await import("../../src/lib/server/audit.ts");
  const { CLUSTER_LINE_PREVIEW, clusterReport } = await import("../../src/lib/server/maswali-integrity.ts");
  // §3's week, still selling: seven new holders on one crowded place — more than a line's row names — and nothing else
  // tying them; R5 · and five more crowded places of two holders each; then the week voids whole, so its pack can be built.
  const sw: Any = await W.dal.weekStore.openFor("PUBLIC");
  const seven: string[] = [], crowd: string[] = [], pairs: string[][] = [];
  for (let k = 0; k < 7; k++) seven.push(await W.user({ balance: 50_000 }));
  for (let k = 0; k < 40; k++) crowd.push(await W.user({ balance: 0 }));
  for (let p = 0; p < 5; p++) pairs.push([await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })]);
  const signIn = (who: string, ip: string, ua: string) =>
    audit({ category: "AUTH", action: "auth.login.test", actorId: who, targetType: "User", targetId: who, ip, userAgent: ua });
  for (const [k, who] of [...seven, ...crowd].entries()) signIn(who, "198.51.100.160", `r4-pack-${k}`);
  for (const [p, two] of pairs.entries()) for (const [k, who] of [...two, ...crowd].entries()) signIn(who, `198.51.100.${161 + p}`, `r5-pack-${p}-${k}`);
  await auditFlush();
  const buys: Any[] = [];
  for (const [k, who] of seven.entries()) buys.push(await W.buy(who, sw.id, [W.slip("NO", k)]));
  for (const [p, two] of pairs.entries()) for (const [k, who] of two.entries()) buys.push(await W.buy(who, sw.id, [W.slip("YES", 2 * p + k)]));
  const vat = await W.closeAndSeal(sw, Date.parse(sw.opensAt) - 60_000, ALL_VOID);
  const vr = await W.svc.voidWeek({ weekId: sw.id, now: vat });
  await auditFlush();
  const r8 = await maswaliEvidencePack(sw.id);
  const place: Any = r8.ok ? (r8.pack.clusters.crowded ?? []).find((g: Any) => g.accountCount === 7) : null;
  ok("7.1 · CONTROL · the week sold to its seventeen new holders, voided whole, and its pack builds with six crowded lines",
    !!sw && buys.length === 17 && buys.every((b) => b.ok) && vr.ok && r8.ok && (r8.pack.clusters.crowded ?? []).length === 6,
    J({ void: vr.ok ? null : vr, crowded: r8.ok ? (r8.pack.clusters.crowded ?? []).length : r8.error }));
  ok("7.2 · ⭐ R4 · the pack carries a crowded line's holders WHOLE — all seven, though its row names fewer — by account id only, never a name",
    !!place && CLUSTER_LINE_PREVIEW < 7 && place.accountCount === 7 && J(place.accounts.map((a: Any) => a.userId)) === J([...seven].sort())
      && place.accounts.every((a: Any) => J(Object.keys(a)) === J(["userId", "tickets"]) && a.tickets === 1) && r8.ok && !J(r8.pack.clusters).includes('"holder"'),
    J(place ? { count: place.accountCount, accounts: place.accounts.length } : null));

  // R5 · HIGH · the reads one pack makes, counted through the stores the pack reads (the console suite's spy): the
  // week and its tickets are read as often for six crowded lines as for none — never once per line (the store spies
  // count exactly two reads: `weekStore.get` and `ticketStore.listForWeek`). R7 · and the raw SQL the pack sends to
  // Postgres, counted AT THE CLIENT: the shared Prisma singleton (`globalThis.__50PICK_PRISMA`, what `prisma()` hands
  // every reader) is wrapped for the build, and every raw statement sent on it — `$queryRaw`, `$queryRawUnsafe`,
  // `$executeRaw`, `$executeRawUnsafe` — is counted, marked or not. ⚠️ Not counted: a statement sent inside an interactive
  // transaction (its `tx` client is not wrapped), and model reads (`c.ledgerEntry…`).
  const integrity: Any = await import("../../src/lib/server/maswali-integrity.ts");
  const seamed = typeof integrity.__setClusterReadSeamsForTests === "function";
  const { prisma: prismaClient } = await import("../../src/lib/server/prisma.ts");
  const counted = async (weekId: string) => {
    const spy = { tickets: 0, weeks: 0, statements: 0 };
    const orig = { tickets: W.dal.ticketStore.listForWeek, week: W.dal.weekStore.get };
    const real: Any = W.onPostgres ? prismaClient() : null;
    try {
      W.dal.ticketStore.listForWeek = (...a: Any[]) => { spy.tickets++; return orig.tickets.apply(W.dal.ticketStore, a as Any); };
      W.dal.weekStore.get = (...a: Any[]) => { spy.weeks++; return orig.week.apply(W.dal.weekStore, a as Any); };
      if (real) {
        (globalThis as Any).__50PICK_PRISMA = new Proxy(real, {
          get(target: Any, prop: PropertyKey) {
            const v = Reflect.get(target, prop, target);
            if (prop === "$queryRaw" || prop === "$queryRawUnsafe" || prop === "$executeRaw" || prop === "$executeRawUnsafe") {
              return (...a: Any[]) => { spy.statements++; return v.apply(target, a); };
            }
            return typeof v === "function" ? v.bind(target) : v;
          },
        });
      }
      const r = await maswaliEvidencePack(weekId);
      return { r, ...spy };
    } finally {
      W.dal.ticketStore.listForWeek = orig.tickets;
      W.dal.weekStore.get = orig.week;
      if (real) (globalThis as Any).__50PICK_PRISMA = real;
    }
  };
  const many: Any = await counted(sw.id), none: Any = await counted(week.id);
  ok("7.3 · ⭐ R5 · HIGH · the pack is built in a bounded number of reads: the week and its tickets read as often for six crowded lines as for a week with none (the spies fire, so the counts are measured)",
    many.r.ok && many.r.pack.clusters.crowded.length === 6 && none.r.ok && none.r.pack.clusters.crowded.length === 0
      && many.tickets >= 1 && many.weeks >= 1 && many.tickets === none.tickets && many.weeks === none.weeks,
    J({ six: [many.tickets, many.weeks], none: [none.tickets, none.weeks] }));
  if (W.onPostgres) {
    ok("7.3b · ⭐ R7 · Postgres · counted at the client, the pack sends the same raw statements for six crowded lines as for a week with none — three, the report's own",
      many.statements === 3 && none.statements === 3, J({ six: many.statements, none: none.statements }));
  } else {
    ok("7.3b · R7 · memory · the twin sends no statement, for six crowded lines as for none", many.statements === 0 && none.statements === 0,
      J({ six: many.statements, none: none.statements }));
  }
  const seen = await clusterReport((await W.dal.weekStore.get(sw.id))!);
  const order: string[] = many.r.ok ? (many.r.pack.clusters.order ?? []) : [];
  ok("7.4 · R5 · the pack carries the report's one order, as the lines' ids — every line once, in the order Compliance saw them",
    many.r.ok && J(order) === J(seen.lines.map((g: Any) => g.id)) && new Set(order).size === many.r.pack.clusters.groups.length + many.r.pack.clusters.crowded.length,
    J({ order: order.length, lines: seen.lines.length }));

  // R6 · LOW-2 · the report's read made to fail (the read's own seam, on either store — the memory twin degrades as
  // Postgres does): the pack is still built and says so — its cluster section unreadable, no crowded line — and the
  // refund CSV is served all the same; with the seam cleared the section reads again.
  const { maswaliEvidenceTickets } = await import("../../src/lib/server/maswali-evidence.ts");
  let broken: Any = null, csvStill: Any = null;
  try {
    if (seamed) integrity.__setClusterReadSeamsForTests({ beforeRead: () => { throw new Error("the report's read failed (planted)"); } });
    broken = await maswaliEvidencePack(sw.id).catch((err: unknown) => ({ ok: false, threw: String(err) }));
    csvStill = await maswaliEvidenceTickets(sw.id);
  } finally {
    if (seamed) integrity.__setClusterReadSeamsForTests(null);
  }
  const again: Any = await maswaliEvidencePack(sw.id);
  ok("7.5 · ⭐ R6 · a failed read of the report is stated, never thrown: the pack is built with its cluster section unreadable and no crowded line, the refund CSV is still served — and with the read restored the section reads again",
    seamed && broken?.ok === true && broken.pack.clusters.readable === false && broken.pack.clusters.crowded.length === 0
      && !!csvStill?.ok && String(csvStill.csv).includes('"REFUNDED"')
      && again.ok && again.pack.clusters.readable === true && again.pack.clusters.crowded.length === 6,
    J({ seamed, built: broken?.ok ?? null, readable: broken?.ok ? broken.pack.clusters.readable : null, threw: broken?.threw ?? null }));
}

console.log(`${LF}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
