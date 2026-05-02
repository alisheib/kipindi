"use client";

import { useT, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const { locale, setLocale } = useT();
  const Item = ({ value, label }: { value: Locale; label: string }) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={locale === value}
      onClick={() => setLocale(value)}
      className={cn(
        "flex h-7 px-2 items-center justify-center rounded-sm font-display text-micro font-bold uppercase tracking-[0.16em] transition-colors duration-micro",
        locale === value ? "bg-bg-elevated text-text shadow-e1" : "text-text-tertiary hover:text-text",
      )}
    >
      {value.toUpperCase()}
    </button>
  );
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md bg-surface-pressed p-0.5">
      <Item value="en" label="English" />
      <Item value="sw" label="Kiswahili" />
    </div>
  );
}
