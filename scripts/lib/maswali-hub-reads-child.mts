/**
 * test:maswali-hub-reads — THE HUB'S OWN READS, ON BOTH STORES (MASWALI-BUILD S5-DESIGN-HUB; R1-hub M7 and L22, and the
 * lead's ruling on R1-register H2: the hub week's commitments). The cases behind `scripts/maswali-hub-reads.test.mts`.
 *
 *   §1 M7 · a moved close: nothing until one is moved; then the close it HAS and the close it HAD, from the audit entry
 *      `moveClose` writes — the latest move's; nothing once the stored close and that entry disagree, once the week has
 *      closed, or once its close has passed. On Postgres the entry is read back from the table (`getAuditForTargetsDurable`).
 *   §2 L22 · the final week announced ahead: nothing while none is final; the drafted final week's code and scheduled open
 *      once the Owner made it final a full week ahead; nothing on the drive line; CONTROL nothing once the final week is the
 *      week on sale (the hub then says it in the week's own head).
 *   §3 the hub week's commitments: none for a draft; the question set's hash from the open (published at the week's open);
 *      the tickets' root, its close and its count once closed — each the week's own stamped column.
 *   §4 L20 · each held ticket's free-cancel end: none without a ticket; each just-bought ticket's own end, the ticket page's
 *      to the millisecond; none once every window has passed; CONTROL none once the week is no longer on sale.
 * ⛔ Every week, ticket, move and close goes through the product's own services (the money world's doors).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-hub-reads-session-secret-0123456789abcdef";
// The week timer stays off: nothing here waits on a tick.
process.env.MASWALI_SCHEDULER = "false";

const { loadMaswaliWorld, DRAFTER, OWNER, READER } = await import("./maswali-money-world.mts");
const W: any = await loadMaswaliWorld();
const P: any = await import("../../src/lib/server/maswali-player.ts");
const { auditFlush }: any = await import("../../src/lib/server/audit.ts");
const DAY = 86_400_000;

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const hubWeek = (w: any) => ({ id: w.id, state: w.state, opensAt: w.opensAt, closesAt: w.closesAt });

await W.setup({ guarantee: 20_000_000 });
const buyer = await W.user({ balance: 100_000 });

// ── §1 · M7 · the moved close ─────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · M7 · a moved close, from the record moveClose writes");
const { week, start } = await W.openWeek({ weeksAhead: 2 });
{
  const now = Date.now();
  ok("1.1 · a week whose close never moved announces nothing", (await P.millioneaCloseMove(hubWeek(week), now)) === null);
  const to1 = new Date(Date.parse(week.closesAt) - 2 * 3_600_000).toISOString();
  const m1 = await W.svc.moveClose({ weekId: week.id, toCloseAt: to1, expectedClosesAt: week.closesAt, officerId: OWNER, now: new Date(start + DAY) });
  await auditFlush();
  const w1 = await W.dal.weekStore.get(week.id);
  const r1 = await P.millioneaCloseMove(hubWeek(w1), now);
  ok("1.2 · moved two hours earlier: the close it HAS and the close it HAD", m1.ok && !!r1 && Date.parse(r1.to) === Date.parse(w1.closesAt)
    && Date.parse(r1.from) === Date.parse(week.closesAt) && Date.parse(w1.closesAt) === Date.parse(to1), J({ m1: m1.ok ? "ok" : m1.error, r1, stored: w1.closesAt }));
  const to2 = new Date(Date.parse(to1) + 3_600_000).toISOString();
  const m2 = await W.svc.moveClose({ weekId: week.id, toCloseAt: to2, expectedClosesAt: w1.closesAt, officerId: OWNER, now: new Date(start + DAY + 3_600_000) });
  await auditFlush();
  const w2 = await W.dal.weekStore.get(week.id);
  const r2 = await P.millioneaCloseMove(hubWeek(w2), now);
  ok("1.3 · moved again: \"was\" is the close before the LATEST move, \"now\" the close the week has", m2.ok && !!r2 && Date.parse(r2.from) === Date.parse(to1) && Date.parse(r2.to) === Date.parse(to2), J({ r2 }));
  ok("1.4 · ⛔ a stored close the latest entry does not name: nothing (never a \"was\" the record cannot stand behind)",
    (await P.millioneaCloseMove({ ...hubWeek(w2), closesAt: week.closesAt }, now)) === null);
  ok("1.5 · a week no longer on sale: nothing", (await P.millioneaCloseMove({ ...hubWeek(w2), state: "CLOSED" }, now)) === null);
  ok("1.6 · a close already past: nothing", (await P.millioneaCloseMove(hubWeek(w2), Date.parse(w2.closesAt) + 1)) === null);
}

// ⛔ ONE WORLD, NEVER RESET: the Postgres store keeps every row (`setup` resets only the memory stores, and funding the
// guarantee twice is refused by its reference), so the sections run in an order whose LAST step is the Owner's sunset:
// the week on sale (§1) closes in §3, the next one opens and closes in §4, and only then is the final week drafted,
// announced (§2) and opened (the §2 control).

// ── §3 · the hub week's commitments ───────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · the hub week's two commitments, each the week's own stamped column");
{
  const open = await P.millioneaHubCommitments(week.id);
  const stored = await W.dal.weekStore.get(week.id);
  ok("3.2 · on sale: the question set's hash and its publication (the week's open); no root, close or count yet",
    !!open && /^[0-9a-f]{64}$/.test(String(open.questionSetHash)) && open.questionSetHash === stored.questionSetHash && open.publishedAt === stored.opensAt
      && open.ticketRoot === null && open.closedAt === null && open.ticketCount === null, J(open));
  const b = await W.buy(buyer, week.id, [W.LOSE, W.WIN, W.LOSE]);
  const closed = await W.svc.closeWeek({ weekId: week.id, now: new Date(Date.parse(stored.closesAt) + 60_000) });
  const after = await W.dal.weekStore.get(week.id);
  const c = await P.millioneaHubCommitments(week.id);
  ok("3.3 · closed: the tickets' root, its close and its count — the stamped columns, three tickets",
    b.ok && closed.ok && !!c && !!c.ticketRoot && c.ticketRoot === after.ticketMerkleRoot && c.closedAt === after.closedAt && c.ticketCount === 3 && after.ticketCount === 3, J(c));
}

// ── §4 · L20 · each held ticket's free-cancel end ─────────────────────────────────────────────────────────────────────
console.log("\n§4 · L20 · each held ticket's free-cancel end — the ticket page's own (RULES §2.6)");
{
  // The week after: §3 closed the one on sale, and one week sells at a time (MR-3).
  const { week: w } = await W.openWeek({ weeksAhead: 3 });
  const p = await W.user({ balance: 100_000 });
  ok("4.1 · no ticket held: no end", J(await P.millioneaHubCancelEnds(w.id, p)) === "{}");
  const b = await W.buy(p, w.id, [W.LOSE, W.WIN]);
  const ends = await P.millioneaHubCancelEnds(w.id, p);
  const serials = Object.keys(ends).sort();
  const pages = await Promise.all(serials.map((s) => P.millioneaTicket(p, s)));
  ok("4.2 · two tickets just bought: each its own end, the ticket page's to the millisecond, still ahead",
    b.ok && serials.length === 2 && pages.every((v: any, i: number) => !!v && v.cancelUntil === ends[serials[i]] && Date.parse(ends[serials[i]]) > Date.now()),
    J({ ends, pages: pages.map((v: any) => v?.cancelUntil ?? null) }));
  const past = new Date(Math.max(...serials.map((s) => Date.parse(ends[s]))) + 1);
  ok("4.3 · once every window has passed: none", J(await P.millioneaHubCancelEnds(w.id, p, past)) === "{}");
  const closed = await W.svc.closeWeek({ weekId: w.id, now: new Date(Date.parse(w.closesAt) + 60_000) });
  ok("4.4 · CONTROL · a week no longer on sale: none", closed.ok && J(await P.millioneaHubCancelEnds(w.id, p)) === "{}", closed.ok ? "" : closed.error);
}

// ── §2 · L22 · the final week announced ahead — last, as the Owner's sunset ends the world's calendar ───────────────────
console.log("\n§2 · L22 · OD-03's announcement: the final week, a full week ahead");
{
  ok("2.1 · no final week: nothing", (await P.millioneaFinalWeekAhead("PUBLIC")) === null);
  const ahead = W.weekStartAhead(5);
  const c = await W.svc.createWeek({ weekStartMs: ahead, visibility: "PUBLIC", questions: W.questions(ahead), officerId: DRAFTER, now: new Date(ahead - 3 * DAY) });
  const s = c.ok ? await W.svc.sunsetMaswali({ weekId: c.week.id, ownerId: OWNER, typed: W.svc.SUNSET_WORD, reason: "test: the final week is announced a full week ahead" }) : c;
  const a = await P.millioneaFinalWeekAhead("PUBLIC");
  ok("2.2 · the drafted final week is announced: its stamped code and its scheduled open", s.ok && !!a && a.code === c.week.code && a.opensAt === c.week.opensAt, J({ s: s.ok ? "ok" : s.error, a }));
  ok("2.3 · the drive line announces nothing (a drive week is never final)", (await P.millioneaFinalWeekAhead("DRIVE")) === null);
  ok("3.1 · a draft has no commitment (it was never published)", c.ok && (await P.millioneaHubCommitments(c.week.id)) === null);
  // CONTROL · the same final week, opened (no week sells: §3 and §4 closed theirs): on sale, its own head says it — no
  // announcement ahead any more.
  const at = c.ok ? await W.svc.attestParity({ weekId: c.week.id, officerId: READER, readVersion: await W.svc.readDraftVersion(c.week.id) }) : c;
  const op = at.ok ? await W.svc.openWeek({ weekId: c.week.id, officerId: DRAFTER, guarantee: W.money.guaranteeReader, now: new Date(ahead + 60_000) }) : at;
  ok("2.4 · CONTROL · once the final week is on sale it is no announcement ahead (its own head says it): nothing",
    op.ok && op.week.state === "OPEN" && (await P.millioneaFinalWeekAhead("PUBLIC")) === null, op.ok ? "" : op.error);
}

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
