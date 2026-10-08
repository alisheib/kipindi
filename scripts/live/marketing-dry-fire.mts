/**
 * THE SMS CAMPAIGN ENGINE'S DRY-FIRE STRESS HARNESS — `npm run qa:marketing-dry-fire` (NOT in the predeploy chain).
 *
 * Before the engine's first real SMS the owner wants it stress-tested end to end on our own data: thousands of made-up
 * recipients, a FAKE carrier (NO real SMS, ever), injected failures, concurrency, Pause / Resume / Stop mid-run, crash recovery
 * and receipts — every invariant PROVEN, with numbers. This drives the REAL services — `startCampaign` · `campaignStep` ·
 * `pauseCampaign` · `resumeCampaign` · `stopCampaign`, the real enqueue, the real `runCampaignSlice` over the real gate and the
 * real `sendBatch`, the real reaper, the real receipt route — over a seeded world, with a fake Blackball installed as `fetch`.
 *
 *   npm run qa:marketing-dry-fire -- --seed=7 --n=1000          the memory twin
 *   … --pg                                                       a LOOPBACK scratch Postgres (the lead's, under the heavy lock)
 *   … --only=3,4                                                 some scenarios
 *   flags: --seed=N (default 1) · --n=N (SCALE's audience, default 3000) · --json=PATH · --no-json · --quiet · --help
 *
 * ── THE SEVEN SCENARIOS (each its own section) ─────────────────────────────────────────────────────────────────────────────
 *   1 SCALE         one campaign of N, contacts and players, some stopped/self-excluded/…, duplicates — ONE driver, to DONE
 *   2 TWO DRIVERS   two tabs of one process, then two processes (a deploy's overlap): never a double send
 *   3 PAUSE/RESUME/STOP   pause at ~30 %, nothing starts; resume; a pause mid-slice; stop at ~70 % with a group in flight
 *   4 FAULTS        a refused batch, a throw, lost replies, a slow gate and a slow send, the money signal, the window, a code failure,
 *                   people the gate cannot answer for
 *   5 CRASH AND REAP   steps that die after claiming; the reaper settles from the evidence once the claim is old enough
 *   6 RECEIPTS      DELIVRD · UNDELIV · EXPIRED · unknown · duplicate · out of order, through the real route
 *   7 CREDIT        the credit kept for login codes, and the per-campaign limit: a campaign that would cross them stops BEFORE
 * ── THE SIX INVARIANTS, asserted after every scenario over the whole store ─────────────────────────────────────────────────
 *   INV1 no double send · INV2 every row terminal · INV3 nobody protected is sent · INV4 counts add up · INV5 audit · INV6 time
 * Exit code: 0 all held · 1 an invariant or a claim failed · 2 REFUSED (the environment is not a safe one) · 3 the harness itself crashed.
 *
 * ⛔ NEVER PRODUCTION, NEVER RAILWAY, NEVER A REAL SMS. It refuses to start unless the SMS rail is the console stub, no gateway
 * credential and no Redis are in the environment, and the store is the memory twin — or, with --pg, a database whose host is
 * loopback and whose server's data directory is this repo's `.pgscratch` cluster. It installs its own fake carrier (an address
 * that cannot resolve, dummy keys) and fails if anything else is asked for. It reads no `.env` file.
 * ⭐ DETERMINISTIC: every choice is a function of --seed, so a failing run replays exactly with the same flags.
 * ⭐ THE VIRTUAL CLOCK: `Date` is replaced by the real clock plus an offset the harness moves FORWARD ("ten minutes later" is one
 * jump), so the send window, the send-age bound and the reaper's age are driven, not waited for.
 * ⭐ THE SEAMS (`RunOptions.seams`): `scripts/marketing-dry-fire.test.mts` plants defects through them to prove each invariant bites.
 *
 * Run it ONLY in this worktree's memory mode unless the heavy lock is yours (`--pg` boots a Postgres). Written 2026-10-08.
 * ⛔ This file holds no backslash (an editing tool decodes them).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clockOf, makeRng, ms, num, out, pad, table, tapConsole } from "./dry-fire/kit.mts";
import { makeCarrier } from "./dry-fire/carrier.mts";
import type { Attribution } from "./dry-fire/carrier.mts";
import { assertScratchDatabase, guardEnvironment, makeReader, resetMemoryStore, resetProcessGlobals } from "./dry-fire/store-io.mts";
import { loadServer } from "./dry-fire/server.mts";
import { assertRailIsFake, installFakeRail, makeHarness } from "./dry-fire/core.mts";
import type { Claim, Harness, RunOptions } from "./dry-fire/core.mts";
import { evaluateInvariants, INV_IDS, INV_NAMES } from "./dry-fire/invariants.mts";
import type { Inv } from "./dry-fire/invariants.mts";
import { ensureWordings, seedOfficer } from "./dry-fire/world.mts";
import { SCENARIOS } from "./dry-fire/scenarios.mts";

export type { RunOptions } from "./dry-fire/core.mts";
export type { Seams, Claim } from "./dry-fire/core.mts";
export { INV_IDS, INV_NAMES } from "./dry-fire/invariants.mts";

/* ══ THE REPORT ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

export type ScenarioReport = {
  n: number;
  key: string;
  name: string;
  size: number;
  durationMs: number;
  claims: Claim[];
  invariants: Inv[];
  metrics: Record<string, unknown>;
  crashed: string | null;
};

export type Report = {
  tool: "marketing-dry-fire";
  seed: number;
  n: number;
  mode: "memory" | "pg";
  node: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  carrier: { requests: number; messages: number; refused: number; billedTzs: number; stray: string[] };
  scenarios: ScenarioReport[];
  /** Every invariant and claim that failed, flat — what a red control compares. */
  failedInvariants: string[];
  failedClaims: string[];
  passed: boolean;
};

