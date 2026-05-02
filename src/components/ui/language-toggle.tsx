"use client";

import * as React from "react";
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

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
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
          "inline-flex items-center gap-1 h-8 px-2 rounded-md font-display text-micro font-bold uppercase tracking-[0.16em] transition-colors duration-micro",
          open ? "bg-surface-pressed text-text" : "text-text-tertiary hover:text-text hover:bg-surface-hover",
        )}
      >
        <Globe size={13} aria-hidden />
        <span>{current.value.toUpperCase()}</span>
        <ChevronDown size={11} aria-hidden className={cn("transition-transform duration-micro", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Language"
          className="absolute right-0 top-[calc(100%+6px)] min-w-[160px] rounded-md border border-border-strong bg-bg-elevated shadow-e3 overflow-hidden z-popover kp-slide-up"
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
                  "w-full text-left flex items-center justify-between gap-3 px-3 py-2 text-body-sm transition-colors duration-micro",
                  active ? "bg-surface-pressed text-text font-semibold" : "text-text-secondary hover:bg-surface-hover hover:text-text",
                )}
              >
                <span className="flex flex-col leading-tight">
                  <span>{l.native}</span>
                  {l.value !== "en" && <span className="text-micro text-text-tertiary">{l.label}</span>}
                </span>
                {active && <Check size={14} className="text-gold shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
