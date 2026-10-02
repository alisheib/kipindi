/**
 * RBAC — locks the role-based admin-access policy: the default grant matrix, the
 * ADMIN (Owner) bypass, the critical negative invariants (Trading never touches
 * money/PII, Auditor acts nowhere, Support is the desk only), route→domain
 * completeness, the Owner-only surfaces, and the "a grant edit takes effect without
 * a role change or redeploy" contract (exercised via the no-DB in-memory store).
 *
 * Run: npx tsx scripts/rbac.test.mts
 */
import {
  ADMIN_DOMAINS,
  EDITABLE_ROLES,
  STAFF_ROLES,
  defaultGrant,
  domainForPath,
  assertRouteDomainsComplete,
  isOwnerOnlyPath,
  type AdminDomain,
  type Role,
} from "../src/lib/server/roles.ts";
import {
  roleGrants,
  canView,
  canAct,
  viewableDomains,
  getGrantMatrix,
  setRoleGrant,
  resetRoleGrantsToDefaults,
  invalidateGrantsCache,
  __resetGrantsForTest,
} from "../src/lib/server/rbac.ts";
import { NAV_GROUPS, filterNavGroups } from "../src/components/admin/admin-nav-groups.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}`); };

const DOMAINS = ADMIN_DOMAINS as readonly AdminDomain[];
const setEq = (s: Set<string>, arr: string[]) => s.size === arr.length && arr.every((x) => s.has(x));

// Start from a clean in-memory store (no DB in the test runner).
__resetGrantsForTest();

// ── 1. ADMIN (Owner) bypasses the table — all view + all act, everywhere ──────
{
  const g = await roleGrants("ADMIN");
  ok("ADMIN views every domain", DOMAINS.every((d) => g[d].canView));
  ok("ADMIN acts on every domain", DOMAINS.every((d) => g[d].canAct));
  ok("ADMIN canView(any) true", await canView("ADMIN", "compliance"));
  ok("ADMIN canAct(any) true", await canAct("ADMIN", "accounting"));
}

// ── 2. Default matrix per role (the Ali-approved seed) ────────────────────────
const EXPECT_VIEW: Record<string, AdminDomain[]> = {
  COMPLIANCE: ["overview", "accounting", "compliance", "support"],
  MODERATOR: ["overview", "trading"],
  FINANCE: ["overview", "accounting"],
  GROWTH: ["overview", "growth"],
  AUDITOR: ["overview", "accounting", "compliance"],
  SUPPORT: ["overview", "support"],
};
const EXPECT_ACT: Record<string, AdminDomain[]> = {
  COMPLIANCE: ["compliance"],
  MODERATOR: ["trading"],
  FINANCE: ["accounting"],
  GROWTH: ["growth"],
  AUDITOR: [], // read-only everywhere
  SUPPORT: ["support"],
};
for (const role of Object.keys(EXPECT_VIEW) as Role[]) {
  const view = await viewableDomains(role);
  ok(`${role} views exactly ${EXPECT_VIEW[role].join("+")}`, setEq(view as Set<string>, EXPECT_VIEW[role]));
  const acts: AdminDomain[] = [];
  for (const d of DOMAINS) if (await canAct(role, d)) acts.push(d);
  ok(`${role} acts on exactly [${EXPECT_ACT[role].join("+") || "none"}]`, setEq(new Set(acts), EXPECT_ACT[role]));
}

// ── 3. The #1 invariant — Trading (MODERATOR) never money/PII/config/ops ──────
for (const d of ["accounting", "growth", "compliance", "support", "ops"] as AdminDomain[]) {
  ok(`MODERATOR cannot VIEW ${d}`, !(await canView("MODERATOR", d)));
  ok(`MODERATOR cannot ACT on ${d}`, !(await canAct("MODERATOR", d)));
}

// ── 4. Auditor is read-only everywhere; Compliance loses money-act by default ─
for (const d of DOMAINS) ok(`AUDITOR cannot ACT on ${d}`, !(await canAct("AUDITOR", d)));
ok("COMPLIANCE can VIEW accounting (default)", await canView("COMPLIANCE", "accounting"));
ok("COMPLIANCE cannot ACT on accounting by default (SoD delta)", !(await canAct("COMPLIANCE", "accounting")));
ok("COMPLIANCE can ACT on compliance (incl. AML)", await canAct("COMPLIANCE", "compliance"));

