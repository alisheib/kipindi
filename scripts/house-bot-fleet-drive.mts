/**
 * THE FLEET DRIVE — several accounts, different rules, ONE real engine, on a real clock and a real database.
 *
 *   npm run qa:house-bot-fleet                 (boots its own scratch Postgres)
 *   npm run qa:house-bot-fleet -- --only A,B   (one or more lanes)
 *
 * ── WHY IT EXISTS ────────────────────────────────────────────────────────────────────────────────────────
 * `house-bots-local-drive.mts` is the only other instrument where the REAL planner decides and the REAL
 * poller fires on a real clock; everything else inserts an intent by hand and calls the money seam directly.
 * But it runs its three accounts strictly one after another, and five things were therefore covered nowhere:
 *
 *   1. SEVERAL accounts through the engine at once. `planFillAndOpener` is called with a single-element bot
 *      array at every call site in the engine suite.
 *   2. An officer changing rules while the engine's timers are TICKING.
 *   3. ACCURACY end to end — rules → PENDING intent → PLACED position → wallet, in ONE chain. The existing
 *      suites assert the first half and the second half, and never join them.
 *   4. Money conservation over an engine-driven session (the drive runs no trial balance at all).
 *   5. Settlement and the fleet's own P&L.
 *
 * ── HOW IT IS SAFE ───────────────────────────────────────────────────────────────────────────────────────
 * ⛔ It CREATES AND DROPS ITS OWN DATABASE, named after this process, on the loopback scratch cluster, and it
 * turns the master switch ON **in that database only**. `NODE_ENV=production` is refused, a non-loopback host
 * is refused, a URL naming production is refused, and the URL is checked AGAIN immediately before the switch
 * is touched. Production's switch is never read and never written.
 *
 * ── WHAT MAKES THE NUMBERS TRUSTWORTHY ───────────────────────────────────────────────────────────────────
 * ⛔ THE EXPECTED STAKES ARE HAND-DERIVED LITERALS in `lib/house-bot-fleet-roster.mts`, not a second
 * implementation and not a call into `decide.ts`. A literal cannot drift; it can only be wrong, and a wrong
 * literal is red on its first run. The roster's header argues the alternatives out.
 * ⛔ AND THE RANDOMNESS IS REMOVED BY CONFIGURATION, not by stubbing the engine's RNG: `jitterPct = 0`,
 * `delayMin === delayMax`, `reactProbability = 100`, a fixed opener band. The engine keeps its real
 * `crypto.randomInt`. Two lanes put randomness BACK on purpose and say so in their own assertion names.
 *
 * ⛔ IT ASSEMBLES ITS OWN `EngineTicks`. `plannerTicks`/`triggerTicks`/`workerTicks` throw the `PlannerPass`,
 * `SweepPass` and `PollerPass` structures away and cannot forward a draw — so a drive built on them can only
 * read durable rows and can never say WHICH duty failed, or that a pass decided nothing on purpose. These
 * call the same functions those factories call.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

import { ROSTER, EXPECT, FLEET, COUNTER_CUTOFF_MIN } from "./lib/house-bot-fleet-roster.mts";
/**
 * ── LANE MODULES ─────────────────────────────────────────────────────────────────────────────────────────
 * Lanes D onward each live in ONE file of their own (`lib/house-bot-fleet-lane-<x>.mts`), so a lane can be
 * built, run and mutation-proved without touching another lane's file. Each module exports `LANE` (the letter
 * `--only` selects it by), `roster` (its desks, merged into the fleet BEFORE any account is created — a desk
 * is designated and STARTED before the switch goes on, whatever lane it belongs to), `expect` (its
 * hand-derived literals, merged into the oracle under the same rule as the roster's: they import nothing from
 * `src/`), and `run(env, prior)`. ⛔ A lane whose `run` returns null is reported NOT MEASURED, never as a
 * pass — a lane that is not built yet must not read as a lane that is green.
 */
