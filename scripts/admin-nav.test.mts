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

// ── 6 · Up & Down is its own sealed section ─────────────────────────────────
{
  ok("6 · /admin/updown → overview", activeKeyFromPath("/admin/updown") === "updown");
  // The Rounds sub-page has its OWN key so the sidebar highlights it distinctly from
  // the Overview — the more-specific prefix must win (ordered before /admin/updown).
  ok("6 · /admin/updown/rounds → its own key", activeKeyFromPath("/admin/updown/rounds") === "updown-rounds");
  ok("6 · both keys are owned by nav items", navKeys().has("updown") && navKeys().has("updown-rounds"));
}

// ── 7 · EVERY admin page is reachable — the direction nothing checked ───────
//
// 🔴 WHY THIS EXISTS (Ali, 2026-08-01): *"make sure every page you work on has a route in
// admin navigation if needed — a consultant is reporting missing pages on admin nav."*
//
// Checks 2 and 3 above run nav → route: every nav item points at something real. That is
// the direction that produces a visible 404, so it is the one that got written. The
// opposite direction fails SILENTLY: a page ships, no nav item ever points at it, and it
// is invisible to every operator who does not know its URL. E-17 was exactly this — the
// Up & Down AI-generation page existed only on a branch, with no nav entry, and the gap
// was found by a person looking at a menu rather than by any test.
//
// A page may legitimately have no nav item — detail routes are reached by clicking a row,
// not from a menu. So this does not demand a nav entry; it demands a DECISION, recorded
// here. An unlisted page is a page nobody chose to hide.
{
  const REACHED_WITHOUT_NAV: Record<string, string> = {
    // Detail routes — opened by clicking a row in their parent list. A menu entry
    // pointing at "some player" is meaningless.
    "/admin/ai-polls/[id]": "poll detail — from the /admin/ai-polls list",
    "/admin/invites/[id]": "invite detail — from the /admin/invites list",
    "/admin/kyc/[id]": "the KYC workstation — from /admin/approvals (there is no /admin/kyc list page)",
    "/admin/markets/[id]": "market detail — from the /admin/markets list",
    "/admin/house/[marketId]": "per-game book — from the BY GAME table on /admin/house",
    "/admin/players/[id]": "player detail — from the /admin/players list",
    "/admin/resolver/[id]": "resolution ceremony — from /admin/resolver-queue",
    "/admin/staff/[id]": "staff member detail — from the /admin/staff list",
    // Functional sub-routes, reached by a control rather than a menu.
    "/admin/markets/new": "the 'New market' button on /admin/markets",
    "/admin/totp-verify": "the 2FA step-up interstitial — redirected to by requireAdminTotp, never navigated to",
  };

  function adminPages(dir = "src/app/admin"): string[] {
    const out: string[] = [];
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) return out;
    for (const name of readdirSync(abs)) {
      const rel = join(dir, name);
      if (statSync(join(ROOT, rel)).isDirectory()) out.push(...adminPages(rel));
      else if (name === "page.tsx") out.push(rel.replace(/\\/g, "/").replace(/^src\/app/, "").replace(/\/page\.tsx$/, "") || "/admin");
    }
    return out;
  }

  const hrefs = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href)));
  const pages = adminPages();
  ok("7 · the crawler actually found the admin pages", pages.length >= 40, `${pages.length} found`);

  const unreachable = pages.filter((p) => !hrefs.has(p) && !(p in REACHED_WITHOUT_NAV));
  ok("7 · ⭐ every admin page is in the nav, or is declared reachable another way",
     unreachable.length === 0,
     unreachable.length
       ? `no way in: ${unreachable.join(", ")} — add a NAV_GROUPS entry, or record how it is reached in REACHED_WITHOUT_NAV`
       : "");

  // The allowlist must not outlive the pages it excuses, or it silently starts excusing
  // nothing while looking like it still guards something.
  const stale = Object.keys(REACHED_WITHOUT_NAV).filter((p) => !pages.includes(p));
  ok("7 · …and nothing is excused that no longer exists", stale.length === 0, stale.join(", "));

  // E-17, pinned: the entry Ali asked for by name, and the page behind it.
  ok("7 · ⭐ E-17 — the Up & Down 'AI proposals' nav entry exists AND its page does",
     hrefs.has("/admin/updown/proposals") && pages.includes("/admin/updown/proposals"),
     "this is the gap Ali spotted in the menu; the merge is what closes it");
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
