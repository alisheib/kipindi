/**
 * `npm run qa:admin-view-matrix` — the admin VIEW gate, driven, for every role × every domain.
 *
 * ⭐ WHY 49 CELLS AND NOT 47 × 7 = 329. The view gate is decided **per DOMAIN**, not per page:
 * `domainForPath(path)` resolves every `/admin/**` route to exactly one of seven domains and
 * the layout then asks `canView(role, domain)`. Loading all 47 routes as all 7 roles would
 * re-prove one function call 282 times. Driving 7 roles × 7 domains proves the gate itself,
 * and `test:rbac`'s `assertRouteDomainsComplete` proves the route→domain map separately — so
 * the two together cover all 47 routes with ~60 navigations instead of 329.
 *
 * ⛔ THE MAP IS PROVEN, NOT ASSUMED, AND THAT IS THE LOAD-BEARING PART. If `ROUTE_DOMAINS`
 * were wrong for some route, this sweep would still pass while that route was mis-gated. §0
 * therefore asserts every route prefix this file names resolves to the domain it claims,
 * using the product's own resolver rather than a copy.
 *
 * WHAT EACH CELL ASSERTS — the invariant, not the presence:
 *   canView === true  → the role lands ON the path and sees the page's own content
 *   canView === false → the role gets <AdminRestricted>, which is a rendered 200 with NO data
 *                       (never a redirect, and never the page with empty tables)
 *
 * ⚠️ AND THE FALSE ARM IS THE ONE THAT MATTERS. A gate that redirects looks identical to a
 * gate that fails open once the officer's session expires; a gate that renders the page with
 * zero rows looks identical to "there is nothing here today". `AdminRestricted` is neither,
 * and the layout's own comment says why: the page subtree AND its server data-fetch never run.
 *
 * ⛔ LOCALHOST ONLY — it signs in as the seeded local staff fixtures.
 * Prereqs: npm run db:seed-admin-local && npm run db:seed-staff-local ; next build && next start
 */
import { browser, loginOnce, bodyText, recorder } from "./live/harness.mjs";
import { LOCAL_STAFF_ROLES } from "./local-staff.mjs";
import { domainForPath, isOwnerOnlyPath, ADMIN_DOMAINS, defaultGrant } from "../src/lib/server/roles.ts";

const BASE = process.env.LIVE_BASE ?? "http://localhost:3001";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(BASE)) {
  console.error(`REFUSED — localhost-only, got BASE=${BASE}`);
  process.exit(1);
}

/**
 * One representative route per domain. ⚠️ Chosen to be a route whose domain is NOT the
 * fail-closed default: `domainForPath` returns "ops" for anything unmapped, so testing an
 * unmapped route would pass for the wrong reason. §0 asserts each one resolves as claimed.
 */
const REPRESENTATIVE = [
  ["overview", "/admin/live"],
  ["accounting", "/admin/finance"],
  ["growth", "/admin/bonuses"],
  ["compliance", "/admin/aml"],
  ["trading", "/admin/markets"],
  ["ops", "/admin/system"],
  ["support", "/admin/players"],
];

const OWNER_ONLY = ["/admin/staff", "/admin/roles"];

const r = recorder("qa:admin-view-matrix — the VIEW gate, driven, 7 roles × 7 domains");

// ── §0 · the route→domain map is what this sweep assumes ──────────────────────────
console.log("\n§0 the route→domain map (asserted with the product's own resolver)\n");
{
  const covered = new Set(REPRESENTATIVE.map(([d]) => d));
  r.check("§0 every ADMIN_DOMAIN has a representative route",
    ADMIN_DOMAINS.every((d) => covered.has(d)),
    `missing: ${ADMIN_DOMAINS.filter((d) => !covered.has(d)).join(", ")}`);
  for (const [domain, path] of REPRESENTATIVE) {
    r.check(`§0 ${path} resolves to "${domain}"`, domainForPath(path) === domain, `got "${domainForPath(path)}"`);
  }
  for (const p of OWNER_ONLY) {
    r.check(`§0 ${p} is owner-only (checked AHEAD of the domain gate)`, isOwnerOnlyPath(p));
  }
}

