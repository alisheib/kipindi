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
    wallet: locale === "sw" ? "Pochi" : locale === "fr" ? "Portefeuille" : "Wallet",
    invite: locale === "sw" ? "Alika" : locale === "fr" ? "Inviter" : "Invite",
    profile: locale === "sw" ? "Wasifu" : locale === "fr" ? "Profil" : "Profile",
    signIn: t.common.signIn,
  };

  const items = isAuthed
    ? [
        { href: "/markets",        glyph: "chart" as const,      label: L.markets },
        { href: "/live",           glyph: "bolt" as const,       label: L.live },
        { href: "/wallet",         glyph: "wallet" as const,     label: L.wallet },
        { href: "/profile/invite", glyph: "gift" as const,       label: L.invite },
        { href: "/profile",        glyph: "profile" as const,    label: L.profile },
      ]
    : [
        { href: "/markets",     glyph: "chart" as const,      label: L.markets },
        { href: "/live",        glyph: "bolt" as const,       label: L.live },
        { href: "/auth/login",  glyph: "logIn" as const,      label: L.signIn },
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
    // Floating, rounded "pill" bar (Instagram-style shape) — inset from the
    // screen edges, lifted above the home indicator, with the active item held
    // in a rounded capsule. Our colours, icons, labels and routing — only the
    // shape is borrowed.
    <nav
      aria-label="Primary"
      className="xl:hidden fixed left-2.5 right-2.5 z-40 rounded-[26px] border border-border"
      style={{
        bottom: "calc(9px + env(safe-area-inset-bottom))",
        background: "var(--bg-elevated)",
        boxShadow: "0 12px 32px -10px oklch(8% 0.09 264 / 0.75), inset 0 1px 0 oklch(92% 0.04 264 / 0.05)",
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
                {/* Active capsule — the lighter rounded highlight behind the icon. */}
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
