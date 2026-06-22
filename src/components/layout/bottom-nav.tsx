"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

export function BottomNav({ isAuthed = false }: { isAuthed?: boolean }) {
  const pathname = usePathname();
  const { t, locale } = useT();
  const L = {
    markets: locale === "sw" ? "Masoko" : locale === "fr" ? "Marchés" : "Markets",
    live: t.nav.live,
    positions: locale === "sw" ? "Nafasi" : locale === "fr" ? "Historique" : "History",
    leaderboard: t.nav.leaderboard,
    profile: locale === "sw" ? "Wasifu" : locale === "fr" ? "Profil" : "Profile",
    signIn: t.common.signIn,
  };

  const items = isAuthed
    ? [
        { href: "/markets",     glyph: "chart" as const,      label: L.markets },
        { href: "/live",        glyph: "bolt" as const,       label: L.live },
        { href: "/positions",   glyph: "portfolio" as const,  label: L.positions },
        { href: "/leaderboard", glyph: "trophy" as const,     label: L.leaderboard },
        { href: "/profile",     glyph: "profile" as const,    label: L.profile },
      ]
    : [
        { href: "/markets",     glyph: "chart" as const,      label: L.markets },
        { href: "/live",        glyph: "bolt" as const,       label: L.live },
        { href: "/leaderboard", glyph: "trophy" as const,     label: L.leaderboard },
        { href: "/auth/login",  glyph: "logIn" as const,      label: L.signIn },
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
      className="xl:hidden fixed inset-x-0 bottom-0 z-40 grid items-center"
      style={{
        height: 64,
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        padding: "0 6px",
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "var(--panel)",
        borderTop: "1px solid var(--border)",
      }}
    >
      {items.map((it) => {
        const on = isActive(it.href);
        const Ico = I[it.glyph];
        return (
          <Link
            key={it.href}
            href={it.href as never}
            aria-label={it.label}
            aria-current={on ? "page" : undefined}
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
            <Ico s={21} />
            <span className={`text-[10px] ${on ? "font-semibold" : "font-medium"}`}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
