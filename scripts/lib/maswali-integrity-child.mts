/**
 * test:maswali-integrity — COMPLIANCE'S INTEGRITY READS, ON BOTH STORES (MASWALI-BUILD S4 part 3).
 *
 *   npx tsx scripts/maswali-integrity.test.mts     (npm run test:maswali-integrity)
 *
 *   §1 the cluster report at close: two accounts the platform's records connect are one group; two accounts holding the
 *      same fifteen answers are another; a stranger is in neither — and the report reads on Postgres, whose half runs the
 *      real aggregate over the audit and transaction tables.
 *   §2 pick shifts while a week sells: a question whose answers swing among the latest tickets is reported, a steady one
 *      is not.
 */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-integrity-session-secret-0123456789abcdef";

const { loadMaswaliWorld } = await import("./maswali-money-world.mts");
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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

await W.setup({ guarantee: 20_000_000 });

// ── §1 · the cluster report ─────────────────────────────────────────────────
console.log("\n§1 · the cluster report at close");
{
  const { week } = await W.openWeek({ weeksAhead: 2 });
  const [a, b, c, d] = [await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 }), await W.user({ balance: 50_000 })];
  // a and b sign in from one place; a and c hold the same fifteen answers; d is a stranger to all three.
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

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
