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

/** Full-screen locale-change loader overlay. Mount once in the provider tree. */
export function LocaleChangeOverlay() {
  const { isChangingLocale, t } = useT();
  if (!isChangingLocale) return null;
  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center"
      style={{
        background: "color-mix(in oklab, var(--bg-base) 88%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "lcl-fade 120ms ease-out",
      }}
    >
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="relative h-10 w-10">
          <span
            className="absolute inset-0 rounded-full border-2 border-brand-500/60"
            style={{ animation: "lcl-ring 0.8s ease-in-out infinite" }}
          />
          <span
            className="absolute inset-1.5 rounded-full border-2 border-gold-400/50"
            style={{ animation: "lcl-ring 0.8s ease-in-out 0.15s infinite" }}
          />
          <span
            className="absolute inset-3 rounded-full border-2 border-brand-300/40"
            style={{ animation: "lcl-ring 0.8s ease-in-out 0.3s infinite" }}
          />
        </div>
        <p className="font-display text-[13px] font-semibold text-text-subtle tracking-[-0.01em]">
          {t.common.changingLanguage}
        </p>
      </div>
      <style>{`
        @keyframes lcl-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes lcl-ring { 0%,100% { transform: scale(1); opacity: 0.6 } 50% { transform: scale(1.1); opacity: 1 } }
      `}</style>
    </div>
  );
}