// ── 5. Support is the desk only — never money/compliance ──────────────────────
ok("SUPPORT cannot VIEW compliance", !(await canView("SUPPORT", "compliance")));
ok("SUPPORT cannot ACT on accounting", !(await canAct("SUPPORT", "accounting")));
ok("SUPPORT can ACT on support", await canAct("SUPPORT", "support"));

// ── 6. Non-staff roles have zero access ───────────────────────────────────────
for (const role of ["PLAYER", "AGENT"] as Role[]) {
  for (const d of DOMAINS) {
    ok(`${role} cannot VIEW ${d}`, !(await canView(role, d)));
    ok(`${role} cannot ACT on ${d}`, !(await canAct(role, d)));
  }
}
ok("STAFF_ROLES excludes PLAYER/AGENT", !STAFF_ROLES.includes("PLAYER") && !STAFF_ROLES.includes("AGENT"));
ok("EDITABLE_ROLES excludes ADMIN (Owner not editable)", !EDITABLE_ROLES.includes("ADMIN"));

// ── 7. Route → domain resolution + Owner-only paths ───────────────────────────
ok("/admin → overview", domainForPath("/admin") === "overview");
ok("/admin/config → accounting", domainForPath("/admin/config") === "accounting");
ok("/admin/players → support", domainForPath("/admin/players") === "support");
ok("/admin/players/cohorts → growth", domainForPath("/admin/players/cohorts") === "growth");
ok("/admin/players/<id> → support", domainForPath("/admin/players/usr_123") === "support");
ok("/admin/resolver/<id> → trading", domainForPath("/admin/resolver/mkt_1") === "trading");
ok("/admin/kyc/<id> → compliance", domainForPath("/admin/kyc/usr_1") === "compliance");
ok("/admin/updown/rounds → trading", domainForPath("/admin/updown/rounds") === "trading");
ok("unknown /admin route fails CLOSED to ops", domainForPath("/admin/does-not-exist") === "ops");
ok("/admin/staff is Owner-only", isOwnerOnlyPath("/admin/staff"));
ok("/admin/roles is Owner-only", isOwnerOnlyPath("/admin/roles"));
ok("/admin/players is NOT Owner-only", !isOwnerOnlyPath("/admin/players"));
// C7-SPEC rulings 322, 327 · the desk, and its two sub-routes through the prefix match.
ok("/admin/desk is Owner-only", isOwnerOnlyPath("/admin/desk"));
ok("/admin/desk/<a 24-hex record id> is Owner-only", isOwnerOnlyPath("/admin/desk/hb_0123456789abcdef01234567"));
ok("/admin/desk/new is Owner-only", isOwnerOnlyPath("/admin/desk/new"));
ok("/admin/desk → ops", domainForPath("/admin/desk") === "ops", domainForPath("/admin/desk"));

// Completeness: every real admin nav route (minus the TOTP-exempt gate pages) + the
// alias + Owner-only routes maps explicitly to a domain, and no prefix is shadowed.
{
  const EXEMPT = ["/admin/2fa", "/admin/totp-verify"];
  const navHrefs = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => !EXEMPT.some((e) => h === e || h.startsWith(e + "/")));
  const extra = ["/admin/kyc", "/admin/resolver", "/admin/transactions", "/admin/staff", "/admin/roles"];
  const problems = assertRouteDomainsComplete([...navHrefs, ...extra]);
  if (problems.length) console.log(problems.map((p) => "  · " + p).join("\n"));
  ok("every admin route maps to a domain (no unmapped / shadowed)", problems.length === 0);
}

