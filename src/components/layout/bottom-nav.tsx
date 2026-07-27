"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

export function BottomNav({ isAuthed = false }: { isAuthed?: boolean }) {
  const pathname = usePathname();
  const { t } = useT();

  // IA review R2: for a bettor, Positions (my bets / did I win?) is a more
  // frequent return than Invite — so Positions takes the 5th tab. Invite stays
  // one tap away in the avatar directory + the lg "More" menu.
  // Up & Down is a peer destination, not a promotion: Markets holds long-form polls,
  // Up & Down holds the short-term price rounds, Live shows both (Markets Appearing.txt).
  //
  // It takes the slot Profile used to hold. The bar stays at FIVE — a sixth tab makes
  // every target too narrow at 360px — and nothing is lost, because Profile is already
  // the top-bar avatar menu.
  const items = isAuthed
    ? [
        { href: "/markets",   glyph: "markets" as const,   label: t.common.markets },
        { href: "/updown",    glyph: "trendingUp" as const, label: t.market.udTitle },
        { href: "/live",      glyph: "bolt" as const,      label: t.nav.live },
        { href: "/positions", glyph: "portfolio" as const, label: t.nav.bets },
        { href: "/wallet",    glyph: "wallet" as const,    label: t.nav.wallet },
      ]
    : [
        { href: "/markets",     glyph: "markets" as const,    label: t.common.markets },
        { href: "/updown",      glyph: "trendingUp" as const, label: t.market.udTitle },
        { href: "/live",        glyph: "bolt" as const,       label: t.nav.live },
        { href: "/auth/login",  glyph: "logIn" as const,      label: t.common.signIn },
      ];

  const isActive = (href: string) => {
    if (href === "/markets") return pathname === "/" || pathname.startsWith("/markets");
    if (href === "/updown") return pathname.startsWith("/updown");
    if (href === "/wallet") return pathname.startsWith("/wallet");
    if (href === "/positions") return pathname.startsWith("/positions");
    if (href === "/profile") return pathname.startsWith("/profile") && pathname !== "/profile/invite";
    if (href === "/auth/login") return pathname === "/auth/login";
    return pathname === href;
  };

  return (
    <nav
      aria-label={t.nav.primary}
      className="lg:hidden fixed left-2.5 right-2.5 z-40 rounded-[26px] border border-border-strong"
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
                className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors active:scale-[0.97]"
                style={{
                  color: on ? "var(--accent-400)" : "var(--text-subtle)",
                  textDecoration: "none",
                  transition: "color 150ms ease-out, transform 100ms ease-out",
                }}
              >
                <span
                  className="flex items-center justify-center rounded-full transition-all duration-200"
                  style={{
                    width: 52,
                    height: 32,
                    background: on ? "oklch(72% 0.11 195 / 0.18)" : "transparent",
                    boxShadow: on ? "0 0 12px oklch(72% 0.11 195 / 0.12)" : "none",
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
