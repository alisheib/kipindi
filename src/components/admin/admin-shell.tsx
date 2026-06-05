/**
 * Admin shell — confidentiality band, grouped sidebar, top bar with crumbs.
 *
 * Inherits the 50pick design system: existing tokens, Sora/Inter/JBM fonts,
 * gold-positive / royal-active / muted-loss colour discipline.
 */
import Link from "next/link";
import { db } from "@/lib/server/store";
import { AdminMobileNavTrigger } from "./admin-mobile-nav";
import { PeriodPicker } from "./period-picker";

export type AdminSession = {
  userId: string;
  phoneE164: string;
  role: string;
};

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
      { href: "/admin/finance", label: "Finance", key: "finance" },
      { href: "/admin/reports", label: "Reports", key: "reports" },
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
    group: { en: "Markets", sw: "Soko" },
    items: [
      { href: "/admin/ai-polls",        label: "AI poll generation", key: "ai-polls" },
      { href: "/admin/candidates",     label: "AI candidates", key: "candidates" },
      { href: "/admin/proposals",      label: "Player proposals", key: "proposals" },
      { href: "/admin/markets",        label: "Curation queue", key: "markets" },
      { href: "/admin/resolver-queue", label: "Resolver queue", key: "resolver" },
      { href: "/admin/sources",        label: "Sources & categories", key: "sources" },
      { href: "/admin/config",         label: "Rates & fees", key: "config" },
      { href: "/admin/house-pool",    label: "House pool", key: "house-pool" },
    ],
  },
  {
    group: { en: "Growth", sw: "Ukuaji" },
    items: [
      { href: "/admin/affiliate", label: "Affiliate", key: "affiliate" },
    ],
  },
  {
    group: { en: "Compliance", sw: "Kanuni" },
    items: [
      { href: "/admin/compliance",      label: "Compliance",     key: "compliance" },
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
      { href: "/admin/approvals", label: "Approvals", key: "approvals" },
      { href: "/admin/2fa/setup", label: "2FA setup", key: "2fa" },
    ],
  },
];

/** Session-id prefix for the confidential band — short, anonymisable. */
function shortSessionLabel(s: AdminSession): string {
  return s.userId.slice(-4).toUpperCase();
}

export function ConfidentialBand({ session }: { session: AdminSession }) {
  const officer = db.user.findById(session.userId);
  const email = officer?.displayName ?? session.phoneE164;
  return (
    <div className="bg-bg-sunken text-onBrand border-b border-gold flex items-center justify-between px-4 lg:px-6 h-7 text-micro font-mono uppercase tracking-[0.18em]">
      <span className="flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-pill bg-gold" />
        <span className="text-white">Staff · Confidential · Internal only</span>
      </span>
      <span className="hidden sm:inline text-white/70">
        50pick Africa · session #{shortSessionLabel(session)} · officer · {email}
      </span>
    </div>
  );
}

/**
 * Counts of pending items across the system — drives sidebar badges so an
 * operator can see at a glance "3 in AML, 7 compliance items, 2 approvals."
 */
export function getSidebarBadges(): Record<string, string | undefined> {
  const aml = db.txn.listByStatus("AML_REVIEW").length;
  const sof = db.sourceOfFunds.listPending().length;
  return {
    aml: aml > 0 ? String(aml) : undefined,
    compliance: aml + sof > 0 ? String(aml + sof) : undefined,
    approvals: undefined,
  };
}

