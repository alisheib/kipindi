/**
 * Admin navigation — the groups, AND the route→key resolver that highlights them.
 *
 * ⚠️ WHY THE RESOLVER LIVES HERE. It used to exist TWICE, copy-pasted into
 * `app/admin/layout.tsx` and `admin-sidebar-nav.tsx`. They had already drifted: the
 * sidebar copy was missing `/admin/payments`, `/admin/kyc` and the `/admin/resolver/[id]`
 * detail route, so those three pages highlighted nothing in the sidebar. Nobody
 * noticed, because a nav item that fails to highlight looks like a design choice.
 *
 * One definition, imported by both. Adding a route is now a one-line change in one
 * file, and `assertNavKeysResolve()` fails the build if a prefix maps to a key that
 * no nav item owns — so a typo cannot silently highlight nothing again.
 */
import type { AdminDomain } from "@/lib/server/roles";

/** A nav item carries the RBAC `domain` it belongs to (drives visibility). Two
 *  flags override the domain check: `allStaff` (always shown to any staff — e.g.
 *  2FA setup) and `ownerOnly` (only ADMIN — e.g. staff/roles). See `filterNavGroups`. */
export type NavItem = {
  href: string;
  label: string;
  key: string;
  badge?: string;
  domain: AdminDomain;
  ownerOnly?: boolean;
  allStaff?: boolean;
};
export type NavGroup = { group: { en: string; sw: string }; items: ReadonlyArray<NavItem> };

