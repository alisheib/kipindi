/**
 * test:maswali-integrity — COMPLIANCE'S INTEGRITY READS, ON BOTH STORES (MASWALI-BUILD S4 part 3).
 *
 *   npx tsx scripts/maswali-integrity.test.mts     (npm run test:maswali-integrity)
 *
 *   §1 the cluster report at close: two accounts the platform's records connect are one group; two accounts holding the
 *      same fifteen answers are another; a stranger is in neither — and the report reads on Postgres, whose half runs the
 *      real aggregate over the platform's records.
 *   §2 pick shifts while a week sells: a question whose answers swing among the latest tickets is reported, a steady one
 *      is not.
 *   §4 (S6, MB-35) Compliance sees coordinated coverage before the week pays: a group's tickets and how much of the board
 *      they cover together, nothing claimed about winners while the objection window is open (R2-2), then the group
 *      holding the 10/10 ticket counted and FIRST — ahead of a wider connected pair (R2-14) — and every group reported,
 *      past the 50 the S4 report silently kept.
 *   §5 (S6 review R2-3, R2-9, R3) the records the report reads lie inside the window that ends at the week's close, on
 *      both sides, and the report says so; holders the records tie together are one group; a crowded place ties nobody
 *      into a group, yet is reported on a line of its own that counts its holders and names the first of them; every
 *      line keeps a stable id and place; and the week's own coverage of the board.
 *   §6 (R3) a ring of 103 accounts covering the whole board is one group: one line, whatever the ring's size.
 *   §7 (R4) every line in one order: a crowded line holding the winner leads the report, ahead of more same-answer
 *      pairs than one console page holds; it carries its count, its figures and its first holders, and opens a page at
 *      a time; its id is the one the suite computes from its holders; and the read is written without a `NOT IN` subquery.
 *   §8 (R5, the lead's order) a line holding a winning ticket first; then the groups the records tie, shared answers,
 *      crowded places: a three-account ring stays on the first page, whether many crowded lines hold more winning
 *      tickets or no winner is counted yet. Its week sits on the drive line, three weeks ahead (R6). And the integrity
 *      page's order over several weeks (R6–R8, the lead's rulings), in three tiers — the weeks not yet decided first:
 *      still to pay (8.4, 8.5, 8.6b), then settled holding a share (8.6); then the decided ones (8.7) — each tier in the
 *      report's one order.
 * ⛔ THE RECORDS WINDOW ENDS AT THE WEEK'S CLOSE, so every week this suite reads it for closes at most seven
 *    weeks ahead of the run's own Monday (§1 and §4–§7 at two and four to seven, §8 at three on the drive line); a week
 *    further out leaves what a run writes on a Monday morning before its window. 8.0a holds §8's fixture to that, by name.
 */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-integrity-session-secret-0123456789abcdef";

const { loadMaswaliWorld, SEALER } = await import("./maswali-money-world.mts");
const W = await loadMaswaliWorld();
const { clusterReport, pickShifts } = await import("../../src/lib/server/maswali-integrity.ts");
const { audit, auditFlush } = await import("../../src/lib/server/audit.ts");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// R6 · §6's report — a week still to pay, holding a ring — read again in §8 beside a paid week.
let ringWeekReport: Any = null;
// R7 · §4's report before its seal — a week still to pay, its winners not yet counted — read again in §8.
let pendingWeekReport: Any = null;

await W.setup({ guarantee: 20_000_000 });

// ── §1 · the cluster report ─────────────────────────────────────────────────
console.log("\n§1 · the cluster report at close");
{
  const { week } = await W.openWeek({ weeksAhead: 2 });
  const [a, b, c, d] = [await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })];
  // a and b: the platform's records tie them together; a and c hold the same fifteen answers; d is a stranger to all three.
  for (const u of [a, b]) audit({ category: "AUTH", action: "auth.login.test", actorId: u, targetType: "User", targetId: u, ip: "203.0.113.7", userAgent: "test" });
  await auditFlush();
  const same = W.slip("NO", 3);
  await W.buy(a, week.id, [same, W.LOSE]);
  await W.buy(b, week.id, [W.slip("YES", 5)]);
  await W.buy(c, week.id, [same]);
  await W.buy(d, week.id, [W.slip("NO", 7)]);
  await W.svc.closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt) + 60_000) });
  const r = await clusterReport((await W.dal.weekStore.get(week.id))!);
  const records = r.groups.filter((g) => g.basis === "records").map((g) => g.accounts.map((x) => x.userId).sort());
  const answers = r.groups.filter((g) => g.basis === "answers").map((g) => g.accounts.map((x) => x.userId).sort());
  ok("1.1 · the report reads", r.readable && r.holders === 4, J({ readable: r.readable, holders: r.holders }));
  ok("1.2 · ⭐ the two accounts the records connect are one group", records.some((g) => J(g) === J([a, b].sort())), J(records));
  ok("1.3 · ⭐ the two accounts with the same fifteen answers are one group", answers.some((g) => J(g) === J([a, c].sort())), J(answers));
  ok("1.4 · the stranger is in no group", !r.groups.some((g) => g.accounts.some((x) => x.userId === d)));
  ok("1.5 · each account carries its ticket count", r.groups.flatMap((g) => g.accounts).find((x) => x.userId === a)?.tickets === 2);
  ok("1.6 · a small complete report names full holder and group coverage without a limit warning",
    r.coverage.holdersTotal === 4 && r.coverage.connectedHoldersChecked === 4 && r.coverage.groupsFound === 2
      && r.coverage.groupsShown === 2 && !r.coverage.connectionSourceLimitReached && !r.coverage.limited);
}

