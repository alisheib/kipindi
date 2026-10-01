/**
 * test:campaign-estimate — U39a's guard: the campaign estimate's engine (the card itself is U39b).
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script: the REAL money decider against the rbac runtime
 * (the default grid, D3, a masked ceiling, a positive control); the REAL loader through its REAL default deps, with
 * only `globalThis.fetch` stubbed at the balance endpoint (as `test:sms-cost-guard` does); the walk over hand-built
 * send histories; the arithmetic; and every string the view shows. Then the source, for what only the source can show.
 *
 * §1 the decider · §2 the loader · §3 the walk · §4 the arithmetic · §5 the words · §6 the wiring.
 * (§6.3 of the spec — the READ_CLASS_SUMMARY wording and the decider's two axes — is `test:read-tiers` §9.)
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY (a decider, a loader dep, a measure, an
 * estimate, a view, a source string) and requires the MATCHING assertion to fail. This file writes no file and sends
 * no SMS: the fetch stub answers the free balance endpoint and refuses anything else.
 *
 * Run:  npm run test:campaign-estimate
 * Red:  npm run red:campaign-estimate
 */
process.exitCode = 1;

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { refreshSmsBalance, smsBalanceSnapshot, SMS_BALANCE_RENDER_BUDGET_MS } from "../src/lib/server/sms.ts";
import type { SmsBalanceRead } from "../src/lib/server/sms.ts";
import {
  canView, readCell, setRoleGrant, setRoleReadGrant, __resetGrantsForTest, __resetReadGrantsForTest,
} from "../src/lib/server/rbac.ts";
import type { Role } from "../src/lib/server/roles.ts";
import { SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER } from "../src/lib/sms-compose.ts";
import { chunkTimes, measureChunkPace, measureSegmentCost, segmentsOf, validCostPairs } from "../src/lib/marketing/segment-cost.ts";
import type { ChunkPace, CostWalkRow, CostWalkStatus, SegmentCostMeasure } from "../src/lib/marketing/segment-cost.ts";
import {
  campaignEstimate, estimateView, savedVariantSizes, MAX_SLICES_IN_FLIGHT, ESTIMATE_NO_MONEY_SENTENCE,
} from "../src/lib/marketing/campaign-estimate.ts";
import type {
  BalanceFigure, CampaignEstimate, EstimateAudience, EstimateInputs, EstimateTile, EstimateView, VariantSize,
} from "../src/lib/marketing/campaign-estimate.ts";
import {
  balanceFigureOf, campaignMoneyVisible, ESTIMATE_BALANCE_MAX_AGE_MS, loadEstimateInputsFor,
} from "../src/lib/server/marketing/estimate.ts";
import type { EstimateDeps } from "../src/lib/server/marketing/estimate.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8")).split(String.fromCharCode(13)).join("");

/* ── THE RAIL, AS sms-cost-guard SETS IT ─────────────────────────────────────────────────────────────────────────── */
process.env.SMS_PROVIDER = "blackball";
process.env.SMS_SENDER_ID = "50pick";
process.env.BLACKBALL_CLIENT_ID = "cid";
process.env.BLACKBALL_CLIENT_SECRET = "csec";
for (const k of ["SMS_PRICE_PER_SEGMENT_TZS", "SMS_BALANCE_FLOOR_TZS", "SMS_BALANCE_ALERT_TZS", "SMS_BALANCE_TTL_MS", "SMS_BALANCE_RETRY_MS", "BLACKBALL_API_URL"]) {
  delete process.env[k];
}

/** Every stubbed reply is a real gateway shape. `balanceCalls` counts reads of the free balance endpoint. */
type Reply = () => Response;
let balanceCalls = 0;
let sendCalls = 0;
const balanceIs = (balance: number): Reply => () =>
  new Response(JSON.stringify({ status: true, message: "Account balance", data: { currency: "TZS" }, balance }), { status: 200 });
/** Captured verbatim from the live balance endpoint with bad credentials, 2026-09-16 (sms-cost-guard). */
const balanceRefused: Reply = () =>
  new Response(JSON.stringify({ status: false, message: "Invalid credentials used", data: null, balance: 0.0 }), { status: 400 });
const balanceUnreachable: Reply = () => { throw new TypeError("fetch failed"); };
let balanceReply: Reply = balanceIs(196);
/** While set, a balance read hangs until it resolves — a slow vendor. */
let balanceGate: Promise<void> | null = null;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes("/api/account/balance")) {
    balanceCalls++;
    if (balanceGate) await balanceGate;
    return balanceReply();
  }
  sendCalls++;
  return new Response(JSON.stringify({ status: false, message: "this suite never sends", data: null }), { status: 400 });
}) as typeof fetch;

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const KEPT_TZS = 517;
/** A restart, then one reading kept from ten minutes ago — older than the estimate's 60 s reuse, inside the TTL. */
const seedKept = () => {
  globalThis.__50PICK_SMS_BALANCE = { tzs: KEPT_TZS, at: Date.now() - 10 * MIN };
  globalThis.__50PICK_SMS_BALANCE_READ = undefined;
};
const settle = () => new Promise((r) => setTimeout(r, 5));
const readIdle = async () => { for (let i = 0; i < 400 && globalThis.__50PICK_SMS_BALANCE_READ?.inflight; i++) await settle(); };

/**
 * ⭐ FIVE REAL READS, each through the REAL `refreshSmsBalance` with a kept TZS 517 in the snapshot — the figure a
 * defective mapping would leak. The hang uses a 30 ms budget so the suite does not wait 2.5 s per run.
 */
