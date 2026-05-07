"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiftyLockup } from "@/components/brand";
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
    <header className="sticky top-0 z-40 border-b border-border bg-bg-elevated/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1280px] flex items-center justify-between gap-2 px-3 lg:px-6 h-12">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="50pick home" className="shrink-0 hover:opacity-90 transition-opacity">
            <FiftyLockup size={20} />
          </Link>
          <nav className="ml-3 hidden xl:flex items-center" aria-label="Primary">
            {NAV_ITEMS.map((it) => {
              const active = pathname === it.href;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "relative h-12 px-2.5 inline-flex items-center whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                    active ? "text-text" : "text-text-subtle hover:text-text",
                  )}
                >
                  {it.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-2 right-2 -bottom-px h-[2px] rounded-pill bg-gold-500 transition-opacity",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationsPanel />
          <LanguageToggle />
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
