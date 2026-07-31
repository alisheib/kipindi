/**
 * DEV-ROUTE GUARD — proof that no test-harness endpoint can ever answer on production.
 *
 * ⚠️ WHY THIS TEST EXISTS. `src/app/api/dev-test/` holds 35 endpoints that exist to make
 * testing possible, and they are as powerful as that implies: `seed-wallet` credits balance,
 * `promote-admin` grants the admin role, `reset-rate-limits` disarms the brute-force defence,
 * `fast-forward-market` moves a live market's clock, `stress-money` moves money in bulk. On a
 * licensed real-money platform, one of these reachable in production is simultaneously a
 * money-minting hole and a privilege-escalation hole.
 *
 * Every one of them IS guarded today — verified by reading all 35 on 2026-07-31 — each with a
 * hand-written `if (process.env.NODE_ENV === "production") return 404`. **Nothing enforced
 * it.** A guard held only by 35 copies of the same convention is a guard that survives exactly
 * until the 36th route, written in a hurry, by someone who did not know the convention existed.
 *
 * This test is that enforcement. It reads every route file under the dev directories and fails
 * unless each one refuses in production BEFORE doing anything else.
 *
 * ORDER MATTERS, not just presence. The refusal must appear before the first `await` in the
 * handler — a check that runs after a database write has already let the damage happen.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/** Every directory whose routes must never answer on production. */
const DEV_DIRS = ["src/app/api/dev-test", "src/app/api/dev"];

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};

function routeFiles(dir: string): string[] {
  const abs = join(root, dir);
  let entries: string[];
  try { entries = readdirSync(abs); } catch { return []; }
  const found: string[] = [];
  for (const e of entries) {
    const p = join(abs, e);
    if (statSync(p).isDirectory()) found.push(...routeFiles(relative(root, p).replace(/\\/g, "/")));
    else if (e === "route.ts" || e === "route.tsx") found.push(p);
  }
  return found;
}

/**
 * Accepts any of the shapes actually used in this repo, and any equivalent a future author
 * would reasonably write — matching a behaviour, not one exact string. What it will NOT accept
 * is the absence of a production check.
 */
const REFUSAL = [
  /process\.env\.NODE_ENV\s*===?\s*["'`]production["'`]/,
  /["'`]production["'`]\s*===?\s*process\.env\.NODE_ENV/,
  /process\.env\.NODE_ENV\s*!==?\s*["'`]development["'`]/,
  /\bisProduction\b/,
  /\bassertNotProduction\b/,
  /\bassertDev\b/,
  /runtimeMode\s*\(\s*\)\s*===?\s*["'`]production["'`]/,
];

const files = DEV_DIRS.flatMap(routeFiles);

console.log("─".repeat(64));
console.log("DEV-ROUTE GUARD — no test harness may answer on production");
console.log("─".repeat(64));

// If the directories vanish or move, this test must fail rather than vacuously pass. A guard
// that silently checks nothing is the exact failure mode this program exists to kill.
ok(
  `the dev route directories exist and hold routes (found ${files.length})`,
  files.length >= 10,
  files.length === 0
    ? `No route.ts found under ${DEV_DIRS.join(", ")}. If these moved, update DEV_DIRS — do not delete this test.`
    : `Only ${files.length} found; expected at least 10. Did a directory move?`,
);

/**
 * Check EVERY exported HTTP handler, not the file as a whole.
 *
 * Checking the file was the first thing I wrote and it was wrong twice over. It reported 13
 * false failures, because `src.indexOf("await ")` finds awaits inside helper functions declared
 * ABOVE the handler — `stress-bulk-bet` has an `ensureStressUsers` helper at line 36 whose
 * await precedes a perfectly correct guard at line 91. And it was too lenient in the other
 * direction: a file exporting both GET and POST passed on the strength of one guarded handler
 * while the other stayed open.
 *
 * So: slice the file per exported handler, and require the refusal inside that slice, before
 * that slice's first await.
 */
const HANDLER = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g;

for (const abs of files) {
  const rel = relative(root, abs).replace(/\\/g, "/");
  const src = readFileSync(abs, "utf8");

  const starts: Array<{ method: string; at: number }> = [];
  for (const m of src.matchAll(HANDLER)) starts.push({ method: m[1], at: m.index ?? 0 });

  ok(`${rel} exports at least one HTTP handler`, starts.length > 0,
    "No `export async function GET|POST|…` found — if this file's shape changed, update HANDLER.");

  /** method -> its slice, so a delegating handler can be resolved to the one it calls. */
  const slices = new Map<string, string>();
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].at : src.length;
    slices.set(starts[i].method, src.slice(starts[i].at, end));
  }

  /**
   * `export async function GET() { return POST(); }` is guarded — by POST. Delegation is a
   * real pattern here (`reset-rate-limits` uses it), and a guard that cannot see through one
   * hop would push authors to add redundant checks to satisfy the test rather than to protect
   * anything. Resolves ONE hop only: deeper chains must guard themselves, because at that
   * point nobody reading the file can tell either.
   */
  const delegatesToGuarded = (body: string): string | null => {
    const d = body.match(/\breturn\s+(?:await\s+)?(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/);
    if (!d) return null;
    const target = slices.get(d[1]);
    if (!target || d[1] === undefined) return null;
    return REFUSAL.some((re) => re.test(target)) ? d[1] : null;
  };

  for (let i = 0; i < starts.length; i++) {
    const { method, at } = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].at : src.length;
    const body = src.slice(at, end);

    const via = delegatesToGuarded(body);
    if (via) {
      ok(`${rel} · ${method} refuses in production (delegates to ${via}, which is guarded)`, true);
      continue;
    }

    const matched = REFUSAL.find((re) => re.test(body));
    ok(
      `${rel} · ${method} refuses in production`,
      Boolean(matched),
      "No production check in this handler. Add it as the FIRST statement:\n" +
        '         if (process.env.NODE_ENV === "production") {\n' +
        '           return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });\n' +
        "         }",
    );
    if (!matched) continue;

    // A handler that credits a wallet and *then* checks the environment has already credited
    // the wallet. The refusal has to win the race against the first piece of real work.
    const guardAt = body.search(matched);
    const firstAwait = body.indexOf("await ");
    ok(
      `${rel} · ${method} refuses BEFORE its first await`,
      firstAwait === -1 || guardAt < firstAwait,
      "The production check sits after this handler's first `await`, so the work happens first.",
    );
  }
}

console.log("");
console.log("─".repeat(64));
console.log(`  DEV-ROUTE GUARD: ${pass} passed, ${fail} failed  (${files.length} route files)`);
console.log("─".repeat(64));

if (fail > 0) process.exit(1);
