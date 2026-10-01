"use client";

/**
 * LUGHA — the language, as a row of the hub (the Vodacom plan S6, SJ-17; S6-PLAN WP5 step 5).
 *
 * ⭐ ONE LIST OF LANGUAGES: the header menu's own `LANGS` and `NAMES`, imported and never retyped, and the same
 * `setLocale` the header menu calls. A disclosure, so it opens with JavaScript off; its three choices open beneath the
 * row, in the page's flow — no floating panel to clip at 320 or to stack against the header.
 * ⛔ Below 1024 only: from there the journey header carries the language menu, and the kit's rule is one language
 * control per width (the avatar menu's note of 2026-08-13).
 */
import { useRef } from "react";
import { I } from "@/components/ui/glyphs";
import { LANGS, NAMES } from "@/components/ui/language-menu";
import { useT } from "@/lib/i18n";

export function LanguageRow() {
  const { t, locale, setLocale } = useT();
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <li className="lg:hidden">
      <details ref={ref} className="kp-hub__lang">
        <summary className="kp-hub__row">
          <span className="kp-hub__glyph" aria-hidden><I.globe s={20} /></span>
          <span className="kp-hub__text"><span className="kp-hub__label">{t.common.language}</span></span>
          <span className="kp-hub__value">{NAMES[locale]}</span>
          <I.chevronRight s={18} className="kp-hub__chev" aria-hidden />
        </summary>
        <div role="listbox" aria-label={t.common.language} className="kp-hub__opts">
          {LANGS.map((code) => {
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setLocale(code);
                  ref.current?.removeAttribute("open");
                }}
                className="kp-hub__opt"
              >
                <span aria-hidden className="kp-hub__tick">{active ? <I.check s={16} /> : null}</span>
                {NAMES[code]}
              </button>
            );
          })}
        </div>
      </details>
    </li>
  );
}
