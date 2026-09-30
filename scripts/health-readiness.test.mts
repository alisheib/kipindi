/**
 * /api/health readiness — the gate must be able to FAIL, proven, not narrated.
 *
 * The endpoint answered `ok: true` / HTTP 200 while Postgres was unreachable
 * (`db.user.count()` in a bare catch became `users: -1` inside a 200 body). The
 * fix (LAUNCH-1K, cherry-picked from `launch-1k-readiness`) makes it 503 when
 * the database is unreachable or unmigrated — but that fix shipped with NO
 * automated proof: its commit message claimed "proved both ways" while the
 * "green" it drove was the no-DATABASE_URL bypass branch, which is designed
 * never to fail. A guard proven only against the branch that cannot fail is
 * the exact defect this repo keeps paying for (50pick-standards §5b rule 7).
 *
 * So this suite drives the handler THREE ways, RED FIRST:
 *   RED    DATABASE_URL → a dead local port  ⇒ 503, ok:false, x-health not-ready
 *   BYPASS no DATABASE_URL                   ⇒ 200 (nothing to be unready about)
 *   TRUE   a real, migrated database         ⇒ 200 through `reachable && tableExists`
 *          (runs when HEALTH_TEST_DATABASE_URL or VERIFY_DATABASE_URL is set;
 *          otherwise SKIPPED — loudly, because the live post-deploy check against
 *          production is the other place this branch is proven)
 *
 * ⚠️ Each case runs in its OWN child process: the Prisma client is a
 * `globalThis` singleton latched at first construction (prisma.ts), so one
 * process cannot honestly drive two different DATABASE_URLs.
 *
 * ⭐ THE NEW JOURNEY'S ROLLOUT (Vodacom plan S1) rides the same three cases:
 * `simpleJourney` must be exactly { ceiling, state }, each WITHDRAWN |
 * STAFF_PREVIEW | ACTIVE. RED runs under an ACTIVE ceiling and a dead
 * database, so the Owner's switch cannot be read — UNREAD composes to
 * WITHDRAWN (`simple-journey-switch.ts`), however high the ceiling. BYPASS has
 * no database, so the switch row is the empty in-memory one — ABSENT, no cap —
 * and the state IS the ceiling. The parent strips FEATURE_SIMPLEJOURNEY so no
 * shell setting decides a case.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const THIS = fileURLToPath(import.meta.url);

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`  ok ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

// The rollout's three words, ranked by position. Written out here, NOT imported from `feature-state.ts`, so the
// product's own parser is not what judges the product's own answer.
const ROLLOUT: readonly string[] = ["WITHDRAWN", "STAFF_PREVIEW", "ACTIVE"];
const isRollout = (v: unknown): v is string => typeof v === "string" && ROLLOUT.includes(v);
/** `simpleJourney` is exactly { ceiling, state }, both rollout words — the public body carries the rollout only. */
function journeyShapeOk(sj: unknown): sj is { ceiling: string; state: string } {
  if (!sj || typeof sj !== "object" || Array.isArray(sj)) return false;
  const o = sj as Record<string, unknown>;
  return Object.keys(o).sort().join(",") === "ceiling,state" && isRollout(o.ceiling) && isRollout(o.state);
}

