"use client";

import { useT, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const { locale, setLocale } = useT();

  // Mobile: single button that flips locale on click. Desktop: 2-button segmented pill.
  return (
    <>
      <button
        type="button"
        aria-label={`Language: ${locale === "en" ? "English (tap for Kiswahili)" : "Kiswahili (tap for English)"}`}
        onClick={() => setLocale(locale === "en" ? "sw" : "en")}
        className="lg:hidden inline-flex h-9 min-w-9 px-2 items-center justify-center rounded-md bg-surface-pressed text-text-secondary hover:text-text hover:bg-surface-hover font-display text-micro font-bold uppercase tracking-[0.16em] transition-colors duration-micro"
      >
        {locale.toUpperCase()}
      </button>
      <div className="hidden lg:inline-flex items-center gap-0.5 rounded-md bg-surface-pressed p-0.5">
        <Item value="en" label="English" current={locale} onSelect={setLocale} />
        <Item value="sw" label="Kiswahili" current={locale} onSelect={setLocale} />
      </div>
    </>
  );
}

function Item({ value, label, current, onSelect }: { value: Locale; label: string; current: Locale; onSelect: (v: Locale) => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={current === value}
      onClick={() => onSelect(value)}
      className={cn(
        "flex h-7 px-2 items-center justify-center rounded-sm font-display text-micro font-bold uppercase tracking-[0.16em] transition-colors duration-micro",
        current === value ? "bg-bg-elevated text-text shadow-e1" : "text-text-tertiary hover:text-text",
      )}
    >
      {value.toUpperCase()}
    </button>
  );
}
