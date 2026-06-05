"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Radio, ListChecks, Trophy, User, LogIn } from "lucide-react";
import { useT } from "@/lib/i18n";

export function BottomNav({ isAuthed = false }: { isAuthed?: boolean }) {
  const pathname = usePathname();
  const { t, locale } = useT();
  const L = {
    markets: locale === "sw" ? "Soko" : locale === "fr" ? "Marchés" : "Markets",
    live: t.nav.live,
    positions: locale === "sw" ? "Madau" : locale === "fr" ? "Paris" : "Positions",
    leaderboard: t.nav.leaderboard,
    profile: locale === "sw" ? "Wasifu" : locale === "fr" ? "Profil" : "Profile",
    signIn: t.common.signIn,
  };
  const items = isAuthed
    ? [
        { href: "/markets",     icon: LayoutGrid, label: L.markets },
        { href: "/live",        icon: Radio,      label: L.live },
        { href: "/positions",   icon: ListChecks, label: L.positions },
        { href: "/leaderboard", icon: Trophy,     label: L.leaderboard },
        { href: "/profile",     icon: User,       label: L.profile },
      ]
    : [
        { href: "/markets",     icon: LayoutGrid, label: L.markets },
        { href: "/live",        icon: Radio,      label: L.live },
        { href: "/leaderboard", icon: Trophy,     label: L.leaderboard },
        { href: "/auth/login",  icon: LogIn,      label: L.signIn },
      ];

  const isActive = (href: string) => {
    if (href === "/markets") return pathname === "/" || pathname.startsWith("/markets");
    if (href === "/positions") return pathname.startsWith("/positions");
    if (href === "/profile") return pathname.startsWith("/profile");
    if (href === "/auth/login") return pathname === "/auth/login";
    return pathname === href;
  };

  return (
    <nav
      aria-label="Primary"
      className="xl:hidden fixed inset-x-0 bottom-0 z-40"
      style={{
        height: 64,
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        alignItems: "center",
        padding: "0 6px",
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "var(--panel)",
        borderTop: "1px solid var(--border)",
      }}
    >
      {items.map((it) => {
        const on = isActive(it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href as never}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: on ? "var(--accent-400)" : "var(--text-subtle)",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            <Icon size={21} strokeWidth={on ? 2 : 1.5} />
            <span style={{ fontSize: 10, fontWeight: on ? 600 : 500 }}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