// ── §2 · pick shifts ────────────────────────────────────────────────────────
console.log("\n§2 · answers swinging while a week sells");
{
  const { week } = await W.openWeek({ weeksAhead: 3 });
  const early = Array.from({ length: 4 }, () => 0).map(() => W.user({ balance: 50_000 }));
  for (const p of early) await W.buy(await p, week.id, Array.from({ length: 10 }, () => W.slip("NO")));
  await sleep(4_000);
  const late = Array.from({ length: 4 }, () => 0).map(() => W.user({ balance: 50_000 }));
  for (const p of late) await W.buy(await p, week.id, Array.from({ length: 10 }, () => W.slip("YES")));
  const shifts = await pickShifts({ windowHours: 3 / 3600, minSwing: 0.5, minRecent: 30 });
  const mine = shifts.filter((x) => x.weekId === week.id);
  ok("2.1 · ⭐ every main question swung from NO to YES is reported", mine.filter((x) => x.slot <= 10).length === 10 && mine.every((x) => x.before === 0 && x.recent === 1), J(mine.map((x) => x.label)));
  ok("2.2 · a reserve every ticket answered YES throughout did not move, and is not reported", !mine.some((x) => x.slot > 10), J(mine.filter((x) => x.slot > 10).map((x) => x.label)));
  const quiet = await pickShifts({ windowHours: 3 / 3600, minSwing: 0.5, minRecent: 50 });
  ok("2.3 · below the minimum of recent tickets nothing is reported", !quiet.some((x) => x.weekId === week.id));
}

// ── §3 · a seal from a new device (MB-94) ───────────────────────────────────
console.log("\n§3 · a seal from a new device");
{
  const { noteSealDevice, recentNewDeviceSeals } = await import("../../src/lib/server/maswali-integrity.ts");
  const officer = `usr_mln_sealer_${process.pid}`;
  const before = (await recentNewDeviceSeals(200))?.filter((d) => d.officerId === officer).length ?? -1;
  await noteSealDevice({ officerId: officer, weekId: "mlw_dev", slots: [1], ip: "198.51.100.4", userAgent: "phone-A" });
  await auditFlush();
  await noteSealDevice({ officerId: officer, weekId: "mlw_dev", slots: [2], ip: "198.51.100.4", userAgent: "phone-A" });
  await auditFlush();
  const afterSame = (await recentNewDeviceSeals(200))?.filter((d) => d.officerId === officer) ?? [];
  ok("3.1 · the officer's first sealing device is recorded once, as their first seal", before === 0 && afterSame.length === 1 && afterSame[0].firstSeal === true, JSON.stringify(afterSame));
  await noteSealDevice({ officerId: officer, weekId: "mlw_dev", slots: [3], ip: "198.51.100.9", userAgent: "laptop-B" });
  await auditFlush();
  const afterNew = (await recentNewDeviceSeals(200))?.filter((d) => d.officerId === officer) ?? [];
  ok("3.2 · ⭐ a seal from a device they never sealed from is recorded as new", afterNew.length === 2 && afterNew.some((d) => d.firstSeal === false), JSON.stringify(afterNew));
}

