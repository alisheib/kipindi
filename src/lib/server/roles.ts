/**
 * Admin roles + RBAC model — the source of truth for "who is who" and, as of the
 * 2026-07-28 RBAC rollout, the DATA-DRIVEN grant model behind "who may see/do what".
 *
 * TWO layers live here, both pure/client-safe (no DB, no server-only imports):
 *   1. The role set + legacy capability TIERS (`*_ROLES` `Set<Role>`) — still used
 *      by the surfaces not yet migrated to the domain model. Being retired in favour
 *      of domains; do not add new tiers.
 *   2. The RBAC model: `AdminDomain` (fixed code axis), `ROUTE_DOMAINS` (route→domain
 *      VIEW map), `DEFAULT_GRANTS` (the seed matrix). The role→domain GRANTS are DATA
 *      (Prisma `RoleDomainGrant`, Owner-edited live at /admin/roles); the DB-backed
 *      loader + `requireStaff()` action guard live in the server-only `rbac.ts`, which
 *      falls back to `DEFAULT_GRANTS` here when a row is absent. ADMIN (Owner) bypasses
 *      the table entirely (all view+act) so a bad edit can never lock the Owner out.
 *
 * Keep the tiers tight — widening one re-grants authority across every action that
 * still imports it.
 */

export type Role =
  | "PLAYER"
  | "AGENT"
  | "MODERATOR"
  | "ADMIN"
  | "COMPLIANCE"
  | "SUPPORT"
  // RBAC staff roles (2026-07-28).
  | "FINANCE"
  | "GROWTH"
  | "AUDITOR";

// ─── Legacy capability tiers (being retired for domains — see below) ──────────

/** Can OPEN the admin console (read-level access + market-ops). Broadest tier. */
export const ADMIN_CONSOLE_ROLES = new Set<Role>(["ADMIN", "COMPLIANCE", "MODERATOR"]);

/** Market operations: create / resolve / void / candidates / proposals /
 *  moderation / sources. Resolution is separately two-officer-gated. */
export const MARKET_OPS_ROLES = new Set<Role>(["ADMIN", "COMPLIANCE", "MODERATOR"]);

/** Money movement: AML release/reject, manual credits, bonus grants, affiliate
 *  payout config, invites that grant bonuses. NEVER MODERATOR. */
export const MONEY_ROLES = new Set<Role>(["ADMIN", "COMPLIANCE"]);

/** Compliance decisions + sensitive PII: KYC/SoF review, KYC-document access,
 *  privacy/DSAR tooling, player credential changes (password/email). NEVER MODERATOR. */
export const COMPLIANCE_ROLES = new Set<Role>(["ADMIN", "COMPLIANCE"]);

/** Platform configuration + system + reports/exports + AI spend controls.
 *  These change economics or expose regulator-grade data. NEVER MODERATOR. */
export const CONFIG_ROLES = new Set<Role>(["ADMIN", "COMPLIANCE"]);

/** True if `role` is in `tier`. Null/undefined-safe. */
export function hasRole(role: string | null | undefined, tier: Set<Role>): boolean {
  return !!role && tier.has(role as Role);
}

// ─── RBAC: domains, roles, and the default grant matrix ───────────────────────

/** The fixed code axis every admin route + server action is tagged with. Mirrors
 *  the Prisma `AdminDomain` enum. The order here is the canonical display order. */
export const ADMIN_DOMAINS = [
  "overview",
  "accounting",
  "growth",
  "compliance",
  "trading",
  "ops",
  "support",
] as const;
export type AdminDomain = (typeof ADMIN_DOMAINS)[number];

export type Grant = { canView: boolean; canAct: boolean };

/** The 7 STAFF roles (role ≠ PLAYER/AGENT). ADMIN = Owner (hard-coded superuser). */
export const STAFF_ROLES = [
  "ADMIN",
  "COMPLIANCE",
  "MODERATOR",
  "FINANCE",
  "GROWTH",
  "AUDITOR",
  "SUPPORT",
] as const satisfies readonly Role[];

/** Staff roles OTHER than the Owner — the rows the grant matrix stores + the editor shows. */
export const EDITABLE_ROLES = STAFF_ROLES.filter((r) => r !== "ADMIN");