async function readWith(o: { reply?: Reply; provider?: string; keys?: boolean; hang?: boolean }): Promise<SmsBalanceRead> {
  seedKept();
  balanceReply = o.reply ?? balanceRefused;
  if (o.provider) process.env.SMS_PROVIDER = o.provider;
  if (o.keys === false) delete process.env.BLACKBALL_CLIENT_ID;
  let release = () => {};
  if (o.hang) balanceGate = new Promise<void>((r) => { release = r; });
  try {
    return await refreshSmsBalance({ maxAgeMs: ESTIMATE_BALANCE_MAX_AGE_MS, budgetMs: o.hang ? 30 : SMS_BALANCE_RENDER_BUDGET_MS });
  } finally {
    balanceReply = balanceRefused;
    release();
    balanceGate = null;
    await readIdle();
    process.env.SMS_PROVIDER = "blackball";
    process.env.BLACKBALL_CLIENT_ID = "cid";
    seedKept();
  }
}
const READS = {
  refused: await readWith({ reply: balanceRefused }),
  unreachable: await readWith({ reply: balanceUnreachable }),
  pending: await readWith({ hang: true }),
  unavailable: await readWith({ provider: "console" }),
  notConfigured: await readWith({ keys: false }),
};
type ReadKey = keyof typeof READS;

/* ── FIXTURES ────────────────────────────────────────────────────────────────────────────────────────────────────── */
const NOW = Date.parse("2026-09-30T12:00:00.000Z");
const T0 = Date.parse("2026-09-20T06:00:00.000Z");
const iso = (t: number) => new Date(t).toISOString();
const W = { provider: "blackball", now: NOW };

type ChunkSpec = { charge: number; rows?: Array<{ status?: CostWalkStatus; bodyLen?: number }> };
/**
 * A send history as `sendBatch` writes it: one batch per chunk, ten minutes apart; every row of a chunk carries the
 * reply's PRE-CHARGE balance, so chunk i+1 reads chunk i's charge lower. A DELIVERED row is delivered 2 s after.
 */
function walk(specs: ChunkSpec[], o: { start?: number; at?: number; provider?: string } = {}): CostWalkRow[] {
  let bal = o.start ?? 300;
  let t = o.at ?? T0;
  const out: CostWalkRow[] = [];
  for (const s of specs) {
    for (const r of s.rows ?? [{}]) {
      const status = r.status ?? "DELIVERED";
      out.push({
        provider: o.provider ?? "blackball", status, bodyLen: r.bodyLen ?? 48, balanceTzs: bal,
        createdAt: iso(t), sentAt: iso(t + 400), deliveredAt: status === "DELIVERED" ? iso(t + 2_000) : null,
      });
    }
    bal -= s.charge;
    t += 10 * MIN;
  }
  return out;
}
const clean = (n: number, charge = 6): ChunkSpec[] => Array.from({ length: n }, () => ({ charge }));
/** A row with no reply: queued, unknown, or another provider's. */
const stray = (t: number, status: CostWalkStatus, provider = "blackball"): CostWalkRow => ({
  provider, status, bodyLen: 48, balanceTzs: null, createdAt: iso(t), sentAt: null, deliveredAt: null,
});
/** Four timed chunks: three one-chunk batches (1.4 s, 2.1 s, 3.0 s) and a two-chunk batch (3.0 s then 1.6 s). */
function paceRows(): CostWalkRow[] {
  const row = (created: number, sent: number): CostWalkRow => ({
    provider: "blackball", status: "DELIVERED", bodyLen: 48, balanceTzs: 300,
    createdAt: iso(created), sentAt: iso(sent), deliveredAt: iso(sent + 1_500),
  });
  const a = T0, b = T0 + 20 * MIN, c = T0 + 40 * MIN;
  return [row(a, a + 1_400), row(b, b + 2_100), row(c, c + 3_000), row(c, c + 4_600)];
}

const SW1: VariantSize = { locale: "SW", segments: 1, encoding: "GSM7" };
const EN2: VariantSize = { locale: "EN", segments: 2, encoding: "UCS2" };
const AUD: EstimateAudience = { ok: true, population: 12_430, forecast: 12_430 };
const PACE14: ChunkPace = { minChunkMs: 1_400, chunks: 4, batchMax: 50 };
const measured6: SegmentCostMeasure = { kind: "measured", tzsPerSegment: 6, sends: 6, pairs: 6, spread: { min: 6, max: 6 }, since: iso(T0) };
const live = (tzs: number, at = NOW - MIN): BalanceFigure => ({ kind: "live", tzs, at });
const liveRead = (tzs: number): SmsBalanceRead => ({ tzs, at: NOW - MIN, outcome: "fresh", stale: false, error: null });
/** The money fixture: a live TZS 196 and a clean walk measuring TZS 6 — so a leak would print 196 and 74,580. */
const MONEY_DEPS: Partial<EstimateDeps> = {
  readBalance: async () => liveRead(196),
  recentSends: async () => walk(clean(7)),
  now: () => NOW,
  provider: () => "blackball",
};

const NB = String.fromCharCode(0xa0);
const plain = (s: string) => s.split(NB).join(" ");
const json = (v: unknown) => plain(JSON.stringify(v));
const tile = (v: EstimateView, key: EstimateTile["key"]) => v.tiles.find((t) => t.key === key);
const tileText = (t?: EstimateTile) => (t ? plain([t.value, t.note ?? "", t.provenance ?? ""].join(" | ")) : "");
const label = (c: SegmentCostMeasure | undefined) =>
  !c ? "none" : c.kind === "unknown" ? `unknown:${c.reason}` : `${c.kind}:${c.tzsPerSegment}`;
const figure = (f: BalanceFigure | undefined) =>
  !f ? "none" : f.kind === "live" ? `live:${f.tzs}` : `${f.why}/${f.error}${"tzs" in f ? "/LEAKED" : ""}`;

