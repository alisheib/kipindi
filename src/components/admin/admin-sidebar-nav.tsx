"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "./admin-nav-groups";

function activeKeyFromPath(path: string): string {
  if (path === "/admin")                              return "overview";
  if (path.startsWith("/admin/live"))                 return "live";
  if (path.startsWith("/admin/finance"))              return "finance";
  if (path.startsWith("/admin/reports"))              return "reports";
  if (path.startsWith("/admin/players/cohorts"))      return "cohorts";
  if (path.startsWith("/admin/players"))              return "players";
  if (path.startsWith("/admin/sources"))              return "sources";
  if (path.startsWith("/admin/config"))               return "config";

  if (path.startsWith("/admin/ai-polls"))             return "ai-polls";
  if (path.startsWith("/admin/candidates"))           return "candidates";
  if (path.startsWith("/admin/proposals"))            return "proposals";
  if (path.startsWith("/admin/markets"))              return "markets";
  if (path.startsWith("/admin/resolver-queue"))       return "resolver";
  if (path.startsWith("/admin/affiliate"))            return "affiliate";
  if (path.startsWith("/admin/moderation"))           return "moderation";
  if (path.startsWith("/admin/compliance"))           return "compliance";
  if (path.startsWith("/admin/aml"))                  return "aml";
  if (path.startsWith("/admin/self-exclusions"))      return "sx";
  if (path.startsWith("/admin/audit"))                return "audit";
  if (path.startsWith("/admin/system"))               return "system";
  if (path.startsWith("/admin/ai-usage"))             return "ai-usage";
  if (path.startsWith("/admin/approvals"))            return "approvals";
  if (path.startsWith("/admin/2fa"))                  return "2fa";
  if (path.startsWith("/admin/privacy"))              return "privacy";
  if (path.startsWith("/admin/retention"))            return "retention";
  return "overview";
}

export function AdminSidebarNav({ badges, fallbackKey }: { badges: Record<string, string | undefined>; fallbackKey: string }) {
  const pathname = usePathname();
  const activeKey = pathname ? activeKeyFromPath(pathname) : fallbackKey;

  return (
    <>
      {NAV_GROUPS.map((g) => (
        <div key={g.group.en}>
          <div className="px-2 pt-3 pb-1.5 font-mono text-micro uppercase tracking-[0.18em] text-text-tertiary">
            {g.group.en} · {g.group.sw}
          </div>
          {g.items.map((it) => {
            const badge = badges[it.key];
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
                  <span className="bg-brand-500 text-white font-mono text-micro leading-none" style={{ padding: "1px 5px", borderRadius: 4 }}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