// ── child mode: drive the handler for one case ──────────────────────────────
if (process.env.HEALTH_CASE) {
  const kase = process.env.HEALTH_CASE;
  const { GET, HEAD } = await import("../src/app/api/health/route.ts");
  const res = await GET();
  const body = await res.json();
  const head = await HEAD();

  if (kase === "RED") {
    ok("RED: GET is 503", res.status === 503, `status=${res.status}`);
    ok("RED: ok is false", body.ok === false, `ok=${JSON.stringify(body.ok)}`);
    ok("RED: x-health says not-ready", res.headers.get("x-health") === "not-ready");
    ok("RED: database.configured true", body.database?.configured === true);
    ok("RED: database.reachable false", body.database?.reachable === false);
    ok("RED: HEAD agrees — 503", head.status === 503, `status=${head.status}`);
    ok("RED: HEAD header agrees", head.headers.get("x-health") === "not-ready");
    ok("RED: no host leaks in body", !JSON.stringify(body).includes("127.0.0.1"),
      "public endpoint echoed the database host");
    // ⭐ THE NEW JOURNEY'S ROLLOUT. The parent runs this case under an ACTIVE ceiling (FEATURE_SIMPLEJOURNEY) —
    // under a WITHDRAWN one the switch is never read, and the WITHDRAWN below would prove nothing. The Owner's
    // switch lives in the dead database, so its read fails, and an UNREAD switch composes to WITHDRAWN: a failed
    // read never SHOWS the new journey.
    const sjRed = body.simpleJourney;
    ok("RED: simpleJourney is exactly { ceiling, state } in the three rollout words", journeyShapeOk(sjRed),
      JSON.stringify(sjRed ?? null));
    ok("RED: simpleJourney ceiling is ACTIVE (FEATURE_SIMPLEJOURNEY honoured, so the switch read was attempted)",
      sjRed?.ceiling === "ACTIVE", `ceiling=${JSON.stringify(sjRed?.ceiling)}`);
    ok("RED: an unreadable switch composes to WITHDRAWN, even under an ACTIVE ceiling", sjRed?.state === "WITHDRAWN",
      `state=${JSON.stringify(sjRed?.state)}`);
  } else if (kase === "BYPASS") {
    ok("BYPASS: GET is 200 with no DATABASE_URL", res.status === 200, `status=${res.status}`);
    ok("BYPASS: ok is true", body.ok === true);
    ok("BYPASS: database.configured false", body.database?.configured === false);
    ok("BYPASS: HEAD agrees — 200", head.status === 200, `status=${head.status}`);
    // ⭐ THE NEW JOURNEY'S ROLLOUT with no database: the switch row lives in process memory and is empty at boot —
    // ABSENT, which is NO cap, so the state IS the ceiling (the shipped one: the parent strips FEATURE_SIMPLEJOURNEY).
    // ⛔ Not WITHDRAWN: a kill switch that started killed would hide the preview on a fresh store.
    const sjBypass = body.simpleJourney;
    ok("BYPASS: simpleJourney is exactly { ceiling, state } in the three rollout words", journeyShapeOk(sjBypass),
      JSON.stringify(sjBypass ?? null));
    ok("BYPASS: an empty (ABSENT) switch leaves the state at the ceiling",
      journeyShapeOk(sjBypass) && sjBypass.state === sjBypass.ceiling, JSON.stringify(sjBypass ?? null));
  } else if (kase === "TRUE") {
    ok("TRUE: GET is 200 against a real migrated DB", res.status === 200, `status=${res.status}`);
    ok("TRUE: ok is true", body.ok === true, JSON.stringify(body.database));
    ok("TRUE: database.reachable true", body.database?.reachable === true);
    ok("TRUE: database.migrated true", body.database?.migrated === true);
    ok("TRUE: latencyMs is a real number", Number.isFinite(body.database?.latencyMs),
      `latencyMs=${JSON.stringify(body.database?.latencyMs)}`);
    ok("TRUE: x-health says ok", res.headers.get("x-health") === "ok");
    // The rollout against a real database: whatever the Owner stored, the state is never ranked above the ceiling.
    const sjTrue = body.simpleJourney;
    ok("TRUE: simpleJourney is exactly { ceiling, state }, state never above its ceiling",
      journeyShapeOk(sjTrue) && ROLLOUT.indexOf(sjTrue.state) <= ROLLOUT.indexOf(sjTrue.ceiling), JSON.stringify(sjTrue ?? null));
  }

  console.log(`case ${kase}: ${pass} ok, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}

// ── parent mode: orchestrate, RED before any green ──────────────────────────
const tsxCli = require.resolve("tsx/cli");
function runCase(kase: string, env: Record<string, string | undefined>): number {
  const base = { ...process.env };
  // A child must control its own database fate — strip everything that could
  // make the dev store or a stray URL answer for the case under test.
  delete base.DATABASE_URL; delete base.USE_PRISMA_DAL;
  delete base.REDIS_ENABLED; delete base.REDIS_URL;
  // …and the new journey's ceiling: a FEATURE_SIMPLEJOURNEY left in the shell must not decide a case (RED sets its own).
  delete base.FEATURE_SIMPLEJOURNEY;
  const r = spawnSync(process.execPath, [tsxCli, THIS], {
    env: { ...base, ...env, HEALTH_CASE: kase },
    encoding: "utf8", timeout: 120_000,
  });
  process.stdout.write(r.stdout ?? "");
  if (r.status !== 0 && r.stderr) process.stdout.write(r.stderr.slice(0, 2000) + "\n");
  return r.status ?? 1;
}

console.log("═══ RED first — the gate must be seen to fail ═══");
const red = runCase("RED", {
  // port 9 (discard) with no listener → fast ECONNREFUSED, never a real DB
  DATABASE_URL: "postgresql://health:red@127.0.0.1:9/red?connect_timeout=3",
  USE_PRISMA_DAL: "true",
  // The highest ceiling, so the rollout's WITHDRAWN can only come from the unreadable switch (see the RED case).
  FEATURE_SIMPLEJOURNEY: "ACTIVE",
});
ok("RED case failed the gate as required", red === 0);
if (red !== 0) {
  console.log("⛔ The RED control did not go red — the gate cannot fail; refusing to trust the greens.");
  console.log(`SUMMARY: ${pass} ok, ${fail + 1} fail`);
  process.exit(1);
}

console.log("═══ GREEN — the bypass branch (no DATABASE_URL) ═══");
const bypass = runCase("BYPASS", {});
ok("BYPASS case green", bypass === 0);

console.log("═══ GREEN — the true-positive branch (reachable && migrated) ═══");
const trueUrl = process.env.HEALTH_TEST_DATABASE_URL || process.env.VERIFY_DATABASE_URL;
if (trueUrl) {
  const t = runCase("TRUE", { DATABASE_URL: trueUrl, USE_PRISMA_DAL: "true" });
  ok("TRUE case green", t === 0);
} else {
  console.log("⚠️  SKIPPED — no HEALTH_TEST_DATABASE_URL / VERIFY_DATABASE_URL set.");
  console.log("   The true-positive branch is instead proven live after deploy:");
  console.log("   curl -s https://50pick.tz/api/health → 200 with database.reachable:true.");
}

console.log(`SUMMARY: ${pass} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
