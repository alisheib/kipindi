"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

export function BottomNav({ isAuthed = false }: { isAuthed?: boolean }) {
  const pathname = usePathname();
  const { t } = useT();

  const items = isAuthed
    ? [
        { href: "/markets",        glyph: "markets" as const,    label: t.common.markets },
        { href: "/live",           glyph: "bolt" as const,       label: t.nav.live },
        { href: "/wallet",         glyph: "wallet" as const,     label: t.nav.wallet },
        { href: "/profile/invite", glyph: "gift" as const,       label: t.common.invite },
        { href: "/profile",        glyph: "profile" as const,    label: t.common.profile },
      ]
    : [
        { href: "/markets",     glyph: "markets" as const,    label: t.common.markets },
        { href: "/live",        glyph: "bolt" as const,       label: t.nav.live },
        { href: "/auth/login",  glyph: "logIn" as const,      label: t.common.signIn },
      ];

  const isActive = (href: string) => {
    if (href === "/markets") return pathname === "/" || pathname.startsWith("/markets");
    if (href === "/wallet") return pathname.startsWith("/wallet");
    if (href === "/profile/invite") return pathname === "/profile/invite";
    if (href === "/profile") return pathname.startsWith("/profile") && pathname !== "/profile/invite";
    if (href === "/auth/login") return pathname === "/auth/login";
    return pathname === href;
  };

  return (
    <nav
      aria-label={t.nav.primary}
      className="xl:hidden fixed left-2.5 right-2.5 z-40 rounded-[26px] border border-border-strong"
      style={{
        bottom: "calc(9px + env(safe-area-inset-bottom))",
        background: "color-mix(in oklab, var(--bg-elevated) 78%, transparent)",
        backdropFilter: "blur(16px) saturate(1.2)",
        WebkitBackdropFilter: "blur(16px) saturate(1.2)",
        boxShadow:
          "0 14px 36px -10px oklch(8% 0.09 264 / 0.8), " +
          "inset 0 1px 0 oklch(100% 0 0 / 0.12), " +
          "inset 0 -1px 0 oklch(0% 0 0 / 0.20)",
      }}
    >
      <ul
        className="grid items-stretch px-1.5 py-1.5"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)`, minHeight: 56 }}
      >
        {items.map((it) => {
          const on = isActive(it.href);
          const Ico = I[it.glyph];
          return (
            <li key={it.href} className="flex">
              <Link
                href={it.href as never}
                aria-label={it.label}
                aria-current={on ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-1 rounded-[18px] transition-colors"
                style={{
                  color: on ? "var(--accent-400)" : "var(--text-subtle)",
                  textDecoration: "none",
                }}
              >
                <span
                  className="flex items-center justify-center rounded-full transition-all duration-200"
                  style={{
                    width: 50,
                    height: 30,
                    background: on ? "oklch(72% 0.11 195 / 0.18)" : "transparent",
                  }}
                >
                  <Ico s={22} />
                </span>
                <span className={`text-[9.5px] leading-none ${on ? "font-bold" : "font-medium"}`}>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
