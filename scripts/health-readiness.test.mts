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
  } else if (kase === "BYPASS") {
    ok("BYPASS: GET is 200 with no DATABASE_URL", res.status === 200, `status=${res.status}`);
    ok("BYPASS: ok is true", body.ok === true);
    ok("BYPASS: database.configured false", body.database?.configured === false);
    ok("BYPASS: HEAD agrees — 200", head.status === 200, `status=${head.status}`);
  } else if (kase === "TRUE") {
    ok("TRUE: GET is 200 against a real migrated DB", res.status === 200, `status=${res.status}`);
    ok("TRUE: ok is true", body.ok === true, JSON.stringify(body.database));
    ok("TRUE: database.reachable true", body.database?.reachable === true);
    ok("TRUE: database.migrated true", body.database?.migrated === true);
    ok("TRUE: latencyMs is a real number", Number.isFinite(body.database?.latencyMs),
      `latencyMs=${JSON.stringify(body.database?.latencyMs)}`);
    ok("TRUE: x-health says ok", res.headers.get("x-health") === "ok");
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