// ── 7b. THE TWO MAPS MUST AGREE ───────────────────────────────────────────────
// ⛔ WHY THIS EXISTS, measured not supposed. A route→domain answer is stored TWICE: `ROUTE_DOMAINS`
// (read by `domainForPath`, which gates the PAGE) and the `domain` literal on each `NavItem` (read by
// `filterNavGroups`, which decides whether the SIDEBAR shows the link). Nothing compared them. So a
// section could be mapped one way for its page and another for its menu entry, and the split is silent:
// measured on U17's own RED control — delete `["/admin/contacts", "growth"]` from ROUTE_DOMAINS and the
// page correctly refuses GROWTH (fail-closed to `ops`), while the sidebar STILL renders "Contacts" to
// GROWTH, because `filterNavGroups` only asks `set.has(it.domain)` and never calls `domainForPath(it.href)`.
// The operator gets a live link to a Restricted panel. Whichever of the two an author edits, this fails
// until the other follows. `ownerOnly`/`allStaff` items are exempt because those flags deliberately
// override the domain check (see `filterNavGroups`), so their literal need not match.
{
  const split = navDomainSplits(NAV_GROUPS, domainForPath);
  if (split.length) console.log(split.map((p) => "  · " + p).join("\n"));
  ok("every nav item's domain equals domainForPath(its href) — the menu and the page agree", split.length === 0);
}

// ── 8. getGrantMatrix — all editable roles × all domains; ADMIN absent ────────
{
  const m = await getGrantMatrix();
  ok("matrix has all 6 editable roles", Object.keys(m).length === EDITABLE_ROLES.length);
  ok("matrix never includes ADMIN", !("ADMIN" in m));
  ok("matrix rows cover every domain", Object.values(m).every((row) => DOMAINS.every((d) => d in row)));
}

// ── 9. A grant EDIT takes effect with no role change / redeploy ────────────────
{
  __resetGrantsForTest();
  ok("FINANCE acts on accounting by default", await canAct("FINANCE", "accounting"));
  await setRoleGrant("FINANCE", "accounting", true, false, "tester");
  ok("after edit — FINANCE no longer acts on accounting", !(await canAct("FINANCE", "accounting")));
  ok("after edit — FINANCE still VIEWS accounting", await canView("FINANCE", "accounting"));
  invalidateGrantsCache(); // no-op with no DB — the in-memory edit must survive
  ok("edit survives cache invalidation (no-DB store)", !(await canAct("FINANCE", "accounting")));
  await resetRoleGrantsToDefaults();
  ok("reset-to-defaults restores FINANCE accounting-act", await canAct("FINANCE", "accounting"));
}

// ── 10. setRoleGrant refuses ADMIN (Owner never editable) ─────────────────────
{
  let threw = false;
  try { await setRoleGrant("ADMIN", "accounting", true, true, "tester"); } catch { threw = true; }
  ok("setRoleGrant('ADMIN', …) throws — Owner not editable", threw);
}

// ── 11. defaultGrant is total (never undefined) ───────────────────────────────
ok("defaultGrant covers every (role,domain)", STAFF_ROLES.every((r) => DOMAINS.every((d) => {
  const g = defaultGrant(r, d);
  return typeof g.canView === "boolean" && typeof g.canAct === "boolean";
})));

// ── 12. The NAV reflects each role (nav layer of the gate, per role) ──────────
__resetGrantsForTest();
async function navKeysFor(role: Role): Promise<Set<string>> {
  const vd = Array.from(await viewableDomains(role));
  const groups = filterNavGroups(vd, role === "ADMIN");
  return new Set(groups.flatMap((g) => g.items.map((i) => i.key)));
}
{
  const owner = await navKeysFor("ADMIN");
  ok("Owner nav shows Access (staff + roles)", owner.has("staff") && owner.has("roles"));
  ok("Owner nav shows the desk", owner.has("desk"));
  ok("Owner nav shows money + compliance + markets", owner.has("finance") && owner.has("compliance") && owner.has("markets"));

  const fin = await navKeysFor("FINANCE");
  ok("FINANCE nav shows money (finance/insights/rates)", fin.has("finance") && fin.has("insights") && fin.has("config"));
  ok("FINANCE nav shows Overview", fin.has("overview"));
  ok("FINANCE nav HIDES compliance/markets/growth/players/Access", !fin.has("compliance") && !fin.has("markets") && !fin.has("affiliate") && !fin.has("players") && !fin.has("staff") && !fin.has("roles"));

  const sup = await navKeysFor("SUPPORT");
  ok("SUPPORT nav shows the players roster", sup.has("players"));
  ok("SUPPORT nav HIDES money/compliance/cohorts/Access", !sup.has("finance") && !sup.has("compliance") && !sup.has("cohorts") && !sup.has("staff"));

  const trad = await navKeysFor("MODERATOR");
  ok("Trading nav shows markets/resolver/moderation", trad.has("markets") && trad.has("resolver") && trad.has("moderation"));
  ok("Trading nav HIDES money/compliance/rates/Access", !trad.has("finance") && !trad.has("compliance") && !trad.has("config") && !trad.has("staff"));

  const aud = await navKeysFor("AUDITOR");
  ok("Auditor nav shows accounting + compliance (view)", aud.has("finance") && aud.has("compliance"));
  ok("Auditor nav HIDES Access + trading", !aud.has("staff") && !aud.has("markets"));

  // Access (staff/roles) and the desk are Owner-only for EVERY non-Owner role; 2FA setup shows for all staff.
  for (const r of ["COMPLIANCE", "MODERATOR", "FINANCE", "GROWTH", "AUDITOR", "SUPPORT"] as Role[]) {
    const n = await navKeysFor(r);
    ok(`${r} nav HIDES staff + roles + desk (Owner-only)`, !n.has("staff") && !n.has("roles") && !n.has("desk"));
    ok(`${r} nav shows 2FA setup (all staff)`, n.has("2fa"));
  }
}

