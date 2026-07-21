"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { ComingSoonBadge } from "@/components/ui/coming-soon-badge";
import { useT } from "@/lib/i18n";

/**
 * NavMore — the top-bar overflow menu. At `lg` (1024–1279px) the primary nav
 * shows the core links inline and folds the rest (Propose/Invite/Leaderboard)
 * behind this "More ▾" dropdown, so no primary destination is hidden on
 * tablets/small laptops (IA review R1). At `xl` these items render inline and
 * this button is hidden, so the dropdown never double-shows.
 */
export function NavMore({
  items,
  label,
}: {
  items: readonly { href: string; label: string; comingSoon?: boolean }[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { t } = useT();

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  const anyActive = items.some((it) => pathname.startsWith(it.href));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 whitespace-nowrap"
        style={{
          padding: "7px 10px 7px 12px",
          borderRadius: "var(--r-sm)",
          fontSize: 13.5,
          fontWeight: anyActive ? 600 : 500,
          color: anyActive ? "var(--text)" : "var(--text-subtle)",
          background: anyActive ? "oklch(40% 0.08 264 / 0.4)" : "transparent",
        }}
      >
        <span className="capitalize">{label}</span>
        <I.chevronDown s={12} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-[50] min-w-[190px] rounded-xl border border-border-strong bg-bg-elevated/95 p-1 backdrop-blur-xl"
          style={{ boxShadow: "0 20px 44px -18px oklch(8% 0.09 264 / 0.85), inset 0 1px 0 oklch(100% 0 0 / 0.06)" }}
        >
          {items.map((it) => {
            const active = pathname.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href as never}
                role="menuitem"
                aria-current={active ? "page" : undefined}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors hover:bg-bg-overlay"
                style={{ color: active ? "var(--text)" : "var(--text-subtle)", fontWeight: active ? 600 : 500 }}
              >
                {it.label}
                {it.comingSoon && <ComingSoonBadge label={t.common.comingSoon} size="xs" className="ml-auto" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