export class RefusedError extends Error {
  constructor(readonly reasons: string[]) {
    super(`REFUSED: ${reasons.join(" | ")}`);
    this.name = "RefusedError";
  }
}

/* ══ THE RUN ════════════════════════════════════════════════════════════════════════════════════════════════════════ */

declare global {
  // eslint-disable-next-line no-var
  var __DRY_FIRE_RUNS__: number | undefined;
}

export async function runDryFire(opts: RunOptions): Promise<Report> {
  const verdict = guardEnvironment(process.env, opts.pg);
  if (!verdict.ok) throw new RefusedError(verdict.reasons);
  if (verdict.mode === "pg") {
    if ((process.env.USE_PRISMA_DAL ?? "").toLowerCase() === "false") throw new RefusedError(["USE_PRISMA_DAL=false would put the store back on memory while --pg promises a database"]);
    // ⛔ before the store loads: it picks Prisma or its memory twin at import time
    process.env.DATABASE_URL = verdict.databaseUrl as string;
  }
  const clock = clockOf();
  const S = await loadServer();
  const mode = verdict.mode;
  if (mode === "pg") {
    const where = await assertScratchDatabase();
    opts.log(`scratch database confirmed: ${where.dataDirectory} (empty)`);
  } else {
    resetMemoryStore();
  }
  resetProcessGlobals();

  const runId = (globalThis.__DRY_FIRE_RUNS__ = (globalThis.__DRY_FIRE_RUNS__ ?? 0) + 1);
  const startedAtReal = new Date().toISOString();
  const t0 = clock.real();

  const attribute = async (reference: string): Promise<Attribution | null> => {
    const m = await Promise.resolve(S.db.smsMessage.findByReference(reference));
    if (m === null || m === undefined) return null;
    if (m.targetType !== "SmsCampaignRecipient" || !m.targetId) return { campaignId: null, recipientId: null, claimedAt: null, purpose: m.purpose };
    const r = await Promise.resolve(S.db.smsCampaignRecipient.find(m.targetId));
    return { campaignId: r?.campaignId ?? null, recipientId: m.targetId, claimedAt: r?.claimedAt ?? null, purpose: m.purpose };
  };
  const carrier = makeCarrier({ attribute });
  const restoreRail = installFakeRail(carrier);
  const tap = tapConsole();
  let restoreStore: () => void = () => undefined;
  const scenarios: ScenarioReport[] = [];
  let h: Harness | null = null;
  try {
    await assertRailIsFake();
    const officerId = `usr_df${runId}_officer`;
    const reader = await makeReader(mode);
    h = makeHarness({
      S, opts, mode, seed: opts.seed, rng: makeRng(opts.seed, `run`), clock, carrier, reader, tap,
      officer: { id: officerId, name: "Amina" },
      actor: { userId: officerId, mayAct: true, reads: true, money: true },
      viewer: { userId: officerId, mayAct: true, reads: true, money: true },
      runId, startedAt: clock.now(), seams: opts.seams,
    });
    await seedOfficer(h, officerId, "Amina");
    const wordings = await ensureWordings(h);
    if (!wordings.ok) throw new Error(`dry-fire cannot save the import wordings: ${wordings.why}`);
    if (opts.seams.store) restoreStore = opts.seams.store(h);

    const wanted = opts.only === null ? SCENARIOS : SCENARIOS.filter((s) => (opts.only as number[]).includes(s.n));
    for (const sc of wanted) {
      h.scn = sc.n;
      h.claims = [];
      // each scenario starts clean: its own processes, the owner's switch open, the carrier calm, the window open
      h.fresh("A");
      carrier.setPlan(opts.seams.carrierPlan ? opts.seams.carrierPlan(null) : null);
      carrier.setBalancePlan("ok");
      carrier.onRequest = null;
      delete (globalThis as { __50PICK_OTP_LAST_FAILURE_AT?: number }).__50PICK_OTP_LAST_FAILURE_AT;
      delete (globalThis as { __50PICK_MONEY_CHORES?: unknown }).__50PICK_MONEY_CHORES;
      delete (globalThis as { __50PICK_SMS_BALANCE?: unknown }).__50PICK_SMS_BALANCE;
      clock.alignToWindow();
      h.sw.openFor(6 * 3_600_000);
      const size = sc.size(opts.n);
      opts.log(`${NLG}[${sc.n}/${SCENARIOS.length}] ${sc.name} — ${num(size)} people`);
      const ts = clock.real();
      let metrics: Record<string, unknown> = {};
      let crashed: string | null = null;
      try {
        metrics = await sc.run(h, size);
      } catch (err) {
        crashed = String((err as Error)?.stack ?? err).split(String.fromCharCode(10)).slice(0, 4).join(" | ").slice(0, 600);
        h.claims.push({ id: `S${sc.n}.run`, label: "the scenario ran to its end", ok: false, detail: `threw: ${crashed}` });
      }
      const durationMs = clock.real() - ts;
      const invariants = await evaluateInvariants(h);
      scenarios.push({ n: sc.n, key: sc.key, name: sc.name, size, durationMs, claims: h.claims.slice(), invariants, metrics, crashed });
      printScenario(opts.log, scenarios[scenarios.length - 1]);
    }
    if (carrier.stray.length > 0) {
      const last = scenarios[scenarios.length - 1];
      if (last) last.claims.push({ id: "RAIL.stray", label: "nothing but the fake carrier was ever asked for", ok: false, detail: `stray requests: ${carrier.stray.join(", ")}` });
    }
  } finally {
    restoreStore();
    tap.stop();
    restoreRail();
  }

  const failedInvariants = [...new Set(scenarios.flatMap((s) => s.invariants.filter((i) => !i.ok).map((i) => i.id)))];
  const failedClaims = [...new Set(scenarios.flatMap((s) => s.claims.filter((c) => !c.ok).map((c) => c.id)))];
  const refused = carrier.requests.filter((r) => r.answered === "refused").length;
  const report: Report = {
    tool: "marketing-dry-fire", seed: opts.seed, n: opts.n, mode, node: process.version, startedAt: startedAtReal, finishedAt: new Date().toISOString(),
    durationMs: Math.round(clock.real() - t0),
    carrier: {
      requests: carrier.requests.length, messages: carrier.requests.reduce((n, r) => n + r.messages.length, 0), refused,
      billedTzs: carrier.billed(), stray: carrier.stray.slice(),
    },
    scenarios, failedInvariants, failedClaims,
    passed: failedInvariants.length === 0 && failedClaims.length === 0 && scenarios.length > 0,
  };
  return report;
}

