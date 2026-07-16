"use client";

import { useT, type Locale } from "@/lib/i18n";

const LANGS: Locale[] = ["en", "sw", "zh"];
const LABELS: Record<Locale, string> = { en: "EN", sw: "SW", zh: "中文" };

/**
 * Inline pill language toggle — kit spec (ds-brand-nav.jsx TopNav).
 * Three pills in a capsule: active = brand-500 bg + white text,
 * inactive = transparent + text-subtle. No dropdown, no portal.
 */
export function LanguageToggle() {
  const { locale, setLocale, t } = useT();

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
            aria-label={t.common.switchTo.replace("{lang}", LABELS[code])}
            aria-pressed={active}
            onClick={() => setLocale(code)}
            style={{
              // 44px-tall tap target (WCAG 2.5.5 AAA); visible only ≥sm. Height via
              // minHeight + flex-centring so the glyph stays 11.5px and the pill
              // keeps its 9px side padding (no horizontal reflow in the top bar).
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 9px",
              borderRadius: "var(--r-pill)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              // brand-600 (not -500): white text needs the darker shade to
              // clear WCAG AA 4.5:1 on this small 11.5px pill (axe a11y).
              color: active ? "var(--pearl-50)" : "var(--text-subtle)",
              background: active ? "var(--brand-600)" : "transparent",
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