export function isStaffRole(role: string | null | undefined): role is Role {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

/** ADMIN = Owner = hard-coded superuser (bypasses the grant table entirely). */
export function isAdmin(role: string | null | undefined): boolean {
  return role === "ADMIN";
}

/** UI label per role. MODERATOR is surfaced as "Trading" (enum value unchanged). */
export const ROLE_LABEL: Record<Role, string> = {
  PLAYER: "Player",
  AGENT: "Agent",
  ADMIN: "Owner",
  COMPLIANCE: "Compliance",
  MODERATOR: "Trading",
  FINANCE: "Finance",
  GROWTH: "Growth",
  AUDITOR: "Auditor",
  SUPPORT: "Support",
};

/** Short label per domain (headings, chips). */
export const DOMAIN_LABEL: Record<AdminDomain, string> = {
  overview: "Overview",
  accounting: "Accounting & money",
  growth: "Growth & marketing",
  compliance: "Compliance & KYC",
  trading: "Trading & markets",
  ops: "Platform ops",
  support: "Player support",
};

/** Plain-English "what this domain covers" — reused by the /admin/staff and
 *  /admin/roles consequence highlighting so the Owner sees what a grant means. */
export const DOMAIN_SUMMARY: Record<AdminDomain, { view: string; act: string }> = {
  overview: {
    view: "the dashboard and live ops",
    act: "—",
  },
  accounting: {
    view: "finance, reports, transactions, payments, settlement, and rates & fees",
    act: "adjust player balances, run settlement, and edit rates & fees",
  },
  growth: {
    view: "affiliate, bonuses, invites, and player cohorts",
    act: "grant bonuses and run affiliate / invite campaigns",
  },
  compliance: {
    view: "KYC, AML, approvals, DSAR / privacy, retention, the audit log, and objections",
    act: "approve or reject KYC & AML, export player data, and resolve objections",
  },
  trading: {
    view: "markets, the resolver, candidates, proposals, sources, Up & Down, and comment moderation",
    act: "create, curate and resolve markets, and moderate comments",
  },
  ops: {
    view: "system health and AI usage",
    act: "change system and AI settings",
  },
  support: {
    view: "the player roster and basic profiles",
    act: "suspend / restore accounts, reset passwords, and set emails",
  },
};

/**
 * The DEFAULT grant matrix (code source of truth). The DB `RoleDomainGrant` table
 * stores the Owner's OVERRIDES; the loader (`rbac.ts`) falls back here when a row is
 * absent, so the system is correct even with an empty table. ADMIN is intentionally
 * ABSENT — it bypasses the table (all view+act) and can never be locked out.
 *
 * Ali-approved (2026-07-28). Separation of duties: Finance moves money, Compliance
 * does compliance (incl. AML), Trading never touches money/PII/config, Auditor is
 * read-only everywhere, Support is the player desk (no money/PII/KYC). Every value
 * is editable live at /admin/roles.
 */
export const DEFAULT_GRANTS: Record<
  Exclude<Role, "ADMIN" | "PLAYER" | "AGENT">,
  Partial<Record<AdminDomain, Grant>>
> = {
  COMPLIANCE: {
    overview: { canView: true, canAct: false },
    compliance: { canView: true, canAct: true },
    accounting: { canView: true, canAct: false },
    support: { canView: true, canAct: false },
  },
  MODERATOR: {
    overview: { canView: true, canAct: false },
    trading: { canView: true, canAct: true },
  },
  FINANCE: {
    overview: { canView: true, canAct: false },
    accounting: { canView: true, canAct: true },
  },
  GROWTH: {
    overview: { canView: true, canAct: false },
    growth: { canView: true, canAct: true },
  },
  AUDITOR: {
    overview: { canView: true, canAct: false },
    accounting: { canView: true, canAct: false },
    compliance: { canView: true, canAct: false },
  },
  SUPPORT: {
    overview: { canView: true, canAct: false },
    support: { canView: true, canAct: true },
  },
};

/** The default grant for (role, domain). ADMIN ⇒ all-true; otherwise the seed
 *  matrix, defaulting to {false,false} for any unlisted pair. */
export function defaultGrant(role: Role, domain: AdminDomain): Grant {
  if (role === "ADMIN") return { canView: true, canAct: true };
  const row = (DEFAULT_GRANTS as Record<string, Partial<Record<AdminDomain, Grant>>>)[role];
  return row?.[domain] ?? { canView: false, canAct: false };
}

/**
 * Route prefix → domain (the VIEW gate). ORDER MATTERS: most-specific first (first
 * match wins), exactly like ROUTE_KEYS in admin-nav-groups.ts. Every /admin/** route
 * resolves here; `assertRouteDomainsComplete()` guards completeness + ordering.
 *
 * `/admin` (root) → overview is handled directly in `domainForPath`. `/admin/staff`
 * and `/admin/roles` are tagged `ops` for completeness but gated Owner-only by
 * `isOwnerOnlyPath` in the layout, ahead of the domain check.
 */
export const ROUTE_DOMAINS: ReadonlyArray<readonly [prefix: string, domain: AdminDomain]> = [
  ["/admin/live", "overview"],
  // accounting
  ["/admin/insights", "accounting"],
  ["/admin/settlement", "accounting"],
  ["/admin/finance", "accounting"],
  ["/admin/reports", "accounting"],
  ["/admin/payments", "accounting"],
  ["/admin/transactions", "accounting"],
  ["/admin/config", "accounting"],
  // growth (cohorts BEFORE the broader /admin/players → support)
  ["/admin/players/cohorts", "growth"],
  ["/admin/affiliate", "growth"],
  ["/admin/bonuses", "growth"],
  ["/admin/invites", "growth"],
  // support
  ["/admin/players", "support"],
  // trading
  ["/admin/events", "trading"],
  ["/admin/ai-polls", "trading"],
  ["/admin/candidates", "trading"],
  ["/admin/proposals", "trading"],
  ["/admin/markets", "trading"],
  ["/admin/resolver-queue", "trading"],
  ["/admin/resolver", "trading"],
  ["/admin/sources", "trading"],
  ["/admin/updown", "trading"],
  ["/admin/moderation", "trading"],
  // compliance
  ["/admin/compliance", "compliance"],
  ["/admin/objections", "compliance"],
  ["/admin/aml", "compliance"],
  ["/admin/self-exclusions", "compliance"],
  ["/admin/privacy", "compliance"],
  ["/admin/retention", "compliance"],
  ["/admin/audit", "compliance"],
  ["/admin/approvals", "compliance"],
  ["/admin/kyc", "compliance"],
  // ops (staff/roles here only for route/nav completeness — Owner-only gate is separate)
  ["/admin/system", "ops"],
  ["/admin/ai-usage", "ops"],
  ["/admin/staff", "ops"],
  ["/admin/roles", "ops"],
];

/** Resolve an /admin path to its domain. Unknown /admin/* routes fail CLOSED to
 *  `ops` (Owner-only under the default matrix) rather than fail-open to overview —
 *  a new route with no explicit mapping stays Owner-visible until deliberately
 *  mapped. `assertRouteDomainsComplete` fails CI if a real route is left unmapped. */
export function domainForPath(path: string): AdminDomain {
  if (path === "/admin" || path === "/admin/") return "overview";
  for (const [prefix, domain] of ROUTE_DOMAINS) {
    if (path === prefix || path.startsWith(prefix + "/")) return domain;
  }
  return "ops";
}

/** True if a prefix is explicitly listed in ROUTE_DOMAINS (or is the /admin root). */
function isExplicitlyMapped(path: string): boolean {
  if (path === "/admin") return true;
  return ROUTE_DOMAINS.some(([p]) => path === p || path.startsWith(p + "/"));
}

/**
 * Guard (test:rbac): every route prefix in `routePrefixes` is explicitly mapped
 * (not merely caught by the fail-closed default), and no earlier prefix shadows a
 * later, more-specific one that maps to a DIFFERENT domain.
 */
export function assertRouteDomainsComplete(routePrefixes: readonly string[]): string[] {
  const problems: string[] = [];
  for (const rp of routePrefixes) {
    if (!isExplicitlyMapped(rp)) {
      problems.push(`route "${rp}" is not mapped in ROUTE_DOMAINS (fell through to "${domainForPath(rp)}")`);
    }
  }
  for (let i = 0; i < ROUTE_DOMAINS.length; i++) {
    for (let j = 0; j < i; j++) {
      if (
        ROUTE_DOMAINS[i][0].startsWith(ROUTE_DOMAINS[j][0] + "/") &&
        ROUTE_DOMAINS[i][1] !== ROUTE_DOMAINS[j][1]
      ) {
        problems.push(
          `route "${ROUTE_DOMAINS[i][0]}" (${ROUTE_DOMAINS[i][1]}) is unreachable — "${ROUTE_DOMAINS[j][0]}" (${ROUTE_DOMAINS[j][1]}) matches first. Move the specific prefix earlier.`,
        );
      }
    }
  }
  return problems;
}

/** The two Owner-only surfaces — role assignment + the grant matrix. Gated ADMIN
 *  regardless of any `ops` grant (checked in the layout ahead of the domain gate). */
export const OWNER_ONLY_PREFIXES = ["/admin/staff", "/admin/roles"] as const;
export function isOwnerOnlyPath(path: string): boolean {
  return OWNER_ONLY_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}
