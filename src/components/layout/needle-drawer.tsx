"use client";

/**
 * The Needle — controls drawer.
 *
 * A small, aesthetic settings surface for the pause object: a bottom sheet on mobile and
 * a compact centred panel on desktop, holding
 *   · Show on screen  — the view-sight (hide/show) control, and
 *   · Interaction     — Spin (grab/flick) vs Bounce (tap darts it away).
 * State is the persisted `50pick:feedback` prefs, read/written through
 * src/lib/needle-bridge.ts and kept live via the "50pick:feedback-changed" event, so the
 * drawer, the object and the settings page never disagree. Robust by construction: the
 * prefs loader coerces any unknown value back to a safe default.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Toggle } from "@/components/ui/toggle";
import { useExitPhase } from "@/components/ui/modal";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { isNeedleHidden, setNeedleHidden, getNeedleMode, setNeedleMode, getNeedleTheme, setNeedleTheme } from "@/lib/needle-bridge";
import type { NeedleMode, NeedleTheme } from "@/lib/haptics";

/**
 * A live miniature of the actual disc, painted by whichever theme it is given.
 *
 * ⭐ It carries `data-needle-theme` and reads the SAME `--ndl-*` variables the real
 * object does (needle.css), so the swatch cannot drift from the thing it previews —
 * there is no second copy of the palette here to go stale. Same geometry too: these
 * are the disc's own path/line coordinates.
 */
function DiscSwatch({ theme, size = 30 }: { theme: NeedleTheme; size?: number }) {
  return (
    <span data-needle-theme={theme} aria-hidden="true" className="block">
      <svg width={size} height={size} viewBox="0 0 100 100" className="block">
        <path d="M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z" style={{ fill: "var(--ndl-face-a-hi)" }} />
        <path d="M 38.87 5.37 A 46 46 0 0 1 61.13 94.63 Z" style={{ fill: "var(--ndl-face-b-hi)" }} />
        <circle cx="50" cy="50" r="46.4" fill="none" style={{ stroke: "var(--ndl-ring)" }} strokeWidth="3" opacity="0.72" />
        <line x1="38.39" y1="3.43" x2="61.61" y2="96.57" style={{ stroke: "var(--ndl-seam)" }} strokeWidth="6" strokeLinecap="round" />
        <circle cx="50" cy="50" r="9" style={{ fill: "var(--ndl-hub-1)" }} />
        <circle cx="50" cy="50" r="2.6" style={{ fill: "var(--ndl-pivot)" }} />
      </svg>
    </span>
  );
}

/** The 50pick mark in miniature — a disc with the needle on its pivot. */
function NeedleMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" opacity="0.5" />
      <line x1="38" y1="8" x2="62" y2="92" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