const NLG = "";

/* ══ PRINTING ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

function printScenario(log: (line: string) => void, s: ScenarioReport): void {
  for (const c of s.claims) log(`  ${c.ok ? "PASS" : "FAIL"} ${c.id} — ${c.label.slice(0, 110)}${c.detail ? ` · ${c.detail.slice(0, 230)}` : ""}`);
  for (const i of s.invariants) log(`  ${i.ok ? "PASS" : "FAIL"} ${i.id} ${i.name} — ${i.detail.slice(0, 260)}`);
  log(`  ${s.invariants.every((i) => i.ok) && s.claims.every((c) => c.ok) ? "held" : "FAILED"} in ${ms(s.durationMs)}`);
}

export function summaryTable(r: Report): string[] {
  const header = ["#", "scenario", "people", ...INV_IDS.map((i) => `${i} ${INV_NAMES[i]}`), "claims", "time"];
  const rows = r.scenarios.map((s) => [
    String(s.n), s.name, num(s.size),
    ...INV_IDS.map((id) => (s.invariants.find((i) => i.id === id)?.ok ? "PASS" : "FAIL")),
    `${s.claims.filter((c) => c.ok).length}/${s.claims.length}`, ms(s.durationMs),
  ]);
  return table(header, rows, ["r", "l", "r", "l", "l", "l", "l", "l", "l", "r", "r"]);
}

/** The SCALE numbers the owner asked for: slices, their sizes, per-slice gate/send time, total time. */
export function scaleBlock(r: Report): string[] {
  const s = r.scenarios.find((x) => x.n === 1);
  if (!s) return [];
  const m = s.metrics as Record<string, any>;
  const f = (x: any): string => (x && x.count ? `min ${ms(x.min)} · median ${ms(x.median)} · p95 ${ms(x.p95)} · max ${ms(x.max)}` : "-");
  const sizes = m.sizes && m.sizes.count ? `min ${m.sizes.min} · median ${m.sizes.median} · p95 ${m.sizes.p95} · max ${m.sizes.max}` : "-";
  return [
    `SCALE · ${num(m.people)} people (${num(m.walkRows)} walk rows → ${num(m.rows)} recipient rows) · ${m.slices} slices · ${m.steps} driver steps`,
    `  slice size   ${sizes} (first ${Array.isArray(m.firstSizes) ? m.firstSizes.join(", ") : "-"})`,
    `  gate time    ${f(m.gateMs)}   (per slice, the engine's own figure: claim → the wire)`,
    `  send time    ${f(m.sendMs)}   (per slice: sendBatch over the fake carrier)`,
    `  total        build ${ms(m.buildMs)} · enqueue ${ms(m.enqueueMs)} (${m.enqueueSteps} steps) · slices ${ms(m.driveMs)} · all ${ms(m.totalMs)}` + (m.recipientsPerSecond ? ` · ${num(m.recipientsPerSecond)} recipients/s` : ""),
    `  carrier      ${num(m.carrierMessages)} messages in ${num(m.carrierRequests)} requests, billed TZS ${num(m.billedTzs)}`,
  ];
}

