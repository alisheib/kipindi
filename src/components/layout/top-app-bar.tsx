"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiftyLockup } from "@/components/brand";
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
  avatarSrc?: string | null;
  seed?: string;
};

export function TopAppBar({ user }: { user: TopAppBarUser }) {
  const pathname = usePathname();
  const { t } = useT();
  const NAV_ITEMS = [
    { href: "/markets",     label: "Markets" },
    { href: "/live",        label: "Live" },
    { href: "/positions",   label: "Positions" },
    { href: "/wallet",      label: t.nav.wallet },
    { href: "/leaderboard", label: "Top" },
  ] as const;
  return (
    <header className="sticky top-0 z-sticky bg-bg-elevated/80 backdrop-blur-xl border-b border-border-divider">
      <div className="mx-auto max-w-[1280px] flex items-center justify-between px-3 lg:px-6 h-11 lg:h-12 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" aria-label="50pick home" className="shrink-0 hover:opacity-90 transition-opacity">
            <FiftyLockup size={20} />
          </Link>
          <nav className="hidden xl:flex items-center ml-3" aria-label="Primary">
            {NAV_ITEMS.map((it) => {
              const active = pathname === it.href;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "relative h-12 px-2 inline-flex items-center whitespace-nowrap font-display text-micro font-bold uppercase tracking-[0.10em] transition-colors duration-micro",
                    active ? "text-text" : "text-text-tertiary hover:text-text",
                  )}
                >
                  {it.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-2 right-2 -bottom-px h-px transition-opacity duration-short",
                      active ? "bg-gold opacity-100" : "bg-gold opacity-0",
                    )}
                  />
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <NotificationsPanel />
          <LanguageToggle />
          <ThemeToggle />
          <AvatarMenu
            initials={user.initials}
            name={user.name}
            phone={user.phone}
            isAuthed={user.isAuthed}
            avatarSrc={user.avatarSrc ?? null}
            seed={user.seed}
          />
        </div>
      </div>
    </header>
  );
}
