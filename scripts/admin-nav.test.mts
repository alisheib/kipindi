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
 * And since PHOSPHOR-MIGRATION W3 (§8): every destination wears ONE glyph of the family — a live key, its own across the
 * whole sidebar, its Fill shipped — so the current row can draw its Fill on the pill (R-INDICATOR 3B).
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { NAV_GROUPS, activeKeyFromPath, navKeys, assertNavKeysResolve } from "../src/components/admin/admin-nav-groups.ts";
import { FILL_KEYS, GLYPH_MAP, NEW_KEYS } from "./glyphs/map.ts";

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
  // ⚠️ /admin/kyc MOVED OFF THE "approvals" ALIAS, 2026-09-13. It gained a real index page and its own nav
  // item ("KYC queue", key "kyc"), so every KYC route now highlights that item. The pin's purpose is
  // unchanged — each route must resolve to a key a nav item OWNS, never to nothing.
  const cases: Array<[string, string]> = [
    ["/admin/payments", "payments"],
    ["/admin/kyc", "kyc"],
    ["/admin/kyc/usr_123", "kyc"],
    ["/admin/kyc/refused", "kyc"],
    ["/admin/resolver/mkt_abc", "resolver"],
    ["/admin/resolver-queue", "resolver"],
    // C7-SPEC rulings 321, 326 · the desk, and the two sub-routes that must resolve to the SAME item: a nav entry
    // that fails to highlight looks like a design choice, and on an Owner-only section it would look like a refusal.
    ["/admin/desk", "desk"],
    // U36 · the SMS campaign list, and the two sub-routes its later units add (U37's /new, U47's /[id]) — one item. U37b's
    // /new and U47b-2's /[id] each have their REACHED_WITHOUT_NAV row in §7, landed WITH their page (§7's staleness half
    // refuses a row for a page that does not exist).
    ["/admin/campaigns", "campaigns"],
    ["/admin/campaigns/new", "campaigns"],
    ["/admin/campaigns/smc_0123", "campaigns"],
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
  /* C7-SPEC ruling 326 · the desk's two sub-routes highlight the SECTION's item, the `["/admin/kyc/usr_123", "kyc"]`
     precedent. ⛔ The record id is a 24-hex `hb_` segment, which `looksLikeId` keeps verbatim — the exact shape the
     section gate's neutral `title` exists for (ruling 301) — so the id form is asserted, not only the word form. */
  ok("5 · /admin/desk/new → desk", activeKeyFromPath("/admin/desk/new") === "desk", activeKeyFromPath("/admin/desk/new"));
  ok("5 · /admin/desk/<a 24-hex record id> → desk",
     activeKeyFromPath("/admin/desk/hb_0123456789abcdef01234567") === "desk", activeKeyFromPath("/admin/desk/hb_0123456789abcdef01234567"));
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
    // MASWALI-BUILD S4 · the builder opens from the week list's "Draft a week"; a week opens from its row there, and from
    // every alert that names it.
    "/admin/maswali/new": "the builder — from the Draft a week action at the head of /admin/maswali",
    "/admin/maswali/[weekId]/edit": "a draft's builder — from Edit the questions on its week page",
    "/admin/maswali/[weekId]": "one week — from its row in the weeks table on /admin/maswali, and from every alert that names it",
    "/admin/agents/[id]": "the agent workstation — from the queue, refunds, invitations and roster tables on /admin/agents",
    "/admin/ai-polls/[id]": "poll detail — from the /admin/ai-polls list",
    "/admin/invites/[id]": "invite detail — from the /admin/invites list",
    // ⚠️ 2026-09-13 — this reason used to add "(there is no /admin/kyc list page)". There is one now, with
    // its own nav item, so that clause became false and is removed.
    "/admin/kyc/[id]": "the KYC workstation — from the queues on /admin/kyc and /admin/approvals, and from /admin/kyc/refused",
    "/admin/kyc/refused": "the refused-balances report — the 'Refused balances' action on /admin/kyc, and 'All refused balances' on each refused case at /admin/kyc/[id]",
    "/admin/markets/[id]": "market detail — from the /admin/markets list",
    "/admin/house/[marketId]": "per-game book — from the BY GAME table on /admin/house",
    "/admin/players/[id]": "player detail — from the /admin/players list",
    "/admin/resolver/[id]": "resolution ceremony — from /admin/resolver-queue",
    "/admin/staff/[id]": "staff member detail — from the /admin/staff list",
    // Functional sub-routes, reached by a control rather than a menu.
    "/admin/markets/new": "the 'New market' button on /admin/markets",
    // U37b (decision M8) · landed in the change that adds the page and flips CAMPAIGN_SCREENS.compose — never before it.
    "/admin/campaigns/new": "the SMS campaign composer — the 'New campaign' action in the head of /admin/campaigns, a real link exactly when this page exists (CAMPAIGN_SCREENS.compose, ruling 432(h))",
    // U47b-2 (§4.15 decision 5) · landed in the change that adds the page and flips CAMPAIGN_SCREENS.detail — never before it.
    "/admin/campaigns/[id]": "the SMS campaign's live page — the name on every row of /admin/campaigns that is not a draft, a real link exactly when this page exists (CAMPAIGN_SCREENS.detail, ruling 432(h)); a draft's id opened here goes to the composer",
    /* ⭐ C7-SPEC ruling 326's TWO rows, each landing in the commit that adds its own page — the account page at C7
     * step 4, the designation wizard at C7 step 6. Neither could land earlier: §7's staleness half is
     * `Object.keys(REACHED_WITHOUT_NAV).filter((p) => !pages.includes(p))`, so a row for a page the crawler cannot
     * find is reported STALE and this suite goes red. The allowlist must not outlive the pages it excuses, and it
     * must not PRECEDE them either. */
    "/admin/desk/[id]": "one account's page — from the way-out link on every row of the roster table on /admin/desk, and from the bell and letter targets that name an account",
    "/admin/desk/new": "the designation wizard — the 'Designate an account' primary action in the head of /admin/desk, which is a real link exactly when this page exists (ruling 432(h))",
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

// ── 8 · Every destination wears ONE glyph, its own (PHOSPHOR-MIGRATION W3) ──
//
// Ali ruled that the console gets icons (R-ADMIN, "Yes, sidebar + cards") and that the current destination is its Fill
// glyph on the opaque royal pill (R-INDICATOR 3B). `NavItem.glyph` is REQUIRED, so a new page cannot be added without
// choosing one (R-NEW-PAGES); this section holds what the type cannot:
//   · the glyph is a LIVE key of the family (scripts/glyphs/map.ts) — a retired or unknown one draws nothing;
//   · it ships its FILL — otherwise the current row quietly falls back to Line, and the selected state is half drawn;
//   · no two destinations wear the same glyph, within a group or across the sidebar (one meaning, one glyph). Two
//     destinations that truly mean the same thing may share one only when SHARED_GLYPHS names it, with why.
// docs/PHOSPHOR-MIGRATION.md §3 "Admin destinations (W3)" is the lexicon these were chosen from.
{
  type GlyphNav = ReadonlyArray<{ group: { en: string }; items: ReadonlyArray<{ key: string; glyph?: string }> }>;
  /** A glyph two destinations may share, with why — only when both mean the same thing. None today. */
  const SHARED_GLYPHS: Record<string, string> = {};
  const live = new Set(Object.entries({ ...GLYPH_MAP, ...NEW_KEYS }).filter(([, e]) => !("retire" in e)).map(([k]) => k));
  const fill = new Set<string>(FILL_KEYS);
  const glyphProblems = (groups: GlyphNav): string[] => {
    const out: string[] = [];
    const wornBy = new Map<string, string>();
    for (const g of groups) {
      const inGroup = new Map<string, string>();
      for (const it of g.items) {
        const k = it.glyph;
        if (!k) { out.push(`${it.key} wears no glyph`); continue; }
        if (!live.has(k)) out.push(`${it.key} wears "${k}", which is not a live key of the family (scripts/glyphs/map.ts)`);
        if (!fill.has(k)) out.push(`${it.key} wears "${k}", which ships no Fill — its current row would fall back to Line (add it to FILL_KEYS)`);
        const twin = inGroup.get(k);
        if (twin) out.push(`${g.group.en}: ${twin} and ${it.key} both wear "${k}"`);
        else inGroup.set(k, it.key);
        const other = wornBy.get(k);
        if (other && !twin && !(k in SHARED_GLYPHS)) out.push(`${other} and ${it.key} both wear "${k}" — one meaning, one glyph; a true sharing is named in SHARED_GLYPHS with why`);
        if (!other) wornBy.set(k, it.key);
      }
    }
    return out;
  };
  const real = NAV_GROUPS as unknown as GlyphNav;
  const problems = glyphProblems(real);
  ok("8 · ⭐ every destination wears a live glyph that ships its Fill, and no two destinations wear the same one",
     problems.length === 0, problems.join(" | "));
  // ⛔ CONTROL — each way §8 can fail, planted on an in-memory copy (nothing is written), must be reported.
  const plant = (f: (it: { key: string; glyph?: string }) => { key: string; glyph?: string }): GlyphNav =>
    real.map((g) => ({ ...g, items: g.items.map(f) }));
  const first = real[0].items[0], second = real[0].items[1], far = real[real.length - 1].items[0];
  const plants: Array<[string, RegExp, GlyphNav]> = [
    ["a destination with no glyph", new RegExp(`^${first.key} wears no glyph`), plant((it) => (it.key === first.key ? { ...it, glyph: undefined } : it))],
    ["a retired key", /wears "sortAsc", which is not a live key/, plant((it) => (it.key === first.key ? { ...it, glyph: "sortAsc" } : it))],
    ["a glyph that ships no Fill", /wears "bell", which ships no Fill/, plant((it) => (it.key === first.key ? { ...it, glyph: "bell" } : it))],
    ["two destinations of one group, one glyph", new RegExp(`: ${first.key} and ${second.key} both wear`), plant((it) => (it.key === second.key ? { ...it, glyph: first.glyph } : it))],
    ["two destinations across the sidebar, one glyph", new RegExp(`^${first.key} and ${far.key} both wear .*one meaning, one glyph`), plant((it) => (it.key === far.key ? { ...it, glyph: first.glyph } : it))],
  ];
  const blind = plants.filter(([, want, groups]) => !glyphProblems(groups).some((p) => want.test(p))).map(([name]) => name);
  ok("8 · CONTROL · each way §8 can fail is reported on a planted copy (the real nav above is clean, so these are the plants')",
     problems.length === 0 && blind.length === 0, blind.length ? `blind to: ${blind.join(", ")}` : `${plants.length}/${plants.length} caught`);
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