export function AdminSidebar({ activeKey }: { activeKey: string }) {
  const badges = getSidebarBadges();
  return (
    <aside className="hidden lg:flex shrink-0 border-r border-border flex-col gap-1 sticky top-0 self-start max-h-screen overflow-y-auto"
      style={{ width: 216, padding: "18px 14px", background: "var(--panel)" }}>
      <Link href="/admin" className="flex items-center gap-2 px-2 pb-3 mb-2 border-b border-dashed border-border-subtle">
        <span aria-hidden className="h-3.5 w-3.5 rounded-pill border-[1.5px] border-gold" />
        <span className="font-display font-bold text-body-sm text-text">50pick · admin</span>
      </Link>
      {NAV_GROUPS.map((g) => (
        <div key={g.group.en}>
          <div className="px-2 pt-3 pb-1.5 font-mono text-micro uppercase tracking-[0.18em] text-text-tertiary">
            {g.group.en} · {g.group.sw}
          </div>
          {g.items.map((it) => {
            const badge = (badges as Record<string, string | undefined>)[it.key];
            const active = it.key === activeKey;
            return (
              <Link
                key={it.key}
                href={it.href as never}
                className={[
                  "flex items-center justify-between rounded-md px-2.5 py-2 text-body-sm transition-colors",
                  active
                    ? "text-text font-semibold"
                    : "text-text-subtle hover:text-text",
                ].join(" ")}
                style={active ? { background: "oklch(40% 0.12 268 / 0.5)" } : undefined}
              >
                <span>{it.label}</span>
                {badge && (
                  <span className="bg-gold text-gold-fg font-mono text-micro leading-none" style={{ padding: "1px 5px", borderRadius: 4 }}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
      <div className="mt-auto pt-3 border-t border-dashed border-border-subtle text-caption text-text-tertiary px-2">
        <div>v2.4 · deployed {new Date().toISOString().slice(0, 10)}</div>
        <div className="mt-1">EN · SW · FR</div>
      </div>
    </aside>
  );
}

export function AdminTopBar({ crumbs, session, activeKey }: { crumbs: string[]; session: AdminSession; activeKey: string }) {
  const badges = getSidebarBadges();
  return (
    <div className="flex items-center justify-between px-4 lg:px-6 border-b border-border gap-3"
      style={{
        height: 56,
        background: "color-mix(in oklab, var(--panel) 78%, transparent)",
        backdropFilter: "blur(14px) saturate(1.3)",
        WebkitBackdropFilter: "blur(14px) saturate(1.3)",
      }}>
      <div className="flex items-center gap-2 min-w-0">
        <AdminMobileNavTrigger groups={NAV_GROUPS} badges={badges} activeKey={activeKey} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-body-sm text-text-tertiary min-w-0 overflow-hidden">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-text-tertiary opacity-50">/</span>}
              <span className={isLast ? "font-semibold text-text truncate" : "truncate"}>{c}</span>
            </span>
          );
        })}
      </nav>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <form action="/admin/players" method="get" className="hidden md:block">
          <input
            type="search"
            name="q"
            aria-label="Search players by phone, name, or ID"
            placeholder="Search players · phone · usr_…"
            className="w-[260px] h-8 px-3 rounded-md bg-bg-sunken border border-border text-text font-mono text-caption focus:outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
          />
        </form>
        <span className="font-mono text-micro tracking-[0.14em] uppercase px-2.5 h-7 inline-flex items-center rounded-md border border-border bg-surface text-text-secondary">
          ACTIVE
        </span>
        <span className="font-mono text-micro tracking-[0.14em] px-2.5 h-7 inline-flex items-center rounded-md border border-border bg-bg-elevated text-text gap-1.5">
          <span className="h-1.5 w-1.5 rounded-pill bg-gold" />
          <span className="hidden sm:inline">{(db.user.findById(session.userId)?.displayName ?? "Officer").split(" ")[0]}</span>
        </span>
      </div>
    </div>
  );
}

export function AdminPageHead({
  title,
  sw,
  period = true,
  actions,
}: {
  title: string;
  sw?: string;
  period?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <header className="px-4 lg:px-6 py-5 border-b border-dashed border-border-subtle flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <h1 className="font-display font-bold text-title-lg text-text leading-none">{title}</h1>
        {sw && (
          <p className="text-caption text-text-tertiary italic mt-1.5">
            {sw}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {period && <PeriodPicker />}
        {actions}
      </div>
    </header>
  );
}

export { PeriodPicker };

/* ===== KPI tile ===== */

export function AdminKpi({
  label,
  sw,
  value,
  delta,
  deltaDir = "up",
  gold,
  pulse,
  spark = true,
}: {
  label: string;
  sw?: string;
  value: string | number;
  delta?: string;
  deltaDir?: "up" | "down" | "flat";
  gold?: boolean;
  pulse?: boolean;
  spark?: boolean;
}) {
  return (
    <div className="rounded-lg glass-panel p-4 flex flex-col gap-2 min-h-[120px]">
      <div className="flex items-center justify-between">
        <span className="font-mono uppercase text-text-tertiary" style={{ fontSize: 9.5, letterSpacing: "0.08em" }}>{label}</span>
        {pulse && (
          <span className="inline-flex items-center gap-1 text-micro text-gold font-mono uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-pill bg-gold inline-block" />
            live
          </span>
        )}
      </div>
      <div
        className={[
          "font-mono font-bold tabular-nums leading-none",
          gold ? "text-gold" : "text-text",
        ].join(" ")}
        style={{ fontSize: 21 }}
      >
        {value}
      </div>
      {sw && (
        <div className="text-caption text-text-tertiary italic leading-tight">{sw}</div>
      )}
      {(spark || delta) && (
        <div className="mt-auto flex items-center justify-end gap-2">
          {delta && (
            <span
              className={[
                "font-mono text-micro px-2 py-0.5 rounded-sm whitespace-nowrap",
                deltaDir === "up"
                  ? "bg-gold/15 text-gold"
                  : deltaDir === "down"
                    ? "bg-bg-sunken text-text-tertiary"
                    : "bg-bg-sunken text-text-tertiary",
              ].join(" ")}
            >
              {deltaDir === "up" ? "▲" : deltaDir === "down" ? "▼" : "·"} {delta}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== Card ===== */

export function AdminCard({
  title,
  sw,
  action,
  children,
  padding = "p-4",
  className,
  ...rest
}: {
  title?: string;
  sw?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  padding?: string;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "title">) {
  return (
    <div {...rest} className={["rounded-lg glass-panel", padding, className ?? ""].join(" ")}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="min-w-0">
            {title && <p className="font-display font-semibold text-body-sm text-text leading-tight">{title}</p>}
            {sw && (
              <p className="text-caption text-text-tertiary italic leading-tight mt-0.5">{sw}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ===== Block (placeholder for chart while real chart pending) ===== */

export function AdminBlock({
  height = "med",
  children,
}: {
  height?: "tall" | "med" | "short";
  children: React.ReactNode;
}) {
  const cls = height === "tall" ? "min-h-[240px]" : height === "short" ? "min-h-[100px]" : "min-h-[160px]";
  return (
    <div
      className={[
        "rounded-md bg-bg-sunken border border-dashed border-border-strong",
        "flex flex-col items-center justify-center gap-1.5 p-4 text-center",
        "font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary",
        cls,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/* ===== Activity feed row ===== */

export function FeedRow({
  ts,
  category,
  body,
  variant = "neutral",
}: {
  ts: string;
  category: string;
  body: React.ReactNode;
  variant?: "gold" | "royal" | "danger" | "success" | "warning" | "neutral";
}) {
  const variantClass = {
    gold: "bg-gold/15 text-gold",
    royal: "bg-royal/15 text-royal",
    danger: "bg-danger/15 text-danger",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    neutral: "bg-bg-sunken text-text-tertiary",
  }[variant];
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-dashed border-border-subtle text-caption last:border-b-0">
      <span className="font-mono text-micro text-text-tertiary w-[60px] shrink-0">{ts}</span>
      <span
        className={[
          "font-mono text-micro px-1.5 py-0.5 rounded-sm tracking-[0.10em] shrink-0",
          variantClass,
        ].join(" ")}
      >
        {category}
      </span>
      <span className="flex-1 min-w-0 text-text truncate">{body}</span>
    </div>
  );
}

/* ===== Funnel ===== */

export function AdminFunnel({
  steps,
}: {
  steps: ReadonlyArray<{ label: string; value: string | number }>;
}) {
  return (
    <div className="flex items-stretch gap-1 h-16">
      {steps.map((s, i) => (
        <div
          key={i}
          className="flex-1 bg-bg-sunken border border-border rounded-md px-2 py-1.5 flex flex-col justify-between min-w-0"
        >
          <span className="font-mono text-body-sm font-bold text-text truncate">{s.value}</span>
          <span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary truncate">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ===== Stacked bar ===== */

export function AdminStackedBar({
  segments,
  height = 18,
}: {
  segments: ReadonlyArray<{ flex: number; color: string; label?: string }>;
  height?: number;
}) {
  return (
    <div className="rounded-sm overflow-hidden border border-border flex" style={{ height }}>
      {segments.map((s, i) => (
        <div
          key={i}
          className="flex items-center justify-center font-mono text-micro tracking-[0.10em] text-white"
          style={{ flex: s.flex, background: s.color }}
        >
          {s.label && height >= 18 ? s.label : null}
        </div>
      ))}
    </div>
  );
}

/* ===== Status pill (for chain/backup OK indicators) ===== */

export function StatusPill({
  status,
  label,
}: {
  status: "ok" | "warn" | "fail";
  label: string;
}) {
  const cls = {
    ok: "bg-success/15 text-success",
    warn: "bg-warning/15 text-warning",
    fail: "bg-danger/15 text-danger",
  }[status];
  return (
    <span
      className={[
        "h-12 w-12 rounded-pill inline-flex items-center justify-center font-mono font-bold text-body-sm shrink-0",
        cls,
      ].join(" ")}
    >
      {label}
    </span>
  );
}