import * as LANE_D from "./lib/house-bot-fleet-lane-d.mts";
import * as LANE_E from "./lib/house-bot-fleet-lane-e.mts";
import * as LANE_F from "./lib/house-bot-fleet-lane-f.mts";
import * as LANE_G from "./lib/house-bot-fleet-lane-g.mts";
import * as LANE_M from "./lib/house-bot-fleet-lane-money.mts";
const LANE_MODULES = [LANE_D, LANE_E, LANE_F, LANE_G, LANE_M] as const;
const ROSTER_ALL = [...ROSTER, ...LANE_MODULES.flatMap((m) => m.roster)];
const EXPECT_ALL: Record<string, unknown> = Object.assign({}, EXPECT, ...LANE_MODULES.map((m) => m.expect));
{
  /* ⛔ Two lanes claiming one desk key, or two modules claiming one letter, is a fixture that answers the wrong
     lane's question — refused before anything is created. */
  const keys = ROSTER_ALL.map((s) => s.key);
  const dupKey = keys.find((k, i) => keys.indexOf(k) !== i);
  const letters = LANE_MODULES.map((m) => m.LANE);
  const dupLane = letters.find((l, i) => letters.indexOf(l) !== i || ["A", "B", "C"].includes(l));
  if (dupKey || dupLane) { console.error(`REFUSED — duplicate desk key ${dupKey ?? "-"} / lane letter ${dupLane ?? "-"}`); process.exit(2); }
}

const ONLY = (() => {
  const i = process.argv.indexOf("--only");
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1].split(",").map((s) => s.trim().toUpperCase()) : null;
})();
const laneWanted = (lane: string): boolean => ONLY === null || ONLY.includes(lane.toUpperCase());

let fail = 0;
let count = 0;
const ok = (name: string, pass: boolean, detail: unknown = ""): void => {
  count++;
  const d = typeof detail === "string" ? detail : JSON.stringify(detail);
  console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${pass || !d ? "" : ` — ${d}`}`);
  if (!pass) fail++;
};
const section = (t: string): void => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 104 - t.length))}`);
const j = (v: unknown): string => JSON.stringify(v) ?? String(v);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ── the refusals, copied from the drive because a guard that differs is a guard nobody trusts ────────────
if (process.env.NODE_ENV === "production") {
  console.error("REFUSED — NODE_ENV=production. This drive turns the master switch ON against a database it creates.");
  process.exit(2);
}
const RAW = process.env.VERIFY_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
if (!RAW) {
  console.error("!! NOT MEASURED — no cluster. Run `npm run qa:house-bot-fleet`, which boots a scratch Postgres.");
  process.exit(3);
}
let host = "";
try { host = new URL(RAW).hostname; } catch { /* refused below */ }
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error(`REFUSED — this drive creates a database, turns the master switch ON in it and drops it. Loopback only; the URL named ${j(host)}.`);
  process.exit(2);
}
if (/rlwy\.net|railway\.app|50pick\.tz|railway\.internal/i.test(RAW)) {
  console.error("REFUSED — that URL names production.");
  process.exit(2);
}

const { spawnSync } = await import("node:child_process");
const { dirname, join } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const pgLib: Any = (await import("pg")).default;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `hb_fleet_${process.pid}`;
const URL_ = `${BASE}/${DB}?connect_timeout=30`;
const withAdmin = async (fn: (c: Any) => Promise<void>): Promise<void> => {
  const c = new pgLib.Client({ connectionString: `${BASE}/postgres` });
  await c.connect();
  try { await fn(c); } finally { await c.end().catch(() => {}); }
};

console.log(`\n══ house bots · THE FLEET ══   database ${DB} on ${host}`);
await withAdmin(async (c) => {
  await c.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
  await c.query(`CREATE DATABASE "${DB}"`);
  /* ⛔ UTC, chosen rather than inherited. The engine REFUSES to start on any other zone (A4), and the
     drive next door proves that refusal; this one needs a running engine, so it sets the zone it needs. */
  await c.query(`ALTER DATABASE "${DB}" SET timezone TO 'UTC'`);
});