export function NeedleControlsDrawer({ variant = "menu-row" }: { variant?: "menu-row" | "settings" }) {
  const { locale } = useT();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mode, setMode] = useState<NeedleMode>("spin");
  const [theme, setTheme] = useState<NeedleTheme>("50pick");

  // Read after mount (avoid hydration mismatch) and stay in sync with every other surface.
  useEffect(() => {
    const sync = () => { setHidden(isNeedleHidden()); setMode(getNeedleMode()); setTheme(getNeedleTheme()); };
    sync();
    window.addEventListener("50pick:feedback-changed", sync);
    return () => window.removeEventListener("50pick:feedback-changed", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /* §M2 — "every arrival has its exit". This drawer arrived on the bespoke pair below
     and then left by instant unmount. `--t-quick` is the LONGER of the two exits it
     plays (mobile `--t-quick`, desktop `--t-flick`), so the hold covers both and the
     desktop panel simply rests on its `both` end frame for the remainder. */
  const { present, exiting } = useExitPhase(open, "--t-quick");

  const t = (en: string, sw: string, zh: string) => (locale === "sw" ? sw : locale === "zh" ? zh : en);
  const shownLabel = hidden ? t("Hidden", "Imefichwa", "已隐藏") : t("Shown", "Inaonekana", "显示");

  const toggleShown = () => { const next = !hidden; setHidden(next); setNeedleHidden(next); };
  const pickMode = (m: NeedleMode) => { setMode(m); setNeedleMode(m); };
  const pickTheme = (t: NeedleTheme) => { setTheme(t); setNeedleTheme(t); };

  /* ⛔ The theme's NAME is never translated. "50pick" and "Pepsi" are proper nouns —
     a brand does not get localised, and the house theme is the product's own name. Only
     the section heading and the hints below take the three locales. */
  const THEMES: { id: NeedleTheme; name: string; hint: string }[] = [
    { id: "50pick", name: "50pick", hint: t("The house disc", "Diski ya nyumbani", "本站原版") },
    { id: "pepsi", name: "Pepsi", hint: t("Sponsor edition", "Toleo la mdhamini", "赞助版") },
  ];

  const trigger =
    variant === "menu-row" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 font-display text-body-sm font-medium text-text transition-colors hover:bg-bg-overlay text-left"
      >
        <span className={hidden ? "text-text-subtle" : "text-brand-300"}><NeedleMark /></span>
        <span className="flex-1">{t("The Needle", "Sindano", "指针玩具")}</span>
        <span className="font-mono text-micro uppercase tracking-[0.12em] text-text-subtle">{shownLabel}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="text-text-subtle"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-overlay px-3 py-2 font-display text-[12.5px] font-semibold text-text transition-colors hover:bg-brand-500/10"
      >
        <span className="text-brand-300"><NeedleMark size={15} /></span>
        {t("Manage the Needle", "Dhibiti Sindano", "管理指针玩具")}
      </button>
    );

  return (
    <>
      {trigger}
      {present && typeof document !== "undefined" && createPortal(
        <>
          {/* The scrim is full-bleed and carries no transform of its own, so it can take
              the kit's float exit verbatim — its 6px travel is invisible at inset-0. */}
          <div
            aria-hidden
            className={cn("fixed inset-0 z-[70] bg-black/50 backdrop-blur-md", exiting && "m-float-out pointer-events-none")}
            onClick={exiting ? undefined : () => setOpen(false)}
          />
          <div
            role="dialog"
            /* Leaving: it stops declaring the rest of the page inert, and stops taking
               clicks so a toggle cannot be worked through its own fade. ⛔ Not
               `aria-hidden`: this drawer does not return focus to its trigger, so
               Escape pressed on a focused Toggle would leave aria-hidden over the
               focused element. Dropping an attribute is always safe; adding that one
               is not. */
            aria-modal={exiting ? undefined : "true"}
            aria-label={t("The Needle controls", "Vidhibiti vya Sindano", "指针玩具控制")}
            className={cn(
              "fixed z-[71] border border-border-strong bg-bg-elevated/95 backdrop-blur-xl",
              // Bottom sheet on mobile, so the cast goes UP; at sm: it becomes a
              // centred panel and takes the dialog rung like every other centred panel.
              "shadow-overlay-up sm:shadow-modal",
              // mobile: bottom sheet · desktop: small centred panel
              "left-0 right-0 bottom-0 rounded-t-modal px-4 pt-4",
              "pb-[calc(16px+env(safe-area-inset-bottom))]",
              "sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2 sm:w-[360px] sm:max-w-[calc(100vw-24px)]",
              "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-modal sm:p-5 sm:pb-5",
              exiting ? "needle-sheet-out pointer-events-none" : "needle-sheet",
            )}
          >
            {/* grabber (mobile affordance) */}
            <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-border-strong sm:hidden" />

            {/* header */}
            <div className="flex items-start gap-2.5 mb-4">
              <span className="mt-0.5 text-brand-300"><NeedleMark size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] font-bold text-text leading-tight">{t("The Needle", "Sindano", "指针玩具")}</p>
                <p className="mt-0.5 text-body-sm text-text-subtle leading-snug">
                  {t(
                    "An optional fidget on the edge. It never affects your account.",
                    "Kichezeo cha hiari kwenye ukingo. Hakiathiri akaunti yako.",
                    "屏幕边缘的可选小玩具，绝不影响你的账户。",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("Close", "Funga", "关闭")}
                /* ⛔ LITERALS, NOT `h-9 w-9` — the spacing scale is overridden
                   (tailwind.config.ts:200-215) and that pair is 64×64px, 16px larger than
                   every other ✕ in the kit. 40px = --tap-min. */
                className="shrink-0 grid h-[40px] w-[40px] place-items-center rounded-lg text-text-subtle transition-colors hover:bg-bg-overlay hover:text-text"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </div>

            {/* view-sight control */}
            <div className="flex items-center gap-3 border-t border-border/60 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="font-display text-[13.5px] font-semibold text-text leading-tight">{t("Show on screen", "Onyesha kwenye skrini", "在屏幕上显示")}</p>
                <p className="mt-0.5 text-body-sm text-text-muted leading-snug">{t("The fidget on the edge of the screen", "Kichezeo kwenye ukingo wa skrini", "屏幕边缘的小玩具")}</p>
              </div>
              <Toggle on={!hidden} onClick={toggleShown} aria-label={t("Show the Needle", "Onyesha Sindano", "显示指针玩具")} />
            </div>

            {/* interaction mode */}
            <div className="border-t border-border/60 pt-3.5">
              <p className="font-display text-[13.5px] font-semibold text-text leading-tight">{t("Interaction", "Mwingiliano", "互动方式")}</p>
              <div className={cn("mt-2 grid grid-cols-2 gap-1.5", hidden && "opacity-50 pointer-events-none")} aria-disabled={hidden}>
                {(["spin", "bounce"] as const).map((m) => {
                  const active = mode === m;
                  const label = m === "spin" ? t("Spin", "Zungusha", "旋转") : t("Bounce", "Dunda", "弹开");
                  const hint = m === "spin"
                    ? t("Flick it with your finger", "Izungushe kwa kidole", "用手指拨动")
                    : t("Tap and it darts away", "Gusa nayo inarukia mbali", "一点它就弹开");
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => pickMode(m)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition-colors",
                        // `/[0.12]`, not `/12`: Tailwind's opacity scale runs in steps of 5, so a
                        // `/12` modifier is dropped before the colour is ever mixed and the ACTIVE
                        // mode button rendered with no fill at all while the inactive ones (bare
                        // `bg-bg-overlay`) painted. The arbitrary form keeps the intended 12%.
                        active ? "border-brand-400 bg-brand-500/[0.12] text-text" : "border-border bg-bg-overlay text-text-subtle hover:text-text",
                      )}
                    >
                      <span className="flex items-center gap-1.5 font-display text-[13px] font-semibold">
                        {label}
                        {active && <span className="text-brand-300" aria-hidden><svg width="12" height="12" viewBox="0 0 24 24"><path d="M5 12l5 5L20 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
                      </span>
                      <span className="mt-0.5 block text-body-sm leading-snug text-text-subtle">{hint}</span>
                    </button>
                  );
                })}
              </div>
              {hidden && (
                <p className="mt-2 text-body-sm italic text-text-subtle">{t("Turn it on above to change how it plays.", "Iwashe hapo juu ili kubadilisha jinsi inavyocheza.", "先在上方开启，才能更改玩法。")}</p>
              )}
            </div>

            {/* theme — paint only. Same object, same physics, same settle. */}
            <div className="border-t border-border/60 pt-3.5 mt-3.5">
              <p className="font-display text-[13.5px] font-semibold text-text leading-tight">{t("Theme", "Mandhari", "主题")}</p>
              <div className={cn("mt-2 grid grid-cols-2 gap-1.5", hidden && "opacity-50 pointer-events-none")} aria-disabled={hidden}>
                {THEMES.map((th) => {
                  const active = theme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => pickTheme(th.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                        active ? "border-brand-400 bg-brand-500/[0.12] text-text" : "border-border bg-bg-overlay text-text-subtle hover:text-text",
                      )}
                    >
                      <DiscSwatch theme={th.id} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 font-display text-[13px] font-semibold">
                          {th.name}
                          {active && <span className="text-brand-300" aria-hidden><svg width="12" height="12" viewBox="0 0 24 24"><path d="M5 12l5 5L20 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
                        </span>
                        <span className="mt-0.5 block text-body-sm leading-snug text-text-subtle">{th.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-body-sm leading-snug text-text-subtle">
                {t(
                  "Paint only — it plays exactly the same.",
                  "Rangi tu — inacheza vivyo hivyo.",
                  "仅换配色，玩法完全相同。",
                )}
              </p>
            </div>
          </div>
          {/* Bespoke keyframes on purpose: the desktop panel is centred with
              translate(-50%,-50%), which the kit's translateY-only arrivals would wipe.
              Curve + duration come from the motion layer, so it settles like everything
              else ("The Settle"); only the transform differs.

              ⛔ THE EXIT IS BESPOKE FOR EXACTLY THE SAME REASON, and this is the one
              place in this batch that could NOT take `.m-float-out`. That utility plays
              `m-leave-out`, which sets `transform: translateY(…)` — on the ≥sm centred
              panel that REPLACES `translate(-50%,-50%)` and throws the dialog to the
              bottom-right corner for the whole fade. A wrong exit is worse than none.
              So the exit mirrors the arrival exactly: same curve family (`--m-leave`,
              the kit's exit curve), durations from the same ladder, only the transform
              differs. `both` holds the end frame so the panel stays gone until unmount.

              ⚠️ These four names are declared AND consumed inside this one
              `prefers-reduced-motion: no-preference` block — the pattern
              `scripts/keyframe-registry.test.mts` names in writing as legitimate
              (its rule-2.2 note cites `needle-sheet-rise`/`-pop` by name). That
              wrapper is also §M6 gate 1: with motion off the block never applies, and
              gate 2 is the universal clamp in motion.css. The JS hold collapses to
              zero under both, so an exit never delays an unmount for someone who
              asked for no motion. */}
          <style>{`
            @media (prefers-reduced-motion: no-preference) {
              .needle-sheet { animation: needle-sheet-rise var(--t-base) var(--m-settle); }
              @keyframes needle-sheet-rise { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
              .needle-sheet-out { animation: needle-sheet-fall var(--t-quick) var(--m-leave) both; }
              @keyframes needle-sheet-fall { from { transform: translateY(0); opacity: 1; } to { transform: translateY(10px); opacity: 0; } }
              @media (min-width: 640px) {
                .needle-sheet { animation: needle-sheet-pop var(--t-quick) var(--m-settle); }
                @keyframes needle-sheet-pop { from { transform: translate(-50%, -50%) scale(0.975); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
                .needle-sheet-out { animation: needle-sheet-sink var(--t-flick) var(--m-leave) both; }
                @keyframes needle-sheet-sink { from { transform: translate(-50%, -50%) scale(1); opacity: 1; } to { transform: translate(-50%, -50%) scale(0.975); opacity: 0; } }
              }
            }
          `}</style>
        </>,
        document.body,
      )}
    </>
  );
}

export default NeedleControlsDrawer;
