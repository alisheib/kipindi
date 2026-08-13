"use client";

/**
 * LanguageMenu — ONE 44×44 `EN ⌄` control, at EVERY width (kit §2 / COMPONENTS §14).
 *
 * ⛔ WHAT THIS REPLACES, AND WHY THE OLD SHAPE COULD NOT BE KEPT. `LanguageToggle` was a 3-pill
 * capsule (EN · SW · 中文) that was `hidden sm:flex` AND hidden again by the header across
 * 1024–1279, because the full right-hand cluster plus a three-pill capsule overflowed 1024 and
 * pushed the avatar off-screen. So the language control was absent on a phone and absent on a
 * small laptop, and the avatar menu carried a second copy of the picker for exactly that band —
 * two controls for one decision, neither of them always present. One 44px trigger costs a third
 * of the capsule's width and fits at every width, which is what makes the band compromise
 * unnecessary rather than merely relocated.
 *
 * ⭐ BUILT ON `<details>`, matching `MenuShell` — the disclosure opens with JavaScript disabled.
 * ⚠️ `role="option"` elements are DIRECT children of `role="listbox"`. The kit calls this out
 * because the previous markup nested each option inside an `<li>`, which breaks the accessibility
 * tree: a listbox's children must be options, and an intervening list wrapper makes the options
 * invisible to a screen reader's listbox semantics.
 *
 * ⚠️ `min-h-[44px]`/`w-[44px]` are arbitrary values ON PURPOSE — Tailwind's spacing scale is
 * OVERRIDDEN in this repo (`h-8` = 48px), so a scale class would silently be the wrong size.
 */
import { useEffect, useRef, useState } from "react";
import { I } from "@/components/ui/glyphs";
import { useT, type Locale } from "@/lib/i18n";

const LANGS: Locale[] = ["en", "sw", "zh"];
/** The CODE, shown on every row (kit §2). `中文` is the endonym, which is what a reader looks for. */
const CODES: Record<Locale, string> = { en: "EN", sw: "SW", zh: "ZH" };
const NAMES: Record<Locale, string> = { en: "English", sw: "Kiswahili", zh: "中文" };

export function LanguageMenu() {
  const { locale, setLocale, t } = useT();
  const ref = useRef<HTMLDetailsElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /**
   * 🔴 THE PANEL SELF-ALIGNS TO THE TRIGGER'S OWN RIGHT EDGE, AND THAT IS NOT ALWAYS THE
   * VIEWPORT'S RIGHT EDGE. Measured at 360 in a guest session: the trigger is the FIRST child of
   * the header's right-hand cluster (`gap-2`), with `Sign up` after it — so at 360 the trigger sits
   * at x=73 while the cluster's own right edge reaches x=344. A `right: 0` panel anchored to the
   * TRIGGER put a 196px-wide listbox's left edge at **-64px**, 67% visible, `sw` worse at 79%.
   * ⭐ Rather than guess a breakpoint, this MEASURES on open and flips to left-anchored whenever
   * right-anchoring would run off the viewport's left edge — which is exactly the geometry that
   * varies with how many controls precede this one (auth state, width, locale string length all
   * change it), so a fixed threshold would be re-broken by the next thing added to the cluster.
   */
  const [align, setAlign] = useState<"right" | "left">("right");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const close = () => el.removeAttribute("open");
    const onDocDown = (e: MouseEvent) => {
      if (el.open && e.target instanceof Node && !el.contains(e.target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && el.open) {
        close();
        el.querySelector("summary")?.focus();
      }
    };
    const onToggle = () => {
      if (!el.open) return;
      // Measure the RIGHT-anchored geometry the CSS would otherwise produce, before deciding.
      setAlign("right");
      requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const r = panel.getBoundingClientRect();
        if (r.left < 4) setAlign("left");
      });
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    el.addEventListener("toggle", onToggle);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
      el.removeEventListener("toggle", onToggle);
    };
  }, []);

  return (
    <details ref={ref} className="kp-menu relative shrink-0">
      {/* The UTILITY tier: bordered, `--r-sm`, 44×44 minimum. Bordered is what distinguishes a
          utility control from a destination (no border) and an action (pill) — one meaning per
          shape, which is the largest correction the kit's round 2.5 made. */}
      <summary
        aria-label={t.common.switchTo.replace("{lang}", NAMES[locale])}
        className="inline-flex min-h-[44px] cursor-pointer list-none items-center justify-center gap-1 rounded-md border border-border-control px-2 text-text-muted transition-colors hover:text-text"
        style={{ minWidth: 44 }}
      >
        <span className="font-mono text-[12px] font-bold tracking-[0.08em]">{CODES[locale]}</span>
        <I.chevronDown s={12} aria-hidden className="kp-menu-caret opacity-70" />
      </summary>

      <div
        ref={panelRef}
        role="listbox"
        aria-label={t.common.language}
        /* ⛔ NOT UNCONDITIONALLY right-0 — see the note above `align` state. Measured, not assumed:
           right-anchoring puts this panel 64px off the left edge at 360 in a guest session,
           because the trigger is not the rightmost thing in its own cluster. */
        className={`absolute top-[calc(100%+6px)] z-30 min-w-[196px] rounded-md border border-border bg-bg-elevated py-1 ${align === "right" ? "right-0" : "left-0"}`}
        style={{ boxShadow: "var(--shadow-overlay)" }}
      >
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
              className="flex w-full min-h-[44px] cursor-pointer items-center gap-3 px-3 text-left text-[13px] transition-colors hover:bg-bg-overlay"
              style={{
                color: active ? "var(--text)" : "var(--text-muted)",
                background: active ? "var(--pill-active)" : "transparent",
              }}
            >
              {/* A FIXED 16px tick column, so the three rows' labels line up whether or not a row
                  is the current one — a tick that shifts its neighbours reads as a layout bug. */}
              <span aria-hidden style={{ width: 16, flex: "none", color: "var(--gilt)" }}>
                {active ? <I.check s={14} /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate">{NAMES[code]}</span>
              <span className="shrink-0 font-mono text-[11px] font-bold text-text-faint">{CODES[code]}</span>
            </button>
          );
        })}
      </div>
    </details>
  );
}