// ── §4 · MB-35 (S6): coordinated coverage, seen before the week pays ─────────
console.log("\n§4 · the cluster report says how much of the board a group covers, and whether it holds a winner");
{
  // One OPEN week per visibility: §2's selling week is closed first, at its own close.
  const selling = await W.dal.weekStore.openFor("PUBLIC");
  if (selling) await W.svc.closeWeek({ weekId: selling.id, now: new Date(Date.parse(selling.closesAt) + 60_000) });
  const { week, start } = await W.openWeek({ weeksAhead: 4 });
  const [e, f, g] = [await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })];
  // R2-14 · h and i, a second connected pair that covers MORE of the board than e and f and holds no winner — so "the
  // winner first" is measured against an order that would otherwise put them first.
  const [h, i2] = [await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })];
  // e and f the platform's records tie together; g is a stranger to both.
  for (const u of [e, f]) audit({ category: "AUTH", action: "auth.login.test", actorId: u, targetType: "User", targetId: u, ip: "198.51.100.77", userAgent: "test" });
  for (const u of [h, i2]) audit({ category: "AUTH", action: "auth.login.test", actorId: u, targetType: "User", targetId: u, ip: "198.51.100.88", userAgent: "test" });
  await auditFlush();
  const bought = [await W.buy(e, week.id, [W.WIN, W.slip("YES", 1)]), await W.buy(f, week.id, [W.slip("YES", 2)]), await W.buy(g, week.id, [W.LOSE]),
    await W.buy(h, week.id, [W.slip("NO", 0), W.slip("NO", 1)]), await W.buy(i2, week.id, [W.slip("NO", 2), W.slip("NO", 3)])];
  // ⛔ MORE GROUPS THAN THE OLD CAP (S4 kept the first 50 and dropped the rest without a word): 52 pairs of accounts, each
  // pair holding one fifteen-answer set of its own.
  const PAIRS = 52;
  const pairSlip = (i: number) => Array.from({ length: 15 }, (_, j) => (j < 10 ? (((i + 100) >> j) & 1 ? "YES" : "NO") : "YES"));
  for (let i = 0; i < PAIRS; i++) {
    for (let k = 0; k < 2; k++) bought.push(await W.buy(await W.user({ balance: 50_000 }), week.id, [pairSlip(i)]));
  }
  ok("4.0 · CONTROL · every purchase landed (5 + 104 players)", bought.length === 5 + 2 * PAIRS && bought.every((r: Any) => r.ok), J(bought.filter((r: Any) => !r.ok).slice(0, 2)));
  await W.svc.closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt) + 60_000) });

  const before = await clusterReport((await W.dal.weekStore.get(week.id))!);
  pendingWeekReport = before;
  const pairOf = (r: Any, users: string[]) => r.groups.find((x: Any) => x.basis === "records" && J(x.accounts.map((a: Any) => a.userId).sort()) === J([...users].sort()));
  const grp = (r: Any) => pairOf(r, [e, f]);
  const ef = grp(before);
  ok("4.1 · before the results are final the report says so — no group claims a winner either way",
    before.resultsFinal === false && before.groupsWithWinner === 0 && before.groups.every((x: Any) => x.winners === null),
    J({ resultsFinal: before.resultsFinal, groupsWithWinner: before.groupsWithWinner, winners: before.groups.map((x: Any) => x.winners).slice(0, 3) }));
  ok("4.2 · ⭐ the connected pair's reach: 3 tickets covering 3 of the 1,024 ways to answer the ten mains — in its fields and in the sentence the integrity page prints",
    !!ef && ef.tickets === 3 && ef.combos === 3 && ef.coverage === 3 / 1024 && /3 tickets cover 3 of the 1,024 ways to answer the ten mains/.test(ef.detail),
    J(ef ?? null));
  const answers = before.groups.filter((x: Any) => x.basis === "answers");
  ok("4.3 · ⛔ NO SILENT CAP · all 52 pairs that share a fifteen-answer set are reported — the old report stopped at 50 groups",
    answers.length === PAIRS && before.groups.length === PAIRS + 2 && answers.every((x: Any) => x.accounts.length === 2 && x.combos === 1),
    `${answers.length} answer groups · ${before.groups.length} groups`);
  ok("4.4 · the stranger is in no group", !before.groups.some((x: Any) => x.accounts.some((a: Any) => a.userId === g)));

  const at = await W.closeAndSeal(week, start);
  const sealed = (await W.dal.weekStore.get(week.id))!;
  // The suite's weeks sit weeks ahead, so on the real clock this week is still inside its objection window.
  const inWindow = await clusterReport(sealed);
  ok("4.5 · ⛔ R2-2 · MB-34 · every question sealed but the objection window still open — a correction or an upheld objection can still change the record — so no group claims a winner either way",
    !!sealed.objectionsCloseAt && Date.parse(sealed.objectionsCloseAt) > Date.now() && inWindow.resultsFinal === false
      && inWindow.groupsWithWinner === 0 && inWindow.groups.every((x: Any) => x.winners === null),
    J({ objectionsCloseAt: sealed.objectionsCloseAt, resultsFinal: inWindow.resultsFinal, groupsWithWinner: inWindow.groupsWithWinner }));
  const after = await clusterReport(sealed, at);
  const efAfter = grp(after), hiAfter = pairOf(after, [h, i2]);
  ok("4.6 · ⭐ MB-35 · once the window has closed the connected pair holding the 10/10 ticket reports ONE winner and comes FIRST — ahead of a connected pair covering more of the board — and the report counts it, before the week pays",
    after.resultsFinal === true && after.groupsWithWinner === 1 && efAfter?.winners === 1 && after.groups[0] === efAfter
      && !!hiAfter && hiAfter.winners === 0 && hiAfter.combos > efAfter.combos && /holds 1 winning ticket/.test(efAfter?.detail ?? ""),
    J({ resultsFinal: after.resultsFinal, groupsWithWinner: after.groupsWithWinner, first: after.groups[0]?.detail, ef: efAfter?.detail, hi: hiAfter?.detail }));
  ok("4.7 · CONTROL · a group whose tickets all lose says so, in words, and is not counted",
    after.groups.filter((x: Any) => x.basis === "answers").every((x: Any) => x.winners === 0 && / · no winning ticket$/.test(x.detail)),
    J(after.groups.find((x: Any) => x.basis === "answers")?.detail ?? null));
  ok("4.8 · CONTROL · with no winner yet counted, the wider pair sorts first — so 4.6's order is the winner rule's, not the board's",
    inWindow.groups[0] === pairOf(inWindow, [h, i2]), J(inWindow.groups[0]?.detail ?? null));
}