/* ── THE IMPLEMENTATIONS UNDER TEST — swapped whole by --prove-red ───────────────────────────────────────────────── */
type Sources = { estimate: string; costModule: string; estimateModule: string };
const REAL_SOURCES: Sources = {
  estimate: read("src/lib/server/marketing/estimate.ts"),
  costModule: read("src/lib/marketing/segment-cost.ts"),
  estimateModule: read("src/lib/marketing/campaign-estimate.ts"),
};
type Impl = {
  decider: (role: Role) => Promise<boolean>;
  loadFor: (role: Role | null, audience: EstimateAudience, deps?: Partial<EstimateDeps>) => Promise<EstimateInputs>;
  figureOf: (r: SmsBalanceRead | null) => BalanceFigure;
  segmentsOf: (r: CostWalkRow) => number | null;
  measure: typeof measureSegmentCost;
  pace: typeof measureChunkPace;
  estimate: (i: EstimateInputs, v: readonly VariantSize[]) => CampaignEstimate;
  view: (e: CampaignEstimate, now?: number) => EstimateView;
  sources: Sources;
};
const REAL: Impl = {
  decider: campaignMoneyVisible,
  loadFor: (role, audience, deps) => loadEstimateInputsFor(role, audience, deps),
  figureOf: balanceFigureOf,
  segmentsOf,
  measure: measureSegmentCost,
  pace: measureChunkPace,
  estimate: campaignEstimate,
  view: estimateView,
  sources: REAL_SOURCES,
};

/**
 * §6.2's population, read ONCE (no red case plants a file): every .tsx under /admin/campaigns that would format money or
 * ask the decider itself, and every src/app file that calls the role-taking loader. ⚠️ /admin/campaigns does not exist
 * until U36/U37, so §6.2 also proves the detector can match at all — an absent directory must not read as "clean".
 */
const walkFiles = (dir: string, ext: RegExp): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walkFiles(join(dir, e.name), ext) : ext.test(e.name) ? [join(dir, e.name)] : [])
    : [];
const MONEY_IMPORT = /import\s*(?:type\s*)?\{[^}]*\b(?:formatTzs|formatTzsCompact|campaignMoneyVisible|loadEstimateInputsFor)\b[^}]*\}\s*from/;
const campaignsTsx = walkFiles(join(ROOT, "src", "app", "admin", "campaigns"), /\.tsx$/)
  .filter((f) => MONEY_IMPORT.test(decomment(readFileSync(f, "utf8"))));
const roleLoaderCallers = walkFiles(join(ROOT, "src", "app"), /\.tsx?$/)
  .filter((f) => /\bloadEstimateInputsFor\b/.test(decomment(readFileSync(f, "utf8"))));

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

