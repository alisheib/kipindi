/**
 * test:deposit-ceiling — the shortfall plan's two headroom helpers ARE the real gates (the Vodacom plan S3, §3.1).
 *
 *   npm run test:deposit-ceiling     (in predeploy)
 *   npm run red:deposit-ceiling      (--prove-red: wrong helpers are planted IN MEMORY and must be caught)
 *
 * ⭐ PROVEN BY DRIVING THE REAL GATES, NOT BY RE-READING THEM. On the in-memory store, for each fixture:
 *   · `depositCeilingFor` (fed `getLimitUsage` and the SoF row) names a ceiling C. The REAL `deposit()` must refuse
 *     C + 1 — for the reason the helper says binds (`deposit_limit`, `sof_required`, or the schema's cap) — and must
 *     then ACCEPT C. Fixtures: no limits (the TZS 2,000,000 cap), the daily, weekly and monthly windows each binding
 *     (with CONFIRMED, PROCESSING, FAILED and out-of-window deposits mixed in), the source-of-funds single threshold,
 *     its rolling 30-day threshold, and an accepted declaration lifting both.
 *   · `lossHeadroomFor` (fed `getLimitUsage().lossToday`) names a headroom H. The REAL `checkLossLimit` must allow a
 *     stake of H and refuse H + 1 — with losses, payouts, refunds and an out-of-window stake mixed in; a player in
 *     profit has the whole limit; no limit is null and allows anything.
 * The SoF thresholds are read from `wallet-service.ts`, where `deposit()` reads them.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written (the store is in memory).
 */
import { db } from "../src/lib/server/store.ts";
import { deposit, SOF_ROLLING_30D_TZS, SOF_SINGLE_TXN_TZS } from "../src/lib/server/wallet-service.ts";
import { checkLossLimit, getLimitUsage, getRgSettings } from "../src/lib/server/responsible-gambling.ts";
import * as SF from "../src/lib/journey/shortfall.ts";

const PROVE_RED = process.argv.includes("--prove-red");
type Impl = { ceiling: typeof SF.depositCeilingFor; loss: typeof SF.lossHeadroomFor };
const REAL: Impl = { ceiling: SF.depositCeilingFor, loss: SF.lossHeadroomFor };

const HOUR = 60 * 60 * 1000, DAY = 24 * HOUR;
const iso = (t: number) => new Date(t).toISOString();
let seq = 0;

