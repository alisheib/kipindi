/**
 * rg-limit-change — E-408: a deposit limit change that makes play SAFER applies now; one that makes it
 * LOOSER waits 24 hours; a save that changes nothing changes nothing.
 *
 * 🔴 WHAT WAS WRONG (found checking RG policy §2 against the code, 2026-09-14). The policy promised
 * "Increases to any of them are deferred 24 hours". `setLimits` tested `newVal !== null && (oldVal
 * === null || newVal > oldVal)`, so:
 *   · CLEARING the field (value → no limit) was not an increase and applied INSTANTLY — the 24-hour
 *     wait could be skipped with one save;
 *   · SETTING a first limit was an increase, so a player reining themselves in waited a day for it;
 *   · re-saving the current value (the form sends every field back) silently cancelled a pending increase.
 * Drives the real `setLimits` / `getRgSettings` on the in-memory store, and reads the gate that
 * enforces the limit (`checkDepositLimit`), not just the stored row.
 *   npx tsx scripts/rg-limit-change.test.mts
 */
delete process.env.DATABASE_URL;
const { setLimits, getRgSettings, checkDepositLimit, checkSessionTimeLimit, LIMIT_INCREASE_DEFERRAL_SEC } = await import("../src/lib/server/responsible-gambling.ts");
const { db } = await import("../src/lib/server/store.ts");

let pass = 0;
const fails: string[] = [];
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); } else { fails.push(label); console.log(`FAIL ${label} ${extra}`); }
};
const DAY = LIMIT_INCREASE_DEFERRAL_SEC * 1000;
/** Move a pending change's effective time into the past, as 24 hours passing would. */
async function elapse(userId: string) {
  const r = await getRgSettings(userId);
  const past = new Date(Date.now() - 1000).toISOString();
  await db.responsible.upsert({
    ...r,
    pendingIncreaseEffectiveAt: r.pendingIncreaseEffectiveAt ? past : null,
    pendingWeeklyIncreaseEffectiveAt: r.pendingWeeklyIncreaseEffectiveAt ? past : null,
    pendingMonthlyIncreaseEffectiveAt: r.pendingMonthlyIncreaseEffectiveAt ? past : null,
    pendingLossLimitEffectiveAt: r.pendingLossLimitEffectiveAt ? past : null,
    pendingSessionLimitEffectiveAt: r.pendingSessionLimitEffectiveAt ? past : null,
  });
}

// ① A FIRST limit is a tightening: it applies now, and the gate enforces it now.
{
  const u = "rg_first";
  await setLimits(u, { dailyDepositLimit: 50_000 });
  const r = await getRgSettings(u);
  ok("① setting a first daily limit applies immediately", r.dailyDepositLimit === 50_000, JSON.stringify({ d: r.dailyDepositLimit, p: r.pendingIncreaseTo }));
  ok("① and nothing is left pending", r.pendingIncreaseEffectiveAt === null);
  const g = await checkDepositLimit(u, 60_000);
  ok("① the deposit gate refuses 60,000 against it at once", g.allowed === false);
}

// ② REMOVING a limit is the loosest change there is: it waits 24 hours, and the gate keeps enforcing.
{
  const u = "rg_remove";
  await setLimits(u, { weeklyDepositLimit: 100_000 });
  await setLimits(u, { weeklyDepositLimit: null });
  const r = await getRgSettings(u);
  ok("② clearing a weekly limit does NOT remove it immediately", r.weeklyDepositLimit === 100_000, `limit=${r.weeklyDepositLimit}`);
  ok("② the removal is pending, 24 hours out", r.pendingWeeklyIncreaseTo === null && !!r.pendingWeeklyIncreaseEffectiveAt
    && Math.abs(Date.parse(r.pendingWeeklyIncreaseEffectiveAt!) - (Date.now() + DAY)) < 60_000, JSON.stringify(r));
  ok("② the gate still refuses above the old limit meanwhile", (await checkDepositLimit(u, 150_000)).allowed === false);
  await elapse(u);
  const r2 = await getRgSettings(u);
  ok("② after 24 hours the limit is gone (and not replaced by a zero limit)", r2.weeklyDepositLimit === null && r2.pendingWeeklyIncreaseEffectiveAt === null, JSON.stringify(r2));
  ok("② and the gate lets 150,000 through", (await checkDepositLimit(u, 150_000)).allowed === true);
}