export const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    group: { en: "Overview", sw: "Muhtasari" },
    items: [
      { href: "/admin",      label: "Overview", key: "overview", domain: "overview" },
      { href: "/admin/live", label: "Live ops", key: "live", domain: "overview" },
    ],
  },
  {
    group: { en: "Money", sw: "Pesa" },
    items: [
      { href: "/admin/insights", label: "Insights", key: "insights", domain: "accounting" },
      { href: "/admin/settlement",    label: "Settlement", key: "settlement", domain: "accounting" },
      { href: "/admin/finance", label: "Finance", key: "finance", domain: "accounting" },
      { href: "/admin/reports", label: "Reports", key: "reports", domain: "accounting" },
      { href: "/admin/payments", label: "Payments ops", key: "payments", domain: "accounting" },
      { href: "/admin/transactions", label: "Transactions", key: "transactions", domain: "accounting" },
    ],
  },
  {
    group: { en: "Players", sw: "Wachezaji" },
    items: [
      // Roster is `support` (the player desk); cohorts is aggregate `growth` analytics —
      // so this group shows different items to Support vs Growth.
      { href: "/admin/players",         label: "Roster",  key: "players", domain: "support" },
      { href: "/admin/players/cohorts", label: "Cohorts", key: "cohorts", domain: "growth" },
    ],
  },
  {
    group: { en: "Markets", sw: "Masoko" },
    items: [
      { href: "/admin/events",          label: "Event calendar", key: "events", domain: "trading" },
      { href: "/admin/ai-polls",        label: "AI poll generation", key: "ai-polls", domain: "trading" },
      { href: "/admin/candidates",     label: "AI candidates", key: "candidates", domain: "trading" },
      { href: "/admin/proposals",      label: "Player proposals", key: "proposals", domain: "trading" },
      { href: "/admin/markets",        label: "Curation queue", key: "markets", domain: "trading" },
      { href: "/admin/resolver-queue", label: "Resolver queue", key: "resolver", domain: "trading" },
      { href: "/admin/sources",        label: "Sources & categories", key: "sources", domain: "trading" },
      // Rates & fees change platform economics (money-grade) — `accounting`, not trading.
      { href: "/admin/config",         label: "Rates & fees", key: "config", domain: "accounting" },
    ],
  },
  {
    // Up & Down is a SEPARATE GAME (Ali, 2026-07-25 — "sealed completely"), so it gets
    // its own admin section rather than riding under Markets: its economics, chains,
    // rounds and settings all live here, and nothing about it is mixed into the
    // long-form-poll surfaces.
    group: { en: "Up & Down", sw: "Juu na Chini" },
    items: [
      { href: "/admin/updown",           label: "Overview",     key: "updown", domain: "trading" },
      // "AI proposals", not "Proposals" — /admin/proposals is the PLAYER proposal queue, and
      // two identically-labelled entries in one console is a support ticket waiting to happen.
      { href: "/admin/updown/proposals", label: "AI proposals", key: "updown-proposals", domain: "trading" },
      { href: "/admin/updown/rounds",    label: "Rounds",       key: "updown-rounds", domain: "trading" },
    ],
  },
  {
    group: { en: "Growth", sw: "Ukuaji" },
    items: [
      { href: "/admin/affiliate", label: "Affiliate", key: "affiliate", domain: "growth" },
      { href: "/admin/bonuses",   label: "Bonuses",   key: "bonuses", domain: "growth" },
      { href: "/admin/invites",   label: "Invites",   key: "invites", domain: "growth" },
    ],
  },
  {
    group: { en: "Compliance", sw: "Kanuni" },
    items: [
      { href: "/admin/compliance",      label: "Compliance",     key: "compliance", domain: "compliance" },
      // F11 — an OPEN objection freezes a market's settlement, so this queue holds
      // real money hostage until an officer clears it. It sits high on purpose.
      { href: "/admin/objections",      label: "Objections",     key: "objections", domain: "compliance" },
      // Comment moderation is content ops (Trading's remit) even though it lives in
      // the Compliance group visually — so it shows to Trading, not to Compliance.
      { href: "/admin/moderation",      label: "Comment moderation", key: "moderation", domain: "trading" },
      { href: "/admin/aml",             label: "AML queue",      key: "aml", domain: "compliance" },
      { href: "/admin/self-exclusions", label: "Self-exclusions", key: "sx", domain: "compliance" },
      { href: "/admin/privacy",         label: "Privacy / DSAR", key: "privacy", domain: "compliance" },
      { href: "/admin/retention",       label: "Retention",      key: "retention", domain: "compliance" },
      { href: "/admin/audit",           label: "Audit log",      key: "audit", domain: "compliance" },
    ],
  },
  {
    group: { en: "System", sw: "Mfumo" },
    items: [
      { href: "/admin/system",    label: "System",    key: "system", domain: "ops" },
      { href: "/admin/ai-usage",  label: "AI usage & credits", key: "ai-usage", domain: "ops" },
      { href: "/admin/approvals", label: "Approvals", key: "approvals", domain: "compliance" },
      // 2FA setup secures the logged-in officer's own account — every staff role must
      // reach it (the layout even force-redirects here on first login).
      { href: "/admin/2fa/setup", label: "2FA setup", key: "2fa", domain: "ops", allStaff: true },
    ],
  },
  {
    // Owner-only: assign roles + edit the permission matrix. `ownerOnly` hides these
    // from every non-ADMIN role (and the layout's isOwnerOnlyPath blocks the routes),
    // so a granted-ops role can never see or reach them.
    group: { en: "Access", sw: "Ufikiaji" },
    items: [
      { href: "/admin/staff", label: "Staff & roles", key: "staff", domain: "ops", ownerOnly: true },
      { href: "/admin/roles", label: "Role permissions", key: "roles", domain: "ops", ownerOnly: true },
    ],
  },
];

/**
 * Filter the nav to what a viewer may SEE. An item shows when: `allStaff` (any staff),
 * or `ownerOnly` && the viewer is the Owner (ADMIN), or the viewer's viewable domains
 * include the item's domain. Empty groups are dropped. This is the NAV layer of the
 * three-layer gate — it MUST agree with the route + action gates (same domains).
 */
export function filterNavGroups(
  viewDomains: ReadonlySet<AdminDomain> | readonly AdminDomain[],
  isOwner: boolean,
): NavGroup[] {
  const set = viewDomains instanceof Set ? viewDomains : new Set(viewDomains);
  const visible = (it: NavItem) =>
    !!it.allStaff || (it.ownerOnly ? isOwner : set.has(it.domain));
  return NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter(visible) }))
    .filter((g) => g.items.length > 0);
}