async function mkUser(id: string) {
  const now = iso(Date.now());
  await db.user.create({
    id, phoneE164: `+25579${String(++seq).padStart(7, "0")}`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: "Ceiling Player", dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: `${id}@t.tz`, emailVerifiedAt: now, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as never);
}
async function setLimits(id: string, l: Partial<{ dailyDepositLimit: number; weeklyDepositLimit: number; monthlyDepositLimit: number; dailyLossLimit: number }>) {
  const cur = await getRgSettings(id);
  await db.responsible.upsert({ ...cur, ...l } as never);
}
async function txn(id: string, type: string, status: string, amount: number, agoMs: number) {
  await db.txn.create({
    id: `txn_${id}_${++seq}`, walletId: `wal_${id}`, userId: id, type, status, amount, fee: 0, taxWithheld: 0,
    provider: "MPESA", providerRef: null, createdAt: iso(Date.now() - agoMs), updatedAt: iso(Date.now() - agoMs),
  } as never);
}
async function sofAccepted(id: string) {
  await db.sourceOfFunds.upsert({
    userId: id, declaredSource: "salary", declaredOccupation: "Engineer", declaredEmployer: null, declaredAnnualIncomeBand: "50m-200m",
    declaredOther: null, reviewStatus: "ACCEPTED", reviewerId: "usr_officer", reviewedAt: iso(Date.now()), submittedAt: iso(Date.now()),
  });
}

type Fixture = { name: string; setup: (id: string) => Promise<void>; want: "deposit_max" | "deposit_limit" | "sof_required"; ceiling?: number };
const FIXTURES: Fixture[] = [
  { name: "no limits and an accepted declaration: the schema's TZS 2,000,000 cap", want: "deposit_max", ceiling: 2_000_000, setup: async (id) => { await sofAccepted(id); } },
  { name: "the daily window (CONFIRMED + PROCESSING count, FAILED and 2-day-old deposits do not)", want: "deposit_limit", ceiling: 15_000,
    setup: async (id) => {
      await setLimits(id, { dailyDepositLimit: 50_000 });
      await txn(id, "DEPOSIT", "CONFIRMED", 30_000, 2 * HOUR);
      await txn(id, "DEPOSIT", "PROCESSING", 5_000, HOUR);
      await txn(id, "DEPOSIT", "FAILED", 10_000, HOUR);
      await txn(id, "DEPOSIT", "CONFIRMED", 20_000, 2 * DAY);
    } },
  { name: "the weekly window", want: "deposit_limit", ceiling: 10_000,
    setup: async (id) => {
      await setLimits(id, { weeklyDepositLimit: 100_000, dailyDepositLimit: 500_000 });
      await txn(id, "DEPOSIT", "CONFIRMED", 40_000, 3 * DAY);
      await txn(id, "DEPOSIT", "CONFIRMED", 50_000, 5 * DAY);
      await txn(id, "DEPOSIT", "CONFIRMED", 70_000, 9 * DAY);
    } },
  { name: "the monthly window", want: "deposit_limit", ceiling: 50_000,
    setup: async (id) => {
      await setLimits(id, { monthlyDepositLimit: 300_000 });
      await txn(id, "DEPOSIT", "CONFIRMED", 250_000, 20 * DAY);
      await txn(id, "DEPOSIT", "CONFIRMED", 400_000, 31 * DAY);
    } },
  { name: "source of funds, the single-deposit threshold (no declaration)", want: "sof_required", ceiling: SOF_SINGLE_TXN_TZS - 1, setup: async () => {} },
  { name: "source of funds, the rolling 30-day threshold (no declaration)", want: "sof_required", ceiling: SOF_ROLLING_30D_TZS - 1 - 4_600_000,
    setup: async (id) => {
      for (const [amt, ago] of [[900_000, 2], [900_000, 6], [900_000, 11], [900_000, 17], [1_000_000, 24]] as const) await txn(id, "DEPOSIT", "CONFIRMED", amt, ago * DAY);
    } },
  { name: "an ACCEPTED declaration lifts both thresholds (the cap binds again)", want: "deposit_max", ceiling: 2_000_000,
    setup: async (id) => {
      await sofAccepted(id);
      for (const [amt, ago] of [[900_000, 2], [900_000, 6], [900_000, 11], [900_000, 17], [1_000_000, 24]] as const) await txn(id, "DEPOSIT", "CONFIRMED", amt, ago * DAY);
    } },
];

type LossFixture = { name: string; limit: number | null; seed: Array<[string, number, number]>; want: number | null };
const LOSS: LossFixture[] = [
  { name: "losses, a payout, a refund and a 25-hour-old stake", limit: 20_000, want: 10_000,
    seed: [["BET_PLACED", -15_000, 2 * HOUR], ["BET_PAYOUT", 4_000, HOUR], ["BET_REFUND", 1_000, HOUR], ["BET_PLACED", -3_000, 25 * HOUR]] },
  { name: "a player in profit has the whole limit", limit: 20_000, want: 20_000, seed: [["BET_PLACED", -5_000, 3 * HOUR], ["BET_PAYOUT", 10_000, HOUR]] },
  { name: "no loss limit is null", limit: null, want: null, seed: [["BET_PLACED", -50_000, HOUR]] },
];

async function run(impl: Impl, log: (l: string) => void, tag: string): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  log("\n(1) depositCeilingFor — the real deposit() refuses C + 1 for the named reason, and accepts C");
  for (const [k, f] of FIXTURES.entries()) {
    const id = `usr_ceil_${tag}_${k}`;
    await mkUser(id);
    await f.setup(id);
    const rg = await getRgSettings(id);
    const usage = await getLimitUsage(id);
    const sof = await db.sourceOfFunds.get(id);
    const c = impl.ceiling({
      limits: { daily: rg.dailyDepositLimit, weekly: rg.weeklyDepositLimit, monthly: rg.monthlyDepositLimit },
      usage: { day: usage.depositDay, week: usage.depositWeek, month: usage.depositMonth },
      sof: { accepted: sof?.reviewStatus === "ACCEPTED", singleTxn: SOF_SINGLE_TXN_TZS, rolling30d: SOF_ROLLING_30D_TZS },
    });
    const over = await deposit(id, { provider: "MPESA", amount: c.max + 1, msisdn: "712345678" });
    const reason = over.ok ? "accepted" : ((over as { reason?: string }).reason ?? (over as { code?: string }).code ?? "refused");
    const reasonOk = f.want === "deposit_max" ? !over.ok && (over as { code?: string }).code === "INVALID" : !over.ok && reason === f.want;
    const at = await deposit(id, { provider: "MPESA", amount: c.max, msisdn: "712345678" });
    ok(`1.${k} · ${f.name}: ceiling ${c.max.toLocaleString("en-US")} (${c.binding}) — C + 1 refused as ${f.want}, C accepted`,
      c.binding === f.want && (f.ceiling === undefined || c.max === f.ceiling) && reasonOk && at.ok === true,
      JSON.stringify({ ceiling: c, over: reason, at: at.ok ? "accepted" : (at as { reason?: string; error?: string }).reason ?? (at as { error?: string }).error }));
  }
  log("\n(2) lossHeadroomFor — the real checkLossLimit allows H and refuses H + 1");
  for (const [k, f] of LOSS.entries()) {
    const id = `usr_loss_${tag}_${k}`;
    await mkUser(id);
    if (f.limit !== null) await setLimits(id, { dailyLossLimit: f.limit });
    for (const [type, amount, ago] of f.seed) await txn(id, type, "CONFIRMED", amount, ago);
    const usage = await getLimitUsage(id);
    const rg = await getRgSettings(id);
    const h = impl.loss({ dailyLossLimit: rg.dailyLossLimit, lossToday: usage.lossToday });
    if (f.want === null) {
      const any = await checkLossLimit(id, 5_000_000);
      ok(`2.${k} · ${f.name}: headroom null, and the real gate allows TZS 5,000,000`, h === null && any.allowed, JSON.stringify({ h, any }));
    } else {
      const atH = h === null ? null : await checkLossLimit(id, h);
      const overH = h === null ? null : await checkLossLimit(id, h + 1);
      ok(`2.${k} · ${f.name}: headroom ${h} — the real gate allows it and refuses one shilling more`,
        h === f.want && atH?.allowed === true && overH?.allowed === false, JSON.stringify({ h, want: f.want, atH, overH }));
    }
  }
  return failed;
}

