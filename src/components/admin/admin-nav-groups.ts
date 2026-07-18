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
