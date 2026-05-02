"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type TopAppBarUser = {
  initials: string;
  name: string;
  phone: string;
  isAuthed: boolean;
};

export function TopAppBar({ user }: { user: TopAppBarUser }) {
  const pathname = usePathname();
  const { t } = useT();
  const NAV_ITEMS = [
    { href: "/",            label: t.nav.home },
    { href: "/live",        label: t.nav.live },
    { href: "/bets",        label: t.nav.bets },
    { href: "/wallet",      label: t.nav.wallet },
    { href: "/leaderboard", label: "Top" },
    { href: "/games",       label: t.nav.mapigo },
  ] as const;
  return (
    <header className="sticky top-0 z-sticky bg-bg-elevated/80 backdrop-blur-xl border-b border-border-divider">
      <div className="mx-auto max-w-[1280px] flex items-center justify-between px-3 lg:px-6 h-11 lg:h-12">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-royal hover:text-royal-hover transition-colors duration-micro">
            <Logo variant="primary" className="h-6 lg:h-7" />
          </Link>
          <nav className="hidden lg:flex items-center ml-3" aria-label="Primary">
            {NAV_ITEMS.map((it) => {
              const active = pathname === it.href;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "relative h-12 px-2.5 inline-flex items-center whitespace-nowrap font-display text-caption font-bold uppercase tracking-[0.14em] transition-colors duration-micro",
                    active ? "text-text" : "text-text-tertiary hover:text-text",
                  )}
                >
                  {it.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-2.5 right-2.5 -bottom-px h-px transition-opacity duration-short",
                      active ? "bg-gold opacity-100" : "bg-gold opacity-0",
                    )}
                  />
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Search"
            className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:text-text hover:bg-surface-hover transition-colors duration-micro"
          >
            <Search size={17} strokeWidth={1.75} />
          </button>
          <NotificationsPanel />
          <LanguageToggle />
          <ThemeToggle />
          <AvatarMenu initials={user.initials} name={user.name} phone={user.phone} isAuthed={user.isAuthed} />
        </div>
      </div>
    </header>
  );
}
