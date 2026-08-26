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

/** Safe role→label for display in the admin chrome (falls back to the raw value). */
export function roleLabel(role: string | null | undefined): string {
  return (role && ROLE_LABEL[role as Role]) || (role ?? "—");
}

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

/* ────────────────────────────────────────────────────────────────────────────
 * READ_TIERS — the SECOND axis: not "may this role reach this ROUTE?" but
 * "may this role read this FIELD?"  Design + rulings: docs/READ-TIERS.md.
 *
 * ⭐ IT COMPOSES WITH THE DOMAIN AXIS, IT NEVER REPLACES IT. A role must still hold
 * the domain to reach the route at all; READ_TIERS can only ever SUBTRACT from what
 * it finds there. A field being readable is never a reason to grant a route.
 *
 * ⛔ AND IT DOES NOT EXEMPT ADMIN — that is ruling D3, and it is the only reason the
 * rule is testable. ADMIN is the ONLY account that exists on production, so a masking
 * rule ADMIN skipped could not be witnessed by any session anyone can open. Note that
 * `defaultGrant` above DOES short-circuit ADMIN to all-true; `defaultReadGrant` below
 * deliberately does NOT, and the difference is the whole point.
 * ──────────────────────────────────────────────────────────────────────────── */

/** The four field classes. ⚠️ FOUR IS A DESIGN LIMIT, NOT AN ACCIDENT (§3.1): every
 *  class is a column somebody fills in for seven roles, and a matrix nobody can hold
 *  in their head is edited wrongly. A fifth must DISPLACE one of these. */
export const READ_CLASSES = [
  "money.figures",
  "identity.contact",
  "identity.personal",
  "history.activity",
] as const;
export type ReadClass = (typeof READ_CLASSES)[number];

/**
 * ⭐ THE CELL, DEFINED (§4c — the build found §3.2 and D3 contradicting each other):
 *
 *   read   → masked AT REST, and this role may REVEAL it (audited, D4)
 *   masked → masked at rest, and this role may NEVER reveal — this is the ceiling
 *   none   → not rendered at all
 *
 * So `read` is not "sees it", it is "is permitted to reveal it". Every sensitive
 * field is masked at rest for EVERY role, ADMIN included.
 */
export type ReadCell = "read" | "masked" | "none";

/**
 * ⚠️ WHICH CLASSES HAVE A MASKED FORM AT ALL — a rule, not an exception list.
 * A masked form only exists for a datum with a SHAPE worth preserving: a balance, an
 * address, a date of birth. A list of a player's own bets has no masked form that is
 * both useful and safe, and §3.2 calls `history.activity` "the one a support agent
 * genuinely needs". For a non-maskable class, `read` renders IN FULL and `none`
 * renders nothing — there is no middle value to reach.
 */
export const MASKABLE_CLASSES = new Set<ReadClass>([
  "money.figures",
  "identity.contact",
  "identity.personal",
]);

export function isMaskable(cls: ReadClass): boolean {
  return MASKABLE_CLASSES.has(cls);
}

/**
 * The seed grid (docs/READ-TIERS.md §3.2), ruled 2026-08-26.
 *
 * ⭐ THE ONE CELL THAT IS THE WHOLE DESIGN: SUPPORT reads `money.figures` as
 * `masked`, not `none`. A support agent must be able to say "I can see a withdrawal
 * of TZS 2,000 on the 26th that failed" — the EVENT — without reading the standing
 * balance. Movements yes, totals no.
 *
 * ⛔ ADMIN IS LISTED EXPLICITLY rather than short-circuited, so that flipping a cell
 * here is the ONLY way ADMIN's reads change. There is no code path that grants ADMIN
 * a read this table does not.
 */
export const DEFAULT_READ_GRANTS: Record<
  Exclude<Role, "PLAYER" | "AGENT">,
  Record<ReadClass, ReadCell>
> = {
  ADMIN: {
    "money.figures": "read",
    "identity.contact": "read",
    "identity.personal": "read",
    "history.activity": "read",
  },
  COMPLIANCE: {
    "money.figures": "read",
    "identity.contact": "read",
    "identity.personal": "read",
    "history.activity": "read",
  },
  FINANCE: {
    "money.figures": "read",
    "identity.contact": "masked",
    "identity.personal": "none",
    "history.activity": "read",
  },
  AUDITOR: {
    "money.figures": "read",
    "identity.contact": "masked",
    "identity.personal": "masked",
    "history.activity": "read",
  },
  SUPPORT: {
    "money.figures": "masked",
    "identity.contact": "masked",
    "identity.personal": "none",
    "history.activity": "read",
  },
  GROWTH: {
    "money.figures": "none",
    "identity.contact": "masked",
    "identity.personal": "none",
    "history.activity": "read",
  },
  MODERATOR: {
    "money.figures": "none",
    "identity.contact": "none",
    "identity.personal": "none",
    "history.activity": "read",
  },
};

/** The default cell for (role, class). ⛔ Unknown / non-staff roles get `none` —
 *  a read tier must FAIL CLOSED. A PLAYER reading their OWN record is not governed
 *  by this axis at all (§6: "not applied to the player's own view of themselves"). */
export function defaultReadGrant(role: Role | string | null | undefined, cls: ReadClass): ReadCell {
  const row = (DEFAULT_READ_GRANTS as Record<string, Record<ReadClass, ReadCell>>)[
    String(role ?? "")
  ];
  return row?.[cls] ?? "none";
}

/**
 * THE ONE HELPER every surface asks (§3.3). A page must never decide this for itself —
 * §6: "if the answer to 'can support see X?' ever lives in a .tsx file, the matrix has
 * stopped being the authority."
 *
 * `override` is the resolved `RoleReadGrant` row when one exists, mirroring exactly how
 * `RoleDomainGrant` overrides `DEFAULT_GRANTS`. Passing `undefined` yields the default,
 * so a caller that has not loaded overrides still fails closed rather than open.
 */
export function canRead(
  role: Role | string | null | undefined,
  cls: ReadClass,
  override?: ReadCell | null,
): ReadCell {
  return override ?? defaultReadGrant(role, cls);
}

/** May this role reveal the raw value? ⭐ This is the property the suite asserts,
 *  because at rest ADMIN and SUPPORT render the SAME masked text — the difference
 *  between them is whether the reveal control exists at all (§4c). */
export function canReveal(
  role: Role | string | null | undefined,
  cls: ReadClass,
  override?: ReadCell | null,
): boolean {
  return canRead(role, cls, override) === "read";
}

/** Is the field rendered at all (in any form)? */
export function isReadable(
  role: Role | string | null | undefined,
  cls: ReadClass,
  override?: ReadCell | null,
): boolean {
  return canRead(role, cls, override) !== "none";
}

export const READ_CLASS_LABEL: Record<ReadClass, string> = {
  "money.figures": "Money figures",
  "identity.contact": "Contact details",
  "identity.personal": "Personal details",
  "history.activity": "Activity history",
};

/** What each class covers, in the words the /admin/roles editor shows. Kept beside the
 *  class list so a new class cannot be added without saying what it means. */
export const READ_CLASS_SUMMARY: Record<ReadClass, string> = {
  "money.figures":
    "wallet balance, bonus balance, lifetime deposits and withdrawals — any TZS total attributable to one named player",
  "identity.contact": "email address and unmasked phone number — the account-recovery set",
  "identity.personal":
    "date of birth, region, full document number and document images — the KYC set",
  "history.activity": "positions, bets, notification and login history",
};

export const READ_CELL_LABEL: Record<ReadCell, string> = {
  read: "Can reveal",
  masked: "Masked only",
  none: "Hidden",
};
