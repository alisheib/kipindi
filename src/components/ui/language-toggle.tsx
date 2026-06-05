"use client";

import { useT, type Locale } from "@/lib/i18n";

const LANGS: Locale[] = ["en", "sw", "fr"];
const LABELS: Record<Locale, string> = { en: "EN", sw: "SW", fr: "FR" };

/**
 * Inline pill language toggle — kit spec (ds-brand-nav.jsx TopNav).
 * Three pills in a capsule: active = brand-500 bg + white text,
 * inactive = transparent + text-subtle. No dropdown, no portal.
 */
export function LanguageToggle() {
  const { locale, setLocale } = useT();

  return (
    <div
      className="hidden sm:flex"
      style={{
        gap: 2,
        padding: 3,
        borderRadius: "var(--r-pill)",
        background: "var(--bg-inset)",
        border: "1px solid var(--border)",
      }}
    >
      {LANGS.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            aria-label={`Switch to ${code}`}
            aria-pressed={active}
            onClick={() => setLocale(code)}
            style={{
              padding: "4px 9px",
              borderRadius: "var(--r-pill)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              color: active ? "#fff" : "var(--text-subtle)",
              background: active ? "var(--brand-500)" : "transparent",
              border: "none",
              fontFamily: "var(--font-mono)",
              lineHeight: 1,
              transition: "background 100ms, color 100ms",
            }}
          >
            {LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
