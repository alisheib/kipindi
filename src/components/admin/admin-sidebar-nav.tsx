"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, activeKeyFromPath } from "./admin-nav-groups";

// The route→nav-key resolver is imported from admin-nav-groups.ts — see the note
// there. This file's local copy was the one missing /admin/payments, /admin/kyc and
// the /admin/resolver detail route.

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