const { b } = await browser();
const ROLES = ["ADMIN", ...LOCAL_STAFF_ROLES];

// Sign in once per role. ⚠️ ADMIN is NOT a `local:` persona — `seed-admin-local.mts` owns that
// row under a different phone, deliberately (two scripts writing one user is how a fixture
// gets silently re-hashed under a running driver), so the Owner signs in explicitly below.
const states = {};
try {
  // ⛔ ONE LOGIN IMPLEMENTATION, INCLUDING THE OWNER. This block used to hand-roll the ADMIN
  // sign-in and waited for `/staff · confidential/` — which the ADMIN SIGN-IN PAGE also
  // renders. It therefore declared success on the login form, and the sweep reported SEVEN
  // "the Owner cannot view this page" failures over a perfectly working console. The harness's
  // `login()` carries a negative check for exactly that page; using it is the fix, and
  // `local:ADMIN` now resolves to the `seed-admin-local` fixture.
  for (const role of ROLES) states[role] = await loginOnce(b, `local:${role}`);
  r.note(`signed in once each: ${Object.keys(states).join(", ")}`);

  // ── §1 · 7 roles × 7 domains ────────────────────────────────────────────────────
  console.log("\n§1 the matrix\n");
  for (const role of ROLES) {
    for (const [domain, path] of REPRESENTATIVE) {
      const expected = role === "ADMIN" ? true : defaultGrant(role, domain).canView;
      const c = await b.newContext({ storageState: states[role], viewport: { width: 1280, height: 900 } });
      const p = await c.newPage();
      await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      const onPath = new URL(p.url()).pathname === path;
      const txt = await bodyText(p);
      const restricted = txt.includes("your role cannot view this page");

      if (expected) {
        r.check(`§1 ${role.padEnd(11)} ${domain.padEnd(11)} CAN view ${path}`,
          onPath && !restricted, `onPath=${onPath} restricted=${restricted} url=${p.url()}`);
      } else {
        // ⛔ BOTH HALVES. "Not on the page" is not enough — a redirect to the login form
        // would satisfy it while looking, to an officer, like an expired session.
        r.check(`§1 ${role.padEnd(11)} ${domain.padEnd(11)} is REFUSED ${path} (rendered, not redirected)`,
          onPath && restricted, `onPath=${onPath} restricted=${restricted} url=${p.url()}`);
      }
      await c.close();
    }
  }

  // ── §2 · owner-only, ahead of the domain gate ───────────────────────────────────
  console.log("\n§2 owner-only surfaces\n");
  for (const role of ROLES) {
    for (const path of OWNER_ONLY) {
      const c = await b.newContext({ storageState: states[role], viewport: { width: 1280, height: 900 } });
      const p = await c.newPage();
      await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      const onPath = new URL(p.url()).pathname === path;
      const txt = await bodyText(p);
      const restricted = txt.includes("your role cannot view this page");
      if (role === "ADMIN") {
        // ⛔ `onPath` TOO, NOT JUST `!restricted`. The first version asserted only "the
        // restricted panel is absent", which is ALSO true of the sign-in form — so this cell
        // passed while the Owner was not authenticated at all, and only §1's stricter check
        // exposed it. A positive assertion about access must require ARRIVAL.
        r.check(`§2 ADMIN reaches ${path}`, onPath && !restricted,
          `onPath=${onPath} restricted=${restricted} url=${p.url()}`);
      } else {
        // ⭐ THE INTERESTING CELL. `/admin/staff` and `/admin/roles` are tagged `ops` in
        // ROUTE_DOMAINS "for completeness", and the Owner can grant `ops` view to any role at
        // /admin/roles. If the owner-only check were NOT ahead of the domain gate, that grant
        // would hand a role the ability to edit the grant matrix — a self-escalation.
        r.check(`§2 ${role.padEnd(11)} is refused ${path} regardless of any ops grant`,
          restricted, `restricted=${restricted} url=${p.url()}`);
      }
      await c.close();
    }
  }
} finally {
  await b.close();
}

process.exit(r.done() > 0 ? 1 : 0);