/* ── 13. ⛔ THE DESK'S GATE IS NOT ITS DOMAIN — C7-SPEC rulings 322, 327, 341 ──────────────────
 * The desk maps to `ops` for route/nav completeness only. `ops` is DB-backed: the Owner can grant it to any role
 * LIVE at /admin/roles with no redeploy, so if the domain WERE the gate, the console would be one grant edit from
 * SUPPORT. This writes that grant and asserts the desk is still hidden and still Owner-only.
 * ⚠️ The §9 teardown pattern is used deliberately: the grant is reset before anything else reads the matrix, or it
 * would leak into a later per-role loop and this pin would break the suite it is protecting. */
{
  __resetGrantsForTest();
  await setRoleGrant("SUPPORT", "ops", true, false, "tester");
  /* ⚠️ THIS FIRST PIN IS A CONSTANT, AND ITS LABEL SAYS SO NOW. `isOwnerOnlyPath` reads a code list and consults no
   * grant, so it is character-identical in effect to §7's pin and would pass even if the grant DID open the desk —
   * the block's real measurements are the two below it, and the GATE itself is measured on both stores by
   * `test:house-bot-console` 1.341, which calls `houseConsoleAudience` with the same live grant in force. */
  ok("13 · the Owner-only list still holds the desk while an `ops` grant is live (a constant, not the grant path)", isOwnerOnlyPath("/admin/desk"));
  ok("13 · …and SUPPORT holds the ops view grant that was just written", await canView("SUPPORT", "ops"));
  const sup = await navKeysFor("SUPPORT");
  ok("13 · …and the desk is still absent from SUPPORT's nav (ownerOnly, not the domain)", !sup.has("desk"), [...sup].join(","));
  await resetRoleGrantsToDefaults();
  ok("13 · teardown · the ops grant is back to its default (SUPPORT cannot view ops)", !(await canView("SUPPORT", "ops")));
}

