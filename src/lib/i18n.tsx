"use client";

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { dict, type Locale, type Dict } from "./i18n-dict";

export type { Locale, Dict };
export { dict };

/* ═══════════════════════════════════════════════════════════════════════════
 *  PROVIDER — cookie + localStorage persistence, locale-change loader.
 * ═══════════════════════════════════════════════════════════════════════════ */

const VALID_LOCALES: readonly Locale[] = ["en", "sw", "zh"] as const;

function isLocale(v: string): v is Locale {
  return (VALID_LOCALES as readonly string[]).includes(v);
}

const I18nContext = createContext<{
  locale: Locale;
  t: Dict;
  setLocale: (l: Locale) => void;
  isChangingLocale: boolean;
}>({
  locale: "en",
  t: dict.en,
  setLocale: () => {},
  isChangingLocale: false,
});

const COOKIE_NAME = "kp-locale";

function readCookie(name: string): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  if (!match) return null;
  const v = decodeURIComponent(match[1]);
  return isLocale(v) ? v : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function I18nProvider({ children, initial = "en" }: { children: ReactNode; initial?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  const [isChangingLocale, setIsChangingLocale] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const fromCookie = readCookie(COOKIE_NAME);
    if (fromCookie && fromCookie !== locale) {
      setLocaleState(fromCookie);
      return;
    }
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kp-locale") as Locale | null;
      if (saved && isLocale(saved) && saved !== locale) {
        setLocaleState(saved);
        writeCookie(COOKIE_NAME, saved);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hide loader once the transition settles
  useEffect(() => {
    if (isChangingLocale && !isPending) {
      const id = setTimeout(() => setIsChangingLocale(false), 150);
      return () => clearTimeout(id);
    }
  }, [isPending, isChangingLocale]);

  const setLocale = (l: Locale) => {
    if (l === locale) return;
    setIsChangingLocale(true);
    setLocaleState(l);
    try {
      localStorage.setItem("kp-locale", l);
      writeCookie(COOKIE_NAME, l);
      document.documentElement.lang = l;
    } catch { /* ignore */ }
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <I18nContext.Provider value={{ locale, t: dict[locale] as Dict, setLocale, isChangingLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}

/**
 * Language-change loader — characters from all 3 scripts orbit and mix.
 *
 * Six glyphs (2 per language) orbit a shared centre in a staggered ring.
 * Each glyph scales up and glows as it passes the "front" position (bottom),
 * creating a carousel effect where the scripts visually blend.
 *
 * Glyphs: Hi / Go (EN), Habari / Sawa (SW), and the Chinese characters
 * for "language" and "hello".
 */
const GLYPHS = [
  { char: "Hi",  color: "oklch(78% 0.16 152)" },    // yes-green
  { char: "\u8BED", color: "oklch(78% 0.16 22)" },  // no-red — 语
  { char: "Ha",  color: "oklch(78% 0.16 152)" },    // yes-green
  { char: "\u597D", color: "oklch(78% 0.16 22)" },  // no-red — 好
  { char: "Sw",  color: "oklch(78% 0.16 152)" },    // yes-green
  { char: "En",  color: "oklch(78% 0.16 22)" },     // no-red
] as const;

export function LocaleChangeOverlay() {
  const { isChangingLocale, t } = useT();
  if (!isChangingLocale) return null;
  const n = GLYPHS.length;
  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center"
      style={{
        background: "color-mix(in oklab, var(--bg-base) 90%, transparent)",
        backdropFilter: "blur(16px) saturate(1.2)",
        WebkitBackdropFilter: "blur(16px) saturate(1.2)",
        animation: "lcl-fade 180ms ease-out",
      }}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Orbiting glyphs */}
        <div className="relative" style={{ width: 120, height: 120 }}>
          {GLYPHS.map((g, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 font-display font-bold select-none pointer-events-none"
              style={{
                fontSize: 20,
                color: g.color,
                textShadow: `0 0 18px ${g.color}`,
                animation: `lcl-orbit 2.4s linear infinite`,
                animationDelay: `${-(i / n) * 2.4}s`,
                transformOrigin: "center center",
              }}
            >
              {g.char}
            </span>
          ))}
          {/* Centre dot — a soft gold pulse */}
          <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "var(--brand-400)",
              boxShadow: "0 0 12px var(--brand-400), 0 0 24px var(--brand-500)",
              animation: "lcl-pulse 1.2s ease-in-out infinite",
            }}
          />
        </div>
        <p className="font-display text-[13px] font-semibold text-text-subtle tracking-[-0.01em]">
          {t.common.changingLanguage}
        </p>
      </div>
      <style>{`
        @keyframes lcl-fade {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes lcl-orbit {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateY(-44px) rotate(0deg) scale(0.7);
            opacity: 0.4;
          }
          50% {
            transform: translate(-50%, -50%) rotate(180deg) translateY(-44px) rotate(-180deg) scale(1.25);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateY(-44px) rotate(-360deg) scale(0.7);
            opacity: 0.4;
          }
        }
        @keyframes lcl-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1);   opacity: 0.7 }
          50%      { transform: translate(-50%, -50%) scale(1.5); opacity: 1   }
        }
      `}</style>
    </div>
  );
}