// ── §5 · R2-3 / R2-9 / R3 · the records the report reads, and what ties two holders together ─────────
console.log("\n§5 · R2-3 / R2-9 / R3 · the week's own window, and a crowded place reported on its own line");
{
  const { week } = await W.openWeek({ weeksAhead: 5 });
  const people = async (n: number, balance = 50_000) => { const out: string[] = []; for (let k = 0; k < n; k++) out.push(await W.user({ balance })); return out; };
  // m1 and m2 hold the same TWO fifteen-answer sets: two shared sets, and the same two accounts behind both.
  const [p, q, r, s, t, u, v, x, y, z, m1, m2] = await people(12);
  const login = (who: string, ip: string, ua: string) =>
    audit({ category: "AUTH", action: "auth.login.test", actorId: who, targetType: "User", targetId: who, ip, userAgent: ua });
  const payIn = async (who: string, msisdn: string, at: string) => {
    await W.db.txn.create({
      id: `txn_mlnint_${who}`, walletId: `wal_${who}`, userId: who, type: "DEPOSIT", status: "CONFIRMED", amount: 5_000, fee: 0, taxWithheld: 0,
      balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: null, msisdn, description: "DEPOSIT", positionId: null, amlReason: null,
      createdAt: at, updatedAt: at, completedAt: at,
    } as never);
  };
  // p and q: tied by the platform's records inside the window; y and z: tied the same way, by records made only before it opens.
  const closeAt = Date.parse(week.closesAt) + 60_000;
  const nowIso = new Date().toISOString(), beforeWindow = new Date(closeAt - 61 * 86_400_000).toISOString();
  await payIn(p, "255700123456", nowIso);
  await payIn(q, "255700123456", nowIso);
  await payIn(y, "255700654321", beforeWindow);
  await payIn(z, "255700654321", beforeWindow);
  // R3 · r, s, t and u share a crowded place; the platform's records also tie t and u together.
  const CROWDED = "198.51.100.150";
  const others = await people(60, 0);
  for (const [k, who] of [r, s, ...others].entries()) login(who, CROWDED, `phone-${k}`);
  for (const who of [t, u]) login(who, CROWDED, "phone-shared");
  // v and x: the platform's records tie them together, away from any crowd.
  for (const who of [v, x]) login(who, "198.51.100.151", "test");
  await auditFlush();
  const holders = [p, q, r, s, t, u, v, x, y, z];
  const buys: Any[] = [];
  for (const [k, who] of holders.entries()) buys.push(await W.buy(who, week.id, [W.slip("NO", k)]));
  for (const who of [m1, m2]) buys.push(await W.buy(who, week.id, [W.slip("YES", 1), W.slip("YES", 2)]));
  await W.svc.closeWeek({ weekId: week.id, now: new Date(closeAt) });
  const closed = (await W.dal.weekStore.get(week.id))!;
  const rep = await clusterReport(closed);
  const recordsOf = (rr: Any): Any[] => rr.groups.filter((g: Any) => g.basis === "records");
  const groupOf = (rr: Any, who: string) => recordsOf(rr).find((g: Any) => g.accounts.some((a: Any) => a.userId === who));
  const members = (who: string) => (groupOf(rep, who)?.accounts ?? []).map((a: Any) => a.userId).sort();
  const idsOf = (line: Any): string[] => (line?.accounts ?? []).map((a: Any) => a.userId).sort();
  const crowdedOf = (rr: Any): Any[] => rr.crowded ?? [];
  ok("5.0 · CONTROL · every purchase landed and the report reads", buys.length === 12 && buys.every((b) => b.ok) && rep.readable && rep.holders === 12,
    J({ failed: buys.filter((b) => !b.ok).length, readable: rep.readable, holders: rep.holders }));
  ok("5.1 · ⭐ R2-9 · two holders the platform's records tie together inside the window are one group", J(members(p)) === J([p, q].sort()), J(members(p)));
  const line = crowdedOf(rep).find((c: Any) => idsOf(c).includes(r));
  ok("5.2 · ⭐ R3 · a crowded place ties no one into a group — and is reported on a line of its own that counts its holders and names the first of them (here all four): never merged, never dropped",
    !groupOf(rep, r) && !groupOf(rep, s) && !!line && line.basis === "crowded" && line.accountCount === 4 && J(idsOf(line)) === J([r, s, t, u].sort()) && line.winners === null
      && crowdedOf(rep).length === 1,
    J({ crowded: crowdedOf(rep).map(idsOf), r: members(r) }));
  ok("5.3 · ⭐ …while two of its holders the platform's records also tie together are one group", J(members(t)) === J([t, u].sort()), J(members(t)));
  ok("5.4 · CONTROL · two holders the platform's records tie together, away from any crowd, are one group", J(members(v)) === J([v, x].sort()), J(members(v)));
  ok("5.5 · ⭐ R2-9 · MB-35's weekly figure: the week's fourteen tickets cover 12 of the 1,024 ways to answer the ten mains",
    rep.combos === 12 && rep.boardCoverage === 12 / 1024 && !rep.coverage.limited, J({ combos: rep.combos, boardCoverage: rep.boardCoverage, coverage: rep.coverage }));
  const closeMs = Date.parse(closed.closedAt ?? "");
  ok("5.6 · ⭐ R2-3 · the report says which records it read: the window that ends at the week's close — never at the build",
    Number.isFinite(closeMs) && rep.window.to === new Date(closeMs).toISOString() && rep.window.from === new Date(closeMs - 60 * 86_400_000).toISOString(), J(rep.window));
  // R2-3 · the same week read as if it had closed an hour ago: every record above came after that close — all but y's
  // and z's, made before it, which that earlier window holds.
  const earlier = new Date(Date.now() - 3_600_000).toISOString();
  const moved = await clusterReport({ ...closed, closedAt: earlier });
  ok("5.7 · ⭐ R2-3 · records made after a week's close tie nobody in its report, nor crowd a place — the window ends where the week closed, whatever the clock says",
    moved.window.to === earlier && J(recordsOf(moved).map(idsOf)) === J([[y, z].sort()]) && crowdedOf(moved).length === 0 && recordsOf(rep).length === 3,
    J({ to: moved.window.to, movedRecords: recordsOf(moved).map(idsOf), movedCrowded: crowdedOf(moved).length, records: recordsOf(rep).length }));
  ok("5.8 · ⛔ R3 · the window binds the records on BOTH sides: what two holders shared only before it opened ties nobody — the same records that tie them in a window holding them (5.7)",
    !groupOf(rep, y) && !groupOf(rep, z) && J(idsOf(groupOf(moved, y))) === J([y, z].sort()), J({ rep: [members(y), members(z)], moved: idsOf(groupOf(moved, y)) }));
  const again = await clusterReport(closed);
  // R4 · `lines` is every line of the report in its one order: three groups the records tie, one answer pair, one place.
  const lines = (rr: Any): Any[] => rr.lines ?? [];
  ok("5.9 · ⭐ R3 · every line keeps its id and its place from one read to the next, and no two lines share an id — so a link to one opens that one",
    lines(rep).length === 5 && J(lines(again).map((g: Any) => g.id)) === J(lines(rep).map((g: Any) => g.id)) && new Set(lines(rep).map((g: Any) => g.id)).size === lines(rep).length
      && lines(rep).every((g: Any) => typeof g.id === "string" && g.id.length >= 12),
    J(lines(rep).map((g: Any) => g.id)));
  const pairLines = rep.groups.filter((g: Any) => g.basis === "answers" && idsOf(g).includes(m1));
  ok("5.10 · ⭐ R3 · two accounts that share TWO fifteen-answer sets are one line, not two — a second line would only repeat the first, under its id",
    pairLines.length === 1 && J(idsOf(pairLines[0])) === J([m1, m2].sort()) && pairLines[0].tickets === 4 && pairLines[0].combos === 2,
    J(pairLines.map((g: Any) => [idsOf(g), g.tickets, g.combos])));
}

