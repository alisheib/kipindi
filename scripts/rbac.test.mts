/**
 * RBAC — locks the role-based admin-access policy: the default grant matrix, the
 * ADMIN (Owner) bypass, the critical negative invariants (Trading never touches
 * money/PII, Auditor acts nowhere, Support is the desk only), route→domain
 * completeness, the Owner-only surfaces, and the "a grant edit takes effect without
 * a role change or redeploy" contract (exercised via the no-DB in-memory store).
 * §15 (vb7): `softCheckStaff`, the soft guard for a read the officer did not press — EXECUTED over stored users, with
 * a red proof per property (`red:rbac`).
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
// §15's types only — the guard itself is imported where §15 runs, so §1–§14 never depend on its import graph.
import type { SoftGuardRequest } from "../src/lib/server/rbac-guard.ts";
import type { SessionData } from "../src/lib/server/session.ts";
import type { StoredUser } from "../src/lib/server/store.ts";
// §15.6 (vb7 review M2) reads rbac-guard.ts itself — a read, never a write.
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

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
// U36 · the SMS campaign list, and the two sub-routes its later units add (U37's /new, U47's /[id]) — one section, growth.
ok("/admin/campaigns → growth", domainForPath("/admin/campaigns") === "growth");
ok("/admin/campaigns/new → growth", domainForPath("/admin/campaigns/new") === "growth");
ok("/admin/campaigns/<id> → growth", domainForPath("/admin/campaigns/smc_x") === "growth");
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

  // U36 · "SMS campaigns" is growth's: GROWTH is shown it, and no other non-Owner role is by default (its badge, which
  // ships in every viewer's payload, is read only for a viewer who may see growth — `test:campaigns-page` §4).
  const gro = await navKeysFor("GROWTH");
  ok("GROWTH nav shows SMS campaigns", gro.has("campaigns"));
  for (const r of ["FINANCE", "SUPPORT", "MODERATOR", "AUDITOR", "COMPLIANCE"] as Role[]) {
    ok(`${r} nav HIDES SMS campaigns`, !(await navKeysFor(r)).has("campaigns"));
  }

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

// ── 15 · ⭐ vb7 · softCheckStaff — A READ THE OFFICER DID NOT PRESS NEVER NAVIGATES, AND A LAPSED FACTOR NEVER PASSES ──
// The Add a contact dialog's number lookup runs by itself when the ninth digit lands. Through `softRequireStaff` its
// second factor was `requireAdminTotp` — a REDIRECT — so once 2-step sign-in is on and its cookie lapses, typing the
// ninth digit navigated the console to the step-up page and the dialog's typing was gone. `softCheckStaff` is the same
// guard (the session, the STORED role, `canAct`, the SECURITY row on a refusal) with ONE change: a second factor that is
// not "ok" is refused in words. EXECUTED: stored users in the memory twin, the request handed in (a script has no request
// scope for the cookies), every verdict asked of the real guard. ⛔ A lapsed second factor is NEVER `ok`.
type SoftVerdict = { ok: true; userId: string; sessionId: string } | { ok: false; error: string; secondFactor?: true };
type SoftGuard = (domain: AdminDomain, action: string, refusal: string, request: SoftGuardRequest) => Promise<SoftVerdict>;
/** `check` is the guard for a read the officer did not press; `press` the guard for an action they pressed. */
type SoftGuards = { check: SoftGuard; press: SoftGuard };
type SoftFactor = Awaited<ReturnType<SoftGuardRequest["secondFactor"]>>;
type SoftOutcome = { verdict: SoftVerdict | null; to: string | null; threw: string | null };
/** §15's labels, ONCE — the run asserts each, and each red case must break ITS property. */
const SOFT_LABELS = {
  pass: "15.1 · softCheckStaff lets a GROWTH officer whose second factor is ok read — { ok: true } with the session's own ids, the factor asked once",
  lapsed: "15.2 · ⛔ A SECOND FACTOR THAT IS NOT OK NEVER PASSES — the Owner included: the guard RETURNS { ok: false, secondFactor: true } and never navigates, a lapsed sign-in told “Your 2-step sign-in has lapsed — confirm it in another tab, then try again.” and one never set up told “Set up your 2-step sign-in in another tab, then try again.”",
  role: "15.3 · ⛔ the role check is kept, BEFORE the factor: AUDITOR (no growth act) is refused in the caller's words with a SECURITY privilege_escalation_blocked row naming the action, the factor never asked — and a cookie that says ADMIN over a STORED AUDITOR row is refused the same (W25)",
  signin: "15.4 · no session, or a session whose user row is gone, still goes to the sign-in page (/auth/admin), the factor never asked",
  press: "15.5 · ⛔ an action the officer PRESSES keeps the step-up: softRequireStaff, for an officer who never set up 2-step sign-in, redirects to /admin/2fa/setup — never refused in words",
  wiring: "15.6 · ⛔ vb7 review M2 · production reads the cookies BY NAME: softRequireStaff asks currentSession() and checkAdminTotp() itself whenever no request is handed in, and rbac-guard exports no object a caller could rewrite under every guard — no SOFT_GUARD_REQUEST, no exported object literal that is not frozen",
} as const;
type SoftProperty = keyof typeof SOFT_LABELS;

