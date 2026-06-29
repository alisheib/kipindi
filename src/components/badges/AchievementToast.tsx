"use client";
// src/components/badges/AchievementToast.tsx
// The unlock moment — a quick, classy "seal stamped" beat. Reuses
// celebrate-pop (card) + seal-impress (coin) + the `celebrate` haptic.
// NOT a slot machine: one gilt ray sweep, then still. Auto-dismisses.
import * as React from "react";
import { Badge } from "./Badge";
import { haptics, motionReduced } from "@/lib/haptics";
import type { AchievementId } from "./icons";
import { useT } from "@/lib/i18n";

export function AchievementToast({
  achievement,
  name,       // "First Win"
  onDone,
  durationMs = 4200,
}: {
  achievement: AchievementId;
  name: string;
  /** Accepted for back-compat; no longer rendered (single-language UI). */
  nameSw?: string;
  onDone?: () => void;
  durationMs?: number;
}) {
  const { t } = useT();
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (!fired.current) { haptics.celebrate(); fired.current = true; } // once — survives StrictMode double-invoke
    const t = setTimeout(() => onDone?.(), durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="badge-unlock-card toast"
      style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", borderColor: "var(--border-gold)" }}
    >
      <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
        {!motionReduced() && (
          <span className="badge-unlock-rays" aria-hidden style={{
            position: "absolute", inset: -10, borderRadius: "50%",
            background: "conic-gradient(from 0deg, transparent, color-mix(in oklab, var(--gilt) 45%, transparent), transparent 40%)",
          }} />
        )}
        <span className="badge-unlock-coin">
          <Badge achievement={achievement} state="unlocked" size="md" title={name} />
        </span>
      </div>

      <div style={{ minWidth: 0 }}>
        <p className="gilt-eyebrow">{t.common.achievementUnlocked}</p>
        <p className="font-display" style={{ fontSize: "var(--type-h4)", fontWeight: 600, color: "var(--text)" }}>{name}</p>
      </div>
    </div>
  );
}

// Wiring (host owns the queue, like the kit ToastProvider):
//   const { unlock } = useAchievements();
//   unlock("first-win");   // → pushes <AchievementToast> + fires haptics.celebrate()
//
// Reduced-motion: celebrate-pop / seal-impress collapse to a fade (see the
// globals.css reduced-motion branch); the ray sweep is omitted entirely.