/**
 * Route prefix → nav key. ORDER MATTERS: the first match wins, so a more specific
 * prefix must come before the prefix it extends (`/admin/players/cohorts` before
 * `/admin/players`; `/admin/resolver-queue` before `/admin/resolver`).
 *
 * Entries whose key differs from their path are deliberate aliases — a page that
 * belongs under another nav item rather than owning one of its own:
 *   /admin/kyc      → approvals   (KYC review is part of the approvals queue)
 *   /admin/resolver → resolver    (the per-market detail page under the queue)
 */
const ROUTE_KEYS: ReadonlyArray<readonly [prefix: string, key: string]> = [
  ["/admin/live", "live"],
  ["/admin/finance", "finance"],
  ["/admin/reports", "reports"],
  ["/admin/payments", "payments"],
  ["/admin/players/cohorts", "cohorts"],
  ["/admin/players", "players"],
  ["/admin/privacy", "privacy"],
  ["/admin/retention", "retention"],
  ["/admin/sources", "sources"],
  ["/admin/config", "config"],
  ["/admin/ai-polls", "ai-polls"],
  ["/admin/candidates", "candidates"],
  ["/admin/proposals", "proposals"],
  ["/admin/markets", "markets"],
  ["/admin/resolver-queue", "resolver"],
  ["/admin/resolver", "resolver"],
  // ⚠️ ORDER IS LOAD-BEARING: the specific prefixes MUST precede the bare "/admin/updown",
  // or every sub-route resolves to the Overview key and its nav entry never highlights.
  // `assertNavKeysResolve()` (test:admin-nav) reports a reversed pair as unreachable.
  ["/admin/updown/proposals", "updown-proposals"],
  ["/admin/updown/rounds", "updown-rounds"],
  ["/admin/updown", "updown"],
  ["/admin/affiliate", "affiliate"],
  ["/admin/bonuses", "bonuses"],
  ["/admin/invites", "invites"],
  ["/admin/moderation", "moderation"],
  ["/admin/compliance", "compliance"],
  ["/admin/aml", "aml"],
  ["/admin/self-exclusions", "sx"],
  ["/admin/audit", "audit"],
  ["/admin/system", "system"],
  ["/admin/staff", "staff"],
  ["/admin/roles", "roles"],
  ["/admin/ai-usage", "ai-usage"],
  ["/admin/kyc", "approvals"],
  ["/admin/settlement", "settlement"],
  ["/admin/objections", "objections"],
  ["/admin/approvals", "approvals"],
  ["/admin/insights", "insights"],
  ["/admin/events", "events"],
  ["/admin/transactions", "transactions"],
  ["/admin/2fa", "2fa"],
];

/** THE resolver. One definition — imported by the layout and the sidebar alike. */
export function activeKeyFromPath(path: string): string {
  if (path === "/admin") return "overview";
  for (const [prefix, key] of ROUTE_KEYS) {
    if (path.startsWith(prefix)) return key;
  }
  return "overview";
}

/** Every key any nav item owns. */
export function navKeys(): Set<string> {
  const out = new Set<string>();
  for (const g of NAV_GROUPS) for (const it of g.items) out.add(it.key);
  return out;
}

/**
 * Guard: every key the resolver can emit must be owned by a nav item, or the page
 * highlights nothing. Called by `npm run test:admin-nav` — a typo'd key is a silent
 * failure otherwise, which is exactly how the previous copies drifted unnoticed.
 */
export function assertNavKeysResolve(): string[] {
  const owned = navKeys();
  const problems: string[] = [];
  for (const [prefix, key] of ROUTE_KEYS) {
    if (!owned.has(key)) problems.push(`route "${prefix}" resolves to key "${key}", which no nav item owns`);
  }
  // Ordering: a prefix that EXTENDS an earlier one is unreachable, because the
  // earlier (shorter) prefix matches first.
  for (let i = 0; i < ROUTE_KEYS.length; i++) {
    for (let j = 0; j < i; j++) {
      if (ROUTE_KEYS[i][0].startsWith(ROUTE_KEYS[j][0]) && ROUTE_KEYS[i][1] !== ROUTE_KEYS[j][1]) {
        problems.push(`route "${ROUTE_KEYS[i][0]}" is unreachable — "${ROUTE_KEYS[j][0]}" matches first. Move the more specific prefix earlier.`);
      }
    }
  }
  return problems;
}