// ③ RAISING waits 24 hours (unchanged rule), and re-saving the same value neither cancels nor restarts it.
{
  const u = "rg_raise";
  await setLimits(u, { monthlyDepositLimit: 200_000 });
  await setLimits(u, { monthlyDepositLimit: 500_000 });
  const r = await getRgSettings(u);
  ok("③ raising a monthly limit is deferred", r.monthlyDepositLimit === 200_000 && r.pendingMonthlyIncreaseTo === 500_000 && !!r.pendingMonthlyIncreaseEffectiveAt);
  const at = r.pendingMonthlyIncreaseEffectiveAt;
  // The form sends every field back with the CURRENT limit, e.g. when only the reality check changes.
  await setLimits(u, { monthlyDepositLimit: 200_000, realityCheckIntervalMin: 45 });
  const r2 = await getRgSettings(u);
  ok("③ saving the form unchanged keeps the pending increase (it used to cancel it silently)", r2.pendingMonthlyIncreaseTo === 500_000 && r2.pendingMonthlyIncreaseEffectiveAt === at, JSON.stringify(r2));
  await setLimits(u, { monthlyDepositLimit: 500_000 });
  ok("③ asking again for the same increase does not restart its clock", (await getRgSettings(u)).pendingMonthlyIncreaseEffectiveAt === at);
  await setLimits(u, { monthlyDepositLimit: 150_000 });
  const r3 = await getRgSettings(u);
  ok("③ lowering below the current limit applies now and supersedes the pending increase", r3.monthlyDepositLimit === 150_000 && r3.pendingMonthlyIncreaseEffectiveAt === null, JSON.stringify(r3));
}

// ④ LOWERING an existing limit applies now (unchanged rule).
{
  const u = "rg_lower";
  await setLimits(u, { dailyDepositLimit: 80_000 });
  await setLimits(u, { dailyDepositLimit: 30_000 });
  const r = await getRgSettings(u);
  ok("④ lowering an existing daily limit applies immediately", r.dailyDepositLimit === 30_000 && r.pendingIncreaseEffectiveAt === null);
}

// ⑤ E-408 remainder · the DAILY LOSS limit and the SESSION TIME limit follow the same rule (they loosened at once).
{
  const u = "rg_loss";
  await setLimits(u, { dailyLossLimit: 20_000 });
  ok("⑤ a first loss limit applies now", (await getRgSettings(u)).dailyLossLimit === 20_000);
  await setLimits(u, { dailyLossLimit: null });
  const r = await getRgSettings(u);
  ok("⑤ removing the loss limit waits 24 hours", r.dailyLossLimit === 20_000 && r.pendingLossLimitTo === null && !!r.pendingLossLimitEffectiveAt, JSON.stringify(r));
  await setLimits(u, { dailyLossLimit: 50_000 });
  ok("⑤ raising the loss limit waits too", (await getRgSettings(u)).dailyLossLimit === 20_000 && (await getRgSettings(u)).pendingLossLimitTo === 50_000);
  await elapse(u);
  ok("⑤ after 24 hours the raise applies", (await getRgSettings(u)).dailyLossLimit === 50_000);
}
{
  const u = "rg_session";
  await setLimits(u, { sessionTimeLimitMin: 60 });
  ok("⑤ a first session limit applies now", (await getRgSettings(u)).sessionTimeLimitMin === 60);
  await setLimits(u, { sessionTimeLimitMin: 240 });
  const r = await getRgSettings(u);
  ok("⑤ raising the session limit waits 24 hours", r.sessionTimeLimitMin === 60 && r.pendingSessionLimitTo === 240 && !!r.pendingSessionLimitEffectiveAt);
  await setLimits(u, { sessionTimeLimitMin: 30 });
  ok("⑤ lowering it applies now and supersedes the pending raise", (await getRgSettings(u)).sessionTimeLimitMin === 30 && !(await getRgSettings(u)).pendingSessionLimitEffectiveAt);
}

// ⑥ E-408 remainder · SIGNING OUT AND IN DOES NOT RESTART THE SESSION LIMIT. The cookie's clock is restamped by a new
// sign-in; the per-player clock is not, while the last attempt is inside the play-session gap.
{
  const u = "rg_clock";
  const MIN = 60_000;
  const t0 = Date.now();
  await setLimits(u, { sessionTimeLimitMin: 30 });
  const first = await checkSessionTimeLimit(u, t0 - 35 * MIN, t0);         // 35 minutes into a sitting
  ok("⑥ 35 minutes into a 30-minute limit is refused", first?.exceeded === true, JSON.stringify(first));
  const relog = await checkSessionTimeLimit(u, t0 + 1 * MIN, t0 + 2 * MIN); // signed out and in: the cookie says "1 minute ago"
  ok("⑥ …and a fresh sign-in a minute later is STILL refused (the clock held per player)", relog?.exceeded === true && (relog?.playedMin ?? 0) >= 36, JSON.stringify(relog));
  const back = await checkSessionTimeLimit(u, t0 + 40 * MIN, t0 + 41 * MIN); // 39 minutes after the last attempt: a real break
  ok("⑥ after a break longer than the play-session gap, a new sitting starts", back?.exceeded === false && (back?.playedMin ?? 99) <= 1, JSON.stringify(back));
  ok("⑥ a player with no session limit is not measured (and no clock is written)", (await checkSessionTimeLimit("rg_nolimit", t0 - 500 * MIN, t0)) === null && !(await db.responsible.get("rg_nolimit"))?.playStartedAt);
}

console.log(`\n${fails.length === 0 ? "ALL PASS" : "FAILED"} — ${pass} passed, ${fails.length} failed`);
if (fails.length) process.exit(1);