// ── §6 · R3 · a large ring hides nowhere ─────────────────────────────────────────────────────────────
console.log("\n§6 · R3 · a ring of 103 accounts, covering every way to answer the ten mains");
{
  const { week } = await W.openWeek({ weeksAhead: 6 });
  const ring: string[] = [];
  for (let k = 0; k < 103; k++) ring.push(await W.user({ balance: 50_000 }));
  for (const who of ring) audit({ category: "AUTH", action: "auth.login.test", actorId: who, targetType: "User", targetId: who, ip: "10.44.0.7", userAgent: "ring-phone" });
  await auditFlush();
  // Ticket c answers the ten mains as the ten bits of c: the ring's 1,024 tickets are every way there is.
  const comboSlip = (c: number) => Array.from({ length: 15 }, (_, j) => (j < 10 ? ((c >> j) & 1 ? "YES" : "NO") : "YES"));
  const buys: Any[] = [];
  for (const [k, who] of ring.entries()) {
    const combos = Array.from({ length: 10 }, (_, i) => 10 * k + i).filter((c) => c < 1024);
    if (combos.length > 0) buys.push(await W.buy(who, week.id, combos.map(comboSlip)));
  }
  await W.svc.closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt) + 60_000) });
  const rep: Any = await clusterReport((await W.dal.weekStore.get(week.id))!);
  ringWeekReport = rep;
  const records: Any[] = rep.groups.filter((g: Any) => g.basis === "records");
  ok("6.1 · CONTROL · the ring bought 1,024 tickets, every one a different way to answer the ten mains",
    buys.length === 103 && buys.every((b) => b.ok) && rep.combos === 1024, J({ buys: buys.length, failed: buys.filter((b) => !b.ok).length, combos: rep.combos }));
  ok("6.2 · ⭐ R3 · the ring is ONE group covering the whole board — one line for all 103 accounts",
    records.length === 1 && records[0].accounts.length === 103 && records[0].combos === 1024 && records[0].coverage === 1,
    J(records.map((g: Any) => [g.accounts.length, g.combos])));
  ok("6.3 · CONTROL · no crowded line stands in for the ring's group",
    (rep.crowded ?? []).length === 0, J((rep.crowded ?? []).length));
}