/* ══ THE COMMAND LINE ═══════════════════════════════════════════════════════════════════════════════════════════════ */

export type Cli = { opts: RunOptions; json: string | null; help: boolean };

export function parseArgs(argv: readonly string[], log: (line: string) => void): Cli {
  const get = (name: string): string | undefined => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit === undefined ? undefined : hit.slice(name.length + 3);
  };
  const intOf = (v: string | undefined, d: number, label: string): number => {
    if (v === undefined) return d;
    const n = Number(v);
    if (!Number.isSafeInteger(n) || n < 0) throw new Error(`--${label}=${v} is not a whole number`);
    return n;
  };
  const onlyRaw = get("only");
  const only = onlyRaw === undefined ? null : onlyRaw.split(",").map((x) => Number(x.trim())).filter((x) => Number.isInteger(x));
  const quiet = argv.includes("--quiet");
  const defaultJson = ".qa-shots/marketing-setup/dry-fire/report.json";
  return {
    opts: { seed: intOf(get("seed"), 1, "seed"), n: intOf(get("n"), 3000, "n"), pg: argv.includes("--pg"), only, log: quiet ? () => undefined : log, seams: {} },
    json: argv.includes("--no-json") ? null : get("json") ?? defaultJson,
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

const HELP = [
  "marketing-dry-fire — the SMS campaign engine's dry-fire stress harness (a fake carrier; no SMS can leave).",
  "  --seed=N   the run's seed (default 1); the same seed and flags replay a run exactly",
  "  --n=N      SCALE's audience size (default 3000); the other scenarios derive theirs",
  "  --only=1,3 run some scenarios",
  "  --pg       use a LOOPBACK scratch Postgres (DATABASE_URL or VERIFY_DATABASE_URL; the .pgscratch cluster only) instead of memory",
  "  --json=P   where the JSON report goes (default .qa-shots/marketing-setup/dry-fire/report.json); --no-json to skip",
  "  --quiet    print only the summary",
];

export async function main(argv: readonly string[]): Promise<number> {
  const cli = parseArgs(argv, out);
  if (cli.help) { for (const l of HELP) out(l); return 0; }
  out(`DRY-FIRE · seed ${cli.opts.seed} · n ${num(cli.opts.n)} · ${cli.opts.pg ? "scratch Postgres (loopback)" : "memory twin"} · fake carrier (nothing can leave)`);
  let report: Report;
  try {
    report = await runDryFire(cli.opts);
  } catch (err) {
    if (err instanceof RefusedError) {
      out("");
      out("REFUSED — the dry-fire will not run here:");
      for (const r of err.reasons) out(`  · ${r}`);
      return 2;
    }
    out(`HARNESS CRASHED: ${String((err as Error)?.stack ?? err).slice(0, 1600)}`);
    return 3;
  }
  out("");
  for (const l of scaleBlock(report)) out(l);
  out("");
  for (const l of summaryTable(report)) out(l);
  out("");
  out(`carrier: ${num(report.carrier.messages)} messages in ${num(report.carrier.requests)} requests (${report.carrier.refused} refused outright), billed TZS ${num(report.carrier.billedTzs)} · ${ms(report.durationMs)} in all`);
  if (cli.json !== null) {
    const path = resolve(process.cwd(), cli.json);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(report, null, 2) + String.fromCharCode(10), "utf8");
    out(`report: ${cli.json}`);
  }
  if (report.passed) {
    out(`ALL HELD — ${INV_IDS.length} invariants × ${report.scenarios.length} scenarios, ${report.scenarios.reduce((n, s) => n + s.claims.length, 0)} claims (seed ${report.seed})`);
    return 0;
  }
  out(`FAILED — invariants: ${report.failedInvariants.join(", ") || "none"} · claims: ${report.failedClaims.join(", ") || "none"} (replay with --seed=${report.seed} --n=${report.n})`);
  return 1;
}

/** Run as a command when this file is the entry point; importing it (the suites do) runs nothing. */
const entry = (process.argv[1] ?? "").toLowerCase();
const self = fileURLToPath(import.meta.url).toLowerCase();
if (entry !== "" && resolve(entry) === self) {
  main(process.argv.slice(2)).then(
    (code) => { process.exit(code); },
    (err) => { out(`HARNESS CRASHED: ${String((err as Error)?.stack ?? err).slice(0, 1600)}`); process.exit(3); },
  );
}

export { pad };