const softGuard = await import("../src/lib/server/rbac-guard.ts");
const { getAuditPage, auditFlush } = await import("../src/lib/server/audit.ts");
const { db } = await import("../src/lib/server/store.ts");
/** §15.6 · rbac-guard.ts as the guard ships it, comments taken out. */
const RBAC_GUARD_SRC = decomment(readFileSync(new URL("../src/lib/server/rbac-guard.ts", import.meta.url), "utf8"));
/** A line break, built from its code. */
const NL15 = String.fromCharCode(10);

/** §15.6's reading of rbac-guard.ts, as a function so `--prove-red` can hand it a planted copy. ⛔ ONE definition. */
function softWiring(src: string): { held: boolean; seen: string } {
  const at = src.indexOf("export async function softRequireStaff(");
  const end = at < 0 ? -1 : src.indexOf("export async function softCheckStaff(", at + 1);
  const body = at < 0 ? "" : src.slice(at, end < 0 ? src.length : end);
  const session = body.includes("const session = opts.request ? await opts.request.session() : await currentSession();");
  const factor = body.includes("? await opts.request.secondFactor(session.userId, session.sessionId)")
    && body.includes(": await checkAdminTotp(session.userId, session.sessionId);");
  const hooks = [...src.matchAll(/^export const (\w+)(?::[^=]+)?\s*=\s*(?!Object\.freeze)[{[]/gm)].map((m) => m[1]);
  return {
    held: session && factor && hooks.length === 0 && !src.includes("SOFT_GUARD_REQUEST"),
    seen: `session by name ${session} · factor by name ${factor} · exported objects [${hooks}]`,
  };
}

/** One stored user per role §15 asks about — created once, in the memory twin. */
async function softCheckUsers(): Promise<Record<"GROWTH" | "AUDITOR" | "ADMIN", string>> {
  const at = "2026-10-03T08:00:00.000Z";
  const out = { GROWTH: "", AUDITOR: "", ADMIN: "" };
  for (const [i, role] of (["GROWTH", "AUDITOR", "ADMIN"] as const).entries()) {
    const id = `usr_rbac15_${role.toLowerCase()}`;
    if (!(await db.user.findById(id))) {
      await db.user.create({
        id, phoneE164: `+25570095100${i}`, email: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0,
        lockedUntil: null, role, status: "ACTIVE", locale: "EN", displayName: `RBAC15 ${role}`, dob: "1990-01-01", region: null,
        acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
        emailVerifiedAt: null, createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
      } as StoredUser);
    }
    out[role] = id;
  }
  return out;
}

/** A session cookie as the guard reads it — the ids, and a role the guard must never decide on. */
function softSession(userId: string, role: SessionData["role"]): SessionData {
  return { userId, sessionId: `s_rbac15_${userId}`, phoneE164: "+255700951009", role, kycStatus: "NOT_STARTED", iat: 0, exp: Date.now() + 3_600_000, lastSeenAt: 0 };
}

/** The request handed to the guard: that session, and a second factor that answers `factor` and records being asked. */
function softRequest(session: SessionData | null, factor: SoftFactor, asked: string[]): SoftGuardRequest {
  return { session: async () => session, secondFactor: async () => { asked.push("secondFactor"); return factor; } };
}

/** What one guard call did: returned a verdict, NAVIGATED (a NEXT_REDIRECT, and where to), or threw something else. */
async function softOutcome(run: () => Promise<SoftVerdict>): Promise<SoftOutcome> {
  try {
    return { verdict: await run(), to: null, threw: null };
  } catch (err) {
    const digest = String((err as { digest?: unknown } | null)?.digest ?? "");
    if (digest.startsWith("NEXT_REDIRECT;")) return { verdict: null, to: digest.split(";").slice(2, -2).join(";"), threw: null };
    return { verdict: null, to: null, threw: (err as Error)?.message ?? String(err) };
  }
}
function softSeen(o: SoftOutcome): string {
  return o.verdict !== null ? JSON.stringify(o.verdict) : o.to !== null ? `redirect ${o.to}` : `threw ${o.threw}`;
}

/** §15's verdicts as a function, so `--prove-red` can hand it a planted guard. ⛔ ONE definition. */
async function softCheckVerdicts(g: SoftGuards): Promise<Record<SoftProperty, { held: boolean; seen: string }>> {
  const U = SOFT_USERS;
  const LAPSED = softGuard.SECOND_FACTOR_LAPSED;
  const NOT_SET_UP = softGuard.SECOND_FACTOR_NOT_SET_UP;
  const REFUSAL = "rbac test · this role may not check numbers.";
  const ACTION = "contacts.lookup";

  const askedPass: string[] = [];
  const pass = await softOutcome(() => g.check("growth", ACTION, REFUSAL, softRequest(softSession(U.GROWTH, "GROWTH"), "ok", askedPass)));
  const passHeld = pass.verdict !== null && pass.verdict.ok === true && pass.verdict.userId === U.GROWTH
    && pass.verdict.sessionId === `s_rbac15_${U.GROWTH}` && askedPass.length === 1;

  const lapsedRuns: Array<["GROWTH" | "ADMIN", SoftFactor]> = [["GROWTH", "unverified"], ["GROWTH", "not-enrolled"], ["ADMIN", "unverified"], ["ADMIN", "not-enrolled"]];
  const lapsedSeen: string[] = [];
  let lapsedHeld = LAPSED === "Your 2-step sign-in has lapsed — confirm it in another tab, then try again."
    && NOT_SET_UP === "Set up your 2-step sign-in in another tab, then try again.";
  for (const [role, factor] of lapsedRuns) {
    const o = await softOutcome(() => g.check("growth", ACTION, REFUSAL, softRequest(softSession(U[role], role), factor, [])));
    lapsedSeen.push(`${role}/${factor}: ${softSeen(o)}`);
    const want = factor === "not-enrolled" ? NOT_SET_UP : LAPSED;
    if (!(o.verdict !== null && o.verdict.ok === false && o.verdict.error === want && o.verdict.secondFactor === true)) lapsedHeld = false;
  }

  const blocked = () => getAuditPage({ category: "SECURITY", actorId: U.AUDITOR, limit: 10_000 })
    .filter((e) => e.action === "privilege_escalation_blocked" && e.targetId === ACTION);
  await auditFlush();
  const before = blocked().length;
  const askedRole: string[] = [];
  const role = await softOutcome(() => g.check("growth", ACTION, REFUSAL, softRequest(softSession(U.AUDITOR, "AUDITOR"), "ok", askedRole)));
  const askedCookie: string[] = [];
  const cookie = await softOutcome(() => g.check("growth", ACTION, REFUSAL, softRequest(softSession(U.AUDITOR, "ADMIN"), "ok", askedCookie)));
  await auditFlush();
  const rows = blocked();
  const inWords = (o: SoftOutcome) => o.verdict !== null && o.verdict.ok === false && o.verdict.error === REFUSAL;
  const roleHeld = inWords(role) && inWords(cookie) && askedRole.length === 0 && askedCookie.length === 0 && rows.length - before === 2
    && rows.slice(0, 2).every((e) => e.payload?.role === "AUDITOR" && e.payload?.domain === "growth" && e.payload?.action === ACTION);

  const askedNone: string[] = [];
  const none = await softOutcome(() => g.check("growth", ACTION, REFUSAL, softRequest(null, "ok", askedNone)));
  const askedGone: string[] = [];
  const gone = await softOutcome(() => g.check("growth", ACTION, REFUSAL, softRequest(softSession("usr_rbac15_gone", "GROWTH"), "ok", askedGone)));
  const signinHeld = none.to === "/auth/admin" && gone.to === "/auth/admin" && askedNone.length === 0 && askedGone.length === 0;

  // A pressed action runs the REAL step-up (`requireAdminTotp`), so 2-step sign-in is switched ON for this one call:
  // GROWTH holds no secret in the memory twin, so the step-up's answer is the setup page.
  const savedSwitch = process.env.DISABLE_ADMIN_TOTP;
  delete process.env.DISABLE_ADMIN_TOTP;
  let press: SoftOutcome = { verdict: null, to: null, threw: "not run" };
  try {
    press = await softOutcome(() => g.press("growth", "contacts.add", REFUSAL, softRequest(softSession(U.GROWTH, "GROWTH"), "ok", [])));
  } finally {
    if (savedSwitch === undefined) delete process.env.DISABLE_ADMIN_TOTP;
    else process.env.DISABLE_ADMIN_TOTP = savedSwitch;
  }
  const pressHeld = press.to === "/admin/2fa/setup";

  const wiring = softWiring(RBAC_GUARD_SRC);

  return {
    pass: { held: passHeld, seen: `${softSeen(pass)} · factor asked ${askedPass.length}` },
    lapsed: { held: lapsedHeld, seen: lapsedSeen.join(" | ") },
    role: { held: roleHeld, seen: `${softSeen(role)} · cookie ADMIN: ${softSeen(cookie)} · factor asked ${askedRole.length}/${askedCookie.length} · rows +${rows.length - before}` },
    signin: { held: signinHeld, seen: `no session: ${softSeen(none)} · no row: ${softSeen(gone)}` },
    press: { held: pressHeld, seen: softSeen(press) },
    wiring: wiring,
  };
}

__resetGrantsForTest();
const SOFT_USERS = await softCheckUsers();
const SOFT_REAL: SoftGuards = {
  check: softGuard.softCheckStaff,
  press: (domain, action, refusal, request) => softGuard.softRequireStaff(domain, action, refusal, { request }),
};
{
  const v = await softCheckVerdicts(SOFT_REAL);
  for (const key of Object.keys(SOFT_LABELS) as SoftProperty[]) {
    ok(SOFT_LABELS[key], v[key].held);
    if (!v[key].held) console.log(`     ${v[key].seen}`);
  }
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
 * each case plants ONE real drift IN MEMORY and §7b's own function must name the section it was planted in. U36 made
 * it 4/4: both halves of the split, for /admin/contacts AND /admin/campaigns. vb7 adds §15's guard — four plants, each
 * on its own property (8/8). In-process by construction — this file makes no file-writing call. */
if (process.argv.includes("--prove-red")) {
  const problems: string[] = [];
  if (fail > 0) problems.push(`BASELINE: the shipped suite is already red (${fail})`);
  // ⭐ U36 · EVERY GROWTH SECTION BUILT ON THE SIX DOORS, BOTH HALVES OF THE SPLIT — 4/4. A section is planted by its
  // prefix (its page and every sub-route under it), and §7b's own function must name THAT section in each case.
  const SECTIONS = ["/admin/contacts", "/admin/campaigns"];
  const cases: Array<{ section: string; name: string; splits: string[] }> = SECTIONS.flatMap((section) => {
    const inSection = (h: string) => h === section || h.startsWith(section + "/");
    return [
      {
        // U17's RED as §9 wrote it: the ROUTE_DOMAINS row is gone, so the page fails closed to `ops`.
        section,
        name: `the ROUTE_DOMAINS row for ${section} is deleted (the page refuses GROWTH, the menu still shows it)`,
        splits: navDomainSplits(NAV_GROUPS, (h) => (inSection(h) ? "ops" : domainForPath(h))),
      },
      {
        // The mirror: the menu entry is edited, the route map is not.
        section,
        name: `the ${section} nav item's domain is edited to "ops" while ROUTE_DOMAINS still says growth`,
        splits: navDomainSplits(
          NAV_GROUPS.map((g) => ({ ...g, items: g.items.map((it) => (inSection(it.href) ? { ...it, domain: "ops" } : it)) })) as typeof NAV_GROUPS,
          domainForPath,
        ),
      },
    ];
  });
  for (const c of cases) {
    const caught = c.splits.some((x) => x.startsWith(`${c.section} `));
    console.log(`${caught ? "caught" : "MISSED"} · ${c.name}${caught ? "" : ` — splits: ${c.splits.join(" | ") || "(none)"}`}`);
    if (!caught) problems.push(c.name);
  }
  // ⭐ vb7 · §15 · THE SOFT GUARD FOR A READ NOBODY PRESSED — each plant on its own property, and `softCheckVerdicts`
  // must break THAT property.
  const softCases: Array<{ name: string; property: SoftProperty; guards: SoftGuards }> = [
    {
      name: "§15 · the lookup back on softRequireStaff — a lapsed 2-step sign-in redirects the console mid-typing (with 2-step off, it reads)",
      property: "lapsed",
      guards: { ...SOFT_REAL, check: (d, a, r, request) => softGuard.softRequireStaff(d, a, r, { request }) },
    },
    {
      name: "§15 · ⛔ the second factor asked and its answer ignored — a lapsed 2-step sign-in checks numbers",
      property: "lapsed",
      guards: { ...SOFT_REAL, check: (d, a, r, request) => softGuard.softCheckStaff(d, a, r, { ...request, secondFactor: async () => "ok" as const }) },
    },
    {
      name: "§15 · ⛔ W25 · the cookie's role trusted — a cookie that says ADMIN over a stored AUDITOR row checks numbers",
      property: "role",
      guards: {
        ...SOFT_REAL,
        check: async (d, a, r, request) => {
          const s = await request.session();
          if (s !== null && s.role === "ADMIN") {
            return (await request.secondFactor(s.userId, s.sessionId)) === "ok"
              ? { ok: true as const, userId: s.userId, sessionId: s.sessionId }
              : { ok: false as const, error: softGuard.SECOND_FACTOR_LAPSED };
          }
          return softGuard.softCheckStaff(d, a, r, request);
        },
      },
    },
    {
      name: "§15 · ⛔ a pressed Save made soft — softRequireStaff answers a lapsed factor in words instead of the step-up",
      property: "press",
      guards: { ...SOFT_REAL, press: (d, a, r, request) => softGuard.softRequireStaff(d, a, r, { refuseSecondFactor: true, request }) },
    },
  ];
  for (const c of softCases) {
    const v = await softCheckVerdicts(c.guards);
    const caught = !v[c.property].held;
    console.log(`${caught ? "caught" : "MISSED"} · ${c.name}${caught ? "" : ` — ${v[c.property].seen}`}`);
    if (!caught) problems.push(c.name);
  }
  // ⭐ vb7 review M2 · §15.6, planted in a COPY of rbac-guard.ts's text: the shared, writable request object back under
  // every guard built on softRequireStaff — 15.6 must refuse it.
  const hookName = "§15.6 · ⛔ M2 · the shared request object back — softRequireStaff reads the session through an exported, writable hook";
  const hooked = RBAC_GUARD_SRC.replace(
    "const session = opts.request ? await opts.request.session() : await currentSession();",
    "const session = await (opts.request ?? SOFT_GUARD_REQUEST).session();",
  ) + NL15 + "export const SOFT_GUARD_REQUEST: SoftGuardRequest = { session: currentSession, secondFactor: checkAdminTotp };" + NL15;
  const hookCaught = hooked !== RBAC_GUARD_SRC && !softWiring(hooked).held;
  console.log(`${hookCaught ? "caught" : "MISSED"} · ${hookName}${hookCaught ? "" : ` — ${softWiring(hooked).seen}`}`);
  if (!hookCaught) problems.push(hookName);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exit(1);
  }
  const total = cases.length + softCases.length + 1;
  console.log(`\n${total}/${total} caught — RED PROOF COMPLETE`);
  process.exit(0);
}
if (fail > 0) process.exit(1);
