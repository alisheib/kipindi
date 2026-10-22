"use client";

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DEFAULT_LOCALE, dict, type Locale, type Dict } from "./i18n-dict";

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
  locale: DEFAULT_LOCALE,
  t: dict[DEFAULT_LOCALE] as Dict,
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

/**
 * ⭐ `pinned` — a surface that IS one language. The officer console's every sentence of server copy is English, and
 * the kit words it borrows through `useT()` (a dialog's Cancel and Close, a typed confirmation's "Type 49 to confirm")
 * fell back to `DEFAULT_LOCALE` — Swahili, right for players — or to whatever language the officer last chose on the
 * player site. Measured 2026-10-02 on U23's bulk bar: "Andika 49 kuthibitisha" above an English sentence. A pinned
 * provider never reads the player's cookie or saved choice, and `setLocale` is a no-op inside it.
 */
export function I18nProvider({ children, initial = DEFAULT_LOCALE, pinned = false }: { children: ReactNode; initial?: Locale; pinned?: boolean }) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  const [isChangingLocale, setIsChangingLocale] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (pinned) return;
    const fromCookie = readCookie(COOKIE_NAME);
    if (fromCookie && fromCookie !== locale) {
      setLocaleState(fromCookie);
      return;
    }
    if (typeof window !== "undefined") {
      let saved: string | null = null;
      try { saved = localStorage.getItem("kp-locale"); } catch { /* storage blocked — the cookie above is the fallback */ }
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

  const setLocale = useCallback((l: Locale) => {
    if (pinned || l === locale) return;
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
  }, [locale, router, startTransition, pinned]);

  /**
   * ⭐ THE CONTEXT VALUE IS MEMOISED, AND THAT IS A RENDER BUDGET, NOT TIDINESS.
   *
   * This provider sits above the whole app, and `useT()` is called by ~120 client
   * files. A context whose value is a fresh object literal notifies EVERY one of
   * those consumers on EVERY render of this component — React's context
   * propagation deliberately walks past the `children` bail-out, so the fact that
   * `children` is a stable element from ThemeProvider saves nothing.
   *
   * This component re-renders more often than it changes anything. One language
   * switch is up to five renders — `setIsChangingLocale(true)`, `setLocaleState`,
   * `isPending` true, `isPending` false, `setIsChangingLocale(false)` — and the
   * two driven by `useTransition` carry no change to `locale`, `t` or the flag at
   * all. Unmemoised, each of those was a full re-render of every mounted consumer
   * on the target device, at the exact moment `router.refresh()` already has it
   * busy re-rendering the server tree.
   *
   * ⚠️ `isChangingLocale` stays IN this value on purpose. It is read only by
   * `LocaleChangeOverlay` below, so a second context would spare consumers the
   * two flips — but `useT()`'s return shape is depended on by those ~120 files
   * and a consumer that read both contexts would re-render just the same. The
   * shape is the contract; do not split it for a two-render saving.
   */
  const value = useMemo(
    () => ({ locale, t: dict[locale] as Dict, setLocale, isChangingLocale }),
    [locale, setLocale, isChangingLocale],
  );

  return (
    <I18nContext.Provider value={value}>
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
 * Glyphs: Hi, Ha, Sw and En (a greeting's first letters and two language
 * codes), and the Chinese characters 语 ("language") and 好 (of 你好, "hello"),
 * alternating the YES green and the NO red (GLYPHS, below) around the
 * brand-blue pulse.
 *
 * ⚠️ EVERY ANIMATION HERE IS DECLARED ON A CLASS, NOT IN A style ATTRIBUTE, and
 * that is a motion-gate requirement rather than a preference (§M6). Both loops
 * used to be inline `animation` shorthands, and a style attribute is invisible to
 * every gate this product has: `test:reduce-motion` reads RULES, so neither loop
 * was ever checked against the third gate and neither had a calm branch of any
 * kind; and `test:keyframes`' consumer scan stops dead at the opening quote, so
 * `lcl-orbit` and `lcl-pulse` were both reported as names with NO CONSUMER —
 * which is to say, as safe to delete.
 */
/* ⭐ ITS GREEN AND RED — THE OWNER'S RULING, 2026-10-22 (DESIGN_AUTHORITY §B2a, "the owner's exception"). The ring was born
   alternating the YES green and the NO red. R5-I (2026-10-09) moved it to the brand family's two pale steps, and on the
   screen that was a blue-grey ring: inks rgb(153,196,255) / rgb(183,216,255) at 0.4–1 opacity on the dark scrim, ink
   chroma 0.08 against the old ring's 0.12. Ali: "on change language the colored animation is still on grey scale — give
   it back its color", then "its green and red". So the glyphs alternate the pair again, from Hi, around the brand pulse.
   ⛔ THE PAIR'S TOKENS, NEVER THE OLD LITERALS: the old `oklch(78% 0.16 …)` were hand-typed, and this file is off
   `test:design-frozen`'s list. ⭐ THE -400 STEP, NOT -300, AND IT WAS MEASURED: on one frozen frame of this ring, -300
   (80% 0.14) drew 0.87× the old ring's ink chroma, and -400 (72% 0.16 / 0.18) draws 1.13–1.15× it at the same lightness
   on screen — "as far from grey as before" is the bar. `qa:locale-loader` measures it on every run;
   `test:betting-ink` §7i and `test:visual-pass-r5i` §2.15⁗ hold the source to exactly this ring. */
const GLYPHS = [
  { char: "Hi",  color: "var(--yes-400)" },
  { char: "\u8BED", color: "var(--no-400)" },  // 语
  { char: "Ha",  color: "var(--yes-400)" },
  { char: "\u597D", color: "var(--no-400)" },  // 好
  { char: "Sw",  color: "var(--yes-400)" },
  { char: "En",  color: "var(--no-400)" },
] as const;

export function LocaleChangeOverlay() {
  const { isChangingLocale, t } = useT();
  /* 🔴 PORTALED TO document.body, AND NOT FOR TIDINESS. This is `fixed inset-0` — a
     FULL-VIEWPORT scrim — rendered from inside the provider tree that wraps route content. A
     `fixed` element resolves against the nearest ancestor with a transform, filter or
     containment, NOT against the viewport, and this app animates route entry with a transform
     (`.route-enter`). So mid-transition this scrim would have been laid out against the
     animating box instead of the screen: a language change during a navigation could show the
     loader offset, part-covering the page it is meant to cover. `test:stacking` §5.2 has been
     naming this file for exactly that reason, and it is in `predeploy`.
     ⛔ `useState`/`useEffect` run BEFORE the `isChangingLocale` bail-out: hooks cannot sit
     behind a conditional return. The host stays null until mount, so the server renders
     nothing and there is no hydration mismatch — the overlay only ever appears after a tap. */
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  if (!isChangingLocale || !host) return null;
  const n = GLYPHS.length;
  const overlay = (
    <div
      className="lcl-scrim fixed inset-0 z-[9000] flex items-center justify-center"
      style={{
        background: "color-mix(in oklab, var(--bg-base) 90%, transparent)",
        backdropFilter: "blur(16px) saturate(1.2)",
        WebkitBackdropFilter: "blur(16px) saturate(1.2)",
      }}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Orbiting glyphs */}
        <div className="relative" style={{ width: 120, height: 120 }}>
          {GLYPHS.map((g, i) => (
            <span
              key={i}
              className="lcl-glyph absolute left-1/2 top-1/2 font-display font-bold select-none pointer-events-none"
              style={{
                fontSize: 20,
                color: g.color,
                textShadow: `0 0 18px ${g.color}`,
                // This glyph's share of the ring, in degrees. It does two jobs from
                // ONE number: the negative delay below phases it while the ring
                // turns, and the calm branches pin it at exactly this angle when
                // motion is off — so the still ring cannot drift from the moving
                // one, and adding a seventh glyph re-spaces both at once.
                ["--lcl-a" as string]: `${((i / n) * 360).toFixed(1)}deg`,
                animationDelay: `${-(i / n) * 2.4}s`,
                transformOrigin: "center center",
              }}
            >
              {g.char}
            </span>
          ))}
          {/* Centre dot — a soft brand-blue pulse (it left gold on 2026-07-09: gold means earned, §M3) */}
          <span
            className="lcl-dot absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "var(--brand-400)",
              boxShadow: "0 0 12px var(--brand-400), 0 0 24px var(--brand-500)",
            }}
          />
        </div>
        <p className="font-display text-[13px] font-semibold text-text-subtle tracking-[-0.01em]">
          {t.common.changingLanguage}
        </p>
      </div>
      <style>{`
        .lcl-scrim { animation: lcl-fade 180ms ease-out; }
        .lcl-glyph { animation: lcl-orbit 2.4s linear infinite; }
        .lcl-dot   { animation: lcl-pulse 1.2s ease-in-out infinite; }
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

        /* ⭐ THE CALM BRANCHES — AND WHY THEY ARE NOT A BARE "animation: none".
           The ring POSITION lives inside lcl-orbit; the base style carries no
           transform at all. Stopping the animation therefore stacks all six
           glyphs on one point at the centre of the box — a broken end frame, which
           is the exact failure M6 names. Each glyph is pinned at its own --lcl-a
           instead, so the ring still reads as a ring, just still.
           Written THREE times because CSS cannot union a media query with a
           selector: gate 1 (the OS), gate 2 (the in-app switch and the minimal
           tier), gate 3 (the low-end-Android throttle, whose whole contract is
           "ambient loops off" — and a 2.4s orbit under a full-screen scrim is the
           definition of one). Keep the three in step; they are one branch. */
        @media (prefers-reduced-motion: reduce) {
          .lcl-glyph {
            animation: none;
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--lcl-a)) translateY(-44px) rotate(calc(-1 * var(--lcl-a)));
          }
          .lcl-dot { animation: none; opacity: 0.9; }
        }
        html.kp-reduce-motion .lcl-glyph,
        [data-motion="minimal"] .lcl-glyph {
          animation: none;
          opacity: 1;
          transform: translate(-50%, -50%) rotate(var(--lcl-a)) translateY(-44px) rotate(calc(-1 * var(--lcl-a)));
        }
        html.kp-reduce-motion .lcl-dot,
        [data-motion="minimal"] .lcl-dot { animation: none; opacity: 0.9; }
        [data-motion="reduced"] .lcl-glyph {
          animation: none;
          opacity: 1;
          transform: translate(-50%, -50%) rotate(var(--lcl-a)) translateY(-44px) rotate(calc(-1 * var(--lcl-a)));
        }
        [data-motion="reduced"] .lcl-dot { animation: none; opacity: 0.9; }
      `}</style>
    </div>
  );
  return createPortal(overlay, host);
}
