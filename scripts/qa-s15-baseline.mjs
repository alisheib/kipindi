/**
 * Production S15 baseline, SELECT-only and aggregate-only.
 *
 * The 14 full EAT days are 2026-10-02..2026-10-15. Before 2026-10-16
 * 00:00 EAT, the output is explicitly IN_PROGRESS; it can never say complete.
 * Metric definitions and cell statuses come from S13's shared pure module.
 *
 * npm run qa:s15-baseline [-- --out docs/qa/<redacted-report>.json]
 * npm run test:s15-baseline-select
 *
 * PROD_DATABASE_PUBLIC_URL is read from the environment or .env.qa.local;
 * railway run may supply DATABASE_PUBLIC_URL/DATABASE_URL. Neither URL, account
 * identity, campaign tag, market, position nor payment reference is emitted.
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { connect, publicUrl } from "./live/db.cjs";
import {
  FIRST_FULL_COUNTED_DAY, FIRST_BET_HORIZON_MS, DEPOSIT_FOLLOW_UP_MS,
  MEASURES, S13_RULINGS, cellFor, measureWindows,
} from "../src/lib/journey/measures.ts";
import { STAFF_ROLES } from "../src/lib/server/roles.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEADLINE_MS = Date.parse("2026-10-15T21:00:00.000Z"); // 2026-10-16 00:00 EAT
const LAST_DAY = "2026-10-15";
const NOT_A_READ = /\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|copy|call|do|lock|vacuum|analyze|reindex|cluster|refresh|comment|set|reset|begin|commit|rollback|savepoint|prepare|execute|listen|notify|discard|into)\b/i;

function assertSelect(sql) {
  const bare = sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, "''").replace(/"(?:[^"]|"")*"/g, '""')
    .trim().replace(/;\s*$/, "");
  if (!/^select\b/i.test(bare) || bare.includes(";") || NOT_A_READ.test(bare)) {
    throw new Error("REFUSED — this baseline tool executes one plain SELECT at a time");
  }
}
async function select(client, sql, params = []) {
  assertSelect(sql);
  return (await client.query(sql, params)).rows;
}

function windowAt(clockMs) {
  if (!Number.isFinite(clockMs)) throw new Error("Unreadable production clock");
  // Cap at the completion boundary: a delayed rerun must read the same fixed
  // 2026-10-02..15 baseline, not a moving trailing 14-day window.
  const capped = Math.min(clockMs, DEADLINE_MS);
  const window = measureWindows({ launch: null, nowMs: capped, retainedFromDay: FIRST_FULL_COUNTED_DAY }).before;
  if (window.days[0] !== FIRST_FULL_COUNTED_DAY || window.days.some((d) => d > LAST_DAY)
      || window.days.length > S13_RULINGS.beforeDays) throw new Error("S13 window drift");
  return window;
}

function selfTest() {
  for (const sql of ["update x set y=1", "select 1; drop table x", "with x as (delete from x returning id) select * from x", "select * into x from y"])
    { let refused = false; try { assertSelect(sql); } catch { refused = true; } if (!refused) throw new Error("SELECT guard missed a write"); }
  assertSelect(`select "updatedAt", 'set' as label from "JourneyFunnelDay" where "variant" = 'old'`);
  const before = windowAt(DEADLINE_MS - 1), on = windowAt(DEADLINE_MS), late = windowAt(DEADLINE_MS + 5 * 86_400_000);
  if (before.days.length !== 13 || before.days.at(-1) !== "2026-10-14") throw new Error("13-day preflight boundary drift");
  if (on.days.length !== 14 || on.days.at(-1) !== LAST_DAY || JSON.stringify(on.days) !== JSON.stringify(late.days))
    throw new Error("14-day completion boundary drift");
  if (FIRST_BET_HORIZON_MS !== 24 * 3_600_000 || DEPOSIT_FOLLOW_UP_MS !== 30 * 60_000) throw new Error("S13 horizons changed");
  if (MEASURES.map((m) => m.no).join(",") !== "1,2,3,4,4b,5") throw new Error("S13 measure set changed");
  const transition = { at: "2026-10-02T00:00:00.000Z", state: "STAFF", source: "test", processStartedAt: "2026-10-02T00:00:00.000Z" };
  const record = { v: 1, observedSince: transition.at, transitions: [transition], gap: null };
  if (prelaunchRecord(record) !== "present-prelaunch") throw new Error("Valid prelaunch observation refused");
  for (const bad of [{ ...record, transitions: [{ ...transition, state: "ACTIVE" }] }, { ...record, transitions: [] }]) {
    let refused = false; try { prelaunchRecord(bad); } catch { refused = true; }
    if (!refused) throw new Error("Launched or malformed observation accepted");
  }
  console.log("s15 baseline SELECT guard, launch guard and 13/14-day boundary: PASS");
}

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") { i++; if (!args[i] || args[i].startsWith("--")) throw new Error("--out needs a path"); }
  else if (args[i] !== "--require-complete" && args[i] !== "--self-test") throw new Error(`Unknown argument: ${args[i]}`);
}
const outAt = args.indexOf("--out");
const outPath = outAt >= 0 ? args[outAt + 1] : null;
const requireComplete = args.includes("--require-complete");

function fromQaEnv(key) {
  const path = join(ROOT, ".env.qa.local");
  if (!existsSync(path)) return undefined;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z_0-9]+)=(.*)$/.exec(line);
    if (m && m[1] === key) return m[2].trim();
  }
  return undefined;
}
const num = (v) => { const n = Number(v); if (!Number.isSafeInteger(n) || n < 0) throw new Error("Invalid aggregate count"); return n; };
const stamp = (ms) => new Date(ms).toISOString().slice(0, 23).replace("T", " ");
const core = (key) => { const def = MEASURES.find((m) => m.key === key); if (!def) throw new Error(`Missing S13 definition ${key}`); return def; };
const compactCell = (c) => ({ status: c.status, numerator: c.n, denominator: c.d,
  share: c.tenths === null ? null : c.text, held: c.held, smallSample: c.small,
  partial: c.partial, waiting: c.waiting, notCounted: c.notCounted, note: c.note });
const iso = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v)
  && Number.isFinite(Date.parse(v));
const keys = (v, expected) => !!v && typeof v === "object" && !Array.isArray(v)
  && Object.keys(v).sort().join(",") === [...expected].sort().join(",");
function prelaunchRecord(value) {
  if (value === null) return "absent";
  if (!keys(value, ["v", "observedSince", "transitions", "gap"]) || value.v !== 1
      || !iso(value.observedSince) || !Array.isArray(value.transitions)
      || value.transitions.length < 1 || value.transitions.length > 200) throw new Error("REFUSED — malformed launch observation");
  let priorAt = -Infinity, priorState = null;
  for (const t of value.transitions) {
    if (!keys(t, ["at", "state", "source", "processStartedAt"]) || !iso(t.at)
        || !iso(t.processStartedAt) || !["WITHDRAWN", "STAFF", "ACTIVE"].includes(t.state)
        || typeof t.source !== "string" || t.source.length > 200
        || Date.parse(t.at) < priorAt || t.state === priorState) throw new Error("REFUSED — malformed launch observation");
    priorAt = Date.parse(t.at); priorState = t.state;
  }
  if (value.transitions[0].at !== value.observedSince || value.gap !== null &&
      (!keys(value.gap, ["from", "to"]) || !iso(value.gap.from) || !iso(value.gap.to)
        || Date.parse(value.gap.from) >= Date.parse(value.gap.to))) throw new Error("REFUSED — malformed launch observation");
  if (value.transitions.some((t) => t.state === "ACTIVE"))
    throw new Error("REFUSED — this fixed pre-launch baseline tool cannot read an already launched journey");
  return "present-prelaunch";
}

if (args.includes("--self-test")) { selfTest(); process.exit(0); }
const sources = [
  process.env.PROD_DATABASE_PUBLIC_URL, fromQaEnv("PROD_DATABASE_PUBLIC_URL"),
  process.env.DATABASE_PUBLIC_URL, process.env.DATABASE_URL,
];
const raw = sources.find((x) => typeof x === "string" && x.length > 0);
if (!raw) throw new Error("Production public database URL unavailable");
const url = new URL(publicUrl(raw));
if (!/\.proxy\.rlwy\.net$/.test(url.hostname)) throw new Error("REFUSED — database is not Railway's production public proxy");
url.searchParams.set("options", "-c default_transaction_read_only=on");

let client;
try {
  client = await connect(url.toString());
  const [clock] = await select(client, `select now() as clock, current_setting('transaction_read_only') as read_only`);
  if (clock?.read_only !== "on" || !(clock.clock instanceof Date)) throw new Error("REFUSED — production session did not prove read-only with a database clock");
  const nowMs = clock.clock.getTime();
  const window = windowAt(nowMs), days = window.days;
  const first = days[0], last = days.at(-1);
  if (!first || !last) throw new Error("No full counted EAT day exists");

  const launchRows = await select(client, `select value from "SystemConfig" where key = 'journey.rollout.observed'`);
  const launch = launchRows[0]?.value ?? null;
  const launchObservation = prelaunchRecord(launch);

  const [counterRows, homeRows] = await Promise.all([
    select(client, `select day, step, origin, variant, sum("count")::bigint as n
      from "JourneyFunnelDay" where day >= $1 and day <= $2
      group by day, step, origin, variant order by day, step, origin, variant`, [first, last]),
    select(client, `select day, sum(views)::bigint as n from "SiteVisitPage"
      where path = '/' and day >= $1 and day <= $2 group by day order by day`, [first, last]),
  ]);
  const viewMap = new Map(homeRows.map((r) => [r.day, num(r.n)]));
  const counterDays = new Set(counterRows.map((r) => r.day));
  const gapDays = days.filter((d) => !counterDays.has(d) && (viewMap.get(d) ?? 0) > 0);
  const countedDays = new Set(days.filter((d) => !gapDays.includes(d)));
  const sum = (step, origins, variant = "old") => counterRows.reduce((n, r) =>
    n + (countedDays.has(r.day) && r.step === step && (variant === null || r.variant === variant)
      && origins.includes(r.origin) ? num(r.n) : 0), 0);
  const views = [...countedDays].reduce((n, d) => n + (viewMap.get(d) ?? 0), 0);
  const cell = (key, n, d, waiting = 0) => {
    const measure = core(key);
    const usesCounters = measure.numerator.half.source !== "rows" || measure.denominator.half.source !== "rows";
    return compactCell(cellFor(n, d,
      { measure, side: "before", window, campaign: null, s9: true, readable: true,
        notCounted: usesCounters ? gapDays : [], waiting }));
  };

  const m1 = core("homeToSheet"), m2 = core("sheetToBet"), m3 = core("shortToDeposit");
  const o1 = m1.numerator.half.origins.old, o2 = m2.numerator.half.origins.old,
    d2 = m2.denominator.half.origins.old, d3 = m3.denominator.half.origins.old;
  const cells = {
    homeToSheet: cell("homeToSheet", sum("sheet_open", o1), views),
    sheetToBet: cell("sheetToBet", sum("bet", o2), sum("sheet_open", d2)),
    shortToDeposit: cell("shortToDeposit", null, sum("low_balance", d3)),
    depositToBet: cell("depositToBet", null, null),
  };

  // S13 R4: the cohort is every non-staff player who joined in these EAT
  // days. A first unmarked position is read across all history; only those
  // whose first 24 hours have elapsed join the denominator. SQL returns just
  // three counts and a median, never a user/position row.
  const startUtc = Date.parse(`${first}T00:00:00+03:00`);
  const endUtc = Date.parse(`${last}T00:00:00+03:00`) + 86_400_000;
  const [joined] = await select(client, `select count(*)::bigint as cohort,
      count(*) filter (where u."createdAt" + interval '24 hours' <= $3::timestamp)::bigint as due,
      count(*) filter (where u."createdAt" + interval '24 hours' <= $3::timestamp
        and f.first_at <= u."createdAt" + interval '24 hours')::bigint as within,
      percentile_cont(0.5) within group (order by greatest(0, extract(epoch from (f.first_at - u."createdAt")) / 60))
        filter (where u."createdAt" + interval '24 hours' <= $3::timestamp
          and f.first_at <= u."createdAt" + interval '24 hours') as median_minutes
    from "User" u left join lateral
      (select min(p."placedAt") as first_at from "Position" p
        where p."userId" = u.id and p."houseBotId" is null) f on true
    where u.role::text <> all($4::text[]) and u."createdAt" >= $1::timestamp and u."createdAt" < $2::timestamp`,
    [stamp(startUtc), stamp(endUtc), stamp(nowMs), [...STAFF_ROLES]]);
  const waiting = num(joined.cohort) - num(joined.due);
  cells.timeToFirstBet = { ...cell("timeToFirstBet", num(joined.within), num(joined.due), waiting),
    medianMinutes: joined.median_minutes === null ? null : Number(joined.median_minutes) };

  // S13's comparison row 4b is not one of the five, but the agency baseline
  // file carries it. The read is still aggregate-only and uses the same 30m
  // rule as the product view.
  const [anyDeposit] = await select(client, `select count(*)::bigint as cohort,
      count(*) filter (where coalesce(t."completedAt", t."createdAt") + interval '30 minutes' <= $3::timestamp)::bigint as due,
      count(*) filter (where coalesce(t."completedAt", t."createdAt") + interval '30 minutes' <= $3::timestamp
        and exists (select 1 from "Position" p where p."userId" = t."userId" and p."houseBotId" is null
          and p."placedAt" >= coalesce(t."completedAt", t."createdAt")
          and p."placedAt" <= coalesce(t."completedAt", t."createdAt") + interval '30 minutes'))::bigint as followed
    from "Transaction" t join "User" u on u.id = t."userId"
    where t.type::text = 'DEPOSIT' and t.status::text = 'CONFIRMED' and t."houseBotId" is null
      and u.role::text <> all($4::text[])
      and coalesce(t."completedAt", t."createdAt") >= $1::timestamp
      and coalesce(t."completedAt", t."createdAt") < $2::timestamp`,
    [stamp(startUtc), stamp(endUtc), stamp(nowMs), [...STAFF_ROLES]]);
  const comparison4b = cell("depositToAnyBet", num(anyDeposit.followed), num(anyDeposit.due),
    num(anyDeposit.cohort) - num(anyDeposit.due));

  // The S13 launch-watch baseline is part of the S15 rollback reference.
  // It is a daily mean of question bets and a rate over decided deposits.
  const questionOrigins = ["dial", "sheet", "deposit_return"];
  const questionBets = sum("bet", questionOrigins, null);
  const [outcomes] = await select(client, `select
      count(*) filter (where t.status::text in ('CONFIRMED','REVERSED'))::bigint as confirmed,
      count(*) filter (where t.status::text in ('FAILED','CANCELLED'))::bigint as failed,
      count(*) filter (where t.status::text not in ('CONFIRMED','REVERSED','FAILED','CANCELLED'))::bigint as undecided
    from "Transaction" t join "User" u on u.id = t."userId"
    where t.type::text = 'DEPOSIT' and t."houseBotId" is null
      and u.role::text <> all($3::text[])
      and t."createdAt" >= $1::timestamp and t."createdAt" < $2::timestamp`,
    [stamp(startUtc), stamp(endUtc), [...STAFF_ROLES]]);
  const confirmed = num(outcomes.confirmed), failed = num(outcomes.failed);
  const watch = {
    questionBetsPerDay: countedDays.size ? questionBets / countedDays.size : null,
    questionBetDays: countedDays.size,
    depositConfirmRate: confirmed + failed ? confirmed / (confirmed + failed) : null,
    decidedDeposits: confirmed + failed,
    undecidedDeposits: num(outcomes.undecided),
  };

  const complete = nowMs >= DEADLINE_MS && days.length === S13_RULINGS.beforeDays && gapDays.length === 0;
  const report = {
    schemaVersion: 1, kind: "S15_PRELAUNCH_BASELINE_SELECT_ONLY", generatedAt: clock.clock.toISOString(),
    database: "Railway production public proxy", readOnlySession: true,
    s13Source: "src/lib/journey/measures.ts / S13-PLAN.md definitions table",
    window: { firstDay: first, lastDay: last, observedDays: days.length, requiredDays: S13_RULINGS.beforeDays,
      earliestCompletion: "2026-10-16T00:00:00+03:00", complete, notCountedDays: gapDays,
      waitingFirstBetCohort: waiting, waitingDepositFollowUps: num(anyDeposit.cohort) - num(anyDeposit.due) },
    launchObservation,
    measures: S13_RULINGS.inBounds.measures.map((key) => ({ key, no: core(key).no, name: core(key).name, ...cells[key] })),
    comparison4b, watch,
  };
  if (outPath) {
    const path = resolve(outPath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  if (requireComplete && !complete) process.exitCode = 3;
} finally {
  if (client) await client.end().catch(() => {});
}
