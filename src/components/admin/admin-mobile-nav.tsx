"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";

type NavItem = { href: string; label: string; key: string; badge?: string };
type NavGroup = { group: { en: string; sw: string }; items: ReadonlyArray<NavItem> };

export function AdminMobileNavTrigger({ groups, badges, activeKey }: { groups: ReadonlyArray<NavGroup>; badges: Record<string, string | undefined>; activeKey: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // A11y: Escape closes the panel; focus moves into the dialog (the close button)
  // on open and returns to the trigger on close. focus() uses preventScroll so it
  // adds no motion — reduced-motion-safe by construction.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      closeRef.current?.focus({ preventScroll: true });
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open admin navigation"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-text-secondary hover:bg-bg-overlay"
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
                <FiftyMark size={18} simplified aria-hidden />
                <span className="font-display font-bold text-body-sm text-text">50pick · admin</span>
              </Link>
              <button
                ref={closeRef}
                type="button"
                aria-label="Close admin navigation"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-tertiary hover:bg-bg-overlay"
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
                            ? "bg-bg-inset text-royal-300 font-semibold"
                            : "text-text-secondary hover:bg-bg-overlay hover:text-text",
                        ].join(" ")}
                      >
                        <span>{it.label}</span>
                        {badge && (
                          <span className="bg-brand-500 text-white font-mono text-micro px-1.5 py-0.5 rounded-sm leading-none">
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
