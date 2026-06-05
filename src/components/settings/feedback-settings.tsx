"use client";

/**
 * Sound & feedback settings — the opt-out surface for haptics + in-app motion.
 * Required for a responsible-gambling-conscious, accessible product: every
 * tactile / motion flourish must be user-disablable. Persists via the haptics
 * pref store (localStorage) and applies the in-app reduce-motion class live.
 */
import { useEffect, useState } from "react";
import { Vibrate, Sparkles } from "lucide-react";
import { I } from "@/components/ui/glyphs";
import { Toggle } from "@/components/ui/toggle";
import { getPrefs, setPrefs, haptics } from "@/lib/haptics";

export function FeedbackSettings() {
  const [hapticsOn, setHapticsOn] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const p = getPrefs();
    setHapticsOn(p.haptics);
    setReduceMotion(p.motion === "off");
  }, []);

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
        Sound &amp; feedback <span className="font-normal italic text-text-subtle text-[12px]">· Mguso na mwendo</span>
      </h2>
      <p className="mb-4 text-[12.5px] text-text-muted">
        Control the tactile buzz and on-screen motion. Turn either off any time.
      </p>

      <div className="divide-y divide-border/60">
        <Row
          icon={<I.activity s={16} />}
          title="Haptic feedback"
          sw="Mguso wa mtetemo"
          subtitle="A short buzz on key money &amp; outcome moments (phones only)."
          on={hapticsOn}
          onToggle={toggleHaptics}
        />
        <Row
          icon={<Sparkles size={16} className="text-gold-300" />}
          title="Reduce motion"
          sw="Punguza mwendo"
          subtitle="Calms animations across the app. We also honour your device setting."
          on={reduceMotion}
          onToggle={toggleMotion}
        />
      </div>
    </section>
  );
}

function Row({
  icon, title, sw, subtitle, on, onToggle,
}: {
  icon: React.ReactNode; title: string; sw: string; subtitle: string; on: boolean; onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md" style={{ background: "color-mix(in oklab, var(--gold-500) 12%, transparent)" }}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[13.5px] font-semibold text-text leading-tight">
          {title} <span className="font-normal italic text-text-subtle text-[11px]">· {sw}</span>
        </p>
        <p className="mt-0.5 text-[12px] text-text-muted leading-snug">{subtitle}</p>
      </div>
      <Toggle on={on} onClick={onToggle} gold aria-label={title} />
    </div>
  );
}
