"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";

type NavItem = { href: string; label: string; key: string; badge?: string };
type NavGroup = { group: { en: string; sw: string }; items: ReadonlyArray<NavItem> };

export function AdminMobileNavTrigger({ groups, badges, activeKey }: { groups: ReadonlyArray<NavGroup>; badges: Record<string, string | undefined>; activeKey: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Open admin navigation"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover"
      >
        <I.menu s={18} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div aria-hidden className="fixed inset-0 z-popover bg-bg-overlay/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside
            role="dialog"
            aria-label="Admin navigation"
            className="fixed left-0 top-0 z-popover h-[100dvh] w-[280px] max-w-[80vw] bg-bg-elevated border-r border-border-divider shadow-e5 flex flex-col kp-slide-up overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-center justify-between px-3 py-3 border-b border-border-divider sticky top-0 bg-bg-elevated">
              <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2">
                <span aria-hidden className="h-3.5 w-3.5 rounded-pill border-[1.5px] border-gold" />
                <span className="font-display font-bold text-body-sm text-text">50pick · admin</span>
              </Link>
              <button
                type="button"
                aria-label="Close admin navigation"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-hover"
              >
                <I.x s={16} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 flex flex-col gap-1">
              {groups.map((g) => (
                <div key={g.group.en}>
                  <div className="px-2 pt-3 pb-1.5 font-mono text-micro uppercase tracking-[0.18em] text-text-tertiary">
                    {g.group.en} · {g.group.sw}
                  </div>
                  {g.items.map((it) => {
                    const badge = badges[it.key];
                    const active = it.key === activeKey;
                    return (
                      <Link
                        key={it.key}
                        href={it.href as never}
                        onClick={() => setOpen(false)}
                        className={[
                          "flex items-center justify-between rounded-md px-2.5 py-2 text-body-sm transition-colors",
                          active
                            ? "bg-surface-pressed text-royal font-semibold"
                            : "text-text-secondary hover:bg-surface-hover hover:text-text",
                        ].join(" ")}
                      >
                        <span>{it.label}</span>
                        {badge && (
                          <span className="bg-gold text-gold-fg font-mono text-micro px-1.5 py-0.5 rounded-sm leading-none">
                            {badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>
        </>,
        document.body,
      )}
    </>
  );
}
