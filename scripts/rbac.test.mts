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
import { NAV_GROUPS } from "../src/components/admin/admin-nav-groups.ts";

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

console.log(`\nrbac: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
