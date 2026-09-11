/**
 * DEPLOY SKEW — the guard for a LIVE defect. `npm run test:deploy-skew`
 *
 * 🔴 WHAT HAPPENED, 2026-09-11/12, ON PRODUCTION. Every `next build` mints new Server
 * Action ids. A player holding an already-open page still has the PREVIOUS build's ids,
 * so their first click after a deploy posts an id the new server has never heard of.
 * Next throws
 *
 *     Failed to find Server Action "…". This request might be from an older or newer
 *     deployment.
 *
 * nothing catches it, and the route's error boundary tells the player *"This page has
 * encountered a problem. Your funds are safe."* — on the DEPOSIT page, mid money-in.
 * Confirmed in the production logs, twice inside one retained window.
 *
 * ⭐ IT BITES THE KYC → DEPOSIT JOURNEY HARDEST, which is why that is where it was
 * reported. That flow has a pause built into it measured in minutes or hours — submit
 * identity, leave for the inbox, confirm the address, come back to the tab that is still
 * open. Any deploy inside that window stales the page, and on a launch day of frequent
 * deploys the window is nearly always crossed.
 *
 * ⛔ THE FIX IS TWO PARTS AND NEITHER WORKS ALONE, which is exactly why this guard
 * exists — removing either one silently restores the defect:
 *   1. `deploymentId` in next.config.ts gives the build an identity, which Next
 *      publishes to the browser as `globalThis.NEXT_DEPLOYMENT_ID`;
 *   2. `RouteError` uses that identity to reload ONCE per build, per tab, per path, so
 *      a stale page repairs itself instead of dead-ending a player on the money path.
 *
 * ⛔ AND THE KEY MUST BE THE BUILD ID, NOT A BOOLEAN. §3 proves the difference: a plain
 * "already tried" flag spends the tab's only recovery on the first error it ever sees,
 * so the NEXT deploy — the one this exists for — dead-ends the player anyway.
 *
 * No database, no network, no build: it reads source and simulates the decision, so it
 * cannot skip and belongs in `predeploy`.
 *
 * Run: npm run test:deploy-skew
 */
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, why = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && why ? ` — ${why}` : ""}`);
};

const cfg = read("next.config.ts");
const routeError = read("src/components/ui/route-error.tsx");
/** ⛔ COMMENTS STRIPPED FOR THE CODE ASSERTIONS. The first version of §2g scanned the
 *  raw file and matched the phrase `reset()` inside this component's OWN comment saying
 *  "NO `reset()` HERE" — the guard failing on the very prose that documents the rule it
 *  checks. Assert against code; quote prose only in the message. */
const routeErrorCode = decomment(routeError);

/* ── §1 · the build must have an identity ─────────────────────────────────── */
console.log("\n§1 · the build carries a deployment identity");
ok("§1a next.config sets `deploymentId`", /\bdeploymentId\s*:/.test(cfg),
  "without it `globalThis.NEXT_DEPLOYMENT_ID` is undefined and the recovery below is inert");
ok("§1b it is sourced from the deployment, not invented",
  /RAILWAY_GIT_COMMIT_SHA|RAILWAY_DEPLOYMENT_ID/.test(cfg));
// ⛔ A value that moves between the server build and the client build would make every
// request look stale to every client, forever — a permanent reload loop for all users.
ok("§1c 🔴 it is NOT a timestamp or a random value",
  !/deploymentId[\s\S]{0,200}?(Date\.now|Math\.random|new Date|randomUUID)/.test(cfg),
  "a moving id makes every client look stale on every request");

/* ── §2 · the boundary recovers, and cannot loop ──────────────────────────── */
console.log("\n§2 · the shared error boundary repairs a stale page");
ok("§2a RouteError reads the deployment id", /NEXT_DEPLOYMENT_ID/.test(routeError));
ok("§2b …and reloads the document", /location\.reload\(\)/.test(routeError),
  "reset() re-renders the SAME stale bundle and fails identically");
ok("§2c the recovery is remembered per tab", /sessionStorage/.test(routeError));
ok("§2d the stored key is the BUILD ID, not a boolean",
  /setItem\([^)]*,\s*build\s*\)/.test(routeError),
  "a boolean spends the only recovery on the first error the tab ever sees");
ok("§2e it does nothing when there is no deployment id (a laptop build)",
  /if \(!build\) return/.test(routeError));
ok("§2f the whole thing is wrapped so the error surface can never itself throw",
  /try \{[\s\S]*NEXT_DEPLOYMENT_ID[\s\S]*catch/.test(routeError));
// ⛔ Reloading is a GET of the page. If this ever became a retry of the ACTION, a
// deposit could be submitted twice by "recovering".
{
  // the recovery effect's BODY, comments stripped — from its `try {` to its `catch`
  const i = routeErrorCode.indexOf("NEXT_DEPLOYMENT_ID");
  const body = i >= 0 ? routeErrorCode.slice(i, routeErrorCode.indexOf("catch", i)) : "";
  ok("§2g 🔴 it does not retry the action, only the page",
    body.length > 0 && !/reset\s*\(/.test(body),
    "a recovery that replays the action could double-submit a deposit");
}

/* ── §3 · the decision itself, simulated ──────────────────────────────────── */
console.log("\n§3 · recover once per build — proven, not asserted");
/** The exact rule RouteError implements. */
function decide(store: Map<string, string>, path: string, build: string): "reload" | "show" {
  if (!build) return "show";
  const key = `kp:recovered:${path}`;
  if (store.get(key) === build) return "show";
  store.set(key, build);
  return "reload";
}
{
  const s = new Map<string, string>();
  ok("§3a a stale page recovers", decide(s, "/wallet/deposit", "buildB") === "reload");
  ok("§3b 🔴 a genuinely broken page does NOT loop", decide(s, "/wallet/deposit", "buildB") === "show");
  ok("§3c …and keeps showing the error", decide(s, "/wallet/deposit", "buildB") === "show");
  // ⭐ THE ARM A BOOLEAN FLAG WOULD FAIL. The tab already spent a recovery on buildB;
  // the NEXT deploy must still be allowed to repair it, because that is the whole defect.
  ok("§3d ⭐ the NEXT deploy may still recover the same tab",
    decide(s, "/wallet/deposit", "buildC") === "reload");
  ok("§3e each path recovers independently", decide(s, "/wallet", "buildC") === "reload");
  ok("§3f with no deployment id nothing happens", decide(new Map(), "/wallet", "") === "show");
}

/* ── §4 · control — the parsers can actually fail ─────────────────────────── */
console.log("\n§4 · controls");
ok("§4a control · a config with no deploymentId is detected", !/\bdeploymentId\s*:/.test("const c = { reactStrictMode: true };"));
ok("§4b control · a boolean-keyed recovery is detected",
  !/setItem\([^)]*,\s*build\s*\)/.test('sessionStorage.setItem(key, "1");'));
ok("§4c control · a Date.now() deploymentId is detected",
  /deploymentId[\s\S]{0,200}?(Date\.now)/.test("deploymentId: String(Date.now()),"));

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass < 15) { console.error(`!! only ${pass} assertions ran — treating as failure.`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