// ── 14 · ONE GRANT STORE PER PROCESS, WHATEVER THE MODULE INSTANCE (2026-10-02) ─────────────────────────────────────
// Next.js hands route handlers a DIFFERENT module instance from pages and server actions (`email.ts` and
// `wallet-service.ts` record it). The grant maps were module-scope `let`s, so every instance held its own: U23's drive
// set a grant from a dev route and the page never saw it; with a DB, a grant edited on /admin/roles (a server action)
// never reached an `/api/admin/*` route until a restart. Here a SECOND instance of rbac.ts is loaded beside the one this
// suite imported — a distinct module URL, which is exactly what a second bundle is — and each must see the other's write.
{
  const url = new URL("../src/lib/server/rbac.ts", import.meta.url).href + "?instance=second-bundle";
  const second = (await import(url)) as typeof import("../src/lib/server/rbac.ts");
  ok("14 · CONTROL · the second import IS a separate module instance (its functions are not this suite's) — else this section proves nothing",
    second.canView !== canView && second.setRoleGrant !== setRoleGrant);
  __resetGrantsForTest();
  const before = await second.canView("AUDITOR", "growth");
  await setRoleGrant("AUDITOR", "growth", true, false, "rbac-test");
  ok("14 · a grant written through one instance is read by the other (AUDITOR may now view growth there too)",
    before === false && (await second.canView("AUDITOR", "growth")) === true && (await second.canAct("AUDITOR", "growth")) === false);
  await second.setRoleGrant("AUDITOR", "growth", false, false, "rbac-test");
  ok("14 · …and the other way: the second instance's revoke reaches this one", (await canView("AUDITOR", "growth")) === false);
  const cellNow = (await second.roleReadGrants("AUDITOR"))["identity.contact"];
  const flipped = cellNow === "none" ? "masked" : "none";
  await second.setRoleReadGrant("AUDITOR", "identity.contact", flipped, "rbac-test");
  const { roleReadGrants: firstReads, resetRoleReadGrantsToDefaults } = await import("../src/lib/server/rbac.ts");
  ok("14 · the READ axis too: a read cell written through the second instance is the one this instance answers",
    (await firstReads("AUDITOR"))["identity.contact"] === flipped, `${cellNow} → ${flipped}`);
  await resetRoleReadGrantsToDefaults();
  await resetRoleGrantsToDefaults();
  ok("14 · teardown · both axes are back to their defaults", (await canView("AUDITOR", "growth")) === false
    && (await second.roleReadGrants("AUDITOR"))["identity.contact"] === cellNow);
}

/** §7b's comparison as a function, so `--prove-red` can hand it a planted map. ⛔ ONE definition. */
function navDomainSplits(groups: typeof NAV_GROUPS, resolve: (href: string) => string): string[] {
  const EXEMPT = ["/admin/2fa", "/admin/totp-verify"];
  const split: string[] = [];
  for (const g of groups) {
    for (const it of g.items) {
      if (it.ownerOnly || it.allStaff) continue;
      if (EXEMPT.some((e) => it.href === e || it.href.startsWith(e + "/"))) continue;
      const resolved = resolve(it.href);
      if (resolved !== it.domain) {
        split.push(`${it.href} — nav says "${it.domain}", ROUTE_DOMAINS says "${resolved}"`);
      }
    }
  }
  return split;
}

console.log(`\nrbac: ${pass} passed, ${fail} failed`);

/* ══ THE RED PROOF (`red:rbac`, S10 2026-10-01) — U17's control, made durable ═══════════════════
 * S9 proved §7b by planting the drift by hand (124 passed / 1 failed). This keeps that proof runnable:
 * each case plants ONE real drift IN MEMORY and §7b's own function must name /admin/contacts. In-process
 * by construction — this file makes no file-writing call. */
if (process.argv.includes("--prove-red")) {
  const problems: string[] = [];
  if (fail > 0) problems.push(`BASELINE: the shipped suite is already red (${fail})`);
  const isContacts = (h: string) => h === "/admin/contacts" || h.startsWith("/admin/contacts/");
  const cases: Array<{ name: string; splits: string[] }> = [
    {
      // U17's RED as §9 wrote it: the ROUTE_DOMAINS row is gone, so the page fails closed to `ops`.
      name: "the ROUTE_DOMAINS row for /admin/contacts is deleted (the page refuses GROWTH, the menu still shows it)",
      splits: navDomainSplits(NAV_GROUPS, (h) => (isContacts(h) ? "ops" : domainForPath(h))),
    },
    {
      // The mirror: the menu entry is edited, the route map is not.
      name: "the Contacts nav item's domain is edited to `ops` while ROUTE_DOMAINS still says growth",
      splits: navDomainSplits(
        NAV_GROUPS.map((g) => ({ ...g, items: g.items.map((it) => (isContacts(it.href) ? { ...it, domain: "ops" } : it)) })) as typeof NAV_GROUPS,
        domainForPath,
      ),
    },
  ];
  for (const c of cases) {
    const caught = c.splits.some((x) => x.startsWith("/admin/contacts "));
    console.log(`${caught ? "caught" : "MISSED"} · ${c.name}${caught ? "" : ` — splits: ${c.splits.join(" | ") || "(none)"}`}`);
    if (!caught) problems.push(c.name);
  }
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exit(1);
  }
  console.log(`\n${cases.length}/${cases.length} caught — RED PROOF COMPLETE`);
  process.exit(0);
}
if (fail > 0) process.exit(1);
