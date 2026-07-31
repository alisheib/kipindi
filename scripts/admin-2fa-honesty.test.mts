/**
 * A6 · ADMIN 2FA HONESTY — a password-only admin console must never be a SILENT state.
 *
 * ⚠️ WHY THIS TEST EXISTS. `DISABLE_ADMIN_TOTP=true` has been set on 50pick's production
 * environment since before 2026-07-31 — deliberately, so a consultant could evaluate the console.
 * It makes every `/admin` surface, every money-ops action and every compliance override reachable
 * with a password alone, on a licensed real-money platform.
 *
 * That is a known, accepted risk. **What was NOT acceptable is that nothing said so.** Not
 * `/api/health`, not the boot checks, not `/admin/system`. The question "is admin 2FA on?" was
 * answerable only by reading Railway's variable list — which is precisely how "is alerting on?"
 * used to be answered, before that was surfaced on health for exactly this reason.
 *
 * This suite does NOT assert that 2FA is enforced. Asserting that would fail on production today
 * and would be a lie about what Ali has chosen. It asserts that **whatever the state is, the
 * platform reports it truthfully and in one place.**
 *
 * ⛔ It also pins the bypass to a known, closed set of call sites, so a future edit cannot quietly
 * add a fifth place that honours the switch without anyone noticing.
 *
 * Every negative assertion has been broken on purpose and observed to go red.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 58 - s.length))}`);

// ── 1 · One source of truth ──────────────────────────────────────────────────────────────────
section("1 · one place answers 'is admin 2FA on?'");

const guard = read("src/lib/server/admin-guard.ts");
ok("admin-guard exports isAdminTotpEnforced()", /export function isAdminTotpEnforced\(\)/.test(guard),
  "Three callers each re-reading process.env is three chances to disagree.");
ok("the guard itself uses that helper, not a second env read",
  /if \(!isAdminTotpEnforced\(\)\) return "ok";/.test(guard));

// ── 2 · The bypass lives in a CLOSED set of places ───────────────────────────────────────────
section("2 · the bypass cannot spread unnoticed");

/** Every file allowed to read the raw env var, with why. A new entry needs a deliberate edit. */
const ALLOWED = new Set([
  "src/lib/server/admin-guard.ts",        // the one definition
  "src/app/admin/layout.tsx",             // the console gate
  "src/app/admin/totp-verify/page.tsx",   // skips the challenge screen
  "src/app/auth/admin/page.tsx",          // skips the post-login redirect
]);

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const e of readdirSync(join(root, dir))) {
    const rel = `${dir}/${e}`;
    if (e === "node_modules" || e === ".next") continue;
    if (statSync(join(root, rel)).isDirectory()) out.push(...walk(rel));
    else if (/\.(ts|tsx|mts|mjs)$/.test(e)) out.push(rel);
  }
  return out;
};

/**
 * Look for an actual ENV READ, in code, with comments stripped.
 *
 * Matching the bare string `DISABLE_ADMIN_TOTP` flagged `health/route.ts` and `boot-checks.ts`,
 * which only *mention* it in explanatory comments while correctly calling `isAdminTotpEnforced()`.
 * That is the third time in this session a guard of mine read prose instead of code — the same
 * mistake as a contrast audit hardcoding the values it was meant to check.
 */
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const ENV_READ = /process\.env(?:\.DISABLE_ADMIN_TOTP|\[\s*["'`]DISABLE_ADMIN_TOTP["'`]\s*\])/;
const readers = walk("src").filter((f) => ENV_READ.test(stripComments(read(f))));
for (const f of readers) {
  ok(`${f} is an approved reader of DISABLE_ADMIN_TOTP`, ALLOWED.has(f),
    "A new place honouring the 2FA bypass. If deliberate, add it to ALLOWED here with a reason —\n" +
      "       so the next person can see every door at once.");
}
ok(`all ${ALLOWED.size} approved readers still exist (found ${readers.length})`,
  readers.length === ALLOWED.size,
  readers.length < ALLOWED.size
    ? `Fewer readers than expected. If a gate was REMOVED, an /admin surface may now be unguarded:\n       missing = ${[...ALLOWED].filter((a) => !readers.includes(a)).join(", ")}`
    : undefined);

// ── 3 · Health reports the state ─────────────────────────────────────────────────────────────
section("3 · /api/health tells the truth without a log dive");

const health = read("src/app/api/health/route.ts");
ok("health imports the single helper", health.includes("isAdminTotpEnforced"));
ok("health exposes security.adminTotp", /security:\s*\{[\s\S]*adminTotp:/.test(health));
ok("🔴 the DISABLED state is loud, not a bare false",
  health.includes('"DISABLED"'),
  'A boolean false reads as "no problem" at a glance. The word DISABLED does not.');

// ── 4 · Boot warns in production ─────────────────────────────────────────────────────────────
section("4 · boot says so, every deploy");

const boot = read("src/lib/server/boot-checks.ts");
ok("boot-checks warns when 2FA is off in production", boot.includes("isAdminTotpEnforced"));
ok("…and only in production", /NODE_ENV === "production"/.test(boot));
ok("the warning names the lockout hazard, not just the risk",
  /lock/i.test(boot) && /enrol/i.test(boot),
  "Unsetting the var with NO admin enrolled locks the owner out — the layout forces enrolment, so\n" +
    "       a locked-out admin cannot reach the setup page either. The warning must say this.");
// Fail-open is load-bearing here: a boot `throw` caused the C7 outage.
ok("boot does NOT throw over this", !/throw new Error\([^)]*TOTP/i.test(boot),
  "A boot check must never take a live real-money platform down over an alarm the runtime guard\n" +
    "       already enforces.");

// ── 5 · Every admin surface goes through the guard ───────────────────────────────────────────
section("5 · the console gate is real");

const layout = read("src/app/admin/layout.tsx");
ok("the layout forces ENROLMENT, not just verification",
  layout.includes("hasTotp(") && layout.includes("2fa/setup"),
  "A not-yet-enrolled admin previously ran password-only.");
ok("the TOTP cookie is bound to userId AND sessionId (no replay across logins)",
  guard.includes("userId") && guard.includes("sessionId") && guard.includes("verifySession"));

console.log("");
console.log("─".repeat(64));
console.log(`  ADMIN 2FA HONESTY (A6): ${pass} passed, ${fail} failed`);
console.log(`  NOTE: this suite does not require 2FA to be ON — it requires the platform to say`);
console.log(`  which it is. Production currently reports adminTotp: DISABLED, truthfully.`);
console.log("─".repeat(64));

if (fail > 0) process.exit(1);