let exitCode = 1;
try {
  const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: ROOT, env: { ...process.env, DATABASE_URL: URL_ }, encoding: "utf8",
    shell: process.platform === "win32", timeout: 10 * 60_000,
  });
  ok("fleet.0 · prisma migrate deploy applies every migration to the fleet's own database", mig.status === 0,
    (mig.stderr ?? "").split("\n").slice(-2).join(" "));
  if (mig.status !== 0) throw new Error("the fleet's database was not migrated");

  /* ⛔ THE ENV IS SET BEFORE THE FIRST STORE IMPORT — every store picks its backend when its module is
     first imported. */
  process.env.DATABASE_URL = URL_;
  process.env.USE_PRISMA_DAL = "true";
  /**
   * ⭐ THE META-MUTATION, AND IT IS THE MOST IMPORTANT CHECK IN THIS FILE.
   *
   * `KP_FLEET_SILENT=1` leaves the engine's own env gate OFF, so no timer is ever armed and nothing decides.
   * EVERY lane must then go red and the process must exit 1 — not 0, not 3. That is the only thing that
   * proves this instrument CANNOT PASS BY SILENCE, which is the failure this programme has already paid for
   * twice: a suite that is green because nothing ran looks exactly like a suite that is green because
   * everything worked. Run it before trusting any source mutation below it.
   * ⭐ AND THE VERDICT IS NOW MACHINE-CHECKED, by `fleet.silent` after the lanes. It was a sentence here
   * and nothing else until its first real run, which found TWO lane cases that passed with the engine off
   * — an absence asserted as evidence, and `undefined === undefined` read as agreement. A contract that
   * only a reader enforces is a contract that drifts.
   */
  const SILENT = process.env.KP_FLEET_SILENT === "1";
  process.env.HOUSE_BOT_ENGINE = SILENT ? "false" : "true";
  if (SILENT) console.log("\n⚠️  KP_FLEET_SILENT — the engine is switched OFF at its env gate. EVERY lane must go red.");

  const { loadWorld, OFFICER }: Any = await import("./lib/house-bot-world.mts");
  const w: Any = await loadWorld();
  const ENG: Any = await import("../src/lib/server/house-bot/engine.ts");
  const C: Any = await import("../src/lib/house-bot/constants.ts");
  const RULES: Any = await import("../src/lib/house-bot/rules.ts");
  const D: Any = await import("../src/lib/server/house-bot/designation.ts");
  const RCTX: Any = await import("../src/lib/server/house-bot/rules-context.ts");
  const SW: Any = await import("../src/lib/server/house-bot/switch-on.ts");
  const { pollerPass }: Any = await import("../src/lib/server/house-bot/worker.ts");
  const { plannerPass }: Any = await import("../src/lib/server/house-bot/planner.ts");
  const { sweepPass }: Any = await import("../src/lib/server/house-bot/trigger.ts");
  const { houseEngineAlerts }: Any = await import("../src/lib/server/house-bot/emitters.ts");
  const S: Any = await import("../src/lib/server/house-bot-dal.ts");
  const CTX: Any = await RCTX.loadRulesContext();

  /* ═══ THE OBSERVATION LAYER ═══════════════════════════════════════════════════════════════════════════
     ⛔ THE RECORDER IMPLEMENTS ALL FIVE `EngineAlerts` METHODS AND THEN DELEGATES to the real emitters.
     A recorder that omits one (the engine suite's omits `switchedOff`) throws the moment that path runs,
     and it would throw inside a planner duty where the failure reads as "the duty failed". Delegating also
     means the notification chain is exercised rather than replaced. */
  const real = houseEngineAlerts();
  const calls: Array<{ fn: string; code?: string; botId?: string | null; key?: string }> = [];
  const alerts = {
    placed: async (i: Any) => { calls.push({ fn: "placed", botId: i?.houseBotId }); return real.placed(i); },
    once: async (key: Any, m: Any) => { calls.push({ fn: "once", key: String(key), code: m?.code, botId: m?.botId }); return real.once(key, m); },
    security: async (m: Any) => { calls.push({ fn: "security", code: m?.code, botId: m?.botId }); return real.security(m); },
    botStopped: async (bot: Any, ch: Any) => { calls.push({ fn: "botStopped", botId: bot?.id, code: ch?.cause }); return real.botStopped(bot, ch); },
    switchedOff: async (ch: Any) => { calls.push({ fn: "switchedOff", code: ch?.cause }); return real.switchedOff(ch); },
  };
  const seen = (fn: string, code?: string): number =>
    calls.filter((c) => c.fn === fn && (code === undefined || c.code === code)).length;

  const passes: { planner: Any[]; sweep: Any[]; poller: Any[] } = { planner: [], sweep: [], poller: [] };
  /* ⛔ THE OPENER SIDE IS THE ONE DRAW CONFIGURATION CANNOT PIN — it is a separate `DrawRandomInt` whose
     result is written to a durable `OPENER_SIDE_DRAWN` row. `() => 0` is YES. Every OTHER draw keeps the
     engine's real `crypto.randomInt`, which is what lets lane A2 measure real jitter. */
  const drawRandomInt = () => 0;
  const TICKS = {
    hookAlerts: alerts,
    pollerTick: async (ctx: Any) => { passes.poller.push(await pollerPass(ctx, alerts)); },
    plannerTick: async (ctx: Any) => { passes.planner.push(await plannerPass(ctx, { alerts, drawRandomInt })); },
    sweepTick: async (ctx: Any) => { passes.sweep.push(await sweepPass(ctx, { alerts })); },
    requeueMine: async (id: string, excl: string[]) => (await S.houseBotIntentStore.releaseClaims(id, excl)).length,
  };

  /** Wait until `read` answers, or give up — and a give-up is a FAILURE, never a quiet pass. */
  const until = async <T>(what: string, ms: number, read: () => Promise<T | null>): Promise<T | null> => {
    const t0 = Date.now();
    for (;;) {
      const hit = await read();
      if (hit) return hit;
      if (Date.now() - t0 > ms) { console.log(`   … ${what}: nothing after ${Math.round((Date.now() - t0) / 1000)}s`); return null; }
      await sleep(1_000);
    }
  };

  // ── the fleet ──────────────────────────────────────────────────────────────────────────────────────
  section("seeding the fleet");
  /**
   * ⛔ THE ROSTER CEILING IS A PRODUCT LIMIT, AND THE FLEET IS THE FIRST THING HERE TO OUTGROW IT.
   * `maxDesignatedBots` defaults to 5 — which is exactly the five desks of lanes A and B, so nothing
   * noticed until lane C, whose first run was refused `ROSTER_FULL` by `designation.ts` before it had
   * designated anything. It is raised HERE, through the real limits service, in this process's own
   * database, to the product's own maximum. The column's CHECK stops at 20, so a roster that outgrows
   * that is refused in a sentence rather than as an opaque CAS failure fifty lines later.
   */
  const MAX_DESIGNATED = 20;
  const wantedBots = ROSTER_ALL.filter((s) => laneWanted(s.lane)).length;
  if (wantedBots > MAX_DESIGNATED) {
    console.error(`REFUSED — the selected lanes ask for ${wantedBots} accounts and \`maxDesignatedBots\` cannot exceed ${MAX_DESIGNATED}. Split the run with --only.`);
    process.exit(2);
  }
  await w.limits({ maxDesignatedBots: MAX_DESIGNATED });

  /**
   * ⛔ DESIGNATED AND STARTED THROUGH THE SERVICES, never the DAL. `startHouseBot` writes the account's own
   * `scopeFrom`, and an account without one reacts to nothing, for ever, silently — which is the single
   * most expensive fixture mistake available on this feature.
   */
  const mkBot = async (spec: Any): Promise<Any> => {
    const { hashPassword, randomId }: Any = await import("../src/lib/server/crypto.ts");
    const PW = "Tembo-Kubwa-2026!";
    const userId = await w.user({ balance: FLEET.holderBalance });
    const salt = randomId(16);
    await w.setUserFields(userId, {
      passwordHash: await hashPassword(PW, salt), passwordSalt: salt,
      passwordSetAt: new Date().toISOString(), passwordSetVia: "SELF_CHANGE",
    });
    const des = await D.designateHouseBot({ officerId: OFFICER, userId, label: `Fleet ${spec.key}`, note: null, password: PW, submitId: null });
    if (!des?.ok) throw new Error(`designate refused for ${spec.key}: ${j(des)}`);
    const botId = des.bot.id as string;
    const cur = await S.houseBotStore.get(botId);

    const r = structuredClone(RULES.DEFAULT_RULES_V1(CTX));
    r.scope.products.polls = true;
    r.scope.categories = [spec.category];
    r.modes.polls.counter = !!spec.rules.counter;
    r.modes.polls.fill = !!spec.rules.fill;
    r.modes.polls.opener = !!spec.rules.opener;
    r.shaping.jitterPct = spec.rules.jitterPct ?? 0;
    if (spec.rules.roundToTzs) r.shaping.roundToTzs = spec.rules.roundToTzs;
    if (spec.rules.amount) r.counter.amount = { ...spec.rules.amount } as Any;
    if (spec.rules.delaySec != null) { r.counter.delayMinSec = spec.rules.delaySec; r.counter.delayMaxSec = spec.rules.delaySec; }
    if (spec.rules.reactPct != null) r.counter.reactProbabilityPct = spec.rules.reactPct;
    r.counter.triggerStakeMinTzs = spec.band[0];
    r.counter.triggerStakeMaxTzs = spec.band[1];
    if (spec.rules.thinSharePct != null) r.fill.targetThinSharePct = spec.rules.thinSharePct;
    if (spec.rules.leadPollsMin != null) r.fill.leadPollsMin = spec.rules.leadPollsMin;
    r.fill.jitterSec = 0;
    if (spec.rules.openerStakeTzs != null) { r.opener.stakeMinTzs = spec.rules.openerStakeTzs; r.opener.stakeMaxTzs = spec.rules.openerStakeTzs; }
    if (spec.rules.openerDelayMin != null) { r.opener.delayPollsMinMin = spec.rules.openerDelayMin; r.opener.delayPollsMaxMin = spec.rules.openerDelayMin; }

    const saved = await S.houseBotStore.saveRules(botId, cur.rulesVersion, {
      rules: r, ...w.OPEN_CAPS, freqMinGapSec: FLEET.minGapSec, ...(spec.caps ?? {}),
    });
    if (!saved.ok) throw new Error(`saveRules CAS failed for ${spec.key}`);
    const started = await D.startHouseBot({ officerId: OFFICER, botId, rulesContext: CTX });
    if (!started?.ok) throw new Error(`start refused for ${spec.key}: ${j(started)}`);
    return { ...spec, botId, userId };
  };

  const fleet: Record<string, Any> = {};
  for (const spec of ROSTER_ALL) {
    if (!laneWanted(spec.lane)) continue;
    fleet[spec.key] = await mkBot(spec);
  }
  ok("fleet.1 · every account in the roster designated and STARTED through the real services",
    Object.keys(fleet).length === ROSTER_ALL.filter((s) => laneWanted(s.lane)).length, j(Object.keys(fleet)));

  /** A player's stake, optionally aged past its exit close so it counts as locked. */
  const stake = async (marketId: string, side: string, amount: number, ageMs = 0): Promise<Any> => {
    const player = await w.user({ balance: FLEET.playerBalance });
    const r = await w.svc.buyPosition(player, { marketId, side, stake: amount, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`fixture stake refused: ${j(r)}`);
    if (ageMs > 0) await w.backdate(r.data.positionId, ageMs);
    return { player, positionId: r.data.positionId };
  };

  // ── the switch, through the real service ───────────────────────────────────────────────────────────
  section("the master switch — in THIS database, which this process created and drops");
  if (!URL_.includes(DB) || !["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("REFUSED at the switch — the URL is not the database this process created on loopback.");
    process.exit(2);
  }
  const on = await SW.switchOnHouseBots({ actorId: OFFICER, reason: "the fleet drive, on its own scratch database" });
  ok("fleet.on · the master switch went ON through the REAL service (which is also what writes the global scope instant)",
    on?.ok === true, j(on));

  // ── the engine ─────────────────────────────────────────────────────────────────────────────────────
  section(`the engine — first pass in ${C.FIRST_TICK_DELAY_MS / 1000}s, then planner ${C.PLANNER_INTERVAL_MS / 1000}s · sweep ${C.SWEEP_INTERVAL_MS / 1000}s · poller ${C.POLLER_INTERVAL_MS / 1000}s`);
  const started = await ENG.startHouseBotEngine(TICKS);
  ok(SILENT
      ? "fleet.boot · META-MUTATION · the engine REFUSED to start (ENV_DISABLED), so nothing below can decide"
      : "fleet.boot · the REAL engine started (no timer is armed if any of its five boot gates refuses)",
    SILENT ? started?.started === false && started?.refused === "ENV_DISABLED" : started?.started === true, j(started));

  const ticked = await until("the first passes", C.FIRST_TICK_DELAY_MS + 40_000, async () => {
    const s = ENG.engineState();
    return s.lastPollerTickAt && s.lastPlannerTickAt && s.lastSweepTickAt ? s : null;
  });
  ok("fleet.ticks · all three passes really ran — a lane that 'passed' because nothing ran is the silent verdict this drive exists to refuse",
    !!ticked, j({ poller: ticked?.lastPollerTickAt, planner: ticked?.lastPlannerTickAt, sweep: ticked?.lastSweepTickAt }));
  ok("fleet.lease · the sweep runs only under the planner lease, and this process holds it",
    ENG.holdsPlannerLease() === true);

  exitCode = fail === 0 ? 0 : 1;

  // ═══ LANES ═════════════════════════════════════════════════════════════════════════════════════════
  /* ⛔ The snapshot that lets the meta-mutation JUDGE ITSELF — see `fleet.silent` below. */
  const beforeLanes = { count, fail };
  const { runCounterLanes, runPoolTrapLane }: Any = await import("./lib/house-bot-fleet-lanes.mts");
  const laneEnv = { ok, section, until, j, w, S, fleet, stake, EXPECT: EXPECT_ALL, COUNTER_CUTOFF_MIN, laneWanted, passes, calls, seen, sleep, FLEET, TICKS, ENG, C, RULES, D, RCTX, CTX, OFFICER, alerts };
  const laneOut = await runCounterLanes(laneEnv);
  const poolOut = await runPoolTrapLane(laneEnv);
  /* Every placement the lanes recorded, for the money lane — the lanes before it append to this list. */
  const placed: Any[] = [...(laneOut?.placed ?? []), ...(poolOut?.measured ? [{ key: "C1-POOLS", stake: poolOut.fired, side: "YES", market: poolOut.market, botId: poolOut.botId, holder: poolOut.holder }] : [])];
  for (const mod of LANE_MODULES) {
    if (!laneWanted(mod.LANE)) continue;
    const out = await mod.run(laneEnv, { placed });
    if (out == null) {
      /* ⛔ NOT MEASURED IS A FAILURE OF THE RUN, NOT A PASS: a lane that was asked for and measured nothing. */
      ok(`lane ${mod.LANE} · NOT MEASURED — the lane module returned null (not built, or it refused before measuring)`, false);
      continue;
    }
    if (Array.isArray(out.placed)) placed.push(...out.placed);
  }

  /**
   * ⭐ THE META-MUTATION NOW ENFORCES ITS OWN VERDICT, instead of leaving it to whoever reads the log.
   *
   * "Every lane must go red under `KP_FLEET_SILENT=1`" was, until this ran, a sentence in a header — a
   * contract checked by eye, and eyes drift. The first run proved why that is not enough: TWO lane cases
   * passed with the engine switched off. `A3-NEVER · placed nothing at all` asserted an ABSENCE, which a
   * dead engine supplies for free; `A2-JITTER · equals what the engine DECIDED` compared `undefined` with
   * `undefined` and called it a match. Both are fixed where they live, and this case is the ratchet that
   * stops the next one being written: under SILENT, the number of lane assertions that passed must be 0.
   *
   * ⛔ It also refuses a lane set that measured NOTHING (`laneCases > 0`) — otherwise `--only <nothing>`
   * would satisfy "none passed" the empty way, which is the same silence one level up.
   */
  if (SILENT) {
    const laneCases = count - beforeLanes.count;
    const lanePassed = laneCases - (fail - beforeLanes.fail);
    ok(`fleet.silent · META-MUTATION · all ${laneCases} lane assertions went red with the engine off — NONE passed by silence`,
      laneCases > 0 && lanePassed === 0, j({ laneCases, lanePassed }));
  }

  exitCode = fail === 0 ? 0 : 1;
} catch (e) {
  console.error("\n!! the fleet drive threw:", e instanceof Error ? e.stack : String(e));
  exitCode = 1;
} finally {
  try {
    const ENG: Any = await import("../src/lib/server/house-bot/engine.ts");
    await ENG.stopHouseBotEngine?.();
  } catch { /* the database goes anyway */ }
  await withAdmin(async (c) => { await c.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); }).catch(() => {});
  console.log(`\n${count - fail}/${count} passed · database ${DB} dropped`);
}
process.exit(exitCode);
