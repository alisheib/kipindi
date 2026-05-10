"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Radio, ListChecks, Trophy, User, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav({ isAuthed = false }: { isAuthed?: boolean }) {
  const pathname = usePathname();
  // Public visitors don't see Positions / Profile here — those would
  // immediately bounce to /auth/login on tap. Replace them with a
  // single "Sign in" tile so the auth path is one tap, not two.
  const items = isAuthed
    ? [
        { href: "/markets",     icon: LayoutGrid, label: "Markets" },
        { href: "/live",        icon: Radio,      label: "Live" },
        { href: "/positions",   icon: ListChecks, label: "Positions" },
        { href: "/leaderboard", icon: Trophy,     label: "Top" },
        { href: "/profile",     icon: User,       label: "Profile" },
      ]
    : [
        { href: "/markets",     icon: LayoutGrid, label: "Markets" },
        { href: "/live",        icon: Radio,      label: "Live" },
        { href: "/leaderboard", icon: Trophy,     label: "Top" },
        { href: "/auth/login",  icon: LogIn,      label: "Sign in" },
      ];

  const isActive = (href: string) => {
    if (href === "/markets") return pathname === "/" || pathname.startsWith("/markets");
    if (href === "/positions") return pathname.startsWith("/positions");
    if (href === "/profile") return pathname.startsWith("/profile");
    if (href === "/auth/login") return pathname.startsWith("/auth");
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
      <span className="text-[10px] font-semibold uppercase tracking-[0.10em]">{label}</span>
    </Link>
  );
}