// ── §7 · R4 · one order for every line; a crowded line carries what its row shows ─────────────────────
console.log(String.fromCharCode(10) + "§7 · R4 · a crowded line holding the winner leads the report, and opens a page at a time");
{
  const integrity: Any = await import("../../src/lib/server/maswali-integrity.ts");
  const { CLUSTER_LINE_PREVIEW, crowdedLineHolders } = integrity;
  const { CONSOLE_PER_PAGE } = await import("../../src/lib/server/maswali-console.ts");
  const { week, start } = await W.openWeek({ weeksAhead: 7 });
  // More same-answer pairs than one console page holds, none of them holding a winner…
  const PAIRS = CONSOLE_PER_PAGE + 2;
  const pairSlip = (i: number) => Array.from({ length: 15 }, (_, j) => (j < 10 ? (((i + 200) >> j) & 1 ? "YES" : "NO") : "YES"));
  const bought: Any[] = [];
  for (let i = 0; i < PAIRS; i++) for (let k = 0; k < 2; k++) bought.push(await W.buy(await W.user({ balance: 50_000 }), week.id, [pairSlip(i)]));
  // …and eight holders on §5's crowded place, nothing else tying them: the first holds the 10/10 ticket.
  const eight: string[] = [];
  for (let k = 0; k < 8; k++) eight.push(await W.user({ balance: 50_000 }));
  for (const [k, who] of eight.entries()) audit({ category: "AUTH", action: "auth.login.test", actorId: who, targetType: "User", targetId: who, ip: "198.51.100.150", userAgent: `r4-phone-${k}` });
  await auditFlush();
  for (const [k, who] of eight.entries()) bought.push(await W.buy(who, week.id, [k === 0 ? W.WIN : W.slip("NO", k)]));
  const at = await W.closeAndSeal(week, start);
  const rep: Any = await clusterReport((await W.dal.weekStore.get(week.id))!, at);
  const line: Any = (rep.crowded ?? [])[0];
  const sorted = [...eight].sort();
  const answers = rep.groups.filter((g: Any) => g.basis === "answers").length, records = rep.groups.filter((g: Any) => g.basis === "records").length;
  ok("7.0 · CONTROL · every purchase landed and the results are final; the report holds the pairs, one crowded line, and no group the records tie",
    bought.length === 2 * PAIRS + 8 && bought.every((b) => b.ok) && rep.resultsFinal === true && rep.readable && answers === PAIRS && records === 0 && (rep.crowded ?? []).length === 1,
    J({ failed: bought.filter((b) => !b.ok).length, final: rep.resultsFinal, answers, records, crowded: (rep.crowded ?? []).length }));
  const oldIndex = [...rep.groups, ...(rep.crowded ?? [])].indexOf(line);
  ok("7.1 · ⭐ R4 · the crowded line holding the 10/10 ticket is the report's FIRST line, on the console's first page — where the groups-then-places order put it past that page",
    !!line && line.winners === 1 && (rep.lines ?? [])[0] === line && oldIndex >= CONSOLE_PER_PAGE,
    J({ first: (rep.lines ?? [])[0]?.detail ?? null, oldIndex }));
  ok("7.2 · ⭐ R4 · the crowded line carries what its row shows: its eight holders counted, the first of them in id order, its eight tickets covering eight ways, its one winning ticket",
    !!line && CLUSTER_LINE_PREVIEW < 8 && line.accountCount === 8 && J(line.accounts.map((a: Any) => a.userId)) === J(sorted.slice(0, CLUSTER_LINE_PREVIEW))
      && line.tickets === 8 && line.combos === 8
      && line.detail === "8 holders share one crowded place, which ties no one together · 8 tickets cover 8 of the 1,024 ways to answer the ten mains · holds 1 winning ticket",
    J(line ? { count: line.accountCount, shown: line.accounts.length, tickets: line.tickets, combos: line.combos, detail: line.detail } : null));
  const read = (page: number, per: number): Promise<Any> =>
    (typeof crowdedLineHolders === "function" ? crowdedLineHolders(week.id, line?.id ?? "", page, per) : Promise.resolve(null));
  const [pg1, pg2, pg3] = [await read(1, 5), await read(2, 5), await read(3, 5)];
  const opened: Any[] = [...(pg1?.accounts ?? []), ...(pg2?.accounts ?? [])];
  ok("7.3 · ⭐ R4 · the line opens a page at a time, in id order, each holder with its tickets: five, then three, then none — the eight in all",
    !!pg1 && !!pg2 && !!pg3 && pg1.total === 8 && pg2.total === 8 && pg1.accounts.length === 5 && pg2.accounts.length === 3 && pg3.accounts.length === 0
      && J(opened.map((a: Any) => a.userId)) === J(sorted) && opened.every((a: Any) => a.tickets === 1),
    J({ first: pg1?.accounts?.length ?? null, second: pg2?.accounts?.length ?? null, total: pg1?.total ?? null }));
  const nobody: Any = typeof crowdedLineHolders === "function" ? await crowdedLineHolders(week.id, rep.groups[0]?.id ?? "none", 1, 5) : null;
  ok("7.4 · CONTROL · an id that names no crowded line of the week (a group's) opens no holder",
    !!nobody && nobody.total === 0 && nobody.accounts.length === 0, J(nobody));
  const { readFileSync } = await import("node:fs");
  const src = readFileSync("src/lib/server/maswali-integrity.ts", "utf8");
  ok("7.5 · R4 · the link read is written with `NOT EXISTS`, never a `NOT IN` subquery (one NULL inside it empties the read, and at scale it is no anti-join)",
    !src.toUpperCase().includes("NOT IN (SELECT") && src.split("NOT EXISTS (SELECT 1 FROM holders").length - 1 >= 2,
    String(src.split("NOT EXISTS (SELECT 1 FROM holders").length - 1));
  // R5 · the id the report states for a crowded line is the one computed here from its holders — on Postgres the SQL's,
  // which never returns the holders it hashes; in memory the twin's.
  const { createHash } = await import("node:crypto");
  const expectedId = createHash("md5").update(`crowded:${sorted.join(",")}`).digest("hex").slice(0, 16);
  ok("7.6 · R5 · the crowded line's id is the md5 of the word crowded and its holders in id order, cut to 16 — as the suite computes it, on this store's own read",
    !!line && line.id === expectedId, J({ id: line?.id ?? null, expectedId }));
}

