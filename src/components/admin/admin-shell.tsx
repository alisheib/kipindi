/**
 * Admin shell — confidentiality band, grouped sidebar, top bar with crumbs.
 *
 * Inherits the 50pick design system: existing tokens, Sora/Inter/JBM fonts,
 * gold-positive / royal-active / muted-loss colour discipline.
 */
import Link from "next/link";
import { db } from "@/lib/server/store";
import { FiftyMark } from "@/components/brand";
import { AdminMobileNavTrigger } from "./admin-mobile-nav";
import { AdminSidebarNav } from "./admin-sidebar-nav";
import { RefreshButton } from "./refresh-button";
import { NAV_GROUPS } from "./admin-nav-groups";
import { PeriodPicker } from "./period-picker";
import { SentinelCountdown } from "./sentinel-countdown";
import { formatDateISO } from "@/lib/utils";

export type AdminSession = {
  userId: string;
  phoneE164: string;
  role: string;
};

export { NAV_GROUPS } from "./admin-nav-groups";

/** Session-id prefix for the confidential band — short, anonymisable. */
function shortSessionLabel(s: AdminSession): string {
  return s.userId.slice(-4).toUpperCase();
}

export async function ConfidentialBand({ session }: { session: AdminSession }) {
  const officer = await db.user.findById(session.userId);
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
export async function getSidebarBadges() {
  const aml = (await db.txn.listByStatus("AML_REVIEW")).length;
  const sof = (await db.sourceOfFunds.listPending()).length;
  const { listPendingKyc } = await import("@/lib/server/kyc-service");
  const kyc = (await listPendingKyc()).length;
  // Approvals badge surfaces work waiting on an officer: pending KYC + AML +
  // source-of-funds. This is the admin's "new player to review" signal.
  const approvals = kyc + aml + sof;
  return {
    aml: aml > 0 ? String(aml) : undefined,
    compliance: aml + sof > 0 ? String(aml + sof) : undefined,
    approvals: approvals > 0 ? String(approvals) : undefined,
  };
}

export async function AdminSidebar({ activeKey }: { activeKey: string }) {
  const badges = await getSidebarBadges();
  return (
    <aside className="hidden lg:flex shrink-0 border-r border-border flex-col gap-1 sticky top-0 self-start max-h-screen overflow-y-auto"
      style={{ width: 216, padding: "18px 14px", background: "var(--panel)" }}>
      <Link href="/admin" className="flex items-center gap-2 px-2 pb-3 mb-2 border-b border-dashed border-border-subtle">
        <FiftyMark size={18} simplified aria-hidden />
        <span className="font-display font-bold text-body-sm text-text">50pick · admin</span>
      </Link>
      <AdminSidebarNav badges={badges} fallbackKey={activeKey} />
      <div className="mt-auto pt-3 border-t border-dashed border-border-subtle text-caption text-text-tertiary px-2">
        <div>v2.4 · deployed {formatDateISO(new Date().toISOString())}</div>
        <div className="mt-1">EN · SW · ZH</div>
      </div>
    </aside>
  );
}

export async function AdminTopBar({ crumbs, session, activeKey }: { crumbs: string[]; session: AdminSession; activeKey: string }) {
  const badges = await getSidebarBadges();
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
        {/* Global grid refresh — re-fetches the current server-rendered admin
            screen in place. Present on every admin page so any grid can be
            refreshed from one predictable spot (screens with a filter bar also
            expose a contextual refresh next to their filters). */}
        <RefreshButton variant="icon" className="!h-7 !w-7" />
        {/* Live market-sentinel countdown (deploy-proof) + reset / run-now. */}
        <SentinelCountdown />
        {/* No notification bell here — the platform's main bell (in AppShell's
            top bar) is the single notification surface for everyone, admins
            included. New-KYC alerts arrive there as in-app notifications. */}
        {/* No global "search players" box here: it rendered on EVERY admin page
            (Reports, Finance, Audit, System…) where player search is out of
            context and confusing. The dedicated /admin/players page has its own
            search — that's the single, correctly-scoped place to find a player. */}
        <span className="font-mono text-micro tracking-[0.14em] uppercase px-2.5 h-7 inline-flex items-center rounded-md border border-border bg-bg-inset text-text-secondary">
          ACTIVE
        </span>
        <span className="font-mono text-micro tracking-[0.14em] px-2.5 h-7 inline-flex items-center rounded-md border border-border bg-bg-elevated text-text gap-1.5">
          <span className="h-1.5 w-1.5 rounded-pill bg-gold" />
          <span className="hidden sm:inline">{((await db.user.findById(session.userId))?.displayName ?? "Officer").split(" ")[0]}</span>
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
    <div className="rounded-lg glass-panel p-3.5 flex flex-col gap-1.5 min-h-[110px] transition-all hover:shadow-[var(--shadow-3)]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono uppercase text-text-tertiary truncate" style={{ fontSize: 9.5, letterSpacing: "0.08em", lineHeight: 1.3 }}>{label}</span>
        {pulse && (
          <span className="inline-flex items-center gap-1 text-micro text-gold font-mono uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-pill bg-gold inline-block gold-dot" />
            live
          </span>
        )}
      </div>
      <div
        className={[
          "font-mono font-bold tabular-nums leading-none",
          gold ? "text-gold" : "text-text",
        ].join(" ")}
        style={{ fontSize: 22, letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
      {sw && (
        <div className="text-text-tertiary italic leading-tight" style={{ fontSize: 10.5 }}>{sw}</div>
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
  const isFlush = padding === "p-0";
  return (
    <div {...rest} className={["rounded-lg glass-panel", padding, className ?? ""].join(" ")}>
      {(title || action) && (
        <div className={`flex items-start justify-between gap-3 ${isFlush ? "px-4 pt-4 pb-3" : "mb-3"}`}>
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
    <div className="flex items-center gap-2.5 py-2 border-b border-dashed border-border-subtle text-caption last:border-b-0 hover:bg-bg-overlay/30 transition-colors rounded-sm -mx-1 px-1">
      <span className="font-mono text-micro text-text-tertiary w-[60px] shrink-0 tabular-nums">{ts}</span>
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
        "h-8 w-8 rounded-pill inline-flex items-center justify-center font-mono font-bold text-body-sm shrink-0",
        cls,
      ].join(" ")}
    >
      {label}
    </span>
  );
}