/** Every label, once — the red cases name the one they must turn. */
const L = {
  grid: "1.1 ⭐ the default grid, EXECUTED against the rbac runtime — ADMIN, COMPLIANCE, FINANCE and AUDITOR see campaign money; GROWTH, SUPPORT and MODERATOR do not",
  d3: "1.2 ⛔ D3 · ADMIN with money.figures none, then masked, is refused — the Owner can witness the GROWTH branch on production",
  masked: "1.3 ⛔ SUPPORT granted accounting with money.figures still masked is refused — masked is a ceiling, not a read",
  control: "1.4 ⭐ POSITIVE CONTROL · GROWTH granted accounting AND money.figures read IS shown the money — no role is hard-coded out",
  noRead: "2.1 ⛔ GROWTH (and no role at all) get money === null, and the balance endpoint saw ZERO calls",
  vendor: "2.2 ⭐ ADMIN through the REAL default deps · a kept 10-minute-old TZS 517 is not reused — the vendor is asked, and its 196 is the live credit",
  unreadable: "2.3 ⛔ a refused, an unanswered, a hanging, a keyless and a console read each give an UNREADABLE credit with its reason and NO figure — though a kept TZS 517 exists",
  noAudienceImport: "2.4 ⛔ estimate.ts imports no audience or contacts module — the counts arrive from the caller",
  history: "2.5 a send history that cannot be read never throws · cost unknown(history-unreadable) and no pace; with SMS_PRICE_PER_SEGMENT_TZS=6 the configured price stands",
  cleanWalk: "3.1 ⭐ a clean walk of 7 delivered single-segment chunks (300, 294 … 264) measures exactly TZS 6, from 6 sends over 6 pairs",
  delivered: "3.2 🔴 a chunk holding a delivered row and a never-delivered one (charged 6 for 2) is NOT measured — billing is per DELIVERED message",
  median: "3.3 ⭐ a top-up (negative) and a late charge (0, then 12) beside 4 clean pairs still measure 6 — the median, not a mean or the last pair",
  segments: "3.4 🔴 a 140-character body is not a certain segment — four two-segment pairs beside three clean ones still measure 6",
  window: "3.5 ⛔ a QUEUED or UNKNOWN send between two chunks voids that pair; a console row and a 40-day-old walk are ignored",
  fallback: "3.6 fewer than 3 clean pairs is unknown(too-few-sends); a configured TZS 6 stands in; an EMPTY history is unknown(no-sends), never 0",
  billable: "4.1 billable = audience × the LARGEST variant (SW 1 + EN 2 → 2 a person); cost = ceil(billable × price), never rounded down",
  reserve: "4.2 ⭐ coverage keeps the login-code reserve · credit 56, price 6, reserve 50 covers exactly 1, and the shortfall is stated",
  floor: "4.3 ⭐ the duration floor is ceil(N / batchMax) × the FASTEST measured chunk · 150,000 at 1,400 ms is 3,000 × 1.4 s = 70 min; null with no pace",
  states: "4.4 no audience is 'no-audience' with no totals and no money; a failed count is 'audience-error', never a zero",
  ceiling: "4.5 ⭐ X15 · the estimate prices the campaign POPULATION (the spend ceiling), not the forecast; the forecast drives only the duration floor",
  saved: "4.6 M16 · the estimate takes the SAVED per-variant sizes — SW required, a half-stored EN refused, no message is 'no-message' (never a zero)",
  noMoney: "5.1 ⛔ a role that may not read money gets a view with no 'TZS' and none of the money fixture's digits (196, 74,580) — and the sentence, with Segments and Duration still there",
  moneyControl: "5.2 ⭐ POSITIVE CONTROL · the ADMIN view carries 'TZS' in the cost (74,580) and credit (196) tiles — without it, 5.1 could pass by printing nothing",
  unreadableWords: "5.3 ⛔ an unreadable credit shows '—' and says why — never the kept figure, never 'Was'",
  captions: "5.4 the cost caption says where the price came from — measured, configured or not yet measured — and the segments tile says 'estimated' while the biller flag is false",
  duration: "5.5 duration copy starts 'At least', rounds DOWN and says 'not a promise'; TZS 1,000,000 or more is compacted with the exact figure in provenance",
  clock: "5.6 the credit says when it was read, in EAT on a fixed clock — '14:02 EAT' today, '29 Sep 14:02 EAT' from another day",
  emptyViews: "5.7 no audience: one tile, '1 segment a message', and the sentence; a failed count: the error and no tiles",
  predeploy: "6.1 test:campaign-estimate and red:campaign-estimate are keys, and the suite is on the predeploy chain",
  wiring: "6.2 ⛔ the credit is read with the 60 s reuse and the render budget; no campaigns .tsx formats money or asks the decider; nothing in src/app calls the role-taking loader",
  clientSafe: "6.4 ⛔ the two pure modules stay client-safe — segment-cost imports only sms-compose; campaign-estimate value-imports nothing server-side",
} as const;

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  __resetGrantsForTest();
  __resetReadGrantsForTest();
  seedKept();
  balanceReply = balanceIs(196);
  delete process.env.SMS_PRICE_PER_SEGMENT_TZS;

  /* ══ §1 · THE ONE DECIDER ════════════════════════════════════════════════════════════════════════════════════ */
  const yesRoles: Role[] = ["ADMIN", "COMPLIANCE", "FINANCE", "AUDITOR"];
  const noRoles: Role[] = ["GROWTH", "SUPPORT", "MODERATOR"];
  const yes = await Promise.all(yesRoles.map((r) => impl.decider(r)));
  const no = await Promise.all(noRoles.map((r) => impl.decider(r)));
  ok(p(L.grid), yes.every((x) => x === true) && no.every((x) => x === false), `yes ${yes.join(",")} · no ${no.join(",")}`);

  await setRoleReadGrant("ADMIN", "money.figures", "none", "test");
  const adminNone = await impl.decider("ADMIN");
  await setRoleReadGrant("ADMIN", "money.figures", "masked", "test");
  const adminMasked = await impl.decider("ADMIN");
  __resetReadGrantsForTest();
  const adminBack = await impl.decider("ADMIN");
  ok(p(L.d3), adminNone === false && adminMasked === false && adminBack === true,
    `none → ${adminNone} · masked → ${adminMasked} · reset → ${adminBack}`);

  await setRoleGrant("SUPPORT", "accounting", true, false, "test");
  const supportViews = await canView("SUPPORT", "accounting");
  const supportCell = await readCell("SUPPORT", "money.figures");
  const supportSees = await impl.decider("SUPPORT");
  __resetGrantsForTest();
  ok(p(L.masked), supportViews === true && supportCell === "masked" && supportSees === false,
    `accounting view ${supportViews} · cell ${supportCell} · decider ${supportSees}`);

  await setRoleGrant("GROWTH", "accounting", true, false, "test");
  await setRoleReadGrant("GROWTH", "money.figures", "read", "test");
  const growthGranted = await impl.decider("GROWTH");
  __resetGrantsForTest();
  __resetReadGrantsForTest();
  ok(p(L.control), growthGranted === true, String(growthGranted));

  /* ══ §2 · THE LOADER ═════════════════════════════════════════════════════════════════════════════════════════ */
  seedKept();
  const calls0 = balanceCalls;
  const growth = await impl.loadFor("GROWTH", AUD);
  const nobody = await impl.loadFor(null, AUD);
  ok(p(L.noRead), growth.money === null && nobody.money === null && balanceCalls === calls0,
    `GROWTH money ${growth.money === null ? "null" : "PRESENT"} · ${balanceCalls - calls0} balance call(s)`);

  seedKept();
  balanceReply = balanceIs(196);
  const calls1 = balanceCalls;
  const admin = await impl.loadFor("ADMIN", AUD);
  ok(p(L.vendor), figure(admin.money?.balance) === "live:196" && balanceCalls === calls1 + 1,
    `${figure(admin.money?.balance)} · ${balanceCalls - calls1} call(s)`);

  const figs = Object.fromEntries((Object.keys(READS) as ReadKey[]).map((k) => [k, figure(impl.figureOf(READS[k]))])) as Record<ReadKey, string>;
  const viaLoader = await impl.loadFor("ADMIN", AUD, { ...MONEY_DEPS, readBalance: async () => READS.refused });
  ok(p(L.unreadable),
    (Object.keys(READS) as ReadKey[]).every((k) => READS[k].tzs === KEPT_TZS)
      && figs.refused === "failed/refused" && figs.unreachable === "failed/unreachable"
      && figs.pending === "pending/null" && figs.unavailable === "unavailable/null"
      && figs.notConfigured === "failed/not-configured"
      && figure(viaLoader.money?.balance) === "failed/refused",
    `${JSON.stringify(figs)} · loader ${figure(viaLoader.money?.balance)}`);

  ok(p(L.noAudienceImport),
    impl.sources.estimate.length > 2000
      && !/^[ \t]*import[^;]*?from\s*["'][^"']*(?:audience|contacts)[^"']*["']/m.test(impl.sources.estimate));

  const broken = await impl.loadFor("ADMIN", AUD, { ...MONEY_DEPS, recentSends: async () => { throw new Error("history down"); } });
  process.env.SMS_PRICE_PER_SEGMENT_TZS = "6";
  const brokenPriced = await impl.loadFor("ADMIN", AUD, { ...MONEY_DEPS, recentSends: async () => { throw new Error("history down"); } });
  delete process.env.SMS_PRICE_PER_SEGMENT_TZS;
  ok(p(L.history),
    label(broken.money?.cost) === "unknown:history-unreadable" && broken.pace === null && label(brokenPriced.money?.cost) === "configured:6",
    `${label(broken.money?.cost)} · pace ${broken.pace === null ? "null" : "PRESENT"} · ${label(brokenPriced.money?.cost)}`);

  /* ══ §3 · THE WALK ═══════════════════════════════════════════════════════════════════════════════════════════ */
  const m1 = impl.measure(walk(clean(7)), W);
  ok(p(L.cleanWalk), m1.kind === "measured" && m1.tzsPerSegment === 6 && m1.sends === 6 && m1.pairs === 6, JSON.stringify(m1));

  const mixed: ChunkSpec = { charge: 6, rows: [{}, { status: "ACCEPTED" }] };
  const m2 = impl.measure(walk([...clean(3), mixed, mixed, mixed, { charge: 6 }]), W);
  ok(p(L.delivered), m2.kind === "measured" && m2.tzsPerSegment === 6 && m2.pairs === 3, JSON.stringify(m2));

  const m3 = impl.measure(walk([...clean(4), { charge: -500 }, { charge: 0 }, { charge: 12 }, { charge: 6 }]), W);
  ok(p(L.median), m3.kind === "measured" && m3.tzsPerSegment === 6 && m3.pairs === 5, JSON.stringify(m3));

  const long: ChunkSpec = { charge: 12, rows: [{ bodyLen: 140 }] };
  const m4 = impl.measure(walk([...clean(3), long, long, long, long, { charge: 6 }]), W);
  const certain = [70, 71, 140].map((n) => impl.segmentsOf({ provider: "blackball", status: "DELIVERED", bodyLen: n, balanceTzs: 1, createdAt: iso(T0), sentAt: iso(T0), deliveredAt: iso(T0) }));
  ok(p(L.segments),
    m4.kind === "measured" && m4.tzsPerSegment === 6 && m4.pairs === 3 && certain.join(",") === "1,,",
    `${JSON.stringify(m4)} · segmentsOf(70/71/140) = ${certain.join("/")}`);

  const chunkAt = (k: number) => T0 + k * 10 * MIN;
  const m5 = impl.measure([
    ...walk([{ charge: 6 }, { charge: 12 }, { charge: 6 }, { charge: 12 }, { charge: 6 }, { charge: 6 }]),
    stray(chunkAt(1) + 5 * MIN, "QUEUED"),
    stray(chunkAt(3) + 5 * MIN, "UNKNOWN"),
    stray(chunkAt(0) + 5 * MIN, "QUEUED", "console"),
    ...walk(clean(4, 2), { at: NOW - 40 * DAY, start: 900 }),
  ], W);
  ok(p(L.window), m5.kind === "measured" && m5.tzsPerSegment === 6 && m5.pairs === 3 && m5.sends === 3, JSON.stringify(m5));

  const few = impl.measure(walk(clean(3)), W);
  const fewPriced = impl.measure(walk(clean(3)), { ...W, configuredTzs: 6 });
  const none = impl.measure([], W);
  ok(p(L.fallback),
    label(few) === "unknown:too-few-sends" && label(fewPriced) === "configured:6" && label(none) === "unknown:no-sends",
    `${label(few)} · ${label(fewPriced)} · ${label(none)}`);

  /* ══ §4 · THE ARITHMETIC ═════════════════════════════════════════════════════════════════════════════════════ */
  const e41 = impl.estimate({ audience: AUD, pace: null, money: { cost: measured6, balance: live(1_000_000), reserveTzs: 50 } }, [SW1, EN2]);
  const e41b = impl.estimate({ audience: { ok: true, population: 3, forecast: 3 }, pace: null, money: { cost: { kind: "configured", tzsPerSegment: 6.5 }, balance: live(1_000), reserveTzs: 50 } }, [SW1]);
  ok(p(L.billable),
    e41.segmentsPerRecipient === 2 && e41.billableSegments === 24_860 && e41.money?.costTzs === 149_160 && e41b.money?.costTzs === 20,
    `${e41.billableSegments} · ${e41.money?.costTzs} · ${e41b.money?.costTzs}`);

  const e42 = impl.estimate({ audience: { ok: true, population: 5, forecast: 5 }, pace: null, money: { cost: measured6, balance: live(56), reserveTzs: 50 } }, [SW1]);
  const covers42 = tileText(tile(impl.view(e42, NOW), "covers"));
  ok(p(L.reserve),
    e42.money?.covers === 1 && e42.money?.shortByTzs === 24 && covers42.startsWith("1 recipient |") && covers42.includes("short by about TZS 24"),
    `covers ${e42.money?.covers} · short ${e42.money?.shortByTzs} · ${covers42}`);

  const pace = impl.pace(paceRows(), { ...W, batchMax: 50 });
  const fastest = Math.min(...chunkTimes(paceRows(), W));
  const e43 = impl.estimate({ audience: { ok: true, population: 150_000, forecast: 150_000 }, pace, money: null }, [SW1]);
  const e43none = impl.estimate({ audience: { ok: true, population: 150_000, forecast: 150_000 }, pace: null, money: null }, [SW1]);
  ok(p(L.floor),
    pace?.minChunkMs === 1_400 && pace.chunks === 4 && e43.durationFloorMs === 4_200_000
      && (e43.durationFloorMs ?? Infinity) <= Math.ceil(150_000 / 50) * fastest && e43none.durationFloorMs === null
      && MAX_SLICES_IN_FLIGHT === 1,
    `pace ${JSON.stringify(pace)} · floor ${e43.durationFloorMs} · fastest ${fastest}`);

  const money196 = { cost: measured6, balance: live(196), reserveTzs: 50 };
  const noAud = impl.estimate({ audience: null, pace: PACE14, money: money196 }, [SW1]);
  const failedCount = impl.estimate({ audience: { ok: false }, pace: PACE14, money: money196 }, [SW1]);
  ok(p(L.states),
    noAud.state === "no-audience" && noAud.billableSegments === null && noAud.money === null && noAud.durationFloorMs === null
      && failedCount.state === "audience-error" && failedCount.billableSegments === null && failedCount.money === null,
    `${noAud.state} · ${failedCount.state} · billable ${failedCount.billableSegments}`);

  const e45 = impl.estimate({ audience: { ok: true, population: 12_430, forecast: 11_900 }, pace: PACE14, money: money196 }, [SW1]);
  ok(p(L.ceiling),
    e45.billableSegments === 12_430 && e45.money?.costTzs === 74_580 && e45.durationFloorMs === Math.ceil(11_900 / 50) * 1_400,
    `billable ${e45.billableSegments} · cost ${e45.money?.costTzs} · floor ${e45.durationFloorMs}`);

  const saved = savedVariantSizes({ codingSw: "GSM7", segmentsSw: 1, codingEn: "UCS2", segmentsEn: 2 });
  const swOnly = savedVariantSizes({ codingSw: "GSM7", segmentsSw: 1, codingEn: null, segmentsEn: null });
  const noSw = savedVariantSizes({ codingSw: null, segmentsSw: null, codingEn: "GSM7", segmentsEn: 1 });
  const halfEn = savedVariantSizes({ codingSw: "GSM7", segmentsSw: 1, codingEn: null, segmentsEn: 2 });
  const noMsg = impl.estimate({ audience: AUD, pace: null, money: null }, []);
  ok(p(L.saved),
    JSON.stringify(saved) === JSON.stringify([SW1, EN2]) && swOnly?.length === 1 && noSw === null && halfEn === null
      && noMsg.state === "no-message" && noMsg.billableSegments === null,
    `${JSON.stringify(saved)} · ${noMsg.state}`);

  /* ══ §5 · THE WORDS ══════════════════════════════════════════════════════════════════════════════════════════ */
  const growthIn = await impl.loadFor("GROWTH", AUD, MONEY_DEPS);
  const growthView = impl.view(impl.estimate(growthIn, [SW1]), NOW);
  const gj = json(growthView);
  ok(p(L.noMoney),
    !gj.includes("TZS") && !gj.includes("196") && !gj.includes("74,580") && gj.includes(ESTIMATE_NO_MONEY_SENTENCE)
      && growthView.tiles.map((t) => t.key).join(",") === "segments,duration"
      && plain(tile(growthView, "duration")?.value ?? "").startsWith("At least"),
    gj.slice(0, 260));

  const adminIn = await impl.loadFor("ADMIN", AUD, MONEY_DEPS);
  const adminView = impl.view(impl.estimate(adminIn, [SW1]), NOW);
  const costText = tileText(tile(adminView, "cost"));
  const creditText = tileText(tile(adminView, "credit"));
  ok(p(L.moneyControl),
    costText.includes("TZS 74,580") && creditText.includes("TZS 196") && adminView.sentence === undefined && adminView.tiles.length === 5,
    `${costText} · ${creditText}`);

  const WHY: Record<ReadKey, string> = {
    refused: "blackball refused our keys",
    unreachable: "no answer from blackball",
    pending: "still checking",
    unavailable: "no balance read on this provider",
    notConfigured: "keys not set",
  };
  const unreadableViews = (Object.keys(READS) as ReadKey[]).map((k) => {
    const v = impl.view(impl.estimate({ audience: AUD, pace: PACE14, money: { cost: measured6, balance: impl.figureOf(READS[k]), reserveTzs: 50 } }, [SW1]), NOW);
    return { k, credit: tileText(tile(v, "credit")), covers: tile(v, "covers")?.value, all: json(v) };
  });
  ok(p(L.unreadableWords),
    unreadableViews.every((u) => u.credit.startsWith("— |") && u.credit.toLowerCase().includes(WHY[u.k]) && u.covers === "—"
      && !u.all.includes(String(KEPT_TZS)) && !/\bwas\b/i.test(u.all)),
    unreadableViews.map((u) => `${u.k}: ${u.credit}`).join(" || "));

  const caption = (cost: SegmentCostMeasure) =>
    tileText(tile(impl.view(impl.estimate({ audience: AUD, pace: PACE14, money: { cost, balance: live(196), reserveTzs: 50 } }, [SW1]), NOW), "cost"));
  const measuredCap = caption(measured6);
  const configuredCap = caption({ kind: "configured", tzsPerSegment: 6 });
  const unknownCap = caption({ kind: "unknown", reason: "too-few-sends" });
  const segNote = plain(tile(impl.view(impl.estimate({ audience: AUD, pace: PACE14, money: null }, [SW1]), NOW), "segments")?.note ?? "");
  ok(p(L.captions),
    measuredCap.includes("estimated from the last 6 sends") && !measuredCap.includes("configured")
      && configuredCap.includes("configured, not yet measured") && !configuredCap.includes("estimated from")
      && unknownCap.startsWith("— |") && unknownCap.includes("not yet measured") && !unknownCap.includes("configured")
      && segNote.includes("estimated") === !SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER,
    `${measuredCap} || ${configuredCap} || ${unknownCap} || ${segNote}`);

  const v55 = impl.view(impl.estimate({ audience: { ok: true, population: 200_000, forecast: 200_000 }, pace: PACE14, money: { cost: measured6, balance: live(2_000_000), reserveTzs: 50 } }, [SW1]), NOW);
  const floor249 = plain(tile(impl.view(impl.estimate({ audience: AUD, pace: PACE14, money: null }, [SW1]), NOW), "duration")?.value ?? "");
  const d55 = tile(v55, "duration"), c55 = tile(v55, "cost"), k55 = tile(v55, "credit");
  ok(p(L.duration),
    plain(d55?.value ?? "") === "At least 1 h 33 min" && floor249 === "At least 5 min"
      && plain(d55?.note ?? "").includes("4,000 requests of up to 50 at the fastest measured 1.4 s")
      && plain(d55?.note ?? "").includes("a floor, not a promise")
      && plain(c55?.value ?? "") === "TZS 1.2M" && plain(c55?.provenance ?? "") === "TZS 1,200,000"
      && plain(k55?.value ?? "") === "TZS 2.0M" && plain(k55?.provenance ?? "").startsWith("TZS 2,000,000"),
    `${tileText(d55)} || ${floor249} || ${tileText(c55)} || ${tileText(k55)}`);

  const readAt = (at: number) =>
    plain(tile(impl.view(impl.estimate({ audience: AUD, pace: PACE14, money: { cost: measured6, balance: live(196, at), reserveTzs: 50 } }, [SW1]), NOW), "credit")?.provenance ?? "");
  const today = readAt(Date.parse("2026-09-30T11:02:00.000Z"));
  const yesterday = readAt(Date.parse("2026-09-29T11:02:00.000Z"));
  ok(p(L.clock), today === "Read 14:02 EAT" && yesterday === "Read 29 Sep 14:02 EAT", `${today} · ${yesterday}`);

  const vNoAud = impl.view(impl.estimate({ audience: null, pace: PACE14, money: null }, [SW1]), NOW);
  const vErr = impl.view(impl.estimate({ audience: { ok: false }, pace: PACE14, money: null }, [SW1]), NOW);
  ok(p(L.emptyViews),
    vNoAud.tiles.length === 1 && plain(vNoAud.tiles[0]?.value ?? "") === "1 segment a message"
      && vNoAud.sentence === "Choose who receives it to see the totals."
      && vErr.tiles.length === 0 && (vErr.error ?? "").startsWith("Couldn't load the estimate"),
    `${json(vNoAud)} · ${json(vErr)}`);

  /* ══ §6 · THE WIRING ═════════════════════════════════════════════════════════════════════════════════════════ */
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts?: Record<string, string> };
  const chain = String(pkg.scripts?.predeploy ?? "").split("&&").map((s) => s.trim());
  ok(p(L.predeploy),
    pkg.scripts?.["test:campaign-estimate"] === "tsx scripts/campaign-estimate.test.mts"
      && pkg.scripts?.["red:campaign-estimate"] === "tsx scripts/campaign-estimate.test.mts --prove-red"
      && chain.includes("npm run test:campaign-estimate"),
    `key ${pkg.scripts?.["test:campaign-estimate"] ?? "MISSING"} · on predeploy ${chain.includes("npm run test:campaign-estimate")}`);

  ok(p(L.wiring),
    impl.sources.estimate.includes("refreshSmsBalance({ maxAgeMs: ESTIMATE_BALANCE_MAX_AGE_MS, budgetMs: SMS_BALANCE_RENDER_BUDGET_MS })")
      && ESTIMATE_BALANCE_MAX_AGE_MS <= 60_000
      && campaignsTsx.length === 0 && roleLoaderCallers.length === 0
      // CONTROL: the import detector can match at all — a directory that does not exist yet must not read as "clean".
      && MONEY_IMPORT.test('import { formatTzs, formatNumber } from "@/lib/utils";'),
    `${campaignsTsx.length + roleLoaderCallers.length} offender(s) ${[...campaignsTsx, ...roleLoaderCallers].join(", ")}`);

  const valueImports = (src: string) =>
    [...src.matchAll(/^[ \t]*import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  const costImports = valueImports(impl.sources.costModule);
  const estImports = valueImports(impl.sources.estimateModule);
  ok(p(L.clientSafe),
    costImports.join(",") === "@/lib/sms-compose" && estImports.length >= 3 && estImports.every((s) => !s.includes("server")),
    `${costImports.join(",")} · ${estImports.join(",")}`);
}

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`\ncampaign-estimate: ${pass} passed, ${fail} failed · ${sendCalls} send request(s) (must be 0)`);
  process.exitCode = fail === 0 && sendCalls === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline: ${pass} passed, ${fail} failed\n`);

  /** The loader's own snapshot, as a loader that "reads the balance" without asking anyone would hand it over. */
  const snapshotRead = async (): Promise<SmsBalanceRead> => {
    const s = smsBalanceSnapshot();
    return { tzs: s.tzs, at: s.at, outcome: "reused", stale: s.stale, error: null };
  };
  const withMoney = (e: CampaignEstimate, patch: Partial<NonNullable<CampaignEstimate["money"]>>): CampaignEstimate =>
    e.money ? { ...e, money: { ...e.money, ...patch } } : e;

  const CASES: Array<{ name: string; expect: string[]; impl: Impl }> = [
    {
      name: "R1 (the plan's RED) · render TZS unconditionally — the loader's decider says yes to everyone",
      expect: [L.noRead, L.noMoney],
      impl: { ...REAL, loadFor: (role, audience, deps) => loadEstimateInputsFor(role, audience, { ...deps, moneyVisible: async () => true }) },
    },
    {
      name: "R2 · a decider on the DOMAIN axis only — ADMIN bypasses domains, so D3 has no witness",
      expect: [L.d3],
      impl: { ...REAL, decider: (role) => canView(role, "accounting") },
    },
    {
      name: "R3 · a decider reading `masked` as readable (readCell !== \"none\")",
      expect: [L.masked],
      impl: { ...REAL, decider: async (role) => (await canView(role, "accounting")) && (await readCell(role, "money.figures")) !== "none" },
    },
    {
      name: "R4 · the view renders a cost tile of 'TZS —' when there is no money",
      expect: [L.noMoney],
      impl: {
        ...REAL,
        view: (e, now) => {
          const v = estimateView(e, now);
          return e.state === "ready" && !e.money ? { ...v, tiles: [...v.tiles, { key: "cost", label: "Cost", value: "TZS —" }] } : v;
        },
      },
    },
    {
      name: "R5 · the walk accepts chunks holding ACCEPTED rows that were never delivered",
      expect: [L.delivered],
      impl: {
        ...REAL,
        measure: (rows, o) => measureSegmentCost(rows.map((r) => (r.status === "ACCEPTED" && r.balanceTzs !== null ? { ...r, status: "DELIVERED" as const, deliveredAt: r.sentAt } : r)), o),
      },
    },
    {
      name: "R6 · the walk takes the MEAN of the pairs instead of the median",
      expect: [L.median],
      impl: {
        ...REAL,
        measure: (rows, o) => {
          const m = measureSegmentCost(rows, o);
          if (m.kind !== "measured") return m;
          // The SAME clean pairs the real walk keeps, averaged — only the statistic changes.
          const units = validCostPairs(rows, o).map((pr) => pr.unit);
          return { ...m, tzsPerSegment: units.reduce((a, b) => a + b, 0) / units.length };
        },
      },
    },
    {
      name: "R7 · segmentsOf answers 1 for every row — a two-segment invite priced as one",
      expect: [L.segments],
      impl: { ...REAL, segmentsOf: () => 1, measure: (rows, o) => measureSegmentCost(rows.map((r) => ({ ...r, bodyLen: 1 })), o) },
    },
    {
      name: "R8 · balanceFigureOf keeps a stale figure",
      expect: [L.unreadable, L.unreadableWords],
      impl: { ...REAL, figureOf: (r) => (r && r.tzs !== null && r.at !== null ? { kind: "live", tzs: r.tzs, at: r.at } : balanceFigureOf(r)) },
    },
    {
      name: "R9 · the balance dep returns the in-process snapshot instead of asking the vendor",
      expect: [L.vendor],
      impl: { ...REAL, loadFor: (role, audience, deps) => loadEstimateInputsFor(role, audience, { readBalance: snapshotRead, ...deps }) },
    },
    {
      name: "R10 · coverage computed without the reserve — floor(credit / price)",
      expect: [L.reserve],
      impl: {
        ...REAL,
        estimate: (i, v) => {
          const e = campaignEstimate(i, v);
          const m = e.money;
          if (!m || m.tzsPerSegment === null || m.balance.kind !== "live" || e.segmentsPerRecipient === null) return e;
          return withMoney(e, { covers: Math.floor(m.balance.tzs / (m.tzsPerSegment * e.segmentsPerRecipient)) });
        },
      },
    },
    {
      name: "R11 · the duration floor uses the SLOWEST chunk",
      expect: [L.floor],
      impl: {
        ...REAL,
        pace: (rows, o) => {
          const t = chunkTimes(rows, o);
          return t.length >= 3 ? { minChunkMs: Math.max(...t), chunks: t.length, batchMax: o.batchMax } : null;
        },
      },
    },
    {
      name: "R12 · a configured price captioned as measured",
      expect: [L.captions],
      impl: {
        ...REAL,
        view: (e, now) => {
          const v = estimateView(e, now);
          if (e.money?.cost.kind !== "configured") return v;
          return { ...v, tiles: v.tiles.map((t) => (t.key === "cost" ? { ...t, note: "TZS 6 a segment, estimated from the last 0 sends" } : t)) };
        },
      },
    },
    {
      name: "R13 · X15 · the estimate prices the FORECAST — the confirmation shows less than the exposure it approves",
      expect: [L.ceiling],
      impl: {
        ...REAL,
        estimate: (i, v) => campaignEstimate(
          i.audience && i.audience.ok && i.audience.forecast !== null ? { ...i, audience: { ...i.audience, population: i.audience.forecast } } : i, v),
      },
    },
    {
      name: "R14 · the walk ignores sends with no reply — a QUEUED or UNKNOWN row between two readings is not seen",
      expect: [L.window],
      impl: { ...REAL, measure: (rows, o) => measureSegmentCost(rows.filter((r) => r.status !== "QUEUED" && r.status !== "UNKNOWN"), o) },
    },
    {
      name: "R15 · a failed audience count read as zero",
      expect: [L.states],
      impl: {
        ...REAL,
        estimate: (i, v) => campaignEstimate(i.audience && i.audience.ok === false ? { ...i, audience: { ok: true, population: 0, forecast: 0 } } : i, v),
      },
    },
    {
      name: "R16 · the pure estimate module imports the server store",
      expect: [L.clientSafe],
      impl: { ...REAL, sources: { ...REAL_SOURCES, estimateModule: REAL_SOURCES.estimateModule + "\n" + 'import { db } from "@/lib/server/store";' } },
    },
    {
      name: "R17 · estimate.ts counts its own audience behind the card's back",
      expect: [L.noAudienceImport],
      impl: { ...REAL, sources: { ...REAL_SOURCES, estimate: REAL_SOURCES.estimate + "\n" + 'import { contactAudience } from "@/lib/server/marketing/audience";' } },
    },
    {
      name: "R18 · a decider that returns a constant",
      expect: [L.grid],
      impl: { ...REAL, decider: async () => false },
    },
    {
      name: "R19 · a decider that hard-codes GROWTH out",
      expect: [L.control],
      impl: { ...REAL, decider: async (role) => (role === "GROWTH" ? false : campaignMoneyVisible(role)) },
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    await runAssertions(c.impl, tag);
    const missed = c.expect.filter((e) => !failed.includes(`${tag}${e}`));
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (missed.length) problems.push(`case ${i + 1} (${c.name}): red, but not on "${missed.join(" + ")}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect.join(" + ")}\n`);
  }
  // The suite restores what it planted: the grants, the snapshot and the price env, so nothing leaks past it.
  __resetGrantsForTest();
  __resetReadGrantsForTest();
  if (sendCalls !== 0) problems.push(`${sendCalls} SEND request(s) reached the stub — this suite must never send`);
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
// ⛔ Explicit: a lingering handle in an imported module must never hang the predeploy chain.
process.exit(Number(process.exitCode ?? 1));