// ── §8 · R5 · the lead's order: a winner's line first, then the records, the answers, the crowded places ────────────
console.log(String.fromCharCode(10) + "§8 · R5 · a ring stays on the first page, whatever the crowded places hold");
{
  const { CONSOLE_PER_PAGE } = await import("../../src/lib/server/maswali-console.ts");
  // R6 · MEDIUM-1 · a week whose close lies within the records window of today's Monday: weeks open in calendar order
  // on their own line (MR-3), so the public line's next free week (8 ahead) closes too late for what a run writes on a
  // Monday morning — this section takes the drive line, three weeks ahead (8.0a holds the arithmetic to account).
  // ⚠️ R10c · this section assumes any account may buy a drive-week ticket at ACTIVE — still Ali's to rule. If he
  // restricts it, 8.0 fails loudly (its purchases are refused), never quietly.
  const { week, start } = await W.openWeek({ weeksAhead: 3, visibility: "DRIVE" });
  const PLACES = CONSOLE_PER_PAGE + 5;
  const signIn = (who: string, ip: string, ua: string) =>
    audit({ category: "AUTH", action: "auth.login.test", actorId: who, targetType: "User", targetId: who, ip, userAgent: ua });
  const losing = (i: number) => Array.from({ length: 15 }, (_, j) => (j < 10 ? (((i + 300) >> j) & 1 ? "YES" : "NO") : "YES"));
  let n = 0;
  const firstRecord = Date.now();
  // A ring of three the platform's records tie together; one of them holds the winning answers.
  const ring: string[] = [];
  for (let k = 0; k < 3; k++) ring.push(await W.user({ balance: 50_000 }));
  for (const [k, who] of ring.entries()) signIn(who, "203.0.113.200", `r5-ring-${k}`);
  // PLACES crowded places, four holders each: two holding the winning answers, two a losing set of their own.
  const crowd: string[] = [];
  for (let k = 0; k < 30; k++) crowd.push(await W.user({ balance: 0 }));
  const fours: string[][] = [];
  for (let p = 0; p < PLACES; p++) {
    const four: string[] = [];
    for (let k = 0; k < 4; k++) four.push(await W.user({ balance: 50_000 }));
    for (const [k, who] of [...four, ...crowd].entries()) signIn(who, `203.0.113.${100 + p}`, `r5-p${p}-${k}`);
    fours.push(four);
  }
  const lastRecord = Date.now();
  await auditFlush();
  const bought: Any[] = [await W.buy(ring[0], week.id, [W.WIN]), await W.buy(ring[1], week.id, [losing(n++)]), await W.buy(ring[2], week.id, [losing(n++)])];
  for (const four of fours) for (const [k, who] of four.entries()) bought.push(await W.buy(who, week.id, [k < 2 ? W.WIN : losing(n++)]));
  await W.svc.closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt) + 60_000) });
  const early: Any = await clusterReport((await W.dal.weekStore.get(week.id))!);
  // Then the fifteen sealed YES (the world's own seal, at its own instant), and the report once the window has closed.
  for (let slot = 1; slot <= 15; slot++) {
    const s = await W.svc.sealQuestion({ weekId: week.id, slot, outcome: "YES", evidence: `Official result for event ${slot}`, officerId: SEALER, now: new Date(start + 9 * 86_400_000) });
    if (!s.ok) throw new Error(`§8: seal ${slot} refused: ${s.error}`);
  }
  const sealed = (await W.dal.weekStore.get(week.id))!;
  const final: Any = await clusterReport(sealed, new Date(Date.parse(sealed.objectionsCloseAt ?? "") + 60_000));
  // The order of rounds 3 and 4 (winning tickets first, then the reach): what each case below was a failure of.
  const winnersThenReach = (x: Any, y: Any) =>
    (y.winners ?? 0) - (x.winners ?? 0) || y.combos - x.combos || y.accountCount - x.accountCount || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
  const ringOf = (rr: Any): Any => (rr.lines ?? []).find((g: Any) => g.basis === "records");
  const oldIndex = (rr: Any) => [...(rr.lines ?? [])].sort(winnersThenReach).indexOf(ringOf(rr));
  ok("8.0 · CONTROL · every purchase landed; the report holds the ring, one line of the shared winning answers, and every crowded place",
    bought.length === 3 + 4 * PLACES && bought.every((b) => b.ok) && early.readable && early.groups.filter((g: Any) => g.basis === "records").length === 1
      && early.groups.filter((g: Any) => g.basis === "answers").length === 1 && (early.crowded ?? []).length === PLACES && J(ringOf(early)?.accounts.map((a: Any) => a.userId)) === J([...ring].sort()),
    J({ failed: bought.filter((b) => !b.ok).length, lines: (early.lines ?? []).length, crowded: (early.crowded ?? []).length }));
  // R6 · a fixture outside the records window says so here, by name — never as a ring that went missing.
  ok("8.0a · CONTROL · R6 · the report's records window holds every record this fixture writes: it opens before the first and ends after the last",
    Date.parse(early.window?.from ?? "") <= firstRecord && lastRecord <= Date.parse(early.window?.to ?? ""),
    J({ window: early.window ?? null, firstRecord: new Date(firstRecord).toISOString(), lastRecord: new Date(lastRecord).toISOString() }));
  ok("8.1 · ⭐ R5 · no winner counted yet: the three-account ring is the FIRST line — where ranking by reach put every crowded place above it, past the first page",
    early.resultsFinal === false && (early.lines ?? [])[0] === ringOf(early) && oldIndex(early) >= CONSOLE_PER_PAGE,
    J({ first: (early.lines ?? [])[0]?.basis ?? null, oldIndex: oldIndex(early) }));
  ok("8.2 · ⭐ R5 · the favourites won — two winning tickets on every crowded place, one in the ring — and the ring is still FIRST, the shared winning answers next, the places after: ranking by winning tickets put the ring past the first page",
    final.resultsFinal === true && (final.lines ?? [])[0] === ringOf(final) && ringOf(final)?.winners === 1 && (final.lines ?? [])[1]?.basis === "answers"
      && (final.lines ?? []).slice(2).every((g: Any) => g.basis === "crowded" && g.winners === 2) && oldIndex(final) >= CONSOLE_PER_PAGE,
    J({ first: (final.lines ?? [])[0]?.detail ?? null, oldIndex: oldIndex(final) }));
  const placeIds = (final.lines ?? []).filter((g: Any) => g.basis === "crowded").map((g: Any) => g.id);
  ok("8.3 · CONTROL · inside one basis the order is winning tickets, reach and accounts, then the id: the crowded places, equal on all three, stand in id order",
    placeIds.length === PLACES && J(placeIds) === J([...placeIds].sort()), J(placeIds.slice(0, 3)));

  // R6 · MEDIUM-2 · the integrity page's order over two weeks (the lead's ruling): a paid week whose crowded places hold
  // winning tickets — this section's own sealed drive week, its report MARKED settled here (§8 never settles it) — and
  // a week still to pay holding a ring (§6's), handed over paid week first, so no order of the weeks is assumed.
  const { clusterRows, clusterLineOrder }: Any = await import("../../src/lib/server/maswali-integrity.ts");
  const rowsOf = (reports: Any[]): Any[] => (typeof clusterRows === "function" ? clusterRows(reports) : []);
  const paid: Any = { ...final, weekState: "SETTLED" }, pending: Any = ringWeekReport;
  const rows = rowsOf([paid, pending]);
  const ringRow = rows.findIndex((r: Any) => r.report === pending && r.line.basis === "records");
  // R5's page order — one comparator across both weeks — for the control half: there the paid week's winners lead.
  const oneOrder = [...(final.lines ?? []), ...(pending?.lines ?? [])].sort((a: Any, b: Any) => clusterLineOrder(a, b));
  const ringByOneOrder = oneOrder.indexOf((pending?.lines ?? []).find((g: Any) => g.basis === "records"));
  const after = rows.slice((pending?.lines ?? []).length);
  ok("8.4 · ⭐ R6 · the week still to pay comes first: its ring is the page's FIRST row, ahead of a paid week's twenty-seven winning lines, which follow in the report's one order — where one order across both weeks put the ring past the first page",
    !!pending && pending.weekState !== "SETTLED" && ringRow === 0 && ringByOneOrder >= CONSOLE_PER_PAGE
      && after.length === (final.lines ?? []).length && after.every((r: Any) => r.report === paid) && J(after.map((r: Any) => r.line.id)) === J((final.lines ?? []).map((g: Any) => g.id)),
    J({ ringRow, ringByOneOrder, rows: rows.length }));
  const flipped = rowsOf([pending, paid]), withHole = rowsOf([null, paid]);
  ok("8.5 · CONTROL · R6 · the order is the weeks' standing, not the order they are handed over in; and a report that could not be built adds no row",
    rows.length > 0 && J(flipped.map((r: Any) => `${r.report.weekId}.${r.line.id}`)) === J(rows.map((r: Any) => `${r.report.weekId}.${r.line.id}`))
      && withHole.length === (final.lines ?? []).length,
    J({ flipped: flipped.length, withHole: withHole.length }));

  // R7/R8 · the lead's rulings, three tiers: the weeks not yet settled, then the settled weeks still holding a share, then
  // the decided ones. This section's sealed drive week again, its report MARKED settled — once with a share held, once
  // decided (the very same lines) — and beside them §6's pending ring and §4's week before its seal (fifty-four lines).
  const pendingFour: Any = pendingWeekReport;
  const heldWeek: Any = { ...final, weekState: "SETTLED", undecidedShares: 1 }, releasedWeek: Any = { ...final, weekState: "SETTLED", undecidedShares: 0 };
  const ringIn = (rr: Any[], report: Any) => rr.findIndex((r: Any) => r.report === report && r.line.basis === "records");
  const heldFirst = rowsOf([releasedWeek, heldWeek]), besidePending = rowsOf([heldWeek, pending]), releasedRows = rowsOf([pendingFour, releasedWeek]);
  ok("8.6 · CONTROL · R7/R8 · a week still holding a share leads a decided week's lines (it holds on round 7 too — 8.6b is the case round 7 fails): its ring is the FIRST row, though the decided week — the very same lines — is handed over first",
    ringIn(heldFirst, heldWeek) === 0 && ringIn(heldFirst, releasedWeek) === (final.lines ?? []).length,
    J({ held: ringIn(heldFirst, heldWeek), decided: ringIn(heldFirst, releasedWeek) }));
  ok("8.6b · ⭐ R8 · …and a week not yet settled leads them both: §6's pending ring stays at row 0 beside the held week, whose winning lines follow it (round 6's first-page guarantee)",
    !!pending && ringIn(besidePending, pending) === 0 && ringIn(besidePending, heldWeek) === (pending.lines ?? []).length,
    J({ pending: ringIn(besidePending, pending), held: ringIn(besidePending, heldWeek) }));
  ok("8.7 · CONTROL · R7 · …and once every share of that week is released it is decided, and its lines follow every pending line — its ring past the first page",
    !!pendingFour && ringIn(releasedRows, releasedWeek) === (pendingFour.lines ?? []).length && ringIn(releasedRows, releasedWeek) >= CONSOLE_PER_PAGE,
    J({ ring: ringIn(releasedRows, releasedWeek), pending: (pendingFour?.lines ?? []).length }));
}

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
