// src/components/badges/Badge.tsx
// Achievement badge — a sibling system to TierBadge (kit/atoms.jsx).
// Heraldic gilt-on-royal coin, line-art icon inside, three states.
// Styling lives in globals.css (.badge / .badge--*), mirroring how .tier-* is
// driven — so badges automatically track the rest of the chord.
import * as React from "react";
import { cn } from "@/lib/utils";
import { BADGE_ICONS, type AchievementId } from "./icons";

type BadgeState = "locked" | "unlocked" | "progress";
type Size = "sm" | "md" | "lg";

const sizeCls: Record<Size, string> = { sm: "badge-sm", md: "badge-md", lg: "badge-lg" };

export function Badge({
  achievement,
  state = "locked",
  progress,           // { value, max, tier? } — required when state="progress"
  size = "md",
  title,
  className,
}: {
  achievement: AchievementId;
  state?: BadgeState;
  progress?: { value: number; max: number; tier?: string };
  size?: Size;
  title?: string;     // tooltip / aria-label (bilingual at call site)
  className?: string;
}) {
  const pct = progress ? Math.min(1, progress.value / progress.max) : 0;
  // Ring geometry for in-progress coins (drawn just inside the coin edge).
  const R = 30, C = 2 * Math.PI * R;

  return (
    <div
      className={cn("badge", `badge--${state}`, sizeCls[size], className)}
      role="img"
      aria-label={title ?? achievement}
      title={title}
    >
      {state === "progress" && (
        <svg className="badge-progress-ring" viewBox="0 0 64 64"
             style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden>
          <circle className="badge-ring-track" cx="32" cy="32" r={R} strokeWidth="2.5" />
          <circle className="badge-ring-arc" cx="32" cy="32" r={R} strokeWidth="2.5"
                  strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
        </svg>
      )}

      {BADGE_ICONS[achievement]}

      {state === "progress" && progress && !progress.tier && (
        <span className="badge-count" style={{ position: "absolute", bottom: -16 }}>
          {progress.value}/{progress.max}
        </span>
      )}
      {progress?.tier && <span className="badge-tier-pip">{progress.tier}</span>}
    </div>
  );
}

// src/components/badges/BadgeShelf.tsx
// The profile grid. Locked/in-progress badges stay visible (greyed) so the
// shelf reads as a goal set, not a wall of mystery boxes.
export function BadgeShelf({
  items,
  className,
}: {
  items: Array<{ achievement: AchievementId; state: BadgeState; progress?: { value: number; max: number; tier?: string }; title: string }>;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-5", className)}
         style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}>
      {items.map((it) => (
        <figure key={it.achievement} className="flex flex-col items-center gap-2 text-center">
          <Badge achievement={it.achievement} state={it.state} progress={it.progress} size="md" title={it.title} />
          <figcaption className="text-[11px] leading-tight text-text-muted">{it.title}</figcaption>
        </figure>
      ))}
    </div>
  );
}
