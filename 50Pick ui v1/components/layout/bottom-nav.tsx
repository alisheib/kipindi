"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Radio, ListChecks, Trophy, User, LogIn } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function BottomNav({ isAuthed = false }: { isAuthed?: boolean }) {
  const pathname = usePathname();
  const { t, locale } = useT();
  // Locale-aware labels so flipping the language toggle actually
  // changes the bottom nav. EN dictionary is single-word; SW + FR
  // pulled from the i18n dictionary directly.
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
      className="xl:hidden fixed inset-x-0 bottom-0 z-40 bg-bg-elevated/95 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-stretch justify-around h-14">
        {items.map((it) => (
          <NavItem key={it.href} {...it} active={isActive(it.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ href, icon: Icon, label, active }: { href: string; icon: typeof LayoutGrid; label: string; active: boolean }) {
  return (
    <Link
      href={href as never}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
        active ? "text-gold-300" : "text-text-subtle hover:text-text-muted",
      )}
    >
      <Icon size={20} strokeWidth={active ? 2 : 1.5} />
      <span className="text-micro font-semibold uppercase tracking-[0.10em]">{label}</span>
    </Link>
  );
}
