"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useT, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Globe, Check, ChevronDown } from "lucide-react";

const LANGS: Array<{ value: Locale; label: string; native: string }> = [
  { value: "en", label: "English",   native: "English"   },
  { value: "sw", label: "Kiswahili", native: "Kiswahili" },
  { value: "fr", label: "French",    native: "Français"  },
];

export function LanguageToggle() {
  const { locale, setLocale } = useT();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    // `click` (not `mousedown`) so any child-portal control gets to
    // complete its click before this menu tears down. See Sprint 53.1.
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      if (target.closest('[role="dialog"], [role="alertdialog"]')) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LANGS.find((l) => l.value === locale) ?? LANGS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Language: ${current.label}. Open menu to change.`}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 h-8 px-2 rounded-md font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-colors",
          open ? "bg-bg-overlay text-text" : "text-text-subtle hover:text-text hover:bg-bg-overlay",
        )}
      >
        <Globe size={13} aria-hidden />
        <span>{current.value.toUpperCase()}</span>
        <ChevronDown size={11} aria-hidden className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div aria-hidden className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-md sm:bg-transparent sm:backdrop-blur-none" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            role="menu"
            aria-label="Language"
            className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] sm:left-auto sm:right-4 sm:top-[64px] sm:min-w-[180px] sm:max-w-[calc(100vw-24px)] rounded-xl border border-border-strong bg-bg-elevated/85 backdrop-blur-xl z-[61] overflow-hidden shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]"
            style={{ animation: "lang-rise 180ms cubic-bezier(.2,.8,.2,1)" }}
          >
            {LANGS.map((l) => {
              const active = l.value === locale;
              return (
                <button
                  key={l.value}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setLocale(l.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left flex items-center justify-between gap-3 px-3.5 py-2.5 font-display text-[13px] transition-colors border-b border-border last:border-b-0",
                    active ? "bg-bg-overlay text-text font-semibold" : "text-text-muted hover:bg-bg-overlay hover:text-text",
                  )}
                >
                  <span className="flex flex-col leading-tight">
                    <span>{l.native}</span>
                    {l.value !== "en" && <span className="font-mono text-[10.5px] text-text-subtle">{l.label}</span>}
                  </span>
                  {active && <Check size={14} className="text-gold-300 shrink-0" />}
                </button>
              );
            })}
          </div>
          <style>{`
            @keyframes lang-rise { from { transform: translateY(-6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>
        </>,
        document.body,
      )}
    </div>
  );
}
