"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radio, Wallet, Receipt } from "lucide-react";
import { MapigoMark } from "@/components/mapigo/mapigo-mark";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useT();
  const items = [
    { href: "/",       icon: Home,    label: t.nav.home },
    { href: "/live",   icon: Radio,   label: t.nav.live },
    { href: "/bets",   icon: Receipt, label: t.nav.bets },
    { href: "/wallet", icon: Wallet,  label: t.nav.wallet },
  ];

  return (
    <nav className="xl:hidden fixed inset-x-0 bottom-0 z-sticky bg-bg-elevated/95 backdrop-blur-xl border-t border-border-divider pb-[env(safe-area-inset-bottom)]">
      <div className="relative flex items-stretch justify-around h-9">
        {items.slice(0, 2).map((it) => <NavItem key={it.href} {...it} active={pathname === it.href} />)}
        <div className="relative flex items-center justify-center w-14">
          <Link
            href="/mapigo"
            aria-label="Open Mapigo"
            className="absolute -top-3.5 inline-flex h-7 w-7 items-center justify-center rounded-pill bg-gold text-gold-fg shadow-[0_0_24px_rgba(222,188,84,0.45)] hover:bg-gold-hover transition-all duration-micro"
          >
            <MapigoMark size={17} className="text-gold-fg" />
          </Link>
        </div>
        {items.slice(2).map((it) => <NavItem key={it.href} {...it} active={pathname === it.href} />)}
      </div>
    </nav>
  );
}

function NavItem({ href, icon: Icon, label, active }: { href: string; icon: typeof Home; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-micro",
        active ? "text-royal" : "text-text-tertiary",
      )}
    >
      <Icon size={20} strokeWidth={active ? 2 : 1.5} fill={active ? "currentColor" : "none"} />
      <span className="text-micro font-bold uppercase tracking-[0.12em]">{label}</span>
    </Link>
  );
}