if (!PROVE_RED) {
  console.log("deposit-ceiling — the Vodacom plan S3 helpers against the REAL gates (in-memory store)");
  const failed = await run(REAL, (l) => console.log(l), "real");
  console.log(`\nDEPOSIT CEILING — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  const base = SF.depositCeilingFor;
  type Plant = { name: string; expect: RegExp; impl: Impl };
  const plants: Plant[] = [
    { name: "PROCESSING deposits left out of the daily window (the ceiling reads too high)", expect: /^1\.1 /,
      impl: { ...REAL, ceiling: (i) => base({ ...i, usage: { ...i.usage, day: i.usage.day - 5_000 } }) } },
    { name: "the weekly limit ignored", expect: /^1\.2 /, impl: { ...REAL, ceiling: (i) => base({ ...i, limits: { ...i.limits, weekly: null } }) } },
    { name: "the monthly limit ignored", expect: /^1\.3 /, impl: { ...REAL, ceiling: (i) => base({ ...i, limits: { ...i.limits, monthly: null } }) } },
    { name: "the SoF single threshold read as \"more than\" (off by one)", expect: /^1\.4 /,
      impl: { ...REAL, ceiling: (i) => base({ ...i, sof: { ...i.sof, singleTxn: i.sof.singleTxn + 1 } }) } },
    { name: "the SoF rolling threshold ignores the 30-day deposits", expect: /^1\.5 /,
      impl: { ...REAL, ceiling: (i) => base({ ...i, usage: { ...i.usage, month: 0 } }) } },
    { name: "an accepted declaration still capped at the SoF thresholds", expect: /^1\.6 /,
      impl: { ...REAL, ceiling: (i) => base({ ...i, sof: { ...i.sof, accepted: false } }) } },
    { name: "the ceiling one shilling too cautious (C is not the real edge)", expect: /^1\.0 /,
      impl: { ...REAL, ceiling: (i) => { const r = base(i); return { ...r, max: r.max - 1 }; } } },
    { name: "the loss headroom counts a stake equal to it as over (off by one)", expect: /^2\.0 /,
      impl: { ...REAL, loss: (i) => (i.dailyLossLimit === null ? null : i.dailyLossLimit - i.lossToday - 1) } },
    { name: "the loss headroom ignores today's losses", expect: /^2\.0 /,
      impl: { ...REAL, loss: (i) => i.dailyLossLimit } },
  ];
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = await run(REAL, quiet, "red0");
  ok("the REAL helpers pass every check", clean.length === 0, clean.join(" | "));
  for (const [n, p] of plants.entries()) {
    const failures = await run(p.impl, quiet, `red${n + 1}`);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
