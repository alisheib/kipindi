"use client";

/**
 * Sound & feedback settings — the opt-out surface for haptics + in-app motion.
 * Required for a responsible-gambling-conscious, accessible product: every
 * tactile / motion flourish must be user-disablable. Persists via the haptics
 * pref store (localStorage) and applies the in-app reduce-motion class live.
 */
import { useEffect, useState } from "react";
import { I } from "@/components/ui/glyphs";
import { Toggle } from "@/components/ui/toggle";
import { useT } from "@/lib/i18n";
import { getPrefs, setPrefs, haptics } from "@/lib/haptics";

export function FeedbackSettings() {
  const { t, locale } = useT();
  const [hapticsOn, setHapticsOn] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [needleShown, setNeedleShown] = useState(true);

  useEffect(() => {
    const p = getPrefs();
    setHapticsOn(p.haptics);
    setReduceMotion(p.motion === "off");
    setNeedleShown(!p.needleHidden);
    // Keep in sync if the navbar toggle flips it while this panel is open.
    const onChange = () => setNeedleShown(!getPrefs().needleHidden);
    window.addEventListener("50pick:feedback-changed", onChange);
    return () => window.removeEventListener("50pick:feedback-changed", onChange);
  }, []);

  const toggleNeedle = () => {
    const nextShown = !needleShown;
    setNeedleShown(nextShown);
    setPrefs({ needleHidden: !nextShown });
  };

  const toggleHaptics = () => {
    const next = !hapticsOn;
    setHapticsOn(next);
    setPrefs({ haptics: next });
    if (next) haptics.confirm(); // a confirming buzz so they feel it turn on
  };

  const toggleMotion = () => {
    const nextReduce = !reduceMotion;
    setReduceMotion(nextReduce);
    setPrefs({ motion: nextReduce ? "off" : "system" });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("kp-reduce-motion", nextReduce);
      document.documentElement.setAttribute("data-motion", nextReduce ? "minimal" : "full");
    }
  };

  return (
    <section className="rounded-xl border border-border bg-bg-elevated p-5">
      <h2 className="mb-1 font-display text-[15px] font-bold text-text">
        {t.common.soundFeedback}
      </h2>
      <p className="mb-4 text-[12.5px] text-text-muted">
        {t.common.soundFeedbackHint}
      </p>

      <div className="divide-y divide-border/60">
        <Row
          icon={<I.activity s={16} />}
          title={t.common.hapticFeedback}
          subtitle={t.common.hapticSubtitle}
          on={hapticsOn}
          onToggle={toggleHaptics}
        />
        <Row
          icon={<I.sparkle s={16} className="text-brand-300" />}
          title={t.common.reduceMotion}
          subtitle={t.common.motionSubtitle}
          on={reduceMotion}
          onToggle={toggleMotion}
        />
        <Row
          icon={<NeedleGlyph />}
          title={locale === "sw" ? "Sindano (kichezeo)" : locale === "zh" ? "指针玩具" : "The Needle"}
          subtitle={
            locale === "sw"
              ? "Kichezeo cha hiari kwenye ukingo wa skrini. Hakiathiri akaunti yako."
              : locale === "zh"
                ? "屏幕边缘的可选小玩具，不会影响你的账户。"
                : "An optional fidget on the edge of the screen. It never affects your account."
          }
          on={needleShown}
          onToggle={toggleNeedle}
        />
      </div>
    </section>
  );
}

/** The 50pick mark in miniature — a disc with the needle on its pivot. */
function NeedleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 100 100" aria-hidden="true" className="text-brand-300">
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" opacity="0.5" />
      <line x1="38" y1="8" x2="62" y2="92" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function Row({
  icon, title, subtitle, on, onToggle,
}: {
  icon: React.ReactNode; title: string; subtitle: string; on: boolean; onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md" style={{ background: "color-mix(in oklab, var(--brand-500) 12%, transparent)" }}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[13.5px] font-semibold text-text leading-tight">
          {title}
        </p>
        <p className="mt-0.5 text-[12px] text-text-muted leading-snug">{subtitle}</p>
      </div>
      <Toggle on={on} onClick={onToggle} aria-label={title} />
    </div>
  );
}
