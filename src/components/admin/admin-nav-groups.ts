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
export const NAV_GROUPS: ReadonlyArray<{
  group: { en: string; sw: string };
  items: ReadonlyArray<{ href: string; label: string; key: string; badge?: string }>;
}> = [
  {
    group: { en: "Overview", sw: "Muhtasari" },
    items: [
      { href: "/admin",      label: "Overview", key: "overview" },
      { href: "/admin/live", label: "Live ops", key: "live" },
    ],
  },
  {
    group: { en: "Money", sw: "Pesa" },
    items: [
      { href: "/admin/insights", label: "Insights", key: "insights" },
      { href: "/admin/settlement",    label: "Settlement", key: "settlement" },
      { href: "/admin/finance", label: "Finance", key: "finance" },
      { href: "/admin/reports", label: "Reports", key: "reports" },
      { href: "/admin/payments", label: "Payments ops", key: "payments" },
      { href: "/admin/transactions", label: "Transactions", key: "transactions" },
    ],
  },
  {
    group: { en: "Players", sw: "Wachezaji" },
    items: [
      { href: "/admin/players",         label: "Roster",  key: "players" },
      { href: "/admin/players/cohorts", label: "Cohorts", key: "cohorts" },
    ],
  },
  {
    group: { en: "Markets", sw: "Masoko" },
    items: [
      { href: "/admin/events",          label: "Event calendar", key: "events" },
      { href: "/admin/ai-polls",        label: "AI poll generation", key: "ai-polls" },
      { href: "/admin/candidates",     label: "AI candidates", key: "candidates" },
      { href: "/admin/proposals",      label: "Player proposals", key: "proposals" },
      { href: "/admin/markets",        label: "Curation queue", key: "markets" },
      { href: "/admin/resolver-queue", label: "Resolver queue", key: "resolver" },
      // Up & Down is the second product line: assets, chains and the price oracle.
      // It sits under Markets because it IS markets — every round is a
      // PredictionMarket row — just on a different clock.
      { href: "/admin/updown",         label: "Up & Down",      key: "updown" },
      { href: "/admin/sources",        label: "Sources & categories", key: "sources" },
      { href: "/admin/config",         label: "Rates & fees", key: "config" },
    ],
  },
  {
    group: { en: "Growth", sw: "Ukuaji" },
    items: [
      { href: "/admin/affiliate", label: "Affiliate", key: "affiliate" },
      { href: "/admin/bonuses",   label: "Bonuses",   key: "bonuses" },
      { href: "/admin/invites",   label: "Invites",   key: "invites" },
    ],
  },
  {
    group: { en: "Compliance", sw: "Kanuni" },
    items: [
      { href: "/admin/compliance",      label: "Compliance",     key: "compliance" },
      // F11 — an OPEN objection freezes a market's settlement, so this queue holds
      // real money hostage until an officer clears it. It sits high on purpose.
      { href: "/admin/objections",      label: "Objections",     key: "objections" },
      { href: "/admin/moderation",      label: "Comment moderation", key: "moderation" },
      { href: "/admin/aml",             label: "AML queue",      key: "aml" },
      { href: "/admin/self-exclusions", label: "Self-exclusions", key: "sx" },
      { href: "/admin/privacy",         label: "Privacy / DSAR", key: "privacy" },
      { href: "/admin/retention",       label: "Retention",      key: "retention" },
      { href: "/admin/audit",           label: "Audit log",      key: "audit" },
    ],
  },
  {
    group: { en: "System", sw: "Mfumo" },
    items: [
      { href: "/admin/system",    label: "System",    key: "system" },
      { href: "/admin/ai-usage",  label: "AI usage & credits", key: "ai-usage" },
      { href: "/admin/approvals", label: "Approvals", key: "approvals" },
      { href: "/admin/2fa/setup", label: "2FA setup", key: "2fa" },
    ],
  },
];

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
