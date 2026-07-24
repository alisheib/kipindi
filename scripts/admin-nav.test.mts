/**
 * Admin navigation — the route→key resolver, and the guarantee it stays single.
 *
 *   npx tsx scripts/admin-nav.test.mts      (npm run test:admin-nav)
 *
 * WHY THIS EXISTS. `activeKeyFromPath` was copy-pasted into `app/admin/layout.tsx`
 * AND `components/admin/admin-sidebar-nav.tsx`. The copies DRIFTED: the sidebar one
 * was missing `/admin/payments`, `/admin/kyc` and the `/admin/resolver/[id]` detail
 * route, so those three pages highlighted nothing in the sidebar. Nobody noticed for
 * months, because a nav item that fails to highlight looks like a design choice
 * rather than a bug.
 *
 * There is one definition now. This test enforces three things:
 *   1. it is still ONE definition (no second copy has reappeared);
 *   2. every route it can emit is owned by a real nav item;
 *   3. every nav item's own href resolves back to its own key — the round trip.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { NAV_GROUPS, activeKeyFromPath, navKeys, assertNavKeysResolve } from "../src/components/admin/admin-nav-groups.ts";

const ROOT = process.cwd();
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

// ── 1 · Exactly ONE definition of the resolver ──────────────────────────────
{
  function walk(dir: string): string[] {
    const out: string[] = [];
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) return out;
    for (const name of readdirSync(abs)) {
      const rel = join(dir, name);
      const st = statSync(join(ROOT, rel));
      if (st.isDirectory()) out.push(...walk(rel));
      else if (/\.tsx?$/.test(name)) out.push(rel.replace(/\\/g, "/"));
    }
    return out;
  }
  const definers = walk("src").filter((f) =>
    /function\s+activeKeyFromPath\s*\(/.test(readFileSync(join(ROOT, f), "utf8")));
  ok("1 · exactly ONE file defines activeKeyFromPath", definers.length === 1,
     definers.length === 1 ? definers[0] : `found ${definers.length}: ${definers.join(", ")} — a copy has reappeared`);
  ok("1 · and it is admin-nav-groups.ts (beside NAV_GROUPS)",
     definers[0] === "src/components/admin/admin-nav-groups.ts", definers[0] ?? "none");
}

// ── 2 · Structural guards from the module itself ────────────────────────────
{
  const problems = assertNavKeysResolve();
  ok("2 · every route key is owned by a nav item, and no prefix is unreachable",
     problems.length === 0, problems.join(" | "));
}

// ── 3 · Round trip: each nav item's href resolves to its own key ────────────
{
  const misses: string[] = [];
  for (const g of NAV_GROUPS) {
    for (const it of g.items) {
      const got = activeKeyFromPath(it.href);
      if (got !== it.key) misses.push(`${it.href} → "${got}", expected "${it.key}"`);
    }
  }
  ok("3 · every nav href highlights its own item", misses.length === 0, misses.join(" | "));
}

// ── 4 · The three routes that were broken by the drift ──────────────────────
// Regression pins. Each of these highlighted NOTHING in the sidebar before the fix.
{
  const cases: Array<[string, string]> = [
    ["/admin/payments", "payments"],
    ["/admin/kyc", "approvals"],
    ["/admin/kyc/usr_123", "approvals"],
    ["/admin/resolver/mkt_abc", "resolver"],
    ["/admin/resolver-queue", "resolver"],
  ];
  for (const [path, expected] of cases) {
    const got = activeKeyFromPath(path);
    ok(`4 · ${path} → ${expected}`, got === expected, got);
  }
}

// ── 5 · Specificity ordering actually works ─────────────────────────────────
{
  ok("5 · /admin/players/cohorts beats /admin/players",
     activeKeyFromPath("/admin/players/cohorts") === "cohorts", activeKeyFromPath("/admin/players/cohorts"));
  ok("5 · /admin/resolver-queue beats /admin/resolver",
     activeKeyFromPath("/admin/resolver-queue") === "resolver");
  ok("5 · bare /admin is the overview", activeKeyFromPath("/admin") === "overview");
  ok("5 · an unknown admin route falls back to overview, never crashes",
     activeKeyFromPath("/admin/does-not-exist") === "overview");
}

// ── 6 · Up & Down is wired in ───────────────────────────────────────────────
{
  ok("6 · /admin/updown resolves", activeKeyFromPath("/admin/updown") === "updown");
  ok("6 · a sub-route resolves too", activeKeyFromPath("/admin/updown/rounds") === "updown");
  ok("6 · a nav item owns the key", navKeys().has("updown"));
}

console.log(`\nadmin-nav: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error("\n✗ ADMIN NAV GUARD FAILED.\n" +
    "  If check 1 failed, a SECOND copy of activeKeyFromPath has appeared. Delete it and\n" +
    "  import the one in admin-nav-groups.ts — the copies drift, and a nav item that\n" +
    "  fails to highlight looks like a design choice rather than a bug.\n");
  process.exit(1);
}
console.log("admin-nav: OK — one resolver, every key owned, every href round-trips");
